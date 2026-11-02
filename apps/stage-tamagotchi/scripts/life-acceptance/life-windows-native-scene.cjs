const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { spawn, execFile } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { assertNativeQaSurface } = require('./native-qa-surface.cjs')

async function main() {
  const nativeSurface = assertNativeQaSurface()
  const output = path.resolve('output/life-quality-development-20261007', `native-${randomUUID()}`)
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-uia-'))
  await fs.mkdir(output, { recursive: true })
  const target = path.join(root, 'actual-note.txt')
  const stopPath = path.join(root, 'stop-fixture')
  const worker = await fs.readFile('apps/stage-tamagotchi/src/main/services/alicization/life-windows-desktop-worker.ps1', 'utf8')
  const fixture = await fs.readFile(path.join(__dirname, process.env.LIFE_QA_NATIVE_WPF === '1' ? 'life-windows-wpf-fixture.ps1' : 'life-windows-native-fixture.ps1'), 'utf8')
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(fixture, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
  const fixtureClosed = new Promise(resolve => child.once('close', (code, signal) => resolve({ code, signal })))
  const workers = new Set()
  const fixtureErrors = []
  child.stderr.on('data', (bytes) => {
    fixtureErrors.push(bytes.toString())
    if (fixtureErrors.length > 20)
      fixtureErrors.shift()
  })
  child.stdin.end(`${JSON.stringify({ path: target, stopPath })}\n`)
  const report = { fixtureProvider: process.env.LIFE_QA_NATIVE_WPF === '1' ? 'wpf-uia' : 'winforms-hwnd', format: 'life-windows-uia-capability-v1', privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, nativeSurface, workerSha256: createHash('sha256').update(worker).digest('hex'), syntheticWindowOnly: true, scope: 'Actual owned native controls, UI Automation patterns and independent file readback; manual capability test, not a neural dialogue or packaged release verdict', observations: [] }
  report.qaHarnessSha256 = createHash('sha256').update(await fs.readFile(__filename)).digest('hex')
  report.menuVerification = process.env.LIFE_QA_NATIVE_WPF === '1' ? 'requires-isolated-interactive-desktop' : 'not-in-this-fixture'
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
      signal?.throwIfAborted()
      const source = `[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)\n$lifeRequest=[Console]::In.ReadLine()|ConvertFrom-Json\n${worker}`
      const workerPath = path.join(root, 'worker.ps1')
      await fs.writeFile(workerPath, `\uFEFF${source}`, 'utf8')
      report.stage = { operation: payload.operation, target: payload.expected?.name || null }
      return new Promise((resolve, reject) => {
        const workerChild = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Mta', '-ExecutionPolicy', 'Bypass', '-File', workerPath], { windowsHide: true, timeout: 15000, maxBuffer: 256000, signal }, (error, stdout, stderr) => error ? reject(new Error(JSON.stringify({ operation: payload.operation, target: payload.expected?.name, code: error.code, killed: error.killed, signal: error.signal, stdout: stdout?.slice(-1000), stderr: stderr?.slice(-1000) }))) : resolve(JSON.parse(stdout.trim())))
        workers.add(workerChild)
        workerChild.once('close', () => workers.delete(workerChild))
        workerChild.stdin.end(`${JSON.stringify(payload)}\n`)
      })
    }
    async function waitForFile(file, expected, deadline) {
      while (Date.now() < deadline) {
        const actual = await fs.readFile(file, 'utf8').catch(error => error.code === 'ENOENT' ? null : Promise.reject(error))
        if (actual?.replace(/\r\n/gu, '\n') === expected)
          return
        await new Promise(resolve => setTimeout(resolve, 25))
      }
      assert.fail(`Independent native file readback did not match before its original action deadline: ${path.basename(file)}`)
    }
    const first = await invoke({ operation: 'observe', windowTitle: 'Alicization QA Native Notes' })
    report.observations.push(first)
    assert.equal(first.ok, true, JSON.stringify(first))
    assert.equal(first.desktop, nativeSurface.desktop)
    const input = first.elements.find(item => item.role === 'input')
    const save = first.elements.find(item => item.role === 'button' && item.name === '保存')
    assert.ok(input && save)
    const owner = { windowId: first.windowId, processId: first.processId, expectedProcessStartTicks: first.processStartTicks, expectedWindowClass: first.windowClass, expectedDesktop: first.desktop, expectedWindowTitle: first.title }
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(invoke({ operation: 'type', ...owner, expected: input, text: '不得写入', clearExisting: true }, controller.signal))
    const text = '雨声陪伴\nLiteral $(Get-Process) and `ticks`'
    const typed = await invoke({ operation: 'type', ...owner, expected: input, text, clearExisting: true })
    report.observations.push(typed)
    assert.equal(typed.ok, true, JSON.stringify(typed))
    const second = await invoke({ operation: 'observe', ...owner })
    assert.equal(second.elements.find(item => item.runtimeId === input.runtimeId).value.replace(/\r\n/gu, '\n'), text)
    const saveDeadline = Date.now() + 15000
    const saved = await invoke({ operation: 'click', ...owner, expected: second.elements.find(item => item.runtimeId === save.runtimeId) })
    report.observations.push(saved)
    assert.equal(saved.ok, true, JSON.stringify(saved))
    await waitForFile(target, text, saveDeadline)
    if (process.env.LIFE_QA_NATIVE_WPF === '1') {
      const selection = await invoke({ operation: 'observe', ...owner })
      let control = selection.elements.find(item => item.role === 'select' && item.name === 'QA分类方式')
      assert.ok(control, 'The actual WPF selection control must be observed')
      assert.equal(control.value, '按名称')
      if (!control.options?.length) {
        const expanded = await invoke({ operation: 'click', ...owner, expected: control })
        assert.equal(expanded.ok, true, JSON.stringify(expanded))
        const opened = await invoke({ operation: 'observe', ...owner })
        control = opened.elements.find(item => item.runtimeId === control.runtimeId)
      }
      assert.deepEqual(control.options, ['按名称', '按类型', '中文🙂'])
      const deadline = Date.now() + 15000
      const selected = await invoke({ operation: 'type', ...owner, expected: control, text: '中文🙂', clearExisting: true, submit: false })
      report.observations.push(selected)
      assert.equal(selected.ok, true, JSON.stringify(selected))
      await waitForFile(`${target}.selection.txt`, '中文🙂', deadline)
      const after = await invoke({ operation: 'observe', ...owner })
      assert.equal(after.elements.find(item => item.runtimeId === control.runtimeId)?.value, '中文🙂')
      const staleRecipient = await invoke({ operation: 'click', ...owner, expected: after.elements.find(item => item.name === '保存'), expectedInputs: [control] })
      assert.equal(staleRecipient.ok, false, JSON.stringify(staleRecipient))
      assert.match(staleRecipient.errorCode, /STALE_WINDOW_STATE/u)
      assert.equal(staleRecipient.effectMayHaveOccurred, false)
      report.reviewedSelectionChangedRefusal = staleRecipient
      const stale = await invoke({ operation: 'type', ...owner, expected: control, text: '按类型', clearExisting: true, submit: false })
      assert.equal(stale.ok, false)
      assert.match(stale.errorCode, /STALE_ELEMENT/u)
      assert.equal(await fs.readFile(`${target}.selection.txt`, 'utf8'), '中文🙂')
      const current = after.elements.find(item => item.runtimeId === control.runtimeId)
      report.selectionFaults = []
      for (const fault of [
        { text: '不存在的选项' },
        { clearExisting: false },
        { submit: true },
        { dispatchExpiresAt: Date.now() - 1 },
      ]) {
        const rejected = await invoke({ operation: 'type', ...owner, expected: current, text: '按类型', clearExisting: true, submit: false, ...fault })
        report.selectionFaults.push({ fault, rejected })
        assert.equal(rejected.ok, false, JSON.stringify({ fault, rejected }))
        assert.equal(rejected.effectMayHaveOccurred, false)
        assert.equal(rejected.sideEffectState, 'none')
        assert.equal(await fs.readFile(`${target}.selection.txt`, 'utf8'), '中文🙂')
      }
      const replace = await invoke({ operation: 'click', ...owner, expected: after.elements.find(item => item.name === '改变分类选项') })
      assert.equal(replace.ok, true, JSON.stringify(replace))
      await waitForFile(`${target}.option-change.txt`, '按日期', Date.now() + 3000)
      const changedOptions = await invoke({ operation: 'type', ...owner, expected: current, text: '按类型', clearExisting: true, submit: false })
      report.selectionFaults.push({ fault: 'changed-options', rejected: changedOptions })
      assert.equal(changedOptions.ok, false, JSON.stringify(changedOptions))
      assert.match(changedOptions.errorCode, /STALE_SELECT_OPTIONS/u)
      assert.equal(changedOptions.effectMayHaveOccurred, false)
      assert.equal(await fs.readFile(`${target}.selection.txt`, 'utf8'), '中文🙂')
      report.selectionVerification = 'actual-wpf-selection-independent-event-file-and-readback'
      report.selectionRefusals = ['stale-value', 'missing-option', 'append', 'implicit-submit', 'expired-authority', 'changed-options']
      const viewport = async () => JSON.parse((await fs.readFile(`${target}.viewport.json`, 'utf8')).replace(/^\uFEFF/u, ''))
      const scrollObservation = await invoke({ operation: 'observe', ...owner })
      const originalScroll = scrollObservation.elements.find(item => item.automationId === 'qa-reader')
      assert.equal(originalScroll?.scroll?.verticalScrollable, true, JSON.stringify(scrollObservation))
      assert.equal((await viewport()).offset, 0)
      report.scrollVerification = []
      report.scrollRefusals = []
      for (const request of [{ action: 'down', amount: 'large' }, { action: 'up', amount: 'small' }, { action: 'bottom', amount: 'large' }, { action: 'top', amount: 'large' }]) {
        const observed = await invoke({ operation: 'observe', ...owner })
        const container = observed.elements.find(item => item.runtimeId === originalScroll.runtimeId)
        const beforeViewport = await viewport()
        const scrolled = await invoke({ operation: 'scroll', ...owner, expected: container, ...request })
        assert.equal(scrolled.ok, true, JSON.stringify(scrolled))
        assert.equal(scrolled.foregroundChanged, false)
        const readback = await invoke({ operation: 'observe', ...owner })
        const afterScroll = readback.elements.find(item => item.runtimeId === originalScroll.runtimeId)?.scroll
        const afterViewport = await viewport()
        if (request.action === 'down') {
          assert.ok(afterViewport.offset > beforeViewport.offset)
          assert.ok(afterScroll.verticalPercent > container.scroll.verticalPercent)
          const unchanged = await viewport()
          const stale = await invoke({ operation: 'scroll', ...owner, expected: originalScroll, action: 'down', amount: 'large' })
          assert.equal(stale.ok, false)
          assert.equal(stale.effectMayHaveOccurred, false)
          assert.match(stale.errorCode, /STALE_SCROLL_STATE/u)
          assert.deepEqual(await viewport(), unchanged)
          report.scrollRefusals.push({ fault: 'changed-viewport', rejected: stale })
        }
        if (request.action === 'up')
          assert.ok(afterViewport.offset < beforeViewport.offset)
        if (request.action === 'bottom') {
          assert.equal(afterViewport.offset, afterViewport.extent - afterViewport.viewport)
          assert.equal(afterScroll.verticalPercent, 100)
        }
        if (request.action === 'top') {
          assert.equal(afterViewport.offset, 0)
          assert.equal(afterScroll.verticalPercent, 0)
        }
        report.scrollVerification.push({ request, scrolled, beforeViewport, afterViewport, independentControlReadback: afterScroll })
      }
      const finalScroll = (await invoke({ operation: 'observe', ...owner })).elements.find(item => item.runtimeId === originalScroll.runtimeId)
      for (const fault of [
        { dispatchExpiresAt: Date.now() - 1 },
        { action: 'unknown' },
        { amount: 'unbounded' },
        { expectedProcessStartTicks: '0' },
        { expected: { ...finalScroll, runtimeId: 'unobserved-control' } },
      ]) {
        const beforeViewport = await viewport()
        const rejected = await invoke({ operation: 'scroll', ...owner, expected: finalScroll, action: 'down', amount: 'large', ...fault })
        assert.equal(rejected.ok, false, JSON.stringify(rejected))
        assert.equal(rejected.effectMayHaveOccurred, false)
        assert.deepEqual(await viewport(), beforeViewport)
        report.scrollRefusals.push({ fault, rejected })
      }
    }
    if (process.env.LIFE_QA_NATIVE_WPF === '1' && nativeSurface.isolatedGuestVerified === true) {
      const menu = await invoke({ operation: 'observe', ...owner })
      const header = menu.elements.find(item => item.role === 'menu-item' && item.name === '文件菜单')
      assert.ok(header, 'The actual WPF menu header must be observed')
      const expanded = await invoke({ operation: 'click', ...owner, expected: header })
      assert.equal(expanded.ok, true, JSON.stringify(expanded))
      const opened = await invoke({ operation: 'observe', ...owner })
      report.observations.push(opened)
      report.menuEvents = await fs.readFile(`${target}.menu-events.txt`, 'utf8').catch(error => error.code === 'ENOENT' ? 'no submenu event' : Promise.reject(error))
      report.menuSnapshot = await fs.readFile(`${target}.menu-snapshot.json`, 'utf8').catch(error => error.code === 'ENOENT' ? 'no native popup snapshot' : Promise.reject(error))
      let menuOwner = owner
      let menuObservation = opened
      if (!opened.elements.some(item => item.role === 'menu-item' && item.name === '写入菜单标记')) {
        assert.equal(opened.ownedWindows?.length, 1, `Exactly one actual owned popup must be discovered: ${JSON.stringify(opened)}`)
        const popup = opened.ownedWindows[0]
        menuOwner = { windowId: popup.windowId, processId: popup.processId, expectedProcessStartTicks: popup.processStartTicks, expectedWindowClass: popup.windowClass, expectedDesktop: popup.desktop, expectedOwnerWindowId: owner.windowId }
        menuObservation = await invoke({ operation: 'observe', ...menuOwner })
        report.observations.push(menuObservation)
        assert.equal(menuObservation.ownerWindowId, owner.windowId)
      }
      const action = menuObservation.elements.find(item => item.role === 'menu-item' && item.name === '写入菜单标记')
      assert.ok(action, `The actual expanded menu action must be observed: ${JSON.stringify(menuObservation)}`)
      const menuDeadline = Date.now() + 15000
      const clicked = await invoke({ operation: 'click', ...menuOwner, expected: action })
      assert.equal(clicked.ok, true, JSON.stringify(clicked))
      await waitForFile(`${target}.menu.txt`, 'actual WPF menu action', menuDeadline)
      report.menuVerification = 'observed-menu-action-and-file-readback'
    }
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
    report.fixtureErrors = fixtureErrors.join('').slice(-4000)
    await fs.writeFile(stopPath, 'stop')
    let stopDeadline
    const closed = await Promise.race([fixtureClosed, new Promise(resolve => stopDeadline = setTimeout(() => resolve(null), 10000))])
    clearTimeout(stopDeadline)
    report.fixtureShutdown = { normal: closed?.code === 0 && !closed.signal, ...closed, workersStillActive: workers.size }
    if (!report.fixtureShutdown.normal || workers.size) {
      report.completed = false
      report.fixtureRetainedRoot = root
      process.exitCode = 1
    }
    if (!report.completed)
      report.fixtureRetainedRoot = root
    await fs.writeFile(path.join(output, 'native.json'), JSON.stringify(report, null, 2))
    await fs.writeFile(path.resolve('output/life-quality-development-20261007/native-latest.json'), JSON.stringify({ output, report: path.join(output, 'native.json') }, null, 2))
    if (report.completed)
      await fs.rm(root, { recursive: true, force: true })
    console.info(JSON.stringify({ completed: report.completed || false, error: report.error, output }))
  }
}
main().catch((error) => {
  // A failed private job must retain its diagnostic and a nonzero exit code.
  console.error(error.message)
  process.exitCode = 1
})
