import type { ProcedureBrowserReplayFactory } from './procedure-browser-replay-types'

import { randomUUID } from 'node:crypto'
import { realpath } from 'node:fs/promises'
import { createServer } from 'node:http'
import { isAbsolute, join, relative } from 'node:path'

import { app, BrowserWindow, screen, session } from 'electron'

import { createLifeWindowsBrowserRuntime } from '../life-windows-browser-runtime'
import { createProcedureFormFixture } from './procedure-form-fixture'

/** Seed fixture pages, then use the ordinary browser adapter and work scheduler. */
export const createProcedureBrowserReplay: ProcedureBrowserReplayFactory = async (root, signal) => {
  signal.throwIfAborted()
  await app.whenReady()
  signal.throwIfAborted()
  const nonce = randomUUID()
  const pages = new Map<string, string>()
  const form = createProcedureFormFixture(nonce)
  let formActive = false
  let formHasUploads = false
  const server = createServer(async (request, response) => {
    try {
      if (await form.handle(request, response))
        return
    }
    catch {
      response.statusCode = 500
      response.end('Owned evaluation service failed')
      return
    }
    const content = request.method === 'GET' ? pages.get(request.url ?? '') : undefined
    response.statusCode = content === undefined ? 404 : 200
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.setHeader('cache-control', 'no-store')
    response.setHeader('content-security-policy', 'default-src \'none\'; style-src \'unsafe-inline\'; frame-ancestors \'none\'')
    const text = (content ?? 'Owned evaluation page is unavailable').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    response.end(`<html><head><title>Owned procedure evaluation</title></head><body><pre>${text}</pre></body></html>`)
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject)
      resolve()
    })
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Procedure browser did not bind its owned loopback server')
  const origin = `http://127.0.0.1:${address.port}`
  const partition = session.fromPartition(`procedure-replay-${nonce}`, { cache: false })
  const binding = { kind: 'managed' as const, id: `procedure-replay:${nonce}` }
  const activeUrls = new Set<string>()
  let window: BrowserWindow | null = null
  let disposed = false
  let stopping: Promise<void> | undefined
  const displays = screen.getAllDisplays().map(display => display.bounds)
  function assertOwnedUrl(raw: string) {
    const url = new URL(raw)
    if (url.origin !== origin || !url.pathname.startsWith(`/${nonce}/`) || url.username || url.password || url.hash || !activeUrls.has(raw))
      throw new Error('Procedure replay attempted to leave its exact owned page')
  }
  partition.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    try {
      assertOwnedUrl(details.url)
      callback({ cancel: disposed || signal.aborted })
    }
    catch { callback({ cancel: true }) }
  })
  function ownedWindow() {
    signal.throwIfAborted()
    if (disposed)
      throw new Error('Procedure replay browser has stopped')
    if (!window) {
      window = new BrowserWindow({ show: false, focusable: false, skipTaskbar: true, x: Math.max(...displays.map(display => display.x + display.width)) + 256, y: Math.min(...displays.map(display => display.y)) + 64, width: 900, height: 680, webPreferences: { session: partition, backgroundThrottling: false, contextIsolation: true, sandbox: true, nodeIntegration: false } })
      window.webContents.setAudioMuted(true)
      window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    }
    const bounds = window.getBounds()
    if (window.isFocusable() || window.isFocused() || displays.some(display => bounds.x < display.x + display.width && bounds.x + bounds.width > display.x && bounds.y < display.y + display.height && bounds.y + bounds.height > display.y))
      throw new Error('Evaluation browser must stay outside every display without acquiring focus')
    return window
  }
  let approvalRequests = 0
  const adapter = createLifeWindowsBrowserRuntime({
    ownerId: () => binding.id,
    createWindow: ownedWindow,
    isCurrentBrowserSession: () => !disposed && !signal.aborted,
    downloadRoot: join(root, 'browser-downloads'),
    authorize: async (request) => {
      approvalRequests++
      if (!formActive || disposed || signal.aborted || request.cardId !== binding.id || !['browser_type_text', 'browser_upload_files', 'browser_click_element'].includes(request.operation))
        return { allow: false, reason: 'Only the current disposable form fixture can approve its bounded interaction' }
      assertOwnedUrl(request.targetId)
      assertOwnedUrl(ownedWindow().webContents.getURL())
      return { allow: true, reason: 'Only synthetic fields on this exact owned loopback form, in its ephemeral evaluation session' }
    },
  })
  const abort = () => {
    void dispose().catch(() => {})
  }
  async function retireFileSelection() {
    if (!formHasUploads)
      return
    // A selected File can remain readable until its owning document closes.
    // End that exact native window before cleaning snapshots or changing cases.
    try {
      await adapter.close()
    }
    finally {
      if (window && !window.isDestroyed())
        window.destroy()
      window = null
      await adapter.drainDownloads()
    }
    formHasUploads = false
  }
  async function dispose() {
    if (stopping)
      return stopping
    disposed = true
    stopping = (async () => {
      signal.removeEventListener('abort', abort)
      const results = await Promise.allSettled([
        (async () => {
          try {
            await adapter.close()
          }
          finally {
            if (window && !window.isDestroyed())
              window.destroy()
            await adapter.drainDownloads()
          }
        })(),
        (async () => {
          partition.webRequest.onBeforeRequest(null)
          server.closeAllConnections()
          await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
        })(),
        partition.clearCache(),
        partition.clearStorageData(),
      ])
      pages.clear()
      form.clear()
      formActive = false
      activeUrls.clear()
      const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      if (failures.length)
        throw new AggregateError(failures.map(result => result.reason), 'Procedure browser cleanup did not completely settle')
    })()
    return stopping
  }
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted)
    await dispose()
  async function preparePages(input: Parameters<Awaited<ReturnType<ProcedureBrowserReplayFactory>>['preparePages']>[0]) {
    signal.throwIfAborted()
    if (!/^[a-z0-9-]{1,64}$/u.test(input.caseId) || !input.pages.length || input.pages.length > 4 || new Set(input.pages.map(page => page.id)).size !== input.pages.length || input.pages.some(page => !/^[a-z0-9-]{1,64}$/u.test(page.id) || page.text.length > 20_000))
      throw new Error('Procedure browser fixture is outside its bounded page budget')
    await retireFileSelection()
    pages.clear()
    form.clear()
    formActive = false
    activeUrls.clear()
    const urls: Record<string, string> = {}
    for (const page of input.pages) {
      const target = `/${nonce}/${input.caseId}/${page.id}`
      if (!page.missing)
        pages.set(target, page.text)
      urls[page.id] = `${origin}${target}`
      activeUrls.add(urls[page.id])
    }
    // Seeding creates no work receipt or permit. Replay still uses the adapter.
    await ownedWindow().loadURL(urls[input.pages[0].id])
    signal.throwIfAborted()
    return { urls }
  }
  return {
    binding,
    isCurrent: current => !disposed && !signal.aborted && current?.kind === binding.kind && current.id === binding.id,
    async prepare(input) {
      const fixture = await preparePages({ caseId: input.caseId, pages: [{ id: 'single', text: input.text, missing: input.missing }] })
      return { url: fixture.urls.single }
    },
    preparePages,
    async prepareForm(input) {
      signal.throwIfAborted()
      await retireFileSelection()
      pages.clear()
      activeUrls.clear()
      const fixture = form.prepare(input)
      const url = `${origin}${fixture.path}`
      activeUrls.add(url)
      activeUrls.add(`${origin}${fixture.submitPath}`)
      formActive = true
      formHasUploads = Boolean(input.uploads?.length)
      await ownedWindow().loadURL(url)
      signal.throwIfAborted()
      return { url, expectedText: fixture.expectedText }
    },
    inspectForm: form.snapshot,
    approvalCount: () => approvalRequests,
    tools: {
      'tool.browser_open_url': async (input, actionSignal) => {
        actionSignal.throwIfAborted()
        if (typeof input.url !== 'string')
          throw new Error('Browser replay requires its exact seeded URL')
        assertOwnedUrl(input.url)
        return adapter.openUrl({ ...input, abortSignal: AbortSignal.any([signal, actionSignal]) })
      },
      'tool.browser_read_page': async (input, actionSignal) => {
        actionSignal.throwIfAborted()
        assertOwnedUrl(ownedWindow().webContents.getURL())
        if (input.format !== 'text' && (!formActive || input.format !== 'interactables'))
          throw new Error('Procedure browser replay only supports observed text')
        return adapter.readPage({ ...input, abortSignal: AbortSignal.any([signal, actionSignal]) })
      },
      'tool.browser_type_text': async (input, actionSignal) => {
        actionSignal.throwIfAborted()
        if (!formActive)
          throw new Error('Interaction requires the owned form evaluator')
        if (typeof input.text !== 'string')
          throw new TypeError('Interactive replay requires explicit replacement text')
        assertOwnedUrl(ownedWindow().webContents.getURL())
        return adapter.typeBrowserText({ ...input, text: input.text, abortSignal: AbortSignal.any([signal, actionSignal]) })
      },
      'tool.browser_click_element': async (input, actionSignal) => {
        actionSignal.throwIfAborted()
        if (!formActive)
          throw new Error('Interaction requires the owned form evaluator')
        assertOwnedUrl(ownedWindow().webContents.getURL())
        return adapter.clickElement({ ...input, abortSignal: AbortSignal.any([signal, actionSignal]) })
      },
      'tool.browser_upload_files': async (input, actionSignal) => {
        actionSignal.throwIfAborted()
        if (!formActive || typeof input.selector !== 'string' || !input.selector || !Array.isArray(input.files) || !input.files.length || input.files.length > 4)
          throw new Error('Upload replay requires its owned synthetic form and files')
        const ownedRoot = await realpath(root)
        for (const file of input.files) {
          if (typeof file !== 'string' || !isAbsolute(file))
            throw new Error('Upload replay requires explicit owned files')
          const child = relative(ownedRoot, await realpath(file))
          if (!child || child === '..' || child.startsWith('../') || child.startsWith('..\\') || isAbsolute(child))
            throw new Error('Upload replay cannot transmit files outside its owned fixture')
        }
        assertOwnedUrl(ownedWindow().webContents.getURL())
        return adapter.uploadBrowserFiles({ ...input, selector: input.selector, files: input.files, abortSignal: AbortSignal.any([signal, actionSignal]) })
      },
      'tool.browser_wait': async (input, actionSignal) => {
        actionSignal.throwIfAborted()
        if (!formActive)
          throw new Error('Interaction requires the owned form evaluator')
        assertOwnedUrl(ownedWindow().webContents.getURL())
        return adapter.waitForBrowser({ ...input, abortSignal: AbortSignal.any([signal, actionSignal]) })
      },
    },
    dispose,
  }
}
