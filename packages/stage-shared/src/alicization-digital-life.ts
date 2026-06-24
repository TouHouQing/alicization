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
import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationRuntimeProjectStateDigest,
} from './alicization-transport-contracts'
import type { StageEmbodimentMotorState } from './stage-embodiment-motor-state'
import type { StageEmbodimentPresencePostureMode } from './stage-embodiment-presence-posture'
import type { StageEmbodimentSpeechStyleProfile } from './stage-embodiment-profile'

import { normalizeAlicizationDialogueEmbodimentEnvelope } from './alicization-dialogue-embodiment'
import { normalizeAlicizationDialogueSpeechTimeline } from './alicization-dialogue-speech-timeline'
import { normalizeAlicizationEmotion, normalizeAlicizationPerformancePayload } from './alicization-performance-contracts'
import { hasAlicizationSoftenedSameHerCarry } from './alicization-same-her-renderer-hints'
import {
  createIdleStageEmbodimentMotorState,
  normalizeStageEmbodimentMotorState,
} from './stage-embodiment-motor-state'

export type AlicizationDigitalLifeMode = 'thinking' | 'speaking' | 'acting' | 'recovering'
export type AlicizationDigitalLifeLipSyncMode = 'hybrid' | 'viseme' | 'energy' | 'energy-phoneme-hybrid' | 'closed'
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

export type AlicizationDigitalLifeMotorPlan = StageEmbodimentMotorState

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
  motor: AlicizationDigitalLifeMotorPlan
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
  motor: AlicizationDigitalLifeMotorPlan
  frames: AlicizationDigitalLifeFrame[]
}

export interface BuildAlicizationDigitalLifeEnvelopeInput {
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline?: AlicizationDialogueSpeechTimeline | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  projectState?: AlicizationRuntimeProjectStateDigest | null
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

function roundSignedHundredths(value: number, fallback = 0) {
  return Number(clampRange(value, -1, 1, fallback).toFixed(2))
}

function normalizeCue(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  return normalized ? normalized.slice(0, 96) : null
}

function normalizeRendererHintAliases(raw: unknown) {
  if (!Array.isArray(raw))
    return []

  const deduped: string[] = []
  const seen = new Set<string>()
  for (const value of raw) {
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

function normalizeDigitalLifeRendererHints(
  raw: unknown,
): AlicizationDialogueEmbodimentRendererHints | null {
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
  const residentMode = typeof candidate.residentMode === 'string' && candidate.residentMode.trim()
    ? candidate.residentMode.trim()
    : undefined
  const reasonTags = normalizeRendererHintAliases(candidate.reasonTags)
  const signature = typeof candidate.signature === 'string' && candidate.signature.trim()
    ? candidate.signature.trim()
    : undefined
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
    preferredExpressionAliases: preferredExpressionAliases.length > 0 ? preferredExpressionAliases : undefined,
    preferredMotionAliases: preferredMotionAliases.length > 0 ? preferredMotionAliases : undefined,
    preferredGazeMode,
    preferredBlinkCadence,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
    residentMode,
    reasonTags: reasonTags.length > 0 ? reasonTags : undefined,
    signature,
  }
}

function normalizeVariationToken(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim().slice(0, 256)
}

function normalizeRendererHintAlias(value: string | null | undefined) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/-/g, '_')
    : null
}

function hasRememberedSeamMoreRoomRendererHints(
  rendererHints: AlicizationDialogueEmbodimentRendererHints | null | undefined,
) {
  const sameHerSoftenedCarry = hasAlicizationSoftenedSameHerCarry({
    signature: rendererHints?.signature,
    reasonTags: rendererHints?.reasonTags,
  })

  if (rendererHints?.residentMode !== 'measured-return' && !sameHerSoftenedCarry)
    return false

  const primaryExpressionAlias = normalizeRendererHintAlias(rendererHints?.preferredExpressionAliases?.[0] ?? null)
  const primaryMotionAlias = normalizeRendererHintAlias(rendererHints?.preferredMotionAliases?.[0] ?? null)

  return primaryExpressionAlias === 'soft_gaze'
    && primaryMotionAlias === 'idle_settle'
    && rendererHints?.preferredBlinkCadence === 'linger'
    && rendererHints?.preferredGazeMode === 'soften'
}

function normalizeDigitalLifeMode(raw: unknown): AlicizationDigitalLifeMode {
  return raw === 'thinking' || raw === 'acting' || raw === 'recovering'
    ? raw
    : 'speaking'
}

function normalizeDigitalLifeLipSyncMode(raw: unknown): AlicizationDigitalLifeLipSyncMode {
  return raw === 'viseme' || raw === 'energy' || raw === 'energy-phoneme-hybrid' || raw === 'closed'
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

function resolveCompanionshipResidentMode(input: {
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
  segments: AlicizationDialogueSpeechTimelineSegment[]
}) {
  const envelopeMode = input.rendererHints?.residentMode
  if (envelopeMode === 'quiet-companionship' || envelopeMode === 'measured-return' || envelopeMode === 'repair-before-closeness')
    return envelopeMode

  for (const segment of input.segments) {
    const residentMode = segment.rendererHints?.residentMode
    if (residentMode === 'quiet-companionship' || residentMode === 'measured-return' || residentMode === 'repair-before-closeness')
      return residentMode
  }

  return null
}

function resolveEmotionMotorBias(emotion: AlicizationEmotion) {
  switch (emotion) {
    case 'happy':
      return {
        bodyLean: 0.12,
        bodyOpenness: 0.16,
        bodySway: 0.08,
        breathAmplitude: 0.06,
        browLift: 0.14,
        browTension: -0.08,
        cheekLift: 0.22,
        expressivity: 0.18,
        eyeOpenness: 0.08,
        gazeAzimuth: 0.06,
        gazeElevation: 0.08,
        gazeFocus: -0.04,
        gazeStability: -0.06,
        headPitch: -0.08,
        jawOpenBias: 0.12,
        mouthRound: -0.08,
        mouthSpread: 0.24,
        stillness: -0.14,
      }
    case 'sad':
    case 'tired':
      return {
        bodyLean: -0.12,
        bodyOpenness: -0.12,
        bodySway: -0.04,
        breathAmplitude: -0.06,
        browLift: -0.14,
        browTension: 0.08,
        cheekLift: -0.06,
        expressivity: -0.1,
        eyeOpenness: -0.16,
        gazeAzimuth: -0.04,
        gazeElevation: -0.14,
        gazeFocus: 0.02,
        gazeStability: 0.12,
        headPitch: 0.12,
        jawOpenBias: -0.08,
        mouthRound: 0.06,
        mouthSpread: -0.14,
        stillness: 0.18,
      }
    case 'angry':
      return {
        bodyLean: 0.18,
        bodyOpenness: 0.08,
        bodySway: 0.12,
        breathAmplitude: 0.1,
        browLift: -0.18,
        browTension: 0.3,
        cheekLift: -0.04,
        expressivity: 0.16,
        eyeOpenness: -0.06,
        gazeAzimuth: 0,
        gazeElevation: -0.04,
        gazeFocus: 0.2,
        gazeStability: 0.16,
        headPitch: 0.1,
        jawOpenBias: 0.14,
        mouthRound: -0.1,
        mouthSpread: 0.02,
        stillness: -0.02,
      }
    case 'concerned':
    case 'apologetic':
      return {
        bodyLean: -0.04,
        bodyOpenness: -0.06,
        bodySway: -0.02,
        breathAmplitude: 0.02,
        browLift: -0.08,
        browTension: 0.18,
        cheekLift: 0.02,
        expressivity: -0.02,
        eyeOpenness: -0.04,
        gazeAzimuth: -0.02,
        gazeElevation: -0.08,
        gazeFocus: 0.12,
        gazeStability: 0.12,
        headPitch: 0.04,
        jawOpenBias: -0.02,
        mouthRound: 0.1,
        mouthSpread: -0.04,
        stillness: 0.1,
      }
    case 'surprised':
      return {
        bodyLean: 0.08,
        bodyOpenness: 0.08,
        bodySway: 0.1,
        breathAmplitude: 0.12,
        browLift: 0.28,
        browTension: 0.06,
        cheekLift: 0.04,
        expressivity: 0.2,
        eyeOpenness: 0.26,
        gazeAzimuth: 0,
        gazeElevation: 0.12,
        gazeFocus: 0.04,
        gazeStability: -0.12,
        headPitch: -0.04,
        jawOpenBias: 0.22,
        mouthRound: 0.1,
        mouthSpread: 0.04,
        stillness: -0.18,
      }
    case 'thinking':
      return {
        bodyLean: 0.06,
        bodyOpenness: -0.02,
        bodySway: -0.06,
        breathAmplitude: 0,
        browLift: 0.06,
        browTension: 0.18,
        cheekLift: 0,
        expressivity: -0.02,
        eyeOpenness: -0.04,
        gazeAzimuth: 0.1,
        gazeElevation: 0.02,
        gazeFocus: 0.18,
        gazeStability: 0.16,
        headPitch: 0.02,
        jawOpenBias: -0.04,
        mouthRound: 0.06,
        mouthSpread: -0.04,
        stillness: 0.14,
      }
    case 'neutral':
    default:
      return {
        bodyLean: 0,
        bodyOpenness: 0,
        bodySway: 0,
        breathAmplitude: 0,
        browLift: 0,
        browTension: 0,
        cheekLift: 0,
        expressivity: 0,
        eyeOpenness: 0,
        gazeAzimuth: 0,
        gazeElevation: 0,
        gazeFocus: 0,
        gazeStability: 0,
        headPitch: 0,
        jawOpenBias: 0,
        mouthRound: 0,
        mouthSpread: 0,
        stillness: 0,
      }
  }
}

function resolveDeliveryMotorBias(delivery: AlicizationDialoguePerformancePayload['delivery']) {
  switch (delivery) {
    case 'energetic':
      return {
        breathPace: 0.18,
        expressivity: 0.18,
        gazeAzimuth: 0.04,
        gazeStability: -0.1,
        headNod: 0.24,
        headPitch: -0.06,
        headRoll: 0.06,
        mouthSpread: 0.08,
        stillness: -0.18,
        sway: 0.16,
      }
    case 'firm':
      return {
        breathPace: 0.1,
        expressivity: 0.08,
        gazeAzimuth: 0,
        gazeStability: 0.12,
        headNod: 0.16,
        headPitch: 0.04,
        headRoll: -0.02,
        mouthSpread: 0.02,
        stillness: -0.04,
        sway: 0.04,
      }
    case 'gentle':
      return {
        breathPace: -0.04,
        expressivity: -0.02,
        gazeAzimuth: -0.02,
        gazeStability: 0.08,
        headNod: 0.04,
        headPitch: 0.02,
        headRoll: 0.06,
        mouthSpread: 0.06,
        stillness: 0.12,
        sway: -0.02,
      }
    case 'hesitant':
      return {
        breathPace: -0.06,
        expressivity: -0.08,
        gazeAzimuth: -0.08,
        gazeStability: -0.06,
        headNod: 0.02,
        headPitch: 0.08,
        headRoll: 0.04,
        mouthSpread: -0.08,
        stillness: 0.14,
        sway: -0.06,
      }
    case 'teasing':
      return {
        breathPace: 0.08,
        expressivity: 0.12,
        gazeAzimuth: 0.12,
        gazeStability: -0.08,
        headNod: 0.12,
        headPitch: -0.04,
        headRoll: 0.1,
        mouthSpread: 0.14,
        stillness: -0.12,
        sway: 0.12,
      }
    case 'calm':
    default:
      return {
        breathPace: 0,
        expressivity: 0,
        gazeAzimuth: 0,
        gazeStability: 0.04,
        headNod: 0,
        headPitch: 0,
        headRoll: 0,
        mouthSpread: 0,
        stillness: 0.08,
        sway: 0,
      }
  }
}

function resolvePostureMotorBias(postureHint: StageEmbodimentPresencePostureMode) {
  switch (postureHint) {
    case 'attentive':
      return {
        gazeFocus: 0.12,
        gazeStability: 0.08,
        lean: 0.08,
        openness: 0.06,
        settle: 0.02,
      }
    case 'inspection':
      return {
        gazeFocus: 0.18,
        gazeStability: 0.14,
        lean: 0.1,
        openness: -0.02,
        settle: 0.08,
      }
    case 'hesitant':
      return {
        gazeFocus: 0.04,
        gazeStability: -0.04,
        lean: -0.08,
        openness: -0.12,
        settle: 0.12,
      }
    case 'concerned':
      return {
        gazeFocus: 0.1,
        gazeStability: 0.1,
        lean: -0.04,
        openness: -0.08,
        settle: 0.1,
      }
    case 'idle':
    default:
      return {
        gazeFocus: 0,
        gazeStability: 0,
        lean: 0,
        openness: 0,
        settle: 0,
      }
  }
}

interface AlicizationDigitalLifeEmbodimentMotorBias {
  stillness: number
  expressivity: number
  gazeFocus: number
  gazeStability: number
  gazeAzimuth: number
  gazeElevation: number
  headPitch: number
  headRoll: number
  headNod: number
  breathAmplitude: number
  breathPace: number
  eyeOpenness: number
  browLift: number
  browTension: number
  cheekLift: number
  mouthSpread: number
  mouthRound: number
  jawOpenBias: number
  bodySway: number
  bodyLean: number
  bodyOpenness: number
  settle: number
}

function createNeutralEmbodimentMotorBias(): AlicizationDigitalLifeEmbodimentMotorBias {
  return {
    stillness: 0,
    expressivity: 0,
    gazeFocus: 0,
    gazeStability: 0,
    gazeAzimuth: 0,
    gazeElevation: 0,
    headPitch: 0,
    headRoll: 0,
    headNod: 0,
    breathAmplitude: 0,
    breathPace: 0,
    eyeOpenness: 0,
    browLift: 0,
    browTension: 0,
    cheekLift: 0,
    mouthSpread: 0,
    mouthRound: 0,
    jawOpenBias: 0,
    bodySway: 0,
    bodyLean: 0,
    bodyOpenness: 0,
    settle: 0,
  }
}

function resolveCategoricalEmbodimentWeight(
  raw: string | null | undefined,
  mapping: Record<string, number>,
  fallback = 0.5,
) {
  if (typeof raw !== 'string')
    return fallback

  const key = raw.trim()
  return Object.prototype.hasOwnProperty.call(mapping, key)
    ? clampUnit(mapping[key], fallback)
    : fallback
}

function resolvePresenceEmbodimentMotorBias(raw: string | null | undefined): AlicizationDigitalLifeEmbodimentMotorBias {
  const idle = createNeutralEmbodimentMotorBias()
  switch (raw) {
    case 'glance':
      return {
        ...idle,
        stillness: 0.04,
        gazeFocus: -0.06,
        gazeStability: -0.04,
        gazeAzimuth: 0.08,
        gazeElevation: -0.04,
        bodyLean: -0.06,
        bodyOpenness: -0.06,
        settle: 0.06,
      }
    case 'attentive':
      return {
        ...idle,
        gazeFocus: 0.08,
        gazeStability: 0.06,
        headNod: 0.02,
        bodyLean: 0.06,
        bodyOpenness: 0.04,
      }
    case 'hesitant':
      return {
        ...idle,
        stillness: 0.08,
        gazeFocus: -0.02,
        gazeStability: -0.04,
        breathPace: -0.04,
        browTension: 0.08,
        mouthRound: 0.06,
        bodyLean: -0.08,
        bodyOpenness: -0.12,
        settle: 0.08,
      }
    case 'concerned':
      return {
        ...idle,
        stillness: 0.04,
        gazeFocus: 0.08,
        gazeStability: 0.08,
        breathAmplitude: 0.04,
        browTension: 0.1,
        mouthRound: 0.08,
        bodyLean: -0.02,
        bodyOpenness: -0.08,
        settle: 0.1,
      }
    default:
      return idle
  }
}

function resolveExpressionStyleEmbodimentMotorBias(raw: string | null | undefined): AlicizationDigitalLifeEmbodimentMotorBias {
  const idle = createNeutralEmbodimentMotorBias()
  switch (raw) {
    case 'contained':
      return {
        ...idle,
        stillness: 0.08,
        expressivity: -0.08,
        gazeStability: 0.06,
        cheekLift: -0.02,
        mouthSpread: -0.08,
        jawOpenBias: -0.04,
        bodySway: -0.04,
        settle: 0.04,
      }
    case 'measured':
      return {
        ...idle,
        stillness: 0.04,
        gazeStability: 0.04,
        browTension: 0.04,
        mouthSpread: -0.02,
        settle: 0.04,
      }
    case 'warm':
      return {
        ...idle,
        expressivity: 0.06,
        browLift: 0.04,
        cheekLift: 0.08,
        mouthSpread: 0.08,
        bodyOpenness: 0.08,
      }
    case 'playful':
      return {
        ...idle,
        expressivity: 0.1,
        gazeStability: -0.04,
        headRoll: 0.04,
        breathAmplitude: 0.04,
        cheekLift: 0.1,
        mouthSpread: 0.12,
        jawOpenBias: 0.04,
        bodySway: 0.08,
        bodyOpenness: 0.08,
      }
    case 'sharp':
      return {
        ...idle,
        stillness: 0.02,
        gazeFocus: 0.06,
        headPitch: 0.04,
        browTension: 0.1,
        mouthSpread: -0.04,
        jawOpenBias: 0.04,
      }
    default:
      return idle
  }
}

function resolveApproachEmbodimentMotorBias(raw: string | null | undefined): AlicizationDigitalLifeEmbodimentMotorBias {
  const idle = createNeutralEmbodimentMotorBias()
  switch (raw) {
    case 'give-space':
      return {
        ...idle,
        stillness: 0.04,
        gazeStability: 0.04,
        bodyLean: -0.08,
        bodyOpenness: -0.08,
        settle: 0.06,
      }
    case 'stay-near':
      return {
        ...idle,
        gazeFocus: 0.04,
        bodyLean: 0.06,
        bodyOpenness: 0.04,
      }
    case 'guide':
      return {
        ...idle,
        gazeFocus: 0.08,
        gazeStability: 0.08,
        headPitch: 0.04,
        browTension: 0.06,
        jawOpenBias: 0.04,
        bodyLean: 0.04,
      }
    case 'care':
      return {
        ...idle,
        gazeFocus: 0.04,
        browLift: -0.02,
        browTension: 0.04,
        mouthRound: 0.08,
        bodyOpenness: 0.04,
        settle: 0.1,
      }
    default:
      return idle
  }
}

function resolveSpineEmbodimentMotorBias(
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null,
): AlicizationDigitalLifeEmbodimentMotorBias {
  const embodiment = digitalLifeSpine?.embodiment ?? null
  const personaBias = digitalLifeSpine?.proactive?.personaBias ?? null
  if (!embodiment && !personaBias)
    return createNeutralEmbodimentMotorBias()

  const privateThought = embodiment?.privateThought ?? null
  const selfContinuity = embodiment?.selfContinuity ?? null
  const autobiographicalSelf = embodiment?.autobiographicalSelf ?? null
  const relationship = embodiment?.relationship ?? null
  const selfState = embodiment?.selfState ?? null
  const mindEcology = embodiment?.mindEcology ?? null
  const initiative = embodiment?.initiative ?? null

  const presence = privateThought?.embodiedPresence
    ?? initiative?.preferredPresence
    ?? digitalLifeSpine?.runtime?.preferredPresence
    ?? null
  const expressionStyle = autobiographicalSelf?.expressionStyle ?? null
  const approachVector = relationship?.approachVector ?? null

  const climateWarmth = resolveCategoricalEmbodimentWeight(relationship?.climate, {
    guarded: 0.16,
    neutral: 0.48,
    warm: 0.74,
    attuned: 0.92,
  })
  const guardedOrientation = resolveCategoricalEmbodimentWeight(selfContinuity?.attachmentMode, {
    guarded: 0.9,
    nearby: 0.56,
    attuned: 0.22,
  })
  const attunementOrientation = resolveCategoricalEmbodimentWeight(selfContinuity?.attachmentMode, {
    guarded: 0.18,
    nearby: 0.6,
    attuned: 0.92,
  })
  const initiativeDrive = resolveCategoricalEmbodimentWeight(selfContinuity?.initiativeTemperament, {
    reserved: 0.24,
    balanced: 0.56,
    eager: 0.88,
  })
  const expressionWarmth = resolveCategoricalEmbodimentWeight(expressionStyle, {
    contained: 0.24,
    measured: 0.42,
    warm: 0.76,
    playful: 0.84,
    sharp: 0.38,
  })
  const expressionPlayfulness = resolveCategoricalEmbodimentWeight(expressionStyle, {
    contained: 0.18,
    measured: 0.26,
    warm: 0.48,
    playful: 0.92,
    sharp: 0.22,
  })
  const relationshipApproach = resolveCategoricalEmbodimentWeight(approachVector, {
    'give-space': 0.2,
    'stay-near': 0.58,
    'guide': 0.78,
    'care': 0.92,
  })
  const replyHabitRestraint = resolveCategoricalEmbodimentWeight(mindEcology?.replyHabit, {
    'repair-first': 0.64,
    'care-first': 0.56,
    'answer-first': 0.42,
    'hover-first': 0.66,
    'observe-first': 0.84,
  })
  const regulationRestraint = resolveCategoricalEmbodimentWeight(mindEcology?.regulationHabit, {
    'cool-down-before-speaking': 0.86,
    'soften-before-speaking': 0.68,
    'contain-and-watch': 0.9,
    'lean-forward-gently': 0.42,
  })
  const tensionArousal = resolveCategoricalEmbodimentWeight(privateThought?.emotionalTension, {
    'tense-debug': 0.84,
    'focused-flow': 0.58,
    'soft-covision': 0.38,
    'late-night-drain': 0.26,
    'restless-switching': 0.92,
    'calm-browse': 0.32,
  })

  const warmth = clampUnit(
    climateWarmth * 0.24
    + clampUnit(relationship?.receptivity, 0.5) * 0.1
    + clampUnit(selfState?.feltCloseness, 0.46) * 0.14
    + clampUnit(autobiographicalSelf?.careBias, 0.5) * 0.12
    + clampUnit(autobiographicalSelf?.companionship, 0.5) * 0.12
    + clampUnit(autobiographicalSelf?.proactiveCare, 0.5) * 0.08
    + clampUnit(mindEcology?.temperament.tenderness, 0.5) * 0.12
    + expressionWarmth * 0.08,
  )
  const playfulness = clampUnit(
    expressionPlayfulness * 0.18
    + clampUnit(autobiographicalSelf?.playBias, 0.28) * 0.18
    + clampUnit(autobiographicalSelf?.playfulIntimacy, 0.28) * 0.16
    + clampUnit(mindEcology?.temperament.playfulness, 0.3) * 0.18
    + climateWarmth * 0.08
    + clampUnit(mindEcology?.climate.valence, 0.48) * 0.1,
  )
  const guardedness = clampUnit(
    guardedOrientation * 0.18
    + clampUnit(selfContinuity?.guardingTendency, 0.42) * 0.18
    + resolveCategoricalEmbodimentWeight(relationship?.climate, {
      guarded: 0.88,
      neutral: 0.5,
      warm: 0.3,
      attuned: 0.18,
    }) * 0.14
    + clampUnit(selfState?.fearOfInterrupting, 0.38) * 0.14
    + clampUnit(autobiographicalSelf?.autonomyRespect, 0.52) * 0.12
    + clampUnit(autobiographicalSelf?.autonomyNeed, 0.48) * 0.12
    + clampUnit(mindEcology?.climate.solitudeNeed, 0.44) * 0.12,
  )
  const attunement = clampUnit(
    attunementOrientation * 0.2
    + clampUnit(selfContinuity?.relationshipTrust, 0.46) * 0.16
    + clampUnit(relationship?.sharedAttentionTrust, 0.46) * 0.18
    + clampUnit(selfState?.feltCloseness, 0.46) * 0.12
    + clampUnit(autobiographicalSelf?.companionship, 0.48) * 0.1
    + clampUnit(mindEcology?.temperament.attachment, 0.48) * 0.12
    + resolveCategoricalEmbodimentWeight(presence, {
      glance: 0.28,
      attentive: 0.78,
      hesitant: 0.4,
      concerned: 0.7,
    }) * 0.12,
  )
  const protectiveness = clampUnit(
    clampUnit(selfState?.protectiveness, 0.3) * 0.22
    + relationshipApproach * 0.18
    + resolveCategoricalEmbodimentWeight(presence, {
      glance: 0.2,
      attentive: 0.56,
      hesitant: 0.48,
      concerned: 0.9,
    }) * 0.14
    + clampUnit(autobiographicalSelf?.careBias, 0.48) * 0.12
    + clampUnit(mindEcology?.temperament.tenderness, 0.5) * 0.12
    + clampUnit(privateThought?.confidence, 0.46) * 0.08
    + tensionArousal * 0.14,
  )
  const care = clampUnit(
    clampUnit(autobiographicalSelf?.careBias, 0.5) * 0.22
    + clampUnit(autobiographicalSelf?.proactiveCare, 0.5) * 0.16
    + clampUnit(mindEcology?.temperament.tenderness, 0.5) * 0.18
    + clampUnit(mindEcology?.relationshipHabit === 'warm-guidance' ? 0.74 : mindEcology?.relationshipHabit === 'protective-shadow' ? 0.68 : 0.5, 0.5) * 0.12
    + climateWarmth * 0.1
    + protectiveness * 0.12,
  )
  const directness = clampUnit(
    resolveCategoricalEmbodimentWeight(autobiographicalSelf?.agencyStyle, {
      'reserved': 0.26,
      'balanced': 0.56,
      'self-starting': 0.9,
    }) * 0.18
    + initiativeDrive * 0.12
    + clampUnit(initiative?.confidence, 0.5) * 0.12
    + clampUnit(initiative?.speakDrive, 0.46) * 0.12
    + clampUnit(selfState?.desireToSpeak, 0.46) * 0.12
    + clampUnit(autobiographicalSelf?.truthAnchor, 0.56) * 0.08
    + clampUnit(autobiographicalSelf?.truthfulGrounding, 0.56) * 0.1
    + clampUnit(mindEcology?.temperament.directness, 0.5) * 0.16
    - clampUnit(selfState?.fearOfInterrupting, 0.38) * 0.1,
  )
  const restraint = clampUnit(
    clampUnit(mindEcology?.temperament.steadiness, 0.5) * 0.2
    + clampUnit(selfState?.patience, 0.42) * 0.16
    + clampUnit(autobiographicalSelf?.quietObservation, 0.5) * 0.14
    + guardedness * 0.18
    + replyHabitRestraint * 0.12
    + regulationRestraint * 0.2,
  )
  const arousal = clampUnit(
    clampUnit(mindEcology?.climate.arousal, 0.5) * 0.24
    + clampUnit(mindEcology?.climate.restlessness, 0.4) * 0.12
    + tensionArousal * 0.22
    + playfulness * 0.12
    + directness * 0.08
    + clampUnit(initiative?.confidence, 0.5) * 0.1,
  )
  const truthDiscipline = clampUnit(
    clampUnit(autobiographicalSelf?.truthAnchor, 0.56) * 0.56
    + clampUnit(autobiographicalSelf?.truthfulGrounding, 0.56) * 0.44,
  )
  const irritation = clampUnit(
    clampUnit(mindEcology?.temperament.irritability, 0.28) * 0.48
    + clampUnit(mindEcology?.climate.irritation, 0.28) * 0.52,
  )

  const warmthDelta = warmth - 0.5
  const playDelta = playfulness - 0.5
  const guardedDelta = guardedness - 0.5
  const attunementDelta = attunement - 0.5
  const protectiveDelta = protectiveness - 0.5
  const careDelta = care - 0.5
  const directnessDelta = directness - 0.5
  const restraintDelta = restraint - 0.5
  const arousalDelta = arousal - 0.5
  const truthDelta = truthDiscipline - 0.5
  const irritationDelta = irritation - 0.5
  const personaObserveBias = personaBias?.initiativeStyle === 'observant'
    || personaBias?.silenceReconnect === 'hold'
    || personaBias?.preferredProactiveStyle === 'silent-observe'
  const personaDirectBias = personaBias?.initiativeStyle === 'high-participation'
    || personaBias?.silenceReconnect === 'direct-approach'
  const personaCareBias = personaBias?.relationshipPosture === 'guardian'
    || personaBias?.comfortStyle === 'take-charge'

  const presenceBias = resolvePresenceEmbodimentMotorBias(presence)
  const styleBias = resolveExpressionStyleEmbodimentMotorBias(expressionStyle)
  const approachBias = resolveApproachEmbodimentMotorBias(approachVector)

  return {
    stillness: roundSignedHundredths(
      presenceBias.stillness
      + styleBias.stillness
      + approachBias.stillness
      + guardedDelta * 0.24
      + restraintDelta * 0.2
      + protectiveDelta * 0.08
      + (personaObserveBias ? 0.08 : 0)
      - (personaDirectBias ? 0.08 : 0)
      - warmthDelta * 0.1
      - playDelta * 0.16
      - directnessDelta * 0.08,
    ),
    expressivity: roundSignedHundredths(
      presenceBias.expressivity
      + styleBias.expressivity
      + approachBias.expressivity
      + warmthDelta * 0.18
      + playDelta * 0.22
      + arousalDelta * 0.08
      + (personaDirectBias ? 0.08 : 0)
      + (personaCareBias ? 0.04 : 0)
      + directnessDelta * 0.08
      - guardedDelta * 0.08
      - (personaObserveBias ? 0.06 : 0)
      - restraintDelta * 0.12,
    ),
    gazeFocus: roundSignedHundredths(
      presenceBias.gazeFocus
      + styleBias.gazeFocus
      + approachBias.gazeFocus
      + attunementDelta * 0.22
      + protectiveDelta * 0.16
      + directnessDelta * 0.14
      + truthDelta * 0.1
      - guardedDelta * 0.06,
    ),
    gazeStability: roundSignedHundredths(
      presenceBias.gazeStability
      + styleBias.gazeStability
      + approachBias.gazeStability
      + restraintDelta * 0.22
      + attunementDelta * 0.08
      + truthDelta * 0.12
      - playDelta * 0.08
      - arousalDelta * 0.04,
    ),
    gazeAzimuth: roundSignedHundredths(
      presenceBias.gazeAzimuth
      + (clampUnit(mindEcology?.temperament.curiosity, 0.46) - 0.5) * 0.12
      + playDelta * 0.04
      - restraintDelta * 0.04,
    ),
    gazeElevation: roundSignedHundredths(
      presenceBias.gazeElevation
      + arousalDelta * 0.08
      - guardedDelta * 0.04
      - careDelta * 0.03,
    ),
    headPitch: roundSignedHundredths(
      styleBias.headPitch
      + approachBias.headPitch
      + directnessDelta * 0.08
      - guardedDelta * 0.04
      + careDelta * 0.04,
    ),
    headRoll: roundSignedHundredths(
      styleBias.headRoll
      + approachBias.headRoll
      + playDelta * 0.08
      - irritationDelta * 0.04,
    ),
    headNod: roundSignedHundredths(
      presenceBias.headNod
      + attunementDelta * 0.08
      + directnessDelta * 0.08
      + careDelta * 0.04,
    ),
    breathAmplitude: roundSignedHundredths(
      presenceBias.breathAmplitude
      + styleBias.breathAmplitude
      + arousalDelta * 0.14
      + warmthDelta * 0.04
      + playDelta * 0.08
      - restraintDelta * 0.06,
    ),
    breathPace: roundSignedHundredths(
      presenceBias.breathPace
      + arousalDelta * 0.18
      + directnessDelta * 0.08
      - restraintDelta * 0.12
      - careDelta * 0.04,
    ),
    eyeOpenness: roundSignedHundredths(
      presenceBias.eyeOpenness
      + arousalDelta * 0.08
      + playDelta * 0.06
      - restraintDelta * 0.04
      - irritationDelta * 0.03,
    ),
    browLift: roundSignedHundredths(
      styleBias.browLift
      + approachBias.browLift
      + (clampUnit(mindEcology?.temperament.curiosity, 0.46) - 0.5) * 0.12
      + warmthDelta * 0.06
      - protectiveDelta * 0.04,
    ),
    browTension: roundSignedHundredths(
      presenceBias.browTension
      + styleBias.browTension
      + approachBias.browTension
      + protectiveDelta * 0.16
      + truthDelta * 0.1
      + irritationDelta * 0.14
      + guardedDelta * 0.08
      - warmthDelta * 0.08,
    ),
    cheekLift: roundSignedHundredths(
      styleBias.cheekLift
      + warmthDelta * 0.16
      + playDelta * 0.16
      - guardedDelta * 0.04,
    ),
    mouthSpread: roundSignedHundredths(
      styleBias.mouthSpread
      + warmthDelta * 0.2
      + playDelta * 0.18
      + directnessDelta * 0.08
      - guardedDelta * 0.06
      - protectiveDelta * 0.04,
    ),
    mouthRound: roundSignedHundredths(
      presenceBias.mouthRound
      + approachBias.mouthRound
      + careDelta * 0.16
      + protectiveDelta * 0.1
      + guardedDelta * 0.08
      - playDelta * 0.06,
    ),
    jawOpenBias: roundSignedHundredths(
      styleBias.jawOpenBias
      + approachBias.jawOpenBias
      + directnessDelta * 0.08
      + arousalDelta * 0.08
      - restraintDelta * 0.08
      - guardedDelta * 0.04,
    ),
    bodySway: roundSignedHundredths(
      styleBias.bodySway
      + playDelta * 0.16
      + arousalDelta * 0.08
      - guardedDelta * 0.04
      - restraintDelta * 0.06,
    ),
    bodyLean: roundSignedHundredths(
      presenceBias.bodyLean
      + approachBias.bodyLean
      + attunementDelta * 0.18
      + directnessDelta * 0.08
      + (personaDirectBias ? 0.12 : 0)
      - clampUnit(autobiographicalSelf?.autonomyNeed, 0.48) * 0.14
      + 0.07,
    ),
    bodyOpenness: roundSignedHundredths(
      presenceBias.bodyOpenness
      + styleBias.bodyOpenness
      + approachBias.bodyOpenness
      + warmthDelta * 0.22
      + attunementDelta * 0.14
      + careDelta * 0.08
      + (personaDirectBias ? 0.1 : 0)
      + (personaCareBias ? 0.04 : 0)
      - guardedDelta * 0.14
      - (personaObserveBias ? 0.06 : 0)
      - clampUnit(autobiographicalSelf?.autonomyRespect, 0.52) * 0.12
      + 0.06,
    ),
    settle: roundSignedHundredths(
      presenceBias.settle
      + styleBias.settle
      + approachBias.settle
      + restraintDelta * 0.18
      + protectiveDelta * 0.08
      + careDelta * 0.08
      - playDelta * 0.06,
    ),
  }
}

export function deriveAlicizationDigitalLifeMotorPlan(input: {
  action: Pick<AlicizationDigitalLifeActionPlan, 'actionCue' | 'actionMode' | 'intensity'>
  emotion: AlicizationEmotion
  face: Pick<AlicizationDigitalLifeFacePlan, 'expressionMode' | 'facialCue' | 'intensity'>
  lipSync: Pick<AlicizationDigitalLifeLipSyncPlan, 'mode' | 'mouthScale'>
  performance: AlicizationDialoguePerformancePayload
  postureHint?: StageEmbodimentPresencePostureMode | null
  segmentWeights?: {
    beat?: number | null
    facial?: number | null
    gesture?: number | null
    head?: number | null
    mouth?: number | null
  } | null
  voice: Pick<AlicizationDigitalLifeVoicePlan, 'cadence' | 'energy'>
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
}): AlicizationDigitalLifeMotorPlan {
  const idle = createIdleStageEmbodimentMotorState()
  const rememberedSeamMoreRoom = hasRememberedSeamMoreRoomRendererHints(input.rendererHints)
  const weightScale = rememberedSeamMoreRoom ? 0.82 : 1
  const emphasis = clampUnit(input.performance.emphasis * 0.5)
  const gestureWeight = clampUnit(Math.max((input.segmentWeights?.gesture ?? 0) * weightScale, input.action.intensity))
  const facialWeight = clampUnit(Math.max((input.segmentWeights?.facial ?? 0) * weightScale, input.face.intensity))
  const beatWeight = clampUnit(input.segmentWeights?.beat ?? input.voice.cadence)
  const mouthWeight = clampUnit((input.segmentWeights?.mouth ?? input.lipSync.mouthScale) * (rememberedSeamMoreRoom ? 0.88 : 1))
  const headWeight = clampUnit(Math.max((input.segmentWeights?.head ?? 0) * weightScale, input.action.intensity))
  const energy = clampUnit(input.voice.energy, 0.5)
  const cadence = clampUnit(input.voice.cadence, 0.5)
  const emotionBias = resolveEmotionMotorBias(input.emotion)
  const deliveryBias = resolveDeliveryMotorBias(input.performance.delivery)
  const postureBias = resolvePostureMotorBias(input.postureHint ?? 'idle')
  const embodimentBias = resolveSpineEmbodimentMotorBias(input.digitalLifeSpine)
  const expressivity = roundHundredths(
    idle.expressivity
    + emotionBias.expressivity
    + deliveryBias.expressivity
    + embodimentBias.expressivity
    + emphasis * 0.12
    + gestureWeight * 0.08
    + facialWeight * 0.06
    + cadence * 0.08
    + energy * 0.04
    + (input.action.actionCue ? 0.04 : 0)
    + (input.face.facialCue ? 0.02 : -0.02),
    idle.expressivity,
  )
  const stillness = roundHundredths(
    idle.stillness
    + emotionBias.stillness
    + deliveryBias.stillness
    + embodimentBias.stillness
    - expressivity * 0.14
    - gestureWeight * 0.08
    - cadence * 0.06
    + (input.face.expressionMode === 'hold' ? 0.08 : input.face.expressionMode === 'recover' ? 0.14 : -0.02)
    + (input.action.actionMode === 'none' ? 0.08 : input.action.actionMode === 'hold' ? 0.02 : -0.06),
    idle.stillness,
  )

  return normalizeStageEmbodimentMotorState({
    stillness,
    expressivity,
    gaze: {
      focus: idle.gaze.focus
        + emotionBias.gazeFocus
        + postureBias.gazeFocus
        + embodimentBias.gazeFocus
        + facialWeight * 0.08
        + headWeight * 0.04
        + (input.face.expressionMode === 'hold' ? 0.06 : 0),
      stability: idle.gaze.stability
        + emotionBias.gazeStability
        + deliveryBias.gazeStability
        + postureBias.gazeStability
        + embodimentBias.gazeStability
        + stillness * 0.12
        - beatWeight * 0.08
        - deliveryBias.sway * 0.08,
      azimuth: idle.gaze.azimuth
        + emotionBias.gazeAzimuth
        + deliveryBias.gazeAzimuth
        + embodimentBias.gazeAzimuth
        + (headWeight - 0.5) * 0.08,
      elevation: idle.gaze.elevation
        + emotionBias.gazeElevation
        + embodimentBias.gazeElevation
        + (energy - 0.5) * 0.08
        - (input.performance.delivery === 'hesitant' ? 0.04 : 0),
    },
    head: {
      yaw: idle.head.yaw
        + deliveryBias.gazeAzimuth * 0.8
        + emotionBias.gazeAzimuth * 0.5
        + embodimentBias.gazeAzimuth * 0.6
        + (headWeight - 0.5) * 0.16,
      pitch: idle.head.pitch
        + emotionBias.headPitch
        + deliveryBias.headPitch
        + embodimentBias.headPitch
        + postureBias.lean * 0.4
        - (gestureWeight - 0.5) * 0.08,
      roll: idle.head.roll
        + deliveryBias.headRoll
        + embodimentBias.headRoll
        + (input.performance.delivery === 'teasing' ? 0.06 : 0)
        + (input.performance.delivery === 'gentle' ? 0.04 : 0),
      nod: idle.head.nod
        + deliveryBias.headNod
        + embodimentBias.headNod
        + cadence * 0.22
        + beatWeight * 0.16
        + emphasis * 0.12
        + gestureWeight * 0.08,
    },
    breath: {
      amplitude: idle.breath.amplitude
        + emotionBias.breathAmplitude
        + embodimentBias.breathAmplitude
        + energy * 0.12
        + mouthWeight * 0.06
        + (input.performance.delivery === 'calm' ? -0.04 : 0),
      pace: idle.breath.pace
        + deliveryBias.breathPace
        + embodimentBias.breathPace
        + cadence * 0.24
        + beatWeight * 0.12
        + emphasis * 0.08,
    },
    facial: {
      eyeOpenness: idle.facial.eyeOpenness
        + emotionBias.eyeOpenness
        + embodimentBias.eyeOpenness
        + (facialWeight - 0.5) * 0.12
        + (input.face.expressionMode === 'recover' ? -0.04 : 0),
      browLift: idle.facial.browLift
        + emotionBias.browLift
        + embodimentBias.browLift
        + (input.performance.delivery === 'firm' ? -0.04 : 0),
      browTension: idle.facial.browTension
        + emotionBias.browTension
        + embodimentBias.browTension
        + (input.face.expressionMode === 'hold' ? 0.06 : 0)
        + emphasis * 0.06,
      cheekLift: idle.facial.cheekLift
        + emotionBias.cheekLift
        + embodimentBias.cheekLift
        + facialWeight * 0.08
        + energy * 0.04,
      mouthSpread: idle.facial.mouthSpread
        + emotionBias.mouthSpread
        + deliveryBias.mouthSpread
        + embodimentBias.mouthSpread
        + mouthWeight * 0.12,
      mouthRound: idle.facial.mouthRound
        + emotionBias.mouthRound
        + embodimentBias.mouthRound
        + (input.performance.delivery === 'gentle' ? 0.04 : 0)
        + (input.performance.delivery === 'hesitant' ? 0.06 : 0)
        + (1 - mouthWeight) * 0.06,
      jawOpenBias: input.lipSync.mode === 'closed'
        ? 0
        : idle.facial.jawOpenBias
          + emotionBias.jawOpenBias
          + embodimentBias.jawOpenBias
          + energy * 0.12
          + mouthWeight * 0.1
          + (Number(input.lipSync.mouthScale) - 0.88) * 0.16,
    },
    body: {
      sway: idle.body.sway
        + emotionBias.bodySway
        + deliveryBias.sway
        + embodimentBias.bodySway
        + (gestureWeight - 0.5) * 0.16
        + (cadence - 0.5) * 0.08,
      lean: idle.body.lean
        + emotionBias.bodyLean
        + postureBias.lean
        + embodimentBias.bodyLean
        + (input.action.actionMode === 'hold' ? 0.02 : 0),
      openness: idle.body.openness
        + emotionBias.bodyOpenness
        + postureBias.openness
        + embodimentBias.bodyOpenness
        + gestureWeight * 0.08
        + facialWeight * 0.04,
      settle: idle.body.settle
        + postureBias.settle
        + embodimentBias.settle
        + stillness * 0.12
        + (input.action.actionMode === 'none' ? 0.06 : 0)
        - deliveryBias.sway * 0.08,
    },
  }, idle)
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
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
  performance: AlicizationDialoguePerformancePayload
  segments: AlicizationDialogueSpeechTimelineSegment[]
}): AlicizationDigitalLifeMode {
  const companionshipResidentMode = resolveCompanionshipResidentMode({
    rendererHints: input.rendererHints,
    segments: input.segments,
  })
  if (companionshipResidentMode === 'measured-return' || companionshipResidentMode === 'repair-before-closeness')
    return 'thinking'

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
  projectState?: AlicizationRuntimeProjectStateDigest | null
}): AlicizationDigitalLifeVoicePlan {
  const averageProsody = averageWeight(input.segments, segment => segment.prosodyWeight)
  const averageBeat = averageWeight(input.segments, segment => segment.beatWeight)
  const averageMouth = averageWeight(input.segments, segment => segment.mouthWeight)
  const preferredVoiceMode = input.projectState?.preferredVoiceMode ?? null
  const preferredPacingMode = input.projectState?.preferredPacingMode ?? null

  let rateMultiplier = input.speechStyle.rateMultiplier
  let energyFactor = 1
  let cadenceFactor = 1

  if (preferredVoiceMode === 'lower-pressure') {
    rateMultiplier *= 0.95
    energyFactor *= 0.86
    cadenceFactor *= 0.9
  }
  else if (preferredVoiceMode === 'even') {
    rateMultiplier *= 0.98
    energyFactor *= 0.94
    cadenceFactor *= 0.96
  }

  if (preferredPacingMode === 'slower') {
    rateMultiplier *= 0.9
    cadenceFactor *= 0.88
  }
  else if (preferredPacingMode === 'natural') {
    rateMultiplier *= 0.97
    cadenceFactor *= 0.97
  }

  const energy = roundHundredths(
    0.46
    + input.performance.emphasis * 0.1
    + resolveDeliveryEnergyBoost(input.performance.delivery)
    + averageProsody * 0.16
    + averageBeat * 0.08
    + averageMouth * 0.06,
    0.62,
  ) * energyFactor
  const cadence = roundHundredths(
    0.4
    + averageProsody * 0.18
    + averageBeat * 0.22
    + resolveDeliveryCadenceBoost(input.performance.delivery)
    + (rateMultiplier - 1) * 0.3,
    0.5,
  ) * cadenceFactor

  return {
    pitchDelta: clampPitchDelta(input.speechStyle.pitchDelta),
    rateMultiplier: clampRateMultiplier(rateMultiplier),
    energy: roundHundredths(energy, 0.62),
    cadence: roundHundredths(cadence, 0.5),
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
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
}): AlicizationDigitalLifeLipSyncPlan {
  const mode = resolveLipSyncMode({
    performanceManifest: input.performanceManifest,
    reply: input.reply,
  })
  const rememberedSeamMoreRoom = hasRememberedSeamMoreRoomRendererHints(input.rendererHints)
  const preferredPauseMode = input.rendererHints?.preferredPauseMode ?? null
  const preferredLipsyncMode = input.rendererHints?.preferredLipsyncMode ?? null
  const averageMouth = averageWeight(input.segments, segment => segment.mouthWeight)
  const averageHold = averageWeight(input.segments, (segment) => {
    return clampRange((segment.emotionHoldMs ?? 160) / 720, 0, 1, 0.2)
  })
  const mouthWeight = rememberedSeamMoreRoom || preferredLipsyncMode === 'restrained'
    ? averageMouth * 0.88
    : averageMouth

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
      + mouthWeight * 0.34
      + input.voice.energy * 0.2
      + input.performance.emphasis * 0.06,
      0.88,
    ),
    continuityHoldMs: Math.round(clampRange(
      120
      + averageHold * 320
      + (preferredPauseMode === 'longer' ? 24 : 0)
      + (preferredLipsyncMode === 'restrained' ? 18 : 0),
      60,
      480,
      180,
    )),
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
  const intensityWeight = hasRememberedSeamMoreRoomRendererHints(input.rendererHints)
    ? input.intensityWeight * 0.82
    : input.intensityWeight

  return {
    emotion: input.emotion,
    facialCue: input.facialCue,
    expressionMode: input.expressionMode,
    intensity: roundHundredths(
      0.42
      + input.performance.emphasis * 0.08
      + intensityWeight * 0.28,
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
  const residentMode = input.rendererHints?.residentMode ?? null
  const intensityWeight = hasRememberedSeamMoreRoomRendererHints(input.rendererHints)
    ? input.intensityWeight * 0.78
    : input.intensityWeight
  const actionMode = residentMode === 'measured-return' || residentMode === 'repair-before-closeness'
    ? 'hold'
    : input.actionMode
  return {
    actionCue: input.actionCue,
    actionMode,
    intensity: input.actionCue
      ? roundHundredths(
          0.24
          + input.performance.emphasis * 0.1
          + intensityWeight * 0.42,
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
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  projectState?: AlicizationRuntimeProjectStateDigest | null
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
  const residentMode = input.segment.rendererHints?.residentMode ?? input.envelope.rendererHints?.residentMode ?? null
  const digitalLifeSpineProjectState = input.projectState ?? null
  const sameThreadMeasuredReturnClosureText = [
    digitalLifeSpineProjectState?.sameHerSelfLine,
    digitalLifeSpineProjectState?.emotionalClosureCue,
    digitalLifeSpineProjectState?.continuityCue,
    digitalLifeSpineProjectState?.nextClosureTarget,
    digitalLifeSpineProjectState?.preDialogueAwarenessLine,
    digitalLifeSpineProjectState?.sameHerDriftRisk,
  ].filter(Boolean).join(' ')
  const sameThreadMeasuredReturnProjectClosure
    = residentMode === 'measured-return'
      && digitalLifeSpineProjectState?.continuityArcStage === 'same-thread-continuation'
      && digitalLifeSpineProjectState?.continuityPreferredTiming === 'next-open-window'
      && (
        input.digitalLifeSpine?.proactive?.continuityRestraint === 'measured-return'
        || /same phase 1 digital life|same living line|continuous her|one continuous her|same callback seam|same thread|callback thread/iu.test(
          sameThreadMeasuredReturnClosureText,
        )
      )
  const voice: AlicizationDigitalLifeVoicePlan = {
    pitchDelta: input.baseVoice.pitchDelta,
    rateMultiplier: clampRateMultiplier(
      input.baseVoice.rateMultiplier
      * (1 + (input.segment.prosodyWeight - 0.5) * 0.12 + (input.segment.beatWeight - 0.4) * 0.06),
    ),
    energy: roundHundredths(
      sameThreadMeasuredReturnProjectClosure
        ? Math.max(
            0.49,
            input.baseVoice.energy * 0.82
            + clampUnit(input.segment.prosodyWeight) * 0.12
            + clampUnit(input.segment.gestureWeight) * 0.03
            + clampUnit(input.segment.beatWeight) * 0.03,
          )
        : input.baseVoice.energy * 0.62
          + clampUnit(input.segment.prosodyWeight) * 0.22
          + clampUnit(input.segment.gestureWeight) * 0.08
          + clampUnit(input.segment.beatWeight) * 0.08,
      input.baseVoice.energy,
    ),
    cadence: roundHundredths(
      sameThreadMeasuredReturnProjectClosure
        ? Math.max(
            0.49,
            input.baseVoice.cadence * 0.84
            + clampUnit(input.segment.prosodyWeight) * 0.08
            + clampUnit(input.segment.beatWeight) * 0.1,
          )
        : input.baseVoice.cadence * 0.58
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
      * (
        hasRememberedSeamMoreRoomRendererHints(input.segment.rendererHints)
          ? 0.78 + clampUnit(input.segment.mouthWeight ?? input.segment.prosodyWeight) * 0.3
          : 0.82 + clampUnit(input.segment.mouthWeight ?? input.segment.prosodyWeight) * 0.36
      ),
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
  const motor = deriveAlicizationDigitalLifeMotorPlan({
    action,
    emotion: face.emotion,
    face,
    lipSync,
    digitalLifeSpine: input.digitalLifeSpine,
    performance: input.envelope.performance,
    postureHint: input.envelope.postureHint,
    segmentWeights: {
      beat: input.segment.beatWeight,
      facial: input.segment.facialWeight,
      gesture: input.segment.gestureWeight,
      head: input.segment.headWeight,
      mouth: input.segment.mouthWeight,
    },
    voice,
    rendererHints: input.segment.rendererHints,
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
    motor,
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
  const projectState = input.projectState ?? input.digitalLifeSpine?.runtime?.projectState ?? null
  const voice = resolveVoicePlan({
    performance,
    segments: speechTimeline.segments,
    speechStyle: embodiment.speechStyle,
    projectState,
  })
  const lipSync = resolveLipSyncPlan({
    performance,
    performanceManifest: input.performanceManifest,
    segments: speechTimeline.segments,
    voice,
    reply: speechTimeline.reply,
    rendererHints: embodiment.rendererHints,
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
  const motor = deriveAlicizationDigitalLifeMotorPlan({
    action,
    emotion: face.emotion,
    face,
    lipSync,
    digitalLifeSpine: input.digitalLifeSpine,
    performance,
    postureHint: embodiment.postureHint,
    segmentWeights: {
      beat: averageWeight(speechTimeline.segments, segment => segment.beatWeight),
      facial: averageWeight(speechTimeline.segments, segment => segment.facialWeight),
      gesture: averageWeight(speechTimeline.segments, segment => segment.gestureWeight),
      head: averageWeight(speechTimeline.segments, segment => segment.headWeight),
      mouth: averageWeight(speechTimeline.segments, segment => segment.mouthWeight),
    },
    voice,
    rendererHints: embodiment.rendererHints,
  })
  const frames = speechTimeline.segments.map(segment => resolveFrame({
    segment,
    envelope: embodiment,
    performanceManifest: input.performanceManifest,
    baseVoice: voice,
    baseLipSync: lipSync,
    digitalLifeSpine: input.digitalLifeSpine,
    projectState,
  }))

  return {
    version: 'digital-life-v1',
    variationToken,
    emotion: embodiment.emotion,
    mode: resolveEnvelopeMode({
      rendererHints: embodiment.rendererHints,
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
    motor,
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
  const rendererHints = normalizeDigitalLifeRendererHints(candidate.rendererHints)
  const rawFrames = Array.isArray(candidate.frames) ? candidate.frames : []
  const frames = rawFrames
    .map((frame, index): AlicizationDigitalLifeFrame | null => {
      if (!frame || typeof frame !== 'object' || Array.isArray(frame))
        return null

      const item = frame as Record<string, unknown>
      const text = typeof item.text === 'string' ? item.text.trim() : ''
      const hasExplicitId = typeof item.id === 'string' && item.id.trim().length > 0
      const hasFrameTiming = Number.isFinite(Number(item.startOffset)) || Number.isFinite(Number(item.endOffset))
      const hasStructuredSettleTail
        = item.settleMode === 'hold'
          || item.settleMode === 'linger'
          || (
            item.lipSync
            && typeof item.lipSync === 'object'
            && !Array.isArray(item.lipSync)
            && (((item.lipSync as Record<string, unknown>).mode === 'closed')
              || Number((item.lipSync as Record<string, unknown>).continuityHoldMs) > 0)
          )
      if (!text && (!hasExplicitId || !hasFrameTiming || !hasStructuredSettleTail))
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
      const face = {
        emotion: normalizeAlicizationEmotion(faceRaw.emotion ?? normalizedEmotion).emotion,
        facialCue: normalizeCue(faceRaw.facialCue),
        expressionMode: normalizeDigitalLifeExpressionMode(faceRaw.expressionMode),
        intensity: roundHundredths(Number(faceRaw.intensity), 0.5),
        holdMs: Math.round(clampRange(Number(faceRaw.holdMs), 80, 960, 220)),
        rendererHints: normalizeDigitalLifeRendererHints(faceRaw.rendererHints),
      } satisfies AlicizationDigitalLifeFacePlan
      const action = {
        actionCue: normalizeCue(actionRaw.actionCue),
        actionMode: normalizeDigitalLifeActionMode(actionRaw.actionMode),
        intensity: roundHundredths(Number(actionRaw.intensity), 0.3),
        holdMs: Math.round(clampRange(Number(actionRaw.holdMs), 70, 720, 180)),
        rendererHints: normalizeDigitalLifeRendererHints(actionRaw.rendererHints),
      } satisfies AlicizationDigitalLifeActionPlan
      const lipSync = {
        mode: normalizeDigitalLifeLipSyncMode(lipSyncRaw.mode),
        visemeBias: roundHundredths(Number(lipSyncRaw.visemeBias), 0.66),
        energyBias: roundHundredths(Number(lipSyncRaw.energyBias), 0.34),
        mouthScale: clampFactor(Number(lipSyncRaw.mouthScale), 0.88),
        continuityHoldMs: Math.round(clampRange(Number(lipSyncRaw.continuityHoldMs), 60, 520, 180)),
      } satisfies AlicizationDigitalLifeLipSyncPlan
      const voice = {
        pitchDelta: clampPitchDelta(Number(voiceRaw.pitchDelta)),
        rateMultiplier: clampRateMultiplier(Number(voiceRaw.rateMultiplier)),
        energy: roundHundredths(Number(voiceRaw.energy), 0.5),
        cadence: roundHundredths(Number(voiceRaw.cadence), 0.5),
      } satisfies AlicizationDigitalLifeVoicePlan
      const fallbackMotor = deriveAlicizationDigitalLifeMotorPlan({
        action,
        emotion: face.emotion,
        face,
        lipSync,
        performance,
        voice,
      })

      return {
        id: hasExplicitId ? (item.id as string).trim() : `digital-life:${index}`,
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
        voice,
        lipSync,
        face,
        action,
        motor: normalizeStageEmbodimentMotorState(item.motor, fallbackMotor),
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
  const postureHint = postureHintRaw === 'attentive'
    || postureHintRaw === 'inspection'
    || postureHintRaw === 'hesitant'
    || postureHintRaw === 'concerned'
    || postureHintRaw === 'idle'
    ? postureHintRaw
    : 'idle'
  const voice = {
    pitchDelta: clampPitchDelta(Number(voiceRaw.pitchDelta ?? speechStyle.pitchDelta)),
    rateMultiplier: clampRateMultiplier(Number(voiceRaw.rateMultiplier ?? speechStyle.rateMultiplier)),
    energy: roundHundredths(Number(voiceRaw.energy), 0.5),
    cadence: roundHundredths(Number(voiceRaw.cadence), 0.5),
  } satisfies AlicizationDigitalLifeVoicePlan
  const lipSync = {
    mode: normalizeDigitalLifeLipSyncMode(lipSyncRaw.mode),
    visemeBias: roundHundredths(Number(lipSyncRaw.visemeBias), 0.66),
    energyBias: roundHundredths(Number(lipSyncRaw.energyBias), 0.34),
    mouthScale: clampFactor(Number(lipSyncRaw.mouthScale), 0.88),
    continuityHoldMs: Math.round(clampRange(Number(lipSyncRaw.continuityHoldMs), 60, 520, 180)),
  } satisfies AlicizationDigitalLifeLipSyncPlan
  const face = {
    emotion: normalizeAlicizationEmotion(faceRaw.emotion ?? normalizedEmotion).emotion,
    facialCue: normalizeCue(faceRaw.facialCue ?? performance.facialCue),
    expressionMode: normalizeDigitalLifeExpressionMode(faceRaw.expressionMode),
    intensity: roundHundredths(Number(faceRaw.intensity), 0.5),
    holdMs: Math.round(clampRange(Number(faceRaw.holdMs), 80, 960, 220)),
    rendererHints: normalizeDigitalLifeRendererHints(faceRaw.rendererHints) ?? rendererHints,
  } satisfies AlicizationDigitalLifeFacePlan
  const action = {
    actionCue: normalizeCue(actionRaw.actionCue ?? performance.actionCue),
    actionMode: normalizeDigitalLifeActionMode(actionRaw.actionMode),
    intensity: roundHundredths(Number(actionRaw.intensity), 0.3),
    holdMs: Math.round(clampRange(Number(actionRaw.holdMs), 70, 720, 180)),
    rendererHints: normalizeDigitalLifeRendererHints(actionRaw.rendererHints) ?? rendererHints,
  } satisfies AlicizationDigitalLifeActionPlan
  const fallbackMotor = deriveAlicizationDigitalLifeMotorPlan({
    action,
    emotion: face.emotion,
    face,
    lipSync,
    performance,
    postureHint,
    voice,
  })

  return {
    version: 'digital-life-v1',
    variationToken,
    emotion: normalizedEmotion,
    mode: normalizeDigitalLifeMode(candidate.mode),
    postureHint,
    performance: {
      ...performance,
      baseEmotion: normalizedEmotion,
      emotion: normalizedEmotion,
    },
    speechStyle,
    rendererHints,
    voice,
    lipSync,
    face,
    action,
    motor: normalizeStageEmbodimentMotorState(candidate.motor, fallbackMotor),
    frames,
  }
}
