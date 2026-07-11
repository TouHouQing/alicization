import type {
  AlicizationPreDialogueSendIdentity,
  AlicizationProjectStateContinuitySnapshot,
  AlicizationRuntimeProjectStateDigest,
} from '../alicization-bridge'

import {
  containsAlicizationFixedTemplateResidue,
  describeAlicizationEmbodimentClosureHeadline,
  isAlicizationThinProjectAwarenessLine,
  isAlicizationThinSamePhaseCarryLine as isThinSamePhaseCarryLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

type AlicizationPreDialogueAwarenessSnapshot = AlicizationProjectStateContinuitySnapshot['preDialogueAwareness']

interface AlicizationPreDialogueClosureSnapshot {
  status: 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine?: string | null
  sameHerDriftRiskLine?: string | null
  companionBriefingLine?: string | null
  companionNextClosureLine?: string | null
  companionshipReasonLine?: string | null
  emotionalClosureCue?: string | null
  briefingLines?: string[]
  reasons?: string[]
}

interface BuildPreDialogueSendIdentityInput {
  projectStateContinuitySnapshot?: AlicizationProjectStateContinuitySnapshot | null
  preDialogueClosureSnapshot?: AlicizationPreDialogueClosureSnapshot | null
  preDialogueAwarenessSnapshot?: AlicizationPreDialogueAwarenessSnapshot | null
  continuitySummary?: string | null
}

type AlicizationLegacyAwareProjectStateContinuitySnapshot
  = AlicizationProjectStateContinuitySnapshot & {
    latestProgress?: string | null
    landedProgressSummary?: string | null
  }

const fixedTemplateWithheldSendIdentityLine = ''

function isBlockedSendIdentityReplacement(value: string) {
  const normalized = value.trim()
  return normalized === fixedTemplateWithheldSendIdentityLine
    || normalized.includes('content_withheld')
    || normalized.includes('surface=structured')
    || normalized.includes('phase1_local_digital_life')
    || normalized.includes('runtime_personhood')
}

function sanitizeSendIdentityText(
  value: string | null | undefined,
  maxChars = 420,
) {
  const sanitized = sanitizeAlicizationProviderFacingText(value, maxChars, fixedTemplateWithheldSendIdentityLine)
  if (!sanitized)
    return null
  if (isBlockedSendIdentityReplacement(sanitized))
    return null
  return sanitized
}

function sanitizeSendIdentityProjectIdentityText(value: string | null | undefined) {
  return sanitizeSendIdentityText(value, 220)
}

function sanitizeSendIdentityProjectPhaseText(value: string | null | undefined) {
  const sanitized = sanitizeSendIdentityText(value, 180)
  if (!sanitized)
    return null
  if (/\bphase\s*1\b|第一阶段|阶段一|project_phase=life_core/iu.test(sanitized))
    return null
  return sanitized
}

function sanitizeSendIdentityReasonPreview(values: string[] | null | undefined) {
  const sanitizeReasonPreviewValue = (value: string | null | undefined) => {
    if (containsAlicizationFixedTemplateResidue(value))
      return null

    const direct = sanitizeSendIdentityText(value)
    if (direct && !isBlockedSendIdentityReplacement(direct))
      return direct
    return direct
  }

  return (values ?? [])
    .map(value => sanitizeReasonPreviewValue(value))
    .filter((value, index, list): value is string =>
      typeof value === 'string'
      && Boolean(value)
      && value !== fixedTemplateWithheldSendIdentityLine
      && !isBlockedSendIdentityReplacement(value)
      && value !== 'phase1_local_digital_life'
      && value !== 'runtime_personhood'
      && value !== 'continuity_review_required'
      && list.indexOf(value) === index)
}

function sanitizeSendIdentityProjectState(
  projectState: AlicizationRuntimeProjectStateDigest | null,
): AlicizationRuntimeProjectStateDigest | null {
  if (!projectState)
    return null

  return {
    ...projectState,
    preflightSummary: sanitizeSendIdentityText(projectState.preflightSummary),
    preDialogueAwarenessLine: sanitizeSendIdentityText(projectState.preDialogueAwarenessLine),
    preDialogueAwarenessSummary: sanitizeSendIdentityText(projectState.preDialogueAwarenessSummary),
    awarenessLine: sanitizeSendIdentityText(projectState.awarenessLine),
    companionHeadlineLine: sanitizeSendIdentityText(projectState.companionHeadlineLine),
    companionBriefingLine: sanitizeSendIdentityText(projectState.companionBriefingLine),
    identity: sanitizeSendIdentityProjectIdentityText(projectState.identity),
    currentPhase: sanitizeSendIdentityProjectPhaseText(projectState.currentPhase),
    latestLandedProgress: sanitizeSendIdentityText(projectState.latestLandedProgress),
    memoryClosureSummary: sanitizeSendIdentityText(projectState.memoryClosureSummary),
    primaryOpenLoop: sanitizeSendIdentityText(projectState.primaryOpenLoop, 420),
    nextClosureTarget: sanitizeSendIdentityText(projectState.nextClosureTarget, 420),
    sameHerSelfLine: sanitizeSendIdentityText(projectState.sameHerSelfLine, 420),
    sameHerHoldDetail: sanitizeSendIdentityText(projectState.sameHerHoldDetail, 420),
    sameHerDriftRisk: sanitizeSendIdentityText(projectState.sameHerDriftRisk, 420),
    emotionalClosureCue: sanitizeSendIdentityText(projectState.emotionalClosureCue, 420),
    ...(projectState.continuityCue
      ? { continuityCue: sanitizeSendIdentityText(projectState.continuityCue) }
      : {}),
    ...(projectState.proactiveSameHerGap
      ? { proactiveSameHerGap: sanitizeSendIdentityText(projectState.proactiveSameHerGap) }
      : {}),
  }
}

export function sanitizePreDialogueSendIdentity(
  awareness: AlicizationPreDialogueSendIdentity,
): AlicizationPreDialogueSendIdentity {
  return {
    ...awareness,
    summaryLine: sanitizeSendIdentityText(awareness.summaryLine),
    companionHeadlineLine: sanitizeSendIdentityText(awareness.companionHeadlineLine),
    companionBriefingLine: sanitizeSendIdentityText(awareness.companionBriefingLine),
    companionNextClosureLine: sanitizeSendIdentityText(awareness.companionNextClosureLine, 420),
    awarenessLine: sanitizeSendIdentityText(awareness.awarenessLine),
    emotionalClosureCue: sanitizeSendIdentityText(awareness.emotionalClosureCue, 420),
    projectState: sanitizeSendIdentityProjectState(awareness.projectState ?? null),
    reasonPreview: sanitizeSendIdentityReasonPreview(awareness.reasonPreview),
  }
}

function pushUniqueLine(lines: string[], value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized || lines.includes(normalized))
    return

  lines.push(normalized)
}

function normalizeReasonPreview(value: Array<string | null | undefined>) {
  const reasonPreview: string[] = []
  for (const reason of value)
    pushUniqueLine(reasonPreview, reason)
  return reasonPreview
}

function resolveContinuityLatestLandedProgress(
  continuity: AlicizationProjectStateContinuitySnapshot | null | undefined,
) {
  const legacyAwareContinuity = continuity as AlicizationLegacyAwareProjectStateContinuitySnapshot | null | undefined
  return continuity?.latestLandedProgress?.trim()
    || legacyAwareContinuity?.latestProgress?.trim()
    || legacyAwareContinuity?.landedProgressSummary?.trim()
    || ''
}

export function resolvePreDialogueClosureCompanionHeadlineLine(
  closure: AlicizationPreDialogueClosureSnapshot | null | undefined,
) {
  if (!closure)
    return null

  const explicitCompanionHeadlineLine = closure.companionHeadlineLine?.trim() || ''
  if (explicitCompanionHeadlineLine)
    return explicitCompanionHeadlineLine

  const candidateEvidenceLines = [
    ...(closure.reasons ?? []),
    closure.summaryLine?.trim() || null,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

  for (const candidateEvidenceLine of candidateEvidenceLines) {
    const synthesizedCompanionHeadlineLine = describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: candidateEvidenceLine,
      currentBodyState: candidateEvidenceLine,
    }).trim()

    if (synthesizedCompanionHeadlineLine)
      return synthesizedCompanionHeadlineLine
  }

  const closureEvidence = [
    closure.summaryLine?.trim() || null,
    ...(closure.reasons ?? []),
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0).join(' | ')

  const synthesizedCompanionHeadlineLine = describeAlicizationEmbodimentClosureHeadline({
    authoritySummary: closureEvidence,
    currentBodyState: closureEvidence,
  }).trim()

  return synthesizedCompanionHeadlineLine || null
}

function preferClosureAwareProjectLine(input: {
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  summaryLine?: string | null
}) {
  const normalizedCompanionHeadlineLine = typeof input.companionHeadlineLine === 'string'
    ? input.companionHeadlineLine.trim()
    : ''
  const normalizedCompanionBriefingLine = typeof input.companionBriefingLine === 'string'
    ? input.companionBriefingLine.trim()
    : ''
  const preferredProjectAwareLine = normalizedCompanionBriefingLine || ''

  if (!normalizedCompanionHeadlineLine)
    return preferredProjectAwareLine || null
  if (!preferredProjectAwareLine)
    return normalizedCompanionHeadlineLine || null

  const lowerHeadline = normalizedCompanionHeadlineLine.toLowerCase()
  const lowerProjectAwareLine = preferredProjectAwareLine.toLowerCase()
  const projectAwareLineCarriesFixedTemplateResidue = containsAlicizationFixedTemplateResidue(preferredProjectAwareLine)
  const headlineCarriesFixedTemplateResidue = containsAlicizationFixedTemplateResidue(normalizedCompanionHeadlineLine)
  const projectAwareLineCarriesBroaderPhaseClosure = (
    lowerProjectAwareLine.includes('what has landed')
    || lowerProjectAwareLine.includes('life loop that remains open')
    || lowerProjectAwareLine.includes('life loop is still open')
    || lowerProjectAwareLine.includes('still-open life loop')
    || lowerProjectAwareLine.includes('the project still needs')
    || lowerProjectAwareLine.includes('project still needs')
    || lowerProjectAwareLine.includes('explicit pre-dialogue carry path')
  ) && (
    lowerProjectAwareLine.includes('explicit pre-dialogue carry path')
    || lowerProjectAwareLine.includes('embodiment closure')
    || lowerProjectAwareLine.includes('flatten back')
    || lowerProjectAwareLine.includes('generic assistant')
  ) && !projectAwareLineCarriesFixedTemplateResidue
  const headlineLooksEmbodimentOnly = lowerHeadline.includes('body')
    || lowerHeadline.includes('face')
    || lowerHeadline.includes('motion')
    || lowerHeadline.includes('lipsync')
    || lowerHeadline.includes('voice')
    || lowerHeadline.includes('full cross-modal continuity line is not closed yet')
  const headlineLooksGenericClosureStatus = lowerHeadline.includes('closure is still incomplete')
    || lowerHeadline.includes('closure line is still settling')
  const briefingLooksSpecificCarryGap = lowerProjectAwareLine.includes('explicit pre-dialogue carry path')
    || lowerProjectAwareLine.includes('explicit carry gap')
    || lowerProjectAwareLine.includes('self core')

  if (projectAwareLineCarriesBroaderPhaseClosure && headlineLooksEmbodimentOnly)
    return preferredProjectAwareLine
  if (briefingLooksSpecificCarryGap && headlineLooksGenericClosureStatus)
    return preferredProjectAwareLine
  if (headlineCarriesFixedTemplateResidue && !projectAwareLineCarriesFixedTemplateResidue)
    return preferredProjectAwareLine
  if (projectAwareLineCarriesFixedTemplateResidue && !headlineCarriesFixedTemplateResidue)
    return normalizedCompanionHeadlineLine
  if (headlineLooksEmbodimentOnly || headlineLooksGenericClosureStatus)
    return normalizedCompanionHeadlineLine

  return preferredProjectAwareLine || normalizedCompanionHeadlineLine || null
}

function looksGenericClosureStatusHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.includes('closure is still incomplete')
    || normalized.includes('closure line is still settling')
}

export function resolvePreferredCompanionHeadlineLine(input: {
  awarenessCompanionHeadlineLine?: string | null
  closureCompanionHeadlineLine?: string | null
}) {
  const awarenessCompanionHeadlineLine = typeof input.awarenessCompanionHeadlineLine === 'string'
    ? input.awarenessCompanionHeadlineLine.trim()
    : ''
  const closureCompanionHeadlineLine = typeof input.closureCompanionHeadlineLine === 'string'
    ? input.closureCompanionHeadlineLine.trim()
    : ''

  if (!awarenessCompanionHeadlineLine)
    return closureCompanionHeadlineLine || null
  if (!closureCompanionHeadlineLine)
    return awarenessCompanionHeadlineLine || null

  if (
    looksGenericClosureStatusHeadline(awarenessCompanionHeadlineLine)
    && !looksGenericClosureStatusHeadline(closureCompanionHeadlineLine)
  ) {
    return closureCompanionHeadlineLine
  }

  return awarenessCompanionHeadlineLine
}

function looksLikeThinContinuityReminder(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  return isAlicizationThinProjectAwarenessLine(normalized)
    || normalized.includes('generic continuity fallback')
    || normalized.includes('generic continuity reminder')
    || normalized.includes('generic same-her reminder')
    || (normalized.startsWith('same-her=') && normalized.includes('| landed=') && normalized.includes('| open='))
}

function looksLikeThinContinuityNextClosureLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.includes('generic next target')
    || normalized.includes('generic next closure')
    || normalized.includes('generic closure shell')
    || normalized.includes('generic closure summary')
    || normalized.includes('steadier carry of this project, this phase, and the life loop that remains open')
}

function looksLikeProjectAwareBriefingReminder(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false

  return (
    normalized.includes('project_state_awareness=')
    || normalized.includes('project_state_review=')
    || normalized.includes('runtime_loop_validation=')
    || normalized.includes('continuity_context=')
    || (
      normalized.includes('what has landed')
      || normalized.includes('life loop is still open')
      || normalized.includes('which life loop is still open')
      || normalized.includes('still-open life loop')
    )
  )
}

function looksLikeLivedInSameHerHoldDetail(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.includes('same-her hold')
    || normalized.includes('same remembered seam')
    || normalized.includes('measured-return')
    || normalized.includes('repair-before-closeness')
    || normalized.includes('rest-protective')
    || normalized.includes('lower-pressure')
    || normalized.includes('callback line')
    || normalized.includes('keep more room this time')
}

function resolveContinuityBehaviorMode(input: {
  continuityRestraint?: string | null
  continuityCadence?: string | null
}) {
  const continuityCadence = typeof input.continuityCadence === 'string'
    ? input.continuityCadence.trim().toLowerCase()
    : ''
  const continuityRestraint = typeof input.continuityRestraint === 'string'
    ? input.continuityRestraint.trim().toLowerCase()
    : ''

  if (
    continuityCadence === 'repair-before-closeness'
    || continuityCadence === 'measured-return'
    || continuityCadence === 'rest-protective'
  ) {
    return continuityCadence
  }

  if (
    continuityRestraint === 'repair-before-closeness'
    || continuityRestraint === 'measured-return'
    || continuityRestraint === 'rest-protective'
  ) {
    return continuityRestraint
  }

  return null
}

function deriveSameHerHoldDetailFromContinuityBehavior(mode: string | null) {
  if (mode === 'repair-before-closeness')
    return 'cadence=repair_before_closeness; timing=before_closeness_widens'
  if (mode === 'rest-protective')
    return 'cadence=rest_protective; timing=fatigue_aware'
  if (mode === 'measured-return')
    return 'cadence=measured_return; pressure=lower'
  return null
}

function deriveContinuityCueFromBehavior(mode: string | null) {
  if (mode === 'repair-before-closeness')
    return 'continuity_cue=repair_before_closeness; until=repair_settles'
  if (mode === 'rest-protective')
    return 'continuity_cue=rest_protective; direction=inward'
  if (mode === 'measured-return')
    return 'continuity_cue=measured_return; direction=measured'
  return null
}

function resolveEffectiveContinuityReopenCarry(
  continuity: AlicizationProjectStateContinuitySnapshot | null | undefined,
) {
  const mode = resolveContinuityBehaviorMode({
    continuityRestraint: continuity?.continuityRestraint ?? null,
    continuityCadence: continuity?.continuityCadence ?? null,
  })
  const sameHerHoldDetail = continuity?.sameHerHoldDetail?.trim()
    || deriveSameHerHoldDetailFromContinuityBehavior(mode)
    || ''
  const continuityCue = continuity?.continuityCue?.trim()
    || deriveContinuityCueFromBehavior(mode)
    || ''

  return {
    sameHerHoldDetail: sanitizeSendIdentityText(sameHerHoldDetail, 420) ?? '',
    continuityCue: sanitizeSendIdentityText(continuityCue, 420) ?? '',
  }
}

function isSameHerInwardLowPressureHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return (
    normalized.includes('embodiment_status')
    && normalized.includes('low-pressure-inward-carry')
  )
}

function buildCompactSameHerInwardLowPressureAwarenessLine() {
  return 'embodiment_lanes=body+face+motion; missing_lanes=lipsync+voice; status=partial; evidence=low-pressure-inward-carry; source=companion_briefing'
}

function isAnthropomorphicHostFacingSameHerHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.includes('anthropomorphic emotional closure')
    && normalized.includes('continuity inward-carry observability')
    && normalized.includes('measured-return')
}

function buildCompactAnthropomorphicHostFacingAwarenessLine() {
  return 'emotional_closure=anthropomorphic_emotional_closure; evidence=inward_carry; timing=measured_return; source=companion_briefing'
}

function compactSameHerInwardLowPressureFallbackAwareness(
  awareness: AlicizationPreDialogueSendIdentity | null,
) {
  if (!awareness)
    return null

  const companionBriefingLine = awareness.companionBriefingLine?.trim() || ''
  const companionHeadlineLine = awareness.companionHeadlineLine?.trim() || ''
  const awarenessLine = awareness.awarenessLine?.trim() || ''
  if (
    !companionBriefingLine
    || !companionHeadlineLine
    || !awarenessLine
    || awarenessLine !== companionHeadlineLine
    || !isThinSamePhaseCarryLine(companionBriefingLine)
    || !isSameHerInwardLowPressureHeadline(companionHeadlineLine)
  ) {
    return awareness
  }

  return {
    ...awareness,
    awarenessLine: buildCompactSameHerInwardLowPressureAwarenessLine(),
  }
}

function compactAnthropomorphicHostFacingFallbackAwareness(
  awareness: AlicizationPreDialogueSendIdentity | null,
) {
  if (!awareness)
    return null

  const companionBriefingLine = awareness.companionBriefingLine?.trim() || ''
  const companionHeadlineLine = awareness.companionHeadlineLine?.trim() || ''
  const awarenessLine = awareness.awarenessLine?.trim() || ''
  if (
    !companionBriefingLine
    || !companionHeadlineLine
    || !awarenessLine
    || awarenessLine !== companionHeadlineLine
    || !isThinSamePhaseCarryLine(companionBriefingLine)
    || !isAnthropomorphicHostFacingSameHerHeadline(companionHeadlineLine)
  ) {
    return awareness
  }

  return {
    ...awareness,
    awarenessLine: buildCompactAnthropomorphicHostFacingAwarenessLine(),
  }
}

function normalizePreDialogueAwarenessSnapshot(
  snapshot: AlicizationPreDialogueAwarenessSnapshot | null | undefined,
): AlicizationPreDialogueSendIdentity | null {
  if (!snapshot)
    return null

  const reasonPreview: string[] = []
  for (const reason of snapshot.reasonPreview ?? [])
    pushUniqueLine(reasonPreview, reason)

  const summaryLine = snapshot.summaryLine?.trim() || null
  const companionHeadlineLine = snapshot.companionHeadlineLine?.trim() || null
  const companionBriefingLine = snapshot.companionBriefingLine?.trim() || null
  const companionNextClosureLine = snapshot.companionNextClosureLine?.trim() || null
  const emotionalClosureCue = snapshot.emotionalClosureCue?.trim() || null
  const explicitAwarenessSeed = snapshot.awarenessLine?.trim()
    || companionBriefingLine
    || summaryLine
    || null
  const resolvedAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine: explicitAwarenessSeed,
      awarenessLine: explicitAwarenessSeed,
      companionHeadlineLine,
      companionBriefingLine,
      preDialogueAwarenessSummary: summaryLine,
      emotionalClosureSummary: emotionalClosureCue,
    },
  })
  const awarenessLine = resolvedAwarenessLine === emotionalClosureCue
    && explicitAwarenessSeed
    && explicitAwarenessSeed !== emotionalClosureCue
    ? explicitAwarenessSeed
    : resolvedAwarenessLine

  if (!summaryLine && !companionHeadlineLine && !companionBriefingLine && !companionNextClosureLine && !awarenessLine && reasonPreview.length === 0)
    return null

  return {
    status: snapshot.status,
    summaryLine,
    companionHeadlineLine,
    companionBriefingLine,
    companionNextClosureLine,
    awarenessLine,
    emotionalClosureCue,
    reasonPreview,
  }
}

function upgradePreDialogueSendIdentityWithContinuity(
  awareness: AlicizationPreDialogueSendIdentity | null,
  continuity: AlicizationProjectStateContinuitySnapshot | null,
) {
  if (!awareness)
    return null

  const continuitySummary = continuity?.continuitySummary?.trim() || ''
  const latestLandedProgress = resolveContinuityLatestLandedProgress(continuity)
  const primaryOpenLoop = continuity?.primaryOpenLoop?.trim() || ''
  const nextClosureTarget = continuity?.nextClosureTarget?.trim() || ''
  const continuityAwarenessSummary = continuity?.preDialogueAwareness?.summaryLine?.trim() || ''
  const continuityAwarenessLine = continuity?.preDialogueAwareness?.awarenessLine?.trim() || ''
  const continuityAwarenessHeadlineLine = continuity?.preDialogueAwareness?.companionHeadlineLine?.trim() || ''
  const continuityAwarenessBriefingLine = continuity?.preDialogueAwareness?.companionBriefingLine?.trim() || ''
  const continuityAwarenessReasonPreview = continuity?.preDialogueAwareness?.reasonPreview ?? []
  const {
    sameHerHoldDetail,
    continuityCue,
  } = resolveEffectiveContinuityReopenCarry(continuity)
  const sameHerSelfLine = continuity?.sameHerSelfLine?.trim() || ''
  const proactiveSameHerGap = continuity?.proactiveSameHerGap?.trim() || ''
  const richerContinuityAwarenessSummary = looksLikeThinContinuityReminder(continuityAwarenessSummary)
    ? (!looksLikeThinContinuityReminder(continuityAwarenessLine)
        ? continuityAwarenessLine
        : !looksLikeThinContinuityReminder(continuityAwarenessHeadlineLine)
            ? continuityAwarenessHeadlineLine
            : !looksLikeThinContinuityReminder(continuityAwarenessBriefingLine)
                ? continuityAwarenessBriefingLine
                : '')
              || sameHerHoldDetail
              || continuityCue
              || sameHerSelfLine
              || ''
    : continuityAwarenessSummary
  const richerSameHerCarry
    = sameHerHoldDetail
      || continuityCue
      || sameHerSelfLine
      || ''
  const richerContinuityProjectCarry = (
    !looksLikeThinContinuityReminder(continuityAwarenessBriefingLine)
      ? continuityAwarenessBriefingLine
      : !looksLikeThinContinuityReminder(continuityAwarenessLine)
          ? continuityAwarenessLine
          : !looksLikeThinContinuityReminder(continuityAwarenessHeadlineLine)
              ? continuityAwarenessHeadlineLine
              : ''
  ) || richerSameHerCarry
  const awarenessLooksThin = looksLikeThinContinuityReminder(awareness.awarenessLine)
  const companionBriefingLooksThin = looksLikeThinContinuityReminder(awareness.companionBriefingLine)
  const companionNextClosureLooksThin = looksLikeThinContinuityNextClosureLine(awareness.companionNextClosureLine)
  const awarenessCarriesCompactSamePhaseLine = isThinSamePhaseCarryLine(awareness.awarenessLine)
  const companionBriefingCarriesCompactSamePhaseLine = isThinSamePhaseCarryLine(awareness.companionBriefingLine)
  const awarenessLineMatchesCompanionBriefing = (awareness.awarenessLine?.trim() || '') !== ''
    && awareness.awarenessLine?.trim() === (awareness.companionBriefingLine?.trim() || '')
  const shouldPreferLivedInSameHerHoldDetailCarry = looksLikeLivedInSameHerHoldDetail(sameHerHoldDetail)
    && (awarenessCarriesCompactSamePhaseLine || companionBriefingCarriesCompactSamePhaseLine)
  const shouldPromoteProjectAwareHoldDetailIntoCompanionBriefing = looksLikeProjectAwareBriefingReminder(sameHerHoldDetail)
    && companionBriefingCarriesCompactSamePhaseLine
  const shouldPromoteProjectAwareHoldDetailIntoAwarenessLine = looksLikeProjectAwareBriefingReminder(sameHerHoldDetail)
    && (awarenessLooksThin || awarenessCarriesCompactSamePhaseLine)
  const shouldPromoteSameHerHoldDetailIntoAwarenessLine = awarenessLineMatchesCompanionBriefing
    && looksLikeProjectAwareBriefingReminder(awareness.awarenessLine)
    && looksLikeLivedInSameHerHoldDetail(sameHerHoldDetail)

  const summaryLine = richerContinuityAwarenessSummary || awareness.summaryLine || continuitySummary || null

  return {
    ...awareness,
    summaryLine,
    companionBriefingLine: shouldPreferLivedInSameHerHoldDetailCarry && companionBriefingCarriesCompactSamePhaseLine
      ? sameHerHoldDetail
      : shouldPromoteProjectAwareHoldDetailIntoCompanionBriefing
        ? sameHerHoldDetail
        : companionBriefingLooksThin && richerContinuityProjectCarry
          ? richerContinuityProjectCarry
          : awareness.companionBriefingLine,
    awarenessLine: shouldPromoteSameHerHoldDetailIntoAwarenessLine
      ? sameHerHoldDetail
      : shouldPreferLivedInSameHerHoldDetailCarry && awarenessCarriesCompactSamePhaseLine
        ? sameHerHoldDetail
        : shouldPromoteProjectAwareHoldDetailIntoAwarenessLine
          ? sameHerHoldDetail
          : awarenessLooksThin && richerContinuityProjectCarry
            ? richerContinuityProjectCarry
            : awareness.awarenessLine,
    companionNextClosureLine: companionNextClosureLooksThin && nextClosureTarget
      ? nextClosureTarget
      : awareness.companionNextClosureLine,
    emotionalClosureCue: awareness.emotionalClosureCue ?? (continuity?.emotionalClosureCue?.trim() || null),
    reasonPreview: (() => {
      const reasonPreview = normalizeReasonPreview(awareness.reasonPreview)
      mergeReasonPreview(reasonPreview, [
        ...(awarenessLooksThin || companionBriefingLooksThin
          ? continuityAwarenessReasonPreview
          : []),
        awareness.awarenessLine,
        continuitySummary,
        latestLandedProgress,
        continuityCue,
        primaryOpenLoop,
        proactiveSameHerGap,
        nextClosureTarget,
      ])
      return reasonPreview
    })(),
  }
}

function mergeReasonPreview(target: string[], values: Array<string | null | undefined>) {
  for (const value of values)
    pushUniqueLine(target, value)
}

function buildPreDialogueSendIdentityProjectState(input: {
  continuity: AlicizationProjectStateContinuitySnapshot | null
  summaryLine: string | null
  companionHeadlineLine: string | null
  companionBriefingLine: string | null
  awarenessLine: string | null
  emotionalClosureCue: string | null
}): AlicizationRuntimeProjectStateDigest | null {
  const continuity = input.continuity
  const identity = continuity?.identity?.trim() || null
  const currentPhase = continuity?.currentPhase?.trim() || null
  const latestLandedProgress = resolveContinuityLatestLandedProgress(continuity) || null
  const primaryOpenLoop = continuity?.primaryOpenLoop?.trim() || null
  const nextClosureTarget = continuity?.nextClosureTarget?.trim() || null
  const continuityRestraint = continuity?.continuityRestraint?.trim() || null
  const continuityArcStage = continuity?.continuityArcStage?.trim() || null
  const continuityPreferredTiming = continuity?.continuityPreferredTiming?.trim() || null
  const continuityCadence = continuity?.continuityCadence?.trim() || null
  const {
    sameHerHoldDetail: effectiveSameHerHoldDetail,
    continuityCue: effectiveContinuityCue,
  } = resolveEffectiveContinuityReopenCarry(continuity)
  const sameHerSelfLine = continuity?.sameHerSelfLine?.trim() || null
  const sameHerDriftRisk = continuity?.sameHerDriftRisk?.trim() || null
  const proactiveSameHerGap = continuity?.proactiveSameHerGap?.trim() || null

  if (
    !input.summaryLine
    && !input.companionHeadlineLine
    && !input.companionBriefingLine
    && !input.awarenessLine
    && !identity
    && !currentPhase
    && !latestLandedProgress
    && !primaryOpenLoop
    && !nextClosureTarget
    && !continuityRestraint
    && !continuityArcStage
    && !continuityPreferredTiming
    && !continuityCadence
    && !effectiveContinuityCue
    && !sameHerSelfLine
    && !effectiveSameHerHoldDetail
    && !sameHerDriftRisk
    && !proactiveSameHerGap
    && !input.emotionalClosureCue
  ) {
    return null
  }

  return {
    preflightSummary: input.summaryLine,
    preDialogueAwarenessLine: input.awarenessLine,
    preDialogueAwarenessSummary: input.summaryLine,
    awarenessLine: input.awarenessLine,
    companionHeadlineLine: input.companionHeadlineLine,
    companionBriefingLine: input.companionBriefingLine,
    identity,
    currentPhase,
    latestLandedProgress,
    memoryClosureSummary: primaryOpenLoop,
    primaryOpenLoop,
    nextClosureTarget,
    ...(continuityRestraint
      ? { continuityRestraint }
      : {}),
    ...(continuityArcStage
      ? { continuityArcStage }
      : {}),
    ...(continuityPreferredTiming
      ? { continuityPreferredTiming }
      : {}),
    ...(continuityCadence
      ? { continuityCadence }
      : {}),
    ...(effectiveContinuityCue
      ? { continuityCue: effectiveContinuityCue }
      : {}),
    sameHerSelfLine,
    sameHerHoldDetail: effectiveSameHerHoldDetail || null,
    sameHerDriftRisk,
    ...(proactiveSameHerGap
      ? { proactiveSameHerGap }
      : {}),
    emotionalClosureCue: input.emotionalClosureCue,
  }
}

export function buildPreDialogueSendIdentityFromSnapshots(
  input: BuildPreDialogueSendIdentityInput,
): AlicizationPreDialogueSendIdentity | null {
  const directAwareness = normalizePreDialogueAwarenessSnapshot(
    input.preDialogueAwarenessSnapshot ?? input.projectStateContinuitySnapshot?.preDialogueAwareness ?? null,
  )
  const continuity = input.projectStateContinuitySnapshot ?? null
  const upgradedAwareness = upgradePreDialogueSendIdentityWithContinuity(directAwareness, continuity)
  const closure = input.preDialogueClosureSnapshot ?? null
  const continuitySummary = input.continuitySummary?.trim()
    || continuity?.continuitySummary?.trim()
    || ''
  const reasonPreview = upgradedAwareness?.reasonPreview ? normalizeReasonPreview(upgradedAwareness.reasonPreview) : []
  const hasExplicitAwarenessSnapshot = Boolean(input.preDialogueAwarenessSnapshot)
  const hasContinuityAwarenessFallback = !hasExplicitAwarenessSnapshot && Boolean(continuity?.preDialogueAwareness)
  const resolvedFallbackAwareness = hasContinuityAwarenessFallback
    ? compactAnthropomorphicHostFacingFallbackAwareness(
        compactSameHerInwardLowPressureFallbackAwareness(upgradedAwareness),
      )
    : upgradedAwareness

  if (hasExplicitAwarenessSnapshot && (continuity || closure)) {
    mergeReasonPreview(reasonPreview, [
      resolvedFallbackAwareness?.companionBriefingLine ?? null,
      resolvedFallbackAwareness?.awarenessLine ?? null,
      resolvedFallbackAwareness?.companionNextClosureLine ?? null,
      closure?.companionshipReasonLine?.trim() ?? null,
    ])
  }
  for (const reason of closure?.reasons ?? [])
    pushUniqueLine(reasonPreview, reason)
  if (continuity) {
    const {
      sameHerHoldDetail,
      continuityCue,
    } = resolveEffectiveContinuityReopenCarry(continuity)
    if (hasExplicitAwarenessSnapshot || hasContinuityAwarenessFallback) {
      mergeReasonPreview(reasonPreview, [
        continuity?.identity,
        continuity?.currentPhase,
        resolveContinuityLatestLandedProgress(continuity),
        sameHerHoldDetail || null,
        continuityCue || null,
        continuity?.sameHerSelfLine ?? null,
        continuity?.sameHerDriftRisk ?? null,
        continuity?.proactiveSameHerGap ?? null,
        continuity?.primaryOpenLoop,
        continuity?.nextClosureTarget,
      ])
    }
    else {
      mergeReasonPreview(reasonPreview, [
        continuity?.identity,
        continuity?.currentPhase,
        resolveContinuityLatestLandedProgress(continuity),
        sameHerHoldDetail || null,
        continuityCue || null,
        continuity?.sameHerSelfLine ?? null,
        continuity?.sameHerDriftRisk ?? null,
        continuity?.proactiveSameHerGap ?? null,
        continuity?.primaryOpenLoop,
        continuity?.nextClosureTarget,
      ])
    }
  }
  if (hasExplicitAwarenessSnapshot && closure) {
    mergeReasonPreview(reasonPreview, [
      closure?.companionHeadlineLine ?? null,
      closure?.companionBriefingLine ?? null,
      closure?.companionshipReasonLine ?? null,
      closure?.summaryLine ?? null,
    ])
  }
  else if (closure?.companionshipReasonLine?.trim()) {
    pushUniqueLine(reasonPreview, closure.companionshipReasonLine.trim())
  }
  if (!directAwareness && continuitySummary)
    pushUniqueLine(reasonPreview, continuitySummary)

  const effectiveContinuityReopenCarry = resolveEffectiveContinuityReopenCarry(continuity)
  const effectiveSameHerHoldDetail = effectiveContinuityReopenCarry.sameHerHoldDetail || null
  const effectiveContinuityCue = effectiveContinuityReopenCarry.continuityCue || null
  const closureSummaryLine = closure?.summaryLine?.trim() || null
  const preferredProjectAwareCarryLine = [
    closure?.companionBriefingLine?.trim() ?? null,
    effectiveSameHerHoldDetail,
    effectiveContinuityCue,
    continuity?.preDialogueAwareness?.companionBriefingLine?.trim() ?? null,
    continuity?.preDialogueAwareness?.awarenessLine?.trim() ?? null,
  ].find((value): value is string => looksLikeProjectAwareBriefingReminder(value)) ?? null
  const preferredProjectAwareCompanionBriefingLine = [
    closure?.companionBriefingLine?.trim() ?? null,
    effectiveSameHerHoldDetail,
    effectiveContinuityCue,
    continuity?.preDialogueAwareness?.companionBriefingLine?.trim() ?? null,
  ].find((value): value is string => looksLikeProjectAwareBriefingReminder(value)) ?? null
  const resolvedSummaryLooksThin = looksLikeThinContinuityReminder(resolvedFallbackAwareness?.summaryLine)
  const resolvedCompanionBriefingLooksThin = looksLikeThinContinuityReminder(resolvedFallbackAwareness?.companionBriefingLine)
    || isThinSamePhaseCarryLine(resolvedFallbackAwareness?.companionBriefingLine)
  const resolvedAwarenessCollapsesIntoEmotionalCue = Boolean(
    preferredProjectAwareCarryLine
    && (resolvedFallbackAwareness?.awarenessLine?.trim() || '') !== ''
    && resolvedFallbackAwareness?.awarenessLine?.trim() === (resolvedFallbackAwareness?.emotionalClosureCue?.trim() || ''),
  )
  const resolvedAwarenessLooksThin = looksLikeThinContinuityReminder(resolvedFallbackAwareness?.awarenessLine)
    || isThinSamePhaseCarryLine(resolvedFallbackAwareness?.awarenessLine)
    || resolvedAwarenessCollapsesIntoEmotionalCue
  const resolvedCompanionNextClosureLooksThin = looksLikeThinContinuityNextClosureLine(resolvedFallbackAwareness?.companionNextClosureLine)
  const richerResolvedAwarenessSummary = resolvedSummaryLooksThin
    ? [
        resolvedFallbackAwareness?.awarenessLine ?? null,
        resolvedFallbackAwareness?.companionBriefingLine ?? null,
      ].find((value): value is string => looksLikeProjectAwareBriefingReminder(value)) ?? null
    : null
  const summaryLine
    = (resolvedSummaryLooksThin
      ? (closureSummaryLine ?? richerResolvedAwarenessSummary)
      : resolvedFallbackAwareness?.summaryLine)
    ?? closureSummaryLine
    ?? richerResolvedAwarenessSummary
    ?? continuitySummary
    ?? resolveContinuityLatestLandedProgress(continuity)
    ?? continuity?.currentPhase?.trim()
    ?? continuity?.identity?.trim()
    ?? null
  const synthesizedClosureCompanionHeadlineLine = resolvePreDialogueClosureCompanionHeadlineLine(closure)
  const companionHeadlineLine
    = resolvePreferredCompanionHeadlineLine({
      awarenessCompanionHeadlineLine: resolvedFallbackAwareness?.companionHeadlineLine ?? null,
      closureCompanionHeadlineLine: synthesizedClosureCompanionHeadlineLine,
    })
    ?? null
  const companionBriefingLine
    = resolvedCompanionBriefingLooksThin && preferredProjectAwareCompanionBriefingLine
      ? preferredProjectAwareCompanionBriefingLine
      : resolvedFallbackAwareness?.companionBriefingLine
        ?? closure?.companionBriefingLine?.trim()
        ?? effectiveSameHerHoldDetail
        ?? effectiveContinuityCue
        ?? continuity?.sameHerSelfLine?.trim()
        ?? continuity?.identity?.trim()
        ?? null
  const companionNextClosureLine
    = resolvedCompanionNextClosureLooksThin && closure?.companionNextClosureLine?.trim()
      ? closure.companionNextClosureLine.trim()
      : resolvedFallbackAwareness?.companionNextClosureLine
        ?? closure?.companionNextClosureLine?.trim()
        ?? continuity?.nextClosureTarget?.trim()
        ?? null
  const closureAwareProjectLine = preferClosureAwareProjectLine({
    companionHeadlineLine: synthesizedClosureCompanionHeadlineLine,
    companionBriefingLine: closure?.companionBriefingLine?.trim() ?? null,
    summaryLine: closure?.summaryLine?.trim() ?? null,
  })
  const explicitFallbackAwarenessLine
    = closureAwareProjectLine
      ?? effectiveSameHerHoldDetail
      ?? effectiveContinuityCue
      ?? continuity?.sameHerSelfLine?.trim()
      ?? continuitySummary
      ?? null
  const explicitFallbackAwarenessSummary
    = closureSummaryLine
      ?? continuitySummary
      ?? null
  const awarenessLine
    = resolvedAwarenessLooksThin && preferredProjectAwareCarryLine
      ? preferredProjectAwareCarryLine
      : resolvedFallbackAwareness?.awarenessLine
        ?? resolveAlicizationProjectPreDialogueAwarenessLine({
          runtimeProjectState: {
            identity: continuity?.identity?.trim() || null,
            currentPhase: continuity?.currentPhase?.trim() || null,
            preDialogueAwarenessLine: explicitFallbackAwarenessLine,
            awarenessLine: explicitFallbackAwarenessLine,
            companionHeadlineLine: synthesizedClosureCompanionHeadlineLine,
            companionBriefingLine: closure?.companionBriefingLine?.trim() ?? null,
            preDialogueAwarenessSummary: explicitFallbackAwarenessSummary,
            emotionalClosureSummary: closure?.emotionalClosureCue?.trim() ?? null,
            latestLandedProgress: resolveContinuityLatestLandedProgress(continuity) || null,
            landedProgressSummary: resolveContinuityLatestLandedProgress(continuity) || null,
            primaryOpenLoop: continuity?.primaryOpenLoop?.trim() ?? null,
            openClosureSummary: continuity?.primaryOpenLoop?.trim() ?? null,
            nextClosureTarget: continuity?.nextClosureTarget?.trim() ?? null,
            sameHerDriftRiskSummary: continuity?.sameHerDriftRisk?.trim() ?? null,
          },
        })
        ?? effectiveSameHerHoldDetail
        ?? effectiveContinuityCue
        ?? continuity?.sameHerSelfLine?.trim()
        ?? continuitySummary
        ?? resolveContinuityLatestLandedProgress(continuity)
        ?? summaryLine
        ?? null

  if (!directAwareness && !closure?.companionHeadlineLine?.trim() && synthesizedClosureCompanionHeadlineLine)
    pushUniqueLine(reasonPreview, synthesizedClosureCompanionHeadlineLine)
  const emotionalClosureCue
    = resolvedFallbackAwareness?.emotionalClosureCue?.trim()
      || closure?.emotionalClosureCue?.trim()
      || continuity?.emotionalClosureCue?.trim()
      || null

  if (!summaryLine && !companionHeadlineLine && !companionBriefingLine && !companionNextClosureLine && !awarenessLine && reasonPreview.length === 0)
    return null

  return sanitizePreDialogueSendIdentity({
    status: resolvedFallbackAwareness?.status ?? closure?.status ?? 'partial',
    summaryLine,
    companionHeadlineLine,
    companionBriefingLine,
    companionNextClosureLine,
    awarenessLine,
    emotionalClosureCue,
    projectState: buildPreDialogueSendIdentityProjectState({
      continuity,
      summaryLine,
      companionHeadlineLine,
      companionBriefingLine,
      awarenessLine,
      emotionalClosureCue,
    }),
    reasonPreview,
  })
}

export function buildPreDialogueSendIdentityFromInspectorSnapshots(input: {
  projectStateContinuitySnapshot?: AlicizationProjectStateContinuitySnapshot | null
  preDialogueClosureSnapshot?: AlicizationPreDialogueClosureSnapshot | null
  preDialogueAwarenessSnapshot?: AlicizationPreDialogueAwarenessSnapshot | null
}) {
  return buildPreDialogueSendIdentityFromSnapshots({
    projectStateContinuitySnapshot: input.projectStateContinuitySnapshot ?? null,
    preDialogueClosureSnapshot: input.preDialogueClosureSnapshot ?? null,
    preDialogueAwarenessSnapshot: input.preDialogueAwarenessSnapshot ?? null,
  })
}
