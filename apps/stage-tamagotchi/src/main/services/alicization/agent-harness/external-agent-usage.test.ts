import { expect, it, vi } from 'vitest'

import { withExternalAgentUsage } from './external-agent-usage'
import { readProviderUsage } from './provider-usage'

it('records native terminal aggregates once without inventing provider calls or missing splits', async () => {
  const accounting = { started: vi.fn(async () => {}), settled: vi.fn(async () => {}) }
  const request = { requestId: 'native', cardId: 'alice', turnId: 'turn', rootTurnId: 'root', parentRequestId: null, providerId: 'codex', model: 'external-cli-managed', measurement: 'external-agent-aggregate' as const, requestHash: 'a'.repeat(64), providerAttempt: 1, startedAt: 1 }
  await withExternalAgentUsage({ accounting, request, task: async (observe) => {
    expect(accounting.started).toHaveBeenCalledWith(request)
    const event = { channel: 'codex', payload: { codexEventType: 'turn.completed', executionRunId: 'run-1', providerUsage: readProviderUsage({ input_tokens: 100, cached_input_tokens: 80, output_tokens: 20 }) } } as any
    observe([event, event])
    return { thread: { status: 'completed' } }
  } })
  expect(accounting.settled).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ measurement: 'external-agent-aggregate', usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 80, totalTokens: null, cacheWriteTokens: null, reasoningTokens: null } }))
  await expect(withExternalAgentUsage({ accounting, request: { ...request, requestId: 'unknown' }, task: async () => {
    throw new Error('native failed')
  } })).rejects.toThrow('native failed')
  expect(accounting.settled).toHaveBeenLastCalledWith(expect.objectContaining({ requestId: 'unknown', settlement: 'failed', usage: null }))
})
