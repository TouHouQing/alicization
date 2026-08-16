import type * as Bridge from '@proj-alicization/stage-ui/stores/alicization-bridge'

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
  Assert<Equal<Eventa.AlicizationMemoryQualityTrialPayload, Bridge.AlicizationMemoryQualityTrialPayload>>,
  Assert<Equal<Eventa.AlicizationMemoryDialogueReplayReport, Bridge.AlicizationMemoryDialogueReplayReport>>,
  Assert<Equal<Eventa.AlicizationMemoryLiveProviderTrialReport, Bridge.AlicizationMemoryLiveProviderTrialReport>>,
  Assert<Equal<Eventa.AlicizationMemoryQualityTrialReport, Bridge.AlicizationMemoryQualityTrialReport>>,
  Assert<Equal<Eventa.AlicizationMemoryReplaySessionSummary, Bridge.AlicizationMemoryReplaySessionSummary>>,
  Assert<Equal<Eventa.AlicizationMemoryReplaySessionListPayload, Bridge.AlicizationMemoryReplaySessionListPayload>>,
  Assert<Equal<Eventa.AlicizationMemoryReplaySessionListResult, Bridge.AlicizationMemoryReplaySessionListResult>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleJobTier, Bridge.AlicizationMemorySemanticScaleJobTier>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleJobStatus, Bridge.AlicizationMemorySemanticScaleJobStatus>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleJobProgress, Bridge.AlicizationMemorySemanticScaleJobProgress>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleSoakReport, Bridge.AlicizationMemorySemanticScaleSoakReport>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleJob, Bridge.AlicizationMemorySemanticScaleJob>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleJobPayload, Bridge.AlicizationMemorySemanticScaleJobPayload>>,
  Assert<Equal<Eventa.AlicizationMemorySemanticScaleJobResult, Bridge.AlicizationMemorySemanticScaleJobResult>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineIncrementState, Bridge.AlicizationPersonaTrainingPipelineIncrementState>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineIncrement, Bridge.AlicizationPersonaTrainingPipelineIncrement>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineFailureReason, Bridge.AlicizationPersonaTrainingPipelineFailureReason>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineRunStatus, Bridge.AlicizationPersonaTrainingPipelineRunStatus>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineRunStage, Bridge.AlicizationPersonaTrainingPipelineRunStage>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingExecutorConfig, Bridge.AlicizationPersonaTrainingExecutorConfig>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingArtifact, Bridge.AlicizationPersonaTrainingArtifact>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineRunRecord, Bridge.AlicizationPersonaTrainingPipelineRunRecord>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingStartResult, Bridge.AlicizationPersonaTrainingStartResult>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingRunsResult, Bridge.AlicizationPersonaTrainingRunsResult>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingRunLookupPayload, Bridge.AlicizationPersonaTrainingRunLookupPayload>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingExecutorConfigState, Bridge.AlicizationPersonaTrainingExecutorConfigState>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingExecutorConfigPayload, Bridge.AlicizationPersonaTrainingExecutorConfigPayload>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingExecutorConnectionResult, Bridge.AlicizationPersonaTrainingExecutorConnectionResult>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingPipelineResult, Bridge.AlicizationPersonaTrainingPipelineResult>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingDatasetRevokePayload, Bridge.AlicizationPersonaTrainingDatasetRevokePayload>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingRunPayload, Bridge.AlicizationPersonaTrainingRunPayload>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingCancelPayload, Bridge.AlicizationPersonaTrainingCancelPayload>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingIncrementPayload, Bridge.AlicizationPersonaTrainingIncrementPayload>>,
  Assert<Equal<Eventa.AlicizationPersonaTrainingIncrementsResult, Bridge.AlicizationPersonaTrainingIncrementsResult>>,
]

declare const memoryWorkbenchTransportParity: MemoryWorkbenchTransportParity

void memoryWorkbenchTransportParity
