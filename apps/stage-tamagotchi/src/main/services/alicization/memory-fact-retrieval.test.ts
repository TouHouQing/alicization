import { describe, expect, it } from 'vitest'

import { rankAlicizationMemoryFacts } from './memory-fact-retrieval'

describe('memory fact retrieval', () => {
  it('keeps a cold but confident long-tail fact reachable under a vague query', () => {
    const nowTs = Date.UTC(2026, 3, 27, 12, 0, 0)
    const ranked = rankAlicizationMemoryFacts({
      query: 'runtime seam',
      limit: 5,
      currentTs: nowTs,
      facts: [
        {
          id: 'fact-cold',
          subject: 'host',
          predicate: 'returns to',
          object: 'runtime seam first',
          confidence: 0.86,
          source: 'manual',
          dedupeKey: 'host|returns to|runtime seam first',
          createdAt: nowTs - 120 * 24 * 60 * 60 * 1000,
          updatedAt: nowTs - 120 * 24 * 60 * 60 * 1000,
          lastAccessAt: null,
          accessCount: 0,
          provenance: 'remembered',
          memoryTier: 'cold',
        } as any,
      ],
    })

    expect(ranked).toHaveLength(1)
    expect(ranked[0]?.fact.id).toBe('fact-cold')
    expect(ranked[0]?.score).toBeGreaterThan(0.2)
  })

  it('prefers stronger lexical overlap when multiple facts compete', () => {
    const nowTs = Date.UTC(2026, 3, 27, 12, 0, 0)
    const ranked = rankAlicizationMemoryFacts({
      query: 'cli patch flow',
      limit: 5,
      currentTs: nowTs,
      facts: [
        {
          id: 'fact-strong',
          subject: 'host',
          predicate: 'prefers',
          object: 'cli patch flow first',
          confidence: 0.84,
          source: 'manual',
          dedupeKey: 'host|prefers|cli patch flow first',
          createdAt: nowTs,
          updatedAt: nowTs,
          lastAccessAt: null,
          accessCount: 1,
          provenance: 'remembered',
          memoryTier: 'hot',
        } as any,
        {
          id: 'fact-weaker',
          subject: 'host',
          predicate: 'likes',
          object: 'gentle pacing',
          confidence: 0.9,
          source: 'manual',
          dedupeKey: 'host|likes|gentle pacing',
          createdAt: nowTs,
          updatedAt: nowTs,
          lastAccessAt: null,
          accessCount: 1,
          provenance: 'remembered',
          memoryTier: 'hot',
        } as any,
      ],
    })

    expect(ranked[0]?.fact.id).toBe('fact-strong')
  })
})
