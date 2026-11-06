import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createProviderUsageLedger } from './provider-usage-ledger'

it('persists exact requests and failed/unknown usage through restart without duplicate accounting or owner changes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-usage-ledger-'))
  let database = await setupAlicizationDb(root, { cardId: 'alice' })
  try {
    const before = (await database.readLifeState()).owners
    let ledger = createProviderUsageLedger(database, 'alice')
    const request = { requestId: 'attempt-1', cardId: 'alice', turnId: 'turn-1', rootTurnId: 'turn-1', parentRequestId: null, providerId: 'test', model: 'test', requestHash: 'a'.repeat(64), providerAttempt: 1, startedAt: 1000 }
    const record = { ...request, finishedAt: 1100, settlement: 'retrying' as const, usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120, cacheReadTokens: 80, cacheWriteTokens: null, reasoningTokens: null } }
    await ledger.started(request)
    await ledger.settled(record)
    await ledger.settled(record)
    await expect(ledger.settled({ ...record, usage: null })).rejects.toThrow('identity changed')
    const retry = { ...request, requestId: 'attempt-2', providerAttempt: 2 }
    await ledger.started(retry)
    await ledger.settled({ ...retry, finishedAt: 1200, settlement: 'aborted', usage: null })
    await ledger.started({ ...retry, requestId: 'interrupted-by-crash', providerAttempt: 3 })
    await expect(ledger.started({ ...request, cardId: 'bob' })).rejects.toThrow('life owner')
    await expect(ledger.settled({ ...record, requestId: 'never-started' })).rejects.toThrow('matching durable request')
    await database.close()
    database = await setupAlicizationDb(root, { cardId: 'alice' })
    ledger = createProviderUsageLedger(database, 'alice')
    expect(await ledger.recoverInterrupted()).toBe(1)
    expect(await ledger.recoverInterrupted()).toBe(0)
    const external = { ...request, requestId: 'native-codex', providerId: 'codex', measurement: 'external-agent-aggregate' as const }
    await ledger.started(external)
    await ledger.settled({ ...external, finishedAt: 1300, settlement: 'completed', usage: record.usage })
    const page = await ledger.read({ rootTurnId: 'turn-1' })
    expect(page.entries).toHaveLength(4)
    expect(page.entries.find(record => record.requestId === 'interrupted-by-crash')).toMatchObject({ settlement: 'interrupted', usage: null })
    expect(page.summary).toMatchObject({ requestCount: 3, usageReported: 1, totals: { totalTokens: { knownSubtotal: 120, complete: false }, cacheReadTokens: { knownSubtotal: 80, complete: false } } })
    expect(page.external).toMatchObject({ invocationCount: 1, usageReported: 1, totals: { totalTokens: { knownSubtotal: 120 } } })
    expect((await ledger.read({ rootTurnId: 'unrelated' })).entries).toHaveLength(0)
    expect((await database.readLifeState()).owners).toEqual(before)
    const other = await setupAlicizationDb(root, { cardId: 'bob' })
    try {
      expect((await createProviderUsageLedger(other, 'bob').read()).entries).toEqual([])
    }
    finally { await other.close() }
  }
  finally {
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
})
