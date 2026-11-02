import type { ExecutionRecoveryResult } from '../../../../shared/execution-recovery-contracts'
import type { AlicizationDbService } from '../db'

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createHostEffectControl } from './host-effect-control'
import { admitVerifiedExecutionProcedure } from './procedure-admission'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

const originalReceipt = { outcome: 'failure', output: { ok: false, executionStopped: false, sideEffectState: 'unknown' }, observedAt: 123 }
async function legacy(database: AlicizationDbService, path: string, receipt: Record<string, unknown> = originalReceipt) {
  await createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now }).admit({ cardId: 'alice', turnId: 'legacy-turn', conversationId: 'chat', messages: [{ role: 'user', content: 'Save a report' }] }, new AbortController().signal)
  await database.upsertTaskThread({ id: 'legacy-task', turnId: 'legacy-turn', goal: 'Save a report', kind: 'mixed', status: 'planned' })
  await database.commitLifeState({ cardId: 'alice', operationKey: 'legacy-effect', changes: [], mutations: [
    { type: 'effect-prepare', effect: { id: 'legacy-effect', operationKey: 'legacy-effect', kind: 'execute', turnId: 'legacy-turn', actionId: 'save', generation: 0, payload: { capabilityId: 'tool.filesystem_write_file', parameters: { path, content: 'report' } } } },
    { type: 'effect-transition', id: 'legacy-effect', expected: 'prepared', status: 'claimed' },
    { type: 'effect-transition', id: 'legacy-effect', expected: 'claimed', status: 'dispatched' },
    { type: 'effect-transition', id: 'legacy-effect', expected: 'dispatched', status: 'uncertain', receipt },
  ] })
}
function preview(result: ExecutionRecoveryResult) {
  expect(result.state).toBe('preview')
  if (result.state !== 'preview')
    throw new Error('Missing confirmation')
  return result
}
const scope = { cardId: 'alice', effectId: 'legacy-effect' }

describe('host takeover of unknowable execution outcomes', () => {
  it('commits an unchanged host decision despite a burst of unrelated life writes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'life-host-control-clock-burst-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    try {
      await legacy(db, join(directory, 'result.txt'))
      broker.restoreQuarantine({ ...scope, resources: ['host:execution'] })
      const control = createHostEffectControl({ database: () => db, broker, writerStopped: () => true })
      const confirmation = preview(await control({ ...scope, action: 'preview' }, 8))
      const commit = db.commitLifeState
      let clocks = 0
      const spy = vi.spyOn(db, 'commitLifeState').mockImplementation(async (input, options) => {
        if (input.operationKey.startsWith('host-takeover:') && clocks < 6) {
          clocks++
          await commit({ cardId: 'alice', operationKey: `competing-life-clock:${clocks}`, changes: [{ owner: 'emotion', key: 'qa:concurrent-life', value: JSON.stringify({ clocks }) }] })
        }
        return commit(input, options)
      })
      expect(await control({ ...scope, action: 'takeover', token: confirmation.token, confirmedStopped: true }, 8)).toEqual({ state: 'host-taken-over' })
      expect(clocks).toBeGreaterThan(0)
      expect((await db.getLifeEffect(scope.effectId))?.status).toBe('failed')
      expect(broker.snapshot()).toEqual([])
      expect(await readFile(join(directory, 'result.txt'), 'utf8').catch(() => null)).toBeNull()
      spy.mockRestore()
    }
    finally { vi.restoreAllMocks(); await db.close(); await rm(directory, { recursive: true, force: true }) }
  })

  it.each(['unrelated-clock', 'changed-source', 'changed-goal'] as const)('keeps confirmation precise during a %s commit race', async (scenario) => {
    const directory = await mkdtemp(join(tmpdir(), 'life-host-control-commit-race-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    try {
      await legacy(db, join(directory, 'result.txt'))
      broker.restoreQuarantine({ ...scope, resources: ['host:execution'] })
      const control = createHostEffectControl({ database: () => db, broker, writerStopped: () => true })
      const confirmation = preview(await control({ ...scope, action: 'preview' }, 8))
      const commit = db.commitLifeState
      let injected = false
      const spy = vi.spyOn(db, 'commitLifeState').mockImplementation(async (input, options) => {
        if (!injected && input.operationKey.startsWith('host-takeover:')) {
          injected = true
          const goal = (await db.readLifeState()).obligations[0]
          await commit({ cardId: 'alice', operationKey: 'competing-update', changes: [], mutations: scenario === 'changed-source'
            ? [{ type: 'ingress-settle', id: 'user:legacy-turn', status: 'held' }]
            : scenario === 'changed-goal'
              ? [{ type: 'obligation-update', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: 'blocked' }]
              : [{ type: 'ingress-accept', ingress: { id: 'unrelated-body-observation', kind: 'system', source: 'body-observation', sourceKey: 'body', occurredAt: Date.now(), payload: {} } }, { type: 'ingress-settle', id: 'unrelated-body-observation', status: 'settled' }] })
        }
        return commit(input, options)
      })
      const takingOver = control({ ...scope, action: 'takeover', token: confirmation.token, confirmedStopped: true }, 8)
      if (scenario === 'unrelated-clock') {
        expect(await takingOver).toEqual({ state: 'host-taken-over' })
        expect((await db.getLifeEffect(scope.effectId))?.status).toBe('failed')
        expect(broker.snapshot()).toEqual([])
      }
      else {
        await expect(takingOver).rejects.toThrow('changed during commit')
        expect((await db.getLifeEffect(scope.effectId))?.status).toBe('uncertain')
        expect(broker.snapshot()).toHaveLength(1)
      }
      expect(injected).toBe(true)
      spy.mockRestore()
    }
    finally { await db.close(); await rm(directory, { recursive: true, force: true }) }
  })

  it('takes over a valid receipt exceeding the smaller contract budget and preserves all original bytes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'life-host-large-receipt-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const receipt = { ...originalReceipt, output: { ...originalReceipt.output, diagnostic: '证据'.repeat(160_000) } }
    try {
      await legacy(db, join(directory, 'result.txt'), receipt)
      broker.restoreQuarantine({ ...scope, resources: ['host:execution'] })
      const control = createHostEffectControl({ database: () => db, broker, writerStopped: () => true })
      const confirmation = preview(await control({ ...scope, action: 'preview' }, 8))
      expect(await control({ ...scope, action: 'takeover', token: confirmation.token, confirmedStopped: true }, 8)).toEqual({ state: 'host-taken-over' })
      const effect = (await db.getLifeEffect(scope.effectId))!
      const originalId = String((effect.receipt!.hostTakeover as Record<string, unknown>).originalReceiptId)
      expect((await db.getLifeIngress(originalId))?.payload).toEqual(receipt)
      expect(broker.snapshot()).toEqual([])
    }
    finally { await db.close(); await rm(directory, { recursive: true, force: true }) }
  })

  it('preserves the original unknown receipt, cancels responsibility and releases only its quarantine across restart', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'life-host-control-'))
    let db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    try {
      const path = join(directory, 'result.txt')
      await writeFile(path, 'user-owned partial data')
      await legacy(db, path)
      broker.restoreQuarantine({ ...scope, resources: ['host:execution'] })
      broker.restoreQuarantine({ cardId: 'bob', effectId: scope.effectId, resources: ['host:execution'] })
      const control = createHostEffectControl({ database: () => db, broker, writerStopped: () => true })
      expect(await control({ ...scope, action: 'recheck' }, 8)).toEqual({ state: 'unknown' })
      const confirmation = preview(await control({ ...scope, action: 'preview' }, 8))
      expect(confirmation).toMatchObject({ target: path, goals: ['Save a report'] })
      expect(await control({ ...scope, action: 'takeover', token: confirmation.token, confirmedStopped: true }, 8)).toEqual({ state: 'host-taken-over' })
      const effect = (await db.getLifeEffect(scope.effectId))!
      expect(effect).toMatchObject({ status: 'failed', receipt: { outcome: 'host-taken-over', output: { sideEffectState: 'unknown', stopEvidence: 'host-attestation' }, hostTakeover: { independent: false } } })
      expect((await db.getLifeIngress(String((effect.receipt!.hostTakeover as Record<string, unknown>).originalReceiptId)))?.payload).toEqual(originalReceipt)
      expect((await db.getLifeIngress('user:legacy-turn'))?.status).toBe('failed')
      expect((await db.readLifeState()).obligations[0].status).toBe('cancelled')
      expect(broker.snapshot()).toMatchObject([{ effectCardId: 'bob', effectId: scope.effectId, uncertain: true }])
      expect(() => broker.acquire({ owner: 'new-task', resources: ['host:execution'] })).toThrow('reconciliation')
      await expect(control({ ...scope, action: 'takeover', token: confirmation.token, confirmedStopped: true }, 8)).rejects.toThrow('no longer')
      await db.close()
      db = await setupAlicizationDb(directory, { cardId: 'alice' })
      expect(await db.readPendingLifeExecutionEffects()).toEqual([])
      expect((await db.readLifeState()).obligations[0].status).toBe('cancelled')
      expect(await readFile(path, 'utf8')).toBe('user-owned partial data')
    }
    finally { await db.close(); await rm(directory, { recursive: true, force: true }) }
  }, 15_000)

  it.each(['expired', 'other-window', 'other-card', 'changed-receipt', 'changed-goal'] as const)('rejects %s confirmations without releasing the effect', async (scenario) => {
    const directory = await mkdtemp(join(tmpdir(), 'life-host-control-fence-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    let clock = 1000
    try {
      await legacy(db, join(directory, 'result.txt'))
      broker.restoreQuarantine({ ...scope, resources: ['host:execution'] })
      const control = createHostEffectControl({ database: () => db, broker, writerStopped: () => true, now: () => clock })
      const confirmation = preview(await control({ ...scope, action: 'preview' }, 8))
      if (scenario === 'expired')
        clock = confirmation.expiresAt
      if (scenario === 'changed-receipt')
        vi.spyOn(db, 'getLifeEffect').mockImplementationOnce(async () => ({ ...(await db.readLifeState()).effects[0], receipt: { changed: true } }))
      if (scenario === 'changed-goal') {
        const goal = (await db.readLifeState()).obligations[0]
        await db.commitLifeState({ cardId: 'alice', operationKey: 'goal-changed', changes: [], mutations: [{ type: 'obligation-update', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: 'blocked' }] })
      }
      await expect(control({ ...scope, cardId: scenario === 'other-card' ? 'bob' : 'alice', action: 'takeover', token: confirmation.token, confirmedStopped: true }, scenario === 'other-window' ? 9 : 8)).rejects.toThrow(/confirmation|boundary/u)
      expect((await db.getLifeEffect(scope.effectId))?.status).toBe('uncertain')
      expect(broker.snapshot()).toHaveLength(1)
    }
    finally { await db.close(); await rm(directory, { recursive: true, force: true }) }
  })

  it('retains quarantine on active ownership, bootstrap scanning and transaction failure', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'life-host-control-stop-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    let stopped = false
    try {
      await legacy(db, join(directory, 'result.txt'))
      const live = broker.acquire({ owner: 'bootstrap', resources: ['host:execution'] })
      const control = createHostEffectControl({ database: () => db, broker, writerStopped: async (effect) => {
        expect(effect.id).toBe(scope.effectId)
        await new Promise(resolve => setTimeout(resolve, 5))
        return stopped
      } })
      let confirmation = preview(await control({ ...scope, action: 'preview' }, 8))
      await expect(control({ ...scope, action: 'takeover', token: confirmation.token, confirmedStopped: true }, 8)).rejects.toThrow('still active')
      stopped = true
      confirmation = preview(await control({ ...scope, action: 'preview' }, 8))
      await expect(control({ ...scope, action: 'takeover', token: confirmation.token, confirmedStopped: true }, 8)).rejects.toThrow('live or unrelated')
      broker.settle(live, { stopped: true, uncertain: false })
      broker.restoreQuarantine({ ...scope, resources: ['host:execution'] })
      confirmation = preview(await control({ ...scope, action: 'preview' }, 8))
      vi.spyOn(db, 'commitLifeState').mockRejectedValueOnce(new Error('disk full'))
      await expect(control({ ...scope, action: 'takeover', token: confirmation.token, confirmedStopped: true }, 8)).rejects.toThrow('disk full')
      expect((await db.getLifeEffect(scope.effectId))?.status).toBe('uncertain')
      expect((await db.readLifeState()).ingress.some(item => item.source === 'execution-host-takeover')).toBe(false)
      expect(broker.snapshot()).toMatchObject([{ effectId: scope.effectId, uncertain: true }])
    }
    finally { await db.close(); await rm(directory, { recursive: true, force: true }) }
  })

  it('ends an actual uncertain work step atomically without teaching success or repeating the write', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'life-work-host-control-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const write = vi.fn(async (input: Record<string, unknown>) => {
      await writeFile(String(input.path), 'partial result')
      return { ok: false, effectMayHaveOccurred: true, executionStopped: false }
    })
    const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: vi.fn(), tools: { 'tool.filesystem_write_file': write } })
    try {
      await db.upsertTaskThread({ id: 'work', goal: 'Save work', kind: 'mixed', status: 'planned' })
      const plan = await runtime.singleStepPlan({ cardId: 'alice', threadId: 'work', capabilityId: 'tool.filesystem_write_file', parameters: { path: join(directory, 'work.txt'), content: 'complete report' } })
      await runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'run' })
      // The completion wake may classify this ended window before a host
      // opens its review. Confirm the resulting snapshot, not a stale one.
      await runtime.wakeReady()
      const effect = (await db.readLifeState()).effects.find(item => item.kind === 'execute')!
      const control = createHostEffectControl({ database: () => db, broker, writerStopped: () => !runtime.isActive() })
      const input = { cardId: 'alice', effectId: effect.id }
      const confirmation = preview(await control({ ...input, action: 'preview' }, 8))
      expect(await control({ ...input, action: 'takeover', token: confirmation.token, confirmedStopped: true }, 8)).toEqual({ state: 'host-taken-over' })
      await runtime.wakeReady()
      const view = await db.readLifeState()
      expect(view.obligations[0].status).toBe('cancelled')
      expect(view.execution?.results[0]).toMatchObject({ state: 'cancelled', output: { hostTakenOver: true, sideEffectState: 'unknown' } })
      expect(view.execution?.slices[0].state).toBe('stopped')
      expect(admitVerifiedExecutionProcedure((await db.getTaskThread('work'))!, view)).toBe(false)
      expect(broker.snapshot()).toEqual([])
      expect(write).toHaveBeenCalledTimes(1)
      await expect(runtime.start({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'replay' })).rejects.toThrow('accepted responsibility')
    }
    finally { await runtime.dispose(); await db.close(); await rm(directory, { recursive: true, force: true }) }
  })
})
