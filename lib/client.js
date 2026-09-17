    /* web-tmux-cc browser client: vanilla DOM around xterm.js. */
    const STORE_KEY = 'web-tmux-cc:preferences'
    const SESSION_KEY = 'web-tmux-cc:session'
    const ROOT_ID = 'web-tmux-cc-root'
    const BUFFER_CAP = 800000
    const PREFS_VERSION = 3
    const MAX_SCROLLBACK_LINES = 20000
    /**
     * Mirror mode keeps a readable touch font and allows panning across a
     * larger remote grid. Auto instead sizes the native grid to the page.
     */
    const MOBILE_MIN_FONT = 12
    /** Desktop mirrors shrink to fit the remote grid down to this size. */
    const MIN_FONT = 5
    /**
     * Data xterm emits within this long after a keyboard, IME, or paste event
     * on the terminal is the user's; anything later is a terminal reply.
     */
    const USER_INPUT_WINDOW_MS = 500
    const copy = {
        attach: 'Attach',
        detach: 'Detach',
        zoom: 'Zoom',
        unzoom: 'Unzoom pane',
        splitH: 'Split →',
        splitV: 'Split ↓',
        kill: 'Close pane',
        killConfirm: 'Close this pane? Its running process will be stopped.',
        movePane: 'Drag title to swap panes; double-click to zoom',
        kbd: 'Keyboard',
        hideKeyboard: 'Hide keyboard',
        fontDown: 'Smaller terminal text',
        fontUp: 'Larger terminal text',
        hint: 'Drag pane dividers to resize.',
        keys: 'Pane shortcuts',
        keysHelp: 'With a terminal focused: Ctrl+B, then arrows, c, n/p, 0–9, x, z, d, " or %. Press Ctrl+B twice to send it literally.',
        touchKeys: 'Touch keyboard',
        touchKeysHelp: 'Tap a pane to type in it. A key bar above the on-screen keyboard adds Esc, Tab, arrows, Home/End, PgUp/PgDn and symbols; Ctrl and Alt are sticky (tap once for the next key, twice to lock) and apply to the on-screen keyboard too. Opening the keyboard never resizes the tmux window; the page scrolls to keep the active pane above it.',
        itermKeys: 'iTerm2-compatible macOS shortcuts',
        itermKeysHelp: '⌃⇧⌘D detach; ⌃⇧⌘N/T or ⌥⇧⌘N/T new window; ⌥⌘X close pane; ⇧⌘↩ zoom; ⌃⌘Arrows resize; ⌥⇧⌘H/V split.',
        shortcutSafety: 'Browser-reserved iTerm2 chords—⌘D, all ⌘W variants, ⌘[/], and ⌥⌘Arrows—are intentionally not captured.',
        state: 'State',
        attached: 'Attached',
        detached: 'Detached',
        panes: 'Panes',
        notAttached: 'Pick a tmux session and attach.',
        sessionGone: 'That session is gone — pick another one.',
        noSessions: 'No tmux sessions on this host.',
        font: 'Terminal font',
        fontHelp: 'CSS font-family stack. Leave empty to prefer Berkeley Mono and other monospace fonts installed on the computer viewing this page.',
        fontPlaceholder: '"Berkeley Mono", monospace',
        terminal: 'Terminal',
        fontSize: 'Preferred font size',
        fontSizeHelp: 'Mirror mode may shrink the font to preserve the complete real tmux grid.',
        cursorStyle: 'Cursor style',
        cursorBlock: 'Block',
        cursorUnderline: 'Underline',
        cursorBar: 'Bar',
        cursorBlink: 'Blinking cursor',
        scrollback: 'Scrollback lines',
        scrollbackHelp: 'Controls both xterm retention and tmux history requested after reconnect, up to 20,000 lines.',
        behavior: 'Behavior & safety',
        sizingPolicy: 'Window sizing policy',
        sizingPrimary: 'Primary (this page sizes the window)',
        sizingAuto: 'Auto (take over only when no other sizing client exists)',
        sizingMirror: 'Mirror only (never resize tmux windows)',
        sizingHelp: 'Shared by the host. Primary makes the page you last used the window’s sizing client, even while a terminal or iTerm2 -CC is attached; that client sees the window at this size until you detach.',
        confirmKill: 'Require confirmation before closing a pane',
        compactSplit: 'Enable compact splits: ⌥⌘D side-by-side, ⌥⇧⌘D top/bottom',
        compactSplitHelp: 'Stored only in this browser. Some macOS setups reserve ⌥⌘D for Show/Hide Dock; a system-intercepted chord cannot be overridden by the page.',
        reset: 'Reset local settings',
        resetHelp: 'Restores terminal settings for this browser; keeps the selected session.',
        settingsUnavailable: 'Host settings are read-only on this connection.',
        viewers: 'Other sizing clients',
        manage: 'Sessions & clients',
        manageHelp: 'Manage sessions on this tmux server. Attaching or detaching affects this browser tab only.',
        sessions: 'Sessions',
        clients: 'Attached clients',
        clientHelp: 'These are native tmux clients, not browser tabs. Detaching leaves sessions and their processes running.',
        createSession: 'Create session',
        sessionName: 'Session name',
        sessionNameHelp: 'Up to 200 characters; no dots, colons, semicolons, or control characters.',
        startDirectory: 'Starting directory (optional)',
        directoryHelp: 'An existing absolute path on the host. Leave blank for the host default directory and shell.',
        attachCreated: 'Attach after creating',
        rename: 'Rename',
        newSessionName: 'New session name',
        save: 'Save',
        cancel: 'Cancel',
        done: 'Done',
        refresh: 'Refresh',
        loading: 'Loading…',
        working: 'Working…',
        filterClients: 'Filter clients by session',
        allSessions: 'All sessions',
        selectAll: 'Select all',
        clearSelection: 'Clear selection',
        detachSelected: 'Detach selected',
        detachConfirm: 'Detach these clients? Their sessions and processes will keep running.',
        noClients: 'No matching attached clients.',
        ownClient: 'This browser tab',
        ownClientHelp: 'Use the terminal’s Detach button to disconnect this tab.',
        controlClient: 'Control mode',
        terminalClient: 'Terminal',
        windows: 'windows',
        created: 'Session created.',
        renamed: 'Session renamed.',
        clientsDetached: 'Selected clients detached.',
        disconnected: 'Not connected to the tmux host. Wait for reconnection, then refresh.',
        requestTimeout: 'Request timed out; the outcome is unknown. Refresh before retrying.',
        requestInterrupted: 'Connection closed; the outcome is unknown. Reconnect and refresh.',
        connectedAt: 'Connected',
        selectClient: 'Select client',
        selectSession: 'Select session…',
        noSessionsHelp: 'Create one here, or start tmux on the host and this page will list it.',
        notAttachedHelp: 'Attaching opens the session in this browser tab only; window and pane state stay native and shared.',
        reconnecting: 'Reconnecting…',
        reconnectingHelp: 'The websocket to the host is down. The page retries automatically.',
        modePrimary: 'Primary',
        modeAuto: 'Auto',
        modeMirror: 'Mirror',
        modePrimaryHelp: 'This page sizes the tmux window to fit itself at your font size. Other clients follow.',
        modeMirrorHelp: 'Mirror only: the page never resizes tmux. It shows the exact remote grid, shrinking the font to fit the height; a wider grid scrolls sideways.',
        modeMirrorOtherHelp: 'Another page you used more recently sizes this window (or, under Auto, another client does). Type or resize here to take over.',
        settings: 'Settings',
        sizing: 'Sizing',
        sizeMode: 'Mode',
        modeAutoShort: 'this page sizes the window',
        modeMirrorShort: 'another client sizes the window',
        settingsLoadFailed: 'Could not load host settings.',
        settingsSaveFailed: 'Could not save host settings.',
        touchSize: 'Touch text size',
        touchSizeHelp: 'Smallest readable size on phones and tablets. A remote grid wider than the page scrolls sideways instead of shrinking below it.',
        pane: 'pane',
        prefixKeys: 'tmux prefix',
    }
    const t = (k) => copy[k] || k
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
    /** "2 windows · 1 client" for session lists. */
    function sessionSummary(session) {
      const windows = plural(session.windows, 'window', 'windows')
      return session.attached ? `${windows} · ${plural(session.attached, 'client', 'clients')}` : windows
    }
    /**
     * Active touch-scroll gestures hold repaints. A snapshot repaint mid-drag
     * re-fits fonts and re-places the shell under the finger — the "jiggle".
     * The guard auto-expires so a lost touchend can never wedge painting.
     */
    const gestureGuard = {
      owners: new Set(),
      since: 0,
      pending: false,
      onEnd: null,
      timer: 0,
      renew() {
        this.since = Date.now()
        clearTimeout(this.timer)
        this.timer = setTimeout(() => {
          this.owners.clear()
          this.pending = false
          if (this.onEnd) this.onEnd()
        }, 1500)
      },
      begin(owner) { this.owners.add(owner); this.renew() },
      touch(owner) { this.owners.add(owner); this.renew() },
      end(owner) {
        this.owners.delete(owner)
        if (this.owners.size === 0) clearTimeout(this.timer)
        if (this.owners.size === 0 && this.pending) {
          this.pending = false
          if (this.onEnd) this.onEnd()
        }
      },
      holding() {
        if (this.owners.size === 0) return false
        if (Date.now() - this.since > 1500) { this.owners.clear(); return false }
        return true
      },
    }
    const defaultPrefs = {
      session: '',
      fontFamily: '',
      fontSize: 12,
      mobileFontFloor: 12,
      cursorStyle: 'block',
      cursorBlink: true,
      scrollbackLines: 2000,
      confirmKill: true,
      compactSplitShortcuts: false,
    }
    /** Prefer fonts actually installed on the viewing machine; CSS falls through. */
    const DEFAULT_TERM_FONT = '"Berkeley Mono Nerd Font Mono", "Berkeley Mono", "JetBrainsMono Nerd Font Mono", "FiraCode Nerd Font Mono", "Hack Nerd Font Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
    function sanitizeFontFamily(value) {
      if (typeof value !== 'string') return ''
      const s = value.trim()
      if (!s || s.length > 300 || /[{}<>;\n\r]/.test(s)) return ''
      return s
    }
    function termFontFamily(prefs) {
      return sanitizeFontFamily(prefs && prefs.fontFamily) || DEFAULT_TERM_FONT
    }
    function normalizeLocalPrefs(value) {
      const source = value && typeof value === 'object' ? value : {}
      const rawFontSize = Number(source.fontSize)
      const rawFloor = Number(source.mobileFontFloor)
      const rawScrollback = Number(source.scrollbackLines)
      return {
        session: typeof source.session === 'string' ? source.session.slice(0, 200) : '',
        fontFamily: sanitizeFontFamily(source.fontFamily),
        fontSize: Number.isFinite(rawFontSize)
          ? Math.max(8, Math.min(32, Math.round(rawFontSize * 4) / 4))
          : defaultPrefs.fontSize,
        mobileFontFloor: Number.isFinite(rawFloor)
          ? Math.max(6, Math.min(24, Math.round(rawFloor)))
          : defaultPrefs.mobileFontFloor,
        cursorStyle: ['block', 'underline', 'bar'].includes(source.cursorStyle) ? source.cursorStyle : defaultPrefs.cursorStyle,
        cursorBlink: source.cursorBlink === undefined ? defaultPrefs.cursorBlink : source.cursorBlink === true,
        scrollbackLines: Number.isFinite(rawScrollback)
          ? Math.max(0, Math.min(MAX_SCROLLBACK_LINES, Math.floor(rawScrollback)))
          : defaultPrefs.scrollbackLines,
        confirmKill: source.confirmKill === undefined ? defaultPrefs.confirmKill : source.confirmKill === true,
        compactSplitShortcuts: source.compactSplitShortcuts === true,
      }
    }
    function confirmPaneClose(enabled) {
      return !enabled || window.confirm(t('killConfirm'))
    }
    function loadPrefs() {
      let appearance = {}
      let session = new URL(location.href).searchParams.get('session')
      try { appearance = JSON.parse(localStorage.getItem(STORE_KEY) || '{}').prefs || {} } catch { /* ignore */ }
      if (session === null) {
        try { session = sessionStorage.getItem(SESSION_KEY) || '' } catch { session = '' }
      }
      return normalizeLocalPrefs({ ...appearance, session })
    }
    function savePrefs(prefs) {
      const { session, ...appearance } = prefs
      try { localStorage.setItem(STORE_KEY, JSON.stringify({ version: PREFS_VERSION, prefs: appearance })) } catch { /* ignore */ }
      try { sessionStorage.setItem(SESSION_KEY, session) } catch { /* ignore */ }
      // Keep an explicit session link consistent after switching sessions.
      const url = new URL(location.href)
      if (url.searchParams.has('session') && url.searchParams.get('session') !== session) {
        if (session) url.searchParams.set('session', session)
        else url.searchParams.delete('session')
        history.replaceState(null, '', url)
      }
    }

    function createStore() {
      let prefs = loadPrefs()
      let snapshot = null
      let error = ''
      let notice = ''
      let reseedTimer = 0
      const reseedPending = new Set()
      /**
       * Bytes rendered but not yet reported to the host. The host slows its
       * tmux drain while a page is behind, so acks must reflect real
       * rendering (xterm write callbacks), batched to a few per second.
       */
      let ackBytes = 0
      let ackTimer = 0
      const flushAck = () => {
        ackTimer = 0
        if (!ackBytes || !ws || ws.readyState !== 1) return
        ws.send(JSON.stringify({ type: 'ack', bytes: ackBytes }))
        ackBytes = 0
      }
      const ack = (bytes) => {
        ackBytes += bytes
        if (ackBytes >= 32000) { clearTimeout(ackTimer); flushAck() }
        else if (!ackTimer) ackTimer = window.setTimeout(flushAck, 100)
      }
      /** Write into a pane and ack once rendered; a disposed pane releases what it still owed. */
      const writeTracked = (rec, data, seed) => {
        const bytes = data.length
        rec.pendingAck = (rec.pendingAck || 0) + bytes
        const done = () => { rec.pendingAck -= bytes; ack(bytes) }
        try {
          if (seed) writeSeed(rec.term, data, done)
          else rec.term.write(data, done)
        } catch { done() }
      }
      let noticeTimer = 0
      let ws = null
      let lastAttachSent = 0
      let lastGridSent = null
      let resizeTimer = 0
      let resizeActive = null
      let reconnectTimer = 0
      let disposed = false
      let manualDetach = false
      const listeners = new Set()
      // pane id -> { wrap, label, termHost, term, seeded, fitRaf }
      const panes = new Map()
      const seeds = new Map()   // pane id -> authoritative capture (reset + write)
      const deltas = new Map()  // pane id -> live output buffered while unmounted
      const emit = () => { for (const fn of listeners) fn() }
      const send = (msg) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)) }
      let requestSequence = 0
      const requests = new Map()
      const failRequests = () => {
        for (const pending of requests.values()) {
          window.clearTimeout(pending.timer)
          pending.reject(new Error(t('requestInterrupted')))
        }
        requests.clear()
      }
      /**
       * Sticky modifiers for the touch key bar: 0 off, 1 armed for the next
       * key, 2 locked. Applied to bar keys and to characters typed on the
       * on-screen keyboard alike, in the only place both meet: outbound input.
       */
      const keyModifiers = { ctrl: 0, alt: 0 }
      const releaseModifiers = () => {
        let changed = false
        for (const name of ['ctrl', 'alt']) if (keyModifiers[name] === 1) { keyModifiers[name] = 0; changed = true }
        if (changed) emit()
      }
      const api = {
        panes,
        get: () => ({ prefs, snapshot, error, notice, connected: !!(ws && ws.readyState === 1) }),
        closeManager: null,
        closeSettings: null,
        /** Re-run the paint without changing state (layout inputs changed). */
        repaint: emit,
        keyModifiers,
        /** off → armed (next key) → locked → off. */
        cycleKeyModifier(name) {
          keyModifiers[name] = (keyModifiers[name] + 1) % 3
          emit()
        },
        /**
         * Apply armed modifiers to one typed character. Anything longer (a
         * paste, a key sequence xterm already encoded) passes through.
         */
        applyKeyModifiers(data) {
          if (!keyModifiers.ctrl && !keyModifiers.alt) return data
          if ([...data].length !== 1) return data
          let out = data
          if (keyModifiers.ctrl) {
            const code = data.toUpperCase().charCodeAt(0)
            if (code >= 0x40 && code <= 0x5f) out = String.fromCharCode(code & 0x1f)
            else if (data === ' ') out = '\x00'
            else if (data === '?') out = '\x7f'
          }
          if (keyModifiers.alt) out = `\x1b${out}`
          releaseModifiers()
          return out
        },
        /** Send a key from the bar to the active pane, honouring modifiers and DECCKM. */
        sendKey(key) {
          const pane = activePaneId(api)
          if (!pane) return
          const rec = panes.get(pane)
          const mods = keyModifiers.ctrl || keyModifiers.alt
            ? 1 + (keyModifiers.alt ? 2 : 0) + (keyModifiers.ctrl ? 4 : 0)
            : 0
          let data
          if (key.text !== undefined) data = api.applyKeyModifiers(key.text)
          else if (key.csi !== undefined) {
            let app = false
            try { app = !!(rec && rec.term && rec.term.modes.applicationCursorKeysMode) } catch { /* disposed */ }
            data = mods ? `\x1b[1;${mods}${key.csi}` : `\x1b${app ? 'O' : '['}${key.csi}`
          } else if (key.tilde !== undefined) {
            data = mods ? `\x1b[${key.tilde};${mods}~` : `\x1b[${key.tilde}~`
          } else return
          if (key.text === undefined) releaseModifiers()
          send({ type: 'input', pane, data, user: true })
        },
        /** Correlate management replies; never replay mutations on reconnect. */
        managementRequest(type, fields = {}) {
          if (disposed || !ws || ws.readyState !== 1) return Promise.reject(new Error(t('disconnected')))
          const requestId = `manage-${++requestSequence}`
          return new Promise((resolve, reject) => {
            const timer = window.setTimeout(() => {
              requests.delete(requestId)
              reject(new Error(t('requestTimeout')))
            }, 30000)
            requests.set(requestId, { resolve, reject, timer })
            try { send({ ...fields, type, requestId }) }
            catch (err) {
              window.clearTimeout(timer)
              requests.delete(requestId)
              reject(err)
            }
          })
        },
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
        /** Transient browser-local status line (diagnostics); auto-clears. */
        notify(text) {
          notice = String(text || '')
          window.clearTimeout(noticeTimer)
          if (notice) noticeTimer = window.setTimeout(() => { notice = ''; emit() }, 9000)
          emit()
        },
        connect() {
          if (disposed || (ws && (ws.readyState === 0 || ws.readyState === 1))) return
          const url = new URL('./tmux-cc/ws', location.href)
          url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
          try { ws = new WebSocket(url) }
          catch (err) { error = String(err); emit(); return }
          ws.onopen = () => {
            resizeActive = null
            lastGridSent = null
            // A fresh host connection starts its accounting from zero.
            clearTimeout(ackTimer)
            ackTimer = 0
            ackBytes = 0
            send({ type: 'hello' })
            // Re-seed terminals after a reconnect: the visible screen first,
            // history only for panes that had asked for it.
            send({ type: 'capture', lines: 0 })
            for (const [paneId, rec] of panes) {
              if (rec.depth > 0) send({ type: 'capture', pane: paneId, lines: rec.depth })
            }
            emit()
          }
          ws.onmessage = (ev) => {
            let msg
            try { msg = JSON.parse(String(ev.data)) } catch { return }
            if (msg.type === 'management' || (msg.type === 'error' && msg.requestId)) {
              const pending = requests.get(msg.requestId)
              if (!pending) return // timed out, unrelated, or duplicate reply
              requests.delete(msg.requestId)
              window.clearTimeout(pending.timer)
              if (msg.type === 'error') pending.reject(new Error(msg.message))
              else {
                if (snapshot) snapshot = { ...snapshot, sessions: msg.sessions }
                pending.resolve(msg)
                emit()
              }
              return
            }
            if (msg.type === 'snapshot') {
              snapshot = msg.snapshot
              error = msg.snapshot.error || ''
              if (msg.snapshot.attached) lastAttachSent = 0
            } else if (msg.type === 'history') {
              const rec = panes.get(msg.pane)
              const bytes = msg.data.length
              if (rec && rec.term) {
                writeTracked(rec, msg.data, true)
                rec.seeded = true
                seeds.delete(msg.pane)
                // Captured before the grid changed underneath it: go again.
                if (rec.gridKey && rec.captureGridKey !== rec.gridKey) api.reseedPane(msg.pane)
              } else {
                seeds.set(msg.pane, String(msg.data || '').slice(-BUFFER_CAP))
                ack(bytes)
              }
              deltas.delete(msg.pane)
              return
            } else if (msg.type === 'output') {
              const rec = panes.get(msg.pane)
              const bytes = msg.data.length
              if (rec && rec.term) {
                writeTracked(rec, msg.data, false)
              } else {
                deltas.set(msg.pane, ((deltas.get(msg.pane) || '') + msg.data).slice(-BUFFER_CAP))
                ack(bytes)
              }
              return
            } else if (msg.type === 'error') error = msg.message
            emit()
            // Do not wait for the poll: the first snapshot names the sessions.
            if (msg.type === 'snapshot') api.maybeAutoAttach()
          }
          ws.onerror = () => { error = 'websocket error'; emit() }
          ws.onclose = () => {
            ws = null
            failRequests()
            emit()
            if (!disposed) reconnectTimer = window.setTimeout(() => api.connect(), 1500)
          }
        },
        send,
        attach(session) {
          if (!session) return
          manualDetach = false
          lastAttachSent = Date.now()
          send({ type: 'attach', session })
        },
        /** User-initiated detach: suppress auto-attach until an explicit attach. */
        detach() {
          manualDetach = true
          send({ type: 'detach' })
        },
        /** Attach the preferred session when it is known to exist; retry gently. */
        maybeAutoAttach() {
          if (!snapshot || snapshot.attached) return
          if (manualDetach) return
          const target = prefs.session
          if (!target) return
          const known = (snapshot.sessions || []).some((s) => s.name === target)
            || (snapshot.layouts || []).some((l) => l.session === target || l.id === target)
          if (!known) return
          if (Date.now() - lastAttachSent < 5000) return
          api.attach(target)
        },
        /**
         * Tell the host what grid the terminal could hold at the native font.
         * Queue identity is recorded immediately and one-cell jitter is ignored,
         * so repeated paints cannot perpetually restart a flapping debounce.
         */
        queueResize(cols, rows) {
          if (disposed || document.body.dataset.tmuxDragging) return
          const next = { cols: Math.floor(cols), rows: Math.floor(rows) }
          if (lastGridSent && Math.abs(next.cols - lastGridSent.cols) <= 1 && Math.abs(next.rows - lastGridSent.rows) <= 1) return
          // The first report after (re)attaching goes out at once: it decides
          // the window's size, and every pane is re-seeded once it lands.
          const first = lastGridSent === null
          lastGridSent = next
          clearTimeout(resizeTimer)
          resizeTimer = window.setTimeout(() => {
            resizeTimer = 0
            if (document.hidden || document.body.dataset.tmuxDragging) { lastGridSent = null; return }
            resizeActive = true
            send({ type: 'resize', cols: next.cols, rows: next.rows })
          }, first ? 0 : 600)
        },
        /** Release this browser's old takeover vote (detached/hidden). */
        clearResize() {
          clearTimeout(resizeTimer)
          resizeTimer = 0
          lastGridSent = null
          if (resizeActive !== false) send({ type: 'resize', active: false })
          resizeActive = false
        },
        /** Browser presentation preferences never cross the websocket. */
        setLocal(patch) {
          prefs = normalizeLocalPrefs({ ...prefs, ...patch })
          savePrefs(prefs)
          emit()
        },
        setPrefs(patch) { api.setLocal(patch) },
        resetPrefs() {
          const keep = { session: prefs.session }
          prefs = normalizeLocalPrefs({ ...defaultPrefs, ...keep })
          savePrefs(prefs)
          emit()
        },
        requestKill(id, pane) {
          // Resolve the target BEFORE asking: a remote viewer can change the
          // active pane while a confirmation is open. Never kill that new pane.
          const target = pane || activePaneId(api)
          if (!target || !confirmPaneClose(prefs.confirmKill)) return
          send({ type: 'kill', pane: target })
        },
        /** Seed a freshly-mounted terminal from buffers, or ask the host to capture. */
        seedPane(id) {
          const rec = panes.get(id)
          if (!rec || !rec.term) return
          const seed = seeds.get(id)
          const delta = deltas.get(id)
          seeds.delete(id)
          deltas.delete(id)
          if (seed) {
            writeSeed(rec.term, seed + (delta || ''))
            rec.seeded = true
            return
          }
          try {
            if (delta) rec.term.write(delta)
          } catch { /* disposed */ }
          if (!rec.seeded) {
            rec.captureGridKey = rec.gridKey
            // The screen alone paints in a few KB; history loads on the first scroll up.
            rec.depth = 0
            send({ type: 'capture', pane: id, lines: 0 })
          }
        },
        /**
         * xterm reflows its own buffer when a pane's grid changes; tmux
         * reflows the real one independently and TUIs repaint on their own
         * schedule. Once the layout settles, re-seed the panes that changed
         * so the page shows exactly what tmux holds.
         */
        reseedPane(id) {
          reseedPending.add(id)
          clearTimeout(reseedTimer)
          reseedTimer = window.setTimeout(() => {
            reseedTimer = 0
            if (document.body.dataset.tmuxDragging) { reseedTimer = window.setTimeout(() => api.reseedPane(id), 300); return }
            const ids = [...reseedPending].filter((paneId) => panes.get(paneId)?.term)
            reseedPending.clear()
            for (const paneId of ids) {
              const target = panes.get(paneId)
              target.captureGridKey = target.gridKey
              send({ type: 'capture', pane: paneId, lines: target.depth || 0 })
            }
          }, 350)
        },
        /**
         * Deep history is fetched the first time the reader tries to scroll
         * above what the pane has, at the configured depth. Attach stays
         * fast on slow links and panes nobody scrolls never transfer it.
         */
        ensureHistory(id) {
          const rec = panes.get(id)
          if (!rec || !rec.term || (rec.depth || 0) >= prefs.scrollbackLines) return
          try {
            // Only the normal buffer has history; a scroll inside a TUI is its own.
            if (rec.term.buffer.active.type !== 'normal') return
          } catch { return }
          rec.depth = prefs.scrollbackLines
          rec.captureGridKey = rec.gridKey
          send({ type: 'capture', pane: id, lines: prefs.scrollbackLines })
        },
        /** Changing the depth re-fetches only panes that already loaded history. */
        refreshHistoryDepth() {
          for (const [paneId, rec] of panes) {
            if (!rec.term || !rec.depth) continue
            rec.depth = prefs.scrollbackLines
            send({ type: 'capture', pane: paneId, lines: prefs.scrollbackLines })
          }
        },
        disposePane(id) {
          const rec = panes.get(id)
          if (!rec) return
          if (rec.disposeTouch) rec.disposeTouch()
          if (rec.disposeTitle) rec.disposeTitle()
          try { if (rec.term) rec.term.dispose() } catch { /* ignore */ }
          rec.term = null // halts any in-flight momentum fling
          // Callbacks of writes still queued in xterm never fire now.
          if (rec.pendingAck > 0) { ack(rec.pendingAck); rec.pendingAck = 0 }
          try { rec.wrap.remove() } catch { /* ignore */ }
          panes.delete(id)
        },
        disposeAllPanes() {
          for (const id of [...panes.keys()]) api.disposePane(id)
        },
        dispose() {
          if (disposed) return
          api.clearResize()
          disposed = true
          if (api.closeManager) api.closeManager()
          if (api.closeSettings) api.closeSettings()
          failRequests()
          window.clearTimeout(reconnectTimer)
          window.clearTimeout(reseedTimer)
          reconnectTimer = 0
          api.disposeAllPanes()
          if (ws) {
            ws.onclose = null
            try { ws.close(1000, 'page unload') } catch { /* already closed */ }
            ws = null
          }
          listeners.clear()
        },
      }
      return api
    }

    function el(tag, attrs, ...kids) {
      const node = document.createElement(tag)
      for (const [key, value] of Object.entries(attrs || {})) {
        if (key === 'style' && value && typeof value === 'object') Object.assign(node.style, value)
        else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value)
        else if (value === false || value == null) continue
        else if (key === 'text') node.textContent = value
        else node.setAttribute(key, value === true ? '' : String(value))
      }
      for (const kid of kids.flat()) {
        if (kid == null || kid === false) continue
        node.append(typeof kid === 'string' ? document.createTextNode(kid) : kid)
      }
      return node
    }

    function icon(path) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('width', '16')
      svg.setAttribute('height', '16')
      svg.setAttribute('viewBox', '0 0 24 24')
      svg.setAttribute('fill', 'none')
      svg.setAttribute('stroke', 'currentColor')
      svg.setAttribute('stroke-width', '2')
      svg.setAttribute('stroke-linecap', 'round')
      svg.setAttribute('stroke-linejoin', 'round')
      svg.innerHTML = path
      return svg
    }

    function isTouchViewport() {
      return window.innerWidth < 768 || window.matchMedia('(any-pointer: coarse)').matches
    }

    /**
     * The exact box the user can currently see: the visual viewport. On mobile
     * the on-screen keyboard and collapsing URL bar shrink it, and iOS pans it
     * across the (unchanged) layout viewport while the keyboard is open.
     */
    function mobileViewportBox() {
      const vv = window.visualViewport
      if (!vv) return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }
      return {
        x: Math.max(0, vv.offsetLeft || 0),
        y: Math.max(0, vv.offsetTop || 0),
        width: vv.width || window.innerWidth,
        height: vv.height || window.innerHeight,
      }
    }

    /** Whether the on-screen keyboard target (an xterm textarea) has focus. */
    function terminalFocused() {
      const host = document.getElementById(ROOT_ID)
      const focused = document.activeElement
      return !!(host && focused && host.contains(focused) && focused.closest && focused.closest('.xterm'))
    }

    function placeShell(shell) {
      const vp = mobileViewportBox()
      const scale = window.visualViewport?.scale || 1
      // Pinch zoom magnifies the page; it must not squeeze the terminal
      // into a smaller grid or cancel the user's pan by following offsets.
      vp.width *= scale
      vp.height *= scale
      const zoomed = Math.abs(scale - 1) > 0.01
      if (zoomed) { vp.x = 0; vp.y = 0 }
      shell.dataset.pageZoomed = zoomed ? '1' : '0'
      if (isTouchViewport()) shell.dataset.mobile = '1'
      else delete shell.dataset.mobile
      // Ignore sub-2px URL-bar/scroll rounding, but follow real keyboard and
      // orientation changes immediately, independently of gesture repaints.
      const width = Math.round(vp.width)
      const height = Math.round(vp.height)
      const prevW = Number(shell.dataset.vpWidth)
      const prevH = Number(shell.dataset.vpHeight)
      const sizeSame = Number.isFinite(prevW) && Math.abs(prevW - width) < 2
        && Number.isFinite(prevH) && Math.abs(prevH - height) < 2
      if (!sizeSame) {
        shell.dataset.vpWidth = String(width)
        shell.dataset.vpHeight = String(height)
        Object.assign(shell.style, {
          top: '0', left: '0', right: 'auto', bottom: 'auto',
          width: `${width}px`, height: `${height}px`,
        })
      }
      // Follow keyboard reveal offsets without triggering another grid fit.
      const tx = Math.round(vp.x)
      const ty = Math.round(vp.y)
      const transform = tx || ty ? `translate(${tx}px, ${ty}px)` : ''
      if (shell.style.transform !== transform) shell.style.transform = transform
    }

    let xtermReady = null
    function loadXterm() {
      if (window.Terminal) return Promise.resolve()
      if (xtermReady) return xtermReady
      xtermReady = new Promise((resolve, reject) => {
        const css = document.createElement('link')
        css.rel = 'stylesheet'
        css.href = './vendor/xterm.css'
        document.head.appendChild(css)
        const s1 = document.createElement('script')
        s1.src = './vendor/xterm.js'
        s1.onload = () => resolve()
        s1.onerror = () => reject(new Error('failed to load xterm'))
        document.head.appendChild(s1)
      })
      return xtermReady
    }

    function neighbor(panes, pane, axis) {
      const gap = 2
      if (axis === 'x') {
        return panes.find((other) => other.id !== pane.id
          && Math.abs(other.left - (pane.left + pane.width)) <= gap
          && other.top < pane.top + pane.height
          && other.top + other.height > pane.top)
      }
      return panes.find((other) => other.id !== pane.id
        && Math.abs(other.top - (pane.top + pane.height)) <= gap
        && other.left < pane.left + pane.width
        && other.left + other.width > pane.left)
    }

    const cellCache = new Map()
    /** Font keys whose canvas metrics were already checked against a live xterm. */
    const reconciledCells = new Set()
    const cellKey = (family, size) => `${family}\0${size}\0${window.devicePixelRatio || 1}`
    function resetCellCache() {
      cellCache.clear()
      reconciledCells.clear()
    }

    /**
     * xterm's rendered cell is the truth. Canvas metrics normally match it to
     * the pixel, but a font that finishes loading between the two
     * measurements, or a platform whose canvas and DOM text differ, would
     * leave boxes sized for one cell and glyphs drawn at another. Once per
     * font, compare against a mounted terminal and adopt its numbers.
     */
    function reconcileCell(store, layout, panes) {
      const key = cellKey(layout.family, layout.font)
      if (reconciledCells.has(key)) return
      for (const pane of panes) {
        const rec = store.panes.get(pane.id)
        const term = rec && rec.term
        const screen = term && rec.termHost.querySelector('.xterm-screen')
        if (!screen || !screen.offsetWidth || !screen.offsetHeight || !term.cols || !term.rows) continue
        if (term.options.fontSize !== layout.font) continue
        reconciledCells.add(key)
        const actual = { w: screen.offsetWidth / term.cols, h: screen.offsetHeight / term.rows }
        if (Math.abs(actual.w - layout.cellW) * term.cols > 1 || Math.abs(actual.h - layout.cellH) * term.rows > 1) {
          cellCache.set(key, actual)
          store.repaint()
        }
        return
      }
    }
    /** Character cell size of a font, computed exactly as xterm's DOM renderer does. */
    function measureCell(body, fontFamily, fontSize) {
      const family = fontFamily || DEFAULT_TERM_FONT
      const size = Number(fontSize) || defaultPrefs.fontSize
      const dpr = window.devicePixelRatio || 1
      const cacheKey = cellKey(family, size)
      const cached = cellCache.get(cacheKey)
      if (cached) return cached
      let cell = null
      const context = document.createElement('canvas').getContext('2d')
      if (context) {
        context.font = `${size}px ${family}`
        const metrics = context.measureText('W')
        const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
        if (metrics.width > 0 && height > 0) cell = { w: metrics.width, h: Math.ceil(height * dpr) / dpr }
      }
      if (!cell) {
        const probe = el('div', {
          style: {
            position: 'absolute', visibility: 'hidden', whiteSpace: 'pre',
            fontFamily: family,
            fontSize: `${size}px`,
            lineHeight: 'normal',
          },
          text: 'W'.repeat(40),
        })
        body.append(probe)
        const r = probe.getBoundingClientRect()
        probe.remove()
        cell = r.width > 0 && r.height > 0 ? { w: r.width / 40, h: r.height } : { w: 7.2 * size / 12, h: 14.5 * size / 12 }
      }
      if (cellCache.size > 64) resetCellCache()
      cellCache.set(cacheKey, cell)
      return cell
    }

    /**
     * Report the grid the page can hold at the native font so the host can
     * size the window when alone. Pane titles live in tmux's own separator
     * rows, so the window's row count is independent of the pane layout;
     * only the topmost title row is extra.
     */
    function reportGrid(store, body) {
      if (document.hidden) {
        store.clearResize()
        return
      }
      // Keep the current sizing vote while a divider owns the geometry.
      if (document.body.dataset.tmuxDragging) return
      const rect = body.getBoundingClientRect()
      if (rect.width < 60 || rect.height < 40) {
        store.clearResize()
        return
      }
      // The on-screen keyboard never resizes the tmux window: it would
      // reflow every viewer twice per message. While a terminal is focused
      // on a touch screen, report the grid the page holds without it; the
      // canvas scrolls to keep the active pane above the keyboard instead.
      const shell = body.closest('[data-tmux-cc-shell]')
      const focused = terminalFocused()
      let height = rect.height
      if (shell) {
        const full = shell.dataset.mobile === '1' && focused && shell.dataset.fullBody ? JSON.parse(shell.dataset.fullBody) : null
        if (full && full.w === Math.round(rect.width)) height = full.h
        if (!focused) shell.dataset.fullBody = JSON.stringify({ w: Math.round(rect.width), h: rect.height })
      }
      const prefs = store.get().prefs
      const fontSize = isTouchViewport() ? prefs.mobileFontFloor : prefs.fontSize
      const cell = measureCell(body, termFontFamily(prefs), fontSize)
      const cols = Math.max(20, Math.floor(rect.width / cell.w))
      const rows = Math.max(6, Math.floor(height / cell.h) - 1)
      store.queueResize(cols, rows)
    }

    /**
     * Scroll the canvas so the active pane's bottom rows — where the prompt
     * and TUI input live — sit just above the on-screen keyboard.
     */
    function revealActivePane(store, body) {
      const id = activePaneId(store)
      const rec = id && store.panes.get(id)
      if (!rec) return
      const top = rec.wrap.offsetTop
      const bottom = top + rec.wrap.offsetHeight
      const left = rec.wrap.offsetLeft
      if (bottom > body.scrollTop + body.clientHeight || top < body.scrollTop) {
        body.scrollTop = Math.max(0, bottom - body.clientHeight)
      }
      if (left < body.scrollLeft || left + rec.wrap.offsetWidth > body.scrollLeft + body.clientWidth) {
        body.scrollLeft = Math.max(0, Math.min(left, left + rec.wrap.offsetWidth - body.clientWidth))
      }
    }

    /** One monotone fit step for the vertical axis, quantized down to quarter points. */
    function fittedFontSize(current, gridHeight, hostHeight, preferred, minimum) {
      const target = current * (hostHeight / gridHeight)
      return Math.max(minimum, Math.min(preferred, Math.floor((target + 1e-6) * 4) / 4))
    }

    /**
     * One cell size for the whole window. Every pane renders the true tmux
     * grid at the same font, and its title occupies the separator row above
     * it (row 0 is the extra top row), so pane boxes are exact cell multiples:
     * no pane-local fitting, no dead space inside panes, no drift between
     * uneven splits.
     *
     * The grid is a canvas the body scrolls, never a box panes squeeze into.
     * While this page sizes the window (takeover) the grid fits by
     * construction. Mirroring someone else's window shrinks one font until
     * the rows fit the page height (bounded on touch by the readable floor);
     * the width is never shrunk to fit — a wider remote grid scrolls sideways.
     */
    function windowLayout(store, body, cols, rows) {
      const { prefs, snapshot } = store.get()
      const height = body.clientHeight
      const touch = isTouchViewport()
      const family = termFontFamily(prefs)
      const preferred = touch ? prefs.mobileFontFloor || MOBILE_MIN_FONT : prefs.fontSize
      const minimum = touch ? preferred : MIN_FONT
      let font = preferred
      if (snapshot?.sizeMode !== 'takeover' && height > 0) {
        const native = measureCell(body, family, preferred)
        font = fittedFontSize(preferred, native.h * (rows + 1), height, preferred, minimum)
        // A fractional step can still round up to the same xterm row height;
        // verify real metrics rather than trusting the linear estimate.
        while (font > minimum) {
          if (Math.round(measureCell(body, family, font).h * (rows + 1)) <= height) break
          font = Math.max(minimum, font - 0.25)
        }
      }
      const cell = measureCell(body, family, font)
      return {
        cols, rows, font, family, cellW: cell.w, cellH: cell.h,
        width: cols * cell.w,
        height: (rows + 1) * cell.h,
        key: `${cols}x${rows}:${font}:${family}:${window.devicePixelRatio || 1}`,
      }
    }

    /** Apply the shared layout font and the pane's true grid to one terminal. */
    function fitPane(rec, pane, layout) {
      const term = rec.term
      if (!term) return
      // xterm cannot go below 2×1; a pane tmux squeezed to one column still
      // gets the closest grid instead of keeping a stale, larger one.
      const cols = Math.max(2, pane.width)
      const rows = Math.max(1, pane.height)
      if (term.cols !== cols || term.rows !== rows) {
        try { term.resize(cols, rows) } catch { /* transient */ }
      }
      if (layout && rec.fitKey !== layout.key) {
        rec.fitKey = layout.key
        try {
          if (term.options.fontSize !== layout.font) term.options.fontSize = layout.font
          if (term.options.fontFamily !== layout.family) term.options.fontFamily = layout.family
          if (term.options.letterSpacing) term.options.letterSpacing = 0
          if (term.options.lineHeight !== 1) term.options.lineHeight = 1
        } catch { /* ignore */ }
      }
    }

    /**
     * A pane's box in layout cells: its title strip in the row above the
     * grid (tmux's separator row, or the extra top row), then its true grid.
     * The one-cell separator to the right stays outside: it is the gutter
     * where the divider (sash) lives.
     */
    function paneBox(pane) {
      return { left: pane.left, top: pane.top, width: pane.width, height: pane.height + 1 }
    }

    /**
     * Push browser-local terminal preferences into existing panes. Font
     * family/size flow through the window layout on the next paint; the
     * repaint is scheduled once the requested font has actually loaded so
     * the grid is measured with the real metrics.
     */
    function applyLiveFont(store) {
      const prefs = store.get().prefs
      const family = termFontFamily(prefs)
      const host = document.getElementById(ROOT_ID)
      const key = [
        family,
        prefs.fontSize,
        prefs.mobileFontFloor,
        prefs.cursorStyle,
        prefs.cursorBlink ? '1' : '0',
        prefs.scrollbackLines,
      ].join('\0')
      if (host && host.dataset.terminalPrefsKey === key) return
      const oldScrollback = host ? host.dataset.scrollbackLines : undefined
      if (host) {
        host.dataset.terminalPrefsKey = key
        host.dataset.scrollbackLines = String(prefs.scrollbackLines)
      }
      const historyChanged = oldScrollback !== undefined && oldScrollback !== String(prefs.scrollbackLines)
      resetCellCache()
      for (const rec of store.panes.values()) {
        if (!rec.term) continue
        rec.fitKey = ''
        try {
          rec.term.options.cursorStyle = prefs.cursorStyle
          rec.term.options.cursorBlink = prefs.cursorBlink
          rec.term.options.scrollback = prefs.scrollbackLines
        } catch { /* disposed */ }
      }
      if (historyChanged) store.refreshHistoryDepth()
      const ready = () => {
        resetCellCache()
        // xterm measured the font when its option changed; if the family only
        // finished loading since, nudge it to measure again with the real face.
        for (const rec of store.panes.values()) {
          const term = rec.term
          if (!term) continue
          try {
            const size = term.options.fontSize
            term.options.fontSize = size + 0.0625
            term.options.fontSize = size
          } catch { /* disposed */ }
        }
        store.repaint()
      }
      if (document.fonts && document.fonts.load) {
        const first = family.split(',')[0].trim()
        Promise.all([
          document.fonts.load(`${prefs.fontSize}px ${first}`),
          document.fonts.load(`bold ${prefs.fontSize}px ${first}`),
        ]).then(ready, ready)
      }
    }

    /** Terminal colors use the app's standalone CSS tokens. */
    function termTheme() {
      const cs = getComputedStyle(document.body)
      return {
        background: cs.getPropertyValue('--dsw-alias-bg-layer-1').trim() || '#fff',
        foreground: cs.getPropertyValue('--dsw-alias-label-primary').trim() || '#0f1115',
        cursor: cs.getPropertyValue('--dsw-alias-label-primary').trim() || '#0f1115',
        selectionBackground: cs.getPropertyValue('--dsw-alias-interactive-bg-hover').trim() || '#00000022',
      }
    }

    /**
     * Reset + write an authoritative capture, preserving how far the reader
     * had scrolled up from the bottom. Re-seeds arrive on reconnects and
     * window switches; unconditionally yanking the viewport to the bottom
     * threw mobile readers out of the scrollback they were looking at.
     */
    function writeSeed(term, data, done) {
      let fromBottom = 0
      try {
        const buf = term.buffer && term.buffer.active
        if (buf) fromBottom = Math.max(0, buf.baseY - buf.viewportY)
      } catch { /* ignore */ }
      try {
        term.reset()
        term.write(data, () => {
          try {
            term.scrollToBottom()
            if (fromBottom > 0) term.scrollLines(-fromBottom)
          } catch { /* disposed */ }
          if (done) done()
        })
      } catch { if (done) done() }
    }

    function focusPane(rec) {
      if (!rec || !rec.term) return
      // preventScroll also prevents overflow:hidden ancestors being scrolled
      // to reveal xterm's caret. The mobile textarea lives outside the crop.
      try {
        if (rec.term.textarea) rec.term.textarea.focus({ preventScroll: true })
        else rec.term.focus()
      } catch { /* disposed */ }
    }

    function bindPaneTitle(title, rec, pane, store) {
      let cancel = null
      let lastTap = 0
      const down = (event) => {
        if (event.button !== 0 || event.isPrimary === false || event.target.closest('button')) return
        title._tmuxPointerType = event.pointerType
        event.preventDefault()
        event.stopPropagation()
        if (cancel) cancel()
        const x = event.clientX
        const y = event.clientY
        let dragging = false
        let target = null
        const clearTarget = () => {
          if (target) target.removeAttribute('data-drop-target')
          target = null
        }
        const move = (ev) => {
          if (ev.pointerId !== event.pointerId) return
          if (!dragging && Math.hypot(ev.clientX - x, ev.clientY - y) < 8) return
          ev.preventDefault()
          dragging = true
          lastTap = 0
          title.dataset.dragging = '1'
          clearTarget()
          const hit = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-tmux-cc-pane]')
          if (hit && hit !== rec.wrap && rec.wrap.parentElement?.contains(hit)) {
            target = hit
            target.setAttribute('data-drop-target', '')
          }
        }
        const cleanup = () => {
          clearTarget()
          delete title.dataset.dragging
          window.removeEventListener('pointermove', move, true)
          window.removeEventListener('pointerup', up, true)
          window.removeEventListener('pointercancel', abort, true)
          title.removeEventListener('lostpointercapture', abort)
          window.removeEventListener('blur', cleanup)
          try { title.releasePointerCapture(event.pointerId) } catch { /* gone */ }
          cancel = null
        }
        const up = (ev) => {
          if (ev.pointerId !== event.pointerId) return
          const targetId = target?.dataset.paneId
          cleanup()
          if (dragging) {
            if (targetId) store.send({ type: 'swap', pane: pane.id, target: targetId })
            return
          }
          store.send({ type: 'select', pane: pane.id })
          // A narrow-layout title click must not collapse the toolbar between
          // the two clicks of a zoom gesture. Input remains an explicit action.
          if ((!isTouchViewport() && event.pointerType !== 'touch') || terminalFocused()) focusPane(rec)
          if (event.pointerType === 'touch') {
            if (lastTap && ev.timeStamp - lastTap < 350) {
              lastTap = 0
              store.send({ type: 'zoom', pane: pane.id })
            } else lastTap = ev.timeStamp
          }
        }
        const abort = (ev) => { if (ev.pointerId === event.pointerId) { lastTap = 0; cleanup() } }
        cancel = cleanup
        try { title.setPointerCapture(event.pointerId) } catch { /* unsupported */ }
        window.addEventListener('pointermove', move, { capture: true, passive: false })
        window.addEventListener('pointerup', up, true)
        window.addEventListener('pointercancel', abort, true)
        title.addEventListener('lostpointercapture', abort)
        window.addEventListener('blur', cleanup)
      }
      title.addEventListener('pointerdown', down)
      return () => {
        if (cancel) cancel()
        title.removeEventListener('pointerdown', down)
      }
    }

    /**
     * Mount or update one pane at an exact pixel box. `place` is the pane's
     * box within `host`: `{ left, top, width, height, strip }`, where `strip`
     * is the title strip height (0 hides it; the terminal then owns the box).
     */
    function mountPane(host, pane, store, layout, place) {
      let rec = store.panes.get(pane.id)
      if (!rec) {
        const wrap = el('div', { 'data-tmux-cc-pane': '', 'data-pane-id': pane.id })
        const title = el('div', { 'data-tmux-cc-ptitle': '', title: t('movePane') })
        const label = el('span', { text: pane.title || pane.id })
        const closer = el('button', {
          type: 'button',
          'data-tmux-cc-pclose': '',
          title: t('kill'),
          onPointerdown: (ev) => {
            ev.stopPropagation()
            if (terminalFocused()) ev.preventDefault()
          },
          onClick: (ev) => { ev.stopPropagation(); store.requestKill(`pane:${pane.id}`, pane.id) },
        })
        closer.append(icon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'))
        closer.querySelector('svg')?.setAttribute('width', '10')
        closer.querySelector('svg')?.setAttribute('height', '10')
        title.append(label, closer)
        title.addEventListener('dblclick', (ev) => {
          if (ev.target.closest('button') || title._tmuxPointerType === 'touch' || ev.sourceCapabilities?.firesTouchEvents) return
          ev.preventDefault()
          store.send({ type: 'zoom', pane: pane.id })
        })
        const termHost = el('div', {
          'data-tmux-cc-terminal': '',
          style: {
            position: 'absolute', inset: '0', overflow: 'hidden',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
            // Never let the browser start a native pan on the terminal: on
            // iOS a native scroll that begins before our handler decides
            // cannot be cancelled mid-gesture, and with the keyboard open it
            // pans the visual viewport instead of the scrollback.
            touchAction: 'pinch-zoom',
          },
        })
        /**
         * Touch events are target-locked to the element under the finger at
         * touchstart — a text span inside xterm's rows. The DOM renderer
         * replaces those rows on every render, and a streaming pane renders
         * constantly; the moment the touched span detaches, the rest of the
         * gesture stops propagating through the ancestor chain and EVERY
         * handler goes blind after the first move. This transparent layer
         * above the terminal is never re-rendered, so it receives complete
         * gestures. It is a child of the shell (not the panning termHost) so
         * grid panning cannot carry it away from under the finger.
         */
        const touchLayer = el('div', { 'data-tmux-cc-touch': '' })
        const termShell = el('div', { 'data-tmux-cc-tshell': '' })
        termShell.append(termHost, touchLayer)
        wrap.append(title, termShell)
        wrap.addEventListener('pointerdown', (ev) => {
          if (ev.pointerType === 'touch' || ev.button !== 0 || ev.target.closest('button,[data-tmux-cc-ptitle]')) return
          store.send({ type: 'select', pane: pane.id })
          focusPane(store.panes.get(pane.id))
        })
        // Scrolling up past what the pane holds is the cue to load history.
        wrap.addEventListener('wheel', (ev) => { if (ev.deltaY < 0) store.ensureHistory(pane.id) }, { passive: true, capture: true })
        host.append(wrap)
        rec = {
          wrap, title, label, termHost, touchLayer, term: null, seeded: false, fitKey: '', layout: null, depth: 0,
          ensureHistory: () => store.ensureHistory(pane.id),
          // A tap is intent to type: select the pane and bring up the keyboard
          // (iOS shows it only from inside the touch gesture, which this is).
          // Dragging scrolls and never changes focus.
          onTap: () => {
            store.send({ type: 'select', pane: pane.id })
            focusPane(rec)
          },
        }
        rec.disposeTitle = bindPaneTitle(title, rec, pane, store)
        store.panes.set(pane.id, rec)
        loadXterm().then(() => {
          if (!window.Terminal || rec.term || store.panes.get(pane.id) !== rec) return
          const prefs = store.get().prefs
          const term = new window.Terminal({
            convertEol: true,
            disableStdin: false,
            cursorBlink: prefs.cursorBlink,
            cursorStyle: prefs.cursorStyle,
            scrollback: prefs.scrollbackLines,
            fontFamily: rec.layout ? rec.layout.family : termFontFamily(prefs),
            fontSize: rec.layout ? rec.layout.font : prefs.fontSize,
            theme: termTheme(),
          })
          term.open(termHost)
          rec.term = term
          /**
           * xterm emits two kinds of data: what the user typed, and replies
           * to queries the pane program sent (cursor position, device
           * attributes, colours). tmux answers those queries itself, so a
           * browser's reply is a duplicate that lands in the program's input
           * as garbage — and every viewer would send one. Forward only data
           * that a user gesture on this page produced.
           */
          let userGestureAt = -Infinity
          const markGesture = () => { userGestureAt = performance.now() }
          for (const type of ['keydown', 'beforeinput', 'input', 'compositionstart', 'compositionupdate', 'compositionend', 'paste', 'drop']) {
            termHost.addEventListener(type, markGesture, true)
          }
          term.onData((data) => {
            if (performance.now() - userGestureAt > USER_INPUT_WINDOW_MS) return
            store.send({ type: 'input', pane: pane.id, data: store.applyKeyModifiers(data), user: true })
          })
          rec.disposeTouch = bindTouchScroll(rec)
          const snap = store.get().snapshot
          const live = snap && snap.panes ? snap.panes.find((p) => p.id === pane.id) : null
          fitPane(rec, live || pane, rec.layout)
          store.seedPane(pane.id)
        }).catch(() => {})
      }
      rec.layout = layout
      if (rec.wrap.parentElement !== host) host.append(rec.wrap)
      Object.assign(rec.wrap.style, {
        left: `${place.left}px`, top: `${place.top}px`,
        width: `${place.width}px`, height: `${place.height}px`,
      })
      rec.title.style.height = `${place.strip}px`
      rec.wrap.style.setProperty('--tmux-strip', `${place.strip}px`)
      rec.wrap.dataset.active = pane.active ? '1' : '0'
      rec.label.textContent = pane.title || pane.role || pane.id
      rec.title.title = `${pane.title || pane.id} — ${t('movePane')}`
      const gridKey = `${pane.width}x${pane.height}`
      if (rec.gridKey && rec.gridKey !== gridKey && rec.seeded) store.reseedPane(pane.id)
      rec.gridKey = gridKey
      fitPane(rec, pane, layout)
    }

    /**
     * The single touch-gesture owner for a pane. It exists because xterm's
     * built-in touch handling only scrolls normal-buffer scrollback and goes
     * completely dead the moment the pane program enables mouse reporting —
     * exactly the TUI/agent-CLI panes a cockpit mirrors, whose transcripts
     * scroll *inside* the program while xterm's own scrollback stays empty.
     * Capture-phase listeners with stopPropagation keep xterm's competing
     * touch handlers out entirely, and drags are translated into synthetic
     * wheel events — the one vocabulary xterm already interprets correctly
     * for every pane state:
     *
     * - mouse reporting on  → encoded wheel reports; the program scrolls
     * - alternate buffer    → arrow keys
     * - normal buffer       → xterm viewport scrollback
     *
     * Vertical drags scroll the terminal (history, mouse reports, or arrow
     * keys); once the normal buffer sits at its live screen and the canvas
     * itself overflows the page, the remainder pans the canvas vertically.
     * Horizontal drags pan the canvas: panes never scroll sideways, the body
     * does. Both axes follow the finger and release with momentum.
     * preventDefault fires on the very first touchmove: with the on-screen
     * keyboard open, an unprevented first move lets iOS commit a
     * visual-viewport pan, every later event turns non-cancelable, and the
     * drag dies after a few pixels. Gestures hold the paint guard so a
     * snapshot repaint cannot jiggle the pane mid-drag.
     */
    function bindTouchScroll(rec) {
      const host = rec.termHost
      /** The scrolling canvas: the body that holds the whole tmux grid. */
      const canvas = () => host.closest('[data-tmux-cc-body]')
      let startY = 0
      let startX = 0
      let lastY = 0
      let lastX = 0
      let lastT = 0
      let velocity = 0 // px/ms along the decided axis, positive = towards newer/right
      let axis = ''    // 'y' scrolls the terminal (then the canvas), 'x' pans the canvas
      let tracking = false
      let touchId = null
      let guarded = false
      const gestureOwner = {}
      let acc = 0
      let flingRaf = 0
      const stopFling = () => {
        if (flingRaf) { cancelAnimationFrame(flingRaf); flingRaf = 0 }
      }
      const release = () => {
        if (guarded) { guarded = false; gestureGuard.end(gestureOwner) }
      }
      const rowHeight = () => {
        const screen = host.querySelector('.xterm-screen')
        return screen && rec.term && rec.term.rows > 0
          ? screen.offsetHeight / rec.term.rows
          : 14
      }
      /**
       * Row-quantized synthetic wheel at the last touch point. Dispatched on
       * the .xterm element, where xterm's wheel listeners resolve mouse
       * reports, alt-buffer arrow keys, or viewport scrolling on their own.
       */
      const sendWheel = (lines) => {
        const target = host.querySelector('.xterm')
        if (!target || !rec.term) return false
        if (lines < 0 && rec.ensureHistory) rec.ensureHistory()
        try {
          // Normal buffers have a public row-precise API, independent of
          // mouse-wheel sensitivity and browser wheel-event defaults.
          if (rec.term.buffer?.active.type === 'normal' && rec.term.modes?.mouseTrackingMode === 'none') {
            const before = rec.term.buffer.active.viewportY
            rec.term.scrollLines(lines)
            return rec.term.buffer.active.viewportY !== before
          }
          // xterm emits ONE mouse report per wheel event, irrespective of
          // delta magnitude. Preserve every row rather than dropping fast moves.
          for (let n = 0; n < Math.abs(lines); n++) {
            target.dispatchEvent(new WheelEvent('wheel', {
              bubbles: false, cancelable: true,
              deltaMode: WheelEvent.DOM_DELTA_LINE,
              deltaY: Math.sign(lines),
              clientX: lastX, clientY: lastY,
            }))
          }
        } catch { return false }
        return true
      }
      /** Horizontal budget: the canvas, never the pane. */
      const panX = (dx) => {
        const body = canvas()
        if (!body) return false
        const before = body.scrollLeft
        const next = Math.max(0, Math.min(body.scrollWidth - body.clientWidth, before + dx))
        if (Math.abs(next - before) < 0.5) return false
        body.scrollLeft = next
        return true
      }
      /** Vertical budget: the terminal first; a canvas taller than the page after that. */
      const scrollY = (dy) => {
        if (!rec.term) return false
        acc += dy
        const rowH = Math.max(rowHeight(), 1)
        const lines = Math.trunc(acc / rowH)
        if (lines === 0) return true
        acc -= lines * rowH
        if (sendWheel(lines)) return true
        // The normal buffer is already at its edge: give the rest to the canvas.
        const body = canvas()
        if (!body) { acc = 0; return false }
        const before = body.scrollTop
        const next = Math.max(0, Math.min(body.scrollHeight - body.clientHeight, before + lines * rowH))
        acc = 0
        if (Math.abs(next - before) < 0.5) return false
        body.scrollTop = next
        return true
      }
      const cancelGesture = () => {
        tracking = false
        touchId = null
        axis = ''
        velocity = 0
        acc = 0
        stopFling()
        release()
      }
      const browserZoomed = () => Math.abs((window.visualViewport?.scale || 1) - 1) > 0.01
      const onTouchStart = (ev) => {
        if (browserZoomed()) { cancelGesture(); return }
        ev.stopPropagation()
        cancelGesture()
        if (ev.touches.length !== 1) return
        tracking = true
        touchId = ev.touches[0].identifier
        axis = ''
        acc = 0
        velocity = 0
        startY = lastY = ev.touches[0].clientY
        startX = lastX = ev.touches[0].clientX
        lastT = ev.timeStamp
        if (!guarded) { guarded = true; gestureGuard.begin(gestureOwner) }
      }
      const onTouchMove = (ev) => {
        if (browserZoomed()) { cancelGesture(); return }
        ev.stopPropagation()
        if (!tracking) return
        if (ev.touches.length !== 1 || ev.touches[0].identifier !== touchId || !rec.term) { cancelGesture(); return }
        // Claim the gesture before any slop maths — see the function comment.
        if (ev.cancelable) ev.preventDefault()
        const y = ev.touches[0].clientY
        const x = ev.touches[0].clientX
        if (!axis) {
          const dy = Math.abs(startY - y)
          const dx = Math.abs(startX - x)
          if (dy < 8 && dx < 8) return
          axis = dx > dy ? 'x' : 'y'
        }
        gestureGuard.touch(gestureOwner)
        // Content follows the finger on both axes.
        const step = axis === 'x' ? lastX - x : lastY - y
        const dt = Math.max(ev.timeStamp - lastT, 1)
        velocity = 0.8 * velocity + 0.2 * (step / dt)
        lastX = x
        lastY = y
        lastT = ev.timeStamp
        if (axis === 'x') panX(step)
        else scrollY(step)
      }
      const onTouchEnd = (ev) => {
        ev.stopPropagation()
        if (!tracking || ev.touches.length !== 0) { cancelGesture(); return }
        tracking = false
        // Suppress compatibility clicks/focus on xterm. A completed tap is
        // handled explicitly and a drag never changes keyboard focus.
        if (ev.cancelable) ev.preventDefault()
        if (!axis && rec.onTap) rec.onTap()
        if (ev.timeStamp - lastT > 100) velocity = 0
        // Momentum: decay the release velocity so long content is reachable.
        // Keep the paint guard through the fling; a snapshot mid-momentum must
        // not move or re-fit the terminal underneath the inertial scroll.
        const apply = axis === 'x' ? panX : scrollY
        if (axis && Math.abs(velocity) > 0.15 && rec.term) {
          let v = velocity
          let prev = performance.now()
          const tick = (now) => {
            flingRaf = 0
            const dt = Math.min(Math.max(now - prev, 1), 48)
            prev = now
            v *= Math.pow(0.94, dt / 16)
            if (Math.abs(v) < 0.05 || !rec.term || !apply(v * dt)) {
              release()
              return
            }
            gestureGuard.touch(gestureOwner)
            flingRaf = requestAnimationFrame(tick)
          }
          flingRaf = requestAnimationFrame(tick)
        } else {
          release()
        }
        velocity = 0
      }
      const onTouchCancel = (ev) => {
        ev.stopPropagation()
        cancelGesture()
      }
      const onWheel = (ev) => {
        if (ev.ctrlKey) return // preserve browser pinch-to-zoom
        ev.preventDefault()
        ev.stopPropagation()
        const remainder = tracking || flingRaf ? 0 : acc
        cancelGesture()
        acc = remainder
        lastX = ev.clientX
        lastY = ev.clientY
        const unit = ev.deltaMode === 1 ? rowHeight() : ev.deltaMode === 2 ? host.clientHeight : 1
        panX(ev.deltaX * unit)
        scrollY(ev.deltaY * unit)
      }
      rec.touchLayer?.addEventListener('wheel', onWheel, { passive: false })
      // The stable touch layer is the primary surface (mobile); the host
      // keeps the same handlers for touch input on desktop-width viewports,
      // where the layer is display:none.
      for (const surface of [rec.touchLayer, host]) {
        if (!surface) continue
        surface.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
        surface.addEventListener('touchmove', onTouchMove, { capture: true, passive: false })
        surface.addEventListener('touchend', onTouchEnd, { capture: true, passive: false })
        surface.addEventListener('touchcancel', onTouchCancel, { capture: true, passive: true })
      }
      return () => {
        cancelGesture()
        rec.touchLayer?.removeEventListener('wheel', onWheel)
        for (const surface of [rec.touchLayer, host]) {
          if (!surface) continue
          surface.removeEventListener('touchstart', onTouchStart, true)
          surface.removeEventListener('touchmove', onTouchMove, true)
          surface.removeEventListener('touchend', onTouchEnd, true)
          surface.removeEventListener('touchcancel', onTouchCancel, true)
        }
      }
    }

    function prunePanes(store, ids) {
      for (const id of [...store.panes.keys()]) {
        if (!ids.has(id)) store.disposePane(id)
      }
    }

    /**
     * Dividers sit in tmux's separator cells: a vertical sash is centred in
     * the one-cell gutter right of a pane; a horizontal sash rides the top
     * edge of the lower pane's title strip. `panes` is empty (phone focus
     * view or detached) when no divider should exist.
     */
    function paintSashes(grid, store, panes, layout) {
      const wanted = new Map()
      for (const pane of panes) {
        const box = paneBox(pane)
        const right = neighbor(panes, pane, 'x')
        if (right) {
          const rightBox = paneBox(right)
          const top = Math.max(box.top, rightBox.top)
          const bottom = Math.min(box.top + box.height, rightBox.top + rightBox.height)
          wanted.set(`v:${pane.id}:${right.id}`, {
            dir: 'v', pane, axis: 'x',
            x: (box.left + box.width + 0.5) * layout.cellW,
            y: top * layout.cellH,
            length: (bottom - top) * layout.cellH,
          })
        }
        const below = neighbor(panes, pane, 'y')
        if (below) {
          const belowBox = paneBox(below)
          const left = Math.max(box.left, belowBox.left)
          const rightEdge = Math.min(box.left + box.width, belowBox.left + belowBox.width)
          wanted.set(`h:${pane.id}:${below.id}`, {
            dir: 'h', pane, axis: 'y',
            x: left * layout.cellW,
            y: belowBox.top * layout.cellH,
            length: (rightEdge - left) * layout.cellW,
          })
        }
      }
      const existing = new Map()
      grid.querySelectorAll('[data-tmux-cc-sash]').forEach((node) => existing.set(node.dataset.key, node))
      for (const [key, node] of existing) {
        if (!wanted.has(key)) node.remove()
      }
      for (const [key, spec] of wanted) {
        let sash = existing.get(key)
        if (!sash) {
          sash = el('div', { 'data-tmux-cc-sash': '', 'data-dir': spec.dir, 'data-key': key })
          bindSash(sash, store, spec.pane, spec.axis, grid)
          grid.append(sash)
        } else {
          sash._tmuxPane = spec.pane
        }
        sash.style.left = `${spec.x}px`
        sash.style.top = `${spec.y}px`
        if (spec.dir === 'v') sash.style.height = `${spec.length}px`
        else sash.style.width = `${spec.length}px`
      }
    }

    function bindSash(sash, store, pane, axis, body) {
      let finishDrag = null
      const startDrag = (event) => {
        if (event.button !== 0 || event.isPrimary === false || finishDrag || document.body.dataset.tmuxDragging) return
        if (sash.isConnected === false || body.isConnected === false) return
        const snap = store.get().snapshot
        if (!snap) return
        event.preventDefault()
        const pointerId = event.pointerId
        const live = sash._tmuxPane || pane
        const start = axis === 'x' ? event.clientX : event.clientY
        const startCells = axis === 'x' ? live.width : live.height
        const rect = body.getBoundingClientRect()
        // The grid element spans cols × (rows + 1) layout cells.
        const cell = axis === 'x' ? rect.width / Math.max(snap.cols, 1) : rect.height / (Math.max(snap.rows, 1) + 1)
        sash.dataset.active = '1'
        document.body.dataset.tmuxDragging = '1'
        let lastSent = startCells
        let observer = null
        const finish = () => {
          if (finishDrag !== finish) return
          finishDrag = null
          window.removeEventListener('pointermove', move, true)
          window.removeEventListener('pointerup', end, true)
          window.removeEventListener('pointercancel', end, true)
          window.removeEventListener('blur', finish, true)
          sash.removeEventListener('lostpointercapture', end)
          if (observer) observer.disconnect()
          try { sash.releasePointerCapture?.(pointerId) } catch { /* already released */ }
          delete sash.dataset.active
          delete document.body.dataset.tmuxDragging
          // A snapshot received during dragging skipped sash/grid layout. Flush
          // once even if cancellation is followed by lostcapture or pointerup.
          store.repaint()
        }
        const end = (ev) => { if (ev.pointerId === pointerId) finish() }
        const checkConnected = () => {
          if (sash.isConnected === false || body.isConnected === false) finish()
        }
        const move = (ev) => {
          if (ev.pointerId !== pointerId || finishDrag !== finish) return
          if (sash.isConnected === false || body.isConnected === false) { finish(); return }
          const next = Math.max(4, Math.round(startCells + ((axis === 'x' ? ev.clientX : ev.clientY) - start) / Math.max(cell, 1)))
          if (next === lastSent) return
          lastSent = next
          if (axis === 'x') store.send({ type: 'resize-pane', pane: live.id, width: next })
          else store.send({ type: 'resize-pane', pane: live.id, height: next })
        }
        finishDrag = finish
        window.addEventListener('pointermove', move, true)
        window.addEventListener('pointerup', end, true)
        window.addEventListener('pointercancel', end, true)
        window.addEventListener('blur', finish, true)
        sash.addEventListener('lostpointercapture', end)
        if (typeof MutationObserver === 'function') {
          observer = new MutationObserver(checkConnected)
          observer.observe(document.body, { childList: true, subtree: true })
        }
        try { sash.setPointerCapture?.(pointerId) } catch { /* window listeners remain the fallback */ }
      }
      sash.addEventListener('pointerdown', startDrag)
      return () => {
        sash.removeEventListener('pointerdown', startDrag)
        if (finishDrag) finishDrag()
      }
    }

    function fillSelect(select, items, value) {
      const key = items.map((item) => `${item.value}:${item.label}`).join('|')
      if (select.dataset.key !== key) {
        select.dataset.key = key
        select.replaceChildren(...items.map((item) => el('option', { value: item.value, text: item.label, disabled: item.disabled })))
      }
      select.value = value || ''
    }

    /** A native modal keeps terminal input inert while managing host resources. */
    function openManager(host, store, trigger) {
      if (store.closeManager) return
      let closed = false
      let busy = false
      let loaded = false
      let inventory = { sessions: [], clients: [] }
      let sessionKey = ''
      let clientKey = ''
      let editingSession = null
      const selected = new Map()
      const identity = (client) => JSON.stringify([client.name, client.pid, client.created])
      const button = (text, onClick) => el('button', { type: 'button', text, onClick })
      const field = (text, input) => el('label', { 'data-tmux-cc-field': '' }, el('span', { text }), input)
      const dialog = el('dialog', { 'data-tmux-cc-manager': '', 'aria-labelledby': 'tmux-cc-manager-title' })
      const heading = el('h2', { id: 'tmux-cc-manager-title', text: t('manage'), tabIndex: -1, autofocus: true })
      const status = el('div', { role: 'status', 'aria-live': 'polite' })
      const problem = el('div', { role: 'alert', 'data-tmux-cc-manager-error': '' })
      const refresh = button(t('refresh'), () => void run('management'))
      const done = button(t('done'), () => dialog.close())
      const content = el('div', { 'data-tmux-cc-manager-content': '' })
      const nameInput = el('input', { type: 'text', required: true, maxlength: 200, autocomplete: 'off' })
      const cwdInput = el('input', { type: 'text', placeholder: '/home/user/project', autocomplete: 'off' })
      const attachInput = el('input', { type: 'checkbox', checked: true })
      const create = el('button', { type: 'submit', text: t('createSession') })
      const createForm = el('form', { 'data-tmux-cc-create-form': '', onSubmit: (ev) => {
        ev.preventDefault()
        const name = nameInput.value.trim()
        const cwd = cwdInput.value.trim()
        const attach = attachInput.checked
        if (!validName(name, nameInput)) return
        void run('create-session', { name, ...(cwd ? { cwd } : {}) }, () => {
          nameInput.value = ''
          cwdInput.value = ''
          if (attach) {
            store.setPrefs({ session: name })
            store.attach(name)
          }
          status.textContent = t('created')
        })
      } },
        el('h3', { text: t('createSession') }),
        field(t('sessionName'), nameInput), el('p', { text: t('sessionNameHelp') }),
        field(t('startDirectory'), cwdInput), el('p', { text: t('directoryHelp') }),
        el('label', { 'data-tmux-cc-check': '' }, attachInput, t('attachCreated')), create,
      )
      nameInput.addEventListener('input', () => nameInput.setCustomValidity(''))
      const sessionList = el('div', { 'data-tmux-cc-session-list': '' })
      const filter = el('select', { 'aria-label': t('filterClients'), onChange: () => {
        // Hidden selections must never be detached by a misleading filtered view.
        selected.clear()
        clientKey = ''
        renderClients()
      } })
      const selectAll = button(t('selectAll'), () => {
        for (const client of visibleClients()) if (!client.own) selected.set(identity(client), client)
        updateSelection()
      })
      const clear = button(t('clearSelection'), () => { selected.clear(); updateSelection() })
      const detach = button(t('detachSelected'), () => {
        // Capture immutable targets before the dialog; never resolve a new seat
        // from a name after confirmation (the host verifies pid + creation too).
        const targets = [...selected.values()]
        if (!targets.length || busy) return
        const names = targets.map((client) => `${client.name} — ${client.session}`).join('\n')
        if (!window.confirm(`${t('detachConfirm')}\n\n${names}`)) return
        void run('detach-clients', { clients: targets.map(({ name, pid, created }) => ({ name, pid, created })) }, () => {
          selected.clear()
          status.textContent = t('clientsDetached')
        })
      })
      const clientList = el('div', { 'data-tmux-cc-client-list': '' })
      content.append(createForm,
        el('section', {}, el('h3', { text: t('sessions') }), sessionList),
        el('section', {}, el('h3', { text: t('clients') }), el('p', { text: t('clientHelp') }),
          field(t('filterClients'), filter),
          el('div', { 'data-tmux-cc-manager-actions': '', 'data-tmux-cc-client-actions': '' }, selectAll, clear, detach), clientList),
      )
      dialog.append(el('header', {}, heading, done), el('p', { text: t('manageHelp') }),
        el('div', { 'data-tmux-cc-manager-actions': '' }, refresh, status), problem, content)
      host.append(dialog)
      function validName(name, input) {
        input.setCustomValidity(!name || name.length > 200 || /[.:;\x00-\x1f\x7f-\x9f]/.test(name) ? t('sessionNameHelp') : '')
        return input.reportValidity()
      }
      function visibleClients() {
        return inventory.clients.filter((client) => !filter.value || client.session === filter.value)
      }
      function updateSelection() {
        for (const checkbox of clientList.querySelectorAll('input[type="checkbox"]')) {
          checkbox.checked = selected.has(checkbox.dataset.identity)
        }
        updateControls()
      }
      function updateControls() {
        const connected = store.get().connected
        const disabled = busy || !connected
        dialog.setAttribute('aria-busy', String(busy))
        for (const control of content.querySelectorAll('button,input,select')) {
          control.disabled = disabled || !loaded || control.dataset.own === '1'
        }
        refresh.disabled = disabled
        detach.textContent = `${t('detachSelected')} (${selected.size})`
        detach.disabled = disabled || !loaded || selected.size === 0
        clear.disabled = disabled || selected.size === 0
        selectAll.disabled = disabled || !loaded || !visibleClients().some((client) => !client.own)
      }
      function renderSessions() {
        // Preserve an in-progress rename and caret while automatic polling runs.
        if (editingSession !== null) return
        const key = JSON.stringify(inventory.sessions)
        if (sessionKey === key) return
        sessionKey = key
        sessionList.replaceChildren(...inventory.sessions.map((session) => {
          const row = el('div', { 'data-tmux-cc-session-row': '' })
          const attach = button(t('attach'), () => {
            store.setPrefs({ session: session.name })
            store.attach(session.name)
            dialog.close()
          })
          const rename = button(t('rename'), () => {
            editingSession = session.name
            const input = el('input', { type: 'text', value: session.name, required: true, maxlength: 200, autocomplete: 'off' })
            input.addEventListener('input', () => input.setCustomValidity(''))
            const cancel = button(t('cancel'), () => {
              editingSession = null
              sessionKey = ''
              renderSessions()
              updateControls()
              sessionList.querySelector('button')?.focus()
            })
            const form = el('form', { onSubmit: (ev) => {
              ev.preventDefault()
              const newName = input.value.trim()
              if (!validName(newName, input)) return
              void run('rename-session', { session: session.name, newName }, () => {
                if (store.get().prefs.session === session.name) store.setPrefs({ session: newName })
                editingSession = null
                sessionKey = ''
                status.textContent = t('renamed')
              })
            } }, field(t('newSessionName'), input),
              el('div', { 'data-tmux-cc-manager-actions': '' }, el('button', { type: 'submit', text: t('save') }), cancel))
            row.replaceChildren(el('strong', { text: session.name }), form)
            input.focus()
            input.select()
          })
          row.append(el('div', {}, el('strong', { text: session.name }),
            el('p', { text: sessionSummary(session) })),
            el('div', { 'data-tmux-cc-manager-actions': '' }, attach, rename))
          return row
        }))
        if (!inventory.sessions.length) sessionList.append(el('p', { text: t('noSessions') }))
      }
      function renderClients() {
        const clients = visibleClients()
        const key = JSON.stringify(clients)
        if (clientKey !== key) {
          clientKey = key
          clientList.replaceChildren(...clients.map((client) => {
            const checkbox = el('input', { type: 'checkbox', 'data-identity': identity(client), 'data-own': client.own ? '1' : '0',
              'aria-label': `${t('selectClient')} ${client.name}`, title: client.own ? t('ownClientHelp') : client.name,
              onChange: () => {
                if (checkbox.checked) selected.set(identity(client), client)
                else selected.delete(identity(client))
                updateControls()
              },
            })
            const kind = client.own ? t('ownClient') : client.control ? t('controlClient') : t('terminalClient')
            const created = client.created > 0 ? new Date(client.created * 1000).toLocaleString() : '—'
            return el('div', { 'data-tmux-cc-client-row': '' },
              el('label', { 'data-tmux-cc-check': '' }, checkbox, el('strong', { text: client.name })),
              el('p', { text: `${client.session} · ${kind} · PID ${client.pid}` }),
              el('p', { text: `${client.tty || '—'} · ${client.term || '—'} · ${client.cols}×${client.rows}` }),
              el('p', { text: `${t('connectedAt')}: ${created}${client.flags.length ? ` · ${client.flags.join(', ')}` : ''}` }),
              client.own ? el('p', { text: t('ownClientHelp') }) : null)
          }))
          if (!clients.length) clientList.append(el('p', { text: t('noClients') }))
        }
        updateSelection()
      }
      function acceptInventory(reply) {
        inventory = reply
        loaded = true
        const live = new Map(inventory.clients.filter((client) => !client.own).map((client) => [identity(client), client]))
        for (const key of selected.keys()) {
          const client = live.get(key)
          if (!client || (filter.value && client.session !== filter.value)) selected.delete(key)
          else selected.set(key, client)
        }
        const value = filter.value
        const sessions = [...new Set([...inventory.sessions.map((session) => session.name), ...inventory.clients.map((client) => client.session)])]
        fillSelect(filter, [{ value: '', label: t('allSessions') }, ...sessions.map((name) => ({ value: name, label: name }))], value)
        if (value && !sessions.includes(value)) { filter.value = ''; selected.clear() }
        renderSessions()
        renderClients()
      }
      async function run(type, fields = {}, onSuccess) {
        if (busy || closed) return
        busy = true
        problem.textContent = ''
        status.textContent = type === 'management' ? t('loading') : t('working')
        updateControls()
        try {
          const reply = await store.managementRequest(type, fields)
          if (closed) return
          status.textContent = ''
          if (onSuccess) onSuccess()
          acceptInventory(reply)
        } catch (err) {
          if (closed) return
          problem.textContent = err.message || String(err)
          status.textContent = ''
          // A failed batch may have detached some seats before one disappeared.
          // Reconcile, but keep the actionable error and all form inputs intact.
          if (type !== 'management') {
            try {
              const reply = await store.managementRequest('management')
              if (!closed) acceptInventory(reply)
            } catch { loaded = false }
          } else loaded = false
        } finally {
          busy = false
          if (!closed) updateControls()
        }
      }
      const position = () => {
        const box = mobileViewportBox()
        dialog.style.maxHeight = `${Math.max(120, box.height - 24)}px`
        dialog.style.top = `${box.y + 12}px`
      }
      const off = store.subscribe(updateControls)
      const poll = window.setInterval(() => {
        // Never disable a field under someone's caret or erase an unread error.
        const typing = dialog.querySelector('input:focus:not([type="checkbox"]), select:focus')
        if (!busy && !editingSession && !typing && !problem.textContent && document.visibilityState !== 'hidden' && store.get().connected) void run('management')
      }, 5000)
      const viewport = window.visualViewport
      window.addEventListener('resize', position)
      viewport?.addEventListener('resize', position)
      viewport?.addEventListener('scroll', position)
      const cleanup = () => {
        if (closed) return
        closed = true
        window.clearInterval(poll)
        window.removeEventListener('resize', position)
        viewport?.removeEventListener('resize', position)
        viewport?.removeEventListener('scroll', position)
        off()
        dialog.remove()
        store.closeManager = null
        if (trigger?.isConnected) trigger.focus({ preventScroll: true })
      }
      dialog.addEventListener('close', cleanup)
      store.closeManager = () => { dialog.close(); cleanup() }
      position()
      dialog.showModal()
      heading.focus({ preventScroll: true })
      void run('management')
    }

    function buildShell(host, store) {
      const shell = el('div', { 'data-tmux-cc-shell': '' })
      const settings = el('button', { type: 'button', 'data-tmux-cc-icon': '', 'data-tmux-cc-settings-button': '', 'aria-label': 'Settings', title: 'Settings', onClick: () => openSettings(host, store, settings) })
      settings.append(icon('<path d="M3 7h8m4 0h6M3 17h2m4 0h12"/><circle cx="13" cy="7" r="2"/><circle cx="7" cy="17" r="2"/>'))
      const bar = el('div', { 'data-tmux-cc-bar': '' })
      const brand = el('div', { 'data-tmux-cc-brand': '' }, el('img', { src: './icon.svg', alt: '', width: 18, height: 18 }), el('strong', { text: 'web-tmux-cc' }))
      const header = el('header', { 'data-tmux-cc-header': '' }, brand, bar, settings)
      bar.addEventListener('pointerdown', (ev) => {
        // Keep controls in place between down/up while the keyboard is up.
        // Focusing a button used to expand the toolbar under the pointer.
        if (ev.target.closest('button') && terminalFocused()) ev.preventDefault()
      })
      const sess = el('select', {
        'data-tmux-cc-session': '',
        title: 'tmux session',
        'aria-label': 'tmux session',
        onChange: (e) => {
          store.setPrefs({ session: e.target.value })
          store.attach(e.target.value)
        },
      })
      const status = el('span', { 'data-tmux-cc-status': '' })
      const tabs = el('div', { 'data-tmux-cc-tabs': '', role: 'tablist', 'aria-label': 'tmux windows' })
      const mk = (title, path, fn, key) => {
        const b = el('button', { type: 'button', 'data-tmux-cc-icon': '', title, 'aria-label': title, onClick: fn })
        b.append(icon(path))
        if (key) b.setAttribute(`data-tmux-cc-${key}`, '')
        return b
      }
      const link = el('button', {
        type: 'button',
        'data-tmux-cc-icon': '',
        'data-tmux-cc-link': '',
        title: t('attach'),
        onClick: () => {
          const state = store.get()
          if (state.snapshot && state.snapshot.attached) store.detach()
          else store.attach(sess.value || state.prefs.session)
        },
      })
      const zoom = mk(t('zoom'), '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>', () => store.send({ type: 'zoom' }), 'zoom')
      // Mobile-only (CSS): opens the keyboard without picking a pane, and
      // dismisses it (iPhone keyboards have no dismiss key of their own).
      const toggleKbd = () => {
        const focused = document.activeElement
        if (focused && shell.contains(focused) && focused.closest && focused.closest('.xterm')) {
          try { focused.blur() } catch { /* ignore */ }
          return
        }
        const snap = store.get().snapshot
        const live = (snap && snap.panes) || []
        const target = live.find((p) => p.active) || live[0]
        focusPane(target ? store.panes.get(target.id) : null)
      }
      const kbd = mk(t('kbd'), '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/><path d="M7 16h10"/>', toggleKbd, 'kbd')
      // iOS shows the software keyboard for a programmatic focus() most
      // reliably from inside a touchend handler. Handle the touch directly
      // and swallow the synthetic click that would otherwise double-toggle.
      let kbdTouch = null
      kbd.addEventListener('touchstart', (ev) => {
        kbdTouch = ev.touches.length === 1 ? ev.touches[0] : null
      }, { passive: true })
      kbd.addEventListener('touchcancel', () => { kbdTouch = null }, { passive: true })
      kbd.addEventListener('touchend', (ev) => {
        if (ev.cancelable) ev.preventDefault()
        ev.stopPropagation()
        const end = ev.changedTouches[0]
        const tap = kbdTouch && end && ev.touches.length === 0
          && Math.hypot(end.clientX - kbdTouch.clientX, end.clientY - kbdTouch.clientY) < 8
        kbdTouch = null
        if (tap && !kbd.disabled) toggleKbd()
      }, { passive: false })
      // Touch text size also drives Auto's grid; Mirror keeps the chosen
      // readable size and permits panning if the remote grid is larger.
      const stepFloor = (delta) => {
        const cur = store.get().prefs.mobileFontFloor || 12
        store.setPrefs({ mobileFontFloor: cur + delta })
      }
      const fontDown = mk(t('fontDown'), '<path d="m4 17 5-12 5 12"/><path d="M5.7 13h6.6"/><path d="M16 12h6"/>', () => stepFloor(-1), 'font-down')
      const fontUp = mk(t('fontUp'), '<path d="m4 17 5-12 5 12"/><path d="M5.7 13h6.6"/><path d="M19 9v6"/><path d="M16 12h6"/>', () => stepFloor(1), 'font-up')
      const manage = mk(t('manage'), '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><path d="M6.5 14v7m-3.5-3.5h7"/><rect x="14" y="14" width="7" height="7" rx="1"/>', () => openManager(host, store, manage), 'manage')
      const group = (...kids) => el('div', { 'data-tmux-cc-group': '' }, ...kids)
      const actions = el('div', { 'data-tmux-cc-actions': '' },
        group(
          mk(t('splitH'), '<path d="M12 3v18"/><rect x="3" y="3" width="18" height="18" rx="2"/>', () => {
            const pane = activePaneId(store)
            if (pane) store.send({ type: 'split', dir: 'h', pane })
          }, 'split-h'),
          mk(t('splitV'), '<path d="M3 12h18"/><rect x="3" y="3" width="18" height="18" rx="2"/>', () => {
            const pane = activePaneId(store)
            if (pane) store.send({ type: 'split', dir: 'v', pane })
          }, 'split-v'),
          zoom,
          mk(t('kill'), '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/>', () => store.requestKill('active'), 'kill'),
        ),
        group(manage, link),
      )
      const touchGroup = group(kbd, fontDown, fontUp)
      touchGroup.setAttribute('data-tmux-cc-touch-group', '')
      bar.append(sess, status, touchGroup, tabs, actions)
      const err = el('div', { 'data-tmux-cc-error': '', role: 'status' })
      const body = el('div', { 'data-tmux-cc-body': '' })
      const grid = el('div', { 'data-tmux-cc-grid': '' })
      body.append(grid)
      shell.append(header, err, body, buildKeyBar(store, toggleKbd))
      host.querySelector('[data-tmux-cc-loading]')?.remove()
      host.append(shell)
      return shell
    }

    /**
     * Keys an on-screen keyboard lacks, shown above it while a terminal is
     * focused on touch screens. Ctrl and Alt are sticky (tap: next key,
     * tap again: locked) and also apply to characters typed on the system
     * keyboard. Arrows repeat while held. Nothing here ever takes focus.
     */
    function buildKeyBar(store, dismiss) {
      const keys = [
        { label: 'esc', text: '\x1b', wide: true },
        { label: 'tab', text: '\t', wide: true },
        { label: 'ctrl', mod: 'ctrl', wide: true },
        { label: 'alt', mod: 'alt', wide: true },
        { label: '←', csi: 'D', repeat: true, aria: 'Left' },
        { label: '↑', csi: 'A', repeat: true, aria: 'Up' },
        { label: '↓', csi: 'B', repeat: true, aria: 'Down' },
        { label: '→', csi: 'C', repeat: true, aria: 'Right' },
        { label: '-', text: '-' },
        { label: '/', text: '/' },
        { label: '|', text: '|' },
        { label: '~', text: '~' },
        { label: 'home', csi: 'H', wide: true },
        { label: 'end', csi: 'F', wide: true },
        { label: 'pgup', tilde: '5', wide: true },
        { label: 'pgdn', tilde: '6', wide: true },
      ]
      const bar = el('div', { 'data-tmux-cc-keys': '', role: 'toolbar', 'aria-label': 'Terminal keys' })
      const row = el('div', { 'data-tmux-cc-keys-row': '' })
      // Buttons must never take focus: focus is the terminal's, and losing it
      // closes the keyboard the bar exists to complement. A default-prevented
      // pointerdown also suppresses click in WebKit, so keys act on pointerup.
      bar.addEventListener('pointerdown', (ev) => ev.preventDefault())
      bar.addEventListener('contextmenu', (ev) => ev.preventDefault())
      const press = (button, onDown, onUp) => {
        let active = null
        button.addEventListener('pointerdown', (ev) => {
          if (!ev.isPrimary || ev.button !== 0) return
          active = ev.pointerId
          try { button.setPointerCapture(ev.pointerId) } catch { /* unsupported */ }
          button.dataset.down = '1'
          if (onDown) onDown()
        })
        const end = (ev, fire) => {
          if (ev.pointerId !== active) return
          active = null
          delete button.dataset.down
          // Sliding off before lifting cancels, like a native key.
          const over = document.elementFromPoint(ev.clientX, ev.clientY)
          if (fire && over && button.contains(over)) fire()
        }
        button.addEventListener('pointerup', (ev) => end(ev, onUp))
        button.addEventListener('pointercancel', (ev) => end(ev, null))
      }
      for (const key of keys) {
        const button = el('button', {
          type: 'button', tabindex: -1, 'data-tmux-cc-key': key.mod || key.label,
          'aria-label': key.aria || key.label, 'data-wide': key.wide ? '1' : null,
        }, el('span', { text: key.label }))
        if (key.mod) {
          button.setAttribute('aria-pressed', 'false')
          press(button, null, () => store.cycleKeyModifier(key.mod))
        } else if (key.repeat) {
          let timer = 0
          const stop = () => { clearTimeout(timer); clearInterval(timer); timer = 0 }
          press(button, () => {
            store.sendKey(key)
            stop()
            timer = window.setTimeout(() => { timer = window.setInterval(() => store.sendKey(key), 60) }, 400)
          }, null)
          for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, stop)
        } else {
          press(button, null, () => store.sendKey(key))
        }
        row.append(button)
      }
      const hide = el('button', { type: 'button', tabindex: -1, 'data-tmux-cc-keys-hide': '', 'aria-label': t('hideKeyboard'), title: t('hideKeyboard') })
      hide.append(icon('<rect x="2" y="3" width="20" height="13" rx="2"/><path d="M6 7h.01M10 7h.01M14 7h.01M18 7h.01M8 11h8"/><path d="m9 19 3 3 3-3"/>'))
      press(hide, null, dismiss)
      bar.append(row, hide)
      return bar
    }

    /** Detached body: a session picker card instead of a bare sentence. */
    function paintEmpty(host, body, store, sessions, layouts, attached) {
      const prefs = store.get().prefs
      let empty = body.querySelector('[data-tmux-cc-empty]')
      if (!empty) {
        empty = el('div', { 'data-tmux-cc-empty': '' })
        body.append(empty)
      }
      const gone = !!(prefs.session && !sessions.some((s) => s.name === prefs.session) && !attached)
      const none = !(sessions.length || layouts.length)
      const heading = none ? t('noSessions') : gone ? t('sessionGone') : t('notAttached')
      const key = JSON.stringify([heading, sessions.map((s) => [s.name, s.windows, s.attached]), layouts.map((l) => [l.session, l.label])])
      if (empty.dataset.key === key) return
      empty.dataset.key = key
      const list = el('div', { 'data-tmux-cc-empty-list': '' })
      const seen = new Set()
      for (const s of sessions) {
        seen.add(s.name)
        list.append(el('button', { type: 'button', 'data-tmux-cc-empty-session': '', onClick: () => { store.setPrefs({ session: s.name }); store.attach(s.name) } },
          el('strong', { text: s.name }),
          el('span', { text: sessionSummary(s) })))
      }
      for (const l of layouts) {
        if (seen.has(l.session)) continue
        list.append(el('button', { type: 'button', 'data-tmux-cc-empty-session': '', onClick: () => { store.setPrefs({ session: l.session }); store.attach(l.session) } },
          el('strong', { text: l.label }), el('span', { text: 'launch' })))
      }
      const manage = el('button', { type: 'button', 'data-tmux-cc-empty-manage': '', text: t('manage'), onClick: () => openManager(host, store, manage) })
      empty.replaceChildren(el('div', { 'data-tmux-cc-empty-card': '' },
        el('img', { src: './icon.svg', alt: '', width: 40, height: 40 }),
        el('h2', { text: heading }),
        el('p', { text: none ? t('noSessionsHelp') : t('notAttachedHelp') }),
        list.childElementCount ? list : null,
        manage))
    }

    function paint(host, store) {
      const { prefs, snapshot, error, notice } = store.get()
      applyLiveFont(store)
      const shell = host.querySelector('[data-tmux-cc-shell]') || buildShell(host, store)
      placeShell(shell)
      const kbd = terminalFocused()
      if (kbd) shell.dataset.kbd = '1'
      else delete shell.dataset.kbd
      for (const name of ['ctrl', 'alt']) {
        const button = shell.querySelector(`[data-tmux-cc-key="${name}"]`)
        if (!button) continue
        const state = store.keyModifiers[name]
        button.setAttribute('aria-pressed', state ? 'true' : 'false')
        if (state === 2) button.dataset.locked = '1'
        else delete button.dataset.locked
      }

      const sessions = (snapshot && snapshot.sessions) || []
      const layouts = (snapshot && snapshot.layouts) || []
      const sessSel = shell.querySelector('[data-tmux-cc-session]')
      const sessionName = (snapshot && snapshot.attached && snapshot.session)
        || prefs.session
        || ''
      const byValue = new Map()
      for (const s of sessions) byValue.set(s.name, { value: s.name, label: s.name })
      for (const l of layouts) {
        if (!byValue.has(l.session)) byValue.set(l.session, { value: l.session, label: `${l.label} (launch)` })
      }
      if (sessionName && !byValue.has(sessionName)) byValue.set(sessionName, { value: sessionName, label: sessionName })
      const sessionItems = [
        { value: '', label: byValue.size ? t('selectSession') : t('noSessions'), disabled: true },
        ...byValue.values(),
      ]
      fillSelect(sessSel, sessionItems, sessionName)
      const tabs = shell.querySelector('[data-tmux-cc-tabs]')
      // A single window is the norm; showing one tab just burns a row on mobile.
      const allWindows = (snapshot && snapshot.windows) || []
      const windows = allWindows.length > 1 ? allWindows : []
      const tabKey = windows.map((w) => `${w.id}:${w.name}:${w.active}`).join('|')
      if (tabs.dataset.key !== tabKey) {
        tabs.dataset.key = tabKey
        tabs.replaceChildren(...windows.map((win) => el('button', {
          type: 'button',
          role: 'tab',
          'data-tmux-cc-tab': '',
          'data-active': win.active ? '1' : '0',
          'aria-selected': win.active ? 'true' : 'false',
          text: win.name || win.id,
          onClick: () => store.send({ type: 'select-window', windowId: win.id }),
        })))
      }
      const attached = !!(snapshot && snapshot.attached)
      const connected = store.get().connected
      // Contextual pane actions are dead clicks while detached.
      for (const key of ['split-h', 'split-v', 'zoom', 'kill', 'kbd', 'font-down', 'font-up']) {
        const btn = shell.querySelector(`[data-tmux-cc-${key}]`)
        if (btn) btn.disabled = !attached
      }
      const zoomBtn = shell.querySelector('[data-tmux-cc-zoom]')
      if (zoomBtn) {
        const zoomed = !!(snapshot && snapshot.zoomed)
        zoomBtn.title = zoomed ? t('unzoom') : t('zoom')
        zoomBtn.setAttribute('aria-label', zoomBtn.title)
        zoomBtn.setAttribute('aria-pressed', zoomed ? 'true' : 'false')
      }
      const linkBtn = shell.querySelector('[data-tmux-cc-link]')
      if (linkBtn) {
        linkBtn.title = attached ? t('detach') : t('attach')
        linkBtn.setAttribute('aria-label', linkBtn.title)
        linkBtn.setAttribute('aria-pressed', attached ? 'true' : 'false')
        linkBtn.disabled = !connected || (!attached && !(sessSel.value || prefs.session))
        if (linkBtn.dataset.state !== String(attached)) {
          linkBtn.dataset.state = String(attached)
          linkBtn.replaceChildren(icon(attached
            ? '<path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M5.17 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="2" y1="2" x2="22" y2="22"/>'
            : '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'))
        }
      }
      const status = shell.querySelector('[data-tmux-cc-status]')
      const sizeMode = (snapshot && snapshot.sizeMode) || 'mirror'
      const policy = (snapshot && snapshot.sizePolicy) || 'primary'
      if (!connected) {
        status.textContent = t('reconnecting')
        status.title = t('reconnectingHelp')
        status.dataset.state = 'offline'
      } else if (attached) {
        const label = sizeMode === 'takeover' ? (policy === 'auto' ? t('modeAuto') : t('modePrimary')) : t('modeMirror')
        status.textContent = `${label} · ${snapshot.cols}×${snapshot.rows}`
        status.title = sizeMode === 'takeover' ? t('modePrimaryHelp') : (policy === 'mirror' ? t('modeMirrorHelp') : t('modeMirrorOtherHelp'))
        status.dataset.state = sizeMode
      } else {
        status.textContent = t('detached')
        status.title = ''
        status.dataset.state = 'detached'
      }
      const err = shell.querySelector('[data-tmux-cc-error]')
      const strip = error || notice || ''
      err.textContent = strip
      err.dataset.kind = error ? 'error' : 'notice'
      err.style.display = strip ? 'block' : 'none'

      const body = shell.querySelector('[data-tmux-cc-body]')
      const grid = body.querySelector('[data-tmux-cc-grid]')
      const panes = (snapshot && snapshot.attached && snapshot.panes) || []
      shell.dataset.sizeMode = sizeMode
      shell.dataset.attached = attached ? '1' : '0'
      if (panes.length === 0) {
        store.clearResize()
        prunePanes(store, new Set())
        paintSashes(grid, store, [], null)
        grid.style.display = 'none'
        paintEmpty(host, body, store, sessions, layouts, attached)
        return
      }
      body.querySelector('[data-tmux-cc-empty]')?.remove()
      grid.style.display = ''
      const cols = Math.max(1, snapshot.cols || 80)
      const rows = Math.max(1, snapshot.rows || 24)
      // The grid is a canvas at its natural size; the body scrolls to reach
      // whatever does not fit. Panes never scroll on their own.
      const layout = windowLayout(store, body, cols, rows)
      Object.assign(grid.style, { width: `${layout.width}px`, height: `${layout.height}px` })
      for (const pane of panes) {
        const box = paneBox(pane)
        mountPane(grid, pane, store, layout, {
          left: box.left * layout.cellW,
          top: box.top * layout.cellH,
          width: box.width * layout.cellW,
          height: box.height * layout.cellH,
          strip: layout.cellH,
        })
      }
      prunePanes(store, new Set(panes.map((pane) => pane.id)))
      if (!document.body.dataset.tmuxDragging) paintSashes(grid, store, panes, layout)
      reportGrid(store, body)
      reconcileCell(store, layout, panes)
      // Keep the pane being typed into above the keyboard as it moves or the
      // active pane changes; a free scroll while unfocused is left alone.
      const activeKey = `${kbd ? '1' : '0'}:${activePaneId(store) || ''}:${body.clientWidth}x${body.clientHeight}`
      if (kbd && shell.dataset.mobile === '1' && shell.dataset.revealKey !== activeKey) revealActivePane(store, body)
      shell.dataset.revealKey = activeKey
    }

    function exactModifiers(event, ctrl, alt, shift, meta) {
      return !!event.ctrlKey === ctrl
        && !!event.altKey === alt
        && !!event.shiftKey === shift
        && !!event.metaKey === meta
    }

    /** Safe iTerm2 menu equivalents: only exact macOS chords not owned by the browser. */
    function resolveItermShortcut(event, isMac, compactSplits) {
      if (!isMac) return null
      const key = String(event.key || '')
      const codeLetter = /^Key([A-Z])$/.exec(String(event.code || ''))
      const lower = codeLetter ? codeLetter[1].toLowerCase() : key.toLowerCase()
      if (exactModifiers(event, true, false, true, true)) {
        if (lower === 'd') return 'detach'
        if (lower === 'n' || lower === 't') return 'new-window'
      }
      if (lower === 'x' && exactModifiers(event, false, true, false, true)) return 'kill'
      if (compactSplits && lower === 'd' && exactModifiers(event, false, true, false, true)) {
        return 'split:h'
      }
      if (exactModifiers(event, false, true, true, true)) {
        if (lower === 'n' || lower === 't') return 'new-window'
        if (compactSplits && lower === 'd') return 'split:v'
        // iTerm's horizontal split is top/bottom (-v); vertical is side-by-side (-h).
        if (lower === 'h') return 'split:v'
        if (lower === 'v') return 'split:h'
      }
      if (exactModifiers(event, false, false, true, true) && key === 'Enter') return 'zoom'
      if (exactModifiers(event, true, false, false, true)) {
        const dirs = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D' }
        if (dirs[key]) return `resize:${dirs[key]}`
      }
      return null
    }

    function isPrefixKey(event) {
      return exactModifiers(event, true, false, false, false)
        && String(event.key || '').toLowerCase() === 'b'
    }

    function resolvePrefixShortcut(event) {
      if (isPrefixKey(event)) return 'literal-prefix'
      if (event.ctrlKey || event.altKey || event.metaKey) return null
      const key = String(event.key || '')
      const dirs = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D' }
      if (!event.shiftKey && dirs[key]) return `select:${dirs[key]}`
      if (key === '"') return 'split:v'
      if (key === '%') return 'split:h'
      if (event.shiftKey) return null
      const lower = key.toLowerCase()
      if (lower === 'x') return 'kill'
      if (lower === 'z') return 'zoom'
      if (lower === 'c') return 'new-window'
      if (lower === 'n') return 'window:next'
      if (lower === 'p') return 'window:previous'
      if (lower === 'd') return 'detach'
      if (/^[0-9]$/.test(key)) return `window:${key}`
      return null
    }

    function isMacPlatform() {
      const platform = (navigator.userAgentData && navigator.userAgentData.platform)
        || navigator.platform
        || ''
      return /mac/i.test(platform)
    }

    function activePaneId(store) {
      const snapshot = store.get().snapshot
      const pane = snapshot && snapshot.panes && snapshot.panes.find((item) => item.active)
      return pane && pane.id
    }

    function selectWindowShortcut(store, target) {
      const snapshot = store.get().snapshot
      const windows = snapshot && snapshot.windows
        ? [...snapshot.windows].sort((a, b) => a.index - b.index)
        : []
      if (windows.length === 0) return
      let hit
      if (target === 'next' || target === 'previous') {
        const active = Math.max(0, windows.findIndex((item) => item.active))
        const delta = target === 'next' ? 1 : -1
        hit = windows[(active + delta + windows.length) % windows.length]
      } else {
        const index = Number(target)
        hit = windows.find((item) => item.index === index)
      }
      if (hit) store.send({ type: 'select-window', windowId: hit.id })
    }

    function runShortcut(store, action, focusedPane) {
      if (action.startsWith('select:')) {
        store.send({ type: 'select-dir', dir: action.slice(-1) })
      } else if (action.startsWith('resize:')) {
        const pane = focusedPane || activePaneId(store)
        if (pane) store.send({ type: 'resize-pane-dir', pane, dir: action.slice(-1), amount: 1 })
      } else if (action.startsWith('split:')) {
        const pane = focusedPane || activePaneId(store)
        if (pane) store.send({ type: 'split', dir: action.slice(-1), pane })
      } else if (action.startsWith('window:')) {
        selectWindowShortcut(store, action.slice('window:'.length))
      } else if (action === 'new-window') {
        store.send({ type: 'new-window' })
      } else if (action === 'zoom') {
        store.send(focusedPane ? { type: 'zoom', pane: focusedPane } : { type: 'zoom' })
      } else if (action === 'kill') {
        store.requestKill(focusedPane ? `pane:${focusedPane}` : 'active', focusedPane)
      } else if (action === 'detach') {
        store.detach()
      }
    }

    function bindKeys(host, store) {
      let prefix = false
      let prefixPane = ''
      let prefixTimer = 0
      const macShortcuts = isMacPlatform()
      const sendLiteralPrefix = (preferredPane) => {
        const pane = preferredPane || activePaneId(store)
        if (pane) store.send({ type: 'input', pane, data: '\u0002' })
      }
      const clearPrefix = (sendLiteral) => {
        window.clearTimeout(prefixTimer)
        prefixTimer = 0
        const wasPending = prefix
        const pane = prefixPane
        prefix = false
        prefixPane = ''
        if (wasPending && sendLiteral) sendLiteralPrefix(pane)
      }
      const armPrefix = (pane) => {
        clearPrefix(false)
        prefix = true
        prefixPane = pane || ''
        prefixTimer = window.setTimeout(() => clearPrefix(true), 1500)
      }
      const onPointer = (event) => {
        const paneElement = event.target instanceof Element && event.target.closest('[data-tmux-cc-pane]')
        const pointerPane = paneElement && paneElement.dataset.paneId
        const inTerminal = event.target instanceof Element && !!event.target.closest('.xterm')
        if (prefix && (!inTerminal || pointerPane !== prefixPane)) clearPrefix(true)
      }
      window.addEventListener('pointerdown', onPointer, true)
      const swallow = (event) => { event.preventDefault(); event.stopPropagation() }
      const onKey = (event) => {
        if (event.isComposing || event.keyCode === 229) return
        const target = event.target
        // Native dialog owns Escape, form input, and focus while the terminal is inert.
        if (store.closeManager || store.closeSettings) { clearPrefix(true); return }
        const focusedInApp = target instanceof Node && host.contains(target)
        const terminal = target instanceof Element && target.closest('.xterm')
        const focusedTerminal = !!terminal
        const paneElement = target instanceof Element && target.closest('[data-tmux-cc-pane]')
        const focusedPane = paneElement && paneElement.dataset.paneId
        if (!focusedInApp) {
          clearPrefix(true)
          return
        }
        // Shortcuts only fire from terminal input, never toolbar controls.
        if (!focusedTerminal) {
          clearPrefix(true)
          return
        }
        const itermAction = resolveItermShortcut(event, macShortcuts, !!store.get().prefs.compactSplitShortcuts)
        if (itermAction) {
          clearPrefix(true)
          swallow(event)
          if (!event.repeat || itermAction.startsWith('resize:')) runShortcut(store, itermAction, focusedPane)
          return
        }
        if (isPrefixKey(event)) {
          swallow(event)
          if (event.repeat) return
          if (prefix) {
            const pendingPane = prefixPane
            clearPrefix(false)
            sendLiteralPrefix(pendingPane || focusedPane)
          } else {
            armPrefix(focusedPane)
          }
          return
        }
        if (!prefix) return
        const action = resolvePrefixShortcut(event)
        const pendingPane = prefixPane
        clearPrefix(false)
        if (!action) {
          // Preserve terminal Ctrl+B semantics for unsupported follow-ups.
          sendLiteralPrefix(pendingPane || focusedPane)
          return
        }
        swallow(event)
        runShortcut(store, action, pendingPane || focusedPane)
      }
      const onBlur = () => clearPrefix(true)
      window.addEventListener('keydown', onKey, true)
      window.addEventListener('blur', onBlur)
      return () => {
        clearPrefix(false)
        window.removeEventListener('keydown', onKey, true)
        window.removeEventListener('pointerdown', onPointer, true)
        window.removeEventListener('blur', onBlur)
      }
    }

    function mountApp(store) {
      let host = document.getElementById(ROOT_ID)
      if (!host) {
        host = el('div', { id: ROOT_ID })
        document.body.append(host)
      }
      let redrawFrame = 0
      const redraw = () => {
        redrawFrame = 0
        // A touch scroll in progress owns the screen; repaint when it ends.
        if (gestureGuard.holding()) { gestureGuard.pending = true; return }
        paint(host, store)
      }
      const scheduleRedraw = () => {
        if (!redrawFrame) redrawFrame = requestAnimationFrame(redraw)
      }
      gestureGuard.onEnd = scheduleRedraw
      const off = store.subscribe(scheduleRedraw)
      const offKeys = bindKeys(host, store)
      // The keyboard toggle mirrors whether a terminal actually has focus
      // (the on-screen keyboard follows that focus on mobile). Evaluation is
      // frame-deferred: focusout fires while focus is still in transit, and
      // acting on that intermediate state flashed the collapsed toolbar rows
      // when refocusing from one pane to another.
      let kbdFrame = 0
      let focusGraceUntil = 0
      const updateKbd = () => {
        if (kbdFrame) return
        kbdFrame = requestAnimationFrame(() => {
          kbdFrame = 0
          syncKbdState()
        })
      }
      const syncKbdState = () => {
        const on = terminalFocused()
        if (on) focusGraceUntil = Date.now() + 1200
        const btn = host.querySelector('[data-tmux-cc-kbd]')
        if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false')
        const shell = host.querySelector('[data-tmux-cc-shell]')
        if (shell) {
          if (on) shell.dataset.kbd = '1'
          else delete shell.dataset.kbd
        }
        // Focusing the xterm textarea makes iOS scroll overflow:hidden
        // ancestors to "reveal" the caret, silently shoving pane content out
        // of its box. Undo that; the canvas keeps its own scroll position.
        if (on) {
          requestAnimationFrame(() => {
            for (const rec of store.panes.values()) {
              if (!rec.wrap) continue
              if (rec.wrap.scrollTop) rec.wrap.scrollTop = 0
              if (rec.wrap.scrollLeft) rec.wrap.scrollLeft = 0
              if (rec.termHost.scrollTop) rec.termHost.scrollTop = 0
              if (rec.termHost.scrollLeft) rec.termHost.scrollLeft = 0
            }
          })
        }
        // The visual viewport, not focus, determines space above the keyboard.
        scheduleRedraw()
      }
      window.addEventListener('focusin', updateKbd)
      window.addEventListener('focusout', updateKbd)
      // If focus reveal or a stray gesture scrolls the document or app root,
      // snap it back so the full-page terminal stays aligned.
      // Except right after focusing a terminal: fighting Safari's
      // scroll-into-view during the keyboard's opening animation makes iOS
      // abort showing the keyboard. The transform tracker keeps the shell
      // aligned through that grace window anyway.
      const onStrayScroll = (ev) => {
        if (!isTouchViewport() || Math.abs((window.visualViewport?.scale || 1) - 1) > 0.01) return
        if (Date.now() < focusGraceUntil) return
        if (ev.target === document || ev.target === document.documentElement || ev.target === document.body) {
          if (window.scrollX || window.scrollY) window.scrollTo(0, 0)
        } else if (ev.target === host) {
          if (host.scrollTop) host.scrollTop = 0
          if (host.scrollLeft) host.scrollLeft = 0
        }
      }
      window.addEventListener('scroll', onStrayScroll, true)
      const ro = new ResizeObserver(scheduleRedraw)
      ro.observe(host)
      // Observe the usable pane area too (safe areas/header/keyboard), not
      // only the root whose layout-viewport dimensions can remain unchanged.
      paint(host, store)
      ro.observe(host.querySelector('[data-tmux-cc-body]'))
      const onVisibility = () => {
        if (document.hidden) store.clearResize()
        else scheduleRedraw()
      }
      document.addEventListener('visibilitychange', onVisibility)
      const timer = window.setInterval(() => store.maybeAutoAttach(), 1500)
      const onWin = () => scheduleRedraw()
      window.addEventListener('resize', onWin)
      const visualViewport = window.visualViewport
      let viewportPlaceFrame = 0
      const onViewportChange = () => {
        // Moving or resizing the visual viewport must reposition the mobile
        // shell immediately — placeShell only touches transform (and size on
        // real changes), so this stays cheap on every iOS scroll frame and is
        // never deferred behind the gesture paint guard.
        if (viewportPlaceFrame) return
        viewportPlaceFrame = requestAnimationFrame(() => {
          viewportPlaceFrame = 0
          const shell = host.querySelector('[data-tmux-cc-shell]')
          if (shell) placeShell(shell)
        })
      }
      if (visualViewport) {
        visualViewport.addEventListener('resize', onWin)
        visualViewport.addEventListener('resize', onViewportChange)
        visualViewport.addEventListener('scroll', onViewportChange)
      }
      store.connect()
      scheduleRedraw()
      return () => {
        off()
        offKeys()
        gestureGuard.onEnd = null
        gestureGuard.pending = false
        gestureGuard.owners.clear()
        clearTimeout(gestureGuard.timer)
        window.removeEventListener('focusin', updateKbd)
        window.removeEventListener('focusout', updateKbd)
        window.removeEventListener('scroll', onStrayScroll, true)
        ro.disconnect()
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('resize', onWin)
        if (visualViewport) {
          visualViewport.removeEventListener('resize', onWin)
          visualViewport.removeEventListener('resize', onViewportChange)
          visualViewport.removeEventListener('scroll', onViewportChange)
        }
        if (redrawFrame) cancelAnimationFrame(redrawFrame)
        if (viewportPlaceFrame) cancelAnimationFrame(viewportPlaceFrame)
        if (kbdFrame) cancelAnimationFrame(kbdFrame)
        window.clearInterval(timer)
        store.dispose()
        host.remove()
      }
    }

    /** Settings: browser-local terminal preferences plus the one host-shared sizing policy. */
    function openSettings(host, store, trigger) {
      if (store.closeSettings) return
      const dialog = el('dialog', { 'data-tmux-cc-manager': '', 'data-tmux-cc-settings': '', 'aria-labelledby': 'tmux-cc-settings-title' })
      const heading = el('h2', { id: 'tmux-cc-settings-title', text: t('settings'), tabIndex: -1 })
      const done = el('button', { type: 'button', text: t('done'), onClick: () => dialog.close() })
      const field = (text, input, help) => el('label', { 'data-tmux-cc-field': '' }, el('span', { text }), input, help ? el('small', { text: help }) : null)
      const check = (text, input, help) => el('div', {},
        el('label', { 'data-tmux-cc-check': '' }, input, el('span', { text })),
        help ? el('small', { 'data-tmux-cc-help': '', text: help }) : null)
      const stat = (label) => {
        const value = el('dd')
        return { row: [el('dt', { text: label }), value], value }
      }
      const prefsNow = () => store.get().prefs
      const number = (attrs, key) => el('input', {
        type: 'number', ...attrs,
        onChange: (ev) => { if (ev.target.value !== '') store.setPrefs({ [key]: Number(ev.target.value) }) },
      })

      // Sizing
      const state = stat(t('state'))
      const mode = stat(t('sizeMode'))
      const viewers = stat(t('viewers'))
      const policy = el('select', { 'aria-label': t('sizingPolicy'), disabled: true },
        el('option', { value: 'primary', text: t('sizingPrimary') }),
        el('option', { value: 'auto', text: t('sizingAuto') }),
        el('option', { value: 'mirror', text: t('sizingMirror') }))
      const policyError = el('span', { role: 'alert', 'data-tmux-cc-manager-error': '' })
      let shared = null
      let saving = false
      const settingsUrl = new URL('./tmux-cc/settings', location.href)
      const controller = new AbortController()
      fetch(settingsUrl, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(t('settingsLoadFailed'))
          return response.json()
        })
        .then((json) => { shared = json; render() })
        .catch((error) => { if (error.name !== 'AbortError') { policyError.textContent = error.message; render() } })
      policy.addEventListener('change', async () => {
        if (!shared || saving) return
        const next = policy.value === 'mirror' ? 'mirror' : 'auto'
        // Optimistic: render() would otherwise snap the select back to the old host value.
        shared = { ...shared, sizePolicy: next }
        saving = true
        policyError.textContent = ''
        render()
        try {
          const response = await fetch(settingsUrl, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sizePolicy: next }),
          })
          if (!response.ok) throw new Error(t('settingsSaveFailed'))
          shared = await response.json()
        } catch (error) {
          policyError.textContent = error.message
          shared = null
          fetch(settingsUrl, { signal: controller.signal }).then((r) => r.ok ? r.json() : null).then((json) => { shared = json; render() }).catch(() => {})
        }
        finally { saving = false; render() }
      })

      // Terminal
      const fontList = el('datalist', { id: 'tmux-cc-fonts' })
      const font = el('input', {
        type: 'text', list: 'tmux-cc-fonts', placeholder: t('fontPlaceholder'), autocomplete: 'off', spellcheck: 'false',
        onFocus: () => {
          if (fontList.childElementCount || typeof navigator.queryLocalFonts !== 'function') return
          navigator.queryLocalFonts().then((list) => {
            const names = [...new Set(list.map((f) => f.family))].sort((a, b) => a.localeCompare(b))
            fontList.replaceChildren(...names.map((name) => el('option', { value: `"${name}", monospace` })))
          }).catch(() => {})
        },
        onChange: (ev) => store.setPrefs({ fontFamily: ev.target.value }),
      })
      const fontSize = number({ min: 8, max: 32, step: 0.25, inputmode: 'decimal' }, 'fontSize')
      const touchSize = number({ min: 6, max: 24, step: 1, inputmode: 'numeric' }, 'mobileFontFloor')
      const cursorStyle = el('select', { onChange: (ev) => store.setPrefs({ cursorStyle: ev.target.value }) },
        el('option', { value: 'block', text: t('cursorBlock') }),
        el('option', { value: 'underline', text: t('cursorUnderline') }),
        el('option', { value: 'bar', text: t('cursorBar') }))
      const cursorBlink = el('input', { type: 'checkbox', onChange: (ev) => store.setPrefs({ cursorBlink: ev.target.checked }) })
      const scrollback = number({ min: 0, max: MAX_SCROLLBACK_LINES, step: 100, inputmode: 'numeric' }, 'scrollbackLines')

      // Behavior
      const confirmKill = el('input', { type: 'checkbox', onChange: (ev) => store.setPrefs({ confirmKill: ev.target.checked }) })
      const compactSplits = el('input', { type: 'checkbox', onChange: (ev) => store.setPrefs({ compactSplitShortcuts: ev.target.checked }) })
      const reset = el('button', { type: 'button', text: t('reset'), onClick: () => store.resetPrefs() })

      const keys = (text) => el('code', { 'data-tmux-cc-keys': '', text })
      const content = el('div', { 'data-tmux-cc-manager-content': '' },
        el('section', {}, el('h3', { text: t('sizing') }),
          el('dl', { 'data-tmux-cc-stats': '' }, ...state.row, ...mode.row, ...viewers.row),
          field(t('sizingPolicy'), policy, t('sizingHelp')), policyError),
        el('section', {}, el('h3', { text: t('terminal') }),
          field(t('font'), font, t('fontHelp')), fontList,
          el('div', { 'data-tmux-cc-field-row': '' },
            field(t('fontSize'), fontSize, t('fontSizeHelp')),
            field(t('touchSize'), touchSize, t('touchSizeHelp'))),
          el('div', { 'data-tmux-cc-field-row': '' },
            field(t('cursorStyle'), cursorStyle),
            field(t('scrollback'), scrollback, t('scrollbackHelp'))),
          check(t('cursorBlink'), cursorBlink)),
        el('section', {}, el('h3', { text: t('keys') }),
          el('p', {}, el('strong', { text: `${t('prefixKeys')}: ` }), keys(t('keysHelp'))),
          el('p', {}, el('strong', { text: `${t('itermKeys')}: ` }), keys(t('itermKeysHelp'))),
          el('p', {}, el('strong', { text: `${t('touchKeys')}: ` }), t('touchKeysHelp')),
          el('p', { text: t('shortcutSafety') }),
          check(t('compactSplit'), compactSplits, t('compactSplitHelp'))),
        el('section', {}, el('h3', { text: t('behavior') }),
          check(t('confirmKill'), confirmKill),
          el('div', { 'data-tmux-cc-manager-actions': '' }, reset, el('small', { text: t('resetHelp') }))))
      dialog.append(el('header', {}, heading, done), content)
      host.append(dialog)

      const setIfIdle = (input, value) => {
        if (document.activeElement === input) return
        if (input.type === 'checkbox') input.checked = !!value
        else if (String(input.value) !== String(value)) input.value = value
      }
      function render() {
        const { prefs, snapshot } = store.get()
        const attached = !!(snapshot && snapshot.attached)
        const panes = snapshot && snapshot.panes ? snapshot.panes.length : 0
        const sizeMode = (snapshot && snapshot.sizeMode) || 'mirror'
        state.value.textContent = attached
          ? `${t('attached')} · ${snapshot.session} · ${panes} ${panes === 1 ? t('pane') : t('panes')} · ${snapshot.cols}×${snapshot.rows}`
          : t('detached')
        const policyNow = shared?.sizePolicy || snapshot?.sizePolicy || 'primary'
        mode.value.textContent = !attached ? '—'
          : sizeMode === 'takeover' ? `${policyNow === 'auto' ? t('modeAuto') : t('modePrimary')} — ${t('modeAutoShort')}`
            : `${t('modeMirror')} — ${t('modeMirrorShort')}`
        viewers.value.textContent = String((snapshot && snapshot.viewers) || 0)
        const sizePolicy = policyNow
        setIfIdle(policy, sizePolicy)
        policy.disabled = !shared || saving
        policy.title = shared ? '' : t('settingsUnavailable')
        setIfIdle(font, prefs.fontFamily || '')
        font.style.fontFamily = termFontFamily(prefs)
        setIfIdle(fontSize, prefs.fontSize)
        setIfIdle(touchSize, prefs.mobileFontFloor)
        setIfIdle(cursorStyle, prefs.cursorStyle)
        setIfIdle(cursorBlink, prefs.cursorBlink)
        setIfIdle(scrollback, prefs.scrollbackLines)
        setIfIdle(confirmKill, prefs.confirmKill)
        setIfIdle(compactSplits, prefs.compactSplitShortcuts)
        for (const code of content.querySelectorAll('[data-tmux-cc-keys]')) code.style.fontFamily = termFontFamily(prefs)
      }
      const off = store.subscribe(render)
      const position = () => {
        const box = mobileViewportBox()
        dialog.style.maxHeight = `${Math.max(120, box.height - 24)}px`
        dialog.style.top = `${box.y + 12}px`
      }
      const viewport = window.visualViewport
      window.addEventListener('resize', position)
      viewport?.addEventListener('resize', position)
      viewport?.addEventListener('scroll', position)
      let closed = false
      const cleanup = () => {
        if (closed) return
        closed = true
        controller.abort()
        off()
        dialog.remove()
        window.removeEventListener('resize', position)
        viewport?.removeEventListener('resize', position)
        viewport?.removeEventListener('scroll', position)
        store.closeSettings = null
        if (trigger.isConnected) trigger.focus({ preventScroll: true })
      }
      dialog.addEventListener('close', cleanup)
      store.closeSettings = () => { dialog.close(); cleanup() }
      render()
      position()
      dialog.showModal()
      heading.focus({ preventScroll: true })
    }

    mountApp(createStore())
