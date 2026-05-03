import type { AlicizationRecallGovernorSnapshot } from '../../../shared/eventa'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { OrganicMemoryPromptContext } from './runtime-soul'
import type { MemoryClusterProbe, MemoryClusterState } from './runtime-organic-memory-prompt-types'

export interface OrganicMemoryCandidateRankingHelpers {
  deriveMemoryClusterKey: (text: string) => string
  rankByHostSocialAffinity: <T>(input: {
    items: T[]
    toText: (item: T) => string
    recallSeed: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
    personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
    coreIncarnation: string
  }) => T[]
  rankBySceneMoodEmbodiedCarry: <T>(input: {
    items: T[]
    toText: (item: T) => string
    getSceneWeight?: ((item: T) => number | null) | undefined
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }) => T[]
  rankByBenchmarkTuningBias: <T>(input: {
    items: T[]
    tuningAdvice: AlicizationMemoryTuningAdvice | null
    mode: 'consolidation' | 'window' | 'procedure' | 'episode' | 'conversation'
    toText: (item: T) => string
    getProvenance?: ((item: T) => 'observed' | 'remembered' | 'dreamt' | 'inferred' | 'reconstructed' | null) | undefined
  }) => T[]
  rankByRecollectionAgendaAffinity: <T>(input: {
    items: T[]
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    toText: (item: T) => string
    getFacet?: ((item: T) => NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>['candidateEraFacets'][number]['facet'] | null) | undefined
    getAgeDays?: ((item: T) => number | null) | undefined
  }) => T[]
  analyzeMemoryClusters: (input: {
    probes: MemoryClusterProbe[]
    recallSeed: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
    personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
    coreIncarnation: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }) => MemoryClusterState
  rankByClusterDominance: <T>(input: {
    items: T[]
    clusterState: MemoryClusterState
    toClusterText: (item: T) => string
  }) => T[]
}

export interface OrganicMemoryCandidateRankingStageInput {
  helpers: OrganicMemoryCandidateRankingHelpers
  recallSeed: string
  activeRecollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
  personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
  coreIncarnation: string
  memoryTuningAdvice: AlicizationMemoryTuningAdvice | null
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
  proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
  recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
}

export function rankOrganicMemoryCandidatesStage(input: OrganicMemoryCandidateRankingStageInput) {
  const sociallyRankedConsolidatedMemories = input.helpers.rankByHostSocialAffinity({
    items: input.consolidatedMemories,
    toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
  })
  const carryRankedConsolidatedMemories = input.helpers.rankBySceneMoodEmbodiedCarry({
    items: sociallyRankedConsolidatedMemories,
    toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
    recallGovernor: input.recallGovernor ?? null,
  })
  const agendaRankedConsolidatedMemories = input.helpers.rankByBenchmarkTuningBias({
    items: input.helpers.rankByRecollectionAgendaAffinity({
      items: carryRankedConsolidatedMemories,
      recollectionIntent: input.activeRecollectionIntent,
      toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
      getFacet: item => item.facet ?? 'phase',
      getAgeDays: item => Math.max(0, (Date.now() - item.periodEndedAt) / (24 * 60 * 60 * 1000)),
    }),
    tuningAdvice: input.memoryTuningAdvice,
    mode: 'consolidation',
    toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
    getProvenance: item => item.dominantProvenance,
  })

  const sociallyRankedWindows = input.helpers.rankByHostSocialAffinity({
    items: input.recollectedWindows,
    toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
  })
  const carryRankedWindows = input.helpers.rankBySceneMoodEmbodiedCarry({
    items: sociallyRankedWindows,
    toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
    getSceneWeight: item => item.confidence,
    recallGovernor: input.recallGovernor ?? null,
  })
  const agendaRankedWindows = input.helpers.rankByBenchmarkTuningBias({
    items: input.helpers.rankByRecollectionAgendaAffinity({
      items: carryRankedWindows,
      recollectionIntent: input.activeRecollectionIntent,
      toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
      getFacet: () => 'window',
      getAgeDays: item => Math.max(0, (Date.now() - item.endedAt) / (24 * 60 * 60 * 1000)),
    }),
    tuningAdvice: input.memoryTuningAdvice,
    mode: 'window',
    toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
    getProvenance: item => item.dominantProvenance,
  })

  const sociallyRankedProceduralMemories = input.helpers.rankByHostSocialAffinity({
    items: input.proceduralMemories,
    toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
  })
  const carryRankedProceduralMemories = input.helpers.rankBySceneMoodEmbodiedCarry({
    items: sociallyRankedProceduralMemories,
    toText: item => [
      item.label,
      item.approach,
      ...(item.pitfalls ?? []),
      ...(item.cues ?? []),
    ].filter(Boolean).join(' '),
    recallGovernor: input.recallGovernor ?? null,
  })
  const agendaRankedProceduralMemoriesBase = input.helpers.rankByBenchmarkTuningBias({
    items: input.helpers.rankByRecollectionAgendaAffinity({
      items: carryRankedProceduralMemories,
      recollectionIntent: input.activeRecollectionIntent,
      toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
    }),
    tuningAdvice: input.memoryTuningAdvice,
    mode: 'procedure',
    toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
  })

  const sociallyRankedEpisodes = input.helpers.rankByHostSocialAffinity({
    items: input.recalledEpisodes,
    toText: item => [
      item.threadAnchor,
      item.whereSummary,
      item.whatHappened,
      item.relationshipMeaning,
      item.lesson,
      ...(item.tags ?? []),
    ].filter(Boolean).join(' '),
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
  })
  const carryRankedEpisodes = input.helpers.rankBySceneMoodEmbodiedCarry({
    items: sociallyRankedEpisodes,
    toText: item => [
      item.threadAnchor,
      item.whereSummary,
      item.whatHappened,
      item.felt,
      item.relationshipMeaning,
      item.lesson,
      ...(item.tags ?? []),
    ].filter(Boolean).join(' '),
    getSceneWeight: item => item.sceneAttachment,
    recallGovernor: input.recallGovernor ?? null,
  })
  const agendaRankedEpisodesBase = input.helpers.rankByBenchmarkTuningBias({
    items: input.helpers.rankByRecollectionAgendaAffinity({
      items: carryRankedEpisodes,
      recollectionIntent: input.activeRecollectionIntent,
      toText: item => [
        item.threadAnchor,
        item.whereSummary,
        item.whatHappened,
        item.relationshipMeaning,
        item.lesson,
        ...(item.tags ?? []),
      ].filter(Boolean).join(' '),
      getAgeDays: item => Math.max(0, (Date.now() - item.occurredAt) / (24 * 60 * 60 * 1000)),
    }),
    tuningAdvice: input.memoryTuningAdvice,
    mode: 'episode',
    toText: item => [
      item.threadAnchor,
      item.whereSummary,
      item.whatHappened,
      item.relationshipMeaning,
      item.lesson,
      ...(item.tags ?? []),
    ].filter(Boolean).join(' '),
    getProvenance: item => item.latestReconsolidation?.provenance ?? item.provenance,
  })

  const carryRankedConversationHistory = input.helpers.rankBySceneMoodEmbodiedCarry({
    items: input.recalledConversationHistory,
    toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
    recallGovernor: input.recallGovernor ?? null,
  })
  const agendaRankedConversationHistoryBase = input.helpers.rankByBenchmarkTuningBias({
    items: input.helpers.rankByRecollectionAgendaAffinity({
      items: carryRankedConversationHistory,
      recollectionIntent: input.activeRecollectionIntent,
      toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
      getAgeDays: item => Math.max(0, (Date.now() - item.createdAt) / (24 * 60 * 60 * 1000)),
    }),
    tuningAdvice: input.memoryTuningAdvice,
    mode: 'conversation',
    toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
    getProvenance: item => item.provenance,
  })

  const clusterState = input.helpers.analyzeMemoryClusters({
    probes: [
      ...agendaRankedConsolidatedMemories.slice(0, 4).map(item => ({
        id: item.id,
        kind: 'consolidation' as const,
        clusterKey: input.helpers.deriveMemoryClusterKey([item.periodKey, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' ')),
        clusterSummary: item.summary,
        text: [item.periodKey, item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
      })),
      ...agendaRankedWindows.slice(0, 4).map(item => ({
        id: item.id,
        kind: 'window' as const,
        clusterKey: input.helpers.deriveMemoryClusterKey([item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' ')),
        clusterSummary: item.summary,
        text: [item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
      })),
      ...agendaRankedProceduralMemoriesBase.slice(0, 4).map(item => ({
        id: item.id,
        kind: 'procedure' as const,
        clusterKey: input.helpers.deriveMemoryClusterKey([item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' ')),
        clusterSummary: item.approach,
        text: [
          item.label,
          item.approach,
          ...(item.pitfalls ?? []),
          ...(item.cues ?? []),
        ].filter(Boolean).join(' '),
      })),
      ...agendaRankedEpisodesBase.slice(0, 4).map(item => ({
        id: item.id,
        kind: 'episode' as const,
        clusterKey: input.helpers.deriveMemoryClusterKey([item.threadAnchor, item.sourceSummary, ...(item.tags ?? [])].filter(Boolean).join(' ')),
        clusterSummary: item.whatHappened,
        text: [
          item.threadAnchor,
          item.whereSummary,
          item.whatHappened,
          item.relationshipMeaning,
          item.lesson,
          item.sourceSummary,
          ...(item.tags ?? []),
        ].filter(Boolean).join(' '),
      })),
      ...agendaRankedConversationHistoryBase.slice(0, 4).map(item => ({
        id: item.turnId ?? `${item.sessionId}:${item.createdAt}`,
        kind: 'conversation' as const,
        clusterKey: input.helpers.deriveMemoryClusterKey([item.userText, item.assistantText].filter(Boolean).join(' ')),
        clusterSummary: [item.userText, item.assistantText].filter(Boolean).join(' | '),
        text: [item.userText, item.assistantText].filter(Boolean).join(' '),
      })),
    ].filter((item): item is MemoryClusterProbe => Boolean(item.clusterKey)),
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
    recallGovernor: input.recallGovernor ?? null,
  })

  return {
    clusterState,
    agendaRankedConsolidatedMemoriesClustered: input.helpers.rankByClusterDominance({
      items: agendaRankedConsolidatedMemories,
      clusterState,
      toClusterText: item => [item.periodKey, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
    }),
    agendaRankedWindowsClustered: input.helpers.rankByClusterDominance({
      items: agendaRankedWindows,
      clusterState,
      toClusterText: item => [item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
    }),
    agendaRankedProceduralMemories: input.helpers.rankByClusterDominance({
      items: agendaRankedProceduralMemoriesBase,
      clusterState,
      toClusterText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
    }),
    agendaRankedEpisodes: input.helpers.rankByClusterDominance({
      items: agendaRankedEpisodesBase,
      clusterState,
      toClusterText: item => [item.threadAnchor, item.sourceSummary, ...(item.tags ?? [])].filter(Boolean).join(' '),
    }),
    agendaRankedConversationHistory: input.helpers.rankByClusterDominance({
      items: agendaRankedConversationHistoryBase,
      clusterState,
      toClusterText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
    }),
  }
}
