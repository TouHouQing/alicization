import { afterEach, describe, expect, it, vi } from 'vitest'

import { runAlicizationMainChatStream } from './main-chat-stream-runner'

function createPrepared(overrides?: Partial<any>) {
  return {
    chatConfig: {
      model: 'gpt-test',
    },
    messages: [
      {
        role: 'system',
        content: [
          '[ALICIZATION_PROJECT_STATE]',
          'project_preflight=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          'current_phase=Phase 1: Local Digital Life',
          'current_objective=Build a local companion on the host computer with continuous personhood, stable memory, emotional state, initiative, execution ability, embodied expression, and natural dialogue.',
          'latest_landed_progress=none',
          'same_her_self_line=Same Phase 1 digital life. Unfinished closure still needs the same living line.',
          'same_her_drift_risk=none',
          'primary_open_loop=none',
          'next_closure_target=none',
        ].join('\n'),
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

describe('main chat stream runner project-state placeholder shell', () => {
  it('rejects stream generation when messages carry placeholder-filled canonical-looking project-state shells', async () => {
    const streamTextImpl = vi.fn(async () => {})

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-placeholder-project-state',
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
      streamTextImpl,
    })).rejects.toThrow('Alicization stream messages must include canonical project-state context before generation.')

    expect(streamTextImpl).not.toHaveBeenCalled()
  })
})
