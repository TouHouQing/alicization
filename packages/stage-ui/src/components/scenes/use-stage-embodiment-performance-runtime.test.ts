import type { AlicizationDigitalLifeSpineDigest } from '../../stores/alicization-bridge'

import { createBufferedSpeechAudioSource } from '@proj-alicization/pipelines-audio'
import {
  createIdleStageEmbodimentMotorState,
  createIdleStageEmbodimentSpeechRenderState,
  createStageEmbodimentSpeechPlaybackItem,
} from '@proj-alicization/stage-shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'

import { useStageEmbodimentPerformanceRuntime } from './use-stage-embodiment-performance-runtime'
import { useStageEmbodimentSpeech } from './use-stage-embodiment-speech'

vi.mock('@proj-alicization/model-driver-lipsync', () => ({
  createLive2DLipSync: vi.fn(),
}))

function createPerformance() {
  return {
    baseEmotion: 'happy' as const,
    emotion: 'happy' as const,
    facialCue: 'smile',
    actionCue: 'raise_hand_excited',
    delivery: 'energetic' as const,
    emphasis: 2 as const,
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

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('stage embodiment performance runtime', () => {
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

    speechRenderState.value = {
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
    }
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
        onStart(listener) {
          startListener = listener
        },
        onEnd(listener) {
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
            }],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [{
              segmentId: 'segment-scripted-stop-1',
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
    endListener?.({ item, endedAt: 240 })
    await nextTick()

    vi.advanceTimersByTime(180)
    await nextTick()

    expect(runtime.speech.speechRenderState.value.phase).toBe('idle')
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
    const playbackTelemetry = ref<Record<string, unknown> | null>({
      driftMs: 380,
      settleMs: 560,
    })
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(runtime.playbackTelemetry.value).toEqual({
      driftMs: 380,
      settleMs: 560,
    })
    expect(runtime.state.value.phase).toBe('idle')

    scope.stop()
  })
})
