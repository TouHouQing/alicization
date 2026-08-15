import type {
  AlicizationExecutionEventInput,
  AlicizationTaskThreadRecord,
} from '@proj-alicization/stage-shared'

import { describe, expect, it, vi } from 'vitest'

import { prepareTaskThreadDispatch } from './registry'

const { executeCodexTaskThreadMock } = vi.hoisted(() => ({
  executeCodexTaskThreadMock: vi.fn(),
}))

vi.mock('./codex', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./codex')>()
  return {
    ...actual,
    executeCodexTaskThread: executeCodexTaskThreadMock,
  }
})

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-registry-1',
    decisionTraceId: 'mind:trace:registry-1',
    turnId: 'turn-registry-1',
    sessionId: 'session-registry-1',
    origin: 'user-turn',
    goal: 'Run current thread task.',
    kind: 'run-command',
    status: 'planned',
    selectedChannel: 'cli',
    proposedChannel: 'cli',
    summary: 'planned cli dispatch',
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

describe('task-thread dispatch adapter registry', () => {
  it('returns unsupported-channel failure for unimplemented channels', () => {
    const prepared = prepareTaskThreadDispatch({
      thread: createThread({
        selectedChannel: 'openfang',
        proposedChannel: 'openfang',
      }),
      dispatchInput: {},
    })

    expect(prepared.ok).toBe(false)
    if (prepared.ok)
      return
    expect(prepared.errorCode).toBe('TASK_THREAD_CHANNEL_UNSUPPORTED')
  })

  it('returns missing payload error for selected channel', () => {
    const prepared = prepareTaskThreadDispatch({
      thread: createThread({
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        kind: 'codebase-edit',
      }),
      dispatchInput: {},
    })

    expect(prepared.ok).toBe(false)
    if (prepared.ok)
      return
    expect(prepared.errorCode).toBe('TASK_THREAD_CODEX_INPUT_REQUIRED')
  })

  it.each([
    {
      channel: 'cli' as const,
      dispatchInput: { cli: { command: '' } },
      errorCode: 'TASK_THREAD_CLI_INPUT_REQUIRED',
    },
    {
      channel: 'codex' as const,
      dispatchInput: { codex: { prompt: '   ' } },
      errorCode: 'TASK_THREAD_CODEX_INPUT_REQUIRED',
    },
    {
      channel: 'claude-code' as const,
      dispatchInput: { claudeCode: { prompt: '\n\t' } },
      errorCode: 'TASK_THREAD_CLAUDE_CODE_INPUT_REQUIRED',
    },
  ])('rejects blank $channel command payloads before adapter execution', ({
    channel,
    dispatchInput,
    errorCode,
  }) => {
    const prepared = prepareTaskThreadDispatch({
      thread: createThread({
        selectedChannel: channel,
        proposedChannel: channel,
      }),
      dispatchInput,
    })

    expect(prepared.ok).toBe(false)
    if (prepared.ok)
      return
    expect(prepared.errorCode).toBe(errorCode)
  })

  it('prepares executable dispatch and runs cli adapter', async () => {
    const prepared = prepareTaskThreadDispatch({
      thread: createThread(),
      dispatchInput: {
        cli: {
          command: 'node',
          args: ['-e', 'console.log("registry ok")'],
        },
      },
    })

    expect(prepared.ok).toBe(true)
    if (!prepared.ok)
      return
    expect(prepared.channel).toBe('cli')

    const result = await prepared.run({
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.summary).toContain('registry ok')
  })

  it('forwards live execution events into the Codex adapter runtime', async () => {
    const liveEvent: AlicizationExecutionEventInput = {
      threadId: 'thread-registry-1',
      kind: 'step',
      channel: 'codex',
      threadStatus: 'running',
      payload: {
        codexEventType: 'item.started',
        semanticProgress: true,
      },
      createdAt: 120,
    }
    executeCodexTaskThreadMock.mockImplementationOnce(async (input) => {
      await input.onExecutionEvent?.(liveEvent)
      return {
        ok: true,
        finalStatus: 'completed',
        summary: 'codex registry live progress ok',
        output: 'done',
        events: [liveEvent],
      }
    })
    const onExecutionEvent = vi.fn(async () => {})
    const prepared = prepareTaskThreadDispatch({
      thread: createThread({
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        kind: 'codebase-investigation',
      }),
      dispatchInput: {
        codex: {
          prompt: 'Inspect the current repository.',
        },
      },
    })

    expect(prepared.ok).toBe(true)
    if (!prepared.ok)
      return

    const result = await prepared.run({
      onExecutionEvent,
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(onExecutionEvent).toHaveBeenCalledWith(liveEvent)
    expect(executeCodexTaskThreadMock).toHaveBeenCalledWith(expect.objectContaining({
      onExecutionEvent,
    }))
  })

  it('prepares executable dispatch and routes openclaw instructions', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reply: 'openclaw registry ok',
        session_id: 'openclaw-registry-session',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    process.env.ALICIZATION_OPENCLAW_URL = 'http://127.0.0.1:8089'

    try {
      const prepared = prepareTaskThreadDispatch({
        thread: createThread({
          selectedChannel: 'openclaw',
          proposedChannel: 'openclaw',
          kind: 'browser-automation',
          goal: 'Dismiss the active modal.',
        }),
        dispatchInput: {
          openclaw: {
            instruction: 'Dismiss the active modal in the focused browser window.',
          },
        },
      })

      expect(prepared.ok).toBe(true)
      if (!prepared.ok)
        return
      expect(prepared.channel).toBe('openclaw')

      const result = await prepared.run({})

      expect(result.ok).toBe(true)
      expect(result.finalStatus).toBe('completed')
      expect(result.summary).toContain('openclaw registry ok')
    }
    finally {
      vi.unstubAllGlobals()
      delete process.env.ALICIZATION_OPENCLAW_URL
    }
  })

  it('preserves browser/software/desktop semantic channels while falling back to openclaw transport', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reply: 'browser facade registry ok',
        session_id: 'openclaw-browser-facade-session',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    process.env.ALICIZATION_OPENCLAW_URL = 'http://127.0.0.1:8089'

    try {
      const prepared = prepareTaskThreadDispatch({
        thread: createThread({
          selectedChannel: 'browser',
          proposedChannel: 'browser',
          kind: 'browser-automation',
          goal: 'Submit the visible browser form.',
        }),
        dispatchInput: {
          openclaw: {
            instruction: 'Submit the visible browser form in the focused tab.',
          },
        },
      })

      expect(prepared.ok).toBe(true)
      if (!prepared.ok)
        return
      expect(prepared.channel).toBe('browser')
      expect(prepared.sessionTrackingChannel).toBe('openclaw')

      const result = await prepared.run({})

      expect(result.ok).toBe(true)
      expect(result.finalStatus).toBe('completed')
      expect(result.summary).toContain('browser facade registry ok')
      expect(result.events[0]?.channel).toBe('browser')
      expect(fetchMock).toBeCalledTimes(1)
    }
    finally {
      vi.unstubAllGlobals()
      delete process.env.ALICIZATION_OPENCLAW_URL
    }
  })

  it('prefers local visual dispatch for browser threads when a local GUI surface is available', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    try {
      const prepared = prepareTaskThreadDispatch({
        thread: createThread({
          selectedChannel: 'browser',
          proposedChannel: 'browser',
          kind: 'browser-automation',
          goal: 'Submit the visible browser form.',
        }),
        dispatchInput: {
          openclaw: {
            instruction: 'Submit the visible browser form in the focused tab.',
          },
        },
        localVisualSurface: {
          desktopInspectScene: vi.fn(async () => ({
            channel: 'desktop',
            status: 'completed',
            operation: 'desktop_inspect_scene',
            summary: 'Locally inspected the active browser workflow and prepared the next step.',
            output: 'local visual dispatch ok',
            pagePhase: 'form-entry',
            workflowPlan: {
              continuationMode: 'ready-to-act',
            },
            suggestedActions: [],
            blockingSignals: [],
          })),
        },
      })

      expect(prepared.ok).toBe(true)
      if (!prepared.ok)
        return
      expect(prepared.channel).toBe('browser')

      const result = await prepared.run({})

      expect(result.ok).toBe(true)
      expect(result.finalStatus).toBe('completed')
      expect(result.summary).toContain('local visual dispatch ok')
      expect(result.events[0]?.channel).toBe('browser')
      expect(fetchMock).not.toBeCalled()
    }
    finally {
      vi.unstubAllGlobals()
    }
  })

  it('accepts dedicated local visual payloads for browser threads when a local GUI surface is available', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    try {
      const prepared = prepareTaskThreadDispatch({
        thread: createThread({
          selectedChannel: 'browser',
          proposedChannel: 'browser',
          kind: 'browser-automation',
          goal: 'Submit the visible browser form.',
        }),
        dispatchInput: {
          localVisual: {
            instruction: 'Submit the visible browser form in the focused tab.',
            runtimeContext: {
              generatedAt: 1_710_000_000_000,
              cardId: 'default',
              turnId: 'turn-registry-local-visual',
              decisionTraceId: 'mind:trace:registry-local-visual',
              sessionId: 'session-registry-local-visual',
              sensory: {
                collectedAt: 1_710_000_000_000,
                running: true,
                stale: false,
                ageMs: 0,
                foregroundWindow: null,
                capture: null,
              },
            },
          },
        } as any,
        localVisualSurface: {
          desktopInspectScene: vi.fn(async () => ({
            channel: 'desktop',
            status: 'completed',
            operation: 'desktop_inspect_scene',
            summary: 'Locally inspected the active browser workflow from a dedicated local visual payload.',
            output: 'local visual payload dispatch ok',
            pagePhase: 'form-entry',
            workflowPlan: {
              continuationMode: 'ready-to-act',
            },
            suggestedActions: [],
            blockingSignals: [],
          })),
        },
      })

      expect(prepared.ok).toBe(true)
      if (!prepared.ok)
        return
      expect(prepared.channel).toBe('browser')

      const result = await prepared.run({})

      expect(result.ok).toBe(true)
      expect(result.finalStatus).toBe('completed')
      expect(result.summary).toContain('dedicated local visual payload')
      expect(result.events[0]?.channel).toBe('browser')
      expect(fetchMock).not.toBeCalled()
    }
    finally {
      vi.unstubAllGlobals()
    }
  })
})
