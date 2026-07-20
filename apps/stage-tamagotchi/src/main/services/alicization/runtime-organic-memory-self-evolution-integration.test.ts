import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import { describe, expect, it } from 'vitest'

import { buildAlicizationEmotionalTransitionLedger } from './emotional-ledger'
import { buildOrganicMemoryEvolutionState } from './runtime-organic-memory-self-evolution-integration'
import { buildAlicizationEmotionalSelfRevisionStatePatch } from './self-evolution/emotional-self-revision-bridge'

const historicalSelfRevisionTelemetry = {
  version: 'memory-stats-v1',
  total: 0,
  active: 0,
  archived: 0,
  lastPrunedAt: null,
  retrievalHealth: {
    semanticLatencyMs: null,
    graphLatencyMs: null,
    templateLeakageFailCount: 0,
    reconstructionFrequency: 0,
    reconstructedCount: 0,
    selfRevisionPatchCount: 3,
    selfRevisionMemoryPolicyBias: 0.82,
    selfRevisionRelationshipPostureBias: 0.68,
    selfRevisionResponsePostureBias: 0.74,
    selfRevisionProactivePolicyBias: 0.61,
    selfRevisionValidationBias: 1,
    selfRevisionReasonCodes: ['domain:self-model'],
  },
} as any

const activeSelfRevisionPatch: AlicizationSelfRevisionStatePatch = {
  version: 'self-revision-state-patch-v1',
  id: 'patch-active-1',
  sourceEventId: 'event-active-1',
  sourceTurnId: 'turn-active-1',
  decisionTraceId: 'trace-active-1',
  domain: 'self-model',
  action: 'revise',
  resultStatus: 'completed',
  lanes: ['memory-policy', 'response-posture', 'rollback-validation'],
  memoryPolicy: {
    strictnessBias: 0.82,
    wrongThreadSuppressionBias: 0.58,
    provenanceLabelBias: 0.64,
    recallExpansionBias: 0.14,
    shouldQuarantineUnsupportedCarry: true,
  },
  relationshipPosture: {
    repairWindowBias: 0.44,
    closenessCapBias: 0.26,
    warmthReleaseBias: 0,
  },
  responsePosture: {
    hypothesisLabelBias: 0.36,
    specificityClampBias: 0.62,
    templateShellSuppressionBias: 0.52,
  },
  proactivePolicy: {
    restraintBias: 0.61,
    learningProposalBias: 0.12,
    actuationCooldownBias: 0.47,
  },
  validation: {
    requiresRollbackCheck: true,
    requiresRevalidation: true,
    rollbackPlan: ['rollback-to-pre-revision-posture'],
  },
  reasonCodes: ['domain:self-model', 'rollback-validation-required'],
  projectStateContinuity: null,
  summary: 'Do not let unverified self-model revisions drift into durable identity.',
}

describe('runtime organic memory self evolution integration', () => {
  it('does not turn replay tuning focus into derived causality repair pressure', () => {
    const result = buildOrganicMemoryEvolutionState({
      producedAt: 100,
      retrievedFacts: [],
      proceduralMemories: [],
      hostPersonModel: null,
      recollectionIntent: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      personStateProjection: null,
      memoryTuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 100,
        sourceReportAt: 90,
        focusDimensions: [
          'runtimeMemoryClosureCausalIdentity',
          'runtimeSameHerInitiativeExecutionCausality',
          'runtimeSameHerEmotionalCausality',
          'runtimeSameHerEmbodimentCausality',
        ],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.12,
          temporalWindowBias: 0.04,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.14,
          delayUntilAfterPayoffBias: 0.14,
          provenanceLabelBias: 0.04,
          specificityClampBias: 0,
        },
        personStateAdjustments: {
          repairWindowBias: 0.04,
          closenessCapBias: 0.07,
        },
        notes: ['Replay focus is diagnostic data, not reply or action governance.'],
      },
    } as any)

    expect(result.derivedMindStateBundle.sameHerCausalityRepairPressure).toBeNull()
  })

  it('does not let historical self-revision telemetry alone alter the long-horizon self-evolution kernel', () => {
    const result = buildOrganicMemoryEvolutionState({
      producedAt: 100,
      retrievedFacts: [],
      proceduralMemories: [],
      hostPersonModel: null,
      memoryStats: historicalSelfRevisionTelemetry,
      recollectionIntent: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      personStateProjection: null,
    })

    expect(result.selfEvolution).toBeNull()
  })

  it('treats the active self-revision patch as the authority for long-horizon self-evolution pressure', () => {
    const result = buildOrganicMemoryEvolutionState({
      producedAt: 100,
      retrievedFacts: [],
      proceduralMemories: [],
      hostPersonModel: null,
      memoryStats: historicalSelfRevisionTelemetry,
      recollectionIntent: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      personStateProjection: null,
      activeSelfEvolutionCandidateId: 'candidate-self-evolution-1',
      activeSelfRevisionPatch,
    })

    expect(result.selfEvolution).toEqual(expect.objectContaining({
      activeLearningFocuses: expect.arrayContaining(['self-revision-policy-feedback']),
      sourceSignals: expect.arrayContaining(['self-revision:domain:self-model']),
    }))
    expect(
      result.selfEvolution?.sourceSignals?.some(signal =>
        signal.includes('visible proactive hold')
        && signal.includes('subconscious carry')
        && signal.includes('next-session feedback carry'),
      ),
    ).toBe(false)
    expect(result.derivedMindStateBundle).toEqual(expect.objectContaining({
      activeSelfRevision: expect.objectContaining({
        candidateId: 'candidate-self-evolution-1',
        patchId: 'patch-active-1',
        patchDecisionTraceId: 'trace-active-1',
        lanes: expect.arrayContaining(['memory-policy', 'response-posture', 'rollback-validation']),
        reasonCodes: expect.arrayContaining(['domain:self-model', 'rollback-validation-required']),
        summary: 'Do not let unverified self-model revisions drift into durable identity.',
      }),
    }))
  })

  it('keeps legacy repair revision ids without applying project continuity policy bias', () => {
    const ledger = buildAlicizationEmotionalTransitionLedger({
      createdAt: 120_000,
      previous: null,
      next: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'repair-tension',
        initiativeMode: 'repair',
        memoryRecallMode: 'repair-grounding',
        embodimentTone: 'repair-before-closeness',
        valence: 0.24,
        arousal: 0.66,
        guardedness: 0.72,
        closenessDrive: 0.18,
        repairNeed: 0.86,
        initiativePressure: 0.14,
        reasonTags: ['repair-before-closeness', 'confirmation-boundary'],
        why: 'Repair should settle before closeness widens again.',
      },
      source: {
        turnId: 'turn-emotion-repair-1',
        sourceTags: ['affective-residue', 'project-state'],
      },
    })

    const emotionalPatch = buildAlicizationEmotionalSelfRevisionStatePatch({
      ledger,
      decisionTraceId: 'trace-emotion-repair-1',
      projectStateContinuity: {
        sameHerSelfLine: 'legacy phase-one template, repair first before closeness.',
        sameHerDriftRisk: 'Without this bridge, repair emotion remains replay text instead of shaping the identity-continuity',
        proactiveSameHerGap: 'Future proactive returns must stay quieter until the repair line cools.',
        emotionalClosureCue: 'Keep repair-before-closeness active across memory, initiative, and body.',
        sameHerHoldDetail: 'Hold warmth behind repair until the seam settles.',
        continuityGuard: 'Do not reopen from a generic helper shell while repair is active.',
      },
    })

    expect(emotionalPatch).toEqual(expect.objectContaining({
      version: 'self-revision-state-patch-v1',
      id: 'emotional-transition:turn-emotion-repair-1:120000:state-patch',
      sourceTurnId: 'turn-emotion-repair-1',
      decisionTraceId: 'trace-emotion-repair-1',
      domain: 'dialogue-style',
      action: 'hold',
      resultStatus: 'completed',
      lanes: expect.arrayContaining(['relationship-posture', 'response-posture', 'proactive-policy']),
      reasonCodes: expect.arrayContaining([
        'emotion-transition:repair-shift',
        'emotion-candidate:repair-before-closeness',
        'emotion-candidate:continue-repair-first',
        'emotion-memory:relationship-repair',
        'emotion-initiative:repair-first',
        'emotion-embodiment:repair-before-closeness',
        'emotion-decay:hold-until-repair-cools',
        'emotion-decay-ttl:1800000',
        'same-her-emotional-closure-carry-active',
      ]),
    }))
    expect(emotionalPatch?.relationshipPosture.repairWindowBias).toBeGreaterThan(0.4)
    expect(emotionalPatch?.relationshipPosture.closenessCapBias).toBeGreaterThan(0.4)
    expect(emotionalPatch?.proactivePolicy.restraintBias).toBeGreaterThan(0.4)
    expect(emotionalPatch?.proactivePolicy.actuationCooldownBias).toBeGreaterThan(0.4)
    expect(emotionalPatch?.summary).toContain('decay hold-until-repair-cools holds for 1800000ms')
    expect(emotionalPatch?.projectStateContinuity?.continuityGuard).toContain('expires at 1920000')
    expect(emotionalPatch?.projectStateContinuity?.continuityPressure).toBeGreaterThan(0.8)

    const result = buildOrganicMemoryEvolutionState({
      producedAt: 120_000,
      retrievedFacts: [],
      proceduralMemories: [],
      hostPersonModel: null,
      recollectionIntent: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      personStateProjection: null,
      activeSelfEvolutionCandidateId: 'emotion-repair-baseline',
      activeSelfRevisionPatch: emotionalPatch,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'emotion-repair-baseline',
        patchId: emotionalPatch?.id ?? null,
        decisionTraceId: emotionalPatch?.decisionTraceId ?? null,
        summary: emotionalPatch?.summary ?? null,
        lanes: emotionalPatch?.lanes ?? [],
        reasonCodes: emotionalPatch?.reasonCodes ?? [],
      },
    })

    expect(result.selfEvolution).toBeNull()
    expect(result.derivedMindStateBundle.activeSelfRevision).toEqual(expect.objectContaining({
      candidateId: 'emotion-repair-baseline',
      patchId: emotionalPatch?.id,
      patchDecisionTraceId: 'trace-emotion-repair-1',
      lanes: expect.arrayContaining(['relationship-posture', 'response-posture', 'proactive-policy']),
      reasonCodes: [],
      summary: null,
    }))
    expect(result.derivedMindStateBundle.activeContinuityGovernance).toBeNull()
    expect(JSON.stringify(result)).not.toMatch(/Future proactive returns must stay quieter|Keep repair-before-closeness active|same-her/iu)
  })
})
