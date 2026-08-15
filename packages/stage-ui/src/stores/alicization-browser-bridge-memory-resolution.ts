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
  const evidence = sanitizeBriefText(selected.lesson || selected.summary, 220)
  const surfaceSummary = sanitizeBriefText(evidence || summary, 220) || null

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

  const temporalFocus = foreground.mode === 'execution-procedure'
    ? 'experience-matched' as const
    : foreground.mode === 'relationship-history' || foreground.mode === 'autobiographical-history'
      ? 'cross-session' as const
      : 'recent-or-mid' as const

  return {
    mode: foreground.mode,
    temporalFocus,
    searchEpisodes: true,
    searchProceduralExperience: foreground.mode === 'execution-procedure' || foreground.mode === 'experience-pattern',
    queryHints: input.consolidations.slice(0, 3).flatMap(item => [
      item.periodKey,
      ...item.cues.slice(0, 2),
    ]).filter(Boolean).slice(0, 8),
    rationale: `source=browser-memory | mode=${foreground.mode} | recall=${temporalFocus}`,
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
    opening: foreground.summary,
    certainty: foreground.certainty,
    rationale: `source=browser-memory | selected=${selected?.kind === 'procedural' ? 'procedural' : 'phase'}`,
    confidence: foreground.confidence,
  } satisfies NonNullable<AlicizationOrganicMemorySnapshot['recollectionPlan']>
}

export function buildBrowserRecollectionSpeechPlan(input: {
  recollectionForeground: AlicizationOrganicMemorySnapshot['recollectionForeground']
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
}) {
  const foreground = input.recollectionForeground
  if (!foreground)
    return null

  const guardedRelationship = foreground.mode === 'relationship-history'
    && input.hostPersonModel?.trustLadder.stage === 'guarded'
  const shouldSurface = foreground.mode !== 'execution-procedure' && !guardedRelationship
  const surfaceMode = shouldSurface
    ? foreground.mode === 'relationship-history'
      ? 'relationship-continuity' as const
      : 'gist-first' as const
    : foreground.mode === 'execution-procedure'
      ? 'procedural-carry' as const
      : 'internal-only' as const
  return {
    shouldSurface,
    surfaceMode,
    placement: shouldSurface
      ? 'inside-payoff'
      : 'internal-only',
    certainty: foreground.certainty,
    rationale: `source=browser-memory | placement=${shouldSurface ? 'inside-payoff' : 'internal-only'} | mode=${foreground.mode}`,
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
  const contradictionHeavyFactCount = input.recollectionForeground?.mode === 'relationship-history'
    && input.hostPersonModel?.trustLadder.stage === 'guarded'
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
    nextLearningReason: null,
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
        summary: sanitizeBriefText(summary, 220),
        latencyMs: 0,
        budgetClass: 'realtime-reply',
        outputs: [input.recollectionForeground?.mode ?? 'none'],
        diagnostics: [input.recollectionForeground?.summary ?? '', `recall-action=${input.recallLatencyPolicy?.recallAction ?? 'shallow-answer'}`],
      },
      {
        stage: 'surface-planning',
        summary: sanitizeBriefText([
          `surface=${input.recollectionSpeechPlan?.surfaceMode ?? 'none'}`,
          `placement=${input.recollectionSpeechPlan?.placement ?? 'none'}`,
          `certainty=${input.recollectionSpeechPlan?.certainty ?? 'none'}`,
        ].join(' | '), 220),
        latencyMs: 0,
        budgetClass: 'realtime-reply',
        outputs: [input.recollectionSpeechPlan?.surfaceMode ?? 'none'],
        diagnostics: [input.recollectionSpeechPlan?.rationale ?? '', input.recallLatencyPolicy?.summary ?? ''],
      },
      {
        stage: 'self-evolution-integration',
        summary: sanitizeBriefText(input.selfEvolution?.summary ?? '', 220),
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
    dominantClusterId: 'browser-memory:primary',
    dominantClusterSummary: sanitizeBriefText(summary, 220),
    competingClusterId: null,
    competingClusterSummary: null,
    candidates: [{
      id: 'browser-memory:primary',
      summary: sanitizeBriefText(summary, 220),
      score: input.recollectionForeground?.confidence ?? input.recollectionPlan?.confidence ?? 0.5,
      status: 'selected',
      reason: sanitizeBriefText(input.recollectionPlan?.rationale ?? input.recollectionSpeechPlan?.rationale ?? summary, 220) || null,
    }],
    selectedCandidates: [{
      id: 'browser-memory:primary',
      summary: sanitizeBriefText(summary, 220),
      score: surfaceConfidence,
      status: 'selected',
      reason: sanitizeBriefText(input.recollectionPlan?.rationale ?? input.recollectionSpeechPlan?.rationale ?? summary, 220) || null,
    }],
    rejectedCandidates: [],
    finalSurfacePolicy: input.recollectionSpeechPlan?.surfaceMode ?? null,
    shouldStayInward,
    shouldDelayUntilAfterPayoff: input.recollectionSpeechPlan?.placement === 'after-payoff',
    stableCoreOnly: shouldStayInward,
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
