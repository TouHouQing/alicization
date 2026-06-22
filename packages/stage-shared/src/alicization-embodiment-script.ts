import type { AlicizationDialogueEmbodimentRendererHints } from './alicization-dialogue-embodiment'
import type { AlicizationDigitalLifeEnvelope } from './alicization-digital-life'
import type { AlicizationEmbodimentLipSyncPlan } from './alicization-lipsync-contracts'
import type { AlicizationEmotion, AlicizationPerformanceDelivery } from './alicization-performance-contracts'
import type { AlicizationEmbodimentSpeechPlan } from './alicization-speech-plan'

import { normalizeAlicizationDigitalLifeEnvelope } from './alicization-digital-life'
import { normalizeAlicizationEmbodimentLipSyncPlan } from './alicization-lipsync-contracts'
import {
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformanceDelivery,
} from './alicization-performance-contracts'
import { normalizeAlicizationEmbodimentSpeechPlan } from './alicization-speech-plan'

export type AlicizationEmbodimentScriptRendererTarget = 'live2d' | 'vrm'
export type AlicizationEmbodimentResidentMode
  = | 'dialogue'
    | 'quiet-companionship'
    | 'quiet-accompaniment'
    | 'same-thread-continuation'
    | 'measured-return'
    | 'repair-before-closeness'
    | 'idle-recovering'
export type AlicizationEmbodimentAttentionMode = 'attentive' | 'ambient'
export type AlicizationEmbodimentExecutionCueSource
  = 'prosody-authority'
    | 'timeline-projection'
    | 'digital-life-projection'
    | 'cue-bridge'

export interface AlicizationEmbodimentScriptState {
  baseEmotion: AlicizationEmotion
  delivery: AlicizationPerformanceDelivery
  emphasis: 0 | 1 | 2
  residentMode: AlicizationEmbodimentResidentMode
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
}

export interface AlicizationEmbodimentFaceCue {
  segmentId: string
  emotion: AlicizationEmotion
  facialCue: string | null
  intensity: number
  holdMs: number
  preUtteranceCue: string | null
  postUtteranceCue: string | null
  source: AlicizationEmbodimentExecutionCueSource
  confidence: number
}

export interface AlicizationEmbodimentFacePlan {
  // Timing cues let the renderer stage a brief expression before speech starts
  // and a release/settle expression once playback returns to idle.
  preUtteranceCue?: string | null
  postUtteranceCue?: string | null
  speakingCues: AlicizationEmbodimentFaceCue[]
}

export interface AlicizationEmbodimentMotionBurst {
  segmentId: string
  actionCue: string | null
  intensity: number
  holdMs: number
  source: AlicizationEmbodimentExecutionCueSource
  confidence: number
}

export interface AlicizationEmbodimentMotionPlan {
  idleBase: string
  actionBursts: AlicizationEmbodimentMotionBurst[]
  attentionMode: AlicizationEmbodimentAttentionMode
}

export interface AlicizationEmbodimentScriptV1 {
  version: 'embodiment-script-v1'
  decisionTraceId?: string | null
  turnId: string
  rendererTarget: AlicizationEmbodimentScriptRendererTarget
  replyText: string
  state: AlicizationEmbodimentScriptState
  speechPlan: AlicizationEmbodimentSpeechPlan
  facePlan: AlicizationEmbodimentFacePlan
  motionPlan: AlicizationEmbodimentMotionPlan
  lipsyncPlan: AlicizationEmbodimentLipSyncPlan
  digitalLife?: AlicizationDigitalLifeEnvelope | null
}

const EMBODIMENT_SEGMENT_ID_MAX_CHARS = 512

function normalizeText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeUnit(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function normalizeRequiredUnit(raw: unknown): number | null {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return null
  return Math.max(0, Math.min(1, value))
}

function normalizeNonNegativeInteger(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.floor(value))
}

function normalizeEmphasis(raw: unknown): 0 | 1 | 2 {
  const value = normalizeNonNegativeInteger(raw)
  if (value >= 2)
    return 2
  if (value >= 1)
    return 1
  return 0
}

function normalizeResidentMode(raw: unknown): AlicizationEmbodimentResidentMode {
  return raw === 'quiet-companionship'
    || raw === 'quiet-accompaniment'
    || raw === 'same-thread-continuation'
    || raw === 'measured-return'
    || raw === 'repair-before-closeness'
    || raw === 'idle-recovering'
    || raw === 'dialogue'
    ? raw
    : 'dialogue'
}

function normalizeAttentionMode(raw: unknown): AlicizationEmbodimentAttentionMode {
  return raw === 'ambient' ? 'ambient' : 'attentive'
}

function normalizeRendererTarget(raw: unknown): AlicizationEmbodimentScriptRendererTarget | null {
  return raw === 'live2d' || raw === 'vrm'
    ? raw
    : null
}

function dedupeCuePool(values: Array<string | null | undefined>) {
  const deduped: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    if (typeof value !== 'string')
      continue

    const normalized = value.trim()
    if (!normalized || seen.has(normalized))
      continue

    seen.add(normalized)
    deduped.push(normalized)
  }

  return deduped
}

function normalizeRendererHintAliases(raw: unknown) {
  if (!Array.isArray(raw))
    return []

  return dedupeCuePool(raw.map((value) => {
    return typeof value === 'string' ? value : null
  }))
}

function normalizeRendererHintText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim().slice(0, maxChars)
}

function normalizeRendererHints(raw: unknown): AlicizationDialogueEmbodimentRendererHints | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const preferredExpressionAliases = normalizeRendererHintAliases(candidate.preferredExpressionAliases)
  const preferredMotionAliases = normalizeRendererHintAliases(candidate.preferredMotionAliases)
  const preferredGazeMode = candidate.preferredGazeMode === 'steady'
    || candidate.preferredGazeMode === 'soften'
    || candidate.preferredGazeMode === 'drift'
    ? candidate.preferredGazeMode
    : undefined
  const preferredBlinkCadence = candidate.preferredBlinkCadence === 'normal'
    || candidate.preferredBlinkCadence === 'linger'
    || candidate.preferredBlinkCadence === 'quiet'
    ? candidate.preferredBlinkCadence
    : undefined
  const preferredPauseMode = candidate.preferredPauseMode === 'longer'
    || candidate.preferredPauseMode === 'natural'
    ? candidate.preferredPauseMode
    : undefined
  const preferredLipsyncMode = candidate.preferredLipsyncMode === 'restrained'
    || candidate.preferredLipsyncMode === 'matched'
    ? candidate.preferredLipsyncMode
    : undefined
  const preferredVoiceMode = candidate.preferredVoiceMode === 'lower-pressure'
    || candidate.preferredVoiceMode === 'even'
    ? candidate.preferredVoiceMode
    : undefined
  const preferredPacingMode = candidate.preferredPacingMode === 'slower'
    || candidate.preferredPacingMode === 'natural'
    ? candidate.preferredPacingMode
    : undefined
  const residentMode = normalizeRendererHintText(candidate.residentMode, 80) || undefined
  const reasonTags = normalizeRendererHintAliases(candidate.reasonTags)
  const signature = normalizeRendererHintText(candidate.signature, 240) || undefined

  if (
    preferredExpressionAliases.length === 0
    && preferredMotionAliases.length === 0
    && !preferredGazeMode
    && !preferredBlinkCadence
    && !preferredPauseMode
    && !preferredLipsyncMode
    && !preferredVoiceMode
    && !preferredPacingMode
    && !residentMode
    && reasonTags.length === 0
    && !signature
  ) {
    return null
  }

  return {
    ...(preferredBlinkCadence ? { preferredBlinkCadence } : {}),
    ...(preferredExpressionAliases.length > 0 ? { preferredExpressionAliases } : {}),
    ...(preferredGazeMode ? { preferredGazeMode } : {}),
    ...(preferredLipsyncMode ? { preferredLipsyncMode } : {}),
    ...(preferredMotionAliases.length > 0 ? { preferredMotionAliases } : {}),
    ...(preferredPacingMode ? { preferredPacingMode } : {}),
    ...(preferredPauseMode ? { preferredPauseMode } : {}),
    ...(preferredVoiceMode ? { preferredVoiceMode } : {}),
    ...(reasonTags.length > 0 ? { reasonTags } : {}),
    ...(residentMode ? { residentMode } : {}),
    ...(signature ? { signature } : {}),
  }
}

function normalizeExecutionCueSource(raw: unknown): AlicizationEmbodimentExecutionCueSource | null {
  return raw === 'prosody-authority'
    || raw === 'timeline-projection'
    || raw === 'digital-life-projection'
    || raw === 'cue-bridge'
    ? raw
    : null
}

function normalizeFaceCue(raw: unknown): AlicizationEmbodimentFaceCue | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const segmentId = normalizeText(candidate.segmentId, EMBODIMENT_SEGMENT_ID_MAX_CHARS)
  const source = normalizeExecutionCueSource(candidate.source)
  const confidence = normalizeRequiredUnit(candidate.confidence)
  if (!segmentId || !source || confidence === null)
    return null

  return {
    segmentId,
    emotion: normalizeAlicizationEmotion(candidate.emotion).emotion,
    facialCue: normalizeText(candidate.facialCue, 120) || null,
    intensity: normalizeUnit(candidate.intensity),
    holdMs: normalizeNonNegativeInteger(candidate.holdMs),
    preUtteranceCue: normalizeText(candidate.preUtteranceCue, 120) || null,
    postUtteranceCue: normalizeText(candidate.postUtteranceCue, 120) || null,
    source,
    confidence,
  }
}

function normalizeMotionBurst(raw: unknown): AlicizationEmbodimentMotionBurst | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const segmentId = normalizeText(candidate.segmentId, EMBODIMENT_SEGMENT_ID_MAX_CHARS)
  const source = normalizeExecutionCueSource(candidate.source)
  const confidence = normalizeRequiredUnit(candidate.confidence)
  if (!segmentId || !source || confidence === null)
    return null

  return {
    segmentId,
    actionCue: normalizeText(candidate.actionCue, 120) || null,
    intensity: normalizeUnit(candidate.intensity),
    holdMs: normalizeNonNegativeInteger(candidate.holdMs),
    source,
    confidence,
  }
}

function normalizeFacePlan(raw: unknown): AlicizationEmbodimentFacePlan | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  if (!Array.isArray(candidate.speakingCues))
    return null

  const speakingCues = candidate.speakingCues
    .map(normalizeFaceCue)
    .filter((cue): cue is AlicizationEmbodimentFaceCue => Boolean(cue))
  if (speakingCues.length !== candidate.speakingCues.length)
    return null

  return {
    preUtteranceCue: normalizeText(candidate.preUtteranceCue, 120) || null,
    postUtteranceCue: normalizeText(candidate.postUtteranceCue, 120) || null,
    speakingCues,
  }
}

function normalizeMotionPlan(raw: unknown): AlicizationEmbodimentMotionPlan | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  if (!Array.isArray(candidate.actionBursts))
    return null

  const idleBase = normalizeText(candidate.idleBase, 120)
  if (!idleBase)
    return null

  const actionBursts = candidate.actionBursts
    .map(normalizeMotionBurst)
    .filter((burst): burst is AlicizationEmbodimentMotionBurst => Boolean(burst))
  if (actionBursts.length !== candidate.actionBursts.length)
    return null

  return {
    idleBase,
    actionBursts,
    attentionMode: normalizeAttentionMode(candidate.attentionMode),
  }
}

export function normalizeAlicizationEmbodimentScript(raw: unknown): AlicizationEmbodimentScriptV1 | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const version = candidate.version === 'embodiment-script-v1'
    ? candidate.version
    : null
  const decisionTraceId = normalizeText(candidate.decisionTraceId, 120) || null
  const turnId = normalizeText(candidate.turnId, 120)
  const rendererTarget = normalizeRendererTarget(candidate.rendererTarget)
  const replyText = normalizeText(candidate.replyText, 4000)
  if (!version || !turnId || !rendererTarget || !replyText)
    return null

  const stateCandidate = candidate.state && typeof candidate.state === 'object' && !Array.isArray(candidate.state)
    ? candidate.state as Record<string, unknown>
    : null
  const speechPlan = normalizeAlicizationEmbodimentSpeechPlan(candidate.speechPlan)
  const facePlan = normalizeFacePlan(candidate.facePlan)
  const motionPlan = normalizeMotionPlan(candidate.motionPlan)
  const lipsyncPlan = normalizeAlicizationEmbodimentLipSyncPlan(candidate.lipsyncPlan)
  if (!stateCandidate || !speechPlan || !facePlan || !motionPlan || !lipsyncPlan)
    return null

  const baseEmotion = normalizeAlicizationEmotion(stateCandidate.baseEmotion).emotion
  const rendererHints = normalizeRendererHints(stateCandidate.rendererHints)
  const digitalLife = normalizeAlicizationDigitalLifeEnvelope(candidate.digitalLife, baseEmotion)

  return {
    version,
    decisionTraceId,
    turnId,
    rendererTarget,
    replyText,
    state: {
      baseEmotion,
      delivery: normalizeAlicizationPerformanceDelivery(stateCandidate.delivery),
      emphasis: normalizeEmphasis(stateCandidate.emphasis),
      residentMode: normalizeResidentMode(stateCandidate.residentMode),
      ...(rendererHints ? { rendererHints } : {}),
    },
    speechPlan,
    facePlan,
    motionPlan,
    lipsyncPlan,
    ...(digitalLife ? { digitalLife } : {}),
  }
}
