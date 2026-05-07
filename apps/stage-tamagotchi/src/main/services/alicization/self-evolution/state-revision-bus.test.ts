import { describe, expect, it } from 'vitest'

import { buildAlicizationSelfRevisionStatePatch } from './state-revision-bus'

describe('state-revision-bus', () => {
  it('turns verified learning revision events into policy-consuming state patches', () => {
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
    expect(patch.validation.requiresRollbackCheck).toBe(true)
    expect(patch.reasonCodes).toEqual(expect.arrayContaining([
      'domain:relationship',
      'rollback-validation-required',
      'policy:rollback-pressure',
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
})
