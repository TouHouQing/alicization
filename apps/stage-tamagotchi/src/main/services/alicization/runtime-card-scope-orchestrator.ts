import type { CardScopeOptions } from './runtime-soul'

interface AlicizationRuntimeCardScopeOrchestratorState {
  queue: Promise<unknown>
}

interface ActiveCardScopeLease {
  cardId: string
  lane: NonNullable<CardScopeOptions['lane']>
  label: string
  ready: Promise<void>
  resolveReady: () => void
  foregroundHandoff?: {
    count: number
    promise: Promise<void>
    resolve: () => void
    settled: boolean
  }
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
  let activeLease: ActiveCardScopeLease | null = null

  async function switchCardScope(nextCardIdRaw: unknown) {
    await options.switchCardScopeInner(nextCardIdRaw)
  }

  async function withCardScope<T>(nextCardIdRaw: unknown, task: () => Promise<T>, cardScopeOptions?: CardScopeOptions) {
    const requestedCardId = options.normalizeCardId(nextCardIdRaw)
    const label = options.sanitizeText(cardScopeOptions?.label, 'anonymous')
    const lane = cardScopeOptions?.lane ?? 'background'
    const queuedAt = options.now()
    const executeTask = async (input: {
      waitMs: number
      bypassedScopeOwnerLabel?: string
    }) => {
      if (input.bypassedScopeOwnerLabel) {
        await options.appendRuntimeDebugLine('card-scope.foreground-bypass', {
          label,
          requestedCardId,
          scopeOwnerLabel: input.bypassedScopeOwnerLabel,
          waitMs: input.waitMs,
        })
      }
      else if (label !== 'anonymous' || input.waitMs >= 250) {
        await options.appendRuntimeDebugLine('card-scope.acquired', {
          label,
          lane,
          requestedCardId,
          activeCardIdBeforeSwitch: options.getActiveCardId(),
          waitMs: input.waitMs,
        })
      }

      try {
        return await task()
      }
      finally {
        if (input.bypassedScopeOwnerLabel) {
          await options.appendRuntimeDebugLine('card-scope.foreground-completed', {
            label,
            requestedCardId,
            scopeOwnerLabel: input.bypassedScopeOwnerLabel,
            waitMs: input.waitMs,
            totalMs: options.now() - queuedAt,
          })
        }
        else if (label !== 'anonymous' || input.waitMs >= 250) {
          await options.appendRuntimeDebugLine('card-scope.completed', {
            label,
            lane,
            requestedCardId,
            activeCardIdAfterTask: options.getActiveCardId(),
            waitMs: input.waitMs,
            totalMs: options.now() - queuedAt,
          })
        }
      }
    }

    const foregroundCanShareReadyScope = lane === 'foreground'
      && activeLease?.cardId === requestedCardId
    if (foregroundCanShareReadyScope && activeLease) {
      const backgroundLease = activeLease
      await backgroundLease.ready.catch(() => {})
      if (activeLease === backgroundLease && options.getActiveCardId() === requestedCardId) {
        let releaseHandoff: (() => void) | undefined
        if (!backgroundLease.foregroundHandoff || backgroundLease.foregroundHandoff.settled) {
          let resolveHandoff!: () => void
          const promise = new Promise<void>((resolve) => {
            resolveHandoff = resolve
          })
          backgroundLease.foregroundHandoff = {
            count: 0,
            promise,
            resolve: resolveHandoff,
            settled: false,
          }
        }
        backgroundLease.foregroundHandoff.count += 1
        releaseHandoff = () => {
          const handoff = backgroundLease.foregroundHandoff
          if (!handoff)
            return
          handoff.count = Math.max(0, handoff.count - 1)
          if (handoff.count === 0 && !handoff.settled) {
            handoff.settled = true
            handoff.resolve()
          }
        }
        try {
          return await executeTask({
            waitMs: options.now() - queuedAt,
            bypassedScopeOwnerLabel: backgroundLease.label,
          })
        }
        finally {
          releaseHandoff()
        }
      }
    }

    if (
      cardScopeOptions?.skipQueueWhenScopeAlreadyActive
      && requestedCardId === options.getActiveCardId()
      && (!activeLease || activeLease.cardId === requestedCardId)
    ) {
      return await executeTask({
        waitMs: options.now() - queuedAt,
      })
    }

    if (
      lane === 'foreground'
      && requestedCardId === options.getActiveCardId()
      && !activeLease
    ) {
      return await executeTask({
        waitMs: options.now() - queuedAt,
      })
    }

    const execute = async () => {
      const waitMs = options.now() - queuedAt
      let resolveReady!: () => void
      const ready = new Promise<void>((resolve) => {
        resolveReady = resolve
      })
      const lease: ActiveCardScopeLease = {
        cardId: requestedCardId,
        lane,
        label,
        ready,
        resolveReady,
      }
      activeLease = lease
      const waitForForegroundHandoff = async () => {
        while (lease.foregroundHandoff && !lease.foregroundHandoff.settled)
          await lease.foregroundHandoff.promise
      }
      try {
        await switchCardScope(requestedCardId)
        lease.resolveReady()
        const result = await executeTask({
          waitMs,
        })
        await waitForForegroundHandoff()
        return result
      }
      catch (error) {
        lease.resolveReady()
        await waitForForegroundHandoff()
        throw error
      }
      finally {
        if (activeLease === lease)
          activeLease = null
      }
    }

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
