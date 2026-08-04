import { errorMessageFrom } from '@moeru/std'

export interface LongTermMemoryEmbeddingProvider {
  modelId: string
  dimensions: number
  vectorSpaceId?: string
  embedTexts: (texts: string[]) => Promise<Array<{ text: string, vector: number[] }>>
}

export interface LongTermMemoryEmbeddingResult {
  text: string
  vector: number[]
  modelId: string
  dimensions: number
  vectorSpaceId: string
}

export interface SafeLongTermMemoryEmbeddingResult {
  status: 'ok' | 'unavailable' | 'failed'
  embeddings: LongTermMemoryEmbeddingResult[]
  error: string | null
}

function normalizeText(raw: unknown) {
  return typeof raw === 'string' ? raw.trim() : ''
}

export function resolveLongTermMemoryVectorSpaceId(provider: Pick<LongTermMemoryEmbeddingProvider, 'modelId' | 'dimensions' | 'vectorSpaceId'>) {
  return normalizeText(provider.vectorSpaceId)
    || `legacy:${normalizeText(provider.modelId)}:${Math.max(1, Math.floor(Number(provider.dimensions)))}`
}

function isValidVector(vector: unknown, dimensions: number): vector is number[] {
  return Array.isArray(vector)
    && vector.length === dimensions
    && vector.every(value => Number.isFinite(value))
}

export async function safeEmbedLongTermMemoryTexts(input: {
  provider?: LongTermMemoryEmbeddingProvider | null
  texts: string[]
}): Promise<SafeLongTermMemoryEmbeddingResult> {
  const provider = input.provider ?? null
  if (!provider) {
    return {
      status: 'unavailable',
      embeddings: [],
      error: null,
    }
  }

  try {
    const texts = input.texts.map(normalizeText).filter(Boolean)
    if (texts.length === 0) {
      return {
        status: 'ok',
        embeddings: [],
        error: null,
      }
    }

    const rawEmbeddings = await provider.embedTexts(texts)
    const embeddings = rawEmbeddings
      .map(item => ({
        text: normalizeText(item.text),
        vector: item.vector,
        modelId: provider.modelId,
        dimensions: provider.dimensions,
        vectorSpaceId: resolveLongTermMemoryVectorSpaceId(provider),
      }))
      .filter(item => item.text && isValidVector(item.vector, provider.dimensions))

    return {
      status: 'ok',
      embeddings,
      error: null,
    }
  }
  catch (error) {
    return {
      status: 'failed',
      embeddings: [],
      error: errorMessageFrom(error) ?? 'embedding failed',
    }
  }
}
