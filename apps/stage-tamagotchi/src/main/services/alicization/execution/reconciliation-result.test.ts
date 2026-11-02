import type { LifeEffect } from '../../../../shared/life-contracts'
import type { EffectReconciliation } from './effect-reconciler'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { reconcileExecutionEffect } from './effect-reconciler'
import { recoverExecutionEffect } from './effect-recovery-runtime'
import { createExecutionResourceBroker } from './resource-broker'

const channels = ['cli', 'coding-agent', 'browser', 'desktop', 'external'] as const
const contradictoryResults = [
  { label: 'not-applied-but-successful', verdict: 'not-applied', output: { ok: true } },
  { label: 'not-applied-but-possibly-occurred', verdict: 'not-applied', output: { effectMayHaveOccurred: true } },
  { label: 'not-applied-but-running', verdict: 'not-applied', output: { executionStopped: false } },
  { label: 'applied-but-failed', verdict: 'applied', output: { ok: false } },
  { label: 'applied-but-no-effect', verdict: 'applied', output: { effectMayHaveOccurred: false } },
  { label: 'applied-but-running', verdict: 'applied', output: { executionStopped: false } },
] as const
function effect(channel: typeof channels[number]): LifeEffect {
  const capabilityId = { 'cli': 'cli', 'coding-agent': 'coding_agent', 'browser': 'tool.browser_click', 'desktop': 'tool.desktop_click', 'external': 'tool.external_send' }[channel]
  const resources = channel === 'browser' ? ['browser:alice'] : channel === 'desktop' ? ['physical-input:desktop'] : ['host:execution']
  return { id: 'effect', operationKey: 'effect', kind: 'execute', turnId: 'request', actionId: 'action', generation: 1, status: 'uncertain', payload: { capabilityId, parameters: { marker: 'original' }, resourceSnapshot: { version: 1, keys: resources } }, receipt: { outcome: 'failure', effectMayHaveOccurred: true }, leaseUntil: null }
}

it.each(channels.flatMap(channel => contradictoryResults.map(result => ({ channel, ...result }))))('keeps a contradictory $channel receipt unknown: $label', async ({ channel, verdict, output }) => {
  const pending = effect(channel)
  const result = await reconcileExecutionEffect(pending, { writerStopped: true, verifyFile: vi.fn(), observe: { [channel]: async () => ({ effectId: pending.id, independent: true, verdict, evidence: { receiptId: 'independent-but-contradictory' }, output }) } })
  expect(result).toMatchObject({ effectId: pending.id, independent: true, verdict: 'unknown' })
})

it.each(channels.flatMap(channel => ['applied', 'not-applied', 'unknown'].map(verdict => ({ channel, verdict }))))('accepts the bound independent result on $channel: $verdict', async ({ channel, verdict }) => {
  const pending = effect(channel)
  const observed = { effectId: pending.id, independent: true, verdict, evidence: { receiptId: 'actual-receipt' }, output: { receiptId: 'actual-receipt' } } as EffectReconciliation
  const reader = vi.fn(async () => observed)
  const result = await reconcileExecutionEffect(pending, { writerStopped: true, verifyFile: vi.fn(), observe: { [channel]: reader } })
  expect(result).toEqual(observed)
  expect(result).not.toBe(observed)
  expect(result.evidence).not.toBe(observed.evidence)
  expect(reader).toHaveBeenCalledOnce()
})

it.each(channels.flatMap(channel => ['invalid-verdict', 'missing-evidence', 'array-output', 'null-result'].map(fault => ({ channel, fault }))))('keeps a malformed $channel result unknown: $fault', async ({ channel, fault }) => {
  const pending = effect(channel)
  const candidate = fault === 'null-result' ? null : { effectId: pending.id, independent: true, verdict: fault === 'invalid-verdict' ? 'confirmed' : 'not-applied', evidence: fault === 'missing-evidence' ? null : { receiptId: 'receipt' }, ...(fault === 'array-output' ? { output: [] } : {}) }
  const result = await reconcileExecutionEffect(pending, { writerStopped: true, verifyFile: vi.fn(), observe: { [channel]: async () => candidate as unknown as EffectReconciliation } })
  expect(result).toMatchObject({ effectId: pending.id, independent: true, verdict: 'unknown' })
})

it.each(channels)('does not let the $channel reader rewrite the original effect snapshot', async (channel) => {
  const pending = effect(channel)
  const before = structuredClone(pending)
  const reader = async (observed: LifeEffect): Promise<EffectReconciliation> => {
    observed.payload.parameters = { marker: 'changed' }
    observed.receipt = null
    return { effectId: observed.id, independent: true, verdict: 'unknown', evidence: { reason: 'unavailable' } }
  }
  await reconcileExecutionEffect(pending, { writerStopped: true, verifyFile: vi.fn(), observe: { [channel]: reader } })
  expect(pending).toEqual(before)
})

it.each(channels.flatMap(channel => [{ label: 'invalid-verdict', verdict: 'confirmed', output: {} }, { label: 'reader-unavailable', verdict: 'unknown', output: {} }, ...contradictoryResults].map(result => ({ channel, ...result }))))('does not persist an unproven $channel/$label result or release its real quarantine', async ({ channel, label, verdict, output }) => {
  const directory = await mkdtemp(join(tmpdir(), 'alicization-reconcile-result-'))
  const database = await setupAlicizationDb(directory, { cardId: 'alice' })
  try {
    const pending = effect(channel)
    await database.commitLifeState({ cardId: 'alice', operationKey: 'uncertain-effect', changes: [], mutations: [
      { type: 'effect-prepare', effect: { id: pending.id, operationKey: pending.operationKey, kind: pending.kind, turnId: pending.turnId, actionId: pending.actionId, generation: pending.generation, payload: pending.payload } },
      { type: 'effect-transition', id: pending.id, expected: 'prepared', status: 'claimed' },
      { type: 'effect-transition', id: pending.id, expected: 'claimed', status: 'dispatched' },
      { type: 'effect-transition', id: pending.id, expected: 'dispatched', status: 'uncertain', receipt: pending.receipt! },
    ] })
    const original = (await database.getLifeEffect(pending.id))!
    const broker = createExecutionResourceBroker()
    const resources = (pending.payload.resourceSnapshot as { keys: string[] }).keys
    broker.restoreQuarantine({ cardId: 'alice', effectId: pending.id, resources })
    const reader = vi.fn(async () => {
      if (label === 'reader-unavailable')
        throw new Error('Independent service is temporarily unavailable')
      return { effectId: original.id, independent: true, verdict, output, evidence: {} } as unknown as EffectReconciliation
    })
    const result = await recoverExecutionEffect({ database, broker, effect: original, writerStopped: () => true, observe: { [channel]: reader } })
    expect(reader).toHaveBeenCalledOnce()
    expect(result).toBeNull()
    expect(await database.getLifeEffect(original.id)).toEqual(original)
    expect((await database.readLifeState()).ingress.filter(item => item.source === 'execution-reconciliation')).toEqual([])
    expect(() => broker.acquire({ owner: 'new-writer', resources })).toThrow('reconciliation')
  }
  finally {
    await database.close()
    await rm(directory, { recursive: true, force: true })
  }
})
