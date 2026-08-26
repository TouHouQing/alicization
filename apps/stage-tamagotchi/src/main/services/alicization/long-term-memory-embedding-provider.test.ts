import type { LongTermMemoryEmbeddingProvider } from './long-term-memory-embedding-provider'

import { describe, expect, it, vi } from 'vitest'

import {
  resolveLongTermMemoryVectorSpaceId,
  safeEmbedLongTermMemoryTexts,
} from './long-term-memory-embedding-provider'

function createProvider(
  embeddings: Array<{ text: string, vector: number[] }>,
): LongTermMemoryEmbeddingProvider {
  return {
    dimensions: 3,
    modelId: 'embedding-model',
    vectorSpaceId: 'test-provider:embedding-model:3',
    embedTexts: vi.fn(async () => embeddings),
  }
}

describe('safe long-term memory embedding provider', () => {
  it('fails the whole batch when the provider returns fewer embeddings than requested', async () => {
    const result = await safeEmbedLongTermMemoryTexts({
      provider: createProvider([
        { text: '第一条记忆', vector: [1, 0, 0] },
      ]),
      texts: ['第一条记忆', '第二条记忆'],
    })

    expect(result).toMatchObject({
      status: 'failed',
      embeddings: [],
    })
    expect(result.error).toContain('returned 1 embeddings for 2 texts')
  })

  it('fails the whole batch when provider results do not preserve text order', async () => {
    const result = await safeEmbedLongTermMemoryTexts({
      provider: createProvider([
        { text: '第二条记忆', vector: [0, 1, 0] },
        { text: '第一条记忆', vector: [1, 0, 0] },
      ]),
      texts: ['第一条记忆', '第二条记忆'],
    })

    expect(result).toMatchObject({
      status: 'failed',
      embeddings: [],
    })
    expect(result.error).toContain('text mismatch at index 0')
  })

  it('fails the whole batch when any embedding has invalid dimensions', async () => {
    const result = await safeEmbedLongTermMemoryTexts({
      provider: createProvider([
        { text: '第一条记忆', vector: [1, 0, 0] },
        { text: '第二条记忆', vector: [0, 1] },
      ]),
      texts: ['第一条记忆', '第二条记忆'],
    })

    expect(result).toMatchObject({
      status: 'failed',
      embeddings: [],
    })
    expect(result.error).toContain('invalid vector dimensions at index 1')
  })

  it('requires an explicit vector space identity for generic providers', () => {
    expect(() => resolveLongTermMemoryVectorSpaceId({
      modelId: 'embedding-model',
      dimensions: 3,
    })).toThrow('vectorSpaceId')
  })

  it('keeps two generic providers isolated even when model and dimensions match', () => {
    const first = resolveLongTermMemoryVectorSpaceId({
      modelId: 'embedding-model',
      dimensions: 3,
      vectorSpaceId: 'provider-a:embedding-model:3',
    })
    const second = resolveLongTermMemoryVectorSpaceId({
      modelId: 'embedding-model',
      dimensions: 3,
      vectorSpaceId: 'provider-b:embedding-model:3',
    })
    expect(first).not.toBe(second)
  })
})
