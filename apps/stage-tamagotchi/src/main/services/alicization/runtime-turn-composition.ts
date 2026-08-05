import type { AlicizationRecallGovernorSnapshot } from '../../../shared/eventa'
import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'

export function sanitizeToolPhaseSegment(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, '-').slice(0, 80)
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
