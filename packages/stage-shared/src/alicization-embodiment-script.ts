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
export type AlicizationEmbodimentResidentMode = 'dialogue'
export type AlicizationEmbodimentAttentionMode = 'attentive' | 'ambient'

export interface AlicizationEmbodimentScriptState {
  baseEmotion: AlicizationEmotion
  delivery: AlicizationPerformanceDelivery
  emphasis: 0 | 1 | 2
  residentMode: AlicizationEmbodimentResidentMode
}

export interface AlicizationEmbodimentFaceCue {
  segmentId: string
  emotion: AlicizationEmotion
  facialCue: string
  intensity: number
}

export interface AlicizationEmbodimentFacePlan {
  speakingCues: AlicizationEmbodimentFaceCue[]
}

export interface AlicizationEmbodimentMotionBurst {
  segmentId: string
  actionCue: string
  intensity: number
}

export interface AlicizationEmbodimentMotionPlan {
  idleBase: string
  actionBursts: AlicizationEmbodimentMotionBurst[]
  attentionMode: AlicizationEmbodimentAttentionMode
}

export interface AlicizationEmbodimentScript {
  version: 'embodiment-script-v1'
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
  return raw === 'dialogue' ? 'dialogue' : 'dialogue'
}

function normalizeAttentionMode(raw: unknown): AlicizationEmbodimentAttentionMode {
  return raw === 'ambient' ? 'ambient' : 'attentive'
}

function normalizeRendererTarget(raw: unknown): AlicizationEmbodimentScriptRendererTarget | null {
  return raw === 'live2d' ? 'live2d' : null
}

function normalizeFaceCue(raw: unknown): AlicizationEmbodimentFaceCue | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const segmentId = normalizeText(candidate.segmentId, 120)
  const facialCue = normalizeText(candidate.facialCue, 120)
  if (!segmentId || !facialCue)
    return null

  return {
    segmentId,
    emotion: normalizeAlicizationEmotion(candidate.emotion).emotion,
    facialCue,
    intensity: normalizeUnit(candidate.intensity),
  }
}

function normalizeMotionBurst(raw: unknown): AlicizationEmbodimentMotionBurst | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const segmentId = normalizeText(candidate.segmentId, 120)
  const actionCue = normalizeText(candidate.actionCue, 120)
  if (!segmentId || !actionCue)
    return null

  return {
    segmentId,
    actionCue,
    intensity: normalizeUnit(candidate.intensity),
  }
}

function normalizeFacePlan(raw: unknown): AlicizationEmbodimentFacePlan {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}

  return {
    speakingCues: Array.isArray(candidate.speakingCues)
      ? candidate.speakingCues
          .map(normalizeFaceCue)
          .filter((cue): cue is AlicizationEmbodimentFaceCue => Boolean(cue))
      : [],
  }
}

function normalizeMotionPlan(raw: unknown): AlicizationEmbodimentMotionPlan {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}

  return {
    idleBase: normalizeText(candidate.idleBase, 120) || 'idle_settle',
    actionBursts: Array.isArray(candidate.actionBursts)
      ? candidate.actionBursts
          .map(normalizeMotionBurst)
          .filter((burst): burst is AlicizationEmbodimentMotionBurst => Boolean(burst))
      : [],
    attentionMode: normalizeAttentionMode(candidate.attentionMode),
  }
}

export function normalizeAlicizationEmbodimentScript(raw: unknown): AlicizationEmbodimentScript | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const version = candidate.version === 'embodiment-script-v1'
    ? candidate.version
    : null
  const turnId = normalizeText(candidate.turnId, 120)
  const rendererTarget = normalizeRendererTarget(candidate.rendererTarget)
  const replyText = normalizeText(candidate.replyText, 4000)
  if (!version || !turnId || !rendererTarget || !replyText)
    return null

  const stateCandidate = candidate.state && typeof candidate.state === 'object' && !Array.isArray(candidate.state)
    ? candidate.state as Record<string, unknown>
    : {}

  return {
    version,
    turnId,
    rendererTarget,
    replyText,
    state: {
      baseEmotion: normalizeAlicizationEmotion(stateCandidate.baseEmotion).emotion,
      delivery: normalizeAlicizationPerformanceDelivery(stateCandidate.delivery),
      emphasis: normalizeEmphasis(stateCandidate.emphasis),
      residentMode: normalizeResidentMode(stateCandidate.residentMode),
    },
    speechPlan: normalizeAlicizationEmbodimentSpeechPlan(candidate.speechPlan),
    facePlan: normalizeFacePlan(candidate.facePlan),
    motionPlan: normalizeMotionPlan(candidate.motionPlan),
    lipsyncPlan: normalizeAlicizationEmbodimentLipSyncPlan(candidate.lipsyncPlan),
  }
}
