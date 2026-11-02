/* eslint-disable unicorn/prefer-dom-node-text-content -- Verify the actual permission button and task result. */
const assert = require('node:assert/strict')
const { execFileSync, spawn } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')

const { compileWindowsKeyboardShortcut } = require('../../src/main/services/alicization/execution/windows-keyboard-shortcut.ts')
const { isOwnedHostViewport } = require('./electron-launch.cjs')
const { sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function approveOwnedShortcut(pages, proof) {
  for (const page of pages) {
    const dialog = page.getByRole('dialog', { name: '确认这次操作', exact: true })
    if (!await dialog.isVisible())
      continue
    const decision = await dialog.evaluate((element, expected) => {
      const seen = new Set()
      function find(node) {
        if (!node || typeof node !== 'object' || seen.has(node))
          return null
        seen.add(node)
        const instance = node.component || node
        if (instance.props && Object.hasOwn(instance.props, 'request') && Object.hasOwn(instance.props, 'resolving'))
          return instance
        for (const child of [node.component, node.subTree, node.suspense?.activeBranch, node.ssContent, ...(Array.isArray(node.children) ? node.children : [])]) {
          const found = find(child)
          if (found)
            return found
        }
        return null
      }
      const app = document.querySelector('#app').__vue_app__
      const modal = find(app._instance ?? app._container._vnode.component)
      const request = modal?.props.request
      if (!request || modal.props.resolving || request.requestId !== element.dataset.permissionRequestId)
        return { stale: true }
      let target
      try {
        target = JSON.parse(request.resourcePath)
      }
      catch {
        return { allowed: false, reason: 'non-native-target' }
      }
      const exact = request.cardId === 'default' && request.serverName === 'local-interface'
        && request.toolName === 'desktop_press_keys' && request.riskLevel === 'danger' && request.actionCategory === 'execute'
        && request.resourceLabel === `Alicization isolated keyboard fixture: ${expected.shortcutLabel}` && request.supportsRememberSession === false
        && target.processId === expected.processId && target.windowId === expected.windowId
        && target.processStartTicks === expected.startTicks && target.desktop === 'Default'
        && typeof target.focusWindowId === 'string' && /^[1-9]\d*$/u.test(target.focusWindowId)
      if (!exact)
        return { allowed: false, reason: 'operation-or-original-process-mismatch' }
      const button = [...element.querySelectorAll('button')].find(button => button.textContent.trim() === '允许' && !button.disabled && button.getClientRects().length)
      if (!button || button.dataset.permissionRequestId !== request.requestId || button.dataset.permissionToken !== request.token)
        return { stale: true }
      button.click()
      return { allowed: true, requestId: request.requestId, operation: request.toolName, targetBound: true }
    }, { ...proof, shortcutLabel: compileWindowsKeyboardShortcut('Ctrl+S', 1).shortcut })
    if (decision.stale)
      return null
    assert.equal(decision.allowed, true, JSON.stringify(decision))
    return decision
  }
  return null
}

function createOwnedKeyboardWorkPlan({ goal, artifact, text, unicodeInput }) {
  return { goal, criteria: [{ id: 'saved', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: artifact, sha256: createHash('sha256').update(text).digest('hex') } }], steps: [
    { id: 'observe', dependsOn: [], capabilityId: 'tool.desktop_list_interactables', input: { windowTitle: 'Alicization isolated keyboard fixture' }, acceptanceCriterionIds: [] },
    ...(unicodeInput
      ? [
          { id: 'replace', dependsOn: ['observe'], capabilityId: 'tool.desktop_type_text', input: { windowTitle: 'Alicization isolated keyboard fixture', role: 'input', ordinal: 1, text, clearExisting: true }, acceptanceCriterionIds: [] },
          { id: 'readback', dependsOn: ['replace'], capabilityId: 'tool.desktop_list_interactables', input: { windowTitle: 'Alicization isolated keyboard fixture' }, acceptanceCriterionIds: [] },
        ]
      : []),
    { id: 'save', dependsOn: [unicodeInput ? 'readback' : 'observe'], capabilityId: 'tool.desktop_press_keys', input: { shortcut: 'Ctrl+S', repeat: 1 }, acceptanceCriterionIds: ['saved'] },
  ] }
}

exports.createOwnedKeyboardWorkPlan = createOwnedKeyboardWorkPlan

exports.runElectronKeyboardProductChecks = async function ({ stage, settings, chat, report, capture, check }) {
  assert.ok(isOwnedHostViewport(report), 'Physical input requires the explicitly authorized actual host runtime')
  await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
  const bundle = path.resolve(process.env.LIFE_PRODUCT_NATIVE_KEYBOARD_BUNDLE || '')
  assert.equal(path.dirname(bundle), path.resolve('output'))
  assert.match(path.basename(bundle), /^keyboard-product-payload-[a-f0-9]{32}$/u)
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'windows-keyboard-host-check.ps1'), '-NodePath', process.execPath, '-BundleDirectory', bundle, '-FixtureOnly'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  const closed = new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })
  let ready
  let cleanupRoot
  let diagnostics = ''
  child.stderr.on('data', bytes => diagnostics = `${diagnostics}${bytes}`.slice(-4000))
  try {
    ready = await new Promise((resolve, reject) => {
      let pending = ''
      const timer = setTimeout(() => reject(new Error(`Owned fixture startup failed: ${diagnostics}`)), 15000)
      const observe = (bytes) => {
        pending += bytes.toString()
        if (pending.length > 65536) {
          clearTimeout(timer)
          reject(new Error('Owned fixture startup exceeded its protocol budget'))
          return
        }
        let newline
        while ((newline = pending.indexOf('\n')) >= 0) {
          const line = pending.slice(0, newline).trim()
          pending = pending.slice(newline + 1)
          if (!line.startsWith('{'))
            continue
          try {
            const value = JSON.parse(line)
            if (value.type === 'owned-host-fixture-starting') {
              assert.equal(path.dirname(value.run), path.resolve('output'))
              assert.match(path.basename(value.run), /^keyboard-host-[a-f0-9]{32}$/u)
              assert.equal(value.proofPath, path.join(value.run, 'host-fixture-owner.json'))
              cleanupRoot = value.run
            }
            if (value.type === 'owned-host-fixture-ready') {
              assert.equal(value.run, cleanupRoot)
              clearTimeout(timer)
              child.stdout.removeListener('data', observe)
              resolve(value)
              return
            }
          }
          catch (error) {
            clearTimeout(timer)
            child.stdout.removeListener('data', observe)
            reject(error)
            return
          }
        }
      }
      child.stdout.on('data', observe)
      void closed.then(() => {
        clearTimeout(timer)
        reject(new Error(`Owned fixture exited before readiness: ${diagnostics}`))
      }, reject)
    })
    assert.equal(path.dirname(ready.run), path.resolve('output'))
    assert.match(path.basename(ready.run), /^keyboard-host-[a-f0-9]{32}$/u)
    assert.equal(ready.proofPath, path.join(ready.run, 'host-fixture-owner.json'))
    const proof = JSON.parse(await fs.readFile(ready.proofPath, 'utf8'))
    assert.equal(proof.processId, ready.processId)
    assert.equal(proof.windowId, ready.windowId)
    const assertOwned = () => {
      const actual = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'assert-owned-windows-fixture.ps1'), '-ProofPath', ready.proofPath], { windowsHide: true, timeout: 15000, encoding: 'utf8' }))
      assert.equal(actual.ownedHostFixtureVerified, true)
      assert.equal(actual.processId, proof.processId)
    }
    const unicodeInput = process.env.LIFE_PRODUCT_UNICODE_KEYS === '1'
    if (unicodeInput)
      report.electronKeyboardUnicodeScope = 'Actual fresh native text replacement, fresh observation and one physical save per case; exact owned editor only. No overwrite dialog, generic editor or human takeover claim.'
    report.electronKeyboardExperiences = []
    report.electronKeyboardFixture = { ...ready, startTicks: proof.startTicks, scope: 'Actual owned host editor; real Electron risk confirmation and native input; no unrelated target' }
    const focus = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'focus-owned-windows-fixture.ps1'), '-ProofPath', ready.proofPath], { windowsHide: true, timeout: 15000, encoding: 'utf8' }))
    assert.equal(focus.foregroundAcquired, true)
    assert.equal(focus.processId, proof.processId)
    assert.equal(focus.shortcutInjected, false)
    report.electronKeyboardInitialFocus = focus
    for (let round = 1; round <= 3; round++) {
      const text = unicodeInput ? `实际输入 第${round}轮 ${randomUUID()} 中文🙂 e\u0301 👩‍💻 العربية` : 'Actual keyboard fixture 中文🙂'
      assertOwned()
      const artifact = path.join(ready.run, `saved-${round}.txt`)
      assert.equal(await fs.stat(artifact).then(() => true, error => error.code === 'ENOENT' ? false : Promise.reject(error)), false)
      const goal = `QA Electron 原生保存 ${round} ${randomUUID()}`
      const plan = createOwnedKeyboardWorkPlan({ goal, artifact, text, unicodeInput })
      const preparation = unicodeInput ? '先读取指定窗口，使用其唯一输入框原样替换为本轮文字，再重新读取同一窗口，' : '只读取指定窗口，'
      await sendExecutionRequest(chat, `请使用 life_execute_work_plan 原样执行这份自有测试编辑器计划。${preparation}确认后只发送一次 Ctrl+S，由编辑器保存当前文字并独立读回文件验收。不要直接写文件，不要重试快捷键。参数：${JSON.stringify(plan)}`)
      const item = settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: goal })
      await item.waitFor({ timeout: 15000 })
      const deadline = Date.now() + 45000
      let decision
      while (Date.now() < deadline) {
        // The round already verifies the fixture executable and birth. Do not
        // start a PowerShell hashing worker on every UI poll: it delays the
        // real confirmation while consuming the product's observation TTL.
        // Approval remains bound to that birth, and native hooks fence it.
        decision ||= await approveOwnedShortcut([settings, chat, stage], proof)
        if (await fs.readFile(artifact, 'utf8').catch(error => error.code === 'ENOENT' ? null : Promise.reject(error)) === text && (await item.innerText()).includes('结果已确认'))
          break
        await delay(200)
      }
      assert.ok(decision?.allowed, 'The actual native risk dialog must be approved for this exact original window')
      assert.equal(await fs.readFile(artifact, 'utf8'), text)
      assert.ok((await item.innerText()).includes('结果已确认'))
      const state = JSON.parse(await fs.readFile(path.join(ready.run, 'fixture-state.json'), 'utf8'))
      assert.equal(state.saves, round)
      assert.equal(state.content, text)
      const body = await sampleLive2D(stage)
      check(`Electron keyboard round ${round} retains the actual Live2D draw and exactly one native save`, body.models.length === 1 && body.models[0].drawFrame?.frame > 0)
      report.electronKeyboardExperiences.push({ round, goal, artifact, ...(unicodeInput ? { text } : {}), sha256: createHash('sha256').update(text).digest('hex'), planId: await item.getAttribute('data-work-plan-id'), obligationId: await item.getAttribute('data-work-obligation-id'), decision, saves: state.saves })
      await capture(settings, `electron-native-keyboard-${round}`)
    }
  }
  catch (error) {
    report.electronKeyboardFixtureFailure = { message: error.message, diagnostics }
    throw error
  }
  finally {
    if (cleanupRoot)
      await fs.writeFile(path.join(cleanupRoot, 'stop.txt'), 'Close this exact owned Electron acceptance fixture')
    const exit = await Promise.race([closed, delay(5000).then(() => ({ code: null, signal: 'timeout' }))])
    report.electronKeyboardFixtureShutdown = exit
    if (!report.electronKeyboardFixtureFailure)
      assert.equal(exit.code, 0, 'The original fixture controller must close normally')
  }
}
