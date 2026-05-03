import type {
  AlicizationAuditLogInput,
  AlicizationSelfEvolutionKernelSnapshot,
} from '../../../shared/eventa'

import type { OrganicMemoryPromptContext } from './runtime-soul'

export interface AlicizationLearningScheduledTask {
  taskId: string
  triggerAt: number
  message: string
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

interface CreateAlicizationLearningActionSchedulerOptions {
  now: () => number
  insertScheduledTask: (input: {
    taskId: string
    triggerAt: number
    message: string
    sourceTurnId?: string
  }) => Promise<unknown>
  claimDueScheduledTasks: (nowMs: number, limit: number) => Promise<Array<{
    taskId: string
    triggerAt: number
    message: string
    sourceTurnId?: string | null
  }>>
  completeScheduledTask: (taskId: string, firedTurnId: string, completedAt?: number) => Promise<void>
  failScheduledTask: (taskId: string, error: string, completedAt?: number) => Promise<void>
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  randomUUID: () => string
  getActiveCardId: () => string
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

export function createAlicizationLearningActionScheduler(options: CreateAlicizationLearningActionSchedulerOptions) {
  function deriveLearningTask(input: {
    context: OrganicMemoryPromptContext
    turnId?: string | null
  }): AlicizationLearningScheduledTask | null {
    const evolution = input.context.selfEvolution ?? null
    if (!evolution || evolution.nextLearningAction === 'hold')
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
      taskId,
      triggerAt: nowMs + delayMs,
      message: buildTaskMessage({
        nextLearningAction: evolution.nextLearningAction,
        nextLearningReason: evolution.nextLearningReason,
        activeLearningFocuses: evolution.activeLearningFocuses,
      }),
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
    await options.insertScheduledTask({
      taskId: task.taskId,
      triggerAt: task.triggerAt,
      message: task.message,
      sourceTurnId: task.sourceTurnId ?? undefined,
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
    })
    return task
  }

  async function processDueLearningTasks(limit = 8) {
    const due = await options.claimDueScheduledTasks(options.now(), limit)
    let completed = 0
    let failed = 0
    for (const task of due.filter(item => String(item.taskId).startsWith(`learning:${options.getActiveCardId()}:`))) {
      try {
        const firedTurnId = `${task.taskId}:fired:${options.now()}`
        await options.appendAuditLog({
          level: 'notice',
          category: 'alicization.learning',
          action: 'alicization.learning.task.executed',
          message: 'Executed due learning action task.',
          payload: {
            taskId: task.taskId,
            triggerAt: task.triggerAt,
            sourceTurnId: task.sourceTurnId ?? null,
            message: task.message,
          },
        })
        await options.completeScheduledTask(task.taskId, firedTurnId, options.now())
        completed += 1
      }
      catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        await options.failScheduledTask(task.taskId, reason, options.now()).catch(() => {})
        failed += 1
      }
    }
    return {
      claimed: due.length,
      completed,
      failed,
    }
  }

  return {
    deriveLearningTask,
    scheduleLearningTask,
    processDueLearningTasks,
  }
}
