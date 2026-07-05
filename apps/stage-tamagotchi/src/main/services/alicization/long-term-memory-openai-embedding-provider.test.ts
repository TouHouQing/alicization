import { describe, expect, it, vi } from 'vitest'

import {
  createOpenAICompatibleLongTermMemoryEmbeddingProvider,
  resolveOpenAICompatibleLongTermMemoryEmbeddingProvider,
} from './long-term-memory-openai-embedding-provider'

describe('openai-compatible long-term memory embedding provider', () => {
  it('posts batched texts to the embeddings endpoint with explicit model and dimensions', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { index: 0, embedding: [1, 0, 0] },
          { index: 1, embedding: [0, 1, 0] },
        ],
      }),
      text: async () => '',
    } as Response))
    const provider = createOpenAICompatibleLongTermMemoryEmbeddingProvider({
      apiKey: 'test-key',
      baseUrl: 'https://example.test/v1',
      dimensions: 3,
      fetch: fetchImpl,
      headers: { 'X-Test': 'yes' },
      model: 'text-embedding-3-small',
    })

    const embeddings = await provider.embedTexts(['透明失败', '长期记忆'])

    expect(fetchImpl).toHaveBeenCalledWith('https://example.test/v1/embeddings', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
        'X-Test': 'yes',
      }),
    }))
    const fetchCalls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>
    expect(JSON.parse(String(fetchCalls[0]?.[1].body))).toEqual({
      dimensions: 3,
      input: ['透明失败', '长期记忆'],
      model: 'text-embedding-3-small',
    })
    expect(embeddings).toEqual([
      { text: '透明失败', vector: [1, 0, 0] },
      { text: '长期记忆', vector: [0, 1, 0] },
    ])
  })

  it('resolves production memory embedding config without reusing the chat model as vector identity', () => {
    const provider = resolveOpenAICompatibleLongTermMemoryEmbeddingProvider({
      activeProviderId: 'openai-compatible',
      fetch: vi.fn(),
      providerCredentials: {
        'openai-compatible': {
          apiKey: 'chat-key',
          baseUrl: 'http://localhost:11434/v1',
          model: 'qwen-chat',
          memoryEmbeddingDimensions: 768,
          memoryEmbeddingModel: 'nomic-embed-text',
        },
      },
    })

    expect(provider).toMatchObject({
      dimensions: 768,
      modelId: 'nomic-embed-text',
    })
  })
})
