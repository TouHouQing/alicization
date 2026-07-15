import { describe, expect, it } from 'vitest'

import { rankFactsByLearningTuning } from './learning-tuned-fact-ranking'

const facts = [
  {
    id: 'fact-world',
    subject: 'typescript',
    predicate: 'world fact',
    object: 'a validated API detail',
    confidence: 0.86,
    source: 'rule',
    dedupeKey: 'typescript|world fact|a validated API detail',
    createdAt: 1,
    updatedAt: 1,
    lastAccessAt: null,
    accessCount: 1,
    memoryDomain: 'world-model',
    knowledgeStage: 'validated-knowledge',
    validationStatus: 'validated',
    validationCount: 2,
    contradictionCount: 0,
  },
  {
    id: 'fact-procedure',
    subject: 'assistant',
    predicate: 'procedure',
    object: 'verify before sounding certain',
    confidence: 0.84,
    source: 'rule',
    dedupeKey: 'assistant|procedure|verify before sounding certain',
    createdAt: 1,
    updatedAt: 1,
    lastAccessAt: null,
    accessCount: 1,
    memoryDomain: 'procedure',
    knowledgeStage: 'validated-knowledge',
    validationStatus: 'validated',
    validationCount: 2,
    contradictionCount: 0,
  },
  {
    id: 'fact-relationship',
    subject: 'host',
    predicate: 'relationship',
    object: 'prefers a lighter interruption pattern',
    confidence: 0.83,
    source: 'reflection',
    dedupeKey: 'host|relationship|prefers a lighter interruption pattern',
    createdAt: 1,
    updatedAt: 1,
    lastAccessAt: null,
    accessCount: 1,
    memoryDomain: 'relationship',
    knowledgeStage: 'validated-knowledge',
    validationStatus: 'validated',
    validationCount: 2,
    contradictionCount: 0,
  },
] as any[]

function tuningAdvice(input: {
  proceduralBoost?: number
  relationshipBoost?: number
} = {}) {
  return {
    version: 'memory-tuning-advice-v1' as const,
    source: 'nightly-replay-benchmark' as const,
    updatedAt: 1,
    sourceReportAt: 1,
    focusDimensions: [],
    staleSelfModelVetoRate: 0,
    relationshipEraConfusionRate: 0,
    retrievalAdjustments: {
      proceduralBoost: input.proceduralBoost ?? 0,
      relationshipBoost: input.relationshipBoost ?? 0,
      temporalWindowBias: 0,
      wrongThreadPenalty: 0,
    },
    surfaceAdjustments: {
      inwardCarryBias: 0,
      delayUntilAfterPayoffBias: 0,
      provenanceLabelBias: 0,
      specificityClampBias: 0,
    },
    personStateAdjustments: {
      repairWindowBias: 0,
      closenessCapBias: 0,
    },
    notes: [],
  }
}

describe('learning tuned fact ranking', () => {
  it('applies numeric procedure and relationship retrieval boosts', () => {
    const rankWith = (advice: ReturnType<typeof tuningAdvice>) => rankFactsByLearningTuning({
      facts,
      tuningAdvice: advice,
    }).map(item => item.id)

    expect(rankWith(tuningAdvice())).toEqual([
      'fact-world',
      'fact-procedure',
      'fact-relationship',
    ])
    expect(rankWith(tuningAdvice({ proceduralBoost: 0.4 }))[0]).toBe('fact-procedure')
    expect(rankWith(tuningAdvice({ relationshipBoost: 0.4 }))[0]).toBe('fact-relationship')
  })

  it('keeps ranking invariant when only non-retrieval tuning fields change', () => {
    const invariantFacts = facts.map((fact) => {
      return fact.id === 'fact-relationship'
        ? { ...fact, confidence: 0.9 }
        : fact
    })
    const baselineAdvice = tuningAdvice()
    const nonRetrievalAdvice = {
      ...baselineAdvice,
      focusDimensions: ['learningRevisionDiscipline', 'worldModelValidationDiscipline'],
      staleSelfModelVetoRate: 0.8,
      relationshipEraConfusionRate: 0.8,
      surfaceAdjustments: {
        inwardCarryBias: 1,
        delayUntilAfterPayoffBias: 1,
        provenanceLabelBias: 1,
        specificityClampBias: 1,
      },
      personStateAdjustments: {
        repairWindowBias: 1,
        closenessCapBias: 1,
      },
      notes: ['This replay note must not alter fact ranking.'],
    }
    const baseline = rankFactsByLearningTuning({
      facts: invariantFacts,
      tuningAdvice: baselineAdvice,
    })
    const nonRetrievalTuned = rankFactsByLearningTuning({
      facts: invariantFacts,
      tuningAdvice: nonRetrievalAdvice,
    })

    expect(nonRetrievalTuned.map(item => item.id)).toEqual(baseline.map(item => item.id))
  })
})
