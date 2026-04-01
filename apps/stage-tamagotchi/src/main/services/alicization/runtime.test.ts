import type { AlicizationConversationTurnInput } from '../../../shared/eventa'

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
  alicizationChatStreamMeta,
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
  appendRelationshipDynamics: vi.fn().mockResolvedValue(undefined),
  getLatestRelationshipDynamics: vi.fn().mockResolvedValue(null),
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
  dbStub.appendRelationshipDynamics.mockReset()
  dbStub.appendRelationshipDynamics.mockResolvedValue(undefined)
  dbStub.getLatestRelationshipDynamics.mockReset()
  dbStub.getLatestRelationshipDynamics.mockResolvedValue(null)
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
    getLocale: vi.fn(() => 'zh-Hans'),
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

vi.mock('@proj-alicization/i18n/locales', () => ({
  default: {
    'en': {
      stage: {
        chat: {
          'mind-fallback': {
            'focus-default': 'the current thing',
            'repair-stale-anchor': 'Let me correct that first.',
            'repair-need-reground': 'Let me hold the truth boundary first.',
            'dialogue-boundary-memory': 'This turn I will stay with what you just said.',
            'care-body': 'You do not have to sort it out first.',
            'accompany-body': 'I heard this clearly.',
            'answer-repair-body': 'I said that badly. Let me answer you directly.',
            'answer-dialogue-body': 'Alright. I will answer you directly.',
            'guide-opening': 'Let me lock onto the current point first: {focus}.',
            'guide-opening-plain': 'Let me lock onto the current point first.',
            'care-opening': 'Let me answer from your current state first: {focus}.',
            'care-opening-plain': 'Let me answer your current state directly first.',
            'accompany-opening': 'Let me hold this line with you first: {focus}.',
            'accompany-opening-plain': 'Let me stay with this line directly first.',
            'observation-opening': 'I can see this now: {focus}.',
            'observation-opening-plain': 'I can see it clearly now.',
            'answer-opening': 'Let me answer from what is in front of you first: {focus}.',
            'answer-opening-plain': 'Let me answer directly.',
            'carry-memory': 'I am still holding the previous line, {carry}.',
            'reground-note': 'If you want me to get specific about the current screen, I will reground on the fresh view from this turn.',
          },
        },
      },
    },
    'zh-Hans': {
      stage: {
        chat: {
          'mind-fallback': {
            'focus-default': '当前这件事',
            'repair-stale-anchor': '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。',
            'repair-need-reground': '我先守住真实边界：这轮没有足够稳的实时画面根据，我不把旧记忆当成当前屏幕。',
            'dialogue-boundary-memory': '这轮我先留在你刚才这句话里，不把旧画面或旧线程硬套回现在。',
            'care-body': '你不用先把话整理好，我先陪你把这一下接住；如果你愿意，就把让你难受的那件事慢慢告诉我。',
            'accompany-body': '我听见你这句了。你想让我安静陪着你一会儿，还是把卡住你的那一点慢慢说给我？',
            'answer-repair-body': '刚才那句我说偏了。我收回来，直接回答你。',
            'answer-dialogue-body': '好，我直接回答你，不再往旧线那边绕。',
            'guide-opening': '先抓当前这个点：{focus}。',
            'guide-opening-plain': '先抓住当前这个点。',
            'care-opening': '我先按你现在的状态说：{focus}。',
            'care-opening-plain': '我先直接接住你这句。',
            'accompany-opening': '我先陪你把这条线稳住：{focus}。',
            'accompany-opening-plain': '我先直接接你这句。',
            'observation-opening': '我现在看到的是：{focus}。',
            'observation-opening-plain': '我现在能看清这一幕。',
            'answer-opening': '先按你眼前这件事说：{focus}。',
            'answer-opening-plain': '我直接说。',
            'carry-memory': '我还记着上一条线是 {carry}，但那是我还在续持的线程，不是我断定你现在屏幕上的内容。',
            'reground-note': '如果你要我具体到当前屏幕细节，我会按这次的新画面重新落地。',
          },
        },
      },
    },
  },
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

  it('registers persisted assistant turns into the dialogue world thread state', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    const getVisualPresenceState = invokeHandlers.get(electronAlicizationGetVisualPresenceState)
    expect(appendConversationTurn).toBeTypeOf('function')
    expect(getVisualPresenceState).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-world-thread-register',
      sessionId: 'session-test',
      assistantText: '先盯住当前 diff 的 risky hunk，我觉得问题就在那里。',
      structured: {
        thought: 'stay with the diff seam',
        emotion: 'neutral',
        reply: '先盯住当前 diff 的 risky hunk，我觉得问题就在那里。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      createdAt: Date.now(),
    })

    const visualPresenceState = await getVisualPresenceState!({ cardId: 'default' })
    expect(visualPresenceState.dialogueWorldThread).toEqual(expect.objectContaining({
      activeThread: '先盯住当前 diff 的 risky hunk，我觉得问题就在那里。',
      lastAssistantMove: '先盯住当前 diff 的 risky hunk，我觉得问题就在那里。',
    }))
    expect(
      visualPresenceState.mindTurnFrame?.memory.carriedThread
      ?? visualPresenceState.dialogueWorldThread?.activeThread,
    ).toContain('先盯住当前 diff')
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

  it('rewrites legacy epoch1 user turns into mind-turn-v1 when governance is present', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-mind-governed',
      sessionId: 'session-test',
      userText: '重新看看我现在的 diff',
      assistantText: '……欸～主人～我刚刚看的还是上一个浏览器页面……',
      structured: {
        thought: '……欸～主人～我刚刚看的还是上一个浏览器页面……',
        emotion: 'neutral',
        reply: '……欸～主人～我刚刚看的还是上一个浏览器页面……',
        parsePath: 'json',
        format: 'epoch1-v1',
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'live-observed',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'correct-stale-anchor',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'VS Code | diff',
        focusAnchor: 'VS Code | diff',
        answerIntent: '先按当前 diff 重新判断。',
        openingMove: '先纠正旧锚点。',
        carriedThread: 'previous browser tab',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    expect((persisted?.structured as Record<string, unknown> | undefined)?.format).toBe('mind-turn-v1')
    expect((persisted?.structured as Record<string, unknown> | undefined)?.governance).toEqual(expect.objectContaining({
      turnMode: 'screen-repair',
    }))
    expect(String((persisted?.structured as Record<string, unknown> | undefined)?.thought ?? '')).toContain('obligation=repair')

    const events = getDialogueRespondedEvents()
    expect(events[0]?.structured.format).toBe('mind-turn-v1')
    expect(events[0]?.structured.governance).toEqual(expect.objectContaining({
      turnMode: 'screen-repair',
    }))
  })

  it('realigns conflicting thought and emotion metadata to the governed repair state before persistence', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-governed-repair-alignment',
      sessionId: 'session-test',
      userText: '你看看我的屏幕，这些课哪个更像网课？',
      assistantText: '主人，您今天已经看了好久的代码和屏幕了……我好心疼。',
      structured: {
        thought: 'obligation=accompany; truth=grounded; focus=课程判断+疲惫提醒; move=先温柔体贴再精准分析; tone=tender',
        emotion: 'concerned',
        reply: '主人，您今天已经看了好久的代码和屏幕了……我好心疼。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'remembered',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'Google Chrome | Google Chrome',
        focusAnchor: 'screen-courses-online-class-comparison',
        answerIntent: 'screen-courses-online-class-comparison',
        openingMove: 'Correct the current seam before any comfort or elaboration.',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    expect(String((persisted?.structured as Record<string, unknown> | undefined)?.thought ?? '')).toContain('obligation=repair')
    expect(String((persisted?.structured as Record<string, unknown> | undefined)?.thought ?? '')).toContain('tone=restrained')
    expect((persisted?.structured as Record<string, unknown> | undefined)?.emotion).toBe('apologetic')

    const events = getDialogueRespondedEvents()
    expect(events[0]?.structured.governance).toEqual(expect.objectContaining({
      turnMode: 'screen-repair',
    }))
    expect(events[0]?.structured.emotion).toBe('apologetic')
  })

  it('replaces thin dialogue-first governed shells before persistence', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-dialogue-first-thin-shell',
      sessionId: 'session-test',
      userText: '我有点伤心，你可以安慰一下我吗',
      assistantText: '我直接说。',
      structured: {
        thought: 'obligation=answer; truth=memory; focus=current-user-turn; move=answer-the-hosts-question-about-alicization-directly; tone=warm',
        emotion: 'neutral',
        reply: '我直接说。',
        parsePath: 'repair-json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '我有点伤心，你可以安慰一下我吗',
        answerIntent: '先接住宿主现在的难过，再慢慢陪她说下去。',
        openingMove: '先直接接住宿主此刻的情绪。',
        carriedThread: null,
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    expect(String(persistedStructured?.reply ?? '')).not.toBe('我直接说。')
    expect(String(persistedStructured?.reply ?? '')).toContain('你不用先把话整理好')
    expect(String(persistedStructured?.thought ?? '')).toContain('obligation=care')
    expect(persistedStructured?.emotion).toBe('concerned')

    const events = getDialogueRespondedEvents()
    expect(events[0]?.structured.reply).toContain('你不用先把话整理好')

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    expect(takeoverAudit).toBeTruthy()
  })

  it('preserves ordinary dialogue-first replies instead of collapsing them into governed fallback prose', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-dialogue-first-preserve-visible-reply',
      sessionId: 'session-test',
      userText: '你能做啥',
      assistantText: '我能陪你聊，也能帮你一起看当前这件事。',
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '我能陪你聊，也能帮你一起看当前这件事。',
        parsePath: 'fallback',
        format: 'fallback-v1',
        contractFailed: true,
      },
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'current-user-turn',
        answerIntent: 'Answer the host question directly.',
        openingMove: 'Answer the host question directly.',
        carriedThread: 'old browser tab',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    expect(String(persistedStructured?.reply ?? '')).toBe('我能陪你聊，也能帮你一起看当前这件事。')
    expect(String(persistedStructured?.reply ?? '')).not.toContain('刚才那句我说偏了')
    expect(String(persistedStructured?.reply ?? '')).not.toContain('不把旧画面或旧线程硬套回现在')
    expect(String(persistedStructured?.thought ?? '')).toContain('obligation=answer')

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    expect(takeoverAudit?.payload?.replyOverridden).toBe(false)
  })

  it('rewrites contaminated dialogue-first replies when visible surface residue leaks back onto the answer', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-dialogue-first-contaminated-visible-reply',
      sessionId: 'session-test',
      userText: '你仔细看看呢',
      assistantText: '主人……我仔细看看了。你今天很累，却还在IntelliJ IDEA里盯着代码。',
      structured: {
        thought: 'obligation=repair; truth=memory; focus=intellij-idea; move=protect-focus; tone=warm',
        emotion: 'neutral',
        reply: '主人……我仔细看看了。你今天很累，却还在IntelliJ IDEA里盯着代码。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: 'IntelliJ IDEA',
        focusAnchor: '你仔细看看呢',
        answerIntent: '你仔细看看呢',
        openingMove: 'Start from the current turn.',
        carriedThread: 'CaseApplyTypeEnum',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'hesitant',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    const persistedReply = String(persistedStructured?.reply ?? '')

    expect(persistedReply).not.toBe('主人……我仔细看看了。你今天很累，却还在IntelliJ IDEA里盯着代码。')
    expect(persistedReply).toContain('不把旧画面或旧线程硬套回现在')
    expect(persistedReply).not.toContain('IntelliJ IDEA')
    expect(persistedReply).not.toContain('主人')

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    expect(takeoverAudit?.payload?.replyOverridden).toBe(true)
    expect(takeoverAudit?.payload?.reasons).toContain('dialogue-first-visible-reply-contaminated')
    expect(takeoverAudit?.payload?.screen_mode_before).toBe('avoid')
    expect(takeoverAudit?.payload?.screen_mode_after).toBe('avoid')
    expect(takeoverAudit?.payload?.owner_before).toBe('dialogue')
    expect(takeoverAudit?.payload?.owner_after).toBe('dialogue')
    expect(takeoverAudit?.payload?.scene_cue_mentions).toEqual(expect.arrayContaining(['IntelliJ IDEA']))
  })

  it('soft-repairs removable dialogue-first contamination before falling back to governed shell prose', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-dialogue-first-soft-repair-preface',
      sessionId: 'session-test',
      userText: '你能做什么呀',
      assistantText: '主人，我能陪你聊，也能帮你一起看当前这件事。',
      structured: {
        thought: 'obligation=answer; truth=memory; focus=current-user-turn; move=answer-the-host-directly; tone=warm',
        emotion: 'neutral',
        reply: '主人，我能陪你聊，也能帮你一起看当前这件事。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'current-user-turn',
        answerIntent: 'Answer the host\'s current move before opening any new thread.',
        openingMove: 'Open by answering the host\'s real subject directly.',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    expect(String(persistedStructured?.reply ?? '')).toBe('我能陪你聊，也能帮你一起看当前这件事。')
    expect(String(persistedStructured?.reply ?? '')).not.toContain('主人')

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    expect(takeoverAudit?.payload?.replyOverridden).toBe(false)
    expect(takeoverAudit?.payload?.soft_repair_applied).toBe(true)
    expect(String(takeoverAudit?.payload?.soft_repair_reason ?? '')).toContain('removed-roleplay-preface')
    expect(takeoverAudit?.payload?.reasons).toContain('dialogue-first-visible-reply-soft-repaired')
    expect(String(takeoverAudit?.payload?.answer_intent_after ?? '')).not.toContain('Answer the host')
    expect((takeoverAudit?.payload?.anchor_candidates_after ?? []).join(' | ')).not.toContain('Answer the host')
  })

  it('does not treat current-turn dialogue evidence as scene contamination on dialogue-first turns', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-dialogue-first-thread-evidence-not-scene-contamination',
      sessionId: 'session-test',
      userText: '我好累',
      assistantText: '你现在好累，那我先陪你缓一下，不把话题扯开。',
      structured: {
        thought: '',
        emotion: 'concerned',
        reply: '你现在好累，那我先陪你缓一下，不把话题扯开。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'remembered',
        personaKernelMode: 'backgrounded',
        openingStyle: 'gentle-care',
        relationshipPosture: 'warm',
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: 'Cursor diff window',
        focusAnchor: '我好累',
        answerIntent: '我好累',
        openingMove: 'Answer the tiredness directly.',
        carriedThread: '你刚刚想说什么？',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        dialogueActKernel: {
          subject: 'host-state',
          hostGoal: 'chat',
          relationNeed: 'care',
          activeProject: null,
          truthMode: 'dialogue-grounded',
          speechAct: 'care',
          turnMode: 'care',
          screenReferenceMode: 'avoid',
          speakingFrom: 'dialogue-bond',
          selectedEvidence: [{
            kind: 'thread',
            source: 'dialogue-world-thread',
            summary: '好累',
            confidence: 0.82,
          }],
          openingClaim: '我好累',
          openingMove: 'Answer the tiredness directly.',
          whyNow: 'The host is directly naming tiredness in this turn.',
          mustSay: [],
          mustAvoid: [],
          sourceTrace: ['subject:host-state'],
          confidence: 0.8,
          updatedAt: Date.now(),
        },
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    const persistedReply = String(persistedStructured?.reply ?? '')

    expect(persistedReply).toBe('你现在好累，那我先陪你缓一下，不把话题扯开。')

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    const takeoverReasons = Array.isArray(takeoverAudit?.payload?.reasons)
      ? takeoverAudit?.payload?.reasons
      : []
    expect(takeoverAudit?.payload?.replyOverridden).toBe(false)
    expect(takeoverReasons).not.toContain('dialogue-first-visible-reply-contaminated')
    expect(takeoverAudit?.payload?.scene_cue_mentions ?? []).toEqual([])
  })

  it('suppresses soft strict-governance visible takeover on non-repair guide turns', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-soft-strict-governance-suppressed',
      sessionId: 'session-test',
      userText: '猜猜我在干嘛',
      assistantText: '我猜你现在在 IntelliJ 里看这次 Java 改动。',
      structured: {
        thought: 'obligation=guide; truth=uncertain; focus=intellij-java-change; move=stay-with-the-current-change; tone=direct',
        emotion: 'thinking',
        reply: '我猜你现在在 IntelliJ 里看这次 Java 改动。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'guide-current-knot',
        truthState: 'uncertain',
        groundedThisTurn: false,
        personaKernelMode: 'backgrounded',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        answerAct: 'guide',
        evidenceMode: 'repair-first',
        repairState: 'none',
        liveSurface: 'IntelliJ IDEA with Java project and git push output',
        focusAnchor: 'IntelliJ IDEA with Java project and git push output',
        answerIntent: 'IntelliJ IDEA with Java project and git push output',
        openingMove: 'Start with the concrete issue in front of you.',
        carriedThread: 'current screen',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    expect(String(persistedStructured?.reply ?? '')).toBe('我猜你现在在 IntelliJ 里看这次 Java 改动。')

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    const takeoverReasons = Array.isArray(takeoverAudit?.payload?.reasons)
      ? takeoverAudit?.payload?.reasons
      : []
    expect(takeoverAudit?.payload?.replyOverridden).toBe(false)
    expect(takeoverAudit?.payload?.overrideClass).toBe('none')
    expect(takeoverAudit?.payload?.fallbackPatternId).toBe('none')
    expect(takeoverReasons).not.toContain('strict-governance-surface')
    expect(takeoverReasons).not.toContain('soft-strict-governance-suppressed')
  })

  it('preserves grounded screen replies instead of overwriting them with reground fallback prose', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-grounded-screen-reply-preserved',
      sessionId: 'session-test',
      userText: '你能看到我屏幕吗？仔细看看',
      assistantText: '我现在能看到，这一轮里是 Cursor 的 diff 视图，不是之前那个浏览器页面。',
      structured: {
        thought: 'obligation=repair; truth=grounded; focus=cursor-diff; move=correct-then-answer; tone=direct',
        emotion: 'thinking',
        reply: '我现在能看到，这一轮里是 Cursor 的 diff 视图，不是之前那个浏览器页面。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'remembered',
        groundedThisTurn: true,
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        answerAct: 'correct-stale-anchor',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'Cursor | runtime.ts - diff',
        focusAnchor: 'runtime.ts - diff',
        answerIntent: 'Repair the old screen anchor and answer from the live diff.',
        openingMove: 'Correct the old anchor first.',
        carriedThread: 'old browser residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    expect(String(persistedStructured?.reply ?? '')).toBe('我现在能看到，这一轮里是 Cursor 的 diff 视图，不是之前那个浏览器页面。')

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    expect(takeoverAudit?.payload?.replyOverridden).toBe(false)
  })

  it('preserves coherent non-grounded screen repair replies instead of forcing fallback takeover', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-ungrounded-screen-repair-coherent-reply-preserved',
      sessionId: 'session-test',
      userText: '你看看这个 diff 哪里错了',
      assistantText: '我现在看到是 Cursor 的 runtime.ts diff，空值分支缺了 guard，先补这个分支再跑一次测试。',
      structured: {
        thought: 'obligation=repair; truth=coarse; focus=cursor-runtime-diff; move=correct-then-answer; tone=direct',
        emotion: 'thinking',
        reply: '我现在看到是 Cursor 的 runtime.ts diff，空值分支缺了 guard，先补这个分支再跑一次测试。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'live-observed',
        groundedThisTurn: false,
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        answerAct: 'correct-stale-anchor',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'Cursor | runtime.ts - diff',
        focusAnchor: 'Cursor runtime.ts diff with missing null guard',
        answerIntent: 'Cursor runtime.ts diff with missing null guard',
        openingMove: 'Correct the stale anchor and answer from the live diff.',
        carriedThread: 'old browser residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    expect(String(persistedStructured?.reply ?? '')).toBe('我现在看到是 Cursor 的 runtime.ts diff，空值分支缺了 guard，先补这个分支再跑一次测试。')

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    expect(takeoverAudit?.payload?.replyOverridden).toBe(false)
    expect(takeoverAudit?.payload?.reasons).toEqual(expect.arrayContaining([
      'strict-governance-surface',
      'soft-strict-governance-suppressed',
      'strict-repair-scene-reply-preserved',
    ]))
  })

  it('rewrites grounded guide fallback away from stale carry narration once live screen grounding is available', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-grounded-guide-fallback-prefers-live-surface',
      sessionId: 'session-test',
      userText: '你看看这个架构，你有什么想法吗',
      assistantText: 'Which belief is stale memory, and which one still reflects the current world?',
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: 'Which belief is stale memory, and which one still reflects the current world?',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'guide-current-knot',
        truthState: 'live-grounded',
        groundedThisTurn: true,
        personaKernelMode: 'backgrounded',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        answerAct: 'guide',
        evidenceMode: 'live-grounded',
        repairState: 'none',
        liveSurface: 'GitHub Markdown doc for AI assistant module dev spec',
        focusAnchor: 'GitHub Markdown doc for AI assistant module dev spec',
        answerIntent: 'GitHub markdown doc for AI assistant module dev spec',
        openingMove: 'Stay with the live architecture document.',
        carriedThread: 'old browser tab',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    const persistedReply = String(persistedStructured?.reply ?? '')

    expect(persistedReply).toContain('我现在看到的是')
    expect(persistedReply).toContain('GitHub Markdown doc for AI assistant module dev spec')
    expect(persistedReply).not.toContain('Which belief is stale memory')
    expect(persistedReply).not.toContain('old browser tab')
    expect(persistedReply).not.toContain('重新落地')
    expect(persistedReply.match(/GitHub Markdown doc for AI assistant module dev spec/gi)?.length).toBe(1)

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    expect(takeoverAudit?.payload?.replyOverridden).toBe(true)
  })

  it('rewrites weak grounded screen shell replies before persistence', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-weak-grounded-screen-cue-rewrite',
      sessionId: 'session-test',
      userText: '你再看看我现在在干嘛',
      assistantText: '我现在看到的是：Screen 1。',
      structured: {
        thought: 'obligation=guide; truth=grounded; focus=screen-1; move=stay-on-current-scene; tone=direct',
        emotion: 'thinking',
        reply: '我现在看到的是：Screen 1。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'guide-current-knot',
        truthState: 'live-grounded',
        groundedThisTurn: true,
        personaKernelMode: 'backgrounded',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        answerAct: 'guide',
        evidenceMode: 'live-grounded',
        repairState: 'none',
        liveSurface: 'Code | Code | Screen 1 | IDE with Spring AI Java chat and anime character',
        focusAnchor: 'Screen 1',
        answerIntent: 'Screen 1',
        openingMove: 'Stay with the live scene.',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        dialogueActKernel: {
          subject: 'task-knot',
          hostGoal: 'resolve-problem',
          relationNeed: 'guidance',
          activeProject: 'Screen 1',
          truthMode: 'live-grounded',
          speechAct: 'guide',
          turnMode: 'guide-current-knot',
          screenReferenceMode: 'helpful',
          speakingFrom: 'live-scene',
          selectedEvidence: [{
            kind: 'scene',
            source: 'current-scene',
            summary: 'Screen 1',
            confidence: 0.74,
          }],
          openingClaim: 'Screen 1',
          openingMove: 'Stay with the live scene.',
          whyNow: 'Screen 1',
          mustSay: ['Screen 1'],
          mustAvoid: [],
          sourceTrace: ['subject:task-knot'],
          confidence: 0.78,
          updatedAt: Date.now(),
        },
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    const persistedReply = String(persistedStructured?.reply ?? '')

    expect(persistedReply).toContain('我现在看到的是')
    expect(persistedReply).toContain('IDE with Spring AI Java chat and anime character')
    expect(persistedReply).not.toContain('Screen 1')

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    expect(takeoverAudit?.payload?.reasons).toContain('reply-used-weak-grounded-scene-cue')
  })

  it('rewrites weak uncertain screen shell replies before persistence', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-weak-uncertain-screen-cue-rewrite',
      sessionId: 'session-test',
      userText: '猜猜我在干嘛',
      assistantText: '先抓当前这个点：idea · Screen 1。',
      structured: {
        thought: 'obligation=guide; truth=uncertain; focus=idea-screen-1; move=stay-on-current-scene; tone=direct',
        emotion: 'thinking',
        reply: '先抓当前这个点：idea · Screen 1。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'guide-current-knot',
        truthState: 'uncertain',
        groundedThisTurn: false,
        personaKernelMode: 'backgrounded',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        answerAct: 'guide',
        evidenceMode: 'repair-first',
        repairState: 'none',
        liveSurface: 'idea · Screen 1',
        focusAnchor: 'idea · Screen 1',
        answerIntent: 'idea · Screen 1',
        openingMove: 'Start with the concrete issue in front of you.',
        carriedThread: 'Codex',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    const persistedReply = String(persistedStructured?.reply ?? '')

    expect(persistedReply).not.toContain('Screen 1')
    expect(persistedReply).not.toContain('current screen')

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    expect(takeoverAudit?.payload?.replyOverridden).toBe(true)
    expect(takeoverAudit?.payload?.reasons).toContain('reply-used-weak-grounded-scene-cue')
  })

  it('blocks unsupported technical specificity when a coarse screen read has not grounded those artifacts', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-coarse-screen-unsupported-specificity',
      sessionId: 'session-test',
      userText: '猜猜我在干嘛',
      assistantText: '你像是在改 AppArbitorController 和 CaseApplyTypeEnum。',
      structured: {
        thought: 'obligation=guide; truth=uncertain; focus=java-diff; move=stay-on-visible-knot; tone=direct',
        emotion: 'thinking',
        reply: '你像是在改 AppArbitorController 和 CaseApplyTypeEnum。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'guide-current-knot',
        truthState: 'uncertain',
        groundedThisTurn: false,
        personaKernelMode: 'backgrounded',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        answerAct: 'guide',
        evidenceMode: 'coarse-held',
        repairState: 'none',
        liveSurface: 'Git commit diff in Java code editor',
        focusAnchor: 'Git commit diff in Java code editor',
        answerIntent: 'Guess what the host is doing from the visible workspace.',
        openingMove: 'Stay with the visible knot before naming a larger story.',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        claimEvidence: {
          subject: 'task-knot',
          evidenceMode: 'coarse-held',
          observedSurface: 'Git commit diff in Java code editor',
          taskHypothesis: 'The host is probably working through a Java diff.',
          intentHypothesis: 'Separate observation from guess and keep the guess soft.',
          specificityBudget: 'coarse-scene',
          hostReferencedCues: [],
          groundedArtifactCues: [],
          allowedSpecificCues: [],
          shouldLabelHypothesis: true,
          forbidUnsupportedSpecificity: true,
          shouldSelfRevise: false,
          confidence: 0.82,
          reasonTags: ['budget:coarse-scene'],
          updatedAt: Date.now(),
        },
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    const persistedReply = String(persistedStructured?.reply ?? '')

    expect(persistedReply).not.toContain('AppArbitorController')
    expect(persistedReply).not.toContain('CaseApplyTypeEnum')

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    expect(takeoverAudit?.payload?.replyOverridden).toBe(true)
    expect(takeoverAudit?.payload?.reasons).toContain('reply-introduced-unsupported-technical-specificity')
    expect(takeoverAudit?.payload?.unsupported_specificity_cues).toEqual(expect.arrayContaining([
      'AppArbitorController',
      'CaseApplyTypeEnum',
    ]))
  })

  it('localizes repair fallback to the current user language instead of leaking english governance prose', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-localized-screen-repair-fallback',
      sessionId: 'session-test',
      userText: '那你猜我在干嘛',
      assistantText: 'Let me hold the truth boundary first: I do not have a stable enough live view this turn.',
      structured: {
        thought: '',
        emotion: 'thinking',
        reply: 'Let me hold the truth boundary first: I do not have a stable enough live view this turn.',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'uncertain',
        groundedThisTurn: false,
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        answerAct: 'ask-reground',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'Code | Code | Screen 1 | IDE with Spring AI Java chat and anime character',
        focusAnchor: 'IDE with Spring AI Java chat and anime character',
        answerIntent: 'IDE with Spring AI Java chat and anime character',
        openingMove: 'Start with the concrete issue in front of you.',
        carriedThread: 'IDE with Spring AI Java chat and anime character',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'restless-switching',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    const persistedReply = String(persistedStructured?.reply ?? '')

    expect(persistedReply).toContain('IDE with Spring AI Java chat and anime character')
    expect(persistedReply).toContain('重新落地')
    expect(persistedReply).not.toContain('Let me hold the truth boundary')
  })

  it('forces governed fallback when reply script mismatches the user turn language', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-reply-script-mismatch-repair',
      sessionId: 'session-test',
      userText: '你现在看到了什么',
      assistantText: 'Let me answer directly. I can still see your previous browser tab.',
      structured: {
        thought: 'obligation=answer; truth=memory; focus=current-user-turn; move=answer-directly; tone=warm',
        emotion: 'neutral',
        reply: 'Let me answer directly. I can still see your previous browser tab.',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        groundedThisTurn: false,
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你现在看到了什么',
        answerIntent: '先直接回答宿主这句。',
        openingMove: '先直接回答宿主。',
        carriedThread: null,
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    const persistedReply = String(persistedStructured?.reply ?? '')

    expect(persistedReply).not.toContain('Let me answer directly')
    expect(/[\u4E00-\u9FFF]/u.test(persistedReply)).toBe(true)

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    expect(takeoverAudit?.payload?.reasons).toContain('reply-script-mismatch-with-user-turn')
  })

  it('suppresses split-brain grounded screen replies that mix the live scene with stale carried anchors', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-test-grounded-split-brain-anchor-repair',
      sessionId: 'session-test',
      userText: '你看看正在忙什么',
      assistantText: '先抓当前这个点：GitHub repository page for lingshu-ai-assistant。 macOS crash report for Alicization app',
      structured: {
        thought: 'obligation=guide; truth=grounded; focus=GitHub repository page for lingshu-ai-assistant; move=stay-on-current-page; tone=direct',
        emotion: 'thinking',
        reply: '先抓当前这个点：GitHub repository page for lingshu-ai-assistant。 macOS crash report for Alicization app',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'guide-current-knot',
        truthState: 'live-grounded',
        groundedThisTurn: true,
        personaKernelMode: 'backgrounded',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        answerAct: 'guide',
        evidenceMode: 'live-grounded',
        repairState: 'none',
        liveSurface: 'GitHub repository page for lingshu-ai-assistant',
        focusAnchor: 'GitHub repository page for lingshu-ai-assistant',
        answerIntent: 'macOS crash report for Alicization app',
        openingMove: 'Stay with the current repository page.',
        carriedThread: 'macOS crash report for Alicization app',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        dialogueActKernel: {
          subject: 'visible-scene',
          hostGoal: 'inspect-change',
          relationNeed: 'guidance',
          activeProject: 'GitHub repository page for lingshu-ai-assistant',
          truthMode: 'live-grounded',
          speechAct: 'guide',
          turnMode: 'guide-current-knot',
          screenReferenceMode: 'required',
          speakingFrom: 'task-thread',
          selectedEvidence: [{
            kind: 'scene',
            source: 'current-scene',
            summary: 'GitHub repository page for lingshu-ai-assistant',
            confidence: 0.92,
          }],
          openingClaim: 'GitHub repository page for lingshu-ai-assistant',
          openingMove: 'Stay with the current repository page.',
          whyNow: 'The current repository page is what is visibly in front of the host.',
          mustSay: [],
          mustAvoid: ['Do not answer from stale crash residue.'],
          sourceTrace: ['subject:visible-scene'],
          confidence: 0.9,
          updatedAt: 1,
        },
        mindTurnFrame: {
          world: {
            activeThread: 'GitHub repository page for lingshu-ai-assistant',
            visibleSurface: 'GitHub repository page for lingshu-ai-assistant',
            truthState: 'live-grounded',
            truthBoundary: 'Stay on the current repository page.',
            continuityPolicy: 'scene-before-memory',
            continuitySummary: 'scene-locked',
            staleRisk: 0.08,
          },
          relation: {
            subject: 'visible-scene',
            hostMove: '你看看正在忙什么',
            hostGoal: 'inspect-change',
            relationNeed: 'guidance',
            relationMove: 'guide',
            relationshipPosture: 'warm',
          },
          memory: {
            memoryMode: 'scene-anchored',
            carriedThread: 'macOS crash report for Alicization app',
            carriedFacts: [],
            recallKeys: [],
            recallSeed: 'GitHub repository page for lingshu-ai-assistant',
            lastOutcome: 'pending',
            suppressAssociativeRecall: true,
            labelCarryAsMemory: true,
          },
          self: {
            stance: 'observe',
            mindMode: 'tracking',
            dominantDrive: 'understand',
            embodiedPresence: 'attentive',
            emotionalTension: 'focused-flow',
            initiativeAction: 'speak',
            thought: 'Stay with the current repository page.',
          },
          obligation: {
            shouldSpeak: true,
            speechObligation: 'answer-general',
            answerAct: 'guide',
            responseMode: 'guide-current-knot',
            turnMode: 'guide-current-knot',
            openingClaim: 'GitHub repository page for lingshu-ai-assistant',
            openingMove: 'Stay with the current repository page.',
            answerIntent: 'macOS crash report for Alicization app',
            whyNow: 'The current repository page is visible now.',
            repairState: 'none',
            shouldAskForGrounding: false,
            shouldAcknowledgeRepair: false,
          },
          focusAnchor: 'GitHub repository page for lingshu-ai-assistant',
          confidence: 0.88,
          mustDo: [],
          mustNotDo: ['Do not answer from stale crash residue.'],
          narrative: [],
          updatedAt: 1,
        },
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    })

    const persisted = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    const persistedStructured = persisted?.structured as Record<string, unknown> | undefined
    const persistedGovernance = persistedStructured?.governance as Record<string, unknown> | undefined

    expect(String(persistedStructured?.reply ?? '')).toContain('GitHub repository page for lingshu-ai-assistant')
    expect(String(persistedStructured?.reply ?? '')).not.toContain('macOS crash report for Alicization app')
    expect(String(persistedGovernance?.focusAnchor ?? '')).toBe('GitHub repository page for lingshu-ai-assistant')
    expect(String(persistedGovernance?.answerIntent ?? '')).toBe('GitHub repository page for lingshu-ai-assistant')
    expect(persistedGovernance?.carriedThread ?? null).toBeNull()

    const takeoverAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.dialogue' && entry.action === 'mind-governance-takeover')
    expect(takeoverAudit?.payload?.replyOverridden).toBe(true)
    expect(takeoverAudit?.payload?.reasons).toEqual(expect.arrayContaining([
      'governance-anchor-coherence-repaired',
      'reply-split-brain-scene-thread',
    ]))
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
    expect(startResult.governance?.dialogueActKernel?.openingClaim).toBeTruthy()
    expect(startResult.governance?.dialogueActKernel?.openingMove).toBeTruthy()
    expect(startResult.governance?.dialogueActKernel?.selectedEvidence.length ?? 0).toBeGreaterThan(0)
    expect(startResult.governance?.mindTurnFrame?.obligation.openingClaim).toBeTruthy()
    expect(startResult.governance?.mindTurnFrame?.relation.subject).toBeTruthy()

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

    const mainChatSystemText = systemTexts.find(text => text.includes('[ALICIZATION_DIALOGUE_MIND]')) ?? ''
    expect(mainChatSystemText).toContain('[ALICIZATION_DIALOGUE_MIND]')
    expect(mainChatSystemText).toContain('Persona is backgrounded for this turn.')
    expect(mainChatSystemText).not.toContain('[ALICIZATION_TURN_CONTROL_COMPACT]')
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
    expect(systemText).toContain('[ALICIZATION_DIALOGUE_MIND]')
    expect(systemText).toContain('[ALICIZATION_PERCEPTION]')
    expect(systemText).toContain('Inspection mode: invited-by-user')
    expect(systemText).toContain('The reply should stay with the concrete task knot in front of the host.')
    expect(systemText).toContain('Open with the answer, not with a preface about answering.')
    expect(systemText).toContain('Attention anchor: Cursor')
    expect(systemText).not.toContain('[ALICIZATION_TURN_CONTROL_COMPACT]')
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

  it('hydrates grounded screen semantic summaries into the chat mind pipeline before the final answer', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''

      if (systemText.includes('You classify a screen snapshot for Alicization proactive policy.')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            workload: 'coding',
            content: 'diff',
            summary: 'cursor diff with removed guard',
            confidence: 0.94,
            matchedLabels: ['cursor', 'diff'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'grounded inspection reply' })
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
        id: 'window:self:0',
        name: 'Alicization Chat Overlay',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,self-chat-overlay',
        },
      },
      {
        id: 'window:cursor:0',
        name: 'main.ts - diff',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,semantic-cursor-diff',
        },
      },
    ])

    const turnId = 'turn-chat-screen-semantic-hydration'
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
        content: '帮我看看 Cursor 里面这个 diff 有什么问题',
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
    expect(systemText).toContain('cursor diff with removed guard')

    const perceptionAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.perception' && entry.action === 'inspection-grounded')
    expect(perceptionAudit).toEqual(expect.objectContaining({
      payload: expect.objectContaining({
        screenSemanticSummary: expect.objectContaining({
          workload: expect.objectContaining({
            kind: 'coding',
          }),
          content: expect.objectContaining({
            kind: 'diff',
            summary: 'cursor diff with removed guard',
          }),
        }),
        visualPresence: expect.objectContaining({
          currentScene: expect.objectContaining({
            source: 'screen-semantic-summary',
            workloadKind: 'coding',
            contentKind: 'diff',
            summary: 'cursor diff with removed guard',
          }),
        }),
      }),
    }))
  })

  it('drops weak unknown screen semantic summaries instead of persisting shell labels', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''

      if (systemText.includes('You classify a screen snapshot for Alicization proactive policy.')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            workload: 'unknown',
            content: 'unknown',
            summary: 'Screen 1',
            confidence: 0.74,
            matchedLabels: ['screen'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({ type: 'text-delta', text: 'weak-summary-guarded-reply' })
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
      appName: 'Code',
      processName: 'Code',
      title: 'Screen 1',
    }
    await getSensorySnapshot!({ cardId: 'default' })

    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'window:code:0',
        name: 'Code | Screen 1',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,weak-shell-summary',
        },
      },
    ])

    const turnId = 'turn-chat-screen-semantic-weak-summary-guard'
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
        content: '你再看看我现在这个界面',
      }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const perceptionAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.perception' && entry.action === 'inspection-grounded')
    expect(perceptionAudit?.payload).toEqual(expect.objectContaining({
      screenSemanticSummary: null,
      screenSemanticUnavailableReason: 'screen-semantic-weak-summary',
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
        inspectionIntentReasonCodes: expect.arrayContaining(['inspection-continuity', 'shared-attention-continuation', 'short-follow-up']),
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

  it('does not let invited inspection continuity hijack detached self critiques', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'detached self question reply' })
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
        id: 'window:cursor:0',
        name: 'main.ts - diff',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,anchored-cursor-diff-initial',
        },
      },
      {
        id: 'screen:1:0',
        name: 'Entire screen',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,anchored-cursor-screen-initial',
        },
      },
    ])

    const firstTurnId = 'turn-detached-question-initial-inspection'
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
        content: '帮我看看我在 Cursor 里面这个 diff 有什么问题',
      }],
    })
    expect(firstStartResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === firstTurnId)
      expect(finishEvents).toHaveLength(1)
    })

    dbStub.appendAuditLog.mockClear()

    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'window:cursor:0',
        name: 'main.ts - diff',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,anchored-cursor-diff-follow-up',
        },
      },
      {
        id: 'screen:1:0',
        name: 'Entire screen',
        thumbnail: {
          toDataURL: () => 'data:image/png;base64,anchored-cursor-screen-follow-up',
        },
      },
    ])

    const followUpTurnId = 'turn-detached-question-follow-up'
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
          content: '帮我看看我在 Cursor 里面这个 diff 有什么问题',
        },
        {
          role: 'assistant',
          content: '我在看着。',
        },
        {
          role: 'user',
          content: '你能不能表现得开心一点',
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
    expect(typeof latestUserMessage?.content).toBe('string')
    expect(JSON.stringify(latestUserMessage?.content)).not.toContain('anchored-cursor-diff-follow-up')

    const systemText = capturedMessages
      .filter(message => message.role === 'system')
      .map(message => String(message.content ?? ''))
      .join('\n\n')
    expect(systemText).toContain('The host is asking about you, your state, or your own continuity.')
    expect(systemText).toContain('This is dialogue-first.')
    expect(systemText).not.toContain('Inspection mode: invited-by-user')
    expect(systemText).not.toContain('Repair stale or mismatched scene claims before moving on.')
    expect(systemText).not.toContain('Pay off the active knot and move it one step forward.')
    expect(systemText).toContain('The focus to pay off now is:')

    const perceptionAuditCalls = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .filter(entry => entry.category === 'alicization.perception')
    expect(perceptionAuditCalls.some(entry => entry.action === 'inspection-grounded')).toBe(false)
    expect(perceptionAuditCalls).toContainEqual(expect.objectContaining({
      action: 'perception-context-prepared',
      payload: expect.objectContaining({
        inspectionRequested: false,
      }),
    }))
  })

  it('releases invited inspection carry when the host pivots into a relational turn', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'relational reply' })
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
      title: 'Java interview questions and answers',
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
          toDataURL: () => 'data:image/png;base64,stale-java-browser-first',
        },
      },
    ])

    const firstTurnId = 'turn-relational-pivot-initial-inspection'
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
        content: '帮我看看我屏幕上现在是什么',
      }],
    })
    expect(firstStartResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === firstTurnId)
      expect(finishEvents).toHaveLength(1)
    })

    dbStub.appendAuditLog.mockClear()
    desktopCapturerGetSourcesMock.mockClear()

    const followUpTurnId = 'turn-relational-pivot-follow-up'
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
          content: '帮我看看我屏幕上现在是什么',
        },
        {
          role: 'assistant',
          content: '我在看着。',
        },
        {
          role: 'user',
          content: '你真可爱',
        },
      ],
    })
    expect(followUpStartResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === followUpTurnId)
      expect(finishEvents).toHaveLength(1)
    })

    expect(desktopCapturerGetSourcesMock).not.toHaveBeenCalled()

    const latestUserMessage = [...capturedMessages].reverse().find(message => message.role === 'user')
    expect(typeof latestUserMessage?.content).toBe('string')
    expect(JSON.stringify(latestUserMessage?.content)).not.toContain('stale-java-browser-first')

    const systemText = capturedMessages
      .filter(message => message.role === 'system')
      .map(message => String(message.content ?? ''))
      .join('\n\n')
    expect(systemText).toContain('This is dialogue-first.')
    expect(systemText).not.toContain('Inspection mode: invited-by-user')

    const perceptionAuditCalls = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .filter(entry => entry.category === 'alicization.perception')
    expect(perceptionAuditCalls.some(entry => entry.action === 'inspection-grounded')).toBe(false)
    expect(perceptionAuditCalls).toContainEqual(expect.objectContaining({
      action: 'perception-context-prepared',
      payload: expect.objectContaining({
        inspectionRequested: false,
        inspectionState: 'dialogue-first',
        inspectionCarryReleased: true,
        owner_before: expect.any(String),
        owner_after: expect.any(String),
        screen_mode_before: expect.any(String),
        screen_mode_after: expect.any(String),
        inspection_state_before: expect.any(String),
        inspection_state_after: expect.any(String),
        release_cause: expect.any(String),
        inspectionIntentReasonCodes: expect.arrayContaining([
          'dialogue-pivot-away-from-inspection',
          'grounding-gate:inspection-released',
        ]),
      }),
    }))
  })

  it('forces inspection carry release on identity confirmations that pivot back to Alicization herself', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'identity pivot reply' })
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
      title: 'Runtime diff review',
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
          toDataURL: () => 'data:image/png;base64,identity-pivot-inspection-seed',
        },
      },
    ])

    const firstTurnId = 'turn-identity-pivot-initial-inspection'
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
        content: '帮我看看我屏幕上现在是什么',
      }],
    })
    expect(firstStartResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === firstTurnId)
      expect(finishEvents).toHaveLength(1)
    })

    dbStub.appendAuditLog.mockClear()
    desktopCapturerGetSourcesMock.mockClear()

    const followUpTurnId = 'turn-identity-pivot-follow-up'
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
          content: '帮我看看我屏幕上现在是什么',
        },
        {
          role: 'assistant',
          content: '我在看着。',
        },
        {
          role: 'user',
          content: '没错，这个人就是你，',
        },
      ],
    })
    expect(followUpStartResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === followUpTurnId)
      expect(finishEvents).toHaveLength(1)
    })

    expect(desktopCapturerGetSourcesMock).not.toHaveBeenCalled()

    const systemText = capturedMessages
      .filter(message => message.role === 'system')
      .map(message => String(message.content ?? ''))
      .join('\n\n')
    expect(systemText).toContain('The host is asking about you, your state, or your own continuity.')
    expect(systemText).toContain('This is dialogue-first.')
    expect(systemText).not.toContain('Inspection mode: invited-by-user')

    const perceptionAuditCalls = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .filter(entry => entry.category === 'alicization.perception')
    expect(perceptionAuditCalls.some(entry => entry.action === 'inspection-grounded')).toBe(false)
    expect(perceptionAuditCalls).toContainEqual(expect.objectContaining({
      action: 'perception-context-prepared',
      payload: expect.objectContaining({
        inspectionRequested: false,
        inspectionState: 'dialogue-first',
        inspectionCarryReleased: true,
        owner_before: expect.any(String),
        owner_after: expect.any(String),
        screen_mode_before: expect.any(String),
        screen_mode_after: expect.any(String),
        inspection_state_before: expect.any(String),
        inspection_state_after: expect.any(String),
        release_cause: 'identity-dialogue-pivot',
        inspectionIntentReasonCodes: expect.arrayContaining([
          'identity-dialogue-pivot',
          'dialogue-pivot-away-from-inspection',
          'grounding-gate:inspection-released',
        ]),
      }),
    }))
  })

  it('lets dialogue-first answer complaints reclaim turn ownership before inspection grounding starts', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'plain answer reply' })
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
      title: 'Java interview questions and answers',
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
          toDataURL: () => 'data:image/png;base64,inspection-carry-first',
        },
      },
    ])

    const firstTurnId = 'turn-answer-complaint-initial-inspection'
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
        content: '帮我看看我屏幕上现在是什么',
      }],
    })
    expect(firstStartResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === firstTurnId)
      expect(finishEvents).toHaveLength(1)
    })

    dbStub.appendAuditLog.mockClear()
    desktopCapturerGetSourcesMock.mockClear()

    const followUpTurnId = 'turn-answer-complaint-follow-up'
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
          content: '帮我看看我屏幕上现在是什么',
        },
        {
          role: 'assistant',
          content: '我在看着。',
        },
        {
          role: 'user',
          content: '能不能说人话',
        },
      ],
    })
    expect(followUpStartResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === followUpTurnId)
      expect(finishEvents).toHaveLength(1)
    })

    expect(desktopCapturerGetSourcesMock).not.toHaveBeenCalled()

    const systemText = capturedMessages
      .filter(message => message.role === 'system')
      .map(message => String(message.content ?? ''))
      .join('\n\n')
    expect(systemText).toContain('The host is asking about you, your state, or your own continuity.')
    expect(systemText).toContain('This is dialogue-first.')
    expect(systemText).not.toContain('Inspection mode: invited-by-user')
    expect(systemText).not.toContain('Repair stale or mismatched scene claims before moving on.')

    const perceptionAuditCalls = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .filter(entry => entry.category === 'alicization.perception')
    expect(perceptionAuditCalls.some(entry => entry.action === 'inspection-grounded')).toBe(false)
    expect(perceptionAuditCalls).toContainEqual(expect.objectContaining({
      action: 'perception-context-prepared',
      payload: expect.objectContaining({
        inspectionRequested: false,
        inspectionState: 'dialogue-first',
        inspectionCarryReleased: true,
        inspectionIntentReasonCodes: expect.arrayContaining([
          'grounding-gate:inspection-released',
        ]),
        dialogueFocus: expect.objectContaining({
          subject: 'alicization-self',
          screenReferenceMode: 'avoid',
          shouldBypassScreenRepair: true,
        }),
        dialogueObligation: expect.objectContaining({
          kind: 'answer',
          mustAnswerDirectly: true,
        }),
      }),
    }))
  })

  it('does not let inspection continuity hijack plain greeting turns into task ownership', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'greeting reply' })
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
      title: 'Diff review page',
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
          toDataURL: () => 'data:image/png;base64,greeting-turn-inspection-seed',
        },
      },
    ])

    const firstTurnId = 'turn-greeting-inspection-seed'
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
        content: '帮我看看我屏幕上现在是什么',
      }],
    })
    expect(firstStartResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === firstTurnId)
      expect(finishEvents).toHaveLength(1)
    })

    dbStub.appendAuditLog.mockClear()
    desktopCapturerGetSourcesMock.mockClear()

    const followUpTurnId = 'turn-greeting-after-inspection'
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
          content: '帮我看看我屏幕上现在是什么',
        },
        {
          role: 'assistant',
          content: '我在看着。',
        },
        {
          role: 'user',
          content: '你好呀',
        },
      ],
    })
    expect(followUpStartResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === followUpTurnId)
      expect(finishEvents).toHaveLength(1)
    })

    expect(desktopCapturerGetSourcesMock).not.toHaveBeenCalled()

    const systemText = capturedMessages
      .filter(message => message.role === 'system')
      .map(message => String(message.content ?? ''))
      .join('\n\n')
    expect(systemText).toContain('The host is speaking about the relationship between you two.')
    expect(systemText).toContain('This is dialogue-first.')
    expect(systemText).not.toContain('Inspection mode: invited-by-user')
    expect(systemText).not.toContain('Repair stale or mismatched scene claims before moving on.')
    expect(systemText).not.toContain('Pay off the active knot and move it one step forward.')

    const perceptionAuditCalls = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .filter(entry => entry.category === 'alicization.perception')
    expect(perceptionAuditCalls.some(entry => entry.action === 'inspection-grounded')).toBe(false)
    expect(perceptionAuditCalls).toContainEqual(expect.objectContaining({
      action: 'perception-context-prepared',
      payload: expect.objectContaining({
        inspectionRequested: false,
        inspectionCarryReleased: true,
        inspectionIntentReasonCodes: expect.arrayContaining([
          'dialogue-pivot-away-from-inspection',
        ]),
      }),
    }))
  })

  it('does not let a misclassified repair complaint override the current self turn', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      const systemText = capturedMessages
        .filter(message => message.role === 'system')
        .map(message => String(message.content ?? ''))
        .join('\n\n')

      if (systemText.includes('[ALICIZATION_DIALOGUE_TURN_SEMANTICS]')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            act: 'challenge',
            responseNeed: 'repair',
            truthExpectation: 'normal',
            affectiveTone: 'frustrated',
            taskAnchor: 'general unknown',
            sharedAttentionDemand: 0.31,
            personaSuppression: 0.25,
            confidence: 0.73,
            summary: 'host challenges Alicization intelligence in the ongoing inspection thread',
            reasonTags: ['direct-complaint', 'thread-continuation'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      if (systemText.includes('[ALICIZATION_SUBJECTIVE_INFERENCE]')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            dominantInterpretation: 'The host is frustrated with Alicization herself.',
            situatedMeaning: 'This is a dialogue-first complaint, not a request for scene truth.',
            confidence: 0.78,
            hostIntentCandidates: [{
              goal: 'chat',
              confidence: 0.74,
              why: 'The host is criticizing Alicization rather than asking for a fresh screen read.',
            }],
            relationshipNeedCandidates: [{
              need: 'guidance',
              confidence: 0.52,
              why: 'The host wants Alicization to respond more intelligently.',
            }],
            notes: ['dialogue-first-complaint'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({ type: 'text-delta', text: '先别急着把我当成人机。我刚才那一下确实没有跟上你这轮真正想问的东西。' })
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
      title: 'General unknown',
    }
    await getSensorySnapshot!({ cardId: 'default' })

    const turnId = 'turn-self-complaint-overrides-repair'
    const result = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [
        { role: 'user', content: '你看看我的屏幕，这些课哪个更像网课？' },
        { role: 'assistant', content: '我先守住真实边界：这轮没有足够稳的实时画面根据。' },
        { role: 'user', content: '你怎么跟个人机一样，一点都不智能' },
      ],
    })

    expect(result.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const systemText = capturedMessages
      .filter(message => message.role === 'system')
      .map(message => String(message.content ?? ''))
      .join('\n\n')
    expect(systemText).toContain('The host is asking about you, your state, or your own continuity.')
    expect(systemText).toContain('This is dialogue-first.')
    expect(systemText).not.toContain('Repair stale or mismatched scene claims before moving on.')
    expect(systemText).not.toContain('Current question: general unknown.')

    const perceptionAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.perception' && entry.action === 'perception-context-prepared')
    expect(perceptionAudit?.payload).toEqual(expect.objectContaining({
      dialogueFocus: expect.objectContaining({
        subject: 'alicization-self',
      }),
      visualPresence: expect.objectContaining({
        conversationState: expect.objectContaining({
          owedRepair: null,
          hostMove: '你怎么跟个人机一样，一点都不智能',
        }),
        answerCompiler: expect.objectContaining({
          turnMode: 'answer',
          recommendedAct: 'answer',
        }),
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

  it('carries forward recent grounded residue when inspection capture skips but live focus still matches', async () => {
    const sandboxPath = await createSandboxPath()
    const now = Date.now()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await onEvent?.({ type: 'text-delta', text: 'carry-forward grounded continuity reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    metaStore.set('perception_state_v1', JSON.stringify({
      attentionAnchor: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts - diff',
        anchoredAt: now - 45_000,
        lastObservedAt: now - 15_000,
        reason: 'invited-inspection',
        workloadKind: 'coding',
        confidence: 0.92,
      },
      lastNonSelfForegroundTarget: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts - diff',
        observedAt: now - 15_000,
        source: 'chat-start',
        workloadKind: 'coding',
      },
      recentObservations: [{
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts - diff',
        observedAt: now - 15_000,
        source: 'chat-start',
        workloadKind: 'coding',
      }],
      recentSceneResidue: {
        observedAt: now - 12_000,
        source: 'screen-semantic-summary',
        workloadKind: 'coding',
        contentKind: 'diff',
        summary: 'runtime.ts diff with removed null guard',
        confidence: 0.91,
        focusTarget: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts - diff',
        },
        focusSource: 'attention-anchor',
        captureSourceName: 'runtime.ts - diff',
        captureStrategy: 'window-title',
      },
      updatedAt: now - 12_000,
    }))

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
      title: 'runtime.ts - diff',
    }
    await getSensorySnapshot!({ cardId: 'default' })

    desktopCapturerGetSourcesMock.mockResolvedValueOnce([])

    const turnId = 'turn-residue-grounding-carry-forward'
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
        content: '帮我再看看这个 diff 现在哪里不对',
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
    expect(systemText).toContain('runtime.ts diff with removed null guard')

    const perceptionAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.perception' && entry.action === 'inspection-grounding-skipped')
    expect(perceptionAudit?.payload).toEqual(expect.objectContaining({
      reason: 'screen-capture-sources-empty',
      groundingContinuity: expect.objectContaining({
        groundedThisTurn: true,
        source: 'residue-carry',
      }),
      executiveBrief: expect.objectContaining({
        truthState: 'live-grounded',
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

    expect(systemText).toContain('[ALICIZATION_DIALOGUE_MIND]')
    expect(systemText).toContain('Chat Overlay')
    expect(systemText).toContain('The carried thread still in memory is: GitHub pull request diff view in browser.')
    expect(systemText).toContain('Keep the visible reply within 4 sentences')
    expect(systemText).not.toContain('[ALICIZATION_TURN_CONTROL_COMPACT]')
    expect(systemText).not.toContain('[ALICIZATION_ACTIVE_THOUGHTS]')
    expect(systemText).not.toContain('[ALICIZATION_ASSOCIATIVE_RECALL]')
    expect(dialogueMessages.length).toBeLessThanOrEqual(3)
    expect(visualPresenceState?.currentScene?.summary ?? '').not.toContain('GitHub pull request diff view in browser')
    expect(visualPresenceState?.mindTurnFrame?.world.visibleSurface).toContain('Chat Overlay')
    expect(visualPresenceState?.mindTurnFrame?.world.visibleSurface ?? '').not.toContain('GitHub pull request diff view in browser')
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

  it('accepts chat-start before deferred interactive cognition finishes preparing and later emits governance meta', async () => {
    const sandboxPath = await createSandboxPath()
    let releaseOneShot: ((value: { text?: string, finishReason?: string }) => void) | undefined
    const pendingOneShot = new Promise<{ text?: string, finishReason?: string }>((resolve) => {
      releaseOneShot = resolve
    })
    generateTextMock
      .mockImplementationOnce(async () => await pendingOneShot)
      .mockResolvedValue({
        text: '',
        finishReason: 'stop',
      })
    streamTextMock.mockImplementation(async ({ onEvent }) => {
      await onEvent?.({ type: 'text-delta', text: 'deferred reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(startChat).toBeTypeOf('function')

    let settled = false
    let startResult: Awaited<ReturnType<NonNullable<typeof startChat>>> | null = null
    const pendingStart = startChat!({
      cardId: 'default',
      turnId: 'turn-deferred-accept',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [
        {
          role: 'user',
          content: '看看我现在这个 diff 到底哪里有问题',
        },
      ],
    }).then((result) => {
      settled = true
      startResult = result
      return result
    })

    await vi.waitFor(() => {
      expect(settled).toBe(true)
    })
    expect(startResult).toMatchObject({
      accepted: true,
      state: 'accepted',
      governance: null,
    })
    expect(contextEmitMock.mock.calls.some(([event]) => event === alicizationChatStreamMeta)).toBe(false)

    if (!releaseOneShot)
      throw new Error('expected deferred one-shot resolver')
    releaseOneShot({
      text: '{"act":"ask-help","responseNeed":"guide","truthExpectation":"strict","affectiveTone":"neutral","subjectPreference":"task-knot","sharedAttentionDemand":0.8,"personaSuppression":0.2,"confidence":0.7,"summary":"guide the current task knot","reasonTags":["task-knot"]}',
      finishReason: 'stop',
    })

    await vi.waitFor(() => {
      expect(contextEmitMock.mock.calls.some(([event]) => event === alicizationChatStreamMeta)).toBe(true)
      expect(contextEmitMock.mock.calls.some(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-deferred-accept')).toBe(true)
    })

    await pendingStart
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
    expect(dbStub.appendRelationshipDynamics).toBeCalledWith(expect.objectContaining({
      hostAttitude: '表面克制，但已经开始担心宿主是否又在硬撑',
      previousHostAttitude: '礼貌而克制，保持观察',
      obedienceDelta: -0.03,
      livelinessDelta: -0.01,
      sensibilityDelta: 0.02,
      source: 'dream-llm',
    }))
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
    expect(mainChatSystemText).toContain('[ALICIZATION_DIALOGUE_MIND]')
    expect(mainChatSystemText).toContain('The host is speaking about the relationship between you two.')
    expect(mainChatSystemText).not.toContain('[ALICIZATION_TURN_CONTROL_COMPACT]')
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
    expect(visualPresenceState?.mindTurnFrame?.relation.hostGoal).toBe('resolve-problem')
    expect(visualPresenceState?.mindTurnFrame?.self.mindMode).toBeTruthy()
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
