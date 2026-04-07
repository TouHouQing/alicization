import type {
  StageEmbodimentPerformanceState,
  StageEmbodimentPresencePostureState,
  StageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import type { Cubism4InternalModel, InternalModel } from 'pixi-live2d-display/cubism4'
import type { Ref } from 'vue'

import type { BeatSyncController } from './beat-sync'

import { useLive2DIdleEyeFocus } from './animation'
import { resolveLive2DFacialCueDrive } from './facial-cue'
import { normalizeMotionDeltaSeconds } from './motion-time'
import { createLive2DSpeechContinuityState, resolveLive2DSpeechContinuity } from './performance-continuity'

type CubismModel = Cubism4InternalModel['coreModel']
type CubismEyeBlink = Cubism4InternalModel['eyeBlink']
type Live2DModelParameters = Record<string, number>

export type PixiLive2DInternalModel = InternalModel & {
  eyeBlink?: CubismEyeBlink
  coreModel: CubismModel
}

export interface MotionManagerUpdateContext {
  model: CubismModel
  now: number
  timeDelta: number
  timeDeltaSeconds: number
  hookedUpdate?: (model: CubismModel, now: number) => boolean
}

export type MotionManagerPluginContext = MotionManagerUpdateContext & {
  internalModel: PixiLive2DInternalModel
  motionManager: PixiLive2DInternalModel['motionManager']
  modelParameters: Ref<Live2DModelParameters>
  live2dIdleAnimationEnabled: Ref<boolean>
  live2dAutoBlinkEnabled: Ref<boolean>
  live2dForceAutoBlinkEnabled: Ref<boolean>
  performanceState: Ref<StageEmbodimentPerformanceState | null | undefined>
  presencePosture: Ref<StageEmbodimentPresencePostureState | null | undefined>
  speechRenderState: Ref<StageEmbodimentSpeechRenderState | null | undefined>
  isIdleMotion: boolean
  handled: boolean
  markHandled: () => void
}

export type MotionManagerPlugin = (ctx: MotionManagerPluginContext) => void

export interface UseLive2DMotionManagerUpdateOptions {
  internalModel: PixiLive2DInternalModel
  motionManager: PixiLive2DInternalModel['motionManager']
  modelParameters: Ref<Live2DModelParameters>
  live2dIdleAnimationEnabled: Ref<boolean>
  live2dAutoBlinkEnabled: Ref<boolean>
  live2dForceAutoBlinkEnabled: Ref<boolean>
  performanceState: Ref<StageEmbodimentPerformanceState | null | undefined>
  presencePosture: Ref<StageEmbodimentPresencePostureState | null | undefined>
  speechRenderState: Ref<StageEmbodimentSpeechRenderState | null | undefined>
  lastUpdateTime: Ref<number>
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0

  return Math.min(1, Math.max(0, value))
}

function clampRange(value: number, min: number, max: number) {
  if (!Number.isFinite(value))
    return min

  return Math.min(max, Math.max(min, value))
}

function resolveSmoothingRateFromDurationMs(
  durationMs: number | null | undefined,
  fallback: number,
  bounds: { min: number, max: number },
) {
  if (!Number.isFinite(durationMs))
    return fallback

  return clampRange(1000 / Math.max(1, Number(durationMs)), bounds.min, bounds.max)
}

function resolveCurrentMotionGroupId(motionManager: PixiLive2DInternalModel['motionManager']) {
  return motionManager.state.currentGroup
}

function resolveIsIdleMotion(motionManager: PixiLive2DInternalModel['motionManager']) {
  const currentGroup = resolveCurrentMotionGroupId(motionManager)
  const idleGroup = motionManager.groups.idle
  const selectedRuntimeMotionGroup = typeof localStorage !== 'undefined'
    ? localStorage.getItem('selected-runtime-motion-group')
    : null
  const selectedRuntimeMatch = selectedRuntimeMotionGroup != null
    && String(currentGroup) === selectedRuntimeMotionGroup

  return currentGroup == null
    || currentGroup === idleGroup
    || selectedRuntimeMatch
}

function runPlugins(
  plugins: MotionManagerPlugin[],
  ctx: MotionManagerPluginContext,
  options: { stopWhenHandled: boolean },
) {
  for (const plugin of plugins) {
    if (options.stopWhenHandled && ctx.handled)
      break
    plugin(ctx)
  }
}

export function useLive2DMotionManagerUpdate(options: UseLive2DMotionManagerUpdateOptions) {
  const {
    internalModel,
    motionManager,
    modelParameters,
    live2dIdleAnimationEnabled,
    live2dAutoBlinkEnabled,
    live2dForceAutoBlinkEnabled,
    performanceState,
    presencePosture,
    speechRenderState,
    lastUpdateTime,
  } = options

  const prePlugins: MotionManagerPlugin[] = []
  const postPlugins: MotionManagerPlugin[] = []

  function register(plugin: MotionManagerPlugin, stage: 'pre' | 'post' = 'pre') {
    if (stage === 'pre')
      prePlugins.push(plugin)
    else
      postPlugins.push(plugin)
  }

  function hookUpdate(model: CubismModel, now: number, hookedUpdate?: (model: CubismModel, now: number) => boolean) {
    const rawTimeDelta = lastUpdateTime.value ? now - lastUpdateTime.value : 0
    const timeDeltaSeconds = normalizeMotionDeltaSeconds(rawTimeDelta)
    const isIdleMotion = resolveIsIdleMotion(motionManager)

    const ctx: MotionManagerPluginContext = {
      model,
      now,
      timeDelta: rawTimeDelta,
      timeDeltaSeconds,
      hookedUpdate,
      internalModel,
      motionManager,
      modelParameters,
      live2dIdleAnimationEnabled,
      live2dAutoBlinkEnabled,
      live2dForceAutoBlinkEnabled,
      performanceState,
      presencePosture,
      speechRenderState,
      isIdleMotion,
      handled: false,
      markHandled: () => {
        ctx.handled = true
      },
    }

    runPlugins(prePlugins, ctx, { stopWhenHandled: true })

    if (!ctx.handled && ctx.hookedUpdate) {
      const result = ctx.hookedUpdate.call(motionManager, model, now)
      if (result)
        ctx.handled = true
    }

    // NOTICE: post plugins keep running even if a pre plugin handled the core update.
    // This guarantees speech/lipsync and expressive overlays stay alive while idle motions are disabled.
    runPlugins(postPlugins, ctx, { stopWhenHandled: false })

    lastUpdateTime.value = now
    return ctx.handled
  }

  return {
    register,
    hookUpdate,
  }
}

// -- Plugins ---------------------------------------------------------------

export function useMotionUpdatePluginBeatSync(beatSync: BeatSyncController): MotionManagerPlugin {
  return (ctx) => {
    beatSync.updateTargets(ctx.now)

    // Semi-implicit Euler approach
    const stiffness = 120 // Higher -> Snappier
    const damping = 16 // Higher -> Less bounce
    const mass = 1
    const dt = clampRange(ctx.timeDeltaSeconds, 0, 0.1)

    if (dt <= 0)
      return

    let paramAngleX = ctx.model.getParameterValueById('ParamAngleX') as number
    let paramAngleY = ctx.model.getParameterValueById('ParamAngleY') as number
    let paramAngleZ = ctx.model.getParameterValueById('ParamAngleZ') as number

    // X
    {
      const target = beatSync.targetX.value
      const pos = paramAngleX
      const vel = beatSync.velocityX.value
      const accel = (stiffness * (target - pos) - damping * vel) / mass
      beatSync.velocityX.value = vel + accel * dt
      paramAngleX = pos + beatSync.velocityX.value * dt

      if (Math.abs(target - paramAngleX) < 0.01 && Math.abs(beatSync.velocityX.value) < 0.01) {
        paramAngleX = target
        beatSync.velocityX.value = 0
      }
    }

    // Y
    {
      const target = beatSync.targetY.value
      const pos = paramAngleY
      const vel = beatSync.velocityY.value
      const accel = (stiffness * (target - pos) - damping * vel) / mass
      beatSync.velocityY.value = vel + accel * dt
      paramAngleY = pos + beatSync.velocityY.value * dt

      if (Math.abs(target - paramAngleY) < 0.01 && Math.abs(beatSync.velocityY.value) < 0.01) {
        paramAngleY = target
        beatSync.velocityY.value = 0
      }
    }

    // Z
    {
      const target = beatSync.targetZ.value
      const pos = paramAngleZ
      const vel = beatSync.velocityZ.value
      const accel = (stiffness * (target - pos) - damping * vel) / mass
      beatSync.velocityZ.value = vel + accel * dt
      paramAngleZ = pos + beatSync.velocityZ.value * dt

      if (Math.abs(target - paramAngleZ) < 0.01 && Math.abs(beatSync.velocityZ.value) < 0.01) {
        paramAngleZ = target
        beatSync.velocityZ.value = 0
      }
    }

    ctx.model.setParameterValueById('ParamAngleX', paramAngleX)
    ctx.model.setParameterValueById('ParamAngleY', paramAngleY)
    ctx.model.setParameterValueById('ParamAngleZ', paramAngleZ)
  }
}

export function useMotionUpdatePluginIdleDisable(idleEyeFocus = useLive2DIdleEyeFocus()): MotionManagerPlugin {
  return (ctx) => {
    if (ctx.handled)
      return

    if (!ctx.live2dIdleAnimationEnabled.value && ctx.isIdleMotion) {
      ctx.motionManager.stopAllMotions()

      // Still update eye focus and blink even if idle motion is stopped.
      idleEyeFocus.update(ctx.internalModel, ctx.now)
      if (ctx.internalModel.eyeBlink != null) {
        ctx.internalModel.eyeBlink.updateParameters(
          ctx.model,
          clampRange(ctx.timeDeltaSeconds, 0, 0.12),
        )
      }

      // Apply manual eye parameters after auto eye blink.
      ctx.model.setParameterValueById('ParamEyeLOpen', clamp01(ctx.modelParameters.value.leftEyeOpen))
      ctx.model.setParameterValueById('ParamEyeROpen', clamp01(ctx.modelParameters.value.rightEyeOpen))

      ctx.markHandled()
    }
  }
}

export function useMotionUpdatePluginIdleFocus(idleEyeFocus = useLive2DIdleEyeFocus()): MotionManagerPlugin {
  return (ctx) => {
    if (!ctx.isIdleMotion || ctx.handled)
      return

    idleEyeFocus.update(ctx.internalModel, ctx.now)
  }
}

export function useMotionUpdatePluginAutoEyeBlink(): MotionManagerPlugin {
  const blinkState = {
    phase: 'idle' as 'idle' | 'closing' | 'opening',
    progress: 0,
    startLeft: 1,
    startRight: 1,
    delayMs: 0,
  }
  const blinkCloseDuration = 200 // ms
  const blinkOpenDuration = 200 // ms
  const minDelay = 3000
  const maxDelay = 8000

  function resetBlinkState() {
    blinkState.phase = 'idle'
    blinkState.progress = 0
    blinkState.delayMs = minDelay + Math.random() * (maxDelay - minDelay)
  }
  resetBlinkState()

  function easeOutQuad(t: number) {
    return 1 - (1 - t) * (1 - t)
  }

  function easeInQuad(t: number) {
    return t * t
  }

  function updateForcedBlink(dtMs: number, baseLeft: number, baseRight: number) {
    if (blinkState.phase === 'idle') {
      blinkState.delayMs = Math.max(0, blinkState.delayMs - dtMs)
      if (blinkState.delayMs === 0) {
        blinkState.phase = 'closing'
        blinkState.progress = 0
        blinkState.startLeft = baseLeft
        blinkState.startRight = baseRight
      }

      return { eyeLOpen: baseLeft, eyeROpen: baseRight }
    }

    if (blinkState.phase === 'closing') {
      blinkState.progress = Math.min(1, blinkState.progress + dtMs / blinkCloseDuration)
      const eased = easeOutQuad(blinkState.progress)
      const eyeLOpen = clamp01(blinkState.startLeft * (1 - eased))
      const eyeROpen = clamp01(blinkState.startRight * (1 - eased))

      if (blinkState.progress >= 1) {
        blinkState.phase = 'opening'
        blinkState.progress = 0
      }

      return { eyeLOpen, eyeROpen }
    }

    blinkState.progress = Math.min(1, blinkState.progress + dtMs / blinkOpenDuration)
    const eased = easeInQuad(blinkState.progress)
    const eyeLOpen = clamp01(blinkState.startLeft * eased)
    const eyeROpen = clamp01(blinkState.startRight * eased)

    if (blinkState.progress >= 1)
      resetBlinkState()

    return { eyeLOpen, eyeROpen }
  }

  return (ctx) => {
    if (!ctx.isIdleMotion || ctx.handled)
      return

    const baseLeft = clamp01(ctx.modelParameters.value.leftEyeOpen)
    const baseRight = clamp01(ctx.modelParameters.value.rightEyeOpen)

    if (!ctx.live2dAutoBlinkEnabled.value) {
      resetBlinkState()
      ctx.model.setParameterValueById('ParamEyeLOpen', baseLeft)
      ctx.model.setParameterValueById('ParamEyeROpen', baseRight)
      ctx.markHandled()
      return
    }

    if (ctx.live2dForceAutoBlinkEnabled.value || !ctx.internalModel.eyeBlink) {
      const dtMs = Math.max(1, clampRange(ctx.timeDeltaSeconds, 0, 0.12) * 1000)
      const { eyeLOpen, eyeROpen } = updateForcedBlink(dtMs, baseLeft, baseRight)

      ctx.model.setParameterValueById('ParamEyeLOpen', eyeLOpen)
      ctx.model.setParameterValueById('ParamEyeROpen', eyeROpen)
      ctx.markHandled()
      return
    }

    ctx.internalModel.eyeBlink.updateParameters(
      ctx.model,
      clampRange(ctx.timeDeltaSeconds, 0, 0.12),
    )

    const blinkLeft = ctx.model.getParameterValueById('ParamEyeLOpen') as number
    const blinkRight = ctx.model.getParameterValueById('ParamEyeROpen') as number

    ctx.model.setParameterValueById('ParamEyeLOpen', clamp01(blinkLeft * baseLeft))
    ctx.model.setParameterValueById('ParamEyeROpen', clamp01(blinkRight * baseRight))

    ctx.markHandled()
  }
}

export function useMotionUpdatePluginPerformanceLayers(): MotionManagerPlugin {
  const smoothState: Record<string, number> = {}
  const parameterSupportCache = new Map<string, boolean>()
  const speechContinuityState = createLive2DSpeechContinuityState()
  // Keep the last runtime-authored facial release window alive briefly after a cue clears.
  const rendererSettleState = {
    facialReleaseMs: 0,
    facialReleaseUntil: 0,
  }

  function supportsParameter(model: CubismModel, parameterId: string) {
    const cached = parameterSupportCache.get(parameterId)
    if (cached != null)
      return cached

    try {
      const index = model.getParameterIndex(parameterId)
      const supported = Number.isInteger(index) && index >= 0
      if (supported) {
        parameterSupportCache.set(parameterId, true)
        return true
      }
    }
    catch {
      // fallback to direct read below
    }

    try {
      const value = model.getParameterValueById(parameterId)
      const supported = Number.isFinite(Number(value))
      parameterSupportCache.set(parameterId, supported)
      return supported
    }
    catch {
      parameterSupportCache.set(parameterId, false)
      return false
    }
  }

  function smoothValue(key: string, target: number, deltaSeconds: number, options?: { attack?: number, release?: number }) {
    const from = smoothState[key] ?? target
    const attack = options?.attack ?? 18
    const release = options?.release ?? 10
    const smoothing = 1 - Math.exp(-(target > from ? attack : release) * deltaSeconds)
    const next = from + (target - from) * smoothing
    smoothState[key] = next
    return next
  }

  return (ctx) => {
    const dt = clampRange(ctx.timeDeltaSeconds, 1 / 240, 0.1)
    const speech = ctx.speechRenderState.value
    const performanceState = ctx.performanceState.value
    const embodiedPerformance = performanceState?.performance
    const posture = ctx.presencePosture.value
    const params = ctx.modelParameters.value
    const runtimeFacialReleaseMs = Number(performanceState?.activeCue?.rendererSettle?.live2dFacialReleaseMs ?? 0)
    if (runtimeFacialReleaseMs > 0 && performanceState?.activeCueSource !== 'none') {
      rendererSettleState.facialReleaseMs = runtimeFacialReleaseMs
      rendererSettleState.facialReleaseUntil = ctx.now + runtimeFacialReleaseMs
    }
    else if (ctx.now >= rendererSettleState.facialReleaseUntil) {
      rendererSettleState.facialReleaseMs = 0
      rendererSettleState.facialReleaseUntil = 0
    }
    const activeFacialReleaseMs = rendererSettleState.facialReleaseUntil > ctx.now
      ? rendererSettleState.facialReleaseMs
      : 0
    const facialReleaseRate = resolveSmoothingRateFromDurationMs(
      activeFacialReleaseMs,
      10,
      { min: 1.4, max: 12 },
    )

    const speechContinuity = resolveLive2DSpeechContinuity(speechContinuityState, {
      deltaSeconds: dt,
      speechActive: speech?.active === true,
      speechEnergy: clamp01(speech?.dynamics.speechEnergy ?? 0),
      speechPhase: speech?.phase,
      visemeIntensity: clamp01(speech?.visemeIntensity ?? 0),
    })

    const speechActive = speechContinuity.active
    const speechCue = speech?.item?.cue ?? null
    const mouthOpenRatio = clamp01(speech?.mouthOpenRatio ?? 0)
    const speechEnergy = clamp01(Math.max(
      speech?.dynamics.speechEnergy ?? 0,
      speechContinuity.drive * 0.76,
    ))
    const prosodyIntensity = clamp01(Math.max(
      speech?.dynamics.prosodyIntensity ?? 0,
      speechContinuity.drive * 0.5,
    ))
    const emphasisLevel = clamp01(Math.max(
      speech?.dynamics.emphasisLevel ?? 0,
      speechContinuity.drive * 0.35,
    ))
    const cadencePulse = clamp01(speech?.dynamics.cadencePulse ?? 0)
    const cadenceCentered = cadencePulse * 2 - 1
    const cueMouthWeight = clamp01(speechCue?.mouthWeight ?? prosodyIntensity)
    const cueHeadWeight = clamp01(speechCue?.headWeight ?? 0)

    const postureConfidence = posture?.engaged ? clamp01(posture.confidence) : 0
    const postureYaw = clampRange((posture?.bodyYaw ?? 0) * postureConfidence, -1, 1)
    const posturePitch = clampRange((posture?.bodyPitch ?? 0) * postureConfidence, -1, 1)
    const postureBreath = clamp01(posture?.breathBoost ?? 0)

    const attentivePresence = posture?.mode === 'attentive' ? postureConfidence : 0
    const hesitantPresence = posture?.mode === 'hesitant' ? postureConfidence : 0
    const concernedPresence = posture?.mode === 'concerned' ? postureConfidence : 0
    const inspectionPresence = posture?.mode === 'inspection' ? postureConfidence : 0
    const expressionDrive = clamp01(performanceState?.expressionIntensity ?? 0)
    const facialCueDrive = clamp01(performanceState?.facialCueIntensity ?? expressionDrive)
    const actionDrive = clamp01(performanceState?.actionIntensity ?? 0)
    const focusDrive = clamp01(performanceState?.focusDrive ?? 0)
    const breathDrive = clamp01(performanceState?.breathDrive ?? 0)
    const performancePulse = clamp01(performanceState?.motionPulse ?? 0)
    const prosodyDrive = clamp01(Math.max(
      performanceState?.prosodyDrive ?? 0,
      prosodyIntensity,
    ))
    const facialCueDriveProfile = resolveLive2DFacialCueDrive(
      embodiedPerformance?.facialCue,
      facialCueDrive,
    )

    let emotionSmileBias = 0
    let emotionCheekBias = 0
    let emotionMouthBias = 0
    let emotionBrowBias = 0
    let emotionBodyBias = 0

    switch (embodiedPerformance?.baseEmotion) {
      case 'happy':
        emotionSmileBias = 0.34 * expressionDrive
        emotionCheekBias = 0.24 * facialCueDrive
        emotionMouthBias = 0.18 * facialCueDrive
        emotionBrowBias = 0.08 * expressionDrive
        emotionBodyBias = 0.12 * actionDrive
        break
      case 'sad':
      case 'tired':
        emotionSmileBias = -0.24 * facialCueDrive
        emotionCheekBias = -0.08 * facialCueDrive
        emotionMouthBias = -0.2 * facialCueDrive
        emotionBrowBias = -0.22 * facialCueDrive
        emotionBodyBias = -0.08 * actionDrive
        break
      case 'angry':
        emotionSmileBias = -0.16 * facialCueDrive
        emotionMouthBias = -0.12 * facialCueDrive
        emotionBrowBias = -0.28 * expressionDrive
        emotionBodyBias = 0.18 * actionDrive
        break
      case 'concerned':
      case 'apologetic':
        emotionSmileBias = -0.14 * facialCueDrive
        emotionMouthBias = -0.18 * facialCueDrive
        emotionBrowBias = -0.18 * facialCueDrive
        emotionBodyBias = -0.04 * actionDrive
        break
      case 'surprised':
        emotionSmileBias = 0.06 * facialCueDrive
        emotionMouthBias = 0.16 * facialCueDrive
        emotionBrowBias = 0.22 * facialCueDrive
        emotionBodyBias = 0.14 * actionDrive
        break
      case 'thinking':
        emotionSmileBias = -0.08 * facialCueDrive
        emotionMouthBias = -0.1 * facialCueDrive
        emotionBrowBias = 0.12 * expressionDrive
        emotionBodyBias = 0.1 * actionDrive
        break
      default:
        break
    }

    let deliveryMotionBias = 0
    let deliveryFocusBias = 0
    switch (embodiedPerformance?.delivery) {
      case 'energetic':
        deliveryMotionBias = 0.18
        deliveryFocusBias = 0.04
        break
      case 'firm':
        deliveryMotionBias = 0.12
        deliveryFocusBias = 0.1
        break
      case 'gentle':
        deliveryMotionBias = -0.04
        deliveryFocusBias = 0.05
        break
      case 'hesitant':
        deliveryMotionBias = -0.06
        deliveryFocusBias = -0.03
        break
      case 'teasing':
        deliveryMotionBias = 0.1
        deliveryFocusBias = -0.02
        break
      case 'calm':
      default:
        break
    }

    const mouthOpenTarget = clamp01(
      params.mouthOpen
      + (speechActive
        ? Math.max(
            mouthOpenRatio * (0.72 + prosodyIntensity * 0.18),
            speechEnergy * 0.9,
            speechContinuity.drive * 0.16,
            cueMouthWeight * 0.18,
          )
        : 0)
      + facialCueDriveProfile.mouthOpen,
    )
    const mouthFormTarget = clampRange(
      params.mouthForm
      + (prosodyIntensity - 0.35) * 0.24
      + cadenceCentered * 0.1
      + cueMouthWeight * 0.08
      + emotionMouthBias
      + facialCueDriveProfile.mouthForm
      + attentivePresence * 0.08
      - hesitantPresence * 0.06
      - concernedPresence * 0.14,
      -1,
      1,
    )
    const cheekTarget = clamp01(
      params.cheek
      + speechEnergy * (0.05 + prosodyIntensity * 0.12)
      + emotionCheekBias
      + facialCueDriveProfile.cheek
      + attentivePresence * 0.08
      - concernedPresence * 0.03,
    )
    const eyeSmileTarget = clamp01(
      (params.leftEyeSmile + params.rightEyeSmile) / 2
      + speechEnergy * (0.2 + prosodyIntensity * 0.16)
      + emotionSmileBias
      + facialCueDriveProfile.eyeSmile
      + attentivePresence * 0.12
      - concernedPresence * 0.2
      - hesitantPresence * 0.12,
    )

    const browLift = attentivePresence * 0.16
      + emotionBrowBias
      + facialCueDriveProfile.browLift
      + inspectionPresence * 0.1
      - concernedPresence * 0.22
      - hesitantPresence * 0.12
    const browAngle = attentivePresence * 0.06
      + emotionBrowBias * 0.36
      + facialCueDriveProfile.browAngle
      - concernedPresence * 0.18
      - hesitantPresence * 0.08
    const browLTarget = clampRange(params.leftEyebrowY + browLift + cadenceCentered * 0.03, -1, 1)
    const browRTarget = clampRange(params.rightEyebrowY + browLift - cadenceCentered * 0.03, -1, 1)
    const browLAngleTarget = clampRange(params.leftEyebrowAngle + browAngle, -1, 1)
    const browRAngleTarget = clampRange(params.rightEyebrowAngle - browAngle * 0.8, -1, 1)

    const bodyXTarget = clampRange(
      params.bodyAngleX
      + postureYaw * (5.2 + focusDrive * 0.8 + deliveryFocusBias)
      + cadenceCentered * (1.6 + prosodyDrive * 1.4 + performancePulse * 0.8 + cueHeadWeight * 0.9)
      + cueHeadWeight * 1.8
      + emotionBodyBias * 2.2,
      -10,
      10,
    )
    const bodyYTarget = clampRange(
      params.bodyAngleY
      - posturePitch * (3.6 + focusDrive * 0.5)
      + cadenceCentered * (0.7 + emphasisLevel * 0.8 + performancePulse * 0.36 + cueHeadWeight * 0.54)
      + cueHeadWeight * 0.8
      + deliveryMotionBias * 1.2,
      -8,
      8,
    )
    const breathTarget = clamp01(
      params.breath
      + postureBreath * 0.18
      + speechEnergy * 0.22
      + cadencePulse * 0.2
      + cueMouthWeight * 0.08
      + breathDrive * 0.22,
    )

    const openness = speechActive
      ? Math.max(mouthOpenRatio, speechEnergy * 0.92, speechContinuity.drive * 0.2, cueMouthWeight * 0.28)
      : 0
    const visemeRaw = {
      A: openness * (0.44 + emphasisLevel * 0.28),
      I: openness * (0.24 + cadencePulse * 0.2),
      U: openness * (0.18 + (1 - emphasisLevel) * 0.18),
      E: openness * (0.2 + (1 - cadencePulse) * 0.22),
      O: openness * (0.28 + prosodyIntensity * 0.2),
    }

    let visemeWinner: keyof typeof visemeRaw = 'A'
    let visemeRunner: keyof typeof visemeRaw = 'I'
    let winnerValue = -Infinity
    let runnerValue = -Infinity
    ;(Object.keys(visemeRaw) as Array<keyof typeof visemeRaw>).forEach((key) => {
      const value = visemeRaw[key]
      if (value > winnerValue) {
        runnerValue = winnerValue
        visemeRunner = visemeWinner
        winnerValue = value
        visemeWinner = key
      }
      else if (value > runnerValue) {
        runnerValue = value
        visemeRunner = key
      }
    })

    const visemeTarget = {
      A: visemeRaw.A * 0.32,
      I: visemeRaw.I * 0.32,
      U: visemeRaw.U * 0.32,
      E: visemeRaw.E * 0.32,
      O: visemeRaw.O * 0.32,
    }
    if (speechActive && openness > 0.01) {
      visemeTarget[visemeWinner] = Math.max(
        visemeTarget[visemeWinner],
        clamp01(winnerValue * (0.95 + emphasisLevel * 0.18)),
      )
      visemeTarget[visemeRunner] = Math.max(
        visemeTarget[visemeRunner],
        clamp01(runnerValue * (0.56 + prosodyIntensity * 0.22)),
      )
    }

    const smoothedMouthOpen = smoothValue('ParamMouthOpenY', mouthOpenTarget, dt, { attack: 26, release: 14 })
    const smoothedMouthForm = smoothValue('ParamMouthForm', mouthFormTarget, dt, { release: facialReleaseRate })
    const smoothedCheek = smoothValue('ParamCheek', cheekTarget, dt, { release: facialReleaseRate })
    const smoothedEyeSmile = smoothValue('ParamEyeSmile', eyeSmileTarget, dt, { attack: 12, release: facialReleaseRate })
    const smoothedBrowL = smoothValue('ParamBrowLY', browLTarget, dt, { release: facialReleaseRate })
    const smoothedBrowR = smoothValue('ParamBrowRY', browRTarget, dt, { release: facialReleaseRate })
    const smoothedBrowLAngle = smoothValue('ParamBrowLAngle', browLAngleTarget, dt, { release: facialReleaseRate })
    const smoothedBrowRAngle = smoothValue('ParamBrowRAngle', browRAngleTarget, dt, { release: facialReleaseRate })
    const currentEyeLOpen = supportsParameter(ctx.model, 'ParamEyeLOpen')
      ? clamp01(ctx.model.getParameterValueById('ParamEyeLOpen') as number)
      : clamp01(params.leftEyeOpen)
    const currentEyeROpen = supportsParameter(ctx.model, 'ParamEyeROpen')
      ? clamp01(ctx.model.getParameterValueById('ParamEyeROpen') as number)
      : clamp01(params.rightEyeOpen)
    const smoothedEyeLOpen = smoothValue(
      'ParamEyeLOpenOverlay',
      clamp01(currentEyeLOpen * (1 + facialCueDriveProfile.eyeOpenScale)),
      dt,
      { attack: 18, release: facialReleaseRate },
    )
    const smoothedEyeROpen = smoothValue(
      'ParamEyeROpenOverlay',
      clamp01(currentEyeROpen * (1 + facialCueDriveProfile.eyeOpenScale)),
      dt,
      { attack: 18, release: facialReleaseRate },
    )
    const smoothedBodyX = smoothValue('ParamBodyAngleX', bodyXTarget, dt, { attack: 9, release: 6 })
    const smoothedBodyY = smoothValue('ParamBodyAngleY', bodyYTarget, dt, { attack: 9, release: 6 })
    const smoothedBreath = smoothValue('ParamBreath', breathTarget, dt, { attack: 7, release: 4 })

    if (supportsParameter(ctx.model, 'ParamEyeLOpen'))
      ctx.model.setParameterValueById('ParamEyeLOpen', smoothedEyeLOpen)
    if (supportsParameter(ctx.model, 'ParamEyeROpen'))
      ctx.model.setParameterValueById('ParamEyeROpen', smoothedEyeROpen)
    if (supportsParameter(ctx.model, 'ParamMouthOpenY'))
      ctx.model.setParameterValueById('ParamMouthOpenY', smoothedMouthOpen)
    if (supportsParameter(ctx.model, 'ParamMouthForm'))
      ctx.model.setParameterValueById('ParamMouthForm', smoothedMouthForm)
    if (supportsParameter(ctx.model, 'ParamCheek'))
      ctx.model.setParameterValueById('ParamCheek', smoothedCheek)
    if (supportsParameter(ctx.model, 'ParamEyeSmile'))
      ctx.model.setParameterValueById('ParamEyeSmile', smoothedEyeSmile)
    if (supportsParameter(ctx.model, 'ParamBrowLY'))
      ctx.model.setParameterValueById('ParamBrowLY', smoothedBrowL)
    if (supportsParameter(ctx.model, 'ParamBrowRY'))
      ctx.model.setParameterValueById('ParamBrowRY', smoothedBrowR)
    if (supportsParameter(ctx.model, 'ParamBrowLAngle'))
      ctx.model.setParameterValueById('ParamBrowLAngle', smoothedBrowLAngle)
    if (supportsParameter(ctx.model, 'ParamBrowRAngle'))
      ctx.model.setParameterValueById('ParamBrowRAngle', smoothedBrowRAngle)
    if (supportsParameter(ctx.model, 'ParamBodyAngleX'))
      ctx.model.setParameterValueById('ParamBodyAngleX', smoothedBodyX)
    if (supportsParameter(ctx.model, 'ParamBodyAngleY'))
      ctx.model.setParameterValueById('ParamBodyAngleY', smoothedBodyY)
    if (supportsParameter(ctx.model, 'ParamBreath'))
      ctx.model.setParameterValueById('ParamBreath', smoothedBreath)

    const visemeSmoothingAttack = speechActive ? 30 : 8
    const visemeSmoothingRelease = speechActive ? 18 : 6
    const visemeA = smoothValue('ParamA', clamp01(visemeTarget.A), dt, { attack: visemeSmoothingAttack, release: visemeSmoothingRelease })
    const visemeI = smoothValue('ParamI', clamp01(visemeTarget.I), dt, { attack: visemeSmoothingAttack, release: visemeSmoothingRelease })
    const visemeU = smoothValue('ParamU', clamp01(visemeTarget.U), dt, { attack: visemeSmoothingAttack, release: visemeSmoothingRelease })
    const visemeE = smoothValue('ParamE', clamp01(visemeTarget.E), dt, { attack: visemeSmoothingAttack, release: visemeSmoothingRelease })
    const visemeO = smoothValue('ParamO', clamp01(visemeTarget.O), dt, { attack: visemeSmoothingAttack, release: visemeSmoothingRelease })

    if (supportsParameter(ctx.model, 'ParamA'))
      ctx.model.setParameterValueById('ParamA', visemeA)
    if (supportsParameter(ctx.model, 'ParamI'))
      ctx.model.setParameterValueById('ParamI', visemeI)
    if (supportsParameter(ctx.model, 'ParamU'))
      ctx.model.setParameterValueById('ParamU', visemeU)
    if (supportsParameter(ctx.model, 'ParamE'))
      ctx.model.setParameterValueById('ParamE', visemeE)
    if (supportsParameter(ctx.model, 'ParamO'))
      ctx.model.setParameterValueById('ParamO', visemeO)
  }
}
