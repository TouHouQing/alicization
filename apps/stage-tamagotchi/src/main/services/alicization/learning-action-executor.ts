import type {
  AlicizationKnowledgeAssimilationCorrection,
  AlicizationMemoryDomain,
  AlicizationMemoryFact,
  AlicizationMemoryFactInput,
  AlicizationMemoryReflectionInput,
  AlicizationMemoryReflectionRecord,
  AlicizationRelationshipOutcomeRecord,
} from '../../../shared/eventa'
import type { AlicizationVerifiedLearningArtifact } from '@proj-alicization/stage-shared'

import { executeAlicizationLearningTaskOrchestrator } from './learning-executor-orchestrator'

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

export interface CreateAlicizationLearningActionExecutorOptions {
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
  return async function executeLearningTask(task: Parameters<typeof executeAlicizationLearningTaskOrchestrator>[1]) {
    return executeAlicizationLearningTaskOrchestrator(options, task)
  }
}
