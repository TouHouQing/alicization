import type { ResourceLease } from './resource-broker'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { createExecutionResourceBroker } from './resource-broker'

it.each(['resources', 'effectId', 'effectCardId', 'resourceOnly', 'coordinationOnly'] as const)('cannot change a resource lease claim before dispatch, renewal or release: %s', (field) => {
  const broker = createExecutionResourceBroker()
  const lease = broker.acquire({ owner: 'writer', resources: ['browser:owned'], effectId: 'effect', effectCardId: 'alice' })
  const altered: ResourceLease = { ...lease, resources: [...lease.resources], [field]: field === 'resources' ? ['browser:another'] : field === 'effectId' || field === 'effectCardId' ? 'another' : true }
  expect(() => broker.assert(altered)).toThrow()
  expect(() => broker.renew(altered)).toThrow()
  expect(() => broker.settle(altered, { stopped: true, uncertain: false })).toThrow()
  expect(() => broker.acquire({ owner: 'other', resources: ['browser:owned'] })).toThrow('another executor')
  expect(() => broker.assert(lease)).not.toThrow()
  broker.settle(lease, { stopped: true, uncertain: false })
  expect(broker.snapshot()).toEqual([])
})

it('does not let a different owner release the original writer while preserving expiry and quarantine cleanup', () => {
  let now = 0
  const broker = createExecutionResourceBroker(() => now)
  const lease = broker.acquire({ owner: 'writer', resources: ['browser:owned'], ttlMs: 1 })
  expect(() => broker.settle({ ...lease, owner: 'different' }, { stopped: true, uncertain: false })).toThrow()
  now = 2
  broker.settle(lease, { stopped: false, uncertain: true })
  expect(() => broker.assert(lease)).toThrow('stale')
  expect(() => broker.acquire({ owner: 'other', resources: ['browser:owned'] })).toThrow('reconciliation')
  broker.settle(lease, { stopped: true, uncertain: false })
  expect(broker.acquire({ owner: 'other', resources: ['browser:owned'] }).fencingToken).toBeGreaterThan(lease.fencingToken)
})

it('releases nested stopped aggregates together only after every original owned effect resolves', async () => {
  const broker = createExecutionResourceBroker()
  const owned = await broker.withOwner('parent-work', async () => [
    broker.acquire({ owner: 'parent', resources: ['host:execution'], coordinationOnly: true }),
    broker.acquire({ owner: 'child', resources: ['host:execution'] }),
    broker.acquire({ owner: 'effect-one', effectId: 'one', effectCardId: 'alice', resources: ['host:execution'] }),
    broker.acquire({ owner: 'effect-two', effectId: 'two', effectCardId: 'alice', resources: ['host:execution'] }),
  ])
  for (const lease of owned)
    broker.settle(lease, { stopped: true, uncertain: true })
  broker.restoreQuarantine({ cardId: 'bob', effectId: 'one', resources: ['host:execution'] })
  broker.beginHostTakeover('one', ['host:execution'], 'alice').finish(true)
  expect(broker.snapshot()).toHaveLength(4)
  expect(() => broker.acquire({ owner: 'next', resources: ['host:execution'] })).toThrow('reconciliation')
  broker.beginHostTakeover('two', ['host:execution'], 'alice').finish(true)
  expect(broker.snapshot()).toMatchObject([{ effectCardId: 'bob', effectId: 'one', uncertain: true }])
  expect(() => broker.acquire({ owner: 'next', resources: ['host:execution'] })).toThrow('reconciliation')
  broker.beginHostTakeover('one', ['host:execution'], 'bob').finish(true)
  expect(broker.snapshot()).toEqual([])
  const next = broker.acquire({ owner: 'next', resources: ['host:execution'] })
  broker.settle(next, { stopped: true, uncertain: false })
})

it('rejects an adapter-mutated claim through the real life/action dispatch gate without releasing its original resource', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'alicization-lease-claim-'))
  const db = await setupAlicizationDb(directory, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const life = createLifeTurnRuntime({ resourceBroker: broker, read: db.readLifeState, getEffect: db.getLifeEffect, getIngress: db.getLifeIngress, commit: db.commitLifeState, now: Date.now })
  const signal = new AbortController().signal
  try {
    const parameters = { path: join(directory, 'accepted.txt'), content: 'accepted' }
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'qa', messages: [{ role: 'user', content: 'save accepted file' }] }, signal)
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: 'write', capabilityId: 'tool.filesystem_write_file', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects }, signal)
    await action.authorizeDispatch(parameters)
    const admitted = await action.assertDispatchCurrent()
    const lease = admitted.resourceLease!
    const original = structuredClone(lease)
    lease.resources = ['file-path:unrelated']
    await expect(action.assertDispatchCurrent()).rejects.toThrow('lease')
    expect(() => broker.acquire({ owner: 'other', resources: original.resources })).toThrow('another executor')
    expect((await db.getLifeEffect(action.id))!.status).toBe('dispatched')
    Object.assign(lease, original)
    await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output: { effectMayHaveOccurred: false, sideEffectState: 'none' }, interrupted: false })
    expect(broker.snapshot()).toEqual([])
  }
  finally {
    await db.close()
    await rm(directory, { recursive: true, force: true })
  }
})
