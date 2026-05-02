import type { Message } from '@xsai/shared-chat'

import type { AlicizationMainChatTimeoutRecoveryMode } from './main-chat-run-lifecycle'

import { describe, expect, it, vi } from 'vitest'

import {
  deriveAlicizationTimeoutRecoveryMs,
  handleAlicizationMainChatRunFailure,
  normalizeAlicizationMainChatAbortReason,
  shouldRecordAlicizationMainGatewayGenerationTimeout,
} from './main-chat-run-lifecycle'

function createRecoveredReply(fullText: string): any {
  return {
    fullText,
    visibleText: fullText,
    visibleReplyExecution: {
      mode: 'provider-one-shot',
      expectedVisibleReplyAuthority: 'llm-mind',
      actualVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: true,
      reason: 'timeout-recovered-non-streaming',
    },
  }
}

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
    nonProgressEventTypes: new Set<string>(),
    isRunActive: () => true,
    ensureMainGatewayReachable: vi.fn(async () => ({ reachable: true })),
    recordMainGatewayGenerationTimeout: vi.fn(async () => {}),
    recoverFromTimeout: vi.fn(async () => ({
      recoveredReply: createRecoveredReply(''),
      recoveryMode: 'original' as AlicizationMainChatTimeoutRecoveryMode,
    })),
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

  it('extends timeout recovery window when stream liveness events were observed', () => {
    expect(deriveAlicizationTimeoutRecoveryMs({
      baseTimeoutMs: 12_000,
      timeoutRecoveryMode: 'original',
      nonProgressEventTypes: new Set<string>(['response-metadata']),
    })).toBe(20_000)

    expect(deriveAlicizationTimeoutRecoveryMs({
      baseTimeoutMs: 12_000,
      timeoutRecoveryMode: 'tools-disabled',
      nonProgressEventTypes: new Set<string>(['provider-keepalive']),
    })).toBe(25_000)

    expect(deriveAlicizationTimeoutRecoveryMs({
      baseTimeoutMs: 12_000,
      timeoutRecoveryMode: 'minimal-context-non-streaming',
      nonProgressEventTypes: new Set<string>(['provider-keepalive']),
    })).toBe(30_000)

    expect(deriveAlicizationTimeoutRecoveryMs({
      baseTimeoutMs: 8_000,
      timeoutRecoveryMode: 'active-dialogue-compact',
      nonProgressEventTypes: new Set<string>(['provider-keepalive']),
    })).toBe(12_000)

    expect(deriveAlicizationTimeoutRecoveryMs({
      baseTimeoutMs: 12_000,
      timeoutRecoveryMode: 'original',
      nonProgressEventTypes: new Set<string>(['unknown-event']),
    })).toBe(12_000)
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
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply: createRecoveredReply('recovered reply'),
        recoveryMode: 'non-streaming' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.recoverFromTimeout).toHaveBeenCalledWith(expect.objectContaining({
      timeoutMs: 1500,
    }))
    expect(input.emitRecoveredText).toHaveBeenCalledWith(expect.objectContaining({
      fullText: 'recovered reply',
    }))
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-timeout-recovered',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovered', {
      cardId: 'card-1',
      turnId: 'turn-1',
      dispatchBound: false,
      recoveredChars: 'recovered reply'.length,
      timeoutRecoveryMs: 1500,
      timeoutRecoveryMode: 'non-streaming',
      nonProgressEventTypes: [],
    })
    expect(input.finish).toHaveBeenCalledWith({
      status: 'completed',
      finishReason: 'timeout-recovered',
      fullText: 'recovered reply',
    })
  })

  it('records active dialogue compact recovery as its own success mode', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const recoveredText = JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=grounded; focus=current dialogue knot; move=stay-with-current-thread; tone=warm',
      emotion: 'concerned',
      reply: '先别急着摊太多。你先说最卡住你的那一点，我贴着这一句陪你收。',
    })
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply: createRecoveredReply(recoveredText),
        recoveryMode: 'active-dialogue-compact' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitRecoveredText).toHaveBeenCalledWith(expect.objectContaining({
      fullText: recoveredText,
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovered', {
      cardId: 'card-1',
      turnId: 'turn-1',
      dispatchBound: false,
      recoveredChars: recoveredText.length,
      timeoutRecoveryMs: 1500,
      timeoutRecoveryMode: 'active-dialogue-compact',
      nonProgressEventTypes: [],
    })
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-timeout-recovered',
      payload: expect.objectContaining({
        timeoutRecoveryMode: 'active-dialogue-compact',
      }),
    }))
  })

  it('keeps timeout recovery active when the gateway probe reports an unreachable endpoint', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      dispatchBound: true,
      timeoutRecoveryMode: 'tools-disabled',
      nonProgressEventTypes: new Set<string>(['provider-keepalive']),
      ensureMainGatewayReachable: vi.fn(async () => ({
        reachable: false,
        cached: false,
        code: 'ECONNREFUSED',
        reason: 'connect ECONNREFUSED 127.0.0.1:443',
      })),
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply: createRecoveredReply('fallback reply'),
        recoveryMode: 'tools-disabled' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.recoverFromTimeout).toHaveBeenCalledWith(expect.objectContaining({
      timeoutMs: 25_000,
    }))
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-gateway-unreachable-advisory',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.gateway-unreachable-advisory', {
      cardId: 'card-1',
      turnId: 'turn-1',
      dispatchBound: true,
      cached: false,
      code: 'ECONNREFUSED',
      reason: 'connect ECONNREFUSED 127.0.0.1:443',
      timeoutRecoveryMs: 25_000,
      timeoutRecoveryMode: 'tools-disabled',
      nonProgressEventTypes: ['provider-keepalive'],
    })
    expect(input.finish).toHaveBeenCalledWith({
      status: 'completed',
      finishReason: 'timeout-recovered',
      fullText: 'fallback reply',
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
      nonProgressEventTypes: new Set<string>(['provider-keepalive']),
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
      timeoutRecoveryMs: 25_000,
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
      nonProgressEventTypes: new Set<string>(['provider-keepalive']),
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
