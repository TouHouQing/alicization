import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { describe, expect, it, vi } from 'vitest'

import { prepareTaskThreadDispatch } from './registry'

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
