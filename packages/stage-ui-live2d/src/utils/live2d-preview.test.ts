import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderLive2DModelPreview } from './live2d-preview-renderer'

const loadLive2DModelPreview = (file: File) => renderLive2DModelPreview(file, () => ({ width: 60, height: 80 }) as HTMLCanvasElement)

const mocks = vi.hoisted(() => ({
  construct: vi.fn(),
  setup: vi.fn(),
  destroyApp: vi.fn(),
  destroyModel: vi.fn(),
  rendered: vi.fn(),
}))

vi.mock('@pixi/app', () => ({
  Application: vi.fn(class {
    stage = { scale: { set: vi.fn() }, addChild: vi.fn() }
    ticker = { stop: vi.fn() }
    renderer = { render: mocks.rendered }
    destroy = mocks.destroyApp
    constructor(options: unknown) {
      mocks.construct(options)
    }
  }),
}))
vi.mock('@pixi/extensions', () => ({ extensions: { add: vi.fn() } }))
vi.mock('@pixi/ticker', () => ({ Ticker: {}, TickerPlugin: {} }))
vi.mock('pixi-live2d-display/cubism4', () => ({
  Live2DFactory: { setupLive2DModel: mocks.setup },
  Live2DModel: Object.assign(vi.fn(class {
    internalModel = {}
    autoUpdate = false
    emit = vi.fn()
    width = 1600
    height = 2400
    scale = { set: vi.fn() }
    anchor = { set: vi.fn() }
    destroy = mocks.destroyModel
  }), { registerTicker: vi.fn() }),
}))

describe('offscreen model preview lifetime', () => {
  const attached = new Set<object>()
  const created: Array<{ style: Record<string, string> }> = []
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.construct.mockReset()
    mocks.setup.mockReset().mockResolvedValue(undefined)
    mocks.destroyModel.mockReset()
    attached.clear()
    created.length = 0
    vi.stubGlobal('document', {
      createElement: () => {
        const canvas = { width: 0, height: 0, style: {} as Record<string, string>, remove: () => attached.delete(canvas), getContext: () => ({ drawImage: vi.fn() }), toDataURL: () => 'data:image/png;base64,cHJldmlldw==' }
        created.push(canvas)
        return canvas
      },
      body: { appendChild: (node: object) => attached.add(node) },
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('removes the invisible canvas even when GPU construction fails', async () => {
    mocks.construct.mockImplementationOnce(() => {
      throw new Error('WebGL unavailable')
    })
    await expect(loadLive2DModelPreview(new File(['model'], 'character.zip'))).rejects.toThrow('WebGL unavailable')
    expect(attached.size).toBe(0)
    expect(created[0].style.pointerEvents).toBe('none')
  })

  it('propagates a broken model and releases its model, app and DOM resources', async () => {
    mocks.setup.mockRejectedValueOnce(new Error('Broken model'))
    await expect(loadLive2DModelPreview(new File(['bad'], 'broken.zip'))).rejects.toThrow('Broken model')
    expect(mocks.destroyModel).toHaveBeenCalledOnce()
    expect(mocks.destroyApp).toHaveBeenCalledOnce()
    expect(attached.size).toBe(0)
  })

  it('retains DOM cleanup if model destruction itself fails', async () => {
    mocks.setup.mockRejectedValueOnce(new Error('Broken model'))
    mocks.destroyModel.mockImplementationOnce(() => {
      throw new Error('Destroy failed')
    })
    await expect(loadLive2DModelPreview(new File(['bad'], 'broken.zip'))).rejects.toThrow('Destroy failed')
    expect(mocks.destroyApp).toHaveBeenCalledOnce()
    expect(attached.size).toBe(0)
  })

  it('renders a bounded thumbnail from the actual supplied file and frees the renderer', async () => {
    const file = new File(['model'], 'character.ZIP')
    await expect(loadLive2DModelPreview(file)).resolves.toMatch(/^data:image\/png/)
    const sdkFile = mocks.setup.mock.calls[0][1][0] as File
    expect(sdkFile.name).toBe('character.zip')
    expect(await sdkFile.text()).toBe(await file.text())
    const options = mocks.construct.mock.calls[0][0]
    expect(options.width * options.height).toBeLessThan(1_000_000)
    expect(mocks.rendered).toHaveBeenCalledOnce()
    expect(attached.size).toBe(0)
  })
})
