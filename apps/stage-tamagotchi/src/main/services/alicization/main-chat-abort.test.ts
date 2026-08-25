import type { ChatRunState } from './runtime-soul'

import { describe, expect, it, vi } from 'vitest'

import { abortAlicizationDirectChatRun, abortAlicizationRunningChatRuns } from './main-chat-abort'

function createInput(overrides?: Partial<Parameters<typeof abortAlicizationDirectChatRun>[0]>) {
  return {
    payload: {
      cardId: 'card-1',
      turnId: 'turn-1',
      reason: 'manual',
    },
    getRun: vi.fn(() => ({
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
    })),
    mainChatRunState: {
      createKey: vi.fn(() => 'card-1::turn-1'),
      hasRecentlyFinished: vi.fn(() => false),
      finishRun: vi.fn(),
    },
    createAbortError: (reason: string) => Object.assign(new Error(reason), { name: 'AbortError' }),
    appendRuntimeDebugLine: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('main chat abort', () => {
  it('settles a renderer watchdog abort as timed-out with structured timeout metadata', async () => {
    const controller = new AbortController()
    const run = {
      cardId: 'card-1',
      turnId: 'turn-renderer-timeout',
      controller,
      cancelTurn: vi.fn(async (_reason: unknown) => true),
      chunkCount: 1,
      rawChunkChars: 12,
      state: 'running' as const,
    }
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-renderer-timeout',
        reason: 'stream-timeout',
        timeout: {
          origin: 'renderer-watchdog',
          timeoutPhase: 'liveness-timeout',
          timeoutStage: 'provider',
          timeoutMs: 30_000,
          elapsedMs: 30_125,
          lastEventType: 'provider-keepalive',
          sawAnyEvent: true,
          sawProgress: false,
        },
      },
      getRun: vi.fn(() => run),
      mainChatRunState: {
        createKey: vi.fn((_cardId: string, turnId: string) => `card-1::${turnId}`),
        hasRecentlyFinished: vi.fn(() => false),
        finishRun: vi.fn(),
      },
    })

    const result = await abortAlicizationDirectChatRun(input)

    expect(result).toEqual({
      accepted: true,
      state: 'aborted',
    })
    const cancelReason = vi.mocked(run.cancelTurn).mock.calls[0]?.[0]
    expect(cancelReason).toMatchObject({
      name: 'AbortError',
      errorCode: 'ALICIZATION_RENDERER_STREAM_TIMEOUT',
      timeoutOrigin: 'renderer-watchdog',
      timeoutPhase: 'liveness-timeout',
      timeoutStage: 'provider',
      timeoutDescriptor: input.payload.timeout,
    })
    expect(input.mainChatRunState.finishRun).toHaveBeenCalledWith('card-1::turn-renderer-timeout', {
      status: 'timed-out',
      finishReason: 'chat-provider-liveness-timeout',
      error: expect.any(String),
      failureSurface: expect.objectContaining({
        kind: 'timeout',
        timeout: expect.objectContaining({
          timeoutPhase: 'liveness-timeout',
          timeoutStage: 'provider',
          descriptor: input.payload.timeout,
        }),
      }),
    })
  })

  it('does not abort a direct run after the EventLoop has claimed completed authority', async () => {
    const controller = new AbortController()
    const run = {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller,
      cancelTurn: vi.fn(async () => false),
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
    }
    const input = createInput({
      getRun: vi.fn(() => run),
    })

    const result = await abortAlicizationDirectChatRun(input)

    expect(result).toEqual({
      accepted: false,
      state: 'finished',
    })
    expect(run.cancelTurn).toHaveBeenCalledWith('manual')
    expect(run.state).toBe('running')
    expect(controller.signal.aborted).toBe(false)
    expect(input.mainChatRunState.finishRun).not.toHaveBeenCalled()
    expect(input.appendRuntimeDebugLine).not.toHaveBeenCalled()
  })

  it('settles a direct run as aborted only after the EventLoop accepts cancellation', async () => {
    const controller = new AbortController()
    const run = {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller,
      cancelTurn: vi.fn(async () => true),
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
    }
    const input = createInput({
      getRun: vi.fn(() => run),
    })

    const result = await abortAlicizationDirectChatRun(input)

    expect(result).toEqual({
      accepted: true,
      state: 'aborted',
    })
    expect(run.cancelTurn).toHaveBeenCalledWith('manual')
    expect(run.state).toBe('aborted')
    expect(controller.signal.aborted).toBe(false)
    expect(input.mainChatRunState.finishRun).toHaveBeenCalledWith('card-1::turn-1', {
      status: 'aborted',
      finishReason: 'manual',
    })
  })

  it('does not fall back to the startup controller after the registered EventLoop owner accepts cancellation', async () => {
    const controller = new AbortController()
    const run = {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller,
      cancelTurn: undefined as ChatRunState['cancelTurn'],
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
    }
    run.cancelTurn = vi.fn(async () => {
      delete run.cancelTurn
      return true
    })
    const input = createInput({
      getRun: vi.fn(() => run),
    })

    const result = await abortAlicizationDirectChatRun(input)

    expect(result).toEqual({
      accepted: true,
      state: 'aborted',
    })
    expect(controller.signal.aborted).toBe(false)
  })

  it('aborts only running chat turns accepted by their EventLoop during a bulk stop', async () => {
    const finishedRun = {
      cardId: 'card-1',
      turnId: 'turn-finished',
      controller: new AbortController(),
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'finished' as const,
    }
    const abortedRun = {
      cardId: 'card-1',
      turnId: 'turn-aborted',
      controller: new AbortController(),
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'aborted' as const,
    }
    const runningRun = {
      cardId: 'card-1',
      turnId: 'turn-running',
      controller: new AbortController(),
      cancelTurn: vi.fn(async () => true),
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
    }
    const completedAuthorityRun = {
      cardId: 'card-1',
      turnId: 'turn-completed-authority',
      controller: new AbortController(),
      cancelTurn: vi.fn(async () => false),
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
    }
    const input = createInput()

    const result = await abortAlicizationRunningChatRuns({
      runs: [
        ['finished', finishedRun],
        ['aborted', abortedRun],
        ['running', runningRun],
        ['completed-authority', completedAuthorityRun],
      ],
      reason: 'kill-switch',
      mainChatRunState: input.mainChatRunState,
      createAbortError: input.createAbortError,
    })

    expect(result).toBe(1)
    expect(finishedRun.state).toBe('finished')
    expect(abortedRun.state).toBe('aborted')
    expect(runningRun.state).toBe('aborted')
    expect(completedAuthorityRun.state).toBe('running')
    expect(completedAuthorityRun.controller.signal.aborted).toBe(false)
    expect(runningRun.cancelTurn).toHaveBeenCalledWith('kill-switch')
    expect(completedAuthorityRun.cancelTurn).toHaveBeenCalledWith('kill-switch')
    expect(input.mainChatRunState.finishRun).toHaveBeenCalledTimes(1)
    expect(input.mainChatRunState.finishRun).toHaveBeenCalledWith('running', {
      status: 'aborted',
      finishReason: 'kill-switch',
    })
  })

  it('returns finished when the run was recently completed', async () => {
    const input = createInput({
      getRun: vi.fn(() => undefined),
      mainChatRunState: {
        createKey: vi.fn(() => 'card-1::turn-1'),
        hasRecentlyFinished: vi.fn(() => true),
        finishRun: vi.fn(),
      },
    })

    const result = await abortAlicizationDirectChatRun(input)

    expect(result).toEqual({
      accepted: false,
      state: 'finished',
    })
  })

  it('returns not-found when there is no run state', async () => {
    const input = createInput({
      getRun: vi.fn(() => undefined),
    })

    const result = await abortAlicizationDirectChatRun(input)

    expect(result).toEqual({
      accepted: false,
      state: 'not-found',
    })
  })

  it('aborts and finishes a running chat turn', async () => {
    const run = {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
    }
    const input = createInput({
      getRun: vi.fn(() => run),
    })

    const result = await abortAlicizationDirectChatRun(input)

    expect(result).toEqual({
      accepted: true,
      state: 'aborted',
    })
    expect(run.state).toBe('aborted')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-abort.accepted', {
      cardId: 'card-1',
      turnId: 'turn-1',
      reason: 'manual',
      transport: 'direct',
    })
    expect(input.mainChatRunState.finishRun).toHaveBeenCalledWith('card-1::turn-1', {
      status: 'aborted',
      finishReason: 'manual',
    })
  })
})
