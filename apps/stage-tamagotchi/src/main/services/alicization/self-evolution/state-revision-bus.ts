import type { AlicizationMemoryDomain } from '../../../../shared/eventa'
import type { AlicizationLearningPolicyFeedback } from '../learning-state-machine'
import type { AlicizationSelfRevisionEvent } from './self-revision-ledger'

export type AlicizationSelfRevisionStatePatchLane
  = | 'memory-policy'
    | 'relationship-posture'
    | 'response-posture'
    | 'proactive-policy'
    | 'rollback-validation'

export interface AlicizationSelfRevisionStatePatch {
  version: 'self-revision-state-patch-v1'
  id: string
  sourceEventId: string
  sourceTurnId: string | null
  decisionTraceId: string | null
  domain: AlicizationMemoryDomain | 'dialogue-style' | 'proactive-policy'
  action: AlicizationSelfRevisionEvent['taskAction']
  resultStatus: AlicizationSelfRevisionEvent['resultStatus']
  lanes: AlicizationSelfRevisionStatePatchLane[]
  memoryPolicy: {
    strictnessBias: number
    wrongThreadSuppressionBias: number
    provenanceLabelBias: number
    recallExpansionBias: number
    shouldQuarantineUnsupportedCarry: boolean
  }
  relationshipPosture: {
    repairWindowBias: number
    closenessCapBias: number
    warmthReleaseBias: number
  }
  responsePosture: {
    secondPassRequiredBias: number
    hypothesisLabelBias: number
    specificityClampBias: number
    templateShellSuppressionBias: number
  }
  proactivePolicy: {
    restraintBias: number
    learningProposalBias: number
    actuationCooldownBias: number
  }
  validation: {
    requiresRollbackCheck: boolean
    requiresRevalidation: boolean
    rollbackPlan: string[]
  }
  projectStateContinuity?: {
    sameHerSelfLine?: string | null
    sameHerDriftRisk?: string | null
    proactiveSameHerGap?: string | null
    emotionalClosureCue?: string | null
    sameHerHoldDetail?: string | null
    continuityGuard?: string | null
    continuityPressure?: number | null
  } | null
  reasonCodes: string[]
  summary: string | null
}

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

function uniqueList(values: Array<string | null | undefined>, maxItems = 12) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 140)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function domainReason(domain: AlicizationSelfRevisionEvent['domain']) {
  return `domain:${domain}`
}

function domainIsRelationshipLike(domain: AlicizationSelfRevisionEvent['domain']) {
  return domain === 'relationship' || domain === 'dialogue-style'
}

function domainIsSelfLike(domain: AlicizationSelfRevisionEvent['domain']) {
  return domain === 'self-model' || domain === 'dialogue-style' || domain === 'proactive-policy'
}

export function buildAlicizationSelfRevisionStatePatch(input: {
  event: AlicizationSelfRevisionEvent
  policyFeedback?: AlicizationLearningPolicyFeedback | null
}): AlicizationSelfRevisionStatePatch {
  const event = input.event
  const policyFeedback = input.policyFeedback ?? null
  const contradictionPressure = clamp01(event.evidence.contradictionCount * 0.18)
  const supportPressure = clamp01(event.evidence.supportCount * 0.08)
  const rollbackPressure = event.rollbackPlan.length > 0 || event.verifier.status === 'rollback-required'
  const blocked = event.resultStatus === 'blocked' || event.resultStatus === 'reopened'
  const completed = event.resultStatus === 'completed'
  const worldModel = event.domain === 'world-model'
  const relationshipLike = domainIsRelationshipLike(event.domain)
  const selfLike = domainIsSelfLike(event.domain)
  const validationOnly = event.verifier.mayValidateOnly && !event.verifier.mayInternalize
  const requiresRevalidation = worldModel && (validationOnly || blocked || rollbackPressure)

  const memoryPolicy = {
    strictnessBias: clamp01(
      (policyFeedback?.strictnessBias ?? 0)
      + contradictionPressure * 0.6
      + (rollbackPressure ? 0.24 : 0)
      + (blocked ? 0.08 : 0)
      + (worldModel ? 0.06 : 0),
    ),
    wrongThreadSuppressionBias: clamp01(
      (policyFeedback?.wrongThreadSuppressionBias ?? 0)
      + (relationshipLike ? 0.08 : 0)
      + (selfLike ? 0.06 : 0)
      + contradictionPressure * 0.35
      + (rollbackPressure ? 0.12 : 0),
    ),
    provenanceLabelBias: clamp01(
      (policyFeedback?.provenanceLabelBias ?? 0)
      + (worldModel ? 0.18 : 0.06)
      + (requiresRevalidation ? 0.16 : 0)
      + (rollbackPressure ? 0.12 : 0),
    ),
    recallExpansionBias: clamp01(
      completed && !rollbackPressure
        ? Math.max(0.06, supportPressure * 0.45)
        : blocked
          ? 0.08
          : 0,
    ),
    shouldQuarantineUnsupportedCarry: rollbackPressure || requiresRevalidation || contradictionPressure >= 0.36,
  }

  const relationshipPosture = {
    repairWindowBias: clamp01(
      (relationshipLike ? 0.12 : 0)
      + contradictionPressure * 0.35
      + (rollbackPressure ? 0.16 : 0)
      + (blocked ? 0.08 : 0),
    ),
    closenessCapBias: clamp01(
      (relationshipLike ? 0.08 : 0)
      + (rollbackPressure ? 0.16 : 0)
      + contradictionPressure * 0.28,
    ),
    warmthReleaseBias: clamp01(
      completed && relationshipLike && !rollbackPressure
        ? 0.08 + supportPressure * 0.24
        : 0,
    ),
  }

  const responsePosture = {
    secondPassRequiredBias: clamp01(
      (worldModel || selfLike || relationshipLike ? 0.08 : 0)
      + contradictionPressure * 0.35
      + (rollbackPressure ? 0.18 : 0)
      + (blocked ? 0.12 : 0),
    ),
    hypothesisLabelBias: clamp01(
      (worldModel ? 0.18 : 0.04)
      + (requiresRevalidation ? 0.18 : 0)
      + (blocked ? 0.1 : 0),
    ),
    specificityClampBias: clamp01(
      memoryPolicy.strictnessBias * 0.5
      + memoryPolicy.provenanceLabelBias * 0.3
      + (worldModel ? 0.08 : 0),
    ),
    templateShellSuppressionBias: clamp01(
      0.1
      + (relationshipLike || selfLike ? 0.12 : 0)
      + (event.domain === 'dialogue-style' ? 0.18 : 0),
    ),
  }

  const proactivePolicy = {
    restraintBias: clamp01(
      (rollbackPressure ? 0.18 : 0)
      + (blocked ? 0.12 : 0)
      + (relationshipLike ? relationshipPosture.closenessCapBias * 0.45 : 0),
    ),
    learningProposalBias: clamp01(
      blocked || requiresRevalidation
        ? 0.12
        : completed
          ? 0.08 + supportPressure * 0.2
          : 0,
    ),
    actuationCooldownBias: clamp01(
      (worldModel && requiresRevalidation ? 0.16 : 0)
      + (rollbackPressure ? 0.12 : 0),
    ),
  }

  const lanes = uniqueList([
    'memory-policy',
    relationshipLike ? 'relationship-posture' : null,
    'response-posture',
    event.domain === 'proactive-policy' || proactivePolicy.restraintBias > 0 || proactivePolicy.actuationCooldownBias > 0 ? 'proactive-policy' : null,
    rollbackPressure || requiresRevalidation ? 'rollback-validation' : null,
  ], 8) as AlicizationSelfRevisionStatePatchLane[]

  const reasonCodes = uniqueList([
    domainReason(event.domain),
    `action:${event.taskAction}`,
    `result:${event.resultStatus}`,
    policyFeedback?.reasonCodes.map(reason => `policy:${reason}`).join('|'),
    rollbackPressure ? 'rollback-validation-required' : null,
    requiresRevalidation ? 'world-model-revalidation-required' : null,
    blocked ? 'blocked-learning-keeps-surface-cautious' : null,
    completed ? 'completed-learning-can-influence-next-turn' : null,
    memoryPolicy.shouldQuarantineUnsupportedCarry ? 'quarantine-unsupported-carry' : null,
  ].flatMap(item => item?.split('|') ?? []), 16)

  return {
    version: 'self-revision-state-patch-v1',
    id: `${event.id}:state-patch`,
    sourceEventId: event.id,
    sourceTurnId: event.sourceTurnId,
    decisionTraceId: event.decisionTraceId,
    domain: event.domain,
    action: event.taskAction,
    resultStatus: event.resultStatus,
    lanes,
    memoryPolicy,
    relationshipPosture,
    responsePosture,
    proactivePolicy,
    validation: {
      requiresRollbackCheck: rollbackPressure,
      requiresRevalidation,
      rollbackPlan: uniqueList(event.rollbackPlan, 8),
    },
    reasonCodes,
    summary: sanitizeText(event.proposedRevision.summary, 240) || null,
  }
}
