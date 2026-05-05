import type {
  AlicizationLearningExecutionStateSnapshot,
  AlicizationLearningTaskStatus,
  AlicizationSelfEvolutionKernelSnapshot,
} from './alicization-transport-contracts'

export type AlicizationLearningExecutionProjectionMode = 'advisory-only' | 'browser-local-scheduled'

export interface AlicizationLearningExecutionProjectionInput {
  persistedState?: AlicizationLearningExecutionStateSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  projectionMode?: AlicizationLearningExecutionProjectionMode
}

function sanitizeText(raw: unknown, maxChars = 140) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 12) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 140)
    if (!normalized)
      continue
    if (result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

export function deriveAlicizationLearningExecutionProjection(
  input: AlicizationLearningExecutionProjectionInput,
): AlicizationLearningExecutionStateSnapshot | null {
  if (input.persistedState)
    return input.persistedState

  const selfEvolution = input.selfEvolution ?? null
  if (!selfEvolution)
    return null

  const nextLearningAction = selfEvolution.nextLearningAction ?? null
  const hasExecutableAction = Boolean(nextLearningAction && nextLearningAction !== 'hold')
  const currentStatus: AlicizationLearningTaskStatus | null = hasExecutableAction && input.projectionMode === 'browser-local-scheduled'
    ? 'scheduled'
    : null

  return {
    currentTaskId: null,
    currentStatus,
    currentAttemptCount: 0,
    currentMaxAttempts: 0,
    currentNextRetryAt: null,
    currentBlockedReason: null,
    currentFailureKind: null,
    nextLearningAction,
    shouldRecord: selfEvolution.shouldRecord,
    shouldReflect: selfEvolution.shouldReflect,
    shouldVerify: selfEvolution.shouldVerify,
    shouldRevise: selfEvolution.shouldRevise,
    shouldInternalize: selfEvolution.shouldInternalize,
    activeLearningFocuses: uniqueTexts(selfEvolution.activeLearningFocuses ?? [], 12),
    queuedTaskCount: currentStatus === 'scheduled' ? 1 : 0,
    runningTaskCount: 0,
    blockedTaskCount: 0,
    recentTaskIds: [],
    lastCompletedTaskId: null,
    lastCompletedAction: null,
    lastCompletedSummary: null,
    lastFailureTaskId: null,
    lastFailureKind: null,
    lastFailureReason: null,
    lastFailureNextRetryAt: null,
    updatedAt: Number.isFinite(Number(selfEvolution.updatedAt)) ? Math.max(0, Math.floor(Number(selfEvolution.updatedAt))) : null,
  }
}
