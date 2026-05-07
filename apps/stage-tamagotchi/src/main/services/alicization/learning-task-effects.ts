import type {
  AlicizationKnowledgeAssimilationCorrection,
  AlicizationLearningTaskRecord,
  AlicizationMemoryDomain,
  AlicizationMemoryFact,
  AlicizationMemoryFactInput,
  AlicizationMemoryReflectionInput,
  AlicizationMemoryReflectionRecord,
  AlicizationRelationshipOutcomeRecord,
} from '../../../shared/eventa'
import type { AlicizationVerifiedLearningArtifact } from '@proj-alicization/stage-shared'
import type { AlicizationLearningActionExecutorResult } from './learning-action-executor'
import type { AlicizationLearningVerificationBasis } from './learning-domain-verifiers'
import type { AlicizationLearningPolicyFeedback } from './learning-state-machine'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import { appendLearningExecutionEvidence } from './learning-artifact-store'
import { buildDomainReflectionTargetScope, buildInternalizeFactInput } from './learning-domain-verifiers'
import { normalizeMemoryDomain } from './memory-domain-model'

export interface AlicizationLearningTaskEffectOptions {
  now: () => number
  cardId: string
  listMemoryFacts: () => Promise<AlicizationMemoryFact[]>
  upsertMemoryReflections: (entries: AlicizationMemoryReflectionInput[]) => Promise<unknown>
  applyMemoryFactCorrections: (corrections: AlicizationKnowledgeAssimilationCorrection[]) => Promise<unknown>
  upsertMemoryFacts: (facts: AlicizationMemoryFactInput[], source: 'rule') => Promise<unknown>
  appendMindTurnEvents?: (events: Array<{
    decisionTraceId: string
    turnId?: string | null
    sessionId?: string | null
    origin?: 'user-turn' | 'subconscious-proactive' | 'system'
    kind: 'learning-executed'
    payload: Record<string, unknown>
    createdAt: number
  }>) => Promise<unknown>
  assimilateMemoryFactsDetailed: (input: {
    facts: AlicizationMemoryFactInput[]
    source: 'rule'
    existingFacts: AlicizationMemoryFact[]
  }) => {
    facts: AlicizationMemoryFactInput[]
    corrections: AlicizationKnowledgeAssimilationCorrection[]
  }
  recordLearningExecutionTelemetry?: (input: {
    status: AlicizationLearningActionExecutorResult['status']
    domain?: AlicizationMemoryDomain | null
    internalizedAsValidatedOnly?: boolean
    policyFeedback?: AlicizationLearningPolicyFeedback | null
    selfRevisionStatePatch?: AlicizationSelfRevisionStatePatch | null
  }) => Promise<void>
}

export interface AlicizationLearningTaskEffectContext {
  task: AlicizationLearningTaskRecord
  domain: AlicizationMemoryDomain
  domains: AlicizationMemoryDomain[]
  supportingFacts: AlicizationMemoryFact[]
  relatedReflections: AlicizationMemoryReflectionRecord[]
  relatedOutcomes: AlicizationRelationshipOutcomeRecord[]
  verificationBasis: AlicizationLearningVerificationBasis
  verifiedArtifact: AlicizationVerifiedLearningArtifact
}

async function recordLearningEvidence(input: {
  options: AlicizationLearningTaskEffectOptions
  context: AlicizationLearningTaskEffectContext
  resultSummary: string
  includeVerificationBasis?: boolean
}) {
  const { context, options } = input
  await appendLearningExecutionEvidence({
    options,
    task: context.task,
    domain: context.domain,
    resultSummary: input.resultSummary,
    verificationBasis: input.includeVerificationBasis ? context.verificationBasis : undefined,
    verifiedArtifact: context.verifiedArtifact,
  })
}

export async function recordLearningReflectionEffect(
  options: AlicizationLearningTaskEffectOptions,
  context: AlicizationLearningTaskEffectContext,
): Promise<AlicizationLearningActionExecutorResult> {
  const { domain, relatedOutcomes, supportingFacts, task } = context
  const lesson = task.payload.reason
    ?? task.payload.sourceSignals[0]
    ?? task.payload.dominantTrajectory
    ?? 'Recent interaction changed how this continuity line should be carried.'
  const summary = task.payload.dominantTrajectory
    ?? task.payload.sourceSignals[0]
    ?? task.message
  const resultSummary = `Recorded ${domain} learning reflection.`
  await options.upsertMemoryReflections([{
    cardId: options.cardId,
    decisionTraceId: task.payload.decisionTraceId,
    turnId: task.payload.sourceTurnId,
    sessionId: task.payload.sourceSessionId,
    sourceKind: 'maintenance',
    targetScope: buildDomainReflectionTargetScope(domain),
    summary,
    lesson,
    status: task.action === 'record' ? 'pending' : 'confirmed',
    confidence: Math.max(0.55, task.payload.learningReadiness),
    supportingFactIds: supportingFacts.map(item => item.id),
    supportingOutcomeIds: relatedOutcomes.map(item => item.id),
  }])
  await recordLearningEvidence({
    options,
    context,
    resultSummary,
    includeVerificationBasis: true,
  })
  return {
    status: 'completed',
    resultSummary,
    verifiedArtifact: context.verifiedArtifact,
  }
}

export async function blockLearningVerificationEffect(
  options: AlicizationLearningTaskEffectOptions,
  context: AlicizationLearningTaskEffectContext,
  input: {
    resultSummary: string
    error: string
    delayMs: number
  },
): Promise<AlicizationLearningActionExecutorResult> {
  return {
    status: 'blocked',
    resultSummary: input.resultSummary,
    error: input.error,
    nextRetryAt: options.now() + input.delayMs,
    verificationBasis: context.verificationBasis,
    verifiedArtifact: context.verifiedArtifact,
  }
}

export async function rollbackVerifiedLearningArtifactEffect(
  options: AlicizationLearningTaskEffectOptions,
  context: AlicizationLearningTaskEffectContext,
): Promise<AlicizationLearningActionExecutorResult> {
  const { domain, task, verifiedArtifact } = context
  const resultSummary = `Verified artifact required rollback for ${verifiedArtifact.contradictionFactIds.length} ${domain} claim(s).`
  await options.applyMemoryFactCorrections(verifiedArtifact.contradictionFactIds.map(factId => ({
    targetFactId: factId,
    nextValidationStatus: 'provisional',
    nextKnowledgeStage: 'validated-knowledge',
    sourceLabel: `artifact-rollback:${verifiedArtifact.artifactId}`,
    appendConflictsWith: task.payload.conflictTargets,
  })))
  await recordLearningEvidence({
    options,
    context,
    resultSummary,
    includeVerificationBasis: true,
  })
  return {
    status: 'downgraded',
    resultSummary,
    verificationBasis: context.verificationBasis,
    verifiedArtifact,
  }
}

export function buildLearningVerifyCorrectionTargets(context: AlicizationLearningTaskEffectContext) {
  return context.supportingFacts
    .filter(fact => {
      const factDomain = normalizeMemoryDomain(fact.memoryDomain)
      if (factDomain === 'relationship' || factDomain === 'self-model')
        return context.task.payload.conflictTargets.includes(fact.id) || (fact.contradictionCount ?? 0) > 0
      if (factDomain === 'world-model')
        return (fact.contradictionCount ?? 0) > 0
      return (fact.contradictionCount ?? 0) > 0 || context.task.payload.conflictTargets.includes(fact.id)
    })
    .map(fact => ({
      targetFactId: fact.id,
      nextValidationStatus: 'provisional' as const,
      nextKnowledgeStage: fact.knowledgeStage === 'internalized-long-horizon-knowledge'
        ? 'validated-knowledge' as const
        : fact.knowledgeStage ?? 'working-understanding' as const,
      sourceLabel: `learning-verify-${normalizeMemoryDomain(fact.memoryDomain)}`,
      appendConflictsWith: context.task.payload.conflictTargets,
    }))
}

export async function confirmLearningReflectionPressureEffect(
  options: AlicizationLearningTaskEffectOptions,
  context: AlicizationLearningTaskEffectContext,
): Promise<AlicizationLearningActionExecutorResult> {
  const { domain, relatedOutcomes, relatedReflections, task } = context
  const resultSummary = `Verification confirmed ${domain} reflection pressure without reopening a durable fact yet.`
  await options.upsertMemoryReflections(relatedReflections.map(item => ({
    id: item.id,
    cardId: options.cardId,
    decisionTraceId: task.payload.decisionTraceId,
    turnId: task.payload.sourceTurnId,
    sessionId: task.payload.sourceSessionId,
    sourceKind: 'maintenance',
    targetScope: buildDomainReflectionTargetScope(domain),
    summary: item.summary,
    lesson: item.lesson,
    status: 'confirmed',
    confidence: domain === 'world-model' ? 0.78 : 0.74,
    supportingFactIds: task.payload.supportingFactIds,
    supportingOutcomeIds: relatedOutcomes.map(item => item.id),
  })))
  await recordLearningEvidence({
    options,
    context,
    resultSummary,
    includeVerificationBasis: true,
  })
  return {
    status: 'completed',
    resultSummary,
    verificationBasis: context.verificationBasis,
    verifiedArtifact: context.verifiedArtifact,
  }
}

export async function applyLearningVerificationCorrectionsEffect(
  options: AlicizationLearningTaskEffectOptions,
  context: AlicizationLearningTaskEffectContext,
  correctionTargets: AlicizationKnowledgeAssimilationCorrection[],
): Promise<AlicizationLearningActionExecutorResult> {
  const resultSummary = `Verification reopened ${correctionTargets.length} ${context.domain} target(s).`
  await options.applyMemoryFactCorrections(correctionTargets)
  await recordLearningEvidence({
    options,
    context,
    resultSummary,
    includeVerificationBasis: true,
  })
  return {
    status: 'completed',
    resultSummary,
    verificationBasis: context.verificationBasis,
    verifiedArtifact: context.verifiedArtifact,
  }
}

export function buildLearningReviseTargets(context: AlicizationLearningTaskEffectContext) {
  return context.supportingFacts.filter(fact => {
    const factDomain = normalizeMemoryDomain(fact.memoryDomain)
    if (factDomain === 'relationship' || factDomain === 'self-model')
      return context.task.payload.conflictTargets.includes(fact.id) || (fact.contradictionCount ?? 0) >= 1
    return context.task.payload.conflictTargets.includes(fact.id) || (fact.contradictionCount ?? 0) >= 2
  })
}

export async function supersedeLearningReflectionLinesEffect(
  options: AlicizationLearningTaskEffectOptions,
  context: AlicizationLearningTaskEffectContext,
): Promise<AlicizationLearningActionExecutorResult> {
  const { domain, relatedOutcomes, relatedReflections, task } = context
  const resultSummary = `Revision superseded stale ${domain} reflection lines while waiting for fact-level rewrite.`
  await options.upsertMemoryReflections(relatedReflections.map(item => ({
    id: item.id,
    cardId: options.cardId,
    decisionTraceId: task.payload.decisionTraceId,
    turnId: task.payload.sourceTurnId,
    sessionId: task.payload.sourceSessionId,
    sourceKind: 'maintenance',
    targetScope: buildDomainReflectionTargetScope(domain),
    summary: item.summary,
    lesson: item.lesson,
    status: 'superseded',
    confidence: 0.74,
    supportingFactIds: task.payload.supportingFactIds,
    supportingOutcomeIds: relatedOutcomes.map(entry => entry.id),
  })))
  await recordLearningEvidence({
    options,
    context,
    resultSummary,
  })
  return {
    status: 'completed',
    resultSummary,
    verifiedArtifact: context.verifiedArtifact,
  }
}

export async function applyLearningRevisionCorrectionsEffect(
  options: AlicizationLearningTaskEffectOptions,
  context: AlicizationLearningTaskEffectContext,
  reviseTargets: AlicizationMemoryFact[],
): Promise<AlicizationLearningActionExecutorResult> {
  const resultSummary = `Revision superseded ${reviseTargets.length} stale ${context.domain} target(s).`
  await options.applyMemoryFactCorrections(reviseTargets.map(fact => ({
    targetFactId: fact.id,
    nextValidationStatus: 'superseded',
    nextKnowledgeStage: fact.knowledgeStage ?? 'working-understanding',
    sourceLabel: `learning-revise-${normalizeMemoryDomain(fact.memoryDomain)}`,
    appendConflictsWith: context.task.payload.conflictTargets,
  })))
  await recordLearningEvidence({
    options,
    context,
    resultSummary,
  })
  return {
    status: 'completed',
    resultSummary,
    verifiedArtifact: context.verifiedArtifact,
  }
}

export async function internalizeLearningFactsEffect(
  options: AlicizationLearningTaskEffectOptions,
  context: AlicizationLearningTaskEffectContext,
): Promise<AlicizationLearningActionExecutorResult> {
  const { domain, domains, supportingFacts } = context
  const factsToAssimilate = supportingFacts.map(fact => buildInternalizeFactInput(fact, normalizeMemoryDomain(fact.memoryDomain)))
  const assimilation = options.assimilateMemoryFactsDetailed({
    facts: factsToAssimilate,
    source: 'rule',
    existingFacts: await options.listMemoryFacts().catch(() => []),
  })
  if (assimilation.corrections.length > 0)
    await options.applyMemoryFactCorrections(assimilation.corrections)
  await options.upsertMemoryFacts(assimilation.facts, 'rule')
  const domainSummary = [...new Set(domains)].join(', ') || domain
  const resultSummary = `Internalized or validated ${assimilation.facts.length} ${domainSummary} fact(s).`
  await recordLearningEvidence({
    options,
    context,
    resultSummary,
  })
  return {
    status: 'completed',
    resultSummary,
    verifiedArtifact: context.verifiedArtifact,
  }
}
