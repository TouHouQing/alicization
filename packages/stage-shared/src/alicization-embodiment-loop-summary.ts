import {
  describeAlicizationEmbodimentClosureHeadline,
  describeAlicizationEmbodimentClosureReminder,
} from './alicization-embodiment-closure'
import {
  buildAlicizationFaceSummary,
} from './alicization-face-summary'
import { buildAlicizationLipsyncSummary } from './alicization-lipsync-summary'
import { buildAlicizationMotionSummary } from './alicization-motion-summary'
import { buildAlicizationVoiceSummary } from './alicization-voice-summary'

function normalizeSummaryText(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  return normalized || null
}

export function buildAlicizationEmbodimentLoopSummary(input: {
  authoritySummary?: unknown
  currentBodyState?: unknown
  emotion?: unknown
  facialCue?: unknown
  expressionMode?: unknown
  intensity?: unknown
  faceHoldMs?: unknown
  preUtteranceCue?: unknown
  postUtteranceCue?: unknown
  faceResidentMode?: unknown
  faceContinuityTiming?: unknown
  preferredBlinkCadence?: unknown
  preferredGazeMode?: unknown
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
  faceReasonSummary?: unknown
  faceSource?: unknown
  faceConfidence?: unknown
  faceSegmentId?: unknown
  language?: unknown
  pitchDelta?: unknown
  rateMultiplier?: unknown
  energy?: unknown
  cadence?: unknown
  closureBias?: unknown
  consonantPrecision?: unknown
  companionshipMode?: unknown
  voiceContinuityTiming?: unknown
  voiceReasonSummary?: unknown
  voiceSource?: unknown
  voiceSegmentId?: unknown
  mode?: unknown
  phase?: unknown
  continuityHoldMs?: unknown
  topViseme?: unknown
  hintTrail?: unknown
  hintViseme?: unknown
  lipsyncCompanionshipMode?: unknown
  lipsyncContinuityTiming?: unknown
  lipsyncReasonSummary?: unknown
  lipsyncVisemeBias?: unknown
  lipsyncEnergyBias?: unknown
  mouthScale?: unknown
  lipsyncSource?: unknown
  lipsyncConfidence?: unknown
  lipsyncSegmentId?: unknown
  actionCue?: unknown
  attentionMode?: unknown
  idleBase?: unknown
  motionIntensity?: unknown
  motionHoldMs?: unknown
  motionResidentMode?: unknown
  motionContinuityTiming?: unknown
  motionReasonSummary?: unknown
  motionSource?: unknown
  motionConfidence?: unknown
  motionSegmentId?: unknown
}) {
  const face = buildAlicizationFaceSummary({
    emotion: input.emotion,
    facialCue: input.facialCue,
    expressionMode: input.expressionMode,
    intensity: input.intensity,
    holdMs: input.faceHoldMs,
    preUtteranceCue: input.preUtteranceCue,
    postUtteranceCue: input.postUtteranceCue,
    residentMode: input.faceResidentMode,
    continuityTiming: input.faceContinuityTiming,
    preferredBlinkCadence: input.preferredBlinkCadence,
    preferredGazeMode: input.preferredGazeMode,
    reasonSummary: input.faceReasonSummary,
    source: input.faceSource,
    confidence: input.faceConfidence,
    segmentId: input.faceSegmentId,
  })
  const voice = buildAlicizationVoiceSummary({
    language: input.language,
    pitchDelta: input.pitchDelta,
    rateMultiplier: input.rateMultiplier,
    energy: input.energy,
    cadence: input.cadence,
    closureBias: input.closureBias,
    consonantPrecision: input.consonantPrecision,
    emotion: input.emotion,
    companionshipMode: input.companionshipMode,
    continuityTiming: input.voiceContinuityTiming,
    preferredBlinkCadence: input.preferredBlinkCadence,
    preferredGazeMode: input.preferredGazeMode,
    preferredPauseMode: input.preferredPauseMode,
    preferredLipsyncMode: input.preferredLipsyncMode,
    preferredVoiceMode: input.preferredVoiceMode,
    preferredPacingMode: input.preferredPacingMode,
    reasonSummary: input.voiceReasonSummary,
    source: input.voiceSource,
    segmentId: input.voiceSegmentId,
  })
  const lipsync = buildAlicizationLipsyncSummary({
    mode: input.mode,
    phase: input.phase,
    continuityHoldMs: input.continuityHoldMs,
    topViseme: input.topViseme,
    hintTrail: input.hintTrail,
    hintViseme: input.hintViseme,
    companionshipMode: input.lipsyncCompanionshipMode,
    continuityTiming: input.lipsyncContinuityTiming,
    preferredBlinkCadence: input.preferredBlinkCadence,
    preferredGazeMode: input.preferredGazeMode,
    preferredPauseMode: input.preferredPauseMode,
    preferredLipsyncMode: input.preferredLipsyncMode,
    preferredVoiceMode: input.preferredVoiceMode,
    preferredPacingMode: input.preferredPacingMode,
    reasonSummary: input.lipsyncReasonSummary,
    visemeBias: input.lipsyncVisemeBias,
    energyBias: input.lipsyncEnergyBias,
    mouthScale: input.mouthScale,
    source: input.lipsyncSource,
    confidence: input.lipsyncConfidence,
    segmentId: input.lipsyncSegmentId,
  })
  const motion = buildAlicizationMotionSummary({
    actionCue: input.actionCue,
    attentionMode: input.attentionMode,
    idleBase: input.idleBase,
    intensity: input.motionIntensity,
    holdMs: input.motionHoldMs,
    residentMode: input.motionResidentMode,
    continuityTiming: input.motionContinuityTiming,
    preferredBlinkCadence: input.preferredBlinkCadence,
    preferredGazeMode: input.preferredGazeMode,
    reasonSummary: input.motionReasonSummary,
    source: input.motionSource,
    confidence: input.motionConfidence,
    segmentId: input.motionSegmentId,
  })
  const closureHeadline = describeAlicizationEmbodimentClosureHeadline({
    authoritySummary: normalizeSummaryText(input.authoritySummary),
    currentBodyState: normalizeSummaryText(input.currentBodyState),
  })
  const closureReminder = describeAlicizationEmbodimentClosureReminder({
    authoritySummary: normalizeSummaryText(input.authoritySummary),
    currentBodyState: normalizeSummaryText(input.currentBodyState),
  })
  const closure = closureHeadline || closureReminder
  return [
    closure,
    face,
    voice,
    lipsync,
    motion,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' | ')
}
