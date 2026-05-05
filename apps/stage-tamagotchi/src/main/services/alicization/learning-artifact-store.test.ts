import { describe, expect, it, vi } from 'vitest'

import { appendLearningExecutionEvidence } from './learning-artifact-store'

describe('learning-artifact-store', () => {
  it('writes learning execution evidence as durable mind-turn event payload', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    await appendLearningExecutionEvidence({
      options: {
        now: () => 123,
        appendMindTurnEvents,
      },
      task: {
        taskId: 'task-1',
        action: 'verify',
        payload: {
          decisionTraceId: 'trace-1',
          sourceTurnId: 'turn-1',
          sourceSessionId: 'session-1',
          focuses: ['world-model'],
        },
      } as any,
      domain: 'world-model',
      resultSummary: 'Verified a world-model claim.',
      verificationBasis: ['trusted-source'],
      verifiedArtifact: {
        artifactId: 'artifact-1',
        claimGraph: {
          claimId: 'claim-1',
        },
      } as any,
    })

    expect(appendMindTurnEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'system',
        kind: 'learning-executed',
        createdAt: 123,
        payload: expect.objectContaining({
          taskId: 'task-1',
          action: 'verify',
          domain: 'world-model',
          resultSummary: 'Verified a world-model claim.',
          focuses: ['world-model'],
          verificationBasis: ['trusted-source'],
          verifiedArtifact: expect.objectContaining({
            artifactId: 'artifact-1',
          }),
        }),
      }),
    ])
  })

  it('does not write orphan learning evidence without a decision trace', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    await appendLearningExecutionEvidence({
      options: {
        now: () => 123,
        appendMindTurnEvents,
      },
      task: {
        taskId: 'task-1',
        action: 'verify',
        payload: {
          decisionTraceId: null,
          sourceTurnId: 'turn-1',
          sourceSessionId: 'session-1',
          focuses: ['world-model'],
        },
      } as any,
      domain: 'world-model',
      resultSummary: 'No trace.',
    })

    expect(appendMindTurnEvents).not.toHaveBeenCalled()
  })
})
