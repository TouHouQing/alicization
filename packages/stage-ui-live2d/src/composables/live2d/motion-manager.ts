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

function clamp01(value: number, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, value))
}

function clampRange(value: number, min: number, max: number) {
  if (!Number.isFinite(value))
    return min

  return Math.min(max, Math.max(min, value))
}

const live2dEmbodimentDebugStorageKey = 'devtools/embodiment-debug'

function isLive2DPerformanceDebugEnabled() {
  try {
    return globalThis.localStorage?.getItem(live2dEmbodimentDebugStorageKey) === 'true'
  }
  catch {
    return false
  }
}

function logLive2DPerformanceDebug(event: string, payload?: Record<string, unknown>) {
  if (!isLive2DPerformanceDebugEnabled())
    return

  console.info('[stage-embodiment][live2d]', {
    event,
    ...payload,
  })
}

interface Live2DEmotionDriveProfile {
  bodyLean: number
  bodyTwist: number
  bodyYaw: number
  browAngle: number
  browForm: number
  browLift: number
  cheek: number
  eyeOpen: number
  eyeSmile: number
  headPitch: number
  headRoll: number
  mouthForm: number
  mouthOpen: number
  mouthRound: number
  mouthSpread: number
  smile: number
}

const emptyLive2DEmotionDriveProfile: Live2DEmotionDriveProfile = {
  bodyLean: 0,
  bodyTwist: 0,
  bodyYaw: 0,
  browAngle: 0,
  browForm: 0,
  browLift: 0,
  cheek: 0,
  eyeOpen: 0,
  eyeSmile: 0,
  headPitch: 0,
  headRoll: 0,
  mouthForm: 0,
  mouthOpen: 0,
  mouthRound: 0,
  mouthSpread: 0,
  smile: 0,
}

function scaleEmotionDriveProfile(
  profile: Live2DEmotionDriveProfile,
  factor: number,
): Live2DEmotionDriveProfile {
  const intensity = clamp01(factor)
  if (intensity <= 0)
    return { ...emptyLive2DEmotionDriveProfile }

  return {
    bodyLean: profile.bodyLean * intensity,
    bodyTwist: profile.bodyTwist * intensity,
    bodyYaw: profile.bodyYaw * intensity,
    browAngle: profile.browAngle * intensity,
    browForm: profile.browForm * intensity,
    browLift: profile.browLift * intensity,
    cheek: profile.cheek * intensity,
    eyeOpen: profile.eyeOpen * intensity,
    eyeSmile: profile.eyeSmile * intensity,
    headPitch: profile.headPitch * intensity,
    headRoll: profile.headRoll * intensity,
    mouthForm: profile.mouthForm * intensity,
    mouthOpen: profile.mouthOpen * intensity,
    mouthRound: profile.mouthRound * intensity,
    mouthSpread: profile.mouthSpread * intensity,
    smile: profile.smile * intensity,
  }
}

function resolveLive2DEmotionDriveProfile(input: {
  actionDrive: number
  emotion: string | null | undefined
  expressionDrive: number
  facialCueDrive: number
}) {
  const drive = clamp01(
    Math.max(
      input.expressionDrive * 0.56 + input.facialCueDrive * 0.44,
      input.facialCueDrive * 0.84,
      input.actionDrive * 0.4,
    ),
  )
  const emotion = typeof input.emotion === 'string' ? input.emotion.trim().toLowerCase() : ''

  switch (emotion) {
    case 'happy':
      return scaleEmotionDriveProfile({
        ...emptyLive2DEmotionDriveProfile,
        bodyYaw: 0.18,
        bodyLean: -0.12,
        bodyTwist: 0.16,
        browAngle: 0.12,
        browLift: 0.18,
        cheek: 0.42,
        eyeOpen: 0.08,
        eyeSmile: 0.32,
        headRoll: 0.12,
        mouthForm: 0.24,
        mouthOpen: 0.06,
        mouthSpread: 0.38,
        smile: 0.52,
      }, drive)
    case 'angry':
      return scaleEmotionDriveProfile({
        ...emptyLive2DEmotionDriveProfile,
        bodyYaw: 0.24,
        bodyLean: 0.24,
        bodyTwist: -0.18,
        browAngle: -0.36,
        browForm: -0.28,
        browLift: -0.42,
        cheek: -0.06,
        eyeOpen: -0.2,
        headPitch: 0.12,
        headRoll: -0.12,
        mouthForm: -0.36,
        mouthOpen: 0.04,
        mouthSpread: -0.16,
        smile: -0.28,
      }, drive)
    case 'sad':
    case 'tired':
      return scaleEmotionDriveProfile({
        ...emptyLive2DEmotionDriveProfile,
        bodyLean: -0.18,
        bodyTwist: -0.12,
        browAngle: -0.16,
        browForm: -0.14,
        browLift: -0.26,
        eyeOpen: -0.22,
        headPitch: -0.14,
        headRoll: -0.08,
        mouthForm: -0.28,
        mouthRound: 0.12,
        smile: -0.3,
      }, drive)
    case 'concerned':
    case 'apologetic':
      return scaleEmotionDriveProfile({
        ...emptyLive2DEmotionDriveProfile,
        bodyLean: 0.12,
        bodyTwist: -0.1,
        browAngle: -0.14,
        browForm: 0.16,
        browLift: -0.12,
        eyeOpen: -0.12,
        eyeSmile: 0.04,
        headPitch: 0.1,
        mouthForm: -0.24,
        mouthRound: 0.3,
        smile: -0.18,
      }, drive)
    case 'surprised':
      return scaleEmotionDriveProfile({
        ...emptyLive2DEmotionDriveProfile,
        bodyLean: -0.08,
        bodyTwist: 0.18,
        browAngle: 0.22,
        browForm: 0.18,
        browLift: 0.34,
        eyeOpen: 0.36,
        headPitch: -0.12,
        mouthForm: 0.08,
        mouthOpen: 0.26,
        mouthRound: 0.24,
      }, drive)
    case 'thinking':
      return scaleEmotionDriveProfile({
        ...emptyLive2DEmotionDriveProfile,
        bodyLean: 0.14,
        bodyTwist: 0.12,
        browAngle: 0.18,
        browForm: 0.2,
        browLift: 0.12,
        eyeOpen: -0.1,
        headPitch: 0.14,
        headRoll: 0.1,
        mouthForm: -0.18,
        mouthRound: 0.2,
        mouthSpread: -0.08,
        smile: -0.12,
      }, drive)
    default:
      return { ...emptyLive2DEmotionDriveProfile }
  }
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
  const lastAppliedBlinkOverlay = {
    left: 0,
    right: 0,
  }

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

      // Recover the pre-blink baseline so idle blink does not get stuck on the previous frame.
      const runtimeLeft = clamp01(ctx.model.getParameterValueById('ParamEyeLOpen') as number, 1)
      const runtimeRight = clamp01(ctx.model.getParameterValueById('ParamEyeROpen') as number, 1)
      const baselineLeft = clamp01(runtimeLeft - lastAppliedBlinkOverlay.left, 1)
      const baselineRight = clamp01(runtimeRight - lastAppliedBlinkOverlay.right, 1)
      const finalLeft = clamp01(baselineLeft * clamp01(ctx.modelParameters.value.leftEyeOpen, 1))
      const finalRight = clamp01(baselineRight * clamp01(ctx.modelParameters.value.rightEyeOpen, 1))

      ctx.model.setParameterValueById('ParamEyeLOpen', finalLeft)
      ctx.model.setParameterValueById('ParamEyeROpen', finalRight)
      lastAppliedBlinkOverlay.left = finalLeft - baselineLeft
      lastAppliedBlinkOverlay.right = finalRight - baselineRight

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
  const lastAppliedBlinkOverlay = {
    left: 0,
    right: 0,
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

    const runtimeLeft = clamp01(ctx.model.getParameterValueById('ParamEyeLOpen') as number, 1)
    const runtimeRight = clamp01(ctx.model.getParameterValueById('ParamEyeROpen') as number, 1)
    const rawBaselineLeft = clamp01(runtimeLeft - lastAppliedBlinkOverlay.left, 1)
    const rawBaselineRight = clamp01(runtimeRight - lastAppliedBlinkOverlay.right, 1)
    const baseLeft = clamp01(rawBaselineLeft * clamp01(ctx.modelParameters.value.leftEyeOpen, 1))
    const baseRight = clamp01(rawBaselineRight * clamp01(ctx.modelParameters.value.rightEyeOpen, 1))

    if (!ctx.live2dAutoBlinkEnabled.value) {
      resetBlinkState()
      ctx.model.setParameterValueById('ParamEyeLOpen', baseLeft)
      ctx.model.setParameterValueById('ParamEyeROpen', baseRight)
      lastAppliedBlinkOverlay.left = baseLeft - rawBaselineLeft
      lastAppliedBlinkOverlay.right = baseRight - rawBaselineRight
      ctx.markHandled()
      return
    }

    if (ctx.live2dForceAutoBlinkEnabled.value || !ctx.internalModel.eyeBlink) {
      const dtMs = Math.max(1, clampRange(ctx.timeDeltaSeconds, 0, 0.12) * 1000)
      const { eyeLOpen, eyeROpen } = updateForcedBlink(dtMs, baseLeft, baseRight)

      ctx.model.setParameterValueById('ParamEyeLOpen', eyeLOpen)
      ctx.model.setParameterValueById('ParamEyeROpen', eyeROpen)
      lastAppliedBlinkOverlay.left = eyeLOpen - rawBaselineLeft
      lastAppliedBlinkOverlay.right = eyeROpen - rawBaselineRight
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
    lastAppliedBlinkOverlay.left = clamp01(blinkLeft * baseLeft) - rawBaselineLeft
    lastAppliedBlinkOverlay.right = clamp01(blinkRight * baseRight) - rawBaselineRight

    ctx.markHandled()
  }
}

export function useMotionUpdatePluginPerformanceLayers(): MotionManagerPlugin {
  const smoothState: Record<string, number> = {}
  const appliedOverlayState: Record<string, number> = {}
  const parameterSupportCache = new Map<string, boolean>()
  const speechContinuityState = createLive2DSpeechContinuityState()
  // Keep the last runtime-authored facial release window alive briefly after a cue clears.
  const rendererSettleState = {
    facialReleaseMs: 0,
    facialReleaseUntil: 0,
  }
  const debugState = {
    lastFrameGapAt: 0,
    lastSnapshotAt: 0,
    lastSnapshotSignature: '',
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

  function setParameter(
    model: CubismModel,
    value: number,
    parameterIds: string[],
  ) {
    for (const parameterId of parameterIds) {
      if (!supportsParameter(model, parameterId))
        continue

      model.setParameterValueById(parameterId, value)
    }
  }

  function resolvePrimaryParameterId(model: CubismModel, parameterIds: string[]) {
    return parameterIds.find(parameterId => supportsParameter(model, parameterId)) ?? null
  }

  function readParameter(
    model: CubismModel,
    parameterIds: string[],
    fallback: number,
  ) {
    const primaryParameterId = resolvePrimaryParameterId(model, parameterIds)
    if (!primaryParameterId)
      return fallback

    try {
      const value = model.getParameterValueById(primaryParameterId)
      return Number.isFinite(Number(value)) ? Number(value) : fallback
    }
    catch {
      return fallback
    }
  }

  function resolveOverlayBaseline(
    model: CubismModel,
    overlayKey: string,
    parameterIds: string[],
    fallback: number,
  ) {
    const primaryParameterId = resolvePrimaryParameterId(model, parameterIds)
    if (!primaryParameterId) {
      delete appliedOverlayState[overlayKey]
      return {
        baseline: fallback,
        supported: false,
      }
    }

    const currentValue = readParameter(model, [primaryParameterId], fallback)
    return {
      baseline: currentValue - (appliedOverlayState[overlayKey] ?? 0),
      supported: true,
    }
  }

  function applyOverlayParameter(input: {
    model: CubismModel
    overlayKey: string
    overlayValue: number
    parameterIds: string[]
    fallback: number
    max?: number
    min?: number
  }) {
    const baselineState = resolveOverlayBaseline(
      input.model,
      input.overlayKey,
      input.parameterIds,
      input.fallback,
    )

    if (!baselineState.supported)
      return baselineState.baseline

    const unclampedValue = baselineState.baseline + input.overlayValue
    const finalValue = Number.isFinite(input.min) && Number.isFinite(input.max)
      ? clampRange(unclampedValue, input.min as number, input.max as number)
      : unclampedValue

    setParameter(input.model, finalValue, input.parameterIds)
    appliedOverlayState[input.overlayKey] = finalValue - baselineState.baseline
    return finalValue
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
    const speechArticulation = speech?.articulation ?? null
    const articulationActive = speechArticulation?.active === true
    const articulationClosure = clamp01(Math.max(
      speechArticulation?.lipClosure ?? 0,
      speechArticulation?.visemes.closed ?? 0,
    ))
    const articulationRound = clamp01(speechArticulation?.lipRound ?? 0)
    const articulationSpread = clamp01(speechArticulation?.lipSpread ?? 0)
    const articulationJaw = clamp01(speechArticulation?.jawOpen ?? 0)
    const articulationOpenness = clamp01(Math.max(
      speechArticulation?.openness ?? 0,
      articulationJaw * 0.86,
    ))
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
    const motor = performanceState?.motor
    const motorStillness = clamp01(motor?.stillness ?? 0.58)
    const motorExpressivity = clamp01(motor?.expressivity ?? expressionDrive)
    const motorGazeFocus = clamp01(motor?.gaze.focus ?? focusDrive)
    const motorGazeStability = clamp01(motor?.gaze.stability ?? 0.62)
    const motorGazeAzimuth = clampRange(motor?.gaze.azimuth ?? 0, -1, 1)
    const motorGazeElevation = clampRange(motor?.gaze.elevation ?? 0.02, -1, 1)
    const motorHeadYaw = clampRange(motor?.head.yaw ?? 0, -1, 1)
    const motorHeadPitch = clampRange(motor?.head.pitch ?? 0, -1, 1)
    const motorHeadRoll = clampRange(motor?.head.roll ?? 0, -1, 1)
    const motorHeadNod = clamp01(motor?.head.nod ?? 0.18)
    const motorBreathAmplitude = clamp01(motor?.breath.amplitude ?? breathDrive)
    const motorBreathPace = clamp01(motor?.breath.pace ?? 0.46)
    const motorEyeOpenness = clamp01(motor?.facial.eyeOpenness ?? 0.56)
    const motorBrowLift = clampRange(motor?.facial.browLift ?? 0, -1, 1)
    const motorBrowTension = clamp01(motor?.facial.browTension ?? 0.28)
    const motorCheekLift = clamp01(motor?.facial.cheekLift ?? 0.14)
    const motorMouthSpread = clamp01(motor?.facial.mouthSpread ?? 0.18)
    const motorMouthRound = clamp01(motor?.facial.mouthRound ?? 0.24)
    const motorJawOpenBias = clamp01(motor?.facial.jawOpenBias ?? 0.26)
    const motorBodySway = clampRange(motor?.body.sway ?? 0, -1, 1)
    const motorBodyLean = clampRange(motor?.body.lean ?? 0, -1, 1)
    const motorBodyOpenness = clamp01(motor?.body.openness ?? 0.5)
    const motorBodySettle = clamp01(motor?.body.settle ?? 0.62)
    const facialCueDriveProfile = resolveLive2DFacialCueDrive(
      embodiedPerformance?.facialCue,
      facialCueDrive,
    )
    const emotionProfile = resolveLive2DEmotionDriveProfile({
      actionDrive,
      emotion: embodiedPerformance?.baseEmotion,
      expressionDrive,
      facialCueDrive,
    })

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

    // NOTICE: all targets below are additive overlays on top of the model's current
    // motion/expression output. We recover the runtime baseline each frame by
    // subtracting the previously applied overlay from the current model values.
    const mouthOpenTarget = clamp01(
      params.mouthOpen
      + (speechActive
        ? Math.max(
            articulationActive
              ? articulationOpenness * (0.78 + articulationJaw * 0.22) * (1 - articulationClosure * 0.64)
              : 0,
            mouthOpenRatio * (0.72 + prosodyIntensity * 0.18),
            speechEnergy * 0.9,
            speechContinuity.drive * 0.16,
            cueMouthWeight * 0.18,
          )
        : 0)
      + motorJawOpenBias * (0.08 + motorExpressivity * 0.08)
      + emotionProfile.mouthOpen
      + facialCueDriveProfile.mouthOpen,
    )
    const mouthFormTarget = clampRange(
      params.mouthForm
      + (prosodyIntensity - 0.35) * 0.24
      + cadenceCentered * 0.1
      + cueMouthWeight * 0.08
      + articulationSpread * 0.24
      - articulationRound * 0.28
      - articulationClosure * 0.08
      + motorMouthSpread * 0.24
      - motorMouthRound * 0.2
      + emotionProfile.mouthForm
      + emotionProfile.mouthSpread * 0.14
      - emotionProfile.mouthRound * 0.18
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
      + motorCheekLift * 0.18
      + emotionProfile.cheek
      + facialCueDriveProfile.cheek
      + attentivePresence * 0.08
      - concernedPresence * 0.03,
    )
    const eyeSmileTarget = clamp01(
      (params.leftEyeSmile + params.rightEyeSmile) / 2
      + speechEnergy * (0.2 + prosodyIntensity * 0.16)
      + motorCheekLift * 0.14
      + motorExpressivity * 0.06
      + emotionProfile.smile
      + emotionProfile.eyeSmile
      + facialCueDriveProfile.eyeSmile
      + attentivePresence * 0.12
      - concernedPresence * 0.2
      - hesitantPresence * 0.12,
    )

    const browLift = attentivePresence * 0.16
      + motorBrowLift * 0.42
      + emotionProfile.browLift
      + facialCueDriveProfile.browLift
      + inspectionPresence * 0.1
      - concernedPresence * 0.22
      - hesitantPresence * 0.12
    const browAngle = attentivePresence * 0.06
      - motorBrowTension * 0.18
      + emotionProfile.browAngle
      + facialCueDriveProfile.browAngle
      - concernedPresence * 0.18
      - hesitantPresence * 0.08
    const browLTarget = clampRange(params.leftEyebrowY + browLift + cadenceCentered * 0.03, -1, 1)
    const browRTarget = clampRange(params.rightEyebrowY + browLift - cadenceCentered * 0.03, -1, 1)
    const browLAngleTarget = clampRange(params.leftEyebrowAngle + browAngle, -1, 1)
    const browRAngleTarget = clampRange(params.rightEyebrowAngle - browAngle * 0.8, -1, 1)
    const browLFormTarget = clampRange(params.leftEyebrowForm + emotionProfile.browForm + motorBrowTension * 0.1, -1, 1)
    const browRFormTarget = clampRange(params.rightEyebrowForm + emotionProfile.browForm + motorBrowTension * 0.1, -1, 1)

    const bodyXTarget = clampRange(
      params.bodyAngleX
      + postureYaw * (5.2 + focusDrive * 0.8 + deliveryFocusBias)
      + cadenceCentered * (1.6 + prosodyDrive * 1.4 + performancePulse * 0.8 + cueHeadWeight * 0.9)
      + cueHeadWeight * 1.8
      + motorHeadYaw * (2.8 + motorExpressivity * 1.2)
      + motorBodySway * (1.6 + motorBodyOpenness * 0.8)
      + emotionProfile.bodyYaw * 4.6,
      -10,
      10,
    )
    const bodyYTarget = clampRange(
      params.bodyAngleY
      - posturePitch * (3.6 + focusDrive * 0.5)
      + cadenceCentered * (0.7 + emphasisLevel * 0.8 + performancePulse * 0.36 + cueHeadWeight * 0.54)
      + cueHeadWeight * 0.8
      - motorHeadPitch * 2.4
      - motorBodyLean * (1.8 + motorBodySettle * 0.4)
      + emotionProfile.bodyLean * 3.4
      + deliveryMotionBias * 1.2,
      -8,
      8,
    )
    const bodyZTarget = clampRange(
      params.bodyAngleZ
      + motorBodySway * 1.8
      + emotionProfile.bodyTwist * 8
      + cadenceCentered * (0.6 + performancePulse * 0.28),
      -12,
      12,
    )
    const breathTarget = clamp01(
      params.breath
      + postureBreath * 0.18
      + speechEnergy * 0.22
      + cadencePulse * 0.2
      + cueMouthWeight * 0.08
      + motorBreathAmplitude * 0.24
      + motorBreathPace * 0.06
      + breathDrive * 0.22,
    )
    const angleXTarget = clampRange(
      params.angleX
      + motorHeadYaw * (8 + motorGazeFocus * 3)
      + motorGazeAzimuth * (6 + motorExpressivity * 2)
      + cadenceCentered * (1.2 + motorHeadNod * 0.8),
      -30,
      30,
    )
    const angleYTarget = clampRange(
      params.angleY
      - motorHeadPitch * 8
      - motorGazeElevation * (6 + motorGazeFocus * 2)
      - emotionProfile.headPitch * 7.2
      + cadenceCentered * (0.6 + motorHeadNod * 0.5),
      -30,
      30,
    )
    const angleZTarget = clampRange(
      params.angleZ
      + motorHeadRoll * 10
      + emotionProfile.headRoll * 8
      + motorBodySway * 2.4
      - motorStillness * 1.2,
      -30,
      30,
    )
    const eyeBallXTarget = clampRange(
      motorGazeAzimuth * (0.46 + motorGazeFocus * 0.22) - motorGazeStability * 0.06,
      -1,
      1,
    )
    const eyeBallYTarget = clampRange(
      -motorGazeElevation * (0.42 + motorGazeFocus * 0.18),
      -1,
      1,
    )

    const openness = speechActive
      ? Math.max(
          articulationActive ? articulationOpenness * (1 - articulationClosure * 0.54) : 0,
          mouthOpenRatio,
          speechEnergy * 0.92,
          speechContinuity.drive * 0.2,
          cueMouthWeight * 0.28,
        )
      : 0
    const visemeRaw = articulationActive
      ? {
          A: openness * (speechArticulation?.visemes.A ?? 0) * (0.76 + articulationJaw * 0.18) * (1 - articulationClosure * 0.7),
          I: openness * (speechArticulation?.visemes.I ?? 0) * (0.68 + articulationSpread * 0.22) * (1 - articulationClosure * 0.7),
          U: openness * (speechArticulation?.visemes.U ?? 0) * (0.64 + articulationRound * 0.28) * (1 - articulationClosure * 0.72),
          E: openness * (speechArticulation?.visemes.E ?? 0) * (0.7 + articulationSpread * 0.18) * (1 - articulationClosure * 0.7),
          O: openness * (speechArticulation?.visemes.O ?? 0) * (0.68 + articulationRound * 0.24) * (1 - articulationClosure * 0.72),
        }
      : {
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

    const mouthSmileTarget = clamp01(
      Math.max(0, mouthFormTarget) * 0.58
      + clamp01(emotionProfile.smile) * 0.92
      + clamp01(emotionProfile.eyeSmile) * 0.24
      + clamp01(facialCueDriveProfile.eyeSmile) * 0.12,
    )
    const mouthPuckerTarget = clamp01(
      articulationRound * 0.42
      + Math.max(0, -mouthFormTarget) * 0.28
      + emotionProfile.mouthRound * 0.82
      + motorMouthRound * 0.22
      + visemeTarget.U * 0.24
      + visemeTarget.O * 0.18,
    )
    const browFormTarget = clampRange(
      (browLFormTarget + browRFormTarget) / 2,
      -1,
      1,
    )

    const smoothedMouthOpen = smoothValue('ParamMouthOpenYOverlay', mouthOpenTarget, dt, { attack: 26, release: 14 })
    const smoothedMouthForm = smoothValue('ParamMouthFormOverlay', mouthFormTarget, dt, { release: facialReleaseRate })
    const smoothedMouthSmile = smoothValue('ParamMouthSmileOverlay', mouthSmileTarget, dt, { attack: 14, release: facialReleaseRate })
    const smoothedMouthPucker = smoothValue('ParamMouthPuckerOverlay', mouthPuckerTarget, dt, { attack: 14, release: facialReleaseRate })
    const smoothedCheek = smoothValue('ParamCheekOverlay', cheekTarget, dt, { release: facialReleaseRate })
    const smoothedEyeSmile = smoothValue('ParamEyeSmileOverlay', eyeSmileTarget, dt, { attack: 12, release: facialReleaseRate })
    const smoothedBrowL = smoothValue('ParamBrowLYOverlay', browLTarget, dt, { release: facialReleaseRate })
    const smoothedBrowR = smoothValue('ParamBrowRYOverlay', browRTarget, dt, { release: facialReleaseRate })
    const smoothedBrowLAngle = smoothValue('ParamBrowLAngleOverlay', browLAngleTarget, dt, { release: facialReleaseRate })
    const smoothedBrowRAngle = smoothValue('ParamBrowRAngleOverlay', browRAngleTarget, dt, { release: facialReleaseRate })
    const smoothedBrowLForm = smoothValue('ParamBrowLFormOverlay', browLFormTarget, dt, { release: facialReleaseRate })
    const smoothedBrowRForm = smoothValue('ParamBrowRFormOverlay', browRFormTarget, dt, { release: facialReleaseRate })
    const smoothedBrowForm = smoothValue('ParamBrowFormOverlay', browFormTarget, dt, { release: facialReleaseRate })
    const eyeOpenScale = clampRange(
      (1 + facialCueDriveProfile.eyeOpenScale + emotionProfile.eyeOpen) * (0.86 + motorEyeOpenness * 0.28),
      0.12,
      1.8,
    )
    const leftEyeBaselineState = resolveOverlayBaseline(ctx.model, 'ParamEyeLOpenOverlay', ['ParamEyeLOpen'], clamp01(params.leftEyeOpen))
    const rightEyeBaselineState = resolveOverlayBaseline(ctx.model, 'ParamEyeROpenOverlay', ['ParamEyeROpen'], clamp01(params.rightEyeOpen))
    const smoothedEyeLOpen = smoothValue(
      'ParamEyeLOpenOverlay',
      leftEyeBaselineState.baseline * (eyeOpenScale - 1),
      dt,
      { attack: 18, release: facialReleaseRate },
    )
    const smoothedEyeROpen = smoothValue(
      'ParamEyeROpenOverlay',
      rightEyeBaselineState.baseline * (eyeOpenScale - 1),
      dt,
      { attack: 18, release: facialReleaseRate },
    )
    const smoothedAngleX = smoothValue('ParamAngleXOverlay', angleXTarget, dt, { attack: 10, release: 6 })
    const smoothedAngleY = smoothValue('ParamAngleYOverlay', angleYTarget, dt, { attack: 10, release: 6 })
    const smoothedAngleZ = smoothValue('ParamAngleZOverlay', angleZTarget, dt, { attack: 10, release: 6 })
    const smoothedEyeBallX = smoothValue('ParamEyeBallX', eyeBallXTarget, dt, { attack: 12, release: 8 })
    const smoothedEyeBallY = smoothValue('ParamEyeBallY', eyeBallYTarget, dt, { attack: 12, release: 8 })
    const smoothedBodyX = smoothValue('ParamBodyAngleX', bodyXTarget, dt, { attack: 9, release: 6 })
    const smoothedBodyY = smoothValue('ParamBodyAngleY', bodyYTarget, dt, { attack: 9, release: 6 })
    const smoothedBodyZ = smoothValue('ParamBodyAngleZ', bodyZTarget, dt, { attack: 9, release: 6 })
    const smoothedBreath = smoothValue('ParamBreath', breathTarget, dt, { attack: 7, release: 4 })

    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamEyeLOpenOverlay',
      overlayValue: smoothedEyeLOpen,
      parameterIds: ['ParamEyeLOpen'],
      fallback: clamp01(params.leftEyeOpen),
      min: 0,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamEyeROpenOverlay',
      overlayValue: smoothedEyeROpen,
      parameterIds: ['ParamEyeROpen'],
      fallback: clamp01(params.rightEyeOpen),
      min: 0,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamEyeBallXOverlay',
      overlayValue: smoothedEyeBallX,
      parameterIds: ['ParamEyeBallX'],
      fallback: 0,
      min: -1,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamEyeBallYOverlay',
      overlayValue: smoothedEyeBallY,
      parameterIds: ['ParamEyeBallY'],
      fallback: 0,
      min: -1,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamMouthOpenOverlay',
      overlayValue: smoothedMouthOpen,
      parameterIds: ['ParamMouthOpenY', 'ParamMouthOpen'],
      fallback: clamp01(params.mouthOpen),
      min: 0,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamMouthFormOverlay',
      overlayValue: smoothedMouthForm,
      parameterIds: ['ParamMouthForm'],
      fallback: clampRange(params.mouthForm, -1, 1),
      min: -1,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamMouthSmileOverlay',
      overlayValue: smoothedMouthSmile,
      parameterIds: ['ParamMouthSmile'],
      fallback: 0,
      min: 0,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamMouthPuckerOverlay',
      overlayValue: smoothedMouthPucker,
      parameterIds: ['ParamMouthPucker'],
      fallback: 0,
      min: 0,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamCheekOverlay',
      overlayValue: smoothedCheek,
      parameterIds: ['ParamCheek'],
      fallback: clamp01(params.cheek),
      min: 0,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamEyeSmileOverlay',
      overlayValue: smoothedEyeSmile,
      parameterIds: ['ParamEyeSmile', 'ParamEyeLSmile', 'ParamEyeRSmile'],
      fallback: clamp01((params.leftEyeSmile + params.rightEyeSmile) / 2),
      min: 0,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamBrowLYOverlay',
      overlayValue: smoothedBrowL,
      parameterIds: ['ParamBrowLY'],
      fallback: clampRange(params.leftEyebrowY, -1, 1),
      min: -1,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamBrowRYOverlay',
      overlayValue: smoothedBrowR,
      parameterIds: ['ParamBrowRY'],
      fallback: clampRange(params.rightEyebrowY, -1, 1),
      min: -1,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamBrowLAngleOverlay',
      overlayValue: smoothedBrowLAngle,
      parameterIds: ['ParamBrowLAngle'],
      fallback: clampRange(params.leftEyebrowAngle, -1, 1),
      min: -1,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamBrowRAngleOverlay',
      overlayValue: smoothedBrowRAngle,
      parameterIds: ['ParamBrowRAngle'],
      fallback: clampRange(params.rightEyebrowAngle, -1, 1),
      min: -1,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamBrowLFormOverlay',
      overlayValue: smoothedBrowLForm,
      parameterIds: ['ParamBrowLForm'],
      fallback: clampRange(params.leftEyebrowForm, -1, 1),
      min: -1,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamBrowRFormOverlay',
      overlayValue: smoothedBrowRForm,
      parameterIds: ['ParamBrowRForm'],
      fallback: clampRange(params.rightEyebrowForm, -1, 1),
      min: -1,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamBrowFormOverlay',
      overlayValue: smoothedBrowForm,
      parameterIds: ['ParamBrowForm'],
      fallback: clampRange((params.leftEyebrowForm + params.rightEyebrowForm) / 2, -1, 1),
      min: -1,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamAngleXOverlay',
      overlayValue: smoothedAngleX,
      parameterIds: ['ParamAngleX'],
      fallback: params.angleX,
      min: -30,
      max: 30,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamAngleYOverlay',
      overlayValue: smoothedAngleY,
      parameterIds: ['ParamAngleY'],
      fallback: params.angleY,
      min: -30,
      max: 30,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamAngleZOverlay',
      overlayValue: smoothedAngleZ,
      parameterIds: ['ParamAngleZ'],
      fallback: params.angleZ,
      min: -30,
      max: 30,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamBodyAngleXOverlay',
      overlayValue: smoothedBodyX,
      parameterIds: ['ParamBodyAngleX'],
      fallback: params.bodyAngleX,
      min: -10,
      max: 10,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamBodyAngleYOverlay',
      overlayValue: smoothedBodyY,
      parameterIds: ['ParamBodyAngleY'],
      fallback: params.bodyAngleY,
      min: -8,
      max: 8,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamBodyAngleZOverlay',
      overlayValue: smoothedBodyZ,
      parameterIds: ['ParamBodyAngleZ'],
      fallback: params.bodyAngleZ,
      min: -12,
      max: 12,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamBreathOverlay',
      overlayValue: smoothedBreath,
      parameterIds: ['ParamBreath'],
      fallback: clamp01(params.breath),
      min: 0,
      max: 1,
    })

    const visemeSmoothingAttack = speechActive ? 30 : 8
    const visemeSmoothingRelease = speechActive ? 18 : 6
    const visemeA = smoothValue('ParamA', clamp01(visemeTarget.A), dt, { attack: visemeSmoothingAttack, release: visemeSmoothingRelease })
    const visemeI = smoothValue('ParamI', clamp01(visemeTarget.I), dt, { attack: visemeSmoothingAttack, release: visemeSmoothingRelease })
    const visemeU = smoothValue('ParamU', clamp01(visemeTarget.U), dt, { attack: visemeSmoothingAttack, release: visemeSmoothingRelease })
    const visemeE = smoothValue('ParamE', clamp01(visemeTarget.E), dt, { attack: visemeSmoothingAttack, release: visemeSmoothingRelease })
    const visemeO = smoothValue('ParamO', clamp01(visemeTarget.O), dt, { attack: visemeSmoothingAttack, release: visemeSmoothingRelease })

    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamAOverlay',
      overlayValue: visemeA,
      parameterIds: ['ParamA'],
      fallback: 0,
      min: 0,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamIOverlay',
      overlayValue: visemeI,
      parameterIds: ['ParamI'],
      fallback: 0,
      min: 0,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamUOverlay',
      overlayValue: visemeU,
      parameterIds: ['ParamU'],
      fallback: 0,
      min: 0,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamEOverlay',
      overlayValue: visemeE,
      parameterIds: ['ParamE'],
      fallback: 0,
      min: 0,
      max: 1,
    })
    applyOverlayParameter({
      model: ctx.model,
      overlayKey: 'ParamOOverlay',
      overlayValue: visemeO,
      parameterIds: ['ParamO'],
      fallback: 0,
      min: 0,
      max: 1,
    })

    if (dt >= 0.045 && ctx.now - debugState.lastFrameGapAt >= 180) {
      debugState.lastFrameGapAt = ctx.now
      logLive2DPerformanceDebug('motion-frame-gap', {
        dtMs: Math.round(dt * 1000),
        phase: performanceState?.phase ?? 'idle',
        speechPhase: speech?.phase ?? 'idle',
      })
    }

    const debugSnapshotSignature = JSON.stringify([
      performanceState?.phase ?? 'idle',
      performanceState?.activeCueSource ?? 'none',
      embodiedPerformance?.baseEmotion ?? 'neutral',
      embodiedPerformance?.delivery ?? 'calm',
      speech?.phase ?? 'idle',
      speech?.item?.segmentId ?? '',
    ])
    if (
      debugSnapshotSignature !== debugState.lastSnapshotSignature
      || ctx.now - debugState.lastSnapshotAt >= 220
    ) {
      debugState.lastSnapshotSignature = debugSnapshotSignature
      debugState.lastSnapshotAt = ctx.now
      logLive2DPerformanceDebug('performance-drive', {
        emotion: embodiedPerformance?.baseEmotion ?? 'neutral',
        delivery: embodiedPerformance?.delivery ?? 'calm',
        activeCueSource: performanceState?.activeCueSource ?? 'none',
        segmentId: speech?.item?.segmentId ?? null,
        mouthOpenTarget: Number(mouthOpenTarget.toFixed(3)),
        mouthFormTarget: Number(mouthFormTarget.toFixed(3)),
        mouthSmileTarget: Number(mouthSmileTarget.toFixed(3)),
        mouthPuckerTarget: Number(mouthPuckerTarget.toFixed(3)),
        browLift: Number(browLift.toFixed(3)),
        browAngle: Number(browAngle.toFixed(3)),
        bodyXTarget: Number(bodyXTarget.toFixed(3)),
        bodyYTarget: Number(bodyYTarget.toFixed(3)),
        bodyZTarget: Number(bodyZTarget.toFixed(3)),
        visemeWinner,
        visemeWinnerValue: Number(winnerValue.toFixed(3)),
        speechActive,
      })
    }
  }
}
