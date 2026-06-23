import type { AlicizationKnowledgeAssimilationRuntime } from './knowledge-assimilation-runtime'
import type { CreateAlicizationOrganicMemoryAccessRuntimeOptions } from './runtime-organic-memory-access'
import type { CreateAlicizationOrganicMemoryPromptRuntimeOptions } from './runtime-organic-memory-prompt'

import { createAlicizationKnowledgeAssimilationRuntime } from './knowledge-assimilation-runtime'
import { createAlicizationMemorySearchRuntime } from './memory-search-runtime'
import { createAlicizationRuntimeMemoryReconsolidation } from './runtime-memory-reconsolidation'
import { createAlicizationOrganicMemoryAccessRuntime } from './runtime-organic-memory-access'

type RuntimeMemorySearchSetup = Pick<CreateAlicizationOrganicMemoryPromptRuntimeOptions, | 'normalizeOrganicRecallText'
  | 'selectPromptActiveThoughts'
  | 'getLatestRelationshipDynamics'
  | 'listMindTurnEvents'
  | 'listRelationshipOutcomes'
  | 'listMemoryReflections'
  | 'retrieveMemoryFacts'
  | 'planRecollectionIntent'
  | 'planMemoryRecollection'
  | 'planRecollectionSpeech'
  | 'planMemoryDeliberation'
  | 'isPersonaResidueMemoryText'
  | 'recordMemoryCandidateGenerationLatency'
  | 'recordMemoryPlannerLatency'
  | 'recordMemorySpeechPlanLatency'
  | 'recordOrganicMemoryStageLatency'
  | 'recordOrganicMemoryStageBudget'>

export interface CreateAlicizationRuntimeMemoryRuntimeOptions {
  organicMemoryAccess: CreateAlicizationOrganicMemoryAccessRuntimeOptions
  organicMemorySearch: RuntimeMemorySearchSetup
  memoryReconsolidation: Parameters<typeof createAlicizationRuntimeMemoryReconsolidation>[0]
  knowledgeAssimilation?: AlicizationKnowledgeAssimilationRuntime
}

export function createAlicizationRuntimeMemoryRuntime(
  options: CreateAlicizationRuntimeMemoryRuntimeOptions,
) {
  const organicMemoryAccessRuntime = createAlicizationOrganicMemoryAccessRuntime(
    options.organicMemoryAccess,
  )
  const {
    getOrganicMemorySnapshot,
    recallSubconsciousFragmentsWithGovernor,
    recallEpisodicEventsWithGovernor,
    buildHostPersonModel,
    getMemoryTuningAdvice,
    listRecentMemoryReflections,
    recallConversationHistory,
    recallMemoryConsolidations,
    prewarmAccessibilityLine,
    resolveTurnRetrievalPolicySnapshot,
  } = organicMemoryAccessRuntime

  const memorySearchRuntime = createAlicizationMemorySearchRuntime({
    organicMemoryPrompt: {
      ...options.organicMemorySearch,
      getOrganicMemorySnapshot,
      recallSubconsciousFragmentsWithGovernor,
      recallEpisodicEventsWithGovernor,
      buildHostPersonModel,
      getMemoryTuningAdvice,
      resolveTurnRetrievalPolicySnapshot,
      listMemoryReflections: async input => listRecentMemoryReflections(input.cardId ?? options.organicMemoryAccess.getActiveCardId(), input.limit),
      listRelationshipOutcomes: async input => options.organicMemoryAccess.listRelationshipOutcomes({
        cardId: input.cardId ?? options.organicMemoryAccess.getActiveCardId(),
        limit: input.limit,
        turnId: input.turnId,
      }),
      recallConversationHistory,
      recallMemoryConsolidations,
    },
  })

  const memoryReconsolidationRuntime = createAlicizationRuntimeMemoryReconsolidation(
    options.memoryReconsolidation,
  )
  const knowledgeAssimilationRuntime = options.knowledgeAssimilation
    ?? createAlicizationKnowledgeAssimilationRuntime()

  return {
    organicMemoryAccessRuntime,
    memorySearchRuntime,
    memoryReconsolidationRuntime,
    knowledgeAssimilationRuntime,
    ...organicMemoryAccessRuntime,
    ...memorySearchRuntime,
    prewarmAccessibilityLine,
  }
}

export type AlicizationRuntimeMemoryRuntime = ReturnType<typeof createAlicizationRuntimeMemoryRuntime>
