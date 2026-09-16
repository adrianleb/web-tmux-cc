import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { SessionInfo } from './types.ts'

const execFileAsync = promisify(execFile)
export type TmuxRunner = (tmuxBin: string, args: string[]) => Promise<string>

/** No shell, bounded runtime/output, and no fallback to another tmux server. */
export const runTmuxCli: TmuxRunner = async (tmuxBin, args) => {
  const { stdout } = await execFileAsync(tmuxBin, args, { timeout: 5000, maxBuffer: 4 * 1024 * 1024 })
  return stdout
}

/** Only tmux's specific missing-server response is an empty inventory. */
export function isNoTmuxServer(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const { code, stderr } = error as { code?: unknown; stderr?: unknown }
  // ENOENT (missing executable), timeouts, permissions, and malformed commands
  // are real errors, even if their message mentions a missing file.
  return code === 1 && typeof stderr === 'string' && (
    /^no server running on [^\r\n]+\r?\n?$/.test(stderr)
    || /^error connecting to [^\r\n]+ \(No such file or directory\)\r?\n?$/.test(stderr)
  )
}

export async function inventoryOutput(tmuxBin: string, args: string[], run: TmuxRunner): Promise<string> {
  try {
    return await run(tmuxBin, args)
  } catch (error) {
    if (isNoTmuxServer(error)) return ''
    // A persistent server with exit-empty off may have no sessions at all.
    if (args[0] === 'list-sessions' && typeof error === 'object' && error !== null) {
      const { code, stderr } = error as { code?: unknown; stderr?: unknown }
      if (code === 1 && typeof stderr === 'string' && /^no sessions\r?\n?$/.test(stderr)) return ''
    }
    throw error
  }
}

export function inventoryLines(raw: string): string[] {
  return raw.replace(/\r?\n$/, '').split('\n').filter(line => line !== '')
}

export function inventoryNumber(value: string | undefined, label: string, minimum = 0): number {
  if (value === undefined || !/^\d+$/.test(value)) throw new Error(`invalid tmux inventory ${label}: ${JSON.stringify(value)}`)
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < minimum) throw new Error(`invalid tmux inventory ${label}: ${JSON.stringify(value)}`)
  return number
}

export async function listSessionsCli(tmuxBin: string, run: TmuxRunner = runTmuxCli): Promise<SessionInfo[]> {
  const raw = await inventoryOutput(tmuxBin, [
    'list-sessions', '-F', '#{session_name}\t#{session_attached}\t#{session_windows}',
  ], run)
  return inventoryLines(raw).map(line => {
    const fields = line.split('\t')
    if (fields.length !== 3 || fields[0] === '') throw new Error('invalid tmux session inventory')
    return {
      name: fields[0],
      attached: inventoryNumber(fields[1], 'session attached'),
      windows: inventoryNumber(fields[2], 'session windows'),
    }
  })
}
