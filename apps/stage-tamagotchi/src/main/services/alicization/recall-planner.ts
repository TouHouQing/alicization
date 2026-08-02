import type { AlicizationMemoryRetrievalHealth } from '@proj-alicization/stage-shared'

import type { AlicizationRelationshipLineCandidate } from './memory-search-retrieval-operators'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import {
  buildUniqueMemoryPlanningOwnerIdIndex,
  normalizeMemoryPlanningId,
  resolveMemoryPlanningOwnerIds,
} from './memory-os/planning-identifiers'

type RecollectionIntentSnapshot = NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
type RecollectionPlanSnapshot = NonNullable<OrganicMemoryPromptContext['recollectionPlan']>
type RecollectionSpeechPlanSnapshot = NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']>
type MemoryDeliberationSnapshot = NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>

export interface AlicizationRecallPlannerClusterContext {
  ambiguous: boolean
  dominantSummary: string | null
  runnerUpSummary: string | null
  competingVariants: Array<{
    id: string
    summary: string
    reason: string
  }>
}

export interface AlicizationRecallPlannerReconstructionContext {
  candidates: Array<{
    id: string
    summary: string
    reason?: string | null
  }>
  stableCore: string[]
  unsafeDetails: string[]
}

export interface AlicizationRecallPlannerDecision {
  shouldRecall: boolean
  selectedConsolidationIds: string[]
  selectedWindowIds: string[]
  selectedProcedureIds: string[]
  selectedEpisodeIds: string[]
  selectedConversationTurnIds: string[]
  selectedEraIds: string[]
  selectedRelationshipLines: string[]
  whyThisMemory: string | null
  whyNotOthers: string | null
  surfaceMode: MemoryDeliberationSnapshot['surfacePolicy']
  stableCore: string[]
  unsafeDetails: string[]
  relationshipMeaning: string[]
  confidence: number
  uncertaintyLabel: RecollectionPlanSnapshot['certainty']
  ambiguityPosture: NonNullable<MemoryDeliberationSnapshot['ambiguityPosture']>
  followUpTiming: NonNullable<NonNullable<MemoryDeliberationSnapshot['followUpAffordance']>['preferredTiming']> | null
  suppressionReasons: string[]
  suppressionConflictVariants: NonNullable<MemoryDeliberationSnapshot['conflictVariants']>
  recollectionPlan: RecollectionPlanSnapshot | null
  memoryDeliberation: MemoryDeliberationSnapshot | null
}

export interface AlicizationRecallPlannerInput {
  recollectionIntent: RecollectionIntentSnapshot | null
  recollectionPlanCandidate: RecollectionPlanSnapshot | null
  recollectionSpeechCandidate: RecollectionSpeechPlanSnapshot | null
  memoryDeliberationCandidate: MemoryDeliberationSnapshot | null
  relationshipLineCandidates: AlicizationRelationshipLineCandidate[]
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
  proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
  recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  retrievalHealth?: AlicizationMemoryRetrievalHealth | null
  clusterContext?: AlicizationRecallPlannerClusterContext | null
  reconstructionContext?: AlicizationRecallPlannerReconstructionContext | null
  knowledgeEvidence?: {
    validationCount: number
    contradictionCount: number
    stronglyValidatedProcedureCount: number
    contradictionHeavyFactCount: number
  } | null
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value)
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

function uniqueIds(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 120)
    if (!normalized)
      continue
    if (result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function mergeSelectedIds(input: {
  primary?: string[] | null
  secondary?: string[] | null
  tertiary?: string[] | null
  maxItems?: number
}) {
  if (input.primary !== undefined && input.primary !== null)
    return uniqueIds(input.primary, input.maxItems ?? 6)
  if (input.secondary !== undefined && input.secondary !== null)
    return uniqueIds(input.secondary, input.maxItems ?? 6)
  return uniqueIds(input.tertiary ?? [], input.maxItems ?? 6)
}

function deriveAmbiguityPosture(input: {
  recollectionPlanCandidate: RecollectionPlanSnapshot | null
  recollectionSpeechCandidate: RecollectionSpeechPlanSnapshot | null
  memoryDeliberationCandidate: MemoryDeliberationSnapshot | null
  selectedEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  clusterContext?: AlicizationRecallPlannerClusterContext | null
  reconstructionContext?: AlicizationRecallPlannerReconstructionContext | null
}): NonNullable<MemoryDeliberationSnapshot['ambiguityPosture']> {
  const explicit = input.memoryDeliberationCandidate?.ambiguityPosture
    ?? input.recollectionPlanCandidate?.searchTrace?.thirdHop.ambiguityPosture
    ?? null
  if (explicit)
    return explicit

  if (input.clusterContext?.ambiguous)
    return 'ambiguous'
  if ((input.reconstructionContext?.candidates.length ?? 0) >= 2)
    return 'ambiguous'

  const selectedEpisodes = input.selectedEpisodes
  const reconstructedCount = selectedEpisodes.filter((item) => {
    const provenance = item.latestReconsolidation?.provenance ?? item.provenance
    return provenance === 'reconstructed' || provenance === 'dreamt' || provenance === 'inferred'
  }).length
  if (reconstructedCount >= 2)
    return 'ambiguous'
  if (
    reconstructedCount >= 1
    || input.recollectionPlanCandidate?.certainty === 'approximate'
    || input.recollectionPlanCandidate?.certainty === 'fragmentary'
    || input.recollectionSpeechCandidate?.certainty === 'approximate'
    || input.recollectionSpeechCandidate?.certainty === 'fragmentary'
  ) {
    return 'approximate'
  }
  return 'settled'
}

function deriveCertainty(input: {
  ambiguityPosture: NonNullable<MemoryDeliberationSnapshot['ambiguityPosture']>
  recollectionPlanCandidate: RecollectionPlanSnapshot | null
  recollectionSpeechCandidate: RecollectionSpeechPlanSnapshot | null
}) {
  const baseline = input.recollectionSpeechCandidate?.certainty
    ?? input.recollectionPlanCandidate?.certainty
    ?? 'approximate'
  if (input.ambiguityPosture === 'ambiguous')
    return 'fragmentary' as const
  if (input.ambiguityPosture === 'approximate' && baseline === 'firm')
    return 'approximate' as const
  return baseline
}

function deriveRelationshipLines(input: {
  relationshipLineCandidates: AlicizationRelationshipLineCandidate[]
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  selectedConsolidationIds: Set<string>
  selectedEpisodeIds: Set<string>
  selectedConversationTurnIds: Set<string>
}) {
  const selectedConsolidationIds = new Set([...input.selectedConsolidationIds].map(normalizeMemoryPlanningId))
  const selectedEpisodeIds = new Set([...input.selectedEpisodeIds].map(normalizeMemoryPlanningId))
  const selectedConversationTurnIds = new Set([...input.selectedConversationTurnIds].map(normalizeMemoryPlanningId))
  return uniqueList([
    ...input.relationshipLineCandidates
      .filter((item) => {
        const sourceId = normalizeMemoryPlanningId(item.sourceId)
        if (item.sourceKind === 'consolidation')
          return selectedConsolidationIds.has(sourceId)
        if (item.sourceKind === 'episode')
          return selectedEpisodeIds.has(sourceId)
        return selectedConversationTurnIds.has(sourceId)
      })
      .map(item => item.line),
    ...input.recalledEpisodes
      .filter(item => input.selectedEpisodeIds.has(item.id))
      .flatMap(item => [item.relationshipMeaning, item.lesson]),
    ...input.consolidatedMemories
      .filter(item => input.selectedConsolidationIds.has(item.id))
      .flatMap(item => [item.lesson]),
  ], 4)
}

function deriveReliabilityPressure(input: {
  retrievalHealth?: AlicizationMemoryRetrievalHealth | null
  clusterContext?: AlicizationRecallPlannerClusterContext | null
  reconstructionContext?: AlicizationRecallPlannerReconstructionContext | null
  knowledgeEvidence?: AlicizationRecallPlannerInput['knowledgeEvidence']
}) {
  const retrieval = input.retrievalHealth ?? null
  const wrongThread = Math.max(0, Math.min(1, retrieval?.wrongThreadRate ?? 0))
  const recallMiss = Math.max(0, Math.min(1, retrieval?.recallMissRate ?? 0))
  const reconstructionError = Math.max(0, Math.min(1, retrieval?.reconstructionErrorRate ?? 0))
  const memorySurfaceViolation = Math.max(0, Math.min(1, retrieval?.memorySurfaceViolationRate ?? 0))
  const ambiguity = input.clusterContext?.ambiguous ? 0.18 : 0
  const reconstructionConflict = (input.reconstructionContext?.candidates.length ?? 0) >= 2 ? 0.14 : 0
  const contradictionPenalty = Math.min(0.16, (input.knowledgeEvidence?.contradictionCount ?? 0) * 0.03)
    + Math.min(0.1, (input.knowledgeEvidence?.contradictionHeavyFactCount ?? 0) * 0.04)
  const validationRelief = Math.min(0.14, (input.knowledgeEvidence?.validationCount ?? 0) * 0.02)
    + Math.min(0.08, (input.knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0) * 0.04)
  return clamp01(
    wrongThread * 0.32
    + recallMiss * 0.22
    + reconstructionError * 0.24
    + memorySurfaceViolation * 0.24
    + ambiguity
    + reconstructionConflict,
  ) + contradictionPenalty - validationRelief
}

function deriveEvidenceConfidenceAdjustment(input: {
  knowledgeEvidence?: AlicizationRecallPlannerInput['knowledgeEvidence']
}) {
  const validationBoost = Math.min(0.12, (input.knowledgeEvidence?.validationCount ?? 0) * 0.02)
  const proceduralBoost = Math.min(0.08, (input.knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0) * 0.04)
  const contradictionPenalty = Math.min(0.14, (input.knowledgeEvidence?.contradictionCount ?? 0) * 0.03)
    + Math.min(0.08, (input.knowledgeEvidence?.contradictionHeavyFactCount ?? 0) * 0.04)
  return validationBoost + proceduralBoost - contradictionPenalty
}

function deriveEvidenceSurfacePressure(input: {
  knowledgeEvidence?: AlicizationRecallPlannerInput['knowledgeEvidence']
}) {
  return (input.knowledgeEvidence?.contradictionCount ?? 0) * 2
    + (input.knowledgeEvidence?.contradictionHeavyFactCount ?? 0) * 2
    - (input.knowledgeEvidence?.validationCount ?? 0)
    - (input.knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0)
}

function deriveStableCore(input: {
  reconstructionContext?: AlicizationRecallPlannerReconstructionContext | null
  selectedRelationshipLines: string[]
  selectedPeriods: Array<{ summary: string }>
  selectedProcedures: Array<{ label: string, approach: string }>
}) {
  return uniqueList([
    ...(input.reconstructionContext?.stableCore ?? []),
    ...input.selectedRelationshipLines,
    ...input.selectedPeriods.map(item => item.summary),
    ...input.selectedProcedures.flatMap(item => [item.label, item.approach]),
  ], 6)
}

function deriveUnsafeDetails(input: {
  reconstructionContext?: AlicizationRecallPlannerReconstructionContext | null
  clusterContext?: AlicizationRecallPlannerClusterContext | null
}) {
  return uniqueList([
    ...(input.reconstructionContext?.unsafeDetails ?? []),
    ...(input.clusterContext?.competingVariants ?? []).flatMap(item => [item.summary, item.reason]),
  ], 6)
}

function deriveSuppressionReasons(input: {
  recollectionIntent: RecollectionIntentSnapshot | null
  explicitConflictSeverity?: MemoryDeliberationSnapshot['conflictSeverity'] | null
  selectedConsolidationIds: string[]
  selectedEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  selectedRelationshipLines: string[]
}) {
  if (input.explicitConflictSeverity === 'none')
    return []

  const reasons: string[] = []
  const selfModelTurn = input.recollectionIntent?.mode === 'autobiographical-history'
    || input.consolidatedMemories.some(item =>
      input.selectedConsolidationIds.includes(item.id) && item.facet === 'self-era')
  if (selfModelTurn) {
    const reconstructedSelfEpisode = input.selectedEpisodes.some((item) => {
      const provenance = item.latestReconsolidation?.provenance ?? item.provenance
      return provenance === 'reconstructed' || provenance === 'dreamt' || provenance === 'inferred'
    })
    if (reconstructedSelfEpisode)
      reasons.push('stale-self-model')
  }

  const relationshipTurn = input.recollectionIntent?.mode === 'relationship-history'
    || input.consolidatedMemories.some(item =>
      input.selectedConsolidationIds.includes(item.id) && item.facet === 'relationship-era')
  if (relationshipTurn) {
    const reconstructedRelationshipEpisode = input.selectedEpisodes.some((item) => {
      const provenance = item.latestReconsolidation?.provenance ?? item.provenance
      return provenance === 'reconstructed' || provenance === 'dreamt' || provenance === 'inferred'
    })
    const competingRelationshipLineCount = uniqueList(input.selectedRelationshipLines, 4).length >= 2
    if (reconstructedRelationshipEpisode && competingRelationshipLineCount)
      reasons.push('relationship-era-confusion')
  }

  return reasons
}

function deriveSuppressionConflictVariants(input: {
  suppressionReasons: string[]
  selectedConsolidationIds: string[]
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
}) {
  const variants: NonNullable<MemoryDeliberationSnapshot['conflictVariants']> = []
  if (input.suppressionReasons.includes('stale-self-model')) {
    const selfEra = input.consolidatedMemories.find(item =>
      input.selectedConsolidationIds.includes(item.id) && item.facet === 'self-era')
    if (selfEra) {
      variants.push({
        id: selfEra.id,
        summary: selfEra.summary,
        provenance: selfEra.dominantProvenance,
        reason: null,
      })
    }
  }

  if (input.suppressionReasons.includes('relationship-era-confusion')) {
    const relationshipEra = input.consolidatedMemories.find(item =>
      input.selectedConsolidationIds.includes(item.id) && item.facet === 'relationship-era')
    if (relationshipEra) {
      variants.push({
        id: relationshipEra.id,
        summary: relationshipEra.summary,
        provenance: relationshipEra.dominantProvenance,
        reason: null,
      })
    }
  }
  return variants
}

function buildNormalizedRecollectionPlan(input: {
  shouldRecall: boolean
  selectedConsolidationIds: string[]
  selectedWindowIds: string[]
  selectedProcedureIds: string[]
  selectedEpisodeIds: string[]
  selectedConversationTurnIds: string[]
  selectedRelationshipLines: string[]
  certainty: RecollectionPlanSnapshot['certainty']
  confidence: number
  whyThisMemory: string | null
  recollectionPlanCandidate: RecollectionPlanSnapshot | null
  ambiguityPosture: NonNullable<MemoryDeliberationSnapshot['ambiguityPosture']>
  targetIdIndex: ReadonlyMap<string, string>
}): RecollectionPlanSnapshot | null {
  if (!input.shouldRecall)
    return null

  const candidate = input.recollectionPlanCandidate
  const searchTrace = candidate?.searchTrace
    ? {
        ...candidate.searchTrace,
        firstHop: {
          ...candidate.searchTrace.firstHop,
          targetIds: resolveMemoryPlanningOwnerIds(
            candidate.searchTrace.firstHop.targetIds,
            input.targetIdIndex,
          ),
        },
        secondHop: {
          ...candidate.searchTrace.secondHop,
          targetIds: resolveMemoryPlanningOwnerIds(
            candidate.searchTrace.secondHop.targetIds,
            input.targetIdIndex,
          ),
        },
        thirdHop: {
          ...candidate.searchTrace.thirdHop,
          ambiguityPosture: input.ambiguityPosture,
        },
      }
    : null

  return {
    selectedConsolidationIds: input.selectedConsolidationIds,
    selectedWindowIds: input.selectedWindowIds,
    selectedProceduralIds: input.selectedProcedureIds,
    selectedEpisodeIds: input.selectedEpisodeIds,
    selectedConversationTurnIds: input.selectedConversationTurnIds,
    selectedRelationshipLines: input.selectedRelationshipLines,
    searchTrace,
    opening: '',
    certainty: input.certainty,
    rationale: input.whyThisMemory || candidate?.rationale || '',
    confidence: input.confidence,
  }
}

export function planAlicizationRecall(input: AlicizationRecallPlannerInput): AlicizationRecallPlannerDecision {
  const candidatePlan = input.recollectionPlanCandidate ?? null
  const candidateSpeech = input.recollectionSpeechCandidate ?? null
  const candidateDeliberation = input.memoryDeliberationCandidate ?? null
  const reliabilityPressure = deriveReliabilityPressure({
    retrievalHealth: input.retrievalHealth ?? null,
    clusterContext: input.clusterContext ?? null,
    reconstructionContext: input.reconstructionContext ?? null,
    knowledgeEvidence: input.knowledgeEvidence ?? null,
  })
  const evidenceConfidenceAdjustment = deriveEvidenceConfidenceAdjustment({
    knowledgeEvidence: input.knowledgeEvidence ?? null,
  })
  const evidenceSurfacePressure = deriveEvidenceSurfacePressure({
    knowledgeEvidence: input.knowledgeEvidence ?? null,
  })
  const recallRequested = candidateDeliberation?.shouldRecall
    ?? Boolean(candidatePlan)
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
  const eraIdIndex = buildUniqueMemoryPlanningOwnerIdIndex([
    ...input.consolidatedMemories.map(item => ({ id: item.id })),
    ...input.recollectedWindows.map(item => ({ id: item.id })),
  ], item => item.id)
  const targetIdIndex = buildUniqueMemoryPlanningOwnerIdIndex([
    ...input.consolidatedMemories.map(item => ({ id: item.id })),
    ...input.recollectedWindows.map(item => ({ id: item.id })),
    ...input.proceduralMemories.map(item => ({ id: item.id })),
    ...input.recalledEpisodes.map(item => ({ id: item.id })),
    ...input.recalledConversationHistory.map(item => ({ id: item.turnId })),
  ], item => item.id)

  const resolvedConsolidationIds = recallRequested
    ? resolveMemoryPlanningOwnerIds(
        mergeSelectedIds({
          primary: candidateDeliberation?.selectedConsolidationIds,
          secondary: candidatePlan?.selectedConsolidationIds,
        }),
        consolidationIdIndex,
      )
    : []
  const resolvedWindowIds = recallRequested
    ? resolveMemoryPlanningOwnerIds(
        mergeSelectedIds({
          primary: candidateDeliberation?.selectedWindowIds,
          secondary: candidatePlan?.selectedWindowIds,
        }),
        windowIdIndex,
      )
    : []
  const resolvedProcedureIds = recallRequested
    ? resolveMemoryPlanningOwnerIds(
        mergeSelectedIds({
          primary: candidateDeliberation?.selectedProcedureIds,
          secondary: candidatePlan?.selectedProceduralIds,
        }),
        procedureIdIndex,
      )
    : []
  const resolvedEpisodeIds = recallRequested
    ? resolveMemoryPlanningOwnerIds(
        mergeSelectedIds({
          primary: candidateDeliberation?.selectedEpisodeIds,
          secondary: candidatePlan?.selectedEpisodeIds,
        }),
        episodeIdIndex,
      )
    : []
  const resolvedConversationTurnIds = recallRequested
    ? resolveMemoryPlanningOwnerIds(
        mergeSelectedIds({
          primary: candidateDeliberation?.selectedConversationTurnIds,
          secondary: candidatePlan?.selectedConversationTurnIds,
        }),
        conversationTurnIdIndex,
      )
    : []
  const resolvedEraIds = recallRequested
    ? resolveMemoryPlanningOwnerIds(
        mergeSelectedIds({
          primary: candidateDeliberation?.selectedEraIds,
          secondary: [...resolvedConsolidationIds, ...resolvedWindowIds],
          maxItems: 3,
        }),
        eraIdIndex,
        3,
      )
    : []
  const hasSelectedOwner = resolvedConsolidationIds.length > 0
    || resolvedWindowIds.length > 0
    || resolvedProcedureIds.length > 0
    || resolvedEpisodeIds.length > 0
    || resolvedConversationTurnIds.length > 0
    || resolvedEraIds.length > 0
  const baseShouldRecall = recallRequested && hasSelectedOwner
  const weakRecallCandidate = !candidateDeliberation
    && (candidatePlan?.confidence ?? 0) < 0.72
    && (candidateSpeech?.confidence ?? 0) < 0.72
  const shouldRecall = reliabilityPressure >= 0.64 && weakRecallCandidate
    ? false
    : baseShouldRecall
  const selectedConsolidationIds = shouldRecall ? resolvedConsolidationIds : []
  const selectedWindowIds = shouldRecall ? resolvedWindowIds : []
  const selectedProcedureIds = shouldRecall ? resolvedProcedureIds : []
  const selectedEpisodeIds = shouldRecall ? resolvedEpisodeIds : []
  const selectedConversationTurnIds = shouldRecall ? resolvedConversationTurnIds : []
  const selectedEraIds = shouldRecall ? resolvedEraIds : []

  const selectedEpisodeIdSet = new Set(selectedEpisodeIds)
  const selectedConsolidationIdSet = new Set(selectedConsolidationIds)
  const selectedConversationTurnIdSet = new Set(selectedConversationTurnIds)
  const selectedEpisodes = input.recalledEpisodes.filter(item => selectedEpisodeIdSet.has(item.id))
  const selectedPeriods = [
    ...input.recollectedWindows
      .filter(item => selectedWindowIds.includes(item.id))
      .map(item => ({ summary: item.summary })),
    ...input.consolidatedMemories
      .filter(item => selectedConsolidationIds.includes(item.id))
      .map(item => ({ summary: item.summary })),
  ]
  const selectedProcedures = input.proceduralMemories
    .filter(item => selectedProcedureIds.includes(item.id))
    .map(item => ({
      label: item.label,
      approach: item.approach,
    }))

  const selectedRelationshipLines = shouldRecall
    ? deriveRelationshipLines({
        relationshipLineCandidates: input.relationshipLineCandidates,
        consolidatedMemories: input.consolidatedMemories,
        recalledEpisodes: input.recalledEpisodes,
        selectedConsolidationIds: selectedConsolidationIdSet,
        selectedEpisodeIds: selectedEpisodeIdSet,
        selectedConversationTurnIds: selectedConversationTurnIdSet,
      })
    : []
  const suppressionReasons = deriveSuppressionReasons({
    recollectionIntent: input.recollectionIntent,
    explicitConflictSeverity: candidateDeliberation?.conflictSeverity ?? null,
    selectedConsolidationIds,
    selectedEpisodes,
    consolidatedMemories: input.consolidatedMemories,
    selectedRelationshipLines,
  })
  const suppressionConflictVariants = deriveSuppressionConflictVariants({
    suppressionReasons,
    selectedConsolidationIds,
    consolidatedMemories: input.consolidatedMemories,
  })
  const ambiguityPosture = deriveAmbiguityPosture({
    recollectionPlanCandidate: candidatePlan,
    recollectionSpeechCandidate: candidateSpeech,
    memoryDeliberationCandidate: candidateDeliberation,
    selectedEpisodes,
    clusterContext: input.clusterContext ?? null,
    reconstructionContext: input.reconstructionContext ?? null,
  })
  const certainty = deriveCertainty({
    ambiguityPosture,
    recollectionPlanCandidate: candidatePlan,
    recollectionSpeechCandidate: candidateSpeech,
  })
  const baseConfidence = clamp01(
    candidateDeliberation?.confidence
    ?? candidatePlan?.confidence
    ?? candidateSpeech?.confidence
    ?? input.recollectionIntent?.confidence
    ?? 0.68,
  )
  const confidence = clamp01(
    reliabilityPressure >= 0.64
      ? baseConfidence * 0.72 + evidenceConfidenceAdjustment
      : reliabilityPressure >= 0.4
        ? baseConfidence * 0.84 + evidenceConfidenceAdjustment
        : baseConfidence + evidenceConfidenceAdjustment,
  )
  const surfaceMode: MemoryDeliberationSnapshot['surfacePolicy'] = shouldRecall
    ? ((input.knowledgeEvidence?.contradictionHeavyFactCount ?? 0) >= 1
      && (input.knowledgeEvidence?.validationCount ?? 0) <= 1)
        ? 'internal-only'
        : suppressionReasons.includes('stale-self-model') || suppressionReasons.includes('relationship-era-confusion')
          ? 'internal-only'
          : reliabilityPressure >= 0.64
            ? 'internal-only'
            : reliabilityPressure >= 0.4 || evidenceSurfacePressure >= 2
              ? (candidateDeliberation?.surfacePolicy === 'internal-only'
                  ? 'internal-only'
                  : 'gist-first')
              : candidateDeliberation?.surfacePolicy
                ?? (
                  candidateSpeech?.shouldSurface && candidateSpeech.surfaceMode !== 'internal-only'
                    ? candidateSpeech.surfaceMode
                    : 'internal-only'
                )
    : 'internal-only'
  const whyThisMemory = sanitizeText(
    candidateDeliberation?.whyNow
    || candidatePlan?.rationale
    || candidateSpeech?.rationale
    || input.recollectionIntent?.rationale
    || '',
    220,
  ) || null
  const inwardLine = ''
  const stableCore = shouldRecall
    ? deriveStableCore({
        reconstructionContext: input.reconstructionContext ?? null,
        selectedRelationshipLines,
        selectedPeriods,
        selectedProcedures,
      })
    : []
  const unsafeDetails = deriveUnsafeDetails({
    reconstructionContext: input.reconstructionContext ?? null,
    clusterContext: input.clusterContext ?? null,
  })
  const followUpTiming = candidateDeliberation?.followUpAffordance?.preferredTiming
    ?? (
      !shouldRecall
        ? 'internal-only'
        : suppressionReasons.includes('stale-self-model') || suppressionReasons.includes('relationship-era-confusion')
          ? 'next-open-window'
          : reliabilityPressure >= 0.64
            ? 'next-open-window'
            : reliabilityPressure >= 0.4
              ? 'after-payoff'
              : candidateSpeech?.placement === 'after-payoff'
                ? 'after-payoff'
                : candidateSpeech?.placement === 'internal-only' || surfaceMode === 'internal-only'
                  ? 'internal-only'
                  : 'same-turn-if-invited'
    )
  const relationshipMeaning = selectedRelationshipLines.length > 0
    ? selectedRelationshipLines
    : uniqueList(selectedEpisodes.flatMap(item => [item.relationshipMeaning, item.lesson]), 4)
  const whyNotOthers = null

  const recollectionPlan = buildNormalizedRecollectionPlan({
    shouldRecall,
    selectedConsolidationIds,
    selectedWindowIds,
    selectedProcedureIds,
    selectedEpisodeIds,
    selectedConversationTurnIds,
    selectedRelationshipLines,
    certainty,
    confidence,
    whyThisMemory,
    recollectionPlanCandidate: candidatePlan,
    ambiguityPosture,
    targetIdIndex,
  })

  const memoryDeliberation: MemoryDeliberationSnapshot | null = candidateDeliberation || recollectionPlan || candidatePlan || candidateSpeech
    ? {
        shouldRecall,
        selectedEraIds,
        selectedConsolidationIds,
        selectedWindowIds,
        selectedProcedureIds,
        selectedEpisodeIds,
        selectedConversationTurnIds,
        selectedRelationshipLines,
        ambiguityPosture,
        searchTrace: recollectionPlan?.searchTrace ?? null,
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        conflictSeverity: suppressionConflictVariants.length > 0
          ? (
              candidateDeliberation?.conflictSeverity && candidateDeliberation.conflictSeverity !== 'none'
                ? candidateDeliberation.conflictSeverity
                : 'medium'
            )
          : candidateDeliberation?.conflictSeverity,
        conflictVariants: suppressionConflictVariants,
        stableCore,
        unsafeDetails,
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: shouldRecall ? surfaceMode : 'internal-only',
        confidence,
        whyNow: whyThisMemory || '',
        inwardLine,
        visibleLine: null,
        followUpAffordance: candidateDeliberation?.followUpAffordance ?? null,
      }
    : null

  return {
    shouldRecall,
    selectedConsolidationIds,
    selectedWindowIds,
    selectedProcedureIds,
    selectedEpisodeIds,
    selectedConversationTurnIds,
    selectedEraIds,
    selectedRelationshipLines,
    whyThisMemory,
    whyNotOthers,
    surfaceMode,
    stableCore,
    unsafeDetails,
    relationshipMeaning,
    confidence,
    uncertaintyLabel: certainty,
    ambiguityPosture,
    followUpTiming,
    suppressionReasons,
    suppressionConflictVariants,
    recollectionPlan,
    memoryDeliberation,
  }
}
