import { awaitAlicizationPromiseWithAbort } from '../main-chat-stream-primitives'

/**
 * xsAI 0.4.3 records finish_reason in steps, but suppresses its finish event
 * when the same wire chunk also carries content or tool_calls. Only a settled
 * single step with the exact complete proposal cohort can repair that omission.
 */
export async function readSettledToolStepCompletion(
  result: unknown,
  calls: ReadonlyArray<{ toolCallId: string, providerToolName: string }>,
  signal: AbortSignal,
) {
  if (!result || typeof result !== 'object' || !('steps' in result) || !calls.length)
    return null
  const stepsPromise = result.steps
  if (!stepsPromise || typeof (stepsPromise as Promise<unknown>).then !== 'function')
    return null
  const boundedSignal = AbortSignal.any([signal, AbortSignal.timeout(1000)])
  let steps: unknown
  try {
    steps = await awaitAlicizationPromiseWithAbort(Promise.resolve(stepsPromise), boundedSignal)
  }
  catch {
    signal.throwIfAborted()
    return null
  }
  if (!Array.isArray(steps) || steps.length !== 1)
    return null
  const step = steps[0]
  if (!step || !['stop', 'tool_calls', 'length', 'content_filter'].includes(step.finishReason)
    || !Array.isArray(step.toolCalls) || step.toolCalls.length !== calls.length
    || step.toolCalls.some((call: { toolCallId?: unknown, toolName?: unknown }, index: number) => !call
      || call.toolCallId !== calls[index]!.toolCallId || call.toolName !== calls[index]!.providerToolName)) {
    return null
  }
  return { finishReason: step.finishReason as string, usage: step.usage as unknown }
}
