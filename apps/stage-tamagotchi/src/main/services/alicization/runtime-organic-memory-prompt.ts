import type {
  AlicizationEpisodicEventRecord,
  AlicizationMemoryRecollectionMode,
  AlicizationPersonStateEvolutionSummary,
  AlicizationRecallGovernorSnapshot,
} from '../../../shared/eventa'
import type { AlicizationOrganicMemoryStageReplay } from '@proj-alicization/stage-shared'
import type { AlicizationMemoryResolutionLedger } from '@proj-alicization/stage-shared'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'
import type { OrganicMemoryPromptContext } from './runtime-soul'
import type {
  CreateAlicizationOrganicMemoryPromptRuntimeOptions,
  MemoryClusterProbe,
  MemoryClusterState,
  MemoryDeliberationSnapshot,
  RecollectionIntentSnapshot,
  RecollectionPlanSnapshot,
} from './runtime-organic-memory-prompt-types'
import { buildAlicizationTurnRetrievalPolicySnapshot } from './memory-accessibility-runtime'

import { buildHostSocialGuidance, inferHostSocialContextsFromText } from './host-social-guidance'
import { deriveAlicizationRecallLatencyPolicy } from '@proj-alicization/stage-shared'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import { buildRelationshipDoctrineGuidance } from './relationship-doctrine-guidance'
import { applyMemoryTuningAdviceToSpeechPlan } from './memory-tuning-advice'
import { rankOrganicMemoryCandidatesStage } from './memory-candidate-ranking'
import { buildMemorySituationCompetition } from './memory-situation-competition'
import { buildClaimEvidenceGraphFromMemoryFact } from './learning-claim-evidence-runtime'
import { resolveOrganicMemoryRecollectionPlanningStage } from './memory-recollection-planning'
import { planAlicizationRecall } from './recall-planner'
import {
  type AlicizationRelationshipLineCandidate,
  resolveMemorySearchPrelude,
  runReconstructionAmbiguityRetrievalPass,
  retrieveMemorySearchCandidates,
} from './memory-search-retrieval-operators'
import type { AlicizationOrganicMemoryRuntimeStage } from './memory-retrieval-telemetry'
import { buildOrganicMemorySystemBlocks as buildOrganicMemoryPromptBlocks } from './runtime-organic-memory-prompt-blocks'
import { deriveSceneTriggeredRecollectionIntent, sanitizeOrganicMemoryText } from './runtime-organic-memory-search-prelude'
import {
  buildPerformanceManifestSystemBlocks as buildPerformanceManifestBlocks,
  buildProactiveRecallSeed as buildOrganicMemoryProactiveRecallSeed,
  tuneOrganicMemoryPromptContextForExecutiveTurn as tuneExecutiveOrganicMemoryPromptContext,
} from './runtime-organic-memory-surface-planning'
import { buildOrganicMemoryEvolutionState } from './runtime-organic-memory-self-evolution-integration'

export type { CreateAlicizationOrganicMemoryPromptRuntimeOptions } from './runtime-organic-memory-prompt-types'

function buildOrganicMemoryStageReplaySnapshot(input: {
  producedAt: number
  stages: Array<{
    stage: AlicizationOrganicMemoryRuntimeStage
    summary: string
    latencyMs: number | null
    budgetClass: AlicizationMemoryRetrievalBudgetClass | null
    inputs?: string[]
    outputs?: string[]
    diagnostics?: string[]
  }>
}): AlicizationOrganicMemoryStageReplay {
  return {
    version: 'organic-memory-stage-replay-v1',
    producedAt: input.producedAt,
    stages: input.stages.map(stage => ({
      stage: stage.stage,
      summary: sanitizeOrganicMemoryText(stage.summary, 220),
      latencyMs: stage.latencyMs == null ? null : Math.max(0, stage.latencyMs),
      budgetClass: stage.budgetClass,
      inputs: (stage.inputs ?? []).map(item => sanitizeOrganicMemoryText(item, 180)).filter(Boolean).slice(0, 8),
      outputs: (stage.outputs ?? []).map(item => sanitizeOrganicMemoryText(item, 180)).filter(Boolean).slice(0, 8),
      diagnostics: (stage.diagnostics ?? []).map(item => sanitizeOrganicMemoryText(item, 200)).filter(Boolean).slice(0, 8),
    })),
  }
}

function rankByBenchmarkTuningBias<T>(input: {
  items: T[]
  tuningAdvice: AlicizationMemoryTuningAdvice | null
  mode: 'consolidation' | 'window' | 'procedure' | 'episode' | 'conversation'
  toText: (item: T) => string
  getProvenance?: (item: T) => 'observed' | 'remembered' | 'dreamt' | 'inferred' | 'reconstructed' | null
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
      if ((input.mode === 'episode' || input.mode === 'conversation') && (provenance === 'reconstructed' || provenance === 'dreamt' || provenance === 'inferred'))
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

function deriveMemoryFollowUpAffordance(input: {
  deliberation: MemoryDeliberationSnapshot
  speechPlan: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null
  recollectionPlan: OrganicMemoryPromptContext['recollectionPlan'] | null
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
}) {
  const deliberation = input.deliberation
  const speechPlan = input.speechPlan ?? null
  const recollectionPlan = input.recollectionPlan ?? null
  const recollectionIntent = input.recollectionIntent ?? null
  const rawRelationshipLine = deliberation.selectedRelationshipLines[0]
    ?? recollectionPlan?.selectedRelationshipLines?.[0]
    ?? deliberation.selectedChains[0]?.currentStance
    ?? deliberation.selectedBundles[0]?.relationshipLine
    ?? null
  const bundleSummary = deliberation.selectedBundles[0]?.summary ?? null
  const chainSummary = deliberation.selectedChains[0]?.summary ?? null
  const relationLine = rawRelationshipLine
  const procedureLine = deliberation.selectedProcedures[0]?.approach
    ?? deliberation.selectedProcedures[0]?.label
    ?? deliberation.selectedChains[0]?.procedureSummary
    ?? (deliberation.selectedBundles[0]?.procedureId ? deliberation.selectedBundles[0]?.summary : null)
    ?? null
  const procedureDominant = deliberation.surfacePolicy === 'procedural-carry'
    || deliberation.surfacePolicy === 'answer-anchoring' && Boolean(procedureLine)
    || deliberation.selectedChains[0]?.kind === 'task-procedure-relationship-stance'
    || Boolean(deliberation.selectedBundles[0]?.procedureId)
  const selfModelDominant = !procedureDominant && (
    recollectionIntent?.mode === 'autobiographical-history'
    || deliberation.selectedEras.some(item => item.facet === 'self-era')
    || /self-story|self line|identity|autobiographical|self model|my pattern|my habit|who i am|older self|newer self|自我|身份|习惯|性格|叙事|我会|我总是/u.test([
      deliberation.whyNow,
      recollectionPlan?.rationale,
      bundleSummary,
      chainSummary,
      ...(deliberation.stableCore ?? []),
      ...(deliberation.unsafeDetails ?? []),
    ].filter(Boolean).join(' '))
  )
  const relationshipDominant = !procedureDominant && !selfModelDominant && (
    deliberation.surfacePolicy === 'relationship-continuity'
    || (!procedureLine && Boolean(relationLine))
  )
  const worldLike = !selfModelDominant && deliberation.selectedEpisodes.some(item => item.provenance === 'inferred' || item.provenance === 'reconstructed')
    && deliberation.selectedProcedures.length === 0
  const summary = sanitizeOrganicMemoryText(
    (procedureDominant ? procedureLine : null)
    || (relationshipDominant ? relationLine : null)
    || procedureLine
    || relationLine
    || chainSummary
    || bundleSummary
    || deliberation.whyNow
    || recollectionPlan?.rationale
    || '',
    220,
  ) || null
  if (!summary)
    return null

  const shouldStayInward = deliberation.surfacePolicy === 'internal-only'
    || speechPlan?.shouldSurface === false
    || speechPlan?.placement === 'internal-only'
  const ambiguity = deliberation.ambiguityPosture ?? 'settled'
  const conflictSeverity = deliberation.conflictSeverity ?? 'none'
  const intrusionRisk = shouldStayInward || ambiguity === 'ambiguous' || conflictSeverity === 'high'
    ? 'high' as const
    : selfModelDominant
      ? 'medium' as const
    : conflictSeverity === 'medium'
        || deliberation.surfacePolicy === 'relationship-continuity'
        || deliberation.surfacePolicy === 'gist-first'
      ? 'medium' as const
      : 'low' as const
  const payoffDependency = shouldStayInward
    ? 'memory-only' as const
    : speechPlan?.placement === 'after-payoff'
      || speechPlan?.placement === 'inside-payoff'
      ? 'requires-current-payoff' as const
      : 'can-surface-softly' as const
  const preferredTiming: NonNullable<MemoryDeliberationSnapshot['followUpAffordance']>['preferredTiming'] = shouldStayInward
    ? (
        ambiguity === 'settled'
          && conflictSeverity !== 'high'
          && (relationLine || bundleSummary || chainSummary || selfModelDominant)
          ? 'next-open-window'
          : 'internal-only'
      )
    : speechPlan?.placement === 'after-payoff'
      || speechPlan?.placement === 'inside-payoff'
      ? 'after-payoff'
      : selfModelDominant
        ? (
            recollectionIntent?.mode === 'autobiographical-history'
              && ambiguity === 'settled'
              && conflictSeverity === 'none'
              ? 'same-turn-if-invited'
              : 'after-payoff'
          )
      : 'same-turn-if-invited'

  const domainSummary = relationshipDominant
    ? (
        shouldStayInward
          ? 'Keep the relationship line inward until the host has more room for it.'
          : 'Let the relationship line return only after the current payoff has landed.'
      )
    : procedureDominant
      ? (
          shouldStayInward
            ? 'Keep the remembered procedure inward until the current payoff lands.'
            : 'Reopen the remembered procedure only after the live task payoff is stable.'
        )
      : selfModelDominant
        ? (
            shouldStayInward
              ? 'Keep the older self-story inward until the newer self line stabilizes.'
              : 'Let the older self-story return only after the current payoff lands and the newer self line feels stable enough to hold.'
          )
      : worldLike
        ? (
            shouldStayInward
              ? 'Keep the inferred or reconstructed world knowledge compressed until it is safer to say out loud.'
              : 'Delay the world-model detail until the current payoff lands and the validation pressure drops.'
          )
        : summary

  const domainWhyNow = relationshipDominant
    ? (
        shouldStayInward
          ? 'The relation line still matters, but saying it too early would crowd the host before the repair or payoff fully lands.'
          : 'The relation line can come back once the present answer has made enough room for it.'
      )
    : procedureDominant
      ? (
          shouldStayInward
            ? 'The procedure still helps, but the current payoff has to stay in front before the remembered way can become visible.'
            : 'The remembered way still helps, but it should come back only after the host sees the present task is already being carried.'
        )
      : selfModelDominant
        ? (
            shouldStayInward
              ? 'The older self-story still tugs on the moment, but saying it too early would flatten a self line that is still being revised.'
              : 'The self-story can come back once the present answer has landed and the newer self line no longer needs protective room.'
          )
      : worldLike
        ? (
            shouldStayInward
              ? 'The world-model detail is still under validation pressure, so reconstructed knowledge should stay compressed for now.'
              : 'The world-model detail may help later, but not before the present payoff proves more stable than the reconstruction pressure.'
          )
        : sanitizeOrganicMemoryText(
            deliberation.whyNow
            || speechPlan?.rationale
            || recollectionPlan?.rationale
            || summary,
            220,
          )

  return {
    summary: sanitizeOrganicMemoryText(domainSummary, 220),
    whyNow: sanitizeOrganicMemoryText(domainWhyNow, 220),
    intrusionRisk,
    payoffDependency,
    preferredTiming,
  } satisfies NonNullable<MemoryDeliberationSnapshot['followUpAffordance']>
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
    shouldStayInward: input.finalMemoryDeliberation?.surfacePolicy === 'internal-only',
    shouldDelayUntilAfterPayoff: input.finalMemoryDeliberation?.followUpAffordance?.preferredTiming === 'after-payoff',
    stableCoreOnly: (input.finalMemoryDeliberation?.unsafeDetails?.length ?? 0) > 0 || (input.finalMemoryDeliberation?.stableCore?.length ?? 0) > 0,
    suppressionTags,
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

  function countRecallTermOverlap(base: string, candidate: string) {
    const baseTerms = new Set(
      normalizeOrganicRecallText(base)
        .split(/\s+/u)
        .filter(term => term.length >= 2),
    )
    if (baseTerms.size === 0)
      return 0
    const candidateTerms = new Set(
      normalizeOrganicRecallText(candidate)
        .split(/\s+/u)
        .filter(term => term.length >= 2),
    )
    if (candidateTerms.size === 0)
      return 0

    let overlap = 0
    for (const term of candidateTerms) {
      if (baseTerms.has(term))
        overlap += 1
    }
    return overlap / candidateTerms.size
  }

  function buildOrganicMemorySystemBlocks(context: OrganicMemoryPromptContext) {
    const startedAt = Date.now()
    const blocks = buildOrganicMemoryPromptBlocks(context)
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

  function deriveAffectiveEmbodiedCarry(input: {
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }) {
    const governor = input.recallGovernor ?? null
    const affectiveCarry = governor?.affectiveCarry ?? null
    const embodiedCarry = governor?.embodiedCarry ?? null
    const sceneFamiliarityHint = Number.isFinite(governor?.sceneFamiliarityHint)
      ? Math.max(0, Math.min(1, Number(governor?.sceneFamiliarityHint)))
      : 0
    const moodTexts = uniqueList([
      affectiveCarry?.summary ?? null,
      affectiveCarry?.moodLabel ? `mood:${affectiveCarry.moodLabel}` : null,
      affectiveCarry?.emotionalTension ? `tension:${affectiveCarry.emotionalTension}` : null,
    ], 4)
    const embodiedTexts = uniqueList([
      embodiedCarry?.summary ?? null,
      embodiedCarry?.presence ? `presence:${embodiedCarry.presence}` : null,
      embodiedCarry?.suggestedStyle ? `style:${embodiedCarry.suggestedStyle}` : null,
      embodiedCarry?.afterglowFromScenario ? `afterglow:${embodiedCarry.afterglowFromScenario}` : null,
    ], 4)
    const sceneTexts = uniqueList([
      ...(governor?.sceneAnchor?.split('|').map(item => sanitizePromptText(item, 120)) ?? []),
    ], 6)
    const moodCues = uniqueList([
      ...moodTexts.flatMap(text => expandCarryCueVariants(text, 6)),
      ...expandCarryCueVariants(affectiveCarry?.moodLabel ?? null, 4),
      ...expandCarryCueVariants(affectiveCarry?.emotionalTension ?? null, 6),
    ], 10)
    const embodiedCues = uniqueList([
      ...embodiedTexts.flatMap(text => expandCarryCueVariants(text, 6)),
      ...expandCarryCueVariants(embodiedCarry?.presence ?? null, 4),
      ...expandCarryCueVariants(embodiedCarry?.suggestedStyle ?? null, 6),
      ...expandCarryCueVariants(embodiedCarry?.afterglowFromScenario ?? null, 4),
      ...sceneTexts.flatMap(text => expandCarryCueVariants(text, 6)),
    ], 12)

    return {
      sceneFamiliarityHint,
      sceneTexts,
      moodTexts,
      embodiedTexts,
      moodCues,
      embodiedCues,
      moodLabel: affectiveCarry?.moodLabel ?? null,
      emotionalTension: affectiveCarry?.emotionalTension ?? null,
      embodiedPresence: embodiedCarry?.presence ?? null,
      afterglowFromScenario: embodiedCarry?.afterglowFromScenario ?? null,
    }
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

  function clusterTokens(text: string) {
    const tokens = normalizeOrganicRecallText(text).toLowerCase().match(/[\p{Script=Han}]{1,8}|[a-z0-9][a-z0-9-]{1,32}/gu) ?? []
    return tokens.filter(token =>
      ![
        'the',
        'this',
        'that',
        'with',
        'from',
        'turn',
        'period',
        'relationship',
        'memory',
        'remembered',
        'host',
        'assistant',
        'reply',
        'event',
        'runtime',
        'session',
        'thread',
        'line',
        'thing',
        '这个',
        '那个',
        '这次',
        '那次',
        '关系',
        '记忆',
        '回忆',
        '时期',
        '线程',
        '会话',
      ].includes(token)
    )
  }

  function expandCarryCueVariants(raw: string | null | undefined, maxItems = 8) {
    const normalized = sanitizePromptText(raw, 80).toLowerCase()
    if (!normalized)
      return []

    const variants = new Set<string>()
    for (const segment of normalized.split('|').map(item => item.trim()).filter(Boolean)) {
      variants.add(segment)
      const colonParts = segment.split(':').map(item => item.trim()).filter(Boolean)
      if (colonParts.length > 1)
        variants.add(colonParts[colonParts.length - 1]!)

      const slashParts = segment.split('/').map(item => item.trim()).filter(Boolean)
      if (slashParts.length > 1)
        slashParts.forEach(part => variants.add(part))

      const hyphenParts = segment.split('-').map(item => item.trim()).filter(item => item.length >= 2)
      if (hyphenParts.length > 1) {
        variants.add(hyphenParts.join('-'))
        if (hyphenParts.length > 2)
          variants.add(hyphenParts.slice(0, -1).join('-'))
        variants.add(hyphenParts[hyphenParts.length - 1]!)
        hyphenParts.forEach(part => variants.add(part))
      }
    }

    return uniqueList([...variants], maxItems)
  }

  function scoreCuePresence(text: string, cues: string[]) {
    if (cues.length === 0)
      return 0

    const normalized = normalizeOrganicRecallText(text).toLowerCase()
    if (!normalized)
      return 0
    const textTokens = new Set(clusterTokens(normalized))
    let best = 0
    for (const cue of cues) {
      const normalizedCue = normalizeOrganicRecallText(cue).toLowerCase()
      if (!normalizedCue)
        continue
      if (normalized.includes(normalizedCue))
        return 1
      const cueTokens = clusterTokens(normalizedCue)
      if (cueTokens.length === 0)
        continue
      let matched = 0
      for (const token of cueTokens) {
        if (textTokens.has(token))
          matched += 1
      }
      best = Math.max(best, matched / cueTokens.length)
    }
    return clamp01(best)
  }

  function scoreSceneMoodEmbodiedCarryText(input: {
    text: string
    sceneWeight?: number | null
    carry: ReturnType<typeof deriveAffectiveEmbodiedCarry>
  }) {
    const normalized = normalizeOrganicRecallText(input.text).toLowerCase()
    if (
      !normalized
      || (input.carry.sceneFamiliarityHint <= 0.14
        && input.carry.moodTexts.length === 0
        && input.carry.embodiedTexts.length === 0
        && input.carry.sceneTexts.length === 0)
    ) {
      return 0
    }

    const sceneWeight = Math.max(0, input.sceneWeight ?? 0)
    const moodOverlap = input.carry.moodTexts.length > 0
      ? Math.max(...input.carry.moodTexts.map(line => countRecallTermOverlap(line, input.text)), 0)
      : 0
    const embodiedOverlap = input.carry.embodiedTexts.length > 0
      ? Math.max(...input.carry.embodiedTexts.map(line => countRecallTermOverlap(line, input.text)), 0)
      : 0
    const sceneCuePresence = scoreCuePresence(input.text, input.carry.sceneTexts)
    const moodCuePresence = scoreCuePresence(input.text, input.carry.moodCues)
    const embodiedCuePresence = scoreCuePresence(input.text, input.carry.embodiedCues)
    const afterglowBoost = (input.carry.moodLabel === 'afterglow' || input.carry.afterglowFromScenario)
      && /afterglow|linger|warm|still warm|late-night|余温|回温|soft carry/u.test(normalized)
      ? 0.14
      : 0
    const emotionalTensionBoost = input.carry.emotionalTension === 'late-night-drain'
      && /late-night|drain|tired|soft|gentle|quiet|夜里|夜间|累|余温/u.test(normalized)
      ? 0.12
      : 0
    const codingSceneBoost = input.carry.afterglowFromScenario === 'coding'
      && /cursor|diff|editor|terminal|patch|lane|终端|编辑器/u.test(normalized)
      ? 0.14
      : 0
    const presenceBoost = input.carry.embodiedPresence === 'attentive' && /focus|verify|watch|observe|repair|screen|diff|editor|专注|观察|修复/u.test(normalized)
      ? 0.1
      : input.carry.embodiedPresence === 'concerned' && /care|soft|warn|rest|gentle|关心|提醒|温和|休息/u.test(normalized)
          ? 0.1
          : input.carry.embodiedPresence === 'glance' && /afterglow|linger|brief|light|warm|quiet|cursor|diff|余温|轻/u.test(normalized)
              ? 0.12
              : 0
    return clamp01(
      sceneWeight * (0.16 + input.carry.sceneFamiliarityHint * 0.24)
      + sceneCuePresence * (0.08 + input.carry.sceneFamiliarityHint * 0.12)
      + moodCuePresence * 0.26
      + embodiedCuePresence * 0.18
      + moodOverlap * 0.14
      + embodiedOverlap * 0.12
      + afterglowBoost
      + emotionalTensionBoost
      + codingSceneBoost
      + presenceBoost,
    )
  }

  function deriveMemoryClusterKey(text: string) {
    const tokens = clusterTokens(text)
    if (tokens.length === 0)
      return ''
    return tokens.slice(0, 4).join(':')
  }

  function sanitizePromptText(raw: unknown, maxChars = 220) {
    if (typeof raw !== 'string')
      return ''
    return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  }

  function clamp01(value: number) {
    if (!Number.isFinite(value))
      return 0
    return Math.max(0, Math.min(1, Number(value.toFixed(2))))
  }

  function deriveMemoryPromptProjectionContexts(input: {
    recallSeed: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  }) {
    const intentMode = input.recollectionIntent?.mode ?? ('none' satisfies AlicizationMemoryRecollectionMode)
    return inferHostSocialContextsFromText([
      input.recallSeed,
      ...(input.recollectionIntent?.queryHints ?? []),
    ].join(' '), [
      intentMode === 'relationship-history' || intentMode === 'autobiographical-history'
        ? 'open-window'
        : 'general',
      intentMode === 'execution-procedure' || intentMode === 'experience-pattern'
        ? 'focused-work execution'
        : 'general',
    ])
  }

  function buildMemoryPromptPersonStateProjection(input: {
    recallSeed: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
    personStateEvolutionSummary?: AlicizationPersonStateEvolutionSummary | null
  }): AlicizationPersonStateProjection | null {
    if (!input.hostPersonModel)
      return null

    return buildAlicizationPersonStateProjection({
      now: Date.now(),
      contexts: deriveMemoryPromptProjectionContexts({
        recallSeed: input.recallSeed,
        recollectionIntent: input.recollectionIntent,
      }),
      hostPersonModel: input.hostPersonModel,
      personStateEvolutionSummary: input.personStateEvolutionSummary ?? null,
    })
  }

  function deriveHostSocialRecallBias(input: {
    recallSeed: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
    personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
    coreIncarnation: string
  }) {
    const projection = input.personStateProjection ?? null
    const defaultDoctrineGuidance = buildRelationshipDoctrineGuidance({
      doctrineText: projection?.relationshipDoctrine || input.coreIncarnation,
      contexts: projection?.contexts ?? [],
    })
    const hostPersonModel = input.hostPersonModel ?? null
    if (!hostPersonModel && !projection) {
      return {
        contexts: [] as string[],
        cautious: false,
        restrained: false,
        doctrineGuidance: defaultDoctrineGuidance,
        activeClosenessContext: null as AlicizationPersonStateProjection['activeClosenessContext'] | null,
        activeClosenessRung: null as AlicizationPersonStateProjection['activeClosenessRung'] | null,
        biasTexts: [] as string[],
      }
    }

    const contexts = projection?.contexts ?? deriveMemoryPromptProjectionContexts({
      recallSeed: input.recallSeed,
      recollectionIntent: input.recollectionIntent,
    })
    const guidance = buildHostSocialGuidance({
      hostPersonModel,
      contexts,
    })
    const doctrineGuidance = buildRelationshipDoctrineGuidance({
      doctrineText: projection?.relationshipDoctrine || input.coreIncarnation,
      contexts,
    })
    const biasTexts = uniqueList([
      projection?.preferenceText,
      projection?.sensitivityText,
      projection?.repairTriggerText,
      projection?.burdenText,
      projection?.routineText,
      projection?.trustRationale,
      projection?.openingGuidance,
      projection?.summary,
      guidance.preferenceText,
      guidance.sensitivityText,
      guidance.repairTriggerText,
      guidance.burdenText,
      guidance.trustRationale,
      doctrineGuidance.doctrineSummary,
      ...(hostPersonModel?.routines ?? []),
      ...(hostPersonModel?.sensitivities ?? []),
      ...(hostPersonModel?.repairTriggers ?? []),
      ...(hostPersonModel?.recurrentBurdens ?? []),
    ], 10)

    return {
      contexts,
      cautious: projection?.cautious ?? guidance.cautious,
      restrained: projection?.restrained ?? guidance.restrained,
      doctrineGuidance,
      trustStage: projection?.personalityContinuityState.trustStage ?? hostPersonModel?.trustLadder.stage ?? null,
      activeClosenessContext: projection?.activeClosenessContext ?? null,
      activeClosenessRung: projection?.activeClosenessRung ?? null,
      biasTexts,
    }
  }

  function deriveRelationshipStageAlignmentScore(input: {
    text: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
    personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
    coreIncarnation: string
    recallSeed: string
  }) {
    const socialBias = deriveHostSocialRecallBias({
      recallSeed: input.recallSeed,
      recollectionIntent: input.recollectionIntent,
      hostPersonModel: input.hostPersonModel,
      personStateProjection: input.personStateProjection,
      coreIncarnation: input.coreIncarnation,
    })
    const normalized = normalizeOrganicRecallText(input.text)
    const repairLike = /repair|space|room|lighter|boundary|distance|pressure|back off|leave room|修复|空间|边界|轻一点|距离|压力/u.test(normalized)
    const warmLike = /warm|close|closeness|directness|companionship|tender|care|open window|温和|靠近|亲密|直接|陪伴/u.test(normalized)
    const procedureLike = /runtime|procedure|patch|verify|result|callback|task|execution|focused|bounded|thread-faithful|修复节奏|回调|执行|任务|线程/u.test(normalized)
    let score = 0
    if ((socialBias.trustStage === 'guarded' || socialBias.trustStage === 'cautious-open') && repairLike)
      score += 0.22
    if ((socialBias.trustStage === 'guarded' || socialBias.trustStage === 'cautious-open') && warmLike)
      score -= 0.14
    if ((socialBias.trustStage === 'warming' || socialBias.trustStage === 'trusted') && warmLike)
      score += 0.16
    if ((socialBias.trustStage === 'warming' || socialBias.trustStage === 'trusted') && repairLike)
      score -= 0.08
    if (socialBias.doctrineGuidance.repairBeforeCloseness && repairLike)
      score += 0.12
    if (socialBias.doctrineGuidance.repairBeforeCloseness && warmLike)
      score -= 0.1
    if (socialBias.activeClosenessContext === 'repair-window') {
      if (repairLike)
        score += 0.18
      if (warmLike)
        score -= 0.12
    }
    if (socialBias.activeClosenessContext === 'execution-callback') {
      if (procedureLike)
        score += 0.16
      if (warmLike)
        score -= 0.1
    }
    if (socialBias.activeClosenessContext === 'focused-work') {
      if (procedureLike || repairLike)
        score += 0.08
      if (warmLike)
        score -= 0.08
    }
    if (socialBias.activeClosenessContext === 'open-companionship' && warmLike)
      score += 0.14
    if (socialBias.activeClosenessRung === 'space-first' || socialBias.activeClosenessRung === 'measured-room') {
      if (warmLike)
        score -= 0.1
      if (repairLike)
        score += 0.06
    }
    if ((socialBias.activeClosenessRung === 'warm-near' || socialBias.activeClosenessRung === 'close-hold') && warmLike)
      score += 0.08
    return score
  }

  function rankByHostSocialAffinity<T>(input: {
    items: T[]
    toText: (item: T) => string
    recallSeed: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
    personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
    coreIncarnation: string
  }) {
    if (input.items.length <= 1 || (!input.hostPersonModel && !input.personStateProjection && !input.coreIncarnation))
      return input.items

    const socialBias = deriveHostSocialRecallBias({
      recallSeed: input.recallSeed,
      recollectionIntent: input.recollectionIntent,
      hostPersonModel: input.hostPersonModel,
      personStateProjection: input.personStateProjection,
      coreIncarnation: input.coreIncarnation,
    })
    if (socialBias.biasTexts.length === 0)
      return input.items

    const intentMode = input.recollectionIntent?.mode ?? 'none'
    return [...input.items]
      .map((item, index) => {
        const text = input.toText(item)
        const overlap = Math.max(
          ...socialBias.biasTexts.map(biasText => countRecallTermOverlap(biasText, text)),
          0,
        )
        const normalized = normalizeOrganicRecallText(text)
        const hasRepairBias = /repair|space|room|lighter|boundary|back off|leave room|压力|空间|边界|轻一点|修复/u.test(normalized)
        const hasClosenessBias = /warm|close|closeness|companionship|tender|care|温和|靠近|亲密/u.test(normalized)
        let score = overlap * 0.26
        if ((intentMode === 'relationship-history' || intentMode === 'autobiographical-history') && (socialBias.cautious || socialBias.restrained)) {
          if (hasRepairBias)
            score += 0.18
          if (hasClosenessBias)
            score -= 0.12
        }
        if ((intentMode === 'relationship-history' || intentMode === 'autobiographical-history') && socialBias.doctrineGuidance.repairBeforeCloseness) {
          if (hasRepairBias)
            score += 0.18
          if (hasClosenessBias)
            score -= 0.14
        }
        if ((intentMode === 'execution-procedure' || intentMode === 'experience-pattern') && socialBias.doctrineGuidance.truthBeforeWarmth) {
          if (/repair|verify|truth|ground|accur|runtime|procedure|patch|fix|真实|核实|修复|准确/iu.test(normalized))
            score += 0.12
          if (hasClosenessBias)
            score -= 0.08
        }
        if (socialBias.doctrineGuidance.leaveRoom && hasRepairBias)
          score += 0.08
        if ((intentMode === 'execution-procedure' || intentMode === 'experience-pattern') && socialBias.contexts.includes('focused-work')) {
          if (/runtime|procedure|patch|verify|task|execution|focused|repair rhythm|bounded/iu.test(normalized))
            score += 0.12
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

  function rankByEraAffinity<T>(input: {
    items: T[]
    eraTexts: string[]
    toText: (item: T) => string
  }) {
    if (input.items.length <= 1 || input.eraTexts.length === 0)
      return input.items

    return [...input.items]
      .map(item => ({
        item,
        score: Math.max(
          ...input.eraTexts.map(text => countRecallTermOverlap(text, input.toText(item))),
          0,
        ),
      }))
      .sort((left, right) => right.score - left.score)
      .map(entry => entry.item)
  }

  function scoreAgeForCandidateScope(ageDays: number, scope: NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>['candidateTimeScopes'][number]['scope']) {
    switch (scope) {
      case 'recent':
        return ageDays <= 1 ? 1 : ageDays <= 3 ? 0.56 : 0.08
      case 'recent-or-mid':
        return ageDays <= 14 ? 1 : ageDays <= 30 ? 0.62 : 0.16
      case 'cross-session':
        return ageDays >= 2 ? Math.min(1, 0.42 + ageDays / 21) : 0.12
      case 'experience-matched':
        return ageDays >= 1 ? Math.min(1, 0.38 + ageDays / 14) : 0.2
      case 'distant':
        return ageDays >= 14 ? Math.min(1, 0.34 + ageDays / 45) : 0.04
      default:
        return 0
    }
  }

  function rankByRecollectionAgendaAffinity<T>(input: {
    items: T[]
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    toText: (item: T) => string
    getFacet?: (item: T) => NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>['candidateEraFacets'][number]['facet'] | null
    getAgeDays?: (item: T) => number | null
  }) {
    const agenda = input.recollectionIntent?.recollectionAgenda ?? null
    if (input.items.length <= 1 || !agenda)
      return input.items

    const facetWeights = new Map(
      (agenda.candidateEraFacets ?? []).map(item => [item.facet, item.weight] as const),
    )
    const procedureLines = agenda.candidateProcedureLines ?? []
    const emotionalPattern = /drain|mess|overwhelm|care|warm|cold|tender|annoyed|压力|累|乱|烦|温和|冷淡|情绪/u
    const relationshipPattern = /relationship|bond|trust|repair|boundary|tone|space|回应|关系|信任|修复|边界|语气|空间/u

    return [...input.items]
      .map((item, index) => {
        const text = input.toText(item)
        const normalized = normalizeOrganicRecallText(text).toLowerCase()
        const procedureOverlap = procedureLines.length > 0
          ? Math.max(...procedureLines.map(line => countRecallTermOverlap(line, text)), 0)
          : 0
        const facetWeight = input.getFacet ? (facetWeights.get(input.getFacet(item) ?? 'phase') ?? 0) : 0
        const timeWeight = input.getAgeDays
          ? Math.max(
              ...((agenda.candidateTimeScopes ?? []).map(scope => scoreAgeForCandidateScope(input.getAgeDays?.(item) ?? 0, scope.scope) * scope.weight)),
              0,
            )
          : 0
        const relationshipAffinity = agenda.relationshipNeed >= 0.32 && relationshipPattern.test(normalized)
          ? agenda.relationshipNeed * 0.18
          : 0
        const affectAffinity = agenda.affectivePull >= 0.28 && emotionalPattern.test(normalized)
          ? agenda.affectivePull * 0.14
          : 0
        const sceneAffinity = agenda.sceneFamiliarity >= 0.28 && /scene:|workload:|content:|window|period|terminal|editor|screen|窗口|阶段/u.test(normalized)
          ? agenda.sceneFamiliarity * 0.1
          : 0
        const score = procedureOverlap * (0.18 + agenda.goalSimilarity * 0.22)
          + facetWeight * 0.28
          + timeWeight * 0.24
          + relationshipAffinity
          + affectAffinity
          + sceneAffinity
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

  function analyzeMemoryClusters(input: {
    probes: MemoryClusterProbe[]
    recallSeed: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
    personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
    coreIncarnation: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }): MemoryClusterState {
    const agenda = input.recollectionIntent?.recollectionAgenda ?? null
    const carry = deriveAffectiveEmbodiedCarry({
      recallGovernor: input.recallGovernor ?? null,
    })
    if (input.probes.length === 0) {
      return {
        dominantClusterKey: null,
        dominantSummary: null,
        dominantScore: 0,
        runnerUpClusterKey: null,
        runnerUpSummary: null,
        runnerUpScore: 0,
        strongDominant: false,
        ambiguous: false,
        clusterScoreByKey: new Map(),
        competingVariants: [],
      }
    }

    const recallSeedText = normalizeOrganicRecallText(input.recallSeed)
    const hintTexts = input.recollectionIntent?.queryHints ?? []
    const procedureLines = agenda?.candidateProcedureLines ?? []
    const clusterEntries = new Map<string, {
      summary: string
      score: number
      probeCount: number
    }>()
    for (const probe of input.probes) {
      const recallOverlap = countRecallTermOverlap(recallSeedText, probe.text)
      const hintOverlap = hintTexts.length > 0
        ? Math.max(...hintTexts.map(text => countRecallTermOverlap(text, probe.text)), 0)
        : 0
      const procedureOverlap = procedureLines.length > 0
        ? Math.max(...procedureLines.map(text => countRecallTermOverlap(text, probe.text)), 0)
        : 0
      const relationshipStageScore = deriveRelationshipStageAlignmentScore({
        text: probe.text,
        recollectionIntent: input.recollectionIntent,
        hostPersonModel: input.hostPersonModel,
        personStateProjection: input.personStateProjection,
        coreIncarnation: input.coreIncarnation,
        recallSeed: input.recallSeed,
      })
      const carryScore = scoreSceneMoodEmbodiedCarryText({
        text: probe.text,
        carry,
      })
      const baseScore = recallOverlap * 0.44
        + hintOverlap * 0.22
        + procedureOverlap * 0.2
        + relationshipStageScore
        + carryScore * 0.48
        + 0.08
      const current = clusterEntries.get(probe.clusterKey) ?? {
        summary: probe.clusterSummary,
        score: 0,
        probeCount: 0,
      }
      current.score += baseScore
      current.probeCount += 1
      if (probe.clusterSummary.length > current.summary.length)
        current.summary = probe.clusterSummary
      clusterEntries.set(probe.clusterKey, current)
    }

    const rankedClusters = [...clusterEntries.entries()]
      .map(([clusterKey, value]) => ({
        clusterKey,
        summary: value.summary,
        score: Number((value.score / Math.max(1, Math.min(3, value.probeCount))).toFixed(2)),
      }))
      .sort((left, right) => right.score - left.score)

    const dominant = rankedClusters[0] ?? null
    const runnerUp = rankedClusters[1] ?? null
    const strongDominant = Boolean(
      dominant
      && (!runnerUp || dominant.score >= runnerUp.score + 0.12 || dominant.score >= runnerUp.score * 1.18),
    )
    const ambiguous = Boolean(
      dominant
      && runnerUp
      && dominant.score >= 0.14
      && runnerUp.score >= 0.12
      && !strongDominant,
    )
    return {
      dominantClusterKey: dominant?.clusterKey ?? null,
      dominantSummary: dominant?.summary ?? null,
      dominantScore: dominant?.score ?? 0,
      runnerUpClusterKey: runnerUp?.clusterKey ?? null,
      runnerUpSummary: runnerUp?.summary ?? null,
      runnerUpScore: runnerUp?.score ?? 0,
      strongDominant,
      ambiguous,
      clusterScoreByKey: new Map(rankedClusters.map(item => [item.clusterKey, item.score])),
      competingVariants: ambiguous && dominant && runnerUp
        ? [
            {
              id: `cluster:${dominant.clusterKey}`,
              summary: dominant.summary,
              reason: 'A nearby competing thread cluster still matches the current recall cue.',
            },
            {
              id: `cluster:${runnerUp.clusterKey}`,
              summary: runnerUp.summary,
              reason: 'Another remembered thread cluster remains almost as plausible as the current leading one.',
            },
          ]
        : [],
    }
  }

  function rankByClusterDominance<T>(input: {
    items: T[]
    clusterState: MemoryClusterState
    toClusterText: (item: T) => string
  }) {
    if (input.items.length <= 1 || !input.clusterState.dominantClusterKey)
      return input.items

    return [...input.items]
      .map((item, index) => {
        const clusterKey = deriveMemoryClusterKey(input.toClusterText(item))
        const clusterScore = input.clusterState.clusterScoreByKey.get(clusterKey) ?? 0
        const mismatchPenalty = input.clusterState.strongDominant && clusterKey && clusterKey !== input.clusterState.dominantClusterKey
          ? 0.18
          : 0
        return {
          item,
          index,
          score: clusterScore - mismatchPenalty,
        }
      })
      .sort((left, right) => {
        if (left.score !== right.score)
          return right.score - left.score
        return left.index - right.index
      })
      .map(entry => entry.item)
  }

  function rankBySceneMoodEmbodiedCarry<T>(input: {
    items: T[]
    toText: (item: T) => string
    getSceneWeight?: (item: T) => number | null
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }) {
    const carry = deriveAffectiveEmbodiedCarry({
      recallGovernor: input.recallGovernor ?? null,
    })
    if (
      input.items.length <= 1
      || (carry.sceneFamiliarityHint <= 0.14 && carry.moodTexts.length === 0 && carry.embodiedTexts.length === 0)
    ) {
      return input.items
    }

    return [...input.items]
      .map((item, index) => {
        const text = input.toText(item)
        const score = scoreSceneMoodEmbodiedCarryText({
          text,
          sceneWeight: input.getSceneWeight ? input.getSceneWeight(item) : 0,
          carry,
        })
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

  function pickAdditionalIds<T>(input: {
    items: T[]
    count: number
    existingIds?: Set<string>
    biasTexts?: string[]
    getId: (item: T) => string
    getText: (item: T) => string
  }) {
    const existingIds = input.existingIds ?? new Set<string>()
    const biasTexts = input.biasTexts ?? []
    const ranked = biasTexts.length > 0
      ? [...input.items]
          .map((item, index) => ({
            item,
            index,
            score: Math.max(...biasTexts.map(text => countRecallTermOverlap(text, input.getText(item))), 0),
          }))
          .sort((left, right) => {
            if (left.score !== right.score)
              return right.score - left.score
            return left.index - right.index
          })
          .map(entry => entry.item)
      : input.items

    const selected: string[] = []
    for (const item of ranked) {
      const id = input.getId(item)
      if (!id || existingIds.has(id))
        continue
      selected.push(id)
      existingIds.add(id)
      if (selected.length >= input.count)
        break
    }
    return selected
  }

  function collectRecollectionRelationshipLines(input: {
    recollectionIntent: RecollectionIntentSnapshot | null
    recollectionPlan: RecollectionPlanSnapshot | null
    relationshipLineCandidates: AlicizationRelationshipLineCandidate[]
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    selectedConsolidationIds: Set<string>
    selectedEpisodeIds: Set<string>
  }) {
    return uniqueList([
      ...(input.recollectionPlan?.selectedRelationshipLines ?? []),
      ...input.relationshipLineCandidates
        .filter(item => input.selectedEpisodeIds.has(item.sourceId) || input.selectedConsolidationIds.has(item.sourceId))
        .map(item => item.line),
      ...input.recalledEpisodes
        .filter(item => input.selectedEpisodeIds.has(item.id))
        .flatMap(item => [item.relationshipMeaning, item.lesson]),
      ...input.consolidatedMemories
        .filter(item => input.selectedConsolidationIds.has(item.id))
        .flatMap(item => [item.lesson]),
      ...(input.recollectionIntent?.mode === 'relationship-history'
        ? input.recalledEpisodes.slice(0, 2).flatMap(item => [item.relationshipMeaning, item.lesson])
        : []),
    ], 3)
  }

  function resolveRecollectionPlanSearch(input: {
    recollectionIntent: RecollectionIntentSnapshot | null
    recollectionPlan: RecollectionPlanSnapshot | null
    relationshipLineCandidates: AlicizationRelationshipLineCandidate[]
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
    clusterState?: MemoryClusterState | null
  }): RecollectionPlanSnapshot | null {
    const plan = input.recollectionPlan ?? null
    if (!plan)
      return null

    const agenda = input.recollectionIntent?.recollectionAgenda ?? null
    const clusterState = input.clusterState ?? null
    const selectedConsolidationIds = new Set(plan.selectedConsolidationIds)
    const selectedWindowIds = new Set(plan.selectedWindowIds)
    const selectedProceduralIds = new Set(plan.selectedProceduralIds)
    const selectedEpisodeIds = new Set(plan.selectedEpisodeIds)
    const selectedConversationTurnIds = new Set(plan.selectedConversationTurnIds)

    const preferredPrimaryFocus: NonNullable<RecollectionPlanSnapshot['searchTrace']>['firstHop']['focus']
      = plan.searchTrace?.firstHop.focus
        ?? (
          selectedProceduralIds.size > 0 || input.recollectionIntent?.mode === 'execution-procedure' || input.recollectionIntent?.mode === 'experience-pattern' || (agenda?.goalSimilarity ?? 0) >= 0.58
            ? 'procedure'
            : (
                (agenda?.relationshipNeed ?? 0) >= 0.5 || input.recollectionIntent?.mode === 'relationship-history'
                  ? 'relationship-line'
                  : selectedConsolidationIds.size > 0 || selectedWindowIds.size > 0 || (agenda?.candidateEraFacets.length ?? 0) > 0
                    ? 'era'
                    : input.recollectionIntent?.mode === 'conversation-history' || selectedConversationTurnIds.size > 0
                      ? 'conversation-turn'
                      : 'episode'
              )
        )

    const addPrimaryEraIfNeeded = () => {
      if (selectedConsolidationIds.size > 0 || selectedWindowIds.size > 0)
        return
      const preferredFacet = agenda?.candidateEraFacets[0]?.facet ?? null
      const preferredConsolidation = input.consolidatedMemories.find(item => !preferredFacet || item.facet === preferredFacet || preferredFacet === 'window')
      if (preferredConsolidation) {
        selectedConsolidationIds.add(preferredConsolidation.id)
        return
      }
      const preferredWindow = input.recollectedWindows[0]
      if (preferredWindow)
        selectedWindowIds.add(preferredWindow.id)
    }

    const addPrimaryProcedureIfNeeded = () => {
      if (selectedProceduralIds.size > 0)
        return
      const selected = pickAdditionalIds({
        items: input.proceduralMemories,
        count: 1,
        existingIds: selectedProceduralIds,
        biasTexts: [
          ...(agenda?.candidateProcedureLines ?? []),
          ...(plan.selectedRelationshipLines ?? []),
        ],
        getId: item => item.id,
        getText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
      })
      for (const id of selected)
        selectedProceduralIds.add(id)
    }

    const selectedRelationshipLines = (() => {
      const baseline = collectRecollectionRelationshipLines({
        recollectionIntent: input.recollectionIntent,
        recollectionPlan: plan,
        relationshipLineCandidates: input.relationshipLineCandidates,
        consolidatedMemories: input.consolidatedMemories,
        recalledEpisodes: input.recalledEpisodes,
        selectedConsolidationIds,
        selectedEpisodeIds,
      })
      if (baseline.length > 0)
        return baseline
      if (preferredPrimaryFocus !== 'relationship-line')
        return baseline
      return uniqueList([
        ...input.relationshipLineCandidates.slice(0, 3).map(item => item.line),
        ...input.recalledEpisodes.slice(0, 2).flatMap(item => [item.relationshipMeaning, item.lesson]),
        ...input.consolidatedMemories.slice(0, 2).map(item => item.lesson),
      ], 3)
    })()

    const selectedEraTexts = [
      ...input.consolidatedMemories
        .filter(item => selectedConsolidationIds.has(item.id))
        .flatMap(item => [item.summary, item.lesson ?? '', ...item.cues]),
      ...input.recollectedWindows
        .filter(item => selectedWindowIds.has(item.id))
        .flatMap(item => [item.summary, ...item.cues]),
    ].filter(Boolean)
    const selectedProcedureTexts = [
      ...(agenda?.candidateProcedureLines ?? []),
      ...input.proceduralMemories
        .filter(item => selectedProceduralIds.has(item.id))
        .flatMap(item => [item.label, item.approach, ...(item.cues ?? [])]),
    ].filter(Boolean)
    const relationshipBiasTexts = selectedRelationshipLines.length > 0
      ? selectedRelationshipLines
      : uniqueList([
          ...input.relationshipLineCandidates.slice(0, 3).map(item => item.line),
          ...input.recalledEpisodes.slice(0, 2).flatMap(item => [item.relationshipMeaning, item.lesson]),
        ], 3)

    let secondHopAction: NonNullable<RecollectionPlanSnapshot['searchTrace']>['secondHop']['action'] = plan.searchTrace?.secondHop.action ?? 'hold'
    let evidenceGap: NonNullable<RecollectionPlanSnapshot['searchTrace']>['secondHop']['evidenceGap'] = plan.searchTrace?.secondHop.evidenceGap ?? 'none'
    const secondHopTargetIds: string[] = []

    if (preferredPrimaryFocus === 'procedure') {
      addPrimaryProcedureIfNeeded()
      if (selectedConsolidationIds.size === 0 && selectedWindowIds.size === 0) {
        addPrimaryEraIfNeeded()
        secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-procedure'
        evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-period-anchor'
      }
      if (selectedEpisodeIds.size === 0) {
        const selected = pickAdditionalIds({
          items: input.recalledEpisodes,
          count: 2,
          existingIds: selectedEpisodeIds,
          biasTexts: selectedProcedureTexts,
          getId: item => item.id,
          getText: item => [item.threadAnchor, item.whatHappened, item.lesson, ...(item.tags ?? [])].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedEpisodeIds.add(id)
        secondHopTargetIds.push(...selected)
        if (selected.length > 0) {
          secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-procedure'
          evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-episode-detail'
        }
      }
    }
    else if (preferredPrimaryFocus === 'relationship-line') {
      if ((agenda?.candidateEraFacets.some(item => item.facet === 'relationship-era') ?? false) && selectedConsolidationIds.size === 0 && selectedWindowIds.size === 0)
        addPrimaryEraIfNeeded()
      if (selectedEpisodeIds.size === 0) {
        const selected = pickAdditionalIds({
          items: input.recalledEpisodes,
          count: 2,
          existingIds: selectedEpisodeIds,
          biasTexts: relationshipBiasTexts,
          getId: item => item.id,
          getText: item => [item.relationshipMeaning, item.lesson, item.whatHappened, ...(item.tags ?? [])].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedEpisodeIds.add(id)
        secondHopTargetIds.push(...selected)
      }
      if (selectedConversationTurnIds.size === 0 && input.recollectionIntent?.mode === 'relationship-history') {
        const selected = pickAdditionalIds({
          items: input.recalledConversationHistory,
          count: 1,
          existingIds: selectedConversationTurnIds,
          biasTexts: relationshipBiasTexts,
          getId: item => item.turnId ?? '',
          getText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedConversationTurnIds.add(id)
        secondHopTargetIds.push(...selected)
      }
      if (secondHopTargetIds.length > 0) {
        secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-relationship-line'
        evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? (
          selectedEpisodeIds.size > 0 ? 'need-relationship-meaning' : 'need-conversation-evidence'
        )
      }
    }
    else if (preferredPrimaryFocus === 'era') {
      addPrimaryEraIfNeeded()
      if (selectedEpisodeIds.size === 0) {
        const selected = pickAdditionalIds({
          items: rankByEraAffinity({
            items: input.recalledEpisodes,
            eraTexts: selectedEraTexts,
            toText: item => [item.threadAnchor, item.whatHappened, item.lesson, ...(item.tags ?? [])].filter(Boolean).join(' '),
          }),
          count: 2,
          existingIds: selectedEpisodeIds,
          getId: item => item.id,
          getText: item => [item.threadAnchor, item.whatHappened, item.lesson, ...(item.tags ?? [])].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedEpisodeIds.add(id)
        secondHopTargetIds.push(...selected)
        if (selected.length > 0) {
          secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-era'
          evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-episode-detail'
        }
      }
      if ((input.recollectionIntent?.mode === 'execution-procedure' || input.recollectionIntent?.mode === 'experience-pattern' || (agenda?.goalSimilarity ?? 0) >= 0.5) && selectedProceduralIds.size === 0) {
        const selected = pickAdditionalIds({
          items: rankByEraAffinity({
            items: input.proceduralMemories,
            eraTexts: selectedEraTexts.length > 0 ? selectedEraTexts : selectedProcedureTexts,
            toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
          }),
          count: 1,
          existingIds: selectedProceduralIds,
          getId: item => item.id,
          getText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedProceduralIds.add(id)
        secondHopTargetIds.push(...selected)
        secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-era'
        evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-procedure-detail'
      }
      if (selectedConversationTurnIds.size === 0 && input.recollectionIntent?.mode === 'conversation-history') {
        const selected = pickAdditionalIds({
          items: rankByEraAffinity({
            items: input.recalledConversationHistory,
            eraTexts: selectedEraTexts,
            toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
          }),
          count: 1,
          existingIds: selectedConversationTurnIds,
          getId: item => item.turnId ?? '',
          getText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedConversationTurnIds.add(id)
        secondHopTargetIds.push(...selected)
        secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-conversation'
        evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-conversation-evidence'
      }
    }
    else if (preferredPrimaryFocus === 'conversation-turn') {
      if (selectedConversationTurnIds.size === 0) {
        const selected = pickAdditionalIds({
          items: input.recalledConversationHistory,
          count: 1,
          existingIds: selectedConversationTurnIds,
          biasTexts: [
            ...(agenda?.candidateProcedureLines ?? []),
            ...(plan.selectedRelationshipLines ?? []),
          ],
          getId: item => item.turnId ?? '',
          getText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedConversationTurnIds.add(id)
        secondHopTargetIds.push(...selected)
        if (selected.length > 0) {
          secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-conversation'
          evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-conversation-evidence'
        }
      }
      if (selectedConsolidationIds.size === 0 && selectedWindowIds.size === 0) {
        addPrimaryEraIfNeeded()
        secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-conversation'
        evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-period-anchor'
      }
    }
    else {
      if (selectedEpisodeIds.size === 0) {
        const selected = pickAdditionalIds({
          items: input.recalledEpisodes,
          count: 1,
          existingIds: selectedEpisodeIds,
          biasTexts: [
            ...selectedProcedureTexts,
            ...relationshipBiasTexts,
          ],
          getId: item => item.id,
          getText: item => [item.threadAnchor, item.whatHappened, item.lesson].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedEpisodeIds.add(id)
        secondHopTargetIds.push(...selected)
      }
    }

    const selectedEpisodes = input.recalledEpisodes.filter(item => selectedEpisodeIds.has(item.id))
    const conflictingVariants = selectedEpisodes.filter(item => {
      const provenance = item.latestReconsolidation?.provenance ?? item.provenance
      return provenance === 'reconstructed' || provenance === 'dreamt' || provenance === 'inferred'
    })
    const ambiguityPosture: NonNullable<RecollectionPlanSnapshot['searchTrace']>['thirdHop']['ambiguityPosture']
      = plan.searchTrace?.thirdHop.ambiguityPosture
        ?? (clusterState?.ambiguous ? 'ambiguous' : null)
        ?? (
          conflictingVariants.length >= 2
            ? 'ambiguous'
            : conflictingVariants.length === 1 || plan.certainty !== 'firm' || secondHopTargetIds.length > 0
              ? 'approximate'
              : 'settled'
        )

    const firstHopTargetIds = preferredPrimaryFocus === 'era'
      ? [...selectedConsolidationIds, ...selectedWindowIds].slice(0, 3)
      : preferredPrimaryFocus === 'procedure'
        ? [...selectedProceduralIds].slice(0, 2)
        : preferredPrimaryFocus === 'relationship-line'
          ? [...selectedEpisodeIds].slice(0, 2)
          : preferredPrimaryFocus === 'conversation-turn'
            ? [...selectedConversationTurnIds].slice(0, 2)
            : [...selectedEpisodeIds].slice(0, 2)

    const firstHopSummary = plan.searchTrace?.firstHop.summary
      ?? (
        preferredPrimaryFocus === 'procedure'
          ? 'The recollection first grabs the remembered way of handling this kind of task.'
          : preferredPrimaryFocus === 'relationship-line'
            ? 'The recollection first grabs a remembered relationship meaning before exact detail.'
            : preferredPrimaryFocus === 'era'
              ? 'The recollection first grabs a remembered period or era before unpacking fragments.'
              : preferredPrimaryFocus === 'conversation-turn'
                ? 'The recollection first grabs one remembered exchange before broadening out.'
                : 'The recollection first grabs one remembered episode.'
      )
    const secondHopSummary = plan.searchTrace?.secondHop.summary
      ?? (
        secondHopAction === 'hold'
          ? 'The first remembered anchor already carries enough evidence, so the search does not need to widen.'
          : secondHopAction === 'narrow-to-stable-core'
            ? 'The search narrows toward the stable core because remembered variants do not fully agree.'
            : 'The search expands from the first anchor to gather enough remembered evidence for a coherent answer.'
      )
    const thirdHopSummary = plan.searchTrace?.thirdHop.summary
      ?? (
        ambiguityPosture === 'ambiguous'
          ? clusterState?.dominantSummary && clusterState?.runnerUpSummary
            ? `The recollection leans toward "${clusterState.dominantSummary}" but "${clusterState.runnerUpSummary}" still shadows it, so the answer should stay ambiguity-aware.`
            : 'The remembered material still branches in more than one direction, so the answer should stay openly ambiguity-aware.'
          : ambiguityPosture === 'approximate'
            ? 'The remembered material is usable but not exact, so the answer should stay approximate.'
            : 'The remembered material feels coherent enough to be carried with normal confidence.'
      )

    const certainty: RecollectionPlanSnapshot['certainty']
      = ambiguityPosture === 'ambiguous'
        ? 'fragmentary'
        : ambiguityPosture === 'approximate' && plan.certainty === 'firm'
          ? 'approximate'
          : plan.certainty

    return {
      ...plan,
      selectedConsolidationIds: [...selectedConsolidationIds].slice(0, 6),
      selectedWindowIds: [...selectedWindowIds].slice(0, 6),
      selectedProceduralIds: [...selectedProceduralIds].slice(0, 6),
      selectedEpisodeIds: [...selectedEpisodeIds].slice(0, 6),
      selectedConversationTurnIds: [...selectedConversationTurnIds].slice(0, 6),
      selectedRelationshipLines,
      certainty,
      searchTrace: {
        firstHop: {
          focus: preferredPrimaryFocus,
          summary: firstHopSummary,
          targetIds: plan.searchTrace?.firstHop.targetIds?.length ? plan.searchTrace.firstHop.targetIds.slice(0, 6) : firstHopTargetIds,
        },
        secondHop: {
          action: secondHopAction,
          evidenceGap,
          summary: secondHopSummary,
          targetIds: plan.searchTrace?.secondHop.targetIds?.length ? plan.searchTrace.secondHop.targetIds.slice(0, 6) : secondHopTargetIds.slice(0, 6),
        },
        thirdHop: {
          ambiguityPosture,
          summary: thirdHopSummary,
        },
      },
    } satisfies RecollectionPlanSnapshot
  }

  function applyMemoryDeliberationToSpeechPlan(input: {
    deliberation: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']> | null
    speechPlan: NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']> | null
  }) {
    const deliberation = input.deliberation ?? null
    const speechPlan = input.speechPlan ?? null
    if (!deliberation)
      return speechPlan

    const shouldSurface = deliberation.shouldRecall && deliberation.surfacePolicy !== 'internal-only'
    return {
      shouldSurface,
      surfaceMode: shouldSurface ? deliberation.surfacePolicy : 'internal-only',
      placement: shouldSurface
        ? (speechPlan?.placement && speechPlan.placement !== 'internal-only'
            ? speechPlan.placement
            : deliberation.surfacePolicy === 'gist-first'
              ? 'before-payoff'
              : 'inside-payoff')
        : 'internal-only',
      certainty: speechPlan?.certainty ?? 'approximate',
      internalLead: deliberation.inwardLine || speechPlan?.internalLead || '',
      visibleLead: shouldSurface
        ? deliberation.visibleLine || speechPlan?.visibleLead || null
        : null,
      styleNote: speechPlan?.styleNote || 'Let recollection contour the answer without turning into a rigid reply shell.',
      rationale: deliberation.whyNow || speechPlan?.rationale || '',
      confidence: deliberation.confidence,
    } satisfies NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']>
  }

  function rankMemoryDeliberationBundles(input: {
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
    bundles: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedBundles']
  }) {
    const intentMode = input.recollectionIntent?.mode ?? 'none'
    return [...input.bundles]
      .map((bundle) => {
        let coherence = 0
        if (bundle.periodId && bundle.episodeId)
          coherence += 0.18
        if (bundle.procedureId && bundle.episodeId)
          coherence += 0.18
        if (bundle.relationshipLine)
          coherence += 0.12
        if (bundle.conversationTurnId)
          coherence += 0.1
        if (bundle.procedureId && (intentMode === 'execution-procedure' || intentMode === 'experience-pattern'))
          coherence += 0.22
        if (bundle.conversationTurnId && intentMode === 'conversation-history')
          coherence += 0.2
        if (bundle.periodId && (intentMode === 'autobiographical-history' || intentMode === 'relationship-history'))
          coherence += 0.16
        if (bundle.relationshipLine && intentMode === 'relationship-history')
          coherence += 0.18
        return {
          bundle,
          score: bundle.confidence + coherence,
        }
      })
      .sort((left, right) => right.score - left.score)
      .map(item => item.bundle)
      .slice(0, 4)
  }

  function rankMemoryDeliberationChains(input: {
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
    chains: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedChains']
  }) {
    const intentMode = input.recollectionIntent?.mode ?? 'none'
    return [...input.chains]
      .map((chain) => {
        let coherence = 0
        if (chain.currentStance)
          coherence += 0.12
        if (chain.answerPosture)
          coherence += 0.14
        if (chain.periodSummary && chain.eventSummary)
          coherence += 0.16
        if (chain.procedureSummary && chain.relationshipMeaning)
          coherence += 0.16
        if (chain.lesson)
          coherence += 0.1
        if (chain.kind === 'task-procedure-relationship-stance' && (intentMode === 'execution-procedure' || intentMode === 'experience-pattern'))
          coherence += 0.24
        if (chain.kind === 'period-event-lesson-posture' && (intentMode === 'relationship-history' || intentMode === 'autobiographical-history' || intentMode === 'conversation-history'))
          coherence += 0.22
        return {
          chain,
          score: chain.confidence + coherence,
        }
      })
      .sort((left, right) => right.score - left.score)
      .map(item => item.chain)
      .slice(0, 4)
  }

  function selectMemoryDeliberationEras(input: {
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
    selectedEraIds: string[]
    selectedConsolidationIds: string[]
    selectedWindowIds: string[]
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
  }) {
    const eraCandidates = [
      ...input.consolidatedMemories.map(item => ({
        id: item.id,
        facet: item.facet ?? 'phase',
        summary: item.summary,
        confidence: item.confidence,
      })),
      ...input.recollectedWindows.map(item => ({
        id: item.id,
        facet: 'window' as const,
        summary: item.summary,
        confidence: item.confidence,
      })),
    ]
    const selectedEraIds = new Set(
      input.selectedEraIds.length > 0
        ? input.selectedEraIds
        : [
            ...input.selectedConsolidationIds,
            ...input.selectedWindowIds,
          ],
    )
    const preferredAgendaFacets = (input.recollectionIntent?.recollectionAgenda?.candidateEraFacets ?? [])
      .slice()
      .sort((left, right) => right.weight - left.weight)
      .map(item => item.facet)
    const inferredFacet = input.recollectionIntent?.mode === 'relationship-history'
      ? 'relationship-era'
      : input.recollectionIntent?.mode === 'execution-procedure' || input.recollectionIntent?.mode === 'experience-pattern'
        ? 'task-era'
        : input.recollectionIntent?.mode === 'autobiographical-history'
          ? 'self-era'
          : null
    const prioritized = selectedEraIds.size > 0
      ? eraCandidates.filter(item => selectedEraIds.has(item.id))
      : preferredAgendaFacets.length > 0
        ? eraCandidates.filter(item => preferredAgendaFacets.includes(item.facet as typeof preferredAgendaFacets[number]) || item.facet === 'window')
      : inferredFacet
        ? eraCandidates.filter(item => item.facet === inferredFacet || item.facet === 'window')
        : eraCandidates
    return [...prioritized]
      .sort((left, right) => right.confidence - left.confidence)
      .map(item => ({
        id: item.id,
        facet: item.facet,
        summary: item.summary,
      }))
      .slice(0, 3)
  }

  function deriveMemoryDeliberationConflictState(input: {
    deliberation: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']> | null
    episodes: AlicizationEpisodicEventRecord[]
    periods: Array<{ summary: string }>
    procedures: Array<{ approach: string, label: string }>
    relationshipLines: string[]
    reconstructionPass?: {
      candidates: Array<{ id: string, summary: string, reason?: string | null }>
      stableCore: string[]
      unsafeDetails: string[]
    } | null
    interferenceVariants?: Array<{ id: string, summary: string, reason: string }>
  }): Pick<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>, 'conflictSeverity' | 'conflictVariants' | 'stableCore' | 'unsafeDetails'> {
    const explicitVariants: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']> = input.deliberation?.conflictVariants ?? []
    const inferredVariants: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']> = input.episodes
      .filter(item => (item.latestReconsolidation?.provenance ?? item.provenance) === 'reconstructed')
      .map(item => ({
        id: item.id,
        summary: item.whatHappened,
        provenance: item.latestReconsolidation?.provenance ?? item.provenance,
          reason: item.latestReconsolidation?.reason ?? null,
        }))
    const reconstructionVariants: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']> = (input.reconstructionPass?.candidates ?? [])
      .map(item => ({
        id: item.id,
        summary: item.summary,
        provenance: 'reconstructed' as const,
        reason: item.reason ?? null,
      }))
    const interferenceVariants: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']> = (input.interferenceVariants ?? [])
      .map(item => ({
        id: item.id,
        summary: item.summary,
        provenance: 'reconstructed' as const,
        reason: item.reason,
      }))
    const conflictVariantsRaw: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']> = explicitVariants.length > 0
      ? explicitVariants
      : [...inferredVariants, ...reconstructionVariants, ...interferenceVariants]
    const dedupedConflictVariants = new Map<string, NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']>[number]>()
    for (const variant of conflictVariantsRaw) {
      const key = `${variant.id}:${variant.summary}:${variant.provenance}`.toLowerCase()
      if (!dedupedConflictVariants.has(key))
        dedupedConflictVariants.set(key, variant)
    }
    const conflictVariants: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']> = [...dedupedConflictVariants.values()]

    const explicitSeverity = input.deliberation?.conflictSeverity
    const inferredSeverity: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictSeverity']> = conflictVariants.length >= 2
      ? 'high'
      : conflictVariants.length === 1
        ? 'medium'
        : input.episodes.some(item => (item.latestReconsolidation?.provenance ?? item.provenance) === 'dreamt' || (item.latestReconsolidation?.provenance ?? item.provenance) === 'inferred')
          ? 'low'
          : 'none'
    const conflictSeverity: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictSeverity']> = explicitSeverity && explicitSeverity !== 'none'
      ? explicitSeverity
      : inferredSeverity

    const stableCore = (input.deliberation?.stableCore?.length ?? 0) > 0
      ? input.deliberation?.stableCore ?? []
      : uniqueList([
          ...(input.reconstructionPass?.stableCore ?? []),
          ...input.periods.map(item => item.summary),
          ...input.procedures.flatMap(item => [item.label, item.approach]),
          ...input.relationshipLines,
        ], 6)

    const unsafeDetails = (input.deliberation?.unsafeDetails?.length ?? 0) > 0
      ? input.deliberation?.unsafeDetails ?? []
      : uniqueList([
          ...(input.reconstructionPass?.unsafeDetails ?? []),
          ...conflictVariants.flatMap(item => [item.summary, item.reason]),
        ], 6)

    return {
      conflictSeverity,
      conflictVariants: conflictVariants.slice(0, 4),
      stableCore,
      unsafeDetails,
    }
  }

  async function resolveOrganicMemoryPromptContext(options?: {
    recallSeed?: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    sessionId?: string | null
    turnId?: string | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
  }): Promise<OrganicMemoryPromptContext> {
    const budgetClass = options?.budgetClass ?? 'realtime-reply'
    const retrievalPolicySnapshot = await (
      resolveTurnRetrievalPolicySnapshot
      ?? (async (input: {
        recallSeed: string
        recallGovernor?: AlicizationRecallGovernorSnapshot | null
        budgetClass?: AlicizationMemoryRetrievalBudgetClass
      }) => buildAlicizationTurnRetrievalPolicySnapshot({
        recallSeed: input.recallSeed,
        recallGovernor: input.recallGovernor ?? null,
        budgetClass: input.budgetClass,
        telemetry: null,
        tuningAdvice: null,
      }))
    )({
      recallSeed: options?.recallSeed ?? options?.recallGovernor?.recallSeed ?? '',
      recallGovernor: options?.recallGovernor ?? null,
      budgetClass,
    })
    const preludeStartedAt = Date.now()
    void recordOrganicMemoryStageBudget?.({
      stage: 'search-prelude',
      budgetClass: retrievalPolicySnapshot.plan.budgetClass,
    }).catch(() => {})
    const {
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
    } = await resolveMemorySearchPrelude({
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
      recallSeed: options?.recallSeed,
      recallGovernor: options?.recallGovernor ?? null,
      sessionId: options?.sessionId ?? null,
      turnId: options?.turnId ?? null,
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
        turnId: options?.turnId ?? undefined,
      }).catch(() => []) ?? Promise.resolve([]),
      listMemoryReflections?.({
        limit: 8,
        turnId: options?.turnId ?? undefined,
      }).catch(() => []) ?? Promise.resolve([]),
    ])
    const personStateProjection = buildMemoryPromptPersonStateProjection({
      recallSeed,
      recollectionIntent: activeRecollectionIntent,
      hostPersonModel,
      personStateEvolutionSummary,
    })
    const candidateGenerationStartedAt = Date.now()
    void recordOrganicMemoryStageBudget?.({
      stage: 'candidate-generation',
      budgetClass: retrievalPolicySnapshot.plan.budgetClass,
    }).catch(() => {})
    const {
      recalledConversationHistory,
      consolidatedMemories,
      recollectedWindows,
      proceduralMemories,
      relationshipLineCandidates,
    } = await retrieveMemorySearchCandidates({
      access: {
        recallConversationHistory,
        recallMemoryConsolidations,
      },
      recallSeed,
      recollectionIntent: activeRecollectionIntent,
      recalledEpisodes,
      budgetClass: retrievalPolicySnapshot.plan.budgetClass,
      retrievalPolicySnapshot,
    })
    void recordMemoryCandidateGenerationLatency?.(Date.now() - candidateGenerationStartedAt).catch(() => {})
    void recordOrganicMemoryStageLatency?.({
      stage: 'candidate-generation',
      latencyMs: Date.now() - candidateGenerationStartedAt,
    }).catch(() => {})
    const candidateRankingStartedAt = Date.now()
    void recordOrganicMemoryStageBudget?.({
      stage: 'candidate-ranking',
      budgetClass: retrievalPolicySnapshot.plan.budgetClass,
    }).catch(() => {})
    const {
      clusterState,
      agendaRankedConsolidatedMemoriesClustered,
      agendaRankedWindowsClustered,
      agendaRankedProceduralMemories,
      agendaRankedEpisodes,
      agendaRankedConversationHistory,
    } = rankOrganicMemoryCandidatesStage({
      helpers: {
        deriveMemoryClusterKey,
        rankByHostSocialAffinity,
        rankBySceneMoodEmbodiedCarry,
        rankByBenchmarkTuningBias,
        rankByRecollectionAgendaAffinity,
        analyzeMemoryClusters,
        rankByClusterDominance,
      },
      recallSeed,
      activeRecollectionIntent,
      hostPersonModel,
      personStateProjection,
      coreIncarnation: snapshot.coreIncarnation,
      memoryTuningAdvice,
      recallGovernor: options?.recallGovernor ?? null,
      consolidatedMemories,
      recollectedWindows,
      proceduralMemories,
      recalledEpisodes,
      recalledConversationHistory,
    })
    void recordOrganicMemoryStageLatency?.({
      stage: 'candidate-ranking',
      latencyMs: Date.now() - candidateRankingStartedAt,
    }).catch(() => {})
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
      activeRecollectionIntent,
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
      recollectionIntent,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      personStateProjection,
      recallLatencyPolicy: deriveAlicizationRecallLatencyPolicy({
        recallSeed,
        recollectionIntent: activeRecollectionIntent,
        budgetClass,
      }),
      recentRelationshipOutcomes,
      recentMemoryReflections,
      relationshipDynamics,
    })
    const initialRecallLatencyPolicy = deriveAlicizationRecallLatencyPolicy({
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
      shouldRecall: rawMemoryDeliberation?.shouldRecall ?? Boolean(recollectionPlan),
      finalSurfacePolicy: rawMemoryDeliberation?.surfacePolicy ?? null,
      stableCoreCount: rawMemoryDeliberation?.stableCore?.length ?? initialReconstructionPass.stableCore.length,
      unsafeDetailCount: rawMemoryDeliberation?.unsafeDetails?.length ?? initialReconstructionPass.unsafeDetails.length,
    })
    const recallPlannerDecision = planAlicizationRecall({
      recollectionIntent: activeRecollectionIntent,
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
          recollectionIntent: activeRecollectionIntent,
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
              || constrainedDeliberatedEpisodes.some(item => {
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
                recollectionIntent: activeRecollectionIntent,
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
            recollectionIntent: activeRecollectionIntent,
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
            recollectionIntent: activeRecollectionIntent,
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
            recollectionIntent: activeRecollectionIntent,
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
      recollectionIntent,
      recollectionPlan: finalRecollectionPlan,
      recollectionSpeechPlan: effectiveRecollectionSpeechPlan,
      memoryDeliberation: resolvedMemoryDeliberation,
      claimEvidenceGraphs,
      personStateProjection,
      learningExecutionState: snapshot.learningExecutionState ?? null,
      recallLatencyPolicy,
      affectiveResidue,
      recentRelationshipOutcomes,
      recentMemoryReflections,
      relationshipDynamics,
    })
    void recordOrganicMemoryStageLatency?.({
      stage: 'self-evolution-integration',
      latencyMs: Date.now() - selfEvolutionStartedAt,
    }).catch(() => {})
    const memoryStageReplay = buildOrganicMemoryStageReplaySnapshot({
      producedAt: Date.now(),
      stages: [
        {
          stage: 'search-prelude',
          summary: 'Resolved recall seed, relationship dynamics, host model, and heuristic recollection intent.',
          latencyMs: Date.now() - preludeStartedAt,
          budgetClass,
          inputs: [options?.recallSeed ?? '', options?.turnId ?? '', options?.sessionId ?? ''],
          outputs: [recallSeed, activeRecollectionIntent?.mode ?? 'none', hostPersonModel?.trustLadder.stage ?? 'no-host-model'],
          diagnostics: [recollectionIntent?.rationale ?? '', activeRecollectionIntent?.rationale ?? '', `recall-action=${initialRecallLatencyPolicy.recallAction}`],
        },
        {
          stage: 'candidate-generation',
          summary: 'Collected raw memory candidates across conversation, consolidation, window, procedure, and episode surfaces.',
          latencyMs: Date.now() - candidateGenerationStartedAt,
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
          latencyMs: Date.now() - candidateRankingStartedAt,
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
    const memoryResolutionLedger = buildMemoryResolutionLedger({
      producedAt: Date.now(),
      clusterState,
      finalMemoryDeliberation: resolvedMemoryDeliberation,
      finalRecollectionPlan,
    })
    return {
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
      derivedMindStateBundle,
      memoryStageReplay,
      memoryResolutionLedger,
      memorySituationCandidates,
    }
  }

  return {
    buildProactiveRecallSeed: (input: Parameters<typeof buildOrganicMemoryProactiveRecallSeed>[0]) => buildOrganicMemoryProactiveRecallSeed(input, normalizeOrganicRecallText),
    buildOrganicMemorySystemBlocks,
    tuneOrganicMemoryPromptContextForExecutiveTurn: tuneExecutiveOrganicMemoryPromptContext,
    buildPerformanceManifestSystemBlocks: buildPerformanceManifestBlocks,
    resolveOrganicMemoryPromptContext,
  }
}
