import type {
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationDigitalLifeEnvelope,
  AlicizationEmbodimentScriptV1,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'

import { normalizeAlicizationDialogueSpeechTimeline } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

import { Emotion } from '../../constants/emotions'
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

function createDispatcherHarness() {
  const controllers: any[] = []
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
        return () => {
          const index = scriptBuilderRegistrations.findIndex(item => item.id === registration.id)
          if (index >= 0)
            scriptBuilderRegistrations.splice(index, 1)
        }
      },
    },
    getController(channel: string) {
      return controllers.find(controller => controller.channel === channel)
    },
  }
}

function createScriptOnlyDigitalLife(overrides?: Partial<AlicizationDigitalLifeEnvelope>): AlicizationDigitalLifeEnvelope {
  return {
    version: 'digital-life-v1',
    variationToken: 'script-digital-life-authority',
    mode: 'thinking',
    emotion: 'thinking',
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
      intensity: 0.42,
      holdMs: 320,
    },
    action: {
      actionCue: 'observe_focus',
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
    frames: [{
      id: 'segment-script-digital-life-authority',
      index: 0,
      startOffset: 0,
      endOffset: 11,
      text: '我先轻一点接住。',
      mode: 'recovering',
      interruptPolicy: 'soft-interrupt',
      settleMode: 'hold',
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
        intensity: 0.42,
        holdMs: 320,
      },
      action: {
        actionCue: 'observe_focus',
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
    }],
    ...overrides,
  }
}

function createEmbodimentScriptWithDigitalLife(
  digitalLife: AlicizationDigitalLifeEnvelope = createScriptOnlyDigitalLife(),
): AlicizationEmbodimentScriptV1 {
  return {
    version: 'embodiment-script-v1',
    turnId: 'turn-script-digital-life-authority',
    rendererTarget: 'live2d',
    replyText: '我先轻一点接住。',
    state: {
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      residentMode: 'measured-return',
    },
    speechPlan: {
      segments: [{
        id: 'segment-script-digital-life-authority',
        index: 0,
        text: '我先轻一点接住。',
        interruptPolicy: 'soft-settle',
        preRollMs: 20,
        settleMs: 260,
      }],
      interruptPolicy: 'soft-settle',
      preRollMs: 20,
      settleMs: 260,
    },
    facePlan: {
      speakingCues: [{
        segmentId: 'segment-script-digital-life-authority',
        emotion: 'thinking',
        facialCue: 'focus',
        intensity: 0.42,
        holdMs: 320,
        preUtteranceCue: null,
        postUtteranceCue: null,
        source: 'digital-life-projection',
        confidence: 0.92,
      }],
    },
    motionPlan: {
      idleBase: 'idle_settle',
      actionBursts: [{
        segmentId: 'segment-script-digital-life-authority',
        actionCue: 'observe_focus',
        intensity: 0.3,
        holdMs: 240,
        source: 'digital-life-projection',
        confidence: 0.88,
      }],
      attentionMode: 'attentive',
    },
    lipsyncPlan: {
      mode: 'energy-phoneme-hybrid',
    },
    digitalLife,
  }
}

describe('stage embodiment presence digital life authority', () => {
  it('falls back to embodimentScript digitalLife for variation token speech style and priming when top-level digitalLife is missing', async () => {
    const harness = createDispatcherHarness()
    const armPerformance = vi.fn()
    const applyEmotionSpeechStyle = vi.fn()
    const primeDigitalLifeEnvelope = vi.fn()

    const runtime = useStageEmbodimentPresence({
      armPerformance,
      applyEmotionSpeechStyle,
      primeDigitalLifeEnvelope,
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Think,
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest({
        renderer: 'live2d',
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

    const live2dController = harness.getController('live2d')
    expect(live2dController).toBeTruthy()

    const payload = createDialoguePayload({
      turnId: 'turn-script-digital-life-authority',
      structured: {
        thought: 'keep the same living voice line restrained',
        reply: '我先轻一点接住。',
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
          variationToken: 'stale-embodiment-variation',
        } as any,
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'stale-speech-timeline-variation',
          reply: '我先轻一点接住。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-script-digital-life-authority',
            index: 0,
            startOffset: 0,
            endOffset: 9,
            text: '我先轻一点接住。',
            emotion: 'thinking',
            gestureWeight: 0.5,
            facialWeight: 0.6,
            prosodyWeight: 0.64,
            beatWeight: 0.42,
            emotionHoldMs: 420,
            settleMode: 'linger',
            actionCue: 'observe_focus',
            facialCue: 'focus',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          }],
        })!,
        digitalLife: null,
        embodimentScript: createEmbodimentScriptWithDigitalLife(),
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

    await live2dController?.applyPerformance(payload.structured.performance, payload)

    expect(armPerformance).toBeCalledWith(expect.anything(), expect.objectContaining({
      variationToken: 'script-digital-life-authority',
    }))
    expect(applyEmotionSpeechStyle).toBeCalledWith(Emotion.Think, {
      pitchDelta: -3,
      rateMultiplier: 0.92,
    })
    expect(primeDigitalLifeEnvelope).toBeCalledWith(expect.objectContaining({
      variationToken: 'script-digital-life-authority',
      speechStyle: expect.objectContaining({
        pitchDelta: -3,
        rateMultiplier: 0.92,
      }),
    }))

    runtime.dispose()
  })

  it('keeps top-level digitalLife as first authority when both top-level and script digitalLife are present', async () => {
    const harness = createDispatcherHarness()
    const armPerformance = vi.fn()
    const applyEmotionSpeechStyle = vi.fn()
    const primeDigitalLifeEnvelope = vi.fn()

    const runtime = useStageEmbodimentPresence({
      armPerformance,
      applyEmotionSpeechStyle,
      primeDigitalLifeEnvelope,
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: () => Emotion.Think,
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

    const live2dController = harness.getController('live2d')
    const topLevelDigitalLife = createScriptOnlyDigitalLife({
      variationToken: 'top-level-digital-life-authority',
      speechStyle: {
        pitchDelta: 4,
        rateMultiplier: 1.04,
      },
      voice: {
        pitchDelta: 4,
        rateMultiplier: 1.04,
        energy: 0.5,
        cadence: 0.42,
      },
      frames: [{
        ...createScriptOnlyDigitalLife().frames[0],
        id: 'segment-top-level-digital-life-authority',
      }],
    })

    const payload = createDialoguePayload({
      turnId: 'turn-top-level-digital-life-authority',
      structured: {
        thought: 'keep top-level authority',
        reply: '我先轻一点接住。',
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
          variationToken: 'stale-embodiment-variation',
        } as any,
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'stale-speech-timeline-variation',
          reply: '我先轻一点接住。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-top-level-digital-life-authority',
            index: 0,
            startOffset: 0,
            endOffset: 9,
            text: '我先轻一点接住。',
            emotion: 'thinking',
            gestureWeight: 0.5,
            facialWeight: 0.6,
            prosodyWeight: 0.64,
            beatWeight: 0.42,
            emotionHoldMs: 420,
            settleMode: 'linger',
            actionCue: 'observe_focus',
            facialCue: 'focus',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          }],
        })!,
        digitalLife: topLevelDigitalLife as any,
        embodimentScript: createEmbodimentScriptWithDigitalLife(),
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

    await live2dController?.applyPerformance(payload.structured.performance, payload)

    expect(armPerformance).toBeCalledWith(expect.anything(), expect.objectContaining({
      variationToken: 'top-level-digital-life-authority',
    }))
    expect(applyEmotionSpeechStyle).toBeCalledWith(Emotion.Think, {
      pitchDelta: 4,
      rateMultiplier: 1.04,
    })
    expect(primeDigitalLifeEnvelope).toBeCalledWith(expect.objectContaining({
      variationToken: 'top-level-digital-life-authority',
      frames: [
        expect.objectContaining({
          id: 'segment-top-level-digital-life-authority',
        }),
      ],
    }))

    runtime.dispose()
  })

  it('refreshes stale top-level digitalLife when current-turn identity-continuity', async () => {
    const harness = createDispatcherHarness()
    const armPerformance = vi.fn()
    const applyEmotionSpeechStyle = vi.fn()
    const primeDigitalLifeEnvelope = vi.fn()

    const runtime = useStageEmbodimentPresence({
      armPerformance,
      applyEmotionSpeechStyle,
      primeDigitalLifeEnvelope,
      currentMotion: ref({ group: 'Idle' as string, index: 0 as number | undefined }),
      dispatcher: harness.dispatcher as any,
      live2dActionCapabilities: computed(() => []),
      normalizePresenceEmotionName: rawEmotion => rawEmotion === 'thinking' ? Emotion.Think : Emotion.Neutral,
      clampPerformance: performance => performance,
      enqueueEmotion: vi.fn(),
      performanceManifest: computed(() => createManifest({
        renderer: 'live2d',
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
      stageModelRenderer: ref('live2d'),
      visualPresenceState: ref({
        watchMode: 'symbiotic-vision',
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'identity-continuity',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: createPerformance({
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'steady_focus',
            delivery: 'gentle',
            emphasis: 2,
          }),
          embodiedPresence: 'attentive',
          stance: 'accompany',
          emotionalTension: 'soft-covision',
          confidence: 0.86,
          reasonTags: ['companionship'],
          signature: 'resident|main-runtime|accompanying|quiet-accompaniment',
          updatedAt: Date.now(),
        },
      } as any),
    })

    const live2dController = harness.getController('live2d')
    expect(live2dController).toBeTruthy()

    const payload = createDialoguePayload({
      turnId: 'turn-stale-top-level-digital-life-same-her-quiet-fallback',
      structured: {
        thought: 'keep the same life line nearby without letting fallback reopen with a warmer digital-life shell',
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
        } as any,
        speechTimeline: normalizeAlicizationDialogueSpeechTimeline({
          version: 'speech-timeline-v1',
          variationToken: 'same-her-current-authority-variation',
          reply: '我先贴着这条已经接住的线，轻一点地继续陪着你。',
          emotion: 'neutral',
          segments: [{
            id: 'segment-stale-top-level-digital-life',
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
        digitalLife: {
          version: 'digital-life-v1',
          variationToken: 'stale-warm-digital-life',
          emotion: 'neutral',
          mode: 'speaking',
          postureHint: 'attentive',
          performance: {
            baseEmotion: 'neutral',
            emotion: 'neutral',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'energetic',
            emphasis: 2,
          },
          speechStyle: {
            pitchDelta: 8,
            rateMultiplier: 1.12,
          },
          voice: {
            pitchDelta: 8,
            rateMultiplier: 1.12,
            energy: 0.82,
            cadence: 0.72,
          },
          lipSync: {
            mode: 'hybrid',
            visemeBias: 0.62,
            energyBias: 0.74,
            mouthScale: 1,
            continuityHoldMs: 160,
          },
          face: {
            emotion: 'neutral',
            facialCue: 'focus',
            expressionMode: 'blend',
            intensity: 0.76,
            holdMs: 220,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'pulse',
            intensity: 0.72,
            holdMs: 200,
          },
          motor: {
            stillness: 0.18,
            expressivity: 0.82,
            gaze: { focus: 0.84, stability: 0.4, azimuth: 0.08, elevation: 0.04 },
            head: { yaw: 0.06, pitch: 0.05, roll: 0.02, nod: 0.34 },
            breath: { amplitude: 0.54, pace: 0.7 },
            facial: {
              eyeOpenness: 0.78,
              browLift: 0.14,
              browTension: 0.22,
              cheekLift: 0.24,
              mouthSpread: 0.34,
              mouthRound: 0.22,
              jawOpenBias: 0.38,
            },
            body: {
              sway: 0.16,
              lean: 0.08,
              openness: 0.72,
              settle: 0.26,
            },
          },
          frames: [{
            id: 'segment-stale-top-level-digital-life',
            index: 0,
            startOffset: 0,
            endOffset: 24,
            text: '我先贴着这条已经接住的线，轻一点地继续陪着你。',
            mode: 'speaking',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            voice: {
              pitchDelta: 8,
              rateMultiplier: 1.12,
              energy: 0.82,
              cadence: 0.72,
            },
            lipSync: {
              mode: 'hybrid',
              visemeBias: 0.62,
              energyBias: 0.74,
              mouthScale: 1,
              continuityHoldMs: 160,
            },
            face: {
              emotion: 'neutral',
              facialCue: 'focus',
              expressionMode: 'blend',
              intensity: 0.76,
              holdMs: 220,
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'pulse',
              intensity: 0.72,
              holdMs: 200,
            },
            motor: {
              stillness: 0.18,
              expressivity: 0.82,
              gaze: { focus: 0.84, stability: 0.4, azimuth: 0.08, elevation: 0.04 },
              head: { yaw: 0.06, pitch: 0.05, roll: 0.02, nod: 0.34 },
              breath: { amplitude: 0.54, pace: 0.7 },
              facial: {
                eyeOpenness: 0.78,
                browLift: 0.14,
                browTension: 0.22,
                cheekLift: 0.24,
                mouthSpread: 0.34,
                mouthRound: 0.22,
                jawOpenBias: 0.38,
              },
              body: {
                sway: 0.16,
                lean: 0.08,
                openness: 0.72,
                settle: 0.26,
              },
            },
          }],
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
    })

    await live2dController?.applyPerformance(payload.structured.performance, payload)

    const plannedPerformance = armPerformance.mock.calls[0]?.[0]
    const primedDigitalLife = primeDigitalLifeEnvelope.mock.calls[0]?.[0]

    expect(plannedPerformance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 2,
    }))
    expect(applyEmotionSpeechStyle).toBeCalledWith(Emotion.Think, {
      pitchDelta: -1,
      rateMultiplier: 0.97,
    })
    expect(primedDigitalLife).not.toEqual(payload.structured.digitalLife)
    expect(primedDigitalLife).toEqual(expect.objectContaining({
      variationToken: 'same-her-current-authority-variation',
      emotion: 'thinking',
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 2,
      }),
      action: expect.objectContaining({
        actionCue: 'steady_focus',
      }),
      speechStyle: {
        pitchDelta: -1,
        rateMultiplier: 0.97,
      },
    }))
    expect(primedDigitalLife?.voice).not.toEqual(payload.structured.digitalLife?.voice)

    runtime.dispose()
  })
})
