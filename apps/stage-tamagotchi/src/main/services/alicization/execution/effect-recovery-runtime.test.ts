import type { LifeEffect } from '../../../../shared/life-contracts'

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { recoverExecutionEffect } from './effect-recovery-runtime'
import { createExecutionResourceBroker, executionFileResources } from './resource-broker'

describe('independent effect recovery and ownership', () => {
  it.each(['live', 'same-effect-live', 'unrelated-uncertain'] as const)('keeps recovery pending under a %s resource owner without observing or changing reality', async (scenario) => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-recovery-busy-'))
    const database = await setupAlicizationDb(directory, { cardId: 'alice' })
    try {
      const path = join(directory, 'report.txt')
      const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
      const signal = new AbortController().signal
      await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'chat', messages: [{ role: 'user', content: 'Save the requested report' }] }, signal)
      const action = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: 'write', capabilityId: 'tool.filesystem_write_file', parameters: { path, content: 'accepted report' }, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects }, signal)
      await writeFile(path, 'partial report')
      await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output: { ok: false, effectMayHaveOccurred: true }, interrupted: true })
      const effect = (await database.getLifeEffect(action.id))!
      const observation = await database.getLifeIngress(`observation:${action.id}`)
      const broker = createExecutionResourceBroker()
      const lease = broker.acquire({ owner: 'current-owner', resources: await executionFileResources(path), effectId: scenario === 'same-effect-live' ? effect.id : 'different-effect', effectCardId: 'alice' })
      if (scenario === 'unrelated-uncertain')
        broker.settle(lease, { stopped: true, uncertain: true })
      const held = broker.snapshot()
      const readEffect = vi.spyOn(database, 'getLifeEffect')
      expect(await recoverExecutionEffect({ database, broker, effect, writerStopped: () => true })).toBeNull()
      expect(readEffect).not.toHaveBeenCalled()
      expect(broker.snapshot()).toEqual(held)
      expect(await database.getLifeEffect(effect.id)).toEqual(effect)
      expect(await database.getLifeIngress(`observation:${action.id}`)).toEqual(observation)
      expect(await readFile(path, 'utf8')).toBe('partial report')
    }
    finally { await database.close(); await rm(directory, { recursive: true, force: true }) }
  })

  it.each(['matching', 'changed', 'missing', 'writer-active'] as const)('reconciles %s reality without replaying the write', async (scenario) => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-effect-proof-'))
    let database = await setupAlicizationDb(directory, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    try {
      const path = join(directory, 'report.txt')
      const life = createLifeTurnRuntime({ resourceBroker: broker, read: () => database.readLifeState(), commit: input => database.commitLifeState(input), getIngress: id => database.getLifeIngress(id), getEffect: id => database.getLifeEffect(id), now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'chat', messages: [{ role: 'user', content: 'Save the requested report' }] }, new AbortController().signal)
      const action = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: 'write', capabilityId: 'tool.filesystem_write_file', parameters: { path, content: 'accepted report' }, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects }, new AbortController().signal)
      if (scenario !== 'missing')
        await writeFile(path, scenario === 'changed' ? 'user edited this' : 'accepted report')
      await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output: { ok: false, effectMayHaveOccurred: true }, interrupted: true })
      const original = await database.getLifeIngress(`observation:${action.id}`)
      const effect = (await database.getLifeEffect(action.id))!
      expect(broker.snapshot()).toHaveLength(1)
      const result = await recoverExecutionEffect({ database, broker, effect, writerStopped: async (candidate) => {
        expect(candidate.id).toBe(effect.id)
        await new Promise(resolve => setTimeout(resolve, 5))
        return scenario !== 'writer-active'
      } })
      expect(await database.getLifeIngress(`observation:${action.id}`)).toEqual(original)
      if (scenario === 'matching') {
        expect(result?.verdict).toBe('applied')
        expect(broker.snapshot()).toHaveLength(0)
        await database.close()
        database = await setupAlicizationDb(directory, { cardId: 'alice' })
        const persisted = (await database.getLifeEffect(action.id))!
        expect(persisted.status).toBe('settled')
        expect(persisted.receipt?.output).toMatchObject({ recovered: true, proofScope: 'current-file-bytes-only' })
        expect((await database.getLifeIngress(result!.observationId))?.sourceKey).toBe(action.id)
        expect(await readFile(path, 'utf8')).toBe('accepted report')
      }
      else {
        expect(result).toBeNull()
        expect((await database.getLifeEffect(action.id))?.status).toBe('uncertain')
        expect(broker.snapshot()).toHaveLength(1)
        expect(() => broker.acquire({ owner: 'next-task', resources: broker.snapshot()[0].resources })).toThrow('reconciliation')
        if (scenario === 'changed')
          expect(await readFile(path, 'utf8')).toBe('user edited this')
      }
    }
    finally { await database.close(); await rm(directory, { recursive: true, force: true }) }
  })

  it('never clears another effect or a live lease during reconciliation', async () => {
    const broker = createExecutionResourceBroker()
    const lease = broker.acquire({ owner: 'active-writer', resources: ['browser:alice'], effectId: 'effect-a' })
    expect(() => broker.beginReconciliation('effect-a', ['browser:alice'])).toThrow('live or unrelated')
    broker.settle(lease, { stopped: true, uncertain: true })
    expect(() => broker.beginReconciliation('effect-b', ['browser:alice'])).toThrow('live or unrelated')
    const proof = broker.beginReconciliation('effect-a', ['browser:alice'])
    expect(() => broker.beginReconciliation('effect-a', ['browser:alice'])).toThrow('live or unrelated')
    proof.finish(false)
    expect(broker.snapshot()).toHaveLength(1)
    const verified = broker.beginReconciliation('effect-a', ['browser:alice'])
    verified.finish(true)
    expect(broker.snapshot()).toHaveLength(0)
  })

  it('retains quarantine if persistence fails after a valid independent read', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-effect-commit-'))
    const database = await setupAlicizationDb(directory, { cardId: 'alice' })
    try {
      const path = join(directory, 'report.txt')
      await writeFile(path, 'report')
      const broker = createExecutionResourceBroker()
      const effect: LifeEffect = { id: 'effect', operationKey: 'effect', kind: 'execute', turnId: 'request', actionId: 'write', generation: 0, status: 'uncertain', payload: { capabilityId: 'tool.filesystem_write_file', parameters: { path, content: 'report' }, resourceSnapshot: { version: 1, keys: await executionFileResources(path) } }, receipt: null, leaseUntil: null }
      const lease = broker.acquire({ owner: 'writer', resources: await executionFileResources(path), effectId: effect.id, effectCardId: 'alice' })
      broker.settle(lease, { stopped: true, uncertain: true })
      vi.spyOn(database, 'getLifeEffect').mockResolvedValue(effect)
      vi.spyOn(database, 'commitLifeState').mockRejectedValue(new Error('disk full'))
      await expect(recoverExecutionEffect({ database, broker, effect, writerStopped: () => true })).rejects.toThrow('disk full')
      expect(broker.snapshot()).toHaveLength(1)
    }
    finally { await database.close(); await rm(directory, { recursive: true, force: true }) }
  })
})
