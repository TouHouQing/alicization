export interface MemorySemanticScaleSearchQueryObservation {
  id: string
  expectedTopIds: string[]
  returnedIds: string[]
  forbiddenIds?: string[]
  latencyMs: number
}

export interface MemorySemanticScaleSearchObservation {
  id: string
  corpusSize: number
  indexMode: 'sqlite-vec' | 'hnsw' | 'ann' | 'brute-force'
  approximate: boolean
  degraded: boolean
  nativeIndexReady: boolean
  coverageRatio: number
  queries: MemorySemanticScaleSearchQueryObservation[]
}

export interface MemorySemanticScaleProviderDegradationObservation {
  id: string
  providerError: string | null
  lexicalFallbackIds: string[]
  expectedTopIds: string[]
  errorVisible: boolean
}

export interface MemorySemanticScaleReindexObservation {
  previous: {
    modelId: string
    dimensions: number
    vectorSpaceId: string
  }
  active: {
    modelId: string
    dimensions: number
    vectorSpaceId: string
  }
  reindexRequired: boolean
  progress: {
    total: number
    indexed: number
    retryable: number
    deadLettered: number
    cancelled: number
    status: 'queued' | 'running' | 'cancel_requested' | 'completed' | 'cancelled' | 'failed'
    lastError: string | null
  }
  observations: {
    cancellationObserved: boolean
    retryObserved: boolean
    deadLetterObserved: boolean
    crashRecoveryObserved: boolean
  }
}

export interface MemorySemanticScaleSearchMetrics {
  id: string
  corpusSize: number
  indexMode: MemorySemanticScaleSearchObservation['indexMode']
  approximate: boolean
  degraded: boolean
  nativeIndexReady: boolean
  coverageRatio: number
  queryCount: number
  p95LatencyMs: number
  p99LatencyMs: number
  recallAtK: number
  falseRecallRate: number
  passed: boolean
  failures: string[]
}

export interface MemorySemanticScaleProviderDegradationResult {
  id: string
  providerError: string | null
  fallbackRecallAtK: number
  errorVisible: boolean
  passed: boolean
  failures: string[]
}

export interface MemorySemanticScaleReindexResult {
  reindexRequired: boolean
  modelSpaceChanged: boolean
  progress: MemorySemanticScaleReindexObservation['progress']
  observations: MemorySemanticScaleReindexObservation['observations']
  passed: boolean
  failures: string[]
}

export interface MemorySemanticScaleSoakReport {
  version: 'memory-semantic-scale-soak-harness-v1'
  id: string
  createdAt: number
  passed: boolean
  summary: {
    corpusSize: number
    queryCount: number
    p95LatencyMs: number
    p99LatencyMs: number
    recallAtK: number
    falseRecallRate: number
    coverageRatio: number
    failingChecks: string[]
  }
  searchMetrics: MemorySemanticScaleSearchMetrics[]
  providerDegradation: MemorySemanticScaleProviderDegradationResult | null
  reindex: MemorySemanticScaleReindexResult | null
  recommendedNextActions: string[]
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0)
    return 0
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1)
  return sorted[Math.max(0, index)] ?? 0
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? clamp01(numerator / denominator) : 1
}

function evaluateSearch(input: {
  observation: MemorySemanticScaleSearchObservation
  minimumCorpusSize: number
  maxP95LatencyMs: number
  maxP99LatencyMs: number
  minimumCoverageRatio: number
}): MemorySemanticScaleSearchMetrics {
  const observation = input.observation
  const queries = observation.queries
  const expectedCount = queries.reduce((sum, query) => sum + query.expectedTopIds.length, 0)
  const hitCount = queries.reduce((sum, query) => {
    const returned = new Set(query.returnedIds)
    return sum + query.expectedTopIds.filter(id => returned.has(id)).length
  }, 0)
  const forbiddenCount = queries.reduce((sum, query) => {
    const returned = new Set(query.returnedIds)
    return sum + (query.forbiddenIds ?? []).filter(id => returned.has(id)).length
  }, 0)
  const latencies = queries.map(query => Math.max(0, Number(query.latencyMs) || 0))
  const p95LatencyMs = percentile(latencies, 0.95)
  const p99LatencyMs = percentile(latencies, 0.99)
  const recallAtK = ratio(hitCount, expectedCount)
  const falseRecallRate = ratio(forbiddenCount, queries.reduce((sum, query) => sum + query.returnedIds.length, 0))
  const failures = [
    observation.corpusSize < input.minimumCorpusSize ? 'corpus-below-scale-target' : null,
    observation.indexMode === 'brute-force' || observation.degraded || !observation.nativeIndexReady
      ? 'index-mode-degraded'
      : null,
    observation.coverageRatio < input.minimumCoverageRatio ? 'coverage-too-low' : null,
    p95LatencyMs > input.maxP95LatencyMs ? 'latency-p95-too-high' : null,
    p99LatencyMs > input.maxP99LatencyMs ? 'latency-p99-too-high' : null,
    recallAtK < 1 ? 'semantic-recall-miss' : null,
    falseRecallRate > 0 ? 'semantic-false-recall' : null,
  ].filter(Boolean) as string[]

  return {
    id: observation.id,
    corpusSize: observation.corpusSize,
    indexMode: observation.indexMode,
    approximate: observation.approximate,
    degraded: observation.degraded,
    nativeIndexReady: observation.nativeIndexReady,
    coverageRatio: observation.coverageRatio,
    queryCount: queries.length,
    p95LatencyMs,
    p99LatencyMs,
    recallAtK,
    falseRecallRate,
    passed: failures.length === 0,
    failures,
  }
}

function evaluateProviderDegradation(input: MemorySemanticScaleProviderDegradationObservation) {
  const fallback = new Set(input.lexicalFallbackIds)
  const hitCount = input.expectedTopIds.filter(id => fallback.has(id)).length
  const fallbackRecallAtK = ratio(hitCount, input.expectedTopIds.length)
  const failures = [
    input.providerError ? null : 'provider-error-not-recorded',
    input.errorVisible ? null : 'provider-error-not-visible',
    fallbackRecallAtK < 1 ? 'lexical-fallback-recall-miss' : null,
  ].filter(Boolean) as string[]
  return {
    id: input.id,
    providerError: input.providerError,
    fallbackRecallAtK,
    errorVisible: input.errorVisible,
    passed: failures.length === 0,
    failures,
  } satisfies MemorySemanticScaleProviderDegradationResult
}

function evaluateReindex(input: MemorySemanticScaleReindexObservation) {
  const modelSpaceChanged = input.previous.modelId !== input.active.modelId
    || input.previous.dimensions !== input.active.dimensions
    || input.previous.vectorSpaceId !== input.active.vectorSpaceId
  const failures = [
    modelSpaceChanged && !input.reindexRequired ? 'model-switch-reindex-missing' : null,
    !input.observations.cancellationObserved
    || !input.observations.retryObserved
    || !input.observations.deadLetterObserved
    || !input.observations.crashRecoveryObserved
      ? 'reindex-recovery-observation-missing'
      : null,
    input.progress.deadLettered > 0 && !input.progress.lastError ? 'dead-letter-error-hidden' : null,
  ].filter(Boolean) as string[]
  return {
    reindexRequired: input.reindexRequired,
    modelSpaceChanged,
    progress: input.progress,
    observations: input.observations,
    passed: failures.length === 0,
    failures,
  } satisfies MemorySemanticScaleReindexResult
}

export function runMemorySemanticScaleSoakHarness(input: {
  id: string
  createdAt: number
  searches: MemorySemanticScaleSearchObservation[]
  minimumCorpusSize?: number
  maxP95LatencyMs?: number
  maxP99LatencyMs?: number
  minimumCoverageRatio?: number
  providerDegradation?: MemorySemanticScaleProviderDegradationObservation
  reindex?: MemorySemanticScaleReindexObservation
}): MemorySemanticScaleSoakReport {
  const minimumCorpusSize = Math.max(1, Math.floor(input.minimumCorpusSize ?? 10_000))
  const maxP95LatencyMs = Math.max(0, Number(input.maxP95LatencyMs ?? 250))
  const maxP99LatencyMs = Math.max(maxP95LatencyMs, Number(input.maxP99LatencyMs ?? 500))
  const minimumCoverageRatio = clamp01(Number(input.minimumCoverageRatio ?? 0.999))
  const searchMetrics = input.searches.map(search => evaluateSearch({
    observation: search,
    minimumCorpusSize,
    maxP95LatencyMs,
    maxP99LatencyMs,
    minimumCoverageRatio,
  }))
  const providerDegradation = input.providerDegradation
    ? evaluateProviderDegradation(input.providerDegradation)
    : null
  const reindex = input.reindex ? evaluateReindex(input.reindex) : null
  const failingChecks = [
    ...searchMetrics.flatMap(metric => metric.failures),
    ...(providerDegradation?.failures ?? []),
    ...(reindex?.failures ?? []),
  ]
  const queryCount = searchMetrics.reduce((sum, metric) => sum + metric.queryCount, 0)
  const totalExpected = searchMetrics.reduce((sum, metric) => sum + metric.queryCount * metric.recallAtK, 0)
  const corpusSize = searchMetrics.reduce((max, metric) => Math.max(max, metric.corpusSize), 0)
  const coverageRatio = searchMetrics.length === 0
    ? 0
    : Math.min(...searchMetrics.map(metric => metric.coverageRatio))
  const p95LatencyMs = searchMetrics.length === 0
    ? 0
    : Math.max(...searchMetrics.map(metric => metric.p95LatencyMs))
  const p99LatencyMs = searchMetrics.length === 0
    ? 0
    : Math.max(...searchMetrics.map(metric => metric.p99LatencyMs))
  const recallAtK = queryCount === 0 ? 1 : totalExpected / queryCount
  const falseRecallRate = searchMetrics.length === 0
    ? 0
    : Math.max(...searchMetrics.map(metric => metric.falseRecallRate))

  const recommendedNextActions = [
    failingChecks.includes('index-mode-degraded') || failingChecks.includes('coverage-too-low')
      ? '检查 sqlite-vec/native index 是否初始化、重建并与 canonical vector coverage 对齐。'
      : null,
    failingChecks.some(check => check.startsWith('latency-p'))
      ? '检查批量 embedding、sqlite-vec kNN 查询和 DB 写队列，记录真实 p95/p99。'
      : null,
    failingChecks.includes('semantic-recall-miss') || failingChecks.includes('semantic-false-recall')
      ? '检查 vectorSpace、card scope、tombstone 过滤和 semantic rank trace。'
      : null,
    failingChecks.includes('provider-error-not-visible') || failingChecks.includes('lexical-fallback-recall-miss')
      ? 'Provider 失败时保留错误来源并明确标记 lexical fallback，不要伪装成正常语义召回。'
      : null,
    failingChecks.some(check => check.includes('reindex'))
      ? 'embedding model/dimensions/vectorSpace 变化后必须进入异步 reindex，并展示进度、重试和恢复状态。'
      : null,
  ].filter(Boolean) as string[]

  return {
    version: 'memory-semantic-scale-soak-harness-v1',
    id: input.id,
    createdAt: input.createdAt,
    passed: failingChecks.length === 0,
    summary: {
      corpusSize,
      queryCount,
      p95LatencyMs,
      p99LatencyMs,
      recallAtK,
      falseRecallRate,
      coverageRatio,
      failingChecks: [...new Set(failingChecks)],
    },
    searchMetrics,
    providerDegradation,
    reindex,
    recommendedNextActions,
  }
}
