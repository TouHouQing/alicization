import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationMemoryStats,
  AlicizationPersonStateEvolutionSummary,
} from '../../../shared/eventa'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import {
  buildDerivedMindStateBundle,
  deriveAlicizationLearningExecutionProjection,
} from '@proj-alicization/stage-shared'

import { buildAlicizationAffectiveResidueMemory } from './affective-residue-memory'
import { buildAlicizationDomainNativeMemoryViews } from './memory-domain-model'
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
  const nativeViews = buildAlicizationDomainNativeMemoryViews(input.retrievedFacts)
  const procedureFactCount = nativeViews.procedure.length
  const relationshipFactCount = nativeViews.relationship.length
  const selfModelFactCount = nativeViews.selfModel.length
  const worldModelFactCount = nativeViews.worldModel.length
  const procedureViewStrength = nativeViews.procedure.length > 0
    ? nativeViews.procedure.reduce((sum, item) => sum + item.reusableStepScore, 0) / nativeViews.procedure.length
    : 0
  const relationshipViewStrength = nativeViews.relationship.length > 0
    ? nativeViews.relationship.reduce((sum, item) => sum + item.boundaryContinuity, 0) / nativeViews.relationship.length
    : 0
  const selfModelViewStrength = nativeViews.selfModel.length > 0
    ? nativeViews.selfModel.reduce((sum, item) => sum + item.narrativeStability, 0) / nativeViews.selfModel.length
    : 0
  const worldModelViewStrength = nativeViews.worldModel.length > 0
    ? nativeViews.worldModel.reduce((sum, item) => sum + item.sourceTrust, 0) / nativeViews.worldModel.length
    : 0
  return {
    validationCount,
    contradictionCount,
    stronglyValidatedProcedureCount,
    contradictionHeavyFactCount,
    procedureFactCount,
    relationshipFactCount,
    selfModelFactCount,
    worldModelFactCount,
    procedureViewStrength,
    relationshipViewStrength,
    selfModelViewStrength,
    worldModelViewStrength,
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
  claimEvidenceGraphs?: OrganicMemoryPromptContext['claimEvidenceGraphs'] | null
  personStateProjection: AlicizationPersonStateProjection | null
  learningExecutionState?: AlicizationLearningExecutionStateSnapshot | null
  recallLatencyPolicy?: OrganicMemoryPromptContext['recallLatencyPolicy'] | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  recentRelationshipOutcomes?: OrganicMemoryPromptContext['recentRelationshipOutcomes'] | null
  recentMemoryReflections?: OrganicMemoryPromptContext['recentMemoryReflections'] | null
  relationshipDynamics?: AlicizationRelationshipDynamicsState | null
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
  const affectiveResidue = input.affectiveResidue ?? buildAlicizationAffectiveResidueMemory({
    now: input.producedAt,
    recentRelationshipOutcomes: input.recentRelationshipOutcomes ?? null,
    recentMemoryReflections: input.recentMemoryReflections ?? null,
    personStateEvolutionSummary: input.personStateEvolutionSummary ?? null,
    personalityContinuityState: input.personStateProjection?.personalityContinuityState ?? null,
    hostPersonModel: input.hostPersonModel,
    relationshipDynamics: input.relationshipDynamics ?? null,
  })
  const derivedMindStateBundle = buildDerivedMindStateBundle({
    source: 'main-runtime',
    producedAt: input.producedAt,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection as unknown as Record<string, unknown> | null,
    knowledgeEvidence,
    claimEvidenceGraphs: input.claimEvidenceGraphs ?? null,
    selfEvolution,
    affectiveResidue,
    learningExecutionState: deriveAlicizationLearningExecutionProjection({
      persistedState: input.learningExecutionState ?? null,
      selfEvolution,
      projectionMode: 'advisory-only',
    }),
    recallLatencyPolicy: input.recallLatencyPolicy ?? null,
    recollectionIntent: input.recollectionIntent as unknown as Record<string, unknown> | null,
    recollectionPlan: input.recollectionPlan,
    recollectionSpeechPlan: input.recollectionSpeechPlan,
    memoryDeliberation: input.memoryDeliberation as unknown as Record<string, unknown> | null,
  })

  return {
    knowledgeEvidence,
    selfEvolution,
    affectiveResidue,
    derivedMindStateBundle,
  }
}
