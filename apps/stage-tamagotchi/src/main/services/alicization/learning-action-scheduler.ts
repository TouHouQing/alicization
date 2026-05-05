import type {
  AlicizationAuditLogInput,
  AlicizationLearningAction,
  AlicizationLearningTaskFailureKind,
  AlicizationLearningTaskPayload,
  AlicizationLearningTaskRecord,
  AlicizationSelfEvolutionKernelSnapshot,
} from '../../../shared/eventa'

import type { OrganicMemoryPromptContext } from './runtime-soul'

export interface AlicizationLearningScheduledTask {
  cardId: string
  taskId: string
  triggerAt: number
  action: AlicizationLearningAction
  message: string
  payload: AlicizationLearningTaskPayload
  sourceTurnId?: string | null
}

export interface AlicizationLearningActionAuditPayload {
  taskId: string
  triggerAt: number
  sourceTurnId: string | null
  nextLearningAction: AlicizationSelfEvolutionKernelSnapshot['nextLearningAction']
  nextLearningReason: string | null
  activeLearningFocuses: string[]
  dominantTrajectory: string | null
  sourceSignals: string[]
  learningReadiness: number
  contradictionPressure: number
  revisionPressure: number
  autobiographicalStability: number
  supersedeTargets?: string[]
  conflictTargets?: string[]
}

interface AlicizationLearningTaskExecutionResult {
  status: 'completed' | 'blocked' | 'failed' | 'reopened' | 'downgraded' | 'cancelled'
  resultSummary?: string | null
  failureKind?: AlicizationLearningTaskFailureKind | null
  error?: string | null
  nextRetryAt?: number | null
  firedTurnId?: string | null
}

interface CreateAlicizationLearningActionSchedulerOptions {
  now: () => number
  insertLearningTask: (input: {
    cardId: string
    taskId: string
    triggerAt: number
    action: AlicizationLearningAction
    message: string
    payload: AlicizationLearningTaskPayload
    maxAttempts?: number
  }) => Promise<AlicizationLearningTaskRecord>
  claimDueLearningTasks: (cardId: string, nowMs: number, limit: number) => Promise<AlicizationLearningTaskRecord[]>
  startLearningTask: (taskId: string, startedAt?: number) => Promise<void>
  blockLearningTask: (taskId: string, input: {
    reason: string
    resultSummary?: string | null
    failureKind?: AlicizationLearningTaskFailureKind | null
    nextRetryAt?: number | null
  }, updatedAt?: number) => Promise<void>
  completeLearningTask: (taskId: string, input: {
    firedTurnId?: string | null
    resultSummary?: string | null
  }, completedAt?: number) => Promise<void>
  failLearningTask: (taskId: string, input: {
    error: string
    failureKind: AlicizationLearningTaskFailureKind
    nextRetryAt?: number | null
  }, updatedAt?: number) => Promise<void>
  reopenLearningTask: (taskId: string, input?: {
    reason?: string | null
    triggerAt?: number | null
  }, updatedAt?: number) => Promise<void>
  downgradeLearningTask: (taskId: string, input?: {
    reason?: string | null
  }, updatedAt?: number) => Promise<void>
  cancelLearningTask: (taskId: string, input?: {
    reason?: string | null
  }, updatedAt?: number) => Promise<void>
  listLearningTasks: (input: {
    cardId: string
    limit?: number
    statuses?: Array<AlicizationLearningTaskRecord['status']>
  }) => Promise<AlicizationLearningTaskRecord[]>
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  executeLearningTask: (task: AlicizationLearningTaskRecord) => Promise<AlicizationLearningTaskExecutionResult>
  randomUUID: () => string
  getActiveCardId: () => string
}

export interface AlicizationLearningTaskRetryPlan {
  shouldRetry: boolean
  retryDueAt: number | null
  failureKind: AlicizationLearningTaskFailureKind
  reason: string
}

function normalizeFailureKind(kind: AlicizationLearningTaskFailureKind | null | undefined): AlicizationLearningTaskFailureKind {
  return kind === 'dependency-missing'
    || kind === 'validation-insufficient'
    || kind === 'runtime-error'
    || kind === 'cancelled'
    ? kind
    : 'runtime-error'
}

function inferLearningTaskFailureKind(input: {
  status: AlicizationLearningTaskExecutionResult['status'] | AlicizationLearningTaskRecord['status']
  failureKind?: AlicizationLearningTaskFailureKind | null
  error?: string | null
  resultSummary?: string | null
}): AlicizationLearningTaskFailureKind {
  if (input.failureKind)
    return normalizeFailureKind(input.failureKind)
  if (input.status === 'cancelled')
    return 'cancelled'
  const haystack = `${input.error ?? ''} ${input.resultSummary ?? ''}`.toLowerCase()
  if (/\b(?:missing|dependency|support|source|context)\b|依赖|缺少|不足/u.test(haystack))
    return 'dependency-missing'
  if (input.status === 'blocked' || /\b(?:validation|verify|insufficient|contradictory|target)\b|验证|核实|矛盾/u.test(haystack))
    return 'validation-insufficient'
  return 'runtime-error'
}

export function computeAlicizationLearningTaskBackoffMs(input: {
  attemptCount: number
  failureKind?: AlicizationLearningTaskFailureKind | null
}) {
  const safeAttempts = Math.max(1, Math.floor(input.attemptCount))
  const failureKind = normalizeFailureKind(input.failureKind)
  const base = failureKind === 'dependency-missing'
    ? 90_000
    : failureKind === 'validation-insufficient'
      ? 120_000
      : failureKind === 'runtime-error'
        ? 45_000
        : 0
  if (base <= 0)
    return 0
  const multiplier = 2 ** Math.min(4, safeAttempts - 1)
  return Math.min(30 * 60_000, base * multiplier)
}

export function deriveAlicizationLearningTaskRetryPlan(input: {
  task: AlicizationLearningTaskRecord
  status: AlicizationLearningTaskExecutionResult['status'] | AlicizationLearningTaskRecord['status']
  nowMs: number
  currentAttemptCount?: number
  failureKind?: AlicizationLearningTaskFailureKind | null
  error?: string | null
  resultSummary?: string | null
  explicitNextRetryAt?: number | null
  baseRetryFromMs?: number | null
}): AlicizationLearningTaskRetryPlan {
  const failureKind = inferLearningTaskFailureKind(input)
  const currentAttemptCount = Math.max(0, Math.floor(input.currentAttemptCount ?? input.task.attemptCount))
  const maxAttempts = Math.max(1, Math.floor(input.task.maxAttempts))
  if (failureKind === 'cancelled' || input.status === 'cancelled') {
    return {
      shouldRetry: false,
      retryDueAt: null,
      failureKind,
      reason: 'cancelled learning tasks are terminal',
    }
  }
  if (input.status === 'downgraded' || input.status === 'completed') {
    return {
      shouldRetry: false,
      retryDueAt: null,
      failureKind,
      reason: `terminal status:${input.status}`,
    }
  }
  if (currentAttemptCount >= maxAttempts) {
    return {
      shouldRetry: false,
      retryDueAt: null,
      failureKind,
      reason: `attempt budget exhausted:${currentAttemptCount}/${maxAttempts}`,
    }
  }

  const explicitNextRetryAt = Number.isFinite(input.explicitNextRetryAt)
    ? Math.max(0, Math.floor(Number(input.explicitNextRetryAt)))
    : null
  const backoffMs = computeAlicizationLearningTaskBackoffMs({
    attemptCount: Math.max(1, currentAttemptCount),
    failureKind,
  })
  const retryDueAt = explicitNextRetryAt ?? Math.max(0, Math.floor(Number(input.baseRetryFromMs ?? input.nowMs))) + backoffMs
  return {
    shouldRetry: retryDueAt > 0,
    retryDueAt,
    failureKind,
    reason: `retryable:${failureKind}:attempt ${currentAttemptCount}/${maxAttempts}`,
  }
}

function buildTaskMessage(input: {
  nextLearningAction: AlicizationSelfEvolutionKernelSnapshot['nextLearningAction']
  nextLearningReason: string | null
  activeLearningFocuses: string[]
}) {
  return [
    `learning-action=${input.nextLearningAction}`,
    input.nextLearningReason ? `reason=${input.nextLearningReason}` : '',
    input.activeLearningFocuses.length > 0 ? `focus=${input.activeLearningFocuses.join(' | ')}` : '',
  ].filter(Boolean).join(' ; ')
}

function buildAuditPayload(input: {
  task: AlicizationLearningScheduledTask
  evolution: AlicizationSelfEvolutionKernelSnapshot
  context: OrganicMemoryPromptContext
}): AlicizationLearningActionAuditPayload {
  return {
    taskId: input.task.taskId,
    triggerAt: input.task.triggerAt,
    sourceTurnId: input.task.sourceTurnId ?? null,
    nextLearningAction: input.evolution.nextLearningAction,
    nextLearningReason: input.evolution.nextLearningReason,
    activeLearningFocuses: [...input.evolution.activeLearningFocuses],
    dominantTrajectory: input.evolution.dominantTrajectory,
    sourceSignals: [...input.evolution.sourceSignals],
    learningReadiness: input.evolution.learningReadiness,
    contradictionPressure: input.evolution.contradictionPressure,
    revisionPressure: input.evolution.revisionPressure,
    autobiographicalStability: input.evolution.autobiographicalStability,
    supersedeTargets: input.context.retrievedFacts
      .flatMap(item => item.supersedes ?? [])
      .slice(0, 12),
    conflictTargets: input.context.retrievedFacts
      .flatMap(item => item.conflictsWith ?? [])
      .slice(0, 12),
  }
}

function deriveTaskPayload(input: {
  context: OrganicMemoryPromptContext
  turnId?: string | null
}): AlicizationLearningTaskPayload | null {
  const evolution = input.context.selfEvolution ?? null
  if (!evolution || evolution.nextLearningAction === 'hold')
    return null
  return {
    sourceTurnId: input.turnId ?? null,
    decisionTraceId: input.context.decisionTraceId ?? null,
    sourceSessionId: input.context.sessionId ?? null,
    action: evolution.nextLearningAction as AlicizationLearningAction,
    reason: evolution.nextLearningReason ?? null,
    focuses: [...evolution.activeLearningFocuses].slice(0, 12),
    dominantTrajectory: evolution.dominantTrajectory,
    sourceSignals: [...evolution.sourceSignals].slice(0, 12),
    learningReadiness: evolution.learningReadiness,
    contradictionPressure: evolution.contradictionPressure,
    revisionPressure: evolution.revisionPressure,
    autobiographicalStability: evolution.autobiographicalStability,
    supportingFactIds: input.context.retrievedFacts.map(item => item.id).filter(Boolean).slice(0, 24),
    supportingReflectionIds: (input.context.recentMemoryReflections ?? []).map(item => item.id).filter(Boolean).slice(0, 24),
    supportingOutcomeIds: (input.context.recentRelationshipOutcomes ?? []).map(item => item.id).filter(Boolean).slice(0, 24),
    supersedeTargets: input.context.retrievedFacts.flatMap(item => item.supersedes ?? []).filter(Boolean).slice(0, 24),
    conflictTargets: input.context.retrievedFacts.flatMap(item => item.conflictsWith ?? []).filter(Boolean).slice(0, 24),
  }
}

export function createAlicizationLearningActionScheduler(options: CreateAlicizationLearningActionSchedulerOptions) {
  function deriveLearningTask(input: {
    context: OrganicMemoryPromptContext
    turnId?: string | null
  }): AlicizationLearningScheduledTask | null {
    const evolution = input.context.selfEvolution ?? null
    const payload = deriveTaskPayload(input)
    if (!evolution || !payload)
      return null

    const nowMs = options.now()
    const taskId = `learning:${options.getActiveCardId()}:${evolution.nextLearningAction}:${options.randomUUID().slice(0, 8)}`
    const delayMs = evolution.nextLearningAction === 'record'
      ? 30_000
      : evolution.nextLearningAction === 'reflect'
        ? 60_000
        : evolution.nextLearningAction === 'verify'
          ? 90_000
          : evolution.nextLearningAction === 'revise'
            ? 120_000
            : 150_000

    return {
      cardId: options.getActiveCardId(),
      taskId,
      triggerAt: nowMs + delayMs,
      action: evolution.nextLearningAction as AlicizationLearningAction,
      message: buildTaskMessage({
        nextLearningAction: evolution.nextLearningAction,
        nextLearningReason: evolution.nextLearningReason,
        activeLearningFocuses: evolution.activeLearningFocuses,
      }),
      payload,
      sourceTurnId: input.turnId ?? null,
    }
  }

  async function scheduleLearningTask(input: {
    context: OrganicMemoryPromptContext
    turnId?: string | null
  }) {
    const task = deriveLearningTask(input)
    const evolution = input.context.selfEvolution ?? null
    if (!task || !evolution)
      return null
    const auditPayload = buildAuditPayload({
      task,
      evolution,
      context: input.context,
    })
    const inserted = await options.insertLearningTask({
      cardId: task.cardId,
      taskId: task.taskId,
      triggerAt: task.triggerAt,
      action: task.action,
      message: task.message,
      payload: task.payload,
    })
    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.learning',
      action: 'alicization.learning.task.scheduled',
      message: 'Scheduled learning action from self-evolution kernel.',
      payload: {
        ...auditPayload,
        message: task.message,
      },
    }, task.cardId)
    return inserted
  }

  async function processDueLearningTasks(limit = 8) {
    const cardId = options.getActiveCardId()
    const due = await options.claimDueLearningTasks(cardId, options.now(), limit)
    let completed = 0
    let failed = 0
    let blocked = 0
    let reopened = 0
    let downgraded = 0
    let cancelled = 0

    for (const task of due) {
      try {
        const startedAt = options.now()
        await options.startLearningTask(task.taskId, startedAt)
        await options.appendAuditLog({
          level: 'notice',
          category: 'alicization.learning',
          action: 'alicization.learning.task.started',
          message: 'Started due learning action task.',
          payload: {
            taskId: task.taskId,
            action: task.action,
            triggerAt: task.triggerAt,
            sourceTurnId: task.sourceTurnId ?? null,
          },
        }, cardId)

        const result = await options.executeLearningTask(task)
        const finishedAt = options.now()
        if (result.status === 'completed') {
          await options.completeLearningTask(task.taskId, {
            firedTurnId: result.firedTurnId ?? `${task.taskId}:fired:${finishedAt}`,
            resultSummary: result.resultSummary ?? null,
          }, finishedAt)
          completed += 1
        }
        else if (result.status === 'blocked') {
          const retryPlan = deriveAlicizationLearningTaskRetryPlan({
            task,
            status: result.status,
            nowMs: finishedAt,
            currentAttemptCount: task.attemptCount + 1,
            failureKind: result.failureKind,
            error: result.error,
            resultSummary: result.resultSummary,
            explicitNextRetryAt: result.nextRetryAt,
          })
          await options.blockLearningTask(task.taskId, {
            reason: result.error ?? 'learning task blocked',
            resultSummary: result.resultSummary ?? null,
            failureKind: retryPlan.failureKind,
            nextRetryAt: retryPlan.retryDueAt,
          }, finishedAt)
          blocked += 1
        }
        else if (result.status === 'reopened') {
          await options.reopenLearningTask(task.taskId, {
            reason: result.error ?? result.resultSummary ?? null,
            triggerAt: result.nextRetryAt ?? finishedAt + 60_000,
          }, finishedAt)
          reopened += 1
        }
        else if (result.status === 'downgraded') {
          await options.downgradeLearningTask(task.taskId, {
            reason: result.error ?? result.resultSummary ?? null,
          }, finishedAt)
          downgraded += 1
        }
        else if (result.status === 'cancelled') {
          await options.cancelLearningTask(task.taskId, {
            reason: result.error ?? result.resultSummary ?? null,
          }, finishedAt)
          cancelled += 1
        }
        else {
          const retryPlan = deriveAlicizationLearningTaskRetryPlan({
            task,
            status: result.status,
            nowMs: finishedAt,
            currentAttemptCount: task.attemptCount + 1,
            failureKind: result.failureKind,
            error: result.error,
            resultSummary: result.resultSummary,
            explicitNextRetryAt: result.nextRetryAt,
          })
          await options.failLearningTask(task.taskId, {
            error: result.error ?? 'learning execution failed',
            failureKind: retryPlan.failureKind,
            nextRetryAt: retryPlan.retryDueAt,
          }, finishedAt)
          failed += 1
        }

        await options.appendAuditLog({
          level: result.status === 'completed' ? 'notice' : 'warning',
          category: 'alicization.learning',
          action: 'alicization.learning.task.executed',
          message: 'Executed due learning action task.',
          payload: {
            taskId: task.taskId,
            action: task.action,
            triggerAt: task.triggerAt,
            sourceTurnId: task.sourceTurnId ?? null,
            resultStatus: result.status,
            resultSummary: result.resultSummary ?? null,
            failureKind: result.failureKind ?? null,
            error: result.error ?? null,
            nextRetryAt: result.nextRetryAt ?? null,
          },
        }, cardId)
      }
      catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        const finishedAt = options.now()
        const retryPlan = deriveAlicizationLearningTaskRetryPlan({
          task,
          status: 'failed',
          nowMs: finishedAt,
          currentAttemptCount: task.attemptCount + 1,
          failureKind: 'runtime-error',
          error: reason,
        })
        await options.failLearningTask(task.taskId, {
          error: reason,
          failureKind: retryPlan.failureKind,
          nextRetryAt: retryPlan.retryDueAt,
        }, finishedAt).catch(() => {})
        failed += 1
      }
    }

    return {
      claimed: due.length,
      completed,
      failed,
      blocked,
      reopened,
      downgraded,
      cancelled,
    }
  }

  async function recoverRetryableLearningTasks(limit = 12) {
    const cardId = options.getActiveCardId()
    const nowMs = options.now()
    const candidates = await options.listLearningTasks({
      cardId,
      statuses: ['blocked', 'failed'],
      limit,
    }).catch(() => [])
    let reopened = 0
    let terminal = 0
    let waiting = 0

    for (const task of candidates) {
      const retryPlan = deriveAlicizationLearningTaskRetryPlan({
        task,
        status: task.status,
        nowMs,
        currentAttemptCount: task.attemptCount,
        failureKind: task.failureKind,
        error: task.lastError,
        resultSummary: task.resultSummary,
        explicitNextRetryAt: task.nextRetryAt,
      })
      if (!retryPlan.shouldRetry || !retryPlan.retryDueAt) {
        terminal += 1
        await options.appendAuditLog({
          level: 'warning',
          category: 'alicization.learning',
          action: 'alicization.learning.task.retry.terminal',
          message: 'Learning task retry budget closed without visible reply fallback.',
          payload: {
            taskId: task.taskId,
            action: task.action,
            status: task.status,
            attemptCount: task.attemptCount,
            maxAttempts: task.maxAttempts,
            failureKind: retryPlan.failureKind,
            reason: retryPlan.reason,
            lastError: task.lastError,
          },
        }, cardId)
        continue
      }
      if (retryPlan.retryDueAt > nowMs) {
        waiting += 1
        continue
      }
      await options.reopenLearningTask(task.taskId, {
        reason: retryPlan.reason,
        triggerAt: nowMs,
      }, nowMs)
      reopened += 1
      await options.appendAuditLog({
        level: 'notice',
        category: 'alicization.learning',
        action: 'alicization.learning.task.retry.reopened',
        message: 'Reopened retryable learning task after backoff.',
        payload: {
          taskId: task.taskId,
          action: task.action,
          previousStatus: task.status,
          attemptCount: task.attemptCount,
          maxAttempts: task.maxAttempts,
          failureKind: retryPlan.failureKind,
          nextRetryAt: retryPlan.retryDueAt,
          reason: retryPlan.reason,
        },
      }, cardId)
    }

    return {
      scanned: candidates.length,
      reopened,
      terminal,
      waiting,
    }
  }

  return {
    deriveLearningTask,
    scheduleLearningTask,
    processDueLearningTasks,
    recoverRetryableLearningTasks,
  }
}
