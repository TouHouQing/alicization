import { describe, expect, it, vi } from 'vitest'

import {
  parseAlicizationRetryAfterMs,
  resolveAlicizationProviderRetryDeadline,
  resolveAlicizationProviderRetryDeadlineAt,
  resolveAlicizationProviderRetryDecision,
  runWithAlicizationProviderRetry,
} from './provider-retry-policy'

function providerError(message: string, status?: number, headers?: Record<string, string>) {
  return Object.assign(new Error(message), {
    ...(status ? { status } : {}),
    ...(headers ? { headers } : {}),
  })
}

describe('provider retry policy', () => {
  it('retries five times and succeeds on the sixth attempt', async () => {
    const invoke = vi.fn()
      .mockRejectedValueOnce(providerError('service unavailable', 503))
      .mockRejectedValueOnce(providerError('service unavailable', 503))
      .mockRejectedValueOnce(providerError('service unavailable', 503))
      .mockRejectedValueOnce(providerError('service unavailable', 503))
      .mockRejectedValueOnce(providerError('service unavailable', 503))
      .mockResolvedValueOnce('ok')
    const scheduled = vi.fn()
    const started = vi.fn()

    await expect(runWithAlicizationProviderRetry<string>({
      operation: 'main-gateway-one-shot',
      invoke,
      maxRetries: 5,
      baseDelayMs: 0,
      maxDelayMs: 0,
      random: () => 0,
      sleep: vi.fn(async () => {}),
      onRetryScheduled: scheduled,
      onRetryStarted: started,
    })).resolves.toBe('ok')

    expect(invoke).toHaveBeenCalledTimes(6)
    expect(scheduled).toHaveBeenCalledTimes(5)
    expect(started).toHaveBeenCalledTimes(5)
    expect(scheduled.mock.calls[4]?.[0]).toEqual(expect.objectContaining({
      attempt: 4,
      nextAttempt: 5,
      maxRetries: 5,
    }))
  })

  it('returns the original error after the sixth failed attempt', async () => {
    const terminal = providerError('service unavailable', 503)
    const invoke = vi.fn().mockRejectedValue(terminal)
    const onRetryExhausted = vi.fn()

    await expect(runWithAlicizationProviderRetry({
      operation: 'main-chat-stream',
      invoke,
      maxRetries: 5,
      baseDelayMs: 0,
      maxDelayMs: 0,
      sleep: vi.fn(async () => {}),
      onRetryExhausted,
    })).rejects.toBe(terminal)
    expect(invoke).toHaveBeenCalledTimes(6)
    expect(onRetryExhausted).toHaveBeenCalledWith(expect.objectContaining({
      attempt: 5,
      maxRetries: 5,
      status: 503,
    }))
  })

  it.each([
    [429, 'rate limited'],
    [503, 'service unavailable'],
    [500, 'upstream failed'],
  ])('retries transient HTTP %s failures', async (status, message) => {
    const invoke = vi.fn()
      .mockRejectedValueOnce(providerError(message, status))
      .mockResolvedValueOnce('recovered')

    await expect(runWithAlicizationProviderRetry({
      operation: 'main-chat-stream',
      invoke,
      baseDelayMs: 0,
      maxDelayMs: 0,
      sleep: vi.fn(async () => {}),
    })).resolves.toBe('recovered')
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it('retries an OpenAI-compatible rate-limit error when the Provider omits HTTP status metadata', () => {
    const decision = resolveAlicizationProviderRetryDecision(
      new Error(
        'Error from server: {"error":{"message":"Upstream rate limit exceeded, please retry later","type":"rate_limit_error"}}',
      ),
      {
        attempt: 0,
        options: {
          operation: 'main-chat-stream',
          baseDelayMs: 0,
          maxDelayMs: 0,
          random: () => 0,
        },
      },
    )

    expect(decision).toEqual(expect.objectContaining({
      retry: true,
      status: 429,
      reason: 'retryable-status',
      nextAttempt: 1,
    }))
  })

  it('retries transport failures but does not retry auth or unknown failures', async () => {
    const transport = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('socket reset'), { code: 'ECONNRESET' }))
      .mockResolvedValueOnce('recovered')
    await expect(runWithAlicizationProviderRetry({
      operation: 'main-chat-stream',
      invoke: transport,
      baseDelayMs: 0,
      maxDelayMs: 0,
      sleep: vi.fn(async () => {}),
    })).resolves.toBe('recovered')

    const auth = vi.fn().mockRejectedValue(new Error('401 authentication failed'))
    await expect(runWithAlicizationProviderRetry({
      operation: 'main-chat-stream',
      invoke: auth,
      baseDelayMs: 0,
      maxDelayMs: 0,
      sleep: vi.fn(async () => {}),
    })).rejects.toThrow('401 authentication failed')
    expect(auth).toHaveBeenCalledOnce()

    const unknown = vi.fn().mockRejectedValue(new Error('unexpected application bug'))
    await expect(runWithAlicizationProviderRetry({
      operation: 'main-chat-stream',
      invoke: unknown,
      baseDelayMs: 0,
      maxDelayMs: 0,
      sleep: vi.fn(async () => {}),
    })).rejects.toThrow('unexpected application bug')
    expect(unknown).toHaveBeenCalledOnce()
  })

  it('retries an empty Provider completion when no visible progress or side effect occurred', () => {
    const decision = resolveAlicizationProviderRetryDecision(
      Object.assign(
        new Error('Provider completed without a reply or tool action'),
        {
          code: 'chat-provider-empty-completion',
        },
      ),
      {
        attempt: 0,
        options: {
          operation: 'main-chat-stream',
          baseDelayMs: 0,
          maxDelayMs: 0,
          random: () => 0,
        },
      },
    )

    expect(decision).toEqual(expect.objectContaining({
      retry: true,
      nextAttempt: 1,
      reason: 'retryable-transport',
    }))
  })

  it('keeps retry-after as a lower bound and respects the deadline', () => {
    const error = providerError('rate limited', 429, { 'retry-after': '3' })
    expect(parseAlicizationRetryAfterMs(error, 1_000)).toBe(3_000)
    expect(resolveAlicizationProviderRetryDecision(error, {
      attempt: 0,
      options: {
        operation: 'main-chat-stream',
        baseDelayMs: 500,
        maxDelayMs: 10_000,
        random: () => 0,
        now: () => 1_000,
      },
    })).toEqual(expect.objectContaining({
      retry: true,
      delayMs: 3_000,
      reason: 'retryable-status',
    }))

    expect(resolveAlicizationProviderRetryDecision(error, {
      attempt: 0,
      options: {
        operation: 'main-chat-stream',
        deadlineAt: 3_999,
        baseDelayMs: 500,
        maxDelayMs: 10_000,
        random: () => 0,
        now: () => 1_000,
      },
    }).terminalReason).toBe('deadline-exhausted')

    expect(resolveAlicizationProviderRetryDecision(error, {
      attempt: 0,
      options: {
        operation: 'main-chat-stream',
        deadlineAt: 1_000,
        baseDelayMs: 0,
        maxDelayMs: 0,
        random: () => 0,
        now: () => 1_000,
      },
    }).terminalReason).toBe('deadline-exhausted')
  })

  it('stops immediately when the outer turn is aborted during retry wait', async () => {
    const controller = new AbortController()
    let rejectSleep!: (error: unknown) => void
    const sleep = vi.fn(() => new Promise<void>((_resolve, reject) => {
      rejectSleep = reject
    }))
    const invoke = vi.fn().mockRejectedValue(providerError('service unavailable', 503))
    const pending = runWithAlicizationProviderRetry({
      operation: 'main-chat-stream',
      invoke,
      signal: controller.signal,
      baseDelayMs: 1_000,
      maxDelayMs: 1_000,
      random: () => 0,
      sleep,
    })

    await vi.waitFor(() => expect(sleep).toHaveBeenCalledOnce())
    controller.abort(new DOMException('cancelled', 'AbortError'))
    rejectSleep(controller.signal.reason)
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(invoke).toHaveBeenCalledOnce()
  })

  it('does not replay a turn after visible progress or tool side effects', async () => {
    const invoke = vi.fn().mockRejectedValue(providerError('service unavailable', 503))
    await expect(runWithAlicizationProviderRetry({
      operation: 'main-chat-stream',
      invoke,
      replayState: {
        hasVisibleProgress: true,
        hasToolCall: false,
        hasToolSideEffect: false,
      },
      baseDelayMs: 0,
      maxDelayMs: 0,
      sleep: vi.fn(async () => {}),
    })).rejects.toThrow('service unavailable')
    expect(invoke).toHaveBeenCalledOnce()
  })

  it('retries an Alicization first-event timeout when the outer turn is still active', () => {
    const decision = resolveAlicizationProviderRetryDecision(
      new DOMException(
        'Alicization runtime aborted: chat-first-event-timeout',
        'AbortError',
      ),
      {
        attempt: 0,
        options: {
          operation: 'main-chat-stream',
          baseDelayMs: 0,
          maxDelayMs: 0,
          random: () => 0,
        },
      },
    )

    expect(decision).toEqual(expect.objectContaining({
      retry: true,
      nextAttempt: 1,
      reason: 'retryable-transport',
    }))
  })

  it.each([
    'chat-provider-liveness-timeout',
    'chat-provider-idle-timeout',
  ] as const)('retries an Alicization %s when the outer turn is still active', (reason) => {
    const decision = resolveAlicizationProviderRetryDecision(
      new DOMException(
        `Alicization runtime aborted: ${reason}`,
        'AbortError',
      ),
      {
        attempt: 0,
        options: {
          operation: 'main-chat-stream',
          baseDelayMs: 0,
          maxDelayMs: 0,
          random: () => 0,
        },
      },
    )

    expect(decision).toEqual(expect.objectContaining({
      retry: true,
      nextAttempt: 1,
      reason: 'retryable-transport',
    }))
  })

  it('treats an internal retry-deadline abort as deadline exhaustion', () => {
    const decision = resolveAlicizationProviderRetryDecision(
      new DOMException(
        'Alicization runtime aborted: chat-provider-retry-deadline',
        'AbortError',
      ),
      {
        attempt: 0,
        options: {
          operation: 'main-chat-stream',
          deadlineAt: 1_000,
          now: () => 1_000,
        },
      },
    )

    expect(decision).toEqual(expect.objectContaining({
      retry: false,
      terminalReason: 'deadline-exhausted',
    }))
  })

  it('keeps a user abort terminal even when its message contains timeout text', () => {
    const controller = new AbortController()
    const reason = new DOMException(
      'Alicization runtime aborted: chat-first-event-timeout',
      'AbortError',
    )
    controller.abort(reason)

    const decision = resolveAlicizationProviderRetryDecision(reason, {
      attempt: 0,
      options: {
        operation: 'main-chat-stream',
        signal: controller.signal,
        baseDelayMs: 0,
        maxDelayMs: 0,
      },
    })

    expect(decision).toEqual(expect.objectContaining({
      retry: false,
      terminalReason: 'abort',
    }))
  })

  it('allows the full default retry budget for a standard chat timeout window', () => {
    const decision = resolveAlicizationProviderRetryDecision(
      new DOMException(
        'Alicization runtime aborted: chat-first-event-timeout',
        'AbortError',
      ),
      {
        attempt: 4,
        options: {
          operation: 'main-chat-stream',
          deadlineAt: 100_000,
          now: () => 10_000,
          baseDelayMs: 500,
          maxDelayMs: 10_000,
          random: () => 0,
        },
      },
    )

    expect(decision.retry).toBe(true)
    expect(decision.nextAttempt).toBe(5)
  })

  it('keeps five retries available without multiplying the user-visible timeout by six', () => {
    expect(resolveAlicizationProviderRetryDeadlineAt({
      now: () => 1_000,
      timeoutMs: 18_000,
      baseDelayMs: 500,
      maxDelayMs: 10_000,
      maxRetries: 5,
    })).toBe(121_000)
  })

  it('preserves an explicit null deadline as disabled instead of restoring the default window', () => {
    expect(resolveAlicizationProviderRetryDeadline({
      now: () => 1_000,
      deadlineAt: null,
      timeoutMs: 18_000,
      maxRetries: 5,
    })).toBeNull()
    expect(resolveAlicizationProviderRetryDeadline({
      now: () => 1_000,
      deadlineAt: 42_000,
      timeoutMs: 18_000,
      maxRetries: 5,
    })).toBe(42_000)
  })

  it('caps long Provider retry sessions at two minutes', () => {
    expect(resolveAlicizationProviderRetryDeadlineAt({
      now: () => 1_000,
      timeoutMs: 90_000,
      baseDelayMs: 500,
      maxDelayMs: 10_000,
      maxRetries: 5,
    })).toBe(121_000)
  })
})
