import type { AlicizationMemoryFact } from '../../../shared/eventa'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'

import { normalizeMemoryDomain } from './memory-domain-model'

function computeRetrievalDomainAdjustment(input: {
  fact: AlicizationMemoryFact
  tuningAdvice: AlicizationMemoryTuningAdvice | null
}) {
  const retrievalAdjustments = input.tuningAdvice?.retrievalAdjustments
  if (!retrievalAdjustments)
    return 0

  const domain = normalizeMemoryDomain(input.fact.memoryDomain)
  if (domain === 'procedure')
    return retrievalAdjustments.proceduralBoost * 0.2
  if (domain === 'relationship')
    return retrievalAdjustments.relationshipBoost * 0.2
  return 0
}

export function rankFactsByLearningTuning(input: {
  facts: AlicizationMemoryFact[]
  tuningAdvice: AlicizationMemoryTuningAdvice | null
}) {
  const tuningAdvice = input.tuningAdvice ?? null
  if (!tuningAdvice || input.facts.length <= 1)
    return input.facts

  return [...input.facts]
    .map(fact => ({
      fact,
      score: fact.confidence
        + computeRetrievalDomainAdjustment({
          fact,
          tuningAdvice,
        }),
    }))
    .sort((left, right) => right.score - left.score)
    .map(item => item.fact)
}
