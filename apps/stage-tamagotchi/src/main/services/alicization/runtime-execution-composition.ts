import { createAlicizationExecutionCallbackRuntime } from './execution-callback-runtime'
import { createAlicizationMemoryLedgerRuntime } from './memory-ledger-runtime'

type ExecutionCallbackRuntimeOptions = Parameters<typeof createAlicizationExecutionCallbackRuntime>[0]

export function createAlicizationRuntimeExecutionComposition(input: {
  alicizationDb: {
    listExecutionEvents: ExecutionCallbackRuntimeOptions['listExecutionEvents']
    listTaskThreads: ExecutionCallbackRuntimeOptions['listTaskThreads']
  }
}) {
  const memoryLedgerRuntime = createAlicizationMemoryLedgerRuntime({
    listExecutionEvents: input.alicizationDb.listExecutionEvents,
    listTaskThreads: input.alicizationDb.listTaskThreads,
  })

  const executionCallbackRuntime = createAlicizationExecutionCallbackRuntime({
    listExecutionEvents: input.alicizationDb.listExecutionEvents,
    listTaskThreads: input.alicizationDb.listTaskThreads,
  })

  return {
    memoryLedgerRuntime,
    executionCallbackRuntime,
  }
}
