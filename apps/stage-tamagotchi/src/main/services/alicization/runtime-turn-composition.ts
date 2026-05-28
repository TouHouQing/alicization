import type { AlicizationExecutionRoutingIntent } from '@proj-alicization/stage-shared'

import type { AlicizationRecallGovernorSnapshot } from '../../../shared/eventa'
import type { AlicizationAgentSessionContinuityInput } from './agent-runtime'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'
import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'

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
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
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

export function buildSessionMirrorRecollectionAfterthoughtSeed(mirror: AlicizationDialogueSessionMirror | null) {
  if (!mirror)
    return ''
  if (!mirror.recollectionSummary || !mirror.recollectionSurfaceSummary)
    return ''
  if (!mirror.recollectionSurfaceSummary.includes('afterthought=ripe'))
    return ''
  return [
    'mirror_recollection_afterthought:',
    mirror.recollectionSummary,
    mirror.recollectionSurfaceSummary,
  ].filter(Boolean).join(' ')
}

export function buildSessionMirrorRuntimeContinuitySeed(mirror: AlicizationDialogueSessionMirror | null) {
  if (!mirror)
    return ''
  if (!mirror.runtimeChannelSummary && !mirror.runtimeTransitionSummary)
    return ''

  return [
    'mirror_runtime_continuity:',
    mirror.runtimeChannelSummary ? mirror.runtimeChannelSummary : '',
    mirror.runtimeTransitionSummary ? mirror.runtimeTransitionSummary : '',
  ].filter(Boolean).join(' ')
}

export function buildSessionContinuityRecallSeed(signals: AlicizationAgentSessionContinuityInput[]) {
  const afterglowSignals = signals
    .filter((signal) => {
      const source = typeof signal.metadata?.source === 'string' ? signal.metadata.source : ''
      return signal.label.startsWith('afterglow:')
        || source === 'autobiographical-afterglow'
    })
    .slice(-2)

  if (afterglowSignals.length === 0)
    return ''

  return afterglowSignals.map((signal) => {
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
  }).join('\n')
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
