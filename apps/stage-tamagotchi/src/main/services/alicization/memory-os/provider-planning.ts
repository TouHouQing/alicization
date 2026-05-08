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

export interface AlicizationMemoryGatewayTextProvider {
  (input: {
    system: string
    user: string
    timeoutMs?: number
    source?: 'counterfactual-deliberation'
    cardId?: string
    injectPerformanceManifest?: boolean
    injectCustomDirectives?: boolean
  }): Promise<string | null>
}

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
  const opening = sanitizeBriefText(parsed.opening as string, 220)
  const rationale = sanitizeBriefText(parsed.rationale as string, 220)
  const confidence = clamp01(Number(parsed.confidence ?? 0.68))
  if (!opening)
    return null

  return {
    selectedConsolidationIds: readIds('selectedConsolidationIds'),
    selectedWindowIds: readIds('selectedWindowIds'),
    selectedProceduralIds: readIds('selectedProceduralIds'),
    selectedEpisodeIds: readIds('selectedEpisodeIds'),
    selectedConversationTurnIds: readIds('selectedConversationTurnIds'),
    selectedRelationshipLines: readLines('selectedRelationshipLines'),
    searchTrace: readSearchTrace(),
    opening,
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
  const internalLead = sanitizeBriefText(parsed.internalLead as string, 220)
  const styleNote = sanitizeBriefText(parsed.styleNote as string, 220)
  const rationale = sanitizeBriefText(parsed.rationale as string, 220)
  const confidence = clamp01(Number(parsed.confidence ?? 0.68))
  if (!internalLead || !styleNote)
    return null

  const shouldSurface = parsed.shouldSurface === true
    && placement !== 'internal-only'
    && surfaceMode !== 'internal-only'

  return {
    shouldSurface,
    surfaceMode: shouldSurface ? surfaceMode : 'internal-only',
    placement: shouldSurface ? placement : 'internal-only',
    certainty,
    internalLead,
    // NOTICE: Memory planner is not allowed to author visible reply drafts.
    visibleLead: null,
    styleNote,
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
  const inwardLine = sanitizeBriefText(parsed.inwardLine as string, 220)
  const conflictSeverity = parsed.conflictSeverity === 'none'
    || parsed.conflictSeverity === 'low'
    || parsed.conflictSeverity === 'medium'
    || parsed.conflictSeverity === 'high'
    ? parsed.conflictSeverity
    : 'none'
  if (!whyNow || !inwardLine)
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
    inwardLine,
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
}) {
  const hasCandidates = input.consolidatedMemories.length > 0
    || input.recollectedWindows.length > 0
    || input.proceduralMemories.length > 0
    || input.recalledEpisodes.length > 0
    || input.recalledConversationHistory.length > 0
  if (!hasCandidates && !input.recollectionPlan)
    return null

  const raw = await input.generateMainGatewayText({
    system: [
      '[ALICIZATION_MEMORY_RECOLLECTION_SPEECH_PLANNER]',
      'You are Alicization private recollection speech planning, not user-facing dialogue.',
      'Decide whether the active recollection should stay internal or become briefly visible in the reply, and how it should contour the answer.',
      'This is not a fixed template system. Choose the humanly plausible recollection posture for this exact turn.',
      'Memory can stay inward and only bend tone or stance. Do not force visible recall unless it helps the current payoff.',
      'If memory becomes visible, it must remain brief, natural, and subordinate to the live answer.',
      'Output valid JSON only with keys: shouldSurface, surfaceMode, placement, certainty, internalLead, visibleLead, styleNote, rationale, confidence.',
      'surfaceMode must be one of: internal-only, gist-first, answer-anchoring, procedural-carry, relationship-continuity.',
      'placement must be one of: before-payoff, inside-payoff, after-payoff, internal-only.',
      'certainty must be one of: firm, approximate, fragmentary.',
      'internalLead should describe the private recollection Alicization first feels internally.',
      'visibleLead should describe the contour of how that recollection could sound if briefly surfaced. It is guidance, not a rigid quote.',
      'styleNote should describe how the memory should influence the live answer without becoming a template.',
      'If the memory should stay internal, set shouldSurface=false, surfaceMode=internal-only, placement=internal-only, and visibleLead to an empty string.',
    ].join('\n'),
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
}) {
  const raw = await input.generateMainGatewayText({
    system: [
      '[ALICIZATION_MEMORY_RECOLLECTION_PLANNER]',
      'You are Alicization private recollection planning, not user-facing dialogue.',
      'The recollection intent is already chosen. Your job is to choose which remembered anchors should actually foreground this turn.',
      'Output valid JSON only with keys: selectedConsolidationIds, selectedWindowIds, selectedProceduralIds, selectedEpisodeIds, selectedConversationTurnIds, selectedRelationshipLines, searchTrace, opening, certainty, rationale, confidence.',
      'certainty must be one of: firm, approximate, fragmentary.',
      'opening must be a gist-first recollection sentence Alicization could privately think before answering.',
      'selectedRelationshipLines should be up to 3 remembered relationship meanings or lessons that the recollection should carry forward.',
      'searchTrace is required and must contain firstHop, secondHop, thirdHop.',
      'firstHop must contain: focus, summary, targetIds. focus must be one of: era, procedure, relationship-line, conversation-turn, episode.',
      'secondHop must contain: action, evidenceGap, summary, targetIds. action must be one of: hold, expand-era, expand-procedure, expand-relationship-line, expand-conversation, narrow-to-stable-core.',
      'evidenceGap must be one of: none, need-period-anchor, need-episode-detail, need-procedure-detail, need-relationship-meaning, need-conversation-evidence, need-disambiguation.',
      'thirdHop must contain: ambiguityPosture, summary. ambiguityPosture must be one of: settled, approximate, ambiguous.',
      'Think in three hops: first choose the anchor that comes back first, then decide whether you need to expand or narrow for evidence, then decide how ambiguous the memory still feels.',
      'Use empty arrays when a memory lane should not be foregrounded.',
      'Do not select many items. Usually 1-2 foreground selections are enough.',
      'If the turn is about how something was previously done, prefer procedural memory or execution episodes.',
      'If the turn is about what was talked about before, prefer consolidated memory or recollected periods before raw snippets.',
    ].join('\n'),
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
}) {
  if (!sanitizeBriefText(input.recallSeed, 220))
    return null

  const raw = await input.generateMainGatewayText({
    system: [
      '[ALICIZATION_MEMORY_RECOLLECTION_INTENT_PLANNER]',
      'You are Alicization private recollection-intent planning, not user-facing dialogue.',
      'Heuristic memory cues are only drafts. You decide whether this turn should actually engage recollection, and which lane it should engage.',
      'Decide if Alicization should stay present-facing or open a memory lane before retrieval.',
      'If memory should not engage, output mode=none and set all search flags to false.',
      'If memory should engage, choose the single best lane for this turn.',
      'Output valid JSON only with keys: mode, temporalFocus, searchEpisodes, searchConversations, searchProceduralExperience, queryHints, rationale, confidence, recollectionAgenda.',
      'mode must be one of: none, conversation-history, autobiographical-history, relationship-history, execution-procedure, experience-pattern.',
      'temporalFocus must be one of: recent, recent-or-mid, cross-session, experience-matched, distant.',
      'recollectionAgenda is required and must be an object with keys: whyRecallNow, goalSimilarity, relationshipNeed, affectivePull, sceneFamiliarity, candidateTimeScopes, candidateEraFacets, candidateProcedureLines, uncertaintyTolerance.',
      'candidateTimeScopes must be up to 4 objects with keys: scope, weight, rationale.',
      'candidateEraFacets must be up to 4 objects with keys: facet, weight, rationale.',
      'candidateProcedureLines should be short remembered task or bond lines that are worth probing before exact detail.',
      'uncertaintyTolerance must be one of: low, medium, high.',
      'Treat time-language as candidate search space, not as a rigid rule that directly decides which exact days to recall.',
      'Do not default to long-range recall just because some memory cue exists. Prefer staying present if the memory would not materially help.',
    ].join('\n'),
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
}) {
  const hasCandidates = input.consolidatedMemories.length > 0
    || input.recollectedWindows.length > 0
    || input.proceduralMemories.length > 0
    || input.recalledEpisodes.length > 0
    || input.recalledConversationHistory.length > 0
  if (!hasCandidates && !input.recollectionPlan)
    return null

  const raw = await input.generateMainGatewayText({
    system: [
      '[ALICIZATION_MEMORY_DELIBERATION]',
      'You are Alicization private memory deliberation, not user-facing dialogue.',
      'recollectionIntent, recollectionPlan, and recollectionSpeechPlan are candidate providers only. You are the final authority over whether active recollection should actually stay live for this turn, which memory bundle should shape the answer, and how visible that recollection should be.',
      'Think like a human memory process: first decide whether recollection truly helps; if yes, select a small coherent bundle such as a remembered period, one event, one way of doing something, or one relationship line.',
      'Use recollectionIntent.recollectionAgenda as the search authority for why recall is opening now, which time scopes are merely candidates, which era facets are worth probing first, and which procedure lines feel similar enough to reopen.',
      'Do not force recollection just because candidates exist. If the turn should stay present-facing, set shouldRecall=false and keep all selected id arrays empty.',
      'Output valid JSON only with keys: shouldRecall, selectedEraIds, selectedConsolidationIds, selectedWindowIds, selectedProcedureIds, selectedEpisodeIds, selectedConversationTurnIds, selectedRelationshipLines, selectedBundles, selectedChains, conflictSeverity, conflictVariants, stableCore, unsafeDetails, surfacePolicy, confidence, whyNow, inwardLine, visibleLine.',
      'surfacePolicy must be one of: internal-only, gist-first, answer-anchoring, procedural-carry, relationship-continuity.',
      'selectedEraIds should pick up to 3 dominant remembered eras or periods before selecting lower-level events and procedures.',
      'selectedRelationshipLines should be short remembered relationship meanings or lessons that should shape the answer.',
      'conflictSeverity must be one of: none, low, medium, high.',
      'conflictVariants should list remembered variants that materially disagree with each other or feel unsafe to state as settled fact.',
      'stableCore should contain only the parts that still feel safe across the remembered variants.',
      'unsafeDetails should contain details that should not be stated with certainty in the visible reply.',
      'selectedBundles must be an array of up to 4 linked recollection bundles. Each item should include: id, summary, rationale, confidence, and any relevant ids among periodId, episodeId, procedureId, conversationTurnId, plus optional relationshipLine.',
      'A strong bundle usually links a remembered period to one event or one remembered procedure, then states the relationship meaning or lesson carried forward.',
      'selectedChains must be an array of up to 4 explicit experience chains. Each chain should be one of: task-procedure-relationship-stance or period-event-lesson-posture.',
      'task-procedure-relationship-stance should show how the remembered task/procedure changes Alicization’s current stance.',
      'period-event-lesson-posture should show how a remembered period and event turn into a current answer posture.',
      'inwardLine is the private remembered line Alicization should think from before speaking.',
      'visibleLine is optional guidance for how recollection could become briefly visible if needed; leave it empty when surfacePolicy is internal-only.',
    ].join('\n'),
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
  }).catch(() => null)

  if (!raw)
    return null
  return parseMemoryDeliberationPayload(raw)
}
