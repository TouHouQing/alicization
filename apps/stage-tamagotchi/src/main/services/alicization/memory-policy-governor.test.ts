import { describe, expect, it } from 'vitest'

import { deriveAlicizationOnlineMemoryPolicy } from './memory-policy-governor'

describe('memory-policy-governor', () => {
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
