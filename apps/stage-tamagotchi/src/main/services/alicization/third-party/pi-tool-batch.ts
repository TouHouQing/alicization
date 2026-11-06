// Adapted from earendil-works/pi packages/agent/src/agent-loop.ts,
// executeToolCallsSequential, commit 62752fd4c37a72e0f3c1cc83e9ac3b4299f31fe6 (MIT).
// Full license: resources/licenses/pi-file-tools-license.txt.
// Alicization owns validation, risk admission, execution and durable settlement.

export const maxAgentToolBatchSize = 8

export async function executeToolCallsSequential<T>(
  calls: readonly T[],
  executeAndSettle: (call: T) => Promise<void>,
  signal: AbortSignal,
) {
  for (const call of calls) {
    // Recheck before dispatch as well as after settlement. A cancellation at a
    // durable receipt boundary must never release the next side effect.
    signal.throwIfAborted()
    await executeAndSettle(call)
    signal.throwIfAborted()
  }
}
