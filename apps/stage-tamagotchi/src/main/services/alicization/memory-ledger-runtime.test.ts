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
    expect(context.recallText).toContain('execution_project_identity:Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.')
    expect(context.recallText).toContain('execution_project_phase:Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(context.recallText).toContain('execution_same_her_line:Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(context.recallText).toContain('execution_same_her_hold:same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".')
    expect(context.recallText).toContain('execution_project_continuity:same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.')
    expect(context.recallText).toContain('execution_project_boundary:This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.')
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
    expect(context.systemBlock).toContain('This recalled execution history still belongs to the same local-first digital life project and one living her.')
    expect(context.systemBlock).toContain('project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.')
    expect(context.systemBlock).toContain('project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(context.systemBlock).toContain('latest_landed_progress=')
    expect(context.systemBlock).toContain('primary_open_loop=')
    expect(context.systemBlock).toContain('next_closure_target=')
    expect(context.systemBlock).toContain('same_her_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(context.systemBlock).toContain('same_her_hold=same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".')
    expect(context.systemBlock).toContain('same_her_drift_risk=If project-state continuity survives only as generic guidance while first-person continuity disappears, treat that as unfinished closure drift rather than a successful turn.')
    expect(context.systemBlock).toContain('project_continuity=same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.')
    expect(context.systemBlock).toContain('project_boundary=This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.')
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
