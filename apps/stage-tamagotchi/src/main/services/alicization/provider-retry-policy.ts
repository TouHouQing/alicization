import {
  extractAlicizationProviderRequestFailure,
  isAlicizationToolExecutionFailureResult,
} from '@proj-alicization/stage-shared'

import { resolveAlicizationRuntimeTimeoutReason } from './turn-os/runtime-errors'

export const alicizationProviderRetryDefaults = {
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  maxRetries: 5,
  maxTotalRetryWindowMs: 120_000,
} as const

const retryableStatuses = new Set([408, 409, 429, 500, 502, 503, 504])
const retryableErrorCodes = new Set([
  'ECONNRESET',
  'EPIPE',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
])

export type AlicizationProviderRetryOperation
  = | 'main-chat-stream'
    | 'main-gateway-one-shot'

export interface AlicizationProviderRetryReplayState {
  hasToolCall?: boolean
  hasToolSideEffect?: boolean
  hasVisibleProgress?: boolean
}

export interface AlicizationProviderRetryContext extends AlicizationProviderRetryReplayState {
  attempt: number
  error: unknown
  maxRetries: number
  nextAttempt: number
  operation: AlicizationProviderRetryOperation
  status: number | null
  delayMs: number
  reason: 'retryable-status' | 'retryable-transport'
}

export interface AlicizationProviderRetryDecision {
  attempt: number
  delayMs: number
  nextAttempt: number
  reason: AlicizationProviderRetryContext['reason'] | null
  retry: boolean
  status: number | null
  terminalReason:
    | 'abort'
    | 'deadline-exhausted'
    | 'non-retryable'
    | 'replay-unsafe'
    | 'retry-budget-exhausted'
    | null
}

export interface AlicizationProviderRetryOptions {
  baseDelayMs?: number
  deadlineAt?: number | null
  maxDelayMs?: number
  maxRetries?: number
  maxTotalRetryWindowMs?: number
  now?: () => number
  operation: AlicizationProviderRetryOperation
  random?: () => number
  replayState?: AlicizationProviderRetryReplayState | (() => AlicizationProviderRetryReplayState)
  signal?: AbortSignal
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>
  onRetryExhausted?: (input: {
    attempt: number
    error: unknown
    maxRetries: number
    operation: AlicizationProviderRetryOperation
    status: number | null
  }) => void | Promise<void>
  onRetryScheduled?: (context: AlicizationProviderRetryContext) => void | Promise<void>
  onRetryStarted?: (context: AlicizationProviderRetryContext) => void | Promise<void>
}

export type AlicizationProviderRetryOverrides = Pick<
  AlicizationProviderRetryOptions,
  'baseDelayMs' | 'deadlineAt' | 'maxDelayMs' | 'maxRetries' | 'maxTotalRetryWindowMs' | 'now' | 'random' | 'sleep'
>

export interface RunAlicizationProviderRetryOptions extends AlicizationProviderRetryOptions {
  invoke: (input: {
    attempt: number
    signal?: AbortSignal
  }) => Promise<unknown>
}

function normalizeNonNegativeFiniteInteger(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return fallback
  return Math.max(0, Math.floor(value))
}

function normalizeDelay(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return fallback
  return Math.max(0, Math.floor(value))
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error)
    return error.message
  if (typeof error === 'string')
    return error
  if (error && typeof error === 'object' && 'message' in error)
    return String((error as { message?: unknown }).message ?? '')
  return String(error ?? '')
}

function readErrorCode(error: unknown) {
  if (!error || typeof error !== 'object')
    return ''
  const record = error as Record<string, unknown>
  return String(record.code ?? record.errorCode ?? record.type ?? '').trim().toUpperCase()
}

function readErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object')
    return null
  const record = error as Record<string, unknown>
  const status = Number(record.status ?? record.statusCode)
  return Number.isInteger(status) && status >= 400 && status <= 599
    ? status
    : null
}

function isProviderTimeoutMessage(message: string) {
  return /\b(?:request|connect|headers?|socket|stream|idle|liveness|first[-\s]?event|continuation)[-\s]*(?:timeout|timed\s*out)\b|(?:timeout|timed\s*out)\s*(?:waiting|while|during|reading|connecting|requesting)/iu.test(message)
}

function isAbortError(error: unknown, signal?: AbortSignal) {
  if (signal?.aborted)
    return true

  if (!error || typeof error !== 'object')
    return false
  const record = error as Record<string, unknown>
  const name = String(record.name ?? '').trim().toLowerCase()
  const code = String(record.code ?? '').trim().toUpperCase()
  if (name === 'aborterror' || code === 'ABORT_ERR') {
    return !isProviderTimeoutMessage(readErrorMessage(error))
      && !resolveAlicizationRuntimeTimeoutReason(error)
      && !isRetryableLocalAlicizationTimeout(readErrorMessage(error))
  }
  return false
}

function isLocalAlicizationTimeout(message: string) {
  return /\b(?:chat|main-gateway)-(?:first-event|provider-liveness|provider-idle|provider-continuation|tool-result-handoff|preparation|retry-deadline|attempt-timeout|timeout|aborted)\b/iu.test(message)
}

function isRetryableLocalAlicizationTimeout(message: string) {
  return /\b(?:chat-first-event-timeout|chat-provider-liveness-timeout|chat-provider-idle-timeout|chat-provider-continuation-timeout|chat-tool-result-handoff-timeout|chat-preparation-timeout|chat-provider-retry-deadline|main-gateway-(?:attempt-timeout|timeout-recovery|visual-one-shot-timeout|timeout))\b/iu.test(message)
}

function isToolExecutionFailure(error: unknown) {
  if (isAlicizationToolExecutionFailureResult(error))
    return true
  if (!error || typeof error !== 'object')
    return false
  const record = error as Record<string, unknown>
  return record.failureKind === 'tool-execution'
    || String(record.name ?? '').toLowerCase() === 'alicizationtoolexecutionerror'
}

function isNonRetryableProviderMessage(message: string, code: string) {
  return /invalid[_ -]?request|authentication|unauthorized|forbidden|permission denied|model\s+(?:not found|unavailable)|schema|tools?\s*(?:not supported|unsupported|invalid)|unsupported.*tool/iu.test(`${code} ${message}`)
}

function isRetryableTransportError(message: string, code: string) {
  if (retryableErrorCodes.has(code))
    return true
  if (isRetryableLocalAlicizationTimeout(message))
    return true
  if (isLocalAlicizationTimeout(message))
    return false
  return /connection\s+reset|broken\s+pipe|unexpected\s+eof|socket\s+(?:closed|hang\s*up)|network\s+error|fetch\s+failed|dns\s+(?:lookup|error)|name\s+resolution|stream\s+disconnected/iu.test(message)
    || isProviderTimeoutMessage(message)
}

function readHeaders(error: unknown): Record<string, unknown> | Headers | null {
  if (!error || typeof error !== 'object')
    return null
  const record = error as Record<string, unknown>
  const response = record.response && typeof record.response === 'object'
    ? record.response as Record<string, unknown>
    : null
  const headers = record.headers ?? response?.headers
  if (headers instanceof Headers)
    return headers
  return headers && typeof headers === 'object'
    ? headers as Record<string, unknown>
    : null
}

function readRetryAfterRaw(error: unknown) {
  const headers = readHeaders(error)
  if (!headers)
    return null

  if (headers instanceof Headers)
    return headers.get('retry-after')

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== 'retry-after')
      continue
    return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
  }
  return null
}

export function parseAlicizationRetryAfterMs(
  error: unknown,
  now = Date.now(),
) {
  const raw = readRetryAfterRaw(error)?.trim()
  if (!raw)
    return null

  if (/^\d+(?:\.\d+)?$/u.test(raw))
    return Math.max(0, Math.ceil(Number(raw) * 1_000))

  const timestamp = Date.parse(raw)
  if (!Number.isFinite(timestamp))
    return null
  return Math.max(0, timestamp - now)
}

function resolveStatus(error: unknown) {
  const directStatus = readErrorStatus(error)
  if (directStatus !== null)
    return directStatus
  return extractAlicizationProviderRequestFailure(error)?.status ?? null
}

function resolveReplayState(
  replayState: AlicizationProviderRetryOptions['replayState'],
) {
  return typeof replayState === 'function'
    ? replayState()
    : replayState ?? {}
}

function resolveJitteredDelay(input: {
  baseDelayMs: number
  maxDelayMs: number
  random: () => number
  retryAfterMs: number | null
  retryIndex: number
}) {
  const exponentialCap = Math.min(
    input.maxDelayMs,
    input.baseDelayMs * (2 ** Math.max(0, input.retryIndex)),
  )
  const lowerBound = Math.min(input.maxDelayMs, Math.max(0, input.retryAfterMs ?? 0))
  const upperBound = Math.max(lowerBound, exponentialCap)
  const normalizedRandom = Math.min(1, Math.max(0, input.random()))
  return Math.floor(lowerBound + ((upperBound - lowerBound) * normalizedRandom))
}

export function resolveAlicizationProviderRetryDecision(
  error: unknown,
  input: {
    attempt: number
    options: AlicizationProviderRetryOptions
  },
): AlicizationProviderRetryDecision {
  const options = input.options
  const now = options.now?.() ?? Date.now()
  const maxRetries = normalizeNonNegativeFiniteInteger(
    options.maxRetries,
    alicizationProviderRetryDefaults.maxRetries,
  )
  const attempt = Math.max(0, Math.floor(input.attempt))
  const nextAttempt = attempt + 1
  const status = resolveStatus(error)
  const replayState = resolveReplayState(options.replayState)

  if (isAbortError(error, options.signal)) {
    return {
      attempt,
      delayMs: 0,
      nextAttempt,
      reason: null,
      retry: false,
      status,
      terminalReason: 'abort',
    }
  }

  if (
    replayState.hasVisibleProgress
    || replayState.hasToolCall
    || replayState.hasToolSideEffect
    || isToolExecutionFailure(error)
  ) {
    return {
      attempt,
      delayMs: 0,
      nextAttempt,
      reason: null,
      retry: false,
      status,
      terminalReason: 'replay-unsafe',
    }
  }

  const message = readErrorMessage(error)
  const code = readErrorCode(error)
  const retryableStatus = status !== null && retryableStatuses.has(status)
  const retryableTransport = isRetryableTransportError(message, code)
  if (isNonRetryableProviderMessage(message, code) && !retryableStatus) {
    return {
      attempt,
      delayMs: 0,
      nextAttempt,
      reason: null,
      retry: false,
      status,
      terminalReason: 'non-retryable',
    }
  }

  if (!retryableStatus && !retryableTransport) {
    return {
      attempt,
      delayMs: 0,
      nextAttempt,
      reason: null,
      retry: false,
      status,
      terminalReason: 'non-retryable',
    }
  }

  if (attempt >= maxRetries) {
    return {
      attempt,
      delayMs: 0,
      nextAttempt,
      reason: null,
      retry: false,
      status,
      terminalReason: 'retry-budget-exhausted',
    }
  }

  const baseDelayMs = normalizeDelay(
    options.baseDelayMs,
    alicizationProviderRetryDefaults.baseDelayMs,
  )
  const maxDelayMs = Math.max(
    baseDelayMs,
    normalizeDelay(options.maxDelayMs, alicizationProviderRetryDefaults.maxDelayMs),
  )
  const delayMs = resolveJitteredDelay({
    baseDelayMs,
    maxDelayMs,
    random: options.random ?? Math.random,
    retryAfterMs: parseAlicizationRetryAfterMs(error, now),
    retryIndex: attempt,
  })
  if (options.deadlineAt !== null && options.deadlineAt !== undefined) {
    const remainingMs = Math.max(0, options.deadlineAt - now)
    if (remainingMs <= 0 || remainingMs < delayMs) {
      return {
        attempt,
        delayMs,
        nextAttempt,
        reason: null,
        retry: false,
        status,
        terminalReason: 'deadline-exhausted',
      }
    }
  }

  return {
    attempt,
    delayMs,
    nextAttempt,
    reason: retryableStatus ? 'retryable-status' : 'retryable-transport',
    retry: true,
    status,
    terminalReason: null,
  }
}

export function resolveAlicizationProviderRetryDeadlineAt(input: {
  baseDelayMs?: number
  maxDelayMs?: number
  maxRetries?: number
  maxTotalRetryWindowMs?: number
  now?: () => number
  timeoutMs: number
}) {
  const maxRetries = normalizeNonNegativeFiniteInteger(
    input.maxRetries,
    alicizationProviderRetryDefaults.maxRetries,
  )
  const timeoutMs = Math.max(1_000, Math.floor(input.timeoutMs))
  const baseDelayMs = normalizeDelay(
    input.baseDelayMs,
    alicizationProviderRetryDefaults.baseDelayMs,
  )
  const maxDelayMs = Math.max(
    baseDelayMs,
    normalizeDelay(input.maxDelayMs, alicizationProviderRetryDefaults.maxDelayMs),
  )
  let retryDelayBudgetMs = 0
  for (let retryIndex = 0; retryIndex < maxRetries; retryIndex += 1) {
    retryDelayBudgetMs += Math.min(
      maxDelayMs,
      baseDelayMs * (2 ** retryIndex),
    )
  }

  const uncappedWindowMs = (timeoutMs * (maxRetries + 1)) + retryDelayBudgetMs
  const maxTotalRetryWindowMs = Math.max(
    timeoutMs,
    normalizeDelay(
      input.maxTotalRetryWindowMs,
      alicizationProviderRetryDefaults.maxTotalRetryWindowMs,
    ),
  )

  return (input.now?.() ?? Date.now())
    + Math.min(uncappedWindowMs, maxTotalRetryWindowMs)
}

export function resolveAlicizationProviderRetryDeadline(
  input: {
    deadlineAt?: number | null
    baseDelayMs?: number
    maxDelayMs?: number
    maxRetries?: number
    maxTotalRetryWindowMs?: number
    now?: () => number
    timeoutMs: number
  },
) {
  if (input.deadlineAt === null)
    return null
  if (input.deadlineAt !== undefined)
    return input.deadlineAt

  return resolveAlicizationProviderRetryDeadlineAt(input)
}

function sleepWithAlicizationAbort(delayMs: number, signal?: AbortSignal) {
  if (signal?.aborted)
    return Promise.reject(signal.reason ?? new DOMException('Alicization runtime aborted', 'AbortError'))
  if (delayMs <= 0)
    return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    let settled = false
    let onAbort = () => {}
    const timeout = setTimeout(() => {
      if (settled)
        return
      settled = true
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)
    const cleanup = () => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
    }
    onAbort = () => {
      if (settled)
        return
      settled = true
      cleanup()
      reject(signal?.reason ?? new DOMException('Alicization runtime aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export async function waitForAlicizationProviderRetry(input: {
  delayMs: number
  signal?: AbortSignal
  sleep?: AlicizationProviderRetryOptions['sleep']
}) {
  await (input.sleep ?? sleepWithAlicizationAbort)(input.delayMs, input.signal)
  if (input.signal?.aborted)
    throw input.signal.reason ?? new DOMException('Alicization runtime aborted', 'AbortError')
}

export async function runWithAlicizationProviderRetry<T>(
  options: RunAlicizationProviderRetryOptions,
) {
  const maxRetries = normalizeNonNegativeFiniteInteger(
    options.maxRetries,
    alicizationProviderRetryDefaults.maxRetries,
  )
  let attempt = 0
  while (true) {
    if (options.signal?.aborted)
      throw options.signal.reason ?? new DOMException('Alicization runtime aborted', 'AbortError')

    try {
      return await options.invoke({
        attempt,
        signal: options.signal,
      }) as T
    }
    catch (error) {
      const decision = resolveAlicizationProviderRetryDecision(error, {
        attempt,
        options: {
          ...options,
          maxRetries,
        },
      })
      if (!decision.retry) {
        if (decision.terminalReason === 'retry-budget-exhausted') {
          await options.onRetryExhausted?.({
            attempt,
            error,
            maxRetries,
            operation: options.operation,
            status: decision.status,
          })
        }
        throw error
      }

      const context: AlicizationProviderRetryContext = {
        ...resolveReplayState(options.replayState),
        attempt,
        error,
        maxRetries,
        nextAttempt: decision.nextAttempt,
        operation: options.operation,
        status: decision.status,
        delayMs: decision.delayMs,
        reason: decision.reason!,
      }
      await options.onRetryScheduled?.(context)
      await waitForAlicizationProviderRetry({
        delayMs: decision.delayMs,
        signal: options.signal,
        sleep: options.sleep,
      })
      await options.onRetryStarted?.(context)
      attempt = decision.nextAttempt
    }
  }
}
