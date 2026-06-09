import { afterEach, describe, expect, it, vi } from 'vitest'

import { generateAlicizationMainChatNonStreaming } from './main-chat-one-shot'

function createInput(overrides?: Partial<any>) {
  return {
    chatConfig: {
      model: 'gpt-test',
      baseURL: 'https://example.test/v1',
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
    headers: {
      authorization: 'Bearer test',
    },
    tools: undefined,
    toolChoice: undefined,
    timeoutMs: 2500,
    ...overrides,
  } as any
}

afterEach(() => {
  vi.useRealTimers()
})

describe('main chat one-shot project-state placeholder shell', () => {
  it('rejects one-shot generation when messages carry placeholder-filled canonical-looking project-state shells', async () => {
    const generateTextImpl = vi.fn(async () => ({
      text: 'should not run',
      finishReason: 'stop',
    }))

    await expect(generateAlicizationMainChatNonStreaming(createInput({
      generateTextImpl,
    }))).rejects.toThrow('Alicization one-shot messages must include canonical project-state context before generation.')

    expect(generateTextImpl).not.toHaveBeenCalled()
  })
})
