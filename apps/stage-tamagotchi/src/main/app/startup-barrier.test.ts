import { describe, expect, it, vi } from 'vitest'

import { createAppStartupBarrier } from './startup-barrier'

describe('native resource ownership during startup and early shutdown', () => {
  it('waits for an in-flight factory to register its cleanup before services stop', async () => {
    const barrier = createAppStartupBarrier()
    const opened = Promise.withResolvers<void>()
    const entered = Promise.withResolvers<void>()
    const events: string[] = []
    const close = vi.fn(async () => {
      events.push('native-closed')
    })
    let cleanup: (() => Promise<void>) | null = null
    const start = barrier.start(async (isStopping) => {
      events.push('native-opening')
      entered.resolve()
      await opened.promise
      cleanup = close
      events.push('cleanup-registered')
      if (!isStopping())
        events.push('ready')
    })
    await entered.promise
    let stopped = false
    const stop = barrier.stop().then(async () => {
      await cleanup?.()
      stopped = true
    })
    expect(barrier.isStopping()).toBe(true)
    await Promise.resolve()
    expect(stopped).toBe(false)
    expect(close).not.toHaveBeenCalled()
    opened.resolve()
    await Promise.all([start, stop])
    expect(events).toEqual(['native-opening', 'cleanup-registered', 'native-closed'])
    expect(close).toHaveBeenCalledOnce()
  })

  it('does not open resources if exit wins before initialization begins', async () => {
    const barrier = createAppStartupBarrier()
    const initialize = vi.fn(async () => {})
    const start = barrier.start(initialize)
    await barrier.stop()
    await start
    expect(initialize).not.toHaveBeenCalled()
    expect(() => barrier.start(initialize)).toThrow('already has an owner')
  })

  it('keeps startup failures observable to shutdown while still allowing cleanup', async () => {
    const barrier = createAppStartupBarrier()
    const entered = Promise.withResolvers<void>()
    const failed = Promise.withResolvers<void>()
    const close = vi.fn(async () => {})
    const failure = new Error('Owned native initialization failed')
    const startup = barrier.start(async () => {
      entered.resolve()
      await failed.promise
    })
    const rejection = expect(startup).rejects.toBe(failure)
    await entered.promise
    const shutdown = barrier.stop().finally(close)
    const stopRejection = expect(shutdown).rejects.toBe(failure)
    failed.reject(failure)
    await Promise.all([rejection, stopRejection])
    expect(close).toHaveBeenCalledOnce()
    expect(barrier.isStopping()).toBe(true)
  })
})
