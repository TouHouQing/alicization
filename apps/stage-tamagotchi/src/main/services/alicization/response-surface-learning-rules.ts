import type { AlicizationLearningExecutionStateSnapshot } from '../../../shared/eventa'
import type { AlicizationResponseSurfaceRules } from './response-surface-rules'

import { pushUniqueAlicizationResponseSurfaceRule } from './response-surface-rules'

export function buildAlicizationResponseSurfaceLearningRules(
  learningExecutionState: AlicizationLearningExecutionStateSnapshot | null | undefined,
): AlicizationResponseSurfaceRules {
  const mustDo: string[] = []
  const mustNotDo: string[] = []

  if (learningExecutionState?.nextLearningAction === 'verify') {
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Keep visible certainty behind the current verification pass.')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not let fluency or warmth outrun what is still being verified.')
  }
  if (learningExecutionState?.nextLearningAction === 'revise') {
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Treat the older continuity line as actively revisable instead of settled.')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not rest visible certainty on continuity the system is actively revising.')
  }
  if (learningExecutionState?.nextLearningAction === 'internalize') {
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Let the stabilizing learned procedure constrain this answer instead of slipping back to older habits.')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not fall back to older unstable procedures while a stronger one is being internalized.')
  }

  return { mustDo, mustNotDo }
}
