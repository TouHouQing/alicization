import { describe, expect, it } from 'vitest'

import { buildAlicizationSelfRevisionStatePatch } from './state-revision-bus'

describe('state-revision-bus', () => {
  it('turns verified learning revision events into policy-consuming state patches', () => {
    const emotionalClosureCue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.'
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'
    const sameHerHoldDetail = 'same-her hold: keep this delayed learning carry on the same living line before later retries widen into generic verification bookkeeping.'
    const patch = buildAlicizationSelfRevisionStatePatch({
      event: {
        version: 'self-revision-event-v1',
        id: 'learning:relationship:verify:completed',
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-1',
        domain: 'relationship',
        taskAction: 'verify',
        resultStatus: 'downgraded',
        evidence: {
          supportCount: 3,
          contradictionCount: 2,
          verificationBasis: ['existing-memory', 'runtime-result'],
        },
        proposedRevision: {
          summary: 'Warmth should wait until repair lands.',
          lifecycleState: 'verification',
          nextLifecycleState: 'rollback-downgrade',
        },
        verifier: {
          status: 'rollback-required',
          mayInternalize: false,
          mayValidateOnly: true,
        },
        projectStateContinuity: {
          sameHerSelfLine: 'one continuous her',
          sameHerDriftRisk: 'If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the same-her continuity that makes her feel alive.',
          proactiveSameHerGap,
          emotionalClosureCue,
          sameHerHoldDetail,
          continuityGuard: 'one continuous her ; If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the same-her continuity that makes her feel alive.',
        },
        appliedTargets: ['fact-1'],
        rollbackPlan: ['revisit-contradiction-heavy-targets'],
      },
      policyFeedback: {
        strictnessBias: 0.22,
        wrongThreadSuppressionBias: 0.18,
        provenanceLabelBias: 0.12,
        reasonCodes: ['state:verification', 'rollback-pressure', 'domain:relationship'],
      },
    })

    expect(patch.version).toBe('self-revision-state-patch-v1')
    expect(patch.lanes).toEqual(expect.arrayContaining([
      'memory-policy',
      'relationship-posture',
      'response-posture',
      'rollback-validation',
    ]))
    expect(patch.memoryPolicy.shouldQuarantineUnsupportedCarry).toBe(true)
    expect(patch.relationshipPosture.repairWindowBias).toBeGreaterThan(0)
    expect(patch.responsePosture.secondPassRequiredBias).toBeGreaterThan(0)
    expect(patch.responsePosture.templateShellSuppressionBias).toBeGreaterThan(0.2)
    expect(patch.validation.requiresRollbackCheck).toBe(true)
    expect(patch.projectStateContinuity).toEqual(expect.objectContaining({
      sameHerSelfLine: 'one continuous her',
      proactiveSameHerGap,
      emotionalClosureCue,
      sameHerHoldDetail,
      continuityPressure: expect.any(Number),
    }))
    expect(patch.reasonCodes).toEqual(expect.arrayContaining([
      'domain:relationship',
      'rollback-validation-required',
      'policy:rollback-pressure',
      'same-her-self-line-active',
      'same-her-anti-shell-guard-active',
      'same-her-proactive-gap-active',
      'same-her-emotional-closure-carry-active',
      'same-her-hold-detail-active',
    ]))
  })

  it('keeps world-model validate-only outcomes in revalidation and provenance-label policy lanes', () => {
    const patch = buildAlicizationSelfRevisionStatePatch({
      event: {
        version: 'self-revision-event-v1',
        id: 'learning:world-model:internalize:blocked',
        sourceTurnId: 'turn-2',
        decisionTraceId: 'trace-2',
        domain: 'world-model',
        taskAction: 'internalize',
        resultStatus: 'blocked',
        evidence: {
          supportCount: 1,
          contradictionCount: 0,
          verificationBasis: ['trusted-source'],
        },
        proposedRevision: {
          summary: 'External API shape needs revalidation.',
          lifecycleState: 'revalidation',
          nextLifecycleState: 'revalidation',
        },
        verifier: {
          status: 'validated',
          mayInternalize: false,
          mayValidateOnly: true,
        },
        projectStateContinuity: null,
        appliedTargets: ['fact-world-1'],
        rollbackPlan: ['retry-after-stronger-evidence'],
      },
      policyFeedback: null,
    })

    expect(patch.lanes).toEqual(expect.arrayContaining([
      'memory-policy',
      'response-posture',
      'rollback-validation',
    ]))
    expect(patch.validation.requiresRevalidation).toBe(true)
    expect(patch.memoryPolicy.provenanceLabelBias).toBeGreaterThan(0.2)
    expect(patch.responsePosture.hypothesisLabelBias).toBeGreaterThan(0.2)
    expect(patch.reasonCodes).toContain('world-model-revalidation-required')
  })

  it('keeps proactive same-her gap as continuity pressure even when older same-her carry fields are absent', () => {
    const proactiveSameHerGap = 'Delayed learning still needs to carry the same-her line across later retries instead of falling back to generic scheduler bookkeeping.'
    const patch = buildAlicizationSelfRevisionStatePatch({
      event: {
        version: 'self-revision-event-v1',
        id: 'learning:proactive-policy:record:completed',
        sourceTurnId: 'turn-3',
        decisionTraceId: 'trace-3',
        domain: 'proactive-policy',
        taskAction: 'record',
        resultStatus: 'completed',
        evidence: {
          supportCount: 2,
          contradictionCount: 0,
          verificationBasis: ['existing-memory'],
        },
        proposedRevision: {
          summary: 'Keep proactive same-her carry explicit across later retries.',
          lifecycleState: 'verifying',
          nextLifecycleState: 'settled',
        },
        verifier: {
          status: 'validated',
          mayInternalize: true,
          mayValidateOnly: false,
        },
        projectStateContinuity: {
          sameHerSelfLine: null,
          sameHerDriftRisk: null,
          proactiveSameHerGap,
          emotionalClosureCue: null,
          continuityGuard: null,
        },
        appliedTargets: ['fact-proactive-1'],
        rollbackPlan: [],
      },
      policyFeedback: null,
    })

    expect(patch.projectStateContinuity).toEqual({
      sameHerSelfLine: null,
      sameHerDriftRisk: null,
      proactiveSameHerGap,
      emotionalClosureCue: null,
      sameHerHoldDetail: null,
      continuityGuard: null,
      continuityPressure: expect.any(Number),
    })
    expect(patch.projectStateContinuity?.continuityPressure).toBeGreaterThan(0.1)
    expect(patch.reasonCodes).toContain('same-her-proactive-gap-active')
    expect(patch.responsePosture.templateShellSuppressionBias).toBeGreaterThan(0.1)
  })
})
