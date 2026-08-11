import type {
  AlicizationChatToolCallEvent,
  AlicizationChatToolProgressEvent,
  AlicizationChatToolResultEvent,
} from '../../../shared/eventa'
import type { ChatRunState } from './runtime-soul'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationChatStreamRuntime } from './runtime-chat-stream'

function createState(): ChatRunState {
  return {
    cardId: 'card-1',
    turnId: 'turn-1',
    controller: new AbortController(),
    chunkCount: 0,
    rawChunkChars: 0,
    state: 'running',
  }
}

describe('runtime chat stream dispatch', () => {
  it('allows only one error and suppresses all non-terminal events after it', () => {
    const emitted: Array<{ event: unknown, body: unknown }> = []
    const runtime = createAlicizationChatStreamRuntime({
      normalizeTransportMessageContent: value => value,
      sanitizeText: value => typeof value === 'string' ? value : '',
      redactStaleInspectionHistoryMessages: messages => messages,
      dispatchChannel: 'test',
      emitContextEvent: (event, body) => {
        emitted.push({ event, body })
      },
      metaEvent: 'meta',
      chunkEvent: 'chunk',
      toolCallEvent: 'tool-call',
      toolProgressEvent: 'tool-progress',
      toolResultEvent: 'tool-result',
      finishEvent: 'finish',
      errorEvent: 'error',
      queueScopedAuditLog: vi.fn(async () => {}),
      appendRuntimeDebugLine: vi.fn(async () => {}),
    })
    const state = createState()
    const errorBody = {
      cardId: state.cardId,
      turnId: state.turnId,
      error: 'Codex 失败。',
    }

    runtime.emitChatStreamEventForState(state, 'error', errorBody)
    runtime.emitChatStreamEventForState(state, 'error', {
      ...errorBody,
      error: '模型输出格式异常。',
    })
    runtime.emitChatStreamEventForState(state, 'tool-call', {
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId: 'late-call',
      toolName: 'executor_run_codex',
    } satisfies AlicizationChatToolCallEvent)
    runtime.emitChatStreamEventForState(state, 'chunk', {
      cardId: state.cardId,
      turnId: state.turnId,
      text: 'late',
    })

    expect(emitted).toEqual([
      { event: 'error', body: errorBody },
    ])
  })

  it('deduplicates tool-call and tool-result by canonical tool call id while keeping distinct calls', () => {
    const emitted: Array<{ event: unknown, body: unknown }> = []
    const runtime = createAlicizationChatStreamRuntime({
      normalizeTransportMessageContent: value => value,
      sanitizeText: value => typeof value === 'string' ? value : '',
      redactStaleInspectionHistoryMessages: messages => messages,
      dispatchChannel: 'test',
      emitContextEvent: (event, body) => {
        emitted.push({ event, body })
      },
      metaEvent: 'meta',
      chunkEvent: 'chunk',
      toolCallEvent: 'tool-call',
      toolProgressEvent: 'tool-progress',
      toolResultEvent: 'tool-result',
      finishEvent: 'finish',
      errorEvent: 'error',
      queueScopedAuditLog: vi.fn(async () => {}),
      appendRuntimeDebugLine: vi.fn(async () => {}),
    })
    const state = createState()
    const call = (toolCallId: string) => ({
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId,
      toolName: 'executor_run_codex',
    } satisfies AlicizationChatToolCallEvent)
    const result = (toolCallId: string, status: string) => ({
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId,
      result: { status },
    } satisfies AlicizationChatToolResultEvent)

    runtime.emitChatStreamEventForState(state, 'tool-call', call('call-1'))
    runtime.emitChatStreamEventForState(state, 'tool-call', call('call-1'))
    runtime.emitChatStreamEventForState(state, 'tool-call', call('call-2'))
    runtime.emitChatStreamEventForState(state, 'tool-result', result('call-1', 'completed'))
    runtime.emitChatStreamEventForState(state, 'tool-result', result('call-1', 'failed'))
    runtime.emitChatStreamEventForState(state, 'tool-result', result('call-2', 'completed'))

    expect(emitted).toEqual([
      { event: 'tool-call', body: call('call-1') },
      { event: 'tool-call', body: call('call-2') },
      { event: 'tool-result', body: result('call-1', 'completed') },
      { event: 'tool-result', body: result('call-2', 'completed') },
    ])
  })

  it('deduplicates identical progress snapshots and drops late liveness after a terminal event', () => {
    const emitted: Array<{ event: unknown, body: unknown }> = []
    const runtime = createAlicizationChatStreamRuntime({
      normalizeTransportMessageContent: value => value,
      sanitizeText: value => typeof value === 'string' ? value : '',
      redactStaleInspectionHistoryMessages: messages => messages,
      dispatchChannel: 'test',
      emitContextEvent: (event, body) => {
        emitted.push({ event, body })
      },
      metaEvent: 'meta',
      chunkEvent: 'chunk',
      toolCallEvent: 'tool-call',
      toolProgressEvent: 'tool-progress',
      toolResultEvent: 'tool-result',
      finishEvent: 'finish',
      errorEvent: 'error',
      queueScopedAuditLog: vi.fn(async () => {}),
      appendRuntimeDebugLine: vi.fn(async () => {}),
    })
    const state = createState()
    const progress = (input: Partial<AlicizationChatToolProgressEvent>): AlicizationChatToolProgressEvent => ({
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId: 'codex-call-1',
      toolName: 'executor_run_codex',
      phase: 'running',
      signal: 'semantic-progress',
      elapsedMs: 100,
      occurredAt: 100,
      ...input,
    })

    runtime.emitChatStreamEventForState(state, 'tool-progress', progress({}))
    runtime.emitChatStreamEventForState(state, 'tool-progress', progress({}))
    runtime.emitChatStreamEventForState(state, 'tool-progress', progress({
      phase: 'completed',
      signal: 'terminal',
      elapsedMs: 120,
      occurredAt: 120,
      eventId: 'terminal-1',
    }))
    runtime.emitChatStreamEventForState(state, 'tool-progress', progress({
      signal: 'liveness',
      elapsedMs: 130,
      occurredAt: 130,
      eventId: 'late-heartbeat',
    }))

    expect(emitted).toEqual([
      { event: 'tool-progress', body: progress({}) },
      { event: 'tool-progress', body: progress({
        phase: 'completed',
        signal: 'terminal',
        elapsedMs: 120,
        occurredAt: 120,
        eventId: 'terminal-1',
      }) },
    ])
  })
})
