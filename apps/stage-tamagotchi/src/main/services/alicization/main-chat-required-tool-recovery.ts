import type { Message } from '@xsai/shared-chat'

import type { AlicizationExecutionOutcomeSurfaceStatus } from './execution-delivery-surface'

import { randomUUID } from 'node:crypto'

import { resolveAlicizationKnownWebsiteInText } from '@proj-alicization/stage-shared'

import { buildAlicizationExecutionPayoffDeterministicStructured } from './execution-delivery-surface'
import { extractAlicizationRequiredToolNames } from './main-chat-required-tool'

interface AlicizationDeterministicCallableTool {
  function?: {
    name?: unknown
  }
  execute?: (input: Record<string, unknown>) => Promise<unknown> | unknown
}

interface AlicizationDeterministicRequiredToolRecoveryInput {
  cardId: string
  turnId: string
  messages: Message[]
  tools?: AlicizationDeterministicCallableTool[]
  requiredToolNames: string[]
  toolInputOverrides?: Record<string, Record<string, unknown>>
  emitToolCall: (payload: {
    cardId: string
    turnId: string
    toolCallId: string
    toolName: string
    arguments?: Record<string, unknown>
  }) => void
  emitToolResult: (payload: {
    cardId: string
    turnId: string
    toolCallId: string
    result?: unknown
  }) => void
}

export interface AlicizationDeterministicRequiredToolRecoveryResult {
  toolCallId: string
  toolName: string
  toolInput: Record<string, unknown>
  toolResult: unknown
  fullText: string
}

function sanitizeText(raw: unknown, maxChars = 1_200) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function readMessageContentAsText(content: unknown) {
  if (typeof content === 'string')
    return content
  if (!Array.isArray(content))
    return ''
  return content.map((part) => {
    if (typeof part === 'string')
      return part
    if (part && typeof part === 'object' && 'text' in part)
      return String((part as { text?: unknown }).text ?? '')
    return ''
  }).join('\n')
}

function readLatestUserText(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue
    return sanitizeText(readMessageContentAsText(message.content), 4_000)
  }
  return ''
}

function inferCliCommandInput(userText: string): Record<string, unknown> {
  const fencedCommand = userText.match(/`([^`\n]+)`/u)?.[1]?.trim() ?? ''
  if (fencedCommand) {
    const [command, ...args] = fencedCommand.split(/\s+/u).filter(Boolean)
    if (command) {
      return {
        command,
        args,
        goal: `Run CLI command from user turn: ${sanitizeText(fencedCommand, 220)}`,
        effect: 'observe',
      }
    }
  }

  const desktopListingIntent = /(?:桌面|desktop).*(?:什么文件|哪些文件|文件|目录|内容|list|show|查看|查一下|看看)/iu.test(userText)
  if (desktopListingIntent) {
    return {
      command: 'ls',
      args: ['-la', '~/Desktop'],
      goal: 'List desktop files requested by user.',
      effect: 'observe',
    }
  }

  const cwdListingIntent = /(?:当前目录|这个目录|列出|list|ls).*(?:文件|目录|files|folders|directory)/iu.test(userText)
  if (cwdListingIntent) {
    return {
      command: 'ls',
      args: ['-la'],
      goal: 'List files in the current directory requested by user.',
      effect: 'observe',
    }
  }

  return {
    command: 'ls',
    args: ['-la'],
    goal: `Run CLI follow-up for required execution turn: ${sanitizeText(userText, 220) || 'user-requested execution'}`,
    effect: 'observe',
  }
}

function inferCodexToolInput(userText: string, toolName: 'executor_run_codex' | 'executor_run_claude_code') {
  const mutateIntent = /修复|重构|修改|实现|新增|补丁|fix|refactor|edit|implement|patch|update/iu.test(userText)
  const kind = mutateIntent ? 'codebase-edit' : 'codebase-investigation'
  const effect = mutateIntent ? 'mutate' : 'observe'
  if (toolName === 'executor_run_claude_code') {
    return {
      prompt: userText || 'Continue the current requested task and report concrete progress.',
      kind,
      effect,
      allowTools: mutateIntent,
    } satisfies Record<string, unknown>
  }
  return {
    prompt: userText || 'Continue the current requested task and report concrete progress.',
    kind,
    effect,
    sandbox: mutateIntent ? 'workspace-write' : 'read-only',
  } satisfies Record<string, unknown>
}

function inferVisualExecutorKind(userText: string) {
  const normalized = userText.toLowerCase()
  return /browser|网页|浏览器|url|tab/u.test(normalized)
    ? 'browser-automation'
    : /软件|app|窗口|window/u.test(normalized)
      ? 'software-automation'
      : /桌面|desktop|screen|屏幕/u.test(normalized)
        ? 'desktop-automation'
        : 'mixed'
}

function inferLocalVisualToolInput(userText: string) {
  return {
    instruction: userText || 'Continue the requested local visual task and report concrete results.',
    kind: inferVisualExecutorKind(userText),
    effect: 'observe',
  } satisfies Record<string, unknown>
}

function inferOpenClawToolInput(userText: string) {
  return {
    instruction: userText || 'Continue the requested embodied task and report concrete results.',
    kind: inferVisualExecutorKind(userText),
    effect: 'observe',
  } satisfies Record<string, unknown>
}

function inferBrowserPreference(userText: string) {
  if (/safari/iu.test(userText))
    return 'safari'
  if (/chrome|谷歌浏览器|google chrome/iu.test(userText))
    return 'chrome'
  return 'default'
}

function inferSearchEngine(userText: string) {
  if (/百度/u.test(userText))
    return 'baidu'
  if (/\bbing\b/iu.test(userText))
    return 'bing'
  if (/duckduckgo|duck\s+duck\s+go/iu.test(userText))
    return 'duckduckgo'
  return 'google'
}

function hasBrowserWorkflowContinuationIntent(userText: string) {
  return /继续|接着|接下来|续上|接上|然后继续|再继续|resume|continue|carry\s+on|keep\s+going/iu.test(userText)
}

function stripBrowserWorkflowContinuationTail(userText: string) {
  return sanitizeText(
    userText
      .replace(/(?:然后|并且|并|再)?(?:继续|接着|接下来|续上|接上).*$/u, '')
      .replace(/(?:then\s+)?(?:continue|resume|carry\s+on|keep\s+going).*$/iu, '')
      .trim(),
    220,
  )
}

function inferBrowserWorkflowContinuationOverrides(input: {
  userText: string
  expectedPhase?: 'search-results' | 'social-feed'
}) {
  if (!hasBrowserWorkflowContinuationIntent(input.userText))
    return {}

  return {
    expectedPhase: input.expectedPhase,
    reinspectAfterAction: true,
    autoContinueSuggestedActions: true,
    maxAutoContinueSteps: 2,
    inspectionQuestion: sanitizeText(input.userText, 220) || undefined,
  } satisfies Record<string, unknown>
}

function inferBrowserOpenUrlToolInput(userText: string) {
  const url = userText.match(/(?:https?:\/\/|www\.)[^\s"'`]+/iu)?.[0]?.replace(/[).,!?！？，。]+$/u, '') ?? ''
  const knownWebsite = url ? null : resolveAlicizationKnownWebsiteInText(userText)
  return {
    browser: inferBrowserPreference(userText),
    site: knownWebsite?.site,
    url: /^www\./iu.test(url)
      ? `https://${url}`
      : (url || knownWebsite?.url || 'about:blank'),
    ...inferBrowserWorkflowContinuationOverrides({
      userText,
      expectedPhase: knownWebsite?.site === 'weibo' ? 'social-feed' : undefined,
    }),
  } satisfies Record<string, unknown>
}

function inferBrowserSearchToolInput(userText: string) {
  const searchEngine = inferSearchEngine(userText)
  const query = sanitizeText(
    stripBrowserWorkflowContinuationTail(userText)
      .replace(/^(?:请|麻烦|帮我|帮忙|请你|拜托)/u, '')
      .replace(/百度一下|百度|谷歌一下|谷歌|google|bing|duckduckgo|duck\s+duck\s+go|搜索一下|搜索|搜一下|搜一搜|搜个|搜/iu, '')
      .replace(/^(?:在|用)?(?:浏览器|browser)?/iu, '')
      .trim(),
    220,
  ) || sanitizeText(userText, 220) || 'current topic'
  return {
    browser: inferBrowserPreference(userText),
    searchEngine,
    query,
    ...inferBrowserWorkflowContinuationOverrides({
      userText,
      expectedPhase: 'search-results',
    }),
  } satisfies Record<string, unknown>
}

function inferBrowserReadToolInput(userText: string) {
  const knownWebsite = resolveAlicizationKnownWebsiteInText(userText)
  const continuationIntent = /继续|接着|接下来|续上|接上|resume|continue|carry\s+on|keep\s+going/iu.test(userText)
  const interactableIntent = /按钮|链接|元素|可点击|交互|输入框|表单|下一步|该点哪里|该点什么|点哪里|点什么|what should .*click|next step/iu.test(userText)
    || Boolean(knownWebsite && continuationIntent)
  return {
    browser: inferBrowserPreference(userText),
    format: /\bhtml\b|源码/u.test(userText)
      ? 'html'
      : interactableIntent
        ? 'interactables'
        : 'text',
  } satisfies Record<string, unknown>
}

function inferBrowserClickToolInput(userText: string) {
  const selectorMatch = userText.match(/(?:selector|选择器)\s*(?:[:：]\s*)?[`'"]?([^`'"\s]+)[`'"]?|([#.][-\w]+|\[[^\]]+\])/iu)
  const textMatch = userText.match(/(?:点击|点一下|点开|click)\s*(?:当前网页|当前页面|这个网页|这个页面|网页|页面|浏览器)?(?:上|里|中的?)?的?(.+?)(?:按钮|链接|选项|元素)/iu)
  const ordinalMatch = userText.match(/第\s*([一二三四五六七八九十两\d]+)\s*(?:[个条项]\s*)?(按钮|链接|选项|元素)/u)
  const ordinalToken = sanitizeText(ordinalMatch?.[1] ?? '', 40)
  const ordinalTypeToken = sanitizeText(ordinalMatch?.[2] ?? '', 40)
  const chineseOrdinalMap: Record<string, number> = {
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  }
  const parseOrdinal = (token: string) => {
    if (/^\d+$/u.test(token))
      return Number.parseInt(token, 10)
    if (token in chineseOrdinalMap)
      return chineseOrdinalMap[token]!
    const tensMatch = token.match(/^([一二三四五六七八九])?十([一二三四五六七八九])?$/u)
    if (!tensMatch)
      return undefined
    const tens = tensMatch[1] ? chineseOrdinalMap[tensMatch[1]]! : 1
    const units = tensMatch[2] ? chineseOrdinalMap[tensMatch[2]]! : 0
    return tens * 10 + units
  }
  const ordinal = parseOrdinal(ordinalToken)
  const targetType = ordinalTypeToken === '链接'
    ? 'link'
    : ordinalTypeToken === '按钮'
      ? 'button'
      : ordinalTypeToken
        ? 'element'
        : undefined
  const text = sanitizeText(textMatch?.[1] ?? '', 220)
    .replace(/^[“”"'【】「」[\]()]+|[“”"'【】「」[\]()]+$/gu, '')
  return {
    browser: inferBrowserPreference(userText),
    ordinal,
    selector: sanitizeText(selectorMatch?.[1] ?? selectorMatch?.[2] ?? '', 220) || undefined,
    targetType,
    text: ordinal ? undefined : (text || undefined),
  } satisfies Record<string, unknown>
}

function inferBrowserTypeTextToolInput(userText: string) {
  const quotedMatch = userText.match(/[“"'`「」『』]([^“"'`「」『』]+)[“"'`「」『』]/u)
  const text = sanitizeText(quotedMatch?.[1] ?? '', 220)
    || sanitizeText(
      userText
        .replace(/^(?:请|麻烦|帮我|帮忙|请你|拜托)/u, '')
        .replace(/.*(?:输入|键入|填写|type|fill|paste)\s*/iu, '')
        .replace(/[，。！？,.;:]+$/u, ''),
      220,
    )
  const selectorMatch = userText.match(/(?:selector|选择器)\s*(?:[:：]\s*)?[`'"]?([^`'"\s]+)[`'"]?|([#.][-\w]+|\[[^\]]+\])/iu)
  const targetMatch = userText.match(/(?:当前网页|当前页面|这个网页|这个页面|网页|页面)(?:上|里|中的?)?的?(.+?)(?:输入框|搜索框|文本框|邮箱输入框)/u)
    ?? userText.match(/(.+?)(?:输入框|搜索框|文本框|邮箱输入框).*(?:输入|键入|填写)/u)
  const normalizedTargetText = sanitizeText(targetMatch?.[1] ?? '', 220)
    .replace(/^[“”"'【】「」[\]()]+|[“”"'【】「」[\]()]+$/gu, '')
    .replace(/^[的在向把]+/u, '')
    .replace(/(?:里|中|上的?|中的?)$/u, '')
  const roleFallbackTargetText = /搜索框/u.test(userText)
    ? '搜索'
    : /邮箱输入框/u.test(userText)
      ? '邮箱'
      : ''
  return {
    browser: inferBrowserPreference(userText),
    text: text || sanitizeText(userText, 220),
    targetText: normalizedTargetText || roleFallbackTargetText || undefined,
    selector: sanitizeText(selectorMatch?.[1] ?? selectorMatch?.[2] ?? '', 220) || undefined,
    clearExisting: /清空|覆盖|替换|replace|overwrite/iu.test(userText),
    submit: /回车|提交|enter|submit/iu.test(userText),
  } satisfies Record<string, unknown>
}

function inferBrowserNavigateToolInput(userText: string) {
  const normalized = sanitizeText(userText, 320).toLowerCase()
  const action = /前进|go\s+forward/u.test(normalized)
    ? 'forward'
    : /刷新|重新加载|reload|refresh/u.test(normalized)
      ? 'reload'
      : 'back'
  return {
    browser: inferBrowserPreference(userText),
    action,
  } satisfies Record<string, unknown>
}

function inferBrowserScrollToolInput(userText: string) {
  const normalized = sanitizeText(userText, 320).toLowerCase()
  const action = /顶部|最上面|top/u.test(normalized)
    ? 'top'
    : /底部|最下面|bottom/u.test(normalized)
      ? 'bottom'
      : /向上|往上|朝上|scroll\s+up|page\s+up/u.test(normalized)
        ? 'up'
        : 'down'
  const amountMatch = normalized.match(/([1-9]\d?)\s*[页次屏]/u)
  const amount = amountMatch?.[1]
    ? Number.parseInt(amountMatch[1], 10)
    : 1
  return {
    browser: inferBrowserPreference(userText),
    action,
    amount,
  } satisfies Record<string, unknown>
}

function inferBrowserWaitToolInput(userText: string) {
  const normalized = sanitizeText(userText, 320).toLowerCase()
  const state = /interactive|交互就绪/u.test(normalized)
    ? 'interactive'
    : 'complete'

  return {
    browser: inferBrowserPreference(userText),
    state,
    text: undefined,
    urlIncludes: undefined,
    timeoutMs: 5_000,
  } satisfies Record<string, unknown>
}

function inferDesktopOpenApplicationToolInput(userText: string) {
  const normalized = sanitizeText(userText, 320)
  const appName = sanitizeText(
    normalized
      .replace(/^(?:请|麻烦|帮我|帮忙|请你|拜托)/u, '')
      .replace(/^(?:打开|启动|运行|launch|open)(?:一下)?/iu, '')
      .replace(/^(?:软件|应用|app(?:lication)?|程序)\s*/iu, '')
      .replace(/[，。！？,.;:]+$/u, ''),
    160,
  ) || 'Finder'
  return {
    appName,
    args: [],
  } satisfies Record<string, unknown>
}

function inferDesktopWaitToolInput(userText: string) {
  const normalized = sanitizeText(userText, 320)
  const appName = sanitizeText(
    normalized
      .replace(/^(?:请|麻烦|帮我|帮忙|请你|拜托)/u, '')
      .replace(/^(?:等待|等一下|等会|wait)(?:一下)?/iu, '')
      .replace(/^(?:软件|应用|app(?:lication)?|程序)\s*/iu, '')
      .replace(/(?:打开|启动|出现|显示|到前台|切到前台|前台|就绪|ready|完成|稳定).*$/iu, '')
      .replace(/[，。！？,.;:]+$/u, ''),
    160,
  )
  const titleIncludes = sanitizeText(
    normalized.match(/(?:窗口|标题).*\s*[“"'`「」『』]?([^“"'`「」『』]+)[“"'`「」『』]?/u)?.[1] ?? '',
    160,
  ) || undefined
  return {
    appName: appName || undefined,
    titleIncludes,
    timeoutMs: 5_000,
  } satisfies Record<string, unknown>
}

function inferDesktopListInteractablesToolInput(userText: string) {
  const normalized = sanitizeText(userText, 320)
  const role = /按钮/u.test(normalized)
    ? 'button'
    : /链接/u.test(normalized)
      ? 'link'
      : /输入框|搜索框|文本框/u.test(normalized)
        ? 'input'
        : undefined
  return {
    role,
    maxItems: /全部|所有|all/iu.test(normalized) ? 20 : 10,
  } satisfies Record<string, unknown>
}

function inferDesktopClickToolInput(userText: string) {
  const textMatch = userText.match(/(?:点击|点一下|点开|click)\s*(?:当前窗口|现在窗口|这个窗口|前台窗口|当前应用|这个应用|当前软件|这个软件|当前界面|这个界面|桌面)?(?:上|里|中的?)?的?(.+?)(?:按钮|链接|选项|元素|输入框|搜索框|文本框)/iu)
  const ordinalMatch = userText.match(/第\s*([一二三四五六七八九十两\d]+)\s*(?:[个条项]\s*)?(按钮|链接|选项|元素|输入框|搜索框|文本框)/u)
  const ordinalToken = sanitizeText(ordinalMatch?.[1] ?? '', 40)
  const ordinalTypeToken = sanitizeText(ordinalMatch?.[2] ?? '', 40)
  const chineseOrdinalMap: Record<string, number> = {
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  }
  const parseOrdinal = (token: string) => {
    if (/^\d+$/u.test(token))
      return Number.parseInt(token, 10)
    if (token in chineseOrdinalMap)
      return chineseOrdinalMap[token]!
    const tensMatch = token.match(/^([一二三四五六七八九])?十([一二三四五六七八九])?$/u)
    if (!tensMatch)
      return undefined
    const tens = tensMatch[1] ? chineseOrdinalMap[tensMatch[1]]! : 1
    const units = tensMatch[2] ? chineseOrdinalMap[tensMatch[2]]! : 0
    return tens * 10 + units
  }
  const role = ordinalTypeToken === '按钮'
    ? 'button'
    : ordinalTypeToken === '链接'
      ? 'link'
      : /输入框|搜索框|文本框/u.test(ordinalTypeToken)
        ? 'input'
        : /按钮/u.test(userText)
          ? 'button'
          : /链接/u.test(userText)
            ? 'link'
            : /输入框|搜索框|文本框/u.test(userText)
              ? 'input'
              : undefined
  const text = sanitizeText(textMatch?.[1] ?? '', 220)
    .replace(/^[“”"'【】「」[\]()]+|[“”"'【】「」[\]()]+$/gu, '')
  return {
    text: text || undefined,
    ordinal: parseOrdinal(ordinalToken),
    role,
  } satisfies Record<string, unknown>
}

function inferDesktopTypeTextToolInput(userText: string) {
  const quotedMatch = userText.match(/[“"'`「」『』]([^“"'`「」『』]+)[“"'`「」『』]/u)
  const text = sanitizeText(quotedMatch?.[1] ?? '', 220)
    || sanitizeText(
      userText
        .replace(/^(?:请|麻烦|帮我|帮忙|请你|拜托)/u, '')
        .replace(/.*(?:输入|键入|填写|type|fill|paste)\s*/iu, '')
        .replace(/[到进在].*(?:当前窗口|现在窗口|这个窗口|前台窗口|当前应用|这个应用|当前软件|这个软件|当前界面|这个界面).*/u, '')
        .replace(/[，。！？,.;:]+$/u, ''),
      220,
    )
  const targetMatch = userText.match(/(?:在|向)?(?:当前窗口|现在窗口|这个窗口|前台窗口|当前应用|这个应用|当前软件|这个软件|当前界面|这个界面)(?:里|中)?的?(.+?)(?:输入框|搜索框|文本框)/u)
  const targetText = sanitizeText(targetMatch?.[1] ?? '', 220)
    .replace(/^[“”"'【】「」[\]()]+|[“”"'【】「」[\]()]+$/gu, '')
  return {
    text: text || sanitizeText(userText, 220),
    targetText: targetText || undefined,
    clearExisting: /清空|覆盖|替换|replace|overwrite/iu.test(userText),
    submit: /回车|提交|enter|submit/iu.test(userText),
  } satisfies Record<string, unknown>
}

function inferDesktopPressKeysToolInput(userText: string) {
  const normalized = sanitizeText(userText, 320)
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
  return {
    shortcut: shortcut || 'enter',
  } satisfies Record<string, unknown>
}

function inferDesktopInspectSceneToolInput(userText: string) {
  const normalized = sanitizeText(userText, 320)
  const continuationIntent = /继续|接着|接下来|续上|接上|然后继续|再继续|resume|continue|carry\s+on|keep\s+going/iu.test(normalized)
  const uploadIntent = /上传|上传流程|选择文件|文件选择|file picker|choose file|select file|upload/iu.test(normalized)
  const forceRefresh = /重新|再看|重看|看清|看准|自己看|别猜|不要猜|again|recheck|look again|check again|inspect again/iu.test(normalized)
  const maxSuggestedActions = /下一步|该点什么|点哪里|next step|what should .*click|what to click/iu.test(normalized)
    || uploadIntent
    ? 5
    : 3

  return {
    question: normalized || 'Inspect the current desktop scene.',
    forceRefresh,
    maxSuggestedActions,
    ...(continuationIntent && maxSuggestedActions >= 5
      ? {
          autoContinueSuggestedActions: true,
          maxAutoContinueSteps: 2,
        }
      : {}),
  } satisfies Record<string, unknown>
}

function buildDeterministicToolInput(toolName: string, userText: string) {
  switch (toolName) {
    case 'executor_run_cli':
      return inferCliCommandInput(userText)
    case 'executor_run_codex':
      return inferCodexToolInput(userText, 'executor_run_codex')
    case 'executor_run_claude_code':
      return inferCodexToolInput(userText, 'executor_run_claude_code')
    case 'executor_run_local_visual':
      return inferLocalVisualToolInput(userText)
    case 'executor_run_openclaw':
      return inferOpenClawToolInput(userText)
    case 'browser_open_url':
      return inferBrowserOpenUrlToolInput(userText)
    case 'browser_search_web':
      return inferBrowserSearchToolInput(userText)
    case 'browser_read_page':
      return inferBrowserReadToolInput(userText)
    case 'browser_click_element':
      return inferBrowserClickToolInput(userText)
    case 'browser_type_text':
      return inferBrowserTypeTextToolInput(userText)
    case 'browser_navigate':
      return inferBrowserNavigateToolInput(userText)
    case 'browser_scroll':
      return inferBrowserScrollToolInput(userText)
    case 'browser_wait':
      return inferBrowserWaitToolInput(userText)
    case 'desktop_inspect_scene':
      return inferDesktopInspectSceneToolInput(userText)
    case 'desktop_list_interactables':
      return inferDesktopListInteractablesToolInput(userText)
    case 'desktop_click_element':
      return inferDesktopClickToolInput(userText)
    case 'desktop_type_text':
      return inferDesktopTypeTextToolInput(userText)
    case 'desktop_press_keys':
      return inferDesktopPressKeysToolInput(userText)
    case 'desktop_open_application':
      return inferDesktopOpenApplicationToolInput(userText)
    case 'desktop_wait':
      return inferDesktopWaitToolInput(userText)
    default:
      return {}
  }
}

function readToolName(tool: AlicizationDeterministicCallableTool) {
  if (!tool || typeof tool !== 'object')
    return ''
  return sanitizeText(tool.function?.name, 96)
}

function readDeterministicRecoveryReply(result: unknown) {
  if (typeof result === 'string')
    return sanitizeText(result, 2_000)
  if (!result || typeof result !== 'object')
    return ''
  const payload = result as Record<string, unknown>
  const summary = sanitizeText(payload.summary, 2_000)
  if (summary)
    return summary
  const errorMessage = sanitizeText(payload.errorMessage, 2_000)
  if (errorMessage)
    return errorMessage
  if (typeof payload.output === 'string') {
    const outputText = sanitizeText(payload.output, 2_000)
    if (outputText)
      return outputText
  }
  if (payload.output != null) {
    const serialized = sanitizeText(JSON.stringify(payload.output), 2_000)
    if (serialized)
      return serialized
  }
  return sanitizeText(payload.status, 200)
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function normalizeExecutorChannel(toolName: string, result: Record<string, unknown>) {
  const selectedChannel = sanitizeText(result.selectedChannel, 48)
  if (selectedChannel)
    return selectedChannel
  if (toolName === 'executor_run_cli')
    return 'cli'
  if (toolName === 'executor_run_codex')
    return 'codex'
  if (toolName === 'executor_run_claude_code')
    return 'claude-code'
  if (toolName === 'executor_run_local_visual') {
    const channelHint = `${sanitizeText(result.kind, 48)} ${sanitizeText(result.goal, 120)} ${sanitizeText(result.summary, 120)}`.toLowerCase()
    if (/browser|page|tab|网页|浏览器|页面/u.test(channelHint))
      return 'browser'
    if (/software|app|应用|软件/u.test(channelHint))
      return 'software'
    return 'desktop'
  }
  if (toolName === 'executor_run_openclaw')
    return 'openclaw'
  if (toolName === 'browser_open_url'
    || toolName === 'browser_search_web'
    || toolName === 'browser_read_page'
    || toolName === 'browser_click_element'
    || toolName === 'browser_type_text'
    || toolName === 'browser_navigate'
    || toolName === 'browser_scroll'
    || toolName === 'browser_wait') {
    return 'browser'
  }
  if (toolName === 'desktop_inspect_scene'
    || toolName === 'desktop_list_interactables'
    || toolName === 'desktop_click_element'
    || toolName === 'desktop_type_text'
    || toolName === 'desktop_press_keys'
    || toolName === 'desktop_open_application'
    || toolName === 'desktop_wait') {
    return 'desktop'
  }
  return 'executor'
}

function normalizeInlineExecutionStatus(result: Record<string, unknown>): AlicizationExecutionOutcomeSurfaceStatus {
  const threadStatus = sanitizeText(result.threadStatus, 48).toLowerCase()
  if (threadStatus === 'completed' || threadStatus === 'cancelled' || threadStatus === 'blocked' || threadStatus === 'failed' || threadStatus === 'queued' || threadStatus === 'running')
    return threadStatus
  const status = sanitizeText(result.status, 48).toLowerCase()
  if (status === 'completed' || status === 'cancelled' || status === 'blocked' || status === 'failed' || status === 'queued' || status === 'running')
    return status
  return 'failed'
}

function buildDeterministicRecoveryStructuredText(input: {
  fullText: string
  toolName: string
  toolResult: unknown
}) {
  const payload = asRecord(input.toolResult)
  if (!payload)
    return input.fullText

  const status = normalizeInlineExecutionStatus(payload)
  const channel = normalizeExecutorChannel(input.toolName, payload)
  const summary = sanitizeText(payload.summary, 220)
  const output = sanitizeText(payload.output, 220)
  const goal = sanitizeText(payload.goal, 220) || summary || 'the current task'
  const structured = buildAlicizationExecutionPayoffDeterministicStructured({
    mode: 'inline-execution',
    channel,
    goal,
    status,
    summary,
    outcome: output || summary,
    visibleReplyAuthority: 'llm-second-pass-rewrite',
  })

  return JSON.stringify(structured)
}

function pickDeterministicRecoveryTool(input: {
  requiredToolNames: string[]
  tools?: AlicizationDeterministicCallableTool[]
}) {
  const tools = Array.isArray(input.tools)
    ? input.tools
    : []
  if (tools.length === 0)
    return null

  const requiredToolNames = [...new Set(input.requiredToolNames.map(name => sanitizeText(name, 96)).filter(Boolean))]
  for (const requiredToolName of requiredToolNames) {
    const matched = tools.find((tool) => {
      return typeof tool.execute === 'function'
        && readToolName(tool) === requiredToolName
    })
    if (matched)
      return { tool: matched, toolName: requiredToolName }
  }

  const fallback = tools.find(tool => typeof tool.execute === 'function')
  if (!fallback)
    return null
  const fallbackName = readToolName(fallback)
  return fallbackName
    ? { tool: fallback, toolName: fallbackName }
    : null
}

export function resolveDeterministicRequiredToolNames(input: {
  error?: unknown
  fallbackToolNames?: string[]
}) {
  const fromError = extractAlicizationRequiredToolNames(input.error)
  if (fromError.length > 0)
    return fromError
  return [...new Set((input.fallbackToolNames ?? [])
    .map(name => sanitizeText(name, 96))
    .filter(Boolean))]
}

export async function recoverAlicizationRequiredToolDeterministically(
  input: AlicizationDeterministicRequiredToolRecoveryInput,
): Promise<AlicizationDeterministicRequiredToolRecoveryResult> {
  const selected = pickDeterministicRecoveryTool({
    requiredToolNames: input.requiredToolNames,
    tools: input.tools,
  })
  if (!selected || typeof selected.tool.execute !== 'function') {
    throw new Error(`No executable required tool found for deterministic recovery: ${input.requiredToolNames.join(', ')}`)
  }

  const userText = readLatestUserText(input.messages)
  const toolInput = input.toolInputOverrides?.[selected.toolName]
    ?? buildDeterministicToolInput(selected.toolName, userText)
  const toolCallId = `required-tool-recovery-${randomUUID()}`

  input.emitToolCall({
    cardId: input.cardId,
    turnId: input.turnId,
    toolCallId,
    toolName: selected.toolName,
    arguments: toolInput,
  })

  const toolResult = await selected.tool.execute(toolInput)
  input.emitToolResult({
    cardId: input.cardId,
    turnId: input.turnId,
    toolCallId,
    result: toolResult,
  })

  const replyText = readDeterministicRecoveryReply(toolResult)
  const fullText = buildDeterministicRecoveryStructuredText({
    fullText: replyText,
    toolName: selected.toolName,
    toolResult,
  })
  if (!fullText) {
    throw new Error(`Deterministic required-tool recovery produced no reply text: ${selected.toolName}`)
  }

  return {
    toolCallId,
    toolName: selected.toolName,
    toolInput,
    toolResult,
    fullText,
  }
}
