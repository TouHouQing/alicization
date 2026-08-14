import type { AlicizationRuntimeToolProjectionReducer } from '@proj-alicization/stage-shared'

import type {
  AlicizationChatToolCallInput,
  AlicizationChatToolProgressInput,
  AlicizationChatToolResultInput,
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
    } satisfies AlicizationChatToolCallInput)
    runtime.emitChatStreamEventForState(state, 'chunk', {
      cardId: state.cardId,
      turnId: state.turnId,
      text: 'late',
    })

    expect(emitted).toEqual([
      { event: 'error', body: errorBody },
    ])
  })

  it('does not throw when a tool fact has no canonical toolCallId', () => {
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

    expect(() => runtime.emitChatStreamEventForState(state, 'tool-progress', {
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId: '',
      toolName: 'codex',
      phase: 'running',
      elapsedMs: 40,
    })).not.toThrow()

    expect(emitted[0]).toMatchObject({
      event: 'tool-progress',
      body: {
        projection: {
          accepted: false,
          traceOnly: true,
          card: {
            errorCode: 'TOOL_PROJECTION_INVALID',
          },
        },
      },
    })
  })

  it('throws a structured delivery error when every tool projection transport fails', () => {
    const queueScopedAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationChatStreamRuntime({
      normalizeTransportMessageContent: value => value,
      sanitizeText: value => typeof value === 'string' ? value : '',
      redactStaleInspectionHistoryMessages: messages => messages,
      dispatchChannel: 'test',
      emitContextEvent: () => {
        throw new Error('eventa renderer delivery failed')
      },
      metaEvent: 'meta',
      chunkEvent: 'chunk',
      toolCallEvent: 'tool-call',
      toolProgressEvent: 'tool-progress',
      toolResultEvent: 'tool-result',
      finishEvent: 'finish',
      errorEvent: 'error',
      queueScopedAuditLog,
      appendRuntimeDebugLine: vi.fn(async () => {}),
    })
    const state = createState()

    expect(() => runtime.emitChatStreamEventForState(state, 'tool-call', {
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId: 'tool-eventa-fallback-failure',
      toolName: 'codex',
      selectedChannel: 'codex',
    })).toThrow(expect.objectContaining({
      name: 'AlicizationToolEventDeliveryError',
      code: 'ALICIZATION_TOOL_EVENT_DELIVERY_FAILED',
      eventType: 'tool-call',
      toolCallId: 'tool-eventa-fallback-failure',
      toolName: 'codex',
    }))

    expect(queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-eventa-dispatch-failed',
      payload: expect.objectContaining({
        eventType: 'tool-call',
        reason: 'eventa renderer delivery failed',
      }),
    }))
  })

  it('keeps a late tool fact traceable after the run is terminal', () => {
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
    state.state = 'finished'
    const toolProjection: AlicizationRuntimeToolProjectionReducer = {
      reduce: vi.fn<AlicizationRuntimeToolProjectionReducer['reduce']>(() => ({
        factType: 'tool-progress',
        accepted: false,
        traceOnly: true,
        card: {
          toolCallId: 'late-tool',
          toolName: 'codex',
          selectedChannel: 'codex',
          phase: 'completed',
          terminal: true,
          revision: 2,
          elapsedMs: 100,
          timeoutMs: null,
          errorCode: null,
          errorMessage: null,
          step: null,
          result: { status: 'completed' },
        },
      })),
      getCard: vi.fn<AlicizationRuntimeToolProjectionReducer['getCard']>(() => ({
        toolCallId: 'late-tool',
        toolName: 'codex',
        selectedChannel: 'codex' as const,
        phase: 'completed' as const,
        terminal: true,
        revision: 2,
        elapsedMs: 100,
        timeoutMs: null,
        errorCode: null,
        errorMessage: null,
        step: null,
        result: { status: 'completed' },
      })),
      listCards: vi.fn(() => []),
      listTrace: vi.fn(() => []),
    }
    state.toolProjection = toolProjection

    runtime.emitChatStreamEventForState(state, 'tool-progress', {
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId: 'late-tool',
      toolName: 'codex',
      phase: 'running',
      elapsedMs: 200,
    })

    expect(toolProjection.reduce).toHaveBeenCalled()
    expect(emitted[0]).toMatchObject({
      event: 'tool-progress',
      body: {
        projection: {
          accepted: false,
          traceOnly: true,
        },
      },
    })
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
    } satisfies AlicizationChatToolCallInput)
    const result = (toolCallId: string, status: string) => ({
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId,
      result: { status },
    } satisfies AlicizationChatToolResultInput)

    runtime.emitChatStreamEventForState(state, 'tool-call', call('call-1'))
    runtime.emitChatStreamEventForState(state, 'tool-call', call('call-1'))
    runtime.emitChatStreamEventForState(state, 'tool-call', call('call-2'))
    runtime.emitChatStreamEventForState(state, 'tool-result', result('call-1', 'completed'))
    runtime.emitChatStreamEventForState(state, 'tool-result', result('call-1', 'failed'))
    runtime.emitChatStreamEventForState(state, 'tool-result', result('call-2', 'completed'))

    expect(emitted).toEqual([
      expect.objectContaining({
        event: 'tool-call',
        body: expect.objectContaining({
          toolCallId: 'call-1',
          projection: expect.objectContaining({
            card: expect.objectContaining({
              toolCallId: 'call-1',
              phase: 'started',
            }),
          }),
        }),
      }),
      expect.objectContaining({
        event: 'tool-call',
        body: expect.objectContaining({
          toolCallId: 'call-2',
          projection: expect.objectContaining({
            card: expect.objectContaining({
              toolCallId: 'call-2',
              phase: 'started',
            }),
          }),
        }),
      }),
      expect.objectContaining({
        event: 'tool-result',
        body: expect.objectContaining({
          toolCallId: 'call-1',
          result: { status: 'completed' },
          projection: expect.objectContaining({
            card: expect.objectContaining({
              toolCallId: 'call-1',
              phase: 'completed',
              terminal: true,
            }),
          }),
        }),
      }),
      expect.objectContaining({
        event: 'tool-result',
        body: expect.objectContaining({
          toolCallId: 'call-2',
          result: { status: 'completed' },
          projection: expect.objectContaining({
            card: expect.objectContaining({
              toolCallId: 'call-2',
              phase: 'completed',
              terminal: true,
            }),
          }),
        }),
      }),
    ])
  })

  it('preserves the durable observation phase on tool-result projection', () => {
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

    runtime.emitChatStreamEventForState(state, 'tool-call', {
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId: 'cancelled-observation',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
    })
    runtime.emitChatStreamEventForState(state, 'tool-result', {
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId: 'cancelled-observation',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
      phase: 'cancelled',
    } as AlicizationChatToolResultInput & { phase: 'cancelled' })

    expect(emitted.at(-1)).toMatchObject({
      event: 'tool-result',
      body: {
        projection: {
          accepted: true,
          traceOnly: false,
          card: {
            phase: 'cancelled',
            terminal: true,
          },
        },
      },
    })
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
    const progress = (input: Partial<AlicizationChatToolProgressInput>): AlicizationChatToolProgressInput => ({
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

    expect(emitted).toHaveLength(3)
    expect(emitted[0]).toMatchObject({
      event: 'tool-progress',
      body: {
        toolCallId: 'codex-call-1',
        selectedChannel: 'codex',
        projection: {
          accepted: true,
          traceOnly: false,
          card: {
            toolCallId: 'codex-call-1',
            selectedChannel: 'codex',
            phase: 'running',
            terminal: false,
          },
        },
      },
    })
    expect(emitted[1]).toMatchObject({
      event: 'tool-progress',
      body: {
        projection: {
          accepted: true,
          traceOnly: false,
          card: {
            phase: 'completed',
            terminal: true,
          },
        },
      },
    })
    expect(emitted[2]).toMatchObject({
      event: 'tool-progress',
      body: {
        eventId: 'late-heartbeat',
        projection: {
          accepted: false,
          traceOnly: true,
          card: {
            phase: 'completed',
            terminal: true,
          },
        },
      },
    })
  })

  it('keeps trace-only late progress visible after a turn error', () => {
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
    const progress = (input: Partial<AlicizationChatToolProgressInput>): AlicizationChatToolProgressInput => ({
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId: 'codex-error-call-1',
      toolName: 'codex',
      phase: 'completed',
      signal: 'terminal',
      elapsedMs: 100,
      occurredAt: 100,
      eventId: 'terminal-before-error',
      ...input,
    })

    runtime.emitChatStreamEventForState(state, 'tool-call', {
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId: 'codex-error-call-1',
      toolName: 'codex',
    })
    runtime.emitChatStreamEventForState(state, 'tool-progress', progress({}))
    runtime.emitChatStreamEventForState(state, 'error', {
      cardId: state.cardId,
      turnId: state.turnId,
      error: 'Provider continuation failed.',
    })
    runtime.emitChatStreamEventForState(state, 'tool-progress', progress({
      phase: 'running',
      signal: 'liveness',
      elapsedMs: 120,
      occurredAt: 120,
      eventId: 'late-after-error',
    }))

    expect(emitted).toHaveLength(4)
    expect(emitted[2]).toMatchObject({
      event: 'error',
      body: {
        error: 'Provider continuation failed.',
      },
    })
    expect(emitted[3]).toMatchObject({
      event: 'tool-progress',
      body: {
        eventId: 'late-after-error',
        projection: {
          accepted: false,
          traceOnly: true,
          card: {
            phase: 'completed',
            terminal: true,
          },
        },
      },
    })
  })

  it('projects the selected coding-agent channel from main-process facts', () => {
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

    runtime.emitChatStreamEventForState(state, 'tool-call', {
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId: 'coding-agent-call-1',
      toolName: 'coding_agent',
      arguments: {
        agent: 'claude-code',
        prompt: '检查仓库',
      },
    })
    runtime.emitChatStreamEventForState(state, 'tool-progress', {
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId: 'coding-agent-call-1',
      toolName: 'coding_agent',
      selectedChannel: 'claude-code',
      phase: 'running',
      elapsedMs: 1_000,
    })
    runtime.emitChatStreamEventForState(state, 'tool-result', {
      cardId: state.cardId,
      turnId: state.turnId,
      toolCallId: 'coding-agent-call-1',
      toolName: 'coding_agent',
      result: {
        status: 'completed',
        selectedChannel: 'claude-code',
      },
    })

    expect(emitted.map(entry => entry.body)).toEqual([
      expect.objectContaining({
        selectedChannel: null,
        projection: expect.objectContaining({
          card: expect.objectContaining({
            toolCallId: 'coding-agent-call-1',
            selectedChannel: null,
          }),
        }),
      }),
      expect.objectContaining({
        selectedChannel: 'claude-code',
        projection: expect.objectContaining({
          card: expect.objectContaining({
            phase: 'running',
            selectedChannel: 'claude-code',
          }),
        }),
      }),
      expect.objectContaining({
        selectedChannel: 'claude-code',
        projection: expect.objectContaining({
          card: expect.objectContaining({
            phase: 'completed',
            terminal: true,
            selectedChannel: 'claude-code',
          }),
        }),
      }),
    ])
  })
})
