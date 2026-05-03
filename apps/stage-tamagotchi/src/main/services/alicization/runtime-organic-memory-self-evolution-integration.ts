import type {
  AlicizationMemoryStats,
  AlicizationPersonStateEvolutionSummary,
} from '../../../shared/eventa'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { buildDerivedMindStateBundle } from '@proj-alicization/stage-shared'

import { buildAlicizationSelfEvolutionKernel } from './self-evolution-kernel'

export function deriveKnowledgeEvidence(input: {
  retrievedFacts: OrganicMemoryPromptContext['retrievedFacts']
  proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
}) {
  const validationCount = input.retrievedFacts.reduce((sum, fact) => sum + Math.max(0, fact.validationCount ?? 0), 0)
  const contradictionCount = input.retrievedFacts.reduce((sum, fact) => sum + Math.max(0, fact.contradictionCount ?? 0), 0)
  const stronglyValidatedProcedureCount = input.retrievedFacts.filter(fact =>
    fact.predicate.toLowerCase().includes('procedure')
    && ((fact.validationCount ?? 0) >= 2 || fact.knowledgeStage === 'internalized-long-horizon-knowledge'),
  ).length + input.proceduralMemories.filter(item => item.confidence >= 0.84).length
  const contradictionHeavyFactCount = input.retrievedFacts.filter(fact => (fact.contradictionCount ?? 0) >= 2).length
  const procedureFactCount = input.retrievedFacts.filter(fact => fact.memoryDomain === 'procedure').length
  const relationshipFactCount = input.retrievedFacts.filter(fact => fact.memoryDomain === 'relationship').length
  const selfModelFactCount = input.retrievedFacts.filter(fact => fact.memoryDomain === 'self-model').length
  const worldModelFactCount = input.retrievedFacts.filter(fact => fact.memoryDomain === 'world-model').length
  return {
    validationCount,
    contradictionCount,
    stronglyValidatedProcedureCount,
    contradictionHeavyFactCount,
    procedureFactCount,
    relationshipFactCount,
    selfModelFactCount,
    worldModelFactCount,
  }
}

export function buildOrganicMemoryEvolutionState(input: {
  producedAt: number
  retrievedFacts: OrganicMemoryPromptContext['retrievedFacts']
  proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
  personStateEvolutionSummary?: AlicizationPersonStateEvolutionSummary | null
  hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
  memoryStats?: AlicizationMemoryStats | null
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  recollectionPlan: OrganicMemoryPromptContext['recollectionPlan'] | null
  recollectionSpeechPlan: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null
  memoryDeliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null
  personStateProjection: AlicizationPersonStateProjection | null
}) {
  const knowledgeEvidence = deriveKnowledgeEvidence({
    retrievedFacts: input.retrievedFacts,
    proceduralMemories: input.proceduralMemories,
  })
  const selfEvolution = buildAlicizationSelfEvolutionKernel({
    personStateEvolutionSummary: input.personStateEvolutionSummary ?? null,
    hostPersonModel: input.hostPersonModel,
    knowledgeEvidence,
    reflectionSummary: input.personStateEvolutionSummary?.recentSummaries?.[0] ?? null,
    reflectionLesson: input.personStateEvolutionSummary?.explanation?.[0] ?? null,
    reflectionTargetScope: input.personStateEvolutionSummary?.latestDoctrine ? 'relationship' : null,
    reflectionPressure: input.memoryStats?.retrievalHealth?.memorySurfaceViolationRate ?? 0,
    autobiographicalLatestInflection: input.personStateEvolutionSummary?.recentSummaries?.[0] ?? null,
    autobiographicalStability: 0.5,
  })
  const derivedMindStateBundle = buildDerivedMindStateBundle({
    source: 'main-runtime',
    producedAt: input.producedAt,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection as unknown as Record<string, unknown> | null,
    knowledgeEvidence,
    selfEvolution,
    recollectionIntent: input.recollectionIntent as unknown as Record<string, unknown> | null,
    recollectionPlan: input.recollectionPlan,
    recollectionSpeechPlan: input.recollectionSpeechPlan,
    memoryDeliberation: input.memoryDeliberation as unknown as Record<string, unknown> | null,
  })

  return {
    knowledgeEvidence,
    selfEvolution,
    derivedMindStateBundle,
  }
}
