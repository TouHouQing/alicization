import { describe, expect, it } from 'vitest'

import { buildAlicizationSelfRevisionStatePatch } from './state-revision-bus'

describe('state-revision-bus', () => {
  it('turns verified learning revision events into policy-consuming state patches', () => {
    const emotionalClosureCue = 'The current late-night workload remains draining, so replies should stay low-pressure until the user has rested.'
    const proactiveSameHerGap = 'Two proactive reminders went unanswered during this coding session, so later retries should stay quiet.'
    const sameHerHoldDetail = 'identity-continuity'
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
          sameHerSelfLine: 'identity continuity',
          sameHerDriftRisk: 'If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the identity-continuity',
          proactiveSameHerGap,
          emotionalClosureCue,
          sameHerHoldDetail,
          continuityGuard: 'identity continuity ; If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the identity-continuity',
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
    expect(patch.responsePosture).not.toHaveProperty('secondPassRequiredBias')
    expect(patch.responsePosture.templateShellSuppressionBias).toBeGreaterThan(0.2)
    expect(patch.validation.requiresRollbackCheck).toBe(true)
    expect(patch.projectStateContinuity).toBeNull()
    expect(patch.reasonCodes).toEqual(expect.arrayContaining([
      'domain:relationship',
      'rollback-validation-required',
      'policy:rollback-pressure',
    ]))
    expect(patch.reasonCodes).not.toEqual(expect.arrayContaining([
      expect.stringMatching(/^continuity-/u),
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

  it('drops a proactive continuity field when it contains fixed-template residue', () => {
    const proactiveSameHerGap = 'Delayed learning still needs to carry the identity-continuity'
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
          summary: 'Keep proactive identity-continuity',
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

    expect(patch.projectStateContinuity).toBeNull()
    expect(patch.reasonCodes).not.toContain('continuity-proactive-gap-active')
    expect(patch.responsePosture.templateShellSuppressionBias).toBeGreaterThan(0.1)
  })

  it('sanitizes legacy fixed template continuity residue before emitting state patch material', () => {
    const patch = buildAlicizationSelfRevisionStatePatch({
      event: {
        version: 'self-revision-event-v1',
        id: 'learning:self-model:legacy-template-residue',
        sourceTurnId: 'turn-template-residue',
        decisionTraceId: 'trace-template-residue',
        domain: 'self-model',
        taskAction: 'revise',
        resultStatus: 'completed',
        evidence: {
          supportCount: 1,
          contradictionCount: 0,
          verificationBasis: ['legacy-ledger'],
        },
        proposedRevision: {
          summary: 'pre_turn_context_digest',
          lifecycleState: 'verifying',
          nextLifecycleState: 'settled',
        },
        verifier: {
          status: 'validated',
          mayInternalize: true,
          mayValidateOnly: false,
        },
        projectStateContinuity: {
          sameHerSelfLine: 'structured continuity digest.',
          sameHerDriftRisk: 'pre_turn_context_digest',
          proactiveSameHerGap: 'identity-continuity',
          emotionalClosureCue: 'Right now I am still carrying one living her through the identity-continuity',
          sameHerHoldDetail: 'maid mode residue',
          continuityGuard: 'same-her=generic guard prose',
        },
        appliedTargets: [],
        rollbackPlan: [],
      },
      policyFeedback: null,
    })

    const serialized = JSON.stringify(patch)

    expect(patch.projectStateContinuity).toBeNull()
    expect(patch.summary).toBeNull()
    expect(serialized).not.toMatch(/content=excluded|visibility=redacted_internal|Pre-reply|Pre-speech|local-first digital life project|legacy phase-one template|continuity state|identity-continuity/iu)
  })
})
