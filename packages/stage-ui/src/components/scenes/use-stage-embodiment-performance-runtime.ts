import type {
  AlicizationDialogueEmbodimentRendererHints,
  AlicizationDialogueSpeechRendererSettleHints,
  StageEmbodimentPerformanceState,
  StageEmbodimentSpeechPlaybackItem,
  StageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import type { Ref } from 'vue'

import type { EmbodimentPlaybackTelemetry } from '../../services/embodiment/playback-reconciler'
import type {
  AlicizationDialoguePerformancePayload,
  AlicizationDigitalLifeSpineDigest,
  AlicizationEmbodimentScriptV1,
} from '../../stores/alicization-bridge'

import {
  createIdleStageEmbodimentMotorState,
  createIdleStageEmbodimentPerformanceState,
  hasAlicizationAudibleSameHerCarry,
  hasAlicizationBodyVoiceOnlySameHerCarry,
  hasAlicizationQuieterSameHerCarry,
  hasAlicizationSoftenedSameHerCarry,
  hasAlicizationStillVoicedSameHerCarry,
  normalizeAlicizationEmbodimentScript,
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
  normalizeAlicizationRendererHintTokens,
} from '@proj-alicization/stage-shared'
import { computed, onScopeDispose, readonly, ref, watch } from 'vue'

import { resolveRendererSettleMsWithPersonaBias } from './stage-runtime-embodiment-cues'

type StageEmbodimentPerformanceActionPulseReason = StageEmbodimentPerformanceState['actionPulse']['reason']

export interface UseStageEmbodimentPerformanceRuntimeOptions {
  digitalLifeSpineDigest?: Readonly<Ref<AlicizationDigitalLifeSpineDigest | null | undefined>>
  playbackTelemetry?: Readonly<Ref<EmbodimentPlaybackTelemetry | null>>
  speechRenderState: Readonly<Ref<StageEmbodimentSpeechRenderState | null | undefined>>
  upcomingSpeechSegment?: Readonly<Ref<StageEmbodimentSpeechPlaybackItem | null | undefined>>
}

export interface StageEmbodimentPerformanceArmOptions {
  source?: 'dialogue' | 'presence-pulse'
  preserveResidentReasonTags?: boolean
  residentReasonTags?: string[] | null
  variationToken?: string | null
}

export interface StageEmbodimentPerformanceResidentSyncOptions {
  allowWhileActive?: boolean
  residentReasonTags?: string[] | null
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

function resolveDriverCueConfidenceScale(raw: unknown, fallback = 1) {
  if (raw == null)
    return fallback

  return Math.max(0.35, clamp01(Number(raw), fallback))
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

function sanitizeSpineTimingText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars).toLowerCase()
}

function resolvePerformanceCueEmotion(
  emotion: unknown,
  fallback: unknown = 'neutral',
) {
  return normalizeAlicizationEmotion(emotion ?? fallback).emotion
}

function includesSpineTimingNeedle(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function resolveSpinePerformanceBias(digest: AlicizationDigitalLifeSpineDigest | null | undefined) {
  const mode = digest?.architecture?.operatingMode
  const watchMode = digest?.runtime.watchMode
  const dominantSystem = digest?.architecture?.dominantSystem
  const recallMode = (digest?.memory?.recallMode ?? '').trim().toLowerCase()
  const confidence = clamp01(digest?.proactive?.confidence ?? 0.5, 0.5)
  const personaBias = digest?.proactive?.personaBias ?? null
  const manifestationCadenceSummary = sanitizeSpineTimingText(personaBias?.manifestationCadenceSummary)
  const relationshipDoctrine = sanitizeSpineTimingText(digest?.embodiment?.autobiographicalSelf?.relationshipDoctrine)
  const outcomeSummary = sanitizeSpineTimingText(digest?.outcomeLearning?.summary)
  const latestInflection = sanitizeSpineTimingText(digest?.outcomeLearning?.latestInflection)

  let expressionBias = 1
  let actionBias = 1
  let prosodyBias = 1
  let breathBias = 1
  let focusBias = 1
  const personaObserveBias = personaBias?.initiativeStyle === 'observant'
    || personaBias?.silenceReconnect === 'hold'
    || personaBias?.preferredProactiveStyle === 'silent-observe'
  const personaDirectBias = personaBias?.initiativeStyle === 'high-participation'
    || personaBias?.silenceReconnect === 'direct-approach'
  const personaCareBias = personaBias?.relationshipPosture === 'guardian'
    || personaBias?.comfortStyle === 'take-charge'
  const lowerPressureObserveTiming = personaObserveBias
    && (
      includesSpineTimingNeedle(manifestationCadenceSummary, [
        'observe-first',
        'stay slower',
        'slower until the opening softens',
      ])
      || includesSpineTimingNeedle(
        `${relationshipDoctrine} ${outcomeSummary} ${latestInflection}`,
        [
          'lower-pressure',
          'pressure stayed low',
          'return stayed slower',
          'slower return',
          'keep more room',
          'repair should settle before closeness expands',
        ],
      )
    )

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
  if (personaObserveBias) {
    actionBias -= 0.08
    focusBias += 0.08
    prosodyBias -= 0.04
  }
  if (personaDirectBias) {
    actionBias += 0.08
    focusBias -= 0.04
    prosodyBias += 0.04
  }
  if (personaCareBias) {
    breathBias += 0.06
    expressionBias += 0.04
  }
  if (lowerPressureObserveTiming) {
    actionBias -= 0.06
    focusBias += 0.06
    breathBias += 0.04
    prosodyBias -= 0.04
  }

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

function resolveResidentRuntimeDynamics(input: {
  performance: AlicizationDialoguePerformancePayload
  residentReasonTags?: string[] | null | undefined
  variationToken: string | null | undefined
}) {
  const variationToken = typeof input.variationToken === 'string'
    ? input.variationToken.trim().replace(/\s+/g, ' ').slice(0, 240).toLowerCase()
    : ''
  const residentReasonTags = (input.residentReasonTags ?? [])
    .map(tag => typeof tag === 'string' ? tag.trim().toLowerCase() : '')
    .filter(Boolean)
  const stillVoicedResidentContinuity = hasAlicizationStillVoicedSameHerCarry({
    signature: variationToken,
    reasonTags: residentReasonTags,
  })
  const durableRelationshipRhythm = residentReasonTags.includes('durable-relationship-rhythm')
    || variationToken.includes('durable-relationship-rhythm')
  const hasResidentBaseline = Boolean(
    variationToken
    || residentReasonTags.length > 0
    || input.performance.actionCue
    || input.performance.facialCue
    || input.performance.baseEmotion !== 'neutral'
    || input.performance.delivery !== 'calm'
    || input.performance.emphasis > 0,
  )

  if (!hasResidentBaseline) {
    return {
      actionFloor: 0,
      breathFloor: 0,
      cooldownBlend: 0,
      expressionFloor: 0,
      facialFloor: 0,
      focusFloor: 0,
      opennessBias: 0,
      settleBias: 0,
      sustainBlend: 0,
    }
  }

  const quietAccompaniment = variationToken.includes('quiet-accompaniment')
    || residentReasonTags.includes('continuity:quiet-accompaniment')
    || residentReasonTags.includes('quiet-companionship')
    || (
      input.performance.actionCue === 'steady_focus'
      && input.performance.facialCue === 'focus'
      && input.performance.delivery === 'gentle'
      && input.performance.baseEmotion === 'thinking'
      && input.performance.emphasis === 0
    )
  const protectiveWatch = variationToken.includes('protective-watch')
    || residentReasonTags.includes('protective-watch')
    || (
      input.performance.actionCue === 'comfort_sway'
      && input.performance.facialCue === 'soft-gaze'
      && input.performance.delivery === 'gentle'
      && (input.performance.baseEmotion === 'concerned' || input.performance.baseEmotion === 'tired')
    )
  const lowerPressureTiming = variationToken.includes('lower-pressure')
    || variationToken.includes('timing:lower-pressure-opening')
    || residentReasonTags.includes('timing:lower-pressure-opening')
    || residentReasonTags.includes('measured-return')
    || residentReasonTags.includes('repair-before-closeness')
    || stillVoicedResidentContinuity
  const durableMeasuredReturn = durableRelationshipRhythm
    && (variationToken.includes('measured-return') || residentReasonTags.includes('measured-return'))

  let sustainBlend = input.performance.delivery === 'gentle' ? 0.22 : 0.24
  let cooldownBlend = input.performance.delivery === 'gentle' ? 0.14 : 0.12
  let actionFloor = input.performance.actionCue ? 0.12 : 0.04
  let breathFloor = input.performance.baseEmotion === 'thinking'
    || input.performance.baseEmotion === 'concerned'
    || input.performance.baseEmotion === 'tired'
    ? 0.08
    : 0.06
  let focusFloor = input.performance.baseEmotion === 'thinking'
    || input.performance.baseEmotion === 'concerned'
    || input.performance.baseEmotion === 'tired'
    ? 0.12
    : 0.08
  let expressionFloor = input.performance.delivery === 'gentle' ? 0.08 : 0.06
  let facialFloor = input.performance.facialCue ? 0.1 : 0
  let opennessBias = 0
  let settleBias = 0

  if (quietAccompaniment) {
    sustainBlend = 0.18
    cooldownBlend = 0.12
    actionFloor = input.performance.actionCue ? 0.06 : 0.03
    breathFloor = 0.12
    focusFloor = 0.14
    expressionFloor = 0.07
    facialFloor = input.performance.facialCue ? 0.1 : 0
    opennessBias = -0.02
  }

  if (protectiveWatch) {
    sustainBlend = 0.2
    cooldownBlend = 0.16
    actionFloor = input.performance.actionCue ? 0.05 : 0.03
    breathFloor = 0.14
    focusFloor = 0.16
    expressionFloor = 0.08
    facialFloor = input.performance.facialCue ? 0.12 : 0
    opennessBias = -0.08
  }

  if (lowerPressureTiming) {
    sustainBlend = Math.max(0.12, sustainBlend - 0.04)
    actionFloor = Math.max(0.01, actionFloor - 0.06)
    breathFloor += 0.03
    focusFloor += 0.03
    cooldownBlend += 0.03
    opennessBias -= 0.03
  }

  if (durableMeasuredReturn) {
    sustainBlend = Math.max(0.1, sustainBlend - 0.02)
    actionFloor = Math.max(0, actionFloor - 0.01)
    expressionFloor = Math.max(0.05, expressionFloor - 0.01)
    cooldownBlend = Math.min(0.24, cooldownBlend + 0.02)
    opennessBias -= 0.02
    settleBias += 0.02
  }

  return {
    actionFloor,
    breathFloor,
    cooldownBlend,
    expressionFloor,
    facialFloor,
    focusFloor,
    opennessBias,
    settleBias,
    sustainBlend,
  }
}

export function resolveCompanionshipExpressionDampening(input: {
  activeCueResidentMode?: unknown
  residentReasonTags?: string[] | null | undefined
  speechActive: boolean
  variationToken: string | null | undefined
}) {
  const variationToken = typeof input.variationToken === 'string'
    ? input.variationToken.trim().replace(/\s+/g, ' ').slice(0, 240).toLowerCase()
    : ''
  const residentMode = typeof input.activeCueResidentMode === 'string'
    ? input.activeCueResidentMode.trim().toLowerCase()
    : ''
  const residentReasonTags = (input.residentReasonTags ?? [])
    .map(tag => typeof tag === 'string' ? tag.trim().toLowerCase() : '')
    .filter(Boolean)
  const stillVoicedResidentContinuity = hasAlicizationStillVoicedSameHerCarry({
    signature: variationToken,
    reasonTags: residentReasonTags,
  })
  const durableRelationshipRhythm = residentReasonTags.includes('durable-relationship-rhythm')
    || variationToken.includes('durable-relationship-rhythm')
  const inferredResidentMode = residentMode
    || (residentReasonTags.includes('repair-before-closeness')
      ? 'repair-before-closeness'
      : residentReasonTags.includes('rest-protective') || residentReasonTags.includes('rest-protective-companionship')
        ? 'rest-protective'
        : residentReasonTags.includes('measured-return')
          || stillVoicedResidentContinuity
          ? 'measured-return'
          : residentReasonTags.includes('continuity:quiet-accompaniment') || residentReasonTags.includes('quiet-companionship')
            ? 'quiet-companionship'
            : '')
          || (variationToken.includes('repair-before-closeness')
            ? 'repair-before-closeness'
            : variationToken.includes('rest-protective')
              ? 'rest-protective'
              : variationToken.includes('measured-return')
                || stillVoicedResidentContinuity
                ? 'measured-return'
                : variationToken.includes('quiet-accompaniment') || variationToken.includes('quiet-companionship')
                  ? 'quiet-companionship'
                  : '')

  if (inferredResidentMode === 'repair-before-closeness') {
    return input.speechActive
      ? 0.84
      : 0.72
  }

  if (inferredResidentMode === 'measured-return') {
    if (durableRelationshipRhythm) {
      return input.speechActive
        ? 0.88
        : 0.78
    }
    return input.speechActive
      ? 0.92
      : 0.82
  }

  if (inferredResidentMode === 'rest-protective')
    return input.speechActive ? 0.9 : 0.8

  if (inferredResidentMode === 'quiet-companionship')
    return input.speechActive ? 0.94 : 0.86

  return 1
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

function resolvePlaybackItemAuthoritySegmentId(
  item: StageEmbodimentSpeechPlaybackItem | null | undefined,
) {
  return normalizeDriverSegmentId(
    item?.digitalLifeFrame?.id
    ?? item?.segmentId
    ?? item?.cue?.id
    ?? null,
  )
}

function resolveCueOrPlaybackItemAuthoritySegmentId(input: {
  cue?: {
    id?: string | null | undefined
  } | null | undefined
  item: StageEmbodimentSpeechPlaybackItem | null | undefined
}) {
  return normalizeDriverSegmentId(
    resolvePlaybackItemAuthoritySegmentId(input.item)
    ?? input.cue?.id
    ?? null,
  )
}

function createAuthorityAlignedActiveSegment(
  item: StageEmbodimentSpeechPlaybackItem | null | undefined,
) {
  if (!item)
    return null

  const authoritySegmentId = resolvePlaybackItemAuthoritySegmentId(item)
  if (!authoritySegmentId || authoritySegmentId === item.segmentId)
    return item

  return {
    ...item,
    segmentId: authoritySegmentId,
  }
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
  segmentId?: string | null,
) {
  const candidate = item?.metadata?.embodimentPlayback
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    return null

  const face = (candidate as EmbodimentPlaybackTelemetry).drivers?.face
  if (!face)
    return null
  if (!isDriverCueConfidenceSufficient(face.confidence))
    return null
  const faceSegmentId = normalizeDriverSegmentId(face.segmentId)
  if (segmentId != null && faceSegmentId && !matchesDriverSegment(faceSegmentId, segmentId))
    return null

  return {
    emotion: face.emotion,
    facialCue: face.facialCue?.trim() || null,
    holdMs: Math.max(0, Math.round(face.holdMs ?? 0)),
    intensity: clamp01(face.intensity ?? 0),
    postUtteranceCue: face.postUtteranceCue?.trim() || null,
    preUtteranceCue: face.preUtteranceCue?.trim() || null,
    source: face.source?.trim() || null,
    segmentId: normalizeDriverSegmentId(face.segmentId),
    confidence: clamp01(face.confidence ?? 0),
  }
}

function resolvePlaybackDriverMotionMetadata(
  item: StageEmbodimentSpeechPlaybackItem | null | undefined,
  segmentId?: string | null,
) {
  const candidate = item?.metadata?.embodimentPlayback
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    return null

  const motion = (candidate as EmbodimentPlaybackTelemetry).drivers?.motion
  if (!motion)
    return null
  if (!isDriverCueConfidenceSufficient(motion.confidence))
    return null
  const motionSegmentId = normalizeDriverSegmentId(motion.segmentId)
  if (segmentId != null && motionSegmentId && !matchesDriverSegment(motionSegmentId, segmentId))
    return null

  return {
    actionCue: motion.actionCue?.trim() || null,
    holdMs: Math.max(0, Math.round(motion.holdMs ?? 0)),
    intensity: clamp01(motion.intensity ?? 0),
    source: motion.source?.trim() || null,
    segmentId: normalizeDriverSegmentId(motion.segmentId),
    confidence: clamp01(motion.confidence ?? 0),
  }
}

function resolvePlaybackTelemetryMetadata(
  item: StageEmbodimentSpeechPlaybackItem | null | undefined,
) {
  const candidate = item?.metadata?.embodimentPlayback
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    return null

  return candidate as EmbodimentPlaybackTelemetry
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
    emotion: face.emotion,
    facialCue: face.facialCue?.trim() || null,
    holdMs: Math.max(0, Math.round(face.holdMs ?? 0)),
    intensity: clamp01(face.intensity ?? 0),
    postUtteranceCue: face.postUtteranceCue?.trim() || null,
    preUtteranceCue: face.preUtteranceCue?.trim() || null,
    source: face.source?.trim() || null,
    segmentId: normalizeDriverSegmentId(face.segmentId),
    confidence: clamp01(face.confidence ?? 0),
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
    source: motion.source?.trim() || null,
    segmentId: normalizeDriverSegmentId(motion.segmentId),
    confidence: clamp01(motion.confidence ?? 0),
  }
}

function applyPreviewCueBridgeDriverProvenance<
  TDriver extends {
    segmentId: string | null
    source?: string | null
  },
>(input: {
  driver: TDriver | null
  previewCueActive: boolean
  previewSegmentId: string | null
  seededAuthoritySegmentId: string | null
}) {
  const previewSegmentId = normalizeDriverSegmentId(input.previewSegmentId)
  const seededAuthoritySegmentId = normalizeDriverSegmentId(input.seededAuthoritySegmentId)
  if (!input.driver || !input.previewCueActive || !previewSegmentId)
    return input.driver
  if (!seededAuthoritySegmentId || seededAuthoritySegmentId === previewSegmentId)
    return input.driver

  return {
    ...input.driver,
    source: 'cue-bridge',
    segmentId: previewSegmentId,
  }
}

function createCueBridgeFaceMetadata(input: {
  cue: StageEmbodimentPerformanceState['activeCue']
  segmentId: string | null
}) {
  const facialCue = input.cue?.facialCue?.trim() || null
  if (!input.cue || !input.segmentId || !facialCue)
    return null

  return {
    emotion: resolvePerformanceCueEmotion(input.cue.emotion),
    facialCue,
    holdMs: Math.max(0, Math.round(input.cue.facialHoldMs ?? 0)),
    intensity: clamp01(input.cue.facialWeight ?? 0),
    postUtteranceCue: facialCue,
    preUtteranceCue: facialCue,
    source: 'cue-bridge' as const,
    segmentId: input.segmentId,
    confidence: 1,
  }
}

function createCueBridgeMotionMetadata(input: {
  cue: StageEmbodimentPerformanceState['activeCue']
  segmentId: string | null
}) {
  const actionCue = input.cue?.actionCue?.trim() || null
  if (!input.cue || !input.segmentId || !actionCue)
    return null

  return {
    actionCue,
    holdMs: Math.max(0, Math.round(input.cue.actionHoldMs ?? 0)),
    intensity: clamp01(input.cue.gestureWeight ?? 0),
    source: 'cue-bridge' as const,
    segmentId: input.segmentId,
    confidence: 1,
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
  const derivedSegmentId = normalizeDriverSegmentId(
    lipsync.segmentId
    ?? resolveDerivedLipSyncHintSegmentId(input.telemetry),
  )
  if (!matchesDriverSegment(derivedSegmentId, input.segmentId))
    return null

  return {
    mode: lipsync.mode,
    playbackPhase: lipsync.playbackPhase,
    segmentId: derivedSegmentId,
    continuityHoldMs: Math.max(0, Math.round(lipsync.continuityHoldMs ?? 0)),
    visemeHints: lipsync.visemeHints
      .filter(hint => matchesDriverSegment(hint.segmentId, input.segmentId ?? derivedSegmentId))
      .map(hint => ({
        segmentId: hint.segmentId,
        viseme: hint.viseme,
        weight: clamp01(hint.weight),
        source: hint.source?.trim() || null,
      })),
  }
}

function resolveDerivedLipSyncHintSegmentId(
  telemetry: EmbodimentPlaybackTelemetry | null | undefined,
) {
  const hintSegmentIds = [...new Set(
    telemetry?.drivers.lipsync?.visemeHints
      .map(hint => normalizeDriverSegmentId(hint.segmentId))
      .filter((segmentId): segmentId is string => Boolean(segmentId)) ?? [],
  )]

  return hintSegmentIds.length === 1
    ? hintSegmentIds[0]
    : null
}

function hasActiveSameSegmentLipSyncRejoin(input: {
  derivedSegmentId?: string | null
  lipsync: ReturnType<typeof resolveExplicitPlaybackDriverLipSyncMetadata> | null
  seededSegmentId?: string | null
  telemetry: EmbodimentPlaybackTelemetry | null | undefined
}) {
  const candidateSegmentId = input.lipsync?.segmentId
    ?? input.telemetry?.drivers.lipsync?.segmentId
    ?? input.derivedSegmentId

  // Idle viseme-hint carry can keep the audible line warm, but it should not
  // by itself count as a full same-segment rejoin for the embodied self.
  return Boolean(
    input.lipsync
    && input.lipsync.playbackPhase === 'playing'
    && matchesDriverSegment(candidateSegmentId, input.seededSegmentId),
  )
}

function hasTelemetryLipsyncPlaybackOrContinuityHold(
  telemetry: EmbodimentPlaybackTelemetry | null | undefined,
) {
  const lipsync = telemetry?.drivers.lipsync
  if (!lipsync)
    return false

  return lipsync.playbackPhase === 'playing'
    || Math.max(0, Math.round(lipsync.continuityHoldMs ?? 0)) > 0
}

function hasTelemetryVoiceAuthoritySignal(
  driver: EmbodimentPlaybackTelemetry['drivers']['voice'],
) {
  if (!driver)
    return false

  return driver.playbackPhase === 'playing'
    || driver.continuityHoldMs > 0
    || driver.cueProsodyWeight != null
    || driver.cueMouthWeight != null
    || driver.cueHeadWeight != null
    || driver.visemePeakWeight != null
    || Boolean(driver.source)
}

function resolvePlaybackTelemetryProsodyAuthority(
  telemetry: EmbodimentPlaybackTelemetry | null | undefined,
) {
  const topLevelProsodyAuthority = telemetry?.prosodyAuthority ?? null
  if (topLevelProsodyAuthority)
    return topLevelProsodyAuthority

  const seededProsodyAuthority = telemetry?.driverAuthority?.prosodyAuthority ?? null
  if (seededProsodyAuthority)
    return seededProsodyAuthority

  const explicitVoiceDriver = telemetry?.drivers.voice ?? null
  if (!explicitVoiceDriver || !hasTelemetryVoiceAuthoritySignal(explicitVoiceDriver))
    return null

  return {
    segmentId: normalizeDriverSegmentId(explicitVoiceDriver?.segmentId),
    provenance: explicitVoiceDriver.provenance,
    source: explicitVoiceDriver.source?.trim() || null,
    mode: explicitVoiceDriver.mode ?? null,
    cueProsodyWeight: explicitVoiceDriver.cueProsodyWeight ?? null,
    cueMouthWeight: explicitVoiceDriver.cueMouthWeight ?? null,
    cueHeadWeight: explicitVoiceDriver.cueHeadWeight ?? null,
    visemePeakWeight: explicitVoiceDriver.visemePeakWeight ?? null,
  }
}

function resolveExplicitPlaybackCueMetadata(input: {
  segmentId?: string | null
  telemetry: EmbodimentPlaybackTelemetry | null | undefined
}) {
  const cue = input.telemetry?.cue
  if (!cue)
    return null
  const normalizedSegmentId = normalizeDriverSegmentId(input.segmentId)
  if (!normalizedSegmentId)
    return cue

  return cue.id === normalizedSegmentId ? cue : null
}

function resolveDriverAuthoritySnapshot(input: {
  cue?: StageEmbodimentPerformanceState['activeCue'] | null
  face: ReturnType<typeof resolveExplicitPlaybackDriverFaceMetadata> | ReturnType<typeof resolvePlaybackDriverFaceMetadata> | null
  motion: ReturnType<typeof resolveExplicitPlaybackDriverMotionMetadata> | ReturnType<typeof resolvePlaybackDriverMotionMetadata> | null
  lipsync: ReturnType<typeof resolveExplicitPlaybackDriverLipSyncMetadata> | null
  ignoreSeededAuthority?: boolean
  item: StageEmbodimentSpeechPlaybackItem | null | undefined
  telemetry: EmbodimentPlaybackTelemetry | null | undefined
}): StageEmbodimentPerformanceState['driverAuthority'] {
  const seededAuthority = input.telemetry?.driverAuthority
  const telemetryProsodyAuthority = resolvePlaybackTelemetryProsodyAuthority(input.telemetry)
  if (seededAuthority && !input.ignoreSeededAuthority) {
    const seededSegmentId = normalizeDriverSegmentId(seededAuthority.segmentId)
    const derivedLipSyncSegmentId = resolveDerivedLipSyncHintSegmentId(input.telemetry)
    const seededCue = input.cue && matchesDriverSegment(input.cue.id, seededSegmentId)
      ? input.cue
      : null
    const confidentFaceRejoinAvailable = Boolean(
      input.face
      && matchesDriverSegment(input.face.segmentId, seededSegmentId)
      && isDriverCueConfidenceSufficient(input.face.confidence)
      && (
        clamp01(input.face.intensity ?? 0) > 0
        || Boolean(input.face.facialCue)
        || Boolean(input.face.preUtteranceCue)
        || Boolean(input.face.postUtteranceCue)
      ),
    )
    const confidentMotionRejoinAvailable = Boolean(
      input.motion
      && matchesDriverSegment(input.motion.segmentId, seededSegmentId)
      && isDriverCueConfidenceSufficient(input.motion.confidence)
      && (
        clamp01(input.motion.intensity ?? 0) > 0
        || Boolean(input.motion.actionCue)
      ),
    )
    const lipsyncRejoinAvailable = hasActiveSameSegmentLipSyncRejoin({
      derivedSegmentId: derivedLipSyncSegmentId,
      lipsync: input.lipsync,
      seededSegmentId,
      telemetry: input.telemetry,
    })
    const seededBodyCarryAuthority = seededAuthority.bodySegmentMatched
      && !seededAuthority.faceSegmentMatched
      && !seededAuthority.motionSegmentMatched
      && !seededAuthority.voiceSegmentMatched
    const seededVoiceCarryAuthority = !seededAuthority.bodySegmentMatched
      && !seededAuthority.faceSegmentMatched
      && !seededAuthority.motionSegmentMatched
      && !seededAuthority.lipsyncSegmentMatched
      && Boolean(
        seededAuthority.voiceSegmentMatched
        ?? matchesDriverSegment(
          (seededAuthority.prosodyAuthority ?? telemetryProsodyAuthority)?.segmentId ?? null,
          seededSegmentId,
        ),
      )
    const seededBodyCarryRejoinAvailable = seededBodyCarryAuthority
      && Boolean(seededSegmentId)
      && (
        confidentFaceRejoinAvailable
        || confidentMotionRejoinAvailable
        || (!seededAuthority.lipsyncSegmentMatched && lipsyncRejoinAvailable)
      )
    const seededVoiceCarryFaceRejoinAvailable = seededVoiceCarryAuthority
      && confidentFaceRejoinAvailable
      && Boolean(seededCue?.facialCue)
    const seededVoiceCarryMotionRejoinAvailable = seededVoiceCarryAuthority
      && confidentMotionRejoinAvailable
      && Boolean(seededCue?.actionCue)
    const seededVoiceCarryRejoinAvailable = Boolean(
      seededSegmentId
      && (seededVoiceCarryFaceRejoinAvailable || seededVoiceCarryMotionRejoinAvailable),
    )
    if (seededVoiceCarryRejoinAvailable) {
      const seededProsodyAuthority = seededAuthority.prosodyAuthority ?? telemetryProsodyAuthority
      const seededVoiceSegmentMatched = seededAuthority.voiceSegmentMatched
        ?? matchesDriverSegment(seededProsodyAuthority?.segmentId ?? null, seededSegmentId)
      const matchedDrivers = [...seededAuthority.matchedDrivers]
      if (seededVoiceCarryFaceRejoinAvailable && !matchedDrivers.includes('face'))
        matchedDrivers.unshift('face')
      if (seededVoiceCarryMotionRejoinAvailable && !matchedDrivers.includes('motion')) {
        const voiceIndex = matchedDrivers.indexOf('voice')
        if (voiceIndex >= 0)
          matchedDrivers.splice(voiceIndex, 0, 'motion')
        else
          matchedDrivers.push('motion')
      }
      if (seededVoiceSegmentMatched && !matchedDrivers.includes('voice'))
        matchedDrivers.push('voice')

      const sources = [...seededAuthority.sources]
      const voiceSource = seededProsodyAuthority?.source?.trim() || ''
      if (seededVoiceSegmentMatched && voiceSource && !sources.includes(voiceSource))
        sources.push(voiceSource)
      if (!sources.includes('cue-bridge'))
        sources.push('cue-bridge')

      return {
        segmentId: seededSegmentId,
        rendererTarget: seededAuthority.rendererTarget ?? input.telemetry?.rendererTarget ?? null,
        matchedDrivers,
        sources,
        bodySegmentMatched: false,
        faceSegmentMatched: seededVoiceCarryFaceRejoinAvailable,
        motionSegmentMatched: seededVoiceCarryMotionRejoinAvailable,
        lipsyncSegmentMatched: false,
        voiceSegmentMatched: seededVoiceSegmentMatched,
        prosodyAuthority: seededProsodyAuthority,
      }
    }

    if (!seededBodyCarryRejoinAvailable) {
      const seededProsodyAuthority = seededAuthority.prosodyAuthority ?? telemetryProsodyAuthority
      const seededVoiceSegmentMatched = seededAuthority.voiceSegmentMatched
        ?? matchesDriverSegment(seededProsodyAuthority?.segmentId ?? null, seededSegmentId)
      const matchedDrivers = [...seededAuthority.matchedDrivers]
      if (seededVoiceSegmentMatched && !matchedDrivers.includes('voice'))
        matchedDrivers.push('voice')
      const sources = [...seededAuthority.sources]
      if (seededVoiceSegmentMatched) {
        const voiceSource = seededProsodyAuthority?.source?.trim() || ''
        if (voiceSource && !sources.includes(voiceSource))
          sources.push(voiceSource)
      }

      return {
        segmentId: seededSegmentId,
        rendererTarget: seededAuthority.rendererTarget ?? input.telemetry?.rendererTarget ?? null,
        matchedDrivers,
        sources,
        bodySegmentMatched: seededAuthority.bodySegmentMatched,
        faceSegmentMatched: seededAuthority.faceSegmentMatched,
        motionSegmentMatched: seededAuthority.motionSegmentMatched,
        lipsyncSegmentMatched: seededAuthority.lipsyncSegmentMatched,
        voiceSegmentMatched: seededVoiceSegmentMatched,
        prosodyAuthority: seededProsodyAuthority,
      }
    }
  }

  const derivedLipSyncSegmentId = resolveDerivedLipSyncHintSegmentId(input.telemetry)
  const explicitSegmentId = normalizeDriverSegmentId(
    resolveCueOrPlaybackItemAuthoritySegmentId({
      cue: input.cue,
      item: input.item,
    }),
  )
  const telemetryFace = (
    explicitSegmentId
    && input.telemetry?.drivers.face
    && normalizeDriverSegmentId(input.telemetry.drivers.face.segmentId)
    && !matchesDriverSegment(input.telemetry.drivers.face.segmentId, explicitSegmentId)
  )
    ? null
    : (input.telemetry?.drivers.face ?? null)
  const telemetryMotion = (
    explicitSegmentId
    && input.telemetry?.drivers.motion
    && normalizeDriverSegmentId(input.telemetry.drivers.motion.segmentId)
    && !matchesDriverSegment(input.telemetry.drivers.motion.segmentId, explicitSegmentId)
  )
    ? null
    : (input.telemetry?.drivers.motion ?? null)
  const bodySegmentId = normalizeDriverSegmentId(input.telemetry?.drivers.body?.segmentId)
  const faceSegmentId = normalizeDriverSegmentId(
    input.face?.segmentId
    ?? telemetryFace?.segmentId
    ?? null,
  )
  const motionSegmentId = normalizeDriverSegmentId(
    input.motion?.segmentId
    ?? telemetryMotion?.segmentId
    ?? null,
  )
  const lipsyncSegmentId = normalizeDriverSegmentId(
    input.lipsync?.segmentId
    ?? input.telemetry?.drivers.lipsync?.segmentId
    ?? derivedLipSyncSegmentId,
  )
  const shouldPreferQuieterBodyLipsyncContinuityLine = Boolean(
    explicitSegmentId
    && bodySegmentId === explicitSegmentId
    && lipsyncSegmentId === explicitSegmentId
    && hasTelemetryLipsyncPlaybackOrContinuityHold(input.telemetry)
    && (
      faceSegmentId !== explicitSegmentId
      || motionSegmentId !== explicitSegmentId
    ),
  )
  const segmentId = normalizeDriverSegmentId(
    (shouldPreferQuieterBodyLipsyncContinuityLine ? explicitSegmentId : null)
    ?? input.face?.segmentId
    ?? input.motion?.segmentId
    ?? input.lipsync?.segmentId
    ?? telemetryFace?.segmentId
    ?? telemetryMotion?.segmentId
    ?? input.telemetry?.drivers.lipsync?.segmentId
    ?? derivedLipSyncSegmentId
    ?? telemetryProsodyAuthority?.segmentId
    ?? resolveCueOrPlaybackItemAuthoritySegmentId({
      cue: input.cue,
      item: input.item,
    }),
  )
  const matchedDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'> = []
  const sources: string[] = []
  const seenSources = new Set<string>()
  const cue = input.cue && matchesDriverSegment(input.cue.id, segmentId)
    ? input.cue
    : resolveExplicitPlaybackCueMetadata({
        segmentId,
        telemetry: input.telemetry,
      })

  function pushSource(source: string | null | undefined) {
    const normalized = source?.trim() || ''
    if (!normalized || seenSources.has(normalized))
      return
    seenSources.add(normalized)
    sources.push(normalized)
  }

  const bodySegmentMatched = matchesDriverSegment(input.telemetry?.drivers.body?.segmentId, segmentId)
    && Boolean(input.telemetry?.drivers.body)
  if (bodySegmentMatched) {
    matchedDrivers.push('body')
  }

  const faceSegmentMatched = matchesDriverSegment(input.face?.segmentId ?? telemetryFace?.segmentId, segmentId)
    && Boolean(input.face || telemetryFace)
  const cueFaceBridgeMatched = !faceSegmentMatched
    && input.face != null
    && cue?.facialCue != null
    && matchesDriverSegment(cue.id, segmentId)
  if (faceSegmentMatched || cueFaceBridgeMatched) {
    matchedDrivers.push('face')
    pushSource(
      faceSegmentMatched
        ? (input.face?.source ?? telemetryFace?.source ?? 'cue-bridge')
        : (input.face?.source ?? 'cue-bridge'),
    )
  }

  const motionSegmentMatched = matchesDriverSegment(input.motion?.segmentId ?? telemetryMotion?.segmentId, segmentId)
    && Boolean(input.motion || telemetryMotion)
  const cueMotionBridgeMatched = !motionSegmentMatched
    && input.motion != null
    && cue?.actionCue != null
    && matchesDriverSegment(cue.id, segmentId)
  if (motionSegmentMatched || cueMotionBridgeMatched) {
    matchedDrivers.push('motion')
    pushSource(
      motionSegmentMatched
        ? (input.motion?.source ?? telemetryMotion?.source ?? 'cue-bridge')
        : (input.motion?.source ?? 'cue-bridge'),
    )
  }

  const lipsyncSegmentMatched = matchesDriverSegment(
    input.lipsync?.segmentId
    ?? input.telemetry?.drivers.lipsync?.segmentId
    ?? derivedLipSyncSegmentId,
    segmentId,
  )
  && Boolean(
    input.lipsync
    || (
      bodySegmentMatched
      && hasTelemetryLipsyncPlaybackOrContinuityHold(input.telemetry)
    ),
  )
  if (lipsyncSegmentMatched) {
    matchedDrivers.push('lipsync')
    for (const source of new Set(
      (input.lipsync?.visemeHints ?? input.telemetry?.drivers.lipsync?.visemeHints ?? [])
        .map(hint => hint.source?.trim() || '')
        .filter(Boolean),
    )) {
      pushSource(source)
    }
  }

  const prosodySegmentMatched = matchesDriverSegment(
    telemetryProsodyAuthority?.segmentId ?? null,
    segmentId,
  )
  if (prosodySegmentMatched) {
    matchedDrivers.push('voice')
    pushSource(telemetryProsodyAuthority?.source)
  }

  if (!segmentId && matchedDrivers.length === 0 && !input.telemetry?.rendererTarget)
    return null

  return {
    segmentId,
    rendererTarget: input.telemetry?.rendererTarget ?? null,
    matchedDrivers,
    sources,
    bodySegmentMatched,
    faceSegmentMatched: faceSegmentMatched || cueFaceBridgeMatched,
    motionSegmentMatched: motionSegmentMatched || cueMotionBridgeMatched,
    lipsyncSegmentMatched,
    voiceSegmentMatched: prosodySegmentMatched,
    prosodyAuthority: telemetryProsodyAuthority,
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

function resolvePlaybackDriverProjectedCue(input: {
  actionCue?: string | null
  face: ReturnType<typeof resolveExplicitPlaybackDriverFaceMetadata> | ReturnType<typeof resolvePlaybackDriverFaceMetadata> | null
  facialCue?: string | null
  item: StageEmbodimentSpeechPlaybackItem | null | undefined
  lipsync: ReturnType<typeof resolveExplicitPlaybackDriverLipSyncMetadata> | null
  motion: ReturnType<typeof resolveExplicitPlaybackDriverMotionMetadata> | ReturnType<typeof resolvePlaybackDriverMotionMetadata> | null
  prosodyAuthority?: EmbodimentPlaybackTelemetry['prosodyAuthority'] | null
  preview?: boolean
}): StageEmbodimentPerformanceState['activeCue'] {
  const text = input.item?.text?.trim() ?? ''
  if (!text || (!input.face && !input.motion && !input.lipsync && !input.prosodyAuthority))
    return null

  const segmentId = normalizeDriverSegmentId(
    input.face?.segmentId
    ?? input.motion?.segmentId
    ?? input.lipsync?.segmentId
    ?? input.prosodyAuthority?.segmentId
    ?? resolvePlaybackItemAuthoritySegmentId(input.item),
  )
  const mouthWeight = clamp01(Math.max(
    resolvePlaybackDriverVisemePeakWeight(input.lipsync),
    input.prosodyAuthority?.cueMouthWeight ?? 0,
  ))
  const actionCue = input.actionCue?.trim() || input.motion?.actionCue?.trim() || null
  const facialCue = input.facialCue?.trim() || input.face?.facialCue?.trim() || null
  const gestureWeight = clamp01(Math.max(
    input.motion?.intensity ?? 0,
    input.prosodyAuthority?.cueHeadWeight ?? 0,
  ))
  const facialWeight = clamp01(input.face?.intensity ?? 0)
  const beatWeight = clamp01(Math.max(
    input.motion?.intensity ?? 0,
    mouthWeight * 0.72,
    input.prosodyAuthority?.cueHeadWeight ?? 0,
  ))
  const idSeed = segmentId || text.replace(/\s+/g, ' ').slice(0, 120)

  return {
    id: `driver:${idSeed || 'segment'}`,
    index: 0,
    startOffset: 0,
    endOffset: Math.max(1, Array.from(text).length),
    text,
    emotion: input.face?.emotion,
    gestureWeight,
    facialWeight,
    prosodyWeight: clamp01(Math.max(
      input.prosodyAuthority?.cueProsodyWeight ?? 0,
      mouthWeight * 0.68 + facialWeight * 0.18,
    )),
    beatWeight,
    mouthWeight: mouthWeight > 0 ? mouthWeight : undefined,
    headWeight: gestureWeight > 0 ? gestureWeight : undefined,
    facialHoldMs: input.face?.holdMs || undefined,
    actionHoldMs: input.motion?.holdMs || undefined,
    emotionHoldMs: Math.max(input.face?.holdMs ?? 0, input.motion?.holdMs ?? 0) || undefined,
    actionCue,
    facialCue,
    actionWindow: !actionCue
      ? 'none'
      : beatWeight >= 0.44
        ? 'cadence-peak'
        : 'segment-start',
    interruptMode: input.preview ? 'soft-interrupt' : 'continue',
  }
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

  const resolvedProsodyAuthority = resolvePlaybackTelemetryProsodyAuthority(telemetry)

  return JSON.stringify([
    telemetry.actualDurationMs,
    telemetry.driftMs,
    telemetry.plannedDurationMs,
    telemetry.settleMs,
    telemetry.stopReason,
    telemetry.driverAuthority?.segmentId ?? '',
    telemetry.driverAuthority?.rendererTarget ?? '',
    ...(telemetry.driverAuthority?.matchedDrivers ?? []),
    ...(telemetry.driverAuthority?.sources ?? []),
    telemetry.driverAuthority?.bodySegmentMatched ?? false,
    telemetry.driverAuthority?.faceSegmentMatched ?? false,
    telemetry.driverAuthority?.motionSegmentMatched ?? false,
    telemetry.driverAuthority?.lipsyncSegmentMatched ?? false,
    telemetry.driverAuthority?.voiceSegmentMatched ?? false,
    telemetry.driverAuthority?.prosodyAuthority?.segmentId ?? '',
    telemetry.driverAuthority?.prosodyAuthority?.source ?? '',
    telemetry.driverAuthority?.prosodyAuthority?.mode ?? '',
    telemetry.driverAuthority?.prosodyAuthority?.cueProsodyWeight ?? 0,
    telemetry.driverAuthority?.prosodyAuthority?.cueMouthWeight ?? 0,
    telemetry.driverAuthority?.prosodyAuthority?.cueHeadWeight ?? 0,
    telemetry.driverAuthority?.prosodyAuthority?.visemePeakWeight ?? 0,
    resolvedProsodyAuthority?.segmentId ?? '',
    resolvedProsodyAuthority?.source ?? '',
    resolvedProsodyAuthority?.mode ?? '',
    resolvedProsodyAuthority?.cueProsodyWeight ?? 0,
    resolvedProsodyAuthority?.cueMouthWeight ?? 0,
    resolvedProsodyAuthority?.cueHeadWeight ?? 0,
    resolvedProsodyAuthority?.visemePeakWeight ?? 0,
    telemetry.drivers.voice?.segmentId ?? '',
    telemetry.drivers.voice?.source ?? '',
    telemetry.drivers.voice?.mode ?? '',
    telemetry.drivers.voice?.playbackPhase ?? '',
    telemetry.drivers.voice?.continuityHoldMs ?? 0,
    telemetry.drivers.voice?.cueProsodyWeight ?? 0,
    telemetry.drivers.voice?.cueMouthWeight ?? 0,
    telemetry.drivers.voice?.cueHeadWeight ?? 0,
    telemetry.drivers.voice?.visemePeakWeight ?? 0,
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
    telemetry.drivers.lipsync?.continuityHoldMs ?? 0,
    ...(telemetry.drivers.lipsync?.visemeHints.flatMap(hint => [
      hint.segmentId,
      hint.viseme,
      clamp01(hint.weight),
    ]) ?? []),
    telemetry.cue?.id ?? '',
    telemetry.cue?.text ?? '',
    telemetry.cue?.emotion ?? '',
    telemetry.cue?.actionCue ?? '',
    telemetry.cue?.facialCue ?? '',
    telemetry.cue?.actionWindow ?? '',
    telemetry.cue?.interruptMode ?? '',
    telemetry.cue?.gestureWeight ?? 0,
    telemetry.cue?.facialWeight ?? 0,
    telemetry.cue?.prosodyWeight ?? 0,
    telemetry.cue?.beatWeight ?? 0,
    telemetry.cue?.mouthWeight ?? 0,
    telemetry.cue?.headWeight ?? 0,
    telemetry.cue?.facialHoldMs ?? 0,
    telemetry.cue?.actionHoldMs ?? 0,
    telemetry.cue?.emotionHoldMs ?? 0,
    telemetry.cue?.rendererHints?.preferredExpressionAliases?.join('|') ?? '',
    telemetry.cue?.rendererHints?.preferredMotionAliases?.join('|') ?? '',
    telemetry.cue?.rendererHints?.preferredGazeMode ?? '',
    telemetry.cue?.rendererHints?.preferredBlinkCadence ?? '',
    telemetry.cue?.rendererHints?.residentMode ?? '',
    telemetry.cue?.rendererHints?.signature ?? '',
    telemetry.cue?.rendererHints?.reasonTags?.join('|') ?? '',
    telemetry.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    telemetry.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0,
    telemetry.cue?.rendererSettle?.vrmActionFadeMs ?? 0,
    telemetry.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0,
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

function resolvePreferredPresence(
  digest: AlicizationDigitalLifeSpineDigest | null | undefined,
) {
  const preferredPresence = sanitizeSpineTimingText(
    digest?.proactive?.preferredPresence ?? digest?.runtime?.preferredPresence ?? '',
    32,
  )
  if (preferredPresence === 'concerned' || preferredPresence === 'hesitant' || preferredPresence === 'attentive')
    return preferredPresence
  return null
}

function resolveCueResidentMode(
  cue: {
    rendererHints?: {
      residentMode?: unknown
      reasonTags?: readonly string[] | string[] | null
      signature?: string | null
    } | null
  } | null | undefined,
  lifeFrame: {
    face?: {
      rendererHints?: {
        residentMode?: unknown
        reasonTags?: readonly string[] | string[] | null
        signature?: string | null
      } | null
    } | null
    action?: {
      rendererHints?: {
        residentMode?: unknown
        reasonTags?: readonly string[] | string[] | null
        signature?: string | null
      } | null
    } | null
  } | null | undefined,
) {
  const cueStillVoicedContinuity = hasAlicizationStillVoicedSameHerCarry({
    signature: cue?.rendererHints?.signature ?? null,
    reasonTags: cue?.rendererHints?.reasonTags ?? [],
  })
  const cueResidentMode = cue?.rendererHints?.residentMode
  if (cueResidentMode === 'measured-return' || cueResidentMode === 'repair-before-closeness' || cueResidentMode === 'quiet-companionship')
    return cueResidentMode
  if (cueStillVoicedContinuity)
    return 'measured-return'

  const faceStillVoicedContinuity = hasAlicizationStillVoicedSameHerCarry({
    signature: lifeFrame?.face?.rendererHints?.signature ?? null,
    reasonTags: lifeFrame?.face?.rendererHints?.reasonTags ?? [],
  })
  const faceResidentMode = lifeFrame?.face?.rendererHints?.residentMode
  if (faceResidentMode === 'measured-return' || faceResidentMode === 'repair-before-closeness' || faceResidentMode === 'quiet-companionship')
    return faceResidentMode
  if (faceStillVoicedContinuity)
    return 'measured-return'

  const actionStillVoicedContinuity = hasAlicizationStillVoicedSameHerCarry({
    signature: lifeFrame?.action?.rendererHints?.signature ?? null,
    reasonTags: lifeFrame?.action?.rendererHints?.reasonTags ?? [],
  })
  const actionResidentMode = lifeFrame?.action?.rendererHints?.residentMode
  if (actionResidentMode === 'measured-return' || actionResidentMode === 'repair-before-closeness' || actionResidentMode === 'quiet-companionship')
    return actionResidentMode
  if (actionStillVoicedContinuity)
    return 'measured-return'

  return null
}

function resolvePreviewSpeechTimingBias(input: {
  activeCueSource: StageEmbodimentPerformanceState['activeCueSource']
  cue: StageEmbodimentPerformanceState['activeCue']
  previewAhead: boolean
  transientLife: StageEmbodimentSpeechPlaybackItem['digitalLifeFrame'] | null | undefined
}) {
  const neutralBias = {
    actionScale: 1,
    expressionScale: 1,
    headNodScale: 1,
    opennessBias: 0,
    settleBias: 0,
  }

  if (!input.previewAhead || input.activeCueSource !== 'preview')
    return neutralBias

  const cueHints = input.cue?.rendererHints ?? null
  const faceHints = input.transientLife?.face.rendererHints ?? null
  const actionHints = input.transientLife?.action.rendererHints ?? null
  const residentMode = (
    cueHints?.residentMode
    ?? faceHints?.residentMode
    ?? actionHints?.residentMode
    ?? ''
  ).trim().toLowerCase()
  const signature = cueHints?.signature
    ?? faceHints?.signature
    ?? actionHints?.signature
    ?? null
  const reasonTags = cueHints?.reasonTags
    ?? faceHints?.reasonTags
    ?? actionHints?.reasonTags
    ?? []
  const preferredPauseMode = cueHints?.preferredPauseMode
    ?? faceHints?.preferredPauseMode
    ?? actionHints?.preferredPauseMode
    ?? null
  const preferredVoiceMode = cueHints?.preferredVoiceMode
    ?? faceHints?.preferredVoiceMode
    ?? actionHints?.preferredVoiceMode
    ?? null
  const preferredPacingMode = cueHints?.preferredPacingMode
    ?? faceHints?.preferredPacingMode
    ?? actionHints?.preferredPacingMode
    ?? null
  const softenedSameHerReturn = hasAlicizationSoftenedSameHerCarry({
    signature,
    reasonTags,
  })
  const softerCompanionshipPreview = residentMode === 'measured-return'
    || residentMode === 'repair-before-closeness'
    || residentMode === 'quiet-companionship'
    || residentMode === 'quiet-accompaniment'
    || residentMode === 'same-thread-continuation'
    || softenedSameHerReturn

  if (!softerCompanionshipPreview)
    return neutralBias

  const voiceSoftening = preferredVoiceMode === 'lower-pressure' ? 1 : 0
  const pacingSoftening = preferredPacingMode === 'slower' ? 1 : 0
  const pauseSoftening = preferredPauseMode === 'longer' ? 1 : 0

  return {
    actionScale: 1 - voiceSoftening * 0.12 - pacingSoftening * 0.08 - pauseSoftening * 0.04,
    expressionScale: 1 - voiceSoftening * 0.04 - pacingSoftening * 0.03 - pauseSoftening * 0.02,
    headNodScale: 1 - voiceSoftening * 0.12 - pacingSoftening * 0.1 - pauseSoftening * 0.06,
    opennessBias: -(voiceSoftening * 0.04 + pacingSoftening * 0.03 + pauseSoftening * 0.01),
    settleBias: voiceSoftening * 0.05 + pacingSoftening * 0.04 + pauseSoftening * 0.02,
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
  const prosodyBodyCoupling = clamp01(
    input.speech.dynamics.prosodyIntensity * 0.62
    + input.speech.dynamics.cadencePulse * 0.38,
  )
  const dynamicStillness = clamp01(
    base.stillness * 0.88
    - dynamicExpressivity * 0.08
    - input.motionPulse * 0.06
    + (1 - input.speech.dynamics.cadencePulse) * 0.04
    - prosodyBodyCoupling * 0.03
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
      amplitude: mixUnit(idleMotor.breath.amplitude, clamp01(base.breath.amplitude + input.speech.dynamics.speechEnergy * 0.12 + input.cueBeat * 0.06 + prosodyBodyCoupling * 0.08), activity),
      pace: mixUnit(idleMotor.breath.pace, clamp01(base.breath.pace + input.speech.dynamics.cadencePulse * 0.18 + prosodyBodyCoupling * 0.12), activity),
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
      lean: mixSigned(idleMotor.body.lean, clampSigned(base.body.lean + input.cueHead * 0.08 + prosodyBodyCoupling * 0.04, -1, 1), activity),
      openness: mixUnit(idleMotor.body.openness, clamp01(base.body.openness + dynamicExpressivity * 0.08 - dynamicStillness * 0.04 + prosodyBodyCoupling * 0.04), activity),
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

function cloneActiveCue(
  cue: StageEmbodimentPerformanceState['activeCue'],
  options?: {
    bodySegmentMatched?: boolean | null | undefined
    faceSegmentMatched?: boolean | null | undefined
    motionSegmentMatched?: boolean | null | undefined
    lipsyncSegmentMatched?: boolean | null | undefined
  },
) {
  if (!cue)
    return null

  const preferredExpressionAliases = cue.rendererHints?.preferredExpressionAliases
    ? [...cue.rendererHints.preferredExpressionAliases]
    : undefined
  const preferredMotionAliases = cue.rendererHints?.preferredMotionAliases
    ? [...cue.rendererHints.preferredMotionAliases]
    : undefined
  const reasonTags = cue.rendererHints?.reasonTags
    ? [...cue.rendererHints.reasonTags]
    : undefined
  const preferredPauseMode = cue.rendererHints?.preferredPauseMode ?? undefined
  const preferredLipsyncMode = cue.rendererHints?.preferredLipsyncMode ?? undefined
  const preferredVoiceMode = cue.rendererHints?.preferredVoiceMode ?? undefined
  const preferredPacingMode = cue.rendererHints?.preferredPacingMode ?? undefined
  const preserveSoftenedSameHerVrmSettle = hasAlicizationSoftenedSameHerCarry(cue.rendererHints)

  return {
    ...cue,
    rendererSettle: cue.rendererSettle
      ? {
          live2dFacialReleaseMs: cue.rendererSettle.live2dFacialReleaseMs,
          live2dMotionFollowThroughMs: cue.rendererSettle.live2dMotionFollowThroughMs,
          vrmActionFadeMs: preserveSoftenedSameHerVrmSettle
            ? cue.rendererSettle.vrmActionFadeMs
            : resolveRendererSettleMsWithPersonaBias({
                baseMs: cue.rendererSettle.vrmActionFadeMs,
                bodySegmentMatched: options?.bodySegmentMatched ?? null,
                faceSegmentMatched: options?.faceSegmentMatched ?? null,
                motionSegmentMatched: options?.motionSegmentMatched ?? null,
                lipsyncSegmentMatched: options?.lipsyncSegmentMatched ?? null,
                preferredExpressionAliases: preferredExpressionAliases ?? [],
                preferredMotionAliases: preferredMotionAliases ?? [],
                rendererHints: cue.rendererHints ?? null,
              }),
          vrmExpressionBlendMs: preserveSoftenedSameHerVrmSettle
            ? cue.rendererSettle.vrmExpressionBlendMs
            : resolveRendererSettleMsWithPersonaBias({
                baseMs: cue.rendererSettle.vrmExpressionBlendMs,
                bodySegmentMatched: options?.bodySegmentMatched ?? null,
                faceSegmentMatched: options?.faceSegmentMatched ?? null,
                motionSegmentMatched: options?.motionSegmentMatched ?? null,
                lipsyncSegmentMatched: options?.lipsyncSegmentMatched ?? null,
                preferredExpressionAliases: preferredExpressionAliases ?? [],
                preferredMotionAliases: preferredMotionAliases ?? [],
                rendererHints: cue.rendererHints ?? null,
              }),
        }
      : null,
    rendererHints: cue.rendererHints
      ? {
          residentMode: cue.rendererHints.residentMode ?? undefined,
          preferredExpressionAliases,
          preferredMotionAliases,
          preferredBlinkCadence: cue.rendererHints.preferredBlinkCadence ?? undefined,
          preferredGazeMode: cue.rendererHints.preferredGazeMode ?? undefined,
          preferredPauseMode,
          preferredLipsyncMode,
          preferredVoiceMode,
          preferredPacingMode,
          reasonTags,
          signature: cue.rendererHints.signature ?? undefined,
        }
      : null,
  }
}

function mergeExplicitCueSemantics(
  cue: StageEmbodimentPerformanceState['activeCue'],
  explicitCue: StageEmbodimentSpeechPlaybackItem['cue'] | null | undefined,
) {
  if (!cue)
    return explicitCue ? { ...explicitCue } : null
  if (!explicitCue)
    return cue

  return {
    ...cue,
    rendererHints: explicitCue.rendererHints ?? cue.rendererHints,
    rendererSettle: explicitCue.rendererSettle ?? cue.rendererSettle,
  }
}

function resolveEmbodimentScriptFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): AlicizationEmbodimentScriptV1 | null {
  return normalizeAlicizationEmbodimentScript(metadata?.embodimentScript)
}

function cloneRendererHints(
  hints: AlicizationDialogueEmbodimentRendererHints | null | undefined,
): AlicizationDialogueEmbodimentRendererHints | null {
  if (!hints)
    return null

  return {
    residentMode: hints.residentMode ?? undefined,
    preferredExpressionAliases: hints.preferredExpressionAliases
      ? [...hints.preferredExpressionAliases]
      : undefined,
    preferredMotionAliases: hints.preferredMotionAliases
      ? [...hints.preferredMotionAliases]
      : undefined,
    preferredBlinkCadence: hints.preferredBlinkCadence ?? undefined,
    preferredGazeMode: hints.preferredGazeMode ?? undefined,
    preferredPauseMode: hints.preferredPauseMode ?? undefined,
    preferredLipsyncMode: hints.preferredLipsyncMode ?? undefined,
    preferredVoiceMode: hints.preferredVoiceMode ?? undefined,
    preferredPacingMode: hints.preferredPacingMode ?? undefined,
    reasonTags: hints.reasonTags
      ? [...hints.reasonTags]
      : undefined,
    signature: hints.signature ?? undefined,
  }
}

function hasAudibleSameHerRendererCarry(
  rendererHints: AlicizationDialogueEmbodimentRendererHints | null | undefined,
) {
  return hasAlicizationAudibleSameHerCarry(rendererHints)
}

function hasBodyVoiceOnlySameHerRendererCarry(
  rendererHints: AlicizationDialogueEmbodimentRendererHints | null | undefined,
) {
  return hasAlicizationBodyVoiceOnlySameHerCarry(rendererHints)
}

function hasQuieterSameHerRendererCarry(
  rendererHints: AlicizationDialogueEmbodimentRendererHints | null | undefined,
) {
  return hasAlicizationQuieterSameHerCarry(rendererHints)
}

function hasStillVoicedFaceLineRendererCarry(
  rendererHints: AlicizationDialogueEmbodimentRendererHints | null | undefined,
) {
  const signatureTokens = rendererHints?.signature
    ? normalizeAlicizationRendererHintTokens([rendererHints.signature])
    : []
  const reasonTags = normalizeAlicizationRendererHintTokens(rendererHints?.reasonTags)

  return (
    signatureTokens.some(token => token.includes('still_voiced_face_line'))
    || signatureTokens.some(token => token.includes('still_voiced_face_motion_line'))
    || signatureTokens.some(token => token.includes('still_voiced_face_lipsync_line'))
    || signatureTokens.some(token => token.includes('lane=face+motion+voice_only'))
    || signatureTokens.some(token => token.includes('lane=face+lipsync+voice_only'))
    || reasonTags.some(tag => tag.includes('still_voiced_face_line'))
    || reasonTags.some(tag => tag.includes('still_voiced_face_motion_line'))
    || reasonTags.some(tag => tag.includes('still_voiced_face_lipsync_line'))
  )
}

function hasStillVoicedMotionLineRendererCarry(
  rendererHints: AlicizationDialogueEmbodimentRendererHints | null | undefined,
) {
  const signatureTokens = rendererHints?.signature
    ? normalizeAlicizationRendererHintTokens([rendererHints.signature])
    : []
  const reasonTags = normalizeAlicizationRendererHintTokens(rendererHints?.reasonTags)

  return (
    signatureTokens.some(token => token.includes('still_voiced_motion_line'))
    || signatureTokens.some(token => token.includes('still_voiced_face_motion_line'))
    || signatureTokens.some(token => token.includes('still_voiced_motion_lipsync_line'))
    || signatureTokens.some(token => token.includes('lane=face+motion+voice_only'))
    || signatureTokens.some(token => token.includes('lane=motion+lipsync+voice_only'))
    || reasonTags.some(tag => tag.includes('still_voiced_face_motion_line'))
    || reasonTags.some(tag => tag.includes('still_voiced_motion_line'))
    || reasonTags.some(tag => tag.includes('still_voiced_motion_lipsync_line'))
  )
}

function shouldSuppressSameHerCarryActionCue(input: {
  cue: StageEmbodimentPerformanceState['activeCue']
  driverAuthority: StageEmbodimentPerformanceState['driverAuthority']
}) {
  const driverAuthority = input.driverAuthority
  const actionCue = input.cue?.actionCue?.trim() || null
  if (!input.cue || !actionCue)
    return false

  const residentMode = input.cue.rendererHints?.residentMode ?? null
  const reasonTags = normalizeAlicizationRendererHintTokens(input.cue.rendererHints?.reasonTags)
  const audibleSameHerCarry = hasAudibleSameHerRendererCarry(input.cue.rendererHints)
  const bodyVoiceOnlySameHerCarry = hasBodyVoiceOnlySameHerRendererCarry(input.cue.rendererHints)
  const quieterSameHerCarry = hasQuieterSameHerRendererCarry(input.cue.rendererHints)
  const stillVoicedFaceLineCarry = hasStillVoicedFaceLineRendererCarry(input.cue.rendererHints)
  const stillVoicedMotionLineCarry = hasStillVoicedMotionLineRendererCarry(input.cue.rendererHints)

  const suppressibleActionCue = actionCue === 'steady_focus'
    || actionCue === 'observe_focus'
    || (
      actionCue === 'idle_settle'
      && (residentMode === 'repair-before-closeness' || residentMode === 'measured-return')
      && (audibleSameHerCarry || bodyVoiceOnlySameHerCarry)
    )
  if (!suppressibleActionCue)
    return false

  if (!audibleSameHerCarry && !bodyVoiceOnlySameHerCarry && !quieterSameHerCarry && !stillVoicedFaceLineCarry && !stillVoicedMotionLineCarry)
    return false

  if (stillVoicedFaceLineCarry) {
    return !driverAuthority?.bodySegmentMatched || !driverAuthority?.motionSegmentMatched
  }

  if (stillVoicedMotionLineCarry)
    return !driverAuthority?.motionSegmentMatched

  if (!driverAuthority?.bodySegmentMatched || driverAuthority?.motionSegmentMatched)
    return false

  return (
    reasonTags.includes('embodiment:body+voice_only')
    || reasonTags.includes('embodiment:body_lipsync_voice_rejoin')
    || reasonTags.includes('embodiment:body+lipsync_only')
  )
}

function suppressSameHerCarryActionCue(
  cue: StageEmbodimentPerformanceState['activeCue'],
) {
  if (!cue)
    return cue

  return {
    ...cue,
    actionCue: null,
    actionWindow: 'none' as const,
  }
}

function cloneRendererSettle(
  settle: AlicizationDialogueSpeechRendererSettleHints | null | undefined,
): AlicizationDialogueSpeechRendererSettleHints | null {
  if (!settle)
    return null

  return {
    live2dFacialReleaseMs: settle.live2dFacialReleaseMs,
    live2dMotionFollowThroughMs: settle.live2dMotionFollowThroughMs,
    vrmActionFadeMs: settle.vrmActionFadeMs,
    vrmExpressionBlendMs: settle.vrmExpressionBlendMs,
  }
}

function cloneCueWithoutRendererSettle(
  cue: StageEmbodimentPerformanceState['activeCue'],
) {
  if (!cue)
    return null

  return {
    ...cue,
    rendererHints: cloneRendererHints(cue.rendererHints),
    rendererSettle: cloneRendererSettle(cue.rendererSettle),
  }
}

function applyPreviewRendererOnlyBodyAuthorityGuard(
  cue: StageEmbodimentPerformanceState['activeCue'],
  bodySegmentMatched: boolean | null | undefined,
) {
  if (!cue || bodySegmentMatched !== false || !cue.rendererSettle)
    return cue

  const residentMode = cue.rendererHints?.residentMode ?? null
  const stillVoicedSameHerCarry = hasAlicizationStillVoicedSameHerCarry({
    signature: cue.rendererHints?.signature ?? null,
    reasonTags: cue.rendererHints?.reasonTags ?? [],
  })
  if (
    residentMode !== 'repair-before-closeness'
    && residentMode !== 'measured-return'
    && !stillVoicedSameHerCarry
  ) {
    return cue
  }

  const expressionAliases = cue.rendererHints?.preferredExpressionAliases ?? []
  const motionAliases = cue.rendererHints?.preferredMotionAliases ?? []

  return {
    ...cue,
    rendererHints: cloneRendererHints(cue.rendererHints),
    rendererSettle: {
      ...cue.rendererSettle,
      vrmActionFadeMs: resolveRendererSettleMsWithPersonaBias({
        baseMs: cue.rendererSettle.vrmActionFadeMs,
        bodySegmentMatched: false,
        preferredExpressionAliases: expressionAliases,
        preferredMotionAliases: motionAliases,
      }),
      vrmExpressionBlendMs: resolveRendererSettleMsWithPersonaBias({
        baseMs: cue.rendererSettle.vrmExpressionBlendMs,
        bodySegmentMatched: false,
        preferredExpressionAliases: expressionAliases,
        preferredMotionAliases: motionAliases,
      }),
    },
  }
}

function shouldSuppressPreviewRendererOnlyCue(input: {
  bodySegmentMatched: boolean | null | undefined
  cue: string | null | undefined
  cueSource: 'facial' | 'action'
  previewLife: StageEmbodimentSpeechPlaybackItem['digitalLifeFrame'] | null | undefined
}) {
  if (input.bodySegmentMatched !== false || !input.cue)
    return false

  if (input.cueSource === 'facial')
    return input.previewLife?.face.expressionMode === 'recover'

  return input.previewLife?.action.actionMode === 'none'
}

function resolveScriptCueRendererAuthority(input: {
  item: StageEmbodimentSpeechPlaybackItem | null | undefined
  segmentId?: string | null
}) {
  const script = resolveEmbodimentScriptFromMetadata(input.item?.metadata)
  if (!script)
    return null

  const normalizedSegmentId = normalizeDriverSegmentId(
    input.segmentId
    ?? resolvePlaybackItemAuthoritySegmentId(input.item)
    ?? null,
  ) ?? ''
  if (!normalizedSegmentId)
    return null

  const scriptSegment = script.speechPlan.segments.find(segment => segment.id === normalizedSegmentId)
  if (!scriptSegment)
    return null

  return {
    rendererHints: cloneRendererHints(scriptSegment.rendererHints ?? null),
    rendererSettle: cloneRendererSettle(scriptSegment.rendererSettle ?? null),
  }
}

function mergeScriptCueRendererAuthority(
  cue: StageEmbodimentPerformanceState['activeCue'],
  scriptCueAuthority: ReturnType<typeof resolveScriptCueRendererAuthority>,
) {
  if (!cue || !scriptCueAuthority)
    return cue

  const preservePreviewContinuitySettle = hasAlicizationSoftenedSameHerCarry(cue.rendererHints)

  return {
    ...cue,
    rendererHints: scriptCueAuthority.rendererHints ?? cue.rendererHints,
    rendererSettle: preservePreviewContinuitySettle && cue.rendererSettle
      ? {
          live2dFacialReleaseMs: cue.rendererSettle.live2dFacialReleaseMs
            ?? scriptCueAuthority.rendererSettle?.live2dFacialReleaseMs,
          live2dMotionFollowThroughMs: cue.rendererSettle.live2dMotionFollowThroughMs
            ?? scriptCueAuthority.rendererSettle?.live2dMotionFollowThroughMs,
          vrmActionFadeMs: cue.rendererSettle.vrmActionFadeMs
            ?? scriptCueAuthority.rendererSettle?.vrmActionFadeMs,
          vrmExpressionBlendMs: cue.rendererSettle.vrmExpressionBlendMs
            ?? scriptCueAuthority.rendererSettle?.vrmExpressionBlendMs,
        }
      : scriptCueAuthority.rendererSettle ?? cue.rendererSettle,
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
    segmentIdOverride?: string | null,
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
      segmentId: normalizeDriverSegmentId(segmentIdOverride) ?? state.value.activeSegment?.segmentId ?? null,
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
      bodySegmentMatched?: boolean | null
      holdMs: number
      heldCue: StageEmbodimentPerformanceState['activeCue']
      heldUntil: number
      previewCue: StageEmbodimentPerformanceState['activeCue']
      segmentCue: StageEmbodimentPerformanceState['activeCue']
    },
  ) {
    if (options.previewCue) {
      return {
        cue: cloneActiveCue(options.previewCue, {
          bodySegmentMatched: options.bodySegmentMatched ?? null,
          faceSegmentMatched: null,
          motionSegmentMatched: null,
          lipsyncSegmentMatched: null,
        }),
        source: 'preview' as const,
        heldCue: options.heldCue,
        heldUntil: options.heldUntil,
      }
    }

    if (options.segmentCue) {
      const nextCue = cloneActiveCue(options.segmentCue, {
        bodySegmentMatched: options.bodySegmentMatched ?? null,
        faceSegmentMatched: null,
        motionSegmentMatched: null,
        lipsyncSegmentMatched: null,
      })
      return {
        cue: nextCue,
        source: 'segment' as const,
        heldCue: nextCue,
        heldUntil: now + options.holdMs,
      }
    }

    if (options.heldCue && options.heldUntil > now) {
      return {
        cue: cloneActiveCue(options.heldCue, {
          bodySegmentMatched: options.bodySegmentMatched ?? null,
          faceSegmentMatched: null,
          motionSegmentMatched: null,
          lipsyncSegmentMatched: null,
        }),
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
    const speechActivelyPlaying = speech.active && speech.phase !== 'stopping'
    const itemPlaybackTelemetry = resolvePlaybackTelemetryMetadata(speech.item)
    const playbackTelemetry = options.playbackTelemetry?.value ?? itemPlaybackTelemetry ?? null
    const playbackProsodyAuthority = resolvePlaybackTelemetryProsodyAuthority(playbackTelemetry)
    const previewAhead = !speechActivelyPlaying
    const upcomingSegment = previewAhead
      ? syncUpcomingSegmentSnapshot(options.upcomingSpeechSegment?.value)
      : null
    const deltaSeconds = clampSigned((now - lastTickAt) / 1000, 1 / 240, 0.2, 1 / 60)
    lastTickAt = now

    const motionDecay = 1 - Math.exp(-deltaSeconds * 7)
    state.value.motionPulse += (0 - state.value.motionPulse) * motionDecay
    state.value.motionPulse = clamp01(state.value.motionPulse)

    const previousSegmentId = lastSegmentId
    const segmentId = resolvePlaybackItemAuthoritySegmentId(speech.item) ?? ''
    const authorityAlignedActiveSegment = createAuthorityAlignedActiveSegment(speech.item)
    const segmentCue = speech.item?.cue ?? null
    const segmentLife = speech.item?.digitalLifeFrame ?? null
    const segmentPlaybackActive = speechActivelyPlaying
    const segmentDriverFace = segmentPlaybackActive
      ? resolveExplicitPlaybackDriverFaceMetadata({
        segmentId,
        telemetry: playbackTelemetry,
      }) ?? resolvePlaybackDriverFaceMetadata(speech.item, segmentId)
      : null
    const segmentDriverMotion = segmentPlaybackActive
      ? resolveExplicitPlaybackDriverMotionMetadata({
        segmentId,
        telemetry: playbackTelemetry,
      }) ?? resolvePlaybackDriverMotionMetadata(speech.item, segmentId)
      : null
    const segmentDriverLipSync = segmentPlaybackActive
      ? resolveExplicitPlaybackDriverLipSyncMetadata({
          playbackPhase: 'playing',
          segmentId,
          telemetry: playbackTelemetry,
        })
      : null
    const segmentExplicitCue = segmentPlaybackActive
      ? resolveExplicitPlaybackCueMetadata({
          segmentId,
          telemetry: playbackTelemetry,
        })
      : null
    const segmentProjectedCue = segmentPlaybackActive
      ? mergeScriptCueRendererAuthority(
          mergeExplicitCueSemantics(
            segmentCue ?? segmentExplicitCue ?? resolvePlaybackDriverProjectedCue({
              face: segmentDriverFace,
              facialCue: segmentDriverFace?.facialCue ?? null,
              item: speech.item,
              lipsync: segmentDriverLipSync,
              motion: segmentDriverMotion,
              prosodyAuthority: playbackProsodyAuthority,
            }),
            segmentExplicitCue,
          ),
          resolveScriptCueRendererAuthority({
            item: speech.item,
            segmentId,
          }),
        )
      : null
    const segmentCueBridgeAuthorityActive = Boolean(
      segmentPlaybackActive
      && segmentId
      && !segmentDriverFace
      && !segmentDriverMotion
      && (segmentDriverLipSync || matchesDriverSegment(playbackTelemetry?.drivers.body?.segmentId, segmentId))
      && (!playbackTelemetry?.driverAuthority?.bodySegmentMatched
        || playbackTelemetry.driverAuthority.faceSegmentMatched
        || playbackTelemetry.driverAuthority.motionSegmentMatched
        || playbackTelemetry.driverAuthority.lipsyncSegmentMatched
        || !matchesDriverSegment(playbackTelemetry.driverAuthority.segmentId, segmentId)),
    )
    const segmentAuthorityFace = segmentDriverFace
      ?? (
        segmentCueBridgeAuthorityActive
          ? createCueBridgeFaceMetadata({
              cue: segmentProjectedCue,
              segmentId,
            })
          : null
      )
    const segmentAuthorityMotion = segmentDriverMotion
      ?? (
        segmentCueBridgeAuthorityActive
          ? createCueBridgeMotionMetadata({
              cue: segmentProjectedCue,
              segmentId,
            })
          : null
      )
    const segmentDriverAuthority = resolveDriverAuthoritySnapshot({
      cue: segmentProjectedCue,
      face: segmentAuthorityFace,
      motion: segmentAuthorityMotion,
      lipsync: segmentDriverLipSync,
      item: speech.item,
      telemetry: playbackTelemetry,
    })
    const segmentBodyOnlyAuthorityCarry = Boolean(
      segmentPlaybackActive
      && segmentDriverAuthority?.bodySegmentMatched
      && !segmentDriverAuthority.faceSegmentMatched
      && !segmentDriverAuthority.motionSegmentMatched
      && !segmentDriverAuthority.lipsyncSegmentMatched,
    )
    const segmentSameHerCarryActionCueSuppressed = shouldSuppressSameHerCarryActionCue({
      cue: segmentProjectedCue,
      driverAuthority: segmentDriverAuthority,
    })
    const segmentProjectedCueForCarry = segmentBodyOnlyAuthorityCarry
      ? null
      : segmentSameHerCarryActionCueSuppressed
        ? suppressSameHerCarryActionCue(segmentProjectedCue)
        : segmentProjectedCue
    const residentPerformance = state.value.residentPerformance
    const segmentChanged = Boolean(segmentId) && segmentId !== lastSegmentId
    const segmentGestureWeight = Math.max(
      clamp01(segmentCue?.gestureWeight),
      clamp01(segmentLife?.action.intensity),
      clamp01(segmentDriverMotion?.intensity),
    )
    const shouldIssueLateSegmentRealignPulse = Boolean(
      segmentPlaybackActive
      && !segmentChanged
      && segmentId
      && segmentProjectedCueForCarry?.actionCue
      && ((segmentProjectedCueForCarry.actionWindow !== 'none') || segmentGestureWeight >= 0.34)
      && (
        state.value.activeCueSource !== 'segment'
        || state.value.activeCue?.id !== segmentProjectedCueForCarry.id
        || state.value.activeActionCue !== segmentProjectedCueForCarry.actionCue
      ),
    )
    if (segmentChanged) {
      lastSegmentId = segmentId
      if (segmentPlaybackActive)
        lastPreviewPulseSegmentId = segmentId
      if (
        segmentPlaybackActive
        && !segmentSameHerCarryActionCueSuppressed
        && ((segmentCue?.actionWindow !== 'none') || segmentGestureWeight >= 0.34)
      ) {
        issueActionPulse(
          previousSegmentId ? 'segment-shift' : 'segment-start',
          now,
          segmentActionPulseGapMs,
          segmentLife?.action.actionCue ?? segmentCue?.actionCue ?? segmentDriverMotion?.actionCue,
          segmentId,
        )
      }
    }
    else if (shouldIssueLateSegmentRealignPulse && !segmentSameHerCarryActionCueSuppressed) {
      issueActionPulse(
        'segment-start',
        now,
        0,
        segmentProjectedCueForCarry?.actionCue,
        segmentId,
      )
    }
    else if (!speechActivelyPlaying && !segmentId) {
      lastSegmentId = ''
    }

    const previewSegmentId = resolvePlaybackItemAuthoritySegmentId(upcomingSegment) ?? ''
    const previewCue = upcomingSegment?.cue ?? null
    const previewLife = upcomingSegment?.digitalLifeFrame ?? null
    const seededAuthoritySegmentId = normalizeDriverSegmentId(playbackTelemetry?.driverAuthority?.segmentId)
    const previewCueBridgingActive = Boolean(
      previewSegmentId
      && previewCue
      && seededAuthoritySegmentId
      && previewSegmentId !== seededAuthoritySegmentId,
    )
    const previewDriverFace = applyPreviewCueBridgeDriverProvenance({
      driver: resolvePlaybackDriverFaceMetadata(upcomingSegment, previewSegmentId),
      previewCueActive: previewCueBridgingActive,
      previewSegmentId,
      seededAuthoritySegmentId,
    })
    const previewDriverMotion = applyPreviewCueBridgeDriverProvenance({
      driver: resolvePlaybackDriverMotionMetadata(upcomingSegment, previewSegmentId),
      previewCueActive: previewCueBridgingActive,
      previewSegmentId,
      seededAuthoritySegmentId,
    })
    const previewDriverFaceScale = resolveDriverCueConfidenceScale(previewDriverFace?.confidence)
    const previewDriverMotionScale = resolveDriverCueConfidenceScale(previewDriverMotion?.confidence)
    const segmentDriverFaceScale = resolveDriverCueConfidenceScale(segmentDriverFace?.confidence)
    const segmentDriverMotionScale = resolveDriverCueConfidenceScale(segmentDriverMotion?.confidence)
    const previewGestureWeight = Math.max(
      clamp01(previewCue?.gestureWeight),
      clamp01(previewLife?.action.intensity),
      clamp01(previewDriverMotion?.intensity) * previewDriverMotionScale,
    )
    const cadencePeakActive = Boolean(
      segmentPlaybackActive
      && segmentCue?.actionWindow === 'cadence-peak'
      && Math.max(clamp01(segmentCue.beatWeight), clamp01(segmentLife?.action.intensity), clamp01(segmentDriverMotion?.intensity)) >= 0.44
      && speech.dynamics.cadencePulse >= Math.max(0.46, 0.68 - Math.max(clamp01(segmentCue.beatWeight), clamp01(segmentLife?.action.intensity), clamp01(segmentDriverMotion?.intensity)) * 0.18),
    )
    if (cadencePeakActive && !lastCadencePeakActive) {
      const beatSegmentKey = `${segmentId}:${state.value.actionPulse.revision}`
      if (beatSegmentKey !== lastBeatPulseSegmentKey) {
        issueActionPulse('segment-beat', now, segmentBeatPulseGapMs, segmentLife?.action.actionCue ?? segmentCue?.actionCue ?? segmentDriverMotion?.actionCue, segmentId)
        lastBeatPulseSegmentKey = beatSegmentKey
      }
    }
    lastCadencePeakActive = cadencePeakActive

    const previewDriverFacialCue = previewDriverFace?.preUtteranceCue ?? previewDriverFace?.facialCue ?? null
    const stoppingSegmentId = resolvePlaybackItemAuthoritySegmentId(speech.item)
    const stoppingDriverFace = !speechActivelyPlaying && !previewSegmentId
      ? resolveExplicitPlaybackDriverFaceMetadata({
        segmentId: stoppingSegmentId,
        telemetry: playbackTelemetry,
      }) ?? resolvePlaybackDriverFaceMetadata(speech.item, stoppingSegmentId)
      : null
    const stoppingDriverMotion = !speechActivelyPlaying && !previewSegmentId
      ? resolveExplicitPlaybackDriverMotionMetadata({
        segmentId: stoppingSegmentId,
        telemetry: playbackTelemetry,
      }) ?? resolvePlaybackDriverMotionMetadata(speech.item, stoppingSegmentId)
      : null
    const stoppingExplicitCue = !speechActivelyPlaying && !previewSegmentId
      ? resolveExplicitPlaybackCueMetadata({
          segmentId: stoppingSegmentId,
          telemetry: playbackTelemetry,
        })
      : null
    const previewFacialCue = previewCue?.facialCue
      ?? previewDriverFacialCue
      ?? stoppingDriverFace?.postUtteranceCue
      ?? stoppingDriverFace?.facialCue
      ?? null
    const stoppingDriverProjectedCue = !speechActivelyPlaying && !previewSegmentId
      ? resolvePlaybackDriverProjectedCue({
          face: stoppingDriverFace,
          facialCue: stoppingExplicitCue?.facialCue ?? stoppingDriverFace?.facialCue ?? null,
          item: speech.item,
          lipsync: null,
          motion: stoppingDriverMotion,
          preview: true,
        })
      : null
    const stoppingMergedCue = stoppingExplicitCue
      ? {
          ...stoppingExplicitCue,
          emotion: stoppingDriverProjectedCue?.emotion ?? stoppingExplicitCue.emotion,
          gestureWeight: stoppingDriverProjectedCue?.gestureWeight ?? stoppingExplicitCue.gestureWeight,
          facialWeight: stoppingDriverProjectedCue?.facialWeight ?? stoppingExplicitCue.facialWeight,
          prosodyWeight: stoppingDriverProjectedCue?.prosodyWeight ?? stoppingExplicitCue.prosodyWeight,
          beatWeight: stoppingDriverProjectedCue?.beatWeight ?? stoppingExplicitCue.beatWeight,
          mouthWeight: stoppingDriverProjectedCue?.mouthWeight ?? stoppingExplicitCue.mouthWeight,
          headWeight: stoppingDriverProjectedCue?.headWeight ?? stoppingExplicitCue.headWeight,
          actionCue: stoppingDriverProjectedCue?.actionCue ?? stoppingExplicitCue.actionCue,
          facialCue: stoppingDriverProjectedCue?.facialCue ?? stoppingExplicitCue.facialCue,
          actionWindow: stoppingDriverProjectedCue?.actionCue
            ? stoppingDriverProjectedCue.actionWindow
            : stoppingExplicitCue.actionWindow,
          interruptMode: stoppingDriverProjectedCue?.interruptMode ?? stoppingExplicitCue.interruptMode,
          actionHoldMs: stoppingDriverProjectedCue?.actionHoldMs ?? stoppingExplicitCue.actionHoldMs,
          facialHoldMs: stoppingDriverProjectedCue?.facialHoldMs ?? stoppingExplicitCue.facialHoldMs,
          emotionHoldMs: stoppingDriverProjectedCue?.emotionHoldMs ?? stoppingExplicitCue.emotionHoldMs,
          rendererSettle: stoppingDriverProjectedCue?.rendererSettle ?? stoppingExplicitCue.rendererSettle,
        }
      : stoppingDriverProjectedCue
        ? {
            ...stoppingDriverProjectedCue,
            rendererSettle: null,
          }
        : null
    const previewProjectedCue = previewCue ?? stoppingMergedCue ?? resolvePlaybackDriverProjectedCue({
      face: previewDriverFace ?? stoppingDriverFace,
      facialCue: previewFacialCue,
      item: upcomingSegment ?? speech.item,
      lipsync: null,
      motion: previewDriverMotion ?? stoppingDriverMotion,
      preview: true,
    })
    const previewAuthorityFace = previewDriverFace
      ?? (
        previewCueBridgingActive
          ? createCueBridgeFaceMetadata({
              cue: previewProjectedCue,
              segmentId: previewSegmentId,
            })
          : null
      )
      ?? stoppingDriverFace
    const previewAuthorityMotion = previewDriverMotion
      ?? (
        previewCueBridgingActive
          ? createCueBridgeMotionMetadata({
              cue: previewProjectedCue,
              segmentId: previewSegmentId,
            })
          : null
      )
      ?? stoppingDriverMotion
    const previewDriverAuthority = previewAhead
      ? resolveDriverAuthoritySnapshot({
          cue: previewCue ?? previewProjectedCue,
          face: previewAuthorityFace,
          ignoreSeededAuthority: Boolean(
            previewSegmentId
            && previewSegmentId !== seededAuthoritySegmentId,
          ),
          motion: previewAuthorityMotion,
          lipsync: null,
          item: upcomingSegment ?? speech.item,
          telemetry: playbackTelemetry,
        })
      : null
    const previewSameHerCarryActionCueSuppressed = shouldSuppressSameHerCarryActionCue({
      cue: previewProjectedCue,
      driverAuthority: previewDriverAuthority,
    })
    const previewProjectedCueForCarry = previewSameHerCarryActionCueSuppressed
      ? suppressSameHerCarryActionCue(previewProjectedCue)
      : previewProjectedCue
    const previewProjectedCueForActiveLayer = previewCue
      ? applyPreviewRendererOnlyBodyAuthorityGuard(
          cloneCueWithoutRendererSettle(previewProjectedCueForCarry),
          previewDriverAuthority?.bodySegmentMatched ?? null,
        )
      : previewProjectedCueForCarry
    if (previewAhead && previewSegmentId) {
      if (
        !previewSameHerCarryActionCueSuppressed
        && previewSegmentId !== lastPreviewPulseSegmentId
        && (previewCue?.actionWindow === 'segment-start' || previewGestureWeight >= 0.34)
      ) {
        issueActionPulse(
          'segment-preview',
          now,
          segmentActionPulseGapMs,
          previewLife?.action.actionCue ?? previewProjectedCueForActiveLayer?.actionCue ?? previewDriverMotion?.actionCue,
          previewSegmentId,
        )
      }
      lastPreviewPulseSegmentId = previewSegmentId
    }
    else if (!previewSegmentId) {
      lastPreviewPulseSegmentId = ''
    }

    const segmentSuppressResidentFacialCue = Boolean(
      segmentPlaybackActive
      && segmentLife
      && segmentLife.face.expressionMode === 'recover'
      && !segmentProjectedCue?.facialCue,
    )
    const previewSuppressResidentFacialCue = Boolean(
      previewAhead
      && previewLife
      && previewLife.face.expressionMode === 'recover'
      && !previewCue?.facialCue,
    )
    const segmentSuppressResidentActionCue = Boolean(
      segmentPlaybackActive
      && segmentLife
      && segmentLife.action.actionMode === 'none'
      && !segmentProjectedCue?.actionCue,
    )
    const previewSuppressResidentActionCue = Boolean(
      previewAhead
      && previewLife
      && previewLife.action.actionMode === 'none'
      && !previewCue?.actionCue,
    ) || previewSameHerCarryActionCueSuppressed
    const segmentLipsyncOnlyAuthority = Boolean(
      segmentPlaybackActive
      && segmentDriverAuthority?.lipsyncSegmentMatched
      && !segmentDriverAuthority.bodySegmentMatched
      && !segmentDriverAuthority.faceSegmentMatched
      && !segmentDriverAuthority.motionSegmentMatched,
    )

    const facialCueLayer = previewAhead
      ? previewFacialCue
      && !shouldSuppressPreviewRendererOnlyCue({
        bodySegmentMatched: previewDriverAuthority?.bodySegmentMatched ?? null,
        cue: previewFacialCue,
        cueSource: 'facial',
        previewLife,
      })
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
            segmentProjectedCueForCarry?.facialHoldMs,
            segmentFacialCueHoldMs,
            { min: 90, max: 920 },
          ),
          heldCue: heldSegmentFacialCue,
          heldUntil: heldSegmentFacialCueUntil,
          residentCue: residentPerformance.facialCue ?? null,
          segmentCue: segmentProjectedCueForCarry?.facialCue ?? null,
          suppressResidentCue: segmentSuppressResidentFacialCue || segmentLipsyncOnlyAuthority || segmentBodyOnlyAuthorityCarry,
        })
    heldSegmentFacialCue = facialCueLayer.heldCue
    heldSegmentFacialCueUntil = facialCueLayer.heldUntil
    const facialCueSourceScale = facialCueLayer.source === 'resident'
      ? 0.62
      : facialCueLayer.source === 'preview'
        ? 0.86
        : facialCueLayer.source === 'segment'
          ? 1
          : 0

    const previewActionCue = previewProjectedCueForActiveLayer?.actionCue ?? null
    const actionCueLayer = previewAhead
      ? previewActionCue
      && !shouldSuppressPreviewRendererOnlyCue({
        bodySegmentMatched: previewDriverAuthority?.bodySegmentMatched ?? null,
        cue: previewActionCue,
        cueSource: 'action',
        previewLife,
      })
        ? {
            cue: previewActionCue,
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
            segmentProjectedCueForCarry?.actionHoldMs,
            segmentActionCueHoldMs,
            { min: 70, max: 720 },
          ),
          heldCue: heldSegmentActionCue,
          heldUntil: heldSegmentActionCueUntil,
          residentCue: residentPerformance.actionCue ?? null,
          segmentCue: segmentProjectedCueForCarry?.actionCue ?? null,
          suppressResidentCue: segmentSuppressResidentActionCue || segmentLipsyncOnlyAuthority || segmentBodyOnlyAuthorityCarry,
        })
    heldSegmentActionCue = actionCueLayer.heldCue
    heldSegmentActionCueUntil = actionCueLayer.heldUntil
    const actionCueSourceScale = actionCueLayer.source === 'resident'
      ? 0.62
      : actionCueLayer.source === 'preview'
        ? 0.86
        : actionCueLayer.source === 'segment'
          ? 1
          : 0

    const preferredPresence = resolvePreferredPresence(options.digitalLifeSpineDigest?.value)
    const audibleBodyLipSyncCarry = Boolean(
      matchesDriverSegment(segmentDriverLipSync?.segmentId, segmentDriverAuthority?.segmentId)
      && (
        segmentDriverLipSync?.playbackPhase === 'playing'
        || (segmentDriverLipSync?.continuityHoldMs ?? 0) > 0
      ),
    )
    const hesitantAudibleBodyCarry = Boolean(
      preferredPresence === 'hesitant'
      && !previewAhead
      && segmentDriverAuthority?.bodySegmentMatched
      && !segmentDriverAuthority.faceSegmentMatched
      && !segmentDriverAuthority.motionSegmentMatched
      && audibleBodyLipSyncCarry,
    )
    const suppressSegmentCueForHesitantAudibleBodyCarry = hesitantAudibleBodyCarry
      && !segmentDriverAuthority?.faceSegmentMatched
      && !segmentDriverAuthority?.motionSegmentMatched

    const activeCueLayer = resolveTransientActiveCueLayer(now, {
      bodySegmentMatched: segmentDriverAuthority?.bodySegmentMatched ?? previewDriverAuthority?.bodySegmentMatched ?? null,
      holdMs: resolveSegmentCueHoldMs(
        segmentProjectedCueForCarry?.emotionHoldMs,
        segmentEmotionCueHoldMs,
        { min: 80, max: 960 },
      ),
      heldCue: (segmentBodyOnlyAuthorityCarry || suppressSegmentCueForHesitantAudibleBodyCarry) ? null : heldSegmentCue,
      heldUntil: (segmentBodyOnlyAuthorityCarry || suppressSegmentCueForHesitantAudibleBodyCarry) ? 0 : heldSegmentCueUntil,
      previewCue: previewProjectedCueForActiveLayer,
      segmentCue: (segmentBodyOnlyAuthorityCarry || suppressSegmentCueForHesitantAudibleBodyCarry) ? null : segmentProjectedCueForCarry,
    })
    heldSegmentCue = activeCueLayer.heldCue
    heldSegmentCueUntil = activeCueLayer.heldUntil

    const stoppingPreviewTailActive = speech.phase === 'stopping' && !speechActivelyPlaying && Boolean(previewProjectedCue)

    if (speechActivelyPlaying) {
      clearCooldownTimer()
      if (state.value.phase === 'idle')
        state.value.phase = 'armed'
      state.value.phase = 'speaking'
      state.value.cooldownUntil = null
      if (state.value.speakingStartedAt == null)
        state.value.speakingStartedAt = now
    }
    else if (state.value.phase === 'speaking' || stoppingPreviewTailActive) {
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
      delivery: hesitantAudibleBodyCarry ? 'hesitant' : residentPerformance.delivery,
    } satisfies AlicizationDialoguePerformancePayload
    const baseIntensity = resolvePerformanceBaseIntensity(performance)
    const transientCueScale = previewAhead
      ? transientCue ? 0.74 : 1
      : 1
    const stoppingPreviewCarryActive = Boolean(
      previewAhead
      && speech.phase === 'stopping'
      && speech.visemeIntensity > 0
      && speech.dynamics.cadencePulse > 0,
    )
    const stoppingPreviewCarryScale = stoppingPreviewCarryActive
      ? Math.max(0.08, Math.min(0.22, speech.visemeIntensity * 0.6 + speech.dynamics.cadencePulse * 0.24))
      : 0
    const transientLife = speechActivelyPlaying ? segmentLife : previewLife
    const transientResidentMode = resolveCueResidentMode(transientCue, transientLife)
    const stoppingPreviewMeasuredReturnCarry = Boolean(
      stoppingPreviewCarryActive
      && transientResidentMode === 'measured-return',
    )
    const cueGesture = clamp01(Math.max(
      transientCue?.gestureWeight ?? 0,
      transientLife?.action.intensity ?? 0,
      previewAhead
        ? (previewDriverMotion?.intensity ?? 0) * previewDriverMotionScale
        : (segmentDriverMotion?.intensity ?? 0) * segmentDriverMotionScale,
    ) * transientCueScale)
    const cueFacial = clamp01(Math.max(
      transientCue?.facialWeight ?? 0,
      transientLife?.face.intensity ?? 0,
      previewAhead
        ? (previewDriverFace?.intensity ?? 0) * previewDriverFaceScale
        : (segmentDriverFace?.intensity ?? 0) * segmentDriverFaceScale,
    ) * transientCueScale)
    const cueProsody = clamp01(Math.max(
      Math.max(transientCue?.prosodyWeight ?? 0, transientLife?.voice.cadence ?? 0) * transientCueScale,
      stoppingPreviewCarryScale,
    ))
    const cueBeat = clamp01(Math.max(transientCue?.beatWeight ?? 0, transientLife?.action.intensity ?? 0) * transientCueScale)
    const driverVisemeWeight = resolvePlaybackDriverVisemePeakWeight(segmentDriverLipSync)
    const cueMouth = clamp01(Math.max(
      ((transientCue?.mouthWeight ?? cueProsody) * (transientLife?.lipSync.mouthScale ?? 1)) * transientCueScale,
      driverVisemeWeight * transientCueScale,
      stoppingPreviewCarryScale,
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
    const residentDynamics = resolveResidentRuntimeDynamics({
      performance: residentPerformance,
      residentReasonTags: state.value.residentReasonTags,
      variationToken: state.value.variationToken,
    })
    const companionshipExpressionDampening = resolveCompanionshipExpressionDampening({
      activeCueResidentMode: transientResidentMode,
      residentReasonTags: state.value.residentReasonTags,
      speechActive: speechActivelyPlaying,
      variationToken: state.value.variationToken,
    })
    const motionPulse = clamp01(state.value.motionPulse)
    const releaseFactor = state.value.phase === 'cooldown'
      ? clamp01(((state.value.cooldownUntil ?? now) - now) / cooldownMs, 0)
      : 1
    const residentFloorFactor = speechActivelyPlaying
      ? 0
      : state.value.phase === 'idle'
        ? 1
        : state.value.phase === 'cooldown'
          ? releaseFactor
          : 0
    const stoppingPreviewReopenCarryActive = Boolean(
      stoppingPreviewTailActive
      && activeCueLayer.source === 'preview'
      && speech.visemeIntensity > 0
      && speech.dynamics.cadencePulse > 0,
    )
    const stoppingPreviewReopenCadenceFloor = stoppingPreviewReopenCarryActive
      ? Math.max(0.14, Math.min(0.2, speech.visemeIntensity * 0.48 + speech.dynamics.cadencePulse * 0.24))
      : 0
    const stoppingPreviewMeasuredReturnProsodyFloor = stoppingPreviewMeasuredReturnCarry
      ? Math.max(0.14, Math.min(0.18, speech.visemeIntensity * 0.5 + speech.dynamics.cadencePulse * 0.28))
      : 0
    const stoppingPreviewMeasuredReturnVisibleProsodyFloor = stoppingPreviewMeasuredReturnCarry
      ? clamp01((state.value.prosodyDrive * 0.7) + 0.02)
      : 0
    const previewSpeechTimingBias = resolvePreviewSpeechTimingBias({
      activeCueSource: activeCueLayer.source,
      cue: transientCue,
      previewAhead,
      transientLife,
    })
    const activeFactor = speechActivelyPlaying
      ? 1
      : state.value.phase === 'idle'
        ? residentDynamics.sustainBlend
        : state.value.phase === 'cooldown'
          ? Math.max(
              releaseFactor,
              residentDynamics.cooldownBlend,
              stoppingPreviewReopenCarryActive ? 0.44 : 0,
            )
          : releaseFactor
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
    const sustainedRuntimeMotor = residentFloorFactor > 0 && residentDynamics.opennessBias !== 0
      ? {
          ...runtimeMotor,
          body: {
            ...runtimeMotor.body,
            openness: roundHundredths(
              clamp01(runtimeMotor.body.openness + residentDynamics.opennessBias * residentFloorFactor),
              runtimeMotor.body.openness,
            ),
            settle: roundHundredths(
              clamp01(runtimeMotor.body.settle + residentDynamics.settleBias * residentFloorFactor),
              runtimeMotor.body.settle,
            ),
          },
        }
      : runtimeMotor
    const previewSpeechTimingMotor = (
      previewSpeechTimingBias.headNodScale !== 1
      || previewSpeechTimingBias.opennessBias !== 0
      || previewSpeechTimingBias.settleBias !== 0
    )
      ? {
          ...sustainedRuntimeMotor,
          head: {
            ...sustainedRuntimeMotor.head,
            nod: roundHundredths(
              clamp01(sustainedRuntimeMotor.head.nod * previewSpeechTimingBias.headNodScale),
              sustainedRuntimeMotor.head.nod,
            ),
          },
          body: {
            ...sustainedRuntimeMotor.body,
            openness: roundHundredths(
              clamp01(sustainedRuntimeMotor.body.openness + previewSpeechTimingBias.opennessBias),
              sustainedRuntimeMotor.body.openness,
            ),
            settle: roundHundredths(
              clamp01(sustainedRuntimeMotor.body.settle + previewSpeechTimingBias.settleBias),
              sustainedRuntimeMotor.body.settle,
            ),
          },
        }
      : sustainedRuntimeMotor

    const resolvedDriverAuthority = previewAhead && activeCueLayer.source === 'preview'
      ? previewDriverAuthority ?? segmentDriverAuthority
      : segmentDriverAuthority ?? previewDriverAuthority
    const resolvedDriverRendererTarget = playbackTelemetry?.rendererTarget
      ?? resolvedDriverAuthority?.rendererTarget
      ?? state.value.driverRendererTarget
      ?? null

    const resolvedProsodyDrive = roundTenths(clamp01(
      Math.max(
        Math.max(
          speechDrive,
          Math.max(speech.dynamics.cadencePulse, stoppingPreviewReopenCadenceFloor) * (0.62 + cueProsody * 0.18),
          stoppingPreviewMeasuredReturnCarry
            ? Math.max(
                Math.max(speech.dynamics.cadencePulse, transientLife?.voice.cadence ?? 0) * 0.72,
                stoppingPreviewReopenCadenceFloor * 0.92,
              )
            : 0,
          cueProsody * 0.46,
        ) * spineBias.prosodyBias * activeFactor,
        stoppingPreviewMeasuredReturnProsodyFloor,
        stoppingPreviewMeasuredReturnVisibleProsodyFloor,
      ),
    ))
    const resolvedBreathDrive = roundTenths(clamp01(
      ((Math.max(speech.dynamics.cadencePulse, stoppingPreviewReopenCadenceFloor) * 0.36) + speech.dynamics.prosodyIntensity * 0.16 + speech.dynamics.speechEnergy * 0.26 + motionPulse * 0.14 + cueBeat * 0.1 + cueMouth * 0.12 + sustainedRuntimeMotor.breath.amplitude * 0.18 + sustainedRuntimeMotor.breath.pace * 0.08) * spineBias.breathBias * activeFactor
      + residentDynamics.breathFloor * residentFloorFactor,
    ))
    const priorVisibleBreathDrive = roundTenths(clamp01(state.value.breathDrive))

    state.value = {
      ...state.value,
      revision: state.value.revision + 1,
      driverRendererTarget: resolvedDriverRendererTarget,
      driverAuthority: resolvedDriverAuthority,
      performance,
      activeFacialCue: facialCueLayer.cue,
      activeFacialCueSource: facialCueLayer.source,
      activeActionCue: actionCueLayer.cue,
      activeActionCueSource: actionCueLayer.source,
      speechActive: speechActivelyPlaying,
      speechPhase: speech.phase,
      activeCue: cloneActiveCue(transientCue, {
        bodySegmentMatched: resolvedDriverAuthority?.bodySegmentMatched ?? null,
        faceSegmentMatched: resolvedDriverAuthority?.faceSegmentMatched ?? null,
        motionSegmentMatched: resolvedDriverAuthority?.motionSegmentMatched ?? null,
        lipsyncSegmentMatched: resolvedDriverAuthority?.lipsyncSegmentMatched ?? null,
      }),
      activeCueSource: activeCueLayer.source,
      activeSegment: authorityAlignedActiveSegment,
      expressionIntensity: roundTenths(clamp01(
        (((baseIntensity + speechDrive * 0.16 + motionPulse * 0.1 + cueFacial * 0.12 + cueMouth * 0.06 + previewSpeechTimingMotor.expressivity * 0.12 + previewSpeechTimingMotor.facial.cheekLift * 0.08) * previewSpeechTimingBias.expressionScale) * companionshipExpressionDampening) * spineBias.expressionBias * activeFactor
        + residentDynamics.expressionFloor * residentFloorFactor,
      )),
      facialCueIntensity: roundTenths(clamp01(
        (baseIntensity * 0.88 + speechDrive * 0.22 + motionPulse * 0.14 + cueFacial * 0.18 + cueMouth * 0.08 + sustainedRuntimeMotor.expressivity * 0.08 + sustainedRuntimeMotor.facial.browTension * 0.08) * spineBias.expressionBias * activeFactor * facialCueSourceScale
        + residentDynamics.facialFloor * facialCueSourceScale * residentFloorFactor,
      )),
      actionIntensity: roundTenths(clamp01(
        ((0.34 + performance.emphasis * 0.12 + motionPulse * 0.18 + cueGesture * 0.16 + cueHead * 0.2 + cueBeat * 0.14 + previewSpeechTimingMotor.body.openness * 0.08 + (1 - previewSpeechTimingMotor.stillness) * 0.12) * previewSpeechTimingBias.actionScale) * spineBias.actionBias * activeFactor * actionCueSourceScale
        + residentDynamics.actionFloor * residentFloorFactor,
      )),
      motionPulse,
      prosodyDrive: stoppingPreviewMeasuredReturnCarry && activeCueLayer.source === 'preview'
        ? Math.max(
            resolvedProsodyDrive,
            roundTenths(clamp01(stoppingPreviewMeasuredReturnVisibleProsodyFloor)),
          )
        : resolvedProsodyDrive,
      breathDrive: stoppingPreviewMeasuredReturnCarry && activeCueLayer.source === 'preview'
        ? Math.min(resolvedBreathDrive, priorVisibleBreathDrive)
        : resolvedBreathDrive,
      focusDrive: roundTenths(clamp01(
        (focusBase + motionPulse * 0.14 + speechDrive * 0.08 + speech.dynamics.prosodyIntensity * 0.08 + cueFacial * 0.06 + cueHead * 0.08 + sustainedRuntimeMotor.gaze.focus * 0.12 + sustainedRuntimeMotor.gaze.stability * 0.08) * spineBias.focusBias * activeFactor
        + residentDynamics.focusFloor * residentFloorFactor,
      )),
      motor: previewSpeechTimingMotor,
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
    const explicitResidentReasonTags = (armOptions.residentReasonTags ?? [])
      .filter(tag => typeof tag === 'string' && tag.trim())
    const preservedResidentReasonTags = armOptions.preserveResidentReasonTags === false
      ? []
      : explicitResidentReasonTags.length > 0
        ? [...explicitResidentReasonTags]
        : [...state.value.residentReasonTags]

    state.value = {
      ...state.value,
      revision: state.value.revision + 1,
      phase: state.value.speechActive ? 'speaking' : 'armed',
      driverRendererTarget: state.value.driverRendererTarget ?? null,
      driverAuthority: null,
      residentPerformance: {
        ...performancePayload,
      },
      residentReasonTags: preservedResidentReasonTags,
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
    const residentReasonTags = (syncOptions.residentReasonTags ?? []).filter(tag => typeof tag === 'string' && tag.trim())
    const signature = JSON.stringify([
      variationToken,
      residentReasonTags,
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
      residentReasonTags: [...residentReasonTags],
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
      driverAuthority: state.value.phase === 'idle' ? null : state.value.driverAuthority,
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
      driverRendererTarget: state.value.driverRendererTarget ?? null,
      driverAuthority: null,
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
      () => options.upcomingSpeechSegment?.value?.cue?.rendererHints?.preferredGazeMode ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.rendererHints?.preferredBlinkCadence ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.rendererHints?.residentMode ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.rendererHints?.signature ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.rendererHints?.reasonTags?.join('|') ?? '',
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
