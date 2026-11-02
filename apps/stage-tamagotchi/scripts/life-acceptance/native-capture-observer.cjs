/* eslint-disable style/max-statements-per-line */
/* eslint-disable node/prefer-global/process -- Serialized functions need the inspected Electron process's own global. */
// Exact owned Electron QA observations; no retained remote handles or retries.
const assert = require('node:assert/strict')
const path = require('node:path')

const { withPinnedInspectorResult } = require('./native-observation-promise.cjs')

const clients = new WeakMap()

exports.open = async function (application, identity) {
  const actual = await application.evaluate(({ app }) => ({ pid: process.pid, executable: process.execPath, profile: app.getPath('userData'), url: process.getBuiltinModule('node:inspector').url(), rendererUrl: process.getBuiltinModule('node:url').pathToFileURL(process.getBuiltinModule('node:path').join(app.getAppPath(), 'out/renderer/index.html')).href }))
  assert.equal(actual.pid, identity.pid)
  assert.equal(path.resolve(actual.executable).toLowerCase(), path.resolve(identity.executable).toLowerCase())
  assert.equal(path.resolve(actual.profile).toLowerCase(), path.resolve(identity.profile).toLowerCase())
  const renderer = new URL(actual.rendererUrl)
  assert.equal(renderer.protocol, 'file:')
  assert.ok(renderer.pathname.endsWith('/out/renderer/index.html'))
  assert.equal(renderer.username + renderer.password + renderer.search + renderer.hash, '')
  const url = new URL(actual.url)
  assert.equal(url.protocol, 'ws:')
  assert.equal(url.hostname, '127.0.0.1')
  assert.match(url.pathname, /^\/[a-f\d-]{36}$/u)
  assert.equal(url.username + url.password + url.search + url.hash, '')
  const socket = new WebSocket(url)
  const pending = new Map()
  let nextId = 0
  socket.addEventListener('message', (event) => {
    if (typeof event.data !== 'string' || event.data.length > 16 * 1024 * 1024) {
      socket.close()
      return
    }
    const message = JSON.parse(event.data)
    const request = pending.get(message.id)
    if (!request)
      return
    pending.delete(message.id)
    clearTimeout(request.timer)
    if (message.error || message.result?.exceptionDetails)
      request.reject(new Error(`Owned native observation rejected: ${JSON.stringify(message.error ?? message.result.exceptionDetails)}`))
    else request.resolve(message.result?.result?.value)
  })
  socket.addEventListener('close', () => {
    for (const request of pending.values()) {
      clearTimeout(request.timer)
      request.reject(new Error('Owned native observation connection closed'))
    }
    pending.clear()
  })
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.close(); reject(new Error('Owned native observer connection exceeded 3000ms')) }, 3000)
    socket.addEventListener('open', () => { clearTimeout(timer); resolve() }, { once: true })
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Owned native observer connection failed')) }, { once: true })
  })
  const evaluate = expression => new Promise((resolve, reject) => {
    assert.equal(socket.readyState, WebSocket.OPEN)
    const id = ++nextId
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Owned native capture exceeded 8000ms')) }, 8000)
    pending.set(id, { resolve, reject, timer })
    socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true } }))
  })
  clients.set(application, { socket, evaluate, identity, rendererUrl: renderer.href })
  return { transport: 'direct-node-inspector-return-by-value', exactPid: identity.pid, exactExecutableAndProfileVerified: true, retainedRemoteObjectHandles: 0, automaticRetries: 0, mutatingWindowOperations: 0, timeoutMs: 8000 }
}

exports.read = async function (application, expectedUrl, image = false) {
  const client = clients.get(application)
  assert.ok(client, 'Owned native observer must bind before product interaction')
  assert.equal(typeof expectedUrl, 'string')
  const requested = new URL(expectedUrl)
  assert.equal(requested.protocol, 'file:')
  assert.ok(requested.hash.startsWith('#/'))
  requested.hash = ''
  assert.equal(requested.href, client.rendererUrl, 'Capture must retain the exact renderer entry of the already verified native process')
  const expression = `(${async function (expectedUrl, image) {
    const { BrowserWindow, screen } = process.getBuiltinModule('node:module').createRequire(process.execPath)('electron')
    const all = BrowserWindow.getAllWindows().filter(window => !window.isDestroyed())
    const matches = all.filter(window => window.webContents.getURL() === expectedUrl)
    if (matches.length !== 1)
      throw new Error('Native observation requires one exact current page owner')
    const window = matches[0]
    const displays = screen.getAllDisplays().map(display => display.bounds)
    const windows = all.map(window => ({ id: window.id, bounds: window.getBounds(), visible: window.isVisible(), focusable: window.isFocusable(), focused: window.isFocused() }))
    const bounds = window.getBounds()
    const nativeBefore = { nativeWindowId: window.id, observedAt: Date.now(), url: window.webContents.getURL(), loading: window.webContents.isLoading(), loadingMainFrame: window.webContents.isLoadingMainFrame(), backgroundThrottling: window.webContents.getBackgroundThrottling(), visible: window.isVisible(), focusable: window.isFocusable(), focused: window.isFocused() }
    if (!image)
      return { pid: process.pid, viewport: { displays, windows }, nativeBefore }
    if (window.isFocusable() || window.isFocused())
      throw new Error('Native capture requires its own unfocusable, unfocused QA window')
    if (displays.some(display => bounds.x < display.x + display.width && bounds.x + bounds.width > display.x && bounds.y < display.y + display.height && bounds.y + bounds.height > display.y))
      throw new Error('Native QA capture window overlaps the user desktop')
    const capture = await window.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true })
    if (window.isDestroyed() || window.webContents.getURL() !== expectedUrl)
      throw new Error('Native capture owner changed before readback')
    return { pid: process.pid, image: { png: capture.toPNG().toString('base64'), size: capture.getSize(), bounds, displays, focusable: window.isFocusable(), focused: window.isFocused() } }
  }.toString()})(${JSON.stringify(expectedUrl)},${image ? 'true' : 'false'})`
  const result = await withPinnedInspectorResult(client.evaluate, expression)
  assert.equal(result.pid, client.identity.pid)
  return result
}

exports.close = async function (application) {
  const client = clients.get(application)
  if (!client)
    return
  clients.delete(application)
  if (client.socket.readyState === WebSocket.CLOSED)
    return
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 1000)
    client.socket.addEventListener('close', () => { clearTimeout(timer); resolve() }, { once: true })
    client.socket.close()
  })
}
