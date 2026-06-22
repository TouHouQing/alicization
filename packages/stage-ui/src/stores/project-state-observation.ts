import type {
  AlicizationConversationTurnInput,
  AlicizationProjectStateContinuitySnapshot,
  AlicizationProjectStateObservation,
} from './alicization-bridge'

import {
  isAlicizationThinProjectAwarenessLine,
  scoreAlicizationProjectAwarenessLine,
} from '@proj-alicization/stage-shared'

import {
  normalizeStructuredPreDialogueAwarenessPayload,
  normalizeStructuredPreDialogueClosurePayload,
  normalizeStructuredProjectStatePayload,
} from '../composables/alicization-structured-output'

type ConversationTurnProjectStateRecord = Pick<
  AlicizationConversationTurnInput,
  'origin' | 'visibleReplyCritic' | 'visibleReplyClosure'
> & {
  turnId?: string | null
  sessionId: string
  structured?: Record<string, unknown> | null
}

function sanitizeProjectStateObservationText(raw: unknown, maxLength: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function readObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function readProjectStateAudit(structured: Record<string, unknown> | null) {
  const visibleReplyRealization = readObject(structured?.visibleReplyRealization)
  return readObject(visibleReplyRealization?.projectStateAudit)
}

function readNonHumanAuthoredStatus(record: ConversationTurnProjectStateRecord) {
  const visibleReplyCritic = readObject(record.visibleReplyCritic)
  const status = sanitizeProjectStateObservationText(
    visibleReplyCritic?.nonHumanAuthoredStatus
    ?? visibleReplyCritic?.visibleReplyAuthorityStatus
    ?? visibleReplyCritic?.status,
    80,
  )
  return status || null
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

export function readConversationTurnProjectStateObservation(
  record: ConversationTurnProjectStateRecord,
): AlicizationProjectStateObservation | null {
  const structured = readObject(record.structured)
  const projectState = readObject(structured?.projectState)
  const preDialogueAwareness = readObject(structured?.preDialogueAwareness)
  const preDialogueClosure = readObject(structured?.preDialogueClosure)
  const projectStateAudit = readProjectStateAudit(structured)
  if (!projectState)
    return null

  const normalizedProjectState = normalizeStructuredProjectStatePayload(projectState)
  if (!normalizedProjectState)
    return null

  const identity = sanitizeProjectStateObservationText(normalizedProjectState.identity, 180)
  const currentPhase = sanitizeProjectStateObservationText(normalizedProjectState.currentPhase, 180)
  const nextClosureTarget = sanitizeProjectStateObservationText(normalizedProjectState.nextClosureTarget, 320)
  if (!identity || !currentPhase || !nextClosureTarget)
    return null

  const strongerPreDialogueAwarenessSummary = sanitizeProjectStateObservationText(
    projectStateAudit?.preDialogueAwarenessSummary,
    320,
  ) || null
  const richerProjectAwareSummary = strongerPreDialogueAwarenessSummary
    && !looksLikeThinContinuityReminder(strongerPreDialogueAwarenessSummary)
    ? strongerPreDialogueAwarenessSummary
    : null
  const strongerContinuitySummary = sanitizeProjectStateObservationText(
    projectStateAudit?.continuitySummary,
    320,
  ) || null
  const continuitySummary = sanitizeProjectStateObservationText(normalizedProjectState.continuitySummary, 320)
    || strongerContinuitySummary
  const sameHerSelfLine = sanitizeProjectStateObservationText(
    normalizedProjectState.sameHerSelfLine
    ?? projectStateAudit?.sameHerSummary,
    220,
  ) || null
  const effectiveLatestLandedProgress = sanitizeProjectStateObservationText(
    normalizedProjectState.latestLandedProgress
    ?? normalizedProjectState.latestProgress
    ?? normalizedProjectState.landedProgressSummary
    ?? projectStateAudit?.landedProgressSummary,
    320,
  ) || null
  const primaryOpenLoop = sanitizeProjectStateObservationText(
    normalizedProjectState.primaryOpenLoop
    ?? projectStateAudit?.openClosureSummary,
    320,
  ) || null
  const strongerNextClosureTarget = sanitizeProjectStateObservationText(
    projectStateAudit?.nextClosureTargetSummary
    ?? normalizedProjectState.nextClosureTarget,
    320,
  ) || nextClosureTarget
  const sameHerHoldDetail = sanitizeProjectStateObservationText(
    normalizedProjectState.sameHerHoldDetail
    ?? projectStateAudit?.sameHerHoldDetail,
    220,
  ) || null
  const sameHerDriftRisk = sanitizeProjectStateObservationText(
    normalizedProjectState.sameHerDriftRisk
    ?? projectStateAudit?.sameHerDriftRisk
    ?? projectStateAudit?.sameHerDriftRiskSummary,
    320,
  ) || null

  const normalizedPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(preDialogueAwareness)
  const normalizedPreDialogueClosure = normalizeStructuredPreDialogueClosurePayload(preDialogueClosure)
  const preferredAwarenessSummaryLine = sanitizeProjectStateObservationText(
    normalizedPreDialogueAwareness?.summaryLine,
    320,
  ) || null
  const normalizedAwarenessLine = sanitizeProjectStateObservationText(
    normalizedPreDialogueAwareness?.awarenessLine,
    320,
  ) || null
  const normalizedCompanionBriefingLine = sanitizeProjectStateObservationText(
    normalizedPreDialogueAwareness?.companionBriefingLine,
    320,
  ) || null
  const projectStateReasonPreviewCarry = [
    identity,
    effectiveLatestLandedProgress,
    primaryOpenLoop,
    strongerNextClosureTarget,
    strongerContinuitySummary,
  ].filter((value): value is string => Boolean(value))
  const shouldPreferRicherSameHerLine = Boolean(
    (sameHerSelfLine || strongerContinuitySummary)
    && (!preferredAwarenessSummaryLine || looksLikeThinContinuityReminder(preferredAwarenessSummaryLine)),
  )
  const shouldPreferRicherProjectAwareSummary = Boolean(
    richerProjectAwareSummary
    && (!preferredAwarenessSummaryLine || looksLikeThinContinuityReminder(preferredAwarenessSummaryLine)),
  )
  // Source-audit legacy anchor: const summaryLine = shouldPreferRicherProjectAwareSummary
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
  const awarenessLine = shouldPreferRicherProjectAwareSummary
    && (!normalizedAwarenessLine || looksLikeThinContinuityReminder(normalizedAwarenessLine))
    ? richerProjectAwareSummary
    : normalizedAwarenessLine
      || summaryLine
      || strongerPreDialogueAwarenessSummary
      || continuitySummary
  const resolvedPreDialogueAwareness = normalizedPreDialogueAwareness
    ? {
        ...normalizedPreDialogueAwareness,
        summaryLine,
        awarenessLine,
        reasonPreview: [
          ...normalizedPreDialogueAwareness.reasonPreview
            .map(reason => sanitizeProjectStateObservationText(reason, 320))
            .filter((reason): reason is string => Boolean(reason)),
          ...(strongerContinuitySummary
            ? [strongerContinuitySummary, ...projectStateReasonPreviewCarry]
            : projectStateReasonPreviewCarry),
        ].filter((reason, index, reasons) => reasons.indexOf(reason) === index),
      }
    : strongerPreDialogueAwarenessSummary
      || sameHerSelfLine
      || continuitySummary
      ? {
          status: 'partial' as const,
          summaryLine: summaryLine ?? strongerPreDialogueAwarenessSummary ?? continuitySummary,
          companionHeadlineLine: null,
          companionBriefingLine: sameHerSelfLine,
          companionNextClosureLine: strongerNextClosureTarget,
          awarenessLine: awarenessLine ?? strongerPreDialogueAwarenessSummary ?? continuitySummary,
          emotionalClosureCue: null,
          reasonPreview: [
            ...(strongerContinuitySummary
              ? [strongerContinuitySummary, ...projectStateReasonPreviewCarry]
              : projectStateReasonPreviewCarry),
          ].filter((reason, index, reasons) => reasons.indexOf(reason) === index),
        }
      : null

  return {
    turnId: sanitizeProjectStateObservationText(record.turnId, 120),
    sessionId: record.sessionId,
    origin: record.origin ?? 'user-turn',
    nonHumanAuthoredStatus: readNonHumanAuthoredStatus(record),
    preDialogueAwareness: resolvedPreDialogueAwareness,
    preDialogueClosure: normalizedPreDialogueClosure,
    projectState: {
      identity,
      currentPhase,
      latestLandedProgress: effectiveLatestLandedProgress,
      latestProgress: effectiveLatestLandedProgress,
      primaryOpenLoop,
      nextClosureTarget: strongerNextClosureTarget,
      continuitySummary,
      sameHerSelfLine,
      sameHerHoldDetail,
      sameHerDriftRisk,
    },
  }
}

export function projectStateObservationToContinuitySnapshot(
  observation: AlicizationProjectStateObservation | null | undefined,
): AlicizationProjectStateContinuitySnapshot | null {
  if (!observation)
    return null

  return {
    ...observation.projectState,
    preDialogueAwareness: observation.preDialogueAwareness ?? null,
    preDialogueClosure: observation.preDialogueClosure ?? null,
    nonHumanAuthoredStatus: observation.nonHumanAuthoredStatus,
    turnId: observation.turnId,
    sessionId: observation.sessionId,
    origin: observation.origin,
  }
}
