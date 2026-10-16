/* eslint-disable style/max-statements-per-line */
const assert = require('node:assert/strict')
const { spawn, execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const fs = require('node:fs/promises')
const { createServer } = require('node:net')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { chromium } = require('playwright')

const { launchOptions, packageIdentity } = require('./electron-launch.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer(); server.once('error', reject)
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)) })
  })
}
async function main() {
  const root = path.resolve(process.env.LIFE_NATIVE_EXIT_ROOT || 'output/live2d-native-no-inspector-exit-20261015')
  assert.ok(root.startsWith(path.resolve('output') + path.sep))
  await fs.mkdir(root, { recursive: true })
  let profile
  let priorProfileEvidence
  if (process.env.LIFE_NATIVE_EXIT_REUSE_REPORT) {
    priorProfileEvidence = path.resolve(process.env.LIFE_NATIVE_EXIT_REUSE_REPORT)
    assert.ok(priorProfileEvidence.startsWith(path.resolve('output') + path.sep) && path.basename(priorProfileEvidence) === 'report.json')
    const previous = JSON.parse(await fs.readFile(priorProfileEvidence, 'utf8'))
    assert.ok(previous.syntheticIdentity && previous.credentialsRemoved && previous.nativeRuntime?.privateDesktopVerified)
    assert.ok(previous.shutdown?.completed || previous.shutdown?.forcedQaCleanup)
    let previousAlive = true
    try { process.kill(previous.nativeRuntime.pid, 0) }
    catch (error) {
      if (error.code === 'ESRCH')
        previousAlive = false
    }
    assert.equal(previousAlive, false, 'Previous QA runtime must have exited')
    profile = await fs.realpath(previous.profile)
    assert.equal(path.dirname(profile).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
    assert.match(path.basename(profile), /^alicization-life-product-regression-/)
    const config = JSON.parse(await fs.readFile(path.join(profile, 'alicizations/llm-config.json'), 'utf8'))
    assert.equal(Object.keys(config.providerCredentials || {}).length, 0)
  }
  else { profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-product-regression-native-')) }
  const options = launchOptions(profile)
  let identity = await packageIdentity()
  if (!identity && process.env.LIFE_NATIVE_EXIT_COMPILED === '1')
    identity = { executable: options.executablePath, compiledMainSha256: createHash('sha256').update(await fs.readFile('apps/stage-tamagotchi/out/main/index.js')).digest('hex') }
  assert.ok(identity)
  const debugPort = await freePort()
  const app = spawn(options.executablePath, [...options.args, ...(process.env.LIFE_NATIVE_EXIT_AUDIO === '1' ? ['--autoplay-policy=no-user-gesture-required'] : []), `--remote-debugging-port=${debugPort}`, '--remote-debugging-address=127.0.0.1', '--host-resolver-rules=MAP localhost ~NOTFOUND'], { env: { ...options.env, PORT: String(await freePort()) }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let nodeInspectorObserved = false
  app.stdout.resume()
  app.stderr.on('data', (bytes) => { nodeInspectorObserved ||= bytes.toString().includes('Debugger listening on ') })
  const exited = new Promise(resolve => app.once('exit', resolve))
  const report = { format: 'life-native-live2d-exit-v1', ...identity, profile, priorProfileEvidence, syntheticIdentity: true, passed: false }
  let browser
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`, { timeout: 1000 }); break }
      catch {
        if (app.exitCode !== null)
          throw new Error('Native runtime exited during startup'); await wait(200)
      }
    }
    assert.ok(browser)
    let stage
    for (let attempt = 0; attempt < 100; attempt++) {
      stage = browser.contexts()[0].pages().find(page => page.url().endsWith('#/'))
      if (stage)
        break; await wait(200)
    }
    assert.ok(stage)
    const proof = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'assert-private-desktop.ps1'), '-ExpectedDesktop', process.env.LIFE_QA_PRIVATE_DESKTOP, '-RuntimePid', String(app.pid)], { encoding: 'utf8', windowsHide: true, timeout: 15000 }))
    report.nativeRuntime = { pid: app.pid, executable: options.executablePath, profile, ...proof }
    await fs.appendFile(process.env.LIFE_QA_PROCESS_REGISTRY, `${JSON.stringify(report.nativeRuntime)}\n`)
    for (let attempt = 0; attempt < 150; attempt++) {
      report.body = await sampleLive2D(stage)
      if (report.body.models.some(model => model.probes.some(point => point.pixel[3] > 64)))
        break
      await wait(200)
    }
    assert.ok(report.body.models.some(model => model.probes.some(point => point.pixel[3] > 64)))
    report.nodeInspectorObserved = nodeInspectorObserved
    assert.equal(nodeInspectorObserved, false)
    if (process.env.LIFE_NATIVE_EXIT_AUDIO === '1') {
      report.audioFixture = await stage.evaluate(async () => {
        const context = new AudioContext(); const oscillator = context.createOscillator()
        oscillator.connect(context.destination); oscillator.start()
        await context.resume()
        window.__nativeExitAudioFixture = { context, oscillator }
        return { state: context.state, scope: 'Muted WebAudio shutdown fixture with QA-only autoplay permission, not a real dialogue or hardware audio test.' }
      })
      assert.equal(report.audioFixture.state, 'running')
    }
    await stage.getByRole('button', { name: '展开', exact: true }).evaluate(node => node.click())
    const close = stage.getByRole('button', { name: '关闭', exact: true })
    await close.waitFor()
    await stage.screenshot({ path: path.join(root, 'before-ui-quit.png') })
    const started = Date.now()
    await close.evaluate(node => node.click()).catch((error) => {
      if (!/closed/i.test(error.message))
        throw error
    })
    let timeout
    try { await Promise.race([exited, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Native UI exit exceeded 30 seconds')), 30000) })]) }
    finally { clearTimeout(timeout) }
    report.shutdown = { completed: true, elapsedMs: Date.now() - started, exitCode: app.exitCode }
    assert.equal(app.exitCode, 0)
    report.passed = true
  }
  catch (error) { report.failure = error.message; throw error }
  finally {
    if (app.exitCode === null && report.nativeRuntime) {
      execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'stop-private-runtime.ps1'), '-RuntimePid', String(app.pid), '-ExecutablePath', options.executablePath, '-ProfilePath', profile], { windowsHide: true, timeout: 15000 })
      await exited
      report.shutdown = { completed: false, forcedQaCleanup: true, exitCode: app.exitCode }
    }
    await browser?.close().catch(() => {})
    await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
  }
  console.info(JSON.stringify({ passed: report.passed, shutdown: report.shutdown, nodeInspectorObserved }))
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
