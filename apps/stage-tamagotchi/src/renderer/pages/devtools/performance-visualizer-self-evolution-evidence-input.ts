import type { SelfEvolutionEvidencePanelInput } from './performance-visualizer-self-evolution-evidence'

export function buildSelfEvolutionEvidencePanelInput(
  input: SelfEvolutionEvidencePanelInput,
): SelfEvolutionEvidencePanelInput {
  return {
    proactiveDecisionConsumptionSummary: input.proactiveDecisionConsumptionSummary ?? null,
    candidateTrajectorySummary: input.candidateTrajectorySummary ?? null,
    personaBiasProvenance: input.personaBiasProvenance ?? null,
    proactiveActionChain: input.proactiveActionChain ?? null,
    proactiveManifestationChain: input.proactiveManifestationChain ?? null,
    residentPerformanceProjection: input.residentPerformanceProjection ?? null,
    embodimentOutputProjection: input.embodimentOutputProjection ?? null,
    rendererAuthorityProjection: input.rendererAuthorityProjection ?? null,
    runtimeContinuityProjection: input.runtimeContinuityProjection ?? null,
    rejectedActionAlternatives: input.rejectedActionAlternatives ?? null,
  }
}
