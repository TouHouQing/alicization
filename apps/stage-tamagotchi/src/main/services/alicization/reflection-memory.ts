import type { AlicizationReflectionEntrySnapshot, AlicizationReflectionLedgerSnapshot } from '../../../shared/eventa'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function latestReflectionEntry(ledger?: AlicizationReflectionLedgerSnapshot | null): AlicizationReflectionEntrySnapshot | null {
  if (!ledger)
    return null
  return ledger.entries.find(entry => entry.id === ledger.latestEntryId)
    ?? ledger.entries[0]
    ?? null
}

function formatConfidenceShift(value: number) {
  if (!Number.isFinite(value))
    return ''
  return Number(value).toFixed(2)
}

// This layer converts the latest self-revision into deterministic subconscious text,
// so reflection pressure is remembered across future turns instead of staying ephemeral.
export function buildReflectionLedgerFragment(input: {
  previousLedger?: AlicizationReflectionLedgerSnapshot | null
  nextLedger?: AlicizationReflectionLedgerSnapshot | null
}) {
  const previous = latestReflectionEntry(input.previousLedger)
  const next = latestReflectionEntry(input.nextLedger)
  if (!next)
    return ''
  if (next.id === previous?.id)
    return ''

  const revision = sanitizeText(next.revision, 220)
  const summary = sanitizeText(next.summary, 180)
  if (!revision && !summary)
    return ''

  const confidenceShift = formatConfidenceShift(next.confidenceShift)
  return [
    `reflection_outcome:${next.outcome}`,
    next.targetProjectId ? `reflection_project:${sanitizeText(next.targetProjectId, 120)}` : '',
    next.targetAnswerAct ? `reflection_act:${sanitizeText(next.targetAnswerAct, 120)}` : '',
    next.targetRepairId ? `reflection_repair:${sanitizeText(next.targetRepairId, 120)}` : '',
    next.targetThreadId ? `reflection_thread:${sanitizeText(next.targetThreadId, 120)}` : '',
    confidenceShift ? `reflection_confidence_shift:${confidenceShift}` : '',
    input.nextLedger ? `reflection_pressure:${input.nextLedger.revisionPressure.toFixed(2)}` : '',
    summary ? `summary:${summary}` : '',
    revision ? `revision:${revision}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}
