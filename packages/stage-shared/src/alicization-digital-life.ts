import type { AlicizationDialogueEmbodimentEnvelope, AlicizationDialogueEmbodimentRendererHints } from './alicization-dialogue-embodiment'
import type {
  AlicizationDialogueSpeechTimeline,
  AlicizationDialogueSpeechTimelineSegment,
} from './alicization-dialogue-speech-timeline'
import type {
  AlicizationDialoguePerformancePayload,
  AlicizationEmotion,
  CharacterPerformanceCapabilitiesManifest,
} from './alicization-performance-contracts'
import type { StageEmbodimentPresencePostureMode } from './stage-embodiment-presence-posture'
import type { StageEmbodimentSpeechStyleProfile } from './stage-embodiment-profile'

import { normalizeAlicizationDialogueEmbodimentEnvelope } from './alicization-dialogue-embodiment'
import { normalizeAlicizationDialogueSpeechTimeline } from './alicization-dialogue-speech-timeline'
import { normalizeAlicizationEmotion, normalizeAlicizationPerformancePayload } from './alicization-performance-contracts'

export type AlicizationDigitalLifeMode = 'thinking' | 'speaking' | 'acting' | 'recovering'
export type AlicizationDigitalLifeLipSyncMode = 'hybrid' | 'viseme' | 'energy' | 'closed'
export type AlicizationDigitalLifeExpressionMode = 'blend' | 'hold' | 'recover'
export type AlicizationDigitalLifeActionMode = 'pulse' | 'hold' | 'none'

export interface AlicizationDigitalLifeVoicePlan {
  pitchDelta: number
  rateMultiplier: number
  energy: number
  cadence: number
}

export interface AlicizationDigitalLifeLipSyncPlan {
  mode: AlicizationDigitalLifeLipSyncMode
  visemeBias: number
  energyBias: number
  mouthScale: number
  continuityHoldMs: number
}

export interface AlicizationDigitalLifeFacePlan {
  emotion: AlicizationEmotion
  facialCue: string | null
  expressionMode: AlicizationDigitalLifeExpressionMode
  intensity: number
  holdMs: number
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
}

export interface AlicizationDigitalLifeActionPlan {
  actionCue: string | null
  actionMode: AlicizationDigitalLifeActionMode
  intensity: number
  holdMs: number
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
}

export interface AlicizationDigitalLifeFrame {
  id: string
  index: number
  startOffset: number
  endOffset: number
  text: string
  mode: AlicizationDigitalLifeMode
  interruptPolicy: AlicizationDialogueSpeechTimelineSegment['interruptMode']
  settleMode: AlicizationDialogueSpeechTimelineSegment['settleMode']
  voice: AlicizationDigitalLifeVoicePlan
  lipSync: AlicizationDigitalLifeLipSyncPlan
  face: AlicizationDigitalLifeFacePlan
  action: AlicizationDigitalLifeActionPlan
}

export interface AlicizationDigitalLifeEnvelope {
  version: 'digital-life-v1'
  variationToken: string
  emotion: AlicizationEmotion
  mode: AlicizationDigitalLifeMode
  postureHint: StageEmbodimentPresencePostureMode
  performance: AlicizationDialoguePerformancePayload
  speechStyle: StageEmbodimentSpeechStyleProfile
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
  voice: AlicizationDigitalLifeVoicePlan
  lipSync: AlicizationDigitalLifeLipSyncPlan
  face: AlicizationDigitalLifeFacePlan
  action: AlicizationDigitalLifeActionPlan
  frames: AlicizationDigitalLifeFrame[]
}

export interface BuildAlicizationDigitalLifeEnvelopeInput {
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline?: AlicizationDialogueSpeechTimeline | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
}

function clampUnit(value: number | null | undefined, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  const finiteValue = Number(value)
  return Math.min(1, Math.max(0, finiteValue))
}

function clampRange(value: number | null | undefined, min: number, max: number, fallback: number = min) {
  if (!Number.isFinite(value))
    return fallback

  const finiteValue = Number(value)
  return Math.min(max, Math.max(min, finiteValue))
}

function clampPitchDelta(value: number) {
  return Math.round(clampRange(value, -50, 50, 0))
}

function clampRateMultiplier(value: number) {
  return Number(clampRange(value, 0.5, 2, 1).toFixed(2))
}

function clampFactor(value: number, fallback: number = 1) {
  return Number(clampRange(value, 0.4, 1.35, fallback).toFixed(2))
}

function roundHundredths(value: number, fallback: number = 0) {
  return Number(clampUnit(value, fallback).toFixed(2))
}

function normalizeCue(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  return normalized ? normalized.slice(0, 96) : null
}

function normalizeVariationToken(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim().slice(0, 256)
}

function normalizeDigitalLifeMode(raw: unknown): AlicizationDigitalLifeMode {
  return raw === 'thinking' || raw === 'acting' || raw === 'recovering'
    ? raw
    : 'speaking'
}

function normalizeDigitalLifeLipSyncMode(raw: unknown): AlicizationDigitalLifeLipSyncMode {
  return raw === 'viseme' || raw === 'energy' || raw === 'closed'
    ? raw
    : 'hybrid'
}

function normalizeDigitalLifeExpressionMode(raw: unknown): AlicizationDigitalLifeExpressionMode {
  return raw === 'hold' || raw === 'recover'
    ? raw
    : 'blend'
}

function normalizeDigitalLifeActionMode(raw: unknown): AlicizationDigitalLifeActionMode {
  return raw === 'hold' || raw === 'none'
    ? raw
    : 'pulse'
}

function averageWeight(
  segments: AlicizationDialogueSpeechTimelineSegment[],
  selector: (segment: AlicizationDialogueSpeechTimelineSegment) => number | null | undefined,
) {
  if (segments.length === 0)
    return 0

  const total = segments.reduce((sum, segment) => {
    return sum + clampUnit(selector(segment))
  }, 0)
  return total / segments.length
}

function resolveDeliveryEnergyBoost(delivery: AlicizationDialoguePerformancePayload['delivery']) {
  switch (delivery) {
    case 'energetic':
      return 0.12
    case 'firm':
      return 0.08
    case 'teasing':
      return 0.06
    case 'gentle':
      return -0.03
    case 'hesitant':
      return -0.08
    case 'calm':
    default:
      return 0
  }
}

function resolveDeliveryCadenceBoost(delivery: AlicizationDialoguePerformancePayload['delivery']) {
  switch (delivery) {
    case 'energetic':
      return 0.14
    case 'firm':
      return 0.08
    case 'teasing':
      return 0.06
    case 'hesitant':
      return -0.06
    case 'gentle':
      return -0.04
    case 'calm':
    default:
      return 0
  }
}

function resolveEnvelopeMode(input: {
  performance: AlicizationDialoguePerformancePayload
  segments: AlicizationDialogueSpeechTimelineSegment[]
}): AlicizationDigitalLifeMode {
  if (input.segments.some(segment => normalizeCue(segment.actionCue)))
    return 'acting'

  if (input.performance.baseEmotion === 'thinking' || input.performance.delivery === 'hesitant')
    return 'thinking'

  return 'speaking'
}

function resolveVoicePlan(input: {
  performance: AlicizationDialoguePerformancePayload
  segments: AlicizationDialogueSpeechTimelineSegment[]
  speechStyle: StageEmbodimentSpeechStyleProfile
}): AlicizationDigitalLifeVoicePlan {
  const averageProsody = averageWeight(input.segments, segment => segment.prosodyWeight)
  const averageBeat = averageWeight(input.segments, segment => segment.beatWeight)
  const averageMouth = averageWeight(input.segments, segment => segment.mouthWeight)
  const energy = roundHundredths(
    0.46
    + input.performance.emphasis * 0.1
    + resolveDeliveryEnergyBoost(input.performance.delivery)
    + averageProsody * 0.16
    + averageBeat * 0.08
    + averageMouth * 0.06,
    0.62,
  )
  const cadence = roundHundredths(
    0.4
    + averageProsody * 0.18
    + averageBeat * 0.22
    + resolveDeliveryCadenceBoost(input.performance.delivery)
    + (input.speechStyle.rateMultiplier - 1) * 0.3,
    0.5,
  )

  return {
    pitchDelta: clampPitchDelta(input.speechStyle.pitchDelta),
    rateMultiplier: clampRateMultiplier(input.speechStyle.rateMultiplier),
    energy,
    cadence,
  }
}

function resolveLipSyncMode(input: {
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  reply: string
}) {
  if (!input.reply.trim())
    return 'closed' as const

  return input.performanceManifest?.supportsVisemeLipSync === true
    ? 'hybrid' as const
    : 'energy' as const
}

function resolveLipSyncPlan(input: {
  performance: AlicizationDialoguePerformancePayload
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  segments: AlicizationDialogueSpeechTimelineSegment[]
  voice: AlicizationDigitalLifeVoicePlan
  reply: string
}): AlicizationDigitalLifeLipSyncPlan {
  const mode = resolveLipSyncMode({
    performanceManifest: input.performanceManifest,
    reply: input.reply,
  })
  const averageMouth = averageWeight(input.segments, segment => segment.mouthWeight)
  const averageHold = averageWeight(input.segments, (segment) => {
    return clampRange((segment.emotionHoldMs ?? 160) / 720, 0, 1, 0.2)
  })

  const visemeBias = mode === 'energy'
    ? 0.22
    : mode === 'closed'
      ? 0
      : 0.66
  const energyBias = mode === 'energy'
    ? 0.78
    : mode === 'closed'
      ? 0
      : 0.34

  return {
    mode,
    visemeBias: roundHundredths(visemeBias),
    energyBias: roundHundredths(energyBias),
    mouthScale: clampFactor(
      0.72
      + averageMouth * 0.34
      + input.voice.energy * 0.2
      + input.performance.emphasis * 0.06,
      0.88,
    ),
    continuityHoldMs: Math.round(clampRange(120 + averageHold * 320, 60, 480, 180)),
  }
}

function resolveFacePlan(input: {
  emotion: AlicizationEmotion
  facialCue: string | null
  performance: AlicizationDialoguePerformancePayload
  holdMs: number
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
  intensityWeight: number
  expressionMode: AlicizationDigitalLifeExpressionMode
}): AlicizationDigitalLifeFacePlan {
  return {
    emotion: input.emotion,
    facialCue: input.facialCue,
    expressionMode: input.expressionMode,
    intensity: roundHundredths(
      0.42
      + input.performance.emphasis * 0.08
      + input.intensityWeight * 0.28,
      0.54,
    ),
    holdMs: Math.round(clampRange(input.holdMs, 80, 960, 220)),
    rendererHints: input.rendererHints ?? null,
  }
}

function resolveActionPlan(input: {
  actionCue: string | null
  performance: AlicizationDialoguePerformancePayload
  holdMs: number
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
  intensityWeight: number
  actionMode: AlicizationDigitalLifeActionMode
}): AlicizationDigitalLifeActionPlan {
  return {
    actionCue: input.actionCue,
    actionMode: input.actionMode,
    intensity: input.actionCue
      ? roundHundredths(
          0.24
          + input.performance.emphasis * 0.1
          + input.intensityWeight * 0.42,
          0.38,
        )
      : 0,
    holdMs: Math.round(clampRange(input.holdMs, 70, 720, 180)),
    rendererHints: input.rendererHints ?? null,
  }
}

function resolveFrame(input: {
  segment: AlicizationDialogueSpeechTimelineSegment
  envelope: AlicizationDialogueEmbodimentEnvelope
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  baseVoice: AlicizationDigitalLifeVoicePlan
  baseLipSync: AlicizationDigitalLifeLipSyncPlan
}): AlicizationDigitalLifeFrame {
  const actionCue = normalizeCue(input.segment.actionCue)
  const facialCue = normalizeCue(input.segment.facialCue)
  const actionHoldMs = input.segment.actionHoldMs ?? 180
  const emotionHoldMs = input.segment.emotionHoldMs ?? 220
  const actionMode = !actionCue
    ? 'none'
    : input.segment.actionWindow === 'none' && actionHoldMs >= 260
      ? 'hold'
      : 'pulse'
  const expressionMode = input.segment.settleMode === 'linger' || emotionHoldMs >= 320
    ? 'hold'
    : facialCue
      ? 'blend'
      : 'recover'
  const voice: AlicizationDigitalLifeVoicePlan = {
    pitchDelta: input.baseVoice.pitchDelta,
    rateMultiplier: clampRateMultiplier(
      input.baseVoice.rateMultiplier
      * (1 + (input.segment.prosodyWeight - 0.5) * 0.12 + (input.segment.beatWeight - 0.4) * 0.06),
    ),
    energy: roundHundredths(
      input.baseVoice.energy * 0.62
      + clampUnit(input.segment.prosodyWeight) * 0.22
      + clampUnit(input.segment.gestureWeight) * 0.08
      + clampUnit(input.segment.beatWeight) * 0.08,
      input.baseVoice.energy,
    ),
    cadence: roundHundredths(
      input.baseVoice.cadence * 0.58
      + clampUnit(input.segment.prosodyWeight) * 0.16
      + clampUnit(input.segment.beatWeight) * 0.26,
      input.baseVoice.cadence,
    ),
  }
  const lipSyncMode = input.baseLipSync.mode === 'closed'
    ? 'closed'
    : input.performanceManifest?.supportsVisemeLipSync === true
      ? 'hybrid'
      : 'energy'
  const lipSync: AlicizationDigitalLifeLipSyncPlan = {
    mode: lipSyncMode,
    visemeBias: lipSyncMode === 'energy' ? 0.24 : input.baseLipSync.visemeBias,
    energyBias: lipSyncMode === 'energy' ? 0.76 : input.baseLipSync.energyBias,
    mouthScale: clampFactor(
      input.baseLipSync.mouthScale
      * (0.82 + clampUnit(input.segment.mouthWeight ?? input.segment.prosodyWeight) * 0.36),
      input.baseLipSync.mouthScale,
    ),
    continuityHoldMs: Math.round(clampRange(
      Math.max(input.baseLipSync.continuityHoldMs, emotionHoldMs),
      60,
      520,
      input.baseLipSync.continuityHoldMs,
    )),
  }
  const face = resolveFacePlan({
    emotion: normalizeAlicizationEmotion(input.segment.emotion ?? input.envelope.emotion).emotion,
    facialCue,
    performance: input.envelope.performance,
    holdMs: emotionHoldMs,
    rendererHints: input.segment.rendererHints,
    intensityWeight: Math.max(
      clampUnit(input.segment.facialWeight),
      clampUnit(input.segment.mouthWeight),
    ),
    expressionMode,
  })
  const action = resolveActionPlan({
    actionCue,
    performance: input.envelope.performance,
    holdMs: actionHoldMs,
    rendererHints: input.segment.rendererHints,
    intensityWeight: Math.max(
      clampUnit(input.segment.gestureWeight),
      clampUnit(input.segment.headWeight),
      clampUnit(input.segment.beatWeight),
    ),
    actionMode,
  })

  return {
    id: input.segment.id,
    index: input.segment.index,
    startOffset: input.segment.startOffset,
    endOffset: input.segment.endOffset,
    text: input.segment.text,
    mode: action.actionMode !== 'none'
      ? 'acting'
      : face.expressionMode === 'hold' && face.emotion === 'thinking'
        ? 'thinking'
        : 'speaking',
    interruptPolicy: input.segment.interruptMode,
    settleMode: input.segment.settleMode,
    voice,
    lipSync,
    face,
    action,
  }
}

export function buildAlicizationDigitalLifeEnvelope(
  input: BuildAlicizationDigitalLifeEnvelopeInput,
): AlicizationDigitalLifeEnvelope | null {
  const embodiment = normalizeAlicizationDialogueEmbodimentEnvelope(input.embodiment)
  const speechTimeline = normalizeAlicizationDialogueSpeechTimeline(input.speechTimeline)
  if (!embodiment || !speechTimeline)
    return null

  const variationToken = normalizeVariationToken(embodiment.variationToken)
  if (!variationToken)
    return null

  const performance = normalizeAlicizationPerformancePayload(
    embodiment.performance,
    embodiment.emotion,
  )
  const voice = resolveVoicePlan({
    performance,
    segments: speechTimeline.segments,
    speechStyle: embodiment.speechStyle,
  })
  const lipSync = resolveLipSyncPlan({
    performance,
    performanceManifest: input.performanceManifest,
    segments: speechTimeline.segments,
    voice,
    reply: speechTimeline.reply,
  })
  const face = resolveFacePlan({
    emotion: embodiment.emotion,
    facialCue: normalizeCue(performance.facialCue),
    performance,
    holdMs: Math.max(220, ...speechTimeline.segments.map(segment => segment.emotionHoldMs ?? 220)),
    rendererHints: embodiment.rendererHints,
    intensityWeight: Math.max(
      averageWeight(speechTimeline.segments, segment => segment.facialWeight),
      averageWeight(speechTimeline.segments, segment => segment.mouthWeight),
    ),
    expressionMode: speechTimeline.segments.some(segment => segment.settleMode === 'linger')
      ? 'hold'
      : performance.facialCue
        ? 'blend'
        : 'recover',
  })
  const action = resolveActionPlan({
    actionCue: normalizeCue(performance.actionCue),
    performance,
    holdMs: Math.max(180, ...speechTimeline.segments.map(segment => segment.actionHoldMs ?? 180)),
    rendererHints: embodiment.rendererHints,
    intensityWeight: Math.max(
      averageWeight(speechTimeline.segments, segment => segment.gestureWeight),
      averageWeight(speechTimeline.segments, segment => segment.headWeight),
    ),
    actionMode: performance.actionCue ? 'pulse' : 'none',
  })
  const frames = speechTimeline.segments.map(segment => resolveFrame({
    segment,
    envelope: embodiment,
    performanceManifest: input.performanceManifest,
    baseVoice: voice,
    baseLipSync: lipSync,
  }))

  return {
    version: 'digital-life-v1',
    variationToken,
    emotion: embodiment.emotion,
    mode: resolveEnvelopeMode({
      performance,
      segments: speechTimeline.segments,
    }),
    postureHint: embodiment.postureHint,
    performance,
    speechStyle: {
      pitchDelta: clampPitchDelta(embodiment.speechStyle.pitchDelta),
      rateMultiplier: clampRateMultiplier(embodiment.speechStyle.rateMultiplier),
    },
    rendererHints: embodiment.rendererHints ?? null,
    voice,
    lipSync,
    face,
    action,
    frames,
  }
}

export function normalizeAlicizationDigitalLifeEnvelope(
  raw: unknown,
  fallbackEmotion: AlicizationEmotion = 'neutral',
): AlicizationDigitalLifeEnvelope | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const variationToken = normalizeVariationToken(candidate.variationToken)
  if (!variationToken)
    return null

  const normalizedEmotion = normalizeAlicizationEmotion(
    candidate.emotion
    ?? (candidate.performance as Record<string, unknown> | undefined)?.baseEmotion
    ?? fallbackEmotion,
  ).emotion
  const performance = normalizeAlicizationPerformancePayload(candidate.performance, normalizedEmotion)
  const speechStyle = candidate.speechStyle && typeof candidate.speechStyle === 'object'
    ? {
        pitchDelta: clampPitchDelta(Number((candidate.speechStyle as Record<string, unknown>).pitchDelta)),
        rateMultiplier: clampRateMultiplier(Number((candidate.speechStyle as Record<string, unknown>).rateMultiplier)),
      }
    : {
        pitchDelta: 0,
        rateMultiplier: 1,
      }
  const rendererHints = candidate.rendererHints && typeof candidate.rendererHints === 'object' && !Array.isArray(candidate.rendererHints)
    ? candidate.rendererHints as AlicizationDialogueEmbodimentRendererHints
    : null
  const rawFrames = Array.isArray(candidate.frames) ? candidate.frames : []
  const frames = rawFrames
    .map((frame, index): AlicizationDigitalLifeFrame | null => {
      if (!frame || typeof frame !== 'object' || Array.isArray(frame))
        return null

      const item = frame as Record<string, unknown>
      const text = typeof item.text === 'string' ? item.text.trim() : ''
      if (!text)
        return null

      const faceRaw = item.face && typeof item.face === 'object' && !Array.isArray(item.face)
        ? item.face as Record<string, unknown>
        : {}
      const actionRaw = item.action && typeof item.action === 'object' && !Array.isArray(item.action)
        ? item.action as Record<string, unknown>
        : {}
      const lipSyncRaw = item.lipSync && typeof item.lipSync === 'object' && !Array.isArray(item.lipSync)
        ? item.lipSync as Record<string, unknown>
        : {}
      const voiceRaw = item.voice && typeof item.voice === 'object' && !Array.isArray(item.voice)
        ? item.voice as Record<string, unknown>
        : {}

      return {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `digital-life:${index}`,
        index: Math.max(0, Math.floor(Number(item.index) || index)),
        startOffset: Math.max(0, Math.floor(Number(item.startOffset) || 0)),
        endOffset: Math.max(0, Math.floor(Number(item.endOffset) || text.length)),
        text,
        mode: normalizeDigitalLifeMode(item.mode),
        interruptPolicy: item.interruptPolicy === 'soft-interrupt' || item.interruptPolicy === 'hard-interrupt'
          ? item.interruptPolicy
          : 'continue',
        settleMode: item.settleMode === 'hold' || item.settleMode === 'linger'
          ? item.settleMode
          : 'release',
        voice: {
          pitchDelta: clampPitchDelta(Number(voiceRaw.pitchDelta)),
          rateMultiplier: clampRateMultiplier(Number(voiceRaw.rateMultiplier)),
          energy: roundHundredths(Number(voiceRaw.energy), 0.5),
          cadence: roundHundredths(Number(voiceRaw.cadence), 0.5),
        },
        lipSync: {
          mode: normalizeDigitalLifeLipSyncMode(lipSyncRaw.mode),
          visemeBias: roundHundredths(Number(lipSyncRaw.visemeBias), 0.66),
          energyBias: roundHundredths(Number(lipSyncRaw.energyBias), 0.34),
          mouthScale: clampFactor(Number(lipSyncRaw.mouthScale), 0.88),
          continuityHoldMs: Math.round(clampRange(Number(lipSyncRaw.continuityHoldMs), 60, 520, 180)),
        },
        face: {
          emotion: normalizeAlicizationEmotion(faceRaw.emotion ?? normalizedEmotion).emotion,
          facialCue: normalizeCue(faceRaw.facialCue),
          expressionMode: normalizeDigitalLifeExpressionMode(faceRaw.expressionMode),
          intensity: roundHundredths(Number(faceRaw.intensity), 0.5),
          holdMs: Math.round(clampRange(Number(faceRaw.holdMs), 80, 960, 220)),
          rendererHints: faceRaw.rendererHints && typeof faceRaw.rendererHints === 'object' && !Array.isArray(faceRaw.rendererHints)
            ? faceRaw.rendererHints as AlicizationDialogueEmbodimentRendererHints
            : null,
        },
        action: {
          actionCue: normalizeCue(actionRaw.actionCue),
          actionMode: normalizeDigitalLifeActionMode(actionRaw.actionMode),
          intensity: roundHundredths(Number(actionRaw.intensity), 0.3),
          holdMs: Math.round(clampRange(Number(actionRaw.holdMs), 70, 720, 180)),
          rendererHints: actionRaw.rendererHints && typeof actionRaw.rendererHints === 'object' && !Array.isArray(actionRaw.rendererHints)
            ? actionRaw.rendererHints as AlicizationDialogueEmbodimentRendererHints
            : null,
        },
      }
    })
    .filter((frame): frame is AlicizationDigitalLifeFrame => frame !== null)

  if (frames.length === 0)
    return null

  const voiceRaw = candidate.voice && typeof candidate.voice === 'object' && !Array.isArray(candidate.voice)
    ? candidate.voice as Record<string, unknown>
    : {}
  const lipSyncRaw = candidate.lipSync && typeof candidate.lipSync === 'object' && !Array.isArray(candidate.lipSync)
    ? candidate.lipSync as Record<string, unknown>
    : {}
  const faceRaw = candidate.face && typeof candidate.face === 'object' && !Array.isArray(candidate.face)
    ? candidate.face as Record<string, unknown>
    : {}
  const actionRaw = candidate.action && typeof candidate.action === 'object' && !Array.isArray(candidate.action)
    ? candidate.action as Record<string, unknown>
    : {}
  const postureHintRaw = typeof candidate.postureHint === 'string'
    ? candidate.postureHint.trim().toLowerCase()
    : ''

  return {
    version: 'digital-life-v1',
    variationToken,
    emotion: normalizedEmotion,
    mode: normalizeDigitalLifeMode(candidate.mode),
    postureHint: postureHintRaw === 'attentive'
      || postureHintRaw === 'inspection'
      || postureHintRaw === 'hesitant'
      || postureHintRaw === 'concerned'
      || postureHintRaw === 'idle'
      ? postureHintRaw
      : 'idle',
    performance: {
      ...performance,
      baseEmotion: normalizedEmotion,
      emotion: normalizedEmotion,
    },
    speechStyle,
    rendererHints,
    voice: {
      pitchDelta: clampPitchDelta(Number(voiceRaw.pitchDelta ?? speechStyle.pitchDelta)),
      rateMultiplier: clampRateMultiplier(Number(voiceRaw.rateMultiplier ?? speechStyle.rateMultiplier)),
      energy: roundHundredths(Number(voiceRaw.energy), 0.5),
      cadence: roundHundredths(Number(voiceRaw.cadence), 0.5),
    },
    lipSync: {
      mode: normalizeDigitalLifeLipSyncMode(lipSyncRaw.mode),
      visemeBias: roundHundredths(Number(lipSyncRaw.visemeBias), 0.66),
      energyBias: roundHundredths(Number(lipSyncRaw.energyBias), 0.34),
      mouthScale: clampFactor(Number(lipSyncRaw.mouthScale), 0.88),
      continuityHoldMs: Math.round(clampRange(Number(lipSyncRaw.continuityHoldMs), 60, 520, 180)),
    },
    face: {
      emotion: normalizeAlicizationEmotion(faceRaw.emotion ?? normalizedEmotion).emotion,
      facialCue: normalizeCue(faceRaw.facialCue ?? performance.facialCue),
      expressionMode: normalizeDigitalLifeExpressionMode(faceRaw.expressionMode),
      intensity: roundHundredths(Number(faceRaw.intensity), 0.5),
      holdMs: Math.round(clampRange(Number(faceRaw.holdMs), 80, 960, 220)),
      rendererHints: faceRaw.rendererHints && typeof faceRaw.rendererHints === 'object' && !Array.isArray(faceRaw.rendererHints)
        ? faceRaw.rendererHints as AlicizationDialogueEmbodimentRendererHints
        : rendererHints,
    },
    action: {
      actionCue: normalizeCue(actionRaw.actionCue ?? performance.actionCue),
      actionMode: normalizeDigitalLifeActionMode(actionRaw.actionMode),
      intensity: roundHundredths(Number(actionRaw.intensity), 0.3),
      holdMs: Math.round(clampRange(Number(actionRaw.holdMs), 70, 720, 180)),
      rendererHints: actionRaw.rendererHints && typeof actionRaw.rendererHints === 'object' && !Array.isArray(actionRaw.rendererHints)
        ? actionRaw.rendererHints as AlicizationDialogueEmbodimentRendererHints
        : rendererHints,
    },
    frames,
  }
}
