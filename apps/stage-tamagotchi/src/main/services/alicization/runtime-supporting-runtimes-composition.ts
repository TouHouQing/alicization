import { createAlicizationRuntimeExecutionComposition } from './runtime-execution-composition'
import { createAlicizationRuntimeMemoryFeedbackComposition } from './runtime-memory-feedback-composition'
import { createAlicizationRuntimeSelfEvolutionComposition } from './runtime-self-evolution-composition'

type RuntimeExecutionCompositionInput = Parameters<typeof createAlicizationRuntimeExecutionComposition>[0]
type RuntimeMemoryFeedbackCompositionInput = Parameters<typeof createAlicizationRuntimeMemoryFeedbackComposition>[0]
type RuntimeSelfEvolutionCompositionInput = Parameters<typeof createAlicizationRuntimeSelfEvolutionComposition>[0]

export function createAlicizationRuntimeSupportingRuntimesComposition(input: {
  execution: RuntimeExecutionCompositionInput
  memoryFeedback: RuntimeMemoryFeedbackCompositionInput
  selfEvolution: RuntimeSelfEvolutionCompositionInput
}) {
  const {
    memoryLedgerRuntime,
    executionCallbackRuntime,
  } = createAlicizationRuntimeExecutionComposition(input.execution)

  const {
    memoryRetrievalTelemetryRuntime,
    recallFeedbackSummaryOrchestrator,
    getRecallFeedbackSummary,
  } = createAlicizationRuntimeMemoryFeedbackComposition(input.memoryFeedback)

  const { selfEvolutionRuntime } = createAlicizationRuntimeSelfEvolutionComposition(input.selfEvolution)

  return {
    memoryLedgerRuntime,
    executionCallbackRuntime,
    memoryRetrievalTelemetryRuntime,
    recallFeedbackSummaryOrchestrator,
    getRecallFeedbackSummary,
    selfEvolutionRuntime,
  }
}
