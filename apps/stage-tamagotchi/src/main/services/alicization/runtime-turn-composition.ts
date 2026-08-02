import type { AlicizationExecutionRoutingIntent } from '@proj-alicization/stage-shared'

import type { AlicizationRecallGovernorSnapshot } from '../../../shared/eventa'
import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'

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
