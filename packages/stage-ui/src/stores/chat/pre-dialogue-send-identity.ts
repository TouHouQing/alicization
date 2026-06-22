import type {
  AlicizationPreDialogueSendIdentity,
  AlicizationProjectStateContinuitySnapshot,
  AlicizationRuntimeProjectStateDigest,
} from '../alicization-bridge'

import {
  describeAlicizationEmbodimentClosureHeadline,
  isAlicizationThinProjectAwarenessLine,
  isAlicizationThinSamePhaseCarryLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  scoreAlicizationProjectAwarenessLine,
} from '@proj-alicization/stage-shared'

type AlicizationPreDialogueAwarenessSnapshot = NonNullable<AlicizationProjectStateContinuitySnapshot['preDialogueAwareness']>

interface AlicizationPreDialogueClosureSnapshot {
  status?: 'grounded' | 'partial' | 'drift' | 'rewritten' | null
  summaryLine?: string | null
  companionHeadlineLine?: string | null
  sameHerDriftRiskLine?: string | null
  companionBriefingLine?: string | null
  companionNextClosureLine?: string | null
  companionshipReasonLine?: string | null
  emotionalClosureCue?: string | null
  briefingLines?: string[]
  reasons?: string[]
}

interface AlicizationLegacyAwareProjectStateContinuitySnapshot
  extends Partial<AlicizationProjectStateContinuitySnapshot> {
  latestProgress?: string | null
  landedProgressSummary?: string | null
  memoryClosureSummary?: string | null
  openClosureSummary?: string | null
  openFocusSummary?: string | null
  nextFocusSummary?: string | null
  nextClosureTargetSummary?: string | null
  emotionalClosureSummary?: string | null
  proactiveSameHerGap?: string | null
  continuityRestraint?: string | null
  continuityArcStage?: string | null
  continuityPreferredTiming?: string | null
  continuityCadence?: string | null
  continuityCue?: string | null
  preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
  preflightSummary?: string | null
  preDialogueAwarenessLine?: string | null
  preDialogueAwarenessSummary?: string | null
  awarenessLine?: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
}

interface BuildPreDialogueSendIdentityInput {
  projectStateContinuitySnapshot?: AlicizationProjectStateContinuitySnapshot | null
  preDialogueClosureSnapshot?: AlicizationPreDialogueClosureSnapshot | null
  preDialogueAwarenessSnapshot?: AlicizationPreDialogueAwarenessSnapshot | null
  continuitySummary?: string | null
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNullableText(value: unknown) {
  return normalizeText(value) || null
}

function pushUniqueLine(lines: string[], value: unknown) {
  const normalized = normalizeText(value)
  if (!normalized || lines.includes(normalized))
    return

  lines.push(normalized)
}

function normalizeReasonPreview(values: unknown[]) {
  const reasonPreview: string[] = []
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value)
        pushUniqueLine(reasonPreview, item)
      continue
    }
    pushUniqueLine(reasonPreview, value)
  }
  return reasonPreview
}

function normalizeSendIdentityStatus(value: unknown): AlicizationPreDialogueSendIdentity['status'] {
  return value === 'grounded' || value === 'drift'
    ? value
    : 'partial'
}

function resolveContinuityLatestLandedProgress(
  continuity: AlicizationLegacyAwareProjectStateContinuitySnapshot | null | undefined,
) {
  return continuity?.latestLandedProgress?.trim()
    || continuity?.latestProgress?.trim()
    || continuity?.landedProgressSummary?.trim()
    || ''
}

function looksLikeThinContinuityReminder(value: unknown) {
  const normalized = normalizeText(value)
  if (!normalized)
    return true

  const lowered = normalized.toLowerCase()
  return isAlicizationThinProjectAwarenessLine(normalized)
    || isAlicizationThinSamePhaseCarryLine(normalized)
    || lowered.includes('generic continuity fallback')
    || lowered.includes('generic continuity reminder')
    || lowered.includes('generic same-her reminder')
}

function looksLikeLivedInSameHerLine(value: unknown) {
  const normalized = normalizeText(value).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('same-her hold')
    || normalized.includes('measured-return')
    || normalized.includes('same callback')
    || normalized.includes('same living line')
    || normalized.includes('one continuous her')
    || normalized.includes('one living her')
    || normalized.includes('同一个她')
}

function chooseStrongerAwarenessLine(...values: unknown[]) {
  const candidates = values
    .map(value => normalizeText(value))
    .filter(Boolean)

  if (candidates.length === 0)
    return null

  return candidates.reduce((best, current) => {
    if (!best)
      return current

    const bestIsThin = looksLikeThinContinuityReminder(best)
    const currentIsThin = looksLikeThinContinuityReminder(current)
    if (bestIsThin !== currentIsThin)
      return currentIsThin ? best : current

    const bestIsLivedIn = looksLikeLivedInSameHerLine(best)
    const currentIsLivedIn = looksLikeLivedInSameHerLine(current)
    if (bestIsLivedIn !== currentIsLivedIn)
      return currentIsLivedIn ? current : best

    const bestScore = scoreAlicizationProjectAwarenessLine(best)
    const currentScore = scoreAlicizationProjectAwarenessLine(current)
    if (bestScore !== currentScore)
      return currentScore > bestScore ? current : best

    return current.length > best.length ? current : best
  }, '')
}

export function resolvePreDialogueClosureCompanionHeadlineLine(
  closure: AlicizationPreDialogueClosureSnapshot | null | undefined,
) {
  const explicitCompanionHeadlineLine = normalizeText(closure?.companionHeadlineLine)
  if (explicitCompanionHeadlineLine)
    return explicitCompanionHeadlineLine

  const candidateEvidenceLines = normalizeReasonPreview([
    closure?.reasons ?? [],
    closure?.summaryLine,
  ])

  for (const candidateEvidenceLine of candidateEvidenceLines) {
    const synthesizedCompanionHeadlineLine = describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: candidateEvidenceLine,
      currentBodyState: candidateEvidenceLine,
    }).trim()

    if (synthesizedCompanionHeadlineLine)
      return synthesizedCompanionHeadlineLine
  }

  return null
}

export function resolvePreferredCompanionHeadlineLine(input: {
  awarenessCompanionHeadlineLine?: string | null
  closureCompanionHeadlineLine?: string | null
}) {
  const awarenessCompanionHeadlineLine = normalizeText(input.awarenessCompanionHeadlineLine)
  const closureCompanionHeadlineLine = normalizeText(input.closureCompanionHeadlineLine)

  if (!awarenessCompanionHeadlineLine)
    return closureCompanionHeadlineLine || null
  if (!closureCompanionHeadlineLine)
    return awarenessCompanionHeadlineLine || null

  const awarenessLooksGenericClosure = awarenessCompanionHeadlineLine.toLowerCase().includes('closure is still incomplete')
    || awarenessCompanionHeadlineLine.toLowerCase().includes('closure line is still settling')
  const closureLooksGenericClosure = closureCompanionHeadlineLine.toLowerCase().includes('closure is still incomplete')
    || closureCompanionHeadlineLine.toLowerCase().includes('closure line is still settling')

  return awarenessLooksGenericClosure && !closureLooksGenericClosure
    ? closureCompanionHeadlineLine
    : awarenessCompanionHeadlineLine
}

function buildPreDialogueSendIdentityProjectState(input: {
  continuity: AlicizationLegacyAwareProjectStateContinuitySnapshot | null
  summaryLine: string | null
  companionHeadlineLine: string | null
  companionBriefingLine: string | null
  awarenessLine: string | null
  emotionalClosureCue: string | null
}): AlicizationRuntimeProjectStateDigest {
  const continuity = input.continuity
  const latestLandedProgress = resolveContinuityLatestLandedProgress(continuity) || null
  const primaryOpenLoop = normalizeNullableText(continuity?.primaryOpenLoop)
    ?? normalizeNullableText(continuity?.memoryClosureSummary)
    ?? normalizeNullableText(continuity?.openClosureSummary)
  const preDialogueAwarenessSummary = normalizeNullableText(continuity?.preDialogueAwarenessSummary)
    ?? input.summaryLine

  const continuitySummary = normalizeNullableText(continuity?.continuitySummary)

  return {
    preflightSummary: input.summaryLine,
    preDialogueAwarenessLine: input.awarenessLine,
    preDialogueAwarenessSummary,
    awarenessLine: input.awarenessLine,
    companionHeadlineLine: input.companionHeadlineLine,
    companionBriefingLine: input.companionBriefingLine,
    identity: normalizeNullableText(continuity?.identity),
    currentPhase: normalizeNullableText(continuity?.currentPhase),
    latestLandedProgress,
    memoryClosureSummary: primaryOpenLoop,
    primaryOpenLoop,
    nextClosureTarget: normalizeNullableText(continuity?.nextClosureTarget)
      ?? normalizeNullableText(continuity?.nextClosureTargetSummary),
    sameHerSelfLine: normalizeNullableText(continuity?.sameHerSelfLine),
    sameHerHoldDetail: normalizeNullableText(continuity?.sameHerHoldDetail),
    sameHerDriftRisk: normalizeNullableText(continuity?.sameHerDriftRisk),
    emotionalClosureCue: input.emotionalClosureCue,
    ...(continuitySummary ? { continuitySummary } : {}),
    ...(normalizeText(continuity?.proactiveSameHerGap)
      ? { proactiveSameHerGap: normalizeText(continuity?.proactiveSameHerGap) }
      : {}),
    ...(normalizeText(continuity?.continuityRestraint)
      ? { continuityRestraint: normalizeText(continuity?.continuityRestraint) }
      : {}),
    ...(normalizeText(continuity?.continuityArcStage)
      ? { continuityArcStage: normalizeText(continuity?.continuityArcStage) }
      : {}),
    ...(normalizeText(continuity?.continuityPreferredTiming)
      ? { continuityPreferredTiming: normalizeText(continuity?.continuityPreferredTiming) }
      : {}),
    ...(normalizeText(continuity?.continuityCadence)
      ? { continuityCadence: normalizeText(continuity?.continuityCadence) }
      : {}),
    ...(normalizeText(continuity?.continuityCue)
      ? { continuityCue: normalizeText(continuity?.continuityCue) }
      : {}),
    ...(continuity?.preferredBlinkCadence
      ? { preferredBlinkCadence: continuity.preferredBlinkCadence }
      : {}),
    ...(continuity?.preferredGazeMode
      ? { preferredGazeMode: continuity.preferredGazeMode }
      : {}),
  }
}

export function buildPreDialogueSendIdentityFromSnapshots(
  input: BuildPreDialogueSendIdentityInput,
): AlicizationPreDialogueSendIdentity | null {
  const continuity = input.projectStateContinuitySnapshot as AlicizationLegacyAwareProjectStateContinuitySnapshot | null | undefined ?? null
  const closure = input.preDialogueClosureSnapshot ?? continuity?.preDialogueClosure ?? null
  const awareness = input.preDialogueAwarenessSnapshot ?? continuity?.preDialogueAwareness ?? null
  const closureCompanionHeadlineLine = resolvePreDialogueClosureCompanionHeadlineLine(closure)
  const awarenessLineFromProjectState = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      identity: continuity?.identity,
      currentPhase: continuity?.currentPhase,
      preDialogueAwarenessLine: continuity?.preDialogueAwarenessLine,
      awarenessLine: continuity?.awarenessLine,
      companionHeadlineLine: continuity?.companionHeadlineLine,
      companionBriefingLine: continuity?.companionBriefingLine,
      preDialogueAwarenessSummary: continuity?.preDialogueAwarenessSummary,
      preflightSummary: continuity?.preflightSummary,
      latestLandedProgress: continuity?.latestLandedProgress,
      latestProgress: continuity?.latestProgress,
      landedProgressSummary: continuity?.landedProgressSummary,
      primaryOpenLoop: continuity?.primaryOpenLoop,
      openClosureSummary: continuity?.openClosureSummary,
      nextClosureTarget: continuity?.nextClosureTarget,
      nextClosureTargetSummary: continuity?.nextClosureTargetSummary,
      emotionalClosureCue: continuity?.emotionalClosureCue,
      emotionalClosureSummary: continuity?.emotionalClosureSummary,
      sameHerSelfLine: continuity?.sameHerSelfLine,
      sameHerHoldDetail: continuity?.sameHerHoldDetail,
      continuityCue: continuity?.continuityCue,
      continuityRestraint: continuity?.continuityRestraint,
      continuityPreferredTiming: continuity?.continuityPreferredTiming,
      continuityCadence: continuity?.continuityCadence,
      proactiveSameHerGap: continuity?.proactiveSameHerGap,
      sameHerDriftRisk: continuity?.sameHerDriftRisk,
    },
  })
  const summaryLine = normalizeNullableText(awareness?.summaryLine)
    ?? normalizeNullableText(closure?.summaryLine)
    ?? normalizeNullableText(continuity?.preflightSummary)
    ?? normalizeNullableText(input.continuitySummary)
    ?? normalizeNullableText(continuity?.continuitySummary)
  const companionHeadlineLine = resolvePreferredCompanionHeadlineLine({
    awarenessCompanionHeadlineLine: awareness?.companionHeadlineLine ?? continuity?.companionHeadlineLine ?? null,
    closureCompanionHeadlineLine,
  })
  const companionBriefingLine = normalizeNullableText(awareness?.companionBriefingLine)
    ?? normalizeNullableText(closure?.companionBriefingLine)
    ?? normalizeNullableText(continuity?.companionBriefingLine)
  const companionNextClosureLine = normalizeNullableText(awareness?.companionNextClosureLine)
    ?? normalizeNullableText(closure?.companionNextClosureLine)
    ?? normalizeNullableText(continuity?.nextClosureTarget)
  const emotionalClosureCue = normalizeNullableText(awareness?.emotionalClosureCue)
    ?? normalizeNullableText(closure?.emotionalClosureCue)
    ?? normalizeNullableText(continuity?.emotionalClosureCue)
  const explicitAwarenessLine = normalizeText(awareness?.awarenessLine)
  const awarenessLine = explicitAwarenessLine && !looksLikeThinContinuityReminder(explicitAwarenessLine)
    ? explicitAwarenessLine
    : chooseStrongerAwarenessLine(
        awareness?.awarenessLine,
        continuity?.sameHerHoldDetail,
        continuity?.continuityCue,
        companionBriefingLine,
        awarenessLineFromProjectState,
        continuity?.sameHerSelfLine,
        input.continuitySummary,
        summaryLine,
        resolveContinuityLatestLandedProgress(continuity),
      )
  const reasonPreview = normalizeReasonPreview([
    awareness?.reasonPreview ?? [],
    closure?.reasons ?? [],
    closure?.briefingLines ?? [],
    awarenessLine,
    emotionalClosureCue,
    continuity?.identity,
    continuity?.currentPhase,
    resolveContinuityLatestLandedProgress(continuity),
    continuity?.sameHerSelfLine,
    continuity?.sameHerHoldDetail,
    continuity?.sameHerDriftRisk,
    continuity?.primaryOpenLoop,
    continuity?.nextClosureTarget,
    continuity?.proactiveSameHerGap,
    continuity?.continuityCue,
  ])

  if (
    !summaryLine
    && !companionHeadlineLine
    && !companionBriefingLine
    && !companionNextClosureLine
    && !awarenessLine
    && !emotionalClosureCue
    && reasonPreview.length === 0
  ) {
    return null
  }

  return {
    status: awareness?.status ?? normalizeSendIdentityStatus(closure?.status),
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
  }
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
