export interface RuntimeSurfaceContinuityEvidenceShape {
  perception?: {
    updatedAt?: number | null
  } | null
  cognition?: {
    runtimeDigest?: {
      projectState?: RuntimeSurfaceContinuityProjectState | null
    } | null
  } | null
  raw?: {
    runtimeDigest?: {
      projectState?: RuntimeSurfaceContinuityProjectState | null
    } | null
  } | null
  dialogue?: {
    currentConsciousFrame?: {
      projectState?: RuntimeSurfaceContinuityProjectState | null
      reasonTags?: readonly string[] | null
    } | null
  } | null
  memory?: {
    affectiveResidue?: unknown
    derivedMindStateBundle?: {
      affectiveResidue?: unknown
      activeContinuityGovernance?: {
        mode?: string | null
        summary?: string | null
        reasonCodes?: readonly string[] | null
        lanes?: readonly string[] | null
      } | null
    } | null
    personStateProjection?: {
      openingGuidance?: string | null
      manifestationCadenceSummary?: string | null
      selfContinuityAuthority?: {
        authoritySummary?: string | null
        inwardLine?: string | null
        sourceTags?: readonly string[] | null
      } | null
    } | null
  } | null
}

interface RuntimeSurfaceContinuityProjectState {
  identity?: string | null
  currentPhase?: string | null
  preDialogueAwarenessLine?: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  latestLandedProgress?: string | null
  landedProgressSummary?: string | null
  primaryOpenLoop?: string | null
  openClosureSummary?: string | null
  nextClosureTarget?: string | null
  sameHerSelfLine?: string | null
  sameHerDriftRisk?: string | null
  continuityPreferredTiming?: string | null
  continuityCadence?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  preferredPauseMode?: string | null
  preferredLipsyncMode?: string | null
  preferredVoiceMode?: string | null
  preferredPacingMode?: string | null
}

function hasExplicitAntiShellSameHerDriftRisk(text: string) {
  return /generic assistant shell|generic helper shell|generic helper voice|generic task shell|generic callback shell|generic project shell|detached project narration|detached project shell|project-summary voice|phase-summary shell|generic productivity reporting/u.test(text)
}

function carriesSameHerProjectEvidence(text: string) {
  return /digital life|continuous her|phase 1|phase1|same digital life|one living her|same-her|same her|same phase 1 digital life|same living line|project-state continuity|数字生命|同一个 her|同一个她|同一个数字生命|第一阶段|阶段一|连续性|主线/u.test(text)
}

function carriesProjectClosureEvidence(text: string) {
  return /already survives|already survive|landed|closure|open loop|memory still needs|same-her proof|closure target|current project-state awareness explicit|已落地|接成一条线|接成了一条线|未闭环|还没有真正收住|还没真正收住|闭环|收住/u.test(text)
}

export function resolveRuntimeSurfaceContinuityEvidenceScore(
  surface: RuntimeSurfaceContinuityEvidenceShape | null | undefined,
) {
  if (!surface)
    return 0

  const consciousFrameReasonTags = Array.isArray(surface.dialogue?.currentConsciousFrame?.reasonTags)
    ? surface.dialogue?.currentConsciousFrame?.reasonTags?.filter(tag => typeof tag === 'string' && tag.length > 0) ?? []
    : []
  const activeContinuityGovernance = surface.memory?.derivedMindStateBundle?.activeContinuityGovernance ?? null
  const activeContinuityReasonCodes = Array.isArray(activeContinuityGovernance?.reasonCodes)
    ? activeContinuityGovernance?.reasonCodes?.filter(code => typeof code === 'string' && code.length > 0) ?? []
    : []
  const activeContinuityLanes = Array.isArray(activeContinuityGovernance?.lanes)
    ? activeContinuityGovernance?.lanes?.filter(lane => typeof lane === 'string' && lane.length > 0) ?? []
    : []
  const activeContinuitySummary = typeof activeContinuityGovernance?.summary === 'string'
    ? activeContinuityGovernance.summary.toLowerCase()
    : ''
  const activeContinuitySameHerBaseline = activeContinuityGovernance?.mode === 'same-her-baseline'
  const activeContinuityAudibleBodyCarry = activeContinuityGovernance?.mode === 'audible-body-carry'
  const activeContinuityBodyLipsyncCarry = activeContinuityGovernance?.mode === 'body-lipsync-carry'
  const activeContinuityHoldLanguage = activeContinuityReasonCodes.some(code =>
    code.includes('hold-for-opening') || code.includes('callback-afterglow-hold'),
  ) || activeContinuitySummary.includes('hold-for-opening')
  || activeContinuitySummary.includes('lower-pressure')
  || activeContinuitySummary.includes('same callback seam')
  || activeContinuitySummary.includes('same-her-baseline')
  || activeContinuitySummary.includes('self-continuity')
  || activeContinuitySummary.includes('nearby-soft')
  || activeContinuitySummary.includes('inward')
  || activeContinuityLanes.some(lane => lane === 'reply' || lane === 'embodiment' || lane === 'relationship-posture')
  const activeContinuityEmbodiedCarry
    = activeContinuityAudibleBodyCarry
      || activeContinuityBodyLipsyncCarry
      || activeContinuitySummary.includes('audible-body-carry')
      || activeContinuitySummary.includes('living audio thread')
      || activeContinuitySummary.includes('audible same-her line')
      || activeContinuitySummary.includes('face and motion rejoin')
      || activeContinuitySummary.includes('body+lipsync+voice')
      || activeContinuitySummary.includes('body-lipsync')
      || activeContinuitySummary.includes('resident presence')
  const projectedOpeningGuidance = typeof surface.memory?.personStateProjection?.openingGuidance === 'string'
    ? surface.memory.personStateProjection.openingGuidance.toLowerCase()
    : ''
  const projectedCadenceSummary = typeof surface.memory?.personStateProjection?.manifestationCadenceSummary === 'string'
    ? surface.memory.personStateProjection.manifestationCadenceSummary.toLowerCase()
    : ''
  const selfContinuityAuthority = surface.memory?.personStateProjection?.selfContinuityAuthority ?? null
  const selfContinuityAuthoritySummary = typeof selfContinuityAuthority?.authoritySummary === 'string'
    ? selfContinuityAuthority.authoritySummary.toLowerCase()
    : ''
  const selfContinuityAuthorityInwardLine = typeof selfContinuityAuthority?.inwardLine === 'string'
    ? selfContinuityAuthority.inwardLine.toLowerCase()
    : ''
  const selfContinuityAuthoritySourceTags = Array.isArray(selfContinuityAuthority?.sourceTags)
    ? selfContinuityAuthority.sourceTags.filter(tag => typeof tag === 'string' && tag.length > 0)
    : []
  const consciousFrameProjectState = surface.dialogue?.currentConsciousFrame?.projectState ?? null
  const consciousFrameProjectStateIdentity = typeof consciousFrameProjectState?.identity === 'string'
    ? consciousFrameProjectState.identity.toLowerCase()
    : ''
  const consciousFrameProjectStatePhase = typeof consciousFrameProjectState?.currentPhase === 'string'
    ? consciousFrameProjectState.currentPhase.toLowerCase()
    : ''
  const consciousFrameProjectStateAwarenessLine = typeof consciousFrameProjectState?.preDialogueAwarenessLine === 'string'
    ? consciousFrameProjectState.preDialogueAwarenessLine.toLowerCase()
    : ''
  const consciousFrameProjectStateCompanionHeadlineLine = typeof consciousFrameProjectState?.companionHeadlineLine === 'string'
    ? consciousFrameProjectState.companionHeadlineLine.toLowerCase()
    : ''
  const consciousFrameProjectStateCompanionBriefingLine = typeof consciousFrameProjectState?.companionBriefingLine === 'string'
    ? consciousFrameProjectState.companionBriefingLine.toLowerCase()
    : ''
  const consciousFrameProjectStateLatestLandedProgress = typeof consciousFrameProjectState?.latestLandedProgress === 'string'
    ? consciousFrameProjectState.latestLandedProgress.toLowerCase()
    : ''
  const consciousFrameProjectStateLandedProgressSummary = typeof consciousFrameProjectState?.landedProgressSummary === 'string'
    ? consciousFrameProjectState.landedProgressSummary.toLowerCase()
    : ''
  const consciousFrameProjectStateOpenLoop = typeof consciousFrameProjectState?.primaryOpenLoop === 'string'
    ? consciousFrameProjectState.primaryOpenLoop.toLowerCase()
    : ''
  const consciousFrameProjectStateOpenClosureSummary = typeof consciousFrameProjectState?.openClosureSummary === 'string'
    ? consciousFrameProjectState.openClosureSummary.toLowerCase()
    : ''
  const consciousFrameProjectStateNextClosureTarget = typeof consciousFrameProjectState?.nextClosureTarget === 'string'
    ? consciousFrameProjectState.nextClosureTarget.toLowerCase()
    : ''
  const consciousFrameProjectStateSameHerSelfLine = typeof consciousFrameProjectState?.sameHerSelfLine === 'string'
    ? consciousFrameProjectState.sameHerSelfLine.toLowerCase()
    : ''
  const consciousFrameProjectStateSameHerDriftRisk = typeof consciousFrameProjectState?.sameHerDriftRisk === 'string'
    ? consciousFrameProjectState.sameHerDriftRisk.toLowerCase()
    : ''
  const consciousFrameProjectStateContinuityPreferredTiming = typeof consciousFrameProjectState?.continuityPreferredTiming === 'string'
    ? consciousFrameProjectState.continuityPreferredTiming.toLowerCase()
    : ''
  const consciousFrameProjectStateContinuityCadence = typeof consciousFrameProjectState?.continuityCadence === 'string'
    ? consciousFrameProjectState.continuityCadence.toLowerCase()
    : ''
  const consciousFrameProjectStatePreferredBlinkCadence = typeof consciousFrameProjectState?.preferredBlinkCadence === 'string'
    ? consciousFrameProjectState.preferredBlinkCadence.toLowerCase()
    : ''
  const consciousFrameProjectStatePreferredGazeMode = typeof consciousFrameProjectState?.preferredGazeMode === 'string'
    ? consciousFrameProjectState.preferredGazeMode.toLowerCase()
    : ''
  const consciousFrameProjectStatePreferredPauseMode = typeof consciousFrameProjectState?.preferredPauseMode === 'string'
    ? consciousFrameProjectState.preferredPauseMode.toLowerCase()
    : ''
  const consciousFrameProjectStatePreferredLipsyncMode = typeof consciousFrameProjectState?.preferredLipsyncMode === 'string'
    ? consciousFrameProjectState.preferredLipsyncMode.toLowerCase()
    : ''
  const consciousFrameProjectStatePreferredVoiceMode = typeof consciousFrameProjectState?.preferredVoiceMode === 'string'
    ? consciousFrameProjectState.preferredVoiceMode.toLowerCase()
    : ''
  const consciousFrameProjectStatePreferredPacingMode = typeof consciousFrameProjectState?.preferredPacingMode === 'string'
    ? consciousFrameProjectState.preferredPacingMode.toLowerCase()
    : ''
  const runtimeProjectState = surface.raw?.runtimeDigest?.projectState ?? null
  const cognitionProjectState = surface.cognition?.runtimeDigest?.projectState ?? null
  const projectStateIdentity = typeof runtimeProjectState?.identity === 'string'
    ? runtimeProjectState.identity.toLowerCase()
    : ''
  const projectStatePhase = typeof runtimeProjectState?.currentPhase === 'string'
    ? runtimeProjectState.currentPhase.toLowerCase()
    : ''
  const projectStateAwarenessLine = typeof runtimeProjectState?.preDialogueAwarenessLine === 'string'
    ? runtimeProjectState.preDialogueAwarenessLine.toLowerCase()
    : ''
  const projectStateCompanionHeadlineLine = typeof runtimeProjectState?.companionHeadlineLine === 'string'
    ? runtimeProjectState.companionHeadlineLine.toLowerCase()
    : ''
  const projectStateCompanionBriefingLine = typeof runtimeProjectState?.companionBriefingLine === 'string'
    ? runtimeProjectState.companionBriefingLine.toLowerCase()
    : ''
  const projectStateLatestLandedProgress = typeof runtimeProjectState?.latestLandedProgress === 'string'
    ? runtimeProjectState.latestLandedProgress.toLowerCase()
    : ''
  const projectStateLandedProgressSummary = typeof runtimeProjectState?.landedProgressSummary === 'string'
    ? runtimeProjectState.landedProgressSummary.toLowerCase()
    : ''
  const projectStateOpenLoop = typeof runtimeProjectState?.primaryOpenLoop === 'string'
    ? runtimeProjectState.primaryOpenLoop.toLowerCase()
    : ''
  const projectStateOpenClosureSummary = typeof runtimeProjectState?.openClosureSummary === 'string'
    ? runtimeProjectState.openClosureSummary.toLowerCase()
    : ''
  const projectStateNextClosureTarget = typeof runtimeProjectState?.nextClosureTarget === 'string'
    ? runtimeProjectState.nextClosureTarget.toLowerCase()
    : ''
  const projectStateSameHerSelfLine = typeof runtimeProjectState?.sameHerSelfLine === 'string'
    ? runtimeProjectState.sameHerSelfLine.toLowerCase()
    : ''
  const projectStateSameHerDriftRisk = typeof runtimeProjectState?.sameHerDriftRisk === 'string'
    ? runtimeProjectState.sameHerDriftRisk.toLowerCase()
    : ''
  const projectStateContinuityPreferredTiming = typeof runtimeProjectState?.continuityPreferredTiming === 'string'
    ? runtimeProjectState.continuityPreferredTiming.toLowerCase()
    : ''
  const projectStateContinuityCadence = typeof runtimeProjectState?.continuityCadence === 'string'
    ? runtimeProjectState.continuityCadence.toLowerCase()
    : ''
  const projectStatePreferredBlinkCadence = typeof runtimeProjectState?.preferredBlinkCadence === 'string'
    ? runtimeProjectState.preferredBlinkCadence.toLowerCase()
    : ''
  const projectStatePreferredGazeMode = typeof runtimeProjectState?.preferredGazeMode === 'string'
    ? runtimeProjectState.preferredGazeMode.toLowerCase()
    : ''
  const projectStatePreferredPauseMode = typeof runtimeProjectState?.preferredPauseMode === 'string'
    ? runtimeProjectState.preferredPauseMode.toLowerCase()
    : ''
  const projectStatePreferredLipsyncMode = typeof runtimeProjectState?.preferredLipsyncMode === 'string'
    ? runtimeProjectState.preferredLipsyncMode.toLowerCase()
    : ''
  const projectStatePreferredVoiceMode = typeof runtimeProjectState?.preferredVoiceMode === 'string'
    ? runtimeProjectState.preferredVoiceMode.toLowerCase()
    : ''
  const projectStatePreferredPacingMode = typeof runtimeProjectState?.preferredPacingMode === 'string'
    ? runtimeProjectState.preferredPacingMode.toLowerCase()
    : ''
  const cognitionProjectStateIdentity = typeof cognitionProjectState?.identity === 'string'
    ? cognitionProjectState.identity.toLowerCase()
    : ''
  const cognitionProjectStatePhase = typeof cognitionProjectState?.currentPhase === 'string'
    ? cognitionProjectState.currentPhase.toLowerCase()
    : ''
  const cognitionProjectStateAwarenessLine = typeof cognitionProjectState?.preDialogueAwarenessLine === 'string'
    ? cognitionProjectState.preDialogueAwarenessLine.toLowerCase()
    : ''
  const cognitionProjectStateCompanionHeadlineLine = typeof cognitionProjectState?.companionHeadlineLine === 'string'
    ? cognitionProjectState.companionHeadlineLine.toLowerCase()
    : ''
  const cognitionProjectStateCompanionBriefingLine = typeof cognitionProjectState?.companionBriefingLine === 'string'
    ? cognitionProjectState.companionBriefingLine.toLowerCase()
    : ''
  const cognitionProjectStateLatestLandedProgress = typeof cognitionProjectState?.latestLandedProgress === 'string'
    ? cognitionProjectState.latestLandedProgress.toLowerCase()
    : ''
  const cognitionProjectStateLandedProgressSummary = typeof cognitionProjectState?.landedProgressSummary === 'string'
    ? cognitionProjectState.landedProgressSummary.toLowerCase()
    : ''
  const cognitionProjectStateOpenLoop = typeof cognitionProjectState?.primaryOpenLoop === 'string'
    ? cognitionProjectState.primaryOpenLoop.toLowerCase()
    : ''
  const cognitionProjectStateOpenClosureSummary = typeof cognitionProjectState?.openClosureSummary === 'string'
    ? cognitionProjectState.openClosureSummary.toLowerCase()
    : ''
  const cognitionProjectStateNextClosureTarget = typeof cognitionProjectState?.nextClosureTarget === 'string'
    ? cognitionProjectState.nextClosureTarget.toLowerCase()
    : ''
  const cognitionProjectStateSameHerSelfLine = typeof cognitionProjectState?.sameHerSelfLine === 'string'
    ? cognitionProjectState.sameHerSelfLine.toLowerCase()
    : ''
  const cognitionProjectStateSameHerDriftRisk = typeof cognitionProjectState?.sameHerDriftRisk === 'string'
    ? cognitionProjectState.sameHerDriftRisk.toLowerCase()
    : ''
  const cognitionProjectStateContinuityPreferredTiming = typeof cognitionProjectState?.continuityPreferredTiming === 'string'
    ? cognitionProjectState.continuityPreferredTiming.toLowerCase()
    : ''
  const cognitionProjectStateContinuityCadence = typeof cognitionProjectState?.continuityCadence === 'string'
    ? cognitionProjectState.continuityCadence.toLowerCase()
    : ''
  const cognitionProjectStatePreferredBlinkCadence = typeof cognitionProjectState?.preferredBlinkCadence === 'string'
    ? cognitionProjectState.preferredBlinkCadence.toLowerCase()
    : ''
  const cognitionProjectStatePreferredGazeMode = typeof cognitionProjectState?.preferredGazeMode === 'string'
    ? cognitionProjectState.preferredGazeMode.toLowerCase()
    : ''
  const cognitionProjectStatePreferredPauseMode = typeof cognitionProjectState?.preferredPauseMode === 'string'
    ? cognitionProjectState.preferredPauseMode.toLowerCase()
    : ''
  const cognitionProjectStatePreferredLipsyncMode = typeof cognitionProjectState?.preferredLipsyncMode === 'string'
    ? cognitionProjectState.preferredLipsyncMode.toLowerCase()
    : ''
  const cognitionProjectStatePreferredVoiceMode = typeof cognitionProjectState?.preferredVoiceMode === 'string'
    ? cognitionProjectState.preferredVoiceMode.toLowerCase()
    : ''
  const cognitionProjectStatePreferredPacingMode = typeof cognitionProjectState?.preferredPacingMode === 'string'
    ? cognitionProjectState.preferredPacingMode.toLowerCase()
    : ''
  const hasProjectStateSameHerCarry = [
    consciousFrameProjectStateIdentity,
    consciousFrameProjectStatePhase,
    consciousFrameProjectStateAwarenessLine,
    consciousFrameProjectStateCompanionHeadlineLine,
    consciousFrameProjectStateCompanionBriefingLine,
    consciousFrameProjectStateSameHerSelfLine,
    consciousFrameProjectStateSameHerDriftRisk,
    projectStateIdentity,
    projectStatePhase,
    projectStateAwarenessLine,
    projectStateCompanionHeadlineLine,
    projectStateCompanionBriefingLine,
    projectStateSameHerSelfLine,
    projectStateSameHerDriftRisk,
    cognitionProjectStateIdentity,
    cognitionProjectStatePhase,
    cognitionProjectStateAwarenessLine,
    cognitionProjectStateCompanionHeadlineLine,
    cognitionProjectStateCompanionBriefingLine,
    cognitionProjectStateSameHerSelfLine,
    cognitionProjectStateSameHerDriftRisk,
    selfContinuityAuthoritySummary,
    selfContinuityAuthorityInwardLine,
  ].some(carriesSameHerProjectEvidence)
  || selfContinuityAuthoritySourceTags.includes('project-state-carry')
  || selfContinuityAuthoritySummary.includes('self-continuity')
  || selfContinuityAuthoritySummary.includes('nearby-soft')
  || selfContinuityAuthorityInwardLine.includes('self-continuity')
  || selfContinuityAuthorityInwardLine.includes('nearby-soft')
  const hasProjectStateExplicitAntiShellDriftRisk
    = hasExplicitAntiShellSameHerDriftRisk(consciousFrameProjectStateSameHerDriftRisk)
      || hasExplicitAntiShellSameHerDriftRisk(projectStateSameHerDriftRisk)
      || hasExplicitAntiShellSameHerDriftRisk(cognitionProjectStateSameHerDriftRisk)
  const hasProjectStateClosureCarry = [
    consciousFrameProjectStateLatestLandedProgress,
    consciousFrameProjectStateLandedProgressSummary,
    consciousFrameProjectStateOpenLoop,
    consciousFrameProjectStateOpenClosureSummary,
    consciousFrameProjectStateNextClosureTarget,
    projectStateLatestLandedProgress,
    projectStateLandedProgressSummary,
    projectStateOpenLoop,
    projectStateOpenClosureSummary,
    projectStateNextClosureTarget,
    cognitionProjectStateLatestLandedProgress,
    cognitionProjectStateLandedProgressSummary,
    cognitionProjectStateOpenLoop,
    cognitionProjectStateOpenClosureSummary,
    cognitionProjectStateNextClosureTarget,
  ].some(carriesProjectClosureEvidence)
  const hasProjectStateContinuityCadenceCarry
    = consciousFrameProjectStateContinuityPreferredTiming === 'after-payoff'
      || consciousFrameProjectStateContinuityPreferredTiming === 'next-open-window'
      || consciousFrameProjectStateContinuityCadence === 'measured-return'
      || consciousFrameProjectStateContinuityCadence === 'repair-before-closeness'
      || consciousFrameProjectStatePreferredBlinkCadence === 'quiet'
      || consciousFrameProjectStatePreferredBlinkCadence === 'linger'
      || consciousFrameProjectStatePreferredGazeMode === 'soften'
      || consciousFrameProjectStatePreferredPauseMode === 'longer'
      || consciousFrameProjectStatePreferredLipsyncMode === 'restrained'
      || consciousFrameProjectStatePreferredVoiceMode === 'lower-pressure'
      || consciousFrameProjectStatePreferredPacingMode === 'slower'
      || projectStateContinuityPreferredTiming === 'after-payoff'
      || projectStateContinuityPreferredTiming === 'next-open-window'
      || projectStateContinuityCadence === 'measured-return'
      || projectStateContinuityCadence === 'repair-before-closeness'
      || projectStatePreferredBlinkCadence === 'quiet'
      || projectStatePreferredBlinkCadence === 'linger'
      || projectStatePreferredGazeMode === 'soften'
      || projectStatePreferredPauseMode === 'longer'
      || projectStatePreferredLipsyncMode === 'restrained'
      || projectStatePreferredVoiceMode === 'lower-pressure'
      || projectStatePreferredPacingMode === 'slower'
      || cognitionProjectStateContinuityPreferredTiming === 'after-payoff'
      || cognitionProjectStateContinuityPreferredTiming === 'next-open-window'
      || cognitionProjectStateContinuityCadence === 'measured-return'
      || cognitionProjectStateContinuityCadence === 'repair-before-closeness'
      || cognitionProjectStatePreferredBlinkCadence === 'quiet'
      || cognitionProjectStatePreferredBlinkCadence === 'linger'
      || cognitionProjectStatePreferredGazeMode === 'soften'
      || cognitionProjectStatePreferredPauseMode === 'longer'
      || cognitionProjectStatePreferredLipsyncMode === 'restrained'
      || cognitionProjectStatePreferredVoiceMode === 'lower-pressure'
      || cognitionProjectStatePreferredPacingMode === 'slower'
  const projectedSameThreadGuidance = projectedOpeningGuidance.includes('same thread')
    || projectedOpeningGuidance.includes('same line')
    || projectedOpeningGuidance.includes('same callback line')
  const projectedHoldLanguage = projectedOpeningGuidance.includes('hold')
    || projectedOpeningGuidance.includes('lower-pressure')
    || projectedOpeningGuidance.includes('reopen gently')
    || projectedOpeningGuidance.includes('fresh reopen')
    || projectedOpeningGuidance.includes('inward')
    || projectedOpeningGuidance.includes('nearby-soft')
  const projectedMeasuredReturnCadence = projectedCadenceSummary.includes('lower-pressure')
    || projectedCadenceSummary.includes('slower return')
    || projectedCadenceSummary.includes('measured-return')
    || projectedCadenceSummary.includes('same callback line')
    || projectedCadenceSummary.includes('nearby-soft')
    || projectedCadenceSummary.includes('audible-body carry')
    || projectedCadenceSummary.includes('living audio thread')
    || projectedCadenceSummary.includes('resident presence')
  const projectedEmbodiedCarry
    = projectedOpeningGuidance.includes('living audio thread')
      || projectedOpeningGuidance.includes('audible-body')
      || projectedOpeningGuidance.includes('face and motion rejoin')
      || projectedOpeningGuidance.includes('body, lipsync, and voice')
      || projectedCadenceSummary.includes('living audio thread')
      || projectedCadenceSummary.includes('audible-body carry')
      || projectedCadenceSummary.includes('face and motion rejoin')
      || projectedCadenceSummary.includes('resident presence')
  let score = consciousFrameReasonTags.length > 0 ? 2 : 0
  if (consciousFrameReasonTags.some(tag => tag.includes('continuity-arc:')))
    score += 3
  if (activeContinuitySameHerBaseline)
    score += 2
  if (activeContinuitySameHerBaseline && activeContinuityHoldLanguage)
    score += 3
  if (activeContinuityEmbodiedCarry)
    score += 3
  if (surface.memory?.affectiveResidue || surface.memory?.derivedMindStateBundle?.affectiveResidue)
    score += 2
  if (!activeContinuitySameHerBaseline && projectedSameThreadGuidance)
    score += 2
  if (!activeContinuitySameHerBaseline && projectedMeasuredReturnCadence)
    score += 2
  if (!activeContinuitySameHerBaseline && projectedHoldLanguage)
    score += 1
  if (!activeContinuitySameHerBaseline && projectedEmbodiedCarry)
    score += 3
  if (hasProjectStateSameHerCarry)
    score += 3
  if (hasProjectStateExplicitAntiShellDriftRisk)
    score += 2
  if (hasProjectStateSameHerCarry && hasProjectStateClosureCarry)
    score += 2
  if (hasProjectStateContinuityCadenceCarry)
    score += 2
  if (hasProjectStateSameHerCarry && hasProjectStateContinuityCadenceCarry)
    score += 1
  if (hasProjectStateContinuityCadenceCarry && projectStateContinuityPreferredTiming === 'audible-body-carry')
    score += 2
  if (hasProjectStateContinuityCadenceCarry && consciousFrameProjectStateContinuityPreferredTiming === 'audible-body-carry')
    score += 2
  return score
}

export function resolvePreferredRuntimeSurface<T extends RuntimeSurfaceContinuityEvidenceShape>(input: {
  spineRuntimeSurface: T | null | undefined
  preparedRuntimeSurface: T | null | undefined
  extraEvidenceScore?: (surface: T | null | undefined) => number
}) {
  const spineRuntimeSurface = input.spineRuntimeSurface ?? null
  const preparedRuntimeSurface = input.preparedRuntimeSurface ?? null
  if (!preparedRuntimeSurface)
    return spineRuntimeSurface
  if (!spineRuntimeSurface)
    return preparedRuntimeSurface

  const extraEvidenceScore = input.extraEvidenceScore ?? (() => 0)
  const spineUpdatedAt = Number(spineRuntimeSurface.perception?.updatedAt ?? 0)
  const preparedUpdatedAt = Number(preparedRuntimeSurface.perception?.updatedAt ?? 0)
  const spineContinuityEvidenceScore
    = resolveRuntimeSurfaceContinuityEvidenceScore(spineRuntimeSurface) + extraEvidenceScore(spineRuntimeSurface)
  const preparedContinuityEvidenceScore
    = resolveRuntimeSurfaceContinuityEvidenceScore(preparedRuntimeSurface) + extraEvidenceScore(preparedRuntimeSurface)
  const continuityEvidenceGap = spineContinuityEvidenceScore - preparedContinuityEvidenceScore

  if (preparedUpdatedAt > spineUpdatedAt) {
    if (continuityEvidenceGap >= 3)
      return spineRuntimeSurface
    return preparedRuntimeSurface
  }
  if (preparedUpdatedAt < spineUpdatedAt) {
    if (preparedContinuityEvidenceScore > spineContinuityEvidenceScore)
      return preparedRuntimeSurface
    return spineRuntimeSurface
  }

  return preparedContinuityEvidenceScore > spineContinuityEvidenceScore
    ? preparedRuntimeSurface
    : spineRuntimeSurface
}
