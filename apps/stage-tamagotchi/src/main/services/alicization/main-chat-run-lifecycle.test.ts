import {
  resolveAlicizationChatFailureSurface,
} from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import {
  handleAlicizationMainChatRunFailure,
  isProviderSchemaUnsupportedError,
  normalizeAlicizationMainChatAbortReason,
} from './main-chat-run-lifecycle'
import { createAlicizationRuntimeAbortError } from './turn-os/runtime-errors'
import { AlicizationVisibleReplySettlementBlockedError } from './visible-reply/settlement'

function createBaseInput(
  overrides?: Partial<Parameters<typeof handleAlicizationMainChatRunFailure>[0]>,
): Parameters<typeof handleAlicizationMainChatRunFailure>[0] {
  return {
    error: new Error('boom'),
    prepared: {} as any,
    controller: new AbortController(),
    mainGateway: {
      providerId: 'openai',
      model: 'gpt-test',
      baseUrl: 'https://example.test/v1/',
      headers: {
        authorization: 'Bearer test',
      },
      probeHeaders: {
        Authorization: 'Bearer test',
      },
      provider: {} as never,
    },
    payload: {
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
      messages: [{ role: 'user', content: '你好' }],
    },
    dispatchBound: false,
    nonProgressEventTypes: new Set<string>(),
    emitError: vi.fn(),
    finish: vi.fn(),
    appendRuntimeDebugLine: vi.fn(async () => {}),
    queueScopedAuditLog: vi.fn(),
    ...overrides,
  }
}

function failureMetadata(
  kind: Parameters<typeof resolveAlicizationChatFailureSurface>[0]['kind'],
  timeout?: Parameters<typeof resolveAlicizationChatFailureSurface>[0]['timeout'],
) {
  const failureSurface = resolveAlicizationChatFailureSurface({
    kind,
    userText: '你好',
    ...(timeout ? { timeout } : {}),
  })
  return {
    failureSurface,
    metadata: {
      origin: failureSurface.origin,
      learningPolicy: {
        allowLongTermCondensation: false as const,
        allowPersonaLearning: false as const,
        allowTraining: false as const,
      },
      failureSurface,
    },
  }
}

describe('main chat run lifecycle', () => {
  it('normalizes timeout abort reasons explicitly', () => {
    expect(normalizeAlicizationMainChatAbortReason(
      createAlicizationRuntimeAbortError('chat-first-event-timeout'),
    )).toBe('chat-first-event-timeout')
    expect(normalizeAlicizationMainChatAbortReason(
      createAlicizationRuntimeAbortError('chat-provider-liveness-timeout'),
    )).toBe('chat-provider-liveness-timeout')
    expect(normalizeAlicizationMainChatAbortReason(
      createAlicizationRuntimeAbortError('chat-provider-idle-timeout'),
    )).toBe('chat-provider-idle-timeout')
    expect(normalizeAlicizationMainChatAbortReason(
      createAlicizationRuntimeAbortError('chat-provider-continuation-timeout'),
    )).toBe('chat-provider-continuation-timeout')
    expect(normalizeAlicizationMainChatAbortReason(
      createAlicizationRuntimeAbortError('chat-tool-result-handoff-timeout'),
    )).toBe('chat-tool-result-handoff-timeout')
    expect(normalizeAlicizationMainChatAbortReason('manual')).toBe('abort')
  })

  it('does not promote an unstructured AbortError timeout token into a runtime timeout', () => {
    const error = new DOMException('chat-preparation-timeout', 'AbortError')

    expect(normalizeAlicizationMainChatAbortReason(error)).toBe('abort')
  })

  it('preserves the main watchdog timeout descriptor on the transparent failure surface', async () => {
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
    const error = Object.assign(new DOMException('main watchdog timeout', 'AbortError'), {
      errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
      failureKind: 'timeout',
      timeoutOrigin: 'main-watchdog',
      timeoutReason: 'chat-provider-idle-timeout',
      timeoutDescriptor: descriptor,
    })
    const input = createBaseInput({
      controller: Object.assign(new AbortController(), { reason: error }) as AbortController,
      error,
    })

    // AbortController.reason is read-only; use a real aborted signal so the
    // lifecycle sees the same main-owned timeout object as production.
    const controller = new AbortController()
    controller.abort(error)
    input.controller = controller

    await handleAlicizationMainChatRunFailure(input)

    expect(input.finish).toHaveBeenCalledWith(expect.objectContaining({
      status: 'timed-out',
      finishReason: 'chat-provider-idle-timeout',
      failureSurface: expect.objectContaining({
        timeout: expect.objectContaining({
          timeoutReason: 'chat-provider-idle-timeout',
          descriptor,
        }),
      }),
    }))
  })

  it('uses structured Turn OS timeout metadata as the authority for runtime timeout classification', () => {
    const error = createAlicizationRuntimeAbortError('chat-provider-retry-deadline')

    expect(normalizeAlicizationMainChatAbortReason(error)).toBe('chat-provider-retry-deadline')
    expect(normalizeAlicizationMainChatAbortReason(
      Object.assign(new Error('ordinary Provider failure'), {
        errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
        timeoutOrigin: 'provider',
        timeoutReason: 'chat-provider-retry-deadline',
      }),
    )).toBe('abort')
  })

  it('surfaces first-event timeout directly without generating a recovery reply', async () => {
    const controller = new AbortController()
    const timeoutError = createAlicizationRuntimeAbortError('chat-first-event-timeout')
    controller.abort(timeoutError)
    const input = createBaseInput({
      controller,
      dispatchBound: true,
      error: timeoutError,
      nonProgressEventTypes: new Set(['provider-keepalive']),
    })
    const { failureSurface, metadata } = failureMetadata('timeout', {
      providerId: 'openai',
      model: 'gpt-test',
      phase: 'provider-first-event',
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'timed-out',
      finishReason: 'chat-first-event-timeout|after-dispatch-meta|non-progress=provider-keepalive',
      error: failureSurface.reply,
      ...metadata,
    })
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-timeout-failed',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-failed', {
      cardId: 'card-1',
      turnId: 'turn-1',
      dispatchBound: true,
      nonProgressEventTypes: ['provider-keepalive'],
    })
  })

  it('surfaces ordinary external Provider transport timeouts as timeout failures', async () => {
    const error = Object.assign(new Error('fetch failed'), {
      code: 'ETIMEDOUT',
    })
    const input = createBaseInput({ error })
    const { failureSurface, metadata } = failureMetadata('timeout', {
      providerId: 'openai',
      model: 'gpt-test',
      phase: 'provider-first-event',
      transportCode: 'ETIMEDOUT',
      transportMessage: 'fetch failed',
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'timed-out',
      finishReason: 'provider-transport-timeout',
      error: failureSurface.reply,
      ...metadata,
    })
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-timeout-failed',
      payload: expect.objectContaining({
        transportCode: 'ETIMEDOUT',
        transportMessage: 'fetch failed',
      }),
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-failed', {
      cardId: 'card-1',
      turnId: 'turn-1',
      dispatchBound: false,
      nonProgressEventTypes: [],
      transportCode: 'ETIMEDOUT',
      transportMessage: 'fetch failed',
    })
  })

  it('preserves the Provider retry deadline as its own terminal reason', async () => {
    const timeoutError = createAlicizationRuntimeAbortError('chat-provider-retry-deadline')
    const input = createBaseInput({
      dispatchBound: true,
      error: timeoutError,
      nonProgressEventTypes: new Set(['response-metadata']),
    })
    const { failureSurface, metadata } = failureMetadata('timeout', {
      providerId: 'openai',
      model: 'gpt-test',
      phase: 'provider-first-event',
      timeoutReason: 'chat-provider-retry-deadline',
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'timed-out',
      finishReason: 'chat-provider-retry-deadline',
      error: failureSurface.reply,
      ...metadata,
    })
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'provider-retry-deadline-failed',
    }))
  })

  it('surfaces one-shot gateway attempt timeouts instead of treating them as silent aborts', async () => {
    const timeoutError = createAlicizationRuntimeAbortError('main-gateway-attempt-timeout')
    const input = createBaseInput({
      dispatchBound: true,
      error: timeoutError,
    })
    const { failureSurface, metadata } = failureMetadata('timeout', {
      providerId: 'openai',
      model: 'gpt-test',
      phase: 'provider-first-event',
      timeoutReason: 'main-gateway-attempt-timeout',
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'timed-out',
      finishReason: 'main-gateway-attempt-timeout',
      error: failureSurface.reply,
      ...metadata,
    })
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'main-gateway-timeout-failed',
    }))
  })

  it('surfaces Provider continuation timeout after a completed tool result', async () => {
    const controller = new AbortController()
    const timeoutError = createAlicizationRuntimeAbortError('chat-provider-continuation-timeout')
    controller.abort(timeoutError)
    const input = createBaseInput({
      controller,
      dispatchBound: true,
      error: timeoutError,
    })
    const { failureSurface, metadata } = failureMetadata('provider-continuation-timeout', {
      providerId: 'openai',
      model: 'gpt-test',
      phase: 'provider-continuation',
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'timed-out',
      finishReason: 'chat-provider-continuation-timeout',
      error: failureSurface.reply,
      ...metadata,
    })
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'provider-continuation-timeout-failed',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith(
      'chat-stream.provider-continuation-timeout-failed',
      expect.objectContaining({
        cardId: 'card-1',
        turnId: 'turn-1',
      }),
    )
  })

  it('surfaces tool result handoff timeout as a structured timeout instead of a generic abort', async () => {
    const controller = new AbortController()
    const timeoutError = createAlicizationRuntimeAbortError('chat-tool-result-handoff-timeout')
    controller.abort(timeoutError)
    const input = createBaseInput({
      controller,
      dispatchBound: true,
      error: timeoutError,
    })
    const { failureSurface, metadata } = failureMetadata('timeout', {
      providerId: 'openai',
      model: 'gpt-test',
      phase: 'tool-result-handoff',
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'timed-out',
      finishReason: 'chat-tool-result-handoff-timeout',
      error: failureSurface.reply,
      ...metadata,
    })
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'tool-result-handoff-timeout-failed',
      message: 'The tool result could not be handed back to the Provider before the handoff deadline.',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith(
      'chat-stream.tool-result-handoff-timeout-failed',
      expect.objectContaining({
        cardId: 'card-1',
        turnId: 'turn-1',
      }),
    )
  })

  it('surfaces a tool execution error even when the provider controller was aborted with that error', async () => {
    const controller = new AbortController()
    const toolError = Object.assign(new Error('Codex timed out while waiting for the Provider.'), {
      name: 'AlicizationToolExecutionError',
      failureKind: 'tool-execution',
      toolName: 'executor_run_codex',
      errorCode: 'CODEX_TIMEOUT',
      errorMessage: 'Codex timed out while waiting for the Provider.',
    })
    controller.abort(toolError)
    const input = createBaseInput({
      controller,
      error: toolError,
      dispatchBound: true,
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.finish).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      finishReason: 'tool-execution',
      failureSurface: expect.objectContaining({
        kind: 'tool-execution',
        toolExecution: expect.objectContaining({
          code: 'CODEX_TIMEOUT',
          toolName: 'codex',
        }),
      }),
    }))
    expect(input.finish).not.toHaveBeenCalledWith(expect.objectContaining({
      finishReason: expect.stringMatching(/abort|timeout/u),
    }))
    expect(input.emitError).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        failureSurface: expect.objectContaining({
          kind: 'tool-execution',
        }),
      }),
    )
  })

  it('surfaces preparation timeout before the Provider stream starts', async () => {
    const controller = new AbortController()
    const timeoutError = createAlicizationRuntimeAbortError('chat-preparation-timeout')
    controller.abort(timeoutError)
    const input = createBaseInput({
      controller,
      dispatchBound: false,
      error: timeoutError,
    })
    const { failureSurface, metadata } = failureMetadata('timeout', {
      providerId: 'openai',
      model: 'gpt-test',
      phase: 'preparation',
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'timed-out',
      finishReason: 'chat-preparation-timeout',
      error: failureSurface.reply,
      ...metadata,
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith(
      'chat-stream.preparation-timeout-failed',
      expect.objectContaining({
        cardId: 'card-1',
        turnId: 'turn-1',
      }),
    )
  })

  it('surfaces a tool-result handoff timeout without treating it as a Provider continuation', async () => {
    const controller = new AbortController()
    const timeoutError = createAlicizationRuntimeAbortError('chat-tool-result-handoff-timeout')
    controller.abort(timeoutError)
    const input = createBaseInput({
      controller,
      dispatchBound: true,
      error: timeoutError,
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.finish).toHaveBeenCalledWith(expect.objectContaining({
      status: 'timed-out',
      finishReason: 'chat-tool-result-handoff-timeout',
    }))
  })

  it('surfaces a Provider stream that closes after tool result without a final reply', async () => {
    const input = createBaseInput({
      error: new Error('chat-provider-continuation-incomplete'),
    })
    const { failureSurface, metadata } = failureMetadata('provider-continuation-incomplete')

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'failed',
      finishReason: 'provider-continuation-incomplete',
      error: failureSurface.reply,
      ...metadata,
    })
  })

  it('keeps manual aborts silent and does not mislabel them as Provider failures', async () => {
    const controller = new AbortController()
    controller.abort('manual')
    const input = createBaseInput({
      controller,
      error: new DOMException('manual', 'AbortError'),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).not.toHaveBeenCalled()
    expect(input.finish).toHaveBeenCalledWith({
      status: 'aborted',
      finishReason: 'abort',
    })
  })

  it('keeps preparation-stage manual aborts silent', async () => {
    const controller = new AbortController()
    controller.abort('manual')
    const input = createBaseInput({
      prepared: null,
      controller,
      error: new DOMException('manual', 'AbortError'),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).not.toHaveBeenCalled()
    expect(input.finish).toHaveBeenCalledWith({
      status: 'aborted',
      finishReason: 'abort',
    })
  })

  it('marks preparation failures as non-learning stream failures', async () => {
    const input = createBaseInput({
      prepared: null,
    })
    const { failureSurface, metadata } = failureMetadata('stream-failure')

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'failed',
      finishReason: 'prepare-failed',
      error: failureSurface.reply,
      ...metadata,
    })
  })

  it('surfaces Provider request failures even when preparation has not completed', async () => {
    const error = new Error(
      'Remote sent 400 response: {"error":{"message":"Upstream request failed.","type":"invalid_request_error"}}',
    )
    const input = createBaseInput({
      error,
      prepared: null,
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.finish).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      finishReason: 'provider-request',
      failureSurface: expect.objectContaining({
        kind: 'provider-request',
        providerRequest: expect.objectContaining({
          providerId: 'openai',
          model: 'gpt-test',
          status: 400,
          code: 'invalid_request_error',
        }),
      }),
    }))
  })

  it('classifies unsupported native response schemas as transparent Provider failures', async () => {
    const error = new Error('Remote sent 400 response: response_format json_schema is an invalid parameter')
    const input = createBaseInput({ error })
    const { failureSurface, metadata } = failureMetadata('provider-schema-unsupported')

    expect(isProviderSchemaUnsupportedError(error)).toBe(true)
    expect(isProviderSchemaUnsupportedError(new Error('invalid tool_choice'))).toBe(false)

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'failed',
      finishReason: 'provider-schema-unsupported',
      error: failureSurface.reply,
      ...metadata,
    })
  })

  it('surfaces HTTP 400 Provider request failures with safe upstream diagnostics', async () => {
    const error = new Error(
      'Remote sent 400 response: {"error":{"message":"Upstream request failed.","type":"invalid_request_error"}}',
    )
    const input = createBaseInput({ error })
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'provider-request',
      userText: '你好',
      providerRequest: {
        providerId: 'openai',
        model: 'gpt-test',
        status: 400,
        code: 'invalid_request_error',
        message: 'Upstream request failed.',
      },
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(
      failureSurface.reply,
      expect.objectContaining({
        origin: failureSurface.origin,
        failureSurface,
      }),
    )
    expect(input.finish).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      finishReason: 'provider-request',
      error: failureSurface.reply,
      failureSurface,
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.provider-request-failed', expect.objectContaining({
      providerId: 'openai',
      model: 'gpt-test',
      status: 400,
      code: 'invalid_request_error',
    }))
  })

  it('surfaces executor failures with an explicit tool failure surface', async () => {
    const input = createBaseInput({
      error: new Error('Circular runtime call detected: tool:executor:codex -> tool:executor:codex'),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.finish).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      finishReason: 'tool-execution',
      failureSurface: expect.objectContaining({
        kind: 'tool-execution',
        toolExecution: expect.objectContaining({
          toolName: 'codex',
          code: 'RUNTIME_CALL_CIRCULAR',
        }),
      }),
    }))
    expect(input.emitError).toHaveBeenCalledWith(
      expect.stringContaining('Codex'),
      expect.objectContaining({
        failureSurface: expect.objectContaining({
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        }),
      }),
    )
  })

  it('surfaces Provider settlement blocks as provider output failures', async () => {
    const error = new AlicizationVisibleReplySettlementBlockedError(
      'provider-settlement-invalid:provider-memory-usage-invalid',
      null,
    )
    const input = createBaseInput({ error })
    const { failureSurface, metadata } = failureMetadata('provider-output-invalid')

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'failed',
      finishReason: 'provider-output-invalid',
      error: failureSurface.reply,
      ...metadata,
    })
  })

  it('surfaces ordinary stream failures without exposing raw error text as dialogue', async () => {
    const input = createBaseInput({
      error: new Error('secret provider stack detail'),
    })
    const { failureSurface, metadata } = failureMetadata('stream-failure')

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.emitError).not.toHaveBeenCalledWith('secret provider stack detail')
    expect(input.finish).toHaveBeenCalledWith({
      status: 'failed',
      finishReason: 'error',
      error: failureSurface.reply,
      ...metadata,
    })
  })
})
