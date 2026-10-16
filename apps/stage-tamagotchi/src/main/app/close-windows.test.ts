import { setImmediate } from 'node:timers'

import { describe, expect, it, vi } from 'vitest'

import { closeDesktopWindows } from './close-windows'

describe('desktop window shutdown', () => {
  it('closes live windows and lets their cleanup callbacks finish before returning', async () => {
    const cleanup = vi.fn()
    const destroy = vi.fn(() => {
      setImmediate(cleanup)
    })
    await closeDesktopWindows([{ isDestroyed: () => false, destroy }])
    expect(destroy).toHaveBeenCalledOnce()
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('skips already destroyed windows without preventing other windows from closing', async () => {
    const closed = vi.fn()
    const live = vi.fn()
    await closeDesktopWindows([{ isDestroyed: () => true, destroy: closed }, { isDestroyed: () => false, destroy: live }])
    expect(closed).not.toHaveBeenCalled()
    expect(live).toHaveBeenCalledOnce()
  })

  it('closes remaining windows and reports failures so shutdown cannot declare success', async () => {
    const failure = new Error('Native window teardown failed')
    const remaining = vi.fn()
    await expect(closeDesktopWindows([
      {
        isDestroyed: () => false,
        destroy: () => {
          throw failure
        },
      },
      { isDestroyed: () => false, destroy: remaining },
    ])).rejects.toMatchObject({ errors: [failure] })
    expect(remaining).toHaveBeenCalledOnce()
  })
})
