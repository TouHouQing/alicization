const assert = require('node:assert/strict')
const { spawn, execFile } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { assertNativeQaSurface } = require('./native-qa-surface.cjs')

async function main() {
  const surface = assertNativeQaSurface()
  const nonce = randomUUID()
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-owned-popup-'))
  const reportPath = path.resolve('output', `native-popup-owner-${nonce}.json`)
  const target = path.join(root, 'marker.txt')
  const stopPath = path.join(root, 'stop')
  const worker = await fs.readFile(path.resolve('apps/stage-tamagotchi/src/main/services/alicization/life-windows-desktop-worker.ps1'), 'utf8')
  const workerPath = path.join(root, 'worker.ps1')
  await fs.writeFile(workerPath, `\uFEFF[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)\n$lifeRequest=[Console]::In.ReadLine()|ConvertFrom-Json\n${worker}`)
  await fs.writeFile(path.join(root, 'owner.json'), JSON.stringify({ format: 'owned-native-popup-fixture-v1', workspace: process.cwd(), nonce, target, surface }), { flag: 'wx' })
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'life-windows-owner-chain-fixture.ps1')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
  const closed = new Promise(resolve => child.once('close', (code, signal) => resolve({ code, signal })))
  let errors = ''
  child.stderr.on('data', bytes => errors = (errors + bytes.toString()).slice(-4000))
  const ready = new Promise((resolve, reject) => {
    let text = ''
    const timer = setTimeout(() => reject(new Error('Owned popup fixture not ready')), 15000)
    child.once('error', reject)
    child.stdout.on('data', (bytes) => {
      text += bytes.toString('utf8')
      const line = text.split(/\r?\n/u).find(item => item.includes('"ready":true'))
      if (line) {
        clearTimeout(timer)
        resolve(JSON.parse(line))
      }
    })
  })
  child.stdin.end(`${JSON.stringify({ path: target, stopPath, nonce, startUnowned: process.env.LIFE_QA_POPUP_START_UNOWNED === '1' })}\n`)
  const report = { format: 'native-popup-owner-binding-v1', nonce, surface, root, reportPath, harnessSha256: createHash('sha256').update(await fs.readFile(__filename)).digest('hex'), fixtureSha256: createHash('sha256').update(await fs.readFile(path.join(__dirname, 'life-windows-owner-chain-fixture.ps1'))).digest('hex'), workerSha256: createHash('sha256').update(worker).digest('hex'), passed: false, realModelAcceptance: false, physicalInputAcceptance: false, observations: [] }
  async function invoke(payload) {
    const completion = new Promise((resolve, reject) => {
      const subprocess = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Mta', '-ExecutionPolicy', 'Bypass', '-File', workerPath], { windowsHide: true, timeout: 15000, maxBuffer: 256000 }, (error, stdout) => {
        if (error) {
          reject(error)
          return
        }
        try {
          resolve(JSON.parse(stdout.trim()))
        }
        catch (error) {
          reject(error)
        }
      })
      subprocess.stdin.end(`${JSON.stringify(payload)}\n`)
    })
    const result = await completion
    report.observations.push({ request: payload, result })
    return result
  }
  try {
    const fixture = await ready
    assert.equal(fixture.nonce, nonce)
    const first = await invoke({ operation: 'observe', windowId: fixture.windowId, processId: fixture.processId })
    assert.equal(first.ok, true)
    assert.equal(first.ownerWindowId, fixture.initialOwner)
    report.initialOwnerWindowId = fixture.initialOwner
    const owner = { windowId: first.windowId, processId: first.processId, expectedProcessStartTicks: first.processStartTicks, expectedWindowClass: first.windowClass, expectedDesktop: first.desktop, expectedWindowTitle: first.title, expectedOwnerWindowId: first.ownerWindowId }
    const switchControl = first.elements.find(item => item.name === 'Change owned parent')
    const saveControl = first.elements.find(item => item.name === 'Save owned marker')
    assert.ok(switchControl && saveControl)
    assert.equal((await invoke({ operation: 'click', ...owner, expected: switchControl })).ok, true)
    const parentChange = JSON.parse(await fs.readFile(`${target}.owner.json`, 'utf8'))
    assert.equal(parentChange.owner, fixture.parentB)
    assert.equal(parentChange.popup, fixture.windowId)
    const stale = await invoke({ operation: 'click', ...owner, expected: saveControl })
    assert.equal(stale.ok, false, 'Changing only GW_OWNER must invalidate the old popup authority')
    assert.equal(stale.errorCode, 'WINDOWS_UIA_WINDOW_OWNER_CHANGED')
    assert.equal(stale.effectMayHaveOccurred, false)
    assert.equal(stale.sideEffectState, 'none')
    await assert.rejects(fs.access(target), { code: 'ENOENT' })
    const fresh = await invoke({ operation: 'observe', windowId: fixture.windowId, processId: fixture.processId })
    assert.equal(fresh.ownerWindowId, fixture.parentB)
    const saved = await invoke({ operation: 'click', ...owner, expectedOwnerWindowId: fresh.ownerWindowId, expected: fresh.elements.find(item => item.name === 'Save owned marker') })
    assert.equal(saved.ok, true)
    const bytes = await fs.readFile(target)
    assert.equal(bytes.toString('utf8'), `actual owned popup marker ${nonce}`)
    report.fileReadback = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
    report.passed = true
  }
  catch (error) {
    report.error = error.message
    process.exitCode = 1
  }
  finally {
    await fs.writeFile(stopPath, 'stop')
    let timer
    const shutdown = await Promise.race([closed, new Promise(resolve => timer = setTimeout(() => resolve(null), 10000))])
    clearTimeout(timer)
    report.fixtureShutdown = shutdown
    report.fixtureErrors = errors
    if (shutdown?.code !== 0 || shutdown.signal) {
      report.passed = false
      process.exitCode = 1
    }
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' })
    console.info(JSON.stringify({ passed: report.passed, reportPath, error: report.error }))
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
