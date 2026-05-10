import type { AlicizationDigitalLifeSpineDigest } from './alicization-bridge'

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'
import { installBrowserAlicizationBridge } from './alicization-browser-bridge'

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

  it('rebuilds persisted visual presence from digital life spine stream meta', async () => {
    const seededState = createVisualPresenceState(Date.now() - 2_000)
    storageMap.set(buildVisualPresenceStorageKey('default'), seededState)
    const digest = createDigitalLifeSpineDigest()

    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([
      {
        type: 'meta',
        governance: { decisionTraceId: 'trace-1' },
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
})
