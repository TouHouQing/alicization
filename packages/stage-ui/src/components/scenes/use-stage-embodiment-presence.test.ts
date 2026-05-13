import type {
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationPresencePulsePayload,
  AlicizationResidentPerformanceSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'

import { describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

import { Emotion } from '../../constants/emotions'
import { buildAlicizationEmbodimentScript } from '../../services/embodiment/director'
import { useStageEmbodimentPresence } from './use-stage-embodiment-presence'

function createPerformance(overrides?: Partial<AlicizationDialoguePerformancePayload>): AlicizationDialoguePerformancePayload {
  return {
    baseEmotion: 'neutral',
    emotion: 'neutral',
    facialCue: null,
    actionCue: null,
    delivery: 'calm',
    emphasis: 0,
    ...overrides,
  }
}

function createDialoguePayload(overrides?: Partial<AlicizationDialogueRespondedPayload>): AlicizationDialogueRespondedPayload {
  return {
    cardId: 'default',
    turnId: 'turn-1',
    sessionId: 'session-1',
    origin: 'user-turn',
    isFallback: false,
    createdAt: Date.now(),
    structured: {
      thought: 'focus',
      reply: 'reply',
      emotion: 'neutral',
      performance: createPerformance(),
      format: 'mind-turn-v1',
    },
    ...overrides,
  }
}

function createPresencePulse(overrides?: Partial<AlicizationPresencePulsePayload>): AlicizationPresencePulsePayload {
  return {
    watchMode: 'symbiotic-vision',
    scenario: 'coding',
    embodiedPresence: 'attentive',
    stance: 'observe',
    reasonTags: ['test'],
    emotionalTension: 'focused-flow',
    confidence: 0.8,
    expiresAt: Date.now() + 1_000,
    ...overrides,
  }
}

function createManifest(overrides?: Partial<CharacterPerformanceCapabilitiesManifest>): CharacterPerformanceCapabilitiesManifest {
  return {
    renderer: 'live2d',
    supportedBaseEmotions: ['neutral', 'happy', 'thinking'],
    supportedFacialCues: [],
    supportedActions: [],
    supportsLookAt: true,
    supportsVisemeLipSync: true,
    supportsMicroDynamics: true,
    ...overrides,
  }
}

function createSilentResidentPerformance(mode: 'accompanying' | 'recovering') {
  const recovering = mode === 'recovering'
  return {
    version: 'resident-performance-v1' as const,
    source: 'main-runtime' as const,
    performance: createPerformance({
      baseEmotion: recovering ? 'concerned' : 'thinking',
      emotion: recovering ? 'concerned' : 'thinking',
      facialCue: recovering ? 'soft-gaze' : 'focus',
      actionCue: recovering ? 'comfort_sway' : 'observe_focus',
      delivery: 'gentle',
      emphasis: recovering ? 1 : 2,
    }),
    embodiedPresence: recovering ? 'concerned' as const : 'attentive' as const,
    stance: recovering ? 'care' as const : 'accompany' as const,
    emotionalTension: recovering ? 'late-night-drain' as const : 'soft-covision' as const,
    confidence: 0.86,
    reasonTags: [recovering ? 'recovery' : 'companionship'],
    signature: recovering
      ? 'resident|main-runtime|recovering|protective-watch'
      : 'resident|main-runtime|accompanying|quiet-accompaniment',
    updatedAt: Date.now(),
  } satisfies import('../../stores/alicization-bridge').AlicizationResidentPerformanceSnapshot
}

function createDispatcherHarness() {
  const controllers: any[] = []
  const scriptBuilderDisposers: Array<() => void> = []
  const scriptBuilderRegistrations: Array<{ id: symbol, builder: (payload: AlicizationDialogueRespondedPayload) => unknown }> = []
  return {
    dispatcher: {
      registerEmbodimentController(controller: any) {
        controllers.push(controller)
        return () => {
          const index = controllers.indexOf(controller)
          if (index >= 0)
            controllers.splice(index, 1)
        }
      },
      setEmbodimentScriptBuilder(builder: (payload: AlicizationDialogueRespondedPayload) => unknown) {
        const registration = {
          id: Symbol('test-script-builder'),
          builder,
        }
        scriptBuilderRegistrations.push(registration)
        const dispose = () => {
          const index = scriptBuilderRegistrations.findIndex(item => item.id === registration.id)
          if (index >= 0)
            scriptBuilderRegistrations.splice(index, 1)
        }
        scriptBuilderDisposers.push(dispose)
        return dispose
      },
    },
    getController(channel: string) {
      return controllers.find(controller => controller.channel === channel)
    },
    buildEmbodimentScript(payload: AlicizationDialogueRespondedPayload) {
      return scriptBuilderRegistrations.at(-1)?.builder(payload) ?? null
    },
    disposeLatestScriptBuilder() {
      scriptBuilderDisposers.pop()?.()
    },
  }
}

describe('stage embodiment presence', () => {
  it('applies mapped action cue and keeps emotion layer without overriding motion', async () => {
    const harness = createDispatcherHarness()
    const enqueueEmotion = vi.fn()
    const applyEmotionSpeechStyle = vi.fn()
    const applyRuntimeEmbodimentEnvelope = vi.fn()
    const armPerformance = vi.fn()
    const currentMotion = ref({ group: 'Idle' as string, index: 0 as number | undefined })

    const runtime = useStageEmbodimentPresence({
      applyRuntimeEmbodimentEnvelope,
      armPerformance,
      currentMotion,
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => [
        {
          actionKey: 'raise_hand_excited',
          motionName: 'Tap',
          motionIndex: 1,
        },
      ]),
      normalizePresenceEmotionName: rawEmotion => rawEmotion === 'happy' ? Emotion.Happy : Emotion.Neutral,
      applyEmotionSpeechStyle,
      clampPerformance: performance => performance,
      enqueueEmotion,
      performanceManifest: computed(() => createManifest({
        supportedActions: [
          { key: 'raise_hand_excited', label: '举手', description: 'excited raise hand', source: 'live2d-motion' },
        ],
      })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (emphasis, fallback) => emphasis === 2 ? 1 : fallback,
      speakFallback: vi.fn(),
      stageModelRenderer: ref('live2d'),
    })

    const live2dController = harness.getController('live2d')
    expect(live2dController).toBeTruthy()

    await live2dController?.applyPerformance(
      createPerformance({
        baseEmotion: 'happy',
        emotion: 'happy',
        actionCue: 'raise_hand_excited',
        delivery: 'energetic',
        emphasis: 2,
      }),
      createDialoguePayload({
        structured: {
          thought: 'energetic',
          reply: '好耶！',
          emotion: 'happy',
          embodiment: {
            emotion: 'happy',
            performance: createPerformance({
              baseEmotion: 'happy',
              emotion: 'happy',
              delivery: 'energetic',
              emphasis: 2,
              actionCue: 'raise_hand_excited',
              facialCue: 'smile',
            }),
            postureHint: 'attentive',
            speechStyle: {
              pitchDelta: 12,
              rateMultiplier: 1.12,
            },
            variationToken: 'runtime-variation-1',
          },
          performance: createPerformance({
            baseEmotion: 'happy',
            emotion: 'happy',
            delivery: 'energetic',
            emphasis: 2,
            actionCue: 'raise_hand_excited',
            facialCue: null,
          }),
          format: 'mind-turn-v1',
        },
      }),
    )

    expect(currentMotion.value).toEqual({ group: 'Tap', index: 1 })
    expect(applyEmotionSpeechStyle).toBeCalledWith(Emotion.Happy, {
      pitchDelta: 12,
      rateMultiplier: 1.12,
    })
    expect(applyRuntimeEmbodimentEnvelope).toBeCalledWith(expect.objectContaining({
      emotion: 'happy',
    }))
    expect(armPerformance).toBeCalledWith(expect.objectContaining({
      actionCue: 'raise_hand_excited',
      baseEmotion: 'happy',
    }), expect.objectContaining({
      source: 'dialogue',
      variationToken: 'runtime-variation-1',
    }))
    expect(enqueueEmotion).not.toBeCalled()

    runtime.dispose()
  })

  it('keeps presence pulse emotion motion enabled when no mapped action cue exists', async () => {
    const harness = createDispatcherHarness()
    const enqueueEmotion = vi.fn()
    const armPerformance = vi.fn()
    const currentMotion = ref({ group: 'Idle' as string, index: 0 as number | undefined })

    const runtime = useStageEmbodimentPresence({
      armPerformance,
      currentMotion,
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Think,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion,
      performanceManifest: computed(() => createManifest()),
      resolveClampedPresencePulsePerformance: () => createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        delivery: 'hesitant',
        emphasis: 1,
      }),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: vi.fn(),
      stageModelRenderer: ref('live2d'),
    })

    const live2dController = harness.getController('live2d')
    expect(live2dController).toBeTruthy()

    await live2dController?.applyPresencePulse(
      createPresencePulse({
        embodiedPresence: 'attentive',
      }),
    )

    expect(currentMotion.value).toEqual({ group: 'Idle', index: 0 })
    expect(armPerformance).toBeCalledWith(expect.objectContaining({
      baseEmotion: 'thinking',
    }), expect.objectContaining({
      source: 'presence-pulse',
    }))
    expect(enqueueEmotion).not.toBeCalled()

    runtime.dispose()
  })

  it('reuses the same planned performance across vrm and tts controllers for one dialogue turn', async () => {
    const harness = createDispatcherHarness()
    const speakFallback = vi.fn()
    const armPerformance = vi.fn()

    const runtime = useStageEmbodimentPresence({
      armPerformance,
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Neutral,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest({
        renderer: 'vrm',
        supportedActions: [
          { key: 'idle_settle', label: '待机', description: 'idle settle', source: 'builtin' },
          { key: 'idle_gentle_nod', label: '点头', description: 'gentle nod', source: 'builtin' },
        ],
      })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback,
      stageModelRenderer: ref('vrm'),
    })

    const payload = createDialoguePayload({
      structured: {
        thought: 'steady',
        reply: '我在这里。',
        emotion: 'neutral',
        embodiment: {
          emotion: 'neutral',
          performance: createPerformance({
            baseEmotion: 'neutral',
            emotion: 'neutral',
            actionCue: 'idle_settle',
            delivery: 'calm',
            emphasis: 0,
            facialCue: 'relaxed',
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 2,
            rateMultiplier: 0.98,
          },
          variationToken: 'runtime-dialogue-turn-1',
        },
        performance: createPerformance({
          baseEmotion: 'neutral',
          emotion: 'neutral',
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
          facialCue: null,
        }),
        format: 'mind-turn-v1',
      },
    })

    const vrmController = harness.getController('vrm')
    const ttsController = harness.getController('tts')

    await vrmController?.applyPerformance(payload.structured.performance, payload)
    await ttsController?.speak(payload.structured.reply, payload.structured.performance, payload)

    const firstArmedPerformance = armPerformance.mock.calls[0]?.[0]
    const secondArmedPerformance = armPerformance.mock.calls[1]?.[0]

    expect(firstArmedPerformance).toEqual(secondArmedPerformance)
    expect(firstArmedPerformance?.actionCue).toBeTruthy()
    expect(armPerformance.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      variationToken: 'runtime-dialogue-turn-1',
    }))
    expect(armPerformance.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      variationToken: 'runtime-dialogue-turn-1',
    }))
    expect(speakFallback).toBeCalledWith(payload.structured.reply, expect.objectContaining({
      actionCue: firstArmedPerformance?.actionCue,
    }), null)

    runtime.dispose()
  })

  it('passes embodimentScript metadata through the live2d speech fallback path when a script is present', async () => {
    const harness = createDispatcherHarness()
    const speakFallback = vi.fn()

    const runtime = useStageEmbodimentPresence({
      armPerformance: vi.fn(),
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Neutral,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest()),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback,
      stageModelRenderer: ref('live2d'),
    })

    const payload = createDialoguePayload({
      turnId: 'turn-live2d-script',
      structured: {
        thought: 'focus',
        reply: '我在这里。',
        emotion: 'neutral',
        performance: createPerformance(),
        format: 'mind-turn-v1',
      },
    })

    payload.structured.embodimentScript = harness.buildEmbodimentScript(payload) as any

    const ttsController = harness.getController('tts')
    await ttsController?.speak(payload.structured.reply, payload.structured.performance, payload)

    expect(speakFallback).toBeCalledWith(payload.structured.reply, expect.any(Object), expect.objectContaining({
      embodimentScript: expect.objectContaining({
        turnId: 'turn-live2d-script',
      }),
    }))

    runtime.dispose()
  })

  it('falls back to resident visual presence performance when dialogue performance is sparse', async () => {
    const harness = createDispatcherHarness()
    const armPerformance = vi.fn()

    const runtime = useStageEmbodimentPresence({
      armPerformance,
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Think,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest({
        supportedActions: [
          { key: 'observe_focus', label: 'Observe', description: 'Observe focus', source: 'builtin' },
        ],
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'Focus face', source: 'preset', affectsMouth: false },
        ],
      })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: vi.fn(),
      stageModelRenderer: ref('vrm'),
      visualPresenceState: ref({
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'firm',
            emphasis: 2,
          },
          embodiedPresence: 'attentive',
          stance: 'observe',
          emotionalTension: 'focused-flow',
          confidence: 0.86,
          reasonTags: ['resident-performance'],
          signature: 'resident|main-runtime|attentive|observe|focused-flow|coding|diff|coding|ambient|thinking|firm|2',
          updatedAt: Date.now(),
        },
      } as any),
    })

    const vrmController = harness.getController('vrm')
    expect(vrmController).toBeTruthy()

    await vrmController?.applyPerformance(
      createPerformance({
        baseEmotion: 'neutral',
        emotion: 'neutral',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      }),
      createDialoguePayload({
        turnId: 'turn-resident-fallback',
        structured: {
          thought: 'sparse',
          reply: '继续。',
          emotion: 'neutral',
          performance: createPerformance({
            baseEmotion: 'neutral',
            emotion: 'neutral',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          }),
          format: 'mind-turn-v1',
        },
      }),
    )

    expect(armPerformance).toBeCalledWith(expect.objectContaining({
      baseEmotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'observe_focus',
      delivery: 'firm',
      emphasis: 2,
    }), expect.objectContaining({
      source: 'dialogue',
    }))

    runtime.dispose()
  })

  it('keeps dialogue planning companionship- or recovery-biased from silent resident authority without forcing speech', async () => {
    const cases = [
      {
        mode: 'accompanying' as const,
        visualPresenceState: {
          watchMode: 'symbiotic-vision',
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          residentPerformance: createSilentResidentPerformance('accompanying'),
        },
        expected: {
          baseEmotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
      },
      {
        mode: 'recovering' as const,
        visualPresenceState: {
          watchMode: 'recovering',
          currentBodyState: 'recovering',
          continuityMode: 'protective-watch',
          residentPerformance: createSilentResidentPerformance('recovering'),
        },
        expected: {
          baseEmotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'comfort_sway',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
    ]

    for (const testCase of cases) {
      const harness = createDispatcherHarness()
      const armPerformance = vi.fn()
      const speakFallback = vi.fn()

      const runtime = useStageEmbodimentPresence({
        armPerformance,
        currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
        dispatcher: harness.dispatcher as any,
        live2dActionCapabilities: computed(() => []),
        normalizePresenceEmotionName: () => Emotion.Neutral,
        applyEmotionSpeechStyle: vi.fn(),
        clampPerformance: performance => performance,
        enqueueEmotion: vi.fn(),
        performanceManifest: computed(() => createManifest({
          renderer: 'vrm',
          supportedActions: [
            { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'builtin' },
            { key: 'comfort_sway', label: 'Comfort', description: 'comfort sway', source: 'builtin' },
          ],
          supportedFacialCues: [
            { key: 'focus', label: 'Focus', description: 'focus face', source: 'preset', affectsMouth: false },
            { key: 'soft-gaze', label: 'Soft gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
          ],
        })),
        resolveClampedPresencePulsePerformance: () => createPerformance(),
        resolvePresenceIntensity: (_emphasis, fallback) => fallback,
        speakFallback,
        stageModelRenderer: ref('vrm'),
        visualPresenceState: ref(testCase.visualPresenceState as any),
      })

      const vrmController = harness.getController('vrm')
      expect(vrmController).toBeTruthy()

      await vrmController?.applyPerformance(
        createPerformance({
          baseEmotion: 'neutral',
          emotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        }),
        createDialoguePayload({
          turnId: `turn-silent-${testCase.mode}`,
          structured: {
            thought: `silent-${testCase.mode}`,
            reply: '',
            emotion: 'neutral',
            performance: createPerformance({
              baseEmotion: 'neutral',
              emotion: 'neutral',
              facialCue: null,
              actionCue: null,
              delivery: 'calm',
              emphasis: 0,
            }),
            format: 'mind-turn-v1',
          },
        }),
      )

      expect(armPerformance).toBeCalledWith(expect.objectContaining(testCase.expected), expect.objectContaining({
        source: 'dialogue',
      }))
      expect(speakFallback).not.toBeCalled()
      runtime.dispose()
    }
  })

  it('registers a director-backed script builder that reflects renderer context and resident state', () => {
    const harness = createDispatcherHarness()
    const performanceManifest = createManifest({
      renderer: 'live2d',
      supportsVisemeLipSync: false,
    })
    const residentPerformance: AlicizationResidentPerformanceSnapshot = {
      version: 'resident-performance-v1',
      source: 'browser-fallback',
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        delivery: 'gentle',
        emphasis: 1,
      }),
      embodiedPresence: 'attentive',
      stance: 'observe',
      emotionalTension: 'focused-flow',
      confidence: 0.8,
      reasonTags: ['resident-performance'],
      signature: 'resident-1',
      updatedAt: Date.now(),
    }

    const runtime = useStageEmbodimentPresence({
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Neutral,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => performanceManifest),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: vi.fn(),
      stageModelRenderer: ref('live2d'),
      visualPresenceState: ref({
        residentPerformance,
      } as any),
    })

    const payload = createDialoguePayload({
      turnId: 'turn-builder-1',
      structured: {
        thought: 'focus',
        reply: '我在这里',
        emotion: 'thinking',
        performance: createPerformance({
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 1,
        }),
        embodiment: {
          emotion: 'thinking',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'idle_settle',
            delivery: 'gentle',
            emphasis: 1,
          }),
          postureHint: 'attentive',
          speechStyle: null,
          variationToken: 'variation-1',
        } as any,
        speechTimeline: {
          version: 'speech-timeline-v1',
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '我在这里',
            actionWindow: 'settle',
            beatWeight: 0.6,
          }],
        } as any,
        digitalLife: {
          version: 'digital-life-v1',
          mode: 'steady',
          frames: [],
          continuity: {
            active: true,
            rhythm: 'steady',
          },
        } as any,
        digitalLifeSpine: null,
        format: 'mind-turn-v1',
      },
    })

    expect(harness.buildEmbodimentScript(payload)).toEqual(buildAlicizationEmbodimentScript({
      seed: {
        decisionTraceId: null,
        turnId: payload.turnId,
        replyText: payload.structured.reply,
        performance: payload.structured.performance,
        embodiment: payload.structured.embodiment ?? null,
        speechTimeline: payload.structured.speechTimeline ?? null,
        digitalLife: payload.structured.digitalLife ?? null,
        digitalLifeSpine: payload.structured.digitalLifeSpine ?? null,
      },
      manifest: performanceManifest,
      residentPerformance,
      rendererTarget: 'live2d',
    }))

    runtime.dispose()
  })

  it('restores the previous script builder when multiple presence instances share one dispatcher', () => {
    const harness = createDispatcherHarness()
    const firstRuntime = useStageEmbodimentPresence({
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Neutral,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest()),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: vi.fn(),
      stageModelRenderer: ref('live2d'),
    })
    const secondRuntime = useStageEmbodimentPresence({
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Neutral,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest({
        supportsVisemeLipSync: false,
      })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: vi.fn(),
      stageModelRenderer: ref('live2d'),
    })

    const payload = createDialoguePayload()

    expect(harness.buildEmbodimentScript(payload)).toMatchObject({
      lipsyncPlan: {
        mode: 'energy-only',
      },
    })

    secondRuntime.dispose()

    expect(harness.buildEmbodimentScript(payload)).toMatchObject({
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
      },
    })

    firstRuntime.dispose()
    expect(harness.buildEmbodimentScript(payload)).toBeNull()
  })
})
