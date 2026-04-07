import type { AlicizationExecutionEventInput, AlicizationTaskThreadRecord, AlicizationTaskThreadUpsertInput } from '@proj-alicization/stage-shared'

import { describe, expect, it, vi } from 'vitest'

import { dispatchTaskThread } from './task-thread-dispatcher'

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-dispatch-1',
    decisionTraceId: 'mind:trace:dispatch-1',
    turnId: 'turn-dispatch-1',
    sessionId: 'session-dispatch-1',
    origin: 'user-turn',
    goal: 'Execute the current CLI body.',
    kind: 'run-command',
    status: 'planned',
    selectedChannel: 'cli',
    proposedChannel: 'cli',
    summary: 'planned cli body',
    metadata: {
      task: {
        permissionMode: 'implicit',
        effect: 'mutate',
      },
    },
    createdAt: 100,
    updatedAt: 100,
    lastEventAt: null,
    completedAt: null,
    ...overrides,
  }
}

function createPort(initialThread: AlicizationTaskThreadRecord) {
  let currentThread = { ...initialThread }

  const getTaskThread = vi.fn(async (id: string) => {
    if (id !== currentThread.id)
      return undefined
    return { ...currentThread }
  })
  const appendExecutionEvents = vi.fn(async (events: AlicizationExecutionEventInput[]) => {
    const latest = [...events].sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0)).at(-1)
    if (!latest)
      return

    currentThread = {
      ...currentThread,
      status: latest.threadStatus ?? currentThread.status,
      lastEventAt: latest.createdAt ?? currentThread.lastEventAt,
      updatedAt: latest.createdAt ?? currentThread.updatedAt,
      completedAt: latest.threadStatus === 'completed' || latest.threadStatus === 'failed' || latest.threadStatus === 'cancelled'
        ? (latest.createdAt ?? currentThread.completedAt ?? currentThread.updatedAt)
        : currentThread.completedAt,
    }
  })
  const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadUpsertInput) => {
    currentThread = {
      ...currentThread,
      ...input,
      id: input.id ?? currentThread.id,
    }
    return { ...currentThread }
  })
  const upsertExecutorSession = vi.fn().mockResolvedValue(undefined)
  const appendAuditLog = vi.fn().mockResolvedValue(undefined)

  return {
    getTaskThread,
    appendExecutionEvents,
    upsertTaskThread,
    upsertExecutorSession,
    appendAuditLog,
    readThread: () => ({ ...currentThread }),
  }
}

describe('task-thread dispatcher', () => {
  it('dispatches a planned CLI thread into completed state', async () => {
    const port = createPort(createThread())

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("dispatcher ok")'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.thread.status).toBe('completed')
    expect(result.createdEventKinds).toEqual(expect.arrayContaining(['dispatch', 'result']))
    expect(result.summary).toContain('dispatcher ok')
    expect(port.appendExecutionEvents).toBeCalledTimes(1)
    expect(port.upsertTaskThread).toBeCalled()
  })

  it('keeps non-planned threads from dispatching', async () => {
    const port = createPort(createThread({
      status: 'needs-affirmation',
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("no run")'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('TASK_THREAD_NOT_DISPATCHABLE')
    expect(result.createdEventKinds).toEqual([])
    expect(port.appendExecutionEvents).not.toBeCalled()
  })

  it('marks threads blocked when dispatch is attempted under kill-switch suspension', async () => {
    const port = createPort(createThread())

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("blocked")'],
      },
      killSwitchSuspended: true,
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.thread.status).toBe('blocked')
    expect(result.createdEventKinds).toEqual(['cancel'])
    expect(port.appendExecutionEvents).toBeCalledWith([
      expect.objectContaining({
        kind: 'cancel',
        threadStatus: 'blocked',
      }),
    ])
  })

  it('requires codex payload when the planned thread selects codex', async () => {
    const port = createPort(createThread({
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      kind: 'codebase-investigation',
      goal: 'Inspect the current codebase task.',
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('TASK_THREAD_CODEX_INPUT_REQUIRED')
    expect(result.createdEventKinds).toEqual([])
    expect(port.appendExecutionEvents).not.toBeCalled()
  })

  it('requires claude-code payload when the planned thread selects claude-code', async () => {
    const port = createPort(createThread({
      selectedChannel: 'claude-code',
      proposedChannel: 'claude-code',
      kind: 'agent-delegation',
      goal: 'Delegate the current coding task.',
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('TASK_THREAD_CLAUDE_CODE_INPUT_REQUIRED')
    expect(result.createdEventKinds).toEqual([])
    expect(port.appendExecutionEvents).not.toBeCalled()
  })

  it('dispatches openclaw payloads through the embodied executor channel', async () => {
    const port = createPort(createThread({
      selectedChannel: 'openclaw',
      proposedChannel: 'openclaw',
      kind: 'desktop-automation',
      goal: 'Close the foreground popup.',
    }))
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        reply: 'popup closed',
        session_id: 'openclaw-dispatch-session',
      }),
    }))
    const previousUrl = process.env.ALICIZATION_OPENCLAW_URL
    const previousToken = process.env.ALICIZATION_OPENCLAW_TOKEN
    process.env.ALICIZATION_OPENCLAW_URL = 'http://127.0.0.1:9311'
    process.env.ALICIZATION_OPENCLAW_TOKEN = 'test-token'
    vi.stubGlobal('fetch', fetchMock)

    try {
      const result = await dispatchTaskThread(port, {
        threadId: 'thread-dispatch-1',
        openclaw: {
          instruction: 'Close the popup that is blocking the current screen.',
          runtimeContext: {
            generatedAt: 1_710_000_000_000,
            cardId: 'default',
            turnId: 'turn-dispatch-1',
            decisionTraceId: 'mind:trace:dispatch-1',
            sensory: {
              collectedAt: 1_710_000_000_123,
              running: true,
              stale: false,
              ageMs: 11,
              foregroundWindow: {
                appName: 'Cursor',
                processName: 'cursor',
                title: 'airi-alice',
              },
              capture: {
                health: 'healthy',
                permission: 'granted',
                sourceCount: 2,
                lastUpdatedAt: 1_710_000_000_100,
                lastError: null,
                degradedReasons: [],
              },
            },
          },
        },
      })

      expect(result.ok).toBe(true)
      expect(result.thread.status).toBe('completed')
      expect(result.createdEventKinds).toEqual(expect.arrayContaining(['dispatch', 'step', 'result']))
      expect(result.summary).toContain('popup closed')
      expect(port.upsertExecutorSession).toBeCalledWith(expect.objectContaining({
        channel: 'openclaw',
        metadata: expect.objectContaining({
          selectedChannel: 'openclaw',
          transportChannel: 'openclaw',
          execution: expect.objectContaining({
            runtimeContext: expect.objectContaining({
              cardId: 'default',
              turnId: 'turn-dispatch-1',
              sensory: expect.objectContaining({
                foregroundWindow: expect.objectContaining({
                  appName: 'Cursor',
                }),
              }),
            }),
          }),
        }),
      }))
      expect(fetchMock).toBeCalledTimes(1)
    }
    finally {
      vi.unstubAllGlobals()
      if (typeof previousUrl === 'string')
        process.env.ALICIZATION_OPENCLAW_URL = previousUrl
      else
        delete process.env.ALICIZATION_OPENCLAW_URL
      if (typeof previousToken === 'string')
        process.env.ALICIZATION_OPENCLAW_TOKEN = previousToken
      else
        delete process.env.ALICIZATION_OPENCLAW_TOKEN
    }
  })

  it('dispatches browser facade threads through openclaw while keeping browser execution events', async () => {
    const port = createPort(createThread({
      selectedChannel: 'browser',
      proposedChannel: 'browser',
      kind: 'browser-automation',
      goal: 'Submit the visible browser form.',
    }))
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        reply: 'browser form submitted',
        session_id: 'openclaw-browser-session',
      }),
    }))
    const previousUrl = process.env.ALICIZATION_OPENCLAW_URL
    const previousToken = process.env.ALICIZATION_OPENCLAW_TOKEN
    process.env.ALICIZATION_OPENCLAW_URL = 'http://127.0.0.1:9311'
    process.env.ALICIZATION_OPENCLAW_TOKEN = 'test-token'
    vi.stubGlobal('fetch', fetchMock)

    try {
      const result = await dispatchTaskThread(port, {
        threadId: 'thread-dispatch-1',
        openclaw: {
          instruction: 'Submit the visible browser form in the focused tab.',
        },
      })

      expect(result.ok).toBe(true)
      expect(result.thread.status).toBe('completed')
      expect(result.createdEventKinds).toEqual(expect.arrayContaining(['dispatch', 'step', 'result']))
      expect(result.summary).toContain('browser form submitted')
      expect(port.appendExecutionEvents).toBeCalledWith(expect.arrayContaining([
        expect.objectContaining({
          channel: 'browser',
          kind: 'dispatch',
        }),
        expect.objectContaining({
          channel: 'browser',
          kind: 'result',
        }),
      ]))
      expect(port.upsertExecutorSession).toBeCalledWith(expect.objectContaining({
        channel: 'openclaw',
        metadata: expect.objectContaining({
          selectedChannel: 'browser',
          transportChannel: 'openclaw',
        }),
      }))
      expect(fetchMock).toBeCalledTimes(1)
    }
    finally {
      vi.unstubAllGlobals()
      if (typeof previousUrl === 'string')
        process.env.ALICIZATION_OPENCLAW_URL = previousUrl
      else
        delete process.env.ALICIZATION_OPENCLAW_URL
      if (typeof previousToken === 'string')
        process.env.ALICIZATION_OPENCLAW_TOKEN = previousToken
      else
        delete process.env.ALICIZATION_OPENCLAW_TOKEN
    }
  })

  it('persists execution runtime context onto the task thread metadata before dispatch', async () => {
    const port = createPort(createThread())

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("dispatcher context ok")'],
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-dispatch-1',
          decisionTraceId: 'mind:trace:dispatch-1',
          sensory: {
            collectedAt: 1_710_000_000_123,
            running: true,
            stale: false,
            ageMs: 11,
            foregroundWindow: {
              appName: 'Cursor',
              processName: 'cursor',
              title: 'airi-alice',
            },
            capture: {
              health: 'healthy',
              permission: 'granted',
              sourceCount: 2,
              lastUpdatedAt: 1_710_000_000_100,
              lastError: null,
              degradedReasons: [],
            },
          },
        },
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(port.readThread().metadata).toEqual(expect.objectContaining({
      execution: expect.objectContaining({
        runtimeContext: expect.objectContaining({
          cardId: 'default',
          turnId: 'turn-dispatch-1',
        }),
      }),
    }))
  })
})
