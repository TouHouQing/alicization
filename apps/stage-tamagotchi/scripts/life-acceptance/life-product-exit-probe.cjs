const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const { createServer } = require('node:net')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { closePrivateRuntime, launchOptions, registerPrivateRuntime } = require('./electron-launch.cjs')

async function main() {
  const reportFile = path.resolve(process.env.LIFE_PRODUCT_EXIT_REPORT || 'output/product-exit-probe-20261014.json')
  assert.ok(reportFile.startsWith(`${path.resolve('output')}${path.sep}`))
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-product-exit-'))
  const port = await new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
  })
  const options = launchOptions(profile)
  options.env.PORT = String(port)
  options.args.push('--host-resolver-rules=MAP localhost ~NOTFOUND')
  const app = await _electron.launch(options)
  const report = { format: 'life-product-exit-diagnostic-v1', profile, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, console: [], passed: false }
  app.on('console', (message) => {
    if (/app-exit|bootkit|FileLogger/.test(message.text())) {
      report.console.push(message.text())
      void fs.writeFile(reportFile, JSON.stringify(report, null, 2))
    }
  })
  report.nativeRuntime = await registerPrivateRuntime(app)
  await app.context().addInitScript((url) => {
    if (location.protocol === 'file:')
      localStorage.setItem('settings/connection/websocket-url', url)
  }, `ws://127.0.0.1:${port}/ws`)
  for (const page of app.windows().filter(page => page.url().endsWith('#/') || page.url().endsWith('#/onboarding'))) await page.reload()
  await new Promise(resolve => setTimeout(resolve, 4000))
  report.shutdown = await closePrivateRuntime(app, report.nativeRuntime)
  report.passed = report.shutdown.completed && report.shutdown.exitCode === 0
  await fs.writeFile(reportFile, JSON.stringify(report, null, 2))
  console.info(JSON.stringify(report))
  if (!report.passed)
    process.exitCode = 1
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
