import type {
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'

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
    status: 'running',
    selectedChannel: 'cli',
    proposedChannel: 'cli',
    summary: 'pnpm test is running',
    metadata: null,
    createdAt: 1_000,
    updatedAt: 2_000,
    lastEventAt: 2_000,
    completedAt: null,
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
    kind: 'dispatch',
    threadStatus: 'running',
    payload: {
      command: 'pnpm test',
    },
    createdAt: 2_000,
    ...overrides,
  }
}

describe('memory ledger runtime', () => {
  it('builds active execution recall and system block for the current session', async () => {
    const listTaskThreads = vi.fn(async () => [createThread()])
    const listExecutionEvents = vi.fn(async () => [createEvent()])
    const runtime = createAlicizationMemoryLedgerRuntime({
      getNow: () => 10_000,
      listTaskThreads,
      listExecutionEvents,
    })

    const context = await runtime.buildExecutionLedgerContext({
      sessionId: 'session-1',
    })

    expect(context.recallText).toContain('execution_channel:cli')
    expect(context.recallText).toContain('execution_status:running')
    expect(context.recallText).not.toContain('execution_history_scope:')
    expect(context.recallText).not.toContain('execution_boundary:')
    expect(context.recallText).not.toContain('execution_project_identity:')
    expect(context.recallText).not.toContain('execution_project_phase:')
    expect(context.recallText).not.toContain('execution_continuity_line:')
    expect(context.recallText).not.toContain('execution_continuity_hold:')
    expect(context.recallText).not.toContain('execution_project_continuity:')
    expect(context.entries).toEqual([{
      activityAt: 2_000,
      channel: 'cli',
      eventKinds: ['dispatch'],
      goal: 'Run the CLI check command',
      outcome: '',
      status: 'running',
      summary: 'pnpm test is running',
    }])
    expect(JSON.parse(context.systemBlock)).toEqual({
      type: 'alicization-execution-ledger',
      data: {
        entries: context.entries,
      },
    })
    expect(context.systemBlock).not.toMatch(/WorkingMemory owns|LongTermMemoryRecall owns|Do not|Treat only|Failure surface/iu)
    expect(listExecutionEvents).toBeCalledWith({
      threadId: 'thread-1',
      limit: 8,
    })
  })

  it('provides active same-session execution facts without classifying the user wording', async () => {
    const listTaskThreads = vi.fn(async () => [createThread()])
    const listExecutionEvents = vi.fn(async () => [createEvent()])
    const runtime = createAlicizationMemoryLedgerRuntime({
      getNow: () => 10_000,
      listTaskThreads,
      listExecutionEvents,
    })

    const context = await runtime.buildExecutionLedgerContext({
      sessionId: 'session-1',
    })

    expect(context.entries).toHaveLength(1)
    expect(context.entries[0]).toMatchObject({
      channel: 'cli',
      status: 'running',
    })
    expect(listExecutionEvents).toHaveBeenCalledOnce()
  })

  it('does not carry settled execution history into an unrelated turn', async () => {
    const listExecutionEvents = vi.fn(async () => [createEvent()])
    const runtime = createAlicizationMemoryLedgerRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread({
        status: 'completed',
      })]),
      listExecutionEvents,
    })

    await expect(runtime.buildExecutionLedgerContext({
      sessionId: 'session-1',
    })).resolves.toEqual(emptyAlicizationExecutionLedgerContext)
    expect(listExecutionEvents).not.toHaveBeenCalled()
  })

  it('does not carry blocked terminal execution history into later turns', async () => {
    const listExecutionEvents = vi.fn(async () => [createEvent({
      kind: 'result',
      threadStatus: 'blocked',
    })])
    const runtime = createAlicizationMemoryLedgerRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread({
        status: 'blocked',
        summary: 'Execution was blocked by policy.',
      })]),
      listExecutionEvents,
    })

    await expect(runtime.buildExecutionLedgerContext({
      sessionId: 'session-1',
    })).resolves.toEqual(emptyAlicizationExecutionLedgerContext)
    expect(listExecutionEvents).not.toHaveBeenCalled()
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
    })).resolves.toEqual(emptyAlicizationExecutionLedgerContext)
  })
})
