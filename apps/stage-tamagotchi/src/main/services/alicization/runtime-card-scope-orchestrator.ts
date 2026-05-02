import type { CardScopeOptions } from './runtime-soul'

interface AlicizationRuntimeCardScopeOrchestratorState {
  queue: Promise<unknown>
}

interface CreateAlicizationRuntimeCardScopeOrchestratorOptions {
  scopeLifecycleQueueState: AlicizationRuntimeCardScopeOrchestratorState
  now: () => number
  getActiveCardId: () => string
  normalizeCardId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
  appendRuntimeDebugLine: (event: string, payload?: Record<string, unknown>) => Promise<void>
  switchCardScopeInner: (nextCardIdRaw: unknown) => Promise<void>
}

export function createAlicizationRuntimeCardScopeOrchestrator(
  options: CreateAlicizationRuntimeCardScopeOrchestratorOptions,
) {
  async function switchCardScope(nextCardIdRaw: unknown) {
    await options.switchCardScopeInner(nextCardIdRaw)
  }

  async function withCardScope<T>(nextCardIdRaw: unknown, task: () => Promise<T>, cardScopeOptions?: CardScopeOptions) {
    const requestedCardId = options.normalizeCardId(nextCardIdRaw)
    const label = options.sanitizeText(cardScopeOptions?.label, 'anonymous')
    const queuedAt = options.now()
    const execute = async () => {
      const waitMs = options.now() - queuedAt
      if (label !== 'anonymous' || waitMs >= 250) {
        await options.appendRuntimeDebugLine('card-scope.acquired', {
          label,
          requestedCardId,
          activeCardIdBeforeSwitch: options.getActiveCardId(),
          waitMs,
        })
      }
      await switchCardScope(requestedCardId)
      try {
        return await task()
      }
      finally {
        if (label !== 'anonymous' || waitMs >= 250) {
          await options.appendRuntimeDebugLine('card-scope.completed', {
            label,
            requestedCardId,
            activeCardIdAfterTask: options.getActiveCardId(),
            waitMs,
            totalMs: options.now() - queuedAt,
          })
        }
      }
    }

    if (cardScopeOptions?.skipQueueWhenScopeAlreadyActive && requestedCardId === options.getActiveCardId())
      return await task()

    const next = options.scopeLifecycleQueueState.queue.then(execute, execute)
    options.scopeLifecycleQueueState.queue = next.then(() => undefined, () => undefined)
    return await next
  }

  return {
    switchCardScope,
    withCardScope,
  }
}

export type AlicizationRuntimeCardScopeOrchestrator = ReturnType<typeof createAlicizationRuntimeCardScopeOrchestrator>
