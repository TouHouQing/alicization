import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { platform } from 'node:process'

import { shell } from 'electron'

import { resolveAlicizationKnownWebsiteBySite } from './local-known-websites'

export type AlicizationLocalBrowser = 'default' | 'chrome' | 'safari'
export type AlicizationLocalSearchEngine = 'baidu' | 'bing' | 'duckduckgo' | 'google'
export type AlicizationLocalBrowserReadFormat = 'html' | 'interactables' | 'text'
export type AlicizationLocalBrowserClickTargetType = 'button' | 'element' | 'link'
export type AlicizationLocalBrowserNavigateAction = 'back' | 'forward' | 'reload'
export type AlicizationLocalBrowserScrollAction = 'down' | 'up' | 'top' | 'bottom'
export type AlicizationLocalBrowserWaitState = 'complete' | 'interactive'

export interface AlicizationLocalBrowserOpenUrlInput {
  abortSignal?: AbortSignal
  autoContinueSuggestedActions?: boolean
  browser?: string
  expectedPhase?: string
  inspectionMaxSuggestedActions?: number
  inspectionQuestion?: string
  maxAutoContinueSteps?: number
  reinspectAfterAction?: boolean
  site?: string
  url?: string
}

export interface AlicizationLocalBrowserSearchWebInput {
  abortSignal?: AbortSignal
  autoContinueSuggestedActions?: boolean
  browser?: string
  expectedPhase?: string
  inspectionMaxSuggestedActions?: number
  inspectionQuestion?: string
  maxAutoContinueSteps?: number
  query: string
  reinspectAfterAction?: boolean
  searchEngine?: string
}

export interface AlicizationLocalBrowserReadPageInput {
  abortSignal?: AbortSignal
  browser?: string
  format?: string
  maxChars?: number
}

export interface AlicizationLocalBrowserClickElementInput {
  abortSignal?: AbortSignal
  autoContinueSuggestedActions?: boolean
  browser?: string
  exactText?: boolean
  expectedPhase?: string
  inspectionMaxSuggestedActions?: number
  inspectionQuestion?: string
  maxAutoContinueSteps?: number
  ordinal?: number
  reinspectAfterAction?: boolean
  selector?: string
  targetType?: string
  text?: string
}

export interface AlicizationLocalBrowserTypeTextInput {
  abortSignal?: AbortSignal
  autoContinueSuggestedActions?: boolean
  browser?: string
  clearExisting?: boolean
  exactText?: boolean
  expectedPhase?: string
  inspectionMaxSuggestedActions?: number
  inspectionQuestion?: string
  maxAutoContinueSteps?: number
  ordinal?: number
  reinspectAfterAction?: boolean
  selector?: string
  submit?: boolean
  targetText?: string
  text: string
}

export interface AlicizationLocalBrowserNavigateInput {
  abortSignal?: AbortSignal
  action: string
  autoContinueSuggestedActions?: boolean
  browser?: string
  expectedPhase?: string
  inspectionMaxSuggestedActions?: number
  inspectionQuestion?: string
  maxAutoContinueSteps?: number
  reinspectAfterAction?: boolean
}

export interface AlicizationLocalBrowserScrollInput {
  abortSignal?: AbortSignal
  action: string
  amount?: number
  autoContinueSuggestedActions?: boolean
  browser?: string
  expectedPhase?: string
  inspectionMaxSuggestedActions?: number
  inspectionQuestion?: string
  maxAutoContinueSteps?: number
  reinspectAfterAction?: boolean
}

export interface AlicizationLocalBrowserWaitInput {
  abortSignal?: AbortSignal
  autoContinueSuggestedActions?: boolean
  browser?: string
  expectedPhase?: string
  inspectionMaxSuggestedActions?: number
  inspectionQuestion?: string
  maxAutoContinueSteps?: number
  reinspectAfterAction?: boolean
  state?: string
  text?: string
  timeoutMs?: number
  urlIncludes?: string
}

export interface AlicizationLocalDesktopListInteractablesInput {
  abortSignal?: AbortSignal
  maxItems?: number
  role?: string
}

export interface AlicizationLocalDesktopClickElementInput {
  abortSignal?: AbortSignal
  autoContinueSuggestedActions?: boolean
  exactText?: boolean
  expectedPhase?: string
  inspectionMaxSuggestedActions?: number
  inspectionQuestion?: string
  maxAutoContinueSteps?: number
  ordinal?: number
  reinspectAfterAction?: boolean
  role?: string
  text?: string
}

export interface AlicizationLocalDesktopTypeTextInput {
  abortSignal?: AbortSignal
  autoContinueSuggestedActions?: boolean
  clearExisting?: boolean
  exactText?: boolean
  expectedPhase?: string
  inspectionMaxSuggestedActions?: number
  inspectionQuestion?: string
  maxAutoContinueSteps?: number
  ordinal?: number
  reinspectAfterAction?: boolean
  role?: string
  submit?: boolean
  targetText?: string
  text: string
}

export interface AlicizationLocalDesktopPressKeysInput {
  abortSignal?: AbortSignal
  autoContinueSuggestedActions?: boolean
  expectedPhase?: string
  inspectionMaxSuggestedActions?: number
  inspectionQuestion?: string
  maxAutoContinueSteps?: number
  repeat?: number
  reinspectAfterAction?: boolean
  shortcut?: string
}

export interface AlicizationLocalDesktopOpenApplicationInput {
  abortSignal?: AbortSignal
  appName?: string
  args?: string[]
  autoContinueSuggestedActions?: boolean
  expectedPhase?: string
  inspectionMaxSuggestedActions?: number
  inspectionQuestion?: string
  maxAutoContinueSteps?: number
  path?: string
  reinspectAfterAction?: boolean
}

export interface AlicizationLocalDesktopWaitInput {
  abortSignal?: AbortSignal
  appName?: string
  timeoutMs?: number
  titleIncludes?: string
}

type AlicizationLocalAutomationResult = Record<string, unknown>
type AlicizationSupportedBrowser = Exclude<AlicizationLocalBrowser, 'default'>

interface AlicizationLocalBrowserAutomationServiceOptions {
  errorMessageFrom: (error: unknown) => string | null | undefined
}

const localBrowserCapabilityChannels = ['browser', 'software', 'desktop'] as const
const defaultCommandTimeoutMs = 8_000
const defaultBrowserWaitTimeoutMs = 5_000
const defaultDesktopWaitTimeoutMs = 5_000
const defaultReadPageMaxChars = 24_000
const defaultDesktopInteractableMaxItems = 20
const desktopSpecialKeyCodeMap: Record<string, number> = {
  backspace: 51,
  delete: 51,
  down: 125,
  enter: 36,
  esc: 53,
  escape: 53,
  left: 123,
  return: 36,
  right: 124,
  space: 49,
  tab: 48,
  up: 126,
}

const browserReadPageScrollStateScript = [
  'const offsetY = window.scrollY || window.pageYOffset || 0;',
  'const viewportHeight = window.innerHeight || 0;',
  'const documentHeight = Math.max(',
  '  document.documentElement?.scrollHeight ?? 0,',
  '  document.body?.scrollHeight ?? 0,',
  ');',
  'const canScrollDown = offsetY + viewportHeight < documentHeight - 24;',
  'const canScrollUp = offsetY > 0;',
].join('')

function createLocalAutomationAbortError(abortSignal?: AbortSignal) {
  const reason = abortSignal?.reason
  if (reason instanceof Error)
    return reason
  const error = new Error('Local automation was cancelled.')
  error.name = 'AbortError'
  return error
}

function throwIfLocalAutomationAborted(abortSignal?: AbortSignal) {
  if (abortSignal?.aborted)
    throw createLocalAutomationAbortError(abortSignal)
}

async function waitForLocalAutomationDelay(
  timeoutMs: number,
  abortSignal?: AbortSignal,
) {
  throwIfLocalAutomationAborted(abortSignal)
  await new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = (operation: () => void) => {
      if (settled)
        return
      settled = true
      clearTimeout(timer)
      abortSignal?.removeEventListener('abort', onAbort)
      operation()
    }
    const onAbort = () => finish(() => reject(createLocalAutomationAbortError(abortSignal)))
    const timer = setTimeout(() => finish(resolve), timeoutMs)
    timer.unref?.()
    abortSignal?.addEventListener('abort', onAbort, { once: true })
    if (abortSignal?.aborted)
      onAbort()
  })
}

function sanitizeText(raw: unknown) {
  return typeof raw === 'string' ? raw.trim() : ''
}

function normalizeBrowser(raw: unknown): AlicizationLocalBrowser {
  return raw === 'chrome' || raw === 'safari' ? raw : 'default'
}

function normalizeSearchEngine(raw: unknown): AlicizationLocalSearchEngine {
  return raw === 'baidu' || raw === 'bing' || raw === 'duckduckgo' ? raw : 'google'
}

function normalizeReadFormat(raw: unknown): AlicizationLocalBrowserReadFormat {
  if (raw === 'interactables')
    return 'interactables'
  return raw === 'html' ? 'html' : 'text'
}

function normalizeMaxChars(raw: unknown) {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return defaultReadPageMaxChars
  return Math.max(256, Math.min(defaultReadPageMaxChars, Math.floor(raw)))
}

function normalizeOrdinal(raw: unknown) {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return null
  const normalized = Math.floor(raw)
  return normalized >= 1 ? normalized : null
}

function normalizeClickTargetType(raw: unknown): AlicizationLocalBrowserClickTargetType | null {
  return raw === 'button' || raw === 'element' || raw === 'link'
    ? raw
    : null
}

function normalizeBrowserNavigateAction(raw: unknown): AlicizationLocalBrowserNavigateAction | null {
  const normalized = sanitizeText(raw).toLowerCase()
  if (normalized === 'refresh')
    return 'reload'
  return normalized === 'back' || normalized === 'forward' || normalized === 'reload'
    ? normalized
    : null
}

function normalizeBrowserScrollAction(raw: unknown): AlicizationLocalBrowserScrollAction | null {
  const normalized = sanitizeText(raw).toLowerCase()
  return normalized === 'down' || normalized === 'up' || normalized === 'top' || normalized === 'bottom'
    ? normalized
    : null
}

function normalizeBrowserScrollAmount(raw: unknown) {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return 1
  return Math.max(1, Math.min(10, Math.floor(raw)))
}

function normalizeBrowserWaitState(raw: unknown): AlicizationLocalBrowserWaitState {
  return sanitizeText(raw).toLowerCase() === 'interactive'
    ? 'interactive'
    : 'complete'
}

function normalizeBrowserWaitTimeoutMs(raw: unknown) {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return defaultBrowserWaitTimeoutMs
  return Math.max(100, Math.min(15_000, Math.floor(raw)))
}

function normalizeDesktopWaitTimeoutMs(raw: unknown) {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return defaultDesktopWaitTimeoutMs
  return Math.max(100, Math.min(15_000, Math.floor(raw)))
}

function normalizeDesktopRole(raw: unknown) {
  const normalized = sanitizeText(raw).toLowerCase()
  if (!normalized)
    return ''
  if (normalized === 'field' || normalized === 'input-field' || normalized === 'search' || normalized === 'search-field' || normalized === 'text-field' || normalized === 'textfield')
    return 'input'
  if (
    normalized === 'dropdown'
    || normalized === 'menu-button'
    || normalized === 'menubutton'
    || normalized === 'pop-up-button'
    || normalized === 'popup-button'
    || normalized === 'popupbutton'
    || normalized === 'select'
    || normalized === 'selector'
  ) {
    return 'select'
  }
  if (
    normalized === 'listitem'
    || normalized === 'list-item'
    || normalized === 'outline-row'
    || normalized === 'outlinerow'
    || normalized === 'row'
    || normalized === 'sidebar-item'
    || normalized === 'sidebaritem'
    || normalized === 'tree-item'
    || normalized === 'treeitem'
  ) {
    return 'list-item'
  }
  if (normalized === 'menuitem')
    return 'menu-item'
  if (normalized === 'radio-button' || normalized === 'radiobutton')
    return 'radio'
  if (normalized === 'tabitem' || normalized === 'tab-button' || normalized === 'tabbutton')
    return 'tab'
  return normalized
}

function normalizeDesktopMaxItems(raw: unknown) {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return defaultDesktopInteractableMaxItems
  return Math.max(1, Math.min(40, Math.floor(raw)))
}

function normalizeDesktopRepeat(raw: unknown) {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return 1
  return Math.max(1, Math.min(10, Math.floor(raw)))
}

function normalizeDesktopShortcut(raw: unknown) {
  return sanitizeText(raw)
    .toLowerCase()
    .replaceAll('⌘', 'command')
    .replaceAll('⌥', 'option')
    .replaceAll('⌃', 'control')
    .replace(/\bcmd\b/gu, 'command')
    .replace(/\bctrl\b/gu, 'control')
    .replace(/\balt\b/gu, 'option')
    .replace(/\s*\+\s*/gu, '+')
    .replace(/\s+/gu, '')
}

function parseDesktopShortcut(shortcut: string) {
  const modifierOrder = ['command', 'control', 'option', 'shift'] as const
  const modifiers = new Set<typeof modifierOrder[number]>()
  let key = ''
  for (const token of shortcut.split('+').map(value => value.trim()).filter(Boolean)) {
    if (token === 'command' || token === 'control' || token === 'option' || token === 'shift') {
      modifiers.add(token)
      continue
    }
    key = token
  }
  return {
    key,
    modifiers: modifierOrder.filter(modifier => modifiers.has(modifier)),
  }
}

function buildAppleScriptModifierClause(modifiers: string[]) {
  if (modifiers.length === 0)
    return ''
  return ` using {${modifiers.map(modifier => `${modifier} down`).join(', ')}}`
}

function truncateText(input: string, maxChars: number) {
  if (input.length <= maxChars) {
    return {
      content: input,
      truncated: false,
    }
  }
  return {
    content: input.slice(0, maxChars),
    truncated: true,
  }
}

function escapeAppleScriptString(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
}

function buildSearchUrl(query: string, searchEngine: AlicizationLocalSearchEngine) {
  const params = new URLSearchParams({ q: query })
  if (searchEngine === 'baidu') {
    const baiduParams = new URLSearchParams({ wd: query })
    return `https://www.baidu.com/s?${baiduParams.toString()}`
  }
  if (searchEngine === 'bing')
    return `https://www.bing.com/search?${params.toString()}`
  if (searchEngine === 'duckduckgo')
    return `https://duckduckgo.com/?${params.toString()}`
  return `https://www.google.com/search?${params.toString()}`
}

function getBrowserApplicationName(browser: AlicizationSupportedBrowser) {
  return browser === 'safari' ? 'Safari' : 'Google Chrome'
}

function mapFrontmostBrowser(appName: string): AlicizationSupportedBrowser | null {
  if (appName === 'Safari')
    return 'safari'
  if (appName === 'Google Chrome' || appName === 'Google Chrome Canary')
    return 'chrome'
  return null
}

function buildUnsupportedPlatformResult(operation: string) {
  return {
    status: 'failed',
    operation,
    errorCode: 'LOCAL_AUTOMATION_UNSUPPORTED_PLATFORM',
    errorMessage: 'Local browser and desktop automation currently only supports macOS.',
  } satisfies AlicizationLocalAutomationResult
}

function buildNotConfiguredResult(operation: string, message: string) {
  return {
    status: 'failed',
    operation,
    errorCode: 'LOCAL_AUTOMATION_NOT_READY',
    errorMessage: message,
  } satisfies AlicizationLocalAutomationResult
}

function summarizeBrowserName(browser: AlicizationLocalBrowser) {
  return browser === 'default'
    ? 'default browser'
    : browser
}

export function createAlicizationLocalBrowserAutomationService(
  options: AlicizationLocalBrowserAutomationServiceOptions,
) {
  async function runCommand(
    command: string,
    args: string[],
    timeoutMs = defaultCommandTimeoutMs,
    abortSignal?: AbortSignal,
  ) {
    throwIfLocalAutomationAborted(abortSignal)
    const boundedTimeout = Math.max(500, Math.floor(timeoutMs))
    return await new Promise<string>((resolve, reject) => {
      const child = execFile(command, args, {
        signal: abortSignal,
        timeout: boundedTimeout,
        windowsHide: true,
      }, (error, stdout, stderr) => {
        if (error) {
          reject(error)
          return
        }
        resolve([stdout, stderr].filter(Boolean).join('\n').trim())
      })
      child.on('error', reject)
    })
  }

  async function runAppleScript(
    lines: string[],
    timeoutMs = defaultCommandTimeoutMs,
    abortSignal?: AbortSignal,
  ) {
    return await runCommand(
      '/usr/bin/osascript',
      lines.flatMap(line => ['-e', line]),
      timeoutMs,
      abortSignal,
    )
  }

  async function runJavaScriptAutomation(
    lines: string[],
    timeoutMs = defaultCommandTimeoutMs,
    abortSignal?: AbortSignal,
  ) {
    return await runCommand(
      '/usr/bin/osascript',
      ['-l', 'JavaScript', ...lines.flatMap(line => ['-e', line])],
      timeoutMs,
      abortSignal,
    )
  }

  async function readFrontmostDesktopWindow(abortSignal?: AbortSignal) {
    const raw = await runJavaScriptAutomation([
      '(() => {',
      'const safeRead = (fn, fallback = null) => {',
      '  try {',
      '    const value = fn();',
      '    return value === undefined ? fallback : value;',
      '  }',
      '  catch (_error) {',
      '    return fallback;',
      '  }',
      '};',
      'const normalize = value => String(value ?? "").replace(/\\s+/g, " ").trim();',
      'const se = Application("System Events");',
      'const frontApp = safeRead(() => se.applicationProcesses.whose({ frontmost: true })[0], null);',
      'if (!frontApp) return JSON.stringify({ ok: false, code: "frontmost-app-not-found" });',
      'const frontWindow = safeRead(() => frontApp.windows[0], null);',
      'return JSON.stringify({',
      '  ok: true,',
      '  appName: normalize(safeRead(() => frontApp.name(), "")),',
      '  windowTitle: normalize(safeRead(() => frontWindow ? frontWindow.name() : "", "")),',
      '});',
      '})()',
    ], 5_000, abortSignal)

    return JSON.parse(raw) as {
      appName?: unknown
      code?: unknown
      ok?: unknown
      windowTitle?: unknown
    }
  }

  async function readFrontmostBrowser(abortSignal?: AbortSignal) {
    if (platform !== 'darwin')
      return null
    const appName = sanitizeText(await runAppleScript([
      'tell application "System Events" to return name of first application process whose frontmost is true',
    ], 3_000, abortSignal).catch(() => ''))
    return mapFrontmostBrowser(appName)
  }

  async function isBrowserRunning(browser: AlicizationSupportedBrowser, abortSignal?: AbortSignal) {
    const appName = getBrowserApplicationName(browser)
    const output = sanitizeText(await runAppleScript([
      `tell application "${appName}" to return running`,
    ], 3_000, abortSignal).catch(() => 'false'))
    return /\btrue\b/i.test(output)
  }

  async function resolveSupportedBrowser(
    rawBrowser: unknown,
    abortSignal?: AbortSignal,
  ): Promise<AlicizationSupportedBrowser> {
    const browser = normalizeBrowser(rawBrowser)
    if (browser === 'chrome' || browser === 'safari')
      return browser

    const frontmost = await readFrontmostBrowser(abortSignal)
    if (frontmost)
      return frontmost
    if (await isBrowserRunning('chrome', abortSignal))
      return 'chrome'
    if (await isBrowserRunning('safari', abortSignal))
      return 'safari'
    return 'chrome'
  }

  function normalizeBrowserToolResultBrowser(raw: unknown) {
    const browser = normalizeBrowser(raw)
    return browser === 'default' ? 'default' : browser
  }

  async function openUrl(input: AlicizationLocalBrowserOpenUrlInput) {
    const requestedSite = sanitizeText(input.site)
    const requestedUrl = sanitizeText(input.url)
    const resolvedSite = requestedSite
      ? resolveAlicizationKnownWebsiteBySite(requestedSite)
      : null
    const url = requestedUrl || resolvedSite?.url || 'about:blank'
    const browser = normalizeBrowserToolResultBrowser(input.browser)
    if (platform !== 'darwin')
      return buildUnsupportedPlatformResult('browser_open_url')

    try {
      throwIfLocalAutomationAborted(input.abortSignal)
      if (browser === 'default') {
        await shell.openExternal(url)
        throwIfLocalAutomationAborted(input.abortSignal)
        return {
          channel: 'browser',
          status: 'completed',
          operation: 'browser_open_url',
          browser,
          site: resolvedSite?.site ?? (requestedSite || null),
          url,
          goal: requestedUrl
            ? `Open URL ${url} in the local browser.`
            : resolvedSite
              ? `Open ${resolvedSite.label} in the local browser.`
              : 'Open the local browser.',
          summary: requestedUrl
            ? `Opened ${url} in ${summarizeBrowserName(browser)}.`
            : resolvedSite
              ? `Opened ${resolvedSite.label} in ${summarizeBrowserName(browser)}.`
              : `Opened ${summarizeBrowserName(browser)}.`,
          output: url,
        } satisfies AlicizationLocalAutomationResult
      }

      const openArgs = requestedUrl
        ? ['-a', getBrowserApplicationName(browser), url]
        : ['-a', getBrowserApplicationName(browser)]
      await runCommand('/usr/bin/open', openArgs, 8_000, input.abortSignal)
      return {
        channel: 'browser',
        status: 'completed',
        operation: 'browser_open_url',
        browser,
        site: resolvedSite?.site ?? (requestedSite || null),
        url,
        goal: requestedUrl
          ? `Open URL ${url} in the local browser.`
          : resolvedSite
            ? `Open ${resolvedSite.label} in the local browser.`
            : 'Open the local browser.',
        summary: requestedUrl
          ? `Opened ${url} in ${summarizeBrowserName(browser)}.`
          : resolvedSite
            ? `Opened ${resolvedSite.label} in ${summarizeBrowserName(browser)}.`
            : `Opened ${summarizeBrowserName(browser)}.`,
        output: url,
      } satisfies AlicizationLocalAutomationResult
    }
    catch (error) {
      return {
        channel: 'browser',
        status: 'failed',
        operation: 'browser_open_url',
        browser,
        site: resolvedSite?.site ?? (requestedSite || null),
        url,
        errorCode: 'LOCAL_BROWSER_OPEN_URL_FAILED',
        errorMessage: options.errorMessageFrom(error) ?? 'Failed to open URL in the local browser.',
      } satisfies AlicizationLocalAutomationResult
    }
  }

  async function searchWeb(input: AlicizationLocalBrowserSearchWebInput) {
    const query = sanitizeText(input.query)
    const browser = normalizeBrowserToolResultBrowser(input.browser)
    const searchEngine = normalizeSearchEngine(input.searchEngine)
    if (!query)
      return buildNotConfiguredResult('browser_search_web', 'Query is required.')

    const url = buildSearchUrl(query, searchEngine)
    const openResult = await openUrl({
      abortSignal: input.abortSignal,
      url,
      browser,
    })
    return {
      ...openResult,
      channel: 'browser',
      operation: 'browser_search_web',
      browser,
      query,
      searchEngine,
      url,
      goal: `Search the web for ${query}.`,
      summary: `Searched the web for ${query}.`,
      output: url,
    } satisfies AlicizationLocalAutomationResult
  }

  async function readBrowserTabMeta(
    browser: AlicizationSupportedBrowser,
    abortSignal?: AbortSignal,
  ) {
    const appName = getBrowserApplicationName(browser)
    const lines = browser === 'safari'
      ? [
          `tell application "${appName}"`,
          'set pageUrl to ""',
          'set pageTitle to ""',
          'try',
          'set pageUrl to URL of front document',
          'end try',
          'try',
          'set pageTitle to name of front document',
          'end try',
          'return pageUrl & linefeed & pageTitle',
          'end tell',
        ]
      : [
          `tell application "${appName}"`,
          'set pageUrl to ""',
          'set pageTitle to ""',
          'try',
          'set pageUrl to URL of active tab of front window',
          'end try',
          'try',
          'set pageTitle to title of active tab of front window',
          'end try',
          'return pageUrl & linefeed & pageTitle',
          'end tell',
        ]
    const output = await runAppleScript(lines, 5_000, abortSignal)
    const [url = '', title = ''] = output.split('\n')
    return {
      url: sanitizeText(url),
      title: sanitizeText(title),
    }
  }

  async function runBrowserJavaScript(
    browser: AlicizationSupportedBrowser,
    source: string,
    abortSignal?: AbortSignal,
  ) {
    const appName = getBrowserApplicationName(browser)
    const escaped = escapeAppleScriptString(source)
    const lines = browser === 'safari'
      ? [
          `tell application "${appName}" to do JavaScript "${escaped}" in front document`,
        ]
      : [
          `tell application "${appName}" to execute active tab of front window javascript "${escaped}"`,
        ]
    return await runAppleScript(lines, 8_000, abortSignal)
  }

  function isBrowserJavaScriptPermissionError(message: string) {
    return /allow javascript from apple events|executing javascript through applescript is turned off/i.test(message)
  }

  async function readPage(input: AlicizationLocalBrowserReadPageInput) {
    if (platform !== 'darwin')
      return buildUnsupportedPlatformResult('browser_read_page')

    const browser = await resolveSupportedBrowser(input.browser, input.abortSignal)
    const format = normalizeReadFormat(input.format)
    const maxChars = normalizeMaxChars(input.maxChars)
    const meta = await readBrowserTabMeta(browser, input.abortSignal).catch(() => ({
      url: '',
      title: '',
    }))
    const jsSource = format === 'html'
      ? `(() => {${browserReadPageScrollStateScript}return JSON.stringify({ title: document.title ?? "", url: location.href ?? "", content: document.documentElement?.outerHTML ?? "", scrollState: { offsetY, viewportHeight, documentHeight, canScrollDown, canScrollUp } });})()`
      : format === 'interactables'
        ? [
            '(() => {',
            'const normalize = value => String(value ?? "").replace(/\\s+/g, " ").trim();',
            browserReadPageScrollStateScript,
            'const candidates = Array.from(document.querySelectorAll(\'a, button, [role="button"], [role="link"], input, textarea, select, summary, label\'));',
            'const interactables = [];',
            'const seen = new Set();',
            'for (const candidate of candidates) {',
            '  const tag = candidate.tagName?.toLowerCase?.() ?? "";',
            '  const role = normalize(candidate.getAttribute?.("role"));',
            '  const type = normalize(candidate.getAttribute?.("type"));',
            '  const text = normalize(candidate instanceof HTMLInputElement ? candidate.value : candidate.textContent ?? "");',
            '  const ariaLabel = normalize(candidate.getAttribute?.("aria-label"));',
            '  const title = normalize(candidate.getAttribute?.("title"));',
            '  const href = candidate instanceof HTMLAnchorElement ? normalize(candidate.href) : "";',
            '  const disabled = candidate instanceof HTMLButtonElement || candidate instanceof HTMLInputElement || candidate instanceof HTMLSelectElement || candidate instanceof HTMLTextAreaElement',
            '    ? candidate.disabled === true',
            '    : candidate.hasAttribute?.("disabled") === true;',
            '  if (!text && !ariaLabel && !title && !href) continue;',
            '  const key = [tag, role, type, text, ariaLabel, title, href, disabled ? "1" : "0"].join("|");',
            '  if (seen.has(key)) continue;',
            '  seen.add(key);',
            '  interactables.push({',
            '    tag,',
            '    role: role || null,',
            '    type: type || null,',
            '    text: text || null,',
            '    ariaLabel: ariaLabel || null,',
            '    title: title || null,',
            '    href: href || null,',
            '    disabled,',
            '  });',
            '  if (interactables.length >= 40) break;',
            '}',
            'return JSON.stringify({',
            '  title: document.title ?? "",',
            '  url: location.href ?? "",',
            '  content: JSON.stringify(interactables),',
            '  scrollState: { offsetY, viewportHeight, documentHeight, canScrollDown, canScrollUp },',
            '  interactables,',
            '});',
            '})()',
          ].join('')
        : `(() => {${browserReadPageScrollStateScript}return JSON.stringify({ title: document.title ?? "", url: location.href ?? "", content: document.body?.innerText ?? "", scrollState: { offsetY, viewportHeight, documentHeight, canScrollDown, canScrollUp } });})()`

    try {
      const raw = await runBrowserJavaScript(browser, jsSource, input.abortSignal)
      const payload = JSON.parse(raw) as {
        content?: unknown
        interactables?: unknown
        scrollState?: unknown
        title?: unknown
        url?: unknown
      }
      const content = typeof payload.content === 'string' ? payload.content : ''
      const truncated = truncateText(content, maxChars)
      const interactables = Array.isArray(payload.interactables)
        ? payload.interactables
        : undefined

      return {
        channel: 'browser',
        status: 'completed',
        operation: 'browser_read_page',
        browser,
        format,
        url: sanitizeText(payload.url) || meta.url,
        title: sanitizeText(payload.title) || meta.title,
        content: truncated.content,
        interactables,
        scrollState: payload.scrollState && typeof payload.scrollState === 'object' && !Array.isArray(payload.scrollState)
          ? payload.scrollState
          : undefined,
        truncated: truncated.truncated,
        goal: 'Read the current browser page.',
        summary: format === 'interactables'
          ? `Listed ${(Array.isArray(interactables) ? interactables.length : 0)} interactable browser elements from ${sanitizeText(payload.title) || meta.title || sanitizeText(payload.url) || meta.url || 'content'}.`
          : `Read browser page ${sanitizeText(payload.title) || meta.title || sanitizeText(payload.url) || meta.url || 'content'}.`,
        output: truncated.content,
      } satisfies AlicizationLocalAutomationResult
    }
    catch (error) {
      const message = options.errorMessageFrom(error) ?? 'Failed to read the active browser page.'
      return {
        channel: 'browser',
        status: 'failed',
        operation: 'browser_read_page',
        browser,
        format,
        url: meta.url,
        title: meta.title,
        errorCode: isBrowserJavaScriptPermissionError(message)
          ? 'LOCAL_BROWSER_JAVASCRIPT_PERMISSION_REQUIRED'
          : 'LOCAL_BROWSER_READ_PAGE_FAILED',
        errorMessage: isBrowserJavaScriptPermissionError(message)
          ? `Local page reading needs browser JavaScript automation permission: ${message}`
          : message,
      } satisfies AlicizationLocalAutomationResult
    }
  }

  async function clickElement(input: AlicizationLocalBrowserClickElementInput) {
    const selector = sanitizeText(input.selector)
    const text = sanitizeText(input.text)
    const exactText = input.exactText === true
    const ordinal = normalizeOrdinal(input.ordinal)
    const targetType = normalizeClickTargetType(input.targetType)
    if (!selector && !text && !ordinal)
      return buildNotConfiguredResult('browser_click_element', 'selector, text, or ordinal is required.')
    if (platform !== 'darwin')
      return buildUnsupportedPlatformResult('browser_click_element')

    const browser = await resolveSupportedBrowser(input.browser, input.abortSignal)
    const meta = await readBrowserTabMeta(browser, input.abortSignal).catch(() => ({
      url: '',
      title: '',
    }))
    const jsSource = [
      '(() => {',
      'const normalize = value => String(value ?? "").replace(/\\s+/g, " ").trim();',
      `const selector = ${JSON.stringify(selector || null)};`,
      `const targetText = normalize(${JSON.stringify(text || null)});`,
      `const exactText = ${exactText ? 'true' : 'false'};`,
      `const ordinal = ${ordinal ?? 'null'};`,
      `const targetType = ${JSON.stringify(targetType)};`,
      'const candidateSelector = targetType === "link"',
      '  ? \'a, [role="link"]\'',
      '  : targetType === "button"',
      '    ? \'button, [role="button"], input[type="button"], input[type="submit"], summary\'',
      '    : \'button, a, [role="button"], [role="link"], input[type="button"], input[type="submit"], summary, label, [aria-label], [title]\';',
      'const readCandidateTexts = (candidate) => {',
      '  const values = [',
      '    candidate instanceof HTMLInputElement ? candidate.value : "",',
      '    candidate.textContent ?? "",',
      '    candidate instanceof HTMLElement ? candidate.innerText ?? "" : "",',
      '    candidate.getAttribute?.("aria-label") ?? "",',
      '    candidate.getAttribute?.("title") ?? "",',
      '    candidate.getAttribute?.("value") ?? "",',
      '  ];',
      '  return values.map(value => normalize(value)).filter(Boolean);',
      '};',
      'const scoreCandidateText = (candidateText) => {',
      '  if (!targetText || !candidateText) return -1;',
      '  if (exactText && candidateText === targetText) return 200 + candidateText.length;',
      '  if (!exactText && candidateText === targetText) return 180 + candidateText.length;',
      '  if (!exactText && candidateText.includes(targetText)) return 120 + targetText.length;',
      '  if (!exactText && targetText.includes(candidateText)) return 80 + candidateText.length;',
      '  return -1;',
      '};',
      'let target = selector ? document.querySelector(selector) : null;',
      'let matchedText = "";',
      'const candidates = Array.from(document.querySelectorAll(candidateSelector));',
      'if (!target && ordinal != null) {',
      '  const ordinalIndex = Math.max(0, ordinal - 1);',
      '  const ordinalTarget = candidates[ordinalIndex] ?? null;',
      '  if (ordinalTarget) {',
      '    target = ordinalTarget;',
      '    matchedText = readCandidateTexts(ordinalTarget)[0] ?? "";',
      '  }',
      '}',
      'if (!target && targetText) {',
      '  let best = null;',
      '  let bestScore = -1;',
      '  let bestText = "";',
      '  for (const candidate of candidates) {',
      '    const texts = readCandidateTexts(candidate);',
      '    for (const candidateText of texts) {',
      '      const score = scoreCandidateText(candidateText);',
      '      if (score > bestScore) {',
      '        best = candidate;',
      '        bestScore = score;',
      '        bestText = candidateText;',
      '      }',
      '    }',
      '  }',
      '  target = best;',
      '  matchedText = bestText;',
      '}',
      'if (!target) return JSON.stringify({ ok: false, code: selector ? "selector-not-found" : ordinal != null ? "ordinal-not-found" : targetText ? "text-not-found" : "selector-not-found" });',
      'if (target instanceof HTMLElement) target.scrollIntoView({ block: "center", inline: "center" });',
      'target.click();',
      'return JSON.stringify({ ok: true, title: document.title ?? "", url: location.href ?? "", matchedText });',
      '})()',
    ].join('')

    try {
      const raw = await runBrowserJavaScript(browser, jsSource, input.abortSignal)
      const payload = JSON.parse(raw) as {
        code?: unknown
        matchedText?: unknown
        ok?: unknown
        title?: unknown
        url?: unknown
      }
      if (payload.ok !== true) {
        return {
          status: 'failed',
          operation: 'browser_click_element',
          browser,
          ordinal,
          selector: selector || null,
          targetType,
          text: text || null,
          url: meta.url,
          title: meta.title,
          errorCode: payload.code === 'selector-not-found'
            ? 'LOCAL_BROWSER_SELECTOR_NOT_FOUND'
            : payload.code === 'ordinal-not-found'
              ? 'LOCAL_BROWSER_ORDINAL_NOT_FOUND'
              : payload.code === 'text-not-found'
                ? 'LOCAL_BROWSER_TEXT_NOT_FOUND'
                : 'LOCAL_BROWSER_CLICK_FAILED',
          errorMessage: payload.code === 'selector-not-found'
            ? `No page element matched selector "${selector}".`
            : payload.code === 'ordinal-not-found'
              ? `No page element matched ordinal ${ordinal ?? 0}${targetType ? ` for ${targetType}` : ''}.`
              : payload.code === 'text-not-found'
                ? `No page element matched text "${text}".`
                : 'Failed to click the active browser page element.',
        } satisfies AlicizationLocalAutomationResult
      }

      const matchedText = sanitizeText(payload.matchedText)
      const targetSummary = matchedText || text || selector || (ordinal ? `${ordinal}${targetType ? ` ${targetType}` : ''}` : '')
      return {
        channel: 'browser',
        status: 'completed',
        operation: 'browser_click_element',
        browser,
        ordinal: ordinal ?? undefined,
        selector: selector || null,
        targetType,
        text: text || null,
        exactText,
        url: sanitizeText(payload.url) || meta.url,
        title: sanitizeText(payload.title) || meta.title,
        matchedText: matchedText || null,
        goal: `Click browser element ${targetSummary || 'target'}.`,
        summary: `Clicked browser element ${targetSummary || 'target'}.`,
        output: sanitizeText(payload.url) || meta.url || matchedText || text || selector,
      } satisfies AlicizationLocalAutomationResult
    }
    catch (error) {
      const message = options.errorMessageFrom(error) ?? 'Failed to click the active browser page element.'
      return {
        channel: 'browser',
        status: 'failed',
        operation: 'browser_click_element',
        browser,
        ordinal,
        selector: selector || null,
        targetType,
        text: text || null,
        url: meta.url,
        title: meta.title,
        errorCode: isBrowserJavaScriptPermissionError(message)
          ? 'LOCAL_BROWSER_JAVASCRIPT_PERMISSION_REQUIRED'
          : 'LOCAL_BROWSER_CLICK_FAILED',
        errorMessage: isBrowserJavaScriptPermissionError(message)
          ? `Local page clicking needs browser JavaScript automation permission: ${message}`
          : message,
      } satisfies AlicizationLocalAutomationResult
    }
  }

  async function typeBrowserText(input: AlicizationLocalBrowserTypeTextInput) {
    const text = sanitizeText(input.text)
    const selector = sanitizeText(input.selector)
    const targetText = sanitizeText(input.targetText)
    const ordinal = normalizeOrdinal(input.ordinal)
    const exactText = input.exactText === true
    const clearExisting = input.clearExisting === true
    const submit = input.submit === true
    if (!text)
      return buildNotConfiguredResult('browser_type_text', 'text is required.')
    if (platform !== 'darwin')
      return buildUnsupportedPlatformResult('browser_type_text')

    const browser = await resolveSupportedBrowser(input.browser, input.abortSignal)
    const meta = await readBrowserTabMeta(browser, input.abortSignal).catch(() => ({
      url: '',
      title: '',
    }))
    const jsSource = [
      '(() => {',
      'const normalize = value => String(value ?? "").replace(/\\s+/g, " ").trim();',
      `const inputText = ${JSON.stringify(text)};`,
      `const selector = ${JSON.stringify(selector || null)};`,
      `const targetText = normalize(${JSON.stringify(targetText || null)});`,
      `const ordinal = ${ordinal ?? 'null'};`,
      `const exactText = ${exactText ? 'true' : 'false'};`,
      `const clearExisting = ${clearExisting ? 'true' : 'false'};`,
      `const submit = ${submit ? 'true' : 'false'};`,
      'const editableSelector = \'input, textarea, select, [contenteditable="true"], [role="textbox"]\';',
      'const isEditable = (candidate) => {',
      '  if (!(candidate instanceof Element)) return false;',
      '  if (candidate instanceof HTMLInputElement) {',
      '    const type = normalize(candidate.type || "text").toLowerCase();',
      '    if (["hidden", "submit", "button", "checkbox", "radio", "file", "image", "reset", "color", "range"].includes(type)) return false;',
      '    return candidate.disabled !== true && candidate.readOnly !== true;',
      '  }',
      '  if (candidate instanceof HTMLTextAreaElement)',
      '    return candidate.disabled !== true && candidate.readOnly !== true;',
      '  if (candidate instanceof HTMLSelectElement)',
      '    return candidate.disabled !== true;',
      '  const contentEditable = normalize(candidate.getAttribute?.("contenteditable")).toLowerCase();',
      '  const role = normalize(candidate.getAttribute?.("role")).toLowerCase();',
      '  return contentEditable === "true" || role === "textbox";',
      '};',
      'const readCandidateTexts = (candidate) => {',
      '  if (!(candidate instanceof Element)) return [];',
      '  const labelTexts = "labels" in candidate && Array.isArray(Array.from(candidate.labels ?? []))',
      '    ? Array.from(candidate.labels ?? []).map(label => normalize(label.textContent ?? "")).filter(Boolean)',
      '    : [];',
      '  const values = [',
      '    candidate instanceof HTMLInputElement || candidate instanceof HTMLTextAreaElement || candidate instanceof HTMLSelectElement',
      '      ? candidate.value',
      '      : "",',
      '    candidate.getAttribute?.("placeholder") ?? "",',
      '    candidate.getAttribute?.("aria-label") ?? "",',
      '    candidate.getAttribute?.("title") ?? "",',
      '    candidate.getAttribute?.("name") ?? "",',
      '    ...labelTexts,',
      '    candidate.textContent ?? "",',
      '  ];',
      '  return [...new Set(values.map(value => normalize(value)).filter(Boolean))];',
      '};',
      'const scoreCandidateText = (candidateText) => {',
      '  if (!targetText || !candidateText) return -1;',
      '  if (exactText && candidateText === targetText) return 200 + candidateText.length;',
      '  if (!exactText && candidateText === targetText) return 180 + candidateText.length;',
      '  if (!exactText && candidateText.includes(targetText)) return 120 + targetText.length;',
      '  if (!exactText && targetText.includes(candidateText)) return 80 + candidateText.length;',
      '  return -1;',
      '};',
      'const candidates = Array.from(document.querySelectorAll(editableSelector)).filter(isEditable);',
      'let target = selector ? document.querySelector(selector) : null;',
      'let matchedText = "";',
      'if (target && !isEditable(target)) return JSON.stringify({ ok: false, code: "target-not-editable" });',
      'if (!target && ordinal != null) {',
      '  const ordinalTarget = candidates[Math.max(0, ordinal - 1)] ?? null;',
      '  if (ordinalTarget) {',
      '    target = ordinalTarget;',
      '    matchedText = readCandidateTexts(ordinalTarget)[0] ?? "";',
      '  }',
      '}',
      'if (!target && targetText) {',
      '  let best = null;',
      '  let bestScore = -1;',
      '  let bestText = "";',
      '  for (const candidate of candidates) {',
      '    for (const candidateText of readCandidateTexts(candidate)) {',
      '      const score = scoreCandidateText(candidateText);',
      '      if (score > bestScore) {',
      '        best = candidate;',
      '        bestScore = score;',
      '        bestText = candidateText;',
      '      }',
      '    }',
      '  }',
      '  target = best;',
      '  matchedText = bestText;',
      '}',
      'if (!target && isEditable(document.activeElement)) {',
      '  target = document.activeElement;',
      '  matchedText = readCandidateTexts(document.activeElement)[0] ?? "";',
      '}',
      'if (!target && candidates.length === 1) {',
      '  target = candidates[0] ?? null;',
      '  matchedText = target ? (readCandidateTexts(target)[0] ?? "") : "";',
      '}',
      'if (!target) return JSON.stringify({ ok: false, code: selector ? "selector-not-found" : ordinal != null ? "ordinal-not-found" : targetText ? "text-not-found" : "focus-target-missing" });',
      'const editableTarget = target;',
      'if (!(editableTarget instanceof Element) || !isEditable(editableTarget)) return JSON.stringify({ ok: false, code: "target-not-editable" });',
      'const baselineMatchedText = matchedText || readCandidateTexts(editableTarget).find(value => value !== inputText) || readCandidateTexts(editableTarget)[0] || "";',
      'if (editableTarget instanceof HTMLElement) {',
      '  editableTarget.scrollIntoView({ block: "center", inline: "center" });',
      '  editableTarget.focus();',
      '}',
      'const applyText = () => {',
      '  if (editableTarget instanceof HTMLInputElement || editableTarget instanceof HTMLTextAreaElement) {',
      '    const nextValue = clearExisting ? inputText : String(editableTarget.value ?? "") + inputText;',
      '    editableTarget.value = nextValue;',
      '    return { ok: true, submitted: false };',
      '  }',
      '  if (editableTarget instanceof HTMLSelectElement) {',
      '    const options = Array.from(editableTarget.options ?? []);',
      '    const matchedOption = options.find((option) => {',
      '      const optionText = normalize(option.textContent ?? option.label ?? option.value ?? "");',
      '      const optionValue = normalize(option.value ?? "");',
      '      return optionText === normalize(inputText) || optionValue === normalize(inputText) || optionText.includes(normalize(inputText));',
      '    }) ?? null;',
      '    if (!matchedOption) return { ok: false, code: "option-not-found", submitted: false };',
      '    editableTarget.value = matchedOption.value;',
      '    return { ok: true, submitted: false };',
      '  }',
      '  const previousText = normalize(editableTarget.textContent ?? "");',
      '  const nextText = clearExisting ? inputText : previousText + inputText;',
      '  editableTarget.textContent = nextText;',
      '  return { ok: true, submitted: false };',
      '};',
      'const applyResult = applyText();',
      'if (applyResult.ok !== true) return JSON.stringify({ ok: false, code: applyResult.code ?? "type-failed" });',
      'editableTarget.dispatchEvent(new Event("input", { bubbles: true }));',
      'editableTarget.dispatchEvent(new Event("change", { bubbles: true }));',
      'let submitted = false;',
      'if (submit) {',
      '  const maybeForm = editableTarget instanceof HTMLInputElement || editableTarget instanceof HTMLTextAreaElement || editableTarget instanceof HTMLSelectElement',
      '    ? editableTarget.form',
      '    : editableTarget.closest?.("form") ?? null;',
      '  if (maybeForm && typeof maybeForm.requestSubmit === "function") {',
      '    maybeForm.requestSubmit();',
      '    submitted = true;',
      '  }',
      '  else {',
      '    const eventInit = { bubbles: true, cancelable: true, key: "Enter", code: "Enter", keyCode: 13, which: 13 };',
      '    editableTarget.dispatchEvent(new KeyboardEvent("keydown", eventInit));',
      '    editableTarget.dispatchEvent(new KeyboardEvent("keypress", eventInit));',
      '    editableTarget.dispatchEvent(new KeyboardEvent("keyup", eventInit));',
      '    submitted = true;',
      '  }',
      '}',
      'return JSON.stringify({ ok: true, title: document.title ?? "", url: location.href ?? "", matchedText: baselineMatchedText || null, submitted });',
      '})()',
    ].join('')

    try {
      const raw = await runBrowserJavaScript(browser, jsSource, input.abortSignal)
      const payload = JSON.parse(raw) as {
        code?: unknown
        matchedText?: unknown
        ok?: unknown
        submitted?: unknown
        title?: unknown
        url?: unknown
      }
      if (payload.ok !== true) {
        return {
          channel: 'browser',
          status: 'failed',
          operation: 'browser_type_text',
          browser,
          clearExisting,
          exactText,
          ordinal,
          selector: selector || null,
          submit,
          targetText: targetText || null,
          text,
          url: meta.url,
          title: meta.title,
          errorCode: payload.code === 'selector-not-found'
            ? 'LOCAL_BROWSER_SELECTOR_NOT_FOUND'
            : payload.code === 'ordinal-not-found'
              ? 'LOCAL_BROWSER_ORDINAL_NOT_FOUND'
              : payload.code === 'text-not-found'
                ? 'LOCAL_BROWSER_TEXT_NOT_FOUND'
                : payload.code === 'focus-target-missing'
                  ? 'LOCAL_BROWSER_FOCUS_TARGET_MISSING'
                  : payload.code === 'target-not-editable'
                    ? 'LOCAL_BROWSER_TARGET_NOT_EDITABLE'
                    : payload.code === 'option-not-found'
                      ? 'LOCAL_BROWSER_OPTION_NOT_FOUND'
                      : 'LOCAL_BROWSER_TYPE_TEXT_FAILED',
          errorMessage: payload.code === 'selector-not-found'
            ? `No page input matched selector "${selector}".`
            : payload.code === 'ordinal-not-found'
              ? `No page input matched ordinal ${ordinal ?? 0}.`
              : payload.code === 'text-not-found'
                ? `No page input matched text "${targetText}".`
                : payload.code === 'focus-target-missing'
                  ? 'No focused or uniquely identifiable page input was available for typing.'
                  : payload.code === 'target-not-editable'
                    ? 'The matched page element is not an editable input target.'
                    : payload.code === 'option-not-found'
                      ? `No select option matched "${text}".`
                      : 'Failed to type into the active browser page input.',
        } satisfies AlicizationLocalAutomationResult
      }

      const matchedText = sanitizeText(payload.matchedText)
      const targetSummary = matchedText || targetText || selector || (ordinal ? `#${ordinal}` : 'focused browser field')
      return {
        channel: 'browser',
        status: 'completed',
        operation: 'browser_type_text',
        browser,
        clearExisting,
        exactText,
        ordinal: ordinal ?? undefined,
        selector: selector || null,
        submit,
        submitted: payload.submitted === true,
        targetText: targetText || null,
        text,
        url: sanitizeText(payload.url) || meta.url,
        title: sanitizeText(payload.title) || meta.title,
        matchedText: matchedText || null,
        goal: `Type text into browser field ${targetSummary}.`,
        summary: `Typed text into browser field ${targetSummary}${payload.submitted === true ? ' and submitted.' : '.'}`,
        output: text,
      } satisfies AlicizationLocalAutomationResult
    }
    catch (error) {
      const message = options.errorMessageFrom(error) ?? 'Failed to type into the active browser page input.'
      return {
        channel: 'browser',
        status: 'failed',
        operation: 'browser_type_text',
        browser,
        clearExisting,
        exactText,
        ordinal,
        selector: selector || null,
        submit,
        targetText: targetText || null,
        text,
        url: meta.url,
        title: meta.title,
        errorCode: isBrowserJavaScriptPermissionError(message)
          ? 'LOCAL_BROWSER_JAVASCRIPT_PERMISSION_REQUIRED'
          : 'LOCAL_BROWSER_TYPE_TEXT_FAILED',
        errorMessage: isBrowserJavaScriptPermissionError(message)
          ? `Local page typing needs browser JavaScript automation permission: ${message}`
          : message,
      } satisfies AlicizationLocalAutomationResult
    }
  }

  async function navigateBrowser(input: AlicizationLocalBrowserNavigateInput) {
    const action = normalizeBrowserNavigateAction(input.action)
    if (!action)
      return buildNotConfiguredResult('browser_navigate', 'action must be back, forward, or reload.')
    if (platform !== 'darwin')
      return buildUnsupportedPlatformResult('browser_navigate')

    const browser = await resolveSupportedBrowser(input.browser, input.abortSignal)
    const appName = getBrowserApplicationName(browser)
    const meta = await readBrowserTabMeta(browser, input.abortSignal).catch(() => ({
      url: '',
      title: '',
    }))
    const keystrokeLine = action === 'back'
      ? 'keystroke "[" using {command down}'
      : action === 'forward'
        ? 'keystroke "]" using {command down}'
        : 'keystroke "r" using {command down}'

    try {
      await runAppleScript([
        `tell application "${appName}" to activate`,
        'delay 0.15',
        'tell application "System Events"',
        keystrokeLine,
        'end tell',
        'delay 0.2',
      ], 5_000, input.abortSignal)
      const nextMeta = await readBrowserTabMeta(browser, input.abortSignal).catch(() => meta)
      const actionSummary = action === 'reload'
        ? 'reloaded the browser page'
        : action === 'forward'
          ? 'navigated the browser forward'
          : 'navigated the browser back'
      return {
        channel: 'browser',
        status: 'completed',
        operation: 'browser_navigate',
        browser,
        action,
        url: nextMeta.url || meta.url,
        title: nextMeta.title || meta.title,
        goal: `Navigate the browser ${action}.`,
        summary: `${actionSummary}.`,
        output: nextMeta.url || meta.url || action,
      } satisfies AlicizationLocalAutomationResult
    }
    catch (error) {
      return {
        channel: 'browser',
        status: 'failed',
        operation: 'browser_navigate',
        browser,
        action,
        url: meta.url,
        title: meta.title,
        errorCode: 'LOCAL_BROWSER_NAVIGATE_FAILED',
        errorMessage: options.errorMessageFrom(error) ?? 'Failed to navigate the active browser page.',
      } satisfies AlicizationLocalAutomationResult
    }
  }

  async function scrollBrowser(input: AlicizationLocalBrowserScrollInput) {
    const action = normalizeBrowserScrollAction(input.action)
    if (!action)
      return buildNotConfiguredResult('browser_scroll', 'action must be down, up, top, or bottom.')
    if (platform !== 'darwin')
      return buildUnsupportedPlatformResult('browser_scroll')

    const amount = normalizeBrowserScrollAmount(input.amount)
    const browser = await resolveSupportedBrowser(input.browser, input.abortSignal)
    const meta = await readBrowserTabMeta(browser, input.abortSignal).catch(() => ({
      url: '',
      title: '',
    }))
    const jsSource = [
      '(() => {',
      `const action = ${JSON.stringify(action)};`,
      `const amount = ${amount};`,
      'const beforeY = window.scrollY || window.pageYOffset || 0;',
      'const viewportHeight = window.innerHeight || 0;',
      'const documentHeight = Math.max(',
      '  document.documentElement?.scrollHeight ?? 0,',
      '  document.body?.scrollHeight ?? 0,',
      ');',
      'const maxScrollTop = Math.max(0, documentHeight - viewportHeight);',
      'let targetTop = beforeY;',
      'if (action === "down")',
      '  targetTop = beforeY + viewportHeight * amount;',
      'else if (action === "up")',
      '  targetTop = beforeY - viewportHeight * amount;',
      'else if (action === "top")',
      '  targetTop = 0;',
      'else if (action === "bottom")',
      '  targetTop = maxScrollTop;',
      'targetTop = Math.max(0, Math.min(maxScrollTop, targetTop));',
      'window.scrollTo({ top: targetTop, behavior: "auto" });',
      'const afterY = window.scrollY || window.pageYOffset || 0;',
      'return JSON.stringify({',
      '  ok: true,',
      '  title: document.title ?? "",',
      '  url: location.href ?? "",',
      '  beforeY,',
      '  afterY,',
      '  viewportHeight,',
      '  documentHeight,',
      '});',
      '})()',
    ].join('')

    try {
      const raw = await runBrowserJavaScript(browser, jsSource, input.abortSignal)
      const payload = JSON.parse(raw) as {
        afterY?: unknown
        beforeY?: unknown
        documentHeight?: unknown
        ok?: unknown
        title?: unknown
        url?: unknown
        viewportHeight?: unknown
      }
      if (payload.ok !== true) {
        return {
          channel: 'browser',
          status: 'failed',
          operation: 'browser_scroll',
          browser,
          action,
          amount,
          url: meta.url,
          title: meta.title,
          errorCode: 'LOCAL_BROWSER_SCROLL_FAILED',
          errorMessage: 'Failed to scroll the active browser page.',
        } satisfies AlicizationLocalAutomationResult
      }

      const url = sanitizeText(payload.url) || meta.url
      const title = sanitizeText(payload.title) || meta.title
      return {
        channel: 'browser',
        status: 'completed',
        operation: 'browser_scroll',
        browser,
        action,
        amount,
        url,
        title,
        beforeY: typeof payload.beforeY === 'number' && Number.isFinite(payload.beforeY) ? payload.beforeY : undefined,
        afterY: typeof payload.afterY === 'number' && Number.isFinite(payload.afterY) ? payload.afterY : undefined,
        viewportHeight: typeof payload.viewportHeight === 'number' && Number.isFinite(payload.viewportHeight) ? payload.viewportHeight : undefined,
        documentHeight: typeof payload.documentHeight === 'number' && Number.isFinite(payload.documentHeight) ? payload.documentHeight : undefined,
        goal: `Scroll the browser ${action}.`,
        summary: `Scrolled browser ${action}.`,
        output: url || title || action,
      } satisfies AlicizationLocalAutomationResult
    }
    catch (error) {
      const message = options.errorMessageFrom(error) ?? 'Failed to scroll the active browser page.'
      return {
        channel: 'browser',
        status: 'failed',
        operation: 'browser_scroll',
        browser,
        action,
        amount,
        url: meta.url,
        title: meta.title,
        errorCode: isBrowserJavaScriptPermissionError(message)
          ? 'LOCAL_BROWSER_JAVASCRIPT_PERMISSION_REQUIRED'
          : 'LOCAL_BROWSER_SCROLL_FAILED',
        errorMessage: isBrowserJavaScriptPermissionError(message)
          ? `Local page scrolling needs browser JavaScript automation permission: ${message}`
          : message,
      } satisfies AlicizationLocalAutomationResult
    }
  }

  async function waitForBrowser(input: AlicizationLocalBrowserWaitInput) {
    if (platform !== 'darwin')
      return buildUnsupportedPlatformResult('browser_wait')

    const state = normalizeBrowserWaitState(input.state)
    const text = sanitizeText(input.text)
    const urlIncludes = sanitizeText(input.urlIncludes)
    const timeoutMs = normalizeBrowserWaitTimeoutMs(input.timeoutMs)
    const browser = await resolveSupportedBrowser(input.browser, input.abortSignal)
    const meta = await readBrowserTabMeta(browser, input.abortSignal).catch(() => ({
      url: '',
      title: '',
    }))
    const jsSource = [
      '(() => {',
      `const wantedState = ${JSON.stringify(state)};`,
      `const wantedText = ${JSON.stringify(text || '')};`,
      `const wantedUrlIncludes = ${JSON.stringify(urlIncludes || '')};`,
      'const readyState = document.readyState ?? "";',
      'const bodyText = document.body?.innerText ?? "";',
      'const url = location.href ?? "";',
      'const stateOk = wantedState === "interactive"',
      '  ? readyState === "interactive" || readyState === "complete"',
      '  : readyState === "complete";',
      'const textOk = !wantedText || bodyText.includes(wantedText);',
      'const urlOk = !wantedUrlIncludes || url.includes(wantedUrlIncludes);',
      'return JSON.stringify({',
      '  ok: stateOk && textOk && urlOk,',
      '  title: document.title ?? "",',
      '  url,',
      '  readyState,',
      '  matchedText: textOk && wantedText ? wantedText : null,',
      '  stateOk,',
      '  textOk,',
      '  urlOk,',
      '});',
      '})()',
    ].join('')

    const startedAt = Date.now()
    let lastReadyState = ''
    let lastTitle = meta.title
    let lastUrl = meta.url

    try {
      while (Date.now() - startedAt <= timeoutMs) {
        const raw = await runBrowserJavaScript(browser, jsSource, input.abortSignal)
        const payload = JSON.parse(raw) as {
          matchedText?: unknown
          ok?: unknown
          readyState?: unknown
          title?: unknown
          url?: unknown
        }
        lastReadyState = sanitizeText(payload.readyState)
        lastTitle = sanitizeText(payload.title) || lastTitle
        lastUrl = sanitizeText(payload.url) || lastUrl

        if (payload.ok === true) {
          return {
            channel: 'browser',
            status: 'completed',
            operation: 'browser_wait',
            browser,
            state,
            text: text || undefined,
            urlIncludes: urlIncludes || undefined,
            timeoutMs,
            url: lastUrl,
            title: lastTitle,
            readyState: lastReadyState || undefined,
            matchedText: sanitizeText(payload.matchedText) || null,
            elapsedMs: Date.now() - startedAt,
            goal: 'Wait for browser page readiness.',
            summary: 'Waited for browser page readiness.',
            output: lastUrl || lastTitle || state,
          } satisfies AlicizationLocalAutomationResult
        }

        if (Date.now() - startedAt >= timeoutMs)
          break
        await waitForLocalAutomationDelay(100, input.abortSignal)
      }

      return {
        channel: 'browser',
        status: 'failed',
        operation: 'browser_wait',
        browser,
        state,
        text: text || undefined,
        urlIncludes: urlIncludes || undefined,
        timeoutMs,
        url: lastUrl,
        title: lastTitle,
        readyState: lastReadyState || undefined,
        errorCode: 'LOCAL_BROWSER_WAIT_TIMEOUT',
        errorMessage: `Timed out after ${timeoutMs}ms waiting for browser page readiness.`,
      } satisfies AlicizationLocalAutomationResult
    }
    catch (error) {
      const message = options.errorMessageFrom(error) ?? 'Failed to wait for the active browser page.'
      return {
        channel: 'browser',
        status: 'failed',
        operation: 'browser_wait',
        browser,
        state,
        text: text || undefined,
        urlIncludes: urlIncludes || undefined,
        timeoutMs,
        url: lastUrl,
        title: lastTitle,
        readyState: lastReadyState || undefined,
        errorCode: isBrowserJavaScriptPermissionError(message)
          ? 'LOCAL_BROWSER_JAVASCRIPT_PERMISSION_REQUIRED'
          : 'LOCAL_BROWSER_WAIT_FAILED',
        errorMessage: isBrowserJavaScriptPermissionError(message)
          ? `Local browser waiting needs browser JavaScript automation permission: ${message}`
          : message,
      } satisfies AlicizationLocalAutomationResult
    }
  }

  async function waitForDesktop(input: AlicizationLocalDesktopWaitInput) {
    const appName = sanitizeText(input.appName)
    const titleIncludes = sanitizeText(input.titleIncludes)
    const timeoutMs = normalizeDesktopWaitTimeoutMs(input.timeoutMs)
    if (!appName && !titleIncludes)
      return buildNotConfiguredResult('desktop_wait', 'appName or titleIncludes is required.')
    if (platform !== 'darwin')
      return buildUnsupportedPlatformResult('desktop_wait')

    const expectedAppName = appName.toLowerCase()
    const expectedTitleIncludes = titleIncludes.toLowerCase()
    const startedAt = Date.now()
    let lastAppName = ''
    let lastTitle = ''

    try {
      while (Date.now() - startedAt <= timeoutMs) {
        const payload = await readFrontmostDesktopWindow(input.abortSignal)
        lastAppName = sanitizeText(payload.appName) || lastAppName
        lastTitle = sanitizeText(payload.windowTitle) || lastTitle

        const normalizedAppName = lastAppName.toLowerCase()
        const normalizedTitle = lastTitle.toLowerCase()
        const appNameMatched = !expectedAppName
          || normalizedAppName === expectedAppName
          || normalizedAppName.includes(expectedAppName)
        const titleMatched = !expectedTitleIncludes
          || normalizedTitle.includes(expectedTitleIncludes)

        if (appNameMatched && titleMatched) {
          return {
            channel: 'desktop',
            status: 'completed',
            operation: 'desktop_wait',
            appName: lastAppName || appName || null,
            title: lastTitle || null,
            titleIncludes: titleIncludes || undefined,
            timeoutMs,
            elapsedMs: Date.now() - startedAt,
            foregroundWindow: {
              appName: lastAppName || null,
              title: lastTitle || null,
            },
            goal: appName
              ? `Wait for ${appName} to become the frontmost desktop app.`
              : `Wait for the frontmost desktop window title to include ${titleIncludes}.`,
            summary: `Waited for desktop target ${lastAppName || appName || titleIncludes}.`,
            output: lastAppName || lastTitle || appName || titleIncludes,
          } satisfies AlicizationLocalAutomationResult
        }

        if (Date.now() - startedAt >= timeoutMs)
          break
        await waitForLocalAutomationDelay(100, input.abortSignal)
      }

      return {
        channel: 'desktop',
        status: 'failed',
        operation: 'desktop_wait',
        appName: lastAppName || appName || null,
        title: lastTitle || null,
        titleIncludes: titleIncludes || undefined,
        timeoutMs,
        errorCode: 'LOCAL_DESKTOP_WAIT_TIMEOUT',
        errorMessage: `Timed out after ${timeoutMs}ms waiting for the desktop target.`,
      } satisfies AlicizationLocalAutomationResult
    }
    catch (error) {
      return {
        channel: 'desktop',
        status: 'failed',
        operation: 'desktop_wait',
        appName: lastAppName || appName || null,
        title: lastTitle || null,
        titleIncludes: titleIncludes || undefined,
        timeoutMs,
        errorCode: 'LOCAL_DESKTOP_WAIT_FAILED',
        errorMessage: options.errorMessageFrom(error) ?? 'Failed to wait for the desktop target.',
      } satisfies AlicizationLocalAutomationResult
    }
  }

  async function runDesktopAccessibilityTool(payload: {
    exactText?: boolean
    maxItems?: number
    mode: 'click' | 'list'
    ordinal?: number | null
    role?: string
    text?: string
  }, abortSignal?: AbortSignal) {
    const raw = await runJavaScriptAutomation([
      '(() => {',
      'const safeRead = (fn, fallback = null) => {',
      '  try {',
      '    const value = fn();',
      '    return value === undefined ? fallback : value;',
      '  }',
      '  catch (_error) {',
      '    return fallback;',
      '  }',
      '};',
      'const normalize = value => String(value ?? "").replace(/\\s+/g, " ").trim();',
      `const input = ${JSON.stringify(payload)};`,
      'const roleAliases = {',
      '  button: ["AXButton"],',
      '  checkbox: ["AXCheckBox"],',
      '  input: ["AXComboBox", "AXSearchField", "AXTextArea", "AXTextField"],',
      '  "list-item": ["AXOutlineRow", "AXRow"],',
      '  link: ["AXLink"],',
      '  "menu-item": ["AXMenuItem"],',
      '  radio: ["AXRadioButton"],',
      '  select: ["AXPopUpButton", "AXMenuButton"],',
      '  tab: ["AXRadioButton"],',
      '};',
      'const normalizeRoleName = (axRole, roleDescription) => {',
      '  if (axRole === "AXRadioButton" && /tab|标签/u.test(roleDescription)) return "tab";',
      '  switch (axRole) {',
      '    case "AXButton": return "button";',
      '    case "AXCheckBox": return "checkbox";',
      '    case "AXComboBox":',
      '    case "AXSearchField":',
      '    case "AXTextArea":',
      '    case "AXTextField":',
      '      return "input";',
      '    case "AXOutlineRow":',
      '    case "AXRow":',
      '      return "list-item";',
      '    case "AXLink": return "link";',
      '    case "AXMenuItem": return "menu-item";',
      '    case "AXMenuButton":',
      '    case "AXPopUpButton": return "select";',
      '    case "AXRadioButton": return "radio";',
      '    default: return "element";',
      '  }',
      '};',
      'const targetRole = normalize(input.role).toLowerCase();',
      'const maxItems = Number.isFinite(Number(input.maxItems)) ? Math.max(1, Math.min(40, Math.floor(Number(input.maxItems)))) : 20;',
      'const matchesRole = (axRole) => {',
      '  if (!targetRole || targetRole === "element") return true;',
      '  const aliases = roleAliases[targetRole] ?? [];',
      '  return aliases.length === 0 ? true : aliases.includes(axRole);',
      '};',
      'const collectTexts = (item) => {',
      '  const values = [',
      '    safeRead(() => item.title(), ""),',
      '    safeRead(() => item.description(), ""),',
      '    safeRead(() => item.value(), ""),',
      '    safeRead(() => item.name(), ""),',
      '    safeRead(() => item.roleDescription(), ""),',
      '  ].map(normalize).filter(Boolean);',
      '  return [...new Set(values)];',
      '};',
      'const readActionNames = (item) => {',
      '  const actions = safeRead(() => item.actions(), []);',
      '  return actions.map(action => normalize(safeRead(() => action.name(), ""))).filter(Boolean);',
      '};',
      'const scoreCandidateText = (candidateText, desiredText, exactText) => {',
      '  if (!candidateText || !desiredText) return -1;',
      '  if (exactText && candidateText === desiredText) return 200 + candidateText.length;',
      '  if (!exactText && candidateText === desiredText) return 180 + candidateText.length;',
      '  if (!exactText && candidateText.includes(desiredText)) return 120 + desiredText.length;',
      '  if (!exactText && desiredText.includes(candidateText)) return 80 + candidateText.length;',
      '  return -1;',
      '};',
      'const se = Application("System Events");',
      'const frontApp = safeRead(() => se.applicationProcesses.whose({ frontmost: true })[0], null);',
      'if (!frontApp) return JSON.stringify({ ok: false, code: "frontmost-app-not-found" });',
      'const frontWindow = safeRead(() => frontApp.windows[0], null);',
      'const appName = normalize(safeRead(() => frontApp.name(), ""));',
      'const windowTitle = normalize(safeRead(() => frontWindow ? frontWindow.name() : "", ""));',
      'const contents = frontWindow ? safeRead(() => frontWindow.entireContents(), []) : [];',
      'const candidates = [];',
      'for (let index = 0; index < contents.length; index += 1) {',
      '  const item = contents[index];',
      '  const axRole = normalize(safeRead(() => item.role(), ""));',
      '  const roleDescription = normalize(safeRead(() => item.roleDescription(), ""));',
      '  if (!axRole || !matchesRole(axRole)) continue;',
      '  const texts = collectTexts(item);',
      '  const actions = readActionNames(item);',
      '  const role = normalizeRoleName(axRole, roleDescription);',
      '  const actionable = actions.length > 0 || role === "input";',
      '  if (!actionable) continue;',
      '  const text = texts[0] ?? "";',
      '  if (!text && actions.length === 0) continue;',
      '  candidates.push({',
      '    actions,',
      '    axRole,',
      '    enabled: safeRead(() => item.enabled(), true) !== false,',
      '    item,',
      '    ordinal: candidates.length + 1,',
      '    role,',
      '    text,',
      '    texts,',
      '  });',
      '  if (input.mode === "list" && candidates.length >= maxItems) break;',
      '}',
      'if (input.mode === "list") {',
      '  return JSON.stringify({',
      '    appName,',
      '    interactables: candidates.slice(0, maxItems).map(candidate => ({',
      '      actions: candidate.actions,',
      '      axRole: candidate.axRole,',
      '      enabled: candidate.enabled,',
      '      ordinal: candidate.ordinal,',
      '      role: candidate.role,',
      '      text: candidate.text || null,',
      '    })),',
      '    ok: true,',
      '    windowTitle,',
      '  });',
      '}',
      'const desiredText = normalize(input.text);',
      'const exactText = input.exactText === true;',
      'const ordinal = Number.isFinite(Number(input.ordinal)) ? Math.max(1, Math.floor(Number(input.ordinal))) : null;',
      'let target = ordinal != null ? candidates[ordinal - 1] ?? null : null;',
      'if (!target && desiredText) {',
      '  let best = null;',
      '  let bestScore = -1;',
      '  for (const candidate of candidates) {',
      '    for (const candidateText of candidate.texts) {',
      '      const score = scoreCandidateText(candidateText, desiredText, exactText);',
      '      if (score > bestScore) {',
      '        best = candidate;',
      '        bestScore = score;',
      '      }',
      '    }',
      '  }',
      '  target = best;',
      '}',
      'if (!target) {',
      '  return JSON.stringify({',
      '    appName,',
      '    code: ordinal != null ? "ordinal-not-found" : desiredText ? "text-not-found" : "element-not-found",',
      '    ok: false,',
      '    windowTitle,',
      '  });',
      '}',
      'let actionTaken = "";',
      'if (target.role === "input" && target.actions.length === 0) {',
      '  actionTaken = "focus";',
      '}',
      'else {',
      '  const actions = safeRead(() => target.item.actions(), []);',
      '  for (let index = 0; index < actions.length; index += 1) {',
      '    const action = actions[index];',
      '    const actionName = normalize(safeRead(() => action.name(), ""));',
      '    if (!/^AX(?:Confirm|Pick|Press)$/i.test(actionName) && index !== 0) continue;',
      '    safeRead(() => action.perform(), null);',
      '    actionTaken = actionName || "perform";',
      '    break;',
      '  }',
      '}',
      'return JSON.stringify({',
      '  actionTaken: actionTaken || null,',
      '  appName,',
      '  matchedText: target.text || desiredText || null,',
      '  ok: true,',
      '  role: target.role,',
      '  windowTitle,',
      '});',
      '})()',
    ], 8_000, abortSignal)

    return JSON.parse(raw) as Record<string, unknown>
  }

  async function listDesktopInteractables(input: AlicizationLocalDesktopListInteractablesInput) {
    if (platform !== 'darwin')
      return buildUnsupportedPlatformResult('desktop_list_interactables')

    const role = normalizeDesktopRole(input.role) || null
    const maxItems = normalizeDesktopMaxItems(input.maxItems)

    try {
      const payload = await runDesktopAccessibilityTool({
        mode: 'list',
        role: role ?? undefined,
        maxItems,
      }, input.abortSignal)
      const interactables = Array.isArray(payload.interactables)
        ? payload.interactables
        : []
      const appName = sanitizeText(payload.appName)
      const title = sanitizeText(payload.windowTitle)
      return {
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_list_interactables',
        role,
        maxItems,
        foregroundWindow: {
          appName: appName || null,
          title: title || null,
        },
        interactables,
        goal: 'List interactable elements from the current desktop window.',
        summary: `Listed ${interactables.length} desktop interactables from ${appName || title || 'the current window'}.`,
        output: JSON.stringify(interactables),
      } satisfies AlicizationLocalAutomationResult
    }
    catch (error) {
      return {
        channel: 'desktop',
        status: 'failed',
        operation: 'desktop_list_interactables',
        role,
        maxItems,
        errorCode: 'LOCAL_DESKTOP_LIST_INTERACTABLES_FAILED',
        errorMessage: options.errorMessageFrom(error) ?? 'Failed to list current desktop interactables.',
      } satisfies AlicizationLocalAutomationResult
    }
  }

  async function clickDesktopElement(input: AlicizationLocalDesktopClickElementInput) {
    const role = normalizeDesktopRole(input.role) || null
    const text = sanitizeText(input.text)
    const ordinal = normalizeOrdinal(input.ordinal)
    const exactText = input.exactText === true
    if (!text && !ordinal)
      return buildNotConfiguredResult('desktop_click_element', 'text or ordinal is required.')
    if (platform !== 'darwin')
      return buildUnsupportedPlatformResult('desktop_click_element')

    try {
      const payload = await runDesktopAccessibilityTool({
        mode: 'click',
        role: role ?? undefined,
        text: text || undefined,
        ordinal,
        exactText,
      }, input.abortSignal)
      if (payload.ok !== true) {
        return {
          channel: 'desktop',
          status: 'failed',
          operation: 'desktop_click_element',
          role,
          text: text || null,
          ordinal,
          exactText,
          errorCode: payload.code === 'ordinal-not-found'
            ? 'LOCAL_DESKTOP_ORDINAL_NOT_FOUND'
            : payload.code === 'text-not-found'
              ? 'LOCAL_DESKTOP_TEXT_NOT_FOUND'
              : 'LOCAL_DESKTOP_CLICK_FAILED',
          errorMessage: payload.code === 'ordinal-not-found'
            ? `No desktop element matched ordinal ${ordinal ?? 0}${role ? ` for ${role}` : ''}.`
            : payload.code === 'text-not-found'
              ? `No desktop element matched text "${text}".`
              : 'Failed to click the current desktop element.',
        } satisfies AlicizationLocalAutomationResult
      }

      const matchedText = sanitizeText(payload.matchedText)
      const appName = sanitizeText(payload.appName)
      const title = sanitizeText(payload.windowTitle)
      return {
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_click_element',
        role,
        text: text || null,
        ordinal,
        exactText,
        matchedText: matchedText || null,
        actionTaken: sanitizeText(payload.actionTaken) || null,
        foregroundWindow: {
          appName: appName || null,
          title: title || null,
        },
        goal: `Click desktop element ${matchedText || text || (ordinal ? `#${ordinal}` : 'target')}.`,
        summary: `Clicked desktop element ${matchedText || text || (ordinal ? `#${ordinal}` : 'target')}.`,
        output: matchedText || text || String(ordinal ?? ''),
      } satisfies AlicizationLocalAutomationResult
    }
    catch (error) {
      return {
        channel: 'desktop',
        status: 'failed',
        operation: 'desktop_click_element',
        role,
        text: text || null,
        ordinal,
        exactText,
        errorCode: 'LOCAL_DESKTOP_CLICK_FAILED',
        errorMessage: options.errorMessageFrom(error) ?? 'Failed to click the current desktop element.',
      } satisfies AlicizationLocalAutomationResult
    }
  }

  async function typeDesktopText(input: AlicizationLocalDesktopTypeTextInput) {
    const text = sanitizeText(input.text)
    const targetText = sanitizeText(input.targetText)
    const ordinal = normalizeOrdinal(input.ordinal)
    const exactText = input.exactText === true
    const clearExisting = input.clearExisting === true
    const submit = input.submit === true
    const role = normalizeDesktopRole(input.role) || (targetText || ordinal ? 'input' : '')
    if (!text)
      return buildNotConfiguredResult('desktop_type_text', 'text is required.')
    if (platform !== 'darwin')
      return buildUnsupportedPlatformResult('desktop_type_text')

    let matchedText: string | null = null
    if (targetText || ordinal) {
      const focusResult = await clickDesktopElement({
        abortSignal: input.abortSignal,
        text: targetText || undefined,
        ordinal: ordinal ?? undefined,
        exactText,
        role: role || 'input',
      })
      if (focusResult.status !== 'completed') {
        return {
          ...focusResult,
          operation: 'desktop_type_text',
        }
      }
      matchedText = sanitizeText((focusResult as Record<string, unknown>).matchedText) || null
    }

    try {
      const escapedText = escapeAppleScriptString(text)
      const lines = [
        'tell application "System Events"',
        'set frontApp to first application process whose frontmost is true',
        'set frontmost of frontApp to true',
        clearExisting ? 'keystroke "a" using {command down}' : '',
        clearExisting ? 'key code 51' : '',
        `keystroke "${escapedText}"`,
        submit ? 'key code 36' : '',
        'end tell',
      ].filter(Boolean)
      await runAppleScript(lines, 5_000, input.abortSignal)
      return {
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_type_text',
        role: role || null,
        text,
        targetText: targetText || null,
        ordinal,
        exactText,
        clearExisting,
        submit,
        matchedText,
        goal: `Type text into the current desktop window${targetText ? ` via ${targetText}` : ''}.`,
        summary: `Typed text into the current desktop window${targetText ? ` via ${targetText}` : ''}.`,
        output: text,
      } satisfies AlicizationLocalAutomationResult
    }
    catch (error) {
      return {
        channel: 'desktop',
        status: 'failed',
        operation: 'desktop_type_text',
        role: role || null,
        text,
        targetText: targetText || null,
        ordinal,
        exactText,
        clearExisting,
        submit,
        errorCode: 'LOCAL_DESKTOP_TYPE_TEXT_FAILED',
        errorMessage: options.errorMessageFrom(error) ?? 'Failed to type into the current desktop window.',
      } satisfies AlicizationLocalAutomationResult
    }
  }

  async function pressDesktopKeys(input: AlicizationLocalDesktopPressKeysInput) {
    const shortcut = normalizeDesktopShortcut(input.shortcut)
    const repeat = normalizeDesktopRepeat(input.repeat)
    if (!shortcut)
      return buildNotConfiguredResult('desktop_press_keys', 'shortcut is required.')
    if (platform !== 'darwin')
      return buildUnsupportedPlatformResult('desktop_press_keys')

    const parsed = parseDesktopShortcut(shortcut)
    if (!parsed.key)
      return buildNotConfiguredResult('desktop_press_keys', 'shortcut key is required.')

    try {
      const modifierClause = buildAppleScriptModifierClause(parsed.modifiers)
      const keyCode = desktopSpecialKeyCodeMap[parsed.key]
      const keyLine = typeof keyCode === 'number'
        ? `key code ${keyCode}${modifierClause}`
        : `keystroke "${escapeAppleScriptString(parsed.key)}"${modifierClause}`
      const lines = [
        'tell application "System Events"',
        'set frontApp to first application process whose frontmost is true',
        'set frontmost of frontApp to true',
        ...Array.from({ length: repeat }, () => keyLine),
        'end tell',
      ]
      await runAppleScript(lines, 5_000, input.abortSignal)
      return {
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_press_keys',
        shortcut,
        repeat,
        goal: `Press desktop shortcut ${shortcut}.`,
        summary: `Pressed desktop shortcut ${shortcut}.`,
        output: shortcut,
      } satisfies AlicizationLocalAutomationResult
    }
    catch (error) {
      return {
        channel: 'desktop',
        status: 'failed',
        operation: 'desktop_press_keys',
        shortcut,
        repeat,
        errorCode: 'LOCAL_DESKTOP_PRESS_KEYS_FAILED',
        errorMessage: options.errorMessageFrom(error) ?? 'Failed to press the desktop shortcut.',
      } satisfies AlicizationLocalAutomationResult
    }
  }

  async function openApplication(input: AlicizationLocalDesktopOpenApplicationInput) {
    const appName = sanitizeText(input.appName)
    const path = sanitizeText(input.path)
    const args = Array.isArray(input.args)
      ? input.args.map(value => sanitizeText(value)).filter(Boolean)
      : []
    if (!appName && !path)
      return buildNotConfiguredResult('desktop_open_application', 'appName or path is required.')
    if (platform !== 'darwin')
      return buildUnsupportedPlatformResult('desktop_open_application')

    try {
      const openArgs = appName
        ? ['-a', appName]
        : [path]
      if (args.length > 0)
        openArgs.push('--args', ...args)
      await runCommand('/usr/bin/open', openArgs, 8_000, input.abortSignal)
      return {
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_open_application',
        appName: appName || null,
        path: path || null,
        args,
        goal: `Open local application ${appName || path}.`,
        summary: `Opened application ${appName || path}.`,
        output: appName || path,
      } satisfies AlicizationLocalAutomationResult
    }
    catch (error) {
      return {
        channel: 'desktop',
        status: 'failed',
        operation: 'desktop_open_application',
        appName: appName || null,
        path: path || null,
        args,
        errorCode: 'LOCAL_DESKTOP_OPEN_APPLICATION_FAILED',
        errorMessage: options.errorMessageFrom(error) ?? 'Failed to open the local application.',
      } satisfies AlicizationLocalAutomationResult
    }
  }

  async function resolveCapabilityChannels(): Promise<AlicizationChannelCapability[]> {
    const supported = platform === 'darwin' && existsSync('/usr/bin/open')
    const capability = {
      available: supported,
      enabled: supported,
      ready: supported,
      reason: supported ? null : 'local-desktop-automation-unavailable',
    }

    return localBrowserCapabilityChannels.map(channel => ({
      channel,
      available: capability.available,
      enabled: capability.enabled,
      ready: capability.ready,
      sessionAffinity: channel !== 'desktop',
      reason: capability.reason,
    }))
  }

  return {
    openUrl,
    searchWeb,
    readPage,
    clickElement,
    typeBrowserText,
    navigateBrowser,
    scrollBrowser,
    waitForBrowser,
    waitForDesktop,
    listDesktopInteractables,
    clickDesktopElement,
    typeDesktopText,
    pressDesktopKeys,
    openApplication,
    resolveCapabilityChannels,
  }
}
