import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { chromium, webkit, expect } from '@playwright/test'
import { startServer } from './dist/server.js'

const exec = promisify(execFile)
const browserType = process.env.TEST_BROWSER === 'webkit' ? webkit : chromium
test('standalone page opens directly and preserves plugin terminal interactions', { timeout: 60000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'web-tmux-test-'))
  const socket = `web-tmux-test-${randomUUID()}`
  const binary = process.env.TMUX_TEST_BIN || 'tmux'
  const native = (...args) => exec(binary, ['-L', socket, '-f', '/dev/null', ...args])
  const wrapper = join(dir, 'tmux')
  const quote = value => `'${value.replaceAll("'", "'\\''")}'`
  await writeFile(wrapper, `#!/bin/sh\nexec ${quote(binary)} -L ${quote(socket)} -f /dev/null "$@"\n`, { mode: 0o755 })
  let app, browser
  try {
    await native('new-session', '-d', '-s', 'alpha', '-x', '100', '-y', '30', 'cat')
    await native('new-session', '-d', '-s', 'beta', 'cat')
    app = await startServer({ port: 0, tmuxBin: wrapper, settingsFile: join(dir, 'settings.json') })
    const response = await fetch(app.url)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('set-cookie'), null)
    assert.doesNotMatch(await response.text(), /bootstrap|sign.in|authenticate/i)
    browser = await browserType.launch({ headless: true })
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(app.url)
    const sessions = page.locator('[data-tmux-cc-session]')
    await expect(sessions.locator('option[value="alpha"]')).toHaveCount(1)
    await expect(page.locator('.xterm')).toHaveCount(0)
    await sessions.selectOption('alpha')
    await expect(page.locator('.xterm')).toHaveCount(1)
    await page.locator('.xterm').click()
    await page.keyboard.type('standalone-input')
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await native('capture-pane', '-p', '-t', 'alpha')).stdout).toContain('standalone-input')
    await page.locator('[data-tmux-cc-split-h]').click()
    await expect(page.locator('.xterm')).toHaveCount(2)
    await page.locator('[data-tmux-cc-zoom]').click()
    await expect.poll(async () => (await native('display-message', '-p', '-t', 'alpha', '#{window_zoomed_flag}')).stdout.trim()).toBe('1')
    await page.locator('[data-tmux-cc-zoom]').click()
    const peer = await context.newPage()
    await peer.goto(app.url)
    await expect(peer.locator('.xterm')).toHaveCount(0)
    await peer.locator('[data-tmux-cc-session]').selectOption('beta')
    await expect(peer.locator('.xterm')).toHaveCount(1)
    await expect(sessions).toHaveValue('alpha')
    await page.reload()
    await expect(page.locator('.xterm')).toHaveCount(2)
    await expect(sessions).toHaveValue('alpha')
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const phone = await mobile.newPage()
    phone.on('pageerror', error => errors.push(error.message))
    await phone.goto(app.url + '?session=beta')
    await expect(phone.locator('.xterm')).toHaveCount(1)
    await expect(phone.locator('[data-tmux-cc-kbd]')).toBeVisible()
    const shell = await phone.locator('[data-tmux-cc-shell]').boundingBox()
    assert.ok(shell && shell.width >= 388 && shell.height >= 800, 'terminal fills the phone viewport')
    await phone.locator('[data-tmux-cc-kbd]').click()
    await phone.keyboard.type('mobile-input')
    await phone.keyboard.press('Enter')
    await expect.poll(async () => (await native('capture-pane', '-p', '-t', 'beta')).stdout).toContain('mobile-input')
    if (process.env.SCREENSHOT_DIR) {
      await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, 'desktop.png') })
      await phone.screenshot({ path: join(process.env.SCREENSHOT_DIR, 'mobile.png') })
    }
    assert.deepEqual(errors, [])
    const before = (await native('list-panes', '-a', '-F', '#{pane_id}:#{pane_pid}')).stdout
    await browser.close(); browser = null
    await app.close(); app = null
    assert.equal((await native('list-panes', '-a', '-F', '#{pane_id}:#{pane_pid}')).stdout, before)
  } finally {
    if (browser) await browser.close()
    if (app) await app.close()
    await native('kill-server').catch(() => {})
    await rm(dir, { recursive: true, force: true })
  }
})

test('touch viewport, native Auto grid, Mirror policy, and startup splash regressions', { timeout: 90000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'web-tmux-viewport-test-'))
  const socket = `web-tmux-viewport-test-${randomUUID()}`
  const binary = process.env.TMUX_TEST_BIN || 'tmux'
  const native = (...args) => exec(binary, ['-L', socket, '-f', '/dev/null', ...args])
  const wrapper = join(dir, 'tmux')
  const quote = value => `'${value.replaceAll("'", "'\\''")}'`
  await writeFile(wrapper, `#!/bin/sh\nexec ${quote(binary)} -L ${quote(socket)} -f /dev/null "$@"\n`, { mode: 0o755 })
  let app, browser, releaseBundle
  try {
    await native('new-session', '-d', '-s', 'tablet', '-x', '100', '-y', '30', 'cat')
    app = await startServer({ port: 0, tmuxBin: wrapper, settingsFile: join(dir, 'settings.json') })
    browser = await browserType.launch({ headless: true })
    const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true })
    await context.addInitScript(() => {
      // A known installed generic family makes canvas/grid checks portable.
      // Deliberately distinguish desktop fontSize from the touch font choice.
      localStorage.setItem('web-tmux-cc:preferences', JSON.stringify({ version: 3, prefs: {
        fontFamily: 'monospace', fontSize: 17, mobileFontFloor: 12,
      } }))
      const viewport = window.visualViewport
      const keys = ['width', 'height', 'offsetLeft', 'offsetTop', 'scale']
      const originals = keys.map(key => Object.getOwnPropertyDescriptor(viewport, key))
      window.testVisualViewport = values => {
        keys.forEach((key, index) => {
          if (values) Object.defineProperty(viewport, key, { configurable: true, get: () => values[key] })
          else if (originals[index]) Object.defineProperty(viewport, key, originals[index])
          else delete viewport[key]
        })
        viewport.dispatchEvent(new Event('resize'))
        viewport.dispatchEvent(new Event('scroll'))
      }
    })
    const page = await context.newPage()
    const errors = []
    const reports = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('websocket', ws => ws.on('framesent', ({ payload }) => {
      const message = JSON.parse(String(payload))
      if (message.type === 'resize' && message.cols) reports.push({ cols: message.cols, rows: message.rows })
    }))

    // Exercise the actual current HTML/CSS before allowing its current bundle
    // to execute, rather than comparing against a frozen/old app.js fixture.
    const bundleGate = new Promise(resolve => { releaseBundle = resolve })
    await page.route('**/app.js', async route => { await bundleGate; await route.continue() })
    await page.goto(app.url + '?session=tablet', { waitUntil: 'commit' })
    const splash = page.locator('[data-tmux-cc-loading]')
    await expect(splash).toBeVisible()
    await expect(splash).toHaveAttribute('role', 'status')
    await expect(splash.locator('strong')).toHaveText('web-tmux-cc')
    await expect(splash).toContainText('Loading terminal')
    await expect.poll(() => splash.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
    await expect(page.locator('.xterm')).toHaveCount(0)
    releaseBundle()
    await page.waitForLoadState('load')
    await page.unroute('**/app.js')
    await expect(splash).toHaveCount(0)
    await expect(page.locator('.xterm')).toHaveCount(1)
    assert.equal(await page.evaluate(() => matchMedia('(any-pointer: coarse)').matches), true)

    const shell = page.locator('[data-tmux-cc-shell]')
    const header = page.locator('[data-tmux-cc-header]')
    const bar = page.locator('[data-tmux-cc-bar]')
    const settings = page.getByRole('button', { name: 'Settings', exact: true })
    const nativeGrid = async () => {
      const { stdout } = await native('display-message', '-p', '-t', 'tablet', '#{window_width} #{window_height}')
      const [cols, rows] = stdout.trim().split(' ').map(Number)
      return { cols, rows }
    }
    const expectedGrid = (fontSize = 12, stacks = 1) => page.evaluate(({ fontSize, stacks }) => {
      const body = document.querySelector('[data-tmux-cc-body]').getBoundingClientRect()
      const title = document.querySelector('[data-tmux-cc-ptitle]').getBoundingClientRect()
      const canvas = document.createElement('canvas').getContext('2d')
      canvas.font = `${fontSize}px monospace`
      const cell = canvas.measureText('W')
      const height = Math.ceil((cell.fontBoundingBoxAscent + cell.fontBoundingBoxDescent) * devicePixelRatio) / devicePixelRatio
      return { cols: Math.floor(body.width / cell.width), rows: Math.floor((body.height - title.height * stacks) / height) }
    }, { fontSize, stacks })
    const fittedPanes = async () => {
      const { stdout } = await native('list-panes', '-t', 'tablet', '-F', '#{pane_id} #{pane_height}')
      const rows = Object.fromEntries(stdout.trim().split('\n').map(line => line.split(' ')))
      return page.locator('[data-tmux-cc-pane]').evaluateAll((panes, rows) => panes.flatMap(pane => {
        const term = pane.querySelector('.xterm')
        const screen = pane.querySelector('.xterm-screen')
        if (!term || !screen) return [`${pane.dataset.paneId}: terminal not mounted`]
        const host = term.parentElement
        const box = host.getBoundingClientRect()
        const grid = screen.getBoundingClientRect()
        const failures = []
        if (grid.width <= 0 || grid.height <= 0 || grid.width > host.clientWidth + 1 || grid.height > host.clientHeight + 1) {
          failures.push(`${pane.dataset.paneId}: screen ${grid.width}x${grid.height} overflows host ${host.clientWidth}x${host.clientHeight}`)
        }
        if (Math.abs(grid.left - box.left) > 1 || Math.abs(grid.top - box.top) > 1) {
          failures.push(`${pane.dataset.paneId}: nonzero left/top host margins ${grid.left - box.left},${grid.top - box.top}`)
        }
        const renderedRows = pane.querySelector('.xterm-rows')?.children.length
        if (renderedRows !== Number(rows[pane.dataset.paneId])) failures.push(`${pane.dataset.paneId}: rendered rows ${renderedRows} != tmux ${rows[pane.dataset.paneId]}`)
        return failures
      }), rows)
    }
    const autoGrid = async (fontSize = 12, stacks = 1) => {
      // setViewportSize resolves before the visualViewport event is painted.
      // Do not accidentally accept the previous orientation's settled grid.
      const viewport = await page.evaluate(() => ({
        width: Math.round(visualViewport.width * visualViewport.scale),
        height: Math.round(visualViewport.height * visualViewport.scale),
      }))
      await expect.poll(async () => {
        const { width, height } = await shell.boundingBox()
        return { width, height }
      }).toEqual(viewport)
      await expect(shell).toHaveAttribute('data-size-mode', 'takeover')
      const expected = await expectedGrid(fontSize, stacks)
      await expect.poll(async () => ({ report: reports.at(-1), native: await nativeGrid() }), { timeout: 10000 })
        .toEqual({ report: expected, native: expected })
      await expect.poll(fittedPanes).toEqual([])
      return expected
    }
    const initialHeader = (await header.boundingBox()).height
    const checkChrome = async (width, height, y = 0) => {
      await expect(shell).toHaveAttribute('data-mobile', '1')
      await expect.poll(async () => {
        const box = await shell.boundingBox()
        return Object.fromEntries(Object.entries(box).map(([key, value]) => [key, Math.round(value)]))
      }).toEqual({ x: 0, y, width, height })
      await expect(header).toHaveCount(1)
      const boxes = await Promise.all([header, header.locator('strong'), bar, settings].map(node => node.boundingBox()))
      const centers = boxes.slice(1).map(box => box.y + box.height / 2)
      assert.ok(Math.max(...centers) - Math.min(...centers) <= 1, 'title, controls, and settings share a single row')
      assert.equal(boxes[0].height, initialHeader, 'header height is stable across rotation/keyboard/breakpoint')
      await expect(header.locator('strong')).toBeInViewport()
      await expect(settings).toBeInViewport()
      // Narrow layouts intentionally scroll the bar: every control must remain
      // reachable, without pushing the title/settings off-screen or wrapping.
      for (const key of ['session', 'kbd', 'font-down', 'font-up', 'split-h', 'split-v', 'zoom', 'link']) {
        const control = page.locator(`[data-tmux-cc-${key}]`)
        await expect(control).toBeVisible()
        await control.scrollIntoViewIfNeeded()
        await expect(control).toBeInViewport()
        await expect(settings).toBeInViewport()
      }
      await bar.evaluate(node => { node.scrollLeft = 0 })
    }
    const screenshot = async name => {
      if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, `web-tmux-tablet-${name}.png`) })
    }

    const landscape = await autoGrid()
    assert.notDeepEqual(landscape, { cols: 100, rows: 30 }, 'Auto takes over the isolated native window on touch')
    await checkChrome(1180, 820)
    await screenshot('landscape')
    await page.setViewportSize({ width: 820, height: 1180 })
    const portrait = await autoGrid()
    assert.ok(portrait.cols < landscape.cols && portrait.rows > landscape.rows, 'rotation changes actual native columns and rows')
    await checkChrome(820, 1180)
    await screenshot('portrait')
    await page.setViewportSize({ width: 1180, height: 820 })
    assert.deepEqual(await autoGrid(), landscape, 'landscape dimensions recover after rotation')
    await checkChrome(1180, 820)
    await page.setViewportSize({ width: 390, height: 844 })
    const phone = await autoGrid()
    assert.ok(phone.cols < portrait.cols, 'Auto remains enabled below the 768px breakpoint')
    await checkChrome(390, 844)
    assert.equal(await bar.evaluate(node => getComputedStyle(node).overflowX === 'auto' && node.scrollWidth > node.clientWidth), true)
    await page.setViewportSize({ width: 1180, height: 820 })
    assert.deepEqual(await autoGrid(), landscape)

    // Playwright does not emulate a native software keyboard. Focus is real;
    // its visualViewport resize/pan is deterministic and restored afterward.
    await page.locator('[data-tmux-cc-kbd]').click()
    await expect(page.locator('.xterm-helper-textarea')).toBeFocused()
    await page.evaluate(() => window.testVisualViewport({ width: 1180, height: 490, offsetLeft: 0, offsetTop: 24, scale: 1 }))
    const keyboard = await autoGrid()
    assert.equal(keyboard.cols, landscape.cols)
    assert.ok(keyboard.rows < landscape.rows, 'keyboard shrinks native rows at tablet width')
    assert.deepEqual(await page.evaluate(() => [innerWidth, innerHeight]), [1180, 820], 'layout viewport did not resize')
    await checkChrome(1180, 490, 24)
    await screenshot('keyboard')
    await page.locator('[data-tmux-cc-kbd]').click()
    await page.evaluate(() => window.testVisualViewport(null))
    assert.deepEqual(await autoGrid(), landscape, 'native grid recovers after the keyboard closes')
    await checkChrome(1180, 820)

    const cdp = browserType === chromium ? await context.newCDPSession(page) : null
    const reportsBeforePinch = reports.length
    if (cdp) await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 })
    else await page.evaluate(() => window.testVisualViewport({ width: 590, height: 410, offsetLeft: 40, offsetTop: 35, scale: 2 }))
    await expect.poll(() => page.evaluate(() => visualViewport.scale)).toBe(2)
    await expect.poll(() => page.evaluate(() => Math.round(visualViewport.width))).toBe(590)
    // Negative assertions must outlast the client's 600ms resize debounce.
    await page.waitForTimeout(1200)
    assert.deepEqual(await nativeGrid(), landscape, 'pinch magnifies without resizing tmux')
    assert.equal(reports.length, reportsBeforePinch, 'pinch does not send a squeezed native grid')
    const pinchedShell = await shell.boundingBox()
    assert.deepEqual(pinchedShell, { x: 0, y: 0, width: 1180, height: 820 }, 'shell layout is normalized by pinch scale')
    await expect.poll(fittedPanes).toEqual([])
    await expect(shell).toHaveAttribute('data-page-zoomed', '1')
    for (const selector of ['[data-tmux-cc-shell]', '[data-tmux-cc-terminal]', '[data-tmux-cc-touch]']) {
      const action = await page.locator(selector).evaluate(node => getComputedStyle(node).touchAction)
      assert.ok(['manipulation', 'pan-x pan-y pinch-zoom'].includes(action), `${selector} permits native pan and pinch`)
    }
    const prevented = await page.locator('[data-tmux-cc-touch]').evaluate(node => {
      // Synthetic events only check handler cancellation, not OS/browser pan.
      // Plain events also work in WebKit, which disallows new Touch().
      const event = (type, y) => {
        const touch = { identifier: 1, target: node, clientX: 100, clientY: y }
        return Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
          touches: type === 'touchend' ? [] : [touch], changedTouches: [touch],
        })
      }
      node.dispatchEvent(event('touchstart', 200))
      const move = event('touchmove', 160)
      node.dispatchEvent(move)
      node.dispatchEvent(event('touchend', 160))
      return move.defaultPrevented
    })
    assert.equal(prevented, false, 'zoomed terminal gestures remain available for native page panning')
    if (cdp) {
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 })
      await cdp.detach()
    } else await page.evaluate(() => window.testVisualViewport(null))
    assert.deepEqual(await autoGrid(), landscape)

    await page.locator('[data-tmux-cc-font-up]').click()
    const largerFont = await autoGrid(13)
    assert.ok(largerFont.cols < landscape.cols && largerFont.rows < landscape.rows, 'reports use the chosen native font, not a previously fitted font')
    await page.locator('[data-tmux-cc-font-down]').click()
    assert.deepEqual(await autoGrid(), landscape)
    await page.locator('[data-tmux-cc-split-v]').click()
    await expect(page.locator('.xterm')).toHaveCount(2)
    const splitGrid = await autoGrid(12, 2)
    assert.equal(splitGrid.cols, landscape.cols)
    assert.ok(splitGrid.rows < landscape.rows, 'stacked pane titles are excluded from native row capacity')
    await page.locator('[data-tmux-cc-zoom]').click()
    await expect.poll(async () => (await native('display-message', '-p', '-t', 'tablet', '#{window_zoomed_flag}')).stdout.trim()).toBe('1')
    await expect(page.locator('.xterm')).toHaveCount(1)
    assert.deepEqual(await autoGrid(), landscape)
    await page.locator('[data-tmux-cc-zoom]').click()
    await expect.poll(async () => (await native('display-message', '-p', '-t', 'tablet', '#{window_zoomed_flag}')).stdout.trim()).toBe('0')
    await expect(page.locator('.xterm')).toHaveCount(2)
    assert.deepEqual(await autoGrid(12, 2), splitGrid)

    await settings.click()
    const policy = page.getByLabel(/^Window sizing policy/)
    await expect(policy).toBeEnabled()
    await Promise.all([
      page.waitForResponse(response => response.url().endsWith('/tmux-cc/settings') && response.request().method() === 'POST' && response.ok()),
      policy.selectOption('mirror'),
    ])
    await page.keyboard.press('Escape')
    await expect(shell).toHaveAttribute('data-size-mode', 'mirror')
    const mirrored = await nativeGrid()
    await page.setViewportSize({ width: 820, height: 1180 })
    await checkChrome(820, 1180)
    const mirrorReport = await expectedGrid(12, 2)
    assert.notDeepEqual(mirrorReport, mirrored)
    await expect.poll(() => reports.at(-1)).toEqual(mirrorReport)
    await page.waitForTimeout(1200)
    assert.deepEqual(await nativeGrid(), mirrored, 'explicit Mirror ignores browser size reports')
    await checkChrome(820, 1180)
    await page.locator('[data-tmux-cc-zoom]').click()
    await expect(page.locator('.xterm')).toHaveCount(1)
    await expect.poll(() => reports.at(-1)).toEqual(await expectedGrid())
    await page.waitForTimeout(1200)
    assert.deepEqual(await nativeGrid(), mirrored, 'Mirror zoom does not take over sizing')
    await page.locator('[data-tmux-cc-zoom]').click()
    await expect(page.locator('.xterm')).toHaveCount(2)
    await expect.poll(() => reports.at(-1)).toEqual(mirrorReport)
    await page.waitForTimeout(1200)
    assert.deepEqual(await nativeGrid(), mirrored, 'Mirror unzoom does not take over sizing')
    assert.deepEqual(errors, [])
  } finally {
    releaseBundle?.()
    if (browser) await browser.close()
    if (app) await app.close()
    await native('kill-server').catch(() => {})
    await rm(dir, { recursive: true, force: true })
  }
})
