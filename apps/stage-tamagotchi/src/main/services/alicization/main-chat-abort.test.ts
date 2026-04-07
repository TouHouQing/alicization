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
  it('aborts only running chat turns during a bulk stop', () => {
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
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
    }
    const input = createInput()

    const result = abortAlicizationRunningChatRuns({
      runs: [
        ['finished', finishedRun],
        ['aborted', abortedRun],
        ['running', runningRun],
      ],
      reason: 'kill-switch',
      mainChatRunState: input.mainChatRunState,
      createAbortError: input.createAbortError,
    })

    expect(result).toBe(1)
    expect(finishedRun.state).toBe('finished')
    expect(abortedRun.state).toBe('aborted')
    expect(runningRun.state).toBe('aborted')
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
