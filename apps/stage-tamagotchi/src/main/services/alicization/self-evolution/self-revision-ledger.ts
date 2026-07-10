import type { AlicizationVerifiedLearningArtifact } from '@proj-alicization/stage-shared'

import type {
  AlicizationLearningTaskRecord,
  AlicizationMemoryDomain,
} from '../../../../shared/eventa'
import type { AlicizationLearningActionExecutorResult } from '../learning-action-executor'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

export interface AlicizationSelfRevisionEvent {
  version: 'self-revision-event-v1'
  id: string
  sourceTurnId: string | null
  decisionTraceId: string | null
  domain: AlicizationMemoryDomain | 'dialogue-style' | 'proactive-policy'
  taskAction: AlicizationLearningTaskRecord['action']
  resultStatus: AlicizationLearningActionExecutorResult['status']
  evidence: {
    supportCount: number
    contradictionCount: number
    verificationBasis: string[]
  }
  proposedRevision: {
    summary: string | null
    lifecycleState: string | null
    nextLifecycleState: string | null
  }
  verifier: {
    status: string | null
    mayInternalize: boolean
    mayValidateOnly: boolean
  }
  projectStateContinuity: {
    sameHerSelfLine: string | null
    sameHerDriftRisk: string | null
    proactiveSameHerGap?: string | null
    emotionalClosureCue: string | null
    sameHerHoldDetail?: string | null
    continuityGuard: string | null
  } | null
  appliedTargets: string[]
  rollbackPlan: string[]
}

function unique(values: Array<string | null | undefined>, limit = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim()
      : ''
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= limit)
      break
  }
  return result
}

function sanitizeRevisionMaterialText(raw: unknown, maxChars = 240) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars)
}

export function buildAlicizationSelfRevisionEvent(input: {
  task: AlicizationLearningTaskRecord
  domain: AlicizationMemoryDomain | 'dialogue-style' | 'proactive-policy'
  result: AlicizationLearningActionExecutorResult
  verifiedArtifact?: AlicizationVerifiedLearningArtifact | null
  supportCount: number
}): AlicizationSelfRevisionEvent {
  const artifact = input.verifiedArtifact ?? input.result.verifiedArtifact ?? null
  const contradictionCount = artifact?.contradictionFactIds?.length ?? 0
  const summary = sanitizeRevisionMaterialText(input.result.resultSummary ?? input.task.resultSummary ?? input.task.message ?? null, 280) || null
  const lifecycleState = input.result.lifecycleState ?? null
  const nextLifecycleState = input.result.nextLifecycleState ?? null
  const sameHerSelfLine = sanitizeRevisionMaterialText(input.task.payload.projectStateContinuity?.sameHerSelfLine, 220)
  const sameHerDriftRisk = sanitizeRevisionMaterialText(input.task.payload.projectStateContinuity?.sameHerDriftRisk, 320)
  const proactiveSameHerGap = sanitizeRevisionMaterialText(input.task.payload.projectStateContinuity?.proactiveSameHerGap, 240)
  const emotionalClosureCue = sanitizeRevisionMaterialText(input.task.payload.projectStateContinuity?.emotionalClosureCue, 240)
  const sameHerHoldDetail = sanitizeRevisionMaterialText(input.task.payload.projectStateContinuity?.sameHerHoldDetail, 240)
  const continuityGuard = sameHerDriftRisk
    && /generic assistant shell|project-summary voice|generic project shell|detached project|generic guidance|same-her continuity drift|same her continuity drift|project shell|project narrator/i.test(sameHerDriftRisk)
    ? [sameHerSelfLine || 'project_state_continuity', sameHerDriftRisk].filter(Boolean).join(' ; ')
    : null

  return {
    version: 'self-revision-event-v1',
    id: `${input.task.taskId}:${input.result.status}:${input.task.updatedAt}`,
    sourceTurnId: input.task.sourceTurnId ?? input.task.payload.sourceTurnId ?? null,
    decisionTraceId: input.task.payload.decisionTraceId ?? null,
    domain: input.domain,
    taskAction: input.task.action,
    resultStatus: input.result.status,
    evidence: {
      supportCount: input.supportCount,
      contradictionCount,
      verificationBasis: unique(input.result.verificationBasis ?? [], 6),
    },
    proposedRevision: {
      summary,
      lifecycleState,
      nextLifecycleState,
    },
    verifier: {
      status: artifact?.status ?? null,
      mayInternalize: artifact?.verifier?.mayInternalize ?? false,
      mayValidateOnly: artifact?.verifier?.mayValidateOnly ?? false,
    },
    projectStateContinuity: sameHerSelfLine || continuityGuard || proactiveSameHerGap || emotionalClosureCue || sameHerHoldDetail
      ? {
          sameHerSelfLine: sameHerSelfLine || null,
          sameHerDriftRisk: sameHerDriftRisk || null,
          proactiveSameHerGap: proactiveSameHerGap || null,
          emotionalClosureCue: emotionalClosureCue || null,
          sameHerHoldDetail: sameHerHoldDetail || null,
          continuityGuard,
        }
      : null,
    appliedTargets: unique([
      ...((input.task.payload.supportingFactIds ?? []).slice(0, 4)),
      ...((input.task.payload.supersedeTargets ?? []).slice(0, 4)),
      ...((input.task.payload.conflictTargets ?? []).slice(0, 4)),
    ], 8),
    rollbackPlan: unique([
      contradictionCount > 0 ? 'revisit-contradiction-heavy-targets' : null,
      artifact?.status === 'rollback-required' ? 'rollback-verified-artifact' : null,
      input.result.status === 'blocked' ? 'retry-after-stronger-evidence' : null,
      input.result.status === 'reopened' ? 'reopen-learning-task' : null,
    ], 6),
  }
}
