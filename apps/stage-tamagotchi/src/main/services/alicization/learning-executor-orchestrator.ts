import type {
  AlicizationLearningTaskRecord,
  AlicizationMemoryFact,
  AlicizationMemoryReflectionRecord,
  AlicizationRelationshipOutcomeRecord,
} from '../../../shared/eventa'
import type { AlicizationLearningActionExecutorResult, CreateAlicizationLearningActionExecutorOptions } from './learning-action-executor'

import { buildVerifiedLearningArtifact } from './learning-claim-evidence-runtime'
import {
  buildLearningEvidenceSnapshot,
  type AlicizationLearningVerificationBasis,
} from './learning-domain-verifiers'
import {
  applyLearningRevisionCorrectionsEffect,
  applyLearningVerificationCorrectionsEffect,
  blockLearningVerificationEffect,
  buildLearningReviseTargets,
  buildLearningVerifyCorrectionTargets,
  confirmLearningReflectionPressureEffect,
  internalizeLearningFactsEffect,
  recordLearningReflectionEffect,
  rollbackVerifiedLearningArtifactEffect,
  supersedeLearningReflectionLinesEffect,
  type AlicizationLearningTaskEffectContext,
} from './learning-task-effects'
import {
  deriveAlicizationLearningLifecycleState,
  deriveAlicizationLearningPolicyFeedback,
  deriveNextAlicizationLearningLifecycleState,
} from './learning-state-machine'

interface AlicizationPreparedLearningTaskContext extends AlicizationLearningTaskEffectContext {
  effectiveSupportCount: number
}

async function loadLearningTaskSupport(
  options: CreateAlicizationLearningActionExecutorOptions,
  task: AlicizationLearningTaskRecord,
) {
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

  return {
    supportingFacts,
    relatedReflections,
    relatedOutcomes,
  } satisfies {
    supportingFacts: AlicizationMemoryFact[]
    relatedReflections: AlicizationMemoryReflectionRecord[]
    relatedOutcomes: AlicizationRelationshipOutcomeRecord[]
  }
}

function buildPreparedLearningTaskContext(input: {
  now: number
  task: AlicizationLearningTaskRecord
  supportingFacts: AlicizationMemoryFact[]
  relatedReflections: AlicizationMemoryReflectionRecord[]
  relatedOutcomes: AlicizationRelationshipOutcomeRecord[]
}) {
  const evidence = buildLearningEvidenceSnapshot({
    supportingFacts: input.supportingFacts,
    relatedReflections: input.relatedReflections,
    relatedOutcomes: input.relatedOutcomes,
    task: input.task,
  })
  const verifiedArtifact = buildVerifiedLearningArtifact({
    now: input.now,
    task: input.task,
    domain: evidence.domain,
    verificationBasis: evidence.verificationBasis,
    supportingFacts: input.supportingFacts,
    relatedReflections: input.relatedReflections,
    relatedOutcomes: input.relatedOutcomes,
  })

  return {
    task: input.task,
    domain: evidence.domain,
    domains: evidence.domains,
    effectiveSupportCount: evidence.effectiveSupportCount,
    verificationBasis: evidence.verificationBasis as AlicizationLearningVerificationBasis,
    verifiedArtifact,
    supportingFacts: input.supportingFacts,
    relatedReflections: input.relatedReflections,
    relatedOutcomes: input.relatedOutcomes,
  } satisfies AlicizationPreparedLearningTaskContext
}

async function executeVerifyLearningTask(
  options: CreateAlicizationLearningActionExecutorOptions,
  context: AlicizationPreparedLearningTaskContext,
): Promise<AlicizationLearningActionExecutorResult> {
  const { domain, effectiveSupportCount, relatedReflections, verifiedArtifact } = context

  if (effectiveSupportCount === 0) {
    return blockLearningVerificationEffect(options, context, {
      resultSummary: 'Verification is waiting for stronger fact or reflection support.',
      error: 'missing supporting facts and reflections',
      delayMs: 90_000,
    })
  }

  if (
    domain === 'world-model'
    && (
      !context.verificationBasis.some(item => item === 'existing-memory' || item === 'trusted-source' || item === 'runtime-result')
      || verifiedArtifact.claimGraph.revalidationPolicy.shouldRevalidate
    )
  ) {
    return blockLearningVerificationEffect(options, context, {
      resultSummary: 'World-model verification is waiting for revalidated trusted evidence before it can stabilize.',
      error: 'world-model verification source missing or expired',
      delayMs: 180_000,
    })
  }

  if (verifiedArtifact.status === 'rollback-required' && verifiedArtifact.contradictionFactIds.length > 0)
    return rollbackVerifiedLearningArtifactEffect(options, context)

  const correctionTargets = buildLearningVerifyCorrectionTargets(context)
  if (correctionTargets.length === 0 && relatedReflections.length > 0)
    return confirmLearningReflectionPressureEffect(options, context)

  if (correctionTargets.length === 0) {
    return blockLearningVerificationEffect(options, context, {
      resultSummary: `No contradictory ${domain} target was strong enough to verify yet.`,
      error: 'no contradictory durable fact to verify',
      delayMs: 120_000,
    })
  }

  return applyLearningVerificationCorrectionsEffect(options, context, correctionTargets)
}

async function executeReviseLearningTask(
  options: CreateAlicizationLearningActionExecutorOptions,
  context: AlicizationPreparedLearningTaskContext,
): Promise<AlicizationLearningActionExecutorResult> {
  const reviseTargets = buildLearningReviseTargets(context)
  if (reviseTargets.length === 0 && context.relatedReflections.length > 0)
    return supersedeLearningReflectionLinesEffect(options, context)

  if (reviseTargets.length === 0) {
    return {
      status: 'blocked',
      resultSummary: `Revision is waiting for a clearer stale ${context.domain} target.`,
      error: 'no revise target available',
      nextRetryAt: options.now() + 120_000,
    }
  }

  return applyLearningRevisionCorrectionsEffect(options, context, reviseTargets)
}

async function executeInternalizeLearningTask(
  options: CreateAlicizationLearningActionExecutorOptions,
  context: AlicizationPreparedLearningTaskContext,
): Promise<AlicizationLearningActionExecutorResult> {
  if (context.supportingFacts.length === 0) {
    return {
      status: 'blocked',
      resultSummary: 'Internalization is waiting for stable supporting facts.',
      error: 'no stable supporting facts to internalize',
      nextRetryAt: options.now() + 150_000,
      verifiedArtifact: context.verifiedArtifact,
    }
  }
  if (context.domain === 'world-model' && !context.verifiedArtifact.verifier.mayValidateOnly) {
    return {
      status: 'blocked',
      resultSummary: 'World-model internalization is blocked until the claim evidence graph reaches validated support.',
      error: 'world-model artifact not validated',
      nextRetryAt: options.now() + 180_000,
      verifiedArtifact: context.verifiedArtifact,
    }
  }
  if (context.domain !== 'world-model' && !context.verifiedArtifact.verifier.mayInternalize) {
    return {
      status: 'blocked',
      resultSummary: `${context.domain} internalization is blocked until the verified learning artifact reaches durable confidence.`,
      error: 'verified artifact not internalizable',
      nextRetryAt: options.now() + 150_000,
      verifiedArtifact: context.verifiedArtifact,
    }
  }

  return internalizeLearningFactsEffect(options, context)
}

export async function executeAlicizationLearningTaskOrchestrator(
  options: CreateAlicizationLearningActionExecutorOptions,
  task: AlicizationLearningTaskRecord,
): Promise<AlicizationLearningActionExecutorResult> {
  const support = await loadLearningTaskSupport(options, task)
  const context = buildPreparedLearningTaskContext({
    now: options.now(),
    task,
    ...support,
  })
  const lifecycleState = deriveAlicizationLearningLifecycleState({
    task,
    verifiedArtifact: context.verifiedArtifact,
  })

  const finalize = async (result: AlicizationLearningActionExecutorResult): Promise<AlicizationLearningActionExecutorResult> => {
    const verifiedArtifact = result.verifiedArtifact ?? context.verifiedArtifact
    const nextLifecycleState = deriveNextAlicizationLearningLifecycleState({
      currentState: lifecycleState,
      result,
      verifiedArtifact,
    })
    const finalized = {
      ...result,
      verifiedArtifact,
      lifecycleState,
      nextLifecycleState,
      policyFeedback: deriveAlicizationLearningPolicyFeedback({
        state: lifecycleState,
        domain: context.domain,
        result,
        verifiedArtifact,
      }),
    }
    await options.recordLearningExecutionTelemetry?.({
      status: finalized.status,
      domain: context.domain,
      internalizedAsValidatedOnly: finalized.status === 'completed' && context.domain === 'world-model',
      policyFeedback: finalized.policyFeedback ?? null,
    })
    return finalized
  }

  if (task.action === 'record' || task.action === 'reflect')
    return await finalize(await recordLearningReflectionEffect(options, context))

  if (task.action === 'verify')
    return await finalize(await executeVerifyLearningTask(options, context))

  if (task.action === 'revise')
    return await finalize(await executeReviseLearningTask(options, context))

  if (task.action === 'internalize')
    return await finalize(await executeInternalizeLearningTask(options, context))

  return await finalize({
    status: 'cancelled',
    resultSummary: `Unsupported learning action: ${task.action}`,
    error: 'unsupported learning action',
  })
}
