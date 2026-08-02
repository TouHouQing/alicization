import type { PlaybackItem } from '@proj-alicization/pipelines-audio'
import type { AlicizationDigitalLifeFrame, StageEmbodimentSpeechPlaybackItem } from '@proj-alicization/stage-shared'

import type { BrowserSpeechAudioSource } from '../../libs/speech-audio-playback'
import type { EmbodimentPlaybackTelemetry } from '../../services/embodiment/playback-reconciler'
import type { AlicizationDigitalLifeSpineDigest } from '../../stores/alicization-bridge'

import { createBufferedSpeechAudioSource } from '@proj-alicization/pipelines-audio'
import {

  createIdleStageEmbodimentMotorState,
  createIdleStageEmbodimentSpeechArticulationState,
  createIdleStageEmbodimentSpeechRenderState,
  createStageEmbodimentSpeechPlaybackItem,

} from '@proj-alicization/stage-shared'
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
      voice: null,
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
      voice: null,
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
  personaBias?: NonNullable<NonNullable<AlicizationDigitalLifeSpineDigest['proactive']>['personaBias']>
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
        latestInflection: null,
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
      personaBias: input.personaBias ?? null,
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
  digitalLifeSpineDigest?: AlicizationDigitalLifeSpineDigest
  emphasis: 0 | 1 | 2
  facialCue: string | null
  residentMode?: 'dialogue' | 'quiet-companionship' | 'quiet-accompaniment' | 'measured-return' | 'repair-before-closeness' | 'same-thread-continuation' | 'idle-recovering'
  residentReasonTags?: string[]
  variationToken: string
}) {
  const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
  const digitalLifeSpineDigest = input.digitalLifeSpineDigest
    ? ref(input.digitalLifeSpineDigest)
    : undefined
  const scope = effectScope()
  const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
    digitalLifeSpineDigest,
    speechRenderState,
  }))!

  runtime.syncResidentPerformance({
    baseEmotion: input.baseEmotion,
    emotion: input.baseEmotion,
    facialCue: input.facialCue,
    actionCue: input.actionCue,
    delivery: input.delivery,
    emphasis: input.emphasis,
    residentMode: input.residentMode,
  }, {
    residentReasonTags: input.residentReasonTags,
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

  it('does not rearm an action pulse when only the audit variation token changes', async () => {
    const nowSpy = vi.spyOn(performance, 'now')
    let now = 100
    nowSpy.mockImplementation(() => now)
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!
    const performancePayload = createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'observe_focus',
      delivery: 'gentle',
      emphasis: 1,
    })

    runtime.armPerformance(performancePayload, {
      source: 'dialogue',
      variationToken: 'audit-token-clean',
    })
    await nextTick()
    const actionPulseRevision = runtime.state.value.actionPulse.revision

    now = 150
    runtime.armPerformance(performancePayload, {
      source: 'dialogue',
      variationToken: 'audit-token-updated|untrusted-free-text',
    })
    await nextTick()

    expect(runtime.state.value.actionPulse.revision).toBe(actionPulseRevision)
    expect(runtime.state.value.variationToken).toBe('audit-token-updated|untrusted-free-text')

    scope.stop()
  })

  it('still synchronizes speech state when an audit-only arm is deduplicated', async () => {
    const nowSpy = vi.spyOn(performance, 'now')
    let now = 100
    nowSpy.mockImplementation(() => now)
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!
    const performancePayload = createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: null,
      delivery: 'gentle',
      emphasis: 0,
    })

    runtime.armPerformance(performancePayload, {
      source: 'dialogue',
      variationToken: 'audit-token-initial',
    })
    await nextTick()

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      phase: 'playing',
    }
    now = 150
    runtime.armPerformance(performancePayload, {
      source: 'dialogue',
      variationToken: 'audit-token-updated',
    })
    await nextTick()

    expect(runtime.state.value.phase).toBe('speaking')
    expect(runtime.state.value.speechActive).toBe(true)
    expect(runtime.state.value.variationToken).toBe('audit-token-updated')

    scope.stop()
  })

  it('does not refresh a stable stopping snapshot for audit-only arm updates', async () => {
    vi.useFakeTimers()
    const nowSpy = vi.spyOn(performance, 'now')
    let now = 100
    nowSpy.mockImplementation(() => now)
    const speechRenderState = ref({
      ...createIdleStageEmbodimentSpeechRenderState(),
      active: true,
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-stable-stopping-audit',
        segmentId: 'segment-stable-stopping-audit',
        special: null,
        streamId: 'stream-stable-stopping-audit',
        text: '停在这里。',
      }),
      phase: 'stopping' as const,
      revision: 1,
    })
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!
    const performancePayload = createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: null,
      delivery: 'gentle',
      emphasis: 0,
    })

    runtime.armPerformance(performancePayload, {
      source: 'dialogue',
      variationToken: 'audit-token-initial',
    })
    await nextTick()
    const revision = runtime.state.value.revision

    now = 150
    runtime.armPerformance(performancePayload, {
      source: 'dialogue',
      variationToken: 'audit-token-updated',
    })
    await nextTick()

    expect(runtime.state.value.revision).toBe(revision)
    expect(runtime.state.value.speechPhase).toBe('stopping')
    expect(runtime.state.value.activeSegment?.segmentId).toBe('segment-stable-stopping-audit')
    expect(runtime.state.value.variationToken).toBe('audit-token-updated')

    scope.stop()
  })

  it('does not resync resident dynamics when only audit fields change', async () => {
    const nowSpy = vi.spyOn(performance, 'now')
    let now = 100
    nowSpy.mockImplementation(() => now)
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!
    const residentPerformance = {
      baseEmotion: 'thinking' as const,
      emotion: 'thinking' as const,
      facialCue: 'focus',
      actionCue: 'observe_focus',
      delivery: 'gentle' as const,
      emphasis: 0 as const,
      residentMode: 'measured-return' as const,
    }

    runtime.syncResidentPerformance(residentPerformance, {
      residentReasonTags: ['audit-clean'],
      variationToken: 'resident-audit-clean',
    })
    await nextTick()
    const revision = runtime.state.value.revision
    const dynamics = {
      actionIntensity: runtime.state.value.actionIntensity,
      breathDrive: runtime.state.value.breathDrive,
      expressionIntensity: runtime.state.value.expressionIntensity,
      focusDrive: runtime.state.value.focusDrive,
      motor: runtime.state.value.motor,
    }

    now = 150
    runtime.syncResidentPerformance(residentPerformance, {
      residentReasonTags: ['audit:updated', 'audit:untrusted-free-text'],
      variationToken: 'resident-audit-updated|untrusted-free-text',
    })
    await nextTick()

    expect(runtime.state.value.revision).toBe(revision)
    expect({
      actionIntensity: runtime.state.value.actionIntensity,
      breathDrive: runtime.state.value.breathDrive,
      expressionIntensity: runtime.state.value.expressionIntensity,
      focusDrive: runtime.state.value.focusDrive,
      motor: runtime.state.value.motor,
    }).toEqual(dynamics)
    expect(runtime.state.value.residentReasonTags).toEqual(['audit:updated', 'audit:untrusted-free-text'])
    expect(runtime.state.value.variationToken).toBe('resident-audit-updated|untrusted-free-text')

    scope.stop()
  })

  it('still synchronizes speech state when an audit-only resident sync is deduplicated', async () => {
    const nowSpy = vi.spyOn(performance, 'now')
    let now = 100
    nowSpy.mockImplementation(() => now)
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!
    const residentPerformance = {
      baseEmotion: 'thinking' as const,
      emotion: 'thinking' as const,
      facialCue: 'focus',
      actionCue: null,
      delivery: 'gentle' as const,
      emphasis: 0 as const,
    }

    runtime.syncResidentPerformance(residentPerformance, {
      variationToken: 'resident-audit-initial',
    })
    await nextTick()

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      phase: 'playing',
    }
    now = 150
    runtime.syncResidentPerformance(residentPerformance, {
      variationToken: 'resident-audit-updated',
    })
    await nextTick()

    expect(runtime.state.value.phase).toBe('speaking')
    expect(runtime.state.value.speechActive).toBe(true)
    expect(runtime.state.value.variationToken).toBe('resident-audit-updated')

    scope.stop()
  })

  it('suppresses preview actions using playback segment authority when the cue id differs', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const upcomingSpeechSegment = ref(createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-preview-segment-authority',
      segmentId: 'segment-preview-segment-authority',
      special: null,
      streamId: 'stream-preview-segment-authority',
      text: '看这里。',
      cue: createPlaybackCueFixture({
        id: 'turn-preview-segment-authority:0',
        text: '看这里。',
        actionCue: 'point_screen',
        actionWindow: 'segment-start',
        gestureWeight: 0.72,
      }),
    }))
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(
      createPlaybackTelemetryFixture({
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-preview-segment-authority',
          rendererTarget: 'live2d',
          matchedDrivers: ['body'],
          sources: ['digital-life-projection'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: false,
          voiceSegmentMatched: false,
          prosodyAuthority: null,
        },
      }),
    )
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
      upcomingSpeechSegment,
    }))!
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      bodySegmentMatched: true,
      motionSegmentMatched: false,
      segmentId: 'segment-preview-segment-authority',
    }))
    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeActionCue).toBeNull()
    expect(runtime.state.value.actionPulse.revision).toBe(0)

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

  it('lets structured quiet accompaniment persist as the next idle baseline', async () => {
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
      residentMode: 'quiet-accompaniment',
    }, {
      variationToken: 'resident-quiet-accompaniment-audit',
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

  it('ignores audit tags and variation tokens when resolving resident idle dynamics', async () => {
    const baseline = await createResidentIdleRuntime({
      actionCue: 'observe_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      facialCue: 'focus',
      variationToken: 'resident-audit-clean',
    })
    const polluted = await createResidentIdleRuntime({
      actionCue: 'observe_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      facialCue: 'focus',
      residentReasonTags: [
        'audit:updated',
        'audit:untrusted-free-text',
      ],
      variationToken: 'resident-audit-updated|untrusted-free-text',
    })

    expect(polluted.runtime.state.value.phase).toBe('idle')
    expect(polluted.runtime.state.value.actionIntensity).toBe(baseline.runtime.state.value.actionIntensity)
    expect(polluted.runtime.state.value.breathDrive).toBe(baseline.runtime.state.value.breathDrive)
    expect(polluted.runtime.state.value.focusDrive).toBe(baseline.runtime.state.value.focusDrive)
    expect(polluted.runtime.state.value.expressionIntensity).toBe(baseline.runtime.state.value.expressionIntensity)
    expect(polluted.runtime.state.value.facialCueIntensity).toBe(baseline.runtime.state.value.facialCueIntensity)
    expect(polluted.runtime.state.value.motor).toEqual(baseline.runtime.state.value.motor)

    baseline.scope.stop()
    polluted.scope.stop()
  })

  it('uses structured resident mode to make measured-return idle dynamics more settled', async () => {
    const baseline = await createResidentIdleRuntime({
      actionCue: 'observe_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      facialCue: 'focus',
      variationToken: 'resident-structured-baseline',
    })
    const measuredReturn = await createResidentIdleRuntime({
      actionCue: 'observe_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      facialCue: 'focus',
      residentMode: 'measured-return',
      variationToken: 'resident-structured-measured-return',
    })

    expect(measuredReturn.runtime.state.value.actionIntensity).toBeLessThanOrEqual(baseline.runtime.state.value.actionIntensity)
    expect(measuredReturn.runtime.state.value.breathDrive).toBeGreaterThanOrEqual(baseline.runtime.state.value.breathDrive)
    expect(measuredReturn.runtime.state.value.focusDrive).toBeGreaterThanOrEqual(baseline.runtime.state.value.focusDrive)
    expect(measuredReturn.runtime.state.value.motor.body.openness).toBeLessThan(baseline.runtime.state.value.motor.body.openness)
    expect(measuredReturn.runtime.state.value.motor.body.settle).toBeGreaterThanOrEqual(baseline.runtime.state.value.motor.body.settle)

    baseline.scope.stop()
    measuredReturn.scope.stop()
  })

  it('does not infer quiet accompaniment from a fixed performance cue bundle', async () => {
    const unstructured = await createResidentIdleRuntime({
      actionCue: 'steady_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      facialCue: 'focus',
      variationToken: 'resident-unstructured-audit',
    })
    const control = await createResidentIdleRuntime({
      actionCue: 'unmapped_action',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      facialCue: 'focus',
      variationToken: 'resident-control-audit',
    })

    expect(unstructured.runtime.state.value.actionIntensity).toBe(control.runtime.state.value.actionIntensity)
    expect(unstructured.runtime.state.value.breathDrive).toBe(control.runtime.state.value.breathDrive)
    expect(unstructured.runtime.state.value.focusDrive).toBe(control.runtime.state.value.focusDrive)
    expect(unstructured.runtime.state.value.expressionIntensity).toBe(control.runtime.state.value.expressionIntensity)
    expect(unstructured.runtime.state.value.motor).toEqual(control.runtime.state.value.motor)

    unstructured.scope.stop()
    control.scope.stop()
  })

  it('does not infer idle recovery from a fixed performance cue bundle', async () => {
    const unstructured = await createResidentIdleRuntime({
      actionCue: 'comfort_sway',
      baseEmotion: 'tired',
      delivery: 'gentle',
      emphasis: 1,
      facialCue: 'soft-gaze',
      variationToken: 'resident-unstructured-audit',
    })
    const control = await createResidentIdleRuntime({
      actionCue: 'unmapped_action',
      baseEmotion: 'tired',
      delivery: 'gentle',
      emphasis: 1,
      facialCue: 'soft-gaze',
      variationToken: 'resident-control-audit',
    })

    expect(unstructured.runtime.state.value.actionIntensity).toBe(control.runtime.state.value.actionIntensity)
    expect(unstructured.runtime.state.value.breathDrive).toBe(control.runtime.state.value.breathDrive)
    expect(unstructured.runtime.state.value.focusDrive).toBe(control.runtime.state.value.focusDrive)
    expect(unstructured.runtime.state.value.expressionIntensity).toBe(control.runtime.state.value.expressionIntensity)
    expect(unstructured.runtime.state.value.motor).toEqual(control.runtime.state.value.motor)

    unstructured.scope.stop()
    control.scope.stop()
  })

  it('preserves resident audit tags without using them as runtime authority', async () => {
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
      residentMode: 'measured-return',
    }, {
      residentReasonTags: [
        'audit:resident-source',
        'audit:reviewed',
      ],
      variationToken: 'resident-audit-provenance',
    })
    await nextTick()

    expect(runtime.state.value.phase).toBe('idle')
    expect(runtime.state.value.performance.baseEmotion).toBe('thinking')
    expect(runtime.state.value.performance.delivery).toBe('gentle')
    expect(runtime.state.value.performance.actionCue).toBe('observe_focus')
    expect(runtime.state.value.residentReasonTags).toEqual([
      'audit:resident-source',
      'audit:reviewed',
    ])

    scope.stop()
  })

  it('lets structured idle recovery persist as the next resident baseline', async () => {
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
      residentMode: 'idle-recovering',
    }, {
      variationToken: 'resident-idle-recovery-audit',
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

  it('preserves resident audit provenance across dialogue arming', async () => {
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
      residentMode: 'quiet-accompaniment',
    }, {
      residentReasonTags: ['audit:resident-source', 'audit:reviewed'],
      variationToken: 'resident-audit-baseline',
    })
    await nextTick()

    runtime.armPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
      residentMode: 'quiet-accompaniment',
    }, {
      source: 'dialogue',
      variationToken: 'dialogue-audit-provenance',
    })
    await nextTick()

    expect(runtime.state.value.phase).toBe('armed')
    expect(runtime.state.value.residentReasonTags).toEqual(['audit:resident-source', 'audit:reviewed'])
    expect(runtime.state.value.performance.delivery).toBe('gentle')
    expect(runtime.state.value.activeFacialCueSource).toBe('resident')
    expect(runtime.state.value.activeActionCueSource).toBe('resident')

    scope.stop()
  })

  it('keeps structured quiet accompaniment lightly active during idle', async () => {
    const baseline = await createResidentIdleRuntime({
      actionCue: 'observe_focus',
      baseEmotion: 'thinking',
      delivery: 'calm',
      emphasis: 1,
      facialCue: 'focus',
      variationToken: 'resident-baseline-audit',
    })
    const quiet = await createResidentIdleRuntime({
      actionCue: 'steady_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      facialCue: 'focus',
      residentMode: 'quiet-accompaniment',
      variationToken: 'resident-quiet-accompaniment-audit',
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

  it('keeps structured idle recovery dynamics distinct from ordinary concern', async () => {
    const baseline = await createResidentIdleRuntime({
      actionCue: 'comfort_settle',
      baseEmotion: 'concerned',
      delivery: 'calm',
      emphasis: 1,
      facialCue: 'soft-gaze',
      variationToken: 'resident-concern-baseline-audit',
    })
    const protective = await createResidentIdleRuntime({
      actionCue: 'comfort_sway',
      baseEmotion: 'tired',
      delivery: 'gentle',
      emphasis: 1,
      facialCue: 'soft-gaze',
      residentMode: 'idle-recovering',
      variationToken: 'resident-idle-recovery-audit',
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

  it('uses structured persona bias instead of variation-token prose for speaking dynamics', async () => {
    async function createSpeakingPersonaRuntime(
      personaBias: NonNullable<NonNullable<AlicizationDigitalLifeSpineDigest['proactive']>['personaBias']>,
    ) {
      const speechRenderState = ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        active: true,
        dynamics: {
          speechEnergy: 0.56,
          prosodyIntensity: 0.48,
          emphasisLevel: 0.44,
          cadencePulse: 0.52,
        },
        item: createStageEmbodimentSpeechPlaybackItem({
          intentId: 'intent-structured-persona-bias',
          segmentId: 'segment-structured-persona-bias',
          special: null,
          streamId: 'stream-structured-persona-bias',
          text: '继续。',
        }),
        phase: 'playing' as const,
        revision: 1,
        visemeIntensity: 0.42,
      })
      const digitalLifeSpineDigest = ref(createDigitalLifeSpineDigest({
        dominantSystem: 'memory',
        operatingMode: 'observing',
        personaBias,
      }))
      const scope = effectScope()
      const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
        digitalLifeSpineDigest,
        speechRenderState,
      }))!

      runtime.armPerformance(createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focus',
        actionCue: 'raise_hand_excited',
        delivery: 'gentle',
        emphasis: 2,
      }), {
        source: 'dialogue',
        variationToken: 'identical-audit-token',
      })
      await nextTick()

      return { runtime, scope }
    }

    const observant = await createSpeakingPersonaRuntime({
      relationshipPosture: 'observer',
      initiativeStyle: 'observant',
      silenceReconnect: 'hold',
      comfortStyle: 'quiet-presence',
      preferredProactiveStyle: 'silent-observe',
      whySummary: 'untrusted audit text',
    })
    const direct = await createSpeakingPersonaRuntime({
      relationshipPosture: 'peer',
      initiativeStyle: 'high-participation',
      silenceReconnect: 'direct-approach',
      comfortStyle: 'quiet-presence',
      preferredProactiveStyle: 'gentle-check-in',
      whySummary: 'untrusted audit text',
    })

    expect(observant.runtime.state.value.focusDrive).toBeGreaterThan(0)
    expect(direct.runtime.state.value.actionIntensity).toBeGreaterThan(0)
    expect(direct.runtime.state.value.actionIntensity).toBeGreaterThan(observant.runtime.state.value.actionIntensity)
    expect(observant.runtime.state.value.variationToken).toBe('identical-audit-token')
    expect(direct.runtime.state.value.variationToken).toBe('identical-audit-token')

    observant.scope.stop()
    direct.scope.stop()
  })

  it('ignores long-horizon prose summaries when resolving idle runtime dynamics', async () => {
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
          latestInflection: null,
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

    const speechBase = {
      active: true,
      dynamics: {
        speechEnergy: 0.32,
        prosodyIntensity: 0.28,
        emphasisLevel: 0.22,
        cadencePulse: 0.3,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-prose-audit-equivalence',
        segmentId: 'segment-prose-audit-equivalence',
        special: null,
        streamId: 'stream-prose-audit-equivalence',
        text: '继续检查结构化状态。',
      }),
      phase: 'playing' as const,
      revision: 1,
      visemeIntensity: 0.24,
    }
    const baselineSpeech = ref({
      ...createIdleStageEmbodimentSpeechRenderState(),
      ...speechBase,
    })
    const lowerPressureSpeech = ref({
      ...createIdleStageEmbodimentSpeechRenderState(),
      ...speechBase,
    })
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

    baselineRuntime.armPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 1,
    }, {
      source: 'dialogue',
      variationToken: 'resident|observe-first|baseline',
    })
    lowerPressureRuntime.armPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 1,
    }, {
      source: 'dialogue',
      variationToken: 'resident|observe-first|baseline',
    })
    await nextTick()

    expect(lowerPressureRuntime.state.value.actionIntensity).toBe(baselineRuntime.state.value.actionIntensity)
    expect(lowerPressureRuntime.state.value.breathDrive).toBe(baselineRuntime.state.value.breathDrive)
    expect(lowerPressureRuntime.state.value.focusDrive).toBe(baselineRuntime.state.value.focusDrive)
    expect(lowerPressureRuntime.state.value.expressionIntensity).toBe(baselineRuntime.state.value.expressionIntensity)
    expect(lowerPressureRuntime.state.value.prosodyDrive).toBe(baselineRuntime.state.value.prosodyDrive)
    expect(lowerPressureRuntime.state.value.motor).toEqual(baselineRuntime.state.value.motor)

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

  it('keeps runtime active-segment and action-pulse ids on the living line even when speech item segmentId is a stale shell', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focused',
      actionCue: 'observe_focus',
      delivery: 'gentle',
      emphasis: 1,
    }), {
      source: 'dialogue',
      variationToken: 'turn-runtime-stale-shell-action-pulse',
    })

    const livingCue = createPlaybackCueFixture({
      id: 'segment-runtime-living-line',
      index: 1,
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
      settleMode: 'hold',
    })
    const livingFrame = createDigitalLifeFrameFixture({
      id: 'segment-runtime-living-line',
      index: 1,
      startOffset: 0,
      endOffset: 6,
      text: '继续看这里。',
      mode: 'thinking',
      interruptPolicy: 'soft-interrupt',
      settleMode: 'hold',
      face: {
        emotion: 'thinking',
        facialCue: 'focused',
        expressionMode: 'hold',
        intensity: 0.52,
        holdMs: 320,
        rendererHints: null,
      },
      action: {
        actionCue: 'observe_focus',
        actionMode: 'hold',
        intensity: 0.34,
        holdMs: 240,
        rendererHints: null,
      },
    })

    speechRenderState.value = createSpeechRenderStateFixture({
      active: true,
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-runtime-stale-shell-action-pulse',
        streamId: 'stream-runtime-stale-shell-action-pulse',
        segmentId: 'segment-runtime-stale-shell',
        special: null,
        text: '继续看这里。',
        cue: livingCue,
        digitalLifeFrame: livingFrame,
      }),
      phase: 'starting',
      revision: 1,
      visemeIntensity: 0.24,
      dynamics: {
        speechEnergy: 0.44,
        prosodyIntensity: 0.4,
        emphasisLevel: 0.32,
        cadencePulse: 0.38,
      },
    })
    await nextTick()

    expect(runtime.state.value.activeSegment?.cue?.id).toBe('segment-runtime-living-line')
    expect(runtime.state.value.activeSegment?.digitalLifeFrame?.id).toBe('segment-runtime-living-line')
    expect(runtime.state.value.activeSegment?.segmentId).toBe('segment-runtime-living-line')
    expect(runtime.state.value.actionPulse.reason).toBe('segment-start')
    expect(runtime.state.value.actionPulse.cue).toBe('observe_focus')
    expect(runtime.state.value.actionPulse.segmentId).toBe('segment-runtime-living-line')

    scope.stop()
  })

  it('keeps runtime active segment authority on the playback living line even when the cue id is still a stale shell', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focused',
      actionCue: 'observe_focus',
      delivery: 'gentle',
      emphasis: 1,
    }), {
      source: 'dialogue',
      variationToken: 'turn-runtime-stale-cue-shell-authority',
    })

    speechRenderState.value = createSpeechRenderStateFixture({
      active: true,
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-runtime-stale-cue-shell-authority',
        streamId: 'stream-runtime-stale-cue-shell-authority',
        segmentId: 'segment-runtime-living-line',
        special: null,
        text: '继续看这里。',
        cue: createPlaybackCueFixture({
          id: 'turn-runtime-stale-cue-shell:0',
          index: 1,
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
          settleMode: 'hold',
        }),
      }),
      phase: 'starting',
      revision: 1,
      visemeIntensity: 0.24,
      dynamics: {
        speechEnergy: 0.44,
        prosodyIntensity: 0.4,
        emphasisLevel: 0.32,
        cadencePulse: 0.38,
      },
    })
    await nextTick()

    expect(runtime.state.value.activeSegment?.segmentId).toBe('segment-runtime-living-line')
    expect(runtime.state.value.actionPulse.segmentId).toBe('segment-runtime-living-line')

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
            voice: null,
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
            voice: null,
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

  it('promotes a later segment preview during interruption tail without losing segment continuity', async () => {
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
            voice: null,
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

  it('keeps stopping-tail face and motion authority on the current cue line even when the playback item segment id is a stale shell', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focused',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }), {
      source: 'dialogue',
      variationToken: 'turn-stopping-tail-stale-item-shell-should-not-win',
    })

    const stoppedItem = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-stopping-tail-stale-item-shell-should-not-win',
      segmentId: 'segment-stale-stop-shell',
      special: null,
      streamId: 'stream-stopping-tail-stale-item-shell-should-not-win',
      text: '我还在，只是先轻一点收回来。',
      continuityHoldMs: 320,
      cue: createPlaybackCueFixture({
        id: 'segment-current-stop-tail-line',
        text: '我还在，只是先轻一点收回来。',
        facialCue: 'soft-release',
        actionCue: 'observe_focus',
        facialWeight: 0.42,
        gestureWeight: 0.18,
        mouthWeight: 0.28,
        headWeight: 0.16,
        beatWeight: 0.18,
        facialHoldMs: 360,
        actionHoldMs: 280,
        emotionHoldMs: 320,
        settleMode: 'linger',
      }),
      digitalLifeFrame: createDigitalLifeFrameFixture({
        id: 'segment-current-stop-tail-line',
        text: '我还在，只是先轻一点收回来。',
        settleMode: 'linger',
        face: {
          emotion: 'thinking',
          facialCue: 'soft-release',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 360,
          rendererHints: null,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 280,
          rendererHints: null,
        },
      }),
      metadata: {
        embodimentPlayback: {
          actualDurationMs: 520,
          driftMs: 0,
          plannedDurationMs: 520,
          settleMs: 320,
          stopReason: 'ended',
          rendererTarget: 'live2d',
          cue: {
            id: 'segment-current-stop-tail-line',
            index: 0,
            startOffset: 0,
            endOffset: 14,
            text: '我还在，只是先轻一点收回来。',
            emotion: 'thinking',
            gestureWeight: 0.18,
            facialWeight: 0.42,
            prosodyWeight: 0.24,
            beatWeight: 0.18,
            mouthWeight: 0.28,
            headWeight: 0.16,
            facialHoldMs: 360,
            actionHoldMs: 280,
            emotionHoldMs: 320,
            settleMode: 'linger',
            rendererHints: null,
            actionCue: 'observe_focus',
            facialCue: 'soft-release',
            actionWindow: 'none',
            interruptMode: 'soft-interrupt',
          },
          drivers: {
            body: null,
            face: {
              emotion: 'thinking',
              facialCue: 'soft-release',
              intensity: 0.42,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'soft-release',
              segmentId: 'segment-current-stop-tail-line',
              source: 'prosody-authority',
              confidence: 0.92,
            },
            lipsync: null,
            motion: {
              idleBase: 'observe_focus',
              attentionMode: 'attentive',
              actionCue: 'observe_focus',
              intensity: 0.18,
              holdMs: 280,
              segmentId: 'segment-current-stop-tail-line',
              source: 'timeline-projection',
              confidence: 0.88,
            },
            voice: null,
          },
        },
      },
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
      item: stoppedItem,
      phase: 'stopping',
      revision: 1,
      visemeIntensity: 0.08,
    }
    await nextTick()

    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-current-stop-tail-line',
      facialCue: 'soft-release',
      actionCue: 'observe_focus',
    }))
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-current-stop-tail-line',
      faceSegmentMatched: true,
      motionSegmentMatched: true,
    }))
    expect(runtime.state.value.activeFacialCue).toBe('soft-release')
    expect(runtime.state.value.activeFacialCueSource).toBe('preview')
    expect(runtime.state.value.activeActionCue).toBe('observe_focus')
    expect(runtime.state.value.activeActionCueSource).toBe('preview')

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
            voice: null,
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
            voice: null,
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

  it('realigns vrm face and motion together onto the resumed segment', async () => {
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
        voice: null,
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

  it('realigns live2d face and motion together onto the resumed segment', async () => {
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
        voice: null,
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

  it('keeps vrm resumed preview action pulse from warming earlier than the inward post-utterance face recovery on the continuity state', async () => {
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
        voice: null,
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

  it('keeps live2d resumed preview action pulse from warming earlier than the inward post-utterance face recovery on the continuity state', async () => {
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
        voice: null,
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

  it('keeps vrm resumed reopen authority provenance stable while cue-bridged face and motion rejoin the continuity state', async () => {
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
        voice: null,
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

  it('keeps live2d authority provenance stable while cue-bridged face and motion rejoin the segment', async () => {
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
        voice: null,
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
              voice: null,
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

  it('does not let stale playback-item face and motion shells override the current living segment during active playback', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-stale-playback-item-shell-should-not-revive',
    })

    speechRenderState.value = {
      ...speechRenderState.value,
      active: true,
      dynamics: {
        speechEnergy: 0.2,
        prosodyIntensity: 0.18,
        emphasisLevel: 0.12,
        cadencePulse: 0.22,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-stale-playback-item-shell-should-not-revive',
        segmentId: 'segment-current-living-line',
        special: null,
        streamId: 'stream-stale-playback-item-shell-should-not-revive',
        text: '继续看这里。',
        metadata: {
          embodimentPlayback: {
            actualDurationMs: 0,
            driftMs: 0,
            plannedDurationMs: 220,
            settleMs: 220,
            stopReason: null,
            rendererTarget: 'live2d',
            cue: null,
            driverAuthority: null,
            prosodyAuthority: null,
            drivers: {
              body: null,
              face: {
                emotion: 'concerned',
                facialCue: 'stale_shell_focus',
                intensity: 0.66,
                holdMs: 220,
                source: 'digital-life-projection',
                confidence: 0.92,
                preUtteranceCue: 'stale-shell-inhale',
                postUtteranceCue: 'stale-shell-release',
                segmentId: 'segment-stale-face-shell',
              },
              lipsync: null,
              motion: {
                idleBase: 'steady_focus',
                attentionMode: 'attentive',
                actionCue: 'stale_shell_action',
                intensity: 0.54,
                holdMs: 180,
                source: 'timeline-projection',
                confidence: 0.9,
                segmentId: 'segment-stale-motion-shell',
              },
              voice: null,
            },
          },
        },
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.08,
    }
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-current-living-line',
      rendererTarget: 'live2d',
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
              voice: null,
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
              voice: null,
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
        text: '我先沿着这条线中性可见占位。',
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
        voice: null,
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
      vrmActionFadeMs: 460,
      vrmExpressionBlendMs: 540,
    })

    scope.stop()
  })

  it('dampens companionship expression intensity for structured resident modes', () => {
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: 'measured-return',
      speechActive: true,
    })).toBe(0.92)
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: 'repair-before-closeness',
      speechActive: true,
    })).toBe(0.84)
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: 'quiet-companionship',
      speechActive: false,
    })).toBe(0.86)
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: 'idle-recovering',
      speechActive: false,
    })).toBe(0.8)
    expect(resolveCompanionshipExpressionDampening({
      activeCueResidentMode: null,
      speechActive: true,
    })).toBe(1)
  })

  it('keeps companionship resident action intensity more inward for repair-before-closeness and quiet-companionship idle carry', async () => {
    const baseline = await createResidentIdleRuntime({
      actionCue: 'observe_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 1,
      facialCue: 'soft-gaze',
      variationToken: 'resident-baseline-audit',
    })
    baseline.runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      delivery: 'gentle',
      emphasis: 1,
    }, {
      variationToken: 'resident-baseline-audit',
    })
    await nextTick()

    const repairBeforeCloseness = await createResidentIdleRuntime({
      actionCue: 'observe_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 1,
      facialCue: 'soft-gaze',
      residentMode: 'repair-before-closeness',
      variationToken: 'resident-repair-audit',
    })
    repairBeforeCloseness.runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      delivery: 'gentle',
      emphasis: 1,
      residentMode: 'repair-before-closeness',
    }, {
      variationToken: 'resident-repair-audit',
    })
    await nextTick()

    const quietCompanionship = await createResidentIdleRuntime({
      actionCue: 'observe_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 1,
      facialCue: 'soft-gaze',
      residentMode: 'quiet-companionship',
      variationToken: 'resident-quiet-audit',
    })
    quietCompanionship.runtime.syncResidentPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      delivery: 'gentle',
      emphasis: 1,
      residentMode: 'quiet-companionship',
    }, {
      variationToken: 'resident-quiet-audit',
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
        text: '我先中性可见占位。',
        special: null,
        continuityHoldMs: 220,
        audio: createBufferedSpeechAudioSource({} as AudioBuffer),
        createdAt: 0,
        cue: {
          id: 'segment-clone-active-cue-companionship-authority',
          index: 0,
          startOffset: 0,
          endOffset: 9,
          text: '我先中性可见占位。',
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
      actionCue: 'steady_focus',
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
      actionCue: 'steady_focus',
      settleMode: 'linger',
    }))
    expect(runtime.performanceRuntime.state.value.activeCue?.rendererSettle).toEqual(expect.objectContaining({
      vrmActionFadeMs: expect.any(Number),
      vrmExpressionBlendMs: expect.any(Number),
    }))
    expect(runtime.performanceRuntime.state.value.activeActionCue).toBe('steady_focus')
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
        voice: null,
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
        voice: null,
      },
    })
    await nextTick()

    expect(runtime.state.value.activeCue?.rendererHints?.preferredExpressionAliases).toEqual(['CalmInspect'])
    expect(runtime.state.value.activeCue?.rendererHints?.preferredMotionAliases).toEqual(['ObserveSoft'])
    expect(runtime.state.value.activeCue?.rendererSettle).toEqual({
      live2dFacialReleaseMs: 320,
      live2dMotionFollowThroughMs: 440,
      vrmActionFadeMs: 280,
      vrmExpressionBlendMs: 360,
    })

    scope.stop()
  })

  it('does not expose explicit playback cue audit text through active renderer hints', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-explicit-playback-cue-renderer-continuity-refresh',
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
        intentId: 'intent-explicit-playback-cue-renderer-continuity-refresh',
        segmentId: 'segment-explicit-playback-cue-renderer-continuity-refresh',
        special: null,
        streamId: 'stream-explicit-playback-cue-renderer-continuity-refresh',
        text: '我还是沿着这条线在。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
    }
    await nextTick()

    const baseTelemetry = createPlaybackTelemetryFixture({
      actualDurationMs: 240,
      driftMs: 0,
      plannedDurationMs: 240,
      settleMs: 280,
      stopReason: null,
      rendererTarget: 'live2d',
      cue: {
        id: 'segment-explicit-playback-cue-renderer-continuity-refresh',
        endOffset: 8,
        text: '我还是沿着这条线在。',
        emotion: 'thinking',
        gestureWeight: 0.28,
        facialWeight: 0.48,
        prosodyWeight: 0.34,
        beatWeight: 0.24,
        mouthWeight: 0.22,
        headWeight: 0.2,
        facialHoldMs: 320,
        actionHoldMs: 240,
        emotionHoldMs: 320,
        actionCue: null,
        facialCue: 'soft-gaze',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        rendererHints: {
          residentMode: 'same-thread-continuation',
          preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          signature: 'audit:initial',
          reasonTags: ['audit:initial'],
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
          facialCue: 'soft-gaze',
          intensity: 0.48,
          holdMs: 320,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-explicit-playback-cue-renderer-continuity-refresh',
          source: 'prosody-authority',
          confidence: 0.94,
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: null,
          intensity: 0.12,
          holdMs: 240,
          segmentId: 'segment-explicit-playback-cue-renderer-continuity-refresh',
          source: 'timeline-projection',
          confidence: 0.88,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-explicit-playback-cue-renderer-continuity-refresh',
          continuityHoldMs: 0,
          visemeHints: [
            { segmentId: 'segment-explicit-playback-cue-renderer-continuity-refresh', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
        voice: null,
      },
    })

    playbackTelemetry.value = baseTelemetry
    await nextTick()

    const initialBehavior = {
      actionPulseRevision: runtime.state.value.actionPulse.revision,
      driverAuthority: runtime.state.value.driverAuthority,
      motor: runtime.state.value.motor,
      rendererSettle: runtime.state.value.activeCue?.rendererSettle,
      revision: runtime.state.value.revision,
    }
    expect(runtime.state.value.activeCue?.rendererHints?.signature).toBeUndefined()
    expect(runtime.state.value.activeCue?.rendererHints?.reasonTags).toBeUndefined()

    playbackTelemetry.value = {
      ...baseTelemetry,
      cue: {
        ...baseTelemetry.cue!,
        rendererHints: {
          ...baseTelemetry.cue!.rendererHints!,
          signature: 'audit:updated',
          reasonTags: ['audit:updated'],
        },
      },
    }
    await nextTick()

    expect(runtime.state.value.activeCue?.rendererHints?.signature).toBeUndefined()
    expect(runtime.state.value.activeCue?.rendererHints?.reasonTags).toBeUndefined()
    expect({
      actionPulseRevision: runtime.state.value.actionPulse.revision,
      driverAuthority: runtime.state.value.driverAuthority,
      motor: runtime.state.value.motor,
      rendererSettle: runtime.state.value.activeCue?.rendererSettle,
      revision: runtime.state.value.revision,
    }).toEqual(initialBehavior)

    scope.stop()
  })

  it('extends vrm settle timing from structured companionship mode', async () => {
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
          residentMode: 'repair-before-closeness',
          preferredExpressionAliases: ['SegmentExpression'],
          preferredMotionAliases: ['SegmentMotion'],
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
        voice: null,
      },
    })
    await nextTick()

    expect(runtime.state.value.activeCue?.rendererSettle).toEqual({
      live2dFacialReleaseMs: 420,
      live2dMotionFollowThroughMs: 520,
      vrmActionFadeMs: 560,
      vrmExpressionBlendMs: 640,
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
        voice: null,
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
        voice: null,
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
    expect(runtime.state.value.activeCue?.rendererSettle?.vrmActionFadeMs).toBe(560)
    expect(runtime.state.value.activeCue?.rendererSettle?.vrmExpressionBlendMs).toBe(620)
    expect(fullyMatchedSettle).toEqual({
      live2dFacialReleaseMs: 360,
      live2dMotionFollowThroughMs: 420,
      vrmActionFadeMs: 460,
      vrmExpressionBlendMs: 520,
    })
    expect(runtime.state.value.driverAuthority).toEqual(expect.objectContaining({
      bodySegmentMatched: false,
      matchedDrivers: ['face', 'motion', 'lipsync'],
      segmentId: 'segment-vrm-renderer-only-fade-guard',
    }))
    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeCue?.rendererSettle?.live2dFacialReleaseMs ?? 0).toBeGreaterThanOrEqual(360)
    expect(runtime.state.value.activeCue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0).toBeGreaterThanOrEqual(420)
    expect(runtime.state.value.activeCue?.rendererSettle?.vrmActionFadeMs).toBe(
      (fullyMatchedSettle?.vrmActionFadeMs ?? 0) + 100,
    )
    expect(runtime.state.value.activeCue?.rendererSettle?.vrmExpressionBlendMs).toBe(
      (fullyMatchedSettle?.vrmExpressionBlendMs ?? 0) + 100,
    )

    playbackTelemetry.value = baseTelemetry
    await nextTick()

    expect(runtime.state.value.activeCue?.rendererSettle).toEqual(fullyMatchedSettle)

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
        voice: null,
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

  it('preserves quieter speech timing hints on the runtime active cue when preview authority is carried by the continuity state', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      speechRenderState,
      upcomingSpeechSegment,
    }))!

    runtime.armPerformance(createPerformance({
      facialCue: 'focus',
      actionCue: 'steady_focus',
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
    }), {
      variationToken: 'turn-preview-quieter-speech-timing-hints',
    })

    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-preview-quieter-speech-timing-hints',
      streamId: 'stream-preview-quieter-speech-timing-hints',
      segmentId: 'segment-preview-quieter-speech-timing-hints',
      text: '我先沿着这条线慢一点接回来。',
      special: null,
      digitalLifeFrame: createDigitalLifeFrameFixture({
        id: 'segment-preview-quieter-speech-timing-hints',
        text: '我先沿着这条线慢一点接回来。',
        mode: 'speaking',
        settleMode: 'linger',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 0.88,
          energy: 0.28,
          cadence: 0.22,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 360,
          rendererHints: {
            residentMode: 'measured-return',
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            preferredPauseMode: 'longer',
            preferredLipsyncMode: 'restrained',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 260,
          rendererHints: {
            residentMode: 'measured-return',
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            preferredPauseMode: 'longer',
            preferredLipsyncMode: 'restrained',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
          },
        },
      }),
    })
    await nextTick()

    expect(runtime.state.value.activeCueSource).toBe('preview')
    expect(runtime.state.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredExpressionAliases: ['CalmInspect'],
      preferredMotionAliases: ['ObserveSoft'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))

    scope.stop()
  })

  it('refreshes the active cue when only speech timing preferences change', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const upcomingSpeechSegment = ref(createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-speech-timing-preferences',
      streamId: 'stream-speech-timing-preferences',
      segmentId: 'segment-speech-timing-preferences',
      text: '保持同一段话，只改变节奏偏好。',
      special: null,
      cue: createPlaybackCueFixture({
        id: 'segment-speech-timing-preferences',
        rendererHints: {
          preferredPauseMode: 'natural',
          preferredLipsyncMode: 'matched',
          preferredVoiceMode: 'even',
          preferredPacingMode: 'natural',
        },
      }),
    }))
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      speechRenderState,
      upcomingSpeechSegment,
    }))!

    await nextTick()
    expect(runtime.state.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      preferredPauseMode: 'natural',
      preferredLipsyncMode: 'matched',
      preferredVoiceMode: 'even',
      preferredPacingMode: 'natural',
    }))

    upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-speech-timing-preferences',
      streamId: 'stream-speech-timing-preferences',
      segmentId: 'segment-speech-timing-preferences',
      text: '保持同一段话，只改变节奏偏好。',
      special: null,
      cue: createPlaybackCueFixture({
        id: 'segment-speech-timing-preferences',
        rendererHints: {
          preferredPauseMode: 'longer',
          preferredLipsyncMode: 'restrained',
          preferredVoiceMode: 'lower-pressure',
          preferredPacingMode: 'slower',
        },
      }),
    })

    await nextTick()
    expect(runtime.state.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))

    scope.stop()
  })

  it('keeps preview body behavior more inward when the continuity state carries lower-pressure slower speech timing hints', async () => {
    async function createPreviewRuntimeWithSpeechTiming(input: {
      preferredVoiceMode: 'even' | 'lower-pressure'
      preferredPacingMode: 'natural' | 'slower'
      variationToken: string
    }) {
      const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
      const upcomingSpeechSegment = ref<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem> | null>(null)
      const scope = effectScope()
      const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
        speechRenderState,
        upcomingSpeechSegment,
      }))!

      runtime.armPerformance(createPerformance({
        facialCue: 'focus',
        actionCue: 'steady_focus',
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 0,
      }), {
        variationToken: input.variationToken,
      })

      upcomingSpeechSegment.value = createStageEmbodimentSpeechPlaybackItem({
        intentId: `intent-${input.variationToken}`,
        streamId: `stream-${input.variationToken}`,
        segmentId: `segment-${input.variationToken}`,
        text: '我先沿着这条线中性可见占位。',
        special: null,
        digitalLifeFrame: createDigitalLifeFrameFixture({
          id: `segment-${input.variationToken}`,
          text: '我先沿着这条线中性可见占位。',
          mode: 'speaking',
          settleMode: 'linger',
          voice: {
            pitchDelta: 0,
            rateMultiplier: 0.92,
            energy: 0.3,
            cadence: 0.24,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 360,
            rendererHints: {
              residentMode: 'measured-return',
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredPauseMode: 'longer',
              preferredLipsyncMode: 'restrained',
              preferredVoiceMode: input.preferredVoiceMode,
              preferredPacingMode: input.preferredPacingMode,
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.18,
            holdMs: 260,
            rendererHints: {
              residentMode: 'measured-return',
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredPauseMode: 'longer',
              preferredLipsyncMode: 'restrained',
              preferredVoiceMode: input.preferredVoiceMode,
              preferredPacingMode: input.preferredPacingMode,
            },
          },
          motor: {
            ...createDigitalLifeFrameFixture().motor,
            stillness: 0.82,
            expressivity: 0.18,
            head: {
              ...createDigitalLifeFrameFixture().motor.head,
              nod: 0.12,
            },
            body: {
              ...createDigitalLifeFrameFixture().motor.body,
              openness: 0.26,
              settle: 0.84,
            },
          },
        }),
      })
      await nextTick()

      return {
        runtime,
        scope,
      }
    }

    const baseline = await createPreviewRuntimeWithSpeechTiming({
      preferredVoiceMode: 'even',
      preferredPacingMode: 'natural',
      variationToken: 'turn-preview-even-natural-body-behavior',
    })
    const quieter = await createPreviewRuntimeWithSpeechTiming({
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
      variationToken: 'turn-preview-lower-pressure-slower-body-behavior',
    })

    expect(baseline.runtime.state.value.activeCueSource).toBe('preview')
    expect(quieter.runtime.state.value.activeCueSource).toBe('preview')
    expect(baseline.runtime.state.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      preferredVoiceMode: 'even',
      preferredPacingMode: 'natural',
    }))
    expect(quieter.runtime.state.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))
    expect(quieter.runtime.state.value.expressionIntensity).toBeLessThanOrEqual(baseline.runtime.state.value.expressionIntensity)
    expect(quieter.runtime.state.value.actionIntensity).toBeLessThan(baseline.runtime.state.value.actionIntensity)
    expect(quieter.runtime.state.value.motor.head.nod).toBeLessThanOrEqual(baseline.runtime.state.value.motor.head.nod)
    expect(quieter.runtime.state.value.motor.body.openness).toBeLessThan(baseline.runtime.state.value.motor.body.openness)
    expect(quieter.runtime.state.value.motor.body.settle).toBeGreaterThanOrEqual(baseline.runtime.state.value.motor.body.settle)

    baseline.scope.stop()
    quieter.scope.stop()
  })

  it('does not expose preview audit text through active renderer hints', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const upcomingSpeechSegment = ref(createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-preview-renderer-continuity-refresh',
      segmentId: 'segment-preview-renderer-continuity-refresh',
      special: null,
      streamId: 'stream-preview-renderer-continuity-refresh',
      text: '我还是沿着这条线在。',
      cue: createPlaybackCueFixture({
        id: 'segment-preview-renderer-continuity-refresh',
        endOffset: 8,
        text: '我还是沿着这条线在。',
        emotion: 'thinking',
        gestureWeight: 0.22,
        facialWeight: 0.42,
        prosodyWeight: 0.3,
        beatWeight: 0.2,
        mouthWeight: 0.24,
        headWeight: 0.18,
        facialHoldMs: 320,
        actionHoldMs: 240,
        emotionHoldMs: 320,
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
          signature: 'audit:initial',
          reasonTags: ['audit:initial'],
        },
        rendererSettle: {
          live2dFacialReleaseMs: 320,
          live2dMotionFollowThroughMs: 440,
          vrmActionFadeMs: 280,
          vrmExpressionBlendMs: 360,
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
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: null,
      delivery: 'gentle',
      emphasis: 0,
    }), {
      source: 'dialogue',
      variationToken: 'turn-preview-renderer-continuity-refresh',
    })
    await nextTick()

    expect(runtime.state.value.activeCueSource).toBe('preview')
    const initialBehavior = {
      actionPulseRevision: runtime.state.value.actionPulse.revision,
      driverAuthority: runtime.state.value.driverAuthority,
      motor: runtime.state.value.motor,
      rendererSettle: runtime.state.value.activeCue?.rendererSettle,
      revision: runtime.state.value.revision,
    }
    expect(runtime.state.value.activeCue?.rendererHints?.signature).toBeUndefined()
    expect(runtime.state.value.activeCue?.rendererHints?.reasonTags).toBeUndefined()

    upcomingSpeechSegment.value = {
      ...upcomingSpeechSegment.value!,
      cue: {
        ...upcomingSpeechSegment.value!.cue!,
        rendererHints: {
          ...upcomingSpeechSegment.value!.cue!.rendererHints!,
          signature: 'audit:updated',
          reasonTags: ['audit:updated'],
        },
      },
    }
    await nextTick()

    expect(runtime.state.value.activeCue?.rendererHints?.signature).toBeUndefined()
    expect(runtime.state.value.activeCue?.rendererHints?.reasonTags).toBeUndefined()
    expect({
      actionPulseRevision: runtime.state.value.actionPulse.revision,
      driverAuthority: runtime.state.value.driverAuthority,
      motor: runtime.state.value.motor,
      rendererSettle: runtime.state.value.activeCue?.rendererSettle,
      revision: runtime.state.value.revision,
    }).toEqual(initialBehavior)

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
        text: '我先沿着这条线中性可见占位。',
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
        voice: null,
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
        voice: null,
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
      vrmActionFadeMs: 580,
      vrmExpressionBlendMs: 660,
    }))
    expect(runtime.state.value.activeCue?.rendererSettle?.live2dFacialReleaseMs ?? 0).toBeGreaterThanOrEqual(380)
    expect(runtime.state.value.activeCue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0).toBeGreaterThanOrEqual(460)
    expect(runtime.state.value.activeCue?.rendererSettle?.vrmActionFadeMs ?? 0).toBeGreaterThanOrEqual(580)
    expect(runtime.state.value.activeCue?.rendererSettle?.vrmExpressionBlendMs ?? 0).toBeGreaterThanOrEqual(660)

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
        voice: null,
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
      vrmActionFadeMs: 280,
      vrmExpressionBlendMs: 360,
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
        voice: null,
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
        voice: null,
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
        voice: null,
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
        voice: null,
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
        voice: null,
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

  it('keeps runtime authority segment on the current cue line when cue-only telemetry is all that survived and the playback item id is stale', async () => {
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-runtime-cue-only-current-line',
        segmentId: 'segment-stale-item-shell',
        special: null,
        streamId: 'stream-runtime-cue-only-current-line',
        text: '继续看这里。',
        cue: createPlaybackCueFixture({
          id: 'segment-current-cue-only-line',
          text: '继续看这里。',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          facialWeight: 0.44,
          gestureWeight: 0.2,
          mouthWeight: 0.28,
          headWeight: 0.18,
          beatWeight: 0.22,
          facialHoldMs: 320,
          actionHoldMs: 260,
          emotionHoldMs: 320,
        }),
        digitalLifeFrame: createDigitalLifeFrameFixture({
          id: 'segment-current-cue-only-line',
          text: '继续看这里。',
          settleMode: 'linger',
        }),
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.06,
    }))
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(createPlaybackTelemetryFixture({
      rendererTarget: 'vrm',
      actualDurationMs: 240,
      plannedDurationMs: 240,
      settleMs: 280,
      cue: {
        id: 'segment-current-cue-only-line',
        text: '继续看这里。',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        facialWeight: 0.44,
        gestureWeight: 0.2,
        mouthWeight: 0.28,
        headWeight: 0.18,
        beatWeight: 0.22,
        facialHoldMs: 320,
        actionHoldMs: 260,
        emotionHoldMs: 320,
      },
      drivers: {
        body: null,
        face: null,
        motion: null,
        lipsync: null,
        voice: null,
      },
    }))
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-current-cue-only-line',
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
    expect(runtime.state.value.activeCueSource).toBe('segment')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-current-cue-only-line',
    }))

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
        voice: null,
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
        voice: null,
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
        voice: null,
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
        voice: null,
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
    expect(runtime.state.value.activeCueSource).toBe('segment')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'driver:segment-runtime-prosody-only-authority',
      text: '继续看这里。',
      prosodyWeight: 0.41,
      mouthWeight: 0.33,
      headWeight: 0.26,
      actionCue: null,
      facialCue: null,
    }))

    scope.stop()
  })

  it('treats explicit voice driver telemetry as a first-class runtime same-segment lane even before caller rethreads top-level prosody authority', async () => {
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
        intentId: 'intent-runtime-explicit-voice-driver-authority',
        segmentId: 'segment-runtime-explicit-voice-driver-authority',
        special: null,
        streamId: 'stream-runtime-explicit-voice-driver-authority',
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
      prosodyAuthority: null,
      drivers: {
        body: null,
        face: null,
        lipsync: null,
        motion: null,
        voice: {
          playbackPhase: 'playing',
          continuityHoldMs: 240,
          segmentId: 'segment-runtime-explicit-voice-driver-authority',
          source: 'prosody-authority',
          provenance: 'authority-bound',
          mode: 'energy-phoneme-hybrid',
          cueProsodyWeight: 0.41,
          cueMouthWeight: 0.33,
          cueHeadWeight: 0.26,
          visemePeakWeight: 0.58,
        },
      },
    }
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-runtime-explicit-voice-driver-authority',
      rendererTarget: 'vrm',
      matchedDrivers: ['voice'],
      sources: ['prosody-authority'],
      bodySegmentMatched: false,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
      voiceSegmentMatched: true,
      prosodyAuthority: {
        segmentId: 'segment-runtime-explicit-voice-driver-authority',
        provenance: 'authority-bound',
        source: 'prosody-authority',
        mode: 'energy-phoneme-hybrid',
        cueProsodyWeight: 0.41,
        cueMouthWeight: 0.33,
        cueHeadWeight: 0.26,
        visemePeakWeight: 0.58,
      },
    })
    expect(runtime.state.value.activeCueSource).toBe('segment')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'driver:segment-runtime-explicit-voice-driver-authority',
      text: '继续看这里。',
      prosodyWeight: 0.41,
      mouthWeight: 0.33,
      headWeight: 0.26,
      actionCue: null,
      facialCue: null,
    }))

    scope.stop()
  })

  it('refreshes runtime authority when telemetry changes voice segment matching', async () => {
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
        intentId: 'intent-runtime-voice-flag-refresh',
        segmentId: 'segment-runtime-voice-flag-refresh',
        special: null,
        streamId: 'stream-runtime-voice-flag-refresh',
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
      driverAuthority: {
        segmentId: 'segment-runtime-voice-flag-refresh',
        rendererTarget: 'vrm',
        matchedDrivers: [],
        sources: [],
        bodySegmentMatched: false,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: false,
        voiceSegmentMatched: false,
        prosodyAuthority: null,
      },
      prosodyAuthority: null,
      drivers: {
        body: null,
        face: null,
        lipsync: null,
        motion: null,
        voice: null,
      },
    }
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-runtime-voice-flag-refresh',
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

    playbackTelemetry.value = {
      ...playbackTelemetry.value!,
      driverAuthority: {
        ...playbackTelemetry.value!.driverAuthority!,
        voiceSegmentMatched: true,
      },
    }
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-runtime-voice-flag-refresh',
      rendererTarget: 'vrm',
      matchedDrivers: ['voice'],
      sources: [],
      bodySegmentMatched: false,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
      voiceSegmentMatched: true,
      prosodyAuthority: null,
    })

    scope.stop()
  })

  it('replaces stale seeded voice-only authority once same-segment cue-bridged face and motion rejoin the living line', async () => {
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.12,
        cadencePulse: 0.2,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-live2d-seeded-voice-only-rejoin',
        segmentId: 'segment-live2d-seeded-voice-only-rejoin',
        special: null,
        streamId: 'stream-live2d-seeded-voice-only-rejoin',
        text: '继续看这里。',
        cue: {
          id: 'segment-live2d-seeded-voice-only-rejoin',
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
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'same-thread-continuation',
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
        segmentId: 'segment-live2d-seeded-voice-only-rejoin',
        rendererTarget: 'live2d',
        matchedDrivers: ['voice'],
        sources: ['prosody-authority'],
        bodySegmentMatched: false,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: false,
        voiceSegmentMatched: true,
        prosodyAuthority: {
          segmentId: 'segment-live2d-seeded-voice-only-rejoin',
          provenance: 'authority-bound',
          source: 'prosody-authority',
          mode: 'energy-phoneme-hybrid',
          cueProsodyWeight: 0.41,
          cueMouthWeight: 0.33,
          cueHeadWeight: 0.26,
          visemePeakWeight: 0.58,
        },
      },
      prosodyAuthority: {
        segmentId: 'segment-live2d-seeded-voice-only-rejoin',
        provenance: 'authority-bound',
        source: 'prosody-authority',
        mode: 'energy-phoneme-hybrid',
        cueProsodyWeight: 0.41,
        cueMouthWeight: 0.33,
        cueHeadWeight: 0.26,
        visemePeakWeight: 0.58,
      },
      cue: {
        id: 'segment-live2d-seeded-voice-only-rejoin',
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
        settleMode: 'linger',
      },
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.52,
          holdMs: 320,
          source: 'prosody-authority',
          confidence: 0.9,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-live2d-seeded-voice-only-rejoin',
        },
        lipsync: null,
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.41,
          holdMs: 260,
          source: 'timeline-projection',
          confidence: 0.87,
          segmentId: 'segment-live2d-seeded-voice-only-rejoin',
        },
        voice: null,
      },
    })
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-live2d-seeded-voice-only-rejoin',
      rendererTarget: 'live2d',
      matchedDrivers: ['face', 'motion', 'voice'],
      sources: ['prosody-authority', 'cue-bridge'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: false,
      voiceSegmentMatched: true,
      prosodyAuthority: {
        segmentId: 'segment-live2d-seeded-voice-only-rejoin',
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
        voice: null,
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

  it('reconstructs quieter body+lipsync continuity authority ahead of stale face and motion shells when runtime must derive the living line itself', async () => {
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.17,
        prosodyIntensity: 0.13,
        emphasisLevel: 0.11,
        cadencePulse: 0.18,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-derived-quieter-body-lipsync-authority',
        segmentId: 'segment-derived-quieter-body-lipsync-authority',
        special: null,
        streamId: 'stream-derived-quieter-body-lipsync-authority',
        text: '我先沿着这条还连着的线中性可见占位。',
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.05,
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
      rendererTarget: 'vrm',
      driverAuthority: null,
      prosodyAuthority: null,
      cue: null,
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.83,
          gazeStability: 0.75,
          breathAmplitude: 0.22,
          expressivity: 0.28,
          segmentId: 'segment-derived-quieter-body-lipsync-authority',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.46,
          holdMs: 280,
          source: 'digital-life-projection',
          confidence: 0.88,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-stale-face-shell',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: 'segment-derived-quieter-body-lipsync-authority',
          continuityHoldMs: 220,
          visemeHints: [
            { segmentId: 'segment-derived-quieter-body-lipsync-authority', viseme: 'I', weight: 0.38, source: 'prosody-authority', confidence: 0.92 },
            { segmentId: 'segment-derived-quieter-body-lipsync-authority', viseme: 'closed', weight: 0.64, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.32,
          holdMs: 220,
          source: 'timeline-projection',
          confidence: 0.86,
          segmentId: 'segment-stale-motion-shell',
        },
        voice: null,
      },
    })
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-derived-quieter-body-lipsync-authority',
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'lipsync'],
      sources: ['prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })

    scope.stop()
  })

  it('prefers the current cue and digital-life line over a stale playback item segment id when runtime reconstructs same-segment authority', async () => {
    const speechRenderState = ref(createSpeechRenderStateFixture({
      active: true,
      dynamics: {
        speechEnergy: 0.17,
        prosodyIntensity: 0.13,
        emphasisLevel: 0.11,
        cadencePulse: 0.18,
      },
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-stale-item-segment-should-not-override-current-cue-line',
        segmentId: 'segment-stale-item-shell',
        special: null,
        streamId: 'stream-stale-item-segment-should-not-override-current-cue-line',
        text: '我先沿着现在这条线继续接回来。',
        cue: createPlaybackCueFixture({
          id: 'segment-current-living-line',
          text: '我先沿着现在这条线继续接回来。',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          facialWeight: 0.46,
          gestureWeight: 0.22,
          mouthWeight: 0.3,
          headWeight: 0.2,
          beatWeight: 0.24,
          facialHoldMs: 320,
          actionHoldMs: 260,
          emotionHoldMs: 320,
        }),
        digitalLifeFrame: createDigitalLifeFrameFixture({
          id: 'segment-current-living-line',
          text: '我先沿着现在这条线继续接回来。',
          settleMode: 'linger',
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.46,
            holdMs: 320,
            rendererHints: null,
          },
          action: {
            actionCue: 'steady_focus',
            actionMode: 'hold',
            intensity: 0.22,
            holdMs: 260,
            rendererHints: null,
          },
        }),
      }),
      phase: 'playing',
      revision: 1,
      visemeIntensity: 0.05,
      articulation: {
        voice: createSpeechVoiceFixture({
          language: 'zh-CN',
          closureBias: 0.58,
          consonantPrecision: 0.82,
        }),
      },
    }))
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(createPlaybackTelemetryFixture({
      rendererTarget: 'live2d',
      actualDurationMs: 240,
      plannedDurationMs: 240,
      settleMs: 280,
      cue: {
        id: 'segment-current-living-line',
        text: '我先沿着现在这条线继续接回来。',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        facialWeight: 0.46,
        gestureWeight: 0.22,
        mouthWeight: 0.3,
        headWeight: 0.2,
        beatWeight: 0.24,
        facialHoldMs: 320,
        actionHoldMs: 260,
        emotionHoldMs: 320,
      },
      drivers: {
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.46,
          holdMs: 320,
          source: 'prosody-authority',
          confidence: 0.9,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-current-living-line',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'steady_focus',
          intensity: 0.22,
          holdMs: 260,
          source: 'timeline-projection',
          confidence: 0.87,
          segmentId: 'segment-current-living-line',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-current-living-line',
          continuityHoldMs: 220,
          visemeHints: [
            { segmentId: 'segment-current-living-line', viseme: 'I', weight: 0.38, source: 'prosody-authority', confidence: 0.92 },
            { segmentId: 'segment-current-living-line', viseme: 'closed', weight: 0.64, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
      },
    }))
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-current-living-line',
      rendererTarget: 'live2d',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'timeline-projection'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })
    expect(runtime.state.value.activeCueSource).toBe('segment')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-current-living-line',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
    }))

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
        voice: null,
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
        voice: null,
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

  it('realigns live2d face and motion after body authority has been carrying the segment', async () => {
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
        voice: null,
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
        voice: null,
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

  it('realigns live2d face and motion after body and lipsync authority have been carrying the segment', async () => {
    const speechRenderState = ref(createIdleStageEmbodimentSpeechRenderState())
    const playbackTelemetry = ref<EmbodimentPlaybackTelemetry | null>(null)
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
      playbackTelemetry,
      speechRenderState,
    }))!

    runtime.armPerformance(createPerformance(), {
      source: 'dialogue',
      variationToken: 'turn-live2d-multilane-realign',
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
        intentId: 'intent-live2d-multilane-realign',
        segmentId: 'segment-live2d-multilane-realign',
        special: null,
        streamId: 'stream-live2d-multilane-realign',
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
        segmentId: 'segment-live2d-multilane-realign',
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
          segmentId: 'segment-live2d-multilane-realign',
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
          segmentId: 'segment-live2d-multilane-realign',
          continuityHoldMs: 220,
          visemeHints: [
            { segmentId: 'segment-live2d-multilane-realign', viseme: 'A', weight: 0.46, source: 'prosody-authority', confidence: 0.93 },
            { segmentId: 'segment-live2d-multilane-realign', viseme: 'closed', weight: 0.71, source: 'prosody-authority', confidence: 0.89 },
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
        voice: null,
      },
      cue: null,
    }
    await nextTick()

    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-live2d-multilane-realign',
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
          segmentId: 'segment-live2d-multilane-realign',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.41,
          holdMs: 260,
          source: 'cue-bridge' as never,
          confidence: 0.87,
          segmentId: 'segment-live2d-multilane-realign',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-live2d-multilane-realign',
          continuityHoldMs: 220,
          visemeHints: [
            { segmentId: 'segment-live2d-multilane-realign', viseme: 'A', weight: 0.46, source: 'prosody-authority', confidence: 0.93 },
            { segmentId: 'segment-live2d-multilane-realign', viseme: 'closed', weight: 0.71, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
        voice: null,
      },
      cue: {
        id: 'segment-live2d-multilane-realign',
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
        },
      },
    }
    await nextTick()

    expect(runtime.state.value.activeCueSource).toBe('segment')
    expect(runtime.state.value.activeCue).toEqual(expect.objectContaining({
      id: 'segment-live2d-multilane-realign',
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
    expect(runtime.state.value.actionPulse.segmentId).toBe('segment-live2d-multilane-realign')
    expect(runtime.state.value.driverAuthority).toEqual({
      segmentId: 'segment-live2d-multilane-realign',
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
        voice: null,
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
        voice: null,
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
        voice: null,
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
        voice: null,
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
        voice: null,
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
        voice: null,
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
