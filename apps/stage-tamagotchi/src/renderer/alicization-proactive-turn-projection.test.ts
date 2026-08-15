import type { AlicizationRuntimeToolCardProjection } from '@proj-alicization/stage-shared'
import type { ChatHistoryItem } from '@proj-alicization/stage-ui/types/chat'

import {
  projectRecoveredTurnToolProjectionsIntoMessages,
} from '@proj-alicization/stage-ui/stores/chat-tool-projection'
import { describe, expect, it } from 'vitest'

import {
  refreshAlicizationProactiveAssistantMessage,
} from './alicization-proactive-turn-projection'

function recoveredCard(): AlicizationRuntimeToolCardProjection {
  return {
    toolCallId: 'tool-call-proactive',
    toolName: 'coding_agent',
    selectedChannel: 'codex',
    phase: 'completed',
    terminal: true,
    revision: 3,
    elapsedMs: 2_000,
    timeoutMs: 180_000,
    errorCode: null,
    errorMessage: null,
    step: null,
    result: {
      status: 'completed',
      summary: '主动任务已完成',
    },
  }
}

function proactiveMessage(): Extract<ChatHistoryItem, { role: 'assistant' }> {
  return {
    id: 'turn-proactive',
    role: 'assistant',
    content: '旧的主动消息',
    slices: [{
      type: 'text',
      text: '旧的主动消息',
    }],
    tool_results: [],
    createdAt: 1_000,
  }
}

describe('alicization proactive turn projection', () => {
  it('preserves a recovered tool projection when proactive text backfill arrives later', () => {
    const messages: ChatHistoryItem[] = [
      {
        id: 'turn-proactive:user',
        role: 'user',
        content: '后台任务',
        createdAt: 500,
      },
      proactiveMessage(),
    ]
    projectRecoveredTurnToolProjectionsIntoMessages(messages, [{
      turnId: 'turn-proactive',
      cards: [recoveredCard()],
    }])
    const assistant = messages[1]
    if (assistant?.role !== 'assistant')
      throw new Error('expected assistant message')

    refreshAlicizationProactiveAssistantMessage(assistant, {
      assistantText: '新的主动消息',
      createdAt: 2_000,
      structured: {
        format: 'subconscious-proactive-llm-v1',
        thought: '',
        emotion: 'neutral',
        reply: '新的主动消息',
      },
      reasoning: '',
    })

    expect(assistant.slices).toEqual([
      {
        type: 'text',
        text: '新的主动消息',
      },
      expect.objectContaining({
        type: 'execution-status',
        toolCallId: 'tool-call-proactive',
        phase: 'completed',
      }),
    ])
    expect(assistant.tool_results).toEqual([{
      id: 'tool-call-proactive',
      result: {
        status: 'completed',
        summary: '主动任务已完成',
      },
    }])
  })

  it('accepts a recovered tool projection after proactive text backfill', () => {
    const assistant = proactiveMessage()
    refreshAlicizationProactiveAssistantMessage(assistant, {
      assistantText: '新的主动消息',
      createdAt: 2_000,
      structured: {
        format: 'subconscious-proactive-llm-v1',
        thought: '',
        emotion: 'neutral',
        reply: '新的主动消息',
      },
      reasoning: '',
    })
    const messages: ChatHistoryItem[] = [
      {
        id: 'turn-proactive:user',
        role: 'user',
        content: '后台任务',
        createdAt: 500,
      },
      assistant,
    ]

    projectRecoveredTurnToolProjectionsIntoMessages(messages, [{
      turnId: 'turn-proactive',
      cards: [recoveredCard()],
    }])

    expect(assistant.slices).toEqual([
      {
        type: 'text',
        text: '新的主动消息',
      },
      expect.objectContaining({
        type: 'execution-status',
        toolCallId: 'tool-call-proactive',
        phase: 'completed',
      }),
    ])
    expect(assistant.tool_results).toHaveLength(1)
  })
})
