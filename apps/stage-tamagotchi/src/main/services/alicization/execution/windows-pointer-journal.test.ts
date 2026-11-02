import type { LifeEffect } from '../../../../shared/life-contracts'
import type { WindowsPointerJournalAdmission } from './windows-pointer-journal'

import { Buffer } from 'node:buffer'
import { createHash, randomBytes } from 'node:crypto'
import { link, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { arch, env, platform } from 'node:process'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { recoverExecutionEffect } from './effect-recovery-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { createWindowsPointerJournalIndex, readOwnedPointerJournalFile } from './windows-pointer-journal'
import { createWindowsPointerProgram } from './windows-pointer-program'
import { createWindowsPointerRecovery } from './windows-pointer-recovery'
import { createWindowsPointerWriter } from './windows-pointer-writer'

const cleanup: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse())
    await close()
})

async function fixture(realNative = false) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'alicization-pointer-journal-test-')))
  cleanup.push(() => rm(root, { recursive: true, force: true }))
  const databaseRoot = join(root, 'database')
  let database = await setupAlicizationDb(databaseRoot, { cardId: 'alice' })
  cleanup.push(() => database.close())
  const protectedRoot = join(root, 'native')
  const nativeProgram = realNative ? createWindowsPointerProgram(protectedRoot) : null
  const prepared = await nativeProgram?.ready()
  if (nativeProgram)
    cleanup.push(() => nativeProgram.dispose())
  const programRoot = prepared?.root ?? join(protectedRoot, 'pointer-Abc123')
  await mkdir(programRoot, { recursive: true })
  const executable = prepared ? await readFile(prepared.executable) : Buffer.from('Inert owned unit-test program bytes; never executed.')
  const programHash = createHash('sha256').update(executable).digest('hex')
  if (!prepared)
    await writeFile(join(programRoot, 'pointer.exe'), executable)
  const resources = createExecutionResourceBroker()
  const life = createLifeTurnRuntime({ resourceBroker: resources, read: database.readLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, commit: database.commitLifeState, now: Date.now })
  const signal = new AbortController().signal
  const turnId = 'pointer-journal-turn'
  await life.admit({ cardId: 'alice', turnId, conversationId: 'journal', messages: [{ role: 'user', content: '对自有测试窗口执行指定可视按钮。' }] }, signal)
  const observationId = 'visual-window:12345678-1234-1234-1234-123456789abc'
  const snapshot = { owner: { windowId: '100', processId: 101, processStartTicks: '639000000000000000', windowClass: 'OwnedFixture', desktop: 'Default' }, authority: { userSid: 'S-1-5-21-123-456-789-1001', sessionId: 1, integrityLevel: 8192, ownerWindowId: null }, geometry: { coordinateSpace: 'screen-physical', clientBounds: { left: 100, top: 200, width: 800, height: 600 }, virtualScreen: { left: 0, top: 0, width: 2560, height: 1440 }, displays: [{ left: 0, top: 0, width: 2560, height: 1440 }], imageWidth: 400, imageHeight: 300, dpiX: 144, dpiY: 144 }, imageSha256: 'a'.repeat(64) }
  const nativeAction = { kind: 'click', button: 'left', wheel: 0, points: [{ x: 301, y: 401 }] }
  const registry = createCanonicalToolRegistry({ platform: 'win32', windowsVisualReady: true })
  const observedParameters = { windowTitle: 'Owned Fixture', targets: ['fixture save button'] }
  const observedAction = await life.beforeAction({ cardId: 'alice', turnId, actionId: 'visual-read', capabilityId: 'tool.desktop_locate_window', parameters: observedParameters, owners: (await database.readLifeState()).owners, effectContract: registry.resolveActive('tool.desktop_locate_window')!.effects }, signal)
  await observedAction.authorizeDispatch(observedParameters)
  await life.afterAction({ cardId: 'alice', id: observedAction.id, outcome: 'success', interrupted: false, output: { status: 'completed', ok: true, operation: 'desktop_locate_window', observationId, ...snapshot.owner, ownerWindowId: snapshot.authority.ownerWindowId, geometry: snapshot.geometry, imageSha256: snapshot.imageSha256, title: 'Owned Fixture', locations: [{ index: 0, state: 'unique', confidence: 0.99, point: { space: 'image-pixel', x: 100, y: 100 }, explanation: 'Visible fixture' }] } })
  const parameters = { observationId, kind: 'click', button: 'left', targetIndex: 0 }
  const manifest = createCanonicalToolRegistry({ platform: 'win32', windowsVisualReady: true }).resolveActive('tool.desktop_pointer_action')!
  const action = await life.beforeAction({ cardId: 'alice', turnId, actionId: 'pointer-journal-action', capabilityId: 'tool.desktop_pointer_action', parameters, owners: (await database.readLifeState()).owners, effectContract: manifest.effects }, signal)
  await action.authorizeDispatch(parameters)
  const authority = await action.assertDispatchCurrent()
  const lease = authority.resourceLease!
  const owner = { cardId: 'alice', turnId, effectId: action.id, leaseId: lease.id, epoch: lease.epoch, fencingToken: lease.fencingToken }
  const index = createWindowsPointerJournalIndex({ protectedRoot, database: () => database })
  async function admission() {
    const nonce = randomBytes(16).toString('hex')
    const intent = { version: 1, owner, observationId, programSha256: programHash, admittedAt: Date.now(), request: { version: 1, mappingName: `Local\\AlicizationInput_${nonce}`, tag: '42', bindingHash: 'b'.repeat(64), parentProcessId: 2_147_483_644, parentStartTicks: '639000000000000000', expiresAt: Date.now() + 15_000, action: nativeAction, snapshot } }
    const body = JSON.stringify(intent)
    await writeFile(join(programRoot, `main-intent-${nonce}.json`), body, { flag: 'wx' })
    return { version: 1, programRoot, nonce, intentHash: createHash('sha256').update(body).digest('hex'), owner } satisfies WindowsPointerJournalAdmission
  }
  async function nativeReceipts(admission: WindowsPointerJournalAdmission, mode: 'complete' | 'partial' | 'none' = 'complete') {
    const receiptRoot = join(programRoot, `alicization-owned-input-${admission.nonce}`)
    await mkdir(receiptRoot)
    const bindingHash = 'b'.repeat(64)
    const guardian = { type: 'guardian-release', bindingHash, inputReleased: true, stopReason: mode === 'complete' ? 1 : 6, failure: null, readyPreparationMs: 1 }
    const ready = { type: 'ready', bindingHash, actorStartTicks: '639000000000000001', guardianProcessId: 2_147_483_645, guardianStartTicks: '639000000000000002', receiptRoot }
    const actor = { type: 'result', bindingHash, ok: mode === 'complete', completedRounds: mode === 'complete' ? 1 : 0, insertedEvents: mode === 'complete' ? 3 : mode === 'partial' ? 1 : 0, effectMayHaveOccurred: mode !== 'none', inputReleased: true, guardianNormalExit: true, guardianReady: JSON.stringify({ type: 'guardian-ready', bindingHash }), guardianReceipt: JSON.stringify(guardian), stopReason: guardian.stopReason, failure: mode === 'complete' ? null : 'cancelled', ownedKeys: [], receiptRoot }
    await writeFile(join(programRoot, `main-ready-${admission.nonce}.json`), JSON.stringify({ version: 1, owner, actorProcessId: 2_147_483_646, ready }), { flag: 'wx' })
    await writeFile(join(receiptRoot, 'session-owner.txt'), `AlicizationOwnedInputReceipt1\n${bindingHash}\n42\n`, { flag: 'wx' })
    await writeFile(join(receiptRoot, 'actor-result.json'), JSON.stringify(actor), { flag: 'wx' })
    await writeFile(join(receiptRoot, 'guardian-release.json'), JSON.stringify(guardian), { flag: 'wx' })
    await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output: { ok: false, effectMayHaveOccurred: true, inputReleased: false, writerStopped: false }, interrupted: true })
    return { receiptRoot, ready, actor, guardian }
  }
  async function actualNativeRefusal() {
    if (!nativeProgram)
      throw new Error('Actual owned native program required')
    const writer = createWindowsPointerWriter(nativeProgram, undefined, index.admit)
    const result = await writer.run({ snapshot: snapshot as never, action: { kind: 'click', button: 'left', point: { space: 'image-pixel', x: 100, y: 100 } }, observationId, bindingHash: 'b'.repeat(64), owner, expiresAt: Date.now() + 15_000, assertCurrent: async () => { await action.assertDispatchCurrent() } })
    // Simulate losing the final return before the main life effect can settle.
    // Recovery must independently read the real compiled actor's durable file.
    await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output: { ok: false, effectMayHaveOccurred: true, inputReleased: false, writerStopped: false }, interrupted: true })
    return result
  }
  return { root, protectedRoot, programRoot, resources, database: () => database, index, admission, nativeReceipts, actualNativeRefusal, effect: async () => (await database.getLifeEffect(action.id))!, reopen: async () => {
    await database.close()
    database = await setupAlicizationDb(databaseRoot, { cardId: 'alice' })
  } }
}

describe('durable native input admission index', () => {
  it('reopens the same card database and retrieves exactly the original admitted effect', async () => {
    const f = await fixture()
    const admission = await f.admission()
    await f.index.admit(admission)
    await f.reopen()
    expect(await f.index.find(await f.effect())).toEqual(admission)
  })

  it('uses the real database CAS to admit only one nonce for concurrent or restarted attempts', async () => {
    const f = await fixture()
    const first = await f.admission()
    const second = await f.admission()
    const results = await Promise.allSettled([f.index.admit(first), f.index.admit(second)])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
    const original = await f.index.find(await f.effect())
    expect([first.nonce, second.nonce]).toContain(original?.nonce)
    await f.reopen()
    await expect(f.index.admit(await f.admission())).rejects.toThrow('ALREADY_ADMITTED')
    expect(await f.index.find(await f.effect())).toEqual(original)
  })

  it('rejects another card, another turn and changed effect parameters', async () => {
    const f = await fixture()
    const admission = await f.admission()
    await expect(f.index.admit({ ...admission, owner: { ...admission.owner, cardId: 'bob' } })).rejects.toThrow('CARD_IDENTITY')
    await expect(f.index.admit({ ...admission, owner: { ...admission.owner, turnId: 'another-turn' } })).rejects.toThrow('EFFECT_IDENTITY')
    await f.index.admit(admission)
    const effect = await f.effect()
    await expect(f.index.find({ ...effect, payload: { ...effect.payload, parameters: { kind: 'click', button: 'right', observationId: 'visual-window:12345678-1234-1234-1234-123456789abc', targetIndex: 0 } } } as LifeEffect)).rejects.toThrow('INDEX_BINDING')
  })

  it('refuses a sibling program directory and a changed intent after indexing', async () => {
    const f = await fixture()
    const admission = await f.admission()
    const sibling = join(f.root, 'outside-native', 'pointer-Abc123')
    await mkdir(sibling, { recursive: true })
    await expect(f.index.admit({ ...admission, programRoot: sibling })).rejects.toThrow('PROGRAM_ROOT')
    await f.index.admit(admission)
    const intent = join(f.programRoot, `main-intent-${admission.nonce}.json`)
    await writeFile(intent, `${await readFile(intent, 'utf8')} `)
    await expect(f.index.find(await f.effect())).rejects.toThrow('INTENT_HASH')
  })

  it('does not turn an absent index or a mismatched original grounded point into a recovery record', async () => {
    const f = await fixture()
    expect(await f.index.find(await f.effect())).toBeNull()
    const admission = await f.admission()
    const path = join(f.programRoot, `main-intent-${admission.nonce}.json`)
    const intent = JSON.parse(await readFile(path, 'utf8'))
    intent.request.action.points[0].x += 1
    const body = JSON.stringify(intent)
    await writeFile(path, body)
    await expect(f.index.admit({ ...admission, intentHash: createHash('sha256').update(body).digest('hex') })).rejects.toThrow('INTENT_BINDING')
    expect(await f.index.find(await f.effect())).toBeNull()
  })

  it('refuses linked or oversized receipt files and arbitrary names', async () => {
    const f = await fixture()
    const file = join(f.programRoot, 'actor-result.json')
    await writeFile(file, '{}')
    await link(file, join(f.programRoot, 'hard-linked-copy.json'))
    await expect(readOwnedPointerJournalFile(f.programRoot, 'actor-result.json')).rejects.toThrow('FILE_IDENTITY')
    await writeFile(join(f.programRoot, 'guardian-release.json'), 'x'.repeat(16_385))
    await expect(readOwnedPointerJournalFile(f.programRoot, 'guardian-release.json')).rejects.toThrow('FILE_IDENTITY')
    await expect(readOwnedPointerJournalFile(f.programRoot, '../actor-result.json')).rejects.toThrow('FILE_NAME')
  })
})

describe('independent native input reconciliation', () => {
  it.skipIf(env.ALICIZATION_NATIVE_PROGRAM_CHECK !== '1' || platform !== 'win32' || arch !== 'x64')('recovers an actual compiled pre-hook refusal after SQLite reopen using the real kernel process inspector', async () => {
    const f = await fixture(true)
    expect(await f.actualNativeRefusal()).toMatchObject({ ok: false, inputReleased: true, writerStopped: true, noInput: { guardianStarted: false, hooksInstalled: false, insertedEvents: 0 } })
    await f.reopen()
    const effect = await f.effect()
    expect(effect.status).toBe('uncertain')
    const read = createWindowsPointerRecovery({ index: f.index })
    expect(await read(effect)).toMatchObject({ stopped: true, result: { verdict: 'not-applied', independent: true, evidence: { scope: 'native-pointer-preflight-only', guardianStarted: false, hooksInstalled: false }, output: { taskCompletionProven: false, effectMayHaveOccurred: false } } })
    const recovered = await recoverExecutionEffect({ database: f.database(), broker: f.resources, effect, writerStopped: async current => (await read(current)).stopped, observe: { desktop: async current => (await read(current)).result } })
    expect(recovered?.verdict).toBe('not-applied')
    expect((await f.effect()).status).not.toBe('uncertain')
    expect((await f.database().readLifeState()).obligations.every(goal => goal.status !== 'fulfilled')).toBe(true)
  }, 40_000)
  it('keeps the effect uncertain if a release record changes during process inspection', async () => {
    const f = await fixture()
    const admission = await f.admission()
    await f.index.admit(admission)
    const records = await f.nativeReceipts(admission)
    let changed = false
    const inspect = vi.fn(async () => {
      if (!changed) {
        changed = true
        await writeFile(join(records.receiptRoot, 'guardian-release.json'), JSON.stringify({ ...records.guardian, stopReason: 6 }))
      }
      return 'stopped' as const
    })
    const read = createWindowsPointerRecovery({ index: f.index, inspectProcess: inspect })
    expect(await read(await f.effect())).toMatchObject({ stopped: false, result: { verdict: 'unknown' } })
    expect((await f.effect()).status).toBe('uncertain')
  })

  it('reopens the database and settles only the original mouse delivery without replay or root completion', async () => {
    const f = await fixture()
    const admission = await f.admission()
    await f.index.admit(admission)
    await f.nativeReceipts(admission)
    await f.reopen()
    const effect = await f.effect()
    expect(effect.status).toBe('uncertain')
    const inspect = vi.fn().mockResolvedValue('stopped')
    const read = createWindowsPointerRecovery({ index: f.index, inspectProcess: inspect })
    const result = await recoverExecutionEffect({ database: f.database(), broker: f.resources, effect, writerStopped: async current => (await read(current)).stopped, observe: { desktop: async current => (await read(current)).result } })
    expect(result).toMatchObject({ verdict: 'applied', independent: true, effectId: effect.id, output: { recovered: true, requiresReadback: true, taskCompletionProven: false, proofScope: 'native-pointer-delivery-only' } })
    expect(await f.effect()).toMatchObject({ status: 'settled', receipt: { outcome: 'success', output: { recovered: true, proofScope: 'native-pointer-delivery-only' } } })
    expect(inspect.mock.calls.every(([identity]) => identity.executable === join(f.programRoot, 'pointer.exe'))).toBe(true)
    expect((await f.database().readLifeState()).obligations.every(goal => goal.status !== 'fulfilled')).toBe(true)
  })

  it.each(['running', 'unknown'] as const)('keeps the input resource uncertain when an original owner is %s', async (state) => {
    const f = await fixture()
    const admission = await f.admission()
    await f.index.admit(admission)
    await f.nativeReceipts(admission)
    const read = createWindowsPointerRecovery({ index: f.index, inspectProcess: vi.fn().mockResolvedValueOnce('stopped').mockResolvedValueOnce(state) })
    expect(await read(await f.effect())).toMatchObject({ stopped: false, result: { verdict: 'unknown' } })
    expect((await f.effect()).status).toBe('uncertain')
  })

  it.each([
    ['none', 'not-applied'],
    ['partial', 'unknown'],
  ] as const)('distinguishes %s delivery after both releases and original process exits', async (mode, verdict) => {
    const f = await fixture()
    const admission = await f.admission()
    await f.index.admit(admission)
    await f.nativeReceipts(admission, mode)
    const read = createWindowsPointerRecovery({ index: f.index, inspectProcess: vi.fn().mockResolvedValue('stopped') })
    expect(await read(await f.effect())).toMatchObject({ stopped: true, result: { verdict, independent: true } })
    expect((await f.effect()).status).toBe('uncertain')
  })

  it('rejects readiness without actor birth identity and a changed executable before inspecting any PID', async () => {
    const f = await fixture()
    const admission = await f.admission()
    await f.index.admit(admission)
    const records = await f.nativeReceipts(admission)
    const readyPath = join(f.programRoot, `main-ready-${admission.nonce}.json`)
    const ready = { ...records.ready, actorStartTicks: undefined }
    await writeFile(readyPath, JSON.stringify({ version: 1, owner: admission.owner, actorProcessId: 2_147_483_646, ready }))
    const inspect = vi.fn().mockResolvedValue('stopped')
    const read = createWindowsPointerRecovery({ index: f.index, inspectProcess: inspect })
    expect(await read(await f.effect())).toMatchObject({ stopped: false, result: { verdict: 'unknown' } })
    expect(inspect).not.toHaveBeenCalled()
    await writeFile(readyPath, JSON.stringify({ version: 1, owner: admission.owner, actorProcessId: 2_147_483_646, ready: records.ready }))
    await writeFile(join(f.programRoot, 'pointer.exe'), 'changed owned bytes')
    expect(await read(await f.effect())).toMatchObject({ stopped: false, result: { verdict: 'unknown' } })
    expect(inspect).not.toHaveBeenCalled()
  })
})
