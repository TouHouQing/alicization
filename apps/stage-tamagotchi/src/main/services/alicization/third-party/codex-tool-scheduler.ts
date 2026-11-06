// Port of Codex's shared/exclusive tool admission pattern (Apache-2.0):
// openai/codex bfdbf01bfaeaa6ab23b10e2bd64ed031fd1e5619,
// codex-rs/core/src/tools/parallel.rs, ToolCallRuntime parallel_execution.
// Alicization uses bounded read cohorts and ordered durable settlement instead
// of Tokio's RwLock. License: resources/licenses/codex-agent-harness-license.txt.

export type ToolBodyResult<T> = { ok: true, value: T } | { ok: false, error: unknown }

/** Bodies may overlap; starts and receipts retain proposal order. */
export async function executeToolCallsScheduled<T, R>(calls: readonly T[], options: {
  canRunInParallel: (call: T) => boolean
  start: (call: T) => Promise<void>
  execute: (call: T) => Promise<R>
  settle: (call: T, result: ToolBodyResult<R>) => Promise<void>
  signal: AbortSignal
  concurrency?: number
}) {
  const limit = options.concurrency ?? 4
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 8)
    throw new RangeError('tool concurrency must be between 1 and 8')
  for (let offset = 0; offset < calls.length;) {
    options.signal.throwIfAborted()
    const cohort: T[] = [calls[offset++]!]
    if (options.canRunInParallel(cohort[0]!)) {
      while (offset < calls.length && cohort.length < limit && options.canRunInParallel(calls[offset]!))
        cohort.push(calls[offset++]!)
    }
    for (const call of cohort) {
      options.signal.throwIfAborted()
      await options.start(call)
    }
    // Catch immediately, then await EVERY body before settlement or propagation.
    // A rejected body or cancellation cannot abandon another in-flight reader.
    const results = await Promise.all(cohort.map(async (call): Promise<ToolBodyResult<R>> => {
      try {
        options.signal.throwIfAborted()
        return { ok: true, value: await options.execute(call) }
      }
      catch (error) { return { ok: false, error } }
    }))
    for (const [index, call] of cohort.entries()) {
      await options.settle(call, results[index]!)
      options.signal.throwIfAborted()
    }
  }
}
