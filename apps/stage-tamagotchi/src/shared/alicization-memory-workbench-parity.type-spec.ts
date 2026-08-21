import type * as Shared from '@proj-alicization/stage-shared'

import type { LongTermMemoryTemporalConflictReport } from '../main/services/alicization/long-term-memory-temporal-conflict-harness'
import type { MemoryDialogueReplayReport } from '../main/services/alicization/memory-db-dialogue-replay-harness'
import type { MemoryExperienceQualityReport } from '../main/services/alicization/memory-experience-quality-harness'
import type {
  MemoryProductionTrialReport,
  MemoryProductionTrialRuntimeHealth,
  MemoryProductionTrialStageResult,
} from '../main/services/alicization/memory-production-trial-runner'
import type {
  DbBackedLongTermMemoryQualityResult,
  MemoryQualityHarnessReport,
} from '../main/services/alicization/memory-quality-harness'
import type { MemoryScopeFuzzReport } from '../main/services/alicization/memory-scope-fuzz-harness'
import type { MemorySemanticScaleSoakReport } from '../main/services/alicization/memory-semantic-scale-soak-harness'
import type { MemoryUserTrialResult } from '../main/services/alicization/memory-user-trial-harness'
import type { PersonaTrainingDatasetQualityResult } from '../main/services/alicization/persona-training-dataset-quality-harness'
import type {
  PersonaTrainingPipelineIncrement,
  PersonaTrainingPipelineResult,
  PersonaTrainingPipelineRunRecord,
} from '../main/services/alicization/persona-training-pipeline-gate'
import type { WorkingMemoryCompressionBehaviorReport } from '../main/services/alicization/working-memory-compression-behavior-harness'
import type * as Eventa from './eventa'

type Equal<Left, Right>
  = (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? (<Value>() => Value extends Right ? 1 : 2) extends
      (<Value>() => Value extends Left ? 1 : 2)
        ? true
        : false
    : false

type Assert<Value extends true> = Value

type Assignable<Source, Target> = Source extends Target ? true : false

type MemoryWorkbenchTransportParity = [
  Assert<Equal<Eventa.AlicizationMemoryQualityTrialPayload, Shared.AlicizationMemoryQualityTrialPayload>>,
  Assert<Equal<Eventa.AlicizationMemoryQualityTrialCancelPayload, Shared.AlicizationMemoryQualityTrialCancelPayload>>,
  Assert<Equal<Eventa.AlicizationMemoryQualityTrialCancelResult, Shared.AlicizationMemoryQualityTrialCancelResult>>,
  Assert<Equal<Eventa.AlicizationMemoryDialogueReplayReport, Shared.AlicizationMemoryDialogueReplayReport>>,
  Assert<Equal<Eventa.AlicizationMemoryLiveProviderTrialReport, Shared.AlicizationMemoryLiveProviderTrialReport>>,
  Assert<Equal<Eventa.AlicizationMemoryQualityTrialReport, Shared.AlicizationMemoryQualityTrialReport>>,
  Assert<Equal<Eventa.AlicizationMemoryReplaySessionSummary, Shared.AlicizationMemoryReplaySessionSummary>>,
  Assert<Equal<Eventa.AlicizationMemoryReplaySessionListPayload, Shared.AlicizationMemoryReplaySessionListPayload>>,
  Assert<Equal<Eventa.AlicizationMemoryReplaySessionListResult, Shared.AlicizationMemoryReplaySessionListResult>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleJobTier, Shared.AlicizationMemorySemanticScaleJobTier>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleJobStatus, Shared.AlicizationMemorySemanticScaleJobStatus>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleJobProgress, Shared.AlicizationMemorySemanticScaleJobProgress>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleSoakReport, Shared.AlicizationMemorySemanticScaleSoakReport>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleJob, Shared.AlicizationMemorySemanticScaleJob>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleJobPayload, Shared.AlicizationMemorySemanticScaleJobPayload>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleJobResult, Shared.AlicizationMemorySemanticScaleJobResult>>,
  Assert<Equal<Eventa.AlicizationWorkingMemoryCleaningQueueStatus, Shared.AlicizationWorkingMemoryCleaningQueueStatus>>,
  Assert<Equal<Eventa.AlicizationWorkingMemoryCleaningQueueItem, Shared.AlicizationWorkingMemoryCleaningQueueItem>>,
  Assert<Equal<Eventa.AlicizationWorkingMemoryCleaningQueuePayload, Shared.AlicizationWorkingMemoryCleaningQueuePayload>>,
  Assert<Equal<Eventa.AlicizationWorkingMemoryCleaningQueueResult, Shared.AlicizationWorkingMemoryCleaningQueueResult>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineIncrementState, Shared.AlicizationPersonaTrainingPipelineIncrementState>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineIncrement, Shared.AlicizationPersonaTrainingPipelineIncrement>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineFailureReason, Shared.AlicizationPersonaTrainingPipelineFailureReason>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineRunStatus, Shared.AlicizationPersonaTrainingPipelineRunStatus>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineRunStage, Shared.AlicizationPersonaTrainingPipelineRunStage>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingExecutorConfig, Shared.AlicizationPersonaTrainingExecutorConfig>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingArtifact, Shared.AlicizationPersonaTrainingArtifact>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineRunRecord, Shared.AlicizationPersonaTrainingPipelineRunRecord>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingStartResult, Shared.AlicizationPersonaTrainingStartResult>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingRunsResult, Shared.AlicizationPersonaTrainingRunsResult>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingRunLookupPayload, Shared.AlicizationPersonaTrainingRunLookupPayload>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingExecutorConfigState, Shared.AlicizationPersonaTrainingExecutorConfigState>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingExecutorConfigPayload, Shared.AlicizationPersonaTrainingExecutorConfigPayload>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingExecutorConnectionResult, Shared.AlicizationPersonaTrainingExecutorConnectionResult>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineResult, Shared.AlicizationPersonaTrainingPipelineResult>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingDatasetRevokePayload, Shared.AlicizationPersonaTrainingDatasetRevokePayload>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingRunPayload, Shared.AlicizationPersonaTrainingRunPayload>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingCancelPayload, Shared.AlicizationPersonaTrainingCancelPayload>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingIncrementPayload, Shared.AlicizationPersonaTrainingIncrementPayload>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingIncrementsResult, Shared.AlicizationPersonaTrainingIncrementsResult>>,
  Assert<Equal<MemoryDialogueReplayReport, Shared.AlicizationMemoryDialogueReplayReport>>,
  Assert<Equal<MemoryProductionTrialStageResult, Shared.AlicizationMemoryQualityTrialReport['stages'][number]>>,
  Assert<Equal<MemoryQualityHarnessReport, Shared.AlicizationMemoryQualityTrialReport['quality']>>,
  Assert<Equal<DbBackedLongTermMemoryQualityResult, Shared.AlicizationMemoryQualityLongTermResult>>,
  Assert<Equal<MemoryUserTrialResult, Shared.AlicizationMemoryUserTrialResult>>,
  Assert<Equal<PersonaTrainingDatasetQualityResult, Shared.AlicizationPersonaTrainingDatasetQualityResult>>,
  Assert<Equal<MemoryProductionTrialRuntimeHealth, NonNullable<Shared.AlicizationMemoryQualityTrialReport['runtimeHealth']>>>,
  Assert<Equal<WorkingMemoryCompressionBehaviorReport, NonNullable<Shared.AlicizationMemoryQualityTrialReport['compressedContextBehavior']>>>,
  Assert<Equal<LongTermMemoryTemporalConflictReport, NonNullable<Shared.AlicizationMemoryQualityTrialReport['temporalConflict']>>>,
  Assert<Equal<MemorySemanticScaleSoakReport, NonNullable<Shared.AlicizationMemoryQualityTrialReport['semanticScaleSoak']>>>,
  Assert<Equal<MemoryExperienceQualityReport, NonNullable<Shared.AlicizationMemoryQualityTrialReport['experienceQuality']>>>,
  Assert<Equal<MemoryScopeFuzzReport, NonNullable<Shared.AlicizationMemoryQualityTrialReport['scopeFuzz']>>>,
  Assert<Assignable<MemoryProductionTrialReport, Shared.AlicizationMemoryQualityTrialReport>>,
  Assert<Assignable<Shared.AlicizationMemoryQualityTrialReport, MemoryProductionTrialReport>>,
  Assert<Equal<PersonaTrainingPipelineIncrement, Shared.AlicizationPersonaTrainingPipelineIncrement>>,
  Assert<Equal<PersonaTrainingPipelineRunRecord, Shared.AlicizationPersonaTrainingPipelineRunRecord>>,
  Assert<Equal<PersonaTrainingPipelineResult, Shared.AlicizationPersonaTrainingPipelineResult>>,
]

declare const memoryWorkbenchTransportParity: MemoryWorkbenchTransportParity

void memoryWorkbenchTransportParity
