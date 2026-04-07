import type { Message } from '@xsai/shared-chat'

import type { AlicizationMainChatTimeoutRecoveryMode } from './main-chat-run-lifecycle'

import { describe, expect, it, vi } from 'vitest'

import {
  handleAlicizationMainChatRunFailure,
  normalizeAlicizationMainChatAbortReason,
  shouldRecordAlicizationMainGatewayGenerationTimeout,
} from './main-chat-run-lifecycle'

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
    chatConfig: {
      model: 'gpt-test',
      baseURL: 'https://example.test/v1',
    },
    messages: [
      { role: 'user', content: '你好' },
    ] as Message[],
    headers: {
      authorization: 'Bearer test',
    },
    tools: undefined,
    toolChoice: undefined,
    timeoutRecoveryMode: 'original' as AlicizationMainChatTimeoutRecoveryMode,
    timeoutRecoveryMs: 1500,
    payload: {
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
    },
    dispatchBound: false,
    nonProgressEventTypes: new Set<string>(['provider-keepalive']),
    isRunActive: () => true,
    ensureMainGatewayReachable: vi.fn(async () => ({ reachable: true })),
    recordMainGatewayGenerationTimeout: vi.fn(async () => {}),
    recoverFromTimeout: vi.fn(async () => ''),
    emitRecoveredText: vi.fn(),
    emitError: vi.fn(),
    finish: vi.fn(),
    appendRuntimeDebugLine: vi.fn(async () => {}),
    queueScopedAuditLog: vi.fn(),
    ...overrides,
  } as Parameters<typeof handleAlicizationMainChatRunFailure>[0]
}

describe('main chat run lifecycle', () => {
  it('normalizes timeout abort reasons explicitly', () => {
    expect(normalizeAlicizationMainChatAbortReason('chat-first-event-timeout')).toBe('chat-first-event-timeout')
    expect(normalizeAlicizationMainChatAbortReason('manual')).toBe('abort')
  })

  it('emits a prepare-failed result before the stream is prepared', async () => {
    const input = createBaseInput({
      prepared: null,
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith('boom')
    expect(input.finish).toHaveBeenCalledWith({
      status: 'failed',
      finishReason: 'prepare-failed',
      error: 'boom',
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.prepare-failed', {
      cardId: 'card-1',
      turnId: 'turn-1',
      reason: 'boom',
    })
  })

  it('recovers a first-event-timeout into a completed turn when one-shot fallback succeeds', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => 'recovered reply'),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.recoverFromTimeout).toHaveBeenCalledWith(expect.objectContaining({
      timeoutMs: 1500,
    }))
    expect(input.emitRecoveredText).toHaveBeenCalledWith('recovered reply')
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-timeout-recovered',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovered', {
      cardId: 'card-1',
      turnId: 'turn-1',
      dispatchBound: false,
      recoveredChars: 'recovered reply'.length,
      timeoutRecoveryMode: 'original',
      nonProgressEventTypes: ['provider-keepalive'],
    })
    expect(input.finish).toHaveBeenCalledWith({
      status: 'completed',
      finishReason: 'timeout-recovered',
      fullText: 'recovered reply',
    })
  })

  it('short-circuits timeout recovery when the gateway probe reports an unreachable endpoint', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      dispatchBound: true,
      timeoutRecoveryMode: 'tools-disabled',
      ensureMainGatewayReachable: vi.fn(async () => ({
        reachable: false,
        cached: false,
        code: 'ECONNREFUSED',
        reason: 'connect ECONNREFUSED 127.0.0.1:443',
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.recoverFromTimeout).not.toHaveBeenCalled()
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-gateway-unreachable',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.gateway-unreachable', {
      cardId: 'card-1',
      turnId: 'turn-1',
      dispatchBound: true,
      cached: false,
      code: 'ECONNREFUSED',
      reason: 'connect ECONNREFUSED 127.0.0.1:443',
      timeoutRecoveryMode: 'tools-disabled',
      nonProgressEventTypes: ['provider-keepalive'],
    })
    expect(input.finish).toHaveBeenCalledWith({
      status: 'aborted',
      finishReason: 'chat-first-event-timeout|after-dispatch-meta|recovery-mode=tools-disabled|non-progress=provider-keepalive|gateway-unreachable=econnrefused',
    })
  })

  it('falls back to aborted when timeout recovery itself fails', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      dispatchBound: true,
      timeoutRecoveryMode: 'tools-disabled',
      recoverFromTimeout: vi.fn(async () => {
        throw new Error('Alicization runtime aborted: main-gateway-timeout-recovery')
      }),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.recordMainGatewayGenerationTimeout).toHaveBeenCalledWith(
      input.mainGateway,
      expect.any(Error),
    )
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-timeout-recovery-failed',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-failed', {
      cardId: 'card-1',
      turnId: 'turn-1',
      dispatchBound: true,
      reason: 'Alicization runtime aborted: main-gateway-timeout-recovery',
      timeoutRecoveryMode: 'tools-disabled',
      nonProgressEventTypes: ['provider-keepalive'],
    })
    expect(input.finish).toHaveBeenCalledWith({
      status: 'aborted',
      finishReason: 'chat-first-event-timeout|after-dispatch-meta|recovery-mode=tools-disabled|non-progress=provider-keepalive|recovery-failed=main-gateway-timeout-recovery',
    })
  })

  it('does not poison gateway health cache for invalid tool choice recovery failures', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      dispatchBound: true,
      timeoutRecoveryMode: 'original',
      recoverFromTimeout: vi.fn(async () => {
        throw new Error('Remote sent 400 response: {"error":{"message":"tool_choice object must have type=\'function\' and function.name","type":"invalid_request_error","param":"tool_choice","code":"invalid_tool_choice"}}')
      }),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.recordMainGatewayGenerationTimeout).not.toHaveBeenCalled()
    expect(input.finish).toHaveBeenCalledWith(expect.objectContaining({
      status: 'aborted',
      finishReason: expect.stringContaining('recovery-failed=remote-sent-400-response'),
    }))
  })

  it('recognizes true timeout-like recovery failures only', () => {
    expect(shouldRecordAlicizationMainGatewayGenerationTimeout(new Error('Alicization runtime aborted: main-gateway-timeout-recovery'))).toBe(true)
    expect(shouldRecordAlicizationMainGatewayGenerationTimeout(new Error('Request timed out after 12000ms'))).toBe(true)
    expect(shouldRecordAlicizationMainGatewayGenerationTimeout(new Error('Remote sent 400 response: {"error":{"code":"invalid_tool_choice"}}'))).toBe(false)
  })

  it('emits failed stream results for non-abort runtime errors', async () => {
    const input = createBaseInput({
      error: new Error('stream exploded'),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith('stream exploded')
    expect(input.finish).toHaveBeenCalledWith({
      status: 'failed',
      finishReason: 'error',
      error: 'stream exploded',
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.failed', {
      cardId: 'card-1',
      turnId: 'turn-1',
      reason: 'stream exploded',
    })
  })
})
