import { describe, expect, it } from 'vitest'

import {
  buildAlicizationLongHorizonMemory,
  buildAlicizationLongHorizonMemoryQuery,
} from './long-horizon-memory'

describe('long horizon memory', () => {
  it('keeps durable fact summaries factual', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 20_500,
      facts: [{
        id: 'fact-direct-answer',
        subject: 'relationship',
        predicate: 'prefer',
        object: 'direct answers',
        confidence: 0.84,
        accessCount: 1,
        updatedAt: 20_000,
      }] as any,
    })

    expect(snapshot?.anchorFacts[0]?.summary).toBe('relationship prefer direct answers')
    expect(snapshot?.rememberedPreferenceSummary).toBe('relationship prefer direct answers')
  })

  it('derives influence tags from structured facts while using confidence and freshness for weight', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 50_000,
      facts: [{
        id: 'fact-boundary',
        subject: 'relationship',
        predicate: 'boundary',
        object: 'Do not interrupt focused work.',
        confidence: 0.86,
        accessCount: 3,
        updatedAt: 49_500,
        knowledgeStage: 'validated-knowledge',
        validationStatus: 'validated',
        validationCount: 2,
      }, {
        id: 'fact-plan',
        subject: 'assistant',
        predicate: 'plan',
        object: 'Verify the indexing result tomorrow.',
        confidence: 0.82,
        accessCount: 2,
        updatedAt: 49_000,
        knowledgeStage: 'internalized-long-horizon-knowledge',
        validationStatus: 'validated',
        validationCount: 2,
      }] as any,
    })

    const boundary = snapshot?.anchorFacts.find(item => item.factId === 'fact-boundary')
    const plan = snapshot?.anchorFacts.find(item => item.factId === 'fact-plan')
    expect(boundary?.influenceTags).toEqual(expect.arrayContaining(['bond', 'boundary']))
    expect(plan?.influenceTags).toEqual(expect.arrayContaining(['identity', 'task']))
    expect(boundary?.weight).toBeGreaterThan(0.7)
    expect(plan?.weight).toBeGreaterThan(0.7)
  })

  it('filters superseded facts from durable anchors', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 50_000,
      facts: [{
        id: 'fact-old',
        subject: 'assistant',
        predicate: 'learned',
        object: 'old value',
        confidence: 0.92,
        accessCount: 6,
        updatedAt: 49_000,
        knowledgeStage: 'validated-knowledge',
        validationStatus: 'superseded',
      }, {
        id: 'fact-new',
        subject: 'assistant',
        predicate: 'learned',
        object: 'corrected value',
        confidence: 0.82,
        accessCount: 4,
        updatedAt: 49_500,
        knowledgeStage: 'internalized-long-horizon-knowledge',
        validationStatus: 'validated',
        supersedes: ['fact-old'],
      }] as any,
    })

    expect(snapshot?.anchorFacts.some(item => item.factId === 'fact-old')).toBe(false)
    expect(snapshot?.anchorFacts.some(item => item.factId === 'fact-new')).toBe(true)
  })

  it('ignores legacy consolidation metadata that has no typed carry evidence', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 70_000,
      facts: [],
      recentMemoryConsolidations: [{
        id: 'consolidation-legacy-metadata',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: 'legacy-metadata',
        periodStartedAt: 69_000,
        periodEndedAt: 69_500,
        summary: 'Legacy prose marker.',
        lesson: 'Legacy policy marker.',
        cues: ['legacy-marker'],
        confidence: 0.94,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-legacy'],
        updatedAt: 69_500,
        metadata: {
          humanlikeCarry: {
            relationshipPrimaryIntent: 'legacy-intent',
            relationshipSignals: ['legacy-signal'],
            recallCertainty: 'corrected',
            emotionalResidueTags: ['legacy-tag'],
            metabolismSummary: 'legacy policy',
          },
        },
      }] as any,
    })

    expect(snapshot).toBeNull()
  })

  it('builds typed consolidation cues only when provenance and event evidence are traceable', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 80_000,
      facts: [],
      recentMemoryConsolidations: [{
        id: 'consolidation-affective-evidence',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: 'affective-evidence',
        periodStartedAt: 79_000,
        periodEndedAt: 79_500,
        summary: 'Observed affective evidence.',
        lesson: null,
        cues: [],
        confidence: 0.86,
        dominantProvenance: 'observed',
        derivedEventIds: ['event-affective-1', 'event-affective-2'],
        updatedAt: 79_500,
        metadata: {
          humanlikeCarry: {
            recallCertainty: 'corrected',
            affectivePerspective: {
              hostEmotionLabels: ['concerned'],
              selfEmotionLabels: ['attentive'],
            },
            embodimentRecallProfile: {
              recallStrength: 'lightly-noticed',
              modalityRisk: 'medium',
            },
            embodimentExpression: {
              gaze: 'stable',
              voice: 'even',
            },
          },
        },
      }] as any,
    })

    const cue = snapshot?.anchorFacts.find(item =>
      item.factId === 'derived:consolidation-humanlike-carry:consolidation-affective-evidence',
    )
    expect(cue?.object).toContain('host-emotion concerned')
    expect(cue?.object).toContain('embodiment-recall lightly-noticed')
    expect(cue?.influenceTags).toEqual(expect.arrayContaining(['bond', 'identity', 'boundary', 'truth']))
    expect(cue?.weight).toBeGreaterThan(0.75)
  })

  it('keeps stable preference text but derives its influence from the typed consolidation facet', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 90_000,
      facts: [],
      recentMemoryConsolidations: [{
        id: 'consolidation-stable-preference',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: 'stable-preference',
        periodStartedAt: 89_000,
        periodEndedAt: 89_500,
        summary: 'A reviewed relationship preference.',
        lesson: null,
        cues: [],
        confidence: 0.88,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-preference-1'],
        updatedAt: 89_500,
        metadata: {
          humanlikeCarry: {
            recallCertainty: 'steady',
            stablePreferenceHint: 'Prefer direct acknowledgement before analysis.',
          },
        },
      }] as any,
    })

    const cue = snapshot?.anchorFacts.find(item =>
      item.factId === 'derived:consolidation-stable-preference:consolidation-stable-preference',
    )
    expect(cue?.summary).toBe('Prefer direct acknowledgement before analysis.')
    expect(cue?.influenceTags).toEqual(['bond'])
  })

  it('uses typed current-turn callback carry instead of person-state prose', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 100_000,
      facts: [],
      executionCallbackCarry: {
        carryMode: 'lower-pressure',
        confidence: 0.84,
        source: 'session-continuity',
        summary: 'The completed task still needs a user-facing result.',
        threadAnchor: 'task-result',
        episodeId: 'episode-result',
      },
    })

    const cue = snapshot?.anchorFacts.find(item =>
      item.factId === 'derived:execution-callback-carry-current-turn',
    )
    expect(cue?.summary).toContain('The completed task still needs a user-facing result.')
    expect(cue?.influenceTags).toEqual(expect.arrayContaining(['boundary', 'task']))
  })

  it('uses typed affective residue cadence as durable evidence', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 110_000,
      facts: [],
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 109_500,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.48,
        repairPressure: 0.2,
        burdenPressure: 0.1,
        trustPressure: 0.4,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.52,
          repairRecovery: 0.44,
          overreachRisk: 0.22,
          fatigueGuard: 0.16,
          afterglowCarry: 0.49,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['observed-affect'],
          summary: 'Keep the next return measured.',
        },
        sourceSignals: ['affective-observation'],
        summary: 'A measured return remains appropriate.',
      } as any,
    })

    const cue = snapshot?.anchorFacts.find(item => item.factId === 'derived:affective-residue-cadence')
    expect(cue?.summary).toContain('cadence mode: measured-return')
    expect(cue?.influenceTags).toEqual(expect.arrayContaining(['bond', 'boundary', 'task', 'identity']))
  })

  it('does not derive durable strategy facts from person-state wording', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 115_000,
      facts: [],
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 114_500,
        summary: 'A reviewed relationship observation.',
        dominantContexts: ['dialogue'],
        narrative: [
          'Leave more room and wait for a clearer opening before reopening this line.',
        ],
        preferenceHints: ['Prefer memory-led follow-ups.'],
        sensitivityHints: [],
        repairHints: ['Stay less eager after a repair.'],
        burdenHints: ['Use lower-pressure timing.'],
        relationshipShift: {
          trustDelta: 0,
          closenessDelta: 0,
          burdenDelta: 0.2,
          boundaryDelta: 0.3,
          repairDelta: 0.1,
        },
        reinforcementBias: {
          directness: 0,
          warmth: 0,
          restraint: 0,
          initiative: 0,
          playfulness: 0,
          embodiment: 0,
        },
        sourceTrail: [{
          kind: 'relationship-outcome',
          sourceKind: 'reply',
          summary: 'turn-person-state-wording',
          createdAt: 114_500,
        }],
        affectiveResidue: null,
      } as any,
    })

    expect(snapshot?.anchorFacts.some(item =>
      item.factId === 'derived:person-state-initiative-strategy-carry',
    )).toBe(false)
  })

  it('builds a query from current context and previous durable memory', () => {
    const query = buildAlicizationLongHorizonMemoryQuery({
      userText: '继续处理索引问题',
      appraisal: {
        activeKnot: '索引结果仍待验证',
      } as any,
      previous: {
        summary: '验证向量索引',
        dominantCueSummary: '先核实索引状态',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: null,
        rememberedPlanSummary: '继续验证索引',
      } as any,
    })

    expect(query).toContain('继续处理索引问题')
    expect(query).toContain('先核实索引状态')
  })
})
