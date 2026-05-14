import type {
  StageEmbodimentPerformanceState,
  StageEmbodimentSpeechPlaybackItem,
  StageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import type { Ref } from 'vue'

import type {
  AlicizationDialoguePerformancePayload,
  AlicizationDigitalLifeSpineDigest,
} from '../../stores/alicization-bridge'
import type { EmbodimentPlaybackTelemetry } from '../../services/embodiment/playback-reconciler'

import {
  createIdleStageEmbodimentMotorState,
  createIdleStageEmbodimentPerformanceState,
  normalizeAlicizationPerformancePayload,
} from '@proj-alicization/stage-shared'
import { computed, onScopeDispose, readonly, ref, watch } from 'vue'

type StageEmbodimentPerformanceActionPulseReason = StageEmbodimentPerformanceState['actionPulse']['reason']

export interface UseStageEmbodimentPerformanceRuntimeOptions {
  digitalLifeSpineDigest?: Readonly<Ref<AlicizationDigitalLifeSpineDigest | null | undefined>>
  playbackTelemetry?: Readonly<Ref<EmbodimentPlaybackTelemetry | null>>
  speechRenderState: Readonly<Ref<StageEmbodimentSpeechRenderState | null | undefined>>
  upcomingSpeechSegment?: Readonly<Ref<StageEmbodimentSpeechPlaybackItem | null | undefined>>
}

export interface StageEmbodimentPerformanceArmOptions {
  source?: 'dialogue' | 'presence-pulse'
  variationToken?: string | null
}

export interface StageEmbodimentPerformanceResidentSyncOptions {
  allowWhileActive?: boolean
  variationToken?: string | null
}

const cooldownMs = 720
const rearmDedupWindowMs = 120
const dialogueActionPulseGapMs = 420
const segmentActionPulseGapMs = 920
const segmentBeatPulseGapMs = 240
const segmentFacialCueHoldMs = 260
const segmentActionCueHoldMs = 180
const segmentEmotionCueHoldMs = 240
const performanceEmbodimentDebugStorageKey = 'devtools/embodiment-debug'
const previewDriverCueConfidenceFloor = 0.5

function isDriverCueConfidenceSufficient(raw: unknown) {
  if (raw == null)
    return true

  return clamp01(Number(raw)) >= previewDriverCueConfidenceFloor
}

function clamp01(value: number | null | undefined, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  const finiteValue = value as number
  return Math.min(1, Math.max(0, finiteValue))
}

function clampSigned(value: number, min: number, max: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(max, Math.max(min, value))
}

function roundTenths(value: number) {
  return Math.round(clamp01(value) * 10) / 10
}

function clampFactor(value: number, fallback = 1, bounds: { min: number, max: number } = { min: 0.72, max: 1.26 }) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(bounds.max, Math.max(bounds.min, value))
}

function isPerformanceEmbodimentDebugEnabled() {
  try {
    return globalThis.localStorage?.getItem(performanceEmbodimentDebugStorageKey) === 'true'
  }
  catch {
    return false
  }
}

function logPerformanceEmbodimentDebug(event: string, payload?: Record<string, unknown>) {
  if (!isPerformanceEmbodimentDebugEnabled())
    return

  console.info('[stage-embodiment][performance]', {
    event,
    ...payload,
  })
}

function resolveSpinePerformanceBias(digest: AlicizationDigitalLifeSpineDigest | null | undefined) {
  const mode = digest?.architecture?.operatingMode
  const watchMode = digest?.runtime.watchMode
  const dominantSystem = digest?.architecture?.dominantSystem
  const recallMode = (digest?.memory?.recallMode ?? '').trim().toLowerCase()
  const confidence = clamp01(digest?.proactive?.confidence ?? 0.5, 0.5)

  let expressionBias = 1
  let actionBias = 1
  let prosodyBias = 1
  let breathBias = 1
  let focusBias = 1

  switch (mode) {
    case 'acting':
      actionBias += 0.12
      focusBias -= 0.06
      prosodyBias += 0.04
      break
    case 'thinking':
      focusBias += 0.12
      actionBias -= 0.08
      prosodyBias -= 0.04
      break
    case 'speaking':
      expressionBias += 0.04
      prosodyBias += 0.1
      break
    case 'observing':
      focusBias += 0.06
      actionBias -= 0.06
      break
    case 'remembering':
      focusBias += 0.08
      breathBias += 0.08
      prosodyBias -= 0.06
      break
    default:
      break
  }

  if (watchMode === 'recovering') {
    expressionBias -= 0.12
    actionBias -= 0.14
    breathBias += 0.12
  }

  switch (dominantSystem) {
    case 'dialogue':
      prosodyBias += 0.08
      expressionBias += 0.04
      break
    case 'perception':
      focusBias += 0.08
      actionBias += 0.02
      break
    case 'proactive':
    case 'control':
      actionBias += 0.1
      focusBias += 0.04
      break
    case 'memory':
      focusBias += 0.08
      breathBias += 0.08
      prosodyBias -= 0.08
      break
    case 'runtime':
      focusBias += 0.04
      break
    case 'mind':
      expressionBias += 0.06
      break
    default:
      break
  }

  if (recallMode.includes('working')) {
    focusBias += 0.08
  }
  else if (recallMode.includes('subconscious') || recallMode.includes('dream')) {
    breathBias += 0.08
    actionBias -= 0.06
  }
  else if (recallMode.includes('episodic')) {
    expressionBias += 0.04
    focusBias += 0.04
  }

  const confidenceBias = (confidence - 0.5) * 0.12
  actionBias += confidenceBias
  focusBias += confidenceBias * 0.8
  expressionBias += confidenceBias * 0.6

  return {
    actionBias: clampFactor(actionBias),
    breathBias: clampFactor(breathBias),
    expressionBias: clampFactor(expressionBias),
    focusBias: clampFactor(focusBias),
    prosodyBias: clampFactor(prosodyBias),
  }
}

function resolveSegmentCueHoldMs(
  value: number | null | undefined,
  fallback: number,
  bounds: { min: number, max: number },
) {
  if (!Number.isFinite(value))
    return fallback

  return Math.round(clampSigned(Number(value), bounds.min, bounds.max, fallback))
}

function resolvePerformanceBaseIntensity(performance: AlicizationDialoguePerformancePayload) {
  const emphasisBias = performance.emphasis === 2
    ? 0.92
    : performance.emphasis === 1
      ? 0.8
      : 0.66

  switch (performance.delivery) {
    case 'energetic':
      return clamp01(emphasisBias + 0.08)
    case 'firm':
      return clamp01(emphasisBias + 0.04)
    case 'hesitant':
      return clamp01(emphasisBias - 0.08, 0.52)
    case 'gentle':
      return clamp01(emphasisBias - 0.03, 0.54)
    case 'teasing':
      return clamp01(emphasisBias + 0.05)
    case 'calm':
    default:
      return emphasisBias
  }
}

function resolvePerformanceFocusBase(performance: AlicizationDialoguePerformancePayload) {
  const emphasisBoost = performance.emphasis === 2
    ? 0.18
    : performance.emphasis === 1
      ? 0.1
      : 0

  switch (performance.baseEmotion) {
    case 'thinking':
      return 0.72 + emphasisBoost
    case 'concerned':
    case 'apologetic':
      return 0.62 + emphasisBoost * 0.8
    case 'angry':
      return 0.66 + emphasisBoost
    case 'surprised':
      return 0.58 + emphasisBoost
    case 'happy':
      return 0.5 + emphasisBoost * 0.7
    case 'sad':
    case 'tired':
      return 0.42 + emphasisBoost * 0.5
    case 'neutral':
    default:
      return 0.46 + emphasisBoost * 0.6
  }
}

function roundHundredths(value: number, fallback = 0) {
  return Number(clamp01(value, fallback).toFixed(2))
}

function roundSignedHundredths(value: number, fallback = 0) {
  return Number(clampSigned(value, -1, 1, fallback).toFixed(2))
}

function normalizeDriverSegmentId(segmentId: string | null | undefined) {
  const normalized = segmentId?.trim()
  return normalized || null
}

function matchesDriverSegment(
  driverSegmentId: string | null | undefined,
  activeSegmentId: string | null | undefined,
) {
  const normalizedDriverSegmentId = normalizeDriverSegmentId(driverSegmentId)
  const normalizedActiveSegmentId = normalizeDriverSegmentId(activeSegmentId)
  if (!normalizedActiveSegmentId)
    return true
  if (!normalizedDriverSegmentId)
    return false
  return normalizedDriverSegmentId === normalizedActiveSegmentId
}

function resolvePlaybackDriverFaceMetadata(
  item: StageEmbodimentSpeechPlaybackItem | null | undefined,
) {
  const candidate = item?.metadata?.embodimentPlayback
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    return null

  const face = (candidate as EmbodimentPlaybackTelemetry).drivers?.face
  if (!face)
    return null
  if (!isDriverCueConfidenceSufficient(face.confidence))
    return null

  return {
    facialCue: face.facialCue?.trim() || null,
    intensity: clamp01(face.intensity ?? 0),
    postUtteranceCue: face.postUtteranceCue?.trim() || null,
    preUtteranceCue: face.preUtteranceCue?.trim() || null,
    segmentId: normalizeDriverSegmentId(face.segmentId),
  }
}

function resolvePlaybackDriverMotionMetadata(
  item: StageEmbodimentSpeechPlaybackItem | null | undefined,
) {
  const candidate = item?.metadata?.embodimentPlayback
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    return null

  const motion = (candidate as EmbodimentPlaybackTelemetry).drivers?.motion
  if (!motion)
    return null
  if (!isDriverCueConfidenceSufficient(motion.confidence))
    return null

  return {
    actionCue: motion.actionCue?.trim() || null,
    holdMs: Math.max(0, Math.round(motion.holdMs ?? 0)),
    intensity: clamp01(motion.intensity ?? 0),
    segmentId: normalizeDriverSegmentId(motion.segmentId),
  }
}

function resolveExplicitPlaybackDriverFaceMetadata(input: {
  segmentId?: string | null
  telemetry: EmbodimentPlaybackTelemetry | null | undefined
}) {
  const face = input.telemetry?.drivers.face
  if (!face)
    return null
  if (!isDriverCueConfidenceSufficient(face.confidence))
    return null
  if (!matchesDriverSegment(face.segmentId, input.segmentId))
    return null

  return {
    facialCue: face.facialCue?.trim() || null,
    intensity: clamp01(face.intensity ?? 0),
    postUtteranceCue: face.postUtteranceCue?.trim() || null,
    preUtteranceCue: face.preUtteranceCue?.trim() || null,
    segmentId: normalizeDriverSegmentId(face.segmentId),
  }
}

function resolveExplicitPlaybackDriverMotionMetadata(input: {
  segmentId?: string | null
  telemetry: EmbodimentPlaybackTelemetry | null | undefined
}) {
  const motion = input.telemetry?.drivers.motion
  if (!motion)
    return null
  if (!isDriverCueConfidenceSufficient(motion.confidence))
    return null
  if (!matchesDriverSegment(motion.segmentId, input.segmentId))
    return null

  return {
    actionCue: motion.actionCue?.trim() || null,
    holdMs: Math.max(0, Math.round(motion.holdMs ?? 0)),
    intensity: clamp01(motion.intensity ?? 0),
    segmentId: normalizeDriverSegmentId(motion.segmentId),
  }
}

function resolveExplicitPlaybackDriverLipSyncMetadata(input: {
  playbackPhase: 'idle' | 'playing'
  segmentId?: string | null
  telemetry: EmbodimentPlaybackTelemetry | null | undefined
}) {
  const lipsync = input.telemetry?.drivers.lipsync
  if (!lipsync || lipsync.playbackPhase !== input.playbackPhase)
    return null
  if (!matchesDriverSegment(lipsync.segmentId, input.segmentId))
    return null

  return {
    mode: lipsync.mode,
    playbackPhase: lipsync.playbackPhase,
    segmentId: normalizeDriverSegmentId(lipsync.segmentId),
    visemeHints: lipsync.visemeHints
      .filter(hint => matchesDriverSegment(hint.segmentId, input.segmentId))
      .map(hint => ({
        segmentId: hint.segmentId,
        viseme: hint.viseme,
        weight: clamp01(hint.weight),
      })),
  }
}

function resolvePlaybackDriverVisemePeakWeight(
  lipsync: ReturnType<typeof resolveExplicitPlaybackDriverLipSyncMetadata>,
) {
  if (!lipsync)
    return 0

  return lipsync.visemeHints.reduce((peak, hint) => {
    return Math.max(peak, clamp01(hint.weight))
  }, 0)
}

function mixUnit(from: number, to: number, amount: number) {
  return roundHundredths(from + (to - from) * clamp01(amount))
}

function mixSigned(from: number, to: number, amount: number) {
  return roundSignedHundredths(from + (to - from) * clamp01(amount))
}

function createDigitalLifeFrameSignature(item: StageEmbodimentSpeechPlaybackItem | null | undefined) {
  const frame = item?.digitalLifeFrame
  if (!frame)
    return ''

  return JSON.stringify([
    frame.id,
    frame.mode,
    frame.face.emotion,
    frame.face.facialCue ?? null,
    frame.action.actionCue ?? null,
    frame.motor.stillness,
    frame.motor.expressivity,
    frame.motor.gaze.focus,
    frame.motor.gaze.stability,
    frame.motor.gaze.azimuth,
    frame.motor.gaze.elevation,
    frame.motor.head.yaw,
    frame.motor.head.pitch,
    frame.motor.head.roll,
    frame.motor.head.nod,
    frame.motor.breath.amplitude,
    frame.motor.breath.pace,
    frame.motor.facial.eyeOpenness,
    frame.motor.facial.browLift,
    frame.motor.facial.browTension,
    frame.motor.facial.cheekLift,
    frame.motor.facial.mouthSpread,
    frame.motor.facial.mouthRound,
    frame.motor.facial.jawOpenBias,
    frame.motor.body.sway,
    frame.motor.body.lean,
    frame.motor.body.openness,
    frame.motor.body.settle,
  ])
}

function createPlaybackTelemetrySignature(
  telemetry: EmbodimentPlaybackTelemetry | null | undefined,
) {
  if (!telemetry)
    return ''

  return JSON.stringify([
    telemetry.actualDurationMs,
    telemetry.driftMs,
    telemetry.plannedDurationMs,
    telemetry.settleMs,
    telemetry.stopReason,
    telemetry.drivers.face?.segmentId ?? '',
    telemetry.drivers.face?.facialCue ?? '',
    telemetry.drivers.face?.preUtteranceCue ?? '',
    telemetry.drivers.face?.postUtteranceCue ?? '',
    telemetry.drivers.face?.intensity ?? 0,
    telemetry.drivers.motion?.segmentId ?? '',
    telemetry.drivers.motion?.actionCue ?? '',
    telemetry.drivers.motion?.intensity ?? 0,
    telemetry.drivers.motion?.holdMs ?? 0,
    telemetry.drivers.lipsync?.mode ?? '',
    telemetry.drivers.lipsync?.playbackPhase ?? '',
    telemetry.drivers.lipsync?.segmentId ?? '',
    ...(telemetry.drivers.lipsync?.visemeHints.flatMap(hint => [
      hint.segmentId,
      hint.viseme,
      clamp01(hint.weight),
    ]) ?? []),
  ])
}

function resolveFallbackMotorFromPerformance(
  performance: AlicizationDialoguePerformancePayload,
) {
  const idleMotor = createIdleStageEmbodimentMotorState()
  const emphasis = clamp01(performance.emphasis * 0.5)
  const deliveryBias = performance.delivery === 'energetic'
    ? 0.12
    : performance.delivery === 'firm'
      ? 0.06
      : performance.delivery === 'teasing'
        ? 0.08
        : performance.delivery === 'hesitant'
          ? -0.08
          : performance.delivery === 'gentle'
            ? -0.04
            : 0
  const focusBias = performance.baseEmotion === 'thinking' || performance.baseEmotion === 'concerned'
    ? 0.12
    : performance.baseEmotion === 'happy'
      ? -0.04
      : 0
  const stillness = roundHundredths(idleMotor.stillness - deliveryBias * 0.5 + focusBias * 0.4 - emphasis * 0.04, idleMotor.stillness)

  return {
    ...idleMotor,
    stillness,
    expressivity: roundHundredths(idleMotor.expressivity + emphasis * 0.16 + deliveryBias * 0.6, idleMotor.expressivity),
    gaze: {
      focus: roundHundredths(idleMotor.gaze.focus + focusBias + emphasis * 0.06, idleMotor.gaze.focus),
      stability: roundHundredths(idleMotor.gaze.stability + focusBias * 0.5 - deliveryBias * 0.3, idleMotor.gaze.stability),
      azimuth: roundSignedHundredths(
        performance.delivery === 'teasing' ? 0.12 : performance.delivery === 'hesitant' ? -0.08 : 0,
        idleMotor.gaze.azimuth,
      ),
      elevation: roundSignedHundredths(
        performance.baseEmotion === 'sad' || performance.baseEmotion === 'tired'
          ? -0.12
          : performance.baseEmotion === 'happy'
            ? 0.08
            : 0,
        idleMotor.gaze.elevation,
      ),
    },
    head: {
      yaw: roundSignedHundredths(performance.delivery === 'teasing' ? 0.12 : 0, idleMotor.head.yaw),
      pitch: roundSignedHundredths(
        performance.baseEmotion === 'thinking'
          ? 0.06
          : performance.delivery === 'energetic'
            ? -0.06
            : 0,
        idleMotor.head.pitch,
      ),
      roll: roundSignedHundredths(
        performance.delivery === 'gentle' ? 0.05 : performance.delivery === 'firm' ? -0.03 : 0,
        idleMotor.head.roll,
      ),
      nod: roundHundredths(idleMotor.head.nod + emphasis * 0.12 + Math.max(0, deliveryBias) * 0.4, idleMotor.head.nod),
    },
    breath: {
      amplitude: roundHundredths(idleMotor.breath.amplitude + emphasis * 0.08 + Math.max(0, deliveryBias) * 0.2, idleMotor.breath.amplitude),
      pace: roundHundredths(idleMotor.breath.pace + deliveryBias * 0.6 + emphasis * 0.08, idleMotor.breath.pace),
    },
    facial: {
      eyeOpenness: roundHundredths(
        idleMotor.facial.eyeOpenness
        + (performance.baseEmotion === 'surprised' ? 0.2 : performance.baseEmotion === 'sad' || performance.baseEmotion === 'tired' ? -0.12 : 0),
        idleMotor.facial.eyeOpenness,
      ),
      browLift: roundSignedHundredths(
        performance.baseEmotion === 'surprised' ? 0.24 : performance.baseEmotion === 'angry' ? -0.18 : 0,
        idleMotor.facial.browLift,
      ),
      browTension: roundHundredths(
        idleMotor.facial.browTension
        + (performance.baseEmotion === 'thinking' || performance.baseEmotion === 'concerned' ? 0.12 : 0)
        + (performance.baseEmotion === 'angry' ? 0.22 : 0),
        idleMotor.facial.browTension,
      ),
      cheekLift: roundHundredths(
        idleMotor.facial.cheekLift + (performance.baseEmotion === 'happy' ? 0.2 : 0),
        idleMotor.facial.cheekLift,
      ),
      mouthSpread: roundHundredths(
        idleMotor.facial.mouthSpread + (performance.baseEmotion === 'happy' ? 0.18 : performance.delivery === 'hesitant' ? -0.08 : 0),
        idleMotor.facial.mouthSpread,
      ),
      mouthRound: roundHundredths(
        idleMotor.facial.mouthRound + (performance.baseEmotion === 'concerned' || performance.baseEmotion === 'apologetic' ? 0.1 : 0),
        idleMotor.facial.mouthRound,
      ),
      jawOpenBias: roundHundredths(idleMotor.facial.jawOpenBias + emphasis * 0.08 + Math.max(0, deliveryBias) * 0.2, idleMotor.facial.jawOpenBias),
    },
    body: {
      sway: roundSignedHundredths(deliveryBias * 0.8, idleMotor.body.sway),
      lean: roundSignedHundredths(
        performance.baseEmotion === 'thinking' || performance.baseEmotion === 'angry'
          ? 0.08
          : performance.delivery === 'hesitant'
            ? -0.08
            : 0,
        idleMotor.body.lean,
      ),
      openness: roundHundredths(
        idleMotor.body.openness
        + (performance.baseEmotion === 'happy' ? 0.14 : performance.delivery === 'hesitant' ? -0.1 : 0),
        idleMotor.body.openness,
      ),
      settle: roundHundredths(stillness + 0.06, idleMotor.body.settle),
    },
  }
}

function resolveRuntimeMotor(input: {
  activeFactor: number
  cueBeat: number
  cueFacial: number
  cueGesture: number
  cueHead: number
  motionPulse: number
  previewAhead: boolean
  speech: ReturnType<typeof syncSpeechSnapshot>
  speechDrive: number
  transientMotor: ReturnType<typeof resolveFallbackMotorFromPerformance>
}) {
  const idleMotor = createIdleStageEmbodimentMotorState()
  const base = input.transientMotor
  const activity = input.previewAhead ? input.activeFactor * 0.78 : input.activeFactor
  const dynamicExpressivity = clamp01(
    base.expressivity * 0.72
    + input.speechDrive * 0.14
    + input.motionPulse * 0.18
    + input.cueGesture * 0.12
    + input.cueFacial * 0.08
    + input.speech.dynamics.cadencePulse * 0.08,
    base.expressivity,
  )
  const dynamicStillness = clamp01(
    base.stillness * 0.88
    - dynamicExpressivity * 0.08
    - input.motionPulse * 0.06
    + (1 - input.speech.dynamics.cadencePulse) * 0.04
    + (input.previewAhead ? 0.06 : 0),
    base.stillness,
  )

  return {
    stillness: mixUnit(idleMotor.stillness, dynamicStillness, activity),
    expressivity: mixUnit(idleMotor.expressivity, dynamicExpressivity, activity),
    gaze: {
      focus: mixUnit(idleMotor.gaze.focus, clamp01(base.gaze.focus + input.cueHead * 0.06 + input.cueFacial * 0.04), activity),
      stability: mixUnit(idleMotor.gaze.stability, clamp01(base.gaze.stability + dynamicStillness * 0.08 - input.cueBeat * 0.04), activity),
      azimuth: mixSigned(idleMotor.gaze.azimuth, clampSigned(base.gaze.azimuth + input.cueHead * 0.12, -1, 1), activity),
      elevation: mixSigned(idleMotor.gaze.elevation, clampSigned(base.gaze.elevation + (input.speech.dynamics.speechEnergy - 0.5) * 0.12, -1, 1), activity),
    },
    head: {
      yaw: mixSigned(idleMotor.head.yaw, clampSigned(base.head.yaw + input.cueHead * 0.16 + input.cueGesture * 0.08, -1, 1), activity),
      pitch: mixSigned(idleMotor.head.pitch, clampSigned(base.head.pitch + (input.speech.dynamics.cadencePulse - 0.5) * 0.14, -1, 1), activity),
      roll: mixSigned(idleMotor.head.roll, clampSigned(base.head.roll + input.motionPulse * 0.06, -1, 1), activity),
      nod: mixUnit(idleMotor.head.nod, clamp01(base.head.nod + input.cueBeat * 0.16 + input.speech.dynamics.cadencePulse * 0.14), activity),
    },
    breath: {
      amplitude: mixUnit(idleMotor.breath.amplitude, clamp01(base.breath.amplitude + input.speech.dynamics.speechEnergy * 0.12 + input.cueBeat * 0.06), activity),
      pace: mixUnit(idleMotor.breath.pace, clamp01(base.breath.pace + input.speech.dynamics.cadencePulse * 0.18), activity),
    },
    facial: {
      eyeOpenness: mixUnit(idleMotor.facial.eyeOpenness, clamp01(base.facial.eyeOpenness + input.cueFacial * 0.04), activity),
      browLift: mixSigned(idleMotor.facial.browLift, clampSigned(base.facial.browLift + input.cueFacial * 0.08 - input.cueBeat * 0.04, -1, 1), activity),
      browTension: mixUnit(idleMotor.facial.browTension, clamp01(base.facial.browTension + input.cueFacial * 0.08 + input.cueHead * 0.04), activity),
      cheekLift: mixUnit(idleMotor.facial.cheekLift, clamp01(base.facial.cheekLift + input.speech.dynamics.speechEnergy * 0.06), activity),
      mouthSpread: mixUnit(idleMotor.facial.mouthSpread, clamp01(base.facial.mouthSpread + input.speechDrive * 0.06), activity),
      mouthRound: mixUnit(idleMotor.facial.mouthRound, clamp01(base.facial.mouthRound + (1 - input.speechDrive) * 0.04), activity),
      jawOpenBias: mixUnit(idleMotor.facial.jawOpenBias, clamp01(base.facial.jawOpenBias + input.speechDrive * 0.12), activity),
    },
    body: {
      sway: mixSigned(idleMotor.body.sway, clampSigned(base.body.sway + input.motionPulse * 0.12 + input.cueGesture * 0.08, -1, 1), activity),
      lean: mixSigned(idleMotor.body.lean, clampSigned(base.body.lean + input.cueHead * 0.08, -1, 1), activity),
      openness: mixUnit(idleMotor.body.openness, clamp01(base.body.openness + dynamicExpressivity * 0.08 - dynamicStillness * 0.04), activity),
      settle: mixUnit(idleMotor.body.settle, clamp01(base.body.settle + dynamicStillness * 0.1 - input.motionPulse * 0.04), activity),
    },
  }
}

function syncSpeechSnapshot(speech: {
  active: boolean
  dynamics: {
    speechEnergy: number
    prosodyIntensity: number
    emphasisLevel: number
    cadencePulse: number
  }
  item: StageEmbodimentSpeechPlaybackItem | null
  phase: 'idle' | 'starting' | 'playing' | 'stopping'
  visemeIntensity: number
} | StageEmbodimentSpeechRenderState | null | undefined) {
  return {
    active: speech?.active === true,
    phase: speech?.phase ?? 'idle',
    item: speech?.item
      ? {
          ...speech.item,
          cue: speech.item.cue ? { ...speech.item.cue } : null,
        }
      : null,
    visemeIntensity: clamp01(speech?.visemeIntensity ?? 0),
    dynamics: {
      speechEnergy: clamp01(speech?.dynamics.speechEnergy ?? 0),
      prosodyIntensity: clamp01(speech?.dynamics.prosodyIntensity ?? 0),
      emphasisLevel: clamp01(speech?.dynamics.emphasisLevel ?? 0),
      cadencePulse: clamp01(speech?.dynamics.cadencePulse ?? 0),
    },
  }
}

function syncUpcomingSegmentSnapshot(segment: StageEmbodimentSpeechPlaybackItem | null | undefined) {
  if (!segment)
    return null

  return {
    ...segment,
    cue: segment.cue ? { ...segment.cue } : null,
  } satisfies StageEmbodimentSpeechPlaybackItem
}

function cloneActiveCue(cue: StageEmbodimentPerformanceState['activeCue']) {
  if (!cue)
    return null

  return {
    ...cue,
    rendererSettle: cue.rendererSettle
      ? {
          live2dFacialReleaseMs: cue.rendererSettle.live2dFacialReleaseMs,
          live2dMotionFollowThroughMs: cue.rendererSettle.live2dMotionFollowThroughMs,
          vrmActionFadeMs: cue.rendererSettle.vrmActionFadeMs,
          vrmExpressionBlendMs: cue.rendererSettle.vrmExpressionBlendMs,
        }
      : null,
    rendererHints: cue.rendererHints
      ? {
          preferredExpressionAliases: cue.rendererHints.preferredExpressionAliases
            ? [...cue.rendererHints.preferredExpressionAliases]
            : undefined,
          preferredMotionAliases: cue.rendererHints.preferredMotionAliases
            ? [...cue.rendererHints.preferredMotionAliases]
            : undefined,
        }
      : null,
  }
}

function shouldAllowDenseActionPulsePair(
  previousReason: StageEmbodimentPerformanceActionPulseReason,
  nextReason: StageEmbodimentPerformanceActionPulseReason,
) {
  return (
    (previousReason === 'segment-start' && nextReason === 'segment-beat')
    || (previousReason === 'segment-start' && nextReason === 'segment-preview')
    || (previousReason === 'segment-shift' && nextReason === 'segment-preview')
    || (previousReason === 'segment-beat' && nextReason === 'segment-preview')
    || (previousReason === 'dialogue' && nextReason === 'segment-start')
    || (previousReason === 'dialogue' && nextReason === 'segment-preview')
    || (previousReason === 'segment-preview' && nextReason === 'segment-start')
  )
}

export function useStageEmbodimentPerformanceRuntime(options: UseStageEmbodimentPerformanceRuntimeOptions) {
  const state = ref(createIdleStageEmbodimentPerformanceState())
  const debugState = {
    lastSnapshotAt: 0,
    lastSnapshotSignature: '',
  }
  let lastTickAt = 0
  let lastActionPulseAt: number | null = null
  let lastActionPulseReason: StageEmbodimentPerformanceActionPulseReason = null
  let lastArmedAt = 0
  let lastArmSignature = ''
  let lastResidentSyncedAt = 0
  let lastResidentSignature = ''
  let lastSegmentId = ''
  let lastBeatPulseSegmentKey = ''
  let lastPreviewPulseSegmentId = ''
  let lastCadencePeakActive = false
  let heldSegmentFacialCue: string | null = null
  let heldSegmentFacialCueUntil = 0
  let heldSegmentActionCue: string | null = null
  let heldSegmentActionCueUntil = 0
  let heldSegmentCue: StageEmbodimentPerformanceState['activeCue'] = null
  let heldSegmentCueUntil = 0
  let cooldownTimer: ReturnType<typeof setTimeout> | undefined

  function clearCooldownTimer() {
    if (cooldownTimer) {
      clearTimeout(cooldownTimer)
      cooldownTimer = undefined
    }
  }

  function clearTransientSpeechCarry(now: number) {
    lastTickAt = now
    lastActionPulseAt = null
    lastActionPulseReason = null
    lastSegmentId = ''
    lastBeatPulseSegmentKey = ''
    lastPreviewPulseSegmentId = ''
    lastCadencePeakActive = false
    heldSegmentFacialCue = null
    heldSegmentFacialCueUntil = 0
    heldSegmentActionCue = null
    heldSegmentActionCueUntil = 0
    heldSegmentCue = null
    heldSegmentCueUntil = 0
  }

  function reset(now = performance.now()) {
    clearCooldownTimer()
    clearTransientSpeechCarry(now)
    lastArmSignature = ''
    state.value = {
      ...createIdleStageEmbodimentPerformanceState(),
      revision: state.value.revision + 1,
      updatedAt: now,
    }
  }

  function scheduleCooldownExpiry(now: number) {
    clearCooldownTimer()
    const remainingMs = Math.max(0, (state.value.cooldownUntil ?? now) - now)
    cooldownTimer = setTimeout(() => {
      if (state.value.phase !== 'cooldown')
        return

      const currentNow = performance.now()
      if ((state.value.cooldownUntil ?? 0) > currentNow) {
        scheduleCooldownExpiry(currentNow)
        return
      }

      reset(currentNow)
    }, remainingMs)
  }

  function issueActionPulse(
    reason: StageEmbodimentPerformanceActionPulseReason,
    now: number,
    minimumGapMs: number,
    cueOverride?: string | null,
  ) {
    const cue = cueOverride?.trim()
      || state.value.activeActionCue
      || state.value.performance.actionCue
      || state.value.residentPerformance.actionCue
      || null
    if (!cue)
      return
    if (
      lastActionPulseAt != null
      && now - lastActionPulseAt < minimumGapMs
      && !shouldAllowDenseActionPulsePair(lastActionPulseReason, reason)
    ) {
      return
    }

    lastActionPulseAt = now
    lastActionPulseReason = reason
    state.value.actionPulse = {
      revision: state.value.actionPulse.revision + 1,
      cue,
      issuedAt: now,
      reason,
      segmentId: state.value.activeSegment?.segmentId ?? null,
    }
    state.value.motionPulse = 1
  }

  function resolveTransientCueLayer(
    now: number,
    options: {
      holdMs: number
      heldCue: string | null
      heldUntil: number
      residentCue: string | null
      segmentCue: string | null
      suppressResidentCue?: boolean
    },
  ) {
    const segmentCue = options.segmentCue?.trim() ?? ''
    const residentCue = options.residentCue?.trim() ?? ''

    if (segmentCue) {
      return {
        cue: segmentCue,
        source: 'segment' as const,
        heldCue: segmentCue,
        heldUntil: now + options.holdMs,
      }
    }

    if (options.suppressResidentCue) {
      return {
        cue: null,
        source: 'none' as const,
        heldCue: null,
        heldUntil: 0,
      }
    }

    if (options.heldCue && options.heldUntil > now) {
      return {
        cue: options.heldCue,
        source: 'segment' as const,
        heldCue: options.heldCue,
        heldUntil: options.heldUntil,
      }
    }

    return {
      cue: residentCue || null,
      source: residentCue ? 'resident' as const : 'none' as const,
      heldCue: null,
      heldUntil: 0,
    }
  }

  function resolveTransientActiveCueLayer(
    now: number,
    options: {
      holdMs: number
      heldCue: StageEmbodimentPerformanceState['activeCue']
      heldUntil: number
      previewCue: StageEmbodimentPerformanceState['activeCue']
      segmentCue: StageEmbodimentPerformanceState['activeCue']
    },
  ) {
    if (options.previewCue) {
      return {
        cue: cloneActiveCue(options.previewCue),
        source: 'preview' as const,
        heldCue: options.heldCue,
        heldUntil: options.heldUntil,
      }
    }

    if (options.segmentCue) {
      const nextCue = cloneActiveCue(options.segmentCue)
      return {
        cue: nextCue,
        source: 'segment' as const,
        heldCue: nextCue,
        heldUntil: now + options.holdMs,
      }
    }

    if (options.heldCue && options.heldUntil > now) {
      return {
        cue: cloneActiveCue(options.heldCue),
        source: 'segment' as const,
        heldCue: options.heldCue,
        heldUntil: options.heldUntil,
      }
    }

    return {
      cue: null,
      source: 'none' as const,
      heldCue: null,
      heldUntil: 0,
    }
  }

  function updateFromSpeech(now = performance.now()) {
    const speech = syncSpeechSnapshot(options.speechRenderState.value)
    const playbackTelemetry = options.playbackTelemetry?.value ?? null
    const previewAhead = !speech.active || speech.phase === 'stopping'
    const upcomingSegment = previewAhead
      ? syncUpcomingSegmentSnapshot(options.upcomingSpeechSegment?.value)
      : null
    const deltaSeconds = clampSigned((now - lastTickAt) / 1000, 1 / 240, 0.2, 1 / 60)
    lastTickAt = now

    const motionDecay = 1 - Math.exp(-deltaSeconds * 7)
    state.value.motionPulse += (0 - state.value.motionPulse) * motionDecay
    state.value.motionPulse = clamp01(state.value.motionPulse)

    const previousSegmentId = lastSegmentId
    const segmentId = speech.item?.segmentId ?? ''
    const segmentCue = speech.item?.cue ?? null
    const segmentLife = speech.item?.digitalLifeFrame ?? null
    const segmentDriverFace = speech.active
      ? resolveExplicitPlaybackDriverFaceMetadata({
          segmentId,
          telemetry: playbackTelemetry,
        }) ?? resolvePlaybackDriverFaceMetadata(speech.item)
      : null
    const segmentDriverMotion = speech.active
      ? resolveExplicitPlaybackDriverMotionMetadata({
          segmentId,
          telemetry: playbackTelemetry,
        }) ?? resolvePlaybackDriverMotionMetadata(speech.item)
      : null
    const segmentDriverLipSync = speech.active
      ? resolveExplicitPlaybackDriverLipSyncMetadata({
          playbackPhase: 'playing',
          segmentId,
          telemetry: playbackTelemetry,
        })
      : null
    const residentPerformance = state.value.residentPerformance
    const segmentChanged = Boolean(segmentId) && segmentId !== lastSegmentId
    const segmentGestureWeight = Math.max(
      clamp01(segmentCue?.gestureWeight),
      clamp01(segmentLife?.action.intensity),
      clamp01(segmentDriverMotion?.intensity),
    )
    if (segmentChanged) {
      lastSegmentId = segmentId
      lastPreviewPulseSegmentId = segmentId
      if (speech.active && ((segmentCue?.actionWindow !== 'none') || segmentGestureWeight >= 0.34)) {
        issueActionPulse(
          previousSegmentId ? 'segment-shift' : 'segment-start',
          now,
          segmentActionPulseGapMs,
          segmentLife?.action.actionCue ?? segmentCue?.actionCue ?? segmentDriverMotion?.actionCue,
        )
      }
    }
    else if (!speech.active && !segmentId) {
      lastSegmentId = ''
    }

    const previewSegmentId = upcomingSegment?.segmentId ?? ''
    const previewCue = upcomingSegment?.cue ?? null
    const previewLife = upcomingSegment?.digitalLifeFrame ?? null
    const previewDriverFace = resolvePlaybackDriverFaceMetadata(upcomingSegment)
    const previewDriverMotion = resolvePlaybackDriverMotionMetadata(upcomingSegment)
    const previewGestureWeight = Math.max(
      clamp01(previewCue?.gestureWeight),
      clamp01(previewLife?.action.intensity),
    )
    if (previewAhead && previewSegmentId) {
      if (
        previewSegmentId !== lastPreviewPulseSegmentId
        && (previewCue?.actionWindow === 'segment-start' || previewGestureWeight >= 0.34)
      ) {
        issueActionPulse(
          'segment-preview',
          now,
          segmentActionPulseGapMs,
          previewLife?.action.actionCue ?? previewCue?.actionCue ?? previewDriverMotion?.actionCue,
        )
      }
      lastPreviewPulseSegmentId = previewSegmentId
    }
    else if (!previewSegmentId) {
      lastPreviewPulseSegmentId = ''
    }

    const cadencePeakActive = Boolean(
      speech.active
      && segmentCue?.actionWindow === 'cadence-peak'
      && Math.max(clamp01(segmentCue.beatWeight), clamp01(segmentLife?.action.intensity), clamp01(segmentDriverMotion?.intensity)) >= 0.44
      && speech.dynamics.cadencePulse >= Math.max(0.46, 0.68 - Math.max(clamp01(segmentCue.beatWeight), clamp01(segmentLife?.action.intensity), clamp01(segmentDriverMotion?.intensity)) * 0.18),
    )
    if (cadencePeakActive && !lastCadencePeakActive) {
      const beatSegmentKey = `${segmentId}:${state.value.actionPulse.revision}`
      if (beatSegmentKey !== lastBeatPulseSegmentKey) {
        issueActionPulse('segment-beat', now, segmentBeatPulseGapMs, segmentLife?.action.actionCue ?? segmentCue?.actionCue ?? segmentDriverMotion?.actionCue)
        lastBeatPulseSegmentKey = beatSegmentKey
      }
    }
    lastCadencePeakActive = cadencePeakActive

    const previewDriverFacialCue = previewDriverFace?.preUtteranceCue ?? previewDriverFace?.facialCue ?? null
    const stoppingDriverFace = !speech.active && !previewSegmentId
      ? resolveExplicitPlaybackDriverFaceMetadata({
          segmentId: speech.item?.segmentId ?? null,
          telemetry: playbackTelemetry,
        }) ?? resolvePlaybackDriverFaceMetadata(speech.item)
      : null
    const previewFacialCue = previewCue?.facialCue
      ?? previewDriverFacialCue
      ?? stoppingDriverFace?.postUtteranceCue
      ?? stoppingDriverFace?.facialCue
      ?? null

    const segmentSuppressResidentFacialCue = Boolean(
      speech.active
      && segmentLife
      && segmentLife.face.expressionMode === 'recover'
      && !segmentCue?.facialCue,
    )
    const previewSuppressResidentFacialCue = Boolean(
      previewAhead
      && previewLife
      && previewLife.face.expressionMode === 'recover'
      && !previewCue?.facialCue,
    )
    const segmentSuppressResidentActionCue = Boolean(
      speech.active
      && segmentLife
      && segmentLife.action.actionMode === 'none'
      && !segmentCue?.actionCue,
    )
    const previewSuppressResidentActionCue = Boolean(
      previewAhead
      && previewLife
      && previewLife.action.actionMode === 'none'
      && !previewCue?.actionCue,
    )

    const facialCueLayer = previewAhead
      ? previewFacialCue
          ? {
              cue: previewFacialCue,
              source: 'preview' as const,
              heldCue: null,
              heldUntil: 0,
            }
          : resolveTransientCueLayer(now, {
              holdMs: resolveSegmentCueHoldMs(
                previewCue?.facialHoldMs,
                segmentFacialCueHoldMs,
                { min: 90, max: 920 },
              ),
              heldCue: heldSegmentFacialCue,
              heldUntil: heldSegmentFacialCueUntil,
              residentCue: residentPerformance.facialCue ?? null,
              segmentCue: null,
              suppressResidentCue: previewSuppressResidentFacialCue,
            })
      : resolveTransientCueLayer(now, {
          holdMs: resolveSegmentCueHoldMs(
            segmentCue?.facialHoldMs,
            segmentFacialCueHoldMs,
            { min: 90, max: 920 },
          ),
          heldCue: heldSegmentFacialCue,
          heldUntil: heldSegmentFacialCueUntil,
          residentCue: residentPerformance.facialCue ?? null,
          segmentCue: segmentCue?.facialCue ?? segmentDriverFace?.facialCue ?? null,
          suppressResidentCue: segmentSuppressResidentFacialCue,
        })
    heldSegmentFacialCue = facialCueLayer.heldCue
    heldSegmentFacialCueUntil = facialCueLayer.heldUntil

    const actionCueLayer = previewAhead
      ? previewCue?.actionCue
          ? {
              cue: previewCue.actionCue,
              source: 'preview' as const,
              heldCue: null,
              heldUntil: 0,
            }
          : resolveTransientCueLayer(now, {
              holdMs: resolveSegmentCueHoldMs(
                previewCue?.actionHoldMs,
                segmentActionCueHoldMs,
                { min: 70, max: 720 },
              ),
              heldCue: heldSegmentActionCue,
              heldUntil: heldSegmentActionCueUntil,
              residentCue: residentPerformance.actionCue ?? null,
              segmentCue: previewDriverMotion?.actionCue ?? null,
              suppressResidentCue: previewSuppressResidentActionCue,
            })
      : resolveTransientCueLayer(now, {
          holdMs: resolveSegmentCueHoldMs(
            segmentCue?.actionHoldMs,
            segmentActionCueHoldMs,
            { min: 70, max: 720 },
          ),
          heldCue: heldSegmentActionCue,
          heldUntil: heldSegmentActionCueUntil,
          residentCue: residentPerformance.actionCue ?? null,
          segmentCue: segmentCue?.actionCue ?? segmentDriverMotion?.actionCue ?? null,
          suppressResidentCue: segmentSuppressResidentActionCue,
        })
    heldSegmentActionCue = actionCueLayer.heldCue
    heldSegmentActionCueUntil = actionCueLayer.heldUntil

    const activeCueLayer = resolveTransientActiveCueLayer(now, {
      holdMs: resolveSegmentCueHoldMs(
        segmentCue?.emotionHoldMs,
        segmentEmotionCueHoldMs,
        { min: 80, max: 960 },
      ),
      heldCue: heldSegmentCue,
      heldUntil: heldSegmentCueUntil,
      previewCue,
      segmentCue,
    })
    heldSegmentCue = activeCueLayer.heldCue
    heldSegmentCueUntil = activeCueLayer.heldUntil

    if (speech.active) {
      clearCooldownTimer()
      if (state.value.phase === 'idle')
        state.value.phase = 'armed'
      state.value.phase = 'speaking'
      state.value.cooldownUntil = null
      if (state.value.speakingStartedAt == null)
        state.value.speakingStartedAt = now
    }
    else if (state.value.phase === 'speaking') {
      state.value.phase = 'cooldown'
      state.value.cooldownUntil = now + cooldownMs
      scheduleCooldownExpiry(now)
    }

    const transientCue = activeCueLayer.cue
    const performance = {
      ...residentPerformance,
      baseEmotion: transientCue?.emotion ?? residentPerformance.baseEmotion,
      emotion: transientCue?.emotion ?? residentPerformance.emotion,
      facialCue: facialCueLayer.cue,
      actionCue: actionCueLayer.cue,
    } satisfies AlicizationDialoguePerformancePayload
    const baseIntensity = resolvePerformanceBaseIntensity(performance)
    const transientCueScale = previewAhead
      ? transientCue ? 0.74 : 1
      : 1
    const transientLife = speech.active ? segmentLife : previewLife
    const cueGesture = clamp01(Math.max(transientCue?.gestureWeight ?? 0, transientLife?.action.intensity ?? 0) * transientCueScale)
    const cueFacial = clamp01(Math.max(transientCue?.facialWeight ?? 0, transientLife?.face.intensity ?? 0) * transientCueScale)
    const cueProsody = clamp01(Math.max(transientCue?.prosodyWeight ?? 0, transientLife?.voice.cadence ?? 0) * transientCueScale)
    const cueBeat = clamp01(Math.max(transientCue?.beatWeight ?? 0, transientLife?.action.intensity ?? 0) * transientCueScale)
    const driverVisemeWeight = resolvePlaybackDriverVisemePeakWeight(segmentDriverLipSync)
    const cueMouth = clamp01(Math.max(
      ((transientCue?.mouthWeight ?? cueProsody) * (transientLife?.lipSync.mouthScale ?? 1)) * transientCueScale,
      driverVisemeWeight * transientCueScale,
    ))
    const cueHead = clamp01(Math.max(transientCue?.headWeight ?? cueGesture, transientLife?.action.intensity ?? 0) * transientCueScale)
    const voiceEnergyScale = clampSigned(transientLife?.voice.energy ?? 1, 0.4, 1.25, 1)
    const speechDrive = clamp01(Math.max(
      speech.dynamics.speechEnergy * 0.9,
      speech.dynamics.prosodyIntensity * 0.8,
      speech.visemeIntensity * 0.72,
      cueMouth * 0.54,
      driverVisemeWeight * 0.68,
    ) * voiceEnergyScale)
    const transientMotor = transientLife?.motor ?? resolveFallbackMotorFromPerformance(performance)
    const focusBase = resolvePerformanceFocusBase(performance)
    const spineBias = resolveSpinePerformanceBias(options.digitalLifeSpineDigest?.value)
    const motionPulse = clamp01(state.value.motionPulse)
    const releaseFactor = state.value.phase === 'cooldown'
      ? clamp01(((state.value.cooldownUntil ?? now) - now) / cooldownMs, 0)
      : 1
    const activeFactor = speech.active ? 1 : state.value.phase === 'idle' ? 0 : releaseFactor
    const runtimeMotor = resolveRuntimeMotor({
      activeFactor,
      cueBeat,
      cueFacial,
      cueGesture,
      cueHead,
      motionPulse,
      previewAhead,
      speech,
      speechDrive,
      transientMotor,
    })

    state.value = {
      ...state.value,
      revision: state.value.revision + 1,
      performance,
      activeFacialCue: facialCueLayer.cue,
      activeFacialCueSource: facialCueLayer.source,
      activeActionCue: actionCueLayer.cue,
      activeActionCueSource: actionCueLayer.source,
      speechActive: speech.active,
      speechPhase: speech.phase,
      activeCue: cloneActiveCue(transientCue),
      activeCueSource: activeCueLayer.source,
      activeSegment: speech.item,
      expressionIntensity: roundTenths(clamp01((baseIntensity + speechDrive * 0.16 + motionPulse * 0.1 + cueFacial * 0.12 + cueMouth * 0.06 + runtimeMotor.expressivity * 0.12 + runtimeMotor.facial.cheekLift * 0.08) * spineBias.expressionBias * activeFactor)),
      facialCueIntensity: roundTenths(clamp01((baseIntensity * 0.88 + speechDrive * 0.22 + motionPulse * 0.14 + cueFacial * 0.18 + cueMouth * 0.08 + runtimeMotor.expressivity * 0.08 + runtimeMotor.facial.browTension * 0.08) * spineBias.expressionBias * activeFactor)),
      actionIntensity: roundTenths(clamp01((0.34 + performance.emphasis * 0.12 + motionPulse * 0.18 + cueGesture * 0.16 + cueHead * 0.2 + cueBeat * 0.14 + runtimeMotor.body.openness * 0.08 + (1 - runtimeMotor.stillness) * 0.12) * spineBias.actionBias * activeFactor)),
      motionPulse,
      prosodyDrive: roundTenths(clamp01(Math.max(speechDrive, speech.dynamics.cadencePulse * (0.62 + cueProsody * 0.18), cueProsody * 0.46) * spineBias.prosodyBias * activeFactor)),
      breathDrive: roundTenths(clamp01((speech.dynamics.cadencePulse * 0.44 + speech.dynamics.speechEnergy * 0.3 + motionPulse * 0.14 + cueBeat * 0.1 + cueMouth * 0.12 + runtimeMotor.breath.amplitude * 0.18 + runtimeMotor.breath.pace * 0.08) * spineBias.breathBias * activeFactor)),
      focusDrive: roundTenths(clamp01((focusBase + motionPulse * 0.14 + speechDrive * 0.08 + cueFacial * 0.06 + cueHead * 0.08 + runtimeMotor.gaze.focus * 0.12 + runtimeMotor.gaze.stability * 0.08) * spineBias.focusBias * activeFactor)),
      motor: runtimeMotor,
      updatedAt: now,
    }

    const debugSnapshotSignature = JSON.stringify([
      state.value.phase,
      state.value.speechPhase,
      state.value.performance.baseEmotion,
      state.value.performance.delivery,
      state.value.activeCueSource,
      state.value.activeFacialCueSource,
      state.value.activeActionCueSource,
      state.value.activeSegment?.segmentId ?? '',
      previewSegmentId,
    ])
    if (
      debugSnapshotSignature !== debugState.lastSnapshotSignature
      || now - debugState.lastSnapshotAt >= 220
    ) {
      debugState.lastSnapshotSignature = debugSnapshotSignature
      debugState.lastSnapshotAt = now
      logPerformanceEmbodimentDebug('runtime-drive', {
        phase: state.value.phase,
        speechPhase: state.value.speechPhase,
        emotion: state.value.performance.baseEmotion,
        delivery: state.value.performance.delivery,
        variationToken: state.value.variationToken,
        segmentId: state.value.activeSegment?.segmentId ?? null,
        previewSegmentId: previewSegmentId || null,
        activeCueSource: state.value.activeCueSource,
        activeFacialCue: state.value.activeFacialCue,
        activeActionCue: state.value.activeActionCue,
        speechActive: speech.active,
        speechDrive: Number(speechDrive.toFixed(3)),
        expressionIntensity: state.value.expressionIntensity,
        facialCueIntensity: state.value.facialCueIntensity,
        actionIntensity: state.value.actionIntensity,
        focusDrive: state.value.focusDrive,
        breathDrive: state.value.breathDrive,
      })
    }
  }

  function armPerformance(
    input: AlicizationDialoguePerformancePayload,
    armOptions: StageEmbodimentPerformanceArmOptions = {},
  ) {
    const now = performance.now()
    const performancePayload = normalizeAlicizationPerformancePayload(input, input.baseEmotion)
    const variationToken = armOptions.variationToken?.trim() ?? ''
    const signature = JSON.stringify([
      armOptions.source ?? 'dialogue',
      variationToken,
      performancePayload.baseEmotion,
      performancePayload.facialCue,
      performancePayload.actionCue,
      performancePayload.delivery,
      performancePayload.emphasis,
    ])

    if (signature === lastArmSignature && now - lastArmedAt < rearmDedupWindowMs) {
      updateFromSpeech(now)
      return
    }

    lastArmSignature = signature
    lastArmedAt = now
    clearCooldownTimer()
    clearTransientSpeechCarry(now)

    state.value = {
      ...state.value,
      revision: state.value.revision + 1,
      phase: state.value.speechActive ? 'speaking' : 'armed',
      residentPerformance: {
        ...performancePayload,
      },
      performance: performancePayload,
      activeFacialCue: performancePayload.facialCue ?? null,
      activeFacialCueSource: performancePayload.facialCue ? 'resident' : 'none',
      activeActionCue: performancePayload.actionCue ?? null,
      activeActionCueSource: performancePayload.actionCue ? 'resident' : 'none',
      variationToken: variationToken || null,
      activeCue: null,
      activeCueSource: 'none',
      armedAt: now,
      speakingStartedAt: state.value.speechActive ? (state.value.speakingStartedAt ?? now) : null,
      cooldownUntil: null,
      updatedAt: now,
    }

    issueActionPulse(armOptions.source ?? 'dialogue', now, dialogueActionPulseGapMs)
    updateFromSpeech(now)
    logPerformanceEmbodimentDebug('arm-performance', {
      source: armOptions.source ?? 'dialogue',
      emotion: performancePayload.baseEmotion,
      delivery: performancePayload.delivery,
      facialCue: performancePayload.facialCue ?? null,
      actionCue: performancePayload.actionCue ?? null,
      variationToken: variationToken || null,
    })
  }

  function syncResidentPerformance(
    input: AlicizationDialoguePerformancePayload,
    syncOptions: StageEmbodimentPerformanceResidentSyncOptions = {},
  ) {
    const now = performance.now()
    if (!syncOptions.allowWhileActive && state.value.phase !== 'idle')
      return

    const performancePayload = normalizeAlicizationPerformancePayload(input, input.baseEmotion)
    const variationToken = syncOptions.variationToken?.trim() ?? ''
    const signature = JSON.stringify([
      variationToken,
      performancePayload.baseEmotion,
      performancePayload.facialCue,
      performancePayload.actionCue,
      performancePayload.delivery,
      performancePayload.emphasis,
    ])

    if (signature === lastResidentSignature && now - lastResidentSyncedAt < rearmDedupWindowMs) {
      updateFromSpeech(now)
      return
    }

    lastResidentSignature = signature
    lastResidentSyncedAt = now
    state.value = {
      ...state.value,
      revision: state.value.revision + 1,
      residentPerformance: {
        ...performancePayload,
      },
      performance: state.value.phase === 'idle'
        ? {
            ...performancePayload,
          }
        : state.value.performance,
      activeFacialCue: state.value.phase === 'idle'
        ? performancePayload.facialCue ?? null
        : state.value.activeFacialCue,
      activeFacialCueSource: state.value.phase === 'idle'
        ? (performancePayload.facialCue ? 'resident' : 'none')
        : state.value.activeFacialCueSource,
      activeActionCue: state.value.phase === 'idle'
        ? performancePayload.actionCue ?? null
        : state.value.activeActionCue,
      activeActionCueSource: state.value.phase === 'idle'
        ? (performancePayload.actionCue ? 'resident' : 'none')
        : state.value.activeActionCueSource,
      variationToken: variationToken || state.value.variationToken,
      updatedAt: now,
    }

    updateFromSpeech(now)
  }

  function prepareForNextMessage() {
    const now = performance.now()
    const residentPerformance = normalizeAlicizationPerformancePayload(
      state.value.residentPerformance,
      state.value.residentPerformance.baseEmotion,
    )

    clearCooldownTimer()
    clearTransientSpeechCarry(now)
    lastArmSignature = ''

    state.value = {
      ...state.value,
      revision: state.value.revision + 1,
      phase: 'armed',
      residentPerformance: {
        ...residentPerformance,
      },
      performance: {
        ...residentPerformance,
      },
      activeFacialCue: residentPerformance.facialCue ?? null,
      activeFacialCueSource: residentPerformance.facialCue ? 'resident' : 'none',
      activeActionCue: residentPerformance.actionCue ?? null,
      activeActionCueSource: residentPerformance.actionCue ? 'resident' : 'none',
      speechActive: false,
      speechPhase: 'idle',
      activeCue: null,
      activeCueSource: 'none',
      activeSegment: null,
      motionPulse: 0,
      armedAt: now,
      speakingStartedAt: null,
      cooldownUntil: null,
      updatedAt: now,
      actionPulse: {
        ...state.value.actionPulse,
        cue: null,
        issuedAt: null,
        reason: null,
        segmentId: null,
      },
    }

    updateFromSpeech(now)
    logPerformanceEmbodimentDebug('prepare-next-message', {
      emotion: residentPerformance.baseEmotion,
      delivery: residentPerformance.delivery,
      facialCue: residentPerformance.facialCue ?? null,
      actionCue: residentPerformance.actionCue ?? null,
      variationToken: state.value.variationToken,
    })
  }

  watch(
    [
      () => options.speechRenderState.value?.revision ?? 0,
      () => options.upcomingSpeechSegment?.value?.segmentId ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.id ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.emotion ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.facialCue ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.actionCue ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.facialHoldMs ?? 0,
      () => options.upcomingSpeechSegment?.value?.cue?.actionHoldMs ?? 0,
      () => options.upcomingSpeechSegment?.value?.cue?.emotionHoldMs ?? 0,
      () => options.upcomingSpeechSegment?.value?.cue?.rendererHints?.preferredExpressionAliases?.join('|') ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.rendererHints?.preferredMotionAliases?.join('|') ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0,
      () => options.upcomingSpeechSegment?.value?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0,
      () => options.upcomingSpeechSegment?.value?.cue?.rendererSettle?.vrmActionFadeMs ?? 0,
      () => options.upcomingSpeechSegment?.value?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0,
      () => createDigitalLifeFrameSignature(options.upcomingSpeechSegment?.value),
      () => createPlaybackTelemetrySignature(options.playbackTelemetry?.value ?? null),
      () => options.upcomingSpeechSegment?.value?.text ?? '',
      () => options.digitalLifeSpineDigest?.value?.architecture?.operatingMode ?? '',
      () => options.digitalLifeSpineDigest?.value?.architecture?.dominantSystem ?? '',
      () => options.digitalLifeSpineDigest?.value?.proactive?.confidence ?? 0,
      () => options.digitalLifeSpineDigest?.value?.memory?.recallMode ?? '',
    ],
    () => {
      updateFromSpeech()
    },
    { immediate: true },
  )

  function dispose() {
    clearCooldownTimer()
  }

  onScopeDispose(() => {
    dispose()
  })

  return {
    armPerformance,
    clear: reset,
    dispose,
    playbackTelemetry: readonly(computed(() => options.playbackTelemetry?.value ?? null)),
    prepareForNextMessage,
    syncResidentPerformance,
    state: readonly(state) as Readonly<Ref<StageEmbodimentPerformanceState>>,
  }
}
