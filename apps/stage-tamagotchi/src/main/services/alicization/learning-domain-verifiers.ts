import type {
  AlicizationLearningTaskRecord,
  AlicizationMemoryDomain,
  AlicizationMemoryFact,
  AlicizationMemoryFactInput,
  AlicizationMemoryReflectionInput,
  AlicizationMemoryReflectionRecord,
  AlicizationRelationshipOutcomeRecord,
} from '../../../shared/eventa'

import { normalizeMemoryDomain } from './memory-domain-model'

export type AlicizationLearningVerificationBasis = Array<'existing-memory' | 'runtime-result' | 'trusted-source' | 'conflict-review'>

export interface AlicizationLearningEvidenceSnapshot {
  domains: AlicizationMemoryDomain[]
  domain: AlicizationMemoryDomain
  reflectionPressure: number
  effectiveSupportCount: number
  verificationBasis: AlicizationLearningVerificationBasis
}

export function dedupeLearningFactDomains(facts: AlicizationMemoryFact[]) {
  const domains = new Set<AlicizationMemoryDomain>()
  for (const fact of facts)
    domains.add(normalizeMemoryDomain(fact.memoryDomain))
  return [...domains]
}

export function resolveDominantLearningDomain(facts: AlicizationMemoryFact[]): AlicizationMemoryDomain {
  const counts = new Map<AlicizationMemoryDomain, number>()
  for (const fact of facts) {
    const domain = normalizeMemoryDomain(fact.memoryDomain)
    counts.set(domain, (counts.get(domain) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'world-model'
}

export function buildDomainReflectionTargetScope(domain: AlicizationMemoryDomain): AlicizationMemoryReflectionInput['targetScope'] {
  if (domain === 'procedure')
    return 'habit'
  if (domain === 'relationship')
    return 'relationship'
  if (domain === 'self-model')
    return 'self'
  return 'truth'
}

export function buildInternalizeFactInput(fact: AlicizationMemoryFact, domain: AlicizationMemoryDomain): AlicizationMemoryFactInput {
  const procedureConfidenceFloor = domain === 'procedure' ? 0.86 : 0.82
  const relationshipConfidenceFloor = domain === 'relationship' ? 0.8 : 0.82
  const selfModelConfidenceFloor = domain === 'self-model' ? 0.8 : 0.82
  const worldModelConfidenceFloor = domain === 'world-model' ? 0.84 : 0.82
  const confidenceFloor = domain === 'procedure'
    ? procedureConfidenceFloor
    : domain === 'relationship'
      ? relationshipConfidenceFloor
      : domain === 'self-model'
        ? selfModelConfidenceFloor
        : worldModelConfidenceFloor
  return {
    subject: fact.subject,
    predicate: fact.predicate,
    object: fact.object,
    confidence: Math.max(fact.confidence, confidenceFloor),
    memoryDomain: domain,
    knowledgeStage: domain === 'world-model'
      ? 'validated-knowledge'
      : 'internalized-long-horizon-knowledge',
    validationStatus: 'validated',
    sourceLabel: domain === 'procedure'
      ? 'learning-internalized-procedure'
      : domain === 'relationship'
        ? 'learning-internalized-relationship'
        : domain === 'self-model'
          ? 'learning-internalized-self-model'
          : 'learning-validated-world-model',
    conflictsWith: fact.conflictsWith ?? [],
    supersedes: fact.supersedes ?? [],
  }
}

export function inferLearningVerificationBasis(input: {
  supportingFacts: AlicizationMemoryFact[]
  relatedReflections: AlicizationMemoryReflectionRecord[]
  relatedOutcomes: AlicizationRelationshipOutcomeRecord[]
  task: AlicizationLearningTaskRecord
}): AlicizationLearningVerificationBasis {
  const basis = new Set<AlicizationLearningVerificationBasis[number]>()
  if (input.supportingFacts.some(fact => (fact.validationCount ?? 0) > 0 || fact.validationStatus === 'validated'))
    basis.add('existing-memory')
  if (input.relatedOutcomes.length > 0)
    basis.add('runtime-result')
  if (input.supportingFacts.some(fact =>
    fact.sourceLabel?.includes('trusted')
    || fact.sourceLabel?.includes('tool')
    || fact.provenance === 'observed',
  )) {
    basis.add('trusted-source')
  }
  if (
    input.task.payload.conflictTargets.length > 0
    || input.supportingFacts.some(fact => (fact.contradictionCount ?? 0) > 0)
    || input.relatedReflections.some(reflection => /conflict|contradiction|stale|矛盾|旧理解/u.test(`${reflection.summary} ${reflection.lesson}`))
  ) {
    basis.add('conflict-review')
  }
  return [...basis]
}

export function buildLearningEvidenceSnapshot(input: {
  supportingFacts: AlicizationMemoryFact[]
  relatedReflections: AlicizationMemoryReflectionRecord[]
  relatedOutcomes: AlicizationRelationshipOutcomeRecord[]
  task: AlicizationLearningTaskRecord
}): AlicizationLearningEvidenceSnapshot {
  const domains = dedupeLearningFactDomains(input.supportingFacts)
  const domain = resolveDominantLearningDomain(input.supportingFacts)
  const reflectionPressure = input.relatedReflections.filter(item =>
    item.status === 'pending'
    || /repair|truth|boundary|verify|contradiction|stale|修复|边界|核实|矛盾/u.test(`${item.summary} ${item.lesson}`),
  ).length
  return {
    domains,
    domain,
    reflectionPressure,
    effectiveSupportCount: input.supportingFacts.length + reflectionPressure + input.relatedOutcomes.length,
    verificationBasis: inferLearningVerificationBasis(input),
  }
}
