export const asyncExtractionBatchThreshold = 10
export const asyncExtractionIdleMs = 5 * 60 * 1000
export const asyncExtractionBudgetWindowMs = 60 * 60 * 1000
export const asyncExtractionMaxBatchesPerWindow = 12
export const asyncExtractionMaxPendingTurns = 48
export const asyncExtractionForcePriorityThreshold = 210

export interface AsyncExtractionBudgetState {
  windowStartedAt: number
  consumed: number
}

export interface AsyncExtractionQueueEntry {
  turnId: string
  dedupeKey: string
  priority: number
  queuedAt: number
}

export function evaluateAsyncExtractionTrigger(input: {
  forceFlush?: boolean
  highestPriority?: number | null
  pendingCount: number
  lastQueuedAt: number | null
  now: number
}) {
  if (input.forceFlush)
    return 'force' as const
  if (Number.isFinite(input.highestPriority) && Number(input.highestPriority) >= asyncExtractionForcePriorityThreshold)
    return 'force' as const
  if (input.pendingCount >= asyncExtractionBatchThreshold)
    return 'batch' as const
  if (input.pendingCount > 0 && input.lastQueuedAt != null && input.now - input.lastQueuedAt >= asyncExtractionIdleMs)
    return 'idle' as const
  return 'none' as const
}

export function hasAsyncExtractionDuplicate<T extends Pick<AsyncExtractionQueueEntry, 'turnId' | 'dedupeKey'>>(
  pending: T[],
  incoming: T,
) {
  return pending.some(item => item.turnId === incoming.turnId || item.dedupeKey === incoming.dedupeKey)
}

export function pickAsyncExtractionBatch<T extends AsyncExtractionQueueEntry>(input: {
  pending: T[]
  batchSize?: number
}) {
  const batchSize = Math.max(1, input.batchSize ?? asyncExtractionBatchThreshold)
  if (input.pending.length === 0) {
    return {
      batch: [] as T[],
      remaining: [] as T[],
    }
  }

  const ranked = input.pending
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      if (right.item.priority !== left.item.priority)
        return right.item.priority - left.item.priority
      if (left.item.queuedAt !== right.item.queuedAt)
        return left.item.queuedAt - right.item.queuedAt
      return left.index - right.index
    })

  const selectedIndexSet = new Set(
    ranked
      .slice(0, batchSize)
      .map(item => item.index),
  )

  return {
    batch: ranked.slice(0, batchSize).map(item => item.item),
    remaining: input.pending.filter((_, index) => !selectedIndexSet.has(index)),
  }
}

export function trimAsyncExtractionQueue<T extends AsyncExtractionQueueEntry>(input: {
  pending: T[]
  maxPending?: number
}) {
  const maxPending = Math.max(1, input.maxPending ?? asyncExtractionMaxPendingTurns)
  if (input.pending.length <= maxPending) {
    return {
      queue: input.pending,
      dropped: [] as T[],
    }
  }

  const dropCount = input.pending.length - maxPending
  const rankedForDrop = input.pending
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      if (left.item.priority !== right.item.priority)
        return left.item.priority - right.item.priority
      if (left.item.queuedAt !== right.item.queuedAt)
        return left.item.queuedAt - right.item.queuedAt
      return left.index - right.index
    })

  const dropIndexSet = new Set(
    rankedForDrop
      .slice(0, dropCount)
      .map(item => item.index),
  )

  return {
    queue: input.pending.filter((_, index) => !dropIndexSet.has(index)),
    dropped: input.pending.filter((_, index) => dropIndexSet.has(index)),
  }
}

export function evaluateAsyncExtractionBudget(input: {
  state: AsyncExtractionBudgetState
  now: number
}) {
  let nextWindowStartedAt = input.state.windowStartedAt
  let nextConsumed = input.state.consumed

  if (input.now - nextWindowStartedAt >= asyncExtractionBudgetWindowMs) {
    nextWindowStartedAt = input.now
    nextConsumed = 0
  }

  if (nextConsumed >= asyncExtractionMaxBatchesPerWindow) {
    return {
      allowed: false,
      nextState: {
        windowStartedAt: nextWindowStartedAt,
        consumed: nextConsumed,
      } satisfies AsyncExtractionBudgetState,
    }
  }

  nextConsumed += 1
  return {
    allowed: true,
    nextState: {
      windowStartedAt: nextWindowStartedAt,
      consumed: nextConsumed,
    } satisfies AsyncExtractionBudgetState,
  }
}
