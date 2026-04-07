import type {
  AlicizationChannelCapability,
  AlicizationExecutionChannel,
  AlicizationExecutionEventInput,
  AlicizationExecutorSessionRecord,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadUpsertInput,
} from '@proj-alicization/stage-shared'

import { describe, expect, it, vi } from 'vitest'

import { alicizationExecutionChannels } from './claw-fabric'
import { createTaskExecutionGovernor } from './task-execution-governor'

function createCapabilities(
  availableChannels: AlicizationExecutionChannel[],
  overrides: Partial<Record<AlicizationExecutionChannel, Partial<AlicizationChannelCapability>>> = {},
) {
  return alicizationExecutionChannels.map(channel => ({
    channel,
    available: availableChannels.includes(channel),
    enabled: availableChannels.includes(channel),
    ready: availableChannels.includes(channel),
    ...overrides[channel],
  })) satisfies AlicizationChannelCapability[]
}

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-governor-existing-1',
    decisionTraceId: 'mind:trace:governor-1',
    turnId: 'turn-governor-1',
    sessionId: 'session-governor-1',
    origin: 'user-turn',
    goal: 'Patch the runtime regression.',
    kind: 'codebase-edit',
    status: 'planned',
    selectedChannel: 'codex',
    proposedChannel: 'codex',
    summary: 'Codex planning is already carrying the current runtime regression task.',
    metadata: {
      task: {
        permissionMode: 'implicit',
        effect: 'mutate',
      },
      fabric: {
        state: 'routed',
        preferredChannels: ['codex', 'claude-code', 'cli'],
        fallbackChannels: ['claude-code', 'cli'],
        reasonTags: ['code-agent-fit'],
        narrative: ['Carry the active runtime fix through the codex channel.'],
        affirmationReasonCodes: [],
        blockedReasonCodes: [],
      },
    },
    createdAt: 100,
    updatedAt: 100,
    lastEventAt: 120,
    completedAt: null,
    ...overrides,
  }
}

function createExecutorSession(overrides: Partial<AlicizationExecutorSessionRecord> = {}): AlicizationExecutorSessionRecord {
  return {
    id: 'executor-session-1',
    channel: 'openclaw',
    affinityKey: 'session-governor-1',
    externalSessionId: 'openclaw-reused-session-1',
    status: 'running',
    summary: 'OpenClaw is still attached to the current browser body.',
    metadata: null,
    createdAt: 100,
    updatedAt: 140,
    lastUsedAt: 140,
    ...overrides,
  }
}

function createPort(input?: {
  executorSessions?: AlicizationExecutorSessionRecord[]
  taskThreads?: AlicizationTaskThreadRecord[]
}) {
  let persistedThread: AlicizationTaskThreadRecord | null = null
  const listTaskThreads = vi.fn(async () => [...(input?.taskThreads ?? [])])
  const listExecutorSessions = vi.fn(async () => [...(input?.executorSessions ?? [])])
  const upsertTaskThread = vi.fn(async (thread: AlicizationTaskThreadUpsertInput) => {
    persistedThread = {
      id: thread.id ?? 'thread-governor-new-1',
      decisionTraceId: thread.decisionTraceId ?? null,
      turnId: thread.turnId ?? null,
      sessionId: thread.sessionId ?? null,
      origin: thread.origin ?? 'user-turn',
      goal: thread.goal,
      kind: thread.kind,
      status: thread.status,
      selectedChannel: thread.selectedChannel ?? null,
      proposedChannel: thread.proposedChannel ?? null,
      summary: thread.summary ?? null,
      metadata: thread.metadata ?? null,
      createdAt: thread.createdAt ?? 0,
      updatedAt: thread.updatedAt ?? 0,
      lastEventAt: thread.lastEventAt ?? null,
      completedAt: thread.completedAt ?? null,
    }
    return { ...persistedThread }
  })
  const appendExecutionEvents = vi.fn(async (_events: AlicizationExecutionEventInput[]) => {})

  return {
    appendExecutionEvents,
    listExecutorSessions,
    listTaskThreads,
    upsertTaskThread,
    readPersistedThread: () => persistedThread,
  }
}

describe('task execution governor', () => {
  it('dedupes an active task thread instead of persisting a duplicate plan', async () => {
    const governor = createTaskExecutionGovernor({
      getNow: () => 160,
    })
    const existingThread = createThread()
    const port = createPort({
      taskThreads: [existingThread],
    })

    const result = await governor.plan(port, {
      threadId: 'thread-governor-new-1',
      now: 160,
      trace: {
        decisionTraceId: 'mind:trace:governor-1',
        turnId: 'turn-governor-2',
        sessionId: 'session-governor-1',
        origin: 'user-turn',
      },
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the runtime regression.',
        origin: 'user',
        effect: 'mutate',
        prefersPersistentSession: true,
      },
      capabilities: createCapabilities(['codex', 'claude-code', 'cli']),
    })

    expect(result.thread.id).toBe(existingThread.id)
    expect(result.plan.state).toBe('routed')
    expect(result.createdEventKinds).toEqual([])
    expect(result.governor.disposition).toBe('duplicate')
    expect(result.governor.reasonCodes).toContain('duplicate-active-thread')
    expect(port.upsertTaskThread).not.toBeCalled()
    expect(port.appendExecutionEvents).not.toBeCalled()
  })

  it('blocks new routed work when the session already carries a running task thread', async () => {
    const governor = createTaskExecutionGovernor({
      getNow: () => 400,
      maxRunningThreadsPerSession: 1,
    })
    const runningThread = createThread({
      id: 'thread-governor-running-1',
      goal: 'Investigate the current browser hang.',
      kind: 'browser-automation',
      status: 'running',
      selectedChannel: 'browser',
      proposedChannel: 'browser',
      summary: 'The browser body is still handling the current hang investigation.',
    })
    const port = createPort({
      taskThreads: [runningThread],
    })

    const result = await governor.plan(port, {
      threadId: 'thread-governor-new-2',
      now: 400,
      trace: {
        decisionTraceId: 'mind:trace:governor-2',
        turnId: 'turn-governor-3',
        sessionId: 'session-governor-1',
        origin: 'user-turn',
      },
      task: {
        kind: 'run-command',
        goal: 'Run the local test suite.',
        origin: 'user',
        effect: 'mutate',
      },
      capabilities: createCapabilities(['cli']),
    })

    expect(result.plan.state).toBe('blocked')
    expect(result.plan.blockedReasonCodes).toContain('session-running-thread-budget-exhausted')
    expect(result.thread.status).toBe('blocked')
    expect(result.thread.selectedChannel).toBeNull()
    expect(result.governor.disposition).toBe('budget-blocked')
    expect(result.governor.activeThreadIds).toEqual(['thread-governor-running-1'])
    expect(port.upsertTaskThread).toBeCalledTimes(1)
    expect(port.appendExecutionEvents).toBeCalledWith([
      expect.objectContaining({
        kind: 'plan',
        threadStatus: 'blocked',
        payload: expect.objectContaining({
          governorReasonCodes: ['session-running-thread-budget-exhausted'],
        }),
      }),
    ])
  })

  it('attaches session-resume hints for openclaw-backed bodies', async () => {
    const governor = createTaskExecutionGovernor({
      getNow: () => 500,
    })
    const port = createPort({
      executorSessions: [createExecutorSession()],
    })

    const result = await governor.plan(port, {
      threadId: 'thread-governor-new-3',
      now: 500,
      trace: {
        decisionTraceId: 'mind:trace:governor-3',
        turnId: 'turn-governor-4',
        sessionId: 'session-governor-1',
        origin: 'user-turn',
      },
      task: {
        kind: 'browser-automation',
        goal: 'Dismiss the foreground browser modal.',
        origin: 'user',
        effect: 'mutate',
        requiresVisualGrounding: true,
      },
      capabilities: createCapabilities(['browser']),
    })

    expect(result.plan.state).toBe('routed')
    expect(result.thread.selectedChannel).toBe('browser')
    expect(result.governor.disposition).toBe('planned')
    expect(result.governor.resumedExternalSessionId).toBe('openclaw-reused-session-1')
    expect(port.listExecutorSessions).toBeCalledWith(expect.objectContaining({
      affinityKey: 'session-governor-1',
      channel: 'openclaw',
      status: ['active', 'running'],
    }))
    expect(port.readPersistedThread()?.metadata).toEqual(expect.objectContaining({
      governor: expect.objectContaining({
        sessionResume: expect.objectContaining({
          channel: 'openclaw',
          executorSessionId: 'executor-session-1',
          externalSessionId: 'openclaw-reused-session-1',
        }),
      }),
    }))
  })
})
