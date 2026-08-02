import { describe, expect, it } from 'vitest'

import { buildAlicizationSelfRevisionEvent } from './self-revision-ledger'

function createTask() {
  return {
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
  } as any
}

function createResult() {
  return {
    status: 'completed',
    resultSummary: 'Revised stale self model.',
    lifecycleState: { state: 'verifying' } as any,
    nextLifecycleState: { state: 'settled' } as any,
    verificationBasis: ['existing-memory', 'runtime-result'],
  } as any
}

function createVerifiedArtifact() {
  return {
    status: 'validated',
    contradictionFactIds: ['conflict-1'],
    verifier: {
      mayInternalize: true,
      mayValidateOnly: false,
    },
  } as any
}

describe('self-revision-ledger', () => {
  it('turns verified learning outcomes into traceable self revision events', () => {
    const event = buildAlicizationSelfRevisionEvent({
      task: createTask(),
      domain: 'self-model',
      supportCount: 2,
      result: createResult(),
      verifiedArtifact: createVerifiedArtifact(),
    })

    expect(event.version).toBe('self-revision-event-v1')
    expect(event.decisionTraceId).toBe('trace-1')
    expect(event.domain).toBe('self-model')
    expect(event).not.toHaveProperty('runtimeContinuity')
    expect(event.appliedTargets).toEqual(expect.arrayContaining(['fact-1', 'old-belief-1', 'conflict-1']))
    expect(event.rollbackPlan).toContain('revisit-contradiction-heavy-targets')
  })

  it('preserves provider-authored verified revision summaries as evidence', () => {
    const summary = 'Provider may discuss continuity semantics in verified learning evidence.'
    const event = buildAlicizationSelfRevisionEvent({
      task: createTask(),
      domain: 'self-model',
      supportCount: 1,
      result: {
        ...createResult(),
        resultSummary: summary,
      },
      verifiedArtifact: createVerifiedArtifact(),
    })

    expect(event.proposedRevision.summary).toBe(summary)
    expect(event).not.toHaveProperty('runtimeContinuity')
  })
})
