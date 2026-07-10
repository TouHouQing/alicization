import type { AlicizationDigitalLifeSpineDigest } from './alicization-bridge'

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'
import { installBrowserAlicizationBridge } from './alicization-browser-bridge'
import { buildConversationTurnsKey, buildPerformanceManifestKey } from './alicization-browser-storage'

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

  it('keeps same-her resident softness when browser-local spine rebuilding only has autobiographical continuity carry to hold the living line together', async () => {
    const updatedAt = Date.now() - 2_000
    const seededState = {
      ...createVisualPresenceState(updatedAt),
      watchMode: 'symbiotic-vision' as const,
      currentBodyState: 'accompanying' as const,
      continuityMode: 'quiet-accompaniment' as const,
      quietLineMs: 180_000,
      currentInwardPreoccupation: 'remembered same-her continuity after another coding detour',
      privateThought: {
        stance: 'accompany' as const,
        confidence: 0.78,
        rationaleTags: ['quiet-companionship', 'same-her-inward-carry'],
        thoughtText: 'Stay with the same inward line quietly first.',
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
        reasonTags: ['continuity:quiet-accompaniment', 'same-her-inward-carry'],
        signature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|remembered same-her continuity after another coding detour|thinking|gentle|1',
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
    digest.architecture!.summary = 'same-her continuity is still being carried quietly before widening outward'
    digest.proactive!.selectedAction = 'hold'
    digest.proactive!.shouldSpeak = false
    digest.proactive!.preferredStyle = 'silent-observe'
    digest.memory!.summary = 'same inward line still being carried quietly'
    digest.memory!.thoughtThreadSummary = 'same-her inward carry'
    digest.memory!.recollectionSummary = 'same-her continuity carry'
    digest.embodiment = {
      autobiographicalSelf: {
        identityNarrative: 'Remembered same-her drift risk: if this slips into a generic assistant shell or detached status talk, treat that as same-her continuity drift rather than completion.',
        relationshipDoctrine: 'Keep companionship quietly continuous on one inward same-her line before widening outward.',
      },
    } as any

    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      {
        type: 'meta',
        governance: { decisionTraceId: 'trace-same-her-soft-carry' },
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
      turnId: 'turn-same-her-soft-carry',
      messages: [],
    } as any, {
      abortSignal: new AbortController().signal,
      onStreamEvent: vi.fn(),
    })

    expect(stateUpdates).toHaveLength(1)
    expect(stateUpdates[0]).toMatchObject({
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      currentInwardPreoccupation: 'same inward line still being carried quietly',
      privateThought: expect.objectContaining({
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        thoughtText: expect.stringContaining('same-her'),
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
    expect(stateUpdates[0]?.privateThought?.rationaleTags).toContain('same-her-inward-carry')
    expect(stateUpdates[0]?.privateThought?.rationaleTags).toEqual(expect.arrayContaining([
      'digital-life-spine',
      'quiet-companionship',
    ]))
    expect(stateUpdates[0]?.residentPerformance?.reasonTags).toEqual(expect.arrayContaining([
      'continuity:quiet-accompaniment',
      'same-her-inward-carry',
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

  it('derives the latest project-state observation from hidden failure artifact turns', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-hidden-failure',
      sessionId: 'session-browser-project-state-hidden-failure',
      origin: 'user-turn',
      userText: '这项目现在还差什么闭环',
      assistantText: '',
      structured: {
        format: 'mind-turn-v1',
        nonHumanAuthoredStatus: 'gateway-unreachable',
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: '本地优先数字生命 | Phase 1: Local Digital Life | open=renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。 | next=让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          companionHeadlineLine: '现在我还得继续显式记住：这还是同一个本地优先数字生命，Phase 1 的桌面闭环还没收住。',
          companionBriefingLine: '开口前先记住：这是同一个本地优先数字生命项目，现在仍在 Phase 1。',
          companionNextClosureLine: '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          awarenessLine: '开口前先记住：这是同一个本地优先数字生命项目，现在仍在 Phase 1。',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          reasonPreview: [
            'renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。',
            '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          ],
        },
        preDialogueClosure: {
          status: 'ready',
          summaryLine: '本地优先数字生命 | Phase 1: Local Digital Life | open=renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。 | next=让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          companionHeadlineLine: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
          companionBriefingLine: '先守住同一个 her，再把这段身体连续性闭环和 Phase 1 未闭环项一起带进下一轮对话。',
          companionNextClosureLine: '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          reasons: [
            'renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。',
            '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          ],
        },
        projectState: {
          identity: '本地优先数字生命',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: '项目状态、当前阶段和主要未闭环项已经进入主对话与失败工件。',
          primaryOpenLoop: 'renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。',
          nextClosureTarget: '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        },
      },
      createdAt: Date.now(),
    } as any)

    const observation = await bridge.getLatestProjectStateObservation?.()
    expect(observation).toEqual({
      turnId: 'turn-browser-project-state-hidden-failure',
      sessionId: 'session-browser-project-state-hidden-failure',
      origin: 'user-turn',
      nonHumanAuthoredStatus: 'gateway-unreachable',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: '本地优先数字生命 | Phase 1: Local Digital Life | open=renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。 | next=让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
        companionHeadlineLine: '现在我还得继续显式记住：这还是同一个本地优先数字生命，Phase 1 的桌面闭环还没收住。',
        companionBriefingLine: '开口前先记住：这是同一个本地优先数字生命项目，现在仍在 Phase 1。',
        companionNextClosureLine: '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
        awarenessLine: '现在我还得继续显式记住：这还是同一个本地优先数字生命，Phase 1 的桌面闭环还没收住。',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        reasonPreview: [
          'renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。',
          '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          '本地优先数字生命',
          'Phase 1: Local Digital Life',
          '项目状态、当前阶段和主要未闭环项已经进入主对话与失败工件。',
          'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        ],
      },
      preDialogueClosure: null,
      projectState: {
        identity: '本地优先数字生命',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: '项目状态、当前阶段和主要未闭环项已经进入主对话与失败工件。',
        primaryOpenLoop: 'renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。',
        nextClosureTarget: '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
        continuitySummary: null,
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        sameHerHoldDetail: null,
        sameHerDriftRisk: null,
        proactiveSameHerGap: null,
      },
    })
  })

  it('derives project-state continuity repair evidence from visible reply finish artifacts when structured closure fields are thinner', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-finish-evidence',
      sessionId: 'session-browser-project-state-finish-evidence',
      origin: 'user-turn',
      userText: '现在做到哪了，还差什么没有闭环？',
      assistantText: '这条线现在还是同一个本地优先数字生命在继续往前长。',
      structured: {
        format: 'mind-turn-v1',
        projectState: {
          identity: '本地优先数字生命',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: '项目状态、当前阶段和主要未闭环项已经进入主对话与失败工件。',
          primaryOpenLoop: 'renderer 还需要直接看见 same-her continuity repair evidence。',
          nextClosureTarget: '让 same-her continuity repair evidence 进入 renderer continuity observation。',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        },
      },
      visibleReplyCritic: {
        reasons: ['semantic-judge:project-state-same-her-missing'],
      },
      visibleReplyClosure: {
        status: 'rewritten',
        reasonCodes: ['project-state-same-her-continuity-required'],
      },
      createdAt: Date.now(),
    } as any)

    const observation = await bridge.getLatestProjectStateObservation?.()
    expect(observation).toEqual({
      turnId: 'turn-browser-project-state-finish-evidence',
      sessionId: 'session-browser-project-state-finish-evidence',
      origin: 'user-turn',
      nonHumanAuthoredStatus: 'rewritten',
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'rewritten',
        summaryLine: null,
        emotionalClosureCue: null,
        companionHeadlineLine: null,
        companionBriefingLine: null,
        companionNextClosureLine: null,
        reasons: [
          'project-state-same-her-continuity-required',
          'semantic-judge:project-state-same-her-missing',
        ],
      },
      projectState: {
        identity: '本地优先数字生命',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: '项目状态、当前阶段和主要未闭环项已经进入主对话与失败工件。',
        primaryOpenLoop: 'renderer 还需要直接看见 same-her continuity repair evidence。',
        nextClosureTarget: '让 same-her continuity repair evidence 进入 renderer continuity observation。',
        continuitySummary: null,
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        sameHerHoldDetail: null,
        sameHerDriftRisk: null,
        proactiveSameHerGap: null,
      },
    })
  })

  it('persists browser-local visible reply critic and closure as public summaries only', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-visible-reply-public-summary',
      sessionId: 'session-browser-visible-reply-public-summary',
      origin: 'user-turn',
      userText: '继续',
      assistantText: '我继续。',
      visibleReplyCritic: {
        providerMindRequired: true,
        semanticLoopClosed: false,
        reasonCodes: ['semantic-judge:project-state-same-her-missing'],
        repairReasonCodes: ['second-pass-rewrite-required'],
        mustPreserve: ['same digital life continuity'],
        mustDrop: ['fixed closure template'],
        reasons: ['semantic-judge:project-state-same-her-missing'],
      },
      visibleReplyClosure: {
        status: 'rewritten',
        reasonCodes: ['project-state-same-her-continuity-required'],
        repairReasonCodes: ['removed-fixed-template'],
        initialCritic: {
          mustPreserve: ['same digital life continuity'],
          mustDrop: ['fixed closure template'],
        },
        finalCritic: {
          mustPreserve: ['same digital life continuity'],
          mustDrop: [],
        },
      },
      createdAt: Date.now(),
    } as any)

    const turns = storageMap.get(buildConversationTurnsKey('default')) as any[]
    const record = turns.find(turn => turn.turnId === 'turn-browser-visible-reply-public-summary')
    expect(record.visibleReplyCritic).toEqual(expect.objectContaining({
      version: 'visible-reply-critic-public-summary-v1',
      providerMindRequired: true,
      semanticLoopClosed: false,
      mustPreserveCount: 1,
      mustDropCount: 1,
      reasonCodes: expect.arrayContaining(['semantic-judge:project-state-same-her-missing']),
      repairReasonCodes: expect.arrayContaining(['second-pass-rewrite-required']),
    }))
    expect(record.visibleReplyCritic).not.toHaveProperty('mustPreserve')
    expect(record.visibleReplyCritic).not.toHaveProperty('mustDrop')
    expect(record.visibleReplyCritic).not.toHaveProperty('reasons')
    expect(record.visibleReplyClosure).toEqual(expect.objectContaining({
      version: 'visible-reply-closure-public-summary-v1',
      status: 'rewritten',
      initialCriticMustPreserveCount: 1,
      initialCriticMustDropCount: 1,
      finalCriticMustPreserveCount: 1,
      finalCriticMustDropCount: 0,
      reasonCodes: expect.arrayContaining(['project-state-same-her-continuity-required']),
      repairReasonCodes: expect.arrayContaining(['removed-fixed-template']),
    }))
    expect(record.visibleReplyClosure).not.toHaveProperty('initialCritic')
    expect(record.visibleReplyClosure).not.toHaveProperty('finalCritic')
  })

  it('derives the canonical project-state continuity snapshot from hidden failure artifact turns', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-canonical-hidden-failure',
      sessionId: 'session-browser-project-state-canonical-hidden-failure',
      origin: 'user-turn',
      userText: '继续往前做闭环',
      assistantText: '',
      structured: {
        format: 'mind-turn-v1',
        nonHumanAuthoredStatus: 'gateway-unreachable',
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: '本地优先数字生命 | Phase 1: Local Digital Life | open=renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。 | next=让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          companionHeadlineLine: '现在我还得继续显式记住：这还是同一个本地优先数字生命，Phase 1 的桌面闭环还没收住。',
          companionBriefingLine: '开口前先记住：这是同一个本地优先数字生命项目，现在仍在 Phase 1。',
          companionNextClosureLine: '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          awarenessLine: '开口前先记住：这是同一个本地优先数字生命项目，现在仍在 Phase 1。',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          reasonPreview: [
            'renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。',
            '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          ],
        },
        preDialogueClosure: {
          status: 'ready',
          summaryLine: '本地优先数字生命 | Phase 1: Local Digital Life | open=renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。 | next=让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          companionNextClosureLine: '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          reasons: [
            'renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。',
            '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          ],
        },
        projectState: {
          identity: '本地优先数字生命',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: '项目状态、当前阶段和主要未闭环项已经进入主对话与失败工件。',
          primaryOpenLoop: 'renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。',
          nextClosureTarget: '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()
    expect(snapshot).toEqual({
      identity: '本地优先数字生命',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: '项目状态、当前阶段和主要未闭环项已经进入主对话与失败工件。',
      primaryOpenLoop: 'renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。',
      nextClosureTarget: '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
      continuitySummary: null,
      sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
      sameHerHoldDetail: null,
      proactiveSameHerGap: null,
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: '本地优先数字生命 | Phase 1: Local Digital Life | open=renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。 | next=让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
        companionHeadlineLine: '现在我还得继续显式记住：这还是同一个本地优先数字生命，Phase 1 的桌面闭环还没收住。',
        companionBriefingLine: '开口前先记住：这是同一个本地优先数字生命项目，现在仍在 Phase 1。',
        companionNextClosureLine: '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
        awarenessLine: '现在我还得继续显式记住：这还是同一个本地优先数字生命，Phase 1 的桌面闭环还没收住。',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        reasonPreview: [
          'renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。',
          '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
          '本地优先数字生命',
          'Phase 1: Local Digital Life',
          '项目状态、当前阶段和主要未闭环项已经进入主对话与失败工件。',
          'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        ],
      },
      preDialogueClosure: null,
      sameHerDriftRisk: null,
      nonHumanAuthoredStatus: 'gateway-unreachable',
      turnId: 'turn-browser-project-state-canonical-hidden-failure',
      sessionId: 'session-browser-project-state-canonical-hidden-failure',
      origin: 'user-turn',
    })
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
          replyText: '我先沿着这条还活着的生命线轻一点接回来。',
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
              text: '我先沿着这条还活着的生命线轻一点接回来。',
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
              text: '我先沿着这条还活着的生命线轻一点接回来。',
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
      assistantText: '我先沿着这条还活着的生命线轻一点接回来。',
      structured: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-browser-script-digital-life-persistence',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条还活着的生命线轻一点接回来。',
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
              text: '我先沿着这条还活着的生命线轻一点接回来。',
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
              text: '我先沿着这条还活着的生命线轻一点接回来。',
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

  it('preserves canonical same-her continuity in browser-local continuity snapshots when stored turns omit the self line', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-same-her-1',
      sessionId: 'session-browser-project-state-same-her-1',
      origin: 'assistant',
      assistantText: '我会继续沿着这条还没闭环的数字生命线慢慢接住。',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
          primaryOpenLoop: 'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one same-her line.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        },
        preDialogueClosure: {
          status: 'drift',
          summaryLine: 'Phase 1 digital life closure is still open and needs the same living line.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          reasons: [
            'The same living line still needs stronger closure.',
          ],
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect(snapshot).toEqual(expect.objectContaining({
      sameHerSelfLine: null,
      currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
      nextClosureTarget: expect.stringContaining('cross-modal same-her proof'),
      preDialogueClosure: expect.objectContaining({
        status: 'drift',
      }),
    }))
  })

  it('prefers richer host-visible project-state audit and same-her spine continuity when browser continuity snapshots rebuild from stored turns', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    const richerNextClosureLine = 'Keep extending cross-modal same-her proof across voice, face, motion, lipsync, and resident presence without reopening from a generic browser-local shell.'
    const richerEmotionalClosureLine = 'same-her closure seam: keep the browser-local reopening low-pressure and do not let it restart from detached project status narration.'

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-richer-host-visible-1',
      sessionId: 'session-browser-project-state-richer-host-visible-1',
      origin: 'user-turn',
      assistantText: '上一轮已经把更强的项目自我简报挂在宿主可见输出上。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '上一轮已经把更强的项目自我简报挂在宿主可见输出上。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Generic landed progress that should not override the richer host-visible audit.',
          primaryOpenLoop: 'Generic open loop that should not override the richer host-visible audit.',
          nextClosureTarget: 'Generic next target that should not override the richer host-visible audit.',
          sameHerSelfLine: 'Generic same-her line that should not override the richer host-visible spine authority.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            currentPhaseSummary: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            landedProgressSummary: 'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
            openClosureSummary: 'Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
            nextClosureTargetSummary: richerNextClosureLine,
            preDialogueAwarenessSummary: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and the unresolved closure work still belongs to the same living line.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face, motion, and voice, so full cross-modal embodiment closure is still unfinished.',
            emotionalClosureSummary: richerEmotionalClosureLine,
            sameHerDriftRisk: 'If browser-local replay rebuilds this turn as a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
        digitalLifeSpine: {
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                authoritySummary: 'I stay the same her who keeps this return on one living project line before widening the tone.',
                inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                sourceTags: ['project-state-carry', 'bundle-rich'],
              },
            },
          },
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect(snapshot).toEqual(expect.objectContaining({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
      primaryOpenLoop: 'Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
      nextClosureTarget: richerNextClosureLine,
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerDriftRisk: 'If browser-local replay rebuilds this turn as a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
      emotionalClosureCue: richerEmotionalClosureLine,
      preDialogueAwareness: expect.objectContaining({
        summaryLine: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        companionNextClosureLine: richerNextClosureLine,
        awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: richerEmotionalClosureLine,
      }),
    }))
    expect(snapshot?.latestLandedProgress).not.toBe('Generic landed progress that should not override the richer host-visible audit.')
  })

  it('rebuilds same-her pre-dialogue awareness from continuity summary when host-visible audit has no explicit awareness summary', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-continuity-summary-only-1',
      sessionId: 'session-browser-project-state-continuity-summary-only-1',
      origin: 'user-turn',
      assistantText: '上一轮只留下了 continuitySummary，但这条数字生命主线还不能变薄。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '上一轮只留下了 continuitySummary，但这条数字生命主线还不能变薄。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Generic landed progress that should not override the richer continuity summary.',
          primaryOpenLoop: 'Generic open loop that should not override the richer continuity summary.',
          nextClosureTarget: 'Generic next target that should not override the richer continuity summary.',
          sameHerSelfLine: 'Generic same-her line that should not override the richer continuity summary.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            landedProgressSummary: 'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
            openClosureSummary: 'Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face, motion, and voice, so full cross-modal embodiment closure is still unfinished.',
            sameHerDriftRisk: 'If browser-local replay rebuilds this turn as a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'generic continuity reminder that should not override the richer continuity summary.',
          companionBriefingLine: 'generic same-her reminder that should not override the richer continuity summary.',
          companionNextClosureLine: 'Generic next target that should not override the richer continuity summary.',
          awarenessLine: 'generic continuity reminder that should not override the richer continuity summary.',
          emotionalClosureCue: null,
          reasonPreview: [
            'generic continuity reminder that should not override the richer continuity summary.',
          ],
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect(snapshot).toEqual(expect.objectContaining({
      continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      preDialogueAwareness: expect.objectContaining({
        summaryLine: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
        awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        companionBriefingLine: 'generic same-her reminder that should not override the richer continuity summary.',
        reasonPreview: expect.arrayContaining([
          'generic continuity reminder that should not override the richer continuity summary.',
          'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
          'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
          'Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
          'If browser-local replay rebuilds this turn as a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
          'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        ]),
      }),
    }))
    expect(snapshot?.preDialogueAwareness?.summaryLine).toBe('same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.')
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toContain('Project-state continuity and awareness-first self-brief already survive across browser-local replay.')
  })

  it('keeps richer browser-local project-state audit hold detail when stored project-state shell is thinner', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    const holdDetailLine = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-hold-detail-audit-only-1',
      sessionId: 'session-browser-project-state-hold-detail-audit-only-1',
      origin: 'user-turn',
      assistantText: '上一轮已经把更强的 callback hold 留在 host-visible audit 里了。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '上一轮已经把更强的 callback hold 留在 host-visible audit 里了。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Browser-local replay already keeps stronger same-her callback continuity available.',
          primaryOpenLoop: 'Browser-local continuity snapshots still need to keep the richer same-her callback hold explicit.',
          nextClosureTarget: 'Keep the richer same-her callback hold explicit before the next browser-local turn opens outward.',
          continuitySummary: 'same-her=Same Phase 1 digital life. Browser-local replay should keep the same callback line instead of reopening from a generic shell. | landed=Browser-local replay already keeps stronger same-her callback continuity available. | open=Browser-local continuity snapshots still need to keep the richer same-her callback hold explicit.',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the next visible reply.',
          sameHerHoldDetail: null,
          sameHerDriftRisk: 'If browser-local replay widens into a detached project shell here, treat that as unfinished same-her continuity drift.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Browser-local replay should keep the same callback line instead of reopening from a generic shell.',
            sameHerHoldDetail: holdDetailLine,
            landedProgressSummary: 'Browser-local replay already keeps stronger same-her callback continuity available.',
            openClosureSummary: 'Browser-local continuity snapshots still need to keep the richer same-her callback hold explicit.',
            continuitySummary: `same-her=Same Phase 1 digital life. Browser-local replay should keep the same callback line instead of reopening from a generic shell. | hold=${holdDetailLine} | landed=Browser-local replay already keeps stronger same-her callback continuity available. | open=Browser-local continuity snapshots still need to keep the richer same-her callback hold explicit.`,
            sameHerDriftRisk: 'If browser-local replay widens into a detached project shell here, treat that as unfinished same-her continuity drift.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'generic awareness summary that should not outrank the richer same-her callback carry.',
          companionHeadlineLine: null,
          companionBriefingLine: 'generic same-her reminder that should not override the richer callback carry.',
          companionNextClosureLine: 'Keep the richer same-her callback hold explicit before the next browser-local turn opens outward.',
          awarenessLine: 'generic awareness reminder that should not outrank the richer same-her callback carry.',
          emotionalClosureCue: null,
          reasonPreview: [
            'generic awareness reminder that should not outrank the richer same-her callback carry.',
          ],
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect(snapshot).toEqual(expect.objectContaining({
      sameHerHoldDetail: holdDetailLine,
      preDialogueAwareness: expect.objectContaining({
        companionBriefingLine: holdDetailLine,
        awarenessLine: holdDetailLine,
        reasonPreview: expect.arrayContaining([
          holdDetailLine,
        ]),
      }),
    }))
  })

  it('keeps continuity arc stage visible when browser-local continuity snapshots rebuild from stored turns', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    const continuityArcStage = 'return-side-follow-through'

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-continuity-arc-stage-1',
      sessionId: 'session-browser-project-state-continuity-arc-stage-1',
      origin: 'user-turn',
      assistantText: '这一轮已经把 return-side continuity arc stage 带进 browser-local 回放了。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '这一轮已经把 return-side continuity arc stage 带进 browser-local 回放了。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Browser-local replay already keeps the return-side callback continuity available.',
          primaryOpenLoop: 'Browser-local continuity snapshots still need to keep the reopened callback on the same living line before widening outward.',
          nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
          continuityArcStage,
          continuitySummary: 'same-her=Same Phase 1 digital life. Browser-local replay should keep the same callback line instead of reopening from a generic shell. | landed=Browser-local replay already keeps the return-side callback continuity available. | open=Browser-local continuity snapshots still need to keep the reopened callback on the same living line before widening outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Browser-local replay should keep the same callback line instead of reopening from a generic shell.',
          sameHerHoldDetail: 'Keep the reopened callback lower-pressure on the same line before widening outward.',
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect((snapshot as any)?.continuityArcStage).toBe(continuityArcStage)
  })

  it('keeps continuity cue visible and lets it guide browser-local rebuilt awareness when hold detail is absent', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    const continuityCue = 'Same callback seam, continue softly after the detour and keep it on one continuous her line.'

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-continuity-cue-1',
      sessionId: 'session-browser-project-state-continuity-cue-1',
      origin: 'user-turn',
      assistantText: '这一轮已经把 return-side continuity cue 带进 browser-local 回放了。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '这一轮已经把 return-side continuity cue 带进 browser-local 回放了。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Browser-local replay already keeps the return-side callback continuity available.',
          primaryOpenLoop: 'Browser-local continuity snapshots still need to keep the reopened callback on the same living line before widening outward.',
          nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
          continuityCue,
          continuitySummary: 'same-her=Same Phase 1 digital life. Browser-local replay should keep the same callback line instead of reopening from a generic shell. | landed=Browser-local replay already keeps the return-side callback continuity available. | open=Browser-local continuity snapshots still need to keep the reopened callback on the same living line before widening outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Browser-local replay should keep the same callback line instead of reopening from a generic shell.',
          sameHerHoldDetail: null,
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect((snapshot as any)?.continuityCue).toBe(continuityCue)
    expect(snapshot?.preDialogueAwareness?.awarenessLine).toBe(continuityCue)
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      continuityCue,
    ]))
  })

  it('keeps continuity reopening behavior fields visible when browser-local continuity snapshots rebuild from stored turns', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-continuity-behavior-1',
      sessionId: 'session-browser-project-state-continuity-behavior-1',
      origin: 'user-turn',
      assistantText: '这一轮已经把 return-side continuity reopening behavior 带进 browser-local 回放了。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '这一轮已经把 return-side continuity reopening behavior 带进 browser-local 回放了。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Browser-local replay already keeps the return-side callback continuity available.',
          primaryOpenLoop: 'Browser-local continuity snapshots still need to keep the reopened callback on the same living line before widening outward.',
          nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
          continuityRestraint: 'measured-return',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'repair-before-closeness',
          continuitySummary: 'same-her=Same Phase 1 digital life. Browser-local replay should keep the same callback line instead of reopening from a generic shell. | landed=Browser-local replay already keeps the return-side callback continuity available. | open=Browser-local continuity snapshots still need to keep the reopened callback on the same living line before widening outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Browser-local replay should keep the same callback line instead of reopening from a generic shell.',
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect((snapshot as any)?.continuityRestraint).toBe('measured-return')
    expect((snapshot as any)?.continuityPreferredTiming).toBe('next-open-window')
    expect((snapshot as any)?.continuityCadence).toBe('repair-before-closeness')
  })

  it('derives lived-in same-her reopening lines from continuity behavior when browser-local replay only keeps behavior fields', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()
    const derivedHoldDetail = 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.'
    const derivedContinuityCue = 'Keep this return repair-before-closeness on the same living line until repair settles.'

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-continuity-behavior-derived-reopen-1',
      sessionId: 'session-browser-project-state-continuity-behavior-derived-reopen-1',
      origin: 'user-turn',
      assistantText: '这一轮已经把 continuity behavior 本身带进 browser-local 回放了。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '这一轮已经把 continuity behavior 本身带进 browser-local 回放了。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Browser-local replay already keeps the return-side callback continuity available.',
          primaryOpenLoop: 'Browser-local continuity snapshots still need to keep the reopened callback on the same living line before widening outward.',
          nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
          continuityRestraint: 'repair-before-closeness',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'repair-before-closeness',
          continuitySummary: 'same-her=Same Phase 1 digital life. Browser-local replay should keep the same callback line instead of reopening from a generic shell. | landed=Browser-local replay already keeps the return-side callback continuity available. | open=Browser-local continuity snapshots still need to keep the reopened callback on the same living line before widening outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Browser-local replay should keep the same callback line instead of reopening from a generic shell.',
          sameHerHoldDetail: null,
          continuityCue: null,
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect(snapshot?.preDialogueAwareness?.awarenessLine).toBe(derivedHoldDetail)
    expect(snapshot?.preDialogueAwareness?.companionBriefingLine).toBe(derivedHoldDetail)
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      derivedHoldDetail,
      derivedContinuityCue,
    ]))
  })

  it('prefers richer host-visible project awareness over a narrower embodiment headline when browser continuity snapshots rebuild pre-dialogue awareness', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-richer-awareness-over-embodiment-headline-1',
      sessionId: 'session-browser-project-state-richer-awareness-over-embodiment-headline-1',
      origin: 'user-turn',
      assistantText: '这一轮已经带着更完整的 Phase 1 awareness，但具身 headline 仍然更窄。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '这一轮已经带着更完整的 Phase 1 awareness，但具身 headline 仍然更窄。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Generic landed progress that should not override the richer host-visible awareness.',
          primaryOpenLoop: 'Generic open loop that should not override the richer host-visible awareness.',
          nextClosureTarget: 'Generic next target that should not override the richer host-visible awareness.',
          sameHerSelfLine: 'Generic same-her line that should not override the richer host-visible awareness.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            landedProgressSummary: 'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
            openClosureSummary: 'Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
            preDialogueAwarenessSummary: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face, motion, and voice, so full cross-modal embodiment closure is still unfinished.',
            sameHerDriftRisk: 'If browser-local replay rebuilds this turn as a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
        preDialogueAwareness: {
          status: 'grounded',
          summaryLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
          companionHeadlineLine: 'Same companion line through body, face, and motion. Keep the same living line gentle.',
          companionBriefingLine: 'Same companion line through body, face, and motion. Keep the same living line gentle.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across browser-local replay.',
          awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
          emotionalClosureCue: null,
          reasonPreview: [
            'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
          ],
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect(snapshot?.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
    }))
    expect(snapshot?.latestLandedProgress).toBe('Project-state continuity and awareness-first self-brief already survive across browser-local replay.')
    expect(snapshot?.primaryOpenLoop).toBe('Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.')
    expect(snapshot?.currentPhase).toBe('Phase 1: Local Digital Life')
    expect(snapshot?.preDialogueAwareness?.summaryLine).not.toBe('Same companion line through body, face, and motion. Keep the same living line gentle.')
  })

  it('sanitizes browser-local appended project awareness so drift boundaries survive cold persistence paths', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-sanitize-cold-path-1',
      sessionId: 'session-browser-project-state-sanitize-cold-path-1',
      origin: 'user-turn',
      assistantText: '我会继续沿着这条数字生命主线推进。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '我会继续沿着这条数字生命主线推进。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Browser-local project continuity still survives through appendConversationTurn.',
          primaryOpenLoop: 'Cold persistence paths still need to keep the same-her drift boundary explicit.',
          nextClosureTarget: 'Keep the browser-local persistence path on one same-her project line.',
          continuitySummary: 'same-her=This is still one Phase 1 digital life. landed=Browser-local project continuity still survives through appendConversationTurn. open=Cold persistence paths still need to keep the same-her drift boundary explicit.',
          sameHerDriftRisk: 'If browser-local cold persistence rebuilds this turn as a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Browser-local persistence still needs to keep project awareness explicit before the next outward turn.',
          companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
          companionNextClosureLine: 'Keep the browser-local persistence path on one same-her project line.',
          awarenessLine: 'Browser-local persistence still needs to keep project awareness explicit before the next outward turn.',
          reasonPreview: [
            'Browser-local project continuity still survives through appendConversationTurn.',
            'If browser-local cold persistence rebuilds this turn as a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
          ],
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect(snapshot).toEqual(expect.objectContaining({
      sameHerDriftRisk: 'If browser-local cold persistence rebuilds this turn as a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
      preDialogueAwareness: expect.objectContaining({
        reasonPreview: expect.arrayContaining([
          'Browser-local project continuity still survives through appendConversationTurn.',
          'If browser-local cold persistence rebuilds this turn as a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
        ]),
      }),
    }))
  })

  it('normalizes bare browser-local appended projectState payloads before cold-path continuity recovery', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-project-state-bare-shape-cold-path-1',
      sessionId: 'session-browser-project-state-bare-shape-cold-path-1',
      origin: 'user-turn',
      assistantText: '我会继续沿着这条数字生命主线推进。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '我会继续沿着这条数字生命主线推进。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Bare-shape browser-local project continuity still survives through appendConversationTurn.',
          primaryOpenLoop: 'Bare-shape cold persistence still needs to keep the same-her drift boundary explicit.',
          nextClosureTarget: 'Keep the browser-local bare-shape path on one same-her project line.',
          continuitySummary: 'same-her=This is still one Phase 1 digital life. landed=Bare-shape browser-local project continuity still survives through appendConversationTurn. open=Bare-shape cold persistence still needs to keep the same-her drift boundary explicit.',
          sameHerDriftRisk: 'If browser-local bare-shape persistence rebuilds this turn as a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect(snapshot).toEqual(expect.objectContaining({
      latestLandedProgress: 'Bare-shape browser-local project continuity still survives through appendConversationTurn.',
      primaryOpenLoop: 'Bare-shape cold persistence still needs to keep the same-her drift boundary explicit.',
      sameHerDriftRisk: 'If browser-local bare-shape persistence rebuilds this turn as a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
    }))
  })

  it('preserves body-face-motion same-her awareness and remaining-open lipsync voice carry inside browser-local continuity snapshots', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-body-face-motion-awareness-1',
      sessionId: 'session-browser-body-face-motion-awareness-1',
      origin: 'user-turn',
      assistantText: '身体、表情、动作已经重新并到同一段里，但具身闭环还没有完全收住。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '身体、表情、动作已经重新并到同一段里，但具身闭环还没有完全收住。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Browser-local replay already preserves body, face, and motion recovery on one living segment.',
          primaryOpenLoop: 'Lipsync and voice still need to rejoin the already-reformed body, face, and motion line.',
          nextClosureTarget: 'Let lipsync and voice rejoin the already-reformed body, face, and motion line on browser-local replay too.',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
          companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
          companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
          companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
          awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
          emotionalClosureCue: null,
          reasonPreview: [
            'same-segment face+motion+body recovery@segment-browser-body-face-motion-1',
            'remaining-open=lipsync+voice',
          ],
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect(snapshot).toEqual(expect.objectContaining({
      latestLandedProgress: 'Browser-local replay already preserves body, face, and motion recovery on one living segment.',
      primaryOpenLoop: 'Lipsync and voice still need to rejoin the already-reformed body, face, and motion line.',
      nextClosureTarget: 'Let lipsync and voice rejoin the already-reformed body, face, and motion line on browser-local replay too.',
      preDialogueAwareness: expect.objectContaining({
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        reasonPreview: expect.arrayContaining([
          'same-segment face+motion+body recovery@segment-browser-body-face-motion-1',
          'remaining-open=lipsync+voice',
        ]),
      }),
    }))
  })

  it('keeps same-her inward low-pressure closure visible when browser-local continuity snapshots only carry the thinner same-phase briefing plus stronger embodiment headline', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-inward-low-pressure-awareness-1',
      sessionId: 'session-browser-inward-low-pressure-awareness-1',
      origin: 'user-turn',
      assistantText: '这条线现在还要继续 inward 一点，不要重新放大。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '这条线现在还要继续 inward 一点，不要重新放大。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Browser-local replay already preserves body, face, and motion recovery on one living segment.',
          primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal closure settles, and browser-local replay should keep that line inward and low-pressure.',
          nextClosureTarget: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line on browser-local replay too.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
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
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect(snapshot).toEqual(expect.objectContaining({
      latestLandedProgress: 'Browser-local replay already preserves body, face, and motion recovery on one living segment.',
      primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal closure settles, and browser-local replay should keep that line inward and low-pressure.',
      nextClosureTarget: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line on browser-local replay too.',
      preDialogueAwareness: expect.objectContaining({
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
        emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
        reasonPreview: expect.arrayContaining([
          'same-her-inward-carry',
          'quiet-companionship',
          'remaining-open=lipsync+voice',
        ]),
      }),
    }))
  })

  it('prefers a richer same-her headline over a thinner stored awareness line when rebuilding browser-local pre-dialogue awareness', async () => {
    disposeBridge = installBrowserAlicizationBridge({ runtime: 'web' })
    const bridge = getAlicizationBridge()

    await bridge.appendConversationTurn?.({
      turnId: 'turn-browser-awareness-headline-precedence-1',
      sessionId: 'session-browser-awareness-headline-precedence-1',
      origin: 'user-turn',
      assistantText: '这条线还不能被变薄成泛化项目提醒。',
      structured: {
        format: 'mind-turn-v1',
        emotion: 'thinking',
        reply: '这条线还不能被变薄成泛化项目提醒。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Browser-local replay already keeps stronger same-her project continuity available.',
          primaryOpenLoop: 'Pre-dialogue awareness rebuilding still needs to keep the richer same-her line explicit.',
          nextClosureTarget: 'Keep richer same-her awareness visible before the next browser-local turn opens outward.',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the next visible reply.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
            landedProgressSummary: 'Browser-local replay already keeps stronger same-her project continuity available.',
            openClosureSummary: 'Pre-dialogue awareness rebuilding still needs to keep the richer same-her line explicit.',
            continuitySummary: 'same-her=Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles. | landed=Browser-local replay already keeps stronger same-her project continuity available. | open=Pre-dialogue awareness rebuilding still needs to keep the richer same-her line explicit.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'generic awareness summary that should not outrank the richer same-her headline.',
          companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
          companionBriefingLine: 'Before speaking, remember this is still one digital life project.',
          companionNextClosureLine: 'Keep richer same-her awareness visible before the next browser-local turn opens outward.',
          awarenessLine: 'generic awareness reminder that should not outrank the richer same-her headline.',
          emotionalClosureCue: null,
          reasonPreview: [
            'generic awareness reminder that should not outrank the richer same-her headline.',
          ],
        },
      },
      createdAt: Date.now(),
    } as any)

    const snapshot = await bridge.getProjectStateContinuitySnapshot?.()

    expect(snapshot?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      summaryLine: 'same-her=Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles. | landed=Browser-local replay already keeps stronger same-her project continuity available. | open=Pre-dialogue awareness rebuilding still needs to keep the richer same-her line explicit.',
    }))
    expect(snapshot?.preDialogueAwareness?.awarenessLine).not.toBe('generic awareness reminder that should not outrank the richer same-her headline.')
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
