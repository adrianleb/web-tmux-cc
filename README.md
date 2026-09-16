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

Auto sizing fits the visible page on desktop, tablet, and phone, including rotation and the on-screen keyboard. Pinch zoom magnifies the page without shrinking the tmux grid. Other sizing clients or the Mirror-only setting preserve the remote grid; on touch screens an oversized mirror remains pannable. The header stays on one row, with horizontally scrollable controls when space is tight.

For a global installation, `npm install -g .` installs the `web-tmux-cc` executable, which starts the server directly. There are no subcommands. Hosting, HTTPS, and access control belong to your deployment, not this application.

## Release installation

The [GitHub releases](https://github.com/adrianleb/web-tmux-cc/releases) include a prebuilt npm package. With Node.js 22.6+ and tmux installed:

```sh
npm install -g https://github.com/adrianleb/web-tmux-cc/releases/download/v0.2.0/web-tmux-cc-0.2.0.tgz
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
