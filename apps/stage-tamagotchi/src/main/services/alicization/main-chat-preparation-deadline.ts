import { createAbortError } from './main-chat-stream-primitives'

export function raceAlicizationMainChatPreparation<T>(input: {
  preparationPromise: PromiseLike<T>
  signal: AbortSignal
}) {
  if (input.signal.aborted) {
    return Promise.reject(
      input.signal.reason ?? createAbortError('chat-preparation-timeout'),
    )
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false
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
    const abortHandler = () => {
      rejectOnce(
        input.signal.reason ?? createAbortError('chat-preparation-timeout'),
      )
    }

    input.signal.addEventListener('abort', abortHandler, { once: true })
    void Promise.resolve(input.preparationPromise).then(resolveOnce, rejectOnce)
  })
}

export function armAlicizationMainChatPreparationDeadline(input: {
  controller: AbortController
  timeoutMs: number
  onTimeout?: () => void
}) {
  let cleared = false
  const timer = setTimeout(() => {
    if (cleared || input.controller.signal.aborted)
      return

    input.onTimeout?.()
    input.controller.abort(createAbortError('chat-preparation-timeout'))
  }, Math.max(0, input.timeoutMs))

  return () => {
    if (cleared)
      return
    cleared = true
    clearTimeout(timer)
  }
}
