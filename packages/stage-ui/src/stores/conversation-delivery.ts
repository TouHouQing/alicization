import type { ConversationDeliveryState } from '../services/speech/conversation-delivery'
import type { ConversationReadRequest } from '../services/speech/conversation-delivery-bus'

import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { onScopeDispose, readonly, shallowRef } from 'vue'

import { deliveryKey, isConversationDeliveryState } from '../services/speech/conversation-delivery'
import { deliveryReadEvent, deliverySnapshotEvent, deliverySnapshotReplyEvent, deliveryStateEvent, deliveryStopEvent, getConversationDeliveryBusContext } from '../services/speech/conversation-delivery-bus'
import { useChatSessionStore } from './chat/session-store'
import { useAiriCardStore } from './modules/airi-card'

/** UI projection of actual host playback; persisted message data is only its cache. */
export const useConversationDeliveryStore = defineStore('conversation-delivery', () => {
  const states = shallowRef<Record<string, ConversationDeliveryState>>({})
  const context = getConversationDeliveryBusContext()
  const originId = nanoid()
  const session = useChatSessionStore()
  const cards = useAiriCardStore()
  const stopListeners = new Set<(key: string, epoch: string) => void>()
  const readListeners = new Set<(request: ConversationReadRequest) => void>()
  const hostKeys = new Set<string>()
  const retiredEpochs = new Set<string>()

  function accept(state: ConversationDeliveryState, snapshot = false) {
    if (!isConversationDeliveryState(state))
      return
    const key = deliveryKey(state)
    if (retiredEpochs.has(`${key}:${state.epoch}`))
      return
    const previous = states.value[key]
    if (snapshot && previous && previous.epoch !== state.epoch)
      return
    if (previous?.epoch === state.epoch && previous.revision >= state.revision)
      return
    // A known older epoch cannot regain ownership after another playback started.
    if (previous && previous.epoch !== state.epoch && state.revision !== 0)
      return
    if (previous && previous.epoch !== state.epoch) {
      retiredEpochs.add(`${key}:${previous.epoch}`)
      if (retiredEpochs.size > 512)
        retiredEpochs.delete(retiredEpochs.values().next().value!)
    }
    const next = { ...states.value, [key]: state }
    for (const old of Object.keys(next).slice(0, Math.max(0, Object.keys(next).length - 64))) {
      delete next[old]
      hostKeys.delete(old)
    }
    states.value = next
    if (session.sessionMetas[state.sessionId]?.characterId !== state.cardId)
      return
    const message = session.getSessionMessages(state.sessionId).find(message => message.role === 'assistant' && message.id && deliveryKey({ ...state, turnId: message.id }) === key)
    if (message?.role === 'assistant') {
      message.speechDelivery = state
      if (['completed', 'interrupted', 'failed'].includes(state.phase))
        session.persistSessionMessages(state.sessionId)
    }
  }

  function publish(state: ConversationDeliveryState) {
    hostKeys.add(deliveryKey(state))
    accept(state)
    context.emit(deliveryStateEvent, { originId, state })
  }

  const disposers = [
    context.on(deliveryStateEvent, ({ body }) => {
      if (body && body.originId !== originId)
        accept(body.state)
    }),
    context.on(deliveryStopEvent, ({ body }) => {
      if (body?.originId === originId || typeof body?.key !== 'string' || typeof body?.epoch !== 'string')
        return
      for (const listener of stopListeners)
        listener(body.key, body.epoch)
    }),
    context.on(deliveryReadEvent, ({ body }) => {
      const request = body?.request
      if (body?.originId === originId || !request || !validRead(request))
        return
      for (const listener of readListeners)
        listener(request)
    }),
    context.on(deliverySnapshotEvent, ({ body }) => {
      if (!body || body.originId === originId)
        return
      for (const key of hostKeys) {
        const state = states.value[key]
        if (state)
          context.emit(deliverySnapshotReplyEvent, { targetId: body.originId, state })
      }
    }),
    context.on(deliverySnapshotReplyEvent, ({ body }) => {
      if (body?.targetId === originId)
        accept(body.state, true)
    }),
  ]
  context.emit(deliverySnapshotEvent, { originId })
  onScopeDispose(() => disposers.forEach(dispose => dispose?.()))

  function stop(state: ConversationDeliveryState) {
    const key = deliveryKey(state)
    for (const listener of stopListeners)
      listener(key, state.epoch)
    context.emit(deliveryStopEvent, { originId, key, epoch: state.epoch })
  }
  function read(request: ConversationReadRequest) {
    if (!validRead(request))
      return
    for (const listener of readListeners)
      listener(request)
    context.emit(deliveryReadEvent, { originId, request })
  }
  function validRead(request: ConversationReadRequest) {
    return request && request.cardId === (cards.activeCardId || 'default') && request.sessionId === session.activeSessionId
      && typeof request.turnId === 'string' && request.turnId.length > 0 && request.turnId.length <= 512
      && typeof request.text === 'string' && request.text.trim().length > 0 && request.text.length <= 12000
  }
  function subscribe<T>(listeners: Set<T>, callback: T) {
    listeners.add(callback)
    return () => listeners.delete(callback)
  }
  return { states: readonly(states), publish, stop, read, onStop: (callback: (key: string, epoch: string) => void) => subscribe(stopListeners, callback), onRead: (callback: (request: ConversationReadRequest) => void) => subscribe(readListeners, callback), key: deliveryKey }
})
