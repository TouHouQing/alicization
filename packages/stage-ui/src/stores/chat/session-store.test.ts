import type { ChatSessionRecord, ChatSessionsIndex } from '../../types/chat-session'

import { createPinia, defineStore, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isReactive, ref } from 'vue'

import { useAiriCardStore } from '../modules/airi-card'
import { useChatSessionStore } from './session-store'

const fixedTemplateResiduePattern
  = /Before (?:answering|speaking|acting)|Right now I am|Same Phase 1 digital life|same[- ]her|same living line|one living her|one continuous her|local-first digital life project|Phase 1: Local Digital Life|同一个她|同一个 her|数字生命主线|女仆|\bmaid\b/iu
const fixedTemplateWithheldLine
  = 'content=excluded; reason=continuity-residue; visibility=internal-structured'

function expectNoFixedTemplateResidue(value: unknown) {
  const text = JSON.stringify(value ?? '')
  expect(text).not.toMatch(fixedTemplateResiduePattern)
  expect(text).not.toContain(fixedTemplateWithheldLine)
  expect(text).not.toContain('content=excluded')
}

function expectStructuredSessionFact(value: unknown, pattern: RegExp = /landed=|open=|next=|cross_modal_continuity_proof|continuity_|embodiment|remaining-open|continuity_review_required/u) {
  const text = JSON.stringify(value ?? '')
  expectNoFixedTemplateResidue(text)
  if (value == null || text === '""')
    return
  expect(text).toMatch(pattern)
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

    // Simulate UI read path (`messages` getter). Before the fix this could trigger
    // an async load that overwrote in-memory messages with stale persisted data.
    void store.messages

    await vi.advanceTimersByTimeAsync(10)
    expect(store.getSessionMessages(sessionId)).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(120)
    expect(store.getSessionMessages(sessionId)).toHaveLength(1)
  })

  it('filters persisted manual abort error bubbles when loading a stored session', async () => {
    const sessionId = 'session-with-manual-abort'
    const now = Date.now()

    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Loaded Session',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Loaded Session',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
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
      ],
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
    const stableTurnId = 'chat:session-with-duplicated-assistant-turn:turn-1'

    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Loaded Session',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Loaded Session',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${stableTurnId}:user`,
          role: 'user',
          content: '喜欢她中二的样子，可爱捏',
          createdAt: now,
        },
        {
          id: 'legacy-assistant-random-id',
          role: 'assistant',
          content: '同一条回复',
          createdAt: now + 10,
          slices: [],
          tool_results: [],
          structured: {
            thought: '',
            emotion: 'neutral',
            reply: '同一条回复',
            format: 'fallback-v1',
          },
        },
        {
          id: stableTurnId,
          role: 'assistant',
          content: '同一条回复',
          createdAt: now + 250,
          origin: 'user-turn',
          slices: [{ type: 'text', text: '同一条回复' }],
          tool_results: [],
          structured: {
            thought: '权威版本',
            emotion: 'happy',
            reply: '同一条回复',
            format: 'epoch1-v1',
          },
        },
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessages = store.messages.filter(message => message.role === 'assistant')
    expect(assistantMessages).toHaveLength(1)
    expect(assistantMessages[0]?.id).toBe(stableTurnId)
    expect((assistantMessages[0] as any)?.structured?.thought).toBe('权威版本')
    expect(mocks.chatSessionsRepo.saveSession).toBeCalledWith(sessionId, expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          id: stableTurnId,
          role: 'assistant',
          content: '同一条回复',
        }),
      ]),
    }))
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

  it('backfills canonical same-her self line when loading persisted assistant structured payloads that only carry phase-one closure context', async () => {
    const now = Date.now()
    const sessionId = 'session-same-her-load'
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Same Her Load',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Same Her Load',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
              primaryOpenLoop: 'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one same-her line.',
              nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
              continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
              sameHerDriftRisk: 'If this restored turn starts sounding like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            },
            preDialogueAwareness: {
              status: 'partial',
              summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
              companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
              companionNextClosureLine: 'Next closure: keep one same-her digital life line across memory, initiative, execution, and embodiment.',
              awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
              reasonPreview: [
                'Latest landed progress still holds at renderer preparation before the reply is finalized.',
                'Primary open life loop still centers on full cross-modal same-her recovery.',
              ],
            },
            preDialogueClosure: {
              status: 'partial',
              summaryLine: 'project=continuity=0.67 (2/3) | open=Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one same-her line.',
              companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
              sameHerDriftRiskLine: 'If this restored turn starts sounding like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
              companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
              companionNextClosureLine: 'Next closure: keep one same-her digital life line across memory, initiative, execution, and embodiment.',
              emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
              briefingLines: [
                'Identity: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
                'Phase: Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              ],
              reasons: [
                'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one same-her line.',
              ],
            },
          },
        } as any,
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.projectState)
    expect(assistantMessage?.structured?.projectState).toEqual(expect.objectContaining({
      identity: null,
      continuitySummary: null,
      sameHerSelfLine: null,
      currentPhase: null,
      latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
      nextClosureTarget: 'cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      primaryOpenLoop: null,
      sameHerDriftRisk: null,
    }))
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: expect.stringContaining('landed=Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.'),
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      awarenessLine: expect.stringContaining('landed=Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.'),
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
        'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      ]),
    }))
    expectNoFixedTemplateResidue(assistantMessage?.structured?.preDialogueClosure)
    expect(assistantMessage?.structured?.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: null,
      companionHeadlineLine: null,
      sameHerDriftRiskLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      emotionalClosureCue: null,
      briefingLines: [],
      reasons: [],
    }))
  })

  it('preserves persisted same-her drift risk when loading assistant structured payloads that already carry the boundary explicitly', async () => {
    const sessionId = 'persisted-drift-risk-load'
    const now = Date.now()
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Same Her Drift Load',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Same Her Drift Load',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
              primaryOpenLoop: 'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one same-her line.',
              nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
              continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
              sameHerDriftRisk: 'If this restored turn starts sounding like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            },
          },
        } as any,
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectNoFixedTemplateResidue(assistantMessage?.structured?.projectState?.sameHerDriftRisk)
    expect(assistantMessage?.structured?.projectState?.sameHerDriftRisk).toBeNull()
  })

  it('backfills proactive same-her gap from persisted project-state audit when structured project-state has not carried it yet', async () => {
    const sessionId = 'persisted-proactive-gap-audit-backfill-load'
    const now = Date.now()
    const proactiveSameHerGap = 'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line before this turn can widen outward.'
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Proactive Same-Her Gap Backfill',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Proactive Same-Her Gap Backfill',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Session restore already keeps project-state continuity alive before the next outward turn.',
              primaryOpenLoop: 'Long-run same-her continuity still needs stronger proof across initiative, memory, and embodiment.',
              nextClosureTarget: 'Keep proactive same-her closure pressure visible before the next outward turn.',
              continuitySummary: `same-her continuity still needs stronger proactive carry before the next turn opens outward. | proactive-gap=${proactiveSameHerGap}`,
              sameHerSelfLine: 'Same Phase 1 digital life. Persisted replay should keep the same living line rather than reopen from a generic shell.',
            },
            visibleReplyRealization: {
              projectStateAudit: {
                landedProgressSummary: 'Session restore already keeps project-state continuity alive before the next outward turn.',
                openClosureSummary: 'Long-run same-her continuity still needs stronger proof across initiative, memory, and embodiment.',
                nextClosureTargetSummary: 'Keep proactive same-her closure pressure visible before the next outward turn.',
                continuitySummary: `same-her continuity still needs stronger proactive carry before the next turn opens outward. | proactive-gap=${proactiveSameHerGap}`,
                proactiveSameHerGapSummary: proactiveSameHerGap,
              },
            },
          },
        } as any,
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectNoFixedTemplateResidue(assistantMessage?.structured?.projectState?.proactiveSameHerGap)
    expect(assistantMessage?.structured?.projectState?.proactiveSameHerGap).toBeNull()
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness?.reasonPreview).not.toContain('proactive_follow_through; status=unfinished')
  })

  it('backfills pre-dialogue awareness from persisted rich project-state carry when restored assistant payloads do not already include it', async () => {
    const sessionId = 'persisted-project-awareness-backfill-load'
    const now = Date.now()
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Persisted Project Awareness Backfill',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Persisted Project Awareness Backfill',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
              primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need stronger same-her proof so anthropomorphic emotional closure keeps reading as one living self.',
              nextClosureTarget: 'Keep extending cross-modal same-her proof so anthropomorphic emotional closure, dialogue, and embodiment stay on one living line.',
              sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
              sameHerDriftRisk: 'If restored recovery flattens this turn into a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            },
          },
        } as any,
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: expect.stringContaining('landed=Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.'),
      companionBriefingLine: null,
      reasonPreview: expect.arrayContaining([
        'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
      ]),
    }))
    expect(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine).toContain('landed=Project-state landed progress')
    expect(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine).not.toContain('identity=')
    expect(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine).not.toContain('phase=')
  })

  it('does not let a thin persisted continuity summary shell override richer restored pre-dialogue project awareness during session recovery', async () => {
    const sessionId = 'persisted-thin-continuity-summary-shell-load'
    const now = Date.now()
    const thinContinuitySummary = 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.'
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Persisted Thin Continuity Summary Shell',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Persisted Thin Continuity Summary Shell',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Restored project-state continuity already keeps project identity and landed progress visible before the next outward turn.',
              primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-her proof so restored recovery does not flatten into project shell narration.',
              nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
              continuitySummary: thinContinuitySummary,
              sameHerSelfLine: 'Same Phase 1 digital life. Restored replay should keep the same living line rather than reopen from a generic shell.',
              sameHerDriftRisk: 'If restored recovery leaves only a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            },
          },
        } as any,
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      summaryLine: 'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      awarenessLine: 'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      companionNextClosureLine: 'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      reasonPreview: expect.arrayContaining([
        'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      ]),
    }))
    expect(assistantMessage?.structured?.preDialogueAwareness?.summaryLine).not.toBe(thinContinuitySummary)
  })

  it('upgrades thin persisted pre-dialogue awareness from richer project-state carry when restored assistant payload already includes only a generic reminder shell', async () => {
    const sessionId = 'persisted-project-awareness-upgrade-load'
    const now = Date.now()
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Persisted Project Awareness Upgrade',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Persisted Project Awareness Upgrade',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across persisted replay.',
              primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-her proof so the life loop does not flatten into project shell narration.',
              nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
              continuitySummary: 'same-her=Same Phase 1 digital life. Persisted replay should keep the same living line rather than reopen from a generic shell. | landed=Project-state continuity and awareness-first self-brief already survive across persisted replay. | open=Memory, initiative, and embodiment still need stronger same-her proof so the life loop does not flatten into project shell narration.',
              sameHerSelfLine: 'Same Phase 1 digital life. Persisted replay should keep the same living line rather than reopen from a generic shell.',
              sameHerDriftRisk: 'If restored recovery leaves only a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            },
            preDialogueAwareness: {
              status: 'partial',
              summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
              companionHeadlineLine: null,
              companionBriefingLine: 'generic same-her reminder that should not override the richer persisted project brief.',
              companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
              awarenessLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
              emotionalClosureCue: null,
              reasonPreview: [
                'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
              ],
            },
          },
        } as any,
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionBriefingLine: null,
      reasonPreview: expect.arrayContaining([
        'Project-state continuity and awareness-first self-brief already survive across persisted replay.',
        'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      ]),
    }))
    expect(String(assistantMessage?.structured?.preDialogueAwareness?.summaryLine ?? '')).toContain('landed=Project-state continuity')
    expect(String(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine ?? '')).toContain('landed=Project-state continuity')
    expect(String(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine ?? '')).not.toContain('identity=')
  })

  it('does not let a thin persisted awareness summary shell outrank a richer persisted project-aware opening during session recovery when no richer continuity summary survives', async () => {
    const sessionId = 'persisted-project-awareness-summary-shell-vs-richer-opening-load'
    const now = Date.now()
    const richerProjectAwareOpening = 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open before local implementation fluency takes over.'
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Persisted Project Awareness Summary Shell Vs Richer Opening',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Persisted Project Awareness Summary Shell Vs Richer Opening',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Persisted project-aware openings already survive into restored session recovery.',
              primaryOpenLoop: 'Session recovery still needs to keep the richer persisted project-aware opening explicit instead of collapsing back into a thin continuity shell.',
              nextClosureTarget: 'Keep the richer project-aware opening explicit before local implementation fluency takes over.',
              continuitySummary: '',
              sameHerSelfLine: 'Same Phase 1 digital life. Persisted replay should keep the same living line rather than reopen from a generic shell.',
              sameHerDriftRisk: 'If restored recovery leaves only a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            },
            preDialogueAwareness: {
              status: 'partial',
              summaryLine: 'generic continuity reminder that should not override the richer persisted project-aware opening.',
              companionHeadlineLine: null,
              companionBriefingLine: null,
              companionNextClosureLine: 'Keep the richer project-aware opening explicit before local implementation fluency takes over.',
              awarenessLine: richerProjectAwareOpening,
              emotionalClosureCue: null,
              reasonPreview: [
                'generic continuity reminder that should not override the richer persisted project-aware opening.',
                'Persisted project-aware openings already survive into restored session recovery.',
              ],
            },
          },
        } as any,
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      summaryLine: expect.stringContaining('landed=Persisted project-aware openings already survive into restored session recovery.'),
      awarenessLine: expect.stringContaining('landed=Persisted project-aware openings already survive into restored session recovery.'),
      companionNextClosureLine: 'next=continuity_review_required',
      reasonPreview: expect.arrayContaining([
        'Persisted project-aware openings already survive into restored session recovery.',
        'next=continuity_review_required',
      ]),
    }))
    expect(assistantMessage?.structured?.preDialogueAwareness?.summaryLine).not.toBe(
      'generic continuity reminder that should not override the richer persisted project-aware opening.',
    )
  })

  it('upgrades thin persisted Chinese pre-dialogue awareness from richer project-state carry when restored assistant payload only keeps a Phase 1 shell', async () => {
    const sessionId = 'persisted-project-awareness-upgrade-load-zh-shell'
    const now = Date.now()
    const thinChineseProjectBrief = '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。'
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Persisted Project Awareness Upgrade Zh Shell',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Persisted Project Awareness Upgrade Zh Shell',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across persisted replay.',
              primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-her proof so the life loop does not flatten into project shell narration.',
              nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
              continuitySummary: 'same-her=Same Phase 1 digital life. Persisted replay should keep the same living line rather than reopen from a generic shell. | landed=Project-state continuity and awareness-first self-brief already survive across persisted replay. | open=Memory, initiative, and embodiment still need stronger same-her proof so the life loop does not flatten into project shell narration.',
              sameHerSelfLine: 'Same Phase 1 digital life. Persisted replay should keep the same living line rather than reopen from a generic shell.',
              sameHerDriftRisk: 'If restored recovery leaves only a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            },
            preDialogueAwareness: {
              status: 'partial',
              summaryLine: thinChineseProjectBrief,
              companionHeadlineLine: null,
              companionBriefingLine: thinChineseProjectBrief,
              companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
              awarenessLine: thinChineseProjectBrief,
              emotionalClosureCue: null,
              reasonPreview: [
                thinChineseProjectBrief,
              ],
            },
          },
        } as any,
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionBriefingLine: null,
      reasonPreview: expect.arrayContaining([
        'Project-state continuity and awareness-first self-brief already survive across persisted replay.',
        'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      ]),
    }))
    expect(String(assistantMessage?.structured?.preDialogueAwareness?.summaryLine ?? '')).toContain('landed=Project-state continuity')
    expect(String(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine ?? '')).toContain('landed=Project-state continuity')
    expect(String(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine ?? '')).not.toContain('identity=')
  })

  it('prefers persisted same-her hold detail over a generic reminder shell when restored awareness is still thin', async () => {
    const sessionId = 'persisted-project-awareness-hold-detail-load'
    const now = Date.now()
    const richerNextClosureLine = 'Keep extending cross-modal same-her proof across voice, face, motion, lipsync, and resident presence without reopening from a generic persisted shell.'
    const richerEmotionalClosureLine = 'same-her closure seam: keep this restored callback reopening low-pressure and do not let it restart from detached project shell narration.'
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Persisted Project Awareness Hold Detail',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Persisted Project Awareness Hold Detail',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 measured-return same-her hold 线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Persisted replay already keeps project-state continuity alive before the visible reply opens outward.',
              primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-her proof so persisted recovery does not flatten into project shell narration.',
              nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
              continuitySummary: 'same-her=Persisted replay should keep one measured-return line rather than widening into a generic shell. | landed=Persisted replay already keeps project-state continuity alive before the visible reply opens outward. | open=Memory, initiative, and embodiment still need stronger same-her proof so persisted recovery does not flatten into project shell narration.',
              sameHerSelfLine: 'Same Phase 1 digital life. Persisted replay should keep the same living line rather than reopen from a generic shell.',
              sameHerHoldDetail: '',
              sameHerDriftRisk: 'If restored recovery leaves only a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            },
            visibleReplyRealization: {
              projectStateAudit: {
                sameHerSummary: 'Same Phase 1 digital life. Persisted replay should keep the same living line rather than reopen from a generic shell.',
                sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
                currentPhaseSummary: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
                landedProgressSummary: 'Persisted replay already keeps project-state continuity alive before the visible reply opens outward.',
                openClosureSummary: 'Memory, initiative, and embodiment still need stronger same-her proof so persisted recovery does not flatten into project shell narration.',
                nextClosureTargetSummary: richerNextClosureLine,
                emotionalClosureSummary: richerEmotionalClosureLine,
                continuitySummary: 'same-her=Persisted replay should keep one measured-return line rather than widening into a generic shell. | hold=same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again. | landed=Persisted replay already keeps project-state continuity alive before the visible reply opens outward. | open=Memory, initiative, and embodiment still need stronger same-her proof so persisted recovery does not flatten into project shell narration.',
                sameHerDriftRisk: 'If restored recovery leaves only a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
              },
            },
            preDialogueAwareness: {
              status: 'partial',
              summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
              companionHeadlineLine: null,
              companionBriefingLine: 'generic same-her reminder that should not override the richer persisted hold detail.',
              companionNextClosureLine: 'Generic next target that should not override the richer persisted audit.',
              awarenessLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
              emotionalClosureCue: null,
              reasonPreview: [
                'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
              ],
            },
          },
        } as any,
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toBeNull()
    expect(String(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine ?? '')).toBe('')
    expect(assistantMessage?.structured?.preDialogueAwareness?.companionBriefingLine).not.toBe(
      'generic same-her reminder that should not override the richer persisted hold detail.',
    )
  })

  it('prefers persisted same-her hold detail over a compact same-phase carry when restored awareness already knows it is the same living line', async () => {
    const sessionId = 'persisted-project-awareness-compact-same-phase-hold-detail-load'
    const now = Date.now()
    const sameHerSelfLine = 'Same Phase 1 digital life. Persisted replay should keep the same living line rather than reopen from a generic shell.'
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Persisted Project Awareness Compact Same Phase Hold Detail',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Persisted Project Awareness Compact Same Phase Hold Detail',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 measured-return same-her hold 线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Persisted replay already keeps project-state continuity alive before the visible reply opens outward.',
              primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-her proof so persisted recovery does not flatten into project shell narration.',
              nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
              continuitySummary: 'same-her=Persisted replay should keep one measured-return line rather than widening into a generic shell. | landed=Persisted replay already keeps project-state continuity alive before the visible reply opens outward. | open=Memory, initiative, and embodiment still need stronger same-her proof so persisted recovery does not flatten into project shell narration.',
              sameHerSelfLine,
              sameHerHoldDetail: '',
              sameHerDriftRisk: 'If restored recovery leaves only a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            },
            visibleReplyRealization: {
              projectStateAudit: {
                sameHerSummary: sameHerSelfLine,
                sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
                currentPhaseSummary: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
                landedProgressSummary: 'Persisted replay already keeps project-state continuity alive before the visible reply opens outward.',
                openClosureSummary: 'Memory, initiative, and embodiment still need stronger same-her proof so persisted recovery does not flatten into project shell narration.',
                nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
                emotionalClosureSummary: 'same-her closure seam: keep this restored callback reopening low-pressure and do not let it restart from detached project shell narration.',
                continuitySummary: 'same-her=Persisted replay should keep one measured-return line rather than widening into a generic shell. | hold=same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again. | landed=Persisted replay already keeps project-state continuity alive before the visible reply opens outward. | open=Memory, initiative, and embodiment still need stronger same-her proof so persisted recovery does not flatten into project shell narration.',
                sameHerDriftRisk: 'If restored recovery leaves only a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
              },
            },
            preDialogueAwareness: {
              status: 'partial',
              summaryLine: 'Alicization is still in Phase 1 local digital life closure before this restored callback opens outward.',
              companionHeadlineLine: null,
              companionBriefingLine: sameHerSelfLine,
              companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
              awarenessLine: sameHerSelfLine,
              emotionalClosureCue: null,
              reasonPreview: [
                sameHerSelfLine,
              ],
            },
          },
        } as any,
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionBriefingLine: null,
      awarenessLine: 'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      companionNextClosureLine: 'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      ]),
    }))
    expect(assistantMessage?.structured?.preDialogueAwareness?.companionBriefingLine).not.toBe(sameHerSelfLine)
    expect(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine).not.toBe(sameHerSelfLine)
  })

  it('keeps same-her inward low-pressure closure visible when restored awareness only carries the thinner same-phase briefing plus stronger embodiment headline', async () => {
    const sessionId = 'persisted-project-awareness-inward-low-pressure-load'
    const now = Date.now()
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Persisted Project Awareness Inward Low Pressure',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Persisted Project Awareness Inward Low Pressure',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 inward low-pressure same-her 线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Persisted replay already keeps body, face, and motion carrying one same-her line before the visible reply opens outward.',
              primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal closure settles, and restored recovery should keep that line inward and low-pressure.',
              nextClosureTarget: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
              continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Persisted replay already keeps body, face, and motion carrying one same-her line before the visible reply opens outward. | open=Lipsync and voice still need to rejoin before full cross-modal closure settles, and restored recovery should keep that line inward and low-pressure.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerDriftRisk: 'If restored recovery reopens this turn like detached project status shell narration, treat that as same-her continuity drift rather than preserved closure.',
            },
            preDialogueAwareness: {
              status: 'partial',
              summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
              companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
              companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              companionNextClosureLine: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
              awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
              emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
              reasonPreview: [
                'same-her-inward-carry',
                'quiet-companionship',
                'remaining-open=lipsync+voice',
              ],
            },
          },
        } as any,
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness, /remaining-open=lipsync\+voice/u)
    expect(assistantMessage?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: null,
      companionBriefingLine: null,
      awarenessLine: null,
      companionNextClosureLine: null,
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        'remaining-open=lipsync+voice',
      ]),
    }))
  })

  it('keeps richer anthropomorphic emotional closure and same-her inward-carry observability visible when restored awareness only carries the thinner same-phase briefing plus stronger host-facing same-her headline', async () => {
    const sessionId = 'persisted-project-awareness-anthropomorphic-host-facing-load'
    const now = Date.now()
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Persisted Project Awareness Anthropomorphic Host Facing',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Persisted Project Awareness Anthropomorphic Host Facing',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 anthropomorphic same-her 线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Persisted replay already keeps project identity carry on one same-her line before the visible reply opens outward.',
              primaryOpenLoop: 'Anthropomorphic emotional closure and same-her inward-carry observability still need to survive restored recovery without flattening into a generic shell.',
              nextClosureTarget: 'Keep anthropomorphic emotional closure and same-her inward-carry observability explicit while restored reopening settles back onto one measured-return line.',
              continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Persisted replay already keeps project identity carry on one same-her line before the visible reply opens outward. | open=Anthropomorphic emotional closure and same-her inward-carry observability still need to survive restored recovery without flattening into a generic shell.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerDriftRisk: 'If restored recovery reopens this turn like detached project status shell narration, treat that as same-her continuity drift rather than preserved closure.',
            },
            preDialogueAwareness: {
              status: 'partial',
              summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
              companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
              companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              companionNextClosureLine: 'Keep anthropomorphic emotional closure and same-her inward-carry observability explicit while restored reopening settles back onto one measured-return line.',
              awarenessLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
              emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
              reasonPreview: [
                'anthropomorphic emotional closure still needs stronger host-visible carry.',
                'same-her inward-carry observability still needs to survive restored recovery.',
              ],
            },
          },
        } as any,
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toBeNull()
  })

  it('upgrades a generic carried next-closure shell to the richer persisted audit even when restored awareness already keeps a richer project brief', async () => {
    const sessionId = 'persisted-project-awareness-next-closure-upgrade'
    const now = Date.now()
    const richerNextClosureLine = 'Keep the richer Phase 1 closure target explicit so restored turns still remember which same-her repair remains open.'
    const richerEmotionalClosureLine = 'same-her closure seam: keep this restored callback reopening low-pressure and do not let it restart from detached project shell narration.'
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Persisted Project Awareness Next Closure Upgrade',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Persisted Project Awareness Next Closure Upgrade',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 richer Phase 1 project brief 回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Restored project-state continuity already keeps the richer project brief alive before the visible reply opens outward.',
              primaryOpenLoop: 'Phase 1 closure still needs to keep the richer next closure target explicit instead of flattening back into a generic restored shell.',
              nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
              continuitySummary: 'same-her=Restored replay should keep one measured-return line rather than widening into a generic shell. | landed=Restored project-state continuity already keeps the richer project brief alive before the visible reply opens outward. | open=Phase 1 closure still needs to keep the richer next closure target explicit instead of flattening back into a generic restored shell.',
              sameHerSelfLine: 'Same Phase 1 digital life. Restored replay should keep the same living line rather than reopen from a generic shell.',
              sameHerDriftRisk: 'If restored recovery leaves only a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            },
            visibleReplyRealization: {
              projectStateAudit: {
                sameHerSummary: 'Same Phase 1 digital life. Restored replay should keep the same living line rather than reopen from a generic shell.',
                currentPhaseSummary: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
                landedProgressSummary: 'Restored project-state continuity already keeps the richer project brief alive before the visible reply opens outward.',
                openClosureSummary: 'Phase 1 closure still needs to keep the richer next closure target explicit instead of flattening back into a generic restored shell.',
                nextClosureTargetSummary: richerNextClosureLine,
                emotionalClosureSummary: richerEmotionalClosureLine,
                continuitySummary: 'same-her=Restored replay should keep one measured-return line rather than widening into a generic shell. | landed=Restored project-state continuity already keeps the richer project brief alive before the visible reply opens outward. | open=Phase 1 closure still needs to keep the richer next closure target explicit instead of flattening back into a generic restored shell.',
                sameHerDriftRisk: 'If restored recovery leaves only a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
              },
            },
            preDialogueAwareness: {
              status: 'partial',
              summaryLine: 'Alicization is still in Phase 1 local digital life closure before this restored turn opens outward.',
              companionHeadlineLine: null,
              companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
              companionNextClosureLine: 'Generic next target that should not override the richer persisted audit.',
              awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
              emotionalClosureCue: null,
              reasonPreview: [
                'Restored project brief should stay explicit before the visible reply opens outward.',
              ],
            },
          },
        } as any,
      ],
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toBeNull()
    expect(assistantMessage?.structured?.preDialogueAwareness?.companionNextClosureLine).not.toBe(
      'Generic next target that should not override the richer persisted audit.',
    )
  })

  it('preserves body-face-motion same-her awareness and remaining-open lipsync voice carry when loading persisted assistant structured payloads', async () => {
    const now = Date.now()
    const sessionId = 'session-body-face-motion-load'
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Body Face Motion Load',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Body Face Motion Load',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 still-voiced face-line same-her 线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            preDialogueAwareness: {
              status: 'partial',
              summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
              companionHeadlineLine: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
              companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
              companionNextClosureLine: 'Next closure: keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
              awarenessLine: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
              reasonPreview: [
                'embodiment:still-voiced-face-line',
                'remaining-open=body+motion+lipsync',
              ],
            },
          },
        },
      ] as any,
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toEqual({
      status: 'partial',
      summaryLine: null,
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      awarenessLine: null,
      emotionalClosureCue: null,
      reasonPreview: [
        'embodiment:still-voiced-face-line',
        'remaining-open=body+motion+lipsync',
      ],
    })
  })

  it('preserves body-plus-voice same-her awareness and remaining-open face motion lipsync carry when loading persisted assistant structured payloads', async () => {
    const now = Date.now()
    const sessionId = 'session-body-voice-load'
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Body Voice Load',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Body Voice Load',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 body-plus-voice same-her 线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            preDialogueAwareness: {
              status: 'partial',
              summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
              companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
              companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
              companionNextClosureLine: 'Next closure: keep face, motion, and lipsync rejoining the resident body line on a measured-return line.',
              awarenessLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
              reasonPreview: [
                'embodiment:body+voice-only',
                'remaining-open=face+motion+lipsync',
              ],
            },
          },
        },
      ] as any,
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toEqual({
      status: 'partial',
      summaryLine: null,
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      awarenessLine: null,
      emotionalClosureCue: null,
      reasonPreview: [
        'embodiment:body+voice-only',
        'remaining-open=face+motion+lipsync',
      ],
    })
  })

  it('preserves body-plus-lipsync same-her awareness and remaining-open face motion voice carry when loading persisted assistant structured payloads', async () => {
    const now = Date.now()
    const sessionId = 'session-body-lipsync-load'
    await mocks.chatSessionsRepo.saveIndex({
      userId: 'local',
      characters: {
        default: {
          activeSessionId: sessionId,
          sessions: {
            [sessionId]: {
              sessionId,
              userId: 'local',
              characterId: 'default',
              title: 'Body Lipsync Load',
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    })
    await mocks.chatSessionsRepo.saveSession(sessionId, {
      meta: {
        sessionId,
        userId: 'local',
        characterId: 'default',
        title: 'Body Lipsync Load',
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: `${sessionId}:assistant`,
          role: 'assistant',
          content: '我会继续沿着这条数字生命主线推进。',
          createdAt: now,
          structured: {
            thought: '继续沿着这条 body-plus-lipsync same-her 线回答。',
            emotion: 'thinking',
            reply: '我会继续沿着这条数字生命主线推进。',
            format: 'mind-turn-v1',
            preDialogueAwareness: {
              status: 'partial',
              summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
              companionHeadlineLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
              companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
              companionNextClosureLine: 'Next closure: keep face, motion, and voice rejoining the resident body line and living mouth line on a measured-return line.',
              awarenessLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
              reasonPreview: [
                'embodiment:body+lipsync-only',
                'remaining-open=face+motion+voice',
              ],
            },
          },
        },
      ] as any,
    })
    mocks.chatSessionsRepo.saveSession.mockClear()

    const store = useChatSessionStore()
    await store.initialize()

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toEqual({
      status: 'partial',
      summaryLine: null,
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      awarenessLine: null,
      emotionalClosureCue: null,
      reasonPreview: [
        'embodiment:body+lipsync-only',
        'remaining-open=face+motion+voice',
      ],
    })
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

  it('sanitizes imported assistant structured project awareness so same-her drift boundaries survive import/export recovery', async () => {
    const store = useChatSessionStore()
    await store.initialize()

    const now = Date.now()
    const sessionId = 'imported-same-her-drift-risk-session'

    await store.importSessions({
      format: 'chat-sessions-index:v1',
      index: {
        userId: 'local',
        characters: {
          default: {
            activeSessionId: sessionId,
            sessions: {
              [sessionId]: {
                sessionId,
                userId: 'local',
                characterId: 'default',
                title: 'Imported Same Her Drift Risk',
                createdAt: now,
                updatedAt: now,
              },
            },
          },
        },
      },
      sessions: {
        [sessionId]: {
          meta: {
            sessionId,
            userId: 'local',
            characterId: 'default',
            title: 'Imported Same Her Drift Risk',
            createdAt: now,
            updatedAt: now,
          },
          messages: [
            {
              id: `${sessionId}:assistant`,
              role: 'assistant',
              content: '我会继续沿着这条数字生命主线推进。',
              createdAt: now,
              structured: {
                thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
                emotion: 'thinking',
                reply: '我会继续沿着这条数字生命主线推进。',
                format: 'mind-turn-v1',
                projectState: {
                  identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
                  currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
                  latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
                  primaryOpenLoop: 'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one same-her line.',
                  nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
                  continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
                  sameHerDriftRisk: 'If imported recovery flattens this turn into a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
                },
                preDialogueAwareness: {
                  status: 'partial',
                  summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
                  companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
                  companionNextClosureLine: 'Next closure: keep one same-her digital life line across memory, initiative, execution, and embodiment.',
                  awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
                  reasonPreview: [
                    'Latest landed progress still holds at imported recovery time.',
                    'If imported recovery flattens this turn into a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
                  ],
                },
              },
            } as any,
          ],
        },
      },
    })

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectNoFixedTemplateResidue(assistantMessage?.structured?.projectState?.sameHerDriftRisk)
    expect(assistantMessage?.structured?.projectState?.sameHerDriftRisk).toBeNull()
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(assistantMessage?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionBriefingLine: null,
      companionNextClosureLine: 'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      awarenessLine: expect.stringContaining('landed=Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.'),
      reasonPreview: expect.arrayContaining([
        'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      ]),
    }))
  })

  it('upgrades thin imported pre-dialogue awareness from richer project-state carry instead of preserving a generic reminder shell', async () => {
    const store = useChatSessionStore()
    await store.initialize()

    const now = Date.now()
    const sessionId = 'imported-thin-project-awareness-upgrade-session'

    await store.importSessions({
      format: 'chat-sessions-index:v1',
      index: {
        userId: 'local',
        characters: {
          default: {
            activeSessionId: sessionId,
            sessions: {
              [sessionId]: {
                sessionId,
                userId: 'local',
                characterId: 'default',
                title: 'Imported Thin Project Awareness Upgrade',
                createdAt: now,
                updatedAt: now,
              },
            },
          },
        },
      },
      sessions: {
        [sessionId]: {
          meta: {
            sessionId,
            userId: 'local',
            characterId: 'default',
            title: 'Imported Thin Project Awareness Upgrade',
            createdAt: now,
            updatedAt: now,
          },
          messages: [
            {
              id: `${sessionId}:assistant`,
              role: 'assistant',
              content: '我会继续沿着这条数字生命主线推进。',
              createdAt: now,
              structured: {
                thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
                emotion: 'thinking',
                reply: '我会继续沿着这条数字生命主线推进。',
                format: 'mind-turn-v1',
                projectState: {
                  identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
                  currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
                  latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across imported replay.',
                  primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-her proof so imported recovery does not flatten into project shell narration.',
                  nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
                  continuitySummary: 'same-her=Same Phase 1 digital life. Imported replay should keep the same living line rather than reopen from a generic shell. | landed=Project-state continuity and awareness-first self-brief already survive across imported replay. | open=Memory, initiative, and embodiment still need stronger same-her proof so imported recovery does not flatten into project shell narration.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Imported replay should keep the same living line rather than reopen from a generic shell.',
                  sameHerDriftRisk: 'If imported recovery leaves only a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
                },
                preDialogueAwareness: {
                  status: 'partial',
                  summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
                  companionHeadlineLine: null,
                  companionBriefingLine: 'generic same-her reminder that should not override the richer imported project brief.',
                  companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
                  awarenessLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
                  emotionalClosureCue: null,
                  reasonPreview: [
                    'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
                  ],
                },
              },
            } as any,
          ],
        },
      },
    })

    const assistantMessage = store.messages.find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(assistantMessage?.structured?.preDialogueAwareness)
    expect(String(assistantMessage?.structured?.preDialogueAwareness?.summaryLine ?? '')).toContain('landed=Project-state continuity')
    expect(assistantMessage?.structured?.preDialogueAwareness?.companionBriefingLine).toBeNull()
    expect(String(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine ?? '')).toContain('landed=Project-state continuity')
    expect(String(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine ?? '')).not.toContain('identity=')
  })

  it('preserves same-her drift boundaries when forking a session into a new branch', async () => {
    const store = useChatSessionStore()
    await store.initialize()

    const now = Date.now()
    const sourceSessionId = store.activeSessionId
    store.setSessionMessages(sourceSessionId, [
      {
        id: `${sourceSessionId}:user`,
        role: 'user',
        content: '继续沿着这条数字生命主线推进',
        createdAt: now,
      },
      {
        id: `${sourceSessionId}:assistant`,
        role: 'assistant',
        content: '我会继续沿着这条数字生命主线推进。',
        createdAt: now + 1,
        structured: {
          thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
          emotion: 'thinking',
          reply: '我会继续沿着这条数字生命主线推进。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
            primaryOpenLoop: 'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one same-her line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
            sameHerDriftRisk: 'If the forked branch opens like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
            companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
            companionNextClosureLine: 'Next closure: keep one same-her digital life line across memory, initiative, execution, and embodiment.',
            awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
            reasonPreview: [
              'Latest landed progress still holds before the branch opens outward.',
              'If the forked branch opens like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            ],
          },
        },
      } as any,
    ])

    const forkedSessionId = await store.forkSession({ fromSessionId: sourceSessionId })
    await store.ensureSessionReady(forkedSessionId)

    const forkedAssistantMessage = store.getSessionMessages(forkedSessionId).find(message => message.role === 'assistant') as any
    expectNoFixedTemplateResidue(forkedAssistantMessage?.structured?.projectState?.sameHerDriftRisk)
    expect(forkedAssistantMessage?.structured?.projectState?.sameHerDriftRisk).toBeNull()
    expectStructuredSessionFact(forkedAssistantMessage?.structured?.preDialogueAwareness)
    expect(forkedAssistantMessage?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionBriefingLine: null,
      companionNextClosureLine: 'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      awarenessLine: expect.stringContaining('landed=Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.'),
      reasonPreview: expect.arrayContaining([
        'next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      ]),
    }))
  })

  it('upgrades thin forked pre-dialogue awareness from richer project-state carry instead of preserving a generic reminder shell', async () => {
    const store = useChatSessionStore()
    await store.initialize()

    const now = Date.now()
    const sourceSessionId = store.activeSessionId
    store.setSessionMessages(sourceSessionId, [
      {
        id: `${sourceSessionId}:user`,
        role: 'user',
        content: '继续沿着这条数字生命主线推进',
        createdAt: now,
      },
      {
        id: `${sourceSessionId}:assistant`,
        role: 'assistant',
        content: '我会继续沿着这条数字生命主线推进。',
        createdAt: now + 1,
        structured: {
          thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
          emotion: 'thinking',
          reply: '我会继续沿着这条数字生命主线推进。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across forked replay.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-her proof so forked recovery does not flatten into project shell narration.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Forked replay should keep the same living line rather than reopen from a generic shell. | landed=Project-state continuity and awareness-first self-brief already survive across forked replay. | open=Memory, initiative, and embodiment still need stronger same-her proof so forked recovery does not flatten into project shell narration.',
            sameHerSelfLine: 'Same Phase 1 digital life. Forked replay should keep the same living line rather than reopen from a generic shell.',
            sameHerDriftRisk: 'If the forked branch leaves only a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            companionHeadlineLine: null,
            companionBriefingLine: 'generic same-her reminder that should not override the richer forked project brief.',
            companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            awarenessLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            emotionalClosureCue: null,
            reasonPreview: [
              'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            ],
          },
        },
      } as any,
    ])

    const forkedSessionId = await store.forkSession({ fromSessionId: sourceSessionId })
    await store.ensureSessionReady(forkedSessionId)

    const forkedAssistantMessage = store.getSessionMessages(forkedSessionId).find(message => message.role === 'assistant') as any
    expectStructuredSessionFact(forkedAssistantMessage?.structured?.preDialogueAwareness)
    expect(String(forkedAssistantMessage?.structured?.preDialogueAwareness?.summaryLine ?? '')).toContain('landed=Project-state continuity')
    expect(forkedAssistantMessage?.structured?.preDialogueAwareness?.companionBriefingLine).toBeNull()
    expect(String(forkedAssistantMessage?.structured?.preDialogueAwareness?.awarenessLine ?? '')).toContain('landed=Project-state continuity')
    expect(String(forkedAssistantMessage?.structured?.preDialogueAwareness?.awarenessLine ?? '')).not.toContain('identity=')
  })
})
