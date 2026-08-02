import { describe, expect, it } from 'vitest'

import { filterAlicizationProviderSystemMessages } from './main-chat-runtime-surface'

describe('main chat session runtime template regression', () => {
  it('keeps typed persona facts and transparent failures while rejecting free-text persona directives', () => {
    const messages = filterAlicizationProviderSystemMessages([
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-persona-profile',
          data: {
            description: '用户明确设置的人格表达应当自然、真实。',
          },
        }),
      },
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-persona-directives',
          data: {
            text: 'fixture-directive-should-not-reach-provider',
          },
        }),
      },
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-execution-callbacks',
          data: {
            status: 'failed',
            summary: 'Provider timeout while processing the request.',
          },
        }),
      },
    ] as any)

    const serialized = JSON.stringify(messages)
    expect(serialized).toContain('alicization-persona-profile')
    expect(serialized).toContain('用户明确设置的人格表达应当自然、真实。')
    expect(serialized).not.toContain('alicization-persona-directives')
    expect(serialized).not.toContain('fixture-directive-should-not-reach-provider')
    expect(serialized).toContain('alicization-execution-callbacks')
    expect(serialized).toContain('failed')
    expect(serialized).toContain('Provider timeout while processing the request.')
  })

  it('keeps typed memory-owner facts and dialogue messages unchanged', () => {
    const memoryFact = JSON.stringify({
      type: 'alicization-turn-memory-context',
      data: {
        owner: 'working-memory',
        currentUserMove: '测试记忆召回',
      },
    })
    const messages = filterAlicizationProviderSystemMessages([
      {
        role: 'system',
        content: memoryFact,
      },
      {
        role: 'user',
        content: '测试记忆召回',
      },
      {
        role: 'assistant',
        content: '这是 Provider 已生成的上一轮回复。',
      },
    ] as any)

    expect(messages).toEqual([
      {
        role: 'system',
        content: memoryFact,
      },
      {
        role: 'user',
        content: '测试记忆召回',
      },
      {
        role: 'assistant',
        content: '这是 Provider 已生成的上一轮回复。',
      },
    ])
  })
})
