import type { ChatHistoryItem } from '../../types/chat'

import assert from 'node:assert/strict'

import { describe, it } from 'vitest'

import { canonicalizeSessionMessages, mergeLoadedSessionMessages } from './session-message-merge'

describe('mergeLoadedSessionMessages', () => {
  it('keeps stored history when the in-memory session only has the placeholder system message', () => {
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      { role: 'assistant', content: 'saved reply', createdAt: 2, id: 'assistant-1', slices: [], tool_results: [] },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 3, id: 'system-current' },
    ]

    assert.equal(mergeLoadedSessionMessages(storedMessages, currentMessages), storedMessages)
  })

  it('appends in-flight messages when persisted history finishes loading after a new send starts', () => {
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      { role: 'assistant', content: 'older reply', createdAt: 2, id: 'assistant-1', slices: [], tool_results: [] },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 3, id: 'system-current' },
      { role: 'user', content: 'latest prompt', createdAt: 4, id: 'user-2' },
    ]

    assert.deepEqual(mergeLoadedSessionMessages(storedMessages, currentMessages), [
      ...storedMessages,
      currentMessages[1],
    ])
  })

  it('does not duplicate messages that are already present in persisted history', () => {
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      { role: 'user', content: 'latest prompt', createdAt: 4 },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 3, id: 'system-current' },
      { role: 'user', content: 'latest prompt', createdAt: 4 },
    ]

    assert.equal(mergeLoadedSessionMessages(storedMessages, currentMessages), storedMessages)
  })

  it('merges duplicate assistant messages while keeping the stable turn id and authoritative thought', () => {
    const stableTurnId = 'chat:session-1:turn-1'
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      {
        role: 'assistant',
        content: 'The train leaves at nine.',
        createdAt: 10_000,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: 'The train leaves at nine.' }],
        tool_results: [],
        structured: {
          thought: 'The saved ticket confirms the departure time.',
          emotion: 'neutral',
          reply: 'The train leaves at nine.',
          format: 'mind-turn-v1',
        },
      },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 2, id: 'system-current' },
      {
        role: 'assistant',
        content: 'The train leaves at nine.',
        createdAt: 10_500,
        id: 'temporary-assistant-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: 'The train leaves at nine.',
          format: 'fallback-v1',
        },
      },
    ]

    const assistantMessages = mergeLoadedSessionMessages(storedMessages, currentMessages)
      .filter(message => message.role === 'assistant')

    assert.equal(assistantMessages.length, 1)
    assert.equal(assistantMessages[0]?.id, stableTurnId)
    assert.equal(
      (assistantMessages[0] as Extract<ChatHistoryItem, { role: 'assistant' }>).structured?.thought,
      'The saved ticket confirms the departure time.',
    )
  })

  it('keeps the user message before the assistant message when their timestamps match', () => {
    const canonical = canonicalizeSessionMessages([
      { role: 'system', content: 'system', createdAt: 1, id: 'system' },
      {
        role: 'assistant',
        content: 'I saved the packing note.',
        createdAt: 10,
        id: 'chat:session-1:turn-2',
        slices: [],
        tool_results: [],
      },
      {
        role: 'user',
        content: 'Please remember the packing note.',
        createdAt: 10,
        id: 'chat:session-1:turn-2:user',
      },
    ])

    assert.deepEqual(canonical.map(message => message.role), ['system', 'user', 'assistant'])
  })

  it('preserves provider realization facts when duplicate assistant messages merge', () => {
    const stableTurnId = 'chat:session-1:turn-3'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: 'The umbrella decision is still open.',
        createdAt: 20_000,
        id: 'temporary-assistant-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: 'The umbrella decision is still open.',
          format: 'fallback-v1',
          visibleReplyRealization: {
            expectedAuthority: 'llm-mind',
            actualAuthority: 'llm-mind',
            providerMindExecuted: true,
            mode: 'provider-stream',
          },
        },
      } as unknown as ChatHistoryItem,
      {
        role: 'assistant',
        content: 'The umbrella decision is still open.',
        createdAt: 20_500,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: 'The umbrella decision is still open.' }],
        tool_results: [],
        structured: {
          thought: 'The saved trip note has no umbrella choice yet.',
          emotion: 'neutral',
          reply: 'The umbrella decision is still open.',
          format: 'mind-turn-v1',
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as Extract<
      ChatHistoryItem,
      { role: 'assistant' }
    >

    assert.equal(assistantMessage.id, stableTurnId)
    assert.deepEqual(assistantMessage.structured?.visibleReplyRealization, {
      expectedAuthority: 'llm-mind',
      actualAuthority: 'llm-mind',
      providerMindExecuted: true,
      mode: 'provider-stream',
    })
  })

  it('merges recovered execution slices and tool results by canonical toolCallId', () => {
    const stableTurnId = 'chat:session-1:turn-tool-recovery'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '检查已经完成。',
        createdAt: 25_000,
        id: stableTurnId,
        slices: [
          { type: 'text', text: '检查已经完成。' },
          {
            type: 'execution-status',
            phase: 'completed',
            toolCallId: 'tool-recovered',
            toolName: 'coding_agent',
            label: 'Codex 已经拿到结果',
          },
        ],
        tool_results: [{
          id: 'tool-recovered',
          result: { status: 'completed' },
        }],
      },
      {
        role: 'assistant',
        content: '检查已经完成。',
        createdAt: 25_100,
        id: 'temporary-tool-recovery-message',
        slices: [
          { type: 'text', text: '检查已经完成。' },
          {
            type: 'execution-status',
            phase: 'tool-failed',
            toolCallId: 'tool-other',
            toolName: 'cli',
            label: 'CLI 没有跑通',
          },
        ],
        tool_results: [{
          id: 'tool-other',
          result: { status: 'failed' },
        }],
      },
    ])

    const assistant = canonical.find(message => message.role === 'assistant') as Extract<
      ChatHistoryItem,
      { role: 'assistant' }
    >
    assert.deepEqual(
      assistant.slices.filter(slice => slice.type === 'execution-status').map(slice => slice.toolCallId),
      ['tool-recovered', 'tool-other'],
    )
    assert.deepEqual(
      assistant.tool_results.map(result => result.id),
      ['tool-recovered', 'tool-other'],
    )
  })

  it('never downgrades a terminal execution status with running or recovery snapshots', () => {
    const terminalPhases = [
      'completed',
      'tool-dead-lettered',
      'tool-failed',
      'tool-cancelled',
      'tool-timeout',
    ] as const

    for (const terminalPhase of terminalPhases) {
      const toolCallId = `tool-terminal-${terminalPhase}`
      const canonical = canonicalizeSessionMessages([
        {
          role: 'assistant',
          content: '工具已经结算。',
          createdAt: 26_000,
          id: `chat:session-1:turn-${terminalPhase}`,
          slices: [{
            type: 'execution-status',
            phase: terminalPhase,
            toolCallId,
            toolName: 'coding_agent',
            label: `terminal ${terminalPhase}`,
            outputPreview: '真实终态输出',
          }],
          tool_results: [{
            id: toolCallId,
            result: {
              status: terminalPhase,
              summary: '真实终态结果',
            },
          }],
        },
        {
          role: 'assistant',
          content: '工具已经结算。',
          createdAt: 26_100,
          id: `chat:session-1:turn-${terminalPhase}`,
          slices: [{
            type: 'execution-status',
            phase: 'tool-running',
            toolCallId,
            toolName: 'coding_agent',
            label: '旧快照仍显示运行中',
          }],
          tool_results: [{
            id: toolCallId,
            result: {
              status: 'running',
            },
          }],
        },
        {
          role: 'assistant',
          content: '工具已经结算。',
          createdAt: 26_200,
          id: `chat:session-1:turn-${terminalPhase}`,
          slices: [{
            type: 'execution-status',
            phase: 'tool-recovery-required',
            toolCallId,
            toolName: 'coding_agent',
            label: '旧快照要求恢复',
          }],
          tool_results: [{
            id: toolCallId,
          }],
        },
      ])

      const assistant = canonical.find(message => message.role === 'assistant') as Extract<
        ChatHistoryItem,
        { role: 'assistant' }
      >
      const status = assistant.slices.find(slice => (
        slice.type === 'execution-status'
        && slice.toolCallId === toolCallId
      ))

      assert.equal(status?.type, 'execution-status')
      if (status?.type !== 'execution-status')
        throw new Error('expected execution status')
      assert.equal(status.phase, terminalPhase)
      assert.equal(status.outputPreview, '真实终态输出')
      assert.deepEqual(assistant.tool_results, [{
        id: toolCallId,
        result: {
          status: terminalPhase,
          summary: '真实终态结果',
        },
      }])
    }
  })

  it('lets a newer terminal snapshot replace a non-terminal execution status and result', () => {
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '工具状态正在更新。',
        createdAt: 27_000,
        id: 'chat:session-1:turn-terminal-upgrade',
        slices: [{
          type: 'execution-status',
          phase: 'tool-running',
          toolCallId: 'tool-terminal-upgrade',
          toolName: 'cli',
          label: 'CLI 正在运行',
          command: 'pnpm test',
        }],
        tool_results: [{
          id: 'tool-terminal-upgrade',
          result: {
            status: 'running',
          },
        }],
      },
      {
        role: 'assistant',
        content: '工具状态正在更新。',
        createdAt: 27_100,
        id: 'chat:session-1:turn-terminal-upgrade',
        slices: [{
          type: 'execution-status',
          phase: 'completed',
          toolCallId: 'tool-terminal-upgrade',
          toolName: 'cli',
          label: 'CLI 已完成',
          outputPreview: '全部测试通过',
        }],
        tool_results: [{
          id: 'tool-terminal-upgrade',
          result: {
            status: 'completed',
            summary: '全部测试通过',
          },
        }],
      },
    ])

    const assistant = canonical.find(message => message.role === 'assistant') as Extract<
      ChatHistoryItem,
      { role: 'assistant' }
    >
    const status = assistant.slices.find(slice => (
      slice.type === 'execution-status'
      && slice.toolCallId === 'tool-terminal-upgrade'
    ))

    assert.equal(status?.type, 'execution-status')
    if (status?.type !== 'execution-status')
      throw new Error('expected execution status')
    assert.equal(status.phase, 'completed')
    assert.equal(status.command, 'pnpm test')
    assert.equal(status.outputPreview, '全部测试通过')
    assert.deepEqual(assistant.tool_results, [{
      id: 'tool-terminal-upgrade',
      result: {
        status: 'completed',
        summary: '全部测试通过',
      },
    }])
  })

  it('preserves memory and runtime facts during canonicalization', () => {
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: 'The Saturday morning ticket is saved.',
        createdAt: 30_000,
        id: 'chat:session-1:turn-4',
        slices: [],
        tool_results: [],
        structured: {
          thought: 'The itinerary contains a confirmed ticket and one unresolved packing detail.',
          emotion: 'neutral',
          reply: 'The Saturday morning ticket is saved.',
          format: 'mind-turn-v1',
          memoryUsage: {
            workingMemoryVersion: 'wm-weekend-trip',
            longTermEvidenceIds: ['memory-ticket'],
          },
          runtimeDigest: {
            version: 'alicization-runtime-digest-v1',
            dominantChannel: 'dialogue',
            derivedMindStateBundle: {
              structured: {
                memoryUsage: {
                  workingMemoryVersion: 'wm-weekend-trip',
                  longTermEvidenceIds: ['memory-ticket'],
                },
              },
            },
          },
        },
      } as unknown as ChatHistoryItem,
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as Extract<
      ChatHistoryItem,
      { role: 'assistant' }
    >

    const structured = assistantMessage.structured as unknown as Record<string, any>
    assert.deepEqual(structured.memoryUsage, {
      workingMemoryVersion: 'wm-weekend-trip',
      longTermEvidenceIds: ['memory-ticket'],
    })
    assert.deepEqual(structured.runtimeDigest?.derivedMindStateBundle?.structured?.memoryUsage, {
      workingMemoryVersion: 'wm-weekend-trip',
      longTermEvidenceIds: ['memory-ticket'],
    })
  })
})
