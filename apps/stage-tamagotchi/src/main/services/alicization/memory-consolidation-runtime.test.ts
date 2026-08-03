import { describe, expect, it, vi } from 'vitest'

import { createAlicizationMemoryConsolidationRuntime } from './memory-consolidation-runtime'

describe('memory consolidation runtime', () => {
  it('lists and searches consolidations through the delegated runtime boundary', async () => {
    const runtime = createAlicizationMemoryConsolidationRuntime({
      database: {} as never,
      all: (vi.fn(async () => [{
        id: 'daily:2026-04-28',
        kind: 'daily',
        facet: null,
        period_key: '2026-04-28',
        period_started_at: 1,
        period_ended_at: 2,
        summary: 'runtime continuity day',
        lesson: 'keep the seam',
        cues_json: '["runtime continuity"]',
        confidence: 0.8,
        dominant_provenance: 'remembered',
        derived_event_ids_json: '["event-1"]',
        updated_at: 3,
      }]) as any),
      run: vi.fn(async () => ({})),
      mapRow: vi.fn((row: any) => ({
        id: row.id,
        kind: row.kind,
        facet: row.facet,
        periodKey: row.period_key,
        periodStartedAt: row.period_started_at,
        periodEndedAt: row.period_ended_at,
        summary: row.summary,
        lesson: row.lesson,
        cues: ['runtime continuity'],
        confidence: row.confidence,
        dominantProvenance: row.dominant_provenance,
        derivedEventIds: ['event-1'],
        updatedAt: row.updated_at,
      })),
      buildRecords: vi.fn(() => []) as any,
      searchRecords: vi.fn(({ records }) => records),
    })

    const rows = await runtime.searchMemoryConsolidations({
      cardId: 'card-a',
      query: 'runtime continuity',
      recollectionIntent: null,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.summary).toContain('runtime continuity')
  })

  it('rebuilds consolidation rows from episodic events and persists them', async () => {
    const run = vi.fn(async (_database: unknown, _sql: string, _params?: unknown[]) => ({}))
    const runtime = createAlicizationMemoryConsolidationRuntime({
      database: {} as never,
      all: (vi.fn(async () => []) as any),
      run,
      mapRow: vi.fn(),
      buildRecords: (vi.fn(() => [{
        id: 'autobio:task-era:2026-04',
        kind: 'autobiographical' as const,
        facet: 'task-era' as const,
        periodKey: '2026-04',
        periodStartedAt: 1,
        periodEndedAt: 2,
        summary: 'runtime seam period',
        lesson: 'return to seam',
        cues: ['runtime seam'],
        confidence: 0.84,
        dominantProvenance: 'remembered' as const,
        derivedEventIds: ['event-1'],
        updatedAt: 3,
        metadata: {
          humanlikeCarry: {
            relationshipPrimaryIntent: 'same-person-test',
            recallCertainty: 'corrected',
            emotionalResidueTags: ['protective-continuity'],
          },
        },
      }]) as any),
      searchRecords: vi.fn(() => []),
    })

    const records = await runtime.rebuildMemoryConsolidationsFromEvents({
      cardId: 'card-a',
      events: [{
        id: 'event-1',
      } as any],
      now: 3,
    })

    expect(records).toHaveLength(1)
    expect(run).toHaveBeenCalledWith(expect.anything(), 'DELETE FROM memory_consolidations WHERE card_id = ?', ['card-a'])
    expect(run).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('INSERT INTO memory_consolidations'), expect.any(Array))
    expect(run.mock.calls[1]?.[2]).toEqual(expect.arrayContaining([
      JSON.stringify({
        humanlikeCarry: {
          relationshipPrimaryIntent: 'same-person-test',
          recallCertainty: 'corrected',
          emotionalResidueTags: ['protective-continuity'],
        },
      }),
    ]))
  })
})
