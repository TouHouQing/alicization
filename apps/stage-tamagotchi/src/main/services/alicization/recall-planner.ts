import type { AlicizationRelationshipLineCandidate } from './memory-search-retrieval-operators'
import type { OrganicMemoryPromptContext } from './runtime-soul'
import type { AlicizationMemoryRetrievalHealth } from '@proj-alicization/stage-shared'

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
  const primary = uniqueIds(input.primary ?? [], input.maxItems ?? 6)
  if (primary.length > 0)
    return primary
  const secondary = uniqueIds(input.secondary ?? [], input.maxItems ?? 6)
  if (secondary.length > 0)
    return secondary
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
  memoryDeliberationCandidate: MemoryDeliberationSnapshot | null
  recollectionPlanCandidate: RecollectionPlanSnapshot | null
  relationshipLineCandidates: AlicizationRelationshipLineCandidate[]
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  selectedConsolidationIds: Set<string>
  selectedEpisodeIds: Set<string>
}) {
  return uniqueList([
    ...(input.memoryDeliberationCandidate?.selectedRelationshipLines ?? []),
    ...(input.recollectionPlanCandidate?.selectedRelationshipLines ?? []),
    ...input.relationshipLineCandidates
      .filter(item => input.selectedEpisodeIds.has(item.sourceId) || input.selectedConsolidationIds.has(item.sourceId))
      .map(item => item.line),
    ...input.recalledEpisodes
      .filter(item => input.selectedEpisodeIds.has(item.id))
      .flatMap(item => [item.relationshipMeaning, item.lesson]),
    ...input.consolidatedMemories
      .filter(item => input.selectedConsolidationIds.has(item.id))
      .flatMap(item => [item.lesson]),
  ], 4)
}

function deriveWhyNotOthers(input: {
  shouldRecall: boolean
  surfaceMode: MemoryDeliberationSnapshot['surfacePolicy']
  reliabilityPressure: number
  suppressionReasons?: string[] | null
  clusterContext?: AlicizationRecallPlannerClusterContext | null
  reconstructionContext?: AlicizationRecallPlannerReconstructionContext | null
  selectedRelationshipLines: string[]
  selectedConsolidationIds: string[]
  selectedProcedureIds: string[]
  selectedConversationTurnIds: string[]
}) {
  if (input.suppressionReasons?.includes('stale-self-model'))
    return 'The older self-story is still being revised, so stale self-model continuity should stay inward until the newer line stabilizes.'
  if (input.suppressionReasons?.includes('relationship-era-confusion'))
    return 'Competing relationship eras are still too easy to confuse, so the recalled bond line should stay inward until the present repair context is clearer.'
  if (!input.shouldRecall && input.reliabilityPressure >= 0.58)
    return 'Recall reliability is under pressure, so the answer should stay present-facing instead of reopening unstable memory.'
  if (!input.shouldRecall)
    return 'The live payoff should stay present-facing, so remembered candidates remain background-only.'
  if (input.reliabilityPressure >= 0.58)
    return 'Recall reliability is under pressure, so the answer should stay with the stable core, keep recollection inward, or defer explicit memory surfacing.'
  if (input.clusterContext?.ambiguous || (input.reconstructionContext?.candidates.length ?? 0) > 0)
    return 'Competing remembered variants remain active, so only the stable core should carry forward and exact detail should stay suppressed.'
  if (input.selectedProcedureIds.length > 0 && input.selectedConversationTurnIds.length === 0)
    return 'The remembered procedure is more useful than replaying old wording, so task continuity outranks literal conversation recall.'
  if (input.selectedRelationshipLines.length > 0 && input.surfaceMode === 'internal-only')
    return 'The relationship meaning should bend posture from underneath instead of surfacing as explicit recollection.'
  if (input.selectedConsolidationIds.length > 0)
    return 'The remembered period carries more stable continuity than lower-level fragments, so the answer should stay anchored there first.'
  return null
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
  memoryDeliberationCandidate: MemoryDeliberationSnapshot | null
  reconstructionContext?: AlicizationRecallPlannerReconstructionContext | null
  selectedRelationshipLines: string[]
  selectedPeriods: Array<{ summary: string }>
  selectedProcedures: Array<{ label: string, approach: string }>
}) {
  return uniqueList([
    ...(input.memoryDeliberationCandidate?.stableCore ?? []),
    ...(input.reconstructionContext?.stableCore ?? []),
    ...input.selectedRelationshipLines,
    ...input.selectedPeriods.map(item => item.summary),
    ...input.selectedProcedures.flatMap(item => [item.label, item.approach]),
  ], 6)
}

function deriveUnsafeDetails(input: {
  memoryDeliberationCandidate: MemoryDeliberationSnapshot | null
  reconstructionContext?: AlicizationRecallPlannerReconstructionContext | null
  clusterContext?: AlicizationRecallPlannerClusterContext | null
}) {
  return uniqueList([
    ...(input.memoryDeliberationCandidate?.unsafeDetails ?? []),
    ...(input.reconstructionContext?.unsafeDetails ?? []),
    ...(input.clusterContext?.competingVariants ?? []).flatMap(item => [item.summary, item.reason]),
  ], 6)
}

function deriveSuppressionReasons(input: {
  recollectionIntent: RecollectionIntentSnapshot | null
  recollectionPlanCandidate: RecollectionPlanSnapshot | null
  memoryDeliberationCandidate: MemoryDeliberationSnapshot | null
  selectedConsolidationIds: string[]
  selectedEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  selectedRelationshipLines: string[]
}) {
  const reasons: string[] = []
  const selfModelTurn = input.recollectionIntent?.mode === 'autobiographical-history'
    || input.consolidatedMemories.some(item =>
      input.selectedConsolidationIds.includes(item.id) && item.facet === 'self-era')
  if (selfModelTurn) {
    const selfTexts = [
      input.recollectionPlanCandidate?.rationale,
      input.memoryDeliberationCandidate?.whyNow,
      ...input.selectedEpisodes.flatMap(item => [item.whatHappened, item.whatChanged, item.lesson ?? '']),
      ...input.consolidatedMemories
        .filter(item => input.selectedConsolidationIds.includes(item.id))
        .flatMap(item => [item.summary, item.lesson ?? '', ...item.cues]),
      ...(input.memoryDeliberationCandidate?.stableCore ?? []),
      ...(input.memoryDeliberationCandidate?.unsafeDetails ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const reconstructedSelfEpisode = input.selectedEpisodes.some((item) => {
      const provenance = item.latestReconsolidation?.provenance ?? item.provenance
      return provenance === 'reconstructed' || provenance === 'dreamt' || provenance === 'inferred'
    })
    const staleSelfCue = /older self|old self|older self-story|old self-story|newer self|identity revision|revise|stale identity|自我|旧理解|旧叙事|修正|新自我|身份/u.test(selfTexts)
    const shouldSuppressStaleSelfModel = reconstructedSelfEpisode && staleSelfCue

    if (shouldSuppressStaleSelfModel)
      reasons.push('stale-self-model')
  }

  const relationshipTurn = input.recollectionIntent?.mode === 'relationship-history'
    || input.consolidatedMemories.some(item =>
      input.selectedConsolidationIds.includes(item.id) && item.facet === 'relationship-era')
  if (relationshipTurn) {
    const relationshipTexts = [
      input.recollectionPlanCandidate?.rationale,
      input.memoryDeliberationCandidate?.whyNow,
      ...input.selectedEpisodes.flatMap(item => [item.whatHappened, item.whatChanged, item.relationshipMeaning ?? '', item.lesson ?? '']),
      ...input.consolidatedMemories
        .filter(item => input.selectedConsolidationIds.includes(item.id))
        .flatMap(item => [item.summary, item.lesson ?? '', ...item.cues]),
      ...input.selectedRelationshipLines,
      ...(input.memoryDeliberationCandidate?.stableCore ?? []),
      ...(input.memoryDeliberationCandidate?.unsafeDetails ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const reconstructedRelationshipEpisode = input.selectedEpisodes.some((item) => {
      const provenance = item.latestReconsolidation?.provenance ?? item.provenance
      return provenance === 'reconstructed' || provenance === 'dreamt' || provenance === 'inferred'
    })
    const relationshipConfusionCue = /different repair|wrong one|not that time|another repair|same wound different phase|relationship era|repair arc|boundary|distance|不是那次|记错|另一条关系线|关系阶段|修复期|边界|距离/u.test(relationshipTexts)
    const competingRelationshipLineCount = uniqueList(input.selectedRelationshipLines, 4).length >= 2
    if (reconstructedRelationshipEpisode && (relationshipConfusionCue || competingRelationshipLineCount))
      reasons.push('relationship-era-confusion')
  }

  return reasons
}

function deriveSuppressionConflictVariants(input: {
  suppressionReasons: string[]
  recollectionIntent: RecollectionIntentSnapshot | null
  recollectionPlanCandidate: RecollectionPlanSnapshot | null
  memoryDeliberationCandidate: MemoryDeliberationSnapshot | null
  selectedConsolidationIds: string[]
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
}) {
  const variants: NonNullable<MemoryDeliberationSnapshot['conflictVariants']> = []
  if (input.suppressionReasons.includes('stale-self-model')) {
    const selfEra = input.consolidatedMemories.find(item =>
      input.selectedConsolidationIds.includes(item.id) && item.facet === 'self-era')
    const summary = selfEra?.summary
      ?? input.memoryDeliberationCandidate?.whyNow
      ?? input.recollectionPlanCandidate?.rationale
      ?? 'Older self-story remained active while the newer self line was still being revised.'
    variants.push({
      id: 'suppression:self-model-stale',
      summary,
      provenance: 'reconstructed',
      reason: 'Older self-story remained revision-prone, so stale self-model continuity was vetoed before visible surfacing.',
    })
  }

  if (input.suppressionReasons.includes('relationship-era-confusion')) {
    const relationshipEra = input.consolidatedMemories.find(item =>
      input.selectedConsolidationIds.includes(item.id) && item.facet === 'relationship-era')
    const summary = relationshipEra?.summary
      ?? input.memoryDeliberationCandidate?.whyNow
      ?? input.recollectionPlanCandidate?.rationale
      ?? 'Competing relationship eras remained too easy to confuse.'
    variants.push({
      id: 'suppression:relationship-era-confusion',
      summary,
      provenance: 'reconstructed',
      reason: 'Competing relationship eras remained too easy to confuse, so the recalled bond line was vetoed before visible surfacing.',
    })
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
  inwardLine: string
  recollectionPlanCandidate: RecollectionPlanSnapshot | null
  ambiguityPosture: NonNullable<MemoryDeliberationSnapshot['ambiguityPosture']>
}): RecollectionPlanSnapshot | null {
  if (!input.shouldRecall)
    return null

  const candidate = input.recollectionPlanCandidate
  const searchTrace = candidate?.searchTrace
    ? {
        ...candidate.searchTrace,
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
    opening: candidate?.opening || input.inwardLine,
    certainty: input.certainty,
    rationale: input.whyThisMemory || candidate?.rationale || 'A coherent remembered bundle should shape this turn.',
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
  const baseShouldRecall = candidateDeliberation?.shouldRecall
    ?? Boolean(candidatePlan)
  const weakRecallCandidate = !candidateDeliberation
    && (candidatePlan?.confidence ?? 0) < 0.72
    && (candidateSpeech?.confidence ?? 0) < 0.72
  const shouldRecall = reliabilityPressure >= 0.64 && weakRecallCandidate
    ? false
    : baseShouldRecall

  const selectedConsolidationIds = shouldRecall
    ? mergeSelectedIds({
        primary: candidateDeliberation?.selectedConsolidationIds,
        secondary: candidatePlan?.selectedConsolidationIds,
      })
    : []
  const selectedWindowIds = shouldRecall
    ? mergeSelectedIds({
        primary: candidateDeliberation?.selectedWindowIds,
        secondary: candidatePlan?.selectedWindowIds,
      })
    : []
  const selectedProcedureIds = shouldRecall
    ? mergeSelectedIds({
        primary: candidateDeliberation?.selectedProcedureIds,
        secondary: candidatePlan?.selectedProceduralIds,
      })
    : []
  const selectedEpisodeIds = shouldRecall
    ? mergeSelectedIds({
        primary: candidateDeliberation?.selectedEpisodeIds,
        secondary: candidatePlan?.selectedEpisodeIds,
      })
    : []
  const selectedConversationTurnIds = shouldRecall
    ? mergeSelectedIds({
        primary: candidateDeliberation?.selectedConversationTurnIds,
        secondary: candidatePlan?.selectedConversationTurnIds,
      })
    : []
  const selectedEraIds = shouldRecall
    ? mergeSelectedIds({
        primary: candidateDeliberation?.selectedEraIds,
        secondary: [...selectedConsolidationIds, ...selectedWindowIds],
        maxItems: 3,
      })
    : []

  const selectedEpisodeIdSet = new Set(selectedEpisodeIds)
  const selectedConsolidationIdSet = new Set(selectedConsolidationIds)
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
        memoryDeliberationCandidate: candidateDeliberation,
        recollectionPlanCandidate: candidatePlan,
        relationshipLineCandidates: input.relationshipLineCandidates,
        consolidatedMemories: input.consolidatedMemories,
        recalledEpisodes: input.recalledEpisodes,
        selectedConsolidationIds: selectedConsolidationIdSet,
        selectedEpisodeIds: selectedEpisodeIdSet,
      })
    : []
  const suppressionReasons = deriveSuppressionReasons({
    recollectionIntent: input.recollectionIntent,
    recollectionPlanCandidate: candidatePlan,
    memoryDeliberationCandidate: candidateDeliberation,
    selectedConsolidationIds,
    selectedEpisodes,
    consolidatedMemories: input.consolidatedMemories,
    selectedRelationshipLines,
  })
  const suppressionConflictVariants = deriveSuppressionConflictVariants({
    suppressionReasons,
    recollectionIntent: input.recollectionIntent,
    recollectionPlanCandidate: candidatePlan,
    memoryDeliberationCandidate: candidateDeliberation,
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
  const inwardLine = sanitizeText(
    candidateDeliberation?.inwardLine
    || candidatePlan?.opening
    || candidateSpeech?.internalLead
    || whyThisMemory
    || '',
    220,
  )
  const stableCore = deriveStableCore({
    memoryDeliberationCandidate: candidateDeliberation,
    reconstructionContext: input.reconstructionContext ?? null,
    selectedRelationshipLines,
    selectedPeriods,
    selectedProcedures,
  })
  const unsafeDetails = deriveUnsafeDetails({
    memoryDeliberationCandidate: candidateDeliberation,
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
  const whyNotOthers = deriveWhyNotOthers({
    shouldRecall,
    surfaceMode,
    reliabilityPressure,
    suppressionReasons,
    clusterContext: input.clusterContext ?? null,
    reconstructionContext: input.reconstructionContext ?? null,
    selectedRelationshipLines,
    selectedConsolidationIds,
    selectedProcedureIds,
    selectedConversationTurnIds,
  })

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
    inwardLine,
    recollectionPlanCandidate: candidatePlan,
    ambiguityPosture,
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
        searchTrace: candidateDeliberation?.searchTrace ?? recollectionPlan?.searchTrace ?? null,
        selectedEras: candidateDeliberation?.selectedEras ?? [],
        selectedPeriods: candidateDeliberation?.selectedPeriods ?? [],
        selectedEpisodes: candidateDeliberation?.selectedEpisodes ?? [],
        conflictSeverity: suppressionConflictVariants.length > 0
          ? (
              candidateDeliberation?.conflictSeverity && candidateDeliberation.conflictSeverity !== 'none'
                ? candidateDeliberation.conflictSeverity
                : 'medium'
            )
          : candidateDeliberation?.conflictSeverity,
        conflictVariants: [
          ...(candidateDeliberation?.conflictVariants ?? []),
          ...suppressionConflictVariants,
        ],
        stableCore,
        unsafeDetails: [
          ...unsafeDetails,
          ...(suppressionReasons.includes('stale-self-model')
            ? ['Do not let the older self-story surface as settled identity before the newer self line stabilizes.']
            : []),
          ...(suppressionReasons.includes('relationship-era-confusion')
            ? ['Do not let competing relationship eras surface as if they belonged to the same repair phase.']
            : []),
        ],
        selectedProcedures: candidateDeliberation?.selectedProcedures ?? [],
        selectedBundles: candidateDeliberation?.selectedBundles ?? [],
        selectedChains: candidateDeliberation?.selectedChains ?? [],
        surfacePolicy: shouldRecall ? surfaceMode : 'internal-only',
        confidence,
        whyNow: whyThisMemory || 'A coherent remembered bundle is shaping the current turn.',
        inwardLine,
        visibleLine: shouldRecall && surfaceMode !== 'internal-only'
          ? candidateDeliberation?.visibleLine || candidateSpeech?.visibleLead || null
          : null,
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
