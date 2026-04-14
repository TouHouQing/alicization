import { isElectronWindow } from './window'

type BroadcastChannelLike = {
  close: () => void
  postMessage: (payload: unknown) => void
}

function resolveWindowLike() {
  if (typeof globalThis !== 'object' || !('window' in globalThis))
    return undefined

  return (globalThis as { window?: unknown }).window
}

function shouldDisableBroadcastChannel() {
  const windowLike = resolveWindowLike()
  if (!windowLike)
    return false

  if (!isElectronWindow(windowLike))
    return false

  const location = (windowLike as { location?: { protocol?: string } }).location
  return location?.protocol === 'file:'
}

export interface LazyBroadcastPoster<T> {
  close: () => void
  post: (payload: T) => void
}

export function createLazyBroadcastPoster<T>(
  name: string,
  options?: {
    logLabel?: string
  },
): LazyBroadcastPoster<T> {
  const logLabel = options?.logLabel ?? name
  let channel: BroadcastChannelLike | null | undefined

  function getChannel() {
    if (channel !== undefined)
      return channel

    const broadcastChannelCtor = (globalThis as { BroadcastChannel?: new (name: string) => BroadcastChannelLike }).BroadcastChannel
    if (typeof broadcastChannelCtor !== 'function' || shouldDisableBroadcastChannel()) {
      channel = null
      return channel
    }

    try {
      channel = new broadcastChannelCtor(name)
    }
    catch (error) {
      channel = null
      console.warn(`[broadcast-channel] failed to create ${logLabel}`, error)
    }

    return channel
  }

  function post(payload: T) {
    try {
      getChannel()?.postMessage(payload)
    }
    catch (error) {
      console.warn(`[broadcast-channel] failed to post ${logLabel}`, error)
    }
  }

  function close() {
    try {
      channel?.close()
    }
    catch {}
    finally {
      channel = null
    }
  }

  return {
    close,
    post,
  }
}
