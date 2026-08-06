import { afterEach, describe, expect, it, vi } from 'vitest'

import { runAlicizationMainChatStream } from './main-chat-stream-runner'
import { createAlicizationTurnRuntime } from './turn-os/runtime'

const typedMemoryContextBlock = JSON.stringify({
  type: 'alicization-turn-memory-context',
  version: 'alicization-main-chat-memory-context-v1',
  workingMemory: {
    version: 'working-memory-owner-context-v1',
    owner: 'working-memory',
  },
  longTermRecall: {
    evidenceIds: ['memory-1'],
  },
})

function createPrepared(overrides?: Partial<any>) {
  return {
    chatConfig: {
      model: 'gpt-test',
    },
    messages: [
      {
        role: 'system',
        content: typedMemoryContextBlock,
      },
      { role: 'user', content: '你好' },
    ],
    waitForTools: true,
    tools: undefined,
    toolChoice: undefined,
    customDirectivesResolution: {
      text: '',
      source: 'none',
    },
    hasVisualGrounding: false,
    governance: {
      decisionTraceId: 'trace-1',
      turnMode: 'answer',
      truthState: 'grounded',
      liveSurface: 'grounded-scene',
      answerAct: 'answer',
      answerEvidenceMode: 'observed',
      personaKernelMode: 'full',
    },
    runtimeSurface: {} as any,
    sessionTrace: {} as any,
    getSessionTrace: () => ({ phaseOrder: [], history: [] }) as any,
    ...overrides,
  } as any
}

function createVisibleReplyExecution(overrides?: Partial<any>) {
  return {
    mode: 'provider-stream',
    expectedVisibleReplyAuthority: 'llm-mind',
    actualVisibleReplyAuthority: 'llm-mind',
    providerMindExecuted: true,
    reason: 'provider-stream',
    ...overrides,
  }
}

function createStreamMetaController() {
  let lastReply = ''
  return {
    emit: vi.fn((reply: string) => {
      lastReply = reply.trim()
    }),
    getLastReply: () => lastReply,
  }
}

function createProviderResponsePayload(overrides?: {
  workingMemoryVersion?: string | null
  longTermEvidenceIds?: string[]
  reply?: string
  [key: string]: unknown
}) {
  const {
    workingMemoryVersion,
    longTermEvidenceIds,
    ...payloadOverrides
  } = overrides ?? {}
  const performanceOverrides = payloadOverrides.performance
    && typeof payloadOverrides.performance === 'object'
    && !Array.isArray(payloadOverrides.performance)
    ? payloadOverrides.performance as Record<string, unknown>
    : {}
  const memoryUsageOverrides = payloadOverrides.memoryUsage
    && typeof payloadOverrides.memoryUsage === 'object'
    && !Array.isArray(payloadOverrides.memoryUsage)
    ? payloadOverrides.memoryUsage as Record<string, unknown>
    : {}
  const baseEmotion = typeof payloadOverrides.emotion === 'string'
    ? payloadOverrides.emotion
    : 'neutral'

  return JSON.stringify({
    format: 'mind-turn-v1',
    thought: 'obligation=answer; truth=grounded; focus=current-turn; move=answer-directly; tone=direct',
    emotion: 'neutral',
    reply: payloadOverrides.reply ?? '通过校验的模型回复',
    ...payloadOverrides,
    performance: {
      baseEmotion,
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
      ...performanceOverrides,
    },
    memoryUsage: {
      workingMemoryVersion: workingMemoryVersion ?? 'working-memory-owner-context-v1',
      longTermEvidenceIds: longTermEvidenceIds ?? ['memory-1'],
      ...memoryUsageOverrides,
    },
  })
}

function createProviderMemoryContext() {
  return {
    version: 'alicization-main-chat-memory-context-v1',
    workingMemory: {
      version: 'working-memory-owner-context-v1',
    },
    longTermRecall: null,
    availableLongTermEvidenceIds: ['memory-1'],
    providerSystemBlock: '{}',
  }
}

function createObservedRealization(
  visibleText: string,
  mode: 'provider-stream' | 'provider-one-shot' = 'provider-stream',
) {
  return {
    version: 'visible-reply-realization-v1',
    expectedAuthority: 'llm-mind',
    actualAuthority: 'llm-mind',
    providerMindExecuted: true,
    mode,
    visibleText,
    visibleReplyValidationStatus: 'approved',
    nonHumanAuthoredStatus: null,
    blockedReasons: [],
    critic: null,
    closure: null,
  } as const
}

afterEach(() => {
  vi.useRealTimers()
})

describe('main chat stream runner', () => {
  it('streams with the typed memory context unchanged', async () => {
    const providerText = createProviderResponsePayload({
      reply: '我记得我们刚才谈到这里。',
    })
    const streamTextImpl = vi.fn(async ({ messages, onEvent }) => {
      expect(messages).toEqual([
        {
          role: 'system',
          content: JSON.stringify({
            type: 'alicization-turn-memory-context',
            version: 'alicization-main-chat-memory-context-v1',
            workingMemory: {
              version: 'working-memory-owner-context-v1',
              owner: 'working-memory',
            },
            longTermRecall: {
              evidenceIds: ['memory-1'],
            },
          }),
        },
        { role: 'user', content: '你好' },
      ])

      const emit = onEvent as (event: any) => Promise<void>
      await emit({ type: 'text-delta', text: providerText })
      await emit({ type: 'finish', finishReason: 'stop' })
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-memory-context-only',
      } as any,
      prepared: createPrepared({
        messages: [
          {
            role: 'system',
            content: JSON.stringify({
              type: 'alicization-turn-memory-context',
              version: 'alicization-main-chat-memory-context-v1',
              workingMemory: {
                version: 'working-memory-owner-context-v1',
                owner: 'working-memory',
              },
              longTermRecall: {
                evidenceIds: ['memory-1'],
              },
            }),
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(result.finishReason).toBe('stop')
    expect(JSON.parse(result.fullText).reply).toBe('我记得我们刚才谈到这里。')
    expect(streamTextImpl).toHaveBeenCalledOnce()
  })

  it('does not force native response schema or convert emotional state into provider prose', async () => {
    const emotionalKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'hold',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'nearby-soft',
      valence: 0.62,
      arousal: 0.28,
      guardedness: 0.44,
      closenessDrive: 0.53,
      repairNeed: 0.31,
      initiativePressure: 0.24,
      reasonTags: ['stream-provider', 'continuity-authority'],
      why: 'keep the stream provider on the same emotion-memory-initiative-embodiment authority line',
    }
    const streamTextImpl = vi.fn(async ({ messages, onEvent, responseFormat }) => {
      const systemText = ((messages as Array<{ role?: string, content?: unknown }> | undefined) ?? [])
        .filter(message => message.role === 'system')
        .map(message => typeof message.content === 'string' ? message.content : '')
        .join('\n')

      expect(responseFormat).toBeUndefined()
      expect(systemText).not.toContain('[ALICIZATION_EMOTIONAL_KERNEL]')
      expect(systemText).not.toContain('emotional_kernel_')
      expect(JSON.stringify(messages)).not.toMatch(
        /Return ONLY one strict JSON|Output contract|must-follow|Response contract/iu,
      )

      const emit = onEvent as (event: any) => Promise<void>
      await emit({
        type: 'text-delta',
        text: createProviderResponsePayload({
          emotion: 'thinking',
          reply: '我会沿着同一份内在状态继续。',
        }),
      })
      await emit({ type: 'finish', finishReason: 'stop' })
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-emotional-kernel',
      } as any,
      prepared: createPrepared({
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '你好' },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              emotionalKernel,
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(result.finishReason).toBe('stop')
    expect(JSON.parse(result.fullText)).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      reply: '我会沿着同一份内在状态继续。',
    }))
    expect(streamTextImpl).toHaveBeenCalledOnce()
  })

  it('omits native response schema so providers without json_schema support can stream plain text', async () => {
    const emitChunk = vi.fn()
    const streamTextImpl = vi.fn(async ({ onEvent, responseFormat }) => {
      expect(responseFormat).toBeUndefined()
      const emit = onEvent as (event: any) => Promise<void>
      await emit({ type: 'text-delta', text: '我可以直接这样回答。' })
      await emit({ type: 'finish', finishReason: 'stop' })
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-plain-provider',
      } as any,
      prepared: createPrepared({
        chatConfig: {
          model: 'test-model',
        },
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(result.fullText).toBe('我可以直接这样回答。')
    expect(result.visibleReplyRealization.visibleText).toBe('我可以直接这样回答。')
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '我可以直接这样回答。',
      origin: 'provider',
    }))
  })

  it('sends portable non-strict tools to OpenAI-compatible gateways', async () => {
    const streamTextImpl = vi.fn(async ({ tools, onEvent }) => {
      expect(tools).toEqual([
        expect.objectContaining({
          execute: expect.any(Function),
          function: expect.objectContaining({
            name: 'sample_tool',
            strict: false,
            parameters: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                },
              },
              additionalProperties: false,
            },
          }),
        }),
      ])
      const emit = onEvent as (event: any) => Promise<void>
      await emit({ type: 'text-delta', text: '工具协议已兼容。' })
      await emit({ type: 'finish', finishReason: 'stop' })
    })

    await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-portable-tools',
        providerId: 'openai-compatible',
      } as any,
      prepared: createPrepared({
        messages: [
          { role: 'user', content: '你好' },
        ],
        tools: [{
          type: 'function',
          execute: vi.fn(),
          function: {
            name: 'sample_tool',
            description: 'Sample tool',
            strict: true,
            parameters: {
              $schema: 'http://json-schema.org/draft-07/schema#',
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  format: 'uri',
                },
              },
              additionalProperties: false,
            },
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(streamTextImpl).toHaveBeenCalledOnce()
  })

  it('collects provider text from compatible delta event shapes instead of ending with an empty settlement', async () => {
    const emitChunk = vi.fn()
    const streamTextImpl = vi.fn(async ({ onEvent }) => {
      const emit = onEvent as (event: any) => Promise<void>
      await emit({ type: 'text_delta', delta: '你好，' })
      await emit({ type: 'content-delta', content: '我在这里。' })
      await emit({ type: 'finish', finishReason: 'stop' })
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-delta-compatible-provider',
      } as any,
      prepared: createPrepared({
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(result.fullText).toBe('你好，我在这里。')
    expect(result.visibleReplyRealization.visibleText).toBe('你好，我在这里。')
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '你好，我在这里。',
      origin: 'provider',
    }))
  })

  it('keeps provider text provisional until the complete response passes settlement', async () => {
    const emitChunk = vi.fn()
    const fullText = createProviderResponsePayload()
    const splitAt = Math.floor(fullText.length / 2)
    const streamTextImpl = vi.fn(async ({ onEvent }) => {
      await onEvent({ type: 'text-delta', text: fullText.slice(0, splitAt) })
      expect(emitChunk).not.toHaveBeenCalled()
      await onEvent({ type: 'text-delta', text: fullText.slice(splitAt) })
      expect(emitChunk).not.toHaveBeenCalled()
      await onEvent({ type: 'finish', finishReason: 'stop' })
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-settlement',
      } as any,
      prepared: createPrepared({
        memoryContext: createProviderMemoryContext(),
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(emitChunk).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-provider-settlement',
      text: '通过校验的模型回复',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    }))
    expect(result).toEqual(expect.objectContaining({
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    }))
  })

  it('rejects provider memory claims that reference unavailable long-term evidence', async () => {
    const emitChunk = vi.fn()
    const fullText = createProviderResponsePayload({
      longTermEvidenceIds: ['memory-not-provided'],
    })
    const streamTextImpl = vi.fn(async ({ onEvent }) => {
      await onEvent({ type: 'text-delta', text: fullText })
      await onEvent({ type: 'finish', finishReason: 'stop' })
    })

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-memory-invalid',
      } as any,
      prepared: createPrepared({
        memoryContext: createProviderMemoryContext(),
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })).rejects.toThrow('provider-memory-usage-invalid')

    expect(emitChunk).not.toHaveBeenCalled()
  })

  it('uses the visual grounding one-shot path when capture grounding is required', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const streamTextImpl = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: createProviderResponsePayload({ reply: '我先看着这个窗口。' }),
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-1',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '看看屏幕。' },
        ],
      }),
      headers: {
        authorization: 'Bearer test',
      },
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl,
    })

    const parsed = JSON.parse(result.fullText) as {
      format?: string
      reply?: string
    }

    expect(result.finishReason).toBe('stop')
    expect(result.visibleReplyExecution).toEqual(createVisibleReplyExecution({
      mode: 'provider-one-shot',
      reason: 'visual-grounding-one-shot',
    }))
    expect(parsed.format).toBe('mind-turn-v1')
    expect(parsed.reply).toBe('我先看着这个窗口。')
    expect(generateNonStreaming).toHaveBeenCalledOnce()
    expect(streamTextImpl).not.toHaveBeenCalled()
    expect(incrementChunkStats).toHaveBeenCalledWith('我先看着这个窗口。')
    expect(streamMeta.emit).toHaveBeenCalledWith('我先看着这个窗口。')
    expect(emitChunk).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-1',
      text: '我先看着这个窗口。',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    })
    expect(result).toEqual(expect.objectContaining({
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    }))
  })

  it('accepts plain-text visual grounding output as provider-authored visible reply', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: '我先看着这个窗口。',
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-structured-host-visible',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '看看屏幕。' },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'identity-continuity',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl: vi.fn(),
    })

    expect(result.fullText).toBe('我先看着这个窗口。')
    expect(result.visibleReplyExecution).toEqual(createVisibleReplyExecution({
      mode: 'provider-one-shot',
      reason: 'visual-grounding-one-shot',
    }))
    expect(result.visibleReplyRealization.visibleText).toBe('我先看着这个窗口。')
    expect(generateNonStreaming).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '我先看着这个窗口。',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
    }))
    expect(incrementChunkStats).toHaveBeenCalledWith('我先看着这个窗口。')
    expect(streamMeta.emit).toHaveBeenCalledWith('我先看着这个窗口。')
  })

  it('keeps visual one-shot Provider JSON byte-for-byte and carries settlement only as a sidecar', async () => {
    const rawFullText = `{
  "memoryUsage": {
    "longTermEvidenceIds": [],
    "workingMemoryVersion": "working-memory-owner-context-v1"
  },
  "performance": {
    "emphasis": 1,
    "delivery": "firm",
    "actionCue": null,
    "facialCue": null,
    "baseEmotion": "thinking"
  },
  "reply": "  视觉原样回答。  ",
  "emotion": "thinking",
  "thought": "keep visual provider bytes",
  "format": "mind-turn-v1"
}`
    const visibleReplyRealization = createObservedRealization(
      '  视觉原样回答。  ',
      'provider-one-shot',
    )
    const settleStructuredVisibleReply = vi.fn(async input => ({
      ...input,
      fullText: createProviderResponsePayload({
        reply: 'settlement must not replace the Provider reply',
      }),
      visibleReplyRealization,
    }))
    const emitChunk = vi.fn()

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-byte-preservation',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        memoryContext: createProviderMemoryContext(),
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(async () => ({
        finishReason: 'stop',
        fullText: rawFullText,
      })),
      settleStructuredVisibleReply,
      streamTextImpl: vi.fn(),
    })

    expect(result.fullText).toBe(rawFullText)
    expect(Object.keys(JSON.parse(result.fullText))).toEqual([
      'memoryUsage',
      'performance',
      'reply',
      'emotion',
      'thought',
      'format',
    ])
    expect(JSON.parse(result.fullText)).not.toHaveProperty('visibleReplyRealization')
    expect(result.visibleReplyRealization).toMatchObject(visibleReplyRealization)
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '  视觉原样回答。  ',
    }))
  })

  it('keeps provider-stream JSON byte-for-byte, emits payload.reply, and settles lifecycle from the sidecar', async () => {
    const rawFullText = `{
  "format": "mind-turn-v1",
  "thought": "keep stream provider bytes",
  "emotion": "neutral",
  "reply": "  流式原样回答。  ",
  "performance": {
    "baseEmotion": "neutral",
    "facialCue": null,
    "actionCue": null,
    "delivery": "calm",
    "emphasis": 0
  },
  "memoryUsage": {
    "workingMemoryVersion": "working-memory-owner-context-v1",
    "longTermEvidenceIds": ["memory-1"]
  }
}`
    const visibleReplyRealization = createObservedRealization('  流式原样回答。  ')
    const settleStructuredVisibleReply = vi.fn(async input => ({
      ...input,
      fullText: createProviderResponsePayload({
        reply: 'settlement must not replace the streamed Provider reply',
      }),
      visibleReplyRealization,
    }))
    const turnRuntime = createAlicizationTurnRuntime({
      now: () => 1000,
    })
    const turnRuntimeContext = turnRuntime.beginTurn({
      cardId: 'card-1',
      turnId: 'turn-stream-byte-preservation',
      governance: {
        decisionTraceId: 'trace-stream-byte-preservation',
      },
    })
    const emitChunk = vi.fn()

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-byte-preservation',
      } as any,
      prepared: createPrepared({
        memoryContext: createProviderMemoryContext(),
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      settleStructuredVisibleReply,
      delayVisibleRelease: true,
      turnRuntimeContext,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: rawFullText.slice(0, 80) })
        await emit({ type: 'text-delta', text: rawFullText.slice(80) })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result.fullText).toBe(rawFullText)
    expect(JSON.parse(result.fullText)).not.toHaveProperty('visibleReplyRealization')
    expect(result.visibleReplyRealization).toMatchObject(visibleReplyRealization)
    expect(emitChunk).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '  流式原样回答。  ',
    }))
    expect(turnRuntimeContext.stageSettlements.find(item => item.stage === 'surface')).toMatchObject({
      status: 'completed',
    })
    expect(turnRuntimeContext.stageSettlements.find(item => item.stage === 'delivery')).toMatchObject({
      status: 'completed',
    })
  })

  it('rejects extra Provider fields before releasing a provider-stream reply', async () => {
    const emitChunk = vi.fn()
    const fullText = createProviderResponsePayload({
      reply: '不应释放。',
      parsePath: 'json',
    })

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-extra-field',
      } as any,
      prepared: createPrepared({
        memoryContext: createProviderMemoryContext(),
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: fullText })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })).rejects.toThrow('provider-payload-fields-invalid')

    expect(emitChunk).not.toHaveBeenCalled()
  })

  it('streams deltas, waits through tool-calls finishes, and records reminder debug signals', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const emitToolCall = vi.fn()
    const emitToolResult = vi.fn()
    const logReminderToolCall = vi.fn()
    const logReminderToolResult = vi.fn()
    const nonProgressEventTypes = new Set<string>()
    const providerText = createProviderResponsePayload({ reply: '你好。' })
    const splitAt = Math.floor(providerText.length / 2)

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-2',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall,
      emitToolResult,
      streamMeta,
      nonProgressEventTypes,
      generateNonStreaming: vi.fn(),
      logReminderToolCall,
      logReminderToolResult,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'provider-keepalive' })
        await emit({ type: 'text-delta', text: providerText.slice(0, splitAt) })
        await emit({ type: 'tool-call', name: 'set_reminder', toolCallId: 'call-1', arguments: { minutes: 5 } })
        await emit({
          type: 'tool-result',
          toolCallId: 'call-1',
          result: {
            status: 'scheduled',
            triggerAt: 123456,
            message: '5分钟后提醒',
          },
        })
        await emit({ type: 'text-delta', text: providerText.slice(splitAt) })
        await emit({ type: 'finish', finishReason: 'tool_calls' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result).toEqual(expect.objectContaining({
      finishReason: 'stop',
      visibleReplyExecution: createVisibleReplyExecution(),
    }))
    expect(JSON.parse(result.fullText)).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      reply: '你好。',
    }))
    expect([...nonProgressEventTypes]).toEqual(['provider-keepalive'])
    expect(incrementChunkStats).toHaveBeenCalledOnce()
    expect(incrementChunkStats).toHaveBeenCalledWith('你好。')
    expect(emitChunk).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-2',
      text: '你好。',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    })
    expect(streamMeta.emit).toHaveBeenCalledTimes(1)
    expect(streamMeta.emit).toHaveBeenCalledWith('你好。')
    expect(emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'call-1',
      toolName: 'set_reminder',
    }))
    expect(emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'call-1',
      result: expect.objectContaining({
        status: 'scheduled',
      }),
    }))
    expect(logReminderToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'call-1',
      toolName: 'set_reminder',
    }))
    expect(logReminderToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'call-1',
      summary: expect.objectContaining({
        status: 'scheduled',
        triggerAt: 123456,
      }),
    }))
  })

  it('buffers structured mind-turn deltas and releases only reply text on the visible stream surface', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()

    const structuredText = createProviderResponsePayload({
      thought: 'I considered the current request.',
      emotion: 'thinking',
      reply: '你好。',
    })
    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-structured-stream',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: structuredText.slice(0, 48) })
        await emit({ type: 'text-delta', text: structuredText.slice(48) })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result).toEqual(expect.objectContaining({
      finishReason: 'stop',
      visibleReplyExecution: createVisibleReplyExecution(),
    }))
    expect(JSON.parse(result.fullText).reply).toBe('你好。')
    expect(emitChunk).toHaveBeenCalledTimes(1)
    expect(emitChunk).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-structured-stream',
      text: '你好。',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    })
    expect(incrementChunkStats).toHaveBeenCalledWith('你好。')
    expect(streamMeta.emit).toHaveBeenCalledWith('你好。')
  })

  it('settles delayed plain provider text without releasing it early', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const settleStructuredVisibleReply = vi.fn()

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-delayed-visible-release',
      } as any,
      prepared: createPrepared({
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      settleStructuredVisibleReply,
      delayVisibleRelease: true,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: '我先直接回答你。' })
        expect(emitChunk).not.toHaveBeenCalled()
        await emit({ type: 'text-delta', text: '这句应该先被闭环验收。' })
        expect(emitChunk).not.toHaveBeenCalled()
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result.fullText).toBe('我先直接回答你。这句应该先被闭环验收。')
    expect(result.visibleReplyRealization.visibleText).toBe('我先直接回答你。这句应该先被闭环验收。')
    expect(settleStructuredVisibleReply).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '我先直接回答你。这句应该先被闭环验收。',
      origin: 'provider',
    }))
    expect(incrementChunkStats).toHaveBeenCalledWith('我先直接回答你。这句应该先被闭环验收。')
    expect(streamMeta.emit).toHaveBeenCalledWith('我先直接回答你。这句应该先被闭环验收。')
  })

  it('aborts with a first-event-timeout when the stream never produces progress', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-timeout',
      } as any,
      prepared: createPrepared(),
      controller,
      firstEventTimeoutMs: 25,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: () => new Promise(() => {}),
    })
    const settled = promise.catch(error => error)

    await vi.advanceTimersByTimeAsync(25)

    await expect(settled).resolves.toMatchObject({
      name: 'AbortError',
    })
    expect(controller.signal.aborted).toBe(true)
  })

  it('records debug diagnostics when the stream settles without a progress event', async () => {
    vi.useFakeTimers()
    const appendRuntimeDebugLine = vi.fn(async () => {})

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-non-progress',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'response-metadata' })
      },
    })
    const settled = promise.catch(error => error)

    await vi.advanceTimersByTimeAsync(1_600)

    await expect(settled).resolves.toMatchObject({
      name: 'AbortError',
    })

    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.non-progress-event', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-non-progress',
      eventType: 'response-metadata',
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.first-event-timeout-grace-armed', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-non-progress',
      graceTimeoutMs: 1000,
      lastEventType: 'response-metadata',
      nonProgressEventTypes: ['response-metadata'],
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.first-event-timeout-fired', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-non-progress',
      timeoutPhase: 'grace',
      sawAnyEvent: true,
      firstEventGraceApplied: true,
      lastEventType: 'response-metadata',
      nonProgressEventTypes: ['response-metadata'],
    }))
  })

  it('allows delayed first progress after non-progress activity within grace window', async () => {
    vi.useFakeTimers()
    const appendRuntimeDebugLine = vi.fn(async () => {})

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-delayed-first-progress',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'response-metadata' })
        await new Promise(resolve => setTimeout(resolve, 900))
        await emit({
          type: 'text-delta',
          text: createProviderResponsePayload({ reply: '你好' }),
        })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    await vi.advanceTimersByTimeAsync(1_600)
    const result = await promise

    expect(result).toEqual(expect.objectContaining({
      finishReason: 'stop',
      visibleReplyExecution: createVisibleReplyExecution(),
    }))
    expect(JSON.parse(result.fullText)).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      reply: '你好',
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.first-event-timeout-grace-armed', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-delayed-first-progress',
      graceTimeoutMs: 1000,
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.first-progress-event', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-delayed-first-progress',
      eventType: 'text-delta',
    }))
    expect(appendRuntimeDebugLine).not.toHaveBeenCalledWith('chat-stream.first-event-timeout-fired', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-delayed-first-progress',
    }))
  })

  it('allows provider text when execution tools are offered', async () => {
    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-tools-offered-text-reply',
      } as any,
      prepared: createPrepared({
        tools: [
          {
            function: {
              name: 'executor_run_cli',
            },
          },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine: vi.fn(async () => {}),
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: '我先看看。' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })).resolves.toMatchObject({
      finishReason: 'stop',
      fullText: '我先看看。',
      origin: 'provider',
    })
  })
})
