import type { AlicizationMemoryProvenance, AlicizationRecallGovernorSnapshot } from '../../../shared/eventa'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { OrganicMemoryPromptContext } from './runtime-soul'
import type { MemoryClusterProbe, MemoryClusterState } from './runtime-organic-memory-prompt-types'

import { isAlicizationWeakMemoryProvenance } from '@proj-alicization/stage-shared'

type NegativeRecallSuppressionTag = 'self-model-stale' | 'relationship-era-confusion'
type MemoryRankingProvenance = AlicizationMemoryProvenance

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function normalizeRankingText(raw: string) {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase()
}

function uniqueSuppressionVariants(values: MemoryClusterState['competingVariants']) {
  const result: MemoryClusterState['competingVariants'] = []
  const seen = new Set<string>()
  for (const value of values) {
    const key = `${value.id}:${value.summary}`
    if (seen.has(key))
      continue
    seen.add(key)
    result.push(value)
  }
  return result.slice(0, 8)
}

function deriveNegativeRecallSuppressionSignal(input: {
  text: string
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  tuningAdvice: AlicizationMemoryTuningAdvice | null
  mode: 'consolidation' | 'window' | 'episode' | 'conversation'
  provenance?: MemoryRankingProvenance | null
}) {
  const tuningAdvice = input.tuningAdvice ?? null
  if (!tuningAdvice)
    return { penalty: 0, tags: [] as NegativeRecallSuppressionTag[], reasons: [] as string[] }

  const staleSelfModelVetoRate = clamp01(tuningAdvice.staleSelfModelVetoRate ?? 0)
  const relationshipEraConfusionRate = clamp01(tuningAdvice.relationshipEraConfusionRate ?? 0)
  if (staleSelfModelVetoRate < 0.18 && relationshipEraConfusionRate < 0.18)
    return { penalty: 0, tags: [] as NegativeRecallSuppressionTag[], reasons: [] as string[] }

  const normalized = normalizeRankingText(input.text)
  const unreliableProvenance = isAlicizationWeakMemoryProvenance(input.provenance)
  const tags: NegativeRecallSuppressionTag[] = []
  const reasons: string[] = []
  let penalty = 0

  const selfModelTurn = input.recollectionIntent?.mode === 'autobiographical-history'
    || /\bself-era\b|\bself story\b|\bself-story\b|\bidentity\b|\bautobiographical\b|自我|身份|叙事/u.test(normalized)
  const staleSelfCue = /\bol(d|der)\b|\bprevious self\b|\bstale\b|\brevision\b|\brevised\b|\bidentity revision\b|\bolder self-story\b|旧理解|旧叙事|旧自我|之前那套|修正自己|身份修正/u.test(normalized)
  if (staleSelfModelVetoRate >= 0.18 && selfModelTurn && staleSelfCue) {
    const provenancePenalty = unreliableProvenance ? 0.08 : 0
    penalty += 0.16 + staleSelfModelVetoRate * 0.3 + provenancePenalty
    tags.push('self-model-stale')
    reasons.push('Stale self-model veto pressure is elevated, so an older self-story cluster was demoted before deliberation.')
  }

  const relationshipTurn = input.recollectionIntent?.mode === 'relationship-history'
    || /\brelationship\b|\bbond\b|\btrust\b|\brepair\b|\bboundary\b|\bdistance\b|\bcloseness\b|\brelationship-era\b|关系|信任|修复|边界|距离|亲密/u.test(normalized)
  const relationshipCue = /\brelationship\b|\brepair\b|\bboundary\b|\bdistance\b|\bspace\b|\broom\b|\bcloseness\b|\bwarmth\b|关系|修复|边界|距离|空间|靠近|亲密|温和/u.test(normalized)
  const phaseConfusionCue = /\bold\b|\bprevious\b|\banother repair\b|\bdifferent repair\b|\bwrong one\b|\bnot that time\b|\bsame wound\b|\bold wound\b|\bold hurt\b|\bphase\b|\bera\b|\bwarmth before room\b|\bclose before space\b|不是那次|记错|另一条|旧伤|关系阶段|修复期|先靠近|过早靠近/u.test(normalized)
  const reconstructedWarmthRisk = unreliableProvenance && /\bwarm\b|\bclose\b|\bcloseness\b|\btender\b|\bcompanionship\b|靠近|亲密|温和|陪伴/u.test(normalized)
  if (relationshipEraConfusionRate >= 0.18 && relationshipTurn && relationshipCue && (phaseConfusionCue || reconstructedWarmthRisk)) {
    penalty += 0.14 + relationshipEraConfusionRate * 0.28 + (unreliableProvenance ? 0.06 : 0)
    tags.push('relationship-era-confusion')
    reasons.push('Relationship-era confusion pressure is elevated, so a nearby relationship phase was separated before deliberation.')
  }

  return {
    penalty: clamp01(penalty),
    tags: [...new Set(tags)],
    reasons,
  }
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
      const signal = deriveNegativeRecallSuppressionSignal({
        text: input.toText(item),
        recollectionIntent: input.recollectionIntent,
        tuningAdvice: input.tuningAdvice,
        mode: input.mode,
        provenance: input.getProvenance?.(item) ?? null,
      })
      return {
        item,
        index,
        score: -signal.penalty,
      }
    })
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      return left.index - right.index
    })
    .map(entry => entry.item)
}

function buildNegativeRecallSuppressionVariants(input: {
  probes: MemoryClusterProbe[]
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  tuningAdvice: AlicizationMemoryTuningAdvice | null
}) {
  const variants: MemoryClusterState['competingVariants'] = []
  for (const probe of input.probes) {
    const signal = deriveNegativeRecallSuppressionSignal({
      text: [probe.clusterSummary, probe.text, probe.kind].filter(Boolean).join(' '),
      recollectionIntent: input.recollectionIntent,
      tuningAdvice: input.tuningAdvice,
      mode: probe.kind === 'consolidation' || probe.kind === 'window' || probe.kind === 'episode' || probe.kind === 'conversation'
        ? probe.kind
        : 'episode',
      provenance: null,
    })
    for (const tag of signal.tags) {
      variants.push({
        id: `suppression:${tag}`,
        summary: probe.clusterSummary,
        reason: signal.reasons[0] ?? 'Negative recall suppression demoted this nearby memory cluster before deliberation.',
      })
    }
  }
  return uniqueSuppressionVariants(variants)
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
    items: rankByNegativeRecallSuppression({
      items: input.helpers.rankByRecollectionAgendaAffinity({
        items: carryRankedConsolidatedMemories,
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
    items: rankByNegativeRecallSuppression({
      items: input.helpers.rankByRecollectionAgendaAffinity({
        items: carryRankedWindows,
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
    items: rankByNegativeRecallSuppression({
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

  const carryRankedConversationHistory = input.helpers.rankBySceneMoodEmbodiedCarry({
    items: input.recalledConversationHistory,
    toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
    recallGovernor: input.recallGovernor ?? null,
  })
  const agendaRankedConversationHistoryBase = input.helpers.rankByBenchmarkTuningBias({
    items: rankByNegativeRecallSuppression({
      items: input.helpers.rankByRecollectionAgendaAffinity({
        items: carryRankedConversationHistory,
        recollectionIntent: input.activeRecollectionIntent,
        toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
        getAgeDays: item => Math.max(0, (Date.now() - item.createdAt) / (24 * 60 * 60 * 1000)),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'conversation',
      toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
      getProvenance: item => item.provenance,
    }),
    tuningAdvice: input.memoryTuningAdvice,
    mode: 'conversation',
    toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
    getProvenance: item => item.provenance,
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
      ...agendaRankedConversationHistoryBase.slice(0, 4).map(item => ({
        id: item.turnId ?? `${item.sessionId}:${item.createdAt}`,
        kind: 'conversation' as const,
        clusterKey: input.helpers.deriveMemoryClusterKey([item.userText, item.assistantText].filter(Boolean).join(' ')),
        clusterSummary: [item.userText, item.assistantText].filter(Boolean).join(' | '),
        text: [item.userText, item.assistantText].filter(Boolean).join(' '),
      })),
    ].filter((item): item is MemoryClusterProbe => Boolean(item.clusterKey))
  const analyzedClusterState = input.helpers.analyzeMemoryClusters({
    probes: clusterProbes,
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
    recallGovernor: input.recallGovernor ?? null,
  })
  const clusterState: MemoryClusterState = {
    ...analyzedClusterState,
    competingVariants: uniqueSuppressionVariants([
      ...analyzedClusterState.competingVariants,
      ...buildNegativeRecallSuppressionVariants({
        probes: clusterProbes,
        recollectionIntent: input.activeRecollectionIntent,
        tuningAdvice: input.memoryTuningAdvice,
      }),
    ]),
  }

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
    agendaRankedConversationHistory: rankByNegativeRecallSuppression({
      items: input.helpers.rankByClusterDominance({
        items: agendaRankedConversationHistoryBase,
        clusterState,
        toClusterText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'conversation',
      toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
      getProvenance: item => item.provenance,
    }),
  }
}
