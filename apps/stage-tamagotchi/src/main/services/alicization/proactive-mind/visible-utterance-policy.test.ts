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
          secondPassRequiredBias: 0,
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
          secondPassRequiredBias: 0,
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
        reasonCodes: ['domain:relationship', 'remembered-familiarity-restraint'],
        summary: 'remembered familiarity should stay explicitly remembered before visible closeness widens again',
      },
    })

    expect(decision.shouldPersistVisibleUtterance).toBe(false)
    expect(decision.requiresMindAuthoredText).toBe(true)
    expect(decision.action).toBe('hold')
    expect(decision.reason).toBe('active-self-revision-remembered-familiarity-restraint-holds-visible-utterance')
  })
})
