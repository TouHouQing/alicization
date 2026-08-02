import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest,
  AlicizationResidentPerformanceSnapshot,
} from '@proj-alicization/stage-shared'

import type { AlicizationCurrentConsciousFrameSnapshot } from '../../../../shared/eventa'

import {
  createIdleStageEmbodimentMotorState,
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationPerformancePayload,
  normalizeStageEmbodimentMotorState,
} from '@proj-alicization/stage-shared'

export interface AlicizationRuntimeEmbodimentSeed {
  decisionTraceId?: string | null
  turnId: string
  replyText: string
  performance: AlicizationDialoguePerformancePayload
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
}

export interface BuildAlicizationRuntimeEmbodimentSeedInput {
  decisionTraceId?: string | null
  turnId: string
  reply: string
  performance: AlicizationDialoguePerformancePayload
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
}

function normalizeSeedText(raw: string, maxChars: number) {
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeSeedDecisionTraceId(raw: string | null | undefined) {
  if (typeof raw !== 'string')
    return null

  const normalized = normalizeSeedText(raw, 120)
  return normalized || null
}

function normalizeRuntimeEmbodimentSeedMotor(raw: unknown): AlicizationDigitalLifeEnvelope['motor'] {
  const fallbackMotor = createIdleStageEmbodimentMotorState()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return fallbackMotor

  const candidate = raw as Record<string, unknown>
  const alreadyCanonical
    = candidate.gaze && typeof candidate.gaze === 'object'
      && candidate.head && typeof candidate.head === 'object'
      && candidate.breath && typeof candidate.breath === 'object'
      && candidate.facial && typeof candidate.facial === 'object'
      && candidate.body && typeof candidate.body === 'object'

  if (alreadyCanonical)
    return normalizeStageEmbodimentMotorState(candidate, fallbackMotor)

  return normalizeStageEmbodimentMotorState({
    stillness: candidate.stillness,
    expressivity: candidate.expressivity,
    gaze: {
      focus: candidate.gazeFocus,
      stability: candidate.gazeStability,
      azimuth: candidate.gazeAzimuth,
      elevation: candidate.gazeElevation,
    },
    head: {
      yaw: candidate.headYaw,
      pitch: candidate.headPitch,
      roll: candidate.headRoll,
      nod: candidate.headNod,
    },
    breath: {
      amplitude: candidate.breathAmplitude,
      pace: candidate.breathPace,
    },
    facial: {
      eyeOpenness: candidate.eyeOpenness,
      browLift: candidate.browLift,
      browTension: candidate.browTension,
      cheekLift: candidate.cheekLift,
      mouthSpread: candidate.mouthSpread,
      mouthRound: candidate.mouthRound,
      jawOpenBias: candidate.jawOpenBias,
    },
    body: {
      sway: candidate.bodySway,
      lean: candidate.bodyLean,
      openness: candidate.bodyOpenness,
      settle: candidate.bodySettle,
    },
  }, fallbackMotor)
}

function normalizeRuntimeEmbodimentSeedDigitalLife(
  raw: AlicizationDigitalLifeEnvelope,
  fallbackEmotion: AlicizationDialoguePerformancePayload['baseEmotion'],
): AlicizationDigitalLifeEnvelope {
  const normalized = normalizeAlicizationDigitalLifeEnvelope(raw, fallbackEmotion)
  if (normalized)
    return normalized

  return {
    ...raw,
    motor: normalizeRuntimeEmbodimentSeedMotor(raw.motor),
    frames: Array.isArray(raw.frames)
      ? raw.frames.map(frame => ({
          ...frame,
          motor: normalizeRuntimeEmbodimentSeedMotor(frame.motor),
        }))
      : raw.frames,
  }
}

export function buildAlicizationRuntimeEmbodimentSeed(
  input: BuildAlicizationRuntimeEmbodimentSeedInput,
): AlicizationRuntimeEmbodimentSeed {
  // NOTICE:
  // In P0 this helper becomes the canonical local input shape for the director,
  // but it is not transported over shared IPC yet. The transported execution
  // authority remains `structured.embodimentScript`.
  return {
    decisionTraceId: normalizeSeedDecisionTraceId(input.decisionTraceId),
    turnId: normalizeSeedText(input.turnId, 120),
    replyText: normalizeSeedText(input.reply, 4000),
    performance: normalizeAlicizationPerformancePayload(
      input.performance,
      input.performance.baseEmotion,
    ),
    embodiment: input.embodiment,
    speechTimeline: input.speechTimeline,
    digitalLife: input.digitalLife
      ? normalizeRuntimeEmbodimentSeedDigitalLife(
          input.digitalLife,
          input.performance.baseEmotion,
        )
      : null,
    digitalLifeSpine: input.digitalLifeSpine,
    affectiveResidue: input.affectiveResidue ?? null,
    currentConsciousFrame: input.currentConsciousFrame ?? null,
    residentPerformance: input.residentPerformance ?? null,
  }
}
