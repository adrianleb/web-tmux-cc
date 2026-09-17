# web-tmux-cc

The tmux plugin in its own web page, without DSH. Node.js 22.6+ and tmux required.

```sh
npm install
npm run build
npm start
```

Open `http://localhost:8080/`. No login or token is required. This grants terminal access as the server's OS user: expose it only to trusted users, using your own network or proxy configuration.

Configure with environment variables:

- `HOST`: listening address, default `127.0.0.1`; other addresses are supported.
- `PORT`: listening port, default `8080`.
- `TMUX_BIN`: tmux executable or wrapper, default `tmux` from PATH. A wrapper can select your socket or other tmux options.
- `SETTINGS_FILE`: shared sizing preference file, default `~/.config/web-tmux-cc.json`.

The terminal engine is copied from the plugin. The page fills the window instead of docking inside DSH. Tabs choose their sessions independently; tmux window/pane state remains native and shared. Opening the page does not create or select a session. Closing the page or stopping the server does not kill your tmux sessions.

Every pane renders its exact tmux grid at one shared font size. Pane titles live in tmux's own separator rows (one cell tall, like `pane-border-status top`), so pane boxes are exact cell multiples: no per-pane font drift between uneven splits, no dead space inside panes, and splitting or zooming never resizes the tmux window. The grid is a canvas: when it is wider than the page, the page scrolls sideways; panes themselves never scroll horizontally.

Sizing policy (Settings, shared by the host): **Primary** (default) makes the page the window's sizing client — it resizes the tmux window to fit itself at your font size even while a terminal or iTerm2 `-CC` client is attached (those see the window at the page's size until the page detaches, which hands sizing back). With several pages on one session, the one you last typed in or resized is the sizer and the others mirror it. **Auto** takes over only when no other sizing client exists. **Mirror** never resizes tmux: the page shows the exact remote grid, shrinking the font to fit the height, never below the touch text size on phones and tablets. The header pill shows the effective mode and the current grid. Pinch zoom magnifies the page without shrinking the tmux grid. The header stays on one row, with horizontally scrollable controls when space is tight.

Reconnecting re-seeds each pane from `capture-pane`, restoring the cursor position, line-drawing charset, alternate screen, and mouse/cursor modes so TUI panes keep scrolling and prompts keep their cursor after a reload.

For a global installation, `npm install -g .` installs the `web-tmux-cc` executable, which starts the server directly. There are no subcommands. Hosting, HTTPS, and access control belong to your deployment, not this application.

## Release installation

The [GitHub releases](https://github.com/adrianleb/web-tmux-cc/releases) include a prebuilt npm package. With Node.js 22.6+ and tmux installed:

```sh
npm install -g https://github.com/adrianleb/web-tmux-cc/releases/download/v0.3.0/web-tmux-cc-0.3.0.tgz
web-tmux-cc
```

## Development tests

Tests use isolated tmux sockets and require Playwright browsers:

```sh
npm ci
npx playwright install chromium webkit
npm run build
npm test
TEST_BROWSER=webkit npm test
```

On Linux, Playwright may also require system libraries (`npx playwright install-deps`).
