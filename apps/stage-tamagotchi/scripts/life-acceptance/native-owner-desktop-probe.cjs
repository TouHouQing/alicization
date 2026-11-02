const assert = require('node:assert/strict')
const { execFileSync, spawn } = require('node:child_process')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { bindWindowsNativeRuntime, prepareWindowsQaLaunch } = require('./windows-native-launcher.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

/** A long console fixture isolates launcher/desktop lifetime from app behavior. */
async function main() {
  assert.equal(process.platform, 'win32')
  assert.match(process.env.LIFE_QA_PRIVATE_DESKTOP || '', /^AlicizationQA_[a-f\d]{32}$/u)
  const root = path.resolve(process.env.LIFE_NATIVE_OWNER_PROBE_ROOT || '')
  assert.ok(root.startsWith(`${path.resolve('output')}${path.sep}`))
  await fs.mkdir(root, { recursive: false })
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-native-owner-probe-'))
  const proof = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'assert-private-desktop.ps1'), '-ExpectedDesktop', process.env.LIFE_QA_PRIVATE_DESKTOP], { encoding: 'utf8', windowsHide: true, timeout: 15000 }))
  const identity = { pid: process.pid, executable: process.execPath, profile, ...proof }
  await fs.appendFile(process.env.LIFE_QA_PROCESS_REGISTRY, `${JSON.stringify(identity)}\n`)
  const launch = prepareWindowsQaLaunch(profile, process.execPath)
  const fixture = path.join(profile, 'owned-long-child.cjs')
  await fs.writeFile(fixture, 'setTimeout(() => process.exit(0), 45000)\n', { flag: 'wx' })
  const report = { format: 'native-owner-desktop-probe-v1', diagnosticOnly: true, scope: 'Console child ownership for 45 seconds; no Electron, product, GUI or input acceptance', profile, identity, startedAt: Date.now(), events: [], passed: false }
  const save = () => fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
  await save()
  const wrapper = spawn(`"${launch.executablePath}" "${fixture}"`, [], { shell: true, env: { ...process.env, ...launch.env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'] })
  wrapper.stdout.resume()
  wrapper.stderr.resume()
  const finished = new Promise((resolve, reject) => {
    wrapper.once('error', reject)
    wrapper.once('close', (code, signal) => {
      report.events.push({ event: 'shell-close', at: Date.now(), code, signal })
      resolve()
    })
  })
  let observed
  try {
    let started
    for (let attempt = 0; attempt < 50; attempt++) {
      started = await fs.readFile(path.join(launch.env.ALICIZATION_QA_LAUNCH_DIRECTORY, 'qa-native-started.json'), 'utf8').then(JSON.parse).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error))
      if (started)
        break
      await wait(100)
    }
    assert.ok(started)
    observed = bindWindowsNativeRuntime({ pid: started.payload.pid, parentPid: started.payload.launcherPid, executable: process.execPath, profile }, wrapper)
    report.nativeProcessObservation = observed.proof
    observed.process.once('exit', (code, signal) => report.events.push({ event: 'actual-child-exit', at: Date.now(), code, signal }))
    for (let elapsed = 0; elapsed < 60; elapsed++) {
      report.elapsedMs = Date.now() - report.startedAt
      await save()
      if (observed.process.exitCode !== null || observed.process.signalCode !== null)
        break
      assert.equal(wrapper.exitCode, null, 'Shell exited while its authenticated native child was still running')
      await wait(1000)
    }
    assert.equal(observed.process.exitCode, 0)
    assert.equal(observed.process.signalCode, null)
    await finished
    assert.equal(wrapper.exitCode, 0)
    assert.ok(report.elapsedMs >= 44000)
    report.passed = true
  }
  catch (error) {
    report.failure = error.message
    process.exitCode = 1
  }
  finally {
    if (observed && observed.process.exitCode === null && observed.process.signalCode === null) {
      observed.process.kill('SIGKILL')
      await finished
    }
    observed?.dispose()
    report.finishedAt = Date.now()
    await save()
  }
  console.info(JSON.stringify({ passed: report.passed, diagnosticOnly: true, elapsedMs: report.finishedAt - report.startedAt }))
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
