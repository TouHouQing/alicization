import type { AlicizationExecutionRuntimeMemoryClosureExecution } from '@proj-alicization/stage-shared'

import type {
  AlicizationEpisodicEventRecord,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationMemoryProvenance,
  AlicizationMemoryReflectionRecord,
  AlicizationMemoryResolutionLedger,
  AlicizationRecallGovernorSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type {
  AlicizationOrganicMemoryCandidateResolution,
  AlicizationOrganicMemoryPreludeResolution,
  CreateAlicizationOrganicMemoryPromptRuntimeOptions,
  MemoryClusterState,
  MemoryDeliberationSnapshot,
} from './runtime-organic-memory-prompt-types'
import type { OrganicMemoryPromptContext, OrganicMemoryRecollectionCarry } from './runtime-soul'

import {
  alicizationFixedTemplateReplacement,
  deriveAlicizationRecallLatencyPolicy,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { buildClaimEvidenceGraphFromMemoryFact } from './learning-claim-evidence-runtime'
import { buildAlicizationTurnRetrievalPolicySnapshot } from './memory-accessibility-runtime'
import { rankOrganicMemoryCandidatesStage } from './memory-candidate-ranking'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
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
import { resolvePreferredPersonStateProjection } from './person-state-projection-resolution'
import { planAlicizationRecall } from './recall-planner'
import { buildOrganicMemoryProviderFactBlocks as buildOrganicMemoryFactBlocks } from './runtime-organic-memory-prompt-blocks'
import {
  deriveSceneTriggeredRecollectionIntent,
  deriveSessionMirrorRecollectionIntent,
  sanitizeOrganicMemoryText,
} from './runtime-organic-memory-search-prelude'
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

      if ((input.mode === 'episode' || input.mode === 'conversation') && (provenance === 'reconstructed' || provenance === 'dreamt' || provenance === 'inferred' || provenance === 'shadow'))
        score -= tuningAdvice.retrievalAdjustments.wrongThreadPenalty

      return { item, score }
    })
    .sort((left, right) => right.score - left.score)
    .map(item => item.item)
}

function uniquePromptList(values: Array<string | null | undefined>, maxItems = 6) {
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

function normalizeMemorySuppressionTag(raw: unknown) {
  if (typeof raw !== 'string')
    return null
  const tag = raw.replace(/^suppression:/, '').trim()
  if (tag.startsWith('self-model-stale'))
    return 'self-model-stale'
  if (tag.startsWith('stale-self-model'))
    return 'self-model-stale'
  if (tag.startsWith('relationship-era-confusion'))
    return 'relationship-era-confusion'
  return null
}

function lowerCertaintyToFloor(input: {
  certainty: 'firm' | 'approximate' | 'fragmentary'
  floor: 'firm' | 'approximate' | 'fragmentary'
}) {
  if (input.certainty !== 'firm')
    return input.certainty

  const rank = {
    fragmentary: 0,
    approximate: 1,
    firm: 2,
  } as const

  return rank[input.certainty] <= rank[input.floor]
    ? input.certainty
    : input.floor
}

function deriveExecutionCallbackCarryFromContext(input: {
  recalledEpisodes: AlicizationEpisodicEventRecord[]
}) {
  for (const episode of input.recalledEpisodes) {
    const tags = new Set(episode.tags.map(tag => sanitizeOrganicMemoryText(tag, 80).toLowerCase()))
    if (!tags.has('execution-callback'))
      continue

    const summary = sanitizeOrganicMemoryText(
      episode.relationshipMeaning
      || episode.lesson
      || episode.whatChanged
      || episode.whatHappened,
      180,
    )
    if (!summary)
      continue

    return {
      carryMode: 'execution-callback' as const,
      confidence: Math.max(0, Math.min(1, Number(episode.latestReconsolidation?.confidence ?? episode.confidence ?? 0))),
      source: 'session-continuity' as const,
      summary,
      threadAnchor: sanitizeOrganicMemoryText(episode.threadAnchor ?? '', 120) || null,
      episodeId: episode.id,
    }
  }

  return null
}

function normalizeMemoryClosureExecution(
  raw: unknown,
): AlicizationExecutionRuntimeMemoryClosureExecution | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const value = raw as Record<string, unknown>
  if (value.authority !== 'memory-os')
    return null

  const activeLearningFocuses = Array.isArray(value.activeLearningFocuses)
    ? [...new Set(value.activeLearningFocuses
        .map(focus => sanitizeOrganicMemoryText(focus, 120))
        .filter(focus => !/same-body cadence|execution_callback_return=|execution_feedback_return=|memory_os_execution_feedback=/iu.test(focus))
        .filter(Boolean))]
        .slice(0, 8)
    : []
  const reasonTags = Array.isArray(value.reasonTags)
    ? [...new Set(value.reasonTags
        .map(tag => sanitizeOrganicMemoryText(tag, 80))
        .filter(tag => !/same-body cadence|execution_callback_return=|execution_feedback_return=|memory_os_execution_feedback=/iu.test(tag))
        .filter(Boolean))]
        .slice(0, 12)
    : []
  const closureState = value.closureState && typeof value.closureState === 'object' && !Array.isArray(value.closureState)
    ? value.closureState as Record<string, unknown>
    : {}
  const normalized = {
    authority: 'memory-os',
    carry: sanitizeOrganicMemoryText(value.carry, 320) || null,
    nextLearningAction: sanitizeOrganicMemoryText(value.nextLearningAction, 80) || null,
    shouldVerify: value.shouldVerify === true,
    shouldReflect: value.shouldReflect === true,
    activeLearningFocuses,
    reasonTags,
    closureState: {
      state: sanitizeOrganicMemoryText(closureState.state, 80) || null,
      open: closureState.open === true,
      revisionRequired: closureState.revisionRequired === true,
      shouldLabelUncertainty: closureState.shouldLabelUncertainty === true,
      visibleCarryMode: sanitizeOrganicMemoryText(closureState.visibleCarryMode, 80) || null,
      retrievalQuality: sanitizeOrganicMemoryText(closureState.retrievalQuality, 80) || null,
      conflictPressure: sanitizeOrganicMemoryText(closureState.conflictPressure, 80) || null,
    },
  } satisfies AlicizationExecutionRuntimeMemoryClosureExecution

  return normalized.carry
    || normalized.nextLearningAction
    || normalized.shouldVerify
    || normalized.shouldReflect
    || normalized.activeLearningFocuses.length > 0
    || normalized.reasonTags.length > 0
    || Object.values(normalized.closureState).some(Boolean)
    ? normalized
    : null
}

function normalizeLearningActionFromMemoryClosure(
  raw: string | null,
): AlicizationLearningExecutionStateSnapshot['nextLearningAction'] {
  return raw === 'record'
    || raw === 'reflect'
    || raw === 'verify'
    || raw === 'revise'
    || raw === 'internalize'
    || raw === 'hold'
    ? raw
    : null
}

async function resolveRecentMemoryClosureExecution(input: {
  listMindTurnEvents: CreateAlicizationOrganicMemoryPromptRuntimeOptions['listMindTurnEvents']
  sessionId?: string | null
  turnId?: string | null
}) {
  const listMindTurnEvents = input.listMindTurnEvents
  if (!listMindTurnEvents)
    return null

  const turnId = sanitizeOrganicMemoryText(input.turnId ?? '', 160)
  const sessionId = sanitizeOrganicMemoryText(input.sessionId ?? '', 160)
  const scopedEvents = turnId
    ? await listMindTurnEvents({
        turnId,
        kind: 'memory-reconsolidated',
        limit: 8,
      }).catch(() => [])
    : []
  const sessionEvents = sessionId
    ? await listMindTurnEvents({
        kind: 'memory-reconsolidated',
        limit: 16,
      }).catch(() => [])
    : []
  const candidates = [
    ...scopedEvents,
    ...sessionEvents.filter(event => event.sessionId === sessionId),
  ]
    .filter(event => event.kind === 'memory-reconsolidated')
    .map((event) => {
      const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
        ? event.payload as Record<string, unknown>
        : null
      return {
        event,
        memoryClosureExecution: normalizeMemoryClosureExecution(payload?.memoryClosureExecution),
      }
    })
    .filter(item => Boolean(item.memoryClosureExecution))
    .sort((left, right) => right.event.createdAt - left.event.createdAt)

  return candidates[0]?.memoryClosureExecution ?? null
}

function mergeLearningExecutionStateWithMemoryClosure(input: {
  base?: AlicizationLearningExecutionStateSnapshot | null
  memoryClosureExecution: AlicizationExecutionRuntimeMemoryClosureExecution | null
  now: number
}): AlicizationLearningExecutionStateSnapshot | null {
  const memoryClosureExecution = input.memoryClosureExecution
  if (!memoryClosureExecution)
    return input.base ?? null

  const nextLearningAction = normalizeLearningActionFromMemoryClosure(memoryClosureExecution.nextLearningAction)
  return {
    currentTaskId: input.base?.currentTaskId ?? null,
    currentStatus: input.base?.currentStatus ?? null,
    currentAttemptCount: input.base?.currentAttemptCount ?? 0,
    currentMaxAttempts: input.base?.currentMaxAttempts ?? 0,
    currentNextRetryAt: input.base?.currentNextRetryAt ?? null,
    currentBlockedReason: input.base?.currentBlockedReason ?? null,
    currentFailureKind: input.base?.currentFailureKind ?? null,
    nextLearningAction: nextLearningAction ?? input.base?.nextLearningAction ?? null,
    shouldRecord: input.base?.shouldRecord ?? false,
    shouldReflect: memoryClosureExecution.shouldReflect || input.base?.shouldReflect === true,
    shouldVerify: memoryClosureExecution.shouldVerify || input.base?.shouldVerify === true,
    shouldRevise: memoryClosureExecution.closureState.revisionRequired || input.base?.shouldRevise === true,
    shouldInternalize: input.base?.shouldInternalize ?? false,
    activeLearningFocuses: uniquePromptList([
      ...memoryClosureExecution.activeLearningFocuses,
      ...(input.base?.activeLearningFocuses ?? []),
    ], 8),
    queuedTaskCount: input.base?.queuedTaskCount ?? 0,
    runningTaskCount: input.base?.runningTaskCount ?? 0,
    blockedTaskCount: input.base?.blockedTaskCount ?? 0,
    recentTaskIds: input.base?.recentTaskIds?.slice(0, 8) ?? [],
    lastCompletedTaskId: input.base?.lastCompletedTaskId ?? null,
    lastCompletedAction: input.base?.lastCompletedAction ?? null,
    lastCompletedSummary: memoryClosureExecution.carry ?? input.base?.lastCompletedSummary ?? null,
    lastFailureTaskId: input.base?.lastFailureTaskId ?? null,
    lastFailureKind: input.base?.lastFailureKind ?? null,
    lastFailureReason: input.base?.lastFailureReason ?? null,
    lastFailureNextRetryAt: input.base?.lastFailureNextRetryAt ?? null,
    updatedAt: input.base?.updatedAt ?? input.now,
  }
}

function buildMemoryClosureReflection(input: {
  memoryClosureExecution: AlicizationExecutionRuntimeMemoryClosureExecution | null
  sessionId?: string | null
  turnId?: string | null
  now: number
}): AlicizationMemoryReflectionRecord | null {
  const memoryClosureExecution = input.memoryClosureExecution
  if (!memoryClosureExecution)
    return null

  const summary = uniquePromptList([
    memoryClosureExecution.carry,
    ...memoryClosureExecution.activeLearningFocuses,
    ...memoryClosureExecution.reasonTags,
  ], 12).join(' | ')
  if (!summary)
    return null

  return {
    id: 'memory-closure-execution-carry',
    cardId: 'runtime-memory-closure',
    decisionTraceId: null,
    turnId: input.turnId ?? null,
    sessionId: input.sessionId ?? null,
    sourceKind: 'execution',
    targetScope: 'task',
    summary,
    lesson: uniquePromptList([
      ...memoryClosureExecution.activeLearningFocuses,
      ...memoryClosureExecution.reasonTags,
    ], 12).join(' | '),
    status: 'confirmed',
    confidence: 0.86,
    supportingFactIds: [],
    supportingOutcomeIds: [],
    createdAt: input.now,
    updatedAt: input.now,
    confirmedAt: input.now,
    deniedAt: null,
  }
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

function sanitizeOrganicMemoryReplayText(value: unknown, limit = 800) {
  const normalized = sanitizeOrganicMemoryText(
    typeof value === 'string' ? value : '',
    limit,
  )
  if (!normalized)
    return ''

  const sanitized = sanitizeAlicizationProviderFacingText(normalized, limit)
  return sanitized && sanitized !== alicizationFixedTemplateReplacement
    ? sanitized
    : ''
}

function buildMemoryResolutionLedger(input: {
  producedAt: number
  clusterState: MemoryClusterState
  finalMemoryDeliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null
  finalRecollectionPlan: OrganicMemoryPromptContext['recollectionPlan'] | null
  finalRecollectionSpeechPlan: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null
  suppressionReasons: string[]
  suppressionConflictVariants: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']>
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
    ...input.suppressionConflictVariants.map(item => ({
      id: item.id,
      summary: item.summary,
      score: null,
      status: 'rejected' as const,
      reason: item.reason ?? null,
    })),
  ])
  const suppressionTags = [
    ...new Set(
      input.suppressionReasons
        .map(normalizeMemorySuppressionTag)
        .filter((item): item is 'self-model-stale' | 'relationship-era-confusion' => item !== null),
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
    || input.finalRecollectionSpeechPlan?.shouldSurface === false
    || input.finalRecollectionSpeechPlan?.placement === 'internal-only'
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
    : input.finalRecollectionSpeechPlan?.shouldSurface === false
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
    : input.finalRecollectionSpeechPlan?.shouldSurface === false
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
    listMindTurnEvents,
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

  function buildOrganicMemoryProviderFactBlocks(context: OrganicMemoryPromptContext) {
    const startedAt = Date.now()
    const blocks = buildOrganicMemoryFactBlocks(context)
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

  function looksLikeOrdinaryGreetingMemoryFastLane(input: {
    recallSeed?: string | null
    recollectionIntent?: OrganicMemoryPromptContext['recollectionIntent'] | null
  }) {
    const seed = sanitizeOrganicMemoryText(input.recallSeed ?? '', 220).toLowerCase()
    const intent = input.recollectionIntent
    const queryText = [
      ...(intent?.queryHints ?? []),
      intent?.rationale ?? '',
      intent?.recollectionAgenda?.whyRecallNow ?? '',
    ].join(' ').toLowerCase()
    const combined = `${seed} ${queryText}`
    const compactSeed = seed.replace(/(?:^|\s\|\s)[a-z][a-z0-9_-]*:/gu, ' ').replace(/[\s。！？!?,，、.．~～…]+/gu, '')

    const ordinaryGreeting = /(?:^|[:\s|])(?:你好|您好|嗨|哈喽|哈啰|在吗|你在吗|还在吗|你还在吗|我来了|早安|早上好|中午好|下午好|晚上好|晚安|hi|hey|hello|good morning|good afternoon|good evening|good night)(?:$|[\s|。！？!?,，、.．~～…])/iu.test(combined)
      || /^(?:dialogue)?(?:你好|您好|嗨|哈喽|哈啰|在吗|你在吗|还在吗|你还在吗|我来了|早安|早上好|中午好|下午好|晚上好|晚安|hi|hey|hello|goodmorning|goodafternoon|goodevening|goodnight)$/iu.test(compactSeed)

    if (!ordinaryGreeting)
      return false

    if (intent && intent.mode !== 'none' && intent.mode !== 'conversation-history' && intent.mode !== 'relationship-history')
      return false

    return !/project|phase\s*1|digital life|same-her|execution|callback|memory closure|recollection|recall|remember|previous|screen|inspect|verify|repair|code|file|class|项目|阶段|数字生命|同一条线|执行|回调|记忆闭环|回忆|记得|之前|上次|屏幕|检查|修复|代码|文件/u.test(combined)
  }

  async function resolveOrganicMemoryPrelude(input: {
    recallSeed?: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    personStateProjection?: OrganicMemoryPromptContext['personStateProjection'] | null
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
    sessionId?: string | null
    turnId?: string | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    sessionMirrorRecollection?: OrganicMemoryRecollectionCarry | null
  }): Promise<AlicizationOrganicMemoryPreludeResolution> {
    const budgetClass = input.budgetClass ?? 'realtime-reply'
    const sessionMirrorRecollectionIntent = deriveSessionMirrorRecollectionIntent(
      input.sessionMirrorRecollection,
    )
    const sessionMirrorForeground
      = sessionMirrorRecollectionIntent?.queryHints[0] ?? ''
    const retrievalPolicyRecallSeed = uniquePromptList([
      input.recallSeed ?? input.recallGovernor?.recallSeed ?? '',
      sessionMirrorForeground,
    ], 2).join('\n')
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
      recallSeed: retrievalPolicyRecallSeed,
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
      digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface ?? null,
      sessionMirrorRecollection: input.sessionMirrorRecollection ?? null,
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
      memoryClosureExecution,
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
      resolveRecentMemoryClosureExecution({
        listMindTurnEvents,
        sessionId: input.sessionId ?? null,
        turnId: input.turnId ?? null,
      }),
    ])
    const now = Date.now()
    const memoryClosureReflection = buildMemoryClosureReflection({
      memoryClosureExecution,
      sessionId: input.sessionId ?? null,
      turnId: input.turnId ?? null,
      now,
    })
    const memoryClosureRecentMemoryReflections = memoryClosureReflection
      ? [memoryClosureReflection, ...(recentMemoryReflections ?? [])].slice(0, 8)
      : recentMemoryReflections
    const derivedPersonStateProjection = buildMemoryPromptPersonStateProjectionHelper({
      recallSeed: prelude.recallSeed,
      recollectionIntent: prelude.activeRecollectionIntent,
      hostPersonModel: prelude.hostPersonModel,
      personStateEvolutionSummary,
    })
    const personStateProjection = resolvePreferredPersonStateProjection({
      bundleProjection: input.personStateProjection ?? null,
      runtimeProjection: derivedPersonStateProjection,
    })
    const projectedPersonStateProjection = personStateProjection ?? null
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
      recentMemoryReflections: memoryClosureRecentMemoryReflections,
      personStateProjection: projectedPersonStateProjection,
      digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface ?? null,
      memoryClosureExecution,
      skipProviderRecollectionPlanning: looksLikeOrdinaryGreetingMemoryFastLane({
        recallSeed: prelude.recallSeed,
        recollectionIntent: prelude.activeRecollectionIntent ?? prelude.recollectionIntent ?? null,
      }),
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
    projectStateBrief?: Record<string, unknown> | null
    personStateProjection?: OrganicMemoryPromptContext['personStateProjection'] | null
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
    sessionId?: string | null
    turnId?: string | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    sessionMirrorRecollection?: OrganicMemoryRecollectionCarry | null
  }): Promise<OrganicMemoryPromptContext> {
    const prelude = await resolveOrganicMemoryPrelude({
      recallSeed: options?.recallSeed,
      recallGovernor: options?.recallGovernor ?? null,
      personStateProjection: options?.personStateProjection ?? null,
      digitalLifeRuntimeSurface: options?.digitalLifeRuntimeSurface ?? null,
      sessionId: options?.sessionId ?? null,
      turnId: options?.turnId ?? null,
      budgetClass: options?.budgetClass,
      sessionMirrorRecollection: options?.sessionMirrorRecollection ?? null,
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
      digitalLifeRuntimeSurface,
      memoryClosureExecution,
      skipProviderRecollectionPlanning,
    } = prelude
    const projectStatePreflightSummary = null
    const projectStatePreDialogueAwarenessLine = null
    const projectStateContinuity = null
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
      digitalLifeRuntimeSurface,
      planMemoryRecollection,
      planRecollectionSpeech,
      planMemoryDeliberation,
      resolveRecollectionPlanSearch,
      recordMemoryPlannerLatency,
      recordMemorySpeechPlanLatency,
      skipProviderPlanning: skipProviderRecollectionPlanning === true,
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
      episodes: plannedEpisodes,
      recalledConversationHistory: plannedConversationHistory,
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
    const effectiveLearningExecutionState = mergeLearningExecutionStateWithMemoryClosure({
      base: snapshot.learningExecutionState ?? null,
      memoryClosureExecution,
      now: Date.now(),
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
    const initialRecallLatencyPolicy = recallLatencyPolicy
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
    const deliberatedRecollectionSpeechPlan = applyMemoryDeliberationToSpeechPlan({
      deliberation: plannerMemoryDeliberation,
      speechPlan: recollectionSpeechPlan,
      hostPersonModel,
    })
    const finalSurfaceKernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: plannerMemoryDeliberation,
      speech: deliberatedRecollectionSpeechPlan,
      recollectionIntent,
      knowledgeEvidence,
      hostPersonModel,
    })
    const effectiveRecollectionSpeechPlan = deliberatedRecollectionSpeechPlan && finalSurfaceKernel?.shouldStayInward
      ? {
          ...deliberatedRecollectionSpeechPlan,
          shouldSurface: false,
          surfaceMode: 'internal-only' as const,
          placement: 'internal-only' as const,
          certainty: finalSurfaceKernel.memoryControl?.certaintyFloor
            ? lowerCertaintyToFloor({
                certainty: deliberatedRecollectionSpeechPlan.certainty,
                floor: finalSurfaceKernel.memoryControl.certaintyFloor,
              })
            : deliberatedRecollectionSpeechPlan.certainty,
        }
      : deliberatedRecollectionSpeechPlan
    void recordOrganicMemoryStageBudget?.({
      stage: 'surface-planning',
      budgetClass,
    }).catch(() => {})
    void recordOrganicMemoryStageLatency?.({
      stage: 'surface-planning',
      latencyMs: Date.now() - surfacePlanningStartedAt,
    }).catch(() => {})
    const plannedNarratives = finalMemoryDeliberation?.shouldRecall === true
      ? recollectionNarratives
      : []
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
      ], 4),
      reconstructionPass,
    })
    const resolvedRelationshipLines = uniqueList([
      ...(finalMemoryDeliberation?.selectedRelationshipLines ?? []),
      ...(finalRecollectionPlan?.selectedRelationshipLines ?? []),
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
    const resolvedFollowUpAffordance = finalMemoryDeliberation
      ? (() => {
          const derivedFollowUpAffordance = deriveMemoryFollowUpAffordance({
            deliberation: finalMemoryDeliberation,
            speechPlan: effectiveRecollectionSpeechPlan,
            recollectionPlan: finalRecollectionPlan,
            recollectionIntent: activeRecollectionIntent ?? null,
          })
          return finalSurfaceKernel?.followUpAffordance
            ?? derivedFollowUpAffordance
        })()
      : null
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
          selectedBundles: [],
          selectedChains: [],
          followUpAffordance: resolvedFollowUpAffordance,
        }
      : null
    const activeThoughts = selectPromptActiveThoughts({
      activeThoughts: snapshot.activeThoughts,
      recallSeed,
      recalledFragments,
    })
    const executionCallbackCarry = deriveExecutionCallbackCarryFromContext({
      recalledEpisodes: constrainedDeliberatedEpisodes,
    })
    const memorySituationCandidates = buildMemorySituationCompetition({
      producedAt: Date.now(),
      queryTexts: [recallSeed, activeRecollectionIntent?.rationale ?? '', activeRecollectionIntent?.recollectionAgenda?.whyRecallNow ?? ''],
      retrievedFacts,
      recalledEpisodes: constrainedDeliberatedEpisodes,
      recalledConversationHistory: deliberatedConversationHistory,
      consolidatedMemories: deliberatedConsolidatedMemories,
      proceduralMemories: deliberatedProceduralMemories,
      hostAttitude: relationshipDynamics?.hostAttitude || snapshot.hostAttitude,
      affectiveResidue,
      learningExecutionState: effectiveLearningExecutionState,
      personStateProjection,
      executionCallbackCarry,
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
      learningExecutionState: effectiveLearningExecutionState,
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
          inputs: [
            sanitizeOrganicMemoryReplayText(options?.recallSeed ?? '', 800),
            options?.turnId ?? '',
            options?.sessionId ?? '',
          ],
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
          summary: 'Merged planner deliberation with the recall-authored speech plan.',
          latencyMs: Date.now() - surfacePlanningStartedAt,
          budgetClass,
          inputs: [plannerMemoryDeliberation?.surfacePolicy ?? 'none', recollectionSpeechPlan?.surfaceMode ?? 'none'],
          outputs: [
            `surface=${effectiveRecollectionSpeechPlan?.surfaceMode ?? 'none'}`,
            `placement=${effectiveRecollectionSpeechPlan?.placement ?? 'none'}`,
            `shouldSurface=${effectiveRecollectionSpeechPlan?.shouldSurface ? 'yes' : 'no'}`,
          ],
          diagnostics: [
            plannerMemoryDeliberation?.whyNow ?? '',
          ],
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
      suppressionReasons: recallPlannerDecision.suppressionReasons,
      suppressionConflictVariants: recallPlannerDecision.suppressionConflictVariants,
    })
    return enrichOrganicMemoryPromptContextWithSettlement({
      context: {
        hostAttitude: relationshipDynamics?.hostAttitude || snapshot.hostAttitude,
        coreIncarnation: snapshot.coreIncarnation,
        projectStatePreflightSummary,
        projectStatePreDialogueAwarenessLine,
        projectStateContinuity,
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
        executionCallbackCarry,
        learningExecutionState: effectiveLearningExecutionState,
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
    buildOrganicMemoryProviderFactBlocks,
    tuneOrganicMemoryPromptContextForExecutiveTurn: tuneExecutiveOrganicMemoryPromptContext,
    buildPerformanceManifestSystemBlocks: buildPerformanceManifestBlocks,
    resolveOrganicMemoryPromptContext,
  }
}

export const __alicizationOrganicMemoryPromptTestOnly = {
  deriveExecutionCallbackCarryFromContext,
  rankByBenchmarkTuningBias,
}
