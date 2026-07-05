import type { LongTermMemoryEmbeddingProvider } from './long-term-memory-embedding-provider'

export interface OpenAICompatibleLongTermMemoryEmbeddingProviderConfig {
  apiKey?: string | null
  baseUrl: string
  dimensions: number
  fetch?: typeof fetch
  headers?: Record<string, string>
  model: string
  timeoutMs?: number
}

export interface ResolveOpenAICompatibleLongTermMemoryEmbeddingProviderInput {
  activeProviderId?: string | null
  env?: Record<string, string | undefined>
  fetch?: typeof fetch
  providerCredentials: Record<string, Record<string, unknown>>
}

function normalizeText(raw: unknown, maxChars = 360) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
    : ''
}

function normalizeBaseUrl(raw: unknown) {
  const text = normalizeText(raw, 500)
  if (!text)
    return ''
  return text.endsWith('/') ? text : `${text}/`
}

function normalizeDimensions(raw: unknown) {
  const value = Number(raw)
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : null
}

function normalizeHeaders(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return {}
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .map(([key, value]) => [normalizeText(key, 120), normalizeText(value, 1000)])
      .filter(([key, value]) => key && value),
  )
}

function readFirstText(...values: unknown[]) {
  for (const value of values) {
    const text = normalizeText(value, 500)
    if (text)
      return text
  }
  return ''
}

function readFirstDimensions(...values: unknown[]) {
  for (const value of values) {
    const dimensions = normalizeDimensions(value)
    if (dimensions)
      return dimensions
  }
  return null
}

function isVector(raw: unknown, dimensions: number): raw is number[] {
  return Array.isArray(raw)
    && raw.length === dimensions
    && raw.every(value => Number.isFinite(value))
}

function embeddingsEndpoint(baseUrl: string) {
  return new URL('embeddings', normalizeBaseUrl(baseUrl)).toString()
}

export function createOpenAICompatibleLongTermMemoryEmbeddingProvider(
  config: OpenAICompatibleLongTermMemoryEmbeddingProviderConfig,
): LongTermMemoryEmbeddingProvider {
  const baseUrl = normalizeBaseUrl(config.baseUrl)
  const modelId = normalizeText(config.model, 200)
  const dimensions = normalizeDimensions(config.dimensions)
  if (!baseUrl)
    throw new Error('embedding baseUrl is required')
  if (!modelId)
    throw new Error('embedding model is required')
  if (!dimensions)
    throw new Error('embedding dimensions are required')

  const fetchImpl = config.fetch ?? globalThis.fetch
  if (typeof fetchImpl !== 'function')
    throw new Error('fetch is not available for embedding provider')

  return {
    dimensions,
    modelId,
    embedTexts: async (texts) => {
      const input = texts.map(text => normalizeText(text, 2000)).filter(Boolean)
      if (input.length === 0)
        return []

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(new Error('embedding provider timeout')), Math.max(1_000, config.timeoutMs ?? 15_000))
      try {
        const response = await fetchImpl(embeddingsEndpoint(baseUrl), {
          body: JSON.stringify({ dimensions, input, model: modelId }),
          headers: {
            ...(config.apiKey ? { Authorization: `Bearer ${normalizeText(config.apiKey, 1000)}` } : {}),
            'Content-Type': 'application/json',
            ...normalizeHeaders(config.headers),
          },
          method: 'POST',
          signal: controller.signal,
        })
        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(`embedding provider failed with HTTP ${response.status}${text ? `: ${normalizeText(text, 300)}` : ''}`)
        }

        const payload = await response.json() as { data?: Array<{ embedding?: unknown, index?: unknown }> }
        const rows = Array.isArray(payload.data) ? payload.data : []
        return rows
          .map((row, fallbackIndex) => ({
            index: Number.isFinite(Number(row.index)) ? Math.floor(Number(row.index)) : fallbackIndex,
            vector: row.embedding,
          }))
          .filter((row): row is { index: number, vector: number[] } =>
            row.index >= 0 && row.index < input.length && isVector(row.vector, dimensions))
          .sort((left, right) => left.index - right.index)
          .map(row => ({
            text: input[row.index] ?? '',
            vector: [...row.vector],
          }))
      }
      finally {
        clearTimeout(timeout)
      }
    },
  }
}

export function resolveOpenAICompatibleLongTermMemoryEmbeddingProvider(
  input: ResolveOpenAICompatibleLongTermMemoryEmbeddingProviderInput,
): LongTermMemoryEmbeddingProvider | null {
  const env = input.env ?? process.env
  const activeProviderId = normalizeText(input.activeProviderId, 160)
  const activeProviderConfig = activeProviderId ? input.providerCredentials[activeProviderId] ?? {} : {}
  const memoryConfig = {
    ...(input.providerCredentials.__alicizationMemoryEmbedding ?? {}),
    ...(input.providerCredentials.alicizationMemoryEmbedding ?? {}),
  }
  const providerId = readFirstText(
    memoryConfig.providerId,
    activeProviderConfig.memoryEmbeddingProviderId,
    activeProviderConfig.embeddingProviderId,
    env.ALICIZATION_MEMORY_EMBEDDING_PROVIDER_ID,
    activeProviderId,
  )
  const providerConfig = {
    ...(providerId ? input.providerCredentials[providerId] ?? {} : {}),
    ...memoryConfig,
  }
  const model = readFirstText(
    memoryConfig.model,
    memoryConfig.memoryEmbeddingModel,
    activeProviderConfig.memoryEmbeddingModel,
    activeProviderConfig.embeddingModel,
    providerConfig.memoryEmbeddingModel,
    providerConfig.embeddingModel,
    env.ALICIZATION_MEMORY_EMBEDDING_MODEL,
  )
  const dimensions = readFirstDimensions(
    memoryConfig.dimensions,
    memoryConfig.memoryEmbeddingDimensions,
    activeProviderConfig.memoryEmbeddingDimensions,
    activeProviderConfig.embeddingDimensions,
    providerConfig.memoryEmbeddingDimensions,
    providerConfig.embeddingDimensions,
    env.ALICIZATION_MEMORY_EMBEDDING_DIMENSIONS,
  )
  const baseUrl = readFirstText(
    memoryConfig.baseUrl,
    memoryConfig.baseURL,
    activeProviderConfig.memoryEmbeddingBaseUrl,
    activeProviderConfig.memoryEmbeddingBaseURL,
    providerConfig.memoryEmbeddingBaseUrl,
    providerConfig.memoryEmbeddingBaseURL,
    providerConfig.baseUrl,
    providerConfig.baseURL,
    env.ALICIZATION_MEMORY_EMBEDDING_BASE_URL,
    env.ALICIZATION_MEMORY_EMBEDDING_BASEURL,
  )
  if (!model || !dimensions || !baseUrl)
    return null

  return createOpenAICompatibleLongTermMemoryEmbeddingProvider({
    apiKey: readFirstText(memoryConfig.apiKey, providerConfig.apiKey, env.ALICIZATION_MEMORY_EMBEDDING_API_KEY),
    baseUrl,
    dimensions,
    fetch: input.fetch,
    headers: normalizeHeaders(providerConfig.headers),
    model,
  })
}
