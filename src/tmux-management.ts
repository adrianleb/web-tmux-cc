import { stat } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { inventoryLines, inventoryNumber, inventoryOutput, listSessionsCli, runTmuxCli, type TmuxRunner } from './tmux-cli.ts'
import type { AttachedClientIdentity, AttachedClientInfo, ManagementRequest, SessionInfo } from './types.ts'

const CONTROL = /[\x00-\x1f\x7f-\x9f]/
const MANAGEMENT_TYPES = new Set(['management', 'create-session', 'rename-session', 'detach-clients'])
export interface ManagementInventory {
  sessions: SessionInfo[]
  clients: AttachedClientInfo[]
}

export function isManagementType(type: unknown): boolean {
  return typeof type === 'string' && MANAGEMENT_TYPES.has(type)
}

export function managementRequestId(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const id = (value as Record<string, unknown>).requestId
  return typeof id === 'string' && id.length > 0 && id.length <= 200 && !CONTROL.test(id) ? id : undefined
}

export function validateSessionName(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 200 || value.trim() === '') {
    throw new Error('session name must contain 1–200 characters')
  }
  // tmux parses a trailing argv semicolon as a command separator even without
  // a shell; reject it anywhere instead of relying on shell-style quoting.
  if (CONTROL.test(value) || /[.:;]/.test(value)) {
    throw new Error('session name must not contain control characters, ".", ":", or ";"')
  }
}

function validateIdentity(value: unknown): asserts value is AttachedClientIdentity {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('invalid client identity')
  const { name, pid, created } = value as Record<string, unknown>
  if (typeof name !== 'string' || name.length === 0 || name.length > 1024 || CONTROL.test(name) || name.includes(';')) {
    throw new Error('invalid client name')
  }
  if (typeof pid !== 'number' || !Number.isSafeInteger(pid) || pid <= 0
    || typeof created !== 'number' || !Number.isSafeInteger(created) || created < 0) {
    throw new Error('invalid client pid or creation time')
  }
}

/** Validate wire values rather than trusting a TypeScript cast of JSON. */
export function validateManagementRequest(value: unknown): ManagementRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('invalid management request')
  const msg = value as Record<string, unknown>
  if (!isManagementType(msg.type)) throw new Error('invalid management request')
  if (managementRequestId(value) === undefined) throw new Error('invalid management requestId')
  if (msg.type === 'create-session') {
    validateSessionName(msg.name)
    if (msg.cwd !== undefined && (typeof msg.cwd !== 'string' || msg.cwd.length > 4096
      || !isAbsolute(msg.cwd) || CONTROL.test(msg.cwd) || msg.cwd.includes(';'))) {
      throw new Error('cwd must be an absolute directory without control characters or semicolons')
    }
  } else if (msg.type === 'rename-session') {
    validateSessionName(msg.session)
    validateSessionName(msg.newName)
  } else if (msg.type === 'detach-clients') {
    if (!Array.isArray(msg.clients) || msg.clients.length === 0 || msg.clients.length > 100) {
      throw new Error('select between 1 and 100 clients to detach')
    }
    const names = new Set<string>()
    for (const client of msg.clients) {
      validateIdentity(client)
      if (names.has(client.name)) throw new Error('duplicate selected client')
      names.add(client.name)
    }
  }
  return value as ManagementRequest
}

export async function listAttachedClientsCli(
  tmuxBin: string,
  ownName: string,
  run: TmuxRunner = runTmuxCli,
): Promise<AttachedClientInfo[]> {
  // Intentionally no -t: management includes every session, even detached UI.
  const raw = await inventoryOutput(tmuxBin, ['list-clients', '-F', [
    '#{client_name}', '#{client_pid}', '#{client_created}', '#{session_name}',
    '#{client_tty}', '#{client_termname}', '#{client_width}', '#{client_height}',
    '#{client_flags}', '#{client_control_mode}',
  ].join('\t')], run)
  const names = new Set<string>()
  return inventoryLines(raw).map(line => {
    const fields = line.split('\t')
    const [name, pid, created, session, tty, term, cols, rows, rawFlags, control] = fields
    if (fields.length !== 10 || !name || names.has(name) || !['0', '1'].includes(control)) {
      throw new Error('invalid tmux client inventory')
    }
    names.add(name)
    return {
      name, pid: inventoryNumber(pid, 'client pid', 1), created: inventoryNumber(created, 'client created'),
      // Pipe-based control clients can have no negotiated terminal height.
      session, tty, term, cols: inventoryNumber(cols || '0', 'client cols'), rows: inventoryNumber(rows || '0', 'client rows'),
      flags: rawFlags.split(',').filter(Boolean), control: control === '1', own: name === ownName,
    }
  })
}

function sameClient(a: AttachedClientIdentity, b: AttachedClientIdentity): boolean {
  return a.name === b.name && a.pid === b.pid && a.created === b.created
}

/** Quote a *tmux* command argument, not a shell command. */
function quoteTmux(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function formatLiteral(value: string): string {
  return value.replace(/#/g, '##').replace(/,/g, '#,').replace(/}/g, '#}')
}

/**
 * Shell-free management primitives. The runtime serializes the entire mutation,
 * snapshot refresh, and response (not merely these individual child processes).
 */
export class TmuxManagement {
  private readonly tmuxBin: string
  private readonly ownName: () => string
  private readonly run: TmuxRunner

  constructor(tmuxBin: string, ownName: () => string, run: TmuxRunner = runTmuxCli) {
    this.tmuxBin = tmuxBin
    this.ownName = ownName
    this.run = run
  }

  async inventory(): Promise<ManagementInventory> {
    const sessions = await listSessionsCli(this.tmuxBin, this.run)
    const clients = await listAttachedClientsCli(this.tmuxBin, this.ownName(), this.run)
    return { sessions, clients }
  }

  async create(name: string, cwd?: string): Promise<void> {
    validateManagementRequest({ type: 'create-session', requestId: 'internal', name, cwd })
    if (cwd !== undefined && !(await stat(cwd)).isDirectory()) throw new Error('cwd must be an existing directory')
    const args = ['new-session', '-d', '-s', name]
    // -c is a tmux format string: protect literal hashes from format expansion
    // (including #() jobs), without changing the actual directory name.
    if (cwd !== undefined) args.push('-c', cwd.replace(/#/g, '##'))
    // Read the configured shell even on a not-yet-started server. This separator
    // is a fixed internal tmux command boundary, never browser-provided text.
    const shell = (await this.run(this.tmuxBin, ['start-server', ';', 'show-options', '-gqv', 'default-shell'])).trim()
    if (!isAbsolute(shell) || CONTROL.test(shell) || shell.includes(';')) throw new Error('invalid tmux default-shell')
    // Multiple command arguments make tmux exec the shell directly, rather
    // than running shell -c. Bypass default-command and accept no wire command.
    args.push('--', shell, '-l')
    await this.run(this.tmuxBin, args)
  }

  async rename(session: string, newName: string): Promise<void> {
    validateSessionName(session)
    validateSessionName(newName)
    await this.run(this.tmuxBin, ['rename-session', '-t', `=${session}`, '--', newName])
  }

  async detach(clients: AttachedClientIdentity[]): Promise<void> {
    validateManagementRequest({ type: 'detach-clients', requestId: 'internal', clients })
    const verify = (inventory: AttachedClientInfo[], identity: AttachedClientIdentity): void => {
      const match = inventory.find(client => sameClient(client, identity))
      if (!match) throw new Error(`selected client "${identity.name}" is stale; refresh clients and try again`)
      if (match.own || identity.name === this.ownName()) {
        throw new Error('cannot detach the shared dock control client here; use the dock detach action')
      }
    }
    // Preflight the entire selection: one stale/own entry cannot partially
    // detach an otherwise valid batch.
    const initial = await listAttachedClientsCli(this.tmuxBin, this.ownName(), this.run)
    for (const identity of clients) verify(initial, identity)
    for (const identity of clients) {
      verify(await listAttachedClientsCli(this.tmuxBin, this.ownName(), this.run), identity)
      const match = `#{&&:#{==:#{client_name},${formatLiteral(identity.name)}},#{&&:#{==:#{client_pid},${identity.pid}},#{==:#{client_created},${identity.created}}}}`
      // Recheck the full identity *inside tmux*, then detach that one exact
      // inventory name. -F evaluates only a format; it never invokes a shell.
      // This closes the CLI inventory -> detach gap if a terminal reconnects.
      const guard = `#{L:#{?${match},1,}}`
      const output = await this.run(this.tmuxBin, [
        'if-shell', '-F', guard,
        `detach-client -t ${quoteTmux(identity.name)}`,
        'display-message -p DSH_CLIENT_STALE',
      ])
      if (output.trim() !== '') throw new Error(`selected client "${identity.name}" changed before detach; refresh clients and try again`)
    }
  }
}
