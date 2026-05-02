import type { AlicizationMemoryFact } from '../../../shared/eventa'

import { deriveFactMemoryTier, scoreMemoryTierReachability } from './memory-tiering'

const dayMs = 24 * 60 * 60 * 1000

function tokenizeMemoryFactText(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9\u4E00-\u9FFF]+/u)
      .map(token => token.trim())
      .filter(Boolean),
  )
}

export function scoreAlicizationMemoryFact(input: {
  queryTokens: Set<string>
  fact: AlicizationMemoryFact
  currentTs: number
}) {
  const factTokens = tokenizeMemoryFactText(`${input.fact.subject} ${input.fact.predicate} ${input.fact.object}`)
  if (factTokens.size === 0)
    return 0

  let overlap = 0
  for (const token of factTokens) {
    if (input.queryTokens.has(token))
      overlap += 1
  }

  const lexicalScore = overlap / factTokens.size
  const ageDays = Math.max(0, (input.currentTs - input.fact.updatedAt) / dayMs)
  const vagueQuery = input.queryTokens.size <= 3
  const memoryTier = input.fact.memoryTier ?? deriveFactMemoryTier(input.fact, input.currentTs)
  const coldTier = memoryTier === 'cold'
  const longTailEligible = coldTier || (ageDays >= 45 && input.fact.confidence >= 0.72)
  const longTailFloor = longTailEligible && (lexicalScore >= 0.22 || vagueQuery) ? 0.35 : 0
  const decay = Math.max(Math.exp(-ageDays / 14), longTailFloor)
  const accessBoost = Math.min(0.2, input.fact.accessCount / 50)
  const coldReachabilityBoost = longTailEligible && vagueQuery
    ? Math.min(0.08, input.fact.confidence * 0.08)
    : 0
  const tierReachabilityBoost = scoreMemoryTierReachability({
    tier: memoryTier,
    vagueQuery,
    temporalFocus: null,
    longHorizonPreferred: longTailEligible,
  })

  return (lexicalScore * 0.5 + input.fact.confidence * 0.4 + accessBoost * 0.1) * decay
    + coldReachabilityBoost
    + tierReachabilityBoost
}

export function rankAlicizationMemoryFacts(input: {
  facts: AlicizationMemoryFact[]
  query: string
  limit: number
  currentTs: number
}) {
  const normalizedQuery = input.query.trim()
  if (!normalizedQuery)
    return []

  const queryTokens = tokenizeMemoryFactText(normalizedQuery)
  return input.facts
    .map(fact => ({
      fact,
      score: scoreAlicizationMemoryFact({
        queryTokens,
        fact,
        currentTs: input.currentTs,
      }),
    }))
    .filter(item => item.score > 0.01)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(0, input.limit))
}
