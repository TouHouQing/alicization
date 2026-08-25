import { createAbortError } from './main-chat-stream-primitives'

export function raceAlicizationMainChatPreparation<T>(input: {
  preparationPromise: PromiseLike<T>
  signal: AbortSignal
}) {
  if (input.signal.aborted) {
    return Promise.reject(
      input.signal.reason ?? createAbortError('aborted'),
    )
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false
    let abortHandler = () => {}
    const cleanup = () => {
      input.signal.removeEventListener('abort', abortHandler)
    }
    const resolveOnce = (value: T) => {
      if (settled)
        return
      settled = true
      cleanup()
      resolve(value)
    }
    const rejectOnce = (error: unknown) => {
      if (settled)
        return
      settled = true
      cleanup()
      reject(error)
    }
    abortHandler = () => {
      rejectOnce(
        input.signal.reason ?? createAbortError('aborted'),
      )
    }

    input.signal.addEventListener('abort', abortHandler, { once: true })
    // Abort can happen synchronously while addEventListener is executing. A
    // second check closes that small race for custom/bridged AbortSignals.
    if (input.signal.aborted) {
      abortHandler()
      return
    }
    void Promise.resolve(input.preparationPromise).then(resolveOnce, rejectOnce)
  })
}

export function armAlicizationMainChatPreparationDeadline(input: {
  parentSignal: AbortSignal
  timeoutMs: number
  onTimeout?: () => void
}) {
  const controller = new AbortController()
  let cleared = false
  const abortFromParent = () => {
    if (controller.signal.aborted)
      return
    controller.abort(
      input.parentSignal.reason ?? createAbortError('aborted'),
    )
  }
  if (input.parentSignal.aborted) {
    abortFromParent()
  }
  else {
    input.parentSignal.addEventListener('abort', abortFromParent, { once: true })
    // The parent may abort during listener registration, before the event is
    // delivered to the newly registered handler.
    if (input.parentSignal.aborted)
      abortFromParent()
  }

  const timer = setTimeout(() => {
    if (cleared || controller.signal.aborted)
      return

    input.onTimeout?.()
    controller.abort(createAbortError('chat-preparation-timeout'))
  }, Math.max(0, input.timeoutMs))

  const clear = () => {
    if (cleared)
      return
    cleared = true
    clearTimeout(timer)
    input.parentSignal.removeEventListener('abort', abortFromParent)
  }

  return {
    clear,
    signal: controller.signal,
  }
}
