import type { OrganicMemoryPromptContext } from '../runtime-soul'
import type { AlicizationMemoryCandidateRetrievalArtifact } from './candidate-retrieval'

export interface AlicizationMemoryCandidateCompetitionArtifact {
  candidateCount: number
  selectedCandidateCount: number
  wrongThreadSuppressedCount: number
  conflictSeverity: 'none' | 'low' | 'medium' | 'high'
}

function countSelectedMemoryItems(context: OrganicMemoryPromptContext) {
  const deliberation = context.memoryDeliberation ?? null
  if (!deliberation)
    return 0
  return [
    ...(deliberation.selectedEraIds ?? []),
    ...(deliberation.selectedConsolidationIds ?? []),
    ...(deliberation.selectedWindowIds ?? []),
    ...(deliberation.selectedProcedureIds ?? []),
    ...(deliberation.selectedEpisodeIds ?? []),
    ...(deliberation.selectedConversationTurnIds ?? []),
    ...(deliberation.selectedBundles ?? []).map(item => item.id),
  ].filter(Boolean).length
}

export function deriveAlicizationMemoryCandidateCompetition(input: {
  context: OrganicMemoryPromptContext
  retrieval?: AlicizationMemoryCandidateRetrievalArtifact | null
}): AlicizationMemoryCandidateCompetitionArtifact {
  const candidateCount = input.retrieval?.candidates.length
    ?? input.context.retrievedFacts.length
    + input.context.recalledFragments.length
    + (input.context.recalledEpisodes?.length ?? 0)
    + (input.context.recalledConversationHistory?.length ?? 0)
    + (input.context.recollectedWindows?.length ?? 0)
    + (input.context.consolidatedMemories?.length ?? 0)
    + (input.context.proceduralMemories?.length ?? 0)
  const selectedCandidateCount = input.retrieval?.selectedCandidateIds.length
    ?? countSelectedMemoryItems(input.context)
  const wrongThreadSuppressedCount = input.context.memoryResolutionLedger?.suppressionTags
    ?.filter(tag => /wrong-thread|relationship-era-confusion|self-model-stale/u.test(tag))
    .length
    ?? 0
  return {
    candidateCount,
    selectedCandidateCount,
    wrongThreadSuppressedCount,
    conflictSeverity: input.context.memoryDeliberation?.conflictSeverity ?? 'none',
  }
}
