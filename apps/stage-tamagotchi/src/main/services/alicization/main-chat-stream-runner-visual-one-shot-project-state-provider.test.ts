import type { Message } from '@xsai/shared-chat'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { generateAlicizationMainChatNonStreaming } from './main-chat-one-shot'
import { carriesAlicizationCanonicalProjectState } from './main-chat-project-state-guard'
import { runAlicizationMainChatStream } from './main-chat-stream-runner'
import { buildAlicizationProjectStateSystemBlock } from './project-state-brief'

function createPrepared(overrides?: Partial<any>) {
  return {
    chatConfig: {
      model: 'gpt-test',
    },
    messages: [
      {
        role: 'system',
        content: buildAlicizationProjectStateSystemBlock(),
      },
      { role: 'user', content: '你先看看这个窗口。' },
    ],
    waitForTools: true,
    tools: undefined,
    toolChoice: undefined,
    customDirectivesResolution: {
      text: '',
      source: 'none',
    },
    hasVisualGrounding: true,
    governance: {
      decisionTraceId: 'trace-visual-project-state-provider',
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

function createStreamMetaController() {
  let lastReply = ''
  return {
    emit: vi.fn((reply: string) => {
      lastReply = reply.trim()
    }),
    getLastReply: () => lastReply,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('main chat stream runner visual one-shot project-state carry', () => {
  it('passes visual one-shot provider messages through the one-shot project-state guard', async () => {
    const observedProviderMessages: Message[][] = []

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-one-shot-project-state-provider',
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
      generateNonStreaming: async (input) => {
        return await generateAlicizationMainChatNonStreaming({
          chatConfig: input.chatConfig,
          messages: input.messages,
          headers: input.headers,
          tools: input.tools,
          toolChoice: input.toolChoice,
          timeoutMs: input.timeoutMs,
          generateTextImpl: async (providerInput) => {
            observedProviderMessages.push((((providerInput as { messages?: Message[] }).messages) ?? []).slice())
            return {
              finishReason: 'stop',
              text: '我先看着这个窗口。',
            }
          },
        })
      },
      streamTextImpl: vi.fn(),
    })

    expect(result.finishReason).toBe('stop')
    expect(observedProviderMessages).toHaveLength(1)
    expect(carriesAlicizationCanonicalProjectState(observedProviderMessages[0]!)).toBe(true)

    const canonicalProjectStateSystemMessage = observedProviderMessages[0].find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_PROJECT_STATE]')
      && message.content.includes('current_phase=')
      && message.content.includes('current_objective=')
      && message.content.includes('project_preflight=')
      && message.content.includes('latest_landed_progress=')
      && message.content.includes('same_her_self_line=')
      && message.content.includes('same_her_drift_risk=')
      && message.content.includes('primary_open_loop=')
      && message.content.includes('next_closure_target='),
    )

    expect(canonicalProjectStateSystemMessage).toBeDefined()
  })
})
