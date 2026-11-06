import type { ConversationDeliveryState } from '../services/speech/conversation-delivery'

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useConversationDeliveryStore } from './conversation-delivery'

const ports = vi.hoisted(() => ({
  listeners: new Map<unknown, Set<(event: { body: any }) => void>>(),
  activeSessionId: 'session',
  activeCardId: 'card',
  messages: [{ role: 'assistant', id: 'turn', content: '你好' }] as any[],
  persist: vi.fn(),
}))
vi.mock('../services/speech/conversation-delivery-bus', async importOriginal => ({
  ...await importOriginal<typeof import('../services/speech/conversation-delivery-bus')>(),
  getConversationDeliveryBusContext: () => ({
    emit: (event: unknown, body: unknown) => { for (const listener of ports.listeners.get(event) ?? []) listener({ body }) },
    on: (event: unknown, listener: (event: { body: any }) => void) => {
      if (!ports.listeners.has(event))
        ports.listeners.set(event, new Set())
      ports.listeners.get(event)!.add(listener)
      return () => ports.listeners.get(event)?.delete(listener)
    },
  }),
}))
vi.mock('./modules/airi-card', () => ({ useAiriCardStore: () => ({ activeCardId: ports.activeCardId }) }))
vi.mock('./chat/session-store', () => ({ useChatSessionStore: () => ({
  activeSessionId: ports.activeSessionId,
  sessionMetas: { session: { characterId: 'card' } },
  getSessionMessages: () => ports.messages,
  persistSessionMessages: ports.persist,
}) }))

function state(epoch = 'one', revision = 0): ConversationDeliveryState {
  return { cardId: 'card', sessionId: 'session', turnId: 'turn', epoch, revision, mode: 'voice', phase: 'waiting', currentText: '', start: null, end: null, spokenEnd: null, playedMs: 0, partial: false, alignment: null }
}
beforeEach(() => {
  ports.listeners.clear()
  ports.persist.mockClear()
  ports.messages = [{ role: 'assistant', id: 'turn', content: '你好' }]
  setActivePinia(createPinia())
})

describe('cross-window delivery ownership and durable cache', () => {
  it('uses revisions, retires epochs, and rejects malformed progress', () => {
    const store = useConversationDeliveryStore()
    const key = store.key(state())
    store.publish(state('one', 0))
    store.publish({ ...state('one', 2), phase: 'speaking', playedMs: 100 })
    store.publish(state('one', 1))
    expect(store.states[key]?.revision).toBe(2)
    store.publish(state('two', 0))
    store.publish(state('one', 0))
    store.publish(state('one', 3))
    store.publish({ ...state('two', 1), playedMs: Number.NaN })
    expect(store.states[key]).toMatchObject({ epoch: 'two', revision: 0 })
  })

  it('broadcasts one stop/read action and snapshots actual host progress to a new window', () => {
    const host = useConversationDeliveryStore()
    const stop = vi.fn()
    const read = vi.fn()
    host.onStop(stop)
    host.onRead(read)
    host.publish(state())
    host.publish({ ...state('one', 1), phase: 'speaking', playedMs: 100 })
    setActivePinia(createPinia())
    const client = useConversationDeliveryStore()
    expect(client.states[client.key(state())]?.playedMs).toBe(100)
    client.stop(state())
    client.read({ cardId: 'card', sessionId: 'session', turnId: 'turn', text: '你好' })
    expect(stop).toHaveBeenCalledTimes(1)
    expect(read).toHaveBeenCalledTimes(1)
    client.read({ cardId: 'other', sessionId: 'session', turnId: 'turn', text: '你好' })
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('persists terminal heard facts without rewriting the displayed message body', () => {
    const store = useConversationDeliveryStore()
    store.publish(state())
    store.publish({ ...state('one', 1), phase: 'completed', playedMs: 900, spokenEnd: 2, alignment: 'segment' })
    expect(ports.messages[0]).toMatchObject({ content: '你好', speechDelivery: { phase: 'completed', spokenEnd: 2 } })
    expect(ports.persist).toHaveBeenCalledWith('session')
  })
})
