export const asyncExtractionBatchThreshold = 10
export const asyncExtractionIdleMs = 5 * 60 * 1000
export const asyncExtractionBudgetWindowMs = 60 * 60 * 1000
export const asyncExtractionMaxBatchesPerWindow = 12

export interface AsyncExtractionBudgetState {
  windowStartedAt: number
  consumed: number
}

export function evaluateAsyncExtractionTrigger(input: {
  pendingCount: number
  lastQueuedAt: number | null
  now: number
}) {
  if (input.pendingCount >= asyncExtractionBatchThreshold)
    return 'batch' as const
  if (input.pendingCount > 0 && input.lastQueuedAt != null && input.now - input.lastQueuedAt >= asyncExtractionIdleMs)
    return 'idle' as const
  return 'none' as const
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
