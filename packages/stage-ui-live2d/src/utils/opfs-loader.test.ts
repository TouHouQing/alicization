import { afterEach, describe, expect, it, vi } from 'vitest'

import { OPFSCache } from './opfs-loader'

describe('oPFS cache loader', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('clears only Live2D catalogue cache directories', async () => {
    const removeEntry = vi.fn()
    vi.stubGlobal('navigator', { storage: { getDirectory: async () => ({
      async* values() {
        yield { name: 'preset-live2d-1', kind: 'directory' }
        yield { name: 'display-model-import', kind: 'directory' }
        yield { name: 'personal-artifacts', kind: 'directory' }
        yield { name: 'notes.txt', kind: 'file' }
      },
      removeEntry,
    }) } })
    await OPFSCache.clearAll()
    expect(removeEntry.mock.calls).toEqual([
      ['preset-live2d-1', { recursive: true }],
      ['display-model-import', { recursive: true }],
    ])
  })

  it('propagates a failed cache deletion so the UI cannot report success', async () => {
    vi.stubGlobal('navigator', { storage: { getDirectory: async () => ({
      async* values() {
        yield { name: 'display-model-import', kind: 'directory' }
      },
      removeEntry: vi.fn().mockRejectedValue(new Error('Storage unavailable')),
    }) } })
    await expect(OPFSCache.clearAll()).rejects.toThrow('Storage unavailable')
  })

  it('does not intercept packaged file:// live2d zip assets', async () => {
    const next = vi.fn(async () => {})
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const context = {
      source: {
        id: 'preset-live2d-1',
        url: 'file:///Applications/Alicization.app/Contents/Resources/app.asar/assets/hiyori_pro_zh.zip',
      },
    }

    await OPFSCache.checkMiddleware(context as any, next)

    expect(context.source).toBe('file:///Applications/Alicization.app/Contents/Resources/app.asar/assets/hiyori_pro_zh.zip')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
  })

  it('keeps blob zip sources eligible for OPFS caching', () => {
    expect(OPFSCache.shouldHandleSourceUrl('blob:https://example.com/model')).toBe(true)
    expect(OPFSCache.shouldHandleSourceUrl('https://cdn.example.com/model.zip')).toBe(true)
    expect(OPFSCache.shouldHandleSourceUrl('file:///tmp/model.zip')).toBe(false)
  })
})
