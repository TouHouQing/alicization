import type {
  AlicizationConversationTurnInput,
  AlicizationProjectStateContinuitySnapshot,
  AlicizationProjectStateObservation,
} from './alicization-bridge'

import {
  isAlicizationThinProjectAwarenessLine,
  isAlicizationThinSamePhaseCarryLine as isThinSamePhaseCarryLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  sanitizeAlicizationProviderFacingText,
  scoreAlicizationProjectAwarenessLine,
} from '@proj-alicization/stage-shared'

import {
  normalizeStructuredPreDialogueAwarenessPayload,
  normalizeStructuredProjectStatePayload,
} from '../composables/alicization-structured-output'
import { buildPreDialogueSendIdentityFromSnapshots } from './chat/pre-dialogue-send-identity'

type NormalizedObservedProjectState = ReturnType<typeof normalizeStructuredProjectStatePayload>
type LegacyAwareObservedProjectState = AlicizationProjectStateObservation['projectState'] & {
  latestProgress?: string | null
  landedProgressSummary?: string | null
}
type ObservedPreDialogueClosure = NonNullable<AlicizationProjectStateObservation['preDialogueClosure']>

type ConversationTurnProjectStateRecord = Pick<
  AlicizationConversationTurnInput,
  'origin' | 'visibleReplyCritic' | 'visibleReplyClosure'
> & {
  turnId?: string | null
  sessionId: string
  structured?: Record<string, unknown> | null
}

const fixedTemplateWithheldObservationLine
  = ''

function sanitizeProjectStateObservationText(raw: unknown, maxLength: number) {
  return sanitizeAlicizationProviderFacingText(raw, maxLength, fixedTemplateWithheldObservationLine)
}

function sanitizeProjectStateObservationPhaseText(raw: unknown, maxLength: number) {
  const sanitized = sanitizeProjectStateObservationText(raw, maxLength)
  if (/^project_phase=life_core(?:\b|[.;。；])/iu.test(sanitized))
    return 'runtime_context=local_runtime'
  return sanitized
}

function looksLikeThinContinuityReminder(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  return isAlicizationThinProjectAwarenessLine(normalized)
    || normalized.includes('generic continuity reminder')
    || normalized.includes('generic awareness reminder')
    || normalized.includes('generic awareness summary')
    || normalized.includes('generic same-her reminder')
    || (normalized.startsWith('same-her=') && normalized.includes('| landed=') && normalized.includes('| open='))
}

function looksLikeThinObservationAwarenessSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  return isAlicizationThinProjectAwarenessLine(normalized)
    || normalized.includes('generic continuity reminder')
    || normalized.includes('generic awareness reminder')
    || normalized.includes('generic awareness summary')
    || normalized.includes('generic same-her reminder')
}

function carriesBroaderObservationProjectFrame(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return false

  return /\b(?:project|digital life project|life loop|still-open|what has landed|before speaking|before answering|local-first digital life)\b/i.test(normalized)
    || /数字生命项目|闭环|主线|已落地|开口前|先记住/u.test(normalized)
}

function resolveObservationAwarenessSummaryLine(input: {
  preferredAwarenessSummaryLine: string | null
  richerProjectAwareSummary: string | null
  strongerContinuitySummary: string | null
  awarenessLine: string | null
  companionBriefingLine: string | null
}) {
  const summaryLooksThin = !input.preferredAwarenessSummaryLine
    || looksLikeThinContinuityReminder(input.preferredAwarenessSummaryLine)

  if (input.richerProjectAwareSummary && summaryLooksThin)
    return input.richerProjectAwareSummary

  const richerStructuredProjectAwareSummary = summaryLooksThin
    ? [
        input.awarenessLine,
        input.companionBriefingLine,
      ].find((value): value is string => Boolean(
        value
        && !looksLikeThinContinuityReminder(value)
        && carriesBroaderObservationProjectFrame(value)
        && scoreAlicizationProjectAwarenessLine(value) > 0,
      )) ?? null
    : null

  return summaryLooksThin
    ? richerStructuredProjectAwareSummary
    || input.strongerContinuitySummary
    || input.preferredAwarenessSummaryLine
    || null
    : input.preferredAwarenessSummaryLine
      || input.strongerContinuitySummary
      || null
}

function isSameHerInwardLowPressureHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return (
    normalized.includes('continuity=embodiment')
    && normalized.includes('low-pressure-inward-carry')
  ) || (
    normalized.includes('holding together mainly through')
    && normalized.includes('low-pressure')
    && (
      normalized.includes('same line inward')
      || normalized.includes('same living line')
      || normalized.includes('same-her-inward-carry')
      || normalized.includes('quiet-companionship')
    )
  )
}

function buildCompactSameHerInwardLowPressureAwarenessLine() {
  return 'continuity_context=phase1_carry; source=companion_briefing; continuity=embodiment; status=pending-rejoin; pending_rejoin=lipsync+voice; evidence=low-pressure-inward-carry; surface=structured'
}

function isAnthropomorphicHostFacingSameHerHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.includes('anthropomorphic emotional closure')
    && (normalized.includes('same-her inward-carry observability') || normalized.includes('continuity inward-carry observability'))
    && normalized.includes('measured-return')
}

function buildCompactAnthropomorphicHostFacingAwarenessLine() {
  return 'continuity_context=phase1_carry; source=companion_briefing; affective_closure=anthropomorphic-emotional-closure; observability=continuity-inward-carry; timing=measured-return; surface=structured'
}

function needsProjectStateObservationPreDialogueAwarenessUpgrade(
  awareness: AlicizationProjectStateObservation['preDialogueAwareness'] | null | undefined,
) {
  if (!awareness)
    return true

  const summaryLine = awareness.summaryLine?.trim() || ''
  const awarenessLine = awareness.awarenessLine?.trim() || ''

  return !summaryLine
    || !awarenessLine
    || looksLikeThinObservationAwarenessSummary(summaryLine)
    || looksLikeThinContinuityReminder(awarenessLine)
}

function readVisibleReplyCritic(record: ConversationTurnProjectStateRecord) {
  return record.visibleReplyCritic && typeof record.visibleReplyCritic === 'object'
    ? record.visibleReplyCritic as Record<string, unknown>
    : null
}

function readVisibleReplyClosure(record: ConversationTurnProjectStateRecord) {
  return record.visibleReplyClosure && typeof record.visibleReplyClosure === 'object'
    ? record.visibleReplyClosure as Record<string, unknown>
    : null
}

function readNormalizedObservedProjectState(
  projectState: Record<string, unknown> | null,
): NormalizedObservedProjectState | null {
  return projectState ? normalizeStructuredProjectStatePayload(projectState) ?? null : null
}

function resolveObservationLatestLandedProgress(
  projectState: AlicizationProjectStateObservation['projectState'] | null | undefined,
) {
  const legacyAwareProjectState = projectState as LegacyAwareObservedProjectState | null | undefined
  return projectState?.latestLandedProgress?.trim()
    || legacyAwareProjectState?.latestProgress?.trim()
    || legacyAwareProjectState?.landedProgressSummary?.trim()
    || null
}

export function readConversationTurnProjectStateObservation(
  record: ConversationTurnProjectStateRecord,
): AlicizationProjectStateObservation | null {
  const structured = record.structured && typeof record.structured === 'object'
    ? record.structured as Record<string, unknown>
    : null
  const projectState = structured?.projectState && typeof structured.projectState === 'object'
    ? structured.projectState as Record<string, unknown>
    : null
  const preDialogueAwareness = structured?.preDialogueAwareness && typeof structured.preDialogueAwareness === 'object'
    ? structured.preDialogueAwareness as Record<string, unknown>
    : null
  const preDialogueClosure = structured?.preDialogueClosure && typeof structured.preDialogueClosure === 'object'
    ? structured.preDialogueClosure as Record<string, unknown>
    : null
  const visibleReplyRealization = structured?.visibleReplyRealization && typeof structured.visibleReplyRealization === 'object'
    ? structured.visibleReplyRealization as {
      projectStateAudit?: {
        sameHerSummary?: unknown
        sameHerHoldDetail?: unknown
        continuityArcStage?: unknown
        continuityCue?: unknown
        currentPhaseSummary?: unknown
        landedProgressSummary?: unknown
        openClosureSummary?: unknown
        nextClosureTargetSummary?: unknown
        emotionalClosureSummary?: unknown
        preDialogueAwarenessSummary?: unknown
        continuitySummary?: unknown
        sameHerDriftRiskSummary?: unknown
        sameHerDriftRisk?: unknown
        proactiveSameHerGapSummary?: unknown
        preservedIntoRewrite?: unknown
        rewriteClosureApplied?: unknown
      } | null
    }
    : null
  const projectStateAudit = visibleReplyRealization?.projectStateAudit
    && typeof visibleReplyRealization.projectStateAudit === 'object'
    ? visibleReplyRealization.projectStateAudit
    : null
  const digitalLifeSpine = structured?.digitalLifeSpine && typeof structured.digitalLifeSpine === 'object'
    ? structured.digitalLifeSpine as {
      memory?: {
        personStateProjection?: {
          selfContinuityAuthority?: {
            authoritySummary?: unknown
            inwardLine?: unknown
          } | null
        } | null
      } | null
    }
    : null
  const selfContinuityAuthority = digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority ?? null
  const visibleReplyCritic = readVisibleReplyCritic(record)
  const visibleReplyClosure = readVisibleReplyClosure(record)
  if (!projectState)
    return null

  const normalizedProjectState = readNormalizedObservedProjectState(projectState)
  if (!normalizedProjectState)
    return null

  const normalizedPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(preDialogueAwareness)
  const hadTransportedPreDialogueAwarenessShell = Boolean(
    preDialogueAwareness && !normalizedPreDialogueAwareness,
  )
  const identity = sanitizeProjectStateObservationText(normalizedProjectState.identity, 180)
    || 'project_state_owner=ProjectStateGovernance'
  const canonicalCurrentPhase = sanitizeProjectStateObservationPhaseText(normalizedProjectState.currentPhase, 180)
    || 'runtime_context=local_runtime'
  const canonicalNextClosureTarget = sanitizeProjectStateObservationText(normalizedProjectState.nextClosureTarget, 320)
    || 'continuity_review_required'

  const closureReasonFallback = Array.isArray(visibleReplyClosure?.reasonCodes)
    ? visibleReplyClosure.reasonCodes
        .map(reason => sanitizeProjectStateObservationText(reason, 320))
        .filter((reason): reason is string => Boolean(reason))
    : []
  const criticReasonFallback = Array.isArray(visibleReplyCritic?.reasons)
    ? visibleReplyCritic.reasons
        .map(reason => sanitizeProjectStateObservationText(reason, 320))
        .filter((reason): reason is string => Boolean(reason))
    : []
  const closureStatusFallback = sanitizeProjectStateObservationText(visibleReplyClosure?.status, 80) || null
  const nonHumanAuthoredStatusFallback = closureStatusFallback
    || sanitizeProjectStateObservationText(criticReasonFallback[0], 160)
    || null
  const strongerSameHerSelfLine
    = sanitizeProjectStateObservationText(projectStateAudit?.sameHerSummary, 220)
      || sanitizeProjectStateObservationText(selfContinuityAuthority?.inwardLine, 220)
      || sanitizeProjectStateObservationText(selfContinuityAuthority?.authoritySummary, 220)
      || null
  const strongerSameHerHoldDetail
    = sanitizeProjectStateObservationText(projectStateAudit?.sameHerHoldDetail, 220)
      || sanitizeProjectStateObservationText(normalizedProjectState.sameHerHoldDetail, 220)
      || null
  const strongerSameHerDriftRisk
    = sanitizeProjectStateObservationText(projectStateAudit?.sameHerDriftRiskSummary, 320)
      || sanitizeProjectStateObservationText(projectStateAudit?.sameHerDriftRisk, 320)
      || sanitizeProjectStateObservationText(normalizedProjectState.sameHerDriftRisk, 320)
      || null
  const strongerContinuityArcStage
    = sanitizeProjectStateObservationText(projectStateAudit?.continuityArcStage, 120)
      || sanitizeProjectStateObservationText(normalizedProjectState.continuityArcStage, 120)
      || null
  const strongerContinuityCue
    = sanitizeProjectStateObservationText(projectStateAudit?.continuityCue, 220)
      || sanitizeProjectStateObservationText(normalizedProjectState.continuityCue, 220)
      || null
  const continuityRestraint
    = sanitizeProjectStateObservationText(normalizedProjectState.continuityRestraint, 64)
      || null
  const continuityPreferredTiming
    = sanitizeProjectStateObservationText(normalizedProjectState.continuityPreferredTiming, 120)
      || null
  const continuityCadence
    = sanitizeProjectStateObservationText(normalizedProjectState.continuityCadence, 120)
      || null
  const strongerCurrentPhase
    = sanitizeProjectStateObservationPhaseText(projectStateAudit?.currentPhaseSummary, 180)
      || canonicalCurrentPhase
  const strongerNextClosureTarget
    = sanitizeProjectStateObservationText(projectStateAudit?.nextClosureTargetSummary, 320)
      || canonicalNextClosureTarget
  const strongerLatestLandedProgress
    = sanitizeProjectStateObservationText(projectStateAudit?.landedProgressSummary, 320)
      || null
  const strongerPrimaryOpenLoop
    = sanitizeProjectStateObservationText(projectStateAudit?.openClosureSummary, 320)
      || null
  const strongerPreDialogueAwarenessSummary
    = sanitizeProjectStateObservationText(projectStateAudit?.preDialogueAwarenessSummary, 320)
      || null
  const richerProjectAwareSummary
    = strongerPreDialogueAwarenessSummary && !looksLikeThinContinuityReminder(strongerPreDialogueAwarenessSummary)
      ? strongerPreDialogueAwarenessSummary
      : null
  const strongerEmotionalClosureCue
    = sanitizeProjectStateObservationText(projectStateAudit?.emotionalClosureSummary, 320)
      || sanitizeProjectStateObservationText(normalizedPreDialogueAwareness?.emotionalClosureCue, 320)
      || null
  const strongerProactiveSameHerGap
    = sanitizeProjectStateObservationText(projectStateAudit?.proactiveSameHerGapSummary, 320)
      || null
  const proactiveSameHerGap
    = strongerProactiveSameHerGap
      || sanitizeProjectStateObservationText(normalizedProjectState.proactiveSameHerGap, 320)
      || null
  const effectiveLatestLandedProgress
    = strongerLatestLandedProgress
      || sanitizeProjectStateObservationText(normalizedProjectState.latestLandedProgress, 320)
      || null
  const effectivePrimaryOpenLoop
    = strongerPrimaryOpenLoop
      || sanitizeProjectStateObservationText(normalizedProjectState.primaryOpenLoop, 320)
      || null
  const strongerContinuitySummary
    = sanitizeProjectStateObservationText(projectStateAudit?.continuitySummary, 480)
      || strongerPreDialogueAwarenessSummary
      || sanitizeProjectStateObservationText(normalizedProjectState.continuitySummary, 480)
      || null
  const strongerCompanionHeadlineLine
    = sanitizeProjectStateObservationText(normalizedPreDialogueAwareness?.companionHeadlineLine, 320)
      || null
  const preferredAwarenessSummaryLine
    = sanitizeProjectStateObservationText(normalizedPreDialogueAwareness?.summaryLine, 320)
      || null
  const normalizedAwarenessLine = sanitizeProjectStateObservationText(normalizedPreDialogueAwareness?.awarenessLine, 320) || null
  const normalizedCompanionBriefingLine = sanitizeProjectStateObservationText(normalizedPreDialogueAwareness?.companionBriefingLine, 320) || null
  const shouldPreferRicherSameHerLine = Boolean(
    strongerContinuitySummary
    && (
      !preferredAwarenessSummaryLine
      || looksLikeThinContinuityReminder(preferredAwarenessSummaryLine)
    ),
  )
  const shouldPreferRicherProjectAwareSummary = Boolean(
    richerProjectAwareSummary
    && (
      !preferredAwarenessSummaryLine
      || looksLikeThinContinuityReminder(preferredAwarenessSummaryLine)
    ),
  )
  const summaryLine = shouldPreferRicherSameHerLine
    ? resolveObservationAwarenessSummaryLine({
        preferredAwarenessSummaryLine,
        richerProjectAwareSummary,
        strongerContinuitySummary,
        awarenessLine: normalizedAwarenessLine,
        companionBriefingLine: normalizedCompanionBriefingLine,
      })
    : preferredAwarenessSummaryLine
      || strongerContinuitySummary
      || null
  const richerSameHerAwarenessLine = strongerCompanionHeadlineLine
    || strongerSameHerHoldDetail
    || strongerContinuityCue
    || strongerSameHerSelfLine
    || null
  const shouldPreferRicherSameHerAwarenessLine = Boolean(
    richerSameHerAwarenessLine
    && normalizedAwarenessLine
    && (
      looksLikeThinContinuityReminder(normalizedAwarenessLine)
      || isThinSamePhaseCarryLine(normalizedAwarenessLine)
    ),
  )
  const richerSameHerBriefingLine = strongerSameHerHoldDetail || strongerContinuityCue || null
  const shouldPreferRicherSameHerBriefingLine = Boolean(
    richerSameHerBriefingLine
    && normalizedCompanionBriefingLine
    && (
      looksLikeThinContinuityReminder(normalizedCompanionBriefingLine)
      || isThinSamePhaseCarryLine(normalizedCompanionBriefingLine)
    ),
  )
  const richerProjectAwareBriefingLine = richerProjectAwareSummary || null
  const shouldPreferRicherProjectAwareBriefingLine = Boolean(
    richerProjectAwareBriefingLine
    && (
      !normalizedCompanionBriefingLine
      || looksLikeThinContinuityReminder(normalizedCompanionBriefingLine)
    ),
  )
  const awarenessOnlyRepeatsHeadline = Boolean(
    normalizedAwarenessLine
    && strongerCompanionHeadlineLine
    && normalizedAwarenessLine === strongerCompanionHeadlineLine,
  )
  const mergedInwardLowPressureAwarenessLine = awarenessOnlyRepeatsHeadline
    && normalizedCompanionBriefingLine
    && isThinSamePhaseCarryLine(normalizedCompanionBriefingLine)
    && isSameHerInwardLowPressureHeadline(strongerCompanionHeadlineLine)
    ? buildCompactSameHerInwardLowPressureAwarenessLine()
    : null
  const mergedAnthropomorphicHostFacingAwarenessLine = awarenessOnlyRepeatsHeadline
    && normalizedCompanionBriefingLine
    && isThinSamePhaseCarryLine(normalizedCompanionBriefingLine)
    && isAnthropomorphicHostFacingSameHerHeadline(strongerCompanionHeadlineLine)
    ? buildCompactAnthropomorphicHostFacingAwarenessLine()
    : null
  const resolvedAwarenessLineInput = shouldPreferRicherSameHerAwarenessLine
    ? richerSameHerAwarenessLine
    : (mergedAnthropomorphicHostFacingAwarenessLine ?? mergedInwardLowPressureAwarenessLine ?? normalizedAwarenessLine)
  const awarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      identity,
      currentPhase: strongerCurrentPhase,
      preDialogueAwarenessLine: resolvedAwarenessLineInput,
      awarenessLine: resolvedAwarenessLineInput,
      companionHeadlineLine: strongerCompanionHeadlineLine,
      companionBriefingLine: shouldPreferRicherProjectAwareBriefingLine
        ? richerProjectAwareBriefingLine
        : shouldPreferRicherSameHerBriefingLine
          ? richerSameHerBriefingLine
          : normalizedCompanionBriefingLine,
      preDialogueAwarenessSummary: shouldPreferRicherProjectAwareSummary
        ? richerProjectAwareSummary
        : preferredAwarenessSummaryLine,
      preflightSummary: shouldPreferRicherProjectAwareSummary
        ? richerProjectAwareSummary
        : strongerContinuitySummary,
      latestLandedProgress: strongerLatestLandedProgress
        || sanitizeProjectStateObservationText(normalizedProjectState.latestLandedProgress, 320)
        || null,
      landedProgressSummary: strongerLatestLandedProgress,
      primaryOpenLoop: strongerPrimaryOpenLoop
        || sanitizeProjectStateObservationText(normalizedProjectState.primaryOpenLoop, 320)
        || null,
      openClosureSummary: strongerPrimaryOpenLoop,
      nextClosureTarget: strongerNextClosureTarget,
      nextClosureTargetSummary: strongerNextClosureTarget,
      proactiveSameHerGap,
      sameHerDriftRiskSummary: strongerSameHerDriftRisk,
      emotionalClosureSummary: strongerEmotionalClosureCue,
    },
  })
  const projectStateReasonPreviewCarry = [
    identity,
    strongerCurrentPhase,
    effectiveLatestLandedProgress,
    effectivePrimaryOpenLoop,
    strongerNextClosureTarget,
    strongerEmotionalClosureCue,
    strongerSameHerDriftRisk,
    strongerSameHerHoldDetail,
    strongerContinuityCue,
    strongerSameHerSelfLine,
    proactiveSameHerGap,
  ].filter((reason): reason is string => Boolean(reason))
  const hasProjectStateContinuitySeedsForAwareness = Boolean(
    identity
    || strongerCurrentPhase
    || strongerContinuitySummary
    || effectiveLatestLandedProgress
    || effectivePrimaryOpenLoop
    || strongerNextClosureTarget
    || strongerEmotionalClosureCue
    || strongerSameHerDriftRisk
    || strongerSameHerHoldDetail
    || strongerContinuityCue
    || strongerSameHerSelfLine
    || proactiveSameHerGap,
  )
  const shouldSynthesizePreDialogueAwareness = !normalizedPreDialogueAwareness && Boolean(
    (hadTransportedPreDialogueAwarenessShell && hasProjectStateContinuitySeedsForAwareness)
    || (
      projectStateAudit
      && (
        strongerContinuitySummary
        || strongerLatestLandedProgress
        || strongerPrimaryOpenLoop
        || strongerEmotionalClosureCue
        || strongerSameHerHoldDetail
        || strongerContinuityCue
        || strongerSameHerDriftRisk
        || proactiveSameHerGap
        || strongerCurrentPhase !== canonicalCurrentPhase
        || strongerNextClosureTarget !== canonicalNextClosureTarget
      )
    )
    || continuityRestraint
    || continuityPreferredTiming
    || continuityCadence,
  )
  const normalizedPreDialogueClosure: ObservedPreDialogueClosure | null = preDialogueClosure || closureStatusFallback || closureReasonFallback.length > 0 || criticReasonFallback.length > 0
    ? (() => {
        const closureStatusText = sanitizeProjectStateObservationText(preDialogueClosure?.status, 80)
          || closureStatusFallback
        const normalizedClosureStatus: ObservedPreDialogueClosure['status']
          = closureStatusText === 'grounded' || closureStatusText === 'partial' || closureStatusText === 'drift' || closureStatusText === 'rewritten'
            ? closureStatusText
            : null
        const sameHerDriftRiskLine = sanitizeProjectStateObservationText(preDialogueClosure?.sameHerDriftRiskLine, 320) || null
        return {
          status: normalizedClosureStatus,
          summaryLine: sanitizeProjectStateObservationText(preDialogueClosure?.summaryLine, 320) || null,
          emotionalClosureCue: sanitizeProjectStateObservationText(preDialogueClosure?.emotionalClosureCue, 320)
            || sanitizeProjectStateObservationText(normalizedPreDialogueAwareness?.emotionalClosureCue, 320)
            || null,
          companionHeadlineLine: sanitizeProjectStateObservationText(preDialogueClosure?.companionHeadlineLine, 320) || null,
          ...(sameHerDriftRiskLine
            ? { sameHerDriftRiskLine }
            : {}),
          companionBriefingLine: sanitizeProjectStateObservationText(preDialogueClosure?.companionBriefingLine, 320) || null,
          companionNextClosureLine: sanitizeProjectStateObservationText(preDialogueClosure?.companionNextClosureLine, 320) || null,
          reasons: Array.isArray(preDialogueClosure?.reasons)
            ? preDialogueClosure.reasons
                .map(reason => sanitizeProjectStateObservationText(reason, 320))
                .filter((reason): reason is string => Boolean(reason))
                .concat(closureReasonFallback, criticReasonFallback)
            : [...closureReasonFallback, ...criticReasonFallback],
        }
      })()
    : null
  const synthesizedPreDialogueAwareness = shouldSynthesizePreDialogueAwareness
    ? buildPreDialogueSendIdentityFromSnapshots({
        projectStateContinuitySnapshot: {
          identity,
          currentPhase: strongerCurrentPhase,
          latestLandedProgress: strongerLatestLandedProgress
            || sanitizeProjectStateObservationText(normalizedProjectState.latestLandedProgress, 320)
            || null,
          primaryOpenLoop: strongerPrimaryOpenLoop
            || sanitizeProjectStateObservationText(normalizedProjectState.primaryOpenLoop, 320)
            || null,
          nextClosureTarget: strongerNextClosureTarget,
          continuitySummary: strongerContinuitySummary,
          continuityRestraint,
          continuityArcStage: strongerContinuityArcStage,
          continuityPreferredTiming,
          continuityCadence,
          continuityCue: strongerContinuityCue,
          sameHerSelfLine: strongerSameHerSelfLine
            || sanitizeProjectStateObservationText(normalizedProjectState.sameHerSelfLine, 220)
            || null,
          sameHerHoldDetail: strongerSameHerHoldDetail,
          sameHerDriftRisk: strongerSameHerDriftRisk,
          proactiveSameHerGap,
          emotionalClosureCue: strongerEmotionalClosureCue,
          preDialogueAwareness: null,
          preDialogueClosure: null,
          nonHumanAuthoredStatus: sanitizeProjectStateObservationText(structured?.nonHumanAuthoredStatus, 160)
            || nonHumanAuthoredStatusFallback,
          turnId: record.turnId?.trim() || '',
          sessionId: record.sessionId,
          origin: record.origin === 'subconscious-proactive' ? 'subconscious-proactive' : 'user-turn',
        },
        preDialogueClosureSnapshot: normalizedPreDialogueClosure
          ? {
              status: normalizedPreDialogueClosure.status as 'grounded' | 'partial' | 'drift',
              summaryLine: normalizedPreDialogueClosure.summaryLine,
              emotionalClosureCue: normalizedPreDialogueClosure.emotionalClosureCue ?? null,
              companionHeadlineLine: normalizedPreDialogueClosure.companionHeadlineLine ?? null,
              companionBriefingLine: normalizedPreDialogueClosure.companionBriefingLine ?? null,
              companionNextClosureLine: normalizedPreDialogueClosure.companionNextClosureLine,
              ...(normalizedPreDialogueClosure.sameHerDriftRiskLine
                ? { sameHerDriftRiskLine: normalizedPreDialogueClosure.sameHerDriftRiskLine }
                : {}),
              briefingLines: [],
              reasons: [...normalizedPreDialogueClosure.reasons],
            }
          : null,
        preDialogueAwarenessSnapshot: null,
        continuitySummary: strongerContinuitySummary,
      })
    : null

  return {
    turnId: record.turnId?.trim() || '',
    sessionId: record.sessionId,
    origin: record.origin === 'subconscious-proactive' ? 'subconscious-proactive' : 'user-turn',
    nonHumanAuthoredStatus: sanitizeProjectStateObservationText(structured?.nonHumanAuthoredStatus, 160)
      || nonHumanAuthoredStatusFallback,
    preDialogueAwareness: normalizedPreDialogueAwareness
      ? {
          status: normalizedPreDialogueAwareness?.status ?? 'partial',
          summaryLine,
          companionHeadlineLine: strongerCompanionHeadlineLine,
          companionBriefingLine: shouldPreferRicherProjectAwareBriefingLine
            ? richerProjectAwareBriefingLine
            : shouldPreferRicherSameHerBriefingLine
              ? richerSameHerBriefingLine
              : normalizedCompanionBriefingLine,
          companionNextClosureLine: strongerNextClosureTarget,
          awarenessLine,
          emotionalClosureCue: strongerEmotionalClosureCue,
          reasonPreview: [
            ...(normalizedPreDialogueAwareness?.reasonPreview
              .map(reason => sanitizeProjectStateObservationText(reason, 320))
              .filter((reason): reason is string => Boolean(reason))
              ?? []),
            ...(strongerContinuitySummary
              ? [strongerContinuitySummary, ...projectStateReasonPreviewCarry]
              : projectStateReasonPreviewCarry),
          ].filter((reason, index, reasons) => reasons.indexOf(reason) === index),
        }
      : synthesizedPreDialogueAwareness
        ? {
            status: synthesizedPreDialogueAwareness.status,
            summaryLine: synthesizedPreDialogueAwareness.summaryLine,
            companionHeadlineLine: synthesizedPreDialogueAwareness.companionHeadlineLine ?? null,
            companionBriefingLine: synthesizedPreDialogueAwareness.companionBriefingLine ?? null,
            companionNextClosureLine: synthesizedPreDialogueAwareness.companionNextClosureLine ?? null,
            awarenessLine: synthesizedPreDialogueAwareness.awarenessLine ?? null,
            emotionalClosureCue: synthesizedPreDialogueAwareness.emotionalClosureCue ?? null,
            reasonPreview: [...synthesizedPreDialogueAwareness.reasonPreview],
          }
        : null,
    preDialogueClosure: normalizedPreDialogueClosure,
    projectState: {
      identity,
      currentPhase: strongerCurrentPhase,
      latestLandedProgress: strongerLatestLandedProgress
        || sanitizeProjectStateObservationText(normalizedProjectState.latestLandedProgress, 320)
        || null,
      primaryOpenLoop: strongerPrimaryOpenLoop
        || sanitizeProjectStateObservationText(normalizedProjectState.primaryOpenLoop, 320)
        || null,
      nextClosureTarget: strongerNextClosureTarget,
      continuitySummary: strongerContinuitySummary,
      ...(continuityRestraint
        ? { continuityRestraint }
        : {}),
      ...(strongerContinuityArcStage
        ? { continuityArcStage: strongerContinuityArcStage }
        : {}),
      ...(continuityPreferredTiming
        ? { continuityPreferredTiming }
        : {}),
      ...(continuityCadence
        ? { continuityCadence }
        : {}),
      ...(strongerContinuityCue
        ? { continuityCue: strongerContinuityCue }
        : {}),
      sameHerSelfLine: strongerSameHerSelfLine
        || sanitizeProjectStateObservationText(normalizedProjectState.sameHerSelfLine, 220)
        || null,
      sameHerHoldDetail: strongerSameHerHoldDetail,
      sameHerDriftRisk: strongerSameHerDriftRisk,
      proactiveSameHerGap,
    },
  }
}

export function projectStateObservationToContinuitySnapshot(
  observation: AlicizationProjectStateObservation | null | undefined,
): AlicizationProjectStateContinuitySnapshot | null {
  if (!observation)
    return null

  const latestLandedProgress = resolveObservationLatestLandedProgress(observation.projectState)
  const shouldUpgradeExistingPreDialogueAwareness = Boolean(
    observation.preDialogueAwareness
    && needsProjectStateObservationPreDialogueAwarenessUpgrade(observation.preDialogueAwareness),
  )
  const shouldRebuildPreDialogueAwareness = Boolean(
    (!observation.preDialogueAwareness
      || shouldUpgradeExistingPreDialogueAwareness)
    && (
      Boolean(observation.projectState.continuitySummary?.trim())
      || Boolean(observation.projectState.identity?.trim())
      || Boolean(observation.projectState.currentPhase?.trim())
      || Boolean(latestLandedProgress?.trim())
      || Boolean(observation.projectState.primaryOpenLoop?.trim())
      || Boolean(observation.projectState.nextClosureTarget?.trim())
      || Boolean(observation.projectState.sameHerHoldDetail?.trim())
      || Boolean(observation.projectState.continuityCue?.trim())
      || Boolean(observation.projectState.sameHerDriftRisk?.trim())
      || Boolean(observation.projectState.proactiveSameHerGap?.trim())
      || Boolean(observation.preDialogueClosure?.summaryLine?.trim())
      || Boolean(observation.preDialogueClosure?.companionHeadlineLine?.trim())
      || Boolean(observation.preDialogueClosure?.companionBriefingLine?.trim())
      || Boolean(observation.preDialogueClosure?.companionNextClosureLine?.trim())
    ),
  )
  const rebuiltPreDialogueAwareness = shouldRebuildPreDialogueAwareness
    ? buildPreDialogueSendIdentityFromSnapshots({
        projectStateContinuitySnapshot: {
          identity: observation.projectState.identity,
          currentPhase: observation.projectState.currentPhase,
          latestLandedProgress,
          primaryOpenLoop: observation.projectState.primaryOpenLoop,
          nextClosureTarget: observation.projectState.nextClosureTarget,
          continuitySummary: observation.projectState.continuitySummary ?? null,
          continuityRestraint: observation.projectState.continuityRestraint ?? null,
          continuityArcStage: observation.projectState.continuityArcStage ?? null,
          continuityPreferredTiming: observation.projectState.continuityPreferredTiming ?? null,
          continuityCadence: observation.projectState.continuityCadence ?? null,
          continuityCue: observation.projectState.continuityCue ?? null,
          sameHerSelfLine: observation.projectState.sameHerSelfLine ?? null,
          sameHerHoldDetail: observation.projectState.sameHerHoldDetail ?? null,
          sameHerDriftRisk: observation.projectState.sameHerDriftRisk ?? null,
          proactiveSameHerGap: observation.projectState.proactiveSameHerGap ?? null,
          emotionalClosureCue:
            observation.preDialogueAwareness?.emotionalClosureCue
            ?? observation.preDialogueClosure?.emotionalClosureCue
            ?? null,
          preDialogueAwareness: null,
          preDialogueClosure: observation.preDialogueClosure
            ? {
                status: observation.preDialogueClosure.status as 'grounded' | 'partial' | 'drift',
                summaryLine: observation.preDialogueClosure.summaryLine,
                emotionalClosureCue: observation.preDialogueClosure.emotionalClosureCue ?? null,
                companionHeadlineLine: observation.preDialogueClosure.companionHeadlineLine ?? null,
                companionBriefingLine: observation.preDialogueClosure.companionBriefingLine ?? null,
                companionNextClosureLine: observation.preDialogueClosure.companionNextClosureLine,
                ...(observation.preDialogueClosure.sameHerDriftRiskLine
                  ? { sameHerDriftRiskLine: observation.preDialogueClosure.sameHerDriftRiskLine }
                  : {}),
                briefingLines: [],
                reasons: [...observation.preDialogueClosure.reasons],
              }
            : null,
          nonHumanAuthoredStatus: observation.nonHumanAuthoredStatus,
          turnId: observation.turnId,
          sessionId: observation.sessionId,
          origin: observation.origin,
        },
        preDialogueClosureSnapshot: observation.preDialogueClosure
          ? {
              status: observation.preDialogueClosure.status as 'grounded' | 'partial' | 'drift',
              summaryLine: observation.preDialogueClosure.summaryLine,
              emotionalClosureCue: observation.preDialogueClosure.emotionalClosureCue ?? null,
              companionHeadlineLine: observation.preDialogueClosure.companionHeadlineLine ?? null,
              companionBriefingLine: observation.preDialogueClosure.companionBriefingLine ?? null,
              companionNextClosureLine: observation.preDialogueClosure.companionNextClosureLine,
              ...(observation.preDialogueClosure.sameHerDriftRiskLine
                ? { sameHerDriftRiskLine: observation.preDialogueClosure.sameHerDriftRiskLine }
                : {}),
              briefingLines: [],
              reasons: [...observation.preDialogueClosure.reasons],
            }
          : null,
        preDialogueAwarenessSnapshot: observation.preDialogueAwareness
          ? {
              status: observation.preDialogueAwareness.status,
              summaryLine: observation.preDialogueAwareness.summaryLine ?? null,
              companionHeadlineLine: observation.preDialogueAwareness.companionHeadlineLine ?? null,
              companionBriefingLine: observation.preDialogueAwareness.companionBriefingLine ?? null,
              companionNextClosureLine: observation.preDialogueAwareness.companionNextClosureLine ?? null,
              awarenessLine: observation.preDialogueAwareness.awarenessLine ?? null,
              emotionalClosureCue: observation.preDialogueAwareness.emotionalClosureCue ?? null,
              reasonPreview: [...observation.preDialogueAwareness.reasonPreview],
            }
          : null,
        continuitySummary: observation.projectState.continuitySummary ?? null,
      })
    : null
  const effectivePreDialogueAwareness = observation.preDialogueAwareness
    && !shouldUpgradeExistingPreDialogueAwareness
    ? observation.preDialogueAwareness
    : (rebuiltPreDialogueAwareness
        ? {
            status: rebuiltPreDialogueAwareness.status,
            summaryLine: shouldUpgradeExistingPreDialogueAwareness
              && looksLikeThinContinuityReminder(rebuiltPreDialogueAwareness.summaryLine)
              && observation.projectState.continuitySummary?.trim()
              ? observation.projectState.continuitySummary
              : rebuiltPreDialogueAwareness.summaryLine,
            companionHeadlineLine: rebuiltPreDialogueAwareness.companionHeadlineLine ?? null,
            companionBriefingLine: rebuiltPreDialogueAwareness.companionBriefingLine ?? null,
            companionNextClosureLine: rebuiltPreDialogueAwareness.companionNextClosureLine ?? null,
            awarenessLine: rebuiltPreDialogueAwareness.awarenessLine ?? null,
            emotionalClosureCue: rebuiltPreDialogueAwareness.emotionalClosureCue ?? null,
            reasonPreview: [...rebuiltPreDialogueAwareness.reasonPreview],
          }
        : null)

  return {
    identity: observation.projectState.identity,
    currentPhase: observation.projectState.currentPhase,
    latestLandedProgress,
    primaryOpenLoop: observation.projectState.primaryOpenLoop,
    nextClosureTarget: observation.projectState.nextClosureTarget,
    continuitySummary: observation.projectState.continuitySummary ?? null,
    ...(observation.projectState.continuityRestraint?.trim()
      ? { continuityRestraint: observation.projectState.continuityRestraint.trim() }
      : {}),
    ...(observation.projectState.continuityArcStage?.trim()
      ? { continuityArcStage: observation.projectState.continuityArcStage.trim() }
      : {}),
    ...(observation.projectState.continuityPreferredTiming?.trim()
      ? { continuityPreferredTiming: observation.projectState.continuityPreferredTiming.trim() }
      : {}),
    ...(observation.projectState.continuityCadence?.trim()
      ? { continuityCadence: observation.projectState.continuityCadence.trim() }
      : {}),
    ...(observation.projectState.continuityCue?.trim()
      ? { continuityCue: observation.projectState.continuityCue.trim() }
      : {}),
    sameHerSelfLine: observation.projectState.sameHerSelfLine ?? null,
    sameHerHoldDetail: observation.projectState.sameHerHoldDetail ?? null,
    sameHerDriftRisk: observation.projectState.sameHerDriftRisk ?? null,
    proactiveSameHerGap: observation.projectState.proactiveSameHerGap ?? null,
    emotionalClosureCue:
      effectivePreDialogueAwareness?.emotionalClosureCue
      ?? observation.preDialogueClosure?.emotionalClosureCue
      ?? null,
    preDialogueAwareness: effectivePreDialogueAwareness
      ? {
          status: effectivePreDialogueAwareness.status,
          summaryLine: effectivePreDialogueAwareness.summaryLine ?? null,
          companionHeadlineLine: effectivePreDialogueAwareness.companionHeadlineLine ?? null,
          companionBriefingLine: effectivePreDialogueAwareness.companionBriefingLine ?? null,
          companionNextClosureLine: effectivePreDialogueAwareness.companionNextClosureLine ?? null,
          awarenessLine: effectivePreDialogueAwareness.awarenessLine ?? null,
          emotionalClosureCue: effectivePreDialogueAwareness.emotionalClosureCue ?? null,
          reasonPreview: [...effectivePreDialogueAwareness.reasonPreview],
        }
      : null,
    preDialogueClosure: observation.preDialogueClosure
      ? {
          status: observation.preDialogueClosure.status,
          summaryLine: observation.preDialogueClosure.summaryLine,
          emotionalClosureCue: observation.preDialogueClosure.emotionalClosureCue ?? null,
          companionHeadlineLine: observation.preDialogueClosure.companionHeadlineLine ?? null,
          ...(observation.preDialogueClosure.sameHerDriftRiskLine
            ? { sameHerDriftRiskLine: observation.preDialogueClosure.sameHerDriftRiskLine }
            : {}),
          companionBriefingLine: observation.preDialogueClosure.companionBriefingLine ?? null,
          companionNextClosureLine: observation.preDialogueClosure.companionNextClosureLine,
          briefingLines: [],
          reasons: [...observation.preDialogueClosure.reasons],
        }
      : null,
    nonHumanAuthoredStatus: observation.nonHumanAuthoredStatus,
    turnId: observation.turnId,
    sessionId: observation.sessionId,
    origin: observation.origin,
  }
}
