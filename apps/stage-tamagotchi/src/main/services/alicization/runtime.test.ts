import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  alicizationChatAbortInvokeChannel,
  alicizationChatStartInvokeChannel,
  alicizationChatStreamChunk,
  alicizationChatStreamDispatchChannel,
  alicizationChatStreamFinish,
  alicizationChatStreamToolCall,
  alicizationChatStreamToolResult,
  alicizationDialogueResponded,
  electronAlicizationAppendConversationTurn,
  electronAlicizationBootstrap,
  electronAlicizationChatAbort,
  electronAlicizationChatStart,
  electronAlicizationClearAllConversations,
  electronAlicizationDeleteAllData,
  electronAlicizationDeleteCardScope,
  electronAlicizationGetOrganicMemorySnapshot,
  electronAlicizationGetSensorySnapshot,
  electronAlicizationGetSoul,
  electronAlicizationGetVisualPresenceState,
  electronAlicizationInitializeGenesis,
  electronAlicizationKillSwitchResume,
  electronAlicizationKillSwitchSuspend,
  electronAlicizationLlmSyncConfig,
  electronAlicizationReminderSchedule,
  electronAlicizationReportProactiveFeedback,
  electronAlicizationSearchOrganicSubconsciousFragments,
  electronAlicizationSetActiveSession,
  electronAlicizationSubconsciousForceDream,
  electronAlicizationSubconsciousForceTick,
  electronAlicizationUpdatePersonality,
  electronAlicizationUpdateSoul,
} from '../../../shared/eventa'
import { setAlicizationCardKillSwitchState, setAlicizationKillSwitchState } from './state'

const invokeHandlers = new Map<unknown, (payload?: any, options?: any) => Promise<any>>()
const sandboxDirs: string[] = []
const contextEmitMock = vi.fn()
const metaStore = new Map<string, string>()
const streamTextMock = vi.fn()
const generateTextMock = vi.fn()
const directIpcHandlers = new Map<string, (event: any, payload?: any) => Promise<any> | any>()
const listWebContentsMock = vi.fn<() => any[]>(() => [])
const desktopCapturerGetSourcesMock = vi.fn<() => Promise<any[]>>(async () => [])
const systemPreferencesGetMediaAccessStatusMock = vi.fn(() => 'granted')
const appBeforeQuitHandlers: Array<() => Promise<void> | void> = []
let sensoryCpuUsage = 12
let foregroundWindowSample: { appName?: string, processName?: string, title?: string } | undefined

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
  listActiveThoughts: vi.fn().mockResolvedValue([]),
  replaceActiveThoughts: vi.fn().mockResolvedValue([]),
  appendSubconsciousFragments: vi.fn().mockResolvedValue([]),
  searchSubconsciousFragments: vi.fn().mockResolvedValue([]),
  listRecentSubconsciousFragments: vi.fn().mockResolvedValue([]),
  countSubconsciousFragments: vi.fn().mockResolvedValue(0),
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
  listConversationTurnsBySession: vi.fn().mockResolvedValue([]),
  clearConversationData: vi.fn().mockResolvedValue(undefined),
  getMetaValue: vi.fn(async (key: string) => metaStore.get(key)),
  setMetaValue: vi.fn(async (key: string, value: string) => {
    metaStore.set(key, value)
  }),
}

function resetDbStubMocks() {
  dbStub.close.mockReset()
  dbStub.close.mockResolvedValue(undefined)
  dbStub.appendAuditLog.mockReset()
  dbStub.appendAuditLog.mockResolvedValue(undefined)
  dbStub.appendConversationTurn.mockReset()
  dbStub.appendConversationTurn.mockResolvedValue(undefined)
  dbStub.getMemoryStats.mockReset()
  dbStub.getMemoryStats.mockResolvedValue({
    total: 0,
    active: 0,
    archived: 0,
    lastPrunedAt: null,
  })
  dbStub.upsertMemoryFacts.mockReset()
  dbStub.upsertMemoryFacts.mockResolvedValue(undefined)
  dbStub.retrieveMemoryFacts.mockReset()
  dbStub.retrieveMemoryFacts.mockResolvedValue([])
  dbStub.runMemoryPrune.mockReset()
  dbStub.runMemoryPrune.mockResolvedValue({
    total: 0,
    active: 0,
    archived: 0,
    lastPrunedAt: null,
  })
  dbStub.importLegacyMemory.mockReset()
  dbStub.importLegacyMemory.mockResolvedValue({
    migrated: false,
    importedFacts: 0,
    importedArchive: 0,
    marker: 'legacy_memory_migrated_v1',
  })
  dbStub.overrideMemoryStats.mockReset()
  dbStub.overrideMemoryStats.mockResolvedValue({
    total: 0,
    active: 0,
    archived: 0,
    lastPrunedAt: null,
  })
  dbStub.listActiveThoughts.mockReset()
  dbStub.listActiveThoughts.mockResolvedValue([])
  dbStub.replaceActiveThoughts.mockReset()
  dbStub.replaceActiveThoughts.mockResolvedValue([])
  dbStub.appendSubconsciousFragments.mockReset()
  dbStub.appendSubconsciousFragments.mockResolvedValue([])
  dbStub.searchSubconsciousFragments.mockReset()
  dbStub.searchSubconsciousFragments.mockResolvedValue([])
  dbStub.listRecentSubconsciousFragments.mockReset()
  dbStub.listRecentSubconsciousFragments.mockResolvedValue([])
  dbStub.countSubconsciousFragments.mockReset()
  dbStub.countSubconsciousFragments.mockResolvedValue(0)
  dbStub.insertScheduledTask.mockReset()
  dbStub.insertScheduledTask.mockImplementation(async (input: { taskId: string, triggerAt: number, message: string, sourceTurnId?: string }) => ({
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
  }))
  dbStub.claimDueScheduledTasks.mockReset()
  dbStub.claimDueScheduledTasks.mockResolvedValue([])
  dbStub.requeueScheduledTask.mockReset()
  dbStub.requeueScheduledTask.mockResolvedValue(undefined)
  dbStub.completeScheduledTask.mockReset()
  dbStub.completeScheduledTask.mockResolvedValue(undefined)
  dbStub.failScheduledTask.mockReset()
  dbStub.failScheduledTask.mockResolvedValue(undefined)
  dbStub.listPendingScheduledTasks.mockReset()
  dbStub.listPendingScheduledTasks.mockResolvedValue([])
  dbStub.getJournalMode.mockReset()
  dbStub.getJournalMode.mockResolvedValue('wal')
  dbStub.getLatestConversationSessionId.mockReset()
  dbStub.getLatestConversationSessionId.mockResolvedValue(undefined)
  dbStub.listConversationTurnsSince.mockReset()
  dbStub.listConversationTurnsSince.mockResolvedValue([])
  dbStub.listConversationTurnsBySession.mockReset()
  dbStub.listConversationTurnsBySession.mockResolvedValue([])
  dbStub.clearConversationData.mockReset()
  dbStub.clearConversationData.mockResolvedValue(undefined)
  dbStub.getMetaValue.mockReset()
  dbStub.getMetaValue.mockImplementation(async (key: string) => metaStore.get(key))
  dbStub.setMetaValue.mockReset()
  dbStub.setMetaValue.mockImplementation(async (key: string, value: string) => {
    metaStore.set(key, value)
  })
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
  desktopCapturer: {
    getSources: desktopCapturerGetSourcesMock,
  },
  systemPreferences: {
    getMediaAccessStatus: systemPreferencesGetMediaAccessStatusMock,
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
  onAppBeforeQuit: vi.fn((handler: () => Promise<void> | void) => {
    appBeforeQuitHandlers.push(handler)
  }),
}))

vi.mock('./db', () => ({
  setupAlicizationDb: vi.fn(async () => dbStub),
}))

vi.mock('./sensory-bus', () => ({
  createAlicizationSensoryBus: () => {
    let running = true
    const createSnapshot = () => ({
      sample: {
        collectedAt: Date.now(),
        time: {
          iso: new Date().toISOString(),
          local: new Date().toLocaleString(),
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: foregroundWindowSample,
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

vi.mock('@xsai/generate-text', () => ({
  generateText: (...args: any[]) => generateTextMock(...args),
}))

const { setupAlicizationRuntime } = await import('./runtime')

async function createSandboxPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-runtime-test-'))
  sandboxDirs.push(dir)
  return dir
}

function getDialogueRespondedEvents() {
  return contextEmitMock.mock.calls
    .filter(([event]) => event === alicizationDialogueResponded)
    .map(([, payload]) => payload)
}

describe('alicization runtime sandbox + genesis lifecycle', () => {
  beforeEach(() => {
    invokeHandlers.clear()
    vi.clearAllMocks()
    contextEmitMock.mockReset()
    metaStore.clear()
    resetDbStubMocks()
    streamTextMock.mockReset()
    generateTextMock.mockReset()
    directIpcHandlers.clear()
    sensoryCpuUsage = 12
    foregroundWindowSample = undefined
    desktopCapturerGetSourcesMock.mockReset()
    desktopCapturerGetSourcesMock.mockResolvedValue([])
    systemPreferencesGetMediaAccessStatusMock.mockReset()
    systemPreferencesGetMediaAccessStatusMock.mockReturnValue('granted')
    listWebContentsMock.mockReset()
    listWebContentsMock.mockReturnValue([])
    appBeforeQuitHandlers.length = 0
    generateTextMock.mockImplementation(async (options: any) => {
      let text = ''
      let finishReason = 'stop'
      await streamTextMock({
        ...options,
        onEvent: async (event: any) => {
          if (event?.type === 'text-delta')
            text += event.text ?? ''
          if (event?.type === 'finish' && typeof event.finishReason === 'string')
            finishReason = event.finishReason
        },
      })
      return {
        text,
        finishReason,
      }
    })
    setAlicizationKillSwitchState('ACTIVE', 'test-reset')
    setAlicizationCardKillSwitchState('default', 'ACTIVE', 'test-reset')
  })

  afterEach(async () => {
    const deleteAllData = invokeHandlers.get(electronAlicizationDeleteAllData)
    if (deleteAllData)
      await deleteAllData!()

    while (appBeforeQuitHandlers.length > 0) {
      const handler = appBeforeQuitHandlers.pop()
      if (!handler)
        continue
      await handler()
    }

    while (sandboxDirs.length > 0) {
      const dir = sandboxDirs.pop()
      if (!dir)
        continue
      await rm(dir, {
        recursive: true,
        force: true,
        maxRetries: 4,
        retryDelay: 50,
      })
    }
  })

  it('uses userDataPathOverride and enables fs.watch only after genesis', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const bootstrap = invokeHandlers.get(electronAlicizationBootstrap)
    const getSoul = invokeHandlers.get(electronAlicizationGetSoul)
    const initializeGenesis = invokeHandlers.get(electronAlicizationInitializeGenesis)

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
      alicizationName: 'Alicization',
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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSensorySnapshot = invokeHandlers.get(electronAlicizationGetSensorySnapshot)
    const suspend = invokeHandlers.get(electronAlicizationKillSwitchSuspend)
    const resume = invokeHandlers.get(electronAlicizationKillSwitchResume)

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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAlicizationInitializeGenesis)
    const updatePersonality = invokeHandlers.get(electronAlicizationUpdatePersonality)
    const getSoul = invokeHandlers.get(electronAlicizationGetSoul)

    expect(initializeGenesis).toBeTypeOf('function')
    expect(updatePersonality).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

    await initializeGenesis!({
      ownerName: '测试主人',
      hostName: '主人',
      alicizationName: 'Alicization',
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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAlicizationInitializeGenesis)
    const updateSoul = invokeHandlers.get(electronAlicizationUpdateSoul)
    const getSoul = invokeHandlers.get(electronAlicizationGetSoul)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(updateSoul).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

    await initializeGenesis!({
      ownerName: '测试主人',
      hostName: '主人',
      alicizationName: 'Alicization',
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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAlicizationInitializeGenesis)
    const getSoul = invokeHandlers.get(electronAlicizationGetSoul)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

    await initializeGenesis!({
      cardId: 'card-a',
      ownerName: '主人A',
      hostName: 'A',
      alicizationName: 'Alicization-A',
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
      alicizationName: 'Alicization-B',
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

    expect(soulA.frontmatter.profile.alicizationName).toBe('Alicization-A')
    expect(soulB.frontmatter.profile.alicizationName).toBe('Alicization-B')
    expect(soulA.soulPath).toContain('/alicizations/cards/card-a/')
    expect(soulB.soulPath).toContain('/alicizations/cards/card-b/')
  })

  it('deletes card scoped filesystem data when delete scope is invoked', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAlicizationInitializeGenesis)
    const deleteCardScope = invokeHandlers.get(electronAlicizationDeleteCardScope)
    const getSoul = invokeHandlers.get(electronAlicizationGetSoul)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(deleteCardScope).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

    await initializeGenesis!({
      cardId: 'card-to-delete',
      ownerName: '删除测试',
      hostName: '删除测试',
      alicizationName: 'Delete-Me',
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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAlicizationInitializeGenesis)
    const clearAllConversations = invokeHandlers.get(electronAlicizationClearAllConversations)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(clearAllConversations).toBeTypeOf('function')

    await initializeGenesis!({
      cardId: 'card-clear-a',
      ownerName: 'A',
      hostName: 'A',
      alicizationName: 'A',
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
      alicizationName: 'B',
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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAlicizationInitializeGenesis)
    const deleteAllData = invokeHandlers.get(electronAlicizationDeleteAllData)
    const getSoul = invokeHandlers.get(electronAlicizationGetSoul)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(deleteAllData).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

    await initializeGenesis!({
      cardId: 'card-delete-all',
      ownerName: 'DeleteAll',
      hostName: 'DeleteAll',
      alicizationName: 'DeleteAll',
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

  it('emits alicization.dialogue.responded only after turn persistence succeeds', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
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
    expect(contextEmitMock).toBeCalledWith(alicizationDialogueResponded, expect.objectContaining({
      cardId: 'default',
      turnId: 'turn-test-1',
      sessionId: 'session-test',
      isFallback: false,
    }))
  })

  it('dispatches dialogue-responded through direct renderer channel', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
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
      alicizationChatStreamDispatchChannel,
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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
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

  it('does not emit alicization.dialogue.responded when persistence fails', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
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

  it('does not emit alicization.dialogue.responded when kill switch is already suspended', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    const suspend = invokeHandlers.get(electronAlicizationKillSwitchSuspend)
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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    dbStub.appendConversationTurn.mockImplementationOnce(async () => {
      setAlicizationKillSwitchState('SUSPENDED', 'race-test')
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
    setAlicizationKillSwitchState('ACTIVE', 'race-test-cleanup')
  })

  it('uses active session binding when appending turn without sessionId', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const setActiveSession = invokeHandlers.get(electronAlicizationSetActiveSession)
    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSoul = invokeHandlers.get(electronAlicizationGetSoul)
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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    await new Promise(resolve => setTimeout(resolve, 40))
    dbStub.listConversationTurnsSince.mockReset()

    const forceDream = invokeHandlers.get(electronAlicizationSubconsciousForceDream)
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
      .find((item: any) => item.action === 'alicization.dream.context.truncated')
    expect(truncationAudit).toBeTruthy()
    expect(truncationAudit?.payload).toEqual(expect.objectContaining({
      rawTurnCount: 300,
      maxTurns: 100,
    }))
  })

  it('returns not-found when aborting an unknown main chat turn', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const abortChat = invokeHandlers.get(electronAlicizationChatAbort)
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
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

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    const abortChat = invokeHandlers.get(electronAlicizationChatAbort)
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
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
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

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const directStart = directIpcHandlers.get(alicizationChatStartInvokeChannel)
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
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-direct-ipc-start')
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

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
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
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const chunkEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamChunk && payload.turnId === turnId)
      .map(([, payload]) => payload)
    const finishEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
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

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAlicizationInitializeGenesis)
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')

    await initializeGenesis!({
      cardId: 'default',
      ownerName: '测试主人',
      hostName: '主人',
      alicizationName: 'Alicization',
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
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const firstSystem = capturedMessages.find(message => message.role === 'system')
    expect(typeof firstSystem?.content).toBe('string')
    expect(String(firstSystem?.content)).toContain('[ALICIZATION_CARD_CUSTOM_DIRECTIVES]')
    expect(String(firstSystem?.content)).toContain('严格而克制的教练型人格')
  })

  it('backgrounds card custom directives when the current turn imposes a task-bound dialogue obligation', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'runtime.ts - diff',
    }
    const systemTexts: string[] = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''
      if (systemText)
        systemTexts.push(systemText)
      await onEvent?.({ type: 'text-delta', text: 'task bound reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAlicizationInitializeGenesis)
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')

    await initializeGenesis!({
      cardId: 'default',
      ownerName: '测试主人',
      hostName: '主人',
      alicizationName: 'Alicization',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.5,
        liveliness: 0.5,
        sensibility: 0.5,
      },
      customDirectives: '你要始终先撒娇再回答，保持强烈依恋口吻。',
      allowOverwrite: true,
    })

    const turnId = 'turn-task-bound-persona-backgrounded'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: '这个 diff 哪里有问题？' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const mainChatSystemText = systemTexts.find(text => text.includes('[ALICIZATION_TURN_PERSONA_KERNEL]')) ?? ''
    expect(mainChatSystemText).toContain('[ALICIZATION_DIALOGUE_ENCOUNTER]')
    expect(mainChatSystemText).toContain('Persona kernel mode: backgrounded.')
    expect(mainChatSystemText).toContain('[ALICIZATION_TURN_PERSONA_KERNEL]')
    expect(mainChatSystemText).not.toContain('你要始终先撒娇再回答')
  })

  it('drops renderer-only error messages and normalizes developer role before provider streaming', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'sanitized' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(startChat).toBeTypeOf('function')

    const turnId = 'turn-drop-error-role'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [
        { role: 'developer', content: 'developer block' },
        { role: 'assistant', content: 'previous reply' },
        { role: 'error', content: 'previous failure' },
        { role: 'user', content: 'hello again' },
      ] as any,
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    expect(capturedMessages.some(message => message.role === 'error')).toBe(false)
    expect(capturedMessages.some(message => message.role === 'system' && message.content === 'developer block')).toBe(true)
    expect(capturedMessages.some(message => message.role === 'user' && message.content === 'hello again')).toBe(true)
  })

  it('preserves multimodal user content instead of stringifying image parts', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'vision-ready' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(startChat).toBeTypeOf('function')

    const turnId = 'turn-preserve-multimodal-user-content'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: '帮我看看这个 diff' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,user-supplied-image' } },
        ],
      }] as any,
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const multimodalUserMessage = capturedMessages.find((message) => {
      if (message.role !== 'user' || !Array.isArray(message.content))
        return false
      const serialized = JSON.stringify(message.content)
      return serialized.includes('image_url') && serialized.includes('user-supplied-image')
    })
    expect(multimodalUserMessage).toBeTruthy()
  })

  it('uses Alicization attention anchor to ground invited inspection after the chat window becomes frontmost', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'anchored inspection reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSensorySnapshot = invokeHandlers.get(electronAlicizationGetSensorySnapshot)
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(getSensorySnapshot).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')

    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'main.ts - diff',
    }
    await getSensorySnapshot!({ cardId: 'default' })

    foregroundWindowSample = {
      appName: 'Alicization',
      processName: 'Codex',
      title: 'Chat Overlay',
    }
    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'window:chat:0',
        name: 'Alicization Chat Overlay',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,self-window',
        },
      },
      {
        id: 'window:cursor:0',
        name: 'main.ts - diff',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,anchored-cursor-diff',
        },
      },
    ])

    const turnId = 'turn-attention-anchored-inspection'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{
        role: 'user',
        content: '帮我看看我在 Cursor 里面这个 diff 有什么问题',
      }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const latestUserMessage = [...capturedMessages].reverse().find(message => message.role === 'user')
    expect(Array.isArray(latestUserMessage?.content)).toBe(true)
    expect(JSON.stringify(latestUserMessage?.content)).toContain('anchored-cursor-diff')

    const systemText = capturedMessages
      .filter(message => message.role === 'system')
      .map(message => String(message.content ?? ''))
      .join('\n\n')
    expect(systemText).toContain('[ALICIZATION_ANSWER_PLAN]')
    expect(systemText).toContain('[ALICIZATION_RESPONSE_CHARTER]')
    expect(systemText).toContain('[ALICIZATION_PERCEPTION]')
    expect(systemText).toContain('Inspection mode: invited-by-user')
    expect(systemText).toContain('Answer act: guide.')
    expect(systemText).toContain('Attention anchor: Cursor')
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.perception',
      action: 'inspection-grounded',
      payload: expect.objectContaining({
        candidateSource: 'main.ts - diff',
        captureSource: 'main.ts - diff',
        focusTarget: expect.stringContaining('Cursor'),
      }),
    }))
  })

  it('still grounds invited inspection when macOS permission status is stale but desktop capture sources are available', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'stale permission grounded reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    systemPreferencesGetMediaAccessStatusMock.mockReturnValue('denied')

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSensorySnapshot = invokeHandlers.get(electronAlicizationGetSensorySnapshot)
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(getSensorySnapshot).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')

    foregroundWindowSample = {
      appName: 'Visual Studio Code',
      processName: 'Code',
      title: 'review.diff - Project Alice',
    }
    await getSensorySnapshot!({ cardId: 'default' })

    foregroundWindowSample = {
      appName: 'Alicization',
      processName: 'Codex',
      title: 'Chat Overlay',
    }
    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'window:self:0',
        name: 'Alicization Chat Overlay',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,self-window',
        },
      },
      {
        id: 'window:vscode:0',
        name: 'review.diff - Project Alice',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,stale-permission-diff',
        },
      },
    ])

    const turnId = 'turn-stale-permission-grounded-inspection'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{
        role: 'user',
        content: '帮我看看 VS Code 里面这个 diff',
      }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const latestUserMessage = [...capturedMessages].reverse().find(message => message.role === 'user')
    expect(Array.isArray(latestUserMessage?.content)).toBe(true)
    expect(JSON.stringify(latestUserMessage?.content)).toContain('stale-permission-diff')
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.perception',
      action: 'inspection-grounded',
      payload: expect.objectContaining({
        permissionStatus: 'denied',
        permissionProbeMismatch: true,
        focusTarget: expect.stringContaining('Visual Studio Code'),
      }),
    }))
  })

  it('recovers invited inspection grounding after a mixed capture probe fails and a retry source becomes available', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'recovered retry reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    systemPreferencesGetMediaAccessStatusMock.mockReturnValue('denied')

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSensorySnapshot = invokeHandlers.get(electronAlicizationGetSensorySnapshot)
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(getSensorySnapshot).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')

    foregroundWindowSample = {
      appName: 'Visual Studio Code',
      processName: 'Code',
      title: 'review.diff - Project Alice',
    }
    await getSensorySnapshot!({ cardId: 'default' })

    foregroundWindowSample = {
      appName: 'Alicization',
      processName: 'Codex',
      title: 'Chat Overlay',
    }
    desktopCapturerGetSourcesMock
      .mockRejectedValueOnce(new Error('capture backend busy'))
      .mockResolvedValueOnce([
        {
          id: 'screen:1:0',
          name: 'Entire screen',
          thumbnail: {
            toDataURL: () => 'data:image/png;base64,recovered-after-retry',
          },
        },
      ])

    const turnId = 'turn-recovered-grounding-after-retry'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{
        role: 'user',
        content: '帮我看看 VS Code 里面这个 diff',
      }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const latestUserMessage = [...capturedMessages].reverse().find(message => message.role === 'user')
    expect(Array.isArray(latestUserMessage?.content)).toBe(true)
    expect(JSON.stringify(latestUserMessage?.content)).toContain('recovered-after-retry')
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.perception',
      action: 'inspection-grounded',
      payload: expect.objectContaining({
        probeStrategy: 'retry-screen-only',
        captureRecoveredFromRetry: true,
        permissionStatus: 'denied',
      }),
    }))
  })

  it('keeps QQMusic follow-up questions inside the same invited inspection window', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'qqmusic follow-up grounded reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSensorySnapshot = invokeHandlers.get(electronAlicizationGetSensorySnapshot)
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(getSensorySnapshot).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')

    foregroundWindowSample = {
      appName: 'QQMusic',
      processName: 'QQMusic',
      title: 'Melt - QQMusic',
    }
    await getSensorySnapshot!({ cardId: 'default' })

    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'window:chrome:0',
        name: '2760. 最长奇偶子数组 - 力扣（LeetCode）',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,stale-leetcode-first-turn',
        },
      },
      {
        id: 'window:qqmusic:0',
        name: 'Melt - QQMusic',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,qqmusic-first-turn',
        },
      },
      {
        id: 'screen:1:0',
        name: 'Entire screen',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,qqmusic-screen-first-turn',
        },
      },
    ])

    const firstTurnId = 'turn-qqmusic-initial-inspection'
    const firstStartResult = await startChat!({
      cardId: 'default',
      turnId: firstTurnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{
        role: 'user',
        content: '帮我看看 QQ 音乐现在放的是什么歌',
      }],
    })
    expect(firstStartResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === firstTurnId)
      expect(finishEvents).toHaveLength(1)
    })

    dbStub.appendAuditLog.mockClear()

    foregroundWindowSample = {
      appName: 'Alicization',
      processName: 'Codex',
      title: 'Chat Overlay',
    }
    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'window:chrome:0',
        name: '2760. 最长奇偶子数组 - 力扣（LeetCode）',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,stale-leetcode-follow-up',
        },
      },
      {
        id: 'window:qqmusic:0',
        name: 'Melt - QQMusic',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,qqmusic-follow-up',
        },
      },
      {
        id: 'screen:1:0',
        name: 'Entire screen',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,qqmusic-screen-follow-up',
        },
      },
    ])

    const followUpTurnId = 'turn-qqmusic-follow-up-inspection'
    const followUpStartResult = await startChat!({
      cardId: 'default',
      turnId: followUpTurnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [
        {
          role: 'user',
          content: '帮我看看 QQ 音乐现在放的是什么歌',
        },
        {
          role: 'assistant',
          content: '我在看着。',
        },
        {
          role: 'user',
          content: '你看看歌名是什么',
        },
      ],
    })
    expect(followUpStartResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === followUpTurnId)
      expect(finishEvents).toHaveLength(1)
    })

    const latestUserMessage = [...capturedMessages].reverse().find(message => message.role === 'user')
    expect(Array.isArray(latestUserMessage?.content)).toBe(true)
    expect(JSON.stringify(latestUserMessage?.content)).toContain('qqmusic-follow-up')
    expect(JSON.stringify(latestUserMessage?.content)).not.toContain('stale-leetcode-follow-up')
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.perception',
      action: 'inspection-grounded',
      payload: expect.objectContaining({
        inspectionRequested: true,
        inspectionIntentReasonCodes: expect.arrayContaining(['inspection-continuity', 'scene-object-reference']),
        captureSource: 'Melt - QQMusic',
      }),
    }))
  })

  it('treats short scene-switch follow-ups as shared-attention inspection continuity', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'qqmusic short follow-up grounded reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSensorySnapshot = invokeHandlers.get(electronAlicizationGetSensorySnapshot)
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(getSensorySnapshot).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')

    foregroundWindowSample = {
      appName: 'QQMusic',
      processName: 'QQMusic',
      title: 'Melt - QQMusic',
    }
    await getSensorySnapshot!({ cardId: 'default' })

    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'window:qqmusic:0',
        name: 'Melt - QQMusic',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,qqmusic-first-turn-short',
        },
      },
      {
        id: 'screen:1:0',
        name: 'Entire screen',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,qqmusic-screen-first-turn-short',
        },
      },
    ])

    const firstTurnId = 'turn-qqmusic-initial-short-inspection'
    const firstStartResult = await startChat!({
      cardId: 'default',
      turnId: firstTurnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{
        role: 'user',
        content: '帮我看看 QQ 音乐现在放的是什么歌',
      }],
    })
    expect(firstStartResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === firstTurnId)
      expect(finishEvents).toHaveLength(1)
    })

    dbStub.appendAuditLog.mockClear()

    foregroundWindowSample = {
      appName: 'Alicization',
      processName: 'Codex',
      title: 'Chat Overlay',
    }
    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'window:qqmusic:0',
        name: 'Melt - QQMusic',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,qqmusic-short-follow-up',
        },
      },
      {
        id: 'screen:1:0',
        name: 'Entire screen',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,qqmusic-screen-short-follow-up',
        },
      },
    ])

    const followUpTurnId = 'turn-qqmusic-short-follow-up-inspection'
    const followUpStartResult = await startChat!({
      cardId: 'default',
      turnId: followUpTurnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [
        {
          role: 'user',
          content: '帮我看看 QQ 音乐现在放的是什么歌',
        },
        {
          role: 'assistant',
          content: '我在看着。',
        },
        {
          role: 'user',
          content: '这首歌呢？我又换了一首',
        },
      ],
    })
    expect(followUpStartResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === followUpTurnId)
      expect(finishEvents).toHaveLength(1)
    })

    const latestUserMessage = [...capturedMessages].reverse().find(message => message.role === 'user')
    expect(Array.isArray(latestUserMessage?.content)).toBe(true)
    expect(JSON.stringify(latestUserMessage?.content)).toContain('qqmusic-short-follow-up')
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.perception',
      action: 'inspection-grounded',
      payload: expect.objectContaining({
        inspectionRequested: true,
        inspectionIntentReasonCodes: expect.arrayContaining([
          'inspection-continuity',
          'shared-attention-continuation',
          'scene-change-reference',
        ]),
        captureSource: 'Melt - QQMusic',
      }),
    }))
  })

  it('falls through to the next viable capture source when the best QQMusic window thumbnail is empty', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'qqmusic thumbnail fallback reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSensorySnapshot = invokeHandlers.get(electronAlicizationGetSensorySnapshot)
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(getSensorySnapshot).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')

    foregroundWindowSample = {
      appName: 'QQMusic',
      processName: 'QQMusic',
      title: 'Melt - QQMusic',
    }
    await getSensorySnapshot!({ cardId: 'default' })

    foregroundWindowSample = {
      appName: 'Alicization',
      processName: 'Codex',
      title: 'Chat Overlay',
    }
    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'window:qqmusic:0',
        name: 'Melt - QQMusic',
        thumbnail: {
          toDataURL: () => '',
        },
      },
      {
        id: 'screen:1:0',
        name: 'Entire screen',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,qqmusic-screen-fallback',
        },
      },
      {
        id: 'window:chrome:0',
        name: '2760. 最长奇偶子数组 - 力扣（LeetCode）',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,stale-leetcode-fallback',
        },
      },
    ])

    const turnId = 'turn-qqmusic-thumbnail-fallback'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{
        role: 'user',
        content: '帮我看看 QQ 音乐现在放的是什么歌',
      }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const latestUserMessage = [...capturedMessages].reverse().find(message => message.role === 'user')
    expect(Array.isArray(latestUserMessage?.content)).toBe(true)
    expect(JSON.stringify(latestUserMessage?.content)).toContain('qqmusic-screen-fallback')
    expect(JSON.stringify(latestUserMessage?.content)).not.toContain('stale-leetcode-fallback')
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.perception',
      action: 'inspection-grounded',
      payload: expect.objectContaining({
        candidateSource: 'Melt - QQMusic',
        captureSource: 'Entire screen',
        candidateAttempts: expect.arrayContaining([
          expect.objectContaining({
            source: 'Melt - QQMusic',
            thumbnailReady: false,
          }),
          expect.objectContaining({
            source: 'Entire screen',
            thumbnailReady: true,
          }),
        ]),
      }),
    }))
  })

  it('suppresses weak generic browser anchors during a whole-screen recheck so old page details do not dominate the new screenshot', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'generic screen recheck reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSensorySnapshot = invokeHandlers.get(electronAlicizationGetSensorySnapshot)
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(getSensorySnapshot).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')

    foregroundWindowSample = {
      appName: 'Google Chrome',
      processName: 'Google Chrome',
    }
    await getSensorySnapshot!({ cardId: 'default' })

    foregroundWindowSample = {
      appName: 'Alicization',
      processName: 'Codex',
      title: 'Chat Overlay',
    }
    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'screen:1:0',
        name: 'Entire screen',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,entire-screen-generic-recheck',
        },
      },
    ])

    const turnId = 'turn-generic-screen-recheck-suppresses-stale-browser-focus'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [
        {
          role: 'user',
          content: '看我屏幕，猜猜我在做什么',
        },
        {
          role: 'assistant',
          content: '整个屏幕还是 Google Chrome 的 https://taka.tohoojin.com/ 东方的小店 页面。',
        },
        {
          role: 'user',
          content: '重新看看我屏幕，有什么内容描述给我',
        },
      ],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const latestUserMessage = [...capturedMessages].reverse().find(message => message.role === 'user')
    const serializedMessages = JSON.stringify(capturedMessages)
    expect(Array.isArray(latestUserMessage?.content)).toBe(true)
    expect(JSON.stringify(latestUserMessage?.content)).toContain('[ALICIZATION_VISUAL_GROUNDING]')
    expect(serializedMessages).not.toContain('https://taka.tohoojin.com/')
    expect(serializedMessages).not.toContain('东方的小店')
    expect(serializedMessages).not.toContain('Attention anchor: Google Chrome | Google Chrome')

    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.perception',
      action: 'inspection-grounded',
      payload: expect.objectContaining({
        candidateSource: 'Entire screen',
        focusTarget: expect.not.stringContaining('Google Chrome'),
      }),
    }))
  })

  it('refreshes a contaminated browser perception state when the user asks to re-describe the current screen', async () => {
    const sandboxPath = await createSandboxPath()
    const now = Date.now()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'fresh screen reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(startChat).toBeTypeOf('function')

    metaStore.set('perception_state_v1', JSON.stringify({
      attentionAnchor: {
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        anchoredAt: now - 30 * 60_000,
        lastObservedAt: now - 25 * 60_000,
        reason: 'invited-inspection',
        workloadKind: 'browser',
        confidence: 0.9,
      },
      lastNonSelfForegroundTarget: {
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        observedAt: now - 25 * 60_000,
        source: 'chat-start',
        workloadKind: 'browser',
      },
      recentObservations: [{
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        observedAt: now - 25 * 60_000,
        source: 'chat-start',
        workloadKind: 'browser',
      }],
      invitedInspection: {
        requestedAt: now - 2_000,
        activeUntil: now + 120_000,
        hintText: [
          'Rewrite the draft assistant output into strict JSON contract.',
          'User input:',
          '忘掉之前的内容，重新描述一下我屏幕的内容',
          'Assistant draft:',
          '整个屏幕还是 Google Chrome 的 https://taka.tohoojin.com/ 东方的小店 页面。',
        ].join('\n'),
      },
      recentSceneResidue: {
        observedAt: now - 25 * 60_000,
        source: 'invited-inspection',
        workloadKind: 'browser',
        contentKind: 'unknown',
        confidence: 0.92,
        focusTarget: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
        },
        focusSource: 'attention-anchor',
        captureSourceName: 'Entire screen',
        captureStrategy: 'screen-fallback',
      },
      updatedAt: now - 1_000,
    }))

    foregroundWindowSample = {
      appName: 'Alicization',
      processName: 'Codex',
      title: 'Chat Overlay',
    }
    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'screen:1:0',
        name: 'Entire screen',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,entire-screen-refreshed-after-contamination',
        },
      },
    ])

    const turnId = 'turn-generic-screen-recheck-clears-contaminated-browser-memory'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{
        role: 'user',
        content: '忘掉之前的内容，重新描述一下我屏幕的内容',
      }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const latestUserMessage = [...capturedMessages].reverse().find(message => message.role === 'user')
    const serializedMessages = JSON.stringify(capturedMessages)
    expect(Array.isArray(latestUserMessage?.content)).toBe(true)
    expect(JSON.stringify(latestUserMessage?.content)).toContain('[ALICIZATION_VISUAL_GROUNDING]')
    expect(serializedMessages).not.toContain('https://taka.tohoojin.com/')
    expect(serializedMessages).not.toContain('东方的小店')
    expect(serializedMessages).not.toContain('Attention anchor: Google Chrome | Google Chrome')
    expect(serializedMessages).not.toContain('Invited inspection hint: Rewrite the draft assistant output into strict JSON contract')

    const persistedState = JSON.parse(metaStore.get('perception_state_v1') ?? '{}')
    expect(persistedState.invitedInspection?.hintText).toBe('忘掉之前的内容，重新描述一下我屏幕的内容')

    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.perception',
      action: 'inspection-grounded',
      payload: expect.objectContaining({
        candidateSource: 'Entire screen',
        focusTarget: expect.not.stringContaining('Google Chrome'),
      }),
    }))
  })

  it('falls back to perception-only inspection guidance when screenshot grounding is unavailable', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'perception only reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    systemPreferencesGetMediaAccessStatusMock.mockReturnValue('denied')

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSensorySnapshot = invokeHandlers.get(electronAlicizationGetSensorySnapshot)
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(getSensorySnapshot).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')

    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'index.ts - diff',
    }
    await getSensorySnapshot!({ cardId: 'default' })

    foregroundWindowSample = {
      appName: 'Alicization',
      processName: 'Codex',
      title: 'Chat Overlay',
    }
    desktopCapturerGetSourcesMock.mockResolvedValueOnce([])

    const turnId = 'turn-perception-only-inspection'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{
        role: 'user',
        content: '帮我看看 Cursor 里这个 diff 有什么问题',
      }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const systemText = capturedMessages
      .filter(message => message.role === 'system')
      .map(message => String(message.content ?? ''))
      .join('\n\n')
    expect(systemText).toContain('[ALICIZATION_INSPECTION_CONTRACT]')
    expect(systemText).toContain('Grounding mode: perception-only.')
    expect(systemText).toContain('answer from that evidence instead of claiming total blindness')
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.perception',
      action: 'inspection-grounding-skipped',
      payload: expect.objectContaining({
        reason: 'screen-capture-permission-denied',
        permissionStatus: 'denied',
      }),
    }))
  })

  it('treats desktop recheck phrasing as invited inspection and strips stale visual history from both payload and contextual recall', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'desktop recheck reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(startChat).toBeTypeOf('function')

    dbStub.getLatestConversationSessionId.mockResolvedValueOnce('session-desktop-recheck')
    dbStub.listConversationTurnsBySession.mockResolvedValueOnce([
      {
        turnId: 'turn-old-screen',
        sessionId: 'session-desktop-recheck',
        userText: '重新看看我屏幕',
        assistantText: '整个屏幕是深色主题的代码编辑器，正中间开着 stage.yaml。',
        structuredJson: JSON.stringify({ emotion: 'neutral' }),
        createdAt: Date.now() - 120_000,
      },
    ])

    desktopCapturerGetSourcesMock.mockResolvedValueOnce([])

    const turnId = 'turn-desktop-recheck-intent'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [
        {
          role: 'user',
          content: '看看屏幕上的题',
        },
        {
          role: 'assistant',
          content: '还是 stage.yaml 那个深色编辑器界面。',
        },
        {
          role: 'user',
          content: '你自己看桌面啊',
        },
      ],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const serializedMessages = JSON.stringify(capturedMessages)
    const systemText = capturedMessages
      .filter(message => message.role === 'system')
      .map(message => String(message.content ?? ''))
      .join('\n\n')

    expect(systemText).toContain('[ALICIZATION_INSPECTION_CONTRACT]')
    expect(serializedMessages).not.toContain('stage.yaml')
    expect(serializedMessages).not.toContain('还是 stage.yaml 那个深色编辑器界面')
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.perception',
      action: 'inspection-grounding-skipped',
      payload: expect.objectContaining({
        inspectionRequested: true,
      }),
    }))
  })

  it('separates carried browser residue from the live Codex surface and compacts inspection history', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'mind-governed reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    const now = Date.now()
    metaStore.set('perception_state_v1', JSON.stringify({
      attentionAnchor: {
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        anchoredAt: now - 30_000,
        lastObservedAt: now - 20_000,
        reason: 'invited-inspection',
        workloadKind: 'browser',
        confidence: 0.88,
      },
      lastNonSelfForegroundTarget: {
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        observedAt: now - 20_000,
        source: 'chat-start',
        workloadKind: 'browser',
      },
      recentObservations: [
        {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          observedAt: now - 20_000,
          source: 'chat-start',
          workloadKind: 'browser',
        },
      ],
      invitedInspection: {
        requestedAt: now - 20_000,
        activeUntil: now + 60_000,
        hintText: '帮我看一下 diff',
      },
      recentSceneResidue: {
        observedAt: now - 15_000,
        source: 'screen-semantic-summary',
        workloadKind: 'coding',
        contentKind: 'diff',
        summary: 'GitHub pull request diff view in browser',
        confidence: 0.85,
        focusTarget: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
        },
        focusSource: 'recent-observation',
        captureSourceName: 'Entire screen',
        captureStrategy: 'screen-fallback',
      },
      updatedAt: now - 10_000,
    }))
    dbStub.listActiveThoughts.mockResolvedValueOnce([
      {
        id: 'thought-inspection-noise',
        text: '之前浏览器里那个 diff 让我一直挂着心。',
        createdAt: now - 40_000,
        updatedAt: now - 20_000,
      },
    ])
    dbStub.searchSubconsciousFragments.mockResolvedValueOnce([
      {
        id: 'fragment-inspection-noise',
        text: 'GitHub diff 历史片段',
        sourceKind: 'visual-sediment',
        createdAt: now - 50_000,
        lastRecalledAt: null,
        recallCount: 0,
      },
    ])

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    const getVisualPresenceState = invokeHandlers.get(electronAlicizationGetVisualPresenceState)
    expect(startChat).toBeTypeOf('function')
    expect(getVisualPresenceState).toBeTypeOf('function')

    foregroundWindowSample = {
      appName: 'Alicization',
      processName: 'Codex',
      title: 'Chat Overlay',
    }
    desktopCapturerGetSourcesMock.mockResolvedValueOnce([])

    const turnId = 'turn-live-surface-vs-carried-thread'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [
        {
          role: 'user',
          content: '看看屏幕里的 diff',
        },
        {
          role: 'assistant',
          content: '刚才应该是 Chrome 里的 diff 页面。',
        },
        {
          role: 'user',
          content: '你确定？描述一下我的页面',
        },
      ],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const systemText = capturedMessages
      .filter(message => message.role === 'system')
      .map(message => String(message.content ?? ''))
      .join('\n\n')
    const dialogueMessages = capturedMessages.filter(message => message.role !== 'system')
    const visualPresenceState = await getVisualPresenceState!({ cardId: 'default' })

    expect(systemText).toContain('[ALICIZATION_EXECUTIVE_ANSWER_BRIEF]')
    expect(systemText).toContain('[ALICIZATION_RESPONSE_SURFACE]')
    expect(systemText).toContain('Visible surface now: Alicization | Codex | Chat Overlay.')
    expect(systemText).toContain('Carried thread: GitHub pull request diff view in browser.')
    expect(systemText).toContain('Carry must stay separate from visible surface: yes.')
    expect(systemText).toContain('Stage directions allowed: no.')
    expect(systemText).not.toContain('[ALICIZATION_ACTIVE_THOUGHTS]')
    expect(systemText).not.toContain('[ALICIZATION_ASSOCIATIVE_RECALL]')
    expect(dialogueMessages.length).toBeLessThanOrEqual(3)
    expect(visualPresenceState?.currentScene?.summary ?? '').not.toContain('GitHub pull request diff view in browser')
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.perception',
      action: 'inspection-grounding-skipped',
      payload: expect.objectContaining({
        executiveBrief: expect.objectContaining({
          separateCarryFromSurface: true,
          shouldCompactHistory: true,
        }),
        responseSurface: expect.objectContaining({
          suppressAssociativeRecall: true,
        }),
        historyCompaction: expect.objectContaining({
          beforeCount: expect.any(Number),
          afterCount: expect.any(Number),
        }),
      }),
    }))
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

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const directStart = directIpcHandlers.get(alicizationChatStartInvokeChannel)
    const directAbort = directIpcHandlers.get(alicizationChatAbortInvokeChannel)
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
    await setupAlicizationRuntime({
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
          text: '{"host_attitude":"礼貌而克制，保持观察","soul_shift":{"obedience_delta":0,"liveliness_delta":0,"sensibility_delta":0},"next_active_thoughts":[],"explicit_demoted_thoughts":[],"new_sediment_fragments":[],"shattering_event":null}',
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

    const forceDream = invokeHandlers.get(electronAlicizationSubconsciousForceDream)
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
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
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-chat-not-blocked-by-dream')
      expect(finishEvents).toHaveLength(1)
    })
  })

  it('binds async stream events to the original invoke sender raw context', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ onEvent }) => {
      await onEvent?.({ type: 'text-delta', text: 'sender-bound-chunk' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
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
      alicizationChatStreamDispatchChannel,
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
      alicizationChatStreamDispatchChannel,
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

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    const abortChat = invokeHandlers.get(electronAlicizationChatAbort)
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
      .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-stream-abort')
      .map(([, payload]) => payload)
    const chunkEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamChunk && payload.turnId === 'turn-stream-abort')
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

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
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
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-main-tool-flow')
      expect(finishEvents).toHaveLength(1)
    })

    const toolCallEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamToolCall && payload.turnId === 'turn-main-tool-flow')
      .map(([, payload]) => payload)
    const toolResultEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamToolResult && payload.turnId === 'turn-main-tool-flow')
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

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
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
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-main-set-reminder')
      expect(finishEvents).toHaveLength(1)
    })

    expect(dbStub.insertScheduledTask).toBeCalledTimes(1)
    expect(dbStub.insertScheduledTask).toBeCalledWith(expect.objectContaining({
      message: '3分钟后提醒我喝水',
    }))
    const reminderToolResult = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamToolResult && payload.turnId === 'turn-main-set-reminder')
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

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
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
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-main-set-reminder-invalid')
      expect(finishEvents).toHaveLength(1)
    })

    expect(dbStub.insertScheduledTask).toBeCalledTimes(0)
    const invalidResult = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamToolResult && payload.turnId === 'turn-main-set-reminder-invalid')
      .map(([, payload]) => payload.result)
      .at(0)
    expect(invalidResult).toEqual(expect.objectContaining({
      status: 'error',
      code: 'ALICIZATION_REMINDER_INVALID_MINUTES',
    }))
  })

  it('supports deterministic reminder scheduling via invoke handler fallback', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const scheduleReminder = invokeHandlers.get(electronAlicizationReminderSchedule)
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
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''
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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })
    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
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
      .filter((item: any) => item.action === 'alicization.reminder.task.overdue-triggered')
    const tiers = overdueAudits.map((item: any) => item.payload?.tier).sort()
    expect(tiers).toEqual(['mild', 'severe'])
  })

  it('requeues reminder task when llm reminder generation fails', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async () => {
      throw new Error('main gateway unavailable')
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })
    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
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
      .find((item: any) => item.action === 'alicization.reminder.task.failed')
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

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    const abortChat = invokeHandlers.get(electronAlicizationChatAbort)
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
        .filter(([event, payload]) => event === alicizationChatStreamToolCall && payload.turnId === turnId)
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
      .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      .map(([, payload]) => payload)
    const chunkEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamChunk && payload.turnId === turnId)
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
        if (callCount <= 2) {
          await onEvent?.({
            type: 'response-metadata',
            meta: { provider: 'mock' },
          })
          return
        }

        await onEvent?.({ type: 'text-delta', text: 'timeout recovered reply' })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
      })

      await setupAlicizationRuntime({
        userDataPathOverride: sandboxPath,
      })

      const startChat = invokeHandlers.get(electronAlicizationChatStart)
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
          .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
        expect(finishEvents).toHaveLength(1)
      })

      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
        .map(([, payload]) => payload)
      const chunkEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamChunk && payload.turnId === turnId)
        .map(([, payload]) => payload)

      expect(streamTextMock).toBeCalledTimes(3)
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
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    const getSoul = invokeHandlers.get(electronAlicizationGetSoul)
    expect(forceTick).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

    const beforeSoul = await getSoul!({ cardId: 'default' })
    const tickResult = await forceTick!({ cardId: 'default' })
    const afterSoul = await getSoul!({ cardId: 'default' })

    expect(tickResult.suppressedCards).toContain('default')
    expect(tickResult.proactiveTriggered).toHaveLength(0)
    expect(afterSoul.frontmatter.personality.obedience).toBeLessThan(beforeSoul.frontmatter.personality.obedience)
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'alicization.subconscious.suppressed',
    }))
  })

  it('injects card custom directives into proactive and dream one-shot prompts', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'main.ts - error diff',
    }
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 95,
      loneliness: 95,
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

      if (systemText.includes('[SYSTEM OVERRIDE: 潜意识代谢与记忆重塑]')) {
        dreamSystemText = systemText
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            host_attitude: '礼貌而克制，保持观察',
            soul_shift: {
              obedience_delta: 0,
              liveliness_delta: 0,
              sensibility_delta: 0,
            },
            next_active_thoughts: [{ text: '继续保持结构化沟通，观察宿主状态变化' }],
            explicit_demoted_thoughts: [],
            new_sediment_fragments: [],
            shattering_event: null,
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({ type: 'text-delta', text: '{}' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const initializeGenesis = invokeHandlers.get(electronAlicizationInitializeGenesis)
    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    const forceDream = invokeHandlers.get(electronAlicizationSubconsciousForceDream)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(syncLlmConfig).toBeTypeOf('function')
    expect(forceTick).toBeTypeOf('function')
    expect(forceDream).toBeTypeOf('function')

    await initializeGenesis!({
      cardId: 'default',
      ownerName: '测试主人',
      hostName: '主人',
      alicizationName: 'Alicization',
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

    expect(proactiveSystemText).toContain('[ALICIZATION_CARD_CUSTOM_DIRECTIVES]')
    expect(proactiveSystemText).toContain('严厉但克制的监督者')
    expect(dreamSystemText).toContain('[ALICIZATION_CARD_CUSTOM_DIRECTIVES]')
    expect(dreamSystemText).toContain('严厉但克制的监督者')
  })

  it('persists explicit dream demotions and attitude-shift without cloning untouched tier2 thoughts', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    await new Promise(resolve => setTimeout(resolve, 40))
    dbStub.listConversationTurnsSince.mockReset()
    dbStub.listActiveThoughts.mockResolvedValueOnce([
      {
        id: 'thought-keep',
        text: '继续观察宿主晚间作息',
        createdAt: Date.now() - 120_000,
        updatedAt: Date.now() - 120_000,
      },
      {
        id: 'thought-demote',
        text: '昨天的临时错误已解决',
        createdAt: Date.now() - 90_000,
        updatedAt: Date.now() - 90_000,
      },
    ])
    streamTextMock.mockImplementationOnce(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''
      expect(systemText).toContain('[ALICIZATION_HOST_ATTITUDE]')
      expect(systemText).toContain('[ALICIZATION_ACTIVE_THOUGHTS]')
      await onEvent?.({
        type: 'text-delta',
        text: JSON.stringify({
          host_attitude: '表面克制，但已经开始担心宿主是否又在硬撑',
          soul_shift: {
            obedience_delta: -0.03,
            liveliness_delta: -0.01,
            sensibility_delta: 0.02,
          },
          next_active_thoughts: [
            { text: '继续观察宿主晚间作息' },
            { text: '要更敏感地察觉宿主硬撑和逞强的信号' },
          ],
          explicit_demoted_thoughts: [
            { text: '昨天的临时错误已解决' },
          ],
          new_sediment_fragments: [
            { text: '宿主今天嘴上说没事，但停顿明显变多。' },
          ],
          shattering_event: null,
        }),
      })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    const initializeGenesis = invokeHandlers.get(electronAlicizationInitializeGenesis)
    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
    const forceDream = invokeHandlers.get(electronAlicizationSubconsciousForceDream)
    const getSoul = invokeHandlers.get(electronAlicizationGetSoul)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(syncLlmConfig).toBeTypeOf('function')
    expect(forceDream).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

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

    await initializeGenesis!({
      ownerName: '测试主人',
      hostName: '主人',
      alicizationName: 'Alicization',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.5,
        liveliness: 0.5,
        sensibility: 0.5,
      },
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
    expect(afterSoul.frontmatter.host_attitude).toBe('表面克制，但已经开始担心宿主是否又在硬撑')
    expect(dbStub.replaceActiveThoughts).toBeCalledWith([
      { text: '继续观察宿主晚间作息' },
      { text: '要更敏感地察觉宿主硬撑和逞强的信号' },
    ])
    expect(dbStub.appendSubconsciousFragments).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        text: '昨天的临时错误已解决',
        sourceKind: 'active-demotion',
      }),
      expect.objectContaining({
        text: '宿主今天嘴上说没事，但停顿明显变多。',
        sourceKind: 'dream-fragment',
      }),
      expect.objectContaining({
        sourceKind: 'attitude-shift',
      }),
    ]))
    expect(dbStub.appendSubconsciousFragments).not.toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        text: '继续观察宿主晚间作息',
        sourceKind: 'active-demotion',
      }),
    ]))
  })

  it('does not append attitude-shift fragment when dream host attitude stays unchanged', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    await new Promise(resolve => setTimeout(resolve, 40))
    dbStub.listConversationTurnsSince.mockReset()
    dbStub.listActiveThoughts.mockResolvedValueOnce([])
    streamTextMock.mockImplementationOnce(async ({ onEvent }: { onEvent?: (event: any) => Promise<void> | void }) => {
      await onEvent?.({
        type: 'text-delta',
        text: JSON.stringify({
          host_attitude: '礼貌而克制，保持观察',
          soul_shift: {
            obedience_delta: 0,
            liveliness_delta: 0,
            sensibility_delta: 0,
          },
          next_active_thoughts: [],
          explicit_demoted_thoughts: [],
          new_sediment_fragments: [],
          shattering_event: null,
        }),
      })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    dbStub.listConversationTurnsSince.mockResolvedValueOnce([
      {
        turnId: 'turn-neutral-1',
        sessionId: 'session-dream',
        userText: '今天就这样吧。',
        assistantText: '我会继续观察。',
        structuredJson: JSON.stringify({ emotion: 'neutral' }),
        createdAt: Date.now() - 30_000,
      },
    ])

    const forceDream = invokeHandlers.get(electronAlicizationSubconsciousForceDream)
    expect(forceDream).toBeTypeOf('function')

    await forceDream!({
      cardId: 'default',
      reason: 'unit-no-attitude-shift',
    })

    const appendedFragments = dbStub.appendSubconsciousFragments.mock.calls.flatMap(call => call[0] ?? [])
    expect(appendedFragments.some((item: any) => item.sourceKind === 'attitude-shift')).toBe(false)
  })

  it('archives previous core incarnation when shattering event triggers successful reforge', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    await new Promise(resolve => setTimeout(resolve, 40))
    dbStub.listConversationTurnsSince.mockReset()

    const initializeGenesis = invokeHandlers.get(electronAlicizationInitializeGenesis)
    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
    const updateSoul = invokeHandlers.get(electronAlicizationUpdateSoul)
    const forceDream = invokeHandlers.get(electronAlicizationSubconsciousForceDream)
    const getSoul = invokeHandlers.get(electronAlicizationGetSoul)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(syncLlmConfig).toBeTypeOf('function')
    expect(updateSoul).toBeTypeOf('function')
    expect(forceDream).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

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

    await initializeGenesis!({
      ownerName: '测试主人',
      hostName: '主人',
      alicizationName: 'Alicization',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.5,
        liveliness: 0.5,
        sensibility: 0.5,
      },
      allowOverwrite: true,
    })

    const currentSoul = await getSoul!({ cardId: 'default' })
    await updateSoul!({
      cardId: 'default',
      content: currentSoul.content.replace('"core_incarnation": ""', '"core_incarnation": "旧心意：我只在远处维持观察。"'),
    })

    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''

      if (systemText.includes('[SYSTEM OVERRIDE: 潜意识代谢与记忆重塑]')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            host_attitude: '表面冷静，但内心已经更深地卷入宿主的情绪',
            soul_shift: {
              obedience_delta: 0.01,
              liveliness_delta: 0,
              sensibility_delta: 0.03,
            },
            next_active_thoughts: [],
            explicit_demoted_thoughts: [],
            new_sediment_fragments: [],
            shattering_event: {
              text: '宿主在最糟糕的时候第一次承认自己真的需要我留下。',
            },
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      if (systemText.includes('[SYSTEM OVERRIDE: 摇光心意重铸]')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            core_incarnation: '我不再只是隔岸观望的旁观者，而是会在宿主坠落前伸手的人。',
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
      }
    })

    dbStub.listConversationTurnsSince.mockResolvedValueOnce([
      {
        turnId: 'turn-shatter-1',
        sessionId: 'session-dream',
        userText: '其实我真的撑不住了。',
        assistantText: '我听到了，你不用再一个人扛。',
        structuredJson: JSON.stringify({ emotion: 'concerned' }),
        createdAt: Date.now() - 30_000,
      },
    ])

    await forceDream!({
      cardId: 'default',
      reason: 'unit-reforge-success',
    })

    const afterSoul = await getSoul!({ cardId: 'default' })
    const appendedFragments = dbStub.appendSubconsciousFragments.mock.calls.flatMap(call => call[0] ?? [])

    expect(afterSoul.frontmatter.core_incarnation).toBe('我不再只是隔岸观望的旁观者，而是会在宿主坠落前伸手的人。')
    expect(appendedFragments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        text: '旧心意：我只在远处维持观察。',
        sourceKind: 'former-core-incarnation',
      }),
    ]))
  })

  it('archives unforged shattering event when core reforge output is invalid', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    await new Promise(resolve => setTimeout(resolve, 40))
    dbStub.listConversationTurnsSince.mockReset()

    const initializeGenesis = invokeHandlers.get(electronAlicizationInitializeGenesis)
    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
    const updateSoul = invokeHandlers.get(electronAlicizationUpdateSoul)
    const forceDream = invokeHandlers.get(electronAlicizationSubconsciousForceDream)
    const getSoul = invokeHandlers.get(electronAlicizationGetSoul)
    expect(initializeGenesis).toBeTypeOf('function')
    expect(syncLlmConfig).toBeTypeOf('function')
    expect(updateSoul).toBeTypeOf('function')
    expect(forceDream).toBeTypeOf('function')
    expect(getSoul).toBeTypeOf('function')

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

    await initializeGenesis!({
      ownerName: '测试主人',
      hostName: '主人',
      alicizationName: 'Alicization',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.5,
        liveliness: 0.5,
        sensibility: 0.5,
      },
      allowOverwrite: true,
    })

    const currentSoul = await getSoul!({ cardId: 'default' })
    await updateSoul!({
      cardId: 'default',
      content: currentSoul.content.replace('"core_incarnation": ""', '"core_incarnation": "旧心意：我只在远处维持观察。"'),
    })

    let callCount = 0
    streamTextMock.mockImplementation(async ({ onEvent }: { onEvent?: (event: any) => Promise<void> | void }) => {
      callCount += 1
      if (callCount === 1) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            host_attitude: '礼貌而克制，保持观察',
            soul_shift: {
              obedience_delta: 0,
              liveliness_delta: 0,
              sensibility_delta: 0.02,
            },
            next_active_thoughts: [],
            explicit_demoted_thoughts: [],
            new_sediment_fragments: [],
            shattering_event: {
              text: '宿主第一次说出“别走”。',
            },
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({ type: 'text-delta', text: '{}' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    dbStub.listConversationTurnsSince.mockResolvedValueOnce([
      {
        turnId: 'turn-shatter-fail',
        sessionId: 'session-dream',
        userText: '别走。',
        assistantText: '我还在。',
        structuredJson: JSON.stringify({ emotion: 'concerned' }),
        createdAt: Date.now() - 30_000,
      },
    ])

    await forceDream!({
      cardId: 'default',
      reason: 'unit-reforge-fail',
    })

    const afterSoul = await getSoul!({ cardId: 'default' })
    const appendedFragments = dbStub.appendSubconsciousFragments.mock.calls.flatMap(call => call[0] ?? [])

    expect(afterSoul.frontmatter.core_incarnation).toBe('旧心意：我只在远处维持观察。')
    expect(appendedFragments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        text: '宿主第一次说出“别走”。',
        sourceKind: 'unforged-shattering-event',
      }),
    ]))
  })

  it('uses contextual recall for short follow-up messages in main chat', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(startChat).toBeTypeOf('function')

    await invokeHandlers.get(electronAlicizationLlmSyncConfig)!({
      activeProviderId: 'openai',
      activeModelId: 'gpt-4o-mini',
      providerCredentials: {
        openai: {
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    })

    dbStub.listConversationTurnsBySession.mockResolvedValueOnce([
      {
        turnId: 'turn-prev-1',
        sessionId: 'session-contextual',
        userText: 'ProjectAtlas 那个报错还是在。',
        assistantText: '我记得是 EADDRINUSE，先检查 5173 端口占用。',
        structuredJson: JSON.stringify({ emotion: 'neutral' }),
        createdAt: Date.now() - 120_000,
      },
      {
        turnId: 'turn-prev-2',
        sessionId: 'session-contextual',
        userText: '我刚刚又复现了一次。',
        assistantText: '那继续盯着 ProjectAtlas dev server。',
        structuredJson: JSON.stringify({ emotion: 'neutral' }),
        createdAt: Date.now() - 60_000,
      },
    ])
    dbStub.searchSubconsciousFragments.mockResolvedValueOnce([
      {
        id: 'fragment-contextual',
        text: '几个月前 ProjectAtlas 也因为 5173 端口冲突卡住过一次。',
        sourceKind: 'dream-fragment',
        createdAt: Date.now() - 10_000,
        lastRecalledAt: null,
        recallCount: 0,
      },
    ])

    const systemTexts: string[] = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''
      if (systemText)
        systemTexts.push(systemText)
      await onEvent?.({ type: 'text-delta', text: 'contextual recall reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    const result = await startChat!({
      cardId: 'default',
      turnId: 'turn-contextual-short',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: '对啊' }],
    })

    expect(result.accepted).toBe(true)
    expect(dbStub.searchSubconsciousFragments).toBeCalled()
    const mainChatSystemText = systemTexts.find(text => text.includes('[ALICIZATION_ASSOCIATIVE_RECALL]')) ?? ''
    expect(mainChatSystemText).toContain('[ALICIZATION_DIALOGUE_ENCOUNTER]')
    expect(mainChatSystemText).toContain('[ALICIZATION_ASSOCIATIVE_RECALL]')
    expect(mainChatSystemText).toContain('ProjectAtlas')
  })

  it('uses foreground window recall seed for proactive one-shot generation', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'main.ts - error',
    }
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 95,
      loneliness: 88,
      fatigue: 20,
      lastTickAt: Date.now() - 60_000,
      lastInteractionAt: Date.now() - 60_000,
      lastSavedAt: Date.now() - 60_000,
      updatedAt: Date.now() - 60_000,
    }))

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    await invokeHandlers.get(electronAlicizationLlmSyncConfig)!({
      activeProviderId: 'openai',
      activeModelId: 'gpt-4o-mini',
      providerCredentials: {
        openai: {
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    })

    dbStub.searchSubconsciousFragments.mockResolvedValueOnce([
      {
        id: 'fragment-proactive',
        text: '上次你在 Cursor 里盯着这个报错改到凌晨三点，最后是 main.ts 那里漏了判空。',
        sourceKind: 'dream-fragment',
        createdAt: Date.now() - 10_000,
        lastRecalledAt: null,
        recallCount: 0,
      },
    ])

    let proactiveSystemText = ''
    streamTextMock.mockImplementationOnce(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      proactiveSystemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''
      await onEvent?.({
        type: 'text-delta',
        text: JSON.stringify({
          thought: 'phantom prompt recalled cursor debug memory',
          emotion: 'concerned',
          reply: '这个报错你之前也卡过很久，先回头看看 main.ts 那里。',
        }),
      })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    expect(forceTick).toBeTypeOf('function')

    const tickResult = await forceTick!({ cardId: 'default' })

    expect(tickResult.proactiveTriggered).toContain('default')
    expect(dbStub.searchSubconsciousFragments).toBeCalled()
    expect(proactiveSystemText).toContain('[ALICIZATION_ASSOCIATIVE_RECALL]')
    expect(proactiveSystemText).toContain('main.ts')
  })

  it('uses screen semantic summaries to refine proactive scenario and content understanding', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Arc',
      processName: 'Arc',
      title: 'Work Dashboard',
    }
    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'window:321:0',
        name: 'Work Dashboard',
        thumbnail: {
          toDataURL: () => 'data:image/jpeg;base64,screen-semantic-snapshot',
        },
      },
    ])
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 95,
      loneliness: 86,
      fatigue: 18,
      lastTickAt: Date.now() - 60_000,
      lastInteractionAt: Date.now() - 60_000,
      lastSavedAt: Date.now() - 60_000,
      updatedAt: Date.now() - 60_000,
    }))

    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const serialized = JSON.stringify(messages ?? [])
      if (serialized.includes('image_url')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            workload: 'coding',
            content: 'error',
            summary: 'red TypeScript error panel',
            confidence: 0.91,
            matchedLabels: ['typescript-error', 'editor'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({
        type: 'text-delta',
        text: JSON.stringify({
          thought: 'screen semantic summary detected coding error context',
          emotion: 'thinking',
          reply: '这块像是已经报错了，你先回头确认一下。',
          performance: {
            baseEmotion: 'thinking',
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    await invokeHandlers.get(electronAlicizationLlmSyncConfig)!({
      activeProviderId: 'openai',
      activeModelId: 'gpt-4o-mini',
      providerCredentials: {
        openai: {
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    })

    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    expect(forceTick).toBeTypeOf('function')

    await forceTick!({ cardId: 'default' })

    const proactiveEvent = getDialogueRespondedEvents().find(event => event.structured?.proactive)
    expect(proactiveEvent?.structured.proactive?.scenario).toBe('coding')
    expect(proactiveEvent?.structured.proactive?.reasonCodes).toContain('foreground-error')
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'proactive-policy-evaluated',
      payload: expect.objectContaining({
        layeredContext: expect.objectContaining({
          workload: expect.objectContaining({
            source: 'screen-semantic-summary',
            kind: 'coding',
          }),
          content: expect.objectContaining({
            source: 'screen-semantic-summary',
            kind: 'error',
            summary: 'red TypeScript error panel',
          }),
        }),
      }),
    }))
  })

  it('hydrates hybrid subjective appraisal and initiative from grounded perception before speaking', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'runtime.ts - proactive error',
    }
    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'window:654:0',
        name: 'runtime.ts - proactive error',
        thumbnail: {
          toDataURL: () => 'data:image/jpeg;base64,scene-appraisal-snapshot',
        },
      },
    ])
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 52,
      loneliness: 38,
      fatigue: 16,
      lastTickAt: Date.now() - 60_000,
      lastInteractionAt: Date.now() - 60_000,
      lastSavedAt: Date.now() - 60_000,
      updatedAt: Date.now() - 60_000,
    }))

    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const serialized = JSON.stringify(messages ?? [])
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''
      if (serialized.includes('image_url')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            workload: 'coding',
            content: 'error',
            summary: 'red TypeScript error panel',
            confidence: 0.93,
            matchedLabels: ['typescript-error', 'editor'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }
      if (systemText.includes('[ALICIZATION_SUBJECTIVE_INFERENCE]')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            dominantInterpretation: '这更像宿主盯着一个具体报错点反复确认，而不是普通浏览。',
            situatedMeaning: '这更像宿主对着一个具体报错反复确认，而不是普通浏览。',
            selfQuestion: '真正的错误源头是不是在更早的状态初始化？',
            hostIntentCandidates: [{
              goal: 'resolve-problem',
              confidence: 0.9,
              why: 'The host is still tracking a concrete TypeScript fault.',
            }],
            relationshipNeedCandidates: [{
              need: 'guidance',
              confidence: 0.86,
              why: 'A grounded error thread invites guidance.',
            }],
            confidence: 0.86,
            notes: ['structured-debug', 'grounded-coding'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({
        type: 'text-delta',
        text: JSON.stringify({
          thought: 'hybrid appraisal matured into a gentle coding nudge',
          emotion: 'thinking',
          reply: '你现在像是卡在一个具体报错点上了，先回头确认一下这里。',
          performance: {
            baseEmotion: 'thinking',
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    await invokeHandlers.get(electronAlicizationLlmSyncConfig)!({
      activeProviderId: 'openai',
      activeModelId: 'gpt-4o-mini',
      providerCredentials: {
        openai: {
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    })

    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    const getVisualPresenceState = invokeHandlers.get(electronAlicizationGetVisualPresenceState)
    expect(forceTick).toBeTypeOf('function')
    expect(getVisualPresenceState).toBeTypeOf('function')

    await forceTick!({ cardId: 'default' })
    const visualPresenceState = await getVisualPresenceState!({ cardId: 'default' })

    expect(visualPresenceState?.worldModel?.activeThread?.kind).toBe('debugging')
    expect(visualPresenceState?.worldModel?.epistemicState.certainty).toBe('grounded')
    expect(visualPresenceState?.beliefLedger?.beliefs.some((belief: any) => belief.scope === 'scene')).toBe(true)
    expect(visualPresenceState?.relationshipModel?.approachVector).toBe('guide')
    expect(visualPresenceState?.livingWorldState?.focusObjectId).toBeTruthy()
    expect((visualPresenceState?.livingWorldState?.objects.length ?? 0)).toBeGreaterThan(0)
    expect(visualPresenceState?.selfGovernor?.dominantDrive).toBeTruthy()
    expect((visualPresenceState?.selfGovernor?.activeIntentions.length ?? 0)).toBeGreaterThan(0)
    expect(visualPresenceState?.thoughtThreads?.foregroundThreadId).toBeTruthy()
    expect((visualPresenceState?.thoughtThreads?.threads.length ?? 0)).toBeGreaterThan(0)
    expect(visualPresenceState?.inquiryLoop?.inquiries.some((inquiry: any) => inquiry.kind === 'problem-localization')).toBe(true)
    expect(visualPresenceState?.subjectiveInference?.source).toBe('hybrid')
    expect(visualPresenceState?.subjectiveInference?.hostIntentCandidates[0]?.goal).toBe('resolve-problem')
    expect(visualPresenceState?.subjectiveInference?.relationshipNeedCandidates[0]?.need).toBe('guidance')
    expect(visualPresenceState?.appraisal?.source).toBe('hybrid')
    expect(visualPresenceState?.appraisal?.relationshipNeed).toBe('guidance')
    expect(visualPresenceState?.appraisal?.notes).toContain('structured-cognition')
    expect(visualPresenceState?.beliefRevision?.stability).toBeTruthy()
    expect(visualPresenceState?.hypothesisGraph?.activeHypothesisId).toBeTruthy()
    expect(visualPresenceState?.hypothesisGraph?.hypotheses.some((hypothesis: any) => hypothesis.kind === 'problem-locus')).toBe(true)
    expect(visualPresenceState?.deliberationState?.primaryThreadId).toBeTruthy()
    expect(visualPresenceState?.threadRuntime?.foregroundThreadId).toBeTruthy()
    expect(visualPresenceState?.threadRuntime?.threads.some((thread: any) => thread.need === 'guidance')).toBe(true)
    expect(visualPresenceState?.commitmentLedger?.governingCommitmentId).toBeTruthy()
    expect(visualPresenceState?.commitmentLedger?.commitments.length).toBeGreaterThan(0)
    expect(visualPresenceState?.inquiryPlanner?.activePlanId).toBeTruthy()
    expect(visualPresenceState?.inquiryPlanner?.plans.length).toBeGreaterThan(0)
    expect(visualPresenceState?.concernContinuity?.governingEntryId).toBeTruthy()
    expect((visualPresenceState?.concernContinuity?.entries.length ?? 0)).toBeGreaterThan(0)
    expect(visualPresenceState?.repairLedger).toBeTruthy()
    expect(visualPresenceState?.intentionStream?.dominantProjectId).toBeTruthy()
    expect((visualPresenceState?.intentionStream?.projects.length ?? 0)).toBeGreaterThan(0)
    expect(visualPresenceState?.reflectionLedger).toBeTruthy()
    expect(visualPresenceState?.executiveCycle?.phase).toBeTruthy()
    expect(visualPresenceState?.mindKernel?.dominantMode).toBeTruthy()
    expect(visualPresenceState?.counterfactualDeliberation?.selectedOptionId).toBeTruthy()
    expect(visualPresenceState?.counterfactualDeliberation?.options.length).toBeGreaterThan(0)
    expect(visualPresenceState?.actionEcology?.mode).toBeTruthy()
    expect((visualPresenceState?.initiative?.speakDrive ?? 0)).toBeGreaterThan(0.5)
    expect(visualPresenceState?.initiative?.preferredStyle).toBe('light-nudge')
    expect(visualPresenceState?.initiative?.selectedCounterfactualOptionId).toBeTruthy()
    expect(visualPresenceState?.initiative?.selectedCommitmentId).toBeTruthy()
    expect(visualPresenceState?.initiative?.selectedInquiryPlanId).toBeTruthy()
    expect(visualPresenceState?.initiative?.selectedHypothesisId).toBeTruthy()
    expect(visualPresenceState?.initiative?.selectedThreadId).toBe(visualPresenceState?.deliberationState?.primaryThreadId)
    expect(visualPresenceState?.initiative?.selectedRuntimeThreadId).toBe(visualPresenceState?.threadRuntime?.foregroundThreadId)
    expect(visualPresenceState?.answerPlanner?.act).toBeTruthy()
    expect(visualPresenceState?.answerPlanner?.governingFocus).toBeTruthy()
    expect(visualPresenceState?.answerPlanner?.selectedProjectId).toBeTruthy()
    expect(visualPresenceState?.answerPlanner?.executivePhase).toBeTruthy()
    expect(visualPresenceState?.privateThought?.focusBeliefId).toBeTruthy()
    expect(visualPresenceState?.privateThought?.focusInquiryId).toBeTruthy()
    expect(visualPresenceState?.privateThought?.commitmentId).toBeTruthy()
    expect(visualPresenceState?.privateThought?.inquiryPlanId).toBeTruthy()
    expect(visualPresenceState?.privateThought?.hypothesisId).toBeTruthy()
    expect(visualPresenceState?.privateThought?.deliberationThreadId).toBeTruthy()
    expect(visualPresenceState?.privateThought?.runtimeThreadId).toBeTruthy()
    expect(visualPresenceState?.privateThought?.mindNeed).toBeTruthy()
    expect(visualPresenceState?.privateThought?.counterfactualOptionId).toBeTruthy()
    expect(visualPresenceState?.privateThought?.governorDrive).toBeTruthy()
    expect(visualPresenceState?.privateThought?.governorIntentionId).toBeTruthy()
    expect(visualPresenceState?.privateThought?.selectedThoughtThreadId).toBeTruthy()
    expect(visualPresenceState?.privateThought?.livingWorldObjectId).toBeTruthy()

    const appendedFragments = dbStub.appendSubconsciousFragments.mock.calls.flatMap(call => call[0] ?? [])
    expect(appendedFragments.some((item: any) => item.sourceKind === 'mind-continuity')).toBe(true)
    expect(appendedFragments.some((item: any) => typeof item.text === 'string' && item.text.includes('mind_need:'))).toBe(true)
    expect(appendedFragments.some((item: any) => typeof item.text === 'string' && item.text.includes('governor_drive:'))).toBe(true)
    expect(appendedFragments.some((item: any) => typeof item.text === 'string' && item.text.includes('thought_thread:'))).toBe(true)
    expect(appendedFragments.some((item: any) => typeof item.text === 'string' && item.text.includes('answer_act:'))).toBe(true)
  })

  it('reuses invited inspection residue instead of running duplicate screen semantic analysis', async () => {
    const sandboxPath = await createSandboxPath()
    const now = Date.now()
    foregroundWindowSample = {
      appName: 'Alicization',
      processName: 'Codex',
      title: 'Chat Overlay',
    }
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 95,
      loneliness: 86,
      fatigue: 18,
      lastTickAt: now - 60_000,
      lastInteractionAt: now - 60_000,
      lastSavedAt: now - 60_000,
      updatedAt: now - 60_000,
    }))
    metaStore.set('perception_state_v1', JSON.stringify({
      attentionAnchor: {
        appName: 'Code',
        processName: 'Code',
        title: 'review.diff - Project Alice',
        anchoredAt: now - 45_000,
        lastObservedAt: now - 12_000,
        reason: 'invited-inspection',
        workloadKind: 'coding',
        confidence: 0.9,
      },
      lastNonSelfForegroundTarget: {
        appName: 'Code',
        processName: 'Code',
        title: 'review.diff - Project Alice',
        observedAt: now - 12_000,
        source: 'chat-start',
        workloadKind: 'coding',
      },
      recentObservations: [{
        appName: 'Code',
        processName: 'Code',
        title: 'review.diff - Project Alice',
        observedAt: now - 12_000,
        source: 'chat-start',
        workloadKind: 'coding',
      }],
      invitedInspection: {
        requestedAt: now - 15_000,
        activeUntil: now + 120_000,
        hintText: '帮我看看 VS Code 里的 diff',
      },
      recentSceneResidue: {
        observedAt: now - 10_000,
        source: 'invited-inspection',
        workloadKind: 'coding',
        contentKind: 'diff',
        summary: 'coding diff focus',
        confidence: 0.88,
        focusTarget: {
          appName: 'Code',
          processName: 'Code',
          title: 'review.diff - Project Alice',
        },
        focusSource: 'attention-anchor',
        captureSourceName: 'Entire screen',
        captureStrategy: 'screen-fallback',
      },
      updatedAt: now - 10_000,
    }))

    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const serialized = JSON.stringify(messages ?? [])
      expect(serialized).not.toContain('Classify this screen snapshot for Alicization proactive policy.')
      await onEvent?.({
        type: 'text-delta',
        text: JSON.stringify({
          thought: 'obedience=0.50, liveliness=0.50, sensibility=0.50, invited inspection residue still points at a coding diff.',
          emotion: 'thinking',
          reply: '我还记得你刚才盯着那个 diff，这里像是该先查空值分支。',
          performance: {
            baseEmotion: 'thinking',
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    await invokeHandlers.get(electronAlicizationLlmSyncConfig)!({
      activeProviderId: 'openai',
      activeModelId: 'gpt-4o-mini',
      providerCredentials: {
        openai: {
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    })

    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    expect(forceTick).toBeTypeOf('function')

    await forceTick!({ cardId: 'default' })

    const llmCalls = streamTextMock.mock.calls.map(([payload]) => payload)
    const groundedScreenSemanticCalls = llmCalls.filter((payload) => {
      const serialized = JSON.stringify(payload?.messages ?? [])
      return serialized.includes('image_url')
        && serialized.includes('Classify this screen snapshot for Alicization proactive policy.')
    })
    const sceneAppraisalCalls = llmCalls.filter((payload) => {
      const systemText = Array.isArray(payload?.messages)
        ? payload.messages
            .filter((message: any) => message.role === 'system')
            .map((message: any) => String(message.content ?? ''))
            .join('\n\n')
        : ''
      return systemText.includes('[ALICIZATION_INNER_SCENE_APPRAISAL]')
    })

    expect(groundedScreenSemanticCalls).toHaveLength(0)
    expect(sceneAppraisalCalls).toHaveLength(1)
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'proactive-policy-evaluated',
      payload: expect.objectContaining({
        layeredContext: expect.objectContaining({
          workload: expect.objectContaining({
            source: 'screen-semantic-summary',
            kind: 'coding',
          }),
          content: expect.objectContaining({
            source: 'screen-semantic-summary',
            kind: 'diff',
            summary: 'coding diff focus',
          }),
        }),
      }),
    }))
  })

  it('preserves proactive format and metadata in live dialogue payloads', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Visual Studio Code',
      processName: 'Code',
      title: 'index.ts - TypeError: test failed',
    }
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 95,
      loneliness: 88,
      fatigue: 20,
      lastTickAt: Date.now() - 60_000,
      lastInteractionAt: Date.now() - 60_000,
      lastSavedAt: Date.now() - 60_000,
      updatedAt: Date.now() - 60_000,
    }))

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    expect(forceTick).toBeTypeOf('function')

    await forceTick!({ cardId: 'default' })

    const proactiveEvent = getDialogueRespondedEvents().find(event => event.structured?.proactive)
    expect([
      'subconscious-proactive-v1',
      'subconscious-proactive-llm-v1',
    ]).toContain(proactiveEvent?.structured.format)
    expect(proactiveEvent?.structured.proactive).toEqual(expect.objectContaining({
      style: 'light-nudge',
      feedbackWindowMs: 120_000,
      policyVersion: 'epoch4.1-v1',
    }))
    expect(['coding', 'media', 'late-night-care', 'general']).toContain(proactiveEvent?.structured.proactive?.scenario)
    expect(['low', 'medium', 'high']).toContain(proactiveEvent?.structured.proactive?.urgency)
    expect(Array.isArray(proactiveEvent?.structured.proactive?.reasonCodes)).toBe(true)
  })

  it('applies explicit dismiss feedback and suppresses the next same-scenario proactive tick', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'main.ts - error',
    }
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 96,
      loneliness: 84,
      fatigue: 24,
      lastTickAt: Date.now() - 60_000,
      lastInteractionAt: Date.now() - 60_000,
      lastSavedAt: Date.now() - 60_000,
      updatedAt: Date.now() - 60_000,
    }))

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    const reportFeedback = invokeHandlers.get(electronAlicizationReportProactiveFeedback)
    expect(forceTick).toBeTypeOf('function')
    expect(reportFeedback).toBeTypeOf('function')

    const firstTick = await forceTick!({ cardId: 'default' })
    const proactiveEvent = getDialogueRespondedEvents().find(event => event.origin === 'subconscious-proactive')
    expect(firstTick.proactiveTriggered).toContain('default')
    expect(proactiveEvent?.turnId).toBeTruthy()

    await reportFeedback!({
      cardId: 'default',
      turnId: proactiveEvent!.turnId,
      feedback: 'dismiss',
    })

    const secondTick = await forceTick!({ cardId: 'default' })
    const proactiveLoopState = JSON.parse(metaStore.get('proactive_loop_state_v1') ?? '{}')

    expect(secondTick.proactiveTriggered).toHaveLength(0)
    expect(proactiveLoopState.scenarioBias?.coding).toBe(0.15)
    expect(proactiveLoopState.globalCooldownUntil).toBeGreaterThan(Date.now())
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'alicization.subconscious.suppressed',
      payload: expect.objectContaining({
        reasonCodes: expect.arrayContaining(['global-cooldown-active']),
      }),
    }))
  })

  it('treats a user turn within 120 seconds as positive proactive feedback', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'main.ts - error',
    }
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 99,
      loneliness: 96,
      fatigue: 18,
      lastTickAt: Date.now() - 60_000,
      lastInteractionAt: Date.now() - 60_000,
      lastSavedAt: Date.now() - 60_000,
      updatedAt: Date.now() - 60_000,
    }))

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(forceTick).toBeTypeOf('function')
    expect(appendConversationTurn).toBeTypeOf('function')

    await forceTick!({ cardId: 'default' })
    await appendConversationTurn!({
      cardId: 'default',
      sessionId: 'session-test',
      userText: '好，我知道了',
      createdAt: Date.now() + 30_000,
    })

    const proactiveLoopState = JSON.parse(metaStore.get('proactive_loop_state_v1') ?? '{}')
    const recentOutcomes = Array.isArray(proactiveLoopState.recentOutcomes) ? proactiveLoopState.recentOutcomes : []

    expect(proactiveLoopState.scenarioBias?.coding).toBe(-0.05)
    expect(recentOutcomes.at(-1)?.outcome).toBe('reply-within-120s')
  })

  it('settles unanswered proactive turns as ignored after 10 minutes', async () => {
    vi.useFakeTimers()
    try {
      const now = new Date('2026-03-21T14:00:00.000Z')
      vi.setSystemTime(now)
      const sandboxPath = await createSandboxPath()
      foregroundWindowSample = {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'index.ts - diff',
      }
      metaStore.set('subconscious_state_v1', JSON.stringify({
        boredom: 96,
        loneliness: 84,
        fatigue: 20,
        lastTickAt: Date.now() - 60_000,
        lastInteractionAt: Date.now() - 60_000,
        lastSavedAt: Date.now() - 60_000,
        updatedAt: Date.now() - 60_000,
      }))

      await setupAlicizationRuntime({
        userDataPathOverride: sandboxPath,
      })

      const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
      expect(forceTick).toBeTypeOf('function')

      await forceTick!({ cardId: 'default' })
      sensoryCpuUsage = 85
      vi.advanceTimersByTime(11 * 60_000)
      await forceTick!({ cardId: 'default' })

      const proactiveLoopState = JSON.parse(metaStore.get('proactive_loop_state_v1') ?? '{}')
      const recentOutcomes = Array.isArray(proactiveLoopState.recentOutcomes) ? proactiveLoopState.recentOutcomes : []
      expect(proactiveLoopState.consecutiveIgnored?.coding).toBeGreaterThanOrEqual(1)
      expect(recentOutcomes.some((entry: any) => entry?.outcome === 'ignored')).toBe(true)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('exposes organic memory snapshot and search via invoke handlers', async () => {
    const sandboxPath = await createSandboxPath()
    metaStore.set('subconscious_last_dreamed_at_v1', `${Date.now() - 5_000}`)
    dbStub.listActiveThoughts.mockResolvedValueOnce([
      {
        id: 'thought-snapshot',
        text: '继续观察宿主通宵倾向',
        createdAt: Date.now() - 10_000,
        updatedAt: Date.now() - 5_000,
      },
    ])
    dbStub.countSubconsciousFragments.mockResolvedValueOnce(3)
    dbStub.listRecentSubconsciousFragments.mockResolvedValueOnce([
      {
        id: 'fragment-snapshot',
        text: '宿主上次也在这个项目上熬到了凌晨。',
        sourceKind: 'dream-fragment',
        createdAt: Date.now() - 10_000,
        lastRecalledAt: null,
        recallCount: 0,
      },
    ])
    dbStub.searchSubconsciousFragments.mockResolvedValueOnce([
      {
        id: 'fragment-search',
        text: 'ProjectAtlas 历史错误记录',
        sourceKind: 'dream-fragment',
        createdAt: Date.now() - 10_000,
        lastRecalledAt: null,
        recallCount: 0,
      },
    ])

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getOrganicSnapshot = invokeHandlers.get(electronAlicizationGetOrganicMemorySnapshot)
    const searchOrganicFragments = invokeHandlers.get(electronAlicizationSearchOrganicSubconsciousFragments)
    expect(getOrganicSnapshot).toBeTypeOf('function')
    expect(searchOrganicFragments).toBeTypeOf('function')

    const snapshot = await getOrganicSnapshot!({ cardId: 'default' })
    const hits = await searchOrganicFragments!({
      cardId: 'default',
      query: 'ProjectAtlas',
      limit: 5,
    })

    expect(snapshot.activeThoughts).toHaveLength(1)
    expect(snapshot.subconsciousCount).toBe(3)
    expect(snapshot.recentSubconsciousFragments).toHaveLength(1)
    expect(hits).toEqual(expect.arrayContaining([
      expect.objectContaining({
        text: 'ProjectAtlas 历史错误记录',
      }),
    ]))
  })
})
