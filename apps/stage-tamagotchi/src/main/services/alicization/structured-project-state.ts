export interface AlicizationStructuredProjectStateSnapshot {
  identity: string
  currentPhase: string
  preflightSummary: string | null
  preDialogueAwarenessSummary: string | null
  preDialogueAwarenessLine: string | null
  awarenessLine: string | null
  companionHeadlineLine: string | null
  companionBriefingLine: string | null
  latestLandedProgress: string | null
  primaryOpenLoop: string | null
  nextClosureTarget: string
  sameHerSelfLine: string
  sameHerHoldDetail: string | null
  sameHerDriftRisk: string
  emotionalClosureCue: string | null
  emotionalClosureSummary: string | null
  continuityRestraint: null
  continuityArcStage: null
  continuityCue: null
  continuityPreferredTiming: null
  continuityCadence: null
  preferredBlinkCadence: null
  preferredGazeMode: null
  preferredPauseMode: null
  preferredLipsyncMode: null
  preferredVoiceMode: null
  preferredPacingMode: null
}

const emptyStructuredProjectState: AlicizationStructuredProjectStateSnapshot = {
  identity: '',
  currentPhase: '',
  preflightSummary: null,
  preDialogueAwarenessSummary: null,
  preDialogueAwarenessLine: null,
  awarenessLine: null,
  companionHeadlineLine: null,
  companionBriefingLine: null,
  latestLandedProgress: null,
  primaryOpenLoop: null,
  nextClosureTarget: '',
  sameHerSelfLine: '',
  sameHerHoldDetail: null,
  sameHerDriftRisk: '',
  emotionalClosureCue: null,
  emotionalClosureSummary: null,
  continuityRestraint: null,
  continuityArcStage: null,
  continuityCue: null,
  continuityPreferredTiming: null,
  continuityCadence: null,
  preferredBlinkCadence: null,
  preferredGazeMode: null,
  preferredPauseMode: null,
  preferredLipsyncMode: null,
  preferredVoiceMode: null,
  preferredPacingMode: null,
}

export function resolveCanonicalStructuredProjectState(_input: {
  normalizedProjectState?: Record<string, unknown> | null
  runtimePreflightSummary?: string | null
  preparedPreflightSummary?: string | null
  payloadPreflightSummary?: string | null
  runtimePreferredAwarenessLine?: string | null
  runtimePreDialogueAwarenessLine?: string | null
  payloadPreDialogueAwarenessLine?: string | null
  suppressCanonicalAwarenessFallback?: boolean
}): AlicizationStructuredProjectStateSnapshot {
  return { ...emptyStructuredProjectState }
}
