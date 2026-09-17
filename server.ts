#!/usr/bin/env node
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { WebSocket, WebSocketServer } from 'ws'
import { TmuxRuntime } from './src/runtime.ts'

export async function startServer({
  host = process.env.HOST || '127.0.0.1',
  port = Number(process.env.PORT || 8080),
  tmuxBin = process.env.TMUX_BIN || 'tmux',
  settingsFile = process.env.SETTINGS_FILE || join(homedir(), '.config', 'web-tmux-cc.json'),
} = {}) {
  let sizePolicy: 'primary' | 'auto' | 'mirror' = 'primary'
  try {
    const settings = JSON.parse(await readFile(settingsFile, 'utf8'))
    if (settings.sizePolicy === 'primary' || settings.sizePolicy === 'auto' || settings.sizePolicy === 'mirror') sizePolicy = settings.sizePolicy
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  const runtimes = new Set<TmuxRuntime>()
  const web = new URL('./web/', import.meta.url)
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }
  const assets = new Map<string, { data: Buffer; type: string; etag: string }>()
  for (const file of ['index.html', 'app.js', 'app.css', 'manifest.webmanifest', 'icon.svg', 'vendor/xterm.js', 'vendor/xterm.css']) {
    const data = await readFile(new URL(file, web))
    const etag = `"${createHash('sha1').update(data).digest('base64url')}"`
    assets.set(file.split('/').at(-1)!, { data, type: mime[file.slice(file.lastIndexOf('.'))], etag })
  }
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost')
      const path = url.pathname
      if (path.endsWith('/tmux-cc/settings')) {
        if (req.method === 'POST') {
          let body = ''
          for await (const chunk of req) body += chunk
          const next = JSON.parse(body).sizePolicy
          if (next !== 'primary' && next !== 'auto' && next !== 'mirror') throw new Error('Expected sizePolicy: primary, auto or mirror')
          await mkdir(dirname(settingsFile), { recursive: true })
          await writeFile(settingsFile, JSON.stringify({ sizePolicy: next }) + '\n')
          sizePolicy = next
          for (const runtime of runtimes) runtime.settingsChanged()
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ sizePolicy }))
        return
      }
      const name = path.endsWith('/') ? 'index.html' : path.split('/').at(-1)!
      const asset = assets.get(name)
      if (!asset && !name.includes('.')) {
        res.writeHead(302, { Location: path + '/' + url.search }); res.end(); return
      }
      if (!asset) { res.writeHead(404); res.end('Not found'); return }
      // Deployments replace the bundle in place: always revalidate, never serve a stale build.
      if (req.headers['if-none-match'] === asset.etag) { res.writeHead(304, { ETag: asset.etag, 'Cache-Control': 'no-cache' }); res.end(); return }
      res.writeHead(200, { 'Content-Type': asset.type, ETag: asset.etag, 'Cache-Control': 'no-cache' })
      res.end(req.method === 'HEAD' ? undefined : asset.data)
    } catch (error) { res.writeHead(400); res.end(error.message) }
  })
  const sockets = new WebSocketServer({ noServer: true })
  server.on('upgrade', (req, socket, head) => {
    if (!new URL(req.url || '/', 'http://localhost').pathname.endsWith('/tmux-cc/ws')) { socket.destroy(); return }
    sockets.handleUpgrade(req, socket, head, ws => {
      // The plugin's runtime is unchanged. A browser owns its own selection.
      const runtime = new TmuxRuntime({ tmuxBin, getSizePolicy: () => sizePolicy })
      runtimes.add(runtime)
      runtime.bind({
        send(data) { if (ws.readyState === WebSocket.OPEN) ws.send(data) },
        close(code, reason) { ws.close(code, reason) },
        on(event, callback) {
          if (event === 'message') ws.on('message', data => callback(String(data)))
          else ws.on('close', callback)
        },
      })
      ws.on('close', () => { runtimes.delete(runtime); runtime.dispose() })
    })
  })
  await new Promise<void>((done, fail) => { server.once('error', fail); server.listen(port, host, done) })
  const address = server.address() as { port: number }
  return {
    url: `http://${host.includes(':') ? `[${host}]` : host}:${address.port}/`,
    async close() {
      for (const runtime of runtimes) runtime.dispose()
      for (const socket of sockets.clients) socket.terminate()
      sockets.close()
      await new Promise<void>(done => server.close(() => done()))
    },
  }
}

if (process.argv[1] && await realpath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = await startServer()
  console.log(`web-tmux-cc: ${app.url}`)
  process.once('SIGINT', () => void app.close())
  process.once('SIGTERM', () => void app.close())
}
