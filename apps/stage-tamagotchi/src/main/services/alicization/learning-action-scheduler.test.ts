import { describe, expect, it, vi } from 'vitest'

import type { AlicizationLearningTaskRecord } from '../../../shared/eventa'

import {
  computeAlicizationLearningTaskBackoffMs,
  createAlicizationLearningActionScheduler,
  deriveAlicizationLearningTaskRetryPlan,
} from './learning-action-scheduler'

function buildLearningTaskRecord(input: Partial<AlicizationLearningTaskRecord> = {}): AlicizationLearningTaskRecord {
  return {
    id: input.id ?? 'row:learning',
    cardId: input.cardId ?? 'default',
    taskId: input.taskId ?? 'learning:default:verify:abc',
    status: input.status ?? 'claimed',
    triggerAt: input.triggerAt ?? 1_500,
    action: input.action ?? 'verify',
    message: input.message ?? 'learning-action=verify',
    payload: input.payload ?? {
      sourceTurnId: 'turn-1',
      decisionTraceId: 'trace-1',
      sourceSessionId: 'session-1',
      action: 'verify',
      reason: 'verify contradiction',
      focuses: ['resolve-contradictions'],
      dominantTrajectory: 'Need to verify',
      sourceSignals: ['Need to verify'],
      learningReadiness: 0.7,
      contradictionPressure: 0.6,
      revisionPressure: 0.4,
      autobiographicalStability: 0.7,
      supportingFactIds: ['fact-1'],
      supportingReflectionIds: [],
      supportingOutcomeIds: [],
      supersedeTargets: [],
      conflictTargets: ['fact-1'],
    },
    attemptCount: input.attemptCount ?? 0,
    maxAttempts: input.maxAttempts ?? 3,
    createdAt: input.createdAt ?? 1_000,
    updatedAt: input.updatedAt ?? 1_500,
    claimedAt: input.claimedAt ?? 1_500,
    startedAt: input.startedAt ?? null,
    completedAt: input.completedAt ?? null,
    blockedAt: input.blockedAt ?? null,
    cancelledAt: input.cancelledAt ?? null,
    downgradedAt: input.downgradedAt ?? null,
    reopenedAt: input.reopenedAt ?? null,
    nextRetryAt: input.nextRetryAt ?? null,
    sourceTurnId: input.sourceTurnId ?? 'turn-1',
    resultSummary: input.resultSummary ?? null,
    failureKind: input.failureKind ?? null,
    lastError: input.lastError ?? null,
    firedTurnId: input.firedTurnId ?? null,
  }
}

describe('learning action scheduler', () => {
  it('schedules a non-hold learning action from self-evolution', async () => {
    const insertLearningTask = vi.fn(async (input: any): Promise<AlicizationLearningTaskRecord> => ({
      id: `row:${input.taskId}`,
      cardId: input.cardId,
      taskId: input.taskId,
      status: 'scheduled' as const,
      triggerAt: input.triggerAt,
      action: input.action,
      message: input.message,
      payload: input.payload,
      attemptCount: 0,
      maxAttempts: 3,
      createdAt: 1_000,
      updatedAt: 1_000,
      claimedAt: null,
      startedAt: null,
      completedAt: null,
      blockedAt: null,
      cancelledAt: null,
      downgradedAt: null,
      reopenedAt: null,
      nextRetryAt: null,
      sourceTurnId: input.payload.sourceTurnId ?? null,
      resultSummary: null,
      failureKind: null,
      lastError: null,
      firedTurnId: null,
    }))
    const appendAuditLog = vi.fn(async () => {})
    const scheduler = createAlicizationLearningActionScheduler({
      now: () => 1_000,
      insertLearningTask,
      claimDueLearningTasks: async () => [],
      startLearningTask: async () => {},
      blockLearningTask: async () => {},
      completeLearningTask: async () => {},
      failLearningTask: async () => {},
      reopenLearningTask: async () => {},
      downgradeLearningTask: async () => {},
      cancelLearningTask: async () => {},
      listLearningTasks: async () => [],
      appendAuditLog,
      executeLearningTask: async () => ({
        status: 'completed',
        resultSummary: 'done',
      }),
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
    expect(insertLearningTask).toBeCalledWith(expect.objectContaining({
      cardId: 'default',
      taskId: expect.stringContaining('learning:default:internalize:'),
      action: 'internalize',
      payload: expect.objectContaining({
        sourceTurnId: 'turn-learning',
        supportingFactIds: ['fact-1'],
      }),
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
    }), 'default')
  })

  it('claims and completes due learning tasks through executor', async () => {
    const startLearningTask = vi.fn(async () => {})
    const completeLearningTask = vi.fn(async () => {})
    const scheduler = createAlicizationLearningActionScheduler({
      now: () => 2_000,
      insertLearningTask: async () => {
        throw new Error('not used')
      },
      claimDueLearningTasks: async () => [buildLearningTaskRecord()],
      startLearningTask,
      blockLearningTask: async () => {},
      completeLearningTask,
      failLearningTask: async () => {},
      reopenLearningTask: async () => {},
      downgradeLearningTask: async () => {},
      cancelLearningTask: async () => {},
      listLearningTasks: async () => [],
      appendAuditLog: async () => {},
      executeLearningTask: async task => ({
        status: 'completed',
        resultSummary: `executed:${task.action}`,
        firedTurnId: 'learning-fired-turn',
      }),
      randomUUID: () => 'uuid-learning',
      getActiveCardId: () => 'default',
    })

    const result = await scheduler.processDueLearningTasks()
    expect(result).toEqual(expect.objectContaining({
      claimed: 1,
      completed: 1,
      failed: 0,
    }))
    expect(startLearningTask).toBeCalledWith('learning:default:verify:abc', 2_000)
    expect(completeLearningTask).toBeCalledWith('learning:default:verify:abc', {
      firedTurnId: 'learning-fired-turn',
      resultSummary: 'executed:verify',
    }, 2_000)
  })

  it('derives retry backoff from failure kind and attempt budget', () => {
    expect(computeAlicizationLearningTaskBackoffMs({
      attemptCount: 1,
      failureKind: 'runtime-error',
    })).toBe(45_000)
    expect(computeAlicizationLearningTaskBackoffMs({
      attemptCount: 2,
      failureKind: 'dependency-missing',
    })).toBe(180_000)
    expect(deriveAlicizationLearningTaskRetryPlan({
      task: buildLearningTaskRecord({
        attemptCount: 3,
        maxAttempts: 3,
      }),
      status: 'failed',
      nowMs: 10_000,
      failureKind: 'runtime-error',
    })).toEqual(expect.objectContaining({
      shouldRetry: false,
      retryDueAt: null,
      reason: 'attempt budget exhausted:3/3',
    }))
  })

  it('stores retryable blocked tasks with computed retry metadata', async () => {
    const blockLearningTask = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const scheduler = createAlicizationLearningActionScheduler({
      now: () => 10_000,
      insertLearningTask: async () => {
        throw new Error('not used')
      },
      claimDueLearningTasks: async () => [buildLearningTaskRecord({
        attemptCount: 1,
        maxAttempts: 3,
      })],
      startLearningTask: async () => {},
      blockLearningTask,
      completeLearningTask: async () => {},
      failLearningTask: async () => {},
      reopenLearningTask: async () => {},
      downgradeLearningTask: async () => {},
      cancelLearningTask: async () => {},
      listLearningTasks: async () => [],
      appendAuditLog,
      executeLearningTask: async () => ({
        status: 'blocked',
        resultSummary: 'waiting for stronger support',
        error: 'missing supporting facts and reflections',
      }),
      randomUUID: () => 'uuid-learning',
      getActiveCardId: () => 'default',
    })

    const result = await scheduler.processDueLearningTasks()
    expect(result.blocked).toBe(1)
    expect(blockLearningTask).toBeCalledWith('learning:default:verify:abc', {
      reason: 'missing supporting facts and reflections',
      resultSummary: 'waiting for stronger support',
      failureKind: 'dependency-missing',
      nextRetryAt: 190_000,
    }, 10_000)
    expect(appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'alicization.learning.task.executed',
      payload: expect.objectContaining({
        resultStatus: 'blocked',
        error: 'missing supporting facts and reflections',
      }),
    }), 'default')
  })

  it('reopens due retryable failed or blocked tasks after backoff', async () => {
    const reopenLearningTask = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const scheduler = createAlicizationLearningActionScheduler({
      now: () => 200_000,
      insertLearningTask: async () => {
        throw new Error('not used')
      },
      claimDueLearningTasks: async () => [],
      startLearningTask: async () => {},
      blockLearningTask: async () => {},
      completeLearningTask: async () => {},
      failLearningTask: async () => {},
      reopenLearningTask,
      downgradeLearningTask: async () => {},
      cancelLearningTask: async () => {},
      listLearningTasks: async () => [
        buildLearningTaskRecord({
          status: 'failed',
          attemptCount: 1,
          maxAttempts: 3,
          nextRetryAt: 190_000,
          failureKind: 'runtime-error',
          lastError: 'temporary runtime failure',
        }),
        buildLearningTaskRecord({
          taskId: 'learning:default:verify:blocked',
          status: 'blocked',
          attemptCount: 2,
          maxAttempts: 3,
          nextRetryAt: 260_000,
          failureKind: 'validation-insufficient',
          lastError: 'waiting for validation support',
        }),
      ],
      appendAuditLog,
      executeLearningTask: async () => ({
        status: 'completed',
      }),
      randomUUID: () => 'uuid-learning',
      getActiveCardId: () => 'default',
    })

    const recovery = await scheduler.recoverRetryableLearningTasks()
    expect(recovery).toEqual({
      scanned: 2,
      reopened: 1,
      terminal: 0,
      waiting: 1,
    })
    expect(reopenLearningTask).toBeCalledWith('learning:default:verify:abc', {
      reason: 'retryable:runtime-error:attempt 1/3',
      triggerAt: 200_000,
    }, 200_000)
    expect(appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'alicization.learning.task.retry.reopened',
      payload: expect.objectContaining({
        taskId: 'learning:default:verify:abc',
        previousStatus: 'failed',
        failureKind: 'runtime-error',
      }),
    }), 'default')
  })
})
