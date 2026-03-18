import type { Message } from '@xsai/shared-chat'

import { ContextUpdateStrategy } from '@proj-alicization/server-sdk'
import { describe, expect, it } from 'vitest'

import { composeAlicizationPromptMessages } from './alicization-prompt-composer'

describe('alicization prompt composer', () => {
  it('strips legacy system messages and keeps dual system layers', () => {
    const inputMessages: Message[] = [
      { role: 'system', content: 'legacy-system' },
      { role: 'user', content: 'hello' },
    ]

    const result = composeAlicizationPromptMessages({
      messages: inputMessages,
      soulContent: '# SOUL',
      hostName: 'AlicizationHost',
      contextsSnapshot: {},
    })

    expect(result.messages[0]?.role).toBe('system')
    expect(result.messages.filter(message => message.role === 'system')).toHaveLength(2)
    expect(String(result.messages[0]?.content)).toContain('# SOUL')
    expect(String(result.messages[1]?.content)).toContain('AlicizationHost')
    expect(String(result.messages[1]?.content)).toContain('Output contract (must-follow, highest priority):')
    expect(String(result.messages[1]?.content)).toContain('In thought, you MUST evaluate current personality parameters')
    expect(String(result.messages[1]?.content)).toContain('The emotion value must be exactly one of')
    expect(String(result.messages[1]?.content)).toContain('Reply tone and wording MUST be semantically consistent')
    expect(String(result.messages[1]?.content)).toContain('Personality numeric state from SOUL frontmatter has higher priority than Persona Notes text')
    expect(String(result.messages[1]?.content)).toContain('If the user asks for a timed reminder/alarm')
    expect(String(result.messages[1]?.content)).toContain('[CRITICAL DIRECTIVE - 时间与物理法则]')
    expect(String(result.messages[0]?.content)).not.toContain('legacy-system')
    expect(String(result.messages[1]?.content)).not.toContain('legacy-system')
  })

  it('merges datetime, memory and sensory context into runtime system layer', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: 'ping' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {
        alicization: [
          {
            id: 'ctx-memory',
            contextId: 'alicization:memory',
            strategy: ContextUpdateStrategy.ReplaceSelf,
            text: '- user likes tea',
            createdAt: Date.now(),
          },
        ],
        datetime: [
          {
            id: 'ctx-datetime',
            contextId: 'system:datetime',
            strategy: ContextUpdateStrategy.ReplaceSelf,
            text: JSON.stringify({
              iso: '2026-03-07T12:00:00.000Z',
              local: '2026/3/7 20:00:00',
            }),
            createdAt: Date.now(),
          },
        ],
        sensory: [
          {
            id: 'ctx-sensory',
            contextId: 'alicization:sensory',
            strategy: ContextUpdateStrategy.ReplaceSelf,
            text: '[System Context: Sensory], time=2026/3/7 20:00:00, battery=80%, cpu=12%, memory=43%',
            createdAt: Date.now(),
          },
        ],
      },
    })

    expect(result.messages.filter(message => message.role === 'system')).toHaveLength(2)
    expect(String(result.messages[0]?.content)).toContain('# SOUL')
    expect(String(result.messages[1]?.content)).toContain('Relevant memory facts:')
    expect(String(result.messages[1]?.content)).toContain('Current datetime:')
    expect(String(result.messages[1]?.content)).toContain('Current sensory state:')
    expect(String(result.messages[1]?.content)).toContain('Output contract (must-follow, highest priority):')
    expect(String(result.messages[1]?.content)).toContain('In thought, you MUST evaluate current personality parameters')
    expect(String(result.messages[1]?.content)).toContain('The emotion value must be exactly one of')
    expect(result.messages.at(-1)?.role).toBe('user')
  })

  it('appends low-personality directives into SOUL anchor when traits are near zero', () => {
    const soulContent = [
      '---',
      JSON.stringify({
        personality: {
          obedience: 0.05,
          liveliness: 0.05,
          sensibility: 0.05,
        },
      }),
      '---',
      '# SOUL',
      'anchor',
    ].join('\n')

    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '你现在心情怎么样？' }],
      soulContent,
      hostName: 'Host',
      contextsSnapshot: {},
    })

    expect(String(result.messages[0]?.content)).toContain('=== 当前状态极度干预 ===')
    expect(String(result.messages[0]?.content)).toContain('=== 当前人格参数（强约束解释层）===')
    expect(String(result.messages[0]?.content)).toContain('当前参数：obedience=0.05, liveliness=0.05, sensibility=0.05')
    expect(String(result.messages[0]?.content)).toContain('frontmatter.personality 数值高于 Persona Notes 文本描述')
    expect(String(result.messages[0]?.content)).toContain('Liveliness (活泼度) 极低')
    expect(String(result.messages[0]?.content)).toContain('Sensibility (感性度) 极低')
    expect(String(result.messages[0]?.content)).toContain('Obedience (服从度) 极低')
    expect(result.personalityDirectiveResult?.triggered).toEqual(['liveliness', 'sensibility', 'obedience'])
  })

  it('supports legacy frontmatter style personality values for directive translation', () => {
    const soulContent = [
      '---',
      'personality:',
      '  obedience: 0.05',
      '  liveliness: 0.05',
      '  sensibility: 0.05',
      '---',
      '# SOUL',
      'anchor',
    ].join('\n')

    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '状态报告' }],
      soulContent,
      hostName: 'Host',
      contextsSnapshot: {},
    })

    expect(String(result.messages[0]?.content)).toContain('=== 当前状态极度干预 ===')
    expect(result.personalityDirectiveResult?.triggered).toEqual(['liveliness', 'sensibility', 'obedience'])
  })

  it('uses explicit personality state from snapshot when soul content is not parseable', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '你今天心情怎么样？' }],
      soulContent: '# SOUL without frontmatter',
      hostName: 'Host',
      personalityState: {
        obedience: 0.05,
        liveliness: 0.05,
        sensibility: 0.05,
      },
      contextsSnapshot: {},
    })

    expect(String(result.messages[0]?.content)).toContain('=== 当前人格参数（强约束解释层）===')
    expect(String(result.messages[0]?.content)).toContain('当前参数：obedience=0.05, liveliness=0.05, sensibility=0.05')
    expect(String(result.messages[0]?.content)).toContain('=== 当前状态极度干预 ===')
    expect(result.personalityDirectiveResult?.triggered).toEqual(['liveliness', 'sensibility', 'obedience'])
  })
})
