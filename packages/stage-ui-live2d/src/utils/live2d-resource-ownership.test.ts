import { describe, expect, it, vi } from 'vitest'

import { live2dResourceOwnershipMiddleware } from './live2d-resource-ownership'

describe('live2D resource ownership', () => {
  it('keeps concurrent copies of the same ZIP in independent resource namespaces', async () => {
    const makeFiles = () => Object.assign([], { settings: { _objectURL: 'zip://0/hiyori.model3.json', url: 'hiyori.model3.json' } })
    const desktop = makeFiles()
    const preview = makeFiles()
    const namespaces = new Map<string, string>()
    await live2dResourceOwnershipMiddleware({ source: desktop } as any, async () => {
      namespaces.set(desktop.settings._objectURL, 'desktop texture')
    })
    await live2dResourceOwnershipMiddleware({ source: preview } as any, async () => {
      namespaces.set(preview.settings._objectURL, 'preview texture')
    })
    namespaces.delete(preview.settings._objectURL)
    expect(namespaces.get(desktop.settings._objectURL)).toBe('desktop texture')
    expect(desktop.settings.url).toBe('hiyori.model3.json')
  })

  it('preserves URL and plain file sources for the upstream loaders', async () => {
    const next = vi.fn(async () => {})
    for (const source of ['file:///models/hiyori.zip', []]) {
      const context = { source }
      await live2dResourceOwnershipMiddleware(context as any, next)
      expect(context.source).toBe(source)
    }
    expect(next).toHaveBeenCalledTimes(2)
  })
})
