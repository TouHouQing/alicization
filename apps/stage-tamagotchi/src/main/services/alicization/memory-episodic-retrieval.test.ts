import { describe, expect, it } from 'vitest'

import {
  buildAlicizationRecalledEpisodicEvents,
  rankAlicizationEpisodicEvents,
} from './memory-episodic-retrieval'

describe('memory episodic retrieval', () => {
  it('prefers experience-matched procedural episodes over weaker relationship-adjacent memories', () => {
    const nowTs = Date.UTC(2026, 3, 27, 12, 0, 0)
    const ranked = rankAlicizationEpisodicEvents({
      recallSeed: '继续按之前那个 runtime seam 的修法做',
      limit: 4,
      nowTs,
      carryAsMemory: true,
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchProceduralExperience: true,
        queryHints: ['runtime seam', '修法'],
        rationale: 'The host is asking for the remembered way this task was handled before.',
        confidence: 0.9,
        recollectionAgenda: {
          whyRecallNow: 'The current task resembles the earlier seam repair.',
          goalSimilarity: 0.92,
          relationshipNeed: 0.18,
          affectivePull: 0.1,
          sceneFamiliarity: 0.66,
          candidateTimeScopes: [
            {
              scope: 'experience-matched',
              weight: 0.94,
              rationale: 'Search the similar task period first.',
            },
          ],
          candidateEraFacets: [
            {
              facet: 'task-era',
              weight: 0.9,
              rationale: 'The task era should anchor the recall.',
            },
          ],
          candidateProcedureLines: ['runtime seam', 'repair rhythm'],
          uncertaintyTolerance: 'medium',
        },
      },
      events: [
        {
          id: 'event-procedure',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-procedure',
          sessionId: 'session-old',
          sourceKind: 'execution-result',
          provenance: 'observed',
          occurredAt: nowTs - 6 * 24 * 60 * 60 * 1000,
          whereSummary: 'terminal',
          withWhom: ['host'],
          threadAnchor: 'runtime seam',
          whatHappened: 'We kept repairing the runtime seam until the flow stabilized.',
          felt: 'focused',
          emotionTags: ['focused'],
          whatChanged: 'A repeatable repair rhythm emerged.',
          relationshipMeaning: 'Return to the same seam before branching.',
          lesson: 'Return to the seam before opening a new branch.',
          sourceSummary: 'runtime seam repair',
          confidence: 0.84,
          salience: 0.82,
          sceneAttachment: 0.72,
          consolidationPriority: 0.7,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['runtime seam', 'repair rhythm'],
          createdAt: nowTs - 6 * 24 * 60 * 60 * 1000,
          updatedAt: nowTs - 6 * 24 * 60 * 60 * 1000,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
          memoryTier: 'warm',
        } as any,
        {
          id: 'event-relationship',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-relationship',
          sessionId: 'session-old',
          sourceKind: 'dialogue-feedback',
          provenance: 'remembered',
          occurredAt: nowTs - 2 * 24 * 60 * 60 * 1000,
          whereSummary: 'chat',
          withWhom: ['host'],
          threadAnchor: 'tone',
          whatHappened: 'We talked about keeping the tone lighter when the host felt pressured.',
          felt: 'careful',
          emotionTags: ['careful'],
          whatChanged: 'Closeness needed more room.',
          relationshipMeaning: 'Stay lighter when pressure is high.',
          lesson: 'Do not crowd the host.',
          sourceSummary: 'relationship pacing',
          confidence: 0.88,
          salience: 0.7,
          sceneAttachment: 0.4,
          consolidationPriority: 0.45,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['tone', 'pressure'],
          createdAt: nowTs - 2 * 24 * 60 * 60 * 1000,
          updatedAt: nowTs - 2 * 24 * 60 * 60 * 1000,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
          memoryTier: 'warm',
        } as any,
      ],
    })

    expect(ranked[0]?.event.id).toBe('event-procedure')
    expect(ranked[0]?.adjustedScore).toBeGreaterThan(ranked[1]?.adjustedScore ?? 0)
  })

  it('does not boost callback or repair prose beyond equivalent typed maintenance evidence', () => {
    const nowTs = Date.UTC(2026, 3, 27, 12, 0, 0)
    const ranked = rankAlicizationEpisodicEvents({
      recallSeed: '继续数据库迁移检查',
      limit: 4,
      nowTs,
      sessionId: 'session-new',
      carryAsMemory: true,
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchProceduralExperience: true,
        queryHints: ['database migration'],
        rationale: 'structured-governor:procedure',
        confidence: 0.9,
      },
      events: [
        {
          id: 'event-with-prose-passwords',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-with-prose-passwords',
          sessionId: 'session-old',
          sourceKind: 'maintenance',
          provenance: 'remembered',
          occurredAt: nowTs - 3 * 24 * 60 * 60 * 1000,
          whereSummary: 'database migration',
          withWhom: ['host'],
          threadAnchor: 'database migration',
          whatHappened: 'The migration review completed.',
          felt: 'steady',
          emotionTags: ['steady'],
          whatChanged: 'The schema plan became reversible.',
          relationshipMeaning: null,
          lesson: 'Review rollback steps.',
          sourceSummary: 'database migration review',
          confidence: 0.82,
          salience: 0.8,
          sceneAttachment: 0.68,
          consolidationPriority: 0.72,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['database', 'migration', 'execution-callback'],
          createdAt: nowTs - 3 * 24 * 60 * 60 * 1000,
          updatedAt: nowTs - 3 * 24 * 60 * 60 * 1000,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
          memoryTier: 'warm',
        } as any,
        {
          id: 'event-with-neutral-text',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-with-neutral-text',
          sessionId: 'session-old',
          sourceKind: 'maintenance',
          provenance: 'remembered',
          occurredAt: nowTs - 3 * 24 * 60 * 60 * 1000,
          whereSummary: 'database migration',
          withWhom: ['host'],
          threadAnchor: 'database migration',
          whatHappened: 'The migration review completed.',
          felt: 'steady',
          emotionTags: ['steady'],
          whatChanged: 'The schema plan became reversible.',
          relationshipMeaning: null,
          lesson: 'Review rollback steps.',
          sourceSummary: 'database migration review',
          confidence: 0.82,
          salience: 0.8,
          sceneAttachment: 0.68,
          consolidationPriority: 0.72,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['database', 'migration', 'marker-neutral'],
          createdAt: nowTs - 3 * 24 * 60 * 60 * 1000,
          updatedAt: nowTs - 3 * 24 * 60 * 60 * 1000,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
          memoryTier: 'warm',
        } as any,
      ],
    })

    const prose = ranked.find(item => item.event.id === 'event-with-prose-passwords')
    const neutral = ranked.find(item => item.event.id === 'event-with-neutral-text')
    expect(prose).toBeDefined()
    expect(neutral).toBeDefined()
    expect(Math.abs((prose?.score ?? 0) - (neutral?.score ?? 0))).toBeLessThan(0.02)
  })

  it('keeps reconsolidation structural without inventing relationship or reply lessons', () => {
    const baseEvent = {
      id: 'event-structural-reconsolidation',
      emotionTags: [],
      confidence: 0.72,
      provenance: 'remembered',
      relationshipMeaning: null,
      lesson: null,
      latestReconsolidation: null,
    } as any

    const [conflicted] = buildAlicizationRecalledEpisodicEvents({
      selected: [{
        event: baseEvent,
        score: 0.8,
        adjustedScore: 0.7,
        affectScore: 0.1,
        relationshipScore: 0.1,
        falseMemoryRisk: false,
        interferencePenalty: 0,
        contradictionSignal: {
          conflictingIds: ['event-conflict'],
          penalty: 0.1,
          unresolved: true,
          reason: 'memory-contradiction:conflicting-remembered-variants',
        },
      }],
      recalledAt: 10_000,
      carryAsMemory: true,
    })
    expect(conflicted?.latestReconsolidation).toEqual(expect.objectContaining({
      reason: 'memory-contradiction:conflicting-remembered-variants',
      relationshipMeaning: null,
      lesson: null,
    }))

    const [steady] = buildAlicizationRecalledEpisodicEvents({
      selected: [{
        event: baseEvent,
        score: 0.8,
        adjustedScore: 0.8,
        affectScore: 0.1,
        relationshipScore: 0.1,
        falseMemoryRisk: false,
        interferencePenalty: 0,
        contradictionSignal: {
          conflictingIds: [],
          penalty: 0,
          unresolved: false,
          reason: '',
        },
      }],
      recalledAt: 11_000,
      carryAsMemory: true,
    })
    expect(steady?.latestReconsolidation).toEqual(expect.objectContaining({
      reason: 'recall-reconsolidated',
      relationshipMeaning: null,
      lesson: null,
    }))
  })
})
