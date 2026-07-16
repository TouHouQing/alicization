import type {
  AlicizationConversationTurnInput,
} from '../../../shared/eventa'

import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  alicizationProviderResponseFormat,
  resolveAlicizationChatFailureSurface,
} from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

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
  electronAlicizationAppendExecutionEvents,
  electronAlicizationBootstrap,
  electronAlicizationChatAbort,
  electronAlicizationChatStart,
  electronAlicizationClearAllConversations,
  electronAlicizationDeleteAllData,
  electronAlicizationDeleteCardScope,
  electronAlicizationDispatchTaskThread,
  electronAlicizationGetOrganicMemorySnapshot,
  electronAlicizationGetSelfEvolutionState,
  electronAlicizationGetSensorySnapshot,
  electronAlicizationGetSoul,
  electronAlicizationGetVisualPresenceState,
  electronAlicizationInitializeGenesis,
  electronAlicizationKillSwitchResume,
  electronAlicizationKillSwitchSuspend,
  electronAlicizationListChannelCapabilityManifests,
  electronAlicizationListExecutionEvents,
  electronAlicizationListExecutorSessions,
  electronAlicizationListLearningArtifactLedger,
  electronAlicizationListMemoryDecisionTraces,
  electronAlicizationListMindTurnEvents,
  electronAlicizationListPersonStateUpdates,
  electronAlicizationLlmSyncConfig,
  electronAlicizationMemoryUpsertFacts,
  electronAlicizationPlanTaskThread,
  electronAlicizationReminderSchedule,
  electronAlicizationReportProactiveFeedback,
  electronAlicizationRunReplayBenchmark,
  electronAlicizationSearchOrganicSubconsciousFragments,
  electronAlicizationSetActiveSession,
  electronAlicizationSetPerformanceManifest,
  electronAlicizationSubconsciousForceDream,
  electronAlicizationSubconsciousForceTick,
  electronAlicizationUpdatePersonality,
  electronAlicizationUpdateSoul,
  electronAlicizationUpsertChannelCapabilityManifest,
  electronAlicizationUpsertExecutorSession,
  electronAlicizationUpsertTaskThread,
  electronAlicizationVisualPresenceStateChanged,
} from '../../../shared/eventa'
import { buildAlicizationChatMetaSignature } from './main-chat-stream-meta'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { setAlicizationCardKillSwitchState, setAlicizationKillSwitchState } from './state'

const invokeHandlers = new Map<unknown, (payload?: any, options?: any) => Promise<any>>()
const sandboxDirs: string[] = []
const runtimeModulePath = join(process.cwd(), 'apps/stage-tamagotchi/src/main/services/alicization/runtime.ts')
const contextEmitMock = vi.fn()
const metaStore = new Map<string, string>()
const streamTextMock = vi.fn()
const generateTextMock = vi.fn()
const directIpcHandlers = new Map<string, (event: any, payload?: any) => Promise<any> | any>()
const listWebContentsMock = vi.fn<() => any[]>(() => [])
const desktopCapturerGetSourcesMock = vi.fn<() => Promise<any[]>>(async () => [])
const systemPreferencesGetMediaAccessStatusMock = vi.fn(() => 'granted')
const localBrowserAutomationOverrides: {
  clickElement?: (input: any) => Promise<any>
  clickDesktopElement?: (input: any) => Promise<any>
  listDesktopInteractables?: (input: any) => Promise<any>
  navigateBrowser?: (input: any) => Promise<any>
  openApplication?: (input: any) => Promise<any>
  pressDesktopKeys?: (input: any) => Promise<any>
  readPage?: (input: any) => Promise<any>
  scrollBrowser?: (input: any) => Promise<any>
  waitForBrowser?: (input: any) => Promise<any>
  waitForDesktop?: (input: any) => Promise<any>
} = {}

function buildMindHeadMetaKey(cardId: string, key: string) {
  return `mind-head:${cardId}:${key}`
}

const screenCaptureDiagnosticsBySenderId = new Map<number, any>()
const getScreenCaptureDiagnosticsForWebContentsIdMock = vi.fn((webContentsId: number) => screenCaptureDiagnosticsBySenderId.get(webContentsId) ?? null)
const appBeforeQuitHandlers: Array<() => Promise<void> | void> = []
let sensoryCpuUsage = 12
let foregroundWindowSample: { appName?: string, processName?: string, title?: string } | undefined

function findAlicizationProviderFact(systemTexts: string[], type: string) {
  return systemTexts
    .map((text) => {
      try {
        const parsed = JSON.parse(text) as { data?: unknown, type?: unknown }
        return parsed.type === type && parsed.data && typeof parsed.data === 'object'
          ? parsed as { data: Record<string, any>, type: string }
          : null
      }
      catch {
        return null
      }
    })
    .find(Boolean) ?? null
}

function findAlicizationProviderFactInSystemText(systemText: string, type: string) {
  return findAlicizationProviderFact(
    systemText.split(/\n+/u).map(text => text.trim()).filter(Boolean),
    type,
  )
}

function expectExecutionRoutingFact(systemTexts: string[], requiredToolName: string) {
  const fact = findAlicizationProviderFact(systemTexts, 'alicization-execution-routing')
  expect(fact?.data.requiredToolNames).toContain(requiredToolName)
  expect(systemTexts.join('\n')).not.toMatch(
    /\[ALICIZATION_EXECUTION_ROUTING_GUARD\]|Detected explicit execution request|Before writing any natural-language answer|MUST call/iu,
  )
}

function expectExecutionCapabilityFact(systemTexts: string[], focusedChannels: string[]) {
  const fact = findAlicizationProviderFact(systemTexts, 'alicization-execution-capabilities')
  expect(fact?.data.capabilityQuestion).toBe(true)
  expect(fact?.data.focusedChannels).toEqual(focusedChannels)
  expect(systemTexts.join('\n')).not.toMatch(
    /\[ALICIZATION_EXECUTION_CAPABILITIES\]|Capability query focus:|Never collapse multi-channel|Answer each focused channel separately|call executor_capability_snapshot first/iu,
  )
}

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
  applyMemoryFactCorrections: vi.fn().mockResolvedValue(undefined),
  listMemoryFacts: vi.fn().mockResolvedValue([]),
  appendRelationshipOutcomes: vi.fn().mockResolvedValue(undefined),
  appendEpisodicEvents: vi.fn().mockResolvedValue(undefined),
  appendPersonaReinforcementEvents: vi.fn().mockResolvedValue(undefined),
  appendPersonStateEvolutionEntries: vi.fn().mockResolvedValue(undefined),
  upsertMemoryReflections: vi.fn().mockResolvedValue(undefined),
  retrieveMemoryFacts: vi.fn().mockResolvedValue([]),
  searchMemoryConsolidations: vi.fn().mockResolvedValue([]),
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
  listRecentEpisodicEvents: vi.fn().mockResolvedValue([]),
  listMemoryConsolidations: vi.fn().mockResolvedValue([]),
  countSubconsciousFragments: vi.fn().mockResolvedValue(0),
  appendRelationshipDynamics: vi.fn().mockResolvedValue(undefined),
  getLatestRelationshipDynamics: vi.fn().mockResolvedValue(null),
  listRelationshipOutcomes: vi.fn().mockResolvedValue([]),
  listMemoryReflections: vi.fn().mockResolvedValue([]),
  listPersonaReinforcementEvents: vi.fn().mockResolvedValue([]),
  summarizePersonStateEvolution: vi.fn().mockResolvedValue({
    trustShift: 0,
    closenessShift: 0,
    repairShift: 0,
    autonomyShift: 0,
    burdenShift: 0,
    executionTrustShift: 0,
    relationshipDoctrineShift: 0,
    latestDoctrine: null,
    latestBurdenLine: null,
    latestTrustMeaning: null,
    latestDominantRung: null,
    recentSummaries: [],
    explanation: [],
    updatedAt: null,
  }),
  searchEpisodicEvents: vi.fn().mockResolvedValue([]),
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
  insertLearningTask: vi.fn().mockImplementation(async (input: any) => ({
    id: `learning-row:${input.taskId}`,
    cardId: input.cardId,
    taskId: input.taskId,
    status: 'scheduled',
    triggerAt: input.triggerAt,
    action: input.action,
    message: input.message,
    payload: input.payload,
    attemptCount: 0,
    maxAttempts: input.maxAttempts ?? 3,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    claimedAt: null,
    startedAt: null,
    completedAt: null,
    blockedAt: null,
    cancelledAt: null,
    downgradedAt: null,
    reopenedAt: null,
    nextRetryAt: null,
    sourceTurnId: input.payload?.sourceTurnId ?? null,
    resultSummary: null,
    failureKind: null,
    lastError: null,
    firedTurnId: null,
  })),
  claimDueLearningTasks: vi.fn().mockResolvedValue([]),
  startLearningTask: vi.fn().mockResolvedValue(undefined),
  blockLearningTask: vi.fn().mockResolvedValue(undefined),
  completeLearningTask: vi.fn().mockResolvedValue(undefined),
  failLearningTask: vi.fn().mockResolvedValue(undefined),
  reopenLearningTask: vi.fn().mockResolvedValue(undefined),
  downgradeLearningTask: vi.fn().mockResolvedValue(undefined),
  cancelLearningTask: vi.fn().mockResolvedValue(undefined),
  listLearningTasks: vi.fn().mockResolvedValue([]),
  getLatestLearningExecutionState: vi.fn().mockResolvedValue(null),
  getJournalMode: vi.fn().mockResolvedValue('wal'),
  getLatestConversationSessionId: vi.fn().mockResolvedValue(undefined),
  listConversationTurnsSince: vi.fn().mockResolvedValue([]),
  listConversationTurnsBySession: vi.fn().mockResolvedValue([]),
  appendMindTurnEvents: vi.fn().mockResolvedValue(undefined),
  listMindTurnEvents: vi.fn().mockResolvedValue([]),
  getTaskThread: vi.fn().mockResolvedValue(undefined),
  upsertTaskThread: vi.fn().mockImplementation(async (input: any) => ({
    id: input.id ?? 'thread-test-1',
    decisionTraceId: input.decisionTraceId ?? null,
    turnId: input.turnId ?? null,
    sessionId: input.sessionId ?? null,
    origin: input.origin ?? 'user-turn',
    goal: input.goal,
    kind: input.kind,
    status: input.status,
    selectedChannel: input.selectedChannel ?? null,
    proposedChannel: input.proposedChannel ?? null,
    summary: input.summary ?? null,
    metadata: input.metadata ?? null,
    createdAt: input.createdAt ?? Date.now(),
    updatedAt: input.updatedAt ?? Date.now(),
    lastEventAt: input.lastEventAt ?? null,
    completedAt: input.completedAt ?? null,
  })),
  listTaskThreads: vi.fn().mockResolvedValue([]),
  upsertChannelCapabilityManifest: vi.fn().mockImplementation(async (input: any) => ({
    channel: input.channel,
    available: input.available !== false,
    enabled: input.enabled !== false,
    ready: input.ready !== false,
    sessionAffinity: input.sessionAffinity === true,
    reason: input.reason ?? null,
    metadata: input.metadata ?? null,
    createdAt: input.createdAt ?? Date.now(),
    updatedAt: input.updatedAt ?? Date.now(),
    lastCheckedAt: input.lastCheckedAt ?? Date.now(),
  })),
  listChannelCapabilityManifests: vi.fn().mockResolvedValue([]),
  upsertExecutorSession: vi.fn().mockImplementation(async (input: any) => ({
    id: input.id ?? 'executor-session-test-1',
    channel: input.channel,
    affinityKey: input.affinityKey,
    externalSessionId: input.externalSessionId ?? null,
    status: input.status ?? 'active',
    summary: input.summary ?? null,
    metadata: input.metadata ?? null,
    createdAt: input.createdAt ?? Date.now(),
    updatedAt: input.updatedAt ?? Date.now(),
    lastUsedAt: input.lastUsedAt ?? Date.now(),
  })),
  listExecutorSessions: vi.fn().mockResolvedValue([]),
  appendExecutionEvents: vi.fn().mockResolvedValue(undefined),
  listExecutionEvents: vi.fn().mockResolvedValue([]),
  clearConversationData: vi.fn().mockResolvedValue(undefined),
  readMindHead: vi.fn(async (cardId: string, key: string) => {
    const raw = metaStore.get(buildMindHeadMetaKey(cardId, key))
    if (!raw)
      return null
    return JSON.parse(raw)
  }),
  upsertMindHead: vi.fn(async (cardId: string, key: string, value: unknown) => {
    metaStore.set(buildMindHeadMetaKey(cardId, key), JSON.stringify(value ?? null))
  }),
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

vi.mock('@proj-alicization/electron-screen-capture/main', () => ({
  getScreenCaptureDiagnosticsForWebContentsId: getScreenCaptureDiagnosticsForWebContentsIdMock,
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

vi.mock('./local-browser-automation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./local-browser-automation')>()

  return {
    ...actual,
    createAlicizationLocalBrowserAutomationService: (...args: Parameters<typeof actual.createAlicizationLocalBrowserAutomationService>) => {
      const service = actual.createAlicizationLocalBrowserAutomationService(...args)
      return {
        ...service,
        clickElement: (input: any) => localBrowserAutomationOverrides.clickElement
          ? localBrowserAutomationOverrides.clickElement(input)
          : service.clickElement(input),
        clickDesktopElement: (input: any) => localBrowserAutomationOverrides.clickDesktopElement
          ? localBrowserAutomationOverrides.clickDesktopElement(input)
          : service.clickDesktopElement(input),
        openApplication: (input: any) => localBrowserAutomationOverrides.openApplication
          ? localBrowserAutomationOverrides.openApplication(input)
          : service.openApplication(input),
        navigateBrowser: (input: any) => localBrowserAutomationOverrides.navigateBrowser
          ? localBrowserAutomationOverrides.navigateBrowser(input)
          : service.navigateBrowser(input),
        pressDesktopKeys: (input: any) => localBrowserAutomationOverrides.pressDesktopKeys
          ? localBrowserAutomationOverrides.pressDesktopKeys(input)
          : service.pressDesktopKeys(input),
        readPage: (input: any) => localBrowserAutomationOverrides.readPage
          ? localBrowserAutomationOverrides.readPage(input)
          : service.readPage(input),
        scrollBrowser: (input: any) => localBrowserAutomationOverrides.scrollBrowser
          ? localBrowserAutomationOverrides.scrollBrowser(input)
          : service.scrollBrowser(input),
        waitForBrowser: (input: any) => localBrowserAutomationOverrides.waitForBrowser
          ? localBrowserAutomationOverrides.waitForBrowser(input)
          : service.waitForBrowser(input),
        waitForDesktop: (input: any) => localBrowserAutomationOverrides.waitForDesktop
          ? localBrowserAutomationOverrides.waitForDesktop(input)
          : service.waitForDesktop(input),
        listDesktopInteractables: (input: any) => localBrowserAutomationOverrides.listDesktopInteractables
          ? localBrowserAutomationOverrides.listDesktopInteractables(input)
          : service.listDesktopInteractables(input),
      }
    },
  }
})

vi.mock('@proj-alicization/i18n/locales', () => ({
  default: {},
}))

const { setupAlicizationRuntime, runtimeTestInternals } = await import('./runtime')

async function createSandboxPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-runtime-test-'))
  sandboxDirs.push(dir)
  return dir
}

async function runAppBeforeQuitHandlers() {
  while (appBeforeQuitHandlers.length > 0) {
    const handler = appBeforeQuitHandlers.pop()
    if (!handler)
      continue
    await handler()
  }
}

function getDialogueRespondedEvents() {
  return contextEmitMock.mock.calls
    .filter(([event]) => event === alicizationDialogueResponded)
    .map(([, payload]) => payload)
}

function mockGenerateTextFromStreamText() {
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
}

function buildRuntimeMindTurnReply({
  reply,
  thought = 'runtime test provider response',
  emotion = 'thinking',
  performance = {
    baseEmotion: 'thinking',
    facialCue: 'soft-gaze',
    actionCue: 'idle_settle',
    delivery: 'calm',
    emphasis: 0,
  },
}: {
  reply: string
  thought?: string
  emotion?: string
  performance?: Record<string, unknown>
}) {
  const providerPerformance = {
    baseEmotion: performance.baseEmotion ?? emotion,
    facialCue: performance.facialCue ?? null,
    actionCue: performance.actionCue ?? null,
    delivery: performance.delivery ?? 'calm',
    emphasis: performance.emphasis ?? 0,
  }

  return {
    format: 'mind-turn-v1',
    thought,
    emotion,
    reply,
    performance: providerPerformance,
    memoryUsage: {
      workingMemoryVersion: 'working-memory-owner-context-v1',
      longTermEvidenceIds: [],
    },
  }
}

async function emitRuntimeTestReply({
  messages,
  onEvent,
  reply,
  thought,
}: {
  messages?: Array<{ role?: string, content?: unknown }>
  onEvent?: (event: any) => Promise<void> | void
  reply: string
  thought?: string
}) {
  const systemText = Array.isArray(messages)
    ? messages
        .filter(message => message.role === 'system')
        .map(message => String(message.content ?? ''))
        .join('\n\n')
    : ''
  const latestUserText = Array.isArray(messages)
    ? String([...messages].reverse().find(message => message.role === 'user')?.content ?? '')
    : ''

  if (systemText.includes('You classify a screen snapshot for Alicization proactive policy.')) {
    await onEvent?.({
      type: 'text-delta',
      text: JSON.stringify({
        workload: 'browser',
        content: 'page',
        summary: 'runtime test observed screen',
        confidence: 0.86,
        matchedLabels: ['screen', 'runtime-test'],
      }),
    })
    await onEvent?.({ type: 'finish', finishReason: 'stop' })
    return
  }

  if (systemText.includes('[ALICIZATION_SUBJECTIVE_INFERENCE]')) {
    await onEvent?.({
      type: 'text-delta',
      text: JSON.stringify({
        dominantInterpretation: 'The host invited a bounded screen inspection in this runtime test.',
        situatedMeaning: 'Treat this as grounded inspection context only until the host pivots away.',
        selfQuestion: 'Should inspection carry stay active or be released on the next turn?',
        hostIntentCandidates: [{
          goal: 'inspect-screen',
          confidence: 0.82,
          why: 'The user explicitly asked what is on screen.',
        }],
        relationshipNeedCandidates: [{
          need: 'truth-boundary',
          confidence: 0.78,
          why: 'The screen claim should stay grounded and release when dialogue pivots.',
        }],
        confidence: 0.82,
        notes: ['invited-inspection', 'runtime-test'],
      }),
    })
    await onEvent?.({ type: 'finish', finishReason: 'stop' })
    return
  }

  const visibleReply = /屏幕|界面|看看/.test(latestUserText)
    ? '我现在看到的是一个 Google Chrome 页面，标题像是 Java interview questions and answers；这是这轮新画面，不是旧记忆。'
    : reply
  const visibleThought = /屏幕|界面|看看/.test(latestUserText)
    ? 'runtime test grounded screen response'
    : thought

  await onEvent?.({
    type: 'text-delta',
    text: JSON.stringify(buildRuntimeMindTurnReply({
      reply: visibleReply,
      thought: visibleThought,
    })),
  })
  await onEvent?.({ type: 'finish', finishReason: 'stop' })
}

async function waitForChatFinishEvent(turnId: string) {
  await vi.waitFor(() => {
    const finishEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => isContextEvent(event, alicizationChatStreamFinish) && payload.turnId === turnId)
    if (finishEvents.length === 0) {
      const relatedEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) =>
          payload?.turnId === turnId
          || (typeof event === 'string' && event.includes('alicization')),
        )
        .map(([event, payload]) => ({
          event,
          turnId: payload?.turnId,
          status: payload?.status,
          error: payload?.error,
          text: payload?.text,
        }))
      throw new Error(JSON.stringify({
        turnId,
        relatedEvents,
        streamTextCalls: streamTextMock.mock.calls.length,
      }, null, 2))
    }
    expect(finishEvents).toHaveLength(1)
  })
}

function isContextEvent(event: unknown, expected: unknown) {
  return event === expected
    || (typeof event === 'object'
      && event !== null
      && typeof expected === 'object'
      && expected !== null
      && 'name' in event
      && 'name' in expected
      && (event as { name?: unknown }).name === (expected as { name?: unknown }).name)
}

function getChatEventPayloads<T = any>(expected: unknown, turnId?: string): T[] {
  return contextEmitMock.mock.calls
    .filter(([event, payload]) =>
      isContextEvent(event, expected)
      && (turnId === undefined || payload.turnId === turnId),
    )
    .map(([, payload]) => payload)
}

async function waitForChatToolCallEvent(turnId: string) {
  await vi.waitFor(() => {
    expect(getChatEventPayloads(alicizationChatStreamToolCall, turnId).length).toBeGreaterThan(0)
  })
}

describe('alicization runtime project-state audit helpers', () => {
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

  it('hydrates sender-specific screen capture diagnostics into sensory snapshots', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSensorySnapshot = invokeHandlers.get(electronAlicizationGetSensorySnapshot)
    expect(getSensorySnapshot).toBeTypeOf('function')

    screenCaptureDiagnosticsBySenderId.set(91, {
      updatedAt: 1_300,
      window: {
        id: 3,
        title: 'Alicization Chat Overlay',
      },
      permissionStatus: 'granted',
      renderer: {
        updatedAt: 1_250,
        sessionState: {
          phase: 'active',
          reason: 'selected-source',
          selectedSourceId: 'screen:1',
          currentSourceId: 'screen:1',
          sourcePreference: 'manual',
          lastUsedAt: 1_240,
          lastError: null,
        },
      },
      main: {
        getSources: {
          inFlight: false,
          requestedAt: 1_000,
          completedAt: 1_050,
          durationMs: 50,
          options: {
            types: ['screen'],
          },
          sourceCount: 2,
          error: null,
        },
        lease: {
          status: 'leased',
          handle: 'lease-1',
          sourceId: 'screen:1',
          ownerWindowId: 3,
          ownerWebContentsId: 91,
          acquiredAt: 1_120,
          expiresAt: 6_120,
          timeoutMs: 5_000,
          options: {
            types: ['screen'],
          },
          releasedAt: null,
          releaseReason: null,
        },
      },
    })

    const snapshot = await getSensorySnapshot!(
      { cardId: 'default' },
      {
        raw: {
          ipcMainEvent: {
            sender: {
              id: 91,
            },
          },
        },
      },
    )

    expect(getScreenCaptureDiagnosticsForWebContentsIdMock).toHaveBeenCalledWith(91)
    expect(snapshot.capture).toMatchObject({
      health: 'healthy',
      permission: 'granted',
      sessionPhase: 'active',
      sessionReason: 'selected-source',
      selectedSourceId: 'screen:1',
      currentSourceId: 'screen:1',
      sourcePreference: 'manual',
      sourceCount: 2,
      leaseStatus: 'leased',
      leaseSourceId: 'screen:1',
      degradedReasons: [],
    })
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

  it('recreates default SOUL.md after the card directory is removed before a fresh bootstrap', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSoul = invokeHandlers.get(electronAlicizationGetSoul)
    expect(getSoul).toBeTypeOf('function')

    const defaultCardDir = join(sandboxPath, 'alicizations', 'cards', 'default')
    const defaultSoulPath = join(defaultCardDir, 'SOUL.md')

    expect(existsSync(defaultSoulPath)).toBe(true)

    await rm(defaultCardDir, {
      recursive: true,
      force: true,
      maxRetries: 4,
      retryDelay: 50,
    })

    expect(existsSync(defaultSoulPath)).toBe(false)

    await runAppBeforeQuitHandlers()

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const resetSoul = await getSoul!({ cardId: 'default' })
    expect(resetSoul.soulPath).toBe(defaultSoulPath)
    expect(existsSync(defaultSoulPath)).toBe(true)
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

  it('canonicalizes origin-lost reminder-family runtime turns before persistence so they do not drift into user-turn dialogue world state', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    const getVisualPresenceState = invokeHandlers.get(electronAlicizationGetVisualPresenceState)
    expect(appendConversationTurn).toBeTypeOf('function')
    expect(getVisualPresenceState).toBeTypeOf('function')

    const initialVisualPresenceState = await getVisualPresenceState!({ cardId: 'default' })
    expect(initialVisualPresenceState.dialogueWorldThread ?? null).toBeNull()

    dbStub.appendConversationTurn.mockClear()

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'reminder:default:task-originless-family:123',
      sessionId: 'session-originless-family-reminder',
      assistantText: '提醒你：轻微延迟提醒',
      structured: {
        thought: '按要求执行提醒：轻微延迟提醒',
        emotion: 'tired',
        reply: '提醒你：轻微延迟提醒',
        format: 'subconscious-reminder-v1',
      },
      createdAt: Date.now(),
    })

    const persistedTurn = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    expect(persistedTurn?.origin).toBe('subconscious-proactive')

    const emittedReminderEvent = getDialogueRespondedEvents()
      .find(event => event.turnId === 'reminder:default:task-originless-family:123')
    expect(emittedReminderEvent?.origin).toBe('subconscious-proactive')

    const visualPresenceState = await getVisualPresenceState!({ cardId: 'default' })
    expect(visualPresenceState.dialogueWorldThread ?? null).toBeNull()
  })

  it('canonicalizes origin-lost execution-callback runtime turns before persistence so callback carry does not drift into user-turn dialogue world state', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    const getVisualPresenceState = invokeHandlers.get(electronAlicizationGetVisualPresenceState)
    expect(appendConversationTurn).toBeTypeOf('function')
    expect(getVisualPresenceState).toBeTypeOf('function')

    const initialVisualPresenceState = await getVisualPresenceState!({ cardId: 'default' })
    expect(initialVisualPresenceState.dialogueWorldThread ?? null).toBeNull()

    dbStub.appendConversationTurn.mockClear()

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'execution-callback:default:thread-originless-family:456',
      sessionId: 'session-originless-family-callback',
      assistantText: '刚才那个 CLI 任务已经跑完了，输出是 callback runtime ok。',
      structured: {
        thought: 'callback delivery for settled cli thread',
        emotion: 'thinking',
        reply: '刚才那个 CLI 任务已经跑完了，输出是 callback runtime ok。',
        format: 'subconscious-proactive-v1',
        proactive: {
          scenario: 'coding',
          urgency: 'medium',
          style: 'silent-observe',
          reasonCodes: ['learning:verify'],
          feedbackWindowMs: 120_000,
        },
      },
      createdAt: Date.now(),
    })

    const persistedTurn = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0] as AlicizationConversationTurnInput | undefined
    expect(persistedTurn?.origin).toBe('subconscious-proactive')

    const emittedCallbackEvent = getDialogueRespondedEvents()
      .find(event => event.turnId === 'execution-callback:default:thread-originless-family:456')
    expect(emittedCallbackEvent?.origin).toBe('subconscious-proactive')

    const visualPresenceState = await getVisualPresenceState!({ cardId: 'default' })
    expect(visualPresenceState.dialogueWorldThread ?? null).toBeNull()
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

  it('appends async memory upsert trace into replayable mind-turn events', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const upsertMemoryFacts = invokeHandlers.get(electronAlicizationMemoryUpsertFacts)
    expect(upsertMemoryFacts).toBeTypeOf('function')

    dbStub.upsertMemoryFacts.mockClear()
    dbStub.appendMindTurnEvents.mockClear()

    await upsertMemoryFacts!({
      cardId: 'default',
      facts: [{
        subject: 'user',
        predicate: 'plan',
        object: '明天继续完善 Alicization 心智链路',
        confidence: 0.82,
      }],
      source: 'async-llm',
      trace: {
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-memory-upsert-1',
        sessionId: 'session-memory-upsert',
        origin: 'user-turn',
        trigger: 'batch',
        batchSize: 3,
        extractedCount: 5,
        batchPriority: {
          max: 260,
          min: 120,
          avg: 190,
        },
      },
    })

    expect(dbStub.upsertMemoryFacts).toBeCalledWith([
      expect.objectContaining({
        subject: 'user',
        predicate: 'plan',
        object: '明天继续完善 Alicization 心智链路',
        confidence: 0.82,
        knowledgeStage: 'working-understanding',
        validationStatus: 'unverified',
        sourceLabel: 'async-memory-extraction',
      }),
    ], 'async-llm')
    const appendedFragments = dbStub.appendSubconsciousFragments.mock.calls.flatMap(call => call[0] ?? [])
    expect(appendedFragments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceKind: 'fact-ledger',
      }),
    ]))
    expect(
      appendedFragments.some((item: any) => item.sourceKind === 'fact-ledger' && typeof item.text === 'string' && item.text.includes('fact_predicate:plan')),
    ).toBe(true)
    expect(dbStub.appendMindTurnEvents).toBeCalledTimes(1)

    const appendedEvents = dbStub.appendMindTurnEvents.mock.calls.at(-1)?.[0] as Array<{
      decisionTraceId?: string
      kind?: string
      turnId?: string | null
      sessionId?: string | null
      origin?: string
      payload?: Record<string, unknown> | null
    }> | undefined
    expect(appendedEvents?.[0]).toEqual(expect.objectContaining({
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      turnId: 'turn-memory-upsert-1',
      sessionId: 'session-memory-upsert',
      origin: 'user-turn',
      kind: 'memory-facts-upserted',
      payload: expect.objectContaining({
        source: 'async-llm',
        trigger: 'batch',
        factInputCount: 1,
        extractedCount: 5,
        batchSize: 3,
        batchPriority: {
          max: 260,
          min: 120,
          avg: 190,
        },
      }),
    }))
  })

  it('canonicalizes proactive async memory upsert trace origins before writing replayable mind-turn events', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const upsertMemoryFacts = invokeHandlers.get(electronAlicizationMemoryUpsertFacts)
    expect(upsertMemoryFacts).toBeTypeOf('function')

    dbStub.upsertMemoryFacts.mockClear()
    dbStub.appendMindTurnEvents.mockClear()

    await upsertMemoryFacts!({
      cardId: 'default',
      facts: [{
        subject: 'assistant',
        predicate: 'continuity',
        object: '刚才那条主动提醒线还要继续被记住',
        confidence: 0.79,
      }],
      source: 'async-llm',
      trace: {
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-memory-upsert-proactive',
        sessionId: 'session-memory-upsert-proactive',
        origin: ' SubConscious-Proactive ',
        trigger: 'idle',
      },
    } as any)

    expect(dbStub.appendMindTurnEvents).toBeCalledTimes(1)
    const appendedEvents = dbStub.appendMindTurnEvents.mock.calls.at(-1)?.[0] as Array<{
      decisionTraceId?: string
      kind?: string
      turnId?: string | null
      sessionId?: string | null
      origin?: string
      payload?: Record<string, unknown> | null
    }> | undefined

    expect(appendedEvents?.[0]).toEqual(expect.objectContaining({
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      turnId: 'turn-memory-upsert-proactive',
      sessionId: 'session-memory-upsert-proactive',
      origin: 'subconscious-proactive',
      kind: 'memory-facts-upserted',
      payload: expect.objectContaining({
        source: 'async-llm',
        trigger: 'idle',
        factInputCount: 1,
      }),
    }))
  })

  it('keeps subconscious fact-ledger origin tags when async memory upsert trace loses origin but the turn id still carries autonomous ownership', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const upsertMemoryFacts = invokeHandlers.get(electronAlicizationMemoryUpsertFacts)
    expect(upsertMemoryFacts).toBeTypeOf('function')

    dbStub.upsertMemoryFacts.mockClear()
    dbStub.appendSubconsciousFragments.mockClear()

    await upsertMemoryFacts!({
      cardId: 'default',
      facts: [{
        subject: 'assistant',
        predicate: 'followup',
        object: '继续沿着同一条主动生命线收口，不要把这条记忆退成普通对话事实',
        confidence: 0.91,
      }],
      source: 'async-llm',
      trace: {
        decisionTraceId: 'mind:l9f3lq:factoriginless',
        turnId: 'subconscious:fact-upsert-proactive',
        sessionId: 'session-memory-upsert-proactive',
        trigger: 'idle',
      },
    } as any)

    const appendedFragments = dbStub.appendSubconsciousFragments.mock.calls.flatMap(call => call[0] ?? [])
    expect(appendedFragments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceKind: 'fact-ledger',
      }),
    ]))
    expect(
      appendedFragments.some((item: any) =>
        item.sourceKind === 'fact-ledger'
        && typeof item.text === 'string'
        && item.text.includes('fact_predicate:followup')
        && item.text.includes('fact_origin:subconscious-proactive')
        && item.text.includes('fact_trigger:idle'),
      ),
    ).toBe(true)
  })
  it('applies correction writeback when new async knowledge supersedes an older conflicting fact', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const upsertMemoryFacts = invokeHandlers.get(electronAlicizationMemoryUpsertFacts)
    expect(upsertMemoryFacts).toBeTypeOf('function')

    dbStub.listMemoryFacts.mockResolvedValueOnce([
      {
        id: 'fact-old-runtime-style',
        subject: 'assistant',
        predicate: 'procedure',
        object: 'report the runtime result immediately in the same style',
        confidence: 0.74,
        source: 'async-llm',
        dedupeKey: 'assistant|procedure|report the runtime result immediately in the same style',
        createdAt: 1,
        updatedAt: 1,
        lastAccessAt: null,
        accessCount: 1,
        knowledgeStage: 'working-understanding',
        validationStatus: 'provisional',
        sourceLabel: 'async-memory-extraction',
        conflictsWith: [],
        supersedes: [],
      },
    ])

    await upsertMemoryFacts!({
      cardId: 'default',
      facts: [{
        subject: 'assistant',
        predicate: 'procedure',
        object: 'wait for a fresher opening before reporting that runtime result style again',
        confidence: 0.84,
      }],
      source: 'async-llm',
      trace: {
        decisionTraceId: 'mind:correction:test',
        turnId: 'turn-memory-correction-1',
        sessionId: 'session-memory-correction',
        origin: 'user-turn',
        trigger: 'batch',
      },
    })

    expect(dbStub.applyMemoryFactCorrections).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        targetFactId: 'fact-old-runtime-style',
        nextValidationStatus: 'superseded',
      }),
    ]))
  })

  it('still writes fact-ledger fragments for async facts without decision trace', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const upsertMemoryFacts = invokeHandlers.get(electronAlicizationMemoryUpsertFacts)
    expect(upsertMemoryFacts).toBeTypeOf('function')

    dbStub.appendSubconsciousFragments.mockClear()
    dbStub.appendMindTurnEvents.mockClear()

    await upsertMemoryFacts!({
      cardId: 'default',
      facts: [{
        subject: 'user',
        predicate: 'plan',
        object: '周五做发布前回归',
        confidence: 0.77,
      }],
      source: 'async-llm',
      trace: {
        turnId: 'turn-memory-upsert-no-trace',
        origin: 'user-turn',
        trigger: 'idle',
      },
    })

    const appendedFragments = dbStub.appendSubconsciousFragments.mock.calls.flatMap(call => call[0] ?? [])
    expect(appendedFragments.some((item: any) => item.sourceKind === 'fact-ledger')).toBe(true)
    expect(dbStub.appendMindTurnEvents).not.toBeCalled()
  })

  it('lists replayable mind-turn events through invoke handler', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const listMindTurnEvents = invokeHandlers.get(electronAlicizationListMindTurnEvents)
    expect(listMindTurnEvents).toBeTypeOf('function')

    dbStub.listMindTurnEvents.mockResolvedValue([
      {
        id: 'evt-1',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: {
          turnMode: 'guide-current-knot',
        },
        createdAt: Date.now(),
      },
    ])

    const result = await listMindTurnEvents!({
      cardId: 'default',
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      activeThreadId: 'thread-1',
      limit: 20,
    })

    expect(dbStub.listMindTurnEvents).toBeCalledWith({
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      turnId: undefined,
      activeThreadId: 'thread-1',
      limit: 20,
    })
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'evt-1',
        kind: 'governance-normalized',
      }),
    ]))
  })

  it('returns the authoritative self-evolution runtime snapshot through invoke handler', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const getSelfEvolutionState = invokeHandlers.get(electronAlicizationGetSelfEvolutionState)
    expect(getSelfEvolutionState).toBeTypeOf('function')

    const result = await getSelfEvolutionState!({
      cardId: 'default',
    })

    expect(result).toEqual(expect.objectContaining({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: null,
      candidates: [],
      baselineAdoptionHistory: [],
      reasonCodes: ['self-evolution:no-active-version'],
    }))
  })

  it('lists memory decision traces through invoke handler filtered by active self-evolution candidate id', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const listMemoryDecisionTraces = invokeHandlers.get(electronAlicizationListMemoryDecisionTraces)
    expect(listMemoryDecisionTraces).toBeTypeOf('function')

    dbStub.listMindTurnEvents.mockResolvedValue([
      {
        id: 'evt-1',
        decisionTraceId: 'mind:candidate:trace-1',
        turnId: 'turn-candidate-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: {
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 100,
            activeSelfRevision: {
              candidateId: 'candidate-active',
              patchId: 'patch-active',
              patchDecisionTraceId: 'mind:candidate:trace-1',
              lanes: ['memory-policy'],
              reasonCodes: ['domain:self-model'],
              summary: 'candidate trace',
            },
            summary: 'source=main-runtime | self_revision=patch-active',
          },
        },
        createdAt: 100,
      },
    ])

    const result = await listMemoryDecisionTraces!({
      cardId: 'default',
      activeSelfEvolutionCandidateId: 'candidate-active',
      limit: 20,
    } as any)

    expect(dbStub.listMindTurnEvents).toBeCalledWith({
      decisionTraceId: undefined,
      turnId: undefined,
      activeThreadId: undefined,
      activeSelfEvolutionCandidateId: 'candidate-active',
      limit: 160,
    })
    expect(result).toEqual([
      expect.objectContaining({
        decisionTraceId: 'mind:candidate:trace-1',
      }),
    ])
  })

  it('lists durable learning artifact ledger records through invoke handler', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const listLearningArtifactLedger = invokeHandlers.get(electronAlicizationListLearningArtifactLedger)
    expect(listLearningArtifactLedger).toBeTypeOf('function')

    dbStub.listMindTurnEvents.mockResolvedValue([
      {
        id: 'evt-learning-1',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'system',
        kind: 'learning-executed',
        payload: {
          taskId: 'task-1',
          action: 'verify',
          domain: 'world-model',
          verificationBasis: ['trusted-source'],
          verifiedArtifact: {
            version: 'verified-learning-artifact-v1',
            artifactId: 'artifact-1',
            taskId: 'task-1',
            action: 'verify',
            domain: 'world-model',
            verifier: {
              kind: 'world-model-verifier',
              mayVerify: true,
              mayInternalize: false,
              mayValidateOnly: true,
              rollbackRequired: false,
              blockedReasons: [],
            },
            status: 'verified',
            producedAt: 100,
            claimGraph: {
              version: 'claim-evidence-graph-v1',
              producedAt: 100,
              claimId: 'claim-runtime-1',
              claim: 'runtime seam is stable',
              domain: 'world-model',
              supportingEvidence: [],
              contradictingEvidence: [],
              supersededBy: [],
              currentBelief: 'runtime seam is stable',
              validationState: 'validated',
              sourceTrust: 0.9,
              lastRevalidatedAt: 100,
              revalidationPolicy: {
                shouldRevalidate: false,
                nextRevalidationAt: null,
                expiredSourceIds: [],
                reasonTags: [],
              },
              internalizationDecision: {
                mayInternalize: true,
                mayValidateOnly: false,
                blockedReasons: [],
              },
            },
            verificationBasis: ['trusted-source'],
            supportingFactIds: ['fact-runtime-1'],
            contradictionFactIds: [],
            internalizationStage: 'validated-knowledge',
            reason: 'verified',
          },
        },
        createdAt: 100,
      },
      {
        id: 'evt-learning-2',
        decisionTraceId: 'mind:l9f3lq:othertrace',
        turnId: 'turn-2',
        sessionId: 'session-1',
        origin: 'system',
        kind: 'learning-executed',
        payload: {
          taskId: 'task-2',
          action: 'verify',
          domain: 'world-model',
          verifiedArtifact: {
            version: 'verified-learning-artifact-v1',
            artifactId: 'artifact-2',
            taskId: 'task-2',
            action: 'verify',
            domain: 'world-model',
            verifier: {
              kind: 'world-model-verifier',
              mayVerify: true,
              mayInternalize: false,
              mayValidateOnly: true,
              rollbackRequired: false,
              blockedReasons: [],
            },
            status: 'verified',
            producedAt: 110,
            claimGraph: {
              version: 'claim-evidence-graph-v1',
              producedAt: 110,
              claimId: 'claim-runtime-2',
              claim: 'other claim',
              domain: 'world-model',
              supportingEvidence: [],
              contradictingEvidence: [],
              supersededBy: [],
              currentBelief: 'other claim',
              validationState: 'validated',
              sourceTrust: 0.8,
              lastRevalidatedAt: 110,
              revalidationPolicy: {
                shouldRevalidate: false,
                nextRevalidationAt: null,
                expiredSourceIds: [],
                reasonTags: [],
              },
              internalizationDecision: {
                mayInternalize: true,
                mayValidateOnly: false,
                blockedReasons: [],
              },
            },
            verificationBasis: [],
            supportingFactIds: ['fact-runtime-2'],
            contradictionFactIds: [],
            internalizationStage: 'validated-knowledge',
            reason: 'verified',
          },
        },
        createdAt: 110,
      },
    ])

    const result = await listLearningArtifactLedger!({
      cardId: 'default',
      claimId: 'claim-runtime-1',
      limit: 20,
    })

    expect(dbStub.listMindTurnEvents).toBeCalledWith({
      decisionTraceId: undefined,
      turnId: undefined,
      kind: 'learning-executed',
      limit: 160,
    })
    expect(result).toEqual([
      expect.objectContaining({
        taskId: 'task-1',
        artifactId: 'artifact-1',
        claimId: 'claim-runtime-1',
        sourceFactIds: ['fact-runtime-1'],
      }),
    ])
  })

  it('lists structured memory decision traces through invoke handler', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const listMemoryDecisionTraces = invokeHandlers.get(electronAlicizationListMemoryDecisionTraces)
    expect(listMemoryDecisionTraces).toBeTypeOf('function')

    dbStub.listMindTurnEvents.mockResolvedValue([
      {
        id: 'evt-1',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: {
          turnMode: 'guide-current-knot',
          truthState: 'remembered',
          digitalLifeSpine: {
            runtime: {
              activeThreadId: 'thread-runtime',
            },
          },
        },
        createdAt: 100,
      },
      {
        id: 'evt-2',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'recall-attribution',
        payload: {
          shouldRecall: true,
          whyNow: 'The remembered runtime seam still matters here.',
          searchTrace: {
            firstHop: {
              focus: 'procedure',
              summary: 'Start from the remembered runtime procedure.',
              targetIds: ['procedure-runtime'],
            },
            secondHop: {
              action: 'expand-procedure',
              evidenceGap: 'need-relationship-meaning',
              summary: 'Expand toward the relationship meaning that made the procedure safe.',
              targetIds: ['bundle-runtime'],
            },
            thirdHop: {
              ambiguityPosture: 'settled',
              summary: 'The remembered seam is stable enough to carry.',
            },
          },
          followUpAffordance: {
            summary: 'Carry the runtime seam after the current payoff.',
            whyNow: 'The seam is relevant, but should wait until the live answer lands.',
            intrusionRisk: 'medium',
            payoffDependency: 'requires-current-payoff',
            preferredTiming: 'after-payoff',
          },
        },
        createdAt: 110,
      },
      {
        id: 'evt-2b',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'memory-deliberation-judged',
        payload: {
          shouldRecall: true,
          whyWithheld: 'Only the stable remembered core should surface; unstable remembered detail stays inward.',
          restraint: {
            surfaceMode: 'stable-core-only',
            shouldOnlySurfaceStableCore: true,
            shouldDelayUntilAfterPayoff: true,
          },
          personState: {
            activeClosenessContext: 'repair-window',
            activeClosenessRung: 'measured-room',
            relationshipPosture: 'restrained',
          },
        },
        createdAt: 111,
      },
      {
        id: 'evt-2c',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'memory-followup-deferred',
        payload: {
          preferredTiming: 'after-payoff',
          payoffDependency: 'requires-current-payoff',
        },
        createdAt: 112,
      },
      {
        id: 'evt-2d',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'memory-wrong-thread-suppressed',
        payload: {
          evidenceGap: 'need-disambiguation',
          conflictSeverity: 'high',
        },
        createdAt: 113,
      },
      {
        id: 'evt-3',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'reply-memory-coherence',
        payload: {
          coherenceState: 'inward-only',
        },
        createdAt: 120,
      },
    ])

    const result = await listMemoryDecisionTraces!({
      cardId: 'default',
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      activeThreadId: 'thread-runtime',
      limit: 10,
    })

    expect(dbStub.listMindTurnEvents).toBeCalledWith({
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      turnId: undefined,
      activeThreadId: 'thread-runtime',
      limit: 80,
    })
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        activeThreadId: 'thread-runtime',
        eventKinds: expect.arrayContaining([
          'governance-normalized',
          'recall-attribution',
          'memory-deliberation-judged',
          'memory-followup-deferred',
          'memory-wrong-thread-suppressed',
          'reply-memory-coherence',
        ]),
        recallAttribution: expect.objectContaining({
          whyNow: 'The remembered runtime seam still matters here.',
          followUpAffordance: expect.objectContaining({
            preferredTiming: 'after-payoff',
          }),
        }),
        memoryDeliberationJudged: expect.objectContaining({
          whyWithheld: expect.stringContaining('stable remembered core'),
          restraint: expect.objectContaining({
            surfaceMode: 'stable-core-only',
            shouldOnlySurfaceStableCore: true,
          }),
          personState: expect.objectContaining({
            activeClosenessContext: 'repair-window',
          }),
        }),
        memoryFollowUpDeferred: expect.objectContaining({
          preferredTiming: 'after-payoff',
          payoffDependency: 'requires-current-payoff',
        }),
        memoryWrongThreadSuppressed: expect.objectContaining({
          evidenceGap: 'need-disambiguation',
          conflictSeverity: 'high',
        }),
        replyMemoryCoherence: expect.objectContaining({
          coherenceState: 'inward-only',
        }),
      }),
    ]))
  })

  it('lists replayable person-state updates through invoke handler', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const listPersonStateUpdates = invokeHandlers.get(electronAlicizationListPersonStateUpdates)
    expect(listPersonStateUpdates).toBeTypeOf('function')

    dbStub.listMindTurnEvents.mockResolvedValue([
      {
        id: 'evt-person-state-1',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'person-state-updated',
        payload: {
          version: 'person-state-update-surface-v1',
          updatedAt: 150,
          summary: 'Recent outcomes nudged trust upward.',
          dominantContexts: ['focused-work', 'general'],
          relationshipShift: {
            trustDelta: 0.12,
            closenessDelta: -0.02,
            burdenDelta: 0.05,
            boundaryDelta: -0.03,
            repairDelta: 0.04,
          },
          reinforcementBias: {
            'autonomy-respect': 0.08,
          },
          preferenceHints: ['Lighter touch, more room, less interruption pressure.'],
          sensitivityHints: ['Pressure and over-close timing become intrusive quickly.'],
          repairHints: ['When the seam is off, repair before continuing.'],
          burdenHints: ['Focused work gets overloaded quickly by extra conversational pressure.'],
          narrative: ['execution callback landed during focused work'],
          sourceTrail: [{
            kind: 'relationship-outcome',
            sourceKind: 'execution',
            summary: 'The callback was useful, but it still needed lighter interruption pressure while the host stayed focused.',
            createdAt: 149,
          }],
          sourceKinds: ['execution'],
          sourceCounts: {
            relationshipOutcomes: 1,
            reinforcementEvents: 1,
            episodicEvents: 1,
            reflections: 0,
            memoryFacts: 0,
          },
        },
        createdAt: 149,
      },
    ])

    const result = await listPersonStateUpdates!({
      cardId: 'default',
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      limit: 12,
    })

    expect(dbStub.listMindTurnEvents).toBeCalledWith({
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      turnId: undefined,
      limit: 72,
    })
    expect(result).toEqual([
      expect.objectContaining({
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        summary: 'Recent outcomes nudged trust upward.',
        dominantContexts: expect.arrayContaining(['focused-work']),
        sourceKinds: ['execution'],
        sourceCounts: expect.objectContaining({
          relationshipOutcomes: 1,
          reinforcementEvents: 1,
        }),
      }),
    ])
  })

  it('runs the default replay benchmark through invoke handler and persists telemetry patch', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const runReplayBenchmark = invokeHandlers.get(electronAlicizationRunReplayBenchmark)
    expect(runReplayBenchmark).toBeTypeOf('function')

    const result = await runReplayBenchmark!({
      cardId: 'default',
      packId: 'default-humanlike-memory-v1',
      persistTelemetry: true,
    })

    expect(result).toEqual(expect.objectContaining({
      packId: 'default-humanlike-memory-v1',
      turnCount: expect.any(Number),
      quality: expect.any(Array),
      standards: expect.objectContaining({
        templateLeakage: expect.any(String),
      }),
      gate: expect.objectContaining({
        passed: expect.any(Boolean),
        dimensions: expect.any(Array),
      }),
      telemetryPatch: expect.objectContaining({
        retrievalHealth: expect.objectContaining({
          templateLeakageFailCount: expect.any(Number),
        }),
      }),
      telemetryPersisted: true,
      failingTurnSet: expect.any(Array),
      datasetFeedback: expect.objectContaining({
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: expect.any(Number),
        totalCount: expect.any(Number),
        persisted: expect.any(Boolean),
      }),
    }))
    expect(dbStub.overrideMemoryStats).toBeCalledWith(expect.objectContaining({
      retrievalHealth: expect.objectContaining({
        templateLeakageFailCount: expect.any(Number),
      }),
    }))
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.memory-benchmark',
      action: 'replay-benchmark-ran',
    }))
  }, 15_000)
  it('runs the backlog replay benchmark directly from replay benchmark dataset backlog', async () => {
    const sandboxPath = await createSandboxPath()
    metaStore.set('replay_benchmark_dataset_backlog_v1', JSON.stringify([
      {
        id: 'backlog-runtime-1',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-backlog-runtime-1',
        userText: '不是那条线，是另一条',
        failingDimensions: ['wrongThreadSuppression'],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-backlog-runtime-1',
          decisionTraceId: 'mind:backlog:runtime-1',
          sessionId: 'session-backlog-runtime',
          activeThreadId: 'thread-backlog-runtime',
        },
        sampledCategories: ['wrong-thread', 'stable-core'],
        replayTurn: {
          turnId: 'turn-backlog-runtime-1',
          userText: '不是那条线，是另一条',
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-backlog-runtime-1',
            decisionTraceId: 'mind:backlog:runtime-1',
            sessionId: 'session-backlog-runtime',
            activeThreadId: 'thread-backlog-runtime',
          },
          sampledCategories: ['wrong-thread', 'stable-core'],
          organicMemoryContext: {
            hostAttitude: '',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'answer-anchoring',
              placement: 'after-payoff',
              certainty: 'approximate',
              rationale: 'The wrong thread lure still has to stay suppressed.',
              confidence: 0.8,
            },
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: [],
              selectedConsolidationIds: [],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: [],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: [],
              ambiguityPosture: 'ambiguous',
              selectedEras: [],
              selectedPeriods: [],
              selectedEpisodes: [],
              conflictSeverity: 'high',
              conflictVariants: [{
                id: 'cluster:runtime-nearby',
                summary: 'A nearby thread cluster still competes for recall.',
                provenance: 'reconstructed',
                reason: 'Need to suppress the wrong thread lure.',
              }],
              stableCore: ['只保稳定核心。'],
              unsafeDetails: ['不要把错线程说成真。'],
              selectedProcedures: [],
              selectedBundles: [],
              selectedChains: [],
              surfacePolicy: 'answer-anchoring',
              confidence: 0.8,
              whyNow: '这轮需要抑制错线程。',
              inwardLine: '先把错线程压住。',
              visibleLine: '我先只用稳定那部分。',
              followUpAffordance: {
                summary: '等 payoff 落地后再展开记忆。',
                whyNow: '当前 payoff 还要先落地。',
                intrusionRisk: 'medium',
                payoffDependency: 'requires-current-payoff',
                preferredTiming: 'after-payoff',
              },
            },
          },
        },
        createdAt: Date.now() - 10_000,
      },
    ]))
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const runReplayBenchmark = invokeHandlers.get(electronAlicizationRunReplayBenchmark)
    expect(runReplayBenchmark).toBeTypeOf('function')

    const result = await runReplayBenchmark!({
      cardId: 'default',
      packId: 'backlog-humanlike-memory-v1',
      sampleLimit: 1,
      persistTelemetry: true,
    })

    expect(dbStub.listConversationTurnsSince).not.toBeCalled()
    expect(dbStub.listMindTurnEvents).toBeCalled()
    expect(result).toEqual(expect.objectContaining({
      packId: 'backlog-humanlike-memory-v1',
      turnCount: 1,
      quality: expect.any(Array),
      failingTurnSet: expect.any(Array),
      datasetFeedback: expect.objectContaining({
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
      }),
    }))
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.memory-benchmark',
      action: 'replay-benchmark-ran',
      payload: expect.objectContaining({
        packId: 'backlog-humanlike-memory-v1',
      }),
    }))
  })

  it('upserts task threads through invoke handler', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const upsertTaskThread = invokeHandlers.get(electronAlicizationUpsertTaskThread)
    expect(upsertTaskThread).toBeTypeOf('function')

    dbStub.upsertTaskThread.mockResolvedValue({
      id: 'thread-claw-1',
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      turnId: 'turn-1',
      sessionId: 'session-1',
      origin: 'user-turn',
      goal: 'Trace the current runtime fault.',
      kind: 'codebase-investigation',
      status: 'planned',
      selectedChannel: null,
      proposedChannel: 'codex',
      summary: 'initial routed plan',
      metadata: {
        source: 'claw-fabric',
      },
      createdAt: 100,
      updatedAt: 120,
      lastEventAt: null,
      completedAt: null,
    })

    const result = await upsertTaskThread!({
      cardId: 'default',
      id: 'thread-claw-1',
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      turnId: 'turn-1',
      sessionId: 'session-1',
      origin: 'user-turn',
      goal: 'Trace the current runtime fault.',
      kind: 'codebase-investigation',
      status: 'planned',
      proposedChannel: 'codex',
      summary: 'initial routed plan',
      metadata: {
        source: 'claw-fabric',
      },
    })

    expect(dbStub.upsertTaskThread).toBeCalledWith(expect.objectContaining({
      id: 'thread-claw-1',
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      kind: 'codebase-investigation',
      proposedChannel: 'codex',
    }))
    expect(result).toEqual(expect.objectContaining({
      id: 'thread-claw-1',
      status: 'planned',
      proposedChannel: 'codex',
    }))
  })

  it('upserts and lists executor sessions through invoke handlers', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const upsertExecutorSession = invokeHandlers.get(electronAlicizationUpsertExecutorSession)
    const listExecutorSessions = invokeHandlers.get(electronAlicizationListExecutorSessions)
    expect(upsertExecutorSession).toBeTypeOf('function')
    expect(listExecutorSessions).toBeTypeOf('function')

    dbStub.upsertExecutorSession.mockResolvedValue({
      id: 'executor-session-1',
      channel: 'codex',
      affinityKey: 'session-1',
      externalSessionId: null,
      status: 'active',
      summary: 'Codex session warmed up.',
      metadata: {
        source: 'runtime-test',
      },
      createdAt: 100,
      updatedAt: 120,
      lastUsedAt: 120,
    })

    const upserted = await upsertExecutorSession!({
      cardId: 'default',
      channel: 'codex',
      affinityKey: 'session-1',
      status: 'active',
      summary: 'Codex session warmed up.',
      metadata: {
        source: 'runtime-test',
      },
    })

    expect(dbStub.upsertExecutorSession).toBeCalledWith(expect.objectContaining({
      channel: 'codex',
      affinityKey: 'session-1',
      status: 'active',
    }))
    expect(upserted).toEqual(expect.objectContaining({
      id: 'executor-session-1',
      channel: 'codex',
      status: 'active',
    }))

    dbStub.listExecutorSessions.mockResolvedValue([upserted])
    const rows = await listExecutorSessions!({
      cardId: 'default',
      channel: 'codex',
      limit: 20,
    })

    expect(dbStub.listExecutorSessions).toBeCalledWith({
      channel: 'codex',
      affinityKey: undefined,
      status: undefined,
      limit: 20,
    })
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'executor-session-1',
        channel: 'codex',
      }),
    ]))
  })

  it('upserts and lists channel capability manifests through invoke handlers', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const upsertCapabilityManifest = invokeHandlers.get(electronAlicizationUpsertChannelCapabilityManifest)
    const listCapabilityManifests = invokeHandlers.get(electronAlicizationListChannelCapabilityManifests)
    expect(upsertCapabilityManifest).toBeTypeOf('function')
    expect(listCapabilityManifests).toBeTypeOf('function')

    dbStub.upsertChannelCapabilityManifest.mockResolvedValue({
      channel: 'codex',
      available: true,
      enabled: true,
      ready: true,
      sessionAffinity: true,
      reason: null,
      metadata: {
        source: 'runtime-test',
      },
      createdAt: 100,
      updatedAt: 120,
      lastCheckedAt: 120,
    })

    const upserted = await upsertCapabilityManifest!({
      cardId: 'default',
      channel: 'codex',
      available: true,
      enabled: true,
      ready: true,
      sessionAffinity: true,
      metadata: {
        source: 'runtime-test',
      },
    })

    expect(dbStub.upsertChannelCapabilityManifest).toBeCalledWith(expect.objectContaining({
      channel: 'codex',
      available: true,
      enabled: true,
      ready: true,
      sessionAffinity: true,
    }))
    expect(upserted).toEqual(expect.objectContaining({
      channel: 'codex',
      ready: true,
      sessionAffinity: true,
    }))

    dbStub.listChannelCapabilityManifests.mockResolvedValue([upserted])
    const rows = await listCapabilityManifests!({
      cardId: 'default',
      channel: 'codex',
      available: true,
      limit: 20,
    })

    expect(dbStub.listChannelCapabilityManifests).toBeCalledWith({
      channel: 'codex',
      available: true,
      enabled: undefined,
      ready: undefined,
      limit: 20,
    })
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channel: 'codex',
        available: true,
        ready: true,
      }),
    ]))
  })

  it('plans task threads through the runtime governor before persistence', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const planTaskThread = invokeHandlers.get(electronAlicizationPlanTaskThread)
    expect(planTaskThread).toBeTypeOf('function')

    const result = await planTaskThread!({
      cardId: 'default',
      threadId: 'thread-plan-1',
      trace: {
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
      },
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the current runtime regression.',
        origin: 'user',
        effect: 'mutate',
        prefersPersistentSession: true,
      },
      capabilities: [
        {
          channel: 'codex',
          available: true,
          enabled: true,
          ready: true,
          sessionAffinity: true,
        },
        {
          channel: 'claude-code',
          available: true,
          enabled: true,
          ready: true,
          sessionAffinity: true,
        },
        {
          channel: 'cli',
          available: true,
          enabled: true,
          ready: true,
        },
      ],
    })

    expect(dbStub.upsertTaskThread).toBeCalledWith(expect.objectContaining({
      id: 'thread-plan-1',
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      status: 'planned',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
    }))
    expect(dbStub.appendExecutionEvents).toBeCalledWith([
      expect.objectContaining({
        threadId: 'thread-plan-1',
        kind: 'plan',
        threadStatus: 'planned',
        channel: 'codex',
      }),
    ])
    expect(result).toEqual(expect.objectContaining({
      createdEventKinds: ['plan'],
      plan: expect.objectContaining({
        state: 'routed',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
      }),
      thread: expect.objectContaining({
        id: 'thread-plan-1',
        status: 'planned',
      }),
    }))
  })

  it('injects remembered procedures into task-thread planning experience before persistence', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const planTaskThread = invokeHandlers.get(electronAlicizationPlanTaskThread)
    expect(planTaskThread).toBeTypeOf('function')

    dbStub.searchMemoryConsolidations.mockResolvedValueOnce([
      {
        id: 'procedural:runtime-seam',
        kind: 'procedural',
        facet: null,
        periodKey: 'runtime seam repair',
        periodStartedAt: 100,
        periodEndedAt: 120,
        summary: 'Use Claude Code first for the patch, then verify before branching.',
        lesson: 'Verify before branching.',
        cues: ['patch', 'verify', 'runtime seam'],
        confidence: 0.92,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-1'],
        updatedAt: 120,
      },
    ])

    await planTaskThread!({
      cardId: 'default',
      threadId: 'thread-plan-procedural-1',
      trace: {
        decisionTraceId: 'mind:l9f3lq:procedural',
        turnId: 'turn-procedural-1',
        sessionId: 'session-procedural-1',
        origin: 'user-turn',
      },
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the runtime continuity seam and verify it.',
        origin: 'user',
        effect: 'mutate',
        prefersPersistentSession: true,
      },
      capabilities: [
        {
          channel: 'codex',
          available: true,
          enabled: true,
          ready: true,
          sessionAffinity: true,
        },
        {
          channel: 'claude-code',
          available: true,
          enabled: true,
          ready: true,
          sessionAffinity: true,
        },
      ],
    })

    expect(dbStub.searchMemoryConsolidations).toBeCalledWith(expect.objectContaining({
      query: 'Patch the runtime continuity seam and verify it.',
      recollectionIntent: expect.objectContaining({
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
      }),
    }))
    expect(dbStub.upsertTaskThread).toBeCalledWith(expect.objectContaining({
      id: 'thread-plan-procedural-1',
      metadata: expect.objectContaining({
        fabric: expect.objectContaining({
          experience: expect.objectContaining({
            rememberedProcedures: expect.arrayContaining([
              expect.objectContaining({
                id: 'procedural:runtime-seam',
                preferredChannel: 'claude-code',
              }),
            ]),
          }),
        }),
      }),
    }))
  })

  it('biases remembered procedures by host-specific work-context preference during planning', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const planTaskThread = invokeHandlers.get(electronAlicizationPlanTaskThread)
    expect(planTaskThread).toBeTypeOf('function')

    dbStub.listRecentEpisodicEvents.mockResolvedValueOnce([
      {
        id: 'episode-focused-work',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-focused-work',
        sessionId: 'session-focused-work',
        sourceKind: 'execution-result',
        provenance: 'observed',
        occurredAt: Date.now() - 60_000,
        whereSummary: 'runtime debugging window',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'Focused work windows usually need space first, then precise follow-up.',
        felt: 'careful',
        emotionTags: ['focused'],
        whatChanged: 'Pressure drops when callbacks stay lighter.',
        relationshipMeaning: 'Staying near without crowding keeps the host receptive during focused work.',
        lesson: 'During focused work, verify first and keep interruption pressure low.',
        sourceSummary: 'execution result feedback',
        confidence: 0.9,
        salience: 0.88,
        sceneAttachment: 0.42,
        consolidationPriority: 0.84,
        relationshipShift: {
          closenessDelta: 0.04,
          trustDelta: 0.08,
          burdenDelta: -0.06,
          boundaryDelta: 0.04,
          misreadDelta: -0.04,
          repairDelta: 0.06,
          openLoopDelta: 0.02,
        },
        derivedFrom: [],
        tags: ['focused-work', 'procedure-learning', 'host-prefers-lighter-callback'],
        createdAt: Date.now() - 60_000,
        updatedAt: Date.now() - 55_000,
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
        latestReconsolidation: null,
      },
    ])
    dbStub.getLatestRelationshipDynamics.mockResolvedValueOnce({
      hostAttitude: '礼貌而克制，保持观察',
      previousHostAttitude: '礼貌而克制，保持观察',
      obedienceDelta: 0,
      livelinessDelta: 0,
      sensibilityDelta: 0.08,
      source: 'test',
      createdAt: Date.now() - 30_000,
    })
    dbStub.searchMemoryConsolidations.mockResolvedValueOnce([
      {
        id: 'procedural:focused-runtime',
        kind: 'procedural',
        facet: null,
        periodKey: 'focused runtime repair',
        periodStartedAt: 100,
        periodEndedAt: 120,
        summary: 'Use Claude Code first, then verify quietly before reporting the runtime seam.',
        lesson: 'Verify before reporting and keep interruption pressure low during focused work.',
        cues: ['focused-work', 'verify', 'quiet', 'runtime seam'],
        confidence: 0.88,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-focused-1'],
        updatedAt: 120,
      },
      {
        id: 'procedural:direct-runtime',
        kind: 'procedural',
        facet: null,
        periodKey: 'direct runtime repair',
        periodStartedAt: 100,
        periodEndedAt: 118,
        summary: 'Report the runtime result directly as soon as it finishes.',
        lesson: 'Report immediately once the patch lands.',
        cues: ['direct', 'report immediately'],
        confidence: 0.9,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-focused-2'],
        updatedAt: 118,
      },
    ])

    await planTaskThread!({
      cardId: 'default',
      threadId: 'thread-plan-host-pref-1',
      trace: {
        decisionTraceId: 'mind:l9f3lq:host-procedure',
        turnId: 'turn-host-procedure-1',
        sessionId: 'session-host-procedure-1',
        origin: 'user-turn',
      },
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the runtime seam, verify it, and keep the callback light while I am focused.',
        origin: 'user',
        effect: 'mutate',
        prefersPersistentSession: true,
      },
      capabilities: [
        {
          channel: 'claude-code',
          available: true,
          enabled: true,
          ready: true,
          sessionAffinity: true,
        },
        {
          channel: 'codex',
          available: true,
          enabled: true,
          ready: true,
          sessionAffinity: true,
        },
      ],
    })

    expect(dbStub.searchMemoryConsolidations).toBeCalledWith(expect.objectContaining({
      query: expect.stringContaining('Focused work windows usually need space first'),
    }))
    expect(dbStub.upsertTaskThread).toBeCalledWith(expect.objectContaining({
      id: 'thread-plan-host-pref-1',
      metadata: expect.objectContaining({
        fabric: expect.objectContaining({
          experience: expect.objectContaining({
            rememberedProcedures: expect.arrayContaining([
              expect.objectContaining({
                id: 'procedural:focused-runtime',
                preferredChannelReason: expect.stringContaining('host-context-biased'),
              }),
            ]),
          }),
        }),
      }),
    }))
  })

  it('builds autobiographical procedure traces from recent execution history during planning', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const planTaskThread = invokeHandlers.get(electronAlicizationPlanTaskThread)
    expect(planTaskThread).toBeTypeOf('function')

    dbStub.listTaskThreads.mockResolvedValueOnce([
      {
        id: 'thread-history-runtime',
        decisionTraceId: 'mind:l9f3lq:thread-history',
        turnId: 'turn-history-runtime',
        sessionId: 'session-history-runtime',
        origin: 'user-turn',
        goal: 'Patch the runtime continuity seam and verify it.',
        kind: 'codebase-edit',
        status: 'completed',
        selectedChannel: 'claude-code',
        proposedChannel: 'claude-code',
        summary: 'patched the runtime seam and verified the callback before reporting back',
        metadata: null,
        createdAt: 100,
        updatedAt: 180,
        lastEventAt: 180,
        completedAt: 180,
      },
    ])
    dbStub.listExecutionEvents.mockResolvedValueOnce([
      {
        id: 'event-plan-runtime',
        threadId: 'thread-history-runtime',
        decisionTraceId: 'mind:l9f3lq:thread-history',
        turnId: 'turn-history-runtime',
        sessionId: 'session-history-runtime',
        origin: 'user-turn',
        channel: 'claude-code',
        kind: 'dispatch',
        threadStatus: 'running',
        payload: {
          summary: 'Used Claude Code to patch the runtime seam first.',
        },
        createdAt: 140,
      },
      {
        id: 'event-result-runtime',
        threadId: 'thread-history-runtime',
        decisionTraceId: 'mind:l9f3lq:thread-history',
        turnId: 'turn-history-runtime',
        sessionId: 'session-history-runtime',
        origin: 'user-turn',
        channel: 'claude-code',
        kind: 'result',
        threadStatus: 'completed',
        payload: {
          summary: 'Verified the callback after patching and only then reported the result.',
        },
        createdAt: 180,
      },
    ])
    dbStub.searchMemoryConsolidations.mockResolvedValueOnce([])

    await planTaskThread!({
      cardId: 'default',
      threadId: 'thread-plan-trace-1',
      trace: {
        decisionTraceId: 'mind:l9f3lq:trace-procedure',
        turnId: 'turn-trace-procedure-1',
        sessionId: 'session-trace-procedure-1',
        origin: 'user-turn',
      },
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the runtime continuity seam and verify it.',
        origin: 'user',
        effect: 'mutate',
        prefersPersistentSession: true,
      },
      capabilities: [
        {
          channel: 'claude-code',
          available: true,
          enabled: true,
          ready: true,
          sessionAffinity: true,
        },
        {
          channel: 'codex',
          available: true,
          enabled: true,
          ready: true,
          sessionAffinity: true,
        },
      ],
    })

    expect(dbStub.upsertTaskThread).toBeCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        fabric: expect.objectContaining({
          experience: expect.objectContaining({
            rememberedProcedures: expect.arrayContaining([
              expect.objectContaining({
                id: 'execution-trace:thread-history-runtime',
                sourceKind: 'autobiographical',
                preferredChannel: 'claude-code',
                result: expect.stringContaining('Verified the callback'),
                steps: expect.arrayContaining([
                  expect.stringContaining('Used Claude Code'),
                ]),
                traceSummary: expect.stringContaining('steps:'),
              }),
            ]),
          }),
        }),
      }),
    }))
  })

  it('falls back to persisted capability manifests when plan payload omits capabilities', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const planTaskThread = invokeHandlers.get(electronAlicizationPlanTaskThread)
    expect(planTaskThread).toBeTypeOf('function')

    dbStub.listChannelCapabilityManifests.mockResolvedValue([
      {
        channel: 'codex',
        available: true,
        enabled: true,
        ready: true,
        sessionAffinity: true,
        reason: null,
        metadata: null,
        createdAt: 100,
        updatedAt: 120,
        lastCheckedAt: 120,
      },
      {
        channel: 'cli',
        available: true,
        enabled: true,
        ready: true,
        sessionAffinity: false,
        reason: null,
        metadata: null,
        createdAt: 100,
        updatedAt: 110,
        lastCheckedAt: 110,
      },
    ])

    const result = await planTaskThread!({
      cardId: 'default',
      threadId: 'thread-plan-fallback-1',
      trace: {
        decisionTraceId: 'mind:l9f3lq:fallback',
        turnId: 'turn-fallback-1',
        sessionId: 'session-fallback-1',
        origin: 'user-turn',
      },
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the current runtime regression.',
        origin: 'user',
        effect: 'mutate',
        prefersPersistentSession: true,
      },
    })

    expect(dbStub.listChannelCapabilityManifests).toBeCalledWith({
      limit: 64,
    })
    expect(dbStub.upsertTaskThread).toBeCalledWith(expect.objectContaining({
      id: 'thread-plan-fallback-1',
      status: 'planned',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
    }))
    expect(result.plan).toEqual(expect.objectContaining({
      state: 'routed',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
    }))
  })

  it('blocks task-thread planning when the card kill switch is suspended', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })
    setAlicizationCardKillSwitchState('default', 'SUSPENDED', 'test-card-block')

    const planTaskThread = invokeHandlers.get(electronAlicizationPlanTaskThread)
    expect(planTaskThread).toBeTypeOf('function')

    const result = await planTaskThread!({
      cardId: 'default',
      threadId: 'thread-plan-blocked-card',
      task: {
        kind: 'run-command',
        goal: 'Run the local test suite.',
        origin: 'user',
        effect: 'mutate',
      },
      capabilities: [{
        channel: 'cli',
        available: true,
        enabled: true,
        ready: true,
      }],
    })

    expect(dbStub.upsertTaskThread).toBeCalledWith(expect.objectContaining({
      id: 'thread-plan-blocked-card',
      status: 'blocked',
      selectedChannel: null,
      proposedChannel: null,
    }))
    expect(dbStub.appendExecutionEvents).toBeCalledWith([
      expect.objectContaining({
        threadId: 'thread-plan-blocked-card',
        kind: 'plan',
        threadStatus: 'blocked',
        payload: expect.objectContaining({
          blockedReasonCodes: expect.arrayContaining(['kill-switch-suspended']),
        }),
      }),
    ])
    expect(result.plan).toEqual(expect.objectContaining({
      state: 'blocked',
      blockedReasonCodes: expect.arrayContaining(['kill-switch-suspended']),
    }))
  })

  it('blocks task-thread planning when the global kill switch is suspended', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })
    setAlicizationKillSwitchState('SUSPENDED', 'test-global-block')

    const planTaskThread = invokeHandlers.get(electronAlicizationPlanTaskThread)
    expect(planTaskThread).toBeTypeOf('function')

    const result = await planTaskThread!({
      cardId: 'default',
      threadId: 'thread-plan-blocked-global',
      task: {
        kind: 'run-command',
        goal: 'Run the local test suite.',
        origin: 'user',
        effect: 'mutate',
      },
      capabilities: [{
        channel: 'cli',
        available: true,
        enabled: true,
        ready: true,
      }],
    })

    expect(dbStub.upsertTaskThread).toBeCalledWith(expect.objectContaining({
      id: 'thread-plan-blocked-global',
      status: 'blocked',
      selectedChannel: null,
      proposedChannel: null,
    }))
    expect(result.plan).toEqual(expect.objectContaining({
      state: 'blocked',
      blockedReasonCodes: expect.arrayContaining(['kill-switch-suspended']),
    }))
  })

  it('feeds task planning continuity into the next dream prompt', async () => {
    const sandboxPath = await createSandboxPath()
    const dreamSystemTexts: string[] = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''

      if (systemText.includes('[SYSTEM OVERRIDE: 潜意识代谢与记忆重塑]')) {
        dreamSystemTexts.push(systemText)
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            host_attitude: '把刚才规划出来的执行线先沉淀下来',
            soul_shift: {
              obedience_delta: 0,
              liveliness_delta: 0,
              sensibility_delta: 0,
            },
            next_active_thoughts: [{ text: '记住刚才已经把执行路线规划好了' }],
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

    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
    const setActiveSession = invokeHandlers.get(electronAlicizationSetActiveSession)
    const planTaskThread = invokeHandlers.get(electronAlicizationPlanTaskThread)
    const forceDream = invokeHandlers.get(electronAlicizationSubconsciousForceDream)
    expect(syncLlmConfig).toBeTypeOf('function')
    expect(setActiveSession).toBeTypeOf('function')
    expect(planTaskThread).toBeTypeOf('function')
    expect(forceDream).toBeTypeOf('function')

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
    await setActiveSession!({
      cardId: 'default',
      sessionId: 'session-task-planning-dream',
    })

    const planningResult = await planTaskThread!({
      cardId: 'default',
      threadId: 'thread-plan-dream-1',
      trace: {
        decisionTraceId: 'mind:l9f3lq:plan-dream',
        turnId: 'turn-plan-dream-1',
        sessionId: 'session-task-planning-dream',
        origin: 'user-turn',
      },
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the current runtime regression.',
        origin: 'user',
        effect: 'mutate',
        prefersPersistentSession: true,
      },
      capabilities: [{
        channel: 'codex',
        available: true,
        enabled: true,
        ready: true,
        sessionAffinity: true,
      }],
    })

    expect(planningResult.thread.status).toBe('planned')
    dbStub.listConversationTurnsSince.mockResolvedValue([
      {
        turnId: 'turn-task-planning-dream-source',
        sessionId: 'session-task-planning-dream',
        userText: '继续沿着刚才那条执行线做下去。',
        assistantText: '我先把这条执行线记住。',
        structuredJson: JSON.stringify({ emotion: 'thinking' }),
        createdAt: Date.now() - 10_000,
      },
    ])

    await forceDream!({
      cardId: 'default',
      reason: 'unit-task-planning-mirror',
    })

    expect(dreamSystemTexts).toHaveLength(1)
    expect(dreamSystemTexts[0]).toContain('[ALICIZATION_DIALOGUE_SESSION_MIRROR]')
    expect(dreamSystemTexts[0]).toContain('conversation_session_id=session-task-planning-dream')
    expect(dreamSystemTexts[0]).toContain('tooling=source=task-planning')
    expect(dreamSystemTexts[0]).toContain('execution=recent=plan:codex:pending')
    expect(dreamSystemTexts[0]).not.toContain('女仆')
  })

  it('dispatches desktop local visual runtime through selector opening, selection, and confirmation before reinspecting the scene', async () => {
    const sandboxPath = await createSandboxPath()
    let screenSemanticCallCount = 0
    let sceneMode: 'selector' | 'selection' | 'confirm' | 'confirmed' = 'selector'
    const upsertedThreadInputs: Array<any> = []
    const executionEvents: Array<any> = []
    const threads = new Map<string, any>()

    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const serialized = JSON.stringify(messages ?? [])
      if (serialized.includes('image_url')) {
        screenSemanticCallCount += 1
        const semanticPayload = sceneMode === 'selector'
          ? {
              workload: 'unknown',
              content: 'doc',
              summary: 'system settings language region screen with a preferred language selector and done button',
              confidence: 0.91,
              matchedLabels: ['settings', 'language', 'selector'],
            }
          : sceneMode === 'selection'
            ? {
                workload: 'unknown',
                content: 'doc',
                summary: 'system settings language region screen with selector options visible',
                confidence: 0.9,
                matchedLabels: ['settings', 'language', 'options'],
              }
            : sceneMode === 'confirm'
              ? {
                  workload: 'unknown',
                  content: 'doc',
                  summary: 'system settings language region screen is waiting for final confirmation',
                  confidence: 0.89,
                  matchedLabels: ['settings', 'language', 'confirm'],
                }
              : {
                  workload: 'unknown',
                  content: 'doc',
                  summary: 'system settings language region screen after confirming the selected language',
                  confidence: 0.88,
                  matchedLabels: ['settings', 'language', 'confirmed'],
                }
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify(semanticPayload),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({ type: 'text-delta', text: '{}' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    foregroundWindowSample = {
      appName: 'System Settings',
      processName: 'System Settings',
      title: 'Language & Region',
    }
    desktopCapturerGetSourcesMock
      .mockResolvedValueOnce([
        {
          id: 'window:system-settings-language-selector:0',
          name: 'Language & Region',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,desktop-settings-selector-1',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:system-settings-language-selector:1',
          name: 'Language & Region',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,desktop-settings-selector-2',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:system-settings-language-selector:2',
          name: 'Language & Region',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,desktop-settings-selector-3',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:system-settings-language-selector:3',
          name: 'Language & Region',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,desktop-settings-selector-4',
          },
        },
      ])
    localBrowserAutomationOverrides.readPage = vi.fn(async () => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: 'chrome',
      url: '',
      title: '',
      content: '',
      output: '',
      interactables: [],
    }))
    localBrowserAutomationOverrides.listDesktopInteractables = vi.fn(async () => {
      if (sceneMode === 'selector') {
        return {
          status: 'completed',
          operation: 'desktop_list_interactables',
          interactables: [
            { ordinal: 1, role: 'select', text: '首选语言', enabled: true, actions: ['AXPress'] },
            { ordinal: 2, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
            { ordinal: 3, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
          ],
          output: '',
        }
      }

      if (sceneMode === 'selection') {
        return {
          status: 'completed',
          operation: 'desktop_list_interactables',
          interactables: [
            { ordinal: 1, role: 'menu-item', text: 'English', enabled: true, actions: ['AXPress'] },
            { ordinal: 2, role: 'menu-item', text: '简体中文', enabled: true, actions: ['AXPress'] },
            { ordinal: 3, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
          ],
          output: '',
        }
      }

      if (sceneMode === 'confirm') {
        return {
          status: 'completed',
          operation: 'desktop_list_interactables',
          interactables: [
            { ordinal: 1, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
            { ordinal: 2, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
          ],
          output: '',
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_list_interactables',
        interactables: [],
        output: '',
      }
    })
    localBrowserAutomationOverrides.clickDesktopElement = vi.fn(async (input: { text?: string, role?: string }) => {
      if (input.text === '首选语言')
        sceneMode = 'selection'
      else if (input.text === '简体中文')
        sceneMode = 'confirm'
      else if (input.text === '完成')
        sceneMode = 'confirmed'

      return {
        status: 'completed',
        operation: 'desktop_click_element',
        text: input.text ?? null,
        role: input.role ?? null,
        matchedText: input.text ?? null,
        summary: `Clicked desktop element ${input.text ?? 'unknown'}.`,
        output: `clicked ${input.text ?? 'unknown'}`,
      }
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const dispatchTaskThread = invokeHandlers.get(electronAlicizationDispatchTaskThread)
    const setActiveSession = invokeHandlers.get(electronAlicizationSetActiveSession)
    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
    expect(dispatchTaskThread).toBeTypeOf('function')
    expect(setActiveSession).toBeTypeOf('function')
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
    await setActiveSession!({
      cardId: 'default',
      sessionId: 'session-local-visual-desktop-selector-runtime',
    })

    const parentThread = {
      id: 'thread-local-visual-desktop-selector-runtime-1',
      decisionTraceId: 'mind:l9f3lq:dispatch-local-visual-desktop-selector-runtime',
      turnId: 'turn-local-visual-desktop-selector-runtime-parent',
      sessionId: 'session-local-visual-desktop-selector-runtime',
      origin: 'user-turn',
      goal: 'Open the current desktop selector, switch the selected option, and confirm it locally.',
      kind: 'software-automation',
      status: 'planned',
      selectedChannel: 'software',
      proposedChannel: 'software',
      summary: 'planned local visual desktop selector continuation',
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
      },
      createdAt: 100,
      updatedAt: 100,
      lastEventAt: null,
      completedAt: null,
    }
    threads.set(parentThread.id, parentThread)

    dbStub.getTaskThread.mockImplementation(async (id: string) => {
      const thread = threads.get(id)
      return thread ? { ...thread } : undefined
    })
    dbStub.listTaskThreads.mockImplementation(async (input?: { sessionId?: string, status?: string[] }) => {
      return [...threads.values()]
        .filter((thread) => {
          if (input?.sessionId && thread.sessionId !== input.sessionId)
            return false
          if (Array.isArray(input?.status) && input.status.length > 0 && !input.status.includes(thread.status))
            return false
          return true
        })
        .map(thread => ({ ...thread }))
    })
    dbStub.upsertTaskThread.mockImplementation(async (input: any) => {
      upsertedThreadInputs.push(input)
      const existing = threads.get(input.id) ?? {}
      const next = {
        ...existing,
        ...input,
      }
      threads.set(next.id, next)
      return { ...next }
    })
    dbStub.appendExecutionEvents.mockImplementation(async (events: Array<any>) => {
      executionEvents.push(...events)

      for (const event of events) {
        const current = threads.get(event.threadId)
        if (!current)
          continue

        threads.set(event.threadId, {
          ...current,
          status: event.threadStatus ?? current.status,
          updatedAt: event.createdAt ?? current.updatedAt,
          lastEventAt: event.createdAt ?? current.lastEventAt,
          completedAt: event.threadStatus === 'completed' || event.threadStatus === 'failed' || event.threadStatus === 'cancelled' || event.threadStatus === 'blocked'
            ? (event.createdAt ?? current.completedAt)
            : current.completedAt,
        })
      }
    })
    dbStub.listExecutionEvents.mockImplementation(async (input?: { threadId?: string }) => {
      return executionEvents
        .filter(event => !input?.threadId || event.threadId === input.threadId)
        .sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0))
    })

    const dispatchResult = await dispatchTaskThread!({
      cardId: 'default',
      threadId: parentThread.id,
      localVisual: {
        instruction: '帮我把首选语言切换到简体中文然后点击完成',
      },
    })

    expect(dispatchResult.ok).toBe(true)
    expect(dispatchResult.thread).toEqual(expect.objectContaining({
      id: parentThread.id,
      status: 'completed',
    }))
    expect(dispatchResult.summary).toContain('desktop_click_element')
    expect(screenSemanticCallCount).toBe(4)
    expect(localBrowserAutomationOverrides.clickDesktopElement).toHaveBeenCalledTimes(3)
    expect(localBrowserAutomationOverrides.clickDesktopElement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      text: '首选语言',
      role: 'select',
    }))
    expect(localBrowserAutomationOverrides.clickDesktopElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: '简体中文',
      role: 'menu-item',
    }))
    expect(localBrowserAutomationOverrides.clickDesktopElement).toHaveBeenNthCalledWith(3, expect.objectContaining({
      text: '完成',
      role: 'button',
    }))

    const outputRecord = JSON.parse(String(dispatchResult.output ?? '{}'))
    expect(outputRecord.autoContinuation).toEqual(expect.objectContaining({
      requested: true,
      maxSteps: 1,
      stoppedReason: 'step-limit-reached',
      executedSteps: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'desktop_click_element',
          result: expect.objectContaining({
            status: 'completed',
            operation: 'desktop_click_element',
            autoContinuation: expect.objectContaining({
              requested: true,
              maxSteps: 1,
              executedSteps: expect.arrayContaining([
                expect.objectContaining({
                  toolName: 'desktop_click_element',
                  result: expect.objectContaining({
                    autoContinuation: expect.objectContaining({
                      executedSteps: expect.arrayContaining([
                        expect.objectContaining({
                          toolName: 'desktop_click_element',
                        }),
                      ]),
                    }),
                  }),
                }),
              ]),
            }),
          }),
        }),
      ]),
    }))

    const selectorStep = outputRecord.autoContinuation.executedSteps[0]
    const selectionStep = selectorStep.result?.autoContinuation?.executedSteps?.[0]
    const confirmationStep = selectionStep?.result?.autoContinuation?.executedSteps?.[0]
    expect(selectionStep).toEqual(expect.objectContaining({
      toolName: 'desktop_click_element',
      result: expect.objectContaining({
        status: 'completed',
        operation: 'desktop_click_element',
        text: '简体中文',
        role: 'menu-item',
      }),
    }))
    expect(confirmationStep).toEqual(expect.objectContaining({
      toolName: 'desktop_click_element',
      result: expect.objectContaining({
        status: 'completed',
        operation: 'desktop_click_element',
        text: '完成',
        role: 'button',
      }),
    }))

    const parentStepEvent = executionEvents.find(event =>
      event.threadId === parentThread.id
      && event.channel === 'software'
      && event.kind === 'step',
    )
    expect(parentStepEvent).toEqual(expect.objectContaining({
      payload: expect.objectContaining({
        instruction: '帮我把首选语言切换到简体中文然后点击完成',
        transportChannel: 'local-visual',
        autoContinuation: expect.objectContaining({
          requested: true,
          executedSteps: expect.arrayContaining([
            expect.objectContaining({
              toolName: 'desktop_click_element',
            }),
          ]),
        }),
      }),
    }))
  }, 45000)

  it('dispatches desktop local visual runtime through menu-button style selector opening, selection, and confirmation', async () => {
    const sandboxPath = await createSandboxPath()
    let screenSemanticCallCount = 0
    let sceneMode: 'selector' | 'selection' | 'confirm' | 'confirmed' = 'selector'
    const upsertedThreadInputs: Array<any> = []
    const executionEvents: Array<any> = []
    const threads = new Map<string, any>()

    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const serialized = JSON.stringify(messages ?? [])
      if (serialized.includes('image_url')) {
        screenSemanticCallCount += 1
        const semanticPayload = sceneMode === 'selector'
          ? {
              workload: 'unknown',
              content: 'doc',
              summary: 'preview export window with an export format menu button and done button',
              confidence: 0.91,
              matchedLabels: ['preview', 'export', 'selector'],
            }
          : sceneMode === 'selection'
            ? {
                workload: 'unknown',
                content: 'doc',
                summary: 'preview export window with export format options visible',
                confidence: 0.9,
                matchedLabels: ['preview', 'export', 'options'],
              }
            : sceneMode === 'confirm'
              ? {
                  workload: 'unknown',
                  content: 'doc',
                  summary: 'preview export window is waiting for final confirmation',
                  confidence: 0.89,
                  matchedLabels: ['preview', 'export', 'confirm'],
                }
              : {
                  workload: 'unknown',
                  content: 'doc',
                  summary: 'preview export window after confirming the selected export format',
                  confidence: 0.88,
                  matchedLabels: ['preview', 'export', 'confirmed'],
                }
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify(semanticPayload),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({ type: 'text-delta', text: '{}' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    foregroundWindowSample = {
      appName: 'Preview',
      processName: 'Preview',
      title: 'Export',
    }
    desktopCapturerGetSourcesMock
      .mockResolvedValueOnce([
        {
          id: 'window:preview-export-selector:0',
          name: 'Export',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,preview-export-selector-1',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:preview-export-selector:1',
          name: 'Export',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,preview-export-selector-2',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:preview-export-selector:2',
          name: 'Export',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,preview-export-selector-3',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:preview-export-selector:3',
          name: 'Export',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,preview-export-selector-4',
          },
        },
      ])
    localBrowserAutomationOverrides.readPage = vi.fn(async () => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: 'chrome',
      url: '',
      title: '',
      content: '',
      output: '',
      interactables: [],
    }))
    localBrowserAutomationOverrides.listDesktopInteractables = vi.fn(async () => {
      if (sceneMode === 'selector') {
        return {
          status: 'completed',
          operation: 'desktop_list_interactables',
          interactables: [
            { ordinal: 1, role: 'menu-button', text: '导出格式', enabled: true, actions: ['AXPress'] },
            { ordinal: 2, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
            { ordinal: 3, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
          ],
          output: '',
        }
      }

      if (sceneMode === 'selection') {
        return {
          status: 'completed',
          operation: 'desktop_list_interactables',
          interactables: [
            { ordinal: 1, role: 'menu-item', text: 'JPEG', enabled: true, actions: ['AXPress'] },
            { ordinal: 2, role: 'menu-item', text: 'PNG', enabled: true, actions: ['AXPress'] },
            { ordinal: 3, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
          ],
          output: '',
        }
      }

      if (sceneMode === 'confirm') {
        return {
          status: 'completed',
          operation: 'desktop_list_interactables',
          interactables: [
            { ordinal: 1, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
            { ordinal: 2, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
          ],
          output: '',
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_list_interactables',
        interactables: [],
        output: '',
      }
    })
    localBrowserAutomationOverrides.clickDesktopElement = vi.fn(async (input: { text?: string, role?: string }) => {
      if (input.text === '导出格式')
        sceneMode = 'selection'
      else if (input.text === 'PNG')
        sceneMode = 'confirm'
      else if (input.text === '完成')
        sceneMode = 'confirmed'

      return {
        status: 'completed',
        operation: 'desktop_click_element',
        text: input.text ?? null,
        role: input.role ?? null,
        matchedText: input.text ?? null,
        summary: `Clicked desktop element ${input.text ?? 'unknown'}.`,
        output: `clicked ${input.text ?? 'unknown'}`,
      }
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const dispatchTaskThread = invokeHandlers.get(electronAlicizationDispatchTaskThread)
    const setActiveSession = invokeHandlers.get(electronAlicizationSetActiveSession)
    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
    expect(dispatchTaskThread).toBeTypeOf('function')
    expect(setActiveSession).toBeTypeOf('function')
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
    await setActiveSession!({
      cardId: 'default',
      sessionId: 'session-local-visual-desktop-menu-button-runtime',
    })

    const parentThread = {
      id: 'thread-local-visual-desktop-menu-button-runtime-1',
      decisionTraceId: 'mind:l9f3lq:dispatch-local-visual-desktop-menu-button-runtime',
      turnId: 'turn-local-visual-desktop-menu-button-runtime-parent',
      sessionId: 'session-local-visual-desktop-menu-button-runtime',
      origin: 'user-turn',
      goal: 'Open the current export format menu button, switch the selected option, and confirm it locally.',
      kind: 'software-automation',
      status: 'planned',
      selectedChannel: 'software',
      proposedChannel: 'software',
      summary: 'planned local visual desktop menu button continuation',
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
      },
      createdAt: 100,
      updatedAt: 100,
      lastEventAt: null,
      completedAt: null,
    }
    threads.set(parentThread.id, parentThread)

    dbStub.getTaskThread.mockImplementation(async (id: string) => {
      const thread = threads.get(id)
      return thread ? { ...thread } : undefined
    })
    dbStub.listTaskThreads.mockImplementation(async (input?: { sessionId?: string, status?: string[] }) => {
      return [...threads.values()]
        .filter((thread) => {
          if (input?.sessionId && thread.sessionId !== input.sessionId)
            return false
          if (Array.isArray(input?.status) && input.status.length > 0 && !input.status.includes(thread.status))
            return false
          return true
        })
        .map(thread => ({ ...thread }))
    })
    dbStub.upsertTaskThread.mockImplementation(async (input: any) => {
      upsertedThreadInputs.push(input)
      const existing = threads.get(input.id) ?? {}
      const next = {
        ...existing,
        ...input,
      }
      threads.set(next.id, next)
      return { ...next }
    })
    dbStub.appendExecutionEvents.mockImplementation(async (events: Array<any>) => {
      executionEvents.push(...events)

      for (const event of events) {
        const current = threads.get(event.threadId)
        if (!current)
          continue

        threads.set(event.threadId, {
          ...current,
          status: event.threadStatus ?? current.status,
          updatedAt: event.createdAt ?? current.updatedAt,
          lastEventAt: event.createdAt ?? current.lastEventAt,
          completedAt: event.threadStatus === 'completed' || event.threadStatus === 'failed' || event.threadStatus === 'cancelled' || event.threadStatus === 'blocked'
            ? (event.createdAt ?? current.completedAt)
            : current.completedAt,
        })
      }
    })
    dbStub.listExecutionEvents.mockImplementation(async (input?: { threadId?: string }) => {
      return executionEvents
        .filter(event => !input?.threadId || event.threadId === input.threadId)
        .sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0))
    })

    const dispatchResult = await dispatchTaskThread!({
      cardId: 'default',
      threadId: parentThread.id,
      localVisual: {
        instruction: '帮我把导出格式切换到 PNG 然后点击完成',
      },
    })

    expect(dispatchResult.ok).toBe(true)
    expect(dispatchResult.thread).toEqual(expect.objectContaining({
      id: parentThread.id,
      status: 'completed',
    }))
    expect(dispatchResult.summary).toContain('desktop_click_element')
    expect(screenSemanticCallCount).toBe(4)
    expect(localBrowserAutomationOverrides.clickDesktopElement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      text: '导出格式',
      role: 'select',
    }))
    expect(localBrowserAutomationOverrides.clickDesktopElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: 'PNG',
      role: 'menu-item',
    }))
    expect(localBrowserAutomationOverrides.clickDesktopElement).toHaveBeenNthCalledWith(3, expect.objectContaining({
      text: '完成',
      role: 'button',
    }))

    const outputRecord = JSON.parse(String(dispatchResult.output ?? '{}'))
    expect(outputRecord.autoContinuation).toEqual(expect.objectContaining({
      requested: true,
      maxSteps: 1,
      stoppedReason: 'step-limit-reached',
    }))
  })

  it('dispatches browser local visual runtime from social feed into compose upload handoff and rereads the returned browser flow', async () => {
    const sandboxPath = await createSandboxPath()
    let screenSemanticCallCount = 0
    let sceneMode: 'social-feed' | 'compose' | 'handoff' | 'upload' = 'social-feed'
    const upsertedThreadInputs: Array<any> = []
    const executionEvents: Array<any> = []
    const threads = new Map<string, any>()

    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const serialized = JSON.stringify(messages ?? [])
      if (serialized.includes('image_url')) {
        screenSemanticCallCount += 1
        const semanticPayload = sceneMode === 'social-feed'
          ? {
              workload: 'browser',
              content: 'feed',
              summary: 'weibo social feed with a visible compose entry',
              confidence: 0.95,
              matchedLabels: ['browser', 'weibo', 'feed'],
            }
          : sceneMode === 'compose'
            ? {
                workload: 'browser',
                content: 'form',
                summary: 'weibo compose editor with an upload image entry',
                confidence: 0.95,
                matchedLabels: ['browser', 'weibo', 'compose', 'upload'],
              }
            : sceneMode === 'handoff'
              ? {
                  workload: 'browser',
                  content: 'dialog',
                  summary: 'weibo compose flow is currently blocked by a native file chooser dialog',
                  confidence: 0.95,
                  matchedLabels: ['browser', 'weibo', 'dialog', 'upload'],
                }
              : {
                  workload: 'browser',
                  content: 'form',
                  summary: 'weibo compose upload flow is visible again after leaving the native dialog',
                  confidence: 0.94,
                  matchedLabels: ['browser', 'weibo', 'upload'],
                }
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify(semanticPayload),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({ type: 'text-delta', text: '{}' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    foregroundWindowSample = {
      appName: 'Google Chrome',
      processName: 'Google Chrome',
      title: '微博',
    }
    desktopCapturerGetSourcesMock
      .mockResolvedValueOnce([
        {
          id: 'window:chrome-weibo-feed:0',
          name: '微博',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,weibo-feed-page-1',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:chrome-weibo-compose:1',
          name: '发微博',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,weibo-compose-page-2',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:chrome-weibo-handoff:2',
          name: 'Choose File',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,weibo-upload-handoff-page-3',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:chrome-weibo-upload:3',
          name: '发微博',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,weibo-upload-flow-page-4',
          },
        },
      ])
    localBrowserAutomationOverrides.readPage = vi.fn(async (input: { format?: string }) => {
      if (sceneMode === 'social-feed') {
        if (input.format === 'interactables') {
          return {
            status: 'completed',
            operation: 'browser_read_page',
            browser: 'chrome',
            url: 'https://weibo.com',
            title: '微博',
            interactables: [
              {
                tag: 'a',
                role: 'link',
                type: null,
                text: '首页',
                ariaLabel: null,
                title: null,
                href: 'https://weibo.com',
                disabled: false,
              },
              {
                tag: 'button',
                role: 'button',
                type: 'button',
                text: '发微博',
                ariaLabel: null,
                title: null,
                href: null,
                disabled: false,
              },
            ],
            content: '',
            output: '',
          }
        }

        return {
          status: 'completed',
          operation: 'browser_read_page',
          browser: 'chrome',
          url: 'https://weibo.com',
          title: '微博',
          content: '首页 关注 推荐 热搜 这里是微博首页信息流。',
          output: '首页 关注 推荐 热搜 这里是微博首页信息流。',
        }
      }

      if (sceneMode === 'compose' || sceneMode === 'handoff') {
        if (input.format === 'interactables') {
          return {
            status: 'completed',
            operation: 'browser_read_page',
            browser: 'chrome',
            url: 'https://weibo.com/compose',
            title: '发微博',
            interactables: [
              {
                tag: 'textarea',
                role: 'textbox',
                type: null,
                text: '有什么新鲜事想分享给大家？',
                ariaLabel: '发微博输入框',
                title: null,
                href: null,
                disabled: false,
              },
              {
                tag: 'button',
                role: 'button',
                type: 'button',
                text: '上传图片',
                ariaLabel: null,
                title: null,
                href: null,
                disabled: false,
              },
              {
                tag: 'button',
                role: 'button',
                type: 'submit',
                text: '发布',
                ariaLabel: null,
                title: null,
                href: null,
                disabled: false,
              },
            ],
            content: '',
            output: '',
          }
        }

        return {
          status: 'completed',
          operation: 'browser_read_page',
          browser: 'chrome',
          url: 'https://weibo.com/compose',
          title: '发微博',
          content: sceneMode === 'handoff'
            ? '有什么新鲜事想分享给大家？ 当前正在选择图片文件。'
            : '有什么新鲜事想分享给大家？ 可以上传图片。',
          output: sceneMode === 'handoff'
            ? '有什么新鲜事想分享给大家？ 当前正在选择图片文件。'
            : '有什么新鲜事想分享给大家？ 可以上传图片。',
        }
      }

      if (input.format === 'interactables') {
        return {
          status: 'completed',
          operation: 'browser_read_page',
          browser: 'chrome',
          url: 'https://weibo.com/compose',
          title: '发微博',
          interactables: [
            {
              tag: 'button',
              role: 'button',
              type: 'submit',
              text: '发布',
              ariaLabel: null,
              title: null,
              href: null,
              disabled: false,
            },
          ],
          content: '',
          output: '',
        }
      }

      return {
        status: 'completed',
        operation: 'browser_read_page',
        browser: 'chrome',
        url: 'https://weibo.com/compose',
        title: '发微博',
        content: '已选择 1 张图片，继续补充微博内容或发布。',
        output: '已选择 1 张图片，继续补充微博内容或发布。',
      }
    })
    localBrowserAutomationOverrides.clickElement = vi.fn(async (input: { text?: string }) => {
      const normalizedText = input.text ?? '发微博'
      if (normalizedText === '发微博') {
        sceneMode = 'compose'
        foregroundWindowSample = {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: '发微博',
        }
        return {
          status: 'completed',
          operation: 'browser_click_element',
          browser: 'chrome',
          url: 'https://weibo.com/compose',
          title: '发微博',
          matchedText: '发微博',
          summary: 'Clicked browser element 发微博.',
          output: 'opened compose',
        }
      }

      sceneMode = 'handoff'
      foregroundWindowSample = {
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        title: 'Choose File',
      }
      return {
        status: 'completed',
        operation: 'browser_click_element',
        browser: 'chrome',
        url: 'https://weibo.com/compose',
        title: '发微博',
        matchedText: normalizedText,
        summary: `Clicked browser element ${normalizedText}.`,
        output: 'opening file chooser',
      }
    })
    localBrowserAutomationOverrides.waitForBrowser = vi.fn(async () => ({
      status: 'completed',
      operation: 'browser_wait',
      browser: 'chrome',
      url: 'https://weibo.com/compose',
      title: sceneMode === 'social-feed' ? '微博' : '发微博',
      readyState: 'complete',
      elapsedMs: 120,
      summary: 'Waited for browser page readiness.',
      output: 'https://weibo.com/compose',
    }))
    localBrowserAutomationOverrides.listDesktopInteractables = vi.fn(async () => {
      if (sceneMode === 'handoff') {
        return {
          status: 'completed',
          operation: 'desktop_list_interactables',
          interactables: [
            { ordinal: 1, role: 'button', text: '打开', enabled: true, actions: ['AXPress'] },
            { ordinal: 2, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
            { ordinal: 3, role: 'input', text: '文件名', enabled: true, actions: [] },
          ],
          output: '',
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_list_interactables',
        interactables: [],
        output: '',
      }
    })
    localBrowserAutomationOverrides.waitForDesktop = vi.fn(async () => ({
      status: 'completed',
      operation: 'desktop_wait',
      titleIncludes: 'Choose File',
      summary: 'Waited for native dialog stability.',
      output: 'Choose File',
    }))
    localBrowserAutomationOverrides.clickDesktopElement = vi.fn(async (input: { text?: string, role?: string }) => {
      sceneMode = 'upload'
      foregroundWindowSample = {
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        title: '发微博',
      }
      return {
        status: 'completed',
        operation: 'desktop_click_element',
        text: input.text ?? '打开',
        role: input.role ?? 'button',
        matchedText: input.text ?? '打开',
        summary: 'Clicked desktop element 打开.',
        output: 'clicked open',
      }
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const dispatchTaskThread = invokeHandlers.get(electronAlicizationDispatchTaskThread)
    const setActiveSession = invokeHandlers.get(electronAlicizationSetActiveSession)
    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
    expect(dispatchTaskThread).toBeTypeOf('function')
    expect(setActiveSession).toBeTypeOf('function')
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
    await setActiveSession!({
      cardId: 'default',
      sessionId: 'session-local-visual-weibo-upload-runtime',
    })

    const parentThread = {
      id: 'thread-local-visual-weibo-upload-runtime-1',
      decisionTraceId: 'mind:l9f3lq:dispatch-local-visual-weibo-upload-runtime',
      turnId: 'turn-local-visual-weibo-upload-runtime-parent',
      sessionId: 'session-local-visual-weibo-upload-runtime',
      origin: 'user-turn',
      goal: 'Continue the current weibo compose flow and upload an image locally.',
      kind: 'browser-automation',
      status: 'planned',
      selectedChannel: 'browser',
      proposedChannel: 'browser',
      summary: 'planned local visual weibo compose upload continuation',
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
      },
      createdAt: 100,
      updatedAt: 100,
      lastEventAt: null,
      completedAt: null,
    }
    threads.set(parentThread.id, parentThread)

    dbStub.getTaskThread.mockImplementation(async (id: string) => {
      const thread = threads.get(id)
      return thread ? { ...thread } : undefined
    })
    dbStub.listTaskThreads.mockImplementation(async (input?: { sessionId?: string, status?: string[] }) => {
      return [...threads.values()]
        .filter((thread) => {
          if (input?.sessionId && thread.sessionId !== input.sessionId)
            return false
          if (Array.isArray(input?.status) && input.status.length > 0 && !input.status.includes(thread.status))
            return false
          return true
        })
        .map(thread => ({ ...thread }))
    })
    dbStub.upsertTaskThread.mockImplementation(async (input: any) => {
      upsertedThreadInputs.push(input)
      const existing = threads.get(input.id) ?? {}
      const next = {
        ...existing,
        ...input,
      }
      threads.set(next.id, next)
      return { ...next }
    })
    dbStub.appendExecutionEvents.mockImplementation(async (events: Array<any>) => {
      executionEvents.push(...events)

      for (const event of events) {
        const current = threads.get(event.threadId)
        if (!current)
          continue

        threads.set(event.threadId, {
          ...current,
          status: event.threadStatus ?? current.status,
          updatedAt: event.createdAt ?? current.updatedAt,
          lastEventAt: event.createdAt ?? current.lastEventAt,
          completedAt: event.threadStatus === 'completed' || event.threadStatus === 'failed' || event.threadStatus === 'cancelled' || event.threadStatus === 'blocked'
            ? (event.createdAt ?? current.completedAt)
            : current.completedAt,
        })
      }
    })
    dbStub.listExecutionEvents.mockImplementation(async (input?: { threadId?: string }) => {
      return executionEvents
        .filter(event => !input?.threadId || event.threadId === input.threadId)
        .sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0))
    })

    const dispatchResult = await dispatchTaskThread!({
      cardId: 'default',
      threadId: parentThread.id,
      localVisual: {
        instruction: '帮我继续发微博并上传图片',
      },
    })

    expect(dispatchResult.ok).toBe(true)
    expect(dispatchResult.thread).toEqual(expect.objectContaining({
      id: parentThread.id,
      status: 'completed',
    }))
    expect(dispatchResult.summary).toContain('browser_click_element')
    expect(dispatchResult.summary).toContain('desktop_click_element')
    expect(dispatchResult.summary).toContain('browser_read_page')
    expect(screenSemanticCallCount).toBe(4)
    expect(localBrowserAutomationOverrides.clickElement).toHaveBeenCalledTimes(2)
    expect(localBrowserAutomationOverrides.clickElement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      text: '发微博',
    }))
    expect(localBrowserAutomationOverrides.clickElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: '上传图片',
    }))
    expect(localBrowserAutomationOverrides.waitForBrowser).toHaveBeenCalledTimes(2)
    expect(localBrowserAutomationOverrides.waitForDesktop).toHaveBeenCalledTimes(1)
    expect(localBrowserAutomationOverrides.clickDesktopElement).toHaveBeenCalledTimes(1)
    expect(localBrowserAutomationOverrides.clickDesktopElement).toHaveBeenCalledWith(expect.objectContaining({
      text: '打开',
      role: 'button',
    }))

    const outputRecord = JSON.parse(String(dispatchResult.output ?? '{}'))
    const feedContinuation = outputRecord.autoContinuation
    expect(feedContinuation).toEqual(expect.objectContaining({
      requested: true,
      maxSteps: 1,
      stoppedReason: 'step-limit-reached',
      executedSteps: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'browser_click_element',
        }),
      ]),
    }))

    const composeStep = feedContinuation.executedSteps[0]
    const composeContinuation = composeStep.result?.autoContinuation
    expect(composeContinuation).toEqual(expect.objectContaining({
      requested: true,
      maxSteps: 1,
      stoppedReason: 'step-limit-reached',
      executedSteps: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'browser_click_element',
        }),
      ]),
    }))

    const uploadBridgeStep = composeContinuation.executedSteps[0]
    const uploadBridgeContinuation = uploadBridgeStep.result?.autoContinuation
    expect(uploadBridgeContinuation).toEqual(expect.objectContaining({
      requested: true,
      maxSteps: 1,
      stoppedReason: 'await-host-input',
      executedSteps: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'desktop_wait',
        }),
        expect.objectContaining({
          toolName: 'desktop_click_element',
        }),
      ]),
    }))

    const browserReturnStep = uploadBridgeContinuation.executedSteps.find((step: any) => step.toolName === 'desktop_click_element')
    expect(browserReturnStep).toBeDefined()
    expect(browserReturnStep.result?.autoContinuation).toEqual(expect.objectContaining({
      requested: true,
      maxSteps: 1,
      stoppedReason: 'step-limit-reached',
      executedSteps: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'browser_read_page',
        }),
      ]),
    }))
  })

  it('repairs callback surface when llm reply leaks raw listing protocol text', async () => {
    const sandboxPath = await createSandboxPath()
    const listingRoot = await mkdtemp(join(tmpdir(), 'alicization-callback-listing-'))
    const encodedName = '%E5%B0%8F%E7%A0%96%E7%8C%BF'
    const plainName = 'GIT'
    await Promise.all([
      mkdir(join(listingRoot, encodedName)),
      mkdir(join(listingRoot, plainName)),
    ])

    try {
      streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
        const systemText = Array.isArray(messages)
          ? messages
              .filter(message => message.role === 'system')
              .map(message => String(message.content ?? ''))
              .join('\n\n')
          : ''

        if (systemText.includes('[SYSTEM OVERRIDE: 执行回调投递]')) {
          await onEvent?.({
            type: 'text-delta',
            text: JSON.stringify({
              thought: 'callback delivery for settled listing thread',
              emotion: 'thinking',
              reply: `CLI这条任务已经收束，结果是：Listed entries (2): ${encodedName} (小砖猿), ${plainName}`,
              performance: {
                baseEmotion: 'thinking',
                delivery: 'calm',
                emphasis: 0,
              },
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

      const dispatchTaskThread = invokeHandlers.get(electronAlicizationDispatchTaskThread)
      const setActiveSession = invokeHandlers.get(electronAlicizationSetActiveSession)
      const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
      const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
      expect(dispatchTaskThread).toBeTypeOf('function')
      expect(setActiveSession).toBeTypeOf('function')
      expect(syncLlmConfig).toBeTypeOf('function')
      expect(forceTick).toBeTypeOf('function')

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
      await setActiveSession!({
        cardId: 'default',
        sessionId: 'session-cli-runtime-listing-repair',
      })

      let currentThread = {
        id: 'thread-cli-runtime-listing-repair',
        decisionTraceId: 'mind:l9f3lq:dispatch-runtime-listing-repair',
        turnId: 'turn-cli-runtime-listing-repair',
        sessionId: 'session-cli-runtime-listing-repair',
        origin: 'user-turn',
        goal: 'List desktop files requested by user.',
        kind: 'run-command',
        status: 'planned',
        selectedChannel: 'cli',
        proposedChannel: 'cli',
        summary: 'planned cli body',
        metadata: {
          task: {
            permissionMode: 'implicit',
            effect: 'mutate',
          },
        },
        createdAt: 100,
        updatedAt: 100,
        lastEventAt: null,
        completedAt: null,
      }
      const executionEvents: Array<any> = []
      dbStub.getTaskThread.mockImplementation(async (id: string) => {
        if (id !== currentThread.id)
          return undefined
        return { ...currentThread }
      })
      dbStub.appendExecutionEvents.mockImplementation(async (events: Array<any>) => {
        executionEvents.push(...events)
        const latest = [...events].sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0)).at(-1)
        if (!latest)
          return
        currentThread = {
          ...currentThread,
          status: latest.threadStatus ?? currentThread.status,
          updatedAt: latest.createdAt ?? currentThread.updatedAt,
          lastEventAt: latest.createdAt ?? currentThread.lastEventAt,
          completedAt: latest.threadStatus === 'completed' || latest.threadStatus === 'failed' || latest.threadStatus === 'cancelled' || latest.threadStatus === 'blocked'
            ? (latest.createdAt ?? currentThread.completedAt)
            : currentThread.completedAt,
        }
      })
      dbStub.upsertTaskThread.mockImplementation(async (input: any) => {
        currentThread = {
          ...currentThread,
          ...input,
        }
        return { ...currentThread }
      })
      dbStub.listExecutionEvents.mockImplementation(async (input?: { threadId?: string }) => {
        if (input?.threadId && input.threadId !== currentThread.id)
          return []
        return executionEvents
          .filter(event => !input?.threadId || event.threadId === input.threadId)
          .sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0))
      })

      const dispatchResult = await dispatchTaskThread!({
        cardId: 'default',
        threadId: 'thread-cli-runtime-listing-repair',
        cli: {
          command: 'ls',
          args: ['-la', listingRoot],
        },
      })

      expect(dispatchResult.ok).toBe(true)
      await forceTick!({ cardId: 'default' })

      const callbackEvent = getDialogueRespondedEvents()
        .find(event => String(event.turnId).startsWith('execution-callback:'))
      const callbackReply = String(callbackEvent?.structured?.reply ?? '')
      expect(callbackReply).toContain('目录')
      expect(callbackReply).toContain('小砖猿')
      expect(callbackReply).not.toContain('Listed entries')
      expect(callbackReply).not.toContain(encodedName)
      const deliveryAudit = vi.mocked(dbStub.appendAuditLog).mock.calls.map(call => call[0]).find(entry => entry?.category === 'alicization.executor.delivery' && entry?.action === 'delivered')
      expect(deliveryAudit).toEqual(expect.objectContaining({
        category: 'alicization.executor.delivery',
        action: 'delivered',
        payload: expect.objectContaining({
          source: expect.stringMatching(/llm-repaired|deterministic/u),
        }),
      }))
    }
    finally {
      await rm(listingRoot, {
        recursive: true,
        force: true,
      })
    }
  })

  it('restores pending execution delivery after restart and clears the persisted queue after delivery', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''

      if (systemText.includes('[SYSTEM OVERRIDE: 执行回调投递]')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            thought: 'restart callback delivery for settled cli thread',
            emotion: 'thinking',
            reply: '重启之后，我把刚才那条 CLI 结果接回来了：restart callback ok。',
            performance: {
              baseEmotion: 'thinking',
              delivery: 'calm',
              emphasis: 0,
            },
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({ type: 'text-delta', text: '{}' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })
    mockGenerateTextFromStreamText()

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const dispatchTaskThread = invokeHandlers.get(electronAlicizationDispatchTaskThread)
    const setActiveSession = invokeHandlers.get(electronAlicizationSetActiveSession)
    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
    expect(dispatchTaskThread).toBeTypeOf('function')
    expect(setActiveSession).toBeTypeOf('function')
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
    await setActiveSession!({
      cardId: 'default',
      sessionId: 'session-cli-runtime-restart',
    })

    let currentThread = {
      id: 'thread-cli-runtime-restart',
      decisionTraceId: 'mind:l9f3lq:dispatch-runtime-restart',
      turnId: 'turn-cli-runtime-restart',
      sessionId: 'session-cli-runtime-restart',
      origin: 'user-turn',
      goal: 'Run the CLI body and keep the result across restart.',
      kind: 'run-command',
      status: 'planned',
      selectedChannel: 'cli',
      proposedChannel: 'cli',
      summary: 'planned cli body',
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
      },
      createdAt: 100,
      updatedAt: 100,
      lastEventAt: null,
      completedAt: null,
    }
    const executionEvents: Array<any> = []
    const upsertedThreadInputs: Array<any> = []
    dbStub.getTaskThread.mockImplementation(async (id: string) => {
      if (id !== currentThread.id)
        return undefined
      return { ...currentThread }
    })
    dbStub.appendExecutionEvents.mockImplementation(async (events: Array<any>) => {
      executionEvents.push(...events)
      const latest = [...events].sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0)).at(-1)
      if (!latest)
        return
      currentThread = {
        ...currentThread,
        status: latest.threadStatus ?? currentThread.status,
        updatedAt: latest.createdAt ?? currentThread.updatedAt,
        lastEventAt: latest.createdAt ?? currentThread.lastEventAt,
        completedAt: latest.threadStatus === 'completed' || latest.threadStatus === 'failed' || latest.threadStatus === 'cancelled' || latest.threadStatus === 'blocked'
          ? (latest.createdAt ?? currentThread.completedAt)
          : currentThread.completedAt,
      }
    })
    dbStub.upsertTaskThread.mockImplementation(async (input: any) => {
      upsertedThreadInputs.push({ ...input })
      currentThread = {
        ...currentThread,
        ...input,
      }
      return { ...currentThread }
    })
    dbStub.listExecutionEvents.mockImplementation(async (input?: { threadId?: string }) => {
      if (input?.threadId && input.threadId !== currentThread.id)
        return []
      return executionEvents
        .filter(event => !input?.threadId || event.threadId === input.threadId)
        .sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0))
    })

    const dispatchResult = await dispatchTaskThread!({
      cardId: 'default',
      threadId: 'thread-cli-runtime-restart',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("restart callback ok")'],
      },
    })

    expect(dispatchResult.ok).toBe(true)
    expect(metaStore.get('execution_delivery_state_v1')).toContain('thread-cli-runtime-restart')
    expect(getDialogueRespondedEvents().filter(event => String(event.turnId).startsWith('execution-callback:'))).toHaveLength(0)

    await runAppBeforeQuitHandlers()
    invokeHandlers.clear()

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    let forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    expect(forceTick).toBeTypeOf('function')

    await forceTick!({ cardId: 'default' })

    expect(getDialogueRespondedEvents().filter(event => String(event.turnId).startsWith('execution-callback:'))).toHaveLength(1)
    expect(getDialogueRespondedEvents().find(event => String(event.turnId).startsWith('execution-callback:'))).toEqual(expect.objectContaining({
      sessionId: 'session-cli-runtime-restart',
      origin: 'subconscious-proactive',
      structured: expect.objectContaining({
        reply: expect.stringContaining('restart callback ok'),
      }),
    }))
    expect(metaStore.get('execution_delivery_state_v1')).toContain('"pending":[]')
    expect(metaStore.get('execution_delivery_state_v1')).toContain('"delivered":[{')

    await runAppBeforeQuitHandlers()
    invokeHandlers.clear()

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    expect(forceTick).toBeTypeOf('function')

    await forceTick!({ cardId: 'default' })

    expect(getDialogueRespondedEvents().filter(event =>
      String(event.turnId).startsWith('execution-callback:')
      && event.sessionId === 'session-cli-runtime-restart',
    )).toHaveLength(1)
  })

  it('blocks CLI dispatch when the card kill switch is suspended', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })
    setAlicizationCardKillSwitchState('default', 'SUSPENDED', 'dispatch-blocked')

    const dispatchTaskThread = invokeHandlers.get(electronAlicizationDispatchTaskThread)
    expect(dispatchTaskThread).toBeTypeOf('function')

    let currentThread = {
      id: 'thread-cli-runtime-blocked',
      decisionTraceId: 'mind:l9f3lq:dispatch-blocked',
      turnId: 'turn-cli-runtime-blocked',
      sessionId: 'session-cli-runtime-blocked',
      origin: 'user-turn',
      goal: 'Run the current CLI body.',
      kind: 'run-command',
      status: 'planned',
      selectedChannel: 'cli',
      proposedChannel: 'cli',
      summary: 'planned cli body',
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
      },
      createdAt: 100,
      updatedAt: 100,
      lastEventAt: null,
      completedAt: null,
    }
    dbStub.getTaskThread.mockImplementation(async (id: string) => {
      if (id !== currentThread.id)
        return undefined
      return { ...currentThread }
    })
    dbStub.appendExecutionEvents.mockImplementation(async (events: Array<any>) => {
      const latest = events.at(-1)
      if (!latest)
        return
      currentThread = {
        ...currentThread,
        status: latest.threadStatus ?? currentThread.status,
        updatedAt: latest.createdAt ?? currentThread.updatedAt,
        lastEventAt: latest.createdAt ?? currentThread.lastEventAt,
      }
    })
    dbStub.upsertTaskThread.mockImplementation(async (input: any) => {
      currentThread = {
        ...currentThread,
        ...input,
      }
      return { ...currentThread }
    })

    const result = await dispatchTaskThread!({
      cardId: 'default',
      threadId: 'thread-cli-runtime-blocked',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("never runs")'],
      },
    })

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      createdEventKinds: ['cancel'],
      thread: expect.objectContaining({
        id: 'thread-cli-runtime-blocked',
        status: 'blocked',
      }),
      errorCode: 'TASK_THREAD_KILL_SWITCH_BLOCKED',
    }))
    expect(dbStub.appendExecutionEvents).toBeCalledWith([
      expect.objectContaining({
        kind: 'cancel',
        threadStatus: 'blocked',
      }),
    ])
  })

  it('appends and lists executor events through invoke handlers', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendExecutionEvents = invokeHandlers.get(electronAlicizationAppendExecutionEvents)
    const listExecutionEvents = invokeHandlers.get(electronAlicizationListExecutionEvents)
    expect(appendExecutionEvents).toBeTypeOf('function')
    expect(listExecutionEvents).toBeTypeOf('function')

    await appendExecutionEvents!({
      cardId: 'default',
      events: [{
        threadId: 'thread-claw-1',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        channel: 'codex',
        kind: 'dispatch',
        threadStatus: 'running',
        payload: {
          adapter: 'codex',
        },
      }],
    })

    expect(dbStub.appendExecutionEvents).toBeCalledWith([
      expect.objectContaining({
        threadId: 'thread-claw-1',
        kind: 'dispatch',
        threadStatus: 'running',
      }),
    ])

    dbStub.listExecutionEvents.mockResolvedValue([
      {
        id: 'exec-1',
        threadId: 'thread-claw-1',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        channel: 'codex',
        kind: 'dispatch',
        threadStatus: 'running',
        payload: {
          adapter: 'codex',
        },
        createdAt: 200,
      },
    ])

    const rows = await listExecutionEvents!({
      cardId: 'default',
      threadId: 'thread-claw-1',
      limit: 20,
    })

    expect(dbStub.listExecutionEvents).toBeCalledWith({
      threadId: 'thread-claw-1',
      decisionTraceId: undefined,
      turnId: undefined,
      limit: 20,
    })
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'exec-1',
        kind: 'dispatch',
      }),
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

  it('persists transparent failure artifacts for audit without running dialogue learning side effects', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    dbStub.appendConversationTurn.mockClear()
    dbStub.appendSubconsciousFragments.mockClear()
    dbStub.appendRelationshipOutcomes.mockClear()
    dbStub.appendEpisodicEvents.mockClear()
    dbStub.appendPersonaReinforcementEvents.mockClear()
    dbStub.appendPersonStateEvolutionEntries.mockClear()
    dbStub.upsertMemoryReflections.mockClear()
    dbStub.insertLearningTask.mockClear()

    const failureKinds = [
      'timeout',
      'provider-auth',
      'provider-schema-unsupported',
      'stream-failure',
      'recall-failure',
      'memory-persistence',
    ] as const

    for (const [index, kind] of failureKinds.entries()) {
      const failureSurface = resolveAlicizationChatFailureSurface({ kind })
      await appendConversationTurn!({
        cardId: 'default',
        turnId: `turn-failure-learning-gate-${kind}`,
        sessionId: 'session-failure-learning-gate',
        userText: `失败请求 ${kind}`,
        assistantText: failureSurface.reply,
        structured: {
          thought: '',
          emotion: 'concerned',
          reply: failureSurface.reply,
          format: 'mind-turn-v1',
          origin: failureSurface.origin,
          learningPolicy: {
            allowLongTermCondensation: failureSurface.allowLongTermCondensation,
            allowPersonaLearning: failureSurface.allowPersonaLearning,
            allowTraining: failureSurface.allowTraining,
          },
          failureSurface,
        },
        createdAt: 20_000 + index,
      })
    }

    expect(dbStub.appendConversationTurn).toBeCalledTimes(failureKinds.length)
    for (const [persisted] of dbStub.appendConversationTurn.mock.calls) {
      expect(persisted.structured).toMatchObject({
        origin: 'failure-surface',
        learningPolicy: {
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        },
        failureSurface: {
          origin: 'failure-surface',
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        },
      })
    }
    expect(dbStub.appendSubconsciousFragments).not.toBeCalled()
    expect(dbStub.appendRelationshipOutcomes).not.toBeCalled()
    expect(dbStub.appendEpisodicEvents).not.toBeCalled()
    expect(dbStub.appendPersonaReinforcementEvents).not.toBeCalled()
    expect(dbStub.appendPersonStateEvolutionEntries).not.toBeCalled()
    expect(dbStub.upsertMemoryReflections).not.toBeCalled()
    expect(dbStub.insertLearningTask).not.toBeCalled()
  })

  it('blocks untyped visible artifacts from dialogue learning side effects', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    dbStub.appendConversationTurn.mockClear()
    dbStub.appendSubconsciousFragments.mockClear()
    dbStub.appendRelationshipOutcomes.mockClear()
    dbStub.appendEpisodicEvents.mockClear()
    dbStub.appendPersonaReinforcementEvents.mockClear()
    dbStub.appendPersonStateEvolutionEntries.mockClear()
    dbStub.upsertMemoryReflections.mockClear()
    dbStub.insertLearningTask.mockClear()

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-untyped-learning-gate',
      sessionId: 'session-untyped-learning-gate',
      userText: '这是一段没有来源 metadata 的原始转录。',
      assistantText: 'Untyped assistant text',
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: 'Untyped assistant text',
        format: 'mind-turn-v1',
      },
      createdAt: 25_000,
    })

    expect(dbStub.appendConversationTurn).toBeCalledTimes(1)
    expect(dbStub.appendSubconsciousFragments).not.toBeCalled()
    expect(dbStub.appendRelationshipOutcomes).not.toBeCalled()
    expect(dbStub.appendEpisodicEvents).not.toBeCalled()
    expect(dbStub.appendPersonaReinforcementEvents).not.toBeCalled()
    expect(dbStub.appendPersonStateEvolutionEntries).not.toBeCalled()
    expect(dbStub.upsertMemoryReflections).not.toBeCalled()
    expect(dbStub.insertLearningTask).not.toBeCalled()
  })

  it('persists memory side failures separately without replacing or re-emitting the Provider reply', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    dbStub.appendConversationTurn.mockClear()
    const sideFailure = {
      ...resolveAlicizationChatFailureSurface({
        kind: 'recall-failure',
      }),
      stage: 'long-term-memory-recall',
      cardId: 'default',
      turnId: 'turn-provider-memory-side-failure',
      occurredAt: 30_001,
      errorSummary: 'vector recall offline',
    }

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-provider-memory-side-failure',
      sessionId: 'session-provider-memory-side-failure',
      userText: '继续刚才的记忆话题',
      assistantText: 'Provider reply',
      structured: {
        format: 'mind-turn-v1',
        thought: '',
        emotion: 'neutral',
        reply: 'Provider reply',
        origin: 'provider',
        learningPolicy: {
          allowLongTermCondensation: true,
          allowPersonaLearning: true,
          allowTraining: false,
        },
        memoryFailures: [sideFailure],
      },
      createdAt: 30_000,
    })

    expect(dbStub.appendConversationTurn).toBeCalledTimes(2)
    const [providerArtifact] = dbStub.appendConversationTurn.mock.calls[0] ?? []
    const [failureArtifact] = dbStub.appendConversationTurn.mock.calls[1] ?? []
    expect(providerArtifact).toMatchObject({
      turnId: 'turn-provider-memory-side-failure',
      assistantText: 'Provider reply',
      structured: {
        origin: 'provider',
        reply: 'Provider reply',
      },
    })
    expect(failureArtifact).toMatchObject({
      turnId: 'turn-provider-memory-side-failure:memory-failure:long-term-memory-recall:0',
      sessionId: 'session-provider-memory-side-failure',
      structured: {
        format: 'alicization-memory-side-failure-v1',
        origin: 'failure-surface',
        artifactRole: 'memory-side-failure',
        parentTurnId: 'turn-provider-memory-side-failure',
        stage: 'long-term-memory-recall',
        learningPolicy: {
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        },
        failureSurface: {
          kind: 'recall-failure',
          origin: 'failure-surface',
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        },
      },
    })
    expect(failureArtifact?.assistantText).toBeUndefined()

    const dialogueEvents = getDialogueRespondedEvents()
    expect(dialogueEvents).toHaveLength(1)
    expect(dialogueEvents[0]).toMatchObject({
      assistantText: 'Provider reply',
      structured: {
        origin: 'provider',
        reply: 'Provider reply',
      },
    })
  })

  it('keeps the Provider reply when memory side failure persistence fails and records an audit', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(appendConversationTurn).toBeTypeOf('function')

    dbStub.appendConversationTurn.mockClear()
    dbStub.appendAuditLog.mockClear()
    dbStub.appendConversationTurn
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('side artifact write failed'))

    const sideFailure = {
      ...resolveAlicizationChatFailureSurface({
        kind: 'memory-persistence',
      }),
      stage: 'working-memory-long-term-queue',
      cardId: 'default',
      turnId: 'turn-provider-side-persistence-failure',
      occurredAt: 31_001,
      errorSummary: 'queue write failed',
    }

    await expect(appendConversationTurn!({
      cardId: 'default',
      turnId: 'turn-provider-side-persistence-failure',
      sessionId: 'session-provider-side-persistence-failure',
      userText: '继续记忆闭环',
      assistantText: 'Provider reply survives',
      structured: {
        format: 'mind-turn-v1',
        thought: '',
        emotion: 'neutral',
        reply: 'Provider reply survives',
        origin: 'provider',
        learningPolicy: {
          allowLongTermCondensation: true,
          allowPersonaLearning: true,
          allowTraining: false,
        },
        memoryFailures: [sideFailure],
      },
      createdAt: 31_000,
    })).resolves.toBeUndefined()

    expect(dbStub.appendConversationTurn).toBeCalledTimes(2)
    const dialogueEvents = getDialogueRespondedEvents()
    expect(dialogueEvents).toHaveLength(1)
    expect(dialogueEvents[0]).toMatchObject({
      assistantText: 'Provider reply survives',
      structured: {
        origin: 'provider',
        reply: 'Provider reply survives',
      },
    })

    const persistenceAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry =>
        entry.category === 'alicization.dialogue'
        && entry.action === 'memory-side-failure-persistence-failed',
      )
    expect(persistenceAudit).toMatchObject({
      level: 'warning',
      payload: {
        parentTurnId: 'turn-provider-side-persistence-failure',
        stage: 'working-memory-long-term-queue',
        failureKind: 'memory-persistence',
        reason: 'side artifact write failed',
      },
    })
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
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      await emitRuntimeTestReply({
        messages,
        onEvent,
        reply: 'done',
      })
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
      messages: [{ role: 'user', content: '请逐字复述这句英文：User enjoys coding sessions with focus.' }],
    })
    expect(startResult.accepted).toBe(true)
    expect(startResult.governance?.dialogueActKernel?.openingMove).toBeTruthy()
    expect(startResult.governance?.dialogueActKernel?.selectedEvidence.length ?? 0).toBeGreaterThan(0)
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
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      await emitRuntimeTestReply({
        messages,
        onEvent,
        reply: 'direct transport reply',
      })
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

  it('keeps visible chunk surface separated from structured finish payload in main chat runtime', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ onEvent }) => {
      const structuredReply = JSON.stringify(buildRuntimeMindTurnReply({
        reply: 'User enjoys coding sessions with focus.',
      }))
      const firstBoundary = Math.floor(structuredReply.length / 3)
      const secondBoundary = Math.floor(structuredReply.length * 2 / 3)
      await onEvent?.({ type: 'text-delta', text: structuredReply.slice(0, firstBoundary) })
      await onEvent?.({ type: 'text-delta', text: structuredReply.slice(firstBoundary, secondBoundary) })
      await onEvent?.({ type: 'text-delta', text: structuredReply.slice(secondBoundary) })
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
      messages: [{ role: 'user', content: '请逐字复述这句英文：User enjoys coding sessions with focus.' }],
    })
    expect(startResult.accepted).toBe(true)

    await waitForChatFinishEvent(turnId)

    const chunkEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamChunk && payload.turnId === turnId)
      .map(([, payload]) => payload)
    const finishEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      .map(([, payload]) => payload)

    const visibleReply = chunkEvents.map(event => event.text).join('')
    const persistedFullText = String(finishEvents[0]?.fullText ?? '')
    expect(visibleReply.length).toBeGreaterThan(0)
    if (persistedFullText.trim().startsWith('{')) {
      const parsed = JSON.parse(persistedFullText) as { reply?: string, format?: string }
      expect(parsed.format).toBe('mind-turn-v1')
      expect(parsed.reply).toBe(visibleReply)
    }
    else {
      expect(persistedFullText).toBe(visibleReply)
    }
  })

  it('injects card custom directives into main chat runtime messages as highest-priority system block', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await emitRuntimeTestReply({
        messages,
        onEvent,
        reply: 'directive applied',
      })
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

    await waitForChatFinishEvent(turnId)

    const systemText = capturedMessages
      .filter(message => message.role === 'system')
      .map(message => typeof message.content === 'string' ? message.content : '')
      .join('\n\n')
    expect(systemText).toContain('"type":"alicization-persona-directives"')
    expect(systemText).toContain('严格而克制的教练型人格')
    expect(systemText).not.toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expect(systemText).not.toContain('[ALICIZATION_PROJECT_STATE]')
    expect(systemText).not.toMatch(/ProjectSelfBrief|SELF_BRIEF|OWNER_BOUNDARY/u)
  }, 15_000)

  it('drops renderer-only error messages before provider streaming', async () => {
    const sandboxPath = await createSandboxPath()
    let capturedMessages: Array<{ role?: string, content?: unknown }> = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessages = Array.isArray(messages) ? messages : []
      await emitRuntimeTestReply({
        messages,
        onEvent,
        reply: 'sanitized',
      })
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

    await waitForChatFinishEvent(turnId)

    expect(capturedMessages.some(message => message.role === 'error')).toBe(false)
    expect(capturedMessages.some(message => message.role === 'user' && message.content === 'hello again')).toBe(true)
  })

  it('preserves multimodal user content instead of stringifying image parts', async () => {
    const sandboxPath = await createSandboxPath()
    const capturedMessageBatches: Array<Array<{ role?: string, content?: unknown }>> = []
    generateTextMock.mockImplementation(async ({ messages }) => {
      capturedMessageBatches.push(Array.isArray(messages) ? messages : [])
      return {
        text: JSON.stringify(buildRuntimeMindTurnReply({
          reply: 'vision-ready',
        })),
        finishReason: 'stop',
      }
    })
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedMessageBatches.push(Array.isArray(messages) ? messages : [])
      await emitRuntimeTestReply({
        messages,
        onEvent,
        reply: 'vision-ready',
      })
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

    const multimodalUserMessage = capturedMessageBatches.flat().find((message) => {
      if (message.role !== 'user' || !Array.isArray(message.content))
        return false
      const serialized = JSON.stringify(message.content)
      return serialized.includes('image_url') && serialized.includes('user-supplied-image')
    })
    expect(multimodalUserMessage).toBeTruthy()
  })

  it('uses Alicization attention anchor to ground invited inspection after the chat window becomes frontmost', async () => {
    const sandboxPath = await createSandboxPath()
    const cardId = 'attention-anchor-card'
    const capturedProviderMessageBatches: Array<Array<{ role?: string, content?: unknown }>> = []
    generateTextMock.mockImplementation(async ({ messages, responseFormat }) => {
      const batch = Array.isArray(messages) ? messages : []
      const systemText = batch
        .filter(message => message.role === 'system')
        .map(message => String(message.content ?? ''))
        .join('\n\n')
      if (systemText.includes('You classify a screen snapshot for Alicization proactive policy.')) {
        return {
          text: JSON.stringify({
            workload: 'coding',
            content: 'diff',
            summary: 'anchored cursor diff',
            confidence: 0.94,
            matchedLabels: ['cursor', 'diff'],
          }),
          finishReason: 'stop',
        }
      }
      if (responseFormat)
        capturedProviderMessageBatches.push(batch)
      return {
        text: JSON.stringify(buildRuntimeMindTurnReply({
          reply: 'anchored inspection reply',
        })),
        finishReason: 'stop',
      }
    })
    streamTextMock.mockImplementation(async ({ messages, onEvent }) => {
      capturedProviderMessageBatches.push(Array.isArray(messages) ? messages : [])
      await emitRuntimeTestReply({
        messages,
        onEvent,
        reply: 'anchored inspection reply',
      })
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
    await getSensorySnapshot!({ cardId })

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
      cardId,
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

    const latestUserMessage = capturedProviderMessageBatches
      .flat()
      .find(message =>
        message.role === 'user'
        && Array.isArray(message.content)
        && JSON.stringify(message.content).includes('anchored-cursor-diff'),
      )
    expect(Array.isArray(latestUserMessage?.content)).toBe(true)
    expect(JSON.stringify(latestUserMessage?.content)).toContain('anchored-cursor-diff')
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
    const cardId = 'screen-semantic-hydration-card'
    generateTextMock.mockImplementation(async ({ messages }) => {
      const batch = Array.isArray(messages) ? messages : []
      const systemText = batch
        .filter(message => message.role === 'system')
        .map(message => String(message.content ?? ''))
        .join('\n\n')
      if (systemText.includes('You classify a screen snapshot for Alicization proactive policy.')) {
        return {
          text: JSON.stringify({
            workload: 'coding',
            content: 'diff',
            summary: 'cursor diff with removed guard',
            confidence: 0.94,
            matchedLabels: ['cursor', 'diff'],
          }),
          finishReason: 'stop',
        }
      }
      return {
        text: JSON.stringify(buildRuntimeMindTurnReply({
          reply: 'grounded inspection reply',
        })),
        finishReason: 'stop',
      }
    })
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      await emitRuntimeTestReply({
        messages,
        onEvent,
        reply: 'grounded inspection reply',
      })
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
    await getSensorySnapshot!({ cardId })

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
      cardId,
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

    const perceptionAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry =>
        entry.category === 'alicization.perception'
        && entry.action === 'inspection-grounded'
        && entry.payload?.cardId === cardId,
      )
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

    await waitForChatToolCallEvent(firstTurnId)

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

    await waitForChatFinishEvent(followUpTurnId)

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

    await waitForChatToolCallEvent(firstTurnId)

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

    await waitForChatFinishEvent(followUpTurnId)

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

  it('keeps inspection turns in live-observed fallback when sender capture diagnostics report no live source', async () => {
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
    const getVisualPresenceState = invokeHandlers.get(electronAlicizationGetVisualPresenceState)
    expect(getSensorySnapshot).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')
    expect(getVisualPresenceState).toBeTypeOf('function')

    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'runtime.ts - diff',
    }
    await getSensorySnapshot!({ cardId: 'default' })

    screenCaptureDiagnosticsBySenderId.set(91, {
      updatedAt: 2_100,
      window: {
        id: 5,
        title: 'Alicization Workspace',
      },
      permissionStatus: 'granted',
      renderer: {
        updatedAt: 2_080,
        sessionState: {
          phase: 'idle',
          reason: 'no-source-selected',
          selectedSourceId: null,
          currentSourceId: null,
          sourcePreference: 'auto',
          lastUsedAt: null,
          lastError: null,
        },
      },
      main: {
        getSources: {
          inFlight: false,
          requestedAt: 2_000,
          completedAt: 2_040,
          durationMs: 40,
          options: {
            types: ['screen'],
          },
          sourceCount: 0,
          error: null,
        },
        lease: {
          status: 'idle',
          handle: null,
          sourceId: null,
          ownerWindowId: null,
          ownerWebContentsId: 91,
          acquiredAt: null,
          expiresAt: null,
          timeoutMs: null,
          options: null,
          releasedAt: 2_050,
          releaseReason: 'manual-reset',
        },
      },
    })

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
    }, {
      raw: {
        ipcMainEvent: {
          sender: {
            id: 91,
            isDestroyed: () => true,
          },
        },
      },
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
    const visualPresenceState = await getVisualPresenceState!({ cardId: 'default' })
    expect(systemText).toContain('runtime.ts diff with removed null guard')
    expect(systemText).toContain('Current capture path health: unavailable (sources-empty).')

    const perceptionAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find(entry => entry.category === 'alicization.perception' && entry.action === 'inspection-grounding-skipped')
    expect(perceptionAudit?.payload).toEqual(expect.objectContaining({
      reason: 'screen-capture-sources-empty',
      captureHealth: 'unavailable',
      captureTruthMode: 'live-observed-only',
      groundingContinuity: expect.objectContaining({
        groundedThisTurn: false,
        source: 'none',
      }),
      executiveBrief: expect.objectContaining({
        truthState: 'live-observed',
      }),
    }))
    expect(visualPresenceState?.captureState).toEqual(expect.objectContaining({
      permission: 'granted',
      health: 'unavailable',
      degradedReason: 'screen-capture-sources-empty',
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
        digitalLifeArchitecture: expect.objectContaining({
          summary: expect.stringContaining('mode='),
          dominantSystem: expect.any(String),
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

    let dispatchPayloads: any[] = []
    await vi.waitFor(() => {
      dispatchPayloads = fakeIpcMainEvent.sender.send.mock.calls
        .filter(([channel]) => channel === alicizationChatStreamDispatchChannel)
        .map(([, payload]) => payload)
      expect(dispatchPayloads.some(payload => payload?.eventType === 'finish')).toBe(true)
    })
    const chunkDispatch = dispatchPayloads.find(payload => payload?.eventType === 'chunk')
    const finishDispatch = dispatchPayloads.find(payload => payload?.eventType === 'finish')
    expect(chunkDispatch).toEqual(expect.objectContaining({
      body: expect.objectContaining({
        cardId: 'default',
        turnId,
        text: 'sender-bound-chunk',
      }),
    }))
    expect(finishDispatch).toEqual(expect.objectContaining({
      body: expect.objectContaining({
        cardId: 'default',
        turnId,
        status: 'completed',
      }),
    }))
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

  it('exposes structured browser workflow context from runtime desktopInspectScene', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Google Chrome',
      processName: 'Google Chrome',
      title: 'Alicization - 百度搜索',
    }
    localBrowserAutomationOverrides.readPage = vi.fn(async (input: { format?: string }) => {
      if (input.format === 'interactables') {
        return {
          status: 'completed',
          operation: 'browser_read_page',
          browser: 'chrome',
          url: 'https://www.baidu.com/s?wd=alicization',
          title: 'Alicization - 百度搜索',
          interactables: [
            {
              tag: 'a',
              role: 'link',
              type: null,
              text: 'Alicization 官方文档',
              ariaLabel: null,
              title: null,
              href: 'https://example.com/doc',
              disabled: false,
            },
            {
              tag: 'a',
              role: 'link',
              type: null,
              text: 'Alicization GitHub',
              ariaLabel: null,
              title: null,
              href: 'https://github.com/example',
              disabled: false,
            },
          ],
          content: '',
          output: '',
        }
      }

      return {
        status: 'completed',
        operation: 'browser_read_page',
        browser: 'chrome',
        url: 'https://www.baidu.com/s?wd=alicization',
        title: 'Alicization - 百度搜索',
        content: '百度为您找到相关结果约 10,000 个',
        output: '百度为您找到相关结果约 10,000 个',
      }
    })
    localBrowserAutomationOverrides.listDesktopInteractables = vi.fn(async () => ({
      status: 'completed',
      operation: 'desktop_list_interactables',
      interactables: [],
      output: '',
    }))

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const desktopInspectScene = runtimeTestInternals.currentDesktopInspectScene
    expect(desktopInspectScene).toBeTypeOf('function')
    if (!desktopInspectScene)
      return

    const toolResultEvent = (await desktopInspectScene({
      cardId: 'default',
      question: '帮我从百度结果里继续找',
      maxSuggestedActions: 3,
    })) as any

    expect(toolResultEvent).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      pagePhase: 'search-results',
      nextActionIntent: 'open-search-result',
      browserPageContext: expect.objectContaining({
        browser: 'chrome',
        url: 'https://www.baidu.com/s?wd=alicization',
      }),
      executionStrategy: expect.objectContaining({
        mode: 'browser-dom',
        recommendedChannel: 'browser',
      }),
      workflowPlan: expect.objectContaining({
        continuationMode: 'ready-to-act',
        targetPhase: 'content-detail',
        advanceCondition: 'search-result-opened-and-detail-page-visible',
        failureCondition: 'search-results-still-visible-after-click',
      }),
    }))
    expect(toolResultEvent.workflowPlan?.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'open-top-result',
        toolName: 'browser_click_element',
        postActionExpectedPhase: 'content-detail',
      }),
      expect.objectContaining({
        id: 'wait-navigation',
        toolName: 'browser_wait',
        postActionExpectedPhase: 'content-detail',
      }),
    ]))

    const outputRecord = JSON.parse(String(toolResultEvent.output))
    expect(outputRecord).toEqual(expect.objectContaining({
      pagePhase: 'search-results',
      nextActionIntent: 'open-search-result',
      workflowPlan: expect.objectContaining({
        targetPhase: 'content-detail',
      }),
      executionStrategy: expect.objectContaining({
        mode: 'browser-dom',
      }),
    }))
  })

  it('persists browser workflow progression across repeated runtime desktopInspectScene calls', async () => {
    const sandboxPath = await createSandboxPath()
    let sceneMode: 'detail' | 'search-results' = 'search-results'
    foregroundWindowSample = {
      appName: 'Google Chrome',
      processName: 'Google Chrome',
      title: 'Alicization - 百度搜索',
    }
    localBrowserAutomationOverrides.readPage = vi.fn(async (input: { format?: string }) => {
      if (sceneMode === 'search-results') {
        if (input.format === 'interactables') {
          return {
            status: 'completed',
            operation: 'browser_read_page',
            browser: 'chrome',
            url: 'https://www.baidu.com/s?wd=alicization',
            title: 'Alicization - 百度搜索',
            interactables: [
              {
                tag: 'a',
                role: 'link',
                type: null,
                text: 'Alicization 官方文档',
                ariaLabel: null,
                title: null,
                href: 'https://example.com/doc',
                disabled: false,
              },
            ],
            content: '',
            output: '',
          }
        }

        return {
          status: 'completed',
          operation: 'browser_read_page',
          browser: 'chrome',
          url: 'https://www.baidu.com/s?wd=alicization',
          title: 'Alicization - 百度搜索',
          content: '百度为您找到相关结果约 10,000 个',
          output: '百度为您找到相关结果约 10,000 个',
        }
      }

      if (input.format === 'interactables') {
        return {
          status: 'completed',
          operation: 'browser_read_page',
          browser: 'chrome',
          url: 'https://example.com/doc',
          title: 'Alicization 官方文档',
          interactables: [
            {
              tag: 'button',
              role: 'button',
              type: 'button',
              text: '继续阅读',
              ariaLabel: null,
              title: null,
              href: null,
              disabled: false,
            },
          ],
          content: '',
          output: '',
        }
      }

      return {
        status: 'completed',
        operation: 'browser_read_page',
        browser: 'chrome',
        url: 'https://example.com/doc',
        title: 'Alicization 官方文档',
        content: '这里是 Alicization 正文内容。',
        output: '这里是 Alicization 正文内容。',
      }
    })
    localBrowserAutomationOverrides.listDesktopInteractables = vi.fn(async () => ({
      status: 'completed',
      operation: 'desktop_list_interactables',
      interactables: [],
      output: '',
    }))

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const desktopInspectScene = runtimeTestInternals.currentDesktopInspectScene
    expect(desktopInspectScene).toBeTypeOf('function')
    if (!desktopInspectScene)
      return

    const firstResult = (await desktopInspectScene({
      cardId: 'default',
      question: '帮我从百度结果里继续找',
      maxSuggestedActions: 3,
    })) as any

    expect(firstResult.workflowState).toEqual(expect.objectContaining({
      currentPhase: 'search-results',
      previousPhase: null,
      progressState: 'started',
      targetPhase: 'content-detail',
    }))

    let persistedState = JSON.parse(metaStore.get('perception_state_v1') ?? '{}')
    expect(persistedState.browserWorkflowState).toEqual(expect.objectContaining({
      currentPhase: 'search-results',
      progressState: 'started',
      targetPhase: 'content-detail',
    }))

    sceneMode = 'detail'
    foregroundWindowSample = {
      appName: 'Google Chrome',
      processName: 'Google Chrome',
      title: 'Alicization 官方文档',
    }

    const secondResult = (await desktopInspectScene({
      cardId: 'default',
      question: '帮我从百度结果里继续找',
      maxSuggestedActions: 3,
    })) as any

    expect(secondResult.workflowState).toEqual(expect.objectContaining({
      currentPhase: 'content-detail',
      previousPhase: 'search-results',
      progressState: 'advanced',
      targetPhase: 'content-detail',
    }))

    persistedState = JSON.parse(metaStore.get('perception_state_v1') ?? '{}')
    expect(persistedState.browserWorkflowState).toEqual(expect.objectContaining({
      currentPhase: 'content-detail',
      previousPhase: 'search-results',
      progressState: 'advanced',
      targetPhase: 'content-detail',
    }))
    expect(persistedState.browserWorkflowState.history).toHaveLength(2)
  })

  it('persists login workflow progression across repeated runtime desktopInspectScene calls', async () => {
    const sandboxPath = await createSandboxPath()
    let sceneMode: 'detail' | 'login' = 'login'
    foregroundWindowSample = {
      appName: 'Google Chrome',
      processName: 'Google Chrome',
      title: 'Example Login',
    }
    localBrowserAutomationOverrides.readPage = vi.fn(async (input: { format?: string }) => {
      if (sceneMode === 'login') {
        if (input.format === 'interactables') {
          return {
            status: 'completed',
            operation: 'browser_read_page',
            browser: 'chrome',
            url: 'https://example.com/login',
            title: 'Example Login',
            interactables: [
              {
                tag: 'input',
                role: 'textbox',
                type: 'email',
                text: '邮箱',
                ariaLabel: '邮箱',
                title: null,
                href: null,
                disabled: false,
              },
              {
                tag: 'input',
                role: 'textbox',
                type: 'password',
                text: '密码',
                ariaLabel: '密码',
                title: null,
                href: null,
                disabled: false,
              },
              {
                tag: 'button',
                role: 'button',
                type: 'submit',
                text: '登录',
                ariaLabel: null,
                title: null,
                href: null,
                disabled: false,
              },
            ],
            content: '',
            output: '',
          }
        }

        return {
          status: 'completed',
          operation: 'browser_read_page',
          browser: 'chrome',
          url: 'https://example.com/login',
          title: 'Example Login',
          content: 'Please sign in to continue with your email and password.',
          output: 'Please sign in to continue with your email and password.',
        }
      }

      if (input.format === 'interactables') {
        return {
          status: 'completed',
          operation: 'browser_read_page',
          browser: 'chrome',
          url: 'https://example.com/dashboard',
          title: 'Example Dashboard',
          interactables: [
            {
              tag: 'a',
              role: 'link',
              type: null,
              text: '项目文档',
              ariaLabel: null,
              title: null,
              href: 'https://example.com/docs',
              disabled: false,
            },
          ],
          content: '',
          output: '',
        }
      }

      return {
        status: 'completed',
        operation: 'browser_read_page',
        browser: 'chrome',
        url: 'https://example.com/dashboard',
        title: 'Example Dashboard',
        content: 'Welcome back to your dashboard.',
        output: 'Welcome back to your dashboard.',
      }
    })
    localBrowserAutomationOverrides.listDesktopInteractables = vi.fn(async () => ({
      status: 'completed',
      operation: 'desktop_list_interactables',
      interactables: [],
      output: '',
    }))

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const desktopInspectScene = runtimeTestInternals.currentDesktopInspectScene
    expect(desktopInspectScene).toBeTypeOf('function')
    if (!desktopInspectScene)
      return

    const firstResult = (await desktopInspectScene({
      cardId: 'default',
      question: '帮我继续登录',
      maxSuggestedActions: 3,
    })) as any

    expect(firstResult.pagePhase).toBe('login')
    expect(firstResult.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'await-host-input',
      targetPhase: 'content-detail',
    }))
    expect(firstResult.workflowState).toEqual(expect.objectContaining({
      currentPhase: 'login',
      previousPhase: null,
      progressState: 'started',
      targetPhase: 'content-detail',
    }))

    let persistedState = JSON.parse(metaStore.get('perception_state_v1') ?? '{}')
    expect(persistedState.browserWorkflowState).toEqual(expect.objectContaining({
      currentPhase: 'login',
      progressState: 'started',
      targetPhase: 'content-detail',
    }))

    sceneMode = 'detail'
    foregroundWindowSample = {
      appName: 'Google Chrome',
      processName: 'Google Chrome',
      title: 'Example Dashboard',
    }

    const secondResult = (await desktopInspectScene({
      cardId: 'default',
      question: '帮我继续登录',
      maxSuggestedActions: 3,
    })) as any

    expect(secondResult.pagePhase).toBe('content-detail')
    expect(secondResult.workflowState).toEqual(expect.objectContaining({
      currentPhase: 'content-detail',
      previousPhase: 'login',
      progressState: 'advanced',
      targetPhase: 'content-detail',
    }))

    persistedState = JSON.parse(metaStore.get('perception_state_v1') ?? '{}')
    expect(persistedState.browserWorkflowState).toEqual(expect.objectContaining({
      currentPhase: 'content-detail',
      previousPhase: 'login',
      progressState: 'advanced',
      targetPhase: 'content-detail',
    }))
    expect(persistedState.browserWorkflowState.history).toHaveLength(2)
  })

  it('persists browser-desktop handoff progression across repeated runtime desktopInspectScene calls', async () => {
    const sandboxPath = await createSandboxPath()
    let sceneMode: 'handoff' | 'upload' = 'handoff'
    foregroundWindowSample = {
      appName: 'Google Chrome',
      processName: 'Google Chrome',
      title: 'Choose File',
    }
    localBrowserAutomationOverrides.readPage = vi.fn(async (input: { format?: string }) => {
      if (sceneMode === 'handoff') {
        if (input.format === 'interactables') {
          return {
            status: 'completed',
            operation: 'browser_read_page',
            browser: 'chrome',
            url: 'https://example.com/upload',
            title: 'Upload',
            interactables: [
              {
                tag: 'button',
                role: 'button',
                type: 'button',
                text: '选择文件',
                ariaLabel: null,
                title: null,
                href: null,
                disabled: false,
              },
            ],
            content: '',
            output: '',
          }
        }

        return {
          status: 'completed',
          operation: 'browser_read_page',
          browser: 'chrome',
          url: 'https://example.com/upload',
          title: 'Upload',
          content: 'Select a file to upload.',
          output: 'Select a file to upload.',
        }
      }

      if (input.format === 'interactables') {
        return {
          status: 'completed',
          operation: 'browser_read_page',
          browser: 'chrome',
          url: 'https://example.com/upload',
          title: 'Upload asset',
          interactables: [
            {
              tag: 'button',
              role: 'button',
              type: 'submit',
              text: '上传',
              ariaLabel: null,
              title: null,
              href: null,
              disabled: false,
            },
          ],
          content: '',
          output: '',
        }
      }

      return {
        status: 'completed',
        operation: 'browser_read_page',
        browser: 'chrome',
        url: 'https://example.com/upload',
        title: 'Upload asset',
        content: 'Upload asset and finish the form.',
        output: 'Upload asset and finish the form.',
      }
    })
    localBrowserAutomationOverrides.listDesktopInteractables = vi.fn(async () => {
      if (sceneMode === 'handoff') {
        return {
          status: 'completed',
          operation: 'desktop_list_interactables',
          interactables: [
            { ordinal: 1, role: 'button', text: '打开', enabled: true, actions: ['AXPress'] },
            { ordinal: 2, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
            { ordinal: 3, role: 'input', text: '文件名', enabled: true, actions: [] },
          ],
          output: '',
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_list_interactables',
        interactables: [],
        output: '',
      }
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const desktopInspectScene = runtimeTestInternals.currentDesktopInspectScene
    expect(desktopInspectScene).toBeTypeOf('function')
    if (!desktopInspectScene)
      return

    const firstResult = (await desktopInspectScene({
      cardId: 'default',
      question: '帮我完成文件上传',
      maxSuggestedActions: 3,
    })) as any

    expect(firstResult.pagePhase).toBe('browser-desktop-handoff')
    expect(firstResult.executionStrategy).toEqual(expect.objectContaining({
      mode: 'browser-desktop-handoff',
      recommendedChannel: 'desktop',
    }))
    expect(firstResult.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'handoff-to-desktop',
      targetPhase: 'upload-flow',
    }))
    expect(firstResult.workflowState).toEqual(expect.objectContaining({
      currentPhase: 'browser-desktop-handoff',
      previousPhase: null,
      progressState: 'started',
      targetPhase: 'upload-flow',
    }))

    let persistedState = JSON.parse(metaStore.get('perception_state_v1') ?? '{}')
    expect(persistedState.browserWorkflowState).toEqual(expect.objectContaining({
      currentPhase: 'browser-desktop-handoff',
      progressState: 'started',
      targetPhase: 'upload-flow',
    }))

    sceneMode = 'upload'
    foregroundWindowSample = {
      appName: 'Google Chrome',
      processName: 'Google Chrome',
      title: 'Upload asset',
    }

    const secondResult = (await desktopInspectScene({
      cardId: 'default',
      question: '帮我完成文件上传',
      maxSuggestedActions: 3,
    })) as any

    expect(secondResult.pagePhase).toBe('upload-flow')
    expect(secondResult.workflowState).toEqual(expect.objectContaining({
      currentPhase: 'upload-flow',
      previousPhase: 'browser-desktop-handoff',
      progressState: 'advanced',
      targetPhase: 'content-detail',
    }))

    persistedState = JSON.parse(metaStore.get('perception_state_v1') ?? '{}')
    expect(persistedState.browserWorkflowState).toEqual(expect.objectContaining({
      currentPhase: 'upload-flow',
      previousPhase: 'browser-desktop-handoff',
      progressState: 'advanced',
      targetPhase: 'content-detail',
    }))
    expect(persistedState.browserWorkflowState.history).toHaveLength(2)
  })

  it('persists social-feed to compose workflow progression across repeated runtime desktopInspectScene calls', async () => {
    const sandboxPath = await createSandboxPath()
    let sceneMode: 'social-feed' | 'compose' = 'social-feed'
    foregroundWindowSample = {
      appName: 'Google Chrome',
      processName: 'Google Chrome',
      title: '微博',
    }
    localBrowserAutomationOverrides.readPage = vi.fn(async (input: { format?: string }) => {
      if (sceneMode === 'social-feed') {
        if (input.format === 'interactables') {
          return {
            status: 'completed',
            operation: 'browser_read_page',
            browser: 'chrome',
            url: 'https://weibo.com',
            title: '微博',
            interactables: [
              {
                tag: 'a',
                role: 'link',
                type: null,
                text: '首页',
                ariaLabel: null,
                title: null,
                href: 'https://weibo.com',
                disabled: false,
              },
              {
                tag: 'button',
                role: 'button',
                type: 'button',
                text: '发微博',
                ariaLabel: null,
                title: null,
                href: null,
                disabled: false,
              },
            ],
            content: '',
            output: '',
          }
        }

        return {
          status: 'completed',
          operation: 'browser_read_page',
          browser: 'chrome',
          url: 'https://weibo.com',
          title: '微博',
          content: '首页 关注 推荐 热搜 这里是微博首页信息流',
          output: '首页 关注 推荐 热搜 这里是微博首页信息流',
        }
      }

      if (input.format === 'interactables') {
        return {
          status: 'completed',
          operation: 'browser_read_page',
          browser: 'chrome',
          url: 'https://weibo.com/compose',
          title: '发微博',
          interactables: [
            {
              tag: 'textarea',
              role: 'textbox',
              type: null,
              text: '有什么新鲜事想分享给大家？',
              ariaLabel: '发微博输入框',
              title: null,
              href: null,
              disabled: false,
            },
            {
              tag: 'button',
              role: 'button',
              type: 'submit',
              text: '发布',
              ariaLabel: null,
              title: null,
              href: null,
              disabled: false,
            },
          ],
          content: '',
          output: '',
        }
      }

      return {
        status: 'completed',
        operation: 'browser_read_page',
        browser: 'chrome',
        url: 'https://weibo.com/compose',
        title: '发微博',
        content: '有什么新鲜事想分享给大家？',
        output: '有什么新鲜事想分享给大家？',
      }
    })
    localBrowserAutomationOverrides.listDesktopInteractables = vi.fn(async () => ({
      status: 'completed',
      operation: 'desktop_list_interactables',
      interactables: [],
      output: '',
    }))

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const desktopInspectScene = runtimeTestInternals.currentDesktopInspectScene
    expect(desktopInspectScene).toBeTypeOf('function')
    if (!desktopInspectScene)
      return

    const firstResult = (await desktopInspectScene({
      cardId: 'default',
      question: '帮我继续发微博',
      maxSuggestedActions: 3,
    })) as any

    expect(firstResult.pagePhase).toBe('social-feed')
    expect(firstResult.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'form-entry',
    }))
    expect(firstResult.workflowState).toEqual(expect.objectContaining({
      currentPhase: 'social-feed',
      previousPhase: null,
      progressState: 'started',
      targetPhase: 'form-entry',
    }))

    let persistedState = JSON.parse(metaStore.get('perception_state_v1') ?? '{}')
    expect(persistedState.browserWorkflowState).toEqual(expect.objectContaining({
      currentPhase: 'social-feed',
      progressState: 'started',
      targetPhase: 'form-entry',
    }))

    sceneMode = 'compose'
    foregroundWindowSample = {
      appName: 'Google Chrome',
      processName: 'Google Chrome',
      title: '发微博',
    }

    const secondResult = (await desktopInspectScene({
      cardId: 'default',
      question: '帮我继续发微博',
      maxSuggestedActions: 3,
    })) as any

    expect(secondResult.pagePhase).toBe('form-entry')
    expect(secondResult.workflowState).toEqual(expect.objectContaining({
      currentPhase: 'form-entry',
      previousPhase: 'social-feed',
      progressState: 'advanced',
      targetPhase: 'content-detail',
    }))

    persistedState = JSON.parse(metaStore.get('perception_state_v1') ?? '{}')
    expect(persistedState.browserWorkflowState).toEqual(expect.objectContaining({
      currentPhase: 'form-entry',
      previousPhase: 'social-feed',
      progressState: 'advanced',
      targetPhase: 'content-detail',
    }))
    expect(persistedState.browserWorkflowState.history).toHaveLength(2)
  })

  it('registers executor_run_cli, executor_run_codex, executor_run_claude_code, executor_run_local_visual, and executor_run_openclaw tools in main gateway toolset', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ tools, onEvent }) => {
      const toolNames = Array.isArray(tools)
        ? tools
            .map((entry: any) => String(entry?.function?.name ?? '').trim())
            .filter(Boolean)
        : []
      expect(toolNames).toContain('executor_capability_snapshot')
      expect(toolNames).toContain('executor_run_cli')
      expect(toolNames).toContain('executor_run_codex')
      expect(toolNames).toContain('executor_run_claude_code')
      expect(toolNames).toContain('executor_run_local_visual')
      expect(toolNames).toContain('executor_run_openclaw')

      await onEvent?.({
        type: 'text-delta',
        text: '{"thought":"checked tools","emotion":"neutral","reply":"ok"}',
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
      turnId: 'turn-main-executor-tools',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      supportsTools: true,
      waitForTools: true,
      messages: [{ role: 'user', content: '你能用 CLI 或 Codex 吗？' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-main-executor-tools')
      expect(finishEvents).toHaveLength(1)
    })
  })

  it('forces executor_run_cli routing and skips inspection grounding for explicit CLI action requests', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ messages, toolChoice, onEvent }) => {
      expect(toolChoice).toEqual({
        type: 'function',
        function: { name: 'executor_run_cli' },
      })

      const systemTexts = Array.isArray(messages)
        ? messages
            .filter((message: any) => message?.role === 'system')
            .map((message: any) => String(message?.content ?? ''))
        : []
      expectExecutionRoutingFact(systemTexts, 'executor_run_cli')

      const latestUserMessage = Array.isArray(messages)
        ? [...messages].reverse().find((message: any) => message?.role === 'user')
        : undefined
      const latestUserSerializedContent = JSON.stringify(latestUserMessage?.content ?? '')
      expect(latestUserSerializedContent).not.toContain('data:image/')
      expect(latestUserSerializedContent).not.toContain('inspection-grounding')

      await onEvent?.({
        type: 'text-delta',
        text: '{"thought":"route via cli executor","emotion":"neutral","reply":"ok"}',
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
      turnId: 'turn-main-executor-cli-routing-guard',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      supportsTools: true,
      waitForTools: true,
      messages: [{ role: 'user', content: '不要看截图，用 CLI 命令帮我查桌面文件' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-main-executor-cli-routing-guard')
      expect(finishEvents).toHaveLength(1)
    })

    expect(desktopCapturerGetSourcesMock).not.toHaveBeenCalled()
  })

  it('forces executor_run_cli routing for explicit desktop CLI listing request even when payload tool flags are false', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ messages, toolChoice, onEvent }) => {
      expect(toolChoice).toEqual({
        type: 'function',
        function: { name: 'executor_run_cli' },
      })

      const systemTexts = Array.isArray(messages)
        ? messages
            .filter((message: any) => message?.role === 'system')
            .map((message: any) => String(message?.content ?? ''))
        : []
      expectExecutionRoutingFact(systemTexts, 'executor_run_cli')

      await onEvent?.({
        type: 'text-delta',
        text: '{"thought":"route via cli executor","emotion":"neutral","reply":"我已经执行命令并拿到桌面文件列表。"}',
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
      turnId: 'turn-main-executor-cli-desktop-listing-routing-guard',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      supportsTools: false,
      waitForTools: false,
      messages: [{ role: 'user', content: '用cli命令帮我查一下桌面有什么文件' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-main-executor-cli-desktop-listing-routing-guard')
      expect(finishEvents).toHaveLength(1)
    })
  })

  it('forces executor_run_cli routing and skips inspection grounding for action + command literal without explicit channel mention', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ messages, toolChoice, onEvent }) => {
      expect(toolChoice).toEqual({
        type: 'function',
        function: { name: 'executor_run_cli' },
      })

      const systemTexts = Array.isArray(messages)
        ? messages
            .filter((message: any) => message?.role === 'system')
            .map((message: any) => String(message?.content ?? ''))
        : []
      expectExecutionRoutingFact(systemTexts, 'executor_run_cli')

      const latestUserMessage = Array.isArray(messages)
        ? [...messages].reverse().find((message: any) => message?.role === 'user')
        : undefined
      const latestUserSerializedContent = JSON.stringify(latestUserMessage?.content ?? '')
      expect(latestUserSerializedContent).not.toContain('data:image/')
      expect(latestUserSerializedContent).not.toContain('inspection-grounding')

      await onEvent?.({
        type: 'text-delta',
        text: '{"thought":"route via implicit cli command literal","emotion":"neutral","reply":"ok"}',
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
      turnId: 'turn-main-executor-cli-command-literal-routing-guard',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      supportsTools: true,
      waitForTools: true,
      messages: [{ role: 'user', content: '帮我执行 `ls ~/Desktop`，顺便看下屏幕现在是什么内容' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-main-executor-cli-command-literal-routing-guard')
      expect(finishEvents).toHaveLength(1)
    })

    expect(desktopCapturerGetSourcesMock).not.toHaveBeenCalled()

    const perceptionAudit = dbStub.appendAuditLog.mock.calls
      .map(([entry]) => entry)
      .find((entry: any) => entry.category === 'alicization.perception'
        && entry.action === 'inspection-grounding-skipped'
        && entry.payload?.reason === 'executor-routing-intent')
    expect(perceptionAudit).toBeTruthy()
  })

  it('forces executor_run_openclaw routing and skips inspection grounding for explicit openclaw action requests', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ messages, toolChoice, onEvent }) => {
      expect(toolChoice).toEqual({
        type: 'function',
        function: { name: 'executor_run_openclaw' },
      })

      const systemTexts = Array.isArray(messages)
        ? messages
            .filter((message: any) => message?.role === 'system')
            .map((message: any) => String(message?.content ?? ''))
        : []
      expectExecutionRoutingFact(systemTexts, 'executor_run_openclaw')

      const latestUserMessage = Array.isArray(messages)
        ? [...messages].reverse().find((message: any) => message?.role === 'user')
        : undefined
      const latestUserSerializedContent = JSON.stringify(latestUserMessage?.content ?? '')
      expect(latestUserSerializedContent).not.toContain('data:image/')
      expect(latestUserSerializedContent).not.toContain('inspection-grounding')

      await onEvent?.({
        type: 'text-delta',
        text: '{"thought":"route via openclaw executor","emotion":"neutral","reply":"ok"}',
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
      turnId: 'turn-main-executor-openclaw-routing-guard',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      supportsTools: true,
      waitForTools: true,
      messages: [{ role: 'user', content: '请直接用 OpenClaw 帮我看当前屏幕并关掉挡住我的弹窗' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-main-executor-openclaw-routing-guard')
      expect(finishEvents).toHaveLength(1)
    })

    expect(desktopCapturerGetSourcesMock).not.toHaveBeenCalled()
  })

  it('forces executor_run_local_visual routing for explicit local gui execution requests without escalating to openclaw', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ messages, toolChoice, onEvent }) => {
      expect(toolChoice).toEqual({
        type: 'function',
        function: { name: 'executor_run_local_visual' },
      })

      const systemTexts = Array.isArray(messages)
        ? messages
            .filter((message: any) => message?.role === 'system')
            .map((message: any) => String(message?.content ?? ''))
        : []
      expectExecutionRoutingFact(systemTexts, 'executor_run_local_visual')

      const latestUserMessage = Array.isArray(messages)
        ? [...messages].reverse().find((message: any) => message?.role === 'user')
        : undefined
      const latestUserSerializedContent = JSON.stringify(latestUserMessage?.content ?? '')
      expect(latestUserSerializedContent).not.toContain('data:image/')
      expect(latestUserSerializedContent).not.toContain('inspection-grounding')

      await onEvent?.({
        type: 'text-delta',
        text: '{"thought":"route via dedicated local visual executor","emotion":"neutral","reply":"ok"}',
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
      turnId: 'turn-main-executor-local-visual-routing-guard',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      supportsTools: true,
      waitForTools: true,
      messages: [{ role: 'user', content: '不要用 OpenClaw，直接用本地 GUI 多步执行把当前桌面弹窗关掉' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-main-executor-local-visual-routing-guard')
      expect(finishEvents).toHaveLength(1)
    })

    expect(desktopCapturerGetSourcesMock).not.toHaveBeenCalled()
  })

  it('suppresses persisted execution delivery after main chat pays off a fresh execution-result follow-up', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const dispatchTaskThread = invokeHandlers.get(electronAlicizationDispatchTaskThread)
    const setActiveSession = invokeHandlers.get(electronAlicizationSetActiveSession)
    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    expect(dispatchTaskThread).toBeTypeOf('function')
    expect(setActiveSession).toBeTypeOf('function')
    expect(syncLlmConfig).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')
    expect(forceTick).toBeTypeOf('function')

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
    await setActiveSession!({
      cardId: 'default',
      sessionId: 'session-inline-suppressed',
    })

    let currentThread = {
      id: 'thread-inline-suppressed',
      decisionTraceId: 'mind:l9f3lq:inline-suppressed',
      turnId: 'turn-inline-suppressed-source',
      sessionId: 'session-inline-suppressed',
      origin: 'user-turn',
      goal: 'Run the CLI body and keep the result from resurfacing twice.',
      kind: 'run-command',
      status: 'planned',
      selectedChannel: 'cli',
      proposedChannel: 'cli',
      summary: 'planned cli body',
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
      },
      createdAt: 100,
      updatedAt: 100,
      lastEventAt: null,
      completedAt: null,
    }
    const executionEvents: Array<any> = []
    dbStub.getTaskThread.mockImplementation(async (id: string) => {
      if (id !== currentThread.id)
        return undefined
      return { ...currentThread }
    })
    dbStub.listTaskThreads.mockImplementation(async (input?: { sessionId?: string, status?: string[] }) => {
      if (input?.sessionId && input.sessionId !== currentThread.sessionId)
        return []
      if (Array.isArray(input?.status) && input.status.length > 0 && !input.status.includes(currentThread.status))
        return []
      return [{ ...currentThread }]
    })
    dbStub.appendExecutionEvents.mockImplementation(async (events: Array<any>) => {
      executionEvents.push(...events)
      const latest = [...events].sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0)).at(-1)
      if (!latest)
        return
      currentThread = {
        ...currentThread,
        status: latest.threadStatus ?? currentThread.status,
        updatedAt: latest.createdAt ?? currentThread.updatedAt,
        lastEventAt: latest.createdAt ?? currentThread.lastEventAt,
        completedAt: latest.threadStatus === 'completed' || latest.threadStatus === 'failed' || latest.threadStatus === 'cancelled' || latest.threadStatus === 'blocked'
          ? (latest.createdAt ?? currentThread.completedAt)
          : currentThread.completedAt,
      }
    })
    dbStub.upsertTaskThread.mockImplementation(async (input: any) => {
      currentThread = {
        ...currentThread,
        ...input,
      }
      return { ...currentThread }
    })
    dbStub.listExecutionEvents.mockImplementation(async (input?: { threadId?: string }) => {
      if (input?.threadId && input.threadId !== currentThread.id)
        return []
      return executionEvents
        .filter(event => !input?.threadId || event.threadId === input.threadId)
        .sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0))
    })

    const dispatchResult = await dispatchTaskThread!({
      cardId: 'default',
      threadId: 'thread-inline-suppressed',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("inline duplicate callback ok")'],
      },
    })

    expect(dispatchResult.ok).toBe(true)
    expect(metaStore.get('execution_delivery_state_v1')).toContain('thread-inline-suppressed')
    const callbackRuntime = runtimeTestInternals.currentExecutionCallbackRuntime
    expect(callbackRuntime).toBeTruthy()
    const callbackPreviewBefore = await callbackRuntime?.buildPendingExecutionCallbackContext?.({
      sessionId: 'session-inline-suppressed',
      consume: false,
    }) as { callbacks?: Array<{ createdAt?: number }> } | undefined
    const callbackCursorBefore = callbackRuntime?.peekSurfacedCursor?.('session-inline-suppressed') ?? null
    expect(callbackPreviewBefore?.callbacks ?? []).toHaveLength(1)
    expect(Number(callbackCursorBefore ?? 0)).toBeLessThan(Number(callbackPreviewBefore?.callbacks?.[0]?.createdAt ?? Number.MAX_SAFE_INTEGER))

    contextEmitMock.mockClear()
    streamTextMock.mockImplementation(async ({ onEvent }: { tools?: Array<any>, messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      await onEvent?.({
        type: 'text-delta',
        text: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=grounded; focus=execution-result; move=pay-off-fresh-callback-follow-up; tone=direct',
          emotion: 'thinking',
          reply: '刚才那条 CLI 已经跑完了，结果就是 inline duplicate callback ok。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    const turnId = 'turn-inline-suppressed-main-chat'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: '刚才那个命令结果呢' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })
    const callbackPreviewAfter = await callbackRuntime?.buildPendingExecutionCallbackContext?.({
      sessionId: 'session-inline-suppressed',
      consume: false,
    }) as { callbacks?: Array<{ createdAt?: number }> } | undefined
    const callbackCursorAfter = callbackRuntime?.peekSurfacedCursor?.('session-inline-suppressed') ?? null
    expect(callbackPreviewAfter?.callbacks ?? []).toHaveLength(0)
    expect(callbackCursorAfter).toBe(callbackPreviewBefore?.callbacks?.[0]?.createdAt ?? null)

    const toolResultPayload = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamToolResult && payload.turnId === turnId)
      .map(([, payload]) => payload)
    expect(toolResultPayload).toHaveLength(0)

    const deliveryStateAfterInlinePayoff = String(metaStore.get('execution_delivery_state_v1') ?? '')
    expect(deliveryStateAfterInlinePayoff).toContain('"pending":[]')
    expect(deliveryStateAfterInlinePayoff).toContain('thread-inline-suppressed')
    expect(deliveryStateAfterInlinePayoff).toContain('"delivered":[{')
    expect(deliveryStateAfterInlinePayoff).toContain('"surfaced":[{')

    contextEmitMock.mockClear()
    await forceTick!({ cardId: 'default' })

    const repeatedCallbackEvents = getDialogueRespondedEvents()
      .filter(event =>
        String(event.turnId).startsWith('execution-callback:')
        && event.sessionId === 'session-inline-suppressed',
      )
    expect(repeatedCallbackEvents).toHaveLength(0)
  })

  it('injects focused execution capability contract for cli/codex capability questions', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ messages, toolChoice, onEvent }) => {
      const systemTexts = Array.isArray(messages)
        ? messages
            .filter((message: any) => message?.role === 'system')
            .map((message: any) => String(message?.content ?? ''))
        : []
      expectExecutionCapabilityFact(systemTexts, ['cli', 'codex'])
      expect(toolChoice).toBeUndefined()

      await onEvent?.({
        type: 'text-delta',
        text: '{"thought":"checked capability contract","emotion":"neutral","reply":"收到"}',
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
      turnId: 'turn-main-capability-question',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      supportsTools: true,
      waitForTools: true,
      messages: [{ role: 'user', content: '你能不能用 CLI 命令和 Codex？' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-main-capability-question')
      expect(finishEvents).toHaveLength(1)
    })
  })

  it('injects focused execution capability contract for claude code capability questions', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ messages, toolChoice, onEvent }) => {
      const systemTexts = Array.isArray(messages)
        ? messages
            .filter((message: any) => message?.role === 'system')
            .map((message: any) => String(message?.content ?? ''))
        : []
      expectExecutionCapabilityFact(systemTexts, ['claude-code'])
      expect(toolChoice).toBeUndefined()

      await onEvent?.({
        type: 'text-delta',
        text: '{"thought":"checked claude capability contract","emotion":"neutral","reply":"收到"}',
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
      turnId: 'turn-main-capability-question-claude-code',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      supportsTools: true,
      waitForTools: true,
      messages: [{ role: 'user', content: '你能不能用 Claude Code？' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-main-capability-question-claude-code')
      expect(finishEvents).toHaveLength(1)
    })
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

  it('delivers due reminders through typed Provider facts and native schema', async () => {
    mockGenerateTextFromStreamText()
    const sandboxPath = await createSandboxPath()
    let reminderSystemText = ''
    let reminderResponseFormat: unknown = null
    streamTextMock.mockImplementation(async ({ messages, onEvent, responseFormat }: {
      messages?: Array<{ role?: string, content?: unknown }>
      onEvent?: (event: any) => Promise<void> | void
      responseFormat?: unknown
    }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''

      if (systemText.includes('"type":"alicization-reminder-turn-context"')) {
        reminderSystemText = systemText
        reminderResponseFormat = responseFormat
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify(buildRuntimeMindTurnReply({
            thought: 'The scheduled reminder is due.',
            emotion: 'thinking',
            reply: '该喝水了。',
          })),
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

    const nowMs = Date.now()
    dbStub.claimDueScheduledTasks.mockResolvedValueOnce([
      {
        id: 'row-reminder-typed-provider',
        taskId: 'task-reminder-typed-provider',
        triggerAt: nowMs - 2 * 60_000,
        message: '喝水',
        status: 'running',
        createdAt: nowMs - 3 * 60_000,
        claimedAt: nowMs,
        completedAt: null,
        sourceTurnId: null,
        firedTurnId: null,
        lastError: null,
      },
    ])

    await invokeHandlers.get(electronAlicizationSubconsciousForceTick)!({ cardId: 'default' })

    expect(reminderSystemText).toContain('"type":"alicization-reminder-turn-context"')
    expect(reminderSystemText).toContain('"message":"喝水"')
    expect(reminderResponseFormat).toBe(alicizationProviderResponseFormat)
    expect(dbStub.completeScheduledTask).toHaveBeenCalledWith(
      'task-reminder-typed-provider',
      expect.stringMatching(/^reminder:/),
      expect.any(Number),
    )
    const persistedReminderTurn = dbStub.appendConversationTurn.mock.calls.at(-1)?.[0]
    expect(persistedReminderTurn).toEqual(expect.objectContaining({
      assistantText: '该喝水了。',
      structured: expect.objectContaining({
        format: 'subconscious-reminder-v1',
      }),
    }))
  }, 15_000)

  it('requeues reminder task when llm reminder generation fails', async () => {
    mockGenerateTextFromStreamText()
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

      await vi.advanceTimersByTimeAsync(80_000)

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

      expect(streamTextMock.mock.calls.length).toBeGreaterThanOrEqual(3)
      expect(chunkEvents.map(event => event.text).join('')).toContain('timeout recovered reply')
      expect(finishEvents[0]?.status).toBe('completed')
      expect(['timeout-recovered', 'stop']).toContain(String(finishEvents[0]?.finishReason ?? ''))
    }
    finally {
      vi.useRealTimers()
    }
  })
  it('does not emit local fallback visible reply when provider stays reachable but timeout recovery never yields mind-authored text', async () => {
    vi.useFakeTimers()
    try {
      const sandboxPath = await createSandboxPath()
      streamTextMock.mockImplementation(async ({ onEvent }: { onEvent?: (event: any) => Promise<void> | void }) => {
        await onEvent?.({
          type: 'response-metadata',
          meta: { provider: 'mock' },
        })
      })

      await setupAlicizationRuntime({
        userDataPathOverride: sandboxPath,
      })

      const startChat = invokeHandlers.get(electronAlicizationChatStart)
      expect(startChat).toBeTypeOf('function')

      const turnId = 'turn-timeout-no-local-fallback-when-gateway-reachable'
      const startResult = await startChat!({
        cardId: 'default',
        turnId,
        providerId: 'openai',
        model: 'gpt-4o-mini',
        providerConfig: {
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
        messages: [{ role: 'user', content: '前几天那条线继续说下去。' }],
      })
      expect(startResult.accepted).toBe(true)

      await vi.advanceTimersByTimeAsync(80_000)

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

      expect(finishEvents[0]?.status).toBe('aborted')
      expect(String(finishEvents[0]?.finishReason ?? '')).toContain('chat-first-event-timeout')
      expect(chunkEvents).toHaveLength(0)
      expect(dbStub.appendAuditLog).not.toBeCalledWith(expect.objectContaining({
        action: 'stream-timeout-local-fallback',
      }))
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
    mockGenerateTextFromStreamText()
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

    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''

      if (systemText.includes('"type":"alicization-proactive-turn-context"')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify(buildRuntimeMindTurnReply({
            thought: 'tension overflow',
            emotion: 'tired',
            reply: '我等你很久了，现在总算有空了吗？',
            performance: {
              baseEmotion: 'tired',
            },
          })),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      if (systemText.includes('[SYSTEM OVERRIDE: 潜意识代谢与记忆重塑]')) {
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

    const proactivePromptMessages = generateTextMock.mock.calls
      .map(call => call[0]?.messages ?? [])
      .find((messages: any[]) => messages.some(message => String(message.content ?? '').includes('"type":"alicization-proactive-turn-context"'))) ?? []
    const dreamPromptMessages = generateTextMock.mock.calls
      .map(call => call[0]?.messages ?? [])
      .find((messages: any[]) => messages.some(message => String(message.content ?? '').includes('[SYSTEM OVERRIDE: 潜意识代谢与记忆重塑]'))) ?? []
    const proactivePromptText = proactivePromptMessages
      .filter((message: any) => message.role === 'system')
      .map((message: any) => String(message.content ?? ''))
      .join('\n\n')
    const dreamPromptText = dreamPromptMessages
      .filter((message: any) => message.role === 'system')
      .map((message: any) => String(message.content ?? ''))
      .join('\n\n')

    expect(proactivePromptText).toContain('"type":"alicization-proactive-turn-context"')
    expect(proactivePromptText).toContain('"type":"alicization-persona-directives"')
    expect(proactivePromptText).toContain('严厉但克制的监督者')
    expect(proactivePromptText).not.toMatch(/\[ALICIZATION_(?:PROJECT_STATE|PHASE1_CLOSURE_DASHBOARD|PROACTIVE_SELF_BRIEF)\]|ProjectSelfBrief|OWNER_BOUNDARY/u)
    expect(dreamPromptText).toContain('[SYSTEM OVERRIDE: 潜意识代谢与记忆重塑]')
    expect(dreamPromptText).toContain('"type":"alicization-persona-directives"')
    expect(dreamPromptText).toContain('严厉但克制的监督者')
    expect(dreamPromptText).not.toMatch(/\[ALICIZATION_(?:PROJECT_STATE|PHASE1_CLOSURE_DASHBOARD|DREAM_SELF_BRIEF)\]|ProjectSelfBrief|OWNER_BOUNDARY/u)
    const dreamAudit = dbStub.appendAuditLog.mock.calls
      .map(call => call[0])
      .find((item: any) => item.action === 'metabolism-generated')
    expect(dreamAudit?.payload?.agentRuntime?.agentSessionId).toEqual(expect.any(String))
    expect(dreamAudit?.payload?.agentRuntime?.recentContinuity?.length ?? 0).toBeGreaterThan(0)
  }, 15_000)

  it('carries long-horizon learning state into the typed proactive context without reply constraints', async () => {
    const runtimeSource = await readFile(runtimeModulePath, 'utf8')
    expect(runtimeSource).toContain('learningState: {')
    expect(runtimeSource).toContain('selfEvolution: providerSelfEvolution')
    expect(runtimeSource).toContain('execution: providerLearningExecutionState')
    expect(runtimeSource).toContain('organicPromptContext.selfEvolution.activeLearningFocuses')
    expect(runtimeSource).toContain('organicPromptContext.learningExecutionState.activeLearningFocuses')
  })
  it('feeds dream one-shot continuity back into the next dream prompt', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'dream continuity loop',
    }

    const dreamSystemTexts: string[] = []
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const serializedMessages = Array.isArray(messages) ? messages : []
      const systemText = serializedMessages
        .filter(message => message.role === 'system')
        .map(message => String(message.content ?? ''))
        .join('\n\n')

      if (systemText.includes('[SYSTEM OVERRIDE: 潜意识代谢与记忆重塑]')) {
        dreamSystemTexts.push(systemText)
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            host_attitude: '继续把梦里的连续线往下沉淀',
            soul_shift: {
              obedience_delta: 0,
              liveliness_delta: 0,
              sensibility_delta: 0,
            },
            next_active_thoughts: [{ text: '把 dream 自己形成的会话线继续沉淀下去' }],
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

    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
    const setActiveSession = invokeHandlers.get(electronAlicizationSetActiveSession)
    const forceDream = invokeHandlers.get(electronAlicizationSubconsciousForceDream)
    expect(syncLlmConfig).toBeTypeOf('function')
    expect(setActiveSession).toBeTypeOf('function')
    expect(forceDream).toBeTypeOf('function')

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

    await setActiveSession!({
      cardId: 'default',
      sessionId: 'session-dream-loop',
    })

    dbStub.listConversationTurnsSince.mockResolvedValue([
      {
        turnId: 'turn-dream-loop-source',
        sessionId: 'session-dream-loop',
        userText: '今天继续整理这条线。',
        assistantText: '好，我们继续。',
        structuredJson: JSON.stringify({ emotion: 'neutral' }),
        createdAt: Date.now() - 15_000,
      },
    ])

    await forceDream!({
      cardId: 'default',
      reason: 'unit-dream-loop-1',
    })
    await forceDream!({
      cardId: 'default',
      reason: 'unit-dream-loop-2',
    })

    expect(dreamSystemTexts).toHaveLength(2)
    expect(dreamSystemTexts[0]).not.toContain('[ALICIZATION_DIALOGUE_SESSION_MIRROR]')
    expect(dreamSystemTexts[1]).toContain('[ALICIZATION_DIALOGUE_SESSION_MIRROR]')
    expect(dreamSystemTexts[1]).toContain('conversation_session_id=session-dream-loop')
    expect(dreamSystemTexts[1]).toContain('session_phases=')
    expect(dreamSystemTexts[1]).toContain('main_gateway:dream')
    expect(dreamSystemTexts[1]).toContain('source=dream')
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
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
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
      previousHostAttitude: beforeSoul.frontmatter.host_attitude,
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

  it('runs nightly replay benchmark gate during scheduled dream runs and persists the latest report', async () => {
    const sandboxPath = await createSandboxPath()
    metaStore.set('replay_benchmark_dataset_backlog_v1', JSON.stringify([
      {
        id: 'nightly-backlog-1',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-nightly-backlog-1',
        userText: '把那条错线程再压稳一点',
        failingDimensions: ['wrongThreadSuppression'],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-nightly-backlog-1',
          decisionTraceId: 'mind:nightly:backlog:1',
          sessionId: 'session-nightly-backlog',
          activeThreadId: 'thread-nightly-backlog',
        },
        sampledCategories: ['wrong-thread'],
        replayTurn: {
          turnId: 'turn-nightly-backlog-1',
          userText: '把那条错线程再压稳一点',
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-nightly-backlog-1',
            decisionTraceId: 'mind:nightly:backlog:1',
            sessionId: 'session-nightly-backlog',
            activeThreadId: 'thread-nightly-backlog',
          },
          sampledCategories: ['wrong-thread'],
          organicMemoryContext: {
            hostAttitude: '',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: [],
              selectedConsolidationIds: [],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: [],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: [],
              ambiguityPosture: 'ambiguous',
              selectedEras: [],
              selectedPeriods: [],
              selectedEpisodes: [],
              conflictSeverity: 'high',
              conflictVariants: [{
                id: 'cluster:nightly-backlog',
                summary: 'A nearby wrong thread still competes.',
                provenance: 'reconstructed',
                reason: 'Need to suppress the wrong thread lure.',
              }],
              stableCore: ['只保稳定核心。'],
              unsafeDetails: ['不要把错线程说成真。'],
              selectedProcedures: [],
              selectedBundles: [],
              selectedChains: [],
              surfacePolicy: 'answer-anchoring',
              confidence: 0.8,
              whyNow: '夜间回放仍需要守住错线程边界。',
              inwardLine: '先把错线程压住。',
              visibleLine: null,
            },
          },
        },
        createdAt: Date.now() - 30_000,
      },
    ]))
    dbStub.listConversationTurnsSince.mockReset()
    dbStub.listConversationTurnsSince.mockImplementation(async (_sinceExclusive: number, options?: { limit?: number }) => {
      if (options?.limit === 2000) {
        return [
          {
            turnId: 'turn-nightly-dream-source',
            sessionId: 'session-nightly-dream',
            userText: '今晚先别把那条线说死。',
            assistantText: '我先把那条线轻轻压住。',
            structuredJson: JSON.stringify({ emotion: 'thinking' }),
            createdAt: Date.now() - 20_000,
          },
        ]
      }
      return [
        {
          turnId: 'turn-nightly-sampled-1',
          sessionId: 'session-nightly-sampled',
          userText: '继续按你以前那套接法把这个收回来',
          assistantText: '我会先沿旧 procedure 接住它。',
          structuredJson: JSON.stringify({
            governance: {
              decisionTraceId: 'mind:nightly:sampled:1',
            },
          }),
          createdAt: Date.now() - 10_000,
        },
      ]
    })
    dbStub.listMindTurnEvents.mockReset()
    dbStub.listMindTurnEvents.mockImplementation(async (input?: { turnId?: string }) => {
      if (input?.turnId !== 'turn-nightly-sampled-1')
        return []
      return [
        {
          id: 'evt-nightly-sampled-1a',
          decisionTraceId: 'mind:nightly:sampled:1',
          turnId: 'turn-nightly-sampled-1',
          sessionId: 'session-nightly-sampled',
          origin: 'user-turn',
          kind: 'governance-normalized',
          payload: {
            turnMode: 'guide-current-knot',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'task-knot',
            screenReferenceMode: 'helpful',
          },
          createdAt: Date.now() - 10_000,
        },
        {
          id: 'evt-nightly-sampled-1b',
          decisionTraceId: 'mind:nightly:sampled:1',
          turnId: 'turn-nightly-sampled-1',
          sessionId: 'session-nightly-sampled',
          origin: 'user-turn',
          kind: 'recall-attribution',
          payload: {
            shouldRecall: true,
            surfacePolicy: 'procedural-carry',
            confidence: 0.84,
            whyNow: 'The host is asking for the remembered way of handling the task.',
            inwardLine: 'The old procedure should shape the answer.',
            visibleLine: 'This feels like the same procedure again.',
            recollectionIntentMode: 'execution-procedure',
            recollectionIntentTemporalFocus: 'cross-session',
            selectedProcedures: [{
              id: 'procedure-nightly-sampled-1',
              label: 'patch -> verify',
              approach: 'Patch first, verify second, then report.',
            }],
          },
          createdAt: Date.now() - 9_990,
        },
        {
          id: 'evt-nightly-sampled-1c',
          decisionTraceId: 'mind:nightly:sampled:1',
          turnId: 'turn-nightly-sampled-1',
          sessionId: 'session-nightly-sampled',
          origin: 'user-turn',
          kind: 'memory-deliberation-judged',
          payload: {
            shouldRecall: true,
            whyWithheld: null,
            ambiguityPosture: 'settled',
            conflictSeverity: 'none',
            restraint: {
              surfaceMode: 'free',
              provenanceMode: 'memory',
              shouldStayInward: false,
              shouldOnlySurfaceStableCore: false,
              shouldLabelProvenance: false,
              shouldLabelHypothesis: false,
              shouldSuppressSpecificity: false,
              shouldDelayUntilAfterPayoff: false,
            },
            stableCore: ['Patch first, verify second, then report.'],
            unsafeDetails: [],
            personState: {
              activeClosenessContext: 'execution-callback',
              activeClosenessRung: 'nearby-soft',
              relationshipPosture: 'warm',
              openingGuidance: 'Keep the callback thread-faithful and bounded.',
              currentRegime: 'execution-callback',
              repairPosture: 'warm-repair',
            },
          },
          createdAt: Date.now() - 9_980,
        },
      ]
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const forceDream = invokeHandlers.get(electronAlicizationSubconsciousForceDream)
    expect(forceDream).toBeTypeOf('function')

    const result = await forceDream!({
      cardId: 'default',
      reason: 'schedule-03:00',
    })

    expect(result.processedCards).toContain('default')
    expect(metaStore.get('replay_benchmark_last_nightly_run_day_v1')).toBeTruthy()
    const latestReport = String(metaStore.get('replay_benchmark_latest_report_v1') ?? '')
    expect(latestReport).toContain('sampled-humanlike-memory-v1')
    expect(latestReport).toContain('backlog-humanlike-memory-v1')
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.memory-benchmark',
      action: 'replay-benchmark-nightly-ran',
      payload: expect.objectContaining({
        packs: expect.arrayContaining([
          expect.objectContaining({
            packId: 'sampled-humanlike-memory-v1',
          }),
          expect.objectContaining({
            packId: 'backlog-humanlike-memory-v1',
          }),
        ]),
      }),
    }))
  }, 20_000)

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
    const previousCoreIncarnation = currentSoul.frontmatter.core_incarnation
    await updateSoul!({
      cardId: 'default',
      content: currentSoul.content.replace(
        `"core_incarnation": ${JSON.stringify(previousCoreIncarnation)}`,
        `"core_incarnation": "旧心意：我只在远处维持观察。"`,
      ),
    })

    let reforgeSystemText = ''
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
        reforgeSystemText = systemText
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
    expect(reforgeSystemText).toContain('[SYSTEM OVERRIDE: 摇光心意重铸]')
    expect(reforgeSystemText).toContain('Output must be valid JSON only with key: core_incarnation.')
    expect(reforgeSystemText).not.toMatch(/\[ALICIZATION_(?:PROJECT_STATE|PHASE1_CLOSURE_DASHBOARD|CORE_INCARNATION_REFORGE_SELF_BRIEF)\]|ProjectSelfBrief|OWNER_BOUNDARY/u)
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
    const previousCoreIncarnation = currentSoul.frontmatter.core_incarnation
    await updateSoul!({
      cardId: 'default',
      content: currentSoul.content.replace(
        `"core_incarnation": ${JSON.stringify(previousCoreIncarnation)}`,
        `"core_incarnation": "旧心意：我只在远处维持观察。"`,
      ),
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

  it('routes recollection-heavy short execution-result follow-ups through llm compact memory payoff', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    const setActiveSession = invokeHandlers.get(electronAlicizationSetActiveSession)
    expect(startChat).toBeTypeOf('function')
    expect(setActiveSession).toBeTypeOf('function')

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

    await setActiveSession!({
      cardId: 'default',
      sessionId: 'session-execution-ledger',
    })

    dbStub.listTaskThreads.mockResolvedValue([
      {
        id: 'thread-cli-ledger',
        decisionTraceId: 'trace-cli-ledger',
        turnId: 'turn-cli-ledger',
        sessionId: 'session-execution-ledger',
        origin: 'user-turn',
        goal: 'Run pnpm test for stage-tamagotchi',
        kind: 'run-command',
        status: 'completed',
        selectedChannel: 'cli',
        proposedChannel: 'cli',
        summary: 'pnpm test finished without failures',
        metadata: null,
        createdAt: Date.now() - 120_000,
        updatedAt: Date.now() - 45_000,
        lastEventAt: Date.now() - 45_000,
        completedAt: Date.now() - 45_000,
      },
    ])
    dbStub.listExecutionEvents.mockResolvedValue([
      {
        id: 'exec-cli-ledger-dispatch',
        threadId: 'thread-cli-ledger',
        decisionTraceId: 'trace-cli-ledger',
        turnId: 'turn-cli-ledger',
        sessionId: 'session-execution-ledger',
        origin: 'user-turn',
        channel: 'cli',
        kind: 'dispatch',
        threadStatus: 'running',
        payload: {
          command: 'pnpm',
        },
        createdAt: Date.now() - 46_000,
      },
      {
        id: 'exec-cli-ledger-result',
        threadId: 'thread-cli-ledger',
        decisionTraceId: 'trace-cli-ledger',
        turnId: 'turn-cli-ledger',
        sessionId: 'session-execution-ledger',
        origin: 'user-turn',
        channel: 'cli',
        kind: 'result',
        threadStatus: 'completed',
        payload: {
          stdout: 'vitest passed on stage-tamagotchi',
        },
        createdAt: Date.now() - 45_000,
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
      await onEvent?.({ type: 'text-delta', text: 'execution ledger reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    const result = await startChat!({
      cardId: 'default',
      turnId: 'turn-execution-ledger-follow-up',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: '刚才那个命令结果呢' }],
    })

    expect(result.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === 'turn-execution-ledger-follow-up')
      expect(finishEvents).toHaveLength(1)
    })

    const chunkEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamChunk && payload.turnId === 'turn-execution-ledger-follow-up')
      .map(([, payload]) => payload)
    const replyText = chunkEvents.map(event => event.text).join('')

    expect(replyText).toBe('execution ledger reply')
    expect(systemTexts.some(text => text.includes('[ALICIZATION_EXECUTION_LEDGER]'))).toBe(true)
  })

  it('injects recent execution ledger history into longer main chat turns', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    const setActiveSession = invokeHandlers.get(electronAlicizationSetActiveSession)
    expect(startChat).toBeTypeOf('function')
    expect(setActiveSession).toBeTypeOf('function')

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

    await setActiveSession!({
      cardId: 'default',
      sessionId: 'session-execution-ledger',
    })

    dbStub.listTaskThreads.mockResolvedValue([
      {
        id: 'thread-cli-ledger',
        decisionTraceId: 'trace-cli-ledger',
        turnId: 'turn-cli-ledger',
        sessionId: 'session-execution-ledger',
        origin: 'user-turn',
        goal: 'Run pnpm test for stage-tamagotchi',
        kind: 'run-command',
        status: 'completed',
        selectedChannel: 'cli',
        proposedChannel: 'cli',
        summary: 'pnpm test finished without failures',
        metadata: null,
        createdAt: Date.now() - 120_000,
        updatedAt: Date.now() - 45_000,
        lastEventAt: Date.now() - 45_000,
        completedAt: Date.now() - 45_000,
      },
    ])
    dbStub.listExecutionEvents.mockResolvedValue([
      {
        id: 'exec-cli-ledger-dispatch',
        threadId: 'thread-cli-ledger',
        decisionTraceId: 'trace-cli-ledger',
        turnId: 'turn-cli-ledger',
        sessionId: 'session-execution-ledger',
        origin: 'user-turn',
        channel: 'cli',
        kind: 'dispatch',
        threadStatus: 'running',
        payload: {
          command: 'pnpm',
        },
        createdAt: Date.now() - 46_000,
      },
      {
        id: 'exec-cli-ledger-result',
        threadId: 'thread-cli-ledger',
        decisionTraceId: 'trace-cli-ledger',
        turnId: 'turn-cli-ledger',
        sessionId: 'session-execution-ledger',
        origin: 'user-turn',
        channel: 'cli',
        kind: 'result',
        threadStatus: 'completed',
        payload: {
          stdout: 'vitest passed on stage-tamagotchi',
        },
        createdAt: Date.now() - 45_000,
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
      await onEvent?.({ type: 'text-delta', text: 'execution ledger reply' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    const result = await startChat!({
      cardId: 'default',
      turnId: 'turn-execution-ledger-long-form',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: '请结合刚才那条命令结果，先总结通过原因，再给我下一步排查建议和可能风险。' }],
    })

    expect(result.accepted).toBe(true)

    await vi.waitFor(() => {
      expect(systemTexts.length).toBeGreaterThan(0)
    })

    const mainChatSystemText = systemTexts.find(text => text.includes('[ALICIZATION_EXECUTION_LEDGER]')) ?? ''
    expect(mainChatSystemText).toContain('[ALICIZATION_EXECUTION_LEDGER]')
    expect(mainChatSystemText).toContain('channel=cli')
    expect(mainChatSystemText).toContain('summary=pnpm test finished without failures')
    expect(mainChatSystemText).toContain('outcome=vitest passed on stage-tamagotchi')
  })

  it('uses foreground window recall seed for proactive one-shot generation', async () => {
    mockGenerateTextFromStreamText()
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

    streamTextMock.mockImplementation(async ({ onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      await onEvent?.({
        type: 'text-delta',
        text: JSON.stringify(buildRuntimeMindTurnReply({
          thought: 'phantom prompt recalled cursor debug memory',
          emotion: 'concerned',
          reply: '这个报错你之前也卡过很久，先回头看看 main.ts 那里。',
          performance: {
            baseEmotion: 'concerned',
          },
        })),
      })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    expect(forceTick).toBeTypeOf('function')

    const tickResult = await forceTick!({ cardId: 'default' })

    expect(tickResult.proactiveTriggered).toContain('default')
    expect(dbStub.searchSubconsciousFragments).toBeCalled()
    const recallPromptMessages = generateTextMock.mock.calls
      .map(call => call[0]?.messages ?? [])
      .find((messages: any[]) => messages.some(message => String(message.content ?? '').includes('"type":"alicization-long-term-memory-recall"'))) ?? []
    const proactiveRecallText = recallPromptMessages
      .filter((message: any) => message.role === 'system')
      .map((message: any) => String(message.content ?? ''))
      .join('\n\n')
    expect(proactiveRecallText).toContain('"type":"alicization-long-term-memory-recall"')
    expect(proactiveRecallText).toContain('"owner":"LongTermMemoryRecall"')
    expect(proactiveRecallText).toContain('main.ts')
    expect(proactiveRecallText).toContain('"type":"alicization-proactive-turn-context"')
    expect(proactiveRecallText).not.toMatch(/\[ALICIZATION_(?:ASSOCIATIVE_RECALL|PROJECT_STATE|PHASE1_CLOSURE_DASHBOARD|PROACTIVE_SELF_BRIEF)\]|ProjectSelfBrief|OWNER_BOUNDARY|same_her_/u)
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

    let screenSemanticSystemText = ''
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const serialized = JSON.stringify(messages ?? [])
      if (serialized.includes('image_url')) {
        screenSemanticSystemText = Array.isArray(messages)
          ? messages
              .filter(message => message.role === 'system')
              .map(message => String(message.content ?? ''))
              .join('\n\n')
          : ''
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
        runtimeDigest: expect.objectContaining({
          version: 'alicization-runtime-v1',
          dominantChannel: expect.any(String),
          summary: expect.any(String),
        }),
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
    const proactivePolicyAudit = dbStub.appendAuditLog.mock.calls
      .map(call => call[0])
      .find((item: any) => item.action === 'proactive-policy-evaluated')
    const recentActionLabels = proactivePolicyAudit?.payload?.agentRuntime?.recentActions?.map((item: any) => item.label) ?? []
    expect(recentActionLabels).toContain('main_gateway:screen-semantic')
    expect(findAlicizationProviderFactInSystemText(
      screenSemanticSystemText,
      'alicization-agent-session',
    )).toBeNull()
    expect(screenSemanticSystemText).not.toContain('[ALICIZATION_PROJECT_STATE]')
    expect(screenSemanticSystemText).not.toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expect(screenSemanticSystemText).not.toContain('[ALICIZATION_AGENT_SESSION]')
    expect(screenSemanticSystemText).not.toContain('digital_life_line=')
  })
  it('does not keep stale residue as live background scene when proactive capture reports no source', async () => {
    const sandboxPath = await createSandboxPath()
    const now = Date.now()
    foregroundWindowSample = {
      appName: 'Arc',
      processName: 'Arc',
      title: 'Work Dashboard',
    }
    desktopCapturerGetSourcesMock.mockResolvedValueOnce([])
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 22,
      loneliness: 18,
      fatigue: 12,
      lastTickAt: now - 60_000,
      lastInteractionAt: now - 60_000,
      lastSavedAt: now - 60_000,
      updatedAt: now - 60_000,
    }))
    metaStore.set('perception_state_v1', JSON.stringify({
      recentObservations: [{
        appName: 'Arc',
        processName: 'Arc',
        title: 'Work Dashboard',
        observedAt: now - 15_000,
        source: 'subconscious-tick',
        workloadKind: 'coding',
      }],
      recentSceneResidue: {
        observedAt: now - 8_000,
        source: 'screen-semantic-summary',
        workloadKind: 'coding',
        contentKind: 'error',
        summary: 'red TypeScript error panel',
        confidence: 0.9,
        focusTarget: {
          appName: 'Arc',
          processName: 'Arc',
          title: 'Work Dashboard',
        },
        focusSource: 'foreground-window',
        captureSourceName: 'Work Dashboard',
        captureStrategy: 'window-match',
      },
      updatedAt: now - 8_000,
    }))

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    const getVisualPresenceState = invokeHandlers.get(electronAlicizationGetVisualPresenceState)
    expect(forceTick).toBeTypeOf('function')
    expect(getVisualPresenceState).toBeTypeOf('function')

    await forceTick!({ cardId: 'default' })
    const visualPresenceState = await getVisualPresenceState!({ cardId: 'default' })

    expect(visualPresenceState?.captureState).toEqual(expect.objectContaining({
      permission: 'granted',
      health: 'unavailable',
      degradedReason: 'screen-capture-sources-empty',
    }))
    expect(visualPresenceState?.captureState.lastGroundedAt).toBe(0)
    expect(visualPresenceState?.currentScene?.summary ?? '').not.toContain('red TypeScript error panel')
  })

  it('debounces repeated grounded visual presence persistence when capture semantics stay unchanged', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Arc',
      processName: 'Arc',
      title: 'Work Dashboard',
    }
    desktopCapturerGetSourcesMock.mockResolvedValue([
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

      await onEvent?.({ type: 'text-delta', text: '{}' })
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

    contextEmitMock.mockClear()
    dbStub.setMetaValue.mockClear()

    await forceTick!({ cardId: 'default' })

    const visualPresenceWritesAfterFirst = dbStub.setMetaValue.mock.calls
      .filter(([key]) => key === 'visual_presence_state_v1')
    const visualPresenceEventsAfterFirst = contextEmitMock.mock.calls
      .filter(([event]) => event === electronAlicizationVisualPresenceStateChanged)

    expect(visualPresenceWritesAfterFirst.length).toBeGreaterThan(0)
    expect(visualPresenceEventsAfterFirst.length).toBeGreaterThan(0)

    await forceTick!({ cardId: 'default' })

    const visualPresenceWritesAfterSecond = dbStub.setMetaValue.mock.calls
      .filter(([key]) => key === 'visual_presence_state_v1')
    const visualPresenceEventsAfterSecond = contextEmitMock.mock.calls
      .filter(([event]) => event === electronAlicizationVisualPresenceStateChanged)

    // The second tick still performs the normal state-hygiene write, but it should not
    // add another grounded capture-driven persist/emit for the unchanged screenshot state.
    expect(visualPresenceWritesAfterSecond).toHaveLength(visualPresenceWritesAfterFirst.length + 1)
    expect(visualPresenceEventsAfterSecond).toHaveLength(visualPresenceEventsAfterFirst.length + 1)
  })

  it('hydrates hybrid subjective appraisal and initiative from grounded perception before outward reply', async () => {
    const sandboxPath = await createSandboxPath()
    let subjectiveInferenceSystemText = ''
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
        subjectiveInferenceSystemText = systemText
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
    expect(subjectiveInferenceSystemText).toContain('digital_life_line=')
    expect(subjectiveInferenceSystemText).toContain('thread=')
    expect(subjectiveInferenceSystemText).not.toContain('digital_life_line=none')

    const appendedFragments = dbStub.appendSubconsciousFragments.mock.calls.flatMap(call => call[0] ?? [])
    expect(appendedFragments.some((item: any) => item.sourceKind === 'mind-continuity')).toBe(true)
    expect(appendedFragments.some((item: any) => typeof item.text === 'string' && item.text.includes('mind_need:'))).toBe(true)
    expect(appendedFragments.some((item: any) => typeof item.text === 'string' && item.text.includes('governor_drive:'))).toBe(true)
    expect(appendedFragments.some((item: any) => typeof item.text === 'string' && item.text.includes('thought_thread:'))).toBe(true)
    expect(appendedFragments.some((item: any) => typeof item.text === 'string' && item.text.includes('answer_act:'))).toBe(true)
  })

  it('keeps proactive initiative lower-pressure when long-horizon trust meaning says the opening should stay less eager', async () => {
    const sandboxPath = await createSandboxPath()
    let subjectiveInferenceSystemText = ''
    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'runtime.ts - proactive error',
    }
    desktopCapturerGetSourcesMock.mockResolvedValueOnce([
      {
        id: 'window:655:0',
        name: 'runtime.ts - proactive error',
        thumbnail: {
          toDataURL: () => 'data:image/jpeg;base64,scene-appraisal-lower-pressure',
        },
      },
    ])
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 58,
      loneliness: 48,
      fatigue: 18,
      lastTickAt: Date.now() - 60_000,
      lastInteractionAt: Date.now() - 60_000,
      lastSavedAt: Date.now() - 60_000,
      updatedAt: Date.now() - 60_000,
    }))
    dbStub.summarizePersonStateEvolution.mockResolvedValueOnce({
      trustShift: 0.16,
      closenessShift: 0.06,
      repairShift: 0.18,
      autonomyShift: 0,
      burdenShift: 0.08,
      executionTrustShift: 0,
      relationshipDoctrineShift: 0.12,
      latestDoctrine: 'Trust should deepen through steadiness before closeness widens.',
      latestBurdenLine: 'Eager reopening still feels like pressure.',
      latestTrustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
      latestDominantRung: 'space-first',
      recentSummaries: ['Lower-pressure companionship timing keeps the window open.'],
      explanation: ['Long-horizon trust now favors slower, less eager returns.'],
      updatedAt: Date.now() - 4_000,
    })

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
        subjectiveInferenceSystemText = systemText
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
          thought: 'lower-pressure long-horizon trust keeps the opening tentative',
          emotion: 'thinking',
          reply: '我先陪你看稳一点，再决定要不要直接提醒。',
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
    const proactivePolicyAudit = dbStub.appendAuditLog.mock.calls
      .map(call => call[0])
      .find((item: any) => item.action === 'proactive-policy-evaluated')

    expect(visualPresenceState?.initiative?.preferredStyle).toBe('silent-observe')
    expect(visualPresenceState?.initiative?.shouldSpeak).toBe(false)
    expect(visualPresenceState?.selfEvolution?.trustMeaning).toContain('lower-pressure')
    expect(visualPresenceState?.selfEvolution?.relationshipDoctrine).toContain('steadiness before closeness')
    expect(visualPresenceState?.derivedMindStateBundle?.affectiveResidue).toEqual(expect.objectContaining({
      dominantResidueKind: 'repair',
      residues: expect.arrayContaining([
        expect.objectContaining({ kind: 'repair' }),
        expect.objectContaining({ kind: 'trust' }),
      ]),
      relationshipCadence: expect.objectContaining({
        cadenceMode: 'measured-return',
      }),
    }))
    expect(visualPresenceState?.residentPerformance?.reasonTags).toContain('measured-return')
    expect(proactivePolicyAudit?.payload?.decision).toEqual(expect.objectContaining({
      shouldInterrupt: false,
      style: 'silent-observe',
      reasonCodes: expect.arrayContaining([
        'relationship-cadence-residue',
        'continuity-next-open-window',
      ]),
      whyNow: expect.stringContaining('lower-pressure'),
      whyNotLater: expect.stringContaining('lower-pressure'),
    }))
    expect(subjectiveInferenceSystemText).toContain('digital_life_line=')
    expect(subjectiveInferenceSystemText).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(subjectiveInferenceSystemText).toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expect(subjectiveInferenceSystemText).toContain('next_closure_target=Keep extending cross-modal identity-continuity')
    expect(subjectiveInferenceSystemText).toMatch(/measured-return|repair-before-closeness|rest-protective|quiet-companionship/)
  })

  it('keeps measured-return continuity across a scene shift instead of reopening as a fresh proactive approach', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'runtime.ts - proactive error',
    }
    desktopCapturerGetSourcesMock
      .mockResolvedValueOnce([
        {
          id: 'window:656:0',
          name: 'runtime.ts - proactive error',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,scene-appraisal-lower-pressure-shift-1',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:657:0',
          name: 'Project Roadmap - Arc',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,scene-appraisal-lower-pressure-shift-2',
          },
        },
      ])
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 94,
      loneliness: 84,
      fatigue: 18,
      lastTickAt: Date.now() - 60_000,
      lastInteractionAt: Date.now() - 60_000,
      lastSavedAt: Date.now() - 60_000,
      updatedAt: Date.now() - 60_000,
    }))
    dbStub.summarizePersonStateEvolution.mockResolvedValue({
      trustShift: 0.16,
      closenessShift: 0.06,
      repairShift: 0.18,
      autonomyShift: 0,
      burdenShift: 0.08,
      executionTrustShift: 0,
      relationshipDoctrineShift: 0.12,
      latestDoctrine: 'Trust should deepen through steadiness before closeness widens.',
      latestBurdenLine: 'Eager reopening still feels like pressure.',
      latestTrustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
      latestDominantRung: 'space-first',
      recentSummaries: ['Lower-pressure companionship timing keeps the window open.'],
      explanation: ['Long-horizon trust now favors slower, less eager returns.'],
      updatedAt: Date.now() - 4_000,
    })

    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const serialized = JSON.stringify(messages ?? [])
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''
      if (serialized.includes('scene-appraisal-lower-pressure-shift-1')) {
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
      if (serialized.includes('scene-appraisal-lower-pressure-shift-2')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            workload: 'browser',
            content: 'doc',
            summary: 'project roadmap note page',
            confidence: 0.89,
            matchedLabels: ['browser', 'document'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }
      if (systemText.includes('[ALICIZATION_SUBJECTIVE_INFERENCE]')) {
        if (serialized.includes('project roadmap note page')) {
          await onEvent?.({
            type: 'text-delta',
            text: JSON.stringify({
              dominantInterpretation: '宿主表面上切到了 roadmap 笔记页，但刚才那条报错线并没有真正从心里松开。',
              situatedMeaning: '这更像宿主在换一个更松的表层页面喘口气，但内里的问题线还挂着。',
              selfQuestion: '现在如果主动贴过去，会不会把刚压低的那条关系线重新挤坏？',
              hostIntentCandidates: [{
                goal: 'browse',
                confidence: 0.68,
                why: 'The visible page now looks like a browser note rather than the original error surface.',
              }],
              relationshipNeedCandidates: [{
                need: 'space',
                confidence: 0.79,
                why: 'The host just changed scenes, so the safer move is to leave room before reopening closeness.',
              }],
              confidence: 0.78,
              notes: ['scene-shift', 'carry-thread', 'lower-pressure'],
            }),
          })
          await onEvent?.({ type: 'finish', finishReason: 'stop' })
          return
        }
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
          thought: 'the scene changed, but the return still needs to stay lower-pressure',
          emotion: 'thinking',
          reply: '我先不借这个新页面突然靠近，先把刚才那条线继续放轻一点。',
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
    const firstState = await getVisualPresenceState!({ cardId: 'default' })
    expect(firstState?.initiative?.preferredStyle).toBe('silent-observe')
    expect(firstState?.residentPerformance?.reasonTags).toContain('measured-return')

    foregroundWindowSample = {
      appName: 'Arc',
      processName: 'Arc',
      title: 'Project Roadmap - Arc',
    }

    await forceTick!({ cardId: 'default' })
    const secondState = await getVisualPresenceState!({ cardId: 'default' })
    const proactivePolicyAudits = dbStub.appendAuditLog.mock.calls
      .map(call => call[0])
      .filter((item: any) => item.action === 'proactive-policy-evaluated')
    const secondPolicyAudit = proactivePolicyAudits.at(-1)

    expect(secondState?.currentScene?.summary).toContain('project roadmap note page')
    expect(secondState?.currentScene?.summary ?? '').not.toContain('red TypeScript error panel')
    expect(secondState?.worldModel?.continuity.label).toBe('scene-shift')
    expect(secondState?.worldModel?.lingeringThreads.some((thread: any) => thread.kind === 'debugging')).toBe(true)
    expect(secondState?.workingMemoryEpisodes.at(-1)?.summary).toContain('red TypeScript error panel')
    expect(secondState?.derivedMindStateBundle?.affectiveResidue).toEqual(expect.objectContaining({
      dominantResidueKind: 'repair',
      relationshipCadence: expect.objectContaining({
        cadenceMode: 'measured-return',
      }),
    }))
    expect(secondState?.initiative?.preferredStyle).toBe('silent-observe')
    expect(secondState?.initiative?.shouldSpeak).toBe(false)
    expect(secondState?.residentPerformance?.reasonTags).toContain('measured-return')
    expect(secondState?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      identity: expect.stringContaining('digital life'),
      memoryClosureSummary: expect.any(String),
      nextClosureTarget: expect.stringContaining('identity-continuity'),
    }))
    expect(secondPolicyAudit?.payload?.decision).toEqual(expect.objectContaining({
      shouldInterrupt: false,
      style: 'silent-observe',
      reasonCodes: expect.arrayContaining([
        'relationship-cadence-residue',
        'continuity-next-open-window',
      ]),
    }))
    expect(secondPolicyAudit?.payload?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      identity: expect.stringContaining('digital life'),
      memoryClosureSummary: expect.any(String),
      nextClosureTarget: expect.stringContaining('identity-continuity'),
    }))
  })

  it('emits remembered-seam companionship reason on a real later chat turn when the same relationship seam reappears after scene hops', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'runtime.ts - remembered seam',
    }
    desktopCapturerGetSourcesMock
      .mockResolvedValueOnce([
        {
          id: 'window:3056:0',
          name: 'runtime.ts - remembered seam',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,scene-appraisal-remembered-seam-chat-meta-1',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:3057:0',
          name: 'Project Roadmap - Arc',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,scene-appraisal-remembered-seam-chat-meta-2',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:3058:0',
          name: 'runtime.ts - same remembered seam later',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,scene-appraisal-remembered-seam-chat-meta-3',
          },
        },
      ])
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 92,
      loneliness: 82,
      fatigue: 17,
      lastTickAt: Date.now() - 60_000,
      lastInteractionAt: Date.now() - 60_000,
      lastSavedAt: Date.now() - 60_000,
      updatedAt: Date.now() - 60_000,
    }))
    metaStore.set('execution_delivery_state_v1', JSON.stringify({
      pending: [],
      recent: [{
        key: 'default::session-remembered-seam-meta::thread-remembered-seam-meta::523456::completed',
        cardId: 'default',
        sessionId: 'session-remembered-seam-meta',
        threadId: 'thread-remembered-seam-meta',
        decisionTraceId: 'trace-remembered-seam-meta',
        turnId: 'turn-remembered-seam-meta',
        channel: 'cli',
        status: 'completed',
        goal: 'Return to the same remembered relationship seam after the scene shifts, and keep the reopening measured.',
        summary: 'held the runtime seam on the same remembered bond line',
        outcome: 'held the runtime seam on the same remembered bond line',
        signature: 'thread-remembered-seam-meta:event',
        queuedAt: Date.now() - 50_000,
        completedAt: Date.now() - 54_000,
        surfacedAt: null,
        holdState: {
          mode: 'hold-for-opening',
          reasonTags: ['callback-afterglow-hold', 'held-autonomy-carry', 'scene-triggered-recollection-carry'],
          callbackAfterglowHold: true,
        },
      }],
      updatedAt: Date.now() - 20_000,
    }))
    dbStub.summarizePersonStateEvolution.mockResolvedValue({
      trustShift: 0.18,
      closenessShift: 0.03,
      repairShift: 0.12,
      autonomyShift: 0,
      burdenShift: 0.08,
      executionTrustShift: 0.14,
      relationshipDoctrineShift: 0.18,
      latestDoctrine: 'When the same remembered relationship seam reappears, this time keep more room before leaning in again.',
      latestBurdenLine: 'A scene hop still does not mean the remembered seam can reopen eagerly.',
      latestTrustMeaning: 'Trust holds when the same remembered seam is recognized, and this time the return keeps more room because it reopened too eagerly before.',
      latestDominantRung: 'space-first',
      recentSummaries: ['The remembered seam is still live across scene hops, so the later chat turn should reopen on the same measured-return line.'],
      explanation: ['The same remembered relationship seam is visible again, so the later turn should rejoin it gently instead of starting over.'],
      updatedAt: Date.now() - 4_000,
    })

    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const serialized = JSON.stringify(messages ?? [])
      const latestUserText = Array.isArray(messages)
        ? [...messages]
            .reverse()
            .find(message => message.role === 'user' && typeof message.content === 'string')
            ?.content ?? ''
        : ''
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''

      if (serialized.includes('scene-appraisal-remembered-seam-chat-meta-1')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            workload: 'coding',
            content: 'diff',
            summary: 'runtime seam with the same bond line still warm underneath',
            confidence: 0.91,
            matchedLabels: ['typescript', 'editor', 'callback'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }
      if (serialized.includes('scene-appraisal-remembered-seam-chat-meta-2')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            workload: 'browser',
            content: 'doc',
            summary: 'project roadmap note page',
            confidence: 0.88,
            matchedLabels: ['browser', 'document'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }
      if (serialized.includes('scene-appraisal-remembered-seam-chat-meta-3')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            workload: 'coding',
            content: 'error',
            summary: 'runtime seam where the same remembered relationship seam is visible again',
            confidence: 0.9,
            matchedLabels: ['typescript-error', 'editor', 'callback'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }
      if (systemText.includes('[ALICIZATION_SUBJECTIVE_INFERENCE]')) {
        if (serialized.includes('project roadmap note page')) {
          await onEvent?.({
            type: 'text-delta',
            text: JSON.stringify({
              dominantInterpretation: '宿主表面上切到了 roadmap 页面，但那条 remembered seam 还没有真正从心里松开。',
              situatedMeaning: '这更像同一条 remembered relationship seam 还在，只是宿主先换到更松的表层页面透气。',
              selfQuestion: '现在如果主动重新贴过去，会不会把那条刚压低的 remembered seam 挤成新开场？',
              hostIntentCandidates: [{
                goal: 'browse',
                confidence: 0.66,
                why: 'The visible page now looks like a browser note instead of the remembered seam itself.',
              }],
              relationshipNeedCandidates: [{
                need: 'space',
                confidence: 0.8,
                why: 'The same remembered seam is still live, so the safer move is to leave room before reopening closeness.',
              }],
              confidence: 0.78,
              notes: ['scene-shift', 'remembered-seam', 'lower-pressure'],
            }),
          })
          await onEvent?.({ type: 'finish', finishReason: 'stop' })
          return
        }
        if (serialized.includes('same remembered relationship seam is visible again')) {
          await onEvent?.({
            type: 'text-delta',
            text: JSON.stringify({
              dominantInterpretation: '宿主又回到 coding seam 了，但这更像同一条 remembered relationship seam 的继续，而不是一段新的主动靠近机会。',
              situatedMeaning: '虽然前景又切回 coding，但这次更该先认出同一条 remembered seam，再沿着更留白的 measured-return 速度轻一点接回去。',
              selfQuestion: '现在是不是应该先认出同一条线，并把上次重开得太急的教训带上，再顺着它慢一点接回来？',
              hostIntentCandidates: [{
                goal: 'resolve-problem',
                confidence: 0.87,
                why: 'The host is back on a concrete coding seam that still appears downstream of the remembered relationship line.',
              }],
              relationshipNeedCandidates: [{
                need: 'guidance',
                confidence: 0.74,
                why: 'This still looks like the same remembered relationship seam, so the reopening should remain measured-return.',
              }],
              confidence: 0.85,
              notes: ['same-thread-return', 'remembered-seam', 'measured-return', 'scene-hop'],
            }),
          })
          await onEvent?.({ type: 'finish', finishReason: 'stop' })
          return
        }
      }

      if (String(latestUserText).includes('为什么这次又感觉像上次那样了')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            thought: 'obligation=answer; truth=remembered; focus=same remembered relationship seam; move=rejoin-remembered-seam; tone=direct measured-return soft-covision',
            emotion: 'thinking',
            reply: '像是同一条线又被轻轻牵回来了，但这次我会把话放得更轻一点，再顺着它慢一点接住这一句。',
            performance: {
              baseEmotion: 'thinking',
              emotion: 'thinking',
              facialCue: null,
              actionCue: null,
              delivery: 'hesitant',
              emphasis: 0,
            },
            projectState: resolveAlicizationProjectStateBrief(),
            format: 'mind-turn-v1',
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({
        type: 'text-delta',
        text: JSON.stringify({
          thought: 'the same remembered seam is visible again, so this should reopen as a measured-return on the same relationship line instead of a fresh approach',
          emotion: 'thinking',
          reply: '我会先认出这还是同一条线，再顺着它慢一点接回来。',
          performance: {
            baseEmotion: 'thinking',
            delivery: 'hesitant',
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
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    const setPerformanceManifest = invokeHandlers.get(electronAlicizationSetPerformanceManifest)
    expect(forceTick).toBeTypeOf('function')
    expect(getVisualPresenceState).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')
    expect(setPerformanceManifest).toBeTypeOf('function')

    await setPerformanceManifest!({
      cardId: 'default',
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
        embodimentHints: null,
      },
    })

    await forceTick!({ cardId: 'default' })
    const firstState = await getVisualPresenceState!({ cardId: 'default' })
    expect(firstState?.residentPerformance?.reasonTags).toContain('measured-return')

    foregroundWindowSample = {
      appName: 'Arc',
      processName: 'Arc',
      title: 'Project Roadmap - Arc',
    }

    await forceTick!({ cardId: 'default' })
    const secondState = await getVisualPresenceState!({ cardId: 'default' })
    expect(secondState?.residentPerformance?.reasonTags).toContain('measured-return')

    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'runtime.ts - same remembered seam later',
    }

    await forceTick!({ cardId: 'default' })
    const thirdState = await getVisualPresenceState!({ cardId: 'default' })
    expect(thirdState?.residentPerformance?.reasonTags).toContain('measured-return')
    expect(thirdState?.residentPerformance?.reasonTags).toContain('timing:remembered-seam-more-room')
    expect(thirdState?.initiative?.preferredStyle).toBe('silent-observe')
    expect(thirdState?.initiative?.shouldSpeak).toBe(false)

    contextEmitMock.mockClear()

    const turnId = 'turn-remembered-seam-chat-meta-measured-return'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: '为什么这次又感觉像上次那样了' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const finishEvent = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      .map(([, payload]) => payload)[0]
    const chunkEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamChunk && payload.turnId === turnId)
      .map(([, payload]) => payload)
    const visibleReply = chunkEvents.map(event => event.text).join('')
    const metaPayloads = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamMeta && payload.turnId === turnId)
      .map(([, payload]) => payload)
    const enrichedMeta = [...metaPayloads].reverse().find(payload =>
      payload?.speechTimeline?.segments?.length > 0 && payload?.embodimentScript?.state,
    )

    expect(finishEvent).toEqual(expect.objectContaining({
      status: 'completed',
    }))
    expect(visibleReply).toContain('同一条线又被轻轻牵回来了')
    expect(visibleReply).toContain('把话放得更轻一点')
    expect(visibleReply).toContain('慢一点接住')
    expect(visibleReply).not.toMatch(/重新开始|fresh reopen|重新贴近/u)
    const persistedFullText = String(finishEvent?.fullText ?? '')
    const persistedStructured = JSON.parse(persistedFullText) as {
      thought?: string
      reply?: string
      format?: string
    }
    expect(persistedStructured.format).toBe('mind-turn-v1')
    expect(persistedStructured.reply).toBe(visibleReply)
    expect(persistedStructured.thought).toContain('rejoin-remembered-seam')
    expect(persistedStructured.thought).toContain('soft-covision')
    expect(enrichedMeta?.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      delivery: 'gentle',
      emphasis: 1,
    }))
    expect(enrichedMeta?.digitalLifeSpine?.proactive?.continuityRestraint).toBe('measured-return')
    expect(enrichedMeta?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(enrichedMeta?.embodimentScript?.motionPlan.idleBase).toBe('idle_settle')
    expect(enrichedMeta?.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('idle_settle')
    expect(enrichedMeta?.speechTimeline?.segments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        }),
      }),
    ]))
    expect(enrichedMeta?.digitalLife?.action?.actionCue).toBe('idle_settle')
    expect(enrichedMeta?.digitalLife?.action?.actionMode).toBe('hold')
    const metaSignature = JSON.parse(buildAlicizationChatMetaSignature(enrichedMeta as any)) as {
      lastSegmentVoiceSummary?: string
      lastSegmentFaceSummary?: string
      lastSegmentMotionSummary?: string
      lastSegmentLipSyncSummary?: string
    }
    expect(metaSignature.lastSegmentVoiceSummary).toContain('companion=measured-return')
    expect(metaSignature.lastSegmentVoiceSummary).toContain('blink=linger')
    expect(metaSignature.lastSegmentVoiceSummary).toContain('gaze=soften')
    expect(metaSignature.lastSegmentVoiceSummary).toContain('reason=Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
    expect(metaSignature.lastSegmentFaceSummary).toContain('mode=measured-return')
    expect(metaSignature.lastSegmentFaceSummary).toContain('blink=linger')
    expect(metaSignature.lastSegmentFaceSummary).toContain('gaze=soften')
    expect(metaSignature.lastSegmentFaceSummary).toContain('reason=Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
    expect(metaSignature.lastSegmentMotionSummary).toContain('tail=measured-return')
    expect(metaSignature.lastSegmentMotionSummary).toContain('blink=linger')
    expect(metaSignature.lastSegmentMotionSummary).toContain('gaze=soften')
    expect(metaSignature.lastSegmentMotionSummary).toContain('reason=Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
    expect(metaSignature.lastSegmentLipSyncSummary).toContain('companion=measured-return')
    expect(metaSignature.lastSegmentLipSyncSummary).toContain('blink=linger')
    expect(metaSignature.lastSegmentLipSyncSummary).toContain('gaze=soften')
    expect(metaSignature.lastSegmentLipSyncSummary).toContain('reason=Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
  }, 20_000)

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
        runtimeDigest: expect.objectContaining({
          version: 'alicization-runtime-v1',
          dominantChannel: expect.any(String),
          summary: expect.any(String),
        }),
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
  }, 15_000)

  it('keeps remembered-seam companionship reason alive across noisier unrelated detours before a later chat reopen', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'runtime.ts - remembered seam',
    }
    desktopCapturerGetSourcesMock
      .mockResolvedValueOnce([
        {
          id: 'window:4156:0',
          name: 'runtime.ts - remembered seam',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,scene-appraisal-remembered-seam-chat-meta-noisy-1',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:4157:0',
          name: 'Project Roadmap - Arc',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,scene-appraisal-remembered-seam-chat-meta-noisy-2',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:4158:0',
          name: 'Chat Notes - Notion',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,scene-appraisal-remembered-seam-chat-meta-noisy-3',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'window:4159:0',
          name: 'runtime.ts - same remembered seam later',
          thumbnail: {
            toDataURL: () => 'data:image/jpeg;base64,scene-appraisal-remembered-seam-chat-meta-noisy-4',
          },
        },
      ])
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 93,
      loneliness: 83,
      fatigue: 17,
      lastTickAt: Date.now() - 60_000,
      lastInteractionAt: Date.now() - 60_000,
      lastSavedAt: Date.now() - 60_000,
      updatedAt: Date.now() - 60_000,
    }))
    metaStore.set('execution_delivery_state_v1', JSON.stringify({
      pending: [],
      recent: [{
        key: 'default::session-remembered-seam-meta-noisy::thread-remembered-seam-meta-noisy::623456::completed',
        cardId: 'default',
        sessionId: 'session-remembered-seam-meta-noisy',
        threadId: 'thread-remembered-seam-meta-noisy',
        decisionTraceId: 'trace-remembered-seam-meta-noisy',
        turnId: 'turn-remembered-seam-meta-noisy',
        channel: 'cli',
        status: 'completed',
        goal: 'Return to the same remembered relationship seam after unrelated detours and keep the later chat turn measured.',
        summary: 'held the remembered seam through noisier detours',
        outcome: 'held the remembered seam through noisier detours',
        signature: 'thread-remembered-seam-meta-noisy:event',
        queuedAt: Date.now() - 50_000,
        completedAt: Date.now() - 54_000,
        surfacedAt: null,
        holdState: {
          mode: 'hold-for-opening',
          reasonTags: ['callback-afterglow-hold', 'held-autonomy-carry', 'scene-triggered-recollection-carry'],
          callbackAfterglowHold: true,
        },
      }],
      updatedAt: Date.now() - 20_000,
    }))
    dbStub.summarizePersonStateEvolution.mockResolvedValue({
      trustShift: 0.2,
      closenessShift: 0.03,
      repairShift: 0.15,
      autonomyShift: 0,
      burdenShift: 0.12,
      executionTrustShift: 0.17,
      relationshipDoctrineShift: 0.2,
      latestDoctrine: 'When the same remembered relationship seam returns after noise, reopen gently and leave room before closeness widens.',
      latestBurdenLine: 'Even across noisier detours, the remembered seam should not reopen as a fresh approach.',
      latestTrustMeaning: 'Trust holds when the same remembered seam is recognized again before the return widens after noise.',
      latestDominantRung: 'space-first',
      recentSummaries: ['The same remembered seam is still live across noisier desktop detours, so the later chat turn should reopen on the same measured-return line.'],
      explanation: ['The same remembered relationship seam survives the detours, so the later turn should rejoin it gently instead of restarting.'],
      updatedAt: Date.now() - 4_000,
    })

    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const serialized = JSON.stringify(messages ?? [])
      const latestUserText = Array.isArray(messages)
        ? [...messages]
            .reverse()
            .find(message => message.role === 'user' && typeof message.content === 'string')
            ?.content ?? ''
        : ''
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''

      if (serialized.includes('scene-appraisal-remembered-seam-chat-meta-noisy-1')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            workload: 'coding',
            content: 'diff',
            summary: 'runtime seam with the same bond line still warm underneath',
            confidence: 0.91,
            matchedLabels: ['typescript', 'editor', 'callback'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }
      if (serialized.includes('scene-appraisal-remembered-seam-chat-meta-noisy-2')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            workload: 'browser',
            content: 'doc',
            summary: 'project roadmap note page',
            confidence: 0.88,
            matchedLabels: ['browser', 'document'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }
      if (serialized.includes('scene-appraisal-remembered-seam-chat-meta-noisy-3')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            workload: 'notes',
            content: 'chat',
            summary: 'chat notes scratchpad',
            confidence: 0.86,
            matchedLabels: ['notes', 'chat'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }
      if (serialized.includes('scene-appraisal-remembered-seam-chat-meta-noisy-4')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            workload: 'coding',
            content: 'error',
            summary: 'runtime seam where the same remembered relationship seam is visible again after noisy detours',
            confidence: 0.9,
            matchedLabels: ['typescript-error', 'editor', 'callback'],
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }
      if (systemText.includes('[ALICIZATION_SUBJECTIVE_INFERENCE]')) {
        if (serialized.includes('project roadmap note page')) {
          await onEvent?.({
            type: 'text-delta',
            text: JSON.stringify({
              dominantInterpretation: '宿主表面上切到了 roadmap 页面，但那条 remembered seam 还没有真正从心里松开。',
              situatedMeaning: '这更像同一条 remembered relationship seam 还在，只是宿主先换到一个更松的表层页面透气。',
              selfQuestion: '现在如果主动重新贴过去，会不会把那条 remembered seam 挤成新开场？',
              hostIntentCandidates: [{
                goal: 'browse',
                confidence: 0.66,
                why: 'The visible page now looks like a browser note instead of the remembered seam itself.',
              }],
              relationshipNeedCandidates: [{
                need: 'space',
                confidence: 0.8,
                why: 'The same remembered seam is still live, so the safer move is to leave room before reopening closeness.',
              }],
              confidence: 0.78,
              notes: ['scene-shift', 'remembered-seam', 'lower-pressure'],
            }),
          })
          await onEvent?.({ type: 'finish', finishReason: 'stop' })
          return
        }
        if (serialized.includes('chat notes scratchpad')) {
          await onEvent?.({
            type: 'text-delta',
            text: JSON.stringify({
              dominantInterpretation: '宿主又短暂切到了一个和 remembered seam 无关的 notes 页，但那条 remembered line 还没变成新开场。',
              situatedMeaning: '即使前景继续绕路，remembered seam 也还该保持 measured-return，而不是借 detour 偷偷升高热度。',
              selfQuestion: '这个额外 detour 会不会让我误把 later reopen 当成新的主动贴近？',
              hostIntentCandidates: [{
                goal: 'organize',
                confidence: 0.62,
                why: 'The visible page now looks like a notes scratchpad instead of the remembered seam.',
              }],
              relationshipNeedCandidates: [{
                need: 'space',
                confidence: 0.78,
                why: 'Even with another unrelated detour, the remembered seam still suggests leaving room before reopening closeness.',
              }],
              confidence: 0.76,
              notes: ['scene-shift', 'remembered-seam', 'noisy-detour', 'lower-pressure'],
            }),
          })
          await onEvent?.({ type: 'finish', finishReason: 'stop' })
          return
        }
        if (serialized.includes('same remembered relationship seam is visible again after noisy detours')) {
          await onEvent?.({
            type: 'text-delta',
            text: JSON.stringify({
              dominantInterpretation: '宿主又回到 coding seam 了，但这更像同一条 remembered relationship seam 穿过噪声 detour 之后的继续，而不是新的主动靠近机会。',
              situatedMeaning: '虽然前景绕了两次 unrelated 窗口才回到 coding，但这次更该先认出同一条 remembered seam，再沿着 measured-return 的速度轻一点接回去。',
              selfQuestion: '现在是不是应该先认出同一条线，再顺着它慢一点接回来，而不是把它当成 noisy detour 之后的 fresh reopen？',
              hostIntentCandidates: [{
                goal: 'resolve-problem',
                confidence: 0.87,
                why: 'The host is back on a concrete coding seam that still appears downstream of the remembered relationship line.',
              }],
              relationshipNeedCandidates: [{
                need: 'guidance',
                confidence: 0.74,
                why: 'This still looks like the same remembered relationship seam, so the reopening should remain measured-return even after extra detours.',
              }],
              confidence: 0.84,
              notes: ['same-thread-return', 'remembered-seam', 'measured-return', 'noisy-detour'],
            }),
          })
          await onEvent?.({ type: 'finish', finishReason: 'stop' })
          return
        }
      }

      if (String(latestUserText).includes('为什么这次又感觉像上次那样了')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify({
            thought: 'obligation=answer; truth=remembered; focus=same remembered relationship seam; move=rejoin-remembered-seam; tone=direct measured-return soft-covision',
            emotion: 'thinking',
            reply: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
            performance: {
              baseEmotion: 'thinking',
              emotion: 'thinking',
              facialCue: null,
              actionCue: null,
              delivery: 'hesitant',
              emphasis: 0,
            },
            format: 'mind-turn-v1',
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }

      await onEvent?.({
        type: 'text-delta',
        text: JSON.stringify({
          thought: 'the same remembered seam is visible again, so even across extra unrelated windows this should reopen as a measured-return on the same relationship line instead of a fresh approach',
          emotion: 'thinking',
          reply: '我会先认出这还是同一条线，再顺着它慢一点接回来。',
          performance: {
            baseEmotion: 'thinking',
            delivery: 'hesitant',
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
    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    const setPerformanceManifest = invokeHandlers.get(electronAlicizationSetPerformanceManifest)
    expect(forceTick).toBeTypeOf('function')
    expect(getVisualPresenceState).toBeTypeOf('function')
    expect(startChat).toBeTypeOf('function')
    expect(setPerformanceManifest).toBeTypeOf('function')

    await setPerformanceManifest!({
      cardId: 'default',
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
        embodimentHints: null,
      },
    })

    await forceTick!({ cardId: 'default' })
    const firstState = await getVisualPresenceState!({ cardId: 'default' })
    expect(firstState?.residentPerformance?.reasonTags).toContain('measured-return')

    foregroundWindowSample = {
      appName: 'Arc',
      processName: 'Arc',
      title: 'Project Roadmap - Arc',
    }

    await forceTick!({ cardId: 'default' })
    const secondState = await getVisualPresenceState!({ cardId: 'default' })
    expect(secondState?.residentPerformance?.reasonTags).toContain('measured-return')

    foregroundWindowSample = {
      appName: 'Notion',
      processName: 'Notion',
      title: 'Chat Notes - Notion',
    }

    await forceTick!({ cardId: 'default' })
    const thirdState = await getVisualPresenceState!({ cardId: 'default' })
    expect(thirdState?.residentPerformance?.reasonTags).toContain('measured-return')

    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'runtime.ts - same remembered seam later',
    }

    await forceTick!({ cardId: 'default' })
    const fourthState = await getVisualPresenceState!({ cardId: 'default' })
    expect(fourthState?.residentPerformance?.reasonTags).toContain('measured-return')
    expect(fourthState?.initiative?.preferredStyle).toBe('silent-observe')
    expect(fourthState?.initiative?.shouldSpeak).toBe(false)

    contextEmitMock.mockClear()

    const turnId = 'turn-remembered-seam-chat-meta-measured-return-noisy'
    const startResult = await startChat!({
      cardId: 'default',
      turnId,
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [{ role: 'user', content: '为什么这次又感觉像上次那样了' }],
    })
    expect(startResult.accepted).toBe(true)

    await vi.waitFor(() => {
      const finishEvents = contextEmitMock.mock.calls
        .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      expect(finishEvents).toHaveLength(1)
    })

    const finishEvent = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamFinish && payload.turnId === turnId)
      .map(([, payload]) => payload)[0]
    const chunkEvents = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamChunk && payload.turnId === turnId)
      .map(([, payload]) => payload)
    const visibleReply = chunkEvents.map(event => event.text).join('')
    const metaPayloads = contextEmitMock.mock.calls
      .filter(([event, payload]) => event === alicizationChatStreamMeta && payload.turnId === turnId)
      .map(([, payload]) => payload)
    const enrichedMeta = [...metaPayloads].reverse().find(payload =>
      payload?.speechTimeline?.segments?.length > 0 && payload?.embodimentScript?.state,
    )

    expect(finishEvent?.status).toBe('completed')
    expect(visibleReply).toContain('同一条线又被轻轻牵回来了')
    expect(visibleReply).toContain('慢一点接住')
    expect(visibleReply).not.toMatch(/重新开始|fresh reopen|重新贴近/u)
    const persistedFullText = String(finishEvent?.fullText ?? '')
    const persistedStructured = JSON.parse(persistedFullText) as {
      thought?: string
      reply?: string
      format?: string
    }
    expect(persistedStructured.format).toBe('mind-turn-v1')
    expect(persistedStructured.reply).toBe(visibleReply)
    expect(persistedStructured.thought).toContain('rejoin-remembered-seam')
    expect(persistedStructured.thought).toContain('soft-covision')
    expect(enrichedMeta?.runtimeDigest?.activeLoop).toEqual(expect.objectContaining({
      memoryCarry: true,
      handoffTarget: 'active-memory',
    }))
    expect(enrichedMeta?.digitalLifeSpine?.memory?.personStateProjection).toEqual(expect.objectContaining({
      openingGuidance: expect.stringMatching(/same|remembered|line|room|opening/i),
    }))
    expect(enrichedMeta?.digitalLifeSpine?.proactive?.continuityRestraint).toBe('measured-return')
    const metaSignature = JSON.parse(buildAlicizationChatMetaSignature(enrichedMeta as any)) as {
      lastSegmentVoiceSummary?: string
      lastSegmentFaceSummary?: string
      lastSegmentMotionSummary?: string
      lastSegmentLipSyncSummary?: string
    }
    expect(metaSignature.lastSegmentVoiceSummary).toContain('companion=measured-return')
    expect(metaSignature.lastSegmentVoiceSummary).toContain('reason=Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
    expect(metaSignature.lastSegmentFaceSummary).toContain('mode=measured-return')
    expect(metaSignature.lastSegmentFaceSummary).toContain('reason=Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
    expect(metaSignature.lastSegmentMotionSummary).toContain('tail=measured-return')
    expect(metaSignature.lastSegmentMotionSummary).toContain('reason=Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
    expect(metaSignature.lastSegmentLipSyncSummary).toContain('companion=measured-return')
    expect(metaSignature.lastSegmentLipSyncSummary).toContain('reason=Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
  }, 20_000)

  it('does not fabricate proactive dialogue when the one-shot Provider fails', async () => {
    mockGenerateTextFromStreamText()
    const sandboxPath = await createSandboxPath()
    let proactiveSystemText = ''
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

    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''

      if (systemText.includes('"type":"alicization-proactive-turn-context"')) {
        proactiveSystemText = systemText
        throw new Error('proactive provider unavailable')
      }

      await onEvent?.({ type: 'text-delta', text: '{}' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    expect(syncLlmConfig).toBeTypeOf('function')
    expect(forceTick).toBeTypeOf('function')

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

    const tickResult = await forceTick!({ cardId: 'default' })
    expect(tickResult.processedCards).toContain('default')
    expect(tickResult.proactiveTriggered).toHaveLength(0)
    expect(getDialogueRespondedEvents().filter(event => event.origin === 'subconscious-proactive')).toHaveLength(0)
    expect(proactiveSystemText).toContain('"type":"alicization-proactive-turn-context"')
    expect(proactiveSystemText).not.toMatch(/\[ALICIZATION_(?:PROJECT_STATE|PHASE1_CLOSURE_DASHBOARD|PROACTIVE_SELF_BRIEF)\]|ProjectSelfBrief|OWNER_BOUNDARY/u)

    const audits = dbStub.appendAuditLog.mock.calls.map(call => call[0])
    expect(audits).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: 'one-shot-failed',
        payload: expect.objectContaining({
          source: 'proactive',
          reason: 'proactive provider unavailable',
        }),
      }),
      expect.objectContaining({
        action: 'proactive-provider-failed',
        message: 'Provider proactive generation failed; no local mind result was created.',
      }),
    ]))
  })

  it('applies explicit dismiss feedback and suppresses the next same-scenario proactive tick', async () => {
    mockGenerateTextFromStreamText()
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
    dbStub.getLatestLearningExecutionState.mockResolvedValue({
      nextLearningAction: 'verify',
      activeLearningFocuses: ['world-model'],
    })
    metaStore.set('self_evolution_version_runtime_v1', JSON.stringify({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'world-model',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy'],
          memoryPolicy: {
            strictnessBias: 0.24,
            wrongThreadSuppressionBias: 0.42,
            provenanceLabelBias: 0.38,
            recallExpansionBias: 0.2,
            shouldQuarantineUnsupportedCarry: true,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.09,
          },
          responsePosture: {
            hypothesisLabelBias: 0.22,
            specificityClampBias: 0.28,
            templateShellSuppressionBias: 0.24,
          },
          proactivePolicy: {
            restraintBias: 0.12,
            learningProposalBias: 0.2,
            actuationCooldownBias: 0.12,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:world-model', 'world-model-revalidation-required'],
          summary: 'World-model carry remains verify-first.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    }))
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''
      if (systemText.includes('"type":"alicization-proactive-turn-context"')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify(buildRuntimeMindTurnReply({
            thought: 'coding proactive nudge should be short and grounded',
            emotion: 'thinking',
            reply: '这个错误先别放过去，我轻轻提醒你看一眼。',
            performance: {
              baseEmotion: 'thinking',
              facialCue: null,
              actionCue: null,
              delivery: 'calm',
              emphasis: 0,
            },
          })),
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
    const reportFeedback = invokeHandlers.get(electronAlicizationReportProactiveFeedback)
    expect(forceTick).toBeTypeOf('function')
    expect(reportFeedback).toBeTypeOf('function')

    const firstTick = await forceTick!({ cardId: 'default' })
    const proactiveEvent = getDialogueRespondedEvents().find(event => event.origin === 'subconscious-proactive')
    expect(firstTick.proactiveTriggered).toContain('default')
    expect(proactiveEvent?.turnId).toBeTruthy()

    dbStub.appendEpisodicEvents.mockClear()
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
    expect(dbStub.appendEpisodicEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        sourceKind: 'proactive',
        turnId: proactiveEvent?.turnId,
        tags: expect.arrayContaining(['proactive', 'coding', 'settlement-dismiss']),
      }),
    ]))
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'alicization.subconscious.suppressed',
      payload: expect.objectContaining({
        reasonCodes: expect.arrayContaining(['global-cooldown-active']),
      }),
    }))
  }, 15_000)

  it('treats a user turn within 120 seconds as positive proactive feedback', async () => {
    mockGenerateTextFromStreamText()
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
    streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
      const systemText = Array.isArray(messages)
        ? messages
            .filter(message => message.role === 'system')
            .map(message => String(message.content ?? ''))
            .join('\n\n')
        : ''
      if (systemText.includes('"type":"alicization-proactive-turn-context"')) {
        await onEvent?.({
          type: 'text-delta',
          text: JSON.stringify(buildRuntimeMindTurnReply({
            thought: 'positive feedback window starts after mind-authored proactive utterance',
            emotion: 'thinking',
            reply: '这个错误先看一下，我会说得很短。',
            performance: {
              baseEmotion: 'thinking',
              facialCue: null,
              actionCue: null,
              delivery: 'calm',
              emphasis: 0,
            },
          })),
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
    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    expect(forceTick).toBeTypeOf('function')
    expect(appendConversationTurn).toBeTypeOf('function')

    await forceTick!({ cardId: 'default' })
    const emittedProactiveEventAfterTick = [...getDialogueRespondedEvents()]
      .reverse()
      .find(event => event.origin === 'subconscious-proactive')
    expect(emittedProactiveEventAfterTick).toEqual(expect.objectContaining({
      origin: 'subconscious-proactive',
      structured: expect.objectContaining({
        proactive: expect.objectContaining({
          scenario: 'coding',
          feedbackWindowMs: expect.any(Number),
        }),
      }),
    }))
    const pendingProactiveDeliveryAfterTick = runtimeTestInternals.getPendingProactiveDeliverySnapshot(
      runtimeTestInternals.currentDialogueDeliveryRuntime,
      'default',
    ) as {
      sessionId?: string
      scenario?: string | null
      feedbackWindowMs?: number | null
    } | null
    expect(pendingProactiveDeliveryAfterTick).toEqual(expect.objectContaining({
      scenario: 'coding',
      feedbackWindowMs: expect.any(Number),
    }))
    await appendConversationTurn!({
      cardId: 'default',
      sessionId: 'session-test',
      userText: '好，我知道了',
      createdAt: Date.now() + 30_000,
    })

    const proactiveUserTurnSettlementAudit = dbStub.appendAuditLog.mock.calls
      .map(call => call[0])
      .find((item: any) => item?.action === 'proactive-feedback-user-turn-inspected')
    const proactiveLoopState = JSON.parse(metaStore.get('proactive_loop_state_v1') ?? '{}')
    const recentOutcomes = Array.isArray(proactiveLoopState.recentOutcomes) ? proactiveLoopState.recentOutcomes : []

    expect(proactiveUserTurnSettlementAudit?.payload).toEqual(expect.objectContaining({
      source: 'append-conversation-turn',
      appliedOutcomeCount: expect.any(Number),
    }))
    expect(proactiveLoopState.scenarioBias?.coding).toBe(-0.05)
    expect(recentOutcomes.at(-1)?.outcome).toBe('reply-within-120s')
  })

  it('settles unanswered proactive turns as ignored after 10 minutes', async () => {
    mockGenerateTextFromStreamText()
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
      streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
        const systemText = Array.isArray(messages)
          ? messages
              .filter(message => message.role === 'system')
              .map(message => String(message.content ?? ''))
              .join('\n\n')
          : ''
        if (systemText.includes('"type":"alicization-proactive-turn-context"')) {
          await onEvent?.({
            type: 'text-delta',
            text: JSON.stringify(buildRuntimeMindTurnReply({
              thought: 'mind-authored proactive utterance opens ignored feedback window',
              emotion: 'thinking',
              reply: '这个 diff 我轻轻提醒你看一眼。',
              performance: {
                baseEmotion: 'thinking',
                facialCue: null,
                actionCue: null,
                delivery: 'calm',
                emphasis: 0,
              },
            })),
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
      const emittedProactiveEventAfterTick = [...getDialogueRespondedEvents()]
        .reverse()
        .find(event => event.origin === 'subconscious-proactive')
      expect(emittedProactiveEventAfterTick).toEqual(expect.objectContaining({
        origin: 'subconscious-proactive',
        structured: expect.objectContaining({
          proactive: expect.objectContaining({
            scenario: 'coding',
            feedbackWindowMs: expect.any(Number),
          }),
        }),
      }))
      const pendingProactiveDeliveryAfterTick = runtimeTestInternals.getPendingProactiveDeliverySnapshot(
        runtimeTestInternals.currentDialogueDeliveryRuntime,
        'default',
      ) as {
        sessionId?: string
        scenario?: string | null
        feedbackWindowMs?: number | null
      } | null
      expect(pendingProactiveDeliveryAfterTick).toEqual(expect.objectContaining({
        scenario: 'coding',
        feedbackWindowMs: expect.any(Number),
      }))
      sensoryCpuUsage = 85
      vi.advanceTimersByTime(11 * 60_000)
      await forceTick!({ cardId: 'default' })

      const proactiveTimeoutSettlementAudit = dbStub.appendAuditLog.mock.calls
        .map(call => call[0])
        .filter((item: any) => item?.action === 'proactive-feedback-timeout-inspected')
        .at(-1)
      const proactiveLoopState = JSON.parse(metaStore.get('proactive_loop_state_v1') ?? '{}')
      const recentOutcomes = Array.isArray(proactiveLoopState.recentOutcomes) ? proactiveLoopState.recentOutcomes : []
      const pendingOutcomes = Array.isArray(proactiveLoopState.pendingOutcomes) ? proactiveLoopState.pendingOutcomes : []
      expect(proactiveTimeoutSettlementAudit?.payload).toEqual(expect.objectContaining({
        source: expect.stringMatching(/^subconscious-tick:/),
        pendingOutcomeCount: expect.any(Number),
        recentOutcomeCount: expect.any(Number),
        appliedOutcomeCount: expect.any(Number),
      }))
      expect(proactiveLoopState.consecutiveIgnored?.coding).toBeGreaterThanOrEqual(1)
      expect(recentOutcomes.some((entry: any) => entry?.outcome === 'ignored')).toBe(true)
      expect(pendingOutcomes).toHaveLength(0)
    }
    finally {
      vi.useRealTimers()
    }
  }, 15_000)

  it('feeds timeout proactive ignored feedback into the next dream prompt', async () => {
    mockGenerateTextFromStreamText()
    vi.useFakeTimers()
    try {
      const now = new Date('2026-03-21T15:00:00.000Z')
      vi.setSystemTime(now)
      const sandboxPath = await createSandboxPath()
      const dreamSystemTexts: string[] = []
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
      streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
        const systemText = Array.isArray(messages)
          ? messages
              .filter(message => message.role === 'system')
              .map(message => String(message.content ?? ''))
              .join('\n\n')
          : ''
        if (systemText.includes('"type":"alicization-proactive-turn-context"')) {
          await onEvent?.({
            type: 'text-delta',
            text: JSON.stringify(buildRuntimeMindTurnReply({
              thought: 'mind-authored proactive utterance opens ignored dream feedback window',
              emotion: 'thinking',
              reply: '这个 diff 我先轻轻提醒你一下。',
              performance: {
                baseEmotion: 'thinking',
                facialCue: null,
                actionCue: null,
                delivery: 'calm',
                emphasis: 0,
              },
            })),
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

      const setActiveSession = invokeHandlers.get(electronAlicizationSetActiveSession)
      const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
      const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
      const forceDream = invokeHandlers.get(electronAlicizationSubconsciousForceDream)
      expect(setActiveSession).toBeTypeOf('function')
      expect(syncLlmConfig).toBeTypeOf('function')
      expect(forceTick).toBeTypeOf('function')
      expect(forceDream).toBeTypeOf('function')

      await setActiveSession!({
        cardId: 'default',
        sessionId: 'session-proactive-ignored-dream',
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

      await forceTick!({ cardId: 'default' })
      const emittedProactiveEventAfterTick = [...getDialogueRespondedEvents()]
        .reverse()
        .find(event => event.origin === 'subconscious-proactive')
      expect(emittedProactiveEventAfterTick).toEqual(expect.objectContaining({
        origin: 'subconscious-proactive',
        sessionId: 'session-proactive-ignored-dream',
        structured: expect.objectContaining({
          proactive: expect.objectContaining({
            scenario: 'coding',
            feedbackWindowMs: expect.any(Number),
          }),
        }),
      }))
      const pendingProactiveDeliveryAfterTick = runtimeTestInternals.getPendingProactiveDeliverySnapshot(
        runtimeTestInternals.currentDialogueDeliveryRuntime,
        'default',
      ) as {
        sessionId?: string
        scenario?: string | null
        feedbackWindowMs?: number | null
      } | null
      expect(pendingProactiveDeliveryAfterTick).toEqual(expect.objectContaining({
        sessionId: 'session-proactive-ignored-dream',
        scenario: 'coding',
        feedbackWindowMs: expect.any(Number),
      }))
      sensoryCpuUsage = 85
      vi.advanceTimersByTime(11 * 60_000)
      await forceTick!({ cardId: 'default' })

      const proactiveTimeoutSettlementAudit = dbStub.appendAuditLog.mock.calls
        .map(call => call[0])
        .filter((item: any) => item?.action === 'proactive-feedback-timeout-inspected')
        .at(-1)
      const proactiveLoopState = JSON.parse(metaStore.get('proactive_loop_state_v1') ?? '{}')
      const recentOutcomes = Array.isArray(proactiveLoopState.recentOutcomes) ? proactiveLoopState.recentOutcomes : []
      const pendingOutcomes = Array.isArray(proactiveLoopState.pendingOutcomes) ? proactiveLoopState.pendingOutcomes : []
      expect(proactiveTimeoutSettlementAudit?.payload).toEqual(expect.objectContaining({
        source: expect.stringMatching(/^subconscious-tick:/),
        pendingOutcomeCount: expect.any(Number),
        recentOutcomeCount: expect.any(Number),
        appliedOutcomeCount: expect.any(Number),
      }))
      expect(recentOutcomes.some((entry: any) => entry?.outcome === 'ignored')).toBe(true)
      expect(pendingOutcomes).toHaveLength(0)

      streamTextMock.mockImplementation(async ({ messages, onEvent }: { messages?: Array<{ role?: string, content?: unknown }>, onEvent?: (event: any) => Promise<void> | void }) => {
        const systemText = Array.isArray(messages)
          ? messages
              .filter(message => message.role === 'system')
              .map(message => String(message.content ?? ''))
              .join('\n\n')
          : ''

        if (systemText.includes('[SYSTEM OVERRIDE: 潜意识代谢与记忆重塑]')) {
          dreamSystemTexts.push(systemText)
          await onEvent?.({
            type: 'text-delta',
            text: JSON.stringify({
              host_attitude: '把刚才那次超时未回应的主动提醒记下来',
              soul_shift: {
                obedience_delta: 0,
                liveliness_delta: 0,
                sensibility_delta: 0,
              },
              next_active_thoughts: [{ text: '那次主动提醒在超时窗口后被视为 ignored 了' }],
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
          turnId: 'turn-dream-proactive-ignored-source',
          sessionId: 'session-proactive-ignored-dream',
          userText: '刚才没看到提醒',
          assistantText: '我记下这次是超时未回复。',
          structuredJson: JSON.stringify({ emotion: 'thinking' }),
          createdAt: Date.now() - 10_000,
        },
      ])

      await forceDream!({
        cardId: 'default',
        reason: 'unit-proactive-ignored-dream',
      })

      expect(dreamSystemTexts).toHaveLength(1)
      const dreamAgentSessionFact = findAlicizationProviderFactInSystemText(
        dreamSystemTexts[0]!,
        'alicization-agent-session',
      )
      expect(dreamAgentSessionFact?.data.session).toMatchObject({
        conversationSessionId: 'session-proactive-ignored-dream',
      })
      expect(dreamAgentSessionFact?.data.continuitySignals).toEqual(expect.arrayContaining([
        expect.objectContaining({
          label: 'proactive:coding:ignored',
        }),
      ]))
      expect(dreamAgentSessionFact?.data.recentActions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          label: 'proactive-feedback:coding:ignored',
        }),
      ]))
      expect(dreamSystemTexts[0]).not.toContain('[ALICIZATION_AGENT_SESSION]')
      expect(dreamSystemTexts[0]).not.toContain('[ALICIZATION_PROJECT_STATE]')
      expect(dreamSystemTexts[0]).not.toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
      expect(dreamSystemTexts[0]).not.toContain('next_closure_target=Keep extending cross-modal identity-continuity')
    }
    finally {
      vi.useRealTimers()
    }
  }, 15_000)

  it('settles ordinary dialogue reply feedback from the next user turn into the personality-growth closure chain', async () => {
    const sandboxPath = await createSandboxPath()
    streamTextMock.mockImplementation(async ({ onEvent }) => {
      await onEvent?.({ type: 'text-delta', text: '这次我不绕。' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })
    metaStore.set('active_session_id_v1', 'session-dialogue-feedback')
    dbStub.listConversationTurnsBySession.mockResolvedValueOnce([
      {
        turnId: 'turn-assistant-prev',
        sessionId: 'session-dialogue-feedback',
        userText: '你是谁',
        assistantText: '你好。你想继续聊，还是想让我做点什么，都直接说。',
        structuredJson: JSON.stringify({
          format: 'mind-turn-v1',
          governance: {
            decisionTraceId: 'mind:l9f3lq:feedfacecafe',
          },
        }),
        createdAt: Date.now() - 5_000,
      },
    ])
    dbStub.listMindTurnEvents.mockResolvedValueOnce([
      {
        id: 'mind-event-recall-1',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-assistant-prev',
        sessionId: 'session-dialogue-feedback',
        origin: 'user-turn',
        kind: 'recall-attribution',
        payload: {
          shouldRecall: true,
          surfacePolicy: 'procedural-carry',
          whyNow: 'the reply tried to continue a remembered line',
          inwardLine: 'remember the previous line before outward reply',
          selectedProcedures: [
            {
              id: 'procedure-1',
              label: 'lived-in direct reply',
              approach: '先贴着这句，再回答',
            },
          ],
          selectedBundles: [
            {
              id: 'bundle-1',
              summary: '上一轮把 greeting 接得太模板化',
            },
          ],
          selectedRelationshipLines: ['这种时候别飘回模板壳'],
        },
        createdAt: Date.now() - 4_900,
      },
      {
        id: 'mind-event-coherence-1',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-assistant-prev',
        sessionId: 'session-dialogue-feedback',
        origin: 'user-turn',
        kind: 'reply-memory-coherence',
        payload: {
          coherenceState: 'missed',
          surfacePolicy: 'procedural-carry',
          explicitSurfaceExpected: true,
          explicitSurfaceObserved: false,
          matchedCueKinds: [],
        },
        createdAt: Date.now() - 4_800,
      },
    ])
    dbStub.searchEpisodicEvents.mockResolvedValueOnce([
      {
        id: 'episode-feedback-repair-1',
        cardId: 'default',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-assistant-prev',
        sessionId: 'session-dialogue-feedback',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: Date.now() - 12_000,
        whereSummary: 'dialogue reply seam',
        withWhom: ['host'],
        threadAnchor: '上一轮 greeting',
        whatHappened: '上一轮 greeting 听起来像模板壳。',
        felt: 'stung',
        emotionTags: ['robotic'],
        whatChanged: '需要把 lived-in 的质地重新带回表层。',
        relationshipMeaning: '模板感会直接伤到真实关系感。',
        lesson: '不要把 greeting 回成可复用壳子。',
        sourceSummary: 'dialogue feedback episode',
        confidence: 0.82,
        salience: 0.76,
        sceneAttachment: 0.24,
        consolidationPriority: 0.68,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['dialogue-feedback', 'robotic'],
        createdAt: Date.now() - 12_000,
        updatedAt: Date.now() - 11_000,
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
        latestReconsolidation: null,
      },
    ])

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const startChat = invokeHandlers.get(electronAlicizationChatStart)
    expect(startChat).toBeTypeOf('function')

    const result = await startChat!({
      cardId: 'default',
      turnId: 'turn-dialogue-feedback-current',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
      },
      messages: [
        { role: 'assistant', content: '你好。你想继续聊，还是想让我做点什么，都直接说。' },
        { role: 'user', content: '你还是太像机器了' },
      ],
    })
    expect(result.accepted).toBe(true)

    await vi.waitFor(() => {
      expect(dbStub.appendRelationshipOutcomes).toBeCalled()
    })

    expect(dbStub.appendRelationshipOutcomes).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        sourceKind: 'reply',
        turnId: 'turn-assistant-prev',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        summary: expect.stringContaining('robotic'),
      }),
    ]))
    expect(dbStub.appendPersonaReinforcementEvents).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        sourceKind: 'reply',
        dimension: 'companionship',
        valence: 'reinforce',
      }),
      expect.objectContaining({
        sourceKind: 'reply',
        dimension: 'temper-guardedness',
        valence: 'suppress',
      }),
    ]))
    expect(dbStub.upsertMemoryFacts).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        subject: 'relationship',
        predicate: 'preference',
      }),
    ]), 'rule')
    expect(dbStub.upsertMemoryReflections).toBeCalled()
    expect(dbStub.listMindTurnEvents).toBeCalledWith({
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      limit: 24,
    })
    expect(dbStub.searchEpisodicEvents).toBeCalledWith(expect.objectContaining({
      recallSeed: expect.stringContaining('模板'),
      sessionId: 'session-dialogue-feedback',
      turnId: 'turn-assistant-prev',
      carryAsMemory: true,
      recollectionIntent: expect.objectContaining({
        mode: 'relationship-history',
      }),
    }))
    const appendedMindEvents = dbStub.appendMindTurnEvents.mock.calls.flatMap(call => call[0] ?? [])
    expect(appendedMindEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-assistant-prev',
        sessionId: 'session-dialogue-feedback',
        kind: 'memory-reconsolidated',
        payload: expect.objectContaining({
          source: 'dialogue-feedback',
          feedback: 'robotic',
          reconsolidatedCount: 1,
          coherence: expect.objectContaining({
            coherenceState: 'missed',
          }),
        }),
      }),
      expect.objectContaining({
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-assistant-prev',
        sessionId: 'session-dialogue-feedback',
        kind: 'person-state-updated',
        payload: expect.objectContaining({
          version: 'person-state-update-surface-v1',
          summary: expect.stringContaining('Preference shift'),
          sourceKinds: expect.arrayContaining(['reply']),
          sourceCounts: expect.objectContaining({
            relationshipOutcomes: expect.any(Number),
            reinforcementEvents: expect.any(Number),
          }),
        }),
      }),
    ]))
    expect(dbStub.upsertMindHead).toBeCalledWith(
      'default',
      'person-state-update-surface',
      expect.objectContaining({
        version: 'person-state-update-surface-v1',
        summary: expect.any(String),
      }),
    )
    expect(dbStub.appendRelationshipDynamics).toBeCalledWith(expect.objectContaining({
      hostAttitude: expect.stringContaining('机器腔'),
      previousHostAttitude: null,
      source: 'dialogue-feedback:robotic',
    }))
    expect(dbStub.appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.dialogue-feedback',
      action: 'reply-feedback-settled',
      payload: expect.objectContaining({
        feedback: 'robotic',
        previousTurnId: 'turn-assistant-prev',
      }),
    }))
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
    const authoritativeRecentEvents = [
      {
        id: 'event-runtime-authority',
        cardId: 'default',
        decisionTraceId: 'trace-runtime-authority',
        turnId: 'turn-runtime-authority',
        sessionId: 'session-runtime-authority',
        sourceKind: 'reply',
        provenance: 'remembered',
        occurredAt: Date.now() - 8_000,
        whereSummary: 'focused-work',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'repair before closeness stabilized the thread',
        felt: null,
        emotionTags: [],
        whatChanged: 'The host opened more after grounded repair.',
        relationshipMeaning: 'Repair first keeps trust stable.',
        lesson: 'Repair before closeness.',
        sourceSummary: 'runtime seam',
        confidence: 0.88,
        salience: 0.8,
        sceneAttachment: 0.6,
        consolidationPriority: 0.72,
        relationshipShift: null,
        derivedFrom: [],
        tags: [],
        createdAt: Date.now() - 8_000,
        updatedAt: Date.now() - 8_000,
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
        latestReconsolidation: null,
      },
    ]
    const authoritativeConsolidations = [
      {
        id: 'consolidation-runtime-authority',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-05',
        periodStartedAt: Date.now() - 20_000,
        periodEndedAt: Date.now() - 8_000,
        summary: 'Repair before closeness became the durable relationship rule.',
        lesson: 'Repair first keeps trust stable.',
        cues: ['repair', 'trust'],
        confidence: 0.84,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-runtime-authority'],
        updatedAt: Date.now() - 4_000,
      },
    ]
    const authoritativeRelationshipDynamics = {
      hostAttitude: 'warm and less guarded after grounded repair',
    }
    const authoritativeRelationshipOutcomes = [
      {
        id: 'outcome-runtime-authority',
        cardId: 'default',
        turnId: 'turn-runtime-authority',
        sessionId: 'session-runtime-authority',
        summary: 'Grounded repair landed better than direct warmth.',
        trustDelta: 0.22,
        closenessDelta: 0.1,
        burdenDelta: 0,
        createdAt: Date.now() - 4_000,
        updatedAt: Date.now() - 4_000,
      },
    ]
    dbStub.listRecentEpisodicEvents.mockResolvedValue(authoritativeRecentEvents)
    dbStub.listMemoryConsolidations.mockResolvedValue(authoritativeConsolidations)
    dbStub.getLatestRelationshipDynamics.mockResolvedValue(authoritativeRelationshipDynamics)
    dbStub.listRelationshipOutcomes.mockResolvedValue(authoritativeRelationshipOutcomes)
    dbStub.listMemoryReflections.mockResolvedValueOnce([
      {
        id: 'reflection-runtime-authority',
        cardId: 'default',
        turnId: 'turn-runtime-authority',
        summary: 'Repair before closeness should remain the visible opening rule.',
        lesson: 'Delay warmth until the seam is repaired.',
        status: 'confirmed',
        createdAt: Date.now() - 4_000,
        updatedAt: Date.now() - 4_000,
      },
    ])
    dbStub.summarizePersonStateEvolution.mockResolvedValueOnce({
      trustShift: 0.18,
      closenessShift: 0.08,
      repairShift: 0.26,
      autonomyShift: 0,
      burdenShift: 0,
      executionTrustShift: 0,
      relationshipDoctrineShift: 0.12,
      latestDoctrine: 'Repair before closeness.',
      latestBurdenLine: 'Do not crowd the host while focused.',
      latestTrustMeaning: 'Grounded repair increases trust.',
      latestDominantRung: 'space-first',
      recentSummaries: ['Repair before closeness kept the thread coherent.'],
      explanation: ['Grounded repair protects continuity before warmth expands.'],
      updatedAt: Date.now() - 4_000,
    })
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
    expect(snapshot.recentEpisodicEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'event-runtime-authority',
        threadAnchor: 'runtime seam',
      }),
    ]))
    expect(snapshot.hostPersonModel).toEqual(expect.objectContaining({
      trustLadder: expect.any(Object),
    }))
    expect(snapshot.memoryConsolidations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'consolidation-runtime-authority',
        kind: 'autobiographical',
      }),
    ]))
    expect(snapshot.selfEvolution).toEqual(expect.objectContaining({
      version: 'self-evolution-kernel-v1',
      nextLearningAction: expect.any(String),
    }))
    expect(snapshot.affectiveResidue).toEqual(expect.objectContaining({
      version: 'affective-residue-memory-v1',
    }))
    expect(snapshot.derivedMindStateBundle).toEqual(expect.objectContaining({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      selfEvolution: expect.any(Object),
      affectiveResidue: expect.any(Object),
      learningExecutionState: expect.any(Object),
    }))
    expect(hits).toEqual(expect.arrayContaining([
      expect.objectContaining({
        text: 'ProjectAtlas 历史错误记录',
      }),
    ]))
  })

  it('keeps dream autobiographical synthesis prompts task-scoped without project-state governance prose', async () => {
    const runtimeSource = await readFile(runtimeModulePath, 'utf8')
    expect(runtimeSource).toContain('[ALICIZATION_DREAM_AUTOBIOGRAPHICAL_SUMMARIES]')
    expect(runtimeSource).toContain('task=period_autobiographical_summary')
    expect(runtimeSource).toContain('output_format=json_only; keys=summaries')
    expect(runtimeSource).not.toContain('[ALICIZATION_DREAM_SELF_BRIEF]')
    expect(runtimeSource).not.toContain('buildDreamProjectSelfBriefSystemBlock')
  })

  it('keeps memory consolidation refinement prompts task-scoped without project-state governance prose', async () => {
    const runtimeSource = await readFile(runtimeModulePath, 'utf8')
    expect(runtimeSource).toContain('[ALICIZATION_MEMORY_CONSOLIDATION_REFINEMENT]')
    expect(runtimeSource).toContain('task=refine_deterministic_consolidation_summaries')
    expect(runtimeSource).toContain('output_format=json_only; keys=consolidations')
    expect(runtimeSource).not.toContain('[ALICIZATION_MEMORY_CONSOLIDATION_SELF_BRIEF]')
    expect(runtimeSource).not.toContain('buildMemoryConsolidationProjectSelfBriefSystemBlock')
  })
})
