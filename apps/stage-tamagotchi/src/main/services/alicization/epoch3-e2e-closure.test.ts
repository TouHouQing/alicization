import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  alicizationDialogueResponded,
  electronAlicizationReportProactiveFeedback,
  electronAlicizationSubconsciousForceTick,
} from '../../../shared/eventa'

const invokeHandlers = new Map<unknown, (payload?: any, options?: any) => Promise<any>>()
const sandboxDirs: string[] = []
const contextEmitMock = vi.fn()
const metaStore = new Map<string, string>()
const streamTextMock = vi.fn()
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
  insertScheduledTask: vi.fn().mockResolvedValue(undefined),
  claimDueScheduledTasks: vi.fn().mockResolvedValue([]),
  requeueScheduledTask: vi.fn().mockResolvedValue(undefined),
  completeScheduledTask: vi.fn().mockResolvedValue(undefined),
  failScheduledTask: vi.fn().mockResolvedValue(undefined),
  listPendingScheduledTasks: vi.fn().mockResolvedValue([]),
  getJournalMode: vi.fn().mockResolvedValue('wal'),
  getLatestConversationSessionId: vi.fn().mockResolvedValue(undefined),
  listConversationTurnsSince: vi.fn().mockResolvedValue([]),
  listConversationTurnsBySession: vi.fn().mockResolvedValue([]),
  appendMindTurnEvents: vi.fn().mockResolvedValue(undefined),
  listMindTurnEvents: vi.fn().mockResolvedValue([]),
  upsertTaskThread: vi.fn().mockResolvedValue(undefined),
  listTaskThreads: vi.fn().mockResolvedValue([]),
  appendExecutionEvents: vi.fn().mockResolvedValue(undefined),
  listExecutionEvents: vi.fn().mockResolvedValue([]),
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
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  webContents: {
    getAllWebContents: vi.fn(() => []),
  },
}))

vi.mock('../../libs/bootkit/lifecycle', () => ({
  onAppBeforeQuit: vi.fn(),
}))

vi.mock('./db', () => ({
  setupAlicizationDb: vi.fn(async () => dbStub),
}))

vi.mock('./sensory-bus', () => ({
  createAlicizationSensoryBus: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    getSnapshot: () => ({
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
      running: true,
    }),
    refreshNow: async () => ({
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
    }),
  }),
}))

vi.mock('@xsai/stream-text', () => ({
  streamText: (...args: any[]) => streamTextMock(...args),
}))

const { setupAlicizationRuntime } = await import('./runtime')

async function createSandboxPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-epoch3-e2e-'))
  sandboxDirs.push(dir)
  return dir
}

function getDialogueRespondedEvents() {
  return contextEmitMock.mock.calls
    .filter(([event]) => event === alicizationDialogueResponded)
    .map(([, payload]) => payload)
}

describe('epoch3 proactive closure e2e', () => {
  beforeEach(() => {
    invokeHandlers.clear()
    vi.clearAllMocks()
    contextEmitMock.mockReset()
    metaStore.clear()
    streamTextMock.mockReset()
    sensoryCpuUsage = 12
    foregroundWindowSample = undefined
  })

  afterEach(async () => {
    while (sandboxDirs.length > 0) {
      const dir = sandboxDirs.pop()
      if (dir)
        await rm(dir, { recursive: true, force: true })
    }
  })

  it('suppresses follow-up proactive ticks after dismiss and keeps a full decision audit trail', async () => {
    const sandboxPath = await createSandboxPath()
    foregroundWindowSample = {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'main.ts - error',
    }
    metaStore.set('subconscious_state_v1', JSON.stringify({
      boredom: 97,
      loneliness: 85,
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
    const policyAudit = dbStub.appendAuditLog.mock.calls
      .map(call => call[0])
      .find((entry: any) => entry.action === 'proactive-policy-evaluated')
    const suppressedAudit = dbStub.appendAuditLog.mock.calls
      .map(call => call[0])
      .findLast((entry: any) => entry.action === 'alicization.subconscious.suppressed')

    expect(secondTick.proactiveTriggered).toHaveLength(0)
    expect(secondTick.suppressedCards).toContain('default')
    expect(JSON.parse(metaStore.get('proactive_loop_state_v1') ?? '{}')).toEqual(expect.objectContaining({
      scenarioBias: expect.objectContaining({
        coding: 0.15,
      }),
    }))
    expect(policyAudit?.payload).toEqual(expect.objectContaining({
      consideredSignals: expect.any(Array),
      ignoredSignals: expect.any(Array),
      decision: expect.objectContaining({
        scenario: 'coding',
        style: 'light-nudge',
      }),
      reasonCodes: expect.any(Array),
      whyNow: expect.any(String),
      whyNotLater: expect.any(String),
      cooldownMs: expect.any(Number),
      feedbackBias: expect.any(Number),
    }))
    expect(suppressedAudit?.payload?.reasonCodes).toContain('global-cooldown-active')
  })
})
