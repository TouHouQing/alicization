export interface ProviderUsage {
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  cacheReadTokens: number | null
  cacheWriteTokens: number | null
  reasoningTokens: number | null
}

function count(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

/** Provider facts only. Cached tokens are a subset of input, not extra input. */
export function readProviderUsage(raw: unknown): ProviderUsage | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const value = raw as Record<string, unknown>
  const details = value.prompt_tokens_details as Record<string, unknown> | undefined
  const output = value.completion_tokens_details as Record<string, unknown> | undefined
  const usage = {
    inputTokens: count(value.prompt_tokens ?? value.input_tokens),
    outputTokens: count(value.completion_tokens ?? value.output_tokens),
    totalTokens: count(value.total_tokens),
    cacheReadTokens: count(details?.cached_tokens ?? value.prompt_cache_hit_tokens ?? value.cached_input_tokens),
    cacheWriteTokens: count(value.cache_creation_input_tokens),
    reasoningTokens: count(output?.reasoning_tokens),
  }
  return Object.values(usage).some(item => item !== null) ? usage : null
}

/**
 * Pi/Hermes accounting semantics: sum real calls, keep missing splits unknown.
 * Repeated finish events and late telemetry share a request ID, so never count twice.
 */
export function summarizeProviderUsage(records: Array<{ requestId: string, usage: ProviderUsage | null }>) {
  const requests = [...new Map(records.map(record => [record.requestId, record.usage])).values()]
  const fields = ['inputTokens', 'outputTokens', 'totalTokens', 'cacheReadTokens', 'cacheWriteTokens', 'reasoningTokens'] as const
  const totals = Object.fromEntries(fields.map(field => [field, {
    reported: requests.filter(usage => usage?.[field] !== null && usage?.[field] !== undefined).length,
    knownSubtotal: requests.reduce((sum, usage) => sum + (usage?.[field] ?? 0), 0),
    complete: requests.every(usage => usage?.[field] !== null && usage?.[field] !== undefined),
  }]))
  return { requestCount: requests.length, usageReported: requests.filter(Boolean).length, totals }
}
