import type { PlaybackItem, PlaybackResult } from '../types'

import { describe, expect, it, vi } from 'vitest'

import { createPlaybackManager } from './playback-manager'

const item: PlaybackItem<string> = { id: 'one', streamId: 'stream', intentId: 'intent', segmentId: 'segment', priority: 1, text: 'hello', special: null, continuityHoldMs: 0, audio: 'audio', createdAt: 0 }

describe('playback outcome authority', () => {
  it('emits success only for completed audio and a separate failure for device errors', async () => {
    const play = vi.fn(async (): Promise<PlaybackResult> => ({ status: 'failed', playedMs: 120, errorCode: 'device-lost' }))
    const manager = createPlaybackManager({ play })
    const end = vi.fn()
    const failure = vi.fn()
    manager.onEnd(end)
    manager.onFailure(failure)
    manager.schedule(item)
    await vi.waitFor(() => expect(failure).toHaveBeenCalledOnce())
    expect(end).not.toHaveBeenCalled()
    expect(failure.mock.calls[0][0].result.playedMs).toBe(120)
    play.mockResolvedValueOnce({ status: 'completed', playedMs: 600, errorCode: null })
    manager.schedule({ ...item, id: 'two' })
    await vi.waitFor(() => expect(end).toHaveBeenCalledOnce())
  })

  it('ignores a cancelled playback completion after another item reuses its id', async () => {
    const pending: Array<(result: PlaybackResult) => void> = []
    const manager = createPlaybackManager({ play: () => new Promise<PlaybackResult>(resolve => pending.push(resolve)) })
    const end = vi.fn()
    const interrupt = vi.fn()
    manager.onEnd(end)
    manager.onInterrupt(interrupt)
    manager.schedule(item)
    manager.stopAll('user-interruption')
    manager.schedule(item)
    pending[0]({ status: 'completed', playedMs: 100, errorCode: null })
    await Promise.resolve()
    expect(end).not.toHaveBeenCalled()
    expect(interrupt).toHaveBeenCalledOnce()
    pending[1]({ status: 'completed', playedMs: 200, errorCode: null })
    await vi.waitFor(() => expect(end).toHaveBeenCalledOnce())
  })
})
