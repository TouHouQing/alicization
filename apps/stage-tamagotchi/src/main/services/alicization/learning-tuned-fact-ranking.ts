import type { AlicizationMemoryFact } from '../../../shared/eventa'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'

import { normalizeMemoryDomain } from './memory-domain-model'

function computeLearningDomainAdjustment(input: {
  fact: AlicizationMemoryFact
  tuningAdvice: AlicizationMemoryTuningAdvice | null
}) {
  const tuningAdvice = input.tuningAdvice ?? null
  if (!tuningAdvice)
    return 0

  const domain = normalizeMemoryDomain(input.fact.memoryDomain)
  let score = 0

  if (domain === 'relationship' && tuningAdvice.focusDimensions.includes('learningRevisionDiscipline')) {
    score -= tuningAdvice.surfaceAdjustments.provenanceLabelBias * 0.08
    score -= tuningAdvice.personStateAdjustments.closenessCapBias * 0.06
  }
  if (domain === 'relationship' && (tuningAdvice.relationshipEraConfusionRate ?? 0) >= 0.2) {
    score -= (tuningAdvice.relationshipEraConfusionRate ?? 0) * 0.18
    score -= tuningAdvice.personStateAdjustments.repairWindowBias * 0.08
  }
  if (domain === 'self-model' && tuningAdvice.focusDimensions.includes('learningRevisionDiscipline')) {
    score -= tuningAdvice.surfaceAdjustments.provenanceLabelBias * 0.06
    score -= tuningAdvice.surfaceAdjustments.specificityClampBias * 0.04
  }
  if (domain === 'self-model' && (tuningAdvice.staleSelfModelVetoRate ?? 0) >= 0.2) {
    score -= (tuningAdvice.staleSelfModelVetoRate ?? 0) * 0.18
    score -= tuningAdvice.personStateAdjustments.closenessCapBias * 0.06
  }
  if (domain === 'world-model' && tuningAdvice.focusDimensions.includes('worldModelValidationDiscipline')) {
    if ((input.fact.validationStatus ?? 'unverified') !== 'validated')
      score -= 0.28 + tuningAdvice.surfaceAdjustments.specificityClampBias * 0.2
    if ((input.fact.knowledgeStage ?? 'working-understanding') === 'internalized-long-horizon-knowledge')
      score -= 0.16
  }
  if (domain === 'procedure' && tuningAdvice.focusDimensions.includes('domainInternalizationDiscipline')) {
    score += 0.08 + tuningAdvice.retrievalAdjustments.proceduralBoost * 0.2
  }

  return score
}

export function rankFactsByLearningTuning(input: {
  facts: AlicizationMemoryFact[]
  tuningAdvice: AlicizationMemoryTuningAdvice | null
}) {
  const tuningAdvice = input.tuningAdvice ?? null
  if (!tuningAdvice || input.facts.length <= 1)
    return input.facts

  return [...input.facts]
    .map((fact) => ({
      fact,
      score: fact.confidence
        + computeLearningDomainAdjustment({
            fact,
            tuningAdvice,
          }),
    }))
    .sort((left, right) => right.score - left.score)
    .map(item => item.fact)
}
