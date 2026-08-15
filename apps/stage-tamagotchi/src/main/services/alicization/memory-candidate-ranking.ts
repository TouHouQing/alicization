import type { AlicizationMemoryProvenance, AlicizationRecallGovernorSnapshot } from '../../../shared/eventa'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { MemoryClusterProbe, MemoryClusterState } from './runtime-organic-memory-prompt-types'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { isAlicizationWeakMemoryProvenance } from '@proj-alicization/stage-shared'

type MemoryRankingProvenance = AlicizationMemoryProvenance

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function normalizeRankingText(raw: string) {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase()
}

const projectPreflightNamespace = ['project', 'preflight'].join('-')

function isProjectRecallSeedBlockStart(segment: string) {
  if (segment.toLowerCase().startsWith(`${projectPreflightNamespace}:`))
    return true
  return /^project:(?:identity:|current phase:|latest landed progress:|primary open loop:|next closure target:|continuity anchor:|status:|summary:|identity=|phase=|current_phase=|landed=|open=|next=|continuity(?:_anchor)?=|status=|summary=)/iu.test(segment)
}

function isSingleSegmentProjectRecallSeedBlock(segment: string) {
  return /^project-emotion:/iu.test(segment)
}

function isProjectRecallSeedBlockContinuation(segment: string) {
  return /^(?:phase\s*1\s*:|identity=|phase=|current_phase=|landed=|open=|next=|continuity(?:_anchor)?=|status=|summary=|current phase:|latest landed progress:|primary open loop:|next closure target:|continuity anchor:|status:|summary:)/iu.test(segment)
}

function normalizeRecallSeedForMemoryRanking(rawSeed: string) {
  const semanticSegments: string[] = []
  let insideProjectBlock = false

  for (const rawSegment of rawSeed.split(/\s+\|\s+|\r?\n+/u)) {
    const segment = rawSegment.trim()
    if (!segment)
      continue
    if (isSingleSegmentProjectRecallSeedBlock(segment)) {
      insideProjectBlock = false
      continue
    }
    if (isProjectRecallSeedBlockStart(segment)) {
      insideProjectBlock = true
      continue
    }
    if (insideProjectBlock && isProjectRecallSeedBlockContinuation(segment))
      continue

    insideProjectBlock = false
    semanticSegments.push(segment)
  }

  return semanticSegments.join(' | ')
}

function rankByLongHorizonMemoryAffinity<T>(input: {
  items: T[]
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
  toText: (item: T) => string
}) {
  const rememberedBoundary = normalizeRankingText(input.hostPersonModel?.preferredClosenessByContext[0]?.preference ?? '')
  const trustRationale = normalizeRankingText(input.hostPersonModel?.trustLadder.rationale ?? '')
  const relationshipTurn = input.recollectionIntent?.mode === 'relationship-history'
  const proceduralTurn = input.recollectionIntent?.mode === 'execution-procedure'
    || input.recollectionIntent?.mode === 'experience-pattern'

  if (!rememberedBoundary && !trustRationale)
    return input.items

  const overlapScore = (left: string, right: string) => {
    if (!left || !right)
      return 0
    const leftTokens = new Set(left.split(/[^a-z0-9\u4E00-\u9FFF]+/u).filter(Boolean))
    const rightTokens = new Set(right.split(/[^a-z0-9\u4E00-\u9FFF]+/u).filter(Boolean))
    if (leftTokens.size === 0 || rightTokens.size === 0)
      return 0
    let overlap = 0
    for (const token of leftTokens) {
      if (rightTokens.has(token))
        overlap += 1
    }
    return overlap / Math.max(leftTokens.size, rightTokens.size)
  }

  return [...input.items]
    .map((item, index) => {
      const text = normalizeRankingText(input.toText(item))
      const boundaryOverlap = overlapScore(text, rememberedBoundary)
      const trustOverlap = overlapScore(text, trustRationale)
      let score = 0

      if (relationshipTurn) {
        score += boundaryOverlap * 0.34
        score += trustOverlap * 0.24
      }
      if (proceduralTurn) {
        score += boundaryOverlap * 0.16
        score += trustOverlap * 0.14
      }
      return {
        item,
        index,
        score,
      }
    })
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      return left.index - right.index
    })
    .map(entry => entry.item)
}

function deriveNegativeRecallPenalty(input: {
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  tuningAdvice: AlicizationMemoryTuningAdvice | null
  provenance?: MemoryRankingProvenance | null
}) {
  const tuningAdvice = input.tuningAdvice ?? null
  if (!tuningAdvice)
    return 0

  const staleSelfModelVetoRate = clamp01(tuningAdvice.staleSelfModelVetoRate ?? 0)
  const relationshipEraConfusionRate = clamp01(tuningAdvice.relationshipEraConfusionRate ?? 0)
  if (staleSelfModelVetoRate < 0.18 && relationshipEraConfusionRate < 0.18)
    return 0

  const unreliableProvenance = isAlicizationWeakMemoryProvenance(input.provenance)
  if (!unreliableProvenance)
    return 0

  let penalty = 0
  if (staleSelfModelVetoRate >= 0.18 && input.recollectionIntent?.mode === 'autobiographical-history')
    penalty += 0.16 + staleSelfModelVetoRate * 0.3

  if (relationshipEraConfusionRate >= 0.18 && input.recollectionIntent?.mode === 'relationship-history')
    penalty += 0.14 + relationshipEraConfusionRate * 0.28

  return clamp01(penalty)
}

function rankByNegativeRecallSuppression<T>(input: {
  items: T[]
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  tuningAdvice: AlicizationMemoryTuningAdvice | null
  mode: 'consolidation' | 'window' | 'episode' | 'conversation'
  toText: (item: T) => string
  getProvenance?: ((item: T) => MemoryRankingProvenance | null) | undefined
}) {
  if (input.items.length <= 1 || !input.tuningAdvice)
    return input.items

  return [...input.items]
    .map((item, index) => {
      const penalty = deriveNegativeRecallPenalty({
        recollectionIntent: input.recollectionIntent,
        tuningAdvice: input.tuningAdvice,
        provenance: input.getProvenance?.(item) ?? null,
      })
      return {
        item,
        index,
        score: -penalty,
      }
    })
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      return left.index - right.index
    })
    .map(entry => entry.item)
}

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
    getProvenance?: ((item: T) => MemoryRankingProvenance | null) | undefined
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
}

export function rankOrganicMemoryCandidatesStage(input: OrganicMemoryCandidateRankingStageInput) {
  const rankingRecallSeed = normalizeRecallSeedForMemoryRanking(input.recallSeed)
  const sociallyRankedConsolidatedMemories = input.helpers.rankByHostSocialAffinity({
    items: input.consolidatedMemories,
    toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
    recallSeed: rankingRecallSeed,
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
    items: rankByNegativeRecallSuppression({
      items: input.helpers.rankByRecollectionAgendaAffinity({
        items: rankByLongHorizonMemoryAffinity({
          items: carryRankedConsolidatedMemories,
          recollectionIntent: input.activeRecollectionIntent,
          hostPersonModel: input.hostPersonModel,
          toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
        }),
        recollectionIntent: input.activeRecollectionIntent,
        toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
        getFacet: item => item.facet ?? 'phase',
        getAgeDays: item => Math.max(0, (Date.now() - item.periodEndedAt) / (24 * 60 * 60 * 1000)),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'consolidation',
      toText: item => [item.periodKey, item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
      getProvenance: item => item.dominantProvenance,
    }),
    tuningAdvice: input.memoryTuningAdvice,
    mode: 'consolidation',
    toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
    getProvenance: item => item.dominantProvenance,
  })

  const sociallyRankedWindows = input.helpers.rankByHostSocialAffinity({
    items: input.recollectedWindows,
    toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
    recallSeed: rankingRecallSeed,
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
    items: rankByNegativeRecallSuppression({
      items: input.helpers.rankByRecollectionAgendaAffinity({
        items: rankByLongHorizonMemoryAffinity({
          items: carryRankedWindows,
          recollectionIntent: input.activeRecollectionIntent,
          hostPersonModel: input.hostPersonModel,
          toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
        }),
        recollectionIntent: input.activeRecollectionIntent,
        toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
        getFacet: () => 'window',
        getAgeDays: item => Math.max(0, (Date.now() - item.endedAt) / (24 * 60 * 60 * 1000)),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'window',
      toText: item => [item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
      getProvenance: item => item.dominantProvenance,
    }),
    tuningAdvice: input.memoryTuningAdvice,
    mode: 'window',
    toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
    getProvenance: item => item.dominantProvenance,
  })

  const sociallyRankedProceduralMemories = input.helpers.rankByHostSocialAffinity({
    items: input.proceduralMemories,
    toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
    recallSeed: rankingRecallSeed,
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
      items: rankByLongHorizonMemoryAffinity({
        items: carryRankedProceduralMemories,
        recollectionIntent: input.activeRecollectionIntent,
        hostPersonModel: input.hostPersonModel,
        toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
      }),
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
    recallSeed: rankingRecallSeed,
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
    items: rankByNegativeRecallSuppression({
      items: input.helpers.rankByRecollectionAgendaAffinity({
        items: rankByLongHorizonMemoryAffinity({
          items: carryRankedEpisodes,
          recollectionIntent: input.activeRecollectionIntent,
          hostPersonModel: input.hostPersonModel,
          toText: item => [
            item.threadAnchor,
            item.whereSummary,
            item.whatHappened,
            item.relationshipMeaning,
            item.lesson,
            ...(item.tags ?? []),
          ].filter(Boolean).join(' '),
        }),
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
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'episode',
      toText: item => [
        item.threadAnchor,
        item.whereSummary,
        item.whatHappened,
        item.relationshipMeaning,
        item.lesson,
        item.sourceSummary,
        ...(item.tags ?? []),
      ].filter(Boolean).join(' '),
      getProvenance: item => item.latestReconsolidation?.provenance ?? item.provenance,
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

  const clusterProbes = [
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
  ].filter((item): item is MemoryClusterProbe => Boolean(item.clusterKey))
  const analyzedClusterState = input.helpers.analyzeMemoryClusters({
    probes: clusterProbes,
    recallSeed: rankingRecallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
    recallGovernor: input.recallGovernor ?? null,
  })
  const clusterState: MemoryClusterState = analyzedClusterState

  return {
    clusterState,
    agendaRankedConsolidatedMemoriesClustered: rankByNegativeRecallSuppression({
      items: input.helpers.rankByClusterDominance({
        items: agendaRankedConsolidatedMemories,
        clusterState,
        toClusterText: item => [item.periodKey, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'consolidation',
      toText: item => [item.periodKey, item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
      getProvenance: item => item.dominantProvenance,
    }),
    agendaRankedWindowsClustered: rankByNegativeRecallSuppression({
      items: input.helpers.rankByClusterDominance({
        items: agendaRankedWindows,
        clusterState,
        toClusterText: item => [item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'window',
      toText: item => [item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
      getProvenance: item => item.dominantProvenance,
    }),
    agendaRankedProceduralMemories: input.helpers.rankByClusterDominance({
      items: agendaRankedProceduralMemoriesBase,
      clusterState,
      toClusterText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
    }),
    agendaRankedEpisodes: rankByNegativeRecallSuppression({
      items: input.helpers.rankByClusterDominance({
        items: agendaRankedEpisodesBase,
        clusterState,
        toClusterText: item => [item.threadAnchor, item.sourceSummary, ...(item.tags ?? [])].filter(Boolean).join(' '),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'episode',
      toText: item => [
        item.threadAnchor,
        item.whereSummary,
        item.whatHappened,
        item.relationshipMeaning,
        item.lesson,
        item.sourceSummary,
        ...(item.tags ?? []),
      ].filter(Boolean).join(' '),
      getProvenance: item => item.latestReconsolidation?.provenance ?? item.provenance,
    }),
  }
}
