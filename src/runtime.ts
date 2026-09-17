import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { TmuxControlClient, listSessionsCli, type TmuxSnapshot } from './tmux-client.ts'
import { TmuxManagement, isManagementType, managementRequestId, validateManagementRequest } from './tmux-management.ts'
import {
  DEFAULT_SETTINGS,
  type ClientToHost,
  type HostToClient,
  type LayoutInfo,
  type LayoutSpec,
  type RuntimePrefs,
  type SizePolicy,
  type Snapshot,
} from './types.ts'

const execFileAsync = promisify(execFile)

export interface RuntimeConfig {
  tmuxBin: string
  layouts?: LayoutSpec[]
  /** Static composition fallback used when no DSH settings provider is mounted. */
  sizePolicy?: SizePolicy
  /** Live settings source supplied by the host settings namespace. */
  getSizePolicy?: () => SizePolicy
}

export interface SocketLike {
  send(data: string): void
  close(code?: number, reason?: string): void
  on(event: 'message', fn: (data: string) => void): void
  on(event: 'close', fn: () => void): void
}


/** One socket's pending history seed: which panes (null = all visible) and how deep. */
interface CaptureRequest {
  lines?: number
  panes: Set<string> | null
}
/** Session → socket that most recently resized, typed, or attached. */
const primarySizers = new Map<string, SocketLike>()


export class TmuxRuntime {
  private readonly tmuxBin: string
  private readonly layouts: LayoutSpec[]
  private readonly getSizePolicy: () => SizePolicy
  private client: TmuxControlClient | null = null
  /** Last selected session only; browser presentation preferences stay local. */
  private prefs: RuntimePrefs = { session: '' }
  private sockets = new Set<SocketLike>()
  /** The websocket this runtime was bound to (one runtime per socket today). */
  private sizingSocket: SocketLike | null = null
  /**
   * Dock grids reported by each browser client. Multiple devices share one
   * tmux control client, so takeover follows tmux's own multi-client rule:
   * the window is sized to the smallest reporting viewer (min cols, min
   * rows). A single `desiredSize` slot let the last reporter win, making
   * e.g. a phone and a desktop ping-pong the window geometry.
   */
  private desiredSizes = new Map<SocketLike, { cols: number; rows: number }>()
  private sizeMode: 'mirror' | 'takeover' = 'mirror'
  private appliedSize = ''
  /** Windows this runtime put into `window-size manual` via resize-window. */
  private manualWindows = new Set<string>()
  /** Last window `resize-window` was applied to; empty until a primary apply. */
  private appliedWindowId = ''
  private viewerPoll: ReturnType<typeof setInterval> | null = null
  /** Serialize and coalesce flag/grid changes so snapshots cannot race modes. */
  private sizePolicyTask: Promise<void> | null = null
  private sizePolicyDirty = false
  private sizePolicyRetry: ReturnType<typeof setTimeout> | null = null
  private sizePolicyRetryDelay = 250
  /** Invalidates policy writes that were awaiting a replaced/detached control client. */
  private attachmentGeneration = 0
  /** Pending captures per socket (`panes: null` = every visible pane) and one active drain globally. */
  private captureRequests = new Map<SocketLike, CaptureRequest>()
  private captureTask: Promise<void> | null = null
  private readonly management: TmuxManagement
  /** Inventory, management writes, and wire attachment changes share one queue. */
  private managementTask: Promise<void> = Promise.resolve()
  private disposed = false

  constructor(config: RuntimeConfig) {
    this.tmuxBin = config.tmuxBin
    this.management = new TmuxManagement(this.tmuxBin, () => this.client?.controlClientName ?? '')
    this.layouts = config.layouts ?? []
    const requested = config.sizePolicy
    const fallback = requested === 'primary' || requested === 'auto' || requested === 'mirror'
      ? requested
      : DEFAULT_SETTINGS.sizePolicy
    this.getSizePolicy = config.getSizePolicy ?? (() => fallback)
  }

  getPrefs(): RuntimePrefs {
    return { ...this.prefs }
  }

  getSettings(): { sizePolicy: SizePolicy } {
    return { sizePolicy: this.sizePolicy() }
  }

  /** Legacy HTTP compatibility: only the shared session hint is host-owned. */
  setPrefs(patch: Partial<RuntimePrefs>): RuntimePrefs {
    if (typeof patch.session === 'string') this.prefs = { session: patch.session.slice(0, 200) }
    return this.getPrefs()
  }

  private sizePolicy(): SizePolicy {
    const policy = this.getSizePolicy()
    return policy === 'primary' || policy === 'auto' || policy === 'mirror' ? policy : DEFAULT_SETTINGS.sizePolicy
  }


  /** Re-apply a newly committed host setting and publish the resulting mode. */
  settingsChanged(): void {
    void (async () => {
      if (this.sizePolicy() !== 'primary') {
        await this.restoreManualWindows()
        this.sizeMode = 'mirror'
        this.appliedSize = ''
        this.appliedWindowId = ''
      }
      const client = this.client
      const snap = client?.currentSnapshot()
      if (client && client.attached && snap) {
        try {
          await this.queueSizePolicy()
        } catch { /* transient */ }
        const latest = client.currentSnapshot() ?? snap
        this.broadcast({ type: 'snapshot', snapshot: this.toSnapshot(latest, true) })
        return
      }
      try {
        this.broadcast({ type: 'snapshot', snapshot: await this.snapshot() })
      } catch (error: unknown) {
        this.broadcastError(error)
      }
    })()
  }


  async snapshot(): Promise<Snapshot> {
    if (this.client?.attached) {
      const snap = this.client.currentSnapshot()
      if (snap) return this.toSnapshot(snap, true)
    }
    const sessions = await listSessionsCli(this.tmuxBin)
    return {
      session: this.prefs.session,
      windowId: '',
      windowName: '',
      cols: 80,
      rows: 24,
      zoomed: false,
      attached: false,
      panes: [],
      sessions,
      windows: [],
      layouts: this.layoutInfos(),
      viewers: 0,
      sizeMode: 'mirror',
      sizePolicy: this.sizePolicy(),
    }
  }

  attach(session: string): Promise<Snapshot> {
    return this.queueManagement(() => this.attachSession(session))
  }

  private async attachSession(session: string): Promise<Snapshot> {
    const resolved = this.resolveSession(session)
    if (!this.client) this.client = this.makeClient()
    if (this.client.attached && this.client.session !== resolved) {
      // A new control attachment always starts with ignore-size. Do not carry
      // the old attachment's takeover bookkeeping across the boundary.
      this.attachmentGeneration += 1
      await this.sizePolicyTask?.catch(() => { /* the detach below supersedes it */ })
      await this.restoreManualWindows()
      this.resetSizeState(false)
      this.client.detach()
    }
    if (!this.client.attached) {
      await this.ensureSession(resolved)
      this.resetSizeState(false)
      this.attachmentGeneration += 1
      await this.client.attach(resolved)
      this.startViewerPoll()
      if (this.sizingSocket) this.claimSizing(this.sizingSocket)
      // Browser votes survive a manual detach/session switch, so enforce them
      // against the fresh ignore-size client before reporting its mode.
      await this.queueSizePolicy()
    }
    this.setPrefs({ session: resolved })
    if (this.sizingSocket) this.claimSizing(this.sizingSocket)
    return this.snapshot()
  }

  async detach(): Promise<void> {
    this.attachmentGeneration += 1
    await this.restoreManualWindows()
    this.resetSizeState(false)
    this.captureRequests.clear()
    this.client?.detach()
    void this.snapshot().then((snap) => this.broadcast({ type: 'snapshot', snapshot: snap }))
      .catch((error: unknown) => this.broadcastError(error))
  }

  dispose(): void {
    this.disposed = true
    this.attachmentGeneration += 1
    const client = this.client
    const restored = this.restoreManualWindows()
    if (this.sizingSocket) this.releaseSizing(this.sizingSocket)
    this.resetSizeState(true)
    this.captureRequests.clear()
    this.client = null
    for (const socket of this.sockets) socket.close(1001, 'plugin unload')
    this.sockets.clear()
    this.sizingSocket = null
    void restored.finally(() => { client?.detach() })
  }


  /**
   * Size policy. Primary → this browser dictates the window via resize-window
   * (control client stays ignore-size). Auto: someone else at the table (a
   * real seat or an iTerm -CC client) → mirror; alone → the dock dictates
   * via the client-size path. Mirror: never resize.
   */
  private async applySizePolicy(snap: TmuxSnapshot): Promise<void> {
    const client = this.client
    if (client === null || !client.attached) return
    const generation = this.attachmentGeneration
    const policy = this.sizePolicy()
    const stillCurrent = (): boolean => (
      this.client === client && client.attached && this.attachmentGeneration === generation
    )

    if (policy === 'primary') {
      // Auto takeover may have cleared ignore-size; primary never participates.
      if (this.sizeMode === 'takeover' && this.appliedWindowId === '') {
        await client.setIgnoreSize(true)
        if (!stillCurrent()) return
      }
      const holder = primarySizers.get(this.sizingSession())
      const desiredSize = this.holdsSizing() && holder !== undefined
        ? (this.desiredSizes.get(holder) ?? null)
        : null
      if (desiredSize === null) {
        this.sizeMode = 'mirror'
        this.appliedSize = ''
        this.appliedWindowId = ''
        return
      }
      const needsResize = snap.windowId !== this.appliedWindowId
        || snap.cols !== desiredSize.cols
        || snap.rows !== desiredSize.rows
      if (needsResize) {
        await client.resizeWindow(snap.windowId, desiredSize.cols, desiredSize.rows)
        this.manualWindows.add(snap.windowId)
        await client.refreshSnapshot()
        if (!stillCurrent()) return
        if (!this.holdsSizing()) {
          this.sizeMode = 'mirror'
          this.appliedSize = ''
          this.appliedWindowId = ''
          return
        }
        this.appliedWindowId = snap.windowId
        this.appliedSize = `${desiredSize.cols}x${desiredSize.rows}`
      }
      this.sizeMode = 'takeover'
      return
    }

    const desiredSize = this.effectiveSize()
    // Never grant takeover from a cached zero. Another normal/iTerm client can
    // attach between the five-second polls, so verify directly before every
    // browser-driven sizing write; a failed check is conservatively a viewer.
    let viewers = snap.viewers
    if (policy === 'auto' && viewers === 0 && desiredSize !== null) {
      viewers = await client.countViewers().catch(() => 1)
    }
    // With another real seat, or with no visible desktop dock volunteering a
    // grid, this control client is a pure mirror. In particular, closing a
    // dock or crossing into the mobile breakpoint must release its old size.
    if (policy === 'mirror' || viewers > 0 || desiredSize === null) {
      if (this.sizeMode !== 'mirror') await client.setIgnoreSize(true)
      if (!stillCurrent()) return
      this.sizeMode = 'mirror'
      this.appliedSize = ''
      return
    }
    const key = `${desiredSize.cols}x${desiredSize.rows}`
    if (this.sizeMode !== 'takeover') {
      // Grid and sizing flag land atomically; never flash tmux's default
      // control-client geometry between two refresh-client commands.
      await client.takeOverSize(desiredSize.cols, desiredSize.rows)
      if (!stillCurrent()) return
      this.sizeMode = 'takeover'
      this.appliedSize = key
      return
    }
    if (this.appliedSize !== key) {
      await client.setClientSize(desiredSize.cols, desiredSize.rows)
      if (!stillCurrent()) return
      this.appliedSize = key
    }
  }


  /**
   * Reconcile against the newest snapshot after earlier writes settle. Bursts
   * collapse into one trailing pass; there is no one-command queue entry per
   * layout notification during a drag.
   */
  private queueSizePolicy(): Promise<void> {
    this.sizePolicyDirty = true
    if (this.sizePolicyTask !== null) return this.sizePolicyTask
    const run = (async () => {
      let lastError: unknown
      while (this.sizePolicyDirty) {
        this.sizePolicyDirty = false
        const client = this.client
        const snap = client?.currentSnapshot()
        if (client === null || client === undefined || !client.attached || snap === null || snap === undefined) continue
        try {
          await this.applySizePolicy(snap)
          lastError = undefined
        } catch (err) {
          lastError = err
        }
      }
      if (lastError !== undefined) {
        this.scheduleSizePolicyRetry()
        throw lastError
      }
      this.clearSizePolicyRetry()
    })()
    this.sizePolicyTask = run.finally(() => { this.sizePolicyTask = null })
    return this.sizePolicyTask
  }

  private scheduleSizePolicyRetry(): void {
    if (this.sizePolicyRetry !== null) return
    const delay = this.sizePolicyRetryDelay
    this.sizePolicyRetryDelay = Math.min(5000, delay * 2)
    this.sizePolicyRetry = setTimeout(() => {
      this.sizePolicyRetry = null
      if (!this.client?.attached) return
      void this.queueSizePolicy()
        .then(() => {
          const latest = this.client?.currentSnapshot()
          if (latest) this.broadcast({ type: 'snapshot', snapshot: this.toSnapshot(latest, true) })
        })
        .catch(() => { /* the queue schedules the next retry */ })
    }, delay)
  }

  private clearSizePolicyRetry(): void {
    if (this.sizePolicyRetry !== null) clearTimeout(this.sizePolicyRetry)
    this.sizePolicyRetry = null
    this.sizePolicyRetryDelay = 250
  }

  /** The grid every reporting viewer can display: min of cols and rows. */
  private effectiveSize(): { cols: number; rows: number } | null {
    if (this.desiredSizes.size === 0) return null
    let cols = Infinity
    let rows = Infinity
    for (const size of this.desiredSizes.values()) {
      cols = Math.min(cols, size.cols)
      rows = Math.min(rows, size.rows)
    }
    return { cols, rows }
  }

  private resetSizeState(clearDesiredSizes: boolean): void {
    this.sizeMode = 'mirror'
    this.appliedSize = ''
    this.appliedWindowId = ''
    this.sizePolicyDirty = false
    if (clearDesiredSizes) this.desiredSizes.clear()
    this.clearSizePolicyRetry()
    clearInterval(this.viewerPoll)
    this.viewerPoll = null
  }

  private sizingSession(): string {
    return this.client?.session || this.prefs.session || ''
  }

  private claimSizing(socket: SocketLike): void {
    for (const [name, holder] of primarySizers) {
      if (holder === socket) primarySizers.delete(name)
    }
    const session = this.sizingSession()
    if (session === '') return
    primarySizers.set(session, socket)
  }

  private releaseSizing(socket: SocketLike): void {
    for (const [name, holder] of primarySizers) {
      if (holder === socket) primarySizers.delete(name)
    }
  }

  private holdsSizing(socket?: SocketLike): boolean {
    const session = this.sizingSession()
    if (session === '') return false
    const holder = primarySizers.get(session)
    if (holder === undefined) return false
    if (socket !== undefined) return holder === socket
    return this.sockets.has(holder)
  }

  private async restoreManualWindows(): Promise<void> {
    const client = this.client
    const windows = [...this.manualWindows]
    this.manualWindows.clear()
    this.appliedWindowId = ''
    if (client === null || !client.attached) return
    for (const windowId of windows) {
      try {
        await client.unsetWindowSize(windowId)
      } catch { /* window gone */ }
    }
  }


  /** Watch for seats appearing/disappearing; tmux has no notification for it. */
  private startViewerPoll(): void {
    if (this.viewerPoll) clearInterval(this.viewerPoll)
    this.viewerPoll = setInterval(() => {
      const client = this.client
      if (client === null || !client.attached) return
      void client.countViewers()
        .then(async (viewers) => {
          if (viewers !== (client.currentSnapshot()?.viewers ?? 0)) {
            await client.refreshSnapshot()
          }
        })
        .catch(() => { /* transient */ })
    }, 5000)
  }

  bind(socket: SocketLike): void {
    this.sizingSocket = socket
    this.sockets.add(socket)
    void this.snapshot().then((snap) => {
      socket.send(JSON.stringify({ type: 'snapshot', snapshot: snap } satisfies HostToClient))
    }).catch((err: unknown) => this.sendError(socket, err))
    socket.on('message', (raw) => {
      void this.handle(socket, raw).catch((err: unknown) => {
        let requestId: string | undefined
        try { requestId = managementRequestId(JSON.parse(raw)) } catch { /* malformed JSON has no usable ID */ }
        this.sendError(socket, err, requestId)
      })
    })
    socket.on('close', () => {
      this.sockets.delete(socket)
      this.captureRequests.delete(socket)
      this.releaseSizing(socket)
      if (this.sizingSocket === socket) this.sizingSocket = null
      // A departing viewer may unblock a larger shared grid.
      if (this.desiredSizes.delete(socket)) {
        void this.queueSizePolicy().catch(() => { /* transient */ })
      }
    })
  }


  /** A layout id is accepted anywhere a session name is; it maps to its session. */
  private resolveSession(nameOrLayoutId: string): string {
    const layout = this.layouts.find((l) => l.id === nameOrLayoutId || l.session === nameOrLayoutId)
    return layout?.session ?? nameOrLayoutId
  }

  /** Run the configured launcher when the target session does not exist yet. */
  private async ensureSession(session: string): Promise<void> {
    const sessions = await listSessionsCli(this.tmuxBin)
    if (sessions.some((s) => s.name === session)) return
    const layout = this.layouts.find((l) => l.session === session)
    if (layout?.launch === undefined) {
      throw new Error(`tmux session "${session}" not found`)
    }
    try {
      await execFileAsync(layout.launch, layout.launchArgs ?? ['--ensure-only'], { timeout: 20000 })
    } catch (err) {
      throw new Error(`launcher for "${session}" failed: ${err instanceof Error ? err.message : String(err)}`)
    }
    const after = await listSessionsCli(this.tmuxBin)
    if (!after.some((s) => s.name === session)) {
      throw new Error(`launcher ran but tmux session "${session}" still does not exist`)
    }
  }

  /** Keep native commands shell-free and bounded, including browser pane swaps. */
  private async runTmux(args: string[]): Promise<void> {
    await execFileAsync(this.tmuxBin, args, { timeout: 5000 })
  }

  private layoutInfos(): LayoutInfo[] {
    return this.layouts.map(({ id, label, session }) => ({ id, label, session }))
  }

  private makeClient(): TmuxControlClient {
    const client = new TmuxControlClient(this.tmuxBin)
    client.on('snapshot', (snap) => {
      this.setPrefs({ session: snap.session })
      // Settle serialized size policy first so the broadcast reports the final
      // mode and concurrent click/resize snapshots cannot race flag changes.
      void this.queueSizePolicy()
        .catch(() => { /* transient */ })
        .finally(() => {
          const latest = client.currentSnapshot() ?? snap
          this.broadcast({ type: 'snapshot', snapshot: this.toSnapshot(latest, true) })
        })
    })
    client.on('output', (pane, data) => {
      this.broadcast({ type: 'output', pane, data })
    })
    client.on('error', (message) => {
      this.broadcast({ type: 'error', message })
    })
    client.on('exit', () => {
      // Only unexpected exits arrive here; a requested detach broadcasts from detach().
      this.resetSizeState(false)
      this.attachmentGeneration += 1
      this.captureRequests.clear()
      void this.snapshot().then((snap) => this.broadcast({
        type: 'snapshot',
        snapshot: { ...snap, attached: false, error: 'tmux control client exited' },
      })).catch((error: unknown) => this.broadcastError(error))
    })
    return client
  }

  /** Coalesce capture requests per socket: pane sets merge, "all" absorbs. */
  private requestCapture(socket: SocketLike, lines?: number, pane?: string): void {
    const pending = this.captureRequests.get(socket)
    if (pending === undefined) {
      this.captureRequests.set(socket, { lines, panes: pane === undefined ? null : new Set([pane]) })
    } else {
      if (lines !== undefined) pending.lines = lines
      if (pane === undefined) pending.panes = null
      else pending.panes?.add(pane)
    }
    if (this.captureTask !== null) return
    const run = this.drainCaptures()
    this.captureTask = run
      .catch(() => { /* per-request failures are reported by drainCaptures */ })
      .finally(() => {
        this.captureTask = null
        // Defensive against a request arriving as the drain settles.
        const next = this.captureRequests.entries().next().value as [SocketLike, CaptureRequest] | undefined
        if (next !== undefined) {
          const [nextSocket, request] = next
          this.captureRequests.delete(nextSocket)
          if (request.panes === null) this.requestCapture(nextSocket, request.lines)
          else for (const paneId of request.panes) this.requestCapture(nextSocket, request.lines, paneId)
        }
      })
  }

  private async drainCaptures(): Promise<void> {
    while (this.captureRequests.size > 0) {
      const entry = this.captureRequests.entries().next().value as [SocketLike, CaptureRequest] | undefined
      if (entry === undefined) return
      const [socket, request] = entry
      this.captureRequests.delete(socket)
      const client = this.client
      const generation = this.attachmentGeneration
      if (client === null || !client.attached) continue
      try {
        const visible = (client.currentSnapshot()?.panes ?? []).map((pane) => pane.id)
        const paneIds = request.panes === null ? visible : visible.filter((id) => request.panes!.has(id))
        // Send each seed as soon as that pane's command closes. Holding all
        // panes until the final capture would let pane-one live output arrive
        // before pane-one history and then be reset away in the browser.
        for (const paneId of paneIds) {
          let captures: Array<{ pane: string; data: string }>
          try {
            captures = await client.captureVisible(request.lines, paneId)
          } catch (err) {
            if (!this.sockets.has(socket)) break
            socket.send(JSON.stringify({
              type: 'error',
              message: `history capture failed for ${paneId}: ${err instanceof Error ? err.message : String(err)}`,
            } satisfies HostToClient))
            continue
          }
          if (
            !this.sockets.has(socket)
            || this.client !== client
            || !client.attached
            || this.attachmentGeneration !== generation
          ) break
          for (const capture of captures) {
            socket.send(JSON.stringify({ type: 'history', ...capture } satisfies HostToClient))
          }
        }
      } catch (err) {
        if (!this.sockets.has(socket)) continue
        socket.send(JSON.stringify({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        } satisfies HostToClient))
      }
    }
  }

  private async handle(socket: SocketLike, raw: string): Promise<void> {
    let msg: ClientToHost
    try {
      msg = JSON.parse(raw) as ClientToHost
    } catch {
      throw new Error('invalid message')
    }
    if (typeof msg !== 'object' || msg === null || Array.isArray(msg) || typeof msg.type !== 'string') {
      throw new Error('invalid message')
    }
    if (isManagementType(msg.type)) {
      const request = validateManagementRequest(msg)
      if (request.type === 'create-session' || request.type === 'rename-session') {
        const name = request.type === 'create-session' ? request.name : request.newName
        if (this.layouts.some(layout => layout.id === name && layout.session !== name)) {
          throw new Error(`session name "${name}" is reserved by a layout recipe; choose another name`)
        }
      }
      await this.queueManagement(async () => {
        let failure: unknown
        try {
          if (request.type === 'create-session') await this.management.create(request.name, request.cwd)
          else if (request.type === 'rename-session') {
            await this.management.rename(request.session, request.newName)
            if (this.prefs.session === request.session) this.setPrefs({ session: request.newName })
          } else if (request.type === 'detach-clients') await this.management.detach(request.clients)
        } catch (error) {
          failure = error
        }
        if (request.type !== 'management') {
          // Refresh even after failure: a client may disappear mid-batch, or a
          // command may have succeeded before an IPC/refresh failure surfaced.
          try {
            const client = this.client
            if (client?.attached) {
              await client.refreshSnapshot()
              await this.queueSizePolicy()
            }
            this.broadcast({ type: 'snapshot', snapshot: await this.snapshot() })
          } catch (error) {
            failure ??= error
          }
        }
        if (failure !== undefined) throw failure
        const inventory = await this.management.inventory()
        socket.send(JSON.stringify({ type: 'management', requestId: request.requestId, ...inventory } satisfies HostToClient))
      })
      return
    }
    if (msg.type === 'hello' || msg.type === 'refresh') {
      socket.send(JSON.stringify({ type: 'snapshot', snapshot: await this.snapshot() } satisfies HostToClient))
      return
    }
    if (msg.type === 'capture') {
      this.requestCapture(socket, msg.lines, msg.pane)
      return
    }
    if (msg.type === 'attach') {
      const snap = await this.attach(msg.session)
      this.claimSizing(socket)
      if (this.sizePolicy() === 'primary') await this.queueSizePolicy()
      socket.send(JSON.stringify({ type: 'snapshot', snapshot: snap } satisfies HostToClient))
      return
    }
    if (msg.type === 'detach') {
      await this.queueManagement(async () => { await this.detach() })
      return
    }
    if (msg.type === 'resize') {
      if ('active' in msg) {
        this.releaseSizing(socket)
        const had = this.desiredSizes.delete(socket)
        if (had || this.sizePolicy() === 'primary') await this.queueSizePolicy()
        return
      }
      const cols = Number(msg.cols)
      const rows = Number(msg.rows)
      if (Number.isFinite(cols) && Number.isFinite(rows)) {
        this.desiredSizes.set(socket, {
          cols: Math.max(20, Math.min(500, Math.floor(cols))),
          rows: Math.max(6, Math.min(300, Math.floor(rows))),
        })
        this.claimSizing(socket)
        await this.queueSizePolicy()
      }
      return
    }
    const client = this.client
    if (client === null || !client.attached) throw new Error('not attached')
    if (msg.type === 'input') {
      this.claimSizing(socket)
      await client.sendKeys(msg.pane, msg.data)
      if (this.sizePolicy() === 'primary') await this.queueSizePolicy()
      return
    }
    if (msg.type === 'select') { await client.selectPane(msg.pane); return }
    if (msg.type === 'swap') {
      if (
        typeof msg.pane !== 'string' || !/^%\d+$/.test(msg.pane)
        || typeof msg.target !== 'string' || !/^%\d+$/.test(msg.target)
      ) throw new Error('invalid swap request')
      if (msg.pane === msg.target) throw new Error('cannot swap a pane with itself')
      const panes = client.currentSnapshot()?.panes ?? []
      if (!panes.some((pane) => pane.id === msg.pane) || !panes.some((pane) => pane.id === msg.target)) {
        throw new Error('swap panes must be visible in the attached tmux window')
      }
      // Native swaps are symmetric, but tmux 3.7b changes focus even with -d
      // when the target is active. Keep an involved active pane on the source
      // side; an uninvolved active pane stays untouched without a select-pane.
      const targetActive = panes.some((pane) => pane.id === msg.target && pane.active)
      const [source, target] = targetActive ? [msg.target, msg.pane] : [msg.pane, msg.target]
      await this.runTmux(['swap-pane', '-d', '-s', source, '-t', target])
      await client.refreshSnapshot()
      return
    }
    if (msg.type === 'select-window') { await client.selectWindow(msg.windowId); return }
    if (msg.type === 'zoom') { await client.zoom(msg.pane); return }
    if (msg.type === 'split') {
      if (typeof msg.pane !== 'string' || (msg.dir !== 'h' && msg.dir !== 'v')) throw new Error('invalid split request')
      await client.split(msg.dir, msg.pane)
      return
    }
    if (msg.type === 'new-window') { await client.newWindow(); return }
    if (msg.type === 'kill') { await client.killPane(msg.pane); return }
    if (msg.type === 'resize-pane') {
      await client.resizePane(msg.pane, { width: msg.width, height: msg.height })
      return
    }
    if (msg.type === 'resize-pane-dir') {
      if (typeof msg.pane !== 'string' || !['L', 'R', 'U', 'D'].includes(msg.dir)) {
        throw new Error('invalid directional pane resize request')
      }
      await client.resizePaneDirection(msg.pane, msg.dir, msg.amount)
      return
    }
    if (msg.type === 'select-dir') { await client.selectDir(msg.dir) }
  }

  private queueManagement<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.managementTask.then(() => {
      if (this.disposed) throw new Error('tmux runtime disposed')
      return operation()
    })
    this.managementTask = task.then(() => {}, () => {})
    return task
  }

  private sendError(socket: SocketLike, error: unknown, requestId?: string): void {
    try {
      socket.send(JSON.stringify({
        type: 'error', message: error instanceof Error ? error.message : String(error),
        ...(requestId === undefined ? {} : { requestId }),
      } satisfies HostToClient))
    } catch { /* socket already closed */ }
  }

  private broadcastError(error: unknown): void {
    this.broadcast({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  }

  private broadcast(msg: HostToClient, skip?: SocketLike): void {
    const raw = JSON.stringify(msg)
    for (const socket of this.sockets) {
      if (socket === skip) continue
      try { socket.send(raw) } catch { /* closed */ }
    }
  }

  private toSnapshot(snap: TmuxSnapshot, attached: boolean): Snapshot {
    return {
      session: snap.session,
      windowId: snap.windowId,
      windowName: snap.windowName,
      cols: snap.cols,
      rows: snap.rows,
      zoomed: snap.zoomed,
      attached,
      panes: snap.panes,
      sessions: snap.sessions,
      windows: snap.windows,
      layouts: this.layoutInfos(),
      viewers: snap.viewers,
      sizeMode: this.sizeMode,
      sizePolicy: this.sizePolicy(),
    }
  }
}
