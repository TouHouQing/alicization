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
  const output = path.resolve('output')
  const temp = await fs.realpath(os.tmpdir())
  const profiles = []
  const evidence = JSON.parse(process.env.LIFE_PRODUCT_CLEANUP_REPORTS || '[]')
  assert.ok(Array.isArray(evidence) && evidence.length > 0)
  for (const file of evidence) {
    const target = path.resolve(file)
    assert.ok(target.startsWith(output + path.sep))
    assert.ok(['audit.json', 'report.json'].includes(path.basename(target)) || /^live2d-load-probe-\d+\.json$/.test(path.basename(target)))
    const root = path.dirname(target)
    const isAudit = path.basename(target) === 'audit.json'
    const report = JSON.parse(await fs.readFile(target, 'utf8'))
    const shutdown = isAudit ? JSON.parse(await fs.readFile(path.join(root, 'shutdown.json'), 'utf8')) : report.shutdown
    assert.ok((shutdown.completed && shutdown.exitCode === 0) || shutdown.forcedQaCleanup === true)
    assert.equal(report.nativeRuntime.privateDesktopVerified, true)
    let running = false
    try { process.kill(report.nativeRuntime.pid, 0); running = true }
    catch (error) {
      if (error.code !== 'ESRCH')
        throw error
    }
    assert.equal(running, false, 'A QA runtime is still running')
    const profile = await fs.realpath(report.profile)
    assert.match(path.basename(profile), /^alicization-life-(?:product-(?:regression|audit)|live2d-load)-[\w-]+$/)
    assert.equal(path.dirname(profile).toLowerCase(), temp.toLowerCase())
    profiles.push(profile)
  }
  const controller = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-product-cache-'))
  const port = await new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)) })
  })
  const options = launchOptions(controller)
  options.env.PORT = String(port)
  options.args.push('--host-resolver-rules=MAP localhost ~NOTFOUND')
  const app = await _electron.launch(options)
  const runtime = await registerPrivateRuntime(app)
  const result = { scope: 'Electron cache APIs on this audit own exited synthetic profiles; life databases, files and evidence remain preserved.', profiles, runtime }
  try {
    // Let the controller's own first canvas finish initialization before teardown.
    await app.firstWindow()
    await new Promise(resolve => setTimeout(resolve, 6000))
    result.caches = await app.evaluate(async ({ session }, profiles) => {
      const rows = []
      for (const profile of profiles) {
        const cache = session.fromPath(profile)
        const bytesBefore = await cache.getCacheSize()
        await cache.clearCache()
        await cache.clearCodeCaches({})
        await cache.clearStorageData({ storages: ['shadercache', 'filesystem'] })
        rows.push({ profile, bytesBefore, bytesAfter: await cache.getCacheSize() })
      }
      return rows
    }, profiles)
  }
  finally {
    result.shutdown = await closePrivateRuntime(app, runtime)
    if (!result.shutdown.completed || result.shutdown.exitCode !== 0)
      process.exitCode = 1
    await fs.writeFile(path.join(output, 'live2d-product-cache-cleanup.json'), JSON.stringify(result, null, 2))
  }
  console.info(JSON.stringify({ profiles: result.caches.length, bytesBefore: result.caches.reduce((sum, row) => sum + row.bytesBefore, 0), bytesAfter: result.caches.reduce((sum, row) => sum + row.bytesAfter, 0), shutdown: result.shutdown }))
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
