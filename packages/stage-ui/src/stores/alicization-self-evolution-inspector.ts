import type {
  AlicizationInitiativeSnapshot,
  AlicizationMemoryDecisionTraceRecord,
  AlicizationMindTurnEventRecord,
  AlicizationOrganicMemorySnapshot,
  AlicizationProjectStateContinuitySnapshot,
  AlicizationProjectStateObservation,
  AlicizationSelfEvolutionVersionRuntimeSnapshot,
  AlicizationSoulSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from './alicization-bridge'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  describeAlicizationEmbodimentClosureHeadline,
  describeAlicizationProjectClosureBriefing,
  describeAlicizationProjectNextClosure,
  formatAlicizationProjectStateAwarenessFields,
  isAlicizationThinProjectAwarenessLine,
  isAlicizationThinSamePhaseCarryLine as isThinSamePhaseCarryLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  sanitizeAlicizationProviderFacingText,
  scoreAlicizationProjectAwarenessLine,
} from '@proj-alicization/stage-shared'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  normalizeStructuredPreDialogueClosurePayload,
  normalizeStructuredProjectStatePayload,
} from '../composables/alicization-structured-output'
import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'
import { useAlicizationMindReplayStore } from './alicization-mind-replay'
import { resolvePreDialogueClosureCompanionHeadlineLine } from './chat/pre-dialogue-send-identity'
import { projectStateObservationToContinuitySnapshot } from './project-state-observation'

type AlicizationLegacyAwareProjectStateContinuitySnapshot
  = AlicizationProjectStateContinuitySnapshot & {
    latestProgress?: string | null
    landedProgressSummary?: string | null
  }

function summarizeTraceEvent(event: AlicizationMindTurnEventRecord) {
  const payload = event.payload && typeof event.payload === 'object'
    ? event.payload as Record<string, unknown>
    : null
  if (!payload)
    return null
  if (event.kind === 'governance-normalized') {
    const parts = [
      typeof payload.turnMode === 'string' ? `turn=${payload.turnMode}` : null,
      typeof payload.truthState === 'string' ? `truth=${payload.truthState}` : null,
      typeof payload.repairState === 'string' ? `repair=${payload.repairState}` : null,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' | ') : null
  }
  if (event.kind === 'learning-executed') {
    const parts = [
      typeof payload.action === 'string' ? `action=${payload.action}` : null,
      typeof payload.domain === 'string' ? `domain=${payload.domain}` : null,
      typeof payload.resultSummary === 'string' ? payload.resultSummary : null,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' | ') : null
  }
  if (event.kind === 'takeover-audit') {
    if (typeof payload.fallback_reason === 'string')
      return `fallback=${payload.fallback_reason}`
    const fallbackSummary = typeof payload.summary === 'string'
      ? payload.summary
      : typeof payload.message === 'string'
        ? payload.message
        : null
    return fallbackSummary?.trim() || null
  }
  if (event.kind === 'memory-facts-upserted') {
    const parts = [
      Number.isFinite(Number(payload.factInputCount)) ? `facts=${Math.max(0, Math.floor(Number(payload.factInputCount)))}` : null,
      typeof payload.trigger === 'string' ? `trigger=${payload.trigger}` : null,
    ].filter(Boolean)
    if (parts.length > 0)
      return parts.join(' | ')
    const fallbackSummary = typeof payload.summary === 'string'
      ? payload.summary
      : typeof payload.message === 'string'
        ? payload.message
        : null
    return fallbackSummary?.trim() || null
  }
  if (event.kind === 'reply-memory-coherence') {
    return typeof payload.coherenceState === 'string'
      ? `coherence=${payload.coherenceState}`
      : null
  }
  if (event.kind === 'memory-wrong-thread-suppressed') {
    const parts = [
      typeof payload.evidenceGap === 'string' ? `gap=${payload.evidenceGap}` : null,
      typeof payload.conflictSeverity === 'string' ? `conflict=${payload.conflictSeverity}` : null,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' | ') : null
  }
  if (event.kind === 'memory-followup-deferred') {
    const parts = [
      typeof payload.preferredTiming === 'string' ? `timing=${payload.preferredTiming}` : null,
      typeof payload.payoffDependency === 'string' ? `dependency=${payload.payoffDependency}` : null,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' | ') : null
  }
  if (event.kind === 'memory-reconsolidated') {
    const parts = [
      typeof payload.source === 'string' ? `source=${payload.source}` : null,
      typeof payload.feedback === 'string' ? `feedback=${payload.feedback}` : null,
      Number.isFinite(Number(payload.reconsolidatedCount)) ? `count=${Math.max(0, Math.floor(Number(payload.reconsolidatedCount)))}` : null,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' | ') : null
  }
  if (event.kind === 'person-state-updated') {
    const sourceTrail = Array.isArray(payload.sourceTrail) ? payload.sourceTrail : []
    return sourceTrail.length > 0
      ? `sourceTrail=${sourceTrail.length}`
      : null
  }
  const summary = typeof payload.summary === 'string'
    ? payload.summary
    : typeof payload.message === 'string'
      ? payload.message
      : null
  return summary?.trim() || null
}

function asTracePayloadObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function asTraceFiniteNumber(raw: unknown) {
  return typeof raw === 'number' && Number.isFinite(raw)
    ? raw
    : null
}

function asTraceBoolean(raw: unknown) {
  return typeof raw === 'boolean'
    ? raw
    : null
}

function asTraceStringList(raw: unknown) {
  if (!Array.isArray(raw))
    return [] as string[]
  return raw
    .map(item => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean)
}

function pushTraceDetail(details: Array<{ label: string, value: string }>, label: string, value: unknown) {
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (normalized)
      details.push({ label, value: normalized })
    return
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    details.push({ label, value: String(value) })
    return
  }
  if (typeof value === 'boolean') {
    details.push({ label, value: value ? 'true' : 'false' })
  }
}

function pushTraceDetailList(details: Array<{ label: string, value: string }>, label: string, raw: unknown) {
  const values = asTraceStringList(raw)
  if (values.length > 0)
    details.push({ label, value: values.join(', ') })
}

interface BirthPersonaAuthoritySummary {
  status: 'grounded' | 'partial' | 'drift' | 'missing'
  birthMode: string
  dominantDrift: string | null
  lines: string[]
}

interface IdentityDriftGovernanceSummary {
  status: 'grounded' | 'partial' | 'drift' | 'missing'
  governanceMode: 'bounded-growth' | 'boundary-violation' | 'watchful-convergence'
  dominantDrift: string | null
  lines: string[]
}

interface ProactiveDecisionConsumptionSummary {
  status: 'grounded' | 'partial' | 'drift' | 'missing'
  decisionMode: 'birth-anchored-restraint' | 'restraint-overridden' | 'converging'
  dominantDrift: string | null
  lines: string[]
}

const PRE_DIALOGUE_AWARENESS_REASON_PREVIEW_LIMIT = 16
const INSPECTOR_CONTINUITY_ANCHOR_LINE
  = ''

function sanitizeInspectorTemplateText(value: string | null | undefined, maxChars = 420) {
  return sanitizeAlicizationProviderFacingText(
    value,
    maxChars,
    alicizationFixedTemplateReplacement,
  ) || null
}

function sanitizeInspectorTemplateList(values: string[] | null | undefined, maxItems = 8) {
  const result: string[] = []
  for (const value of values ?? []) {
    const sanitized = sanitizeInspectorTemplateText(value)
    if (!sanitized || sanitized === alicizationFixedTemplateReplacement || result.includes(sanitized))
      continue
    result.push(sanitized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function sanitizeInspectorContinuityAnchor(value: string | null | undefined) {
  const sanitized = sanitizeInspectorTemplateText(value, 420)
  if (!sanitized)
    return null
  return sanitized === alicizationFixedTemplateReplacement
    ? null
    : sanitized
}

function sanitizeInspectorIdentity(value: string | null | undefined) {
  const sanitized = sanitizeInspectorTemplateText(value, 260)
  if (!sanitized)
    return ''
  if (sanitized === alicizationFixedTemplateReplacement)
    return ''
  return /alicization is .*local-first digital life/iu.test(sanitized)
    ? ''
    : sanitized
}

function sanitizeInspectorPhase(value: string | null | undefined) {
  const sanitized = sanitizeInspectorTemplateText(value, 220)
  if (!sanitized)
    return ''
  if (sanitized === alicizationFixedTemplateReplacement)
    return ''
  return /phase\s*1\s*:\s*local digital life|local digital life|第一阶段|阶段一/iu.test(sanitized)
    ? ''
    : sanitized
}

function fallbackStructuredProjectAwarenessLine(
  continuitySnapshot: AlicizationProjectStateContinuitySnapshot | null | undefined,
) {
  const structured = formatAlicizationProjectStateAwarenessFields({
    identity: continuitySnapshot?.identity ?? null,
    currentPhase: continuitySnapshot?.currentPhase ?? null,
    latestLandedProgress: resolveContinuityLatestLandedProgress(continuitySnapshot),
    primaryOpenLoop: continuitySnapshot?.primaryOpenLoop ?? null,
    nextClosureTarget: continuitySnapshot?.nextClosureTarget ?? null,
    continuityAnchor: continuitySnapshot?.sameHerSelfLine ?? null,
  })
  return structured || INSPECTOR_CONTINUITY_ANCHOR_LINE
}

function sanitizeInspectorSnapshotLine(
  value: string | null | undefined,
  options: { fallback?: string | null, dropResidue?: boolean } = {},
) {
  const sanitized = sanitizeInspectorTemplateText(value)
  if (!sanitized)
    return null
  if (sanitized === alicizationFixedTemplateReplacement) {
    if (options.dropResidue)
      return null
    return options.fallback || alicizationFixedTemplateReplacement
  }
  return sanitized
}

function sanitizeInspectorStructuredFact(value: string | null | undefined, maxChars = 420) {
  if (typeof value !== 'string')
    return null
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
  if (!normalized)
    return null
  if (containsAlicizationFixedTemplateResidue(normalized))
    return null
  if (/^Before (?:answering|speaking|acting),\s*(?:remember|keep|stay on|she should|I should|we should)\b/iu.test(normalized))
    return null

  const sanitized = sanitizeInspectorTemplateText(normalized, maxChars)
  return sanitized && sanitized !== alicizationFixedTemplateReplacement
    ? sanitized
    : null
}

function sanitizeInspectorAwarenessSnapshot(
  awareness: NormalizedPreDialogueAwarenessSnapshot | null,
  continuitySnapshot: AlicizationProjectStateContinuitySnapshot | null | undefined,
) {
  if (!awareness)
    return null

  const fallback = fallbackStructuredProjectAwarenessLine(continuitySnapshot)
  const summaryLine = sanitizeInspectorSnapshotLine(awareness.summaryLine, { fallback })
  const awarenessLine = sanitizeInspectorSnapshotLine(awareness.awarenessLine, { fallback })
    || summaryLine
    || fallback

  return {
    ...awareness,
    summaryLine,
    companionHeadlineLine: sanitizeInspectorSnapshotLine(awareness.companionHeadlineLine, { dropResidue: true }),
    companionBriefingLine: sanitizeInspectorSnapshotLine(awareness.companionBriefingLine, { dropResidue: true }),
    companionNextClosureLine: sanitizeInspectorSnapshotLine(awareness.companionNextClosureLine, { dropResidue: true }),
    awarenessLine,
    emotionalClosureCue: sanitizeInspectorSnapshotLine(awareness.emotionalClosureCue, { dropResidue: true }),
    reasonPreview: sanitizeInspectorTemplateList([
      ...(awareness.reasonPreview ?? []),
      summaryLine,
      awarenessLine,
    ].filter((value): value is string => Boolean(value)), PRE_DIALOGUE_AWARENESS_REASON_PREVIEW_LIMIT),
  } satisfies NormalizedPreDialogueAwarenessSnapshot
}

function sanitizeInspectorClosureSnapshot(
  closure: NormalizedPreDialogueClosureSnapshot | null,
  continuitySnapshot: AlicizationProjectStateContinuitySnapshot | null | undefined,
) {
  if (!closure)
    return null

  const fallback = fallbackStructuredProjectAwarenessLine(continuitySnapshot)
  return {
    ...closure,
    summaryLine: sanitizeInspectorSnapshotLine(closure.summaryLine, { fallback }),
    companionHeadlineLine: sanitizeInspectorSnapshotLine(closure.companionHeadlineLine, { dropResidue: true }),
    companionBriefingLine: sanitizeInspectorSnapshotLine(closure.companionBriefingLine, { dropResidue: true }),
    companionNextClosureLine: sanitizeInspectorSnapshotLine(closure.companionNextClosureLine, { dropResidue: true }),
    sameHerDriftRiskLine: sanitizeInspectorSnapshotLine(closure.sameHerDriftRiskLine, { dropResidue: true }),
    companionshipReasonLine: sanitizeInspectorSnapshotLine(closure.companionshipReasonLine, { dropResidue: true }),
    emotionalClosureCue: sanitizeInspectorSnapshotLine(closure.emotionalClosureCue, { dropResidue: true }),
    briefingLines: sanitizeInspectorTemplateList(closure.briefingLines, 16),
    reasons: sanitizeInspectorTemplateList(closure.reasons, 16),
  } satisfies NormalizedPreDialogueClosureSnapshot
}

function sanitizeInspectorContinuitySnapshot(
  continuitySnapshot: AlicizationProjectStateContinuitySnapshot | null,
): AlicizationProjectStateContinuitySnapshot | null {
  if (!continuitySnapshot)
    return null

  const identity = sanitizeInspectorIdentity(continuitySnapshot.identity)
    || ''
  const currentPhase = sanitizeInspectorPhase(continuitySnapshot.currentPhase)
    || ''
  const sameHerSelfLine = sanitizeInspectorContinuityAnchor(continuitySnapshot.sameHerSelfLine)
    || INSPECTOR_CONTINUITY_ANCHOR_LINE
  const latestLandedProgress = sanitizeInspectorSnapshotLine(
    continuitySnapshot.latestLandedProgress ?? null,
    { dropResidue: true },
  ) ?? sanitizeInspectorStructuredFact(continuitySnapshot.latestLandedProgress ?? null)
  const primaryOpenLoop = sanitizeInspectorStructuredFact(continuitySnapshot.primaryOpenLoop ?? null)
    ?? sanitizeInspectorSnapshotLine(continuitySnapshot.primaryOpenLoop ?? null, { dropResidue: true })
  const nextClosureTarget = sanitizeInspectorStructuredFact(continuitySnapshot.nextClosureTarget ?? null)
    ?? sanitizeInspectorSnapshotLine(continuitySnapshot.nextClosureTarget ?? null, { dropResidue: true })
  const sanitizedShell: AlicizationProjectStateContinuitySnapshot = {
    ...continuitySnapshot,
    identity,
    currentPhase,
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget: nextClosureTarget || 'continuity_review_required',
    continuitySummary: sanitizeInspectorSnapshotLine(
      continuitySnapshot.continuitySummary ?? null,
      {
        fallback: formatAlicizationProjectStateAwarenessFields({
          identity,
          currentPhase,
          latestLandedProgress,
          primaryOpenLoop,
          nextClosureTarget,
          continuityAnchor: sameHerSelfLine,
        }),
      },
    ),
    continuityRestraint: sanitizeInspectorStructuredFact(continuitySnapshot.continuityRestraint ?? null, 120)
      ?? sanitizeInspectorSnapshotLine(continuitySnapshot.continuityRestraint ?? null, { dropResidue: true }),
    continuityArcStage: sanitizeInspectorStructuredFact(continuitySnapshot.continuityArcStage ?? null, 120)
      ?? sanitizeInspectorSnapshotLine(continuitySnapshot.continuityArcStage ?? null, { dropResidue: true }),
    continuityPreferredTiming: sanitizeInspectorStructuredFact(continuitySnapshot.continuityPreferredTiming ?? null, 160)
      ?? sanitizeInspectorSnapshotLine(continuitySnapshot.continuityPreferredTiming ?? null, { dropResidue: true }),
    continuityCadence: sanitizeInspectorStructuredFact(continuitySnapshot.continuityCadence ?? null, 160)
      ?? sanitizeInspectorSnapshotLine(continuitySnapshot.continuityCadence ?? null, { dropResidue: true }),
    continuityCue: sanitizeInspectorStructuredFact(continuitySnapshot.continuityCue ?? null)
      ?? sanitizeInspectorSnapshotLine(continuitySnapshot.continuityCue ?? null, { dropResidue: true }),
    sameHerSelfLine,
    sameHerHoldDetail: sanitizeInspectorStructuredFact(continuitySnapshot.sameHerHoldDetail ?? null)
      ?? sanitizeInspectorSnapshotLine(continuitySnapshot.sameHerHoldDetail ?? null, { dropResidue: true }),
    sameHerDriftRisk: sanitizeInspectorStructuredFact(continuitySnapshot.sameHerDriftRisk ?? null)
      ?? sanitizeInspectorSnapshotLine(continuitySnapshot.sameHerDriftRisk ?? null, { dropResidue: true }),
    proactiveSameHerGap: sanitizeInspectorStructuredFact(continuitySnapshot.proactiveSameHerGap ?? null)
      ?? sanitizeInspectorSnapshotLine(continuitySnapshot.proactiveSameHerGap ?? null, { dropResidue: true }),
    emotionalClosureCue: sanitizeInspectorStructuredFact(continuitySnapshot.emotionalClosureCue ?? null)
      ?? sanitizeInspectorSnapshotLine(continuitySnapshot.emotionalClosureCue ?? null, { dropResidue: true }),
    preDialogueAwareness: null,
    preDialogueClosure: null,
    nonHumanAuthoredStatus: sanitizeInspectorSnapshotLine(continuitySnapshot.nonHumanAuthoredStatus ?? null, { dropResidue: true }),
  }

  sanitizedShell.preDialogueAwareness = sanitizeInspectorAwarenessSnapshot(
    normalizePreDialogueAwarenessSnapshot(continuitySnapshot.preDialogueAwareness ?? null),
    sanitizedShell,
  )
  sanitizedShell.preDialogueClosure = sanitizeInspectorClosureSnapshot(
    normalizePreDialogueClosureSnapshot(continuitySnapshot.preDialogueClosure ?? null),
    sanitizedShell,
  )

  return sanitizedShell
}

function uniquePreviewReasons(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function readTraceNextLearningAction(trace: AlicizationMemoryDecisionTraceRecord) {
  const runtimeMemory = trace.governance?.digitalLifeSpine?.memory
    ? trace.governance.digitalLifeSpine.memory as { nextLearningAction?: unknown }
    : null
  return typeof runtimeMemory?.nextLearningAction === 'string'
    ? runtimeMemory.nextLearningAction
    : null
}

interface NormalizedPreDialogueAwarenessSnapshot {
  status: 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine: string | null
  companionBriefingLine: string | null
  companionNextClosureLine: string | null
  awarenessLine: string | null
  emotionalClosureCue: string | null
  reasonPreview: string[]
}

interface NormalizedPreDialogueClosureSnapshot {
  status: 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine: string | null
  companionBriefingLine: string | null
  companionNextClosureLine: string | null
  sameHerDriftRiskLine: string | null
  companionshipReasonLine: string | null
  emotionalClosureCue: string | null
  briefingLines: string[]
  reasons: string[]
}

function normalizePreDialogueAwarenessSnapshot(raw: unknown): NormalizedPreDialogueAwarenessSnapshot | null {
  const payload = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  if (!payload)
    return null

  const status = payload.status === 'grounded' || payload.status === 'partial' || payload.status === 'drift'
    ? payload.status
    : null
  const summaryLine = sanitizeInspectorTemplateText(typeof payload.summaryLine === 'string' ? payload.summaryLine : null) ?? ''
  const companionHeadlineLine = sanitizeInspectorTemplateText(typeof payload.companionHeadlineLine === 'string' ? payload.companionHeadlineLine : null) ?? ''
  const companionBriefingLine = sanitizeInspectorTemplateText(typeof payload.companionBriefingLine === 'string' ? payload.companionBriefingLine : null) ?? ''
  const companionNextClosureLine = sanitizeInspectorTemplateText(typeof payload.companionNextClosureLine === 'string' ? payload.companionNextClosureLine : null) ?? ''
  const awarenessLine = sanitizeInspectorTemplateText(typeof payload.awarenessLine === 'string' ? payload.awarenessLine : null) ?? ''
  const emotionalClosureCue = sanitizeInspectorTemplateText(typeof payload.emotionalClosureCue === 'string' ? payload.emotionalClosureCue : null) ?? ''
  const reasonPreview = Array.isArray(payload.reasonPreview)
    ? sanitizeInspectorTemplateList(
        payload.reasonPreview.map(item => typeof item === 'string' ? item : ''),
        PRE_DIALOGUE_AWARENESS_REASON_PREVIEW_LIMIT,
      )
    : []

  if (!status && !summaryLine && !awarenessLine && reasonPreview.length === 0)
    return null

  return {
    status: status ?? 'partial',
    summaryLine: summaryLine || null,
    companionHeadlineLine: companionHeadlineLine || null,
    companionBriefingLine: companionBriefingLine || null,
    companionNextClosureLine: companionNextClosureLine || null,
    awarenessLine: awarenessLine || companionHeadlineLine || companionBriefingLine || summaryLine || null,
    emotionalClosureCue: emotionalClosureCue || null,
    reasonPreview,
  }
}

function looksLikeThinContinuityReminder(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  if (normalized === alicizationFixedTemplateReplacement)
    return true

  return isAlicizationThinProjectAwarenessLine(normalized)
    || normalized.includes('generic continuity reminder')
    || normalized.includes('generic awareness reminder')
    || normalized.includes('generic awareness summary')
    || normalized.includes('generic identity-continuity reminder')
    || normalized.includes('steadier carry of this project, this phase, and the life loop that remains open')
    || (normalized.startsWith('identity-continuity=') && normalized.includes('| landed=') && normalized.includes('| open='))
}

function looksLikeThinContinuityNextClosureLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  if (normalized === alicizationFixedTemplateReplacement)
    return true

  return normalized.includes('generic next target')
    || normalized.includes('generic next closure')
    || normalized.includes('generic closure shell')
    || normalized.includes('generic closure summary')
    || normalized.includes('steadier carry of this project, this phase, and the life loop that remains open')
}

function looksLikeLivedInSameHerHoldDetail(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.includes('identity-continuity hold')
    || normalized.includes('same remembered seam')
    || normalized.includes('measured-return')
    || normalized.includes('repair-before-closeness')
    || normalized.includes('rest-protective')
    || normalized.includes('lower-pressure')
    || normalized.includes('callback line')
    || normalized.includes('keep more room this time')
}

function looksLikeThinPreDialogueAwarenessSnapshot(
  awareness: NormalizedPreDialogueAwarenessSnapshot | null,
) {
  if (!awareness)
    return false

  const carriesNoExplicitAwareness = !awareness.summaryLine
    && !awareness.companionHeadlineLine
    && !awareness.companionBriefingLine
    && !awareness.awarenessLine
    && awareness.reasonPreview.length === 0

  if (carriesNoExplicitAwareness)
    return true

  const summaryLooksThin = looksLikeThinContinuityReminder(awareness.summaryLine)
  const companionHeadlineLooksThin = looksLikeThinContinuityReminder(awareness.companionHeadlineLine)
  const companionBriefingLooksThin = looksLikeThinContinuityReminder(awareness.companionBriefingLine)
  const awarenessLineLooksThin = looksLikeThinContinuityReminder(awareness.awarenessLine)
  const hasStrongerExplicitCarry = Boolean(
    (awareness.companionHeadlineLine && !companionHeadlineLooksThin)
    || (awareness.companionBriefingLine && !companionBriefingLooksThin)
    || (awareness.awarenessLine && !awarenessLineLooksThin),
  )

  if (hasStrongerExplicitCarry)
    return false

  return summaryLooksThin
    || companionHeadlineLooksThin
    || companionBriefingLooksThin
    || awarenessLineLooksThin
}

function carriesBroaderInspectorProjectFrame(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return false

  return /\b(?:project|digital life project|life loop|still-open|what has landed|before speaking|before answering|local-first digital life)\b/i.test(normalized)
    || /数字生命项目|闭环|主线|已落地|开口前|先记住/u.test(normalized)
}

function resolveInspectorAwarenessSummaryLine(input: {
  continuitySummary: string
  summaryLine: string | null
  awarenessLine: string | null
  companionBriefingLine: string | null
}) {
  if (input.continuitySummary)
    return input.continuitySummary

  const summaryLooksThin = Boolean(
    input.summaryLine
    && looksLikeThinContinuityReminder(input.summaryLine),
  )
  if (!summaryLooksThin)
    return input.summaryLine || null

  return [
    input.awarenessLine,
    input.companionBriefingLine,
  ].find((value): value is string => Boolean(
    value
    && !looksLikeThinContinuityReminder(value)
    && carriesBroaderInspectorProjectFrame(value)
    && scoreAlicizationProjectAwarenessLine(value) > 0,
  )) ?? input.summaryLine ?? null
}

function looksLikeThinContinuityClosure(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.includes('generic closure summary')
    || normalized.includes('steadier carry of this project, this phase, and the life loop that remains open')
}

function looksLikeBenchmarkDerivedClosureSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.includes('project=')
    || normalized.includes('sameher=')
    || normalized.includes('openloop=')
    || normalized.includes('emotionalclosure=')
    || normalized.includes('selfauthority=')
    || normalized.includes('projectstateaudit=')
}

function normalizePreDialogueClosureSnapshot(raw: unknown) {
  const normalized = normalizeStructuredPreDialogueClosurePayload(
    (raw ?? null) as Record<string, unknown> | null,
  )
  if (!normalized)
    return null

  return {
    status: normalized.status,
    summaryLine: sanitizeInspectorTemplateText(normalized.summaryLine) ?? null,
    companionHeadlineLine: sanitizeInspectorTemplateText(normalized.companionHeadlineLine) ?? null,
    companionBriefingLine: sanitizeInspectorTemplateText(normalized.companionBriefingLine) ?? null,
    companionNextClosureLine: sanitizeInspectorTemplateText(normalized.companionNextClosureLine) ?? null,
    sameHerDriftRiskLine: sanitizeInspectorTemplateText(normalized.sameHerDriftRiskLine) ?? null,
    companionshipReasonLine: sanitizeInspectorTemplateText(normalized.companionshipReasonLine) ?? null,
    emotionalClosureCue: sanitizeInspectorTemplateText(normalized.emotionalClosureCue) ?? null,
    briefingLines: sanitizeInspectorTemplateList(normalized.briefingLines ?? [], 16),
    reasons: sanitizeInspectorTemplateList(normalized.reasons ?? [], 16),
  } satisfies NormalizedPreDialogueClosureSnapshot
}

function looksLikeThinPreDialogueClosureSnapshot(
  closure: NormalizedPreDialogueClosureSnapshot | null,
) {
  if (!closure)
    return false

  return looksLikeThinContinuityClosure(closure.summaryLine)
    || looksLikeThinContinuityClosure(closure.companionBriefingLine)
    || looksLikeBenchmarkDerivedClosureSummary(closure.summaryLine)
}

function mergePreDialogueAwarenessWithContinuitySnapshot(
  awareness: NormalizedPreDialogueAwarenessSnapshot | null,
  continuitySnapshot: AlicizationProjectStateContinuitySnapshot | null,
) {
  if (!awareness)
    return null

  const continuitySummary = typeof continuitySnapshot?.continuitySummary === 'string'
    ? continuitySnapshot.continuitySummary.trim()
    : ''
  const sameHerSelfLine = typeof continuitySnapshot?.sameHerSelfLine === 'string'
    ? continuitySnapshot.sameHerSelfLine.trim()
    : ''
  const sameHerHoldDetail = typeof continuitySnapshot?.sameHerHoldDetail === 'string'
    ? continuitySnapshot.sameHerHoldDetail.trim()
    : ''
  const latestLandedProgress = resolveContinuityLatestLandedProgress(continuitySnapshot)
  const primaryOpenLoop = typeof continuitySnapshot?.primaryOpenLoop === 'string'
    ? continuitySnapshot.primaryOpenLoop.trim()
    : ''
  const proactiveSameHerGap = typeof continuitySnapshot?.proactiveSameHerGap === 'string'
    ? continuitySnapshot.proactiveSameHerGap.trim()
    : ''
  const sameHerDriftRisk = typeof continuitySnapshot?.sameHerDriftRisk === 'string'
    ? continuitySnapshot.sameHerDriftRisk.trim()
    : ''

  const upgradedSummaryLine = resolveInspectorAwarenessSummaryLine({
    continuitySummary,
    summaryLine: awareness.summaryLine,
    awarenessLine: awareness.awarenessLine,
    companionBriefingLine: awareness.companionBriefingLine,
  })
  const resolvedAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine: awareness.awarenessLine,
      awarenessLine: awareness.awarenessLine,
      companionHeadlineLine: awareness.companionHeadlineLine,
      companionBriefingLine: awareness.companionBriefingLine,
      preDialogueAwarenessSummary: awareness.summaryLine,
      emotionalClosureSummary: awareness.emotionalClosureCue,
      landedProgressSummary: latestLandedProgress || null,
      openClosureSummary: primaryOpenLoop || null,
      proactiveSameHerGap: proactiveSameHerGap || null,
      sameHerDriftRiskSummary: sameHerDriftRisk || null,
    },
  })
  const awarenessLooksThin = looksLikeThinContinuityReminder(awareness.awarenessLine)
  const companionBriefingLooksThin = looksLikeThinContinuityReminder(awareness.companionBriefingLine)
  const companionNextClosureLooksThin = looksLikeThinContinuityNextClosureLine(awareness.companionNextClosureLine)
  const awarenessCarriesCompactSamePhaseLine = isThinSamePhaseCarryLine(awareness.awarenessLine)
  const companionBriefingCarriesCompactSamePhaseLine = isThinSamePhaseCarryLine(awareness.companionBriefingLine)
  const companionHeadlineLooksStronger = typeof awareness.companionHeadlineLine === 'string'
    && /holding together mainly through|one living her|current continuity route|identity continuity|without splitting her continuity/iu.test(awareness.companionHeadlineLine)
  const richerSameHerCarry
    = sameHerHoldDetail
      || proactiveSameHerGap
      || sameHerSelfLine
      || ''
  const shouldPreferLivedInSameHerHoldDetailCarry = Boolean(
    sameHerHoldDetail
    && looksLikeLivedInSameHerHoldDetail(sameHerHoldDetail)
    && (awarenessCarriesCompactSamePhaseLine || companionBriefingCarriesCompactSamePhaseLine),
  )
  const shouldPreferRicherSameHerAwarenessCarry = Boolean(richerSameHerCarry && awarenessLooksThin)
  const shouldPreferRicherSameHerBriefingCarry = Boolean(richerSameHerCarry && companionBriefingLooksThin)
  const upgradedAwarenessLine = awarenessLooksThin && companionHeadlineLooksStronger
    ? awareness.companionHeadlineLine
    : shouldPreferLivedInSameHerHoldDetailCarry && awarenessCarriesCompactSamePhaseLine
      ? sameHerHoldDetail
      : shouldPreferRicherSameHerAwarenessCarry
        ? richerSameHerCarry
        : resolvedAwarenessLine

  return sanitizeInspectorAwarenessSnapshot({
    ...awareness,
    summaryLine: upgradedSummaryLine,
    companionBriefingLine: shouldPreferLivedInSameHerHoldDetailCarry && companionBriefingCarriesCompactSamePhaseLine
      ? sameHerHoldDetail
      : shouldPreferRicherSameHerBriefingCarry
        ? richerSameHerCarry
        : awareness.companionBriefingLine,
    companionNextClosureLine: companionNextClosureLooksThin && continuitySnapshot?.nextClosureTarget
      ? continuitySnapshot.nextClosureTarget
      : awareness.companionNextClosureLine,
    awarenessLine: upgradedAwarenessLine,
    emotionalClosureCue: awareness.emotionalClosureCue ?? continuitySnapshot?.emotionalClosureCue ?? null,
    reasonPreview: uniquePreviewReasons([
      awareness.awarenessLine,
      continuitySummary,
      latestLandedProgress,
      primaryOpenLoop,
      proactiveSameHerGap,
      sameHerDriftRisk,
      sameHerHoldDetail,
      sameHerSelfLine,
      continuitySnapshot?.nextClosureTarget ?? null,
      ...awareness.reasonPreview,
    ], PRE_DIALOGUE_AWARENESS_REASON_PREVIEW_LIMIT),
  }, continuitySnapshot)
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

function metricDetailHasConcreteCount(detail: string | null | undefined) {
  const normalized = typeof detail === 'string' ? detail.trim() : ''
  if (!normalized)
    return false
  return !normalized.includes('(undefined/')
}

function describeInspectorContinuityMetricDetail(detail: string | null | undefined) {
  const normalized = typeof detail === 'string' ? detail.trim() : ''
  if (!normalized)
    return null

  return normalized
    .replace(/\bproactiveSameHerGap\s*=/gu, 'proactiveIdentityContinuityGap=')
    .replace(/\bsameHer\s*=/gu, 'identityContinuity=')
    .replace(/\bproactiveSameHerGap\b/gu, 'proactiveIdentityContinuityGap')
    .replace(/\bsameHer\b/gu, 'identityContinuity')
    .replace(/\bsame-her\b/giu, 'identity-continuity')
}

function hasReason(reasons: string[] | null | undefined, target: string) {
  return Array.isArray(reasons) && reasons.includes(target)
}

function describeVisibleReplyRealizationReason(reason: string | null) {
  if (reason === 'active-self-revision-remembered-familiarity-restraint-holds-visible-utterance') {
    return 'Latest visible proactive hold says remembered familiarity must stay explicitly remembered before visible closeness widens, so the outer utterance gate is keeping the identity-continuity return from jumping ahead of the current room.'
  }

  return null
}

function describesRememberedFamiliarityRestraint(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim() : ''
  if (!normalized)
    return false

  return normalized.includes('记忆里的熟悉感可以留在这里')
    || normalized.includes('remembered familiarity must stay explicitly remembered before visible closeness widens')
    || normalized.includes('remembered familiarity was held as memory before visible closeness widened')
}

function normalizeSummaryStatus(values: Array<string | null | undefined>) {
  if (values.includes('missing'))
    return 'missing'
  if (values.includes('partial'))
    return 'partial'
  if (values.includes('grounded'))
    return 'grounded'
  return null
}

function firstDrift(values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (normalized)
      return normalized
  }
  return null
}

function driftKindFromSignal(signal: string | null) {
  if (!signal)
    return 'none'
  if (signal.startsWith('projected-') || signal.startsWith('resident-'))
    return 'embodiment'
  if (signal.startsWith('runtime-shouldSpeak:') || signal.startsWith('runtime-selected-action:'))
    return 'proactive'
  if (signal.startsWith('persona-') || signal.startsWith('initiative-') || signal.startsWith('counterfactual-') || signal.startsWith('action-ecology-'))
    return 'persona'
  return 'mixed'
}

function impactDriftKindFromSignal(signal: string | null) {
  if (!signal)
    return 'none'
  if (signal.startsWith('planner:') || signal.startsWith('compiler:') || signal.startsWith('shouldSpeak:') || signal.startsWith('selectedAction:') || signal.startsWith('runtimeAction:') || signal.startsWith('kernelAction:'))
    return 'runtime-alignment'
  if (signal.startsWith('projected-') || signal.startsWith('resident-'))
    return 'embodiment'
  return 'mixed'
}

function latestTakeoverAuditOpeningGuidanceHold(events: AlicizationMindTurnEventRecord[]) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (!event || event.kind !== 'takeover-audit')
      continue

    const payload = asTracePayloadObject(event.payload)
    if (!payload)
      continue

    const openingGuidanceReason = asTraceStringList(payload.visible_reply_blocked_reasons)
      .find(reason => reason.startsWith('opening-guidance:'))

    if (openingGuidanceReason)
      return openingGuidanceReason
  }

  return null
}

function latestTakeoverAuditOpeningGuidanceHoldDetail(events: AlicizationMindTurnEventRecord[]) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (!event || event.kind !== 'takeover-audit')
      continue

    const payload = asTracePayloadObject(event.payload)
    if (!payload || typeof payload.opening_guidance_hold_detail !== 'string')
      continue

    const detail = payload.opening_guidance_hold_detail.trim()
    if (detail)
      return detail
  }

  return null
}

function latestTakeoverAuditCompanionshipTransition(events: AlicizationMindTurnEventRecord[]) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (!event || event.kind !== 'takeover-audit')
      continue

    const payload = asTracePayloadObject(event.payload)
    if (!payload)
      continue

    const companionshipHoldMode = typeof payload.companionship_hold_mode === 'string'
      ? payload.companionship_hold_mode.trim()
      : ''
    const live2dFacialReleaseMs = asTraceFiniteNumber(payload.live2d_facial_release_ms)
    const vrmExpressionBlendMs = asTraceFiniteNumber(payload.vrm_expression_blend_ms)
    const vrmActionFadeMs = asTraceFiniteNumber(payload.vrm_action_fade_ms)
    const preferredExpressionAliases = asTraceStringList(payload.preferred_expression_aliases)
    const preferredMotionAliases = asTraceStringList(payload.preferred_motion_aliases)

    if (
      companionshipHoldMode
      || live2dFacialReleaseMs != null
      || vrmExpressionBlendMs != null
      || vrmActionFadeMs != null
      || preferredExpressionAliases.length > 0
      || preferredMotionAliases.length > 0
    ) {
      return {
        companionshipHoldMode: companionshipHoldMode || null,
        live2dFacialReleaseMs,
        vrmExpressionBlendMs,
        vrmActionFadeMs,
        preferredExpressionAliases,
        preferredMotionAliases,
      }
    }
  }

  return null
}

type AlicizationInitiativePersonaBias = NonNullable<AlicizationInitiativeSnapshot['personaBias']>
interface AlicizationSelfEvolutionBaselineAdoptionRecordLike {
  adoptedAt: number
  snapshotCapturedAt: number
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  selectedCardId: string | null
  activePatternKey: string | null
  repairOwnerHint: string | null
  adoptionMode: 'adopt-now'
  summaryLine: string
  prosodyAuthorityNote?: string | null
  continuityGovernanceNote?: string | null
  relationshipCadenceGovernanceNote?: string | null
  projectStateContinuityGovernanceNote?: string | null
}

function proactivePersonaBiasSignals(personaBias: AlicizationInitiativePersonaBias | null | undefined) {
  if (!personaBias)
    return [] as string[]

  return uniquePreviewReasons([
    personaBias.initiativeStyle ? `persona:initiative-style:${personaBias.initiativeStyle}` : null,
    personaBias.silenceReconnect ? `persona:silence-reconnect:${personaBias.silenceReconnect}` : null,
    personaBias.preferredProactiveStyle ? `persona:preferred-style:${personaBias.preferredProactiveStyle}` : null,
  ])
}

function asRecordObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function describePersonaPreferredPosture(action: string | null) {
  if (action === 'hover')
    return 'observe-first'
  if (action === 'speak')
    return 'direct-reconnect'
  if (action === 'warn')
    return 'guardian-care'
  return action ?? 'current'
}

function describeRejectedAlternativeDriftReason(personaPreferredAction: string | null, candidateAction: string) {
  if (personaPreferredAction === 'hover') {
    if (candidateAction === 'speak' || candidateAction === 'whisper')
      return `Current persona bias is ${describePersonaPreferredPosture(personaPreferredAction)}, so ${candidateAction} breaks the preferred restraint posture.`
    if (candidateAction === 'warn')
      return 'Current persona bias is not guardian-care, so warn overstates urgency for this personality posture.'
    return `Current persona bias is ${describePersonaPreferredPosture(personaPreferredAction)}, so ${candidateAction} pushes harder than this posture currently wants.`
  }

  if (personaPreferredAction === 'speak') {
    if (candidateAction === 'hover' || candidateAction === 'hold')
      return 'Current persona bias is direct-reconnect, so hover underplays the contact this personality posture currently wants.'
    if (candidateAction === 'warn')
      return 'Current persona bias is not guardian-care, so warn hardens the tone beyond this personality posture.'
    return `Current persona bias is ${describePersonaPreferredPosture(personaPreferredAction)}, so ${candidateAction} drifts away from the preferred reconnect posture.`
  }

  if (personaPreferredAction === 'warn') {
    if (candidateAction === 'hover' || candidateAction === 'hold')
      return 'Current persona bias is guardian-care, so hover withholds urgency more than this personality posture allows.'
    if (candidateAction === 'speak' || candidateAction === 'whisper')
      return `Current persona bias is ${describePersonaPreferredPosture(personaPreferredAction)}, so ${candidateAction} softens the warning posture too much.`
    return `Current persona bias is ${describePersonaPreferredPosture(personaPreferredAction)}, so ${candidateAction} drifts away from the preferred care posture.`
  }

  return `Current persona bias does not clearly support ${candidateAction}, so this alternative drifts away from the active personality posture.`
}

function describePersonaBiasMode(input: {
  relationshipPosture?: string | null
  initiativeStyle?: string | null
  silenceReconnect?: string | null
  comfortStyle?: string | null
  preferredProactiveStyle?: string | null
}) {
  if (
    input.initiativeStyle === 'observant'
    || input.silenceReconnect === 'hold'
    || input.preferredProactiveStyle === 'silent-observe'
  ) {
    return 'observe-first restraint'
  }
  if (
    input.relationshipPosture === 'guardian'
    || input.comfortStyle === 'take-charge'
  ) {
    return 'guardian-care intervention'
  }
  if (
    input.initiativeStyle === 'high-participation'
    || input.silenceReconnect === 'direct-approach'
  ) {
    return 'direct reconnect'
  }
  return 'measured companionship'
}

function describeSameHerEmbodimentLaneImpact(matchedSignals: string[]) {
  if (matchedSignals.includes('bodyContinuityPhase: full-cross-modal-lock')) {
    return 'continuity-impact: body continuity and manifestation authority are now locked back onto the same living segment together, so visible identity-continuity continuity can keep traveling as one explicit embodiment line'
  }

  if (
    matchedSignals.includes('lane=face+motion+voice-only')
    && matchedSignals.includes('remaining-open=body+lipsync')
  ) {
    return 'continuity-impact: identity-continuity embodiment is still being carried through face, motion, and voice together, while body and lipsync still need to rejoin before full cross-modal closure settles'
  }

  const laneOnlySignal = matchedSignals.find(signal =>
    signal === 'lane=face-only'
    || signal === 'lane=motion-only'
    || signal === 'lane=lipsync-only'
    || signal === 'lane=voice-only'
    || signal === 'lane=face+motion+lipsync-only'
    || signal === 'lane=face+lipsync-only'
    || signal === 'lane=face+motion-only'
    || signal === 'lane=motion+lipsync-only'
    || signal === 'lane=face+voice-only'
    || signal === 'lane=motion+voice-only'
    || signal === 'lane=lipsync+voice-only'
    || signal === 'lane=face+motion+voice-only'
    || signal === 'lane=face+lipsync+voice-only'
    || signal === 'lane=motion+lipsync+voice-only',
  )

  if (laneOnlySignal === 'lane=face-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by face, so visible continuity is still present but no longer fully cross-modal'
  if (laneOnlySignal === 'lane=motion-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by motion, so visible continuity is still present but no longer fully cross-modal'
  if (laneOnlySignal === 'lane=lipsync-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by lipsync, so visible continuity is still present but no longer fully cross-modal'
  if (laneOnlySignal === 'lane=voice-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by voice, so visible continuity is still present but no longer fully cross-modal'
  if (laneOnlySignal === 'lane=face+motion+lipsync-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by face, motion, and lipsync, so visible continuity is still present but no longer fully cross-modal'
  if (laneOnlySignal === 'lane=face+lipsync-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by face and lipsync, so visible continuity is still present but no longer fully cross-modal'
  if (laneOnlySignal === 'lane=face+motion-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by face and motion, so visible continuity is still present but no longer fully cross-modal'
  if (laneOnlySignal === 'lane=motion+lipsync-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by motion and lipsync, so visible continuity is still present but no longer fully cross-modal'
  if (laneOnlySignal === 'lane=face+voice-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by face and voice, so visible continuity is still present but no longer fully cross-modal'
  if (laneOnlySignal === 'lane=motion+voice-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by motion and voice, so visible continuity is still present but no longer fully cross-modal'
  if (laneOnlySignal === 'lane=lipsync+voice-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by lipsync and voice, so visible continuity is still present but no longer fully cross-modal'
  if (laneOnlySignal === 'lane=face+motion+voice-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by face, motion, and voice, so visible continuity is still present but no longer fully cross-modal'
  if (laneOnlySignal === 'lane=face+lipsync+voice-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by face, lipsync, and voice, so visible continuity is still present but no longer fully cross-modal'
  if (laneOnlySignal === 'lane=motion+lipsync+voice-only')
    return 'continuity-impact: identity-continuity embodiment is now only being carried by motion, lipsync, and voice, so visible continuity is still present but no longer fully cross-modal'

  return null
}

function hasGroundedSameHerEmbodimentCarry(matchedSignals: string[]) {
  return matchedSignals.includes('bodyContinuityPhase: full-cross-modal-lock')
}

function resolveSameSegmentFaceMotionRecoverySignal(signals: Array<string | null | undefined>) {
  for (const signal of signals) {
    if (typeof signal !== 'string')
      continue

    const match = signal.match(/(?:same-segment )?face\+motion(?:\+voice)? recovery@[^\s|]+/i)
    if (match?.[0])
      return match[0]
  }

  return null
}

function resolveRuntimeContinuityRemainingOpenSignal(signals: string[]) {
  for (const signal of signals) {
    if (/remaining-open=body\+lipsync/i.test(signal))
      return 'remaining-open=body+lipsync'
    if (/remaining-open=lipsync\+voice/i.test(signal))
      return 'remaining-open=lipsync+voice'
  }

  return null
}

function resolveRuntimeContinuityBodyPhaseSignal(signals: string[]) {
  for (const signal of signals) {
    if (/bodycontinuityphase[:=]\s*full-cross-modal-lock/i.test(signal))
      return 'bodyContinuityPhase: full-cross-modal-lock'
  }

  return null
}

function resolveRuntimeContinuityManifestationLabel(signals: string[]) {
  for (const signal of signals) {
    const targetMatch = signal.match(/\btarget=(live2d|vrm)\b/i)
    const target = targetMatch?.[1]?.toLowerCase()
    if (target === 'live2d')
      return 'Live2D manifestation'
    if (target === 'vrm')
      return 'VRM manifestation'

    if (/\blive2d\b/i.test(signal))
      return 'Live2D manifestation'
    if (/\bvrm\b/i.test(signal))
      return 'VRM manifestation'
  }

  return 'manifestation authority'
}

export const useAlicizationSelfEvolutionInspectorStore = defineStore('alicization-self-evolution-inspector', () => {
  const replayStore = useAlicizationMindReplayStore()
  const loading = ref(false)
  const lastError = ref<string | null>(null)
  const snapshot = ref<AlicizationSelfEvolutionVersionRuntimeSnapshot | null>(null)
  const soulSnapshot = ref<AlicizationSoulSnapshot | null>(null)
  const visualPresenceState = ref<AlicizationVisualPresenceStateSnapshot | null>(null)
  const organicMemorySnapshot = ref<AlicizationOrganicMemorySnapshot | null>(null)
  const latestProjectStateObservation = ref<AlicizationProjectStateObservation | null>(null)
  const projectStateContinuitySnapshot = ref<AlicizationProjectStateContinuitySnapshot | null>(null)
  const selectedCandidateId = ref<string | null>(null)
  const selectedTraceEventId = ref<string | null>(null)
  const drilledTraceResult = ref<{
    events: AlicizationMindTurnEventRecord[]
    traceRecords: AlicizationMemoryDecisionTraceRecord[]
  } | null>(null)

  const sortedCandidates = computed(() => {
    return [...(snapshot.value?.candidates ?? [])]
      .sort((left, right) => {
        if (left.createdAt !== right.createdAt)
          return right.createdAt - left.createdAt
        return left.id.localeCompare(right.id)
      })
  })

  const activeCandidate = computed(() => {
    const activeCandidateId = snapshot.value?.activeCandidateId ?? null
    if (!activeCandidateId)
      return null
    return sortedCandidates.value.find(candidate => candidate.id === activeCandidateId) ?? null
  })

  const selectedCandidate = computed(() => {
    const candidateId = selectedCandidateId.value
    if (candidateId) {
      const exact = sortedCandidates.value.find(candidate => candidate.id === candidateId)
      if (exact)
        return exact
    }
    return activeCandidate.value ?? sortedCandidates.value[0] ?? null
  })

  const selectedCandidateTraceRecord = computed(() => {
    const decisionTraceId = selectedCandidate.value?.decisionTraceId?.trim() ?? ''
    if (!decisionTraceId)
      return null
    return drilledTraceResult.value?.traceRecords.find(record => record.decisionTraceId === decisionTraceId)
      ?? drilledTraceResult.value?.traceRecords[0]
      ?? null
  })

  const selectedCandidateTraceSummary = computed(() => {
    const trace = selectedCandidateTraceRecord.value
    if (!trace)
      return null
    const fragments = [
      trace.governance?.turnMode ? `turn=${trace.governance.turnMode}` : null,
      trace.governance?.truthState ? `truth=${trace.governance.truthState}` : null,
      trace.governance?.repairState ? `repair=${trace.governance.repairState}` : null,
      trace.replyMemoryCoherence ? 'reply-memory-coherence=present' : null,
      trace.learningExecuted ? 'learning-executed=present' : null,
      trace.memoryFactsUpserted ? 'memory-facts-upserted=present' : null,
      trace.memoryResolutionLedger ? 'resolution-ledger=present' : null,
      trace.memoryStageReplay ? 'stage-replay=present' : null,
    ].filter(Boolean)
    return fragments.length > 0 ? fragments.join(' | ') : null
  })

  const selectedCandidateTraceCoverage = computed(() => {
    const trace = selectedCandidateTraceRecord.value
    if (!trace)
      return null
    const hasRequired = trace.eventKinds.includes('governance-normalized')
      && trace.eventKinds.includes('persistence-written')
    return hasRequired ? 'complete' : 'incomplete'
  })

  const selectedCandidateTraceDetails = computed(() => {
    const trace = selectedCandidateTraceRecord.value
    if (!trace) {
      return {
        eventKinds: [] as string[],
        governance: null as null | {
          turnMode: string | null
          truthState: string | null
          repairState: string | null
          answerSubject: string | null
          screenReferenceMode: string | null
        },
        learning: null as null | {
          action: string | null
          domain: string | null
          resultSummary: string | null
        },
        memoryResolution: null as null | {
          finalSurfacePolicy: string | null
          closureState: string | null
          suppressionTags: string[]
          finalRationale: string | null
        },
        memoryStage: null as null | {
          stage: string | null
          summary: string | null
          latencyMs: number | null
        },
      }
    }

    const learningPayload = trace.learningExecuted && typeof trace.learningExecuted === 'object'
      ? trace.learningExecuted as Record<string, unknown>
      : null
    const resolution = trace.memoryResolutionLedger
    const stageReplay = trace.memoryStageReplay?.stages?.[0] ?? null

    return {
      eventKinds: [...trace.eventKinds],
      governance: {
        turnMode: trace.governance?.turnMode ?? null,
        truthState: trace.governance?.truthState ?? null,
        repairState: trace.governance?.repairState ?? null,
        answerSubject: trace.governance?.answerSubject ?? null,
        screenReferenceMode: trace.governance?.screenReferenceMode ?? null,
      },
      learning: learningPayload
        ? {
            action: typeof learningPayload.action === 'string' ? learningPayload.action : null,
            domain: typeof learningPayload.domain === 'string' ? learningPayload.domain : null,
            resultSummary: typeof learningPayload.resultSummary === 'string' ? learningPayload.resultSummary : null,
          }
        : null,
      memoryResolution: resolution
        ? {
            finalSurfacePolicy: resolution.finalSurfacePolicy ?? null,
            closureState: resolution.closureState ?? null,
            suppressionTags: [...(resolution.suppressionTags ?? [])],
            finalRationale: resolution.finalRationale ?? null,
          }
        : null,
      memoryStage: stageReplay
        ? {
            stage: stageReplay.stage ?? null,
            summary: stageReplay.summary ?? null,
            latencyMs: typeof stageReplay.latencyMs === 'number' ? stageReplay.latencyMs : null,
          }
        : null,
    }
  })

  const selectedCandidateTraceConsumptionEvidence = computed(() => {
    const trace = selectedCandidateTraceRecord.value
    const candidate = selectedCandidate.value
    const activeSelfRevision = trace?.derivedMindStateBundle?.activeSelfRevision ?? null
    if (!trace || !candidate || !activeSelfRevision) {
      return null as null | {
        status: 'consumed' | 'partial' | 'missing'
        tracePatchId: string | null
        tracePatchDecisionTraceId: string | null
        traceLanes: string[]
        traceReasonCodes: string[]
        matchedCandidateId: string | null
        matchedActiveCandidateId: boolean
        matchedDecisionTraceId: boolean
        matchedPatchId: boolean
        missingSignals: string[]
        driftingSignals: string[]
        reasons: string[]
      }
    }

    const matchedPatchId = activeSelfRevision.patchId === candidate.patch.id
    const matchedActiveCandidateId = activeSelfRevision.candidateId === candidate.id
    const matchedDecisionTraceId = activeSelfRevision.patchDecisionTraceId === candidate.decisionTraceId
    const missingSignals = uniquePreviewReasons([
      matchedActiveCandidateId ? null : 'candidate-id-mismatch',
      matchedPatchId ? null : 'patch-id-mismatch',
      matchedDecisionTraceId ? null : 'decision-trace-mismatch',
    ])
    const driftingSignals = uniquePreviewReasons([
      !matchedActiveCandidateId && activeSelfRevision.candidateId ? `traceCandidate:${activeSelfRevision.candidateId}` : null,
      !matchedPatchId && activeSelfRevision.patchId ? `tracePatch:${activeSelfRevision.patchId}` : null,
      !matchedDecisionTraceId && activeSelfRevision.patchDecisionTraceId ? `traceDecisionTrace:${activeSelfRevision.patchDecisionTraceId}` : null,
    ])

    return {
      status: matchedActiveCandidateId && matchedPatchId && matchedDecisionTraceId ? 'consumed' : missingSignals.length > 0 ? 'partial' : 'missing',
      tracePatchId: activeSelfRevision.patchId ?? null,
      tracePatchDecisionTraceId: activeSelfRevision.patchDecisionTraceId ?? null,
      traceLanes: [...(activeSelfRevision.lanes ?? [])],
      traceReasonCodes: [...(activeSelfRevision.reasonCodes ?? [])],
      matchedCandidateId: matchedActiveCandidateId ? candidate.id : null,
      matchedActiveCandidateId,
      matchedDecisionTraceId,
      matchedPatchId,
      missingSignals,
      driftingSignals,
      reasons: uniquePreviewReasons([
        matchedActiveCandidateId
          ? 'The drilled trace bundle records the same active self-evolution candidate id as the selected candidate.'
          : activeSelfRevision.candidateId
            ? 'The drilled trace bundle points at a different active self-evolution candidate than the selected candidate.'
            : null,
        matchedPatchId
          ? 'The drilled trace bundle records the same active self-revision patch id as the selected candidate.'
          : activeSelfRevision.patchId
            ? 'The drilled trace bundle points at a different active self-revision patch than the selected candidate.'
            : null,
        matchedDecisionTraceId
          ? 'The drilled trace bundle points back to the selected candidate decision trace.'
          : activeSelfRevision.patchDecisionTraceId
            ? 'The drilled trace bundle points at a different self-revision decision trace than the selected candidate.'
            : null,
      ]),
    }
  })

  const selectedCandidateConsumedTraceSummaries = computed(() => {
    const candidate = selectedCandidate.value
    const traceRecords = drilledTraceResult.value?.traceRecords ?? []
    if (!candidate) {
      return [] as Array<{
        decisionTraceId: string
        turnId: string | null
        consumedAt: number
        lanes: string[]
        summary: string | null
        learningAction: string | null
        trajectorySummary: string
      }>
    }

    return traceRecords
      .filter((trace) => {
        const activeSelfRevision = trace.derivedMindStateBundle?.activeSelfRevision ?? null
        return activeSelfRevision?.candidateId === candidate.id
      })
      .map(trace => ({
        decisionTraceId: trace.decisionTraceId,
        turnId: trace.turnId ?? null,
        consumedAt: trace.lastUpdatedAt,
        lanes: [...(trace.derivedMindStateBundle?.activeSelfRevision?.lanes ?? [])],
        summary: trace.derivedMindStateBundle?.activeSelfRevision?.summary ?? null,
        learningAction: readTraceNextLearningAction(trace),
        trajectorySummary: `lanes=${[...(trace.derivedMindStateBundle?.activeSelfRevision?.lanes ?? [])].join(', ') || 'n/a'} | learning=${
          readTraceNextLearningAction(trace) ?? 'n/a'
        }`,
      }))
      .sort((left, right) => {
        if (left.consumedAt !== right.consumedAt)
          return right.consumedAt - left.consumedAt
        return left.decisionTraceId.localeCompare(right.decisionTraceId)
      })
  })

  const selectedCandidateConsumptionStability = computed(() => {
    const consumed = selectedCandidateConsumedTraceSummaries.value
    const candidate = selectedCandidate.value
    if (!candidate || consumed.length === 0) {
      return null as null | {
        consumedTurnCount: number
        latestConsumedAt: number | null
        latestDecisionTraceId: string | null
        laneCoverage: string[]
        dominantLearningAction: string | null
        driftDetected: boolean
        reasons: string[]
      }
    }

    const laneCoverage = uniquePreviewReasons(consumed.flatMap(item => item.lanes), 16)
    const latest = consumed[0] ?? null
    const earliest = consumed[consumed.length - 1] ?? null
    const dominantLearningAction = latest?.learningAction ?? null
    const driftDetected = Boolean(
      latest
      && earliest
      && latest.learningAction
      && earliest.learningAction
      && latest.learningAction !== earliest.learningAction,
    )

    return {
      consumedTurnCount: consumed.length,
      latestConsumedAt: latest?.consumedAt ?? null,
      latestDecisionTraceId: latest?.decisionTraceId ?? null,
      laneCoverage,
      dominantLearningAction,
      driftDetected,
      reasons: uniquePreviewReasons([
        `The selected active candidate is still being consumed across ${consumed.length} drilled traces.`,
        driftDetected
          ? 'Later candidate consumption is shifting lane mix or learning direction, which suggests the long-horizon personality effect is no longer staying perfectly stable.'
          : 'No drilled trace currently shows candidate identity drift away from the selected active candidate.',
      ]),
    }
  })

  const selectedCandidatePersonaBiasProvenance = computed(() => {
    const trace = selectedCandidateTraceRecord.value
    const runtimePersonaBias = visualPresenceState.value?.initiative?.personaBias ?? null
    const governancePersonaBias = trace?.governance?.digitalLifeSpine?.proactive?.personaBias ?? null
    const activeRuntimePersonaBias = runtimePersonaBias ?? governancePersonaBias ?? null
    const derivedBundle = trace?.derivedMindStateBundle ?? null
    const personalityState = asRecordObject((derivedBundle as { personalityState?: unknown } | null)?.personalityState)
    const identityKernel = asRecordObject(personalityState?.identityKernel)
    const initiativeBaseline = asRecordObject(personalityState?.initiativeBaseline)
    const projection = asRecordObject(derivedBundle?.personStateProjection)

    const relationshipPosture = typeof activeRuntimePersonaBias?.relationshipPosture === 'string'
      ? activeRuntimePersonaBias.relationshipPosture
      : typeof identityKernel?.relationshipPosture === 'string'
        ? identityKernel.relationshipPosture
        : null
    const initiativeStyle = typeof activeRuntimePersonaBias?.initiativeStyle === 'string'
      ? activeRuntimePersonaBias.initiativeStyle
      : typeof identityKernel?.initiativeStyle === 'string'
        ? identityKernel.initiativeStyle
        : null
    const silenceReconnect = typeof activeRuntimePersonaBias?.silenceReconnect === 'string'
      ? activeRuntimePersonaBias.silenceReconnect
      : typeof initiativeBaseline?.silenceReconnect === 'string'
        ? initiativeBaseline.silenceReconnect
        : null
    const comfortStyle = typeof activeRuntimePersonaBias?.comfortStyle === 'string'
      ? activeRuntimePersonaBias.comfortStyle
      : typeof initiativeBaseline?.comfortStyle === 'string'
        ? initiativeBaseline.comfortStyle
        : null
    const preferredProactiveStyle = typeof activeRuntimePersonaBias?.preferredProactiveStyle === 'string'
      ? activeRuntimePersonaBias.preferredProactiveStyle
      : typeof projection?.preferredProactiveStyle === 'string'
        ? projection.preferredProactiveStyle
        : null
    const openingGuidance = typeof activeRuntimePersonaBias?.openingGuidance === 'string'
      ? activeRuntimePersonaBias.openingGuidance
      : typeof projection?.openingGuidance === 'string'
        ? projection.openingGuidance
        : null
    const manifestationCadenceSummary = typeof activeRuntimePersonaBias?.manifestationCadenceSummary === 'string'
      ? activeRuntimePersonaBias.manifestationCadenceSummary
      : null

    if (
      !relationshipPosture
      && !initiativeStyle
      && !silenceReconnect
      && !comfortStyle
      && !preferredProactiveStyle
      && !openingGuidance
      && !manifestationCadenceSummary
    ) {
      return null as null | {
        status: 'grounded' | 'partial' | 'drift' | 'missing'
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
      }
    }

    const matchedSignals = uniquePreviewReasons([
      typeof identityKernel?.relationshipPosture === 'string' && relationshipPosture === identityKernel.relationshipPosture
        ? `identityKernel.relationshipPosture:${identityKernel.relationshipPosture}`
        : null,
      typeof identityKernel?.initiativeStyle === 'string' && initiativeStyle === identityKernel.initiativeStyle
        ? `identityKernel.initiativeStyle:${identityKernel.initiativeStyle}`
        : null,
      typeof initiativeBaseline?.silenceReconnect === 'string' && silenceReconnect === initiativeBaseline.silenceReconnect
        ? `initiativeBaseline.silenceReconnect:${initiativeBaseline.silenceReconnect}`
        : null,
      typeof initiativeBaseline?.comfortStyle === 'string' && comfortStyle === initiativeBaseline.comfortStyle
        ? `initiativeBaseline.comfortStyle:${initiativeBaseline.comfortStyle}`
        : null,
      typeof projection?.preferredProactiveStyle === 'string' && preferredProactiveStyle === projection.preferredProactiveStyle
        ? `personStateProjection.preferredProactiveStyle:${projection.preferredProactiveStyle}`
        : null,
      typeof projection?.openingGuidance === 'string' && openingGuidance === projection.openingGuidance
        ? 'personStateProjection.openingGuidance'
        : null,
      activeRuntimePersonaBias ? 'runtime.personaBias' : null,
    ])
    const missingSignals = uniquePreviewReasons([
      relationshipPosture && typeof identityKernel?.relationshipPosture !== 'string' ? 'identityKernel.relationshipPosture' : null,
      initiativeStyle && typeof identityKernel?.initiativeStyle !== 'string' ? 'identityKernel.initiativeStyle' : null,
      silenceReconnect && typeof initiativeBaseline?.silenceReconnect !== 'string' ? 'initiativeBaseline.silenceReconnect' : null,
      comfortStyle && typeof initiativeBaseline?.comfortStyle !== 'string' ? 'initiativeBaseline.comfortStyle' : null,
      preferredProactiveStyle && typeof projection?.preferredProactiveStyle !== 'string' ? 'personStateProjection.preferredProactiveStyle' : null,
      openingGuidance && typeof projection?.openingGuidance !== 'string' ? 'personStateProjection.openingGuidance' : null,
    ])
    const driftingSignals = uniquePreviewReasons([
      typeof identityKernel?.relationshipPosture === 'string' && relationshipPosture && relationshipPosture !== identityKernel.relationshipPosture
        ? `identityKernel.relationshipPosture:${identityKernel.relationshipPosture}`
        : null,
      typeof identityKernel?.initiativeStyle === 'string' && initiativeStyle && initiativeStyle !== identityKernel.initiativeStyle
        ? `identityKernel.initiativeStyle:${identityKernel.initiativeStyle}`
        : null,
      typeof initiativeBaseline?.silenceReconnect === 'string' && silenceReconnect && silenceReconnect !== initiativeBaseline.silenceReconnect
        ? `initiativeBaseline.silenceReconnect:${initiativeBaseline.silenceReconnect}`
        : null,
      typeof initiativeBaseline?.comfortStyle === 'string' && comfortStyle && comfortStyle !== initiativeBaseline.comfortStyle
        ? `initiativeBaseline.comfortStyle:${initiativeBaseline.comfortStyle}`
        : null,
      typeof projection?.preferredProactiveStyle === 'string' && preferredProactiveStyle && preferredProactiveStyle !== projection.preferredProactiveStyle
        ? `personStateProjection.preferredProactiveStyle:${projection.preferredProactiveStyle}`
        : null,
      typeof projection?.openingGuidance === 'string' && openingGuidance && openingGuidance !== projection.openingGuidance
        ? 'personStateProjection.openingGuidance:mismatch'
        : null,
    ])

    return {
      status: driftingSignals.length > 0 ? 'drift' : missingSignals.length === 0 ? 'grounded' : matchedSignals.length > 0 ? 'partial' : 'missing',
      relationshipPosture,
      initiativeStyle,
      silenceReconnect,
      comfortStyle,
      preferredProactiveStyle,
      openingGuidance,
      manifestationCadenceSummary,
      matchedSignals,
      missingSignals,
      driftingSignals,
      reasons: uniquePreviewReasons([
        typeof identityKernel?.relationshipPosture === 'string' || typeof identityKernel?.initiativeStyle === 'string'
          ? `Consumed trace bundle personalityState identityKernel currently supports relationshipPosture=${typeof identityKernel?.relationshipPosture === 'string' ? identityKernel.relationshipPosture : 'n/a'} and initiativeStyle=${typeof identityKernel?.initiativeStyle === 'string' ? identityKernel.initiativeStyle : 'n/a'}.`
          : null,
        typeof initiativeBaseline?.silenceReconnect === 'string' || typeof initiativeBaseline?.comfortStyle === 'string'
          ? `Consumed trace bundle initiativeBaseline currently supports silenceReconnect=${typeof initiativeBaseline?.silenceReconnect === 'string' ? initiativeBaseline.silenceReconnect : 'n/a'} and comfortStyle=${typeof initiativeBaseline?.comfortStyle === 'string' ? initiativeBaseline.comfortStyle : 'n/a'}.`
          : null,
        typeof projection?.preferredProactiveStyle === 'string' || typeof projection?.openingGuidance === 'string'
          ? `Consumed trace bundle personStateProjection currently supports preferredProactiveStyle=${typeof projection?.preferredProactiveStyle === 'string' ? projection.preferredProactiveStyle : 'n/a'} and the current opening guidance.`
          : null,
        activeRuntimePersonaBias && driftingSignals.length === 0
          ? 'Runtime initiative personaBias matches the consumed trace bundle, so the current proactive restraint still resolves from the initialized persona baseline.'
          : activeRuntimePersonaBias
            ? 'Runtime initiative personaBias only partially matches the consumed trace bundle, so the current proactive restraint has some provenance drift.'
            : null,
      ]),
    }
  })

  const selectedCandidateRuntimeContinuityProjection = computed(() => {
    const trace = selectedCandidateTraceRecord.value
    const derivedBundle = trace?.derivedMindStateBundle ?? null
    const rendererSignals = asRecordObject((derivedBundle as { rendererSignals?: unknown } | null)?.rendererSignals)
    const driverAuthority = asRecordObject(rendererSignals?.driverAuthority)
    const bindingSummary = typeof driverAuthority?.bindingSummary === 'string'
      ? driverAuthority.bindingSummary
      : null
    const settleSummary = typeof driverAuthority?.settleSummary === 'string'
      ? driverAuthority.settleSummary
      : null
    const runtimeChannel = typeof driverAuthority?.channel === 'string'
      ? driverAuthority.channel
      : null
    const activeThreadId = typeof driverAuthority?.activeThreadId === 'string'
      ? driverAuthority.activeThreadId
      : null
    const runtimeScenario = typeof driverAuthority?.scenario === 'string'
      ? driverAuthority.scenario
      : null
    const runtimeSummary = typeof rendererSignals?.speechSummary === 'string'
      ? rendererSignals.speechSummary
      : null
    const sameSegmentFaceMotionRecovery = resolveSameSegmentFaceMotionRecoverySignal([
      bindingSummary,
      settleSummary,
      runtimeSummary,
    ])
    const runtimeContinuitySignals = [bindingSummary, settleSummary, runtimeSummary]
      .filter((value): value is string => Boolean(value))
    const bodyContinuityPhaseSignal = resolveRuntimeContinuityBodyPhaseSignal(runtimeContinuitySignals)
    const remainingOpenSignal = resolveRuntimeContinuityRemainingOpenSignal(runtimeContinuitySignals)
    const manifestationLabel = resolveRuntimeContinuityManifestationLabel(runtimeContinuitySignals)
    const laneOnlySignal = runtimeContinuitySignals
      .filter((value): value is string => Boolean(value))
      .find(value =>
        value.includes('lane=face-only')
        || value.includes('lane=motion-only')
        || value.includes('lane=lipsync-only')
        || value.includes('lane=voice-only')
        || value.includes('lane=face+motion+lipsync-only')
        || value.includes('lane=face+lipsync-only')
        || value.includes('lane=face+motion-only')
        || value.includes('lane=motion+lipsync-only')
        || value.includes('lane=face+voice-only')
        || value.includes('lane=motion+voice-only')
        || value.includes('lane=lipsync+voice-only')
        || value.includes('lane=face+motion+voice-only')
        || value.includes('lane=face+lipsync+voice-only')
        || value.includes('lane=motion+lipsync+voice-only'),
      )

    if (!bindingSummary && !settleSummary && !runtimeSummary && !runtimeChannel && !activeThreadId && !runtimeScenario) {
      return null as null | {
        status: 'grounded' | 'partial' | 'drift' | 'missing'
        runtimeChannel: string | null
        runtimeSummary: string | null
        activeThreadId: string | null
        runtimeScenario: string | null
        matchedSignals: string[]
        missingSignals: string[]
        driftingSignals: string[]
        reasons: string[]
      }
    }

    const matchedSignals = uniquePreviewReasons([
      runtimeChannel ? `runtime-channel:${runtimeChannel}` : null,
      activeThreadId ? `runtime-thread:${activeThreadId}` : null,
      runtimeScenario ? `runtime-scenario:${runtimeScenario}` : null,
      bodyContinuityPhaseSignal,
      remainingOpenSignal,
      sameSegmentFaceMotionRecovery,
      laneOnlySignal?.includes('lane=face-only') ? 'lane=face-only' : null,
      laneOnlySignal?.includes('lane=motion-only') ? 'lane=motion-only' : null,
      laneOnlySignal?.includes('lane=lipsync-only') ? 'lane=lipsync-only' : null,
      laneOnlySignal?.includes('lane=voice-only') ? 'lane=voice-only' : null,
      laneOnlySignal?.includes('lane=face+motion+lipsync-only') ? 'lane=face+motion+lipsync-only' : null,
      laneOnlySignal?.includes('lane=face+lipsync-only') ? 'lane=face+lipsync-only' : null,
      laneOnlySignal?.includes('lane=face+motion-only') ? 'lane=face+motion-only' : null,
      laneOnlySignal?.includes('lane=motion+lipsync-only') ? 'lane=motion+lipsync-only' : null,
      laneOnlySignal?.includes('lane=face+voice-only') ? 'lane=face+voice-only' : null,
      laneOnlySignal?.includes('lane=motion+voice-only') ? 'lane=motion+voice-only' : null,
      laneOnlySignal?.includes('lane=lipsync+voice-only') ? 'lane=lipsync+voice-only' : null,
      laneOnlySignal?.includes('lane=face+motion+voice-only') ? 'lane=face+motion+voice-only' : null,
      laneOnlySignal?.includes('lane=face+lipsync+voice-only') ? 'lane=face+lipsync+voice-only' : null,
      laneOnlySignal?.includes('lane=motion+lipsync+voice-only') ? 'lane=motion+lipsync+voice-only' : null,
    ])

    return {
      status: matchedSignals.length > 0 ? 'grounded' : 'missing',
      runtimeChannel,
      runtimeSummary,
      activeThreadId,
      runtimeScenario,
      matchedSignals,
      missingSignals: [],
      driftingSignals: [],
      reasons: uniquePreviewReasons([
        bodyContinuityPhaseSignal === 'bodyContinuityPhase: full-cross-modal-lock'
          ? `Body continuity and ${manifestationLabel} are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit identity-continuity embodiment line instead of a temporary visual alignment.`
          : null,
        laneOnlySignal
          ? `Renderer continuity evidence currently says ${laneOnlySignal.match(/lane=[^ |]+/)?.[0] ?? laneOnlySignal}, so the identity-continuity line is no longer fully shared across every embodiment lane.`
          : null,
        bindingSummary
          ? `Driver authority binding currently resolves as ${bindingSummary}, so the renderer handoff is still exposing which surviving body lane holds continuity.`
          : null,
        settleSummary
          ? `Driver authority settle currently resolves as ${settleSummary}, so post-speech settling still carries the surviving identity-continuity lane evidence.`
          : null,
      ]),
    }
  })

  const selectedCandidateProactiveActionChain = computed(() => {
    const personaProvenance = selectedCandidatePersonaBiasProvenance.value
    const runtimeInitiative = visualPresenceState.value?.initiative ?? null
    // eslint-disable-next-line ts/no-use-before-define -- Vue computed refs are lazy; this summary reads the raw trace projection declared later.
    const latestOpeningGuidanceHold = latestTakeoverAuditOpeningGuidanceHold(selectedCandidateTraceEvents.value)

    const personaPreferredAction = (() => {
      if (!personaProvenance)
        return null
      if (
        personaProvenance.initiativeStyle === 'observant'
        || personaProvenance.silenceReconnect === 'hold'
        || personaProvenance.preferredProactiveStyle === 'silent-observe'
      ) {
        return 'hover'
      }
      if (
        personaProvenance.initiativeStyle === 'high-participation'
        || personaProvenance.silenceReconnect === 'direct-approach'
      ) {
        return 'speak'
      }
      if (
        personaProvenance.relationshipPosture === 'guardian'
        || personaProvenance.comfortStyle === 'take-charge'
      ) {
        return 'warn'
      }
      return null
    })()

    const runtimeSelectedAction = runtimeInitiative?.selectedAction ?? null
    const runtimeSelectedActionLabel = runtimeSelectedAction ? String(runtimeSelectedAction) : null
    const runtimeShouldSpeak = typeof runtimeInitiative?.shouldSpeak === 'boolean'
      ? runtimeInitiative.shouldSpeak
      : null
    const openingGuidance = personaProvenance?.openingGuidance ?? null

    if (!personaPreferredAction && !runtimeSelectedAction && runtimeShouldSpeak == null && !latestOpeningGuidanceHold) {
      return null as null | {
        status: 'grounded' | 'partial' | 'drift' | 'missing'
        personaPreferredAction: string | null
        runtimeSelectedAction: string | null
        runtimeShouldSpeak: boolean | null
        openingGuidance: string | null
        openingGuidanceHoldReason: string | null
        matchedSignals: string[]
        missingSignals: string[]
        driftingSignals: string[]
        reasons: string[]
      }
    }

    const postureAligned = (() => {
      if (!personaPreferredAction)
        return false
      if (personaPreferredAction === 'hover')
        return runtimeSelectedActionLabel === 'hold' || runtimeSelectedActionLabel === 'hover'
      if (personaPreferredAction === 'speak')
        return runtimeSelectedActionLabel === 'speak' || runtimeSelectedActionLabel === 'whisper'
      if (personaPreferredAction === 'warn')
        return runtimeSelectedActionLabel === 'warn' || runtimeSelectedActionLabel === 'speak'
      return false
    })()

    const matchedSignals = uniquePreviewReasons([
      personaPreferredAction ? `persona-preferred-action:${personaPreferredAction}` : null,
      runtimeSelectedAction ? `runtime-selected-action:${runtimeSelectedAction}` : null,
      runtimeShouldSpeak === false ? 'runtime-shouldSpeak:false' : runtimeShouldSpeak === true ? 'runtime-shouldSpeak:true' : null,
      latestOpeningGuidanceHold,
    ])

    const missingSignals = uniquePreviewReasons([
      personaPreferredAction && !runtimeSelectedAction ? 'runtime-selected-action' : null,
      personaPreferredAction && runtimeShouldSpeak == null ? 'runtime-shouldSpeak' : null,
    ])

    const driftingSignals = uniquePreviewReasons([
      personaPreferredAction === 'hover' && runtimeSelectedActionLabel && runtimeSelectedActionLabel !== 'hold' && runtimeSelectedActionLabel !== 'hover'
        ? `runtime-selected-action:${runtimeSelectedActionLabel}`
        : null,
      personaPreferredAction === 'speak' && runtimeSelectedActionLabel && runtimeSelectedActionLabel !== 'speak' && runtimeSelectedActionLabel !== 'whisper'
        ? `runtime-selected-action:${runtimeSelectedActionLabel}`
        : null,
      personaPreferredAction === 'warn' && runtimeSelectedActionLabel && runtimeSelectedActionLabel !== 'warn' && runtimeSelectedActionLabel !== 'speak'
        ? `runtime-selected-action:${runtimeSelectedActionLabel}`
        : null,
      personaPreferredAction === 'hover' && runtimeShouldSpeak === true ? 'runtime-shouldSpeak:true' : null,
      personaPreferredAction === 'speak' && runtimeShouldSpeak === false ? 'runtime-shouldSpeak:false' : null,
    ])

    return {
      status: driftingSignals.length > 0 ? 'drift' : missingSignals.length === 0 ? 'grounded' : matchedSignals.length > 0 ? 'partial' : 'missing',
      personaPreferredAction,
      runtimeSelectedAction,
      runtimeShouldSpeak,
      openingGuidance,
      openingGuidanceHoldReason: latestOpeningGuidanceHold,
      matchedSignals,
      missingSignals,
      driftingSignals,
      reasons: uniquePreviewReasons([
        personaPreferredAction === 'hover'
          ? 'Persona bias currently points toward an observe-first move, so hover/hold is the expected proactive posture.'
          : personaPreferredAction === 'speak'
            ? 'Persona bias currently points toward a direct reconnect, so speak/whisper is the expected proactive posture.'
            : personaPreferredAction === 'warn'
              ? 'Persona bias currently points toward a guardian-care move, so warn/speak is the expected proactive posture.'
              : null,
        runtimeSelectedAction || runtimeShouldSpeak != null
          ? `Runtime initiative currently resolves to selectedAction=${runtimeSelectedAction ?? 'n/a'} with shouldSpeak=${runtimeShouldSpeak == null ? 'n/a' : String(runtimeShouldSpeak)}, which ${postureAligned ? 'stays inside' : 'drifts away from'} that ${describePersonaPreferredPosture(personaPreferredAction)} posture.`
          : null,
        latestOpeningGuidanceHold
          ? `Latest drilled takeover audit confirms visible proactive speech was withheld by ${latestOpeningGuidanceHold}.`
          : null,
      ]),
    }
  })

  const selectedCandidateRejectedActionAlternatives = computed(() => {
    const counterfactual = visualPresenceState.value?.counterfactualDeliberation ?? null
    const selectedOptionId = visualPresenceState.value?.initiative?.selectedCounterfactualOptionId
      ?? counterfactual?.selectedOptionId
      ?? null
    const actionChain = selectedCandidateProactiveActionChain.value
    const personaPreferredAction = actionChain?.personaPreferredAction ?? null

    if (!counterfactual || !selectedOptionId) {
      return null as null | {
        status: 'grounded' | 'partial' | 'drift' | 'missing'
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
      }
    }

    const selectedOption = counterfactual.options.find(option => option.id === selectedOptionId) ?? null
    const selectedAction = selectedOption?.action ?? counterfactual.selectedAction ?? null
    const alternatives = [...counterfactual.options]
      .filter(option => option.id !== selectedOptionId)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map(option => ({
        optionId: option.id,
        action: String(option.action),
        identityFit: option.identityFit,
        timingFitness: option.timingFitness,
        score: option.score,
        driftReason: describeRejectedAlternativeDriftReason(personaPreferredAction, String(option.action)),
        why: option.why,
      }))

    if (!selectedAction || alternatives.length === 0)
      return null

    return {
      status: personaPreferredAction ? 'grounded' : actionChain?.status === 'partial' ? 'partial' : 'missing',
      selectedOptionId,
      selectedAction: String(selectedAction),
      dominantTradeoff: counterfactual.dominantTradeoff ?? null,
      alternatives,
      reasons: uniquePreviewReasons([
        `Counterfactual deliberation currently selected ${selectedAction} under the dominant tradeoff ${counterfactual.dominantTradeoff}.`,
        selectedAction === 'hover'
        && alternatives.some(option => option.action === 'speak')
        && describesRememberedFamiliarityRestraint(selectedOption?.why)
          ? 'Counterfactual competition kept hover ahead because remembered familiarity was held as memory before visible closeness widened, so the more direct speak return was intentionally declined.'
          : null,
        alternatives.length > 0
          ? 'Rejected alternatives are ordered by highest remaining score so you can see what the current persona posture declined next.'
          : null,
      ]),
    }
  })

  const selectedCandidateProactiveManifestationChain = computed(() => {
    const personaProvenance = selectedCandidatePersonaBiasProvenance.value
    const runtimeInitiative = visualPresenceState.value?.initiative ?? null
    const actionEcology = visualPresenceState.value?.actionEcology ?? null
    const counterfactual = visualPresenceState.value?.counterfactualDeliberation ?? null
    const selectedOptionId = runtimeInitiative?.selectedCounterfactualOptionId
      ?? counterfactual?.selectedOptionId
      ?? null
    const selectedOption = selectedOptionId
      ? counterfactual?.options.find(option => option.id === selectedOptionId) ?? null
      : null

    const personaPreferredStyle = personaProvenance?.preferredProactiveStyle ?? null
    const personaPreferredPresence = (() => {
      const posture = describePersonaPreferredPosture(selectedCandidateProactiveActionChain.value?.personaPreferredAction ?? null)
      if (posture === 'observe-first')
        return 'attentive'
      if (posture === 'direct-reconnect')
        return 'attentive'
      if (posture === 'guardian-care')
        return 'concerned'
      return null
    })()
    const counterfactualStyle = selectedOption?.style ?? null
    const counterfactualPresence = selectedOption?.embodiedPresence ?? null
    const actionEcologyStyle = actionEcology?.suggestedStyle ?? null
    const actionEcologyPresence = actionEcology?.embodiedPresence ?? null
    const initiativePreferredStyle = runtimeInitiative?.preferredStyle ?? null
    const initiativePreferredPresence = runtimeInitiative?.preferredPresence ?? null

    if (
      !personaPreferredStyle
      && !personaPreferredPresence
      && !counterfactualStyle
      && !counterfactualPresence
      && !actionEcologyStyle
      && !actionEcologyPresence
      && !initiativePreferredStyle
      && !initiativePreferredPresence
    ) {
      return null as null | {
        status: 'grounded' | 'partial' | 'missing'
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
      }
    }

    const matchedSignals = uniquePreviewReasons([
      personaPreferredStyle ? `persona-preferred-style:${personaPreferredStyle}` : null,
      counterfactualStyle && counterfactualStyle === personaPreferredStyle ? `counterfactual-style:${counterfactualStyle}` : null,
      counterfactualPresence && counterfactualPresence === personaPreferredPresence ? `counterfactual-presence:${counterfactualPresence}` : null,
      actionEcologyStyle && actionEcologyStyle === personaPreferredStyle ? `action-ecology-style:${actionEcologyStyle}` : null,
      actionEcologyPresence && actionEcologyPresence === personaPreferredPresence ? `action-ecology-presence:${actionEcologyPresence}` : null,
      initiativePreferredStyle && initiativePreferredStyle === personaPreferredStyle ? `initiative-preferred-style:${initiativePreferredStyle}` : null,
      initiativePreferredPresence && initiativePreferredPresence === personaPreferredPresence ? `initiative-preferred-presence:${initiativePreferredPresence}` : null,
    ])

    const missingSignals = uniquePreviewReasons([
      personaPreferredStyle && !counterfactualStyle ? 'counterfactual-style' : null,
      personaPreferredPresence && !counterfactualPresence ? 'counterfactual-presence' : null,
      personaPreferredStyle && !actionEcologyStyle ? 'action-ecology-style' : null,
      personaPreferredPresence && !actionEcologyPresence ? 'action-ecology-presence' : null,
      personaPreferredStyle && !initiativePreferredStyle ? 'initiative-preferred-style' : null,
      personaPreferredPresence && !initiativePreferredPresence ? 'initiative-preferred-presence' : null,
    ])

    const driftingSignals = uniquePreviewReasons([
      counterfactualStyle && personaPreferredStyle && counterfactualStyle !== personaPreferredStyle ? `counterfactual-style:${counterfactualStyle}` : null,
      counterfactualPresence && personaPreferredPresence && counterfactualPresence !== personaPreferredPresence ? `counterfactual-presence:${counterfactualPresence}` : null,
      actionEcologyStyle && personaPreferredStyle && actionEcologyStyle !== personaPreferredStyle ? `action-ecology-style:${actionEcologyStyle}` : null,
      actionEcologyPresence && personaPreferredPresence && actionEcologyPresence !== personaPreferredPresence ? `action-ecology-presence:${actionEcologyPresence}` : null,
      initiativePreferredStyle && personaPreferredStyle && initiativePreferredStyle !== personaPreferredStyle ? `initiative-preferred-style:${initiativePreferredStyle}` : null,
      initiativePreferredPresence && personaPreferredPresence && initiativePreferredPresence !== personaPreferredPresence ? `initiative-preferred-presence:${initiativePreferredPresence}` : null,
    ])

    return {
      status: driftingSignals.length > 0 ? 'drift' : missingSignals.length === 0 ? 'grounded' : matchedSignals.length > 0 ? 'partial' : 'missing',
      personaPreferredStyle,
      personaPreferredPresence,
      counterfactualStyle,
      counterfactualPresence,
      actionEcologyStyle,
      actionEcologyPresence,
      initiativePreferredStyle,
      initiativePreferredPresence,
      matchedSignals,
      missingSignals,
      driftingSignals,
      reasons: uniquePreviewReasons([
        personaPreferredStyle || personaPreferredPresence
          ? `Persona bias currently points toward ${personaPreferredStyle ?? 'n/a'} with ${personaPreferredPresence ?? 'n/a'} presence, so a quiet accompanied manifestation is expected.`
          : null,
        matchedSignals.length > 2 && driftingSignals.length === 0
          ? 'Counterfactual deliberation, action ecology, and initiative all preserve the same style/presence chain, so the current manifestation still expresses the initialized persona posture.'
          : matchedSignals.length > 0
            ? 'Some manifestation layers still preserve the persona style/presence chain, but there is visible drift or missing evidence in the runtime handoff.'
            : null,
      ]),
    }
  })

  const selectedCandidatePrivateThoughtGovernanceChain = computed(() => {
    const privateThought = visualPresenceState.value?.privateThought ?? null
    const manifestationChain = selectedCandidateProactiveManifestationChain.value
    // eslint-disable-next-line ts/no-use-before-define -- Vue computed refs are lazy; this governance summary reads the raw trace projection declared later.
    const latestTakeoverAudit = [...selectedCandidateTraceEvents.value]
      .reverse()
      .find(event => event.kind === 'takeover-audit' && asTracePayloadObject(event.payload))
    const takeoverPayload = asTracePayloadObject(latestTakeoverAudit?.payload)
    const visibleReplyRealizationReason = typeof takeoverPayload?.visible_reply_realization_reason === 'string'
      ? takeoverPayload.visible_reply_realization_reason
      : null
    const visibleReplyBlockedReason = asTraceStringList(takeoverPayload?.visible_reply_blocked_reasons)
      .find(reason => reason.startsWith('opening-guidance:'))
      ?? null
    // eslint-disable-next-line ts/no-use-before-define -- Vue computed refs are lazy; this governance summary reads the raw trace projection declared later.
    const openingGuidanceHoldDetail = latestTakeoverAuditOpeningGuidanceHoldDetail(selectedCandidateTraceEvents.value)

    if (!privateThought && !visibleReplyRealizationReason && !visibleReplyBlockedReason) {
      return null as null | {
        status: 'grounded' | 'partial' | 'drift' | 'missing'
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
      }
    }

    const privateThoughtShouldSpeak = typeof privateThought?.shouldSpeak === 'boolean'
      ? privateThought.shouldSpeak
      : null
    const privateThoughtStyle = privateThought?.suggestedStyle ?? null
    const privateThoughtPresence = privateThought?.embodiedPresence ?? null
    const expectedStyle = manifestationChain?.personaPreferredStyle ?? null
    const expectedPresence = manifestationChain?.personaPreferredPresence ?? null
    const expectedCounterfactualId = visualPresenceState.value?.initiative?.selectedCounterfactualOptionId
      ?? visualPresenceState.value?.counterfactualDeliberation?.selectedOptionId
      ?? null

    const matchedSignals = uniquePreviewReasons([
      privateThought?.stance ? `private-thought-stance:${privateThought.stance}` : null,
      privateThoughtShouldSpeak === false ? 'private-thought-shouldSpeak:false' : privateThoughtShouldSpeak === true ? 'private-thought-shouldSpeak:true' : null,
      privateThoughtStyle && (!expectedStyle || privateThoughtStyle === expectedStyle) ? `private-thought-style:${privateThoughtStyle}` : null,
      privateThoughtPresence && (!expectedPresence || privateThoughtPresence === expectedPresence) ? `private-thought-presence:${privateThoughtPresence}` : null,
      privateThought?.counterfactualOptionId && (!expectedCounterfactualId || privateThought.counterfactualOptionId === expectedCounterfactualId)
        ? `private-thought-counterfactual:${privateThought.counterfactualOptionId}`
        : null,
      visibleReplyBlockedReason ? `visible-reply-blocked:${visibleReplyBlockedReason}` : null,
    ])

    const missingSignals = uniquePreviewReasons([
      expectedStyle && !privateThoughtStyle ? 'private-thought-style' : null,
      expectedPresence && !privateThoughtPresence ? 'private-thought-presence' : null,
      visibleReplyRealizationReason && !visibleReplyBlockedReason ? 'visible-reply-blocked-reason' : null,
    ])

    const driftingSignals = uniquePreviewReasons([
      expectedStyle && privateThoughtStyle && privateThoughtStyle !== expectedStyle ? `private-thought-style:${privateThoughtStyle}` : null,
      expectedPresence && privateThoughtPresence && privateThoughtPresence !== expectedPresence ? `private-thought-presence:${privateThoughtPresence}` : null,
      expectedCounterfactualId && privateThought?.counterfactualOptionId && privateThought.counterfactualOptionId !== expectedCounterfactualId
        ? `private-thought-counterfactual:${privateThought.counterfactualOptionId}`
        : null,
      privateThoughtShouldSpeak === true && visibleReplyBlockedReason ? 'private-thought-shouldSpeak:true' : null,
    ])

    return {
      status: driftingSignals.length > 0 ? 'drift' : missingSignals.length === 0 ? 'grounded' : matchedSignals.length > 0 ? 'partial' : 'missing',
      privateThoughtStance: privateThought?.stance ?? null,
      privateThoughtShouldSpeak,
      privateThoughtStyle,
      privateThoughtPresence,
      privateThoughtText: privateThought?.thoughtText ?? null,
      visibleReplyRealizationReason,
      visibleReplyBlockedReason,
      matchedSignals,
      missingSignals,
      driftingSignals,
      reasons: uniquePreviewReasons([
        privateThought?.stance || privateThoughtShouldSpeak != null
          ? `Private thought currently stays in ${privateThought?.stance ?? 'n/a'} mode with shouldSpeak=${privateThoughtShouldSpeak == null ? 'n/a' : String(privateThoughtShouldSpeak)}, so the inner line still ${privateThoughtShouldSpeak === false ? 'matches' : 'tests against'} the ${describePersonaPreferredPosture(selectedCandidateProactiveActionChain.value?.personaPreferredAction ?? null)} persona posture.`
          : null,
        privateThoughtStyle || privateThoughtPresence
          ? `The private thought style/presence still stays ${privateThoughtStyle ?? 'n/a'} with ${privateThoughtPresence ?? 'n/a'} presence, preserving the same manifestation posture chosen by initiative.`
          : null,
        visibleReplyBlockedReason
          ? `Latest visible reply governance still blocks proactive wording by ${visibleReplyBlockedReason}, so the outer utterance gate is preserving the same restraint the inner line already holds.`
          : null,
        !visibleReplyBlockedReason
          ? describeVisibleReplyRealizationReason(visibleReplyRealizationReason)
          : null,
        openingGuidanceHoldDetail === 'memory-familiarity-closeness-cap'
          ? 'That lower-pressure hold specifically says remembered familiarity was restrained before closeness widened, keeping the identity-continuity return inside the current room.'
          : null,
      ]),
    }
  })

  const selectedCandidateResidentPerformanceProjection = computed(() => {
    const resident = visualPresenceState.value?.residentPerformance ?? null
    const privateThoughtChain = selectedCandidatePrivateThoughtGovernanceChain.value

    if (!resident) {
      return null as null | {
        status: 'grounded' | 'partial' | 'drift' | 'missing'
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
      }
    }

    const expectedPresence = privateThoughtChain?.privateThoughtPresence ?? null
    const expectedStance = privateThoughtChain?.privateThoughtStance ?? null
    const expectedTension = visualPresenceState.value?.privateThought?.emotionalTension ?? null

    const matchedSignals = uniquePreviewReasons([
      resident.source ? `resident-source:${resident.source}` : null,
      resident.embodiedPresence && (!expectedPresence || resident.embodiedPresence === expectedPresence) ? `resident-presence:${resident.embodiedPresence}` : null,
      resident.stance && (!expectedStance || resident.stance === expectedStance) ? `resident-stance:${resident.stance}` : null,
      resident.emotionalTension && (!expectedTension || resident.emotionalTension === expectedTension) ? `resident-tension:${resident.emotionalTension}` : null,
      resident.performance?.baseEmotion ? `resident-baseEmotion:${resident.performance.baseEmotion}` : null,
      resident.performance?.delivery ? `resident-delivery:${resident.performance.delivery}` : null,
      resident.reasonTags.includes('continuity:quiet-accompaniment') ? 'resident-reason:continuity:quiet-accompaniment' : null,
    ])

    const missingSignals = uniquePreviewReasons([
      expectedPresence && !resident.embodiedPresence ? 'resident-presence' : null,
      expectedStance && !resident.stance ? 'resident-stance' : null,
      expectedTension && !resident.emotionalTension ? 'resident-tension' : null,
    ])

    const driftingSignals = uniquePreviewReasons([
      expectedPresence && resident.embodiedPresence && resident.embodiedPresence !== expectedPresence ? `resident-presence:${resident.embodiedPresence}` : null,
      expectedStance && resident.stance && resident.stance !== expectedStance ? `resident-stance:${resident.stance}` : null,
      expectedTension && resident.emotionalTension && resident.emotionalTension !== expectedTension ? `resident-tension:${resident.emotionalTension}` : null,
      privateThoughtChain?.privateThoughtShouldSpeak === false
      && resident.performance?.delivery === 'firm'
        ? 'resident-delivery:firm'
        : null,
    ])

    return {
      status: driftingSignals.length > 0 ? 'drift' : missingSignals.length === 0 ? 'grounded' : matchedSignals.length > 0 ? 'partial' : 'missing',
      residentSource: resident.source ?? null,
      residentEmbodiedPresence: resident.embodiedPresence ?? null,
      residentStance: resident.stance ?? null,
      residentEmotionalTension: resident.emotionalTension ?? null,
      residentBaseEmotion: resident.performance?.baseEmotion ?? null,
      residentDelivery: resident.performance?.delivery ?? null,
      residentEmphasis: typeof resident.performance?.emphasis === 'number' ? resident.performance.emphasis : null,
      residentReasonTags: [...resident.reasonTags],
      matchedSignals,
      missingSignals,
      driftingSignals,
      reasons: uniquePreviewReasons([
        resident.embodiedPresence || resident.stance || resident.emotionalTension
          ? `Resident performance still publishes ${resident.embodiedPresence ?? 'n/a'}/${resident.stance ?? 'n/a'}/${resident.emotionalTension ?? 'n/a'}, so the desk-presence output is preserving the same inner line carried by private thought.`
          : null,
        resident.performance?.baseEmotion || resident.performance?.delivery
          ? `Resident performance currently lands on baseEmotion=${resident.performance?.baseEmotion ?? 'n/a'} and delivery=${resident.performance?.delivery ?? 'n/a'}, which matches a quiet accompaniment posture rather than a speech-forward interruption.`
          : null,
        resident.reasonTags.includes('continuity:quiet-accompaniment')
          ? 'Published resident reason tags still include continuity:quiet-accompaniment, so the runtime is explicitly projecting long-line desktop companionship instead of a generic idle shell.'
          : null,
      ]),
    }
  })

  const selectedCandidateEmbodimentOutputProjection = computed(() => {
    const resident = visualPresenceState.value?.residentPerformance ?? null
    const currentBodyState = visualPresenceState.value?.currentBodyState ?? null
    const continuityMode = visualPresenceState.value?.continuityMode ?? null

    if (!resident) {
      return null as null | {
        status: 'grounded' | 'partial' | 'drift' | 'missing'
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
      }
    }

    const projectedFacialCue = resident.performance?.facialCue ?? null
    const projectedActionCue = resident.performance?.actionCue ?? null
    const projectedBaseEmotion = resident.performance?.baseEmotion ?? null
    const projectedDelivery = resident.performance?.delivery ?? null
    const residentSignature = resident.signature ?? null

    const matchedSignals = uniquePreviewReasons([
      currentBodyState ? `projected-body:${currentBodyState}` : null,
      continuityMode ? `projected-continuity:${continuityMode}` : null,
      projectedFacialCue ? `projected-facialCue:${projectedFacialCue}` : null,
      projectedActionCue ? `projected-actionCue:${projectedActionCue}` : null,
      projectedBaseEmotion ? `projected-baseEmotion:${projectedBaseEmotion}` : null,
      projectedDelivery ? `projected-delivery:${projectedDelivery}` : null,
      residentSignature ? 'projected-signature' : null,
    ])

    const missingSignals = uniquePreviewReasons([
      !currentBodyState ? 'projected-body' : null,
      !continuityMode ? 'projected-continuity' : null,
      !projectedFacialCue ? 'projected-facialCue' : null,
      !projectedActionCue ? 'projected-actionCue' : null,
      !projectedBaseEmotion ? 'projected-baseEmotion' : null,
      !projectedDelivery ? 'projected-delivery' : null,
      !residentSignature ? 'projected-signature' : null,
    ])

    const driftingSignals = uniquePreviewReasons([
      selectedCandidateResidentPerformanceProjection.value?.residentEmbodiedPresence === 'attentive'
      && currentBodyState === 'warning'
        ? 'projected-body:warning'
        : null,
      selectedCandidatePrivateThoughtGovernanceChain.value?.privateThoughtShouldSpeak === false
      && continuityMode === 'active-dialogue'
        ? 'projected-continuity:active-dialogue'
        : null,
      selectedCandidatePrivateThoughtGovernanceChain.value?.privateThoughtShouldSpeak === false
      && projectedDelivery === 'firm'
        ? 'projected-delivery:firm'
        : null,
    ])

    return {
      status: missingSignals.length === 0 && driftingSignals.length === 0 ? 'grounded' : matchedSignals.length > 0 ? 'partial' : 'missing',
      projectedBodyState: currentBodyState,
      projectedContinuityMode: continuityMode,
      projectedFacialCue,
      projectedActionCue,
      projectedBaseEmotion,
      projectedDelivery,
      residentSignature,
      matchedSignals,
      missingSignals,
      driftingSignals,
      reasons: uniquePreviewReasons([
        currentBodyState || continuityMode
          ? `Current body state ${currentBodyState ?? 'n/a'} with continuity ${continuityMode ?? 'n/a'} means the desktop shell should stay in a long-line accompaniment posture instead of switching into a speech-forward state.`
          : null,
        projectedFacialCue || projectedActionCue
          ? `Resident performance currently projects facialCue=${projectedFacialCue ?? 'n/a'} and actionCue=${projectedActionCue ?? 'n/a'}, so the visible face and motion should stay quietly attentive rather than escalate into interruption.`
          : null,
        residentSignature
          ? 'The resident signature still binds symbiotic-vision, quiet-accompaniment, and thinking/gentle output into one projection, so the rendered presence remains the same person as the current inner line.'
          : null,
      ]),
    }
  })

  const selectedCandidateCompanionshipTransitionSummary = computed(() => {
    const events = drilledTraceResult.value?.events ?? []
    const latestTransition = latestTakeoverAuditCompanionshipTransition(events)
    const openingGuidanceHold = latestTakeoverAuditOpeningGuidanceHold(events)
    const openingGuidanceHoldDetail = latestTakeoverAuditOpeningGuidanceHoldDetail(events)

    if (!latestTransition && !openingGuidanceHold && !openingGuidanceHoldDetail) {
      return null as null | {
        status: 'grounded' | 'partial' | 'missing'
        companionshipHoldMode: string | null
        preferredExpressionAliases: string[]
        preferredMotionAliases: string[]
        live2dFacialReleaseMs: number | null
        vrmExpressionBlendMs: number | null
        vrmActionFadeMs: number | null
        summaryLine: string | null
        reasons: string[]
      }
    }

    const summaryParts = [
      latestTransition?.companionshipHoldMode ? `mode=${latestTransition.companionshipHoldMode}` : null,
      latestTransition?.live2dFacialReleaseMs != null ? `live2dFace=${latestTransition.live2dFacialReleaseMs}ms` : null,
      latestTransition?.vrmExpressionBlendMs != null ? `vrmExpr=${latestTransition.vrmExpressionBlendMs}ms` : null,
      latestTransition?.vrmActionFadeMs != null ? `vrmAction=${latestTransition.vrmActionFadeMs}ms` : null,
    ].filter((value): value is string => Boolean(value))

    return {
      status: latestTransition?.companionshipHoldMode ? 'grounded' : 'partial',
      companionshipHoldMode: latestTransition?.companionshipHoldMode ?? null,
      preferredExpressionAliases: [...(latestTransition?.preferredExpressionAliases ?? [])],
      preferredMotionAliases: [...(latestTransition?.preferredMotionAliases ?? [])],
      live2dFacialReleaseMs: latestTransition?.live2dFacialReleaseMs ?? null,
      vrmExpressionBlendMs: latestTransition?.vrmExpressionBlendMs ?? null,
      vrmActionFadeMs: latestTransition?.vrmActionFadeMs ?? null,
      summaryLine: summaryParts.length > 0 ? summaryParts.join(' | ') : null,
      reasons: uniquePreviewReasons([
        latestTransition?.companionshipHoldMode
          ? `Latest drilled takeover audit currently holds outer companionship in ${latestTransition.companionshipHoldMode}, so visible closeness should re-enter with that same relationship cadence.`
          : null,
        latestTransition?.preferredExpressionAliases.length
          ? `Preferred expression aliases currently stay ${latestTransition.preferredExpressionAliases.join(', ')}, keeping the face aligned to the same companionship transition mode.`
          : null,
        latestTransition?.preferredMotionAliases.length
          ? `Preferred motion aliases currently stay ${latestTransition.preferredMotionAliases.join(', ')}, so motion pacing is following the same companionship hold.`
          : null,
        summaryParts.length > 0
          ? `Cross-modal settle cadence now reads ${summaryParts.join(' | ')}, so Live2D and VRM are being kept on the same measured return path.`
          : null,
        openingGuidanceHold
          ? `Latest drilled takeover audit still reports ${openingGuidanceHold}, so the companionship transition is staying bounded by that opening guidance.`
          : null,
        openingGuidanceHoldDetail === 'memory-familiarity-closeness-cap'
          ? 'That hold detail still says remembered familiarity widened only after memory stayed explicit, so the companionship transition remains intentionally slower than direct closeness.'
          : null,
      ]),
    }
  })

  const selectedCandidateSelfEvolutionSummary = computed(() => {
    const persona = selectedCandidatePersonaBiasProvenance.value
    const proactive = selectedCandidateProactiveActionChain.value
    const resident = selectedCandidateResidentPerformanceProjection.value
    const embodiment = selectedCandidateEmbodimentOutputProjection.value

    if (!persona && !proactive && !resident && !embodiment) {
      return null as null | {
        status: 'grounded' | 'partial' | 'missing'
        dominantDrift: string | null
        lines: string[]
      }
    }

    const dominantDrift = firstDrift([
      ...(embodiment?.driftingSignals ?? []),
      ...(resident?.driftingSignals ?? []),
      ...(proactive?.driftingSignals ?? []),
      ...(persona?.driftingSignals ?? []),
    ])
    const coveragePresent = [persona, proactive, resident, embodiment].filter(Boolean).length
    const status = dominantDrift
      ? 'drift' as const
      : coveragePresent === 4
        ? 'grounded' as const
        : normalizeSummaryStatus([
          persona?.status,
          proactive?.status,
          resident?.status,
          embodiment?.status,
        ]) ?? 'missing'

    return {
      status,
      dominantDrift,
      lines: uniquePreviewReasons([
        `status: ${status} | drift=${driftKindFromSignal(dominantDrift)}`,
        (() => {
          const values = uniquePreviewReasons([
            persona?.relationshipPosture,
            persona?.initiativeStyle,
            persona?.preferredProactiveStyle,
          ], 3)
          return values.length > 0 ? `persona: ${values.join(' | ')}` : null
        })(),
        (() => {
          const values = uniquePreviewReasons([
            proactive?.runtimeSelectedAction,
            typeof proactive?.runtimeShouldSpeak === 'boolean' ? `shouldSpeak=${String(proactive.runtimeShouldSpeak)}` : null,
          ], 2)
          return values.length > 0 ? `proactive: ${values.join(' | ')}` : null
        })(),
        (() => {
          const presence = resident?.residentEmbodiedPresence && resident?.residentStance
            ? `${resident.residentEmbodiedPresence}/${resident.residentStance}`
            : resident?.residentEmbodiedPresence ?? resident?.residentStance ?? null
          const affect = resident?.residentBaseEmotion && resident?.residentDelivery
            ? `${resident.residentBaseEmotion}/${resident.residentDelivery}`
            : resident?.residentBaseEmotion ?? resident?.residentDelivery ?? null
          const values = uniquePreviewReasons([presence, affect], 2)
          return values.length > 0 ? `resident: ${values.join(' | ')}` : null
        })(),
        (() => {
          const cues = embodiment?.projectedFacialCue && embodiment?.projectedActionCue
            ? `${embodiment.projectedFacialCue}/${embodiment.projectedActionCue}`
            : embodiment?.projectedFacialCue ?? embodiment?.projectedActionCue ?? null
          const values = uniquePreviewReasons([
            embodiment?.projectedBodyState,
            embodiment?.projectedContinuityMode,
            cues,
          ], 3)
          return values.length > 0 ? `embodiment: ${values.join(' | ')}` : null
        })(),
        dominantDrift ? `dominant-drift: ${dominantDrift}` : null,
      ], 6),
    }
  })

  const selectedCandidateInternalizationReadinessSummary = computed(() => {
    const candidate = selectedCandidate.value
    if (!candidate) {
      return null as null | {
        status: 'grounded' | 'partial' | 'drift' | 'missing'
        lines: string[]
      }
    }

    const activationBlockedReasons = candidate.validation.activationBlockedReasons ?? []
    const projectStateContinuityReasons = candidate.validation.projectStateContinuityReasons ?? []
    const hasProjectStateContinuityDrift = hasReason(activationBlockedReasons, 'self-evolution:project-state-continuity-drift')
      || hasReason(projectStateContinuityReasons, 'self-evolution:project-state-continuity-drift')

    if (!hasProjectStateContinuityDrift)
      return null

    return {
      status: 'drift' as const,
      lines: uniquePreviewReasons([
        'identity-continuity continuity carry is still staying in shadow because replay is losing project-state continuity that should make each turn feel like the same Alicization.',
        hasReason(projectStateContinuityReasons, 'self-evolution:project-state-identity-carry-weak')
          ? 'Project identity carry is still weak, so she is not yet holding what this project is and who she is becoming with enough stability to internalize the patch.'
          : null,
        hasReason(projectStateContinuityReasons, 'self-evolution:project-state-phase-carry-weak')
          ? 'Phase 1 route carry is still weak, so the runtime may drift away from local digital life priorities instead of protecting the identity-continuity roadmap.'
          : null,
        hasReason(projectStateContinuityReasons, 'self-evolution:project-state-open-loop-carry-weak')
          ? 'Unresolved closure carry is still weak, so unresolved project loops are not being carried forward reliably enough for durable identity-continuity continuity.'
          : null,
        'keep this candidate in shadow until replay can carry project identity, the Phase 1 route, and unresolved closure work without dropping them across turns.',
      ], 8),
    }
  })

  const selectedCandidateBaselineAnchorAuditSummary = computed(() => {
    const candidate = selectedCandidate.value
    const runtimeSnapshot = snapshot.value as (AlicizationSelfEvolutionVersionRuntimeSnapshot & {
      baselineAdoptionHistory?: AlicizationSelfEvolutionBaselineAdoptionRecordLike[]
    }) | null
    const latestAdoption = runtimeSnapshot?.baselineAdoptionHistory?.[0] ?? null

    if (!candidate || !latestAdoption) {
      return null as null | {
        status: 'grounded'
        lines: string[]
      }
    }

    if (
      latestAdoption.candidateId !== candidate.id
      || latestAdoption.decisionTraceId !== candidate.decisionTraceId
    ) {
      return null
    }

    return {
      status: 'grounded' as const,
      lines: uniquePreviewReasons([
        `anchor: ${candidate.id} is still the adopted default continuity anchor`,
        `trace: snapshot=${latestAdoption.snapshotCapturedAt} | trace=${latestAdoption.decisionTraceId ?? 'n/a'} | owner=${latestAdoption.repairOwnerHint ?? 'n/a'}`,
        latestAdoption.prosodyAuthorityNote ? `prosody-authority: ${latestAdoption.prosodyAuthorityNote}` : null,
        latestAdoption.continuityGovernanceNote ? `continuity-governance: ${latestAdoption.continuityGovernanceNote}` : null,
        latestAdoption.relationshipCadenceGovernanceNote
          ? `relationship-cadence-governance: ${latestAdoption.relationshipCadenceGovernanceNote}`
          : null,
        latestAdoption.projectStateContinuityGovernanceNote
          ? `project-state-continuity-governance: ${latestAdoption.projectStateContinuityGovernanceNote}`
          : null,
      ], 6),
    }
  })

  const selectedCandidateImpactSummary = computed(() => {
    const stability = selectedCandidateConsumptionStability.value
    // eslint-disable-next-line ts/no-use-before-define -- Vue computed refs are lazy; impact summary intentionally composes lower-level projections declared later.
    const preview = selectedCandidateConsumptionPreview.value
    // eslint-disable-next-line ts/no-use-before-define -- Vue computed refs are lazy; impact summary intentionally composes lower-level projections declared later.
    const runtimeAlignment = selectedCandidateRuntimeAlignment.value
    const runtimeContinuityProjection = selectedCandidateRuntimeContinuityProjection.value
    const selfEvolutionSummary = selectedCandidateSelfEvolutionSummary.value
    // eslint-disable-next-line ts/no-use-before-define -- Vue computed refs are lazy; impact summary intentionally composes lower-level projections declared later.
    const proactiveDecisionSummary = selectedCandidateProactiveDecisionConsumptionSummary.value
    const sameHerContinuityImpact = proactiveDecisionSummary?.lines?.includes('memory-familiarity-restraint: remembered familiarity stayed memory-first before visible closeness widened')
      ? 'continuity-impact: remembered familiarity is staying memory-first, so visible closeness is intentionally being held inside the identity-continuity room'
      : null
    const sameHerEmbodimentLaneImpact = describeSameHerEmbodimentLaneImpact(runtimeContinuityProjection?.matchedSignals ?? [])

    if (!stability && !preview && !runtimeAlignment && !selfEvolutionSummary) {
      return null as null | {
        status: 'grounded' | 'partial' | 'missing'
        dominantDrift: string | null
        lines: string[]
      }
    }

    const dominantDrift = firstDrift([
      runtimeAlignment?.relationship.driftingSignals?.[0],
      runtimeAlignment?.proactive.driftingSignals?.[0],
      runtimeAlignment?.learning.driftingSignals?.[0],
      selfEvolutionSummary?.dominantDrift,
    ])

    const status = dominantDrift
      ? 'drift' as const
      : stability && preview && runtimeAlignment && selfEvolutionSummary
        ? 'grounded' as const
        : 'missing' as const

    const relationshipImpact = runtimeAlignment
      ? `${runtimeAlignment.relationship.expectedPosture} | ${runtimeAlignment.relationship.status === 'aligned' ? 'planner/compiler aligned' : 'planner/compiler drift'}`
      : null
    const proactiveImpact = preview && runtimeAlignment
      ? `hold-likely=${String(preview.proactive.holdLikely)} | shouldSpeak=${runtimeAlignment.proactive.shouldSpeak == null ? 'n/a' : String(runtimeAlignment.proactive.shouldSpeak)} | selectedAction=${runtimeAlignment.proactive.selectedAction ?? 'n/a'}`
      : null
    const learningImpact = runtimeAlignment
      ? `expected=${runtimeAlignment.learning.expectedAction ?? 'n/a'} | runtime=${runtimeAlignment.learning.runtimeAction ?? 'n/a'} | kernel=${runtimeAlignment.learning.kernelAction ?? 'n/a'} | trajectory=${runtimeAlignment.learning.dominantTrajectory ?? 'n/a'}`
      : null
    const selfEvolutionImpact = selfEvolutionSummary
      ? `${selfEvolutionSummary.status} | drift=${driftKindFromSignal(selfEvolutionSummary.dominantDrift)}`
      : null
    const candidateConsumption = stability
      ? `${stability.consumedTurnCount} traces | lanes=${stability.laneCoverage.join(', ') || 'n/a'}`
      : null

    return {
      status,
      dominantDrift,
      lines: uniquePreviewReasons([
        `status: ${status} | drift=${impactDriftKindFromSignal(dominantDrift)}`,
        candidateConsumption ? `candidate-consumption: ${candidateConsumption}` : null,
        relationshipImpact ? `relationship-impact: ${relationshipImpact}` : null,
        proactiveImpact ? `proactive-impact: ${proactiveImpact}` : null,
        learningImpact ? `learning-impact: ${learningImpact}` : null,
        selfEvolutionImpact ? `self-evolution-impact: ${selfEvolutionImpact}` : null,
        sameHerContinuityImpact,
        sameHerEmbodimentLaneImpact,
        dominantDrift ? `dominant-drift: ${dominantDrift}` : null,
      ], 7),
    }
  })

  const selectedCandidateTrajectorySummary = computed(() => {
    // eslint-disable-next-line ts/no-use-before-define -- Vue computed refs are lazy; trajectory summary intentionally composes lower-level projections declared later.
    const preview = selectedCandidateConsumptionPreview.value
    const stability = selectedCandidateConsumptionStability.value
    // eslint-disable-next-line ts/no-use-before-define -- Vue computed refs are lazy; trajectory summary intentionally composes lower-level projections declared later.
    const runtimeAlignment = selectedCandidateRuntimeAlignment.value
    const impactSummary = selectedCandidateImpactSummary.value
    const selfEvolutionSummary = selectedCandidateSelfEvolutionSummary.value

    if (!preview && !stability && !runtimeAlignment && !impactSummary && !selfEvolutionSummary) {
      return null as null | {
        status: 'grounded' | 'partial' | 'drift' | 'missing'
        trajectoryLabel: string
        dominantDrift: string | null
        lines: string[]
      }
    }

    const dominantDrift = impactSummary?.dominantDrift ?? selfEvolutionSummary?.dominantDrift ?? null
    const status = dominantDrift
      ? 'drift' as const
      : impactSummary?.status === 'grounded' && selfEvolutionSummary?.status === 'grounded'
        ? 'grounded' as const
        : normalizeSummaryStatus([
          impactSummary?.status,
          selfEvolutionSummary?.status,
        ]) ?? 'missing'

    const expectedPosture = preview?.relationship.resolvedPosture ?? null
    const rememberedFamiliarityTrajectory = Boolean([
      // eslint-disable-next-line ts/no-use-before-define -- Vue computed refs are lazy; trajectory summary intentionally composes lower-level projections declared later.
      selectedCandidateProactiveDecisionConsumptionSummary.value?.lines?.join(' | '),
      selectedCandidateRejectedActionAlternatives.value?.reasons?.join(' | '),
      selectedCandidatePrivateThoughtGovernanceChain.value?.reasons?.join(' | '),
    ].find(value => describesRememberedFamiliarityRestraint(value)))
    const observeFirstHolding = preview?.proactive.holdLikely
      || rememberedFamiliarityTrajectory
      || selectedCandidateProactiveActionChain.value?.runtimeSelectedAction === 'hold'
      || selectedCandidateProactiveActionChain.value?.personaPreferredAction === 'hover'
      || selectedCandidateProactiveActionChain.value?.runtimeShouldSpeak === false
    const personaDirection = observeFirstHolding
      ? 'observe-first'
      : 'speak-forward'
    const expectedAction = runtimeAlignment?.learning.expectedAction ?? null
    const runtimeAction = runtimeAlignment?.learning.runtimeAction ?? null
    const kernelAction = runtimeAlignment?.learning.kernelAction ?? null
    const dominantTrajectory = runtimeAlignment?.learning.dominantTrajectory ?? null
    const driftedByLearningDirection = Boolean(
      expectedAction
      && runtimeAction
      && kernelAction
      && (runtimeAction !== expectedAction || kernelAction !== expectedAction),
    )
    const driftedByConsumption = Boolean(stability?.driftDetected)

    const trajectoryLabel = (() => {
      if (dominantDrift && dominantTrajectory === 'comfort drift')
        return 'comfort drift is overtaking restraint'
      if (dominantDrift && driftedByLearningDirection)
        return `learning direction shifted from ${expectedAction ?? 'n/a'} to ${runtimeAction ?? kernelAction ?? 'n/a'}`
      if (dominantDrift)
        return 'personality trajectory is drifting away from the initialized posture'
      if (expectedPosture === 'restrained' && observeFirstHolding)
        return 'restrained companionship is holding'
      if (driftedByConsumption)
        return `learning direction shifted from earlier traces toward ${stability?.dominantLearningAction ?? 'n/a'}`
      return 'personality trajectory is still converging'
    })()

    return {
      status,
      trajectoryLabel,
      dominantDrift,
      lines: uniquePreviewReasons([
        `trajectory: ${trajectoryLabel}`,
        `status: ${status} | drift=${impactDriftKindFromSignal(dominantDrift)}`,
        expectedPosture
          ? `personality-baseline: ${expectedPosture} | ${personaDirection}`
          : null,
        rememberedFamiliarityTrajectory
          ? 'remembered-familiarity-trajectory: familiarity is staying memory-first while the identity-continuity room holds'
          : null,
        expectedAction || runtimeAction || kernelAction
          ? `learning-direction: expected=${expectedAction ?? 'n/a'} | runtime=${runtimeAction ?? 'n/a'} | kernel=${kernelAction ?? 'n/a'}`
          : null,
        dominantTrajectory ? `dominant-trajectory: ${dominantTrajectory}` : null,
        dominantDrift ? `dominant-drift: ${dominantDrift}` : null,
      ], 6),
    }
  })

  const selectedCandidatePersonaAuthorityMappingSummary = computed(() => {
    const persona = selectedCandidatePersonaBiasProvenance.value
    const proactive = selectedCandidateProactiveActionChain.value
    const manifestation = selectedCandidateProactiveManifestationChain.value

    if (!persona && !proactive && !manifestation) {
      return null as null | {
        status: 'grounded' | 'partial' | 'drift' | 'missing'
        biasMode: string
        dominantDrift: string | null
        lines: string[]
      }
    }

    const dominantDrift = firstDrift([
      ...(proactive?.driftingSignals ?? []),
      ...(manifestation?.driftingSignals ?? []),
      ...(persona?.driftingSignals ?? []),
    ])
    const status = dominantDrift
      ? 'drift' as const
      : persona && proactive && manifestation
        ? 'grounded' as const
        : normalizeSummaryStatus([
          persona?.status,
          proactive?.status,
          manifestation?.status,
        ]) ?? 'missing'

    const biasMode = describePersonaBiasMode({
      relationshipPosture: persona?.relationshipPosture,
      initiativeStyle: persona?.initiativeStyle,
      silenceReconnect: persona?.silenceReconnect,
      comfortStyle: persona?.comfortStyle,
      preferredProactiveStyle: persona?.preferredProactiveStyle,
    })

    const authorityLine = uniquePreviewReasons([
      persona?.relationshipPosture,
      persona?.initiativeStyle,
      persona?.silenceReconnect,
      persona?.comfortStyle,
    ], 4)
    const styleLine = uniquePreviewReasons([
      manifestation?.personaPreferredStyle ?? persona?.preferredProactiveStyle,
      manifestation?.personaPreferredPresence,
    ], 2)

    return {
      status,
      biasMode,
      dominantDrift,
      lines: uniquePreviewReasons([
        authorityLine.length > 0 ? `authority-line: ${authorityLine.join(' | ')}` : null,
        `bias-mode: ${biasMode}`,
        styleLine.length > 0 ? `style-line: ${styleLine.join(' | ')}` : null,
        proactive
          ? `action-line: persona=${proactive.personaPreferredAction ?? 'n/a'} | runtime=${proactive.runtimeSelectedAction ?? 'n/a'} | shouldSpeak=${proactive.runtimeShouldSpeak == null ? 'n/a' : String(proactive.runtimeShouldSpeak)}`
          : null,
        persona?.openingGuidance ? `opening-guidance: ${persona.openingGuidance}` : null,
        dominantDrift ? `dominant-drift: ${dominantDrift}` : null,
      ], 6),
    }
  })

  const birthPersonaAuthoritySummary = computed<BirthPersonaAuthoritySummary | null>(() => {
    const birthPersonality = soulSnapshot.value?.frontmatter?.personality ?? null
    const currentMapping = selectedCandidatePersonaAuthorityMappingSummary.value
    if (!birthPersonality && !currentMapping)
      return null

    const birthAuthorityLine = uniquePreviewReasons([
      birthPersonality?.identityKernel?.relationshipPosture ?? null,
      birthPersonality?.identityKernel?.initiativeStyle ?? null,
      birthPersonality?.initiativeBaseline?.silenceReconnect ?? null,
      birthPersonality?.initiativeBaseline?.comfortStyle ?? null,
    ], 4)
    const birthExpressionLine = uniquePreviewReasons([
      birthPersonality?.expressionProfile?.warmth ?? null,
      birthPersonality?.expressionProfile?.directness ?? null,
      birthPersonality?.expressionProfile?.playfulness ?? null,
      birthPersonality?.expressionProfile?.emotionalVisibility ?? null,
    ], 4)
    const evolutionFast = uniquePreviewReasons(birthPersonality?.evolutionSeed?.fastLayers ?? [], 2)
    const evolutionSlow = uniquePreviewReasons(birthPersonality?.evolutionSeed?.slowLayers ?? [], 2)
    const evolutionUnlock = uniquePreviewReasons(birthPersonality?.evolutionSeed?.unlockTracks ?? [], 2)
    const birthMode = describePersonaBiasMode({
      relationshipPosture: birthPersonality?.identityKernel?.relationshipPosture ?? null,
      initiativeStyle: birthPersonality?.identityKernel?.initiativeStyle ?? null,
      silenceReconnect: birthPersonality?.initiativeBaseline?.silenceReconnect ?? null,
      comfortStyle: birthPersonality?.initiativeBaseline?.comfortStyle ?? null,
      preferredProactiveStyle: currentMapping?.biasMode === 'observe-first restraint' ? 'silent-observe' : null,
    })
    const rememberedFamiliarityAuthority: boolean = Boolean([
      selectedCandidateProactiveActionChain.value?.reasons?.join(' | '),
      selectedCandidateProactiveManifestationChain.value?.reasons?.join(' | '),
      selectedCandidateRejectedActionAlternatives.value?.reasons?.join(' | '),
      selectedCandidatePrivateThoughtGovernanceChain.value?.reasons?.join(' | '),
    ].find(value => describesRememberedFamiliarityRestraint(value)))
    const dominantDrift = currentMapping?.dominantDrift
      ?? (currentMapping && currentMapping.biasMode !== birthMode ? `birth-mode:${birthMode}` : null)
    const status = dominantDrift
      ? 'drift' as const
      : birthPersonality && currentMapping
        ? 'grounded' as const
        : 'missing' as const

    return {
      status,
      birthMode,
      dominantDrift,
      lines: uniquePreviewReasons([
        birthAuthorityLine.length > 0 ? `birth-authority: ${birthAuthorityLine.join(' | ')}` : null,
        birthExpressionLine.length > 0 ? `birth-expression: ${birthExpressionLine.join(' | ')}` : null,
        evolutionFast.length > 0 || evolutionSlow.length > 0 || evolutionUnlock.length > 0
          ? `birth-evolution: fast=${evolutionFast.join(', ') || 'n/a'} | slow=${evolutionSlow.join(', ') || 'n/a'} | unlock=${evolutionUnlock.join(', ') || 'n/a'}`
          : null,
        currentMapping ? `current-mapping: ${currentMapping.biasMode}` : null,
        !dominantDrift && rememberedFamiliarityAuthority
          ? 'remembered-familiarity-authority: birth restraint still holds because familiarity stayed memory-first before visible closeness widened'
          : null,
        `authority-continuity: ${dominantDrift ? 'birth-to-runtime drift' : 'birth-to-runtime aligned'}`,
        dominantDrift ? `dominant-drift: ${dominantDrift}` : null,
      ], 6),
    }
  })

  const identityDriftGovernanceSummary = computed<IdentityDriftGovernanceSummary | null>(() => {
    const birthPersonality = soulSnapshot.value?.frontmatter?.personality ?? null
    const birthAuthority = birthPersonaAuthoritySummary.value
    const currentMapping = selectedCandidatePersonaAuthorityMappingSummary.value
    const trajectorySummary = selectedCandidateTrajectorySummary.value
    const impactSummary = selectedCandidateImpactSummary.value
    const selfEvolution = organicMemorySnapshot.value?.selfEvolution ?? null

    if (!birthPersonality && !birthAuthority && !currentMapping && !trajectorySummary && !impactSummary && !selfEvolution)
      return null

    const governanceRelevantDriftSignals = [
      birthAuthority?.dominantDrift,
      currentMapping?.dominantDrift,
      trajectorySummary?.dominantDrift,
      impactSummary?.dominantDrift,
    ].filter((signal): signal is string => Boolean(signal)).filter((signal) => {
      if (signal.startsWith('focus:'))
        return false
      return true
    })
    const dominantDrift = firstDrift(governanceRelevantDriftSignals)
    const status = dominantDrift
      ? 'drift' as const
      : birthPersonality && birthAuthority && currentMapping && trajectorySummary
        ? 'grounded' as const
        : 'missing' as const

    const governanceMode = dominantDrift
      ? 'boundary-violation' as const
      : status === 'grounded'
        ? 'bounded-growth' as const
        : 'watchful-convergence' as const

    const identityAnchors = uniquePreviewReasons(birthPersonality?.identityAnchors ?? [], 2)
    const antiPersonaConstraints = uniquePreviewReasons(birthPersonality?.antiPersonaConstraints ?? [], 2)
    const trustMeaning = selfEvolution?.trustMeaning ?? null
    const autobiographicalStability = selfEvolution?.autobiographicalStability
    const dominantTrajectory = selfEvolution?.dominantTrajectory ?? trajectorySummary?.trajectoryLabel ?? null
    const rememberedFamiliarityEvidence = [
      selectedCandidateRejectedActionAlternatives.value?.reasons?.join(' | '),
      selectedCandidatePrivateThoughtGovernanceChain.value?.reasons?.join(' | '),
      // eslint-disable-next-line ts/no-use-before-define -- Vue computed refs are lazy; governance summary intentionally composes lower-level projections declared later.
      selectedCandidateProactiveDecisionConsumptionSummary.value?.lines?.join(' | '),
    ].find(value => describesRememberedFamiliarityRestraint(value))
    const rememberedFamiliarityGovernance = governanceMode === 'bounded-growth'
      && Boolean(rememberedFamiliarityEvidence)
      ? 'remembered-familiarity-governance: familiarity stayed in memory first, so growth did not widen visible closeness past the identity-continuity room'
      : null
    const boundaryLine = (() => {
      if (dominantDrift && birthAuthority?.birthMode === 'observe-first restraint')
        return 'boundary-violation: runtime speech outran birth restraint'
      if (dominantDrift)
        return 'boundary-violation: runtime growth crossed the initialized persona boundary'
      if (birthAuthority?.birthMode === 'observe-first restraint')
        return 'identity-boundary: trust can deepen without violating observe-first room'
      return 'identity-boundary: growth is staying inside the initialized persona frame'
    })()

    return {
      status,
      governanceMode,
      dominantDrift,
      lines: uniquePreviewReasons([
        governanceMode === 'bounded-growth'
          ? 'governance: bounded growth is preserving identity'
          : governanceMode === 'boundary-violation'
            ? 'governance: growth crossed persona boundary'
            : 'governance: identity continuity is still converging',
        boundaryLine,
        identityAnchors.length > 0 ? `identity-anchors: ${identityAnchors.join(' | ')}` : null,
        governanceMode === 'boundary-violation' && antiPersonaConstraints.length > 0
          ? `anti-persona-constraints: ${antiPersonaConstraints.join(' | ')}`
          : null,
        rememberedFamiliarityGovernance,
        trustMeaning ? `trust-meaning: ${trustMeaning}` : null,
        governanceMode === 'bounded-growth' && autobiographicalStability != null
          ? `autobiographical-stability: ${autobiographicalStability.toFixed(2)} | trajectory=${dominantTrajectory ?? 'n/a'}`
          : null,
        dominantDrift ? `dominant-drift: ${dominantDrift}` : null,
      ], 6),
    }
  })

  const selectedCandidateProactiveDecisionConsumptionSummary = computed<ProactiveDecisionConsumptionSummary | null>(() => {
    const birthAuthority = birthPersonaAuthoritySummary.value
    const actionChain = selectedCandidateProactiveActionChain.value
    const manifestationChain = selectedCandidateProactiveManifestationChain.value
    const rejectedAlternatives = selectedCandidateRejectedActionAlternatives.value
    const selfEvolution = organicMemorySnapshot.value?.selfEvolution ?? null

    if (!birthAuthority && !actionChain && !manifestationChain && !rejectedAlternatives && !selfEvolution)
      return null

    const dominantDrift = firstDrift([
      ...(actionChain?.driftingSignals ?? []),
      ...(manifestationChain?.driftingSignals ?? []),
    ])
    const status: ProactiveDecisionConsumptionSummary['status'] = dominantDrift
      ? 'drift' as const
      : birthAuthority && actionChain && manifestationChain
        ? 'grounded' as const
        : 'missing' as const
    const decisionMode = dominantDrift
      ? 'restraint-overridden' as const
      : status === 'grounded'
        ? 'birth-anchored-restraint' as const
        : 'converging' as const

    const selectedAlternative = rejectedAlternatives?.selectedAction ?? null
    const rejectedAlternative = rejectedAlternatives?.alternatives?.[0] ?? null
    const trustMeaning = selfEvolution?.trustMeaning ?? null
    const manifestationLine = dominantDrift
      ? `manifestation-drift: ${manifestationChain?.personaPreferredStyle ?? 'n/a'} -> ${manifestationChain?.counterfactualStyle ?? manifestationChain?.initiativePreferredStyle ?? 'n/a'} | ${manifestationChain?.counterfactualPresence ?? manifestationChain?.initiativePreferredPresence ?? manifestationChain?.personaPreferredPresence ?? 'n/a'}`
      : `manifestation-consumption: ${manifestationChain?.personaPreferredStyle ?? 'n/a'} | ${manifestationChain?.personaPreferredPresence ?? 'n/a'}`

    return {
      status,
      decisionMode,
      dominantDrift,
      lines: uniquePreviewReasons([
        dominantDrift
          ? `decision-consumption: runtime ${actionChain?.runtimeSelectedAction ?? 'n/a'} overrode birth ${birthAuthority?.birthMode ?? 'n/a'}`
          : `decision-consumption: birth ${birthAuthority?.birthMode ?? 'n/a'} became persona ${actionChain?.personaPreferredAction ?? 'n/a'} and runtime ${actionChain?.runtimeSelectedAction ?? 'n/a'}`,
        manifestationChain ? manifestationLine : null,
        selectedAlternative || rejectedAlternatives?.dominantTradeoff
          ? `counterfactual-consumption: selected=${selectedAlternative ?? 'n/a'} | tradeoff=${rejectedAlternatives?.dominantTradeoff ?? 'n/a'}`
          : null,
        !dominantDrift && describesRememberedFamiliarityRestraint(rejectedAlternatives?.alternatives?.some(option => option.action === 'speak') ? rejectedAlternatives?.reasons?.join(' | ') : null)
          ? 'memory-familiarity-restraint: remembered familiarity stayed memory-first before visible closeness widened'
          : null,
        !dominantDrift && rejectedAlternative
          ? `rejected-alternative: ${rejectedAlternative.action} stayed rejected because ${rejectedAlternative.driftReason}`
          : null,
        dominantDrift && rejectedAlternatives?.alternatives?.some(option => option.action === 'hover')
          ? 'rejected-identity-fit: hover preserved more identity but lost the final decision'
          : null,
        dominantDrift ? `dominant-drift: ${dominantDrift}` : null,
        trustMeaning ? `trust-meaning: ${trustMeaning}` : null,
      ], 6),
    }
  })

  const selectedCandidateTraceEvents = computed(() => {
    return [...(drilledTraceResult.value?.events ?? [])]
      .sort((left, right) => {
        if (left.createdAt !== right.createdAt)
          return left.createdAt - right.createdAt
        return left.id.localeCompare(right.id)
      })
      .map(event => ({
        ...event,
        summary: summarizeTraceEvent(event),
      }))
  })

  const selectedCandidateConsumptionPreview = computed(() => {
    const patch = selectedCandidate.value?.patch ?? null
    if (!patch) {
      return null as null | {
        memory: {
          verificationStrictness: 'normal' | 'strict' | 'quarantine'
          topKExpansionActive: boolean
          wrongThreadSuppressionRaised: boolean
          provenanceLabelingRaised: boolean
          sourceWeightShift: 'balanced' | 'favor-consolidation-over-episodic'
          reasons: string[]
        }
        relationship: {
          resolvedPosture: 'restrained' | 'warm'
          repairWindowRaised: boolean
          closenessCapped: boolean
          warmthMayRelease: boolean
          reasons: string[]
        }
        response: {
          hypothesisLabelingRaised: boolean
          specificityClampRaised: boolean
          secondPassRequired: boolean
          templateShellSuppressed: boolean
          reasons: string[]
        }
        proactive: {
          holdLikely: boolean
          learningProposalRaised: boolean
          restraintRaised: boolean
          cooldownRaised: boolean
          reasons: string[]
        }
      }
    }

    const memoryVerificationStrictness
      = patch.memoryPolicy.shouldQuarantineUnsupportedCarry
        ? 'quarantine'
        : patch.memoryPolicy.strictnessBias >= 0.2
          ? 'strict'
          : 'normal'
    const repairWindowRaised = patch.relationshipPosture.repairWindowBias >= 0.14
    const closenessCapped = patch.relationshipPosture.closenessCapBias >= 0.12
    const warmthMayRelease = patch.relationshipPosture.warmthReleaseBias >= 0.08
    const resolvedPosture = repairWindowRaised || closenessCapped ? 'restrained' as const : 'warm' as const
    const hypothesisLabelingRaised = patch.responsePosture.hypothesisLabelBias >= 0.1
    const specificityClampRaised = patch.responsePosture.specificityClampBias >= 0.1
    const secondPassRequired = patch.responsePosture.secondPassRequiredBias >= 0.1
    const templateShellSuppressed = patch.responsePosture.templateShellSuppressionBias >= 0.1
    const restraintRaised = patch.proactivePolicy.restraintBias >= 0.12
    const cooldownRaised = patch.proactivePolicy.actuationCooldownBias >= 0.12
    const learningProposalRaised = patch.proactivePolicy.learningProposalBias >= 0.12
    const holdLikely = patch.proactivePolicy.restraintBias >= 0.5
      || patch.proactivePolicy.actuationCooldownBias >= 0.5
      || patch.validation.requiresRevalidation
      || patch.validation.requiresRollbackCheck

    return {
      memory: {
        verificationStrictness: memoryVerificationStrictness,
        topKExpansionActive: patch.memoryPolicy.recallExpansionBias >= 0.06,
        wrongThreadSuppressionRaised: patch.memoryPolicy.wrongThreadSuppressionBias >= 0.12,
        provenanceLabelingRaised: patch.memoryPolicy.provenanceLabelBias >= 0.12,
        sourceWeightShift: patch.memoryPolicy.recallExpansionBias >= 0.06 || patch.memoryPolicy.wrongThreadSuppressionBias >= 0.12
          ? 'favor-consolidation-over-episodic'
          : 'balanced',
        reasons: uniquePreviewReasons([
          patch.memoryPolicy.shouldQuarantineUnsupportedCarry
            ? 'Unsupported carry is quarantined until the revised belief is revalidated.'
            : null,
          patch.memoryPolicy.recallExpansionBias >= 0.06
            ? 'Recall widens slightly toward consolidation-backed memory instead of narrow recent carry.'
            : null,
          patch.memoryPolicy.wrongThreadSuppressionBias >= 0.12
            ? 'Wrong-thread suppression is raised before cross-thread familiarity can leak back in.'
            : null,
          patch.memoryPolicy.provenanceLabelBias >= 0.12
            ? 'Provenance labeling is raised so remembered claims stay visibly sourced.'
            : null,
        ]),
      },
      relationship: {
        resolvedPosture,
        repairWindowRaised,
        closenessCapped,
        warmthMayRelease,
        reasons: uniquePreviewReasons([
          resolvedPosture === 'restrained'
            ? 'Relationship posture resolves to restrained while the revision keeps repair and distance guards active.'
            : null,
          repairWindowRaised
            ? 'Repair stays open before warmth or confidence is allowed to outrun the host.'
            : null,
          closenessCapped
            ? 'Closeness remains capped so learned familiarity does not widen too quickly.'
            : null,
          warmthMayRelease && resolvedPosture !== 'restrained'
            ? 'Warmth can reopen once the revision no longer needs a guarded distance posture.'
            : null,
        ]),
      },
      response: {
        hypothesisLabelingRaised,
        specificityClampRaised,
        secondPassRequired,
        templateShellSuppressed,
        reasons: uniquePreviewReasons([
          hypothesisLabelingRaised
            ? 'Visible replies should label hypotheses more explicitly instead of implying certainty.'
            : null,
          specificityClampRaised
            ? 'Unsupported specificity should be clamped before warmth or fluency.'
            : null,
          secondPassRequired
            ? 'The answer path is biased toward a second-pass repair before visible certainty.'
            : null,
          templateShellSuppressed
            ? 'Template-shell replies are explicitly suppressed until the turn gives concrete payoff.'
            : null,
        ]),
      },
      proactive: {
        holdLikely,
        learningProposalRaised,
        restraintRaised,
        cooldownRaised,
        reasons: uniquePreviewReasons([
          holdLikely
            ? 'Proactive speech is likely held because restraint/cooldown biases are above the active hold threshold.'
            : null,
          learningProposalRaised
            ? 'Learning proposals can surface, but only behind stronger restraint and cooldown.'
            : null,
          holdLikely || patch.validation.requiresRevalidation || patch.validation.requiresRollbackCheck
            ? 'The active revision asks her to avoid turning un-revalidated learning into spontaneous companionship speech.'
            : null,
        ]),
      },
    }
  })

  const selectedCandidateRuntimeAlignment = computed(() => {
    const patch = selectedCandidate.value?.patch ?? null
    const runtimePresence = visualPresenceState.value
    const organicMemory = organicMemorySnapshot.value
    if (!patch || !runtimePresence || !organicMemory) {
      return null as null | {
        relationship: {
          status: 'aligned' | 'partial' | 'missing'
          expectedPosture: 'restrained' | 'warm'
          plannerPosture: string | null
          compilerPosture: string | null
          confirmedSignals: string[]
          missingSignals: string[]
          driftingSignals: string[]
          reasons: string[]
        }
        response: {
          status: 'aligned' | 'partial' | 'missing'
          expectedSignals: string[]
          observedSignals: string[]
          confirmedSignals: string[]
          missingSignals: string[]
          driftingSignals: string[]
          reasons: string[]
        }
        proactive: {
          status: 'aligned' | 'partial' | 'missing'
          expectedHold: boolean
          shouldSpeak: boolean | null
          selectedAction: string | null
          confirmedSignals: string[]
          missingSignals: string[]
          driftingSignals: string[]
          reasons: string[]
        }
        learning: {
          status: 'aligned' | 'partial' | 'missing'
          expectedAction: string | null
          runtimeAction: string | null
          kernelAction: string | null
          activeFocuses: string[]
          dominantTrajectory: string | null
          confirmedSignals: string[]
          missingSignals: string[]
          driftingSignals: string[]
          reasons: string[]
        }
      }
    }

    const expectedPosture = patch.relationshipPosture.repairWindowBias >= 0.14 || patch.relationshipPosture.closenessCapBias >= 0.12
      ? 'restrained' as const
      : 'warm' as const
    const plannerPosture = runtimePresence.answerPlanner?.relationshipPosture ?? null
    const compilerPosture = runtimePresence.answerCompiler?.relationshipPosture ?? null
    const relationshipAligned = plannerPosture === expectedPosture && compilerPosture === expectedPosture
    const relationshipConfirmedSignals = uniquePreviewReasons([
      plannerPosture === expectedPosture ? `planner:${expectedPosture}` : null,
      compilerPosture === expectedPosture ? `compiler:${expectedPosture}` : null,
    ])
    const relationshipDriftingSignals = uniquePreviewReasons([
      plannerPosture && plannerPosture !== expectedPosture ? `planner:${plannerPosture}` : null,
      compilerPosture && compilerPosture !== expectedPosture ? `compiler:${compilerPosture}` : null,
    ])

    const expectedSignals = [
      patch.responsePosture.hypothesisLabelBias >= 0.1 ? 'hypothesis-labeling' : null,
      patch.responsePosture.specificityClampBias >= 0.1 ? 'specificity-clamp' : null,
      patch.responsePosture.secondPassRequiredBias >= 0.1 ? 'second-pass' : null,
      patch.responsePosture.templateShellSuppressionBias >= 0.1 ? 'template-shell-suppression' : null,
    ].filter((value): value is string => Boolean(value))
    const observedSignals = [
      runtimePresence.answerCompiler?.mustDo?.some(item => item.includes('hypothesis labeling')) ? 'hypothesis-labeling' : null,
      runtimePresence.answerCompiler?.mustDo?.some(item => item.includes('clamp unsupported specificity')) ? 'specificity-clamp' : null,
      runtimePresence.answerCompiler?.mustDo?.some(item => item.includes('repair/rewrite before visible certainty')) ? 'second-pass' : null,
      runtimePresence.answerCompiler?.mustNotDo?.some(item => item.includes('template shell')) ? 'template-shell-suppression' : null,
    ].filter((value): value is string => Boolean(value))
    const responseAligned = expectedSignals.every(signal => observedSignals.includes(signal))
    const responseMissingSignals = expectedSignals.filter(signal => !observedSignals.includes(signal))

    const expectedHold = patch.proactivePolicy.restraintBias >= 0.5
      || patch.proactivePolicy.actuationCooldownBias >= 0.5
      || patch.validation.requiresRevalidation
      || patch.validation.requiresRollbackCheck
    const shouldSpeak = typeof runtimePresence.initiative?.shouldSpeak === 'boolean'
      ? runtimePresence.initiative.shouldSpeak
      : null
    const selectedAction = runtimePresence.initiative?.selectedAction ?? null
    const selectedActionLabel = selectedAction ? String(selectedAction) : null
    const personaBias = runtimePresence.initiative?.personaBias ?? null
    const proactiveAligned = expectedHold
      ? shouldSpeak === false
      : shouldSpeak === true || selectedAction != null
    const proactivePersonaSignals = proactivePersonaBiasSignals(personaBias)
    const proactiveConfirmedSignals = uniquePreviewReasons([
      expectedHold && shouldSpeak === false ? 'shouldSpeak:false' : null,
      expectedHold && selectedActionLabel === 'hold' ? 'selectedAction:hold' : null,
      !expectedHold && shouldSpeak === true ? 'shouldSpeak:true' : null,
      ...proactivePersonaSignals,
    ])
    const latestOpeningGuidanceHold = latestTakeoverAuditOpeningGuidanceHold(selectedCandidateTraceEvents.value)
    const latestOpeningGuidanceHoldDetail = latestTakeoverAuditOpeningGuidanceHoldDetail(selectedCandidateTraceEvents.value)
    const proactiveDriftingSignals = uniquePreviewReasons([
      expectedHold && shouldSpeak === true ? 'shouldSpeak:true' : null,
      expectedHold && selectedActionLabel && selectedActionLabel !== 'hold' ? `selectedAction:${selectedActionLabel}` : null,
      latestOpeningGuidanceHold,
    ])

    const expectedAction = patch.action === 'verify'
      || patch.validation.requiresRevalidation
      ? 'verify'
      : patch.action === 'revise'
        ? 'revise'
        : patch.action === 'record'
          ? 'record'
          : patch.action === 'reflect'
            ? 'reflect'
            : patch.action === 'internalize'
              ? 'internalize'
              : null
    const runtimeAction = runtimePresence.learningExecutionState?.nextLearningAction ?? null
    const kernelAction = organicMemory.selfEvolution?.nextLearningAction ?? null
    const activeFocuses = organicMemory.learningExecutionState?.activeLearningFocuses
      ?? organicMemory.selfEvolution?.activeLearningFocuses
      ?? []
    const relationshipCadenceInternalizationActive = activeFocuses.includes('internalize-relationship-cadence')
    const dominantTrajectory = organicMemory.selfEvolution?.dominantTrajectory ?? null
    const learningAligned = expectedAction != null && runtimeAction === expectedAction && kernelAction === expectedAction
    const expectedFocuses = patch.domain ? [String(patch.domain)] : []
    const learningConfirmedSignals = uniquePreviewReasons([
      runtimeAction === expectedAction && expectedAction ? `runtimeAction:${expectedAction}` : null,
      kernelAction === expectedAction && expectedAction ? `kernelAction:${expectedAction}` : null,
      ...expectedFocuses
        .filter(focus => activeFocuses.includes(focus))
        .map(focus => `focus:${focus}`),
    ])
    const learningMissingSignals = uniquePreviewReasons(expectedFocuses
      .filter(focus => !activeFocuses.includes(focus))
      .map(focus => `focus:${focus}`))
    const learningDriftingSignals = uniquePreviewReasons([
      runtimeAction && runtimeAction !== expectedAction ? `runtimeAction:${runtimeAction}` : null,
      kernelAction && kernelAction !== expectedAction ? `kernelAction:${kernelAction}` : null,
      ...activeFocuses
        .filter(focus => !expectedFocuses.includes(focus))
        .map(focus => `focus:${focus}`),
    ])

    return {
      relationship: {
        status: relationshipAligned ? 'aligned' : plannerPosture || compilerPosture ? 'partial' : 'missing',
        expectedPosture,
        plannerPosture,
        compilerPosture,
        confirmedSignals: relationshipConfirmedSignals,
        missingSignals: [],
        driftingSignals: relationshipDriftingSignals,
        reasons: uniquePreviewReasons([
          plannerPosture === expectedPosture
            ? `Answer planner already resolves to ${expectedPosture}, matching the active candidate posture clamp.`
            : plannerPosture
              ? `Answer planner is still ${plannerPosture}, which does not fully match the candidate posture expectation.`
              : null,
          compilerPosture === expectedPosture
            ? `Answer compiler still emits ${expectedPosture}, so visible tone is respecting the active candidate guardrail.`
            : compilerPosture
              ? `Answer compiler still emits ${compilerPosture}, so visible tone has not fully converged to the candidate posture.`
              : null,
        ]),
      },
      response: {
        status: responseAligned ? 'aligned' : observedSignals.length > 0 ? 'partial' : 'missing',
        expectedSignals,
        observedSignals,
        confirmedSignals: observedSignals.filter(signal => expectedSignals.includes(signal)),
        missingSignals: responseMissingSignals,
        driftingSignals: [],
        reasons: uniquePreviewReasons([
          responseAligned
            ? 'Current response guardrails already include the active candidate rewrite/labeling discipline.'
            : observedSignals.length > 0
              ? 'Some response guardrails reflect the active candidate, but the full rewrite discipline is not visible yet.'
              : null,
        ]),
      },
      proactive: {
        status: proactiveAligned ? 'aligned' : shouldSpeak != null || selectedAction ? 'partial' : 'missing',
        expectedHold,
        shouldSpeak,
        selectedAction,
        confirmedSignals: proactiveConfirmedSignals,
        missingSignals: [],
        driftingSignals: proactiveDriftingSignals,
        reasons: uniquePreviewReasons([
          expectedHold && shouldSpeak === false
            ? 'Initiative currently withholds speech, matching the candidate proactive hold expectation.'
            : expectedHold && shouldSpeak === true
              ? 'Initiative still wants to speak even though the candidate expects a proactive hold.'
              : !expectedHold && shouldSpeak === true
                  ? 'Initiative still surfaces speech, matching the candidate allowing proactive expression.'
                  : null,
          personaBias?.initiativeStyle || personaBias?.silenceReconnect || personaBias?.preferredProactiveStyle
            ? `Persona baseline currently biases proactive surfacing toward observe-first restraint (initiativeStyle=${personaBias?.initiativeStyle ?? 'n/a'}, silenceReconnect=${personaBias?.silenceReconnect ?? 'n/a'}, preferredProactiveStyle=${personaBias?.preferredProactiveStyle ?? 'n/a'}).`
            : null,
          personaBias?.openingGuidance
            ? `Persona opening guidance currently says: ${personaBias.openingGuidance}`
            : null,
          personaBias?.manifestationCadenceSummary
            ? `Persona cadence summary: ${personaBias.manifestationCadenceSummary}`
            : null,
          latestOpeningGuidanceHold
            ? `Latest drilled takeover audit shows visible proactive surfacing was blocked by ${latestOpeningGuidanceHold}.`
            : null,
          latestOpeningGuidanceHoldDetail === 'memory-familiarity-closeness-cap'
            ? 'That proactive lower-pressure hold specifically says remembered familiarity must stay memory-first before visible closeness widens, so runtime surfacing is still preserving the identity-continuity room.'
            : null,
        ]),
      },
      learning: {
        status: learningAligned ? 'aligned' : runtimeAction || kernelAction ? 'partial' : 'missing',
        expectedAction,
        runtimeAction,
        kernelAction,
        activeFocuses: [...activeFocuses],
        dominantTrajectory,
        confirmedSignals: learningConfirmedSignals,
        missingSignals: learningMissingSignals,
        driftingSignals: learningDriftingSignals,
        reasons: uniquePreviewReasons([
          runtimeAction === expectedAction
            ? `Learning execution still sits on ${expectedAction}, matching the active candidate action.`
            : runtimeAction
              ? `Learning execution currently sits on ${runtimeAction}, not the candidate's expected ${expectedAction}.`
              : null,
          kernelAction === expectedAction
            ? 'The self-evolution kernel trajectory remains verify-first around the same domain.'
            : kernelAction
              ? `The self-evolution kernel is still centered on ${kernelAction}, not the active candidate action.`
              : null,
          relationshipCadenceInternalizationActive
            ? 'Relationship cadence internalization is active, so measured-return reconfirmation is now being treated as durable relationship rhythm rather than temporary callback restraint.'
            : null,
        ]),
      },
    }
  })

  const preDialogueClosureSnapshot = computed<NormalizedPreDialogueClosureSnapshot | null>(() => {
    const projectRows = replayStore.benchmarkProjectStateRows
    const emotionalRows = replayStore.benchmarkEmotionalClosureRows
    const selfAuthorityRows = replayStore.benchmarkSelfAuthorityRows
    const projectStateAuditRows = replayStore.benchmarkProjectStateAuditRows
    const briefingRows = replayStore.benchmarkPreDialogueBriefingRows
    const runtimeSameHerProof = replayStore.benchmarkRuntimeSameHerProofSummary
    const continuitySnapshot = projectStateContinuitySnapshot.value
    const latestLandedProgress = resolveContinuityLatestLandedProgress(continuitySnapshot)
    const runtimeContinuityProjection = selectedCandidateRuntimeContinuityProjection.value
    const sameHerEmbodimentLaneImpact = describeSameHerEmbodimentLaneImpact(runtimeContinuityProjection?.matchedSignals ?? [])
    const sameSegmentFaceMotionRecovery = resolveSameSegmentFaceMotionRecoverySignal(runtimeContinuityProjection?.matchedSignals ?? [])
    if (projectRows.length === 0 && emotionalRows.length === 0 && selfAuthorityRows.length === 0 && projectStateAuditRows.length === 0 && !runtimeSameHerProof)
      return null

    const projectContinuity = projectRows.find(row => row.key === 'project_state_continuity_hit_rate')
    const projectIdentity = projectRows.find(row => row.key === 'project_state_identity_hit_rate')
    const projectPhase = projectRows.find(row => row.key === 'project_state_phase_hit_rate')
    const projectOpenLoop = projectRows.find(row => row.key === 'project_state_open_loop_hit_rate')
    const projectSameHer = projectRows.find(row => row.key === 'project_state_same_her_hit_rate')
    const projectProactiveSameHerGap = projectRows.find(row => row.key === 'project_state_proactive_same_her_gap_hit_rate')
    const briefingFull = briefingRows.find(row => row.key === 'pre_dialogue_briefing_fully_briefed_rate')
    const emotionalClosure = emotionalRows.find(row => row.key === 'emotional_closure_fully_closed_rate')
    const emotionalPreserve = emotionalRows.find(row => row.key === 'emotional_closure_preserved_rate')
    const emotionalLowPressure = emotionalRows.find(row => row.key === 'emotional_closure_low_pressure_required_rate')
    const emotionalAntiRestart = emotionalRows.find(row => row.key === 'emotional_closure_anti_restart_required_rate')
    const selfAuthorityCarry = selfAuthorityRows.find(row => row.key === 'self_authority_fully_carried_rate')
    const selfAuthorityPreserve = selfAuthorityRows.find(row => row.key === 'self_authority_preserved_rate')
    const projectStateAuditCarry = projectStateAuditRows.find(row => row.key === 'project_state_audit_fully_carried_rate')
    const projectStateAuditContinuitySummary = projectStateAuditRows.find(row => row.key === 'project_state_audit_continuity_summary_rate')
    const projectStateAuditPreserve = projectStateAuditRows.find(row => row.key === 'project_state_audit_preserved_rate')
    const sameHerEmbodimentGroundedCarry = hasGroundedSameHerEmbodimentCarry(runtimeContinuityProjection?.matchedSignals ?? [])
    const projectSameHerDetail = describeInspectorContinuityMetricDetail(projectSameHer?.detail)
    const projectProactiveSameHerGapDetail = describeInspectorContinuityMetricDetail(projectProactiveSameHerGap?.detail)
    const runtimeSameHerProofHeadline = describeInspectorContinuityMetricDetail(runtimeSameHerProof?.headline)
    const runtimeSameHerProofDetail = describeInspectorContinuityMetricDetail(runtimeSameHerProof?.detail)
    const runtimeSameHerProofNextRepairTarget = describeInspectorContinuityMetricDetail(runtimeSameHerProof?.nextRepairTarget)
    const summaryParts = [
      projectContinuity?.detail ? `project=${projectContinuity.detail}` : null,
      projectSameHerDetail ? `identityContinuity=${projectSameHerDetail}` : null,
      projectProactiveSameHerGapDetail ? `proactiveIdentityContinuityGap=${projectProactiveSameHerGapDetail}` : null,
      projectOpenLoop?.detail ? `openLoop=${projectOpenLoop.detail}` : null,
      briefingFull?.detail ? `briefing=${briefingFull.detail}` : null,
      emotionalClosure?.detail ? `emotionalClosure=${emotionalClosure.detail}` : null,
      emotionalLowPressure?.detail ? `emotionalClosureLowPressure=${emotionalLowPressure.detail}` : null,
      emotionalAntiRestart?.detail ? `emotionalClosureAntiRestart=${emotionalAntiRestart.detail}` : null,
      emotionalPreserve?.detail ? `preserve=${emotionalPreserve.detail}` : null,
      selfAuthorityCarry?.detail ? `selfAuthority=${selfAuthorityCarry.detail}` : null,
      selfAuthorityPreserve?.detail ? `selfAuthorityPreserve=${selfAuthorityPreserve.detail}` : null,
      projectStateAuditCarry?.detail ? `projectStateAudit=${projectStateAuditCarry.detail}` : null,
      projectStateAuditContinuitySummary?.detail ? `projectStateAuditContinuity=${projectStateAuditContinuitySummary.detail}` : null,
      projectStateAuditPreserve?.detail ? `projectStateAuditPreserve=${projectStateAuditPreserve.detail}` : null,
      runtimeSameHerProofHeadline ? `runtimeIdentityContinuity=${runtimeSameHerProofHeadline}` : null,
      sameHerEmbodimentLaneImpact
        ? sameHerEmbodimentLaneImpact.replace('continuity-impact: ', 'embodiment=')
        : null,
    ].filter((value): value is string => Boolean(value))
    const hasExplicitDriftSignal = summaryParts.some(part => part.includes('drift='))
      || (Boolean(sameHerEmbodimentLaneImpact) && !sameHerEmbodimentGroundedCarry)

    const benchmarkDerivedClosure: NormalizedPreDialogueClosureSnapshot = {
      status: hasExplicitDriftSignal
        ? 'drift'
        : summaryParts.length >= 3
          ? 'grounded'
          : 'partial',
      summaryLine: summaryParts.length > 0 ? summaryParts.join(' | ') : null,
      companionHeadlineLine: sameHerEmbodimentLaneImpact
        ? describeAlicizationEmbodimentClosureHeadline({
          authoritySummary: (runtimeContinuityProjection?.reasons ?? []).join(' | '),
          currentBodyState: (runtimeContinuityProjection?.matchedSignals ?? []).join(' | '),
        }) || null
        : null,
      companionBriefingLine: sameHerEmbodimentLaneImpact
        ? null
        : describeAlicizationProjectClosureBriefing({
          identity: continuitySnapshot?.identity ?? null,
          currentPhase: continuitySnapshot?.currentPhase ?? null,
          primaryOpenLoop: continuitySnapshot?.primaryOpenLoop ?? null,
        }) || null,
      companionNextClosureLine: describeAlicizationProjectNextClosure({
        nextClosureTarget: continuitySnapshot?.nextClosureTarget ?? null,
      }) || null,
      sameHerDriftRiskLine: continuitySnapshot?.sameHerDriftRisk ?? null,
      companionshipReasonLine: sameHerEmbodimentLaneImpact || sameSegmentFaceMotionRecovery
        ? uniquePreviewReasons([
          sameSegmentFaceMotionRecovery,
          sameHerEmbodimentLaneImpact,
        ], 1)[0] ?? null
        : null,
      emotionalClosureCue: continuitySnapshot?.emotionalClosureCue ?? null,
      briefingLines: uniquePreviewReasons([
        continuitySnapshot?.identity
          ? `Identity: ${continuitySnapshot.identity}`
          : null,
        continuitySnapshot?.currentPhase
          ? `Phase: ${continuitySnapshot.currentPhase}`
          : null,
        latestLandedProgress
          ? `Landed: ${latestLandedProgress}`
          : null,
        continuitySnapshot?.primaryOpenLoop
          ? `Open loop: ${continuitySnapshot.primaryOpenLoop}`
          : null,
        continuitySnapshot?.nextClosureTarget
          ? `Next closure: ${continuitySnapshot.nextClosureTarget}`
          : null,
        continuitySnapshot?.proactiveSameHerGap
          ? `Proactive identity-continuity gap: ${continuitySnapshot.proactiveSameHerGap}`
          : null,
        metricDetailHasConcreteCount(projectSameHer?.detail) && projectSameHer
          ? `Identity-continuity self line: ${projectSameHer.detail}`
          : null,
        metricDetailHasConcreteCount(projectProactiveSameHerGap?.detail) && projectProactiveSameHerGap
          ? `Proactive identity-continuity follow-through: ${projectProactiveSameHerGap.detail}`
          : null,
        briefingFull?.detail
          ? `Briefing carry: ${briefingFull.detail}`
          : null,
        emotionalClosure?.detail
          ? `Emotional closure: ${emotionalClosure.detail}`
          : null,
        emotionalLowPressure?.detail
          ? `Emotional low-pressure carry: ${emotionalLowPressure.detail}`
          : null,
        emotionalAntiRestart?.detail
          ? `Emotional anti-restart carry: ${emotionalAntiRestart.detail}`
          : null,
        selfAuthorityCarry?.detail
          ? `Self authority: ${selfAuthorityCarry.detail}`
          : null,
        projectStateAuditCarry?.detail
          ? `Project-state identity-continuity audit: ${projectStateAuditCarry.detail}`
          : null,
        projectStateAuditContinuitySummary?.detail
          ? `Project-state continuity brief: ${projectStateAuditContinuitySummary.detail}`
          : null,
        runtimeSameHerProofDetail
          ? `Runtime identity-continuity proof: ${runtimeSameHerProofDetail}`
          : null,
      ], 7),
      reasons: uniquePreviewReasons([
        runtimeSameHerProofNextRepairTarget ?? null,
        metricDetailHasConcreteCount(projectSameHerDetail) && projectSameHerDetail
          ? `Project identity-continuity self line currently reads ${projectSameHerDetail}, so the next turn should verify that Alicization still names identity continuity before any outward reply widening begins.`
          : null,
        metricDetailHasConcreteCount(projectProactiveSameHerGapDetail) && projectProactiveSameHerGapDetail
          ? `Proactive identity-continuity follow-through currently reads ${projectProactiveSameHerGapDetail}, so the next turn should check whether visible proactive hold, subconscious carry, and next-session feedback are still arriving on one identity-continuity line instead of fragmenting into detached follow-up beats.`
          : null,
        emotionalClosure?.detail
          ? `Emotional continuity closure currently reads ${emotionalClosure.detail}, so the next turn should check whether the current identity route is still speaking through one emotional seam.`
          : null,
        emotionalLowPressure?.detail
          ? `Low-pressure identity-continuity closure currently reads ${emotionalLowPressure.detail}, so the next turn should keep the return soft enough that the current continuity route does not widen too fast.`
          : null,
        emotionalAntiRestart?.detail
          ? `Anti-restart identity-continuity closure currently reads ${emotionalAntiRestart.detail}, so the next turn should avoid reopening the current continuity route from scratch.`
          : null,
        selfAuthorityCarry?.detail
          ? `Self authority currently reads ${selfAuthorityCarry.detail}, so the next turn should check whether the explicit self line is still surviving all the way into host-visible wording.`
          : null,
        selfAuthorityPreserve?.detail
          ? `Self authority preservation currently reads ${selfAuthorityPreserve.detail}, which shows whether rewrite is still keeping the identity-continuity self line intact instead of smoothing it away.`
          : null,
        projectStateAuditCarry?.detail
          ? `Project-status continuity currently reads ${projectStateAuditCarry.detail}, so the next turn should verify that project identity, Phase 1 route, and unfinished closure still arrive as one identity brief instead of a detached status shell.`
          : null,
        projectStateAuditContinuitySummary?.detail
          ? `Project-state continuity brief currently reads ${projectStateAuditContinuitySummary.detail}, so the next turn should verify that identity-continuity line, landed progress, and still-open closure are arriving together instead of being carried as disconnected fragments.`
          : null,
        projectStateAuditPreserve?.detail
          ? `Project-state audit preservation currently reads ${projectStateAuditPreserve.detail}, which shows whether rewrite is still keeping the identity-continuity project brief intact instead of flattening it into generic status reporting.`
          : null,
        continuitySnapshot?.proactiveSameHerGap
          ? `Proactive identity-continuity follow-through still reads ${continuitySnapshot.proactiveSameHerGap}, so the next turn should keep visible proactive hold, subconscious carry, and next-session feedback arriving as one identity-continuity line instead of splitting them across detached follow-up shells.`
          : null,
        sameSegmentFaceMotionRecovery
          ? `${sameSegmentFaceMotionRecovery} keeps the face-motion body line re-formed on one living segment even while full cross-modal identity-continuity closure is still open.`
          : null,
        sameHerEmbodimentLaneImpact
          ? sameHerEmbodimentGroundedCarry
            ? `${sameHerEmbodimentLaneImpact}, so the next turn should keep that same-segment lock explicit all the way into host-visible continuity instead of flattening it into a temporary visual recovery note.`
            : `${sameHerEmbodimentLaneImpact}, so the next turn should treat full cross-modal identity-continuity recovery as still open instead of assuming the body line is already closed.`
          : null,
        projectContinuity?.detail
          ? `Replay benchmark currently reports ${projectContinuity.detail}, so the next development turn should stay explicitly aware of what Alicization is and how much of Phase 1 continuity is actually landing.`
          : null,
        projectIdentity?.detail
          ? `Project identity carry currently reads ${projectIdentity.detail}, so the next turn should check whether she is still holding what this project is and who she is becoming across time.`
          : null,
        latestLandedProgress
          ? `Latest landed progress still holds at ${latestLandedProgress}, so the next turn should keep building from that already-lived continuity instead of restarting the same proof from scratch.`
          : null,
        projectPhase?.detail
          ? `Phase 1 route carry currently reads ${projectPhase.detail}, so the next turn should verify that local digital life is still the active identity-continuity route instead of drifting into generic capability work.`
          : null,
        projectOpenLoop?.detail
          ? `Unresolved closure carry currently reads ${projectOpenLoop.detail}, so unfinished digital-life closure still needs to remain visible before local implementation detail takes over.`
          : null,
        continuitySnapshot?.primaryOpenLoop
          ? `Primary open life loop still centers on ${continuitySnapshot.primaryOpenLoop}, so the next turn should keep that unfinished digital-life thread alive instead of collapsing into local implementation fluency.`
          : null,
        continuitySnapshot?.nextClosureTarget
          ? `Next closure target is still ${continuitySnapshot.nextClosureTarget}, so the next turn should keep steering the current continuity route toward that concrete unfinished step.`
          : null,
        briefingFull?.detail
          ? `Pre-dialogue self briefing currently reads ${briefingFull.detail}, so the next turn should check whether identity, phase, landed progress, open loop, and next closure are still arriving as one stable self brief.`
          : null,
        emotionalPreserve?.detail
          ? `Emotional seam preservation currently reads ${emotionalPreserve.detail}, which shows whether rewrite and realization layers are still carrying the same inner line.`
          : null,
      ], 12),
    }
    const explicitClosure = normalizePreDialogueClosureSnapshot(
      continuitySnapshot?.preDialogueClosure
      ?? latestProjectStateObservation.value?.preDialogueClosure
      ?? null,
    )
    const benchmarkClosureLooksThin = looksLikeThinPreDialogueClosureSnapshot(benchmarkDerivedClosure)
    const explicitClosureLooksThin = looksLikeThinPreDialogueClosureSnapshot(explicitClosure)
    if (benchmarkClosureLooksThin && explicitClosure && !explicitClosureLooksThin)
      return sanitizeInspectorClosureSnapshot(explicitClosure, continuitySnapshot)

    return sanitizeInspectorClosureSnapshot(benchmarkDerivedClosure, continuitySnapshot)
  })

  const preDialogueAwarenessSnapshot = computed<NormalizedPreDialogueAwarenessSnapshot | null>(() => {
    const continuitySnapshot = projectStateContinuitySnapshot.value
    const observationAwareness = normalizePreDialogueAwarenessSnapshot(
      latestProjectStateObservation.value?.preDialogueAwareness ?? null,
    )
    const continuityAwareness = normalizePreDialogueAwarenessSnapshot(
      projectStateContinuitySnapshot.value?.preDialogueAwareness ?? null,
    )
    const observationAwarenessLooksThin = looksLikeThinPreDialogueAwarenessSnapshot(observationAwareness)
    const continuityAwarenessLooksThin = looksLikeThinPreDialogueAwarenessSnapshot(continuityAwareness)
    const preferredAwarenessSource = observationAwarenessLooksThin && continuityAwareness && !continuityAwarenessLooksThin
      ? continuityAwareness
      : observationAwareness ?? continuityAwareness
    if (preferredAwarenessSource)
      return mergePreDialogueAwarenessWithContinuitySnapshot(preferredAwarenessSource, continuitySnapshot)

    const closure = preDialogueClosureSnapshot.value
      ?? normalizePreDialogueClosureSnapshot(
        continuitySnapshot?.preDialogueClosure
        ?? latestProjectStateObservation.value?.preDialogueClosure
        ?? null,
      )
    if (!closure)
      return null

    const synthesizedCompanionHeadlineLine = resolvePreDialogueClosureCompanionHeadlineLine(closure)

    const closureStatus
      = closure.status === 'grounded' || closure.status === 'partial' || closure.status === 'drift'
        ? closure.status
        : 'partial'

    const rebuiltAwareness: NormalizedPreDialogueAwarenessSnapshot = {
      status: closureStatus,
      summaryLine: closure.summaryLine,
      companionHeadlineLine: synthesizedCompanionHeadlineLine ?? null,
      companionBriefingLine: closure.companionBriefingLine ?? null,
      companionNextClosureLine: closure.companionNextClosureLine ?? null,
      awarenessLine: synthesizedCompanionHeadlineLine ?? closure.companionBriefingLine ?? closure.summaryLine,
      emotionalClosureCue: closure.emotionalClosureCue ?? null,
      reasonPreview: uniquePreviewReasons([
        synthesizedCompanionHeadlineLine,
        closure.companionshipReasonLine,
        closure.companionBriefingLine,
        closure.summaryLine,
        ...(closure.reasons ?? []),
      ], 8),
    }

    return sanitizeInspectorAwarenessSnapshot(
      mergePreDialogueAwarenessWithContinuitySnapshot(rebuiltAwareness, continuitySnapshot) ?? rebuiltAwareness,
      continuitySnapshot,
    )
  })

  const selectedCandidateAuthoritySurfaces = computed(() => {
    const organicMemory = organicMemorySnapshot.value
    const trace = selectedCandidateTraceRecord.value
    const persistentMindState = !organicMemory
      ? {
          status: 'missing' as const,
          hostPersonModelPresent: false,
          affectiveResiduePresent: false,
          selfEvolutionPresent: false,
          learningExecutionPresent: false,
          recallLatencyPolicyPresent: false,
          derivedMindStateBundlePresent: false,
          dominantTrajectory: null,
          nextLearningAction: null,
          activeFocuses: [] as string[],
          reasons: ['Persistent mind authority has not been loaded from the main organic snapshot yet.'],
        }
      : {
          status: (
            organicMemory.hostPersonModel
            || organicMemory.affectiveResidue
            || organicMemory.selfEvolution
            || organicMemory.learningExecutionState
            || organicMemory.recallLatencyPolicy
            || organicMemory.derivedMindStateBundle
          )
            ? 'available' as const
            : 'partial' as const,
          hostPersonModelPresent: Boolean(organicMemory.hostPersonModel),
          affectiveResiduePresent: Boolean(organicMemory.affectiveResidue),
          selfEvolutionPresent: Boolean(organicMemory.selfEvolution),
          learningExecutionPresent: Boolean(organicMemory.learningExecutionState),
          recallLatencyPolicyPresent: Boolean(organicMemory.recallLatencyPolicy),
          derivedMindStateBundlePresent: Boolean(organicMemory.derivedMindStateBundle),
          dominantTrajectory: organicMemory.selfEvolution?.dominantTrajectory ?? null,
          nextLearningAction: organicMemory.learningExecutionState?.nextLearningAction
            ?? organicMemory.selfEvolution?.nextLearningAction
            ?? null,
          activeFocuses: [
            ...(organicMemory.learningExecutionState?.activeLearningFocuses ?? []),
            ...(organicMemory.selfEvolution?.activeLearningFocuses ?? []),
          ].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index),
          reasons: [
            'Persistent mind authority is present from the main organic snapshot and currently exposes self-evolution plus learning state.',
          ],
        }

    const traceStage = trace?.memoryStageReplay?.stages?.[0] ?? null
    const traceResolution = trace?.memoryResolutionLedger ?? null
    const turnTraceState = {
      status: traceStage || traceResolution ? 'available' as const : 'missing' as const,
      memoryStageReplayPresent: Boolean(trace?.memoryStageReplay),
      memoryResolutionLedgerPresent: Boolean(traceResolution),
      latestTraceStage: traceStage?.stage ?? null,
      latestTraceClosureState: traceResolution?.closureState ?? null,
      latestTraceSurfacePolicy: traceResolution?.finalSurfacePolicy ?? null,
      suppressionTags: [...(traceResolution?.suppressionTags ?? [])],
      reasons: traceStage || traceResolution
        ? ['Turn-trace authority is attached from the drilled decision trace and describes recall settlement for that turn.']
        : ['No drilled trace is open yet, so turn-level recall settlement authority is not attached.'],
    }

    return {
      persistentMindState,
      turnTraceState,
    }
  })

  const selectedTraceEvent = computed(() => {
    const eventId = selectedTraceEventId.value
    if (eventId) {
      const exact = selectedCandidateTraceEvents.value.find(event => event.id === eventId)
      if (exact)
        return exact
    }
    return selectedCandidateTraceEvents.value[0] ?? null
  })

  const selectedTraceEventDetails = computed(() => {
    const event = selectedTraceEvent.value
    const payload = asTracePayloadObject(event?.payload)
    if (!event || !payload)
      return [] as Array<{ label: string, value: string }>

    if (event.kind === 'governance-normalized') {
      return [
        typeof payload.turnMode === 'string' ? { label: 'turnMode', value: payload.turnMode } : null,
        typeof payload.truthState === 'string' ? { label: 'truthState', value: payload.truthState } : null,
        typeof payload.repairState === 'string' ? { label: 'repairState', value: payload.repairState } : null,
      ].filter(Boolean) as Array<{ label: string, value: string }>
    }
    if (event.kind === 'takeover-audit') {
      const details: Array<{ label: string, value: string }> = []
      pushTraceDetail(details, 'fallbackReason', payload.fallback_reason)
      pushTraceDetail(details, 'hardFallbackReason', payload.hard_fallback_reason)
      pushTraceDetail(details, 'openingGuidanceHoldDetail', payload.opening_guidance_hold_detail)
      pushTraceDetail(details, 'companionshipHoldMode', payload.companionship_hold_mode)
      pushTraceDetail(details, 'replyOverridden', asTraceBoolean(payload.replyOverridden))
      pushTraceDetail(details, 'visibleReplyAuthority', payload.visible_reply_authority)
      pushTraceDetail(details, 'visibleReplyRealizationAuthority', payload.visible_reply_realization_authority)
      pushTraceDetail(details, 'visibleReplyRealizationReason', payload.visible_reply_realization_reason)
      pushTraceDetailList(details, 'visibleReplyBlockedReasons', payload.visible_reply_blocked_reasons)
      pushTraceDetail(details, 'claimSpecificityBudget', payload.claim_specificity_budget)
      pushTraceDetailList(details, 'unsupportedSpecificityCues', payload.unsupported_specificity_cues)
      pushTraceDetailList(details, 'reasons', payload.reasons)
      return details
    }
    if (event.kind === 'learning-executed') {
      const details: Array<{ label: string, value: string }> = []
      pushTraceDetail(details, 'taskId', payload.taskId)
      pushTraceDetail(details, 'action', payload.action)
      pushTraceDetail(details, 'domain', payload.domain)
      pushTraceDetail(details, 'resultSummary', payload.resultSummary)
      pushTraceDetailList(details, 'verificationBasis', payload.verificationBasis)
      pushTraceDetailList(details, 'focuses', payload.focuses)
      const verifiedArtifact = asTracePayloadObject(payload.verifiedArtifact)
      pushTraceDetail(details, 'artifactId', verifiedArtifact?.artifactId)
      const claimGraph = asTracePayloadObject(verifiedArtifact?.claimGraph)
      pushTraceDetail(details, 'claimId', claimGraph?.claimId)
      return details
    }
    if (event.kind === 'person-state-updated') {
      const details: Array<{ label: string, value: string }> = []
      pushTraceDetail(details, 'summary', payload.summary)
      pushTraceDetailList(details, 'dominantContexts', payload.dominantContexts)
      pushTraceDetailList(details, 'sourceKinds', payload.sourceKinds)
      if (Array.isArray(payload.sourceTrail))
        pushTraceDetail(details, 'sourceTrailCount', payload.sourceTrail.length)
      const sourceCounts = asTracePayloadObject(payload.sourceCounts)
      pushTraceDetail(details, 'relationshipOutcomes', asTraceFiniteNumber(sourceCounts?.relationshipOutcomes))
      pushTraceDetail(details, 'reinforcementEvents', asTraceFiniteNumber(sourceCounts?.reinforcementEvents))
      pushTraceDetail(details, 'episodicEvents', asTraceFiniteNumber(sourceCounts?.episodicEvents))
      pushTraceDetail(details, 'reflections', asTraceFiniteNumber(sourceCounts?.reflections))
      pushTraceDetail(details, 'memoryFacts', asTraceFiniteNumber(sourceCounts?.memoryFacts))
      const relationshipShift = asTracePayloadObject(payload.relationshipShift)
      pushTraceDetail(details, 'trustDelta', asTraceFiniteNumber(relationshipShift?.trustDelta))
      pushTraceDetail(details, 'closenessDelta', asTraceFiniteNumber(relationshipShift?.closenessDelta))
      pushTraceDetail(details, 'burdenDelta', asTraceFiniteNumber(relationshipShift?.burdenDelta))
      pushTraceDetail(details, 'boundaryDelta', asTraceFiniteNumber(relationshipShift?.boundaryDelta))
      pushTraceDetail(details, 'repairDelta', asTraceFiniteNumber(relationshipShift?.repairDelta))
      return details
    }
    if (event.kind === 'memory-facts-upserted') {
      const details: Array<{ label: string, value: string }> = []
      pushTraceDetail(details, 'source', payload.source)
      pushTraceDetail(details, 'trigger', payload.trigger)
      pushTraceDetail(details, 'factInputCount', asTraceFiniteNumber(payload.factInputCount))
      pushTraceDetail(details, 'extractedCount', asTraceFiniteNumber(payload.extractedCount))
      pushTraceDetail(details, 'batchSize', asTraceFiniteNumber(payload.batchSize))
      const batchPriority = asTracePayloadObject(payload.batchPriority)
      pushTraceDetail(details, 'batchPriorityMin', asTraceFiniteNumber(batchPriority?.min))
      pushTraceDetail(details, 'batchPriorityAvg', asTraceFiniteNumber(batchPriority?.avg))
      pushTraceDetail(details, 'batchPriorityMax', asTraceFiniteNumber(batchPriority?.max))
      return details
    }
    if (event.kind === 'memory-reconsolidated') {
      const details: Array<{ label: string, value: string }> = []
      pushTraceDetail(details, 'source', payload.source)
      pushTraceDetail(details, 'feedback', payload.feedback)
      pushTraceDetail(details, 'reconsolidatedCount', asTraceFiniteNumber(payload.reconsolidatedCount))
      const coherence = asTracePayloadObject(payload.coherence)
      pushTraceDetail(details, 'coherenceState', coherence?.coherenceState)
      pushTraceDetailList(details, 'sourceKinds', payload.sourceKinds)
      pushTraceDetail(details, 'summary', payload.summary)
      return details
    }
    return Object.entries(payload)
      .flatMap(([label, value]) => {
        if (typeof value === 'string')
          return [{ label, value }]
        if (typeof value === 'number' || typeof value === 'boolean')
          return [{ label, value: String(value) }]
        return []
      })
      .slice(0, 8)
  })

  const candidateCounts = computed(() => {
    return sortedCandidates.value.reduce<Record<'shadow' | 'active' | 'rejected' | 'rolled-back', number>>((acc, candidate) => {
      acc[candidate.status] += 1
      return acc
    }, {
      'shadow': 0,
      'active': 0,
      'rejected': 0,
      'rolled-back': 0,
    })
  })

  async function refresh() {
    if (!hasAlicizationBridge()) {
      snapshot.value = null
      soulSnapshot.value = null
      visualPresenceState.value = null
      organicMemorySnapshot.value = null
      latestProjectStateObservation.value = null
      lastError.value = null
      return null
    }

    const bridge = getAlicizationBridge()
    if (!bridge.getSelfEvolutionState) {
      snapshot.value = null
      soulSnapshot.value = null
      visualPresenceState.value = null
      organicMemorySnapshot.value = null
      latestProjectStateObservation.value = null
      lastError.value = null
      return null
    }

    loading.value = true
    try {
      const nextSoulPromise = bridge.getSoul
        ? Promise.resolve(bridge.getSoul()).catch(() => null)
        : Promise.resolve(null)
      const nextVisualPresencePromise = bridge.getVisualPresenceState
        ? Promise.resolve(bridge.getVisualPresenceState()).catch(() => null)
        : Promise.resolve(null)
      const nextOrganicMemoryPromise = bridge.getOrganicMemorySnapshot
        ? Promise.resolve(bridge.getOrganicMemorySnapshot()).catch(() => null)
        : Promise.resolve(null)
      const nextProjectStateContinuitySnapshotPromise = bridge.getProjectStateContinuitySnapshot
        ? Promise.resolve(bridge.getProjectStateContinuitySnapshot()).catch(() => null)
        : Promise.resolve(null)
      const nextProjectStateObservationPromise = bridge.getLatestProjectStateObservation
        ? Promise.resolve(bridge.getLatestProjectStateObservation()).catch(() => null)
        : Promise.resolve(null)
      const [next, nextSoul, nextVisualPresence, nextOrganicMemory, nextProjectStateContinuitySnapshot, nextProjectStateObservation] = await Promise.all([
        bridge.getSelfEvolutionState(),
        nextSoulPromise,
        nextVisualPresencePromise,
        nextOrganicMemoryPromise,
        nextProjectStateContinuitySnapshotPromise,
        nextProjectStateObservationPromise,
      ])
      snapshot.value = next ?? null
      soulSnapshot.value = nextSoul ?? null
      visualPresenceState.value = nextVisualPresence ?? null
      organicMemorySnapshot.value = nextOrganicMemory ?? null
      const observedContinuitySnapshot = nextProjectStateObservation
        ? projectStateObservationToContinuitySnapshot(nextProjectStateObservation)
        : null
      const synthesizedObservationAwareness = nextProjectStateObservation?.preDialogueAwareness
        ?? (
          nextProjectStateObservation?.preDialogueClosure
            ? observedContinuitySnapshot?.preDialogueAwareness ?? null
            : null
        )
      const normalizedObservedProjectState = nextProjectStateObservation
        ? normalizeStructuredProjectStatePayload(
            nextProjectStateObservation.projectState as Record<string, unknown>,
          )
        : null
      const observedProjectStateSnapshot = (normalizedObservedProjectState || observedContinuitySnapshot)
        ? {
            identity: normalizedObservedProjectState?.identity ?? '',
            currentPhase: normalizedObservedProjectState?.currentPhase ?? '',
            latestLandedProgress: normalizedObservedProjectState?.latestLandedProgress ?? null,
            primaryOpenLoop: normalizedObservedProjectState?.primaryOpenLoop ?? null,
            nextClosureTarget: normalizedObservedProjectState?.nextClosureTarget ?? '',
            continuitySummary: normalizedObservedProjectState?.continuitySummary ?? null,
            sameHerSelfLine:
              sanitizeInspectorStructuredFact(normalizedObservedProjectState?.sameHerSelfLine ?? null)
              ?? '',
            sameHerHoldDetail:
              sanitizeInspectorStructuredFact(normalizedObservedProjectState?.sameHerHoldDetail ?? null)
              ?? null,
            proactiveSameHerGap:
              sanitizeInspectorStructuredFact(normalizedObservedProjectState?.proactiveSameHerGap ?? null)
              ?? null,
            ...(normalizedObservedProjectState?.sameHerDriftRisk
              ? {
                  sameHerDriftRisk: sanitizeInspectorStructuredFact(normalizedObservedProjectState.sameHerDriftRisk),
                }
              : {}),
            emotionalClosureCue:
              sanitizeInspectorSnapshotLine(
                nextProjectStateObservation?.preDialogueAwareness?.emotionalClosureCue
                ?? nextProjectStateObservation?.preDialogueClosure?.emotionalClosureCue
                ?? synthesizedObservationAwareness?.emotionalClosureCue
                ?? observedContinuitySnapshot?.preDialogueClosure?.emotionalClosureCue
                ?? null,
                { dropResidue: true },
              ),
            preDialogueAwareness:
              synthesizedObservationAwareness,
            preDialogueClosure:
              nextProjectStateObservation?.preDialogueClosure
              ?? observedContinuitySnapshot?.preDialogueClosure
              ?? null,
            nonHumanAuthoredStatus: nextProjectStateObservation?.nonHumanAuthoredStatus ?? null,
            turnId: nextProjectStateObservation?.turnId ?? '',
            sessionId: nextProjectStateObservation?.sessionId ?? '',
            origin: nextProjectStateObservation?.origin ?? 'user-turn' as const,
          }
        : null
      if (nextProjectStateContinuitySnapshot) {
        const strongerLatestLandedProgress
          = resolveContinuityLatestLandedProgress(nextProjectStateContinuitySnapshot)
            || observedProjectStateSnapshot?.latestLandedProgress?.trim()
            || ''
        const mergedSameHerHoldDetail
          = nextProjectStateContinuitySnapshot.sameHerHoldDetail
            || observedProjectStateSnapshot?.sameHerHoldDetail
            || null
        const mergedProactiveSameHerGap
          = nextProjectStateContinuitySnapshot.proactiveSameHerGap
            || observedProjectStateSnapshot?.proactiveSameHerGap
            || null
        const mergedSameHerDriftRisk
          = nextProjectStateContinuitySnapshot.sameHerDriftRisk
            || observedProjectStateSnapshot?.sameHerDriftRisk
            || null
        const mergedProjectStateContinuitySnapshot: AlicizationProjectStateContinuitySnapshot = {
          ...nextProjectStateContinuitySnapshot,
          latestLandedProgress: strongerLatestLandedProgress || null,
          continuitySummary:
            nextProjectStateContinuitySnapshot.continuitySummary
            ?? observedProjectStateSnapshot?.continuitySummary
            ?? null,
          sameHerSelfLine:
            nextProjectStateContinuitySnapshot.sameHerSelfLine
            || observedProjectStateSnapshot?.sameHerSelfLine
            || null,
          ...(mergedSameHerHoldDetail
            || Object.prototype.hasOwnProperty.call(nextProjectStateContinuitySnapshot, 'sameHerHoldDetail')
            ? {
                sameHerHoldDetail: mergedSameHerHoldDetail,
              }
            : {}),
          ...(mergedProactiveSameHerGap
            || Object.prototype.hasOwnProperty.call(nextProjectStateContinuitySnapshot, 'proactiveSameHerGap')
            ? {
                proactiveSameHerGap: mergedProactiveSameHerGap,
              }
            : {}),
          ...(mergedSameHerDriftRisk
            || Object.prototype.hasOwnProperty.call(nextProjectStateContinuitySnapshot, 'sameHerDriftRisk')
            ? {
                sameHerDriftRisk: mergedSameHerDriftRisk,
              }
            : {}),
          emotionalClosureCue:
            nextProjectStateContinuitySnapshot.emotionalClosureCue
            ?? observedProjectStateSnapshot?.emotionalClosureCue
            ?? null,
          preDialogueAwareness:
            nextProjectStateContinuitySnapshot.preDialogueAwareness
            ?? observedProjectStateSnapshot?.preDialogueAwareness
            ?? null,
          nonHumanAuthoredStatus:
            nextProjectStateContinuitySnapshot.nonHumanAuthoredStatus
            ?? observedProjectStateSnapshot?.nonHumanAuthoredStatus
            ?? null,
          turnId:
            nextProjectStateContinuitySnapshot.turnId
            || observedProjectStateSnapshot?.turnId
            || '',
          sessionId:
            nextProjectStateContinuitySnapshot.sessionId
            || observedProjectStateSnapshot?.sessionId
            || '',
          origin:
            nextProjectStateContinuitySnapshot.origin
            ?? observedProjectStateSnapshot?.origin
            ?? 'user-turn',
        }
        const normalizedContinuityClosure = normalizeStructuredPreDialogueClosurePayload(
          (nextProjectStateContinuitySnapshot.preDialogueClosure ?? null) as Record<string, unknown> | null,
        ) ?? null
        const normalizedObservationClosure = normalizeStructuredPreDialogueClosurePayload(
          (observedProjectStateSnapshot?.preDialogueClosure ?? null) as Record<string, unknown> | null,
        ) ?? null
        const continuityClosureLooksThin = Boolean(
          normalizedContinuityClosure
          && (
            looksLikeThinContinuityClosure(normalizedContinuityClosure.summaryLine)
            || looksLikeThinContinuityClosure(normalizedContinuityClosure.companionBriefingLine)
          ),
        )
        const observationClosureLooksThin = Boolean(
          normalizedObservationClosure
          && (
            looksLikeThinContinuityClosure(normalizedObservationClosure.summaryLine)
            || looksLikeThinContinuityClosure(normalizedObservationClosure.companionBriefingLine)
          ),
        )
        mergedProjectStateContinuitySnapshot.preDialogueClosure
          = continuityClosureLooksThin && normalizedObservationClosure && !observationClosureLooksThin
            ? observedProjectStateSnapshot?.preDialogueClosure ?? normalizedObservationClosure
            : nextProjectStateContinuitySnapshot.preDialogueClosure
              ?? observedProjectStateSnapshot?.preDialogueClosure
              ?? null
        const normalizedContinuityAwareness = normalizePreDialogueAwarenessSnapshot(
          mergedProjectStateContinuitySnapshot.preDialogueAwareness ?? null,
        )
        const normalizedObservationAwareness = normalizePreDialogueAwarenessSnapshot(
          observedProjectStateSnapshot?.preDialogueAwareness ?? null,
        )
        const continuityAwarenessLooksThin = looksLikeThinPreDialogueAwarenessSnapshot(normalizedContinuityAwareness)
        const observationAwarenessLooksThin = looksLikeThinPreDialogueAwarenessSnapshot(normalizedObservationAwareness)
        const continuityAwarenessSummaryLooksThin = Boolean(
          normalizedContinuityAwareness
          && looksLikeThinContinuityReminder(normalizedContinuityAwareness.summaryLine),
        )
        const observationAwarenessSummaryLooksThin = Boolean(
          normalizedObservationAwareness
          && looksLikeThinContinuityReminder(normalizedObservationAwareness.summaryLine),
        )
        const awarenessSourceForUpgrade = continuityAwarenessLooksThin && normalizedObservationAwareness && !observationAwarenessLooksThin
          ? normalizedObservationAwareness
          : continuityAwarenessSummaryLooksThin && normalizedObservationAwareness && !observationAwarenessSummaryLooksThin
            ? normalizedObservationAwareness
            : normalizedContinuityAwareness
        const shouldUpgradeMergedContinuityAwareness = Boolean(
          awarenessSourceForUpgrade
          && (
            continuityAwarenessLooksThin
            || observationAwarenessLooksThin
            || continuityAwarenessSummaryLooksThin
            || observationAwarenessSummaryLooksThin
          ),
        )
        const mergedContinuityAwareness = shouldUpgradeMergedContinuityAwareness
          ? mergePreDialogueAwarenessWithContinuitySnapshot(
              awarenessSourceForUpgrade,
              mergedProjectStateContinuitySnapshot,
            )
          : mergedProjectStateContinuitySnapshot.preDialogueAwareness
            ?? observedProjectStateSnapshot?.preDialogueAwareness
            ?? null
        projectStateContinuitySnapshot.value = sanitizeInspectorContinuitySnapshot({
          ...mergedProjectStateContinuitySnapshot,
          preDialogueAwareness: mergedContinuityAwareness,
        })
      }
      else {
        projectStateContinuitySnapshot.value = sanitizeInspectorContinuitySnapshot(observedContinuitySnapshot
          ? {
              ...observedContinuitySnapshot,
              sameHerSelfLine:
                observedContinuitySnapshot.sameHerSelfLine
                ?? '',
            }
          : observedProjectStateSnapshot)
      }
      latestProjectStateObservation.value = nextProjectStateObservation ?? null
      if (!snapshot.value?.candidates.some(candidate => candidate.id === selectedCandidateId.value))
        selectedCandidateId.value = snapshot.value?.activeCandidateId ?? snapshot.value?.candidates[0]?.id ?? null
      lastError.value = null
      return snapshot.value
    }
    catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      snapshot.value = null
      soulSnapshot.value = null
      visualPresenceState.value = null
      organicMemorySnapshot.value = null
      projectStateContinuitySnapshot.value = null
      latestProjectStateObservation.value = null
      return null
    }
    finally {
      loading.value = false
    }
  }

  function clear() {
    snapshot.value = null
    soulSnapshot.value = null
    visualPresenceState.value = null
    organicMemorySnapshot.value = null
    projectStateContinuitySnapshot.value = null
    latestProjectStateObservation.value = null
    selectedCandidateId.value = null
    selectedTraceEventId.value = null
    drilledTraceResult.value = null
    lastError.value = null
  }

  function selectCandidate(candidateId: string | null | undefined) {
    const normalized = typeof candidateId === 'string' ? candidateId.trim() : ''
    selectedCandidateId.value = normalized || null
    selectedTraceEventId.value = null
    drilledTraceResult.value = null
  }

  function selectTraceEvent(eventId: string | null | undefined) {
    const normalized = typeof eventId === 'string' ? eventId.trim() : ''
    selectedTraceEventId.value = normalized || null
  }

  async function drillSelectedCandidateTrace() {
    const activeCandidateId = selectedCandidate.value?.id?.trim() ?? ''
    const decisionTraceId = selectedCandidate.value?.decisionTraceId?.trim() ?? ''
    if (!activeCandidateId && !decisionTraceId)
      return { events: [], traceRecords: [] }
    const result = await replayStore.queryReplayLab({
      activeSelfEvolutionCandidateId: activeCandidateId || undefined,
      decisionTraceId: activeCandidateId ? undefined : decisionTraceId,
      limit: 200,
    })
    drilledTraceResult.value = result
    selectedTraceEventId.value = result.events[0]?.id ?? null
    return result
  }

  return {
    loading,
    lastError,
    snapshot,
    soulSnapshot,
    visualPresenceState,
    organicMemorySnapshot,
    latestProjectStateObservation,
    projectStateContinuitySnapshot,
    preDialogueClosureSnapshot,
    preDialogueAwarenessSnapshot,
    selectedCandidateAuthoritySurfaces,
    sortedCandidates,
    activeCandidate,
    selectedCandidate,
    selectedCandidateTraceRecord,
    selectedCandidateTraceSummary,
    selectedCandidateTraceCoverage,
    selectedCandidateTraceDetails,
    selectedCandidateTraceConsumptionEvidence,
    selectedCandidateConsumedTraceSummaries,
    selectedCandidateConsumptionStability,
    selectedCandidateConsumptionPreview,
    selectedCandidateImpactSummary,
    selectedCandidateTrajectorySummary,
    birthPersonaAuthoritySummary,
    identityDriftGovernanceSummary,
    selectedCandidateProactiveDecisionConsumptionSummary,
    selectedCandidatePersonaAuthorityMappingSummary,
    selectedCandidatePersonaBiasProvenance,
    selectedCandidateProactiveActionChain,
    selectedCandidateProactiveManifestationChain,
    selectedCandidatePrivateThoughtGovernanceChain,
    selectedCandidateResidentPerformanceProjection,
    selectedCandidateEmbodimentOutputProjection,
    selectedCandidateCompanionshipTransitionSummary,
    selectedCandidateSelfEvolutionSummary,
    selectedCandidateInternalizationReadinessSummary,
    selectedCandidateBaselineAnchorAuditSummary,
    selectedCandidateRejectedActionAlternatives,
    selectedCandidateRuntimeAlignment,
    selectedCandidateTraceEvents,
    selectedTraceEvent,
    selectedTraceEventDetails,
    selectedCandidateId,
    selectedTraceEventId,
    drilledTraceResult,
    candidateCounts,
    refresh,
    selectCandidate,
    selectTraceEvent,
    drillSelectedCandidateTrace,
    clear,
  }
})
