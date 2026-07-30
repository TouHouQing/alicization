import { resolveAlicizationChatFailureSurface } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import { AlicizationRequiredToolMissingError } from './main-chat-required-tool'
import {
  handleAlicizationMainChatRunFailure,
  isProviderSchemaUnsupportedError,
  normalizeAlicizationMainChatAbortReason,
  shouldRecordAlicizationMainGatewayGenerationTimeout,
} from './main-chat-run-lifecycle'
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
    recordMainGatewayGenerationTimeout: vi.fn(async () => {}),
    emitError: vi.fn(),
    finish: vi.fn(),
    appendRuntimeDebugLine: vi.fn(async () => {}),
    queueScopedAuditLog: vi.fn(),
    ...overrides,
  }
}

function failureMetadata(kind: Parameters<typeof resolveAlicizationChatFailureSurface>[0]['kind']) {
  const failureSurface = resolveAlicizationChatFailureSurface({ kind, userText: '你好' })
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
    expect(normalizeAlicizationMainChatAbortReason('chat-first-event-timeout')).toBe('chat-first-event-timeout')
    expect(normalizeAlicizationMainChatAbortReason('manual')).toBe('abort')
  })

  it('recognizes timeout failures without classifying invalid request errors as timeouts', () => {
    expect(shouldRecordAlicizationMainGatewayGenerationTimeout(
      new Error('Request timed out after 12000ms'),
    )).toBe(true)
    expect(shouldRecordAlicizationMainGatewayGenerationTimeout(
      new Error('Remote sent 400 response: invalid_tool_choice'),
    )).toBe(false)
  })

  it('surfaces first-event timeout directly without generating a recovery reply', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const input = createBaseInput({
      controller,
      dispatchBound: true,
      error: new DOMException('chat-first-event-timeout', 'AbortError'),
      nonProgressEventTypes: new Set(['provider-keepalive']),
    })
    const { failureSurface, metadata } = failureMetadata('timeout')

    await handleAlicizationMainChatRunFailure(input)

    expect(input.recordMainGatewayGenerationTimeout).toHaveBeenCalledOnce()
    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'aborted',
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

  it('surfaces Provider settlement blocks as structured-contract failures', async () => {
    const error = new AlicizationVisibleReplySettlementBlockedError(
      'provider-settlement-invalid:provider-memory-usage-invalid',
      null,
    )
    const input = createBaseInput({ error })
    const { failureSurface, metadata } = failureMetadata('structured-contract')

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply, metadata)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'failed',
      finishReason: 'structured-contract',
      error: failureSurface.reply,
      ...metadata,
    })
  })

  it('surfaces a missing required tool as an unexecuted tool failure', async () => {
    const error = new AlicizationRequiredToolMissingError({
      stage: 'stream',
      finishReason: 'stop',
      requiredToolNames: ['executor_run_cli'],
    })
    const input = createBaseInput({ error })
    const { failureSurface, metadata } = failureMetadata('required-tool-missing')

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith(
      '模型未调用本轮要求的工具，操作没有执行。',
      metadata,
    )
    expect(input.finish).toHaveBeenCalledWith({
      status: 'failed',
      finishReason: 'required-tool-missing',
      error: failureSurface.reply,
      ...metadata,
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith(
      'chat-stream.required-tool-missing',
      expect.objectContaining({
        cardId: 'card-1',
        turnId: 'turn-1',
        requiredToolNames: ['executor_run_cli'],
      }),
    )
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
