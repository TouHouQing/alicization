import type { ConversationDeliveryState } from './conversation-delivery'

import { createContext as createLocalContext, defineEventa } from '@moeru/eventa'
import { createContext as createBroadcastContext } from '@moeru/eventa/adapters/broadcast-channel'

export interface ConversationReadRequest {
  cardId: string
  sessionId: string
  turnId: string
  text: string
}

export const deliveryStateEvent = defineEventa<{ originId: string, state: ConversationDeliveryState }>('eventa:conversation:delivery:state')
export const deliveryStopEvent = defineEventa<{ originId: string, key: string, epoch: string }>('eventa:conversation:delivery:stop')
export const deliveryReadEvent = defineEventa<{ originId: string, request: ConversationReadRequest }>('eventa:conversation:delivery:read')
export const deliverySnapshotEvent = defineEventa<{ originId: string }>('eventa:conversation:delivery:snapshot')
export const deliverySnapshotReplyEvent = defineEventa<{ targetId: string, state: ConversationDeliveryState }>('eventa:conversation:delivery:snapshot-reply')

let context: ReturnType<typeof createLocalContext> | ReturnType<typeof createBroadcastContext>['context'] | undefined

export function getConversationDeliveryBusContext() {
  // Unlike the general speech bus, these bounded, clone-safe projections must
  // cross packaged file:// windows, just as the existing chat lifecycle does.
  // The host remains the sole playback owner; this channel cannot execute tools.
  context ??= typeof window !== 'undefined' && typeof BroadcastChannel === 'function'
    ? createBroadcastContext(new BroadcastChannel('alicization:conversation-delivery')).context
    : createLocalContext()
  return context
}
