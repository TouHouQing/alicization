import type { BrowserWindow } from 'electron'

import type { LifeInterfaceRiskRequest } from './life-interface-risk'

import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prepareBrowserUpload } from './execution/browser-upload'
import { createLifeWindowsBrowserRuntime } from './life-windows-browser-runtime'

const transport = vi.hoisted(() => ({ mutate: vi.fn(), observe: vi.fn() }))
vi.mock('electron', () => ({ BrowserWindow: class {}, shell: {} }))
vi.mock('./execution/browser-cdp', () => ({ createBrowserCdp: () => ({ ...transport, close: vi.fn() }) }))
vi.mock('./execution/browser-upload', async (original) => {
  const actual = await original<typeof import('./execution/browser-upload')>()
  return { prepareBrowserUpload: vi.fn(actual.prepareBrowserUpload) }
})

function createWindow() {
  let destroyed = false
  const events = new EventEmitter()
  return {
    isDestroyed: () => destroyed,
    destroy: () => { destroyed = true; events.emit('closed') },
    on: events.on.bind(events),
    getContentBounds: () => ({ x: 0, y: 0, width: 1100, height: 760 }),
    isVisible: () => false,
    isMinimized: () => false,
    webContents: {
      debugger: {},
      session: { on: vi.fn(), removeListener: vi.fn(), setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn() },
      setAudioMuted: vi.fn(),
      setWindowOpenHandler: vi.fn(),
      on: vi.fn(),
      stop: vi.fn(),
    },
  } as unknown as BrowserWindow
}

describe('managed browser upload retirement', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const actual = await vi.importActual<typeof import('./execution/browser-upload')>('./execution/browser-upload')
    vi.mocked(prepareBrowserUpload).mockReset().mockImplementation(actual.prepareBrowserUpload)
    transport.mutate.mockReset().mockImplementation(async (_target, _input, current) => { current(); return { ok: true } })
    transport.observe.mockReset().mockResolvedValue({ url: 'https://upload.test/', title: 'Upload', readyState: 'complete', text: 'Choose file', elements: [{ selector: '#file', text: 'Choose file', tag: 'input', type: 'file', href: null, disabled: false, formAction: 'https://upload.test/receive', frameId: 'main', contextId: 1, documentId: 1, backendNodeId: 1 }] })
  })

  it('shows the complete exact frozen file bytes in approval even when original files change', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-upload-approval-preview-'))
    const source = join(root, '附件.txt')
    const text = 'Exact approved 中文🙂 bytes'
    await writeFile(source, text)
    const canonicalSource = await realpath(source)
    const hash = createHash('sha256').update(text).digest('hex')
    const authorize = vi.fn(async (_request: LifeInterfaceRiskRequest) => {
      await writeFile(source, 'Different original after snapshot')
      return { allow: true, reason: 'approved exact frozen bytes' }
    })
    const window = createWindow()
    const runtime = createLifeWindowsBrowserRuntime({ createWindow: () => window, downloadRoot: join(root, 'managed'), authorize })
    try {
      const observation = await runtime.readPage({ format: 'interactables' })
      const selector = (('elements' in observation ? observation.elements : []) as Array<{ selector: string }>)[0].selector
      expect(await runtime.uploadBrowserFiles({ selector, files: [source] })).toMatchObject({ status: 'completed', serverReceiptVerified: false })
      const request = authorize.mock.calls[0][0]
      expect(request.previewText).toBe(`${canonicalSource}\n${new TextEncoder().encode(text).length} bytes\nSHA-256 ${hash}`)
      expect(request.targetId).toBe('https://upload.test/receive')
      const snapshot = await vi.mocked(prepareBrowserUpload).mock.results[0].value
      expect(await readFile(snapshot.files[0].path, 'utf8')).toBe(text)
      expect(await readFile(source, 'utf8')).toBe('Different original after snapshot')
    }
    finally {
      await runtime.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it.each(['explicit-close', 'host-window-close'] as const)('retains a failed cleanup for retry after %s without deleting a live selection', async (mode) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-managed-upload-retirement-'))
    const source = join(root, 'source.txt')
    await writeFile(source, 'approved source bytes')
    const actual = await vi.importActual<typeof import('./execution/browser-upload')>('./execution/browser-upload')
    let snapshot: Awaited<ReturnType<typeof prepareBrowserUpload>> | undefined
    let failures = 1
    const dispose = vi.fn(async () => {
      if (failures-- > 0)
        throw new Error('synthetic snapshot remains locked')
      await snapshot!.dispose()
    })
    vi.mocked(prepareBrowserUpload).mockImplementationOnce(async (...args) => {
      snapshot = await actual.prepareBrowserUpload(...args)
      return { ...snapshot, dispose }
    })
    const window = createWindow()
    const errors: unknown[] = []
    const runtime = createLifeWindowsBrowserRuntime({ createWindow: () => window, downloadRoot: join(root, 'managed'), authorize: async () => ({ allow: true, reason: 'approved' }), onError: error => errors.push(error) })
    try {
      const observation = await runtime.readPage({ format: 'interactables' })
      const selector = (('elements' in observation ? observation.elements : []) as Array<{ selector: string }>)[0]!.selector
      expect(await runtime.uploadBrowserFiles({ selector, files: [source] })).toMatchObject({ status: 'completed', serverReceiptVerified: false })
      await writeFile(source, 'host changed original')
      expect(await readFile(snapshot!.files[0]!.path, 'utf8')).toBe('approved source bytes')
      expect(dispose).not.toHaveBeenCalled()
      if (mode === 'explicit-close') {
        await expect(runtime.close()).rejects.toThrow()
      }
      else {
        window.destroy()
        await vi.waitFor(() => expect(errors).toHaveLength(1))
      }
      expect(dispose).toHaveBeenCalledOnce()
      expect(await readFile(snapshot!.files[0]!.path, 'utf8')).toBe('approved source bytes')
      await runtime.close()
      expect(dispose).toHaveBeenCalledTimes(2)
      await expect(stat(snapshot!.files[0]!.path)).rejects.toMatchObject({ code: 'ENOENT' })
      expect(await readFile(source, 'utf8')).toBe('host changed original')
      await runtime.close()
      expect(dispose).toHaveBeenCalledTimes(2)
    }
    finally { failures = 0; await runtime.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('retains an unselected snapshot when approval cleanup fails and retries without dispatch', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-managed-upload-denied-'))
    const source = join(root, 'source.txt')
    await writeFile(source, 'private bytes')
    const actual = await vi.importActual<typeof import('./execution/browser-upload')>('./execution/browser-upload')
    let snapshot: Awaited<ReturnType<typeof prepareBrowserUpload>> | undefined
    let failures = 1
    const dispose = vi.fn(async () => {
      if (failures-- > 0)
        throw new Error('synthetic rejected snapshot remains locked')
      await snapshot!.dispose()
    })
    vi.mocked(prepareBrowserUpload).mockImplementationOnce(async (...args) => {
      snapshot = await actual.prepareBrowserUpload(...args)
      return { ...snapshot, dispose }
    })
    const runtime = createLifeWindowsBrowserRuntime({ createWindow, downloadRoot: join(root, 'managed'), authorize: async () => ({ allow: false, reason: 'host-denied' }) })
    try {
      const observation = await runtime.readPage({ format: 'interactables' })
      const selector = (('elements' in observation ? observation.elements : []) as Array<{ selector: string }>)[0]!.selector
      expect(await runtime.uploadBrowserFiles({ selector, files: [source] })).toMatchObject({ status: 'failed' })
      expect(transport.mutate).not.toHaveBeenCalled()
      expect(await readFile(snapshot!.files[0]!.path, 'utf8')).toBe('private bytes')
      await runtime.close()
      expect(dispose).toHaveBeenCalledTimes(2)
      await expect(stat(snapshot!.files[0]!.path)).rejects.toMatchObject({ code: 'ENOENT' })
      expect(await readFile(source, 'utf8')).toBe('private bytes')
    }
    finally { failures = 0; await runtime.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('joins concurrent close attempts while native selection cleanup is still running', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-managed-upload-concurrent-'))
    const source = join(root, 'source.txt')
    await writeFile(source, 'selected bytes')
    const actual = await vi.importActual<typeof import('./execution/browser-upload')>('./execution/browser-upload')
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    let snapshot: Awaited<ReturnType<typeof prepareBrowserUpload>> | undefined
    const dispose = vi.fn(async () => { await gate; await snapshot!.dispose() })
    vi.mocked(prepareBrowserUpload).mockImplementationOnce(async (...args) => {
      snapshot = await actual.prepareBrowserUpload(...args)
      return { ...snapshot, dispose }
    })
    const window = createWindow()
    const runtime = createLifeWindowsBrowserRuntime({ createWindow: () => window, downloadRoot: join(root, 'managed'), authorize: async () => ({ allow: true, reason: 'approved' }) })
    let closing: Promise<unknown> | undefined
    try {
      const observation = await runtime.readPage({ format: 'interactables' })
      const selector = (('elements' in observation ? observation.elements : []) as Array<{ selector: string }>)[0]!.selector
      expect(await runtime.uploadBrowserFiles({ selector, files: [source] })).toMatchObject({ status: 'completed' })
      closing = Promise.all([runtime.close(), runtime.close()])
      await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce())
      expect(window.isDestroyed()).toBe(true)
      expect(await readFile(snapshot!.files[0]!.path, 'utf8')).toBe('selected bytes')
      release()
      await closing
      expect(dispose).toHaveBeenCalledOnce()
      await expect(stat(snapshot!.files[0]!.path)).rejects.toMatchObject({ code: 'ENOENT' })
    }
    finally { release(); await closing; await runtime.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('keeps uncertain native selections alive until window closure and bounds new snapshots', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-managed-upload-budget-'))
    const source = join(root, 'source.txt')
    await writeFile(source, 'retained selection')
    const window = createWindow()
    const runtime = createLifeWindowsBrowserRuntime({ createWindow: () => window, downloadRoot: join(root, 'managed'), authorize: async () => ({ allow: true, reason: 'approved' }) })
    transport.mutate.mockRejectedValueOnce(new Error('native reply lost after selection'))
    const selected: string[] = []
    try {
      for (let index = 0; index < 8; index++) {
        const observation = await runtime.readPage({ format: 'interactables' })
        const selector = (('elements' in observation ? observation.elements : []) as Array<{ selector: string }>)[0]!.selector
        const result = await runtime.uploadBrowserFiles({ selector, files: [source] })
        expect(result).toMatchObject(index === 0 ? { status: 'failed', effectMayHaveOccurred: true } : { status: 'completed', serverReceiptVerified: false })
        const snapshot = await vi.mocked(prepareBrowserUpload).mock.results[index]!.value
        selected.push(snapshot.files[0].path)
      }
      expect(window.isDestroyed()).toBe(false)
      for (const path of selected)
        expect(await readFile(path, 'utf8')).toBe('retained selection')
      const observation = await runtime.readPage({ format: 'interactables' })
      const selector = (('elements' in observation ? observation.elements : []) as Array<{ selector: string }>)[0]!.selector
      expect(await runtime.uploadBrowserFiles({ selector, files: [source] })).toMatchObject({ status: 'failed', errorCode: 'BROWSER_UPLOAD_RETAINED_SNAPSHOT_BUDGET', sideEffectState: 'none' })
      expect(prepareBrowserUpload).toHaveBeenCalledTimes(8)
      expect(transport.mutate).toHaveBeenCalledTimes(8)
      await runtime.close()
      for (const path of selected)
        await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' })
      expect(await readFile(source, 'utf8')).toBe('retained selection')
    }
    finally { await runtime.close(); await rm(root, { recursive: true, force: true }) }
  })
})
