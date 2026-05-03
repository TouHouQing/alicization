import type {
  AlicizationEpisodicEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationMemoryStats,
  AlicizationPersonStateEvolutionSummary,
  AlicizationRecallGovernorSnapshot,
} from '../../../shared/eventa'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { AlicizationMemoryRetrievalBudgetClass, AlicizationOrganicMemoryRuntimeStage } from './memory-retrieval-telemetry'
import type { OrganicMemoryPromptContext } from './runtime-soul'

export interface CreateAlicizationOrganicMemoryPromptRuntimeOptions {
  normalizeOrganicRecallText: (raw: string) => string
  selectPromptActiveThoughts: (input: {
    activeThoughts: OrganicMemoryPromptContext['activeThoughts']
    recallSeed: string
    recalledFragments: OrganicMemoryPromptContext['recalledFragments']
  }) => OrganicMemoryPromptContext['activeThoughts']
  getOrganicMemorySnapshot: () => Promise<{
    hostAttitude: string
    coreIncarnation: string
    activeThoughts: OrganicMemoryPromptContext['activeThoughts']
  }>
  getLatestRelationshipDynamics: () => Promise<OrganicMemoryPromptContext['relationshipDynamics']>
  retrieveMemoryFacts: (recallSeed: string, limit: number) => Promise<OrganicMemoryPromptContext['retrievedFacts']>
  recallSubconsciousFragmentsWithGovernor: (input: {
    text: string
    recalledFragmentCap?: number
    recalledFragmentSourceBudget?: AlicizationRecallGovernorSnapshot['recalledFragmentSourceBudget']
  }) => Promise<OrganicMemoryPromptContext['recalledFragments']>
  recallEpisodicEventsWithGovernor: (input: {
    recallSeed: string
    sessionId?: string | null
    turnId?: string | null
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
  }) => Promise<AlicizationEpisodicEventRecord[]>
  buildHostPersonModel: (input?: {
    now?: number
  }) => Promise<AlicizationHostPersonModelSnapshot | null>
  getMemoryStats?: () => Promise<AlicizationMemoryStats | null>
  getMemoryTuningAdvice?: () => Promise<AlicizationMemoryTuningAdvice | null>
  getPersonStateEvolutionSummary?: () => Promise<AlicizationPersonStateEvolutionSummary | null>
  recallConversationHistory: (input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
  }) => Promise<Array<{
    turnId: string | null
    sessionId: string
    userText: string
    assistantText: string
    createdAt: number
  }>>
  recallMemoryConsolidations: (input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
  }) => Promise<NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>>
  planRecollectionIntent?: (input: {
    recallSeed: string
    heuristicIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    hostAttitude: string
    activeThoughts: OrganicMemoryPromptContext['activeThoughts']
    hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
    relationshipDynamics?: OrganicMemoryPromptContext['relationshipDynamics']
  }) => Promise<OrganicMemoryPromptContext['recollectionIntent'] | null>
  planMemoryRecollection?: (input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  }) => Promise<NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null>
  planRecollectionSpeech?: (input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    recollectionPlan: NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  }) => Promise<NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']> | null>
  planMemoryDeliberation?: (input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    recollectionPlan: NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null
    recollectionSpeechPlan: NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']> | null
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  }) => Promise<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']> | null>
  isPersonaResidueMemoryText: (text: string) => boolean
  recordMemoryCandidateGenerationLatency?: (latencyMs: number) => Promise<void>
  recordMemoryPlannerLatency?: (latencyMs: number) => Promise<void>
  recordMemorySpeechPlanLatency?: (latencyMs: number) => Promise<void>
  recordOrganicMemoryStageLatency?: (input: {
    stage: AlicizationOrganicMemoryRuntimeStage
    latencyMs: number
  }) => Promise<void>
  recordOrganicMemoryStageBudget?: (input: {
    stage: AlicizationOrganicMemoryRuntimeStage
    budgetClass: AlicizationMemoryRetrievalBudgetClass
  }) => Promise<void>
}

export type RecollectionIntentSnapshot = NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
export type RecollectionPlanSnapshot = NonNullable<OrganicMemoryPromptContext['recollectionPlan']>
export type MemoryDeliberationSnapshot = NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>

export type MemoryClusterProbe = {
  id: string
  kind: 'consolidation' | 'window' | 'procedure' | 'episode' | 'conversation'
  clusterKey: string
  clusterSummary: string
  text: string
}

export type MemoryClusterState = {
  dominantClusterKey: string | null
  dominantSummary: string | null
  dominantScore: number
  runnerUpClusterKey: string | null
  runnerUpSummary: string | null
  runnerUpScore: number
  strongDominant: boolean
  ambiguous: boolean
  clusterScoreByKey: Map<string, number>
  competingVariants: Array<{
    id: string
    summary: string
    reason: string
  }>
}
