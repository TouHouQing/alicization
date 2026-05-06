import type { OrganicMemoryPromptContext } from '../runtime-soul'

export interface AlicizationMemorySpeechPostureArtifact {
  shouldSurface: boolean
  surfaceMode: string | null
  placement: string | null
  certainty: string | null
  styleNote: string | null
}

export function deriveAlicizationMemorySpeechPosture(input: {
  context: OrganicMemoryPromptContext
}): AlicizationMemorySpeechPostureArtifact {
  const speech = input.context.recollectionSpeechPlan ?? null
  return {
    shouldSurface: speech?.shouldSurface ?? false,
    surfaceMode: speech?.surfaceMode ?? null,
    placement: speech?.placement ?? null,
    certainty: speech?.certainty ?? null,
    styleNote: speech?.styleNote ?? null,
  }
}
