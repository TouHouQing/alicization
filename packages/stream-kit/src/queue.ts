export interface HandlerContext<T> {
  data: T
  emit: (eventName: string, ...params: any[]) => void
}

export interface Events<T> {
  enqueue: Array<(payload: T, queueLength: number) => void>
  dequeue: Array<(payload: T, queueLength: number) => void>
  process: Array<(payload: T, handler: (param: HandlerContext<T>) => Promise<any>) => void>
  error: Array<(payload: T, error: unknown, handler: (param: HandlerContext<T>) => Promise<any>) => void>
  result: Array<<R>(payload: T, result: R, handler: (param: HandlerContext<T>) => Promise<any>) => void>
  drain: Array<() => void>
}

export function createQueue<T>(options: {
  handlers: Array<(ctx: HandlerContext<T>) => Promise<void>>
}) {
  const queue: T[] = []
  let drainTask: Promise<unknown[]> | undefined

  const internalEventListeners: Events<T> = {
    enqueue: [],
    dequeue: [],
    process: [],
    error: [],
    result: [],
    drain: [],
  }
  const internalHandlerEventListeners: Record<string, Array<(...params: any[]) => void>> = {}

  function on<E extends keyof Events<T>>(eventName: E, listener: Events<T>[E][number]) {
    internalEventListeners[eventName].push(listener as any)
  }

  function emit<E extends keyof Events<T>>(eventName: E, ...params: Parameters<Events<T>[E][number]>) {
    const listeners = internalEventListeners[eventName] as Events<T>[E]
    listeners.forEach((listener) => {
      try {
        ;(listener as any)(...params)
      }
      catch {
        // Lifecycle observers must never interrupt queue consumption.
      }
    })
  }

  function onHandlerEvent(eventName: string, listener: (...params: any[]) => void) {
    internalHandlerEventListeners[eventName] = internalHandlerEventListeners[eventName] || []
    internalHandlerEventListeners[eventName].push(listener)
  }

  function emitHandlerEvent(eventName: string, ...params: any[]) {
    const listeners = internalHandlerEventListeners[eventName] || []
    listeners.forEach(listener => listener(...params))
  }

  function enqueue(payload: T) {
    queue.push(payload)
    emit('enqueue', payload, queue.length)
    ensureDrain()
  }

  function clear() {
    queue.length = 0
  }

  async function drain() {
    const errors: unknown[] = []
    do {
      while (queue.length > 0) {
        const payload = queue.shift() as T
        emit('dequeue', payload, queue.length)
        for (const handler of options.handlers) {
          emit('process', payload, handler)
          try {
            const result = await handler({ data: payload, emit: emitHandlerEvent })
            emit('result', payload, result, handler)
          }
          catch (err) {
            emit('error', payload, err, handler)
            errors.push(err)
            continue
          }
        }
      }

      emit('drain')
    } while (queue.length > 0)

    return errors
  }

  function ensureDrain() {
    if (drainTask)
      return

    let resolveTask!: (errors: unknown[]) => void
    let rejectTask!: (error: unknown) => void
    const task = new Promise<unknown[]>((resolve, reject) => {
      resolveTask = resolve
      rejectTask = reject
    })
    drainTask = task
    void drain().then(resolveTask, rejectTask)
    void task.then(
      () => finishDrain(task),
      () => finishDrain(task),
    )
  }

  function finishDrain(task: Promise<unknown[]>) {
    if (drainTask !== task)
      return

    drainTask = undefined
    if (queue.length > 0)
      ensureDrain()
  }

  function length() {
    return queue.length
  }

  async function waitForIdle() {
    const errors: unknown[] = []
    let task = drainTask
    while (task) {
      errors.push(...await task)
      task = drainTask
    }

    if (errors.length === 1)
      throw errors[0]
    if (errors.length > 1)
      throw new AggregateError(errors, `${errors.length} queue handlers failed`)
  }

  return {
    enqueue,
    clear,
    length,
    waitForIdle,
    on,
    onHandlerEvent,
  }
}

export type UseQueueReturn<T> = ReturnType<typeof createQueue<T>>
