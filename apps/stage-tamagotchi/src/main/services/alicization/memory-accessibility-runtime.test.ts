import { describe, expect, it } from 'vitest'

import {
  buildAlicizationMemoryAccessCacheKey,
  buildAlicizationMemoryAccessibilityPlan,
  buildAlicizationTurnRetrievalPolicySnapshot,
  tuneMemoryConsolidationSearchInput,
} from './memory-accessibility-runtime'
import { deriveAlicizationOnlineMemoryPolicy } from './memory-policy-governor'

describe('memory-accessibility-runtime', () => {
  it('builds a deep-thread accessibility plan for long-horizon task migration recall', () => {
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: '换了这么久，这种活你还是会沿旧方法接吗',
      recallGovernor: {
        recollectionIntent: {
          mode: 'experience-pattern',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['旧方法', '接回去'],
          rationale: 'Task migration should reopen prior procedure continuity.',
          confidence: 0.82,
        },
        threadAnchors: ['runtime seam'],
      } as any,
    })

    expect(plan.latencyClass).toBe('deep')
    expect(plan.expansionMode).toBe('deep-thread')
    expect(plan.episodicLimit).toBeGreaterThan(5)
    expect(plan.preferredLayers[0]).toBe('hot-index')
    expect(plan.prewarmKey).toContain('runtime seam')
    expect(plan.recallLatencyPolicy).toEqual(expect.objectContaining({
      version: 'recall-latency-policy-v1',
      recallAction: 'deep-recall',
      shouldPrefetch: true,
    }))
  })

  it('uses latency policy to guard stable core when wrong-thread risk is high', () => {
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: '你之前是不是也是这样',
      recallGovernor: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: false,
          queryHints: ['之前'],
          rationale: 'Relationship history may be relevant but risky.',
          confidence: 0.58,
        },
      } as any,
      latencyPolicy: {
        wrongThreadRate: 0.55,
        clusterAmbiguous: true,
        stableCoreCount: 2,
        unsafeDetailCount: 2,
        shouldRecall: true,
        finalSurfacePolicy: 'internal-only',
      },
    })

    expect(plan.recallLatencyPolicy.recallAction).toBe('stable-core-only')
    expect(plan.recallLatencyPolicy.shouldAvoidDeepExpansion).toBe(true)
    expect(plan.conversationLimit).toBeLessThanOrEqual(6)
  })

  it('builds a summary-first plan for lighter dialogue recall', () => {
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: '前几天我们聊过什么',
      recallGovernor: {
        recollectionIntent: {
          mode: 'conversation-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: false,
          queryHints: ['聊过什么'],
          rationale: 'Conversation history can start summary-first.',
          confidence: 0.7,
        },
      } as any,
    })

    expect(plan.expansionMode).toBe('deep-thread')
    expect(buildAlicizationMemoryAccessCacheKey({
      namespace: 'conversation',
      recallSeed: '前几天我们聊过什么',
      plan,
    })).toContain('conversation')
  })

  it('biases continuity arc hold toward summary-first retrieval so the line stays gentle before reopening', () => {
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: 'mirror_runtime_continuity: stage=hold-for-opening loop=dialogue handoff=active-dialogue',
      recallGovernor: {
        recollectionIntent: {
          mode: 'conversation-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: false,
          queryHints: ['hold-for-opening'],
          rationale: 'Keep the same line warm without widening too fast.',
          confidence: 0.76,
        },
      } as any,
    })

    expect(plan.expansionMode).toBe('summary-first')
    expect(plan.preferredLayers[0]).toBe('summary-layer')
  })

  it('biases continuity arc gentle reopen toward deep-thread retrieval so the same line can be re-entered coherently', () => {
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: 'mirror_runtime_continuity: stage=gentle-reopen loop=dialogue handoff=active-dialogue',
      recallGovernor: {
        recollectionIntent: {
          mode: 'conversation-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: true,
          queryHints: ['gentle-reopen'],
          rationale: 'Re-enter the same living line instead of summarizing it away.',
          confidence: 0.8,
        },
      } as any,
    })

    expect(plan.expansionMode).toBe('deep-thread')
    expect(plan.preferredLayers[0]).toBe('hot-index')
  })

  it('biases same-thread continuation toward balanced retrieval so the line can continue without over-expanding', () => {
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: 'mirror_runtime_continuity: stage=same-thread-continuation loop=dialogue handoff=active-dialogue',
      recallGovernor: {
        recollectionIntent: {
          mode: 'conversation-history',
          temporalFocus: 'recent',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: false,
          queryHints: ['same-thread-continuation'],
          rationale: 'Continue the current line without resetting or digging too far outward.',
          confidence: 0.74,
        },
      } as any,
    })

    expect(plan.expansionMode).toBe('balanced')
    expect(plan.preferredLayers[0]).toBe('summary-layer')
  })

  it('tunes consolidation search input from the plan', () => {
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: '继续按之前那样修这个 runtime seam',
      recallGovernor: null,
    })
    const searchInput = tuneMemoryConsolidationSearchInput({
      query: '继续按之前那样修这个 runtime seam',
      plan,
      recollectionIntent: null,
    })

    expect(searchInput.limit).toBe(plan.consolidationLimit)
    expect(searchInput.query).toContain('runtime seam')
  })

  it('applies the online memory policy back into retrieval budget, strictness, and cache strategy', () => {
    const policy = deriveAlicizationOnlineMemoryPolicy({
      budgetClass: 'realtime-reply',
      telemetry: {
        wrongThreadRate: 0.41,
        wrongThreadSuppression: 0.44,
        recallAt3: 0.46,
        recallHitRate: 0.42,
        precisionAt3: 0.58,
        latencyBudgetPass: false,
        falsePositiveSuppressionRate: 0.08,
        misinternalizationRate: 0.16,
        budgetLatencyTelemetry: {
          'realtime-reply': {
            sampleCount: 8,
            p50LatencyMs: 680,
            p95LatencyMs: 1820,
            maxLatencyMs: 2350,
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
          proceduralBoost: 0.18,
          relationshipBoost: 0.1,
          temporalWindowBias: 0.14,
          wrongThreadPenalty: 0.2,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.1,
          delayUntilAfterPayoffBias: 0.12,
          provenanceLabelBias: 0.22,
          specificityClampBias: 0.16,
        },
        personStateAdjustments: {
          repairWindowBias: 0.08,
          closenessCapBias: 0.06,
        },
        notes: ['Tighten wrong-thread suppression while holding latency.'],
      },
    })
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: '几个月后再回来，这条 repair seam 还该不该接',
      recallGovernor: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: true,
          queryHints: ['repair seam', '几个月后'],
          rationale: 'Long-horizon repair recall still needs bounded reopening.',
          confidence: 0.78,
        },
        threadAnchors: ['repair seam'],
      } as any,
      budgetClass: 'realtime-reply',
      policy,
    })

    expect(policy.reasonCodes).toContain('latency-budget-failing')
    expect(plan.budgetClass).toBe('realtime-reply')
    expect(plan.verificationStrictness).toBe('quarantine')
    expect(plan.wrongThreadSuppressionBias).toBeGreaterThan(0.4)
    expect(plan.provenanceLabelingBias).toBe(0.3)
    expect(plan.cacheTtlMs).toBeGreaterThan(20_000)
    expect(plan.consolidationLimit).toBeGreaterThanOrEqual(4)
    expect(plan.recallLatencyPolicy.budgetClass).toBe('realtime-reply')
  })

  it('uses temporal window bias to expand the episodic retrieval budget', () => {
    const snapshotFor = (temporalWindowBias: number) => buildAlicizationTurnRetrievalPolicySnapshot({
      recallSeed: '回想几个月前那次 runtime seam 是怎么接回来的',
      recallGovernor: null,
      budgetClass: 'deep-recall-reply',
      telemetry: null,
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1,
        sourceReportAt: 1,
        focusDimensions: [],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0,
          temporalWindowBias,
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
      },
    })
    const baseline = snapshotFor(0)
    const temporallyExpanded = snapshotFor(0.4)

    expect(temporallyExpanded.policy.sourceWeights.episodic).toBeGreaterThan(baseline.policy.sourceWeights.episodic)
    expect(temporallyExpanded.plan.episodicLimit).toBeGreaterThan(baseline.plan.episodicLimit)
  })

  it('builds a single turn retrieval policy snapshot for repeated recall surfaces', () => {
    const snapshot = buildAlicizationTurnRetrievalPolicySnapshot({
      recallSeed: '继续沿着之前的 runtime seam 修',
      recallGovernor: {
        recollectionIntent: {
          mode: 'experience-pattern',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: true,
          queryHints: ['runtime seam'],
          rationale: 'Use one retrieval policy for every surface in this turn.',
          confidence: 0.82,
        },
        threadAnchors: ['runtime seam'],
      } as any,
      budgetClass: 'realtime-reply',
      telemetry: {
        recallAt3: 0.42,
        recallHitRate: 0.4,
        precisionAt3: 0.88,
        wrongThreadRate: 0.05,
        wrongThreadSuppression: 0.96,
        latencyBudgetPass: true,
        learningPolicyStrictnessBias: 0.18,
        learningPolicyWrongThreadSuppressionBias: 0.21,
        learningPolicyProvenanceLabelBias: 0.24,
        learningPolicyReasonCodes: ['state:verification'],
      } as any,
      tuningAdvice: null,
    })
    const reusedPlan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: '继续沿着之前的 runtime seam 修',
      recallGovernor: {
        recollectionIntent: {
          mode: 'experience-pattern',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: true,
          queryHints: ['runtime seam'],
          rationale: 'Use one retrieval policy for every surface in this turn.',
          confidence: 0.82,
        },
        threadAnchors: ['runtime seam'],
      } as any,
      budgetClass: 'realtime-reply',
      policy: snapshot.policy,
    })

    expect(snapshot.policy.reasonCodes).toContain('learning:state:verification')
    expect(snapshot.plan.verificationStrictness).toBe('strict')
    expect(reusedPlan).toEqual(snapshot.plan)
  })

  it('applies active self-revision memory policy into turn retrieval policy', () => {
    const snapshot = buildAlicizationTurnRetrievalPolicySnapshot({
      recallSeed: '这条旧关系线现在还能不能接着用',
      budgetClass: 'realtime-reply',
      activeSelfEvolutionCandidateId: 'candidate-relationship-1',
      telemetry: {
        recallAt3: 0.88,
        recallHitRate: 0.82,
        precisionAt3: 0.9,
        wrongThreadRate: 0.02,
        wrongThreadSuppression: 0.96,
        latencyBudgetPass: true,
      } as any,
      tuningAdvice: null,
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'revision-1',
        sourceEventId: 'event-1',
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-1',
        domain: 'relationship',
        action: 'internalize',
        resultStatus: 'completed',
        lanes: ['memory-policy', 'relationship-posture', 'response-posture'],
        memoryPolicy: {
          strictnessBias: 0.32,
          wrongThreadSuppressionBias: 0.44,
          provenanceLabelBias: 0.38,
          recallExpansionBias: 0.26,
          shouldQuarantineUnsupportedCarry: true,
        },
        relationshipPosture: {
          repairWindowBias: 0.12,
          closenessCapBias: 0.1,
          warmthReleaseBias: 0,
        },
        responsePosture: {
          secondPassRequiredBias: 0.18,
          hypothesisLabelBias: 0.16,
          specificityClampBias: 0.22,
          templateShellSuppressionBias: 0.28,
        },
        proactivePolicy: {
          restraintBias: 0.16,
          learningProposalBias: 0.08,
          actuationCooldownBias: 0.12,
        },
        validation: {
          requiresRollbackCheck: true,
          requiresRevalidation: false,
          rollbackPlan: ['revalidate-old-relationship-line'],
        },
        projectStateContinuity: null,
        reasonCodes: ['quarantine-unsupported-carry'],
        summary: 'Old relationship line needs provenance before visible reuse.',
      },
    })

    expect(snapshot.policy.verificationStrictness).toBe('quarantine')
    expect(snapshot.policy.wrongThreadSuppressionBias).toBeGreaterThan(0.2)
    expect(snapshot.policy.provenanceLabelingBias).toBeGreaterThan(0.2)
    expect(snapshot.policy.reasonCodes).toContain('self-revision-memory-policy-active')
    expect(snapshot.selfRevisionPatch?.id).toBe('revision-1')
    expect(snapshot.activeSelfEvolutionCandidateId).toBe('candidate-relationship-1')
    expect(snapshot.plan.verificationStrictness).toBe('quarantine')
  })
})
