import type { BrowserWindow as ElectronBrowserWindow } from 'electron'

import type { LifeInterfaceAuthorization, LifeInterfaceRiskRequest } from './life-interface-risk'
import type { AlicizationLocalBrowserClickElementInput, AlicizationLocalBrowserNavigateInput, AlicizationLocalBrowserOpenUrlInput, AlicizationLocalBrowserReadPageInput, AlicizationLocalBrowserScrollInput, AlicizationLocalBrowserTypeTextInput, AlicizationLocalBrowserWaitInput } from './local-browser-automation'

import { createHash, randomUUID } from 'node:crypto'
import { env } from 'node:process'

import { errorMessageFrom } from '@moeru/std'
import { BrowserWindow } from 'electron'

import browserPageSource from './life-windows-browser-page.js?raw'

import { classifyLifeInterfaceRisk } from './life-interface-risk'

const browserPageScript = browserPageSource.replace(/^export /gmu, '')

interface PageElement { selector: string, text: string, tag: string, type: string, href: string | null, disabled: boolean, visibleText?: string, password?: boolean, formAction?: string | null, formMethod?: string | null, submitControl?: boolean }
interface PageObservation { url: string, title: string, readyState: string, text: string, html?: string, elements: PageElement[] }

export function createLifeWindowsBrowserRuntime(options: { createWindow?: () => ElectronBrowserWindow, ownerId?: () => string, authorize?: (request: LifeInterfaceRiskRequest, signal?: AbortSignal) => Promise<LifeInterfaceAuthorization> } = {}) {
  let window: ElectronBrowserWindow | null = null
  let observation: PageObservation | null = null
  let observationId: string | null = null
  let generation = 0
  let busy = false
  let owner = options.ownerId?.() ?? 'default'
  const failure = (operation: string, errorCode: string, errorMessage: string) => ({ channel: 'browser', browser: 'alicization-managed', operation, status: 'failed', errorCode, errorMessage, sideEffectState: 'none' })
  function getWindow() {
    const nextOwner = options.ownerId?.() ?? 'default'
    if (nextOwner !== owner) {
      close()
      owner = nextOwner
    }
    if (window && !window.isDestroyed())
      return window
    const partition = `persist:alicization-browser-${createHash('sha256').update(owner).digest('hex')}`
    window = options.createWindow?.() ?? new BrowserWindow({ width: 1100, height: 760, show: false, title: 'Alicization Browser', webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, autoplayPolicy: 'document-user-activation-required', partition } })
    const owned = window
    owned.webContents.setAudioMuted(Boolean(env.LIFE_QA_PRIVATE_DESKTOP))
    owned.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    owned.webContents.session.setPermissionCheckHandler(() => false)
    owned.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    owned.webContents.on('will-navigate', (event, target) => {
      if (!/^https?:/iu.test(target) && target !== 'about:blank')
        event.preventDefault()
    })
    owned.webContents.on('did-start-navigation', (_event, _url, _inPlace, mainFrame) => {
      if (mainFrame) {
        generation += 1
        observation = null
        observationId = null
      }
    })
    owned.on('closed', () => {
      if (window === owned) {
        window = null
        observation = null
        observationId = null
        generation += 1
      }
    })
    return owned
  }
  async function run(operation: string, signal: AbortSignal | undefined, task: (owned: ElectronBrowserWindow, armDeadline: (ms: number) => void) => Promise<Record<string, unknown>>) {
    signal?.throwIfAborted()
    if (busy)
      return failure(operation, 'LOCAL_BROWSER_BUSY', 'The current browser operation must settle before another one starts.')
    busy = true
    try {
      const owned = getWindow()
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
        outcome = await Promise.race([
          task(owned, armDeadline),
          new Promise<never>((_resolve, reject) => {
            cancel = () => { owned.webContents.stop(); reject(signal?.reason ?? new Error('Browser operation interrupted')) }
            signal?.addEventListener('abort', cancel, { once: true })
            expire = () => { close(); reject(new Error('Managed browser operation exceeded its deadline')) }
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
        close()
        return failure(operation, 'LOCAL_BROWSER_OWNER_CHANGED', 'The browser owner changed while the operation was running; its result needs a fresh observation.')
      }
      return outcome.status === 'completed' ? { ...outcome, ok: true, finalStatus: 'completed' } : outcome
    }
    catch (error) {
      if (signal?.aborted)
        throw error
      return { ...failure(operation, 'LOCAL_BROWSER_OPERATION_FAILED', errorMessageFrom(error) || 'Managed browser operation failed.'), ...(['browser_click_element', 'browser_type_text'].includes(operation) ? { effectMayHaveOccurred: true, requiresVerification: true, sideEffectState: 'unknown' } : {}) }
    }
    finally { busy = false }
  }
  async function page(owned: ElectronBrowserWindow, maximum: number, html = false) {
    return await owned.webContents.executeJavaScript(`(() => { ${browserPageScript}; return observePage(${maximum},${html}); })()`) as PageObservation
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
      try { await owned.loadURL(url.href) }
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
      return { channel: 'browser', browser: 'alicization-managed', operation: 'browser_read_page', status: 'completed', ...observation, observationId, format: input.format || 'text', content: input.format === 'interactables' ? JSON.stringify(observation.elements) : input.format === 'html' ? observation.html : observation.text, executionScope: 'owned-window-only' }
    })
  }
  async function mutate(operation: 'click' | 'type', input: AlicizationLocalBrowserClickElementInput | AlicizationLocalBrowserTypeTextInput) {
    const name = operation === 'click' ? 'browser_click_element' : 'browser_type_text'
    return run(name, input.abortSignal, async (owned, armDeadline) => {
      if (!observation || !observationId || owned.webContents.getURL() !== observation.url)
        return failure(name, 'LOCAL_BROWSER_OBSERVATION_REQUIRED', 'Read the current page before changing it.')
      const old = observation
      const capturedOwner = owner
      const currentGeneration = generation
      const targetText = 'targetText' in input ? input.targetText : 'text' in input && operation === 'click' ? input.text : undefined
      const candidates = old.elements.filter(element => input.selector ? element.selector === input.selector : !targetText || (input.exactText ? element.text === targetText : element.text.includes(targetText)))
      const target = input.ordinal !== undefined ? candidates[input.ordinal - 1] : candidates.length === 1 ? candidates[0] : undefined
      if (!target)
        return failure(name, 'LOCAL_BROWSER_AMBIGUOUS_TARGET', 'Choose one observed selector or ordinal; ambiguous targets are not clicked.')
      input.abortSignal?.throwIfAborted()
      const current = await page(owned, 200)
      const actual = current.elements.find(element => element.selector === target.selector)
      if (generation !== currentGeneration || current.url !== old.url || !actual || JSON.stringify(actual) !== JSON.stringify(target))
        return failure(name, 'LOCAL_BROWSER_STALE_TARGET', 'The observed target changed; read the page and replan.')
      input.abortSignal?.throwIfAborted()
      const typed = input as AlicizationLocalBrowserTypeTextInput
      if (operation === 'type' && (!typed.text || typed.text.length > 16_000))
        return failure(name, 'LOCAL_BROWSER_INPUT_BUDGET', 'Input text must contain at most 16000 characters.')
      const destination = new URL(target.formAction || old.url)
      const externalSubmit = !['localhost', '127.0.0.1', '[::1]'].includes(destination.hostname) && ((operation === 'type' && typed.submit === true) || (operation === 'click' && target.submitControl === true))
      const label = `${target.text} ${target.visibleText || ''}`.trim()
      const risk = classifyLifeInterfaceRisk({ operation: name, label, password: operation === 'type' && target.password, externalSubmit })
      if (risk) {
        armDeadline(80_000)
        const decision = await options.authorize?.({ cardId: owner, operation: name, targetId: old.url, label, ...risk }, input.abortSignal)
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
      const result = await owned.webContents.executeJavaScript(`(() => { ${browserPageScript}; return mutatePage(${JSON.stringify({ operation, selector: target.selector, expected: target, ...(operation === 'type' ? { text: typed.text, clear: typed.clearExisting === true, submit: typed.submit === true } : {}) })}); })()`)
      observation = null
      observationId = null
      // Cancellation after dispatch never fabricates a rollback or replays input.
      input.abortSignal?.throwIfAborted()
      return result.ok ? { channel: 'browser', browser: 'alicization-managed', operation: name, status: 'completed', ...result, requiresReadback: true } : failure(name, result.errorCode, 'The actual page rejected the operation; re-observe before retrying.')
    })
  }
  async function navigate(input: AlicizationLocalBrowserNavigateInput) {
    return run('browser_navigate', input.abortSignal, async (owned) => {
      input.abortSignal?.throwIfAborted()
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
  async function scroll(input: AlicizationLocalBrowserScrollInput) {
    return run('browser_scroll', input.abortSignal, async (owned) => {
      if (!['top', 'bottom', 'up', 'down'].includes(input.action))
        return failure('browser_scroll', 'LOCAL_BROWSER_INVALID_SCROLL', 'Unknown scroll direction.')
      const amount = Math.max(1, Math.min(4000, Number(input.amount) || 600))
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
    window?.destroy()
    window = null
    observation = null
    observationId = null
  }
  return { openUrl, readPage, clickElement: (input: AlicizationLocalBrowserClickElementInput) => mutate('click', input), typeBrowserText: (input: AlicizationLocalBrowserTypeTextInput) => mutate('type', input), navigateBrowser: navigate, scrollBrowser: scroll, waitForBrowser: wait, close }
}
