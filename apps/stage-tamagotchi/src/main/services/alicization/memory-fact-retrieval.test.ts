import { describe, expect, it } from 'vitest'

import {
  buildAlicizationDomainNativeMemoryViews,
  rankDomainNativeMemoryViews,
} from './memory-domain-model'
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

  it('projects facts into domain-native views with distinct recall semantics', () => {
    const nowTs = Date.UTC(2026, 3, 27, 12, 0, 0)
    const views = buildAlicizationDomainNativeMemoryViews([
      {
        id: 'fact-procedure',
        subject: 'assistant',
        predicate: 'procedure',
        object: 'verify patch result before reporting',
        confidence: 0.86,
        source: 'async-llm',
        dedupeKey: 'assistant|procedure|verify patch result before reporting',
        createdAt: nowTs,
        updatedAt: nowTs,
        lastAccessAt: null,
        accessCount: 4,
        validationCount: 3,
        contradictionCount: 0,
        memoryDomain: 'procedure',
        knowledgeStage: 'validated-knowledge',
        validationStatus: 'validated',
      } as any,
      {
        id: 'fact-relationship',
        subject: 'relationship',
        predicate: 'boundary',
        object: 'leave more room before warm repair',
        confidence: 0.84,
        source: 'async-llm',
        dedupeKey: 'relationship|boundary|leave more room before warm repair',
        createdAt: nowTs,
        updatedAt: nowTs,
        lastAccessAt: null,
        accessCount: 2,
        validationCount: 2,
        contradictionCount: 1,
        memoryDomain: 'relationship',
        knowledgeStage: 'validated-knowledge',
        validationStatus: 'provisional',
      } as any,
      {
        id: 'fact-self',
        subject: 'alicization',
        predicate: 'self trait',
        object: 'learns to revise stale certainty',
        confidence: 0.82,
        source: 'async-llm',
        dedupeKey: 'alicization|self trait|learns to revise stale certainty',
        createdAt: nowTs,
        updatedAt: nowTs,
        lastAccessAt: null,
        accessCount: 2,
        validationCount: 2,
        contradictionCount: 1,
        memoryDomain: 'self-model',
        knowledgeStage: 'working-understanding',
        validationStatus: 'provisional',
      } as any,
      {
        id: 'fact-world',
        subject: 'TypeScript',
        predicate: 'fact',
        object: 'AlicizationBridge.streamChat returns meta events',
        confidence: 0.78,
        source: 'async-llm',
        dedupeKey: 'typescript|fact|alicizationbridge.streamchat returns meta events',
        createdAt: nowTs,
        updatedAt: nowTs,
        lastAccessAt: null,
        accessCount: 1,
        validationCount: 1,
        contradictionCount: 0,
        memoryDomain: 'world-model',
        knowledgeStage: 'working-understanding',
        validationStatus: 'unverified',
      } as any,
    ])

    expect(views.procedure[0]).toEqual(expect.objectContaining({
      domain: 'procedure',
      conflictResolver: 'versioned-procedure',
      consolidationPolicy: 'habit-internalization',
      reusableStepScore: expect.any(Number),
      verificationNeed: expect.any(Number),
    }))
    expect(views.relationship[0]).toEqual(expect.objectContaining({
      domain: 'relationship',
      conflictResolver: 'relationship-era',
      consolidationPolicy: 'relationship-residue',
      eraSeparationKey: expect.any(String),
      repairArcPressure: expect.any(Number),
    }))
    expect(views.selfModel[0]).toEqual(expect.objectContaining({
      domain: 'self-model',
      conflictResolver: 'self-narrative',
      consolidationPolicy: 'identity-narrative',
      growthVector: 'growth',
    }))
    expect(views.worldModel[0]).toEqual(expect.objectContaining({
      domain: 'world-model',
      conflictResolver: 'source-validation',
      consolidationPolicy: 'validated-world-fact',
      sourceTrust: expect.any(Number),
      validationNeed: expect.any(Number),
    }))
  })

  it('uses relationship-native view pressure to prefer repair and boundary continuity for relationship queries', () => {
    const nowTs = Date.UTC(2026, 3, 27, 12, 0, 0)
    const ranked = rankAlicizationMemoryFacts({
      query: 'relationship repair boundary trust',
      limit: 5,
      currentTs: nowTs,
      facts: [
        {
          id: 'fact-relationship-repair',
          subject: 'relationship',
          predicate: 'boundary',
          object: 'repair trust by leaving more room before warmth',
          confidence: 0.82,
          source: 'async-llm',
          dedupeKey: 'relationship|boundary|repair trust by leaving more room before warmth',
          createdAt: nowTs,
          updatedAt: nowTs,
          lastAccessAt: null,
          accessCount: 1,
          validationCount: 2,
          contradictionCount: 1,
          memoryDomain: 'relationship',
          knowledgeStage: 'validated-knowledge',
          validationStatus: 'provisional',
          provenance: 'inferred',
          memoryTier: 'warm',
        } as any,
        {
          id: 'fact-procedure-high-confidence',
          subject: 'assistant',
          predicate: 'procedure',
          object: 'repair patch workflow after test failure',
          confidence: 0.9,
          source: 'async-llm',
          dedupeKey: 'assistant|procedure|repair patch workflow after test failure',
          createdAt: nowTs,
          updatedAt: nowTs,
          lastAccessAt: null,
          accessCount: 1,
          validationCount: 3,
          contradictionCount: 0,
          memoryDomain: 'procedure',
          knowledgeStage: 'validated-knowledge',
          validationStatus: 'validated',
          provenance: 'inferred',
          memoryTier: 'warm',
        } as any,
      ],
    })

    expect(ranked[0]?.fact.id).toBe('fact-relationship-repair')
  })

  it('exposes explicit conflict resolver outcomes for domain-native views', () => {
    const nowTs = Date.UTC(2026, 3, 27, 12, 0, 0)
    const views = buildAlicizationDomainNativeMemoryViews([
      {
        id: 'self-stale',
        subject: 'alicization',
        predicate: 'self trait',
        object: 'used to answer too quickly before revising certainty',
        confidence: 0.82,
        source: 'async-llm',
        dedupeKey: 'alicization|self trait|used to answer too quickly before revising certainty',
        createdAt: nowTs,
        updatedAt: nowTs,
        lastAccessAt: null,
        accessCount: 1,
        validationCount: 1,
        contradictionCount: 2,
        memoryDomain: 'self-model',
        knowledgeStage: 'working-understanding',
        validationStatus: 'provisional',
      } as any,
      {
        id: 'world-needs-verify',
        subject: 'TypeScript',
        predicate: 'fact',
        object: 'the API might support a hidden parameter',
        confidence: 0.74,
        source: 'async-llm',
        dedupeKey: 'typescript|fact|the api might support a hidden parameter',
        createdAt: nowTs,
        updatedAt: nowTs,
        lastAccessAt: null,
        accessCount: 1,
        validationCount: 0,
        contradictionCount: 1,
        memoryDomain: 'world-model',
        knowledgeStage: 'working-understanding',
        validationStatus: 'unverified',
      } as any,
    ])
    const ranked = rankDomainNativeMemoryViews({
      query: 'who are you and what facts are true',
      views: views.all,
      limit: 4,
    })

    expect(ranked).toEqual(expect.arrayContaining([
      expect.objectContaining({
        view: expect.objectContaining({ factId: 'self-stale' }),
        conflictState: 'suppress-stale',
        resolverReason: expect.stringContaining('self-narrative'),
      }),
      expect.objectContaining({
        view: expect.objectContaining({ factId: 'world-needs-verify' }),
        conflictState: 'verify-first',
        resolverReason: expect.stringContaining('source-validation'),
      }),
    ]))
  })
})
