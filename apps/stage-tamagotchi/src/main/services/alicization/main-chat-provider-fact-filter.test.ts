import { describe, expect, it } from 'vitest'

import { filterAlicizationProviderSystemMessages } from './main-chat-runtime-surface'

describe('main chat provider fact filter', () => {
  it('keeps typed persona facts and transparent failures while rejecting free-text persona directives', () => {
    const messages = filterAlicizationProviderSystemMessages([
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-persona-profile',
          data: {
            ownerName: '桐人',
            hostName: '主人',
            alicizationName: '小艾',
            relationship: '陪伴者',
            gender: 'female',
            mindAge: 18,
            personality: {
              obedience: 0.73,
              liveliness: 0.64,
              sensibility: 0.81,
            },
            hostAttitude: '把宿主视为长期共同生活的伙伴。',
            coreIncarnation: '我是会在时间中积累记忆并持续成长的小艾。',
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
    expect(serialized).toContain('把宿主视为长期共同生活的伙伴。')
    expect(serialized).toContain('我是会在时间中积累记忆并持续成长的小艾。')
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

  it('strips legacy governance fields nested inside otherwise legal provider facts', () => {
    const messages = filterAlicizationProviderSystemMessages([
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-persona-profile',
          data: {
            alicizationName: '小艾',
            custom_directives: '固定模板不应进入人格回复',
            opening_policy: 'none',
            nested: {
              relationship_cadence: 'always',
              visibility: 'redacted_internal',
            },
            summary: 'visibility=redacted_internal',
            naturalText: '用户曾经讨论过一个代码字段。',
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
    const personaFact = JSON.parse(String(messages[0]?.content ?? '{}')) as {
      data?: Record<string, unknown>
    }
    expect(serialized).toContain('alicization-persona-profile')
    expect(serialized).toContain('用户曾经讨论过一个代码字段。')
    expect(personaFact.data).not.toHaveProperty('custom_directives')
    expect(personaFact.data).not.toHaveProperty('opening_policy')
    expect(personaFact.data?.nested).not.toHaveProperty('relationship_cadence')
    expect(personaFact.data?.nested).not.toHaveProperty('visibility')
    expect(personaFact.data).not.toHaveProperty('summary')
    expect(serialized).toContain('Provider timeout while processing the request.')
  })

  it('preserves legal visibility values while dropping only the retired redacted-internal marker', () => {
    const messages = filterAlicizationProviderSystemMessages([
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-turn-memory-context',
          data: {
            visibility: 'explicit',
            nested: {
              visibility: 'inward',
            },
            retired: {
              visibility: 'redacted_internal',
            },
          },
        }),
      },
    ] as any)

    const fact = JSON.parse(String(messages[0]?.content ?? '{}')) as {
      data?: {
        visibility?: unknown
        nested?: { visibility?: unknown }
        retired?: Record<string, unknown>
      }
    }
    expect(fact.data?.visibility).toBe('explicit')
    expect(fact.data?.nested?.visibility).toBe('inward')
    expect(fact.data?.retired).toEqual({})
  })
})
