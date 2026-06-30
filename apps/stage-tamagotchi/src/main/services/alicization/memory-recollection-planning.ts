import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationRelationshipLineCandidate } from './memory-search-retrieval-operators'
import type { MemoryClusterState, RecollectionPlanSnapshot } from './runtime-organic-memory-prompt-types'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { buildMemoryRecollectionNarratives } from './memory-recollection-narratives'

export interface OrganicMemoryRecollectionPlanningStageInput {
  recallSeed: string
  activeRecollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
  relationshipLineCandidates: AlicizationRelationshipLineCandidate[]
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
  proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
  recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  clusterState?: MemoryClusterState | null
  digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  skipProviderPlanning?: boolean
  planMemoryRecollection?: ((input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) => Promise<NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null>) | undefined
  planRecollectionSpeech?: ((input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    recollectionPlan: NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) => Promise<NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']> | null>) | undefined
  planMemoryDeliberation?: ((input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    recollectionPlan: NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null
    recollectionSpeechPlan: NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']> | null
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) => Promise<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']> | null>) | undefined
  resolveRecollectionPlanSearch: (input: {
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
    recollectionPlan: RecollectionPlanSnapshot | null
    relationshipLineCandidates: AlicizationRelationshipLineCandidate[]
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
    clusterState?: MemoryClusterState | null
  }) => RecollectionPlanSnapshot | null
  recordMemoryPlannerLatency?: ((latencyMs: number) => Promise<void>) | undefined
  recordMemorySpeechPlanLatency?: ((latencyMs: number) => Promise<void>) | undefined
}

export async function resolveOrganicMemoryRecollectionPlanningStage(input: OrganicMemoryRecollectionPlanningStageInput) {
  const skipProviderPlanning = input.skipProviderPlanning === true
  const plannerStartedAt = Date.now()
  const rawRecollectionPlan = !skipProviderPlanning && input.activeRecollectionIntent && input.planMemoryRecollection && (
    input.consolidatedMemories.length > 0
    || input.recollectedWindows.length > 0
    || input.proceduralMemories.length > 0
    || input.recalledEpisodes.length > 0
    || input.recalledConversationHistory.length > 0
  )
    ? await input.planMemoryRecollection({
        recallSeed: input.recallSeed,
        recollectionIntent: input.activeRecollectionIntent,
        consolidatedMemories: input.consolidatedMemories,
        recollectedWindows: input.recollectedWindows,
        proceduralMemories: input.proceduralMemories,
        recalledEpisodes: input.recalledEpisodes,
        recalledConversationHistory: input.recalledConversationHistory,
        digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface ?? null,
      }).catch(() => null)
    : null
  const recollectionPlan = input.resolveRecollectionPlanSearch({
    recollectionIntent: input.activeRecollectionIntent,
    recollectionPlan: rawRecollectionPlan,
    relationshipLineCandidates: input.relationshipLineCandidates,
    consolidatedMemories: input.consolidatedMemories,
    recollectedWindows: input.recollectedWindows,
    proceduralMemories: input.proceduralMemories,
    recalledEpisodes: input.recalledEpisodes,
    recalledConversationHistory: input.recalledConversationHistory,
    clusterState: input.clusterState,
  })

  const selectedConsolidationIds = new Set(recollectionPlan?.selectedConsolidationIds ?? [])
  const selectedWindowIds = new Set(recollectionPlan?.selectedWindowIds ?? [])
  const selectedProceduralIds = new Set(recollectionPlan?.selectedProceduralIds ?? [])
  const selectedEpisodeIds = new Set(recollectionPlan?.selectedEpisodeIds ?? [])
  const selectedConversationTurnIds = new Set(recollectionPlan?.selectedConversationTurnIds ?? [])

  const plannedConsolidatedMemories = selectedConsolidationIds.size > 0
    ? input.consolidatedMemories.filter(item => selectedConsolidationIds.has(item.id))
    : input.consolidatedMemories
  const plannedWindows = selectedWindowIds.size > 0
    ? input.recollectedWindows.filter(item => selectedWindowIds.has(item.id))
    : input.recollectedWindows
  const plannedProceduralMemories = selectedProceduralIds.size > 0
    ? input.proceduralMemories.filter(item => selectedProceduralIds.has(item.id))
    : input.proceduralMemories
  const plannedEpisodes = selectedEpisodeIds.size > 0
    ? input.recalledEpisodes.filter(item => selectedEpisodeIds.has(item.id))
    : input.recalledEpisodes
  const plannedConversationHistory = selectedConversationTurnIds.size > 0
    ? input.recalledConversationHistory.filter(item => item.turnId && selectedConversationTurnIds.has(item.turnId))
    : input.recalledConversationHistory

  const recollectionNarratives = buildMemoryRecollectionNarratives({
    intent: input.activeRecollectionIntent,
    recollectedWindows: plannedWindows,
  })
  void input.recordMemoryPlannerLatency?.(Date.now() - plannerStartedAt).catch(() => {})

  const speechPlanStartedAt = Date.now()
  const recollectionSpeechPlan = !skipProviderPlanning && input.activeRecollectionIntent && input.planRecollectionSpeech && (
    plannedConsolidatedMemories.length > 0
    || plannedWindows.length > 0
    || plannedProceduralMemories.length > 0
    || plannedEpisodes.length > 0
    || plannedConversationHistory.length > 0
    || Boolean(recollectionPlan)
  )
    ? await input.planRecollectionSpeech({
        recallSeed: input.recallSeed,
        recollectionIntent: input.activeRecollectionIntent,
        recollectionPlan,
        consolidatedMemories: plannedConsolidatedMemories,
        recollectedWindows: plannedWindows,
        proceduralMemories: plannedProceduralMemories,
        recalledEpisodes: plannedEpisodes,
        recalledConversationHistory: plannedConversationHistory,
        digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface ?? null,
      }).catch(() => null)
    : null
  void input.recordMemorySpeechPlanLatency?.(Date.now() - speechPlanStartedAt).catch(() => {})

  const rawMemoryDeliberation = !skipProviderPlanning && input.activeRecollectionIntent && input.planMemoryDeliberation && (
    input.consolidatedMemories.length > 0
    || input.recollectedWindows.length > 0
    || input.proceduralMemories.length > 0
    || input.recalledEpisodes.length > 0
    || input.recalledConversationHistory.length > 0
    || Boolean(recollectionPlan)
  )
    ? await input.planMemoryDeliberation({
        recallSeed: input.recallSeed,
        recollectionIntent: input.activeRecollectionIntent,
        recollectionPlan,
        recollectionSpeechPlan,
        consolidatedMemories: input.consolidatedMemories,
        recollectedWindows: input.recollectedWindows,
        proceduralMemories: input.proceduralMemories,
        recalledEpisodes: input.recalledEpisodes,
        recalledConversationHistory: input.recalledConversationHistory,
        digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface ?? null,
      }).catch(() => null)
    : null

  return {
    recollectionPlan,
    plannedConsolidatedMemories,
    plannedWindows,
    plannedProceduralMemories,
    plannedEpisodes,
    plannedConversationHistory,
    recollectionNarratives,
    recollectionSpeechPlan,
    rawMemoryDeliberation,
  }
}
