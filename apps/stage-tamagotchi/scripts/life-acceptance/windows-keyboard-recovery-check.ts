import assert from 'node:assert/strict'
import process, { argv } from 'node:process'

import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { withActionDispatch } from '../../src/main/services/alicization/execution/action-dispatch-context'
import { recoverExecutionEffect } from '../../src/main/services/alicization/execution/effect-recovery-runtime'
import { createExecutionResourceBroker } from '../../src/main/services/alicization/execution/resource-broker'
import { createWindowsKeyboardJournalIndex } from '../../src/main/services/alicization/execution/windows-keyboard-journal'
import { createWindowsKeyboardRecovery } from '../../src/main/services/alicization/execution/windows-keyboard-recovery'
import { createLifeTurnRuntime } from '../../src/main/services/alicization/life-turn-runtime'
import { createLifeWindowsDesktopRuntime } from '../../src/main/services/alicization/life-windows-desktop-runtime'
import { createCanonicalToolRegistry } from '../../src/main/services/alicization/turn-os/tool-registry'
import { assertKeyboardAcceptanceScope } from './windows-keyboard-acceptance-scope'

function workerScope() {
  const run = resolve(argv[3])
  const round = Number(argv[6])
  assert.ok(Number.isInteger(round) && round >= 1 && round <= 3)
  const processId = Number(argv[4])
  assertKeyboardAcceptanceScope(run, processId, argv[5])
  return { run, round, processId, windowId: argv[5], userData: join(run, `recovery-user-data-${round}`) }
}

/** This owned worker is intentionally crashed only after its input pair exits. */
export async function runWindowsKeyboardRecoveryWorker() {
  const scope = workerScope()
  const controller = new AbortController()
  const cancel = () => controller.abort(new Error('Owned recovery parent stopped'))
  process.stdin.once('end', cancel)
  process.stdin.resume()
  const database = await setupAlicizationDb(scope.userData, { cardId: 'keyboard-recovery-alice' })
  const resources = createExecutionResourceBroker()
  const nativeRoot = join(scope.userData, 'alicizations', 'execution-native')
  const index = createWindowsKeyboardJournalIndex({ protectedRoot: nativeRoot, database: () => database })
  const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'keyboard-recovery-alice', keyboard: { protectedRoot: nativeRoot, resourceBroker: () => resources, admitJournal: index.admit }, authorize: async () => ({ allow: true, reason: 'synthetic-host-approved' }) })
  const life = createLifeTurnRuntime({ resourceBroker: resources, read: database.readLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, commit: database.commitLifeState, now: Date.now })
  try {
    const health = await desktop.getKeyboardHealth()
    await writeFile(join(scope.run, `native-recovery-health-${scope.round}.json`), JSON.stringify(health, null, 2), { flag: 'wx' })
    assert.equal(health?.ready, true)
    const turnId = `native-recovery-${scope.round}`
    await life.admit({ cardId: 'keyboard-recovery-alice', turnId, conversationId: 'native-recovery', messages: [{ role: 'user', content: '在自有隔离测试窗口只执行一次指定的快捷键。' }] }, controller.signal)
    const observed: Record<string, unknown> = await desktop.listDesktopInteractables({})
    await writeFile(join(scope.run, `native-recovery-observation-${scope.round}.json`), JSON.stringify(observed, null, 2), { flag: 'wx' })
    assert.equal(observed.ok, true)
    assert.equal(observed.processId, scope.processId)
    assert.equal(observed.windowId, scope.windowId)
    assert.equal(observed.title, 'Alicization isolated keyboard fixture')
    const manifest = createCanonicalToolRegistry({ platform: 'win32', windowsKeyboardGoverned: true, windowsKeyboardReady: true }).resolveActive('tool.desktop_press_keys')!
    const parameters = { shortcut: 'Ctrl+S', repeat: 1 }
    const action = await life.beforeAction({ cardId: 'keyboard-recovery-alice', turnId, actionId: 'recovery-press', capabilityId: 'tool.desktop_press_keys', parameters, owners: (await database.readLifeState()).owners, effectContract: manifest.effects }, controller.signal)
    await action.authorizeDispatch(parameters)
    const outcome: Record<string, unknown> = await withActionDispatch(action.assertDispatchCurrent, () => desktop.pressDesktopKeys({ ...parameters, abortSignal: controller.signal }))
    await writeFile(join(scope.run, `native-recovery-outcome-${scope.round}.json`), JSON.stringify(outcome, null, 2), { flag: 'wx' })
    assert.equal(outcome.ok, true, JSON.stringify(outcome))
    assert.equal(outcome.inputReleased, true)
    assert.equal(outcome.writerStopped, true)
    // Inject loss of the semantic action receipt. The real native records and
    // database admission remain; no success is fabricated in the life journal.
    await life.afterAction({ cardId: 'keyboard-recovery-alice', id: action.id, outcome: 'failure', output: { ok: false, effectMayHaveOccurred: true, inputReleased: false, writerStopped: false, errorCode: 'QA_NATIVE_RECEIPT_LOST' }, interrupted: true })
    assert.equal((await database.getLifeEffect(action.id))?.status, 'uncertain')
    const intent = await index.find((await database.getLifeEffect(action.id))!)
    assert.ok(intent)
    const main = JSON.parse(await readFile(join(intent.programRoot, `main-intent-${intent.nonce}.json`), 'utf8'))
    const marker = { type: 'recovery-post-input', pid: process.pid, startTicks: main.request.parentStartTicks, effectId: action.id, round: scope.round, inputReleased: true, writerStopped: true }
    await writeFile(join(scope.run, `native-recovery-boundary-${scope.round}.json`), JSON.stringify(marker, null, 2), { flag: 'wx' })
    console.info(JSON.stringify(marker))
    await new Promise<void>((resolve) => {
      if (controller.signal.aborted)
        resolve()
      else
        controller.signal.addEventListener('abort', () => resolve(), { once: true })
      process.stdin.resume()
    })
  }
  finally {
    process.stdin.removeListener('end', cancel)
    await desktop.stopKeyboard()
    await database.close()
  }
}

export async function runWindowsKeyboardRecoveryChecks(options: {
  run: string
  fixtureId: number
  fixtureWindow: string
  focus: () => Promise<void>
  state: (deadline?: number) => Promise<{ saves: number, tabs: number, escapes: number, content: string }>
  check: (value: unknown, label: string) => void
  record: (value: unknown) => void
}) {
  for (let round = 1; round <= 3; round++) {
    await options.focus()
    const before = await options.state()
    // Reuse this exact validated bundle and its adjacent native dependencies.
    const child = spawn(process.execPath, [resolve(argv[1]), '--recovery-worker', options.run, String(options.fixtureId), options.fixtureWindow, String(round)], { windowsHide: true, shell: false, stdio: 'pipe' })
    const closed = new Promise<{ code: number | null, signal: NodeJS.Signals | null }>(resolve => child.once('close', (code, signal) => resolve({ code, signal })))
    let stderr = ''
    let stdout = ''
    let confirmed = false
    let readyTimer: ReturnType<typeof setTimeout> | undefined
    const marker = new Promise<{ effectId: string, pid: number, startTicks: string }>((resolve, reject) => {
      readyTimer = setTimeout(() => reject(new Error('Owned native recovery worker did not reach its confirmed post-input point')), 30_000)
      child.once('error', reject)
      child.stdin.on('error', (error) => {
        // Broken stdin is expected after the deliberate confirmed crash.
        // Before confirmation it cannot attest anything about input cleanup.
        if (!confirmed)
          reject(error)
      })
      child.once('close', () => {
        if (!confirmed)
          reject(new Error(`Owned recovery worker closed before readiness: ${stderr.slice(-1024)}`))
      })
      child.stderr.on('data', (bytes) => {
        stderr += bytes.toString()
        if (stderr.length > 4096)
          reject(new Error('Owned recovery worker stderr budget'))
      })
      child.stdout.on('data', (bytes) => {
        try {
          stdout += bytes.toString()
          assert.ok(stdout.length <= 32_768)
          const newline = stdout.indexOf('\n')
          if (newline < 0)
            return
          const record = JSON.parse(stdout.slice(0, newline))
          assert.equal(record.type, 'recovery-post-input')
          assert.equal(record.pid, child.pid)
          assert.equal(record.round, round)
          assert.equal(record.inputReleased, true)
          assert.equal(record.writerStopped, true)
          assert.match(record.startTicks, /^[1-9]\d{17,18}$/u)
          assert.ok(typeof record.effectId === 'string' && record.effectId.length < 256)
          confirmed = true
          resolve(record)
        }
        catch (error) { reject(error) }
      })
    })
    let owner: Awaited<typeof marker>
    try {
      owner = await marker
      clearTimeout(readyTimer)
      options.check(child.kill(), 'Crashes only the held owned Node worker after both native input owners actually release and exit')
      const exit = await Promise.race([closed, delay(5000, null, { ref: false })])
      options.check(exit && (exit.signal !== null || (Number.isInteger(exit.code) && exit.code !== 0)), 'The original Node worker actually exits at the injected lost-receipt boundary')
      options.check(stderr.length === 0, 'The crashed worker has no unexpected stderr')
      const userData = join(options.run, `recovery-user-data-${round}`)
      const database = await setupAlicizationDb(userData, { cardId: 'keyboard-recovery-alice' })
      try {
        const effect = await database.getLifeEffect(owner.effectId)
        options.check(effect?.status === 'uncertain' && effect.turnId === `native-recovery-${round}`, 'The reopened actual SQLite database retains the exact uncertain native effect')
        const index = createWindowsKeyboardJournalIndex({ protectedRoot: join(userData, 'alicizations', 'execution-native'), database: () => database })
        const reader = createWindowsKeyboardRecovery({ index })
        const recovered = await recoverExecutionEffect({ database, broker: createExecutionResourceBroker(), effect: effect!, writerStopped: async current => (await reader(current)).stopped, observe: { desktop: async current => (await reader(current)).result } })
        options.check(recovered?.verdict === 'applied' && recovered.output?.proofScope === 'native-key-delivery-only' && recovered.output?.taskCompletionProven === false, 'Independent native journals and actual kernel identities recover key delivery without certifying the root task')
        const settled = await database.getLifeEffect(owner.effectId)
        const output = settled?.receipt?.output
        options.check(settled?.status === 'settled' && output && typeof output === 'object' && 'recovered' in output && output.recovered === true, 'The same durable effect settles with a distinct reconciliation observation')
        const observationDeadline = Date.now() + 1000
        let after = await options.state(observationDeadline)
        for (let index = 0; index < 50 && Date.now() < observationDeadline && after.saves === before.saves; index++) {
          await delay(20)
          after = await options.state(observationDeadline)
        }
        options.check(after.saves === before.saves + 1 && after.tabs === before.tabs && after.escapes === before.escapes && after.content === before.content, 'Independent fixture proves exactly one shortcut and unchanged Unicode through crash and recovery')
        options.check((await database.readLifeState()).obligations.every(goal => goal.status !== 'fulfilled'), 'Native recovery does not fulfill another task or fabricate an application receipt')
        const record = { round, owner, exit, before, after, effectId: owner.effectId, recovered, scope: 'Actual owned Node context crash after a deliberately lost native receipt; synthetic approval; no Electron bootstrap claim.' }
        await writeFile(join(options.run, `native-recovery-${round}.json`), JSON.stringify(record, null, 2))
        options.record(record)
      }
      finally { await database.close() }
    }
    finally {
      clearTimeout(readyTimer)
      // EOF asks a still-running worker to cancel and close its actual input
      // protocol. Lack of closure is a failure, never release evidence.
      child.stdin.end()
      if (child.exitCode === null && child.signalCode === null) {
        const exit = await Promise.race([closed, delay(12_000, null, { ref: false })])
        if (!exit)
          throw new Error('Owned recovery worker closure is unknown; guest remains quarantined')
      }
    }
  }
}
