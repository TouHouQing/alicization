/* eslint-disable style/max-statements-per-line */
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const { createServer } = require('node:net')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, registerPrivateRuntime, closePrivateRuntime } = require('./electron-launch.cjs')

async function main() {
  const target = path.resolve('output/live2d-load-probe-20261015.json')
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-live2d-load-'))
  const port = await new Promise((resolve) => { const server = createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)) }) })
  const options = launchOptions(profile)
  options.env.PORT = String(port)
  options.args.push('--host-resolver-rules=MAP localhost ~NOTFOUND')
  options.args.push(`--log-net-log=${path.resolve('output/live2d-load-probe-netlog-20261015.json')}`)
  const app = await _electron.launch(options)
  const report = { format: 'live2d-load-diagnostic-v1', profile, pages: [], failures: [], console: [] }
  report.nativeRuntime = await registerPrivateRuntime(app)
  const observe = async (page) => {
    if (page.url().startsWith('devtools:'))
      return
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type()))
        report.console.push({ url: page.url(), message: message.text() })
    })
    const client = await app.context().newCDPSession(page)
    const files = new Map()
    client.on('Network.requestWillBeSent', (event) => {
      if (event.request.url.startsWith('file:'))
        files.set(event.requestId, event.request.url)
    })
    client.on('Network.loadingFailed', (event) => {
      if (files.has(event.requestId))
        report.failures.push({ url: files.get(event.requestId), ...event })
    })
    await client.send('Network.enable')
  }
  app.on('window', (page) => { void observe(page) })
  await Promise.all(app.windows().map(observe))
  const capture = async (page, name) => {
    const state = await page.evaluate(async () => {
      const model = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings-stage-model')
      const url = model?.stageModelSelectedUrl
      const read = type => new Promise((resolve) => { const xhr = new XMLHttpRequest(); xhr.open('GET', url); xhr.responseType = type; xhr.onload = () => resolve({ status: xhr.status, bytes: xhr.response?.size ?? xhr.response?.byteLength }); xhr.onerror = () => resolve({ status: xhr.status, failed: true }); xhr.send() })
      const raw = url ? { blob: await read('blob'), arraybuffer: await read('arraybuffer') } : null
      return { url, raw, mounted: document.documentElement.dataset.alicizationStageMounted, visibility: document.visibilityState }
    })
    report.pages.push({ name, pageUrl: page.url(), ...state })
    await fs.writeFile(target, JSON.stringify(report, null, 2))
  }
  try {
    let stage
    for (let attempt = 0; attempt < 100; attempt++) {
      stage = app.windows().find(page => page.url().endsWith('#/'))
      if (stage)
        break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    assert.ok(stage)
    await new Promise(resolve => setTimeout(resolve, 5000))
    await capture(stage, 'fresh-stage')
    await stage.reload()
    await new Promise(resolve => setTimeout(resolve, 5000))
    await capture(stage, 'reloaded-stage')
    await stage.getByRole('button', { name: '打开设置', exact: true }).evaluate(node => node.click())
    await new Promise(resolve => setTimeout(resolve, 1500))
    const settings = app.windows().find(page => page.url().endsWith('#/settings'))
    assert.ok(settings)
    await settings.locator('a[href="#/settings/models"]').evaluate(node => node.click())
    await new Promise(resolve => setTimeout(resolve, 6000))
    await capture(settings, 'model-preview')
    await capture(stage, 'stage-after-preview')
  }
  finally {
    report.shutdown = await closePrivateRuntime(app, report.nativeRuntime)
    await fs.writeFile(target, JSON.stringify(report, null, 2))
  }
  console.info(JSON.stringify({ pages: report.pages, failures: report.failures, shutdown: report.shutdown }))
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
