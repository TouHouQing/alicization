import type { OrganicMemoryPromptContext } from './runtime-soul'

import { clamp01 } from './runtime-soul'

export interface AlicizationMemoryDeliberationLatentControls {
  memoryPressure: 'low' | 'medium' | 'high'
  certaintyPosture: 'firm' | 'approximate' | 'fragmentary'
  certaintyFloor: 'firm' | 'approximate' | 'fragmentary'
  relationshipVector: 'neutral' | 'threaded' | 'procedural' | 'relational'
  procedureCarryStrength: number
  conflictBurden: 'none' | 'low' | 'medium' | 'high'
  dominantProvenance: 'observed' | 'remembered' | 'dreamt' | 'inferred' | 'reconstructed'
  provenancePosture:
    | 'observed-memory'
    | 'remembered-memory'
    | 'reconstructed-memory'
    | 'dream-residue'
    | 'inferred-pattern'
    | 'mixed-memory'
  detailAssertionBudget: 'open' | 'guarded' | 'minimal'
  surfacePermission: 'inward-only' | 'soft-surface' | 'explicit-surface'
  retrospectiveDepth: 'fragment' | 'thread' | 'period'
  openingStrategy:
    | 'payoff-first-inward-carry'
    | 'brief-procedure-carry'
    | 'brief-relationship-carry'
    | 'embedded-memory-carry'
  answerStrategy:
    | 'stance-first'
    | 'period-anchor'
    | 'procedure-anchor'
    | 'relationship-anchor'
  visibilityDiscipline:
    | 'internal-influence-only'
    | 'brief-visible-memory'
    | 'embedded-visible-memory'
  labelUncertainty: boolean
  frameAsPriorProcedure: boolean
  avoidArchiveDump: boolean
  avoidDateRecital: boolean
  avoidExecutionImpersonation: boolean
  stableCore: string[]
  unsafeDetails: string[]
}

export function summarizeMemoryDeliberationLatentControls(
  controls: AlicizationMemoryDeliberationLatentControls,
) {
  return [
    `memory_pressure=${controls.memoryPressure}`,
    `certainty_floor=${controls.certaintyFloor}`,
    `relationship_vector=${controls.relationshipVector}`,
    `surface_permission=${controls.surfacePermission}`,
    `retrospective_depth=${controls.retrospectiveDepth}`,
    `provenance_posture=${controls.provenancePosture}`,
    `detail_assertion_budget=${controls.detailAssertionBudget}`,
    controls.conflictBurden !== 'none' ? `conflict_burden=${controls.conflictBurden}` : '',
    `opening_strategy=${controls.openingStrategy}`,
    `answer_strategy=${controls.answerStrategy}`,
    `visibility_discipline=${controls.visibilityDiscipline}`,
    `label_uncertainty=${controls.labelUncertainty ? 'yes' : 'no'}`,
    `frame_prior_procedure=${controls.frameAsPriorProcedure ? 'yes' : 'no'}`,
    `avoid_archive_dump=${controls.avoidArchiveDump ? 'yes' : 'no'}`,
    `avoid_date_recital=${controls.avoidDateRecital ? 'yes' : 'no'}`,
    `avoid_execution_impersonation=${controls.avoidExecutionImpersonation ? 'yes' : 'no'}`,
  ].filter(Boolean).join(' | ')
}

export function buildMemoryAnswerAnchorTag(
  controls: AlicizationMemoryDeliberationLatentControls,
) {
  return `memory_answer_anchor{surface=${controls.surfacePermission},role=${controls.relationshipVector},certainty=${controls.certaintyFloor},detail=${controls.detailAssertionBudget},depth=${controls.retrospectiveDepth}}`
}

export function buildMemoryOpeningStrategyTag(
  controls: AlicizationMemoryDeliberationLatentControls,
) {
  return `memory_opening_strategy{mode=${controls.openingStrategy},visibility=${controls.visibilityDiscipline}}`
}

export function buildMemoryLatentBoundaryTag(
  controls: AlicizationMemoryDeliberationLatentControls,
) {
  return `memory_boundary{provenance=${controls.provenancePosture},uncertainty=${controls.labelUncertainty ? 'label' : 'settled'},archive_dump=${controls.avoidArchiveDump ? 'forbid' : 'allow'},date_recital=${controls.avoidDateRecital ? 'forbid' : 'allow'},execution_impersonation=${controls.avoidExecutionImpersonation ? 'forbid' : 'allow'}}`
}

export function deriveMemoryDeliberationLatentControls(input: {
  deliberation: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>
  speech: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  shouldStayInward: boolean
}): AlicizationMemoryDeliberationLatentControls {
  const agenda = input.recollectionIntent?.recollectionAgenda ?? null
  const selectedCount
    = input.deliberation.selectedPeriods.length
      + input.deliberation.selectedEpisodes.length
      + input.deliberation.selectedProcedures.length
      + input.deliberation.selectedBundles.length
      + input.deliberation.selectedChains.length
      + input.deliberation.selectedRelationshipLines.length
  const memoryPressure = selectedCount >= 6 || input.deliberation.confidence >= 0.84
    ? 'high'
    : selectedCount >= 3 || input.deliberation.confidence >= 0.68
      ? 'medium'
      : 'low'
  const certaintyPosture = input.speech?.certainty ?? (
    input.deliberation.confidence >= 0.82
      ? 'firm'
      : input.deliberation.confidence >= 0.6
        ? 'approximate'
        : 'fragmentary'
  )
  const explicitConflictSeverity = input.deliberation.conflictSeverity ?? 'none'
  const relationshipVector = input.deliberation.surfacePolicy === 'relationship-continuity'
    || input.deliberation.selectedRelationshipLines.length > 0
    || (agenda?.relationshipNeed ?? 0) >= 0.56
    ? 'relational'
    : input.deliberation.surfacePolicy === 'procedural-carry'
      || input.deliberation.selectedProcedures.length > 0
      || (agenda?.goalSimilarity ?? 0) >= 0.56
      ? 'procedural'
      : input.deliberation.selectedChains.length > 0 || input.deliberation.selectedBundles.length > 0
        ? 'threaded'
        : 'neutral'
  const procedureCarryStrength = Number(clamp01(
    (input.deliberation.selectedProcedures.length > 0 ? 0.42 : 0)
    + (input.deliberation.surfacePolicy === 'procedural-carry' ? 0.38 : 0)
    + ((agenda?.goalSimilarity ?? 0) * 0.18)
    + input.deliberation.confidence * 0.2,
  ).toFixed(2))
  const conflictBurden = explicitConflictSeverity !== 'none'
    ? explicitConflictSeverity
    : input.deliberation.selectedEpisodes.some(item => item.provenance === 'reconstructed')
      ? 'medium'
      : input.deliberation.selectedEpisodes.some(item => item.provenance === 'dreamt' || item.provenance === 'inferred')
        ? 'low'
        : 'none'
  const surfacePermission = input.shouldStayInward
    ? 'inward-only'
    : input.speech?.placement === 'before-payoff' || input.deliberation.surfacePolicy === 'answer-anchoring'
      ? 'explicit-surface'
      : 'soft-surface'
  const retrospectiveDepth = input.deliberation.selectedPeriods.length > 0
    || ((agenda?.candidateEraFacets ?? []).some(item => item.facet !== 'window' && item.weight >= 0.34))
    ? 'period'
    : input.deliberation.selectedChains.length > 0 || input.deliberation.selectedBundles.length > 0
      ? 'thread'
      : 'fragment'
  const stableCore = input.deliberation.stableCore ?? []
  const unsafeDetails = input.deliberation.unsafeDetails ?? []
  const ambiguityPosture = input.deliberation.ambiguityPosture ?? 'settled'
  const episodeProvenances = [...new Set(input.deliberation.selectedEpisodes.map(item => item.provenance))]
  const dominantProvenance = episodeProvenances.includes('reconstructed')
    ? 'reconstructed'
    : episodeProvenances.includes('dreamt')
      ? 'dreamt'
      : episodeProvenances.includes('inferred')
        ? 'inferred'
        : episodeProvenances.includes('observed')
          ? 'observed'
          : episodeProvenances.includes('remembered')
            ? 'remembered'
            : 'remembered'
  const provenancePosture = episodeProvenances.length > 1
    ? 'mixed-memory'
    : dominantProvenance === 'observed'
      ? 'observed-memory'
      : dominantProvenance === 'remembered'
        ? 'remembered-memory'
        : dominantProvenance === 'dreamt'
          ? 'dream-residue'
          : dominantProvenance === 'inferred'
            ? 'inferred-pattern'
            : 'reconstructed-memory'
  const detailAssertionBudget = conflictBurden === 'high' || dominantProvenance === 'dreamt' || dominantProvenance === 'inferred'
    ? 'minimal'
    : conflictBurden === 'medium' || dominantProvenance === 'reconstructed' || episodeProvenances.length > 1
      ? 'guarded'
      : ambiguityPosture === 'ambiguous'
        ? 'minimal'
        : ambiguityPosture === 'approximate'
          ? 'guarded'
          : agenda?.uncertaintyTolerance === 'low'
            ? 'guarded'
            : 'open'
  const certaintyFloor = conflictBurden === 'high'
    ? 'fragmentary'
    : ambiguityPosture === 'ambiguous'
      ? 'fragmentary'
      : ambiguityPosture === 'approximate' && certaintyPosture === 'firm'
        ? 'approximate'
        : conflictBurden === 'medium' && certaintyPosture === 'firm'
          ? 'approximate'
          : agenda?.uncertaintyTolerance === 'low' && certaintyPosture === 'firm'
            ? 'approximate'
            : (dominantProvenance === 'dreamt' || dominantProvenance === 'inferred') && certaintyPosture !== 'fragmentary'
                ? 'fragmentary'
                : dominantProvenance === 'reconstructed' && certaintyPosture === 'firm'
                  ? 'approximate'
                  : certaintyPosture
  const openingStrategy = input.shouldStayInward
    ? 'payoff-first-inward-carry'
    : relationshipVector === 'procedural'
      ? 'brief-procedure-carry'
      : relationshipVector === 'relational'
        ? 'brief-relationship-carry'
        : 'embedded-memory-carry'
  const answerStrategy = relationshipVector === 'procedural'
    ? 'procedure-anchor'
    : relationshipVector === 'relational'
      ? 'relationship-anchor'
      : retrospectiveDepth === 'period'
        ? 'period-anchor'
        : 'stance-first'
  const visibilityDiscipline = input.shouldStayInward
    ? 'internal-influence-only'
    : surfacePermission === 'explicit-surface'
      ? 'brief-visible-memory'
      : 'embedded-visible-memory'

  return {
    memoryPressure,
    certaintyPosture,
    certaintyFloor,
    relationshipVector,
    procedureCarryStrength,
    conflictBurden,
    dominantProvenance,
    provenancePosture,
    detailAssertionBudget,
    surfacePermission,
    retrospectiveDepth,
    openingStrategy,
    answerStrategy,
    visibilityDiscipline,
    labelUncertainty: certaintyFloor !== 'firm' || ambiguityPosture !== 'settled',
    frameAsPriorProcedure: relationshipVector === 'procedural',
    avoidArchiveDump: true,
    avoidDateRecital: true,
    avoidExecutionImpersonation: relationshipVector === 'procedural',
    stableCore,
    unsafeDetails,
  }
}
