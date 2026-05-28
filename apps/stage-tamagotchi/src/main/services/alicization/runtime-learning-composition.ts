import type { AlicizationAuditLogInput } from '../../../shared/eventa'

import { createAlicizationLearningActionExecutor } from './learning-action-executor'
import { createAlicizationLearningActionScheduler } from './learning-action-scheduler'

type LearningActionExecutorOptions = Parameters<typeof createAlicizationLearningActionExecutor>[0]
type LearningActionSchedulerOptions = Parameters<typeof createAlicizationLearningActionScheduler>[0]

export function createAlicizationRuntimeLearningComposition(input: {
  now: () => number
  activeCardId: string
  randomUUID: () => string
  getActiveCardId: () => string
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  alicizationDb: {
    listMemoryFacts: LearningActionExecutorOptions['listMemoryFacts']
    listMemoryReflections: LearningActionExecutorOptions['listMemoryReflections']
    listRelationshipOutcomes: LearningActionExecutorOptions['listRelationshipOutcomes']
    upsertMemoryReflections: LearningActionExecutorOptions['upsertMemoryReflections']
    applyMemoryFactCorrections: LearningActionExecutorOptions['applyMemoryFactCorrections']
    upsertMemoryFacts: LearningActionExecutorOptions['upsertMemoryFacts']
    appendMindTurnEvents: NonNullable<LearningActionExecutorOptions['appendMindTurnEvents']>
    insertLearningTask: LearningActionSchedulerOptions['insertLearningTask']
    claimDueLearningTasks: LearningActionSchedulerOptions['claimDueLearningTasks']
    startLearningTask: LearningActionSchedulerOptions['startLearningTask']
    blockLearningTask: LearningActionSchedulerOptions['blockLearningTask']
    completeLearningTask: LearningActionSchedulerOptions['completeLearningTask']
    failLearningTask: LearningActionSchedulerOptions['failLearningTask']
    reopenLearningTask: LearningActionSchedulerOptions['reopenLearningTask']
    downgradeLearningTask: LearningActionSchedulerOptions['downgradeLearningTask']
    cancelLearningTask: LearningActionSchedulerOptions['cancelLearningTask']
    listLearningTasks: LearningActionSchedulerOptions['listLearningTasks']
  }
  assimilateMemoryFactsDetailed: LearningActionExecutorOptions['assimilateMemoryFactsDetailed']
  recordLearningExecutionTelemetry: NonNullable<LearningActionExecutorOptions['recordLearningExecutionTelemetry']>
  proposeSelfEvolutionVersion: NonNullable<LearningActionExecutorOptions['proposeSelfEvolutionVersion']>
}) {
  const executeLearningTask = createAlicizationLearningActionExecutor({
    now: input.now,
    cardId: input.activeCardId,
    listMemoryFacts: input.alicizationDb.listMemoryFacts,
    listMemoryReflections: input.alicizationDb.listMemoryReflections,
    listRelationshipOutcomes: input.alicizationDb.listRelationshipOutcomes,
    upsertMemoryReflections: input.alicizationDb.upsertMemoryReflections,
    applyMemoryFactCorrections: input.alicizationDb.applyMemoryFactCorrections,
    upsertMemoryFacts: input.alicizationDb.upsertMemoryFacts,
    appendMindTurnEvents: input.alicizationDb.appendMindTurnEvents,
    assimilateMemoryFactsDetailed: input.assimilateMemoryFactsDetailed,
    recordLearningExecutionTelemetry: input.recordLearningExecutionTelemetry,
    proposeSelfEvolutionVersion: input.proposeSelfEvolutionVersion,
  })

  const learningActionScheduler = createAlicizationLearningActionScheduler({
    now: input.now,
    insertLearningTask: input.alicizationDb.insertLearningTask,
    claimDueLearningTasks: input.alicizationDb.claimDueLearningTasks,
    startLearningTask: input.alicizationDb.startLearningTask,
    blockLearningTask: input.alicizationDb.blockLearningTask,
    completeLearningTask: input.alicizationDb.completeLearningTask,
    failLearningTask: input.alicizationDb.failLearningTask,
    reopenLearningTask: input.alicizationDb.reopenLearningTask,
    downgradeLearningTask: input.alicizationDb.downgradeLearningTask,
    cancelLearningTask: input.alicizationDb.cancelLearningTask,
    listLearningTasks: input.alicizationDb.listLearningTasks,
    appendAuditLog: input.appendAuditLog,
    executeLearningTask,
    randomUUID: input.randomUUID,
    getActiveCardId: input.getActiveCardId,
  })

  return {
    executeLearningTask,
    learningActionScheduler,
  }
}
