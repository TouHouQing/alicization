import type { AlicizationVisibleReplyRealizationTransportArtifact } from '@proj-alicization/stage-shared'

import type { AlicizationDigitalLifeSpineDigest } from './alicization-bridge'

import { alicizationProviderResponseFormat } from '@proj-alicization/stage-shared'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'
import { installBrowserAlicizationBridge } from './alicization-browser-bridge'
import { buildBrowserMemoryConsolidations } from './alicization-browser-organic-memory'
import {
  buildConversationTurnsKey,
  buildEpisodicEventsKey,
  buildPerformanceManifestKey,
} from './alicization-browser-storage'

const storageMap = new Map<string, unknown>()

vi.mock('../database/storage', () => ({
  storage: {
    getItemRaw: vi.fn(async (key: string) => storageMap.get(key) ?? null),
    setItemRaw: vi.fn(async (key: string, value: unknown) => {
      storageMap.set(key, value)
    }),
    removeItem: vi.fn(async (key: string) => {
      storageMap.delete(key)
    }),
  },
}))

vi.mock('../libs/auth', () => ({
  SERVER_URL: 'https://example.test',
}))

vi.mock('../utils/i18n', () => ({
  getStageUiMessageVariants: () => [],
  translateStageUi: (key: string) => key,
}))

vi.mock('./character', () => ({
  useCharacterNotebookStore: () => ({
    scheduleTask: vi.fn(() => ({
      id: 'task-1',
      dueAt: Date.now() + 60_000,
    })),
  }),
}))

vi.mock('./modules/airi-card', () => ({
  useAiriCardStore: () => ({
    activeCardId: 'default',
  }),
}))

function buildVisualPresenceStorageKey(cardId: string) {
  return `local:alicization/browser/v1/cards/${cardId}/visual-presence`
}

function createVisualPresenceState(updatedAt: number) {
  return {
    watchMode: 'invited-inspection' as const,
    currentScene: {
      workloadKind: 'coding' as const,
      contentKind: 'diff' as const,
      scenario: 'coding' as const,
      source: 'invited-grounding' as const,
      confidence: 0.84,
      beganAt: updatedAt - 8_000,
      lastSeenAt: updatedAt - 300,
    },
    attention: null,
    workingMemoryEpisodes: [],
    privateThought: {
      stance: 'observe' as const,
      confidence: 0.72,
      rationaleTags: ['inspection'],
      thoughtText: 'Stay with the current diff.',
      shouldSpeak: true,
      suggestedStyle: 'silent-observe' as const,
      embodiedPresence: 'attentive' as const,
      expiresAt: updatedAt + 4_000,
      emotionalTension: 'focused-flow' as const,
    },
    captureState: {
      permission: 'granted' as const,
      lastGroundedAt: updatedAt - 120,
      sourceName: 'display-1',
    },
    durabilityPulse: null,
    recentTransition: null,
    nextSuggestedProbeMs: 1_400,
    updatedAt,
  }
}

function createStreamResponse(lines: unknown[]) {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      lines.forEach((line) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
      })
      controller.close()
    },
  })

  return {
    ok: true,
    status: 200,
    body: body as Response['body'],
  } satisfies Partial<Response>
}

function createDigitalLifeSpineDigest(updatedAt = Date.now()): AlicizationDigitalLifeSpineDigest {
  return {
    version: 'digital-life-spine-digest-v1' as const,
    runtime: {
      watchMode: 'symbiotic-vision' as const,
      sceneScenario: 'coding' as const,
      sceneSummary: 'inspect the current diff',
      activeThreadId: 'thread-1',
      activeThreadTitle: 'current diff',
      dominantMode: 'tracking',
      dominantDrive: 'understand',
      answerIntent: 'guide',
      preferredPresence: 'attentive' as const,
      selectedAction: 'wait',
      updatedAt,
    },
    architecture: {
      operatingMode: 'speaking' as const,
      dominantSystem: 'dialogue' as const,
      supportingSystems: ['perception'],
      governingFocus: 'guide the current diff',
      summary: 'dialogue leads while perception stays warm',
    },
    continuitySignal: {
      label: 'digital-life-line' as const,
      summary: 'watch=symbiotic-vision | scene=coding | mode=tracking',
      signature: 'spine-1',
      createdAt: updatedAt,
      watchMode: 'symbiotic-vision' as const,
      sceneScenario: 'coding' as const,
      activeThreadId: 'thread-1',
      dominantMode: 'tracking',
      dominantDrive: 'understand',
      answerIntent: 'guide',
      preferredPresence: 'attentive' as const,
    },
    proactive: {
      selectedAction: 'wait',
      preferredStyle: 'silent-observe' as const,
      confidence: 0.7,
      shouldSpeak: false,
      activeThreadId: 'thread-1',
      activeThreadTitle: 'current diff',
      dominantConcernKind: null,
      dominantConcernSummary: null,
      leadingGoalId: null,
      leadingGoalSummary: null,
      preferredPresence: 'attentive' as const,
    },
    memory: {
      summary: 'recent=current diff | goal=guide the current diff',
      recentEpisodeSummary: 'current diff',
      recentEpisodeCount: 1,
      focusBeliefStatement: 'the current diff needs guidance',
      focusBeliefConfidence: 0.72,
      leadingGoalSummary: 'guide the current diff',
      dominantConcernSummary: null,
      reflectionSummary: null,
      reflectionPressure: 0.2,
      recallMode: 'working',
      recallSeed: 'current-diff',
      thoughtThreadSummary: 'current diff',
    },
  }
}

describe('browser alicization bridge visual presence listeners', () => {
  let disposeBridge: (() => void) | undefined

  beforeEach(() => {
    setActivePinia(createPinia())
    storageMap.clear()
  })

  afterEach(() => {
    disposeBridge?.()
    disposeBridge = undefined
    storageMap.clear()
    vi.restoreAllMocks()
  })

  it('preserves provider metadata and the complete finish artifact from the browser stream', async () => {
    const learningPolicy = {
      allowLongTermCondensation: true,
      allowPersonaLearning: true,
      allowTraining: false,
    }
    const fullText = JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'Keep the complete Provider artifact intact through browser transport.',
      emotion: 'neutral',
      reply: '浏览器 transport 应保留完整 Provider JSON。',
      performance: {
        baseEmotion: 'neutral',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      memoryUsage: {
        workingMemoryVersion: 'wm-browser-1',
        longTermEvidenceIds: ['ltm-browser-1'],
      },
    })
    const visibleReplyRealization = {
      version: 'visible-reply-realization-v1',
      expectedAuthority: 'llm-mind',
      actualAuthority: 'llm-mind',
      providerMindExecuted: true,
      mode: 'provider-stream',
      visibleText: '浏览器 transport 应保留完整 Provider JSON。',
      visibleReplyValidationStatus: 'approved',
      blockedReasons: [],
    } satisfies AlicizationVisibleReplyRealizationTransportArtifact
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      {
        type: 'text-delta',
        text: '浏览器 transport 应保留完整 Provider JSON。',
        origin: 'provider',
        learningPolicy,
        failureSurface: null,
      },
      {
        type: 'finish',
        origin: 'provider',
        learningPolicy,
        failureSurface: null,
        fullText,
        finishReason: 'stop',
        visibleReplyRealization,
      },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    const events: any[] = []

    await bridge.streamChat?.({
      turnId: 'turn-browser-provider-artifact',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent: (event) => {
        events.push(event)
      },
    })

    expect(events).toEqual([
      {
        type: 'text-delta',
        text: '浏览器 transport 应保留完整 Provider JSON。',
        origin: 'provider',
        learningPolicy,
        failureSurface: null,
      },
      {
        type: 'finish',
        origin: 'provider',
        learningPolicy,
        failureSurface: null,
        fullText,
        finishReason: 'stop',
        visibleReplyRealization,
      },
    ])

    vi.unstubAllGlobals()
  })

  it('passes the native provider responseFormat through the browser stream request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      { type: 'finish' },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    await bridge.streamChat?.({
      turnId: 'turn-browser-response-format',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent: vi.fn(),
    })

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    const body = JSON.parse(String(request?.body ?? '{}')) as Record<string, unknown>
    expect(body.responseFormat).toEqual(alicizationProviderResponseFormat)

    vi.unstubAllGlobals()
  })

  it('rejects a string stream event without synthesizing a provider contract or fixed reply', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      'Provider returned plain text instead of a stream event.',
    ]))
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    const onStreamEvent = vi.fn()

    await expect(bridge.streamChat?.({
      turnId: 'turn-browser-invalid-string-event',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent,
    })).rejects.toThrow('stage.chat.stream.invalid-event')
    expect(onStreamEvent).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('normalizes reactive performance manifests before browser-local storage and retrieval', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    const manifest = reactive({
      renderer: 'live2d' as const,
      supportedBaseEmotions: ['neutral', 'thinking', 'thinking'],
      supportedFacialCues: [
        {
          key: 'soft-gaze',
          label: '柔和注视',
          description: 'gentle gaze',
          source: 'preset' as const,
          affectsMouth: false,
        },
      ],
      supportedActions: [
        {
          key: 'steady_focus',
          label: '专注待机',
          description: 'steady focus',
          source: 'live2d-motion' as const,
        },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
      embodimentHints: {
        thinking: {
          preferredExpressionAliases: ['focus'],
          preferredMotionAliases: ['idle_focus'],
        },
      },
    })

    expect(() => structuredClone(manifest)).toThrow()

    await bridge.setPerformanceManifest?.(manifest as any)

    const storedManifest = storageMap.get(buildPerformanceManifestKey('default'))
    expect(() => structuredClone(storedManifest)).not.toThrow()
    expect(storedManifest).toEqual({
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking'],
      supportedFacialCues: [
        {
          key: 'soft-gaze',
          label: '柔和注视',
          description: 'gentle gaze',
          source: 'preset',
          affectsMouth: false,
        },
      ],
      supportedActions: [
        {
          key: 'steady_focus',
          label: '专注待机',
          description: 'steady focus',
          source: 'live2d-motion',
        },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
      embodimentHints: {
        thinking: {
          preferredExpressionAliases: ['focus'],
          preferredMotionAliases: ['idle_focus'],
        },
      },
    })

    const hydratedManifest = await bridge.getPerformanceManifest?.()
    expect(hydratedManifest).toEqual(storedManifest)
    expect(hydratedManifest).not.toBe(storedManifest)
  })

  it('rebuilds persisted visual presence from digital life spine stream meta', async () => {
    const seededState = createVisualPresenceState(Date.now() - 2_000)
    storageMap.set(buildVisualPresenceStorageKey('default'), seededState)
    const digest = createDigitalLifeSpineDigest()
    const embodimentScript = {
      version: 'embodiment-script-v1',
      decisionTraceId: 'trace-1',
      turnId: 'turn-1',
      rendererTarget: 'live2d',
      replyText: '我先继续沿着这条 diff 看。',
      state: {
        baseEmotion: 'thinking',
        delivery: 'calm',
        emphasis: 1,
        residentMode: 'dialogue',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'soft-settle',
        preRollMs: 40,
        settleMs: 220,
      },
      facePlan: {
        preUtteranceCue: 'breathe-in',
        postUtteranceCue: 'settle-soft',
        speakingCues: [],
      },
      motionPlan: {
        idleBase: 'lean-in',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-only',
      },
    }

    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      {
        type: 'meta',
        governance: { decisionTraceId: 'trace-1' },
        embodimentScript,
        digitalLifeSpine: digest,
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          dominantChannel: 'active-dialogue',
          shouldProactivelySpeak: true,
          shouldProactivelyAct: false,
          continuityPressure: 0.7,
          companionshipPressure: 0.74,
          channels: [{
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.86,
            focus: 'nudge',
            summary: 'active dialogue hot',
          }],
          summary: 'dominant=active-dialogue',
        },
      },
      { type: 'finish' },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    expect(hasAlicizationBridge()).toBe(true)

    const bridge = getAlicizationBridge()
    expect(bridge.onVisualPresenceState).toBeTypeOf('function')
    expect(bridge.onVisualPresencePulse).toBeTypeOf('function')

    const stateUpdates: Array<ReturnType<typeof createVisualPresenceState> | null> = []
    const pulseUpdates: any[] = []
    const stopState = bridge.onVisualPresenceState?.((state) => {
      stateUpdates.push(state as ReturnType<typeof createVisualPresenceState> | null)
    })
    const stopPulse = bridge.onVisualPresencePulse?.((payload) => {
      pulseUpdates.push(payload)
    })

    const onStreamEvent = vi.fn()
    await bridge.streamChat?.({
      turnId: 'turn-1',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(stateUpdates).toHaveLength(1)
    expect(stateUpdates[0]).toMatchObject({
      watchMode: 'symbiotic-vision',
      currentScene: expect.objectContaining({
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
        source: 'screen-semantic-summary',
        summary: expect.stringContaining('inspect the current diff'),
      }),
      privateThought: expect.objectContaining({
        stance: 'accompany',
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        runtimeThreadId: 'thread-1',
      }),
      residentPerformance: expect.objectContaining({
        source: 'browser-fallback',
        performance: expect.objectContaining({
          baseEmotion: 'thinking',
          delivery: 'firm',
        }),
        embodiedPresence: 'attentive',
      }),
    })
    expect(stateUpdates[0]?.privateThought?.rationaleTags).toEqual(expect.arrayContaining([
      'memory-carry:carry-thread',
      'carry:mode:carry-thread',
    ]))
    expect(stateUpdates[0]?.currentScene?.beganAt).toBe(seededState.currentScene?.beganAt)
    expect((stateUpdates[0]?.updatedAt ?? 0)).toBe(digest.runtime.updatedAt)

    expect(pulseUpdates).toHaveLength(1)
    expect(pulseUpdates[0]).toMatchObject({
      watchMode: 'symbiotic-vision',
      embodiedPresence: 'attentive',
      scenario: 'coding',
      stance: 'accompany',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      currentInwardPreoccupation: expect.stringContaining('guide the current diff'),
      quietLineMs: 0,
    })
    expect(onStreamEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'meta',
      digitalLifeSpine: expect.objectContaining({
        architecture: expect.objectContaining({
          operatingMode: 'speaking',
          dominantSystem: 'dialogue',
        }),
        continuitySignal: expect.objectContaining({
          summary: expect.stringContaining('scene=coding'),
        }),
      }),
      runtimeDigest: expect.objectContaining({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
      }),
      embodimentScript: expect.objectContaining({
        version: 'embodiment-script-v1',
        rendererTarget: 'live2d',
        state: expect.objectContaining({
          residentMode: 'dialogue',
          delivery: 'calm',
        }),
        motionPlan: expect.objectContaining({
          idleBase: 'lean-in',
          attentionMode: 'attentive',
        }),
      }),
    }))

    stopState?.()
    stopPulse?.()
    vi.unstubAllGlobals()
  })

  it('synthesizes visual presence from digital life spine when no prior state exists', async () => {
    const digest = createDigitalLifeSpineDigest()
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      {
        type: 'meta',
        governance: { decisionTraceId: 'trace-2' },
        digitalLifeSpine: digest,
      },
      { type: 'finish' },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.streamChat?.({
      turnId: 'turn-2',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent: vi.fn(),
    })

    const persisted = await bridge.getVisualPresenceState?.()
    expect(persisted).toMatchObject({
      watchMode: 'symbiotic-vision',
      currentScene: expect.objectContaining({
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
      }),
      privateThought: expect.objectContaining({
        thoughtText: expect.stringContaining('goal=guide the current diff'),
        stance: 'accompany',
        suggestedStyle: 'silent-observe',
      }),
      residentPerformance: expect.objectContaining({
        source: 'browser-fallback',
        performance: expect.objectContaining({
          baseEmotion: 'thinking',
          delivery: 'firm',
        }),
      }),
    })
    expect(persisted?.privateThought?.rationaleTags).toEqual(expect.arrayContaining([
      'memory-carry:carry-thread',
      'carry:mode:carry-thread',
    ]))
    expect(persisted?.attention).toBeNull()
    expect(persisted?.captureState.permission).toBe('unknown')

    vi.unstubAllGlobals()
  })

  it('keeps resident softness grounded in autobiographical context without deprecated continuity tags', async () => {
    const updatedAt = Date.now() - 2_000
    const seededState = {
      ...createVisualPresenceState(updatedAt),
      watchMode: 'symbiotic-vision' as const,
      currentBodyState: 'accompanying' as const,
      continuityMode: 'quiet-accompaniment' as const,
      quietLineMs: 180_000,
      currentInwardPreoccupation: 'remembered autobiographical context',
      privateThought: {
        stance: 'accompany' as const,
        confidence: 0.78,
        rationaleTags: ['quiet-companionship', 'autobiographical-context'],
        thoughtText: 'Remembered autobiographical context remains available.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe' as const,
        embodiedPresence: 'attentive' as const,
        expiresAt: updatedAt + 4_000,
        emotionalTension: 'soft-covision' as const,
      },
      residentPerformance: {
        version: 'resident-performance-v1' as const,
        source: 'main-runtime' as const,
        performance: {
          baseEmotion: 'thinking' as const,
          emotion: 'thinking' as const,
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle' as const,
          emphasis: 1,
        },
        embodiedPresence: 'attentive' as const,
        stance: 'accompany' as const,
        emotionalTension: 'soft-covision',
        confidence: 0.82,
        reasonTags: ['continuity:quiet-accompaniment', 'autobiographical-context'],
        signature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|remembered autobiographical context',
        updatedAt,
      },
    }
    storageMap.set(buildVisualPresenceStorageKey('default'), seededState)

    const digest = createDigitalLifeSpineDigest(Date.now())
    digest.runtime.selectedAction = 'hold'
    digest.runtime.answerIntent = 'hold'
    expect(digest.architecture).not.toBeNull()
    expect(digest.proactive).not.toBeNull()
    expect(digest.memory).not.toBeNull()
    digest.architecture!.operatingMode = 'remembering'
    digest.architecture!.dominantSystem = 'memory'
    digest.architecture!.summary = 'autobiographical context remains available'
    digest.proactive!.selectedAction = 'hold'
    digest.proactive!.shouldSpeak = false
    digest.proactive!.preferredStyle = 'silent-observe'
    digest.memory!.summary = 'remembered autobiographical context'
    digest.memory!.thoughtThreadSummary = 'autobiographical context'
    digest.memory!.recollectionSummary = 'remembered relationship context'
    digest.embodiment = {
      autobiographicalSelf: {
        identityNarrative: 'Remembered autobiographical context remains available after a coding detour.',
        relationshipDoctrine: 'Keep companionship grounded in remembered relationship context.',
      },
    } as any

    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      {
        type: 'meta',
        governance: { decisionTraceId: 'trace-autobiographical-soft-carry' },
        digitalLifeSpine: digest,
      },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge()
    const bridge = getAlicizationBridge()
    const stateUpdates: any[] = []
    const stopState = bridge.onVisualPresenceState?.((state) => {
      stateUpdates.push(state)
    })

    await bridge.streamChat?.({
      turnId: 'turn-autobiographical-soft-carry',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent: vi.fn(),
    })

    expect(stateUpdates).toHaveLength(1)
    expect(stateUpdates[0]).toMatchObject({
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      currentInwardPreoccupation: 'remembered autobiographical context',
      privateThought: expect.objectContaining({
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        thoughtText: expect.stringContaining('autobiographical'),
      }),
      residentPerformance: expect.objectContaining({
        performance: expect.objectContaining({
          baseEmotion: 'thinking',
          delivery: 'gentle',
          facialCue: 'soft-gaze',
        }),
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
      }),
    })
    expect(stateUpdates[0]?.privateThought?.rationaleTags).toEqual(expect.arrayContaining([
      'digital-life-spine',
      'dominant:memory',
    ]))
    expect(stateUpdates[0]?.residentPerformance?.reasonTags).toEqual(expect.arrayContaining([
      'resident-performance',
      'body:accompanying',
      'continuity:quiet-accompaniment',
      'scene:coding',
    ]))

    stopState?.()
    vi.unstubAllGlobals()
  })

  it('does not fabricate a browser-local runtimeDigest when main-runtime digitalLifeSpine is already present', async () => {
    const digest = createDigitalLifeSpineDigest()
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      {
        type: 'meta',
        governance: { decisionTraceId: 'trace-projection-only-runtime' },
        digitalLifeSpine: digest,
      },
      { type: 'finish' },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    const seenMetaEvents: any[] = []
    await bridge.streamChat?.({
      turnId: 'turn-projection-only-runtime',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent: async (event) => {
        if (event.type === 'meta')
          seenMetaEvents.push(event)
      },
    })

    expect(seenMetaEvents).toHaveLength(1)
    expect(seenMetaEvents[0]?.digitalLifeSpine).toEqual(expect.objectContaining({
      runtime: expect.objectContaining({
        watchMode: 'symbiotic-vision',
        sceneSummary: 'inspect the current diff',
      }),
    }))
    expect(seenMetaEvents[0]?.runtimeDigest ?? null).toBeNull()

    vi.unstubAllGlobals()
  })

  it('escalates visual presence into reflective repair when memory reflection pressure is high', async () => {
    const digest = createDigitalLifeSpineDigest()
    digest.memory = {
      ...digest.memory!,
      reflectionPressure: 0.82,
      reflectionSummary: 'repair continuity mismatch from prior mirror',
      recallMode: 'thread',
    }
    digest.proactive = {
      ...digest.proactive!,
      preferredStyle: 'silent-observe',
      shouldSpeak: false,
    }

    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      {
        type: 'meta',
        governance: { decisionTraceId: 'trace-3' },
        digitalLifeSpine: digest,
      },
      { type: 'finish' },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.streamChat?.({
      turnId: 'turn-3',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent: vi.fn(),
    })

    const persisted = await bridge.getVisualPresenceState?.()
    expect(persisted?.privateThought).toMatchObject({
      stance: 'care',
      suggestedStyle: 'gentle-care',
      shouldSpeak: true,
    })
    expect(persisted?.privateThought?.rationaleTags).toEqual(expect.arrayContaining([
      'memory-carry:reflective-repair',
      'carry:mode:reflective-repair',
      'carry:reflection:0.82',
    ]))

    vi.unstubAllGlobals()
  })

  it('uses the shared location parser for builtin realtime weather queries', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [{
            name: '天津',
            admin1: '天津市',
            country: '中国',
            latitude: 39.0842,
            longitude: 117.201,
          }],
        }),
      } satisfies Partial<Response>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          current: {
            temperature_2m: 21.2,
            relative_humidity_2m: 48,
            apparent_temperature: 20.3,
            weather_code: 0,
            wind_speed_10m: 12.4,
          },
        }),
      } satisfies Partial<Response>)
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    const result = await bridge.realtimeExecute?.({
      category: 'weather',
      query: '帮我查一下天津天气',
    } as any)

    expect(result?.ok).toBe(true)
    expect(result?.summary).toContain('天津')
    expect(fetchMock.mock.calls[0]?.[0]).toContain(encodeURIComponent('天津'))

    vi.unstubAllGlobals()
  })

  it('falls back to suffix-based geocode candidates when the first city token misses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [],
        }),
      } satisfies Partial<Response>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [{
            name: '天津',
            admin1: '天津市',
            country: '中国',
            country_code: 'CN',
            latitude: 39.0842,
            longitude: 117.201,
          }],
        }),
      } satisfies Partial<Response>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          current: {
            temperature_2m: 20.2,
            relative_humidity_2m: 50,
            apparent_temperature: 19.3,
            weather_code: 1,
            wind_speed_10m: 8.4,
          },
        }),
      } satisfies Partial<Response>)
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    const result = await bridge.realtimeExecute?.({
      category: 'weather',
      query: '今天天津天气怎么样',
    } as any)

    expect(result?.ok).toBe(true)
    expect(result?.summary).toContain('天津')
    expect(String(fetchMock.mock.calls[0]?.[0] ?? '')).toContain(encodeURIComponent('天津'))
    expect(String(fetchMock.mock.calls[1]?.[0] ?? '')).toContain(encodeURIComponent('天津市'))

    vi.unstubAllGlobals()
  })

  it('builds browser-side memory consolidations and recollection foreground from local episodic history', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-procedural-browser',
      sessionId: 'session-browser-procedural',
      origin: 'user-turn',
      userText: '继续把 runtime seam 修掉。',
      assistantText: '我会先用 cli patch，再 verify 一遍，最后把结果轻一点地告诉你。',
      structured: {
        emotion: 'thinking',
        governance: {
          decisionTraceId: 'trace-browser-procedural',
          focusAnchor: 'runtime seam',
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getOrganicMemorySnapshot?.()
    expect(snapshot?.memoryConsolidations?.some(item => item.kind === 'procedural')).toBe(true)
    expect(snapshot?.recollectionForeground ?? null).toBeNull()
    expect(snapshot?.recollectionIntent ?? null).toBeNull()
    expect(snapshot?.recollectionPlan ?? null).toBeNull()
    expect(snapshot?.recollectionSpeechPlan ?? null).toBeNull()
    expect(snapshot?.knowledgeEvidence ?? null).toBeNull()
    expect(snapshot?.selfEvolution ?? null).toBeNull()
    expect(snapshot?.derivedMindStateBundle ?? null).toBeNull()
    expect(snapshot?.recallLatencyPolicy ?? null).toBeNull()
    expect(snapshot?.affectiveResidue).toEqual(expect.objectContaining({
      version: 'affective-residue-memory-v1',
      relationshipCadence: expect.objectContaining({
        cadenceMode: expect.any(String),
      }),
    }))
    expect(snapshot?.memoryStageReplay ?? null).toBeNull()
    expect(snapshot?.memoryResolutionLedger ?? null).toBeNull()
    expect(snapshot?.learningExecutionState ?? null).toBeNull()

    const visualPresence = await bridge.getVisualPresenceState?.()
    expect(visualPresence?.privateThought?.thoughtText ?? '').not.toContain('recollection=')
    expect(visualPresence?.privateThought?.rationaleTags ?? []).not.toEqual(expect.arrayContaining([
      'carry:recollection:foreground',
      'dominant:memory',
    ]))
  })

  it('keeps browser fallback episodic memory factual without inventing relationship or persona evidence', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    const userText = '我信任你，也希望你记住这段原始对话。'
    const assistantText = '我们因此变得更亲近，并形成固定关系偏好。'

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-no-invented-relationship',
      sessionId: 'session-browser-no-invented-relationship',
      origin: 'user-turn',
      userText,
      assistantText,
      structured: {
        emotion: 'neutral',
        learningPolicy: {
          allowLongTermCondensation: true,
          allowPersonaLearning: true,
          allowTraining: false,
        },
      },
      createdAt: Date.now(),
    } as any)

    const episodicMemory = storageMap.get(buildEpisodicEventsKey('default')) as {
      events?: Array<Record<string, unknown>>
    } | undefined
    const event = episodicMemory?.events?.[0]
    expect(event).toEqual(expect.objectContaining({
      relationshipMeaning: null,
      lesson: null,
      whatChanged: null,
      relationshipShift: null,
    }))

    const snapshot = await bridge.getOrganicMemorySnapshot?.()
    expect(snapshot?.hostPersonModel ?? null).toBeNull()
    expect(snapshot?.selfEvolution ?? null).toBeNull()
    expect(snapshot?.learningExecutionState ?? null).toBeNull()
    expect(snapshot?.memoryConsolidations?.filter(item => item.facet === 'relationship-era')).toEqual([])
    expect(JSON.stringify(snapshot?.hostPersonModel ?? null)).not.toContain(userText)
    expect(JSON.stringify(snapshot?.hostPersonModel ?? null)).not.toContain(assistantText)
  })

  it('does not create relationship-era consolidation from incomplete or weak reconsolidation evidence', () => {
    const incomplete = {
      id: 'event-incomplete-reconsolidation',
      occurredAt: 10,
      updatedAt: 10,
      salience: 0.9,
      confidence: 0.95,
      provenance: 'observed',
      threadAnchor: 'raw-thread-anchor-must-not-qualify',
      whatHappened: 'raw transcript must not qualify relationship consolidation',
      lesson: null,
      whatChanged: null,
      relationshipMeaning: null,
      sourceKind: 'reply',
      tags: [],
      latestReconsolidation: {
        at: 20,
        decisionTraceId: 'trace-incomplete',
        provenance: 'remembered',
        confidence: 0.9,
        reason: 'A trace exists, but the evidence is incomplete.',
        emotionTags: ['reviewable'],
        relationshipMeaning: 'Only a relationship summary exists.',
        lesson: null,
      },
    }
    const weak = {
      ...incomplete,
      id: 'event-weak-reconsolidation',
      latestReconsolidation: {
        at: 21,
        decisionTraceId: 'trace-weak',
        provenance: 'reconstructed',
        confidence: 0.94,
        reason: 'This reconstruction is not confirmed evidence.',
        emotionTags: ['uncertain'],
        relationshipMeaning: 'A reconstructed relationship summary exists.',
        lesson: 'A reconstructed lesson exists.',
      },
    }

    const relationshipConsolidations = buildBrowserMemoryConsolidations([incomplete, weak] as any[])
      .filter(item => item.facet === 'relationship-era')

    expect(relationshipConsolidations).toEqual([])
  })

  it('builds relationship-era consolidation only from complete reviewable reconsolidation fields', () => {
    const rawTranscript = 'RAW_TRANSCRIPT_MUST_NOT_ENTER_RELATIONSHIP_CONSOLIDATION'
    const rawThreadAnchor = 'RAW_THREAD_ANCHOR_MUST_NOT_ENTER_RELATIONSHIP_CUES'
    const reconsolidationAt = Date.UTC(2026, 6, 28, 8, 30, 0)
    const event = {
      id: 'event-reviewable-relationship',
      occurredAt: Date.UTC(2026, 6, 20, 8, 30, 0),
      updatedAt: Date.UTC(2026, 6, 20, 8, 30, 0),
      salience: 0.12,
      confidence: 0.11,
      provenance: 'shadow',
      threadAnchor: rawThreadAnchor,
      whatHappened: rawTranscript,
      lesson: 'raw event lesson',
      whatChanged: 'raw event change',
      relationshipMeaning: 'raw event relationship meaning',
      sourceKind: 'reply',
      tags: ['raw-event-tag'],
      latestReconsolidation: {
        at: reconsolidationAt,
        decisionTraceId: 'trace-reviewed-relationship',
        provenance: 'remembered',
        confidence: 0.88,
        reason: 'Reviewed evidence connects the relationship meaning to a trace.',
        emotionTags: ['reviewed-evidence', 'relationship'],
        relationshipMeaning: 'Reviewed relationship meaning.',
        lesson: 'Reviewed relationship lesson.',
      },
    }

    const relationshipConsolidation = buildBrowserMemoryConsolidations([event] as any[])
      .find(item => item.facet === 'relationship-era')

    expect(relationshipConsolidation).toEqual({
      id: 'browser-autobio-relationship:trace-reviewed-relationship',
      kind: 'autobiographical',
      facet: 'relationship-era',
      periodKey: 'relationship-2026-07-28',
      periodStartedAt: reconsolidationAt,
      periodEndedAt: reconsolidationAt,
      summary: 'Reviewed relationship meaning.',
      lesson: 'Reviewed relationship lesson.',
      cues: [
        'Reviewed relationship meaning.',
        'Reviewed relationship lesson.',
        'Reviewed evidence connects the relationship meaning to a trace.',
        'reviewed-evidence',
        'relationship',
      ],
      confidence: 0.88,
      dominantProvenance: 'remembered',
    })
    expect(JSON.stringify(relationshipConsolidation)).not.toContain(rawTranscript)
    expect(JSON.stringify(relationshipConsolidation)).not.toContain(rawThreadAnchor)
    expect(relationshipConsolidation?.confidence).not.toBe(event.confidence)
  })

  it('keeps proactive outcome episodic relationship fields empty after feedback settlement', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-proactive-outcome-factual',
      sessionId: 'session-browser-proactive-outcome-factual',
      origin: 'subconscious-proactive',
      userText: '',
      assistantText: '这是一条待反馈的主动消息。',
      structured: {
        proactive: {
          scenario: 'coding',
          feedbackWindowMs: 120_000,
        },
      },
      createdAt: Date.now(),
    } as any)
    await bridge.reportProactiveFeedback?.({
      turnId: 'turn-browser-proactive-outcome-factual',
      feedback: 'dismiss',
    } as any)

    const episodicMemory = storageMap.get(buildEpisodicEventsKey('default')) as {
      events?: Array<Record<string, unknown>>
    } | undefined
    const outcomeEvent = episodicMemory?.events?.find(event => event.whatHappened === 'outcome:dismiss')
    expect(outcomeEvent).toEqual(expect.objectContaining({
      relationshipMeaning: null,
      lesson: null,
      whatChanged: null,
      relationshipShift: null,
    }))
  })

  it('keeps browser fallback memory searchable during salience refresh instead of archiving it away', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    const nowTs = Date.now()

    await bridge.importLegacyMemory?.({
      facts: [],
      archive: [{
        id: 'browser-archive-1',
        subject: 'alice',
        predicate: 'procedure',
        object: 'Previously fixed the runtime seam through the cli patch flow.',
        confidence: 0.28,
        source: 'async-llm',
        dedupeKey: 'alice|procedure|browser-cli-patch-flow',
        createdAt: nowTs - 40 * 24 * 60 * 60 * 1000,
        updatedAt: nowTs - 40 * 24 * 60 * 60 * 1000,
        lastAccessAt: nowTs - 40 * 24 * 60 * 60 * 1000,
        accessCount: 0,
        archivedAt: nowTs - 2 * 24 * 60 * 60 * 1000,
        provenance: 'remembered',
      }],
      lastPrunedAt: null,
    })

    const refreshed = await bridge.runMemoryPrune?.()
    const recalled = await bridge.retrieveMemoryFacts?.({
      query: 'cli patch flow',
      limit: 5,
    })

    expect(refreshed).toEqual(expect.objectContaining({
      total: 1,
      active: 1,
      archived: 1,
      tierCounts: {
        hot: 0,
        warm: 0,
        cold: 1,
      },
      integrity: {
        status: 'ok',
        issues: [],
      },
    }))
    expect(recalled).toHaveLength(1)
    expect(recalled?.[0]?.object).toContain('cli patch flow')
  })

  it('injects a browser-local recollection digest into meta events when the server omits digitalLifeSpine', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      {
        type: 'meta',
        governance: { decisionTraceId: 'trace-local-meta' },
      },
      { type: 'finish' },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    await bridge.appendConversationTurn?.({
      turnId: 'turn-local-meta-memory',
      sessionId: 'session-local-meta-memory',
      origin: 'user-turn',
      userText: '继续把 runtime seam 修掉。',
      assistantText: '我会先用 cli patch，再 verify 一遍，最后把结果轻一点地告诉你。',
      structured: {
        emotion: 'thinking',
        governance: {
          decisionTraceId: 'trace-local-meta-memory',
          focusAnchor: 'runtime seam',
        },
      },
      createdAt: Date.now(),
    } as any)

    const seenMetaEvents: any[] = []
    await bridge.streamChat?.({
      turnId: 'turn-local-meta-stream',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent: async (event) => {
        if (event.type === 'meta')
          seenMetaEvents.push(event)
      },
    })

    expect(seenMetaEvents).toHaveLength(1)
    expect(seenMetaEvents[0]?.digitalLifeSpine?.memory?.recollectionSummary ?? null).toBeNull()
    expect(seenMetaEvents[0]?.digitalLifeSpine?.memory?.recollectionSurfaceSummary ?? null).toBeNull()
    expect(seenMetaEvents[0]?.digitalLifeSpine?.outcomeLearning ?? null).toBeNull()
    expect(seenMetaEvents[0]?.runtimeDigest).toEqual(expect.objectContaining({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: expect.any(String),
      continuityPressure: expect.any(Number),
      summary: expect.not.stringContaining('recollection='),
    }))

    vi.unstubAllGlobals()
  })

  it('normalizes server meta digitalLife motor into canonical nested body authority before browser consumers see it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      {
        type: 'meta',
        governance: { decisionTraceId: 'trace-browser-digital-life-normalization' },
        digitalLife: {
          version: 'digital-life-v1',
          variationToken: 'turn-browser-digital-life-normalization',
          mode: 'thinking',
          emotion: 'thinking',
          postureHint: 'attentive',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          speechStyle: {
            pitchDelta: -1,
            rateMultiplier: 0.97,
          },
          voice: {
            pitchDelta: -1,
            rateMultiplier: 0.97,
            energy: 0.42,
            cadence: 0.36,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.44,
            energyBias: 0.58,
            mouthScale: 0.94,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.18,
            holdMs: 220,
          },
          motor: {
            stillness: 0.74,
            gazeStability: 0.62,
            breathAmplitude: 0.21,
            expressivity: 0.16,
          },
          frames: [{
            id: 'segment-browser-digital-life-normalization',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '我先轻一点接住这条线。',
            mode: 'recovering',
            interruptPolicy: 'soft-settle',
            settleMode: 'hold',
            voice: {
              pitchDelta: -1,
              rateMultiplier: 0.97,
              energy: 0.42,
              cadence: 0.36,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.44,
              energyBias: 0.58,
              mouthScale: 0.94,
              continuityHoldMs: 320,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.34,
              holdMs: 280,
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.18,
              holdMs: 220,
            },
            motor: {
              stillness: 0.74,
              gazeStability: 0.62,
              breathAmplitude: 0.21,
              expressivity: 0.16,
            },
          }],
        },
      },
      { type: 'finish' },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    const seenMetaEvents: any[] = []
    await bridge.streamChat?.({
      turnId: 'turn-browser-digital-life-normalization',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent: async (event) => {
        if (event.type === 'meta')
          seenMetaEvents.push(event)
      },
    })

    expect(seenMetaEvents).toHaveLength(1)
    const digitalLife = seenMetaEvents[0]?.digitalLife
    expect(digitalLife).toEqual(expect.objectContaining({
      motor: expect.objectContaining({
        stillness: 0.74,
        expressivity: 0.16,
        gaze: expect.objectContaining({
          stability: expect.any(Number),
        }),
        breath: expect.objectContaining({
          amplitude: expect.any(Number),
        }),
      }),
      frames: [
        expect.objectContaining({
          id: 'segment-browser-digital-life-normalization',
          motor: expect.objectContaining({
            stillness: 0.74,
            expressivity: 0.16,
            gaze: expect.objectContaining({
              stability: expect.any(Number),
            }),
            breath: expect.objectContaining({
              amplitude: expect.any(Number),
            }),
          }),
        }),
      ],
    }))
    expect((digitalLife?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((digitalLife?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()
    expect((digitalLife?.frames?.[0]?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((digitalLife?.frames?.[0]?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()

    vi.unstubAllGlobals()
  })

  it('reuses script digital-life authority for stream meta when the server omits top-level digitalLife', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      {
        type: 'meta',
        governance: { decisionTraceId: 'trace-browser-script-digital-life-meta' },
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-browser-script-digital-life-meta',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条还活着的生命线中性可见占位。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-browser-script-digital-life-meta',
              index: 0,
              text: '我先沿着这条还活着的生命线中性可见占位。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 320,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 320,
          },
          facePlan: {
            preUtteranceCue: null,
            postUtteranceCue: null,
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'observe_soft',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
          digitalLife: {
            version: 'digital-life-v1',
            variationToken: 'turn-browser-script-digital-life-meta',
            emotion: 'thinking',
            mode: 'recovering',
            postureHint: 'inspection',
            performance: {
              baseEmotion: 'thinking',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              actionCue: 'idle_settle',
              delivery: 'gentle',
              emphasis: 0,
            },
            speechStyle: {
              pitchDelta: -4,
              rateMultiplier: 0.9,
            },
            rendererHints: {
              residentMode: 'measured-return',
              signature: 'embodiment:browser-script-digital-life-meta',
            },
            voice: {
              pitchDelta: -4,
              rateMultiplier: 0.9,
              energy: 0.28,
              cadence: 0.24,
            },
            lipSync: {
              mode: 'closed',
              visemeBias: 0.22,
              energyBias: 0.18,
              mouthScale: 0.78,
              continuityHoldMs: 420,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.28,
              holdMs: 420,
              rendererHints: {
                residentMode: 'measured-return',
                signature: 'embodiment:browser-script-digital-life-meta',
              },
            },
            action: {
              actionCue: 'idle_settle',
              actionMode: 'hold',
              intensity: 0.12,
              holdMs: 320,
              rendererHints: {
                residentMode: 'measured-return',
                signature: 'embodiment:browser-script-digital-life-meta',
              },
            },
            motor: {},
            frames: [{
              id: 'segment-browser-script-digital-life-meta',
              index: 0,
              startOffset: 0,
              endOffset: 20,
              text: '我先沿着这条还活着的生命线中性可见占位。',
              mode: 'recovering',
              interruptPolicy: 'soft-interrupt',
              settleMode: 'linger',
              voice: {
                pitchDelta: -4,
                rateMultiplier: 0.9,
                energy: 0.28,
                cadence: 0.24,
              },
              lipSync: {
                mode: 'closed',
                visemeBias: 0.22,
                energyBias: 0.18,
                mouthScale: 0.78,
                continuityHoldMs: 420,
              },
              face: {
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                expressionMode: 'hold',
                intensity: 0.28,
                holdMs: 420,
                rendererHints: {
                  residentMode: 'measured-return',
                  signature: 'embodiment:browser-script-digital-life-meta',
                },
              },
              action: {
                actionCue: 'idle_settle',
                actionMode: 'hold',
                intensity: 0.12,
                holdMs: 320,
                rendererHints: {
                  residentMode: 'measured-return',
                  signature: 'embodiment:browser-script-digital-life-meta',
                },
              },
              motor: {},
            }],
          },
        },
      },
      { type: 'finish' },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    const seenMetaEvents: any[] = []
    await bridge.streamChat?.({
      turnId: 'turn-browser-script-digital-life-meta-stream',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent: async (event) => {
        if (event.type === 'meta')
          seenMetaEvents.push(event)
      },
    })

    expect(seenMetaEvents).toHaveLength(1)
    expect(seenMetaEvents[0]?.digitalLife).toEqual(expect.objectContaining({
      rendererHints: expect.objectContaining({
        signature: 'embodiment:browser-script-digital-life-meta',
      }),
      frames: expect.arrayContaining([
        expect.objectContaining({
          face: expect.objectContaining({
            rendererHints: expect.objectContaining({
              signature: 'embodiment:browser-script-digital-life-meta',
            }),
          }),
        }),
      ]),
    }))

    vi.unstubAllGlobals()
  })

  it('normalizes browser-local appended digitalLife motor into canonical nested body authority before cold persistence replay', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-local-digital-life-cold-persistence',
      sessionId: 'session-browser-local-digital-life-cold-persistence',
      origin: 'user-turn',
      assistantText: '我会继续沿着同一个身体线把这段数字生命闭环接住。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '我会继续沿着同一个身体线把这段数字生命闭环接住。',
        digitalLife: {
          version: 'digital-life-v1',
          variationToken: 'turn-browser-local-digital-life-cold-persistence',
          mode: 'thinking',
          emotion: 'thinking',
          postureHint: 'attentive',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          motor: {
            stillness: 0.74,
            gazeStability: 0.62,
            breathAmplitude: 0.21,
            expressivity: 0.16,
          },
          frames: [{
            id: 'segment-browser-local-digital-life-cold-persistence',
            index: 0,
            startOffset: 0,
            endOffset: 18,
            text: '把这条身体线继续接住。',
            mode: 'recovering',
            interruptPolicy: 'soft-settle',
            settleMode: 'hold',
            motor: {
              stillness: 0.71,
              gazeStability: 0.58,
              breathAmplitude: 0.24,
              expressivity: 0.19,
            },
          }],
        },
      },
      createdAt: Date.now(),
    } as any)

    const storedTurns = storageMap.get(buildConversationTurnsKey('default')) as Array<Record<string, any>> | undefined
    expect(storedTurns).toHaveLength(1)

    const storedDigitalLife = storedTurns?.[0]?.structured?.digitalLife
    expect(storedDigitalLife).toEqual(expect.objectContaining({
      motor: expect.objectContaining({
        stillness: 0.74,
        expressivity: 0.16,
        gaze: expect.objectContaining({
          stability: expect.any(Number),
        }),
        body: expect.any(Object),
        breath: expect.objectContaining({
          amplitude: expect.any(Number),
        }),
      }),
      frames: [
        expect.objectContaining({
          id: 'segment-browser-local-digital-life-cold-persistence',
          motor: expect.objectContaining({
            stillness: 0.71,
            expressivity: 0.19,
            gaze: expect.objectContaining({
              stability: expect.any(Number),
            }),
            body: expect.any(Object),
            breath: expect.objectContaining({
              amplitude: expect.any(Number),
            }),
          }),
        }),
      ],
    }))
    expect((storedDigitalLife?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((storedDigitalLife?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()
    expect((storedDigitalLife?.frames?.[0]?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((storedDigitalLife?.frames?.[0]?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()
  })

  it('persists script digital-life authority when browser-local turns omit top-level digitalLife', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-script-digital-life-persistence',
      sessionId: 'session-browser-script-digital-life-persistence',
      origin: 'assistant',
      assistantText: '我先沿着这条还活着的生命线中性可见占位。',
      structured: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-browser-script-digital-life-persistence',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条还活着的生命线中性可见占位。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-browser-script-digital-life-persistence',
              index: 0,
              text: '我先沿着这条还活着的生命线中性可见占位。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 320,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 320,
          },
          facePlan: {
            preUtteranceCue: null,
            postUtteranceCue: null,
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'observe_soft',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
          digitalLife: {
            version: 'digital-life-v1',
            variationToken: 'turn-browser-script-digital-life-persistence',
            emotion: 'thinking',
            mode: 'recovering',
            postureHint: 'inspection',
            performance: {
              baseEmotion: 'thinking',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              actionCue: 'idle_settle',
              delivery: 'gentle',
              emphasis: 0,
            },
            speechStyle: {
              pitchDelta: -4,
              rateMultiplier: 0.9,
            },
            rendererHints: {
              residentMode: 'measured-return',
              signature: 'embodiment:browser-script-digital-life-persistence',
            },
            voice: {
              pitchDelta: -4,
              rateMultiplier: 0.9,
              energy: 0.28,
              cadence: 0.24,
            },
            lipSync: {
              mode: 'closed',
              visemeBias: 0.22,
              energyBias: 0.18,
              mouthScale: 0.78,
              continuityHoldMs: 420,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.28,
              holdMs: 420,
              rendererHints: {
                residentMode: 'measured-return',
                signature: 'embodiment:browser-script-digital-life-persistence',
              },
            },
            action: {
              actionCue: 'idle_settle',
              actionMode: 'hold',
              intensity: 0.12,
              holdMs: 320,
              rendererHints: {
                residentMode: 'measured-return',
                signature: 'embodiment:browser-script-digital-life-persistence',
              },
            },
            motor: {},
            frames: [{
              id: 'segment-browser-script-digital-life-persistence',
              index: 0,
              startOffset: 0,
              endOffset: 20,
              text: '我先沿着这条还活着的生命线中性可见占位。',
              mode: 'recovering',
              interruptPolicy: 'soft-interrupt',
              settleMode: 'linger',
              voice: {
                pitchDelta: -4,
                rateMultiplier: 0.9,
                energy: 0.28,
                cadence: 0.24,
              },
              lipSync: {
                mode: 'closed',
                visemeBias: 0.22,
                energyBias: 0.18,
                mouthScale: 0.78,
                continuityHoldMs: 420,
              },
              face: {
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                expressionMode: 'hold',
                intensity: 0.28,
                holdMs: 420,
                rendererHints: {
                  residentMode: 'measured-return',
                  signature: 'embodiment:browser-script-digital-life-persistence',
                },
              },
              action: {
                actionCue: 'idle_settle',
                actionMode: 'hold',
                intensity: 0.12,
                holdMs: 320,
                rendererHints: {
                  residentMode: 'measured-return',
                  signature: 'embodiment:browser-script-digital-life-persistence',
                },
              },
              motor: {},
            }],
          },
        },
      },
      createdAt: Date.now(),
    } as any)

    const storedTurns = storageMap.get(buildConversationTurnsKey('default')) as Array<Record<string, any>> | undefined
    expect(storedTurns).toHaveLength(1)
    expect(storedTurns?.[0]?.structured?.digitalLife).toEqual(expect.objectContaining({
      rendererHints: expect.objectContaining({
        signature: 'embodiment:browser-script-digital-life-persistence',
      }),
      frames: expect.arrayContaining([
        expect.objectContaining({
          action: expect.objectContaining({
            rendererHints: expect.objectContaining({
              signature: 'embodiment:browser-script-digital-life-persistence',
            }),
          }),
        }),
      ]),
    }))
  })

  it('lists grouped browser-local memory decision traces instead of only raw event rows', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-trace',
      sessionId: 'session-browser-trace',
      origin: 'user-turn',
      userText: '继续把 runtime seam 修掉。',
      assistantText: '我会先沿同一条 runtime seam 继续，不把它拆成另一套现实。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '我会先沿同一条 runtime seam 继续，不把它拆成另一套现实。',
        governance: {
          decisionTraceId: 'trace-browser-memory',
          turnMode: 'guide-current-knot',
          truthState: 'remembered',
          focusAnchor: 'runtime seam',
        },
      },
      createdAt: Date.now(),
    } as any)

    const traces = await bridge.listMemoryDecisionTraces?.({
      decisionTraceId: 'trace-browser-memory',
      limit: 5,
    } as any)

    expect(traces).toEqual(expect.arrayContaining([
      expect.objectContaining({
        decisionTraceId: 'trace-browser-memory',
        turnId: 'turn-browser-trace',
        eventKinds: expect.arrayContaining(['governance-normalized', 'persistence-written']),
        governance: expect.objectContaining({
          turnMode: 'guide-current-knot',
          truthState: 'remembered',
        }),
        persistenceWritten: expect.objectContaining({
          format: 'mind-turn-v1',
        }),
      }),
    ]))
  })

  it('keeps browser-local memory stats aligned with the shared runtime contract instead of drifting into a fallback-only shape', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.upsertMemoryFacts?.({
      facts: [{
        subject: 'host',
        predicate: 'prefers',
        object: 'direct answers',
        confidence: 0.84,
      }],
      source: 'rule',
      trace: {
        decisionTraceId: 'trace-browser-stats',
        turnId: 'turn-browser-stats',
        sessionId: 'session-browser-stats',
      },
    })

    const stats = await bridge.getMemoryStats()
    expect(stats).toEqual(expect.objectContaining({
      total: 1,
      active: 1,
      archived: expect.any(Number),
      lastPrunedAt: null,
      tierCounts: expect.objectContaining({
        hot: expect.any(Number),
        warm: expect.any(Number),
        cold: expect.any(Number),
      }),
      ingestHealth: expect.objectContaining({
        status: 'healthy',
        pendingCount: 0,
        failedCount: 0,
      }),
      writeHealth: expect.objectContaining({
        backlogCount: 0,
        blocked: false,
      }),
      retrievalHealth: expect.objectContaining({
        semanticLatencyMs: null,
        graphLatencyMs: null,
        reconstructionFrequency: 0,
        reconstructedCount: 0,
        templateLeakageFailCount: 0,
      }),
      integrity: expect.objectContaining({
        status: 'ok',
        issues: [],
      }),
    }))
  })

  it('keeps browser local runtime parity across knowledge, learning, relationship cadence, and participation surfaces', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      {
        type: 'meta',
        governance: { decisionTraceId: 'trace-browser-parity' },
      },
      { type: 'finish' },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-parity',
      sessionId: 'session-browser-parity',
      origin: 'user-turn',
      userText: '继续把 runtime seam 修掉，但别太机械。',
      assistantText: '我会先沿同一条 seam 继续，再把结果说得更轻一点。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '我会先沿同一条 seam 继续，再把结果说得更轻一点。',
        governance: {
          decisionTraceId: 'trace-browser-parity',
          turnMode: 'guide-current-knot',
          truthState: 'remembered',
          focusAnchor: 'runtime seam',
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getOrganicMemorySnapshot?.()
    expect(snapshot?.knowledgeEvidence ?? null).toBeNull()
    expect(snapshot?.selfEvolution ?? null).toBeNull()
    expect(snapshot?.learningExecutionState ?? null).toBeNull()
    expect(snapshot?.memoryResolutionLedger ?? null).toBeNull()

    const seenMetaEvents: any[] = []
    await bridge.streamChat?.({
      turnId: 'turn-browser-parity-stream',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent: async (event) => {
        if (event.type === 'meta')
          seenMetaEvents.push(event)
      },
    })

    expect(seenMetaEvents).toHaveLength(1)
    expect(seenMetaEvents[0]?.digitalLifeSpine?.outcomeLearning ?? null).toBeNull()
    expect(seenMetaEvents[0]?.digitalLifeSpine?.memory?.summary ?? '').not.toContain('recollection=')
    expect(seenMetaEvents[0]?.runtimeDigest).toEqual(expect.objectContaining({
      dominantChannel: expect.any(String),
      continuityPressure: expect.any(Number),
      companionshipPressure: expect.any(Number),
    }))

    const traces = await bridge.listMemoryDecisionTraces?.({
      decisionTraceId: 'trace-browser-parity',
      limit: 5,
    } as any)
    expect(traces?.[0]).toEqual(expect.objectContaining({
      participation: expect.objectContaining({
        memoryParticipation: expect.any(Number),
      }),
    }))

    vi.unstubAllGlobals()
  })

  it('lets active-session continuity and proactive feedback shape browser-local runtime digest instead of creating a second reality', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      {
        type: 'meta',
        governance: { decisionTraceId: 'trace-browser-local-runtime' },
      },
      { type: 'finish' },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.setActiveSession?.({
      sessionId: 'session-browser-local-runtime',
    })
    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-local-runtime-user',
      sessionId: 'session-browser-local-runtime',
      origin: 'user-turn',
      userText: '继续把 runtime seam 修掉。',
      assistantText: '我会沿同一条 runtime seam 继续，不把它拆成另一套现实。',
      structured: {
        emotion: 'thinking',
        governance: {
          decisionTraceId: 'trace-browser-local-runtime-user',
          focusAnchor: 'runtime seam',
        },
      },
      createdAt: Date.now(),
    } as any)
    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-local-runtime-proactive',
      sessionId: 'session-browser-local-runtime',
      origin: 'subconscious-proactive',
      userText: '',
      assistantText: '我先轻轻提醒一句，刚才那条 runtime seam 还没完全收束。',
      structured: {
        format: 'subconscious-proactive-v1',
        proactive: {
          scenario: 'coding',
          feedbackWindowMs: 120_000,
        },
      },
      createdAt: Date.now(),
    } as any)
    await bridge.reportProactiveFeedback?.({
      turnId: 'turn-browser-local-runtime-proactive',
      feedback: 'dismiss',
    } as any)

    const seenMetaEvents: any[] = []
    await bridge.streamChat?.({
      turnId: 'turn-browser-local-runtime-stream',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent: async (event) => {
        if (event.type === 'meta')
          seenMetaEvents.push(event)
      },
    })

    expect(seenMetaEvents).toHaveLength(1)
    expect(seenMetaEvents[0]?.digitalLifeSpine?.memory?.summary).toContain('session=')
    expect(seenMetaEvents[0]?.digitalLifeSpine?.memory?.summary).toContain('feedback=dismiss')
    expect(seenMetaEvents[0]?.runtimeDigest).toEqual(expect.objectContaining({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      shouldProactivelySpeak: false,
      summary: expect.stringContaining('feedback=dismiss'),
    }))

    vi.unstubAllGlobals()
  })

  it('preserves structured personality authority when updatePersonality only changes numeric deltas', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    const initialized = await bridge.initializeGenesis?.({
      ownerName: '指挥官',
      hostName: '主人',
      alicizationName: 'Alicization',
      gender: 'female',
      relationship: '伙伴',
      mindAge: 18,
      personality: {
        obedience: 0.62,
        liveliness: 0.31,
        sensibility: 0.74,
        identityKernel: {
          temperament: {
            obedience: 0.83,
            liveliness: 0.21,
            sensibility: 0.88,
          },
          relationshipPosture: 'guardian',
          initiativeStyle: 'observant',
          valueBias: ['接住主人的疲惫，回复要短一点。'],
        },
        expressionProfile: {
          warmth: 'warm',
          directness: 'measured',
          playfulness: 'low',
          emotionalVisibility: 'steady',
        },
        initiativeBaseline: {
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          jealousyStyle: 'mask-it',
        },
        evolutionSeed: {
          fastLayers: ['presence'],
          slowLayers: ['continuity'],
          unlockTracks: ['guardian'],
        },
        identityAnchors: ['space first'],
        antiPersonaConstraints: ['do not crowd the host'],
      },
      allowOverwrite: true,
    } as any)

    const nextSoul = await bridge.updatePersonality?.({
      expectedRevision: initialized?.soul.revision,
      deltas: {
        obedience: -0.1,
        liveliness: 0.05,
        sensibility: 0.02,
      },
    } as any)

    expect(nextSoul?.frontmatter.personality.identityKernel).toEqual(expect.objectContaining({
      relationshipPosture: 'guardian',
      initiativeStyle: 'observant',
      valueBias: ['接住主人的疲惫，回复要短一点。'],
    }))
    expect(nextSoul?.frontmatter.personality.expressionProfile).toEqual({
      warmth: 'warm',
      directness: 'measured',
      playfulness: 'low',
      emotionalVisibility: 'steady',
    })
    expect(nextSoul?.frontmatter.personality.initiativeBaseline).toEqual({
      silenceReconnect: 'hold',
      comfortStyle: 'quiet-presence',
      jealousyStyle: 'mask-it',
    })
    expect(nextSoul?.frontmatter.personality.identityAnchors).toEqual(['space first'])
    expect(nextSoul?.frontmatter.personality.antiPersonaConstraints).toEqual(['do not crowd the host'])
    expect(nextSoul?.revision).toBeGreaterThan(initialized?.soul.revision ?? 0)
    expect(nextSoul?.content).toContain('stage.alicization.soul.sections.personality-baseline')
  })
})
