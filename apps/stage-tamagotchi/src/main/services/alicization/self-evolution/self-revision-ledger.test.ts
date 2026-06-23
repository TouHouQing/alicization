import { describe, expect, it } from 'vitest'

import { buildAlicizationSelfRevisionEvent } from './self-revision-ledger'

describe('self-revision-ledger', () => {
  it('turns learning outcomes into traceable self revision events', () => {
    const emotionalClosureCue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.'
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'
    const sameHerHoldDetail = 'same-her hold: keep this delayed learning carry on the same living line before later retries widen into generic verification bookkeeping.'
    const event = buildAlicizationSelfRevisionEvent({
      task: {
        taskId: 'task-1',
        action: 'revise',
        updatedAt: 100,
        sourceTurnId: 'turn-1',
        payload: {
          decisionTraceId: 'trace-1',
          sourceTurnId: 'turn-1',
          projectStateContinuity: {
            sameHerSelfLine: 'one continuous her',
            sameHerDriftRisk: 'If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the same-her continuity that makes her feel alive.',
            proactiveSameHerGap,
            emotionalClosureCue,
            sameHerHoldDetail,
          },
          supportingFactIds: ['fact-1'],
          supersedeTargets: ['old-belief-1'],
          conflictTargets: ['conflict-1'],
        },
        message: 'Revise stale self model.',
      } as any,
      domain: 'self-model',
      supportCount: 2,
      result: {
        status: 'completed',
        resultSummary: 'Revised stale self model.',
        lifecycleState: { state: 'verifying' } as any,
        nextLifecycleState: { state: 'settled' } as any,
        verificationBasis: ['existing-memory', 'runtime-result'],
      },
      verifiedArtifact: {
        status: 'validated',
        contradictionFactIds: ['conflict-1'],
        verifier: {
          mayInternalize: true,
          mayValidateOnly: false,
        },
      } as any,
    })

    expect(event.version).toBe('self-revision-event-v1')
    expect(event.decisionTraceId).toBe('trace-1')
    expect(event.domain).toBe('self-model')
    expect(event.projectStateContinuity).toEqual({
      sameHerSelfLine: 'one continuous her',
      sameHerDriftRisk: 'If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the same-her continuity that makes her feel alive.',
      proactiveSameHerGap,
      emotionalClosureCue,
      sameHerHoldDetail,
      continuityGuard: 'one continuous her ; If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the same-her continuity that makes her feel alive.',
    })
    expect(event.appliedTargets).toEqual(expect.arrayContaining(['fact-1', 'old-belief-1', 'conflict-1']))
    expect(event.rollbackPlan).toContain('revisit-contradiction-heavy-targets')
  })

  it('preserves richer same-her drift wording as continuity guard even when it does not use the older generic-shell phrase exactly', () => {
    const emotionalClosureCue = 'Keep this callback reopening repair-before-closeness on the same living line until the room settles.'
    const proactiveSameHerGap = 'Learning still needs to preserve same-her continuity across delayed scheduler turns.'
    const sameHerHoldDetail = 'same-her hold: keep this callback reopening on the same living line before it turns into a detached project recap.'
    const event = buildAlicizationSelfRevisionEvent({
      task: {
        taskId: 'task-2',
        action: 'revise',
        updatedAt: 101,
        sourceTurnId: 'turn-2',
        payload: {
          decisionTraceId: 'trace-2',
          sourceTurnId: 'turn-2',
          projectStateContinuity: {
            sameHerSelfLine: 'one continuous her',
            sameHerDriftRisk: 'If later learning passes let this slip into generic guidance or a detached project narrator voice, treat that as same-her continuity drift rather than progress.',
            proactiveSameHerGap,
            emotionalClosureCue,
            sameHerHoldDetail,
          },
        },
        message: 'Keep same-her continuity explicit.',
      } as any,
      domain: 'self-model',
      supportCount: 1,
      result: {
        status: 'completed',
        resultSummary: 'Kept same-her continuity explicit.',
        lifecycleState: { state: 'verifying' } as any,
        nextLifecycleState: { state: 'settled' } as any,
        verificationBasis: ['existing-memory'],
      },
      verifiedArtifact: {
        status: 'validated',
        contradictionFactIds: [],
        verifier: {
          mayInternalize: true,
          mayValidateOnly: false,
        },
      } as any,
    })

    expect(event.projectStateContinuity).toEqual({
      sameHerSelfLine: 'one continuous her',
      sameHerDriftRisk: 'If later learning passes let this slip into generic guidance or a detached project narrator voice, treat that as same-her continuity drift rather than progress.',
      proactiveSameHerGap,
      emotionalClosureCue,
      sameHerHoldDetail,
      continuityGuard: 'one continuous her ; If later learning passes let this slip into generic guidance or a detached project narrator voice, treat that as same-her continuity drift rather than progress.',
    })
  })

  it('keeps proactive same-her gap even when older same-her guard fields are absent', () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'
    const event = buildAlicizationSelfRevisionEvent({
      task: {
        taskId: 'task-3',
        action: 'record',
        updatedAt: 102,
        sourceTurnId: 'turn-3',
        payload: {
          decisionTraceId: 'trace-3',
          sourceTurnId: 'turn-3',
          projectStateContinuity: {
            proactiveSameHerGap,
          },
        },
        message: 'Keep proactive same-her carry alive.',
      } as any,
      domain: 'proactive-policy',
      supportCount: 1,
      result: {
        status: 'completed',
        resultSummary: 'Kept proactive same-her carry alive.',
        lifecycleState: { state: 'verifying' } as any,
        nextLifecycleState: { state: 'settled' } as any,
        verificationBasis: ['existing-memory'],
      },
      verifiedArtifact: {
        status: 'validated',
        contradictionFactIds: [],
        verifier: {
          mayInternalize: true,
          mayValidateOnly: false,
        },
      } as any,
    })

    expect(event.projectStateContinuity).toEqual({
      sameHerSelfLine: null,
      sameHerDriftRisk: null,
      proactiveSameHerGap,
      emotionalClosureCue: null,
      sameHerHoldDetail: null,
      continuityGuard: null,
    })
  })
})
