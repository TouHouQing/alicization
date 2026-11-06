import type { Message } from '@xsai/shared-chat'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import { executionDigest } from '../execution/acceptance-compiler'
import { canonicalizeToolArguments, repeatedToolReminder } from '../third-party/deepseek-repeat-tool'
import { maxAgentToolBatchSize } from '../third-party/pi-tool-batch'
import { toolObservationState } from './tool-observation'

export const agentHarnessMaxModelSteps = 64
const progressType = 'alicization-agent-progress-context'

function observationKey(content: unknown) {
  try {
    const value = typeof content === 'string' ? JSON.parse(content) : content
    if (value?.type === 'alicization-tool-observation-reference' && typeof value.sourceHash === 'string' && /^[a-f\d]{64}$/u.test(value.sourceHash))
      return value.sourceHash
    return createHash('sha256').update(typeof content === 'string' ? content : JSON.stringify(content)).digest('hex')
  }
  catch { return executionDigest(content) }
}

function isProgressFact(message: Message) {
  if (message.role !== 'system' || typeof message.content !== 'string')
    return false
  try {
    return JSON.parse(message.content)?.type === progressType
  }
  catch { return false }
}

/** Derived only from this turn's real call/result pairs; no second task state. */
export function prepareAgentContinuation(messages: Message[], options: { hasTools?: boolean } = {}) {
  const retained = messages.filter(message => !isProgressFact(message))
  const currentUser = retained.findLastIndex(message => message.role === 'user')
  const calls = new Map<string, { operation: string, inputHash: string }>()
  const results: Array<{ toolCallId: string, operation: string, inputHash: string, outcome: 'failure' | 'observed', errorCode: string | null }> = []
  const repeatCalls: Array<{ name: string, argumentsKey: string, observationKey: string }> = []
  for (const message of retained.slice(currentUser + 1)) {
    if (message.role === 'assistant') {
      for (const call of message.tool_calls ?? []) {
        if (typeof call.id !== 'string' || typeof call.function?.name !== 'string' || typeof call.function.arguments !== 'string')
          continue
        let arguments_: unknown
        try {
          arguments_ = JSON.parse(call.function.arguments)
        }
        catch { arguments_ = call.function.arguments }
        calls.set(call.id, { operation: call.function.name, inputHash: executionDigest(canonicalizeToolArguments(arguments_)) })
      }
    }
    if (message.role !== 'tool' || !message.tool_call_id || !calls.has(message.tool_call_id))
      continue
    const output = toolObservationState(message.content)
    const failure = output?.ok === false || output?.isError === true || ['failed', 'blocked', 'cancelled', 'timeout', 'dead-lettered'].includes(String(output?.status))
    const errorCode = typeof output?.errorCode === 'string' && /^[A-Z\d_-]{1,96}$/u.test(output.errorCode) ? output.errorCode : null
    results.push({ toolCallId: message.tool_call_id, ...calls.get(message.tool_call_id)!, outcome: failure ? 'failure' : 'observed', errorCode })
    const call = calls.get(message.tool_call_id)!
    if (errorCode !== 'BATCH_REPLAN_REQUIRED')
      repeatCalls.push({ name: call.operation, argumentsKey: call.inputHash, observationKey: observationKey(message.content) })
  }
  const repetition = repeatedToolReminder(repeatCalls)
  const attempted = results.filter(result => result.errorCode !== 'BATCH_REPLAN_REQUIRED')
  const last = attempted.at(-1)
  let repeatedFailures = 0
  if (last?.outcome === 'failure') {
    for (let index = attempted.length - 1; index >= 0; index--) {
      const result = attempted[index]!
      if (result.outcome !== 'failure' || result.operation !== last.operation || result.inputHash !== last.inputHash || result.errorCode !== last.errorCode)
        break
      repeatedFailures++
    }
  }
  const replyOnly = repeatedFailures >= 3 || calls.size >= agentHarnessMaxModelSteps - 1
  if (!results.length && !options.hasTools)
    return { messages: retained, replyOnly, repeatedFailures, actionCount: calls.size }
  const data = {
    actionCount: calls.size,
    actionBudgetRemaining: Math.max(0, agentHarnessMaxModelSteps - 1 - calls.size),
    maxToolCallsPerStep: Math.min(maxAgentToolBatchSize, Math.max(0, agentHarnessMaxModelSteps - 1 - calls.size)),
    recentObservations: results.slice(-6),
    repeatedFailures,
    repetition,
    replyOnly,
    guidance: replyOnly
      ? 'This turn has no further action budget. Give an honest grounded reply about observed work and the exact unresolved blocker. Do not claim completion or invent another operation. A future request retains normal risk and uncertain-effect reconciliation.'
      : repeatedFailures >= 2
        ? 'The same operation and input failed repeatedly. Reassess the current observation and change the plan or request the concrete missing input. Do not repeat the unchanged failed proposal. Existing successes and unknown effects remain authoritative.'
        : 'Ordinary companionship needs no action. Respect both action limits. Batch only independent proposals; dependent inputs need fresh observations. Continue from actual receipts, preserve prior work, and verify task acceptance. Read stored receipts instead of replaying actions.',
  }
  // Derived reminders must not displace identity, current intent or original
  // receipts. The full authoritative history remains available to the model.
  const serialize = () => JSON.stringify({ type: progressType, data })
  while (data.recentObservations.length && Buffer.byteLength(serialize()) > 1536)
    data.recentObservations.shift()
  const fact: Message = { role: 'system', content: serialize() }
  return { messages: [...retained, fact], replyOnly, repeatedFailures, actionCount: calls.size }
}
