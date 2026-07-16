import type { Message } from '@xsai/shared-chat'

import { ContextUpdateStrategy } from '@proj-alicization/server-sdk'
import { describe, expect, it } from 'vitest'

import { composeAlicizationPromptMessages } from './alicization-prompt-composer'

interface ProviderFact {
  type: string
  data: Record<string, unknown>
}

function readSystemText(messages: Message[]) {
  return messages
    .filter(message => message.role === 'system')
    .map(message => String(message.content ?? ''))
    .join('\n\n')
}

function readRuntimeFacts(messages: Message[]) {
  return messages
    .filter((message, index) => message.role === 'system' && index > 0)
    .flatMap(message => String(message.content ?? '').split(/\n{2,}/u))
    .map((block) => {
      try {
        return JSON.parse(block) as ProviderFact
      }
      catch {
        return null
      }
    })
    .filter((fact): fact is ProviderFact => fact !== null)
}

function findFact(messages: Message[], type: string) {
  return readRuntimeFacts(messages).find(fact => fact.type === type)
}

describe('alicization prompt composer', () => {
  it('uses the user-governed SOUL verbatim and strips legacy system messages', () => {
    const soul = '# SOUL\n请保持真实、诚实，并按照自己的记忆自然回应。'
    const result = composeAlicizationPromptMessages({
      messages: [
        { role: 'system', content: 'legacy fixed prompt' },
        { role: 'user', content: '你好' },
      ],
      soulContent: soul,
      hostName: 'AlicizationHost',
      contextsSnapshot: {},
    })

    expect(result.messages[0]).toEqual({
      role: 'system',
      content: soul,
    })
    expect(readSystemText(result.messages)).not.toContain('legacy fixed prompt')
    expect(findFact(result.messages, 'alicization-host')).toEqual({
      type: 'alicization-host',
      data: {
        name: 'AlicizationHost',
      },
    })
    expect(result.messages.at(-1)).toEqual({
      role: 'user',
      content: '你好',
    })
  })

  it('does not append personality reply directives around SOUL content', () => {
    const soul = [
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
      soulContent: soul,
      hostName: null,
      contextsSnapshot: {},
    })

    expect(result.messages[0]?.content).toBe(soul)
    expect(result.personalityDirectiveResult?.triggered).toEqual([
      'liveliness',
      'sensibility',
      'obedience',
    ])
    expect(readSystemText(result.messages)).not.toContain('reply energy')
    expect(readSystemText(result.messages)).not.toContain('affect should')
    expect(readSystemText(result.messages)).not.toContain('instruction acceptance')
    expect(readSystemText(result.messages)).not.toContain('alicization-personality-thresholds')
  })

  it('emits numeric personality state as a fact when no SOUL exists', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '状态报告' }],
      personalityState: {
        obedience: 0.05,
        liveliness: 0.15,
        sensibility: 0.25,
      },
      contextsSnapshot: {},
    })

    const fact = JSON.parse(String(result.messages[0]?.content)) as ProviderFact
    expect(fact).toEqual({
      type: 'alicization-personality-state',
      data: {
        obedience: 0.05,
        liveliness: 0.15,
        sensibility: 0.25,
      },
    })
    expect(result.personalityDirectiveResult?.triggered).toEqual([
      'liveliness',
      'obedience',
    ])
  })

  it('serializes datetime, memory, sensory, and generic contexts as facts', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: 'ping' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {
        alicization: [{
          id: 'ctx-memory',
          contextId: 'alicization:memory',
          strategy: ContextUpdateStrategy.ReplaceSelf,
          text: '- user likes tea',
          createdAt: Date.now(),
        }],
        datetime: [{
          id: 'ctx-datetime',
          contextId: 'system:datetime',
          strategy: ContextUpdateStrategy.ReplaceSelf,
          text: JSON.stringify({
            iso: '2026-03-07T12:00:00.000Z',
            local: '2026/3/7 20:00:00',
          }),
          createdAt: Date.now(),
        }],
        sensory: [{
          id: 'ctx-sensory',
          contextId: 'alicization:sensory',
          strategy: ContextUpdateStrategy.ReplaceSelf,
          text: 'battery=80%,cpu=12%,memory=43%',
          createdAt: Date.now(),
        }],
        runtime: [{
          id: 'ctx-runtime',
          contextId: 'runtime:state',
          strategy: ContextUpdateStrategy.ReplaceSelf,
          text: 'mode=desktop',
          createdAt: Date.now(),
        }],
      },
    })

    expect(findFact(result.messages, 'alicization-memory-context')?.data).toMatchObject({
      source: 'alicization',
      content: '- user likes tea',
    })
    expect(findFact(result.messages, 'alicization-datetime')?.data).toEqual({
      source: 'datetime',
      iso: '2026-03-07T12:00:00.000Z',
      local: '2026/3/7 20:00:00',
    })
    expect(findFact(result.messages, 'alicization-sensory-context')?.data).toMatchObject({
      source: 'sensory',
      content: 'battery=80%,cpu=12%,memory=43%',
    })
    expect(findFact(result.messages, 'alicization-generic-context')?.data).toMatchObject({
      source: 'runtime',
      content: 'mode=desktop',
    })
  })

  it('ignores renderer project-state and pre-dialogue governance inputs', () => {
    const legacyInput: Parameters<typeof composeAlicizationPromptMessages>[0] & {
      projectStateContinuitySnapshot: Record<string, unknown>
      preDialogueAwarenessSnapshot: Record<string, unknown>
      preDialogueClosureSnapshot: Record<string, unknown>
    } = {
      messages: [{ role: 'user', content: '继续' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      projectStateContinuitySnapshot: {
        identity: 'Alicization',
        currentPhase: 'local-runtime',
        latestLandedProgress: 'WorkingMemory now owns the current turn context.',
        primaryOpenLoop: 'Verify long-term recall evidence.',
        nextClosureTarget: 'Run the memory settlement test.',
        continuitySummary: 'memory mainline active',
        nonHumanAuthoredStatus: 'partial',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'present',
        reasonPreview: ['memory-context-present'],
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'present',
        reasons: ['memory-settlement-pending'],
      },
    }
    const result = composeAlicizationPromptMessages(legacyInput)

    expect(findFact(result.messages, 'alicization-project-state')).toBeUndefined()
    expect(findFact(result.messages, 'alicization-pre-dialogue-awareness')).toBeUndefined()
    expect(findFact(result.messages, 'alicization-pre-dialogue-closure')).toBeUndefined()
    expect(findFact(result.messages, 'alicization-pre-dialogue-continuity')).toBeUndefined()

    const systemText = readSystemText(result.messages)
    expect(systemText).not.toMatch(/WorkingMemory now owns|Verify long-term recall evidence|memory-settlement-pending/iu)
  })

  it('drops template-contaminated context instead of naturalizing it into a new prompt', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续' }],
      soulContent: '# SOUL',
      contextsSnapshot: {
        memory: [{
          id: 'ctx-memory-polluted',
          contextId: 'alicization:memory',
          strategy: ContextUpdateStrategy.ReplaceSelf,
          text: 'same-her memory_facts: keep the continuity state before reply.',
          createdAt: Date.now(),
        }],
      },
    })

    expect(findFact(result.messages, 'alicization-memory-context')).toBeUndefined()
    expect(readSystemText(result.messages)).not.toContain('keep the continuity state before reply')
  })
})
