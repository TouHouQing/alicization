import { describe, expect, it } from 'vitest'

import { rankFactsByLearningTuning } from './learning-tuned-fact-ranking'

describe('learning tuned fact ranking', () => {
  it('demotes under-validated world-model facts and preserves procedure carry when learning tuning asks for stricter validation', () => {
    const ranked = rankFactsByLearningTuning({
      facts: [
        {
          id: 'fact-world',
          subject: 'typescript',
          predicate: 'world fact',
          object: 'a speculative API detail',
          confidence: 0.82,
          source: 'rule',
          dedupeKey: 'typescript|world fact|a speculative API detail',
          createdAt: 1,
          updatedAt: 1,
          lastAccessAt: null,
          accessCount: 1,
          memoryDomain: 'world-model',
          knowledgeStage: 'working-understanding',
          validationStatus: 'unverified',
          validationCount: 0,
          contradictionCount: 0,
        } as any,
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
        } as any,
      ],
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1,
        sourceReportAt: 1,
        focusDimensions: ['worldModelValidationDiscipline', 'domainInternalizationDiscipline'],
        staleSelfModelVetoRate: 0,
        relationshipEraConfusionRate: 0,
        retrievalAdjustments: {
          proceduralBoost: 0.2,
          relationshipBoost: 0,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0.1,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0,
          delayUntilAfterPayoffBias: 0,
          provenanceLabelBias: 0.12,
          specificityClampBias: 0.18,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0,
        },
        notes: [],
      },
    })

    expect(ranked[0]?.id).toBe('fact-procedure')
    expect(ranked[1]?.id).toBe('fact-world')
  })

  it('demotes self-model and relationship facts more aggressively when suppression veto rates stay elevated', () => {
    const ranked = rankFactsByLearningTuning({
      facts: [
        {
          id: 'fact-self',
          subject: 'assistant',
          predicate: 'self-model',
          object: 'an older self-story',
          confidence: 0.9,
          source: 'reflection',
          dedupeKey: 'assistant|self-model|an older self-story',
          createdAt: 1,
          updatedAt: 1,
          lastAccessAt: null,
          accessCount: 1,
          memoryDomain: 'self-model',
        } as any,
        {
          id: 'fact-relationship',
          subject: 'assistant',
          predicate: 'relationship',
          object: 'an older repair phase bond line',
          confidence: 0.88,
          source: 'reflection',
          dedupeKey: 'assistant|relationship|an older repair phase bond line',
          createdAt: 1,
          updatedAt: 1,
          lastAccessAt: null,
          accessCount: 1,
          memoryDomain: 'relationship',
        } as any,
        {
          id: 'fact-procedure',
          subject: 'assistant',
          predicate: 'procedure',
          object: 'keep the current payoff primary',
          confidence: 0.84,
          source: 'rule',
          dedupeKey: 'assistant|procedure|keep the current payoff primary',
          createdAt: 1,
          updatedAt: 1,
          lastAccessAt: null,
          accessCount: 1,
          memoryDomain: 'procedure',
        } as any,
      ],
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1,
        sourceReportAt: 1,
        focusDimensions: ['learningRevisionDiscipline'],
        staleSelfModelVetoRate: 0.4,
        relationshipEraConfusionRate: 0.5,
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0.2,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.18,
          delayUntilAfterPayoffBias: 0.1,
          provenanceLabelBias: 0.16,
          specificityClampBias: 0.14,
        },
        personStateAdjustments: {
          repairWindowBias: 0.14,
          closenessCapBias: 0.16,
        },
        notes: [],
      },
    })

    expect(ranked[0]?.id).toBe('fact-procedure')
    expect(ranked.at(-1)?.id).toBe('fact-relationship')
  })
})
