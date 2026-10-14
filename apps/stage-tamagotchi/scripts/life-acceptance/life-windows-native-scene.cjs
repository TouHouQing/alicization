const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { spawn, execFile } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

async function main() {
  assert.match(process.env.LIFE_QA_PRIVATE_DESKTOP || '', /^AlicizationQA_[a-f0-9]{32}$/u)
  const output = path.resolve('output/life-quality-development-20261007', `native-${randomUUID()}`)
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-uia-'))
  await fs.mkdir(output, { recursive: true })
  const target = path.join(root, 'actual-note.txt')
  const worker = await fs.readFile('apps/stage-tamagotchi/src/main/services/alicization/life-windows-desktop-worker.ps1', 'utf8')
  const fixture = await fs.readFile(path.join(__dirname, process.env.LIFE_QA_NATIVE_WPF === '1' ? 'life-windows-wpf-fixture.ps1' : 'life-windows-native-fixture.ps1'), 'utf8')
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(fixture, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
  child.stdin.end(`${JSON.stringify({ path: target })}\n`)
  const report = { fixtureProvider: process.env.LIFE_QA_NATIVE_WPF === '1' ? 'wpf-uia' : 'winforms-hwnd', format: 'life-windows-uia-capability-v1', privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, workerSha256: createHash('sha256').update(worker).digest('hex'), syntheticWindowOnly: true, scope: 'Actual owned native controls, UI Automation patterns and independent file readback; manual capability test, not a neural dialogue or packaged release verdict', observations: [] }
  try {
    await new Promise((resolve, reject) => {
      let text = ''
      const timer = setTimeout(() => reject(new Error('Owned native form did not become ready')), 15000)
      child.stdout.on('data', (bytes) => {
        text += bytes.toString('utf8')
        if (text.includes('"ready":true')) {
          clearTimeout(timer)
          resolve()
        }
      })
      child.once('error', reject)
      child.once('exit', (code) => {
        if (!text.includes('"ready":true'))
          reject(new Error(`Fixture exited ${code}`))
      })
    })
    async function invoke(payload, signal) {
      const source = `[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)\n$lifeRequest=[Console]::In.ReadLine()|ConvertFrom-Json\n${worker}`
      const workerPath = path.join(root, 'worker.ps1')
      await fs.writeFile(workerPath, `\uFEFF${source}`, 'utf8')
      report.stage = { operation: payload.operation, target: payload.expected?.name || null }
      return new Promise((resolve, reject) => {
        const process = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Mta', '-ExecutionPolicy', 'Bypass', '-File', workerPath], { windowsHide: true, timeout: 15000, maxBuffer: 256000, signal }, (error, stdout, stderr) => error ? reject(new Error(JSON.stringify({ operation: payload.operation, target: payload.expected?.name, code: error.code, killed: error.killed, signal: error.signal, stdout: stdout?.slice(-1000), stderr: stderr?.slice(-1000) }))) : resolve(JSON.parse(stdout.trim())))
        process.stdin.end(`${JSON.stringify(payload)}\n`)
      })
    }
    const first = await invoke({ operation: 'observe', windowTitle: 'Alicization QA Native Notes' })
    report.observations.push(first)
    assert.equal(first.ok, true, JSON.stringify(first))
    assert.equal(first.desktop, process.env.LIFE_QA_PRIVATE_DESKTOP)
    const input = first.elements.find(item => item.role === 'input')
    const save = first.elements.find(item => item.role === 'button' && item.name === '保存')
    assert.ok(input && save)
    const owner = { windowId: first.windowId, processId: first.processId }
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(invoke({ operation: 'type', ...owner, expected: input, text: '不得写入', clearExisting: true }, controller.signal))
    const text = '雨声陪伴\nLiteral $(Get-Process) and `ticks`'
    const typed = await invoke({ operation: 'type', ...owner, expected: input, text, clearExisting: true })
    report.observations.push(typed)
    assert.equal(typed.ok, true, JSON.stringify(typed))
    const second = await invoke({ operation: 'observe', ...owner })
    assert.equal(second.elements.find(item => item.runtimeId === input.runtimeId).value.replace(/\r\n/gu, '\n'), text)
    const saved = await invoke({ operation: 'click', ...owner, expected: second.elements.find(item => item.runtimeId === save.runtimeId) })
    report.observations.push(saved)
    assert.equal(saved.ok, true, JSON.stringify(saved))
    assert.equal((await fs.readFile(target, 'utf8')).replace(/\r\n/gu, '\n'), text)
    const beforeChange = await invoke({ operation: 'observe', ...owner })
    const changed = await invoke({ operation: 'click', ...owner, expected: beforeChange.elements.find(item => item.name === '改变动作含义') })
    assert.equal(changed.ok, true)
    const stale = await invoke({ operation: 'click', ...owner, expected: beforeChange.elements.find(item => item.runtimeId === save.runtimeId) })
    report.observations.push(stale)
    assert.equal(stale.ok, false)
    assert.match(stale.errorCode, /STALE_ELEMENT/u)
    const wrongProcess = await invoke({ operation: 'observe', windowId: first.windowId, processId: first.processId + 1 })
    report.observations.push(wrongProcess)
    assert.equal(wrongProcess.ok, false)
    assert.match(wrongProcess.errorCode, /WINDOW_IDENTITY_CHANGED/u)
    report.completed = true
    report.fileReadback = { bytes: (await fs.stat(target)).size, sha256: createHash('sha256').update(await fs.readFile(target)).digest('hex') }
  }
  catch (error) {
    report.error = error.message
    throw error
  }
  finally {
    child.kill()
    await fs.writeFile(path.join(output, 'native.json'), JSON.stringify(report, null, 2))
    await fs.writeFile(path.resolve('output/life-quality-development-20261007/native-latest.json'), JSON.stringify({ output, report: path.join(output, 'native.json') }, null, 2))
    await fs.rm(root, { recursive: true, force: true })
    console.info(JSON.stringify({ completed: report.completed || false, error: report.error, output }))
  }
}
main().catch((error) => {
  // A failed private job must retain its diagnostic and a nonzero exit code.
  console.error(error.message)
  process.exitCode = 1
})
