import type { AlicizationLearningTaskRecord } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import {
  computeAlicizationLearningTaskBackoffMs,
  createAlicizationLearningActionScheduler,
  deriveAlicizationLearningTaskRetryPlan,
} from './learning-action-scheduler'

function buildSameHerProjectStateContinuity() {
  return {
    identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
    currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
    sameHerSummary: 'Keep one same local digital life coherent across emotion, memory, initiative, and embodiment while learning from this turn.',
    landedProgressSummary: 'Cross-turn continuity is landing more often inside the desktop life loop.',
    openClosureSummary: 'Learning still needs to preserve continuity pressure when verification and retries stretch across time.',
    proactiveSameHerGap: 'Delayed learning still needs to carry the identity-continuity',
    nextClosureTarget: 'Carry identity-continuity',
    preDialogueAwarenessLine: 'pre_turn_context_digest',
    emotionalClosureCue: 'identity-continuity',
    sameHerSelfLine: 'identity continuity',
    sameHerHoldDetail: 'identity-continuity',
    sameHerDriftRisk: 'If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the identity-continuity',
  }
}

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
      projectStateContinuity: buildSameHerProjectStateContinuity(),
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
        projectStateContinuity: {
          identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          sameHerSummary: 'Keep one same local digital life coherent across emotion, memory, initiative, and embodiment while learning from this turn.',
          landedProgressSummary: 'Cross-turn continuity is landing more often inside the desktop life loop.',
          openClosureSummary: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life stays coherent.',
          proactiveSameHerGap: 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.',
          nextClosureTarget: 'Keep extending cross-modal identity-continuity',
          preDialogueAwarenessLine: 'pre_turn_context_digest',
          emotionalClosureCue: 'identity-continuity',
          sameHerSelfLine: 'identity continuity',
          sameHerDriftRisk: 'If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the identity-continuity',
        },
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
      message: expect.stringContaining('Learning action: internalize.'),
    }))
    expect(String(task?.message ?? '')).not.toMatch(/same-her=|same-her-gap=|same-her-hold=|guard=/u)
    expect(insertLearningTask).toBeCalledWith(expect.objectContaining({
      cardId: 'default',
      taskId: expect.stringContaining('learning:default:internalize:'),
      action: 'internalize',
      message: expect.stringContaining('Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified'),
      payload: expect.objectContaining({
        sourceTurnId: 'turn-learning',
        projectStateContinuity: expect.objectContaining({
          identity: 'local continuity context',
          currentPhase: 'local continuity phase',
          sameHerSelfLine: 'identity continuity',
          openClosureSummary: expect.any(String),
          proactiveSameHerGap: 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.',
          preDialogueAwarenessLine: null,
          emotionalClosureCue: null,
          sameHerHoldDetail: null,
          sameHerDriftRisk: 'Risk is tracked for review.',
        }),
        supportingFactIds: ['fact-1'],
      }),
    }))
    expect(appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'alicization.learning.task.scheduled',
      payload: expect.objectContaining({
        projectStateContinuity: expect.objectContaining({
          currentPhase: 'local continuity phase',
          nextClosureTarget: expect.any(String),
          proactiveSameHerGap: 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.',
          preDialogueAwarenessLine: null,
          emotionalClosureCue: null,
          sameHerHoldDetail: null,
          sameHerDriftRisk: 'Risk is tracked for review.',
        }),
        nextLearningAction: 'internalize',
        activeLearningFocuses: ['internalize-procedure'],
        dominantTrajectory: 'Validated procedure is stabilizing.',
        supersedeTargets: ['fact-old-style'],
        conflictTargets: ['fact-uncertain-style'],
      }),
    }), 'default')
    const scheduledMessage = String(insertLearningTask.mock.calls[0]?.[0]?.message ?? '')
    expect(scheduledMessage).toContain('Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs')
    expect(scheduledMessage).not.toMatch(/same-her=|same-her-gap=|same-her-hold=|guard=/u)
  })

  it('neutralizes thin raw project shells instead of preserving fixed same-her templates in delayed learning payloads', async () => {
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
      appendAuditLog: async () => {},
      executeLearningTask: async () => ({
        status: 'completed',
        resultSummary: 'done',
      }),
      randomUUID: () => 'uuid-learning',
      getActiveCardId: () => 'default',
    })

    await scheduler.scheduleLearningTask({
      turnId: 'turn-learning-thin-shell',
      context: {
        projectStateContinuity: {
          identity: 'project',
          currentPhase: 'Phase 1',
          sameHerSummary: 'template-residue-shell',
          landedProgressSummary: 'Project continuity exists.',
          openClosureSummary: 'Project continuity still needs closure.',
          proactiveSameHerGap: 'Learning still needs to preserve identity-continuity',
          nextClosureTarget: 'Carry project continuity forward.',
          preDialogueAwarenessLine: 'template-residue-shell',
          emotionalClosureCue: 'identity-continuity',
          sameHerSelfLine: 'template-residue-shell',
          sameHerDriftRisk: 'If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the identity-continuity',
        },
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        selfEvolution: {
          version: 'self-evolution-kernel-v1',
          updatedAt: 1_000,
          evolutionMomentum: 0.4,
          learningReadiness: 0.6,
          contradictionPressure: 0.1,
          revisionPressure: 0.12,
          autobiographicalStability: 0.8,
          dominantTrajectory: 'Need to preserve identity-continuity',
          relationshipDoctrine: null,
          latestInflection: 'Need to preserve identity-continuity',
          burdenLine: null,
          trustMeaning: null,
          nextLearningAction: 'internalize',
          nextLearningReason: 'Canonical phase-1 identity-continuity',
          shouldRecord: false,
          shouldReflect: false,
          shouldVerify: false,
          shouldRevise: false,
          shouldInternalize: true,
          activeLearningFocuses: ['same-her-continuity'],
          sourceSignals: ['Need to preserve identity-continuity'],
          summary: 'Need to preserve identity-continuity',
        },
      } as any,
    })

    expect(insertLearningTask).toBeCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        projectStateContinuity: expect.objectContaining({
          landedProgressSummary: expect.not.stringContaining('Project continuity exists.'),
          sameHerDriftRisk: 'Risk is tracked for review.',
        }),
      }),
      message: expect.stringContaining('Learning action: internalize.'),
    }))
    expect(String(insertLearningTask.mock.calls[0]?.[0]?.message ?? '')).not.toMatch(/guard=|project_anchor=|same-her=/u)
    const scheduledPayload = insertLearningTask.mock.calls[0]?.[0]?.payload?.projectStateContinuity
    expect(scheduledPayload?.openClosureSummary).not.toBe('Project continuity still needs closure.')
    expect(scheduledPayload?.nextClosureTarget).not.toBe('Carry project continuity forward.')
    expect(scheduledPayload?.landedProgressSummary).toBe('Continuity progress is tracked.')
    expect(scheduledPayload?.sameHerSummary).toBe('identity continuity')
    expect(scheduledPayload?.sameHerSummary).not.toBe('template-residue-shell')
    expect(scheduledPayload?.preDialogueAwarenessLine).not.toBe('template-residue-shell')
    expect(scheduledPayload?.sameHerHoldDetail).toBeNull()
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
        selfRevisionStatePatch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-1',
          sourceEventId: 'event-1',
          sourceTurnId: 'turn-1',
          decisionTraceId: 'trace-1',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'blocked',
          lanes: ['memory-policy', 'relationship-posture', 'response-posture'],
          memoryPolicy: {
            strictnessBias: 0.22,
            wrongThreadSuppressionBias: 0.18,
            provenanceLabelBias: 0.12,
            recallExpansionBias: 0.08,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.28,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.12,
            templateShellSuppressionBias: 0.22,
          },
          proactivePolicy: {
            restraintBias: 0.12,
            learningProposalBias: 0.08,
            actuationCooldownBias: 0,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:relationship', 'result:blocked'],
          summary: 'waiting for stronger support',
        } as any,
      }),
      randomUUID: () => 'uuid-learning',
      getActiveCardId: () => 'default',
    })

    const result = await scheduler.processDueLearningTasks()
    expect(result.blocked).toBe(1)
    expect(blockLearningTask).toBeCalledWith('learning:default:verify:abc', expect.objectContaining({
      failureKind: 'dependency-missing',
      nextRetryAt: 190_000,
    }), 10_000)
    const blockedInput = (blockLearningTask.mock.calls as any[])[0]?.[1]
    expect(blockedInput?.reason).toContain('missing supporting facts and reflections')
    expect(blockedInput?.reason).not.toMatch(/same-her=|same-her-hold=|same-her-gap=|guard=/u)
    expect(blockedInput?.resultSummary).toContain('waiting for stronger support')
    expect(blockedInput?.resultSummary).not.toMatch(/same-her=|same-her-hold=|same-her-gap=|guard=/u)
    expect(appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'alicization.learning.task.executed',
      payload: expect.objectContaining({
        resultStatus: 'blocked',
        error: expect.stringContaining('missing supporting facts and reflections'),
        resultSummary: expect.stringContaining('waiting for stronger support'),
        sameHerContinuityGuard: null,
        selfRevisionPolicyConsumers: expect.arrayContaining([
          'memory-policy',
          'relationship-posture',
          'response-posture',
        ]),
      }),
    }), 'default')
    const executedAuditPayload = (appendAuditLog.mock.calls as any[]).find(call => call[0]?.action === 'alicization.learning.task.executed')?.[0]?.payload as any
    expect(executedAuditPayload?.error).not.toMatch(/same-her=|same-her-hold=|same-her-gap=|guard=/u)
    expect(executedAuditPayload?.resultSummary).not.toMatch(/same-her=|same-her-hold=|same-her-gap=|guard=/u)
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
    expect(reopenLearningTask).toBeCalledWith('learning:default:verify:abc', expect.objectContaining({
      triggerAt: 200_000,
    }), 200_000)
    const reopenInput = (reopenLearningTask.mock.calls as any[])[0]?.[1]
    expect(reopenInput?.reason).toContain('retryable:runtime-error:attempt 1/3')
    expect(reopenInput?.reason).not.toMatch(/same-her=|same-her-hold=|same-her-gap=|guard=/u)
    expect(appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'alicization.learning.task.retry.reopened',
      payload: expect.objectContaining({
        taskId: 'learning:default:verify:abc',
        previousStatus: 'failed',
        failureKind: 'runtime-error',
        reason: expect.stringContaining('retryable:runtime-error:attempt 1/3'),
        sameHerContinuityGuard: null,
      }),
    }), 'default')
    const retryAuditPayload = (appendAuditLog.mock.calls as any[]).find(call => call[0]?.action === 'alicization.learning.task.retry.reopened')?.[0]?.payload as any
    expect(retryAuditPayload?.reason).not.toMatch(/same-her=|same-her-hold=|same-her-gap=|guard=/u)
  })
})
