import type { AlicizationDigitalLifeRuntimeSurface } from '../digital-life-kernel'
import type {
  AlicizationMainGatewayGenerateTextProvider,
  AlicizationMainGatewaySource,
} from '../main-gateway-contract'
import type { AlicizationMainGatewayResponseFormat } from '../runtime-main-gateway-one-shot'
import type { OrganicMemoryPromptContext } from '../runtime-soul'

import { buildAlicizationProviderFactBlock } from '@proj-alicization/stage-shared'

import { parseJsonObjectFromText } from '../runtime-transport-content'
import {
  buildUniqueMemoryPlanningOwnerIdIndex,
  normalizeMemoryPlanningId,
} from './planning-identifiers'
import {
  alicizationMemoryDeliberationResponseFormat,
  alicizationMemoryRecollectionIntentResponseFormat,
  alicizationMemoryRecollectionPlanResponseFormat,
  alicizationMemoryRecollectionSpeechPlanResponseFormat,
} from './provider-contract'

function sanitizeBriefText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function readUnitInterval(raw: unknown) {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0 || raw > 1)
    return null
  return raw
}

function readRequiredBriefText(raw: unknown, maxChars = 220) {
  const value = sanitizeBriefText(raw, maxChars)
  return value || null
}

function readBriefTextArray(
  raw: unknown,
  maxItems: number,
  maxChars: number,
  allowedValues?: ReadonlySet<string>,
) {
  if (!Array.isArray(raw))
    return null
  const values: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const value = readRequiredBriefText(item, maxChars)
    if (!value || seen.has(value) || (allowedValues && !allowedValues.has(value)))
      continue
    seen.add(value)
    values.push(value)
    if (values.length >= maxItems)
      break
  }
  return values
}

function readNullableBriefText(
  candidate: Record<string, unknown>,
  key: string,
  maxChars: number,
) {
  if (!Object.prototype.hasOwnProperty.call(candidate, key))
    return null
  const raw = candidate[key]
  if (raw === null)
    return { value: null as string | null }
  if (typeof raw !== 'string')
    return null
  return { value: sanitizeBriefText(raw, maxChars) || null }
}

export interface AlicizationMemoryPlanningCandidateIdSet {
  allIds: ReadonlySet<string>
  consolidationIds: ReadonlySet<string>
  conversationTurnIds: ReadonlySet<string>
  episodeIds: ReadonlySet<string>
  eraIds: ReadonlySet<string>
  procedureIds: ReadonlySet<string>
  windowIds: ReadonlySet<string>
}

function buildCandidateIdSet(values: Array<string | null | undefined>) {
  return new Set(
    buildUniqueMemoryPlanningOwnerIdIndex(values, value => value).keys(),
  )
}

function selectMemoryPlanningCandidateSlice<T>(
  items: T[],
  getId: (item: T) => string | null | undefined,
  maxItems: number,
) {
  const uniqueOwnerIdIndex = buildUniqueMemoryPlanningOwnerIdIndex(items, getId)
  return items
    .filter((item) => {
      const rawId = getId(item)
      const normalizedId = normalizeMemoryPlanningId(rawId)
      return Boolean(
        rawId
        && normalizedId
        && uniqueOwnerIdIndex.get(normalizedId) === rawId,
      )
    })
    .slice(0, maxItems)
}

function buildMemoryPlanningCandidateIdSet(input: {
  consolidatedMemories: Array<{ id: string }>
  recollectedWindows: Array<{ id: string }>
  proceduralMemories: Array<{ id: string }>
  recalledEpisodes: Array<{ id: string }>
  recalledConversationHistory: Array<{ turnId: string | null }>
}): AlicizationMemoryPlanningCandidateIdSet {
  const consolidationValues = input.consolidatedMemories.map(item => item.id)
  const windowValues = input.recollectedWindows.map(item => item.id)
  const procedureValues = input.proceduralMemories.map(item => item.id)
  const episodeValues = input.recalledEpisodes.map(item => item.id)
  const conversationTurnValues = input.recalledConversationHistory.map(item => item.turnId)
  const consolidationIds = buildCandidateIdSet(consolidationValues)
  const windowIds = buildCandidateIdSet(windowValues)
  const procedureIds = buildCandidateIdSet(procedureValues)
  const episodeIds = buildCandidateIdSet(episodeValues)
  const conversationTurnIds = buildCandidateIdSet(conversationTurnValues)
  const eraIds = buildCandidateIdSet([...consolidationValues, ...windowValues])
  return {
    allIds: buildCandidateIdSet([
      ...consolidationValues,
      ...windowValues,
      ...procedureValues,
      ...episodeValues,
      ...conversationTurnValues,
    ]),
    consolidationIds,
    conversationTurnIds,
    episodeIds,
    eraIds,
    procedureIds,
    windowIds,
  }
}

export interface AlicizationMemoryGatewayTextProvider extends AlicizationMainGatewayGenerateTextProvider<
  Extract<AlicizationMainGatewaySource, 'counterfactual-deliberation'>,
  string,
  {
    cardId?: string
    injectPerformanceManifest?: boolean
    injectCustomDirectives?: boolean
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
    responseFormat?: AlicizationMainGatewayResponseFormat
  }
> {}

export function parseMemoryRecollectionPlanPayload(
  raw: string,
  candidateIds: AlicizationMemoryPlanningCandidateIdSet,
) {
  const parsed = parseJsonObjectFromText(raw)
  if (!parsed)
    return null

  const selectedConsolidationIds = readBriefTextArray(
    parsed.selectedConsolidationIds,
    8,
    120,
    candidateIds.consolidationIds,
  )
  const selectedWindowIds = readBriefTextArray(
    parsed.selectedWindowIds,
    8,
    120,
    candidateIds.windowIds,
  )
  const selectedProceduralIds = readBriefTextArray(
    parsed.selectedProceduralIds,
    8,
    120,
    candidateIds.procedureIds,
  )
  const selectedEpisodeIds = readBriefTextArray(
    parsed.selectedEpisodeIds,
    8,
    120,
    candidateIds.episodeIds,
  )
  const selectedConversationTurnIds = readBriefTextArray(
    parsed.selectedConversationTurnIds,
    8,
    120,
    candidateIds.conversationTurnIds,
  )
  const providerRelationshipLines = readBriefTextArray(
    parsed.selectedRelationshipLines,
    3,
    220,
  )
  const searchTraceCandidate = parsed.searchTrace && typeof parsed.searchTrace === 'object'
    ? parsed.searchTrace as Record<string, unknown>
    : null
  const firstHopCandidate = searchTraceCandidate?.firstHop && typeof searchTraceCandidate.firstHop === 'object'
    ? searchTraceCandidate.firstHop as Record<string, unknown>
    : null
  const secondHopCandidate = searchTraceCandidate?.secondHop && typeof searchTraceCandidate.secondHop === 'object'
    ? searchTraceCandidate.secondHop as Record<string, unknown>
    : null
  const thirdHopCandidate = searchTraceCandidate?.thirdHop && typeof searchTraceCandidate.thirdHop === 'object'
    ? searchTraceCandidate.thirdHop as Record<string, unknown>
    : null
  const firstHopFocus = firstHopCandidate?.focus === 'era'
    || firstHopCandidate?.focus === 'procedure'
    || firstHopCandidate?.focus === 'relationship-line'
    || firstHopCandidate?.focus === 'conversation-turn'
    || firstHopCandidate?.focus === 'episode'
    ? firstHopCandidate.focus
    : null
  const secondHopAction = secondHopCandidate?.action === 'hold'
    || secondHopCandidate?.action === 'expand-era'
    || secondHopCandidate?.action === 'expand-procedure'
    || secondHopCandidate?.action === 'expand-relationship-line'
    || secondHopCandidate?.action === 'expand-conversation'
    || secondHopCandidate?.action === 'narrow-to-stable-core'
    ? secondHopCandidate.action
    : null
  const evidenceGap = secondHopCandidate?.evidenceGap === 'none'
    || secondHopCandidate?.evidenceGap === 'need-period-anchor'
    || secondHopCandidate?.evidenceGap === 'need-episode-detail'
    || secondHopCandidate?.evidenceGap === 'need-procedure-detail'
    || secondHopCandidate?.evidenceGap === 'need-relationship-meaning'
    || secondHopCandidate?.evidenceGap === 'need-conversation-evidence'
    || secondHopCandidate?.evidenceGap === 'need-disambiguation'
    ? secondHopCandidate.evidenceGap
    : null
  const ambiguityPosture = thirdHopCandidate?.ambiguityPosture === 'settled'
    || thirdHopCandidate?.ambiguityPosture === 'approximate'
    || thirdHopCandidate?.ambiguityPosture === 'ambiguous'
    ? thirdHopCandidate.ambiguityPosture
    : null
  const firstHopSummary = readRequiredBriefText(firstHopCandidate?.summary, 220)
  const secondHopSummary = readRequiredBriefText(secondHopCandidate?.summary, 220)
  const thirdHopSummary = readRequiredBriefText(thirdHopCandidate?.summary, 220)
  const firstHopTargetIds = readBriefTextArray(
    firstHopCandidate?.targetIds,
    6,
    120,
    candidateIds.allIds,
  )
  const secondHopTargetIds = readBriefTextArray(
    secondHopCandidate?.targetIds,
    6,
    120,
    candidateIds.allIds,
  )
  const certainty = parsed.certainty === 'firm' || parsed.certainty === 'approximate' || parsed.certainty === 'fragmentary'
    ? parsed.certainty
    : null
  const rationale = readRequiredBriefText(parsed.rationale, 220)
  const confidence = readUnitInterval(parsed.confidence)
  if (
    !selectedConsolidationIds
    || !selectedWindowIds
    || !selectedProceduralIds
    || !selectedEpisodeIds
    || !selectedConversationTurnIds
    || !providerRelationshipLines
    || !firstHopFocus
    || !secondHopAction
    || !evidenceGap
    || !ambiguityPosture
    || !firstHopSummary
    || !secondHopSummary
    || !thirdHopSummary
    || !firstHopTargetIds
    || !secondHopTargetIds
    || !certainty
    || !rationale
    || confidence === null
  ) {
    return null
  }

  return {
    selectedConsolidationIds,
    selectedWindowIds,
    selectedProceduralIds,
    selectedEpisodeIds,
    selectedConversationTurnIds,
    selectedRelationshipLines: [],
    searchTrace: {
      firstHop: {
        focus: firstHopFocus,
        summary: firstHopSummary,
        targetIds: firstHopTargetIds,
      },
      secondHop: {
        action: secondHopAction,
        evidenceGap,
        summary: secondHopSummary,
        targetIds: secondHopTargetIds,
      },
      thirdHop: {
        ambiguityPosture,
        summary: thirdHopSummary,
      },
    },
    opening: '',
    certainty,
    rationale,
    confidence,
  } satisfies NonNullable<OrganicMemoryPromptContext['recollectionPlan']>
}

export function parseMemoryRecollectionIntentPayload(raw: string) {
  const parsed = parseJsonObjectFromText(raw)
  if (!parsed)
    return null

  const parseRecollectionAgenda = () => {
    const rawAgenda = parsed.recollectionAgenda
    if (!rawAgenda || typeof rawAgenda !== 'object')
      return null
    const candidate = rawAgenda as Record<string, unknown>
    if (!Array.isArray(candidate.candidateTimeScopes) || !Array.isArray(candidate.candidateEraFacets))
      return null
    const candidateTimeScopes: NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>['candidateTimeScopes'] = []
    for (const item of candidate.candidateTimeScopes.slice(0, 4)) {
      if (!item || typeof item !== 'object')
        return null
      const scopeCandidate = item as Record<string, unknown>
      const scope = scopeCandidate.scope === 'recent'
        || scopeCandidate.scope === 'recent-or-mid'
        || scopeCandidate.scope === 'cross-session'
        || scopeCandidate.scope === 'experience-matched'
        || scopeCandidate.scope === 'distant'
        ? scopeCandidate.scope
        : null
      const weight = readUnitInterval(scopeCandidate.weight)
      const rationale = readNullableBriefText(scopeCandidate, 'rationale', 180)
      if (!scope || weight === null || !rationale)
        return null
      candidateTimeScopes.push({
        scope,
        weight,
        rationale: rationale.value,
      })
    }
    const candidateEraFacets: NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>['candidateEraFacets'] = []
    for (const item of candidate.candidateEraFacets.slice(0, 4)) {
      if (!item || typeof item !== 'object')
        return null
      const facetCandidate = item as Record<string, unknown>
      const facet = facetCandidate.facet === 'phase'
        || facetCandidate.facet === 'relationship-era'
        || facetCandidate.facet === 'task-era'
        || facetCandidate.facet === 'self-era'
        || facetCandidate.facet === 'window'
        ? facetCandidate.facet
        : null
      const weight = readUnitInterval(facetCandidate.weight)
      const rationale = readNullableBriefText(facetCandidate, 'rationale', 180)
      if (!facet || weight === null || !rationale)
        return null
      candidateEraFacets.push({
        facet,
        weight,
        rationale: rationale.value,
      })
    }
    const candidateProcedureLines = readBriefTextArray(
      candidate.candidateProcedureLines,
      4,
      180,
    )
    const whyRecallNow = readRequiredBriefText(candidate.whyRecallNow, 220)
    const goalSimilarity = readUnitInterval(candidate.goalSimilarity)
    const relationshipNeed = readUnitInterval(candidate.relationshipNeed)
    const affectivePull = readUnitInterval(candidate.affectivePull)
    const sceneFamiliarity = readUnitInterval(candidate.sceneFamiliarity)
    const uncertaintyTolerance = candidate.uncertaintyTolerance === 'low'
      || candidate.uncertaintyTolerance === 'medium'
      || candidate.uncertaintyTolerance === 'high'
      ? candidate.uncertaintyTolerance
      : null
    if (
      !candidateProcedureLines
      || !whyRecallNow
      || goalSimilarity === null
      || relationshipNeed === null
      || affectivePull === null
      || sceneFamiliarity === null
      || !uncertaintyTolerance
    ) {
      return null
    }
    return {
      whyRecallNow,
      goalSimilarity,
      relationshipNeed,
      affectivePull,
      sceneFamiliarity,
      candidateTimeScopes,
      candidateEraFacets,
      candidateProcedureLines,
      uncertaintyTolerance,
    } satisfies NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>
  }

  const mode = parsed.mode === 'none'
    || parsed.mode === 'conversation-history'
    || parsed.mode === 'autobiographical-history'
    || parsed.mode === 'relationship-history'
    || parsed.mode === 'execution-procedure'
    || parsed.mode === 'experience-pattern'
    ? parsed.mode
    : null
  if (!mode)
    return null
  const temporalFocus = parsed.temporalFocus === 'recent'
    || parsed.temporalFocus === 'recent-or-mid'
    || parsed.temporalFocus === 'cross-session'
    || parsed.temporalFocus === 'experience-matched'
    || parsed.temporalFocus === 'distant'
    ? parsed.temporalFocus
    : null
  const rationale = readRequiredBriefText(parsed.rationale, 220)
  const confidence = readUnitInterval(parsed.confidence)
  const queryHints = readBriefTextArray(parsed.queryHints, 8, 120)
  const recollectionAgenda = parseRecollectionAgenda()
  if (
    !temporalFocus
    || !rationale
    || confidence === null
    || !queryHints
    || !recollectionAgenda
    || typeof parsed.searchEpisodes !== 'boolean'
    || typeof parsed.searchConversations !== 'boolean'
    || typeof parsed.searchProceduralExperience !== 'boolean'
  ) {
    return null
  }

  if (mode === 'none') {
    if (parsed.searchEpisodes || parsed.searchConversations || parsed.searchProceduralExperience)
      return null
    return {
      mode,
      temporalFocus,
      searchEpisodes: false,
      searchConversations: false,
      searchProceduralExperience: false,
      queryHints,
      rationale,
      confidence,
      recollectionAgenda,
    } satisfies NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
  }

  return {
    mode,
    temporalFocus,
    searchEpisodes: parsed.searchEpisodes === true,
    searchConversations: parsed.searchConversations === true,
    searchProceduralExperience: parsed.searchProceduralExperience === true,
    queryHints,
    rationale,
    confidence,
    recollectionAgenda,
  } satisfies NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
}

export function parseMemoryRecollectionSpeechPlanPayload(raw: string) {
  const parsed = parseJsonObjectFromText(raw)
  if (!parsed)
    return null

  const surfaceMode = parsed.surfaceMode === 'internal-only'
    || parsed.surfaceMode === 'gist-first'
    || parsed.surfaceMode === 'answer-anchoring'
    || parsed.surfaceMode === 'procedural-carry'
    || parsed.surfaceMode === 'relationship-continuity'
    ? parsed.surfaceMode
    : null
  const placement = parsed.placement === 'before-payoff'
    || parsed.placement === 'inside-payoff'
    || parsed.placement === 'after-payoff'
    || parsed.placement === 'internal-only'
    ? parsed.placement
    : null
  const certainty = parsed.certainty === 'firm' || parsed.certainty === 'approximate' || parsed.certainty === 'fragmentary'
    ? parsed.certainty
    : null
  const rationale = readRequiredBriefText(parsed.rationale, 220)
  const confidence = readUnitInterval(parsed.confidence)
  const shouldSurface = typeof parsed.shouldSurface === 'boolean'
    ? parsed.shouldSurface
    : null
  if (
    shouldSurface === null
    || !surfaceMode
    || !placement
    || !certainty
    || !rationale
    || confidence === null
  ) {
    return null
  }
  if (shouldSurface && (placement === 'internal-only' || surfaceMode === 'internal-only'))
    return null
  if (!shouldSurface && (placement !== 'internal-only' || surfaceMode !== 'internal-only'))
    return null

  return {
    shouldSurface,
    surfaceMode,
    placement,
    certainty,
    rationale,
    confidence,
  } satisfies NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']>
}

export function parseMemoryDeliberationPayload(
  raw: string,
  candidateIds: AlicizationMemoryPlanningCandidateIdSet,
) {
  const parsed = parseJsonObjectFromText(raw)
  if (!parsed)
    return null

  const readConflictVariants = () => {
    const value = parsed.conflictVariants
    if (!Array.isArray(value))
      return null
    return [] as NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']>
  }

  const readBundles = () => {
    const value = parsed.selectedBundles
    if (!Array.isArray(value))
      return null
    return [] as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedBundles']
  }

  const readChains = () => {
    const value = parsed.selectedChains
    if (!Array.isArray(value))
      return null
    return [] as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedChains']
  }

  const selectedEraIds = readBriefTextArray(parsed.selectedEraIds, 8, 120, candidateIds.eraIds)
  const selectedConsolidationIds = readBriefTextArray(
    parsed.selectedConsolidationIds,
    8,
    120,
    candidateIds.consolidationIds,
  )
  const selectedWindowIds = readBriefTextArray(
    parsed.selectedWindowIds,
    8,
    120,
    candidateIds.windowIds,
  )
  const selectedProcedureIds = readBriefTextArray(
    parsed.selectedProcedureIds,
    8,
    120,
    candidateIds.procedureIds,
  )
  const selectedEpisodeIds = readBriefTextArray(
    parsed.selectedEpisodeIds,
    8,
    120,
    candidateIds.episodeIds,
  )
  const selectedConversationTurnIds = readBriefTextArray(
    parsed.selectedConversationTurnIds,
    8,
    120,
    candidateIds.conversationTurnIds,
  )
  const providerRelationshipLines = readBriefTextArray(parsed.selectedRelationshipLines, 6, 220)
  const conflictVariants = readConflictVariants()
  const providerStableCore = readBriefTextArray(parsed.stableCore, 6, 220)
  const providerUnsafeDetails = readBriefTextArray(parsed.unsafeDetails, 6, 220)
  const selectedBundles = readBundles()
  const selectedChains = readChains()
  const surfacePolicy = parsed.surfacePolicy === 'internal-only'
    || parsed.surfacePolicy === 'gist-first'
    || parsed.surfacePolicy === 'answer-anchoring'
    || parsed.surfacePolicy === 'procedural-carry'
    || parsed.surfacePolicy === 'relationship-continuity'
    ? parsed.surfacePolicy
    : null
  const shouldRecall = typeof parsed.shouldRecall === 'boolean'
    ? parsed.shouldRecall
    : null
  const confidence = readUnitInterval(parsed.confidence)
  const whyNow = readRequiredBriefText(parsed.whyNow, 220)
  const conflictSeverity = parsed.conflictSeverity === 'none'
    || parsed.conflictSeverity === 'low'
    || parsed.conflictSeverity === 'medium'
    || parsed.conflictSeverity === 'high'
    ? parsed.conflictSeverity
    : null
  if (
    shouldRecall === null
    || !selectedEraIds
    || !selectedConsolidationIds
    || !selectedWindowIds
    || !selectedProcedureIds
    || !selectedEpisodeIds
    || !selectedConversationTurnIds
    || !providerRelationshipLines
    || !selectedBundles
    || !selectedChains
    || !conflictSeverity
    || !conflictVariants
    || !providerStableCore
    || !providerUnsafeDetails
    || !surfacePolicy
    || confidence === null
    || !whyNow
  ) {
    return null
  }
  if (!shouldRecall && surfacePolicy !== 'internal-only')
    return null

  return {
    shouldRecall,
    selectedEraIds,
    selectedConsolidationIds,
    selectedWindowIds,
    selectedProcedureIds,
    selectedEpisodeIds,
    selectedConversationTurnIds,
    selectedRelationshipLines: [],
    selectedEras: [],
    selectedPeriods: [],
    selectedEpisodes: [],
    conflictSeverity,
    conflictVariants,
    stableCore: [],
    unsafeDetails: [],
    selectedProcedures: [],
    selectedBundles,
    selectedChains,
    surfacePolicy,
    confidence,
    whyNow,
    inwardLine: '',
    // NOTICE: Visible reply wording belongs exclusively to the visible reply engine.
    visibleLine: null,
  } satisfies NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>
}

export async function generateMemoryRecollectionSpeechPlanWithGateway(input: {
  recallSeed: string
  recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
  recollectionPlan: NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
  proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
  recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  generateMainGatewayText: AlicizationMemoryGatewayTextProvider
  cardId: string
  digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}) {
  const hasCandidates = input.consolidatedMemories.length > 0
    || input.recollectedWindows.length > 0
    || input.proceduralMemories.length > 0
    || input.recalledEpisodes.length > 0
    || input.recalledConversationHistory.length > 0
  if (!hasCandidates && !input.recollectionPlan)
    return null
  const consolidatedMemorySlice = selectMemoryPlanningCandidateSlice(
    input.consolidatedMemories,
    item => item.id,
    4,
  )
  const recollectedWindowSlice = selectMemoryPlanningCandidateSlice(
    input.recollectedWindows,
    item => item.id,
    4,
  )
  const proceduralMemorySlice = selectMemoryPlanningCandidateSlice(
    input.proceduralMemories,
    item => item.id,
    4,
  )
  const recalledEpisodeSlice = selectMemoryPlanningCandidateSlice(
    input.recalledEpisodes,
    item => item.id,
    4,
  )
  const recalledConversationHistorySlice = selectMemoryPlanningCandidateSlice(
    input.recalledConversationHistory,
    item => item.turnId,
    4,
  )

  const system = buildAlicizationProviderFactBlock('alicization-memory-recollection-speech-plan-context', {
    version: 'alicization-memory-recollection-speech-plan-context-v1',
    recallSeed: sanitizeBriefText(input.recallSeed, 220),
    recollectionIntent: input.recollectionIntent,
    recollectionPlan: input.recollectionPlan,
    consolidatedMemories: consolidatedMemorySlice.map(item => ({
      id: normalizeMemoryPlanningId(item.id),
      kind: item.kind,
      periodKey: item.periodKey,
      summary: sanitizeBriefText(item.summary, 180),
      lesson: sanitizeBriefText(item.lesson ?? '', 160) || null,
      confidence: item.confidence,
      provenance: item.dominantProvenance,
    })),
    recollectedWindows: recollectedWindowSlice.map(item => ({
      id: normalizeMemoryPlanningId(item.id),
      label: sanitizeBriefText(item.label, 120),
      summary: sanitizeBriefText(item.summary, 180),
      confidence: item.confidence,
      provenance: item.dominantProvenance,
      cues: item.cues.slice(0, 4),
    })),
    proceduralMemories: proceduralMemorySlice.map(item => ({
      id: normalizeMemoryPlanningId(item.id),
      label: sanitizeBriefText(item.label, 120),
      approach: sanitizeBriefText(item.approach, 180),
      pitfalls: item.pitfalls.slice(0, 3),
      confidence: item.confidence,
    })),
    recalledEpisodes: recalledEpisodeSlice.map(item => ({
      id: normalizeMemoryPlanningId(item.id),
      sourceKind: item.sourceKind,
      whatHappened: sanitizeBriefText(item.whatHappened, 180),
      felt: sanitizeBriefText(item.felt ?? '', 120) || null,
      whatChanged: sanitizeBriefText(item.whatChanged ?? '', 160) || null,
      confidence: item.confidence,
      provenance: item.latestReconsolidation?.provenance ?? item.provenance,
    })),
    recalledConversationHistory: recalledConversationHistorySlice.map(item => ({
      turnId: normalizeMemoryPlanningId(item.turnId) || null,
      userText: sanitizeBriefText(item.userText, 160),
      assistantText: sanitizeBriefText(item.assistantText, 160),
      createdAt: item.createdAt,
      provenance: item.provenance,
    })),
    sourcePolicy: {
      visibleReplyDraftsAllowed: false,
      currentTurnPayoffAuthoritative: true,
      reviewCandidatesConfirmedLongTermMemory: false,
      rawTranscriptPersonaTrainingEligible: false,
    },
  })
  const user = buildAlicizationProviderFactBlock('alicization-memory-recollection-speech-plan-request', {
    version: 'alicization-memory-recollection-speech-plan-request-v1',
    operation: 'plan-recollection-surface-policy',
    responseSchema: 'alicization_memory_recollection_speech_plan',
  })
  const raw = await input.generateMainGatewayText({
    system,
    user,
    timeoutMs: 4_000,
    source: 'counterfactual-deliberation',
    responseFormat: alicizationMemoryRecollectionSpeechPlanResponseFormat,
    cardId: input.cardId,
    injectCustomDirectives: false,
    injectPerformanceManifest: false,
    digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface,
  }).catch(() => null)

  if (!raw)
    return null
  return parseMemoryRecollectionSpeechPlanPayload(raw)
}

export async function generateMemoryRecollectionPlanWithGateway(input: {
  recallSeed: string
  recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
  proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
  recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  generateMainGatewayText: AlicizationMemoryGatewayTextProvider
  cardId: string
  digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}) {
  const consolidatedMemorySlice = selectMemoryPlanningCandidateSlice(
    input.consolidatedMemories,
    item => item.id,
    6,
  )
  const recollectedWindowSlice = selectMemoryPlanningCandidateSlice(
    input.recollectedWindows,
    item => item.id,
    5,
  )
  const proceduralMemorySlice = selectMemoryPlanningCandidateSlice(
    input.proceduralMemories,
    item => item.id,
    5,
  )
  const recalledEpisodeSlice = selectMemoryPlanningCandidateSlice(
    input.recalledEpisodes,
    item => item.id,
    5,
  )
  const recalledConversationHistorySlice = selectMemoryPlanningCandidateSlice(
    input.recalledConversationHistory,
    item => item.turnId,
    5,
  )
  const system = buildAlicizationProviderFactBlock('alicization-memory-recollection-plan-context', {
    version: 'alicization-memory-recollection-plan-context-v1',
    recallSeed: sanitizeBriefText(input.recallSeed, 220),
    recollectionIntent: input.recollectionIntent,
    consolidatedMemories: consolidatedMemorySlice.map(item => ({
      id: normalizeMemoryPlanningId(item.id),
      kind: item.kind,
      periodKey: item.periodKey,
      summary: sanitizeBriefText(item.summary, 180),
      lesson: sanitizeBriefText(item.lesson ?? '', 160) || null,
      confidence: item.confidence,
      cues: item.cues.slice(0, 4),
    })),
    recollectedWindows: recollectedWindowSlice.map(item => ({
      id: normalizeMemoryPlanningId(item.id),
      label: sanitizeBriefText(item.label, 120),
      summary: sanitizeBriefText(item.summary, 180),
      confidence: item.confidence,
      cues: item.cues.slice(0, 4),
    })),
    proceduralMemories: proceduralMemorySlice.map(item => ({
      id: normalizeMemoryPlanningId(item.id),
      label: sanitizeBriefText(item.label, 120),
      approach: sanitizeBriefText(item.approach, 180),
      pitfalls: item.pitfalls.slice(0, 3),
      confidence: item.confidence,
      cues: item.cues.slice(0, 4),
    })),
    recalledEpisodes: recalledEpisodeSlice.map(item => ({
      id: normalizeMemoryPlanningId(item.id),
      sourceKind: item.sourceKind,
      threadAnchor: sanitizeBriefText(item.threadAnchor ?? '', 120) || null,
      whatHappened: sanitizeBriefText(item.whatHappened, 180),
      lesson: sanitizeBriefText(item.lesson ?? '', 160) || null,
      confidence: item.confidence,
    })),
    recalledConversationHistory: recalledConversationHistorySlice.map(item => ({
      turnId: normalizeMemoryPlanningId(item.turnId) || null,
      userText: sanitizeBriefText(item.userText, 160),
      assistantText: sanitizeBriefText(item.assistantText, 160),
      createdAt: item.createdAt,
    })),
    sourcePolicy: {
      candidateIdsAuthoritative: true,
      visibleReplyDraftsAllowed: false,
      continuationSeedWordingEligible: false,
      reviewCandidatesConfirmedLongTermMemory: false,
      rawConversationPersonaTrainingEligible: false,
    },
  })
  const user = buildAlicizationProviderFactBlock('alicization-memory-recollection-plan-request', {
    version: 'alicization-memory-recollection-plan-request-v1',
    operation: 'select-recollection-anchors',
    responseSchema: 'alicization_memory_recollection_plan',
  })
  const raw = await input.generateMainGatewayText({
    system,
    user,
    timeoutMs: 4_000,
    source: 'counterfactual-deliberation',
    responseFormat: alicizationMemoryRecollectionPlanResponseFormat,
    cardId: input.cardId,
    injectCustomDirectives: false,
    injectPerformanceManifest: false,
    digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface,
  }).catch(() => null)

  if (!raw)
    return null
  return parseMemoryRecollectionPlanPayload(raw, buildMemoryPlanningCandidateIdSet({
    consolidatedMemories: consolidatedMemorySlice,
    recollectedWindows: recollectedWindowSlice,
    proceduralMemories: proceduralMemorySlice,
    recalledEpisodes: recalledEpisodeSlice,
    recalledConversationHistory: recalledConversationHistorySlice,
  }))
}

export async function generateMemoryRecollectionIntentWithGateway(input: {
  recallSeed: string
  heuristicIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  recallGovernor?: {
    mode: string
    threadAnchors?: string[]
    affectAnchors?: string[]
    relationshipAnchors?: string[]
    sceneAnchor?: string | null
    salienceBias?: number | null
  } | null
  hostAttitude: string
  activeThoughts: Array<{ text: string }>
  hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
  relationshipDynamics?: OrganicMemoryPromptContext['relationshipDynamics']
  generateMainGatewayText: AlicizationMemoryGatewayTextProvider
  cardId: string
  digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}) {
  if (!sanitizeBriefText(input.recallSeed, 220))
    return null

  const system = buildAlicizationProviderFactBlock('alicization-memory-recollection-intent-context', {
    version: 'alicization-memory-recollection-intent-context-v1',
    recallSeed: sanitizeBriefText(input.recallSeed, 220),
    heuristicIntent: input.heuristicIntent,
    recallGovernor: input.recallGovernor
      ? {
          mode: input.recallGovernor.mode,
          threadAnchors: (input.recallGovernor.threadAnchors ?? []).slice(0, 6),
          affectAnchors: (input.recallGovernor.affectAnchors ?? []).slice(0, 6),
          relationshipAnchors: (input.recallGovernor.relationshipAnchors ?? []).slice(0, 6),
          sceneAnchor: sanitizeBriefText(input.recallGovernor.sceneAnchor ?? '', 120) || null,
          salienceBias: input.recallGovernor.salienceBias ?? null,
        }
      : null,
    hostAttitude: sanitizeBriefText(input.hostAttitude, 120),
    activeThoughts: input.activeThoughts.slice(0, 4).map(item => sanitizeBriefText(item.text, 120)),
    hostPersonModel: input.hostPersonModel
      ? {
          summary: sanitizeBriefText(input.hostPersonModel.summary, 180),
          routines: input.hostPersonModel.routines.slice(0, 4),
          sensitivities: input.hostPersonModel.sensitivities.slice(0, 4),
          repairTriggers: input.hostPersonModel.repairTriggers.slice(0, 4),
          recurrentBurdens: input.hostPersonModel.recurrentBurdens.slice(0, 4),
        }
      : null,
    relationshipDynamics: input.relationshipDynamics
      ? {
          hostAttitude: sanitizeBriefText(input.relationshipDynamics.hostAttitude, 120),
          previousHostAttitude: sanitizeBriefText(input.relationshipDynamics.previousHostAttitude ?? '', 120) || null,
          source: input.relationshipDynamics.source,
        }
      : null,
    sourcePolicy: {
      presentFacingAllowed: true,
      timeLanguageExactDayConstraint: false,
      reviewCandidatesConfirmedLongTermMemory: false,
      rawTranscriptPersonaTrainingEligible: false,
    },
  })
  const user = buildAlicizationProviderFactBlock('alicization-memory-recollection-intent-request', {
    version: 'alicization-memory-recollection-intent-request-v1',
    operation: 'plan-recollection-intent',
    responseSchema: 'alicization_memory_recollection_intent',
  })
  const raw = await input.generateMainGatewayText({
    system,
    user,
    timeoutMs: 4_000,
    source: 'counterfactual-deliberation',
    responseFormat: alicizationMemoryRecollectionIntentResponseFormat,
    cardId: input.cardId,
    injectCustomDirectives: false,
    injectPerformanceManifest: false,
    digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface,
  }).catch(() => null)

  if (!raw)
    return null
  return parseMemoryRecollectionIntentPayload(raw)
}

export async function generateMemoryDeliberationWithGateway(input: {
  recallSeed: string
  recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
  recollectionPlan: NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null
  recollectionSpeechPlan: NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']> | null
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
  proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
  recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  generateMainGatewayText: AlicizationMemoryGatewayTextProvider
  cardId: string
  digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}) {
  const hasCandidates = input.consolidatedMemories.length > 0
    || input.recollectedWindows.length > 0
    || input.proceduralMemories.length > 0
    || input.recalledEpisodes.length > 0
    || input.recalledConversationHistory.length > 0
  if (!hasCandidates && !input.recollectionPlan)
    return null
  const consolidatedMemorySlice = selectMemoryPlanningCandidateSlice(
    input.consolidatedMemories,
    item => item.id,
    6,
  )
  const recollectedWindowSlice = selectMemoryPlanningCandidateSlice(
    input.recollectedWindows,
    item => item.id,
    6,
  )
  const proceduralMemorySlice = selectMemoryPlanningCandidateSlice(
    input.proceduralMemories,
    item => item.id,
    6,
  )
  const recalledEpisodeSlice = selectMemoryPlanningCandidateSlice(
    input.recalledEpisodes,
    item => item.id,
    6,
  )
  const recalledConversationHistorySlice = selectMemoryPlanningCandidateSlice(
    input.recalledConversationHistory,
    item => item.turnId,
    6,
  )

  const system = buildAlicizationProviderFactBlock('alicization-memory-deliberation-context', {
    version: 'alicization-memory-deliberation-context-v1',
    recallSeed: sanitizeBriefText(input.recallSeed, 220),
    recollectionIntent: input.recollectionIntent,
    recollectionPlan: input.recollectionPlan,
    recollectionSpeechPlan: input.recollectionSpeechPlan,
    consolidatedMemories: consolidatedMemorySlice.map(item => ({
      id: normalizeMemoryPlanningId(item.id),
      kind: item.kind,
      facet: item.facet ?? null,
      periodKey: item.periodKey,
      summary: sanitizeBriefText(item.summary, 180),
      lesson: sanitizeBriefText(item.lesson ?? '', 160) || null,
      confidence: item.confidence,
      provenance: item.dominantProvenance,
    })),
    recollectedWindows: recollectedWindowSlice.map(item => ({
      id: normalizeMemoryPlanningId(item.id),
      label: sanitizeBriefText(item.label, 120),
      summary: sanitizeBriefText(item.summary, 180),
      confidence: item.confidence,
      provenance: item.dominantProvenance,
      cues: item.cues.slice(0, 4),
    })),
    proceduralMemories: proceduralMemorySlice.map(item => ({
      id: normalizeMemoryPlanningId(item.id),
      label: sanitizeBriefText(item.label, 120),
      approach: sanitizeBriefText(item.approach, 180),
      pitfalls: item.pitfalls.slice(0, 3),
      confidence: item.confidence,
    })),
    recalledEpisodes: recalledEpisodeSlice.map(item => ({
      id: normalizeMemoryPlanningId(item.id),
      sourceKind: item.sourceKind,
      threadAnchor: sanitizeBriefText(item.threadAnchor ?? '', 120) || null,
      whatHappened: sanitizeBriefText(item.whatHappened, 180),
      relationshipMeaning: sanitizeBriefText(item.relationshipMeaning ?? '', 160) || null,
      lesson: sanitizeBriefText(item.lesson ?? '', 160) || null,
      confidence: item.confidence,
      provenance: item.latestReconsolidation?.provenance ?? item.provenance,
    })),
    recalledConversationHistory: recalledConversationHistorySlice.map(item => ({
      turnId: normalizeMemoryPlanningId(item.turnId) || null,
      userText: sanitizeBriefText(item.userText, 160),
      assistantText: sanitizeBriefText(item.assistantText, 160),
      createdAt: item.createdAt,
      provenance: item.provenance,
    })),
    sourcePolicy: {
      candidateIdsAuthoritative: true,
      candidatePresenceForcesRecall: false,
      visibleReplyDraftsAllowed: false,
      continuationSeedWordingEligible: false,
      reviewCandidatesConfirmedLongTermMemory: false,
      rawConversationPersonaTrainingEligible: false,
    },
  })
  const user = buildAlicizationProviderFactBlock('alicization-memory-deliberation-request', {
    version: 'alicization-memory-deliberation-request-v1',
    operation: 'deliberate-memory-recall',
    responseSchema: 'alicization_memory_deliberation',
  })
  const raw = await input.generateMainGatewayText({
    system,
    user,
    timeoutMs: 4_000,
    source: 'counterfactual-deliberation',
    responseFormat: alicizationMemoryDeliberationResponseFormat,
    cardId: input.cardId,
    injectCustomDirectives: false,
    injectPerformanceManifest: false,
    digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface,
  }).catch(() => null)

  if (!raw)
    return null
  return parseMemoryDeliberationPayload(raw, buildMemoryPlanningCandidateIdSet({
    consolidatedMemories: consolidatedMemorySlice,
    recollectedWindows: recollectedWindowSlice,
    proceduralMemories: proceduralMemorySlice,
    recalledEpisodes: recalledEpisodeSlice,
    recalledConversationHistory: recalledConversationHistorySlice,
  }))
}
