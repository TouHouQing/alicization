import type { AlicizationEmotion, AlicizationPerformanceDelivery } from './alicization-performance-contracts'
import type { AlicizationEmbodimentLipSyncPlan } from './alicization-lipsync-contracts'
import type { AlicizationEmbodimentSpeechPlan } from './alicization-speech-plan'

import {
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformanceDelivery,
} from './alicization-performance-contracts'
import { normalizeAlicizationEmbodimentLipSyncPlan } from './alicization-lipsync-contracts'
import { normalizeAlicizationEmbodimentSpeechPlan } from './alicization-speech-plan'

export type AlicizationEmbodimentScriptRendererTarget = 'live2d'
export type AlicizationEmbodimentResidentMode = 'dialogue' | 'quiet-companionship' | 'idle-recovering'
export type AlicizationEmbodimentAttentionMode = 'attentive' | 'ambient'
export type AlicizationEmbodimentExecutionCueSource
  = 'prosody-authority'
    | 'timeline-projection'
    | 'digital-life-projection'

export interface AlicizationEmbodimentScriptState {
  baseEmotion: AlicizationEmotion
  delivery: AlicizationPerformanceDelivery
  emphasis: 0 | 1 | 2
  residentMode: AlicizationEmbodimentResidentMode
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
}

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
    || raw === 'idle-recovering'
    || raw === 'dialogue'
    ? raw
    : 'dialogue'
}

function normalizeAttentionMode(raw: unknown): AlicizationEmbodimentAttentionMode {
  return raw === 'ambient' ? 'ambient' : 'attentive'
}

function normalizeRendererTarget(raw: unknown): AlicizationEmbodimentScriptRendererTarget | null {
  return raw === 'live2d' ? 'live2d' : null
}

function normalizeExecutionCueSource(raw: unknown): AlicizationEmbodimentExecutionCueSource | null {
  return raw === 'prosody-authority'
    || raw === 'timeline-projection'
    || raw === 'digital-life-projection'
    ? raw
    : null
}

function normalizeFaceCue(raw: unknown): AlicizationEmbodimentFaceCue | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const segmentId = normalizeText(candidate.segmentId, 120)
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
  const segmentId = normalizeText(candidate.segmentId, 120)
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

  return {
    version,
    decisionTraceId,
    turnId,
    rendererTarget,
    replyText,
    state: {
      baseEmotion: normalizeAlicizationEmotion(stateCandidate.baseEmotion).emotion,
      delivery: normalizeAlicizationPerformanceDelivery(stateCandidate.delivery),
      emphasis: normalizeEmphasis(stateCandidate.emphasis),
      residentMode: normalizeResidentMode(stateCandidate.residentMode),
    },
    speechPlan,
    facePlan,
    motionPlan,
    lipsyncPlan,
  }
}
