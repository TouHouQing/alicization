import type {
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationPresencePulsePayload,
  AlicizationResidentPerformanceSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'

import { normalizeAlicizationDialogueSpeechTimeline } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

import { Emotion } from '../../constants/emotions'
import { buildAlicizationEmbodimentScript } from '../../services/embodiment/director'
import { useStageEmbodimentPresence } from './use-stage-embodiment-presence'
import { resolveStagePresencePulsePerformance } from './stage-presence-pulse-performance'

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
        actionCue: recovering ? 'comfort_sway' : 'steady_focus',
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

  it('keeps silent body authority in the presence-pulse performance variation token', async () => {
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
      performanceManifest: computed(() => createManifest()),
      resolveClampedPresencePulsePerformance: () => createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        delivery: 'gentle',
        emphasis: 1,
      }),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: vi.fn(),
      stageModelRenderer: ref('live2d'),
    })

    const live2dController = harness.getController('live2d')
    expect(live2dController).toBeTruthy()

    await live2dController?.applyPresencePulse(createPresencePulse({
      embodiedPresence: 'attentive',
      watchMode: 'symbiotic-vision',
      scenario: 'coding',
      stance: 'accompany',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      currentInwardPreoccupation: 'stay nearby without interrupting',
      quietLineMs: 240_000,
    } as any))

    expect(armPerformance).toBeCalledWith(expect.anything(), expect.objectContaining({
      source: 'presence-pulse',
      variationToken: expect.stringContaining('symbiotic-vision|coding|attentive'),
    }))

    runtime.dispose()
  })

  it('turns quiet accompaniment presence pulses into a soft nearby-attention performance cue set', async () => {
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
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focused idle', source: 'builtin' },
        ],
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focus face', source: 'preset', affectsMouth: false },
        ],
      })),
      resolveClampedPresencePulsePerformance: payload => resolveStagePresencePulsePerformance(payload),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: vi.fn(),
      stageModelRenderer: ref('live2d'),
    })

    const live2dController = harness.getController('live2d')
    expect(live2dController).toBeTruthy()

    await live2dController?.applyPresencePulse(createPresencePulse({
      embodiedPresence: 'attentive',
      watchMode: 'symbiotic-vision',
      scenario: 'coding',
      stance: 'accompany',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      currentInwardPreoccupation: 'stay nearby without interrupting',
      quietLineMs: 240_000,
    } as any))

    expect(armPerformance).toBeCalledWith(expect.objectContaining({
      baseEmotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }), expect.objectContaining({
      source: 'presence-pulse',
    }))

    runtime.dispose()
  })

  it('turns protective-watch presence pulses into low-pressure recovery performance cues', async () => {
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
          { key: 'comfort_sway', label: 'Comfort Sway', description: 'gentle comfort sway', source: 'builtin' },
        ],
        supportedFacialCues: [
          { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        ],
      })),
      resolveClampedPresencePulsePerformance: payload => resolveStagePresencePulsePerformance(payload),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: vi.fn(),
      stageModelRenderer: ref('live2d'),
    })

    const live2dController = harness.getController('live2d')
    expect(live2dController).toBeTruthy()

    await live2dController?.applyPresencePulse(createPresencePulse({
      embodiedPresence: 'concerned',
      watchMode: 'recovering',
      scenario: 'late-night-care',
      stance: 'care',
      currentBodyState: 'recovering',
      continuityMode: 'protective-watch',
      currentInwardPreoccupation: 'hold low-pressure care',
      quietLineMs: 180_000,
      emotionalTension: 'late-night-drain',
    } as any))

    expect(armPerformance).toBeCalledWith(expect.objectContaining({
      baseEmotion: 'tired',
      facialCue: 'soft-gaze',
      actionCue: 'comfort_sway',
      delivery: 'gentle',
      emphasis: 1,
    }), expect.objectContaining({
      source: 'presence-pulse',
    }))

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
    }), expect.objectContaining({
      embodimentScript: expect.objectContaining({
        rendererTarget: 'vrm',
        replyText: payload.structured.reply,
        turnId: payload.turnId,
      }),
    }))

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

  it('passes live2d fallback embodimentScript metadata through the tts speech fallback path', async () => {
    const harness = createDispatcherHarness()
    const speakFallback = vi.fn()

    const runtime = useStageEmbodimentPresence({
      armPerformance: vi.fn(),
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Think,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest({
        renderer: 'live2d',
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'builtin' },
        ],
      })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback,
      stageModelRenderer: ref('live2d'),
    })

    const payload = createDialoguePayload({
      turnId: 'turn-live2d-tts-fallback-script',
      structured: {
        thought: 'focus',
        reply: '我先继续盯着这个问题。',
        emotion: 'thinking',
        embodiment: {
          emotion: 'thinking',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'inspect_follow',
            delivery: 'calm',
            emphasis: 1,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 2,
            rateMultiplier: 0.98,
          },
          variationToken: 'live2d-tts-fallback-script-1',
        },
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'live2d-tts-fallback-script-1',
          reply: '我先继续盯着这个问题。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '我先继续盯着这个问题。',
            emotion: 'thinking',
            gestureWeight: 0.5,
            facialWeight: 0.6,
            prosodyWeight: 0.64,
            beatWeight: 0.42,
            emotionHoldMs: 420,
            settleMode: 'linger',
            rendererSettle: {
              live2dFacialReleaseMs: 320,
              live2dMotionFollowThroughMs: 420,
            },
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            actionCue: 'inspect_follow',
            facialCue: 'focused',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          }],
        })!,
        performance: createPerformance({
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 1,
        }),
        format: 'mind-turn-v1',
      },
    })

    const ttsController = harness.getController('tts')
    expect(ttsController).toBeTruthy()

    const builtScript = harness.buildEmbodimentScript(payload) as any
    expect(builtScript?.speechPlan?.segments?.[0]).toEqual(expect.objectContaining({
      rendererHints: expect.objectContaining({
        preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
        preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
      }),
      rendererSettle: expect.objectContaining({
        live2dFacialReleaseMs: expect.any(Number),
        live2dMotionFollowThroughMs: expect.any(Number),
      }),
    }))

    await ttsController?.speak(payload.structured.reply, payload.structured.performance, payload)

    expect(speakFallback).toBeCalledWith(payload.structured.reply, expect.any(Object), expect.objectContaining({
      embodimentScript: expect.objectContaining({
        version: 'embodiment-script-v1',
        turnId: 'turn-live2d-tts-fallback-script',
        rendererTarget: 'live2d',
        speechPlan: expect.objectContaining({
          segments: [
            expect.objectContaining({
              rendererHints: expect.objectContaining({
                preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
                preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
              }),
              rendererSettle: expect.objectContaining({
                live2dFacialReleaseMs: expect.any(Number),
                live2dMotionFollowThroughMs: expect.any(Number),
              }),
            }),
          ],
        }),
      }),
    }))

    runtime.dispose()
  })

  it('builds a vrm-targeted embodimentScript fallback when vrm is active and runtime payload omits the script', async () => {
    const harness = createDispatcherHarness()

    const runtime = useStageEmbodimentPresence({
      armPerformance: vi.fn(),
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Neutral,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' },
        ],
      })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: vi.fn(),
      stageModelRenderer: ref('vrm'),
    })

    const payload = createDialoguePayload({
      turnId: 'turn-vrm-fallback-script',
      structured: {
        thought: 'focus',
        reply: '我先继续盯着这个问题。',
        emotion: 'thinking',
        embodiment: {
          emotion: 'thinking',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'inspect_follow',
            delivery: 'calm',
            emphasis: 1,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 2,
            rateMultiplier: 0.98,
          },
          variationToken: 'vrm-fallback-script-1',
        },
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'vrm-fallback-script-1',
          reply: '我先继续盯着这个问题。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '我先继续盯着这个问题。',
            emotion: 'thinking',
            gestureWeight: 0.5,
            facialWeight: 0.6,
            prosodyWeight: 0.64,
            beatWeight: 0.42,
            emotionHoldMs: 420,
            settleMode: 'linger',
            rendererSettle: {
              vrmExpressionBlendMs: 260,
              vrmActionFadeMs: 220,
            },
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            actionCue: 'inspect_follow',
            facialCue: 'focused',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          }],
        })!,
        digitalLife: {
          version: 'digital-life-v1',
          emotion: 'thinking',
          mode: 'speaking',
          voice: {
            energy: 0.58,
            cadence: 0.56,
            pitchDelta: 2,
            rateMultiplier: 0.98,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.62,
            holdMs: 420,
            expressionMode: 'hold',
          },
          action: {
            actionCue: 'inspect_follow',
            intensity: 0.48,
            holdMs: 320,
            actionMode: 'pulse',
          },
          lipSync: {
            mode: 'energy',
            mouthScale: 0.82,
            energyBias: 0.61,
            visemeBias: 0.22,
            continuityHoldMs: 420,
          },
          frames: [],
        } as any,
        performance: createPerformance({
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 1,
        }),
        format: 'mind-turn-v1',
      },
    })

    const built = harness.buildEmbodimentScript(payload) as any
    expect(built).toEqual(expect.objectContaining({
      version: 'embodiment-script-v1',
      rendererTarget: 'vrm',
      turnId: 'turn-vrm-fallback-script',
      motionPlan: expect.objectContaining({
        attentionMode: 'attentive',
      }),
      lipsyncPlan: expect.objectContaining({
        mode: 'energy-phoneme-hybrid',
      }),
    }))

    runtime.dispose()
  })

  it('passes vrm fallback embodimentScript metadata through the tts speech fallback path', async () => {
    const harness = createDispatcherHarness()
    const speakFallback = vi.fn()

    const runtime = useStageEmbodimentPresence({
      armPerformance: vi.fn(),
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Think,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' },
        ],
      })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback,
      stageModelRenderer: ref('vrm'),
    })

    const payload = createDialoguePayload({
      turnId: 'turn-vrm-tts-fallback-script',
      structured: {
        thought: 'focus',
        reply: '我先继续盯着这个问题。',
        emotion: 'thinking',
        embodiment: {
          emotion: 'thinking',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'inspect_follow',
            delivery: 'calm',
            emphasis: 1,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 2,
            rateMultiplier: 0.98,
          },
          variationToken: 'vrm-tts-fallback-script-1',
        },
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'vrm-tts-fallback-script-1',
          reply: '我先继续盯着这个问题。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '我先继续盯着这个问题。',
            emotion: 'thinking',
            gestureWeight: 0.5,
            facialWeight: 0.6,
            prosodyWeight: 0.64,
            beatWeight: 0.42,
            emotionHoldMs: 420,
            settleMode: 'linger',
            rendererSettle: {
              vrmExpressionBlendMs: 260,
              vrmActionFadeMs: 220,
            },
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            actionCue: 'inspect_follow',
            facialCue: 'focused',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          }],
        })!,
        performance: createPerformance({
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 1,
        }),
        format: 'mind-turn-v1',
      },
    })

    const ttsController = harness.getController('tts')
    expect(ttsController).toBeTruthy()

    const builtScript = harness.buildEmbodimentScript(payload) as any
    expect(builtScript?.speechPlan?.segments?.[0]).toEqual(expect.objectContaining({
      rendererHints: expect.objectContaining({
        preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
        preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
      }),
      rendererSettle: expect.objectContaining({
        vrmExpressionBlendMs: expect.any(Number),
        vrmActionFadeMs: expect.any(Number),
      }),
    }))

    await ttsController?.speak(payload.structured.reply, payload.structured.performance, payload)

    expect(speakFallback).toBeCalledWith(payload.structured.reply, expect.any(Object), expect.objectContaining({
      embodimentScript: expect.objectContaining({
        version: 'embodiment-script-v1',
        turnId: 'turn-vrm-tts-fallback-script',
        rendererTarget: 'vrm',
        speechPlan: expect.objectContaining({
          segments: [
            expect.objectContaining({
              rendererHints: expect.objectContaining({
                preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
                preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
              }),
              rendererSettle: expect.objectContaining({
                vrmExpressionBlendMs: expect.any(Number),
                vrmActionFadeMs: expect.any(Number),
              }),
            }),
          ],
        }),
      }),
    }))

    runtime.dispose()
  })

  it('reuses one planned performance and one high-fidelity fallback script across vrm and tts in the same turn', async () => {
    const harness = createDispatcherHarness()
    const speakFallback = vi.fn()
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
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' },
        ],
      })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback,
      stageModelRenderer: ref('vrm'),
    })

    const payload = createDialoguePayload({
      turnId: 'turn-vrm-same-turn-fallback',
      structured: {
        thought: 'focus',
        reply: '我先继续盯着这个问题。',
        emotion: 'thinking',
        embodiment: {
          emotion: 'thinking',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'inspect_follow',
            delivery: 'calm',
            emphasis: 1,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 2,
            rateMultiplier: 0.98,
          },
          variationToken: 'vrm-same-turn-fallback-1',
        },
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'vrm-same-turn-fallback-1',
          reply: '我先继续盯着这个问题。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '我先继续盯着这个问题。',
            emotion: 'thinking',
            gestureWeight: 0.5,
            facialWeight: 0.6,
            prosodyWeight: 0.64,
            beatWeight: 0.42,
            emotionHoldMs: 420,
            settleMode: 'linger',
            rendererSettle: {
              vrmExpressionBlendMs: 260,
              vrmActionFadeMs: 220,
            },
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            actionCue: 'inspect_follow',
            facialCue: 'focused',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          }],
        })!,
        performance: createPerformance({
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 1,
        }),
        format: 'mind-turn-v1',
      },
    })

    const vrmController = harness.getController('vrm')
    const ttsController = harness.getController('tts')
    expect(vrmController).toBeTruthy()
    expect(ttsController).toBeTruthy()

    await vrmController?.applyPerformance(payload.structured.performance, payload)
    await ttsController?.speak(payload.structured.reply, payload.structured.performance, payload)

    const firstArmedPerformance = armPerformance.mock.calls[0]?.[0]
    const secondArmedPerformance = armPerformance.mock.calls[1]?.[0]
    expect(firstArmedPerformance).toEqual(secondArmedPerformance)
    expect(armPerformance.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      variationToken: 'vrm-same-turn-fallback-1',
    }))
    expect(armPerformance.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      variationToken: 'vrm-same-turn-fallback-1',
    }))

    expect(speakFallback).toBeCalledWith(payload.structured.reply, expect.objectContaining({
      actionCue: firstArmedPerformance?.actionCue,
      baseEmotion: firstArmedPerformance?.baseEmotion,
      facialCue: firstArmedPerformance?.facialCue,
    }), expect.objectContaining({
      embodimentScript: expect.objectContaining({
        turnId: 'turn-vrm-same-turn-fallback',
        rendererTarget: 'vrm',
        speechPlan: expect.objectContaining({
          segments: [
            expect.objectContaining({
              rendererHints: expect.objectContaining({
                preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
                preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
              }),
              rendererSettle: expect.objectContaining({
                vrmExpressionBlendMs: expect.any(Number),
                vrmActionFadeMs: expect.any(Number),
              }),
            }),
          ],
        }),
      }),
    }))

    runtime.dispose()
  })

  it('reuses one planned performance and one high-fidelity fallback script across live2d and tts in the same turn', async () => {
    const harness = createDispatcherHarness()
    const speakFallback = vi.fn()
    const armPerformance = vi.fn()
    const currentMotion = ref({ group: 'Idle' as string, index: 0 as number | undefined })

    const runtime = useStageEmbodimentPresence({
      armPerformance,
      currentMotion,
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => [
        {
          actionKey: 'inspect_follow',
          motionName: 'ObserveSoft',
          motionIndex: 2,
        },
      ]),
      normalizePresenceEmotionName: () => Emotion.Think,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest({
        renderer: 'live2d',
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'builtin' },
        ],
      })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback,
      stageModelRenderer: ref('live2d'),
    })

    const payload = createDialoguePayload({
      turnId: 'turn-live2d-same-turn-fallback',
      structured: {
        thought: 'focus',
        reply: '我先继续盯着这个问题。',
        emotion: 'thinking',
        embodiment: {
          emotion: 'thinking',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'inspect_follow',
            delivery: 'calm',
            emphasis: 1,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 2,
            rateMultiplier: 0.98,
          },
          variationToken: 'live2d-same-turn-fallback-1',
        },
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'live2d-same-turn-fallback-1',
          reply: '我先继续盯着这个问题。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '我先继续盯着这个问题。',
            emotion: 'thinking',
            gestureWeight: 0.5,
            facialWeight: 0.6,
            prosodyWeight: 0.64,
            beatWeight: 0.42,
            emotionHoldMs: 420,
            settleMode: 'linger',
            rendererSettle: {
              live2dFacialReleaseMs: 320,
              live2dMotionFollowThroughMs: 420,
            },
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            actionCue: 'inspect_follow',
            facialCue: 'focused',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          }],
        })!,
        performance: createPerformance({
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 1,
        }),
        format: 'mind-turn-v1',
      },
    })

    const live2dController = harness.getController('live2d')
    const ttsController = harness.getController('tts')
    expect(live2dController).toBeTruthy()
    expect(ttsController).toBeTruthy()

    await live2dController?.applyPerformance(payload.structured.performance, payload)
    await ttsController?.speak(payload.structured.reply, payload.structured.performance, payload)

    const firstArmedPerformance = armPerformance.mock.calls[0]?.[0]
    const secondArmedPerformance = armPerformance.mock.calls[1]?.[0]
    expect(firstArmedPerformance).toEqual(secondArmedPerformance)
    expect(armPerformance.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      variationToken: 'live2d-same-turn-fallback-1',
    }))
    expect(armPerformance.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      variationToken: 'live2d-same-turn-fallback-1',
    }))
    expect(currentMotion.value).toEqual({ group: 'ObserveSoft', index: 2 })

    expect(speakFallback).toBeCalledWith(payload.structured.reply, expect.objectContaining({
      actionCue: firstArmedPerformance?.actionCue,
      baseEmotion: firstArmedPerformance?.baseEmotion,
      facialCue: firstArmedPerformance?.facialCue,
    }), expect.objectContaining({
      embodimentScript: expect.objectContaining({
        turnId: 'turn-live2d-same-turn-fallback',
        rendererTarget: 'live2d',
        speechPlan: expect.objectContaining({
          segments: [
            expect.objectContaining({
              rendererHints: expect.objectContaining({
                preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
                preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
              }),
              rendererSettle: expect.objectContaining({
                live2dFacialReleaseMs: expect.any(Number),
                live2dMotionFollowThroughMs: expect.any(Number),
              }),
            }),
          ],
        }),
      }),
    }))

    runtime.dispose()
  })

  it('keeps the tts fallback embodiment script aligned with the authoritative planned dialogue performance', async () => {
    const harness = createDispatcherHarness()
    const speakFallback = vi.fn()
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
          renderer: 'vrm',
          supportedFacialCues: [
            { key: 'focus', label: 'Focus', description: 'focus face', source: 'preset', affectsMouth: false },
            { key: 'soft-gaze', label: 'Soft gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
          ],
          supportedActions: [
            { key: 'steady_focus', label: 'Steady Focus', description: 'steady focused idle', source: 'builtin' },
            { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'builtin' },
            { key: 'comfort_sway', label: 'Comfort', description: 'comfort sway', source: 'builtin' },
          ],
        })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback,
      stageModelRenderer: ref('vrm'),
      visualPresenceState: ref({
        residentPerformance: createSilentResidentPerformance('accompanying'),
      } as any),
    })

    const payload = createDialoguePayload({
      turnId: 'turn-tts-authority-resident-1',
      structured: {
        thought: 'silent-accompanying',
        reply: '我在这里继续陪着你。',
        emotion: 'neutral',
        embodiment: {
          emotion: 'neutral',
          performance: createPerformance({
            baseEmotion: 'neutral',
            emotion: 'neutral',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 1,
            rateMultiplier: 0.98,
          },
          variationToken: 'tts-authority-resident-variation-1',
        },
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
    })

    const ttsController = harness.getController('tts')
    expect(ttsController).toBeTruthy()

    await ttsController?.speak(payload.structured.reply, payload.structured.performance, payload)

    const plannedPerformance = armPerformance.mock.calls[0]?.[0]
    const fallbackMetadata = speakFallback.mock.calls[0]?.[2]
    const fallbackScript = fallbackMetadata?.embodimentScript

    expect(plannedPerformance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 2,
    }))
    expect(fallbackScript).toEqual(expect.objectContaining({
      turnId: 'turn-tts-authority-resident-1',
      rendererTarget: 'vrm',
      state: expect.objectContaining({
        baseEmotion: plannedPerformance?.baseEmotion,
        delivery: plannedPerformance?.delivery,
        emphasis: plannedPerformance?.emphasis,
      }),
      motionPlan: expect.objectContaining({
        idleBase: plannedPerformance?.actionCue,
      }),
    }))
    expect(fallbackScript?.facePlan?.speakingCues?.[0]).toEqual(expect.objectContaining({
      emotion: plannedPerformance?.baseEmotion,
      facialCue: plannedPerformance?.facialCue,
    }))

    runtime.dispose()
  })

  it('refreshes planned performance and fallback script across consecutive live2d dialogue turns without metadata leakage', async () => {
    const harness = createDispatcherHarness()
    const speakFallback = vi.fn()
    const armPerformance = vi.fn()
    const currentMotion = ref({ group: 'Idle' as string, index: 0 as number | undefined })

    const runtime = useStageEmbodimentPresence({
      armPerformance,
      currentMotion,
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => [
        {
          actionKey: 'inspect_follow',
          motionName: 'ObserveSoft',
          motionIndex: 2,
        },
        {
          actionKey: 'raise_hand_excited',
          motionName: 'Tap',
          motionIndex: 1,
        },
      ]),
      normalizePresenceEmotionName: rawEmotion => rawEmotion === 'happy' ? Emotion.Happy : Emotion.Think,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest({
        renderer: 'live2d',
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
          { key: 'smile', label: 'Smile', description: 'smiling face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'builtin' },
          { key: 'raise_hand_excited', label: 'Excited', description: 'raise hand excited', source: 'builtin' },
        ],
      })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback,
      stageModelRenderer: ref('live2d'),
    })

    const live2dController = harness.getController('live2d')
    const ttsController = harness.getController('tts')
    expect(live2dController).toBeTruthy()
    expect(ttsController).toBeTruthy()

    const firstPayload = createDialoguePayload({
      turnId: 'turn-live2d-sequence-a',
      structured: {
        thought: 'focus',
        reply: '我先继续盯着这个问题。',
        emotion: 'thinking',
        embodiment: {
          emotion: 'thinking',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'inspect_follow',
            delivery: 'calm',
            emphasis: 1,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 2,
            rateMultiplier: 0.98,
          },
          variationToken: 'live2d-sequence-variation-a',
        },
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'live2d-sequence-variation-a',
          reply: '我先继续盯着这个问题。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-a',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '我先继续盯着这个问题。',
            emotion: 'thinking',
            gestureWeight: 0.5,
            facialWeight: 0.6,
            prosodyWeight: 0.64,
            beatWeight: 0.42,
            emotionHoldMs: 420,
            settleMode: 'linger',
            rendererSettle: {
              live2dFacialReleaseMs: 320,
              live2dMotionFollowThroughMs: 420,
            },
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            actionCue: 'inspect_follow',
            facialCue: 'focused',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          }],
        })!,
        performance: createPerformance({
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 1,
        }),
        format: 'mind-turn-v1',
      },
    })

    const secondPayload = createDialoguePayload({
      turnId: 'turn-live2d-sequence-b',
      structured: {
        thought: 'energetic',
        reply: '这个点已经确认好了。',
        emotion: 'happy',
        embodiment: {
          emotion: 'happy',
          performance: createPerformance({
            baseEmotion: 'happy',
            emotion: 'happy',
            facialCue: 'smile',
            actionCue: 'raise_hand_excited',
            delivery: 'energetic',
            emphasis: 2,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 12,
            rateMultiplier: 1.12,
          },
          variationToken: 'live2d-sequence-variation-b',
        },
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'live2d-sequence-variation-b',
          reply: '这个点已经确认好了。',
          emotion: 'happy',
          segments: [{
            id: 'segment-b',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '这个点已经确认好了。',
            emotion: 'happy',
            gestureWeight: 0.72,
            facialWeight: 0.8,
            prosodyWeight: 0.78,
            beatWeight: 0.66,
            emotionHoldMs: 280,
            settleMode: 'snap-back',
            rendererSettle: {
              live2dFacialReleaseMs: 180,
              live2dMotionFollowThroughMs: 240,
            },
            rendererHints: {
              preferredExpressionAliases: ['BrightSmile'],
              preferredMotionAliases: ['Tap'],
            },
            actionCue: 'raise_hand_excited',
            facialCue: 'smile',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          }],
        })!,
        performance: createPerformance({
          baseEmotion: 'happy',
          emotion: 'happy',
          facialCue: 'smile',
          actionCue: 'raise_hand_excited',
          delivery: 'energetic',
          emphasis: 2,
        }),
        format: 'mind-turn-v1',
      },
    })

    await live2dController?.applyPerformance(firstPayload.structured.performance, firstPayload)
    await ttsController?.speak(firstPayload.structured.reply, firstPayload.structured.performance, firstPayload)
    await live2dController?.applyPerformance(secondPayload.structured.performance, secondPayload)
    await ttsController?.speak(secondPayload.structured.reply, secondPayload.structured.performance, secondPayload)

    const firstTurnVisualPerformance = armPerformance.mock.calls[0]?.[0]
    const firstTurnTtsPerformance = armPerformance.mock.calls[1]?.[0]
    const secondTurnVisualPerformance = armPerformance.mock.calls[2]?.[0]
    const secondTurnTtsPerformance = armPerformance.mock.calls[3]?.[0]
    const firstTurnScript = speakFallback.mock.calls[0]?.[2]?.embodimentScript
    const secondTurnScript = speakFallback.mock.calls[1]?.[2]?.embodimentScript

    expect(firstTurnVisualPerformance).toEqual(firstTurnTtsPerformance)
    expect(secondTurnVisualPerformance).toEqual(secondTurnTtsPerformance)
    expect(firstTurnVisualPerformance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      facialCue: 'focused',
      actionCue: 'inspect_follow',
    }))
    expect(secondTurnVisualPerformance).toEqual(expect.objectContaining({
      baseEmotion: 'happy',
      facialCue: 'smile',
      actionCue: 'raise_hand_excited',
    }))
    expect(secondTurnVisualPerformance).not.toEqual(firstTurnVisualPerformance)
    expect(armPerformance.mock.calls.map(call => call[1]?.variationToken)).toEqual([
      'live2d-sequence-variation-a',
      'live2d-sequence-variation-a',
      'live2d-sequence-variation-b',
      'live2d-sequence-variation-b',
    ])
    expect(firstTurnScript).toEqual(expect.objectContaining({
      turnId: 'turn-live2d-sequence-a',
      rendererTarget: 'live2d',
      speechPlan: expect.objectContaining({
        segments: [
          expect.objectContaining({
            rendererHints: expect.objectContaining({
              preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
              preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
            }),
            rendererSettle: expect.objectContaining({
              live2dFacialReleaseMs: 320,
              live2dMotionFollowThroughMs: 420,
            }),
          }),
        ],
      }),
    }))
    expect(secondTurnScript).toEqual(expect.objectContaining({
      turnId: 'turn-live2d-sequence-b',
      rendererTarget: 'live2d',
      speechPlan: expect.objectContaining({
        segments: [
          expect.objectContaining({
            rendererHints: expect.objectContaining({
              preferredExpressionAliases: expect.arrayContaining(['BrightSmile']),
              preferredMotionAliases: expect.arrayContaining(['Tap']),
            }),
            rendererSettle: expect.objectContaining({
              live2dFacialReleaseMs: 180,
              live2dMotionFollowThroughMs: 240,
            }),
          }),
        ],
      }),
    }))
    expect(currentMotion.value).toEqual({ group: 'Tap', index: 1 })

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
          quietLineMs: 240_000,
          currentInwardPreoccupation: 'host sustained focus',
          residentPerformance: createSilentResidentPerformance('accompanying'),
        },
        expected: {
          baseEmotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
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
          quietLineMs: 180_000,
          currentInwardPreoccupation: 'hold low-pressure care',
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
            { key: 'steady_focus', label: 'Steady Focus', description: 'steady focused idle', source: 'builtin' },
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

  it('builds fallback embodiment scripts from the same authoritative planned dialogue performance used at runtime', () => {
    const harness = createDispatcherHarness()

    const runtime = useStageEmbodimentPresence({
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Think,
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
      speakFallback: vi.fn(),
      stageModelRenderer: ref('vrm'),
      visualPresenceState: ref({
        residentPerformance: createSilentResidentPerformance('accompanying'),
      } as any),
    })

    const payload = createDialoguePayload({
      turnId: 'turn-builder-authority-1',
      structured: {
        thought: 'silent-accompanying',
        reply: '我在这里继续陪着你。',
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
    })

    const builtScript = harness.buildEmbodimentScript(payload) as any
    expect(builtScript).toEqual(expect.objectContaining({
      turnId: 'turn-builder-authority-1',
      rendererTarget: 'vrm',
      state: expect.objectContaining({
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 2,
        residentMode: 'quiet-companionship',
      }),
      facePlan: expect.objectContaining({
        speakingCues: expect.arrayContaining([
          expect.objectContaining({
            emotion: 'thinking',
            facialCue: 'focus',
          }),
        ]),
      }),
    }))
    expect(builtScript.speechPlan?.interruptPolicy).toBe('soft-settle')
    expect(builtScript.facePlan?.preUtteranceCue).toBe('soft-breath')
    expect(builtScript.facePlan?.postUtteranceCue).toBe('soft-release')
    expect(builtScript.motionPlan?.attentionMode).toBe('ambient')
    expect(builtScript.motionPlan?.idleBase).toBe('steady_focus')

    runtime.dispose()
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
