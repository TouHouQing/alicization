import type {
  AlicizationLearningTaskRecord,
  AlicizationMemoryDomain,
} from '../../../shared/eventa'
import type { AlicizationVerifiedLearningArtifact } from '@proj-alicization/stage-shared'
import type { AlicizationLearningVerificationBasis } from './learning-domain-verifiers'

export interface AlicizationLearningArtifactStoreOptions {
  now: () => number
  appendMindTurnEvents?: (events: Array<{
    decisionTraceId: string
    turnId?: string | null
    sessionId?: string | null
    origin?: 'user-turn' | 'subconscious-proactive' | 'system'
    kind: 'learning-executed'
    payload: Record<string, unknown>
    createdAt: number
  }>) => Promise<unknown>
}

export async function appendLearningExecutionEvidence(input: {
  options: AlicizationLearningArtifactStoreOptions
  task: AlicizationLearningTaskRecord
  domain: AlicizationMemoryDomain
  resultSummary: string
  verificationBasis?: AlicizationLearningVerificationBasis | null
  verifiedArtifact?: AlicizationVerifiedLearningArtifact | null
}) {
  if (!input.options.appendMindTurnEvents || !input.task.payload.decisionTraceId)
    return
  await input.options.appendMindTurnEvents([{
    decisionTraceId: input.task.payload.decisionTraceId,
    turnId: input.task.payload.sourceTurnId,
    sessionId: input.task.payload.sourceSessionId,
    origin: 'system',
    kind: 'learning-executed',
    payload: {
      taskId: input.task.taskId,
      action: input.task.action,
      domain: input.domain,
      resultSummary: input.resultSummary,
      focuses: input.task.payload.focuses,
      verificationBasis: input.verificationBasis ?? null,
      verifiedArtifact: input.verifiedArtifact ?? null,
    },
    createdAt: input.options.now(),
  }])
}
