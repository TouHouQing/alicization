import assert from 'node:assert/strict'
import process, { argv } from 'node:process'

import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { withActionDispatch } from '../../src/main/services/alicization/execution/action-dispatch-context'
import { createExecutionResourceBroker } from '../../src/main/services/alicization/execution/resource-broker'
import { createWindowsKeyboardJournalIndex } from '../../src/main/services/alicization/execution/windows-keyboard-journal'
import { createLifeTurnRuntime } from '../../src/main/services/alicization/life-turn-runtime'
import { createLifeWindowsDesktopRuntime } from '../../src/main/services/alicization/life-windows-desktop-runtime'
import { createCanonicalToolRegistry } from '../../src/main/services/alicization/turn-os/tool-registry'
import { readKeyboardFixtureState } from './read-keyboard-fixture-state'
import { assertKeyboardAcceptanceScope } from './windows-keyboard-acceptance-scope'
import { runWindowsKeyboardRecoveryChecks, runWindowsKeyboardRecoveryWorker } from './windows-keyboard-recovery-check'

async function main() {
  const run = resolve(argv[2])
  const fixtureId = Number(argv[3])
  const fixtureWindow = argv[4]
  // Actual host fixture or unchanged guest identity must pass before any input.
  const identity = assertKeyboardAcceptanceScope(run, fixtureId, fixtureWindow)
  const unicodeOnly = process.env.LIFE_QA_NATIVE_UNICODE_ONLY === '1'
  const report = { format: 'alicization-native-keyboard-product-v1', scope: 'Actual production desktop adapter, life database/action gate/global broker/native process bridge and owned guest fixture; synthetic approval port; no full Electron bootstrap claim.', passed: false, checks: [] as Array<{ name: string, passed: true }>, observations: [] as unknown[], outcomes: [] as unknown[], rounds: [] as unknown[], recoveryRounds: [] as unknown[], unicodeRounds: [] as unknown[], failure: null as string | null, health: null as unknown, databaseClosed: false, keyboardStopped: false }
  function check(value: unknown, name: string) {
    assert.ok(value, name)
    report.checks.push({ name, passed: true })
  }
  Object.assign(report, { identity, scope: 'Actual production desktop/database/action-gate/broker/native composition and exact owned fixture; synthetic approval; no full Electron bootstrap claim.' })
  if (unicodeOnly)
    report.scope = 'Actual native UIA replacement and semantic save in a passive owned window; synthetic approval, no keyboard injection or foreground/recovery/fault acceptance.'
  async function state(deadline?: number) {
    return readKeyboardFixtureState(join(run, 'fixture-state.json'), { deadline })
  }
  async function focus(control: 'entry' | 'next') {
    const command = randomUUID().replaceAll('-', '')
    await writeFile(join(run, `focus-${control}.txt`), command)
    const deadline = Date.now() + 3000
    for (let index = 0; index < 100 && Date.now() < deadline; index++) {
      const actual = await state(deadline)
      if (actual?.focusCommand === command && actual.focused === control)
        return
      await delay(30)
    }
    throw new Error('Owned fixture focus setup was not acknowledged')
  }
  const userData = join(run, 'product-user-data')
  const database = await setupAlicizationDb(userData, { cardId: 'keyboard-product-alice' })
  const resources = createExecutionResourceBroker()
  const life = createLifeTurnRuntime({ resourceBroker: resources, read: database.readLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, commit: database.commitLifeState, now: Date.now })
  let approve = true
  const nativeRoot = join(userData, 'alicizations', 'execution-native')
  const journalIndex = createWindowsKeyboardJournalIndex({ protectedRoot: nativeRoot, database: () => database })
  const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'keyboard-product-alice', keyboard: { protectedRoot: nativeRoot, resourceBroker: () => resources, admitJournal: journalIndex.admit }, authorize: async (request) => {
    check(['desktop_press_keys', 'desktop_type_text', 'desktop_click_element'].includes(request.operation) && /^[a-f0-9]{64}$/u.test(request.effectDigest || '') && /^[a-f0-9]{64}$/u.test(request.targetFingerprint || ''), 'Approval is bound to the exact observed native action')
    return { allow: approve, reason: approve ? 'synthetic-host-approved' : 'host-denied' }
  } })
  try {
    const health = await desktop.getKeyboardHealth()
    report.health = health
    check(health?.ready, 'Actual bundled native program compiles and verifies without an input probe')
    const registry = createCanonicalToolRegistry({ platform: 'win32', windowsKeyboardReady: health?.ready, windowsKeyboardGoverned: true })
    const manifest = registry.resolveActive('tool.desktop_press_keys')
    check(manifest, 'Catalogue exposes a verified governed adapter without a global foreground grant')
    const signal = new AbortController().signal
    async function admit(turn: string) {
      await life.admit({ cardId: 'keyboard-product-alice', turnId: turn, conversationId: 'native-keyboard-product', messages: [{ role: 'user', content: unicodeOnly ? '在自有测试编辑器中原样替换指定文字，再通过观察到的保存按钮保存。不要激活窗口或注入键盘输入。' : '在自有隔离测试窗口中执行这一次指定的快捷键。' }] }, signal)
      // Read only this owned fixture. A foreign foreground still fails the
      // focused-window assertion; never inspect it or automatically retake it.
      const observed: Record<string, unknown> = await desktop.listDesktopInteractables({ windowTitle: 'Alicization isolated keyboard fixture' })
      report.observations.push(observed)
      check(observed.ok && observed.windowId === fixtureWindow && observed.processId === fixtureId && observed.title === 'Alicization isolated keyboard fixture' && (unicodeOnly || typeof observed.focusWindowId === 'string'), unicodeOnly ? 'Fresh native observation independently identifies the exact passive owned fixture' : 'Actual foreground UIA observation independently identifies the exact owned fixture and focused control')
    }
    async function prepare(turn: string, shortcut: string) {
      const parameters = { shortcut, repeat: 1 }
      const action = await life.beforeAction({ cardId: 'keyboard-product-alice', turnId: turn, actionId: 'press', capabilityId: 'tool.desktop_press_keys', parameters, owners: (await database.readLifeState()).owners, effectContract: manifest!.effects }, signal)
      assert.equal(action.cached, null)
      await action.authorizeDispatch(parameters)
      return { action, parameters }
    }
    if (!unicodeOnly) {
      for (const shortcut of ['Ctrl+S', 'Tab', 'Escape']) {
        for (let round = 1; round <= 3; round++) {
          await focus('entry')
          const before = await state()
          const turn = `native-product-${shortcut}-${round}`
          await admit(turn)
          const { action, parameters } = await prepare(turn, shortcut)
          const outcome: Record<string, unknown> = await withActionDispatch(action.assertDispatchCurrent, () => desktop.pressDesktopKeys({ ...parameters, abortSignal: signal }))
          report.outcomes.push(outcome)
          await life.afterAction({ cardId: 'keyboard-product-alice', id: action.id, outcome: 'success', output: outcome, interrupted: false })
          check(outcome.ok === true && outcome.inputReleased === true && outcome.writerStopped === true, 'Production bridge confirms delivery, both releases and actual process closure')
          const observationDeadline = Date.now() + 1000
          let after = await state(observationDeadline)
          for (let index = 0; index < 50 && Date.now() < observationDeadline && after.saves + after.tabs + after.escapes === before.saves + before.tabs + before.escapes; index++) {
            await delay(20)
            after = await state(observationDeadline)
          }
          check(after.saves === before.saves + Number(shortcut === 'Ctrl+S') && after.tabs === before.tabs + Number(shortcut === 'Tab') && after.escapes === before.escapes + Number(shortcut === 'Escape'), 'Independent fixture confirms exactly one intended action')
          check(after.content === before.content && after.focused === (shortcut === 'Tab' ? 'next' : 'entry'), 'Exact Unicode content and actual focus survive the native shortcut')
          const effect = await database.getLifeEffect(action.id)
          check(effect?.status === 'settled' && effect.receipt?.outcome === 'success', 'The same durable life effect settles after actual input closure')
          check((await database.readLifeState()).obligations.every(goal => goal.status !== 'fulfilled'), 'Input dispatch does not manufacture root goal completion')
          const journal = String(outcome.receiptRoot)
          const nonce = journal.slice(-32)
          const admission = JSON.parse(await readFile(join(resolve(journal, '..'), `main-intent-${nonce}.json`), 'utf8'))
          const ready = JSON.parse(await readFile(join(resolve(journal, '..'), `main-ready-${nonce}.json`), 'utf8'))
          check(admission.owner.effectId === action.id && admission.owner.cardId === 'keyboard-product-alice' && admission.request.target.windowId === fixtureWindow && ready.owner.effectId === action.id && ready.ready.receiptRoot === journal, 'Independent main admission and native readiness preserve the exact effect/target across process boundaries')
          const indexed = await journalIndex.find(effect!)
          check(indexed?.nonce === nonce && indexed.owner.effectId === action.id, 'The durable life database finds exactly this native admission without scanning cache directories')
          report.rounds.push({ shortcut, round, before, after, effectId: action.id, outcome })
        }
      }
      for (const refusal of ['source-withdrawn', 'focus-changed', 'host-denied']) {
        for (let round = 1; round <= 3; round++) {
          await focus('entry')
          const before = await state()
          const turn = `native-product-${refusal}-${round}`
          await admit(turn)
          const { action, parameters } = await prepare(turn, refusal === 'host-denied' ? 'Ctrl+S' : 'Tab')
          if (refusal === 'source-withdrawn')
            await database.commitLifeState({ cardId: 'keyboard-product-alice', operationKey: `withdraw:${turn}`, changes: [], mutations: [{ type: 'ingress-settle', id: `user:${turn}`, status: 'held' }] })
          if (refusal === 'focus-changed')
            await focus('next')
          approve = refusal !== 'host-denied'
          let outcome: Record<string, unknown>
          try {
            outcome = await withActionDispatch(action.assertDispatchCurrent, () => desktop.pressDesktopKeys({ ...parameters, abortSignal: signal }))
          }
          catch (error) {
            assert.equal(refusal, 'source-withdrawn')
            assert.match(String(error), /ended or withdrawn/u)
            outcome = { ok: false, status: 'failed', sideEffectState: 'none', errorCode: 'SOURCE_WITHDRAWN_AT_MAIN_GATE' }
          }
          report.outcomes.push(outcome)
          await life.afterAction({ cardId: 'keyboard-product-alice', id: action.id, outcome: 'failure', output: outcome, interrupted: false })
          check(outcome.ok === false && outcome.sideEffectState === 'none', 'Changed source/focus or denied approval causes a definite no-input result')
          const after = await state()
          check(after.saves === before.saves && after.tabs === before.tabs && after.escapes === before.escapes && after.content === before.content, 'Independent fixture shows no shortcut or content effect after refusal')
          check((await database.getLifeEffect(action.id))?.status === 'settled', 'Definite refusal settles its own effect without leaving a false uncertain writer')
          report.rounds.push({ refusal, round, before, after, effectId: action.id, outcome })
        }
      }
      await runWindowsKeyboardRecoveryChecks({ run, fixtureId, fixtureWindow, focus: () => focus('entry'), state, check, record: value => report.recoveryRounds.push(value) })
    }
    const typing = registry.resolveActive('tool.desktop_type_text')
    check(typing, 'The production catalogue exposes governed native Unicode text replacement')
    approve = true
    for (let round = 1; round <= 3; round++) {
      if (!unicodeOnly)
        await focus('entry')
      const text = `实际输入 第${round}轮 ${randomUUID()} 中文🙂 e\u0301 👩‍💻 العربية`
      const turn = `native-unicode-${round}`
      await admit(turn)
      const parameters = { windowTitle: 'Alicization isolated keyboard fixture', role: 'input' as const, ordinal: 1, text, clearExisting: true }
      const action = await life.beforeAction({ cardId: 'keyboard-product-alice', turnId: turn, actionId: 'replace', capabilityId: 'tool.desktop_type_text', parameters, owners: (await database.readLifeState()).owners, effectContract: typing!.effects }, signal)
      assert.equal(action.cached, null)
      await action.authorizeDispatch(parameters)
      const typed: Record<string, unknown> = await withActionDispatch(action.assertDispatchCurrent, () => desktop.typeDesktopText({ ...parameters, abortSignal: signal }))
      report.outcomes.push(typed)
      await life.afterAction({ cardId: 'keyboard-product-alice', id: action.id, outcome: typed.ok ? 'success' : 'failure', output: typed, interrupted: false })
      check(typed.ok === true, 'Actual native text replacement accepts Chinese, combining marks, joined emoji and Arabic')
      const readback: Record<string, unknown> = await desktop.listDesktopInteractables({ windowTitle: parameters.windowTitle, role: 'input' })
      check(readback.ok === true && Array.isArray(readback.elements) && readback.elements.some((element: unknown) => element !== null && typeof element === 'object' && 'value' in element && element.value === text), 'Fresh native observation preserves every requested Unicode code unit')
      const before = await state()
      check(before.content === text, 'The independent owned editor observes the exact replacement text')
      let saveAction: Awaited<ReturnType<typeof life.beforeAction>>
      let saved: Record<string, unknown>
      if (unicodeOnly) {
        const parameters = { windowTitle: 'Alicization isolated keyboard fixture', text: '保存', role: 'button' as const, exactText: true }
        const capability = registry.resolveActive('tool.desktop_click_element')
        check(capability, 'The passive save uses the actual governed native click capability')
        saveAction = await life.beforeAction({ cardId: 'keyboard-product-alice', turnId: turn, actionId: 'save', capabilityId: 'tool.desktop_click_element', parameters, owners: (await database.readLifeState()).owners, effectContract: capability!.effects }, signal)
        assert.equal(saveAction.cached, null)
        await saveAction.authorizeDispatch(parameters)
        saved = await withActionDispatch(saveAction.assertDispatchCurrent, () => desktop.clickDesktopElement({ ...parameters, abortSignal: signal }))
      }
      else {
        const save = await prepare(turn, 'Ctrl+S')
        saveAction = save.action
        saved = await withActionDispatch(saveAction.assertDispatchCurrent, () => desktop.pressDesktopKeys({ ...save.parameters, abortSignal: signal }))
      }
      report.outcomes.push(saved)
      await life.afterAction({ cardId: 'keyboard-product-alice', id: saveAction.id, outcome: saved.ok ? 'success' : 'failure', output: saved, interrupted: false })
      check(saved.ok === true && (unicodeOnly || (saved.inputReleased === true && saved.writerStopped === true)), unicodeOnly ? 'One real native button invocation saves through the owned application writer' : 'One native save confirms owned input release and actual writer closure')
      const observationDeadline = Date.now() + 1000
      let after = await state(observationDeadline)
      for (let index = 0; index < 50 && Date.now() < observationDeadline && after.saves === before.saves; index++) {
        await delay(20)
        after = await state(observationDeadline)
      }
      check(after.saves === before.saves + 1 && after.content === text, 'Independent editor state observes exactly one save and unchanged Unicode text')
      if (unicodeOnly)
        check(before.passive && after.passive && !before.foreground && !after.foreground, 'The passive Unicode workflow never activates its owned test window')
      const artifact = join(run, `saved-${after.saves}.txt`)
      const bytes = await readFile(artifact)
      check(bytes.equals(Buffer.from(text, 'utf8')), 'The actual saved file preserves exact UTF8 bytes without normalization')
      check((await database.readLifeState()).obligations.every(goal => goal.status !== 'fulfilled'), 'Text replacement and key delivery alone never manufacture a root completion')
      report.unicodeRounds.push({ round, artifact, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), effectId: action.id, saveEffectId: saveAction.id })
    }
    check(!desktop.isWriting(), 'No production native writer remains active after the complete matrix')
    report.passed = true
  }
  catch (error) {
    report.failure = String(error)
    throw error
  }
  finally {
    report.keyboardStopped = (await desktop.stopKeyboard())?.stopped === true
    await database.close()
    report.databaseClosed = true
    await writeFile(join(run, 'product-report.json'), JSON.stringify(report, null, 2))
  }
  console.info(JSON.stringify({ type: 'product-check-complete', passed: report.passed, checks: report.checks.length, rounds: report.rounds.length }))
}

void (argv[2] === '--recovery-worker' ? runWindowsKeyboardRecoveryWorker() : main()).catch((error) => {
  console.error(String(error))
  process.exitCode = 1
})
