import type { LifeEffect } from '../../../../shared/life-contracts'
import type { WindowsKeyboardJournalAdmission } from './windows-keyboard-journal'

import { Buffer } from 'node:buffer'
import { createHash, randomBytes } from 'node:crypto'
import { link, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { recoverExecutionEffect } from './effect-recovery-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { createWindowsKeyboardJournalIndex, readOwnedKeyboardJournalFile } from './windows-keyboard-journal'
import { createWindowsKeyboardRecovery } from './windows-keyboard-recovery'

const cleanup: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse())
    await close()
})

async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'alicization-keyboard-journal-test-')))
  cleanup.push(() => rm(root, { recursive: true, force: true }))
  const databaseRoot = join(root, 'database')
  let database = await setupAlicizationDb(databaseRoot, { cardId: 'alice' })
  cleanup.push(() => database.close())
  const protectedRoot = join(root, 'native')
  const programRoot = join(protectedRoot, 'keyboard-Abc123')
  await mkdir(programRoot, { recursive: true })
  const executable = Buffer.from('Inert owned unit-test program bytes; never executed.')
  const programHash = createHash('sha256').update(executable).digest('hex')
  await writeFile(join(programRoot, 'keyboard.exe'), executable)
  const resources = createExecutionResourceBroker()
  const life = createLifeTurnRuntime({ resourceBroker: resources, read: database.readLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, commit: database.commitLifeState, now: Date.now })
  const signal = new AbortController().signal
  const turnId = 'keyboard-journal-turn'
  await life.admit({ cardId: 'alice', turnId, conversationId: 'journal', messages: [{ role: 'user', content: '对自有测试窗口执行指定快捷键。' }] }, signal)
  const parameters = { shortcut: 'Ctrl+S', repeat: 1 }
  const manifest = createCanonicalToolRegistry({ platform: 'win32', windowsKeyboardGoverned: true, windowsKeyboardReady: true }).resolveActive('tool.desktop_press_keys')!
  const action = await life.beforeAction({ cardId: 'alice', turnId, actionId: 'keyboard-journal-action', capabilityId: 'tool.desktop_press_keys', parameters, owners: (await database.readLifeState()).owners, effectContract: manifest.effects }, signal)
  await action.authorizeDispatch(parameters)
  const authority = await action.assertDispatchCurrent()
  const lease = authority.resourceLease!
  const owner = { cardId: 'alice', turnId, effectId: action.id, leaseId: lease.id, epoch: lease.epoch, fencingToken: lease.fencingToken }
  const index = createWindowsKeyboardJournalIndex({ protectedRoot, database: () => database })
  async function admission() {
    const nonce = randomBytes(16).toString('hex')
    const intent = { version: 1, owner, programSha256: programHash, admittedAt: Date.now(), request: { version: 1, mappingName: `Local\\AlicizationInput_${nonce}`, tag: '42', bindingHash: 'b'.repeat(64), parentProcessId: 2_147_483_644, parentStartTicks: '639000000000000000', expiresAt: Date.now() + 15_000, keys: [0xA2, 0x53], repeat: 1, target: { windowId: '100', processId: 101, processStartTicks: '639000000000000000', windowClass: 'OwnedFixture', desktop: 'Default', inputDesktop: 'Default', focusWindowId: '102', integrityLevel: 8192 } } }
    const body = JSON.stringify(intent)
    await writeFile(join(programRoot, `main-intent-${nonce}.json`), body, { flag: 'wx' })
    return { version: 1, programRoot, nonce, intentHash: createHash('sha256').update(body).digest('hex'), owner } satisfies WindowsKeyboardJournalAdmission
  }
  async function nativeReceipts(admission: WindowsKeyboardJournalAdmission, mode: 'complete' | 'partial' | 'none' = 'complete') {
    const receiptRoot = join(programRoot, `alicization-owned-input-${admission.nonce}`)
    await mkdir(receiptRoot)
    const bindingHash = 'b'.repeat(64)
    const guardian = { type: 'guardian-release', bindingHash, inputReleased: true, stopReason: mode === 'complete' ? 1 : 6, failure: null, readyPreparationMs: 1 }
    const ready = { type: 'ready', bindingHash, actorStartTicks: '639000000000000001', guardianProcessId: 2_147_483_645, guardianStartTicks: '639000000000000002', receiptRoot }
    const actor = { type: 'result', bindingHash, ok: mode === 'complete', completedRounds: mode === 'complete' ? 1 : 0, insertedEvents: mode === 'complete' ? 4 : mode === 'partial' ? 1 : 0, effectMayHaveOccurred: mode !== 'none', inputReleased: true, guardianNormalExit: true, guardianReady: JSON.stringify({ type: 'guardian-ready', bindingHash }), guardianReceipt: JSON.stringify(guardian), stopReason: guardian.stopReason, failure: mode === 'complete' ? null : 'cancelled', ownedKeys: [], receiptRoot }
    await writeFile(join(programRoot, `main-ready-${admission.nonce}.json`), JSON.stringify({ version: 1, owner, actorProcessId: 2_147_483_646, ready }), { flag: 'wx' })
    await writeFile(join(receiptRoot, 'session-owner.txt'), `AlicizationOwnedInputReceipt1\n${bindingHash}\n42\n`, { flag: 'wx' })
    await writeFile(join(receiptRoot, 'actor-result.json'), JSON.stringify(actor), { flag: 'wx' })
    await writeFile(join(receiptRoot, 'guardian-release.json'), JSON.stringify(guardian), { flag: 'wx' })
    await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output: { ok: false, effectMayHaveOccurred: true, inputReleased: false, writerStopped: false }, interrupted: true })
    return { receiptRoot, ready, actor, guardian }
  }
  return { root, protectedRoot, programRoot, resources, database: () => database, index, admission, nativeReceipts, effect: async () => (await database.getLifeEffect(action.id))!, reopen: async () => {
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
    await expect(f.index.find({ ...effect, payload: { ...effect.payload, parameters: { shortcut: 'Ctrl+S', repeat: 2 } } } as LifeEffect)).rejects.toThrow('INDEX_BINDING')
  })

  it('refuses a sibling program directory and a changed intent after indexing', async () => {
    const f = await fixture()
    const admission = await f.admission()
    const sibling = join(f.root, 'outside-native', 'keyboard-Abc123')
    await mkdir(sibling, { recursive: true })
    await expect(f.index.admit({ ...admission, programRoot: sibling })).rejects.toThrow('PROGRAM_ROOT')
    await f.index.admit(admission)
    const intent = join(f.programRoot, `main-intent-${admission.nonce}.json`)
    await writeFile(intent, `${await readFile(intent, 'utf8')} `)
    await expect(f.index.find(await f.effect())).rejects.toThrow('INTENT_HASH')
  })

  it('does not turn an absent index or a mismatched original chord into a recovery record', async () => {
    const f = await fixture()
    expect(await f.index.find(await f.effect())).toBeNull()
    const admission = await f.admission()
    const path = join(f.programRoot, `main-intent-${admission.nonce}.json`)
    const intent = JSON.parse(await readFile(path, 'utf8'))
    intent.request.repeat = 2
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
    await expect(readOwnedKeyboardJournalFile(f.programRoot, 'actor-result.json')).rejects.toThrow('FILE_IDENTITY')
    await writeFile(join(f.programRoot, 'guardian-release.json'), 'x'.repeat(16_385))
    await expect(readOwnedKeyboardJournalFile(f.programRoot, 'guardian-release.json')).rejects.toThrow('FILE_IDENTITY')
    await expect(readOwnedKeyboardJournalFile(f.programRoot, '../actor-result.json')).rejects.toThrow('FILE_NAME')
  })
})

describe('independent native input reconciliation', () => {
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
    const read = createWindowsKeyboardRecovery({ index: f.index, inspectProcess: inspect })
    expect(await read(await f.effect())).toMatchObject({ stopped: false, result: { verdict: 'unknown' } })
    expect((await f.effect()).status).toBe('uncertain')
  })

  it('reopens the database and settles only the original key delivery without replay or root completion', async () => {
    const f = await fixture()
    const admission = await f.admission()
    await f.index.admit(admission)
    await f.nativeReceipts(admission)
    await f.reopen()
    const effect = await f.effect()
    expect(effect.status).toBe('uncertain')
    const inspect = vi.fn().mockResolvedValue('stopped')
    const read = createWindowsKeyboardRecovery({ index: f.index, inspectProcess: inspect })
    const result = await recoverExecutionEffect({ database: f.database(), broker: f.resources, effect, writerStopped: async current => (await read(current)).stopped, observe: { desktop: async current => (await read(current)).result } })
    expect(result).toMatchObject({ verdict: 'applied', independent: true, effectId: effect.id, output: { recovered: true, requiresReadback: true, taskCompletionProven: false, proofScope: 'native-key-delivery-only' } })
    expect(await f.effect()).toMatchObject({ status: 'settled', receipt: { outcome: 'success', output: { recovered: true, proofScope: 'native-key-delivery-only' } } })
    expect(inspect.mock.calls.every(([identity]) => identity.executable === join(f.programRoot, 'keyboard.exe'))).toBe(true)
    expect((await f.database().readLifeState()).obligations.every(goal => goal.status !== 'fulfilled')).toBe(true)
  })

  it.each(['running', 'unknown'] as const)('keeps the input resource uncertain when an original owner is %s', async (state) => {
    const f = await fixture()
    const admission = await f.admission()
    await f.index.admit(admission)
    await f.nativeReceipts(admission)
    const read = createWindowsKeyboardRecovery({ index: f.index, inspectProcess: vi.fn().mockResolvedValueOnce('stopped').mockResolvedValueOnce(state) })
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
    const read = createWindowsKeyboardRecovery({ index: f.index, inspectProcess: vi.fn().mockResolvedValue('stopped') })
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
    const read = createWindowsKeyboardRecovery({ index: f.index, inspectProcess: inspect })
    expect(await read(await f.effect())).toMatchObject({ stopped: false, result: { verdict: 'unknown' } })
    expect(inspect).not.toHaveBeenCalled()
    await writeFile(readyPath, JSON.stringify({ version: 1, owner: admission.owner, actorProcessId: 2_147_483_646, ready: records.ready }))
    await writeFile(join(f.programRoot, 'keyboard.exe'), 'changed owned bytes')
    expect(await read(await f.effect())).toMatchObject({ stopped: false, result: { verdict: 'unknown' } })
    expect(inspect).not.toHaveBeenCalled()
  })
})
