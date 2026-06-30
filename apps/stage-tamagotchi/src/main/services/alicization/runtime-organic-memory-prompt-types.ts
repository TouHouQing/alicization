import type { AlicizationExecutionRuntimeMemoryClosureExecution } from '@proj-alicization/stage-shared'

import type {
  AlicizationEpisodicEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationMemoryStats,
  AlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord,
  AlicizationPersonStateEvolutionSummary,
  AlicizationRecallGovernorSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationTurnRetrievalPolicySnapshot } from './memory-accessibility-runtime'
import type { AlicizationMemoryRetrievalBudgetClass, AlicizationOrganicMemoryRuntimeStage } from './memory-retrieval-telemetry'
import type { AlicizationRelationshipLineCandidate } from './memory-search-retrieval-operators'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
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
    learningExecutionState?: OrganicMemoryPromptContext['learningExecutionState']
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
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  }) => Promise<AlicizationEpisodicEventRecord[]>
  buildHostPersonModel: (input?: {
    now?: number
  }) => Promise<AlicizationHostPersonModelSnapshot | null>
  getMemoryStats?: () => Promise<AlicizationMemoryStats | null>
  getMemoryTuningAdvice?: () => Promise<AlicizationMemoryTuningAdvice | null>
  getPersonStateEvolutionSummary?: () => Promise<AlicizationPersonStateEvolutionSummary | null>
  listMindTurnEvents?: (input: {
    decisionTraceId?: string
    turnId?: string
    kind?: AlicizationMindTurnEventKind
    limit?: number
  }) => Promise<AlicizationMindTurnEventRecord[]>
  listRelationshipOutcomes?: (input: {
    cardId?: string
    limit?: number
    turnId?: string
  }) => Promise<OrganicMemoryPromptContext['recentRelationshipOutcomes']>
  listMemoryReflections?: (input: {
    cardId?: string
    limit?: number
    turnId?: string
  }) => Promise<OrganicMemoryPromptContext['recentMemoryReflections']>
  recallConversationHistory: (input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
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
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  }) => Promise<NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>>
  resolveTurnRetrievalPolicySnapshot?: (input: {
    recallSeed: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
  }) => Promise<AlicizationTurnRetrievalPolicySnapshot>
  planRecollectionIntent?: (input: {
    recallSeed: string
    heuristicIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    hostAttitude: string
    activeThoughts: OrganicMemoryPromptContext['activeThoughts']
    hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
    relationshipDynamics?: OrganicMemoryPromptContext['relationshipDynamics']
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) => Promise<OrganicMemoryPromptContext['recollectionIntent'] | null>
  planMemoryRecollection?: (input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
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
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
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
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
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

export interface MemoryClusterProbe {
  id: string
  kind: 'consolidation' | 'window' | 'procedure' | 'episode' | 'conversation'
  clusterKey: string
  clusterSummary: string
  text: string
}

export interface MemoryClusterState {
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

export interface AlicizationOrganicMemoryPreludeResolution {
  stageLatencyMs: {
    prelude: number
  }
  retrievalPolicySnapshot: AlicizationTurnRetrievalPolicySnapshot
  budgetClass: AlicizationMemoryRetrievalBudgetClass
  snapshot: Awaited<ReturnType<CreateAlicizationOrganicMemoryPromptRuntimeOptions['getOrganicMemorySnapshot']>>
  relationshipDynamics: Awaited<ReturnType<CreateAlicizationOrganicMemoryPromptRuntimeOptions['getLatestRelationshipDynamics']>>
  hostPersonModel: Awaited<ReturnType<CreateAlicizationOrganicMemoryPromptRuntimeOptions['buildHostPersonModel']>>
  recallSeed: string
  retrievedFacts: OrganicMemoryPromptContext['retrievedFacts']
  recalledFragments: OrganicMemoryPromptContext['recalledFragments']
  recalledEpisodes: AlicizationEpisodicEventRecord[]
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  activeRecollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  memoryTuningAdvice: Awaited<ReturnType<NonNullable<CreateAlicizationOrganicMemoryPromptRuntimeOptions['getMemoryTuningAdvice']>>> | null
  personStateEvolutionSummary: Awaited<ReturnType<NonNullable<CreateAlicizationOrganicMemoryPromptRuntimeOptions['getPersonStateEvolutionSummary']>>> | null
  memoryStats: Awaited<ReturnType<NonNullable<CreateAlicizationOrganicMemoryPromptRuntimeOptions['getMemoryStats']>>> | null
  recentRelationshipOutcomes: OrganicMemoryPromptContext['recentRelationshipOutcomes']
  recentMemoryReflections: OrganicMemoryPromptContext['recentMemoryReflections']
  personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
  digitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  memoryClosureExecution: AlicizationExecutionRuntimeMemoryClosureExecution | null
  skipProviderRecollectionPlanning?: boolean
}

export interface AlicizationOrganicMemoryCandidateResolution {
  stageLatencyMs: {
    candidateGeneration: number
    candidateRanking: number
  }
  recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
  proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
  relationshipLineCandidates: AlicizationRelationshipLineCandidate[]
  clusterState: MemoryClusterState
  agendaRankedConsolidatedMemoriesClustered: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  agendaRankedWindowsClustered: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
  agendaRankedProceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
  agendaRankedEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  agendaRankedConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
}
