import type { AlicizationExecutionRoutingIntent } from '@proj-alicization/stage-shared'

import type { AlicizationRecallGovernorSnapshot } from '../../../shared/eventa'
import type { AlicizationAgentSessionContinuityInput } from './agent-runtime'
import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'

import {

  alicizationFixedTemplateReplacement,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

function pushUniqueRule(target: string[], value: string) {
  const normalized = value.trim()
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

export function mergeUniqueRules(values: Array<string | null | undefined>, maxItems = 16) {
  const merged: string[] = []
  for (const value of values) {
    if (typeof value !== 'string')
      continue
    pushUniqueRule(merged, value)
    if (merged.length >= maxItems)
      break
  }
  return merged
}

export function sanitizeGuidanceText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  const sanitized = sanitizeAlicizationProviderFacingText(normalized, maxChars)
  return sanitized === alicizationFixedTemplateReplacement ? '' : sanitized
}

function sanitizeHeldAutonomySummary(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''

  const normalized = raw.trim().replace(/\s+/g, ' ')
  const direct = sanitizeGuidanceText(normalized, maxChars)
  if (
    direct
    && !/\b(?:keep the opening lower-pressure|repair continuity first|avoid eager warmth|hold-for-opening|next-open-window)\b/iu.test(direct)
    && !/\b(?:no mind-authored visible reply was available|proactive_state=|phase=|unresolved=|why_now=|same-her|same her|same living line)\b/iu.test(direct)
    && !/^(?:label|summary|intent|defer|thread|scenario|goal|reason)=/iu.test(direct)
  ) {
    return direct
  }

  return normalized
    .split(/\s*(?:[。.!?！？]\s*|\|\s*|;\s*)/u)
    .map((fragment) => {
      const normalized = sanitizeGuidanceText(fragment, maxChars)
      if (!normalized)
        return ''
      if (
        /\b(?:keep the opening lower-pressure|repair continuity first|avoid eager warmth|hold-for-opening|next-open-window)\b/iu.test(normalized)
        || /\b(?:no mind-authored visible reply was available|proactive_state=|phase=|unresolved=|why_now=|same-her|same her|same living line)\b/iu.test(normalized)
        || /^(?:label|summary|intent|defer|thread|scenario|goal|reason)=/iu.test(normalized)
      ) {
        return ''
      }
      return normalized
    })
    .filter(Boolean)
    .join(' | ')
    .slice(0, maxChars)
}

export function mergeGuidanceLine(values: Array<string | null | undefined>, maxChars = 320) {
  const merged = mergeUniqueRules(values, values.length)
  return sanitizeGuidanceText(merged.join(' '), maxChars) || null
}

export function sanitizeToolPhaseSegment(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, '-').slice(0, 80)
}

function normalizeToolName(raw: unknown) {
  return typeof raw === 'string'
    ? raw.trim()
    : ''
}

export function filterMainGatewayToolsForRoutingIntent<T extends { function?: { name?: unknown } }>(
  tools: T[] | undefined,
  intent: AlicizationExecutionRoutingIntent | null,
) {
  if (!Array.isArray(tools) || tools.length === 0 || !intent)
    return tools

  const requiredToolNames = new Set(intent.requiredToolNames
    .map(name => normalizeToolName(name))
    .filter(Boolean))
  if (requiredToolNames.size === 0)
    return tools

  const filtered = tools.filter(entry => requiredToolNames.has(normalizeToolName(entry?.function?.name)))
  return filtered.length > 0
    ? filtered
    : tools
}

export function buildSessionContinuityRecallSeed(signals: AlicizationAgentSessionContinuityInput[]) {
  const afterglowSignals = signals
    .filter((signal) => {
      const source = typeof signal.metadata?.source === 'string' ? signal.metadata.source : ''
      return signal.label.startsWith('afterglow:')
        || source === 'autobiographical-afterglow'
    })
    .slice(-2)
  const heldAutonomySignals = signals
    .filter((signal) => {
      const metadata = signal.metadata ?? {}
      const source = typeof metadata.source === 'string' ? metadata.source : ''
      const hasStructuredAnchor = Boolean(
        sanitizeGuidanceText(metadata.threadId ?? metadata.sourceThreadId, 120),
      ) || Boolean(
        sanitizeGuidanceText(metadata.intentId ?? metadata.executionIntentKind, 120),
      ) || Boolean(
        sanitizeGuidanceText(metadata.reasonCode ?? metadata.reason, 160),
      ) || typeof metadata.deferredAt === 'number'
      return (
        signal.label.includes(':held-autonomy')
        || source === 'proactive-held-autonomy'
        || source === 'proactive-deferred'
      ) && hasStructuredAnchor
    })
    .slice(-2)
  if (
    afterglowSignals.length === 0
    && heldAutonomySignals.length === 0
  ) {
    return ''
  }

  const afterglowLines = afterglowSignals.map((signal) => {
    const metadata = signal.metadata ?? {}
    const threadAnchor = sanitizeGuidanceText(
      typeof metadata.threadAnchor === 'string' ? metadata.threadAnchor : '',
      120,
    )
    const afterglowTag = sanitizeGuidanceText(
      typeof metadata.afterglowTag === 'string' ? metadata.afterglowTag : '',
      64,
    )
    return [
      'continuity_afterglow:',
      `label=${sanitizeGuidanceText(signal.label, 120)}`,
      `summary=${sanitizeGuidanceText(signal.summary ?? '', 180)}`,
      threadAnchor ? `thread=${threadAnchor}` : '',
      afterglowTag ? `kind=${afterglowTag}` : '',
    ].filter(Boolean).join(' ')
  })

  const heldAutonomyLines = heldAutonomySignals.map((signal) => {
    const metadata = signal.metadata ?? {}
    const reasonCode = sanitizeGuidanceText(
      metadata.reasonCode ?? metadata.reason,
      160,
    )
    const threadId = sanitizeGuidanceText(
      metadata.threadId ?? metadata.sourceThreadId,
      120,
    )
    const intentId = sanitizeGuidanceText(
      metadata.intentId ?? metadata.executionIntentKind,
      120,
    )
    const deferredAt = typeof metadata.deferredAt === 'number'
      ? String(metadata.deferredAt)
      : sanitizeGuidanceText(metadata.deferredAt, 32)
    const rawDeferReason = sanitizeHeldAutonomySummary(metadata.deferReason, 120)
    const failure = sanitizeHeldAutonomySummary(metadata.failure, 220)
    const modelSummary = sanitizeHeldAutonomySummary(
      metadata.executionIntentSummary ?? signal.summary,
      220,
    )
    const deferReason = rawDeferReason && rawDeferReason !== failure
      ? rawDeferReason
      : ''

    return [
      reasonCode ? `reason_code=${reasonCode}` : '',
      threadId ? `thread_id=${threadId}` : '',
      intentId ? `intent_id=${intentId}` : '',
      deferredAt ? `deferred_at=${deferredAt}` : '',
      deferReason ? `defer_reason=${deferReason}` : '',
      failure ? `failure=${failure}` : '',
      modelSummary ? `model_summary=${modelSummary}` : '',
    ].filter(Boolean).join(' ')
  })

  return [
    ...afterglowLines,
    ...heldAutonomyLines,
  ].join('\n')
}

export function deriveOrganicMemoryBudgetClass(
  recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined,
): AlicizationMemoryRetrievalBudgetClass {
  const temporalFocus = recallGovernor?.recollectionIntent?.temporalFocus
  return temporalFocus === 'cross-session'
    || temporalFocus === 'distant'
    || temporalFocus === 'experience-matched'
    ? 'deep-recall-reply'
    : 'realtime-reply'
}
