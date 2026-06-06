import type { AlicizationDigitalLifeSpineDigest } from '../../stores/alicization-bridge'
import type { EmbodimentPlaybackTelemetry } from '../../services/embodiment/playback-reconciler'
import type { PlaybackItem } from '@proj-alicization/pipelines-audio'

import { createBufferedSpeechAudioSource } from '@proj-alicization/pipelines-audio'
import {
  createIdleStageEmbodimentMotorState,
  createIdleStageEmbodimentSpeechArticulationState,
  type AlicizationDigitalLifeFrame,
  type StageEmbodimentSpeechPlaybackItem,
  createIdleStageEmbodimentSpeechRenderState,
  createStageEmbodimentSpeechPlaybackItem,
} from '@proj-alicization/stage-shared'
import type { BrowserSpeechAudioSource } from '../../libs/speech-audio-playback'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'

import {
  resolveCompanionshipExpressionDampening,
  useStageEmbodimentPerformanceRuntime,
} from './use-stage-embodiment-performance-runtime'
import { useStageEmbodimentSpeech } from './use-stage-embodiment-speech'

vi.mock('@proj-alicization/model-driver-lipsync', () => ({
  createLive2DLipSync: vi.fn(),
}))

function createPerformance(overrides: Partial<{
  baseEmotion: 'neutral' | 'thinking' | 'happy' | 'concerned' | 'tired'
  emotion: 'neutral' | 'thinking' | 'happy' | 'concerned' | 'tired'
  facialCue: string | null
  actionCue: string | null
  delivery: 'calm' | 'gentle' | 'energetic'
  emphasis: 0 | 1 | 2
}> = {}) {
  return {
    baseEmotion: 'happy' as const,
    emotion: 'happy' as const,
    facialCue: 'smile',
    actionCue: 'raise_hand_excited',
    delivery: 'energetic' as const,
    emphasis: 2 as const,
    ...overrides,
  }
}

function createSpeechVoiceFixture(overrides: Record<string, unknown> = {}) {
  return {
    provider: null,
    model: null,
    voiceId: null,
    voiceName: null,
    language: null,
    gender: null,
    rateMultiplier: 1,
    pitchDelta: 0,
    closureBias: 0,
    roundBias: 0,
    spreadBias: 0,
    jawBias: 0,
    consonantPrecision: 0,
    vowelLegato: 0,
    ...overrides,
  }
}

function createSpeechRenderStateFixture(
  overrides: Omit<Partial<ReturnType<typeof createIdleStageEmbodimentSpeechRenderState>>, 'articulation'> & {
    articulation?: Partial<ReturnType<typeof createIdleStageEmbodimentSpeechRenderState>['articulation']> | null
  } = {},
): ReturnType<typeof createIdleStageEmbodimentSpeechRenderState> {
  const base = createIdleStageEmbodimentSpeechRenderState()
  return {
    ...base,
    ...overrides,
    articulation: overrides.articulation === null
      ? createIdleStageEmbodimentSpeechArticulationState()
      : overrides.articulation
        ? {
            ...base.articulation,
            ...overrides.articulation,
            visemes: overrides.articulation.visemes
              ? {
                  ...base.articulation.visemes,
                  ...overrides.articulation.visemes,
                }
              : base.articulation.visemes,
            voice: overrides.articulation.voice
              ? {
                  ...createSpeechVoiceFixture(),
                  ...overrides.articulation.voice,
                }
              : overrides.articulation.voice === null
                ? null
                : base.articulation.voice,
          }
        : base.articulation,
  }
}

type PlaybackCueFixture = NonNullable<StageEmbodimentSpeechPlaybackItem['cue']>

function createPlaybackCueFixture(
  overrides: Partial<PlaybackCueFixture> = {},
): PlaybackCueFixture {
  return {
    id: 'segment-1',
    index: 0,
    startOffset: 0,
    endOffset: 1,
    text: 'steady return',
    emotion: 'thinking',
    gestureWeight: 0,
    facialWeight: 0,
    prosodyWeight: 0,
    beatWeight: 0,
    mouthWeight: 0,
    headWeight: 0,
    facialHoldMs: 0,
    actionHoldMs: 0,
    emotionHoldMs: 0,
    actionCue: null,
    facialCue: null,
    actionWindow: 'none',
    interruptMode: 'soft-interrupt',
    settleMode: 'hold',
    rendererHints: null,
    rendererSettle: null,
    ...overrides,
  }
}

function createPlaybackTelemetryFixture(
  overrides: Omit<Partial<EmbodimentPlaybackTelemetry>, 'cue' | 'drivers'> & {
    cue?: Partial<PlaybackCueFixture> | null
    drivers?: Partial<EmbodimentPlaybackTelemetry['drivers']>
  } = {},
): EmbodimentPlaybackTelemetry {
  const base: EmbodimentPlaybackTelemetry = {
    actualDurationMs: 0,
    driftMs: 0,
    plannedDurationMs: 0,
    settleMs: 0,
    stopReason: null,
    rendererTarget: null,
    cue: null,
    driverAuthority: null,
    prosodyAuthority: null,
    drivers: {
      body: null,
      face: null,
      lipsync: null,
      motion: null,
    },
  }

  return {
    ...base,
    ...overrides,
    cue: overrides.cue === null
      ? null
      : overrides.cue
        ? createPlaybackCueFixture(overrides.cue)
        : base.cue,
    drivers: {
      ...base.drivers,
      ...overrides.drivers,
    },
  }
}

function createDigitalLifeFrameFixture(
  overrides: Partial<AlicizationDigitalLifeFrame> = {},
): AlicizationDigitalLifeFrame {
  const idleMotor = createIdleStageEmbodimentMotorState()
  const base: AlicizationDigitalLifeFrame = {
    id: 'segment-1',
    index: 0,
    startOffset: 0,
    endOffset: 1,
    text: 'steady return',
    mode: 'recovering',
    interruptPolicy: 'soft-interrupt',
    settleMode: 'hold',
    voice: {
      pitchDelta: 0,
      rateMultiplier: 1,
      energy: 0.3,
      cadence: 0.28,
    },
    lipSync: {
      mode: 'closed',
      visemeBias: 0.24,
      energyBias: 0.22,
      mouthScale: 0.8,
      continuityHoldMs: 280,
    },
    face: {
      emotion: 'thinking',
      facialCue: null,
      expressionMode: 'recover',
      intensity: 0.24,
      holdMs: 300,
      rendererHints: null,
    },
    action: {
      actionCue: null,
      actionMode: 'none',
      intensity: 0.08,
      holdMs: 260,
      rendererHints: null,
    },
    motor: {
      ...idleMotor,
      stillness: 0.84,
      expressivity: 0.12,
      gaze: {
        ...idleMotor.gaze,
        focus: 0.44,
        stability: 0.4,
        azimuth: 0,
        elevation: 0.02,
      },
      head: {
        ...idleMotor.head,
        yaw: 0,
        pitch: 0.04,
        roll: 0,
        nod: 0.08,
      },
      breath: {
        ...idleMotor.breath,
        amplitude: 0.18,
        pace: 0.24,
      },
      facial: {
        ...idleMotor.facial,
        eyeOpenness: 0.72,
        browLift: 0.08,
        browTension: 0.18,
        cheekLift: 0.1,
        mouthSpread: 0.08,
        mouthRound: 0.06,
        jawOpenBias: 0.04,
      },
      body: {
        ...idleMotor.body,
        sway: 0.04,
        lean: 0.12,
        settle: 0.82,
        openness: 0.22,
      },
    },
  }

  return {
    ...base,
    ...overrides,
    voice: {
      ...base.voice,
      ...overrides.voice,
    },
    lipSync: {
      ...base.lipSync,
      ...overrides.lipSync,
    },
    face: {
      ...base.face,
      ...overrides.face,
    },
    action: {
      ...base.action,
      ...overrides.action,
    },
    motor: {
      ...base.motor,
      ...overrides.motor,
      gaze: {
        ...base.motor.gaze,
        ...overrides.motor?.gaze,
      },
      head: {
        ...base.motor.head,
        ...overrides.motor?.head,
      },
      breath: {
        ...base.motor.breath,
        ...overrides.motor?.breath,
      },
      facial: {
        ...base.motor.facial,
        ...overrides.motor?.facial,
      },
      body: {
        ...base.motor.body,
        ...overrides.motor?.body,
      },
    },
  }
}

function createRecoveringMotor() {
  const idleMotor = createIdleStageEmbodimentMotorState()

  return {
    ...idleMotor,
    stillness: 0.82,
    expressivity: 0.3,
    gaze: {
      ...idleMotor.gaze,
      focus: 0.78,
      stability: 0.86,
      azimuth: -0.12,
      elevation: -0.08,
    },
    head: {
      ...idleMotor.head,
      yaw: -0.08,
      pitch: 0.12,
      roll: 0.06,
      nod: 0.12,
    },
    breath: {
      ...idleMotor.breath,
      amplitude: 0.32,
      pace: 0.38,
    },
    facial: {
      ...idleMotor.facial,
      eyeOpenness: 0.5,
      browLift: -0.06,
      browTension: 0.36,
      cheekLift: 0.08,
      mouthSpread: 0.1,
      mouthRound: 0.42,
      jawOpenBias: 0.22,
    },
    body: {
      ...idleMotor.body,
      sway: -0.06,
      lean: -0.14,
      openness: 0.34,
      settle: 0.88,
    },
  }
}

function createDigitalLifeSpineDigest(input: {
  confidence?: number
  dominantSystem: NonNullable<AlicizationDigitalLifeSpineDigest['architecture']>['dominantSystem']
  operatingMode: NonNullable<AlicizationDigitalLifeSpineDigest['architecture']>['operatingMode']
  recallMode?: string
  watchMode?: string
}): AlicizationDigitalLifeSpineDigest {
  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: input.watchMode ?? 'symbiotic-vision',
      sceneScenario: 'coding',
      sceneSummary: 'runtime focus',
      activeThreadId: 'thread-1',
      activeThreadTitle: 'runtime',
      dominantMode: 'thinking',
      dominantDrive: 'stabilize',
      answerIntent: 'guide',
      preferredPresence: 'attentive',
      selectedAction: 'warn',
      updatedAt: 1_000,
    },
    architecture: {
      operatingMode: input.operatingMode,
      dominantSystem: input.dominantSystem,
      supportingSystems: ['dialogue'],
      governingFocus: 'runtime coherence',
      summary: 'runtime coherence',
    },
    continuitySignal: null,
    embodiment: {
      privateThought: null,
      selfContinuity: null,
      autobiographicalSelf: {
        attachmentStyle: null,
        expressionStyle: null,
        conflictStyle: null,
        agencyStyle: null,
        attachmentNeed: null,
        autonomyNeed: null,
        truthAnchor: null,
        careBias: null,
        playBias: null,
        irritabilityThreshold: null,
        stubbornness: null,
        companionship: null,
        truthfulGrounding: null,
        gentleRepair: null,
        quietObservation: null,
        proactiveCare: null,
        playfulIntimacy: null,
        autonomyRespect: null,
        unfinishedThreadReturn: null,
        stability: null,
        identityNarrative: null,
        relationshipDoctrine: null,
      },
      relationship: null,
      selfState: null,
      mindEcology: null,
      initiative: null,
    },
    proactive: {
      selectedAction: 'warn',
      preferredStyle: 'firm-warning',
      confidence: input.confidence ?? 0.8,
      shouldSpeak: false,
      activeThreadId: 'thread-1',
      activeThreadTitle: 'runtime',
      dominantConcernKind: null,
      dominantConcernSummary: null,
      leadingGoalId: null,
      leadingGoalSummary: null,
      preferredPresence: 'attentive',
      personaBias: null,
    },
    memory: {
      summary: null,
      recentEpisodeSummary: null,
      recentEpisodeCount: 0,
      focusBeliefStatement: null,
      focusBeliefConfidence: null,
      leadingGoalSummary: null,
      dominantConcernSummary: null,
      reflectionSummary: null,
      reflectionPressure: null,
      recallMode: input.recallMode ?? 'working-memory',
      recallSeed: null,
      thoughtThreadSummary: null,
    },
  }
}

async function createResidentIdleRuntime(input: {
  actionCue: string | null
  baseEmotion: 'neutral' | 'thinking' | 'happy' | 'concerned' | 'tired'
  delivery: 'calm' | 'gentle'
  emphasis: 0 | 1 | 2
  facialCue: string | null
  variationToken: string
}) {
  const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
  const scope = effectScope()
  const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

  runtime.syncResidentPerformance({
    baseEmotion: input.baseEmotion,
    emotion: input.baseEmotion,
    facialCue: input.facialCue,
    actionCue: input.actionCue,
    delivery: input.delivery,
    emphasis: input.emphasis,
  }, {
    variationToken: input.variationToken,
  })
  await nextTick()

  return {
    runtime,
    scope,
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('stage embodiment performance runtime', () => {
  it('keeps resident reason tags as an iterable array when arming from idle without explicit resident tags', () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    expect(() => {
      runtime.armPerformance(createPerformance(), {
        source: 'dialogue',
        variationToken: 'turn-arm-from-idle-without-resident-tags',
      })
    }).not.toThrow()
    expect(runtime.state.value.residentReasonTags).toEqual([])

    scope.stop()
  })

  it('syncs resident performance without emitting a new action pulse', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    expect(runtime.state.value.actionPulse.revision).toBe(0)

    runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'observe_focus',
      delivery: 'calm',
      emphasis: 1,
    }, {
      variationToken: 'resident:inspection',
    })
    await nextTick()

    expect(runtime.state.value.phase).toBe('idle')
    expect(runtime.state.value.actionPulse.revision).toBe(0)
    expect(runtime.state.value.residentPerformance.baseEmotion).toBe('thinking')
    expect(runtime.state.value.performance.baseEmotion).toBe('thinking')
    expect(runtime.state.value.activeFacialCue).toBe('focus')
    expect(runtime.state.value.activeFacialCueSource).toBe('resident')
    expect(runtime.state.value.activeActionCue).toBe('observe_focus')
    expect(runtime.state.value.activeActionCueSource).toBe('resident')

    scope.stop()
  })

  it('keeps the resident performance baseline armed while preparing the next message', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-prepare',
    })
    await nextTick()

    runtime.prepareForNextMessage()
    await nextTick()

    expect(runtime.state.value.phase).toBe('armed')
    expect(runtime.state.value.performance.baseEmotion).toBe('happy')
    expect(runtime.state.value.activeCueSource).toBe('none')
    expect(runtime.state.value.activeFacialCue).toBe('smile')
    expect(runtime.state.value.activeFacialCueSource).toBe('resident')
    expect(runtime.state.value.activeActionCue).toBe('raise_hand_excited')
    expect(runtime.state.value.activeActionCueSource).toBe('resident')
    expect(runtime.state.value.expressionIntensity).toBeGreaterThan(0.4)
    expect(runtime.state.value.actionPulse.reason).toBeNull()

    scope.stop()
  })

  it('arms dialogue performance and escalates into a speaking pulse when speech starts', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-1',
    })
    await nextTick()

    const armedActionPulseRevision = runtime.state.value.actionPulse.revision
    expect(runtime.state.value.phase).toBe('armed')
    expect(armedActionPulseRevision).toBe(1)

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.68,
        prosodyIntensity: 0.52,
        emphasisLevel: 0.4,
        cadencePulse: 0.66,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-1',
        ownerId: 'alice',
        segmentId: 'segment-1',
        special: null,
        streamId: 'stream-1',
        text: '你好呀',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.62,
    }
    await nextTick()

    expect(runtime.state.value.phase).toBe('speaking')
    expect(runtime.state.value.actionPulse.revision).toBeGreaterThan(armedActionPulseRevision)
    expect(runtime.state.value.motionPulse).toBeGreaterThan(0.75)

    scope.stop()
  })

  it('drops into cooldown and resets back to idle after speech finishes', async () => {
    vi.useFakeTimers()

    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-2',
    })
    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-2',
        segmentId: 'segment-2',
        special: null,
        streamId: 'stream-2',
        text: '好',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.5,
    }
    await nextTick()

    speechRenderState.value = {
      ...createIdleStageEmbodimentSpeechRenderState(),
      revision: 2,
    }
    await nextTick()

    expect(runtime.state.value.phase).toBe('cooldown')

    vi.advanceTimersByTime(800)
    await nextTick()

    expect(runtime.state.value.phase).toBe('idle')
    expect(runtime.state.value.performance.baseEmotion).toBe('neutral')

    scope.stop()
  })

  it('uses segment cue beats to emit cue-specific action pulses', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-3',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.58,
        prosodyIntensity: 0.72,
        emphasisLevel: 0.54,
        cadencePulse: 0.86,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-3',
        segmentId: 'segment-3',
        special: null,
        streamId: 'stream-3',
        text: '现在就点保存。',
        cue: {
          id: 'turn-3:1',
          index: 1,
          startOffset: 4,
          endOffset: 10,
          text: '点保存。',
          emotion: 'thinking',
          gestureWeight: 0.76,
          facialWeight: 0.68,
          prosodyWeight: 0.72,
          beatWeight: 0.88,
          rendererHints: {
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          actionCue: 'nod_soft',
          facialCue: 'focused',
          actionWindow: 'cadence-peak',
          interruptMode: 'soft-interrupt',
        },
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.7,
    }
    await nextTick()

    expect(runtime.state.value.actionPulse.reason).toBe('segment-beat')
    expect(runtime.state.value.actionPulse.cue).toBe('nod_soft')
    expect(runtime.state.value.residentPerformance.facialCue).toBe('smile')
    expect(runtime.state.value.performance.baseEmotion).toBe('thinking')
    expect(runtime.state.value.performance.facialCue).toBe('focused')
    expect(runtime.state.value.activeFacialCue).toBe('focused')
    expect(runtime.state.value.activeFacialCueSource).toBe('segment')
    expect(runtime.state.value.activeCue?.emotion).toBe('thinking')
    expect(runtime.state.value.activeCue?.rendererHints?.preferredExpressionAliases).toEqual(['CalmInspect'])
    expect(runtime.state.value.performance.actionCue).toBe('nod_soft')
    expect(runtime.state.value.activeActionCueSource).toBe('segment')
    expect(runtime.state.value.prosodyDrive).toBeGreaterThan(0.55)

    scope.stop()
  })

  it('suppresses resident action carry when digital-life marks the active segment as still', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-digital-life-still',
    })

    speechRenderState.value = createSpeechRenderStateFixture({
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.42,
        prosodyIntensity: 0.36,
        emphasisLevel: 0.28,
        cadencePulse: 0.34,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-digital-life-still',
        segmentId: 'segment-digital-life-still',
        special: null,
        streamId: 'stream-digital-life-still',
        text: '先别着急。',
        cue: {
          id: 'timeline:segment-digital-life-still',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先别着急。',
          emotion: 'happy',
          gestureWeight: 0.74,
          facialWeight: 0.8,
          prosodyWeight: 0.76,
          beatWeight: 0.72,
          actionCue: 'wave_big',
          facialCue: 'grin',
          actionWindow: 'cadence-peak',
          interruptMode: 'continue',
        },
        digitalLifeFrame: {
          id: 'segment-digital-life-still',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先别着急。',
          mode: 'recovering',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.96,
            energy: 0.54,
            cadence: 0.4,
          },
          lipSync: {
            mode: 'hybrid',
            visemeBias: 0.58,
            energyBias: 0.42,
            mouthScale: 0.9,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'concerned',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.58,
            holdMs: 400,
            rendererHints: {
              preferredExpressionAliases: ['MindCalm'],
            },
          },
          action: {
            actionCue: null,
            actionMode: 'none',
            intensity: 0,
            holdMs: 240,
            rendererHints: {
              preferredMotionAliases: ['StillnessGuard'],
            },
          },
          motor: createRecoveringMotor(),
        },
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.48,
    })
    await nextTick()

    expect(runtime.state.value.performance.baseEmotion).toBe('concerned')
    expect(runtime.state.value.performance.facialCue).toBe('soft-gaze')
    expect(runtime.state.value.activeFacialCue).toBe('soft-gaze')
    expect(runtime.state.value.activeFacialCueSource).toBe('segment')
    expect(runtime.state.value.performance.actionCue).toBeNull()
    expect(runtime.state.value.activeActionCue).toBeNull()
    expect(runtime.state.value.activeActionCueSource).toBe('none')
    expect(runtime.state.value.activeCue?.actionCue).toBeNull()
    expect(runtime.state.value.activeCue?.rendererHints?.preferredExpressionAliases).toEqual(['MindCalm'])
    expect(runtime.state.value.activeCue?.rendererHints?.preferredMotionAliases).toEqual(['StillnessGuard'])
    expect(runtime.state.value.motor.stillness).toBeGreaterThan(0.6)
    expect(runtime.state.value.motor.gaze.focus).toBeGreaterThan(0.65)
    expect(runtime.state.value.motor.facial.mouthRound).toBeGreaterThan(runtime.state.value.motor.facial.mouthSpread)
    expect(runtime.state.value.motor.body.openness).toBeLessThan(0.5)

    scope.stop()
  })

  it('syncs resident performance during speaking without overriding active segment cue', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-speaking-resident',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.52,
        prosodyIntensity: 0.46,
        emphasisLevel: 0.4,
        cadencePulse: 0.42,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-speaking-resident',
        segmentId: 'segment-speaking-resident',
        special: null,
        streamId: 'stream-speaking-resident',
        text: '继续检查这里。',
        cue: {
          id: 'turn-speaking-resident:0',
          index: 0,
          startOffset: 0,
          endOffset: 7,
          text: '继续检查这里。',
          emotion: 'thinking',
          gestureWeight: 0.12,
          facialWeight: 0.44,
          prosodyWeight: 0.42,
          beatWeight: 0.28,
          actionCue: 'nod_soft',
          facialCue: 'focused',
          actionWindow: 'none',
          interruptMode: 'continue',
        },
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.56,
    }
    await nextTick()
    const actionPulseRevision = runtime.state.value.actionPulse.revision

    runtime.syncResidentPerformance({
      baseEmotion: 'concerned',
      emotion: 'concerned',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      delivery: 'gentle',
      emphasis: 1,
    }, {
      allowWhileActive: true,
      variationToken: 'resident-speaking-sync',
    })
    await nextTick()

    expect(runtime.state.value.phase).toBe('speaking')
    expect(runtime.state.value.residentPerformance.baseEmotion).toBe('concerned')
    expect(runtime.state.value.residentPerformance.facialCue).toBe('soft-gaze')
    expect(runtime.state.value.activeFacialCue).toBe('focused')
    expect(runtime.state.value.activeFacialCueSource).toBe('segment')
    expect(runtime.state.value.activeActionCue).toBe('nod_soft')
    expect(runtime.state.value.activeActionCueSource).toBe('segment')
    expect(runtime.state.value.actionPulse.revision).toBe(actionPulseRevision)

    scope.stop()
  })

  it('lets quiet accompaniment resident sync persist as the next idle baseline instead of only a momentary pulse', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      variationToken: 'presence-pulse|quiet-accompaniment',
    })
    await nextTick()

    runtime.prepareForNextMessage()
    await nextTick()

    expect(runtime.state.value.phase).toBe('armed')
    expect(runtime.state.value.residentPerformance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }))
    expect(runtime.state.value.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }))

    scope.stop()
  })

  it('keeps subconscious silent-observe accompaniment resident dynamics distinct from ordinary attentive resident baselines', async () => {
    const baseline = await createResidentIdleRuntime({
      actionCue: 'observe_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      facialCue: 'focus',
      variationToken: 'resident|symbiotic-vision|attentive|subconscious-proactive|silent-observe',
    })
    const quietAccompaniment = await createResidentIdleRuntime({
      actionCue: 'steady_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      facialCue: 'focus',
      variationToken: 'presence-pulse|quiet-accompaniment|subconscious-proactive|silent-observe|continuity:quiet-accompaniment',
    })

    expect(quietAccompaniment.runtime.state.value.phase).toBe('idle')
    expect(quietAccompaniment.runtime.state.value.actionIntensity).toBeGreaterThan(0)
    expect(quietAccompaniment.runtime.state.value.breathDrive).toBeGreaterThan(0)
    expect(quietAccompaniment.runtime.state.value.focusDrive).toBeGreaterThan(0)
    expect(quietAccompaniment.runtime.state.value.actionIntensity).toBeLessThan(baseline.runtime.state.value.actionIntensity)
    expect(quietAccompaniment.runtime.state.value.breathDrive).toBeGreaterThanOrEqual(baseline.runtime.state.value.breathDrive)
    expect(quietAccompaniment.runtime.state.value.focusDrive).toBeGreaterThanOrEqual(baseline.runtime.state.value.focusDrive)
    expect(quietAccompaniment.runtime.state.value.motor.body.openness).toBeLessThanOrEqual(baseline.runtime.state.value.motor.body.openness)

    baseline.scope.stop()
    quietAccompaniment.scope.stop()
  })

  it('keeps durable relationship rhythm resident dynamics slightly more settled than ordinary measured-return during idle carry', async () => {
    const ordinaryMeasuredReturn = await createResidentIdleRuntime({
      actionCue: 'steady_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      facialCue: 'focus',
      variationToken: 'resident|observe-first|baseline',
    })
    ordinaryMeasuredReturn.runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      residentReasonTags: ['continuity:quiet-accompaniment', 'measured-return'],
      variationToken: 'resident|observe-first|baseline',
    })
    await nextTick()

    const durableMeasuredReturn = await createResidentIdleRuntime({
      actionCue: 'steady_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      facialCue: 'focus',
      variationToken: 'resident|observe-first|baseline',
    })
    durableMeasuredReturn.runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      residentReasonTags: ['continuity:quiet-accompaniment', 'measured-return', 'durable-relationship-rhythm'],
      variationToken: 'resident|observe-first|baseline',
    })
    await nextTick()

    expect(durableMeasuredReturn.runtime.state.value.actionIntensity).toBeLessThanOrEqual(ordinaryMeasuredReturn.runtime.state.value.actionIntensity)
    expect(durableMeasuredReturn.runtime.state.value.motor.body.openness).toBeLessThan(ordinaryMeasuredReturn.runtime.state.value.motor.body.openness)
    expect(durableMeasuredReturn.runtime.state.value.motor.body.settle).toBeGreaterThanOrEqual(ordinaryMeasuredReturn.runtime.state.value.motor.body.settle)

    ordinaryMeasuredReturn.scope.stop()
    durableMeasuredReturn.scope.stop()
  })

  it('preserves synthesized measured-return resident authority tags when fallback continuity is rebuilt before runtime sync', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      delivery: 'gentle',
      emphasis: 1,
    }, {
      residentReasonTags: [
        'companionship',
        'quiet-companionship',
        'measured-return',
        'timing:resident-authority',
        'timing-source:resident-authority',
      ],
      variationToken: 'resident|browser-fallback|same-line-measured-return',
    })
    await nextTick()

    expect(runtime.state.value.phase).toBe('idle')
    expect(runtime.state.value.performance.baseEmotion).toBe('thinking')
    expect(runtime.state.value.performance.delivery).toBe('gentle')
    expect(runtime.state.value.performance.actionCue).toBe('observe_focus')
    expect(runtime.state.value.residentReasonTags).toContain('measured-return')
    expect(runtime.state.value.residentReasonTags).toContain('timing:resident-authority')
    expect(runtime.state.value.residentReasonTags).toContain('timing-source:resident-authority')

    scope.stop()
  })

  it('lets protective-watch resident sync persist as a recovery baseline into the next idle window', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.syncResidentPerformance({
      baseEmotion: 'tired',
      emotion: 'tired',
      facialCue: 'soft-gaze',
      actionCue: 'comfort_sway',
      delivery: 'gentle',
      emphasis: 1,
    }, {
      variationToken: 'presence-pulse|protective-watch',
    })
    await nextTick()

    runtime.prepareForNextMessage()
    await nextTick()

    expect(runtime.state.value.phase).toBe('armed')
    expect(runtime.state.value.residentPerformance).toEqual(expect.objectContaining({
      baseEmotion: 'tired',
      facialCue: 'soft-gaze',
      actionCue: 'comfort_sway',
      delivery: 'gentle',
      emphasis: 1,
    }))
    expect(runtime.state.value.performance).toEqual(expect.objectContaining({
      baseEmotion: 'tired',
      facialCue: 'soft-gaze',
      actionCue: 'comfort_sway',
      delivery: 'gentle',
      emphasis: 1,
    }))

    scope.stop()
  })

  it('keeps durable relationship rhythm resident carry settled when preparing the next message', async () => {
    const baselineSpeechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const durableSpeechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const baselineScope = effectScope()
    const durableScope = effectScope()
    const baselineRuntime = baselineScope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState: baselineSpeechRenderState }))!
    const durableRuntime = durableScope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState: durableSpeechRenderState }))!

    baselineRuntime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      residentReasonTags: ['continuity:quiet-accompaniment', 'measured-return'],
      variationToken: 'resident|observe-first|baseline',
    })
    durableRuntime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      residentReasonTags: ['continuity:quiet-accompaniment', 'measured-return', 'durable-relationship-rhythm'],
      variationToken: 'resident|observe-first|baseline',
    })
    await nextTick()

    baselineRuntime.prepareForNextMessage()
    durableRuntime.prepareForNextMessage()
    await nextTick()

    expect(baselineRuntime.state.value.phase).toBe('armed')
    expect(durableRuntime.state.value.phase).toBe('armed')
    expect(durableRuntime.state.value.residentReasonTags).toContain('durable-relationship-rhythm')
    expect(durableRuntime.state.value.actionIntensity).toBeLessThanOrEqual(baselineRuntime.state.value.actionIntensity)
    expect(durableRuntime.state.value.motor.body.openness).toBeLessThanOrEqual(baselineRuntime.state.value.motor.body.openness)
    expect(durableRuntime.state.value.motor.body.settle).toBeGreaterThanOrEqual(baselineRuntime.state.value.motor.body.settle)
    expect(durableRuntime.state.value.focusDrive).toBeGreaterThanOrEqual(baselineRuntime.state.value.focusDrive)

    baselineScope.stop()
    durableScope.stop()
  })

  it('keeps durable relationship rhythm lightly present through the next speaking turn instead of dropping to an ordinary measured-return baseline when dialogue resumes', async () => {
    const baselineSpeechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const durableSpeechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const baselineScope = effectScope()
    const durableScope = effectScope()
    const baselineRuntime = baselineScope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState: baselineSpeechRenderState }))!
    const durableRuntime = durableScope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState: durableSpeechRenderState }))!

    baselineRuntime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      residentReasonTags: ['continuity:quiet-accompaniment', 'measured-return'],
      variationToken: 'resident|observe-first|baseline',
    })
    durableRuntime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      residentReasonTags: ['continuity:quiet-accompaniment', 'measured-return', 'durable-relationship-rhythm'],
      variationToken: 'resident|observe-first|baseline',
    })
    await nextTick()

    baselineRuntime.prepareForNextMessage()
    durableRuntime.prepareForNextMessage()
    await nextTick()

    baselineRuntime.armPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      source: 'dialogue',
      variationToken: 'turn-durable-rhythm-speaking-resume',
    })
    durableRuntime.armPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      source: 'dialogue',
      variationToken: 'turn-durable-rhythm-speaking-resume',
    })
    await nextTick()

    baselineSpeechRenderState.value = {
      ...baselineSpeechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.22,
        prosodyIntensity: 0.24,
        emphasisLevel: 0.14,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-durable-rhythm-speaking-resume',
        ownerId: 'alice',
        segmentId: 'segment-durable-rhythm-speaking-resume',
        special: null,
        streamId: 'stream-durable-rhythm-speaking-resume',
        text: '嗯，我还在。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.24,
    }
    durableSpeechRenderState.value = {
      ...durableSpeechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.22,
        prosodyIntensity: 0.24,
        emphasisLevel: 0.14,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-durable-rhythm-speaking-resume',
        ownerId: 'alice',
        segmentId: 'segment-durable-rhythm-speaking-resume',
        special: null,
        streamId: 'stream-durable-rhythm-speaking-resume',
        text: '嗯，我还在。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.24,
    }
    await nextTick()

    expect(baselineRuntime.state.value.residentReasonTags).toEqual(['continuity:quiet-accompaniment', 'measured-return'])
    expect(durableRuntime.state.value.residentReasonTags).toEqual(['continuity:quiet-accompaniment', 'measured-return', 'durable-relationship-rhythm'])
    expect(baselineRuntime.state.value.phase).toBe('speaking')
    expect(durableRuntime.state.value.phase).toBe('speaking')
    expect(durableRuntime.state.value.actionIntensity).toBeLessThanOrEqual(baselineRuntime.state.value.actionIntensity)
    expect(durableRuntime.state.value.expressionIntensity).toBeLessThanOrEqual(baselineRuntime.state.value.expressionIntensity)
    expect(durableRuntime.state.value.motor.body.openness).toBeLessThanOrEqual(baselineRuntime.state.value.motor.body.openness)
    expect(durableRuntime.state.value.motor.body.settle).toBeGreaterThanOrEqual(baselineRuntime.state.value.motor.body.settle)
    expect(durableRuntime.state.value.focusDrive).toBeGreaterThanOrEqual(baselineRuntime.state.value.focusDrive)

    baselineScope.stop()
    durableScope.stop()
  })

  it('preserves resident relationship provenance across dialogue arming so the same companionship rhythm stays explicit before speech begins', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      residentReasonTags: ['continuity:quiet-accompaniment', 'measured-return', 'durable-relationship-rhythm'],
      variationToken: 'resident|observe-first|baseline',
    })
    await nextTick()

    runtime.armPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      source: 'dialogue',
      variationToken: 'turn-durable-rhythm-provenance',
    })
    await nextTick()

    expect(runtime.state.value.phase).toBe('armed')
    expect(runtime.state.value.residentReasonTags).toEqual(['continuity:quiet-accompaniment', 'measured-return', 'durable-relationship-rhythm'])
    expect(runtime.state.value.performance.delivery).toBe('gentle')
    expect(runtime.state.value.activeFacialCueSource).toBe('resident')
    expect(runtime.state.value.activeActionCueSource).toBe('resident')

    scope.stop()
  })

  it('keeps quiet accompaniment lightly alive during idle instead of collapsing to a zero-drive reset', async () => {
    const baseline = await createResidentIdleRuntime({
      actionCue: 'observe_focus',
      baseEmotion: 'thinking',
      delivery: 'calm',
      emphasis: 1,
      facialCue: 'focus',
      variationToken: 'resident|symbiotic-vision|attentive',
    })
    const quiet = await createResidentIdleRuntime({
      actionCue: 'steady_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      facialCue: 'focus',
      variationToken: 'presence-pulse|quiet-accompaniment',
    })

    expect(quiet.runtime.state.value.phase).toBe('idle')
    expect(quiet.runtime.state.value.actionIntensity).toBeGreaterThan(0)
    expect(quiet.runtime.state.value.breathDrive).toBeGreaterThan(0)
    expect(quiet.runtime.state.value.focusDrive).toBeGreaterThan(0)
    expect(quiet.runtime.state.value.actionIntensity).toBeLessThan(baseline.runtime.state.value.actionIntensity)
    expect(quiet.runtime.state.value.breathDrive).toBeGreaterThanOrEqual(baseline.runtime.state.value.breathDrive)
    expect(quiet.runtime.state.value.focusDrive).toBeGreaterThanOrEqual(baseline.runtime.state.value.focusDrive)

    baseline.scope.stop()
    quiet.scope.stop()
  })

  it('keeps protective-watch idle recovery dynamics distinct from ordinary concern', async () => {
    const baseline = await createResidentIdleRuntime({
      actionCue: 'comfort_settle',
      baseEmotion: 'concerned',
      delivery: 'calm',
      emphasis: 1,
      facialCue: 'soft-gaze',
      variationToken: 'resident|recovering|concerned',
    })
    const protective = await createResidentIdleRuntime({
      actionCue: 'comfort_sway',
      baseEmotion: 'tired',
      delivery: 'gentle',
      emphasis: 1,
      facialCue: 'soft-gaze',
      variationToken: 'presence-pulse|protective-watch',
    })

    expect(protective.runtime.state.value.phase).toBe('idle')
    expect(protective.runtime.state.value.actionIntensity).toBeGreaterThan(0)
    expect(protective.runtime.state.value.breathDrive).toBeGreaterThan(0)
    expect(protective.runtime.state.value.focusDrive).toBeGreaterThan(0)
    expect(protective.runtime.state.value.actionIntensity).toBeLessThan(baseline.runtime.state.value.actionIntensity)
    expect(protective.runtime.state.value.breathDrive).toBeGreaterThanOrEqual(baseline.runtime.state.value.breathDrive)
    expect(protective.runtime.state.value.focusDrive).toBeGreaterThanOrEqual(baseline.runtime.state.value.focusDrive)
    expect(protective.runtime.state.value.motor.body.openness).toBeLessThan(baseline.runtime.state.value.motor.body.openness)

    baseline.scope.stop()
    protective.scope.stop()
  })

  it('lets persona proactive bias tilt idle runtime dynamics between observe-first and direct reconnect', async () => {
    const observant = await createResidentIdleRuntime({
      actionCue: 'steady_focus',
      baseEmotion: 'thinking',
      delivery: 'calm',
      emphasis: 0,
      facialCue: 'focus',
      variationToken: 'presence-pulse|quiet-accompaniment|persona:observant',
    })
    const direct = await createResidentIdleRuntime({
      actionCue: 'steady_focus',
      baseEmotion: 'thinking',
      delivery: 'calm',
      emphasis: 0,
      facialCue: 'focus',
      variationToken: 'presence-pulse|quiet-accompaniment|persona:direct',
    })

    expect(observant.runtime.state.value.focusDrive).toBeGreaterThan(0)
    expect(direct.runtime.state.value.actionIntensity).toBeGreaterThan(0)
    expect(direct.runtime.state.value.actionIntensity).toBeGreaterThanOrEqual(observant.runtime.state.value.actionIntensity)
    expect(observant.runtime.state.value.focusDrive).toBeGreaterThanOrEqual(direct.runtime.state.value.focusDrive)

    observant.scope.stop()
    direct.scope.stop()
  })

  it('lets long-horizon lower-pressure timing keep idle runtime dynamics quieter even when resident performance stays the same', async () => {
    const baselineDigest = ref(createDigitalLifeSpineDigest({
      confidence: 0.76,
      dominantSystem: 'memory',
      operatingMode: 'observing',
      recallMode: 'working-memory',
      watchMode: 'symbiotic-vision',
    }))
    baselineDigest.value = {
      ...baselineDigest.value,
      proactive: {
        ...baselineDigest.value.proactive!,
        selectedAction: 'hover',
        preferredStyle: 'silent-observe',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'stay nearby without pressing in.',
        },
      },
    }

    const lowerPressureDigest = ref({
      ...baselineDigest.value,
      embodiment: {
        privateThought: null,
        selfContinuity: null,
        autobiographicalSelf: {
          attachmentStyle: null,
          expressionStyle: null,
          conflictStyle: null,
          agencyStyle: null,
          attachmentNeed: null,
          autonomyNeed: null,
          truthAnchor: null,
          careBias: null,
          playBias: null,
          irritabilityThreshold: null,
          stubbornness: null,
          companionship: null,
          truthfulGrounding: null,
          gentleRepair: null,
          quietObservation: null,
          proactiveCare: null,
          playfulIntimacy: null,
          autonomyRespect: null,
          unfinishedThreadReturn: null,
          stability: null,
          identityNarrative: null,
          relationshipDoctrine: 'Repair should settle before closeness expands, and the opening should keep more room.',
        },
        relationship: null,
        selfState: null,
        mindEcology: null,
        initiative: null,
      },
      outcomeLearning: {
        reflectionTargetScope: 'relationship',
        reflectionSummary: 'The room stayed warmer when pressure stayed low.',
        reflectionLesson: 'Keep more room before widening closeness again.',
        latestInflection: 'The last seam held because pressure stayed low and the return stayed slower.',
        revisionPressure: 0.22,
        autobiographicalStability: 0.86,
        learningReadiness: 0.8,
        contradictionPressure: 0.16,
        dominantTrajectory: 'lower-pressure timing preserves trust',
        activeLearningFocuses: ['relationship timing'],
        evolutionMomentum: 0.84,
        nextLearningAction: 'internalize',
        nextLearningReason: 'The relationship line is stabilizing around slower re-entry.',
        summary: 'Repair should settle before closeness expands, and the opening should keep more room.',
      },
    } satisfies AlicizationDigitalLifeSpineDigest)

    const baselineSpeech = ref(createIdleStageEmbodimentSpeechRenderState())
    const lowerPressureSpeech = ref(createIdleStageEmbodimentSpeechRenderState())
    const baselineScope = effectScope()
    const lowerPressureScope = effectScope()
    const baselineRuntime = baselineScope.run(() => useStageEmbodimentPerformanceRuntime({
      digitalLifeSpineDigest: baselineDigest,
      speechRenderState: baselineSpeech,
    }))!
    const lowerPressureRuntime = lowerPressureScope.run(() => useStageEmbodimentPerformanceRuntime({
      digitalLifeSpineDigest: lowerPressureDigest,
      speechRenderState: lowerPressureSpeech,
    }))!

    baselineRuntime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      variationToken: 'resident|observe-first|baseline',
    })
    lowerPressureRuntime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      residentReasonTags: ['continuity:quiet-accompaniment', 'measured-return'],
      variationToken: 'resident|observe-first|baseline',
    })
    await nextTick()

    expect(lowerPressureRuntime.state.value.actionIntensity).toBeLessThan(baselineRuntime.state.value.actionIntensity)
    expect(lowerPressureRuntime.state.value.breathDrive).toBeGreaterThanOrEqual(baselineRuntime.state.value.breathDrive)
    expect(lowerPressureRuntime.state.value.focusDrive).toBeGreaterThanOrEqual(baselineRuntime.state.value.focusDrive)
    expect(lowerPressureRuntime.state.value.motor.breath.pace).toBeGreaterThanOrEqual(baselineRuntime.state.value.motor.breath.pace)

    baselineScope.stop()
    lowerPressureScope.stop()
  })

  it('previews the next speech segment cue before buffered playback starts', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      speechRenderState,
      upcomingSpeechSegment,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-preview',
    })

    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-preview',
      segmentId: 'segment-preview',
      special: null,
      streamId: 'stream-preview',
      text: '先看这里，',
      cue: {
        id: 'turn-preview:0',
        index: 0,
        startOffset: 0,
        endOffset: 5,
        text: '先看这里，',
        emotion: 'thinking',
        gestureWeight: 0.7,
        facialWeight: 0.56,
        prosodyWeight: 0.48,
        beatWeight: 0.34,
        rendererHints: {
          preferredExpressionAliases: ['CalmInspect'],
          preferredMotionAliases: ['ObserveSoft'],
        },
        actionCue: 'point_screen',
        facialCue: 'focused',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
      },
    })
    await nextTick()

    const previewPulseRevision = runtime.state.value.actionPulse.revision
    expect(runtime.state.value.phase).toBe('armed')
    expect(runtime.state.value.actionPulse.reason).toBe('segment-preview')
    expect(runtime.state.value.actionPulse.cue).toBe('point_screen')
    expect(runtime.state.value.performance.baseEmotion).toBe('thinking')
    expect(runtime.state.value.performance.actionCue).toBe('point_screen')
    expect(runtime.state.value.activeActionCueSource).toBe('preview')
    expect(runtime.state.value.activeFacialCueSource).toBe('preview')
    expect(runtime.state.value.activeCueSource).toBe('preview')

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.44,
        prosodyIntensity: 0.4,
        emphasisLevel: 0.32,
        cadencePulse: 0.38,
      },
      item: upcomingSpeechSegment.value,
      phase: 'starting',
      revision: 1,
      visemeIntensity: 0.24,
    }
    upcomingSpeechSegment.value = null
    await nextTick()

    expect(runtime.state.value.actionPulse.revision).toBeGreaterThan(previewPulseRevision)
    expect(runtime.state.value.actionPulse.reason).toBe('segment-start')
    expect(runtime.state.value.activeActionCueSource).toBe('segment')
    expect(runtime.state.value.activeFacialCueSource).toBe('segment')
    expect(runtime.state.value.activeCueSource).toBe('segment')

    scope.stop()
  })

  it('consumes playback-driver pre-utterance face cues during preview before resident fallback', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      speechRenderState,
      upcomingSpeechSegment,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-preview-driver-face',
    })

    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-preview-driver-face',
      segmentId: 'segment-preview-driver-face',
      special: null,
      streamId: 'stream-preview-driver-face',
      text: '先缓一下，',
      metadata: {
        embodimentPlayback: {
          actualDurationMs: 0,
          driftMs: 0,
          plannedDurationMs: 0,
          settleMs: 260,
          stopReason: null,
          drivers: {
            face: {
              emotion: 'happy',
              facialCue: 'soft-breath',
              intensity: 0.58,
              playbackPhase: 'idle',
              preUtteranceCue: 'soft-breath',
              postUtteranceCue: 'settle-smile',
            },
            lipsync: null,
            motion: null,
          },
        },
      },
    })
    await nextTick()

    expect(runtime.state.value.phase).toBe('armed')
    expect(runtime.state.value.activeFacialCue).toBe('soft-breath')
    expect(runtime.state.value.activeFacialCueSource).toBe('preview')
    expect(runtime.state.value.performance.facialCue).toBe('soft-breath')
    expect(runtime.state.value.activeActionCue).toBe('raise_hand_excited')
    expect(runtime.state.value.activeActionCueSource).toBe('resident')

    scope.stop()
  })

  it('keeps resident cues when preview driver confidence is too low to override them', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      speechRenderState,
      upcomingSpeechSegment,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-preview-low-confidence',
    })

    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-preview-low-confidence',
      segmentId: 'segment-preview-low-confidence',
      special: null,
      streamId: 'stream-preview-low-confidence',
      text: '先缓一下，',
      metadata: {
        embodimentPlayback: {
          actualDurationMs: 0,
          driftMs: 0,
          plannedDurationMs: 0,
          settleMs: 260,
          stopReason: null,
          drivers: {
            face: {
              emotion: 'happy',
              facialCue: 'soft-breath',
              intensity: 0.58,
              holdMs: 220,
              preUtteranceCue: 'soft-breath',
              postUtteranceCue: 'settle-smile',
              segmentId: 'segment-preview-low-confidence',
              source: 'prosody-authority',
              confidence: 0.28,
            },
            lipsync: null,
            motion: {
              idleBase: 'idle_settle',
              attentionMode: 'attentive',
              actionCue: 'point_screen',
              intensity: 0.52,
              holdMs: 180,
              segmentId: 'segment-preview-low-confidence',
              source: 'timeline-projection',
              confidence: 0.24,
            },
          },
        },
      },
    })
    await nextTick()

    expect(runtime.state.value.phase).toBe('armed')
    expect(runtime.state.value.activeFacialCue).toBe('smile')
    expect(runtime.state.value.activeFacialCueSource).toBe('resident')
    expect(runtime.state.value.activeActionCue).toBe('raise_hand_excited')
    expect(runtime.state.value.activeActionCueSource).toBe('resident')

    scope.stop()
  })

  it('switches to the queued preview cue during the stopping tail between segments', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      speechRenderState,
      upcomingSpeechSegment,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-preview-tail',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.14,
        prosodyIntensity: 0.2,
        emphasisLevel: 0.12,
        cadencePulse: 0.16,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-tail-1',
        segmentId: 'segment-tail-1',
        special: null,
        streamId: 'stream-tail',
        text: '先看这里，',
        cue: {
          id: 'turn-preview-tail:0',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里，',
          gestureWeight: 0.5,
          facialWeight: 0.46,
          prosodyWeight: 0.4,
          beatWeight: 0.24,
          actionCue: 'hold_focus',
          facialCue: 'focused',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        },
      }),
      phase: 'stopping',
      revision: 1,
      visemeIntensity: 0.08,
    }
    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-tail-2',
      segmentId: 'segment-tail-2',
      special: null,
      streamId: 'stream-tail',
      text: '然后点保存！',
      cue: {
        id: 'turn-preview-tail:1',
        index: 1,
        startOffset: 5,
        endOffset: 11,
        text: '然后点保存！',
        gestureWeight: 0.74,
        facialWeight: 0.58,
        prosodyWeight: 0.5,
        beatWeight: 0.36,
        actionCue: 'point_screen',
        facialCue: 'focused',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
      },
    })
    await nextTick()

    expect(runtime.state.value.actionPulse.reason).toBe('segment-preview')
    expect(runtime.state.value.actionPulse.cue).toBe('point_screen')
    expect(runtime.state.value.activeActionCueSource).toBe('preview')
    expect(runtime.state.value.activeFacialCueSource).toBe('preview')

    scope.stop()
  })

  it('promotes a later-living-line preview during interruption tail without losing the same-her callback restraint line', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      speechRenderState,
      upcomingSpeechSegment,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-interrupt-callback-tail',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.16,
        prosodyIntensity: 0.18,
        emphasisLevel: 0.1,
        cadencePulse: 0.14,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-interrupt-callback-tail-1',
        segmentId: 'segment-earlier-callback-shell',
        special: null,
        streamId: 'stream-interrupt-callback-tail',
        text: '先别急。',
        cue: {
          id: 'segment-later-callback-return',
          index: 1,
          startOffset: 0,
          endOffset: 3,
          text: '先别急。',
          gestureWeight: 0.18,
          facialWeight: 0.41,
          prosodyWeight: 0.38,
          beatWeight: 0.2,
          mouthWeight: 0.34,
          headWeight: 0.18,
          facialHoldMs: 360,
          actionHoldMs: 320,
          emotionHoldMs: 360,
          actionCue: 'idle_settle',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'hold',
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredExpressionAliases: ['RecoverSoft'],
            preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 380,
            live2dMotionFollowThroughMs: 460,
            vrmActionFadeMs: 460,
            vrmExpressionBlendMs: 540,
          },
        },
      }),
      phase: 'stopping',
      revision: 1,
      visemeIntensity: 0.08,
    }

    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-interrupt-callback-tail-2',
      segmentId: 'segment-later-callback-return',
      special: null,
      streamId: 'stream-interrupt-callback-tail',
      text: '我还在，只是先别一下子靠太近。',
      cue: {
        id: 'segment-later-callback-return',
        index: 1,
        startOffset: 3,
        endOffset: 18,
        text: '我还在，只是先别一下子靠太近。',
        gestureWeight: 0.18,
        facialWeight: 0.32,
        prosodyWeight: 0.3,
        beatWeight: 0.18,
        mouthWeight: 0.24,
        headWeight: 0.16,
        facialHoldMs: 360,
        actionHoldMs: 320,
        emotionHoldMs: 380,
        actionCue: 'idle_settle',
        facialCue: 'soft-gaze',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        settleMode: 'hold',
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 380,
          live2dMotionFollowThroughMs: 460,
          vrmActionFadeMs: 460,
          vrmExpressionBlendMs: 540,
        },
      },
    })
    await nextTick()

    expect(runtime.state.value.actionPulse.reason).toBe('segment-preview')
    expect(runtime.state.value.actionPulse.cue).toBe('idle_settle')
    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeFacialCueSource).toBe('preview')
    expect(runtime.state.value.activeActionCueSource).toBe('preview')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-later-callback-return',
      facialCue: 'soft-gaze',
      actionCue: 'idle_settle',
      rendererHints: expect.objectContaining({
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
      }),
    }))

    scope.stop()
  })

  it('keeps a measured-return preview reopen lightly carried by the stopping mouth tail instead of snapping fully to the softer preview floor', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      speechRenderState,
      upcomingSpeechSegment,
    }))!

    runtime.armPerformance(createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }), {
      source: 'dialogue',
      variationToken: 'turn-measured-return-mouth-tail-preview-carry',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.2,
        emphasisLevel: 0.12,
        cadencePulse: 0.18,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-measured-return-mouth-tail-preview-carry',
        segmentId: 'segment-measured-return-mouth-tail-preview-carry',
        special: null,
        streamId: 'stream-measured-return-mouth-tail-preview-carry',
        text: '我会慢慢收回来。',
        cue: {
          id: 'segment-measured-return-mouth-tail-preview-carry',
          index: 0,
          startOffset: 0,
          endOffset: 8,
          text: '我会慢慢收回来。',
          emotion: 'thinking',
          gestureWeight: 0.18,
          facialWeight: 0.42,
          prosodyWeight: 0.28,
          beatWeight: 0.18,
          mouthWeight: 0.34,
          headWeight: 0.16,
          facialHoldMs: 360,
          actionHoldMs: 280,
          emotionHoldMs: 320,
          actionCue: 'steady_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'none',
          interruptMode: 'soft-interrupt',
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
          },
        },
        digitalLifeFrame: {
          id: 'segment-measured-return-mouth-tail-preview-carry',
          index: 0,
          startOffset: 0,
          endOffset: 8,
          text: '我会慢慢收回来。',
          mode: 'recovering',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.34,
            cadence: 0.28,
          },
          lipSync: {
            mode: 'hybrid',
            visemeBias: 0.56,
            energyBias: 0.34,
            mouthScale: 0.82,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 360,
            rendererHints: {
              residentMode: 'measured-return',
              preferredGazeMode: 'soften',
              preferredBlinkCadence: 'linger',
            },
          },
          action: {
            actionCue: 'steady_focus',
            actionMode: 'hold',
            intensity: 0.18,
            holdMs: 280,
            rendererHints: {
              residentMode: 'measured-return',
              preferredGazeMode: 'soften',
              preferredBlinkCadence: 'linger',
            },
          },
          motor: createRecoveringMotor(),
        },
      }),
      phase: 'stopping',
      revision: 1,
      mouthOpenSize: 18,
      mouthOpenRatio: 0.18,
      visemeIntensity: 0.18,
    }
    await nextTick()

    const stoppingProsodyDrive = runtime.state.value.prosodyDrive
    const stoppingBreathDrive = runtime.state.value.breathDrive
    const stoppingExpressionIntensity = runtime.state.value.expressionIntensity

    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-measured-return-mouth-tail-preview-carry-next',
      segmentId: 'segment-measured-return-mouth-tail-preview-carry-next',
      special: null,
      streamId: 'stream-measured-return-mouth-tail-preview-carry',
      text: '嗯，我还在。',
      cue: {
        id: 'segment-measured-return-mouth-tail-preview-carry-next',
        index: 1,
        startOffset: 8,
        endOffset: 14,
        text: '嗯，我还在。',
        emotion: 'thinking',
        gestureWeight: 0.12,
        facialWeight: 0.22,
        prosodyWeight: 0.14,
        beatWeight: 0.1,
        mouthWeight: 0.1,
        headWeight: 0.1,
        facialHoldMs: 320,
        actionHoldMs: 260,
        emotionHoldMs: 320,
        actionCue: null,
        facialCue: 'soft-gaze',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'measured-return',
          preferredGazeMode: 'soften',
          preferredBlinkCadence: 'linger',
        },
      },
      digitalLifeFrame: {
        id: 'segment-measured-return-mouth-tail-preview-carry-next',
        index: 1,
        startOffset: 8,
        endOffset: 14,
        text: '嗯，我还在。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
          energy: 0.22,
          cadence: 0.16,
        },
        lipSync: {
          mode: 'closed',
          visemeBias: 0.34,
          energyBias: 0.22,
          mouthScale: 0.62,
          continuityHoldMs: 220,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.22,
          holdMs: 320,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
          },
        },
        action: {
          actionCue: null,
          actionMode: 'none',
          intensity: 0.06,
          holdMs: 260,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
          },
        },
        motor: createRecoveringMotor(),
      },
    })
    await nextTick()

    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.prosodyDrive).toBeGreaterThan(0.12)
    expect(runtime.state.value.breathDrive).toBeGreaterThan(0.12)
    expect(runtime.state.value.expressionIntensity).toBeGreaterThan(0.12)
    expect(runtime.state.value.prosodyDrive).toBeLessThanOrEqual(stoppingProsodyDrive)
    expect(runtime.state.value.breathDrive).toBeLessThanOrEqual(stoppingBreathDrive)
    expect(runtime.state.value.expressionIntensity).toBeGreaterThanOrEqual(stoppingExpressionIntensity)

    scope.stop()
  })

  it('keeps durable relationship rhythm more settled than ordinary measured-return during same-line preview reopen', async () => {
    const createMeasuredReturnReopenRuntime = () => {
      const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
      const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
      const scope = effectScope()
      const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
        speechRenderState,
        upcomingSpeechSegment,
      }))!

      return {
        runtime,
        scope,
        speechRenderState,
        upcomingSpeechSegment,
      }
    }

    const ordinary = createMeasuredReturnReopenRuntime()
    const durable = createMeasuredReturnReopenRuntime()

    ordinary.runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      residentReasonTags: ['continuity:quiet-accompaniment', 'measured-return'],
      variationToken: 'resident|ordinary-measured-return-reopen',
    })
    durable.runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }, {
      residentReasonTags: ['continuity:quiet-accompaniment', 'measured-return', 'durable-relationship-rhythm'],
      variationToken: 'resident|durable-relationship-rhythm|measured-return-reopen',
    })
    await nextTick()

    for (const candidate of [ordinary, durable]) {
      candidate.runtime.armPerformance(createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      }), {
        source: 'dialogue',
        variationToken: 'turn-durable-measured-return-reopen',
      })
      candidate.speechRenderState.value = {
        ...candidate.speechRenderState.value,
        active: true,
        dynamics: {
          speechEnergy: 0.18,
          prosodyIntensity: 0.2,
          emphasisLevel: 0.12,
          cadencePulse: 0.18,
        },
        item: createStageEmbodimentSpeechPlaybackItem({
          intentId: 'intent-durable-measured-return-reopen',
          segmentId: 'segment-durable-measured-return-reopen',
          special: null,
          streamId: 'stream-durable-measured-return-reopen',
          text: '我会慢慢收回来。',
          cue: {
            id: 'segment-durable-measured-return-reopen',
            index: 0,
            startOffset: 0,
            endOffset: 8,
            text: '我会慢慢收回来。',
            emotion: 'thinking',
            gestureWeight: 0.18,
            facialWeight: 0.42,
            prosodyWeight: 0.28,
            beatWeight: 0.18,
            mouthWeight: 0.34,
            headWeight: 0.16,
            facialHoldMs: 360,
            actionHoldMs: 280,
            emotionHoldMs: 320,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'none',
            interruptMode: 'soft-interrupt',
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredGazeMode: 'soften',
              preferredBlinkCadence: 'linger',
            },
          },
          digitalLifeFrame: {
            id: 'segment-durable-measured-return-reopen',
            index: 0,
            startOffset: 0,
            endOffset: 8,
            text: '我会慢慢收回来。',
            mode: 'recovering',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            voice: {
              pitchDelta: -2,
              rateMultiplier: 0.95,
              energy: 0.34,
              cadence: 0.28,
            },
            lipSync: {
              mode: 'hybrid',
              visemeBias: 0.56,
              energyBias: 0.34,
              mouthScale: 0.82,
              continuityHoldMs: 320,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.42,
              holdMs: 360,
              rendererHints: {
                residentMode: 'measured-return',
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
              },
            },
            action: {
              actionCue: 'steady_focus',
              actionMode: 'hold',
              intensity: 0.18,
              holdMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
              },
            },
            motor: createRecoveringMotor(),
          },
        }),
        phase: 'stopping',
        revision: 1,
        mouthOpenSize: 18,
        mouthOpenRatio: 0.18,
        visemeIntensity: 0.18,
      }
    }
    await nextTick()

    ordinary.upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-durable-measured-return-reopen-next',
      segmentId: 'segment-durable-measured-return-reopen-next',
      special: null,
      streamId: 'stream-durable-measured-return-reopen',
      text: '嗯，我还在。',
      cue: {
        id: 'segment-durable-measured-return-reopen-next',
        index: 1,
        startOffset: 8,
        endOffset: 14,
        text: '嗯，我还在。',
        emotion: 'thinking',
        gestureWeight: 0.12,
        facialWeight: 0.22,
        prosodyWeight: 0.14,
        beatWeight: 0.1,
        mouthWeight: 0.1,
        headWeight: 0.1,
        facialHoldMs: 320,
        actionHoldMs: 260,
        emotionHoldMs: 320,
        actionCue: null,
        facialCue: 'soft-gaze',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'measured-return',
          preferredGazeMode: 'soften',
          preferredBlinkCadence: 'linger',
        },
      },
      digitalLifeFrame: {
        id: 'segment-durable-measured-return-reopen-next',
        index: 1,
        startOffset: 8,
        endOffset: 14,
        text: '嗯，我还在。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
          energy: 0.22,
          cadence: 0.16,
        },
        lipSync: {
          mode: 'closed',
          visemeBias: 0.34,
          energyBias: 0.22,
          mouthScale: 0.62,
          continuityHoldMs: 220,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.22,
          holdMs: 320,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
          },
        },
        action: {
          actionCue: null,
          actionMode: 'none',
          intensity: 0.06,
          holdMs: 260,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
          },
        },
        motor: createRecoveringMotor(),
      },
    })
    durable.upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      ...ordinary.upcomingSpeechSegment.value!,
      cue: ordinary.upcomingSpeechSegment.value!.cue ? { ...ordinary.upcomingSpeechSegment.value!.cue } : null,
      digitalLifeFrame: ordinary.upcomingSpeechSegment.value!.digitalLifeFrame
        ? {
            ...ordinary.upcomingSpeechSegment.value!.digitalLifeFrame,
            face: { ...ordinary.upcomingSpeechSegment.value!.digitalLifeFrame.face },
            action: { ...ordinary.upcomingSpeechSegment.value!.digitalLifeFrame.action },
            lipSync: { ...ordinary.upcomingSpeechSegment.value!.digitalLifeFrame.lipSync },
            voice: { ...ordinary.upcomingSpeechSegment.value!.digitalLifeFrame.voice },
            motor: createRecoveringMotor(),
          }
        : null,
    })
    await nextTick()

    expect(durable.runtime.state.value.activeCueSource).toBe('preview')
    expect(ordinary.runtime.state.value.activeCueSource).toBe('preview')
    expect(durable.runtime.state.value.expressionIntensity).toBeLessThanOrEqual(ordinary.runtime.state.value.expressionIntensity)
    expect(durable.runtime.state.value.actionIntensity).toBeLessThanOrEqual(ordinary.runtime.state.value.actionIntensity)
    expect(durable.runtime.state.value.motor.body.settle).toBeGreaterThanOrEqual(ordinary.runtime.state.value.motor.body.settle)
    expect(durable.runtime.state.value.focusDrive).toBeGreaterThanOrEqual(ordinary.runtime.state.value.focusDrive)

    ordinary.scope.stop()
    durable.scope.stop()
  })

  it('keeps playback-driver post-utterance face cues through the stopping cooldown tail', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-post-driver-face',
    })

    const stoppedItem = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-post-driver-face',
      segmentId: 'segment-post-driver-face',
      special: null,
      streamId: 'stream-post-driver-face',
      text: '先到这里。',
      metadata: {
        embodimentPlayback: {
          actualDurationMs: 520,
          driftMs: 0,
          plannedDurationMs: 520,
          settleMs: 280,
          stopReason: 'ended',
          drivers: {
            face: {
              emotion: 'happy',
              facialCue: 'settle-smile',
              intensity: 0.62,
              playbackPhase: 'idle',
              preUtteranceCue: 'soft-breath',
              postUtteranceCue: 'settle-smile',
            },
            lipsync: null,
            motion: null,
          },
        },
      },
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.24,
        emphasisLevel: 0.16,
        cadencePulse: 0.2,
      },
      item: stoppedItem,
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
    }
    await nextTick()

    speechRenderState.value = {
      ...speechRenderState.value,
      active: false,
      item: stoppedItem,
      phase: 'idle',
      revision: 2,
      visemeIntensity: 0,
    }
    await nextTick()

    expect(runtime.state.value.phase).toBe('cooldown')
    expect(runtime.state.value.speechPhase).toBe('idle')
    expect(runtime.state.value.activeFacialCue).toBe('settle-smile')
    expect(runtime.state.value.activeFacialCueSource).toBe('preview')
    expect(runtime.state.value.performance.facialCue).toBe('settle-smile')
    expect(runtime.state.value.activeActionCue).toBe('raise_hand_excited')
    expect(runtime.state.value.activeActionCueSource).toBe('resident')

    scope.stop()
  })

  it('keeps measured-return live2d stop-tail face authority on the same softer body line while the mouth tail is still settling', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-live2d-stop-tail-same-body',
    })

    const stoppedItem = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-live2d-stop-tail-same-body',
      segmentId: 'segment-live2d-stop-tail-same-body',
      special: null,
      streamId: 'stream-live2d-stop-tail-same-body',
      text: '我会慢慢收回来。',
      continuityHoldMs: 320,
      digitalLifeFrame: {
        id: 'segment-live2d-stop-tail-same-body',
        index: 0,
        startOffset: 0,
        endOffset: 8,
        text: '我会慢慢收回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.94,
          energy: 0.36,
          cadence: 0.28,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.56,
          energyBias: 0.34,
          mouthScale: 0.82,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
          },
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 280,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
          },
        },
        motor: createRecoveringMotor(),
      },
      metadata: {
        embodimentPlayback: {
          actualDurationMs: 520,
          driftMs: 0,
          plannedDurationMs: 520,
          settleMs: 320,
          stopReason: 'ended',
          rendererTarget: 'live2d',
          cue: {
            id: 'segment-live2d-stop-tail-same-body',
            index: 0,
            startOffset: 0,
            endOffset: 8,
            text: '我会慢慢收回来。',
            emotion: 'thinking',
            gestureWeight: 0.18,
            facialWeight: 0.44,
            prosodyWeight: 0.24,
            beatWeight: 0.18,
            mouthWeight: 0.28,
            headWeight: 0.18,
            facialHoldMs: 360,
            actionHoldMs: 280,
            emotionHoldMs: 320,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredGazeMode: 'soften',
              preferredBlinkCadence: 'linger',
            },
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'none',
            interruptMode: 'soft-interrupt',
          },
          drivers: {
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.44,
              holdMs: 360,
              source: 'prosody-authority',
              confidence: 0.95,
              playbackPhase: 'idle',
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              segmentId: 'segment-live2d-stop-tail-same-body',
            },
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'idle',
              segmentId: 'segment-live2d-stop-tail-same-body',
              continuityHoldMs: 320,
              visemeHints: [
                {
                  segmentId: 'segment-live2d-stop-tail-same-body',
                  viseme: 'A',
                  weight: 0.32,
                  source: 'prosody-authority',
                  confidence: 0.92,
                },
              ],
            },
            motion: {
              idleBase: 'steady_focus',
              attentionMode: 'attentive',
              actionCue: 'steady_focus',
              intensity: 0.18,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.88,
              segmentId: 'segment-live2d-stop-tail-same-body',
            },
          },
          driverAuthority: {
            segmentId: 'segment-live2d-stop-tail-same-body',
            rendererTarget: 'live2d',
            matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            bodySegmentMatched: true,
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
        },
      },
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: false,
      dynamics: {
        speechEnergy: 0.12,
        prosodyIntensity: 0.18,
        emphasisLevel: 0.1,
        cadencePulse: 0.14,
      },
      item: stoppedItem,
      phase: 'stopping',
      revision: 1,
      visemeIntensity: 0.08,
    }
    await nextTick()

    expect(runtime.state.value.phase).toBe('cooldown')
    expect(runtime.state.value.driverRendererTarget).toBe('live2d')
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      bodySegmentMatched: true,
      lipsyncSegmentMatched: true,
    }))
    expect(runtime.state.value.activeFacialCue).toBe('eyes-soften')
    expect(runtime.state.value.activeFacialCueSource).toBe('preview')
    expect(runtime.state.value.performance.facialCue).toBe('eyes-soften')
    expect(runtime.state.value.activeActionCue).toBe('steady_focus')
    expect(runtime.state.value.activeActionCueSource).toBe('preview')
    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      emotion: 'thinking',
      settleMode: 'linger',
      interruptMode: 'soft-interrupt',
    }))

    scope.stop()
  })

  it('keeps measured-return vrm stop-tail face authority on the same softer body line while the mouth tail is still settling', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-vrm-stop-tail-same-body',
    })

    const stoppedItem = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-vrm-stop-tail-same-body',
      segmentId: 'segment-vrm-stop-tail-same-body',
      special: null,
      streamId: 'stream-vrm-stop-tail-same-body',
      text: '我会慢慢收回来。',
      continuityHoldMs: 320,
      digitalLifeFrame: {
        id: 'segment-vrm-stop-tail-same-body',
        index: 0,
        startOffset: 0,
        endOffset: 8,
        text: '我会慢慢收回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.94,
          energy: 0.36,
          cadence: 0.28,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.56,
          energyBias: 0.34,
          mouthScale: 0.82,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
          },
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 280,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
          },
        },
        motor: createRecoveringMotor(),
      },
      metadata: {
        embodimentPlayback: {
          actualDurationMs: 520,
          driftMs: 0,
          plannedDurationMs: 520,
          settleMs: 320,
          stopReason: 'ended',
          rendererTarget: 'vrm',
          cue: {
            id: 'segment-vrm-stop-tail-same-body',
            index: 0,
            startOffset: 0,
            endOffset: 8,
            text: '我会慢慢收回来。',
            emotion: 'thinking',
            gestureWeight: 0.18,
            facialWeight: 0.44,
            prosodyWeight: 0.24,
            beatWeight: 0.18,
            mouthWeight: 0.28,
            headWeight: 0.18,
            facialHoldMs: 360,
            actionHoldMs: 280,
            emotionHoldMs: 320,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredGazeMode: 'soften',
              preferredBlinkCadence: 'linger',
            },
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'none',
            interruptMode: 'soft-interrupt',
          },
          drivers: {
            body: {
              frameMode: 'measured-return',
              stillness: 0.82,
              gazeStability: 0.76,
              breathAmplitude: 0.24,
              expressivity: 0.30,
              segmentId: 'segment-vrm-stop-tail-same-body',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.44,
              holdMs: 360,
              source: 'prosody-authority',
              confidence: 0.95,
              playbackPhase: 'idle',
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              segmentId: 'segment-vrm-stop-tail-same-body',
            },
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'idle',
              segmentId: 'segment-vrm-stop-tail-same-body',
              continuityHoldMs: 320,
              visemeHints: [
                {
                  segmentId: 'segment-vrm-stop-tail-same-body',
                  viseme: 'A',
                  weight: 0.32,
                  source: 'prosody-authority',
                  confidence: 0.92,
                },
              ],
            },
            motion: {
              idleBase: 'steady_focus',
              attentionMode: 'attentive',
              actionCue: 'steady_focus',
              intensity: 0.18,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.88,
              segmentId: 'segment-vrm-stop-tail-same-body',
            },
          },
          driverAuthority: {
            segmentId: 'segment-vrm-stop-tail-same-body',
            rendererTarget: 'vrm',
            matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            bodySegmentMatched: true,
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
        },
      },
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: false,
      dynamics: {
        speechEnergy: 0.12,
        prosodyIntensity: 0.18,
        emphasisLevel: 0.1,
        cadencePulse: 0.14,
      },
      item: stoppedItem,
      phase: 'stopping',
      revision: 1,
      visemeIntensity: 0.08,
    }
    await nextTick()

    expect(runtime.state.value.phase).toBe('cooldown')
    expect(runtime.state.value.driverRendererTarget).toBe('vrm')
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      bodySegmentMatched: true,
      lipsyncSegmentMatched: true,
    }))
    expect(runtime.state.value.activeFacialCue).toBe('eyes-soften')
    expect(runtime.state.value.activeFacialCueSource).toBe('preview')
    expect(runtime.state.value.performance.facialCue).toBe('eyes-soften')
    expect(runtime.state.value.activeActionCue).toBe('steady_focus')
    expect(runtime.state.value.activeActionCueSource).toBe('preview')
    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      emotion: 'thinking',
      settleMode: 'linger',
      interruptMode: 'soft-interrupt',
    }))

    scope.stop()
  })

  it('realigns vrm face and motion together onto the resumed same-her segment after stop-tail continuity instead of letting motion lag behind the returning face', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      upcomingSpeechSegment,
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-vrm-stop-tail-resumed-rejoin',
    })
    await nextTick()

    speechRenderState.value = {
      ...speechRenderState.value,
      active: false,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.16,
        emphasisLevel: 0.12,
        cadencePulse: 0.18,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-vrm-stop-tail-resumed-rejoin',
        segmentId: 'segment-vrm-stop-tail-resumed-rejoin',
        special: null,
        streamId: 'stream-vrm-stop-tail-resumed-rejoin',
        text: '我还沿着这条线在。',
        cue: {
          id: 'segment-vrm-stop-tail-resumed-rejoin',
          index: 0,
          startOffset: 0,
          endOffset: 8,
          text: '我还沿着这条线在。',
          emotion: 'thinking',
          gestureWeight: 0.18,
          facialWeight: 0.36,
          prosodyWeight: 0.22,
          beatWeight: 0.18,
          mouthWeight: 0.32,
          headWeight: 0.18,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 340,
          actionCue: null,
          facialCue: 'soft-gaze',
          actionWindow: 'none',
          interruptMode: 'soft-interrupt',
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
            preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 360,
            live2dMotionFollowThroughMs: 420,
            vrmActionFadeMs: 320,
            vrmExpressionBlendMs: 420,
          },
        },
      }),
      phase: 'stopping',
      revision: 1,
      visemeIntensity: 0.04,
    }
    playbackTelemetry.value = {
      actualDurationMs: 260,
      plannedDurationMs: 260,
      driftMs: 0,
      settleMs: 300,
      stopReason: 'ended',
      rendererTarget: 'vrm',
      cue: {
        id: 'segment-vrm-stop-tail-resumed-rejoin',
        index: 0,
        startOffset: 0,
        endOffset: 8,
        text: '我还沿着这条线在。',
        emotion: 'thinking',
        gestureWeight: 0.18,
        facialWeight: 0.36,
        prosodyWeight: 0.22,
        beatWeight: 0.18,
        mouthWeight: 0.32,
        headWeight: 0.18,
        facialHoldMs: 320,
        actionHoldMs: 240,
        emotionHoldMs: 340,
        actionCue: null,
        facialCue: 'soft-gaze',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 320,
          vrmExpressionBlendMs: 420,
        },
      },
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.38,
          holdMs: 320,
          source: 'prosody-authority',
          confidence: 0.92,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-vrm-stop-tail-resumed-rejoin',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: null,
          intensity: 0,
          holdMs: 240,
          source: 'timeline-projection',
          confidence: 0,
          segmentId: 'segment-vrm-stop-tail-resumed-rejoin',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: 'segment-vrm-stop-tail-resumed-rejoin',
          continuityHoldMs: 320,
          visemeHints: [
            { segmentId: 'segment-vrm-stop-tail-resumed-rejoin', viseme: 'closed', weight: 0.64, source: 'prosody-authority', confidence: 0.9 },
          ],
        },
      },
      driverAuthority: {
        segmentId: 'segment-vrm-stop-tail-resumed-rejoin',
        rendererTarget: 'vrm',
        matchedDrivers: ['face', 'lipsync'],
        sources: ['prosody-authority'],
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      },
    }
    await nextTick()

    expect(runtime.state.value.activeFacialCue).toBe('eyes-soften')
    expect(runtime.state.value.activeActionCueSource).not.toBe('segment')
    const stoppingProsodyDrive = runtime.state.value.prosodyDrive
    const stoppingBreathDrive = runtime.state.value.breathDrive
    const stoppingFocusDrive = runtime.state.value.focusDrive

    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-vrm-stop-tail-resumed-rejoin-next',
      segmentId: 'segment-vrm-stop-tail-resumed-rejoin-next',
      special: null,
      streamId: 'stream-vrm-stop-tail-resumed-rejoin',
      text: '我会慢一点把动作也接回来。',
      cue: {
        id: 'segment-vrm-stop-tail-resumed-rejoin-next',
        index: 1,
        startOffset: 8,
        endOffset: 20,
        text: '我会慢一点把动作也接回来。',
        emotion: 'thinking',
        gestureWeight: 0.22,
        facialWeight: 0.4,
        prosodyWeight: 0.24,
        beatWeight: 0.2,
        mouthWeight: 0.26,
        headWeight: 0.2,
        facialHoldMs: 340,
        actionHoldMs: 300,
        emotionHoldMs: 360,
        actionCue: 'observe_focus',
        facialCue: 'soft-gaze',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 380,
          live2dMotionFollowThroughMs: 460,
          vrmActionFadeMs: 360,
          vrmExpressionBlendMs: 440,
        },
      },
    })
    await nextTick()

    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeFacialCueSource).toBe('preview')
    expect(runtime.state.value.activeActionCueSource).toBe('preview')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-vrm-stop-tail-resumed-rejoin-next',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
    }))
    expect(runtime.state.value.activeFacialCue).toBe('soft-gaze')
    expect(runtime.state.value.activeActionCue).toBe('observe_focus')
    expect(runtime.state.value.prosodyDrive).toBeGreaterThan(0)
    expect(runtime.state.value.breathDrive).toBeGreaterThan(0)
    expect(runtime.state.value.focusDrive).toBeGreaterThan(0)
    expect(runtime.state.value.prosodyDrive).toBeLessThanOrEqual(stoppingProsodyDrive)
    expect(runtime.state.value.breathDrive).toBeLessThanOrEqual(stoppingBreathDrive)
    expect(runtime.state.value.focusDrive).toBeGreaterThanOrEqual(stoppingFocusDrive)

    scope.stop()
  })

  it('realigns live2d face and motion together onto the resumed same-her segment after stop-tail continuity instead of letting motion lag behind the returning face', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      upcomingSpeechSegment,
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-live2d-stop-tail-resumed-rejoin',
    })
    await nextTick()

    speechRenderState.value = {
      ...speechRenderState.value,
      active: false,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.16,
        emphasisLevel: 0.12,
        cadencePulse: 0.18,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-live2d-stop-tail-resumed-rejoin',
        segmentId: 'segment-live2d-stop-tail-resumed-rejoin',
        special: null,
        streamId: 'stream-live2d-stop-tail-resumed-rejoin',
        text: '我还沿着这条线在。',
        cue: {
          id: 'segment-live2d-stop-tail-resumed-rejoin',
          index: 0,
          startOffset: 0,
          endOffset: 8,
          text: '我还沿着这条线在。',
          emotion: 'thinking',
          gestureWeight: 0.18,
          facialWeight: 0.36,
          prosodyWeight: 0.22,
          beatWeight: 0.18,
          mouthWeight: 0.32,
          headWeight: 0.18,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 340,
          actionCue: null,
          facialCue: 'soft-gaze',
          actionWindow: 'none',
          interruptMode: 'soft-interrupt',
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
            preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
          rendererSettle: {
            live2dFacialReleaseMs: 360,
            live2dMotionFollowThroughMs: 420,
            vrmActionFadeMs: 320,
            vrmExpressionBlendMs: 420,
          },
        },
      }),
      phase: 'stopping',
      revision: 1,
      visemeIntensity: 0.04,
    }
    playbackTelemetry.value = {
      actualDurationMs: 260,
      plannedDurationMs: 260,
      driftMs: 0,
      settleMs: 300,
      stopReason: 'ended',
      rendererTarget: 'live2d',
      cue: {
        id: 'segment-live2d-stop-tail-resumed-rejoin',
        index: 0,
        startOffset: 0,
        endOffset: 8,
        text: '我还沿着这条线在。',
        emotion: 'thinking',
        gestureWeight: 0.18,
        facialWeight: 0.36,
        prosodyWeight: 0.22,
        beatWeight: 0.18,
        mouthWeight: 0.32,
        headWeight: 0.18,
        facialHoldMs: 320,
        actionHoldMs: 240,
        emotionHoldMs: 340,
        actionCue: null,
        facialCue: 'soft-gaze',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'same-thread-continuation',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          signature: 'embodiment:audible-same-her-line',
          reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 320,
          vrmExpressionBlendMs: 420,
        },
      },
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.38,
          holdMs: 320,
          source: 'prosody-authority',
          confidence: 0.92,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-live2d-stop-tail-resumed-rejoin',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: null,
          intensity: 0,
          holdMs: 240,
          source: 'timeline-projection',
          confidence: 0,
          segmentId: 'segment-live2d-stop-tail-resumed-rejoin',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: 'segment-live2d-stop-tail-resumed-rejoin',
          continuityHoldMs: 320,
          visemeHints: [
            { segmentId: 'segment-live2d-stop-tail-resumed-rejoin', viseme: 'closed', weight: 0.64, source: 'prosody-authority', confidence: 0.9 },
          ],
        },
      },
      driverAuthority: {
        segmentId: 'segment-live2d-stop-tail-resumed-rejoin',
        rendererTarget: 'live2d',
        matchedDrivers: ['face', 'lipsync'],
        sources: ['prosody-authority'],
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      },
    }
    await nextTick()

    expect(runtime.state.value.activeFacialCue).toBe('eyes-soften')
    expect(runtime.state.value.activeActionCueSource).not.toBe('segment')
    const stoppingProsodyDrive = runtime.state.value.prosodyDrive
    const stoppingBreathDrive = runtime.state.value.breathDrive
    const stoppingFocusDrive = runtime.state.value.focusDrive

    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-live2d-stop-tail-resumed-rejoin-next',
      segmentId: 'segment-live2d-stop-tail-resumed-rejoin-next',
      special: null,
      streamId: 'stream-live2d-stop-tail-resumed-rejoin',
      text: '我会慢一点把动作也接回来。',
      cue: {
        id: 'segment-live2d-stop-tail-resumed-rejoin-next',
        index: 1,
        startOffset: 8,
        endOffset: 20,
        text: '我会慢一点把动作也接回来。',
        emotion: 'thinking',
        gestureWeight: 0.22,
        facialWeight: 0.4,
        prosodyWeight: 0.24,
        beatWeight: 0.2,
        mouthWeight: 0.26,
        headWeight: 0.2,
        facialHoldMs: 340,
        actionHoldMs: 300,
        emotionHoldMs: 360,
        actionCue: 'observe_focus',
        facialCue: 'soft-gaze',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'same-thread-continuation',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          signature: 'embodiment:audible-same-her-line',
          reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
        },
        rendererSettle: {
          live2dFacialReleaseMs: 380,
          live2dMotionFollowThroughMs: 460,
          vrmActionFadeMs: 360,
          vrmExpressionBlendMs: 440,
        },
      },
    })
    await nextTick()

    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeFacialCueSource).toBe('preview')
    expect(runtime.state.value.activeActionCueSource).toBe('preview')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-live2d-stop-tail-resumed-rejoin-next',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
    }))
    expect(runtime.state.value.activeFacialCue).toBe('soft-gaze')
    expect(runtime.state.value.activeActionCue).toBe('observe_focus')
    expect(runtime.state.value.prosodyDrive).toBeGreaterThan(0)
    expect(runtime.state.value.breathDrive).toBeGreaterThan(0)
    expect(runtime.state.value.focusDrive).toBeGreaterThan(0)
    expect(runtime.state.value.prosodyDrive).toBeLessThanOrEqual(stoppingProsodyDrive)
    expect(runtime.state.value.breathDrive).toBeLessThanOrEqual(stoppingBreathDrive)
    expect(runtime.state.value.focusDrive).toBeGreaterThanOrEqual(stoppingFocusDrive)

    scope.stop()
  })

  it('keeps vrm resumed preview action pulse from warming earlier than the inward post-utterance face recovery on the same living line', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      upcomingSpeechSegment,
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-vrm-stop-tail-soften-before-pulse',
    })
    await nextTick()

    speechRenderState.value = {
      ...speechRenderState.value,
      active: false,
      dynamics: {
        speechEnergy: 0.16,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.1,
        cadencePulse: 0.16,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-vrm-stop-tail-soften-before-pulse',
        segmentId: 'segment-vrm-stop-tail-soften-before-pulse',
        special: null,
        streamId: 'stream-vrm-stop-tail-soften-before-pulse',
        text: '我先轻一点把这口气收住。',
        cue: {
          id: 'segment-vrm-stop-tail-soften-before-pulse',
          index: 0,
          startOffset: 0,
          endOffset: 10,
          text: '我先轻一点把这口气收住。',
          emotion: 'thinking',
          gestureWeight: 0.18,
          facialWeight: 0.36,
          prosodyWeight: 0.22,
          beatWeight: 0.18,
          mouthWeight: 0.32,
          headWeight: 0.18,
          facialHoldMs: 340,
          actionHoldMs: 260,
          emotionHoldMs: 360,
          actionCue: null,
          facialCue: 'soft-gaze',
          actionWindow: 'none',
          interruptMode: 'soft-interrupt',
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
            preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 360,
            live2dMotionFollowThroughMs: 420,
            vrmActionFadeMs: 320,
            vrmExpressionBlendMs: 420,
          },
        },
      }),
      phase: 'stopping',
      revision: 1,
      visemeIntensity: 0.03,
    }
    playbackTelemetry.value = {
      actualDurationMs: 260,
      plannedDurationMs: 260,
      driftMs: 0,
      settleMs: 300,
      stopReason: 'ended',
      rendererTarget: 'vrm',
      cue: {
        id: 'segment-vrm-stop-tail-soften-before-pulse',
        index: 0,
        startOffset: 0,
        endOffset: 10,
        text: '我先轻一点把这口气收住。',
        emotion: 'thinking',
        gestureWeight: 0.18,
        facialWeight: 0.36,
        prosodyWeight: 0.22,
        beatWeight: 0.18,
        mouthWeight: 0.32,
        headWeight: 0.18,
        facialHoldMs: 340,
        actionHoldMs: 260,
        emotionHoldMs: 360,
        actionCue: null,
        facialCue: 'soft-gaze',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 320,
          vrmExpressionBlendMs: 420,
        },
      },
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.38,
          holdMs: 340,
          source: 'prosody-authority',
          confidence: 0.92,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-vrm-stop-tail-soften-before-pulse',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: null,
          intensity: 0,
          holdMs: 260,
          source: 'timeline-projection',
          confidence: 0,
          segmentId: 'segment-vrm-stop-tail-soften-before-pulse',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: 'segment-vrm-stop-tail-soften-before-pulse',
          continuityHoldMs: 320,
          visemeHints: [
            { segmentId: 'segment-vrm-stop-tail-soften-before-pulse', viseme: 'closed', weight: 0.64, source: 'prosody-authority', confidence: 0.9 },
          ],
        },
      },
      driverAuthority: {
        segmentId: 'segment-vrm-stop-tail-soften-before-pulse',
        rendererTarget: 'vrm',
        matchedDrivers: ['face', 'lipsync'],
        sources: ['prosody-authority'],
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      },
    }
    await nextTick()

    const softenRevision = runtime.state.value.actionPulse.revision
    expect(runtime.state.value.activeFacialCue).toBe('eyes-soften')
    expect(runtime.state.value.performance.facialCue).toBe('eyes-soften')
    expect(runtime.state.value.phase).toBe('cooldown')
    const softenMotionPulse = runtime.state.value.motionPulse
    expect(softenMotionPulse).toBeGreaterThan(0)

    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-vrm-stop-tail-soften-before-pulse-next',
      segmentId: 'segment-vrm-stop-tail-soften-before-pulse-next',
      special: null,
      streamId: 'stream-vrm-stop-tail-soften-before-pulse',
      text: '等她真的接稳了再把动作抬回来。',
      cue: {
        id: 'segment-vrm-stop-tail-soften-before-pulse-next',
        index: 1,
        startOffset: 10,
        endOffset: 25,
        text: '等她真的接稳了再把动作抬回来。',
        emotion: 'thinking',
        gestureWeight: 0.2,
        facialWeight: 0.34,
        prosodyWeight: 0.22,
        beatWeight: 0.16,
        mouthWeight: 0.24,
        headWeight: 0.18,
        facialHoldMs: 360,
        actionHoldMs: 320,
        emotionHoldMs: 360,
        actionCue: 'idle_settle',
        facialCue: 'soft-gaze',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 380,
          live2dMotionFollowThroughMs: 460,
          vrmActionFadeMs: 360,
          vrmExpressionBlendMs: 440,
        },
      },
    })
    await nextTick()

    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeFacialCue).toBe('soft-gaze')
    expect(runtime.state.value.activeActionCue).toBe('idle_settle')
    expect(runtime.state.value.activeActionCueSource).toBe('preview')
    expect(runtime.state.value.phase).toBe('cooldown')
    expect(runtime.state.value.motionPulse).toBeGreaterThanOrEqual(softenMotionPulse)
    expect(runtime.state.value.actionPulse.revision).toBeGreaterThan(softenRevision)
    expect(runtime.state.value.actionPulse.reason).toBe('segment-preview')
    expect(runtime.state.value.actionPulse.cue).toBe('idle_settle')

    scope.stop()
  })

  it('keeps live2d resumed preview action pulse from warming earlier than the inward post-utterance face recovery on the same living line', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      upcomingSpeechSegment,
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-live2d-stop-tail-soften-before-pulse',
    })
    await nextTick()

    speechRenderState.value = {
      ...speechRenderState.value,
      active: false,
      dynamics: {
        speechEnergy: 0.16,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.1,
        cadencePulse: 0.16,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-live2d-stop-tail-soften-before-pulse',
        segmentId: 'segment-live2d-stop-tail-soften-before-pulse',
        special: null,
        streamId: 'stream-live2d-stop-tail-soften-before-pulse',
        text: '我先轻一点把这口气收住。',
        cue: {
          id: 'segment-live2d-stop-tail-soften-before-pulse',
          index: 0,
          startOffset: 0,
          endOffset: 10,
          text: '我先轻一点把这口气收住。',
          emotion: 'thinking',
          gestureWeight: 0.18,
          facialWeight: 0.36,
          prosodyWeight: 0.22,
          beatWeight: 0.18,
          mouthWeight: 0.32,
          headWeight: 0.18,
          facialHoldMs: 340,
          actionHoldMs: 260,
          emotionHoldMs: 360,
          actionCue: null,
          facialCue: 'soft-gaze',
          actionWindow: 'none',
          interruptMode: 'soft-interrupt',
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
            preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 360,
            live2dMotionFollowThroughMs: 420,
            vrmActionFadeMs: 320,
            vrmExpressionBlendMs: 420,
          },
        },
      }),
      phase: 'stopping',
      revision: 1,
      visemeIntensity: 0.03,
    }
    playbackTelemetry.value = {
      actualDurationMs: 260,
      plannedDurationMs: 260,
      driftMs: 0,
      settleMs: 300,
      stopReason: 'ended',
      rendererTarget: 'live2d',
      cue: {
        id: 'segment-live2d-stop-tail-soften-before-pulse',
        index: 0,
        startOffset: 0,
        endOffset: 10,
        text: '我先轻一点把这口气收住。',
        emotion: 'thinking',
        gestureWeight: 0.18,
        facialWeight: 0.36,
        prosodyWeight: 0.22,
        beatWeight: 0.18,
        mouthWeight: 0.32,
        headWeight: 0.18,
        facialHoldMs: 340,
        actionHoldMs: 260,
        emotionHoldMs: 360,
        actionCue: null,
        facialCue: 'soft-gaze',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 320,
          vrmExpressionBlendMs: 420,
        },
      },
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.38,
          holdMs: 340,
          source: 'prosody-authority',
          confidence: 0.92,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-live2d-stop-tail-soften-before-pulse',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: null,
          intensity: 0,
          holdMs: 260,
          source: 'timeline-projection',
          confidence: 0,
          segmentId: 'segment-live2d-stop-tail-soften-before-pulse',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: 'segment-live2d-stop-tail-soften-before-pulse',
          continuityHoldMs: 320,
          visemeHints: [
            { segmentId: 'segment-live2d-stop-tail-soften-before-pulse', viseme: 'closed', weight: 0.64, source: 'prosody-authority', confidence: 0.9 },
          ],
        },
      },
      driverAuthority: {
        segmentId: 'segment-live2d-stop-tail-soften-before-pulse',
        rendererTarget: 'live2d',
        matchedDrivers: ['face', 'lipsync'],
        sources: ['prosody-authority'],
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      },
    }
    await nextTick()

    const softenRevision = runtime.state.value.actionPulse.revision
    expect(runtime.state.value.activeFacialCue).toBe('eyes-soften')
    expect(runtime.state.value.performance.facialCue).toBe('eyes-soften')
    expect(runtime.state.value.phase).toBe('cooldown')
    const softenMotionPulse = runtime.state.value.motionPulse
    expect(softenMotionPulse).toBeGreaterThan(0)

    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-live2d-stop-tail-soften-before-pulse-next',
      segmentId: 'segment-live2d-stop-tail-soften-before-pulse-next',
      special: null,
      streamId: 'stream-live2d-stop-tail-soften-before-pulse',
      text: '等她真的接稳了再把动作抬回来。',
      cue: {
        id: 'segment-live2d-stop-tail-soften-before-pulse-next',
        index: 1,
        startOffset: 10,
        endOffset: 25,
        text: '等她真的接稳了再把动作抬回来。',
        emotion: 'thinking',
        gestureWeight: 0.2,
        facialWeight: 0.34,
        prosodyWeight: 0.22,
        beatWeight: 0.16,
        mouthWeight: 0.24,
        headWeight: 0.18,
        facialHoldMs: 360,
        actionHoldMs: 320,
        emotionHoldMs: 360,
        actionCue: 'idle_settle',
        facialCue: 'soft-gaze',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 380,
          live2dMotionFollowThroughMs: 460,
          vrmActionFadeMs: 360,
          vrmExpressionBlendMs: 440,
        },
      },
    })
    await nextTick()

    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeFacialCue).toBe('soft-gaze')
    expect(runtime.state.value.activeActionCue).toBe('idle_settle')
    expect(runtime.state.value.activeActionCueSource).toBe('preview')
    expect(runtime.state.value.phase).toBe('cooldown')
    expect(runtime.state.value.motionPulse).toBeGreaterThanOrEqual(softenMotionPulse)
    expect(runtime.state.value.actionPulse.revision).toBeGreaterThan(softenRevision)
    expect(runtime.state.value.actionPulse.reason).toBe('segment-preview')
    expect(runtime.state.value.actionPulse.cue).toBe('idle_settle')

    scope.stop()
  })

  it('keeps vrm resumed reopen authority provenance stable while cue-bridged face and motion rejoin the same living line', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      upcomingSpeechSegment,
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-vrm-reopen-provenance-stable',
    })
    await nextTick()

    speechRenderState.value = {
      ...speechRenderState.value,
      active: false,
      dynamics: {
        speechEnergy: 0.16,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.1,
        cadencePulse: 0.16,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-vrm-reopen-provenance-stable',
        segmentId: 'segment-vrm-reopen-provenance-stable',
        special: null,
        streamId: 'stream-vrm-reopen-provenance-stable',
        text: '我先顺着这一条线停住。',
        cue: {
          id: 'segment-vrm-reopen-provenance-stable',
          index: 0,
          startOffset: 0,
          endOffset: 9,
          text: '我先顺着这一条线停住。',
          emotion: 'thinking',
          gestureWeight: 0.18,
          facialWeight: 0.36,
          prosodyWeight: 0.22,
          beatWeight: 0.18,
          mouthWeight: 0.32,
          headWeight: 0.18,
          facialHoldMs: 340,
          actionHoldMs: 260,
          emotionHoldMs: 360,
          actionCue: null,
          facialCue: 'soft-gaze',
          actionWindow: 'none',
          interruptMode: 'soft-interrupt',
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
            preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 360,
            live2dMotionFollowThroughMs: 420,
            vrmActionFadeMs: 320,
            vrmExpressionBlendMs: 420,
          },
        },
      }),
      phase: 'stopping',
      revision: 1,
      visemeIntensity: 0.03,
    }
    playbackTelemetry.value = {
      actualDurationMs: 260,
      plannedDurationMs: 260,
      driftMs: 0,
      settleMs: 300,
      stopReason: 'ended',
      rendererTarget: 'vrm',
      cue: {
        id: 'segment-vrm-reopen-provenance-stable',
        index: 0,
        startOffset: 0,
        endOffset: 9,
        text: '我先顺着这一条线停住。',
        emotion: 'thinking',
        gestureWeight: 0.18,
        facialWeight: 0.36,
        prosodyWeight: 0.22,
        beatWeight: 0.18,
        mouthWeight: 0.32,
        headWeight: 0.18,
        facialHoldMs: 340,
        actionHoldMs: 260,
        emotionHoldMs: 360,
        actionCue: null,
        facialCue: 'soft-gaze',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 320,
          vrmExpressionBlendMs: 420,
        },
      },
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.38,
          holdMs: 340,
          source: 'prosody-authority',
          confidence: 0.92,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-vrm-reopen-provenance-stable',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: null,
          intensity: 0,
          holdMs: 260,
          source: 'timeline-projection',
          confidence: 0,
          segmentId: 'segment-vrm-reopen-provenance-stable',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: 'segment-vrm-reopen-provenance-stable',
          continuityHoldMs: 320,
          visemeHints: [
            { segmentId: 'segment-vrm-reopen-provenance-stable', viseme: 'closed', weight: 0.64, source: 'prosody-authority', confidence: 0.9 },
          ],
        },
      },
      driverAuthority: {
        segmentId: 'segment-vrm-reopen-provenance-stable',
        rendererTarget: 'vrm',
        matchedDrivers: ['face', 'lipsync'],
        sources: ['prosody-authority'],
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      },
    }
    await nextTick()

    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-vrm-reopen-provenance-stable-next',
      segmentId: 'segment-vrm-reopen-provenance-stable-next',
      special: null,
      streamId: 'stream-vrm-reopen-provenance-stable',
      text: '等动作和脸一起接回来再往外说。',
      cue: {
        id: 'segment-vrm-reopen-provenance-stable-next',
        index: 1,
        startOffset: 9,
        endOffset: 24,
        text: '等动作和脸一起接回来再往外说。',
        emotion: 'thinking',
        gestureWeight: 0.22,
        facialWeight: 0.38,
        prosodyWeight: 0.24,
        beatWeight: 0.18,
        mouthWeight: 0.24,
        headWeight: 0.2,
        facialHoldMs: 360,
        actionHoldMs: 320,
        emotionHoldMs: 360,
        actionCue: 'observe_focus',
        facialCue: 'soft-gaze',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 380,
          live2dMotionFollowThroughMs: 460,
          vrmActionFadeMs: 360,
          vrmExpressionBlendMs: 440,
        },
      },
    })
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-vrm-reopen-provenance-stable-next',
      matchedDrivers: ['face', 'motion'],
      sources: ['cue-bridge'],
      faceSegmentMatched: true,
      motionSegmentMatched: true,
    }))
    expect(runtime.state.value.driverRendererTarget).toBe('vrm')
    expect(runtime.state.value.driverAuthority?.sources).not.toContain('prosody-authority')
    expect(runtime.state.value.driverAuthority?.sources).not.toContain('timeline-projection')

    scope.stop()
  })

  it('keeps live2d resumed reopen authority provenance stable while cue-bridged face and motion rejoin the same same-her line', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      upcomingSpeechSegment,
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-live2d-reopen-provenance-stable',
    })
    await nextTick()

    speechRenderState.value = {
      ...speechRenderState.value,
      active: false,
      dynamics: {
        speechEnergy: 0.16,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.1,
        cadencePulse: 0.16,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-live2d-reopen-provenance-stable',
        segmentId: 'segment-live2d-reopen-provenance-stable',
        special: null,
        streamId: 'stream-live2d-reopen-provenance-stable',
        text: '我先顺着这一条线停住。',
        cue: {
          id: 'segment-live2d-reopen-provenance-stable',
          index: 0,
          startOffset: 0,
          endOffset: 9,
          text: '我先顺着这一条线停住。',
          emotion: 'thinking',
          gestureWeight: 0.18,
          facialWeight: 0.36,
          prosodyWeight: 0.22,
          beatWeight: 0.18,
          mouthWeight: 0.32,
          headWeight: 0.18,
          facialHoldMs: 340,
          actionHoldMs: 260,
          emotionHoldMs: 360,
          actionCue: null,
          facialCue: 'soft-gaze',
          actionWindow: 'none',
          interruptMode: 'soft-interrupt',
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
            preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
          rendererSettle: {
            live2dFacialReleaseMs: 360,
            live2dMotionFollowThroughMs: 420,
            vrmActionFadeMs: 320,
            vrmExpressionBlendMs: 420,
          },
        },
      }),
      phase: 'stopping',
      revision: 1,
      visemeIntensity: 0.03,
    }
    playbackTelemetry.value = {
      actualDurationMs: 260,
      plannedDurationMs: 260,
      driftMs: 0,
      settleMs: 300,
      stopReason: 'ended',
      rendererTarget: 'live2d',
      cue: {
        id: 'segment-live2d-reopen-provenance-stable',
        index: 0,
        startOffset: 0,
        endOffset: 9,
        text: '我先顺着这一条线停住。',
        emotion: 'thinking',
        gestureWeight: 0.18,
        facialWeight: 0.36,
        prosodyWeight: 0.22,
        beatWeight: 0.18,
        mouthWeight: 0.32,
        headWeight: 0.18,
        facialHoldMs: 340,
        actionHoldMs: 260,
        emotionHoldMs: 360,
        actionCue: null,
        facialCue: 'soft-gaze',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'same-thread-continuation',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          signature: 'embodiment:audible-same-her-line',
          reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 320,
          vrmExpressionBlendMs: 420,
        },
      },
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.38,
          holdMs: 340,
          source: 'prosody-authority',
          confidence: 0.92,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-live2d-reopen-provenance-stable',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: null,
          intensity: 0,
          holdMs: 260,
          source: 'timeline-projection',
          confidence: 0,
          segmentId: 'segment-live2d-reopen-provenance-stable',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: 'segment-live2d-reopen-provenance-stable',
          continuityHoldMs: 320,
          visemeHints: [
            { segmentId: 'segment-live2d-reopen-provenance-stable', viseme: 'closed', weight: 0.64, source: 'prosody-authority', confidence: 0.9 },
          ],
        },
      },
      driverAuthority: {
        segmentId: 'segment-live2d-reopen-provenance-stable',
        rendererTarget: 'live2d',
        matchedDrivers: ['face', 'lipsync'],
        sources: ['prosody-authority'],
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      },
    }
    await nextTick()

    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-live2d-reopen-provenance-stable-next',
      segmentId: 'segment-live2d-reopen-provenance-stable-next',
      special: null,
      streamId: 'stream-live2d-reopen-provenance-stable',
      text: '等动作和脸一起接回来再往外说。',
      cue: {
        id: 'segment-live2d-reopen-provenance-stable-next',
        index: 1,
        startOffset: 9,
        endOffset: 24,
        text: '等动作和脸一起接回来再往外说。',
        emotion: 'thinking',
        gestureWeight: 0.22,
        facialWeight: 0.38,
        prosodyWeight: 0.24,
        beatWeight: 0.18,
        mouthWeight: 0.24,
        headWeight: 0.2,
        facialHoldMs: 360,
        actionHoldMs: 320,
        emotionHoldMs: 360,
        actionCue: 'observe_focus',
        facialCue: 'soft-gaze',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'same-thread-continuation',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          signature: 'embodiment:audible-same-her-line',
          reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
        },
        rendererSettle: {
          live2dFacialReleaseMs: 380,
          live2dMotionFollowThroughMs: 460,
          vrmActionFadeMs: 360,
          vrmExpressionBlendMs: 440,
        },
      },
    })
    await nextTick()

    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeFacialCueSource).toBe('preview')
    expect(runtime.state.value.activeActionCueSource).toBe('preview')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-live2d-reopen-provenance-stable-next',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
    }))
    expect(runtime.state.value.activeFacialCue).toBe('soft-gaze')
    expect(runtime.state.value.activeActionCue).toBe('observe_focus')
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-live2d-reopen-provenance-stable-next',
      matchedDrivers: ['face', 'motion'],
      sources: ['cue-bridge'],
      faceSegmentMatched: true,
      motionSegmentMatched: true,
    }))
    expect(runtime.state.value.driverRendererTarget).toBe('live2d')
    expect(runtime.state.value.driverAuthority?.sources).not.toContain('prosody-authority')
    expect(runtime.state.value.driverAuthority?.sources).not.toContain('timeline-projection')

    scope.stop()
  })

  it('keeps scripted playing projection when the speaking cue alias matches the post-utterance cue', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    let startListener: ((event: { item: any, startedAt: number }) => void) | undefined

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const scope = effectScope()
    const speech = scope.run(() => {
      const runtime = useStageEmbodimentSpeech({
        audioContext,
        mouthOpenSize: ref(0),
        paused: ref(false),
        speechStylePitch: ref(0),
        speechStyleRate: ref(1),
        stageModelRenderer: ref('vrm'),
      })
      runtime.bindPlaybackManager({
        onStart(listener: (event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) {
          startListener = listener
        },
        onEnd() {},
        onInterrupt() {},
      } as never)
      return runtime
    })!

    const item = {
      id: 'playback-scripted-alias-collision-1',
      streamId: 'stream-scripted-alias-collision-1',
      intentId: 'intent-scripted-alias-collision-1',
      segmentId: 'segment-scripted-alias-collision-1',
      ownerId: 'alice',
      priority: 0,
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 180,
      audio: createBufferedSpeechAudioSource({} as AudioBuffer),
      createdAt: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-scripted-alias-collision-1',
          rendererTarget: 'live2d',
          replyText: '继续看这里。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'calm',
            emphasis: 0,
            residentMode: 'dialogue',
          },
          speechPlan: {
            segments: [{
              id: 'segment-scripted-alias-collision-1',
              index: 0,
              text: '继续看这里。',
              interruptPolicy: 'soft-settle',
              preRollMs: 0,
              settleMs: 180,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 0,
            settleMs: 180,
          },
          facePlan: {
            postUtteranceCue: 'focus',
            speakingCues: [{
              segmentId: 'segment-scripted-alias-collision-1',
              emotion: 'thinking',
              facialCue: 'focus',
              intensity: 0.6,
            }],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [{
              segmentId: 'segment-scripted-alias-collision-1',
              actionCue: 'observe_focus',
              intensity: 0.4,
              holdMs: 220,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    }

    startListener?.({ item, startedAt: 100 })
    await nextTick()

    expect(speech.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      facialCue: 'focus',
      postUtteranceCue: 'focus',
    }))
    expect(speech.playbackTelemetry.value?.drivers.lipsync).toEqual(expect.objectContaining({
      playbackPhase: 'playing',
    }))
    expect(speech.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      actionCue: 'observe_focus',
      intensity: 0.4,
    }))

    speech.dispose()
    scope.stop()
  })

  it('falls back to playback-driver segment face and motion cues during active later-segment playback', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-driver-fallback-segment-2',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.44,
        prosodyIntensity: 0.52,
        emphasisLevel: 0.36,
        cadencePulse: 0.58,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-driver-fallback-segment-2',
        segmentId: 'segment-2',
        special: null,
        streamId: 'stream-driver-fallback-segment-2',
        text: '然后点保存。',
        metadata: {
          embodimentPlayback: {
            actualDurationMs: 0,
            driftMs: 0,
            plannedDurationMs: 220,
            settleMs: 220,
            stopReason: null,
            drivers: {
              face: {
                emotion: 'happy',
                facialCue: 'reassure_smile',
                intensity: 0.66,
                playbackPhase: 'playing',
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'settle-smile',
                segmentId: 'segment-2',
              },
              lipsync: null,
              motion: {
                idleBase: 'idle_settle',
                attentionMode: 'attentive',
                actionCue: 'idle_gentle_nod',
                intensity: 0.54,
                holdMs: 180,
                segmentId: 'segment-2',
              },
            },
          },
        },
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.34,
    }
    await nextTick()

    expect(runtime.state.value.phase).toBe('speaking')
    expect(runtime.state.value.activeFacialCue).toBe('reassure_smile')
    expect(runtime.state.value.activeFacialCueSource).toBe('segment')
    expect(runtime.state.value.activeActionCue).toBe('idle_gentle_nod')
    expect(runtime.state.value.activeActionCueSource).toBe('segment')
    expect(runtime.state.value.performance.baseEmotion).toBe('happy')

    scope.stop()
  })

  it('keeps scripted segment cues ahead of playback-driver overrides during active playback', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-scripted-segment-over-driver',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.44,
        prosodyIntensity: 0.52,
        emphasisLevel: 0.36,
        cadencePulse: 0.58,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-scripted-segment-over-driver',
        segmentId: 'segment-2',
        special: null,
        streamId: 'stream-scripted-segment-over-driver',
        text: '然后点保存。',
        cue: {
          id: 'turn-scripted-segment-over-driver:1',
          index: 1,
          startOffset: 5,
          endOffset: 11,
          text: '然后点保存。',
          emotion: 'thinking',
          gestureWeight: 0.36,
          facialWeight: 0.54,
          prosodyWeight: 0.46,
          beatWeight: 0.52,
          actionCue: 'scripted_nod',
          facialCue: 'scripted_focus',
          actionWindow: 'cadence-peak',
          interruptMode: 'soft-interrupt',
        },
        metadata: {
          embodimentPlayback: {
            actualDurationMs: 0,
            driftMs: 0,
            plannedDurationMs: 220,
            settleMs: 220,
            stopReason: null,
            drivers: {
              face: {
                emotion: 'happy',
                facialCue: 'driver_smile',
                intensity: 0.66,
                playbackPhase: 'playing',
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'settle-smile',
                segmentId: 'segment-2',
                source: 'prosody-authority',
                confidence: 0.94,
              },
              lipsync: null,
              motion: {
                idleBase: 'idle_settle',
                attentionMode: 'attentive',
                actionCue: 'driver_nod',
                intensity: 0.54,
                holdMs: 180,
                segmentId: 'segment-2',
                source: 'timeline-projection',
                confidence: 0.88,
              },
            },
          },
        },
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.34,
    }
    await nextTick()

    expect(runtime.state.value.phase).toBe('speaking')
    expect(runtime.state.value.activeFacialCue).toBe('scripted_focus')
    expect(runtime.state.value.activeFacialCueSource).toBe('segment')
    expect(runtime.state.value.activeActionCue).toBe('scripted_nod')
    expect(runtime.state.value.activeActionCueSource).toBe('segment')

    scope.stop()
  })

  it('keeps resident cues when active playback driver confidence is too low to override them', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-driver-low-confidence-segment-2',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.44,
        prosodyIntensity: 0.52,
        emphasisLevel: 0.36,
        cadencePulse: 0.58,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-driver-low-confidence-segment-2',
        segmentId: 'segment-2',
        special: null,
        streamId: 'stream-driver-low-confidence-segment-2',
        text: '然后点保存。',
        metadata: {
          embodimentPlayback: {
            actualDurationMs: 0,
            driftMs: 0,
            plannedDurationMs: 220,
            settleMs: 220,
            stopReason: null,
            drivers: {
              face: {
                emotion: 'happy',
                facialCue: 'reassure_smile',
                intensity: 0.66,
                playbackPhase: 'playing',
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'settle-smile',
                segmentId: 'segment-2',
                source: 'prosody-authority',
                confidence: 0.22,
              },
              lipsync: null,
              motion: {
                idleBase: 'idle_settle',
                attentionMode: 'attentive',
                actionCue: 'idle_gentle_nod',
                intensity: 0.54,
                holdMs: 180,
                segmentId: 'segment-2',
                source: 'timeline-projection',
                confidence: 0.24,
              },
            },
          },
        },
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.34,
    }
    await nextTick()

    expect(runtime.state.value.phase).toBe('speaking')
    expect(runtime.state.value.activeFacialCue).toBe('smile')
    expect(runtime.state.value.activeFacialCueSource).toBe('resident')
    expect(runtime.state.value.activeActionCue).toBe('raise_hand_excited')
    expect(runtime.state.value.activeActionCueSource).toBe('resident')

    scope.stop()
  })

  it('preserves scripted post-utterance face cues through the real stop projection path', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    let startListener: ((event: { item: any, startedAt: number }) => void) | undefined
    let endListener: ((event: { item: any, endedAt: number }) => void) | undefined

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const scope = effectScope()
    const runtime = scope.run(() => {
      const speech = useStageEmbodimentSpeech({
        audioContext,
        mouthOpenSize: ref(0),
        paused: ref(false),
        speechStylePitch: ref(0),
        speechStyleRate: ref(1),
        stageModelRenderer: ref('vrm'),
      })
      const performanceRuntime = useStageEmbodimentPerformanceRuntime({
        speechRenderState: speech.speechRenderState,
        upcomingSpeechSegment: speech.upcomingSpeechSegment,
      })
      speech.bindPlaybackManager({
        onStart(listener: (event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) {
          startListener = listener
        },
        onEnd(listener: (event: { item: PlaybackItem<BrowserSpeechAudioSource>, endedAt: number }) => void) {
          endListener = listener
        },
        onInterrupt() {},
      } as never)
      return {
        performanceRuntime,
        speech,
      }
    })!

    runtime.performanceRuntime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-scripted-post-driver-face',
    })
    await nextTick()

    const item = {
      id: 'playback-scripted-stop-1',
      streamId: 'stream-scripted-stop-1',
      intentId: 'intent-scripted-stop-1',
      segmentId: 'segment-scripted-stop-1',
      ownerId: 'alice',
      priority: 0,
      text: '先看这里，',
      special: null,
      continuityHoldMs: 180,
      audio: createBufferedSpeechAudioSource({} as AudioBuffer),
      createdAt: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-scripted-stop-1',
          rendererTarget: 'live2d',
          replyText: '先看这里，',
          state: {
            baseEmotion: 'thinking',
            delivery: 'calm',
            emphasis: 0,
            residentMode: 'dialogue',
          },
          speechPlan: {
            segments: [{
              id: 'segment-scripted-stop-1',
              index: 0,
              text: '先看这里，',
              interruptPolicy: 'soft-settle',
              preRollMs: 0,
              settleMs: 180,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 0,
            settleMs: 180,
          },
          facePlan: {
            postUtteranceCue: 'settle-smile',
            speakingCues: [{
              segmentId: 'segment-scripted-stop-1',
              emotion: 'thinking',
              facialCue: 'focus',
              intensity: 0.6,
              holdMs: 220,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'settle-smile',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [{
              segmentId: 'segment-scripted-stop-1',
              actionCue: 'observe_focus',
              intensity: 0.4,
              holdMs: 220,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    }

    startListener?.({ item, startedAt: 100 })
    await nextTick()
    endListener?.({ item, endedAt: 240 })
    await nextTick()

    vi.advanceTimersByTime(180)
    await nextTick()

    expect(['stopping', 'idle']).toContain(runtime.speech.speechRenderState.value.phase)
    expect(runtime.speech.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      facialCue: 'settle-smile',
      postUtteranceCue: 'settle-smile',
    }))
    expect(runtime.performanceRuntime.state.value.phase).toBe('cooldown')
    expect(runtime.performanceRuntime.state.value.activeFacialCue).toBe('settle-smile')
    expect(runtime.performanceRuntime.state.value.activeFacialCueSource).toBe('preview')
    expect(runtime.performanceRuntime.state.value.performance.facialCue).toBe('settle-smile')

    runtime.speech.dispose()
    runtime.performanceRuntime.dispose()
    scope.stop()
  })

  it('keeps director-projected live2d measured-return settle timing on the active cue through playback runtime', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      variationToken: 'turn-live2d-measured-return-runtime-settle',
    })

    playbackTelemetry.value = createPlaybackTelemetryFixture({
      cue: {
        id: 'segment-live2d-measured-return-runtime-settle',
        endOffset: 12,
        text: '我先沿着这条线轻一点接回来。',
        emotion: 'thinking',
        gestureWeight: 0.24,
        facialWeight: 0.44,
        prosodyWeight: 0.22,
        beatWeight: 0.16,
        mouthWeight: 0.18,
        headWeight: 0.16,
        facialHoldMs: 340,
        actionHoldMs: 260,
        emotionHoldMs: 380,
        actionCue: 'steady_focus',
        facialCue: 'soft-gaze',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect'],
          preferredMotionAliases: ['ObserveSoft'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 440,
          vrmActionFadeMs: 280,
          vrmExpressionBlendMs: 360,
        },
      },
      drivers: {
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.44,
          holdMs: 340,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-live2d-measured-return-runtime-settle',
          source: 'prosody-authority',
          confidence: 0.92,
        },
        motion: {
          idleBase: 'observe_focus',
          attentionMode: 'ambient',
          actionCue: 'observe_focus',
          intensity: 0.24,
          holdMs: 260,
          segmentId: 'segment-live2d-measured-return-runtime-settle',
          source: 'timeline-projection',
          confidence: 0.9,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-live2d-measured-return-runtime-settle',
          continuityHoldMs: 0,
          visemeHints: [],
        },
      },
    })
    await nextTick()

    expect(runtime.state.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredExpressionAliases: ['CalmInspect'],
      preferredMotionAliases: ['ObserveSoft'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(runtime.state.value.activeCue?.rendererSettle).toEqual({
      live2dFacialReleaseMs: 360,
      live2dMotionFollowThroughMs: 440,
      vrmActionFadeMs: 520,
      vrmExpressionBlendMs: 600,
    })

    scope.stop()
  })

  it('dampens companionship expression intensity for measured-return, repair-before-closeness, rest-protective, and quiet-companionship modes', () => {
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: 'measured-return',
      speechActive: true,
      variationToken: null,
    })).toBe(0.92)
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: 'repair-before-closeness',
      speechActive: true,
      variationToken: null,
    })).toBe(0.84)
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: 'quiet-companionship',
      speechActive: false,
      variationToken: null,
    })).toBe(0.86)
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: null,
      residentReasonTags: ['continuity:quiet-accompaniment', 'rest-protective', 'rest-protective-companionship'],
      speechActive: false,
      variationToken: null,
    })).toBe(0.8)
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: null,
      speechActive: false,
      variationToken: 'turn-measured-return-intensity',
    })).toBe(0.82)
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: null,
      residentReasonTags: ['continuity:quiet-accompaniment', 'repair-before-closeness'],
      speechActive: false,
      variationToken: null,
    })).toBe(0.72)
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: null,
      residentReasonTags: ['continuity:quiet-accompaniment', 'measured-return'],
      speechActive: true,
      variationToken: null,
    })).toBe(0.92)
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: null,
      residentReasonTags: ['continuity:quiet-accompaniment', 'measured-return', 'durable-relationship-rhythm'],
      speechActive: true,
      variationToken: null,
    })).toBe(0.88)
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: null,
      residentReasonTags: ['continuity:quiet-accompaniment', 'measured-return', 'durable-relationship-rhythm'],
      speechActive: false,
      variationToken: null,
    })).toBe(0.78)
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: null,
      speechActive: true,
      variationToken: 'ordinary-dialogue-turn',
    })).toBe(1)
  })

  it('keeps companionship resident action intensity more inward for repair-before-closeness and quiet-companionship idle carry', async () => {
    const baseline = await createResidentIdleRuntime({
      actionCue: 'observe_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 1,
      facialCue: 'soft-gaze',
      variationToken: 'resident|ordinary-dialogue',
    })
    baseline.runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      delivery: 'gentle',
      emphasis: 1,
    }, {
      variationToken: 'resident|ordinary-dialogue',
    })
    await nextTick()

    const repairBeforeCloseness = await createResidentIdleRuntime({
      actionCue: 'observe_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 1,
      facialCue: 'soft-gaze',
      variationToken: 'resident|repair-before-closeness',
    })
    repairBeforeCloseness.runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      delivery: 'gentle',
      emphasis: 1,
    }, {
      residentReasonTags: ['continuity:quiet-accompaniment', 'repair-before-closeness'],
      variationToken: 'resident|repair-before-closeness',
    })
    await nextTick()

    const quietCompanionship = await createResidentIdleRuntime({
      actionCue: 'observe_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 1,
      facialCue: 'soft-gaze',
      variationToken: 'resident|quiet-companionship',
    })
    quietCompanionship.runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      delivery: 'gentle',
      emphasis: 1,
    }, {
      residentReasonTags: ['continuity:quiet-accompaniment', 'quiet-companionship'],
      variationToken: 'resident|quiet-companionship',
    })
    await nextTick()

    expect(repairBeforeCloseness.runtime.state.value.actionIntensity).toBeLessThanOrEqual(baseline.runtime.state.value.actionIntensity)
    expect(quietCompanionship.runtime.state.value.actionIntensity).toBeLessThanOrEqual(baseline.runtime.state.value.actionIntensity)
    expect(repairBeforeCloseness.runtime.state.value.motor.body.openness).toBeLessThanOrEqual(baseline.runtime.state.value.motor.body.openness)
    expect(quietCompanionship.runtime.state.value.motor.body.openness).toBeLessThanOrEqual(baseline.runtime.state.value.motor.body.openness)

    baseline.scope.stop()
    repairBeforeCloseness.scope.stop()
    quietCompanionship.scope.stop()
  })

  it('keeps active cue companionship resident mode and blink-gaze hints intact when runtime clones the cue for downstream embodiment surfaces', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    let startListener: ((event: { item: any, startedAt: number }) => void) | undefined

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        fftSize: 1024,
        frequencyBinCount: 512,
        getByteFrequencyData: vi.fn(),
      })),
      createBufferSource: vi.fn(),
      decodeAudioData: vi.fn(),
      destination: {} as AudioDestinationNode,
      currentTime: 0,
      close: vi.fn(() => Promise.resolve()),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const scope = effectScope()
    const runtime = scope.run(() => {
      const speech = useStageEmbodimentSpeech({
        audioContext,
        mouthOpenSize: ref(0),
        paused: ref(false),
        speechStylePitch: ref(0),
        speechStyleRate: ref(1),
        stageModelRenderer: ref('vrm'),
      })
      speech.bindPlaybackManager({
        onStart(listener: (event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) {
          startListener = listener
        },
        onEnd() {},
        onInterrupt() {},
      } as never)

      const performanceRuntime = useStageEmbodimentPerformanceRuntime({
        speechRenderState: speech.speechRenderState,
      })

      return {
        performanceRuntime,
        speech,
      }
    })!

    runtime.performanceRuntime.armPerformance(createPerformance({
      baseEmotion: 'thinking',
      delivery: 'calm',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
    }), {
      source: 'dialogue',
      variationToken: 'turn-clone-active-cue-companionship-authority',
    })
    await nextTick()

    startListener?.({
      item: {
        id: 'playback-clone-active-cue-companionship-authority',
        streamId: 'stream-clone-active-cue-companionship-authority',
        intentId: 'intent-clone-active-cue-companionship-authority',
        segmentId: 'segment-clone-active-cue-companionship-authority',
        ownerId: 'alice',
        priority: 0,
        text: '我先轻一点接回来。',
        special: null,
        continuityHoldMs: 220,
        audio: createBufferedSpeechAudioSource({} as AudioBuffer),
        createdAt: 0,
        cue: {
          id: 'segment-clone-active-cue-companionship-authority',
          index: 0,
          startOffset: 0,
          endOffset: 9,
          text: '我先轻一点接回来。',
          emotion: 'thinking',
          gestureWeight: 0.24,
          facialWeight: 0.5,
          prosodyWeight: 0.28,
          beatWeight: 0.22,
          mouthWeight: 0.26,
          headWeight: 0.2,
          facialHoldMs: 360,
          actionHoldMs: 280,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredExpressionAliases: ['RecoverSoft'],
            preferredMotionAliases: ['StillnessGuard'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 420,
            vrmActionFadeMs: 280,
            vrmExpressionBlendMs: 360,
          },
          actionCue: 'steady_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        },
        metadata: null,
        digitalLifeFrame: null,
      },
      startedAt: 100,
    })
    await nextTick()

    expect(runtime.performanceRuntime.state.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))

    runtime.speech.dispose()
    runtime.performanceRuntime.dispose()
    scope.stop()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('preserves post-utterance motion authority for vrm runtime consumption through the real stop projection path', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    let startListener: ((event: { item: any, startedAt: number }) => void) | undefined
    let endListener: ((event: { item: any, endedAt: number }) => void) | undefined

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const scope = effectScope()
    const runtime = scope.run(() => {
      const speech = useStageEmbodimentSpeech({
        audioContext,
        mouthOpenSize: ref(0),
        paused: ref(false),
        speechStylePitch: ref(0),
        speechStyleRate: ref(1),
        stageModelRenderer: ref('vrm'),
      })
      const performanceRuntime = useStageEmbodimentPerformanceRuntime({
        speechRenderState: speech.speechRenderState,
        upcomingSpeechSegment: speech.upcomingSpeechSegment,
      })
      speech.bindPlaybackManager({
        onStart(listener: (event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) {
          startListener = listener
        },
        onEnd(listener: (event: { item: PlaybackItem<BrowserSpeechAudioSource>, endedAt: number }) => void) {
          endListener = listener
        },
        onInterrupt() {},
      } as never)
      return {
        performanceRuntime,
        speech,
      }
    })!

    runtime.performanceRuntime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-scripted-post-driver-motion-vrm',
    })
    await nextTick()

    const item = {
      id: 'playback-scripted-stop-motion-vrm-1',
      streamId: 'stream-scripted-stop-motion-vrm-1',
      intentId: 'intent-scripted-stop-motion-vrm-1',
      segmentId: 'segment-scripted-stop-motion-vrm-1',
      ownerId: 'alice',
      priority: 0,
      text: '我先收一下动作。',
      special: null,
      continuityHoldMs: 240,
      audio: createBufferedSpeechAudioSource({} as AudioBuffer),
      createdAt: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-scripted-stop-motion-vrm-1',
          rendererTarget: 'vrm',
          replyText: '我先收一下动作。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-scripted-stop-motion-vrm-1',
              index: 0,
              text: '我先收一下动作。',
              interruptPolicy: 'soft-settle',
              preRollMs: 0,
              settleMs: 260,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 0,
            settleMs: 260,
          },
          facePlan: {
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-scripted-stop-motion-vrm-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.52,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.93,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-scripted-stop-motion-vrm-1',
              actionCue: 'steady_focus',
              intensity: 0.22,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    }

    startListener?.({ item, startedAt: 100 })
    await nextTick()
    endListener?.({ item, endedAt: 240 })
    await nextTick()

    vi.advanceTimersByTime(220)
    await nextTick()

    expect(['stopping', 'idle']).toContain(runtime.speech.speechRenderState.value.phase)
    expect(runtime.speech.playbackTelemetry.value?.rendererTarget).toBe('vrm')
    expect(runtime.speech.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      actionCue: 'observe_focus',
      holdMs: 280,
      source: 'timeline-projection',
      confidence: 0.88,
    }))
    expect(runtime.performanceRuntime.state.value.phase).toBe('cooldown')
    expect(runtime.performanceRuntime.state.value.driverRendererTarget).toBe('vrm')
    expect(runtime.performanceRuntime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-scripted-stop-motion-vrm-1',
      rendererTarget: 'vrm',
    }))
    expect(runtime.performanceRuntime.state.value.activeCueSource).toBe('preview')
    expect(runtime.performanceRuntime.state.value.activeCue).toEqual(expect.objectContaining({
      actionCue: 'observe_focus',
      settleMode: 'linger',
    }))
    expect(runtime.performanceRuntime.state.value.activeCue?.rendererSettle).toEqual(expect.objectContaining({
      vrmActionFadeMs: expect.any(Number),
      vrmExpressionBlendMs: expect.any(Number),
    }))
    expect(runtime.performanceRuntime.state.value.activeActionCue).toBe('observe_focus')
    expect(runtime.performanceRuntime.state.value.activeActionCueSource).toBe('preview')

    runtime.speech.dispose()
    runtime.performanceRuntime.dispose()
    scope.stop()
  })

  it('consumes explicit playback telemetry drivers when segment metadata is absent', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-explicit-playback-telemetry',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.14,
        prosodyIntensity: 0.1,
        emphasisLevel: 0.08,
        cadencePulse: 0.18,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-explicit-playback-telemetry',
        segmentId: 'segment-explicit-playback-telemetry',
        special: null,
        streamId: 'stream-explicit-playback-telemetry',
        text: '然后点保存。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.04,
    }
    await nextTick()

    const baselineProsodyDrive = runtime.state.value.prosodyDrive
    expect(runtime.state.value.activeFacialCue).toBe('smile')
    expect(runtime.state.value.activeFacialCueSource).toBe('resident')
    expect(runtime.state.value.activeActionCue).toBe('raise_hand_excited')
    expect(runtime.state.value.activeActionCueSource).toBe('resident')

    playbackTelemetry.value = {
      actualDurationMs: 180,
      driftMs: 0,
      plannedDurationMs: 180,
      settleMs: 220,
      stopReason: null,
      driverAuthority: {
        segmentId: 'segment-explicit-playback-telemetry',
        rendererTarget: 'live2d',
        matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
        sources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
        bodySegmentMatched: true,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      },
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.82,
          gazeStability: 0.76,
          breathAmplitude: 0.24,
          expressivity: 0.31,
          segmentId: 'segment-explicit-playback-telemetry',
        },
        face: {
          emotion: 'happy',
          facialCue: 'reassure_smile',
          intensity: 0.72,
          holdMs: 360,
          preUtteranceCue: 'soft-breath',
          postUtteranceCue: 'settle-smile',
          segmentId: 'segment-explicit-playback-telemetry',
          source: 'prosody-authority',
          confidence: 0.94,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-explicit-playback-telemetry',
          continuityHoldMs: 240,
          visemeHints: [
            { segmentId: 'segment-explicit-playback-telemetry', viseme: 'U', weight: 0.92, source: 'prosody-authority', confidence: 0.89 },
            { segmentId: 'segment-explicit-playback-telemetry', viseme: 'closed', weight: 0.58, source: 'prosody-authority', confidence: 0.77 },
          ],
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'idle_gentle_nod',
          intensity: 0.58,
          holdMs: 180,
          segmentId: 'segment-explicit-playback-telemetry',
          source: 'timeline-projection',
          confidence: 0.88,
        },
      },
    }
    await nextTick()

    expect(runtime.state.value.activeFacialCue).toBe('reassure_smile')
    expect(runtime.state.value.activeFacialCueSource).toBe('segment')
    expect(runtime.state.value.activeActionCue).toBe('idle_gentle_nod')
    expect(runtime.state.value.activeActionCueSource).toBe('segment')
    expect(runtime.state.value.prosodyDrive).toBeGreaterThan(baselineProsodyDrive)
    expect(runtime.state.value.facialCueIntensity).toBeGreaterThan(0.8)
    expect(runtime.state.value.actionIntensity).toBeGreaterThan(0.7)
    expect(runtime.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      source: 'prosody-authority',
      confidence: 0.94,
    }))
    expect(runtime.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      source: 'timeline-projection',
      confidence: 0.88,
    }))
    expect(runtime.playbackTelemetry.value?.drivers.lipsync).toEqual(expect.objectContaining({
      mode: 'energy-phoneme-hybrid',
      segmentId: 'segment-explicit-playback-telemetry',
      visemeHints: [
        { segmentId: 'segment-explicit-playback-telemetry', viseme: 'U', weight: 0.92, source: 'prosody-authority', confidence: 0.89 },
        { segmentId: 'segment-explicit-playback-telemetry', viseme: 'closed', weight: 0.58, source: 'prosody-authority', confidence: 0.77 },
      ],
    }))
    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-explicit-playback-telemetry',
      rendererTarget: 'live2d',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      sources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })

    scope.stop()
  })

  it('consumes explicit playback telemetry cue renderer metadata when item cue metadata is absent', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-explicit-playback-cue-metadata',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-explicit-playback-cue-metadata',
        segmentId: 'segment-explicit-playback-cue-metadata',
        special: null,
        streamId: 'stream-explicit-playback-cue-metadata',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
    }
    await nextTick()

    playbackTelemetry.value = createPlaybackTelemetryFixture({
      actualDurationMs: 240,
      driftMs: 0,
      plannedDurationMs: 240,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'vrm',
      cue: {
        id: 'segment-explicit-playback-cue-metadata',
        endOffset: 6,
        text: '继续看这里。',
        emotion: 'thinking',
        gestureWeight: 0.34,
        facialWeight: 0.52,
        prosodyWeight: 0.36,
        beatWeight: 0.3,
        mouthWeight: 0.28,
        headWeight: 0.32,
        facialHoldMs: 320,
        actionHoldMs: 240,
        emotionHoldMs: 320,
        actionCue: 'observe_focus',
        facialCue: 'focused',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        rendererHints: {
          preferredExpressionAliases: ['CalmInspect'],
          preferredMotionAliases: ['ObserveSoft'],
        },
        rendererSettle: {
          live2dFacialReleaseMs: 320,
          live2dMotionFollowThroughMs: 440,
          vrmActionFadeMs: 280,
          vrmExpressionBlendMs: 360,
        },
      },
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.52,
          holdMs: 320,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-explicit-playback-cue-metadata',
          source: 'prosody-authority',
          confidence: 0.94,
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.34,
          holdMs: 240,
          segmentId: 'segment-explicit-playback-cue-metadata',
          source: 'timeline-projection',
          confidence: 0.88,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-explicit-playback-cue-metadata',
          continuityHoldMs: 0,
          visemeHints: [
            { segmentId: 'segment-explicit-playback-cue-metadata', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
      },
    })
    await nextTick()

    expect(runtime.state.value.activeCue?.rendererHints?.preferredExpressionAliases).toEqual(['CalmInspect'])
    expect(runtime.state.value.activeCue?.rendererHints?.preferredMotionAliases).toEqual(['ObserveSoft'])
    expect(runtime.state.value.activeCue?.rendererSettle).toEqual({
      live2dFacialReleaseMs: 320,
      live2dMotionFollowThroughMs: 440,
      vrmActionFadeMs: 520,
      vrmExpressionBlendMs: 600,
    })

    scope.stop()
  })

  it('extends vrm settle timing for companionship-biased aliases so expression and action release stay on the same same-her line', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      variationToken: 'turn-measured-return-vrm-settle',
    })

    playbackTelemetry.value = createPlaybackTelemetryFixture({
      cue: {
        id: 'segment-measured-return-vrm-settle',
        endOffset: 5,
        text: '让我继续陪着你。',
        emotion: 'thinking',
        gestureWeight: 0.28,
        facialWeight: 0.48,
        prosodyWeight: 0.34,
        beatWeight: 0.24,
        mouthWeight: 0.22,
        headWeight: 0.3,
        facialHoldMs: 340,
        actionHoldMs: 220,
        emotionHoldMs: 340,
        actionCue: 'observe_focus',
        facialCue: 'soft-gaze',
        actionWindow: 'cadence-peak',
        interruptMode: 'soft-interrupt',
        rendererHints: {
          preferredExpressionAliases: ['recover-soft', 'soft-gaze'],
          preferredMotionAliases: ['stillness_guard', 'observe_focus'],
        },
        rendererSettle: {
          live2dFacialReleaseMs: 420,
          live2dMotionFollowThroughMs: 520,
          vrmActionFadeMs: 280,
          vrmExpressionBlendMs: 360,
        },
      },
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.48,
          holdMs: 340,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-measured-return-vrm-settle',
          source: 'prosody-authority',
          confidence: 0.92,
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.28,
          holdMs: 220,
          segmentId: 'segment-measured-return-vrm-settle',
          source: 'timeline-projection',
          confidence: 0.9,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-measured-return-vrm-settle',
          continuityHoldMs: 0,
          visemeHints: [],
        },
      },
    })
    await nextTick()

    expect(runtime.state.value.activeCue?.rendererSettle).toEqual({
      live2dFacialReleaseMs: 420,
      live2dMotionFollowThroughMs: 520,
      vrmActionFadeMs: 640,
      vrmExpressionBlendMs: 720,
    })

    scope.stop()
  })

  it('keeps vrm action fade more guarded when renderer continuity has rejoined before body authority fully returns', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      variationToken: 'turn-vrm-renderer-only-fade-guard',
    })

    const baseTelemetry = createPlaybackTelemetryFixture({
      cue: {
        id: 'segment-vrm-renderer-only-fade-guard',
        endOffset: 7,
        text: '先收回来一点。',
        emotion: 'thinking',
        gestureWeight: 0.22,
        facialWeight: 0.42,
        prosodyWeight: 0.28,
        beatWeight: 0.18,
        mouthWeight: 0.2,
        headWeight: 0.2,
        facialHoldMs: 360,
        actionHoldMs: 320,
        emotionHoldMs: 360,
        actionCue: 'idle_settle',
        facialCue: 'soft-gaze',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 280,
          vrmExpressionBlendMs: 340,
        },
      },
      driverAuthority: {
        segmentId: 'segment-vrm-renderer-only-fade-guard',
        rendererTarget: 'vrm',
        matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
        sources: ['prosody-authority', 'timeline-projection'],
        bodySegmentMatched: true,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      },
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.42,
          holdMs: 360,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-vrm-renderer-only-fade-guard',
          source: 'prosody-authority',
          confidence: 0.94,
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'idle_settle',
          intensity: 0.2,
          holdMs: 320,
          segmentId: 'segment-vrm-renderer-only-fade-guard',
          source: 'timeline-projection',
          confidence: 0.88,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-vrm-renderer-only-fade-guard',
          continuityHoldMs: 220,
          visemeHints: [],
        },
      },
    })

    playbackTelemetry.value = baseTelemetry
    await nextTick()

    const fullyMatchedSettle = runtime.state.value.activeCue?.rendererSettle

    playbackTelemetry.value = {
      ...baseTelemetry,
      driverAuthority: {
        segmentId: 'segment-vrm-renderer-only-fade-guard',
        rendererTarget: 'vrm',
        matchedDrivers: ['face', 'motion', 'lipsync'],
        sources: ['prosody-authority', 'timeline-projection'],
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      },
      drivers: {
        ...baseTelemetry.drivers,
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.42,
          holdMs: 360,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-vrm-renderer-only-fade-guard',
          source: 'prosody-authority',
          confidence: 0.94,
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'idle_settle',
          intensity: 0.2,
          holdMs: 320,
          segmentId: 'segment-vrm-renderer-only-fade-guard',
          source: 'timeline-projection',
          confidence: 0.88,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-vrm-renderer-only-fade-guard',
          continuityHoldMs: 220,
          visemeHints: [],
        },
      },
    }
    await nextTick()

    expect(runtime.state.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(runtime.state.value.activeCue?.rendererSettle?.vrmActionFadeMs).toBe(440)
    expect(runtime.state.value.activeCue?.rendererSettle?.vrmExpressionBlendMs).toBe(500)
    expect(fullyMatchedSettle).toEqual({
      live2dFacialReleaseMs: 360,
      live2dMotionFollowThroughMs: 420,
      vrmActionFadeMs: 440,
      vrmExpressionBlendMs: 500,
    })
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      bodySegmentMatched: false,
      matchedDrivers: ['face', 'motion', 'lipsync'],
      segmentId: 'segment-vrm-renderer-only-fade-guard',
    }))
    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeCue?.rendererSettle?.live2dFacialReleaseMs).toBe(360)
    expect(runtime.state.value.activeCue?.rendererSettle?.live2dMotionFollowThroughMs).toBe(420)
    expect(runtime.state.value.activeCue?.rendererSettle?.vrmActionFadeMs).toBe(
      fullyMatchedSettle?.vrmActionFadeMs ?? 0,
    )
    expect(runtime.state.value.activeCue?.rendererSettle?.vrmExpressionBlendMs).toBe(
      fullyMatchedSettle?.vrmExpressionBlendMs ?? 0,
    )

    scope.stop()
  })

  it('keeps preview facial and action cues inward while renderer-only recovery is visible before body authority returns', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>({
      actualDurationMs: 320,
      plannedDurationMs: 320,
      driftMs: 0,
      settleMs: 340,
      stopReason: 'ended',
      rendererTarget: 'vrm',
      driverAuthority: {
        segmentId: 'segment-preview-renderer-only-inward',
        rendererTarget: 'vrm',
        matchedDrivers: ['face', 'motion', 'lipsync'],
        sources: ['prosody-authority', 'timeline-projection'],
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      },
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'soft-release',
          intensity: 0.38,
          holdMs: 360,
          source: 'prosody-authority',
          confidence: 0.94,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-preview-renderer-only-inward',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'idle_settle',
          intensity: 0.16,
          holdMs: 320,
          source: 'timeline-projection',
          confidence: 0.9,
          segmentId: 'segment-preview-renderer-only-inward',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: 'segment-preview-renderer-only-inward',
          continuityHoldMs: 280,
          visemeHints: [
            { segmentId: 'segment-preview-renderer-only-inward', viseme: 'closed', weight: 0.62, source: 'prosody-authority', confidence: 0.91 },
          ],
        },
      },
      cue: {
        id: 'segment-preview-renderer-only-inward',
        index: 0,
        startOffset: 0,
        endOffset: 10,
        text: '先收回来一点。',
        emotion: 'thinking',
        gestureWeight: 0.18,
        facialWeight: 0.34,
        prosodyWeight: 0.24,
        beatWeight: 0.16,
        mouthWeight: 0.28,
        headWeight: 0.18,
        facialHoldMs: 360,
        actionHoldMs: 320,
        emotionHoldMs: 360,
        actionCue: 'idle_settle',
        facialCue: 'soft-release',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        settleMode: 'hold',
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard'],
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 300,
          vrmExpressionBlendMs: 360,
        },
      },
    })
    const upcomingSpeechSegment = ref(createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-preview-renderer-only-inward',
      segmentId: 'segment-preview-renderer-only-inward',
      special: null,
      streamId: 'stream-preview-renderer-only-inward',
      text: '先收回来一点。',
      cue: {
        id: 'segment-preview-renderer-only-inward',
        index: 0,
        startOffset: 0,
        endOffset: 10,
        text: '先收回来一点。',
        emotion: 'thinking',
        gestureWeight: 0.18,
        facialWeight: 0.34,
        prosodyWeight: 0.24,
        beatWeight: 0.16,
        mouthWeight: 0.28,
        headWeight: 0.18,
        facialHoldMs: 360,
        actionHoldMs: 320,
        emotionHoldMs: 360,
        actionCue: 'idle_settle',
        facialCue: 'soft-release',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        settleMode: 'hold',
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard'],
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 300,
          vrmExpressionBlendMs: 360,
        },
      },
      digitalLifeFrame: createDigitalLifeFrameFixture({
        id: 'segment-preview-renderer-only-inward',
        endOffset: 10,
        text: '先收回来一点。',
        face: {
          emotion: 'thinking',
          facialCue: null,
          expressionMode: 'recover',
          intensity: 0.24,
          holdMs: 300,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: null,
          actionMode: 'none',
          intensity: 0.08,
          holdMs: 260,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        },
      }),
    }))
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      upcomingSpeechSegment,
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance({
      facialCue: 'focus',
      actionCue: 'steady_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
    }), {
      variationToken: 'turn-preview-renderer-only-inward',
    })
    await nextTick()

    const baselineSpeechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const baselinePlaybackTelemetry = ref<EmbodimentPlaybackTelemetry | null>({
      ...playbackTelemetry.value!,
      driverAuthority: {
        ...playbackTelemetry.value!.driverAuthority!,
        matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
        bodySegmentMatched: true,
      },
    })
    const baselineUpcomingSpeechSegment = ref(createStageEmbodimentSpeechPlaybackItem({
      ...upcomingSpeechSegment.value!,
      cue: upcomingSpeechSegment.value!.cue ? { ...upcomingSpeechSegment.value!.cue } : null,
      digitalLifeFrame: upcomingSpeechSegment.value!.digitalLifeFrame
        ? {
            ...upcomingSpeechSegment.value!.digitalLifeFrame,
            face: {
              ...upcomingSpeechSegment.value!.digitalLifeFrame.face,
              facialCue: 'soft-release',
              expressionMode: 'hold',
            },
            action: {
              ...upcomingSpeechSegment.value!.digitalLifeFrame.action,
              actionCue: 'idle_settle',
              actionMode: 'hold',
            },
            motor: {
              ...upcomingSpeechSegment.value!.digitalLifeFrame.motor,
              expressivity: 0.22,
              gaze: {
                ...upcomingSpeechSegment.value!.digitalLifeFrame.motor.gaze,
                focus: 0.62,
                stability: 0.58,
              },
              body: {
                ...upcomingSpeechSegment.value!.digitalLifeFrame.motor.body,
                settle: 0.72,
                openness: 0.3,
              },
            },
          }
        : null,
    }))
    const baselineScope = effectScope()
    const baselineRuntime = baselineScope.run(() => useStageEmbodimentPerformanceRuntime({
      upcomingSpeechSegment: baselineUpcomingSpeechSegment,
      playbackTelemetry: baselinePlaybackTelemetry,
      speechRenderState: baselineSpeechRenderState,
    }))!
    baselineRuntime.armPerformance(createPerformance({
      facialCue: 'focus',
      actionCue: 'steady_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
    }), {
      variationToken: 'turn-preview-renderer-rejoined-baseline',
    })
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      bodySegmentMatched: false,
      matchedDrivers: ['face', 'motion', 'lipsync'],
      segmentId: 'segment-preview-renderer-only-inward',
    }))
    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard'],
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(runtime.state.value.activeFacialCueSource).not.toBe('preview')
    expect(runtime.state.value.activeActionCueSource).not.toBe('preview')
    expect(runtime.state.value.activeFacialCue).not.toBe('soft-release')
    expect(runtime.state.value.activeActionCue).not.toBe('idle_settle')
    expect(runtime.state.value.focusDrive).toBeLessThanOrEqual(baselineRuntime.state.value.focusDrive)
    expect(runtime.state.value.motor.body.settle).toBeGreaterThanOrEqual(baselineRuntime.state.value.motor.body.settle)

    baselineScope.stop()
    scope.stop()
  })

  it('keeps a same-line runtime reopen more inward when repair-before-closeness follows measured-return before body authority returns', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      variationToken: 'turn-vrm-same-line-restrained-reopen',
    })

    const measuredTelemetry = createPlaybackTelemetryFixture({
      cue: {
        id: 'segment-vrm-same-line-restrained-reopen',
        endOffset: 10,
        text: '我先沿着这条线轻一点接回来。',
        emotion: 'thinking',
        gestureWeight: 0.24,
        facialWeight: 0.44,
        prosodyWeight: 0.24,
        beatWeight: 0.18,
        mouthWeight: 0.2,
        headWeight: 0.2,
        facialHoldMs: 360,
        actionHoldMs: 320,
        emotionHoldMs: 360,
        actionCue: 'steady_focus',
        facialCue: 'soft-gaze',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect'],
          preferredMotionAliases: ['ObserveSoft'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 440,
          vrmActionFadeMs: 280,
          vrmExpressionBlendMs: 360,
        },
      },
      driverAuthority: {
        segmentId: 'segment-vrm-same-line-restrained-reopen',
        rendererTarget: 'vrm',
        matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
        sources: ['prosody-authority', 'timeline-projection'],
        bodySegmentMatched: true,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      },
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.44,
          holdMs: 360,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-vrm-same-line-restrained-reopen',
          source: 'prosody-authority',
          confidence: 0.95,
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'steady_focus',
          intensity: 0.2,
          holdMs: 320,
          segmentId: 'segment-vrm-same-line-restrained-reopen',
          source: 'timeline-projection',
          confidence: 0.9,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-vrm-same-line-restrained-reopen',
          continuityHoldMs: 220,
          visemeHints: [],
        },
      },
    })

    playbackTelemetry.value = measuredTelemetry
    await nextTick()

    const measuredCue = runtime.state.value.activeCue
    expect(measuredCue).toEqual(expect.objectContaining({
      id: 'segment-vrm-same-line-restrained-reopen',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      rendererHints: expect.objectContaining({
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      }),
    }))

    playbackTelemetry.value = {
      ...measuredTelemetry,
      cue: createPlaybackCueFixture({
        ...measuredTelemetry.cue!,
        text: '我还在，只是先别一下子靠太近。',
        facialWeight: 0.32,
        gestureWeight: 0.18,
        mouthWeight: 0.16,
        headWeight: 0.16,
        actionCue: 'idle_settle',
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 380,
          live2dMotionFollowThroughMs: 460,
          vrmActionFadeMs: 300,
          vrmExpressionBlendMs: 380,
        },
      }),
      driverAuthority: {
        segmentId: 'segment-vrm-same-line-restrained-reopen',
        rendererTarget: 'vrm',
        matchedDrivers: ['face', 'motion', 'lipsync'],
        sources: ['prosody-authority', 'timeline-projection'],
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      },
      drivers: {
        ...measuredTelemetry.drivers,
        face: {
          ...measuredTelemetry.drivers.face!,
          intensity: 0.32,
          postUtteranceCue: 'soft-release',
        },
        motion: {
          ...measuredTelemetry.drivers.motion!,
          actionCue: 'idle_settle',
          intensity: 0.12,
        },
        lipsync: {
          ...measuredTelemetry.drivers.lipsync!,
          segmentId: 'segment-vrm-same-line-restrained-reopen',
        },
      },
    }
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-vrm-same-line-restrained-reopen',
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      matchedDrivers: ['face', 'motion', 'lipsync'],
    }))
    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-vrm-same-line-restrained-reopen',
      facialCue: 'soft-gaze',
      actionCue: 'idle_settle',
      rendererHints: expect.objectContaining({
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      }),
    }))
    expect(runtime.state.value.activeCue?.facialWeight ?? 0).toBeLessThan(measuredCue?.facialWeight ?? 1)
    expect(runtime.state.value.activeCue?.gestureWeight ?? 0).toBeLessThan(measuredCue?.gestureWeight ?? 1)
    expect(runtime.state.value.activeCue?.mouthWeight ?? 0).toBeLessThan(measuredCue?.mouthWeight ?? 1)
    expect(runtime.state.value.activeFacialCue).toBe('soft-release')
    expect(runtime.state.value.activeActionCue).toBe('idle_settle')
    expect(runtime.state.value.activeFacialCueSource).toBe('preview')
    expect(runtime.state.value.activeActionCueSource).toBe('preview')
    expect(runtime.state.value.actionIntensity).toBeGreaterThan(0)
    expect(runtime.state.value.performance.facialCue).toBe('soft-release')
    expect(runtime.state.value.performance.actionCue).toBe('idle_settle')
    expect(runtime.state.value.activeCue?.rendererSettle).toEqual(expect.objectContaining({
      live2dFacialReleaseMs: 380,
      live2dMotionFollowThroughMs: 460,
      vrmActionFadeMs: 460,
      vrmExpressionBlendMs: 540,
    }))
    expect(runtime.state.value.activeCue?.rendererSettle?.live2dFacialReleaseMs ?? 0).toBeGreaterThanOrEqual(380)
    expect(runtime.state.value.activeCue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0).toBeGreaterThanOrEqual(460)
    expect(runtime.state.value.activeCue?.rendererSettle?.vrmActionFadeMs ?? 0).toBeGreaterThanOrEqual(440)
    expect(runtime.state.value.activeCue?.rendererSettle?.vrmExpressionBlendMs ?? 0).toBeGreaterThanOrEqual(500)

    scope.stop()
  })

  it('preserves renderer settle authority through post-utterance stopping tail projection', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focused',
      actionCue: 'observe_focus',
      delivery: 'calm',
      emphasis: 1,
    }, {
      source: 'dialogue',
      variationToken: 'turn-post-utterance-settle-tail',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.42,
        prosodyIntensity: 0.34,
        emphasisLevel: 0.22,
        cadencePulse: 0.28,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-post-utterance-settle-tail',
        segmentId: 'segment-post-utterance-settle-tail',
        special: null,
        streamId: 'stream-post-utterance-settle-tail',
        text: '继续看这里。',
        cue: createPlaybackCueFixture({
          id: 'segment-post-utterance-settle-tail',
          endOffset: 6,
          text: '继续看这里。',
          emotion: 'thinking',
          gestureWeight: 0.34,
          facialWeight: 0.52,
          prosodyWeight: 0.36,
          beatWeight: 0.3,
          mouthWeight: 0.28,
          headWeight: 0.32,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 320,
          actionCue: 'observe_focus',
          facialCue: 'focused',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          rendererHints: {
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          rendererSettle: {
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 440,
            vrmActionFadeMs: 280,
            vrmExpressionBlendMs: 360,
          },
        }),
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.2,
    }

    playbackTelemetry.value = createPlaybackTelemetryFixture({
      actualDurationMs: 220,
      driftMs: 0,
      plannedDurationMs: 220,
      settleMs: 260,
      stopReason: null,
      rendererTarget: 'vrm',
      cue: {
        id: 'segment-post-utterance-settle-tail',
        endOffset: 6,
        text: '继续看这里。',
        emotion: 'thinking',
        gestureWeight: 0.34,
        facialWeight: 0.52,
        prosodyWeight: 0.36,
        beatWeight: 0.3,
        mouthWeight: 0.28,
        headWeight: 0.32,
        facialHoldMs: 320,
        actionHoldMs: 240,
        emotionHoldMs: 320,
        actionCue: 'observe_focus',
        facialCue: 'focused',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        rendererHints: {
          preferredExpressionAliases: ['CalmInspect'],
          preferredMotionAliases: ['ObserveSoft'],
        },
        rendererSettle: {
          live2dFacialReleaseMs: 320,
          live2dMotionFollowThroughMs: 440,
          vrmActionFadeMs: 280,
          vrmExpressionBlendMs: 360,
        },
      },
      drivers: {
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.52,
          holdMs: 320,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-post-utterance-settle-tail',
          source: 'prosody-authority',
          confidence: 0.94,
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.34,
          holdMs: 240,
          segmentId: 'segment-post-utterance-settle-tail',
          source: 'timeline-projection',
          confidence: 0.88,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-post-utterance-settle-tail',
          continuityHoldMs: 0,
          visemeHints: [
            { segmentId: 'segment-post-utterance-settle-tail', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
      },
    })
    await nextTick()

    speechRenderState.value = {
      ...speechRenderState.value,
      active: false,
      phase: 'stopping',
      revision: 2,
      visemeIntensity: 0,
    }
    await nextTick()

    expect(runtime.state.value.phase).toBe('cooldown')
    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeFacialCue).toBe('soft-release')
    expect(runtime.state.value.performance.facialCue).toBe('soft-release')
    expect(runtime.state.value.performance.actionCue).toBe('observe_focus')
    expect(runtime.state.value.activeCue?.facialCue).toBe('focused')
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-post-utterance-settle-tail',
      rendererTarget: 'vrm',
    }))
    expect(runtime.state.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      preferredExpressionAliases: ['CalmInspect'],
      preferredMotionAliases: ['ObserveSoft'],
    }))
    expect(runtime.state.value.activeCue?.rendererSettle).toEqual({
      live2dFacialReleaseMs: 320,
      live2dMotionFollowThroughMs: 440,
      vrmActionFadeMs: 520,
      vrmExpressionBlendMs: 600,
    })

    scope.stop()
  })

  it('derives active segment emotion from explicit playback driver face metadata when cue metadata is absent', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-explicit-driver-emotion',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.26,
        prosodyIntensity: 0.22,
        emphasisLevel: 0.16,
        cadencePulse: 0.28,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-explicit-driver-emotion',
        segmentId: 'segment-explicit-driver-emotion',
        special: null,
        streamId: 'stream-explicit-driver-emotion',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.12,
    }
    await nextTick()

    playbackTelemetry.value = {
      actualDurationMs: 220,
      driftMs: 0,
      plannedDurationMs: 220,
      settleMs: 260,
      stopReason: null,
      rendererTarget: 'vrm',
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.66,
          holdMs: 360,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-explicit-driver-emotion',
          source: 'prosody-authority',
          confidence: 0.94,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-explicit-driver-emotion',
          continuityHoldMs: 240,
          visemeHints: [
            { segmentId: 'segment-explicit-driver-emotion', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.42,
          holdMs: 220,
          segmentId: 'segment-explicit-driver-emotion',
          source: 'timeline-projection',
          confidence: 0.88,
        },
      },
    }
    await nextTick()

    expect(runtime.state.value.driverRendererTarget).toBe('vrm')
    expect(runtime.state.value.performance.baseEmotion).toBe('thinking')
    expect(runtime.state.value.performance.emotion).toBe('thinking')
    expect(runtime.state.value.activeFacialCue).toBe('focused')
    expect(runtime.state.value.activeActionCue).toBe('observe_focus')
    expect(runtime.state.value.activeCueSource).toBe('segment')
    expect(runtime.state.value.activeCue?.emotion).toBe('thinking')

    scope.stop()
  })

  it('keeps resident cues when explicit playback telemetry confidence is too low to override them', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-explicit-low-confidence',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.14,
        prosodyIntensity: 0.1,
        emphasisLevel: 0.08,
        cadencePulse: 0.18,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-explicit-low-confidence',
        segmentId: 'segment-explicit-low-confidence',
        special: null,
        streamId: 'stream-explicit-low-confidence',
        text: '然后点保存。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.04,
    }
    await nextTick()

    playbackTelemetry.value = {
      actualDurationMs: 180,
      driftMs: 0,
      plannedDurationMs: 180,
      settleMs: 220,
      stopReason: null,
      drivers: {
        body: null,
        face: {
          emotion: 'happy',
          facialCue: 'reassure_smile',
          intensity: 0.72,
          holdMs: 360,
          preUtteranceCue: 'soft-breath',
          postUtteranceCue: 'settle-smile',
          segmentId: 'segment-explicit-low-confidence',
          source: 'prosody-authority',
          confidence: 0.22,
        },
        lipsync: null,
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'idle_gentle_nod',
          intensity: 0.58,
          holdMs: 180,
          segmentId: 'segment-explicit-low-confidence',
          source: 'timeline-projection',
          confidence: 0.24,
        },
      },
    }
    await nextTick()

    expect(runtime.state.value.activeFacialCue).toBe('smile')
    expect(runtime.state.value.activeFacialCueSource).toBe('resident')
    expect(runtime.state.value.activeActionCue).toBe('raise_hand_excited')
    expect(runtime.state.value.activeActionCueSource).toBe('resident')
    expect(runtime.state.value.facialCueIntensity).toBeLessThan(0.8)
    expect(runtime.state.value.actionIntensity).toBeLessThan(0.7)

    scope.stop()
  })

  it('modulates speaking dynamics from digital-life spine architecture and memory signals', async () => {
    const speechBase = {
      active: true,
      dynamics: {
        speechEnergy: 0.28,
        prosodyIntensity: 0.22,
        emphasisLevel: 0.18,
        cadencePulse: 0.26,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-spine',
        segmentId: 'segment-spine',
        special: null,
        streamId: 'stream-spine',
        text: '继续推进这一段。',
      }),
      phase: 'playing' as const,
      revision: 1,
      visemeIntensity: 0.22,
    }

    const baselineSpeech = ref({
      ...createIdleStageEmbodimentSpeechRenderState(),
      ...speechBase,
    })
    const baselineScope = effectScope()
    const baselineRuntime = baselineScope.run(() => useStageEmbodimentPerformanceRuntime({
      speechRenderState: baselineSpeech,
    }))!
    baselineRuntime.armPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'observe_focus',
      delivery: 'calm',
      emphasis: 1,
    }, {
      source: 'dialogue',
      variationToken: 'baseline',
    })
    await nextTick()

    const focusedDigest = ref(createDigitalLifeSpineDigest({
      confidence: 0.24,
      dominantSystem: 'memory',
      operatingMode: 'observing',
      recallMode: 'subconscious-memory',
      watchMode: 'recovering',
    }))
    const focusedSpeech = ref({
      ...createIdleStageEmbodimentSpeechRenderState(),
      ...speechBase,
    })
    const focusedScope = effectScope()
    const focusedRuntime = focusedScope.run(() => useStageEmbodimentPerformanceRuntime({
      digitalLifeSpineDigest: focusedDigest,
      speechRenderState: focusedSpeech,
    }))!
    focusedRuntime.armPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'observe_focus',
      delivery: 'calm',
      emphasis: 1,
    }, {
      source: 'dialogue',
      variationToken: 'focused',
    })
    await nextTick()

    expect(focusedRuntime.state.value.actionIntensity).toBeLessThan(baselineRuntime.state.value.actionIntensity)
    expect(focusedRuntime.state.value.breathDrive).toBeGreaterThan(baselineRuntime.state.value.breathDrive)

    baselineScope.stop()
    focusedScope.stop()
  })

  it('respects cue-specific hold windows before falling back to resident cues', async () => {
    const nowSpy = vi.spyOn(performance, 'now')
    let now = 0
    nowSpy.mockImplementation(() => now)

    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-hold-window',
    })

    now = 100
    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.42,
        prosodyIntensity: 0.36,
        emphasisLevel: 0.24,
        cadencePulse: 0.48,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-hold-1',
        segmentId: 'segment-hold-1',
        special: null,
        streamId: 'stream-hold',
        text: '先看这里。',
        cue: {
          id: 'turn-hold-window:0',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里。',
          emotion: 'thinking',
          gestureWeight: 0.62,
          facialWeight: 0.68,
          prosodyWeight: 0.54,
          beatWeight: 0.38,
          mouthWeight: 0.58,
          headWeight: 0.64,
          facialHoldMs: 560,
          actionHoldMs: 520,
          emotionHoldMs: 540,
          settleMode: 'linger',
          rendererSettle: {
            live2dFacialReleaseMs: 780,
            live2dMotionFollowThroughMs: 620,
            vrmActionFadeMs: 360,
            vrmExpressionBlendMs: 420,
          },
          actionCue: 'point_screen',
          facialCue: 'focused',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        },
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.44,
    }
    await nextTick()

    expect(runtime.state.value.performance.facialCue).toBe('focused')
    expect(runtime.state.value.performance.actionCue).toBe('point_screen')
    expect(runtime.state.value.performance.baseEmotion).toBe('thinking')

    now = 480
    speechRenderState.value = {
      ...speechRenderState.value,
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-hold-2',
        segmentId: 'segment-hold-2',
        special: null,
        streamId: 'stream-hold',
        text: '继续说。',
      }),
      revision: 2,
    }
    await nextTick()

    expect(runtime.state.value.performance.facialCue).toBe('focused')
    expect(runtime.state.value.performance.actionCue).toBe('point_screen')
    expect(runtime.state.value.activeCue?.settleMode).toBe('linger')
    expect(runtime.state.value.activeCue?.rendererSettle?.live2dFacialReleaseMs).toBe(780)
    expect(runtime.state.value.activeCue?.rendererSettle?.live2dMotionFollowThroughMs).toBe(620)
    expect(runtime.state.value.activeCue?.rendererSettle?.vrmActionFadeMs).toBe(360)
    expect(runtime.state.value.performance.baseEmotion).toBe('thinking')

    now = 760
    speechRenderState.value = {
      ...speechRenderState.value,
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-hold-3',
        segmentId: 'segment-hold-3',
        special: null,
        streamId: 'stream-hold',
        text: '继续说。',
      }),
      revision: 3,
    }
    await nextTick()

    expect(runtime.state.value.performance.facialCue).toBe('smile')
    expect(runtime.state.value.performance.actionCue).toBe('raise_hand_excited')
    expect(runtime.state.value.performance.baseEmotion).toBe('happy')
    expect(runtime.state.value.activeCue).toBeNull()

    scope.stop()
  })

  it('exposes playback telemetry without changing performance state flow', () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>({
      actualDurationMs: 0,
      driftMs: 380,
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.78,
          gazeStability: 0.72,
          breathAmplitude: 0.2,
          expressivity: 0.26,
          segmentId: 'segment-pass-through-body',
        },
        face: null,
        lipsync: null,
        motion: null,
      },
      plannedDurationMs: 0,
      settleMs: 560,
      stopReason: null,
    })
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(runtime.playbackTelemetry.value).toEqual({
      actualDurationMs: 0,
      driftMs: 380,
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.78,
          gazeStability: 0.72,
          breathAmplitude: 0.2,
          expressivity: 0.26,
          segmentId: 'segment-pass-through-body',
        },
        face: null,
        lipsync: null,
        motion: null,
      },
      plannedDurationMs: 0,
      settleMs: 560,
      stopReason: null,
    })
    expect(runtime.state.value.phase).toBe('idle')

    scope.stop()
  })

  it('surfaces vrm playback telemetry rendererTarget in performance runtime state', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>({
      actualDurationMs: 920,
      plannedDurationMs: 920,
      driftMs: 0,
      settleMs: 220,
      stopReason: null,
      rendererTarget: 'vrm',
      driverAuthority: {
        segmentId: 'segment-vrm-performance',
        rendererTarget: 'vrm',
        matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
        sources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
        bodySegmentMatched: true,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      },
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.8,
          gazeStability: 0.74,
          breathAmplitude: 0.22,
          expressivity: 0.29,
          segmentId: 'segment-vrm-performance',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.56,
          holdMs: 360,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-vrm-performance',
          source: 'prosody-authority',
          confidence: 0.94,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-vrm-performance',
          continuityHoldMs: 240,
          visemeHints: [
            { segmentId: 'segment-vrm-performance', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'inspect_follow',
          intensity: 0.4,
          holdMs: 220,
          segmentId: 'segment-vrm-performance',
          source: 'timeline-projection',
          confidence: 0.88,
        },
      },
    })
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(runtime.playbackTelemetry.value?.rendererTarget).toBe('vrm')
    expect((runtime.state.value as any).driverRendererTarget).toBe('vrm')
    expect(runtime.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      source: 'prosody-authority',
    }))
    expect((runtime.state.value as any).driverAuthority).toEqual({
      segmentId: 'segment-vrm-performance',
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      sources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })

    scope.stop()
  })

  it('deduplicates derived authority sources when runtime reconstructs authority from playback drivers', async () => {
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-derived-authority-sources',
        segmentId: 'segment-derived-authority-sources',
        special: null,
        streamId: 'stream-derived-authority-sources',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
    }))
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>({
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'vrm',
      driverAuthority: null,
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.52,
          holdMs: 320,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-derived-authority-sources',
          source: 'prosody-authority',
          confidence: 0.94,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-derived-authority-sources',
          continuityHoldMs: 240,
          visemeHints: [
            { segmentId: 'segment-derived-authority-sources', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
            { segmentId: 'segment-derived-authority-sources', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.34,
          holdMs: 240,
          source: 'timeline-projection',
          confidence: 0.88,
          segmentId: 'segment-derived-authority-sources',
        },
      },
    })
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-derived-authority-sources',
      rendererTarget: 'vrm',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'timeline-projection'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })

    scope.stop()
  })

  it('reconstructs authority segment and sources from unanimous viseme hints when no seeded authority or lipsync segment id exists', async () => {
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-derived-viseme-authority',
        segmentId: null,
        special: null,
        streamId: 'stream-derived-viseme-authority',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
    }))
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>({
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'vrm',
      driverAuthority: null,
      drivers: {
        body: null,
        face: null,
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: null,
          continuityHoldMs: 240,
          visemeHints: [
            { segmentId: 'segment-derived-viseme-authority', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
            { segmentId: 'segment-derived-viseme-authority', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
        motion: null,
      },
    })
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-derived-viseme-authority',
      rendererTarget: 'vrm',
      matchedDrivers: ['lipsync'],
      sources: ['prosody-authority'],
      bodySegmentMatched: false,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })

    scope.stop()
  })

  it('suppresses resident face and action carry when lipsync proof leads the current segment alone', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-lipsync-proof-suppresses-resident-carry',
    })
    await nextTick()

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-lipsync-proof-suppresses-resident-carry',
        segmentId: 'segment-lipsync-proof-suppresses-resident-carry',
        special: null,
        streamId: 'stream-lipsync-proof-suppresses-resident-carry',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
    }
    playbackTelemetry.value = {
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'vrm',
      driverAuthority: null,
      drivers: {
        body: null,
        face: null,
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: null,
          continuityHoldMs: 240,
          visemeHints: [
            { segmentId: 'segment-lipsync-proof-suppresses-resident-carry', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
            { segmentId: 'segment-lipsync-proof-suppresses-resident-carry', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
        motion: null,
      },
    }
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-lipsync-proof-suppresses-resident-carry',
      rendererTarget: 'vrm',
      matchedDrivers: ['lipsync'],
      sources: ['prosody-authority'],
      bodySegmentMatched: false,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })
    expect(runtime.state.value.activeCueSource).toBe('segment')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'driver:segment-lipsync-proof-suppresses-resident-carry',
      mouthWeight: 0.75,
      text: '继续看这里。',
    }))
    expect(runtime.state.value.activeFacialCue).toBeNull()
    expect(runtime.state.value.activeFacialCueSource).toBe('none')
    expect(runtime.state.value.activeActionCue).toBeNull()
    expect(runtime.state.value.activeActionCueSource).toBe('none')
    expect(runtime.state.value.performance.facialCue).toBeNull()
    expect(runtime.state.value.performance.actionCue).toBeNull()

    scope.stop()
  })

  it('preserves prosody authority as a visible runtime source when voice is the only surviving same-segment line', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-runtime-prosody-only-authority',
        segmentId: 'segment-runtime-prosody-only-authority',
        special: null,
        streamId: 'stream-runtime-prosody-only-authority',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
    }
    playbackTelemetry.value = {
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'vrm',
      driverAuthority: null,
      prosodyAuthority: {
        segmentId: 'segment-runtime-prosody-only-authority',
        provenance: 'authority-bound',
        source: 'prosody-authority',
        mode: 'energy-phoneme-hybrid',
        cueProsodyWeight: 0.41,
        cueMouthWeight: 0.33,
        cueHeadWeight: 0.26,
        visemePeakWeight: 0.58,
      },
      drivers: {
        body: null,
        face: null,
        lipsync: null,
        motion: null,
      },
    }
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-runtime-prosody-only-authority',
      rendererTarget: 'vrm',
      matchedDrivers: ['voice'],
      sources: ['prosody-authority'],
      bodySegmentMatched: false,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
      voiceSegmentMatched: true,
      prosodyAuthority: {
        segmentId: 'segment-runtime-prosody-only-authority',
        provenance: 'authority-bound',
        source: 'prosody-authority',
        mode: 'energy-phoneme-hybrid',
        cueProsodyWeight: 0.41,
        cueMouthWeight: 0.33,
        cueHeadWeight: 0.26,
        visemePeakWeight: 0.58,
      },
    })

    scope.stop()
  })

  it('does not keep a lipsync-only authority lane alive from stale idle-phase telemetry after the active segment has moved on', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-stale-lipsync-authority-should-drop',
    })
    await nextTick()

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-stale-lipsync-authority-should-drop',
        segmentId: 'segment-fresh-living-line',
        special: null,
        streamId: 'stream-stale-lipsync-authority-should-drop',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
    }
    playbackTelemetry.value = {
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'vrm',
      driverAuthority: null,
      drivers: {
        body: null,
        face: null,
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: null,
          continuityHoldMs: 240,
          visemeHints: [
            { segmentId: 'segment-fresh-living-line', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
            { segmentId: 'segment-fresh-living-line', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
        motion: null,
      },
    }
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-fresh-living-line',
      rendererTarget: 'vrm',
      matchedDrivers: [],
      sources: [],
      bodySegmentMatched: false,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })
    expect(runtime.state.value.activeCueSource).toBe('none')
    expect(runtime.state.value.activeCue).toBeNull()
    expect(runtime.state.value.activeFacialCue).toBe('smile')
    expect(runtime.state.value.activeFacialCueSource).toBe('resident')
    expect(runtime.state.value.activeActionCue).toBe('raise_hand_excited')
    expect(runtime.state.value.activeActionCueSource).toBe('resident')

    scope.stop()
  })

  it('realigns face and motion with a late same-segment cue after lipsync already leads', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-late-same-segment-cue-realign',
    })
    await nextTick()

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-late-same-segment-cue-realign',
        segmentId: 'segment-late-same-segment-cue-realign',
        special: null,
        streamId: 'stream-late-same-segment-cue-realign',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
    }
    playbackTelemetry.value = {
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'vrm',
      driverAuthority: null,
      drivers: {
        body: null,
        face: null,
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: null,
          continuityHoldMs: 240,
          visemeHints: [
            { segmentId: 'segment-late-same-segment-cue-realign', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
            { segmentId: 'segment-late-same-segment-cue-realign', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
        motion: null,
      },
    }
    await nextTick()

    const lipsyncOnlyActionPulseRevision = runtime.state.value.actionPulse.revision
    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-late-same-segment-cue-realign',
      rendererTarget: 'vrm',
      matchedDrivers: ['lipsync'],
      sources: ['prosody-authority'],
      bodySegmentMatched: false,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })
    expect(runtime.state.value.activeActionCue).toBeNull()
    expect(runtime.state.value.activeActionCueSource).toBe('none')

    playbackTelemetry.value = {
      ...playbackTelemetry.value!,
      drivers: {
        ...playbackTelemetry.value!.drivers,
        body: {
          frameMode: 'measured-return',
          stillness: 0.82,
          gazeStability: 0.76,
          breathAmplitude: 0.24,
          expressivity: 0.31,
          segmentId: 'segment-late-same-segment-cue-realign',
        },
      },
      cue: {
        id: 'segment-late-same-segment-cue-realign',
        index: 0,
        startOffset: 0,
        endOffset: 6,
        text: '继续看这里。',
        emotion: 'thinking',
        gestureWeight: 0.34,
        facialWeight: 0.52,
        prosodyWeight: 0.36,
        beatWeight: 0.3,
        mouthWeight: 0.28,
        headWeight: 0.32,
        facialHoldMs: 320,
        actionHoldMs: 240,
        emotionHoldMs: 320,
        actionCue: 'observe_focus',
        facialCue: 'focused',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
      },
    }
    await nextTick()

    expect(runtime.state.value.activeCueSource).toBe('segment')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-late-same-segment-cue-realign',
      facialCue: 'focused',
      actionCue: 'observe_focus',
      emotion: 'thinking',
    }))
    expect(runtime.state.value.activeFacialCue).toBe('focused')
    expect(runtime.state.value.activeFacialCueSource).toBe('segment')
    expect(runtime.state.value.activeActionCue).toBe('observe_focus')
    expect(runtime.state.value.activeActionCueSource).toBe('segment')
    expect(runtime.state.value.actionPulse.revision).toBeGreaterThan(lipsyncOnlyActionPulseRevision)
    expect(runtime.state.value.actionPulse.reason).toBe('segment-start')
    expect(runtime.state.value.actionPulse.cue).toBe('observe_focus')
    expect(runtime.state.value.actionPulse.segmentId).toBe('segment-late-same-segment-cue-realign')
    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-late-same-segment-cue-realign',
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      sources: ['cue-bridge', 'prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })

    scope.stop()
  })

  it('realigns live2d face and motion after body-plus-voice continuity has been carrying the same segment alone via cue-bridged re-expansion', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-live2d-body-voice-realign',
    })
    await nextTick()

    speechRenderState.value = createSpeechRenderStateFixture({
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-live2d-body-voice-realign',
        segmentId: 'segment-live2d-body-voice-realign',
        special: null,
        streamId: 'stream-live2d-body-voice-realign',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
      articulation: {
        voice: createSpeechVoiceFixture({
          language: 'zh-CN',
          closureBias: 0.62,
          consonantPrecision: 0.84,
        }),
      },
    })
    playbackTelemetry.value = {
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'live2d',
      driverAuthority: {
        segmentId: 'segment-live2d-body-voice-realign',
        rendererTarget: 'live2d',
        matchedDrivers: ['body'],
        sources: [],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: false,
      },
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.84,
          gazeStability: 0.76,
          breathAmplitude: 0.24,
          expressivity: 0.30,
          segmentId: 'segment-live2d-body-voice-realign',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.44,
          holdMs: 240,
          source: 'prosody-authority',
          confidence: 0.94,
          preUtteranceCue: null,
          postUtteranceCue: null,
          segmentId: 'segment-other-live2d-face-realign',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-other-live2d-lipsync-realign',
          continuityHoldMs: 220,
          visemeHints: [
            { segmentId: 'segment-other-live2d-lipsync-realign', viseme: 'I', weight: 0.38, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.34,
          holdMs: 220,
          source: 'timeline-projection',
          confidence: 0.88,
          segmentId: 'segment-other-live2d-motion-realign',
        },
      },
      cue: null,
    }
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-live2d-body-voice-realign',
      rendererTarget: 'live2d',
      matchedDrivers: ['body'],
      sources: [],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })
    expect(runtime.state.value.activeFacialCueSource).not.toBe('segment')
    expect(runtime.state.value.activeActionCueSource).not.toBe('segment')
    const stoppingProsodyDrive = runtime.state.value.prosodyDrive
    const stoppingBreathDrive = runtime.state.value.breathDrive
    const stoppingFocusDrive = runtime.state.value.focusDrive

    const bodyVoiceOnlyActionPulseRevision = runtime.state.value.actionPulse.revision

    playbackTelemetry.value = {
      ...playbackTelemetry.value!,
      driverAuthority: null,
      drivers: {
        ...playbackTelemetry.value!.drivers,
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.52,
          holdMs: 320,
          source: 'cue-bridge' as never,
          confidence: 0.9,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-live2d-body-voice-realign',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.41,
          holdMs: 260,
          source: 'cue-bridge' as never,
          confidence: 0.87,
          segmentId: 'segment-live2d-body-voice-realign',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: null,
          continuityHoldMs: 220,
          visemeHints: [
            { segmentId: 'segment-live2d-body-voice-realign', viseme: 'A', weight: 0.46, source: 'prosody-authority', confidence: 0.93 },
            { segmentId: 'segment-live2d-body-voice-realign', viseme: 'closed', weight: 0.71, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
      },
      cue: {
        id: 'segment-live2d-body-voice-realign',
        index: 0,
        startOffset: 0,
        endOffset: 6,
        text: '继续看这里。',
        emotion: 'thinking',
        gestureWeight: 0.34,
        facialWeight: 0.52,
        prosodyWeight: 0.36,
        beatWeight: 0.3,
        mouthWeight: 0.28,
        headWeight: 0.32,
        facialHoldMs: 320,
        actionHoldMs: 240,
        emotionHoldMs: 320,
        actionCue: 'observe_focus',
        facialCue: 'focused',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
      },
    }
    await nextTick()

    expect(runtime.state.value.activeCueSource).toBe('segment')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-live2d-body-voice-realign',
      facialCue: 'focused',
      actionCue: 'observe_focus',
      emotion: 'thinking',
    }))
    expect(runtime.state.value.activeFacialCue).toBe('focused')
    expect(runtime.state.value.activeFacialCueSource).toBe('segment')
    expect(runtime.state.value.activeActionCue).toBe('observe_focus')
    expect(runtime.state.value.activeActionCueSource).toBe('segment')
    expect(runtime.state.value.actionPulse.revision).toBeGreaterThan(bodyVoiceOnlyActionPulseRevision)
    expect(runtime.state.value.actionPulse.reason).toBe('segment-start')
    expect(runtime.state.value.actionPulse.cue).toBe('observe_focus')
    expect(runtime.state.value.actionPulse.segmentId).toBe('segment-live2d-body-voice-realign')
    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-live2d-body-voice-realign',
      rendererTarget: 'live2d',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      sources: ['cue-bridge', 'prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })
    expect(runtime.state.value.driverRendererTarget).toBe('live2d')
    expect(runtime.state.value.driverAuthority?.sources).toContain('prosody-authority')
    expect(runtime.state.value.prosodyDrive).toBeGreaterThan(0)
    expect(runtime.state.value.breathDrive).toBeGreaterThan(0)
    expect(runtime.state.value.focusDrive).toBeGreaterThan(0)
    expect(runtime.state.value.prosodyDrive).toBeGreaterThanOrEqual(stoppingProsodyDrive)
    expect(runtime.state.value.breathDrive).toBeGreaterThanOrEqual(stoppingBreathDrive)
    expect(runtime.state.value.focusDrive).toBeGreaterThanOrEqual(stoppingFocusDrive)

    scope.stop()
  })

  it('realigns live2d face and motion after body-lipsync-voice continuity has been carrying the same segment alone via cue-bridged re-expansion', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-live2d-body-lipsync-voice-realign',
    })
    await nextTick()

    speechRenderState.value = createSpeechRenderStateFixture({
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-live2d-body-lipsync-voice-realign',
        segmentId: 'segment-live2d-body-lipsync-voice-realign',
        special: null,
        streamId: 'stream-live2d-body-lipsync-voice-realign',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
      articulation: {
        voice: createSpeechVoiceFixture({
          language: 'zh-CN',
          closureBias: 0.62,
          consonantPrecision: 0.84,
        }),
      },
    })
    playbackTelemetry.value = {
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'live2d',
      driverAuthority: {
        segmentId: 'segment-live2d-body-lipsync-voice-realign',
        rendererTarget: 'live2d',
        matchedDrivers: ['body', 'lipsync'],
        sources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      },
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.84,
          gazeStability: 0.76,
          breathAmplitude: 0.24,
          expressivity: 0.30,
          segmentId: 'segment-live2d-body-lipsync-voice-realign',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.44,
          holdMs: 240,
          source: 'prosody-authority',
          confidence: 0.94,
          preUtteranceCue: null,
          postUtteranceCue: null,
          segmentId: 'segment-other-live2d-body-lipsync-face-realign',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-live2d-body-lipsync-voice-realign',
          continuityHoldMs: 220,
          visemeHints: [
            { segmentId: 'segment-live2d-body-lipsync-voice-realign', viseme: 'A', weight: 0.46, source: 'prosody-authority', confidence: 0.93 },
            { segmentId: 'segment-live2d-body-lipsync-voice-realign', viseme: 'closed', weight: 0.71, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.34,
          holdMs: 220,
          source: 'timeline-projection',
          confidence: 0.88,
          segmentId: 'segment-other-live2d-body-lipsync-motion-realign',
        },
      },
      cue: null,
    }
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-live2d-body-lipsync-voice-realign',
      rendererTarget: 'live2d',
      matchedDrivers: ['body', 'lipsync'],
      sources: ['prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })
    expect(runtime.state.value.activeFacialCueSource).not.toBe('segment')
    expect(runtime.state.value.activeActionCueSource).not.toBe('segment')
    const bodyLipSyncVoiceActionPulseRevision = runtime.state.value.actionPulse.revision

    playbackTelemetry.value = {
      ...playbackTelemetry.value!,
      driverAuthority: null,
      drivers: {
        ...playbackTelemetry.value!.drivers,
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.52,
          holdMs: 320,
          source: 'cue-bridge' as never,
          confidence: 0.9,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-live2d-body-lipsync-voice-realign',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.41,
          holdMs: 260,
          source: 'cue-bridge' as never,
          confidence: 0.87,
          segmentId: 'segment-live2d-body-lipsync-voice-realign',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-live2d-body-lipsync-voice-realign',
          continuityHoldMs: 220,
          visemeHints: [
            { segmentId: 'segment-live2d-body-lipsync-voice-realign', viseme: 'A', weight: 0.46, source: 'prosody-authority', confidence: 0.93 },
            { segmentId: 'segment-live2d-body-lipsync-voice-realign', viseme: 'closed', weight: 0.71, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
      },
      cue: {
        id: 'segment-live2d-body-lipsync-voice-realign',
        index: 0,
        startOffset: 0,
        endOffset: 6,
        text: '继续看这里。',
        emotion: 'thinking',
        gestureWeight: 0.34,
        facialWeight: 0.52,
        prosodyWeight: 0.36,
        beatWeight: 0.3,
        mouthWeight: 0.28,
        headWeight: 0.32,
        facialHoldMs: 320,
        actionHoldMs: 240,
        emotionHoldMs: 320,
        actionCue: 'observe_focus',
        facialCue: 'focused',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        rendererHints: {
          residentMode: 'same-thread-continuation',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          signature: 'embodiment:audible-same-her-line',
          reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
        },
      },
    }
    await nextTick()

    expect(runtime.state.value.activeCueSource).toBe('segment')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-live2d-body-lipsync-voice-realign',
      facialCue: 'focused',
      actionCue: 'observe_focus',
      emotion: 'thinking',
    }))
    expect(runtime.state.value.activeFacialCue).toBe('focused')
    expect(runtime.state.value.activeFacialCueSource).toBe('segment')
    expect(runtime.state.value.activeActionCue).toBe('observe_focus')
    expect(runtime.state.value.activeActionCueSource).toBe('segment')
    expect(runtime.state.value.actionPulse.revision).toBeGreaterThan(bodyLipSyncVoiceActionPulseRevision)
    expect(runtime.state.value.actionPulse.reason).toBe('segment-start')
    expect(runtime.state.value.actionPulse.cue).toBe('observe_focus')
    expect(runtime.state.value.actionPulse.segmentId).toBe('segment-live2d-body-lipsync-voice-realign')
    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-live2d-body-lipsync-voice-realign',
      rendererTarget: 'live2d',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      sources: ['cue-bridge', 'prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })

    scope.stop()
  })

  it('replaces stale seeded live2d body-only authority once same-segment cue-bridged face and motion rejoin the living line', async () => {
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-live2d-seeded-body-only-rejoin',
        segmentId: 'segment-live2d-seeded-body-only-rejoin',
        special: null,
        streamId: 'stream-live2d-seeded-body-only-rejoin',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
      articulation: {
        voice: createSpeechVoiceFixture({
          language: 'zh-CN',
          closureBias: 0.62,
          consonantPrecision: 0.84,
        }),
      },
    }))
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>({
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'live2d',
      driverAuthority: {
        segmentId: 'segment-live2d-seeded-body-only-rejoin',
        rendererTarget: 'live2d',
        matchedDrivers: ['body'],
        sources: [],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: false,
      },
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.84,
          gazeStability: 0.76,
          breathAmplitude: 0.24,
          expressivity: 0.30,
          segmentId: 'segment-live2d-seeded-body-only-rejoin',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.52,
          holdMs: 320,
          source: 'prosody-authority',
          confidence: 0.9,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-live2d-seeded-body-only-rejoin',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: null,
          continuityHoldMs: 220,
          visemeHints: [
            { segmentId: 'segment-live2d-seeded-body-only-rejoin', viseme: 'A', weight: 0.46, source: 'prosody-authority', confidence: 0.93 },
            { segmentId: 'segment-live2d-seeded-body-only-rejoin', viseme: 'closed', weight: 0.71, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.41,
          holdMs: 260,
          source: 'timeline-projection',
          confidence: 0.87,
          segmentId: 'segment-live2d-seeded-body-only-rejoin',
        },
      },
      cue: {
        id: 'segment-live2d-seeded-body-only-rejoin',
        index: 0,
        startOffset: 0,
        endOffset: 6,
        text: '继续看这里。',
        emotion: 'thinking',
        gestureWeight: 0.34,
        facialWeight: 0.52,
        prosodyWeight: 0.36,
        beatWeight: 0.3,
        mouthWeight: 0.28,
        headWeight: 0.32,
        facialHoldMs: 320,
        actionHoldMs: 240,
        emotionHoldMs: 320,
        actionCue: 'observe_focus',
        facialCue: 'focused',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
      },
    })
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-live2d-seeded-body-only-rejoin',
      rendererTarget: 'live2d',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'timeline-projection'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })

    scope.stop()
  })

  it('replaces stale seeded live2d body-plus-lipsync authority once same-segment face and motion fully rejoin the living line', async () => {
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-live2d-seeded-body-lipsync-rejoin',
        segmentId: 'segment-live2d-seeded-body-lipsync-rejoin',
        special: null,
        streamId: 'stream-live2d-seeded-body-lipsync-rejoin',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
      articulation: {
        voice: createSpeechVoiceFixture({
          language: 'zh-CN',
          closureBias: 0.62,
          consonantPrecision: 0.84,
        }),
      },
    }))
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>({
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'live2d',
      driverAuthority: {
        segmentId: 'segment-live2d-seeded-body-lipsync-rejoin',
        rendererTarget: 'live2d',
        matchedDrivers: ['body', 'lipsync'],
        sources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      },
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.84,
          gazeStability: 0.76,
          breathAmplitude: 0.24,
          expressivity: 0.30,
          segmentId: 'segment-live2d-seeded-body-lipsync-rejoin',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.52,
          holdMs: 320,
          source: 'prosody-authority',
          confidence: 0.9,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-live2d-seeded-body-lipsync-rejoin',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-live2d-seeded-body-lipsync-rejoin',
          continuityHoldMs: 220,
          visemeHints: [
            { segmentId: 'segment-live2d-seeded-body-lipsync-rejoin', viseme: 'A', weight: 0.46, source: 'prosody-authority', confidence: 0.93 },
            { segmentId: 'segment-live2d-seeded-body-lipsync-rejoin', viseme: 'closed', weight: 0.71, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.41,
          holdMs: 260,
          source: 'timeline-projection',
          confidence: 0.87,
          segmentId: 'segment-live2d-seeded-body-lipsync-rejoin',
        },
      },
      cue: {
        id: 'segment-live2d-seeded-body-lipsync-rejoin',
        index: 0,
        startOffset: 0,
        endOffset: 6,
        text: '继续看这里。',
        emotion: 'thinking',
        gestureWeight: 0.34,
        facialWeight: 0.52,
        prosodyWeight: 0.36,
        beatWeight: 0.3,
        mouthWeight: 0.28,
        headWeight: 0.32,
        facialHoldMs: 320,
        actionHoldMs: 240,
        emotionHoldMs: 320,
        actionCue: 'observe_focus',
        facialCue: 'focused',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
      },
    })
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-live2d-seeded-body-lipsync-rejoin',
      rendererTarget: 'live2d',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'timeline-projection'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })

    scope.stop()
  })

  it('keeps audible-body measured-return playback more tentative when hesitant presence says face and motion still need to rejoin', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const baseDigitalLifeSpineDigest = createDigitalLifeSpineDigest({
      dominantSystem: 'dialogue',
      operatingMode: 'speaking',
    })
    const digitalLifeSpineDigest = ref<AlicizationDigitalLifeSpineDigest | null>({
      ...baseDigitalLifeSpineDigest,
      runtime: {
        ...baseDigitalLifeSpineDigest.runtime,
        preferredPresence: 'hesitant',
      },
      proactive: baseDigitalLifeSpineDigest.proactive
        ? {
            ...baseDigitalLifeSpineDigest.proactive,
            preferredPresence: 'hesitant',
          }
        : null,
    })
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      digitalLifeSpineDigest,
      playbackTelemetry,
      speechRenderState,
    }))!

    const baselineSpeechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const baselinePlaybackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const baselineScope = effectScope()
    const baselineRuntime = baselineScope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry: baselinePlaybackTelemetry,
      speechRenderState: baselineSpeechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-audible-body-hesitant-presence',
    })
    baselineRuntime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-audible-body-baseline',
    })
    await nextTick()

    speechRenderState.value = createSpeechRenderStateFixture({
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.16,
        prosodyIntensity: 0.12,
        emphasisLevel: 0.1,
        cadencePulse: 0.18,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-audible-body-hesitant-presence',
        segmentId: 'segment-audible-body-hesitant-presence',
        special: null,
        streamId: 'stream-audible-body-hesitant-presence',
        text: '我先沿着这条还活着的线轻一点接住。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
      articulation: {
        voice: createSpeechVoiceFixture({
          language: 'zh-CN',
          closureBias: 0.6,
          consonantPrecision: 0.82,
        }),
      },
    })
    playbackTelemetry.value = {
      actualDurationMs: 260,
      plannedDurationMs: 260,
      driftMs: 0,
      settleMs: 300,
      stopReason: null,
      rendererTarget: 'live2d',
      driverAuthority: {
        segmentId: 'segment-audible-body-hesitant-presence',
        rendererTarget: 'live2d',
        matchedDrivers: ['body'],
        sources: [],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: false,
      },
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.84,
          gazeStability: 0.76,
          breathAmplitude: 0.22,
          expressivity: 0.28,
          segmentId: 'segment-audible-body-hesitant-presence',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.42,
          holdMs: 220,
          source: 'prosody-authority',
          confidence: 0.9,
          preUtteranceCue: null,
          postUtteranceCue: null,
          segmentId: 'segment-stale-face-shell',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-audible-body-hesitant-presence',
          continuityHoldMs: 220,
          visemeHints: [
            { segmentId: 'segment-audible-body-hesitant-presence', viseme: 'I', weight: 0.34, source: 'prosody-authority', confidence: 0.9 },
          ],
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.3,
          holdMs: 220,
          source: 'timeline-projection',
          confidence: 0.86,
          segmentId: 'segment-stale-motion-shell',
        },
      },
      cue: null,
    }
    baselineSpeechRenderState.value = {
      ...speechRenderState.value,
    }
    baselinePlaybackTelemetry.value = {
      ...playbackTelemetry.value,
      driverAuthority: playbackTelemetry.value.driverAuthority
        ? { ...playbackTelemetry.value.driverAuthority }
        : null,
      drivers: (playbackTelemetry.value.drivers
        ? {
            body: playbackTelemetry.value.drivers.body
              ? { ...playbackTelemetry.value.drivers.body }
              : null,
            face: playbackTelemetry.value.drivers.face
              ? { ...playbackTelemetry.value.drivers.face }
              : null,
            lipsync: playbackTelemetry.value.drivers.lipsync
              ? {
                  ...playbackTelemetry.value.drivers.lipsync,
                  visemeHints: playbackTelemetry.value.drivers.lipsync.visemeHints
                    ? playbackTelemetry.value.drivers.lipsync.visemeHints.map(hint => ({ ...hint }))
                    : [],
                }
              : null,
            motion: playbackTelemetry.value.drivers.motion
              ? { ...playbackTelemetry.value.drivers.motion }
              : null,
          }
        : {
            body: null,
            face: null,
            lipsync: null,
            motion: null,
          }) as EmbodimentPlaybackTelemetry['drivers'],
    }
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-audible-body-hesitant-presence',
      matchedDrivers: ['body', 'lipsync'],
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
    }))
    expect(runtime.state.value.activeCueSource).not.toBe('segment')
    expect(runtime.state.value.activeFacialCueSource).not.toBe('segment')
    expect(runtime.state.value.activeActionCueSource).not.toBe('segment')
    expect(runtime.state.value.performance.delivery).toBe('hesitant')
    expect(runtime.state.value.activeCue).toBeNull()
    expect(runtime.state.value.driverAuthority?.rendererTarget).toBe('live2d')
    expect(runtime.state.value.expressionIntensity).toBeLessThanOrEqual(baselineRuntime.state.value.expressionIntensity)
    expect(runtime.state.value.actionIntensity).toBeLessThanOrEqual(baselineRuntime.state.value.actionIntensity)

    baselineScope.stop()
    scope.stop()
  })

  it('does not treat idle same-segment lipsync hint carry as a full rejoin while seeded live2d body-only authority is still holding the living line', async () => {
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.17,
        prosodyIntensity: 0.13,
        emphasisLevel: 0.11,
        cadencePulse: 0.18,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-live2d-idle-lipsync-hint-no-rejoin',
        segmentId: 'segment-live2d-idle-lipsync-hint-no-rejoin',
        special: null,
        streamId: 'stream-live2d-idle-lipsync-hint-no-rejoin',
        text: '先沿着这条线轻一点继续。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.04,
      articulation: {
        voice: createSpeechVoiceFixture({
          language: 'zh-CN',
          closureBias: 0.6,
          consonantPrecision: 0.82,
        }),
      },
    }))
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>({
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'live2d',
      driverAuthority: {
        segmentId: 'segment-live2d-idle-lipsync-hint-no-rejoin',
        rendererTarget: 'live2d',
        matchedDrivers: ['body'],
        sources: [],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: false,
      },
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.83,
          gazeStability: 0.75,
          breathAmplitude: 0.22,
          expressivity: 0.28,
          segmentId: 'segment-live2d-idle-lipsync-hint-no-rejoin',
        },
        face: null,
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: null,
          continuityHoldMs: 220,
          visemeHints: [
            { segmentId: 'segment-live2d-idle-lipsync-hint-no-rejoin', viseme: 'I', weight: 0.32, source: 'prosody-authority', confidence: 0.91 },
          ],
        },
        motion: null,
      },
      cue: null,
    })
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-live2d-idle-lipsync-hint-no-rejoin',
      rendererTarget: 'live2d',
      matchedDrivers: ['body'],
      sources: [],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })
    expect(runtime.state.value.activeCueSource).not.toBe('segment')
    expect(runtime.state.value.activeFacialCueSource).not.toBe('segment')
    expect(runtime.state.value.activeActionCueSource).not.toBe('segment')

    scope.stop()
  })

  it('does not revive live2d segment face and action cues from shell telemetry while body alone is still carrying same-segment continuity', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-live2d-body-only-shell-hold',
    })
    await nextTick()

    speechRenderState.value = createSpeechRenderStateFixture({
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-live2d-body-only-shell-hold',
        segmentId: 'segment-live2d-body-only-shell-hold',
        special: null,
        streamId: 'stream-live2d-body-only-shell-hold',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
      articulation: {
        voice: createSpeechVoiceFixture({
          language: 'zh-CN',
          closureBias: 0.62,
          consonantPrecision: 0.84,
        }),
      },
    })
    playbackTelemetry.value = {
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'live2d',
      driverAuthority: {
        segmentId: 'segment-live2d-body-only-shell-hold',
        rendererTarget: 'live2d',
        matchedDrivers: ['body'],
        sources: [],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: false,
      },
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.84,
          gazeStability: 0.76,
          breathAmplitude: 0.24,
          expressivity: 0.30,
          segmentId: 'segment-live2d-body-only-shell-hold',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0,
          holdMs: 0,
          source: null,
          confidence: 0,
          preUtteranceCue: null,
          postUtteranceCue: null,
          segmentId: 'segment-live2d-body-only-shell-hold',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: null,
          continuityHoldMs: 220,
          visemeHints: [],
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0,
          holdMs: 0,
          source: null,
          confidence: 0,
          segmentId: 'segment-live2d-body-only-shell-hold',
        },
      },
      cue: {
        id: 'segment-live2d-body-only-shell-hold',
        index: 0,
        startOffset: 0,
        endOffset: 6,
        text: '继续看这里。',
        emotion: 'thinking',
        gestureWeight: 0.34,
        facialWeight: 0.52,
        prosodyWeight: 0.36,
        beatWeight: 0.3,
        mouthWeight: 0.28,
        headWeight: 0.32,
        facialHoldMs: 320,
        actionHoldMs: 240,
        emotionHoldMs: 320,
        actionCue: 'observe_focus',
        facialCue: 'focused',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
      },
    }
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-live2d-body-only-shell-hold',
      rendererTarget: 'live2d',
      matchedDrivers: ['body'],
      sources: [],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })
    expect(runtime.state.value.activeCueSource).not.toBe('segment')
    expect(runtime.state.value.activeFacialCueSource).not.toBe('segment')
    expect(runtime.state.value.activeActionCueSource).not.toBe('segment')
    expect(runtime.state.value.activeCue?.id).not.toBe('segment-live2d-body-only-shell-hold')
    expect(runtime.state.value.activeFacialCue).not.toBe('focused')
    expect(runtime.state.value.activeActionCue).not.toBe('observe_focus')

    scope.stop()
  })

  it('does not relight a live2d same-her body-plus-voice carry into a fresh action pulse before motion has actually rejoined the living line', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-live2d-body-voice-only-audible-carry-runtime',
      streamId: 'stream-live2d-body-voice-only-audible-carry-runtime',
      segmentId: 'segment-live2d-body-voice-only-audible-carry-runtime',
      text: '我先沿着身体和声音还连着的这条线轻一点接回来。',
      special: null,
      continuityHoldMs: 240,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-live2d-body-voice-only-audible-carry-runtime',
          rendererTarget: 'live2d',
          replyText: '我先沿着身体和声音还连着的这条线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            segments: [{
              id: 'segment-live2d-body-voice-only-audible-carry-runtime',
              index: 0,
              text: '我先沿着身体和声音还连着的这条线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 300,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
                preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'embodiment:audible_same_her_line',
                reasonTags: ['embodiment:body+voice-only'],
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 300,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'settle-smile',
            speakingCues: [{
              segmentId: 'segment-live2d-body-voice-only-audible-carry-runtime',
              emotion: 'thinking',
              facialCue: 'settle-smile',
              intensity: 0.4,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'settle-smile',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-live2d-body-voice-only-audible-carry-runtime',
              actionCue: 'steady_focus',
              intensity: 0.22,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.86,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [{
              segmentId: 'segment-live2d-body-voice-only-audible-carry-runtime',
              viseme: 'A',
              weight: 0.5,
              source: 'prosody-authority',
              confidence: 0.9,
            }],
          },
        },
      },
    })

    const embodiedPlayback = (preview?.metadata as { embodimentPlayback?: EmbodimentPlaybackTelemetry } | null | undefined)?.embodimentPlayback ?? null
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: preview ? {
        ...preview,
        metadata: preview.metadata ? { ...preview.metadata } : preview.metadata,
        cue: preview.cue ? { ...preview.cue } : null,
        digitalLifeFrame: preview.digitalLifeFrame ? {
          ...preview.digitalLifeFrame,
          face: { ...preview.digitalLifeFrame.face },
          action: { ...preview.digitalLifeFrame.action },
          lipSync: { ...preview.digitalLifeFrame.lipSync },
          voice: { ...preview.digitalLifeFrame.voice },
          motor: {
            ...preview.digitalLifeFrame.motor,
            gaze: { ...preview.digitalLifeFrame.motor.gaze },
            head: { ...preview.digitalLifeFrame.motor.head },
            breath: { ...preview.digitalLifeFrame.motor.breath },
            facial: { ...preview.digitalLifeFrame.motor.facial },
            body: { ...preview.digitalLifeFrame.motor.body },
          },
        } : null,
      } : null,
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
      articulation: {
        voice: createSpeechVoiceFixture({
          language: 'zh-CN',
          closureBias: 0.62,
          consonantPrecision: 0.84,
        }),
      },
    }))
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(
      embodiedPlayback
        ? {
            ...embodiedPlayback,
            driverAuthority: embodiedPlayback.driverAuthority
              ? { ...embodiedPlayback.driverAuthority }
              : null,
            prosodyAuthority: embodiedPlayback.prosodyAuthority
              ? { ...embodiedPlayback.prosodyAuthority }
              : null,
            cue: embodiedPlayback.cue
              ? {
                  ...embodiedPlayback.cue,
                  rendererHints: embodiedPlayback.cue.rendererHints
                    ? {
                        ...embodiedPlayback.cue.rendererHints,
                        preferredExpressionAliases: embodiedPlayback.cue.rendererHints.preferredExpressionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredExpressionAliases]
                          : undefined,
                        preferredMotionAliases: embodiedPlayback.cue.rendererHints.preferredMotionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredMotionAliases]
                          : undefined,
                        reasonTags: embodiedPlayback.cue.rendererHints.reasonTags
                          ? [...embodiedPlayback.cue.rendererHints.reasonTags]
                          : undefined,
                      }
                    : null,
                  rendererSettle: embodiedPlayback.cue.rendererSettle
                    ? { ...embodiedPlayback.cue.rendererSettle }
                    : null,
                }
              : null,
            drivers: {
              body: embodiedPlayback.drivers.body
                ? { ...embodiedPlayback.drivers.body }
                : null,
              face: embodiedPlayback.drivers.face
                ? { ...embodiedPlayback.drivers.face }
                : null,
              motion: embodiedPlayback.drivers.motion
                ? { ...embodiedPlayback.drivers.motion }
                : null,
              lipsync: embodiedPlayback.drivers.lipsync
                ? {
                    ...embodiedPlayback.drivers.lipsync,
                    visemeHints: embodiedPlayback.drivers.lipsync.visemeHints
                      ? embodiedPlayback.drivers.lipsync.visemeHints.map(hint => ({ ...hint }))
                      : [],
                  }
                : null,
            },
          }
        : null,
    )

    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(preview?.cue?.actionCue).toBe('steady_focus')
    expect(preview?.cue?.rendererHints).toEqual(expect.objectContaining({
      signature: 'embodiment:audible_same_her_line',
      reasonTags: ['embodiment:body+voice-only'],
    }))
    expect(playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-live2d-body-voice-only-audible-carry-runtime',
      rendererTarget: 'live2d',
      bodySegmentMatched: true,
      motionSegmentMatched: false,
    }))
    expect(runtime.state.value.activeActionCue).toBeNull()
    expect(runtime.state.value.activeActionCueSource).toBe('none')
    expect(runtime.state.value.actionPulse.reason).toBeNull()
    expect(runtime.state.value.actionPulse.cue).toBeNull()

    scope.stop()
    speech.dispose()
  })

  it('does not relight a live2d same-her body-lipsync-voice rejoin carry into a fresh action pulse before motion has actually rejoined the living line', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-live2d-body-lipsync-voice-rejoin-runtime',
      streamId: 'stream-live2d-body-lipsync-voice-rejoin-runtime',
      segmentId: 'segment-live2d-body-lipsync-voice-rejoin-runtime',
      text: '我先沿着嘴型和声音还连着的这条线轻一点接回来。',
      special: null,
      continuityHoldMs: 240,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-live2d-body-lipsync-voice-rejoin-runtime',
          rendererTarget: 'live2d',
          replyText: '我先沿着嘴型和声音还连着的这条线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            segments: [{
              id: 'segment-live2d-body-lipsync-voice-rejoin-runtime',
              index: 0,
              text: '我先沿着嘴型和声音还连着的这条线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 300,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
                preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'embodiment:audible-same-her-line',
                reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 300,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'settle-smile',
            speakingCues: [{
              segmentId: 'segment-live2d-body-lipsync-voice-rejoin-runtime',
              emotion: 'thinking',
              facialCue: 'settle-smile',
              intensity: 0.4,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'settle-smile',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-live2d-body-lipsync-voice-rejoin-runtime',
              actionCue: 'steady_focus',
              intensity: 0.22,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.86,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [{
              segmentId: 'segment-live2d-body-lipsync-voice-rejoin-runtime',
              viseme: 'A',
              weight: 0.5,
              source: 'prosody-authority',
              confidence: 0.9,
            }],
          },
        },
      },
    })

    const embodiedPlayback = (preview?.metadata as { embodimentPlayback?: EmbodimentPlaybackTelemetry } | null | undefined)?.embodimentPlayback ?? null
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: preview ? {
        ...preview,
        metadata: preview.metadata ? { ...preview.metadata } : preview.metadata,
        cue: preview.cue ? { ...preview.cue } : null,
        digitalLifeFrame: preview.digitalLifeFrame ? {
          ...preview.digitalLifeFrame,
          face: { ...preview.digitalLifeFrame.face },
          action: { ...preview.digitalLifeFrame.action },
          lipSync: { ...preview.digitalLifeFrame.lipSync },
          voice: { ...preview.digitalLifeFrame.voice },
          motor: {
            ...preview.digitalLifeFrame.motor,
            gaze: { ...preview.digitalLifeFrame.motor.gaze },
            head: { ...preview.digitalLifeFrame.motor.head },
            breath: { ...preview.digitalLifeFrame.motor.breath },
            facial: { ...preview.digitalLifeFrame.motor.facial },
            body: { ...preview.digitalLifeFrame.motor.body },
          },
        } : null,
      } : null,
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
      articulation: {
        voice: createSpeechVoiceFixture({
          language: 'zh-CN',
          closureBias: 0.62,
          consonantPrecision: 0.84,
        }),
      },
    }))
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(
      embodiedPlayback
        ? {
            ...embodiedPlayback,
            driverAuthority: embodiedPlayback.driverAuthority
              ? { ...embodiedPlayback.driverAuthority }
              : null,
            prosodyAuthority: embodiedPlayback.prosodyAuthority
              ? { ...embodiedPlayback.prosodyAuthority }
              : null,
            cue: embodiedPlayback.cue
              ? {
                  ...embodiedPlayback.cue,
                  rendererHints: embodiedPlayback.cue.rendererHints
                    ? {
                        ...embodiedPlayback.cue.rendererHints,
                        preferredExpressionAliases: embodiedPlayback.cue.rendererHints.preferredExpressionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredExpressionAliases]
                          : undefined,
                        preferredMotionAliases: embodiedPlayback.cue.rendererHints.preferredMotionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredMotionAliases]
                          : undefined,
                        reasonTags: embodiedPlayback.cue.rendererHints.reasonTags
                          ? [...embodiedPlayback.cue.rendererHints.reasonTags]
                          : undefined,
                      }
                    : null,
                  rendererSettle: embodiedPlayback.cue.rendererSettle
                    ? { ...embodiedPlayback.cue.rendererSettle }
                    : null,
                }
              : null,
            drivers: {
              body: embodiedPlayback.drivers.body
                ? { ...embodiedPlayback.drivers.body }
                : null,
              face: embodiedPlayback.drivers.face
                ? { ...embodiedPlayback.drivers.face }
                : null,
              motion: embodiedPlayback.drivers.motion
                ? { ...embodiedPlayback.drivers.motion }
                : null,
              lipsync: embodiedPlayback.drivers.lipsync
                ? {
                    ...embodiedPlayback.drivers.lipsync,
                    visemeHints: embodiedPlayback.drivers.lipsync.visemeHints
                      ? embodiedPlayback.drivers.lipsync.visemeHints.map(hint => ({ ...hint }))
                      : [],
                  }
                : null,
            },
          }
        : null,
    )

    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(preview?.cue?.actionCue).toBe('steady_focus')
    expect(preview?.cue?.rendererHints).toEqual(expect.objectContaining({
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    }))
    expect(playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-live2d-body-lipsync-voice-rejoin-runtime',
      rendererTarget: 'live2d',
      bodySegmentMatched: true,
      motionSegmentMatched: false,
    }))
    expect(runtime.state.value.activeActionCue).toBeNull()
    expect(runtime.state.value.activeActionCueSource).toBe('none')
    expect(runtime.state.value.actionPulse.reason).toBeNull()
    expect(runtime.state.value.actionPulse.cue).toBeNull()

    scope.stop()
    speech.dispose()
  })

  it('does not relight a live2d signature-only still-voiced motion-line carry into a fresh action pulse before motion has actually rejoined the living line', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-live2d-signature-only-still-voiced-motion-line-runtime',
      streamId: 'stream-live2d-signature-only-still-voiced-motion-line-runtime',
      segmentId: 'segment-live2d-signature-only-still-voiced-motion-line-runtime',
      text: '我先沿着这条动作和声音还活着的线轻一点接回来。',
      special: null,
      continuityHoldMs: 240,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-live2d-signature-only-still-voiced-motion-line-runtime',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条动作和声音还活着的线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            segments: [{
              id: 'segment-live2d-signature-only-still-voiced-motion-line-runtime',
              index: 0,
              text: '我先沿着这条动作和声音还活着的线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 300,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
                preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
                reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 300,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'settle-smile',
            speakingCues: [{
              segmentId: 'segment-live2d-signature-only-still-voiced-motion-line-runtime',
              emotion: 'thinking',
              facialCue: 'settle-smile',
              intensity: 0.4,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'settle-smile',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-live2d-signature-only-still-voiced-motion-line-runtime',
              actionCue: 'steady_focus',
              intensity: 0.22,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.86,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [{
              segmentId: 'segment-live2d-signature-only-still-voiced-motion-line-runtime',
              viseme: 'A',
              weight: 0.5,
              source: 'prosody-authority',
              confidence: 0.9,
            }],
          },
        },
      },
    })

    const embodiedPlayback = (preview?.metadata as { embodimentPlayback?: EmbodimentPlaybackTelemetry } | null | undefined)?.embodimentPlayback ?? null
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: preview ? {
        ...preview,
        metadata: preview.metadata ? { ...preview.metadata } : preview.metadata,
        cue: preview.cue ? { ...preview.cue } : null,
        digitalLifeFrame: preview.digitalLifeFrame ? {
          ...preview.digitalLifeFrame,
          face: { ...preview.digitalLifeFrame.face },
          action: { ...preview.digitalLifeFrame.action },
          lipSync: { ...preview.digitalLifeFrame.lipSync },
          voice: { ...preview.digitalLifeFrame.voice },
          motor: {
            ...preview.digitalLifeFrame.motor,
            gaze: { ...preview.digitalLifeFrame.motor.gaze },
            head: { ...preview.digitalLifeFrame.motor.head },
            breath: { ...preview.digitalLifeFrame.motor.breath },
            facial: { ...preview.digitalLifeFrame.motor.facial },
            body: { ...preview.digitalLifeFrame.motor.body },
          },
        } : null,
      } : null,
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
      articulation: {
        voice: createSpeechVoiceFixture({
          language: 'zh-CN',
          closureBias: 0.62,
          consonantPrecision: 0.84,
        }),
      },
    }))
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(
      embodiedPlayback
        ? {
            ...embodiedPlayback,
            driverAuthority: embodiedPlayback.driverAuthority
              ? { ...embodiedPlayback.driverAuthority }
              : null,
            prosodyAuthority: embodiedPlayback.prosodyAuthority
              ? { ...embodiedPlayback.prosodyAuthority }
              : null,
            cue: embodiedPlayback.cue
              ? {
                  ...embodiedPlayback.cue,
                  rendererHints: embodiedPlayback.cue.rendererHints
                    ? {
                        ...embodiedPlayback.cue.rendererHints,
                        preferredExpressionAliases: embodiedPlayback.cue.rendererHints.preferredExpressionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredExpressionAliases]
                          : undefined,
                        preferredMotionAliases: embodiedPlayback.cue.rendererHints.preferredMotionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredMotionAliases]
                          : undefined,
                        reasonTags: embodiedPlayback.cue.rendererHints.reasonTags
                          ? [...embodiedPlayback.cue.rendererHints.reasonTags]
                          : undefined,
                      }
                    : null,
                  rendererSettle: embodiedPlayback.cue.rendererSettle
                    ? { ...embodiedPlayback.cue.rendererSettle }
                    : null,
                }
              : null,
            drivers: {
              body: embodiedPlayback.drivers.body
                ? { ...embodiedPlayback.drivers.body }
                : null,
              face: embodiedPlayback.drivers.face
                ? { ...embodiedPlayback.drivers.face }
                : null,
              motion: embodiedPlayback.drivers.motion
                ? { ...embodiedPlayback.drivers.motion }
                : null,
              lipsync: embodiedPlayback.drivers.lipsync
                ? {
                    ...embodiedPlayback.drivers.lipsync,
                    visemeHints: embodiedPlayback.drivers.lipsync.visemeHints
                      ? embodiedPlayback.drivers.lipsync.visemeHints.map(hint => ({ ...hint }))
                      : [],
                  }
                : null,
            },
          }
        : null,
    )

    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(preview?.cue?.actionCue).toBe('steady_focus')
    expect(preview?.cue?.rendererHints).toEqual(expect.objectContaining({
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    }))
    expect(playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-live2d-signature-only-still-voiced-motion-line-runtime',
      rendererTarget: 'live2d',
      bodySegmentMatched: true,
      motionSegmentMatched: false,
    }))
    expect(runtime.state.value.activeActionCue).toBeNull()
    expect(runtime.state.value.activeActionCueSource).toBe('none')
    expect(runtime.state.value.actionPulse.reason).toBeNull()
    expect(runtime.state.value.actionPulse.cue).toBeNull()

    scope.stop()
    speech.dispose()
  })

  it('does not relight a live2d quieter body+lipsync carry into a fresh action pulse before motion has actually rejoined the same living line', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-live2d-body-lipsync-only-runtime-carry',
      streamId: 'stream-live2d-body-lipsync-only-runtime-carry',
      segmentId: 'segment-live2d-body-lipsync-only-runtime-carry',
      text: '我先沿着身体和口型还连着的这条线轻一点接回来。',
      special: null,
      continuityHoldMs: 240,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-live2d-body-lipsync-only-runtime-carry',
          rendererTarget: 'live2d',
          replyText: '我先沿着身体和口型还连着的这条线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            segments: [{
              id: 'segment-live2d-body-lipsync-only-runtime-carry',
              index: 0,
              text: '我先沿着身体和口型还连着的这条线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 300,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
                preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'embodiment:body+lipsync-only',
                reasonTags: ['embodiment:body+lipsync-only'],
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 300,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'settle-smile',
            speakingCues: [{
              segmentId: 'segment-live2d-body-lipsync-only-runtime-carry',
              emotion: 'thinking',
              facialCue: 'settle-smile',
              intensity: 0.4,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'settle-smile',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-live2d-body-lipsync-only-runtime-carry',
              actionCue: 'steady_focus',
              intensity: 0.22,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.86,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [{
              segmentId: 'segment-live2d-body-lipsync-only-runtime-carry',
              viseme: 'A',
              weight: 0.5,
              source: 'prosody-authority',
              confidence: 0.9,
            }],
          },
        },
      },
    })

    const embodiedPlayback = (preview?.metadata as { embodimentPlayback?: EmbodimentPlaybackTelemetry } | null | undefined)?.embodimentPlayback ?? null
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: preview ? {
        ...preview,
        metadata: preview.metadata ? { ...preview.metadata } : preview.metadata,
        cue: preview.cue ? { ...preview.cue } : null,
        digitalLifeFrame: preview.digitalLifeFrame ? {
          ...preview.digitalLifeFrame,
          face: { ...preview.digitalLifeFrame.face },
          action: { ...preview.digitalLifeFrame.action },
          lipSync: { ...preview.digitalLifeFrame.lipSync },
          voice: { ...preview.digitalLifeFrame.voice },
          motor: {
            ...preview.digitalLifeFrame.motor,
            gaze: { ...preview.digitalLifeFrame.motor.gaze },
            head: { ...preview.digitalLifeFrame.motor.head },
            breath: { ...preview.digitalLifeFrame.motor.breath },
            facial: { ...preview.digitalLifeFrame.motor.facial },
            body: { ...preview.digitalLifeFrame.motor.body },
          },
        } : null,
      } : null,
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
      articulation: {
        voice: createSpeechVoiceFixture({
          language: 'zh-CN',
          closureBias: 0.62,
          consonantPrecision: 0.84,
        }),
      },
    }))
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(
      embodiedPlayback
        ? {
            ...embodiedPlayback,
            driverAuthority: embodiedPlayback.driverAuthority
              ? { ...embodiedPlayback.driverAuthority }
              : null,
            prosodyAuthority: embodiedPlayback.prosodyAuthority
              ? { ...embodiedPlayback.prosodyAuthority }
              : null,
            cue: embodiedPlayback.cue
              ? {
                  ...embodiedPlayback.cue,
                  rendererHints: embodiedPlayback.cue.rendererHints
                    ? {
                        ...embodiedPlayback.cue.rendererHints,
                        preferredExpressionAliases: embodiedPlayback.cue.rendererHints.preferredExpressionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredExpressionAliases]
                          : undefined,
                        preferredMotionAliases: embodiedPlayback.cue.rendererHints.preferredMotionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredMotionAliases]
                          : undefined,
                        reasonTags: embodiedPlayback.cue.rendererHints.reasonTags
                          ? [...embodiedPlayback.cue.rendererHints.reasonTags]
                          : undefined,
                      }
                    : null,
                  rendererSettle: embodiedPlayback.cue.rendererSettle
                    ? { ...embodiedPlayback.cue.rendererSettle }
                    : null,
                }
              : null,
            drivers: {
              body: embodiedPlayback.drivers.body
                ? { ...embodiedPlayback.drivers.body }
                : null,
              face: embodiedPlayback.drivers.face
                ? { ...embodiedPlayback.drivers.face }
                : null,
              motion: embodiedPlayback.drivers.motion
                ? { ...embodiedPlayback.drivers.motion }
                : null,
              lipsync: embodiedPlayback.drivers.lipsync
                ? {
                    ...embodiedPlayback.drivers.lipsync,
                    visemeHints: embodiedPlayback.drivers.lipsync.visemeHints
                      ? embodiedPlayback.drivers.lipsync.visemeHints.map(hint => ({ ...hint }))
                      : [],
                  }
                : null,
            },
          }
        : null,
    )

    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(preview?.cue?.actionCue).toBe('steady_focus')
    expect(preview?.cue?.rendererHints).toEqual(expect.objectContaining({
      signature: 'embodiment:body+lipsync-only',
      reasonTags: ['embodiment:body+lipsync-only'],
    }))
    expect(preview?.cue?.rendererSettle).toEqual(expect.objectContaining({
      live2dFacialReleaseMs: expect.any(Number),
      live2dMotionFollowThroughMs: expect.any(Number),
      vrmActionFadeMs: expect.any(Number),
      vrmExpressionBlendMs: expect.any(Number),
    }))
    expect(playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-live2d-body-lipsync-only-runtime-carry',
      rendererTarget: 'live2d',
      bodySegmentMatched: true,
      motionSegmentMatched: false,
    }))
    expect(runtime.state.value.activeActionCue).toBeNull()
    expect(runtime.state.value.activeActionCueSource).toBe('none')
    expect(runtime.state.value.actionPulse.reason).toBeNull()
    expect(runtime.state.value.actionPulse.cue).toBeNull()
    expect(runtime.state.value.activeCue?.rendererSettle).toEqual(preview?.cue?.rendererSettle ?? null)

    scope.stop()
    speech.dispose()
  })

  it('does not fire a preview action pulse when a live2d same-her body-plus-voice carry is only reopening the same restrained line', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-live2d-body-voice-only-preview-reopen',
      streamId: 'stream-live2d-body-voice-only-preview-reopen',
      segmentId: 'segment-live2d-body-voice-only-preview-reopen',
      text: '我还是沿着身体和声音还连着的这条线慢一点接回来。',
      special: null,
      continuityHoldMs: 240,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-live2d-body-voice-only-preview-reopen',
          rendererTarget: 'live2d',
          replyText: '我还是沿着身体和声音还连着的这条线慢一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            segments: [{
              id: 'segment-live2d-body-voice-only-preview-reopen',
              index: 0,
              text: '我还是沿着身体和声音还连着的这条线慢一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 300,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
                preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'embodiment:audible_same_her_line',
                reasonTags: ['embodiment:body+voice-only'],
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 300,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'settle-smile',
            speakingCues: [{
              segmentId: 'segment-live2d-body-voice-only-preview-reopen',
              emotion: 'thinking',
              facialCue: 'settle-smile',
              intensity: 0.4,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'settle-smile',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-live2d-body-voice-only-preview-reopen',
              actionCue: 'steady_focus',
              intensity: 0.22,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.86,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [{
              segmentId: 'segment-live2d-body-voice-only-preview-reopen',
              viseme: 'A',
              weight: 0.5,
              source: 'prosody-authority',
              confidence: 0.9,
            }],
          },
        },
      },
    })

    const embodiedPlayback = (preview?.metadata as { embodimentPlayback?: EmbodimentPlaybackTelemetry } | null | undefined)?.embodimentPlayback ?? null
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const upcomingSpeechSegment = ref(
      preview
        ? {
            ...preview,
            metadata: preview.metadata ? { ...preview.metadata } : preview.metadata,
            cue: preview.cue ? { ...preview.cue } : null,
            digitalLifeFrame: preview.digitalLifeFrame ? {
              ...preview.digitalLifeFrame,
              face: { ...preview.digitalLifeFrame.face },
              action: { ...preview.digitalLifeFrame.action },
              lipSync: { ...preview.digitalLifeFrame.lipSync },
              voice: { ...preview.digitalLifeFrame.voice },
              motor: {
                ...preview.digitalLifeFrame.motor,
                gaze: { ...preview.digitalLifeFrame.motor.gaze },
                head: { ...preview.digitalLifeFrame.motor.head },
                breath: { ...preview.digitalLifeFrame.motor.breath },
                facial: { ...preview.digitalLifeFrame.motor.facial },
                body: { ...preview.digitalLifeFrame.motor.body },
              },
            } : null,
          }
        : null,
    )
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(
      embodiedPlayback
        ? {
            ...embodiedPlayback,
            driverAuthority: embodiedPlayback.driverAuthority
              ? { ...embodiedPlayback.driverAuthority }
              : null,
            prosodyAuthority: embodiedPlayback.prosodyAuthority
              ? { ...embodiedPlayback.prosodyAuthority }
              : null,
            cue: embodiedPlayback.cue
              ? {
                  ...embodiedPlayback.cue,
                  rendererHints: embodiedPlayback.cue.rendererHints
                    ? {
                        ...embodiedPlayback.cue.rendererHints,
                        preferredExpressionAliases: embodiedPlayback.cue.rendererHints.preferredExpressionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredExpressionAliases]
                          : undefined,
                        preferredMotionAliases: embodiedPlayback.cue.rendererHints.preferredMotionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredMotionAliases]
                          : undefined,
                        reasonTags: embodiedPlayback.cue.rendererHints.reasonTags
                          ? [...embodiedPlayback.cue.rendererHints.reasonTags]
                          : undefined,
                      }
                    : null,
                  rendererSettle: embodiedPlayback.cue.rendererSettle
                    ? { ...embodiedPlayback.cue.rendererSettle }
                    : null,
                }
              : null,
            drivers: {
              body: embodiedPlayback.drivers.body
                ? { ...embodiedPlayback.drivers.body }
                : null,
              face: embodiedPlayback.drivers.face
                ? { ...embodiedPlayback.drivers.face }
                : null,
              motion: embodiedPlayback.drivers.motion
                ? { ...embodiedPlayback.drivers.motion }
                : null,
              lipsync: embodiedPlayback.drivers.lipsync
                ? {
                    ...embodiedPlayback.drivers.lipsync,
                    visemeHints: embodiedPlayback.drivers.lipsync.visemeHints
                      ? embodiedPlayback.drivers.lipsync.visemeHints.map(hint => ({ ...hint }))
                      : [],
                  }
                : null,
            },
          }
        : null,
    )

    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      upcomingSpeechSegment,
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: null,
      delivery: 'gentle',
      emphasis: 0,
    }), {
      source: 'dialogue',
      variationToken: 'turn-live2d-body-voice-only-preview-reopen',
    })
    await nextTick()

    expect(preview?.cue?.actionCue).toBe('steady_focus')
    expect(preview?.cue?.rendererSettle).toEqual(expect.objectContaining({
      live2dFacialReleaseMs: expect.any(Number),
      live2dMotionFollowThroughMs: expect.any(Number),
      vrmActionFadeMs: expect.any(Number),
      vrmExpressionBlendMs: expect.any(Number),
    }))
    expect(playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-live2d-body-voice-only-preview-reopen',
      rendererTarget: 'live2d',
      bodySegmentMatched: true,
      motionSegmentMatched: false,
    }))
    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-live2d-body-voice-only-preview-reopen',
      facialCue: expect.any(String),
      actionCue: null,
    }))
    expect(runtime.state.value.activeActionCue).toBeNull()
    expect(runtime.state.value.activeActionCueSource).toBe('none')
    expect(runtime.state.value.actionPulse.reason).toBeNull()
    expect(runtime.state.value.actionPulse.cue).toBeNull()
    expect(runtime.state.value.activeCue?.rendererSettle).toEqual(preview?.cue?.rendererSettle ?? null)

    scope.stop()
    speech.dispose()
  })

  it('does not fire a preview action pulse when a live2d same-her body-lipsync-voice rejoin carry is only reopening the same restrained line', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-live2d-body-lipsync-voice-rejoin-preview-reopen',
      streamId: 'stream-live2d-body-lipsync-voice-rejoin-preview-reopen',
      segmentId: 'segment-live2d-body-lipsync-voice-rejoin-preview-reopen',
      text: '我还是沿着嘴型和声音还连着的这条线慢一点接回来。',
      special: null,
      continuityHoldMs: 240,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-live2d-body-lipsync-voice-rejoin-preview-reopen',
          rendererTarget: 'live2d',
          replyText: '我还是沿着嘴型和声音还连着的这条线慢一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            segments: [{
              id: 'segment-live2d-body-lipsync-voice-rejoin-preview-reopen',
              index: 0,
              text: '我还是沿着嘴型和声音还连着的这条线慢一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 300,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
                preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'embodiment:audible-same-her-line',
                reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 300,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'settle-smile',
            speakingCues: [{
              segmentId: 'segment-live2d-body-lipsync-voice-rejoin-preview-reopen',
              emotion: 'thinking',
              facialCue: 'settle-smile',
              intensity: 0.4,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'settle-smile',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-live2d-body-lipsync-voice-rejoin-preview-reopen',
              actionCue: 'steady_focus',
              intensity: 0.22,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.86,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [{
              segmentId: 'segment-live2d-body-lipsync-voice-rejoin-preview-reopen',
              viseme: 'A',
              weight: 0.5,
              source: 'prosody-authority',
              confidence: 0.9,
            }],
          },
        },
      },
    })

    const embodiedPlayback = (preview?.metadata as { embodimentPlayback?: EmbodimentPlaybackTelemetry } | null | undefined)?.embodimentPlayback ?? null
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const upcomingSpeechSegment = ref(
      preview
        ? {
            ...preview,
            metadata: preview.metadata ? { ...preview.metadata } : preview.metadata,
            cue: preview.cue ? { ...preview.cue } : null,
            digitalLifeFrame: preview.digitalLifeFrame ? {
              ...preview.digitalLifeFrame,
              face: { ...preview.digitalLifeFrame.face },
              action: { ...preview.digitalLifeFrame.action },
              lipSync: { ...preview.digitalLifeFrame.lipSync },
              voice: { ...preview.digitalLifeFrame.voice },
              motor: {
                ...preview.digitalLifeFrame.motor,
                gaze: { ...preview.digitalLifeFrame.motor.gaze },
                head: { ...preview.digitalLifeFrame.motor.head },
                breath: { ...preview.digitalLifeFrame.motor.breath },
                facial: { ...preview.digitalLifeFrame.motor.facial },
                body: { ...preview.digitalLifeFrame.motor.body },
              },
            } : null,
          }
        : null,
    )
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(
      embodiedPlayback
        ? {
            ...embodiedPlayback,
            driverAuthority: embodiedPlayback.driverAuthority
              ? { ...embodiedPlayback.driverAuthority }
              : null,
            prosodyAuthority: embodiedPlayback.prosodyAuthority
              ? { ...embodiedPlayback.prosodyAuthority }
              : null,
            cue: embodiedPlayback.cue
              ? {
                  ...embodiedPlayback.cue,
                  rendererHints: embodiedPlayback.cue.rendererHints
                    ? {
                        ...embodiedPlayback.cue.rendererHints,
                        preferredExpressionAliases: embodiedPlayback.cue.rendererHints.preferredExpressionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredExpressionAliases]
                          : undefined,
                        preferredMotionAliases: embodiedPlayback.cue.rendererHints.preferredMotionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredMotionAliases]
                          : undefined,
                        reasonTags: embodiedPlayback.cue.rendererHints.reasonTags
                          ? [...embodiedPlayback.cue.rendererHints.reasonTags]
                          : undefined,
                      }
                    : null,
                  rendererSettle: embodiedPlayback.cue.rendererSettle
                    ? { ...embodiedPlayback.cue.rendererSettle }
                    : null,
                }
              : null,
            drivers: {
              body: embodiedPlayback.drivers.body
                ? { ...embodiedPlayback.drivers.body }
                : null,
              face: embodiedPlayback.drivers.face
                ? { ...embodiedPlayback.drivers.face }
                : null,
              motion: embodiedPlayback.drivers.motion
                ? { ...embodiedPlayback.drivers.motion }
                : null,
              lipsync: embodiedPlayback.drivers.lipsync
                ? {
                    ...embodiedPlayback.drivers.lipsync,
                    visemeHints: embodiedPlayback.drivers.lipsync.visemeHints
                      ? embodiedPlayback.drivers.lipsync.visemeHints.map(hint => ({ ...hint }))
                      : [],
                  }
                : null,
            },
          }
        : null,
    )

    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      upcomingSpeechSegment,
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: null,
      delivery: 'gentle',
      emphasis: 0,
    }), {
      source: 'dialogue',
      variationToken: 'turn-live2d-body-lipsync-voice-rejoin-preview-reopen',
    })
    await nextTick()

    expect(preview?.cue?.actionCue).toBe('steady_focus')
    expect(playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-live2d-body-lipsync-voice-rejoin-preview-reopen',
      rendererTarget: 'live2d',
      bodySegmentMatched: true,
      motionSegmentMatched: false,
    }))
    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-live2d-body-lipsync-voice-rejoin-preview-reopen',
      facialCue: expect.any(String),
      actionCue: null,
    }))
    expect(runtime.state.value.activeActionCue).toBeNull()
    expect(runtime.state.value.activeActionCueSource).toBe('none')
    expect(runtime.state.value.actionPulse.reason).toBeNull()
    expect(runtime.state.value.actionPulse.cue).toBeNull()

    scope.stop()
    speech.dispose()
  })

  it('does not fire a preview action pulse when a live2d signature-only still-voiced motion-line carry is only reopening the same restrained line', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-live2d-signature-only-still-voiced-motion-line-preview-reopen',
      streamId: 'stream-live2d-signature-only-still-voiced-motion-line-preview-reopen',
      segmentId: 'segment-live2d-signature-only-still-voiced-motion-line-preview-reopen',
      text: '我还是沿着这条动作和声音还活着的线慢一点接回来。',
      special: null,
      continuityHoldMs: 240,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-live2d-signature-only-still-voiced-motion-line-preview-reopen',
          rendererTarget: 'live2d',
          replyText: '我还是沿着这条动作和声音还活着的线慢一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            segments: [{
              id: 'segment-live2d-signature-only-still-voiced-motion-line-preview-reopen',
              index: 0,
              text: '我还是沿着这条动作和声音还活着的线慢一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 300,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
                preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
                reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 300,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'settle-smile',
            speakingCues: [{
              segmentId: 'segment-live2d-signature-only-still-voiced-motion-line-preview-reopen',
              emotion: 'thinking',
              facialCue: 'settle-smile',
              intensity: 0.4,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'settle-smile',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-live2d-signature-only-still-voiced-motion-line-preview-reopen',
              actionCue: 'steady_focus',
              intensity: 0.22,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.86,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [{
              segmentId: 'segment-live2d-signature-only-still-voiced-motion-line-preview-reopen',
              viseme: 'A',
              weight: 0.5,
              source: 'prosody-authority',
              confidence: 0.9,
            }],
          },
        },
      },
    })

    const embodiedPlayback = (preview?.metadata as { embodimentPlayback?: EmbodimentPlaybackTelemetry } | null | undefined)?.embodimentPlayback ?? null
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const upcomingSpeechSegment = ref(
      preview
        ? {
            ...preview,
            metadata: preview.metadata ? { ...preview.metadata } : preview.metadata,
            cue: preview.cue ? { ...preview.cue } : null,
            digitalLifeFrame: preview.digitalLifeFrame ? {
              ...preview.digitalLifeFrame,
              face: { ...preview.digitalLifeFrame.face },
              action: { ...preview.digitalLifeFrame.action },
              lipSync: { ...preview.digitalLifeFrame.lipSync },
              voice: { ...preview.digitalLifeFrame.voice },
              motor: {
                ...preview.digitalLifeFrame.motor,
                gaze: { ...preview.digitalLifeFrame.motor.gaze },
                head: { ...preview.digitalLifeFrame.motor.head },
                breath: { ...preview.digitalLifeFrame.motor.breath },
                facial: { ...preview.digitalLifeFrame.motor.facial },
                body: { ...preview.digitalLifeFrame.motor.body },
              },
            } : null,
          }
        : null,
    )
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(
      embodiedPlayback
        ? {
            ...embodiedPlayback,
            driverAuthority: embodiedPlayback.driverAuthority
              ? { ...embodiedPlayback.driverAuthority }
              : null,
            prosodyAuthority: embodiedPlayback.prosodyAuthority
              ? { ...embodiedPlayback.prosodyAuthority }
              : null,
            cue: embodiedPlayback.cue
              ? {
                  ...embodiedPlayback.cue,
                  rendererHints: embodiedPlayback.cue.rendererHints
                    ? {
                        ...embodiedPlayback.cue.rendererHints,
                        preferredExpressionAliases: embodiedPlayback.cue.rendererHints.preferredExpressionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredExpressionAliases]
                          : undefined,
                        preferredMotionAliases: embodiedPlayback.cue.rendererHints.preferredMotionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredMotionAliases]
                          : undefined,
                        reasonTags: embodiedPlayback.cue.rendererHints.reasonTags
                          ? [...embodiedPlayback.cue.rendererHints.reasonTags]
                          : undefined,
                      }
                    : null,
                  rendererSettle: embodiedPlayback.cue.rendererSettle
                    ? { ...embodiedPlayback.cue.rendererSettle }
                    : null,
                }
              : null,
            drivers: {
              body: embodiedPlayback.drivers.body
                ? { ...embodiedPlayback.drivers.body }
                : null,
              face: embodiedPlayback.drivers.face
                ? { ...embodiedPlayback.drivers.face }
                : null,
              motion: embodiedPlayback.drivers.motion
                ? { ...embodiedPlayback.drivers.motion }
                : null,
              lipsync: embodiedPlayback.drivers.lipsync
                ? {
                    ...embodiedPlayback.drivers.lipsync,
                    visemeHints: embodiedPlayback.drivers.lipsync.visemeHints
                      ? embodiedPlayback.drivers.lipsync.visemeHints.map(hint => ({ ...hint }))
                      : [],
                  }
                : null,
            },
          }
        : null,
    )

    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      upcomingSpeechSegment,
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: null,
      delivery: 'gentle',
      emphasis: 0,
    }), {
      source: 'dialogue',
      variationToken: 'turn-live2d-signature-only-still-voiced-motion-line-preview-reopen',
    })
    await nextTick()

    expect(preview?.cue?.actionCue).toBe('steady_focus')
    expect(playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-live2d-signature-only-still-voiced-motion-line-preview-reopen',
      rendererTarget: 'live2d',
      bodySegmentMatched: true,
      motionSegmentMatched: false,
    }))
    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-live2d-signature-only-still-voiced-motion-line-preview-reopen',
      facialCue: expect.any(String),
      actionCue: null,
    }))
    expect(runtime.state.value.activeActionCue).toBeNull()
    expect(runtime.state.value.activeActionCueSource).toBe('none')
    expect(runtime.state.value.actionPulse.reason).toBeNull()
    expect(runtime.state.value.actionPulse.cue).toBeNull()

    scope.stop()
    speech.dispose()
  })

  it('does not fire a preview action pulse when a live2d quieter body+lipsync carry is only reopening the same restrained line', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-live2d-body-lipsync-only-preview-reopen',
      streamId: 'stream-live2d-body-lipsync-only-preview-reopen',
      segmentId: 'segment-live2d-body-lipsync-only-preview-reopen',
      text: '我还是沿着身体和口型还连着的这条线慢一点接回来。',
      special: null,
      continuityHoldMs: 240,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-live2d-body-lipsync-only-preview-reopen',
          rendererTarget: 'live2d',
          replyText: '我还是沿着身体和口型还连着的这条线慢一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            segments: [{
              id: 'segment-live2d-body-lipsync-only-preview-reopen',
              index: 0,
              text: '我还是沿着身体和口型还连着的这条线慢一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 300,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
                preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'embodiment:body+lipsync-only',
                reasonTags: ['embodiment:body+lipsync-only'],
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 300,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'settle-smile',
            speakingCues: [{
              segmentId: 'segment-live2d-body-lipsync-only-preview-reopen',
              emotion: 'thinking',
              facialCue: 'settle-smile',
              intensity: 0.4,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'settle-smile',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-live2d-body-lipsync-only-preview-reopen',
              actionCue: 'steady_focus',
              intensity: 0.22,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.86,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [{
              segmentId: 'segment-live2d-body-lipsync-only-preview-reopen',
              viseme: 'A',
              weight: 0.5,
              source: 'prosody-authority',
              confidence: 0.9,
            }],
          },
        },
      },
    })

    const embodiedPlayback = (preview?.metadata as { embodimentPlayback?: EmbodimentPlaybackTelemetry } | null | undefined)?.embodimentPlayback ?? null
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const upcomingSpeechSegment = ref(
      preview
        ? {
            ...preview,
            metadata: preview.metadata ? { ...preview.metadata } : preview.metadata,
            cue: preview.cue ? { ...preview.cue } : null,
            digitalLifeFrame: preview.digitalLifeFrame ? {
              ...preview.digitalLifeFrame,
              face: { ...preview.digitalLifeFrame.face },
              action: { ...preview.digitalLifeFrame.action },
              lipSync: { ...preview.digitalLifeFrame.lipSync },
              voice: { ...preview.digitalLifeFrame.voice },
              motor: {
                ...preview.digitalLifeFrame.motor,
                gaze: { ...preview.digitalLifeFrame.motor.gaze },
                head: { ...preview.digitalLifeFrame.motor.head },
                breath: { ...preview.digitalLifeFrame.motor.breath },
                facial: { ...preview.digitalLifeFrame.motor.facial },
                body: { ...preview.digitalLifeFrame.motor.body },
              },
            } : null,
          }
        : null,
    )
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(
      embodiedPlayback
        ? {
            ...embodiedPlayback,
            driverAuthority: embodiedPlayback.driverAuthority
              ? { ...embodiedPlayback.driverAuthority }
              : null,
            prosodyAuthority: embodiedPlayback.prosodyAuthority
              ? { ...embodiedPlayback.prosodyAuthority }
              : null,
            cue: embodiedPlayback.cue
              ? {
                  ...embodiedPlayback.cue,
                  rendererHints: embodiedPlayback.cue.rendererHints
                    ? {
                        ...embodiedPlayback.cue.rendererHints,
                        preferredExpressionAliases: embodiedPlayback.cue.rendererHints.preferredExpressionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredExpressionAliases]
                          : undefined,
                        preferredMotionAliases: embodiedPlayback.cue.rendererHints.preferredMotionAliases
                          ? [...embodiedPlayback.cue.rendererHints.preferredMotionAliases]
                          : undefined,
                        reasonTags: embodiedPlayback.cue.rendererHints.reasonTags
                          ? [...embodiedPlayback.cue.rendererHints.reasonTags]
                          : undefined,
                      }
                    : null,
                  rendererSettle: embodiedPlayback.cue.rendererSettle
                    ? { ...embodiedPlayback.cue.rendererSettle }
                    : null,
                }
              : null,
            drivers: {
              body: embodiedPlayback.drivers.body
                ? { ...embodiedPlayback.drivers.body }
                : null,
              face: embodiedPlayback.drivers.face
                ? { ...embodiedPlayback.drivers.face }
                : null,
              motion: embodiedPlayback.drivers.motion
                ? { ...embodiedPlayback.drivers.motion }
                : null,
              lipsync: embodiedPlayback.drivers.lipsync
                ? {
                    ...embodiedPlayback.drivers.lipsync,
                    visemeHints: embodiedPlayback.drivers.lipsync.visemeHints
                      ? embodiedPlayback.drivers.lipsync.visemeHints.map(hint => ({ ...hint }))
                      : [],
                  }
                : null,
            },
          }
        : null,
    )

    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      upcomingSpeechSegment,
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: null,
      delivery: 'gentle',
      emphasis: 0,
    }), {
      source: 'dialogue',
      variationToken: 'turn-live2d-body-lipsync-only-preview-reopen',
    })
    await nextTick()

    expect(preview?.cue?.actionCue).toBe('steady_focus')
    expect(playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-live2d-body-lipsync-only-preview-reopen',
      rendererTarget: 'live2d',
      bodySegmentMatched: true,
      motionSegmentMatched: false,
    }))
    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-live2d-body-lipsync-only-preview-reopen',
      facialCue: expect.any(String),
      actionCue: null,
    }))
    expect(runtime.state.value.activeActionCue).toBeNull()
    expect(runtime.state.value.activeActionCueSource).toBe('none')
    expect(runtime.state.value.actionPulse.reason).toBeNull()
    expect(runtime.state.value.actionPulse.cue).toBeNull()

    scope.stop()
    speech.dispose()
  })

  it('preserves prosody-authority in live2d re-expansion sources when same-segment face and motion drivers keep their original provenance', async () => {
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-live2d-prosody-provenance-realign',
        segmentId: 'segment-live2d-prosody-provenance-realign',
        special: null,
        streamId: 'stream-live2d-prosody-provenance-realign',
        text: '继续看这里。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
    }))
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>({
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'live2d',
      driverAuthority: null,
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.84,
          gazeStability: 0.76,
          breathAmplitude: 0.24,
          expressivity: 0.30,
          segmentId: 'segment-live2d-prosody-provenance-realign',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.52,
          holdMs: 320,
          source: 'prosody-authority',
          confidence: 0.9,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-live2d-prosody-provenance-realign',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: null,
          continuityHoldMs: 220,
          visemeHints: [
            { segmentId: 'segment-live2d-prosody-provenance-realign', viseme: 'A', weight: 0.46, source: 'prosody-authority', confidence: 0.93 },
            { segmentId: 'segment-live2d-prosody-provenance-realign', viseme: 'closed', weight: 0.71, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.41,
          holdMs: 260,
          source: 'timeline-projection',
          confidence: 0.87,
          segmentId: 'segment-live2d-prosody-provenance-realign',
        },
      },
      cue: {
        id: 'segment-live2d-prosody-provenance-realign',
        index: 0,
        startOffset: 0,
        endOffset: 6,
        text: '继续看这里。',
        emotion: 'thinking',
        gestureWeight: 0.34,
        facialWeight: 0.52,
        prosodyWeight: 0.36,
        beatWeight: 0.3,
        mouthWeight: 0.28,
        headWeight: 0.32,
        facialHoldMs: 320,
        actionHoldMs: 240,
        emotionHoldMs: 320,
        actionCue: 'observe_focus',
        facialCue: 'focused',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
      },
    })
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-live2d-prosody-provenance-realign',
      rendererTarget: 'live2d',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'timeline-projection'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })

    scope.stop()
  })
})
