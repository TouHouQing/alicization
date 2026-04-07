import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { executeOpenClawTaskThread, probeOpenClawCapability } from './openclaw'

const fetchMock = vi.fn()

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-openclaw-1',
    decisionTraceId: 'mind:trace:openclaw-1',
    turnId: 'turn-openclaw-1',
    sessionId: 'session-openclaw-1',
    origin: 'user-turn',
    goal: 'Handle the current embodied browser task.',
    kind: 'browser-automation',
    status: 'planned',
    selectedChannel: 'openclaw',
    proposedChannel: 'openclaw',
    summary: 'planned openclaw body',
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

describe('openclaw executor adapter', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    process.env.ALICIZATION_OPENCLAW_URL = 'http://127.0.0.1:8089'
    process.env.ALICIZATION_OPENCLAW_TOKEN = 'test-token'
    process.env.ALICIZATION_OPENCLAW_DEFAULT_SENDER_ID = 'alicization_tester'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.ALICIZATION_OPENCLAW_URL
    delete process.env.ALICIZATION_OPENCLAW_TOKEN
    delete process.env.ALICIZATION_OPENCLAW_DEFAULT_SENDER_ID
    delete process.env.ALICIZATION_OPENCLAW_TIMEOUT_MS
  })

  it('probes openclaw capability health', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })

    const capability = await probeOpenClawCapability()

    expect(capability).toEqual(expect.objectContaining({
      channel: 'openclaw',
      available: true,
      enabled: true,
      ready: true,
      sessionAffinity: true,
    }))
    expect(fetchMock).toBeCalledWith(
      'http://127.0.0.1:8089/health',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('dispatches openclaw execution and records dispatch, step, and result events', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reply: 'openclaw assistant reply',
        session_id: 'openclaw-session-1',
      }),
    })

    const result = await executeOpenClawTaskThread({
      thread: createThread(),
      command: {
        instruction: 'Inspect the active window and dismiss the visible blocking modal.',
        roleName: 'alicization-assistant',
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-openclaw-1',
          decisionTraceId: 'mind:trace:openclaw-1',
          sensory: {
            collectedAt: 1_710_000_000_123,
            running: true,
            stale: false,
            ageMs: 48,
            foregroundWindow: {
              appName: 'Chrome',
              processName: 'chrome',
              title: 'Alicization',
            },
            capture: {
              health: 'healthy',
              permission: 'granted',
              sourceCount: 1,
              lastUpdatedAt: 1_710_000_000_100,
              lastError: null,
              degradedReasons: [],
            },
          },
        },
      },
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('openclaw assistant reply')
    expect(result.externalSessionId).toBe('openclaw-session-1')
    expect(result.events.map(event => event.kind)).toEqual(expect.arrayContaining(['dispatch', 'step', 'result']))
    expect(fetchMock).toBeCalledWith(
      'http://127.0.0.1:8089/neko/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
          'x-openclaw-token': 'test-token',
        }),
        body: expect.stringContaining('[ALICIZATION_EXECUTION_RUNTIME_CONTEXT]'),
      }),
    )
    const sentBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    expect(sentBody.meta.alicization_runtime_context).toEqual(expect.objectContaining({
      cardId: 'default',
      turnId: 'turn-openclaw-1',
      decisionTraceId: 'mind:trace:openclaw-1',
    }))
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      hasRuntimeContext: true,
      runtimeContext: expect.objectContaining({
        cardId: 'default',
      }),
    }))
  })

  it('preserves facade execution channels in emitted events while using openclaw transport', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reply: 'desktop facade reply',
        session_id: 'openclaw-desktop-facade-session',
      }),
    })

    const result = await executeOpenClawTaskThread({
      thread: createThread({
        selectedChannel: 'desktop',
        proposedChannel: 'desktop',
        kind: 'desktop-automation',
        goal: 'Dismiss the desktop popup.',
      }),
      command: {
        instruction: 'Dismiss the desktop popup blocking the focused window.',
      },
    })

    expect(result.ok).toBe(true)
    expect(result.events.map(event => event.channel)).toEqual(expect.arrayContaining(['desktop']))
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      transportChannel: 'openclaw',
    }))
  })

  it('reuses the governor-provided openclaw session when dispatch input does not pin one', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reply: 'reused session reply',
        session_id: 'openclaw-reused-session-1',
      }),
    })

    const result = await executeOpenClawTaskThread({
      thread: createThread({
        metadata: {
          task: {
            permissionMode: 'implicit',
            effect: 'mutate',
          },
          governor: {
            sessionResume: {
              affinityKey: 'session-openclaw-1',
              channel: 'openclaw',
              executorSessionId: 'executor-session-1',
              externalSessionId: 'openclaw-reused-session-1',
              status: 'running',
            },
          },
        },
      }),
      command: {
        instruction: 'Continue handling the current browser body without starting a fresh session.',
      },
    })

    expect(result.ok).toBe(true)
    const sentBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    expect(sentBody.session_id).toBe('openclaw-reused-session-1')
  })

  it('blocks high-impact openclaw dispatch without explicit permission', async () => {
    const result = await executeOpenClawTaskThread({
      thread: createThread({
        metadata: {
          task: {
            permissionMode: 'implicit',
            effect: 'high-impact',
          },
        },
      }),
      command: {
        instruction: 'Perform an irreversible desktop action.',
      },
    })

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('OPENCLAW_PERMISSION_REQUIRED')
    expect(fetchMock).not.toBeCalled()
  })
})
