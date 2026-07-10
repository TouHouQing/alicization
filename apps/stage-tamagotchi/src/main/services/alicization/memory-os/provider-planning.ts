import type { AlicizationDigitalLifeRuntimeSurface } from '../digital-life-kernel'
import type {
  AlicizationMainGatewayGenerateTextProvider,
  AlicizationMainGatewaySource,
} from '../project-state-gateway-contract'
import type { OrganicMemoryPromptContext } from '../runtime-soul'

import { parseJsonObjectFromText } from '../runtime-transport-content'

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
  const body = Object.entries(fields)
    .map(([key, value]) => {
      const normalized = typeof value === 'number'
        ? Number(value.toFixed(2))
        : typeof value === 'boolean'
          ? String(value)
          : sanitizeBriefText(value, 80)
      return normalized || normalized === 0 || normalized === 'false'
        ? `${key}=${normalized}`
        : ''
    })
    .filter(Boolean)
    .join('; ')
  return sanitizeBriefText(`${kind}=${body || 'none'}`, maxChars)
}

function buildMemoryPlanningProjectSelfBriefSystemBlock() {
  return [
    '[ALICIZATION_MEMORY_PLANNING_OWNER_BOUNDARY]',
    'short_term_owner=WorkingMemory',
    'long_term_recall_owner=LongTermMemoryRecall',
    'workbench_role=governance_surface_only',
    'project_state_policy=withheld_for_memory_planning_unless_explicitly_requested',
    'retrieval_inputs=user_intent,entity,time,relationship,memory_evidence',
    'project_status_narration=false',
    'review_candidates_confirmed_memory=false',
    'raw_transcript_persona_training=false',
  ].join('\n')
}

function withProjectStateSystem(input: string) {
  return [
    input,
    buildMemoryPlanningProjectSelfBriefSystemBlock(),
  ].filter(Boolean).join('\n')
}

export interface AlicizationMemoryGatewayTextProvider extends AlicizationMainGatewayGenerateTextProvider<
  Extract<AlicizationMainGatewaySource, 'counterfactual-deliberation'>,
  string,
  {
    cardId?: string
    injectPerformanceManifest?: boolean
    injectCustomDirectives?: boolean
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
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
    internalLead: structuredMemoryPolicyLine('internal_policy', {
      surface: shouldSurface ? surfaceMode : 'internal-only',
      placement: shouldSurface ? placement : 'internal-only',
      certainty,
    }),
    // NOTICE: Memory planner is not allowed to author visible reply drafts.
    visibleLead: null,
    styleNote: structuredMemoryPolicyLine('style_policy', {
      reply_author: 'visible_reply_engine',
      template_policy: 'forbidden',
      source: 'memory_policy',
    }),
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

  const raw = await input.generateMainGatewayText({
    system: withProjectStateSystem([
      '[ALICIZATION_MEMORY_RECOLLECTION_SPEECH_PLANNER]',
      'planner_role=private_recollection_speech_planning; user_facing_dialogue=false',
      'decision_scope=surface_permission_and_answer_contour; visible_reply_authority=false',
      'fixed_template_system=false; exact_turn_policy=required',
      'memory_visibility=internal_allowed; visible_recall_requires_current_payoff=true',
      'visible_recall_priority=subordinate_to_live_answer',
      'output_format=json_only; keys=shouldSurface,surfaceMode,placement,certainty,surfacePolicy,rationale,confidence',
      'enum.surfaceMode=internal-only,gist-first,answer-anchoring,procedural-carry,relationship-continuity',
      'enum.placement=before-payoff,inside-payoff,after-payoff,internal-only',
      'enum.certainty=firm,approximate,fragmentary',
      'reply_prose=false; private_monologue=false; visible_leads=false; sample_wording=false; style_sentences=false',
      'internal_memory_output=shouldSurface:false,surfaceMode:internal-only,placement:internal-only',
    ].join('\n')),
    user: `Recollection speech candidate JSON: ${JSON.stringify({
      recallSeed: sanitizeBriefText(input.recallSeed, 220),
      recollectionIntent: input.recollectionIntent,
      recollectionPlan: input.recollectionPlan,
      consolidatedMemories: input.consolidatedMemories.slice(0, 4).map(item => ({
        id: item.id,
        kind: item.kind,
        periodKey: item.periodKey,
        summary: sanitizeBriefText(item.summary, 180),
        lesson: sanitizeBriefText(item.lesson ?? '', 160) || undefined,
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
        felt: sanitizeBriefText(item.felt ?? '', 120) || undefined,
        whatChanged: sanitizeBriefText(item.whatChanged ?? '', 160) || undefined,
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
    })}`,
    timeoutMs: 4_000,
    source: 'counterfactual-deliberation',
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
  const raw = await input.generateMainGatewayText({
    system: withProjectStateSystem([
      '[ALICIZATION_MEMORY_RECOLLECTION_PLANNER]',
      'planner_role=private_recollection_planning; user_facing_dialogue=false',
      'intent_status=chosen; decision_scope=foreground_remembered_anchors',
      'output_format=json_only; keys=selectedConsolidationIds,selectedWindowIds,selectedProceduralIds,selectedEpisodeIds,selectedConversationTurnIds,selectedRelationshipLines,searchTrace,certainty,rationale,confidence',
      'enum.certainty=firm,approximate,fragmentary',
      'recollection_openings=false; private_monologue=false; visible_leads=false; sample_wording=false; reply_prose=false',
      'selectedRelationshipLines=max3_relationship_meanings_or_lessons',
      'searchTrace is required and must contain firstHop, secondHop, thirdHop.',
      'schema.firstHop=focus,summary,targetIds; enum.firstHop.focus=era,procedure,relationship-line,conversation-turn,episode',
      'schema.secondHop=action,evidenceGap,summary,targetIds; enum.secondHop.action=hold,expand-era,expand-procedure,expand-relationship-line,expand-conversation,narrow-to-stable-core',
      'enum.evidenceGap=none,need-period-anchor,need-episode-detail,need-procedure-detail,need-relationship-meaning,need-conversation-evidence,need-disambiguation',
      'schema.thirdHop=ambiguityPosture,summary; enum.thirdHop.ambiguityPosture=settled,approximate,ambiguous',
      'search_trace_hops=anchor_first,evidence_expand_or_narrow,ambiguity_assessment',
      'non_foregrounded_lane=empty_array',
      'selection_budget=usually_1_to_2_foreground_items',
      'task_procedure_turn=prefer_procedural_memory_or_execution_episodes',
      'prior_conversation_turn=prefer_consolidated_or_period_memory_before_raw_snippets',
      'stage_hold_for_opening=internal_only_or_answer_anchoring',
      'stage_gentle_reopen=small_evidence_bundles; visible_wording_drafts=false',
      'continuation_seed=retrieval_scope_not_wording_guidance',
    ].join('\n')),
    user: `Memory recollection candidate JSON: ${JSON.stringify({
      recallSeed: sanitizeBriefText(input.recallSeed, 220),
      recollectionIntent: input.recollectionIntent,
      consolidatedMemories: input.consolidatedMemories.slice(0, 6).map(item => ({
        id: item.id,
        kind: item.kind,
        periodKey: item.periodKey,
        summary: sanitizeBriefText(item.summary, 180),
        lesson: sanitizeBriefText(item.lesson ?? '', 160) || undefined,
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
        threadAnchor: sanitizeBriefText(item.threadAnchor ?? '', 120) || undefined,
        whatHappened: sanitizeBriefText(item.whatHappened, 180),
        lesson: sanitizeBriefText(item.lesson ?? '', 160) || undefined,
        confidence: item.confidence,
      })),
      recalledConversationHistory: input.recalledConversationHistory.slice(0, 5).map(item => ({
        turnId: item.turnId,
        userText: sanitizeBriefText(item.userText, 160),
        assistantText: sanitizeBriefText(item.assistantText, 160),
        createdAt: item.createdAt,
      })),
    })}`,
    timeoutMs: 4_000,
    source: 'counterfactual-deliberation',
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

  const raw = await input.generateMainGatewayText({
    system: withProjectStateSystem([
      '[ALICIZATION_MEMORY_RECOLLECTION_INTENT_PLANNER]',
      'planner_role=private_recollection_intent_planning; user_facing_dialogue=false',
      'heuristic_cues=draft_only; decision_scope=engage_recollection_and_lane',
      'present_facing_allowed=true; memory_lane_before_retrieval=optional',
      'memory_not_engaged_output=mode:none,all_search_flags:false',
      'memory_engaged_lane_budget=single_best_lane',
      'output_format=json_only; keys=mode,temporalFocus,searchEpisodes,searchConversations,searchProceduralExperience,queryHints,rationale,confidence,recollectionAgenda',
      'enum.mode=none,conversation-history,autobiographical-history,relationship-history,execution-procedure,experience-pattern',
      'enum.temporalFocus=recent,recent-or-mid,cross-session,experience-matched,distant',
      'recollectionAgenda is required and must be an object with keys: whyRecallNow, goalSimilarity, relationshipNeed, affectivePull, sceneFamiliarity, candidateTimeScopes, candidateEraFacets, candidateProcedureLines, uncertaintyTolerance.',
      'candidateTimeScopes must be up to 4 objects with keys: scope, weight, rationale.',
      'candidateEraFacets must be up to 4 objects with keys: facet, weight, rationale.',
      'candidateProcedureLines=max4_short_task_or_bond_lines_before_exact_detail',
      'enum.uncertaintyTolerance=low,medium,high',
      'time_language=candidate_search_space_not_exact_day_rule',
      'long_range_recall_default=false; present_facing_preferred_when_memory_low_value=true',
    ].join('\n')),
    user: `Recollection intent candidate JSON: ${JSON.stringify({
      recallSeed: sanitizeBriefText(input.recallSeed, 220),
      heuristicIntent: input.heuristicIntent,
      recallGovernor: input.recallGovernor
        ? {
            mode: input.recallGovernor.mode,
            threadAnchors: (input.recallGovernor.threadAnchors ?? []).slice(0, 6),
            affectAnchors: (input.recallGovernor.affectAnchors ?? []).slice(0, 6),
            relationshipAnchors: (input.recallGovernor.relationshipAnchors ?? []).slice(0, 6),
            sceneAnchor: sanitizeBriefText(input.recallGovernor.sceneAnchor ?? '', 120) || undefined,
            salienceBias: input.recallGovernor.salienceBias ?? undefined,
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
            previousHostAttitude: sanitizeBriefText(input.relationshipDynamics.previousHostAttitude ?? '', 120) || undefined,
            source: input.relationshipDynamics.source,
          }
        : null,
    })}`,
    timeoutMs: 4_000,
    source: 'counterfactual-deliberation',
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

  const raw = await input.generateMainGatewayText({
    system: withProjectStateSystem([
      '[ALICIZATION_MEMORY_DELIBERATION]',
      'planner_role=private_memory_deliberation; user_facing_dialogue=false',
      'candidate_inputs=recollectionIntent,recollectionPlan,recollectionSpeechPlan; final_authority=memory_deliberation',
      'decision_order=recall_value,bundle_selection,surface_policy',
      'recollectionAgenda=search_authority; time_scopes=candidates; era_facets=probe_order; procedure_lines=similarity_cues',
      'candidate_presence_forces_recall=false; present_facing_output=shouldRecall:false,selected_ids:empty',
      'output_format=json_only; keys=shouldRecall,selectedEraIds,selectedConsolidationIds,selectedWindowIds,selectedProcedureIds,selectedEpisodeIds,selectedConversationTurnIds,selectedRelationshipLines,selectedBundles,selectedChains,conflictSeverity,conflictVariants,stableCore,unsafeDetails,surfacePolicy,confidence,whyNow',
      'enum.surfacePolicy=internal-only,gist-first,answer-anchoring,procedural-carry,relationship-continuity',
      'selectedEraIds=max3_dominant_eras_or_periods_before_lower_level_events',
      'selectedRelationshipLines=short_relationship_meanings_or_lessons',
      'enum.conflictSeverity=none,low,medium,high',
      'conflictVariants=material_disagreement_or_unsafe_settled_fact',
      'stableCore=safe_across_variants_only',
      'unsafeDetails=not_certain_visible_fact',
      'selectedBundles=max4_linked_bundles_with_ids_summary_rationale_confidence_relationshipLine_optional',
      'strong_bundle_shape=period_plus_event_or_procedure_plus_relationship_meaning',
      'selectedChains=max4; allowed=task-procedure-relationship-stance,period-event-lesson-posture',
      'task_procedure_chain=task_or_procedure_to_current_stance',
      'period_event_chain=period_and_event_to_current_answer_posture',
      'private_monologue=false; visible_lines=false; sample_wording=false; closeness_guidance=false; reply_prose=false',
      'stage_hold_for_opening=internal_only_or_answer_anchoring; selected_evidence=small',
      'stage_gentle_reopen=policy_and_evidence_only; return_sentence=false',
      'continuation_seed=retrieval_scope_not_wording_guidance',
    ].join('\n')),
    user: `Memory deliberation candidate JSON: ${JSON.stringify({
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
        lesson: sanitizeBriefText(item.lesson ?? '', 160) || undefined,
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
        threadAnchor: sanitizeBriefText(item.threadAnchor ?? '', 120) || undefined,
        whatHappened: sanitizeBriefText(item.whatHappened, 180),
        relationshipMeaning: sanitizeBriefText(item.relationshipMeaning ?? '', 160) || undefined,
        lesson: sanitizeBriefText(item.lesson ?? '', 160) || undefined,
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
    })}`,
    timeoutMs: 4_000,
    source: 'counterfactual-deliberation',
    cardId: input.cardId,
    injectCustomDirectives: false,
    injectPerformanceManifest: false,
    digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface,
  }).catch(() => null)

  if (!raw)
    return null
  return parseMemoryDeliberationPayload(raw)
}
