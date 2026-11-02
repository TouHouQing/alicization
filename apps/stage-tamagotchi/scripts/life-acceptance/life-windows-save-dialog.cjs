const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { execFile, spawn } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { assertNativeQaSurface } = require('./native-qa-surface.cjs')

async function main() {
  const surface = assertNativeQaSurface()
  const nonce = randomUUID()
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-common-save-'))
  const stopPath = path.join(root, 'stop')
  const reportPath = path.resolve('output', `native-common-save-${nonce}.json`)
  const worker = await fs.readFile('apps/stage-tamagotchi/src/main/services/alicization/life-windows-desktop-worker.ps1', 'utf8')
  const workerPath = path.join(root, 'worker.ps1')
  await fs.writeFile(workerPath, `\uFEFF[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)\n$lifeRequest=[Console]::In.ReadLine()|ConvertFrom-Json\n${worker}`)
  await fs.writeFile(path.join(root, 'owner.json'), JSON.stringify({ format: 'owned-common-file-dialog-v1', workspace: process.cwd(), nonce, root, surface }), { flag: 'wx' })
  const report = { format: 'actual-windows-common-save-v1', root, reportPath, nonce, surface, workerSha256: createHash('sha256').update(worker).digest('hex'), passed: false, realModelAcceptance: false, physicalInputAcceptance: false, observations: [], rounds: [] }
  const fixtureSource = await fs.readFile(path.join(__dirname, 'life-windows-save-dialog-fixture.ps1'), 'utf8')
  report.harnessSha256 = createHash('sha256').update(await fs.readFile(__filename)).digest('hex')
  report.fixtureSha256 = createHash('sha256').update(fixtureSource).digest('hex')
  report.refusals = []
  const fixture = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(fixtureSource, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
  const closed = new Promise(resolve => fixture.once('close', (code, signal) => resolve({ code, signal })))
  let errors = ''
  fixture.stderr.on('data', bytes => errors = (errors + bytes.toString()).slice(-3000))
  const ready = new Promise((resolve, reject) => {
    let text = ''
    const timer = setTimeout(() => reject(new Error('Common dialog fixture not ready')), 15000)
    fixture.once('error', reject)
    fixture.stdout.on('data', (bytes) => {
      text += bytes.toString('utf8')
      const line = text.split(/\r?\n/u).find(line => line.includes('"ready":true'))
      if (line) {
        clearTimeout(timer)
        resolve(JSON.parse(line))
      }
    })
  })
  fixture.stdin.end(`${JSON.stringify({ nonce, root, stopPath })}\n`)
  async function invoke(request) {
    const response = await new Promise((resolve, reject) => {
      const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Mta', '-ExecutionPolicy', 'Bypass', '-File', workerPath], { windowsHide: true, timeout: 15000, maxBuffer: 256000 }, (error, stdout) => {
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
      child.stdin.end(`${JSON.stringify(request)}\n`)
    })
    report.observations.push({ request, response })
    return response
  }
  const identity = observation => ({ windowId: observation.windowId, processId: observation.processId, expectedProcessStartTicks: observation.processStartTicks, expectedWindowClass: observation.windowClass, expectedDesktop: observation.desktop, expectedWindowTitle: observation.title, expectedOwnerWindowId: observation.ownerWindowId })
  async function parents(dialog, field) {
    const source = `$q=[Console]::In.ReadLine()|ConvertFrom-Json
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class OwnedDialogTree {
 [DllImport("user32.dll")]public static extern IntPtr GetParent(IntPtr h);
 [DllImport("user32.dll")]public static extern IntPtr GetAncestor(IntPtr h,uint f);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll")]public static extern int GetDlgCtrlID(IntPtr h);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
}
'@
$h=[IntPtr]::new([long]$q.nativeId);$p=[uint32]0
[void][OwnedDialogTree]::GetWindowThreadProcessId($h,[ref]$p)
if($p -ne $q.processId -or [OwnedDialogTree]::GetAncestor($h,2).ToInt64().ToString() -cne $q.windowId){throw 'Owned dialog identity changed'}
$rows=@();for($i=0;$i -lt 6 -and $h -ne [IntPtr]::Zero;$i++){$b=[Text.StringBuilder]::new(256);[void][OwnedDialogTree]::GetClassName($h,$b,256);$rows+=@{nativeId=$h.ToInt64().ToString();className=$b.ToString();controlId=[OwnedDialogTree]::GetDlgCtrlID($h)};$h=[OwnedDialogTree]::GetParent($h)}
ConvertTo-Json -InputObject $rows -Compress`
    return new Promise((resolve, reject) => {
      const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(source, 'utf16le').toString('base64')], { windowsHide: true, timeout: 15000 }, (error, stdout) => error ? reject(error) : resolve(JSON.parse(stdout.trim())))
      child.stdin.end(`${JSON.stringify({ nativeId: field.nativeId, windowId: dialog.windowId, processId: dialog.processId })}\n`)
    })
  }
  const unique = (observation, predicate) => {
    const controls = observation.elements.filter(predicate)
    assert.equal(controls.length, 1, 'Exactly one observed common-dialog control required')
    return controls[0]
  }
  try {
    const owner = await ready
    for (let round = 1; round <= 4; round++) {
      const form = await invoke({ operation: 'observe', windowId: owner.windowId, processId: owner.processId })
      assert.equal(form.ok, true)
      const opened = await invoke({ operation: 'click', ...identity(form), expected: unique(form, control => control.name === 'Open real Save As') })
      assert.equal(opened.ok, true)
      const dialog = await invoke({ operation: 'observe', windowTitle: `Alicization QA Real Save ${nonce}` })
      assert.equal(dialog.ok, true)
      assert.equal(dialog.processId, owner.processId)
      assert.equal(dialog.ownerWindowId, owner.windowId)
      const field = unique(dialog, control => control.role === 'input' && (control.automationId === '1001' || /文件名|File name/iu.test(control.name)))
      report.nativeFieldParents ??= []
      report.nativeFieldParents.push(await parents(dialog, field))
      const target = path.join(root, `当前中文🙂-${round}.txt`)
      const expired = await invoke({ operation: 'type', ...identity(dialog), expected: field, text: 'not-authorized.txt', clearExisting: true, dispatchExpiresAt: Date.now() - 1 })
      assert.equal(expired.ok, false)
      assert.equal(expired.effectMayHaveOccurred, false)
      assert.equal(expired.sideEffectState, 'none')
      report.refusals.push({ round, fault: 'expired-authority', errorCode: expired.errorCode })
      assert.equal((await invoke({ operation: 'type', ...identity(dialog), expected: field, text: target, clearExisting: true })).ok, true)
      const current = await invoke({ operation: 'observe', ...identity(dialog) })
      assert.equal(unique(current, control => control.runtimeId === field.runtimeId).value, target)
      const stale = await invoke({ operation: 'type', ...identity(dialog), expected: field, text: 'stale-name.txt', clearExisting: true })
      assert.equal(stale.ok, false)
      assert.equal(stale.effectMayHaveOccurred, false)
      assert.equal(stale.sideEffectState, 'none')
      report.refusals.push({ round, fault: 'stale-filename', errorCode: stale.errorCode })
      const cancel = round === 1
      const button = unique(current, control => control.role === 'button' && (control.automationId === (cancel ? '2' : '1') || (cancel ? /^(?:取消|Cancel)/iu : /^(?:保存|Save)/iu).test(control.name)))
      const wrongOwner = await invoke({ operation: 'click', ...identity(current), expectedOwnerWindowId: null, expected: button })
      assert.equal(wrongOwner.ok, false)
      assert.equal(wrongOwner.errorCode, 'WINDOWS_UIA_WINDOW_OWNER_CHANGED')
      assert.equal(wrongOwner.effectMayHaveOccurred, false)
      report.refusals.push({ round, fault: 'changed-owner', errorCode: wrongOwner.errorCode })
      assert.equal((await invoke({ operation: 'click', ...identity(current), expected: button })).ok, true)
      // UIA Invoke returns before the application's modal handler settles.
      // Observe that one invocation; never click Save or Cancel a second time.
      const deadline = Date.now() + 5000
      let receipt
      while (!receipt) {
        try {
          receipt = JSON.parse(await fs.readFile(path.join(root, `dialog-result-${round}.json`), 'utf8'))
        }
        catch (error) {
          if (error.code !== 'ENOENT' || Date.now() >= deadline)
            throw error
          await new Promise(resolve => setTimeout(resolve, 25))
        }
      }
      assert.equal(receipt.saved, !cancel)
      if (cancel) {
        await assert.rejects(fs.access(target), { code: 'ENOENT' })
      }
      else {
        const bytes = await fs.readFile(target)
        assert.equal(bytes.toString('utf8'), `actual native dialog ${round} ${nonce} 中文🙂`)
        report.rounds.push({ round, target, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
      }
    }
    report.passed = true
  }
  catch (error) {
    report.error = error.message
    process.exitCode = 1
  }
  finally {
    await fs.writeFile(stopPath, 'stop')
    let timer
    report.fixtureShutdown = await Promise.race([closed, new Promise(resolve => timer = setTimeout(() => resolve(null), 10000))])
    clearTimeout(timer)
    report.fixtureErrors = errors
    if (report.fixtureShutdown?.code !== 0 || report.fixtureShutdown.signal) {
      report.passed = false
      process.exitCode = 1
    }
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' })
    console.info(JSON.stringify({ passed: report.passed, reportPath, error: report.error }))
  }
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
