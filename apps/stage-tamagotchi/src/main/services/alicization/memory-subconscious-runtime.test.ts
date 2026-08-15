import type sqlite3 from 'sqlite3'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationMemorySubconsciousRuntime } from './memory-subconscious-runtime'

function createRuntime() {
  const run = vi.fn().mockResolvedValue(undefined)
  const allCalls: Array<[sql: string, params: unknown[] | undefined]> = []
  const runtime = createAlicizationMemorySubconsciousRuntime({
    database: {} as any,
    now: () => 10_000,
    randomUUID: vi.fn()
      .mockReturnValueOnce('fragment-1')
      .mockReturnValueOnce('fragment-2'),
    run,
    get: async <T>() => undefined as T | undefined,
    all: async <T>(_database: sqlite3.Database, sql: string, params?: unknown[]) => {
      allCalls.push([sql, params])
      return [] as T[]
    },
    enqueueWrite: async <T>(task: () => Promise<T>) => await task(),
    runInTransaction: async (_database, task) => await task(),
    normalizeOrganicMemoryText: raw => typeof raw === 'string' ? raw.trim() : '',
    mapFragmentSourceKindToProvenance: sourceKind =>
      sourceKind === 'fact-ledger' ? 'inferred' : 'remembered',
  })

  return {
    allCalls,
    run,
    runtime,
  }
}

describe('memory subconscious runtime', () => {
  it('never writes dialogue-turn transcript fragments to the table or FTS index', async () => {
    const harness = createRuntime()

    const inserted = await harness.runtime.appendSubconsciousFragments([
      {
        text: 'user:raw private request assistant:raw private reply',
        sourceKind: 'dialogue-turn',
      },
      {
        text: 'fact_subject:user fact_predicate:project fact_object:ProjectAtlas',
        sourceKind: 'fact-ledger',
      },
    ])

    expect(inserted).toEqual([
      expect.objectContaining({
        id: 'fragment-1',
        sourceKind: 'fact-ledger',
      }),
    ])
    expect(harness.run.mock.calls.flatMap(call => call[2] ?? []))
      .not
      .toContain('user:raw private request assistant:raw private reply')
  })

  it('excludes legacy dialogue-turn rows from FTS and recent-fragment recall queries', async () => {
    const harness = createRuntime()

    await harness.runtime.searchSubconsciousFragments('ProjectAtlas', 6)
    await harness.runtime.listRecentSubconsciousFragments(8)

    expect(harness.allCalls[0]?.[0]).toContain(`sf.source_kind <> 'dialogue-turn'`)
    expect(harness.allCalls[1]?.[0]).toContain(`source_kind <> 'dialogue-turn'`)
  })
})
