import { afterEach, describe, expect, it, vi } from 'vitest'

import { createCaptionFollowScheduler } from './follow-scheduler'

afterEach(() => vi.useRealTimers())

describe('caption following lifetime', () => {
  it('cancels queued moves and settling before stopping the animation', () => {
    vi.useFakeTimers()
    const move = vi.fn()
    const settle = vi.fn()
    const stop = vi.fn()
    const follow = createCaptionFollowScheduler({ isAvailable: () => true, move, settle, stop })
    follow.request()
    follow.request()
    const initialMoves = move.mock.calls.length
    expect(initialMoves).toBe(1)
    follow.dispose()
    follow.request()
    vi.advanceTimersByTime(1000)
    expect(move).toHaveBeenCalledTimes(initialMoves)
    expect(settle).not.toHaveBeenCalled()
    expect(stop).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not touch destroyed windows even when availability changes after scheduling', () => {
    vi.useFakeTimers()
    let destroyed = false
    const readBounds = vi.fn(() => {
      if (destroyed)
        throw new Error('Object has been destroyed')
    })
    const follow = createCaptionFollowScheduler({ isAvailable: () => !destroyed, move: readBounds, settle: readBounds, stop: vi.fn() })
    follow.request()
    follow.request()
    destroyed = true
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
    expect(readBounds).toHaveBeenCalledOnce()
    follow.dispose()
  })

  it('settles to the latest move after a burst and disposes once', () => {
    vi.useFakeTimers()
    let target = 0
    let moved = -1
    const settled: number[] = []
    const stop = vi.fn()
    const follow = createCaptionFollowScheduler({
      isAvailable: () => true,
      move: () => {
        moved = target
      },
      settle: () => settled.push(moved),
      stop,
    })
    follow.request()
    target = 42
    follow.request()
    vi.advanceTimersByTime(220)
    expect(settled).toEqual([42])
    follow.dispose()
    follow.dispose()
    expect(stop).toHaveBeenCalledOnce()
  })
})
