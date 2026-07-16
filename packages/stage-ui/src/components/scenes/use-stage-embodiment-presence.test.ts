import type {
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationPresencePulsePayload,
  AlicizationResidentPerformanceSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'

import { readFileSync } from 'node:fs'

import { normalizeAlicizationDialogueSpeechTimeline } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'
import { computed, reactive, ref } from 'vue'

import { Emotion } from '../../constants/emotions'
import { buildAlicizationEmbodimentScript } from '../../services/embodiment/director'
import { clearAlicizationBridge, setAlicizationBridge } from '../../stores/alicization-bridge'
import { resolveStagePresencePulsePerformance } from './stage-presence-pulse-performance'
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
  it('does not infer embodiment authority from fixed same-her prose', () => {
    const source = readFileSync(new URL('./use-stage-embodiment-presence.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('hasCurrentTurnSameHerContinuityCarry')
    expect(source).not.toMatch(/generic assistant shell|continuous her|detached status talk/u)
  })

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

  it('prefers authoritative digitalLife speechStyle over stale embodiment speechStyle across dialogue controllers', async () => {
    const harness = createDispatcherHarness()
    const applyEmotionSpeechStyle = vi.fn()

    const runtime = useStageEmbodimentPresence({
      armPerformance: vi.fn(),
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Think,
      applyEmotionSpeechStyle,
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focus face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'builtin' },
        ],
      })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: vi.fn(),
      stageModelRenderer: ref('live2d'),
    })

    const payload = createDialoguePayload({
      turnId: 'turn-authoritative-speech-style-1',
      structured: {
        thought: 'keep the same living voice line restrained',
        reply: '我先轻一点接住这条声音线。',
        emotion: 'thinking',
        embodiment: {
          emotion: 'thinking',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 6,
            rateMultiplier: 1.12,
          },
          variationToken: 'authoritative-speech-style-1',
        },
        digitalLife: {
          version: 'digital-life-v1',
          variationToken: 'authoritative-speech-style-1',
          emotion: 'thinking',
          mode: 'recovering',
          postureHint: 'attentive',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          speechStyle: {
            pitchDelta: -3,
            rateMultiplier: 0.92,
          },
          voice: {
            pitchDelta: -3,
            rateMultiplier: 0.92,
            energy: 0.36,
            cadence: 0.3,
          },
          lipSync: {
            mode: 'energy',
            visemeBias: 0.32,
            energyBias: 0.28,
            mouthScale: 0.82,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focus',
            expressionMode: 'hold',
            intensity: 0.3,
            holdMs: 300,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.18,
            holdMs: 220,
          },
          motor: {
            stillness: 0.74,
            expressivity: 0.18,
            gaze: { focus: 0.72, stability: 0.8, azimuth: 0, elevation: 0 },
            head: { yaw: 0, pitch: 0.02, roll: 0, nod: 0.08 },
            breath: { amplitude: 0.24, pace: 0.3 },
            facial: {
              eyeOpenness: 0.6,
              browLift: 0.04,
              browTension: 0.22,
              cheekLift: 0.08,
              mouthSpread: 0.08,
              mouthRound: 0.12,
              jawOpenBias: 0.12,
            },
            body: {
              sway: 0.02,
              lean: -0.04,
              openness: 0.26,
              settle: 0.82,
            },
          },
          frames: [],
        } as any,
        performance: createPerformance({
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        }),
        format: 'mind-turn-v1',
      },
    })

    const live2dController = harness.getController('live2d')
    const vrmController = harness.getController('vrm')
    const ttsController = harness.getController('tts')

    await live2dController?.applyPerformance(payload.structured.performance, payload)
    await vrmController?.applyPerformance(payload.structured.performance, payload)
    await ttsController?.speak(payload.structured.reply, payload.structured.performance, payload)

    expect(applyEmotionSpeechStyle).toHaveBeenNthCalledWith(1, Emotion.Think, {
      pitchDelta: -3,
      rateMultiplier: 0.92,
    })
    expect(applyEmotionSpeechStyle).toHaveBeenNthCalledWith(2, Emotion.Think, {
      pitchDelta: -3,
      rateMultiplier: 0.92,
    })
    expect(applyEmotionSpeechStyle).toHaveBeenNthCalledWith(3, Emotion.Think, {
      pitchDelta: -3,
      rateMultiplier: 0.92,
    })

    runtime.dispose()
  })

  it('keeps vrm motion selection aligned with canonical embodiment-script renderer hints', async () => {
    const harness = createDispatcherHarness()
    const speakFallback = vi.fn()
    const armPerformance = vi.fn()
    const currentMotion = ref({ group: 'Idle' as string, index: 0 as number | undefined })
    const applyPreferredExpressionAliases = vi.fn()

    const runtime = useStageEmbodimentPresence({
      armPerformance,
      currentMotion,
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: rawEmotion => rawEmotion === 'thinking' ? Emotion.Think : Emotion.Neutral,
      applyEmotionSpeechStyle: vi.fn(),
      applyPreferredExpressionAliases,
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest({
        renderer: 'vrm',
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
      turnId: 'turn-vrm-motion-alias-authority',
      structured: {
        thought: 'measured-return',
        reply: '我先继续看着这边。',
        emotion: 'thinking',
        embodiment: {
          emotion: 'thinking',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'inspect_follow',
            delivery: 'gentle',
            emphasis: 0,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 0,
            rateMultiplier: 1,
          },
          variationToken: 'vrm-motion-alias-authority',
        },
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'vrm-motion-alias-authority',
          reply: '我先继续看着这边。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-vrm-motion-alias-authority',
            index: 0,
            startOffset: 0,
            endOffset: 9,
            text: '我先继续看着这边。',
            emotion: 'thinking',
            gestureWeight: 0.42,
            facialWeight: 0.52,
            prosodyWeight: 0.58,
            beatWeight: 0.38,
            emotionHoldMs: 360,
            settleMode: 'linger',
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
          delivery: 'gentle',
          emphasis: 0,
        }),
        format: 'mind-turn-v1',
      },
    })

    const vrmController = harness.getController('vrm')
    const ttsController = harness.getController('tts')

    await vrmController?.applyPerformance(payload.structured.performance, payload)
    await ttsController?.speak(payload.structured.reply, payload.structured.performance, payload)

    expect(currentMotion.value).toEqual({ group: 'ObserveSoft' })
    expect(applyPreferredExpressionAliases).toBeCalledWith(['CalmInspect'])
    expect(armPerformance).toBeCalledWith(expect.objectContaining({
      actionCue: 'inspect_follow',
      baseEmotion: 'thinking',
    }), expect.objectContaining({
      variationToken: 'vrm-motion-alias-authority',
    }))
    expect(speakFallback).toBeCalledWith(payload.structured.reply, expect.anything(), expect.objectContaining({
      embodimentScript: expect.objectContaining({
        rendererTarget: 'vrm',
        speechPlan: expect.objectContaining({
          segments: [
            expect.objectContaining({
              rendererHints: expect.objectContaining({
                preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
              }),
            }),
          ],
        }),
      }),
    }))

    runtime.dispose()
  })

  it('applies expression alias authority before live2d dialogue performance is armed', async () => {
    const harness = createDispatcherHarness()
    const applyPreferredExpressionAliases = vi.fn()
    const armPerformance = vi.fn()

    const runtime = useStageEmbodimentPresence({
      armPerformance,
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: rawEmotion => rawEmotion === 'thinking' ? Emotion.Think : Emotion.Neutral,
      applyEmotionSpeechStyle: vi.fn(),
      applyPreferredExpressionAliases,
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest({
        renderer: 'live2d',
      })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: vi.fn(),
      stageModelRenderer: ref('live2d'),
    })

    const payload = createDialoguePayload({
      turnId: 'turn-live2d-expression-alias-authority',
      structured: {
        thought: 'focus',
        reply: '我先看着这里。',
        emotion: 'thinking',
        embodiment: {
          emotion: 'thinking',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'inspect_follow',
            delivery: 'gentle',
            emphasis: 0,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 0,
            rateMultiplier: 1,
          },
          variationToken: 'live2d-expression-alias-authority',
        },
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'live2d-expression-alias-authority',
          reply: '我先看着这里。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-live2d-expression-alias-authority',
            index: 0,
            startOffset: 0,
            endOffset: 7,
            text: '我先看着这里。',
            emotion: 'thinking',
            gestureWeight: 0.32,
            facialWeight: 0.6,
            prosodyWeight: 0.48,
            beatWeight: 0.28,
            emotionHoldMs: 360,
            settleMode: 'linger',
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
          delivery: 'gentle',
          emphasis: 0,
        }),
        format: 'mind-turn-v1',
      },
    })

    const live2dController = harness.getController('live2d')
    expect(live2dController).toBeTruthy()

    await live2dController?.applyPerformance(payload.structured.performance, payload)

    expect(applyPreferredExpressionAliases.mock.invocationCallOrder[0]).toBeLessThan(
      armPerformance.mock.invocationCallOrder[0]!,
    )
    expect(applyPreferredExpressionAliases).toBeCalledWith(['CalmInspect'])
    expect(armPerformance).toBeCalledWith(expect.objectContaining({
      baseEmotion: 'thinking',
    }), expect.objectContaining({
      variationToken: 'live2d-expression-alias-authority',
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
    expect(currentMotion.value).toEqual(expect.objectContaining({ group: 'ObserveSoft' }))

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

  it('turns measured-return renderer aliases into the actual live2d motion selection', async () => {
    const harness = createDispatcherHarness()
    const speakFallback = vi.fn()
    const armPerformance = vi.fn()
    const currentMotion = ref({ group: 'Idle' as string, index: 0 as number | undefined })

    const runtime = useStageEmbodimentPresence({
      armPerformance,
      currentMotion,
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: rawEmotion => rawEmotion === 'thinking' ? Emotion.Think : Emotion.Neutral,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest()),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback,
      stageModelRenderer: ref('live2d'),
      applyRuntimeEmbodimentEnvelope: vi.fn(),
    })

    const live2dController = harness.getController('live2d')
    const ttsController = harness.getController('tts')

    const payload = createDialoguePayload({
      turnId: 'turn-live2d-measured-return-selection',
      structured: {
        thought: 'measured-return',
        reply: '我先慢一点回来。',
        emotion: 'thinking',
        embodiment: {
          emotion: 'thinking',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'inspect_follow',
            delivery: 'gentle',
            emphasis: 0,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 0,
            rateMultiplier: 1,
          },
          variationToken: 'live2d-measured-return-selection',
        },
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'live2d-measured-return-selection',
          reply: '我先慢一点回来。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-measured-return-selection',
            index: 0,
            startOffset: 0,
            endOffset: 8,
            text: '我先慢一点回来。',
            emotion: 'thinking',
            gestureWeight: 0.42,
            facialWeight: 0.52,
            prosodyWeight: 0.58,
            beatWeight: 0.38,
            emotionHoldMs: 360,
            settleMode: 'linger',
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
          delivery: 'gentle',
          emphasis: 0,
        }),
        format: 'mind-turn-v1',
      },
    })

    await live2dController?.applyPerformance(payload.structured.performance, payload)
    await ttsController?.speak(payload.structured.reply, payload.structured.performance, payload)

    expect(currentMotion.value).toEqual(expect.objectContaining({ group: 'ObserveSoft' }))
    expect(speakFallback).toBeCalledWith(payload.structured.reply, expect.anything(), expect.objectContaining({
      embodimentScript: expect.objectContaining({
        speechPlan: expect.objectContaining({
          segments: [
            expect.objectContaining({
              rendererHints: expect.objectContaining({
                preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
                preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
              }),
            }),
          ],
        }),
      }),
    }))

    runtime.dispose()
  })

  it('turns repair-before-closeness renderer aliases into a guarded live2d motion selection', async () => {
    const harness = createDispatcherHarness()
    const speakFallback = vi.fn()
    const armPerformance = vi.fn()
    const currentMotion = ref({ group: 'Idle' as string, index: 0 as number | undefined })

    const runtime = useStageEmbodimentPresence({
      armPerformance,
      currentMotion,
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: rawEmotion => rawEmotion === 'thinking' ? Emotion.Think : Emotion.Neutral,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest()),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback,
      stageModelRenderer: ref('live2d'),
      applyRuntimeEmbodimentEnvelope: vi.fn(),
    })

    const live2dController = harness.getController('live2d')
    const ttsController = harness.getController('tts')

    const payload = createDialoguePayload({
      turnId: 'turn-live2d-repair-before-closeness-selection',
      structured: {
        thought: 'repair-before-closeness',
        reply: '我先把这一下稳住。',
        emotion: 'thinking',
        embodiment: {
          emotion: 'thinking',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            actionCue: 'steady_focus',
            delivery: 'gentle',
            emphasis: 0,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: 0,
            rateMultiplier: 1,
          },
          variationToken: 'live2d-repair-before-closeness-selection',
        },
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'live2d-repair-before-closeness-selection',
          reply: '我先把这一下稳住。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-repair-before-closeness-selection',
            index: 0,
            startOffset: 0,
            endOffset: 9,
            text: '我先把这一下稳住。',
            emotion: 'thinking',
            gestureWeight: 0.24,
            facialWeight: 0.4,
            prosodyWeight: 0.46,
            beatWeight: 0.28,
            emotionHoldMs: 420,
            settleMode: 'hold',
            rendererHints: {
              preferredExpressionAliases: ['RecoverSoft'],
              preferredMotionAliases: ['StillnessGuard'],
            },
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          }],
        })!,
        performance: createPerformance({
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        }),
        format: 'mind-turn-v1',
      },
    })

    await live2dController?.applyPerformance(payload.structured.performance, payload)
    await ttsController?.speak(payload.structured.reply, payload.structured.performance, payload)

    expect(currentMotion.value).toEqual(expect.objectContaining({ group: 'StillnessGuard' }))
    expect(speakFallback).toBeCalledWith(payload.structured.reply, expect.anything(), expect.objectContaining({
      embodimentScript: expect.objectContaining({
        speechPlan: expect.objectContaining({
          segments: [
            expect.objectContaining({
              rendererHints: expect.objectContaining({
                preferredExpressionAliases: expect.arrayContaining(['RecoverSoft']),
                preferredMotionAliases: expect.arrayContaining(['StillnessGuard']),
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

  it('keeps fallback runtime facts and embodiment metadata without forwarding legacy pre-dialogue fields', async () => {
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
      })),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback,
      stageModelRenderer: ref('live2d'),
    })

    const projectState = {
      activeTask: 'index the latest memory batch',
      observedAt: '2026-07-16T12:00:00.000Z',
    }
    const runtimeDigest = {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityPressure: 0.24,
      companionshipPressure: 0.31,
      channels: [{
        id: 'active-memory',
        state: 'warm',
        readiness: 0.82,
        focus: 'index the latest memory batch',
        summary: 'working memory is available',
      }],
      summary: 'active memory is available',
      emotionalClosureCue: 'legacy-value',
      sameHerSummary: 'legacy-value',
      projectState: {
        activeTask: 'index the latest memory batch',
        sameHerHoldDetail: 'legacy-value',
        companionBriefingLine: 'legacy-value',
      },
    }
    const payload = createDialoguePayload({
      turnId: 'turn-fallback-metadata-boundary',
      structured: {
        thought: 'use current runtime facts',
        reply: '我会把这批记忆继续整理好。',
        emotion: 'thinking',
        projectState,
        runtimeDigest,
        embodiment: {
          emotion: 'thinking',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 1,
          }),
          postureHint: 'attentive',
          speechStyle: {
            pitchDelta: -1,
            rateMultiplier: 0.95,
          },
          variationToken: 'fallback-metadata-boundary',
        },
        performance: createPerformance({
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        }),
        format: 'mind-turn-v1',
      } as any,
    })
    payload.structured.embodimentScript = harness.buildEmbodimentScript(payload) as any
    Object.assign(payload.structured as any, {
      preDialogueSendIdentity: {
        awarenessLine: 'legacy-value',
      },
      preDialogueAwareness: {
        awarenessLine: 'legacy-value',
      },
      preDialogueClosure: {
        emotionalClosureCue: 'legacy-value',
      },
      visibleReplyRealization: {
        awarenessLine: 'legacy-value',
      },
    })

    const ttsController = harness.getController('tts')
    await ttsController?.speak(payload.structured.reply, payload.structured.performance, payload)

    const fallbackMetadata = speakFallback.mock.calls[0]?.[2]
    expect(fallbackMetadata).toEqual(expect.objectContaining({
      projectState,
      runtimeDigest: expect.objectContaining({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        companionshipPressure: 0.31,
        projectState: {
          activeTask: 'index the latest memory batch',
        },
      }),
      embodimentScript: expect.objectContaining({
        turnId: 'turn-fallback-metadata-boundary',
        rendererTarget: 'live2d',
      }),
    }))
    expect(fallbackMetadata).not.toHaveProperty('preDialogueSendIdentity')
    expect(fallbackMetadata).not.toHaveProperty('preDialogueAwareness')
    expect(fallbackMetadata).not.toHaveProperty('preDialogueClosure')
    expect(fallbackMetadata).not.toHaveProperty('visibleReplyRealization')
    expect(JSON.stringify(fallbackMetadata?.runtimeDigest)).not.toContain('legacy-value')

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

  it('prefers authoritative digitalLife variationToken over stale embodiment variationToken across consecutive dialogue turns', async () => {
    const harness = createDispatcherHarness()
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
      speakFallback: vi.fn(),
      stageModelRenderer: ref('live2d'),
    })

    const live2dController = harness.getController('live2d')
    expect(live2dController).toBeTruthy()

    const firstPayload = createDialoguePayload({
      turnId: 'turn-authoritative-variation-a',
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
          variationToken: 'stale-embodiment-variation',
        },
        digitalLife: {
          variationToken: 'authoritative-digital-life-variation-a',
          version: 'digital-life-v1',
          emotion: 'thinking',
          mode: 'thinking',
          postureHint: 'attentive',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'inspect_follow',
            delivery: 'calm',
            emphasis: 1,
          },
          speechStyle: {
            pitchDelta: 2,
            rateMultiplier: 0.98,
          },
          voice: {
            pitchDelta: 2,
            rateMultiplier: 0.98,
            energy: 0.42,
            cadence: 0.4,
          },
          lipSync: {
            mode: 'energy',
            visemeBias: 0.38,
            energyBias: 0.32,
            mouthScale: 0.88,
            continuityHoldMs: 260,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 320,
          },
          action: {
            actionCue: 'inspect_follow',
            actionMode: 'hold',
            intensity: 0.3,
            holdMs: 240,
          },
          motor: {
            stillness: 0.58,
            expressivity: 0.34,
            gaze: { focus: 0.72, stability: 0.78, azimuth: 0, elevation: 0 },
            head: { yaw: 0.02, pitch: 0.04, roll: 0, nod: 0.12 },
            breath: { amplitude: 0.24, pace: 0.34 },
            facial: {
              eyeOpenness: 0.58,
              browLift: 0.06,
              browTension: 0.16,
              cheekLift: 0.08,
              mouthSpread: 0.1,
              mouthRound: 0.1,
              jawOpenBias: 0.12,
            },
            body: {
              sway: 0.04,
              lean: -0.02,
              openness: 0.34,
              settle: 0.74,
            },
          },
          frames: [],
        } as any,
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'authoritative-digital-life-variation-a',
          reply: '我先继续盯着这个问题。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-authoritative-variation-a',
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
      turnId: 'turn-authoritative-variation-b',
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
          variationToken: 'stale-embodiment-variation',
        },
        digitalLife: {
          variationToken: 'authoritative-digital-life-variation-b',
          version: 'digital-life-v1',
          emotion: 'happy',
          mode: 'speaking',
          postureHint: 'attentive',
          performance: {
            baseEmotion: 'happy',
            emotion: 'happy',
            facialCue: 'smile',
            actionCue: 'raise_hand_excited',
            delivery: 'energetic',
            emphasis: 2,
          },
          speechStyle: {
            pitchDelta: 12,
            rateMultiplier: 1.12,
          },
          voice: {
            pitchDelta: 12,
            rateMultiplier: 1.12,
            energy: 0.82,
            cadence: 0.72,
          },
          lipSync: {
            mode: 'energy',
            visemeBias: 0.6,
            energyBias: 0.48,
            mouthScale: 1.08,
            continuityHoldMs: 200,
          },
          face: {
            emotion: 'happy',
            facialCue: 'smile',
            expressionMode: 'hold',
            intensity: 0.74,
            holdMs: 220,
          },
          action: {
            actionCue: 'raise_hand_excited',
            actionMode: 'segment',
            intensity: 0.66,
            holdMs: 180,
          },
          motor: {
            stillness: 0.24,
            expressivity: 0.82,
            gaze: { focus: 0.8, stability: 0.68, azimuth: 0.08, elevation: 0.04 },
            head: { yaw: 0.06, pitch: 0.1, roll: 0.02, nod: 0.24 },
            breath: { amplitude: 0.42, pace: 0.64 },
            facial: {
              eyeOpenness: 0.72,
              browLift: 0.18,
              browTension: 0.08,
              cheekLift: 0.3,
              mouthSpread: 0.34,
              mouthRound: 0.18,
              jawOpenBias: 0.26,
            },
            body: {
              sway: 0.12,
              lean: 0.08,
              openness: 0.78,
              settle: 0.46,
            },
          },
          frames: [],
        } as any,
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'authoritative-digital-life-variation-b',
          reply: '这个点已经确认好了。',
          emotion: 'happy',
          segments: [{
            id: 'segment-authoritative-variation-b',
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
    await live2dController?.applyPerformance(secondPayload.structured.performance, secondPayload)

    const firstTurnPerformance = armPerformance.mock.calls[0]?.[0]
    const secondTurnPerformance = armPerformance.mock.calls[1]?.[0]

    expect(firstTurnPerformance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      facialCue: 'focused',
      actionCue: 'inspect_follow',
    }))
    expect(secondTurnPerformance).toEqual(expect.objectContaining({
      baseEmotion: 'happy',
      facialCue: 'smile',
      actionCue: 'raise_hand_excited',
    }))
    expect(secondTurnPerformance).not.toEqual(firstTurnPerformance)
    expect(armPerformance.mock.calls.map(call => call[1]?.variationToken)).toEqual([
      'authoritative-digital-life-variation-a',
      'authoritative-digital-life-variation-b',
    ])
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

  it('keeps restrained callback resident authority from warming back up to steady focus during quiet fallback dialogue planning', async () => {
    const cases = [
      {
        mode: 'measured-return',
        reasonTags: ['companionship', 'measured-return'],
        expectedActionCue: 'observe_focus',
      },
      {
        mode: 'measured-return',
        reasonTags: ['companionship', 'measured-return', 'durable-relationship-rhythm'],
        expectedActionCue: 'steady_focus',
      },
      {
        mode: 'repair-before-closeness',
        reasonTags: ['companionship', 'repair-before-closeness'],
        expectedActionCue: 'idle_settle',
      },
    ] as const

    for (const testCase of cases) {
      const harness = createDispatcherHarness()
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
            { key: 'steady_focus', label: 'Steady Focus', description: 'steady focused idle', source: 'builtin' },
            { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'builtin' },
            { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
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
          watchMode: 'symbiotic-vision',
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          quietLineMs: 240_000,
          currentInwardPreoccupation: 'hold callback continuity softly',
          residentPerformance: {
            ...createSilentResidentPerformance('accompanying'),
            reasonTags: [...testCase.reasonTags],
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
          turnId: `turn-restrained-callback-${testCase.mode}`,
          structured: {
            thought: testCase.mode,
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

      expect(armPerformance).toBeCalledWith(expect.objectContaining({
        baseEmotion: 'thinking',
        facialCue: 'focus',
        actionCue: testCase.expectedActionCue,
        delivery: 'gentle',
        emphasis: 2,
      }), expect.objectContaining({
        source: 'dialogue',
      }))

      runtime.dispose()
    }
  })

  it('keeps synthesized restrained callback authority from fallback continuity from warming back up during quiet dialogue planning', async () => {
    const cases = [
      {
        mode: 'measured-return',
        emotionalKernelReasonTags: ['measured-return', 'quiet-companionship'],
        rationaleTags: ['companionship'],
        expectedActionCues: ['observe_focus'],
        expectedBaseEmotions: ['thinking'],
      },
      {
        mode: 'repair-before-closeness',
        emotionalKernelReasonTags: ['repair-before-closeness', 'quiet-companionship'],
        rationaleTags: ['companionship', 'repair-before-closeness'],
        expectedActionCues: ['idle_settle', 'observe_focus'],
        expectedBaseEmotions: ['thinking', 'concerned'],
      },
      {
        mode: 'nearby-soft',
        emotionalKernelReasonTags: ['self-continuity', 'hesitant-curiosity', 'quiet-companionship', 'same-her-inward-carry'],
        rationaleTags: ['companionship', 'same-her-inward-carry'],
        expectedActionCues: ['observe_focus', 'steady_focus'],
        expectedBaseEmotions: ['thinking', 'concerned'],
      },
    ] as const

    for (const testCase of cases) {
      const harness = createDispatcherHarness()
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
            { key: 'steady_focus', label: 'Steady Focus', description: 'steady focused idle', source: 'builtin' },
            { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'builtin' },
            { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
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
          watchMode: 'mnemonic-passive',
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          quietLineMs: 240_000,
          currentInwardPreoccupation: 'hold callback continuity softly',
          privateThought: {
            shouldSpeak: false,
            thoughtText: 'Stay nearby without widening too fast.',
            suggestedStyle: 'silent-observe',
            embodiedPresence: 'attentive',
            emotionalTension: 'soft-covision',
            confidence: 0.72,
            rationaleTags: [...testCase.rationaleTags],
            stance: 'accompany',
            expiresAt: Date.now() + 6_000,
          },
          emotionalKernel: {
            version: 'emotional-kernel-v1',
            dominantEmotion: testCase.mode === 'repair-before-closeness'
              ? 'measured-companionship'
              : testCase.mode === 'nearby-soft'
                ? 'hesitant-curiosity'
                : 'measured-companionship',
            initiativeMode: testCase.mode === 'nearby-soft' ? 'hold' : 'observe',
            memoryRecallMode: testCase.mode === 'nearby-soft' ? 'self-continuity' : 'low-pressure-presence',
            embodimentTone: testCase.mode,
            valence: 0.58,
            arousal: 0.24,
            guardedness: 0.42,
            closenessDrive: 0.62,
            repairNeed: testCase.mode === 'repair-before-closeness' ? 0.54 : 0.16,
            initiativePressure: 0.2,
            reasonTags: [...testCase.emotionalKernelReasonTags],
            why: 'Quiet initiative and same-line continuity still want a lower-pressure return.',
          },
          residentPerformance: null,
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
          turnId: `turn-fallback-restrained-callback-${testCase.mode}`,
          structured: {
            thought: testCase.mode,
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

      expect(armPerformance).toBeCalledWith(expect.objectContaining({
        baseEmotion: expect.stringMatching(new RegExp(`^(${testCase.expectedBaseEmotions.join('|')})$`)),
        actionCue: expect.stringMatching(new RegExp(`^(${testCase.expectedActionCues.join('|')})$`)),
        delivery: 'gentle',
      }), expect.objectContaining({
        source: 'dialogue',
      }))

      runtime.dispose()
    }
  })

  it('lets current-turn same-her autobiographical continuity soften quiet fallback facial authority instead of replaying a published resident focus shell', async () => {
    const harness = createDispatcherHarness()
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
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focused idle', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
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
        watchMode: 'symbiotic-vision',
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'remembered identity-continuity',
        residentPerformance: createSilentResidentPerformance('accompanying'),
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
        turnId: 'turn-autobiographical-same-her-quiet-fallback',
        structured: {
          thought: 'keep the same life line nearby without flattening it into a shell',
          reply: '',
          emotion: 'neutral',
          digitalLifeSpine: {
            embodiment: {
              autobiographicalSelf: {
                identityNarrative: 'Remembered same-her drift risk: if this slips into a generic assistant shell or detached status talk, treat that as identity-continuity',
              },
            },
          } as any,
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
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 2,
    }), expect.objectContaining({
      source: 'dialogue',
    }))

    runtime.dispose()
  })

  it('refreshes stale payload embodiment scripts when current-turn identity-continuity', async () => {
    const harness = createDispatcherHarness()
    const speakFallback = vi.fn()
    const armPerformance = vi.fn()
    const applyPreferredExpressionAliases = vi.fn()
    const applyRuntimeEmbodimentEnvelope = vi.fn()

    const runtime = useStageEmbodimentPresence({
      applyPreferredExpressionAliases,
      applyRuntimeEmbodimentEnvelope,
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
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
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
      visualPresenceState: ref({
        watchMode: 'symbiotic-vision',
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'identity-continuity',
        residentPerformance: createSilentResidentPerformance('accompanying'),
      } as any),
    })

    const payload = createDialoguePayload({
      turnId: 'turn-stale-payload-script-same-her-quiet-fallback',
      structured: {
        thought: 'keep the same life line nearby without letting fallback reopen with a warmer shell',
        reply: '我先贴着这条已经接住的线，轻一点地继续陪着你。',
        emotion: 'neutral',
        digitalLifeSpine: {
          embodiment: {
            autobiographicalSelf: {
              identityNarrative: 'Remembered same-her drift risk: if this slips into a generic assistant shell or detached status talk, treat that as identity-continuity',
            },
          },
        } as any,
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
            pitchDelta: -1,
            rateMultiplier: 0.97,
          },
          variationToken: 'same-her-current-authority-variation',
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
    const authoritativeScript = harness.buildEmbodimentScript(payload) as any
    const staleScript = structuredClone(authoritativeScript) as any
    staleScript.state = {
      ...staleScript.state,
      residentMode: 'dialogue',
    }
    staleScript.speechPlan = {
      ...staleScript.speechPlan,
      interruptPolicy: 'continue',
      segments: staleScript.speechPlan?.segments?.map((segment: any, index: number) => index === 0
        ? {
            ...segment,
            rendererHints: {
              residentMode: 'dialogue',
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['WarmLean'],
              preferredBlinkCadence: 'normal',
              preferredGazeMode: 'steady',
              signature: 'stale-warm-shell',
            },
          }
        : segment) ?? [],
    }
    staleScript.facePlan = {
      ...staleScript.facePlan,
      preUtteranceCue: 'direct-look',
      postUtteranceCue: 'settle-smile',
      speakingCues: staleScript.facePlan?.speakingCues?.map((cue: any, index: number) => index === 0
        ? {
            ...cue,
            facialCue: 'focus',
          }
        : cue) ?? [],
    }
    staleScript.motionPlan = {
      ...staleScript.motionPlan,
      attentionMode: 'attentive',
    }

    const ttsController = harness.getController('tts')
    expect(ttsController).toBeTruthy()

    await ttsController?.speak(payload.structured.reply, payload.structured.performance, {
      ...payload,
      structured: {
        ...payload.structured,
        embodimentScript: staleScript,
      },
    })

    const plannedPerformance = armPerformance.mock.calls[0]?.[0]
    const runtimeEmbodiment = applyRuntimeEmbodimentEnvelope.mock.calls[0]?.[0]
    const fallbackScript = speakFallback.mock.calls[0]?.[2]?.embodimentScript
    const authoritativeRendererHints = authoritativeScript?.speechPlan?.segments?.[0]?.rendererHints ?? null
    const staleRendererHints = staleScript?.speechPlan?.segments?.[0]?.rendererHints ?? null

    expect(plannedPerformance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 2,
    }))
    expect(staleScript).not.toEqual(authoritativeScript)
    expect(runtimeEmbodiment).toEqual(expect.objectContaining({
      rendererHints: authoritativeRendererHints,
    }))
    expect(applyPreferredExpressionAliases).toBeCalledWith(
      authoritativeRendererHints?.preferredExpressionAliases ?? null,
    )
    expect(runtimeEmbodiment?.rendererHints).not.toEqual(staleRendererHints)
    expect(fallbackScript).toEqual(authoritativeScript)

    runtime.dispose()
  })

  it('rebuilds stale payload speechTimeline before priming or regenerating same-her quiet fallback authority', async () => {
    const harness = createDispatcherHarness()
    const speakFallback = vi.fn()
    const primeSpeechTimeline = vi.fn()
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
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focused idle', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focus face', source: 'preset', affectsMouth: false },
          { key: 'soft-gaze', label: 'Soft gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        ],
      })),
      primeSpeechTimeline,
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback,
      stageModelRenderer: ref('vrm'),
      visualPresenceState: ref({
        watchMode: 'symbiotic-vision',
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'identity-continuity',
        residentPerformance: createSilentResidentPerformance('accompanying'),
      } as any),
    })

    const payload = createDialoguePayload({
      turnId: 'turn-stale-payload-timeline-same-her-quiet-fallback',
      structured: {
        thought: 'keep the same life line nearby without letting stale timeline authority reopen warmer than this turn allows',
        reply: '我先贴着这条已经接住的线，轻一点地继续陪着你。',
        emotion: 'neutral',
        digitalLifeSpine: {
          embodiment: {
            autobiographicalSelf: {
              identityNarrative: 'Remembered same-her drift risk: if this slips into a generic assistant shell or detached status talk, treat that as identity-continuity',
            },
          },
        } as any,
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
            pitchDelta: -1,
            rateMultiplier: 0.97,
          },
          variationToken: 'same-her-current-authority-variation',
        },
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'same-her-current-authority-variation',
          reply: '我先贴着这条已经接住的线，轻一点地继续陪着你。',
          emotion: 'neutral',
          segments: [{
            id: 'segment-stale-same-her-warm-timeline',
            index: 0,
            startOffset: 0,
            endOffset: 24,
            text: '我先贴着这条已经接住的线，轻一点地继续陪着你。',
            emotion: 'neutral',
            gestureWeight: 0.64,
            facialWeight: 0.68,
            prosodyWeight: 0.66,
            beatWeight: 0.58,
            facialHoldMs: 420,
            actionHoldMs: 420,
            emotionHoldMs: 460,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'dialogue',
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['WarmLean'],
              preferredBlinkCadence: 'normal',
              preferredGazeMode: 'steady',
              signature: 'stale-warm-timeline',
            },
            actionCue: 'observe_focus',
            facialCue: 'focus',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          }],
        })!,
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

    const authoritativeSeedPayload = {
      ...payload,
      structured: {
        ...payload.structured,
        speechTimeline: null,
      },
    } as AlicizationDialogueRespondedPayload
    const staleScript = structuredClone(harness.buildEmbodimentScript(authoritativeSeedPayload) as any)
    staleScript.state = {
      ...staleScript.state,
      residentMode: 'dialogue',
    }
    staleScript.speechPlan = {
      ...staleScript.speechPlan,
      segments: staleScript.speechPlan?.segments?.map((segment: any, index: number) => index === 0
        ? {
            ...segment,
            rendererHints: {
              residentMode: 'dialogue',
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['WarmLean'],
              preferredBlinkCadence: 'normal',
              preferredGazeMode: 'steady',
              signature: 'stale-warm-script',
            },
          }
        : segment) ?? [],
    }

    const ttsController = harness.getController('tts')
    expect(ttsController).toBeTruthy()

    await ttsController?.speak(payload.structured.reply, payload.structured.performance, {
      ...payload,
      structured: {
        ...payload.structured,
        embodimentScript: staleScript,
      },
    })

    const plannedPerformance = armPerformance.mock.calls[0]?.[0]
    const primedTimeline = primeSpeechTimeline.mock.calls[0]?.[0]
    const refreshedScript = speakFallback.mock.calls[0]?.[2]?.embodimentScript
    const staleTimelineRendererHints = payload.structured.speechTimeline?.segments?.[0]?.rendererHints ?? null

    expect(plannedPerformance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 2,
    }))
    expect(primedTimeline).not.toBe(payload.structured.speechTimeline)
    expect(primedTimeline?.segments?.[0]?.rendererHints).not.toEqual(staleTimelineRendererHints)
    expect(primedTimeline?.segments?.[0]?.rendererHints?.signature).not.toBe('stale-warm-timeline')
    expect(refreshedScript?.speechPlan?.segments?.[0]?.rendererHints).not.toEqual(staleTimelineRendererHints)
    expect(refreshedScript?.speechPlan?.segments?.[0]?.rendererHints?.signature).not.toBe('stale-warm-timeline')
    expect(refreshedScript?.speechPlan?.segments?.[0]?.rendererHints?.signature).not.toBe('stale-warm-script')

    runtime.dispose()
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

  it('publishes a structured-clone-safe performance manifest through the Alicization bridge', async () => {
    const harness = createDispatcherHarness()
    const setPerformanceManifest = vi.fn(async (manifest: CharacterPerformanceCapabilitiesManifest | null) => {
      expect(() => structuredClone(manifest)).not.toThrow()
    })
    const performanceManifest = reactive(createManifest({
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
      embodimentHints: {
        thinking: {
          preferredExpressionAliases: ['focus'],
          preferredMotionAliases: ['idle_focus'],
        },
      },
    }))

    clearAlicizationBridge()
    setAlicizationBridge({
      setPerformanceManifest,
    } as any)

    const runtime = useStageEmbodimentPresence({
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Neutral,
      applyEmotionSpeechStyle: vi.fn(),
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => performanceManifest as CharacterPerformanceCapabilitiesManifest),
      resolveClampedPresencePulsePerformance: () => createPerformance(),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: vi.fn(),
      stageModelRenderer: ref('live2d'),
    })

    await vi.waitFor(() => {
      expect(setPerformanceManifest).toHaveBeenCalledTimes(1)
    })

    const forwardedManifest = setPerformanceManifest.mock.calls[0]?.[0]
    expect(forwardedManifest).toEqual({
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'happy', 'thinking'],
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
    expect(forwardedManifest).not.toBe(performanceManifest)
    expect(forwardedManifest?.supportedFacialCues).not.toBe(performanceManifest.supportedFacialCues)
    expect(forwardedManifest?.supportedActions).not.toBe(performanceManifest.supportedActions)

    runtime.dispose()
    clearAlicizationBridge()
  })
})
