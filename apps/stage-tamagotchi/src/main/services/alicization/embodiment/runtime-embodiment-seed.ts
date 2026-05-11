import type {
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest,
} from '@proj-alicization/stage-shared'

import { normalizeAlicizationPerformancePayload } from '@proj-alicization/stage-shared'

export interface AlicizationRuntimeEmbodimentSeed {
  turnId: string
  replyText: string
  performance: AlicizationDialoguePerformancePayload
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
}

export interface BuildAlicizationRuntimeEmbodimentSeedInput {
  turnId: string
  reply: string
  performance: AlicizationDialoguePerformancePayload
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
}

function normalizeSeedText(raw: string, maxChars: number) {
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

export function buildAlicizationRuntimeEmbodimentSeed(
  input: BuildAlicizationRuntimeEmbodimentSeedInput,
): AlicizationRuntimeEmbodimentSeed {
  // NOTICE:
  // In P0 this helper becomes the canonical local input shape for the director,
  // but it is not transported over shared IPC yet. The transported execution
  // authority remains `structured.embodimentScript`.
  return {
    turnId: normalizeSeedText(input.turnId, 120),
    replyText: normalizeSeedText(input.reply, 4000),
    performance: normalizeAlicizationPerformancePayload(
      input.performance,
      input.performance.baseEmotion,
    ),
    embodiment: input.embodiment,
    speechTimeline: input.speechTimeline,
    digitalLife: input.digitalLife,
    digitalLifeSpine: input.digitalLifeSpine,
  }
}
