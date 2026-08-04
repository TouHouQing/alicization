import { describe, expect, it, vi } from 'vitest'

import {
  createOpenAICompatibleLongTermMemoryEmbeddingProvider,
  listOpenAICompatibleLongTermMemoryEmbeddingModels,
  resolveOpenAICompatibleLongTermMemoryEmbeddingProvider,
  testOpenAICompatibleLongTermMemoryEmbeddingConnection,
} from './long-term-memory-openai-embedding-provider'

describe('openai-compatible long-term memory embedding provider', () => {
  it('posts batched texts to the v1 embeddings endpoint without provider-specific dimensions', async () => {
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
      baseUrl: 'https://api.siliconflow.cn',
      dimensions: 3,
      fetch: fetchImpl,
      headers: { 'X-Test': 'yes' },
      model: 'BAAI/bge-m3',
    })

    const embeddings = await provider.embedTexts(['透明失败', '长期记忆'])

    expect(fetchImpl).toHaveBeenCalledWith('https://api.siliconflow.cn/v1/embeddings', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json',
        'X-Test': 'yes',
      }),
    }))
    const fetchCalls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>
    expect(JSON.parse(String(fetchCalls[0]?.[1].body))).toEqual({
      input: ['透明失败', '长期记忆'],
      model: 'BAAI/bge-m3',
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

  it('isolates vector spaces by provider endpoint without hashing the api key', () => {
    const first = createOpenAICompatibleLongTermMemoryEmbeddingProvider({
      apiKey: 'first-secret',
      baseUrl: 'https://provider-a.example/v1',
      dimensions: 3,
      fetch: vi.fn(),
      model: 'same-model',
    })
    const sameEndpointWithRotatedKey = createOpenAICompatibleLongTermMemoryEmbeddingProvider({
      apiKey: 'rotated-secret',
      baseUrl: 'https://provider-a.example',
      dimensions: 3,
      fetch: vi.fn(),
      model: 'same-model',
    })
    const differentEndpoint = createOpenAICompatibleLongTermMemoryEmbeddingProvider({
      apiKey: 'first-secret',
      baseUrl: 'https://provider-b.example',
      dimensions: 3,
      fetch: vi.fn(),
      model: 'same-model',
    })

    expect(first.vectorSpaceId).toBe(sameEndpointWithRotatedKey.vectorSpaceId)
    expect(first.vectorSpaceId).not.toBe(differentEndpoint.vectorSpaceId)
    expect(first.vectorSpaceId).not.toContain('first-secret')
  })

  it('prefers the dedicated memory embedding config over the legacy workbench key', () => {
    const provider = resolveOpenAICompatibleLongTermMemoryEmbeddingProvider({
      activeProviderId: 'openai-compatible',
      fetch: vi.fn(),
      providerCredentials: {
        __alicizationMemoryEmbedding: {
          apiKey: 'new-key',
          baseUrl: 'https://new.example.test/v1/',
          dimensions: 1024,
          model: 'new-embedding-model',
          providerId: 'new-provider',
        },
        alicizationMemoryEmbedding: {
          apiKey: 'old-key',
          baseUrl: 'https://old.example.test/v1/',
          dimensions: 768,
          model: 'old-embedding-model',
          providerId: 'old-provider',
        },
      },
    })

    expect(provider).toMatchObject({
      dimensions: 1024,
      modelId: 'new-embedding-model',
    })
  })

  it('lists searchable embedding models from the OpenAI-compatible v1 models endpoint', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { id: 'gpt-4.1-mini', owned_by: 'openai' },
          { id: 'text-embedding-3-small', owned_by: 'openai' },
          { id: 'nomic-embed-text', owned_by: 'local', dimensions: 768 },
        ],
      }),
      text: async () => '',
    } as Response))

    const result = await listOpenAICompatibleLongTermMemoryEmbeddingModels({
      apiKey: 'test-key',
      baseUrl: 'https://api.siliconflow.cn',
      fetch: fetchImpl,
      query: 'embed',
    })

    expect(fetchImpl).toHaveBeenCalledWith('https://api.siliconflow.cn/v1/models', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
    }))
    expect(result).toEqual({
      error: null,
      items: [
        {
          description: null,
          dimensions: 1536,
          id: 'text-embedding-3-small',
          name: 'text-embedding-3-small',
          provider: 'openai',
        },
        {
          description: null,
          dimensions: 768,
          id: 'nomic-embed-text',
          name: 'nomic-embed-text',
          provider: 'local',
        },
      ],
      query: 'embed',
    })
  })

  it('accepts a pasted embeddings endpoint without appending embeddings twice', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ index: 0, embedding: [1, 0, 0] }],
      }),
      text: async () => '',
    } as Response))
    const provider = createOpenAICompatibleLongTermMemoryEmbeddingProvider({
      baseUrl: 'https://api.siliconflow.cn/v1/embeddings',
      dimensions: 3,
      fetch: fetchImpl,
      model: 'BAAI/bge-m3',
    })

    await provider.embedTexts(['Hello'])

    expect(fetchImpl).toHaveBeenCalledWith('https://api.siliconflow.cn/v1/embeddings', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('chunks batched texts to stay within OpenAI-compatible provider request limits', async () => {
    const fetchImpl = vi.fn(async (_url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      expect(init?.body).toBeTruthy()
      const body = JSON.parse(String(init?.body)) as { input: string[] }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: body.input.map((_, index) => ({ index, embedding: [index, 0, 0] })),
        }),
        text: async () => '',
      } as Response
    })
    const provider = createOpenAICompatibleLongTermMemoryEmbeddingProvider({
      baseUrl: 'https://api.siliconflow.cn',
      dimensions: 3,
      fetch: fetchImpl,
      model: 'BAAI/bge-m3',
    })
    const texts = Array.from({ length: 33 }, (_, index) => `memory-${index}`)

    const embeddings = await provider.embedTexts(texts)

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const fetchCalls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>
    expect(JSON.parse(String(fetchCalls[0]?.[1].body)).input).toHaveLength(32)
    expect(JSON.parse(String(fetchCalls[1]?.[1].body)).input).toEqual(['memory-32'])
    expect(embeddings).toHaveLength(33)
    expect(embeddings[32]).toEqual({ text: 'memory-32', vector: [0, 0, 0] })
  })

  it('tests embedding connectivity and returns transparent provider failures', async () => {
    const okFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ index: 0, embedding: [1, 0, 0] }],
      }),
      text: async () => '',
    } as Response))

    await expect(testOpenAICompatibleLongTermMemoryEmbeddingConnection({
      apiKey: 'test-key',
      baseUrl: 'https://example.test/v1',
      dimensions: 3,
      fetch: okFetch,
      model: 'local-embedding',
    })).resolves.toMatchObject({
      dimensions: 3,
      error: null,
      modelId: 'local-embedding',
      ok: true,
    })

    const failedFetch = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => 'unauthorized',
    } as Response))

    await expect(testOpenAICompatibleLongTermMemoryEmbeddingConnection({
      apiKey: 'bad-key',
      baseUrl: 'https://example.test/v1',
      dimensions: 3,
      fetch: failedFetch,
      model: 'local-embedding',
    })).resolves.toMatchObject({
      dimensions: 3,
      error: 'embedding provider failed with HTTP 401: unauthorized',
      modelId: 'local-embedding',
      ok: false,
    })
  })

  it('infers dimensions from the returned vector when the user has not configured dimensions yet', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ index: 0, embedding: [1, 0, 0, 0, 0] }],
      }),
      text: async () => '',
    } as Response))

    await expect(testOpenAICompatibleLongTermMemoryEmbeddingConnection({
      apiKey: 'test-key',
      baseUrl: 'https://api.siliconflow.cn',
      dimensions: null,
      fetch: fetchImpl,
      model: 'BAAI/bge-m3',
    })).resolves.toMatchObject({
      dimensions: 5,
      error: null,
      modelId: 'BAAI/bge-m3',
      ok: true,
    })
  })
})
