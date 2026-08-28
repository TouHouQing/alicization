import type { AlicizationRuntimeToolCardProjection } from '@proj-alicization/stage-shared'

import type { ChatHistoryItem } from '../types/chat'

import { describe, expect, it, vi } from 'vitest'

import {
  applyChatToolProjectionSlice,
  buildChatExecutionStatusFromProjection,
  extractChatExecutorToolRecovery,
  projectRecoveredTurnToolProjectionsIntoMessages,
  removeChatInfrastructureErrorMessage,
  replaceChatAssistantTextPreservingToolProjection,
  upsertChatExecutionStatusSlice,
  upsertChatInfrastructureErrorMessage,
} from './chat-tool-projection'

function toolCard(
  overrides: Partial<AlicizationRuntimeToolCardProjection> = {},
): AlicizationRuntimeToolCardProjection {
  return {
    toolCallId: 'tool-call-recovered',
    toolName: 'coding_agent',
    selectedChannel: 'codex',
    phase: 'completed',
    terminal: true,
    revision: 3,
    elapsedMs: 2_400,
    timeoutMs: 180_000,
    errorCode: null,
    errorMessage: null,
    step: null,
    result: {
      status: 'completed',
      summary: '代码检查完成',
    },
    ...overrides,
  }
}

describe('chat tool projection', () => {
  it('extracts recovery actions from a nested executor tool result', () => {
    const recovery = {
      state: 'available',
      reasonCode: 'SIDE_EFFECT_RECONCILIATION_REQUIRED',
      actions: [{
        kind: 'resume',
        threadId: 'thread-1',
        expectedChannel: 'codex',
        expectedUpdatedAt: 42,
        safety: 'inspect-before-replay',
        reasonCode: 'SIDE_EFFECT_RECONCILIATION_REQUIRED',
      }],
    } as const

    expect(extractChatExecutorToolRecovery({ result: { recovery } })).toEqual(recovery)
  })

  it('attaches available recovery to the execution status without exposing malformed actions', () => {
    const recovery = {
      state: 'available',
      reasonCode: 'CONFIRMATION_REQUIRED',
      actions: [{
        kind: 'continue',
        threadId: 'thread-1',
        expectedChannel: 'codex',
        expectedUpdatedAt: 42,
        safety: 'confirmation-required',
        reasonCode: 'CONFIRMATION_REQUIRED',
      }],
    } as const

    expect(buildChatExecutionStatusFromProjection(toolCard({
      result: { status: 'failed', recovery },
    }))).toEqual(expect.objectContaining({ recovery }))
    expect(extractChatExecutorToolRecovery({
      recovery: {
        state: 'available',
        reasonCode: 'BROKEN',
        actions: [{ kind: 'continue' }],
      },
    })).toBeNull()
  })

  it('keeps recovery projection available when the executor result has no summary text', () => {
    const recovery = {
      state: 'blocked',
      reasonCode: 'RECOVERY_BLOCKED',
      actions: [],
    } as const

    expect(buildChatExecutionStatusFromProjection(toolCard({
      result: { recovery },
    }))).toEqual(expect.objectContaining({
      recovery,
      phase: 'completed',
    }))
  })

  it('applies queued tool projection slices and refreshes the UI once', () => {
    const message: any = {
      role: 'assistant',
      content: '',
      slices: [],
      tool_results: [],
    }
    const updateUI = vi.fn()

    applyChatToolProjectionSlice(message, {
      type: 'tool-call',
      toolCall: {
        toolCallId: 'tool-call-queued',
        toolName: 'custom_tool',
        args: '{}',
        toolCallType: 'function',
      },
    }, updateUI)
    applyChatToolProjectionSlice(message, {
      type: 'tool-call-result',
      id: 'tool-call-queued',
      result: {
        status: 'completed',
      },
    }, updateUI)

    expect(message.slices).toEqual([
      expect.objectContaining({
        type: 'tool-call',
        toolCall: expect.objectContaining({
          toolCallId: 'tool-call-queued',
        }),
      }),
    ])
    expect(message.tool_results).toEqual([{
      type: 'tool-call-result',
      id: 'tool-call-queued',
      result: {
        status: 'completed',
      },
    }])
    expect(updateUI).toHaveBeenCalledTimes(2)
  })

  it('upserts duplicate tool results by canonical toolCallId', () => {
    const message: any = {
      role: 'assistant',
      content: '',
      slices: [],
      tool_results: [],
    }

    applyChatToolProjectionSlice(message, {
      type: 'tool-call-result',
      id: 'tool-call-idempotent',
      result: {
        status: 'running',
        summary: 'still working',
      },
    }, vi.fn())
    applyChatToolProjectionSlice(message, {
      type: 'tool-call-result',
      id: 'tool-call-idempotent',
      result: {
        status: 'completed',
        summary: 'finished',
      },
    }, vi.fn())

    expect(message.tool_results).toEqual([{
      type: 'tool-call-result',
      id: 'tool-call-idempotent',
      result: {
        status: 'completed',
        summary: 'finished',
      },
    }])
  })

  it('does not downgrade a live dead-lettered tool result when late failure arrives', () => {
    const message: any = {
      role: 'assistant',
      content: '',
      slices: [],
      tool_results: [],
    }

    applyChatToolProjectionSlice(message, {
      type: 'tool-call-result',
      id: 'tool-call-dead-letter-live',
      result: {
        finalStatus: 'dead-lettered',
        summary: '需要人工核对。',
      },
    }, vi.fn())
    applyChatToolProjectionSlice(message, {
      type: 'tool-call-result',
      id: 'tool-call-dead-letter-live',
      result: {
        status: 'failed',
        summary: '迟到的普通失败。',
      },
    }, vi.fn())
    applyChatToolProjectionSlice(message, {
      type: 'tool-call-result',
      id: 'tool-call-dead-letter-live',
      result: {
        status: 'running',
        summary: '迟到的运行快照。',
      },
    }, vi.fn())

    expect(message.tool_results).toEqual([{
      type: 'tool-call-result',
      id: 'tool-call-dead-letter-live',
      result: {
        finalStatus: 'dead-lettered',
        summary: '需要人工核对。',
      },
    }])
  })

  it('upserts duplicate tool-call cards by canonical toolCallId', () => {
    const message: any = {
      role: 'assistant',
      content: '',
      slices: [],
      tool_results: [],
    }

    applyChatToolProjectionSlice(message, {
      type: 'tool-call',
      toolCall: {
        toolCallId: 'tool-call-card-idempotent',
        toolName: 'coding_agent',
        args: '{}',
        toolCallType: 'function',
      },
    }, vi.fn())
    applyChatToolProjectionSlice(message, {
      type: 'tool-call',
      toolCall: {
        toolCallId: 'tool-call-card-idempotent',
        toolName: 'coding_agent',
        args: '{"prompt":"inspect"}',
        toolCallType: 'function',
      },
    }, vi.fn())

    expect(message.slices).toEqual([{
      type: 'tool-call',
      toolCall: {
        toolCallId: 'tool-call-card-idempotent',
        toolName: 'coding_agent',
        args: '{"prompt":"inspect"}',
        toolCallType: 'function',
      },
    }])
  })

  it('uses one canonical mapper for online and replayed execution status', () => {
    expect(buildChatExecutionStatusFromProjection(toolCard())).toEqual(expect.objectContaining({
      type: 'execution-status',
      phase: 'completed',
      toolCallId: 'tool-call-recovered',
      toolName: 'coding_agent',
      label: 'Codex 已经拿到结果: 代码检查完成',
    }))
  })

  it('surfaces dead-lettered tools as manual-review state instead of ordinary failure', () => {
    expect(buildChatExecutionStatusFromProjection(toolCard({
      phase: 'dead-lettered',
      errorCode: 'SIDE_EFFECT_RECONCILIATION_EXHAUSTED',
      errorMessage: '动作已经执行，但无法安全确认最终状态。',
      result: {
        finalStatus: 'dead-lettered',
        summary: '需要人工核对本地状态。',
      },
    }))).toEqual(expect.objectContaining({
      type: 'execution-status',
      phase: 'tool-dead-lettered',
      toolCallId: 'tool-call-recovered',
      toolName: 'coding_agent',
      errorCode: 'SIDE_EFFECT_RECONCILIATION_EXHAUSTED',
      label: 'Codex 需要人工核对: 需要人工核对本地状态。',
    }))
  })

  it('does not infer an execution channel from the tool name', () => {
    expect(buildChatExecutionStatusFromProjection(toolCard({
      toolName: 'codex',
      selectedChannel: null,
    }))).toEqual(expect.objectContaining({
      label: '工具 已经拿到结果: 代码检查完成',
    }))
  })

  it('upserts one execution status per canonical toolCallId', () => {
    const slices: any[] = [{
      type: 'text',
      text: '我检查完了。',
    }]

    upsertChatExecutionStatusSlice(
      slices,
      buildChatExecutionStatusFromProjection(toolCard({
        phase: 'running',
        terminal: false,
        revision: 2,
        result: undefined,
      })),
    )
    upsertChatExecutionStatusSlice(
      slices,
      buildChatExecutionStatusFromProjection(toolCard()),
    )

    expect(slices.filter(slice => slice.type === 'execution-status')).toEqual([
      expect.objectContaining({
        toolCallId: 'tool-call-recovered',
        phase: 'completed',
      }),
    ])
    expect(slices[0]).toEqual({
      type: 'text',
      text: '我检查完了。',
    })
  })

  it('does not downgrade a terminal execution status with an older running projection', () => {
    const slices: any[] = [
      buildChatExecutionStatusFromProjection(toolCard()),
    ]

    upsertChatExecutionStatusSlice(
      slices,
      buildChatExecutionStatusFromProjection(toolCard({
        phase: 'running',
        terminal: false,
        revision: 2,
        result: undefined,
      })),
    )

    expect(slices).toEqual([
      expect.objectContaining({
        toolCallId: 'tool-call-recovered',
        phase: 'completed',
      }),
    ])
  })

  it('keeps dead-lettered live state ahead of later ordinary terminal projections', () => {
    const slices: any[] = [
      buildChatExecutionStatusFromProjection(toolCard({
        phase: 'dead-lettered',
        errorCode: 'SIDE_EFFECT_RECONCILIATION_EXHAUSTED',
        result: {
          finalStatus: 'dead-lettered',
          summary: '需要人工核对。',
        },
      })),
    ]

    upsertChatExecutionStatusSlice(
      slices,
      buildChatExecutionStatusFromProjection(toolCard({
        phase: 'failed',
        errorCode: 'TOOL_FAILED',
        result: {
          finalStatus: 'failed',
          summary: '普通失败不应遮蔽 dead-letter。',
        },
      })),
    )

    expect(slices).toEqual([
      expect.objectContaining({
        toolCallId: 'tool-call-recovered',
        phase: 'tool-dead-lettered',
        errorCode: 'SIDE_EFFECT_RECONCILIATION_EXHAUSTED',
      }),
    ])
  })

  it('projects recovered cards onto the exact assistant turn without duplicating text or results', () => {
    const messages: ChatHistoryItem[] = [
      {
        id: 'turn-recovered:user',
        role: 'user',
        content: '请检查项目',
        createdAt: 1_000,
      },
      {
        id: 'turn-recovered',
        role: 'assistant',
        content: '我检查完了。',
        slices: [{
          type: 'text',
          text: '我检查完了。',
        }],
        tool_results: [],
        createdAt: 2_000,
      },
      {
        id: 'turn-other',
        role: 'assistant',
        content: '另一轮。',
        slices: [{
          type: 'text',
          text: '另一轮。',
        }],
        tool_results: [],
        createdAt: 3_000,
      },
    ]
    const recovered = [{
      turnId: 'turn-recovered',
      cards: [toolCard()],
    }]

    expect(projectRecoveredTurnToolProjectionsIntoMessages(messages, recovered)).toBe(true)
    expect(projectRecoveredTurnToolProjectionsIntoMessages(messages, recovered)).toBe(false)

    const assistant = messages[1]
    expect(assistant?.role).toBe('assistant')
    if (assistant?.role !== 'assistant')
      throw new Error('expected assistant message')

    expect(assistant.slices).toEqual([
      {
        type: 'text',
        text: '我检查完了。',
      },
      expect.objectContaining({
        type: 'execution-status',
        toolCallId: 'tool-call-recovered',
        phase: 'completed',
      }),
    ])
    expect(assistant.tool_results).toEqual([{
      id: 'tool-call-recovered',
      result: {
        status: 'completed',
        summary: '代码检查完成',
      },
    }])
    expect(messages[2]).toEqual(expect.objectContaining({
      id: 'turn-other',
      slices: [{
        type: 'text',
        text: '另一轮。',
      }],
    }))
  })

  it('projects every unsettled generic tool as recovery-required without exposing terminal generic tools', () => {
    const messages: ChatHistoryItem[] = [{
      id: 'turn-running',
      role: 'assistant',
      content: '还在运行。',
      slices: [{
        type: 'text',
        text: '还在运行。',
      }],
      tool_results: [],
    }]

    expect(projectRecoveredTurnToolProjectionsIntoMessages(messages, [{
      turnId: 'turn-running',
      recoveryRequired: true,
      reasonCodes: ['runtime-replay:tool-actions-unsettled'],
      cards: [
        toolCard({
          toolCallId: 'tool-running',
          phase: 'running',
          terminal: false,
          result: undefined,
        }),
        toolCard({
          toolCallId: 'tool-reminder-running',
          toolName: 'set_reminder',
          selectedChannel: null,
          phase: 'running',
          terminal: false,
          result: undefined,
        }),
        toolCard({
          toolCallId: 'tool-future-mcp-running',
          toolName: 'future_mcp_tool',
          selectedChannel: null,
          phase: 'running',
          terminal: false,
          result: undefined,
        }),
        toolCard({
          toolCallId: 'tool-reminder-completed',
          toolName: 'set_reminder',
          selectedChannel: null,
          result: {
            status: 'completed',
          },
        }),
      ],
    }])).toBe(true)

    const assistant = messages[0]
    if (assistant?.role !== 'assistant')
      throw new Error('expected assistant message')
    expect(assistant.slices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'execution-status',
        toolCallId: 'tool-running',
        phase: 'tool-recovery-required',
      }),
      expect.objectContaining({
        type: 'execution-status',
        toolCallId: 'tool-reminder-running',
        toolName: 'set_reminder',
        phase: 'tool-recovery-required',
        errorCode: 'TOOL_RECOVERY_REQUIRED',
      }),
      expect.objectContaining({
        type: 'execution-status',
        toolCallId: 'tool-future-mcp-running',
        toolName: 'future_mcp_tool',
        phase: 'tool-recovery-required',
        errorCode: 'TOOL_RECOVERY_REQUIRED',
      }),
    ]))
    expect(assistant.slices).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        toolCallId: 'tool-reminder-completed',
      }),
    ]))
    expect(assistant.tool_results).toEqual([])
  })

  it('surfaces a per-turn replay failure as infrastructure state instead of assistant speech', () => {
    const messages: ChatHistoryItem[] = [{
      id: 'turn-replay-failed:user',
      role: 'user',
      content: '继续刚才的任务',
      createdAt: 1_000,
    }]

    expect(projectRecoveredTurnToolProjectionsIntoMessages(messages, [{
      turnId: 'turn-replay-failed',
      cards: [],
      recoveryRequired: true,
      reasonCodes: ['runtime-replay:failed'],
      failure: {
        code: 'RUNTIME_REPLAY_FAILED',
        message: 'runtime replay delivery owner is missing from persisted facts',
      },
    }])).toBe(true)

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'turn-replay-failed:tool-replay-error',
        role: 'error',
        content: expect.stringContaining('RUNTIME_REPLAY_FAILED'),
      }),
    ]))
    expect(messages.some(message => (
      message.role === 'assistant'
      && message.id === 'turn-replay-failed'
    ))).toBe(false)
  })

  it('replaces assistant text without erasing recovered or online tool projection slices', () => {
    const message: Extract<ChatHistoryItem, { role: 'assistant' }> = {
      id: 'turn-text-refresh',
      role: 'assistant',
      content: '旧文本',
      slices: [
        { type: 'text', text: '旧文本' },
        buildChatExecutionStatusFromProjection(toolCard()),
      ],
      tool_results: [{
        id: 'tool-call-recovered',
        result: {
          status: 'completed',
        },
      }],
    }

    replaceChatAssistantTextPreservingToolProjection(message, '新文本')

    expect(message.content).toBe('新文本')
    expect(message.slices).toEqual([
      { type: 'text', text: '新文本' },
      expect.objectContaining({
        type: 'execution-status',
        toolCallId: 'tool-call-recovered',
        phase: 'completed',
      }),
    ])
    expect(message.tool_results).toEqual([{
      id: 'tool-call-recovered',
      result: {
        status: 'completed',
      },
    }])
  })

  it('upserts a session recovery query failure as an idempotent infrastructure error', () => {
    const messages: ChatHistoryItem[] = []
    const error = {
      id: 'session-1:tool-projection-query-error',
      code: 'TOOL_PROJECTION_QUERY_FAILED',
      message: 'database is unavailable',
    }

    expect(upsertChatInfrastructureErrorMessage(messages, error)).toBe(true)
    expect(upsertChatInfrastructureErrorMessage(messages, error)).toBe(false)
    expect(messages).toEqual([{
      id: 'session-1:tool-projection-query-error',
      role: 'error',
      content: '工具状态恢复失败（TOOL_PROJECTION_QUERY_FAILED）：database is unavailable',
    }])
  })

  it('surfaces conversation recovery failures separately from tool state recovery', () => {
    const messages: ChatHistoryItem[] = []
    const error = {
      id: 'session-1:conversation-query-error',
      code: 'CONVERSATION_QUERY_FAILED',
      message: 'database is unavailable',
      label: '对话记录恢复失败',
    }

    expect(upsertChatInfrastructureErrorMessage(messages, error)).toBe(true)
    expect(messages).toEqual([{
      id: 'session-1:conversation-query-error',
      role: 'error',
      content: '对话记录恢复失败（CONVERSATION_QUERY_FAILED）：database is unavailable',
    }])
    expect(removeChatInfrastructureErrorMessage(
      messages,
      'session-1:conversation-query-error',
    )).toBe(true)
    expect(messages).toEqual([])
  })

  it('clears stale recovery errors after the next successful recovery', () => {
    const messages: ChatHistoryItem[] = [
      {
        id: 'turn-recovered:user',
        role: 'user',
        content: '继续任务',
      },
      {
        id: 'turn-recovered:tool-replay-error',
        role: 'error',
        content: '工具状态恢复失败（RUNTIME_REPLAY_FAILED）：temporary failure',
      },
      {
        id: 'session-1:tool-projection-query-error',
        role: 'error',
        content: '工具状态恢复失败（TOOL_PROJECTION_QUERY_FAILED）：database is unavailable',
      },
    ]

    expect(projectRecoveredTurnToolProjectionsIntoMessages(messages, [{
      turnId: 'turn-recovered',
      cards: [toolCard()],
      recoveryRequired: false,
      reasonCodes: [],
      failure: null,
    }])).toBe(true)
    expect(removeChatInfrastructureErrorMessage(
      messages,
      'session-1:tool-projection-query-error',
    )).toBe(true)
    expect(messages).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        role: 'error',
      }),
    ]))
  })
})
