import type { AlicizationEpisodicEventRecord } from '../../../../shared/eventa'
import type { AlicizationRelationshipLineCandidate } from '../memory-search-retrieval-operators'
import type {
  MemoryClusterState,
  MemoryDeliberationSnapshot,
  RecollectionIntentSnapshot,
  RecollectionPlanSnapshot,
} from '../runtime-organic-memory-prompt-types'
import type { OrganicMemoryPromptContext } from '../runtime-soul'

import { buildAlicizationMemoryRestraintJudge } from '../memory-restraint-judge'
import { sanitizeOrganicMemoryText } from '../runtime-organic-memory-search-prelude'
import {
  buildUniqueMemoryPlanningOwnerIdIndex,
  normalizeMemoryPlanningId,
  resolveMemoryPlanningOwnerIds,
} from './planning-identifiers'

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

function countRecallTermOverlap(base: string, candidate: string) {
  const normalize = (text: string) => sanitizeOrganicMemoryText(text, 260).toLowerCase().split(/\s+/u).filter(term => term.length >= 2)
  const baseTerms = new Set(normalize(base))
  if (baseTerms.size === 0)
    return 0
  const candidateTerms = new Set(normalize(candidate))
  if (candidateTerms.size === 0)
    return 0
  let overlap = 0
  for (const term of candidateTerms) {
    if (baseTerms.has(term))
      overlap += 1
  }
  return overlap / candidateTerms.size
}

export function rankByEraAffinity<T>(input: {
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

export function deriveMemoryFollowUpAffordance(input: {
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
    || (deliberation.surfacePolicy === 'answer-anchoring' && Boolean(procedureLine))
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
          ? 'relationship_recall=active; surface_timing=defer_until_repair_or_payoff_room; crowding_risk=high'
          : 'relationship_recall=active; surface_timing=after_present_answer_room'
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

export function resolveRecollectionPlanSearch(input: {
  recollectionIntent: RecollectionIntentSnapshot | null
  recollectionPlan: RecollectionPlanSnapshot | null
  relationshipLineCandidates: AlicizationRelationshipLineCandidate[]
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
  proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
  recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  clusterState?: MemoryClusterState | null
}) {
  const plan = input.recollectionPlan ?? null
  if (!plan)
    return null

  const consolidationIdIndex = buildUniqueMemoryPlanningOwnerIdIndex(
    input.consolidatedMemories,
    item => item.id,
  )
  const windowIdIndex = buildUniqueMemoryPlanningOwnerIdIndex(
    input.recollectedWindows,
    item => item.id,
  )
  const procedureIdIndex = buildUniqueMemoryPlanningOwnerIdIndex(
    input.proceduralMemories,
    item => item.id,
  )
  const episodeIdIndex = buildUniqueMemoryPlanningOwnerIdIndex(
    input.recalledEpisodes,
    item => item.id,
  )
  const conversationTurnIdIndex = buildUniqueMemoryPlanningOwnerIdIndex(
    input.recalledConversationHistory,
    item => item.turnId,
  )
  const targetIdIndex = buildUniqueMemoryPlanningOwnerIdIndex([
    ...input.consolidatedMemories.map(item => ({ id: item.id })),
    ...input.recollectedWindows.map(item => ({ id: item.id })),
    ...input.proceduralMemories.map(item => ({ id: item.id })),
    ...input.recalledEpisodes.map(item => ({ id: item.id })),
    ...input.recalledConversationHistory.map(item => ({ id: item.turnId })),
  ], item => item.id)
  const selectedConsolidationIds = resolveMemoryPlanningOwnerIds(
    plan.selectedConsolidationIds,
    consolidationIdIndex,
  )
  const selectedWindowIds = resolveMemoryPlanningOwnerIds(
    plan.selectedWindowIds,
    windowIdIndex,
  )
  const selectedProceduralIds = resolveMemoryPlanningOwnerIds(
    plan.selectedProceduralIds,
    procedureIdIndex,
  )
  const selectedEpisodeIds = resolveMemoryPlanningOwnerIds(
    plan.selectedEpisodeIds,
    episodeIdIndex,
  )
  const selectedConversationTurnIds = resolveMemoryPlanningOwnerIds(
    plan.selectedConversationTurnIds,
    conversationTurnIdIndex,
  )
  const selectedConsolidationIdSet = new Set(selectedConsolidationIds.map(normalizeMemoryPlanningId))
  const selectedEpisodeIdSet = new Set(selectedEpisodeIds.map(normalizeMemoryPlanningId))
  const selectedConversationTurnIdSet = new Set(selectedConversationTurnIds.map(normalizeMemoryPlanningId))
  const selectedRelationshipLines = uniqueList([
    ...input.relationshipLineCandidates
      .filter((item) => {
        const sourceId = normalizeMemoryPlanningId(item.sourceId)
        if (item.sourceKind === 'consolidation')
          return selectedConsolidationIdSet.has(sourceId)
        if (item.sourceKind === 'episode')
          return selectedEpisodeIdSet.has(sourceId)
        return selectedConversationTurnIdSet.has(sourceId)
      })
      .map(item => item.line),
    ...input.recalledEpisodes
      .filter(item => selectedEpisodeIds.includes(item.id))
      .flatMap(item => [item.relationshipMeaning, item.lesson]),
    ...input.consolidatedMemories
      .filter(item => selectedConsolidationIds.includes(item.id))
      .map(item => item.lesson),
  ], 3)
  const searchTrace = plan.searchTrace
    ? {
        ...plan.searchTrace,
        firstHop: {
          ...plan.searchTrace.firstHop,
          targetIds: resolveMemoryPlanningOwnerIds(
            plan.searchTrace.firstHop.targetIds,
            targetIdIndex,
          ),
        },
        secondHop: {
          ...plan.searchTrace.secondHop,
          targetIds: resolveMemoryPlanningOwnerIds(
            plan.searchTrace.secondHop.targetIds,
            targetIdIndex,
          ),
        },
      }
    : null

  return {
    ...plan,
    selectedConsolidationIds,
    selectedWindowIds,
    selectedProceduralIds,
    selectedEpisodeIds,
    selectedConversationTurnIds,
    selectedRelationshipLines,
    searchTrace,
    opening: '',
  } satisfies RecollectionPlanSnapshot
}

export function applyMemoryDeliberationToSpeechPlan(input: {
  deliberation: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']> | null
  speechPlan: NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']> | null
  hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
}) {
  const deliberation = input.deliberation ?? null
  const speechPlan = input.speechPlan ?? null
  if (!deliberation)
    return speechPlan

  const preliminaryShouldSurface = deliberation.shouldRecall && deliberation.surfacePolicy !== 'internal-only'
  const restraint = buildAlicizationMemoryRestraintJudge({
    shouldRecall: deliberation.shouldRecall,
    shouldStayInward: deliberation.surfacePolicy === 'internal-only',
    hostPersonModel: input.hostPersonModel ?? null,
    memoryControl: null,
    followUpAffordance: deliberation.followUpAffordance ?? null,
  })
  const shouldSurface = preliminaryShouldSurface && !restraint.shouldStayInward && restraint.surfaceMode !== 'inward-only'
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
    rationale: deliberation.whyNow || speechPlan?.rationale || '',
    confidence: deliberation.confidence,
  } satisfies NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']>
}

export function selectMemoryDeliberationEras(input: {
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
  const selectedEraIds = new Set([
    ...input.selectedEraIds,
    ...input.selectedConsolidationIds,
    ...input.selectedWindowIds,
  ])
  return eraCandidates
    .filter(item => selectedEraIds.has(item.id))
    .sort((left, right) => right.confidence - left.confidence)
    .map(item => ({
      id: item.id,
      facet: item.facet,
      summary: item.summary,
    }))
    .slice(0, 3)
}

export function deriveMemoryDeliberationConflictState(input: {
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
}) {
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
