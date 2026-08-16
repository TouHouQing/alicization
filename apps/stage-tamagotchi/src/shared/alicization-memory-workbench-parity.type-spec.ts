import type * as Shared from '@proj-alicization/stage-shared'

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

type MemoryWorkbenchTransportParity = [
  Assert<Equal<Eventa.AlicizationMemoryQualityTrialPayload, Shared.AlicizationMemoryQualityTrialPayload>>,
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
]

declare const memoryWorkbenchTransportParity: MemoryWorkbenchTransportParity

void memoryWorkbenchTransportParity
