import type {
  AlicizationExecutionRoutingChannel,
  AlicizationExecutorToolName,
} from '@proj-alicization/stage-shared'

import type { AlicizationSensoryCaptureSnapshot } from '../../../shared/eventa'
import type { AlicizationPerceptionBrowserWorkflowState } from './attention-anchor'
import type {
  AlicizationScreenSemanticFocusTarget,
  AlicizationScreenSemanticSummary,
} from './proactive-screen-semantic'

import { resolveAlicizationKnownWebsiteInText } from '@proj-alicization/stage-shared'

export interface AlicizationLocalDesktopInspectSceneInput {
  autoContinueSuggestedActions?: boolean
  cardId?: string
  forceRefresh?: boolean
  maxAutoContinueSteps?: number
  maxSuggestedActions?: number
  question?: string
}

export interface AlicizationLocalDesktopInspectionSuggestedAction {
  arguments?: Record<string, unknown>
  kind: string
  rationale: string
  title: string
  toolName?: string
}

export interface AlicizationLocalDesktopInspectionInteractable {
  actions?: string[]
  axRole?: string | null
  enabled?: boolean | null
  ordinal?: number | null
  role?: string | null
  text?: string | null
}

export interface AlicizationLocalDesktopInspectionGuiCandidate {
  enabled: boolean
  ordinal: number | null
  role: string
  text: string | null
}

export interface AlicizationLocalDesktopInspectionGuiStructure {
  enabledInteractableCount: number
  interactableCount: number
  primaryActionCandidates: AlicizationLocalDesktopInspectionGuiCandidate[]
  primaryInputCandidates: AlicizationLocalDesktopInspectionGuiCandidate[]
  roleCounts: Record<string, number>
}

export interface AlicizationLocalDesktopInspectionBrowserInteractable {
  ariaLabel?: string | null
  disabled?: boolean | null
  href?: string | null
  role?: string | null
  tag?: string | null
  text?: string | null
  title?: string | null
  type?: string | null
}

export interface AlicizationLocalDesktopInspectionBrowserScrollState {
  canScrollDown?: boolean | null
  canScrollUp?: boolean | null
  documentHeight?: number | null
  offsetY?: number | null
  viewportHeight?: number | null
}

export interface AlicizationLocalDesktopInspectionBrowserPageContext {
  browser: string
  interactables: AlicizationLocalDesktopInspectionBrowserInteractable[]
  scrollState?: AlicizationLocalDesktopInspectionBrowserScrollState | null
  textExcerpt: string | null
  title: string | null
  url: string | null
}

export type AlicizationLocalDesktopInspectionPagePhase
  = | 'unknown'
    | 'login'
    | 'search-results'
    | 'social-feed'
    | 'browser-desktop-handoff'
    | 'content-detail'
    | 'form-entry'
    | 'upload-flow'

export type AlicizationLocalDesktopInspectionNextActionIntent
  = | 'unknown'
    | 'authenticate'
    | 'open-search-result'
    | 'compose-post'
    | 'continue-browsing'
    | 'continue-desktop-navigation'
    | 'fill-form'
    | 'confirm-dialog'
    | 'focus-address-bar'
    | 'open-app'
    | 'open-application'
    | 'open-result'
    | 'search-contact'
    | 'search-web'
    | 'toggle-setting'
    | 'upload-media'

export type AlicizationLocalDesktopInspectionWorkflowContinuationMode
  = | 'ready-to-act'
    | 'await-host-input'
    | 'handoff-to-desktop'
    | 'observe-and-recheck'

export type AlicizationLocalDesktopInspectionWorkflowStepStatus
  = | 'ready'
    | 'pending'
    | 'blocked'

export interface AlicizationLocalDesktopInspectionWorkflowStep {
  arguments?: Record<string, unknown>
  id: string
  postActionExpectedPhase?: AlicizationLocalDesktopInspectionPagePhase
  rationale: string
  status: AlicizationLocalDesktopInspectionWorkflowStepStatus
  title: string
  toolName?: AlicizationExecutorToolName
}

export interface AlicizationLocalDesktopInspectionWorkflowPlan {
  advanceCondition: string
  blockingReasons: string[]
  completionSignals: string[]
  continuationMode: AlicizationLocalDesktopInspectionWorkflowContinuationMode
  failureCondition: string
  repairActions: AlicizationLocalDesktopInspectionSuggestedAction[]
  reentryHint: string
  steps: AlicizationLocalDesktopInspectionWorkflowStep[]
  targetPhase: AlicizationLocalDesktopInspectionPagePhase
}

export type AlicizationLocalDesktopInspectionExecutionMode
  = | 'browser-dom'
    | 'browser-desktop-handoff'
    | 'coding-investigation'
    | 'terminal-investigation'
    | 'desktop-dialog'
    | 'scene-stabilization'

export interface AlicizationLocalDesktopInspectionExecutionStrategy {
  confidence: number
  mode: AlicizationLocalDesktopInspectionExecutionMode
  rationale: string
  recommendedChannel: AlicizationExecutionRoutingChannel
  recommendedToolNames: AlicizationExecutorToolName[]
}

export interface AlicizationLocalDesktopInspectionSceneSnapshot {
  browserPageContext: AlicizationLocalDesktopInspectionBrowserPageContext | null
  blockingSignals: string[]
  capture: AlicizationSensoryCaptureSnapshot | null
  executionStrategy: AlicizationLocalDesktopInspectionExecutionStrategy
  focusTarget: AlicizationScreenSemanticFocusTarget | null
  foregroundWindow: {
    appName?: string
    pid?: number | null
    processName?: string
    title?: string
  } | null
  guiStructure: AlicizationLocalDesktopInspectionGuiStructure | null
  interactables: AlicizationLocalDesktopInspectionInteractable[]
  nextActionIntent: AlicizationLocalDesktopInspectionNextActionIntent
  pagePhase: AlicizationLocalDesktopInspectionPagePhase
  question: string | null
  screenSemanticSummary: AlicizationScreenSemanticSummary | null
  suggestedActions: AlicizationLocalDesktopInspectionSuggestedAction[]
  unavailableReason: string | null
  workflowPlan: AlicizationLocalDesktopInspectionWorkflowPlan
  workflowState: AlicizationPerceptionBrowserWorkflowState | null
}

function sanitizeText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function clampSuggestedActionCount(raw: number | undefined) {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return 3
  return Math.max(1, Math.min(5, Math.floor(raw)))
}

function clampConfidence(raw: number) {
  if (!Number.isFinite(raw))
    return 0
  return Math.max(0, Math.min(1, Number(raw.toFixed(2))))
}

function buildExecutionStrategyPrompt(input: {
  focusTarget?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  summary?: AlicizationScreenSemanticSummary | null
}) {
  const focusLabel = describeTarget(input.focusTarget) || '当前前台界面'
  const workloadKind = input.summary?.workload.kind ?? 'unknown'
  const contentKind = input.summary?.content.kind ?? 'unknown'
  const summaryLabel = sanitizeText(input.summary?.content.summary, 160)
  const parts = [
    `Investigate visible ${workloadKind}/${contentKind} scene around ${focusLabel}.`,
  ]
  if (summaryLabel)
    parts.push(`Visible summary: ${summaryLabel}.`)
  parts.push('Decide the next grounded debugging step from the current on-screen context.')
  return parts.join(' ')
}

function buildExecutorFollowUpArguments(input: {
  inspectionQuestion: string
}) {
  return {
    autoContinueSuggestedActions: true,
    maxAutoContinueSteps: 1,
    reinspectAfterAction: true,
    inspectionMaxSuggestedActions: 3,
    inspectionQuestion: sanitizeText(input.inspectionQuestion, 220) || undefined,
  } satisfies Record<string, unknown>
}

function buildLocalVisualEntryFollowUpArguments(input: {
  expectedPhase?: AlicizationLocalDesktopInspectionPagePhase | null
  inspectionQuestion: string
}) {
  return {
    autoContinueSuggestedActions: true,
    maxAutoContinueSteps: 1,
    reinspectAfterAction: true,
    expectedPhase: input.expectedPhase ?? undefined,
    inspectionMaxSuggestedActions: 3,
    inspectionQuestion: sanitizeText(input.inspectionQuestion, 220) || undefined,
  } satisfies Record<string, unknown>
}

function trimRequestedActionTarget(raw: string) {
  return sanitizeText(raw, 220)
    .replace(/^[“”"'`【】「」[\]()]+|[“”"'`【】「」[\]()]+$/gu, '')
    .replace(/^(?:请|麻烦|帮我|帮忙|请你|拜托)+/u, '')
    .replace(/^(?:打开|访问|前往|进入|去|启动|运行|open|visit|go\s+to|launch)\s*/iu, '')
    .replace(/(?:然后|并且|并|再|后面|后续).*$/u, '')
    .replace(/(?:里|中|上的?|中的?)$/u, '')
    .trim()
}

function questionSignalsOpenRequest(question: string) {
  return /打开|访问|前往|进入|去|启动|运行|open|visit|go\s+to|launch/iu.test(question)
}

function questionSignalsBrowserSearchRequest(question: string) {
  return /百度搜索(?!结果)|谷歌搜索(?!结果)|google search(?! results?)|bing search(?! results?)|duckduckgo|duck\s+duck\s+go|web search(?! results?)|搜索一下|搜索(?!结果)|搜一下|搜一搜|搜个|上网搜|百度一下|google 一下|bing 一下/iu.test(question)
}

function questionMentionsExplicitSearchEngine(question: string) {
  return /百度|谷歌|google|bing|duckduckgo|duck\s+duck\s+go/iu.test(question)
}

function detectRequestedSearchEngine(question: string) {
  if (/百度/u.test(question))
    return 'baidu' as const
  if (/谷歌|google/iu.test(question))
    return 'google' as const
  if (/bing/iu.test(question))
    return 'bing' as const
  if (/duckduckgo|duck\s+duck\s+go/iu.test(question))
    return 'duckduckgo' as const
  return /[\u4E00-\u9FFF]/u.test(question)
    ? 'baidu' as const
    : undefined
}

function extractRequestedSearchQuery(question: string) {
  const matched = question.match(/(?:百度|谷歌|google|bing|duckduckgo|duck\s+duck\s+go)(?:一下)?\s*(.+)$/iu)?.[1]
    ?? question.match(/(?:搜索(?:一下)?(?!结果)|搜(?:一下|一搜|个)?|web\s+search(?! results?)|上网搜)\s*(.+)$/iu)?.[1]
    ?? question.match(/查(?:一下)?(?:网页|网上)?(.+)$/u)?.[1]
    ?? ''
  const normalized = trimRequestedActionTarget(matched)
    .replace(/^(?:一下|搜索|搜|查一下|查)\s*/u, '')
    .trim()
  return normalized || null
}

function normalizeRequestedUrl(raw: string) {
  const normalized = sanitizeText(raw, 320).replace(/[).,!?！？，。]+$/u, '')
  if (!normalized)
    return null
  return /^www\./iu.test(normalized)
    ? `https://${normalized}`
    : normalized
}

function extractRequestedBrowserUrl(question: string) {
  const matched = question.match(/(?:https?:\/\/|www\.)[^\s"'`]+/iu)?.[0] ?? ''
  return normalizeRequestedUrl(matched)
}

function detectRequestedBrowser(question: string) {
  if (/chrome|google chrome|谷歌浏览器/iu.test(question))
    return 'chrome' as const
  if (/safari/iu.test(question))
    return 'safari' as const
  if (/浏览器|\bbrowser\b/iu.test(question))
    return 'default' as const
  return undefined
}

function questionSignalsBrowserNavigateRequest(question: string) {
  return /返回(?:(?:当前|这个)?(?:网页|页面))?到?上一页|后退|前进|刷新(?:一下)?(?:当前|这个)?(?:页面|网页)?|重新加载(?:当前|这个)?(?:页面|网页)?|reload|refresh|go\s+back|go\s+forward/iu.test(question)
}

function detectRequestedBrowserNavigateAction(question: string) {
  const normalized = sanitizeText(question, 320).toLowerCase()
  return /前进|go\s+forward/u.test(normalized)
    ? 'forward' as const
    : /刷新|重新加载|reload|refresh/u.test(normalized)
      ? 'reload' as const
      : 'back' as const
}

function extractRequestedDesktopShortcut(question: string) {
  const normalized = sanitizeText(question, 320)
    .toLowerCase()
    .replace(/\s+/g, '')
  const shortcutMatch = normalized.match(/(?:按下|按|press|hit|trigger)(?:快捷键)?([a-z0-9+⌘⌥⌃-]+)/iu)
  const shortcut = sanitizeText(shortcutMatch?.[1] ?? '', 80)
    .toLowerCase()
    .replaceAll('-', '+')
    .replaceAll('⌘', 'command+')
    .replaceAll('⌥', 'option+')
    .replaceAll('⌃', 'control+')
    .replace(/\bcmd\b/gu, 'command')
    .replace(/\bctrl\b/gu, 'control')
    .replace(/\balt\b/gu, 'option')
    .replace(/\+\+/gu, '+')
    .replace(/^\+|\+$/gu, '')
  if (shortcut)
    return shortcut

  const simpleKeyMatch = sanitizeText(question, 320).match(/(?:按下|按|press|hit|trigger)(?:快捷键)?\s*(回车|enter|tab|esc|escape|left|right|up|down|左方向键|右方向键|上方向键|下方向键|左键|右键|上键|下键|向左键|向右键|向上键|向下键)/iu)?.[1] ?? ''
  if (!simpleKeyMatch)
    return null

  if (/回车|enter/iu.test(simpleKeyMatch))
    return 'enter'
  if (/tab/iu.test(simpleKeyMatch))
    return 'tab'
  if (/esc|escape/iu.test(simpleKeyMatch))
    return 'escape'
  if (/left|左/u.test(simpleKeyMatch))
    return 'left'
  if (/right|右/u.test(simpleKeyMatch))
    return 'right'
  if (/up|上/u.test(simpleKeyMatch))
    return 'up'
  if (/down|下/u.test(simpleKeyMatch))
    return 'down'
  return null
}

function extractRequestedDesktopApplicationName(question: string) {
  const matched = question.match(/(?:打开|启动|运行|open|launch)\s*(?:一下\s*)?(?:软件|应用|app(?:lication)?|程序|客户端)?\s*(.+?)(?:(?:然后|并且|并|再|后面|后续)\b|$)/iu)?.[1] ?? ''
  const normalized = trimRequestedActionTarget(matched)
    .replace(/(?:后|之后|以后)\s*(?:看|看看|查看|确认|观察|继续|操作|处理|再|现在).*/u, '')
    .replace(/(?:软件|应用|app(?:lication)?|程序|客户端)$/iu, '')
    .trim()
  if (!normalized)
    return null
  if (/^(?:浏览器|browser|chrome|google chrome|safari|网页|页面|网站|网址)$/iu.test(normalized))
    return null
  if (resolveAlicizationKnownWebsiteInText(normalized))
    return null
  return normalized
}

function looksLikeDesktopApplicationLaunchTarget(candidate: string) {
  const normalized = sanitizeText(candidate, 160)
  if (!normalized)
    return false
  if (/^(?:浏览器|browser|chrome|google chrome|safari|网页|页面|网站|网址)$/iu.test(normalized))
    return false
  if (resolveAlicizationKnownWebsiteInText(normalized))
    return false
  if (/开关|权限|选项|模式|功能|侧边栏|标签页|标签|页签|列表|目录|面板|栏目|分类|分区|项目|条目|按钮|输入框|搜索框|文本框|单选|复选|toggle|switch|checkbox|permission|feature|sidebar|tab|panel|list|item|button|input|textbox|searchbox/iu.test(normalized))
    return false
  if (/系统设置|设置|偏好设置|system settings|settings|preferences|terminal|终端|finder|微信|wechat|qq|cursor|chrome|safari|vscode|visual studio code|xcode|preview|mail|photos?|notes?|calendar|music|spotify|slack|discord/iu.test(normalized))
    return true
  return normalized.length > 4
}

function normalizeDesktopApplicationIdentity(raw: string | null | undefined) {
  const normalized = sanitizeText(raw, 160).toLowerCase()
  if (!normalized)
    return null
  if (/微信|wechat/iu.test(normalized))
    return 'wechat'
  if (/系统设置|偏好设置|system settings|settings|preferences/iu.test(normalized))
    return 'system-settings'
  if (/google chrome|chrome|浏览器/iu.test(normalized))
    return 'chrome'
  if (/safari/iu.test(normalized))
    return 'safari'
  if (/cursor/iu.test(normalized))
    return 'cursor'
  if (/terminal|终端/iu.test(normalized))
    return 'terminal'
  if (/finder/iu.test(normalized))
    return 'finder'
  return normalized.replace(/[^\p{Letter}\p{Number}]+/gu, '')
}

function desktopApplicationNamesMatch(left: string | null | undefined, right: string | null | undefined) {
  const normalizedLeft = normalizeDesktopApplicationIdentity(left)
  const normalizedRight = normalizeDesktopApplicationIdentity(right)
  if (!normalizedLeft || !normalizedRight)
    return false
  return normalizedLeft === normalizedRight
    || normalizedLeft.includes(normalizedRight)
    || normalizedRight.includes(normalizedLeft)
}

function parseTerminalCommandWords(raw: string) {
  const words: string[] = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let escaped = false

  for (const char of raw) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === '\\' && !inSingleQuote) {
      escaped = true
      continue
    }
    if (char === '\'' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }
    if (!inSingleQuote && !inDoubleQuote && /\s/.test(char)) {
      if (current) {
        words.push(current)
        current = ''
      }
      continue
    }
    current += char
  }

  if (escaped || inSingleQuote || inDoubleQuote)
    return null
  if (current)
    words.push(current)
  return words
}

function expandVisibleTerminalCommandCandidates(raw: string) {
  const normalized = sanitizeText(raw, 240)
  if (!normalized)
    return []

  const candidates = new Set<string>([
    normalized,
    normalized.replace(/^(?:[$%#>]\s*)+/u, '').trim(),
  ])

  for (const separator of ['|', '—', '–']) {
    if (!normalized.includes(separator))
      continue
    const tail = normalized.split(separator).pop()?.trim() ?? ''
    const cleanedTail = tail.replace(/^(?:[$%#>]\s*)+/u, '').trim()
    if (cleanedTail)
      candidates.add(cleanedTail)
  }

  return [...candidates].filter(Boolean)
}

function inferVisibleTerminalCommand(input: {
  focusTarget?: {
    title?: string
  } | null
  foregroundWindow?: {
    title?: string
  } | null
  summary?: AlicizationScreenSemanticSummary | null
}) {
  const rawCandidates = [
    sanitizeText(input.focusTarget?.title, 240),
    sanitizeText(input.foregroundWindow?.title, 240),
    sanitizeText(input.summary?.source?.name, 240),
  ].filter(Boolean)

  for (const rawCandidate of rawCandidates) {
    for (const candidate of expandVisibleTerminalCommandCandidates(rawCandidate)) {
      const words = parseTerminalCommandWords(candidate)
      if (!words?.length)
        continue
      const command = sanitizeText(words[0], 80)
      if (!command || !/^[\w./:@%+=,-]+$/u.test(command))
        continue
      if (/^(?:iterm2?|terminal|warp|kitty|alacritty|ghostty|wezterm|zsh|bash|sh|fish|powershell|pwsh|cmd)$/iu.test(command))
        continue
      const args = words
        .slice(1)
        .map(value => sanitizeText(value, 120))
        .filter(Boolean)
      return {
        command,
        args,
        displayText: candidate,
      }
    }
  }

  return null
}

function describeTarget(target?: {
  appName?: string
  processName?: string
  title?: string
} | null) {
  return [
    sanitizeText(target?.appName, 64),
    sanitizeText(target?.processName, 64),
    sanitizeText(target?.title, 128),
  ].filter(Boolean).join(' | ')
}

function isBrowserLike(input: {
  focusTarget?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  summary?: AlicizationScreenSemanticSummary | null
}) {
  if (input.summary?.workload.kind === 'browser')
    return true

  const haystack = [
    input.focusTarget?.appName ?? '',
    input.focusTarget?.processName ?? '',
    input.focusTarget?.title ?? '',
    input.foregroundWindow?.appName ?? '',
    input.foregroundWindow?.processName ?? '',
    input.foregroundWindow?.title ?? '',
  ].join(' ')

  return /\b(?:chrome|google chrome|safari|firefox|edge|arc|browser)\b|网页|页面|浏览器/iu.test(haystack)
}

function normalizeInteractable(raw: AlicizationLocalDesktopInspectionInteractable) {
  const ordinal = typeof raw.ordinal === 'number' && Number.isFinite(raw.ordinal)
    ? Math.max(1, Math.floor(raw.ordinal))
    : null
  const normalizedRole = sanitizeText(raw.role || raw.axRole, 48).toLowerCase()
  const role = normalizedRole === 'menuitem' || normalizedRole === 'axmenuitem'
    ? 'menu-item'
    : normalizedRole === 'dropdown'
      || normalizedRole === 'menu-button'
      || normalizedRole === 'menubutton'
      || normalizedRole === 'pop-up-button'
      || normalizedRole === 'popup-button'
      || normalizedRole === 'popupbutton'
      || normalizedRole === 'select'
      || normalizedRole === 'selector'
      || normalizedRole === 'axpopupbutton'
      || normalizedRole === 'axmenubutton'
      ? 'select'
      : normalizedRole === 'listitem'
        || normalizedRole === 'list-item'
        || normalizedRole === 'outline-row'
        || normalizedRole === 'outlinerow'
        || normalizedRole === 'row'
        || normalizedRole === 'sidebar-item'
        || normalizedRole === 'sidebaritem'
        || normalizedRole === 'tree-item'
        || normalizedRole === 'treeitem'
        || normalizedRole === 'axoutlinerow'
        || normalizedRole === 'axrow'
        ? 'list-item'
        : normalizedRole === 'radio-button' || normalizedRole === 'radiobutton' || normalizedRole === 'axradiobutton'
          ? 'radio'
          : normalizedRole === 'tabitem' || normalizedRole === 'tab-button' || normalizedRole === 'tabbutton' || normalizedRole === 'axtab'
            ? 'tab'
            : normalizedRole || 'element'
  const text = sanitizeText(raw.text, 160) || null
  return {
    actions: Array.isArray(raw.actions)
      ? raw.actions.map(value => sanitizeText(value, 64)).filter(Boolean)
      : [],
    enabled: raw.enabled !== false,
    ordinal,
    role,
    text,
  } satisfies AlicizationLocalDesktopInspectionGuiCandidate & {
    actions: string[]
  }
}

function collectDesktopGuiCandidates(input: {
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  interactables?: AlicizationLocalDesktopInspectionInteractable[] | null
}) {
  const normalized = Array.isArray(input.interactables)
    ? input.interactables
        .map(normalizeInteractable)
        .filter(candidate => candidate.ordinal !== null || candidate.text || candidate.role !== 'element')
    : []

  if (normalized.length > 0)
    return normalized.map(({ enabled, ordinal, role, text }) => ({ enabled, ordinal, role, text }))

  return [...input.guiStructure?.primaryActionCandidates ?? []]
}

function normalizeBrowserPageContext(
  raw: AlicizationLocalDesktopInspectionBrowserPageContext | null | undefined,
): AlicizationLocalDesktopInspectionBrowserPageContext | null {
  if (!raw)
    return null

  const browser = sanitizeText(raw.browser, 32).toLowerCase()
  const interactables = Array.isArray(raw.interactables)
    ? raw.interactables.map((entry) => {
        const tag = sanitizeText(entry.tag, 32).toLowerCase() || null
        const role = sanitizeText(entry.role, 32).toLowerCase() || null
        const type = sanitizeText(entry.type, 32).toLowerCase() || null
        const text = sanitizeText(entry.text, 160) || null
        const ariaLabel = sanitizeText(entry.ariaLabel, 160) || null
        const title = sanitizeText(entry.title, 160) || null
        const href = sanitizeText(entry.href, 320) || null
        return {
          tag,
          role,
          type,
          text,
          ariaLabel,
          title,
          href,
          disabled: entry.disabled === true,
        } satisfies AlicizationLocalDesktopInspectionBrowserInteractable
      })
    : []

  if (!browser && interactables.length <= 0 && !sanitizeText(raw.url, 320) && !sanitizeText(raw.title, 160))
    return null

  const rawScrollState = raw.scrollState
  const scrollState = rawScrollState && typeof rawScrollState === 'object' && !Array.isArray(rawScrollState)
    ? {
      offsetY: typeof rawScrollState.offsetY === 'number' && Number.isFinite(rawScrollState.offsetY)
        ? Math.max(0, Math.floor(rawScrollState.offsetY))
        : null,
      viewportHeight: typeof rawScrollState.viewportHeight === 'number' && Number.isFinite(rawScrollState.viewportHeight)
        ? Math.max(0, Math.floor(rawScrollState.viewportHeight))
        : null,
      documentHeight: typeof rawScrollState.documentHeight === 'number' && Number.isFinite(rawScrollState.documentHeight)
        ? Math.max(0, Math.floor(rawScrollState.documentHeight))
        : null,
      canScrollDown: rawScrollState.canScrollDown === true,
      canScrollUp: rawScrollState.canScrollUp === true,
    } satisfies AlicizationLocalDesktopInspectionBrowserScrollState
    : null

  return {
    browser: browser || 'chrome',
    url: sanitizeText(raw.url, 320) || null,
    title: sanitizeText(raw.title, 160) || null,
    textExcerpt: sanitizeText(raw.textExcerpt, 320) || null,
    interactables,
    scrollState,
  }
}

function browserPageCanScrollDown(browserPageContext: AlicizationLocalDesktopInspectionBrowserPageContext | null) {
  return browserPageContext?.scrollState?.canScrollDown === true
}

function scoreBrowserInteractableCandidate(candidate: AlicizationLocalDesktopInspectionBrowserInteractable) {
  const text = sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 160)
  const role = sanitizeText(candidate.role || candidate.tag, 32).toLowerCase()
  const type = sanitizeText(candidate.type, 32).toLowerCase()
  let score = 0

  if (candidate.disabled !== true)
    score += 40
  if (role === 'button' || candidate.tag === 'button' || type === 'submit')
    score += 45
  else if (role === 'link' || candidate.tag === 'a')
    score += 20

  if (/继续|下一步|确认|确定|保存|发布|发微博|写微博|发帖|登录|提交|允许|同意|安装|运行|打开|apply|allow|save|submit|publish|compose|login|next|continue|ok|confirm|open|run|sign in/iu.test(text))
    score += 80
  if (/取消|关闭|返回|back|cancel|close|dismiss|ignore|skip|later|忘记密码|forgot password/iu.test(text))
    score -= 45
  if (text)
    score += Math.min(20, text.length)

  return score
}

function inferBrowserClickTargetType(candidate: AlicizationLocalDesktopInspectionBrowserInteractable) {
  const role = sanitizeText(candidate.role, 32).toLowerCase()
  const tag = sanitizeText(candidate.tag, 32).toLowerCase()
  const type = sanitizeText(candidate.type, 32).toLowerCase()

  if (role === 'link' || tag === 'a' || candidate.href)
    return 'link' as const
  if (role === 'button' || tag === 'button' || type === 'submit')
    return 'button' as const
  return 'element' as const
}

function buildBrowserClickActionArguments(candidate: AlicizationLocalDesktopInspectionBrowserInteractable, browser?: string | null) {
  return {
    text: sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 160) || undefined,
    targetType: inferBrowserClickTargetType(candidate),
    browser: sanitizeText(browser, 32) || undefined,
  } satisfies Record<string, unknown>
}

function isBrowserInputInteractable(candidate: AlicizationLocalDesktopInspectionBrowserInteractable) {
  const tag = sanitizeText(candidate.tag, 32).toLowerCase()
  const role = sanitizeText(candidate.role, 32).toLowerCase()
  const type = sanitizeText(candidate.type, 32).toLowerCase()
  return tag === 'input'
    || tag === 'textarea'
    || role === 'textbox'
    || role === 'searchbox'
    || type === 'email'
    || type === 'password'
    || type === 'search'
    || type === 'text'
}

function extractRequestedInputText(question: string) {
  const quotedMatch = question.match(/[“"'`「」『』]([^“"'`「」『』]+)[“"'`「」『』]/u)
  return sanitizeText(quotedMatch?.[1] ?? '', 220) || null
}

function extractRequestedSearchInputText(question: string) {
  const matched = question.match(/(?:搜索框|查找框|search\s*box|searchbox|站内搜索)[^，。！？,.!?;；]{0,24}?(?:搜索|查找|搜)\s*(.+?)(?:(?:然后|并且|并|再|后面|后续)\b|[，。！？,.!?;；]|$)/iu)?.[1]
    ?? question.match(/(?:搜索|查找|搜)\s+(.+?)(?:(?:然后|并且|并|再|后面|后续)\b|[，。！？,.!?;；]|$)/iu)?.[1]
    ?? ''
  return trimRequestedActionTarget(matched)
    .replace(/^(?:一下|一搜|一下子|一下吧)\s*/u, '')
    .trim()
    || null
}

function looksLikeSearchInputLabel(raw: string | null | undefined) {
  return /搜索|查找|search/iu.test(sanitizeText(raw, 160))
}

function looksLikeBrowserChromeInputLabel(raw: string | null | undefined) {
  return /地址栏|地址和搜索栏|网址|url|address|location|omnibox|search with google|search or enter address/iu.test(sanitizeText(raw, 160))
}

function looksLikeBrowserChromeActionLabel(raw: string | null | undefined) {
  return /刷新|重新加载|后退|前进|reload|refresh|back|forward/iu.test(sanitizeText(raw, 160))
}

function looksLikeBrowserChromeFocusCue(raw: string | null | undefined) {
  return /地址栏(?:已|已经)?聚焦|地址和搜索栏(?:已|已经)?聚焦|focus(?:ed)?(?: on)? (?:the )?(?:address|search|location|url) bar|address bar|location bar|url bar|omnibox/iu.test(sanitizeText(raw, 240))
}

function extractRequestedInputTargetHint(question: string) {
  const explicitTargetMatch = question.match(/(?:向|在)?(?:当前网页|当前页面|这个网页|这个页面|当前窗口|这个窗口|前台窗口|当前应用|这个应用|当前软件|这个软件|当前界面|这个界面)?(?:里|中|上的?)?的?(.+?)(?:输入框|搜索框|文本框|邮箱输入框|密码输入框)/u)
    ?? question.match(/(.+?)(?:输入框|搜索框|文本框|邮箱输入框|密码输入框).*(?:输入|键入|填写|type|fill|paste)/iu)
  const explicitTarget = sanitizeText(explicitTargetMatch?.[1] ?? '', 220)
    .replace(/^[“”"'【】「」[\]()]+|[“”"'【】「」[\]()]+$/gu, '')
    .replace(/^(?:请|麻烦|帮我|帮忙|请你|拜托)+/u, '')
    .replace(/^(?:打开|访问|前往|进入|去|启动|运行|open|visit|go\s+to|launch).+?(?:然后|并且|并|再)\s*/iu, '')
    .replace(/^[的在向把]+/u, '')
    .replace(/(?:里|中|上的?|中的?)$/u, '')
  if (explicitTarget)
    return explicitTarget
  if (/\bdiscussion body\b/iu.test(question))
    return 'Discussion body'
  if (/\bthread title\b/iu.test(question))
    return 'Thread title'
  if (/\bpost body\b/iu.test(question))
    return 'Post body'
  if (/\bpost title\b/iu.test(question))
    return 'Post title'
  if (/\bmessage body\b/iu.test(question))
    return 'Message body'
  if (/\bmessage title\b/iu.test(question))
    return 'Message title'
  if (/\bdiscussion title\b/iu.test(question))
    return 'Discussion title'
  if (/\bcaption\b/iu.test(question))
    return 'Caption'
  if (/帖子标题|主题标题|讨论标题/u.test(question))
    return '标题'
  if (/帖子正文|主题正文|讨论正文/u.test(question))
    return '正文'
  if (/密码输入框|密码/u.test(question))
    return '密码'
  if (/邮箱输入框|邮箱|email/u.test(question))
    return '邮箱'
  if (/搜索框|搜索/u.test(question))
    return '搜索'
  if (/文件名/u.test(question))
    return '文件名'
  return null
}

function shouldSubmitRequestedInput(question: string) {
  return /回车|提交|enter|submit|登录|继续|上传|打开|保存|确认|确定|search|搜索/iu.test(question)
}

function shouldSuppressAutoSubmitForHighImpactForm(input: {
  pagePhase?: AlicizationLocalDesktopInspectionPagePhase | null
  question: string
}) {
  if (input.pagePhase !== 'form-entry')
    return false
  return /发布|发送|分享|删除|移除|清空|付款|支付|购买|下单|转账|创建帖子|发布帖子|创建主题|发布主题|创建讨论|发布讨论|submit|publish|send|share|delete|remove|clear|pay|payment|purchase|checkout|order|transfer|create post|create thread|create topic|create discussion|start discussion/iu.test(input.question)
}

function scoreBrowserInputCandidate(input: {
  candidate: AlicizationLocalDesktopInspectionBrowserInteractable
  pagePhase: AlicizationLocalDesktopInspectionPagePhase
  targetHint?: string | null
}) {
  const candidateText = sanitizeText(input.candidate.text || input.candidate.ariaLabel || input.candidate.title, 160)
  const candidateType = sanitizeText(input.candidate.type, 32).toLowerCase()
  let score = input.candidate.disabled === true ? -100 : 0

  if (candidateText)
    score += Math.min(20, candidateText.length)
  if (input.pagePhase === 'login' && /密码/u.test(input.targetHint ?? '') && candidateType === 'password')
    score += 180
  if (input.pagePhase === 'login' && /邮箱|email/u.test(input.targetHint ?? '') && candidateType === 'email')
    score += 180
  if (candidateType === 'search')
    score += 40
  if (candidateType === 'password')
    score += 35
  if (candidateType === 'email')
    score += 30
  if (input.targetHint && candidateText && candidateText.includes(input.targetHint))
    score += 120
  if (input.targetHint && candidateText && input.targetHint.includes(candidateText))
    score += 90
  return score
}

function pickPrimaryBrowserInputCandidate(input: {
  browserPageContext: AlicizationLocalDesktopInspectionBrowserPageContext | null
  pagePhase: AlicizationLocalDesktopInspectionPagePhase
  question: string
}) {
  const targetHint = extractRequestedInputTargetHint(input.question)
  return [...input.browserPageContext?.interactables ?? []]
    .filter(candidate => candidate.disabled !== true && isBrowserInputInteractable(candidate))
    .sort((left, right) => scoreBrowserInputCandidate({
      candidate: right,
      pagePhase: input.pagePhase,
      targetHint,
    }) - scoreBrowserInputCandidate({
      candidate: left,
      pagePhase: input.pagePhase,
      targetHint,
    }))[0] ?? null
}

function isBrowserSearchInputCandidate(candidate: AlicizationLocalDesktopInspectionBrowserInteractable) {
  if (!isBrowserInputInteractable(candidate))
    return false
  const label = sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 160)
  const type = sanitizeText(candidate.type, 32).toLowerCase()
  const role = sanitizeText(candidate.role, 32).toLowerCase()
  return type === 'search' || role === 'searchbox' || looksLikeSearchInputLabel(label)
}

function buildBrowserTypeActionArguments(input: {
  browser?: string | null
  candidate: AlicizationLocalDesktopInspectionBrowserInteractable
  expectedPhase?: AlicizationLocalDesktopInspectionPagePhase | null
  pagePhase?: AlicizationLocalDesktopInspectionPagePhase | null
  question: string
  submit?: boolean | null
}) {
  const candidateLabel = sanitizeText(input.candidate.text || input.candidate.ariaLabel || input.candidate.title, 160)
  const requestedTargetText = extractRequestedInputTargetHint(input.question)
    || candidateLabel
    || undefined
  const searchLikeInput = isBrowserSearchInputCandidate(input.candidate) || looksLikeSearchInputLabel(requestedTargetText)
  const targetText = searchLikeInput && candidateLabel && requestedTargetText && candidateLabel.includes(requestedTargetText)
    ? candidateLabel
    : requestedTargetText
  const text = extractRequestedInputText(input.question)
    || (searchLikeInput ? extractRequestedSearchInputText(input.question) : null)
  if (!text)
    return undefined

  const requestedSubmit = typeof input.submit === 'boolean'
    ? input.submit
    : shouldSubmitRequestedInput(input.question)
  const submit = requestedSubmit
    && !shouldSuppressAutoSubmitForHighImpactForm({
      pagePhase: input.pagePhase ?? null,
      question: input.question,
    })
  const continuedExpectedPhase = submit
    ? searchLikeInput && input.pagePhase === 'search-results'
      ? 'search-results'
      : input.expectedPhase ?? undefined
    : undefined
  const canContinueAfterSubmit = submit && (Boolean(input.expectedPhase) || searchLikeInput)
  return {
    text,
    targetText,
    browser: sanitizeText(input.browser, 32) || undefined,
    submit,
    expectedPhase: continuedExpectedPhase,
    reinspectAfterAction: canContinueAfterSubmit,
    autoContinueSuggestedActions: canContinueAfterSubmit,
    maxAutoContinueSteps: canContinueAfterSubmit ? 1 : undefined,
    inspectionQuestion: canContinueAfterSubmit ? input.question : undefined,
    inspectionMaxSuggestedActions: canContinueAfterSubmit ? 3 : undefined,
  } satisfies Record<string, unknown>
}

function scoreDesktopInputCandidate(input: {
  candidate: AlicizationLocalDesktopInspectionGuiCandidate
  targetHint?: string | null
}) {
  const candidateText = sanitizeText(input.candidate.text, 160)
  let score = input.candidate.enabled ? 30 : -100

  if (candidateText)
    score += Math.min(20, candidateText.length)
  if (input.targetHint && candidateText && candidateText.includes(input.targetHint))
    score += 120
  if (input.targetHint && candidateText && input.targetHint.includes(candidateText))
    score += 90
  return score
}

function pickPrimaryDesktopInputCandidate(input: {
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  question: string
}) {
  const targetHint = extractRequestedInputTargetHint(input.question)
  return [...input.guiStructure?.primaryInputCandidates ?? []]
    .sort((left, right) => scoreDesktopInputCandidate({
      candidate: right,
      targetHint,
    }) - scoreDesktopInputCandidate({
      candidate: left,
      targetHint,
    }))[0] ?? null
}

function isDesktopSearchInputCandidate(candidate: AlicizationLocalDesktopInspectionGuiCandidate) {
  if (candidate.role !== 'input')
    return false
  return looksLikeSearchInputLabel(candidate.text)
}

function questionSignalsDesktopToggleRequest(question: string) {
  return /打开|开启|启用|关闭|关掉|禁用|允许|不允许|取消允许|turn on|turn off|enable|disable|allow|disallow|toggle/iu.test(question)
}

function extractRequestedDesktopToggleTargetHint(question: string) {
  const explicitTargetMatch = question.match(/(?:打开|开启|启用|关闭|关掉|禁用|允许|不允许|取消允许)\s*(.+?)(?:(?:然后|并|再|并且|后面|后续)\b|点击|点按|按下|确认|完成|保存|应用|提交|$)/iu)
    ?? question.match(/(?:turn on|turn off|enable|disable|allow|disallow|toggle)\s+(.+?)(?:\s+(?:and|then)\b|\s+(?:click|press|confirm|finish|save|apply|submit)\b|$)/iu)
    ?? question.match(/(?:把|将)?(.+?)(?:开关|权限|选项|设置|模式|功能|toggle|switch|checkbox|permission|setting|mode|feature).*(?:打开|开启|启用|关闭|关掉|禁用|allow|enable|disable|turn on|turn off)/iu)
  return sanitizeText(explicitTargetMatch?.[1] ?? '', 220)
    .replace(/^[“”"'【】「」[\]()]+|[“”"'【】「」[\]()]+$/gu, '')
    .replace(/^(?:请|麻烦|帮我|帮忙|请你|拜托)+/u, '')
    .replace(/^[的在向把将]+/u, '')
    .replace(/(?:里|中|上的?|中的?)$/u, '')
    || null
}

function scoreDesktopToggleCandidate(input: {
  candidate: AlicizationLocalDesktopInspectionGuiCandidate
  question: string
  targetHint?: string | null
}) {
  const candidateText = sanitizeText(input.candidate.text, 160)
  const questionText = sanitizeText(input.question, 220)
  let score = input.candidate.enabled ? 40 : -100

  if (input.candidate.role === 'checkbox')
    score += 160
  else if (input.candidate.role === 'radio')
    score += 120
  else if (input.candidate.role === 'menu-item')
    score += 45
  else
    score -= 120

  if (candidateText)
    score += Math.min(20, candidateText.length)
  if (input.targetHint && candidateText && candidateText.includes(input.targetHint))
    score += 140
  if (input.targetHint && candidateText && input.targetHint.includes(candidateText))
    score += 110
  if (candidateText && questionText.includes(candidateText))
    score += 90
  if (/完成|取消|确认|确定|保存|应用|done|finish|ok|confirm|save|apply|cancel|close/u.test(candidateText))
    score -= 120

  return score
}

function pickPrimaryDesktopToggleCandidate(input: {
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  interactables?: AlicizationLocalDesktopInspectionInteractable[] | null
  question: string
}) {
  const targetHint = extractRequestedDesktopToggleTargetHint(input.question)
  return collectDesktopGuiCandidates(input)
    .filter(candidate => candidate.role === 'checkbox' || candidate.role === 'menu-item' || candidate.role === 'radio')
    .sort((left, right) => scoreDesktopToggleCandidate({
      candidate: right,
      question: input.question,
      targetHint,
    }) - scoreDesktopToggleCandidate({
      candidate: left,
      question: input.question,
      targetHint,
    }))[0] ?? null
}

function questionSignalsDesktopTabRequest(question: string) {
  return /(?:切换到|切到|打开|进入|前往).*(?:标签页|标签|页签)|(?:switch to|open|go to).*\btab\b/iu.test(question)
}

function extractRequestedDesktopTabTargetHint(question: string) {
  const explicitTargetMatch = question.match(/(?:切换到|切到|打开|进入|前往)\s*(.+?)(?:(?:标签页|标签|页签)\b|(?:然后|并|再|并且|后面|后续)\b|点击|点按|按下|确认|完成|保存|应用|提交|$)/iu)
    ?? question.match(/(?:switch to|open|go to)\s+(.+?)(?:\s+tab\b|\s+(?:and|then)\b|\s+(?:click|press|confirm|finish|save|apply|submit)\b|$)/iu)
  return sanitizeText(explicitTargetMatch?.[1] ?? '', 220)
    .replace(/^[“”"'【】「」[\]()]+|[“”"'【】「」[\]()]+$/gu, '')
    .replace(/^(?:请|麻烦|帮我|帮忙|请你|拜托)+/u, '')
    .replace(/^[的在向把将]+/u, '')
    .replace(/(?:标签页|标签|页签|tab)$/iu, '')
    .replace(/(?:里|中|上的?|中的?)$/u, '')
    || null
}

function scoreDesktopTabCandidate(input: {
  candidate: AlicizationLocalDesktopInspectionGuiCandidate
  question: string
  targetHint?: string | null
}) {
  const candidateText = sanitizeText(input.candidate.text, 160)
  const questionText = sanitizeText(input.question, 220)
  let score = input.candidate.enabled ? 40 : -100

  if (input.candidate.role === 'tab')
    score += 220
  else
    score -= 180

  if (candidateText)
    score += Math.min(20, candidateText.length)
  if (input.targetHint && candidateText && candidateText.includes(input.targetHint))
    score += 180
  if (input.targetHint && candidateText && input.targetHint.includes(candidateText))
    score += 150
  if (candidateText && questionText.includes(candidateText))
    score += 110
  if (/完成|取消|确认|确定|保存|应用|done|finish|ok|confirm|save|apply|cancel|close/u.test(candidateText))
    score -= 180

  return score
}

function pickPrimaryDesktopTabCandidate(input: {
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  interactables?: AlicizationLocalDesktopInspectionInteractable[] | null
  question: string
}) {
  const targetHint = extractRequestedDesktopTabTargetHint(input.question)
  return collectDesktopGuiCandidates(input)
    .filter(candidate => candidate.role === 'tab')
    .sort((left, right) => scoreDesktopTabCandidate({
      candidate: right,
      question: input.question,
      targetHint,
    }) - scoreDesktopTabCandidate({
      candidate: left,
      question: input.question,
      targetHint,
    }))[0] ?? null
}

function questionSignalsDesktopSelectionRequest(question: string) {
  return /切换到|切到|选择|选成|改成|设置为|switch to|change to|choose|select|set to/iu.test(question)
}

function isDesktopCommitLikeText(text: string | null | undefined) {
  return /完成|取消|确认|确定|保存|应用|done|finish|ok|confirm|save|apply|cancel|close/u.test(sanitizeText(text, 160))
}

function extractRequestedDesktopSelectionTargetHint(question: string) {
  const explicitTargetMatch = question.match(/(?:切换到|切到|选择|选成|改成|设置为)\s*(.+?)(?:(?:然后|并|再|并且|后面|后续)\b|点击|点按|按下|确认|完成|保存|应用|提交|$)/iu)
    ?? question.match(/(?:switch to|change to|choose|select|set to)\s+(.+?)(?:\s+(?:and|then)\b|\s+(?:click|press|confirm|finish|save|apply|submit)\b|$)/iu)
  return sanitizeText(explicitTargetMatch?.[1] ?? '', 220)
    .replace(/^[“”"'【】「」[\]()]+|[“”"'【】「」[\]()]+$/gu, '')
    .replace(/^(?:请|麻烦|帮我|帮忙|请你|拜托)+/u, '')
    .replace(/^[的在向把将]+/u, '')
    .replace(/(?:里|中|上的?|中的?)$/u, '')
    || null
}

function scoreDesktopSelectionCandidate(input: {
  candidate: AlicizationLocalDesktopInspectionGuiCandidate
  question: string
  targetHint?: string | null
}) {
  const candidateText = sanitizeText(input.candidate.text, 160)
  const questionText = sanitizeText(input.question, 220)
  let score = input.candidate.enabled ? 40 : -100

  if (input.candidate.role === 'radio')
    score += 170
  else if (input.candidate.role === 'menu-item')
    score += 150
  else if (input.candidate.role === 'link')
    score += 40
  else if (input.candidate.role === 'button')
    score -= 80
  else
    score -= 120

  if (candidateText)
    score += Math.min(20, candidateText.length)
  if (input.targetHint && candidateText && candidateText.includes(input.targetHint))
    score += 180
  if (input.targetHint && candidateText && input.targetHint.includes(candidateText))
    score += 150
  if (candidateText && questionText.includes(candidateText))
    score += 110
  if (isDesktopCommitLikeText(candidateText))
    score -= 140

  return score
}

function pickPrimaryDesktopSelectionCandidate(input: {
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  interactables?: AlicizationLocalDesktopInspectionInteractable[] | null
  question: string
}) {
  const targetHint = extractRequestedDesktopSelectionTargetHint(input.question)
  return collectDesktopGuiCandidates(input)
    .filter(candidate =>
      candidate.role === 'radio'
      || candidate.role === 'menu-item'
      || candidate.role === 'link'
      || (candidate.role === 'button' && !isDesktopCommitLikeText(candidate.text)),
    )
    .sort((left, right) => scoreDesktopSelectionCandidate({
      candidate: right,
      question: input.question,
      targetHint,
    }) - scoreDesktopSelectionCandidate({
      candidate: left,
      question: input.question,
      targetHint,
    }))[0] ?? null
}

function scoreDesktopSelectorCandidate(input: {
  candidate: AlicizationLocalDesktopInspectionGuiCandidate
  question: string
}) {
  const candidateText = sanitizeText(input.candidate.text, 160)
  const questionText = sanitizeText(input.question, 220)
  let score = input.candidate.enabled ? 40 : -100

  if (input.candidate.role === 'select')
    score += 220
  else
    score -= 180

  if (candidateText)
    score += Math.min(20, candidateText.length)
  if (candidateText && questionText.includes(candidateText))
    score += 140
  if (isDesktopCommitLikeText(candidateText))
    score -= 220

  return score
}

function pickPrimaryDesktopSelectorCandidate(input: {
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  interactables?: AlicizationLocalDesktopInspectionInteractable[] | null
  question: string
}) {
  return collectDesktopGuiCandidates(input)
    .filter(candidate => candidate.role === 'select')
    .sort((left, right) => scoreDesktopSelectorCandidate({
      candidate: right,
      question: input.question,
    }) - scoreDesktopSelectorCandidate({
      candidate: left,
      question: input.question,
    }))[0] ?? null
}

function questionSignalsDesktopNavigationRequest(question: string) {
  return /侧边栏|栏目|分类|页面|分区|项目|条目|列表|目录|面板|sidebar|section|category|page|panel|item|list/iu.test(question)
}

function extractRequestedDesktopDestinationTargetHint(question: string) {
  const explicitTargetMatch = question.match(/(?:然后|再|接着|并且|并).{0,20}?(?:进入|前往|切换到|切到)\s*(.+?)(?:(?:然后|并|再|并且|后面|后续)\b|点击|点按|按下|确认|完成|保存|应用|提交|$)/iu)
    ?? question.match(/(?:进入|前往|切换到|切到)\s*(.+?)(?:(?:然后|并|再|并且|后面|后续)\b|点击|点按|按下|确认|完成|保存|应用|提交|$)/iu)
  return sanitizeText(explicitTargetMatch?.[1] ?? '', 220)
    .replace(/^[“”"'【】「」[\]()]+|[“”"'【】「」[\]()]+$/gu, '')
    .replace(/^(?:请|麻烦|帮我|帮忙|请你|拜托)+/u, '')
    .replace(/^[的在向把将]+/u, '')
    .replace(/(?:里|中|上的?|中的?)$/u, '')
    || null
}

function questionSignalsDesktopDestinationRequest(question: string) {
  return Boolean(extractRequestedDesktopDestinationTargetHint(question))
}

function extractRequestedDesktopNavigationTargetHint(question: string) {
  const explicitTargetMatch = question.match(/(?:切换到|切到|打开|进入|前往)\s*(.+?)(?:(?:侧边栏|栏目|分类|页面|分区|项目|条目|列表|目录|面板)\b|(?:然后|并|再|并且|后面|后续)\b|点击|点按|按下|确认|完成|保存|应用|提交|$)/iu)
    ?? question.match(/(?:switch to|open|enter|go to|navigate to)\s+(.+?)(?:\s+(?:sidebar|section|category|page|panel|item|list)\b|\s+(?:and|then)\b|\s+(?:click|press|confirm|finish|save|apply|submit)\b|$)/iu)
  return sanitizeText(explicitTargetMatch?.[1] ?? '', 220)
    .replace(/^[“”"'【】「」[\]()]+|[“”"'【】「」[\]()]+$/gu, '')
    .replace(/^(?:请|麻烦|帮我|帮忙|请你|拜托)+/u, '')
    .replace(/^[的在向把将]+/u, '')
    .replace(/(?:侧边栏|栏目|分类|页面|分区|项目|条目|列表|目录|面板|sidebar|section|category|page|panel|item|list)$/iu, '')
    .replace(/(?:里|中|上的?|中的?)$/u, '')
    || null
}

function scoreDesktopNavigationCandidate(input: {
  candidate: AlicizationLocalDesktopInspectionGuiCandidate
  question: string
  targetHint?: string | null
}) {
  const candidateText = sanitizeText(input.candidate.text, 160)
  const questionText = sanitizeText(input.question, 220)
  let score = input.candidate.enabled ? 40 : -100

  if (input.candidate.role === 'list-item')
    score += 220
  else
    score -= 180

  if (candidateText)
    score += Math.min(20, candidateText.length)
  if (input.targetHint && candidateText && candidateText.includes(input.targetHint))
    score += 180
  if (input.targetHint && candidateText && input.targetHint.includes(candidateText))
    score += 150
  if (candidateText && questionText.includes(candidateText))
    score += 110
  if (/完成|取消|确认|确定|保存|应用|done|finish|ok|confirm|save|apply|cancel|close/u.test(candidateText))
    score -= 180

  return score
}

function pickPrimaryDesktopNavigationCandidate(input: {
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  interactables?: AlicizationLocalDesktopInspectionInteractable[] | null
  question: string
}) {
  const targetHint = extractRequestedDesktopNavigationTargetHint(input.question)
  return collectDesktopGuiCandidates(input)
    .filter(candidate => candidate.role === 'list-item')
    .sort((left, right) => scoreDesktopNavigationCandidate({
      candidate: right,
      question: input.question,
      targetHint,
    }) - scoreDesktopNavigationCandidate({
      candidate: left,
      question: input.question,
      targetHint,
    }))[0] ?? null
}

function scoreDesktopDestinationCandidate(input: {
  candidate: AlicizationLocalDesktopInspectionGuiCandidate
  question: string
  targetHint?: string | null
}) {
  const candidateText = sanitizeText(input.candidate.text, 160)
  const questionText = sanitizeText(input.question, 220)
  let score = input.candidate.enabled ? 30 : -100

  if (input.candidate.role === 'tab')
    score += 40
  else if (input.candidate.role === 'list-item')
    score += 38
  else if (input.candidate.role === 'menu-item')
    score += 28
  else if (input.candidate.role === 'link')
    score += 18
  else if (input.candidate.role === 'button')
    score += 8
  else
    score -= 80

  if (candidateText)
    score += Math.min(16, candidateText.length)
  if (input.targetHint && candidateText && candidateText.includes(input.targetHint))
    score += 180
  if (input.targetHint && candidateText && input.targetHint.includes(candidateText))
    score += 150
  if (candidateText && questionText.includes(candidateText))
    score += 50
  if (isDesktopCommitLikeText(candidateText))
    score -= 220

  return score
}

function pickPrimaryDesktopDestinationCandidate(input: {
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  interactables?: AlicizationLocalDesktopInspectionInteractable[] | null
  question: string
}) {
  const targetHint = extractRequestedDesktopDestinationTargetHint(input.question)
  if (!targetHint)
    return null

  const sortedCandidates = collectDesktopGuiCandidates(input)
    .filter(candidate =>
      candidate.role === 'tab'
      || candidate.role === 'list-item'
      || candidate.role === 'menu-item'
      || candidate.role === 'link'
      || candidate.role === 'button',
    )
    .sort((left, right) => scoreDesktopDestinationCandidate({
      candidate: right,
      question: input.question,
      targetHint,
    }) - scoreDesktopDestinationCandidate({
      candidate: left,
      question: input.question,
      targetHint,
    }))

  const bestCandidate = sortedCandidates[0] ?? null
  if (!bestCandidate)
    return null

  const bestScore = scoreDesktopDestinationCandidate({
    candidate: bestCandidate,
    question: input.question,
    targetHint,
  })
  return bestScore >= 120
    ? bestCandidate
    : null
}

function scoreDesktopDialogCommitCandidate(candidate: AlicizationLocalDesktopInspectionGuiCandidate) {
  const text = sanitizeText(candidate.text, 160)
  let score = scorePrimaryActionCandidate(candidate)

  if (candidate.role === 'button')
    score += 40
  else if (candidate.role === 'menu-item')
    score += 10

  if (/完成|确认|确定|保存|应用|继续|下一步|允许|同意|done|finish|ok|confirm|save|apply|continue|next|allow/iu.test(text))
    score += 120
  if (/取消|关闭|返回|忽略|跳过|稍后|cancel|close|back|dismiss|skip|later/iu.test(text))
    score -= 90

  return score
}

function pickPrimaryDesktopDialogCommitAction(input: {
  excludedCandidate?: AlicizationLocalDesktopInspectionGuiCandidate | null
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  interactables?: AlicizationLocalDesktopInspectionInteractable[] | null
}) {
  const excludedKey = `${input.excludedCandidate?.role ?? ''}|${sanitizeText(input.excludedCandidate?.text, 160)}|${input.excludedCandidate?.ordinal ?? ''}`
  return collectDesktopGuiCandidates(input)
    .filter((candidate) => {
      if (!candidate.enabled)
        return false
      if (candidate.role === 'checkbox' || candidate.role === 'radio' || candidate.role === 'select' || candidate.role === 'tab' || candidate.role === 'list-item')
        return false
      const candidateKey = `${candidate.role}|${sanitizeText(candidate.text, 160)}|${candidate.ordinal ?? ''}`
      return candidateKey !== excludedKey
    })
    .sort((left, right) => scoreDesktopDialogCommitCandidate(right) - scoreDesktopDialogCommitCandidate(left))[0] ?? null
}

function buildDesktopTypeActionArguments(input: {
  candidate: AlicizationLocalDesktopInspectionGuiCandidate
  expectedPhase?: AlicizationLocalDesktopInspectionPagePhase | null
  question: string
  submit?: boolean | null
}) {
  const requestedTargetText = extractRequestedInputTargetHint(input.question)
    || sanitizeText(input.candidate.text, 160)
    || undefined
  const candidateLabel = sanitizeText(input.candidate.text, 160)
  const searchLikeInput = isDesktopSearchInputCandidate(input.candidate) || looksLikeSearchInputLabel(requestedTargetText)
  const targetText = searchLikeInput && candidateLabel && requestedTargetText && candidateLabel.includes(requestedTargetText)
    ? candidateLabel
    : requestedTargetText
  const text = extractRequestedInputText(input.question)
    || (searchLikeInput ? extractRequestedSearchInputText(input.question) : null)
  if (!text)
    return undefined

  const submit = typeof input.submit === 'boolean'
    ? input.submit
    : shouldSubmitRequestedInput(input.question)
  const canContinueAfterSubmit = submit && (Boolean(input.expectedPhase) || searchLikeInput)
  return {
    text,
    targetText,
    submit,
    expectedPhase: submit ? input.expectedPhase ?? undefined : undefined,
    reinspectAfterAction: canContinueAfterSubmit,
    autoContinueSuggestedActions: canContinueAfterSubmit,
    maxAutoContinueSteps: canContinueAfterSubmit ? 1 : undefined,
    inspectionQuestion: canContinueAfterSubmit ? input.question : undefined,
    inspectionMaxSuggestedActions: canContinueAfterSubmit ? 3 : undefined,
  } satisfies Record<string, unknown>
}

function isHighImpactDesktopPrimaryAction(candidate: AlicizationLocalDesktopInspectionGuiCandidate | null | undefined) {
  const text = sanitizeText(candidate?.text, 160)
  if (!text)
    return false

  return /发布|发送|分享|删除|移除|清空|付款|支付|购买|下单|转账|提现|创建帖子|发布帖子|创建主题|发布主题|创建讨论|发布讨论|publish|send|share|delete|remove|clear|pay|payment|purchase|checkout|order|transfer|withdraw|post now|submit|create post|create thread|create topic|create discussion|start discussion/iu.test(text)
}

function pickPrimaryBrowserCandidate(
  browserPageContext: AlicizationLocalDesktopInspectionBrowserPageContext | null,
) {
  return [...browserPageContext?.interactables ?? []]
    .filter(candidate => candidate.disabled !== true)
    .sort((left, right) => scoreBrowserInteractableCandidate(right) - scoreBrowserInteractableCandidate(left))[0] ?? null
}

function tryParseBrowserUrl(raw: string | null | undefined) {
  const href = sanitizeText(raw, 320)
  if (!href)
    return null

  try {
    return new URL(href)
  }
  catch {
    return null
  }
}

function isSearchResultNavigationLabel(label: string) {
  const normalized = sanitizeText(label, 160)
  if (!normalized)
    return false

  if (/相关搜索|下一页|上一页|更多结果|search tools|related searches|next page|previous page/iu.test(normalized))
    return true

  return /^(?:视频|图片|资讯|新闻|地图|购物|学术|更多|工具|贴吧|文库|百科|知道|images?|videos?|news|maps?|shopping|scholar|tools|more)$/iu.test(normalized)
}

function isSearchEngineResultRedirectUrl(url: URL) {
  const hostname = url.hostname.toLowerCase()
  const pathname = url.pathname.toLowerCase()

  if ((hostname === 'www.baidu.com' || hostname === 'm.baidu.com') && pathname === '/link')
    return true
  if ((hostname === 'www.google.com' || hostname === 'google.com') && pathname === '/url' && url.searchParams.has('q'))
    return true
  if ((hostname === 'duckduckgo.com' || hostname === 'www.duckduckgo.com') && pathname.startsWith('/l/'))
    return true

  return false
}

function isSearchEngineNavigationUrl(url: URL) {
  const hostname = url.hostname.toLowerCase()

  if (isSearchEngineResultRedirectUrl(url))
    return false

  const rootSearchHosts = new Set([
    'www.baidu.com',
    'm.baidu.com',
    'www.google.com',
    'google.com',
    'www.bing.com',
    'bing.com',
    'duckduckgo.com',
    'www.duckduckgo.com',
    'search.yahoo.com',
    'www.sogou.com',
    'www.so.com',
  ])
  if (rootSearchHosts.has(hostname))
    return true

  const verticalSearchHosts = new Set([
    'image.baidu.com',
    'video.baidu.com',
    'news.baidu.com',
    'map.baidu.com',
    'maps.baidu.com',
    'images.google.com',
    'news.google.com',
    'maps.google.com',
    'shopping.google.com',
  ])
  return verticalSearchHosts.has(hostname)
}

function classifySearchResultCandidate(candidate: AlicizationLocalDesktopInspectionBrowserInteractable) {
  const label = sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 160)
  const parsedUrl = tryParseBrowserUrl(candidate.href)

  if (isSearchResultNavigationLabel(label))
    return 'navigation' as const

  if (!parsedUrl)
    return label ? 'result-label' as const : 'fallback' as const

  if (isSearchEngineNavigationUrl(parsedUrl))
    return 'navigation' as const

  if (isSearchEngineResultRedirectUrl(parsedUrl))
    return 'result-redirect' as const

  return 'result-external' as const
}

function pickSearchResultCandidate(
  browserPageContext: AlicizationLocalDesktopInspectionBrowserPageContext | null,
) {
  const candidates = [...browserPageContext?.interactables ?? []]
    .filter((candidate) => {
      if (candidate.disabled === true)
        return false
      const role = sanitizeText(candidate.role, 32).toLowerCase()
      const tag = sanitizeText(candidate.tag, 32).toLowerCase()
      return role === 'link' || tag === 'a' || Boolean(candidate.href)
    })

  return candidates.find(candidate => classifySearchResultCandidate(candidate) === 'result-external')
    ?? candidates.find(candidate => classifySearchResultCandidate(candidate) === 'result-redirect')
    ?? candidates.find(candidate => classifySearchResultCandidate(candidate) === 'result-label')
    ?? candidates.find(candidate => classifySearchResultCandidate(candidate) === 'fallback')
    ?? candidates.find(candidate => classifySearchResultCandidate(candidate) !== 'navigation')
    ?? null
}

function pickSearchResultPaginationCandidate(
  browserPageContext: AlicizationLocalDesktopInspectionBrowserPageContext | null,
) {
  const candidates = [...browserPageContext?.interactables ?? []]
    .filter((candidate) => {
      if (candidate.disabled === true)
        return false
      const role = sanitizeText(candidate.role, 32).toLowerCase()
      const tag = sanitizeText(candidate.tag, 32).toLowerCase()
      const type = sanitizeText(candidate.type, 32).toLowerCase()
      const label = sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 160)
      const linkLike = role === 'link' || tag === 'a' || Boolean(candidate.href)
      const buttonLike = role === 'button' || tag === 'button' || type === 'button' || type === 'submit'
      if (!linkLike && !buttonLike)
        return false
      if (classifySearchResultCandidate(candidate) !== 'navigation')
        return false
      return /下一页|更多结果|next page|more results?/iu.test(label)
    })

  return candidates[0] ?? null
}

function pickSocialComposeCandidate(
  browserPageContext: AlicizationLocalDesktopInspectionBrowserPageContext | null,
) {
  return [...browserPageContext?.interactables ?? []]
    .find((candidate) => {
      if (candidate.disabled === true)
        return false
      const label = sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 160)
      return looksLikeComposeEntryLabel(label)
    }) ?? null
}

function looksLikeComposeEntryLabel(label: string) {
  if (!label)
    return false

  const normalized = sanitizeText(label, 160)
  if (!normalized)
    return false

  if (/发微博|写微博|发布微博|发帖|写帖子|创建帖子|新建帖子|发布帖子|写主题|创建主题|新建主题|发布主题|写讨论|创建讨论|新建讨论|发布讨论|compose/iu.test(normalized))
    return true

  return /\b(?:new|create|write|start|share)(?:\s+\w+){0,2}\s+(?:post|thread|topic|discussion)\b/iu.test(normalized)
}

function questionSignalsUploadBridge(question: string) {
  return /上传图片|上传照片|上传文件|添加图片|添加照片|添加附件|选图|选择图片|选择文件|attach|upload(?: image| photo| file)?|add image|add photo|choose file|select file|browse/iu.test(question)
}

function isLowRiskFormUploadBridgeCandidate(candidate: AlicizationLocalDesktopInspectionBrowserInteractable) {
  if (candidate.disabled === true)
    return false

  const label = sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 160)
  const role = sanitizeText(candidate.role || candidate.tag, 32).toLowerCase()
  const type = sanitizeText(candidate.type, 32).toLowerCase()
  if (!label)
    return false
  if (type === 'submit')
    return false
  if (role !== 'button' && role !== 'link' && candidate.tag !== 'button' && candidate.tag !== 'a')
    return false
  if (/发布|发送|分享|删除|移除|清空|付款|支付|购买|下单|publish|submit|send|share|delete|remove|clear|pay|payment|purchase|checkout|order/iu.test(label))
    return false

  return /上传图片|上传照片|上传文件|添加图片|添加照片|添加附件|选择图片|选择文件|上传|attach|upload(?: image| photo| file)?|add image|add photo|choose file|select file|browse|相册|图片|照片|media/iu.test(label)
}

function pickFormUploadBridgeCandidate(
  browserPageContext: AlicizationLocalDesktopInspectionBrowserPageContext | null,
) {
  return [...browserPageContext?.interactables ?? []]
    .filter(candidate => isLowRiskFormUploadBridgeCandidate(candidate))
    .sort((left, right) => scoreBrowserInteractableCandidate(right) - scoreBrowserInteractableCandidate(left))[0] ?? null
}

function questionSignalsContentContinuation(question: string) {
  return /继续|接着|继续看|接着看|继续读|继续阅读|往下看|往下读|下一页|下一步|继续浏览|继续处理|继续这个页面|more|next page|keep going|continue reading|continue browsing/iu.test(question)
}

function isLowRiskContentDetailContinuationCandidate(candidate: AlicizationLocalDesktopInspectionBrowserInteractable) {
  if (candidate.disabled === true)
    return false

  const label = sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 160)
  if (!label)
    return false

  if (/发布|发送|分享|删除|移除|清空|付款|支付|购买|下单|转账|publish|submit|send|share|delete|remove|clear|pay|payment|purchase|checkout|order|transfer/iu.test(label))
    return false

  return /继续阅读|继续|下一页|下一个|更多|展开|查看全文|阅读原文|继续查看|继续浏览|read more|continue|next|more|expand|view full|open full|next page/iu.test(label)
}

function pickContentDetailContinuationCandidate(
  browserPageContext: AlicizationLocalDesktopInspectionBrowserPageContext | null,
) {
  return [...browserPageContext?.interactables ?? []]
    .filter(candidate => isLowRiskContentDetailContinuationCandidate(candidate))
    .sort((left, right) => scoreBrowserInteractableCandidate(right) - scoreBrowserInteractableCandidate(left))[0] ?? null
}

function uniqueTextList(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function buildBrowserContextHaystack(input: {
  browserPageContext?: AlicizationLocalDesktopInspectionBrowserPageContext | null
  focusTarget?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  summary?: AlicizationScreenSemanticSummary | null
}) {
  const browserPageContext = normalizeBrowserPageContext(input.browserPageContext)
  return [
    sanitizeText(browserPageContext?.url, 320).toLowerCase(),
    sanitizeText(browserPageContext?.title, 320).toLowerCase(),
    sanitizeText(browserPageContext?.textExcerpt, 320).toLowerCase(),
    sanitizeText(input.summary?.content.summary, 240).toLowerCase(),
    sanitizeText(input.focusTarget?.title, 240).toLowerCase(),
    sanitizeText(input.foregroundWindow?.title, 240).toLowerCase(),
  ].filter(Boolean).join(' ')
}

function looksLikeDesktopDialogHandoff(input: {
  browserPageContext?: AlicizationLocalDesktopInspectionBrowserPageContext | null
  focusTarget?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  summary?: AlicizationScreenSemanticSummary | null
}) {
  const guiStructure = input.guiStructure ?? null
  if (!guiStructure?.primaryActionCandidates.length)
    return false

  const haystack = buildBrowserContextHaystack(input)
  const primaryActionText = guiStructure.primaryActionCandidates
    .map(candidate => sanitizeText(candidate.text, 80).toLowerCase())
    .filter(Boolean)
    .join(' ')
  const primaryInputText = guiStructure.primaryInputCandidates
    .map(candidate => sanitizeText(candidate.text, 80).toLowerCase())
    .filter(Boolean)
    .join(' ')

  const dialogCue = /choose file|select file|file picker|permission|permissions|allow|upload|open file|save file|打开|选择文件|文件选择|权限|允许|上传/iu.test(haystack)
    || /打开|允许|选择|保存|继续|确定|ok|open|allow|choose|save/iu.test(primaryActionText)
  const desktopLikeForm = guiStructure.primaryInputCandidates.length > 0
    || /文件名|filename|path|目录|folder|location/iu.test(primaryInputText)

  return dialogCue && desktopLikeForm
}

function looksLikeBrowserSocialFeed(input: {
  browserPageContext?: AlicizationLocalDesktopInspectionBrowserPageContext | null
  summary?: AlicizationScreenSemanticSummary | null
}) {
  const browserPageContext = normalizeBrowserPageContext(input.browserPageContext)
  if (!browserPageContext)
    return false

  const haystack = buildBrowserContextHaystack({
    browserPageContext,
    summary: input.summary,
  })
  const interactableLabels = browserPageContext.interactables
    .map(candidate => sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 160))
    .filter(Boolean)
  const socialNavCount = interactableLabels.filter(label => /首页|关注|推荐|热搜|热门|最新|超话|同城|发现|动态|广场|社区|feed|home|following|trending|for you|discover|explore|timeline/iu.test(label)).length
  const socialHost = /weibo\.com|weibo\.cn/iu.test(browserPageContext.url ?? '')
    || /微博/u.test(haystack)
  const socialSurfaceCue = socialHost
    || /社区|广场|动态|timeline|social|community|forum|discussion|feed/iu.test(haystack)
  const feedCue = /feed|信息流|首页|关注|推荐|热搜|热门|最新|动态|广场|社区|for you|following|trending|discover|explore|timeline/iu.test(haystack)

  return socialSurfaceCue && (feedCue || socialNavCount >= 2)
}

function looksLikeBrowserFormEntry(input: {
  browserPageContext: AlicizationLocalDesktopInspectionBrowserPageContext
  haystack: string
  textInputCount: number
}) {
  if (input.textInputCount <= 0)
    return false

  const actionLabels = input.browserPageContext.interactables
    .map(candidate => sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 160))
    .filter(Boolean)
  const inputLabels = input.browserPageContext.interactables
    .filter(candidate => isBrowserInputInteractable(candidate))
    .map(candidate => sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 160))
    .filter(Boolean)
  const submitActionCuePattern = /发布|提交|发送|保存|评论|回复|发微博|写微博|发帖|post|publish|submit|reply|comment|send|save|create post|create thread|create topic|create discussion|start discussion/iu
  const communityComposerCuePattern = /compose|发布|提交|发送|保存|评论|回复|内容|正文|caption|message|draft|post editor|发微博|写微博|发帖|新鲜事|share|write your update|write your discussion|start discussion|new discussion|create thread|create topic|create discussion|\bdiscussion body\b|\bdiscussion title\b|\bthread body\b|\bthread title\b|\btopic body\b|\btopic title\b|\bpost body\b|\bpost title\b|\bmessage body\b|\bmessage title\b/iu
  const hasSubmitAction = input.browserPageContext.interactables.some((candidate) => {
    const label = sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 160)
    const type = sanitizeText(candidate.type, 32).toLowerCase()
    return type === 'submit'
      || submitActionCuePattern.test(label)
  })
  const composeCue = communityComposerCuePattern.test(input.haystack)
    || actionLabels.some(label => submitActionCuePattern.test(label) || communityComposerCuePattern.test(label))
    || inputLabels.some(label => communityComposerCuePattern.test(label))

  if (input.textInputCount >= 2)
    return true

  return input.textInputCount >= 1 && hasSubmitAction && composeCue
}

function hasUploadSelectionState(input: {
  browserPageContext: AlicizationLocalDesktopInspectionBrowserPageContext
  haystack: string
}) {
  const interactableLabels = input.browserPageContext.interactables
    .map(candidate => sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 160))
    .filter(Boolean)
  return /已选择|已添加|已上传|upload ready|upload complete|selected image|selected file|image selected|file selected|preview|附件|图片预览|已选图片|已选文件/iu.test(input.haystack)
    || interactableLabels.some(label => /重新选择|重新上传|移除图片|移除附件|replace image|change image|remove image|preview|已上传|已选择/iu.test(label))
}

function inferBrowserPagePhase(input: {
  browserPageContext?: AlicizationLocalDesktopInspectionBrowserPageContext | null
  summary?: AlicizationScreenSemanticSummary | null
}) {
  const browserPageContext = normalizeBrowserPageContext(input.browserPageContext)
  if (!browserPageContext)
    return 'unknown' as const

  const haystack = buildBrowserContextHaystack({
    browserPageContext,
    summary: input.summary,
  })
  const interactables = browserPageContext.interactables
  const hasPasswordField = interactables.some(candidate =>
    sanitizeText(candidate.type, 32).toLowerCase() === 'password'
    || /password|密码/iu.test(sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 120)))
  const hasCredentialField = interactables.some((candidate) => {
    const type = sanitizeText(candidate.type, 32).toLowerCase()
    const label = sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 120)
    return type === 'email'
      || type === 'password'
      || /邮箱|email|账号|用户名|username|phone|手机号|密码|password/iu.test(label)
  })
  const textInputCount = interactables.filter((candidate) => {
    const tag = sanitizeText(candidate.tag, 32).toLowerCase()
    const role = sanitizeText(candidate.role, 32).toLowerCase()
    const type = sanitizeText(candidate.type, 32).toLowerCase()
    return tag === 'input'
      || role === 'textbox'
      || role === 'searchbox'
      || type === 'email'
      || type === 'password'
      || type === 'search'
      || type === 'text'
  }).length
  const linkCount = interactables.filter((candidate) => {
    const role = sanitizeText(candidate.role, 32).toLowerCase()
    const tag = sanitizeText(candidate.tag, 32).toLowerCase()
    return role === 'link' || tag === 'a' || Boolean(candidate.href)
  }).length

  if (
    hasPasswordField
    || (
      hasCredentialField
      && /login|log in|sign in|signin|auth|authenticate|登录|登陆|继续登录/iu.test(haystack)
    )
  ) {
    return 'login' as const
  }

  if (
    /[?&](?:q|query|wd|keyword|search)=/iu.test(browserPageContext.url ?? '')
    || /百度搜索|search results|搜索结果|results for|找到相关结果/iu.test(haystack)
    || (linkCount >= 3 && /search|搜索|百度|google|bing|duckduckgo/iu.test(haystack))
  ) {
    return 'search-results' as const
  }

  if (looksLikeBrowserSocialFeed({
    browserPageContext,
    summary: input.summary,
  })) {
    return 'social-feed' as const
  }

  const formEntryLike = looksLikeBrowserFormEntry({
    browserPageContext,
    haystack,
    textInputCount,
  })
  const uploadCue = /upload|上传|select file|choose file|file picker|文件选择/iu.test(haystack)
    || interactables.some(candidate => /选择文件|上传|upload|attach|browse/iu.test(sanitizeText(candidate.text || candidate.ariaLabel || candidate.title, 120)))
  const uploadSelectionState = hasUploadSelectionState({
    browserPageContext,
    haystack,
  })
  if (uploadSelectionState)
    return 'upload-flow' as const
  if (
    uploadCue
    && (uploadSelectionState || !formEntryLike)
  ) {
    return 'upload-flow' as const
  }

  if (formEntryLike)
    return 'form-entry' as const
  if (browserPageContext.title || browserPageContext.textExcerpt)
    return 'content-detail' as const
  return 'unknown' as const
}

function looksLikeBrowserChromeFocusShift(input: {
  browserPageContext?: AlicizationLocalDesktopInspectionBrowserPageContext | null
  focusTarget?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  question?: string | null
  summary?: AlicizationScreenSemanticSummary | null
}) {
  if (!isBrowserLike(input))
    return false

  const primaryInputLabels = input.guiStructure?.primaryInputCandidates
    .map(candidate => sanitizeText(candidate.text, 160))
    .filter(Boolean)
    ?? []
  const primaryActionLabels = input.guiStructure?.primaryActionCandidates
    .map(candidate => sanitizeText(candidate.text, 160))
    .filter(Boolean)
    ?? []
  const browserChromeInputVisible = primaryInputLabels.some(label => looksLikeBrowserChromeInputLabel(label))
  if (!browserChromeInputVisible)
    return false

  const focusCue = [
    input.question,
    input.browserPageContext?.textExcerpt,
    input.browserPageContext?.title,
    input.focusTarget?.title,
    input.foregroundWindow?.title,
    input.summary?.content.summary,
    input.summary?.source?.name,
  ].some(value => looksLikeBrowserChromeFocusCue(value))
  const shortcutRequested = Boolean(
    sanitizeText(input.question, 220)
    && extractRequestedDesktopShortcut(sanitizeText(input.question, 220)),
  )
  const browserChromeActionVisible = primaryActionLabels.some(label => looksLikeBrowserChromeActionLabel(label))
  const browserDomInteractablesVisible = (input.browserPageContext?.interactables.length ?? 0) > 0

  return (focusCue || (shortcutRequested && browserChromeActionVisible))
    && (!browserDomInteractablesVisible || focusCue)
}

function inferBrowserBlockingSignals(input: {
  browserPageContext?: AlicizationLocalDesktopInspectionBrowserPageContext | null
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  pagePhase: AlicizationLocalDesktopInspectionPagePhase
  summary?: AlicizationScreenSemanticSummary | null
  desktopDialogVisible?: boolean
}) {
  const signals: string[] = []
  const browserPageContext = normalizeBrowserPageContext(input.browserPageContext)

  if (input.pagePhase === 'login') {
    signals.push('credential-required', 'awaiting-input')
  }

  if (input.pagePhase === 'form-entry')
    signals.push('awaiting-input')

  if (input.pagePhase === 'upload-flow' || input.pagePhase === 'browser-desktop-handoff')
    signals.push('awaiting-selection')

  if (input.desktopDialogVisible)
    signals.push('desktop-dialog-visible')

  if (browserPageContext?.textExcerpt && /\bloading\b|加载中|please wait|working\.\.\./iu.test(browserPageContext.textExcerpt))
    signals.push('page-loading')

  if (input.summary?.content.kind === 'error')
    signals.push('error-visible')

  return uniqueTextList(signals)
}

function inferBrowserNextActionIntent(input: {
  blockingSignals: string[]
  desktopDialogVisible: boolean
  pagePhase: AlicizationLocalDesktopInspectionPagePhase
}) {
  if (input.desktopDialogVisible)
    return 'confirm-dialog' as const
  if (input.pagePhase === 'browser-desktop-handoff')
    return 'confirm-dialog' as const
  if (input.pagePhase === 'login')
    return 'authenticate' as const
  if (input.pagePhase === 'search-results')
    return 'open-search-result' as const
  if (input.pagePhase === 'social-feed')
    return 'compose-post' as const
  if (input.pagePhase === 'form-entry' || input.pagePhase === 'upload-flow')
    return 'fill-form' as const
  if (input.blockingSignals.includes('page-loading'))
    return 'continue-browsing' as const
  if (input.pagePhase === 'content-detail')
    return 'continue-browsing' as const
  return 'unknown' as const
}

function normalizeBrowserBlockingSignalsForQuestion(input: {
  blockingSignals: string[]
  browserPageContext?: AlicizationLocalDesktopInspectionBrowserPageContext | null
  pagePhase: AlicizationLocalDesktopInspectionPagePhase
  question?: string | null
}) {
  const question = sanitizeText(input.question, 220)
  if (
    input.pagePhase !== 'form-entry'
    || !question
    || !questionSignalsUploadBridge(question)
    || !pickFormUploadBridgeCandidate(normalizeBrowserPageContext(input.browserPageContext))
  ) {
    return input.blockingSignals
  }

  return input.blockingSignals.filter(signal => signal !== 'awaiting-input')
}

function buildAlicizationDesktopInspectionWorkflowPlan(input: {
  blockingSignals: string[]
  browserPageContext?: AlicizationLocalDesktopInspectionBrowserPageContext | null
  executionStrategy: AlicizationLocalDesktopInspectionExecutionStrategy
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  interactables?: AlicizationLocalDesktopInspectionInteractable[] | null
  nextActionIntent: AlicizationLocalDesktopInspectionNextActionIntent
  pagePhase: AlicizationLocalDesktopInspectionPagePhase
  question?: string | null
}) {
  const browserPageContext = normalizeBrowserPageContext(input.browserPageContext)
  const blockingReasons = uniqueTextList(input.blockingSignals)
  const steps: AlicizationLocalDesktopInspectionWorkflowStep[] = []
  const repairActions: AlicizationLocalDesktopInspectionSuggestedAction[] = []
  const question = sanitizeText(input.question, 220)
  const socialComposeCandidate = input.pagePhase === 'social-feed'
    ? pickSocialComposeCandidate(browserPageContext)
    : null
  const primaryBrowserCandidate = input.pagePhase === 'search-results'
    ? pickSearchResultCandidate(browserPageContext)
    : input.pagePhase === 'social-feed'
      ? socialComposeCandidate
      : pickPrimaryBrowserCandidate(browserPageContext)
  const contentDetailContinuationCandidate = input.pagePhase === 'content-detail' && question
    ? pickContentDetailContinuationCandidate(browserPageContext)
    : null
  const primaryDesktopAction = input.guiStructure?.primaryActionCandidates[0] ?? null
  const primaryBrowserInputCandidate = question
    ? pickPrimaryBrowserInputCandidate({
        browserPageContext,
        pagePhase: input.pagePhase,
        question,
      })
    : null
  const uploadBridgeCandidate = input.pagePhase === 'form-entry'
    ? pickFormUploadBridgeCandidate(browserPageContext)
    : null
  const primaryDesktopInputCandidate = question
    ? pickPrimaryDesktopInputCandidate({
        guiStructure: input.guiStructure,
        question,
      })
    : null
  const questionWantsDesktopTab = Boolean(question && questionSignalsDesktopTabRequest(question))
  const questionWantsDesktopNavigation = Boolean(
    question
    && !questionWantsDesktopTab
    && questionSignalsDesktopNavigationRequest(question),
  )
  const questionWantsDesktopDestination = Boolean(
    question
    && !questionWantsDesktopTab
    && !questionWantsDesktopNavigation
    && questionSignalsDesktopDestinationRequest(question),
  )
  const questionWantsDesktopToggle = Boolean(question && questionSignalsDesktopToggleRequest(question))
  const desktopTabCandidate = questionWantsDesktopTab
    ? pickPrimaryDesktopTabCandidate({
        guiStructure: input.guiStructure,
        interactables: input.interactables,
        question,
      })
    : null
  const desktopNavigationCandidate = questionWantsDesktopNavigation
    ? pickPrimaryDesktopNavigationCandidate({
        guiStructure: input.guiStructure,
        interactables: input.interactables,
        question,
      })
    : null
  const desktopDestinationCandidate = questionWantsDesktopDestination
    ? pickPrimaryDesktopDestinationCandidate({
        guiStructure: input.guiStructure,
        interactables: input.interactables,
        question,
      })
    : null
  const desktopSelectionCandidate = question
    && !questionWantsDesktopTab
    && !questionWantsDesktopNavigation
    && !questionWantsDesktopToggle
    && questionSignalsDesktopSelectionRequest(question)
    ? pickPrimaryDesktopSelectionCandidate({
        guiStructure: input.guiStructure,
        interactables: input.interactables,
        question,
      })
    : null
  const desktopSelectorCandidate = question
    && !desktopSelectionCandidate
    && questionSignalsDesktopSelectionRequest(question)
    ? pickPrimaryDesktopSelectorCandidate({
        guiStructure: input.guiStructure,
        interactables: input.interactables,
        question,
      })
    : null
  const desktopToggleCandidate = questionWantsDesktopToggle
    ? pickPrimaryDesktopToggleCandidate({
        guiStructure: input.guiStructure,
        interactables: input.interactables,
        question,
      })
    : null
  const foregroundTitle = sanitizeText(input.foregroundWindow?.title, 120)
  const browserChromeFocusWorkflow = input.nextActionIntent === 'focus-address-bar'
    && Boolean(primaryDesktopInputCandidate && looksLikeBrowserChromeInputLabel(primaryDesktopInputCandidate.text))

  if (browserChromeFocusWorkflow) {
    steps.push({
      id: 'relist-browser-chrome-controls',
      title: '重新列出当前桌面控件确认地址栏焦点后的可操作项',
      rationale: '快捷键已经把浏览器焦点切到地址栏或 chrome 控件。先重新列出桌面控件并锁定输入位，再决定是输入网址、搜索词还是点击刷新等浏览器按钮更稳。',
      status: 'ready',
      toolName: 'desktop_list_interactables',
      arguments: {
        maxItems: 12,
      },
    })

    if (primaryDesktopInputCandidate) {
      steps.push({
        id: 'focus-browser-chrome-input',
        title: primaryDesktopInputCandidate.text
          ? `锁定“${primaryDesktopInputCandidate.text}”输入位`
          : '锁定当前浏览器 chrome 输入位',
        rationale: '当前已经看见地址栏输入位。等重新确认控件稳定后，再决定输入目标网址、搜索词或后续浏览器动作更稳。',
        status: 'pending',
        toolName: 'desktop_list_interactables',
        arguments: {
          role: 'input',
          maxItems: 10,
        },
      })
    }

    repairActions.push({
      kind: 'desktop-relist-browser-chrome-controls',
      title: '若地址栏控件不稳定，先重新列出桌面控件',
      rationale: '如果浏览器 chrome 控件没有稳定暴露出来，先重新抓取桌面控件，再确认地址栏、刷新或后续输入位是否已经可用。',
      toolName: 'desktop_list_interactables',
      arguments: {
        maxItems: 12,
      },
    })

    return {
      advanceCondition: 'browser-chrome-controls-stabilized',
      continuationMode: 'ready-to-act',
      completionSignals: ['browser-chrome-controls-visible', 'target-control-identified'],
      blockingReasons,
      failureCondition: 'browser-chrome-controls-still-unclear',
      repairActions,
      reentryHint: '如果地址栏聚焦后还是看不清可操作项，先重新列出控件，再确认地址栏、刷新按钮或其他浏览器 chrome 控件。',
      steps,
      targetPhase: 'unknown',
    } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
  }

  if (input.executionStrategy.mode === 'browser-desktop-handoff') {
    steps.push({
      id: 'stabilize-native-dialog',
      title: '等待原生对话框稳定',
      rationale: '当前网页流程已经切到系统级对话框，先确认前台原生窗口稳定，再继续操作更稳。',
      status: 'ready',
      toolName: 'desktop_wait',
      arguments: {
        titleIncludes: foregroundTitle || undefined,
      },
    })
    if (question && primaryDesktopInputCandidate) {
      const desktopTypeArguments = buildDesktopTypeActionArguments({
        candidate: primaryDesktopInputCandidate,
        question,
        submit: false,
      })
      if (desktopTypeArguments) {
        steps.push({
          id: 'type-dialog-input',
          title: primaryDesktopInputCandidate.text
            ? `向“${primaryDesktopInputCandidate.text}”输入指定内容`
            : '在当前对话框输入指定内容',
          rationale: '当前原生对话框已经看见稳定输入区域，先完成文件名或路径输入，再执行确认动作更稳。',
          status: 'ready',
          toolName: 'desktop_type_text',
          arguments: desktopTypeArguments,
        })
      }
    }
    steps.push({
      id: 'confirm-dialog-primary-action',
      title: primaryDesktopAction?.text
        ? `点击“${primaryDesktopAction.text}”完成当前对话框动作`
        : '点击当前对话框主动作',
      rationale: '原生对话框已经可见，优先完成当前主动作，再把流程带回浏览器。',
      postActionExpectedPhase: 'upload-flow',
      status: 'pending',
      toolName: 'desktop_click_element',
      arguments: primaryDesktopAction?.text
        ? {
            text: primaryDesktopAction.text,
            role: primaryDesktopAction.role,
          }
        : undefined,
    })
    repairActions.push({
      kind: 'desktop-relist-dialog-controls',
      title: '若原生对话框结构不清晰，先重新列出桌面控件',
      rationale: '如果当前原生窗口按钮或输入框没有稳定识别出来，先重新抓取可交互控件最稳。',
      toolName: 'desktop_list_interactables',
      arguments: {
        maxItems: 12,
      },
    })

    return {
      advanceCondition: 'native-dialog-dismissed-and-browser-upload-flow-visible',
      continuationMode: 'handoff-to-desktop',
      completionSignals: ['dialog-dismissed', 'upload-flow-returned-to-browser'],
      blockingReasons,
      failureCondition: 'native-dialog-still-blocking-browser-flow',
      repairActions,
      reentryHint: '如果后续又回到原生对话框，先重新列出桌面控件并确认浏览器上传流是否已经回流。',
      steps,
      targetPhase: 'upload-flow',
    } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
  }

  if (input.executionStrategy.mode === 'desktop-dialog') {
    const hasStructuredDesktopStep = Boolean(primaryDesktopAction || primaryDesktopInputCandidate)
    const highImpactPrimaryAction = isHighImpactDesktopPrimaryAction(primaryDesktopAction)
    const genericTargetPhase = 'unknown' as const
    const desktopDialogInputArguments = question && primaryDesktopInputCandidate
      ? buildDesktopTypeActionArguments({
          candidate: primaryDesktopInputCandidate,
          question,
          submit: false,
        })
      : undefined

    if (desktopDialogInputArguments && primaryDesktopInputCandidate) {
      steps.push({
        id: 'fill-desktop-dialog-input',
        title: primaryDesktopInputCandidate.text
          ? `向“${primaryDesktopInputCandidate.text}”输入指定内容`
          : '在当前桌面对话框输入指定内容',
        rationale: '当前前台软件窗口已经看见稳定输入区域，先完成明确指定的输入，再推进主动作更稳。',
        status: 'ready',
        toolName: 'desktop_type_text',
        arguments: desktopDialogInputArguments,
      })
    }

    if (question && desktopTabCandidate) {
      steps.push({
        id: 'switch-desktop-tab',
        title: desktopTabCandidate.text
          ? `切换到“${desktopTabCandidate.text}”标签页`
          : '切换当前桌面标签页',
        postActionExpectedPhase: genericTargetPhase,
        rationale: '问题里已经明确要求先切换桌面标签页，先把前台窗口带到目标标签，再重新检查后续设置控件，才能继续形成真实跨软件执行闭环。',
        status: 'ready',
        toolName: 'desktop_click_element',
        arguments: desktopTabCandidate.text
          ? {
              text: desktopTabCandidate.text,
              role: desktopTabCandidate.role,
            }
          : desktopTabCandidate.ordinal !== null
            ? {
                ordinal: desktopTabCandidate.ordinal,
                role: desktopTabCandidate.role,
              }
            : undefined,
      })

      steps.push({
        id: 'recheck-desktop-tab-scene',
        title: '重新列出当前桌面控件确认标签页切换是否生效',
        rationale: '切换标签页后，再次列出前台控件，确认目标标签是否已经激活，或者是否暴露了新的设置开关与确认动作。',
        status: 'pending',
        toolName: 'desktop_list_interactables',
        arguments: {
          maxItems: 12,
        },
      })

      repairActions.push({
        kind: 'desktop-relist-tab-controls',
        title: '若标签页切换后界面不稳定，先重新列出桌面控件',
        rationale: '如果目标标签页点击后没有暴露出新的后续控件，先重新抓取桌面控件，再确认是否已经进入目标设置区域。',
        toolName: 'desktop_list_interactables',
        arguments: {
          maxItems: 12,
        },
      })

      return {
        advanceCondition: 'desktop-tab-switched-or-follow-up-scene-identified',
        continuationMode: 'ready-to-act',
        completionSignals: ['desktop-tab-switched', 'follow-up-scene-identified'],
        blockingReasons,
        failureCondition: 'desktop-tab-switch-not-applied-or-follow-up-scene-unclear',
        repairActions,
        reentryHint: '如果目标标签页点完后界面还停在原地，先重新列出控件，再确认目标标签和后续设置项有没有变化。',
        steps,
        targetPhase: genericTargetPhase,
      } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
    }

    if (question && desktopNavigationCandidate) {
      steps.push({
        id: 'open-desktop-navigation-item',
        title: desktopNavigationCandidate.text
          ? `打开“${desktopNavigationCandidate.text}”导航项`
          : '打开当前桌面导航项',
        postActionExpectedPhase: genericTargetPhase,
        rationale: '问题里已经明确要求先进入某个侧边栏或列表分区，先把桌面界面带到目标导航项，再重新检查后续设置控件，才能继续形成真实跨软件执行闭环。',
        status: 'ready',
        toolName: 'desktop_click_element',
        arguments: desktopNavigationCandidate.text
          ? {
              text: desktopNavigationCandidate.text,
              role: desktopNavigationCandidate.role,
            }
          : desktopNavigationCandidate.ordinal !== null
            ? {
                ordinal: desktopNavigationCandidate.ordinal,
                role: desktopNavigationCandidate.role,
              }
            : undefined,
      })

      steps.push({
        id: 'recheck-desktop-navigation-scene',
        title: '重新列出当前桌面控件确认导航是否生效',
        rationale: '打开侧边栏或列表项后，再次列出前台控件，确认目标导航项是否已经激活，或者是否暴露了新的设置开关与确认动作。',
        status: 'pending',
        toolName: 'desktop_list_interactables',
        arguments: {
          maxItems: 12,
        },
      })

      repairActions.push({
        kind: 'desktop-relist-navigation-controls',
        title: '若导航项切换后界面不稳定，先重新列出桌面控件',
        rationale: '如果目标侧边栏或列表项点击后没有暴露出新的后续控件，先重新抓取桌面控件，再确认是否已经进入目标设置区域。',
        toolName: 'desktop_list_interactables',
        arguments: {
          maxItems: 12,
        },
      })

      return {
        advanceCondition: 'desktop-navigation-item-opened-or-follow-up-scene-identified',
        continuationMode: 'ready-to-act',
        completionSignals: ['desktop-navigation-item-opened', 'follow-up-scene-identified'],
        blockingReasons,
        failureCondition: 'desktop-navigation-item-not-opened-or-follow-up-scene-unclear',
        repairActions,
        reentryHint: '如果目标侧边栏或列表项点完后界面还停在原地，先重新列出控件，再确认目标导航项和后续设置项有没有变化。',
        steps,
        targetPhase: genericTargetPhase,
      } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
    }

    if (
      question
      && questionWantsDesktopDestination
      && desktopDestinationCandidate
      && (!questionSignalsDesktopSelectionRequest(question) || !desktopSelectionCandidate)
    ) {
      steps.push({
        id: 'open-desktop-destination',
        title: desktopDestinationCandidate.text
          ? `进入“${desktopDestinationCandidate.text}”目标区域`
          : '进入当前目标区域',
        postActionExpectedPhase: genericTargetPhase,
        rationale: '问题里已经明确要求先进入某个目标区域。先把前台软件带到目标分区，再重新检查后续设置控件，才能继续形成真实跨软件执行闭环。',
        status: 'ready',
        toolName: 'desktop_click_element',
        arguments: desktopDestinationCandidate.text
          ? {
              text: desktopDestinationCandidate.text,
              role: desktopDestinationCandidate.role,
            }
          : desktopDestinationCandidate.ordinal !== null
            ? {
                ordinal: desktopDestinationCandidate.ordinal,
                role: desktopDestinationCandidate.role,
              }
            : undefined,
      })

      steps.push({
        id: 'recheck-desktop-destination-scene',
        title: '重新列出当前桌面控件确认目标区域是否已经打开',
        rationale: '进入目标区域后，再次列出前台控件，确认目标分区是否已经激活，或者是否暴露了新的设置开关与确认动作。',
        status: 'pending',
        toolName: 'desktop_list_interactables',
        arguments: {
          maxItems: 12,
        },
      })

      repairActions.push({
        kind: 'desktop-relist-destination-controls',
        title: '若目标区域切换后界面不稳定，先重新列出桌面控件',
        rationale: '如果目标区域点击后没有暴露出新的后续控件，先重新抓取桌面控件，再确认是否已经进入目标设置区域。',
        toolName: 'desktop_list_interactables',
        arguments: {
          maxItems: 12,
        },
      })

      return {
        advanceCondition: 'desktop-destination-opened-or-follow-up-scene-identified',
        continuationMode: 'ready-to-act',
        completionSignals: ['desktop-destination-opened', 'follow-up-scene-identified'],
        blockingReasons,
        failureCondition: 'desktop-destination-not-opened-or-follow-up-scene-unclear',
        repairActions,
        reentryHint: '如果目标区域点完后界面还停在原地，先重新列出控件，再确认目标项和后续设置项有没有变化。',
        steps,
        targetPhase: genericTargetPhase,
      } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
    }

    if (question && desktopSelectorCandidate) {
      steps.push({
        id: 'open-desktop-selector',
        title: desktopSelectorCandidate.text
          ? `打开“${desktopSelectorCandidate.text}”选择器`
          : '打开当前桌面选择器',
        postActionExpectedPhase: genericTargetPhase,
        rationale: '问题里已经明确要求切换到某个设置值，但当前前台只看见选择器入口。先展开下拉或弹出式选择器，再重新检查具体选项，才能继续形成真实桌面执行闭环。',
        status: 'ready',
        toolName: 'desktop_click_element',
        arguments: desktopSelectorCandidate.text
          ? {
              text: desktopSelectorCandidate.text,
              role: desktopSelectorCandidate.role,
            }
          : desktopSelectorCandidate.ordinal !== null
            ? {
                ordinal: desktopSelectorCandidate.ordinal,
                role: desktopSelectorCandidate.role,
              }
            : undefined,
      })

      steps.push({
        id: 'recheck-desktop-selector-options',
        title: '重新列出当前桌面控件确认选择器选项是否出现',
        rationale: '展开选择器后，再次列出前台控件，确认目标选项是否已经出现，或者是否暴露了新的后续设置动作。',
        status: 'pending',
        toolName: 'desktop_list_interactables',
        arguments: {
          maxItems: 12,
        },
      })

      repairActions.push({
        kind: 'desktop-relist-selector-controls',
        title: '若选择器展开后界面不稳定，先重新列出桌面控件',
        rationale: '如果目标选择器点击后没有稳定暴露出具体选项，先重新抓取桌面控件，再确认是否已经出现新的菜单项或确认动作。',
        toolName: 'desktop_list_interactables',
        arguments: {
          maxItems: 12,
        },
      })

      return {
        advanceCondition: 'desktop-selector-opened-or-selection-options-visible',
        continuationMode: 'ready-to-act',
        completionSignals: ['desktop-selector-opened', 'selection-options-visible'],
        blockingReasons,
        failureCondition: 'desktop-selector-not-opened-or-selection-options-still-hidden',
        repairActions,
        reentryHint: '如果点开选择器后界面还停在原地，先重新列出控件，再确认目标菜单项、确认按钮或后续场景有没有变化。',
        steps,
        targetPhase: genericTargetPhase,
      } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
    }

    if (question && questionSignalsDesktopSelectionRequest(question) && desktopSelectionCandidate) {
      const desktopSelectionCommitAction = pickPrimaryDesktopDialogCommitAction({
        excludedCandidate: desktopSelectionCandidate,
        guiStructure: input.guiStructure,
        interactables: input.interactables,
      })
      const highImpactSelectionCommitAction = isHighImpactDesktopPrimaryAction(desktopSelectionCommitAction)

      steps.push({
        id: 'select-desktop-setting-item',
        title: desktopSelectionCandidate.text
          ? `选择“${desktopSelectionCandidate.text}”作为当前设置项`
          : '选择当前桌面设置项',
        postActionExpectedPhase: genericTargetPhase,
        rationale: '问题里已经明确要求切换到某个设置项，先选择目标项，再决定是否需要确认提交，才能形成真实桌面设置执行闭环。',
        status: 'ready',
        toolName: 'desktop_click_element',
        arguments: desktopSelectionCandidate.text
          ? {
              text: desktopSelectionCandidate.text,
              role: desktopSelectionCandidate.role,
            }
          : desktopSelectionCandidate.ordinal !== null
            ? {
                ordinal: desktopSelectionCandidate.ordinal,
                role: desktopSelectionCandidate.role,
              }
            : undefined,
      })

      if (desktopSelectionCommitAction) {
        steps.push({
          id: 'confirm-desktop-setting-selection',
          title: desktopSelectionCommitAction.text
            ? `点击“${desktopSelectionCommitAction.text}”确认当前设置选择`
            : '确认当前桌面设置选择',
          postActionExpectedPhase: genericTargetPhase,
          rationale: highImpactSelectionCommitAction
            ? '当前设置选择后的确认动作可能触发高风险结果，继续前需要先经过宿主确认边界。'
            : '选中目标设置项后，再点击明确的确认按钮提交当前选择，最后重新检查前台界面最稳。',
          status: highImpactSelectionCommitAction ? 'blocked' : 'pending',
          toolName: 'desktop_click_element',
          arguments: desktopSelectionCommitAction.text
            ? {
                text: desktopSelectionCommitAction.text,
                role: desktopSelectionCommitAction.role,
              }
            : desktopSelectionCommitAction.ordinal !== null
              ? {
                  ordinal: desktopSelectionCommitAction.ordinal,
                  role: desktopSelectionCommitAction.role,
                }
              : undefined,
        })
      }

      steps.push({
        id: 'recheck-desktop-setting-selection-scene',
        title: '重新列出当前桌面控件确认设置选择是否生效',
        rationale: '选择设置项并完成确认后，再次列出前台控件，确认当前选项是否已经切换，或者界面是否进入新的后续场景。',
        status: desktopSelectionCommitAction && highImpactSelectionCommitAction
          ? 'blocked'
          : 'pending',
        toolName: 'desktop_list_interactables',
        arguments: {
          maxItems: 12,
        },
      })

      repairActions.push({
        kind: 'desktop-relist-setting-selection-controls',
        title: '若设置项或确认按钮不稳定，先重新列出桌面控件',
        rationale: '如果设置页目标项或确认按钮没有被稳定识别出来，先重新抓取桌面控件，再决定下一步最稳。',
        toolName: 'desktop_list_interactables',
        arguments: {
          maxItems: 12,
        },
      })

      return {
        advanceCondition: 'desktop-setting-selection-committed-or-follow-up-scene-identified',
        continuationMode: highImpactSelectionCommitAction
          ? 'await-host-input'
          : 'ready-to-act',
        completionSignals: ['desktop-setting-selected', 'follow-up-scene-identified'],
        blockingReasons: highImpactSelectionCommitAction
          ? uniqueTextList([...blockingReasons, 'host-confirmation-required'])
          : blockingReasons,
        failureCondition: highImpactSelectionCommitAction
          ? 'desktop-setting-selection-awaiting-host-confirmation-before-commit'
          : 'desktop-setting-selection-not-applied-or-follow-up-scene-unclear',
        repairActions,
        reentryHint: highImpactSelectionCommitAction
          ? '如果当前设置选择后的确认动作会触发高风险结果，先确认风险边界，再重新列出控件确认是否还有更低风险路径。'
          : '如果设置页还停在原地，先重新列出控件，再确认目标项、确认按钮或后续场景有没有变化。',
        steps,
        targetPhase: genericTargetPhase,
      } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
    }

    if (question && questionSignalsDesktopToggleRequest(question) && desktopToggleCandidate) {
      const desktopToggleCommitAction = pickPrimaryDesktopDialogCommitAction({
        excludedCandidate: desktopToggleCandidate,
        guiStructure: input.guiStructure,
        interactables: input.interactables,
      })
      const highImpactToggleCommitAction = isHighImpactDesktopPrimaryAction(desktopToggleCommitAction)

      steps.push({
        id: 'toggle-desktop-setting',
        title: desktopToggleCandidate.text
          ? `切换“${desktopToggleCandidate.text}”设置开关`
          : '切换当前桌面设置开关',
        postActionExpectedPhase: genericTargetPhase,
        rationale: '问题里已经明确要求切换当前设置项，先点击对应 checkbox 或菜单项，再决定是否需要确认提交，才能形成真实桌面执行闭环。',
        status: 'ready',
        toolName: 'desktop_click_element',
        arguments: desktopToggleCandidate.text
          ? {
              text: desktopToggleCandidate.text,
              role: desktopToggleCandidate.role,
            }
          : desktopToggleCandidate.ordinal !== null
            ? {
                ordinal: desktopToggleCandidate.ordinal,
                role: desktopToggleCandidate.role,
              }
            : undefined,
      })

      if (desktopToggleCommitAction) {
        steps.push({
          id: 'confirm-desktop-setting-change',
          title: desktopToggleCommitAction.text
            ? `点击“${desktopToggleCommitAction.text}”确认当前设置变更`
            : '确认当前桌面设置变更',
          postActionExpectedPhase: genericTargetPhase,
          rationale: highImpactToggleCommitAction
            ? '当前设置变更后的确认动作可能触发高风险结果，继续前需要先经过宿主确认边界。'
            : '切换设置后，再点击明确的确认按钮提交当前变更，最后重新检查前台界面最稳。',
          status: highImpactToggleCommitAction ? 'blocked' : 'pending',
          toolName: 'desktop_click_element',
          arguments: desktopToggleCommitAction.text
            ? {
                text: desktopToggleCommitAction.text,
                role: desktopToggleCommitAction.role,
              }
            : desktopToggleCommitAction.ordinal !== null
              ? {
                  ordinal: desktopToggleCommitAction.ordinal,
                  role: desktopToggleCommitAction.role,
                }
              : undefined,
        })
      }

      steps.push({
        id: 'recheck-desktop-setting-scene',
        title: '重新列出当前桌面控件确认设置是否生效',
        rationale: '切换设置并完成确认后，再次列出前台控件，确认开关状态是否变化，或者界面是否已经进入新的后续场景。',
        status: desktopToggleCommitAction && highImpactToggleCommitAction
          ? 'blocked'
          : 'pending',
        toolName: 'desktop_list_interactables',
        arguments: {
          maxItems: 12,
        },
      })

      repairActions.push({
        kind: 'desktop-relist-setting-controls',
        title: '若设置项或确认按钮不稳定，先重新列出桌面控件',
        rationale: '如果设置页 checkbox、菜单项或确认按钮没有被稳定识别出来，先重新抓取桌面控件，再决定下一步最稳。',
        toolName: 'desktop_list_interactables',
        arguments: {
          maxItems: 12,
        },
      })

      return {
        advanceCondition: 'desktop-toggle-committed-or-follow-up-scene-identified',
        continuationMode: highImpactToggleCommitAction
          ? 'await-host-input'
          : 'ready-to-act',
        completionSignals: ['desktop-setting-toggled', 'follow-up-scene-identified'],
        blockingReasons: highImpactToggleCommitAction
          ? uniqueTextList([...blockingReasons, 'host-confirmation-required'])
          : blockingReasons,
        failureCondition: highImpactToggleCommitAction
          ? 'desktop-setting-toggle-awaiting-host-confirmation-before-commit'
          : 'desktop-toggle-not-applied-or-follow-up-scene-unclear',
        repairActions,
        reentryHint: highImpactToggleCommitAction
          ? '如果当前设置变更后的确认动作会触发高风险结果，先确认风险边界，再重新列出控件确认是否还有更低风险路径。'
          : '如果设置页还停在原地，先重新列出控件，再确认目标开关、确认按钮或后续场景有没有变化。',
        steps,
        targetPhase: genericTargetPhase,
      } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
    }

    if (primaryDesktopAction) {
      steps.push({
        id: 'advance-desktop-dialog',
        title: primaryDesktopAction.text
          ? `点击“${primaryDesktopAction.text}”推进当前桌面对话框`
          : '点击当前桌面对话框主动作',
        postActionExpectedPhase: genericTargetPhase,
        rationale: highImpactPrimaryAction
          ? '当前桌面对话框已经识别到高风险主动作，继续前需要先经过宿主确认边界。'
          : '当前桌面对话框已经具备稳定主动作。完成输入后推进主按钮，再重新观察前台界面，才能形成真实跨软件闭环。',
        status: highImpactPrimaryAction ? 'blocked' : (desktopDialogInputArguments ? 'pending' : 'ready'),
        toolName: 'desktop_click_element',
        arguments: primaryDesktopAction.text
          ? {
              text: primaryDesktopAction.text,
              role: primaryDesktopAction.role,
            }
          : primaryDesktopAction.ordinal !== null
            ? {
                ordinal: primaryDesktopAction.ordinal,
                role: primaryDesktopAction.role,
              }
            : undefined,
      })
    }

    steps.push({
      id: 'recheck-desktop-dialog-follow-up-scene',
      title: '重新列出当前桌面控件确认后续场景',
      rationale: '完成输入或点击主按钮后，再次列出前台控件，确认是还停在当前对话框、已经关闭，还是暴露了新的跨软件下一步。',
      status: primaryDesktopAction ? 'pending' : (hasStructuredDesktopStep ? 'ready' : 'blocked'),
      toolName: 'desktop_list_interactables',
      arguments: {
        maxItems: 12,
      },
    })

    repairActions.push({
      kind: 'desktop-relist-generic-dialog-controls',
      title: '若当前桌面对话框结构不稳定，先重新列出可交互控件',
      rationale: '如果当前窗口的输入框或主按钮没有被稳定识别出来，先重新抓取桌面控件，再决定下一步最稳。',
      toolName: 'desktop_list_interactables',
      arguments: {
        maxItems: 12,
      },
    })

    return {
      advanceCondition: 'desktop-dialog-advanced-or-follow-up-scene-identified',
      continuationMode: highImpactPrimaryAction
        ? 'await-host-input'
        : hasStructuredDesktopStep
          ? 'ready-to-act'
          : 'observe-and-recheck',
      completionSignals: ['desktop-dialog-primary-action-triggered', 'follow-up-scene-identified'],
      blockingReasons: highImpactPrimaryAction
        ? uniqueTextList([...blockingReasons, 'host-confirmation-required'])
        : blockingReasons,
      failureCondition: highImpactPrimaryAction
        ? 'desktop-dialog-awaiting-host-confirmation-before-primary-action'
        : 'desktop-dialog-still-visible-or-primary-action-not-committed',
      repairActions,
      reentryHint: highImpactPrimaryAction
        ? '如果当前桌面对话框主按钮会触发高风险动作，先确认风险边界，再重新列出控件观察是否还有更低风险路径。'
        : '如果还停在当前桌面对话框，先重新列出控件，再确认输入区域、主按钮或后续场景有没有变化。',
      steps,
      targetPhase: genericTargetPhase,
    } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
  }

  if (input.pagePhase === 'login') {
    const credentialInputArguments = question && primaryBrowserInputCandidate
      ? buildBrowserTypeActionArguments({
          browser: browserPageContext?.browser,
          candidate: primaryBrowserInputCandidate,
          question,
          submit: false,
        })
      : undefined
    const blocked = blockingReasons.includes('credential-required') && !credentialInputArguments
    steps.push({
      id: 'fill-credentials',
      title: '填写账号与密码',
      rationale: '当前页面仍处在登录阶段，先完成凭据输入才有意义继续后续动作。',
      status: credentialInputArguments ? 'ready' : (blocked ? 'blocked' : 'ready'),
      toolName: credentialInputArguments ? 'browser_type_text' : undefined,
      arguments: credentialInputArguments,
    })
    steps.push({
      id: 'submit-login',
      title: primaryBrowserCandidate
        ? `点击“${sanitizeText(primaryBrowserCandidate.text || primaryBrowserCandidate.ariaLabel || primaryBrowserCandidate.title, 160) || '登录'}”继续认证`
        : '点击登录按钮继续认证',
      postActionExpectedPhase: 'content-detail',
      rationale: '凭据准备好后，应触发登录提交，等待页面离开登录态。',
      status: credentialInputArguments ? 'pending' : (blocked ? 'pending' : 'ready'),
      toolName: 'browser_click_element',
      arguments: primaryBrowserCandidate
        ? buildBrowserClickActionArguments(primaryBrowserCandidate, browserPageContext?.browser)
        : {
            text: '登录',
            targetType: 'button',
            browser: browserPageContext?.browser,
          },
    })
    if (blocked) {
      repairActions.push({
        kind: 'browser-reread-login-page',
        title: '先重新读取登录页提示与表单元素',
        rationale: '如果当前仍卡在登录阶段，先重新读取正文和表单元素，确认缺的是凭据、验证码还是权限提示。',
        toolName: 'browser_read_page',
        arguments: {
          format: 'text',
          browser: browserPageContext?.browser,
        },
      })
    }

    return {
      advanceCondition: 'credentials-submitted-and-login-ui-hidden',
      continuationMode: blocked ? 'await-host-input' : 'ready-to-act',
      completionSignals: ['navigation-away-from-login', 'authenticated-home-visible'],
      blockingReasons,
      failureCondition: 'login-ui-still-visible-or-credential-rejected',
      repairActions,
      reentryHint: '如果重新回到登录页，先确认缺的是凭据、验证码还是权限确认，再继续提交登录。',
      steps,
      targetPhase: 'content-detail',
    } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
  }

  if (input.pagePhase === 'search-results') {
    const paginationCandidate = !primaryBrowserCandidate
      ? pickSearchResultPaginationCandidate(browserPageContext)
      : null
    const shouldScrollSearchResults = !primaryBrowserCandidate
      && !paginationCandidate
      && browserPageCanScrollDown(browserPageContext)
    if (paginationCandidate) {
      steps.push({
        id: 'open-next-search-results-page',
        title: paginationCandidate.text
          ? `继续打开“${sanitizeText(paginationCandidate.text || paginationCandidate.ariaLabel || paginationCandidate.title, 160)}”`
          : '继续打开下一页搜索结果',
        postActionExpectedPhase: 'search-results',
        rationale: '当前页还没有稳定暴露出目标结果，先翻到下一页或更多结果，再继续沿着搜索链路判断最相关入口。',
        status: 'ready',
        toolName: 'browser_click_element',
        arguments: buildBrowserClickActionArguments(paginationCandidate, browserPageContext?.browser),
      })
      steps.push({
        id: 'wait-next-search-results-page',
        title: '等待新的搜索结果页加载完成',
        postActionExpectedPhase: 'search-results',
        rationale: '翻页后要确认新一页结果已经加载完成，才能继续选择更相关的结果进入内容详情页。',
        status: 'pending',
        toolName: 'browser_wait',
        arguments: {
          state: 'complete',
          browser: browserPageContext?.browser,
        },
      })

      return {
        advanceCondition: 'search-results-page-advanced-and-new-results-visible',
        continuationMode: 'ready-to-act',
        completionSignals: ['search-results-page-advanced', 'new-search-results-visible'],
        blockingReasons,
        failureCondition: 'search-results-page-did-not-advance',
        repairActions,
        reentryHint: '如果翻页后仍然没有稳定结果，继续检查新的结果页、更多结果入口，或重新判断搜索词是否需要收窄。',
        steps,
        targetPhase: 'search-results',
      } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
    }

    if (shouldScrollSearchResults) {
      steps.push({
        id: 'scroll-search-results',
        title: '先继续向下滚动搜索结果',
        postActionExpectedPhase: 'search-results',
        rationale: '当前结果页还没有稳定暴露出目标结果，也没有传统翻页入口，但页面还能继续向下加载更多结果。先滚动继续扩展可见结果范围，更贴近真实网页搜索流程。',
        status: 'ready',
        toolName: 'browser_scroll',
        arguments: {
          action: 'down',
          amount: 1,
          browser: browserPageContext?.browser,
        },
      })
      steps.push({
        id: 'wait-scrolled-search-results',
        title: '等待新的搜索结果块稳定出现',
        postActionExpectedPhase: 'search-results',
        rationale: '滚动后要确认新的结果块已经进入可见区域，才能继续选择更相关的结果进入内容详情页。',
        status: 'pending',
        toolName: 'browser_wait',
        arguments: {
          state: 'complete',
          browser: browserPageContext?.browser,
        },
      })

      return {
        advanceCondition: 'search-results-scrolled-and-new-results-visible',
        continuationMode: 'ready-to-act',
        completionSignals: ['search-results-page-scrolled', 'new-search-results-visible'],
        blockingReasons,
        failureCondition: 'search-results-did-not-advance-after-scroll',
        repairActions,
        reentryHint: '如果滚动后仍然没有稳定结果，继续检查新进入视口的结果、更多结果入口，或重新判断搜索词是否需要收窄。',
        steps,
        targetPhase: 'search-results',
      } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
    }

    steps.push({
      id: 'open-top-result',
      title: primaryBrowserCandidate
        ? `打开“${sanitizeText(primaryBrowserCandidate.text || primaryBrowserCandidate.ariaLabel || primaryBrowserCandidate.title, 160) || '首个结果'}”`
        : '打开当前搜索结果中的首个高相关链接',
      postActionExpectedPhase: 'content-detail',
      rationale: '当前已经处在搜索结果页，先进入最相关结果，再观察是否进入内容详情页。',
      status: primaryBrowserCandidate ? 'ready' : 'blocked',
      toolName: 'browser_click_element',
      arguments: primaryBrowserCandidate
        ? buildBrowserClickActionArguments(primaryBrowserCandidate, browserPageContext?.browser)
        : undefined,
    })
    steps.push({
      id: 'wait-navigation',
      title: '等待搜索结果页跳转完成',
      postActionExpectedPhase: 'content-detail',
      rationale: '点击结果后要确认 URL 或页面内容已经离开搜索结果态，长链网页策略才算推进成功。',
      status: 'pending',
      toolName: 'browser_wait',
      arguments: {
        state: 'complete',
        browser: browserPageContext?.browser,
      },
    })
    if (!primaryBrowserCandidate) {
      repairActions.push({
        kind: 'browser-reread-search-results',
        title: '重新列出搜索结果链接',
        rationale: '如果当前结果链接没有稳定识别出来，先重新抓取当前页面链接结构最稳。',
        toolName: 'browser_read_page',
        arguments: {
          format: 'interactables',
          browser: browserPageContext?.browser,
        },
      })
    }

    return {
      advanceCondition: 'search-result-opened-and-detail-page-visible',
      continuationMode: primaryBrowserCandidate ? 'ready-to-act' : 'observe-and-recheck',
      completionSignals: ['content-detail-visible', 'url-changed-from-search-results'],
      blockingReasons,
      failureCondition: 'search-results-still-visible-after-click',
      repairActions,
      reentryHint: '如果还停在搜索结果页，先重新列出搜索结果链接，再确认哪一个最符合当前目标。',
      steps,
      targetPhase: 'content-detail',
    } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
  }

  if (input.pagePhase === 'social-feed') {
    steps.push({
      id: 'open-compose-entry',
      title: primaryBrowserCandidate
        ? `点击“${sanitizeText(primaryBrowserCandidate.text || primaryBrowserCandidate.ariaLabel || primaryBrowserCandidate.title, 160) || '创建内容'}”打开发布入口`
        : '点击当前创建内容入口',
      postActionExpectedPhase: 'form-entry',
      rationale: '当前处在社交信息流页面，先打开发布入口，才能进入输入和发送阶段。',
      status: primaryBrowserCandidate ? 'ready' : 'blocked',
      toolName: primaryBrowserCandidate ? 'browser_click_element' : undefined,
      arguments: primaryBrowserCandidate
        ? buildBrowserClickActionArguments(primaryBrowserCandidate, browserPageContext?.browser)
        : undefined,
    })
    steps.push({
      id: 'wait-compose-surface',
      title: '等待发布编辑器出现',
      postActionExpectedPhase: 'form-entry',
      rationale: '打开发布入口后，需要确认编辑器或发帖表单已经出现，网页策略才算真正推进。',
      status: primaryBrowserCandidate ? 'pending' : 'blocked',
      toolName: primaryBrowserCandidate ? 'browser_wait' : undefined,
      arguments: primaryBrowserCandidate
        ? {
            state: 'interactive',
            browser: browserPageContext?.browser,
          }
        : undefined,
    })
    if (!primaryBrowserCandidate) {
      repairActions.push({
        kind: 'browser-reread-social-feed',
        title: '重新列出信息流页的创建入口',
        rationale: '如果当前创建入口没有稳定识别出来，先重新抓取页面可交互元素，再确认新建帖子、主题或讨论入口最稳。',
        toolName: 'browser_read_page',
        arguments: {
          format: 'interactables',
          browser: browserPageContext?.browser,
        },
      })
    }

    return {
      advanceCondition: 'compose-editor-visible-or-post-form-opened',
      continuationMode: primaryBrowserCandidate ? 'ready-to-act' : 'observe-and-recheck',
      completionSignals: ['compose-entry-opened', 'post-form-visible'],
      blockingReasons,
      failureCondition: 'social-feed-still-visible-after-compose-attempt',
      repairActions,
      reentryHint: '如果还停留在社交信息流首页，先重新读取可交互元素，再确认“创建帖子”“新建主题”或其他创建内容入口。',
      steps,
      targetPhase: 'form-entry',
    } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
  }

  if (input.pagePhase === 'form-entry' || input.pagePhase === 'upload-flow') {
    const uploadBridgeRequested = input.pagePhase === 'form-entry'
      && Boolean(question)
      && questionSignalsUploadBridge(question)
      && Boolean(uploadBridgeCandidate)
    const awaitingInput = blockingReasons.includes('awaiting-input') || blockingReasons.includes('awaiting-selection')
    const formInputArguments = question && primaryBrowserInputCandidate
      ? buildBrowserTypeActionArguments({
          browser: browserPageContext?.browser,
          candidate: primaryBrowserInputCandidate,
          question,
          submit: false,
        })
      : undefined
    if (input.pagePhase === 'upload-flow' && awaitingInput && !formInputArguments) {
      repairActions.push({
        kind: 'browser-reread-upload-flow',
        title: '先读取当前上传页正文确认文件状态',
        rationale: '当前已经回到浏览器上传页，但还不能确认文件是否已经选中或页面还缺少哪一步；先低风险读取正文再决定是否继续点击更稳。',
        toolName: 'browser_read_page',
        arguments: {
          format: 'text',
          browser: browserPageContext?.browser,
        },
      })
    }
    if (uploadBridgeRequested && uploadBridgeCandidate) {
      steps.push({
        id: 'open-upload-entry',
        title: sanitizeText(uploadBridgeCandidate.text || uploadBridgeCandidate.ariaLabel || uploadBridgeCandidate.title, 160)
          ? `点击“${sanitizeText(uploadBridgeCandidate.text || uploadBridgeCandidate.ariaLabel || uploadBridgeCandidate.title, 160)}”打开当前上传入口`
          : '点击当前上传入口继续桥接文件选择',
        postActionExpectedPhase: 'browser-desktop-handoff',
        rationale: '当前发帖编辑器已经有稳定上传入口。先触发原生文件选择桥接，再回到浏览器继续当前发布流，更接近真实跨软件操作。',
        status: 'ready',
        toolName: 'browser_click_element',
        arguments: buildBrowserClickActionArguments(uploadBridgeCandidate, browserPageContext?.browser),
      })
      steps.push({
        id: 'fill-current-form',
        title: '完成当前表单输入',
        rationale: '等图片桥接完成并回到浏览器后，再继续补充正文或其他字段更稳。',
        status: formInputArguments ? 'pending' : 'blocked',
        toolName: formInputArguments ? 'browser_type_text' : undefined,
        arguments: formInputArguments,
      })

      return {
        advanceCondition: 'upload-entry-opened-and-native-dialog-or-browser-upload-flow-visible',
        continuationMode: 'ready-to-act',
        completionSignals: ['upload-entry-opened', 'native-dialog-visible', 'upload-flow-visible'],
        blockingReasons: blockingReasons.filter(reason => reason !== 'awaiting-input'),
        failureCondition: 'compose-editor-still-visible-after-upload-entry-attempt',
        repairActions,
        reentryHint: '如果还停在发帖编辑器，先重新读取可交互元素，再确认“上传图片”之类的桥接入口有没有真正触发系统文件选择器。',
        steps,
        targetPhase: 'upload-flow',
      } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
    }
    steps.push({
      id: 'fill-current-form',
      title: input.pagePhase === 'upload-flow' ? '完成当前上传或表单输入' : '完成当前表单输入',
      rationale: '当前流程仍停留在输入阶段，先完成必要字段或选择项，后续动作才有意义。',
      status: formInputArguments ? 'ready' : (awaitingInput ? 'blocked' : 'ready'),
      toolName: formInputArguments ? 'browser_type_text' : undefined,
      arguments: formInputArguments,
    })
    steps.push({
      id: 'advance-form-flow',
      title: '提交当前表单并观察下一页',
      postActionExpectedPhase: 'content-detail',
      rationale: '输入完成后，需要推进表单流并确认页面是否跳到下一阶段。',
      status: formInputArguments ? 'pending' : (awaitingInput ? 'pending' : 'ready'),
      toolName: 'browser_click_element',
      arguments: primaryBrowserCandidate
        ? buildBrowserClickActionArguments(primaryBrowserCandidate, browserPageContext?.browser)
        : undefined,
    })

    return {
      advanceCondition: input.pagePhase === 'upload-flow'
        ? 'upload-selection-committed-and-next-browser-step-visible'
        : 'form-submitted-and-next-page-visible',
      continuationMode: awaitingInput ? 'await-host-input' : 'ready-to-act',
      completionSignals: ['form-step-advanced', 'next-page-visible'],
      blockingReasons,
      failureCondition: input.pagePhase === 'upload-flow'
        ? 'upload-flow-still-awaiting-selection-after-submit'
        : 'form-still-awaiting-input-after-submit',
      repairActions,
      reentryHint: input.pagePhase === 'upload-flow'
        ? '如果重新卡在上传步骤，先确认文件是否选中成功，再判断是否又切回原生文件选择器。'
        : '如果表单还没推进，先确认缺失字段、错误提示或必选项，再继续提交。',
      steps,
      targetPhase: 'content-detail',
    } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
  }

  if (input.pagePhase === 'content-detail') {
    const shouldContinueContent = questionSignalsContentContinuation(question)
    const shouldScrollContentDetail = shouldContinueContent
      && !contentDetailContinuationCandidate
      && browserPageCanScrollDown(browserPageContext)

    if (contentDetailContinuationCandidate && shouldContinueContent) {
      steps.push({
        id: 'advance-content-detail',
        title: sanitizeText(contentDetailContinuationCandidate.text || contentDetailContinuationCandidate.ariaLabel || contentDetailContinuationCandidate.title, 160)
          ? `点击“${sanitizeText(contentDetailContinuationCandidate.text || contentDetailContinuationCandidate.ariaLabel || contentDetailContinuationCandidate.title, 160)}”继续当前内容流`
          : '点击当前低风险延续动作继续内容流',
        postActionExpectedPhase: 'content-detail',
        rationale: '当前内容页已经识别到明确的低风险延续动作。先顺着当前网页流程往前推进，再读新页面内容，更接近长链网页任务的真实目标。',
        status: 'ready',
        toolName: 'browser_click_element',
        arguments: buildBrowserClickActionArguments(contentDetailContinuationCandidate, browserPageContext?.browser),
      })
    }

    if (shouldScrollContentDetail) {
      steps.push({
        id: 'scroll-content-detail',
        title: '先继续向下滚动当前内容页',
        postActionExpectedPhase: 'content-detail',
        rationale: '当前内容页还没暴露新的低风险延续动作，但页面还能继续向下移动。先滚动去发现新的段落、翻页入口或延续按钮，更贴近长链网页任务的真实推进方式。',
        status: 'ready',
        toolName: 'browser_scroll',
        arguments: {
          action: 'down',
          amount: 1,
          browser: browserPageContext?.browser,
        },
      })
    }

    steps.push({
      id: 'continue-page-reading',
      title: '继续读取当前内容页并决定下一跳',
      rationale: '当前已经进入内容详情页，先读取正文与可交互元素，再决定是否继续点击或返回。',
      status: (contentDetailContinuationCandidate && shouldContinueContent) || shouldScrollContentDetail ? 'pending' : 'ready',
      toolName: 'browser_read_page',
      arguments: {
        format: 'text',
        browser: browserPageContext?.browser,
      },
    })

    return {
      advanceCondition: 'content-read-complete-or-next-primary-action-identified',
      continuationMode: 'ready-to-act',
      completionSignals: ['new-primary-action-identified', 'content-goal-met'],
      blockingReasons,
      failureCondition: 'content-goal-still-unclear-after-reread',
      repairActions,
      reentryHint: '如果目标还没完成，继续读取正文和可交互元素，再决定是继续点击、翻页还是回退。',
      steps,
      targetPhase: 'content-detail',
    } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
  }

  steps.push({
    id: 'reinspect-scene',
    title: '重新检查当前界面状态',
    rationale: '当前还没有足够强的网页阶段信号，先重新读取页面与桌面结构，再决定下一步最稳。',
    status: 'ready',
    toolName: input.executionStrategy.recommendedToolNames[0] ?? undefined,
  })

  return {
    advanceCondition: 'stronger-scene-signal-visible-after-reinspect',
    continuationMode: 'observe-and-recheck',
    completionSignals: ['stronger-scene-signal-visible'],
    blockingReasons,
    failureCondition: 'scene-signal-still-weak-after-reinspect',
    repairActions,
    reentryHint: '如果下一轮还是弱信号场景，先重新检查当前页面和桌面结构，再决定是否切换工具链。',
    steps,
    targetPhase: input.pagePhase,
  } satisfies AlicizationLocalDesktopInspectionWorkflowPlan
}

function scorePrimaryActionCandidate(candidate: AlicizationLocalDesktopInspectionGuiCandidate) {
  let score = 0
  const text = sanitizeText(candidate.text, 160)
  if (candidate.enabled)
    score += 40
  if (candidate.role === 'button')
    score += 35
  else if (candidate.role === 'link')
    score += 18
  else if (candidate.role === 'checkbox')
    score += 12
  else if (candidate.role === 'radio')
    score += 16
  else if (candidate.role === 'select')
    score += 20
  else if (candidate.role === 'tab')
    score += 22
  else if (candidate.role === 'list-item')
    score += 18
  else if (candidate.role === 'menu-item')
    score += 10

  if (/继续|下一步|确认|确定|保存|发布|登录|提交|允许|同意|安装|运行|打开|apply|allow|save|submit|publish|login|next|continue|ok|confirm|open|run/iu.test(text))
    score += 80
  if (/取消|关闭|返回|back|cancel|close|dismiss|ignore|skip|later/iu.test(text))
    score -= 45
  if (text)
    score += Math.min(20, text.length)

  return score
}

export function buildAlicizationDesktopInspectionGuiStructure(
  interactables: AlicizationLocalDesktopInspectionInteractable[],
): AlicizationLocalDesktopInspectionGuiStructure | null {
  const normalized = interactables
    .map(normalizeInteractable)
    .filter(candidate => candidate.ordinal !== null || candidate.text || candidate.role !== 'element')

  if (normalized.length <= 0)
    return null

  const roleCounts = normalized.reduce<Record<string, number>>((counts, candidate) => {
    counts[candidate.role] = (counts[candidate.role] ?? 0) + 1
    return counts
  }, {})

  const primaryActionCandidates = normalized
    .filter(candidate => candidate.role !== 'input')
    .sort((left, right) => {
      const scoreDelta = scorePrimaryActionCandidate(right) - scorePrimaryActionCandidate(left)
      if (scoreDelta !== 0)
        return scoreDelta
      return (left.ordinal ?? Number.POSITIVE_INFINITY) - (right.ordinal ?? Number.POSITIVE_INFINITY)
    })
    .slice(0, 3)
    .map(({ enabled, ordinal, role, text }) => ({
      enabled,
      ordinal,
      role,
      text,
    }))

  const primaryInputCandidates = normalized
    .filter(candidate => candidate.role === 'input')
    .slice(0, 3)
    .map(({ enabled, ordinal, role, text }) => ({
      enabled,
      ordinal,
      role,
      text,
    }))

  return {
    enabledInteractableCount: normalized.filter(candidate => candidate.enabled).length,
    interactableCount: normalized.length,
    primaryActionCandidates,
    primaryInputCandidates,
    roleCounts,
  }
}

export function summarizeAlicizationDesktopInspection(input: {
  browserPageContext?: AlicizationLocalDesktopInspectionBrowserPageContext | null
  focusTarget?: AlicizationScreenSemanticFocusTarget | null
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  summary?: AlicizationScreenSemanticSummary | null
  unavailableReason?: string | null
  workflowPlan?: AlicizationLocalDesktopInspectionWorkflowPlan | null
  workflowState?: AlicizationPerceptionBrowserWorkflowState | null
}) {
  const workflowState = input.workflowState ?? null
  const workflowPlan = input.workflowPlan ?? null
  const focusLabel = describeTarget(input.focusTarget) || describeTarget(input.foregroundWindow)
  const browserPageContext = normalizeBrowserPageContext(input.browserPageContext)
  const roleSummary = input.guiStructure
    ? Object.entries(input.guiStructure.roleCounts)
        .sort((left, right) => right[1] - left[1])
        .map(([role, count]) => `${role}:${count}`)
        .join(', ')
    : ''
  const browserContextSummary = browserPageContext
    ? [
        browserPageContext.title ? `page=${browserPageContext.title}` : '',
        browserPageContext.url ? `url=${browserPageContext.url}` : '',
        browserPageContext.interactables.length > 0 ? `${browserPageContext.interactables.length} browser interactables` : '',
      ].filter(Boolean).join(', ')
    : ''
  const workflowSummary = buildWorkflowStateSummary({
    workflowPlan,
    workflowState,
  })
  const appendWorkflowSummary = (baseSummary: string) => workflowSummary
    ? `${baseSummary} ${workflowSummary}`
    : baseSummary
  if (input.summary) {
    const summaryLabel = sanitizeText(input.summary.content.summary, 96)
    const mode = `${input.summary.workload.kind}/${input.summary.content.kind}`
    if (summaryLabel && focusLabel)
      return appendWorkflowSummary(`Inspected current desktop scene: ${mode} around ${focusLabel} (${summaryLabel}).`)
    if (focusLabel)
      return appendWorkflowSummary(`Inspected current desktop scene: ${mode} around ${focusLabel}.`)
    if (summaryLabel)
      return appendWorkflowSummary(`Inspected current desktop scene: ${mode} (${summaryLabel}).`)
    return appendWorkflowSummary(`Inspected current desktop scene: ${mode}.`)
  }

  if (focusLabel && input.unavailableReason) {
    if (browserContextSummary) {
      return appendWorkflowSummary(`Inspected current desktop scene around ${focusLabel}, but no stable semantic summary was available (${input.unavailableReason}). Browser context: ${browserContextSummary}.`)
    }
    return appendWorkflowSummary(input.guiStructure
      ? `Inspected current desktop scene around ${focusLabel}, but no stable semantic summary was available (${input.unavailableReason}). Structured controls: ${input.guiStructure.interactableCount} interactable controls [${roleSummary}].`
      : `Inspected current desktop scene around ${focusLabel}, but no stable semantic summary was available (${input.unavailableReason}).`)
  }
  if (focusLabel) {
    if (browserContextSummary)
      return appendWorkflowSummary(`Inspected current desktop scene around ${focusLabel}, but no stable semantic summary was available. Browser context: ${browserContextSummary}.`)
    return appendWorkflowSummary(input.guiStructure
      ? `Inspected current desktop scene around ${focusLabel}, but no stable semantic summary was available. Structured controls: ${input.guiStructure.interactableCount} interactable controls [${roleSummary}].`
      : `Inspected current desktop scene around ${focusLabel}, but no stable semantic summary was available.`)
  }
  if (input.unavailableReason) {
    if (browserContextSummary)
      return appendWorkflowSummary(`Inspected current desktop scene, but no stable semantic summary was available (${input.unavailableReason}). Browser context: ${browserContextSummary}.`)
  }
  if (input.unavailableReason) {
    return appendWorkflowSummary(input.guiStructure
      ? `Inspected current desktop scene, but no stable semantic summary was available (${input.unavailableReason}). Structured controls: ${input.guiStructure.interactableCount} interactable controls [${roleSummary}].`
      : `Inspected current desktop scene, but no stable semantic summary was available (${input.unavailableReason}).`)
  }
  if (browserContextSummary)
    return appendWorkflowSummary(`Inspected current desktop scene, but no stable semantic summary was available. Browser context: ${browserContextSummary}.`)
  return appendWorkflowSummary(input.guiStructure
    ? `Inspected current desktop scene, but no stable semantic summary was available. Structured controls: ${input.guiStructure.interactableCount} interactable controls [${roleSummary}].`
    : 'Inspected current desktop scene, but no stable semantic summary was available.')
}

function buildWorkflowStateSummary(input: {
  workflowPlan?: AlicizationLocalDesktopInspectionWorkflowPlan | null
  workflowState?: AlicizationPerceptionBrowserWorkflowState | null
}) {
  const workflowState = input.workflowState ?? null
  if (!workflowState)
    return ''

  if (
    workflowState.progressState === 'advanced'
    && workflowState.previousPhase
    && workflowState.previousPhase !== workflowState.currentPhase
  ) {
    return `Workflow advanced from ${workflowState.previousPhase} to ${workflowState.currentPhase}.`
  }

  if (
    workflowState.progressState === 'regressed'
    && workflowState.previousPhase
    && workflowState.previousPhase !== workflowState.currentPhase
  ) {
    return `Workflow regressed from ${workflowState.previousPhase} to ${workflowState.currentPhase}.`
  }

  if (workflowState.progressState === 'started') {
    if (workflowState.targetPhase !== workflowState.currentPhase)
      return `Workflow started on ${workflowState.currentPhase} aiming for ${workflowState.targetPhase}.`
    return `Workflow started on ${workflowState.currentPhase}.`
  }

  if (input.workflowPlan?.continuationMode === 'await-host-input')
    return `Workflow still holding on ${workflowState.currentPhase} awaiting host input.`

  if (workflowState.targetPhase !== workflowState.currentPhase)
    return `Workflow still holding on ${workflowState.currentPhase} aiming for ${workflowState.targetPhase}.`

  return `Workflow still holding on ${workflowState.currentPhase}.`
}

export function buildAlicizationDesktopInspectionExecutionStrategy(input: {
  browserChromeFocusShift?: boolean | null
  blockingSignals?: string[] | null
  browserPageContext?: AlicizationLocalDesktopInspectionBrowserPageContext | null
  focusTarget?: AlicizationScreenSemanticFocusTarget | null
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  pagePhase?: AlicizationLocalDesktopInspectionPagePhase | null
  summary?: AlicizationScreenSemanticSummary | null
}) {
  const summary = input.summary ?? null
  const guiStructure = input.guiStructure ?? null
  const browserLike = isBrowserLike(input)
  const workloadKind = summary?.workload.kind ?? 'unknown'
  const contentKind = summary?.content.kind ?? 'unknown'
  const focusLabel = describeTarget(input.focusTarget) || describeTarget(input.foregroundWindow) || '当前前台界面'
  const hasDesktopFormLikeControls = Boolean(
    guiStructure?.primaryActionCandidates.length
    || guiStructure?.primaryInputCandidates.length,
  )
  const desktopDialogVisible = looksLikeDesktopDialogHandoff({
    browserPageContext: input.browserPageContext,
    focusTarget: input.focusTarget,
    foregroundWindow: input.foregroundWindow,
    guiStructure,
    summary,
  }) || (input.blockingSignals ?? []).includes('desktop-dialog-visible')
  const codingLike = workloadKind === 'coding'
    || contentKind === 'error'
    || contentKind === 'diff'
  const terminalLike = workloadKind === 'terminal'

  if (input.browserChromeFocusShift) {
    return {
      confidence: clampConfidence(Math.max(summary?.workload.confidence ?? 0, 0.86)),
      mode: 'desktop-dialog',
      rationale: `当前仍是浏览器场景，但围绕 ${focusLabel} 的焦点已经切到地址栏或浏览器 chrome 控件。先用桌面原语重新列出控件、确认输入位和浏览器按钮，再决定是否回到正文或继续输入更稳。`,
      recommendedChannel: 'desktop',
      recommendedToolNames: ['desktop_list_interactables', 'desktop_type_text', 'desktop_click_element'],
    } satisfies AlicizationLocalDesktopInspectionExecutionStrategy
  }

  if (browserLike && desktopDialogVisible) {
    return {
      confidence: clampConfidence(Math.max(summary?.workload.confidence ?? 0, 0.88)),
      mode: 'browser-desktop-handoff',
      rationale: `当前仍处在浏览器相关流程里，但围绕 ${focusLabel} 已经切到系统级对话框或文件选择界面；下一步应先走桌面原语完成桥接，再返回网页流程。`,
      recommendedChannel: 'desktop',
      recommendedToolNames: ['desktop_wait', 'desktop_click_element', 'desktop_type_text', 'desktop_list_interactables'],
    } satisfies AlicizationLocalDesktopInspectionExecutionStrategy
  }

  if (browserLike) {
    const pagePhase = input.pagePhase ?? 'unknown'
    const phaseHint = pagePhase !== 'unknown'
      ? ` 当前网页阶段更像 ${pagePhase}。`
      : ''
    return {
      confidence: clampConfidence(Math.max(summary?.workload.confidence ?? 0, 0.82)),
      mode: 'browser-dom',
      rationale: `当前场景更像浏览器页面，围绕 ${focusLabel} 先走浏览器 DOM 级原语更稳，适合继续做网页阅读、点击、输入和长链导航。${phaseHint}`,
      recommendedChannel: 'browser',
      recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
    } satisfies AlicizationLocalDesktopInspectionExecutionStrategy
  }

  if (terminalLike) {
    return {
      confidence: clampConfidence(Math.max(summary?.workload.confidence ?? 0, summary?.content.confidence ?? 0, 0.8)),
      mode: 'terminal-investigation',
      rationale: `当前场景更像终端或日志界面，围绕 ${focusLabel} 先走 CLI / Codex 调查链更稳，适合读取日志、复现命令和继续修复。`,
      recommendedChannel: 'cli',
      recommendedToolNames: ['executor_run_cli', 'executor_run_codex', 'executor_run_claude_code'],
    } satisfies AlicizationLocalDesktopInspectionExecutionStrategy
  }

  if (codingLike) {
    return {
      confidence: clampConfidence(Math.max(summary?.workload.confidence ?? 0, summary?.content.confidence ?? 0, 0.84)),
      mode: 'coding-investigation',
      rationale: `当前场景更像编码、差异或报错调查，围绕 ${focusLabel} 先走 Codex / CLI 开发链更稳，适合看代码、定位报错、修改并验证。`,
      recommendedChannel: 'codex',
      recommendedToolNames: ['executor_run_codex', 'executor_run_claude_code', 'executor_run_cli'],
    } satisfies AlicizationLocalDesktopInspectionExecutionStrategy
  }

  if (hasDesktopFormLikeControls) {
    return {
      confidence: clampConfidence(Math.max(summary?.workload.confidence ?? 0, 0.76)),
      mode: 'desktop-dialog',
      rationale: `当前前台界面围绕 ${focusLabel} 已经看见稳定桌面控件，先走桌面对话框/表单原语更稳，适合跨软件点击、输入和等待界面完成切换。`,
      recommendedChannel: 'desktop',
      recommendedToolNames: ['desktop_click_element', 'desktop_type_text', 'desktop_wait'],
    } satisfies AlicizationLocalDesktopInspectionExecutionStrategy
  }

  return {
    confidence: clampConfidence(Math.max(summary?.workload.confidence ?? 0, 0.58)),
    mode: 'scene-stabilization',
    rationale: `当前已经看到 ${focusLabel}，但还缺少足够强的 GUI 结构或语义信号；先稳定前台界面并继续列出控件，再决定走浏览器、桌面还是开发执行链。`,
    recommendedChannel: 'desktop',
    recommendedToolNames: ['desktop_wait', 'desktop_list_interactables', 'desktop_inspect_scene'],
  } satisfies AlicizationLocalDesktopInspectionExecutionStrategy
}

export function buildAlicizationDesktopInspectionSuggestedActions(input: {
  blockingSignals?: string[] | null
  browserPageContext?: AlicizationLocalDesktopInspectionBrowserPageContext | null
  executionStrategy?: AlicizationLocalDesktopInspectionExecutionStrategy | null
  focusTarget?: AlicizationScreenSemanticFocusTarget | null
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  guiStructure?: AlicizationLocalDesktopInspectionGuiStructure | null
  maxSuggestedActions?: number
  nextActionIntent?: AlicizationLocalDesktopInspectionNextActionIntent | null
  pagePhase?: AlicizationLocalDesktopInspectionPagePhase | null
  question?: string | null
  summary?: AlicizationScreenSemanticSummary | null
  unavailableReason?: string | null
  workflowPlan?: AlicizationLocalDesktopInspectionWorkflowPlan | null
  workflowState?: AlicizationPerceptionBrowserWorkflowState | null
}) {
  const maxSuggestedActions = clampSuggestedActionCount(input.maxSuggestedActions)
  const question = sanitizeText(input.question, 220)
  const summary = input.summary ?? null
  const actions: AlicizationLocalDesktopInspectionSuggestedAction[] = []
  const nextStepQuestion = /下一步|该点什么|点哪里|next step|what should .*click|what to click/iu.test(question)
  const contentContinuationQuestion = questionSignalsContentContinuation(question)
  const executionStrategy = input.executionStrategy ?? buildAlicizationDesktopInspectionExecutionStrategy(input)
  const browserDomLike = executionStrategy.mode === 'browser-dom'
  const desktopLike = executionStrategy.recommendedChannel === 'desktop'
  const browserPageContext = normalizeBrowserPageContext(input.browserPageContext)
  const guiStructure = input.guiStructure ?? null
  const workflowPlan = input.workflowPlan ?? null
  const workflowState = input.workflowState ?? null
  const primaryBrowserInputCandidate = question
    ? pickPrimaryBrowserInputCandidate({
        browserPageContext,
        pagePhase: input.pagePhase ?? 'unknown',
        question,
      })
    : null
  const primaryDesktopInputCandidate = question
    ? pickPrimaryDesktopInputCandidate({
        guiStructure,
        question,
      })
    : null
  const errorLike = summary?.content.kind === 'error'
    || summary?.workload.kind === 'coding'
    || summary?.workload.kind === 'terminal'
  const strategyPrompt = buildExecutionStrategyPrompt({
    focusTarget: input.focusTarget ?? input.foregroundWindow,
    summary,
  })
  const socialComposeCandidate = input.pagePhase === 'social-feed'
    ? pickSocialComposeCandidate(browserPageContext)
    : null
  const primaryBrowserCandidate = input.pagePhase === 'search-results'
    ? pickSearchResultCandidate(browserPageContext)
    : input.pagePhase === 'social-feed'
      ? socialComposeCandidate
      : pickPrimaryBrowserCandidate(browserPageContext)
  const contentDetailContinuationCandidate = input.pagePhase === 'content-detail' && question
    ? pickContentDetailContinuationCandidate(browserPageContext)
    : null
  const requestedKnownWebsite = question
    ? resolveAlicizationKnownWebsiteInText(question)
    : null
  const requestedUrl = question
    ? extractRequestedBrowserUrl(question)
    : null
  const requestedBrowser = question
    ? detectRequestedBrowser(question)
    : undefined
  const requestedBrowserNavigateAction = question && questionSignalsBrowserNavigateRequest(question)
    ? detectRequestedBrowserNavigateAction(question)
    : null
  const rawRequestedDesktopApplicationName = question
    && !requestedKnownWebsite
    && !requestedUrl
    && !requestedBrowserNavigateAction
    ? extractRequestedDesktopApplicationName(question)
    : null
  const requestedInputTargetHint = question
    ? extractRequestedInputTargetHint(question)
    : null
  const localSearchInputCandidate = Boolean(
    (browserDomLike && primaryBrowserInputCandidate && isBrowserSearchInputCandidate(primaryBrowserInputCandidate))
    || (desktopLike && primaryDesktopInputCandidate && isDesktopSearchInputCandidate(primaryDesktopInputCandidate)),
  )
  const requestedSearchQuery = question && questionSignalsBrowserSearchRequest(question)
    ? extractRequestedSearchQuery(question)
    : null
  const requestedSearchEngine = requestedSearchQuery
    ? detectRequestedSearchEngine(question)
    : undefined
  const requestedBrowserActionVerb = questionSignalsOpenRequest(question)
  const shouldPreferLocalSearchInput = Boolean(
    requestedSearchQuery
    && localSearchInputCandidate
    && !questionMentionsExplicitSearchEngine(question)
    && (
      looksLikeSearchInputLabel(requestedInputTargetHint)
      || !rawRequestedDesktopApplicationName
    ),
  )
  const shouldPreferBrowserOpenForFollowedSiteSearch = Boolean(
    requestedSearchQuery
    && !shouldPreferLocalSearchInput
    && !questionMentionsExplicitSearchEngine(question)
    && requestedBrowserActionVerb
    && (requestedUrl || requestedKnownWebsite || requestedBrowser),
  )
  const requestedDesktopApplicationNameCandidate = rawRequestedDesktopApplicationName
  const questionLooksLikeDesktopSettingFlow = Boolean(
    question
    && (
      questionSignalsDesktopSelectionRequest(question)
      || questionSignalsDesktopNavigationRequest(question)
      || questionSignalsDesktopTabRequest(question)
      || (
        questionSignalsDesktopToggleRequest(question)
        && /开关|权限|选项|设置|模式|功能|toggle|switch|checkbox|permission|setting|mode|feature/iu.test(question)
      )
    ),
  )
  const requestedDesktopApplicationName = requestedDesktopApplicationNameCandidate
    && (!questionLooksLikeDesktopSettingFlow || looksLikeDesktopApplicationLaunchTarget(requestedDesktopApplicationNameCandidate))
    ? requestedDesktopApplicationNameCandidate
    : null
  const requestedDesktopShortcut = question
    ? extractRequestedDesktopShortcut(question)
    : null
  const currentDesktopAppName = sanitizeText(input.focusTarget?.appName, 160)
    || sanitizeText(input.foregroundWindow?.appName, 160)
    || null
  const requestedDesktopApplicationAlreadyFocused = desktopApplicationNamesMatch(
    requestedDesktopApplicationName,
    currentDesktopAppName,
  )
  const browserNavigateWorkflowHistory = requestedBrowserNavigateAction
    && workflowState
    && workflowState.history.length >= 2
    ? workflowState.history
    : null
  const browserNavigateWorkflowAlreadyConsumed = Boolean(
    requestedBrowserNavigateAction
    && browserNavigateWorkflowHistory,
  ) && (() => {
    const firstEntry = browserNavigateWorkflowHistory?.[0] ?? null
    const lastEntry = browserNavigateWorkflowHistory?.at(-1) ?? null
    if (!firstEntry || !lastEntry)
      return false
    return firstEntry.title !== lastEntry.title
      || firstEntry.url !== lastEntry.url
      || firstEntry.pagePhase !== lastEntry.pagePhase
  })()
  const shortcutWorkflowHistory = requestedDesktopShortcut
    && workflowState
    && workflowState.history.length >= 2
    ? workflowState.history
    : null
  const shortcutWorkflowAlreadyConsumed = Boolean(
    requestedDesktopShortcut
    && shortcutWorkflowHistory,
  ) && (() => {
    const firstEntry = shortcutWorkflowHistory?.[0] ?? null
    const lastEntry = shortcutWorkflowHistory?.at(-1) ?? null
    if (!firstEntry || !lastEntry)
      return false
    return firstEntry.title !== lastEntry.title
      || firstEntry.url !== lastEntry.url
      || firstEntry.pagePhase !== lastEntry.pagePhase
  })()
  const shortcutWorkflowAlreadyAdvanced = shortcutWorkflowAlreadyConsumed
    || Boolean(
      requestedDesktopShortcut
      && workflowState
      && workflowState.progressState === 'advanced'
      && workflowState.history.length >= 2,
    )
  const shouldSuggestDesktopShortcutEntry = requestedDesktopShortcut
    && !shortcutWorkflowAlreadyAdvanced
    && !shortcutWorkflowAlreadyConsumed
  const shouldPrioritizeDesktopControlRelistAfterShortcut = Boolean(
    requestedDesktopShortcut
    && shortcutWorkflowAlreadyConsumed
    && browserDomLike
    && guiStructure?.primaryInputCandidates.length,
  )
  const knownWebsiteExpectedPhase = requestedKnownWebsite?.site === 'weibo'
    ? 'social-feed' as const
    : null
  const actionKeys = new Set<string>()

  const pushAction = (action: AlicizationLocalDesktopInspectionSuggestedAction) => {
    const toolName = sanitizeText(action.toolName, 80)
    const argumentsKey = action.arguments ? JSON.stringify(action.arguments) : ''
    const titleKey = sanitizeText(action.title, 120)
    const key = `${toolName}|${titleKey}|${argumentsKey}`
    if (actionKeys.has(key))
      return
    actionKeys.add(key)
    actions.push(action)
  }

  const pushWorkflowAction = (action: AlicizationLocalDesktopInspectionSuggestedAction) => {
    pushAction(action)
  }

  const buildWorkflowStepArguments = (step: AlicizationLocalDesktopInspectionWorkflowStep) => {
    const nextArguments = step.arguments
      ? { ...step.arguments }
      : {} as Record<string, unknown>

    if (
      step.postActionExpectedPhase
      && (
        step.toolName === 'browser_click_element'
        || step.toolName === 'browser_scroll'
        || step.toolName === 'browser_wait'
        || step.toolName === 'desktop_click_element'
      )
    ) {
      const maxAutoContinueSteps = input.pagePhase === 'content-detail'
        && contentContinuationQuestion
        && (
          (step.id === 'advance-content-detail' && step.toolName === 'browser_click_element')
          || (step.id === 'scroll-content-detail' && step.toolName === 'browser_scroll')
        )
        ? 2
        : 1
      nextArguments.expectedPhase = step.postActionExpectedPhase
      nextArguments.reinspectAfterAction = true
      nextArguments.autoContinueSuggestedActions = true
      nextArguments.maxAutoContinueSteps = maxAutoContinueSteps
      nextArguments.inspectionQuestion = input.question ?? null
      nextArguments.inspectionMaxSuggestedActions = 3
    }

    return Object.keys(nextArguments).length > 0
      ? nextArguments
      : undefined
  }

  const pushWorkflowStep = (step: AlicizationLocalDesktopInspectionWorkflowStep) => {
    pushAction({
      kind: `workflow-step:${step.id}`,
      title: step.title,
      rationale: step.rationale,
      toolName: step.toolName,
      arguments: buildWorkflowStepArguments(step),
    })
  }

  if (requestedSearchQuery) {
    if (!shouldPreferLocalSearchInput && !shouldPreferBrowserOpenForFollowedSiteSearch && !rawRequestedDesktopApplicationName) {
      pushAction({
        kind: 'browser-search-web-entry',
        title: `先搜索“${requestedSearchQuery}”`,
        rationale: '问题已经明确要求先发起网页搜索。先直接进入搜索结果页，再顺着浏览器场景继续跟进结果，比停留在当前界面观察更接近真实长链网页执行。',
        toolName: 'browser_search_web',
        arguments: {
          query: requestedSearchQuery,
          browser: browserPageContext?.browser ?? requestedBrowser ?? 'default',
          searchEngine: requestedSearchEngine,
          ...buildLocalVisualEntryFollowUpArguments({
            expectedPhase: 'search-results',
            inspectionQuestion: question,
          }),
        },
      })
    }
  }

  if ((shouldPreferBrowserOpenForFollowedSiteSearch || !requestedSearchQuery) && requestedBrowserActionVerb && (requestedUrl || requestedKnownWebsite || requestedBrowser)) {
    pushAction({
      kind: requestedUrl
        ? 'browser-open-url-entry'
        : requestedKnownWebsite
          ? 'browser-open-known-site-entry'
          : 'browser-open-application-entry',
      title: requestedUrl
        ? `先打开 ${requestedUrl}`
        : requestedKnownWebsite
          ? `先打开${requestedKnownWebsite.label}`
          : '先打开浏览器',
      rationale: requestedUrl
        ? '问题里已经给出了明确网址。先直接打开目标网页，再根据落地后的实际页面结构继续跟进最稳。'
        : requestedKnownWebsite
          ? '问题里已经明确给出了要访问的网站。先直接打开目标站点，再根据实际落地页面决定下一步动作，更接近真实浏览器执行闭环。'
          : '问题里已经明确要求先打开浏览器。先把浏览器带到前台，再根据实际网页或空白页状态决定下一步更稳。',
      toolName: 'browser_open_url',
      arguments: {
        browser: requestedBrowser ?? browserPageContext?.browser ?? 'default',
        url: requestedUrl ?? undefined,
        site: requestedUrl ? undefined : requestedKnownWebsite?.site,
        ...buildLocalVisualEntryFollowUpArguments({
          expectedPhase: knownWebsiteExpectedPhase,
          inspectionQuestion: question,
        }),
      },
    })
  }

  if (requestedBrowserNavigateAction && !browserNavigateWorkflowAlreadyConsumed && (browserPageContext || browserDomLike)) {
    pushAction({
      kind: 'browser-navigate-entry',
      title: requestedBrowserNavigateAction === 'reload'
        ? '先刷新当前页面'
        : requestedBrowserNavigateAction === 'forward'
          ? '先前进到下一页'
          : '先返回上一页',
      rationale: requestedBrowserNavigateAction === 'reload'
        ? '问题里已经明确要求先刷新当前网页。先刷新再重检当前页面状态，比直接猜页面后续动作更稳。'
        : requestedBrowserNavigateAction === 'forward'
          ? '问题里已经明确要求先沿着浏览器历史前进。先完成导航，再根据落地页面继续判断下一步更稳。'
          : '问题里已经明确要求先返回上一页。先完成浏览器导航，再根据落地页面继续判断下一步更稳。',
      toolName: 'browser_navigate',
      arguments: {
        action: requestedBrowserNavigateAction,
        browser: browserPageContext?.browser ?? requestedBrowser ?? 'default',
        ...buildLocalVisualEntryFollowUpArguments({
          expectedPhase: requestedBrowserNavigateAction === 'reload' && input.pagePhase && input.pagePhase !== 'unknown'
            ? input.pagePhase
            : undefined,
          inspectionQuestion: question,
        }),
      },
    })
  }

  if (requestedDesktopApplicationName && !requestedDesktopApplicationAlreadyFocused) {
    pushAction({
      kind: 'desktop-open-application-entry',
      title: `先打开${requestedDesktopApplicationName}`,
      rationale: '问题里已经明确要求先打开目标软件。先把应用带到前台，再根据真实界面继续跨软件操作，比停留在当前桌面场景观察更接近执行闭环。',
      toolName: 'desktop_open_application',
      arguments: {
        appName: requestedDesktopApplicationName,
        ...buildLocalVisualEntryFollowUpArguments({
          inspectionQuestion: question,
        }),
      },
    })
  }

  if (shouldSuggestDesktopShortcutEntry) {
    pushAction({
      kind: 'desktop-press-shortcut-entry',
      title: `先按下 ${requestedDesktopShortcut}`,
      rationale: '问题里已经明确要求先按快捷键。先把键盘动作发给当前前台软件，再根据真实界面反馈继续跨软件操作更稳。',
      toolName: 'desktop_press_keys',
      arguments: {
        shortcut: requestedDesktopShortcut,
        ...buildLocalVisualEntryFollowUpArguments({
          inspectionQuestion: question,
        }),
      },
    })
  }

  if (shouldPrioritizeDesktopControlRelistAfterShortcut) {
    pushAction({
      kind: 'desktop-relist-after-shortcut-focus-shift',
      title: '先重新列出快捷键后的桌面控件',
      rationale: '快捷键已经触发过一次，当前浏览器焦点很可能已切到地址栏或浏览器 chrome 控件。先重新列出桌面控件，再决定下一步输入、点击还是回到正文更稳。',
      toolName: 'desktop_list_interactables',
      arguments: {
        maxItems: 12,
      },
    })
  }

  if (question && browserDomLike && primaryBrowserInputCandidate) {
    const browserTypeArguments = buildBrowserTypeActionArguments({
      browser: browserPageContext?.browser,
      candidate: primaryBrowserInputCandidate,
      expectedPhase: workflowPlan?.targetPhase ?? null,
      pagePhase: input.pagePhase ?? null,
      question,
    })
    if (browserTypeArguments) {
      pushWorkflowAction({
        kind: 'browser-type-requested-input',
        title: sanitizeText(primaryBrowserInputCandidate.text || primaryBrowserInputCandidate.ariaLabel || primaryBrowserInputCandidate.title, 160)
          ? `先向“${sanitizeText(primaryBrowserInputCandidate.text || primaryBrowserInputCandidate.ariaLabel || primaryBrowserInputCandidate.title, 160)}”输入指定内容`
          : '先在当前网页输入指定内容',
        rationale: '问题里已经明确给出了要输入的文本，先把它填进当前最相关的网页输入区域，再观察页面是否推进。',
        toolName: 'browser_type_text',
        arguments: browserTypeArguments,
      })
    }
  }

  if (question && desktopLike && primaryDesktopInputCandidate) {
    const desktopTypeArguments = buildDesktopTypeActionArguments({
      candidate: primaryDesktopInputCandidate,
      expectedPhase: workflowPlan?.targetPhase && workflowPlan.targetPhase !== 'unknown'
        ? workflowPlan.targetPhase
        : null,
      question,
    })
    if (desktopTypeArguments) {
      pushWorkflowAction({
        kind: 'desktop-type-requested-input',
        title: sanitizeText(primaryDesktopInputCandidate.text, 160)
          ? `先向“${sanitizeText(primaryDesktopInputCandidate.text, 160)}”输入指定内容`
          : '先在当前桌面输入区域输入指定内容',
        rationale: '问题里已经明确给出了要输入的文本，先把它填进当前最相关的桌面输入区域，再观察界面是否推进。',
        toolName: 'desktop_type_text',
        arguments: desktopTypeArguments,
      })
    }
  }

  const shouldPrioritizeWorkflowPlan = Boolean(
    workflowPlan
    && (
      executionStrategy.mode === 'browser-desktop-handoff'
      || executionStrategy.mode === 'desktop-dialog'
      || input.pagePhase === 'login'
      || input.pagePhase === 'search-results'
      || input.pagePhase === 'social-feed'
      || input.pagePhase === 'form-entry'
      || input.pagePhase === 'upload-flow'
      || (input.pagePhase === 'content-detail' && contentContinuationQuestion)
    ),
  )

  if (workflowPlan && shouldPrioritizeWorkflowPlan) {
    if (workflowPlan.continuationMode === 'await-host-input' && !nextStepQuestion) {
      for (const repairAction of workflowPlan.repairActions)
        pushWorkflowAction(repairAction)
      for (const step of workflowPlan.steps.filter(step => step.status === 'blocked'))
        pushWorkflowStep(step)
      for (const step of workflowPlan.steps.filter(step => step.status === 'pending'))
        pushWorkflowStep(step)
    }
    else if (workflowPlan.continuationMode === 'await-host-input' && nextStepQuestion) {
      const preferBlockedBeforePending = input.pagePhase === 'form-entry'
      if (preferBlockedBeforePending) {
        for (const step of workflowPlan.steps.filter(step => step.status === 'blocked'))
          pushWorkflowStep(step)
        for (const repairAction of workflowPlan.repairActions)
          pushWorkflowAction(repairAction)
        for (const step of workflowPlan.steps.filter(step => step.status === 'pending'))
          pushWorkflowStep(step)
      }
      else {
        for (const step of workflowPlan.steps.filter(step => step.status === 'pending'))
          pushWorkflowStep(step)
        for (const repairAction of workflowPlan.repairActions)
          pushWorkflowAction(repairAction)
        for (const step of workflowPlan.steps.filter(step => step.status === 'blocked'))
          pushWorkflowStep(step)
      }
    }
    else if (executionStrategy.mode === 'browser-desktop-handoff') {
      for (const step of workflowPlan.steps.filter(step => step.status === 'ready'))
        pushWorkflowStep(step)
      for (const step of workflowPlan.steps.filter(step => step.status === 'pending'))
        pushWorkflowStep(step)
      for (const repairAction of workflowPlan.repairActions)
        pushWorkflowAction(repairAction)
    }
    else if (executionStrategy.mode === 'desktop-dialog') {
      for (const step of workflowPlan.steps.filter(step => step.status === 'ready'))
        pushWorkflowStep(step)
      for (const step of workflowPlan.steps.filter(step => step.status === 'pending'))
        pushWorkflowStep(step)
      for (const repairAction of workflowPlan.repairActions)
        pushWorkflowAction(repairAction)
      for (const step of workflowPlan.steps.filter(step => step.status === 'blocked'))
        pushWorkflowStep(step)
    }
    else {
      for (const step of workflowPlan.steps.filter(step => step.status === 'ready'))
        pushWorkflowStep(step)
      for (const repairAction of workflowPlan.repairActions)
        pushWorkflowAction(repairAction)
      for (const step of workflowPlan.steps.filter(step => step.status === 'pending'))
        pushWorkflowStep(step)
    }
  }

  if (guiStructure?.primaryActionCandidates.length && nextStepQuestion && desktopLike) {
    const primaryAction = guiStructure.primaryActionCandidates[0]!
    pushAction({
      kind: 'desktop-click-primary-action',
      title: primaryAction.text
        ? `先尝试点击“${primaryAction.text}”`
        : '先尝试点击当前主按钮',
      rationale: '当前问题是在问下一步点什么。前台窗口里最像主动作的可交互控件通常是最稳的下一步。',
      toolName: 'desktop_click_element',
      arguments: primaryAction.text
        ? {
            text: primaryAction.text,
            role: primaryAction.role,
          }
        : {
            ordinal: primaryAction.ordinal,
            role: primaryAction.role,
          },
    })
  }

  if (guiStructure?.primaryInputCandidates.length && desktopLike) {
    const primaryInput = guiStructure.primaryInputCandidates[0]!
    pushAction({
      kind: 'desktop-focus-primary-input',
      title: primaryInput.text
        ? `先定位“${primaryInput.text}”输入区域`
        : '先定位当前主输入区域',
      rationale: '当前窗口里已经识别到输入控件。后续若要跨软件继续操作，先锁定输入区域最稳。',
      toolName: 'desktop_list_interactables',
      arguments: {
        role: 'input',
        maxItems: 10,
      },
    })
  }

  if (browserDomLike) {
    const browserPrimaryCandidate = input.pagePhase === 'content-detail' && contentContinuationQuestion
      ? contentDetailContinuationCandidate
      : nextStepQuestion
        ? primaryBrowserCandidate
        : null

    if (browserPrimaryCandidate) {
      pushAction({
        kind: 'browser-click-primary-action',
        title: sanitizeText(browserPrimaryCandidate.text || browserPrimaryCandidate.ariaLabel || browserPrimaryCandidate.title, 160)
          ? `先尝试点击“${sanitizeText(browserPrimaryCandidate.text || browserPrimaryCandidate.ariaLabel || browserPrimaryCandidate.title, 160)}”`
          : '先尝试点击当前页面主动作',
        rationale: '当前问题是在问网页下一步点哪里。页面上下文里最像主动作的按钮或链接，通常就是最稳的下一步。',
        toolName: 'browser_click_element',
        arguments: buildBrowserClickActionArguments(browserPrimaryCandidate, browserPageContext?.browser),
      })
    }

    pushAction({
      kind: 'browser-read-interactables',
      title: nextStepQuestion
        ? '先列出当前页面可点击元素'
        : '列出当前页面按钮和链接',
      rationale: nextStepQuestion
        ? '要判断下一步点击什么，先拿到当前页面的按钮、链接和表单元素最稳。'
        : '当前场景更像浏览器页面，先读取可交互元素能最快定位后续动作。',
      toolName: 'browser_read_page',
      arguments: {
        format: 'interactables',
      },
    })
    pushAction({
      kind: 'browser-read-text',
      title: '读取当前页面正文',
      rationale: '如果当前网页有状态说明、报错或流程提示，先读正文比直接点更稳。',
      toolName: 'browser_read_page',
      arguments: {
        format: 'text',
      },
    })
  }

  if (executionStrategy.mode === 'browser-desktop-handoff') {
    pushAction({
      kind: 'desktop-confirm-handoff',
      title: '先等待并确认原生对话框稳定',
      rationale: '当前浏览器流程已经切到系统级对话框，先用桌面原语稳定前台窗口，再继续点击或输入更稳。',
      toolName: 'desktop_wait',
      arguments: {
        titleIncludes: sanitizeText(input.foregroundWindow?.title, 120) || undefined,
      },
    })
  }

  if (executionStrategy.mode === 'terminal-investigation') {
    const visibleTerminalCommand = inferVisibleTerminalCommand({
      focusTarget: input.focusTarget,
      foregroundWindow: input.foregroundWindow,
      summary,
    })
    if (visibleTerminalCommand) {
      pushAction({
        kind: 'delegate-terminal-cli-investigation',
        title: `先用 CLI 调查可见终端命令“${visibleTerminalCommand.displayText}”`,
        rationale: '当前终端里已经直接看见失败命令。先用 CLI 复现或观察这条命令，比先切去代码调查更稳。',
        toolName: 'executor_run_cli',
        arguments: {
          command: visibleTerminalCommand.command,
          args: visibleTerminalCommand.args,
          goal: 'Investigate visible terminal scene',
          effect: 'observe',
          permissionMode: 'implicit',
          ...buildExecutorFollowUpArguments({
            inspectionQuestion: 'CLI 调查可见终端命令后现在界面到了哪一步',
          }),
        },
      })
    }
  }

  if (executionStrategy.mode === 'coding-investigation' || executionStrategy.mode === 'terminal-investigation') {
    pushAction({
      kind: executionStrategy.mode === 'coding-investigation'
        ? 'delegate-coding-investigation'
        : 'delegate-terminal-investigation',
      title: executionStrategy.mode === 'coding-investigation'
        ? '转给 Codex 调查当前代码/报错'
        : '转给 Codex 调查当前终端报错',
      rationale: executionStrategy.mode === 'coding-investigation'
        ? '当前屏幕已经明显是代码或报错调查场景，直接转给 Codex 做代码级调查，比继续人工描述界面更稳。'
        : '当前屏幕已经明显是终端或日志报错场景，直接转给 Codex 读取上下文并规划修复，比停在界面描述更稳。',
      toolName: 'executor_run_codex',
      arguments: {
        prompt: strategyPrompt,
        kind: 'codebase-investigation',
        goal: `Investigate visible ${summary?.workload.kind ?? 'desktop'} scene`,
        effect: 'observe',
        permissionMode: 'implicit',
        ...buildExecutorFollowUpArguments({
          inspectionQuestion: executionStrategy.mode === 'coding-investigation'
            ? 'Codex 调查当前代码/报错后现在界面到了哪一步'
            : 'Codex 调查当前终端报错后现在界面到了哪一步',
        }),
      },
    })
    pushAction({
      kind: executionStrategy.mode === 'coding-investigation'
        ? 'delegate-coding-investigation-claude-code'
        : 'delegate-terminal-investigation-claude-code',
      title: executionStrategy.mode === 'coding-investigation'
        ? '转给 Claude Code 调查当前代码/报错'
        : '转给 Claude Code 调查当前终端报错',
      rationale: executionStrategy.mode === 'coding-investigation'
        ? '如果更适合走 Claude Code 的代码阅读与补丁链，也可以直接转给它读取当前编码上下文并规划修复。'
        : '如果更适合走 Claude Code 的代码阅读链，也可以直接转给它读取终端报错相关代码上下文并规划修复。',
      toolName: 'executor_run_claude_code',
      arguments: {
        prompt: strategyPrompt,
        kind: 'codebase-investigation',
        goal: `Investigate visible ${summary?.workload.kind ?? 'desktop'} scene`,
        effect: 'observe',
        permissionMode: 'implicit',
        ...buildExecutorFollowUpArguments({
          inspectionQuestion: executionStrategy.mode === 'coding-investigation'
            ? 'Claude Code 调查当前代码/报错后现在界面到了哪一步'
            : 'Claude Code 调查当前终端报错后现在界面到了哪一步',
        }),
      },
    })
  }

  if (errorLike) {
    pushAction({
      kind: 'inspect-error-surface',
      title: '先确认可见报错或日志区域',
      rationale: '当前更像编码或终端错误场景，下一步应先锁定错误文本，再决定是改代码还是执行命令。',
    })
  }

  if (!summary) {
    pushAction({
      kind: 'recheck-capture-state',
      title: '先确认屏幕捕获状态',
      rationale: '目前没有拿到稳定场景摘要，先检查捕获权限、源数量和退化原因，后续 GUI 判断才可靠。',
      toolName: 'sensory_capture_state',
      arguments: {
        includeSystemSample: false,
      },
    })
  }

  if (actions.length === 0) {
    pushAction({
      kind: 'stabilize-scene',
      title: '先稳定当前前台界面再继续',
      rationale: '当前场景已经被看见，但还缺少足够强的跨软件操作原语；先确认前台目标，再决定是否升级到更强执行链。',
    })
  }

  return actions.slice(0, maxSuggestedActions)
}

export function buildAlicizationDesktopInspectionSceneSnapshot(input: {
  browserPageContext?: AlicizationLocalDesktopInspectionBrowserPageContext | null
  capture: AlicizationSensoryCaptureSnapshot | null
  focusTarget: AlicizationScreenSemanticFocusTarget | null
  foregroundWindow: {
    appName?: string
    pid?: number | null
    processName?: string
    title?: string
  } | null
  interactables?: AlicizationLocalDesktopInspectionInteractable[]
  maxSuggestedActions?: number
  question?: string | null
  summary: AlicizationScreenSemanticSummary | null
  unavailableReason: string | null
  workflowState?: AlicizationPerceptionBrowserWorkflowState | null
}): AlicizationLocalDesktopInspectionSceneSnapshot {
  const interactables = Array.isArray(input.interactables)
    ? input.interactables
    : []
  const browserPageContext = normalizeBrowserPageContext(input.browserPageContext)
  const guiStructure = buildAlicizationDesktopInspectionGuiStructure(interactables)
  const browserChromeFocusShift = looksLikeBrowserChromeFocusShift({
    browserPageContext,
    focusTarget: input.focusTarget,
    foregroundWindow: input.foregroundWindow,
    guiStructure,
    question: input.question ?? null,
    summary: input.summary,
  })
  const inferredPagePhase = browserChromeFocusShift
    ? 'unknown'
    : inferBrowserPagePhase({
        browserPageContext,
        summary: input.summary,
      })
  const desktopDialogVisible = isBrowserLike({
    focusTarget: input.focusTarget,
    foregroundWindow: input.foregroundWindow,
    summary: input.summary,
  }) && looksLikeDesktopDialogHandoff({
    browserPageContext,
    focusTarget: input.focusTarget,
    foregroundWindow: input.foregroundWindow,
    guiStructure,
    summary: input.summary,
  })
  const pagePhase = desktopDialogVisible
    ? 'browser-desktop-handoff'
    : inferredPagePhase
  const blockingSignals = inferBrowserBlockingSignals({
    browserPageContext,
    guiStructure,
    pagePhase,
    summary: input.summary,
    desktopDialogVisible,
  })
  const normalizedBlockingSignals = normalizeBrowserBlockingSignalsForQuestion({
    blockingSignals,
    browserPageContext,
    pagePhase,
    question: input.question ?? null,
  })
  const nextActionIntent = inferBrowserNextActionIntent({
    blockingSignals: normalizedBlockingSignals,
    desktopDialogVisible,
    pagePhase: browserChromeFocusShift ? 'unknown' : pagePhase,
  })
  const executionStrategy = buildAlicizationDesktopInspectionExecutionStrategy({
    browserChromeFocusShift,
    blockingSignals: normalizedBlockingSignals,
    browserPageContext,
    focusTarget: input.focusTarget,
    foregroundWindow: input.foregroundWindow,
    guiStructure,
    pagePhase,
    summary: input.summary,
  })
  const resolvedNextActionIntent = browserChromeFocusShift
    ? 'focus-address-bar'
    : nextActionIntent
  const workflowPlan = buildAlicizationDesktopInspectionWorkflowPlan({
    blockingSignals: normalizedBlockingSignals,
    browserPageContext,
    executionStrategy,
    foregroundWindow: input.foregroundWindow,
    guiStructure,
    interactables,
    nextActionIntent: resolvedNextActionIntent,
    pagePhase,
    question: input.question ?? null,
  })
  return {
    browserPageContext,
    blockingSignals: normalizedBlockingSignals,
    capture: input.capture,
    executionStrategy,
    focusTarget: input.focusTarget,
    foregroundWindow: input.foregroundWindow,
    guiStructure,
    interactables,
    nextActionIntent: resolvedNextActionIntent,
    pagePhase,
    question: input.question ?? null,
    screenSemanticSummary: input.summary,
    suggestedActions: buildAlicizationDesktopInspectionSuggestedActions({
      blockingSignals: normalizedBlockingSignals,
      browserPageContext,
      executionStrategy,
      focusTarget: input.focusTarget,
      foregroundWindow: input.foregroundWindow,
      guiStructure,
      maxSuggestedActions: input.maxSuggestedActions,
      nextActionIntent: resolvedNextActionIntent,
      pagePhase,
      question: input.question ?? null,
      summary: input.summary,
      unavailableReason: input.unavailableReason,
      workflowPlan,
      workflowState: input.workflowState ?? null,
    }),
    unavailableReason: input.unavailableReason,
    workflowPlan,
    workflowState: null,
  }
}
