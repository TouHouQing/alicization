import { afterEach, describe, expect, it, vi } from 'vitest'

import { createExecutionStorageMaintenance } from './storage-maintenance'

const MiB = 1024 * 1024
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function fixture(input: { available?: bigint, bytes?: number, busy?: boolean } = {}) {
  let available = input.available ?? 1024n * BigInt(MiB)
  let bytes = input.bytes ?? MiB
  let busy = input.busy ?? false
  const cache = { size: vi.fn(async () => bytes), clear: vi.fn(async () => {
    bytes = 0
  }) }
  const probe = vi.fn(async () => available)
  const observe = vi.fn()
  const controller = createExecutionStorageMaintenance({ root: '.', cache, probe, canMaintain: () => !busy, deadlineMs: 25, observe })
  return { controller, cache, probe, observe, available: (value: bigint) => {
    available = value
  }, busy: (value: boolean) => {
    busy = value
  } }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('host storage pressure and cache ownership', () => {
  it('clears only the injected cache and reports low space until independent disk readback improves', async () => {
    const { controller, cache, available } = fixture({ available: 400n * BigInt(MiB), bytes: 8 * MiB })
    const result = await controller.inspect()
    expect(cache.clear).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ state: 'ready', pressure: 'low', cacheBytes: 0, releasedCacheBytes: 8 * MiB, cleanupPending: false })
    expect(await controller.optionalWorkAllowed()).toBe(false)
    expect(cache.clear).toHaveBeenCalledTimes(1)
    available(1024n * BigInt(MiB))
    expect(await controller.optionalWorkAllowed()).toBe(true)
    await controller.close()
  })

  it('defers oversized-cache cleanup while an execution writer is active, then retries after it stops', async () => {
    const { controller, cache, busy } = fixture({ bytes: 129 * MiB, busy: true })
    expect(await controller.inspect()).toMatchObject({ state: 'deferred', pressure: 'normal' })
    expect(cache.clear).not.toHaveBeenCalled()
    busy(false)
    expect(await controller.inspect()).toMatchObject({ state: 'ready', cacheBytes: 0 })
    expect(cache.clear).toHaveBeenCalledTimes(1)
    await controller.close()
  })

  it('coalesces concurrent explicit cleanup and keeps a timed-out native cleanup owned until it actually ends', async () => {
    vi.useFakeTimers()
    const { controller, cache } = fixture()
    const pending = deferred<void>()
    cache.clear.mockImplementation(() => pending.promise)
    const first = controller.inspect({ clearCache: true })
    const second = controller.inspect({ clearCache: true })
    await vi.advanceTimersByTimeAsync(26)
    expect(await first).toMatchObject({ state: 'cleaning', cleanupPending: true })
    expect(await second).toMatchObject({ state: 'cleaning', cleanupPending: true })
    const late = controller.inspect({ clearCache: true })
    await vi.advanceTimersByTimeAsync(1)
    expect(await late).toMatchObject({ cleanupPending: true })
    expect(cache.clear).toHaveBeenCalledTimes(1)
    pending.resolve()
    await vi.advanceTimersByTimeAsync(1)
    expect(controller.snapshot()).toMatchObject({ state: 'ready', cleanupPending: false, releasedCacheBytes: 0 })
    await controller.close()
  })

  it('joins an in-flight probe when explicit cleanup arrives without dispatching two cleanups', async () => {
    const { controller, cache, probe } = fixture()
    const pending = deferred<bigint>()
    probe.mockImplementationOnce(() => pending.promise)
    const first = controller.inspect()
    const explicit = controller.inspect({ clearCache: true })
    pending.resolve(1024n * BigInt(MiB))
    await Promise.all([first, explicit])
    expect(cache.clear).toHaveBeenCalledTimes(1)
    await controller.close()
  })

  it('does not admit optional work from an old healthy reading while a new disk probe has timed out', async () => {
    vi.useFakeTimers()
    const { controller, probe } = fixture()
    expect(await controller.optionalWorkAllowed()).toBe(true)
    const pending = deferred<bigint>()
    probe.mockImplementationOnce(() => pending.promise)
    const allowed = controller.optionalWorkAllowed()
    await vi.advanceTimersByTimeAsync(26)
    expect(await allowed).toBe(false)
    pending.resolve(100n * BigInt(MiB))
    await vi.advanceTimersByTimeAsync(1)
    expect(controller.snapshot().pressure).toBe('low')
    await controller.close()
  })

  it('honors explicit cleanup arriving after a background check decided to finish but before its owner is released', async () => {
    const { controller, cache } = fixture()
    let explicit!: Promise<unknown>
    cache.size.mockImplementationOnce(async () => {
      queueMicrotask(() => queueMicrotask(() => {
        explicit = controller.inspect({ clearCache: true })
      }))
      return MiB
    })
    await controller.inspect()
    await explicit
    expect(cache.clear).toHaveBeenCalledTimes(1)
    expect(controller.snapshot()).toMatchObject({ state: 'ready', cacheBytes: 0, cleanupPending: false })
    await controller.close()
  })

  it('retains cleanup ownership until independent readback completes, including after the native API resolves', async () => {
    vi.useFakeTimers()
    const { controller, cache } = fixture()
    const readback = deferred<number>()
    cache.size.mockResolvedValueOnce(MiB).mockImplementationOnce(() => readback.promise)
    const first = controller.inspect({ clearCache: true })
    await vi.advanceTimersByTimeAsync(26)
    expect(await first).toMatchObject({ state: 'cleaning', cleanupPending: true })
    const joined = controller.inspect({ clearCache: true })
    await vi.advanceTimersByTimeAsync(1)
    expect(await joined).toMatchObject({ cleanupPending: true })
    expect(cache.clear).toHaveBeenCalledTimes(1)
    readback.resolve(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(controller.snapshot()).toMatchObject({ state: 'ready', cleanupPending: false, releasedCacheBytes: MiB })
    await controller.close()
  })

  it('does not claim released bytes on cache errors and makes optional generation wait for a known disk result', async () => {
    const { controller, cache } = fixture()
    cache.clear.mockRejectedValue(new Error('native cache unavailable'))
    expect(await controller.inspect({ clearCache: true })).toMatchObject({ state: 'failed', cleanedAt: null, releasedCacheBytes: 0, cleanupPending: false })
    const unknown = fixture({ available: -1n })
    expect(await unknown.controller.optionalWorkAllowed()).toBe(false)
    expect(unknown.cache.clear).not.toHaveBeenCalled()
    await Promise.all([controller.close(), unknown.controller.close()])
  })

  it('ignores late observations after shutdown and never starts a cleanup on a closed owner', async () => {
    vi.useFakeTimers()
    const { controller, probe, observe, cache } = fixture({ bytes: 129 * MiB })
    const pending = deferred<bigint>()
    probe.mockImplementationOnce(() => pending.promise)
    const running = controller.inspect({ clearCache: true })
    const closing = controller.close()
    await vi.advanceTimersByTimeAsync(26)
    await Promise.all([running, closing])
    pending.resolve(1024n * BigInt(MiB))
    await vi.advanceTimersByTimeAsync(1)
    expect(controller.snapshot().state).toBe('closed')
    expect(cache.clear).not.toHaveBeenCalled()
    expect(observe).not.toHaveBeenCalled()
    await controller.inspect({ clearCache: true })
    expect(probe).toHaveBeenCalledTimes(1)
  })

  it('allows cancellation of the caller without losing ownership of native maintenance', async () => {
    const { controller, probe, cache } = fixture()
    const pending = deferred<bigint>()
    probe.mockImplementationOnce(() => pending.promise)
    const caller = new AbortController()
    const running = controller.inspect({ clearCache: true, signal: caller.signal })
    caller.abort(new Error('host changed card'))
    await expect(running).rejects.toThrow('host changed card')
    pending.resolve(1024n * BigInt(MiB))
    await controller.inspect()
    expect(cache.clear).toHaveBeenCalledTimes(1)
    await controller.close()
  })

  it('rejects invalid cache sizes and isolates diagnostics failures from successful cleanup', async () => {
    const { controller, cache } = fixture({ bytes: Number.NaN })
    expect(await controller.inspect()).toMatchObject({ state: 'failed', pressure: 'unknown' })
    expect(cache.clear).not.toHaveBeenCalled()
    await controller.close()
    const good = createExecutionStorageMaintenance({ root: '.', cache: { size: async () => 0, clear: vi.fn() }, probe: async () => 1024n * BigInt(MiB), canMaintain: () => true, observe: () => {
      throw new Error('observer failed')
    } })
    expect((await good.inspect()).pressure).toBe('normal')
    await good.close()
  })
})
