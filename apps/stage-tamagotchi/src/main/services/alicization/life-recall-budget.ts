import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'

import { Buffer } from 'node:buffer'

export function boundLifeRecallBundle(bundle: LongTermMemoryEvidenceBundle, maximum = 6000) {
  const budget = { unit: 'utf8-bytes' as const, maximum: Math.max(0, Math.min(64_000, Math.floor(maximum))), used: 0, rejected: [] as string[], tokenizer: 'unavailable-conservative-byte-budget' as const }
  // A direct versioned preference must survive before a derived daily summary.
  const candidates = bundle.intent.mode === 'preference'
    ? [...bundle.evidence].sort((left, right) => Number(Boolean(right.candidate.lifeFact)) - Number(Boolean(left.candidate.lifeFact)))
    : bundle.evidence
  const evidence = candidates.filter((item) => {
    const cost = Buffer.byteLength(JSON.stringify(item), 'utf8')
    if (budget.used + cost > budget.maximum) {
      budget.rejected.push(`${item.candidate.source}:${item.candidate.id}`)
      return false
    }
    budget.used += cost
    return true
  })
  return { bundle: { ...bundle, evidence, confidence: budget.rejected.length && !evidence.length ? Math.min(bundle.confidence, 0.4) : bundle.confidence }, budget }
}
