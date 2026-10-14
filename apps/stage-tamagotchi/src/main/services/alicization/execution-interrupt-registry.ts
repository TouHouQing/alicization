export function createExecutionInterruptRegistry() {
  const controllers = new Map<string, AbortController>()
  async function run<T>(input: { cardId: string, threadId: string, signal?: AbortSignal }, task: (signal: AbortSignal) => Promise<T>) {
    const key = `${input.cardId}:${input.threadId}`
    if (controllers.has(key))
      throw new Error('This task already has an active execution owner')
    const controller = new AbortController()
    const signal = input.signal ? AbortSignal.any([input.signal, controller.signal]) : controller.signal
    controllers.set(key, controller)
    try {
      signal.throwIfAborted()
      return await task(signal)
    }
    finally {
      if (controllers.get(key) === controller)
        controllers.delete(key)
    }
  }
  function cancel(cardId: string, threadId: string) {
    controllers.get(`${cardId}:${threadId}`)?.abort(new DOMException('User cancelled the responsibility', 'AbortError'))
  }
  return { run, cancel }
}
