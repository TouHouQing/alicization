import { describe, expect, it } from 'vitest'

import { deriveAlicizationRecallLatencyPolicy } from './alicization-recall-latency-policy'

describe('alicization-recall-latency-policy', () => {
  it('chooses deep recall for long-horizon procedure continuity with low risk', () => {
    const policy = deriveAlicizationRecallLatencyPolicy({
      recallSeed: '继续按之前那个 runtime seam 的修法接回去',
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime seam'],
        rationale: 'Continue the remembered procedure line.',
        confidence: 0.84,
      },
      contradictionCount: 0,
      validationCount: 3,
      stronglyValidatedProcedureCount: 2,
      shouldRecall: true,
    })

    expect(policy.recallAction).toBe('deep-recall')
    expect(policy.latencyClass).toBe('deep')
    expect(policy.domainBudgets[0]?.domain).toBe('procedure')
    expect(policy.shouldPrefetch).toBe(true)
  })

  it('falls back to stable core or defer when reliability is under pressure', () => {
    const policy = deriveAlicizationRecallLatencyPolicy({
      recallSeed: '你之前是不是也是这样想的',
      recollectionIntent: {
        mode: 'autobiographical-history',
        temporalFocus: 'cross-session',
        searchEpisodes: true,
        searchConversations: true,
        searchProceduralExperience: false,
        queryHints: ['之前'],
        rationale: 'Older self line is being probed.',
        confidence: 0.6,
      },
      wrongThreadRate: 0.42,
      recallMissRate: 0.3,
      reconstructionErrorRate: 0.35,
      memorySurfaceViolationRate: 0.18,
      clusterAmbiguous: true,
      competingVariantCount: 3,
      contradictionCount: 3,
      contradictionHeavyFactCount: 2,
      stableCoreCount: 2,
      unsafeDetailCount: 3,
      shouldRecall: true,
      finalSurfacePolicy: 'internal-only',
    })

    expect(['stable-core-only', 'defer-to-followup']).toContain(policy.recallAction)
    expect(policy.shouldAvoidDeepExpansion).toBe(true)
    expect(policy.degradeReason).toBeTruthy()
  })
})
