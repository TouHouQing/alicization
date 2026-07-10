import { resolveAuthorityMismatchDisplay } from './performance-visualizer-authority-display'
import { toAuthorityDisplayEntry } from './performance-visualizer-runtime-diagnostic-summary'
import { formatTraceEmbodimentDisplaySummary } from './performance-visualizer-trace-embodiment'

export interface SelfEvolutionEvidencePanelInput {
  preDialogueBriefingSummary?: {
    status: string
    lines: string[]
  } | null
  internalizationReadinessSummary?: {
    status: string
    lines: string[]
  } | null
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
  companionshipTransitionSummary?: {
    status: string
    companionshipHoldMode: string | null
    preferredExpressionAliases: string[]
    preferredMotionAliases: string[]
    live2dFacialReleaseMs: number | null
    vrmExpressionBlendMs: number | null
    vrmActionFadeMs: number | null
    summaryLine: string | null
    reasons: string[]
  } | null
  rendererAuthorityProjection?: {
    status: string
    rendererTarget: string | null
    bodyContinuityPhase?: string | null
    rendererRejoinSurfaceKey?: string | null
    prosodyAuthoritySummary?: string | null
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
    status?: string | null
    bodyContinuityPhase?: string | null
    rendererRejoinSurfaceKey?: string | null
    rendererTarget?: string | null
    runtimeChannel?: string | null
    runtimeSummary?: string | null
    activeThreadId?: string | null
    activeThreadTitle?: string | null
    runtimeScenario?: string | null
    runtimeScene?: string | null
    transitionFromWatchMode?: string | null
    transitionToWatchMode?: string | null
    transitionFromScenario?: string | null
    transitionReason?: string | null
    governorDrive?: string | null
    governorIntentionId?: string | null
    focusBeliefId?: string | null
    rationaleTags?: string[]
    traceEmbodimentSummary?: string | null
    traceEmbodimentDisplaySummary?: string | null
    matchedSignals: string[]
    missingSignals: string[]
    driftingSignals: string[]
    reasons: string[]
  } | null
  selectedCandidateRuntimeAlignment?: {
    learning?: {
      activeFocuses?: string[]
      reasons?: string[]
    } | null
  } | null
  baselineAnchorAuditSummary?: {
    status?: string | null
    lines?: string[] | null
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
  id: 'pre-dialogue-briefing-summary' | 'internalization-readiness-summary' | 'proactive-decision-consumption-summary' | 'candidate-trajectory-summary' | 'identity-drift-governance-summary' | 'persona-bias-provenance' | 'proactive-action-chain' | 'proactive-manifestation-chain' | 'private-thought-governance-chain' | 'resident-performance-projection' | 'embodiment-output-projection' | 'companionship-transition-summary' | 'renderer-authority-projection' | 'runtime-continuity-projection' | 'rejected-action-alternatives'
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

function summarizeRendererAuthorityLaneTruth(input: SelfEvolutionEvidencePanelInput['rendererAuthorityProjection']) {
  if (!input)
    return null

  const matchedSignals = input.matchedSignals ?? []
  const driftingSignals = input.driftingSignals ?? []

  if (matchedSignals.includes('remaining-open=lipsync+voice')
    && matchedSignals.includes('authority-body:yes')
    && matchedSignals.includes('authority-face:yes')
    && matchedSignals.includes('authority-motion:yes')
    && driftingSignals.includes('authority-lipsync:no')) {
    return '当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段'
  }

  const hasVoiceEvidence = matchedSignals.includes('authority-voice:yes')
    || driftingSignals.includes('authority-voice:no')

  const resolveLane = (driver: 'face' | 'motion' | 'lipsync' | 'voice') => {
    if (matchedSignals.includes(`authority-${driver}:yes`)) {
      return driver === 'face'
        ? '表情命中'
        : driver === 'motion'
          ? '动作命中'
          : driver === 'lipsync'
            ? '口型命中'
            : '声音命中'
    }
    if (driftingSignals.includes(`authority-${driver}:no`)) {
      return driver === 'face'
        ? '表情未命中'
        : driver === 'motion'
          ? '动作未命中'
          : driver === 'lipsync'
            ? '口型未命中'
            : '声音未命中'
    }
    return driver === 'face'
      ? '表情未知'
      : driver === 'motion'
        ? '动作未知'
        : driver === 'lipsync'
          ? '口型未知'
          : '声音未知'
  }

  const summary = hasVoiceEvidence
    ? [resolveLane('face'), resolveLane('motion'), resolveLane('lipsync'), resolveLane('voice')].join(' / ')
    : [resolveLane('face'), resolveLane('motion'), resolveLane('lipsync')].join(' / ')
  if (summary === '表情未知 / 动作未知 / 口型未知 / 声音未知' || summary === '表情未知 / 动作未知 / 口型未知')
    return null

  return summary
}

function summarizeRuntimeContinuityAuthorityLaneTruth(input: SelfEvolutionEvidencePanelInput['runtimeContinuityProjection']) {
  if (!input)
    return null

  const matchedSignals = input.matchedSignals ?? []
  const driftingSignals = input.driftingSignals ?? []
  const reasons = input.reasons ?? []
  const hasVoiceDrift = driftingSignals.includes('authority-voice:no')
  const rendererTarget = input.rendererTarget ?? null
  const bodyContinuityPhase = input.bodyContinuityPhase ?? null
  const rendererSurface = rendererTarget === 'live2d'
    ? 'Live2D'
    : rendererTarget === 'vrm'
      ? 'VRM'
      : rendererTarget === 'speech'
        ? 'speech'
        : null

  const hasBodyOnlyHoldContinuity = bodyContinuityPhase === 'body-only-hold'
    || reasons.some(reason =>
      reason.includes('身体独撑态')
      || reason.includes('独自托住同一段 living segment')
      || reason.includes('only lane carrying this same living segment')
      || reason.includes('identity continuity being held inward'),
    )
  const hasCrossModalLockContinuity = bodyContinuityPhase === 'full-cross-modal-lock'
    || reasons.some(reason =>
      reason.includes('跨模态重锁态')
      || reason.includes('locked back onto the same living segment together')
      || reason.includes('identity-continuity embodiment line instead of a temporary visual alignment'),
    )
  const hasRendererRejoinWithoutBodyContinuity = bodyContinuityPhase === 'renderer-rejoin-without-body'
    || reasons.some(reason =>
      reason.includes('显形回接失身态')
      || (reason.includes('显形权威已经回接') && reason.includes('身体线没有继续托住同一段 living segment'))
      || reason.includes('identity-continuity drift risk rather than a completed embodiment repair'),
    )

  const hasBodyLedContinuity = bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || reasons.some(reason =>
      reason.includes('body-led identity-continuity continuity')
      || reason.includes('body-led partial recovery')
      || reason.includes('身体线先托住')
      || reason.includes('body still carries the living segment')
      || reason.includes('Body continuity still carries the same living segment while'),
    )

  if (!hasVoiceDrift && hasBodyOnlyHoldContinuity && matchedSignals.includes('authority-body:yes')) {
    return rendererSurface
      ? `身体线仍在独自托住同一段 living segment，当前还不能把 ${rendererSurface} 显形权威的回接视为已经成立`
      : '身体线仍在独自托住同一段 living segment，当前还不能把显形权威的回接视为已经成立'
  }

  if (!hasVoiceDrift && hasCrossModalLockContinuity) {
    return rendererSurface
      ? `身体线与 ${rendererSurface} 显形权威已经共同锁回同一段 living segment`
      : '身体线与显形权威已经共同锁回同一段 living segment'
  }

  if (!hasVoiceDrift && hasRendererRejoinWithoutBodyContinuity) {
    return rendererSurface
      ? `${rendererSurface} 显形权威已经回接，但身体线没有继续托住同一段 living segment`
      : '显形权威已经回接，但身体线没有继续托住同一段 living segment'
  }

  if (!hasVoiceDrift
    && hasBodyLedContinuity
    && matchedSignals.includes('authority-body:yes')
    && !matchedSignals.includes('authority-face:yes')
    && !matchedSignals.includes('authority-motion:yes')) {
    return rendererSurface
      ? `身体线已经先把这段 living segment 托住，${rendererSurface} 显形权威仍在补回同一条连续身体线`
      : '身体线已经先把这段 living segment 托住，表情、动作、口型仍在补回同一条连续身体线'
  }

  if (!hasVoiceDrift && matchedSignals.includes('lane=face+lipsync-only')) {
    return '当前只有 face 和 lipsync 这条 identity-continuity 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线'
  }

  if (!hasVoiceDrift && matchedSignals.includes('lane=motion+lipsync-only')) {
    return '当前只有 motion 和 lipsync 这条 identity-continuity 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线'
  }

  if (!hasVoiceDrift && matchedSignals.includes('lane=face+lipsync+voice-only')) {
    return '当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线'
  }

  if (!hasVoiceDrift && matchedSignals.includes('lane=motion+lipsync+voice-only')) {
    return '当前仅剩动作、口型、声音维持同一段连续性，可见 identity-continuity continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线'
  }

  if (!hasVoiceDrift
    && matchedSignals.includes('remaining-open=lipsync+voice')
    && matchedSignals.includes('authority-body:yes')
    && matchedSignals.includes('authority-face:yes')
    && matchedSignals.includes('authority-motion:yes')
    && driftingSignals.includes('authority-lipsync:no')) {
    return '当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段'
  }

  const hasVoiceEvidence = matchedSignals.includes('authority-voice:yes')
    || driftingSignals.includes('authority-voice:no')

  const resolveLane = (driver: 'face' | 'motion' | 'lipsync' | 'voice') => {
    if (matchedSignals.includes(`authority-${driver}:yes`)) {
      return driver === 'face'
        ? '表情命中'
        : driver === 'motion'
          ? '动作命中'
          : driver === 'lipsync'
            ? '口型命中'
            : '声音命中'
    }
    if (driftingSignals.includes(`authority-${driver}:no`)) {
      return driver === 'face'
        ? '表情未命中'
        : driver === 'motion'
          ? '动作未命中'
          : driver === 'lipsync'
            ? '口型未命中'
            : '声音未命中'
    }
    return driver === 'face'
      ? '表情未知'
      : driver === 'motion'
        ? '动作未知'
        : driver === 'lipsync'
          ? '口型未知'
          : '声音未知'
  }

  const summary = hasVoiceEvidence
    ? [resolveLane('face'), resolveLane('motion'), resolveLane('lipsync'), resolveLane('voice')].join(' / ')
    : [resolveLane('face'), resolveLane('motion'), resolveLane('lipsync')].join(' / ')
  if (summary === '表情未知 / 动作未知 / 口型未知 / 声音未知' || summary === '表情未知 / 动作未知 / 口型未知')
    return null

  return summary
}

export function buildSelfEvolutionEvidencePanels(input: SelfEvolutionEvidencePanelInput) {
  const panels: SelfEvolutionEvidencePanel[] = []
  const relationshipCadenceInternalizationActive = [
    ...(input.personaBiasProvenance?.reasons ?? []),
    ...(input.companionshipTransitionSummary?.reasons ?? []),
  ].some(reason =>
    reason.includes('durable relationship rhythm')
    || reason.includes('长期关系节律')
    || reason.includes('internalize-relationship-cadence'),
  )
  const relationshipCadenceCallbackLineActive = [
    ...(input.personaBiasProvenance?.reasons ?? []),
    ...(input.companionshipTransitionSummary?.reasons ?? []),
  ].some(reason =>
    reason.includes('same-turn-if-invited')
    && reason.includes('same callback line'),
  )

  if (input.preDialogueBriefingSummary) {
    panels.push({
      id: 'pre-dialogue-briefing-summary',
      title: 'pre-dialogue briefing summary',
      lines: [
        `status: ${input.preDialogueBriefingSummary.status}`,
        `lines: ${formatList(input.preDialogueBriefingSummary.lines)}`,
      ],
    })
  }

  if (input.internalizationReadinessSummary) {
    panels.push({
      id: 'internalization-readiness-summary',
      title: 'internalization readiness summary',
      lines: [
        `status: ${input.internalizationReadinessSummary.status}`,
        `lines: ${formatList(input.internalizationReadinessSummary.lines)}`,
      ],
    })
  }

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

  if (input.companionshipTransitionSummary) {
    const companionshipTransitionReasons = [
      ...input.companionshipTransitionSummary.reasons,
      ...(relationshipCadenceCallbackLineActive
        ? []
        : relationshipCadenceInternalizationActive
          ? ['Measured return is no longer only a temporary callback hold; it is being internalized as durable relationship rhythm for the current continuity route.']
          : []),
    ]
    panels.push({
      id: 'companionship-transition-summary',
      title: 'companionship transition summary',
      lines: [
        `status: ${input.companionshipTransitionSummary.status}`,
        `companionshipHoldMode: ${formatMaybeText(input.companionshipTransitionSummary.companionshipHoldMode)}`,
        `preferredExpressionAliases: ${formatList(input.companionshipTransitionSummary.preferredExpressionAliases)}`,
        `preferredMotionAliases: ${formatList(input.companionshipTransitionSummary.preferredMotionAliases)}`,
        `summaryLine: ${formatMaybeText(input.companionshipTransitionSummary.summaryLine)}`,
        `reasons: ${formatList(companionshipTransitionReasons)}`,
      ],
    })
  }

  if (input.personaBiasProvenance) {
    const personaManifestationCadenceSummary = relationshipCadenceCallbackLineActive && input.personaBiasProvenance.manifestationCadenceSummary
      ? `${input.personaBiasProvenance.manifestationCadenceSummary} | measured return is being kept on the same callback line`
      : relationshipCadenceInternalizationActive && input.personaBiasProvenance.manifestationCadenceSummary
        ? `${input.personaBiasProvenance.manifestationCadenceSummary} | measured return is being kept as durable relationship rhythm`
        : input.personaBiasProvenance.manifestationCadenceSummary
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
        `manifestationCadenceSummary: ${formatMaybeText(personaManifestationCadenceSummary)}`,
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
    const authorityLaneDisplay = summarizeRendererAuthorityLaneTruth(input.rendererAuthorityProjection)
    panels.push({
      id: 'renderer-authority-projection',
      title: 'renderer authority projection',
      lines: [
        `status: ${input.rendererAuthorityProjection.status}`,
        `rendererTarget: ${formatMaybeText(input.rendererAuthorityProjection.rendererTarget)}`,
        `bodyContinuityPhase: ${formatMaybeText(input.rendererAuthorityProjection.bodyContinuityPhase ?? null)}`,
        `rendererRejoinSurfaceKey: ${formatMaybeText(input.rendererAuthorityProjection.rendererRejoinSurfaceKey ?? null)}`,
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
        `authorityMatchSummary: ${formatMaybeText(
          authorityMatchDisplay && authorityLaneDisplay && authorityMatchDisplay !== authorityLaneDisplay
            ? `${authorityMatchDisplay} | ${authorityLaneDisplay}`
            : authorityLaneDisplay ?? authorityMatchDisplay,
        )}`,
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
    const continuityAuthoritySummary = summarizeRuntimeContinuityAuthorityLaneTruth(input.runtimeContinuityProjection)
    panels.push({
      id: 'runtime-continuity-projection',
      title: 'runtime continuity projection',
      lines: [
        `status: ${formatMaybeText(input.runtimeContinuityProjection.status)}`,
        `bodyContinuityPhase: ${formatMaybeText(input.runtimeContinuityProjection.bodyContinuityPhase ?? null)}`,
        `rendererRejoinSurfaceKey: ${formatMaybeText(input.runtimeContinuityProjection.rendererRejoinSurfaceKey ?? null)}`,
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
        ...(continuityAuthoritySummary
          ? [`continuityAuthoritySummary: ${continuityAuthoritySummary}`]
          : []),
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
