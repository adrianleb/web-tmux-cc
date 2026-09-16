/** A named session recipe. `launch` (plus `launchArgs`) is run when the session is missing. */
export interface LayoutSpec {
  id: string
  label: string
  session: string
  /** Launcher executable run when the session does not exist yet. */
  launch?: string
  /** Arguments for `launch`. Defaults to `['--ensure-only']`. */
  launchArgs?: string[]
}

/** The subset of a layout the browser is allowed to see (no host paths). */
export interface LayoutInfo {
  id: string
  label: string
  session: string
}

/** Browser-local presentation preferences. Never broadcast to other viewers. */
export interface DockPrefs {
  open: boolean
  side: 'bottom' | 'right'
  size: number
  /** Last session this browser explicitly selected; attachment itself is shared runtime state. */
  session: string
  /**
   * CSS `font-family` stack for xterm panes. Empty uses the client default,
   * which prefers Berkeley Mono and other fonts installed on the viewing machine.
   */
  fontFamily: string
  /** Preferred native font size. Mirror mode may shrink it to fit the tmux grid. */
  fontSize: number
  cursorStyle: 'block' | 'underline' | 'bar'
  cursorBlink: boolean
  /** Retained xterm rows and requested tmux history depth. */
  scrollbackLines: number
  /** Require an explicit second action before sending kill-pane. */
  confirmKill: boolean
  /** Enable best-effort ⌥⌘D / ⌥⇧⌘D split shortcuts in this browser. */
  compactSplitShortcuts: boolean
  /**
   * When true, the client also sets DSH's `--ds-font-family-code` (and
   * `--dsw-font-mono`) to the resolved terminal stack so code in the harness
   * follows the same system font.
   */
  applyFontToHarness: boolean
}

export const DEFAULT_PREFS: DockPrefs = {
  open: false,
  side: 'bottom',
  size: 280,
  session: '',
  fontFamily: '',
  fontSize: 12,
  cursorStyle: 'block',
  cursorBlink: true,
  scrollbackLines: 2000,
  confirmKill: true,
  compactSplitShortcuts: false,
  applyFontToHarness: false,
}

export type SizePolicy = 'auto' | 'mirror'

/** Host-shared durable settings; these affect the one shared tmux control client. */
export interface TmuxSettings {
  sizePolicy: SizePolicy
}

export const DEFAULT_SETTINGS: TmuxSettings = {
  sizePolicy: 'auto',
}

/** Compatibility surface for the legacy /prefs endpoint. */
export interface RuntimePrefs {
  session: string
}

/** Reject CSS-breaking characters; font-family may contain quotes and commas. */
export function sanitizeFontFamily(value: unknown): string {
  if (typeof value !== 'string') return ''
  const s = value.trim()
  if (!s || s.length > 300 || /[{}<>;\n\r]/.test(s)) return ''
  return s
}

export interface PaneInfo {
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

export interface SessionInfo {
  name: string
  attached: number
  windows: number
}

/** Identity returned by tmux; all three fields are required for a selected detach. */
export interface AttachedClientIdentity {
  name: string
  pid: number
  created: number
}

export interface AttachedClientInfo extends AttachedClientIdentity {
  session: string
  tty: string
  term: string
  cols: number
  rows: number
  flags: string[]
  control: boolean
  /** This runtime's shared control client; detach it with the existing dock action. */
  own: boolean
}

export type ManagementRequest =
  | { type: 'management'; requestId: string }
  | { type: 'create-session'; requestId: string; name: string; cwd?: string }
  | { type: 'rename-session'; requestId: string; session: string; newName: string }
  | { type: 'detach-clients'; requestId: string; clients: AttachedClientIdentity[] }

export interface WindowInfo {
  id: string
  index: number
  name: string
  active: boolean
}

export interface Snapshot {
  session: string
  windowId: string
  windowName: string
  cols: number
  rows: number
  zoomed: boolean
  attached: boolean
  error?: string
  panes: PaneInfo[]
  sessions: SessionInfo[]
  windows: WindowInfo[]
  layouts: LayoutInfo[]
  /** Other attached clients that participate in window sizing (no ignore-size). */
  viewers: number
  /**
   * mirror: someone else dictates geometry; we render true cells, scaled.
   * takeover: nobody else cares; the dock dictates the window size.
   */
  sizeMode: 'mirror' | 'takeover'
  /** Effective host-wide policy controlling whether this plugin may take over sizing. */
  sizePolicy: SizePolicy
}

export type ClientToHost =
  | ManagementRequest
  | { type: 'hello' }
  | { type: 'input'; pane: string; data: string }
  | { type: 'resize'; cols: number; rows: number }
  | { type: 'resize'; active: false }
  | { type: 'select'; pane: string }
  | { type: 'swap'; pane: string; target: string }
  | { type: 'zoom'; pane?: string }
  | { type: 'split'; pane: string; dir: 'h' | 'v' }
  | { type: 'kill'; pane?: string }
  | { type: 'resize-pane'; pane: string; width?: number; height?: number }
  | { type: 'resize-pane-dir'; pane: string; dir: 'L' | 'R' | 'U' | 'D'; amount?: number }
  | { type: 'select-dir'; dir: 'L' | 'R' | 'U' | 'D' }
  | { type: 'new-window' }
  | { type: 'attach'; session: string }
  | { type: 'select-window'; windowId: string }
  | { type: 'detach' }
  | { type: 'refresh' }
  | { type: 'capture'; pane?: string; lines?: number }

export type HostToClient =
  | { type: 'snapshot'; snapshot: Snapshot }
  | { type: 'output'; pane: string; data: string }
  | { type: 'history'; pane: string; data: string }
  | { type: 'management'; requestId: string; sessions: SessionInfo[]; clients: AttachedClientInfo[] }
  | { type: 'error'; message: string; requestId?: string }
