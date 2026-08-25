import type { AlicizationRuntimeTimeoutReason } from './runtime-errors'

import { describe, expect, it } from 'vitest'

import {
  createAlicizationRendererWatchdogAbortError,
  createAlicizationRuntimeAbortError,
  resolveAlicizationRuntimeTimeoutReason,
} from './runtime-errors'

const runtimeTimeoutReasons = [
  'chat-first-event-timeout',
  'chat-preparation-timeout',
  'chat-provider-liveness-timeout',
  'chat-provider-idle-timeout',
  'chat-provider-continuation-timeout',
  'chat-provider-retry-deadline',
  'chat-tool-result-handoff-timeout',
  'main-gateway-attempt-timeout',
  'main-gateway-timeout',
  'main-gateway-timeout-recovery',
  'main-gateway-visual-one-shot-timeout',
] as const satisfies readonly AlicizationRuntimeTimeoutReason[]

describe('alicization runtime errors', () => {
  it.each(runtimeTimeoutReasons)(
    'resolves the structured runtime watchdog timeout reason %s',
    (timeoutReason) => {
      const error = Object.assign(new Error(`watchdog stopped: ${timeoutReason}`), {
        errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
        timeoutOrigin: 'runtime-watchdog',
        timeoutReason,
      })

      expect(resolveAlicizationRuntimeTimeoutReason(error)).toBe(timeoutReason)
    },
  )

  it('does not infer a runtime watchdog timeout from ordinary error text', () => {
    const error = new Error(
      'Provider failed while reporting chat-provider-retry-deadline diagnostics',
    )

    expect(resolveAlicizationRuntimeTimeoutReason(error)).toBeNull()
  })

  it.each([
    ['liveness-timeout', 'provider', 'chat-provider-liveness-timeout'],
    ['idle-timeout', 'provider', 'chat-provider-idle-timeout'],
    ['idle-timeout', 'provider-continuation', 'chat-provider-continuation-timeout'],
    ['idle-timeout', 'tool-execution', 'chat-tool-result-handoff-timeout'],
  ] as const)('creates a renderer watchdog AbortError for %s/%s with the canonical timeout reason', (timeoutPhase, timeoutStage, timeoutReason) => {
    const descriptor = {
      origin: 'renderer-watchdog' as const,
      timeoutPhase,
      timeoutStage,
      timeoutMs: 30_000,
      elapsedMs: 30_125,
      lastEventType: 'provider-keepalive',
      sawAnyEvent: true,
      sawProgress: false,
    }

    const error = createAlicizationRendererWatchdogAbortError(descriptor)

    expect(error).toMatchObject({
      name: 'AbortError',
      errorCode: 'ALICIZATION_RENDERER_STREAM_TIMEOUT',
      failureKind: 'timeout',
      timeoutOrigin: 'renderer-watchdog',
      timeoutPhase,
      timeoutStage,
      timeoutReason,
      timeoutDescriptor: descriptor,
    })
    expect(resolveAlicizationRuntimeTimeoutReason(error)).toBe(timeoutReason)
  })

  it('resolves a main watchdog timeout with its complete descriptor', () => {
    const descriptor = {
      origin: 'main-watchdog' as const,
      timeoutPhase: 'idle-timeout' as const,
      timeoutStage: 'provider' as const,
      timeoutMs: 18_000,
      elapsedMs: 18_127,
      lastEventType: 'text-delta',
      sawAnyEvent: true,
      sawProgress: true,
    }
    const error = Object.assign(new Error('main watchdog timeout'), {
      errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
      failureKind: 'timeout',
      timeoutOrigin: 'main-watchdog',
      timeoutReason: 'chat-provider-idle-timeout',
      timeoutDescriptor: descriptor,
    })

    expect(resolveAlicizationRuntimeTimeoutReason(error)).toBe('chat-provider-idle-timeout')
    expect(error).toMatchObject({
      timeoutOrigin: 'main-watchdog',
      timeoutReason: 'chat-provider-idle-timeout',
      timeoutDescriptor: descriptor,
    })
  })

  it.each([
    ['first-event-timeout', 'provider', 'chat-first-event-timeout'],
    ['liveness-timeout', 'provider', 'chat-provider-liveness-timeout'],
    ['idle-timeout', 'provider', 'chat-provider-idle-timeout'],
    ['idle-timeout', 'tool-execution', 'chat-tool-result-handoff-timeout'],
    ['idle-timeout', 'provider-continuation', 'chat-provider-continuation-timeout'],
  ] as const)(
    'maps renderer watchdog %s/%s to the canonical timeout reason',
    (timeoutPhase, timeoutStage, expected) => {
      const error = Object.assign(new Error('renderer watchdog timeout'), {
        errorCode: 'ALICIZATION_RENDERER_STREAM_TIMEOUT',
        timeoutOrigin: 'renderer-watchdog',
        timeoutPhase,
        timeoutStage,
        timeoutMs: 30_000,
        elapsedMs: 30_100,
        lastEventType: 'provider-keepalive',
        sawAnyEvent: true,
        sawProgress: false,
      })

      expect(resolveAlicizationRuntimeTimeoutReason(error)).toBe(expected)
    },
  )

  it.each([
    {
      timeoutPhase: 'first-event-timeout',
      timeoutStage: 'tool-execution',
    },
    {
      timeoutPhase: 'liveness-timeout',
      timeoutStage: 'unknown',
    },
    {
      timeoutPhase: 'unknown',
      timeoutStage: 'provider',
    },
  ])('rejects malformed renderer watchdog metadata', (metadata) => {
    expect(resolveAlicizationRuntimeTimeoutReason(Object.assign(
      new Error('malformed renderer timeout'),
      {
        errorCode: 'ALICIZATION_RENDERER_STREAM_TIMEOUT',
        timeoutOrigin: 'renderer-watchdog',
        ...metadata,
      },
    ))).toBeNull()
  })

  it.each([
    {
      name: 'missing error code',
      fields: {
        timeoutOrigin: 'runtime-watchdog',
        timeoutReason: 'chat-first-event-timeout',
      },
    },
    {
      name: 'wrong error code',
      fields: {
        errorCode: 'PROVIDER_TIMEOUT',
        timeoutOrigin: 'runtime-watchdog',
        timeoutReason: 'chat-first-event-timeout',
      },
    },
    {
      name: 'missing timeout origin',
      fields: {
        errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
        timeoutReason: 'chat-first-event-timeout',
      },
    },
    {
      name: 'wrong timeout origin',
      fields: {
        errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
        timeoutOrigin: 'provider',
        timeoutReason: 'chat-first-event-timeout',
      },
    },
    {
      name: 'unknown timeout reason',
      fields: {
        errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
        timeoutOrigin: 'runtime-watchdog',
        timeoutReason: 'chat-unknown-timeout',
      },
    },
  ])(
    'rejects structured timeout metadata with $name',
    ({ fields }) => {
      expect(resolveAlicizationRuntimeTimeoutReason(
        Object.assign(new Error('timeout-shaped failure'), fields),
      )).toBeNull()
    },
  )

  it.each(runtimeTimeoutReasons)(
    'creates a structured runtime watchdog AbortError for %s',
    (timeoutReason) => {
      const error = createAlicizationRuntimeAbortError(timeoutReason)

      expect(error).toMatchObject({
        name: 'AbortError',
        errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
        failureKind: 'timeout',
        timeoutOrigin: 'runtime-watchdog',
        timeoutReason,
      })
      expect(resolveAlicizationRuntimeTimeoutReason(error)).toBe(timeoutReason)
    },
  )

  it('keeps an unknown reason as an ordinary AbortError even when it contains a timeout token', () => {
    const error = createAlicizationRuntimeAbortError(
      'unexpected-chat-first-event-timeout-wrapper',
    )

    expect(error).toMatchObject({
      name: 'AbortError',
      message: 'Alicization runtime aborted: unexpected-chat-first-event-timeout-wrapper',
    })
    expect(error).not.toHaveProperty('errorCode')
    expect(error).not.toHaveProperty('timeoutOrigin')
    expect(error).not.toHaveProperty('timeoutReason')
    expect(resolveAlicizationRuntimeTimeoutReason(error)).toBeNull()
  })
})
