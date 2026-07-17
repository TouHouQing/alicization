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
  alicizationMemoryDeliberationResponseFormat,
  alicizationMemoryRecollectionIntentResponseFormat,
  alicizationMemoryRecollectionPlanResponseFormat,
  alicizationMemoryRecollectionSpeechPlanResponseFormat,
} from './provider-contract'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeBriefText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function structuredMemoryPolicyLine(kind: string, fields: Record<string, string | number | boolean | null | undefined>, maxChars = 220) {
  const label = kind.replace(/_/gu, ' ')
  const body = Object.entries(fields)
    .map(([key, value]) => {
      const normalized = typeof value === 'number'
        ? Number(value.toFixed(2))
        : typeof value === 'boolean'
          ? (value ? 'yes' : 'no')
          : sanitizeBriefText(value, 80)
      return normalized || normalized === 0 || normalized === 'false'
        ? `${key.replace(/_/gu, ' ')} ${normalized}`
        : ''
    })
    .filter(Boolean)
    .join(', ')
  return sanitizeBriefText(`${label}: ${body || 'none'}.`, maxChars)
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

export function parseMemoryRecollectionPlanPayload(raw: string) {
  const parsed = parseJsonObjectFromText(raw)
  if (!parsed)
    return null

  const readIds = (key: string) => {
    const value = parsed[key]
    if (!Array.isArray(value))
      return [] as string[]
    return value
      .map(item => sanitizeBriefText(String(item ?? ''), 120))
      .filter(Boolean)
      .slice(0, 8)
  }

  const readLines = (key: string) => {
    const value = parsed[key]
    if (!Array.isArray(value))
      return [] as string[]
    return value
      .map(item => sanitizeBriefText(String(item ?? ''), 220))
      .filter(Boolean)
      .slice(0, 4)
  }

  const readSearchTrace = () => {
    const value = parsed.searchTrace
    if (!value || typeof value !== 'object')
      return null
    const candidate = value as Record<string, unknown>
    const firstHopCandidate = candidate.firstHop && typeof candidate.firstHop === 'object'
      ? candidate.firstHop as Record<string, unknown>
      : null
    const secondHopCandidate = candidate.secondHop && typeof candidate.secondHop === 'object'
      ? candidate.secondHop as Record<string, unknown>
      : null
    const thirdHopCandidate = candidate.thirdHop && typeof candidate.thirdHop === 'object'
      ? candidate.thirdHop as Record<string, unknown>
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
    if (!firstHopFocus || !secondHopAction || !evidenceGap || !ambiguityPosture)
      return null
    return {
      firstHop: {
        focus: firstHopFocus,
        summary: sanitizeBriefText(String(firstHopCandidate?.summary ?? ''), 220) || 'The recollection search chose the first remembered anchor for this turn.',
        targetIds: Array.isArray(firstHopCandidate?.targetIds)
          ? firstHopCandidate.targetIds.map(item => sanitizeBriefText(String(item ?? ''), 120)).filter(Boolean).slice(0, 6)
          : [],
      },
      secondHop: {
        action: secondHopAction,
        evidenceGap,
        summary: sanitizeBriefText(String(secondHopCandidate?.summary ?? ''), 220) || 'The recollection search decided whether to expand or narrow the active memory lane.',
        targetIds: Array.isArray(secondHopCandidate?.targetIds)
          ? secondHopCandidate.targetIds.map(item => sanitizeBriefText(String(item ?? ''), 120)).filter(Boolean).slice(0, 6)
          : [],
      },
      thirdHop: {
        ambiguityPosture,
        summary: sanitizeBriefText(String(thirdHopCandidate?.summary ?? ''), 220) || 'The recollection search set the ambiguity posture for the visible answer.',
      },
    } satisfies NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionPlan']>['searchTrace']>
  }

  const certainty = parsed.certainty === 'firm' || parsed.certainty === 'approximate' || parsed.certainty === 'fragmentary'
    ? parsed.certainty
    : 'approximate'
  const rationale = sanitizeBriefText(parsed.rationale as string, 220)
  const confidence = clamp01(Number(parsed.confidence ?? 0.68))

  return {
    selectedConsolidationIds: readIds('selectedConsolidationIds'),
    selectedWindowIds: readIds('selectedWindowIds'),
    selectedProceduralIds: readIds('selectedProceduralIds'),
    selectedEpisodeIds: readIds('selectedEpisodeIds'),
    selectedConversationTurnIds: readIds('selectedConversationTurnIds'),
    selectedRelationshipLines: readLines('selectedRelationshipLines'),
    searchTrace: readSearchTrace(),
    opening: structuredMemoryPolicyLine('opening_policy', {
      surface: 'internal_structured',
      certainty,
      selected: readIds('selectedConsolidationIds').length
        + readIds('selectedWindowIds').length
        + readIds('selectedProceduralIds').length
        + readIds('selectedEpisodeIds').length
        + readIds('selectedConversationTurnIds').length,
    }),
    certainty,
    rationale: rationale || 'The recollection planner selected the most humanly plausible memory foreground.',
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
    const candidateTimeScopes: NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>['candidateTimeScopes'] = Array.isArray(candidate.candidateTimeScopes)
      ? candidate.candidateTimeScopes
          .map((item) => {
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
            if (!scope)
              return null
            return {
              scope: scope as NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>['candidateTimeScopes'][number]['scope'],
              weight: clamp01(Number(scopeCandidate.weight ?? 0.5)),
              rationale: sanitizeBriefText(String(scopeCandidate.rationale ?? ''), 180) || null,
            }
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .slice(0, 4)
      : []
    const candidateEraFacets: NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>['candidateEraFacets'] = Array.isArray(candidate.candidateEraFacets)
      ? candidate.candidateEraFacets
          .map((item) => {
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
            if (!facet)
              return null
            return {
              facet: facet as NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>['candidateEraFacets'][number]['facet'],
              weight: clamp01(Number(facetCandidate.weight ?? 0.5)),
              rationale: sanitizeBriefText(String(facetCandidate.rationale ?? ''), 180) || null,
            }
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .slice(0, 4)
      : []
    const candidateProcedureLines = Array.isArray(candidate.candidateProcedureLines)
      ? candidate.candidateProcedureLines
          .map(item => sanitizeBriefText(String(item ?? ''), 180))
          .filter(Boolean)
          .slice(0, 6)
      : []
    const whyRecallNow = sanitizeBriefText(String(candidate.whyRecallNow ?? ''), 220)
    const uncertaintyTolerance = candidate.uncertaintyTolerance === 'low'
      || candidate.uncertaintyTolerance === 'medium'
      || candidate.uncertaintyTolerance === 'high'
      ? candidate.uncertaintyTolerance
      : 'medium'
    if (!whyRecallNow)
      return null
    return {
      whyRecallNow,
      goalSimilarity: clamp01(Number(candidate.goalSimilarity ?? 0)),
      relationshipNeed: clamp01(Number(candidate.relationshipNeed ?? 0)),
      affectivePull: clamp01(Number(candidate.affectivePull ?? 0)),
      sceneFamiliarity: clamp01(Number(candidate.sceneFamiliarity ?? 0)),
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
    : 'recent-or-mid'
  const rationale = sanitizeBriefText(parsed.rationale as string, 220)
  const confidence = clamp01(Number(parsed.confidence ?? 0.68))
  const queryHints = Array.isArray(parsed.queryHints)
    ? parsed.queryHints.map(item => sanitizeBriefText(String(item ?? ''), 120)).filter(Boolean).slice(0, 8)
    : []
  const recollectionAgenda = parseRecollectionAgenda()

  if (mode === 'none') {
    return {
      mode,
      temporalFocus,
      searchEpisodes: false,
      searchConversations: false,
      searchProceduralExperience: false,
      queryHints,
      rationale: rationale || 'The recollection intent planner decided the turn should stay present-facing instead of opening long-range memory.',
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
    rationale: rationale || 'The recollection intent planner selected the memory lane that best matches the current turn.',
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
    : 'gist-first'
  const placement = parsed.placement === 'before-payoff'
    || parsed.placement === 'inside-payoff'
    || parsed.placement === 'after-payoff'
    || parsed.placement === 'internal-only'
    ? parsed.placement
    : surfaceMode === 'internal-only'
      ? 'internal-only'
      : 'inside-payoff'
  const certainty = parsed.certainty === 'firm' || parsed.certainty === 'approximate' || parsed.certainty === 'fragmentary'
    ? parsed.certainty
    : 'approximate'
  const rationale = sanitizeBriefText(parsed.rationale as string, 220)
  const confidence = clamp01(Number(parsed.confidence ?? 0.68))

  const shouldSurface = parsed.shouldSurface === true
    && placement !== 'internal-only'
    && surfaceMode !== 'internal-only'

  return {
    shouldSurface,
    surfaceMode: shouldSurface ? surfaceMode : 'internal-only',
    placement: shouldSurface ? placement : 'internal-only',
    certainty,
    rationale: rationale || 'The recollection speech plan decided whether the memory should stay inward or contour the answer silently.',
    confidence,
  } satisfies NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']>
}

export function parseMemoryDeliberationPayload(raw: string) {
  const parsed = parseJsonObjectFromText(raw)
  if (!parsed)
    return null

  const readIds = (key: string) => {
    const value = parsed[key]
    if (!Array.isArray(value))
      return [] as string[]
    return value
      .map(item => sanitizeBriefText(String(item ?? ''), 120))
      .filter(Boolean)
      .slice(0, 8)
  }

  const readLines = (key: string) => {
    const value = parsed[key]
    if (!Array.isArray(value))
      return [] as string[]
    return value
      .map(item => sanitizeBriefText(String(item ?? ''), 220))
      .filter(Boolean)
      .slice(0, 6)
  }

  const readConflictVariants = () => {
    const value = parsed.conflictVariants
    if (!Array.isArray(value))
      return [] as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']
    return value
      .map((item, index) => {
        if (!item || typeof item !== 'object')
          return null
        const candidate = item as Record<string, unknown>
        const summary = sanitizeBriefText(String(candidate.summary ?? ''), 220)
        if (!summary)
          return null
        const provenance: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']>[number]['provenance'] = candidate.provenance === 'observed'
          || candidate.provenance === 'remembered'
          || candidate.provenance === 'dreamt'
          || candidate.provenance === 'inferred'
          || candidate.provenance === 'reconstructed'
          ? candidate.provenance
          : 'reconstructed'
        return {
          id: sanitizeBriefText(String(candidate.id ?? ''), 120) || `conflict-${index + 1}`,
          summary,
          provenance,
          reason: sanitizeBriefText(String(candidate.reason ?? ''), 220) || null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 4)
  }

  const readBundles = () => {
    const value = parsed.selectedBundles
    if (!Array.isArray(value))
      return [] as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedBundles']
    return value
      .map((item, index) => {
        if (!item || typeof item !== 'object')
          return null
        const candidate = item as Record<string, unknown>
        const summary = sanitizeBriefText(String(candidate.summary ?? ''), 220)
        if (!summary)
          return null
        return {
          id: sanitizeBriefText(String(candidate.id ?? ''), 120) || `bundle-${index + 1}`,
          summary,
          rationale: sanitizeBriefText(String(candidate.rationale ?? ''), 220) || 'The recollection bundle links the memories most worth carrying into this turn.',
          confidence: clamp01(Number(candidate.confidence ?? 0.68)),
          periodId: sanitizeBriefText(String(candidate.periodId ?? ''), 120) || null,
          episodeId: sanitizeBriefText(String(candidate.episodeId ?? ''), 120) || null,
          procedureId: sanitizeBriefText(String(candidate.procedureId ?? ''), 120) || null,
          conversationTurnId: sanitizeBriefText(String(candidate.conversationTurnId ?? ''), 120) || null,
          relationshipLine: sanitizeBriefText(String(candidate.relationshipLine ?? ''), 220) || null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 4)
  }

  const readChains = () => {
    const value = parsed.selectedChains
    if (!Array.isArray(value))
      return [] as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedChains']
    return value
      .map((item, index) => {
        if (!item || typeof item !== 'object')
          return null
        const candidate = item as Record<string, unknown>
        const summary = sanitizeBriefText(String(candidate.summary ?? ''), 220)
        if (!summary)
          return null
        const kind = candidate.kind === 'task-procedure-relationship-stance'
          || candidate.kind === 'period-event-lesson-posture'
          ? candidate.kind
          : null
        if (!kind)
          return null
        return {
          id: sanitizeBriefText(String(candidate.id ?? ''), 120) || `chain-${index + 1}`,
          kind: kind as 'task-procedure-relationship-stance' | 'period-event-lesson-posture',
          summary,
          rationale: sanitizeBriefText(String(candidate.rationale ?? ''), 220) || 'The recollection chain links remembered experience into the current answer posture.',
          confidence: clamp01(Number(candidate.confidence ?? 0.68)),
          taskCue: sanitizeBriefText(String(candidate.taskCue ?? ''), 160) || null,
          periodSummary: sanitizeBriefText(String(candidate.periodSummary ?? ''), 180) || null,
          eventSummary: sanitizeBriefText(String(candidate.eventSummary ?? ''), 180) || null,
          procedureSummary: sanitizeBriefText(String(candidate.procedureSummary ?? ''), 180) || null,
          relationshipMeaning: sanitizeBriefText(String(candidate.relationshipMeaning ?? ''), 180) || null,
          lesson: sanitizeBriefText(String(candidate.lesson ?? ''), 180) || null,
          currentStance: sanitizeBriefText(String(candidate.currentStance ?? ''), 180) || null,
          answerPosture: sanitizeBriefText(String(candidate.answerPosture ?? ''), 180) || null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 4)
  }

  const surfacePolicy = parsed.surfacePolicy === 'internal-only'
    || parsed.surfacePolicy === 'gist-first'
    || parsed.surfacePolicy === 'answer-anchoring'
    || parsed.surfacePolicy === 'procedural-carry'
    || parsed.surfacePolicy === 'relationship-continuity'
    ? parsed.surfacePolicy
    : 'internal-only'
  const shouldRecall = parsed.shouldRecall === true
  const confidence = clamp01(Number(parsed.confidence ?? 0.68))
  const whyNow = sanitizeBriefText(parsed.whyNow as string, 220)
  const conflictSeverity = parsed.conflictSeverity === 'none'
    || parsed.conflictSeverity === 'low'
    || parsed.conflictSeverity === 'medium'
    || parsed.conflictSeverity === 'high'
    ? parsed.conflictSeverity
    : 'none'
  if (!whyNow)
    return null

  return {
    shouldRecall,
    selectedEraIds: readIds('selectedEraIds'),
    selectedConsolidationIds: readIds('selectedConsolidationIds'),
    selectedWindowIds: readIds('selectedWindowIds'),
    selectedProcedureIds: readIds('selectedProcedureIds'),
    selectedEpisodeIds: readIds('selectedEpisodeIds'),
    selectedConversationTurnIds: readIds('selectedConversationTurnIds'),
    selectedRelationshipLines: readLines('selectedRelationshipLines'),
    selectedEras: [],
    selectedPeriods: [],
    selectedEpisodes: [],
    conflictSeverity,
    conflictVariants: readConflictVariants(),
    stableCore: readLines('stableCore'),
    unsafeDetails: readLines('unsafeDetails'),
    selectedProcedures: [],
    selectedBundles: readBundles(),
    selectedChains: readChains(),
    surfacePolicy,
    confidence,
    whyNow,
    inwardLine: structuredMemoryPolicyLine('inward_policy', {
      recall: shouldRecall,
      surface: surfacePolicy,
      conflict: conflictSeverity,
      selected: readIds('selectedEraIds').length
        + readIds('selectedConsolidationIds').length
        + readIds('selectedWindowIds').length
        + readIds('selectedProcedureIds').length
        + readIds('selectedEpisodeIds').length
        + readIds('selectedConversationTurnIds').length,
    }),
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

  const system = buildAlicizationProviderFactBlock('alicization-memory-recollection-speech-plan-context', {
    version: 'alicization-memory-recollection-speech-plan-context-v1',
    recallSeed: sanitizeBriefText(input.recallSeed, 220),
    recollectionIntent: input.recollectionIntent,
    recollectionPlan: input.recollectionPlan,
    consolidatedMemories: input.consolidatedMemories.slice(0, 4).map(item => ({
      id: item.id,
      kind: item.kind,
      periodKey: item.periodKey,
      summary: sanitizeBriefText(item.summary, 180),
      lesson: sanitizeBriefText(item.lesson ?? '', 160) || null,
      confidence: item.confidence,
      provenance: item.dominantProvenance,
    })),
    recollectedWindows: input.recollectedWindows.slice(0, 4).map(item => ({
      id: item.id,
      label: sanitizeBriefText(item.label, 120),
      summary: sanitizeBriefText(item.summary, 180),
      confidence: item.confidence,
      provenance: item.dominantProvenance,
      cues: item.cues.slice(0, 4),
    })),
    proceduralMemories: input.proceduralMemories.slice(0, 4).map(item => ({
      id: item.id,
      label: sanitizeBriefText(item.label, 120),
      approach: sanitizeBriefText(item.approach, 180),
      pitfalls: item.pitfalls.slice(0, 3),
      confidence: item.confidence,
    })),
    recalledEpisodes: input.recalledEpisodes.slice(0, 4).map(item => ({
      id: item.id,
      sourceKind: item.sourceKind,
      whatHappened: sanitizeBriefText(item.whatHappened, 180),
      felt: sanitizeBriefText(item.felt ?? '', 120) || null,
      whatChanged: sanitizeBriefText(item.whatChanged ?? '', 160) || null,
      confidence: item.confidence,
      provenance: item.latestReconsolidation?.provenance ?? item.provenance,
    })),
    recalledConversationHistory: input.recalledConversationHistory.slice(0, 4).map(item => ({
      turnId: item.turnId,
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
  const system = buildAlicizationProviderFactBlock('alicization-memory-recollection-plan-context', {
    version: 'alicization-memory-recollection-plan-context-v1',
    recallSeed: sanitizeBriefText(input.recallSeed, 220),
    recollectionIntent: input.recollectionIntent,
    consolidatedMemories: input.consolidatedMemories.slice(0, 6).map(item => ({
      id: item.id,
      kind: item.kind,
      periodKey: item.periodKey,
      summary: sanitizeBriefText(item.summary, 180),
      lesson: sanitizeBriefText(item.lesson ?? '', 160) || null,
      confidence: item.confidence,
      cues: item.cues.slice(0, 4),
    })),
    recollectedWindows: input.recollectedWindows.slice(0, 5).map(item => ({
      id: item.id,
      label: sanitizeBriefText(item.label, 120),
      summary: sanitizeBriefText(item.summary, 180),
      confidence: item.confidence,
      cues: item.cues.slice(0, 4),
    })),
    proceduralMemories: input.proceduralMemories.slice(0, 5).map(item => ({
      id: item.id,
      label: sanitizeBriefText(item.label, 120),
      approach: sanitizeBriefText(item.approach, 180),
      pitfalls: item.pitfalls.slice(0, 3),
      confidence: item.confidence,
      cues: item.cues.slice(0, 4),
    })),
    recalledEpisodes: input.recalledEpisodes.slice(0, 5).map(item => ({
      id: item.id,
      sourceKind: item.sourceKind,
      threadAnchor: sanitizeBriefText(item.threadAnchor ?? '', 120) || null,
      whatHappened: sanitizeBriefText(item.whatHappened, 180),
      lesson: sanitizeBriefText(item.lesson ?? '', 160) || null,
      confidence: item.confidence,
    })),
    recalledConversationHistory: input.recalledConversationHistory.slice(0, 5).map(item => ({
      turnId: item.turnId,
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
  return parseMemoryRecollectionPlanPayload(raw)
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

  const system = buildAlicizationProviderFactBlock('alicization-memory-deliberation-context', {
    version: 'alicization-memory-deliberation-context-v1',
    recallSeed: sanitizeBriefText(input.recallSeed, 220),
    recollectionIntent: input.recollectionIntent,
    recollectionPlan: input.recollectionPlan,
    recollectionSpeechPlan: input.recollectionSpeechPlan,
    consolidatedMemories: input.consolidatedMemories.slice(0, 6).map(item => ({
      id: item.id,
      kind: item.kind,
      facet: item.facet ?? null,
      periodKey: item.periodKey,
      summary: sanitizeBriefText(item.summary, 180),
      lesson: sanitizeBriefText(item.lesson ?? '', 160) || null,
      confidence: item.confidence,
      provenance: item.dominantProvenance,
    })),
    recollectedWindows: input.recollectedWindows.slice(0, 6).map(item => ({
      id: item.id,
      label: sanitizeBriefText(item.label, 120),
      summary: sanitizeBriefText(item.summary, 180),
      confidence: item.confidence,
      provenance: item.dominantProvenance,
      cues: item.cues.slice(0, 4),
    })),
    proceduralMemories: input.proceduralMemories.slice(0, 6).map(item => ({
      id: item.id,
      label: sanitizeBriefText(item.label, 120),
      approach: sanitizeBriefText(item.approach, 180),
      pitfalls: item.pitfalls.slice(0, 3),
      confidence: item.confidence,
    })),
    recalledEpisodes: input.recalledEpisodes.slice(0, 6).map(item => ({
      id: item.id,
      sourceKind: item.sourceKind,
      threadAnchor: sanitizeBriefText(item.threadAnchor ?? '', 120) || null,
      whatHappened: sanitizeBriefText(item.whatHappened, 180),
      relationshipMeaning: sanitizeBriefText(item.relationshipMeaning ?? '', 160) || null,
      lesson: sanitizeBriefText(item.lesson ?? '', 160) || null,
      confidence: item.confidence,
      provenance: item.latestReconsolidation?.provenance ?? item.provenance,
    })),
    recalledConversationHistory: input.recalledConversationHistory.slice(0, 6).map(item => ({
      turnId: item.turnId,
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
  return parseMemoryDeliberationPayload(raw)
}
