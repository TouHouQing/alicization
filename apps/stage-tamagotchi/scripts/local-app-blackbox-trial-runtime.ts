import type { Browser, Page } from 'playwright'

import process from 'node:process'

import { spawn as spawnProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { URL } from 'node:url'

export interface LocalAppBlackboxTrialArgs {
  appPath: string
  userDataPath: string
  outputDir: string
  remoteDebugPort: number
  launchTimeoutMs: number
  turnTimeoutMs: number
  messages: string[]
  attachOnly: boolean
  keepOpen: boolean
  openMemoryWorkbench: boolean
}

export interface LocalAppBlackboxStartupEvidence {
  title: string
  url: string
  readyState: string
  stageReady: boolean
}

export interface LocalAppBlackboxWindowEvidence {
  title: string
  url: string
  visibleText?: string
}

export interface LocalAppBlackboxChatTurnEvidence {
  message: string
  status: 'completed' | 'failed' | 'timed-out'
  firstUiChangeMs: number | null
  settledMs: number
  visibleText: string
  error: string | null
}

export interface LocalAppBlackboxScreenshotEvidence {
  title: string
  url: string
  path: string
}

export interface LocalAppBlackboxDiagnostics {
  processOutput: string[]
  rendererConsole: Array<{
    type: string
    text: string
    url: string
  }>
  pageErrors: Array<{
    message: string
    url: string
  }>
}

export interface LocalAppBlackboxMemoryAssertions {
  cardId: string
  checkpointCount: number
  queue: {
    pending: number
    review: number
    applied: number
    failed: number
    deadLettered: number
  }
  longTerm: {
    factCount: number
    reflectionCount: number
    searchDocumentCount: number
    vectorCount: number
  }
  recall: {
    query: string
    matched: boolean
    matchedIds: string[]
    summaries: string[]
  }
  errors: string[]
}

export interface LocalAppChatDomSnapshot {
  assistantCount: number
  assistantText: string
  errorCount: number
  errorText: string
}

export interface LocalAppBlackboxAutomation {
  launch: () => Promise<{ pid: number | null }>
  connect: () => Promise<void>
  waitForStartup: () => Promise<LocalAppBlackboxStartupEvidence>
  openChat: () => Promise<LocalAppBlackboxWindowEvidence>
  sendChatMessage: (message: string, timeoutMs: number) => Promise<LocalAppBlackboxChatTurnEvidence>
  openMemoryWorkbench: () => Promise<LocalAppBlackboxWindowEvidence>
  captureScreenshots: (outputDir: string) => Promise<LocalAppBlackboxScreenshotEvidence[]>
  collectDiagnostics?: () => Promise<LocalAppBlackboxDiagnostics>
  close: () => Promise<void>
}

export interface LocalAppBlackboxStage {
  id: string
  status: 'succeeded' | 'failed' | 'not-run'
  startedAt: number
  finishedAt: number
  error: string | null
  details: Record<string, unknown>
}

export interface LocalAppBlackboxTrialReport {
  version: 'alicization-local-app-blackbox-trial-v1'
  passed: boolean
  startedAt: number
  finishedAt: number
  appPath: string
  userDataPath: string
  outputDir: string
  summary: {
    requestedMessageCount: number
    completedMessageCount: number
    failedMessageCount: number
    runtimeTraceEventCount: number
    screenshotCount: number
    rendererConsoleEventCount: number
    pageErrorCount: number
    memoryAssertionPassed: boolean | null
    failedStageIds: string[]
    lastError: string | null
  }
  stages: LocalAppBlackboxStage[]
  chatTurns: LocalAppBlackboxChatTurnEvidence[]
  memoryAssertions: LocalAppBlackboxMemoryAssertions | null
  runtimeDebugTrace: Array<Record<string, unknown>>
  screenshots: LocalAppBlackboxScreenshotEvidence[]
  diagnostics: LocalAppBlackboxDiagnostics
}

export interface LocalAppBlackboxTrialDependencies {
  automation: LocalAppBlackboxAutomation
  readRuntimeDebugTrace: (input: {
    path: string
    since: number
  }) => Promise<Array<Record<string, unknown>>>
  writeText?: (path: string, content: string) => Promise<void>
  ensureOutputDir?: (path: string) => Promise<void>
  inspectMemory?: (input: {
    userDataPath: string
    messages: string[]
    chatTurns: LocalAppBlackboxChatTurnEvidence[]
  }) => Promise<LocalAppBlackboxMemoryAssertions>
  now?: () => number
}

function optionValue(args: string[], index: number, name: string) {
  const value = args[index + 1]?.trim()
  if (!value || value.startsWith('--'))
    throw new Error(`选项 ${name} 需要一个值。`)
  return value
}

function positiveInteger(value: string, name: string) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error(`选项 ${name} 必须是正整数。`)
  return parsed
}

export function parseLocalAppBlackboxTrialArgs(
  rawArgs: string[],
  defaults: {
    homeDir?: string
    now?: () => number
  } = {},
): LocalAppBlackboxTrialArgs {
  const home = defaults.homeDir ?? homedir()
  const timestamp = new Date((defaults.now ?? (() => Date.now()))())
    .toISOString()
    .replace(/[.:]/g, '-')
  let appPath = join(home, 'Applications', 'Alicization Local.app')
  let userDataPath = join(home, 'Library', 'Application Support', 'com.tohoqing.alicization')
  let outputDir = join(home, 'Desktop', 'Alicization-Blackbox-Traces', timestamp)
  let remoteDebugPort = 9222
  let launchTimeoutMs = 45_000
  let turnTimeoutMs = 120_000
  const messages: string[] = []
  let attachOnly = false
  let keepOpen = false
  let openMemoryWorkbench = true

  for (let index = 0; index < rawArgs.length; index += 1) {
    const argument = rawArgs[index]
    if (!argument || argument === '--')
      continue

    const [rawName, inlineValue] = argument.split('=', 2)
    const name = rawName.trim()
    const value = inlineValue?.trim() || null
    const readValue = () => value ?? optionValue(rawArgs, index++, name)

    if (name === '--app') {
      appPath = readValue()
      continue
    }
    if (name === '--user-data-path') {
      userDataPath = readValue()
      continue
    }
    if (name === '--output') {
      outputDir = readValue()
      continue
    }
    if (name === '--port') {
      remoteDebugPort = positiveInteger(readValue(), name)
      continue
    }
    if (name === '--launch-timeout-ms') {
      launchTimeoutMs = positiveInteger(readValue(), name)
      continue
    }
    if (name === '--turn-timeout-ms') {
      turnTimeoutMs = positiveInteger(readValue(), name)
      continue
    }
    if (name === '--message') {
      messages.push(readValue())
      continue
    }
    if (name === '--attach') {
      attachOnly = true
      continue
    }
    if (name === '--keep-open') {
      keepOpen = true
      continue
    }
    if (name === '--no-memory-workbench') {
      openMemoryWorkbench = false
      continue
    }
    if (name === '--help' || name === '-h')
      continue
    throw new Error(`不支持的选项：${name}。`)
  }

  if (remoteDebugPort > 65535)
    throw new Error('选项 --port 必须小于或等于 65535。')

  return {
    appPath,
    userDataPath,
    outputDir,
    remoteDebugPort,
    launchTimeoutMs,
    turnTimeoutMs,
    messages,
    attachOnly,
    keepOpen,
    openMemoryWorkbench,
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export async function readRuntimeDebugTraceSince(
  path: string,
  since: number,
  readText: (path: string) => Promise<string> = async inputPath =>
    await readFile(inputPath, 'utf8'),
) {
  let content = ''
  try {
    content = await readText(path)
  }
  catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code
    if (code === 'ENOENT')
      return []
    throw error
  }

  return content
    .split(/\r?\n/u)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>
        const timestamp = typeof parsed.ts === 'string'
          ? Date.parse(parsed.ts)
          : Number.NaN
        if (Number.isFinite(timestamp) && timestamp < since)
          return null
        return parsed
      }
      catch {
        return {
          event: 'runtime-debug.parse-failed',
          raw: line,
        }
      }
    })
    .filter((entry): entry is Record<string, unknown> => entry !== null)
}

interface LocalAppBlackboxChildProcess {
  pid?: number
  killed: boolean
  stdout: {
    on: (event: 'data', listener: (chunk: unknown) => void) => unknown
  }
  stderr: {
    on: (event: 'data', listener: (chunk: unknown) => void) => unknown
  }
  kill: (signal?: NodeJS.Signals | number) => boolean
}

type SpawnLike = (
  command: string,
  args: readonly string[],
  options: {
    env: NodeJS.ProcessEnv
    stdio: ['ignore', 'pipe', 'pipe']
  },
) => LocalAppBlackboxChildProcess

function sanitizeArtifactName(value: string, fallback: string) {
  const normalized = value
    .trim()
    .replace(/[^\w-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return normalized || fallback
}

function textTail(value: string, maxChars = 6_000) {
  const normalized = value.trim()
  return normalized.length <= maxChars
    ? normalized
    : normalized.slice(normalized.length - maxChars)
}

export function resolveLocalAppChatTurnState(input: {
  before: LocalAppChatDomSnapshot
  current: LocalAppChatDomSnapshot
  inputValue: string
  stopVisible: boolean
  stableForMs: number
}) {
  if (input.inputValue !== '' || input.stopVisible || input.stableForMs < 750) {
    return {
      status: 'pending' as const,
      error: null,
    }
  }

  const errorChanged = input.current.errorCount > input.before.errorCount
    || (
      input.current.errorCount === input.before.errorCount
      && input.current.errorText !== input.before.errorText
    )
  if (errorChanged && input.current.errorText.trim()) {
    return {
      status: 'failed' as const,
      error: input.current.errorText.trim(),
    }
  }

  const assistantChanged = input.current.assistantCount > input.before.assistantCount
    || (
      input.current.assistantCount === input.before.assistantCount
      && input.current.assistantText !== input.before.assistantText
    )
  if (assistantChanged && input.current.assistantText.trim()) {
    return {
      status: 'completed' as const,
      error: null,
    }
  }

  return {
    status: 'pending' as const,
    error: null,
  }
}

export function isLocalAppMainRendererUrl(value: string) {
  try {
    const url = new URL(value)
    return url.pathname.endsWith('/index.html')
      && (url.hash === '' || url.hash === '#' || url.hash === '#/')
  }
  catch {
    return false
  }
}

export function localAppIconButtonXPath(iconAttribute: string) {
  return `xpath=//button[descendant::*[@*[name()="${iconAttribute}"]]]`
}

export async function navigateLocalAppPageToHashRoute(
  page: Page,
  route: string,
  timeoutMs: number,
) {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`
  const expectedHash = `#${normalizedRoute}`
  await page.waitForLoadState('domcontentloaded', {
    timeout: timeoutMs,
  })
  await page.waitForFunction(
    () => {
      const scope = globalThis as unknown as {
        document: {
          querySelector: (selector: string) => {
            childElementCount: number
          } | null
        }
      }
      return (scope.document.querySelector('#app')?.childElementCount ?? 0) > 0
    },
    undefined,
    { timeout: timeoutMs },
  )
  await page.evaluate((hash) => {
    const scope = globalThis as unknown as {
      location: {
        hash: string
      }
    }
    scope.location.hash = hash
  }, expectedHash)
  await page.waitForURL(
    url => url.hash === expectedHash,
    { timeout: timeoutMs },
  )
  if (new URL(page.url()).hash !== expectedHash)
    throw new Error(`页面未停留在目标路由：${expectedHash}`)
}

export function createPlaywrightLocalAppBlackboxAutomation(input: {
  args: LocalAppBlackboxTrialArgs
  spawn?: SpawnLike
  pathExists?: (path: string) => boolean
  connectOverCDP: (endpoint: string) => Promise<Browser>
  sleep?: (ms: number) => Promise<unknown>
}): LocalAppBlackboxAutomation {
  const spawn = input.spawn ?? ((command, args, options) =>
    spawnProcess(command, args, options) as LocalAppBlackboxChildProcess)
  const pathExists = input.pathExists ?? existsSync
  const wait = input.sleep ?? (async ms => await sleep(ms))
  const endpoint = `http://127.0.0.1:${input.args.remoteDebugPort}`
  const executablePath = join(
    input.args.appPath,
    'Contents',
    'MacOS',
    'alicization',
  )
  const processOutput: string[] = []
  const rendererConsole: LocalAppBlackboxDiagnostics['rendererConsole'] = []
  const pageErrors: LocalAppBlackboxDiagnostics['pageErrors'] = []
  const boundPages = new WeakSet<object>()
  let appProcess: LocalAppBlackboxChildProcess | null = null
  let browser: Browser | null = null

  const bindPage = (page: Page) => {
    if (boundPages.has(page))
      return
    boundPages.add(page)
    page.on('console', (message) => {
      rendererConsole.push({
        type: message.type(),
        text: message.text(),
        url: page.url(),
      })
    })
    page.on('pageerror', (error) => {
      pageErrors.push({
        message: error.message,
        url: page.url(),
      })
    })
  }

  const pages = () => {
    const result = browser?.contexts().flatMap(context => context.pages()) ?? []
    for (const page of result)
      bindPage(page)
    return result
  }

  const waitForPage = async (
    predicate: (page: Page) => boolean,
    timeoutMs = input.args.launchTimeoutMs,
  ) => {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const page = pages().find(predicate)
      if (page)
        return page
      await wait(100)
    }
    throw new Error(`等待 App 窗口超时（${timeoutMs}ms）。`)
  }

  const summarizePage = async (page: Page) => ({
    title: await page.title(),
    url: page.url(),
  })

  const mainPage = async () => await waitForPage(page =>
    isLocalAppMainRendererUrl(page.url()),
  )

  const readChatDomSnapshot = async (page: Page): Promise<LocalAppChatDomSnapshot> => {
    const assistantMessages = page.locator('[data-chat-message-role="assistant"]')
    const errorMessages = page.locator('[data-chat-message-role="error"]')
    const [assistantCount, errorCount] = await Promise.all([
      assistantMessages.count(),
      errorMessages.count(),
    ])
    const [assistantText, errorText] = await Promise.all([
      assistantCount > 0
        ? assistantMessages.nth(assistantCount - 1).textContent()
        : Promise.resolve(''),
      errorCount > 0
        ? errorMessages.nth(errorCount - 1).textContent()
        : Promise.resolve(''),
    ])
    return {
      assistantCount,
      assistantText: assistantText?.trim() ?? '',
      errorCount,
      errorText: errorText?.trim() ?? '',
    }
  }

  return {
    async launch() {
      if (!pathExists(executablePath))
        throw new Error(`找不到可执行的本地 App：${executablePath}`)

      // Electron reads this switch before app code starts, so the trial is
      // isolated from the user's normal profile and its database.
      await mkdir(input.args.userDataPath, {
        recursive: true,
        mode: 0o700,
      })
      appProcess = spawn(executablePath, [
        '--user-data-dir',
        input.args.userDataPath,
      ], {
        env: {
          ...process.env,
          ALICIZATION_USER_DATA_PATH: input.args.userDataPath,
          APP_REMOTE_DEBUG: 'true',
          APP_REMOTE_DEBUG_PORT: String(input.args.remoteDebugPort),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      appProcess.stdout.on('data', chunk =>
        processOutput.push(`[stdout] ${String(chunk).trimEnd()}`))
      appProcess.stderr.on('data', chunk =>
        processOutput.push(`[stderr] ${String(chunk).trimEnd()}`))
      return {
        pid: appProcess.pid ?? null,
      }
    },

    async connect() {
      const deadline = Date.now() + input.args.launchTimeoutMs
      let lastError: unknown = null
      while (Date.now() < deadline) {
        try {
          browser = await input.connectOverCDP(endpoint)
          for (const context of browser.contexts()) {
            context.on('page', bindPage)
            for (const page of context.pages())
              bindPage(page)
          }
          return
        }
        catch (error) {
          lastError = error
          await wait(200)
        }
      }
      throw new Error([
        `无法连接 App 远程调试端点：${endpoint}`,
        lastError ? errorMessage(lastError) : '未发现可调试窗口。',
      ].join('\n'))
    },

    async waitForStartup() {
      const page = await mainPage()
      await page.waitForLoadState('domcontentloaded', {
        timeout: input.args.launchTimeoutMs,
      })
      await page.waitForFunction(
        () => {
          const scope = globalThis as unknown as {
            document: {
              readyState: string
              documentElement: {
                dataset: Record<string, string | undefined>
              }
            }
          }
          return scope.document.readyState === 'complete'
            && scope.document.documentElement.dataset.alicizationStagePageReady === 'true'
        },
        undefined,
        { timeout: input.args.launchTimeoutMs },
      )
      const state = await page.evaluate(() => {
        const scope = globalThis as unknown as {
          document: {
            readyState: string
            documentElement: {
              dataset: Record<string, string | undefined>
            }
          }
        }
        return {
          readyState: scope.document.readyState,
          stageReady: scope.document.documentElement.dataset.alicizationStagePageReady === 'true',
        }
      })
      return {
        ...(await summarizePage(page)),
        readyState: state.readyState,
        stageReady: state.stageReady,
      }
    },

    async openChat() {
      const existing = pages().find(page => page.url().includes('#/chat'))
      if (existing)
        return await summarizePage(existing)

      const page = await mainPage()
      const expandButton = page.locator(
        localAppIconButtonXPath('i-solar:alt-arrow-up-line-duotone'),
      )
      await expandButton.click({
        timeout: input.args.launchTimeoutMs,
      })
      const chatButton = page.locator(
        localAppIconButtonXPath('i-solar:chat-line-line-duotone'),
      )
      await chatButton.click({
        timeout: input.args.launchTimeoutMs,
      })
      const chatPage = await waitForPage(
        candidate => candidate.url().includes('#/chat'),
        input.args.launchTimeoutMs,
      )
      await chatPage.waitForLoadState('domcontentloaded', {
        timeout: input.args.launchTimeoutMs,
      })
      return await summarizePage(chatPage)
    },

    async sendChatMessage(message, timeoutMs) {
      const page = await waitForPage(
        candidate => candidate.url().includes('#/chat'),
        input.args.launchTimeoutMs,
      )
      const textarea = page.locator('textarea').last()
      await textarea.waitFor({
        state: 'visible',
        timeout: input.args.launchTimeoutMs,
      })
      // Visible evidence must exclude hidden boot fallbacks and inline scripts.
      // eslint-disable-next-line unicorn/prefer-dom-node-text-content
      const beforeText = await page.locator('body').innerText()
      const beforeChat = await readChatDomSnapshot(page)
      const startedAt = Date.now()
      let firstUiChangeMs: number | null = null
      let stableSince: number | null = null
      let previousText = beforeText
      let previousChat = beforeChat
      await textarea.fill(message)
      await textarea.press('Enter')

      while (Date.now() - startedAt < timeoutMs) {
        const [bodyText, inputValue, stopVisible, currentChat] = await Promise.all([
          // eslint-disable-next-line unicorn/prefer-dom-node-text-content
          page.locator('body').innerText(),
          textarea.inputValue(),
          page
            .locator(localAppIconButtonXPath('i-solar:stop-circle-linear'))
            .isVisible()
            .catch(() => false),
          readChatDomSnapshot(page),
        ])
        const changed = bodyText !== beforeText || inputValue !== message || stopVisible
        if (changed && firstUiChangeMs === null)
          firstUiChangeMs = Date.now() - startedAt

        const chatChanged = currentChat.assistantCount !== previousChat.assistantCount
          || currentChat.assistantText !== previousChat.assistantText
          || currentChat.errorCount !== previousChat.errorCount
          || currentChat.errorText !== previousChat.errorText
        if (bodyText !== previousText || chatChanged) {
          previousText = bodyText
          previousChat = currentChat
          stableSince = Date.now()
        }

        const turnState = resolveLocalAppChatTurnState({
          before: beforeChat,
          current: currentChat,
          inputValue,
          stopVisible,
          stableForMs: stableSince === null ? 0 : Date.now() - stableSince,
        })
        if (turnState.status !== 'pending') {
          return {
            message,
            status: turnState.status,
            firstUiChangeMs,
            settledMs: Date.now() - startedAt,
            visibleText: textTail(bodyText),
            error: turnState.error,
          }
        }

        await wait(200)
      }

      const [visibleText, restoredInput] = await Promise.all([
        // eslint-disable-next-line unicorn/prefer-dom-node-text-content
        page.locator('body').innerText(),
        textarea.inputValue(),
      ])
      const timedOut = restoredInput !== message
      return {
        message,
        status: timedOut ? 'timed-out' : 'failed',
        firstUiChangeMs,
        settledMs: Date.now() - startedAt,
        visibleText: textTail(visibleText),
        error: timedOut
          ? `等待对话完成超时（${timeoutMs}ms）。`
          : '消息输入被恢复，发送链路未接受本轮对话。',
      }
    },

    async openMemoryWorkbench() {
      let settingsPage = pages().find(page => page.url().includes('#/settings'))
      if (!settingsPage) {
        const page = await mainPage()
        const settingsButton = page
          .locator(localAppIconButtonXPath('i-solar:settings-minimalistic-outline'))
          .last()
        await settingsButton.click({
          timeout: input.args.launchTimeoutMs,
        })
        settingsPage = await waitForPage(
          candidate => candidate.url().includes('#/settings'),
          input.args.launchTimeoutMs,
        )
      }
      bindPage(settingsPage)
      await navigateLocalAppPageToHashRoute(
        settingsPage,
        '/settings/modules/memory',
        input.args.launchTimeoutMs,
      )
      return {
        ...(await summarizePage(settingsPage)),
        // eslint-disable-next-line unicorn/prefer-dom-node-text-content
        visibleText: textTail(await settingsPage.locator('body').innerText()),
      }
    },

    async captureScreenshots(outputDir) {
      await mkdir(outputDir, {
        recursive: true,
        mode: 0o700,
      })
      const screenshots: LocalAppBlackboxScreenshotEvidence[] = []
      for (const [index, page] of pages().entries()) {
        const title = await page.title()
        const name = sanitizeArtifactName(
          title || basename(page.url()),
          `window-${index + 1}`,
        )
        const path = join(outputDir, `${index + 1}-${name}.png`)
        await page.screenshot({
          path,
          fullPage: true,
        })
        screenshots.push({
          title,
          url: page.url(),
          path,
        })
      }
      return screenshots
    },

    async collectDiagnostics() {
      return {
        processOutput: [...processOutput],
        rendererConsole: [...rendererConsole],
        pageErrors: [...pageErrors],
      }
    },

    async close() {
      if (appProcess && !appProcess.killed)
        appProcess.kill('SIGTERM')
      appProcess = null
      browser = null
    },
  }
}

export async function runLocalAppBlackboxTrial(
  input: {
    args: LocalAppBlackboxTrialArgs
  } & LocalAppBlackboxTrialDependencies,
): Promise<LocalAppBlackboxTrialReport> {
  const now = input.now ?? (() => Date.now())
  const writeText = input.writeText ?? (async (path, content) => {
    await writeFile(path, content, {
      encoding: 'utf8',
      mode: 0o600,
    })
  })
  const ensureOutputDir = input.ensureOutputDir ?? (async path => await mkdir(path, {
    recursive: true,
    mode: 0o700,
  }))
  const stages: LocalAppBlackboxStage[] = []
  const chatTurns: LocalAppBlackboxChatTurnEvidence[] = []
  let memoryAssertions: LocalAppBlackboxMemoryAssertions | null = null
  let runtimeDebugTrace: Array<Record<string, unknown>> = []
  let screenshots: LocalAppBlackboxScreenshotEvidence[] = []
  let diagnostics: LocalAppBlackboxDiagnostics = {
    processOutput: [],
    rendererConsole: [],
    pageErrors: [],
  }
  const startedAt = now()

  await ensureOutputDir(input.args.outputDir)

  const stageDetails = (value: unknown): Record<string, unknown> => {
    if (value && typeof value === 'object' && !Array.isArray(value))
      return { ...value }
    return {
      value,
    }
  }

  const recordStage = async (
    id: string,
    action: () => Promise<unknown>,
  ) => {
    const stageStartedAt = now()
    try {
      const details = stageDetails(await action())
      stages.push({
        id,
        status: 'succeeded',
        startedAt: stageStartedAt,
        finishedAt: now(),
        error: null,
        details,
      })
      return true
    }
    catch (error) {
      stages.push({
        id,
        status: 'failed',
        startedAt: stageStartedAt,
        finishedAt: now(),
        error: errorMessage(error),
        details: {},
      })
      return false
    }
  }

  try {
    if (input.args.attachOnly) {
      stages.push({
        id: 'app-launch',
        status: 'not-run',
        startedAt,
        finishedAt: now(),
        error: null,
        details: {
          reason: 'attach-only',
        },
      })
    }
    else {
      await recordStage('app-launch', async () => await input.automation.launch())
    }

    const attached = await recordStage('remote-debug-attach', async () => {
      await input.automation.connect()
      return {
        endpoint: `http://127.0.0.1:${input.args.remoteDebugPort}`,
      }
    })
    if (attached) {
      await recordStage('stage-startup', async () => await input.automation.waitForStartup())
      const chatOpened = await recordStage('chat-window', async () => await input.automation.openChat())
      if (chatOpened) {
        for (const [index, message] of input.args.messages.entries()) {
          const stageId = `chat-message-${index + 1}`
          const stageStartedAt = now()
          try {
            const evidence = await input.automation.sendChatMessage(
              message,
              input.args.turnTimeoutMs,
            )
            chatTurns.push(evidence)
            stages.push({
              id: stageId,
              status: evidence.status === 'completed' ? 'succeeded' : 'failed',
              startedAt: stageStartedAt,
              finishedAt: now(),
              error: evidence.error,
              details: {
                message,
                status: evidence.status,
                firstUiChangeMs: evidence.firstUiChangeMs,
                settledMs: evidence.settledMs,
                visibleText: evidence.visibleText,
              },
            })
          }
          catch (error) {
            const messageText = errorMessage(error)
            chatTurns.push({
              message,
              status: 'failed',
              firstUiChangeMs: null,
              settledMs: Math.max(0, now() - stageStartedAt),
              visibleText: '',
              error: messageText,
            })
            stages.push({
              id: stageId,
              status: 'failed',
              startedAt: stageStartedAt,
              finishedAt: now(),
              error: messageText,
              details: {
                message,
              },
            })
          }
        }
      }

      if (input.inspectMemory) {
        await recordStage('memory-closure', async () => {
          const assertions = await input.inspectMemory!({
            userDataPath: input.args.userDataPath,
            messages: [...input.args.messages],
            chatTurns: [...chatTurns],
          })
          memoryAssertions = assertions
          const assertionErrors = [
            ...assertions.errors,
            ...(!assertions.recall.matched
              ? [`长期记忆召回未命中：${assertions.recall.query}`]
              : []),
          ]
          if (assertionErrors.length > 0)
            throw new Error(assertionErrors.join('\n'))
          return {
            cardId: assertions.cardId,
            checkpointCount: assertions.checkpointCount,
            queue: assertions.queue,
            longTerm: assertions.longTerm,
            recallMatched: assertions.recall.matched,
          }
        })
      }

      if (input.args.openMemoryWorkbench) {
        await recordStage(
          'memory-workbench',
          async () => await input.automation.openMemoryWorkbench(),
        )
      }
      else {
        stages.push({
          id: 'memory-workbench',
          status: 'not-run',
          startedAt: now(),
          finishedAt: now(),
          error: null,
          details: {
            reason: 'disabled',
          },
        })
      }
    }

    await recordStage('runtime-debug-trace', async () => {
      runtimeDebugTrace = await input.readRuntimeDebugTrace({
        path: join(input.args.userDataPath, 'alicizations', 'runtime-debug.log'),
        since: startedAt,
      })
      await writeText(
        join(input.args.outputDir, 'runtime-debug.jsonl'),
        runtimeDebugTrace.map(entry => JSON.stringify(entry)).join('\n')
        + (runtimeDebugTrace.length > 0 ? '\n' : ''),
      )
      return {
        eventCount: runtimeDebugTrace.length,
      }
    })

    if (attached) {
      await recordStage('screenshots', async () => {
        screenshots = await input.automation.captureScreenshots(input.args.outputDir)
        return {
          screenshotCount: screenshots.length,
          paths: screenshots.map(screenshot => screenshot.path),
        }
      })
    }

    diagnostics = await input.automation.collectDiagnostics?.() ?? diagnostics
    await writeText(
      join(input.args.outputDir, 'app-process.log'),
      diagnostics.processOutput.join('\n')
      + (diagnostics.processOutput.length > 0 ? '\n' : ''),
    )
    await writeText(
      join(input.args.outputDir, 'renderer-console.jsonl'),
      diagnostics.rendererConsole.map(entry => JSON.stringify(entry)).join('\n')
      + (diagnostics.rendererConsole.length > 0 ? '\n' : ''),
    )
    await writeText(
      join(input.args.outputDir, 'page-errors.jsonl'),
      diagnostics.pageErrors.map(entry => JSON.stringify(entry)).join('\n')
      + (diagnostics.pageErrors.length > 0 ? '\n' : ''),
    )
  }
  finally {
    if (!input.args.keepOpen)
      await input.automation.close().catch(() => {})
  }

  const finishedAt = now()
  const failedStages = stages.filter(stage => stage.status === 'failed')
  const report: LocalAppBlackboxTrialReport = {
    version: 'alicization-local-app-blackbox-trial-v1',
    passed: failedStages.length === 0,
    startedAt,
    finishedAt,
    appPath: input.args.appPath,
    userDataPath: input.args.userDataPath,
    outputDir: input.args.outputDir,
    summary: {
      requestedMessageCount: input.args.messages.length,
      completedMessageCount: chatTurns.filter(turn => turn.status === 'completed').length,
      failedMessageCount: chatTurns.filter(turn => turn.status !== 'completed').length,
      runtimeTraceEventCount: runtimeDebugTrace.length,
      screenshotCount: screenshots.length,
      rendererConsoleEventCount: diagnostics.rendererConsole.length,
      pageErrorCount: diagnostics.pageErrors.length,
      memoryAssertionPassed: memoryAssertions
        ? failedStages.every(stage => stage.id !== 'memory-closure')
        : null,
      failedStageIds: failedStages.map(stage => stage.id),
      lastError: failedStages.at(-1)?.error ?? null,
    },
    stages,
    chatTurns,
    memoryAssertions,
    runtimeDebugTrace,
    screenshots,
    diagnostics,
  }
  await writeText(
    join(input.args.outputDir, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  )
  return report
}
