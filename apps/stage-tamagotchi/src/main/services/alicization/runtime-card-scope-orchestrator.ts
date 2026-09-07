import type { CardScopeOptions } from './runtime-soul'

import { AsyncLocalStorage } from 'node:async_hooks'

interface AlicizationRuntimeCardScopeOrchestratorState {
  queue: Promise<unknown>
}

interface ActiveCardScopeLease {
  cardId: string
  lane: NonNullable<CardScopeOptions['lane']>
  label: string
  abort: (reason?: unknown) => void
  disposeAbort: () => void
  ready: Promise<void>
  resolveReady: () => void
  slotReleased: Promise<void>
  resolveSlotReleased: () => void
  taskCompleted: boolean
  finalized: boolean
  retainedForegroundCount: number
  finalize?: () => void
  foregroundHandoff?: {
    count: number
    promise: Promise<void>
    resolve: () => void
    settled: boolean
  }
}

interface CardScopeTaskContext {
  signal: AbortSignal
}

interface CardScopeExecutionContext {
  cardId: string
  lane: NonNullable<CardScopeOptions['lane']>
  lease: ActiveCardScopeLease
}

interface QueuedCardScopeTask<T> {
  execute: () => Promise<T>
  reject: (reason?: unknown) => void
  resolve: (value: T | PromiseLike<T>) => void
  hold?: Promise<void>
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

function createCardScopeAbortController(externalSignal?: AbortSignal) {
  const controller = new AbortController()
  if (!externalSignal)
    return { controller, dispose: () => {} }

  const abortFromExternalSignal = () => {
    if (!controller.signal.aborted)
      controller.abort(externalSignal.reason)
  }
  if (externalSignal.aborted)
    abortFromExternalSignal()
  else
    externalSignal.addEventListener('abort', abortFromExternalSignal, { once: true })

  return {
    controller,
    dispose: () => externalSignal.removeEventListener('abort', abortFromExternalSignal),
  }
}

export function createAlicizationRuntimeCardScopeOrchestrator(
  options: CreateAlicizationRuntimeCardScopeOrchestratorOptions,
) {
  const maxForegroundQueueBurst = 4
  let activeLease: ActiveCardScopeLease | null = null
  let drainingScopeQueue = false
  let foregroundTasksSinceBackground = 0
  const scopeStorage = new AsyncLocalStorage<CardScopeExecutionContext>()
  const foregroundQueue: QueuedCardScopeTask<unknown>[] = []
  const backgroundQueue: QueuedCardScopeTask<unknown>[] = []

  const scheduleScopeQueueDrain = () => {
    if (drainingScopeQueue)
      return

    drainingScopeQueue = true
    const drain = async () => {
      while (foregroundQueue.length > 0 || backgroundQueue.length > 0) {
        const hasForeground = foregroundQueue.length > 0
        const hasBackground = backgroundQueue.length > 0
        const takeBackground = hasBackground
          && (!hasForeground || foregroundTasksSinceBackground >= maxForegroundQueueBurst)
        const queued = takeBackground
          ? backgroundQueue.shift()
          : foregroundQueue.shift() ?? backgroundQueue.shift()
        if (!queued)
          continue
        if (takeBackground)
          foregroundTasksSinceBackground = 0
        else if (hasForeground)
          foregroundTasksSinceBackground += 1
        try {
          queued.resolve(await queued.execute())
        }
        catch (error) {
          queued.reject(error)
        }
        if (queued.hold)
          await queued.hold
      }
    }
    const next = options.scopeLifecycleQueueState.queue.then(drain, drain)
    options.scopeLifecycleQueueState.queue = next.then(() => undefined, () => undefined)
    void next.finally(() => {
      drainingScopeQueue = false
      if (foregroundQueue.length > 0 || backgroundQueue.length > 0)
        scheduleScopeQueueDrain()
    })
  }

  const enqueueScopeTask = <T>(
    lane: NonNullable<CardScopeOptions['lane']>,
    execute: (queued: QueuedCardScopeTask<T>) => Promise<T>,
  ) => {
    let queued!: QueuedCardScopeTask<T>
    const pending = new Promise<T>((resolve, reject) => {
      queued = {
        execute: async () => await execute(queued),
        reject,
        resolve,
      }
    })
    if (lane === 'foreground')
      foregroundQueue.push(queued as QueuedCardScopeTask<unknown>)
    else
      backgroundQueue.push(queued as QueuedCardScopeTask<unknown>)
    scheduleScopeQueueDrain()
    return pending
  }

  async function switchCardScope(nextCardIdRaw: unknown) {
    await options.switchCardScopeInner(nextCardIdRaw)
  }

  async function withCardScope<T>(
    nextCardIdRaw: unknown,
    task: (context: CardScopeTaskContext) => Promise<T>,
    cardScopeOptions?: CardScopeOptions,
  ) {
    const requestedCardId = options.normalizeCardId(nextCardIdRaw)
    const label = options.sanitizeText(cardScopeOptions?.label, 'anonymous')
    const lane = cardScopeOptions?.lane ?? 'background'
    const queuedAt = options.now()
    const taskAbort = createCardScopeAbortController(cardScopeOptions?.signal)
    const throwIfTaskAborted = () => {
      if (taskAbort.controller.signal.aborted)
        throw taskAbort.controller.signal.reason ?? new DOMException('Card scope task aborted', 'AbortError')
    }
    const executeTask = async (input: {
      waitMs: number
      bypassedScopeOwnerLabel?: string
      effectiveLane?: NonNullable<CardScopeOptions['lane']>
    }) => {
      throwIfTaskAborted()
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
          lane: input.effectiveLane ?? lane,
          requestedCardId,
          activeCardIdBeforeSwitch: options.getActiveCardId(),
          waitMs: input.waitMs,
        })
      }

      try {
        return await task({
          signal: taskAbort.controller.signal,
        })
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
            lane: input.effectiveLane ?? lane,
            requestedCardId,
            activeCardIdAfterTask: options.getActiveCardId(),
            waitMs: input.waitMs,
            totalMs: options.now() - queuedAt,
          })
        }
      }
    }

    const inheritedScope = scopeStorage.getStore()
    if (
      inheritedScope
      && inheritedScope.lease === activeLease
      && inheritedScope.cardId !== requestedCardId
    ) {
      const error = Object.assign(
        new Error(
          `Cannot enter card scope "${requestedCardId}" while card scope "${inheritedScope.cardId}" is active. `
          + 'Finish the outer card-scoped task before switching cards.',
        ),
        {
          code: 'card-scope-cross-card-reentrancy',
          activeCardId: inheritedScope.cardId,
          requestedCardId,
          scopeOwnerLabel: inheritedScope.lease.label,
        },
      )
      taskAbort.dispose()
      void options.appendRuntimeDebugLine('card-scope.cross-card-reentrancy', {
        label,
        requestedCardId,
        activeCardId: inheritedScope.cardId,
        scopeOwnerLabel: inheritedScope.lease.label,
      }).catch(() => {})
      throw error
    }

    if (
      lane === 'foreground'
      && activeLease?.lane === 'background'
      && activeLease.cardId !== requestedCardId
    ) {
      activeLease.abort(new DOMException('Foreground card scope requested', 'AbortError'))
    }

    const foregroundCanShareReadyScope = lane === 'foreground'
      && activeLease?.lane === 'background'
      && activeLease?.cardId === requestedCardId
    if (foregroundCanShareReadyScope && activeLease) {
      const backgroundLease = activeLease
      await backgroundLease.ready.catch(() => {})
      if (activeLease === backgroundLease && options.getActiveCardId() === requestedCardId) {
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
        const releaseHandoff = () => {
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
          return await scopeStorage.run({
            cardId: requestedCardId,
            lane: 'foreground',
            lease: backgroundLease,
          }, async () => await executeTask({
            waitMs: options.now() - queuedAt,
            bypassedScopeOwnerLabel: backgroundLease.label,
            effectiveLane: 'foreground',
          }))
        }
        finally {
          releaseHandoff()
          taskAbort.dispose()
        }
      }
    }

    if (
      inheritedScope
      && inheritedScope.lease === activeLease
      && inheritedScope.cardId === requestedCardId
    ) {
      try {
        return await scopeStorage.run(inheritedScope, async () => await executeTask({
          waitMs: options.now() - queuedAt,
          bypassedScopeOwnerLabel: inheritedScope.lease.label,
          effectiveLane: inheritedScope.lane,
        }))
      }
      finally {
        taskAbort.dispose()
      }
    }

    if (
      cardScopeOptions?.skipQueueWhenScopeAlreadyActive
      && requestedCardId === options.getActiveCardId()
      && activeLease?.cardId === requestedCardId
    ) {
      const sharedLease = activeLease
      await sharedLease.ready.catch(() => {})
      if (activeLease === sharedLease && options.getActiveCardId() === requestedCardId) {
        try {
          return await scopeStorage.run({
            cardId: requestedCardId,
            lane,
            lease: sharedLease,
          }, async () => await executeTask({
            waitMs: options.now() - queuedAt,
            effectiveLane: lane,
          }))
        }
        finally {
          taskAbort.dispose()
        }
      }
    }

    const execute = async (queued: QueuedCardScopeTask<T>) => {
      const waitMs = options.now() - queuedAt
      let resolveReady!: () => void
      const ready = new Promise<void>((resolve) => {
        resolveReady = resolve
      })
      let resolveSlotReleased!: () => void
      const slotReleased = new Promise<void>((resolve) => {
        resolveSlotReleased = resolve
      })
      const lease: ActiveCardScopeLease = {
        cardId: requestedCardId,
        lane,
        label,
        abort: (reason) => {
          if (!taskAbort.controller.signal.aborted)
            taskAbort.controller.abort(reason)
        },
        disposeAbort: taskAbort.dispose,
        ready,
        resolveReady,
        slotReleased,
        resolveSlotReleased,
        taskCompleted: false,
        finalized: false,
        retainedForegroundCount: 0,
      }
      activeLease = lease
      queued.hold = lease.slotReleased
      const finalizeLease = () => {
        if (
          lease.finalized
          || !lease.taskCompleted
          || lease.retainedForegroundCount > 0
        ) {
          return
        }
        lease.finalized = true
        if (activeLease === lease)
          activeLease = null
        lease.disposeAbort()
        lease.resolveSlotReleased()
      }
      lease.finalize = finalizeLease
      const waitForForegroundHandoff = async () => {
        while (lease.foregroundHandoff && !lease.foregroundHandoff.settled)
          await lease.foregroundHandoff.promise
      }
      const scopeContext: CardScopeExecutionContext = {
        cardId: requestedCardId,
        lane,
        lease,
      }
      try {
        const result = await scopeStorage.run(scopeContext, async () => {
          throwIfTaskAborted()
          if (options.getActiveCardId() !== requestedCardId)
            await switchCardScope(requestedCardId)
          throwIfTaskAborted()
          lease.resolveReady()
          const taskResult = await executeTask({
            waitMs,
          })
          await waitForForegroundHandoff()
          return taskResult
        })
        lease.taskCompleted = true
        finalizeLease()
        return result
      }
      catch (error) {
        lease.resolveReady()
        await waitForForegroundHandoff()
        lease.taskCompleted = true
        finalizeLease()
        throw error
      }
    }

    return await enqueueScopeTask(lane, execute)
  }

  const retainCurrentForegroundScope = () => {
    const currentScope = scopeStorage.getStore()
    if (
      !currentScope
      || currentScope.lane !== 'foreground'
      || activeLease !== currentScope.lease
      || currentScope.lease.finalized
    ) {
      throw new Error('Cannot retain a foreground card scope outside an active foreground task.')
    }

    const lease = currentScope.lease
    lease.retainedForegroundCount += 1
    let released = false
    return () => {
      if (released)
        return
      released = true
      lease.retainedForegroundCount = Math.max(0, lease.retainedForegroundCount - 1)
      if (
        lease.taskCompleted
        && lease.retainedForegroundCount === 0
      ) {
        lease.finalize?.()
      }
    }
  }

  return {
    switchCardScope,
    withCardScope,
    retainCurrentForegroundScope,
  }
}

export type AlicizationRuntimeCardScopeOrchestrator = ReturnType<typeof createAlicizationRuntimeCardScopeOrchestrator>
