import type { ExecutionRuntimeHealth } from './runtime-health'

import { describe, expect, it, vi } from 'vitest'

import { createExecutionHealthProbe } from './runtime-health'

describe('bounded runtime health observations', () => {
  it('shares an actual probe and caches its result rather than declaring a handler healthy', async () => {
    let now = 100
    const check = vi.fn(async (): Promise<Omit<ExecutionRuntimeHealth, 'observedAt'>> => ({ available: true, ready: false, reason: 'worker-unavailable' }))
    const health = createExecutionHealthProbe({ probe: check, failureReason: 'probe-failed', now: () => now, ttlMs: 10 })
    expect(await Promise.all([health(), health()])).toEqual(Array.from({ length: 2 }, () => ({ available: true, ready: false, reason: 'worker-unavailable', observedAt: 100 })))
    expect(check).toHaveBeenCalledTimes(1)
    check.mockResolvedValue({ available: true, ready: true, reason: null })
    now = 109
    expect((await health()).ready).toBe(false)
    now = 110
    expect((await health()).ready).toBe(true)
    expect(check).toHaveBeenCalledTimes(2)
  })

  it('does not start a second worker or accept late success while a timed-out probe still runs', async () => {
    vi.useFakeTimers()
    try {
      let finish!: (result: { available: boolean, ready: boolean, reason: null }) => void
      const check = vi.fn(() => new Promise<{ available: boolean, ready: boolean, reason: null }>((resolve) => { finish = resolve }))
      const health = createExecutionHealthProbe({ probe: check, failureReason: 'probe-failed', timeoutMs: 10, ttlMs: 20 })
      const pending = health()
      await vi.advanceTimersByTimeAsync(10)
      expect(await pending).toMatchObject({ ready: false, reason: 'probe-failed' })
      await vi.advanceTimersByTimeAsync(21)
      expect(await health()).toMatchObject({ ready: false })
      expect(check).toHaveBeenCalledTimes(1)
      finish({ available: true, ready: true, reason: null })
      await vi.advanceTimersByTimeAsync(0)
      check.mockResolvedValue({ available: true, ready: true, reason: null })
      expect(await health()).toMatchObject({ ready: true })
      expect(check).toHaveBeenCalledTimes(2)
    }
    finally { vi.useRealTimers() }
  })
})
