import { describe, expect, it } from 'vitest'

import { decideAlicizationProactiveVisibleUtterance } from './visible-utterance-policy'

describe('proactive visible utterance policy', () => {
  it('requeues proactive visible text when provider mind did not author it', () => {
    const decision = decideAlicizationProactiveVisibleUtterance({
      hasMindAuthoredStructured: false,
    })

    expect(decision.shouldPersistVisibleUtterance).toBe(false)
    expect(decision.requiresMindAuthoredText).toBe(true)
    expect(decision.action).toBe('requeue')
  })

  it('allows provider-authored proactive text to persist', () => {
    const decision = decideAlicizationProactiveVisibleUtterance({
      hasMindAuthoredStructured: true,
    })

    expect(decision.shouldPersistVisibleUtterance).toBe(true)
    expect(decision.action).toBe('persist')
  })

  it('holds explicitly whitelisted deterministic continuity instead of persisting visible speech', () => {
    const decision = decideAlicizationProactiveVisibleUtterance({
      hasMindAuthoredStructured: false,
      allowDeterministicVisibleFallback: true,
    })

    expect(decision.shouldPersistVisibleUtterance).toBe(false)
    expect(decision.requiresMindAuthoredText).toBe(true)
    expect(decision.action).toBe('hold')
  })

  it('holds even mind-authored proactive visible text when an active self-revision patch raises proactive restraint', () => {
    const decision = decideAlicizationProactiveVisibleUtterance({
      hasMindAuthoredStructured: true,
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'patch-proactive-hold',
        sourceEventId: 'event-1',
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-1',
        domain: 'proactive-policy',
        action: 'internalize',
        resultStatus: 'completed',
        lanes: ['proactive-policy'],
        memoryPolicy: {
          strictnessBias: 0,
          wrongThreadSuppressionBias: 0,
          provenanceLabelBias: 0,
          recallExpansionBias: 0,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0,
          closenessCapBias: 0,
          warmthReleaseBias: 0,
        },
        responsePosture: {
          hypothesisLabelBias: 0,
          specificityClampBias: 0,
          templateShellSuppressionBias: 0,
        },
        proactivePolicy: {
          restraintBias: 0.6,
          learningProposalBias: 0,
          actuationCooldownBias: 0.18,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: false,
          rollbackPlan: [],
        },
        projectStateContinuity: {
          sameHerSelfLine: 'structured continuity digest.',
          sameHerDriftRisk: 'If proactive speech persists just because text exists, Alicization can sound agentic while losing restrained digital-life continuity.',
          emotionalClosureCue: 'Keep this proactive hold lower-pressure until the continuity state is safe to reopen outward.',
          continuityGuard: 'Hold visible proactive speech as same-her restraint, not as a generic mute switch.',
          continuityPressure: 0.68,
        },
        reasonCodes: ['self-revision-proactive-restraint'],
        summary: 'recent proactive learning says hold visible interruptions briefly',
      },
    })

    expect(decision.shouldPersistVisibleUtterance).toBe(false)
    expect(decision.requiresMindAuthoredText).toBe(true)
    expect(decision.action).toBe('hold')
    expect(decision.reason).toBe('active-self-revision-proactive-restraint-holds-visible-utterance')
  })

  it('holds mind-authored proactive visible text when remembered-familiarity restraint is jointly raised by provenance and closeness learning', () => {
    const decision = decideAlicizationProactiveVisibleUtterance({
      hasMindAuthoredStructured: true,
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'patch-remembered-familiarity-hold',
        sourceEventId: 'event-remembered-familiarity',
        sourceTurnId: 'turn-remembered-familiarity',
        decisionTraceId: 'trace-remembered-familiarity',
        domain: 'relationship',
        action: 'internalize',
        resultStatus: 'completed',
        lanes: ['memory-policy', 'relationship-posture', 'response-posture'],
        memoryPolicy: {
          strictnessBias: 0,
          wrongThreadSuppressionBias: 0,
          provenanceLabelBias: 0.18,
          recallExpansionBias: 0,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0,
          closenessCapBias: 0.2,
          warmthReleaseBias: 0,
        },
        responsePosture: {
          hypothesisLabelBias: 0,
          specificityClampBias: 0,
          templateShellSuppressionBias: 0,
        },
        proactivePolicy: {
          restraintBias: 0,
          learningProposalBias: 0,
          actuationCooldownBias: 0,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: false,
          rollbackPlan: [],
        },
        projectStateContinuity: null,
        reasonCodes: ['domain:relationship', 'remembered-familiarity-restraint'],
        summary: 'remembered familiarity should stay explicitly remembered before visible closeness widens again',
      },
    })

    expect(decision.shouldPersistVisibleUtterance).toBe(false)
    expect(decision.requiresMindAuthoredText).toBe(true)
    expect(decision.action).toBe('hold')
    expect(decision.reason).toBe('active-self-revision-remembered-familiarity-restraint-holds-visible-utterance')
  })

  it('does not hold ordinary proactive visible text just because a non-relationship verify patch also carries provenance and closeness bias', () => {
    const decision = decideAlicizationProactiveVisibleUtterance({
      hasMindAuthoredStructured: true,
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'patch-world-model-verify-visible-ok',
        sourceEventId: 'event-world-model-verify-visible-ok',
        sourceTurnId: 'turn-world-model-verify-visible-ok',
        decisionTraceId: 'trace-world-model-verify-visible-ok',
        domain: 'world-model',
        action: 'verify',
        resultStatus: 'completed',
        lanes: ['memory-policy'],
        memoryPolicy: {
          strictnessBias: 0.24,
          wrongThreadSuppressionBias: 0.42,
          provenanceLabelBias: 0.38,
          recallExpansionBias: 0.2,
          shouldQuarantineUnsupportedCarry: true,
        },
        relationshipPosture: {
          repairWindowBias: 0.18,
          closenessCapBias: 0.14,
          warmthReleaseBias: 0.09,
        },
        responsePosture: {
          hypothesisLabelBias: 0.22,
          specificityClampBias: 0.28,
          templateShellSuppressionBias: 0.24,
        },
        proactivePolicy: {
          restraintBias: 0.12,
          learningProposalBias: 0.2,
          actuationCooldownBias: 0.12,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: true,
          rollbackPlan: [],
        },
        projectStateContinuity: null,
        reasonCodes: ['domain:world-model', 'world-model-revalidation-required'],
        summary: 'World-model carry remains verify-first.',
      },
      reason: 'mind-authored-proactive-utterance',
    })

    expect(decision.shouldPersistVisibleUtterance).toBe(true)
    expect(decision.requiresMindAuthoredText).toBe(true)
    expect(decision.action).toBe('persist')
    expect(decision.reason).toBe('mind-authored-proactive-utterance')
  })

  it('still allows a verify-first world-model proactive nudge to surface as visible speech when it is not a same-her relationship reopening', () => {
    const decision = decideAlicizationProactiveVisibleUtterance({
      hasMindAuthoredStructured: true,
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'patch-world-model-verify-visible-nudge',
        sourceEventId: 'event-world-model-verify-visible-nudge',
        sourceTurnId: 'turn-world-model-verify-visible-nudge',
        decisionTraceId: 'trace-world-model-verify-visible-nudge',
        domain: 'world-model',
        action: 'verify',
        resultStatus: 'completed',
        lanes: ['memory-policy'],
        memoryPolicy: {
          strictnessBias: 0.24,
          wrongThreadSuppressionBias: 0.42,
          provenanceLabelBias: 0.38,
          recallExpansionBias: 0.2,
          shouldQuarantineUnsupportedCarry: true,
        },
        relationshipPosture: {
          repairWindowBias: 0.18,
          closenessCapBias: 0.14,
          warmthReleaseBias: 0.09,
        },
        responsePosture: {
          hypothesisLabelBias: 0.22,
          specificityClampBias: 0.28,
          templateShellSuppressionBias: 0.24,
        },
        proactivePolicy: {
          restraintBias: 0.12,
          learningProposalBias: 0.2,
          actuationCooldownBias: 0.12,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: true,
          rollbackPlan: [],
        },
        projectStateContinuity: null,
        reasonCodes: ['domain:world-model', 'world-model-revalidation-required'],
        summary: 'World-model carry remains verify-first.',
      },
      reason: 'mind-authored-proactive-utterance',
    })

    expect(decision.shouldPersistVisibleUtterance).toBe(true)
    expect(decision.action).toBe('persist')
  })
})
