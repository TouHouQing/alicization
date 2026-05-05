import type { AlicizationLearningTaskRecord, AlicizationMemoryDomain } from '../../../shared/eventa'
import type { AlicizationVerifiedLearningArtifact } from '@proj-alicization/stage-shared'
import type { AlicizationLearningActionExecutorResult } from './learning-action-executor'

export type AlicizationLearningLifecycleState
  = 'candidate-extraction'
    | 'verification'
    | 'internalization'
    | 'revalidation'
    | 'rollback-downgrade'

export interface AlicizationLearningPolicyFeedback {
  strictnessBias: number
  wrongThreadSuppressionBias: number
  provenanceLabelBias: number
  reasonCodes: string[]
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim()
      : ''
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

export function deriveAlicizationLearningLifecycleState(input: {
  task: Pick<AlicizationLearningTaskRecord, 'action'>
  verifiedArtifact?: AlicizationVerifiedLearningArtifact | null
}): AlicizationLearningLifecycleState {
  if (input.task.action === 'record' || input.task.action === 'reflect')
    return 'candidate-extraction'
  if (input.task.action === 'revise')
    return 'rollback-downgrade'
  if (input.task.action === 'internalize')
    return input.verifiedArtifact?.claimGraph.revalidationPolicy.shouldRevalidate
      ? 'revalidation'
      : 'internalization'
  return input.verifiedArtifact?.claimGraph.revalidationPolicy.shouldRevalidate
    ? 'revalidation'
    : 'verification'
}

export function deriveNextAlicizationLearningLifecycleState(input: {
  currentState: AlicizationLearningLifecycleState
  result: Pick<AlicizationLearningActionExecutorResult, 'status'>
  verifiedArtifact?: AlicizationVerifiedLearningArtifact | null
}): AlicizationLearningLifecycleState | null {
  if (input.result.status === 'cancelled' || input.result.status === 'failed')
    return null
  if (input.result.status === 'downgraded')
    return 'rollback-downgrade'
  if (input.result.status === 'blocked' || input.result.status === 'reopened')
    return input.currentState
  if (input.currentState === 'candidate-extraction')
    return 'verification'
  if (input.currentState === 'verification')
    return input.verifiedArtifact?.claimGraph.revalidationPolicy.shouldRevalidate
      ? 'revalidation'
      : 'internalization'
  if (input.currentState === 'revalidation')
    return 'internalization'
  if (input.currentState === 'rollback-downgrade')
    return 'verification'
  return null
}

export function deriveAlicizationLearningPolicyFeedback(input: {
  state: AlicizationLearningLifecycleState
  domain: AlicizationMemoryDomain
  result: Pick<AlicizationLearningActionExecutorResult, 'status'>
  verifiedArtifact?: AlicizationVerifiedLearningArtifact | null
}): AlicizationLearningPolicyFeedback {
  const rollbackPressure = input.result.status === 'downgraded' || input.verifiedArtifact?.status === 'rollback-required'
  const revalidationPressure = input.state === 'revalidation' || input.verifiedArtifact?.claimGraph.revalidationPolicy.shouldRevalidate === true
  const blockedPressure = input.result.status === 'blocked'

  return {
    strictnessBias: clamp01(
      (rollbackPressure ? 0.35 : 0)
      + (revalidationPressure ? 0.2 : 0)
      + (blockedPressure ? 0.08 : 0),
    ),
    wrongThreadSuppressionBias: clamp01(
      (input.domain === 'relationship' || input.domain === 'self-model' ? 0.12 : 0)
      + (rollbackPressure ? 0.22 : 0),
    ),
    provenanceLabelBias: clamp01(
      (input.domain === 'world-model' ? 0.18 : 0.08)
      + (revalidationPressure ? 0.18 : 0)
      + (rollbackPressure ? 0.12 : 0),
    ),
    reasonCodes: uniqueList([
      `state:${input.state}`,
      `result:${input.result.status}`,
      rollbackPressure ? 'rollback-pressure' : null,
      revalidationPressure ? 'revalidation-pressure' : null,
      blockedPressure ? 'blocked-learning' : null,
      `domain:${input.domain}`,
    ]),
  }
}
