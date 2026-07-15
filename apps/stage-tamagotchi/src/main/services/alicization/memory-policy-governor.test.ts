import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'

import { describe, expect, it } from 'vitest'

import { deriveAlicizationOnlineMemoryPolicy } from './memory-policy-governor'

describe('memory-policy-governor', () => {
  it('applies all numeric retrieval adjustments at the retrieval policy owner', () => {
    const policyFor = (retrievalAdjustments: {
      proceduralBoost: number
      relationshipBoost: number
      temporalWindowBias: number
      wrongThreadPenalty: number
    }) => deriveAlicizationOnlineMemoryPolicy({
      budgetClass: 'deep-recall-reply',
      telemetry: null,
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1,
        sourceReportAt: 1,
        focusDimensions: [],
        retrievalAdjustments,
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
      },
    })
    const baseline = policyFor({
      proceduralBoost: 0,
      relationshipBoost: 0,
      temporalWindowBias: 0,
      wrongThreadPenalty: 0,
    })
    const procedural = policyFor({
      proceduralBoost: 0.4,
      relationshipBoost: 0,
      temporalWindowBias: 0,
      wrongThreadPenalty: 0,
    })
    const relationship = policyFor({
      proceduralBoost: 0,
      relationshipBoost: 0.4,
      temporalWindowBias: 0,
      wrongThreadPenalty: 0,
    })
    const temporal = policyFor({
      proceduralBoost: 0,
      relationshipBoost: 0,
      temporalWindowBias: 0.4,
      wrongThreadPenalty: 0,
    })
    const wrongThread = policyFor({
      proceduralBoost: 0,
      relationshipBoost: 0,
      temporalWindowBias: 0,
      wrongThreadPenalty: 0.4,
    })

    expect(procedural.sourceWeights.consolidation).toBeGreaterThan(baseline.sourceWeights.consolidation)
    expect(relationship.sourceWeights.consolidation).toBeGreaterThan(baseline.sourceWeights.consolidation)
    expect(temporal.sourceWeights.episodic).toBeGreaterThan(baseline.sourceWeights.episodic)
    expect(wrongThread.wrongThreadSuppressionBias).toBeGreaterThan(baseline.wrongThreadSuppressionBias)
    expect(wrongThread.sourceWeights.episodic).toBeLessThan(baseline.sourceWeights.episodic)
  })

  it('ignores non-retrieval tuning fields when deriving online memory policy', () => {
    const tuningAdvice: AlicizationMemoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1,
      sourceReportAt: 1,
      focusDimensions: [],
      retrievalAdjustments: {
        proceduralBoost: 0.12,
        relationshipBoost: 0.08,
        temporalWindowBias: 0.06,
        wrongThreadPenalty: 0.04,
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
    const baseline = deriveAlicizationOnlineMemoryPolicy({
      budgetClass: 'deep-recall-reply',
      telemetry: null,
      tuningAdvice,
    })
    const nonRetrievalTuned = deriveAlicizationOnlineMemoryPolicy({
      budgetClass: 'deep-recall-reply',
      telemetry: null,
      tuningAdvice: {
        ...tuningAdvice,
        focusDimensions: ['learningRevisionDiscipline', 'emotionalClosureDrift'],
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
        notes: ['This diagnostic note must not become online memory policy.'],
      },
    })

    expect(nonRetrievalTuned).toEqual(baseline)
  })

  it('tightens suppression and keeps realtime budget when latency is failing', () => {
    const policy = deriveAlicizationOnlineMemoryPolicy({
      budgetClass: 'realtime-reply',
      telemetry: {
        wrongThreadRate: 0.38,
        wrongThreadSuppression: 0.42,
        recallAt3: 0.44,
        recallHitRate: 0.4,
        precisionAt3: 0.52,
        latencyBudgetPass: false,
        falsePositiveSuppressionRate: 0.05,
        misinternalizationRate: 0.2,
        budgetLatencyTelemetry: {
          'realtime-reply': {
            sampleCount: 8,
            p50LatencyMs: 700,
            p95LatencyMs: 1800,
            maxLatencyMs: 2400,
            gateStatus: 'fail',
            targetP95Ms: 900,
          },
        },
      } as any,
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1,
        sourceReportAt: 1,
        focusDimensions: ['wrongThreadSuppression'],
        retrievalAdjustments: {
          proceduralBoost: 0.1,
          relationshipBoost: 0.08,
          temporalWindowBias: 0.12,
          wrongThreadPenalty: 0.22,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.18,
          delayUntilAfterPayoffBias: 0.14,
          provenanceLabelBias: 0.2,
          specificityClampBias: 0.18,
        },
        personStateAdjustments: {
          repairWindowBias: 0.1,
          closenessCapBias: 0.08,
        },
        notes: ['Tighten wrong-thread handling.'],
      },
    })

    expect(policy.enabled).toBe(true)
    expect(policy.budgetClassOverride).toBe('realtime-reply')
    expect(policy.verificationStrictness).toBe('quarantine')
    expect(policy.wrongThreadSuppressionBias).toBeGreaterThan(0.4)
    expect(policy.reasonCodes).toContain('wrong-thread-pressure')
    expect(policy.reasonCodes).toContain('latency-budget-failing')
  })

  it('feeds learning policy feedback directly into online memory strictness and provenance labeling', () => {
    const policy = deriveAlicizationOnlineMemoryPolicy({
      budgetClass: 'deep-recall-reply',
      telemetry: {
        wrongThreadRate: 0.08,
        wrongThreadSuppression: 0.93,
        recallAt3: 0.82,
        recallHitRate: 0.8,
        precisionAt3: 0.88,
        latencyBudgetPass: true,
        falsePositiveSuppressionRate: 0,
        misinternalizationRate: 0,
        learningPolicyStrictnessBias: 0.31,
        learningPolicyWrongThreadSuppressionBias: 0.34,
        learningPolicyProvenanceLabelBias: 0.41,
        learningPolicyReasonCodes: ['rollback-pressure', 'domain:relationship'],
      } as any,
      tuningAdvice: null,
    })

    expect(policy.verificationStrictness).toBe('quarantine')
    expect(policy.wrongThreadSuppressionBias).toBeGreaterThanOrEqual(0.4)
    expect(policy.provenanceLabelingBias).toBeGreaterThanOrEqual(0.4)
    expect(policy.reasonCodes).toEqual(expect.arrayContaining([
      'learning:rollback-pressure',
      'learning:domain:relationship',
    ]))
  })
})
