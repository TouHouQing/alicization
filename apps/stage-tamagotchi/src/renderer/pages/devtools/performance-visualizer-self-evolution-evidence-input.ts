import type { SelfEvolutionEvidencePanelInput } from './performance-visualizer-self-evolution-evidence'

export function buildSelfEvolutionEvidencePanelInput(
  input: SelfEvolutionEvidencePanelInput,
): SelfEvolutionEvidencePanelInput {
  return {
    preDialogueBriefingSummary: input.preDialogueBriefingSummary ?? null,
    internalizationReadinessSummary: input.internalizationReadinessSummary ?? null,
    proactiveDecisionConsumptionSummary: input.proactiveDecisionConsumptionSummary ?? null,
    candidateTrajectorySummary: input.candidateTrajectorySummary ?? null,
    identityDriftGovernanceSummary: input.identityDriftGovernanceSummary ?? null,
    personaBiasProvenance: input.personaBiasProvenance ?? null,
    proactiveActionChain: input.proactiveActionChain ?? null,
    proactiveManifestationChain: input.proactiveManifestationChain ?? null,
    privateThoughtGovernanceChain: input.privateThoughtGovernanceChain ?? null,
    residentPerformanceProjection: input.residentPerformanceProjection ?? null,
    embodimentOutputProjection: input.embodimentOutputProjection ?? null,
    rendererAuthorityProjection: input.rendererAuthorityProjection ?? null,
    runtimeContinuityProjection: input.runtimeContinuityProjection ?? null,
    rejectedActionAlternatives: input.rejectedActionAlternatives ?? null,
  }
}
