import { resolveAuthorityMismatchDisplay } from './performance-visualizer-authority-display'
import { toAuthorityDisplayEntry } from './performance-visualizer-runtime-diagnostic-summary'
import { formatTraceEmbodimentDisplaySummary } from './performance-visualizer-trace-embodiment'

export interface SelfEvolutionEvidencePanelInput {
  proactiveDecisionConsumptionSummary?: {
    status: string
    decisionMode: string | null
    dominantDrift: string | null
    lines: string[]
  } | null
  candidateTrajectorySummary?: {
    status: string
    trajectoryLabel: string | null
    dominantDrift: string | null
    lines: string[]
  } | null
  identityDriftGovernanceSummary?: {
    status: string
    governanceMode: string | null
    dominantDrift: string | null
    lines: string[]
  } | null
  personaBiasProvenance?: {
    status: string
    relationshipPosture: string | null
    initiativeStyle: string | null
    silenceReconnect: string | null
    comfortStyle: string | null
    preferredProactiveStyle: string | null
    openingGuidance: string | null
    manifestationCadenceSummary: string | null
    matchedSignals: string[]
    missingSignals: string[]
    driftingSignals: string[]
    reasons: string[]
  } | null
  proactiveActionChain?: {
    status: string
    personaPreferredAction: string | null
    runtimeSelectedAction: string | null
    runtimeShouldSpeak: boolean | null
    openingGuidance: string | null
    openingGuidanceHoldReason: string | null
    matchedSignals: string[]
    missingSignals: string[]
    driftingSignals: string[]
    reasons: string[]
  } | null
  proactiveManifestationChain?: {
    status: string
    personaPreferredStyle: string | null
    personaPreferredPresence: string | null
    counterfactualStyle: string | null
    counterfactualPresence: string | null
    actionEcologyStyle: string | null
    actionEcologyPresence: string | null
    initiativePreferredStyle: string | null
    initiativePreferredPresence: string | null
    matchedSignals: string[]
    missingSignals: string[]
    driftingSignals: string[]
    reasons: string[]
  } | null
  privateThoughtGovernanceChain?: {
    status: string
    privateThoughtStance: string | null
    privateThoughtShouldSpeak: boolean | null
    privateThoughtStyle: string | null
    privateThoughtPresence: string | null
    privateThoughtText: string | null
    visibleReplyRealizationReason: string | null
    visibleReplyBlockedReason: string | null
    matchedSignals: string[]
    missingSignals: string[]
    driftingSignals: string[]
    reasons: string[]
  } | null
  residentPerformanceProjection?: {
    status: string
    residentSource: string | null
    residentEmbodiedPresence: string | null
    residentStance: string | null
    residentEmotionalTension: string | null
    residentBaseEmotion: string | null
    residentDelivery: string | null
    residentEmphasis: number | null
    residentReasonTags: string[]
    matchedSignals: string[]
    missingSignals: string[]
    driftingSignals: string[]
    reasons: string[]
  } | null
  embodimentOutputProjection?: {
    status: string
    projectedBodyState: string | null
    projectedContinuityMode: string | null
    projectedFacialCue: string | null
    projectedActionCue: string | null
    projectedBaseEmotion: string | null
    projectedDelivery: string | null
    residentSignature: string | null
    matchedSignals: string[]
    missingSignals: string[]
    driftingSignals: string[]
    reasons: string[]
  } | null
  rendererAuthorityProjection?: {
    status: string
    rendererTarget: string | null
    runtimeProfile: string | null
    runtimeBodyState: string | null
    runtimeContinuityMode: string | null
    runtimeResidentEmotion: string | null
    runtimeResidentDelivery: string | null
    runtimeResidentFacialCue: string | null
    runtimeResidentActionCue: string | null
    playbackCueFacialCue: string | null
    playbackCueActionCue: string | null
    driverFaceCue: string | null
    driverActionCue: string | null
    authorityMatchSummary: string | null
    authorityMismatchSummary?: string | null
    authorityMismatchDisplay?: string | null
    matchedSignals: string[]
    missingSignals: string[]
    driftingSignals: string[]
    reasons: string[]
  } | null
  runtimeContinuityProjection?: {
    status: string
    runtimeChannel: string | null
    runtimeSummary: string | null
    activeThreadId: string | null
    activeThreadTitle: string | null
    runtimeScenario: string | null
    runtimeScene: string | null
    transitionFromWatchMode: string | null
    transitionToWatchMode: string | null
    transitionFromScenario: string | null
    transitionReason: string | null
    governorDrive: string | null
    governorIntentionId: string | null
    focusBeliefId: string | null
    rationaleTags: string[]
    traceEmbodimentSummary: string | null
    matchedSignals: string[]
    missingSignals: string[]
    driftingSignals: string[]
    reasons: string[]
  } | null
  rejectedActionAlternatives?: {
    status: string
    selectedOptionId: string | null
    selectedAction: string | null
    dominantTradeoff: string | null
    alternatives: Array<{
      optionId: string
      action: string
      identityFit: number
      timingFitness: number
      score: number
      driftReason: string
      why: string
    }>
    reasons: string[]
  } | null
}

export interface SelfEvolutionEvidencePanel {
  id: 'proactive-decision-consumption-summary' | 'candidate-trajectory-summary' | 'identity-drift-governance-summary' | 'persona-bias-provenance' | 'proactive-action-chain' | 'proactive-manifestation-chain' | 'private-thought-governance-chain' | 'resident-performance-projection' | 'embodiment-output-projection' | 'renderer-authority-projection' | 'runtime-continuity-projection' | 'rejected-action-alternatives'
  title: string
  lines: string[]
}

function formatMaybeText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim() ? value : 'n/a'
}

function formatMaybeBoolean(value: boolean | null | undefined) {
  return typeof value === 'boolean' ? String(value) : 'n/a'
}

function formatList(values: Array<string | null | undefined> | null | undefined) {
  const normalized = (values ?? [])
    .map(value => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean)
  return normalized.length > 0 ? normalized.join(', ') : 'n/a'
}

export function buildSelfEvolutionEvidencePanels(input: SelfEvolutionEvidencePanelInput) {
  const panels: SelfEvolutionEvidencePanel[] = []

  if (input.proactiveDecisionConsumptionSummary) {
    panels.push({
      id: 'proactive-decision-consumption-summary',
      title: 'proactive decision consumption summary',
      lines: [
        `status: ${input.proactiveDecisionConsumptionSummary.status}`,
        `decisionMode: ${formatMaybeText(input.proactiveDecisionConsumptionSummary.decisionMode)}`,
        `dominantDrift: ${formatMaybeText(input.proactiveDecisionConsumptionSummary.dominantDrift)}`,
        `lines: ${formatList(input.proactiveDecisionConsumptionSummary.lines)}`,
      ],
    })
  }

  if (input.candidateTrajectorySummary) {
    panels.push({
      id: 'candidate-trajectory-summary',
      title: 'candidate trajectory summary',
      lines: [
        `status: ${input.candidateTrajectorySummary.status}`,
        `trajectoryLabel: ${formatMaybeText(input.candidateTrajectorySummary.trajectoryLabel)}`,
        `dominantDrift: ${formatMaybeText(input.candidateTrajectorySummary.dominantDrift)}`,
        `lines: ${formatList(input.candidateTrajectorySummary.lines)}`,
      ],
    })
  }

  if (input.identityDriftGovernanceSummary) {
    panels.push({
      id: 'identity-drift-governance-summary',
      title: 'identity drift governance summary',
      lines: [
        `status: ${input.identityDriftGovernanceSummary.status}`,
        `governanceMode: ${formatMaybeText(input.identityDriftGovernanceSummary.governanceMode)}`,
        `dominantDrift: ${formatMaybeText(input.identityDriftGovernanceSummary.dominantDrift)}`,
        `lines: ${formatList(input.identityDriftGovernanceSummary.lines)}`,
      ],
    })
  }

  if (input.personaBiasProvenance) {
    panels.push({
      id: 'persona-bias-provenance',
      title: 'persona bias provenance',
      lines: [
        `status: ${input.personaBiasProvenance.status}`,
        `relationshipPosture: ${formatMaybeText(input.personaBiasProvenance.relationshipPosture)}`,
        `initiativeStyle: ${formatMaybeText(input.personaBiasProvenance.initiativeStyle)}`,
        `silenceReconnect: ${formatMaybeText(input.personaBiasProvenance.silenceReconnect)}`,
        `comfortStyle: ${formatMaybeText(input.personaBiasProvenance.comfortStyle)}`,
        `preferredProactiveStyle: ${formatMaybeText(input.personaBiasProvenance.preferredProactiveStyle)}`,
        `openingGuidance: ${formatMaybeText(input.personaBiasProvenance.openingGuidance)}`,
        `manifestationCadenceSummary: ${formatMaybeText(input.personaBiasProvenance.manifestationCadenceSummary)}`,
        `matchedSignals: ${formatList(input.personaBiasProvenance.matchedSignals)}`,
        `missingSignals: ${formatList(input.personaBiasProvenance.missingSignals)}`,
        `driftingSignals: ${formatList(input.personaBiasProvenance.driftingSignals)}`,
        `reasons: ${formatList(input.personaBiasProvenance.reasons)}`,
      ],
    })
  }

  if (input.proactiveActionChain) {
    panels.push({
      id: 'proactive-action-chain',
      title: 'proactive action chain',
      lines: [
        `status: ${input.proactiveActionChain.status}`,
        `personaPreferredAction: ${formatMaybeText(input.proactiveActionChain.personaPreferredAction)}`,
        `runtimeSelectedAction: ${formatMaybeText(input.proactiveActionChain.runtimeSelectedAction)}`,
        `runtimeShouldSpeak: ${formatMaybeBoolean(input.proactiveActionChain.runtimeShouldSpeak)}`,
        `openingGuidance: ${formatMaybeText(input.proactiveActionChain.openingGuidance)}`,
        `openingGuidanceHoldReason: ${formatMaybeText(input.proactiveActionChain.openingGuidanceHoldReason)}`,
        `matchedSignals: ${formatList(input.proactiveActionChain.matchedSignals)}`,
        `missingSignals: ${formatList(input.proactiveActionChain.missingSignals)}`,
        `driftingSignals: ${formatList(input.proactiveActionChain.driftingSignals)}`,
        `reasons: ${formatList(input.proactiveActionChain.reasons)}`,
      ],
    })
  }

  if (input.proactiveManifestationChain) {
    panels.push({
      id: 'proactive-manifestation-chain',
      title: 'proactive manifestation chain',
      lines: [
        `status: ${input.proactiveManifestationChain.status}`,
        `personaPreferredStyle: ${formatMaybeText(input.proactiveManifestationChain.personaPreferredStyle)}`,
        `personaPreferredPresence: ${formatMaybeText(input.proactiveManifestationChain.personaPreferredPresence)}`,
        `counterfactualStyle: ${formatMaybeText(input.proactiveManifestationChain.counterfactualStyle)}`,
        `counterfactualPresence: ${formatMaybeText(input.proactiveManifestationChain.counterfactualPresence)}`,
        `actionEcologyStyle: ${formatMaybeText(input.proactiveManifestationChain.actionEcologyStyle)}`,
        `actionEcologyPresence: ${formatMaybeText(input.proactiveManifestationChain.actionEcologyPresence)}`,
        `initiativePreferredStyle: ${formatMaybeText(input.proactiveManifestationChain.initiativePreferredStyle)}`,
        `initiativePreferredPresence: ${formatMaybeText(input.proactiveManifestationChain.initiativePreferredPresence)}`,
        `matchedSignals: ${formatList(input.proactiveManifestationChain.matchedSignals)}`,
        `missingSignals: ${formatList(input.proactiveManifestationChain.missingSignals)}`,
        `driftingSignals: ${formatList(input.proactiveManifestationChain.driftingSignals)}`,
        `reasons: ${formatList(input.proactiveManifestationChain.reasons)}`,
      ],
    })
  }

  if (input.privateThoughtGovernanceChain) {
    panels.push({
      id: 'private-thought-governance-chain',
      title: 'private thought governance chain',
      lines: [
        `status: ${input.privateThoughtGovernanceChain.status}`,
        `privateThoughtStance: ${formatMaybeText(input.privateThoughtGovernanceChain.privateThoughtStance)}`,
        `privateThoughtShouldSpeak: ${formatMaybeBoolean(input.privateThoughtGovernanceChain.privateThoughtShouldSpeak)}`,
        `privateThoughtStyle: ${formatMaybeText(input.privateThoughtGovernanceChain.privateThoughtStyle)}`,
        `privateThoughtPresence: ${formatMaybeText(input.privateThoughtGovernanceChain.privateThoughtPresence)}`,
        `privateThoughtText: ${formatMaybeText(input.privateThoughtGovernanceChain.privateThoughtText)}`,
        `visibleReplyRealizationReason: ${formatMaybeText(input.privateThoughtGovernanceChain.visibleReplyRealizationReason)}`,
        `visibleReplyBlockedReason: ${formatMaybeText(input.privateThoughtGovernanceChain.visibleReplyBlockedReason)}`,
        `matchedSignals: ${formatList(input.privateThoughtGovernanceChain.matchedSignals)}`,
        `missingSignals: ${formatList(input.privateThoughtGovernanceChain.missingSignals)}`,
        `driftingSignals: ${formatList(input.privateThoughtGovernanceChain.driftingSignals)}`,
        `reasons: ${formatList(input.privateThoughtGovernanceChain.reasons)}`,
      ],
    })
  }

  if (input.residentPerformanceProjection) {
    panels.push({
      id: 'resident-performance-projection',
      title: 'resident performance projection',
      lines: [
        `status: ${input.residentPerformanceProjection.status}`,
        `residentSource: ${formatMaybeText(input.residentPerformanceProjection.residentSource)}`,
        `residentEmbodiedPresence: ${formatMaybeText(input.residentPerformanceProjection.residentEmbodiedPresence)}`,
        `residentStance: ${formatMaybeText(input.residentPerformanceProjection.residentStance)}`,
        `residentEmotionalTension: ${formatMaybeText(input.residentPerformanceProjection.residentEmotionalTension)}`,
        `residentBaseEmotion: ${formatMaybeText(input.residentPerformanceProjection.residentBaseEmotion)}`,
        `residentDelivery: ${formatMaybeText(input.residentPerformanceProjection.residentDelivery)}`,
        `residentEmphasis: ${typeof input.residentPerformanceProjection.residentEmphasis === 'number' ? String(input.residentPerformanceProjection.residentEmphasis) : 'n/a'}`,
        `residentReasonTags: ${formatList(input.residentPerformanceProjection.residentReasonTags)}`,
        `matchedSignals: ${formatList(input.residentPerformanceProjection.matchedSignals)}`,
        `missingSignals: ${formatList(input.residentPerformanceProjection.missingSignals)}`,
        `driftingSignals: ${formatList(input.residentPerformanceProjection.driftingSignals)}`,
        `reasons: ${formatList(input.residentPerformanceProjection.reasons)}`,
      ],
    })
  }

  if (input.embodimentOutputProjection) {
    panels.push({
      id: 'embodiment-output-projection',
      title: 'embodiment output projection',
      lines: [
        `status: ${input.embodimentOutputProjection.status}`,
        `projectedBodyState: ${formatMaybeText(input.embodimentOutputProjection.projectedBodyState)}`,
        `projectedContinuityMode: ${formatMaybeText(input.embodimentOutputProjection.projectedContinuityMode)}`,
        `projectedFacialCue: ${formatMaybeText(input.embodimentOutputProjection.projectedFacialCue)}`,
        `projectedActionCue: ${formatMaybeText(input.embodimentOutputProjection.projectedActionCue)}`,
        `projectedBaseEmotion: ${formatMaybeText(input.embodimentOutputProjection.projectedBaseEmotion)}`,
        `projectedDelivery: ${formatMaybeText(input.embodimentOutputProjection.projectedDelivery)}`,
        `residentSignature: ${formatMaybeText(input.embodimentOutputProjection.residentSignature)}`,
        `matchedSignals: ${formatList(input.embodimentOutputProjection.matchedSignals)}`,
        `missingSignals: ${formatList(input.embodimentOutputProjection.missingSignals)}`,
        `driftingSignals: ${formatList(input.embodimentOutputProjection.driftingSignals)}`,
        `reasons: ${formatList(input.embodimentOutputProjection.reasons)}`,
      ],
    })
  }

  if (input.rendererAuthorityProjection) {
    const authorityMatchDisplay = input.rendererAuthorityProjection.authorityMatchSummary
      ? toAuthorityDisplayEntry('authority-match', input.rendererAuthorityProjection.authorityMatchSummary).value
      : null
    panels.push({
      id: 'renderer-authority-projection',
      title: 'renderer authority projection',
      lines: [
        `status: ${input.rendererAuthorityProjection.status}`,
        `rendererTarget: ${formatMaybeText(input.rendererAuthorityProjection.rendererTarget)}`,
        `runtimeProfile: ${formatMaybeText(input.rendererAuthorityProjection.runtimeProfile)}`,
        `runtimeBodyState: ${formatMaybeText(input.rendererAuthorityProjection.runtimeBodyState)}`,
        `runtimeContinuityMode: ${formatMaybeText(input.rendererAuthorityProjection.runtimeContinuityMode)}`,
        `runtimeResidentEmotion: ${formatMaybeText(input.rendererAuthorityProjection.runtimeResidentEmotion)}`,
        `runtimeResidentDelivery: ${formatMaybeText(input.rendererAuthorityProjection.runtimeResidentDelivery)}`,
        `runtimeResidentFacialCue: ${formatMaybeText(input.rendererAuthorityProjection.runtimeResidentFacialCue)}`,
        `runtimeResidentActionCue: ${formatMaybeText(input.rendererAuthorityProjection.runtimeResidentActionCue)}`,
        `playbackCueFacialCue: ${formatMaybeText(input.rendererAuthorityProjection.playbackCueFacialCue)}`,
        `playbackCueActionCue: ${formatMaybeText(input.rendererAuthorityProjection.playbackCueActionCue)}`,
        `driverFaceCue: ${formatMaybeText(input.rendererAuthorityProjection.driverFaceCue)}`,
        `driverActionCue: ${formatMaybeText(input.rendererAuthorityProjection.driverActionCue)}`,
        `authorityMatchSummary: ${formatMaybeText(authorityMatchDisplay)}`,
        `authorityMismatchDisplay: ${formatMaybeText(
          input.rendererAuthorityProjection.authorityMismatchDisplay
            ?? resolveAuthorityMismatchDisplay({
                authorityMismatchSummary: input.rendererAuthorityProjection.authorityMismatchSummary,
                authorityMismatchReasonSummary: null,
              }),
        )}`,
        `matchedSignals: ${formatList(input.rendererAuthorityProjection.matchedSignals)}`,
        `missingSignals: ${formatList(input.rendererAuthorityProjection.missingSignals)}`,
        `driftingSignals: ${formatList(input.rendererAuthorityProjection.driftingSignals)}`,
        `reasons: ${formatList(input.rendererAuthorityProjection.reasons)}`,
      ],
    })
  }

  if (input.runtimeContinuityProjection) {
    const traceEmbodimentDisplaySummary = input.runtimeContinuityProjection.traceEmbodimentDisplaySummary
      ?? formatTraceEmbodimentDisplaySummary(input.runtimeContinuityProjection.traceEmbodimentSummary)
      ?? input.runtimeContinuityProjection.traceEmbodimentSummary
    panels.push({
      id: 'runtime-continuity-projection',
      title: 'runtime continuity projection',
      lines: [
        `status: ${input.runtimeContinuityProjection.status}`,
        `runtimeChannel: ${formatMaybeText(input.runtimeContinuityProjection.runtimeChannel)}`,
        `runtimeSummary: ${formatMaybeText(input.runtimeContinuityProjection.runtimeSummary)}`,
        `activeThreadId: ${formatMaybeText(input.runtimeContinuityProjection.activeThreadId)}`,
        `activeThreadTitle: ${formatMaybeText(input.runtimeContinuityProjection.activeThreadTitle)}`,
        `runtimeScenario: ${formatMaybeText(input.runtimeContinuityProjection.runtimeScenario)}`,
        `runtimeScene: ${formatMaybeText(input.runtimeContinuityProjection.runtimeScene)}`,
        `transitionFromWatchMode: ${formatMaybeText(input.runtimeContinuityProjection.transitionFromWatchMode)}`,
        `transitionToWatchMode: ${formatMaybeText(input.runtimeContinuityProjection.transitionToWatchMode)}`,
        `transitionFromScenario: ${formatMaybeText(input.runtimeContinuityProjection.transitionFromScenario)}`,
        `transitionReason: ${formatMaybeText(input.runtimeContinuityProjection.transitionReason)}`,
        `governorDrive: ${formatMaybeText(input.runtimeContinuityProjection.governorDrive)}`,
        `governorIntentionId: ${formatMaybeText(input.runtimeContinuityProjection.governorIntentionId)}`,
        `focusBeliefId: ${formatMaybeText(input.runtimeContinuityProjection.focusBeliefId)}`,
        `rationaleTags: ${formatList(input.runtimeContinuityProjection.rationaleTags)}`,
        `traceEmbodimentSummary: ${formatMaybeText(traceEmbodimentDisplaySummary)}`,
        `traceEmbodimentDisplaySummary: ${formatMaybeText(traceEmbodimentDisplaySummary)}`,
        `matchedSignals: ${formatList(input.runtimeContinuityProjection.matchedSignals)}`,
        `missingSignals: ${formatList(input.runtimeContinuityProjection.missingSignals)}`,
        `driftingSignals: ${formatList(input.runtimeContinuityProjection.driftingSignals)}`,
        `reasons: ${formatList(input.runtimeContinuityProjection.reasons)}`,
      ],
    })
  }

  if (input.rejectedActionAlternatives) {
    panels.push({
      id: 'rejected-action-alternatives',
      title: 'rejected action alternatives',
      lines: [
        `status: ${input.rejectedActionAlternatives.status}`,
        `selectedOptionId: ${formatMaybeText(input.rejectedActionAlternatives.selectedOptionId)}`,
        `selectedAction: ${formatMaybeText(input.rejectedActionAlternatives.selectedAction)}`,
        `dominantTradeoff: ${formatMaybeText(input.rejectedActionAlternatives.dominantTradeoff)}`,
        `alternatives: ${input.rejectedActionAlternatives.alternatives.length > 0
          ? input.rejectedActionAlternatives.alternatives
              .map(option => `${option.optionId}/${option.action} score=${option.score.toFixed(2)} identityFit=${option.identityFit.toFixed(2)} timingFitness=${option.timingFitness.toFixed(2)} drift=${option.driftReason} why=${option.why}`)
              .join(' | ')
          : 'n/a'}`,
        `reasons: ${formatList(input.rejectedActionAlternatives.reasons)}`,
      ],
    })
  }

  return panels
}
