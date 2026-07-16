import type {
  StageEmbodimentMotorState,
  StageEmbodimentPerformanceCueSource,
} from '@proj-alicization/stage-shared'

import {
  createIdleStageEmbodimentMotorState,
  createIdleStageEmbodimentPerformanceState,
  createIdleStageEmbodimentPresencePostureState,
  createIdleStageEmbodimentSpeechArticulationState,
  createIdleStageEmbodimentSpeechRenderState,
  createStageEmbodimentSpeechPlaybackItem,
} from '@proj-alicization/stage-shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const { idleEyeFocusUpdateSpy } = vi.hoisted(() => ({
  idleEyeFocusUpdateSpy: vi.fn(),
}))

vi.mock('./animation', () => ({
  useLive2DIdleEyeFocus: () => ({
    update: idleEyeFocusUpdateSpy,
  }),
}))

beforeEach(() => {
  idleEyeFocusUpdateSpy.mockClear()
})

function createMockModel(initial: Record<string, number>) {
  const values = new Map<string, number>(Object.entries(initial))

  return {
    values,
    getParameterIndex(parameterId: string) {
      return values.has(parameterId) ? 0 : -1
    },
    getParameterValueById(parameterId: string) {
      return values.get(parameterId) ?? 0
    },
    setParameterValueById(parameterId: string, value: number) {
      values.set(parameterId, value)
    },
  }
}

function createBaseModelParameters() {
  return {
    angleX: 0,
    angleY: 0,
    angleZ: 0,
    leftEyeOpen: 1,
    rightEyeOpen: 1,
    leftEyeSmile: 0,
    rightEyeSmile: 0,
    leftEyebrowLR: 0,
    rightEyebrowLR: 0,
    leftEyebrowY: 0,
    rightEyebrowY: 0,
    leftEyebrowAngle: 0,
    rightEyebrowAngle: 0,
    leftEyebrowForm: 0,
    rightEyebrowForm: 0,
    mouthOpen: 0,
    mouthForm: 0,
    cheek: 0,
    bodyAngleX: 0,
    bodyAngleY: 0,
    bodyAngleZ: 0,
    breath: 0,
  }
}

function createModelParameterIds() {
  return {
    ParamEyeLOpen: 1,
    ParamEyeROpen: 1,
    ParamEyeBallX: 0,
    ParamEyeBallY: 0,
    ParamMouthOpenY: 0,
    ParamMouthOpen: 0,
    ParamMouthForm: 0,
    ParamMouthSmile: 0,
    ParamMouthPucker: 0,
    ParamCheek: 0,
    ParamEyeSmile: 0,
    ParamEyeLSmile: 0,
    ParamEyeRSmile: 0,
    ParamBrowLY: 0,
    ParamBrowRY: 0,
    ParamBrowLAngle: 0,
    ParamBrowRAngle: 0,
    ParamBrowLForm: 0,
    ParamBrowRForm: 0,
    ParamBrowForm: 0,
    ParamAngleX: 0,
    ParamAngleY: 0,
    ParamAngleZ: 0,
    ParamBodyAngleX: 0,
    ParamBodyAngleY: 0,
    ParamBodyAngleZ: 0,
    ParamBreath: 0,
    ParamA: 0,
    ParamI: 0,
    ParamU: 0,
    ParamE: 0,
    ParamO: 0,
  }
}

function createSpeechRenderState() {
  const articulation = createIdleStageEmbodimentSpeechArticulationState()

  return {
    ...createIdleStageEmbodimentSpeechRenderState(),
    active: true,
    phase: 'playing' as const,
    playbackPhase: 'playing' as const,
    item: createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-motion',
      segmentId: 'segment-motion',
      special: null,
      streamId: 'stream-motion',
      text: '请继续说。',
    }),
    mouthOpenSize: 58,
    mouthOpenRatio: 0.58,
    visemeIntensity: 0.74,
    articulation: {
      ...articulation,
      active: true,
      progress: 0.46,
      openness: 0.68,
      jawOpen: 0.62,
      lipClosure: 0.08,
      lipSpread: 0.34,
      lipRound: 0.24,
      visemes: {
        A: 0.82,
        E: 0.18,
        I: 0.12,
        O: 0.28,
        U: 0.4,
        closed: 0.08,
      },
    },
    dynamics: {
      speechEnergy: 0.68,
      prosodyIntensity: 0.62,
      emphasisLevel: 0.44,
      cadencePulse: 0.76,
    },
  }
}

type StageEmbodimentMotorOverrides = Partial<Omit<StageEmbodimentMotorState, 'gaze' | 'head' | 'breath' | 'facial' | 'body'>> & {
  gaze?: Partial<StageEmbodimentMotorState['gaze']>
  head?: Partial<StageEmbodimentMotorState['head']>
  breath?: Partial<StageEmbodimentMotorState['breath']>
  facial?: Partial<StageEmbodimentMotorState['facial']>
  body?: Partial<StageEmbodimentMotorState['body']>
}

function createMotorProfile(overrides?: StageEmbodimentMotorOverrides) {
  const idleMotor = createIdleStageEmbodimentMotorState()

  return {
    ...idleMotor,
    ...overrides,
    gaze: {
      ...idleMotor.gaze,
      ...overrides?.gaze,
    },
    head: {
      ...idleMotor.head,
      ...overrides?.head,
    },
    breath: {
      ...idleMotor.breath,
      ...overrides?.breath,
    },
    facial: {
      ...idleMotor.facial,
      ...overrides?.facial,
    },
    body: {
      ...idleMotor.body,
      ...overrides?.body,
    },
  }
}

function createPerformanceState(input: {
  baseEmotion: 'happy' | 'angry' | 'thinking' | 'neutral'
  delivery: 'energetic' | 'firm' | 'calm'
  facialCue: string
  preferredGazeMode?: 'steady' | 'soften' | 'drift'
  preferredBlinkCadence?: 'normal' | 'linger' | 'quiet'
  residentMode?: 'dialogue' | 'measured-return' | 'repair-before-closeness' | 'quiet-companionship' | 'idle-recovering' | 'same-thread-continuation'
  motor?: ReturnType<typeof createMotorProfile>
  activeCueSource?: StageEmbodimentPerformanceCueSource
  actionIntensity?: number
  expressionIntensity?: number
  facialCueIntensity?: number
  motionPulse?: number
  rendererSettle?: {
    live2dFacialReleaseMs?: number
    live2dMotionFollowThroughMs?: number
  } | null
}) {
  const idleState = createIdleStageEmbodimentPerformanceState()
  const activeCueSource: StageEmbodimentPerformanceCueSource = input.activeCueSource ?? 'segment'

  return {
    ...idleState,
    phase: 'speaking' as const,
    speechActive: true,
    speechPhase: 'playing' as const,
    performance: {
      ...idleState.performance,
      baseEmotion: input.baseEmotion,
      emotion: input.baseEmotion,
      facialCue: input.facialCue,
      actionCue: 'observe_focus',
      delivery: input.delivery,
      emphasis: 2 as const,
    },
    activeFacialCue: input.facialCue,
    activeFacialCueSource: activeCueSource,
    activeActionCue: 'observe_focus',
    activeActionCueSource: activeCueSource,
    activeCueSource,
    activeCue: {
      id: 'segment-motion',
      index: 0,
      startOffset: 0,
      endOffset: 4,
      text: '请继续说。',
      emotion: input.baseEmotion,
      gestureWeight: 0.44,
      facialWeight: 0.58,
      prosodyWeight: 0.5,
      beatWeight: 0.44,
      mouthWeight: 0.35,
      headWeight: 0.44,
      facialHoldMs: 320,
      actionHoldMs: 220,
      emotionHoldMs: 320,
      facialCue: input.facialCue,
      actionCue: 'observe_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererSettle: input.rendererSettle ?? null,
      rendererHints: input.preferredGazeMode || input.preferredBlinkCadence || input.residentMode
        ? {
            preferredGazeMode: input.preferredGazeMode,
            preferredBlinkCadence: input.preferredBlinkCadence,
            residentMode: input.residentMode,
          }
        : null,
    },
    expressionIntensity: input.expressionIntensity ?? 0.9,
    facialCueIntensity: input.facialCueIntensity ?? 0.86,
    actionIntensity: input.actionIntensity ?? 0.64,
    motionPulse: input.motionPulse ?? 0.72,
    prosodyDrive: 0.58,
    breathDrive: 0.52,
    focusDrive: input.baseEmotion === 'thinking' ? 0.82 : 0.56,
    motor: input.motor ?? createMotorProfile(),
    updatedAt: 1_000,
  }
}

function createPluginContext(input: {
  model: ReturnType<typeof createMockModel>
  performanceState: ReturnType<typeof createPerformanceState>
  speechRenderState?: ReturnType<typeof createSpeechRenderState> | ReturnType<typeof createIdleStageEmbodimentSpeechRenderState>
}) {
  const posture = createIdleStageEmbodimentPresencePostureState()

  posture.engaged = true
  posture.mode = input.performanceState.performance.baseEmotion === 'angry'
    ? 'concerned'
    : input.performanceState.performance.baseEmotion === 'neutral'
      ? 'idle'
      : 'attentive'
  posture.confidence = input.performanceState.performance.baseEmotion === 'thinking' ? 0.76 : 0.68
  posture.bodyYaw = input.performanceState.performance.baseEmotion === 'happy' ? 0.12 : -0.08
  posture.bodyPitch = input.performanceState.performance.baseEmotion === 'angry' ? -0.06 : 0.04
  posture.breathBoost = 0.16
  posture.gazeStability = input.performanceState.performance.baseEmotion === 'thinking' ? 0.86 : 0.62

  return {
    model: input.model as never,
    now: 0,
    timeDelta: 16,
    timeDeltaSeconds: 0.016,
    hookedUpdate: undefined,
    internalModel: {
      coreModel: input.model,
      motionManager: {},
    } as never,
    live2dLipSyncExecutionState: ref({
      active: false,
      dominantViseme: null,
      dominantWeight: null,
    }),
    live2dBodyExecutionState: ref({
      settle: null,
      openness: null,
    }),
    motionManager: {} as never,
    modelParameters: ref(createBaseModelParameters()),
    live2dIdleAnimationEnabled: ref(true),
    live2dAutoBlinkEnabled: ref(true),
    live2dForceAutoBlinkEnabled: ref(false),
    performanceState: ref(input.performanceState),
    presencePosture: ref(posture),
    speechRenderState: ref(input.speechRenderState ?? createSpeechRenderState()),
    isIdleMotion: false,
    handled: false,
    markHandled() {
      this.handled = true
    },
  } as any
}

function drivePlugin(
  plugin: (ctx: any) => void,
  ctx: any,
  frames = 12,
) {
  for (let frame = 0; frame < frames; frame += 1) {
    ctx.now = 16 * (frame + 1)
    ctx.timeDelta = 16
    ctx.timeDeltaSeconds = 0.016
    ctx.handled = false
    plugin(ctx)
  }
}

function readParameter(model: ReturnType<typeof createMockModel>, parameterId: string) {
  return model.values.get(parameterId) ?? 0
}

function createPostStopSpeechRenderState(
  speechRenderState: ReturnType<typeof createSpeechRenderState>,
) {
  return {
    ...speechRenderState,
    active: false,
    phase: 'idle' as const,
    playbackPhase: 'idle' as const,
    lastEventType: 'playback-stop' as const,
    mouthOpenSize: 0,
    mouthOpenRatio: 0,
    visemeIntensity: 0,
    articulation: {
      ...speechRenderState.articulation,
      active: false,
      progress: 0,
      openness: 0,
      jawOpen: 0,
      lipClosure: 0,
      lipSpread: 0,
      lipRound: 0,
      visemes: {
        A: 0,
        E: 0,
        I: 0,
        O: 0,
        U: 0,
        closed: 0,
      },
    },
    dynamics: {
      speechEnergy: 0,
      prosodyIntensity: 0,
      emphasisLevel: 0,
      cadencePulse: 0,
    },
  }
}

function drivePluginAtTime(
  plugin: (ctx: any) => void,
  ctx: any,
  now: number,
) {
  ctx.now = now
  ctx.timeDelta = 16
  ctx.timeDeltaSeconds = 0.016
  ctx.handled = false
  plugin(ctx)
}

function drivePluginWithDelta(
  plugin: (ctx: any) => void,
  ctx: any,
  input: { now: number, timeDeltaSeconds: number },
) {
  ctx.now = input.now
  ctx.timeDelta = input.timeDeltaSeconds * 1000
  ctx.timeDeltaSeconds = input.timeDeltaSeconds
  ctx.handled = false
  plugin(ctx)
}

async function createIdleAutoBlinkRuntime(
  preferredBlinkCadence: 'normal' | 'linger' | 'quiet',
) {
  const {
    useLive2DMotionManagerUpdate,
    useMotionUpdatePluginAutoEyeBlink,
  } = await import('./motion-manager')
  const model = createMockModel(createModelParameterIds())
  const motionManager = {
    groups: {
      idle: 'Idle',
    },
    state: {
      currentGroup: 'Idle',
    },
  } as any
  const ctx = createPluginContext({
    model,
    performanceState: createPerformanceState({
      baseEmotion: 'neutral',
      delivery: 'calm',
      facialCue: 'focus',
      preferredBlinkCadence,
    }),
    speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
  })

  ctx.motionManager = motionManager
  ctx.internalModel.motionManager = motionManager

  const motionManagerUpdate = useLive2DMotionManagerUpdate({
    internalModel: ctx.internalModel,
    motionManager,
    modelParameters: ctx.modelParameters,
    live2dIdleAnimationEnabled: ctx.live2dIdleAnimationEnabled,
    live2dAutoBlinkEnabled: ctx.live2dAutoBlinkEnabled,
    live2dForceAutoBlinkEnabled: ctx.live2dForceAutoBlinkEnabled,
    performanceState: ctx.performanceState,
    presencePosture: ctx.presencePosture,
    speechRenderState: ctx.speechRenderState,
    lastUpdateTime: ref(0),
  })

  motionManagerUpdate.register(useMotionUpdatePluginAutoEyeBlink(), 'post')

  return {
    ctx,
    model,
    motionManagerUpdate,
  }
}

function advanceIdleAutoBlinkFrames(input: {
  model: ReturnType<typeof createMockModel>
  motionManagerUpdate: {
    hookUpdate: (
      model: any,
      now: number,
      hookedUpdate?: (model: any, now: number) => boolean,
    ) => boolean
  }
  frameStart: number
  frameCount: number
}) {
  let blinkObserved = false

  for (let frame = 0; frame < input.frameCount; frame += 1) {
    input.motionManagerUpdate.hookUpdate(
      input.model as any,
      1000 * (input.frameStart + frame + 1),
      () => true,
    )
    blinkObserved ||= readParameter(input.model, 'ParamEyeLOpen') < 0.95
      || readParameter(input.model, 'ParamEyeROpen') < 0.95
  }

  return blinkObserved
}

describe('live2d motion manager performance layers', () => {
  it('publishes live2d mouth execution proof while speech articulation is active', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()

    const model = createMockModel(createModelParameterIds())
    const ctx = createPluginContext({
      model,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'focus',
      }),
    })

    drivePlugin(plugin, ctx)

    expect(ctx.live2dLipSyncExecutionState.value.active).toBe(true)
    expect(ctx.live2dLipSyncExecutionState.value.dominantViseme).toBe('A')
    expect(ctx.live2dLipSyncExecutionState.value.dominantWeight).toBeGreaterThan(0.2)
    expect(ctx.live2dLipSyncExecutionState.value.segmentId).toBe('segment-motion')
  })

  it('prefers the active digital-life living line over a stale playback segment id for live2d mouth execution proof', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()
    const baseSpeech = createSpeechRenderState()

    const ctx = createPluginContext({
      model: createMockModel(createModelParameterIds()),
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
      }),
      speechRenderState: {
        ...baseSpeech,
        item: {
          ...baseSpeech.item!,
          segmentId: 'segment-stale-performance-shell',
          cue: {
            ...baseSpeech.item!.cue!,
            id: 'segment-current-living-line',
          },
          digitalLifeFrame: {
            id: 'segment-current-living-line',
          } as any,
        },
      },
    })

    drivePlugin(plugin, ctx)

    expect(ctx.live2dLipSyncExecutionState.value.segmentId).toBe('segment-current-living-line')
  })

  it('keeps the aligned playback living line over a stale cue shell for live2d mouth execution proof', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()
    const baseSpeech = createSpeechRenderState()

    const ctx = createPluginContext({
      model: createMockModel(createModelParameterIds()),
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
      }),
      speechRenderState: {
        ...baseSpeech,
        item: {
          ...baseSpeech.item!,
          segmentId: 'segment-current-living-line',
          cue: {
            ...baseSpeech.item!.cue!,
            id: 'turn-stale-cue-shell:0',
          },
          digitalLifeFrame: null,
        },
      },
    })

    drivePlugin(plugin, ctx)

    expect(ctx.live2dLipSyncExecutionState.value.segmentId).toBe('segment-current-living-line')
  })

  it('falls back to the active digital-life frame living line when live2d mouth execution loses explicit cue authority', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()
    const baseSpeech = createSpeechRenderState()

    const ctx = createPluginContext({
      model: createMockModel(createModelParameterIds()),
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
      }),
      speechRenderState: {
        ...baseSpeech,
        item: {
          ...baseSpeech.item!,
          segmentId: '   ',
          cue: {
            ...baseSpeech.item!.cue!,
            id: '   ',
          },
          digitalLifeFrame: {
            id: 'segment-current-frame-line',
          } as any,
        },
      },
    })

    drivePlugin(plugin, ctx)

    expect(ctx.live2dLipSyncExecutionState.value.segmentId).toBe('segment-current-frame-line')
  })

  it('separates happy, angry, and thinking emotional drive into distinct facial/body parameters', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()

    const happyModel = createMockModel(createModelParameterIds())
    const angryModel = createMockModel(createModelParameterIds())
    const thinkingModel = createMockModel(createModelParameterIds())

    drivePlugin(plugin, createPluginContext({
      model: happyModel,
      performanceState: createPerformanceState({
        baseEmotion: 'happy',
        delivery: 'energetic',
        facialCue: 'bright-smile',
        motor: createMotorProfile({
          facial: {
            eyeOpenness: 0.64,
            browLift: 0.08,
            browTension: 0.18,
            cheekLift: 0.34,
            mouthSpread: 0.4,
            mouthRound: 0.16,
            jawOpenBias: 0.3,
          },
          body: {
            sway: 0.12,
            lean: -0.08,
            openness: 0.74,
            settle: 0.44,
          },
        }),
      }),
    }))
    drivePlugin(plugin, createPluginContext({
      model: angryModel,
      performanceState: createPerformanceState({
        baseEmotion: 'angry',
        delivery: 'firm',
        facialCue: 'brow-furrow',
        motor: createMotorProfile({
          facial: {
            eyeOpenness: 0.42,
            browLift: -0.14,
            browTension: 0.56,
            cheekLift: 0.04,
            mouthSpread: 0.08,
            mouthRound: 0.12,
            jawOpenBias: 0.24,
          },
          body: {
            sway: -0.08,
            lean: 0.22,
            openness: 0.28,
            settle: 0.82,
          },
        }),
      }),
    }))
    drivePlugin(plugin, createPluginContext({
      model: thinkingModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'focus',
        motor: createMotorProfile({
          gaze: {
            focus: 0.88,
            stability: 0.9,
            azimuth: -0.18,
            elevation: -0.12,
          },
          facial: {
            eyeOpenness: 0.52,
            browLift: 0.12,
            browTension: 0.34,
            cheekLift: 0.1,
            mouthSpread: 0.12,
            mouthRound: 0.42,
            jawOpenBias: 0.2,
          },
          body: {
            sway: 0.04,
            lean: -0.04,
            openness: 0.46,
            settle: 0.76,
          },
        }),
      }),
    }))

    expect(readParameter(happyModel, 'ParamMouthSmile')).toBeGreaterThan(0.2)
    expect(readParameter(happyModel, 'ParamCheek')).toBeGreaterThan(readParameter(angryModel, 'ParamCheek'))
    expect(readParameter(happyModel, 'ParamEyeSmile')).toBeGreaterThan(readParameter(angryModel, 'ParamEyeSmile'))
    expect(readParameter(happyModel, 'ParamBodyAngleZ')).toBeGreaterThan(0)

    expect(readParameter(angryModel, 'ParamMouthForm')).toBeLessThan(0)
    expect(readParameter(angryModel, 'ParamBrowLY')).toBeLessThan(readParameter(happyModel, 'ParamBrowLY'))
    expect(readParameter(angryModel, 'ParamBrowForm')).toBeLessThan(0)
    expect(readParameter(angryModel, 'ParamBodyAngleY')).toBeGreaterThan(0)

    expect(readParameter(thinkingModel, 'ParamEyeBallX')).toBeLessThan(0)
    expect(readParameter(thinkingModel, 'ParamAngleY')).toBeGreaterThan(readParameter(happyModel, 'ParamAngleY'))
  })

  it('mirrors mouth openness into alternate Live2D lip parameters when the model exposes them', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()
    const model = createMockModel(createModelParameterIds())
    const ctx = createPluginContext({
      model,
      performanceState: createPerformanceState({
        baseEmotion: 'happy',
        delivery: 'energetic',
        facialCue: 'bright-smile',
      }),
      speechRenderState: {
        ...createSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          active: true,
          progress: 0.62,
          openness: 0.78,
          jawOpen: 0.72,
          lipClosure: 0.02,
          lipSpread: 0.42,
          lipRound: 0.34,
          visemes: {
            A: 0.74,
            E: 0.22,
            I: 0.16,
            O: 0.46,
            U: 0.58,
            closed: 0.02,
          },
          voice: null,
        },
      },
    })

    drivePlugin(plugin, ctx, 14)

    expect(readParameter(model, 'ParamMouthOpen')).toBeGreaterThan(0.25)
    expect(readParameter(model, 'ParamMouthOpen')).toBeCloseTo(readParameter(model, 'ParamMouthOpenY'), 5)
    expect(readParameter(model, 'ParamMouthSmile')).toBeGreaterThan(0.16)
    expect(readParameter(model, 'ParamMouthPucker')).toBeGreaterThan(0.18)
    expect(readParameter(model, 'ParamU')).toBeGreaterThan(0.2)
    expect(readParameter(model, 'ParamO')).toBeGreaterThan(0.08)
  })

  it('publishes runtime body execution state from the same motor-driven body line used by the renderer', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const model = createMockModel({
      ...createModelParameterIds(),
      ...createBaseModelParameters(),
    })
    const ctx = createPluginContext({
      model,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
        motor: createMotorProfile({
          body: {
            openness: 0.74,
            settle: 0.44,
            sway: 0.18,
            lean: -0.16,
          },
        }),
      }),
    })

    const plugin = useMotionUpdatePluginPerformanceLayers()
    drivePlugin(plugin, ctx, 12)

    expect(ctx.live2dBodyExecutionState.value).toEqual({
      openness: expect.any(Number),
      settle: expect.any(Number),
    })
    expect(ctx.live2dBodyExecutionState.value.openness).toBeGreaterThan(0.6)
    expect(ctx.live2dBodyExecutionState.value.settle).toBeLessThan(0.6)
  })

  it('preserves model-native expression baselines instead of flattening them back to store defaults', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()
    const model = createMockModel({
      ...createModelParameterIds(),
      ParamMouthSmile: 0.46,
      ParamCheek: 0.24,
      ParamBrowForm: -0.34,
      ParamBodyAngleZ: 4.8,
    })
    const ctx = createPluginContext({
      model,
      performanceState: createPerformanceState({
        baseEmotion: 'neutral',
        delivery: 'calm',
        facialCue: 'relaxed',
        motor: createMotorProfile({
          facial: {
            eyeOpenness: 0.52,
            browLift: 0,
            browTension: 0.1,
            cheekLift: 0.04,
            mouthSpread: 0.08,
            mouthRound: 0.16,
            jawOpenBias: 0.08,
          },
          body: {
            sway: 0.02,
            lean: 0,
            openness: 0.38,
            settle: 0.84,
          },
        }),
      }),
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
    })

    drivePlugin(plugin, ctx, 16)

    expect(readParameter(model, 'ParamMouthSmile')).toBeGreaterThan(0.34)
    expect(readParameter(model, 'ParamCheek')).toBeGreaterThan(0.18)
    expect(readParameter(model, 'ParamBrowForm')).toBeLessThan(-0.22)
    expect(readParameter(model, 'ParamBodyAngleZ')).toBeGreaterThan(3.8)
  })

  it('renders stronger face and body overlays for segment-grade cues than resident-grade cues with the same labels', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()
    const segmentModel = createMockModel(createModelParameterIds())
    const residentModel = createMockModel(createModelParameterIds())

    drivePlugin(plugin, createPluginContext({
      model: segmentModel,
      performanceState: createPerformanceState({
        baseEmotion: 'happy',
        delivery: 'energetic',
        facialCue: 'bright-smile',
        activeCueSource: 'segment',
        expressionIntensity: 0.92,
        facialCueIntensity: 0.88,
        actionIntensity: 0.76,
        motionPulse: 0.78,
        motor: createMotorProfile({
          facial: {
            eyeOpenness: 0.64,
            browLift: 0.1,
            browTension: 0.18,
            cheekLift: 0.34,
            mouthSpread: 0.42,
            mouthRound: 0.12,
            jawOpenBias: 0.32,
          },
          body: {
            sway: 0.14,
            lean: -0.08,
            openness: 0.78,
            settle: 0.42,
          },
        }),
      }),
    }))

    drivePlugin(plugin, createPluginContext({
      model: residentModel,
      performanceState: createPerformanceState({
        baseEmotion: 'happy',
        delivery: 'energetic',
        facialCue: 'bright-smile',
        activeCueSource: 'resident',
        expressionIntensity: 0.28,
        facialCueIntensity: 0.18,
        actionIntensity: 0.12,
        motionPulse: 0.18,
        motor: createMotorProfile({
          facial: {
            eyeOpenness: 0.64,
            browLift: 0.1,
            browTension: 0.18,
            cheekLift: 0.34,
            mouthSpread: 0.42,
            mouthRound: 0.12,
            jawOpenBias: 0.32,
          },
          body: {
            sway: 0.14,
            lean: -0.08,
            openness: 0.78,
            settle: 0.42,
          },
        }),
      }),
    }))

    expect(readParameter(segmentModel, 'ParamMouthSmile')).toBeGreaterThan(readParameter(residentModel, 'ParamMouthSmile'))
    expect(readParameter(segmentModel, 'ParamCheek')).toBeGreaterThan(readParameter(residentModel, 'ParamCheek'))
    expect(readParameter(segmentModel, 'ParamBodyAngleZ')).toBeGreaterThan(readParameter(residentModel, 'ParamBodyAngleZ'))
    expect(readParameter(segmentModel, 'ParamBodyAngleX')).toBeGreaterThan(readParameter(residentModel, 'ParamBodyAngleX'))
  })

  it('softens and loosens gaze differently based on preferred gaze mode hints', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()
    const steadyModel = createMockModel(createModelParameterIds())
    const softenModel = createMockModel(createModelParameterIds())
    const driftModel = createMockModel(createModelParameterIds())

    const motor = createMotorProfile({
      gaze: {
        focus: 0.82,
        stability: 0.66,
        azimuth: 0.32,
        elevation: -0.18,
      },
      facial: {
        eyeOpenness: 0.58,
      },
    })

    drivePlugin(plugin, createPluginContext({
      model: steadyModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'focus',
        preferredGazeMode: 'steady',
        motor,
      }),
    }))
    drivePlugin(plugin, createPluginContext({
      model: softenModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'focus',
        preferredGazeMode: 'soften',
        motor,
      }),
    }))
    drivePlugin(plugin, createPluginContext({
      model: driftModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'focus',
        preferredGazeMode: 'drift',
        motor,
      }),
    }))

    expect(Math.abs(readParameter(softenModel, 'ParamEyeBallX'))).toBeLessThan(Math.abs(readParameter(driftModel, 'ParamEyeBallX')))
    expect(Math.abs(readParameter(softenModel, 'ParamEyeBallY'))).toBeLessThan(Math.abs(readParameter(driftModel, 'ParamEyeBallY')))
    expect(readParameter(softenModel, 'ParamEyeLOpen')).toBeLessThan(readParameter(steadyModel, 'ParamEyeLOpen'))
  })

  it('maps blink and gaze micro-motion hints into stable Live2D bias presets', async () => {
    const { resolveLive2DAutoBlinkDelayRange, resolveLive2DGazeModeBias, resolveLive2DSpeechFacialNuance } = await import('./motion-manager')

    expect(resolveLive2DAutoBlinkDelayRange({
      preferredBlinkCadence: 'linger',
    })).toEqual({
      minDelayMs: 4200,
      maxDelayMs: 9200,
    })

    expect(resolveLive2DGazeModeBias({
      preferredGazeMode: 'soften',
    })).toEqual({
      azimuthScale: 0.88,
      elevationScale: 0.9,
      stabilityBias: 0.08,
      eyeOpenScale: -0.08,
    })

    expect(resolveLive2DGazeModeBias({
      preferredGazeMode: 'drift',
    })).toEqual({
      azimuthScale: 1.08,
      elevationScale: 1.04,
      stabilityBias: -0.1,
      eyeOpenScale: -0.04,
    })

    expect(resolveLive2DGazeModeBias({
      preferredGazeMode: 'steady',
    })).toEqual({
      azimuthScale: 0.94,
      elevationScale: 0.96,
      stabilityBias: 0.12,
      eyeOpenScale: 0,
    })

    expect(resolveLive2DSpeechFacialNuance({
      speechEnergy: 0.7,
      prosodyIntensity: 0.6,
      cadencePulse: 0.5,
    }).cheekBias).toBeCloseTo(0.033, 6)
    expect(resolveLive2DSpeechFacialNuance({
      speechEnergy: 0.7,
      prosodyIntensity: 0.6,
      cadencePulse: 0.5,
    }).eyeSmileBias).toBeCloseTo(0.059, 6)
    expect(resolveLive2DSpeechFacialNuance({
      speechEnergy: 0.7,
      prosodyIntensity: 0.6,
      cadencePulse: 0.5,
    }).mouthSmileBias).toBeCloseTo(0.068, 6)
    expect(resolveLive2DSpeechFacialNuance({
      speechEnergy: 0.7,
      prosodyIntensity: 0.6,
      cadencePulse: 0.5,
    }).eyeOpenScaleBias).toBeCloseTo(-0.02016, 6)
  })

  it('holds a steadier and quieter post-utterance baseline when durable relationship rhythm combines steady gaze with quiet blink cadence', async () => {
    const { resolveLive2DAutoBlinkDelayRange, resolveLive2DGazeModeBias } = await import('./motion-manager')

    const steadyQuietBlink = resolveLive2DAutoBlinkDelayRange({
      preferredBlinkCadence: 'quiet',
    })
    const steadyGaze = resolveLive2DGazeModeBias({
      preferredGazeMode: 'steady',
    })
    const softenLingerBlink = resolveLive2DAutoBlinkDelayRange({
      preferredBlinkCadence: 'linger',
    })
    const softenGaze = resolveLive2DGazeModeBias({
      preferredGazeMode: 'soften',
    })

    expect(steadyQuietBlink.minDelayMs).toBeGreaterThan(softenLingerBlink.minDelayMs)
    expect(steadyQuietBlink.maxDelayMs).toBeGreaterThan(softenLingerBlink.maxDelayMs)
    expect(steadyGaze.stabilityBias).toBeGreaterThan(softenGaze.stabilityBias)
    expect(steadyGaze.azimuthScale).toBeGreaterThan(softenGaze.azimuthScale)
    expect(steadyGaze.elevationScale).toBeGreaterThan(softenGaze.elevationScale)
  })

  it('keeps repair-before-closeness same-her body+voice blink cadence quieter than an otherwise equally softened ordinary repair return', async () => {
    const { resolveLive2DAutoBlinkDelayRange } = await import('./motion-manager')

    const ordinaryRepairBlink = resolveLive2DAutoBlinkDelayRange({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
    })
    const sameHerRepairBlink = resolveLive2DAutoBlinkDelayRange({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      reasonTags: ['embodiment:body+voice-only'],
    })

    expect(sameHerRepairBlink.minDelayMs).toBeGreaterThan(ordinaryRepairBlink.minDelayMs)
    expect(sameHerRepairBlink.maxDelayMs).toBeGreaterThan(ordinaryRepairBlink.maxDelayMs)
  })

  it('keeps repair-before-closeness same-her body+voice gaze bias steadier than an otherwise equally softened ordinary repair return', async () => {
    const { resolveLive2DGazeModeBias } = await import('./motion-manager')

    const ordinaryRepairGaze = resolveLive2DGazeModeBias({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    })
    const sameHerRepairGaze = resolveLive2DGazeModeBias({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      reasonTags: ['embodiment:body+voice-only'],
    })

    expect(sameHerRepairGaze.stabilityBias).toBeGreaterThan(ordinaryRepairGaze.stabilityBias)
    expect(sameHerRepairGaze.azimuthScale).toBeLessThan(ordinaryRepairGaze.azimuthScale)
    expect(sameHerRepairGaze.elevationScale).toBeLessThan(ordinaryRepairGaze.elevationScale)
  })

  it('keeps measured-return still-voiced face-and-motion blink cadence quieter than an otherwise equally softened ordinary measured-return return', async () => {
    const { resolveLive2DAutoBlinkDelayRange } = await import('./motion-manager')

    const ordinaryMeasuredReturnBlink = resolveLive2DAutoBlinkDelayRange({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    })
    const sameHerMeasuredReturnBlink = resolveLive2DAutoBlinkDelayRange({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'resident|main-runtime|embodiment:still_voiced_face_motion_line|lane=face+motion+voice-only',
      reasonTags: ['embodiment:still_voiced_face_motion_line'],
    })

    expect(sameHerMeasuredReturnBlink.minDelayMs).toBeGreaterThan(ordinaryMeasuredReturnBlink.minDelayMs)
    expect(sameHerMeasuredReturnBlink.maxDelayMs).toBeGreaterThan(ordinaryMeasuredReturnBlink.maxDelayMs)
  })

  it('keeps measured-return still-voiced face-and-motion gaze bias steadier than an otherwise equally softened ordinary measured-return return', async () => {
    const { resolveLive2DGazeModeBias } = await import('./motion-manager')

    const ordinaryMeasuredReturnGaze = resolveLive2DGazeModeBias({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    })
    const sameHerMeasuredReturnGaze = resolveLive2DGazeModeBias({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'resident|main-runtime|embodiment:still_voiced_face_motion_line|lane=face+motion+voice-only',
      reasonTags: ['embodiment:still_voiced_face_motion_line'],
    })

    expect(sameHerMeasuredReturnGaze.stabilityBias).toBeGreaterThan(ordinaryMeasuredReturnGaze.stabilityBias)
    expect(sameHerMeasuredReturnGaze.azimuthScale).toBeLessThan(ordinaryMeasuredReturnGaze.azimuthScale)
    expect(sameHerMeasuredReturnGaze.elevationScale).toBeLessThan(ordinaryMeasuredReturnGaze.elevationScale)
  })

  it('keeps stronger speech prosody compatible with the same base cue labels while facial nuance bias stays well-formed', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()
    const quietModel = createMockModel(createModelParameterIds())
    const vividModel = createMockModel(createModelParameterIds())

    drivePlugin(plugin, createPluginContext({
      model: quietModel,
      performanceState: createPerformanceState({
        baseEmotion: 'happy',
        delivery: 'calm',
        facialCue: 'soft-gaze',
      }),
      speechRenderState: {
        ...createSpeechRenderState(),
        dynamics: {
          speechEnergy: 0.18,
          prosodyIntensity: 0.14,
          emphasisLevel: 0.1,
          cadencePulse: 0.16,
        },
      },
    }))

    drivePlugin(plugin, createPluginContext({
      model: vividModel,
      performanceState: createPerformanceState({
        baseEmotion: 'happy',
        delivery: 'calm',
        facialCue: 'soft-gaze',
      }),
      speechRenderState: {
        ...createSpeechRenderState(),
        dynamics: {
          speechEnergy: 0.72,
          prosodyIntensity: 0.68,
          emphasisLevel: 0.38,
          cadencePulse: 0.58,
        },
      },
    }))

    expect(readParameter(vividModel, 'ParamMouthOpen')).toBeGreaterThanOrEqual(0)
    expect(readParameter(quietModel, 'ParamMouthOpen')).toBeGreaterThanOrEqual(0)
  })

  it('keeps scripted live2d mouth continuity alive through post-stop frames when continuityHoldMs extends the continuity state', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const defaultPlugin = useMotionUpdatePluginPerformanceLayers()
    const extendedPlugin = useMotionUpdatePluginPerformanceLayers()
    const defaultModel = createMockModel(createModelParameterIds())
    const extendedModel = createMockModel(createModelParameterIds())

    const defaultSpeech = createSpeechRenderState()
    const extendedSpeech = {
      ...defaultSpeech,
      item: defaultSpeech.item
        ? {
            ...defaultSpeech.item,
            continuityHoldMs: 320,
          }
        : null,
    }

    const defaultCtx = createPluginContext({
      model: defaultModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
        activeCueSource: 'resident',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        residentMode: 'same-thread-continuation',
      }),
      speechRenderState: defaultSpeech,
    })
    const extendedCtx = createPluginContext({
      model: extendedModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
        activeCueSource: 'resident',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        residentMode: 'same-thread-continuation',
      }),
      speechRenderState: extendedSpeech,
    })

    drivePlugin(defaultPlugin, defaultCtx, 8)
    drivePlugin(extendedPlugin, extendedCtx, 8)

    defaultCtx.speechRenderState.value = createPostStopSpeechRenderState(defaultSpeech)
    extendedCtx.speechRenderState.value = createPostStopSpeechRenderState(extendedSpeech as ReturnType<typeof createSpeechRenderState>)

    drivePluginWithDelta(defaultPlugin, defaultCtx, { now: 180, timeDeltaSeconds: 0.1 })
    drivePluginWithDelta(extendedPlugin, extendedCtx, { now: 180, timeDeltaSeconds: 0.1 })
    drivePluginWithDelta(defaultPlugin, defaultCtx, { now: 280, timeDeltaSeconds: 0.1 })
    drivePluginWithDelta(extendedPlugin, extendedCtx, { now: 280, timeDeltaSeconds: 0.1 })
    drivePluginWithDelta(defaultPlugin, defaultCtx, { now: 380, timeDeltaSeconds: 0.1 })
    drivePluginWithDelta(extendedPlugin, extendedCtx, { now: 380, timeDeltaSeconds: 0.1 })

    expect(readParameter(extendedModel, 'ParamMouthOpen')).toBeGreaterThan(readParameter(defaultModel, 'ParamMouthOpen'))
  })

  it('keeps same-thread richer still-voiced face-and-mouth carry a little more alive on the live2d mouth line than the plainer still-voiced face line', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plainPlugin = useMotionUpdatePluginPerformanceLayers()
    const richerPlugin = useMotionUpdatePluginPerformanceLayers()
    const plainModel = createMockModel(createModelParameterIds())
    const richerModel = createMockModel(createModelParameterIds())

    const plainSpeech = createSpeechRenderState()
    const richerSpeech = {
      ...plainSpeech,
      item: plainSpeech.item ? { ...plainSpeech.item } : null,
    }

    const plainCtx = createPluginContext({
      model: plainModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
        activeCueSource: 'resident',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        residentMode: 'same-thread-continuation',
      }),
      speechRenderState: plainSpeech as ReturnType<typeof createSpeechRenderState>,
    })
    const richerCtx = createPluginContext({
      model: richerModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
        activeCueSource: 'resident',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        residentMode: 'same-thread-continuation',
      }),
      speechRenderState: richerSpeech as ReturnType<typeof createSpeechRenderState>,
    })

    plainCtx.performanceState.value = {
      ...plainCtx.performanceState.value,
      activeCue: {
        ...plainCtx.performanceState.value.activeCue,
        rendererHints: {
          ...plainCtx.performanceState.value.activeCue.rendererHints,
          reasonTags: ['embodiment:still-voiced-face-line'],
          residentMode: 'same-thread-continuation',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      },
    }
    richerCtx.performanceState.value = {
      ...richerCtx.performanceState.value,
      activeCue: {
        ...richerCtx.performanceState.value.activeCue,
        rendererHints: {
          ...richerCtx.performanceState.value.activeCue.rendererHints,
          reasonTags: ['embodiment:still-voiced-face-lipsync-line'],
          residentMode: 'same-thread-continuation',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-lipsync-line|lane=face+lipsync+voice-only',
        },
      },
    }

    drivePlugin(plainPlugin, plainCtx, 8)
    drivePlugin(richerPlugin, richerCtx, 8)

    plainCtx.speechRenderState.value = createPostStopSpeechRenderState(plainSpeech as ReturnType<typeof createSpeechRenderState>)
    richerCtx.speechRenderState.value = createPostStopSpeechRenderState(richerSpeech as ReturnType<typeof createSpeechRenderState>)

    drivePluginWithDelta(plainPlugin, plainCtx, { now: 180, timeDeltaSeconds: 0.1 })
    drivePluginWithDelta(richerPlugin, richerCtx, { now: 180, timeDeltaSeconds: 0.1 })
    drivePluginWithDelta(plainPlugin, plainCtx, { now: 280, timeDeltaSeconds: 0.1 })
    drivePluginWithDelta(richerPlugin, richerCtx, { now: 280, timeDeltaSeconds: 0.1 })
    drivePluginWithDelta(plainPlugin, plainCtx, { now: 380, timeDeltaSeconds: 0.1 })
    drivePluginWithDelta(richerPlugin, richerCtx, { now: 380, timeDeltaSeconds: 0.1 })

    expect(readParameter(richerModel, 'ParamMouthOpen')).toBeGreaterThan(readParameter(plainModel, 'ParamMouthOpen'))
  })

  it('extends the live2d mouth carry on the same living segment when stopping upgrades from a still-voiced face line into a richer face-and-mouth continuity line', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plainPlugin = useMotionUpdatePluginPerformanceLayers()
    const upgradedPlugin = useMotionUpdatePluginPerformanceLayers()
    const plainModel = createMockModel(createModelParameterIds())
    const upgradedModel = createMockModel(createModelParameterIds())

    const createSameSegmentSpeech = () => ({
      ...createSpeechRenderState(),
      item: {
        ...createSpeechRenderState().item!,
        segmentId: 'segment-live2d-same-line-upgrade',
        cue: {
          ...createSpeechRenderState().item!.cue!,
          id: 'segment-live2d-same-line-upgrade',
        },
        digitalLifeFrame: {
          ...createSpeechRenderState().item!.digitalLifeFrame,
          id: 'segment-live2d-same-line-upgrade',
        },
      },
    })

    const plainSpeech = createSameSegmentSpeech()
    const upgradedSpeech = createSameSegmentSpeech()

    const plainCtx = createPluginContext({
      model: plainModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
        activeCueSource: 'resident',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        residentMode: 'same-thread-continuation',
      }),
      speechRenderState: plainSpeech as ReturnType<typeof createSpeechRenderState>,
    })
    const upgradedCtx = createPluginContext({
      model: upgradedModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
        activeCueSource: 'resident',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        residentMode: 'same-thread-continuation',
      }),
      speechRenderState: upgradedSpeech as ReturnType<typeof createSpeechRenderState>,
    })

    plainCtx.performanceState.value = {
      ...plainCtx.performanceState.value,
      activeCue: {
        ...plainCtx.performanceState.value.activeCue,
        rendererHints: {
          ...plainCtx.performanceState.value.activeCue.rendererHints,
          reasonTags: ['embodiment:still-voiced-face-line'],
          residentMode: 'same-thread-continuation',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      },
    }
    upgradedCtx.performanceState.value = {
      ...upgradedCtx.performanceState.value,
      activeCue: {
        ...upgradedCtx.performanceState.value.activeCue,
        rendererHints: {
          ...upgradedCtx.performanceState.value.activeCue.rendererHints,
          reasonTags: ['embodiment:still-voiced-face-line'],
          residentMode: 'same-thread-continuation',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      },
    }

    drivePlugin(plainPlugin, plainCtx, 8)
    drivePlugin(upgradedPlugin, upgradedCtx, 8)

    plainCtx.speechRenderState.value = createPostStopSpeechRenderState(plainSpeech as ReturnType<typeof createSpeechRenderState>)
    upgradedCtx.speechRenderState.value = createPostStopSpeechRenderState(upgradedSpeech as ReturnType<typeof createSpeechRenderState>)
    upgradedCtx.performanceState.value = {
      ...upgradedCtx.performanceState.value,
      activeCue: {
        ...upgradedCtx.performanceState.value.activeCue,
        rendererHints: {
          ...upgradedCtx.performanceState.value.activeCue.rendererHints,
          reasonTags: ['embodiment:still-voiced-face-lipsync-line'],
          residentMode: 'same-thread-continuation',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-lipsync-line|lane=face+lipsync+voice-only',
        },
      },
    }

    drivePluginWithDelta(plainPlugin, plainCtx, { now: 180, timeDeltaSeconds: 0.08 })
    drivePluginWithDelta(upgradedPlugin, upgradedCtx, { now: 180, timeDeltaSeconds: 0.08 })

    expect(readParameter(upgradedModel, 'ParamMouthOpen')).toBeGreaterThan(readParameter(plainModel, 'ParamMouthOpen'))
    expect(upgradedCtx.live2dLipSyncExecutionState.value.segmentId).toBe('segment-live2d-same-line-upgrade')
  })

  it('keeps the live2d mouth carry segment pinned to the speech line that actually started it even after later authority metadata arrives', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()
    const model = createMockModel(createModelParameterIds())
    const baseSpeech = createSpeechRenderState()
    const speech = {
      ...baseSpeech,
      item: baseSpeech.item
        ? {
            ...baseSpeech.item,
            continuityHoldMs: 320,
          }
        : null,
    }
    const ctx = createPluginContext({
      model,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
        activeCueSource: 'resident',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        residentMode: 'same-thread-continuation',
      }),
      speechRenderState: speech,
    })

    drivePlugin(plugin, ctx, 8)

    ctx.speechRenderState.value = createPostStopSpeechRenderState(speech as ReturnType<typeof createSpeechRenderState>)
    ctx.performanceState.value = {
      ...ctx.performanceState.value,
      activeSegment: {
        intentId: 'intent-later-authority-line',
        streamId: 'stream-later-authority-line',
        segmentId: 'segment-later-authority-line',
        ownerId: 'alice',
        text: '继续看这里。',
        special: null,
        continuityHoldMs: 340,
        playbackDurationMs: 260,
        metadata: null,
        cue: null,
        digitalLifeFrame: null,
      },
      driverAuthority: {
        segmentId: 'segment-later-authority-line',
        rendererTarget: 'live2d',
        matchedDrivers: ['face', 'motion', 'lipsync'],
        sources: ['segment-carry'],
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      },
    }

    drivePluginWithDelta(plugin, ctx, { now: 180, timeDeltaSeconds: 0.1 })

    expect(ctx.live2dLipSyncExecutionState.value.active).toBe(true)
    expect(ctx.live2dLipSyncExecutionState.value.segmentId).toBe('segment-motion')
  })

  it('keeps long-release companionship facial overlays softer for preview-grade carry than direct segment delivery', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()
    const segmentModel = createMockModel(createModelParameterIds())
    const previewCarryModel = createMockModel(createModelParameterIds())

    drivePlugin(plugin, createPluginContext({
      model: segmentModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
        activeCueSource: 'segment',
        expressionIntensity: 0.82,
        facialCueIntensity: 0.78,
        actionIntensity: 0.22,
        motionPulse: 0.18,
        rendererSettle: {
          live2dFacialReleaseMs: 860,
        },
        motor: createMotorProfile({
          facial: {
            eyeOpenness: 0.54,
            browLift: -0.04,
            browTension: 0.34,
            cheekLift: 0.1,
            mouthSpread: 0.16,
            mouthRound: 0.28,
            jawOpenBias: 0.18,
          },
        }),
      }),
    }))

    drivePlugin(plugin, createPluginContext({
      model: previewCarryModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
        activeCueSource: 'preview',
        expressionIntensity: 0.82,
        facialCueIntensity: 0.78,
        actionIntensity: 0.22,
        motionPulse: 0.18,
        rendererSettle: {
          live2dFacialReleaseMs: 860,
        },
        motor: createMotorProfile({
          facial: {
            eyeOpenness: 0.54,
            browLift: -0.04,
            browTension: 0.34,
            cheekLift: 0.1,
            mouthSpread: 0.16,
            mouthRound: 0.28,
            jawOpenBias: 0.18,
          },
        }),
      }),
    }))

    expect(readParameter(previewCarryModel, 'ParamCheek')).toBeLessThan(readParameter(segmentModel, 'ParamCheek'))
    expect(readParameter(previewCarryModel, 'ParamEyeSmile')).toBeLessThan(readParameter(segmentModel, 'ParamEyeSmile'))
    expect(Math.abs(readParameter(previewCarryModel, 'ParamBrowLY'))).toBeLessThan(Math.abs(readParameter(segmentModel, 'ParamBrowLY')))
  })

  it('keeps durable measured-return facial release steadier than ordinary measured-return when steady gaze pairs with quiet blink cadence', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()
    const ordinaryModel = createMockModel(createModelParameterIds())
    const durableModel = createMockModel(createModelParameterIds())

    const motor = createMotorProfile({
      facial: {
        eyeOpenness: 0.54,
        browLift: -0.04,
        browTension: 0.34,
        cheekLift: 0.1,
        mouthSpread: 0.16,
        mouthRound: 0.28,
        jawOpenBias: 0.18,
      },
    })

    drivePlugin(plugin, createPluginContext({
      model: ordinaryModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
        activeCueSource: 'resident',
        expressionIntensity: 0.82,
        facialCueIntensity: 0.78,
        actionIntensity: 0.22,
        motionPulse: 0.18,
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
        residentMode: 'measured-return',
        rendererSettle: {
          live2dFacialReleaseMs: 860,
        },
        motor,
      }),
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
    }))

    drivePlugin(plugin, createPluginContext({
      model: durableModel,
      performanceState: createPerformanceState({
        baseEmotion: 'thinking',
        delivery: 'calm',
        facialCue: 'soft-gaze',
        activeCueSource: 'resident',
        expressionIntensity: 0.82,
        facialCueIntensity: 0.78,
        actionIntensity: 0.22,
        motionPulse: 0.18,
        preferredGazeMode: 'steady',
        preferredBlinkCadence: 'quiet',
        residentMode: 'measured-return',
        rendererSettle: {
          live2dFacialReleaseMs: 860,
        },
        motor,
      }),
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
    }))

    expect(readParameter(durableModel, 'ParamCheek')).toBeLessThan(readParameter(ordinaryModel, 'ParamCheek'))
    expect(readParameter(durableModel, 'ParamEyeSmile')).toBeLessThan(readParameter(ordinaryModel, 'ParamEyeSmile'))
    expect(Math.abs(readParameter(durableModel, 'ParamBrowLY'))).toBeLessThan(Math.abs(readParameter(ordinaryModel, 'ParamBrowLY')))
  })

  it('extends the live2d facial release window when stopping raises renderer settle on the same active cue', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginPerformanceLayers()
    const model = createMockModel(createModelParameterIds())
    const performanceState = createPerformanceState({
      baseEmotion: 'thinking',
      delivery: 'calm',
      facialCue: 'soft-gaze',
      activeCueSource: 'segment',
      expressionIntensity: 0.82,
      facialCueIntensity: 0.78,
      actionIntensity: 0.22,
      motionPulse: 0.18,
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      residentMode: 'repair-before-closeness',
      rendererSettle: {
        live2dFacialReleaseMs: 220,
      },
      motor: createMotorProfile({
        facial: {
          eyeOpenness: 0.54,
          browLift: -0.04,
          browTension: 0.34,
          cheekLift: 0.1,
          mouthSpread: 0.16,
          mouthRound: 0.28,
          jawOpenBias: 0.18,
        },
      }),
    })
    const ctx = createPluginContext({
      model,
      performanceState,
      speechRenderState: createSpeechRenderState(),
    })

    drivePlugin(plugin, ctx, 1)
    const beforeStopCheek = readParameter(model, 'ParamCheek')

    ctx.now = 260
    ctx.timeDelta = 16
    ctx.timeDeltaSeconds = 0.016
    ctx.handled = false
    ctx.performanceState.value = {
      ...ctx.performanceState.value,
      activeCue: {
        ...ctx.performanceState.value.activeCue,
        rendererSettle: {
          live2dFacialReleaseMs: 860,
        },
      },
    }
    ctx.speechRenderState.value = {
      ...ctx.speechRenderState.value,
      phase: 'stopping',
      playbackPhase: 'idle',
      lastEventType: 'playback-stop',
    }
    plugin(ctx)
    const duringExtendedStopCheek = readParameter(model, 'ParamCheek')

    ctx.now = 520
    ctx.timeDelta = 16
    ctx.timeDeltaSeconds = 0.016
    ctx.handled = false
    plugin(ctx)
    const lateExtendedStopCheek = readParameter(model, 'ParamCheek')

    expect(duringExtendedStopCheek).toBeGreaterThan(0)
    expect(lateExtendedStopCheek).toBeGreaterThan(0)
    expect(lateExtendedStopCheek).toBeGreaterThanOrEqual(beforeStopCheek * 0.35)
  })

  it('refreshes the live2d facial release window before expiry fallback when identity-continuity', async () => {
    const { useMotionUpdatePluginPerformanceLayers } = await import('./motion-manager')
    const controlPlugin = useMotionUpdatePluginPerformanceLayers()
    const refreshedPlugin = useMotionUpdatePluginPerformanceLayers()
    const createBaselinePerformanceState = () => createPerformanceState({
      baseEmotion: 'thinking',
      delivery: 'calm',
      facialCue: 'soft-gaze',
      activeCueSource: 'segment',
      expressionIntensity: 0.82,
      facialCueIntensity: 0.78,
      actionIntensity: 0.22,
      motionPulse: 0.18,
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      residentMode: 'repair-before-closeness',
      rendererSettle: {
        live2dFacialReleaseMs: 220,
      },
      motor: createMotorProfile({
        facial: {
          eyeOpenness: 0.54,
          browLift: -0.04,
          browTension: 0.34,
          cheekLift: 0.1,
          mouthSpread: 0.16,
          mouthRound: 0.28,
          jawOpenBias: 0.18,
        },
      }),
    })
    const controlModel = createMockModel(createModelParameterIds())
    const refreshedModel = createMockModel(createModelParameterIds())
    const controlCtx = createPluginContext({
      model: controlModel,
      performanceState: createBaselinePerformanceState(),
      speechRenderState: createSpeechRenderState(),
    })
    const refreshedCtx = createPluginContext({
      model: refreshedModel,
      performanceState: createBaselinePerformanceState(),
      speechRenderState: createSpeechRenderState(),
    })

    drivePlugin(controlPlugin, controlCtx, 12)
    drivePlugin(refreshedPlugin, refreshedCtx, 12)

    controlCtx.speechRenderState.value = createPostStopSpeechRenderState(controlCtx.speechRenderState.value)
    refreshedCtx.speechRenderState.value = createPostStopSpeechRenderState(refreshedCtx.speechRenderState.value)
    refreshedCtx.performanceState.value = {
      ...refreshedCtx.performanceState.value,
      activeCue: {
        ...refreshedCtx.performanceState.value.activeCue,
        rendererHints: {
          ...refreshedCtx.performanceState.value.activeCue.rendererHints,
          signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
          reasonTags: ['embodiment:body+voice-only'],
        },
        rendererSettle: {
          live2dFacialReleaseMs: 860,
        },
      },
    }

    for (const now of [208, 224, 240]) {
      drivePluginAtTime(controlPlugin, controlCtx, now)
      drivePluginAtTime(refreshedPlugin, refreshedCtx, now)
    }

    const controlPostExpiryCheek = readParameter(controlModel, 'ParamCheek')
    const refreshedPostExpiryCheek = readParameter(refreshedModel, 'ParamCheek')

    expect(refreshedPostExpiryCheek).toBeGreaterThan(controlPostExpiryCheek + 0.01)
  })
})

describe('live2d auto blink authority', () => {
  it('keeps the first idle fallback blink quieter when quiet cadence is already active', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

    try {
      const quietRuntime = await createIdleAutoBlinkRuntime('quiet')
      const normalRuntime = await createIdleAutoBlinkRuntime('normal')

      const quietBlinkObserved = advanceIdleAutoBlinkFrames({
        model: quietRuntime.model,
        motionManagerUpdate: quietRuntime.motionManagerUpdate,
        frameStart: 0,
        frameCount: 40,
      })
      const normalBlinkObserved = advanceIdleAutoBlinkFrames({
        model: normalRuntime.model,
        motionManagerUpdate: normalRuntime.motionManagerUpdate,
        frameStart: 0,
        frameCount: 40,
      })

      expect(normalBlinkObserved).toBe(true)
      expect(quietBlinkObserved).toBe(false)
    }
    finally {
      randomSpy.mockRestore()
    }
  })

  it('realigns the idle fallback blink timer when cadence shifts from normal to quiet before a blink fires', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

    try {
      const shiftedRuntime = await createIdleAutoBlinkRuntime('normal')
      const controlRuntime = await createIdleAutoBlinkRuntime('normal')

      const shiftedBlinkObservedBeforeCadenceShift = advanceIdleAutoBlinkFrames({
        model: shiftedRuntime.model,
        motionManagerUpdate: shiftedRuntime.motionManagerUpdate,
        frameStart: 0,
        frameCount: 10,
      })
      const controlBlinkObservedBeforeCadenceShift = advanceIdleAutoBlinkFrames({
        model: controlRuntime.model,
        motionManagerUpdate: controlRuntime.motionManagerUpdate,
        frameStart: 0,
        frameCount: 10,
      })

      expect(shiftedBlinkObservedBeforeCadenceShift).toBe(false)
      expect(controlBlinkObservedBeforeCadenceShift).toBe(false)

      shiftedRuntime.ctx.performanceState.value = {
        ...shiftedRuntime.ctx.performanceState.value,
        activeCue: {
          ...shiftedRuntime.ctx.performanceState.value.activeCue,
          rendererHints: {
            ...shiftedRuntime.ctx.performanceState.value.activeCue.rendererHints,
            preferredBlinkCadence: 'quiet',
          },
        },
      }

      const shiftedBlinkObservedAfterCadenceShift = advanceIdleAutoBlinkFrames({
        model: shiftedRuntime.model,
        motionManagerUpdate: shiftedRuntime.motionManagerUpdate,
        frameStart: 10,
        frameCount: 17,
      })
      const controlBlinkObservedAfterCadenceShift = advanceIdleAutoBlinkFrames({
        model: controlRuntime.model,
        motionManagerUpdate: controlRuntime.motionManagerUpdate,
        frameStart: 10,
        frameCount: 17,
      })

      expect(controlBlinkObservedAfterCadenceShift).toBe(true)
      expect(shiftedBlinkObservedAfterCadenceShift).toBe(false)
    }
    finally {
      randomSpy.mockRestore()
    }
  })

  it('keeps fallback auto blink alive through the real motion-manager hook when idle motion is still the only active line', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

    try {
      const {
        useLive2DMotionManagerUpdate,
        useMotionUpdatePluginAutoEyeBlink,
      } = await import('./motion-manager')
      const model = createMockModel(createModelParameterIds())
      const motionManager = {
        groups: {
          idle: 'Idle',
        },
        state: {
          currentGroup: 'Idle',
        },
      } as any
      const ctx = createPluginContext({
        model,
        performanceState: createPerformanceState({
          baseEmotion: 'neutral',
          delivery: 'calm',
          facialCue: 'focus',
        }),
        speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      })

      ctx.motionManager = motionManager
      ctx.internalModel.motionManager = motionManager

      const motionManagerUpdate = useLive2DMotionManagerUpdate({
        internalModel: ctx.internalModel,
        motionManager,
        modelParameters: ctx.modelParameters,
        live2dIdleAnimationEnabled: ctx.live2dIdleAnimationEnabled,
        live2dAutoBlinkEnabled: ctx.live2dAutoBlinkEnabled,
        live2dForceAutoBlinkEnabled: ctx.live2dForceAutoBlinkEnabled,
        performanceState: ctx.performanceState,
        presencePosture: ctx.presencePosture,
        speechRenderState: ctx.speechRenderState,
        lastUpdateTime: ref(0),
      })

      motionManagerUpdate.register(useMotionUpdatePluginAutoEyeBlink(), 'post')

      let fallbackBlinkObserved = false
      for (let frame = 0; frame < 40; frame += 1) {
        motionManagerUpdate.hookUpdate(model as never, 1000 * (frame + 1), () => true)
        fallbackBlinkObserved ||= readParameter(model, 'ParamEyeLOpen') < 0.95
          || readParameter(model, 'ParamEyeROpen') < 0.95
      }

      expect(fallbackBlinkObserved).toBe(true)
    }
    finally {
      randomSpy.mockRestore()
    }
  })

  it('maps preferred blink cadence into quieter or more lingering auto-blink delay ranges', async () => {
    const { resolveLive2DAutoBlinkDelayRange } = await import('./motion-manager')

    expect(resolveLive2DAutoBlinkDelayRange({
      preferredBlinkCadence: 'linger',
    })).toEqual({
      minDelayMs: 4200,
      maxDelayMs: 9200,
    })

    expect(resolveLive2DAutoBlinkDelayRange({
      preferredBlinkCadence: 'quiet',
    })).toEqual({
      minDelayMs: 5200,
      maxDelayMs: 11000,
    })

    expect(resolveLive2DAutoBlinkDelayRange({
      preferredBlinkCadence: 'normal',
    })).toEqual({
      minDelayMs: 3000,
      maxDelayMs: 8000,
    })
  })

  it('passes same-her idle gaze bias through the idle focus plugin while the idle motion line is carrying embodiment', async () => {
    const {
      resolveLive2DGazeModeBias,
      useMotionUpdatePluginIdleFocus,
    } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginIdleFocus()
    const ctx = createPluginContext({
      model: createMockModel(createModelParameterIds()),
      performanceState: createPerformanceState({
        baseEmotion: 'neutral',
        delivery: 'calm',
        facialCue: 'focus',
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'quiet',
        residentMode: 'repair-before-closeness',
      }),
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
    })
    const expectedBias = resolveLive2DGazeModeBias({
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'quiet',
      residentMode: 'repair-before-closeness',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      reasonTags: ['embodiment:body+voice-only'],
    })

    ctx.isIdleMotion = true
    ctx.performanceState.value = {
      ...ctx.performanceState.value,
      activeCue: {
        ...ctx.performanceState.value.activeCue,
        rendererHints: {
          ...ctx.performanceState.value.activeCue.rendererHints,
          signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
          reasonTags: ['embodiment:body+voice-only'],
        },
      },
    }

    plugin(ctx)

    expect(idleEyeFocusUpdateSpy).toHaveBeenCalledWith(
      ctx.internalModel,
      ctx.now,
      expect.objectContaining(expectedBias),
    )
  })

  it('passes same-her idle gaze bias through the idle-disable fallback before stopping idle motion', async () => {
    const {
      resolveLive2DGazeModeBias,
      useMotionUpdatePluginIdleDisable,
    } = await import('./motion-manager')
    const plugin = useMotionUpdatePluginIdleDisable()
    const stopAllMotions = vi.fn()
    const updateParameters = vi.fn()
    const ctx = createPluginContext({
      model: createMockModel(createModelParameterIds()),
      performanceState: createPerformanceState({
        baseEmotion: 'neutral',
        delivery: 'calm',
        facialCue: 'focus',
        preferredGazeMode: 'steady',
        preferredBlinkCadence: 'quiet',
        residentMode: 'repair-before-closeness',
      }),
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
    })
    const expectedBias = resolveLive2DGazeModeBias({
      preferredGazeMode: 'steady',
      preferredBlinkCadence: 'quiet',
      residentMode: 'repair-before-closeness',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      reasonTags: ['embodiment:body+voice-only'],
    })

    ctx.isIdleMotion = true
    ctx.live2dIdleAnimationEnabled.value = false
    ctx.motionManager.stopAllMotions = stopAllMotions
    ctx.internalModel.eyeBlink = {
      updateParameters,
    } as any
    ctx.performanceState.value = {
      ...ctx.performanceState.value,
      activeCue: {
        ...ctx.performanceState.value.activeCue,
        rendererHints: {
          ...ctx.performanceState.value.activeCue.rendererHints,
          signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
          reasonTags: ['embodiment:body+voice-only'],
        },
      },
    }

    plugin(ctx)

    expect(stopAllMotions).toHaveBeenCalledTimes(1)
    expect(idleEyeFocusUpdateSpy).toHaveBeenCalledWith(
      ctx.internalModel,
      ctx.now,
      expect.objectContaining(expectedBias),
    )
    expect(updateParameters).toHaveBeenCalledTimes(1)
    expect(ctx.handled).toBe(true)
  })
})
