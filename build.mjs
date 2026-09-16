import { build } from 'esbuild'
import { cp, mkdir, chmod, rm } from 'node:fs/promises'

await rm('dist', { recursive: true, force: true })
await mkdir('dist/web/vendor', { recursive: true })
await build({ entryPoints: ['server.ts'], outfile: 'dist/server.js', bundle: true, platform: 'node', format: 'esm', packages: 'external', target: 'node22' })
await build({ entryPoints: ['lib/client.js'], outfile: 'dist/web/app.js', bundle: true, format: 'esm', minify: true, legalComments: 'eof' })
await cp('web', 'dist/web', { recursive: true })
await cp('node_modules/@xterm/xterm/lib/xterm.js', 'dist/web/vendor/xterm.js')
await cp('node_modules/@xterm/xterm/css/xterm.css', 'dist/web/vendor/xterm.css')
await cp('node_modules/@xterm/xterm/LICENSE', 'dist/web/vendor/LICENSE')
await chmod('dist/server.js', 0o755)
