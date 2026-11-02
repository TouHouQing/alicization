import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({
  partition: { webRequest: { onBeforeRequest: vi.fn() }, clearCache: vi.fn(async () => {}), clearStorageData: vi.fn(async () => {}) },
  close: vi.fn(async () => {}),
  drain: vi.fn(async () => {}),
  windows: [] as any[],
  ports: [] as any[],
}))
vi.mock('electron', () => ({
  app: { whenReady: async () => {} },
  screen: { getAllDisplays: () => [{ bounds: { x: -1600, y: 0, width: 1600, height: 900 } }, { bounds: { x: 0, y: -400, width: 1920, height: 1080 } }] },
  session: { fromPartition: () => native.partition },
  BrowserWindow: class {
    destroyed = false
    url = ''
    webContents = { setAudioMuted: vi.fn(), setWindowOpenHandler: vi.fn(), getURL: () => this.url }
    constructor(public options: any) { native.windows.push(this) }
    getBounds() { return this.options }
    isFocusable() { return this.options.focusable }
    isFocused() { return false }
    isDestroyed() { return this.destroyed }
    destroy() { this.destroyed = true }
    async loadURL(url: string) { this.url = url; await fetch(url) }
  },
}))
vi.mock('../life-windows-browser-runtime', () => ({
  createLifeWindowsBrowserRuntime: (ports: any) => {
    native.ports.push(ports)
    return { close: native.close, drainDownloads: native.drain, openUrl: async (input: any) => { ports.createWindow(); return input }, readPage: async (input: any) => { ports.createWindow(); return input } }
  },
}))

const { createProcedureBrowserReplay } = await import('./procedure-browser-replay')
const active: Array<Awaited<ReturnType<typeof createProcedureBrowserReplay>>> = []
beforeEach(() => {
  native.windows.length = 0
  native.ports.length = 0
  native.close.mockReset().mockResolvedValue(undefined)
  native.drain.mockClear()
  native.partition.webRequest.onBeforeRequest.mockClear()
})
afterEach(async () => {
  for (const replay of active.splice(0))
    await replay.dispose().catch(() => {})
})

describe('browser evaluation owns its network, surface and teardown', () => {
  it('refuses uploading a real file outside the evaluation owner before reaching the native adapter', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'alicization-upload-owner-'))
    const root = join(parent, 'owned')
    await mkdir(root)
    const outside = join(parent, 'outside.txt')
    await writeFile(outside, 'Never transmit outside fixture bytes')
    const signal = new AbortController().signal
    const replay = await createProcedureBrowserReplay(root, signal)
    try {
      await replay.prepareForm!({ caseId: 'owned', fields: [], uploads: [{ label: 'Attachment', files: [{ name: 'outside.txt', bytes: 1, sha256: 'a'.repeat(64) }] }], submitLabel: 'Send', receiptText: 'Received' })
      await expect(replay.tools['tool.browser_upload_files']!({ selector: 'observed', files: [outside] }, signal)).rejects.toThrow('outside its owned fixture')
      expect(replay.inspectForm!()).toMatchObject({ requests: 0, accepted: 0 })
    }
    finally {
      await replay.dispose()
      await rm(parent, { recursive: true, force: true })
    }
  })
  it('owns a bounded set of distinct pages and invalidates every URL when the next fixture begins', async () => {
    const controller = new AbortController()
    const replay = await createProcedureBrowserReplay('owned-evaluation-root', controller.signal)
    active.push(replay)
    const fixture = await replay.preparePages({ caseId: 'pair', pages: [{ id: 'first', text: 'Independent first bytes' }, { id: 'second', text: 'Independent second bytes' }] })
    expect(fixture.urls.first).not.toBe(fixture.urls.second)
    expect(await (await fetch(fixture.urls.first)).text()).toContain('Independent first bytes')
    expect(await (await fetch(fixture.urls.second)).text()).toContain('Independent second bytes')
    const fence = native.partition.webRequest.onBeforeRequest.mock.calls[0][1] as any
    for (const url of Object.values(fixture.urls)) {
      const callback = vi.fn()
      fence({ url }, callback)
      expect(callback).toHaveBeenCalledWith({ cancel: false })
    }
    await expect(replay.preparePages({ caseId: 'invalid', pages: [{ id: 'same', text: 'a' }, { id: 'same', text: 'b' }] })).rejects.toThrow('bounded')
    await expect(replay.preparePages({ caseId: 'invalid', pages: Array.from({ length: 5 }, (_, index) => ({ id: `page-${index}`, text: 'a' })) })).rejects.toThrow('bounded')
    await replay.prepare({ caseId: 'next', text: 'New fixture' })
    for (const url of Object.values(fixture.urls)) {
      expect((await fetch(url)).status).toBe(404)
      const callback = vi.fn()
      fence({ url }, callback)
      expect(callback).toHaveBeenCalledWith({ cancel: true })
    }
  })
  it('serves only the current synthetic page and refuses a user browser, another page and popup authority', async () => {
    const controller = new AbortController()
    const replay = await createProcedureBrowserReplay('owned-evaluation-root', controller.signal)
    active.push(replay)
    const page = await replay.prepare({ caseId: 'one', text: 'Owned <text> & 中文' })
    const response = await fetch(page.url)
    expect(await response.text()).toContain('Owned &lt;text&gt; &amp; 中文')
    expect(response.headers.get('content-security-policy')).toContain('default-src \'none\'')
    const fence = native.partition.webRequest.onBeforeRequest.mock.calls[0][1] as any
    for (const [url, cancel] of [[page.url, false], [page.url.replace('/one', '/two'), true], ['https://example.com/user-profile', true], [`${page.url}#fragment`, true]] as const) {
      const callback = vi.fn()
      fence({ url }, callback)
      expect(callback).toHaveBeenCalledWith({ cancel })
    }
    await expect(replay.tools['tool.browser_open_url']({ url: 'https://example.com/private' }, controller.signal)).rejects.toThrow('exact owned page')
    expect(replay.isCurrent({ kind: 'managed', id: 'another-session' })).toBe(false)
    expect(native.windows[0].options).toMatchObject({ focusable: false, skipTaskbar: true, x: 2176 })
    expect(native.windows[0].webContents.setWindowOpenHandler.mock.calls[0][0]()).toEqual({ action: 'deny' })
    const second = await replay.prepare({ caseId: 'two', text: 'Other current page' })
    expect((await fetch(page.url)).status).toBe(404)
    expect((await fetch(second.url)).status).toBe(200)
  })

  it('refuses an unexpected move onto any display before granting the adapter a window', async () => {
    const signal = new AbortController().signal
    const replay = await createProcedureBrowserReplay('owned-evaluation-root', signal)
    active.push(replay)
    const page = await replay.prepare({ caseId: 'one', text: 'Synthetic text' })
    native.windows[0].options.x = -1500
    await expect(replay.tools['tool.browser_open_url']({ url: page.url }, signal)).rejects.toThrow('outside every display')
  })

  it('joins abort cleanup and closes its actual loopback listener even if adapter shutdown fails', async () => {
    const controller = new AbortController()
    const replay = await createProcedureBrowserReplay('owned-evaluation-root', controller.signal)
    active.push(replay)
    const page = await replay.prepare({ caseId: 'one', text: 'Synthetic text' })
    native.close.mockRejectedValueOnce(new Error('Owned adapter shutdown failure'))
    controller.abort()
    await expect(replay.dispose()).rejects.toThrow('cleanup did not completely settle')
    expect(native.close).toHaveBeenCalledOnce()
    expect(native.drain).toHaveBeenCalledOnce()
    expect(native.windows[0].destroyed).toBe(true)
    expect(replay.isCurrent(replay.binding)).toBe(false)
    await expect(fetch(page.url)).rejects.toThrow()
    await expect(replay.prepare({ caseId: 'after-abort', text: 'unavailable' })).rejects.toThrow()
  })
})
