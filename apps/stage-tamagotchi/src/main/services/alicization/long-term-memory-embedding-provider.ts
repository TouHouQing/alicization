import { errorMessageFrom } from '@moeru/std'

export interface LongTermMemoryEmbeddingProvider {
  modelId: string
  dimensions: number
  vectorSpaceId?: string
  embedTexts: (texts: string[], signal?: AbortSignal) => Promise<Array<{ text: string, vector: number[] }>>
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
  const vectorSpaceId = normalizeText(provider.vectorSpaceId)
  if (!vectorSpaceId)
    throw new Error('embedding provider vectorSpaceId is required')
  return vectorSpaceId
}

function isValidVector(vector: unknown, dimensions: number): vector is number[] {
  return Array.isArray(vector)
    && vector.length === dimensions
    && vector.every(value => Number.isFinite(value))
}

export async function safeEmbedLongTermMemoryTexts(input: {
  provider?: LongTermMemoryEmbeddingProvider | null
  signal?: AbortSignal
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

    const rawEmbeddings = await provider.embedTexts(texts, input.signal)
    if (rawEmbeddings.length !== texts.length) {
      throw new Error(
        `embedding provider returned ${rawEmbeddings.length} embeddings for ${texts.length} texts`,
      )
    }

    const vectorSpaceId = resolveLongTermMemoryVectorSpaceId(provider)
    const embeddings = rawEmbeddings.map((item, index) => {
      const text = normalizeText(item.text)
      const vector: unknown = item.vector
      if (text !== texts[index])
        throw new Error(`embedding provider returned text mismatch at index ${index}`)
      if (!isValidVector(vector, provider.dimensions)) {
        const actualDimensions = Array.isArray(vector) ? vector.length : 'none'
        throw new Error(
          `embedding provider returned invalid vector dimensions at index ${index} (${actualDimensions}; expected ${provider.dimensions})`,
        )
      }
      return {
        text,
        vector: [...vector],
        modelId: provider.modelId,
        dimensions: provider.dimensions,
        vectorSpaceId,
      }
    })

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
