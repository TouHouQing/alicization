import { describe, expect, it } from 'vitest'

import { readSettledToolStepCompletion } from './provider-step-completion'

describe('settled provider proposal cohort', () => {
  const calls = [{ toolCallId: 'call-1', providerToolName: 'inspect' }]
  const step = { finishReason: 'tool_calls', toolCalls: [{ toolCallId: 'call-1', toolName: 'inspect' }] }
  it.each([
    [],
    [step, step],
    [{ ...step, finishReason: 'other' }],
    [{ ...step, toolCalls: [] }],
    [{ ...step, toolCalls: [{ toolCallId: 'foreign', toolName: 'inspect' }] }],
    [{ ...step, toolCalls: [{ toolCallId: 'call-1', toolName: 'mutate' }] }],
  ].map(steps => ({ steps })))('rejects missing, synthetic or mismatched completion evidence: %j', async ({ steps }) => {
    expect(await readSettledToolStepCompletion({ steps: Promise.resolve(steps) }, calls, new AbortController().signal)).toBeNull()
  })
  it('does not absorb cancellation while completion metadata is pending', async () => {
    const controller = new AbortController()
    const pending = readSettledToolStepCompletion({ steps: new Promise(() => {}) }, calls, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})
