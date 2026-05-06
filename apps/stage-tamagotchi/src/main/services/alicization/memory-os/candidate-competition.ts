import type { OrganicMemoryPromptContext } from '../runtime-soul'
import type { AlicizationMemoryCandidateRetrievalArtifact } from './candidate-retrieval'

export interface AlicizationMemoryCandidateCompetitionArtifact {
  candidateCount: number
  selectedCandidateCount: number
  wrongThreadSuppressedCount: number
  wrongThreadCandidateIds: string[]
  conflictCandidateIds: string[]
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
  const candidates = input.retrieval?.candidates ?? []
  const wrongThreadCandidateIds = candidates
    .filter((candidate) => {
      const relationshipThreadWeak = candidate.ranking.relationshipThreadMatch != null
        && candidate.ranking.relationshipThreadMatch < 0.4
      const conflictHeavy = candidate.ranking.conflictPenalty >= 0.4
      const clearlyOutrankedSelected = !candidate.selected
        && candidate.ranking.finalScore >= 0.58
        && candidates.some(other =>
          other.selected
          && other.id !== candidate.id
          && other.ranking.relationshipThreadMatch != null
          && candidate.ranking.relationshipThreadMatch != null
          && other.ranking.relationshipThreadMatch > candidate.ranking.relationshipThreadMatch
          && other.ranking.finalScore >= candidate.ranking.finalScore
        )
      return relationshipThreadWeak || conflictHeavy || clearlyOutrankedSelected
    })
    .map(candidate => candidate.id)
    .slice(0, 12)
  const conflictCandidateIds = candidates
    .filter(candidate => candidate.ranking.conflictPenalty > 0)
    .sort((left, right) => right.ranking.conflictPenalty - left.ranking.conflictPenalty)
    .map(candidate => candidate.id)
    .slice(0, 12)
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
  const ledgerWrongThreadSuppressedCount = input.context.memoryResolutionLedger?.suppressionTags
    ?.filter(tag => /wrong-thread|relationship-era-confusion|self-model-stale/u.test(tag))
    .length ?? 0
  const wrongThreadSuppressedCount = Math.max(
    ledgerWrongThreadSuppressedCount,
    wrongThreadCandidateIds.length,
  )
  return {
    candidateCount,
    selectedCandidateCount,
    wrongThreadSuppressedCount,
    wrongThreadCandidateIds,
    conflictCandidateIds,
    conflictSeverity: input.context.memoryDeliberation?.conflictSeverity ?? 'none',
  }
}
