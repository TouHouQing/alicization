import type {
  AlicizationMemoryProvenance,
  AlicizationMemoryResolutionLedger,
  AlicizationRecallGovernorSnapshot,
} from '../../../shared/eventa'
import type { buildAlicizationMemoryTurnArtifact } from './memory-os/memory-turn-artifact'
import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { AlicizationProjectStateBrief } from './project-state-brief'
import type {
  AlicizationOrganicMemoryCandidateResolution,
  AlicizationOrganicMemoryPreludeResolution,
  CreateAlicizationOrganicMemoryPromptRuntimeOptions,
  MemoryClusterState,
  MemoryDeliberationSnapshot,
} from './runtime-organic-memory-prompt-types'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { deriveAlicizationRecallLatencyPolicy } from '@proj-alicization/stage-shared'

import { buildClaimEvidenceGraphFromMemoryFact } from './learning-claim-evidence-runtime'
import { buildAlicizationTurnRetrievalPolicySnapshot } from './memory-accessibility-runtime'
import { rankOrganicMemoryCandidatesStage } from './memory-candidate-ranking'
import {
  analyzeMemoryClusters as analyzeMemoryClustersHelper,
  buildMemoryPromptPersonStateProjection as buildMemoryPromptPersonStateProjectionHelper,
  deriveMemoryClusterKey as deriveMemoryClusterKeyHelper,
  rankByClusterDominance as rankByClusterDominanceHelper,
  rankByHostSocialAffinity as rankByHostSocialAffinityHelper,
  rankByRecollectionAgendaAffinity as rankByRecollectionAgendaAffinityHelper,
  rankBySceneMoodEmbodiedCarry as rankBySceneMoodEmbodiedCarryHelper,
} from './memory-os/context-ranking'
import {
  applyMemoryDeliberationToSpeechPlan,
  deriveMemoryDeliberationConflictState,
  deriveMemoryFollowUpAffordance,
  rankByEraAffinity,
  rankMemoryDeliberationBundles,
  rankMemoryDeliberationChains,
  resolveRecollectionPlanSearch,
  selectMemoryDeliberationEras,
} from './memory-os/planning'
import {
  buildAlicizationMemoryResolutionLedger,
  buildAlicizationMemoryStageReplay,
  enrichOrganicMemoryPromptContextWithSettlement,
} from './memory-os/runtime-settlement'
import { resolveOrganicMemoryRecollectionPlanningStage } from './memory-recollection-planning'
import {
  resolveMemorySearchPrelude,
  retrieveMemorySearchCandidates,
  runReconstructionAmbiguityRetrievalPass,
} from './memory-search-retrieval-operators'
import { buildMemorySituationCompetition } from './memory-situation-competition'
import { applyMemoryTuningAdviceToSpeechPlan } from './memory-tuning-advice'
import { planAlicizationRecall } from './recall-planner'
import { buildOrganicMemorySystemBlocks as buildOrganicMemoryPromptBlocks } from './runtime-organic-memory-prompt-blocks'
import { deriveSceneTriggeredRecollectionIntent, sanitizeOrganicMemoryText } from './runtime-organic-memory-search-prelude'
import { buildOrganicMemoryEvolutionState } from './runtime-organic-memory-self-evolution-integration'
import {
  buildProactiveRecallSeed as buildOrganicMemoryProactiveRecallSeed,
  buildPerformanceManifestSystemBlocks as buildPerformanceManifestBlocks,
  tuneOrganicMemoryPromptContextForExecutiveTurn as tuneExecutiveOrganicMemoryPromptContext,
} from './runtime-organic-memory-surface-planning'

export type { CreateAlicizationOrganicMemoryPromptRuntimeOptions } from './runtime-organic-memory-prompt-types'

function rankByBenchmarkTuningBias<T>(input: {
  items: T[]
  tuningAdvice: AlicizationMemoryTuningAdvice | null
  mode: 'consolidation' | 'window' | 'procedure' | 'episode' | 'conversation'
  toText: (item: T) => string
  getProvenance?: (item: T) => AlicizationMemoryProvenance | null
}) {
  const tuningAdvice = input.tuningAdvice ?? null
  if (!tuningAdvice || input.items.length <= 1)
    return input.items

  return [...input.items]
    .map((item, index) => {
      let score = (input.items.length - index) / Math.max(1, input.items.length)
      const provenance = input.getProvenance?.(item) ?? null
      const text = sanitizeOrganicMemoryText(input.toText(item), 260).toLowerCase()
      const relationshipCue = /relationship|bond|trust|care|boundary|space|repair|tone|distance|关系|信任|边界|空间|修复|语气|距离/u.test(text)
      const selfCue = /self|my trait|my habit|my pattern|自我|性格|习惯|我会|我总是/u.test(text)
      const worldCue = /api|schema|type|param|world fact|knowledge|规范|参数|类型|外部事实|知识/u.test(text)

      if (input.mode === 'procedure')
        score += tuningAdvice.retrievalAdjustments.proceduralBoost
      if (input.mode === 'consolidation' || input.mode === 'window')
        score += tuningAdvice.retrievalAdjustments.temporalWindowBias
      if ((input.mode === 'episode' || input.mode === 'conversation') && relationshipCue)
        score += tuningAdvice.retrievalAdjustments.relationshipBoost
      if ((input.mode === 'episode' || input.mode === 'conversation') && (provenance === 'reconstructed' || provenance === 'dreamt' || provenance === 'inferred' || provenance === 'shadow'))
        score -= tuningAdvice.retrievalAdjustments.wrongThreadPenalty
      if (
        tuningAdvice.focusDimensions.includes('learningRevisionDiscipline')
        && (input.mode === 'episode' || input.mode === 'conversation' || input.mode === 'consolidation')
        && (relationshipCue || selfCue)
      ) {
        score -= tuningAdvice.surfaceAdjustments.provenanceLabelBias * 0.08
        score -= tuningAdvice.personStateAdjustments.closenessCapBias * 0.06
      }
      if (
        tuningAdvice.focusDimensions.includes('worldModelValidationDiscipline')
        && (input.mode === 'conversation' || input.mode === 'consolidation' || input.mode === 'episode')
        && worldCue
      ) {
        score -= tuningAdvice.surfaceAdjustments.specificityClampBias * 0.12
      }

      return { item, score }
    })
    .sort((left, right) => right.score - left.score)
    .map(item => item.item)
}

function normalizeMemorySuppressionTag(raw: unknown) {
  if (typeof raw !== 'string')
    return null
  const tag = raw.replace(/^suppression:/, '').trim()
  if (tag.startsWith('self-model-stale'))
    return 'self-model-stale'
  if (tag.startsWith('relationship-era-confusion'))
    return 'relationship-era-confusion'
  return tag || null
}

function uniqueMemoryResolutionCandidates(
  candidates: AlicizationMemoryResolutionLedger['candidates'],
) {
  const result: AlicizationMemoryResolutionLedger['candidates'] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    const key = `${candidate.status}:${candidate.id}`
    if (seen.has(key))
      continue
    seen.add(key)
    result.push(candidate)
  }
  return result
}

function buildMemoryResolutionLedger(input: {
  producedAt: number
  clusterState: MemoryClusterState
  finalMemoryDeliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null
  finalRecollectionPlan: OrganicMemoryPromptContext['recollectionPlan'] | null
  finalRecollectionSpeechPlan: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null
}) {
  const candidates = uniqueMemoryResolutionCandidates([
    ...(input.clusterState.dominantClusterKey
      ? [{
          id: `cluster:${input.clusterState.dominantClusterKey}`,
          summary: input.clusterState.dominantSummary ?? '',
          score: input.clusterState.dominantScore,
          status: 'selected' as const,
          reason: input.finalMemoryDeliberation?.whyNow ?? input.finalRecollectionPlan?.rationale ?? null,
        }]
      : []),
    ...input.clusterState.competingVariants.map(item => ({
      id: item.id,
      summary: item.summary,
      score: input.clusterState.runnerUpClusterKey && item.id === `cluster:${input.clusterState.runnerUpClusterKey}`
        ? input.clusterState.runnerUpScore
        : null,
      status: 'rejected' as const,
      reason: item.reason,
    })),
    ...((input.finalMemoryDeliberation?.conflictVariants ?? [])
      .filter(item => String(item.id ?? '').startsWith('suppression:'))
      .map(item => ({
        id: item.id,
        summary: item.summary,
        score: null,
        status: 'rejected' as const,
        reason: item.reason ?? 'Suppressed by deliberation veto.',
      }))),
  ])
  const suppressionTags = [
    ...new Set(
      [
        ...(input.finalMemoryDeliberation?.conflictVariants ?? []).map(item => normalizeMemorySuppressionTag(String(item.id ?? ''))),
        ...candidates.map(item => normalizeMemorySuppressionTag(item.id)),
      ].filter((item): item is string => Boolean(item)),
    ),
  ].slice(0, 8)
  const ambiguityPosture = input.finalMemoryDeliberation?.ambiguityPosture ?? 'settled'
  const conflictSeverity = input.finalMemoryDeliberation?.conflictSeverity ?? 'none'
  const confidenceCandidates = [
    input.finalMemoryDeliberation?.confidence,
    input.finalRecollectionPlan?.confidence,
    input.clusterState.dominantScore,
  ].filter((value): value is number => Number.isFinite(value))
  const surfaceConfidence = confidenceCandidates.length > 0
    ? Math.max(0, Math.min(1, confidenceCandidates.reduce((sum, value) => sum + value, 0) / confidenceCandidates.length))
    : null
  const shouldStayInward = input.finalMemoryDeliberation?.surfacePolicy === 'internal-only'
  const shouldDelayUntilAfterPayoff = input.finalMemoryDeliberation?.followUpAffordance?.preferredTiming === 'after-payoff'
  const shouldLabelUncertainty = (
    ambiguityPosture === 'approximate'
    || ambiguityPosture === 'ambiguous'
    || conflictSeverity === 'medium'
    || conflictSeverity === 'high'
    || (input.finalMemoryDeliberation?.selectedEpisodes ?? []).some(item =>
      item.provenance === 'reconstructed'
      || item.provenance === 'dreamt'
      || item.provenance === 'inferred',
    )
  )
  const visibleCarryMode = shouldStayInward
    ? 'withhold' as const
    : input.finalRecollectionSpeechPlan?.shouldSurface === true
      ? (
          input.finalRecollectionSpeechPlan.surfaceMode === 'answer-anchoring'
          || input.finalRecollectionSpeechPlan.surfaceMode === 'relationship-continuity'
            ? 'explicit-recall'
            : input.finalRecollectionSpeechPlan.surfaceMode === 'gist-first'
              ? 'gist-only'
              : 'tone-carry'
        )
      : input.finalRecollectionSpeechPlan?.placement === 'inside-payoff'
        || input.finalRecollectionSpeechPlan?.placement === 'after-payoff'
        ? 'gist-only'
        : 'tone-carry'
  const closureState = shouldStayInward
    ? (
        confidenceCandidates.length > 0 || candidates.length > 0
          ? 'inward-only' as const
          : 'no-recall' as const
      )
    : conflictSeverity === 'high'
      || ambiguityPosture === 'ambiguous'
      ? 'conflicted-recall' as const
      : shouldLabelUncertainty
        ? 'approximate-recall' as const
        : candidates.some(item => item.status === 'selected')
          ? 'grounded-recall' as const
          : 'no-recall' as const
  const retrievalQuality = !candidates.some(item => item.status === 'selected')
    ? 'insufficient' as const
    : surfaceConfidence == null
      ? 'medium' as const
      : surfaceConfidence >= 0.8
        && conflictSeverity === 'none'
        && ambiguityPosture === 'settled'
        ? 'high' as const
        : surfaceConfidence >= 0.55
          && conflictSeverity !== 'high'
          ? 'medium' as const
          : 'low' as const

  return {
    version: 'memory-resolution-ledger-v1',
    producedAt: input.producedAt,
    dominantClusterId: input.clusterState.dominantClusterKey ? `cluster:${input.clusterState.dominantClusterKey}` : null,
    dominantClusterSummary: input.clusterState.dominantSummary ?? null,
    competingClusterId: input.clusterState.runnerUpClusterKey ? `cluster:${input.clusterState.runnerUpClusterKey}` : null,
    competingClusterSummary: input.clusterState.runnerUpSummary ?? null,
    candidates,
    selectedCandidates: candidates.filter(item => item.status === 'selected'),
    rejectedCandidates: candidates.filter(item => item.status === 'rejected'),
    finalSurfacePolicy: input.finalMemoryDeliberation?.surfacePolicy ?? null,
    shouldStayInward,
    shouldDelayUntilAfterPayoff,
    stableCoreOnly: (input.finalMemoryDeliberation?.unsafeDetails?.length ?? 0) > 0 || (input.finalMemoryDeliberation?.stableCore?.length ?? 0) > 0,
    suppressionTags,
    closureState,
    surfaceConfidence,
    shouldLabelUncertainty,
    visibleCarryMode,
    conflictPressure: conflictSeverity,
    retrievalQuality,
    finalRationale: input.finalMemoryDeliberation?.whyNow ?? input.finalRecollectionPlan?.rationale ?? null,
  } satisfies AlicizationMemoryResolutionLedger
}

export function createAlicizationOrganicMemoryPromptRuntime(options: CreateAlicizationOrganicMemoryPromptRuntimeOptions) {
  const {
    normalizeOrganicRecallText,
    selectPromptActiveThoughts,
    getOrganicMemorySnapshot,
    getLatestRelationshipDynamics,
    retrieveMemoryFacts,
    recallSubconsciousFragmentsWithGovernor,
    recallEpisodicEventsWithGovernor,
    buildHostPersonModel,
    getMemoryStats,
    recallConversationHistory,
    recallMemoryConsolidations,
    getMemoryTuningAdvice,
    getPersonStateEvolutionSummary,
    listRelationshipOutcomes,
    listMemoryReflections,
    planRecollectionIntent,
    planMemoryRecollection,
    planRecollectionSpeech,
    planMemoryDeliberation,
    isPersonaResidueMemoryText,
    recordMemoryCandidateGenerationLatency,
    recordMemoryPlannerLatency,
    recordMemorySpeechPlanLatency,
    recordOrganicMemoryStageLatency,
    recordOrganicMemoryStageBudget,
    resolveTurnRetrievalPolicySnapshot,
  } = options

  function buildOrganicMemorySystemBlocks(
    context: OrganicMemoryPromptContext,
    memoryTurnArtifact?: ReturnType<typeof buildAlicizationMemoryTurnArtifact> | null,
  ) {
    const startedAt = Date.now()
    const blocks = buildOrganicMemoryPromptBlocks(context, memoryTurnArtifact)
    void recordOrganicMemoryStageBudget?.({
      stage: 'prompt-blocks',
      budgetClass: 'realtime-reply',
    }).catch(() => {})
    void recordOrganicMemoryStageLatency?.({
      stage: 'prompt-blocks',
      latencyMs: Date.now() - startedAt,
    }).catch(() => {})
    return blocks
  }

  function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
    const result: string[] = []
    for (const value of values) {
      const normalized = String(value ?? '').trim().replace(/\s+/g, ' ')
      if (!normalized)
        continue
      if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
        continue
      result.push(normalized)
      if (result.length >= maxItems)
        break
    }
    return result
  }
  async function resolveOrganicMemoryPrelude(input: {
    recallSeed?: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    sessionId?: string | null
    turnId?: string | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
  }): Promise<AlicizationOrganicMemoryPreludeResolution> {
    const budgetClass = input.budgetClass ?? 'realtime-reply'
    const retrievalPolicySnapshot = await (
      resolveTurnRetrievalPolicySnapshot
      ?? (async (innerInput: {
        recallSeed: string
        recallGovernor?: AlicizationRecallGovernorSnapshot | null
        budgetClass?: AlicizationMemoryRetrievalBudgetClass
      }) => buildAlicizationTurnRetrievalPolicySnapshot({
        recallSeed: innerInput.recallSeed,
        recallGovernor: innerInput.recallGovernor ?? null,
        budgetClass: innerInput.budgetClass,
        telemetry: null,
        tuningAdvice: null,
      }))
    )({
      recallSeed: input.recallSeed ?? input.recallGovernor?.recallSeed ?? '',
      recallGovernor: input.recallGovernor ?? null,
      budgetClass,
    })
    const preludeStartedAt = Date.now()
    void recordOrganicMemoryStageBudget?.({
      stage: 'search-prelude',
      budgetClass: retrievalPolicySnapshot.plan.budgetClass,
    }).catch(() => {})
    const prelude = await resolveMemorySearchPrelude({
      access: {
        getOrganicMemorySnapshot,
        getLatestRelationshipDynamics,
        retrieveMemoryFacts,
        recallSubconsciousFragmentsWithGovernor,
        recallEpisodicEventsWithGovernor,
        buildHostPersonModel,
        getMemoryTuningAdvice,
      },
      policy: {
        planRecollectionIntent,
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText,
      },
      recallSeed: input.recallSeed,
      recallGovernor: input.recallGovernor ?? null,
      sessionId: input.sessionId ?? null,
      turnId: input.turnId ?? null,
      budgetClass: retrievalPolicySnapshot.plan.budgetClass,
      retrievalPolicySnapshot,
    })
    void recordOrganicMemoryStageLatency?.({
      stage: 'search-prelude',
      latencyMs: Date.now() - preludeStartedAt,
    }).catch(() => {})
    const [
      personStateEvolutionSummary,
      memoryStats,
      recentRelationshipOutcomes,
      recentMemoryReflections,
    ] = await Promise.all([
      getPersonStateEvolutionSummary?.().catch(() => null) ?? Promise.resolve(null),
      getMemoryStats?.().catch(() => null) ?? Promise.resolve(null),
      listRelationshipOutcomes?.({
        limit: 8,
        turnId: input.turnId ?? undefined,
      }).catch(() => []) ?? Promise.resolve([]),
      listMemoryReflections?.({
        limit: 8,
        turnId: input.turnId ?? undefined,
      }).catch(() => []) ?? Promise.resolve([]),
    ])
    const personStateProjection = buildMemoryPromptPersonStateProjectionHelper({
      recallSeed: prelude.recallSeed,
      recollectionIntent: prelude.activeRecollectionIntent,
      hostPersonModel: prelude.hostPersonModel,
      personStateEvolutionSummary,
    })
    return {
      stageLatencyMs: {
        prelude: Date.now() - preludeStartedAt,
      },
      retrievalPolicySnapshot,
      budgetClass,
      ...prelude,
      personStateEvolutionSummary,
      memoryStats,
      recentRelationshipOutcomes,
      recentMemoryReflections,
      personStateProjection,
    }
  }

  async function resolveOrganicMemoryCandidates(input: {
    prelude: AlicizationOrganicMemoryPreludeResolution
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }): Promise<AlicizationOrganicMemoryCandidateResolution> {
    const candidateGenerationStartedAt = Date.now()
    void recordOrganicMemoryStageBudget?.({
      stage: 'candidate-generation',
      budgetClass: input.prelude.retrievalPolicySnapshot.plan.budgetClass,
    }).catch(() => {})
    const retrieved = await retrieveMemorySearchCandidates({
      access: {
        recallConversationHistory,
        recallMemoryConsolidations,
      },
      recallSeed: input.prelude.recallSeed,
      recollectionIntent: input.prelude.activeRecollectionIntent ?? null,
      recalledEpisodes: input.prelude.recalledEpisodes,
      budgetClass: input.prelude.retrievalPolicySnapshot.plan.budgetClass,
      retrievalPolicySnapshot: input.prelude.retrievalPolicySnapshot,
    })
    void recordMemoryCandidateGenerationLatency?.(Date.now() - candidateGenerationStartedAt).catch(() => {})
    void recordOrganicMemoryStageLatency?.({
      stage: 'candidate-generation',
      latencyMs: Date.now() - candidateGenerationStartedAt,
    }).catch(() => {})
    const candidateRankingStartedAt = Date.now()
    void recordOrganicMemoryStageBudget?.({
      stage: 'candidate-ranking',
      budgetClass: input.prelude.retrievalPolicySnapshot.plan.budgetClass,
    }).catch(() => {})
    const ranked = rankOrganicMemoryCandidatesStage({
      helpers: {
        deriveMemoryClusterKey: text => deriveMemoryClusterKeyHelper(normalizeOrganicRecallText, text),
        rankByHostSocialAffinity: input => rankByHostSocialAffinityHelper({
          normalizeOrganicRecallText,
          ...input,
        }),
        rankBySceneMoodEmbodiedCarry: input => rankBySceneMoodEmbodiedCarryHelper({
          normalizeOrganicRecallText,
          ...input,
        }),
        rankByBenchmarkTuningBias,
        rankByRecollectionAgendaAffinity: input => rankByRecollectionAgendaAffinityHelper({
          normalizeOrganicRecallText,
          ...input,
        }),
        analyzeMemoryClusters: input => analyzeMemoryClustersHelper({
          normalizeOrganicRecallText,
          ...input,
        }),
        rankByClusterDominance: input => rankByClusterDominanceHelper({
          normalizeOrganicRecallText,
          ...input,
        }),
      },
      recallSeed: input.prelude.recallSeed,
      activeRecollectionIntent: input.prelude.activeRecollectionIntent,
      hostPersonModel: input.prelude.hostPersonModel,
      personStateProjection: input.prelude.personStateProjection,
      coreIncarnation: input.prelude.snapshot.coreIncarnation,
      memoryTuningAdvice: input.prelude.memoryTuningAdvice,
      recallGovernor: input.recallGovernor ?? null,
      consolidatedMemories: retrieved.consolidatedMemories,
      recollectedWindows: retrieved.recollectedWindows,
      proceduralMemories: retrieved.proceduralMemories,
      recalledEpisodes: input.prelude.recalledEpisodes,
      recalledConversationHistory: retrieved.recalledConversationHistory,
    })
    void recordOrganicMemoryStageLatency?.({
      stage: 'candidate-ranking',
      latencyMs: Date.now() - candidateRankingStartedAt,
    }).catch(() => {})
    return {
      stageLatencyMs: {
        candidateGeneration: Date.now() - candidateGenerationStartedAt,
        candidateRanking: Date.now() - candidateRankingStartedAt,
      },
      ...retrieved,
      ...ranked,
    }
  }

  async function resolveOrganicMemoryPromptContext(options?: {
    recallSeed?: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    sessionId?: string | null
    turnId?: string | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    projectStateBrief?: AlicizationProjectStateBrief | null
  }): Promise<OrganicMemoryPromptContext> {
    const prelude = await resolveOrganicMemoryPrelude({
      recallSeed: options?.recallSeed,
      recallGovernor: options?.recallGovernor ?? null,
      sessionId: options?.sessionId ?? null,
      turnId: options?.turnId ?? null,
      budgetClass: options?.budgetClass,
    })
    const {
      budgetClass,
      snapshot,
      relationshipDynamics,
      hostPersonModel,
      recallSeed,
      retrievedFacts,
      recalledFragments,
      recalledEpisodes,
      recollectionIntent,
      activeRecollectionIntent,
      memoryTuningAdvice,
      personStateEvolutionSummary,
      memoryStats,
      recentRelationshipOutcomes,
      recentMemoryReflections,
      personStateProjection,
    } = prelude
    const {
      recalledConversationHistory,
      consolidatedMemories,
      recollectedWindows,
      proceduralMemories,
      relationshipLineCandidates,
      clusterState,
      agendaRankedConsolidatedMemoriesClustered,
      agendaRankedWindowsClustered,
      agendaRankedProceduralMemories,
      agendaRankedEpisodes,
      agendaRankedConversationHistory,
      stageLatencyMs: candidateStageLatencyMs,
    } = await resolveOrganicMemoryCandidates({
      prelude,
      recallGovernor: options?.recallGovernor ?? null,
    })
    void recordOrganicMemoryStageBudget?.({
      stage: 'recollection-planning',
      budgetClass,
    }).catch(() => {})
    const recollectionPlanningStartedAt = Date.now()
    const {
      recollectionPlan,
      plannedConsolidatedMemories,
      plannedWindows,
      plannedProceduralMemories,
      plannedEpisodes,
      plannedConversationHistory,
      recollectionNarratives,
      recollectionSpeechPlan,
      rawMemoryDeliberation,
    } = await resolveOrganicMemoryRecollectionPlanningStage({
      recallSeed,
      activeRecollectionIntent: activeRecollectionIntent ?? null,
      relationshipLineCandidates,
      consolidatedMemories: agendaRankedConsolidatedMemoriesClustered,
      recollectedWindows: agendaRankedWindowsClustered,
      proceduralMemories: agendaRankedProceduralMemories,
      recalledEpisodes: agendaRankedEpisodes,
      recalledConversationHistory: agendaRankedConversationHistory,
      clusterState,
      planMemoryRecollection,
      planRecollectionSpeech,
      planMemoryDeliberation,
      resolveRecollectionPlanSearch,
      recordMemoryPlannerLatency,
      recordMemorySpeechPlanLatency,
    })
    void recordOrganicMemoryStageLatency?.({
      stage: 'recollection-planning',
      latencyMs: Date.now() - recollectionPlanningStartedAt,
    }).catch(() => {})
    const selectedConsolidationIds = new Set(recollectionPlan?.selectedConsolidationIds ?? [])
    const selectedWindowIds = new Set(recollectionPlan?.selectedWindowIds ?? [])
    const selectedProceduralIds = new Set(recollectionPlan?.selectedProceduralIds ?? [])
    const selectedEpisodeIds = new Set(recollectionPlan?.selectedEpisodeIds ?? [])
    const selectedConversationTurnIds = new Set(recollectionPlan?.selectedConversationTurnIds ?? [])
    const initialReconstructionPass = runReconstructionAmbiguityRetrievalPass({
      episodes: agendaRankedEpisodes,
      recalledConversationHistory: agendaRankedConversationHistory,
      competingVariants: clusterState.competingVariants,
    })
    const {
      knowledgeEvidence,
      selfEvolution,
      affectiveResidue,
    } = buildOrganicMemoryEvolutionState({
      producedAt: Date.now(),
      retrievedFacts,
      proceduralMemories: agendaRankedProceduralMemories,
      personStateEvolutionSummary,
      hostPersonModel,
      memoryStats,
      recollectionIntent: recollectionIntent ?? null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      personStateProjection: personStateProjection ?? null,
      recallLatencyPolicy: deriveAlicizationRecallLatencyPolicy({
        recallSeed,
        recollectionIntent: activeRecollectionIntent ?? null,
        budgetClass,
      }),
      activeSelfEvolutionCandidateId: prelude.retrievalPolicySnapshot.activeSelfEvolutionCandidateId ?? null,
      activeSelfRevisionPatch: prelude.retrievalPolicySnapshot.selfRevisionPatch ?? null,
      recentRelationshipOutcomes,
      recentMemoryReflections,
      relationshipDynamics,
    })
    const initialRecallLatencyPolicy = deriveAlicizationRecallLatencyPolicy({
      recallSeed,
      recollectionIntent: activeRecollectionIntent ?? null,
      budgetClass,
      wrongThreadRate: memoryStats?.retrievalHealth?.wrongThreadRate ?? null,
      recallMissRate: memoryStats?.retrievalHealth?.recallMissRate ?? null,
      reconstructionErrorRate: memoryStats?.retrievalHealth?.reconstructionErrorRate ?? null,
      memorySurfaceViolationRate: memoryStats?.retrievalHealth?.memorySurfaceViolationRate ?? null,
      clusterAmbiguous: clusterState.ambiguous,
      competingVariantCount: clusterState.competingVariants.length,
      contradictionCount: knowledgeEvidence.contradictionCount,
      contradictionHeavyFactCount: knowledgeEvidence.contradictionHeavyFactCount,
      validationCount: knowledgeEvidence.validationCount,
      stronglyValidatedProcedureCount: knowledgeEvidence.stronglyValidatedProcedureCount,
      shouldRecall: rawMemoryDeliberation?.shouldRecall ?? Boolean(recollectionPlan),
      finalSurfacePolicy: rawMemoryDeliberation?.surfacePolicy ?? null,
      stableCoreCount: rawMemoryDeliberation?.stableCore?.length ?? initialReconstructionPass.stableCore.length,
      unsafeDetailCount: rawMemoryDeliberation?.unsafeDetails?.length ?? initialReconstructionPass.unsafeDetails.length,
    })
    const recallPlannerDecision = planAlicizationRecall({
      recollectionIntent: activeRecollectionIntent ?? null,
      recollectionPlanCandidate: recollectionPlan,
      recollectionSpeechCandidate: recollectionSpeechPlan,
      memoryDeliberationCandidate: rawMemoryDeliberation,
      relationshipLineCandidates,
      consolidatedMemories,
      recollectedWindows,
      proceduralMemories,
      recalledEpisodes,
      recalledConversationHistory,
      retrievalHealth: memoryStats?.retrievalHealth ?? null,
      knowledgeEvidence,
      clusterContext: {
        ambiguous: clusterState.ambiguous,
        dominantSummary: clusterState.dominantSummary,
        runnerUpSummary: clusterState.runnerUpSummary,
        competingVariants: clusterState.competingVariants,
      },
      reconstructionContext: initialReconstructionPass,
    })
    const plannerRecollectionPlan = recallPlannerDecision.recollectionPlan
    const plannerMemoryDeliberation = recallPlannerDecision.memoryDeliberation
    const finalRecollectionPlan = plannerRecollectionPlan
    const finalMemoryDeliberation = plannerMemoryDeliberation
    const recallLatencyPolicy = deriveAlicizationRecallLatencyPolicy({
      recallSeed,
      recollectionIntent: activeRecollectionIntent,
      budgetClass,
      wrongThreadRate: memoryStats?.retrievalHealth?.wrongThreadRate ?? null,
      recallMissRate: memoryStats?.retrievalHealth?.recallMissRate ?? null,
      reconstructionErrorRate: memoryStats?.retrievalHealth?.reconstructionErrorRate ?? null,
      memorySurfaceViolationRate: memoryStats?.retrievalHealth?.memorySurfaceViolationRate ?? null,
      clusterAmbiguous: clusterState.ambiguous,
      competingVariantCount: clusterState.competingVariants.length,
      contradictionCount: knowledgeEvidence.contradictionCount,
      contradictionHeavyFactCount: knowledgeEvidence.contradictionHeavyFactCount,
      validationCount: knowledgeEvidence.validationCount,
      stronglyValidatedProcedureCount: knowledgeEvidence.stronglyValidatedProcedureCount,
      shouldRecall: finalMemoryDeliberation?.shouldRecall ?? recallPlannerDecision.shouldRecall,
      finalSurfacePolicy: finalMemoryDeliberation?.surfacePolicy ?? recallPlannerDecision.surfaceMode,
      stableCoreCount: finalMemoryDeliberation?.stableCore?.length ?? recallPlannerDecision.stableCore.length,
      unsafeDetailCount: finalMemoryDeliberation?.unsafeDetails?.length ?? recallPlannerDecision.unsafeDetails.length,
    })
    const preferredSelectedEras = plannerMemoryDeliberation
      ? selectMemoryDeliberationEras({
          recollectionIntent: activeRecollectionIntent ?? null,
          selectedEraIds: plannerMemoryDeliberation.selectedEraIds,
          selectedConsolidationIds: plannerMemoryDeliberation.selectedConsolidationIds,
          selectedWindowIds: plannerMemoryDeliberation.selectedWindowIds,
          consolidatedMemories,
          recollectedWindows,
        })
      : []
    const finalSelectedConsolidationIds = new Set(plannerMemoryDeliberation?.selectedConsolidationIds ?? [...selectedConsolidationIds])
    const finalSelectedWindowIds = new Set(plannerMemoryDeliberation?.selectedWindowIds ?? [...selectedWindowIds])
    const finalSelectedProcedureIds = new Set(plannerMemoryDeliberation?.selectedProcedureIds ?? [...selectedProceduralIds])
    const finalSelectedEpisodeIds = new Set(plannerMemoryDeliberation?.selectedEpisodeIds ?? [...selectedEpisodeIds])
    const finalSelectedConversationTurnIds = new Set(plannerMemoryDeliberation?.selectedConversationTurnIds ?? [...selectedConversationTurnIds])
    const finalSelectedEraIds = new Set(preferredSelectedEras.map(item => item.id))
    const shouldCarryDeliberatedRecall = plannerMemoryDeliberation
      ? plannerMemoryDeliberation.shouldRecall
      : Boolean(plannerRecollectionPlan)
    const deliberatedConsolidatedMemoriesRaw = shouldCarryDeliberatedRecall
      ? plannerMemoryDeliberation
        ? consolidatedMemories.filter(item => finalSelectedConsolidationIds.has(item.id))
        : (
            finalSelectedConsolidationIds.size > 0
              ? consolidatedMemories.filter(item => finalSelectedConsolidationIds.has(item.id))
              : plannedConsolidatedMemories
          )
      : []
    const deliberatedWindowsRaw = shouldCarryDeliberatedRecall
      ? plannerMemoryDeliberation
        ? recollectedWindows.filter(item => finalSelectedWindowIds.has(item.id))
        : (
            finalSelectedWindowIds.size > 0
              ? recollectedWindows.filter(item => finalSelectedWindowIds.has(item.id))
              : plannedWindows
          )
      : []
    const selectedEraConsolidations = finalSelectedEraIds.size > 0
      ? consolidatedMemories.filter(item => finalSelectedEraIds.has(item.id))
      : []
    const selectedEraWindows = finalSelectedEraIds.size > 0
      ? recollectedWindows.filter(item => finalSelectedEraIds.has(item.id))
      : []
    const eraTexts = [
      ...selectedEraConsolidations.flatMap(item => [item.summary, item.lesson ?? '', ...item.cues]),
      ...selectedEraWindows.flatMap(item => [item.summary, ...item.cues]),
    ].filter(Boolean)
    const eraDerivedEpisodeIds = new Set(selectedEraConsolidations.flatMap(item => item.derivedEventIds))

    const deliberatedConsolidatedMemories = finalSelectedEraIds.size > 0
      ? (
          deliberatedConsolidatedMemoriesRaw.length > 0
            ? deliberatedConsolidatedMemoriesRaw
            : selectedEraConsolidations
        )
      : deliberatedConsolidatedMemoriesRaw
    const deliberatedWindows = finalSelectedEraIds.size > 0
      ? (
          deliberatedWindowsRaw.length > 0
            ? deliberatedWindowsRaw
            : selectedEraWindows
        )
      : deliberatedWindowsRaw
    const deliberatedProceduralMemoriesRaw = shouldCarryDeliberatedRecall
      ? plannerMemoryDeliberation
        ? proceduralMemories.filter(item => finalSelectedProcedureIds.has(item.id))
        : (
            finalSelectedProcedureIds.size > 0
              ? proceduralMemories.filter(item => finalSelectedProcedureIds.has(item.id))
              : plannedProceduralMemories
          )
      : []
    const deliberatedEpisodesRaw = shouldCarryDeliberatedRecall
      ? plannerMemoryDeliberation
        ? recalledEpisodes.filter(item => finalSelectedEpisodeIds.has(item.id))
        : (
            finalSelectedEpisodeIds.size > 0
              ? recalledEpisodes.filter(item => finalSelectedEpisodeIds.has(item.id))
              : plannedEpisodes
          )
      : []
    const deliberatedConversationHistoryRaw = shouldCarryDeliberatedRecall
      ? plannerMemoryDeliberation
        ? recalledConversationHistory.filter(item => item.turnId && finalSelectedConversationTurnIds.has(item.turnId))
        : (
            finalSelectedConversationTurnIds.size > 0
              ? recalledConversationHistory.filter(item => item.turnId && finalSelectedConversationTurnIds.has(item.turnId))
              : plannedConversationHistory
          )
      : []
    const deliberatedEpisodes = finalSelectedEraIds.size > 0
      ? rankByEraAffinity({
          items: deliberatedEpisodesRaw.length > 0
            ? deliberatedEpisodesRaw
            : recalledEpisodes.filter(item => eraDerivedEpisodeIds.has(item.id)),
          eraTexts,
          toText: item => [
            item.threadAnchor,
            item.whatHappened,
            item.relationshipMeaning,
            item.lesson,
            item.sourceSummary,
            ...(item.tags ?? []),
          ].filter(Boolean).join(' '),
        })
      : deliberatedEpisodesRaw
    const constrainedDeliberatedEpisodes = finalSelectedEraIds.size > 0
      ? (() => {
          const eraMatchedEpisodes = deliberatedEpisodes.filter(item => eraDerivedEpisodeIds.has(item.id))
          return eraMatchedEpisodes.length > 0
            ? eraMatchedEpisodes
            : deliberatedEpisodes
        })()
      : deliberatedEpisodes
    const deliberatedProceduralMemories = finalSelectedEraIds.size > 0
      ? rankByEraAffinity({
          items: deliberatedProceduralMemoriesRaw,
          eraTexts,
          toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
        })
      : deliberatedProceduralMemoriesRaw
    const deliberatedConversationHistory = finalSelectedEraIds.size > 0
      ? rankByEraAffinity({
          items: deliberatedConversationHistoryRaw,
          eraTexts,
          toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
        })
      : deliberatedConversationHistoryRaw
    const surfacePlanningStartedAt = Date.now()
    const effectiveRecollectionSpeechPlan = applyMemoryTuningAdviceToSpeechPlan({
      // NOTICE: Surface planning remains mind-authored; telemetry only measures this shaping pass.
      speechPlan: applyMemoryDeliberationToSpeechPlan({
        deliberation: plannerMemoryDeliberation,
        speechPlan: recollectionSpeechPlan,
      }),
      memoryDeliberation: plannerMemoryDeliberation,
      tuningAdvice: memoryTuningAdvice,
    })
    void recordOrganicMemoryStageBudget?.({
      stage: 'surface-planning',
      budgetClass,
    }).catch(() => {})
    void recordOrganicMemoryStageLatency?.({
      stage: 'surface-planning',
      latencyMs: Date.now() - surfacePlanningStartedAt,
    }).catch(() => {})
    const activeRecollectionIntentMode = activeRecollectionIntent?.mode
    const plannedNarrativeMode: NonNullable<OrganicMemoryPromptContext['recollectionNarratives']>[number]['mode'] = activeRecollectionIntentMode && activeRecollectionIntentMode !== 'none'
      ? activeRecollectionIntentMode
      : 'conversation-history'
    const plannedNarratives = (finalMemoryDeliberation?.shouldRecall !== false && (finalMemoryDeliberation?.inwardLine || finalRecollectionPlan?.opening))
      ? [{
          mode: plannedNarrativeMode,
          certainty: effectiveRecollectionSpeechPlan?.certainty ?? finalRecollectionPlan?.certainty ?? 'approximate',
          recallCenter: finalMemoryDeliberation?.inwardLine || finalRecollectionPlan?.opening || '',
          recallPressure: (finalMemoryDeliberation?.confidence ?? finalRecollectionPlan?.confidence ?? 0) >= 0.78
            ? 'high' as const
            : (finalMemoryDeliberation?.confidence ?? finalRecollectionPlan?.confidence ?? 0) >= 0.58
                ? 'medium' as const
                : 'low' as const,
          evidenceCues: [
            ...(deliberatedWindows[0]?.cues ?? []),
            ...(deliberatedConsolidatedMemories[0]?.cues ?? []),
            ...(deliberatedProceduralMemories[0]?.cues ?? []),
            ...((finalMemoryDeliberation?.selectedRelationshipLines ?? []).slice(0, 2)),
          ].slice(0, 4),
          provenancePosture: deliberatedWindows[0]?.dominantProvenance === 'observed' || deliberatedWindows[0]?.dominantProvenance === 'remembered'
            ? 'lived' as const
            : deliberatedWindows[0]?.dominantProvenance === 'inferred' || deliberatedWindows[0]?.dominantProvenance === 'dreamt'
              ? 'inferred-or-dreamt' as const
              : 'reconstructed' as const,
          speakerInstruction: 'Use this as inward recall pressure only; do not copy it as a visible memory opener.',
          opening: finalMemoryDeliberation?.inwardLine || finalRecollectionPlan?.opening || '',
          supportCues: [
            ...(deliberatedWindows[0]?.cues ?? []),
            ...(deliberatedConsolidatedMemories[0]?.cues ?? []),
            ...(deliberatedProceduralMemories[0]?.cues ?? []),
            ...((finalMemoryDeliberation?.selectedRelationshipLines ?? []).slice(0, 2)),
          ].slice(0, 4),
          confidence: finalMemoryDeliberation?.confidence ?? finalRecollectionPlan?.confidence ?? 0.68,
        }, ...recollectionNarratives]
      : recollectionNarratives
    const synthesizedBundles = (() => {
      const bundles: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedBundles'] = []
      const primaryPeriod = deliberatedWindows[0] ?? deliberatedConsolidatedMemories[0] ?? null
      const primaryEpisode = constrainedDeliberatedEpisodes[0] ?? null
      const primaryProcedure = deliberatedProceduralMemories[0] ?? null
      const primaryConversationTurn = deliberatedConversationHistory[0] ?? null
      const primaryRelationshipLine = (finalMemoryDeliberation?.selectedRelationshipLines ?? []).at(0)
        ?? primaryEpisode?.relationshipMeaning
        ?? primaryEpisode?.lesson
        ?? null
      const summaryParts = [
        primaryPeriod?.summary ?? null,
        primaryEpisode?.whatHappened ?? null,
        primaryProcedure?.approach ?? null,
        primaryRelationshipLine ?? null,
      ].filter(Boolean).slice(0, 3)

      if (summaryParts.length > 0) {
        bundles.push({
          id: 'bundle-primary',
          summary: summaryParts.join(' | '),
          rationale: finalMemoryDeliberation?.whyNow ?? finalRecollectionPlan?.rationale ?? 'The recollection bundle links the period, event, and remembered way of handling this turn.',
          confidence: finalMemoryDeliberation?.confidence ?? finalRecollectionPlan?.confidence ?? 0.68,
          periodId: primaryPeriod?.id ?? null,
          episodeId: primaryEpisode?.id ?? null,
          procedureId: primaryProcedure?.id ?? null,
          conversationTurnId: primaryConversationTurn?.turnId ?? null,
          relationshipLine: primaryRelationshipLine ?? null,
        })
      }

      return bundles
    })()
    const synthesizedChains = (() => {
      const chains: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedChains'] = []
      const primaryPeriod = deliberatedWindows[0] ?? deliberatedConsolidatedMemories[0] ?? null
      const primaryEpisode = constrainedDeliberatedEpisodes[0] ?? null
      const primaryProcedure = deliberatedProceduralMemories[0] ?? null
      const primaryRelationshipLine = (finalMemoryDeliberation?.selectedRelationshipLines ?? []).at(0)
        ?? primaryEpisode?.relationshipMeaning
        ?? null
      const primaryLesson = primaryEpisode?.lesson
        ?? deliberatedConsolidatedMemories[0]?.lesson
        ?? null

      if (primaryProcedure || primaryRelationshipLine) {
        chains.push({
          id: 'chain-task-procedure',
          kind: 'task-procedure-relationship-stance' as const,
          summary: [primaryProcedure?.approach, primaryRelationshipLine, primaryLesson].filter(Boolean).slice(0, 3).join(' | '),
          rationale: finalMemoryDeliberation?.whyNow ?? 'The remembered task procedure is carrying a relationship meaning into the current stance.',
          confidence: finalMemoryDeliberation?.confidence ?? finalRecollectionPlan?.confidence ?? 0.68,
          taskCue: primaryEpisode?.threadAnchor ?? primaryProcedure?.label ?? null,
          periodSummary: primaryPeriod?.summary ?? null,
          eventSummary: primaryEpisode?.whatHappened ?? null,
          procedureSummary: primaryProcedure?.approach ?? null,
          relationshipMeaning: primaryRelationshipLine ?? null,
          lesson: primaryLesson ?? null,
          currentStance: primaryRelationshipLine
            ? `Carry this task with ${primaryRelationshipLine.toLowerCase()}`
            : primaryProcedure?.approach ?? null,
          answerPosture: primaryRelationshipLine
            ? `Let the answer follow ${primaryRelationshipLine.toLowerCase()}`
            : primaryProcedure?.approach ?? null,
        })
      }

      if (primaryPeriod || primaryEpisode || primaryLesson) {
        chains.push({
          id: 'chain-period-event',
          kind: 'period-event-lesson-posture' as const,
          summary: [primaryPeriod?.summary, primaryEpisode?.whatHappened, primaryLesson].filter(Boolean).slice(0, 3).join(' | '),
          rationale: finalMemoryDeliberation?.whyNow ?? 'The remembered period and event are being translated into the current answer posture.',
          confidence: finalMemoryDeliberation?.confidence ?? finalRecollectionPlan?.confidence ?? 0.68,
          taskCue: primaryEpisode?.threadAnchor ?? null,
          periodSummary: primaryPeriod?.summary ?? null,
          eventSummary: primaryEpisode?.whatHappened ?? null,
          procedureSummary: primaryProcedure?.approach ?? null,
          relationshipMeaning: primaryRelationshipLine ?? null,
          lesson: primaryLesson ?? null,
          currentStance: primaryLesson
            ? `Stand in the current turn as if ${primaryLesson.toLowerCase()}`
            : primaryRelationshipLine ?? null,
          answerPosture: primaryLesson
            ? `Let the answer posture follow ${primaryLesson.toLowerCase()}`
            : primaryRelationshipLine
              ? `Let the answer posture follow ${primaryRelationshipLine.toLowerCase()}`
              : null,
        })
      }

      return chains.slice(0, 4)
    })()
    const reconstructionPass = runReconstructionAmbiguityRetrievalPass({
      episodes: constrainedDeliberatedEpisodes,
      recalledConversationHistory: deliberatedConversationHistory,
      competingVariants: clusterState.competingVariants,
    })
    const synthesizedConflictState = deriveMemoryDeliberationConflictState({
      deliberation: finalMemoryDeliberation,
      episodes: constrainedDeliberatedEpisodes,
      periods: [
        ...deliberatedWindows.map(item => ({ summary: item.summary })),
        ...deliberatedConsolidatedMemories.map(item => ({ summary: item.summary })),
      ],
      procedures: deliberatedProceduralMemories.map(item => ({
        approach: item.approach,
        label: item.label,
      })),
      relationshipLines: uniqueList([
        ...(finalMemoryDeliberation?.selectedRelationshipLines ?? []),
        ...(finalRecollectionPlan?.selectedRelationshipLines ?? []),
        ...relationshipLineCandidates.map(item => item.line),
      ], 4),
      reconstructionPass,
      interferenceVariants: reconstructionPass.candidates.map(item => ({
        id: item.id,
        summary: item.summary,
        reason: item.reason ?? 'Reconstructed or competing memory variant remains active.',
      })),
    })
    const resolvedRelationshipLines = uniqueList([
      ...(finalMemoryDeliberation?.selectedRelationshipLines ?? []),
      ...(finalRecollectionPlan?.selectedRelationshipLines ?? []),
      ...relationshipLineCandidates.map(item => item.line),
      ...constrainedDeliberatedEpisodes.flatMap(item => [item.relationshipMeaning, item.lesson]),
    ], 4)
    const resolvedSearchTrace = finalMemoryDeliberation?.searchTrace
      ?? finalRecollectionPlan?.searchTrace
      ?? null
    const resolvedAmbiguityPosture: MemoryDeliberationSnapshot['ambiguityPosture']
      = finalMemoryDeliberation?.ambiguityPosture
        ?? resolvedSearchTrace?.thirdHop.ambiguityPosture
        ?? (
          synthesizedConflictState.conflictSeverity === 'high'
            ? 'ambiguous'
            : synthesizedConflictState.conflictSeverity === 'medium'
              || constrainedDeliberatedEpisodes.some((item) => {
                const provenance = item.latestReconsolidation?.provenance ?? item.provenance
                return provenance === 'reconstructed' || provenance === 'dreamt' || provenance === 'inferred'
              })
              ? 'approximate'
              : 'settled'
        )
    const resolvedMemoryDeliberation = finalMemoryDeliberation
      ? {
          ...finalMemoryDeliberation,
          ambiguityPosture: resolvedAmbiguityPosture,
          searchTrace: resolvedSearchTrace,
          selectedEras: preferredSelectedEras.length > 0
            ? preferredSelectedEras
            : selectMemoryDeliberationEras({
                recollectionIntent: activeRecollectionIntent ?? null,
                selectedEraIds: finalMemoryDeliberation.selectedEraIds,
                selectedConsolidationIds: finalMemoryDeliberation.selectedConsolidationIds,
                selectedWindowIds: finalMemoryDeliberation.selectedWindowIds,
                consolidatedMemories: deliberatedConsolidatedMemories,
                recollectedWindows: deliberatedWindows,
              }),
          selectedPeriods: [
            ...deliberatedWindows.map(item => ({
              id: item.id,
              kind: 'window' as const,
              summary: item.summary,
            })),
            ...deliberatedConsolidatedMemories.map(item => ({
              id: item.id,
              kind: 'consolidation' as const,
              summary: item.summary,
            })),
          ].slice(0, 6),
          selectedEpisodes: constrainedDeliberatedEpisodes.map(item => ({
            id: item.id,
            summary: item.whatHappened,
            provenance: item.latestReconsolidation?.provenance ?? item.provenance,
            reconsolidatedFromTraceId: item.latestReconsolidation?.decisionTraceId ?? null,
          })).slice(0, 6),
          conflictSeverity: synthesizedConflictState.conflictSeverity,
          conflictVariants: synthesizedConflictState.conflictVariants,
          stableCore: synthesizedConflictState.stableCore,
          unsafeDetails: synthesizedConflictState.unsafeDetails,
          selectedRelationshipLines: resolvedRelationshipLines,
          selectedProcedures: deliberatedProceduralMemories.map(item => ({
            id: item.id,
            label: item.label,
            approach: item.approach,
          })).slice(0, 6),
          selectedBundles: rankMemoryDeliberationBundles({
            recollectionIntent: activeRecollectionIntent ?? null,
            bundles: finalMemoryDeliberation.selectedBundles.length > 0
              ? finalMemoryDeliberation.selectedBundles.map((bundle) => {
                  const periodSummary = bundle.periodId
                    ? deliberatedWindows.find(item => item.id === bundle.periodId)?.summary
                    ?? deliberatedConsolidatedMemories.find(item => item.id === bundle.periodId)?.summary
                    ?? null
                    : null
                  const episodeSummary = bundle.episodeId
                    ? constrainedDeliberatedEpisodes.find(item => item.id === bundle.episodeId)?.whatHappened
                    : null
                  const procedureSummary = bundle.procedureId
                    ? deliberatedProceduralMemories.find(item => item.id === bundle.procedureId)?.approach
                    : null
                  const conversationSummary = bundle.conversationTurnId
                    ? deliberatedConversationHistory.find(item => item.turnId === bundle.conversationTurnId)?.assistantText
                    : null
                  return {
                    ...bundle,
                    summary: bundle.summary || [periodSummary, episodeSummary, procedureSummary, conversationSummary, bundle.relationshipLine].filter(Boolean).slice(0, 3).join(' | '),
                  }
                }).slice(0, 4)
              : synthesizedBundles,
          }),
          selectedChains: rankMemoryDeliberationChains({
            recollectionIntent: activeRecollectionIntent ?? null,
            chains: (finalMemoryDeliberation.selectedChains ?? []).length > 0
              ? (finalMemoryDeliberation.selectedChains ?? []).map(chain => ({
                  ...chain,
                  summary: chain.summary || [chain.periodSummary, chain.eventSummary, chain.procedureSummary, chain.relationshipMeaning, chain.lesson].filter(Boolean).slice(0, 3).join(' | '),
                })).slice(0, 4)
              : synthesizedChains,
          }),
          followUpAffordance: deriveMemoryFollowUpAffordance({
            deliberation: finalMemoryDeliberation,
            speechPlan: effectiveRecollectionSpeechPlan,
            recollectionPlan: finalRecollectionPlan,
            recollectionIntent: activeRecollectionIntent ?? null,
          }),
        }
      : null
    const activeThoughts = options?.recallGovernor?.allowActiveThoughts === false
      ? []
      : selectPromptActiveThoughts({
          activeThoughts: snapshot.activeThoughts,
          recallSeed,
          recalledFragments,
        })
    const memorySituationCandidates = buildMemorySituationCompetition({
      producedAt: Date.now(),
      queryTexts: [recallSeed, activeRecollectionIntent?.rationale ?? '', activeRecollectionIntent?.recollectionAgenda?.whyRecallNow ?? ''],
      retrievedFacts,
      recalledEpisodes: constrainedDeliberatedEpisodes,
      recalledConversationHistory: deliberatedConversationHistory,
      consolidatedMemories: deliberatedConsolidatedMemories,
      proceduralMemories: deliberatedProceduralMemories,
    })
    const claimEvidenceGraphs = retrievedFacts.slice(0, 6).map(fact => buildClaimEvidenceGraphFromMemoryFact({
      now: Date.now(),
      fact,
    }))

    const selfEvolutionStartedAt = Date.now()
    void recordOrganicMemoryStageBudget?.({
      stage: 'self-evolution-integration',
      budgetClass,
    }).catch(() => {})
    const { derivedMindStateBundle } = buildOrganicMemoryEvolutionState({
      producedAt: Date.now(),
      retrievedFacts,
      proceduralMemories: deliberatedProceduralMemories,
      personStateEvolutionSummary,
      hostPersonModel,
      memoryStats,
      recollectionIntent: recollectionIntent ?? null,
      recollectionPlan: finalRecollectionPlan,
      recollectionSpeechPlan: effectiveRecollectionSpeechPlan,
      memoryDeliberation: resolvedMemoryDeliberation,
      claimEvidenceGraphs,
      personStateProjection: personStateProjection ?? null,
      learningExecutionState: snapshot.learningExecutionState ?? null,
      recallLatencyPolicy,
      affectiveResidue,
      activeSelfEvolutionCandidateId: prelude.retrievalPolicySnapshot.activeSelfEvolutionCandidateId ?? null,
      activeSelfRevisionPatch: prelude.retrievalPolicySnapshot.selfRevisionPatch ?? null,
      recentRelationshipOutcomes,
      recentMemoryReflections,
      relationshipDynamics,
    })
    void recordOrganicMemoryStageLatency?.({
      stage: 'self-evolution-integration',
      latencyMs: Date.now() - selfEvolutionStartedAt,
    }).catch(() => {})
    const memoryStageReplay = buildAlicizationMemoryStageReplay({
      producedAt: Date.now(),
      stages: [
        {
          stage: 'search-prelude',
          summary: 'Resolved recall seed, relationship dynamics, host model, and heuristic recollection intent.',
          latencyMs: prelude.stageLatencyMs.prelude,
          budgetClass,
          inputs: [options?.recallSeed ?? '', options?.turnId ?? '', options?.sessionId ?? ''],
          outputs: [recallSeed, activeRecollectionIntent?.mode ?? 'none', hostPersonModel?.trustLadder.stage ?? 'no-host-model'],
          diagnostics: [recollectionIntent?.rationale ?? '', activeRecollectionIntent?.rationale ?? '', `recall-action=${initialRecallLatencyPolicy.recallAction}`],
        },
        {
          stage: 'candidate-generation',
          summary: 'Collected raw memory candidates across conversation, consolidation, window, procedure, and episode surfaces.',
          latencyMs: candidateStageLatencyMs.candidateGeneration,
          budgetClass,
          inputs: [recallSeed, activeRecollectionIntent?.temporalFocus ?? 'none'],
          outputs: [
            `conversations=${recalledConversationHistory.length}`,
            `consolidations=${consolidatedMemories.length}`,
            `windows=${recollectedWindows.length}`,
            `procedures=${proceduralMemories.length}`,
            `episodes=${recalledEpisodes.length}`,
          ],
          diagnostics: [activeRecollectionIntent?.recollectionAgenda?.whyRecallNow ?? ''],
        },
        {
          stage: 'candidate-ranking',
          summary: 'Ranked candidates against social affinity, recollection agenda, carry cues, and dominant cluster competition.',
          latencyMs: candidateStageLatencyMs.candidateRanking,
          budgetClass,
          inputs: [activeRecollectionIntent?.mode ?? 'none', clusterState.dominantSummary ?? ''],
          outputs: [
            `cluster=${clusterState.dominantClusterKey ?? 'none'}`,
            `top-consolidation=${agendaRankedConsolidatedMemoriesClustered[0]?.id ?? 'none'}`,
            `top-procedure=${agendaRankedProceduralMemories[0]?.id ?? 'none'}`,
            `top-episode=${agendaRankedEpisodes[0]?.id ?? 'none'}`,
          ],
          diagnostics: [
            clusterState.ambiguous ? 'cluster-ambiguous' : 'cluster-stable',
            clusterState.runnerUpSummary ?? '',
          ],
        },
        {
          stage: 'recollection-planning',
          summary: 'Planned recollection foreground, speech candidate, and raw memory deliberation for the current turn.',
          latencyMs: Date.now() - recollectionPlanningStartedAt,
          budgetClass,
          inputs: [activeRecollectionIntent?.mode ?? 'none', clusterState.dominantSummary ?? ''],
          outputs: [
            `plan=${recollectionPlan?.opening ? 'yes' : 'no'}`,
            `speech=${recollectionSpeechPlan?.surfaceMode ?? 'none'}`,
            `deliberation=${rawMemoryDeliberation?.surfacePolicy ?? 'none'}`,
          ],
          diagnostics: [
            recollectionPlan?.rationale ?? '',
            recollectionSpeechPlan?.rationale ?? '',
            rawMemoryDeliberation?.whyNow ?? '',
            `recall-policy=${recallLatencyPolicy.recallAction}`,
          ],
        },
        {
          stage: 'surface-planning',
          summary: 'Merged planner deliberation with tuning advice into final speech-facing recollection surface controls.',
          latencyMs: Date.now() - surfacePlanningStartedAt,
          budgetClass,
          inputs: [plannerMemoryDeliberation?.surfacePolicy ?? 'none', recollectionSpeechPlan?.surfaceMode ?? 'none'],
          outputs: [
            `surface=${effectiveRecollectionSpeechPlan?.surfaceMode ?? 'none'}`,
            `placement=${effectiveRecollectionSpeechPlan?.placement ?? 'none'}`,
            `shouldSurface=${effectiveRecollectionSpeechPlan?.shouldSurface ? 'yes' : 'no'}`,
          ],
          diagnostics: [memoryTuningAdvice?.notes?.[0] ?? '', plannerMemoryDeliberation?.whyNow ?? ''],
        },
        {
          stage: 'self-evolution-integration',
          summary: 'Synthesized knowledge evidence, self-evolution kernel, and final derived mind-state bundle.',
          latencyMs: Date.now() - selfEvolutionStartedAt,
          budgetClass,
          inputs: [
            `facts=${retrievedFacts.length}`,
            `procedures=${deliberatedProceduralMemories.length}`,
            hostPersonModel?.trustLadder.stage ?? 'no-host-model',
          ],
          outputs: [
            `validations=${knowledgeEvidence.validationCount}`,
            `contradictions=${knowledgeEvidence.contradictionCount}`,
            selfEvolution?.nextLearningAction ?? 'hold',
            `recall=${recallLatencyPolicy.recallAction}`,
          ],
          diagnostics: [selfEvolution?.summary ?? '', derivedMindStateBundle.summary ?? '', recallLatencyPolicy.summary],
        },
      ],
    })
    const legacyMemoryResolutionLedger = buildMemoryResolutionLedger({
      producedAt: Date.now(),
      clusterState,
      finalMemoryDeliberation: resolvedMemoryDeliberation,
      finalRecollectionPlan,
      finalRecollectionSpeechPlan: effectiveRecollectionSpeechPlan,
    })
    return enrichOrganicMemoryPromptContextWithSettlement({
      context: {
        hostAttitude: relationshipDynamics?.hostAttitude || snapshot.hostAttitude,
        coreIncarnation: snapshot.coreIncarnation,
        activeThoughts,
        retrievedFacts,
        recalledFragments,
        recalledEpisodes: constrainedDeliberatedEpisodes,
        recalledConversationHistory: deliberatedConversationHistory,
        consolidatedMemories: deliberatedConsolidatedMemories,
        recollectedWindows: deliberatedWindows,
        recollectionNarratives: plannedNarratives,
        recollectionPlan: finalRecollectionPlan,
        recollectionSpeechPlan: effectiveRecollectionSpeechPlan,
        memoryDeliberation: resolvedMemoryDeliberation,
        knowledgeEvidence,
        claimEvidenceGraphs,
        proceduralMemories: deliberatedProceduralMemories,
        recollectionIntent,
        hostPersonModel,
        personStateProjection,
        relationshipDynamics,
        affectiveResidue,
        recallLatencyPolicy,
        memoryTuningAdvice,
        selfEvolution,
        learningExecutionState: snapshot.learningExecutionState ?? null,
        derivedMindStateBundle,
        memorySituationCandidates,
      },
      memoryStageReplay,
      memoryResolutionLedger: buildAlicizationMemoryResolutionLedger({
        producedAt: legacyMemoryResolutionLedger.producedAt,
        dominantClusterId: legacyMemoryResolutionLedger.dominantClusterId,
        dominantClusterSummary: legacyMemoryResolutionLedger.dominantClusterSummary,
        competingClusterId: legacyMemoryResolutionLedger.competingClusterId,
        competingClusterSummary: legacyMemoryResolutionLedger.competingClusterSummary,
        candidates: legacyMemoryResolutionLedger.candidates,
        finalSurfacePolicy: legacyMemoryResolutionLedger.finalSurfacePolicy,
        shouldStayInward: legacyMemoryResolutionLedger.shouldStayInward,
        shouldDelayUntilAfterPayoff: legacyMemoryResolutionLedger.shouldDelayUntilAfterPayoff,
        stableCoreOnly: legacyMemoryResolutionLedger.stableCoreOnly,
        suppressionTags: legacyMemoryResolutionLedger.suppressionTags,
        closureState: legacyMemoryResolutionLedger.closureState,
        surfaceConfidence: legacyMemoryResolutionLedger.surfaceConfidence,
        shouldLabelUncertainty: legacyMemoryResolutionLedger.shouldLabelUncertainty,
        visibleCarryMode: legacyMemoryResolutionLedger.visibleCarryMode,
        conflictPressure: legacyMemoryResolutionLedger.conflictPressure,
        retrievalQuality: legacyMemoryResolutionLedger.retrievalQuality,
        finalRationale: legacyMemoryResolutionLedger.finalRationale,
      }),
    })
  }

  return {
    buildProactiveRecallSeed: (input: Parameters<typeof buildOrganicMemoryProactiveRecallSeed>[0]) => buildOrganicMemoryProactiveRecallSeed(input, normalizeOrganicRecallText),
    buildOrganicMemorySystemBlocks,
    tuneOrganicMemoryPromptContextForExecutiveTurn: tuneExecutiveOrganicMemoryPromptContext,
    buildPerformanceManifestSystemBlocks: buildPerformanceManifestBlocks,
    resolveOrganicMemoryPromptContext,
  }
}
