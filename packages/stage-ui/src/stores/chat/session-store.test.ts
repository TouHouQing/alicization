import type { ChatHistoryItem } from '../../types/chat'
import type { ChatSessionMeta, ChatSessionRecord, ChatSessionsIndex } from '../../types/chat-session'

import { createPinia, defineStore, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isReactive, ref } from 'vue'

import { useAiriCardStore } from '../modules/airi-card'
import { useChatSessionStore } from './session-store'

const legacyProjectStateCueKeys = [
  'preDialogueAwarenessLine',
  'preDialogueAwarenessSummary',
  'awarenessLine',
  'companionHeadlineLine',
  'companionBriefingLine',
  'companionNextClosureLine',
  'sameHerSelfLine',
  'sameHerSummary',
  'sameHerHoldDetail',
  'sameHerDriftRisk',
  'sameHerDriftRiskLine',
  'sameHerDriftRiskSummary',
  'emotionalClosureCue',
  'emotionalClosureSummary',
  'continuityCue',
  'continuityAnchor',
  'continuityHold',
  'continuityDriftRisk',
  'proactiveSameHerGap',
  'proactiveSameHerGapSummary',
  'companionExperimentalCue',
  'sameHerExperimentalCue',
  'emotionalClosureExperimentalCue',
  'proactiveSameHerExperimentalCue',
] as const

const naturalProjectFacts = {
  identity: '这次会话记录周末火车行程。',
  currentPhase: '车票已经确认。',
  latestLandedProgress: '周六上午九点的车票已经保存。',
  primaryOpenLoop: '是否带伞还没有决定。',
  nextClosureTarget: '出发前查看天气。',
  continuitySummary: '上次对话留下了行程提醒。',
  itinerary: {
    station: '虹桥',
    departure: '周六上午',
  },
}

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
        if (record.messages.length > 0 && nonEmptySaveDelayMs > 0)
          await new Promise<void>(resolve => setTimeout(resolve, nonEmptySaveDelayMs))
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

vi.mock('@proj-alicization/stage-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@proj-alicization/stage-shared')>()
  return {
    ...actual,
    isStageTamagotchi: () => true,
  }
})

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
  useAiriCardStore: defineStore('mock-airi-card', () => {
    const activeCardId = ref('default')

    return {
      activeCardId,
    }
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

function createSessionMeta(
  sessionId: string,
  now: number,
  title = 'Session',
  characterId = 'default',
): ChatSessionMeta {
  return {
    sessionId,
    userId: 'local',
    characterId,
    title,
    createdAt: now,
    updatedAt: now,
  }
}

async function seedPersistedSession(
  sessionId: string,
  messages: ChatHistoryItem[],
  options: { now?: number, title?: string, characterId?: string } = {},
) {
  const now = options.now ?? Date.now()
  const characterId = options.characterId ?? 'default'
  const meta = createSessionMeta(sessionId, now, options.title, characterId)

  await mocks.chatSessionsRepo.saveIndex({
    userId: 'local',
    characters: {
      [characterId]: {
        activeSessionId: sessionId,
        sessions: {
          [sessionId]: meta,
        },
      },
    },
  })
  await mocks.chatSessionsRepo.saveSession(sessionId, {
    meta,
    messages,
  })

  return meta
}

function createAssistantWithLegacyGovernance(id: string, createdAt: number): ChatHistoryItem {
  const deprecatedProjectCues = Object.fromEntries(
    legacyProjectStateCueKeys.map(key => [key, `deprecated cue for ${key}`]),
  )

  return {
    id,
    role: 'assistant',
    content: '周六上午九点的车票已经保存。',
    createdAt,
    slices: [],
    tool_results: [],
    structured: {
      thought: '行程记录里有已确认的车票和一个未决定的天气问题。',
      emotion: 'neutral',
      reply: '周六上午九点的车票已经保存。',
      format: 'mind-turn-v1',
      projectState: {
        ...naturalProjectFacts,
        ...deprecatedProjectCues,
      },
      preDialogueSendIdentity: {
        summaryLine: 'deprecated send identity',
      },
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'deprecated awareness cue',
        reasonPreview: ['deprecated awareness reason'],
      },
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'deprecated closure cue',
        briefingLines: ['deprecated closure briefing'],
        reasons: ['deprecated closure reason'],
      },
      visibleReplyRealization: {
        projectStateAudit: {
          currentPhaseSummary: '过期审计错误地声称酒店已经预订。',
          nextClosureTargetSummary: '过期审计要求检查收据。',
          sameHerHoldDetail: 'deprecated hold detail',
          sameHerDriftRiskSummary: 'deprecated drift summary',
          proactiveSameHerGapSummary: 'deprecated proactive gap',
        },
      },
    },
  } as ChatHistoryItem
}

function expectLegacyGovernanceRemoved(message: ChatHistoryItem | undefined) {
  expect(message?.role).toBe('assistant')
  const structured = (message as Extract<ChatHistoryItem, { role: 'assistant' }> | undefined)?.structured

  expect(structured).not.toHaveProperty('preDialogueSendIdentity')
  expect(structured).not.toHaveProperty('preDialogueAwareness')
  expect(structured).not.toHaveProperty('preDialogueClosure')
  expect(structured).not.toHaveProperty('visibleReplyRealization')

  const projectState = structured?.projectState as unknown as Record<string, unknown>
  for (const key of legacyProjectStateCueKeys)
    expect(projectState).not.toHaveProperty(key)

  expect(projectState).toEqual(expect.objectContaining(naturalProjectFacts))
}

describe('chat session store reset stability', () => {
  beforeEach(() => {
    vi.useRealTimers()
    setActivePinia(createPinia())
    mocks.resetStorage()
    authState.userId = 'local-user'
    useAiriCardStore().activeCardId = 'default'
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

    void store.messages

    await vi.advanceTimersByTimeAsync(10)
    expect(store.getSessionMessages(sessionId)).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(120)
    expect(store.getSessionMessages(sessionId)).toHaveLength(1)
  })

  it('filters persisted manual abort error bubbles when loading a stored session', async () => {
    const sessionId = 'session-with-manual-abort'
    const now = Date.now()

    await seedPersistedSession(sessionId, [
      {
        id: 'msg-user-1',
        role: 'user',
        content: '看看我屏幕',
        createdAt: now,
      },
      {
        id: 'msg-error-abort',
        role: 'error',
        content: 'Alicization turn aborted (manual)',
        createdAt: now + 1,
      },
    ], {
      now,
      title: 'Loaded Session',
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    expect(store.messages.some(message => message.role === 'error')).toBe(false)
    expect(mocks.chatSessionsRepo.saveSession).toBeCalledWith(sessionId, expect.objectContaining({
      messages: expect.not.arrayContaining([
        expect.objectContaining({
          role: 'error',
          content: 'Alicization turn aborted (manual)',
        }),
      ]),
    }))
  })

  it('drops legacy governance fields when loading persisted assistant messages', async () => {
    const sessionId = 'session-with-legacy-governance'
    const now = Date.now()

    await seedPersistedSession(sessionId, [
      createAssistantWithLegacyGovernance(`${sessionId}:assistant`, now),
    ], {
      now,
      title: 'Weekend Trip',
    })

    const store = useChatSessionStore()
    await store.initialize()

    expectLegacyGovernanceRemoved(
      store.messages.find(message => message.role === 'assistant'),
    )
  })

  it('keeps the message array reference stable when a delayed load resolves during an active turn', async () => {
    vi.useFakeTimers()

    const store = useChatSessionStore()
    await store.initialize()

    const sessionId = 'delayed-load-session'
    const now = Date.now()
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: createSessionMeta(sessionId, now, 'Delayed Load'),
      messages: [{
        id: 'stored-assistant',
        role: 'assistant',
        content: 'The earlier note is stored.',
        createdAt: now,
        slices: [],
        tool_results: [],
      }],
    })
    mocks.setGetSessionDelay(sessionId, 80)

    store.setActiveSession(sessionId)
    const activeMessagesRef = store.getSessionMessages(sessionId)
    activeMessagesRef.push({
      id: 'msg-user-race',
      role: 'user',
      content: 'Keep this in-flight message.',
      createdAt: now + 1,
    })

    const readyPromise = store.ensureSessionReady(sessionId)
    await vi.advanceTimersByTimeAsync(100)
    await readyPromise

    expect(store.getSessionMessages(sessionId)).toBe(activeMessagesRef)
    expect(store.getSessionMessages(sessionId).map(message => message.id)).toEqual([
      'stored-assistant',
      'msg-user-race',
    ])

    mocks.clearGetSessionDelay(sessionId)
  })

  it('persists external sessions with cloneable plain message snapshots', async () => {
    const store = useChatSessionStore()
    await store.initialize()

    const sessionId = await store.ensureExternalSession('external-session-for-runtime-sampling', {
      setActive: true,
      title: 'Runtime Sampling',
    })

    const savedCall = mocks.chatSessionsRepo.saveSession.mock.calls.find(call => call[0] === sessionId)
    expect(savedCall).toBeTruthy()
    expect(isReactive(savedCall?.[1].messages)).toBe(false)
    expect(savedCall?.[1].messages).toEqual([])
  })

  it('canonicalizes duplicated assistant turns against the persisted session snapshot', async () => {
    const sessionId = 'session-with-duplicated-assistant-turn'
    const now = Date.now()
    const stableTurnId = `chat:${sessionId}:turn-1`

    await seedPersistedSession(sessionId, [
      {
        id: `${stableTurnId}:user`,
        role: 'user',
        content: '周六几点出发？',
        createdAt: now,
      },
      {
        id: 'temporary-assistant-id',
        role: 'assistant',
        content: '上午九点。',
        createdAt: now + 10,
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '上午九点。',
          format: 'fallback-v1',
        },
      },
      {
        id: stableTurnId,
        role: 'assistant',
        content: '上午九点。',
        createdAt: now + 250,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '上午九点。' }],
        tool_results: [],
        structured: {
          thought: '车票记录显示上午九点出发。',
          emotion: 'neutral',
          reply: '上午九点。',
          format: 'mind-turn-v1',
        },
      },
    ], {
      now,
      title: 'Loaded Session',
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessages = store.messages.filter(message => message.role === 'assistant')
    expect(assistantMessages).toHaveLength(1)
    expect(assistantMessages[0]?.id).toBe(stableTurnId)
    expect((assistantMessages[0] as any)?.structured?.thought).toBe('车票记录显示上午九点出发。')
    expect(mocks.chatSessionsRepo.saveSession).toBeCalledWith(sessionId, expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          id: stableTurnId,
          role: 'assistant',
          content: '上午九点。',
        }),
      ]),
    }))
  })

  it('keeps desktop chat sessions bound to the local user when the auth user id changes', async () => {
    const store = useChatSessionStore()
    await store.initialize()
    const initialSessionId = store.activeSessionId

    authState.userId = 'remote-user-123'
    await Promise.resolve()

    expect(store.activeSessionId).toBe(initialSessionId)
    expect(store.activeSessionId).toBeTruthy()
  })

  it('isolates active sessions and messages across card switches', async () => {
    const store = useChatSessionStore()
    const cardStore = useAiriCardStore()

    await store.initialize()

    const defaultSessionId = store.activeSessionId
    store.setSessionMessages(defaultSessionId, [
      {
        id: 'msg-default-1',
        role: 'user',
        content: 'message for default card',
        createdAt: Date.now(),
      },
    ])

    cardStore.activeCardId = 'card-b'
    await vi.waitFor(() => {
      expect(store.activeSessionId).not.toBe(defaultSessionId)
    })

    const cardBSessionId = store.activeSessionId
    store.setSessionMessages(cardBSessionId, [
      {
        id: 'msg-card-b-1',
        role: 'user',
        content: 'message for card b',
        createdAt: Date.now(),
      },
    ])

    cardStore.activeCardId = 'default'
    await vi.waitFor(() => {
      expect(store.activeSessionId).toBe(defaultSessionId)
    })
    expect(store.messages.map(message => message.id)).toEqual(['msg-default-1'])

    cardStore.activeCardId = 'card-b'
    await vi.waitFor(() => {
      expect(store.activeSessionId).toBe(cardBSessionId)
    })
    expect(store.messages.map(message => message.id)).toEqual(['msg-card-b-1'])
  })

  it('drops legacy governance fields when importing sessions', async () => {
    const store = useChatSessionStore()
    await store.initialize()

    const now = Date.now()
    const sessionId = 'imported-weekend-trip'
    const meta = createSessionMeta(sessionId, now, 'Imported Weekend Trip')

    await store.importSessions({
      format: 'chat-sessions-index:v1',
      index: {
        userId: 'local',
        characters: {
          default: {
            activeSessionId: sessionId,
            sessions: {
              [sessionId]: meta,
            },
          },
        },
      },
      sessions: {
        [sessionId]: {
          meta,
          messages: [
            createAssistantWithLegacyGovernance(`${sessionId}:assistant`, now),
          ],
        },
      },
    })

    expectLegacyGovernanceRemoved(
      store.messages.find(message => message.role === 'assistant'),
    )
  })

  it('drops legacy governance fields when forking a session', async () => {
    const store = useChatSessionStore()
    await store.initialize()

    const now = Date.now()
    const sourceSessionId = store.activeSessionId
    const sourceMessages = store.getSessionMessages(sourceSessionId)
    sourceMessages.splice(0, sourceMessages.length, {
      id: `${sourceSessionId}:user`,
      role: 'user',
      content: '把周末行程分成一个新分支。',
      createdAt: now,
    }, createAssistantWithLegacyGovernance(`${sourceSessionId}:assistant`, now + 1))

    const forkedSessionId = await store.forkSession({ fromSessionId: sourceSessionId })
    await store.ensureSessionReady(forkedSessionId)

    expectLegacyGovernanceRemoved(
      store.getSessionMessages(forkedSessionId).find(message => message.role === 'assistant'),
    )
  })
})
