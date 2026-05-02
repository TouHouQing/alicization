import type { CreateAlicizationOrganicMemoryAccessRuntimeOptions } from './runtime-organic-memory-access'
import type { CreateAlicizationOrganicMemoryPromptRuntimeOptions } from './runtime-organic-memory-prompt'

import { createAlicizationMemorySearchRuntime } from './memory-search-runtime'
import { createAlicizationRuntimeMemoryReconsolidation } from './runtime-memory-reconsolidation'
import { createAlicizationOrganicMemoryAccessRuntime } from './runtime-organic-memory-access'

type RuntimeMemorySearchSetup = Pick<CreateAlicizationOrganicMemoryPromptRuntimeOptions,
  | 'normalizeOrganicRecallText'
  | 'selectPromptActiveThoughts'
  | 'getLatestRelationshipDynamics'
  | 'retrieveMemoryFacts'
  | 'planRecollectionIntent'
  | 'planMemoryRecollection'
  | 'planRecollectionSpeech'
  | 'planMemoryDeliberation'
  | 'isPersonaResidueMemoryText'
>

export interface CreateAlicizationRuntimeMemoryRuntimeOptions {
  organicMemoryAccess: CreateAlicizationOrganicMemoryAccessRuntimeOptions
  organicMemorySearch: RuntimeMemorySearchSetup
  memoryReconsolidation: Parameters<typeof createAlicizationRuntimeMemoryReconsolidation>[0]
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
    recallConversationHistory,
    recallMemoryConsolidations,
    prewarmAccessibilityLine,
  } = organicMemoryAccessRuntime

  const memorySearchRuntime = createAlicizationMemorySearchRuntime({
    organicMemoryPrompt: {
      ...options.organicMemorySearch,
      getOrganicMemorySnapshot,
      recallSubconsciousFragmentsWithGovernor,
      recallEpisodicEventsWithGovernor,
      buildHostPersonModel,
      getMemoryTuningAdvice,
      recallConversationHistory,
      recallMemoryConsolidations,
    },
  })

  const memoryReconsolidationRuntime = createAlicizationRuntimeMemoryReconsolidation(
    options.memoryReconsolidation,
  )

  return {
    organicMemoryAccessRuntime,
    memorySearchRuntime,
    memoryReconsolidationRuntime,
    ...organicMemoryAccessRuntime,
    ...memorySearchRuntime,
    prewarmAccessibilityLine,
  }
}

export type AlicizationRuntimeMemoryRuntime = ReturnType<typeof createAlicizationRuntimeMemoryRuntime>
