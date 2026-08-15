import type { AlicizationSubconsciousFragment, AlicizationSubconsciousFragmentSourceKind } from '../../../shared/eventa'

import { isRawDialogueTranscriptSubconsciousSource } from './dialogue-memory'

function normalizeRecallTerm(raw: string) {
  return raw.trim().toLowerCase()
}

export function scoreSubconsciousSourcePriority(sourceKind: AlicizationSubconsciousFragment['sourceKind']) {
  switch (sourceKind) {
    case 'fact-ledger':
      return 5
    case 'autobiographical-episode':
      return 4.5
    case 'reflection-ledger':
      return 4
    case 'mind-continuity':
      return 3
    case 'visual-sediment':
      return 2
    case 'active-demotion':
    case 'attitude-shift':
    case 'dream-fragment':
    case 'former-core-incarnation':
    case 'unforged-shattering-event':
    default:
      return 1
  }
}

export function rankSubconsciousRecallFragments(input: {
  rows: AlicizationSubconsciousFragment[]
  terms: string[]
  limit?: number
  sourceBudget?: Array<{
    sourceKind: AlicizationSubconsciousFragmentSourceKind
    maxItems: number
  }>
}) {
  const safeLimit = Number.isFinite(input.limit)
    ? Math.max(1, Math.floor(Number(input.limit)))
    : 2
  const loweredTerms = Array.from(new Set(input.terms.map(normalizeRecallTerm).filter(Boolean)))
  const sourceBudgetMap = new Map(
    (input.sourceBudget ?? [])
      .map((item) => {
        if (!item || typeof item !== 'object')
          return null
        if (Number.isFinite(item.maxItems))
          return [item.sourceKind, Math.max(0, Math.floor(Number(item.maxItems)))] as const
        return null
      })
      .filter((item): item is readonly [AlicizationSubconsciousFragmentSourceKind, number] => Boolean(item)),
  )

  const reranked = input.rows
    .filter(row => !isRawDialogueTranscriptSubconsciousSource(row.sourceKind))
    .sort((left, right) => {
      const leftText = left.text.toLowerCase()
      const rightText = right.text.toLowerCase()
      const leftLexicalScore = loweredTerms.reduce((score, term) => score + (leftText.includes(term) ? 1 : 0), 0)
      const rightLexicalScore = loweredTerms.reduce((score, term) => score + (rightText.includes(term) ? 1 : 0), 0)
      if (leftLexicalScore !== rightLexicalScore)
        return rightLexicalScore - leftLexicalScore

      const leftSourceScore = scoreSubconsciousSourcePriority(left.sourceKind)
      const rightSourceScore = scoreSubconsciousSourcePriority(right.sourceKind)
      if (leftSourceScore !== rightSourceScore)
        return rightSourceScore - leftSourceScore

      return right.createdAt - left.createdAt
    })

  const deduped: AlicizationSubconsciousFragment[] = []
  const sourceUsed = new Map<AlicizationSubconsciousFragmentSourceKind, number>()
  const deferredByBudget: AlicizationSubconsciousFragment[] = []

  for (const row of reranked) {
    if (deduped.some(item => item.text === row.text && item.sourceKind === row.sourceKind))
      continue
    const sourceCap = sourceBudgetMap.get(row.sourceKind)
    const used = sourceUsed.get(row.sourceKind) ?? 0
    if (sourceCap != null && used >= sourceCap) {
      deferredByBudget.push(row)
      continue
    }
    deduped.push(row)
    sourceUsed.set(row.sourceKind, used + 1)
    if (deduped.length >= safeLimit)
      break
  }

  if (deduped.length < safeLimit) {
    for (const row of deferredByBudget) {
      if (deduped.some(item => item.text === row.text && item.sourceKind === row.sourceKind))
        continue
      deduped.push(row)
      if (deduped.length >= safeLimit)
        break
    }
  }

  return deduped
}
