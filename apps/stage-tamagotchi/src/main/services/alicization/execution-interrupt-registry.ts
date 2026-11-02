import type { ExecutionResourceBroker } from './execution/resource-broker'

export function createExecutionInterruptRegistry(broker?: ExecutionResourceBroker, priority?: { foregroundActive: () => boolean }) {
  const controllers = new Map<string, { cardId: string, controller: AbortController, backgroundInitiative: boolean }>()
  const foregroundReason = () => new DOMException('Background initiative yielded to foreground work', 'AbortError')
  async function run<T>(input: { cardId: string, threadId: string, signal?: AbortSignal, confirmStopped?: () => Promise<boolean>, coordinateSteps?: true, backgroundInitiative?: true, foregroundInvitation?: () => Promise<void> }, task: (signal: AbortSignal) => Promise<T>) {
    const key = JSON.stringify([input.cardId, input.threadId])
    if (controllers.has(key))
      throw new Error('This task already has an active execution owner')
    const controller = new AbortController()
    const signal = input.signal ? AbortSignal.any([input.signal, controller.signal]) : controller.signal
    controllers.set(key, { cardId: input.cardId, controller, backgroundInitiative: input.backgroundInitiative === true })
    let lease: ReturnType<ExecutionResourceBroker['acquire']> | undefined
    let heartbeat: ReturnType<typeof setInterval> | undefined
    let taskStarted = false
    try {
      // A main-owned invitation inherits its live human turn; a new turn still
      // cancels this initiative through the normal interruption registry.
      if (input.foregroundInvitation)
        await input.foregroundInvitation()
      if (input.backgroundInitiative && !input.foregroundInvitation && priority?.foregroundActive())
        controller.abort(foregroundReason())
      signal.throwIfAborted()
      lease = broker ? await broker.acquireWhenFree({ owner: key, resources: ['host:execution'], ttlMs: 300_000, ...(input.coordinateSteps ? { coordinationOnly: true as const } : {}) }, signal) : undefined
      if (lease) {
        heartbeat = setInterval(() => {
          try { broker!.renew(lease!, 300_000) }
          catch (error) { controller.abort(error) }
        }, 30_000)
        heartbeat.unref?.()
      }
      if (input.foregroundInvitation)
        await input.foregroundInvitation()
      if (input.backgroundInitiative && !input.foregroundInvitation && priority?.foregroundActive())
        controller.abort(foregroundReason())
      signal.throwIfAborted()
      taskStarted = true
      return await (broker ? broker.withOwner(key, () => task(signal)) : task(signal))
    }
    finally {
      clearInterval(heartbeat)
      if (lease) {
        // An abort requests stopping. Only an adapter/ledger acknowledgement
        // after the task returns may release a cancelled owner's global lease.
        const stopped = !taskStarted || !signal.aborted || await input.confirmStopped?.().catch(() => false) === true
        broker!.settle(lease, { stopped, uncertain: !stopped })
      }
      if (controllers.get(key)?.controller === controller)
        controllers.delete(key)
    }
  }
  function cancel(cardId: string, threadId: string) {
    const controller = controllers.get(JSON.stringify([cardId, threadId]))?.controller
    controller?.abort(new DOMException('User cancelled the responsibility', 'AbortError'))
    return { requested: Boolean(controller), stopped: !controller, state: controller ? 'stopping' : 'stopped' }
  }
  function cancelAll(cardId?: string) {
    let requested = 0
    for (const entry of controllers.values()) {
      if (cardId !== undefined && entry.cardId !== cardId)
        continue
      entry.controller.abort(new DOMException('Execution was suspended', 'AbortError'))
      requested++
    }
    return { requested, state: requested ? 'stopping' : 'stopped' }
  }
  function cancelInitiatives() {
    let requested = 0
    for (const entry of controllers.values()) {
      if (!entry.backgroundInitiative || entry.controller.signal.aborted)
        continue
      entry.controller.abort(foregroundReason())
      requested++
    }
    return { requested, state: requested ? 'stopping' : 'stopped' }
  }
  return { run, cancel, cancelAll, cancelInitiatives, isActive: () => controllers.size > 0 }
}
