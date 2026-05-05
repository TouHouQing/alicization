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

import { normalizeMemoryDomain } from './memory-domain-model'
import { buildVerifiedLearningArtifact } from './learning-claim-evidence-runtime'
import {
  buildDomainReflectionTargetScope,
  buildInternalizeFactInput,
  buildLearningEvidenceSnapshot,
} from './learning-domain-verifiers'
import { appendLearningExecutionEvidence } from './learning-artifact-store'

export interface AlicizationLearningActionExecutorResult {
  status: 'completed' | 'blocked' | 'failed' | 'reopened' | 'downgraded' | 'cancelled'
  resultSummary?: string | null
  failureKind?: 'dependency-missing' | 'validation-insufficient' | 'runtime-error' | 'cancelled' | null
  error?: string | null
  nextRetryAt?: number | null
  firedTurnId?: string | null
  verificationBasis?: Array<'existing-memory' | 'runtime-result' | 'trusted-source' | 'conflict-review'> | null
  verifiedArtifact?: AlicizationVerifiedLearningArtifact | null
}

interface CreateAlicizationLearningActionExecutorOptions {
  now: () => number
  cardId: string
  listMemoryFacts: () => Promise<AlicizationMemoryFact[]>
  listMemoryReflections: (input: {
    cardId: string
    turnId?: string
    limit?: number
  }) => Promise<AlicizationMemoryReflectionRecord[]>
  listRelationshipOutcomes: (input: {
    cardId: string
    turnId?: string
    limit?: number
  }) => Promise<AlicizationRelationshipOutcomeRecord[]>
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
  }) => Promise<void>
}

export function createAlicizationLearningActionExecutor(options: CreateAlicizationLearningActionExecutorOptions) {
  return async function executeLearningTask(task: AlicizationLearningTaskRecord): Promise<AlicizationLearningActionExecutorResult> {
    const supportingFacts = (await options.listMemoryFacts().catch(() => []))
      .filter(fact => task.payload.supportingFactIds.includes(fact.id))
    const relatedReflections = task.payload.sourceTurnId
      ? await options.listMemoryReflections({
          cardId: options.cardId,
          turnId: task.payload.sourceTurnId,
          limit: 16,
        }).catch(() => [])
      : []
    const relatedOutcomes = task.payload.sourceTurnId
      ? await options.listRelationshipOutcomes({
          cardId: options.cardId,
          turnId: task.payload.sourceTurnId,
          limit: 16,
        }).catch(() => [])
      : []

    const evidence = buildLearningEvidenceSnapshot({
      supportingFacts,
      relatedReflections,
      relatedOutcomes,
      task,
    })
    const {
      domain,
      domains,
      effectiveSupportCount,
      verificationBasis,
    } = evidence
    const verifiedArtifact = buildVerifiedLearningArtifact({
      now: options.now(),
      task,
      domain,
      verificationBasis,
      supportingFacts,
      relatedReflections,
      relatedOutcomes,
    })

    if (task.action === 'record' || task.action === 'reflect') {
      const lesson = task.payload.reason
        ?? task.payload.sourceSignals[0]
        ?? task.payload.dominantTrajectory
        ?? 'Recent interaction changed how this continuity line should be carried.'
      const summary = task.payload.dominantTrajectory
        ?? task.payload.sourceSignals[0]
        ?? task.message
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
      await options.recordLearningExecutionTelemetry?.({
        status: 'completed',
        domain,
      })
      await appendLearningExecutionEvidence({
        options,
        task,
        domain,
        resultSummary: `Recorded ${domain} learning reflection.`,
        verificationBasis,
        verifiedArtifact,
      })
      return {
        status: 'completed',
        resultSummary: `Recorded ${domain} learning reflection.`,
        verifiedArtifact,
      }
    }

    if (task.action === 'verify') {
      if (effectiveSupportCount === 0) {
        await options.recordLearningExecutionTelemetry?.({
          status: 'blocked',
          domain,
        })
        return {
          status: 'blocked',
          resultSummary: 'Verification is waiting for stronger fact or reflection support.',
          error: 'missing supporting facts and reflections',
          nextRetryAt: options.now() + 90_000,
          verificationBasis,
          verifiedArtifact,
        }
      }
      if (
        domain === 'world-model'
        && (
          !verificationBasis.some(item => item === 'existing-memory' || item === 'trusted-source' || item === 'runtime-result')
          || verifiedArtifact.claimGraph.revalidationPolicy.shouldRevalidate
        )
      ) {
        await options.recordLearningExecutionTelemetry?.({
          status: 'blocked',
          domain,
        })
        return {
          status: 'blocked',
          resultSummary: 'World-model verification is waiting for revalidated trusted evidence before it can stabilize.',
          error: 'world-model verification source missing or expired',
          nextRetryAt: options.now() + 180_000,
          verificationBasis,
          verifiedArtifact,
        }
      }
      if (verifiedArtifact.status === 'rollback-required' && verifiedArtifact.contradictionFactIds.length > 0) {
        await options.applyMemoryFactCorrections(verifiedArtifact.contradictionFactIds.map(factId => ({
          targetFactId: factId,
          nextValidationStatus: 'provisional',
          nextKnowledgeStage: 'validated-knowledge',
          sourceLabel: `artifact-rollback:${verifiedArtifact.artifactId}`,
          appendConflictsWith: task.payload.conflictTargets,
        })))
        await options.recordLearningExecutionTelemetry?.({
          status: 'downgraded',
          domain,
        })
        await appendLearningExecutionEvidence({
          options,
          task,
          domain,
          resultSummary: `Verified artifact required rollback for ${verifiedArtifact.contradictionFactIds.length} ${domain} claim(s).`,
          verificationBasis,
          verifiedArtifact,
        })
        return {
          status: 'downgraded',
          resultSummary: `Verified artifact required rollback for ${verifiedArtifact.contradictionFactIds.length} ${domain} claim(s).`,
          verificationBasis,
          verifiedArtifact,
        }
      }
      const correctionTargets = supportingFacts
        .filter(fact => {
          const factDomain = normalizeMemoryDomain(fact.memoryDomain)
          if (factDomain === 'relationship' || factDomain === 'self-model')
            return task.payload.conflictTargets.includes(fact.id) || (fact.contradictionCount ?? 0) > 0
          if (factDomain === 'world-model')
            return (fact.contradictionCount ?? 0) > 0
          return (fact.contradictionCount ?? 0) > 0 || task.payload.conflictTargets.includes(fact.id)
        })
        .map(fact => ({
          targetFactId: fact.id,
          nextValidationStatus: 'provisional' as const,
          nextKnowledgeStage: fact.knowledgeStage === 'internalized-long-horizon-knowledge'
            ? 'validated-knowledge' as const
            : fact.knowledgeStage ?? 'working-understanding' as const,
          sourceLabel: `learning-verify-${normalizeMemoryDomain(fact.memoryDomain)}`,
          appendConflictsWith: task.payload.conflictTargets,
        }))

      if (correctionTargets.length === 0 && relatedReflections.length > 0) {
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
          await appendLearningExecutionEvidence({
            options,
            task,
            domain,
            resultSummary: `Verification confirmed ${domain} reflection pressure without reopening a durable fact yet.`,
            verificationBasis,
            verifiedArtifact,
          })
          return {
            status: 'completed',
            resultSummary: `Verification confirmed ${domain} reflection pressure without reopening a durable fact yet.`,
            verificationBasis,
            verifiedArtifact,
        }
      }

      if (correctionTargets.length === 0) {
        await options.recordLearningExecutionTelemetry?.({
          status: 'blocked',
          domain,
        })
        return {
          status: 'blocked',
          resultSummary: `No contradictory ${domain} target was strong enough to verify yet.`,
          error: 'no contradictory durable fact to verify',
          nextRetryAt: options.now() + 120_000,
          verificationBasis,
          verifiedArtifact,
        }
      }
      await options.applyMemoryFactCorrections(correctionTargets)
      await options.recordLearningExecutionTelemetry?.({
        status: 'completed',
        domain,
      })
      await appendLearningExecutionEvidence({
        options,
        task,
        domain,
        resultSummary: `Verification reopened ${correctionTargets.length} ${domain} target(s).`,
        verificationBasis,
        verifiedArtifact,
      })
      return {
        status: 'completed',
        resultSummary: `Verification reopened ${correctionTargets.length} ${domain} target(s).`,
        verificationBasis,
        verifiedArtifact,
      }
    }

    if (task.action === 'revise') {
      const reviseTargets = supportingFacts.filter(fact => {
        const factDomain = normalizeMemoryDomain(fact.memoryDomain)
        if (factDomain === 'relationship' || factDomain === 'self-model')
          return task.payload.conflictTargets.includes(fact.id) || (fact.contradictionCount ?? 0) >= 1
        return task.payload.conflictTargets.includes(fact.id) || (fact.contradictionCount ?? 0) >= 2
      })

      if (reviseTargets.length === 0 && relatedReflections.length > 0) {
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
          await appendLearningExecutionEvidence({
            options,
            task,
            domain,
            resultSummary: `Revision superseded stale ${domain} reflection lines while waiting for fact-level rewrite.`,
            verifiedArtifact,
          })
          return {
            status: 'completed',
            resultSummary: `Revision superseded stale ${domain} reflection lines while waiting for fact-level rewrite.`,
            verifiedArtifact,
        }
      }

      if (reviseTargets.length === 0) {
        return {
          status: 'blocked',
          resultSummary: `Revision is waiting for a clearer stale ${domain} target.`,
          error: 'no revise target available',
          nextRetryAt: options.now() + 120_000,
        }
      }

      await options.applyMemoryFactCorrections(reviseTargets.map(fact => ({
        targetFactId: fact.id,
        nextValidationStatus: 'superseded',
        nextKnowledgeStage: fact.knowledgeStage ?? 'working-understanding',
        sourceLabel: `learning-revise-${normalizeMemoryDomain(fact.memoryDomain)}`,
        appendConflictsWith: task.payload.conflictTargets,
      })))
      await options.recordLearningExecutionTelemetry?.({
        status: 'completed',
        domain,
      })
      await appendLearningExecutionEvidence({
        options,
        task,
        domain,
        resultSummary: `Revision superseded ${reviseTargets.length} stale ${domain} target(s).`,
        verifiedArtifact,
      })
      return {
        status: 'completed',
        resultSummary: `Revision superseded ${reviseTargets.length} stale ${domain} target(s).`,
        verifiedArtifact,
      }
    }

    if (task.action === 'internalize') {
      if (supportingFacts.length === 0) {
        return {
          status: 'blocked',
          resultSummary: 'Internalization is waiting for stable supporting facts.',
          error: 'no stable supporting facts to internalize',
          nextRetryAt: options.now() + 150_000,
          verifiedArtifact,
        }
      }
      if (domain === 'world-model' && !verifiedArtifact.verifier.mayValidateOnly) {
        return {
          status: 'blocked',
          resultSummary: 'World-model internalization is blocked until the claim evidence graph reaches validated support.',
          error: 'world-model artifact not validated',
          nextRetryAt: options.now() + 180_000,
          verifiedArtifact,
        }
      }
      if (domain !== 'world-model' && !verifiedArtifact.verifier.mayInternalize) {
        return {
          status: 'blocked',
          resultSummary: `${domain} internalization is blocked until the verified learning artifact reaches durable confidence.`,
          error: 'verified artifact not internalizable',
          nextRetryAt: options.now() + 150_000,
          verifiedArtifact,
        }
      }
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
      await options.recordLearningExecutionTelemetry?.({
        status: 'completed',
        domain,
        internalizedAsValidatedOnly: domain === 'world-model',
      })
      await appendLearningExecutionEvidence({
        options,
        task,
        domain,
        resultSummary: `Internalized or validated ${assimilation.facts.length} ${domainSummary} fact(s).`,
        verifiedArtifact,
      })
      return {
        status: 'completed',
        resultSummary: `Internalized or validated ${assimilation.facts.length} ${domainSummary} fact(s).`,
        verifiedArtifact,
      }
    }

    return {
      status: 'cancelled',
      resultSummary: `Unsupported learning action: ${task.action}`,
      error: 'unsupported learning action',
    }
  }
}
