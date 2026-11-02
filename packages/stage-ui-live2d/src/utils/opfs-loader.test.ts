import { afterEach, describe, expect, it, vi } from 'vitest'

import { OPFSCache } from './opfs-loader'

describe('oPFS cache loader', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('keeps returned asset bytes readable after another renderer rewrites the OPFS file', async () => {
    const snapshot = new File(['original texture bytes'], 'texture.png', { type: 'image/png', lastModified: 123 })
    const original = await snapshot.arrayBuffer()
    let changed = false
    vi.spyOn(snapshot, 'arrayBuffer').mockImplementation(async () => {
      if (changed)
        throw new DOMException('The file changed after its snapshot was acquired', 'NotReadableError')
      return original.slice(0)
    })
    const directory = {
      async* values() { yield { kind: 'file', getFile: async () => snapshot } },
    }
    const files = await OPFSCache.readDirectoryRecursive(directory as unknown as FileSystemDirectoryHandle, 'model/textures/')
    changed = true
    expect(new TextDecoder().decode(await files[0].arrayBuffer())).toBe('original texture bytes')
    expect(files[0]).toMatchObject({ name: 'texture.png', type: 'image/png', lastModified: 123, webkitRelativePath: 'model/textures/texture.png' })
  })

  it('falls back to the catalogue archive if a cached asset changes while its bytes are being copied', async () => {
    const url = 'blob:https://example.com/owned-model'
    const snapshot = new File(['changing texture'], 'texture.png')
    vi.spyOn(snapshot, 'arrayBuffer').mockRejectedValue(new DOMException('Concurrent OPFS rewrite', 'NotReadableError'))
    const directory = {
      getFileHandle: async () => ({ getFile: async () => new File([JSON.stringify({ sourceUrl: url })], '__meta.json') }),
      async* values() { yield { kind: 'file', getFile: async () => snapshot } },
    }
    vi.stubGlobal('navigator', { storage: { getDirectory: async () => ({ getDirectoryHandle: async () => directory }) } })
    const archive = new File(['complete original archive'], 'character.zip')
    const context = { source: { id: 'display-model-owned', url, archive } }
    const next = vi.fn(async () => {})
    await OPFSCache.checkMiddleware(context as any, next)
    const files = context.source as unknown as File[]
    expect(files).toHaveLength(1)
    expect(files[0].name).toBe('display-model-owned.zip')
    expect(await files[0].text()).toBe('complete original archive')
    expect(next).toHaveBeenCalledOnce()
  })

  it('does not expose an unpublished partial cache before its source metadata is committed', async () => {
    const getFile = vi.fn(async () => new File(['partial texture'], 'texture.png'))
    const directory = {
      getFileHandle: vi.fn().mockRejectedValue(new DOMException('Metadata not committed', 'NotFoundError')),
      async* values() { yield { kind: 'file', getFile } },
    }
    vi.stubGlobal('navigator', { storage: { getDirectory: async () => ({ getDirectoryHandle: async () => directory }) } })
    expect(await OPFSCache.get('display-model-owned', 'blob:https://example.com/model')).toBeNull()
    expect(getFile).not.toHaveBeenCalled()
  })

  it('retains the selected local archive across a cache wait even when its temporary URL is released', async () => {
    const archive = new File(['owned archive bytes'], 'character.ZIP')
    const url = URL.createObjectURL(archive)
    const lookup = Promise.withResolvers<File[] | null>()
    vi.spyOn(OPFSCache, 'get').mockReturnValue(lookup.promise)
    const fetch = vi.fn().mockRejectedValue(new Error('Temporary URL is no longer readable'))
    vi.stubGlobal('fetch', fetch)
    const context = { source: { id: 'display-model-owned', url, archive } }
    const next = vi.fn(async () => {})
    const loading = OPFSCache.checkMiddleware(context as any, next)
    URL.revokeObjectURL(url)
    lookup.resolve(null)
    await loading
    expect(fetch).not.toHaveBeenCalled()
    const files = context.source as unknown as File[]
    expect(files).toHaveLength(1)
    expect(files[0].name).toBe('display-model-owned.zip')
    expect(await files[0].text()).toBe('owned archive bytes')
    expect(next).toHaveBeenCalledOnce()
  })

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
