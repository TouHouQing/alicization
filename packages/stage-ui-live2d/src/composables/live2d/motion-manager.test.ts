import {
  createIdleStageEmbodimentMotorState,
  createIdleStageEmbodimentPerformanceState,
  createIdleStageEmbodimentPresencePostureState,
  createIdleStageEmbodimentSpeechArticulationState,
  createIdleStageEmbodimentSpeechRenderState,
  createStageEmbodimentSpeechPlaybackItem,
} from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

vi.mock('./animation', () => ({
  useLive2DIdleEyeFocus: () => ({
    update: vi.fn(),
  }),
}))

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

function createMotorProfile(overrides?: Partial<ReturnType<typeof createIdleStageEmbodimentMotorState>>) {
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
  motor?: ReturnType<typeof createMotorProfile>
}) {
  const idleState = createIdleStageEmbodimentPerformanceState()

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
    activeFacialCueSource: 'segment' as const,
    activeActionCue: 'observe_focus',
    activeActionCueSource: 'segment' as const,
    activeCueSource: 'segment' as const,
    expressionIntensity: 0.9,
    facialCueIntensity: 0.86,
    actionIntensity: 0.64,
    motionPulse: 0.72,
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

describe('live2d motion manager performance layers', () => {
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
})
