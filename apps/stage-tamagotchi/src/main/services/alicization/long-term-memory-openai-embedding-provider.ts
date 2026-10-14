import type {
  AlicizationMemoryEmbeddingConnectionTestResult,
  AlicizationMemoryEmbeddingModelInfo,
  AlicizationMemoryEmbeddingModelListResult,
} from '../../../shared/eventa'
import type { LongTermMemoryEmbeddingProvider } from './long-term-memory-embedding-provider'

import { createHash } from 'node:crypto'

import { errorMessageFrom } from '@moeru/std'

import { providerFetch } from './provider-fetch'

const OPENAI_COMPATIBLE_EMBEDDING_BATCH_SIZE = 32
const DEFAULT_EMBEDDING_TIMEOUT_MS = 30_000
const DEFAULT_EMBEDDING_MAX_RETRIES = 5
const DEFAULT_EMBEDDING_RETRY_BASE_DELAY_MS = 500
const MAX_EMBEDDING_RETRY_DELAY_MS = 10_000

export interface OpenAICompatibleLongTermMemoryEmbeddingProviderConfig {
  apiKey?: string | null
  baseUrl: string
  dimensions: number
  fetch?: typeof fetch
  headers?: Record<string, string>
  maxRetries?: number
  model: string
  retryBaseDelayMs?: number
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

function normalizeOpenAICompatibleApiBaseUrl(raw: unknown) {
  const baseUrl = normalizeBaseUrl(raw)
  if (!baseUrl)
    return ''

  const url = new URL(baseUrl)
  const segments = url.pathname
    .split('/')
    .filter(Boolean)
    .filter((segment, index, list) => index !== list.length - 1 || !['embeddings', 'models'].includes(segment))
  if (!segments.includes('v1'))
    segments.push('v1')
  url.pathname = `/${segments.join('/')}/`
  return url.toString()
}

function normalizeDimensions(raw: unknown) {
  if (raw === null || raw === undefined)
    return null
  if (typeof raw === 'string' && !raw.trim())
    return null
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
  return new URL('embeddings', normalizeOpenAICompatibleApiBaseUrl(baseUrl)).toString()
}

function vectorSpaceId(input: {
  providerId?: string | null
  baseUrl: string
  modelId: string
  dimensions: number
}) {
  const identity = JSON.stringify({
    providerId: normalizeText(input.providerId, 160) || 'openai-compatible',
    endpoint: embeddingsEndpoint(input.baseUrl),
    modelId: normalizeText(input.modelId, 200),
    dimensions: input.dimensions,
  })
  return `embedding-space:v1:${createHash('sha256').update(identity).digest('hex')}`
}

function modelsEndpoint(baseUrl: string) {
  return new URL('models', normalizeOpenAICompatibleApiBaseUrl(baseUrl)).toString()
}

function timeoutMsFrom(raw: unknown, fallback = DEFAULT_EMBEDDING_TIMEOUT_MS) {
  const value = Number(raw)
  return Number.isFinite(value) ? Math.max(1_000, Math.floor(value)) : fallback
}

function retryCountFrom(raw: unknown, fallback = DEFAULT_EMBEDDING_MAX_RETRIES) {
  const value = Number(raw)
  return Number.isFinite(value) ? Math.max(0, Math.min(10, Math.floor(value))) : fallback
}

function retryDelayFrom(raw: unknown, fallback = DEFAULT_EMBEDDING_RETRY_BASE_DELAY_MS) {
  const value = Number(raw)
  return Number.isFinite(value) ? Math.max(0, Math.min(MAX_EMBEDDING_RETRY_DELAY_MS, Math.floor(value))) : fallback
}

function isTransientEmbeddingStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

function isAbortError(error: unknown) {
  return Boolean(
    error
    && typeof error === 'object'
    && 'name' in error
    && (error as { name?: unknown }).name === 'AbortError',
  )
}

function isTransientEmbeddingError(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status?: unknown }).status)
    if (Number.isFinite(status))
      return isTransientEmbeddingStatus(status)
  }
  const message = errorMessageFrom(error) ?? ''
  return /embedding provider timeout|fetch|network|connection|socket|econnreset|eof|temporarily unavailable|service unavailable/iu.test(message)
}

function buildEmbeddingHttpError(status: number, text: string) {
  const error = new Error(
    `embedding provider failed with HTTP ${status}${text ? `: ${normalizeText(text, 300)}` : ''}`,
  ) as Error & { status: number }
  error.status = status
  return error
}

async function waitForEmbeddingRetry(delayMs: number, signal?: AbortSignal) {
  if (delayMs <= 0)
    return
  await new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = (error?: unknown) => {
      if (settled)
        return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      if (error)
        reject(error)
      else
        resolve()
    }
    const onAbort = () => finish(signal?.reason ?? new DOMException('embedding retry aborted', 'AbortError'))
    const timer = setTimeout(() => finish(), delayMs)
    if (signal?.aborted)
      onAbort()
    else
      signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function requestOpenAICompatibleEmbeddings(input: {
  apiKey?: string | null
  baseUrl: string
  fetch: typeof fetch
  headers?: Record<string, string>
  maxRetries?: number
  modelId: string
  retryBaseDelayMs?: number
  signal?: AbortSignal
  texts: string[]
  timeoutMs?: number
}) {
  const maxRetries = retryCountFrom(input.maxRetries)
  const retryBaseDelayMs = retryDelayFrom(input.retryBaseDelayMs)
  const timeoutMs = Math.max(1_000, input.timeoutMs ?? DEFAULT_EMBEDDING_TIMEOUT_MS)
  let retryIndex = 0

  while (true) {
    if (input.signal?.aborted)
      throw input.signal.reason ?? new DOMException('embedding request aborted', 'AbortError')

    const controller = new AbortController()
    let timedOut = false
    const abortFromCaller = () => {
      controller.abort(input.signal?.reason ?? new Error('embedding provider request aborted'))
    }
    input.signal?.addEventListener('abort', abortFromCaller, { once: true })
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort(new Error('embedding provider timeout'))
    }, timeoutMs)

    try {
      const response = await input.fetch(embeddingsEndpoint(input.baseUrl), {
        body: JSON.stringify({ input: input.texts, model: input.modelId }),
        headers: {
          ...(input.apiKey ? { Authorization: `Bearer ${normalizeText(input.apiKey, 1000)}` } : {}),
          'Content-Type': 'application/json',
          ...normalizeHeaders(input.headers),
        },
        method: 'POST',
        signal: controller.signal,
      })
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw buildEmbeddingHttpError(response.status, text)
      }

      const payload = await response.json() as { data?: Array<{ embedding?: unknown, index?: unknown }> }
      const rows = Array.isArray(payload.data) ? payload.data : []
      return rows.map(row => ({
        index: row.index,
        vector: row.embedding,
      }))
    }
    catch (error) {
      const callerAborted = input.signal?.aborted === true
      if (
        callerAborted
        || (isAbortError(error) && !timedOut)
        || !isTransientEmbeddingError(error)
        || retryIndex >= maxRetries
      ) {
        throw error
      }

      const retryDelayMs = Math.min(
        MAX_EMBEDDING_RETRY_DELAY_MS,
        retryBaseDelayMs * (2 ** retryIndex),
      )
      retryIndex += 1
      await waitForEmbeddingRetry(retryDelayMs, input.signal)
    }
    finally {
      clearTimeout(timeout)
      input.signal?.removeEventListener('abort', abortFromCaller)
    }
  }
}

function modelDimensionsFromId(id: string) {
  if (id.includes('text-embedding-3-large'))
    return 3072
  if (id.includes('text-embedding-3-small'))
    return 1536
  if (id.includes('text-embedding-ada-002'))
    return 1536
  return null
}

function mapModelInfo(row: Record<string, unknown>): AlicizationMemoryEmbeddingModelInfo | null {
  const id = normalizeText(row.id, 240)
  if (!id)
    return null
  return {
    id,
    name: readFirstText(row.name, row.display_name, id),
    provider: readFirstText(row.owned_by, row.provider, 'openai-compatible'),
    description: normalizeText(row.description, 360) || null,
    dimensions: readFirstDimensions(row.dimensions, row.embedding_dimensions) ?? modelDimensionsFromId(id),
  }
}

function filterEmbeddingModels(
  models: AlicizationMemoryEmbeddingModelInfo[],
  query: string,
) {
  const normalizedQuery = normalizeText(query, 120).toLowerCase()
  return models.filter((model) => {
    const haystack = [
      model.id,
      model.name,
      model.provider,
      model.description ?? '',
    ].join(' ').toLowerCase()
    if (normalizedQuery && !haystack.includes(normalizedQuery))
      return false
    if (normalizedQuery)
      return true
    return /\b(embed|embedding|bge|e5|gte|jina|nomic|text-embedding)\b/i.test(haystack)
  })
}

export async function listOpenAICompatibleLongTermMemoryEmbeddingModels(input: {
  apiKey?: string | null
  baseUrl: string
  fetch?: typeof fetch
  query?: string | null
  timeoutMs?: number
}): Promise<AlicizationMemoryEmbeddingModelListResult> {
  const baseUrl = normalizeBaseUrl(input.baseUrl)
  const query = normalizeText(input.query, 120) || null
  if (!baseUrl)
    return { error: 'embedding baseUrl is required', items: [], query }

  const fetchImpl = input.fetch ?? providerFetch
  if (typeof fetchImpl !== 'function')
    return { error: 'fetch is not available for embedding provider', items: [], query }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error('embedding model discovery timeout')), timeoutMsFrom(input.timeoutMs, 10_000))
  try {
    const headers = input.apiKey
      ? { Authorization: `Bearer ${normalizeText(input.apiKey, 1000)}` }
      : undefined
    const response = await fetchImpl(modelsEndpoint(baseUrl), {
      headers,
      method: 'GET',
      signal: controller.signal,
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return {
        error: `embedding model discovery failed with HTTP ${response.status}${text ? `: ${normalizeText(text, 300)}` : ''}`,
        items: [],
        query,
      }
    }

    const payload = await response.json() as { data?: unknown }
    const rows = Array.isArray(payload.data) ? payload.data : []
    const items = rows
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
      .map(row => mapModelInfo(row))
      .filter((row): row is AlicizationMemoryEmbeddingModelInfo => Boolean(row))

    return {
      error: null,
      items: filterEmbeddingModels(items, query ?? ''),
      query,
    }
  }
  catch (error) {
    return {
      error: errorMessageFrom(error) ?? 'embedding model discovery failed',
      items: [],
      query,
    }
  }
  finally {
    clearTimeout(timeout)
  }
}

export async function testOpenAICompatibleLongTermMemoryEmbeddingConnection(input: {
  apiKey?: string | null
  baseUrl: string
  dimensions?: number | null
  fetch?: typeof fetch
  model: string
  timeoutMs?: number
}): Promise<AlicizationMemoryEmbeddingConnectionTestResult> {
  const startedAt = Date.now()
  const configuredDimensions = normalizeDimensions(input.dimensions) ?? modelDimensionsFromId(normalizeText(input.model, 240))
  try {
    const baseUrl = normalizeBaseUrl(input.baseUrl)
    const modelId = normalizeText(input.model, 200)
    if (!baseUrl)
      throw new Error('embedding baseUrl is required')
    if (!modelId)
      throw new Error('embedding model is required')

    const fetchImpl = input.fetch ?? providerFetch
    if (typeof fetchImpl !== 'function')
      throw new Error('fetch is not available for embedding provider')

    const rows = await requestOpenAICompatibleEmbeddings({
      apiKey: input.apiKey,
      baseUrl,
      fetch: fetchImpl,
      modelId,
      texts: ['Alicization memory embedding connectivity probe'],
      timeoutMs: input.timeoutMs,
    })
    if (rows.length !== 1)
      throw new Error(`embedding provider returned ${rows.length} embeddings for 1 texts`)
    if (rows[0]?.index !== 0)
      throw new Error(`embedding provider returned invalid embedding index (${String(rows[0]?.index)})`)
    const vector: unknown = rows[0]?.vector
    const dimensions = configuredDimensions ?? (Array.isArray(vector) ? vector.length : 0)
    if (!isVector(vector, dimensions)) {
      const actualDimensions = Array.isArray(vector) ? vector.length : 'none'
      return {
        dimensions,
        error: `embedding provider returned invalid vector dimensions (${actualDimensions})`,
        latencyMs: Date.now() - startedAt,
        modelId,
        ok: false,
      }
    }
    return {
      dimensions,
      error: null,
      latencyMs: Date.now() - startedAt,
      modelId,
      ok: true,
    }
  }
  catch (error) {
    return {
      dimensions: configuredDimensions ?? null,
      error: errorMessageFrom(error) ?? 'embedding connection test failed',
      latencyMs: Date.now() - startedAt,
      modelId: normalizeText(input.model, 240) || null,
      ok: false,
    }
  }
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
    vectorSpaceId: vectorSpaceId({
      providerId: 'openai-compatible',
      baseUrl,
      modelId,
      dimensions,
    }),
    embedTexts: async (texts, signal) => {
      const input = texts.map(text => normalizeText(text, 2000)).filter(Boolean)
      if (input.length === 0)
        return []

      const embeddings: Array<{ text: string, vector: number[] }> = []
      for (let offset = 0; offset < input.length; offset += OPENAI_COMPATIBLE_EMBEDDING_BATCH_SIZE) {
        const batch = input.slice(offset, offset + OPENAI_COMPATIBLE_EMBEDDING_BATCH_SIZE)
        const rows = await requestOpenAICompatibleEmbeddings({
          apiKey: config.apiKey,
          baseUrl,
          fetch: fetchImpl,
          headers: config.headers,
          maxRetries: config.maxRetries,
          modelId,
          retryBaseDelayMs: config.retryBaseDelayMs,
          signal,
          texts: batch,
          timeoutMs: config.timeoutMs,
        })
        if (rows.length !== batch.length) {
          throw new Error(
            `embedding provider returned ${rows.length} embeddings for ${batch.length} texts`,
          )
        }
        const ordered = new Array<{ text: string, vector: number[] } | undefined>(batch.length)
        for (const row of rows) {
          if (typeof row.index !== 'number' || !Number.isInteger(row.index) || row.index < 0 || row.index >= batch.length)
            throw new Error(`embedding provider returned invalid embedding index (${String(row.index)})`)
          if (ordered[row.index])
            throw new Error(`embedding provider returned duplicate embedding index (${row.index})`)
          if (!isVector(row.vector, dimensions)) {
            const actualDimensions = Array.isArray(row.vector) ? row.vector.length : 'none'
            throw new Error(
              `embedding provider returned invalid vector dimensions (${actualDimensions}; expected ${dimensions})`,
            )
          }
          ordered[row.index] = {
            text: batch[row.index] ?? '',
            vector: [...row.vector],
          }
        }
        if (ordered.some(item => !item))
          throw new Error(`embedding provider returned incomplete embedding indexes for ${batch.length} texts`)
        embeddings.push(...ordered as Array<{ text: string, vector: number[] }>)
      }
      return embeddings
    },
  }
}

export function resolveOpenAICompatibleLongTermMemoryEmbeddingProvider(
  input: ResolveOpenAICompatibleLongTermMemoryEmbeddingProviderInput,
): LongTermMemoryEmbeddingProvider | null {
  const env = input.env ?? process.env
  const activeProviderId = normalizeText(input.activeProviderId, 160)
  const activeProviderConfig = activeProviderId ? input.providerCredentials[activeProviderId] ?? {} : {}
  const memoryConfig = Object.assign(
    {},
    input.providerCredentials.alicizationMemoryEmbedding,
    input.providerCredentials.__alicizationMemoryEmbedding,
  )
  const providerId = readFirstText(
    memoryConfig.providerId,
    activeProviderConfig.memoryEmbeddingProviderId,
    activeProviderConfig.embeddingProviderId,
    env.ALICIZATION_MEMORY_EMBEDDING_PROVIDER_ID,
    activeProviderId,
  )
  const providerConfig = Object.assign(
    {},
    providerId ? input.providerCredentials[providerId] : undefined,
    memoryConfig,
  )
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
