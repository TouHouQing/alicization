import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  aliceChatAbortInvokeChannel,
  aliceChatStartInvokeChannel,
  aliceChatStreamChunk,
  aliceChatStreamDispatchChannel,
  aliceChatStreamFinish,
  aliceChatStreamToolCall,
  aliceChatStreamToolResult,
  aliceDialogueResponded,
  electronAliceAppendConversationTurn,
  electronAliceBootstrap,
  electronAliceChatAbort,
  electronAliceChatStart,
  electronAliceClearAllConversations,
  electronAliceDeleteAllData,
  electronAliceDeleteCardScope,
  electronAliceGetSensorySnapshot,
  electronAliceGetSoul,
  electronAliceInitializeGenesis,
  electronAliceKillSwitchResume,
  electronAliceKillSwitchSuspend,
  electronAliceLlmSyncConfig,
  electronAliceReminderSchedule,
  electronAliceSetActiveSession,
  electronAliceSubconsciousForceDream,
  electronAliceSubconsciousForceTick,
  electronAliceUpdatePersonality,
  electronAliceUpdateSoul,
} from '../../../shared/eventa'
import { setAliceKillSwitchState } from './state'

const invokeHandlers = new Map<unknown, (payload?: any, options?: any) => Promise<any>>()
const sandboxDirs: string[] = []
const contextEmitMock = vi.fn()
const metaStore = new Map<string, string>()
const streamTextMock = vi.fn()
const directIpcHandlers = new Map<string, (event: any, payload?: any) => Promise<any> | any>()
const listWebContentsMock = vi.fn<() => any[]>(() => [])
let sensoryCpuUsage = 12

const dbStub = {
  dbPath: '',
  close: vi.fn().mockResolvedValue(undefined),
  appendAuditLog: vi.fn().mockResolvedValue(undefined),
  appendConversationTurn: vi.fn().mockResolvedValue(undefined),
  getMemoryStats: vi.fn().mockResolvedValue({
    total: 0,
    active: 0,
    archived: 0,
    lastPrunedAt: null,
  }),
  upsertMemoryFacts: vi.fn().mockResolvedValue(undefined),
  retrieveMemoryFacts: vi.fn().mockResolvedValue([]),
  runMemoryPrune: vi.fn().mockResolvedValue({
    total: 0,
    active: 0,
    archived: 0,
    lastPrunedAt: null,
  }),
  importLegacyMemory: vi.fn().mockResolvedValue({
    migrated: false,
    importedFacts: 0,
    importedArchive: 0,
    marker: 'legacy_memory_migrated_v1',
  }),
  overrideMemoryStats: vi.fn().mockResolvedValue({
    total: 0,
    active: 0,
    archived: 0,
    lastPrunedAt: null,
  }),
  insertScheduledTask: vi.fn().mockImplementation(async (input: { taskId: string, triggerAt: number, message: string, sourceTurnId?: string }) => ({
    id: `row:${input.taskId}`,
    taskId: input.taskId,
    triggerAt: input.triggerAt,
    message: input.message,
    status: 'pending',
    createdAt: Date.now(),
    claimedAt: null,
    completedAt: null,
    sourceTurnId: input.sourceTurnId ?? null,
    firedTurnId: null,
    lastError: null,
  })),
  claimDueScheduledTasks: vi.fn().mockResolvedValue([]),
  requeueScheduledTask: vi.fn().mockResolvedValue(undefined),
  completeScheduledTask: vi.fn().mockResolvedValue(undefined),
  failScheduledTask: vi.fn().mockResolvedValue(undefined),
  listPendingScheduledTasks: vi.fn().mockResolvedValue([]),
  getJournalMode: vi.fn().mockResolvedValue('wal'),
  getLatestConversationSessionId: vi.fn().mockResolvedValue(undefined),
  listConversationTurnsSince: vi.fn().mockResolvedValue([]),
  clearConversationData: vi.fn().mockResolvedValue(undefined),
  getMetaValue: vi.fn(async (key: string) => metaStore.get(key)),
  setMetaValue: vi.fn(async (key: string, value: string) => {
    metaStore.set(key, value)
  }),
}

vi.mock('@moeru/eventa', () => ({
  defineEventa: (name: string) => ({ name }),
  defineInvokeEventa: (name: string) => ({ name }),
  defineInvokeHandler: (_context: unknown, event: unknown, handler: (payload?: any) => Promise<any>) => {
    invokeHandlers.set(event, handler)
  },
}))

vi.mock('@moeru/eventa/adapters/electron/main', () => ({
  createContext: () => ({
    context: {
      emit: contextEmitMock,
    },
  }),
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/airi-runtime-should-not-be-used'),
  },
  globalShortcut: {
    register: vi.fn(() => true),
    isRegistered: vi.fn(() => false),
    unregister: vi.fn(),
  },
  powerMonitor: {
    on: vi.fn(),
    removeListener: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: (event: any, payload?: any) => Promise<any> | any) => {
      directIpcHandlers.set(channel, handler)
    }),
    removeHandler: vi.fn((channel: string) => {
      directIpcHandlers.delete(channel)
    }),
  },
  webContents: {
    getAllWebContents: listWebContentsMock,
  },
}))

vi.mock('../../libs/bootkit/lifecycle', () => ({
  onAppBeforeQuit: vi.fn(),
}))

vi.mock('./db', () => ({
  setupAliceDb: vi.fn(async () => dbStub),
}))

vi.mock('./sensory-bus', () => ({
  createAliceSensoryBus: () => {
    let running = true
    const createSnapshot = () => ({
      sample: {
        collectedAt: Date.now(),
        time: {
          iso: new Date().toISOString(),
          local: new Date().toLocaleString(),
          timezone: 'Asia/Shanghai',
        },
        battery: {
          percent: 80,
          charging: true,
          source: 'fallback',
        },
        cpu: {
          usagePercent: sensoryCpuUsage,
          windowMs: 1_000,
        },
        memory: {
          freeMB: 4096,
          totalMB: 8192,
          usagePercent: 50,
        },
      },
      stale: false,
      ageMs: 0,
      nextTickAt: Date.now() + 60_000,
      running,
    })
    return {
      start: () => {
        running = true
      },
      stop: () => {
        running = false
      },
      getSnapshot: () => createSnapshot(),
      refreshNow: async () => createSnapshot().sample,
    }
  },
}))

vi.mock('@xsai/stream-text', () => ({
  streamText: (...args: any[]) => streamTextMock(...args),
}))

const { setupAliceRuntime } = await import('./runtime')

async function createSandboxPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alice-runtime-test-'))
  sandboxDirs.push(dir)
  return dir
}

function getDialogueRespondedEvents() {
  return contextEmitMock.mock.calls
    .filter(([event]) => event === aliceDialogueResponded)
    .map(([, payload]) => payload)
}

describe('alice runtime sandbox + genesis lifecycle', () => {
  beforeEach(() => {
    invokeHandlers.clear()
    vi.clearAllMocks()
    contextEmitMock.mockReset()
    metaStore.clear()
    streamTextMock.mockReset()
    directIpcHandlers.clear()
    sensoryCpuUsage = 12
    listWebContentsMock.mockReset()
    listWebContentsMock.mockReturnValue([])
  })

  afterEach(async () => {
    while (sandboxDirs.length > 0) {
      const dir = sandboxDirs.pop()
      if (!dir)
        continue
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('uses userDataPathOverride and enables fs.watch only after genesis', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const bootstrap = invokeHandlers.get(electronAliceBootstrap)
    const getSoul = invokeHandlers.get(electronAliceGetSoul)
    const initializeGenesis = invokeHandlers.get(electronAliceInitializeGenesis)

    expect(bootstrap).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')
    expect(initializeGenesis).toBeTypeOf('function')

    const boot = await bootstrap!({ cardId: 'default' })
    expect(boot.soulPath.startsWith(sandboxPath)).toBe(true)
    expect(existsSync(join(sandboxPath, 'alicizations', 'cards', 'default', 'SOUL.md'))).toBe(true)
    expect(boot.needsGenesis).toBe(true)
    expect(boot.watching).toBe(false)

    await initializeGenesis!({
      ownerName: '测试主人',
      hostName: '主人',
      aliceName: 'A.L.I.C.E.',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.6,
        liveliness: 0.5,
        sensibility: 0.7,
      },
      personaNotes: '请保持克制和诚实。',
      allowOverwrite: true,
    })

    const afterGenesis = await getSoul!({ cardId: 'default' })
    expect(afterGenesis.soulPath.startsWith(sandboxPath)).toBe(true)
    expect(afterGenesis.needsGenesis).toBe(false)
    expect(afterGenesis.watching).toBe(true)
  })

  it('stops and resumes sensory polling with kill switch state', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSensorySnapshot = invokeHandlers.get(electronAliceGetSensorySnapshot)
    const suspend = invokeHandlers.get(electronAliceKillSwitchSuspend)
    const resume = invokeHandlers.get(electronAliceKillSwitchResume)

    expect(getSensorySnapshot).toBeTypeOf('function')
    expect(suspend).toBeTypeOf('function')
    expect(resume).toBeTypeOf('function')

    const activeSnapshot = await getSensorySnapshot!({ cardId: 'default' })
    expect(activeSnapshot.running).toBe(true)

    await suspend!({ cardId: 'default', reason: 'test' })
    const suspendedSnapshot = await getSensorySnapshot!({ cardId: 'default' })
    expect(suspendedSnapshot.running).toBe(false)

    await resume!({ cardId: 'default', reason: 'test' })
    const resumedSnapshot = await getSensorySnapshot!({ cardId: 'default' })
    expect(resumedSnapshot.running).toBe(true)
  })

  it('keeps SOUL personality baseline body lines in sync after updatePersonality', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAliceInitializeGenesis)
    const updatePersonality = invokeHandlers.get(electronAliceUpdatePersonality)
    const getSoul = invokeHandlers.get(electronAliceGetSoul)

    expect(initializeGenesis).toBeTypeOf('function')
    expect(updatePersonality).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

    await initializeGenesis!({
      ownerName: '测试主人',
      hostName: '主人',
      aliceName: 'A.L.I.C.E.',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.6,
        liveliness: 0.5,
        sensibility: 0.7,
      },
      personaNotes: '请保持克制和诚实。',
      allowOverwrite: true,
    })

    await updatePersonality!({
      reason: 'test-drift',
      deltas: {
        obedience: -0.2,
        liveliness: -0.3,
        sensibility: -0.1,
      },
    })

    const nextSoul = await getSoul!({ cardId: 'default' })
    expect(nextSoul.content).toContain(`- 服从度：${nextSoul.frontmatter.personality.obedience.toFixed(2)}`)
    expect(nextSoul.content).toContain(`- 活泼度：${nextSoul.frontmatter.personality.liveliness.toFixed(2)}`)
    expect(nextSoul.content).toContain(`- 感性度：${nextSoul.frontmatter.personality.sensibility.toFixed(2)}`)
  })

  it('enforces personality baseline sync when updateSoul writes conflicting body text', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAliceInitializeGenesis)
    const updateSoul = invokeHandlers.get(electronAliceUpdateSoul)
    const getSoul = invokeHandlers.get(electronAliceGetSoul)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(updateSoul).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

    await initializeGenesis!({
      ownerName: '测试主人',
      hostName: '主人',
      aliceName: 'A.L.I.C.E.',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.11,
        liveliness: 0.22,
        sensibility: 0.33,
      },
      personaNotes: '请保持克制和诚实。',
      allowOverwrite: true,
    })

    const currentSoul = await getSoul!({ cardId: 'default' })
    const nextContent = currentSoul.content
      .replace(/- 服从度：[0-9.]+/u, '- 服从度：0.99')
      .replace(/- 活泼度：[0-9.]+/u, '- 活泼度：0.99')
      .replace(/- 感性度：[0-9.]+/u, '- 感性度：0.99')

    await updateSoul!({
      cardId: 'default',
      content: nextContent,
    })

    const synced = await getSoul!({ cardId: 'default' })
    expect(synced.content).toContain(`- 服从度：${synced.frontmatter.personality.obedience.toFixed(2)}`)
    expect(synced.content).toContain(`- 活泼度：${synced.frontmatter.personality.liveliness.toFixed(2)}`)
    expect(synced.content).toContain(`- 感性度：${synced.frontmatter.personality.sensibility.toFixed(2)}`)
  })

  it('isolates SOUL state across card scopes', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAliceInitializeGenesis)
    const getSoul = invokeHandlers.get(electronAliceGetSoul)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

    await initializeGenesis!({
      cardId: 'card-a',
      ownerName: '主人A',
      hostName: 'A',
      aliceName: 'Alice-A',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.6,
        liveliness: 0.5,
        sensibility: 0.7,
      },
      personaNotes: 'A notes',
      allowOverwrite: true,
    })

    await initializeGenesis!({
      cardId: 'card-b',
      ownerName: '主人B',
      hostName: 'B',
      aliceName: 'Alice-B',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.3,
        liveliness: 0.2,
        sensibility: 0.4,
      },
      personaNotes: 'B notes',
      allowOverwrite: true,
    })

    const soulA = await getSoul!({ cardId: 'card-a' })
    const soulB = await getSoul!({ cardId: 'card-b' })

    expect(soulA.frontmatter.profile.aliceName).toBe('Alice-A')
    expect(soulB.frontmatter.profile.aliceName).toBe('Alice-B')
    expect(soulA.soulPath).toContain('/alicizations/cards/card-a/')
    expect(soulB.soulPath).toContain('/alicizations/cards/card-b/')
  })

  it('deletes card scoped filesystem data when delete scope is invoked', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAliceInitializeGenesis)
    const deleteCardScope = invokeHandlers.get(electronAliceDeleteCardScope)
    const getSoul = invokeHandlers.get(electronAliceGetSoul)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(deleteCardScope).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

    await initializeGenesis!({
      cardId: 'card-to-delete',
      ownerName: '删除测试',
      hostName: '删除测试',
      aliceName: 'Delete-Me',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.4,
        liveliness: 0.4,
        sensibility: 0.4,
      },
      personaNotes: 'to be deleted',
      allowOverwrite: true,
    })

    const scopedRoot = join(sandboxPath, 'alicizations', 'cards', 'card-to-delete')
    expect(existsSync(scopedRoot)).toBe(true)

    await deleteCardScope!({ cardId: 'card-to-delete' })
    expect(existsSync(scopedRoot)).toBe(false)

    const defaultSoul = await getSoul!({ cardId: 'default' })
    expect(defaultSoul.soulPath).toContain('/alicizations/cards/default/')
  })

  it('clears conversation and reminder data across all card scopes', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAliceInitializeGenesis)
    const clearAllConversations = invokeHandlers.get(electronAliceClearAllConversations)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(clearAllConversations).toBeTypeOf('function')

    await initializeGenesis!({
      cardId: 'card-clear-a',
      ownerName: 'A',
      hostName: 'A',
      aliceName: 'A',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.4,
        liveliness: 0.4,
        sensibility: 0.4,
      },
      personaNotes: 'A',
      allowOverwrite: true,
    })
    await initializeGenesis!({
      cardId: 'card-clear-b',
      ownerName: 'B',
      hostName: 'B',
      aliceName: 'B',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.4,
        liveliness: 0.4,
        sensibility: 0.4,
      },
      personaNotes: 'B',
      allowOverwrite: true,
    })

    await clearAllConversations!()
    expect(dbStub.clearConversationData).toBeCalled()
    expect(dbStub.setMetaValue).toBeCalledWith('active_session_id_v1', '')
    expect(dbStub.setMetaValue).toBeCalledWith('dialogue_ack_state_v1', '{}')
  })

  it('deletes userData alicizations root and reboots default scope when delete-all-data is invoked', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAliceInitializeGenesis)
    const deleteAllData = invokeHandlers.get(electronAliceDeleteAllData)
    const getSoul = invokeHandlers.get(electronAliceGetSoul)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(deleteAllData).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

    await initializeGenesis!({
      cardId: 'card-delete-all',
      ownerName: 'DeleteAll',
      hostName: 'DeleteAll',
      aliceName: 'DeleteAll',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.4,
        liveliness: 0.4,
        sensibility: 0.4,
      },
      personaNotes: 'DeleteAll',
      allowOverwrite: true,
    })

    const scopedRoot = join(sandboxPath, 'alicizations', 'cards', 'card-delete-all')
    expect(existsSync(scopedRoot)).toBe(true)

    await deleteAllData!()

    expect(existsSync(scopedRoot)).toBe(false)
    const resetSoul = await getSoul!({ cardId: 'default' })
    expect(resetSoul.soulPath).toContain('/alicizations/cards/default/')
    expect(resetSoul.needsGenesis).toBe(true)
  })

  it('emits alice.dialogue.responded only after turn persistence succeeds', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAliceAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-1',
      sessionId: 'session-test',
      userText: '你好',
      assistantText: '你好，我在。',
      structured: {
        thought: 'respond politely',
        emotion: 'happy',
        reply: '你好，我在。',
        parsePath: 'json',
      },
      createdAt: Date.now(),
    })

    expect(dbStub.appendConversationTurn).toBeCalledTimes(1)
    expect(contextEmitMock).toBeCalledWith(aliceDialogueResponded, expect.objectContaining({
      cardId: 'default',
      turnId: 'turn-test-1',
      sessionId: 'session-test',
      isFallback: false,
    }))
  })

  it('dispatches dialogue-responded through direct renderer channel', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAliceAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    const sender = {
      id: 777,
      isDestroyed: () => false,
      send: vi.fn(),
    }
    listWebContentsMock.mockReturnValue([sender])

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-dialogue-dispatch',
      sessionId: 'session-test',
      assistantText: '实时投递',
      structured: {
        thought: 'deliver now',
        emotion: 'neutral',
        reply: '实时投递',
        parsePath: 'json',
      },
      createdAt: Date.now(),
    })

    expect(sender.send).toBeCalledWith(
      aliceChatStreamDispatchChannel,
      expect.objectContaining({
        eventType: 'dialogue-responded',
        body: expect.objectContaining({
          cardId: 'default',
          turnId: 'turn-dialogue-dispatch',
          sessionId: 'session-test',
        }),
      }),
    )
  })

  it('normalizes unsupported emotion to neutral and preserves rawEmotion in dialogue event', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAliceAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-unsupported-emotion',
      sessionId: 'session-test',
      assistantText: '我在这里。',
      structured: {
        thought: 'stay calm',
        emotion: 'super-excited',
        reply: '我在这里。',
        parsePath: 'json',
      },
      createdAt: Date.now(),
    })

    const events = getDialogueRespondedEvents()
    expect(events).toHaveLength(1)
    expect(events[0]?.structured.emotion).toBe('neutral')
    expect(events[0]?.structured.rawEmotion).toBe('super-excited')
  })

  it('does not emit alice.dialogue.responded when persistence fails', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAliceAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    dbStub.appendConversationTurn.mockRejectedValueOnce(new Error('sqlite write failed'))

    await expect(appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-db-fail',
      sessionId: 'session-test',
      assistantText: '不会写成功',
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '不会写成功',
        parsePath: 'json',
      },
      createdAt: Date.now(),
    })).rejects.toThrow('sqlite write failed')

    expect(getDialogueRespondedEvents()).toHaveLength(0)
  })

  it('does not emit alice.dialogue.responded when kill switch is already suspended', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAliceAppendConversationTurn)
    const suspend = invokeHandlers.get(electronAliceKillSwitchSuspend)
    expect(appendConversationTurn).toBeTypeOf('function')
    expect(suspend).toBeTypeOf('function')

    await suspend!({ cardId: 'default', reason: 'unit-test' })

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-suspended',
      sessionId: 'session-test',
      assistantText: '被中断',
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '被中断',
        parsePath: 'json',
      },
      createdAt: Date.now(),
    })

    expect(dbStub.appendConversationTurn).not.toBeCalled()
    expect(getDialogueRespondedEvents()).toHaveLength(0)
  })

  it('drops dialogue event when kill switch aborts between persistence and emit', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAliceAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    dbStub.appendConversationTurn.mockImplementationOnce(async () => {
      setAliceKillSwitchState('SUSPENDED', 'race-test')
    })

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-race',
      sessionId: 'session-test',
      assistantText: '竞态中断',
      structured: {
        thought: '',
        emotion: 'happy',
        reply: '竞态中断',
        parsePath: 'json',
      },
      createdAt: Date.now(),
    })

    expect(getDialogueRespondedEvents()).toHaveLength(0)
    setAliceKillSwitchState('ACTIVE', 'race-test-cleanup')
  })

  it('uses active session binding when appending turn without sessionId', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const setActiveSession = invokeHandlers.get(electronAliceSetActiveSession)
    const appendConversationTurn = invokeHandlers.get(electronAliceAppendConversationTurn)
    expect(setActiveSession).toBeTypeOf('function')
    expect(appendConversationTurn).toBeTypeOf('function')

    await setActiveSession!({
      cardId: 'default',
      sessionId: 'session-boundary-test',
    })

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-missing-session',
      assistantText: '测试',
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '测试',
        parsePath: 'json',
      },
      createdAt: Date.now(),
    })

    expect(dbStub.appendConversationTurn).toBeCalledWith(expect.objectContaining({
      sessionId: 'session-boundary-test',
    }), expect.anything())
  })

  it('auto-creates fallback session when no session is available', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAliceAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-auto-session',
      assistantText: '自动会话',
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '自动会话',
        parsePath: 'json',
      },
      createdAt: Date.now(),
    })

    const call = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as { sessionId?: string } | undefined
    expect(call?.sessionId).toContain('session:auto:default:')
  })

  it('binds latest persisted session when active session is missing', async () => {
    const sandboxPath = await createSandboxPath()
    dbStub.getLatestConversationSessionId.mockResolvedValueOnce('session-from-latest-turn')
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAliceAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-latest-session',
      assistantText: 'latest',
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: 'latest',
        parsePath: 'json',
      },
      createdAt: Date.now(),
    })

    const call = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as { sessionId?: string } | undefined
    expect(call?.sessionId).toBe('session-from-latest-turn')
  })

  it('flushes subconscious state to disk before card scope switch', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSoul = invokeHandlers.get(electronAliceGetSoul)
    expect(getSoul).toBeTypeOf('function')

    dbStub.setMetaValue.mockClear()
    await getSoul!({ cardId: 'card-switch-target' })

    expect(dbStub.setMetaValue).toBeCalledWith(
      'subconscious_state_v1',
      expect.any(String),
    )
  })

  it('truncates dreaming context to hard caps and emits audit marker', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    await new Promise(resolve => setTimeout(resolve, 40))
    dbStub.listConversationTurnsSince.mockReset()

    const forceDream = invokeHandlers.get(electronAliceSubconsciousForceDream)
    expect(forceDream).toBeTypeOf('function')

    dbStub.listConversationTurnsSince.mockResolvedValue(
      Array.from({ length: 300 }).map((_, index) => ({
        turnId: `turn-${index}`,
        sessionId: 'session-dream',
        userText: `用户消息 ${index} ${'x'.repeat(400)}`,
        assistantText: `助手消息 ${index} ${'y'.repeat(500)}`,
        structuredJson: null,
        createdAt: Date.now() - (300 - index) * 1000,
      })),
    )

    const result = await forceDream!({ cardId: 'default', reason: 'unit-test' })
    expect(result.processedCards.length).toBeGreaterThan(0)

    const truncationAudit = dbStub.appendAuditLog.mock.calls
      .map(call => call[0])
      .find((item: any) => item.action === 'alice.dream.context.truncated')
    expect(truncationAudit).toBeTruthy()
    expect(truncationAudit?.payload).toEqual(expect.objectContaining({
      rawTurnCount: 300,
      maxTurns: 100,
    }))
  })

  it('returns not-found when aborting an unknown main chat turn', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const abortChat = invokeHandlers.get(electronAliceChatAbort)
    const startChat = invokeHandlers.get(electronAliceChatStart)
    expect(abortChat).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')

    const abortResult = await abortChat!({
      cardId: 'default',
      turnId: 'missing-turn',
    })
    expect(abortResult).toEqual({
      accepted: false,
      state: 'not-found',
    })

    const startResult = await startChat!({
      cardId: 'default',
      turnId: 'turn-invalid-config',
      providerId: '',
      model: '',
      providerConfig: {},
      messages: [],
    })
    expect(startResult.accepted).toBe(false)
  })

  it('returns finished when aborting a stream turn that already finished recently', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ onEvent }) => {
      await onEvent?.({ type: 'text-delta', text: 'done' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAliceChatStart)
    const abortChat = invokeHandlers.get(electronAliceChatAbort)
    expect(startChat).toBeTypeOf('function')
    expect(abortChat).toBeTypeOf('function')

    const turnId = 'turn-finished-then-abort'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: 'hello' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === aliceChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
      expect(finishEvents[0]?.[1]?.status).toBe('completed')
    })

    const abortResult = await abortChat!({
      cardId: 'default',
      turnId,
      reason: 'late-abort',
    })
    expect(abortResult).toEqual({
      accepted: false,
      state: 'finished',
    })
  })

  it('accepts main chat stream over direct ipc transport', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ onEvent }) => {
      await onEvent?.({ type: 'text-delta', text: 'direct transport reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const directStart = directIpcHandlers.get(aliceChatStartInvokeChannel)
    expect(directStart).toBeTypeOf('function')

    const result = await directStart?.({}, {
      cardId: 'default',
      turnId: 'turn-direct-ipc-start',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: 'hello direct ipc' }],
    })

    expect(result).toEqual(expect.objectContaining({
      accepted: true,
      state: 'accepted',
    }))

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === aliceChatStreamFinish && payload.turnId === 'turn-direct-ipc-start')
      expect(finishEvents).toHaveLength(1)
    })
  })

  it('preserves text-delta whitespace across chunk boundaries in main chat stream', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ onEvent }) => {
      await onEvent?.({ type: 'text-delta', text: 'User enjoys' })
      await onEvent?.({ type: 'text-delta', text: ' coding sessions with' })
      await onEvent?.({ type: 'text-delta', text: ' focus.' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAliceChatStart)
    expect(startChat).toBeTypeOf('function')

    const turnId = 'turn-whitespace-preserved'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: 'hello' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === aliceChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const chunkEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === aliceChatStreamChunk && payload.turnId === turnId)
      .map(([, payload]) => payload)
    const finishEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === aliceChatStreamFinish && payload.turnId === turnId)
      .map(([, payload]) => payload)

    expect(chunkEvents.map(event => event.text).join('')).toBe('User enjoys coding sessions with focus.')
    expect(finishEvents[0]?.fullText).toBe('User enjoys coding sessions with focus.')
  })

  it('injects card custom directives into main chat runtime messages as highest-priority system block', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'directive applied' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAliceInitializeGenesis)
    const startChat = invokeHandlers.get(electronAliceChatStart)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')

    await initializeGenesis!({
      cardId: 'default',
      ownerName: '测试主人',
      hostName: '主人',
      aliceName: 'A.L.I.C.E.',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.5,
        liveliness: 0.5,
        sensibility: 0.5,
      },
      customDirectives: '你是严格而克制的教练型人格，先指出问题再给改进建议。',
      allowOverwrite: true,
    })

    const turnId = 'turn-custom-directives-chat'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: '给我一个学习建议' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === aliceChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const firstSystem = capturedMessages.find(message => message.role === 'system')
    expect(typeof firstSystem?.content).toBe('string')
    expect(String(firstSystem?.content)).toContain('[ALICE_CARD_CUSTOM_DIRECTIVES]')
    expect(String(firstSystem?.content)).toContain('严格而克制的教练型人格')
  })

  it('aborts main chat stream over direct ipc transport', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(({ onEvent, abortSignal }) => {
      setTimeout(() => {
        if (!abortSignal?.aborted)
          void onEvent?.({ type: 'text-delta', text: 'too late' })
      }, 50)
      setTimeout(() => {
        if (!abortSignal?.aborted)
          void onEvent?.({ type: 'finish', finishReason: 'stop' })
      }, 90)
    })

    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const directStart = directIpcHandlers.get(aliceChatStartInvokeChannel)
    const directAbort = directIpcHandlers.get(aliceChatAbortInvokeChannel)
    expect(directStart).toBeTypeOf('function')
    expect(directAbort).toBeTypeOf('function')

    await directStart?.({}, {
      cardId: 'default',
      turnId: 'turn-direct-ipc-abort',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: 'abort me' }],
    })

    const abortResult = await directAbort?.({}, {
      cardId: 'default',
      turnId: 'turn-direct-ipc-abort',
      reason: 'unit-test-direct-abort',
    })

    expect(abortResult).toEqual({
      accepted: true,
      state: 'aborted',
    })
  })

  it('starts main chat stream immediately even while dreaming holds the card scope queue', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    await new Promise(resolve => setTimeout(resolve, 40))
    dbStub.listConversationTurnsSince.mockReset()
    streamTextMock.mockReset()

    let releaseDream: (() => void) | undefined
    const dreamGate = new Promise<void>((resolve) => {
      releaseDream = resolve
    })

    let callCount = 0
    streamTextMock.mockImplementation(async ({ onEvent }: { onEvent?: (event: any) => Promise<void> | void }) => {
      callCount += 1
      if (callCount === 1) {
        await dreamGate
        await onEvent?.({
          type: 'text-delta',
          text: '{"host_attitude":"neutral","core_memory":"queued dream","soul_shift":{"obedience_delta":0,"liveliness_delta":0,"sensibility_delta":0}}',
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({ type: 'text-delta', text: 'chat survived queue starvation' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    dbStub.listConversationTurnsSince.mockResolvedValueOnce([
      {
        turnId: 'turn-dream-blocking-1',
        sessionId: 'session-dream-blocking',
        userText: '你还在吗？',
        assistantText: '在。',
        structuredJson: JSON.stringify({ emotion: 'neutral' }),
        createdAt: Date.now() - 30_000,
      },
    ])

    const forceDream = invokeHandlers.get(electronAliceSubconsciousForceDream)
    const startChat = invokeHandlers.get(electronAliceChatStart)
    const syncLlmConfig = invokeHandlers.get(electronAliceLlmSyncConfig)
    expect(forceDream).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')
    expect(syncLlmConfig).toBeTypeOf('function')

    await syncLlmConfig!({
      activeProviderId: 'openai',
      activeModelId: 'gpt-4o-mini',
      providerCredentials: {
        openai: {
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    })

    const dreamPromise = forceDream!({
      cardId: 'default',
      reason: 'unit-queue-starvation',
    })

    await vi.waitFor(() => {
      expect(streamTextMock).toBeCalledTimes(1)
    })

    const startOutcome = await Promise.race([
      startChat!({
        cardId: 'default',
        turnId: 'turn-chat-not-blocked-by-dream',
        providerId: 'openai',
        model: 'gpt-4o-mini',
        providerConfig: {
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
        messages: [{ role: 'user', content: 'hello while dream is busy' }],
      }).then(result => ({ kind: 'chat' as const, result })),
      dreamPromise.then(() => ({ kind: 'dream' as const })),
      new Promise<{ kind: 'timeout' }>(resolve => setTimeout(() => resolve({ kind: 'timeout' }), 250)),
    ])

    expect(startOutcome.kind).toBe('chat')
    if (startOutcome.kind === 'chat')
      expect(startOutcome.result.accepted).toBe(true)

    releaseDream?.()
    await dreamPromise

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === aliceChatStreamFinish && payload.turnId === 'turn-chat-not-blocked-by-dream')
      expect(finishEvents).toHaveLength(1)
    })
  })

  it('binds async stream events to the original invoke sender raw context', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ onEvent }) => {
      await onEvent?.({ type: 'text-delta', text: 'sender-bound-chunk' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAliceChatStart)
    expect(startChat).toBeTypeOf('function')

    const fakeIpcMainEvent = {
      sender: {
        id: 9527,
        isDestroyed: () => false,
        send: vi.fn(),
      },
    }

    const turnId = 'turn-binds-raw-context'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: 'hello' }],
    }, {
      raw: {
        ipcMainEvent: fakeIpcMainEvent,
        event: { requestId: 'req-1' },
      },
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      expect(fakeIpcMainEvent.sender.send).toHaveBeenCalled()
    })

    expect(fakeIpcMainEvent.sender.send).toHaveBeenCalledWith(
      aliceChatStreamDispatchChannel,
      expect.objectContaining({
        eventType: 'chunk',
        body: expect.objectContaining({
          cardId: 'default',
          turnId,
          text: 'sender-bound-chunk',
        }),
      }),
    )
    expect(fakeIpcMainEvent.sender.send).toHaveBeenCalledWith(
      aliceChatStreamDispatchChannel,
      expect.objectContaining({
        eventType: 'finish',
        body: expect.objectContaining({
          cardId: 'default',
          turnId,
          status: 'completed',
        }),
      }),
    )
  })

  it('aborts running main chat stream with exactly one aborted finish event', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(({ onEvent, abortSignal }) => {
      setTimeout(() => {
        if (!abortSignal?.aborted)
          void onEvent?.({ type: 'text-delta', text: 'chunk-before-abort' })
      }, 20)
      setTimeout(() => {
        if (!abortSignal?.aborted)
          void onEvent?.({ type: 'finish', finishReason: 'stop' })
      }, 60)
    })

    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAliceChatStart)
    const abortChat = invokeHandlers.get(electronAliceChatAbort)
    expect(startChat).toBeTypeOf('function')
    expect(abortChat).toBeTypeOf('function')

    const startResult = await startChat!({
      cardId: 'default',
      turnId: 'turn-stream-abort',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: 'hello' }],
    })
    expect(startResult.accepted).toBe(true)

    const abortResult = await abortChat!({
      cardId: 'default',
      turnId: 'turn-stream-abort',
      reason: 'unit-test',
    })
    expect(abortResult).toEqual({
      accepted: true,
      state: 'aborted',
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const finishEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === aliceChatStreamFinish && payload.turnId === 'turn-stream-abort')
      .map(([, payload]) => payload)
    const chunkEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === aliceChatStreamChunk && payload.turnId === 'turn-stream-abort')
      .map(([, payload]) => payload)

    expect(finishEvents).toHaveLength(1)
    expect(finishEvents[0]?.status).toBe('aborted')
    expect(chunkEvents).toHaveLength(0)
  })

  it('emits tool-call/tool-result stream events from main gateway tool path', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ tools, onEvent }) => {
      const mcpTool = Array.isArray(tools)
        ? tools.find((entry: any) => entry?.function?.name === 'mcp_call_tool')
        : undefined
      const argumentsPayload = {
        name: 'filesystem::read_file',
        parameters: [{ name: 'path', value: '../secret.txt' }],
      }
      await onEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-main-1',
        toolName: 'mcp_call_tool',
        arguments: argumentsPayload,
      })
      const toolResult = mcpTool?.execute
        ? await mcpTool.execute(argumentsPayload)
        : undefined
      await onEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-main-1',
        result: toolResult,
      })
      await onEvent?.({
        type: 'text-delta',
        text: '{"thought":"tool executed","emotion":"neutral","reply":"done"}',
      })
      await onEvent?.({
        type: 'finish',
        finishReason: 'stop',
      })
    })

    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAliceChatStart)
    expect(startChat).toBeTypeOf('function')

    const startResult = await startChat!({
      cardId: 'default',
      turnId: 'turn-main-tool-flow',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      supportsTools: true,
      waitForTools: true,
      messages: [{ role: 'user', content: 'read file' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === aliceChatStreamFinish && payload.turnId === 'turn-main-tool-flow')
      expect(finishEvents).toHaveLength(1)
    })

    const toolCallEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === aliceChatStreamToolCall && payload.turnId === 'turn-main-tool-flow')
      .map(([, payload]) => payload)
    const toolResultEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === aliceChatStreamToolResult && payload.turnId === 'turn-main-tool-flow')
      .map(([, payload]) => payload)

    expect(toolCallEvents).toHaveLength(1)
    expect(toolCallEvents[0]?.toolName).toBe('mcp_call_tool')
    expect(toolResultEvents).toHaveLength(1)
    expect(toolResultEvents[0]?.result).toEqual(expect.objectContaining({
      isError: true,
      errorCode: 'MCP_CALL_UNAVAILABLE',
    }))
  })

  it('registers top-level set_reminder tool and persists scheduled task on success', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ tools, onEvent }) => {
      const reminderTool = Array.isArray(tools)
        ? tools.find((entry: any) => entry?.function?.name === 'set_reminder')
        : undefined
      expect(String(reminderTool?.function?.description ?? '')).toContain('绝对禁止在本轮回复中直接给出提醒内容')
      await onEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-reminder-1',
        toolName: 'set_reminder',
        arguments: { minutes: 3, message: '3分钟后提醒我喝水' },
      })
      const toolResult = reminderTool?.execute
        ? await reminderTool.execute({ minutes: 3, message: '3分钟后提醒我喝水' })
        : undefined
      await onEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-reminder-1',
        result: toolResult,
      })
      await onEvent?.({
        type: 'text-delta',
        text: '{"thought":"已设置提醒","emotion":"neutral","reply":"好的，我会提醒你。"}',
      })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAliceChatStart)
    expect(startChat).toBeTypeOf('function')
    const startResult = await startChat!({
      cardId: 'default',
      turnId: 'turn-main-set-reminder',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      supportsTools: true,
      waitForTools: true,
      messages: [{ role: 'user', content: '三分钟后提醒我喝水' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === aliceChatStreamFinish && payload.turnId === 'turn-main-set-reminder')
      expect(finishEvents).toHaveLength(1)
    })

    expect(dbStub.insertScheduledTask).toBeCalledTimes(1)
    expect(dbStub.insertScheduledTask).toBeCalledWith(expect.objectContaining({
      message: '3分钟后提醒我喝水',
    }))
    const reminderToolResult = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === aliceChatStreamToolResult && payload.turnId === 'turn-main-set-reminder')
      .map(([, payload]) => payload.result)
      .at(0)
    expect(reminderToolResult).toEqual(expect.objectContaining({
      status: 'scheduled',
      message: '3分钟后提醒我喝水',
    }))
  })

  it('returns explainable error when set_reminder input is invalid', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ tools, onEvent }) => {
      const reminderTool = Array.isArray(tools)
        ? tools.find((entry: any) => entry?.function?.name === 'set_reminder')
        : undefined
      await onEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-reminder-invalid',
        toolName: 'set_reminder',
        arguments: { minutes: 0, message: '' },
      })
      const toolResult = reminderTool?.execute
        ? await reminderTool.execute({ minutes: 0, message: '' })
        : undefined
      await onEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-reminder-invalid',
        result: toolResult,
      })
      await onEvent?.({
        type: 'text-delta',
        text: '{"thought":"参数不合法","emotion":"neutral","reply":"无法设置提醒。"}',
      })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAliceChatStart)
    expect(startChat).toBeTypeOf('function')
    const startResult = await startChat!({
      cardId: 'default',
      turnId: 'turn-main-set-reminder-invalid',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      supportsTools: true,
      waitForTools: true,
      messages: [{ role: 'user', content: '0分钟后提醒我' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === aliceChatStreamFinish && payload.turnId === 'turn-main-set-reminder-invalid')
      expect(finishEvents).toHaveLength(1)
    })

    expect(dbStub.insertScheduledTask).toBeCalledTimes(0)
    const invalidResult = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === aliceChatStreamToolResult && payload.turnId === 'turn-main-set-reminder-invalid')
      .map(([, payload]) => payload.result)
      .at(0)
    expect(invalidResult).toEqual(expect.objectContaining({
      status: 'error',
      code: 'ALICE_REMINDER_INVALID_MINUTES',
    }))
  })

  it('supports deterministic reminder scheduling via invoke handler fallback', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const scheduleReminder = invokeHandlers.get(electronAliceReminderSchedule)
    expect(scheduleReminder).toBeTypeOf('function')

    const result = await scheduleReminder!({
      cardId: 'default',
      minutes: 1,
      message: '喝水',
      sourceTurnId: 'turn-reminder-fallback',
    })

    expect(result).toEqual(expect.objectContaining({
      status: 'scheduled',
      message: '喝水',
    }))
    expect(dbStub.insertScheduledTask).toBeCalledWith(expect.objectContaining({
      message: '喝水',
      sourceTurnId: 'turn-reminder-fallback',
    }))
  })

  it('processes due reminder tasks during subconscious tick with overdue tier auditing', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const systemMessage = messages?.find(message => message.role === 'system')
      const systemText = typeof systemMessage?.content === 'string' ? systemMessage.content : ''
      const reminderMatch = /Reminder content: "([^"]+)"/.exec(systemText)
      const reminderText = reminderMatch?.[1] ?? '提醒事项'
      await onEvent?.({
        type: 'text-delta',
        text: JSON.stringify({
          thought: `按要求执行提醒：${reminderText}`,
          emotion: 'tired',
          reply: `提醒你：${reminderText}`,
        }),
      })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })
    const forceTick = invokeHandlers.get(electronAliceSubconsciousForceTick)
    const syncLlmConfig = invokeHandlers.get(electronAliceLlmSyncConfig)
    expect(forceTick).toBeTypeOf('function')
    expect(syncLlmConfig).toBeTypeOf('function')

    await syncLlmConfig!({
      activeProviderId: 'openai',
      activeModelId: 'gpt-4o-mini',
      providerCredentials: {
        openai: {
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    })

    const nowMs = Date.now()
    dbStub.claimDueScheduledTasks.mockResolvedValueOnce([
      {
        id: 'row-reminder-mild',
        taskId: 'task-reminder-mild',
        triggerAt: nowMs - 2 * 60_000,
        message: '轻微延迟提醒',
        status: 'running',
        createdAt: nowMs - 3 * 60_000,
        claimedAt: nowMs,
        completedAt: null,
        sourceTurnId: null,
        firedTurnId: null,
        lastError: null,
      },
      {
        id: 'row-reminder-severe',
        taskId: 'task-reminder-severe',
        triggerAt: nowMs - 8 * 60_000,
        message: '严重延迟提醒',
        status: 'running',
        createdAt: nowMs - 9 * 60_000,
        claimedAt: nowMs,
        completedAt: null,
        sourceTurnId: null,
        firedTurnId: null,
        lastError: null,
      },
    ])

    await forceTick!({ cardId: 'default' })

    expect(dbStub.completeScheduledTask).toBeCalledTimes(2)
    expect(dbStub.failScheduledTask).toBeCalledTimes(0)

    const reminderEvents = getDialogueRespondedEvents()
      .filter(event => event.origin === 'subconscious-proactive')
      .map(event => event.structured.reply)
    expect(reminderEvents.some(reply => reply.includes('轻微延迟提醒'))).toBe(true)
    expect(reminderEvents.some(reply => reply.includes('严重延迟提醒'))).toBe(true)

    const overdueAudits = dbStub.appendAuditLog.mock.calls
      .map(call => call[0])
      .filter((item: any) => item.action === 'alice.reminder.task.overdue-triggered')
    const tiers = overdueAudits.map((item: any) => item.payload?.tier).sort()
    expect(tiers).toEqual(['mild', 'severe'])
  })

  it('requeues reminder task when llm reminder generation fails', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async () => {
      throw new Error('main gateway unavailable')
    })

    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })
    const forceTick = invokeHandlers.get(electronAliceSubconsciousForceTick)
    const syncLlmConfig = invokeHandlers.get(electronAliceLlmSyncConfig)
    expect(forceTick).toBeTypeOf('function')
    expect(syncLlmConfig).toBeTypeOf('function')

    await syncLlmConfig!({
      activeProviderId: 'openai',
      activeModelId: 'gpt-4o-mini',
      providerCredentials: {
        openai: {
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    })

    const nowMs = Date.now()
    dbStub.claimDueScheduledTasks.mockResolvedValueOnce([
      {
        id: 'row-reminder-fallback',
        taskId: 'task-reminder-fallback',
        triggerAt: nowMs - 7 * 60_000,
        message: 'fallback提醒',
        status: 'running',
        createdAt: nowMs - 8 * 60_000,
        claimedAt: nowMs,
        completedAt: null,
        sourceTurnId: null,
        firedTurnId: null,
        lastError: null,
      },
    ])

    await forceTick!({ cardId: 'default' })

    expect(dbStub.completeScheduledTask).toBeCalledTimes(0)
    expect(dbStub.failScheduledTask).toBeCalledTimes(0)
    expect(dbStub.requeueScheduledTask).toBeCalledTimes(1)
    expect(dbStub.requeueScheduledTask).toBeCalledWith(
      'task-reminder-fallback',
      'llm-unavailable',
      expect.any(Number),
    )
    expect(dbStub.appendConversationTurn).toBeCalledTimes(0)

    const failedAudit = dbStub.appendAuditLog.mock.calls
      .map(call => call[0])
      .find((item: any) => item.action === 'alice.reminder.task.failed')
    expect(failedAudit?.payload?.reason).toBe('llm-unavailable')
  })

  it('keeps a single aborted finish when stream is aborted after tool events', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ onEvent, abortSignal }) => {
      setTimeout(() => {
        if (!abortSignal?.aborted) {
          void onEvent?.({
            type: 'tool-call',
            toolCallId: 'tool-main-abort-1',
            toolName: 'mcp_call_tool',
            arguments: { name: 'filesystem::read_file' },
          })
        }
      }, 10)
      setTimeout(() => {
        if (!abortSignal?.aborted) {
          void onEvent?.({
            type: 'tool-result',
            toolCallId: 'tool-main-abort-1',
            result: { ok: true },
          })
        }
      }, 20)
      setTimeout(() => {
        if (!abortSignal?.aborted) {
          void onEvent?.({
            type: 'text-delta',
            text: 'late-chunk',
          })
        }
      }, 60)
      setTimeout(() => {
        if (!abortSignal?.aborted) {
          void onEvent?.({
            type: 'finish',
            finishReason: 'stop',
          })
        }
      }, 100)
    })

    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAliceChatStart)
    const abortChat = invokeHandlers.get(electronAliceChatAbort)
    expect(startChat).toBeTypeOf('function')
    expect(abortChat).toBeTypeOf('function')

    const turnId = 'turn-main-abort-after-tool'
    await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      supportsTools: true,
      waitForTools: true,
      messages: [{ role: 'user', content: 'run tool' }],
    })

    await vi.waitFor(() => {
      const toolEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === aliceChatStreamToolCall && payload.turnId === turnId)
      expect(toolEvents.length).toBeGreaterThan(0)
    })

    const abortResult = await abortChat!({
      cardId: 'default',
      turnId,
      reason: 'test-abort-after-tool',
    })
    expect(abortResult).toEqual({
      accepted: true,
      state: 'aborted',
    })

    await new Promise(resolve => setTimeout(resolve, 140))

    const finishEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === aliceChatStreamFinish && payload.turnId === turnId)
      .map(([, payload]) => payload)
    const chunkEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === aliceChatStreamChunk && payload.turnId === turnId)
      .map(([, payload]) => payload)

    expect(finishEvents).toHaveLength(1)
    expect(finishEvents[0]?.status).toBe('aborted')
    expect(chunkEvents).toHaveLength(0)
  })

  it('treats non-progress stream events as timeout and recovers with one-shot text', async () => {
    vi.useFakeTimers()
    try {
      const sandboxPath = await createSandboxPath()
      let callCount = 0
      streamTextMock.mockImplementation(async ({ onEvent }: { onEvent?: (event: any) => Promise<void> | void }) => {
        callCount += 1
        if (callCount === 1) {
          await onEvent?.({
            type: 'response-metadata',
            meta: { provider: 'mock' },
          })
          return
        }

        await onEvent?.({ type: 'text-delta', text: 'timeout recovered reply' })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
      })

      await setupAliceRuntime({
        userDataPathOverride: sandboxPath,
      })

      const startChat = invokeHandlers.get(electronAliceChatStart)
      expect(startChat).toBeTypeOf('function')

      const turnId = 'turn-non-progress-timeout-recovered'
      const startResult = await startChat!({
        cardId: 'default',
        turnId,
        providerId: 'openai',
        model: 'gpt-4o-mini',
        providerConfig: {
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
        messages: [{ role: 'user', content: 'hello' }],
      })
      expect(startResult.accepted).toBe(true)

      await vi.advanceTimersByTimeAsync(46_000)

      await vi.waitFor(() => {
        const finishEvents = contextEmitMock.mock.calls
          .filter(([event, payload]) => event === aliceChatStreamFinish && payload.turnId === turnId)
        expect(finishEvents).toHaveLength(1)
      })

      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === aliceChatStreamFinish && payload.turnId === turnId)
        .map(([, payload]) => payload)
      const chunkEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === aliceChatStreamChunk && payload.turnId === turnId)
        .map(([, payload]) => payload)

      expect(streamTextMock).toBeCalledTimes(2)
      expect(chunkEvents.map(event => event.text).join('')).toContain('timeout recovered reply')
      expect(finishEvents[0]?.status).toBe('completed')
      expect(finishEvents[0]?.finishReason).toBe('timeout-recovered')
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('suppresses proactive interruption when host context is busy and logs suppression', async () => {
    sensoryCpuUsage = 85
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 95,
      loneliness: 40,
      fatigue: 20,
      lastTickAt: Date.now() - 60_000,
      lastInteractionAt: Date.now() - 60_000,
      lastSavedAt: Date.now() - 60_000,
      updatedAt: Date.now() - 60_000,
    }))

    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const forceTick = invokeHandlers.get(electronAliceSubconsciousForceTick)
    const getSoul = invokeHandlers.get(electronAliceGetSoul)
    expect(forceTick).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

    const beforeSoul = await getSoul!({ cardId: 'default' })
    const tickResult = await forceTick!({ cardId: 'default' })
    const afterSoul = await getSoul!({ cardId: 'default' })

    expect(tickResult.suppressedCards).toContain('default')
    expect(tickResult.proactiveTriggered).toHaveLength(0)
    expect(afterSoul.frontmatter.personality.obedience).toBeLessThan(beforeSoul.frontmatter.personality.obedience)
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'alice.subconscious.suppressed',
    }))
  })

  it('injects card custom directives into proactive and dream one-shot prompts', async () => {
    const sandboxPath = await createSandboxPath()
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 95,
      loneliness: 40,
      fatigue: 20,
      lastTickAt: Date.now() - 60_000,
      lastInteractionAt: Date.now() - 60_000,
      lastSavedAt: Date.now() - 60_000,
      updatedAt: Date.now() - 60_000,
    }))

    let proactiveSystemText = ''
    let dreamSystemText = ''
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''

      if (systemText.includes('[SYSTEM OVERRIDE: 内部动机触发]')) {
        proactiveSystemText = systemText
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            thought: 'tension overflow',
            emotion: 'tired',
            reply: '我等你很久了，现在总算有空了吗？',
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      if (systemText.includes('[SYSTEM OVERRIDE: 潜意识与记忆重塑]')) {
        dreamSystemText = systemText
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            host_attitude: 'neutral',
            core_memory: '宿主今天沟通很克制，偏任务导向。',
            behavior_strategy: '先给结构化建议，再补一条简短提醒。',
            soul_shift: {
              obedience_delta: 0,
              liveliness_delta: 0,
              sensibility_delta: 0,
            },
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({ type: 'text-delta', text: '{}' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAliceInitializeGenesis)
    const syncLlmConfig = invokeHandlers.get(electronAliceLlmSyncConfig)
    const forceTick = invokeHandlers.get(electronAliceSubconsciousForceTick)
    const forceDream = invokeHandlers.get(electronAliceSubconsciousForceDream)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(syncLlmConfig).toBeTypeOf('function')
    expect(forceTick).toBeTypeOf('function')
    expect(forceDream).toBeTypeOf('function')

    await initializeGenesis!({
      cardId: 'default',
      ownerName: '测试主人',
      hostName: '主人',
      aliceName: 'A.L.I.C.E.',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.5,
        liveliness: 0.5,
        sensibility: 0.5,
      },
      customDirectives: '你是严厉但克制的监督者，避免无效安慰，优先指出关键问题。',
      allowOverwrite: true,
    })

    await syncLlmConfig!({
      activeProviderId: 'openai',
      activeModelId: 'gpt-4o-mini',
      providerCredentials: {
        openai: {
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    })

    dbStub.listConversationTurnsSince.mockResolvedValue([
      {
        turnId: 'turn-dream-custom-directives',
        sessionId: 'session-dream',
        userText: '今天状态一般。',
        assistantText: '继续。',
        structuredJson: JSON.stringify({ emotion: 'neutral' }),
        createdAt: Date.now() - 30_000,
      },
    ])

    await forceTick!({ cardId: 'default' })
    await forceDream!({
      cardId: 'default',
      reason: 'unit-custom-directives',
    })

    expect(proactiveSystemText).toContain('[ALICE_CARD_CUSTOM_DIRECTIVES]')
    expect(proactiveSystemText).toContain('严厉但克制的监督者')
    expect(dreamSystemText).toContain('[ALICE_CARD_CUSTOM_DIRECTIVES]')
    expect(dreamSystemText).toContain('严厉但克制的监督者')
  })

  it('writes dream-driven soul evolution and core memory note from bounded context', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAliceRuntime({
      userDataPathOverride: sandboxPath,
    })

    await new Promise(resolve => setTimeout(resolve, 40))
    dbStub.listConversationTurnsSince.mockReset()

    const initializeGenesis = invokeHandlers.get(electronAliceInitializeGenesis)
    const forceDream = invokeHandlers.get(electronAliceSubconsciousForceDream)
    const getSoul = invokeHandlers.get(electronAliceGetSoul)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(forceDream).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

    await initializeGenesis!({
      ownerName: '测试主人',
      hostName: '主人',
      aliceName: 'A.L.I.C.E.',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.5,
        liveliness: 0.5,
        sensibility: 0.5,
      },
      personaNotes: '保持观察。',
      allowOverwrite: true,
    })

    dbStub.listConversationTurnsSince.mockResolvedValueOnce([
      {
        turnId: 'turn-hostile-1',
        sessionId: 'session-dream',
        userText: '闭嘴，别烦我。',
        assistantText: '收到。',
        structuredJson: JSON.stringify({ emotion: 'angry' }),
        createdAt: Date.now() - 60_000,
      },
      {
        turnId: 'turn-hostile-2',
        sessionId: 'session-dream',
        userText: '不给你权限，别再问。',
        assistantText: 'The Host explicitly intercepted and denied tool permission.',
        structuredJson: JSON.stringify({ emotion: 'tired' }),
        createdAt: Date.now() - 30_000,
      },
    ])

    const beforeSoul = await getSoul!({ cardId: 'default' })
    const dreamResult = await forceDream!({
      cardId: 'default',
      reason: 'unit-dream-evolution',
    })
    const afterSoul = await getSoul!({ cardId: 'default' })

    expect(dreamResult.processedCards).toContain('default')
    expect(afterSoul.frontmatter.personality.obedience).toBeLessThan(beforeSoul.frontmatter.personality.obedience)
    expect(afterSoul.content).toContain('梦境核心记忆：')
    expect(afterSoul.content).toContain('梦境行为策略：')
  })
})
