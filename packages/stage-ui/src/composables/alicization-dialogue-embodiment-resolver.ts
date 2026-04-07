import type {
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialogueEmbodimentPreviousState,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationDialoguePerformancePayload,
  AlicizationEmotion,
  AlicizationMindTurnGovernance,
} from '../stores/alicization-bridge'

import { resolveAlicizationDialogueEmbodiment } from '@proj-alicization/stage-shared'

export type DialogueEmbodimentPreviousState = AlicizationDialogueEmbodimentPreviousState

interface ResolveDialogueEmbodimentInput {
  candidateEmotion?: string
  candidatePerformance?: AlicizationDialoguePerformancePayload | null
  governance?: AlicizationMindTurnGovernance | null
  previous?: DialogueEmbodimentPreviousState | null
  reply: string
  thought?: string
  turnId?: string
}

interface ResolveDialogueEmbodimentResult {
  emotion: AlicizationEmotion
  performance: AlicizationDialoguePerformancePayload
  variationToken: string
}

export type DialogueEmbodimentEnvelope = AlicizationDialogueEmbodimentEnvelope

export function resolveDialogueEmbodimentPerformance(
  input: ResolveDialogueEmbodimentInput,
): ResolveDialogueEmbodimentResult {
  const resolved = resolveAlicizationDialogueEmbodiment(input)
  return {
    emotion: resolved.emotion,
    performance: resolved.performance,
    variationToken: resolved.variationToken,
  }
}
