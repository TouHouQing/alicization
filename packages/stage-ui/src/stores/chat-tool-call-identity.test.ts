import { describe, expect, it } from 'vitest'

import { resolveChatToolCallProjection } from './chat-tool-call-identity'

const card = {
  toolCallId: 'tool-call-1',
  toolName: 'coding_agent',
  selectedChannel: 'codex',
  phase: 'running',
  terminal: false,
  revision: 2,
  elapsedMs: 1_000,
  timeoutMs: null,
  errorCode: null,
  errorMessage: null,
  step: null,
  result: undefined,
} as const

describe('chat tool call projection identity', () => {
  it('accepts a main-owned projection with the same canonical toolCallId', () => {
    expect(resolveChatToolCallProjection({
      eventType: 'tool-progress',
      toolCallId: 'tool-call-1',
      toolName: 'coding_agent',
      projection: {
        factType: 'tool-progress',
        accepted: true,
        traceOnly: false,
        card,
      },
    })).toEqual(card)
  })

  it('throws a structured delivery error for a tool fact without a main-owned projection', () => {
    expect(() => resolveChatToolCallProjection({
      eventType: 'tool-progress',
      toolCallId: 'tool-call-1',
      toolName: 'coding_agent',
    })).toThrow(expect.objectContaining({
      name: 'AlicizationToolEventDeliveryError',
      code: 'ALICIZATION_TOOL_EVENT_DELIVERY_FAILED',
      eventType: 'tool-progress',
      toolCallId: 'tool-call-1',
      toolName: 'coding_agent',
    }))
  })

  it('throws when the canonical projection toolCallId does not match the event', () => {
    expect(() => resolveChatToolCallProjection({
      eventType: 'tool-progress',
      toolCallId: 'tool-call-other',
      toolName: 'coding_agent',
      projection: {
        factType: 'tool-progress',
        accepted: true,
        traceOnly: false,
        card,
      },
    })).toThrow(expect.objectContaining({
      code: 'ALICIZATION_TOOL_EVENT_DELIVERY_FAILED',
      eventType: 'tool-progress',
      toolCallId: 'tool-call-other',
    }))
  })

  it('keeps trace-only facts out of the visible tool card projection', () => {
    expect(resolveChatToolCallProjection({
      eventType: 'tool-progress',
      toolCallId: 'tool-call-1',
      toolName: 'coding_agent',
      projection: {
        factType: 'tool-progress',
        accepted: false,
        traceOnly: true,
        card: {
          ...card,
          phase: 'completed',
          terminal: true,
        },
      },
    })).toBeNull()
  })

  it('throws a structured delivery error for malformed external projections', () => {
    expect(() => resolveChatToolCallProjection({
      eventType: 'tool-progress',
      toolCallId: 'tool-call-1',
      toolName: 'coding_agent',
      projection: {} as any,
    })).toThrow(expect.objectContaining({
      code: 'ALICIZATION_TOOL_EVENT_DELIVERY_FAILED',
      eventType: 'tool-progress',
      toolCallId: 'tool-call-1',
    }))
  })
})
