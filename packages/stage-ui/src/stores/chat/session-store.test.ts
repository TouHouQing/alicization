import type { ChatSessionRecord, ChatSessionsIndex } from '../../types/chat-session'

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useChatSessionStore } from './session-store'

const authState = vi.hoisted(() => ({
  userId: 'local-user',
}))

const mocks = vi.hoisted(() => {
  const indexByUser = new Map<string, ChatSessionsIndex>()
  const sessionById = new Map<string, ChatSessionRecord>()
  let nonEmptySaveDelayMs = 0
  const getSessionDelayById = new Map<string, number>()

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

  const getSession = vi.fn(async (sessionId: string) => {
    const delay = getSessionDelayById.get(sessionId)
    if (delay && delay > 0)
      await new Promise<void>(resolve => setTimeout(resolve, delay))
    const record = sessionById.get(sessionId)
    return record ? clone(record) : null
  })

  return {
    getSession,
    resetStorage() {
      indexByUser.clear()
      sessionById.clear()
      nonEmptySaveDelayMs = 0
      getSessionDelayById.clear()
      getSession.mockClear()
    },
    setNonEmptySaveDelayMs(value: number) {
      nonEmptySaveDelayMs = value
    },
    setGetSessionDelay(sessionId: string, delayMs: number) {
      getSessionDelayById.set(sessionId, delayMs)
    },
    clearGetSessionDelay(sessionId: string) {
      getSessionDelayById.delete(sessionId)
    },
    chatSessionsRepo: {
      getIndex: vi.fn(async (userIdInput: string) => {
        const index = indexByUser.get(userIdInput)
        return index ? clone(index) : null
      }),
      saveIndex: vi.fn(async (index: ChatSessionsIndex) => {
        indexByUser.set(index.userId, clone(index))
      }),
      getSession,
      saveSession: vi.fn(async (sessionId: string, record: ChatSessionRecord) => {
        if (record.messages.length > 0 && nonEmptySaveDelayMs > 0) {
          await new Promise<void>(resolve => setTimeout(resolve, nonEmptySaveDelayMs))
        }
        sessionById.set(sessionId, clone(record))
      }),
      deleteSession: vi.fn(async (sessionId: string) => {
        sessionById.delete(sessionId)
      }),
    },
  }
})

vi.mock('../../database/repos/chat-sessions.repo', () => ({
  chatSessionsRepo: mocks.chatSessionsRepo,
}))

vi.mock('@proj-alicization/stage-shared', () => ({
  isStageTamagotchi: () => true,
}))

vi.mock('../auth', () => ({
  useAuthStore: () => ({
    userId: {
      get value() {
        return authState.userId
      },
      set value(next: string) {
        authState.userId = next
      },
    },
    isAuthenticated: ref(false),
  }),
}))

vi.mock('../modules/airi-card', () => ({
  useAiriCardStore: () => ({
    activeCardId: ref('default'),
  }),
}))

vi.mock('../../composables/api', () => ({
  client: {
    api: {
      chats: {
        sync: {
          $post: vi.fn(async () => ({ ok: true })),
        },
      },
    },
  },
}))

vi.mock('../../composables/use-local-first', () => ({
  useLocalFirstRequest: (input: {
    local: () => Promise<unknown>
    remote: () => Promise<unknown>
    allowRemote?: () => boolean
  }) => ({
    execute: async () => {
      await input.local()
      if (input.allowRemote?.())
        await input.remote()
    },
  }),
}))

describe('chat session store reset stability', () => {
  beforeEach(() => {
    vi.useRealTimers()
    setActivePinia(createPinia())
    mocks.resetStorage()
    authState.userId = 'local-user'
  })

  it('does not lose freshly sent messages after resetAllSessions under delayed persistence', async () => {
    vi.useFakeTimers()
    mocks.setNonEmptySaveDelayMs(80)

    const store = useChatSessionStore()
    await store.initialize()
    await store.resetAllSessions()

    const sessionId = store.activeSessionId
    expect(sessionId).toBeTruthy()

    store.setSessionMessages(sessionId, [
      {
        id: 'msg-user-1',
        role: 'user',
        content: 'hello after reset',
        createdAt: Date.now(),
      },
    ])

    // Simulate UI read path (`messages` getter). Before the fix this could trigger
    // an async load that overwrote in-memory messages with stale persisted data.
    void store.messages

    await vi.advanceTimersByTimeAsync(10)
    expect(store.getSessionMessages(sessionId)).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(120)
    expect(store.getSessionMessages(sessionId)).toHaveLength(1)
  })

  it('keeps message array reference stable when loadSession resolves during an active turn', async () => {
    vi.useFakeTimers()
    mocks.setNonEmptySaveDelayMs(0)

    const store = useChatSessionStore()
    await store.initialize()

    const sessionId = store.activeSessionId
    mocks.setGetSessionDelay(sessionId, 80)

    // Force a delayed re-load while holding a reference to the current message array.
    store.setActiveSession(sessionId)
    const activeMessagesRef = store.getSessionMessages(sessionId)

    activeMessagesRef.push({
      id: 'msg-user-race',
      role: 'user',
      content: 'race message should persist',
      createdAt: Date.now(),
    })

    await vi.advanceTimersByTimeAsync(100)
    await Promise.resolve()

    expect(store.getSessionMessages(sessionId)).toBe(activeMessagesRef)
    expect(store.getSessionMessages(sessionId).some(message => message.id === 'msg-user-race')).toBe(true)

    mocks.clearGetSessionDelay(sessionId)
  })

  it('keeps desktop chat session bound to local user even if auth user id updates later', async () => {
    const store = useChatSessionStore()
    await store.initialize()
    const initialSessionId = store.activeSessionId

    authState.userId = 'remote-user-123'
    await Promise.resolve()

    expect(store.activeSessionId).toBe(initialSessionId)
    expect(store.activeSessionId).toBeTruthy()
  })
})
