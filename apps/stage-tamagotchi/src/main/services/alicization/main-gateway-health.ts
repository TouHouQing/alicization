export const mainGatewayReachabilityProbeTimeoutMs = 3_500
export const mainGatewayReachabilitySuccessTtlMs = 60_000
export const mainGatewayReachabilityFailureTtlMs = 60_000
export const mainGatewayChatTimeoutFailureCode = 'CHAT_TIMEOUT'
export const mainGatewayChatTimeoutFailureTtlMs = 8_000

export interface AlicizationMainGatewayHealthCacheEntry {
  reachable: boolean
  checkedAt: number
  expiresAt: number
  code?: string
  reason?: string
}

export interface AlicizationMainGatewayReachabilityResult {
  reachable: boolean
  code?: string
  reason?: string
  status?: number
}

export interface AlicizationMainGatewayReachabilitySnapshot extends AlicizationMainGatewayReachabilityResult {
  cached?: boolean
  formattedReason?: string
}

export function createAlicizationMainGatewayChatTimeoutResult(reason?: unknown): AlicizationMainGatewayReachabilityResult {
  return {
    reachable: false,
    code: mainGatewayChatTimeoutFailureCode,
    reason: sanitizeFailureText(reason) || 'Chat completions timed out before the first event.',
  }
}

interface ProbeAlicizationMainGatewayReachabilityInput {
  baseUrl: string
  headers?: Record<string, string>
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

function normalizeBaseUrl(raw: string) {
  return raw.endsWith('/') ? raw : `${raw}/`
}

function sanitizeFailureText(raw: unknown) {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
}

function buildProbeUrl(baseUrl: string) {
  try {
    return new URL('models', normalizeBaseUrl(baseUrl)).toString()
  }
  catch {
    return `${baseUrl.replace(/\/+$/, '')}/models`
  }
}

function normalizeProbeFailure(error: unknown): AlicizationMainGatewayReachabilityResult {
  const cause = (
    typeof error === 'object'
    && error !== null
    && 'cause' in error
  )
    ? (error as { cause?: unknown }).cause
    : undefined
  const errorCode = (
    typeof error === 'object'
    && error !== null
    && 'code' in error
  )
    ? (error as { code?: unknown }).code
    : undefined
  const causeCode = (
    typeof cause === 'object'
    && cause !== null
    && 'code' in cause
  )
    ? (cause as { code?: unknown }).code
    : undefined
  const rawCode = String(causeCode ?? errorCode ?? '').trim().toUpperCase()
  const isAbortError = (
    error instanceof Error
    && error.name === 'AbortError'
  ) || (
    typeof cause === 'object'
    && cause !== null
    && 'name' in cause
    && String((cause as { name?: unknown }).name) === 'AbortError'
  )

  return {
    reachable: false,
    code: isAbortError
      ? 'TIMEOUT'
      : rawCode || 'UNKNOWN',
    reason: sanitizeFailureText(
      (typeof cause === 'object' && cause !== null && 'message' in cause
        ? (cause as { message?: unknown }).message
        : undefined)
      ?? (error instanceof Error ? error.message : error),
    ) || 'gateway health probe failed',
  }
}

export function buildAlicizationMainGatewayHealthCacheKey(baseUrl: string) {
  return normalizeBaseUrl(String(baseUrl ?? '').trim())
}

export function readAlicizationMainGatewayHealthCache(
  cache: Map<string, AlicizationMainGatewayHealthCacheEntry>,
  baseUrl: string,
  now = Date.now(),
) {
  const key = buildAlicizationMainGatewayHealthCacheKey(baseUrl)
  const cached = cache.get(key)
  if (!cached)
    return null
  if (cached.expiresAt <= now) {
    cache.delete(key)
    return null
  }
  return cached
}

export function writeAlicizationMainGatewayHealthCache(
  cache: Map<string, AlicizationMainGatewayHealthCacheEntry>,
  baseUrl: string,
  result: AlicizationMainGatewayReachabilityResult,
  now = Date.now(),
  options?: {
    successTtlMs?: number
    failureTtlMs?: number
  },
) {
  const key = buildAlicizationMainGatewayHealthCacheKey(baseUrl)
  cache.set(key, {
    reachable: result.reachable,
    checkedAt: now,
    expiresAt: now + (result.reachable
      ? options?.successTtlMs ?? mainGatewayReachabilitySuccessTtlMs
      : options?.failureTtlMs ?? mainGatewayReachabilityFailureTtlMs),
    code: result.code,
    reason: result.reason,
  })
}

export function formatAlicizationMainGatewayHealthFailure(baseUrl: string, result: AlicizationMainGatewayReachabilityResult) {
  let host = baseUrl
  try {
    host = new URL(normalizeBaseUrl(baseUrl)).host || baseUrl
  }
  catch {
  }

  const normalizedCode = String(result.code ?? '').trim().toUpperCase()
  const suffix = normalizedCode
    ? ` (${normalizedCode.toLowerCase()})`
    : ''
  const detail = result.reason
    ? ` ${result.reason}`
    : ''

  if (normalizedCode === mainGatewayChatTimeoutFailureCode) {
    return `Main gateway health check failed for ${host}${suffix}.${detail || ' Chat completions timed out before the first event.'}`.trim()
  }

  return `Main gateway connectivity check failed for ${host}${suffix}.${detail}`.trim()
}

export async function probeAlicizationMainGatewayReachability(
  input: ProbeAlicizationMainGatewayReachabilityInput,
): Promise<AlicizationMainGatewayReachabilityResult> {
  const fetchImpl = input.fetchImpl ?? fetch
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    if (!controller.signal.aborted)
      controller.abort()
  }, Math.max(250, input.timeoutMs ?? mainGatewayReachabilityProbeTimeoutMs))

  try {
    const response = await fetchImpl(buildProbeUrl(input.baseUrl), {
      method: 'GET',
      headers: input.headers,
      signal: controller.signal,
    })
    return {
      reachable: true,
      status: response.status,
    }
  }
  catch (error) {
    return normalizeProbeFailure(error)
  }
  finally {
    clearTimeout(timeout)
  }
}
