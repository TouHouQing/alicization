import type { AlicizationVerifiedLearningArtifact } from '@proj-alicization/stage-shared'

import type {
  AlicizationLearningTaskRecord,
  AlicizationMemoryDomain,
} from '../../../shared/eventa'
import type { AlicizationLearningVerificationBasis } from './learning-domain-verifiers'
import type { AlicizationLearningLifecycleState, AlicizationLearningPolicyFeedback } from './learning-state-machine'
import type { AlicizationSelfRevisionEvent } from './self-evolution/self-revision-ledger'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'
import type { AlicizationSelfEvolutionVersionCandidate } from './self-evolution/version-runtime'

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
  status?: 'completed' | 'blocked' | 'failed' | 'reopened' | 'downgraded' | 'cancelled'
  lifecycleState?: AlicizationLearningLifecycleState | null
  nextLifecycleState?: AlicizationLearningLifecycleState | null
  policyFeedback?: AlicizationLearningPolicyFeedback | null
  selfRevisionEvent?: AlicizationSelfRevisionEvent | null
  selfRevisionStatePatch?: AlicizationSelfRevisionStatePatch | null
  selfEvolutionVersionCandidate?: AlicizationSelfEvolutionVersionCandidate | null
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
      status: input.status ?? null,
      lifecycleState: input.lifecycleState ?? null,
      nextLifecycleState: input.nextLifecycleState ?? null,
      focuses: input.task.payload.focuses,
      verificationBasis: input.verificationBasis ?? null,
      policyFeedback: input.policyFeedback ?? null,
      selfRevisionEvent: input.selfRevisionEvent ?? null,
      selfRevisionStatePatch: input.selfRevisionStatePatch ?? null,
      selfEvolutionVersionCandidate: input.selfEvolutionVersionCandidate ?? null,
      verifiedArtifact: input.verifiedArtifact ?? null,
    },
    createdAt: input.options.now(),
  }])
}
