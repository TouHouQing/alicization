import { describe, expect, it, vi } from 'vitest'

import { createLive2DFileZipMiddleware } from './live2d-file-zip'

describe('bundled Live2D ZIP transport', () => {
  it('reads file archives as bytes with the original cancellation target and passes an in-memory ZIP to the SDK', async () => {
    const target = {}
    const read = vi.fn(async () => new Uint8Array([80, 75, 3, 4]).buffer)
    const context = { source: 'file:///C:/app/assets/hiyori.ZIP', live2dModel: target }
    const next = vi.fn(async () => {})
    await createLive2DFileZipMiddleware(read)(context as any, next)
    expect(read).toHaveBeenCalledExactlyOnceWith('file:///C:/app/assets/hiyori.ZIP', target)
    const file = (context.source as unknown as File[])[0]
    expect(file.name).toBe('model.zip')
    expect([...new Uint8Array(await file.arrayBuffer())]).toEqual([80, 75, 3, 4])
    expect(next).toHaveBeenCalledOnce()
  })

  it('leaves blob, HTTP and direct upload sources with their existing loaders', async () => {
    const read = vi.fn()
    const middleware = createLive2DFileZipMiddleware(read)
    for (const source of ['blob:file:///upload', 'https://models.example/hiyori.zip', [new File(['zip'], 'user.zip')]]) {
      const context = { source }
      const next = vi.fn(async () => {})
      await middleware(context as any, next)
      expect(context.source).toBe(source)
      expect(next).toHaveBeenCalledOnce()
    }
    expect(read).not.toHaveBeenCalled()
  })

  it('propagates a failed or empty read instead of publishing a ready model', async () => {
    const next = vi.fn(async () => {})
    await expect(createLive2DFileZipMiddleware(vi.fn().mockRejectedValue(new Error('Read failed')))({ source: 'file:///model.zip' } as any, next)).rejects.toThrow('Read failed')
    await expect(createLive2DFileZipMiddleware(async () => new ArrayBuffer(0))({ source: 'file:///model.zip' } as any, next)).rejects.toThrow('Empty bundled Live2D archive')
    expect(next).not.toHaveBeenCalled()
  })
})
