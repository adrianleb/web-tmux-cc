import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { decodeControlOutput } from './decode.ts'
import { parseLayout, type PaneRect } from './layout.ts'
import type { SessionInfo, WindowInfo } from './types.ts'

export { listSessionsCli } from './tmux-cli.ts'

export interface TmuxPane {
  id: string
  index: number
  title: string
  role: string
  left: number
  top: number
  width: number
  height: number
  active: boolean
}

export interface TmuxSnapshot {
  session: string
  windowId: string
  windowName: string
  cols: number
  rows: number
  zoomed: boolean
  panes: TmuxPane[]
  sessions: SessionInfo[]
  windows: WindowInfo[]
  /** Other attached clients that participate in window sizing (no ignore-size). */
  viewers: number
}

/**
 * The control channel. tmux -C works over plain pipes (verified on 3.7b):
 * no PTY, no echo, no DCS wrapper, clean LF-framed lines.
 */
export interface ControlTransport {
  write(data: string): void
  kill(): void
  /** Stop/resume reading tmux's output; unread bytes back up into tmux. */
  pause(): void
  resume(): void
  onData(fn: (chunk: string) => void): void
  onStderr(fn: (chunk: string) => void): void
  onExit(fn: (code: number | null) => void): void
}

export type SpawnTransport = (tmuxBin: string, args: string[]) => ControlTransport

interface Pending {
  line: string
  settled: boolean
  /** Reply blocks still expected: tmux answers each `;`-chained command with its own block. */
  remaining: number
  parts: string[]
  failure: Error | null
  resolve: (text: string) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

interface OpenBlock {
  num: string
  lines: string[]
}

interface Events {
  snapshot: [TmuxSnapshot]
  output: [paneId: string, data: string]
  /** tmux paused a pane for this client (pause-after): its backlog is gone. */
  pause: [paneId: string]
  error: [message: string]
  /** Fired only for unexpected exits — a requested detach never emits this. */
  exit: [code: number | null]
}

export interface HistoryCapture {
  pane: string
  data: string
}

export const DEFAULT_HISTORY_LINES = 2000
export const MAX_HISTORY_LINES = 20000
export const MAX_HISTORY_BYTES = 800000

/**
 * Control-channel flow control. tmux writes to a control client in 8 KB
 * turns (~2 MB/s) and disables a pane's read while every control client is
 * busy, so reading eagerly both floods the browser and throttles the pane.
 * Draining at a bounded rate lets a burst age into a %pause after
 * PAUSE_AFTER_SECONDS; the pane then runs free and the browser re-syncs
 * from a capture. The "behind" rate applies while the browser has not yet
 * consumed what it was sent (a slow link or device), so tmux sees its lag.
 */
export const PAUSE_AFTER_SECONDS = 1
const DRAIN_RATE = 1_000_000  // bytes/s of control output while the browser keeps up
const DRAIN_RATE_BEHIND = 32_000
const DRAIN_WINDOW_MS = 100
const DRAIN_MAX_PAUSE_MS = 2000
/** A deep capture of a wide, heavily styled pane can be megabytes. */
const CAPTURE_TIMEOUT_MS = 30_000

export function normalizeHistoryLines(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_HISTORY_LINES
  return Math.max(0, Math.min(MAX_HISTORY_LINES, Math.floor(parsed)))
}

export interface TmuxControlOptions {
  spawnTransport?: SpawnTransport
  /** Per-command reply timeout; a timed-out command fails without wedging the queue. */
  commandTimeoutMs?: number
}

export class TmuxControlClient extends EventEmitter<Events> {
  private transport: ControlTransport | null = null
  private buf = ''
  private block: OpenBlock | null = null
  private queue: Pending[] = []
  private snapshot: TmuxSnapshot | null = null
  private snapshotTask: Promise<void> = Promise.resolve()
  private sessionName = ''
  private clientName = ''
  private stderrTail = ''
  private requestedDetach = false
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private drainScheduled = false
  private processingInput = false
  /**
   * Deliberate drain. tmux only pauses a flooding pane (pause-after) when
   * its client falls behind; a client that drains as fast as tmux writes
   * never does, so it receives every byte of a re-render storm and throttles
   * the pane to the control channel's own ~2 MB/s. Reading at a bounded rate
   * lets floods age into a %pause while ordinary output flows, and holding
   * the drain while the browser still owes acks lets the real consumer's
   * link set the pace.
   */
  private drainRate = DRAIN_RATE
  private drainUsed = 0
  private drainWindowStart = 0
  private drainPaused = false
  private drainTimer: ReturnType<typeof setTimeout> | null = null
  readonly tmuxBin: string
  private readonly spawnTransport: SpawnTransport
  private readonly commandTimeoutMs: number

  constructor(tmuxBin = 'tmux', options: TmuxControlOptions = {}) {
    super()
    this.tmuxBin = tmuxBin
    this.spawnTransport = options.spawnTransport ?? defaultTransport
    this.commandTimeoutMs = options.commandTimeoutMs ?? 5000
  }

  get attached(): boolean {
    return this.transport !== null
  }

  /** Name of the session this control client is attached to ('' when detached). */
  get session(): string {
    return this.transport === null ? '' : this.sessionName
  }

  /** Server-reported full client name, used only for inventory ownership. */
  get controlClientName(): string {
    return this.transport === null ? '' : this.clientName
  }

  currentSnapshot(): TmuxSnapshot | null {
    return this.snapshot
  }

  async attach(session: string): Promise<void> {
    this.detach()
    this.requestedDetach = false
    this.sessionName = session
    const transport = this.spawnTransport(this.tmuxBin, [
      '-C',
      'attach-session',
      '-f',
      'ignore-size',
      '-t',
      `=${session}`,
    ])
    this.transport = transport
    // Every callback is gated on transport identity: a replaced or detached
    // client may still flush data/exit during its grace period, and that must
    // never leak into the successor's state.
    transport.onData((chunk) => {
      if (this.transport !== transport) return
      this.push(chunk)
      this.accountDrain(chunk.length)
    })
    transport.onStderr((chunk) => {
      if (this.transport === transport) this.stderrTail = (this.stderrTail + chunk).slice(-500)
    })
    transport.onExit((code) => {
      if (this.transport !== transport) return
      const detail = this.stderrTail.trim()
      this.transport = null
      this.failAll(new Error(detail || 'tmux control client exited'))
      this.snapshot = null
      this.emit('exit', code)
    })
    try {
      this.clientName = (await this.command("display-message -p '#{client_name}'")).trim()
      // Fall PAUSE_AFTER_SECONDS behind on a pane and tmux drops that pane's
      // backlog for us (%pause) instead of holding the pane to our pace.
      await this.command(`refresh-client -f pause-after=${PAUSE_AFTER_SECONDS}`)
      await this.refreshSnapshot()
    } catch (err) {
      const detail = this.stderrTail.trim()
      this.detach()
      throw detail ? new Error(detail) : err
    }
  }

  /**
   * Slow the drain while the browser has not consumed what it was sent, so
   * tmux measures the real consumer's lag and pauses floods accordingly.
   * Never a full stop: tmux only evaluates block ages when it can write.
   */
  setBehind(behind: boolean): void {
    this.drainRate = behind ? DRAIN_RATE_BEHIND : DRAIN_RATE
  }

  /** Resume a pane tmux paused for this client; new output flows from now on. */
  async continuePane(paneId: string): Promise<void> {
    await this.command(`refresh-client -A ${quote(`${paneId}:continue`)}`)
  }

  /**
   * Token bucket over the control channel. Pipe reads arrive in 64 KB
   * chunks, so an overshoot is paid off by pausing long enough that the
   * average over window + pause equals the rate. Command replies share the
   * channel and the rate: a capture is small, and a flood must never be
   * able to lift the limit by keeping a command in flight.
   */
  private accountDrain(bytes: number): void {
    const transport = this.transport
    if (transport === null) return
    const now = Date.now()
    if (now - this.drainWindowStart >= DRAIN_WINDOW_MS) {
      this.drainWindowStart = now
      this.drainUsed = 0
    }
    this.drainUsed += bytes
    if (this.drainPaused || this.drainUsed <= this.drainRate * DRAIN_WINDOW_MS / 1000) return
    const pauseMs = Math.min(DRAIN_MAX_PAUSE_MS, Math.round(this.drainUsed / this.drainRate * 1000) - (now - this.drainWindowStart))
    this.drainPaused = true
    transport.pause()
    this.drainTimer = setTimeout(() => {
      this.drainTimer = null
      this.drainPaused = false
      this.drainWindowStart = Date.now()
      this.drainUsed = 0
      if (this.transport === transport) transport.resume()
    }, Math.max(1, pauseMs))
  }

  detach(): void {
    clearTimeout(this.refreshTimer ?? undefined)
    this.refreshTimer = null
    clearTimeout(this.drainTimer ?? undefined)
    this.drainTimer = null
    this.drainPaused = false
    this.drainRate = DRAIN_RATE
    const transport = this.transport
    if (transport !== null) {
      this.requestedDetach = true
      this.transport = null
      transport.resume()
      try { transport.write('detach-client\n') } catch { /* already gone */ }
      // The %exit handshake normally lands well within the grace period.
      setTimeout(() => { try { transport.kill() } catch { /* already gone */ } }, 250)
    }
    this.buf = ''
    this.block = null
    this.stderrTail = ''
    this.failAll(new Error('detached'))
    this.snapshot = null
    this.clientName = ''
  }

  /**
   * Send raw input bytes to a pane. Everything is hex-encoded through
   * `send-keys -H` so CR/LF and arbitrary bytes can never split the
   * line-framed control protocol (a quoted literal CR does — verified).
   */
  async sendKeys(paneId: string, data: string): Promise<void> {
    if (data === '') return
    const bytes = Buffer.from(data, 'utf8')
    const chunkSize = 128
    for (let off = 0; off < bytes.length; off += chunkSize) {
      const hex: string[] = []
      for (const byte of bytes.subarray(off, off + chunkSize)) {
        hex.push(byte.toString(16).padStart(2, '0'))
      }
      await this.command(`send-keys -t ${quote(paneId)} -H ${hex.join(' ')}`)
    }
  }

  async selectPane(paneId: string): Promise<void> {
    await this.command(`select-pane -t ${quote(paneId)}`)
    this.scheduleRefresh()
  }

  async selectDir(dir: 'L' | 'R' | 'U' | 'D'): Promise<void> {
    await this.command(`select-pane ${{ L: '-L', R: '-R', U: '-U', D: '-D' }[dir]}`)
    this.scheduleRefresh()
  }

  async selectWindow(windowId: string): Promise<void> {
    await this.command(`select-window -t ${quote(windowId)}`)
    await this.refreshSnapshot()
  }

  /**
   * Capture history for the currently visible panes. The caller owns routing:
   * unlike live output, a browser's requested history depth must not be pushed
   * to every other viewer.
   */
  async captureVisible(requestedLines: unknown = DEFAULT_HISTORY_LINES, paneId?: string): Promise<HistoryCapture[]> {
    const historyLines = normalizeHistoryLines(requestedLines)
    const visible = this.snapshot?.panes ?? []
    const panes = paneId === undefined ? visible : visible.filter((pane) => pane.id === paneId)
    const captures: HistoryCapture[] = []
    for (const pane of panes) {
      const target = quote(pane.id)
      // One round trip per pane: mode flags, then the capture whose flags
      // depend on them (`-J` joins wrapped lines only for the normal buffer;
      // the alternate screen is captured row-exact). `if-shell -F` picks
      // inside tmux and answers in a third block.
      const raw = await this.command([
        `display-message -p -t ${target} -F ${quote(`M\t${PANE_SEED_FORMAT}`)}`,
        `if-shell -F -t ${target} '#{alternate_on}' "capture-pane -ep -t ${target} -S -${historyLines}" "capture-pane -epJ -t ${target} -S -${historyLines}"`,
      ].join(' ; '), 3, CAPTURE_TIMEOUT_MS)
      const lines = raw.split('\n')
      const marker = lines.findIndex((line) => line.startsWith('M\t'))
      if (marker < 0) continue
      const state = parsePaneSeedState(lines[marker]!.slice(2))
      const body = truncateHistory(lines.slice(marker + 1).join('\r\n'))
      if (body === '' && !state.alternateOn) continue
      captures.push({ pane: pane.id, data: formatHistorySeed(body, state) })
    }
    return captures
  }

  async zoom(paneId?: string): Promise<void> {
    const target = paneId ?? this.snapshot?.panes.find((p) => p.active)?.id
    if (target === undefined) return
    await this.command(`resize-pane -Z -t ${quote(target)}`)
    await this.refreshSnapshot()
  }

  async split(dir: 'h' | 'v', paneId: string): Promise<void> {
    const flag = ({ h: '-h', v: '-v' } as const)[dir]
    if (flag === undefined) throw new Error('invalid split direction')
    const target = this.requireVisiblePane(paneId)
    await this.command(`split-window -t ${quote(target)} ${flag}`)
    await this.refreshSnapshot()
  }

  async newWindow(): Promise<void> {
    await this.command('new-window')
    await this.refreshSnapshot()
  }

  async killPane(paneId?: string): Promise<void> {
    // Guard the whole session (not just the current window): never kill the
    // last live pane out from under iTerm or other seats.
    const total = await this.command("list-panes -s -F 'x'")
    if (total.split('\n').filter((line) => line.trim() !== '').length <= 1) {
      throw new Error('refusing to kill the last pane of the session')
    }
    if (paneId) await this.command(`kill-pane -t ${quote(paneId)}`)
    else await this.command('kill-pane')
    await this.refreshSnapshot()
  }

  /**
   * Count the other attached clients that take part in window sizing.
   * `ignore-size` clients (this one, other docks) don't count; anything else —
   * a plain `tmux attach` or an iTerm2 `-CC` seat — does.
   */
  async countViewers(): Promise<number> {
    // Scope to our session — a bare list-clients reports the whole server.
    const raw = await this.command(`list-clients -t ${quote(`=${this.sessionName}`)} -F '#{client_name}\t#{client_flags}'`)
    let viewers = 0
    for (const line of raw.split('\n')) {
      if (line.trim() === '') continue
      const [name, flags] = line.split('\t')
      if (name === this.clientName) continue
      if ((flags ?? '').split(',').includes('ignore-size')) continue
      viewers += 1
    }
    return viewers
  }

  /** Toggle whether tmux ignores this client when computing window sizes. */
  async setIgnoreSize(on: boolean): Promise<void> {
    await this.command(`refresh-client -f ${on ? '' : '!'}ignore-size`)
  }

  /**
   * Become the sizing client at a known grid in one tmux command. Applying
   * `-C` and clearing `ignore-size` atomically avoids the transient 80x24
   * resize that occurs when the flag is cleared before the grid is set.
   */
  async takeOverSize(cols: number, rows: number): Promise<void> {
    const { cols: c, rows: r } = clampClientSize(cols, rows)
    await this.command(`refresh-client -C ${c}x${r} -f !ignore-size`)
  }

  /** Dictate the window size (only effective while ignore-size is off). */
  async setClientSize(cols: number, rows: number): Promise<void> {
    const { cols: c, rows: r } = clampClientSize(cols, rows)
    await this.command(`refresh-client -C ${c}x${r}`)
  }

  /** Force a window to a grid; sets that window's `window-size` to `manual`. */
  async resizeWindow(windowId: string, cols: number, rows: number): Promise<void> {
    const { cols: c, rows: r } = clampClientSize(cols, rows)
    await this.command(`resize-window -t ${quote(windowId)} -x ${c} -y ${r}`)
  }

  /** Drop a window's manual `window-size` so tmux recalculates from remaining clients. */
  async unsetWindowSize(windowId: string): Promise<void> {
    await this.command(`set-option -wu -t ${quote(windowId)} window-size`)
  }

  async resizePane(paneId: string, opts: { width?: number; height?: number }): Promise<void> {
    if (opts.width !== undefined) {
      await this.command(`resize-pane -t ${quote(paneId)} -x ${Math.max(4, Math.floor(opts.width))}`)
    }
    if (opts.height !== undefined) {
      await this.command(`resize-pane -t ${quote(paneId)} -y ${Math.max(3, Math.floor(opts.height))}`)
    }
    this.scheduleRefresh()
  }

  async resizePaneDirection(paneId: string, dir: 'L' | 'R' | 'U' | 'D', amount = 1): Promise<void> {
    const flag = ({ L: 'L', R: 'R', U: 'U', D: 'D' } as const)[dir]
    if (flag === undefined) throw new Error('invalid pane resize direction')
    const target = this.requireVisiblePane(paneId)
    const cells = Math.max(1, Math.min(100, Math.floor(Number(amount) || 1)))
    await this.command(`resize-pane -t ${quote(target)} -${flag} ${cells}`)
    this.scheduleRefresh()
  }

  refreshSnapshot(): Promise<TmuxSnapshot> {
    const transport = this.transport
    const task = this.snapshotTask.then(async () => {
      if (transport === null || this.transport !== transport) throw new Error('detached')
      return this.readSnapshot(transport)
    })
    this.snapshotTask = task.then(() => {}, () => {})
    return task
  }

  /**
   * One control round trip for the whole snapshot: tmux runs a `;`-chained
   * command list inside a single reply block, so every line is tagged with a
   * leading letter to say which command produced it. The tmux server is
   * often remote-ish (ssh wrappers, slow hosts), and refreshes fire on every
   * layout change, so the command count is the latency.
   */
  private async readSnapshot(transport: ControlTransport): Promise<TmuxSnapshot> {
    const raw = await this.command([
      "display-message -p -F 'W\t#{window_id}\t#{window_name}\t#{window_width}\t#{window_height}\t#{window_visible_layout}\t#{window_zoomed_flag}\t#{session_name}'",
      "list-panes -F 'P\t#{pane_id}\t#{pane_index}\t#{pane_title}\t#{pane_left}\t#{pane_top}\t#{pane_width}\t#{pane_height}\t#{pane_active}\t#{@dsh_role}'",
      "list-windows -F 'X\t#{window_id}\t#{window_index}\t#{window_name}\t#{window_active}'",
      "list-sessions -F 'S\t#{session_name}\t#{session_attached}\t#{session_windows}'",
      "list-clients -F 'C\t#{client_name}\t#{client_session}\t#{client_flags}'",
    ].join(' ; '), 5)
    const tagged: Record<string, string[]> = { W: [], P: [], X: [], S: [], C: [] }
    for (const line of raw.split('\n')) {
      const tag = line.slice(0, 2)
      if (tag.length === 2 && tag[1] === '\t' && tag[0] in tagged) tagged[tag[0]]!.push(line.slice(2))
    }
    const [windowId, windowName, w, h, visibleLayout, zoomedFlag, sessionName] = (tagged.W[0] ?? '').split('\t')
    if (sessionName) this.sessionName = sessionName
    const fromList = tagged.P.map(parsePaneLine)
    const zoomed = zoomedFlag === '1'
    // tmux keeps reporting hidden panes with their pre-zoom coordinates. The
    // visible layout is authoritative: in zoom mode only the active pane is
    // actually on screen, occupying the full window.
    const visiblePanes = zoomed ? fromList.filter((pane) => pane.active) : fromList
    const panes = mergePanes(visiblePanes, safeParse(visibleLayout ?? ''))
    const windows: WindowInfo[] = tagged.X.map((line) => {
      const [id, index, name, active] = line.split('\t')
      return { id: id ?? '', index: Number(index) || 0, name: name ?? '', active: active === '1' }
    })
    const sessions: SessionInfo[] = tagged.S.map((line) => {
      const [name, attached, count] = line.split('\t')
      return { name: name ?? '', attached: Number(attached) || 0, windows: Number(count) || 0 }
    })
    // Viewer detection grants sizing authority under Auto, so it is read in
    // the same block as the layout it authorises: no client can slip in
    // between the two.
    const viewers = tagged.C.filter((line) => {
      const [name, session, flags] = line.split('\t')
      return name !== this.clientName && session === this.sessionName && !(flags ?? '').split(',').includes('ignore-size')
    }).length
    const snap: TmuxSnapshot = {
      session: this.sessionName,
      windowId: windowId ?? '',
      windowName: windowName ?? '',
      cols: Number(w) || 80,
      rows: Number(h) || 24,
      zoomed,
      panes,
      sessions,
      windows,
      viewers,
    }
    if (this.transport !== transport) throw new Error('detached')
    this.snapshot = snap
    this.emit('snapshot', snap)
    return snap
  }

  private requireVisiblePane(paneId: unknown): string {
    if (typeof paneId !== 'string' || !this.snapshot?.panes.some((pane) => pane.id === paneId)) {
      throw new Error('pane is not visible in the attached tmux window')
    }
    return paneId
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) return
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null
      if (!this.attached) return
      void this.refreshSnapshot().catch((err: unknown) => {
        // A refresh queued by the last layout change can lose to a detach; that is not an error.
        if (!this.attached) return
        this.emit('error', err instanceof Error ? err.message : String(err))
      })
    }, 80)
  }

  /**
   * Send one control line and collect its reply. A `;`-chained line yields
   * one block per command (plus one per command a `if-shell` inserts), so
   * callers pass how many blocks to gather; the parts are joined with `\n`.
   */
  private command(line: string, blocks = 1, timeoutMs = this.commandTimeoutMs): Promise<string> {
    const transport = this.transport
    if (transport === null) return Promise.reject(new Error('not attached'))
    const { promise, resolve, reject } = Promise.withResolvers<string>()
    const pending: Pending = {
      line,
      settled: false,
      remaining: blocks,
      parts: [],
      failure: null,
      resolve,
      reject,
      // A timed-out command fails alone; its queue slot stays so the
      // FIFO reply pairing keeps its alignment if the reply is just late.
      timer: setTimeout(() => {
        pending.settled = true
        reject(new Error(`tmux command timed out: ${line.split(' ')[0]}`))
      }, timeoutMs),
    }
    this.queue.push(pending)
    transport.write(`${line}\n`)
    return promise
  }

  private settle(pending: Pending, err: Error | null, text: string): void {
    clearTimeout(pending.timer)
    if (pending.settled) return
    pending.settled = true
    if (err) pending.reject(err)
    else pending.resolve(text)
  }

  private failAll(err: Error): void {
    for (const item of this.queue) this.settle(item, err, '')
    this.queue = []
  }

  private push(chunk: string): void {
    this.buf += chunk
    if (this.processingInput || this.drainScheduled) return
    this.processingInput = true
    try {
      while (true) {
        const nl = this.buf.indexOf('\n')
        if (nl < 0) return
        const line = this.buf.slice(0, nl).replace(/\r$/, '')
        this.buf = this.buf.slice(nl + 1)
        const openNum = this.block?.num
        const closing = openNum === undefined ? null : parseBlockEdge(line)
        const closesOwnCommand = closing !== null
          && closing.num === openNum
          && closing.ours
          && (closing.kind === 'end' || closing.kind === 'error')
        this.handleLine(line)
        if (closesOwnCommand) {
          // Promise continuations (notably capture -> socket history) must run
          // before a later %output already buffered in this same transport
          // chunk. Otherwise the browser writes the live output and then its
          // history seed resets it away. Resume parsing on the next turn.
          this.drainScheduled = true
          setImmediate(() => {
            this.drainScheduled = false
            this.push('')
          })
          return
        }
      }
    } finally {
      this.processingInput = false
    }
  }

  private handleLine(line: string): void {
    if (this.block !== null) {
      const closing = parseBlockEdge(line)
      // Close only on the %end/%error carrying this block's number — block
      // content lines can legitimately start with anything (nested tmux…).
      if (closing !== null && (closing.kind === 'end' || closing.kind === 'error') && closing.num === this.block.num) {
        const text = this.block.lines.join('\n')
        this.block = null
        this.closeBlock(closing.kind === 'error', closing.ours, text)
        return
      }
      this.block.lines.push(line)
      return
    }
    const edge = parseBlockEdge(line)
    if (edge !== null && edge.kind === 'begin') {
      this.block = { num: edge.num, lines: [] }
      return
    }
    if (line.startsWith('%output ')) {
      const rest = line.slice('%output '.length)
      const sp = rest.indexOf(' ')
      if (sp < 0) return
      this.emit('output', rest.slice(0, sp), decodeControlOutput(rest.slice(sp + 1)))
      return
    }
    // With pause-after set, tmux reports output as `%extended-output pane age : data`,
    // where age is how long (ms) it held the data before sending.
    if (line.startsWith('%extended-output ')) {
      const rest = line.slice('%extended-output '.length)
      const sp = rest.indexOf(' ')
      const sep = rest.indexOf(' : ')
      if (sp < 0 || sep < 0) return
      this.emit('output', rest.slice(0, sp), decodeControlOutput(rest.slice(sep + 3)))
      return
    }
    if (
      line.startsWith('%layout-change ')
      || line.startsWith('%window-pane-changed ')
      || line.startsWith('%session-window-changed ')
      || line.startsWith('%window-renamed ')
      || line.startsWith('%session-changed ')
      || line.startsWith('%session-renamed ')
      || line.startsWith('%window-add ')
      || line.startsWith('%window-close ')
      || line.startsWith('%unlinked-window-add ')
      || line.startsWith('%unlinked-window-close ')
    ) {
      this.scheduleRefresh()
      return
    }
    if (line.startsWith('%pause ')) {
      this.emit('pause', line.slice('%pause '.length).trim())
      return
    }
    if (line.startsWith('%exit')) {
      const reason = line.slice('%exit'.length).trim()
      if (reason && !this.requestedDetach) this.emit('error', reason)
    }
  }

  private closeBlock(isError: boolean, ours: boolean, text: string): void {
    if (!ours) {
      // Unsolicited block (e.g. the attach guard). Surface real errors.
      if (isError && text.trim() !== '') this.emit('error', text.trim())
      return
    }
    const pending = this.queue[0]
    if (pending === undefined) {
      if (isError && text.trim() !== '') this.emit('error', text.trim())
      return
    }
    if (isError) pending.failure ??= new Error(text.trim() || 'tmux error')
    else pending.parts.push(text)
    pending.remaining -= 1
    if (pending.remaining > 0) return
    this.queue.shift()
    if (pending.failure) this.settle(pending, pending.failure, '')
    else this.settle(pending, null, pending.parts.join('\n'))
  }
}

/** `%begin/%end/%error <ts> <num> <flags>` — flags bit 0 marks our own command's block. */
function parseBlockEdge(line: string): { kind: 'begin' | 'end' | 'error'; num: string; ours: boolean } | null {
  const match = /^%(begin|end|error) (\d+) (\d+) (\d+)$/.exec(line)
  if (match === null) return null
  return {
    kind: match[1] as 'begin' | 'end' | 'error',
    num: match[3],
    ours: (Number(match[4]) & 1) === 1,
  }
}

function parsePaneLine(line: string): TmuxPane {
  const [id, index, title, left, top, width, height, active, role] = line.split('\t')
  return {
    id: id ?? '',
    index: Number(index) || 0,
    title: title ?? '',
    role: role ?? '',
    left: Number(left) || 0,
    top: Number(top) || 0,
    width: Number(width) || 0,
    height: Number(height) || 0,
    active: active === '1',
  }
}

function safeParse(layout: string): PaneRect[] {
  if (!layout) return []
  try {
    return parseLayout(layout).panes
  } catch {
    return []
  }
}

function mergePanes(listed: TmuxPane[], layout: PaneRect[]): TmuxPane[] {
  if (listed.length === 0 || layout.length === 0) return listed
  return listed.map((pane) => {
    const numeric = pane.id.replace(/^%/, '')
    const hit = layout.find((rect) => rect.id === numeric)
      ?? layout.find((rect) => Math.abs(rect.left - pane.left) < 1 && Math.abs(rect.top - pane.top) < 1)
    return hit === undefined ? pane : { ...pane, left: hit.left, top: hit.top, width: hit.width, height: hit.height }
  })
}

function clampClientSize(cols: number, rows: number): { cols: number; rows: number } {
  return {
    cols: Math.max(20, Math.min(500, Math.floor(cols))),
    rows: Math.max(6, Math.min(300, Math.floor(rows))),
  }
}

/** Keep the newest complete lines without exceeding one browser frame's budget. */
function truncateHistory(data: string): string {
  const encoded = Buffer.from(data, 'utf8')
  if (encoded.length <= MAX_HISTORY_BYTES) return data
  let tail = encoded.subarray(encoded.length - MAX_HISTORY_BYTES)
  const newline = tail.indexOf(0x0a)
  if (newline >= 0) tail = tail.subarray(newline + 1)
  return tail.toString('utf8').replace(/^\uFFFD+/, '')
}

const PANE_SEED_FORMAT = [
  '#{alternate_on}',
  '#{cursor_x}',
  '#{cursor_y}',
  '#{cursor_flag}',
  '#{mouse_any_flag}',
  '#{mouse_button_flag}',
  '#{mouse_standard_flag}',
  '#{mouse_sgr_flag}',
  '#{mouse_utf8_flag}',
  '#{keypad_cursor_flag}',
  '#{keypad_flag}',
  '#{wrap_flag}',
  '#{insert_flag}',
  '#{origin_flag}',
].join('\t')

interface PaneSeedState {
  alternateOn: boolean
  cursorX: number
  cursorY: number
  modes: string
}

function parsePaneSeedState(raw: string): PaneSeedState {
  const fields = (raw.split('\n')[0] ?? '').split('\t')
  const num = (i: number): number => Number.parseInt(fields[i] ?? '', 10)
  const on = (i: number): boolean => {
    const value = num(i)
    return Number.isFinite(value) && value !== 0
  }
  let modes = ''
  if (fields[3] === '0') modes += '\x1b[?25l'
  if (on(4)) modes += '\x1b[?1003h'
  if (on(5)) modes += '\x1b[?1002h'
  if (on(6)) modes += '\x1b[?1000h'
  if (on(7)) modes += '\x1b[?1006h'
  if (on(8)) modes += '\x1b[?1005h'
  if (on(9)) modes += '\x1b[?1h'
  if (on(10)) modes += '\x1b='
  if (fields[11] === '0') modes += '\x1b[?7l'
  if (on(12)) modes += '\x1b[4h'
  if (on(13)) modes += '\x1b[?6h'
  return { alternateOn: on(0), cursorX: num(1), cursorY: num(2), modes }
}

function formatHistorySeed(body: string, state: PaneSeedState): string {
  let data = '\x1b)0'
  if (state.alternateOn) data += '\x1b[?1049h'
  data += body
  data += '\x0f'
  if (Number.isFinite(state.cursorX) && Number.isFinite(state.cursorY)) {
    data += `\x1b[${state.cursorY + 1};${state.cursorX + 1}H`
  }
  return data + state.modes
}

function quote(value: string): string {
  if (/[\r\n\0]/.test(value)) throw new Error('invalid tmux target')
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function defaultTransport(tmuxBin: string, args: string[]): ControlTransport {
  const child = spawn(tmuxBin, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      // %output octal-escapes multibyte characters on a non-UTF-8 client;
      // force a UTF-8 locale so text passes through verbatim.
      LANG: process.env.LANG?.toLowerCase().includes('utf') ? process.env.LANG : 'C.UTF-8',
    },
  })
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  // A process shutdown can race the detach-client grace write. Consume the
  // stream-level EPIPE (the child exit handler fails pending commands) instead
  // of letting an unhandled stdin error terminate the DSH host.
  child.stdin.on('error', () => {})
  return {
    write: (data) => {
      if (!child.stdin.destroyed && child.stdin.writable) child.stdin.write(data, () => {})
    },
    kill: () => { child.kill() },
    pause: () => { child.stdout.pause() },
    resume: () => { child.stdout.resume() },
    onData: (fn) => { child.stdout.on('data', fn) },
    onStderr: (fn) => { child.stderr.on('data', fn) },
    onExit: (fn) => { child.on('exit', (code) => fn(code)) },
  }
}
