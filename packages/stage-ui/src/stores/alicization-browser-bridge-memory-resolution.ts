import type {
  AlicizationHostPersonModelSnapshot,
  AlicizationOrganicMemorySnapshot,
} from './alicization-bridge'
import type { BrowserMemoryConsolidationSnapshot } from './alicization-browser-organic-memory'

function sanitizeBriefText(raw: string, maxLength = 160) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxLength)
    : ''
}

function clamp01(value: number) {
  if (Number.isNaN(value))
    return 0
  return Math.min(1, Math.max(0, value))
}

export function browserCertaintyFromConsolidation(input: {
  confidence: number
  provenance: string | null
}) {
  if (input.provenance === 'inferred' || input.provenance === 'dreamt')
    return input.confidence >= 0.78 ? 'approximate' : 'tentative'
  return input.confidence >= 0.72 ? 'settled' : 'approximate'
}

export function buildBrowserRecollectionForeground(input: {
  consolidations: BrowserMemoryConsolidationSnapshot[]
  hostPersonModel: AlicizationHostPersonModelSnapshot | null
}) {
  const procedural = input.consolidations.find(item => item.kind === 'procedural') ?? null
  const relationshipEra = input.consolidations.find(item => item.facet === 'relationship-era') ?? null
  const taskEra = input.consolidations.find(item => item.facet === 'task-era') ?? null
  const selfEra = input.consolidations.find(item => item.facet === 'self-era') ?? null
  const phase = input.consolidations.find(item => item.facet === 'phase') ?? null
  const selected = procedural ?? relationshipEra ?? taskEra ?? selfEra ?? phase
  if (!selected)
    return null

  const mode = selected.kind === 'procedural'
    ? 'execution-procedure' as const
    : selected.facet === 'relationship-era'
      ? 'relationship-history' as const
      : selected.facet === 'task-era'
        ? 'experience-pattern' as const
        : 'autobiographical-history' as const
  const certainty = browserCertaintyFromConsolidation({
    confidence: selected.confidence,
    provenance: selected.dominantProvenance,
  })
  const summary = sanitizeBriefText(selected.summary || selected.lesson || selected.periodKey, 220)
  const surfaceSummary = selected.kind === 'procedural'
    ? sanitizeBriefText(`surface=inward | contour=let the remembered procedure quietly bend the next answer | cue=${selected.lesson || selected.summary}`, 220)
    : input.hostPersonModel?.trustLadder.stage === 'guarded'
      ? sanitizeBriefText(`surface=inward | contour=keep the remembered bond or phase inward until the opening is clearer | cue=${selected.summary}`, 220)
      : sanitizeBriefText(`surface=visible-optional | contour=if it helps, let one brief remembered gesture lead | cue=${selected.summary}`, 220)

  return {
    mode,
    certainty,
    summary,
    surfaceSummary,
    confidence: selected.confidence,
  }
}

export function buildBrowserRecollectionIntent(input: {
  consolidations: BrowserMemoryConsolidationSnapshot[]
  recollectionForeground: AlicizationOrganicMemorySnapshot['recollectionForeground']
}) {
  const foreground = input.recollectionForeground
  if (!foreground)
    return null

  return {
    mode: foreground.mode,
    temporalFocus: foreground.mode === 'execution-procedure'
      ? 'experience-matched' as const
      : foreground.mode === 'relationship-history' || foreground.mode === 'autobiographical-history'
        ? 'cross-session' as const
        : 'recent-or-mid' as const,
    searchEpisodes: true,
    searchConversations: foreground.mode !== 'execution-procedure',
    searchProceduralExperience: foreground.mode === 'execution-procedure' || foreground.mode === 'experience-pattern',
    queryHints: input.consolidations.slice(0, 3).flatMap(item => [
      item.periodKey,
      ...item.cues.slice(0, 2),
    ]).filter(Boolean).slice(0, 8),
    rationale: foreground.mode === 'execution-procedure'
      ? 'Browser fallback is carrying a remembered way of doing this task.'
      : foreground.mode === 'relationship-history'
        ? 'Browser fallback is carrying a remembered relationship-era seam.'
        : 'Browser fallback is carrying remembered autobiographical continuity.',
    confidence: foreground.confidence,
  } satisfies NonNullable<AlicizationOrganicMemorySnapshot['recollectionIntent']>
}

export function buildBrowserRecollectionPlan(input: {
  consolidations: BrowserMemoryConsolidationSnapshot[]
  recollectionForeground: AlicizationOrganicMemorySnapshot['recollectionForeground']
}) {
  const foreground = input.recollectionForeground
  if (!foreground)
    return null

  const selected = input.consolidations[0] ?? null
  return {
    selectedConsolidationIds: selected ? [selected.id] : [],
    selectedWindowIds: [],
    selectedProceduralIds: selected?.kind === 'procedural' ? [selected.id] : [],
    selectedEpisodeIds: [],
    selectedConversationTurnIds: [],
    opening: foreground.summary,
    certainty: foreground.certainty,
    rationale: selected?.kind === 'procedural'
      ? 'Browser fallback foregrounded a remembered procedure before speaking.'
      : 'Browser fallback foregrounded the strongest remembered phase before speaking.',
    confidence: foreground.confidence,
  } satisfies NonNullable<AlicizationOrganicMemorySnapshot['recollectionPlan']>
}

export function buildBrowserRecollectionSpeechPlan(input: {
  recollectionForeground: AlicizationOrganicMemorySnapshot['recollectionForeground']
}) {
  const foreground = input.recollectionForeground
  if (!foreground)
    return null

  const shouldSurface = Boolean(foreground.surfaceSummary && !foreground.surfaceSummary.includes('surface=inward'))
  return {
    shouldSurface,
    surfaceMode: foreground.mode === 'execution-procedure'
      ? 'procedural-carry'
      : foreground.mode === 'relationship-history'
        ? 'relationship-continuity'
        : shouldSurface
          ? 'gist-first'
          : 'internal-only',
    placement: shouldSurface
      ? 'inside-payoff'
      : 'internal-only',
    certainty: foreground.certainty,
    internalLead: foreground.summary,
    visibleLead: null,
    styleNote: foreground.surfaceSummary
      ? foreground.surfaceSummary
      : 'Let the recollection stay inward unless the current answer truly needs it.',
    rationale: shouldSurface
      ? 'Browser fallback can let this recollection briefly contour the visible answer.'
      : 'Browser fallback should keep this recollection inward and continuity-shaped.',
    confidence: foreground.confidence,
  } satisfies NonNullable<AlicizationOrganicMemorySnapshot['recollectionSpeechPlan']>
}

export function buildBrowserKnowledgeEvidence(input: {
  consolidations: BrowserMemoryConsolidationSnapshot[]
  recollectionForeground: AlicizationOrganicMemorySnapshot['recollectionForeground']
  hostPersonModel: AlicizationHostPersonModelSnapshot | null
}) {
  const validationCount = input.consolidations.filter(item => item.confidence >= 0.72).length
  const contradictionCount = input.hostPersonModel?.sensitivities.some(item => /robotic|template|pressure|boundary|打扰|机械/u.test(item))
    ? 1
    : 0
  const stronglyValidatedProcedureCount = input.consolidations.filter(item => item.kind === 'procedural' && item.confidence >= 0.76).length
  const contradictionHeavyFactCount = input.recollectionForeground?.surfaceSummary?.includes('surface=inward')
    ? 1
    : 0
  return {
    validationCount,
    contradictionCount,
    stronglyValidatedProcedureCount,
    contradictionHeavyFactCount,
  } satisfies NonNullable<AlicizationOrganicMemorySnapshot['knowledgeEvidence']>
}

export function buildBrowserSelfEvolution(input: {
  hostPersonModel: AlicizationHostPersonModelSnapshot | null
  recollectionForeground: AlicizationOrganicMemorySnapshot['recollectionForeground']
  knowledgeEvidence: NonNullable<AlicizationOrganicMemorySnapshot['knowledgeEvidence']>
  now: () => number
}) {
  const doctrine = sanitizeBriefText(
    input.hostPersonModel?.repairTriggers[0]
    || input.hostPersonModel?.preferredClosenessByContext[0]?.preference
    || '',
    180,
  ) || null
  const burdenLine = sanitizeBriefText(input.hostPersonModel?.recurrentBurdens[0] ?? '', 180) || null
  const trustMeaning = sanitizeBriefText(input.hostPersonModel?.trustLadder.rationale ?? '', 180) || null
  const latestInflection = sanitizeBriefText(
    [
      doctrine,
      burdenLine,
    ].filter(Boolean).join(' | '),
    180,
  ) || null
  if (!latestInflection && !trustMeaning)
    return null

  const contradictionPressure = clamp01(input.knowledgeEvidence.contradictionCount * 0.22 + input.knowledgeEvidence.contradictionHeavyFactCount * 0.24)
  const learningReadiness = clamp01(
    Math.min(1, input.knowledgeEvidence.validationCount * 0.12) * 0.48
    + Math.min(1, input.knowledgeEvidence.stronglyValidatedProcedureCount * 0.18) * 0.28
    + contradictionPressure * 0.24,
  )
  const nextLearningAction = contradictionPressure >= 0.4
    ? 'reflect'
    : input.knowledgeEvidence.stronglyValidatedProcedureCount >= 1
      ? 'internalize'
      : 'record'
  return {
    version: 'self-evolution-kernel-v1',
    updatedAt: input.now(),
    evolutionMomentum: clamp01(learningReadiness * 0.72),
    learningReadiness,
    contradictionPressure,
    revisionPressure: contradictionPressure >= 0.4 ? 0.44 : 0.22,
    autobiographicalStability: clamp01(input.hostPersonModel?.trustLadder.score ?? 0.58),
    dominantTrajectory: latestInflection ?? trustMeaning,
    relationshipDoctrine: doctrine,
    latestInflection,
    burdenLine,
    trustMeaning,
    nextLearningAction,
    nextLearningReason: nextLearningAction === 'reflect'
      ? 'Browser fallback is carrying a fragile repair/boundary seam and should consolidate it before widening warmth.'
      : nextLearningAction === 'internalize'
        ? 'Browser fallback has seen a stable enough procedural carry to keep it as a durable local skill line.'
        : 'Browser fallback should keep recording this continuity line before promoting it.',
    shouldRecord: nextLearningAction === 'record',
    shouldReflect: nextLearningAction === 'reflect',
    shouldVerify: false,
    shouldRevise: false,
    shouldInternalize: nextLearningAction === 'internalize',
    activeLearningFocuses: [
      doctrine ? 'relationship-repair-rhythm' : null,
      burdenLine ? 'burden-sensitive-care' : null,
      input.knowledgeEvidence.stronglyValidatedProcedureCount >= 1 ? 'internalize-procedure' : null,
    ].filter(Boolean) as string[],
    sourceSignals: [
      doctrine,
      burdenLine,
      trustMeaning,
      input.recollectionForeground?.summary ?? null,
    ].filter(Boolean) as string[],
    summary: sanitizeBriefText(
      [
        latestInflection,
        trustMeaning,
      ].filter(Boolean).join(' | '),
      220,
    ),
  } satisfies NonNullable<AlicizationOrganicMemorySnapshot['selfEvolution']>
}

export function buildBrowserMemoryStageReplay(input: {
  recollectionForeground: AlicizationOrganicMemorySnapshot['recollectionForeground']
  recollectionPlan: AlicizationOrganicMemorySnapshot['recollectionPlan']
  recollectionSpeechPlan: AlicizationOrganicMemorySnapshot['recollectionSpeechPlan']
  selfEvolution: AlicizationOrganicMemorySnapshot['selfEvolution']
  recallLatencyPolicy?: AlicizationOrganicMemorySnapshot['recallLatencyPolicy']
  now: () => number
}) {
  const summary = input.recollectionForeground?.summary ?? input.recollectionPlan?.opening ?? ''
  if (!summary && !input.selfEvolution)
    return null
  return {
    version: 'organic-memory-stage-replay-v1',
    producedAt: input.now(),
    stages: [
      {
        stage: 'candidate-ranking',
        summary: sanitizeBriefText(summary || 'Browser fallback ranked the strongest remembered continuity line.', 220),
        latencyMs: 0,
        budgetClass: 'realtime-reply',
        outputs: [input.recollectionForeground?.mode ?? 'none'],
        diagnostics: [input.recollectionForeground?.surfaceSummary ?? '', `recall-action=${input.recallLatencyPolicy?.recallAction ?? 'shallow-answer'}`],
      },
      {
        stage: 'surface-planning',
        summary: sanitizeBriefText(input.recollectionSpeechPlan?.styleNote || 'Browser fallback shaped recollection into the visible surface.', 220),
        latencyMs: 0,
        budgetClass: 'realtime-reply',
        outputs: [input.recollectionSpeechPlan?.surfaceMode ?? 'none'],
        diagnostics: [input.recollectionSpeechPlan?.rationale ?? '', input.recallLatencyPolicy?.summary ?? ''],
      },
      {
        stage: 'self-evolution-integration',
        summary: sanitizeBriefText(input.selfEvolution?.summary ?? 'Browser fallback synthesized local learning pressure.', 220),
        latencyMs: 0,
        budgetClass: 'realtime-reply',
        outputs: [input.selfEvolution?.nextLearningAction ?? 'hold'],
        diagnostics: [input.selfEvolution?.nextLearningReason ?? ''],
      },
    ],
  } satisfies NonNullable<AlicizationOrganicMemorySnapshot['memoryStageReplay']>
}

export function buildBrowserMemoryResolutionLedger(input: {
  recollectionForeground: AlicizationOrganicMemorySnapshot['recollectionForeground']
  recollectionPlan: AlicizationOrganicMemorySnapshot['recollectionPlan']
  recollectionSpeechPlan: AlicizationOrganicMemorySnapshot['recollectionSpeechPlan']
  now: () => number
}) {
  const summary = input.recollectionForeground?.summary ?? input.recollectionPlan?.opening ?? ''
  if (!summary)
    return null
  const surfaceConfidence = Math.max(0, Math.min(1, input.recollectionForeground?.confidence ?? input.recollectionPlan?.confidence ?? input.recollectionSpeechPlan?.confidence ?? 0.5))
  const shouldStayInward = input.recollectionSpeechPlan?.shouldSurface === false || input.recollectionSpeechPlan?.placement === 'internal-only'
  const shouldLabelUncertainty = input.recollectionPlan?.certainty === 'approximate' || input.recollectionSpeechPlan?.certainty === 'approximate'
  const visibleCarryMode = shouldStayInward
    ? 'withhold' as const
    : input.recollectionSpeechPlan?.surfaceMode === 'answer-anchoring' || input.recollectionSpeechPlan?.surfaceMode === 'relationship-continuity'
      ? 'explicit-recall' as const
      : input.recollectionSpeechPlan?.surfaceMode === 'gist-first'
        ? 'gist-only' as const
        : 'tone-carry' as const
  const closureState = shouldStayInward
    ? 'inward-only' as const
    : shouldLabelUncertainty
      ? 'approximate-recall' as const
      : 'grounded-recall' as const
  return {
    version: 'memory-resolution-ledger-v1',
    producedAt: input.now(),
    dominantClusterId: 'browser-fallback:primary',
    dominantClusterSummary: sanitizeBriefText(summary, 220),
    competingClusterId: null,
    competingClusterSummary: null,
    candidates: [{
      id: 'browser-fallback:primary',
      summary: sanitizeBriefText(summary, 220),
      score: input.recollectionForeground?.confidence ?? input.recollectionPlan?.confidence ?? 0.5,
      status: 'selected',
      reason: sanitizeBriefText(input.recollectionPlan?.rationale ?? input.recollectionSpeechPlan?.rationale ?? summary, 220) || null,
    }],
    selectedCandidates: [{
      id: 'browser-fallback:primary',
      summary: sanitizeBriefText(summary, 220),
      score: surfaceConfidence,
      status: 'selected',
      reason: sanitizeBriefText(input.recollectionPlan?.rationale ?? input.recollectionSpeechPlan?.rationale ?? summary, 220) || null,
    }],
    rejectedCandidates: [],
    finalSurfacePolicy: input.recollectionSpeechPlan?.surfaceMode ?? null,
    shouldStayInward,
    shouldDelayUntilAfterPayoff: input.recollectionSpeechPlan?.placement === 'after-payoff',
    stableCoreOnly: input.recollectionForeground?.surfaceSummary?.includes('surface=inward') ?? false,
    suppressionTags: [],
    closureState,
    surfaceConfidence,
    shouldLabelUncertainty,
    visibleCarryMode,
    conflictPressure: shouldStayInward
      ? 'medium'
      : shouldLabelUncertainty
        ? 'low'
        : 'none',
    retrievalQuality: surfaceConfidence >= 0.8
      ? 'high'
      : surfaceConfidence >= 0.55
        ? 'medium'
        : 'low',
    finalRationale: sanitizeBriefText(input.recollectionPlan?.rationale ?? input.recollectionSpeechPlan?.rationale ?? summary, 220) || null,
  } satisfies NonNullable<AlicizationOrganicMemorySnapshot['memoryResolutionLedger']>
}
