import type {
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { ContextualConversationTurn } from './runtime-soul'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationMemoryLedgerRuntime, emptyAlicizationExecutionLedgerContext } from './memory-ledger-runtime'

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-1',
    decisionTraceId: 'trace-1',
    turnId: 'turn-1',
    sessionId: 'session-1',
    origin: 'user-turn',
    goal: 'Run the CLI check command',
    kind: 'run-command',
    status: 'completed',
    selectedChannel: 'cli',
    proposedChannel: 'cli',
    summary: 'pnpm test completed successfully',
    metadata: null,
    createdAt: 1_000,
    updatedAt: 2_000,
    lastEventAt: 2_000,
    completedAt: 2_000,
    ...overrides,
  }
}

function createEvent(overrides: Partial<AlicizationExecutionEventRecord> = {}): AlicizationExecutionEventRecord {
  return {
    id: 'event-1',
    threadId: 'thread-1',
    decisionTraceId: 'trace-1',
    turnId: 'turn-1',
    sessionId: 'session-1',
    origin: 'user-turn',
    channel: 'cli',
    kind: 'result',
    threadStatus: 'completed',
    payload: {
      stdout: 'all tests passed',
    },
    createdAt: 2_000,
    ...overrides,
  }
}

describe('memory ledger runtime', () => {
  it('builds recent execution recall and system block for follow-up questions', async () => {
    const listTaskThreads = vi.fn(async () => [createThread()])
    const listExecutionEvents = vi.fn(async () => [createEvent()])
    const runtime = createAlicizationMemoryLedgerRuntime({
      getNow: () => 10_000,
      listTaskThreads,
      listExecutionEvents,
    })

    const context = await runtime.buildExecutionLedgerContext({
      sessionId: 'session-1',
      userText: '刚才那个命令结果呢',
      recentTurns: [{
        userText: '帮我跑一下测试',
        assistantText: '我去执行这个命令。',
      } satisfies ContextualConversationTurn],
    })

    expect(context.recallText).toContain('execution_channel:cli')
    expect(context.recallText).toContain('execution_status:completed')
    expect(context.recallText).toContain('execution_outcome:all tests passed')
    expect(context.entries).toEqual([{
      activityAt: 2_000,
      channel: 'cli',
      eventKinds: ['result'],
      goal: 'Run the CLI check command',
      outcome: 'all tests passed',
      status: 'completed',
      summary: 'pnpm test completed successfully',
    }])
    expect(context.systemBlock).toContain('[ALICIZATION_EXECUTION_LEDGER]')
    expect(context.systemBlock).toContain('channel=cli')
    expect(context.systemBlock).toContain('summary=pnpm test completed successfully')
    expect(context.systemBlock).toContain('outcome=all tests passed')
    expect(listExecutionEvents).toBeCalledWith({
      threadId: 'thread-1',
      limit: 8,
    })
  })

  it('suppresses stale executor history when the turn is unrelated', async () => {
    const runtime = createAlicizationMemoryLedgerRuntime({
      getNow: () => 60 * 60 * 1000,
      listTaskThreads: vi.fn(async () => [
        createThread({
          updatedAt: 1_000,
          lastEventAt: 1_000,
          completedAt: 1_000,
        }),
      ]),
      listExecutionEvents: vi.fn(async () => [createEvent()]),
    })

    await expect(runtime.buildExecutionLedgerContext({
      sessionId: 'session-1',
      userText: '你好',
      recentTurns: [],
    })).resolves.toEqual(emptyAlicizationExecutionLedgerContext)
  })
})
