import type { AuthorizedBrowserCommand, AuthorizedBrowserState } from '../../../shared/authorized-browser-contracts'
import type { BrowserWorkBinding } from '../../../shared/execution-contracts'
import type { AuthorizedBrowserTarget } from './execution/authorized-browser-endpoint'
import type { BrowserPageElement, BrowserPageObservation } from './execution/browser-observation'
import type { LifeInterfaceAuthorization, LifeInterfaceRiskRequest } from './life-interface-risk'
import type { AlicizationLocalBrowserClickElementInput, AlicizationLocalBrowserNavigateInput, AlicizationLocalBrowserOpenUrlInput, AlicizationLocalBrowserReadPageInput, AlicizationLocalBrowserScrollInput, AlicizationLocalBrowserTypeTextInput, AlicizationLocalBrowserUploadFilesInput, AlicizationLocalBrowserWaitInput } from './local-browser-automation'

import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { errorMessageFrom } from '@moeru/std'

import { executionDigest } from './execution/acceptance-compiler'
import { authorizedBrowserOrigin, inspectAuthorizedBrowser, publicAuthorizedBrowserTarget } from './execution/authorized-browser-endpoint'
import { connectAuthorizedBrowser } from './execution/authorized-browser-transport'
import { createBrowserCdp } from './execution/browser-cdp'
import { browserPageScript } from './execution/browser-observation'
import { prepareBrowserUpload } from './execution/browser-upload'
import { assertInterfaceDispatchCurrent as assertActionDispatchCurrent } from './execution/interface-dispatch-context'
import { classifyLifeInterfaceRisk } from './life-interface-risk'

interface BrowserGrant {
  id: string
  cardId: string
  target: AuthorizedBrowserTarget
  origins: string[]
  controller: AbortController
  connection: Awaited<ReturnType<typeof connectAuthorizedBrowser>> | null
  cdp: ReturnType<typeof createBrowserCdp> | null
  operationEpoch: number | null
  active: boolean
  reason: string | null
  released: boolean | null
  stopping: Promise<void> | null
  uploads: Set<Awaited<ReturnType<typeof prepareBrowserUpload>>>
}

/** Access is granted by the local host surface; model inputs cannot create it. */
export function createLifeAuthorizedBrowserRuntime(options: {
  ownerId: () => string
  uploadRoot: string
  authorize?: (request: LifeInterfaceRiskRequest, signal?: AbortSignal) => Promise<LifeInterfaceAuthorization>
  stopWork: (cardId: string) => Promise<void>
  audit: (event: Record<string, unknown>) => Promise<void>
  onError: (error: unknown) => void
}) {
  let mode: 'managed' | 'authorized' = 'managed'
  const sessions = new AsyncLocalStorage<{ mode: 'managed' | 'authorized', grantId: string | null, cardId: string }>()
  const managedInstance = randomUUID()
  let grant: BrowserGrant | null = null
  let inspection: { id: string, cardId: string, endpoint: string, expiresAt: number, tabs: AuthorizedBrowserTarget[] } | null = null
  let sequence = 0
  let operation: Promise<unknown> | null = null
  const retiredUploads = new Set<Awaited<ReturnType<typeof prepareBrowserUpload>>>()
  let observation: { id: string, grantId: string, page: BrowserPageObservation, refs: Map<string, BrowserPageElement> } | null = null
  const safeUrl = (raw: string) => { const url = new URL(raw); return ['http:', 'https:'].includes(url.protocol) ? `${url.origin}${url.pathname}` : '' }
  const report = (error: unknown) => {
    try { options.onError(error) }
    catch { /* Diagnostics cannot restore access. */ }
  }
  async function cleanUploads(current?: BrowserGrant) {
    if (current?.released) {
      for (const upload of current.uploads)
        retiredUploads.add(upload)
      current.uploads.clear()
    }
    for (const upload of retiredUploads) {
      try {
        await upload.dispose()
        retiredUploads.delete(upload)
      }
      catch (error) { report(error) }
    }
  }
  const failure = (name: string, code: string, unknown = false) => ({ channel: 'browser', browser: 'authorized-page', operation: name, status: 'failed', ok: false, errorCode: code, sideEffectState: unknown ? 'unknown' : 'none', effectMayHaveOccurred: unknown, requiresVerification: unknown })
  function assertGrant(current: BrowserGrant) {
    const session = sessions.getStore()
    if (!current.active || current !== grant || current.cardId !== options.ownerId() || current.controller.signal.aborted || session && (session.grantId !== current.id || session.cardId !== current.cardId || session.mode !== 'authorized'))
      throw new Error('AUTHORIZED_BROWSER_GRANT_REVOKED')
    current.connection!.assertCurrent(current.operationEpoch ?? undefined)
  }
  function stop(current: BrowserGrant, reason: string) {
    current.active = false
    current.reason = reason
    current.controller.abort(new DOMException(reason, 'AbortError'))
    observation = null
    if (current.stopping)
      return current.stopping
    const pendingOperation = operation
    // Publish the promise before transport revocation calls our observer back.
    current.stopping = Promise.resolve().then(async () => {
      const released = await current.connection?.stop(reason)
      current.released = released?.released ?? true
      await options.stopWork(current.cardId)
      await Promise.allSettled(pendingOperation ? [pendingOperation] : [])
      await cleanUploads(current)
      await options.audit({ action: 'revoked', grantId: current.id, cardId: current.cardId, targetFingerprint: current.target.fingerprint, reason, ownedInputReleased: current.released })
    })
    void current.stopping.catch(report)
    return current.stopping
  }
  async function stopped(reason = 'AUTHORIZED_BROWSER_HOST_REVOKED') {
    // Managed work owns native input too. Its missing stop acknowledgement
    // needs the same deadline as a selected external page, including on quit.
    const pending = grant ? stop(grant, reason) : options.stopWork(options.ownerId())
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([pending, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('AUTHORIZED_BROWSER_OLD_WORK_NOT_STOPPED')), 5000) })])
    }
    finally { clearTimeout(timer) }
    if (grant?.released === false)
      throw new Error('AUTHORIZED_BROWSER_INPUT_RELEASE_UNKNOWN')
  }
  function state(): AuthorizedBrowserState {
    const current = grant?.cardId === options.ownerId() ? grant : null
    return {
      mode,
      status: mode === 'managed' ? 'managed' : current?.active ? 'connected' : current?.released === false ? 'release-unknown' : operation ? 'stopping' : 'disconnected',
      reason: current?.reason ?? null,
      target: current ? publicAuthorizedBrowserTarget(current.target) : null,
      origins: current?.origins ?? [],
      ...(inspection?.cardId === options.ownerId() && inspection.expiresAt > Date.now() ? { inspection: { id: inspection.id, expiresAt: inspection.expiresAt, tabs: inspection.tabs.map(publicAuthorizedBrowserTarget) } } : {}),
    }
  }
  async function command(input: AuthorizedBrowserCommand): Promise<AuthorizedBrowserState> {
    if (input.cardId !== options.ownerId())
      throw new Error('AUTHORIZED_BROWSER_CARD_CHANGED')
    if (input.action === 'status')
      return state()
    const token = ++sequence
    if (input.action === 'inspect') {
      const tabs = await inspectAuthorizedBrowser(input.endpoint)
      if (token !== sequence || input.cardId !== options.ownerId())
        throw new Error('AUTHORIZED_BROWSER_INSPECTION_SUPERSEDED')
      inspection = { id: randomUUID(), cardId: input.cardId, endpoint: input.endpoint, expiresAt: Date.now() + 120000, tabs }
      return state()
    }
    if (input.action === 'confirm-closed') {
      const current = grant
      if (current?.cardId !== input.cardId || current.released !== false || input.confirmedClosed !== true)
        throw new Error('AUTHORIZED_BROWSER_NO_UNKNOWN_RELEASE')
      await options.audit({ action: 'host-attested-closed', cardId: input.cardId, grantId: current.id, targetFingerprint: current.target.fingerprint, independentProof: false })
      if (token !== sequence || grant !== current || input.cardId !== options.ownerId())
        throw new Error('AUTHORIZED_BROWSER_INSPECTION_SUPERSEDED')
      current.released = true
      await cleanUploads(current)
      return state()
    }
    if (input.action !== 'grant') {
      await stopped(input.action === 'takeover' ? 'AUTHORIZED_BROWSER_HOST_TAKEOVER' : 'AUTHORIZED_BROWSER_HOST_REVOKED')
      if (token !== sequence || input.cardId !== options.ownerId())
        throw new Error('AUTHORIZED_BROWSER_INSPECTION_SUPERSEDED')
      if (input.action === 'managed')
        mode = 'managed'
      return state()
    }
    const selected = inspection
    const target = selected?.tabs.find(tab => tab.id === input.tabId)
    if (!selected || selected.cardId !== input.cardId || selected.expiresAt <= Date.now() || selected.id !== input.inspectionId || !target)
      throw new Error('AUTHORIZED_BROWSER_FRESH_SELECTION_REQUIRED')
    if (!input.origins.length || input.origins.length > 8 || input.origins.some(origin => origin !== authorizedBrowserOrigin(origin)) || new Set(input.origins).size !== input.origins.length || !input.origins.includes(target.origin))
      throw new Error('AUTHORIZED_BROWSER_EXACT_ORIGINS_REQUIRED')
    const fresh = (await inspectAuthorizedBrowser(selected.endpoint)).find(tab => tab.id === target.id)
    if (!fresh || fresh.fingerprint !== target.fingerprint || token !== sequence || input.cardId !== options.ownerId())
      throw new Error('AUTHORIZED_BROWSER_SELECTED_DOCUMENT_CHANGED')
    await stopped()
    await cleanUploads()
    if (token !== sequence || input.cardId !== options.ownerId())
      throw new Error('AUTHORIZED_BROWSER_INSPECTION_SUPERSEDED')
    mode = 'authorized'
    const current: BrowserGrant = { id: randomUUID(), cardId: input.cardId, target, origins: [...input.origins], controller: new AbortController(), connection: null, cdp: null, operationEpoch: null, active: false, reason: null, released: null, stopping: null, uploads: new Set() }
    grant = current
    try {
      current.connection = await connectAuthorizedBrowser(target, current.origins, (reason) => { void stop(current, reason) }, () => {
        if (grant === current)
          observation = null
      })
      current.cdp = createBrowserCdp(current.connection.debuggerPort, browserPageScript, { assertCurrent: () => assertGrant(current), allowFrame: current.connection.allowFrame })
      await options.audit({ action: 'granted', cardId: input.cardId, grantId: current.id, targetFingerprint: target.fingerprint, origins: current.origins })
      if (token !== sequence || current !== grant || current.controller.signal.aborted || input.cardId !== options.ownerId())
        throw new Error('AUTHORIZED_BROWSER_INSPECTION_SUPERSEDED')
      current.active = true
      inspection = null
      return state()
    }
    catch (error) { await stop(current, 'AUTHORIZED_BROWSER_CONNECT_FAILED'); throw error }
  }
  async function run(name: string, signal: AbortSignal | undefined, task: (current: BrowserGrant, signal: AbortSignal, dispatched: () => Promise<void>) => Promise<Record<string, unknown>>) {
    signal?.throwIfAborted()
    const current = grant
    if (operation)
      return failure(name, 'AUTHORIZED_BROWSER_BUSY')
    if (mode !== 'authorized' || !current?.active || current.cardId !== options.ownerId())
      return failure(name, 'AUTHORIZED_BROWSER_GRANT_REQUIRED')
    const combined = AbortSignal.any([current.controller.signal, AbortSignal.timeout(90000), ...(signal ? [signal] : [])])
    current.operationEpoch = current.connection!.documentEpoch()
    let dispatched = false
    const pending = (async () => {
      try {
        assertGrant(current)
        const result = await task(current, combined, async () => {
          combined.throwIfAborted()
          await assertActionDispatchCurrent(false)
          assertGrant(current)
          dispatched = true
        })
        return result.status === 'completed' ? { ...result, ok: true, finalStatus: 'completed', channel: 'browser', browser: 'authorized-page', operation: name, grantId: current.id } : result
      }
      catch (error) {
        if (signal?.aborted)
          throw error
        const message = errorMessageFrom(error) ?? ''
        return failure(name, message.match(/^(?:AUTHORIZED_BROWSER|LOCAL_BROWSER)_[A-Z_]+/u)?.[0] ?? 'AUTHORIZED_BROWSER_OPERATION_FAILED', dispatched)
      }
    })()
    operation = pending
    try { return await pending }
    finally { if (operation === pending) { operation = null; current.operationEpoch = null } }
  }
  async function observe(current: BrowserGrant, maximum = 12000) {
    assertGrant(current)
    const result = await current.cdp!.observe<BrowserPageObservation>(maximum, false)
    assertGrant(current)
    return result
  }
  function readPage(input: AlicizationLocalBrowserReadPageInput) {
    return run('browser_read_page', input.abortSignal, async (current) => {
      if (input.format === 'html')
        return failure('browser_read_page', 'AUTHORIZED_BROWSER_VISIBLE_CONTENT_ONLY')
      const page = await observe(current, Math.max(200, Math.min(24000, Number(input.maxChars) || 12000)))
      const refs = new Map<string, BrowserPageElement>()
      const elements = page.elements.map((element) => {
        const { formState, formPreview: _formPreview, contextId: _contextId, sessionId: _sessionId, backendNodeId: _backendNodeId, documentId: _documentId, href, frameUrl, formAction, ...publicElement } = element
        const ref = `element:${randomUUID()}`
        refs.set(ref, element)
        return { ...publicElement, id: `control:${executionDigest({ grantId: current.id, frameId: element.frameId, documentId: element.documentId, backendNodeId: element.backendNodeId })}`, selector: ref, elementRef: ref, href: href ? safeUrl(href) : null, frameUrl: frameUrl ? safeUrl(frameUrl) : null, formAction: formAction ? safeUrl(formAction) : null, formStateHash: formState == null ? null : executionDigest(formState) }
      })
      observation = { id: randomUUID(), grantId: current.id, page, refs }
      return { status: 'completed', url: safeUrl(page.url), title: page.title, text: page.text, content: input.format === 'interactables' ? JSON.stringify(elements) : page.text, elements, observationId: observation.id, windowVisible: false, executionScope: 'explicit-selected-page-and-origins', transfers: [], downloadScope: 'external-browser-not-independently-verified' }
    })
  }
  async function target(current: BrowserGrant, selector?: string, text?: string, exact?: boolean, ordinal?: number) {
    const old = observation
    if (!old || old.grantId !== current.id)
      throw new Error('LOCAL_BROWSER_OBSERVATION_REQUIRED')
    const ref = selector ? old.refs.get(selector) : null
    if (selector && !ref)
      throw new Error('LOCAL_BROWSER_STALE_REFERENCE')
    const candidates = old.page.elements.filter(element => selector ? element === ref : !text || (exact ? element.text === text : element.text.includes(text)))
    const element = ordinal === undefined ? candidates.length === 1 ? candidates[0] : undefined : candidates[ordinal - 1]
    if (!element)
      throw new Error('LOCAL_BROWSER_AMBIGUOUS_TARGET')
    const page = await observe(current)
    const actual = page.elements.find(item => item.backendNodeId === element.backendNodeId && item.documentId === element.documentId && item.frameId === element.frameId)
    if (!actual || page.url !== old.page.url || executionDigest(actual) !== executionDigest(element))
      throw new Error('LOCAL_BROWSER_STALE_TARGET')
    return { old, element }
  }
  function mutate(kind: 'click' | 'type', input: AlicizationLocalBrowserClickElementInput | AlicizationLocalBrowserTypeTextInput) {
    const { abortSignal, ...parameters } = input
    input = { ...structuredClone(parameters), abortSignal }
    const name = kind === 'click' ? 'browser_click_element' : 'browser_type_text'
    return run(name, input.abortSignal, async (current, signal, dispatched) => {
      const typed = input as AlicizationLocalBrowserTypeTextInput
      if (kind === 'type' && (!typed.text || typed.text.length > 16000))
        return failure(name, 'LOCAL_BROWSER_INPUT_BUDGET')
      const { old, element } = await target(current, input.selector, kind === 'type' ? typed.targetText : (input as AlicizationLocalBrowserClickElementInput).text, input.exactText, input.ordinal)
      const destination = new URL(element.formAction || element.href || element.frameUrl || old.page.url)
      if (!current.origins.includes(destination.origin))
        return failure(name, 'AUTHORIZED_BROWSER_ORIGIN_NOT_GRANTED')
      if (element.password || element.sensitiveForm)
        return failure(name, 'AUTHORIZED_BROWSER_SECRET_HANDOFF_REQUIRED')
      if ((element.submitControl || typed.submit === true) && element.formPreview == null)
        return failure(name, 'LOCAL_BROWSER_FORM_VERIFICATION_BUDGET')
      const label = `${element.text} ${element.visibleText ?? ''}`.trim()
      // In a logged-in page even an ordinary edit may auto-save or transmit.
      // Explicit tab access never substitutes for this effect/content review.
      const risk = classifyLifeInterfaceRisk({ operation: name, label, unknownExternalEffect: true, externalSubmit: element.submitControl || typed.submit === true })
      if (risk) {
        const approval = await options.authorize?.({ cardId: current.cardId, operation: name, targetId: safeUrl(destination.href), label, ...(kind === 'type' ? { previewText: typed.text } : element.formPreview != null ? { previewText: element.formPreview } : {}), effectDigest: executionDigest({ kind, element, text: kind === 'type' ? typed.text : null, submit: typed.submit === true }), targetFingerprint: executionDigest({ grantId: current.id, observationId: old.id, element }), ...risk }, signal)
        if (!approval?.allow)
          return failure(name, 'ALICIZATION_TOOL_DENIED_BY_HOST')
      }
      await target(current, input.selector, kind === 'type' ? typed.targetText : (input as AlicizationLocalBrowserClickElementInput).text, input.exactText, input.ordinal)
      await dispatched()
      try {
        const result = await current.cdp!.mutate(element, { operation: kind, ...(kind === 'type' ? { text: typed.text, clear: typed.clearExisting === true, submit: typed.submit === true } : {}) }, () => { signal.throwIfAborted(); assertGrant(current) })
        return result.ok ? { ...result, status: 'completed', requiresReadback: true, serverReceiptVerified: false } : failure(name, result.errorCode ?? 'LOCAL_BROWSER_OPERATION_FAILED')
      }
      finally { observation = null }
    })
  }
  function openUrl(input: AlicizationLocalBrowserOpenUrlInput) {
    return run('browser_open_url', input.abortSignal, async (current, _signal, dispatched) => {
      const url = input.url
      if (!url || !current.origins.includes(authorizedBrowserOrigin(url)))
        return failure('browser_open_url', 'AUTHORIZED_BROWSER_ORIGIN_NOT_GRANTED')
      await dispatched()
      await current.connection!.debuggerPort.sendCommand('Page.navigate', { url })
      return { status: 'completed', requiresReadback: true }
    })
  }
  function navigateBrowser(input: AlicizationLocalBrowserNavigateInput) {
    return run('browser_navigate', input.abortSignal, async (current, _signal, dispatched) => {
      if (input.action === 'reload') {
        await dispatched()
        await current.connection!.debuggerPort.sendCommand('Page.reload')
      }
      else {
        const history = await current.connection!.debuggerPort.sendCommand('Page.getNavigationHistory') as { currentIndex: number, entries: Array<{ id: number, url: string }> }
        const entry = history.entries[history.currentIndex + (input.action === 'back' ? -1 : input.action === 'forward' ? 1 : Number.NaN)]
        if (!entry || !current.origins.includes(authorizedBrowserOrigin(entry.url)))
          return failure('browser_navigate', 'AUTHORIZED_BROWSER_NAVIGATION_NOT_GRANTED')
        await dispatched()
        await current.connection!.debuggerPort.sendCommand('Page.navigateToHistoryEntry', { entryId: entry.id })
      }
      return { status: 'completed', requiresReadback: true }
    })
  }
  function scrollBrowser(input: AlicizationLocalBrowserScrollInput) {
    return run('browser_scroll', input.abortSignal, async (current, _signal, dispatched) => {
      if (!['up', 'down', 'top', 'bottom'].includes(input.action))
        return failure('browser_scroll', 'LOCAL_BROWSER_INVALID_SCROLL')
      await dispatched()
      await current.cdp!.scroll(input.action as 'up' | 'down' | 'top' | 'bottom', Math.max(1, Math.min(4000, Number(input.amount) || 600)))
      observation = null
      return { status: 'completed', requiresReadback: true }
    })
  }
  function waitForBrowser(input: AlicizationLocalBrowserWaitInput) {
    return run('browser_wait', input.abortSignal, async (current, signal) => {
      const deadline = Date.now() + Math.max(100, Math.min(15000, Number(input.timeoutMs) || 5000))
      while (Date.now() < deadline) {
        const page = await observe(current)
        if ((input.state === 'interactive' ? page.readyState !== 'loading' : page.readyState === 'complete') && (!input.text || page.text.includes(input.text)) && (!input.urlIncludes || safeUrl(page.url).includes(input.urlIncludes)))
          return { status: 'completed', url: safeUrl(page.url), title: page.title }
        await delay(100, undefined, { signal })
      }
      return failure('browser_wait', 'LOCAL_BROWSER_WAIT_TIMEOUT')
    })
  }
  function uploadBrowserFiles(input: AlicizationLocalBrowserUploadFilesInput) {
    return run('browser_upload_files', input.abortSignal, async (current, signal, dispatched) => {
      const { old, element } = await target(current, input.selector)
      if (element.type !== 'file' || !element.multiple && input.files.length > 1)
        return failure('browser_upload_files', 'LOCAL_BROWSER_FILE_TARGET_REQUIRED')
      if (!current.origins.includes(authorizedBrowserOrigin(element.formAction || element.frameUrl || old.page.url)) || element.sensitiveForm)
        return failure('browser_upload_files', 'AUTHORIZED_BROWSER_SECRET_HANDOFF_REQUIRED')
      if (retiredUploads.size >= 16 || current.uploads.size >= 8)
        return failure('browser_upload_files', 'AUTHORIZED_BROWSER_UPLOAD_SNAPSHOT_BUDGET')
      const snapshot = await prepareBrowserUpload(input.files, join(options.uploadRoot, current.id), signal)
      current.uploads.add(snapshot)
      const approval = await options.authorize?.({ cardId: current.cardId, operation: 'browser_upload_files', targetId: safeUrl(element.formAction || element.frameUrl || old.page.url), label: snapshot.files.map(file => `${file.original} (${file.bytes} bytes)`).join('\n'), previewText: snapshot.files.map(file => `${file.original}\n${file.bytes} bytes\nSHA-256 ${file.sha256}`).join('\n\n'), effectDigest: executionDigest(snapshot.files.map(({ original, bytes, sha256 }) => ({ original, bytes, sha256 }))), targetFingerprint: executionDigest({ grantId: current.id, observationId: old.id, element }), riskLevel: 'danger', actionCategory: 'network', reason: 'Selecting these exact snapshots may transmit their contents. Tab access does not authorize an upload or prove service receipt.' }, signal)
      if (!approval?.allow) {
        await snapshot.dispose()
        current.uploads.delete(snapshot)
        return failure('browser_upload_files', 'ALICIZATION_TOOL_DENIED_BY_HOST')
      }
      await target(current, input.selector)
      await dispatched()
      try {
        const result = await current.cdp!.mutate(element, { operation: 'upload', files: snapshot.files.map(file => file.path) }, () => { signal.throwIfAborted(); assertGrant(current) })
        return result.ok ? { status: 'completed', files: snapshot.files.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 })), selectionId: snapshot.id, serverReceiptVerified: false, requiresReadback: true } : failure('browser_upload_files', result.errorCode ?? 'LOCAL_BROWSER_FILE_SELECTION_FAILED')
      }
      finally { observation = null }
    })
  }
  const getHealth = async () => {
    let ready = false
    try { if (mode === 'authorized' && grant) { assertGrant(grant); ready = true } }
    catch { /* A stale session cannot advertise a replacement grant as ready. */ }
    return { available: true, ready: ready && !operation, reason: ready ? operation ? 'authorized-browser-busy' : null : 'authorized-browser-grant-required', observedAt: Date.now() }
  }
  function captureSession() {
    const captured = sessions.getStore() ?? { mode, grantId: mode === 'authorized' ? grant?.id ?? null : null, cardId: options.ownerId() }
    return <T>(task: () => Promise<T>): Promise<T> => sessions.run(captured, task)
  }
  function binding(): BrowserWorkBinding | null {
    const captured = sessions.getStore()
    if ((captured?.mode ?? mode) === 'managed')
      return { kind: 'managed', id: managedInstance }
    const id = captured ? captured.grantId : grant?.id
    return id ? { kind: 'authorized-page', id } : null
  }
  function isBindingCurrent(expected: BrowserWorkBinding | undefined) {
    if (!expected)
      return false
    const captured = binding()
    if (!captured || captured.kind !== expected.kind || captured.id !== expected.id)
      return false
    return expected.kind === 'managed'
      ? mode === 'managed' && expected.id === managedInstance
      : mode === 'authorized' && grant?.active === true && grant.id === expected.id && grant.cardId === options.ownerId()
  }
  const withSession = <T>(task: () => Promise<T>): Promise<T> => captureSession()(task)
  return { command, state, binding, isBindingCurrent, withSession, captureSession, selected: () => mode === 'authorized' || sessions.getStore()?.mode === 'authorized', openUrl, readPage, clickElement: (input: AlicizationLocalBrowserClickElementInput) => mutate('click', input), typeBrowserText: (input: AlicizationLocalBrowserTypeTextInput) => mutate('type', input), navigateBrowser, scrollBrowser, waitForBrowser, uploadBrowserFiles, getHealth, close: async () => { await stopped(); await cleanUploads(); return { pendingUploads: retiredUploads.size } } }
}
