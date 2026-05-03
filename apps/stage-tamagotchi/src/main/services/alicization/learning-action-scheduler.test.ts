import { describe, expect, it, vi } from 'vitest'

import { createAlicizationLearningActionScheduler } from './learning-action-scheduler'

describe('learning action scheduler', () => {
  it('schedules a non-hold learning action from self-evolution', async () => {
    const insertScheduledTask = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const scheduler = createAlicizationLearningActionScheduler({
      now: () => 1_000,
      insertScheduledTask,
      claimDueScheduledTasks: async () => [],
      completeScheduledTask: async () => {},
      failScheduledTask: async () => {},
      appendAuditLog,
      randomUUID: () => 'uuid-learning',
      getActiveCardId: () => 'default',
    })

    const task = await scheduler.scheduleLearningTask({
      turnId: 'turn-learning',
      context: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [{
          id: 'fact-1',
          subject: 'assistant',
          predicate: 'procedure',
          object: 'verify before sounding certain',
          confidence: 0.86,
          source: 'async-llm',
          dedupeKey: 'assistant|procedure|verify before sounding certain',
          createdAt: 1,
          updatedAt: 1,
          lastAccessAt: null,
          accessCount: 1,
          supersedes: ['fact-old-style'],
          conflictsWith: ['fact-uncertain-style'],
        } as any],
        recalledFragments: [],
        selfEvolution: {
          version: 'self-evolution-kernel-v1',
          updatedAt: 1_000,
          evolutionMomentum: 0.4,
          learningReadiness: 0.6,
          contradictionPressure: 0.1,
          revisionPressure: 0.12,
          autobiographicalStability: 0.8,
          dominantTrajectory: 'Validated procedure is stabilizing.',
          relationshipDoctrine: null,
          latestInflection: 'Validated procedure is stabilizing.',
          burdenLine: null,
          trustMeaning: null,
          nextLearningAction: 'internalize',
          nextLearningReason: 'Validated procedure carry is strong enough to promote.',
          shouldRecord: false,
          shouldReflect: false,
          shouldVerify: false,
          shouldRevise: false,
          shouldInternalize: true,
          activeLearningFocuses: ['internalize-procedure'],
          sourceSignals: ['Validated procedure is stabilizing.'],
          summary: 'Validated procedure is stabilizing.',
        },
      },
    })

    expect(task).toEqual(expect.objectContaining({
      taskId: expect.stringContaining('learning:default:internalize:'),
      sourceTurnId: 'turn-learning',
    }))
    expect(insertScheduledTask).toBeCalledWith(expect.objectContaining({
      taskId: expect.stringContaining('learning:default:internalize:'),
      sourceTurnId: 'turn-learning',
    }))
    expect(appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'alicization.learning.task.scheduled',
      payload: expect.objectContaining({
        nextLearningAction: 'internalize',
        activeLearningFocuses: ['internalize-procedure'],
        dominantTrajectory: 'Validated procedure is stabilizing.',
        supersedeTargets: ['fact-old-style'],
        conflictTargets: ['fact-uncertain-style'],
      }),
    }))
  })
})
