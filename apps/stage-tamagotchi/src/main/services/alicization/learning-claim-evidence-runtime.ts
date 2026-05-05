import type {
  AlicizationClaimEvidenceGraph,
  AlicizationClaimEvidenceNode,
  AlicizationClaimValidationState,
  AlicizationMemoryFact,
  AlicizationMemoryReflectionRecord,
  AlicizationRelationshipOutcomeRecord,
  AlicizationVerifiedLearningArtifact,
} from '@proj-alicization/stage-shared'
import type { AlicizationLearningTaskRecord } from '../../../shared/eventa'

import { normalizeMemoryDomain } from './memory-domain-model'

const worldModelSourceExpiryMs = 14 * 24 * 60 * 60 * 1000

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function factToEvidenceNode(input: {
  fact: AlicizationMemoryFact
  now: number
}): AlicizationClaimEvidenceNode {
  const fact = input.fact
  const domain = normalizeMemoryDomain(fact.memoryDomain)
  const observedAt = fact.updatedAt
  const expiresAt = domain === 'world-model'
    ? observedAt + worldModelSourceExpiryMs
    : null
  const expired = expiresAt != null && expiresAt <= input.now
  return {
    evidenceId: `fact:${fact.id}`,
    sourceKind: fact.sourceLabel?.includes('trusted') || fact.sourceLabel?.includes('tool')
      ? 'trusted-source'
      : 'memory-fact',
    sourceId: fact.id,
    summary: sanitizeText(`${fact.subject} ${fact.predicate} ${fact.object}`, 220),
    trust: clamp01(
      fact.confidence
      + ((fact.validationStatus ?? 'unverified') === 'validated' ? 0.12 : 0)
      - Math.min(0.28, (fact.contradictionCount ?? 0) * 0.08),
    ),
    observedAt,
    expiresAt,
    validationState: expired
      ? 'expired'
      : (fact.validationStatus ?? 'unverified'),
    contradictionCount: Math.max(0, fact.contradictionCount ?? 0),
  }
}

function reflectionToEvidenceNode(reflection: AlicizationMemoryReflectionRecord): AlicizationClaimEvidenceNode {
  return {
    evidenceId: `reflection:${reflection.id}`,
    sourceKind: 'memory-reflection',
    sourceId: reflection.id,
    summary: sanitizeText(`${reflection.summary} ${reflection.lesson}`, 220),
    trust: clamp01(reflection.confidence - (reflection.status === 'superseded' ? 0.22 : 0)),
    observedAt: reflection.updatedAt,
    expiresAt: null,
    validationState: reflection.status === 'confirmed'
      ? 'validated'
      : reflection.status === 'superseded'
        ? 'superseded'
        : 'provisional',
    contradictionCount: reflection.status === 'superseded' ? 1 : 0,
  }
}

function outcomeToEvidenceNode(outcome: AlicizationRelationshipOutcomeRecord): AlicizationClaimEvidenceNode {
  const contradictionDelta = Math.max(0, -(outcome.boundaryDelta ?? 0)) + Math.max(0, outcome.burdenDelta ?? 0)
  return {
    evidenceId: `outcome:${outcome.id}`,
    sourceKind: 'relationship-outcome',
    sourceId: outcome.id,
    summary: sanitizeText(outcome.summary || outcome.actionSummary, 220),
    trust: clamp01(0.62 + Math.min(0.18, contradictionDelta * 0.8)),
    observedAt: outcome.createdAt,
    expiresAt: null,
    validationState: contradictionDelta > 0.12 ? 'contradicted' : 'validated',
    contradictionCount: contradictionDelta > 0.12 ? 1 : 0,
  }
}

function deriveValidationState(input: {
  support: AlicizationClaimEvidenceNode[]
  contradiction: AlicizationClaimEvidenceNode[]
}) {
  const supportTrust = input.support.reduce((sum, item) => sum + item.trust, 0)
  const contradictionTrust = input.contradiction.reduce((sum, item) => sum + item.trust, 0)
  const expiredCount = input.support.filter(item => item.validationState === 'expired').length
  if (contradictionTrust >= Math.max(0.7, supportTrust))
    return 'contradicted' satisfies AlicizationClaimValidationState
  if (expiredCount > 0 && supportTrust < 0.9)
    return 'expired' satisfies AlicizationClaimValidationState
  if (supportTrust >= 1.1 && contradictionTrust <= 0.25)
    return 'validated' satisfies AlicizationClaimValidationState
  if (supportTrust >= 0.52)
    return 'provisional' satisfies AlicizationClaimValidationState
  return 'unverified' satisfies AlicizationClaimValidationState
}

export function buildClaimEvidenceGraphFromMemoryFact(input: {
  now: number
  fact: AlicizationMemoryFact
}): AlicizationClaimEvidenceGraph {
  const domain = normalizeMemoryDomain(input.fact.memoryDomain)
  const normalizedDomain = domain === 'procedure' || domain === 'relationship' || domain === 'self-model' || domain === 'world-model'
    ? domain
    : 'world-model'
  return buildLearningClaimEvidenceGraph({
    now: input.now,
    task: {
      id: `organic-memory:${input.fact.id}`,
      cardId: 'organic-memory',
      taskId: `organic-memory:${input.fact.id}`,
      status: 'completed',
      triggerAt: input.now,
      action: 'verify',
      message: `${input.fact.subject} ${input.fact.predicate} ${input.fact.object}`,
      payload: {
        action: 'verify',
        reason: `${input.fact.subject} ${input.fact.predicate} ${input.fact.object}`,
        focuses: [`organic-memory:${normalizedDomain}`],
        dominantTrajectory: `${normalizedDomain} evidence carry`,
        sourceSignals: [input.fact.sourceLabel ?? input.fact.subject],
        learningReadiness: input.fact.confidence,
        contradictionPressure: Math.min(1, (input.fact.contradictionCount ?? 0) * 0.25),
        revisionPressure: 0,
        autobiographicalStability: input.fact.confidence,
        supportingFactIds: [input.fact.id],
        supportingReflectionIds: [],
        supportingOutcomeIds: [],
        supersedeTargets: [],
        conflictTargets: input.fact.conflictsWith ?? [],
        sourceTurnId: null,
        sourceSessionId: null,
        decisionTraceId: `organic-memory:${input.fact.id}`,
      },
      attemptCount: 0,
      maxAttempts: 1,
      createdAt: input.now,
      updatedAt: input.now,
      claimedAt: null,
      startedAt: null,
      completedAt: input.now,
      blockedAt: null,
      cancelledAt: null,
      downgradedAt: null,
      reopenedAt: null,
      nextRetryAt: null,
      sourceTurnId: null,
      resultSummary: null,
      failureKind: null,
      lastError: null,
      firedTurnId: null,
    },
    domain: normalizedDomain,
    supportingFacts: [input.fact],
    relatedReflections: [],
    relatedOutcomes: [],
    verificationBasis: [
      (input.fact.validationStatus ?? 'unverified') === 'validated' ? 'existing-memory' : '',
      input.fact.sourceLabel?.includes('trusted') || input.fact.sourceLabel?.includes('tool') ? 'trusted-source' : '',
    ].filter(Boolean),
  })
}

export function buildLearningClaimEvidenceGraph(input: {
  now: number
  task: AlicizationLearningTaskRecord
  domain: AlicizationVerifiedLearningArtifact['domain']
  supportingFacts: AlicizationMemoryFact[]
  relatedReflections: AlicizationMemoryReflectionRecord[]
  relatedOutcomes: AlicizationRelationshipOutcomeRecord[]
  verificationBasis: string[]
}): AlicizationClaimEvidenceGraph {
  const supportingEvidence = [
    ...input.supportingFacts.map(fact => factToEvidenceNode({ fact, now: input.now })),
    ...input.relatedReflections.map(reflectionToEvidenceNode),
    ...input.relatedOutcomes.map(outcomeToEvidenceNode),
  ]
  const contradictingEvidence = supportingEvidence.filter(item =>
    item.validationState === 'contradicted'
    || item.validationState === 'superseded'
    || item.validationState === 'expired'
    || item.contradictionCount > 0,
  )
  const stableSupport = supportingEvidence.filter(item =>
    item.validationState === 'validated'
    || item.validationState === 'provisional',
  )
  const validationState = deriveValidationState({
    support: stableSupport,
    contradiction: contradictingEvidence,
  })
  const sourceTrust = clamp01(
    stableSupport.reduce((sum, item) => sum + item.trust, 0)
    / Math.max(1, stableSupport.length),
  )
  const expiredSourceIds = supportingEvidence
    .filter(item => item.validationState === 'expired')
    .map(item => item.sourceId)
  const shouldRevalidate = input.domain === 'world-model'
    && (
      expiredSourceIds.length > 0
      || !input.verificationBasis.some(item => item === 'trusted-source' || item === 'runtime-result' || item === 'existing-memory')
    )
  const reasonTags = [
    input.domain === 'world-model' && shouldRevalidate ? 'world-model-revalidation-required' : '',
    contradictingEvidence.length > 0 ? 'contradiction-present' : '',
    stableSupport.length === 0 ? 'insufficient-stable-support' : '',
  ].filter(Boolean)
  const currentBelief = stableSupport[0]?.summary ?? (sanitizeText(input.task.payload.reason ?? input.task.message, 220) || null)

  return {
    version: 'claim-evidence-graph-v1',
    producedAt: input.now,
    claimId: `${input.task.taskId}:claim`,
    claim: currentBelief ?? `${input.domain} learning claim`,
    domain: input.domain,
    supportingEvidence,
    contradictingEvidence,
    supersededBy: contradictingEvidence
      .filter(item => item.validationState === 'superseded')
      .map(item => item.sourceId),
    currentBelief,
    validationState,
    sourceTrust,
    lastRevalidatedAt: input.verificationBasis.some(item => item === 'trusted-source' || item === 'runtime-result')
      ? input.now
      : null,
    revalidationPolicy: {
      shouldRevalidate,
      nextRevalidationAt: shouldRevalidate ? input.now + worldModelSourceExpiryMs : null,
      expiredSourceIds,
      reasonTags,
    },
    internalizationDecision: {
      mayInternalize: validationState === 'validated' && !shouldRevalidate && contradictingEvidence.length === 0,
      mayValidateOnly: validationState === 'validated' || validationState === 'provisional',
      blockedReasons: [
        shouldRevalidate ? 'revalidation-required' : '',
        validationState === 'contradicted' ? 'contradiction-present' : '',
        validationState === 'expired' ? 'source-expired' : '',
        stableSupport.length === 0 ? 'no-stable-support' : '',
      ].filter(Boolean),
    },
  }
}

export function buildVerifiedLearningArtifact(input: {
  now: number
  task: AlicizationLearningTaskRecord
  domain: AlicizationVerifiedLearningArtifact['domain']
  verificationBasis: string[]
  supportingFacts: AlicizationMemoryFact[]
  relatedReflections: AlicizationMemoryReflectionRecord[]
  relatedOutcomes: AlicizationRelationshipOutcomeRecord[]
}): AlicizationVerifiedLearningArtifact {
  const claimGraph = buildLearningClaimEvidenceGraph({
    now: input.now,
    task: input.task,
    domain: input.domain,
    supportingFacts: input.supportingFacts,
    relatedReflections: input.relatedReflections,
    relatedOutcomes: input.relatedOutcomes,
    verificationBasis: input.verificationBasis,
  })
  const verifier = (() => {
    const base = {
      mayVerify: claimGraph.validationState === 'validated' || claimGraph.validationState === 'provisional',
      mayInternalize: claimGraph.internalizationDecision.mayInternalize,
      mayValidateOnly: claimGraph.internalizationDecision.mayValidateOnly,
      rollbackRequired: claimGraph.validationState === 'contradicted',
      blockedReasons: claimGraph.internalizationDecision.blockedReasons,
    }
    if (input.domain === 'procedure') {
      return {
        kind: 'procedure-verifier' as const,
        ...base,
        mayInternalize: base.mayInternalize && claimGraph.sourceTrust >= 0.72,
        blockedReasons: [
          ...base.blockedReasons,
          claimGraph.sourceTrust < 0.72 ? 'procedure-source-trust-low' : '',
        ].filter(Boolean),
      }
    }
    if (input.domain === 'relationship') {
      return {
        kind: 'relationship-verifier' as const,
        ...base,
        mayInternalize: base.mayInternalize && claimGraph.contradictingEvidence.length === 0 && claimGraph.sourceTrust >= 0.7,
        blockedReasons: [
          ...base.blockedReasons,
          claimGraph.sourceTrust < 0.7 ? 'relationship-source-trust-low' : '',
        ].filter(Boolean),
      }
    }
    if (input.domain === 'self-model') {
      return {
        kind: 'self-model-verifier' as const,
        ...base,
        mayInternalize: base.mayInternalize && claimGraph.contradictingEvidence.length === 0 && claimGraph.sourceTrust >= 0.74,
        blockedReasons: [
          ...base.blockedReasons,
          claimGraph.sourceTrust < 0.74 ? 'self-model-source-trust-low' : '',
        ].filter(Boolean),
      }
    }
    return {
      kind: 'world-model-verifier' as const,
      ...base,
      mayInternalize: false,
      mayValidateOnly: base.mayValidateOnly && !claimGraph.revalidationPolicy.shouldRevalidate && claimGraph.sourceTrust >= 0.76,
      blockedReasons: [
        ...base.blockedReasons,
        claimGraph.sourceTrust < 0.76 ? 'world-model-source-trust-low' : '',
      ].filter(Boolean),
    }
  })()
  const status: AlicizationVerifiedLearningArtifact['status'] = verifier.rollbackRequired
    ? 'rollback-required'
    : verifier.mayInternalize
    ? 'verified'
      : verifier.mayValidateOnly
        ? 'downgraded'
        : 'blocked'
  const internalizationStage: AlicizationVerifiedLearningArtifact['internalizationStage'] = verifier.mayInternalize
    ? (input.domain === 'world-model' ? 'validated-knowledge' : 'internalized-long-horizon-knowledge')
    : verifier.mayValidateOnly
      ? 'validated-knowledge'
      : 'working-understanding'
  return {
    version: 'verified-learning-artifact-v1',
    artifactId: `${input.task.taskId}:artifact`,
    taskId: input.task.taskId,
    action: input.task.action,
    domain: input.domain,
    verifier,
    status,
    producedAt: input.now,
    claimGraph,
    verificationBasis: input.verificationBasis,
    supportingFactIds: input.supportingFacts.map(item => item.id),
    contradictionFactIds: claimGraph.contradictingEvidence
      .filter(item => item.sourceKind === 'memory-fact' || item.sourceKind === 'trusted-source')
      .map(item => item.sourceId),
    internalizationStage,
    reason: verifier.mayInternalize
      ? 'validated support is strong enough for durable carry'
      : verifier.blockedReasons[0]
        ?? 'validation remained provisional',
  }
}
