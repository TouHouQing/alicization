import { describe, expect, it, vi } from 'vitest'

import { runAlicizationMainChatProviderStep } from '../main-chat-stream-runner'
import { encodeOpenAICompatibleSse, startProviderHttpFaultServer } from '../provider-http-fault-server.test-support'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { readProviderUsage, summarizeProviderUsage } from './provider-usage'

describe('truthful per-request provider accounting', () => {
  it('keeps cache splits as input subsets and missing fields unknown', () => {
    const usage = readProviderUsage({ prompt_tokens: 1000, completion_tokens: 50, total_tokens: 1050, prompt_tokens_details: { cached_tokens: 800 }, completion_tokens_details: { reasoning_tokens: 20 } })
    expect(usage).toEqual({ inputTokens: 1000, outputTokens: 50, totalTokens: 1050, cacheReadTokens: 800, reasoningTokens: 20, cacheWriteTokens: null })
    expect(readProviderUsage({ prompt_cache_hit_tokens: 600 })?.cacheReadTokens).toBe(600)
    expect(readProviderUsage({ prompt_tokens: -1, completion_tokens: '20' })).toBeNull()
    expect(readProviderUsage(undefined)).toBeNull()
  })
  it('deduplicates final events while counting retries and missing provider reports honestly', () => {
    const usage = readProviderUsage({ prompt_tokens: 1000, completion_tokens: 50, total_tokens: 1050 })
    const summary = summarizeProviderUsage([{ requestId: 'attempt-1', usage }, { requestId: 'attempt-1', usage }, { requestId: 'attempt-2', usage: null }])
    expect(summary.requestCount).toBe(2)
    expect(summary.usageReported).toBe(1)
    expect(summary.totals.totalTokens).toEqual({ reported: 1, knownSubtotal: 1050, complete: false })
    expect(summary.totals.cacheReadTokens).toEqual({ reported: 0, knownSubtotal: 0, complete: false })
  })
  it.each(['late', 'finish', 'missing'] as const)('records %s usage once through the actual xsAI SSE transport', async (mode) => {
    const usage = { prompt_tokens: 1000, completion_tokens: 50, total_tokens: 1050, prompt_tokens_details: { cached_tokens: 800 } }
    const server = await startProviderHttpFaultServer({ respond: () => ({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, stream: async (response) => {
      response.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: '你好。' }, finish_reason: null }] })}\n\n`)
      response.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], ...(mode === 'finish' ? { usage } : {}) })}\n\n`)
      if (mode === 'late') {
        await new Promise(resolve => setTimeout(resolve, 15))
        response.write(`data: ${JSON.stringify({ choices: [], usage })}\n\n`)
      }
      response.end(encodeOpenAICompatibleSse([]))
    } }) })
    const audit = vi.fn()
    try {
      const result = await runAlicizationMainChatProviderStep({
        payload: { cardId: 'card-1', turnId: 'turn-1', providerId: 'test' } as any,
        prepared: { chatConfig: { apiKey: 'test', baseURL: server.baseUrl, model: 'test-model' }, toolRegistry: createCanonicalToolRegistry(), toolChoice: 'none' } as any,
        messages: [{ role: 'user', content: '你好' }],
        controller: new AbortController(),
        firstEventTimeoutMs: 1000,
        providerContinuationTimeoutMs: 1000,
        providerRetryPolicy: { maxRetries: 0 },
        isRunActive: () => true,
        nonProgressEventTypes: new Set(),
        emitToolCall: vi.fn(),
        useResponseSchema: false,
        appendRuntimeDebugLine: audit,
      })
      expect(result).toMatchObject({ kind: 'reply', text: '你好。' })
      const records = audit.mock.calls.filter(([event]) => event === 'chat-provider-request.usage').map(([, data]) => data)
      expect(records).toHaveLength(1)
      expect(records[0]).toMatchObject({ model: 'test-model', providerId: 'test', settlement: 'completed', source: mode === 'missing' ? 'unavailable' : 'provider-reported', usage: mode === 'missing' ? null : { inputTokens: 1000, outputTokens: 50, totalTokens: 1050, cacheReadTokens: 800 } })
      expect(records[0].requestId).toBeTruthy()
      expect(records[0].requestHash).toBeTruthy()
    }
    finally { await server.close() }
  })
})
