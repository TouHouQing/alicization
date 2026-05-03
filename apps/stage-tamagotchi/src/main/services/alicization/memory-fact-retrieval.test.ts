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

  it('prefers validated and internalized knowledge over provisional observations when overlap is similar', () => {
    const nowTs = Date.UTC(2026, 3, 27, 12, 0, 0)
    const ranked = rankAlicizationMemoryFacts({
      query: 'runtime continuity seam',
      limit: 5,
      currentTs: nowTs,
      facts: [
        {
          id: 'fact-validated',
          subject: 'assistant',
          predicate: 'learned',
          object: 'runtime continuity seam returns before branching',
          confidence: 0.78,
          source: 'async-llm',
          dedupeKey: 'assistant|learned|runtime continuity seam returns before branching',
          createdAt: nowTs - 10_000,
          updatedAt: nowTs - 10_000,
          lastAccessAt: null,
          accessCount: 1,
          knowledgeStage: 'internalized-long-horizon-knowledge',
          validationStatus: 'validated',
          provenance: 'inferred',
          memoryTier: 'warm',
        } as any,
        {
          id: 'fact-ephemeral',
          subject: 'assistant',
          predicate: 'noticed',
          object: 'runtime continuity seam returns before branching',
          confidence: 0.82,
          source: 'async-llm',
          dedupeKey: 'assistant|noticed|runtime continuity seam returns before branching',
          createdAt: nowTs - 10_000,
          updatedAt: nowTs - 10_000,
          lastAccessAt: null,
          accessCount: 1,
          knowledgeStage: 'ephemeral-observation',
          validationStatus: 'unverified',
          provenance: 'inferred',
          memoryTier: 'warm',
        } as any,
      ],
    })

    expect(ranked[0]?.fact.id).toBe('fact-validated')
  })

  it('penalizes contradiction-heavy facts even when lexical overlap is similar', () => {
    const nowTs = Date.UTC(2026, 3, 27, 12, 0, 0)
    const ranked = rankAlicizationMemoryFacts({
      query: 'verify result before sounding certain',
      limit: 5,
      currentTs: nowTs,
      facts: [
        {
          id: 'fact-stable',
          subject: 'assistant',
          predicate: 'procedure',
          object: 'verify result before sounding certain',
          confidence: 0.8,
          source: 'async-llm',
          dedupeKey: 'assistant|procedure|verify result before sounding certain',
          createdAt: nowTs - 10_000,
          updatedAt: nowTs - 10_000,
          lastAccessAt: null,
          accessCount: 3,
          validationCount: 3,
          contradictionCount: 0,
          knowledgeStage: 'validated-knowledge',
          validationStatus: 'validated',
          provenance: 'inferred',
          memoryTier: 'warm',
        } as any,
        {
          id: 'fact-unstable',
          subject: 'assistant',
          predicate: 'procedure',
          object: 'verify result before sounding certain',
          confidence: 0.82,
          source: 'async-llm',
          dedupeKey: 'assistant|procedure|verify result before sounding certain unstable',
          createdAt: nowTs - 10_000,
          updatedAt: nowTs - 10_000,
          lastAccessAt: null,
          accessCount: 3,
          validationCount: 1,
          contradictionCount: 3,
          knowledgeStage: 'validated-knowledge',
          validationStatus: 'validated',
          provenance: 'inferred',
          memoryTier: 'warm',
        } as any,
      ],
    })

    expect(ranked[0]?.fact.id).toBe('fact-stable')
  })

  it('uses explicit memory domains to prefer procedure facts for task-like queries', () => {
    const nowTs = Date.UTC(2026, 3, 27, 12, 0, 0)
    const ranked = rankAlicizationMemoryFacts({
      query: 'patch verify runtime seam',
      limit: 5,
      currentTs: nowTs,
      facts: [
        {
          id: 'fact-procedure',
          subject: 'assistant',
          predicate: 'procedure',
          object: 'patch verify runtime seam before branching',
          confidence: 0.78,
          source: 'async-llm',
          dedupeKey: 'assistant|procedure|patch verify runtime seam before branching',
          createdAt: nowTs,
          updatedAt: nowTs,
          lastAccessAt: null,
          accessCount: 1,
          memoryDomain: 'procedure',
          provenance: 'inferred',
          memoryTier: 'warm',
        } as any,
        {
          id: 'fact-relationship',
          subject: 'relationship',
          predicate: 'prefers',
          object: 'more room before closeness',
          confidence: 0.82,
          source: 'async-llm',
          dedupeKey: 'relationship|prefers|more room before closeness',
          createdAt: nowTs,
          updatedAt: nowTs,
          lastAccessAt: null,
          accessCount: 1,
          memoryDomain: 'relationship',
          provenance: 'inferred',
          memoryTier: 'warm',
        } as any,
      ],
    })

    expect(ranked[0]?.fact.id).toBe('fact-procedure')
  })
})
