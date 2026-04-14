import { createContext as createWebContext } from '@moeru/eventa'
import { createContext as createBroadcastChannelContext } from '@moeru/eventa/adapters/broadcast-channel'

import { isElectronWindow } from './window'

type BroadcastChannelLike = {
  close: () => void
}

type SafeBroadcastContext = ReturnType<typeof createWebContext> | ReturnType<typeof createBroadcastChannelContext>['context']

function resolveWindowLike() {
  if (typeof globalThis !== 'object' || !('window' in globalThis))
    return undefined

  return (globalThis as { window?: unknown }).window
}

function shouldDisableBroadcastChannel(windowLike: unknown) {
  if (!isElectronWindow(windowLike))
    return false

  const location = (windowLike as { location?: { protocol?: string } }).location
  return location?.protocol === 'file:'
}

export function createSafeBroadcastChannelContext(
  name: string,
): {
  close: () => void
  context: SafeBroadcastContext
} {
  const windowLike = resolveWindowLike()
  const broadcastChannelCtor = (globalThis as { BroadcastChannel?: new (name: string) => BroadcastChannelLike }).BroadcastChannel
  if (typeof broadcastChannelCtor !== 'function' || !windowLike || shouldDisableBroadcastChannel(windowLike)) {
    return {
      close: () => {},
      context: createWebContext(),
    }
  }

  try {
    const channel = new broadcastChannelCtor(name)
    const { context } = createBroadcastChannelContext(
      channel as Parameters<typeof createBroadcastChannelContext>[0],
    )
    return {
      close: () => {
        try {
          channel.close()
        }
        catch {}
      },
      context,
    }
  }
  catch (error) {
    console.warn(`[broadcast-channel] failed to create shared context ${name}`, error)
    return {
      close: () => {},
      context: createWebContext(),
    }
  }
}
