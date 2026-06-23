import type { AlicizationEpisodicEventRecord } from '../../../../shared/eventa'
import type { AlicizationRelationshipLineCandidate } from '../memory-search-retrieval-operators'
import type {
  MemoryClusterState,
  MemoryDeliberationSnapshot,
  RecollectionIntentSnapshot,
  RecollectionPlanSnapshot,
} from '../runtime-organic-memory-prompt-types'
import type { OrganicMemoryPromptContext } from '../runtime-soul'

import { sanitizeOrganicMemoryText } from '../runtime-organic-memory-search-prelude'

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
  else if (selectedEpisodeIds.size === 0) {
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

  const selectedEpisodes = input.recalledEpisodes.filter(item => selectedEpisodeIds.has(item.id))
  const conflictingVariants = selectedEpisodes.filter((item) => {
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

export function applyMemoryDeliberationToSpeechPlan(input: {
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
    // NOTICE: Memory OS may describe inward recollection pressure, but it must
    // not hand a visible reply draft to the response layer. Visible wording is
    // authored only by the provider mind or second-pass rewrite.
    visibleLead: null,
    styleNote: speechPlan?.styleNote || 'Let recollection contour the answer without turning into a rigid reply shell.',
    rationale: deliberation.whyNow || speechPlan?.rationale || '',
    confidence: deliberation.confidence,
  } satisfies NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']>
}

export function rankMemoryDeliberationBundles(input: {
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

export function rankMemoryDeliberationChains(input: {
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
