import {
  buildAlicizationProjectPreDialogueAwarenessLine,
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'
import { sanitizeText } from './runtime-soul'

function sanitizeStructuredProjectStateText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function isThinProjectAwarenessShell(value: string | null | undefined) {
  if (!value)
    return false

  const normalized = value.trim().toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('same digital life |')
    || normalized.includes('keep the closure seam explicit')
    || normalized.includes('keep the same digital life project in view')
    || normalized.includes('generic project continuity hold')
    || isAlicizationThinProjectAwarenessLine(normalized)
    || (
      normalized.includes('alicization is a local-first digital life project building one continuous "her"')
      && normalized.includes('phase 1: local digital life')
      && normalized.includes('open=')
      && normalized.includes('next=')
    )
}

function carriesExplicitLandedProgressAwarenessLine(value: string | null | undefined) {
  if (!value)
    return false

  const normalized = value.trim().toLowerCase()
  if (!normalized)
    return false

  return /\blanded:|latest landed|already survives|already survive/u.test(normalized)
}

function carriesGovernanceTailProjectAwarenessLine(value: string | null | undefined) {
  if (!value)
    return false

  const normalized = value.trim().toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('pre-dialogue transport')
    && normalized.includes('entrypoint governance')
    && normalized.includes('chat-entry governance')
}

function looksLikeCallbackSpecificSameHerProjectAwareness(value: string | null | undefined) {
  if (!value)
    return false

  const normalized = value.trim().toLowerCase()
  if (!normalized)
    return false

  return /callback/u.test(normalized)
    && /same digital life|same phase 1 digital life|same her|same-her|same living line|closure seam|same closure line forward|one same her/u.test(normalized)
    && /phase 1|unfinished|still-open closure|still needs|landed|answer compilation|response-surface carry/u.test(normalized)
}

function isCanonicalProjectReminderExpansion(value: string | null | undefined) {
  if (!value)
    return false

  const normalized = value.trim().toLowerCase()
  if (!normalized)
    return false
  if (looksLikeCallbackSpecificSameHerProjectAwareness(normalized))
    return false
  if (carriesExplicitLandedProgressAwarenessLine(normalized))
    return false
  if (carriesGovernanceTailProjectAwarenessLine(normalized))
    return false

  return /before answering, remember: alicization is a local-first digital life project building one continuous "her"|she is still inside phase 1: local digital life|the still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment|same phase 1 digital life/u.test(normalized)
}

function isStrongerSameHerHeadline(value: string | null | undefined) {
  if (!value)
    return false

  const normalized = value.trim().toLowerCase()
  if (!normalized)
    return false

  return /holding together mainly through|full cross-modal closure|same living line|one continuous her|one living digital life|same-her continuity|same her continuity|still needs .* closure|without splitting her continuity|generic project shell|detached project narrator/u.test(normalized)
}

function looksLikeThinStructuredProjectPreflightSummary(value: string | null | undefined) {
  if (!value)
    return false

  const normalized = value.trim().toLowerCase()
  if (!normalized)
    return false

  const carriesExplicitSameHerPhase1ClosureLine
    = normalized.includes('phase 1')
      && (
        normalized.includes('same-her')
        || normalized.includes('same her')
        || normalized.includes('one same her')
        || normalized.includes('one continuous her')
      )
      && (
        normalized.includes('digital life project')
        || normalized.includes('digital life')
        || normalized.includes('closure line')
      )
  if (carriesExplicitSameHerPhase1ClosureLine)
    return false

  return normalized.includes('same digital life |')
    || normalized.includes('keep the closure seam explicit')
    || normalized.includes('keep the same digital life project in view')
    || normalized.includes('thin runtime progress only')
    || normalized.includes('runtime preflight')
    || /^open=.*\|\s*next=/u.test(normalized)
    || (
      normalized.includes('identity=')
      && normalized.includes('phase=')
      && normalized.includes('open=')
      && normalized.includes('next=')
    )
    || normalized === 'project'
    || normalized === 'phase 1'
    || !normalized.includes('alicization is a local-first digital life project')
    || !normalized.includes('phase 1')
    || !normalized.includes('open=')
    || !normalized.includes('next=')
}

function isThinStructuredProjectPreflightSummary(value: string | null | undefined) {
  return looksLikeThinStructuredProjectPreflightSummary(value)
}

function preferStrongerSameHerSelfLine(input: {
  candidate?: string | null
  canonical: string
}) {
  const candidate = sanitizeText(input.candidate ?? '', '')
  const canonical = sanitizeText(input.canonical, '')
  if (!candidate)
    return canonical
  if (!canonical)
    return candidate

  const candidateLower = candidate.toLowerCase()
  const canonicalLower = canonical.toLowerCase()
  const canonicalMentionsContinuousHer
    = canonicalLower.includes('continuous her') || canonicalLower.includes('one continuous her')
  const candidateMentionsContinuousHer
    = candidateLower.includes('continuous her') || candidateLower.includes('one continuous her')
  const candidateOnlyCarriesLivingLine
    = candidateLower.includes('same living line') && !candidateMentionsContinuousHer

  if (canonicalMentionsContinuousHer && candidateOnlyCarriesLivingLine)
    return canonical

  return candidate
}

function resolvePreferredStructuredProjectPreflightSummary(input: {
  preflightSummary?: unknown
  runtimeProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preflightSummary?: unknown
  } | null
  fallbackProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preflightSummary?: unknown
  } | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
}) {
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const explicitSummaryLine = sanitizeStructuredProjectStateText(input.preflightSummary ?? '', 1600) || null
  if (explicitSummaryLine && !looksLikeThinStructuredProjectPreflightSummary(explicitSummaryLine))
    return explicitSummaryLine

  const runtimeSummaryLine = sanitizeStructuredProjectStateText(input.runtimeProjectState?.preflightSummary ?? '', 1600) || null
  if (runtimeSummaryLine && !looksLikeThinStructuredProjectPreflightSummary(runtimeSummaryLine))
    return runtimeSummaryLine

  const fallbackSummaryLine = sanitizeStructuredProjectStateText(input.fallbackProjectState?.preflightSummary ?? '', 1600) || null
  if (fallbackSummaryLine && !looksLikeThinStructuredProjectPreflightSummary(fallbackSummaryLine))
    return fallbackSummaryLine

  const canonicalIdentity = sanitizeStructuredProjectStateText(input.runtimeProjectState?.identity ?? input.fallbackProjectState?.identity ?? '', 220) || ''
  const canonicalPhase = sanitizeStructuredProjectStateText(input.runtimeProjectState?.currentPhase ?? input.fallbackProjectState?.currentPhase ?? '', 160) || ''
  const primaryOpenLoop = sanitizeStructuredProjectStateText(input.primaryOpenLoop ?? '', 220) || ''
  const nextClosureTarget = sanitizeStructuredProjectStateText(input.nextClosureTarget ?? '', 220) || ''

  if (
    canonicalIdentity
    && canonicalPhase
    && primaryOpenLoop
    && nextClosureTarget
  ) {
    return canonicalProjectState.preflightSummary
      ?? [
        canonicalIdentity,
        canonicalPhase,
        `open=${primaryOpenLoop}`,
        `next=${nextClosureTarget}`,
      ].filter(Boolean).join(' | ')
  }

  return canonicalProjectState.preflightSummary
    ?? ([
      canonicalIdentity ? `identity=${canonicalIdentity}` : '',
      canonicalPhase ? `phase=${canonicalPhase}` : '',
      primaryOpenLoop ? `open=${primaryOpenLoop}` : '',
      nextClosureTarget ? `next=${nextClosureTarget}` : '',
    ].filter(Boolean).join(' | ') || null)
}

function preferRicherStructuredProjectAwarenessCandidate(
  current: string | null,
  candidate: string | null,
) {
  if (!current)
    return candidate
  if (!candidate)
    return current

  const currentIsThin
    = isThinProjectAwarenessShell(current)
      || isCanonicalProjectReminderExpansion(current)
  const candidateIsThin
    = isThinProjectAwarenessShell(candidate)
      || isCanonicalProjectReminderExpansion(candidate)

  if (currentIsThin && !candidateIsThin)
    return candidate
  if (!currentIsThin && candidateIsThin)
    return current

  return candidate.length > current.length
    ? candidate
    : current
}

function resolvePreferredStructuredProjectAwarenessLine(input: {
  canonicalAwarenessLine?: string | null
  normalizedProjectAwarenessLine?: string | null
  runtimePreferredAwarenessLine?: string | null
  runtimePreDialogueAwarenessLine?: string | null
  payloadPreDialogueAwarenessLine?: string | null
  normalizedCompanionHeadlineLine?: string | null
  normalizedCompanionBriefingLine?: string | null
  preflightSummary?: string | null
  identity?: string | null
  currentPhase?: string | null
  latestLandedProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  sameHerSelfLine?: string | null
  sameHerHoldDetail?: string | null
  continuityCue?: string | null
  continuityRestraint?: string | null
  continuityCadence?: string | null
  suppressCanonicalAwarenessFallback?: boolean
}) {
  const canonicalAwarenessLine = sanitizeText(input.canonicalAwarenessLine ?? '', '') || null
  const normalizedProjectAwarenessLine = sanitizeText(input.normalizedProjectAwarenessLine ?? '', '') || null
  const runtimePreferredAwarenessLine = sanitizeText(input.runtimePreferredAwarenessLine ?? '', '') || null
  const runtimePreDialogueAwarenessLine = sanitizeText(input.runtimePreDialogueAwarenessLine ?? '', '') || null
  const payloadPreDialogueAwarenessLine = sanitizeText(input.payloadPreDialogueAwarenessLine ?? '', '') || null
  const normalizedCompanionHeadlineLine = sanitizeText(input.normalizedCompanionHeadlineLine ?? '', '') || null
  const normalizedCompanionBriefingLine = sanitizeText(input.normalizedCompanionBriefingLine ?? '', '') || null
  const normalizedSameHerSelfLine = sanitizeText(input.sameHerSelfLine ?? '', '') || null
  const normalizedSameHerHoldDetail = sanitizeText(input.sameHerHoldDetail ?? '', '') || null
  const normalizedContinuityCue = sanitizeText(input.continuityCue ?? '', '') || null
  const normalizedContinuityRestraint = sanitizeText(input.continuityRestraint ?? '', '') || null
  const normalizedContinuityCadence = sanitizeText(input.continuityCadence ?? '', '') || null
  const suppressCanonicalAwarenessFallback = input.suppressCanonicalAwarenessFallback === true

  const preferredAwarenessLineCandidate = [
    runtimePreferredAwarenessLine,
    normalizedProjectAwarenessLine,
    runtimePreDialogueAwarenessLine,
    payloadPreDialogueAwarenessLine,
    suppressCanonicalAwarenessFallback ? null : canonicalAwarenessLine,
  ].reduce<string | null>((best, candidate) => {
    return preferRicherStructuredProjectAwarenessCandidate(best, candidate)
  }, null)
  const preferredExplicitAwarenessLineCandidate = [
    runtimePreferredAwarenessLine,
    normalizedProjectAwarenessLine,
    runtimePreDialogueAwarenessLine,
    payloadPreDialogueAwarenessLine,
  ].reduce<string | null>((best, candidate) => {
    return preferRicherStructuredProjectAwarenessCandidate(best, candidate)
  }, null)
  const shouldPromoteCompanionHeadlineAsPrimaryAwareness
    = isStrongerSameHerHeadline(normalizedCompanionHeadlineLine)
      && (
        isThinProjectAwarenessShell(preferredAwarenessLineCandidate)
        || isCanonicalProjectReminderExpansion(preferredAwarenessLineCandidate)
        || isThinProjectAwarenessShell(runtimePreferredAwarenessLine)
        || isCanonicalProjectReminderExpansion(runtimePreferredAwarenessLine)
        || isThinProjectAwarenessShell(runtimePreDialogueAwarenessLine)
        || isCanonicalProjectReminderExpansion(runtimePreDialogueAwarenessLine)
        || isThinProjectAwarenessShell(payloadPreDialogueAwarenessLine)
        || isCanonicalProjectReminderExpansion(payloadPreDialogueAwarenessLine)
        || isThinProjectAwarenessShell(sanitizeText(input.preflightSummary ?? '', '') || null)
      )
  const rebuiltStructuredAwarenessLine = shouldRebuildStructuredAwarenessFromClosureFields({
    awarenessLine: preferredExplicitAwarenessLineCandidate ?? preferredAwarenessLineCandidate,
    latestLandedProgress: input.latestLandedProgress ?? null,
    primaryOpenLoop: input.primaryOpenLoop ?? null,
    nextClosureTarget: input.nextClosureTarget ?? null,
  })
    ? buildStructuredAwarenessFromClosureFields({
        identity: sanitizeText(input.identity ?? '', '') || 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: sanitizeText(input.currentPhase ?? '', '') || 'Phase 1: Local Digital Life',
        latestLandedProgress: sanitizeText(input.latestLandedProgress ?? '', '') || '',
        primaryOpenLoop: sanitizeText(input.primaryOpenLoop ?? '', '') || '',
        nextClosureTarget: sanitizeText(input.nextClosureTarget ?? '', '') || '',
        sameHerSelfLine: sanitizeText(input.sameHerSelfLine ?? '', '') || '',
      })
    : null

  const resolvedAwarenessLine = sanitizeText(
    resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine:
          shouldPromoteCompanionHeadlineAsPrimaryAwareness
            ? normalizedCompanionHeadlineLine
            : rebuiltStructuredAwarenessLine
              ?? preferredAwarenessLineCandidate,
        awarenessLine:
          shouldPromoteCompanionHeadlineAsPrimaryAwareness
            ? normalizedCompanionHeadlineLine
            : rebuiltStructuredAwarenessLine
              ?? preferredAwarenessLineCandidate,
        companionHeadlineLine: normalizedCompanionHeadlineLine,
        companionBriefingLine: normalizedCompanionBriefingLine,
        sameHerSelfLine: normalizedSameHerSelfLine,
        sameHerHoldDetail: rebuiltStructuredAwarenessLine
          ? null
          : normalizedSameHerHoldDetail,
        continuityCue: normalizedContinuityCue,
        continuityRestraint: normalizedContinuityRestraint,
        continuityCadence: normalizedContinuityCadence,
        preflightSummary: sanitizeText(input.preflightSummary ?? '', '') || null,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: (isThinProjectAwarenessShell(preferredAwarenessLineCandidate)
          || isCanonicalProjectReminderExpansion(preferredAwarenessLineCandidate))
          ? (rebuiltStructuredAwarenessLine
            ?? (suppressCanonicalAwarenessFallback ? null : canonicalAwarenessLine))
          : preferredAwarenessLineCandidate,
        sameHerSelfLine: normalizedSameHerSelfLine,
        sameHerHoldDetail: rebuiltStructuredAwarenessLine
          ? null
          : normalizedSameHerHoldDetail,
        continuityCue: normalizedContinuityCue,
        continuityRestraint: normalizedContinuityRestraint,
        continuityCadence: normalizedContinuityCadence,
        preflightSummary: sanitizeText(input.preflightSummary ?? '', '') || null,
      },
    }) ?? '',
    '',
  ) || null

  return shouldPromoteCompanionHeadlineAsPrimaryAwareness
    ? normalizedCompanionHeadlineLine
    : normalizedCompanionHeadlineLine
      && normalizedCompanionHeadlineLine !== resolvedAwarenessLine
      && (
        preferredAwarenessLineCandidate === resolvedAwarenessLine
        || isThinProjectAwarenessShell(preferredAwarenessLineCandidate)
        || isCanonicalProjectReminderExpansion(preferredAwarenessLineCandidate)
        || isThinProjectAwarenessShell(resolvedAwarenessLine)
        || isCanonicalProjectReminderExpansion(resolvedAwarenessLine)
      )
      ? normalizedCompanionHeadlineLine
      : rebuiltStructuredAwarenessLine
        ?? resolvedAwarenessLine
}

function shouldRebuildStructuredAwarenessFromClosureFields(input: {
  awarenessLine?: string | null
  latestLandedProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
}) {
  const awarenessLine = sanitizeText(input.awarenessLine ?? '', '') || null
  if (!awarenessLine)
    return false
  if (carriesGovernanceTailProjectAwarenessLine(awarenessLine))
    return false
  if (!isThinProjectAwarenessShell(awarenessLine) && !isCanonicalProjectReminderExpansion(awarenessLine))
    return false

  const latestLandedProgress = sanitizeText(input.latestLandedProgress ?? '', '') || null
  const primaryOpenLoop = sanitizeText(input.primaryOpenLoop ?? '', '') || null
  const nextClosureTarget = sanitizeText(input.nextClosureTarget ?? '', '') || null

  return Boolean(latestLandedProgress && primaryOpenLoop && nextClosureTarget)
}

function buildStructuredAwarenessFromClosureFields(input: {
  identity: string
  currentPhase: string
  latestLandedProgress: string
  primaryOpenLoop: string
  nextClosureTarget: string
  sameHerSelfLine: string
}) {
  return buildAlicizationProjectPreDialogueAwarenessLine({
    identity: input.identity,
    currentPhase: input.currentPhase,
    latestLandedProgress: input.latestLandedProgress,
    primaryOpenLoop: input.primaryOpenLoop,
    nextClosureTarget: input.nextClosureTarget,
    sameHerSelfLine: input.sameHerSelfLine,
  })
}

export function resolveCanonicalStructuredProjectState(input: {
  normalizedProjectState?: Record<string, unknown> | null
  runtimePreflightSummary?: string | null
  preparedPreflightSummary?: string | null
  payloadPreflightSummary?: string | null
  runtimePreferredAwarenessLine?: string | null
  runtimePreDialogueAwarenessLine?: string | null
  payloadPreDialogueAwarenessLine?: string | null
  suppressCanonicalAwarenessFallback?: boolean
}) {
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const resolvedIdentity = sanitizeText(
    typeof input.normalizedProjectState?.identity === 'string'
      ? input.normalizedProjectState.identity
      : canonicalProjectState.identity,
    '',
  ) || canonicalProjectState.identity
  const resolvedCurrentPhase = sanitizeText(
    typeof input.normalizedProjectState?.currentPhase === 'string'
      ? input.normalizedProjectState.currentPhase
      : canonicalProjectState.currentPhase,
    '',
  ) || canonicalProjectState.currentPhase
  const runtimePreferredAwarenessLine = sanitizeText(input.runtimePreferredAwarenessLine ?? '', '') || null
  const runtimePreDialogueAwarenessLine = sanitizeText(input.runtimePreDialogueAwarenessLine ?? '', '') || null
  const payloadPreDialogueAwarenessLine = sanitizeText(input.payloadPreDialogueAwarenessLine ?? '', '') || null
  const suppressCanonicalAwarenessFallback = input.suppressCanonicalAwarenessFallback === true
  const normalizedProjectAwarenessLine = [
    sanitizeText(
      typeof input.normalizedProjectState?.preDialogueAwarenessLine === 'string'
        ? input.normalizedProjectState.preDialogueAwarenessLine
        : '',
      '',
    ) || null,
    sanitizeText(
      typeof input.normalizedProjectState?.awarenessLine === 'string'
        ? input.normalizedProjectState.awarenessLine
        : '',
      '',
    ) || null,
    sanitizeText(
      typeof input.normalizedProjectState?.preDialogueAwarenessSummary === 'string'
        ? input.normalizedProjectState.preDialogueAwarenessSummary
        : '',
      '',
    ) || null,
  ].reduce<string | null>((best, candidate) => {
    return preferRicherStructuredProjectAwarenessCandidate(best, candidate)
  }, null)
  const runtimePreflightSummary = sanitizeText(input.runtimePreflightSummary ?? '', '') || null
  const preparedPreflightSummary = sanitizeText(input.preparedPreflightSummary ?? '', '') || null
  const payloadPreflightSummary = sanitizeText(input.payloadPreflightSummary ?? '', '') || null
  const canonicalAwarenessLine = canonicalProjectState.preDialogueAwarenessLine ?? null
  const resolvedPrimaryOpenLoop = sanitizeText(
    typeof input.normalizedProjectState?.primaryOpenLoop === 'string'
      ? input.normalizedProjectState.primaryOpenLoop
      : canonicalProjectState.openLoops[0] ?? '',
    '',
  ) || canonicalProjectState.openLoops[0] || null
  const resolvedNextClosureTarget = sanitizeText(
    typeof input.normalizedProjectState?.nextClosureTarget === 'string'
      ? input.normalizedProjectState.nextClosureTarget
      : canonicalProjectState.nextClosureTarget,
    '',
  ) || canonicalProjectState.nextClosureTarget
  const normalizedCompanionHeadlineLine = sanitizeText(
    typeof input.normalizedProjectState?.companionHeadlineLine === 'string'
      ? input.normalizedProjectState.companionHeadlineLine
      : '',
    '',
  ) || null
  const normalizedCompanionBriefingLine = sanitizeText(
    typeof input.normalizedProjectState?.companionBriefingLine === 'string'
      ? input.normalizedProjectState.companionBriefingLine
      : '',
    '',
  ) || null
  const resolvedLatestLandedProgress = sanitizeText(
    typeof input.normalizedProjectState?.latestLandedProgress === 'string'
      ? input.normalizedProjectState.latestLandedProgress
      : typeof input.normalizedProjectState?.latestProgress === 'string'
        ? input.normalizedProjectState.latestProgress
        : typeof input.normalizedProjectState?.landedProgressSummary === 'string'
          ? input.normalizedProjectState.landedProgressSummary
          : canonicalProjectState.continuityProgressSummary ?? '',
    '',
  ) || canonicalProjectState.continuityProgressSummary || null
  const preferredResolvedPreflightSummary = sanitizeText(
    resolvePreferredStructuredProjectPreflightSummary({
      preflightSummary:
        runtimePreflightSummary
        ?? preparedPreflightSummary
        ?? payloadPreflightSummary
        ?? canonicalProjectState.preflightSummary
        ?? null,
      runtimeProjectState: {
        identity: resolvedIdentity,
        currentPhase: resolvedCurrentPhase,
        preflightSummary: runtimePreflightSummary,
      },
      fallbackProjectState: {
        identity: resolvedIdentity,
        currentPhase: resolvedCurrentPhase,
        preflightSummary:
          preparedPreflightSummary
          ?? payloadPreflightSummary
          ?? canonicalProjectState.preflightSummary
          ?? null,
      },
      primaryOpenLoop: resolvedPrimaryOpenLoop,
      nextClosureTarget: resolvedNextClosureTarget,
    }) ?? '',
    '',
  ) || null
  const shouldReuseCanonicalPreflightSummary
    = Boolean(
      canonicalProjectState.preflightSummary
      && preferredResolvedPreflightSummary
      && (
        isThinStructuredProjectPreflightSummary(runtimePreflightSummary)
        || isThinStructuredProjectPreflightSummary(preparedPreflightSummary)
        || isThinStructuredProjectPreflightSummary(payloadPreflightSummary)
      )
      && resolvedIdentity === canonicalProjectState.identity
      && resolvedCurrentPhase === canonicalProjectState.currentPhase
      && resolvedPrimaryOpenLoop === (canonicalProjectState.openLoops[0] ?? null)
      && resolvedNextClosureTarget === canonicalProjectState.nextClosureTarget,
    )
  const preferredExactPreflightSummary
    = runtimePreflightSummary && !isThinStructuredProjectPreflightSummary(runtimePreflightSummary)
      ? runtimePreflightSummary
      : preparedPreflightSummary && !isThinStructuredProjectPreflightSummary(preparedPreflightSummary)
        ? preparedPreflightSummary
        : payloadPreflightSummary && !isThinStructuredProjectPreflightSummary(payloadPreflightSummary)
          ? payloadPreflightSummary
          : null
  const preferredResolvedAwarenessLine = resolvePreferredStructuredProjectAwarenessLine({
    canonicalAwarenessLine,
    normalizedProjectAwarenessLine,
    runtimePreferredAwarenessLine,
    runtimePreDialogueAwarenessLine,
    payloadPreDialogueAwarenessLine,
    normalizedCompanionHeadlineLine,
    normalizedCompanionBriefingLine,
    preflightSummary:
      preferredResolvedPreflightSummary
      ?? runtimePreflightSummary
      ?? preparedPreflightSummary
      ?? payloadPreflightSummary
      ?? canonicalProjectState.preflightSummary
      ?? null,
    identity: resolvedIdentity,
    currentPhase: resolvedCurrentPhase,
    latestLandedProgress: resolvedLatestLandedProgress,
    primaryOpenLoop: resolvedPrimaryOpenLoop,
    nextClosureTarget: resolvedNextClosureTarget,
    sameHerSelfLine:
      sanitizeText(
        typeof input.normalizedProjectState?.sameHerSelfLine === 'string'
          ? input.normalizedProjectState.sameHerSelfLine
          : canonicalProjectState.sameHerSelfLine,
        '',
      ) || canonicalProjectState.sameHerSelfLine,
    sameHerHoldDetail:
      sanitizeText(
        typeof input.normalizedProjectState?.sameHerHoldDetail === 'string'
          ? input.normalizedProjectState.sameHerHoldDetail
          : '',
        '',
      ) || null,
    continuityCue:
      sanitizeText(
        typeof input.normalizedProjectState?.continuityCue === 'string'
          ? input.normalizedProjectState.continuityCue
          : '',
        '',
      ) || null,
    continuityRestraint:
      sanitizeText(
        typeof input.normalizedProjectState?.continuityRestraint === 'string'
          ? input.normalizedProjectState.continuityRestraint
          : '',
        '',
      ) || null,
    continuityCadence:
      sanitizeText(
        typeof input.normalizedProjectState?.continuityCadence === 'string'
          ? input.normalizedProjectState.continuityCadence
          : '',
        '',
      ) || null,
    suppressCanonicalAwarenessFallback,
  })
  const reconstructedStructuredAwarenessLine
    = shouldRebuildStructuredAwarenessFromClosureFields({
      awarenessLine: preferredResolvedAwarenessLine,
      latestLandedProgress: resolvedLatestLandedProgress,
      primaryOpenLoop: resolvedPrimaryOpenLoop,
      nextClosureTarget: resolvedNextClosureTarget,
    })
      ? buildStructuredAwarenessFromClosureFields({
          identity: resolvedIdentity,
          currentPhase: resolvedCurrentPhase,
          latestLandedProgress: resolvedLatestLandedProgress ?? '',
          primaryOpenLoop: resolvedPrimaryOpenLoop ?? '',
          nextClosureTarget: resolvedNextClosureTarget ?? '',
          sameHerSelfLine:
            sanitizeText(
              typeof input.normalizedProjectState?.sameHerSelfLine === 'string'
                ? input.normalizedProjectState.sameHerSelfLine
                : canonicalProjectState.sameHerSelfLine,
              '',
            ) || canonicalProjectState.sameHerSelfLine,
        })
      : null
  const finalResolvedAwarenessLine = sanitizeText(
    reconstructedStructuredAwarenessLine ?? preferredResolvedAwarenessLine ?? '',
    '',
  ) || null
  const finalAwarenessLineShouldYieldToStrongerSameHerHeadline
    = Boolean(normalizedCompanionHeadlineLine)
      && isStrongerSameHerHeadline(normalizedCompanionHeadlineLine)
      && (
        !finalResolvedAwarenessLine
        || isThinProjectAwarenessShell(finalResolvedAwarenessLine)
        || isCanonicalProjectReminderExpansion(finalResolvedAwarenessLine)
      )
  const finalStructuredAwarenessLine
    = finalAwarenessLineShouldYieldToStrongerSameHerHeadline
      ? normalizedCompanionHeadlineLine
      : finalResolvedAwarenessLine
  const resolvedSameHerSelfLine = preferStrongerSameHerSelfLine({
    candidate: typeof input.normalizedProjectState?.sameHerSelfLine === 'string'
      ? input.normalizedProjectState.sameHerSelfLine
      : null,
    canonical: canonicalProjectState.sameHerSelfLine,
  })
  const resolvedSameHerHoldDetail = sanitizeText(
    typeof input.normalizedProjectState?.sameHerHoldDetail === 'string'
      ? input.normalizedProjectState.sameHerHoldDetail
      : '',
    '',
  ) || null
  const resolvedSameHerDriftRisk = sanitizeText(
    typeof input.normalizedProjectState?.sameHerDriftRisk === 'string'
      ? input.normalizedProjectState.sameHerDriftRisk
      : canonicalProjectState.sameHerDriftRisk,
    '',
  ) || canonicalProjectState.sameHerDriftRisk
  const canonicalStructuredProjectStateSnapshot = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: input.normalizedProjectState ?? null,
    fallbackProjectState: {
      identity: resolvedIdentity,
      currentPhase: resolvedCurrentPhase,
      preflightSummary: preferredExactPreflightSummary
        ?? (shouldReuseCanonicalPreflightSummary
          ? (canonicalProjectState.preflightSummary ?? null)
          : preferredResolvedPreflightSummary)
        ?? runtimePreflightSummary
        ?? preparedPreflightSummary
        ?? payloadPreflightSummary
        ?? canonicalProjectState.preflightSummary
        ?? null,
      preDialogueAwarenessSummary: finalStructuredAwarenessLine,
      preDialogueAwarenessLine: finalStructuredAwarenessLine,
      awarenessLine: finalStructuredAwarenessLine,
      companionHeadlineLine: sanitizeText(
        typeof input.normalizedProjectState?.companionHeadlineLine === 'string'
          ? input.normalizedProjectState.companionHeadlineLine
          : finalStructuredAwarenessLine ?? '',
        '',
      ) || finalStructuredAwarenessLine,
      companionBriefingLine: normalizedCompanionBriefingLine,
      latestLandedProgress: resolvedLatestLandedProgress,
      latestProgress: resolvedLatestLandedProgress,
      primaryOpenLoop: resolvedPrimaryOpenLoop,
      nextClosureTarget: resolvedNextClosureTarget,
      sameHerSelfLine: resolvedSameHerSelfLine,
      sameHerHoldDetail: resolvedSameHerHoldDetail,
      sameHerDriftRisk: resolvedSameHerDriftRisk,
      emotionalClosureCue:
        typeof input.normalizedProjectState?.emotionalClosureCue === 'string'
          ? input.normalizedProjectState.emotionalClosureCue
          : canonicalProjectState.emotionalClosureCue ?? null,
      emotionalClosureSummary:
        typeof input.normalizedProjectState?.emotionalClosureSummary === 'string'
          ? input.normalizedProjectState.emotionalClosureSummary
          : null,
      continuityRestraint:
        typeof input.normalizedProjectState?.continuityRestraint === 'string'
          ? input.normalizedProjectState.continuityRestraint
          : null,
      continuityArcStage:
        typeof input.normalizedProjectState?.continuityArcStage === 'string'
          ? input.normalizedProjectState.continuityArcStage
          : null,
      continuityCue:
        typeof input.normalizedProjectState?.continuityCue === 'string'
          ? input.normalizedProjectState.continuityCue
          : null,
      continuityPreferredTiming:
        typeof input.normalizedProjectState?.continuityPreferredTiming === 'string'
          ? input.normalizedProjectState.continuityPreferredTiming
          : null,
      continuityCadence:
        typeof input.normalizedProjectState?.continuityCadence === 'string'
          ? input.normalizedProjectState.continuityCadence
          : null,
      preferredBlinkCadence:
        typeof input.normalizedProjectState?.preferredBlinkCadence === 'string'
          ? input.normalizedProjectState.preferredBlinkCadence
          : null,
      preferredGazeMode:
        typeof input.normalizedProjectState?.preferredGazeMode === 'string'
          ? input.normalizedProjectState.preferredGazeMode
          : null,
      preferredPauseMode:
        typeof input.normalizedProjectState?.preferredPauseMode === 'string'
          ? input.normalizedProjectState.preferredPauseMode
          : null,
      preferredLipsyncMode:
        typeof input.normalizedProjectState?.preferredLipsyncMode === 'string'
          ? input.normalizedProjectState.preferredLipsyncMode
          : null,
      preferredVoiceMode:
        typeof input.normalizedProjectState?.preferredVoiceMode === 'string'
          ? input.normalizedProjectState.preferredVoiceMode
          : null,
      preferredPacingMode:
        typeof input.normalizedProjectState?.preferredPacingMode === 'string'
          ? input.normalizedProjectState.preferredPacingMode
          : null,
    },
  })

  return {
    identity: resolvedIdentity,
    currentPhase: resolvedCurrentPhase,
    preflightSummary: preferredExactPreflightSummary
      ?? (shouldReuseCanonicalPreflightSummary
        ? (canonicalProjectState.preflightSummary ?? null)
        : preferredResolvedPreflightSummary)
      ?? runtimePreflightSummary
      ?? preparedPreflightSummary
      ?? payloadPreflightSummary
      ?? canonicalProjectState.preflightSummary
      ?? null,
    preDialogueAwarenessSummary: finalStructuredAwarenessLine,
    preDialogueAwarenessLine: finalStructuredAwarenessLine,
    awarenessLine: finalStructuredAwarenessLine,
    companionHeadlineLine: sanitizeText(
      typeof input.normalizedProjectState?.companionHeadlineLine === 'string'
        ? input.normalizedProjectState.companionHeadlineLine
        : finalStructuredAwarenessLine ?? '',
      '',
    ) || canonicalStructuredProjectStateSnapshot.companionHeadlineLine || finalStructuredAwarenessLine,
    companionBriefingLine: canonicalStructuredProjectStateSnapshot.companionBriefingLine ?? null,
    latestLandedProgress: resolvedLatestLandedProgress,
    primaryOpenLoop: resolvedPrimaryOpenLoop,
    nextClosureTarget: resolvedNextClosureTarget,
    sameHerSelfLine: resolvedSameHerSelfLine,
    sameHerHoldDetail: canonicalStructuredProjectStateSnapshot.sameHerHoldDetail ?? resolvedSameHerHoldDetail,
    sameHerDriftRisk: resolvedSameHerDriftRisk,
    emotionalClosureCue: canonicalStructuredProjectStateSnapshot.emotionalClosureCue ?? null,
    emotionalClosureSummary: canonicalStructuredProjectStateSnapshot.emotionalClosureSummary ?? null,
    continuityRestraint: canonicalStructuredProjectStateSnapshot.continuityRestraint ?? null,
    continuityArcStage: canonicalStructuredProjectStateSnapshot.continuityArcStage ?? null,
    continuityCue: canonicalStructuredProjectStateSnapshot.continuityCue ?? null,
    continuityPreferredTiming: canonicalStructuredProjectStateSnapshot.continuityPreferredTiming ?? null,
    continuityCadence: canonicalStructuredProjectStateSnapshot.continuityCadence ?? null,
    preferredBlinkCadence: canonicalStructuredProjectStateSnapshot.preferredBlinkCadence ?? null,
    preferredGazeMode: canonicalStructuredProjectStateSnapshot.preferredGazeMode ?? null,
    preferredPauseMode: canonicalStructuredProjectStateSnapshot.preferredPauseMode ?? null,
    preferredLipsyncMode: canonicalStructuredProjectStateSnapshot.preferredLipsyncMode ?? null,
    preferredVoiceMode: canonicalStructuredProjectStateSnapshot.preferredVoiceMode ?? null,
    preferredPacingMode: canonicalStructuredProjectStateSnapshot.preferredPacingMode ?? null,
  }
}
