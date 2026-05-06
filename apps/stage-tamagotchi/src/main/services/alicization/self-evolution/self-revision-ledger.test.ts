import { describe, expect, it } from 'vitest'

import { buildAlicizationSelfRevisionEvent } from './self-revision-ledger'

describe('self-revision-ledger', () => {
  it('turns learning outcomes into traceable self revision events', () => {
    const event = buildAlicizationSelfRevisionEvent({
      task: {
        taskId: 'task-1',
        action: 'revise',
        updatedAt: 100,
        sourceTurnId: 'turn-1',
        payload: {
          decisionTraceId: 'trace-1',
          sourceTurnId: 'turn-1',
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
    expect(event.appliedTargets).toEqual(expect.arrayContaining(['fact-1', 'old-belief-1', 'conflict-1']))
    expect(event.rollbackPlan).toContain('revisit-contradiction-heavy-targets')
  })
})
