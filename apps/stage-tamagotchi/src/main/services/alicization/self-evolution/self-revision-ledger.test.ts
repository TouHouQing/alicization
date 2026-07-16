import { describe, expect, it } from 'vitest'

import { buildAlicizationSelfRevisionEvent } from './self-revision-ledger'

describe('self-revision-ledger', () => {
  it('turns learning outcomes into traceable self revision events', () => {
    const emotionalClosureCue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the continuity state.'
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'
    const sameHerHoldDetail = 'identity-continuity'
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
            sameHerSelfLine: 'identity continuity',
            sameHerDriftRisk: 'If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the identity-continuity',
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
      sameHerSelfLine: 'content=excluded; reason=continuity-residue; visibility=redacted_internal',
      sameHerDriftRisk: 'content=excluded; reason=continuity-residue; visibility=redacted_internal',
      proactiveSameHerGap,
      emotionalClosureCue: 'content=excluded; reason=continuity-residue; visibility=redacted_internal',
      sameHerHoldDetail: 'content=excluded; reason=continuity-residue; visibility=redacted_internal',
      continuityGuard: null,
    })
    expect(JSON.stringify(event.projectStateContinuity)).not.toMatch(/identity continuity|continuity state|identity-continuity/iu)
    expect(event.appliedTargets).toEqual(expect.arrayContaining(['fact-1', 'old-belief-1', 'conflict-1']))
    expect(event.rollbackPlan).toContain('revisit-contradiction-heavy-targets')
  })

  it('preserves richer same-her drift wording as continuity guard even when it does not use the older generic-shell phrase exactly', () => {
    const emotionalClosureCue = 'Keep this callback reopening repair-before-closeness on the continuity state until the room settles.'
    const proactiveSameHerGap = 'Learning still needs to preserve identity-continuity'
    const sameHerHoldDetail = 'identity-continuity'
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
            sameHerSelfLine: 'identity continuity',
            sameHerDriftRisk: 'If later learning passes let this slip into generic guidance or a detached project narrator voice, treat that as identity-continuity',
            proactiveSameHerGap,
            emotionalClosureCue,
            sameHerHoldDetail,
          },
        },
        message: 'Keep identity-continuity',
      } as any,
      domain: 'self-model',
      supportCount: 1,
      result: {
        status: 'completed',
        resultSummary: 'Kept identity-continuity',
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
      sameHerSelfLine: 'content=excluded; reason=continuity-residue; visibility=redacted_internal',
      sameHerDriftRisk: 'content=excluded; reason=continuity-residue; visibility=redacted_internal',
      proactiveSameHerGap: 'content=excluded; reason=continuity-residue; visibility=redacted_internal',
      emotionalClosureCue: 'content=excluded; reason=continuity-residue; visibility=redacted_internal',
      sameHerHoldDetail: 'content=excluded; reason=continuity-residue; visibility=redacted_internal',
      continuityGuard: null,
    })
    expect(JSON.stringify(event.projectStateContinuity)).not.toMatch(/identity continuity|same-her|continuity state/iu)
  })

  it('keeps proactive identity-continuity', () => {
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
        message: 'Keep proactive identity-continuity',
      } as any,
      domain: 'proactive-policy',
      supportCount: 1,
      result: {
        status: 'completed',
        resultSummary: 'Kept proactive identity-continuity',
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

  it('sanitizes fixed template continuity residue before self-revision material can become persona prose', () => {
    const event = buildAlicizationSelfRevisionEvent({
      task: {
        taskId: 'task-template-residue',
        action: 'revise',
        updatedAt: 103,
        sourceTurnId: 'turn-template-residue',
        payload: {
          decisionTraceId: 'trace-template-residue',
          sourceTurnId: 'turn-template-residue',
          projectStateContinuity: {
            sameHerSelfLine: 'structured continuity digest.',
            sameHerDriftRisk: 'pre_turn_context_digest',
            proactiveSameHerGap: 'identity-continuity',
            emotionalClosureCue: 'Right now I am still carrying one living her through the identity-continuity',
            sameHerHoldDetail: '女仆 mode must not leak into persona training.',
          },
        },
        message: 'Clean fixed template residue.',
      } as any,
      domain: 'self-model',
      supportCount: 1,
      result: {
        status: 'completed',
        resultSummary: 'Cleaned fixed template residue.',
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

    const serialized = JSON.stringify(event.projectStateContinuity)

    expect(serialized).toContain('content=excluded')
    expect(serialized).toContain('visibility=redacted_internal')
    expect(serialized).not.toMatch(/Pre-reply|local-first digital life project|legacy phase-one template|continuity state|identity-continuity/iu)
  })
})
