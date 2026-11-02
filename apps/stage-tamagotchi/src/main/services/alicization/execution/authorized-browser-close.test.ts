import { expect, it, vi } from 'vitest'

import { createLifeAuthorizedBrowserRuntime } from '../life-authorized-browser-runtime'

it.each(['close', 'managed'] as const)('bounds %s while a managed browser writer cannot confirm stopping, without certifying release', async (action) => {
  vi.useFakeTimers()
  const gate = Promise.withResolvers<void>()
  const stop = vi.fn(() => gate.promise)
  const audit = vi.fn(async () => {})
  const runtime = createLifeAuthorizedBrowserRuntime({ ownerId: () => 'alice', uploadRoot: 'C:/unused-synthetic-upload-root', stopWork: stop, audit, onError: () => {} })
  let outcome: unknown
  const pending = (action === 'close' ? runtime.close() : runtime.command({ cardId: 'alice', action: 'managed' })).then((value) => { outcome = value }, (error) => { outcome = error })
  try {
    await vi.advanceTimersByTimeAsync(5001)
    expect(outcome).toBeInstanceOf(Error)
    expect((outcome as Error).message).toBe('AUTHORIZED_BROWSER_OLD_WORK_NOT_STOPPED')
    expect(stop).toHaveBeenCalledExactlyOnceWith('alice')
    expect(audit).not.toHaveBeenCalled()
  }
  finally { gate.resolve(); await pending; vi.useRealTimers() }
})
