import type { DownloadItem, BrowserWindow as ElectronBrowserWindow, WebContents } from 'electron'

import type { BrowserDownloadAdmission } from './execution/browser-download-repository'
import type { BrowserDownloadHandle, BrowserDownloadReservation, BrowserDownloadReservationEnd } from './execution/browser-download-reservations'
import type { BrowserDownloadReceipt } from './execution/browser-downloads'
import type { BrowserPageElement as PageElement, BrowserPageObservation as PageObservation } from './execution/browser-observation'
import type { ExecutionResourceBroker } from './execution/resource-broker'
import type { LifeInterfaceAuthorization, LifeInterfaceRiskRequest } from './life-interface-risk'
import type { AlicizationLocalBrowserClickElementInput, AlicizationLocalBrowserNavigateInput, AlicizationLocalBrowserOpenUrlInput, AlicizationLocalBrowserReadPageInput, AlicizationLocalBrowserScrollInput, AlicizationLocalBrowserTypeTextInput, AlicizationLocalBrowserUploadFilesInput, AlicizationLocalBrowserWaitInput } from './local-browser-automation'

import { createHash, randomUUID } from 'node:crypto'
import { env } from 'node:process'

import { errorMessageFrom } from '@moeru/std'
import { BrowserWindow } from 'electron'

import { executionDigest } from './execution/acceptance-compiler'
import { createBrowserCdp } from './execution/browser-cdp'
import { createBrowserDownloads } from './execution/browser-downloads'
import { browserPageScript } from './execution/browser-observation'
import { prepareBrowserUpload } from './execution/browser-upload'
import { classifyObservedEffect } from './execution/effect-policy'
import { assertInterfaceDispatchCurrent as assertActionDispatchCurrent } from './execution/interface-dispatch-context'
import { createManagedBrowserPopups } from './execution/managed-browser-popups'
import { createExecutionHealthProbe } from './execution/runtime-health'
import { classifyLifeInterfaceRisk } from './life-interface-risk'

export function createLifeWindowsBrowserRuntime(options: { isCurrentBrowserSession?: () => boolean, createWindow?: () => ElectronBrowserWindow, ownerId?: () => string, authorize?: (request: LifeInterfaceRiskRequest, signal?: AbortSignal) => Promise<LifeInterfaceAuthorization>, downloadRoot?: string, resourceBroker?: () => ExecutionResourceBroker, recordDownload?: (receipt: BrowserDownloadReceipt) => Promise<void>, recordDownloadReservation?: (reservation: BrowserDownloadReservation, end?: BrowserDownloadReservationEnd) => Promise<void>, allowHostInterfaceReservations?: boolean, readDownloads?: () => Promise<BrowserDownloadReceipt[]>, readDownloadAdmissions?: () => Promise<BrowserDownloadAdmission[]>, onError?: (error: unknown) => void } = {}) {
  let window: ElectronBrowserWindow | null = null
  let cdp: ReturnType<typeof createBrowserCdp> | null = null
  const transports = new Map<WebContents, ReturnType<typeof createBrowserCdp>>()
  function transportFor(surface: ElectronBrowserWindow) {
    let transport = transports.get(surface.webContents)
    if (!transport) {
      transport = createBrowserCdp(surface.webContents.debugger, browserPageScript)
      transports.set(surface.webContents, transport)
    }
    return transport
  }
  function closeTransport(contents: WebContents) {
    const transport = transports.get(contents)
    transports.delete(contents)
    if (cdp === transport)
      cdp = null
    try { transport?.close() }
    catch (error) { options.onError?.(error) }
  }
  let popups: ReturnType<typeof createManagedBrowserPopups> | null = null
  let downloads: ReturnType<typeof createBrowserDownloads> | null = null
  const downloadPermits = new Map<string, { id: string, observationId: string | null, signal?: AbortSignal, href: string, expiresAt: number, reservation: BrowserDownloadHandle, contents: WebContents, armed: boolean }>()
  const retiredDownloads = new Set<ReturnType<typeof createBrowserDownloads>>()
  function retireDownloads(manager: ReturnType<typeof createBrowserDownloads>) {
    retiredDownloads.add(manager)
    if (downloads === manager)
      downloads = null
    const stopping = manager.stop()
    // Card-scoped persistence can be queued behind the caller stopping it.
    // Drain later, while retaining any native owner that never acknowledged.
    void stopping.then(() => manager.flush()).then(() => {
      if (!manager.hasActiveWriters())
        retiredDownloads.delete(manager)
    }).catch(error => options.onError?.(error))
    return stopping
  }
  let removeDownloadHandler: (() => void) | null = null
  type UploadSnapshot = Awaited<ReturnType<typeof prepareBrowserUpload>>
  const uploads = new Map<UploadSnapshot, ElectronBrowserWindow | null>()
  const uploadCleanups = new Map<UploadSnapshot, Promise<void>>()
  async function cleanUploads() {
    const pending = [...uploads].filter(([, owned]) => !owned || owned.isDestroyed()).map(([snapshot]) => {
      let cleanup = uploadCleanups.get(snapshot)
      if (!cleanup) {
        cleanup = Promise.resolve().then(() => snapshot.dispose()).then(() => { uploads.delete(snapshot) }).finally(() => { uploadCleanups.delete(snapshot) })
        uploadCleanups.set(snapshot, cleanup)
      }
      return cleanup
    })
    const results = await Promise.allSettled(pending)
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (failures.length)
      throw new AggregateError(failures.map(result => result.reason), 'Managed browser upload cleanup remains pending')
  }
  let observation: PageObservation | null = null
  let observationId: string | null = null
  const references = new Map<string, PageElement>()
  let generation = 0
  let busy = false
  let owner = options.ownerId?.() ?? 'default'
  const controlId = (element: PageElement, atGeneration = generation) => `control:${executionDigest({ owner, generation: atGeneration, frameId: element.frameId, documentId: element.documentId, backendNodeId: element.backendNodeId })}`
  const failure = (operation: string, errorCode: string, errorMessage: string) => ({ channel: 'browser', browser: 'alicization-managed', operation, status: 'failed', errorCode, errorMessage, sideEffectState: 'none' })
  function assertSelectedSession() {
    if (options.isCurrentBrowserSession?.() === false)
      throw new Error('LOCAL_BROWSER_SESSION_CHANGED')
  }
  function getWindow() {
    assertSelectedSession()
    const nextOwner = options.ownerId?.() ?? 'default'
    if (nextOwner !== owner) {
      void close().catch(error => options.onError?.(error))
      owner = nextOwner
    }
    const selected = popups?.selected()
    // Switch only between operations, after the opener's mouse-up settled.
    if (selected && !selected.isDestroyed() && selected !== window) {
      window = selected
      // Keep one transport per native surface until that surface closes.
      cdp = transportFor(selected)
      observation = null
      observationId = null
      references.clear()
      generation++
    }
    if (window && !window.isDestroyed())
      return window
    if (retiredDownloads.size >= 16)
      throw new Error('BROWSER_DOWNLOAD_RETIRED_WRITER_BUDGET')
    const partition = `persist:alicization-browser-${createHash('sha256').update(owner).digest('hex')}`
    window = options.createWindow?.() ?? new BrowserWindow({ width: 1100, height: 760, show: false, title: 'Alicization Browser', webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, autoplayPolicy: 'document-user-activation-required', partition } })
    const owned = window
    const ownedSession = owned.webContents.session
    let ownedPopups: ReturnType<typeof createManagedBrowserPopups> | null = null
    const activeItems = new Map<WebContents, Set<DownloadItem>>()
    cdp = transportFor(owned)
    downloads = options.downloadRoot && options.recordDownload && options.recordDownloadReservation ? createBrowserDownloads({ root: options.downloadRoot, cardId: owner, resourceBroker: options.resourceBroker?.(), record: options.recordDownload, recordReservation: options.recordDownloadReservation, allowHostInterfaceReservations: options.allowHostInterfaceReservations, onError: options.onError ?? (() => {}) }) : null
    const transferManager = downloads
    const downloadHandler = (_event: unknown, item: DownloadItem, contents: WebContents) => {
      for (const permit of downloadPermits.values()) {
        if (permit.expiresAt <= Date.now() || permit.signal?.aborted)
          downloadPermits.delete(permit.id)
      }
      let requestedUrl: URL
      try { requestedUrl = new URL(item.getURLChain()[0] ?? item.getURL()) }
      catch { item.cancel(); return }
      requestedUrl.hash = ''
      const candidates = [...downloadPermits.values()].filter(permit => permit.armed && permit.href === requestedUrl.href && ownedPopups?.ownsDownload(contents, permit.contents, permit.id))
      if (!transferManager || candidates.length !== 1) {
        item.cancel()
        options.onError?.(new Error(`BROWSER_DOWNLOAD_UNBOUND:surface=${contents === owned.webContents};store=${Boolean(downloads)};permits=${candidates.length}`))
      }
      else {
        const permit = candidates[0]!
        downloadPermits.delete(permit.id)
        const items = activeItems.get(contents) ?? new Set<DownloadItem>()
        activeItems.set(contents, items)
        items.add(item)
        item.once('done', () => {
          items.delete(item); if (!items.size)
            activeItems.delete(contents)
        })
        transferManager.accept(item, permit.reservation)
      }
    }
    ownedSession.on('will-download', downloadHandler)
    const detachDownloadHandler = () => ownedSession.removeListener('will-download', downloadHandler)
    removeDownloadHandler = detachDownloadHandler
    function configureSurface(surface: ElectronBrowserWindow) {
      surface.webContents.setAudioMuted(Boolean(env.LIFE_QA_PRIVATE_DESKTOP))
      surface.webContents.on('will-navigate', (event, target) => {
        if (!/^https?:/iu.test(target) && target !== 'about:blank')
          event.preventDefault()
      })
      surface.webContents.on('did-start-navigation', (_event, _url, _inPlace, mainFrame) => {
        if (mainFrame !== undefined) {
          generation += 1
          observation = null
          observationId = null
        }
      })
    }
    configureSurface(owned)
    owned.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    owned.webContents.session.setPermissionCheckHandler(() => false)
    ownedPopups = createManagedBrowserPopups({ root: owned, current: () => owner === nextOwner && nextOwner === (options.ownerId?.() ?? 'default') && options.isCurrentBrowserSession?.() !== false, created: (child) => {
      configureSurface(child); if (owned.isVisible() && !env.LIFE_QA_PRIVATE_DESKTOP)
        child.showInactive()
    }, closed: (_surface, contents) => {
      closeTransport(contents)
      for (const item of activeItems.get(contents) ?? []) {
        try { item.cancel() }
        catch (error) { options.onError?.(error) }
      }
    } })
    popups = ownedPopups
    owned.on('closed', () => {
      if (transferManager)
        void retireDownloads(transferManager).catch(error => options.onError?.(error))
      detachDownloadHandler()
      ownedPopups?.close()
      if (popups === ownedPopups) {
        popups = null
        cdp?.close()
        cdp = null
        window = null
        observation = null
        observationId = null
        generation += 1
      }
      void cleanUploads().catch(error => options.onError?.(error))
    })
    return owned
  }
  async function run(operation: string, signal: AbortSignal | undefined, task: (owned: ElectronBrowserWindow, armDeadline: (ms: number) => void) => Promise<Record<string, unknown>>) {
    signal?.throwIfAborted()
    if (busy)
      return failure(operation, 'LOCAL_BROWSER_BUSY', 'The current browser operation must settle before another one starts.')
    busy = true
    let taskPromise: Promise<Record<string, unknown>> | null = null
    let taskSettled = false
    try {
      const owned = getWindow()
      await downloads?.prepare()
      assertSelectedSession()
      const capturedOwner = owner
      let timer: ReturnType<typeof setTimeout> | undefined
      let cancel: (() => void) | undefined
      let expire: (() => void) | undefined
      const armDeadline = (ms: number) => {
        if (timer)
          clearTimeout(timer)
        if (expire) {
          timer = setTimeout(expire, ms)
          timer.unref?.()
        }
      }
      let outcome: Record<string, unknown>
      try {
        taskPromise = task(owned, armDeadline).finally(() => { taskSettled = true })
        outcome = await Promise.race([
          taskPromise,
          new Promise<never>((_resolve, reject) => {
            cancel = () => { owned.webContents.stop(); reject(signal?.reason ?? new Error('Browser operation interrupted')) }
            signal?.addEventListener('abort', cancel, { once: true })
            expire = () => { void close().catch(error => options.onError?.(error)); reject(new Error('Managed browser operation exceeded its deadline')) }
            armDeadline(20_000)
          }),
        ])
      }
      finally {
        if (timer)
          clearTimeout(timer)
        if (cancel)
          signal?.removeEventListener('abort', cancel)
      }

      if (capturedOwner !== (options.ownerId?.() ?? 'default')) {
        await close()
        return failure(operation, 'LOCAL_BROWSER_OWNER_CHANGED', 'The browser owner changed while the operation was running; its result needs a fresh observation.')
      }
      assertSelectedSession()
      return outcome.status === 'completed' ? { ...outcome, ok: true, finalStatus: 'completed' } : outcome
    }
    catch (error) {
      if (signal?.aborted)
        throw error
      return { ...failure(operation, 'LOCAL_BROWSER_OPERATION_FAILED', errorMessageFrom(error) || 'Managed browser operation failed.'), ...(['browser_click_element', 'browser_type_text', 'browser_upload_files'].includes(operation) ? { effectMayHaveOccurred: true, requiresVerification: true, sideEffectState: 'unknown' } : {}) }
    }
    finally {
      // An aborted caller may return before the CDP key/mouse-up finishes.
      // Keep the surface serialized until that cleanup actually settles.
      if (!taskPromise || taskSettled)
        busy = false
      else
        void taskPromise.then(() => { busy = false }, () => { busy = false })
    }
  }
  async function page(owned: ElectronBrowserWindow, maximum: number, html = false) {
    if (!cdp || owned !== window)
      throw new Error('Managed browser document is unavailable')
    return cdp.observe<PageObservation>(maximum, html)
  }
  async function openUrl(input: AlicizationLocalBrowserOpenUrlInput) {
    return run('browser_open_url', input.abortSignal, async (owned) => {
      const url = new URL(input.url || 'about:blank')
      if (!['http:', 'https:'].includes(url.protocol) && url.href !== 'about:blank')
        return failure('browser_open_url', 'LOCAL_BROWSER_URL_NOT_ALLOWED', 'Only HTTP, HTTPS and an empty page are supported.')
      if (input.browser === 'safari')
        return failure('browser_open_url', 'LOCAL_BROWSER_NOT_AVAILABLE', 'Safari is unavailable on Windows.')
      const abort = () => owned.webContents.stop()
      input.abortSignal?.addEventListener('abort', abort, { once: true })
      try {
        await assertActionDispatchCurrent(false)
        await owned.loadURL(url.href)
      }
      finally { input.abortSignal?.removeEventListener('abort', abort) }
      input.abortSignal?.throwIfAborted()
      if (!env.LIFE_QA_PRIVATE_DESKTOP)
        owned.showInactive()
      return { channel: 'browser', browser: 'alicization-managed', operation: 'browser_open_url', status: 'completed', url: owned.webContents.getURL(), title: owned.getTitle(), site: input.site ?? null }
    })
  }
  async function readPage(input: AlicizationLocalBrowserReadPageInput) {
    return run('browser_read_page', input.abortSignal, async (owned) => {
      const maximum = Math.max(200, Math.min(24_000, Number(input.maxChars) || 12_000))
      observation = await page(owned, maximum, input.format === 'html')
      observationId = randomUUID()
      references.clear()
      const elements = observation.elements.map((element) => {
        const { formState, formPreview: _formPreview, contextId, sessionId, backendNodeId, documentId, ...publicElement } = element
        const reference = `element:${randomUUID()}`
        references.set(reference, element)
        return { ...publicElement, id: controlId(element), selector: reference, elementRef: reference, formStateHash: formState == null ? null : executionDigest(formState) }
      })
      const persisted = options.readDownloads ? await options.readDownloads() : []
      const downloadAdmissions = await options.readDownloadAdmissions?.() ?? []
      const transfers = [...new Map([...persisted, ...(downloads?.snapshot() ?? [])].map(receipt => [receipt.id, receipt])).values()]
      const bounds = owned.getContentBounds()
      return { channel: 'browser', browser: 'alicization-managed', operation: 'browser_read_page', status: 'completed', ...observation, elements, observationId, surfaces: popups?.snapshot() ?? [], transfers, downloadAdmissions, windowBounds: { left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }, coordinateSpace: 'screen-dip', windowVisible: owned.isVisible() && !owned.isMinimized(), format: input.format || 'text', content: input.format === 'interactables' ? JSON.stringify(elements) : input.format === 'html' ? observation.html : observation.text, executionScope: 'owned-window-only' }
    })
  }
  async function mutate(operation: 'click' | 'type', input: AlicizationLocalBrowserClickElementInput | AlicizationLocalBrowserTypeTextInput) {
    const { abortSignal, ...parameters } = input
    input = { ...structuredClone(parameters), abortSignal }
    const name = operation === 'click' ? 'browser_click_element' : 'browser_type_text'
    return run(name, input.abortSignal, async (owned, armDeadline) => {
      if (!observation || !observationId || owned.webContents.getURL() !== observation.url)
        return failure(name, 'LOCAL_BROWSER_OBSERVATION_REQUIRED', 'Read the current page before changing it.')
      const old = observation
      const capturedOwner = owner
      const currentGeneration = generation
      const targetText = 'targetText' in input ? input.targetText : 'text' in input && operation === 'click' ? input.text : undefined
      const reference = input.selector ? references.get(input.selector) : null
      if (input.selector && !reference)
        return failure(name, 'LOCAL_BROWSER_STALE_REFERENCE', 'Use a selector reference from the latest page observation.')
      const candidates = old.elements.filter(element => input.selector ? element === reference : !targetText || (input.exactText ? element.text === targetText : element.text.includes(targetText)))
      const target = input.ordinal !== undefined ? candidates[input.ordinal - 1] : candidates.length === 1 ? candidates[0] : undefined
      if (!target)
        return failure(name, 'LOCAL_BROWSER_AMBIGUOUS_TARGET', 'Choose one observed selector or ordinal; ambiguous targets are not clicked.')
      input.abortSignal?.throwIfAborted()
      const current = await page(owned, 200)
      const actual = current.elements.find(element => element.backendNodeId === target.backendNodeId && element.documentId === target.documentId && element.frameId === target.frameId)
      if (generation !== currentGeneration || current.url !== old.url || !actual || JSON.stringify(actual) !== JSON.stringify(target))
        return failure(name, 'LOCAL_BROWSER_STALE_TARGET', 'The observed target changed; read the page and replan.')
      input.abortSignal?.throwIfAborted()
      const typed = input as AlicizationLocalBrowserTypeTextInput
      if (operation === 'type' && (!typed.text || typed.text.length > 16_000))
        return failure(name, 'LOCAL_BROWSER_INPUT_BUDGET', 'Input text must contain at most 16000 characters.')
      const destination = new URL(target.formAction || target.frameUrl || old.url)
      const externalSubmit = !['localhost', '127.0.0.1', '[::1]'].includes(destination.hostname) && ((operation === 'type' && typed.submit === true) || (operation === 'click' && target.submitControl === true))
      if (externalSubmit && target.sensitiveForm)
        return failure(name, 'LOCAL_BROWSER_SENSITIVE_FORM_HANDOFF', 'This form requires user completion in the browser because its secret fields cannot be bound to a reviewed transmission.')
      if ((target.submitControl || typed.submit === true) && target.formPreview == null)
        return failure(name, 'LOCAL_BROWSER_FORM_VERIFICATION_BUDGET', 'The current visible form cannot be fully shown for review.')
      for (const permit of downloadPermits.values()) {
        if (permit.expiresAt <= Date.now() || permit.signal?.aborted)
          downloadPermits.delete(permit.id)
      }
      const label = `${target.text} ${target.visibleText || ''}`.trim()
      const locality = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(target.frameUrl || old.url).hostname) ? 'local' : 'external'
      const policy = classifyObservedEffect({ locality, operation: externalSubmit ? 'submit' : operation === 'click' ? 'activate' : 'edit', semantic: target.href ? 'navigation' : 'unknown', contentBound: Boolean(target.formState), targetFresh: true })
      const risk = classifyLifeInterfaceRisk({ operation: name, label, password: operation === 'type' && target.password, externalSubmit, unknownExternalEffect: policy.state === 'confirmation' })
      if (risk) {
        armDeadline(80_000)
        const decision = await options.authorize?.({ cardId: owner, operation: name, targetId: destination.href, label, ...(operation === 'type' ? { previewText: typed.text } : target.formPreview != null ? { previewText: target.formPreview } : {}), effectDigest: executionDigest({ operation, target, text: operation === 'type' ? typed.text : null, submit: typed.submit === true }), targetFingerprint: executionDigest({ owner, generation, observationId, target }), ...risk }, input.abortSignal)
        armDeadline(20_000)
        input.abortSignal?.throwIfAborted()
        if (!decision?.allow) {
          observation = null
          observationId = null
          return failure(name, decision?.reason === 'host-denied' ? 'ALICIZATION_TOOL_DENIED_BY_HOST' : 'LOCAL_INTERFACE_CONFIRMATION_UNAVAILABLE', 'The classified action was not approved and was not dispatched.')
        }
      }
      if (capturedOwner !== (options.ownerId?.() ?? 'default') || owned.isDestroyed() || generation !== currentGeneration || owned.webContents.getURL() !== old.url)
        return failure(name, 'LOCAL_BROWSER_STALE_TARGET', 'The owner or surface changed during approval; re-observe before any dispatch.')
      const action = { id: randomUUID(), observationId, signal: input.abortSignal }
      let downloadReservationId: string | undefined
      if (operation === 'click' && target.href && downloadPermits.size < 16) {
        const href = new URL(target.href)
        href.hash = ''
        if (downloads) {
          let reservation: BrowserDownloadHandle
          try { reservation = await downloads.reserve(action, href.href) }
          catch { return failure(name, 'BROWSER_DOWNLOAD_RESERVATION_FAILED', 'The possible download could not be reserved; the link was not activated.') }
          downloadPermits.set(action.id, { ...action, href: href.href, expiresAt: Date.now() + 15_000, reservation, contents: owned.webContents, armed: false })
          downloadReservationId = reservation.id
        }
      }
      let result: Awaited<ReturnType<NonNullable<typeof cdp>['mutate']>>
      const popup = operation === 'click' && target.href && /^https?:/iu.test(target.href)
        ? popups!.begin({ window: owned, url: target.href, actionId: action.id, signal: input.abortSignal, expiresAt: Date.now() + 15000 })
        : null
      try {
        result = await cdp!.mutate(target, { operation, ...(operation === 'type' ? { text: typed.text, clear: typed.clearExisting === true, submit: typed.submit === true } : {}) }, () => {
          input.abortSignal?.throwIfAborted()
          assertSelectedSession()
          if (capturedOwner !== (options.ownerId?.() ?? 'default') || owned.isDestroyed() || generation !== currentGeneration)
            throw new Error('LOCAL_BROWSER_STALE_TARGET')
        }, () => {
          popup?.arm()
          const permit = downloadPermits.get(action.id)
          if (permit)
            permit.armed = true
        })
      }
      catch (error) {
        const permit = downloadPermits.get(action.id)
        downloadPermits.delete(action.id)
        if (permit)
          await downloads?.release(permit.reservation)
        throw error
      }
      finally { popup?.end() }
      if (!result.ok) {
        const permit = downloadPermits.get(action.id)
        downloadPermits.delete(action.id)
        if (permit)
          await downloads?.release(permit.reservation)
      }
      observation = null
      observationId = null
      references.clear()
      // Cancellation after dispatch never fabricates a rollback or replays input.
      input.abortSignal?.throwIfAborted()
      return result.ok ? { channel: 'browser', browser: 'alicization-managed', operation: name, status: 'completed', ...result, browserActionId: action.id, ...(downloadReservationId ? { downloadReservationId } : {}), target: controlId(target, currentGeneration), requiresReadback: true } : failure(name, result.errorCode ?? 'LOCAL_BROWSER_OPERATION_FAILED', 'The actual page rejected the operation; re-observe before retrying.')
    })
  }
  async function navigate(input: AlicizationLocalBrowserNavigateInput) {
    return run('browser_navigate', input.abortSignal, async (owned) => {
      input.abortSignal?.throwIfAborted()
      await assertActionDispatchCurrent(false)
      if (input.action === 'reload')
        owned.webContents.reload()
      else if (input.action === 'back' && owned.webContents.navigationHistory.canGoBack())
        owned.webContents.navigationHistory.goBack()
      else if (input.action === 'forward' && owned.webContents.navigationHistory.canGoForward())
        owned.webContents.navigationHistory.goForward()
      else
        return failure('browser_navigate', 'LOCAL_BROWSER_NAVIGATION_UNAVAILABLE', 'The requested navigation is unavailable.')
      observation = null
      return { channel: 'browser', browser: 'alicization-managed', operation: 'browser_navigate', status: 'completed', requiresReadback: true }
    })
  }
  async function uploadBrowserFiles(input: AlicizationLocalBrowserUploadFilesInput) {
    const name = 'browser_upload_files'
    return run(name, input.abortSignal, async (owned, armDeadline) => {
      const target = references.get(input.selector)
      if (!observation || !observationId || !target || target.type !== 'file' || !options.downloadRoot)
        return failure(name, 'LOCAL_BROWSER_FILE_OBSERVATION_REQUIRED', 'Observe an enabled file input before selecting exact files.')
      if (!target.multiple && input.files.length > 1)
        return failure(name, 'LOCAL_BROWSER_SINGLE_FILE_TARGET', 'This observed control accepts only one file.')
      const capturedOwner = owner
      const capturedGeneration = generation
      const capturedObservation = observationId
      if (uploads.size >= 16 || [...uploads.values()].filter(item => item === owned).length >= 8)
        return failure(name, 'BROWSER_UPLOAD_RETAINED_SNAPSHOT_BUDGET', 'Close the prior file-selection window and settle its cleanup before selecting more files.')
      const snapshot = await prepareBrowserUpload(input.files, `${options.downloadRoot}/upload-snapshots/${createHash('sha256').update(owner).digest('hex')}`, input.abortSignal)
      // Retain before approval: a failed cleanup of a denied selection still
      // has an owner. Once native selection starts, keep bytes until it closes.
      uploads.set(snapshot, null)
      let dispatched = false
      try {
        armDeadline(80_000)
        const decision = await options.authorize?.({ cardId: owner, operation: name, targetId: target.formAction || target.frameUrl || observation.url, label: snapshot.files.map(file => `${file.original} (${file.bytes} bytes)`).join('\n'), previewText: snapshot.files.map(file => `${file.original}\n${file.bytes} bytes\nSHA-256 ${file.sha256}`).join('\n\n'), effectDigest: executionDigest(snapshot.files.map(({ original, bytes, sha256 }) => ({ original, bytes, sha256 }))), targetFingerprint: executionDigest({ owner, generation, observationId, target }), riskLevel: 'danger', actionCategory: 'network', reason: 'Selecting these exact file snapshots can immediately transmit their contents to this page. Selection does not prove server receipt.' }, input.abortSignal)
        armDeadline(20_000)
        input.abortSignal?.throwIfAborted()
        if (!decision?.allow)
          return failure(name, 'ALICIZATION_TOOL_DENIED_BY_HOST', 'The file selection was not approved.')
        const current = await page(owned, 200)
        const actual = current.elements.find(item => item.backendNodeId === target.backendNodeId && item.documentId === target.documentId && item.frameId === target.frameId)
        if (owner !== capturedOwner || generation !== capturedGeneration || observationId !== capturedObservation || !actual || JSON.stringify(actual) !== JSON.stringify(target))
          return failure(name, 'LOCAL_BROWSER_STALE_TARGET', 'The file input changed during approval; no files were selected.')
        dispatched = true
        uploads.set(snapshot, owned)
        const result = await cdp!.mutate(target, { operation: 'upload', files: snapshot.files.map(file => file.path) }, () => {
          input.abortSignal?.throwIfAborted()
          assertSelectedSession()
          if (owner !== capturedOwner || (options.ownerId?.() ?? 'default') !== capturedOwner || generation !== capturedGeneration || owned.isDestroyed())
            throw new Error('LOCAL_BROWSER_STALE_TARGET')
        })
        if (!result.ok) {
          return failure(name, result.errorCode ?? 'LOCAL_BROWSER_FILE_SELECTION_FAILED', 'The observed file input rejected selection.')
        }
        return { channel: 'browser', operation: name, status: 'completed', selectionId: snapshot.id, files: snapshot.files.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 })), serverReceiptVerified: false, requiresReadback: true, inputMode: 'trusted-cdp' }
      }
      finally {
        observation = null
        observationId = null
        references.clear()
        if (!dispatched)
          await cleanUploads()
      }
    })
  }
  async function scroll(input: AlicizationLocalBrowserScrollInput) {
    return run('browser_scroll', input.abortSignal, async (owned) => {
      if (!['top', 'bottom', 'up', 'down'].includes(input.action))
        return failure('browser_scroll', 'LOCAL_BROWSER_INVALID_SCROLL', 'Unknown scroll direction.')
      const amount = Math.max(1, Math.min(4000, Number(input.amount) || 600))
      await assertActionDispatchCurrent(false)
      await owned.webContents.executeJavaScript(`(() => { ${browserPageScript}; return scrollPage(${JSON.stringify(input.action)},${amount}); })()`)
      input.abortSignal?.throwIfAborted()
      return { channel: 'browser', browser: 'alicization-managed', operation: 'browser_scroll', status: 'completed', requiresReadback: true }
    })
  }
  async function wait(input: AlicizationLocalBrowserWaitInput) {
    return run('browser_wait', input.abortSignal, async (owned) => {
      const deadline = Date.now() + Math.max(100, Math.min(15_000, Number(input.timeoutMs) || 5000))
      let lastReadError: string | null = null
      while (Date.now() < deadline) {
        input.abortSignal?.throwIfAborted()
        let observed: PageObservation
        try { observed = await page(owned, 24_000) }
        catch (error) {
          // Navigation can replace the execution context between two reads.
          // Retrying this observation never replays the submitted mutation.
          lastReadError = errorMessageFrom(error) || 'Page observation unavailable'
          await new Promise<void>((resolve) => { const timer = setTimeout(resolve, 100); timer.unref?.() })
          continue
        }
        const stateMatches = input.state === 'interactive' ? observed.readyState !== 'loading' : observed.readyState === 'complete'
        if (stateMatches && (!input.text || observed.text.includes(input.text)) && (!input.urlIncludes || observed.url.includes(input.urlIncludes)))
          return { channel: 'browser', browser: 'alicization-managed', operation: 'browser_wait', status: 'completed', url: observed.url, title: observed.title }
        await new Promise<void>((resolve) => { const timer = setTimeout(resolve, 100); timer.unref?.() })
      }
      return failure('browser_wait', 'LOCAL_BROWSER_WAIT_TIMEOUT', lastReadError || 'The requested actual page state did not appear.')
    })
  }
  function close() {
    downloadPermits.clear()
    const transferStop = downloads ? retireDownloads(downloads) : Promise.resolve()
    removeDownloadHandler?.()
    removeDownloadHandler = null
    for (const contents of [...transports.keys()])
      closeTransport(contents)
    cdp = null
    const ownedPopups = popups
    popups = null
    ownedPopups?.close()
    if (window && !window.isDestroyed())
      window.destroy()
    window = null
    observation = null
    observationId = null
    references.clear()
    return Promise.all([transferStop, cleanUploads()])
  }
  async function drainDownloads() {
    await Promise.all([...retiredDownloads, ...(downloads ? [downloads] : [])].map(manager => manager.flush()))
    for (const manager of retiredDownloads) {
      if (!manager.hasActiveWriters())
        retiredDownloads.delete(manager)
    }
  }
  async function cancelEffectDownloads(cardId: string, effectIds: readonly string[]) {
    if ((options.ownerId?.() ?? 'default') !== cardId)
      throw new Error('Download cancellation crossed the active card owner')
    const managers = [...retiredDownloads, ...(downloads ? [downloads] : [])].filter(manager => manager.cardId === cardId)
    const results = await Promise.all(managers.map(manager => manager.cancelEffects(effectIds)))
    const stopped = results.every(result => result.stopped)
    return { requested: results.reduce((sum, result) => sum + result.requested, 0), stopped, state: stopped ? 'stopped' : 'stopping' }
  }
  const downloadWriterStopped = (cardId: string, reservationId: string) => [...retiredDownloads, ...(downloads ? [downloads] : [])].filter(manager => manager.cardId === cardId).every(manager => manager.writerStopped(reservationId))
  const probeHealth = createExecutionHealthProbe({
    failureReason: 'managed-browser-probe-failed',
    probe: async () => {
      const owned = getWindow()
      // A newly constructed Electron WebContents has not committed a document
      // yet. Only initialize its own blank page; never navigate a user's page
      // as a side effect of checking health.
      if (!owned.webContents.getURL())
        await owned.loadURL('about:blank')
      await cdp!.probe()
      return { available: true, ready: true, reason: null }
    },
  })
  const getHealth = () => busy
    ? Promise.resolve({ available: true, ready: false, reason: 'managed-browser-busy', observedAt: Date.now() })
    : probeHealth()
  return { openUrl, readPage, uploadBrowserFiles, clickElement: (input: AlicizationLocalBrowserClickElementInput) => mutate('click', input), typeBrowserText: (input: AlicizationLocalBrowserTypeTextInput) => mutate('type', input), navigateBrowser: navigate, scrollBrowser: scroll, waitForBrowser: wait, close, drainDownloads, cancelEffectDownloads, downloadWriterStopped, getHealth }
}
