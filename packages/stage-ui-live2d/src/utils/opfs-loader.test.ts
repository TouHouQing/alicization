import { describe, expect, it, vi } from 'vitest'

import { OPFSCache } from './opfs-loader'

describe('OPFS cache loader', () => {
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
