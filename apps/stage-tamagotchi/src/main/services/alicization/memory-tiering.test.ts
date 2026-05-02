import { describe, expect, it } from 'vitest'

import {
  deriveConsolidationMemoryTier,
  deriveEpisodicMemoryTier,
  deriveFactMemoryTier,
  deriveTierCounts,
} from './memory-tiering'

const dayMs = 24 * 60 * 60 * 1000

describe('memory-tiering', () => {
  it('derives hot, warm, and cold tiers for facts', () => {
    const now = Date.UTC(2026, 3, 25, 8, 0, 0)
    const hot = deriveFactMemoryTier({
      updatedAt: now - 12 * 60 * 60 * 1000,
      lastAccessAt: now - 6 * 60 * 60 * 1000,
      accessCount: 4,
      confidence: 0.86,
    }, now)
    const warm = deriveFactMemoryTier({
      updatedAt: now - 10 * dayMs,
      lastAccessAt: now - 5 * dayMs,
      accessCount: 2,
      confidence: 0.74,
    }, now)
    const cold = deriveFactMemoryTier({
      updatedAt: now - 60 * dayMs,
      lastAccessAt: now - 60 * dayMs,
      accessCount: 0,
      confidence: 0.22,
    }, now)

    expect(hot).toBe('hot')
    expect(warm).toBe('warm')
    expect(cold).toBe('cold')
  })

  it('keeps recent or frequently recalled episodic memories hot while allowing older low-salience episodes to cool', () => {
    const now = Date.UTC(2026, 3, 25, 8, 0, 0)
    const hot = deriveEpisodicMemoryTier({
      occurredAt: now - dayMs,
      updatedAt: now - dayMs,
      lastRecalledAt: now - 12 * 60 * 60 * 1000,
      recallCount: 3,
      salience: 0.82,
      consolidationPriority: 0.78,
      sourceKind: 'execution-result',
      provenance: 'remembered',
      latestReconsolidation: null,
      tags: ['runtime seam'],
    }, now)
    const cold = deriveEpisodicMemoryTier({
      occurredAt: now - 70 * dayMs,
      updatedAt: now - 70 * dayMs,
      lastRecalledAt: null,
      recallCount: 0,
      salience: 0.34,
      consolidationPriority: 0.28,
      sourceKind: 'dialogue-feedback',
      provenance: 'remembered',
      latestReconsolidation: null,
      tags: ['old seam'],
    }, now)

    expect(hot).toBe('hot')
    expect(cold).toBe('cold')
  })

  it('keeps dense autobiographical consolidations warm or hot instead of cooling them like disposable cache', () => {
    const now = Date.UTC(2026, 3, 25, 8, 0, 0)
    const hot = deriveConsolidationMemoryTier({
      kind: 'autobiographical',
      facet: 'relationship-era',
      periodStartedAt: now - 3 * dayMs,
      periodEndedAt: now - dayMs,
      confidence: 0.84,
      derivedEventIds: ['episode-1', 'episode-2', 'episode-3'],
      updatedAt: now - dayMs,
    }, now)
    const cold = deriveConsolidationMemoryTier({
      kind: 'daily',
      facet: null,
      periodStartedAt: now - 120 * dayMs,
      periodEndedAt: now - 110 * dayMs,
      confidence: 0.42,
      derivedEventIds: ['episode-1'],
      updatedAt: now - 90 * dayMs,
    }, now)

    expect(hot).toBe('hot')
    expect(cold).toBe('cold')
    expect(deriveTierCounts([
      { tier: hot },
      { tier: cold },
      { tier: 'warm' as const },
    ], item => item.tier)).toEqual({
      hot: 1,
      warm: 1,
      cold: 1,
    })
  })
})
