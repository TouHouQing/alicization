import type * as Shared from '@proj-alicization/stage-shared'

import type * as Bridge from './alicization-bridge'

type Equal<Left, Right>
  = (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? (<Value>() => Value extends Right ? 1 : 2) extends
      (<Value>() => Value extends Left ? 1 : 2)
        ? true
        : false
    : false

type Assert<Value extends true> = Value

type HasStringIndex<Value> = string extends keyof Value ? true : false

type MemoryWorkbenchTransportParity = [
  Assert<Equal<Shared.AlicizationMemoryQualityTrialPayload, Bridge.AlicizationMemoryQualityTrialPayload>>,
  Assert<Equal<Shared.AlicizationMemoryDialogueReplayReport, Bridge.AlicizationMemoryDialogueReplayReport>>,
  Assert<Equal<Shared.AlicizationMemoryLiveProviderTrialReport, Bridge.AlicizationMemoryLiveProviderTrialReport>>,
  Assert<Equal<Shared.AlicizationMemoryQualityTrialReport, Bridge.AlicizationMemoryQualityTrialReport>>,
  Assert<Equal<Shared.AlicizationMemoryReplaySessionSummary, Bridge.AlicizationMemoryReplaySessionSummary>>,
  Assert<Equal<Shared.AlicizationMemoryReplaySessionListPayload, Bridge.AlicizationMemoryReplaySessionListPayload>>,
  Assert<Equal<Shared.AlicizationMemoryReplaySessionListResult, Bridge.AlicizationMemoryReplaySessionListResult>>,
  Assert<Equal<Shared.AlicizationMemorySemanticScaleJobTier, Bridge.AlicizationMemorySemanticScaleJobTier>>,
  Assert<Equal<Shared.AlicizationMemorySemanticScaleJobStatus, Bridge.AlicizationMemorySemanticScaleJobStatus>>,
  Assert<Equal<Shared.AlicizationMemorySemanticScaleJobProgress, Bridge.AlicizationMemorySemanticScaleJobProgress>>,
  Assert<Equal<Shared.AlicizationMemorySemanticScaleSoakReport, Bridge.AlicizationMemorySemanticScaleSoakReport>>,
  Assert<Equal<Shared.AlicizationMemorySemanticScaleJob, Bridge.AlicizationMemorySemanticScaleJob>>,
  Assert<Equal<Shared.AlicizationMemorySemanticScaleJobPayload, Bridge.AlicizationMemorySemanticScaleJobPayload>>,
  Assert<Equal<Shared.AlicizationMemorySemanticScaleJobResult, Bridge.AlicizationMemorySemanticScaleJobResult>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingPipelineIncrementState, Bridge.AlicizationPersonaTrainingPipelineIncrementState>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingPipelineIncrement, Bridge.AlicizationPersonaTrainingPipelineIncrement>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingPipelineFailureReason, Bridge.AlicizationPersonaTrainingPipelineFailureReason>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingPipelineRunStatus, Bridge.AlicizationPersonaTrainingPipelineRunStatus>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingPipelineRunStage, Bridge.AlicizationPersonaTrainingPipelineRunStage>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingExecutorConfig, Bridge.AlicizationPersonaTrainingExecutorConfig>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingArtifact, Bridge.AlicizationPersonaTrainingArtifact>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingPipelineRunRecord, Bridge.AlicizationPersonaTrainingPipelineRunRecord>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingStartResult, Bridge.AlicizationPersonaTrainingStartResult>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingRunsResult, Bridge.AlicizationPersonaTrainingRunsResult>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingRunLookupPayload, Bridge.AlicizationPersonaTrainingRunLookupPayload>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingExecutorConfigState, Bridge.AlicizationPersonaTrainingExecutorConfigState>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingExecutorConfigPayload, Bridge.AlicizationPersonaTrainingExecutorConfigPayload>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingExecutorConnectionResult, Bridge.AlicizationPersonaTrainingExecutorConnectionResult>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingPipelineResult, Bridge.AlicizationPersonaTrainingPipelineResult>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingDatasetRevokePayload, Bridge.AlicizationPersonaTrainingDatasetRevokePayload>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingRunPayload, Bridge.AlicizationPersonaTrainingRunPayload>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingCancelPayload, Bridge.AlicizationPersonaTrainingCancelPayload>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingIncrementPayload, Bridge.AlicizationPersonaTrainingIncrementPayload>>,
  Assert<Equal<Shared.AlicizationPersonaTrainingIncrementsResult, Bridge.AlicizationPersonaTrainingIncrementsResult>>,
  Assert<Equal<HasStringIndex<Shared.AlicizationMemoryQualityLongTermResult>, false>>,
  Assert<Equal<HasStringIndex<Shared.AlicizationMemoryQualityTrace>, false>>,
  Assert<Equal<HasStringIndex<Shared.AlicizationMemorySemanticScaleSearchMetrics>, false>>,
  Assert<Equal<HasStringIndex<Shared.AlicizationPersonaTrainingArtifact>, false>>,
]

declare const memoryWorkbenchTransportParity: MemoryWorkbenchTransportParity

void memoryWorkbenchTransportParity
