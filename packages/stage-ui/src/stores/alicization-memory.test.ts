import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => {
  return {
    storageMap: new Map<string, unknown>(),
    bridgeAvailable: { value: true },
    bridgeMock: {
      appendAuditLog: vi.fn(async () => {}),
      getMemoryStats: vi.fn(async () => ({
        total: 1,
        active: 1,
        archived: 0,
        tierCounts: { hot: 1, warm: 0, cold: 0 },
        pendingSyncCount: 0,
        lastPrunedAt: null,
      })),
      runMemoryPrune: vi.fn(async () => ({
        total: 1,
        active: 1,
        archived: 0,
        tierCounts: { hot: 1, warm: 0, cold: 0 },
        pendingSyncCount: 0,
        lastPrunedAt: null,
      })),
      upsertMemoryFacts: vi.fn(async () => {}),
      importLegacyMemory: vi.fn(async () => ({
        migrated: true,
        importedFacts: 0,
        importedArchive: 0,
        marker: 'test',
      })),
      retrieveMemoryFacts: vi.fn(async () => []),
    },
  }
})

vi.mock('../database/storage', () => ({
  storage: {
    getItemRaw: vi.fn(async (key: string) => hoisted.storageMap.get(key) ?? null),
    setItemRaw: vi.fn(async (key: string, value: unknown) => {
      hoisted.storageMap.set(key, value)
    }),
  },
}))

vi.mock('./alicization-bridge', () => ({
  hasAlicizationBridge: vi.fn(() => hoisted.bridgeAvailable.value),
  getAlicizationBridge: vi.fn(() => hoisted.bridgeMock),
}))

describe('alicization-memory', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-22T12:00:00.000Z'))
    vi.resetModules()
    hoisted.storageMap.clear()
    hoisted.bridgeAvailable.value = true
    hoisted.bridgeMock.appendAuditLog.mockClear()
    hoisted.bridgeMock.getMemoryStats.mockClear()
    hoisted.bridgeMock.runMemoryPrune.mockClear()
    hoisted.bridgeMock.upsertMemoryFacts.mockClear()
    hoisted.bridgeMock.importLegacyMemory.mockClear()
    hoisted.bridgeMock.retrieveMemoryFacts.mockClear()
  })

  it('keeps writing locally and flushes queued writes after runtime backend recovery', async () => {
    const memory = await import('./alicization-memory')

    hoisted.bridgeMock.upsertMemoryFacts
      .mockRejectedValueOnce(new Error('sqlite unavailable'))
      .mockResolvedValue(undefined)

    await memory.upsertFacts([
      {
        subject: 'user',
        predicate: 'likes',
        object: 'oolong tea',
        confidence: 0.82,
      },
    ], 'rule')

    const localResults = await memory.retrieveFacts('oolong tea', 5)
    const degradedStats = await memory.getMemoryStats()

    expect(localResults).toHaveLength(1)
    expect(degradedStats.active).toBe(1)
    expect(degradedStats.pendingSyncCount).toBe(1)
    expect(degradedStats.integrity).toEqual({
      status: 'degraded',
      issues: ['pending-runtime-sync:1'],
    })
    expect(hoisted.bridgeMock.upsertMemoryFacts).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(20_000)
    const recoveredStats = await memory.getMemoryStats()

    expect(hoisted.bridgeMock.upsertMemoryFacts).toHaveBeenCalledTimes(2)
    expect(recoveredStats.pendingSyncCount).toBe(0)
  })

  it('reports hot warm cold tier counts for local fallback memory facts', async () => {
    hoisted.bridgeAvailable.value = false
    hoisted.storageMap.set('local:alicization/memory/facts:v1', [
      {
        id: 'fact-hot',
        subject: 'user',
        predicate: 'likes',
        object: 'tea',
        confidence: 0.9,
        source: 'rule',
        dedupeKey: 'user|likes|tea',
        createdAt: Date.UTC(2026, 3, 22, 10, 0, 0),
        updatedAt: Date.UTC(2026, 3, 22, 10, 0, 0),
        lastAccessAt: Date.UTC(2026, 3, 22, 11, 0, 0),
        accessCount: 5,
        provenance: 'remembered',
      },
      {
        id: 'fact-warm',
        subject: 'user',
        predicate: 'plan',
        object: 'weekend refactor',
        confidence: 0.7,
        source: 'rule',
        dedupeKey: 'user|plan|weekend refactor',
        createdAt: Date.UTC(2026, 3, 10, 10, 0, 0),
        updatedAt: Date.UTC(2026, 3, 10, 10, 0, 0),
        lastAccessAt: Date.UTC(2026, 3, 18, 10, 0, 0),
        accessCount: 1,
        provenance: 'remembered',
      },
      {
        id: 'fact-cold',
        subject: 'user',
        predicate: 'mentions',
        object: 'old runtime seam',
        confidence: 0.2,
        source: 'async-llm',
        dedupeKey: 'user|mentions|old runtime seam',
        createdAt: Date.UTC(2026, 2, 1, 10, 0, 0),
        updatedAt: Date.UTC(2026, 2, 1, 10, 0, 0),
        lastAccessAt: Date.UTC(2026, 2, 1, 10, 0, 0),
        accessCount: 0,
        provenance: 'inferred',
      },
    ])

    const memory = await import('./alicization-memory')
    const stats = await memory.getMemoryStats()

    expect(stats.total).toBe(3)
    expect(stats.archived).toBe(1)
    expect(stats.tierCounts).toEqual({
      hot: 1,
      warm: 1,
      cold: 1,
    })
    expect(stats.integrity?.status).toBe('ok')
  })
})
