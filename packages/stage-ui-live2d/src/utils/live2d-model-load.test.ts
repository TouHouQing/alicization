import { describe, expect, it, vi } from 'vitest'

import { disposeLive2DModel, loadCurrentLive2DInstance } from './live2d-model-load'

describe('live2D asynchronous load ownership', () => {
  it('releases a completed load when navigation invalidates its canvas while setup is pending', async () => {
    const candidate = {}
    let current = true
    let complete!: () => void
    const dispose = vi.fn()
    const loading = loadCurrentLive2DInstance({
      create: () => candidate,
      setup: () => new Promise<void>((resolve) => {
        complete = resolve
      }),
      isCurrent: () => current,
      dispose,
    })
    current = false
    complete()
    expect(await loading).toBeUndefined()
    expect(dispose).toHaveBeenCalledExactlyOnceWith(candidate)
  })

  it('returns a current model to its owning canvas', async () => {
    const candidate = {}
    const dispose = vi.fn()
    expect(await loadCurrentLive2DInstance({ create: () => candidate, setup: async () => {}, isCurrent: () => true, dispose })).toBe(candidate)
    expect(dispose).not.toHaveBeenCalled()
  })

  it('treats a revoked source error as cancellation after the owner changes', async () => {
    const candidate = {}
    const dispose = vi.fn()
    expect(await loadCurrentLive2DInstance({
      create: () => candidate,
      setup: async () => {
        throw new Error('Blob URL revoked')
      },
      isCurrent: () => false,
      dispose,
    })).toBeUndefined()
    expect(dispose).toHaveBeenCalledExactlyOnceWith(candidate)
  })

  it('releases a failed setup and retains its original import error', async () => {
    const candidate = {}
    const dispose = vi.fn()
    await expect(loadCurrentLive2DInstance({
      create: () => candidate,
      setup: async () => {
        throw new Error('Invalid archive')
      },
      isCurrent: () => true,
      dispose,
    })).rejects.toThrow('Invalid archive')
    expect(dispose).toHaveBeenCalledExactlyOnceWith(candidate)
  })

  it('cancels requests without calling SDK destroy before an internal model exists', () => {
    const candidate = { autoUpdate: true, destroy: vi.fn(), emit: vi.fn() }
    disposeLive2DModel(candidate)
    expect(candidate.autoUpdate).toBe(false)
    expect(candidate.emit).toHaveBeenCalledExactlyOnceWith('destroy')
    expect(candidate.destroy).not.toHaveBeenCalled()
  })

  it('destroys an initialized model through its SDK resource cleanup', () => {
    const candidate = { internalModel: {}, autoUpdate: true, destroy: vi.fn(), emit: vi.fn() }
    disposeLive2DModel(candidate)
    expect(candidate.destroy).toHaveBeenCalledOnce()
  })
})
