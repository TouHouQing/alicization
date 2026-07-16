import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  alicizationDialogueResponded,
  electronAlicizationLlmSyncConfig,
  electronAlicizationReportProactiveFeedback,
  electronAlicizationSetPerformanceManifest,
  electronAlicizationSubconsciousForceTick,
} from '../../../shared/eventa'

const invokeHandlers = new Map<unknown, (payload?: any, options?: any) => Promise<any>>()
const sandboxDirs: string[] = []
const contextEmitMock = vi.fn()
const metaStore = new Map<string, string>()
const streamTextMock = vi.fn()
const generateTextMock = vi.fn()
const listWebContentsMock = vi.fn<() => any[]>(() => [])
const desktopCapturerGetSourcesMock = vi.fn<() => Promise<any[]>>(async () => [])
const systemPreferencesGetMediaAccessStatusMock = vi.fn(() => 'granted')
const getScreenCaptureDiagnosticsForWebContentsIdMock = vi.fn(() => null)
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
  appendEpisodicEvents: vi.fn().mockResolvedValue(undefined),
  insertScheduledTask: vi.fn().mockResolvedValue(undefined),
  claimDueScheduledTasks: vi.fn().mockResolvedValue([]),
  requeueScheduledTask: vi.fn().mockResolvedValue(undefined),
  completeScheduledTask: vi.fn().mockResolvedValue(undefined),
  failScheduledTask: vi.fn().mockResolvedValue(undefined),
  listPendingScheduledTasks: vi.fn().mockResolvedValue([]),
  insertLearningTask: vi.fn().mockResolvedValue(undefined),
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
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
    openPath: vi.fn(),
  },
  webContents: {
    getAllWebContents: listWebContentsMock,
  },
}))

vi.mock('../../libs/bootkit/lifecycle', () => ({
  onAppBeforeQuit: vi.fn(),
}))

vi.mock('./db', () => ({
  setupAlicizationDb: vi.fn(async () => dbStub),
}))

vi.mock('@proj-alicization/electron-screen-capture/main', () => ({
  getScreenCaptureDiagnosticsForWebContentsId: getScreenCaptureDiagnosticsForWebContentsIdMock,
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

vi.mock('@xsai/generate-text', () => ({
  generateText: (...args: any[]) => generateTextMock(...args),
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
    generateTextMock.mockReset()
    sensoryCpuUsage = 12
    foregroundWindowSample = undefined
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
          text: JSON.stringify({
            format: 'mind-turn-v1',
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
            memoryUsage: {
              workingMemoryVersion: null,
              longTermEvidenceIds: [],
            },
          }),
        })
        await onEvent?.({ type: 'finish', finishReason: 'stop' })
        return
      }
      await onEvent?.({ type: 'text-delta', text: '{}' })
      await onEvent?.({ type: 'finish', finishReason: 'stop' })
    })
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

    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const syncLlmConfig = invokeHandlers.get(electronAlicizationLlmSyncConfig)
    const setPerformanceManifest = invokeHandlers.get(electronAlicizationSetPerformanceManifest)
    const forceTick = invokeHandlers.get(electronAlicizationSubconsciousForceTick)
    const reportFeedback = invokeHandlers.get(electronAlicizationReportProactiveFeedback)
    expect(syncLlmConfig).toBeTypeOf('function')
    expect(setPerformanceManifest).toBeTypeOf('function')
    expect(forceTick).toBeTypeOf('function')
    expect(reportFeedback).toBeTypeOf('function')

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
    await setPerformanceManifest!({
      cardId: 'default',
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
          { key: 'relaxed', label: 'Relaxed', description: 'relaxed face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'live2d-motion' },
          { key: 'pout_confused', label: 'Pout', description: 'pout confused', source: 'live2d-motion' },
          { key: 'idle_settle', label: 'Idle', description: 'idle settle', source: 'live2d-motion' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
        embodimentHints: null,
      },
    })

    const firstTick = await forceTick!({ cardId: 'default' })
    const proactiveEvent = getDialogueRespondedEvents().find(event => event.origin === 'subconscious-proactive')
    expect(firstTick.proactiveTriggered).toContain('default')
    expect(proactiveEvent?.turnId).toBeTruthy()
    expect(proactiveEvent?.structured.embodiment).toEqual(expect.objectContaining({
      emotion: 'thinking',
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        delivery: 'gentle',
      }),
      variationToken: expect.any(String),
    }))
    expect(proactiveEvent?.structured.speechTimeline).toEqual(expect.objectContaining({
      version: 'speech-timeline-v1',
      segments: expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining('这个错误先别放过去'),
          emotion: 'thinking',
          facialCue: expect.any(String),
          actionCue: expect.any(String),
          prosodyWeight: expect.any(Number),
        }),
      ]),
    }))
    expect(proactiveEvent?.structured.digitalLife).toEqual(expect.objectContaining({
      version: 'digital-life-v1',
      emotion: 'thinking',
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        delivery: 'gentle',
        actionCue: 'observe_focus',
        residentMode: 'measured-return',
      }),
      mode: expect.any(String),
      frames: expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining('这个错误先别放过去'),
          face: expect.objectContaining({
            emotion: 'thinking',
            facialCue: expect.any(String),
          }),
          action: expect.objectContaining({
            actionCue: expect.any(String),
          }),
        }),
      ]),
    }))
    expect(proactiveEvent?.structured.embodimentScript).toEqual(expect.objectContaining({
      version: 'embodiment-script-v1',
      state: expect.objectContaining({
        baseEmotion: 'thinking',
        delivery: 'gentle',
        residentMode: 'measured-return',
      }),
      speechPlan: expect.objectContaining({
        segments: expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('这个错误先别放过去'),
          }),
        ]),
      }),
      facePlan: expect.objectContaining({
        speakingCues: expect.arrayContaining([
          expect.objectContaining({
            source: 'prosody-authority',
            confidence: expect.any(Number),
          }),
        ]),
      }),
      motionPlan: expect.objectContaining({
        actionBursts: expect.arrayContaining([
          expect.objectContaining({
            source: 'timeline-projection',
            confidence: expect.any(Number),
          }),
        ]),
      }),
      lipsyncPlan: expect.objectContaining({
        mode: 'energy-phoneme-hybrid',
        visemeHints: expect.arrayContaining([
          expect.objectContaining({
            source: 'prosody-authority',
            confidence: expect.any(Number),
          }),
        ]),
      }),
    }))
    expect(
      ['live2d', 'vrm'].includes(String(proactiveEvent?.structured.embodimentScript?.rendererTarget ?? '')),
    ).toBe(true)
    expect(proactiveEvent?.structured.digitalLifeSpine).toEqual(expect.objectContaining({
      version: 'digital-life-spine-digest-v1',
      proactive: expect.objectContaining({
        preferredStyle: 'silent-observe',
        continuityRestraint: expect.stringMatching(/lower-pressure|measured-return|repair-before-closeness/),
      }),
    }))
    expect(proactiveEvent?.structured.projectState).toEqual(expect.objectContaining({
      identity: '',
      currentPhase: '',
      latestLandedProgress: expect.any(String),
      primaryOpenLoop: expect.any(String),
      sameHerSelfLine: '',
      nextClosureTarget: expect.any(String),
    }))

    dbStub.appendEpisodicEvents.mockClear()
    await reportFeedback!({
      cardId: 'default',
      turnId: proactiveEvent!.turnId,
      feedback: 'dismiss',
    })

    const secondTick = await forceTick!({ cardId: 'default' })
    const proactiveLoopState = JSON.parse(metaStore.get('proactive_loop_state_v1') ?? '{}')
    const policyAudit = dbStub.appendAuditLog.mock.calls
      .map(call => call[0])
      .find((entry: any) => entry.action === 'proactive-policy-evaluated')
    const suppressedAudit = dbStub.appendAuditLog.mock.calls
      .map(call => call[0])
      .findLast((entry: any) => entry.action === 'alicization.subconscious.suppressed')

    expect(secondTick.proactiveTriggered).toHaveLength(0)
    expect(secondTick.suppressedCards).toContain('default')
    expect(proactiveLoopState.scenarioBias?.coding).toBe(0.15)
    expect(proactiveLoopState.globalCooldownUntil).toBeGreaterThan(Date.now())
    expect(JSON.parse(metaStore.get('proactive_loop_state_v1') ?? '{}')).toEqual(expect.objectContaining({
      scenarioBias: expect.objectContaining({
        coding: 0.15,
      }),
    }))
    expect(policyAudit?.payload?.consideredSignals).toEqual(expect.any(Array))
    expect(policyAudit?.payload?.ignoredSignals).toEqual(expect.any(Array))
    expect(policyAudit?.payload?.decision).toEqual(expect.objectContaining({
      scenario: 'coding',
      style: 'silent-observe',
      reasonCodes: expect.arrayContaining([
        'continuity-next-open-window',
      ]),
    }))
    expect(String(policyAudit?.payload?.decision?.whyNow ?? '').toLowerCase()).toContain('lower-pressure')
    expect(policyAudit?.payload?.cooldownMs).toEqual(expect.any(Number))
    expect(policyAudit?.payload?.feedbackBias).toEqual(expect.any(Number))
    expect(suppressedAudit?.payload?.reasonCodes).toContain('global-cooldown-active')
  }, 15_000)
})
