export const alicizationExecutionCapabilityChannels = [
  'cli',
  'codex',
  'claude-code',
  'openclaw',
  'openfang',
  'browser',
  'software',
  'desktop',
] as const

export type AlicizationExecutionCapabilityChannel = typeof alicizationExecutionCapabilityChannels[number]
export type AlicizationExecutionDispatchChannel = 'cli' | 'codex' | 'claude-code' | 'openclaw'
export type AlicizationExecutionRoutingChannel = AlicizationExecutionDispatchChannel | 'browser' | 'software' | 'desktop'
export type AlicizationExecutorToolName
  = | 'executor_run_cli'
    | 'executor_run_codex'
    | 'executor_run_claude_code'
    | 'executor_run_local_visual'
    | 'executor_run_openclaw'
    | 'browser_open_url'
    | 'browser_search_web'
    | 'browser_read_page'
    | 'browser_click_element'
    | 'browser_type_text'
    | 'browser_navigate'
    | 'browser_scroll'
    | 'browser_wait'
    | 'desktop_inspect_scene'
    | 'desktop_list_interactables'
    | 'desktop_click_element'
    | 'desktop_type_text'
    | 'desktop_press_keys'
    | 'desktop_open_application'
    | 'desktop_wait'

export type AlicizationExecutionToolInputOverrides = Partial<Record<AlicizationExecutorToolName, Record<string, unknown>>>

export interface AlicizationExecutionCapabilityInquiry {
  active: boolean
  capabilityQuestion: boolean
  mentionedChannels: AlicizationExecutionCapabilityChannel[]
  hasActionVerb: boolean
  hasCommandLiteral: boolean
}

export interface AlicizationExecutionRoutingIntent {
  requestedChannels: AlicizationExecutionRoutingChannel[]
  requiredToolNames: AlicizationExecutorToolName[]
  reasonCodes: string[]
  toolInputOverrides?: AlicizationExecutionToolInputOverrides
}

export interface AlicizationExecutionSemanticSignals {
  normalizedText: string
  mentionedChannels: AlicizationExecutionCapabilityChannel[]
  mentionedDispatchChannels: AlicizationExecutionDispatchChannel[]
  hasCapabilityQuestion: boolean
  hasQuestionMarker: boolean
  hasRequestFrame: boolean
  hasCommandLiteral: boolean
  hasCommandToken: boolean
  hasShellLikeStructure: boolean
  hasFilesystemPathReference: boolean
  hasToolReference: boolean
  hasCodeArtifact: boolean
  hasBrowserArtifact: boolean
  hasSoftwareArtifact: boolean
  hasExecutionSignal: boolean
  executionSignalScore: number
}

export interface AlicizationExecutionTurnAuthority {
  semanticSignals: AlicizationExecutionSemanticSignals
  explicitExecutionDemand: boolean
  fallbackImperative: boolean
  executionBound: boolean
  reasonCodes: string[]
}

export interface AlicizationKnownWebsiteResolution {
  label: string
  matchedAlias: string
  site: string
  url: string
}

const executionCapabilityAliasPatterns: Record<AlicizationExecutionCapabilityChannel, RegExp[]> = {
  'cli': [
    /\bcli\b/iu,
    /\bshell\b/iu,
    /\bterminal\b/iu,
    /命令行|终端|控制台|cli命令/u,
  ],
  'codex': [
    /\bcodex\b/iu,
  ],
  'claude-code': [
    /claude[\s-]?code/iu,
  ],
  'openclaw': [
    /open[\s-]?claw/iu,
  ],
  'openfang': [
    /open[\s-]?fang/iu,
  ],
  'browser': [
    /\bbrowser\b/iu,
    /浏览器/u,
  ],
  'software': [
    /\bsoftware\b/iu,
    /\bapp(?:lication)?\b/iu,
    /软件/u,
  ],
  'desktop': [
    /\bdesktop\b/iu,
    /\bmouse\b/iu,
    /\bkeyboard\b/iu,
    /桌面|鼠标|键盘/u,
  ],
}

const executionCapabilityQuestionPattern = /能不能|可不可以|可以(?:用|调用|执行|操作)?吗|会不会|是否(?:可以|支持)|支持不支持|can\s+you|are\s+you\s+able|do\s+you\s+support|can\s+u|could\s+you/iu
const executionCommandLiteralPattern = /`[^`\n]+`|(?:^|\s)(?:pnpm|npm|yarn|bun|git|ls|cat|rg|grep|python|node|tsx|tsc|vitest|eslint|prettier)\b/iu
const executionCommandTokenPattern = /\b(?:pnpm|npm|yarn|bun|git|ls|cat|rg|grep|find|python|node|tsx|tsc|vue-tsc|vitest|eslint|prettier|typecheck|lint|build|test)\b/iu
const executionQuestionMarkerPattern = /[?？]|能不能|可不可以|会不会|是否|can\s+you|could\s+you|are\s+you|do\s+you/iu
const executionRequestFramePattern = /请你|请|麻烦|拜托|帮我|帮忙|希望你|我想让你|please|help\s+me|can\s+you|could\s+you|would\s+you|i\s+need\s+you|(?:^|\n)\s*use\s+/iu
const executionShellPromptPattern = /(?:^|\n)\s*[$>#]\s*[^\s`]+/u
const executionShellOperatorPattern = /&&|\|\||[|><]{1,2}|(?:^|\s)-[a-z0-9-]+(?:\s|$)/iu
const executionFilesystemPathPattern = /(?:^|[\s`'"])(?:~\/|\.{1,2}\/|\/[^\s"'`]+|[A-Za-z]:\\[^\s"'`]+|[^\s"'`]+\.(?:ts|tsx|js|jsx|vue|json|md|yaml|yml|toml|py|go|rs|java|kt|swift|sh|c|cpp|h))(?:$|[\s`'"])/u
const executionToolReferencePattern = /\b(?:executor_run_[a-z_]+|filesystem_[a-z_]+|mcp_[a-z_]+)\b/iu
const executionCodeArtifactPattern = /```|(?:^|[\s`'"])[\w./-]+\.(?:ts|tsx|js|jsx|vue|json|md|yaml|yml|toml|py|go|rs|java|kt|swift|sh|c|cpp|h)(?:$|[\s`'"])/iu
const executionBrowserArtifactPattern = /https?:\/\/|www\.|\bdom\b|\bhtml\b|\bcss\b|\burl\b|\btab\b|浏览器|网页|页面|网址|标签页/u
const executionSoftwareArtifactPattern = /\bapp(?:lication)?\b|\bwindow\b|\bdesktop\b|软件|窗口|桌面/u
const executionFallbackImperativePattern = /(?:用|使用).*(?:cli|codex|claude[\s-]?code|openclaw)|(?:帮我|请|麻烦).*(?:执行|运行|查|列出|修改|修复|重构|run|execute|list|show|fix|refactor)/iu

const executionRoutingToolMap: Record<AlicizationExecutionDispatchChannel, AlicizationExecutorToolName> = {
  'cli': 'executor_run_cli',
  'codex': 'executor_run_codex',
  'claude-code': 'executor_run_claude_code',
  'openclaw': 'executor_run_openclaw',
}

const localAutomationUrlPattern = /(?:https?:\/\/|www\.)[^\s"'`]+/iu
const localAutomationNavigationIntentPattern = /打开|启动|访问|前往|进入|open|launch|visit|go\s+to/iu
const localAutomationBrowserOpenPattern = /(?:打开|启动|访问|前往|进入|open|launch|visit|go\s+to).*(?:浏览器|browser|safari|chrome|https?:\/\/|www\.)/iu
const localAutomationBrowserSearchPattern = /百度(?:一下)?|谷歌|google|bing|duckduckgo|duck\s+duck\s+go|web\s+search|搜索一下|搜索|搜一下|搜一搜|搜个|搜|查一下网页|查一下网上|上网搜/iu
const localAutomationBrowserReadPattern = /(?:读一下|读取|阅读|看一下|看下|查看|看看).*(?:当前网页|当前页面|这个网页|这个页面|网页内容|页面内容)|(?:当前网页|当前页面|这个网页|这个页面).*(?:内容|文本|源码|html)/iu
const localAutomationBrowserContinuationPattern = /继续|接着|接下来|续上|接上|resume|continue|carry\s+on|keep\s+going/iu
const localAutomationBrowserClickPattern = /(?:点击|点一下|点开|click).*(?:selector|选择器|#[-\w]+|\.[-\w]+|\[[^\]\n]{1,80}\]|按钮|链接|元素)/iu
const localAutomationBrowserClickTargetPattern = /(?:点击|点一下|点开|click)\s*(?:当前网页|当前页面|这个网页|这个页面|网页|页面|浏览器)?(?:上|里|中的?)?的?([^按钮链接选项元素\n]{1,80})(?:按钮|链接|选项|元素)/iu
const localAutomationBrowserNavigatePattern = /返回(?:(?:当前|这个)?(?:网页|页面))?到?上一页|后退|前进|刷新(?:一下)?(?:当前|这个)?(?:页面|网页)?|重新加载(?:当前|这个)?(?:页面|网页)?|reload|refresh|go\s+back|go\s+forward/iu
const localAutomationBrowserScrollPattern = /(?:向上|向下|往上|往下|朝上|朝下).*(?:滚动|滚一下|翻一下|翻页|翻看|滑动).*|(?:当前网页|当前页面|这个网页|这个页面|网页|页面|浏览器).*(?:向上|向下|往上|往下).*(?:滚动|滚一下|翻一下|翻页|滑动)|scroll\s+(?:up|down)|page\s+(?:up|down)/iu
const localAutomationDesktopWaitPattern = /(?:等待|等一下|等会|wait).*(?:软件|应用|app(?:lication)?|程序|窗口|前台|就绪|ready|打开|启动|出现|显示)/iu
const localAutomationDesktopListPattern = /(?:看一下|看下|看看|列出|列一下|显示|show|list).*(?:当前窗口|现在窗口|这个窗口|前台窗口|当前应用|这个应用|当前软件|这个软件|当前界面|这个界面).*(?:按钮|链接|元素|控件|输入框|搜索框|文本框|可点击)|(?:当前窗口|现在窗口|这个窗口|前台窗口|当前应用|这个应用|当前软件|这个软件|当前界面|这个界面).*(?:有哪些|有什么|list|show).*(?:按钮|链接|元素|控件|输入框|搜索框|文本框|可点击)/iu
const localAutomationDesktopClickPattern = /(?:点击|点一下|点开|click).*(?:当前窗口|现在窗口|这个窗口|前台窗口|当前应用|这个应用|当前软件|这个软件|当前界面|这个界面|桌面).*(?:按钮|链接|选项|元素|输入框|搜索框|文本框)/iu
const localAutomationDesktopTypePattern = /(?:在|向)?(?:当前窗口|现在窗口|这个窗口|前台窗口|当前应用|这个应用|当前软件|这个软件|当前界面|这个界面).*(?:输入|键入|填写|type|fill|paste)|(?:输入|键入|填写|type|fill|paste).*(?:当前窗口|现在窗口|这个窗口|前台窗口|当前应用|这个应用|当前软件|这个软件|当前界面|这个界面)/iu
const localAutomationDesktopShortcutPattern = /(?:按下|按|press|hit|trigger).*(?:command|cmd|control|ctrl|option|alt|shift|[⌘⌥⌃左右上下]|快捷键|shortcut|回车|enter|tab|esc(?:ape)?|left|right|up|down)/iu
const localAutomationDesktopInspectPattern = /(?:看一下|看下|看看|检查|瞧瞧|观察|inspect|check|look(?:\s+at)?).*(?:当前屏幕|现在屏幕|屏幕上|当前窗口|现在窗口|这个窗口|桌面|界面|画面|screen|desktop|window|scene)|(?:当前屏幕|现在屏幕|屏幕上|当前窗口|现在窗口|这个窗口|桌面|界面|画面).*(?:是什么|在干什么|怎么了|情况|内容|状态|what(?:'s|\s+is)?\s+on|what\s+happening)/iu
const localAutomationDesktopNextStepPattern = /下一步.*(?:点什么|点哪里|做什么)|该.*(?:点什么|点哪里|做什么)|帮我判断.*下一步|what should .*click|what(?:'s|\s+is)\s+next|next step/iu
const localAutomationDesktopUploadPattern = /上传(?:流程)?|选择文件|文件选择|file picker|choose file|select file|upload/iu
const localAutomationDesktopOpenPattern = /(?:打开|启动|运行|\blaunch\b|\bopen\b)(?:一下)?\s*(?:软件|应用|app(?:lication)?|程序)?\s*([^\s，。！？,.;:]+(?:\s+[^\s，。！？,.;:]+){0,2})?/iu
const localAutomationBrowserNamePattern = /\b(?:chrome|google chrome|safari)\b|谷歌浏览器|浏览器/u
const localAutomationSoftwareStopwordPattern = /^(?:浏览器|browser|网页|页面|网址|网站|链接|当前|这个|那个|这里)$/iu
const localAutomationSelectorPattern = /(?:selector|选择器)\s*(?:[:：]\s*)?[`'"]?([^`'"\s]+)[`'"]?|([#.][-\w]+|\[[^\]]+\])/iu
const localAutomationCapabilityLikeQuestionPattern = /(?:^|[\s，。])你(?:能|会|可以)[^。!?？]*[?？吗]/u
const explicitLocalVisualOpenClawBypassPattern = /(?:不要|别|不用|不走|绕过|跳过).{0,16}open[\s-]?claw|without\s+open[\s-]?claw|not\s+(?:use|through)\s+open[\s-]?claw/iu
const explicitLocalVisualExecutorPattern = /(?:本地|local).{0,12}(?:gui|visual|视觉|图形界面)|(?:gui|visual|视觉|图形界面).{0,12}(?:本地|local)|(?:本地|local).{0,12}(?:多步|multi[\s-]?step).{0,12}(?:执行|操作|executor|thread)|(?:多步|multi[\s-]?step).{0,12}(?:本地|local).{0,12}(?:gui|visual|视觉|图形界面)|(?:本地|local).{0,12}(?:执行器|executor)/iu
const explicitLocalVisualBrowserCuePattern = /\b(?:browser|page|site|tab|url)\b|浏览器|网页|页面|网址|标签页/u
const explicitLocalVisualDesktopCuePattern = /\b(?:desktop|screen|scene|window|dialog|popup)\b|桌面|屏幕|界面|窗口|弹窗/u
const explicitLocalVisualSoftwareCuePattern = /\b(?:software|app(?:lication)?)\b|软件|应用/u
const alicizationKnownWebsiteCatalog = [
  {
    site: 'weibo',
    label: '微博',
    url: 'https://weibo.com',
    aliases: ['微博', 'weibo', '新浪微博'],
  },
  {
    site: 'baidu',
    label: '百度',
    url: 'https://www.baidu.com',
    aliases: ['百度', 'baidu'],
  },
  {
    site: 'google',
    label: 'Google',
    url: 'https://www.google.com',
    aliases: ['谷歌', 'google'],
  },
  {
    site: 'github',
    label: 'GitHub',
    url: 'https://github.com',
    aliases: ['github', 'git hub', 'git-hub'],
  },
  {
    site: 'bilibili',
    label: 'Bilibili',
    url: 'https://www.bilibili.com',
    aliases: ['b站', '哔哩哔哩', 'bilibili', 'bili'],
  },
  {
    site: 'zhihu',
    label: '知乎',
    url: 'https://www.zhihu.com',
    aliases: ['知乎', 'zhihu'],
  },
] as const

function normalizeExecutionIntentText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim()
}

function sanitizeText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/gu, ' ').slice(0, maxChars)
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(3))))
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

function normalizeKnownWebsiteToken(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, ' ')
}

function normalizeKnownWebsiteCandidate(raw: string) {
  let candidate = normalizeKnownWebsiteToken(raw)
    .replace(/^[“”"'`【】「」()[\]（）]+/gu, '')
    .replace(/[“”"'`【】「」()[\]（）]+$/gu, '')

  const leadingPatterns = [
    /^(?:请你|请|麻烦|帮我|帮忙|拜托)/u,
    /^(?:打开|启动|访问|前往|进入|open|launch|visit|go\s+to)/iu,
    /^(?:浏览器|browser)/iu,
    /^(?:去|到)/u,
  ]
  const trailingPatterns = [
    /(?:官网首页|官网|网站首页|网站|站点|首页|主页|网页|网页版|网页端)$/u,
  ]

  let changed = true
  while (changed) {
    changed = false
    for (const pattern of leadingPatterns) {
      if (!pattern.test(candidate))
        continue
      candidate = candidate.replace(pattern, '').trim()
      changed = true
    }
    for (const pattern of trailingPatterns) {
      if (!pattern.test(candidate))
        continue
      candidate = candidate.replace(pattern, '').trim()
      changed = true
    }
  }

  return candidate
}

export function resolveAlicizationKnownWebsiteBySite(rawSite: string): AlicizationKnownWebsiteResolution | null {
  const normalizedSite = normalizeKnownWebsiteCandidate(rawSite)
  if (!normalizedSite)
    return null

  const matched = alicizationKnownWebsiteCatalog.find((entry) => {
    return entry.site === normalizedSite
      || entry.aliases.some(alias => normalizeKnownWebsiteToken(alias) === normalizedSite)
  })
  if (!matched)
    return null

  const matchedAlias = matched.aliases.find(alias => normalizeKnownWebsiteToken(alias) === normalizedSite)
    ?? matched.site

  return {
    site: matched.site,
    url: matched.url,
    label: matched.label,
    matchedAlias,
  }
}

export function resolveAlicizationKnownWebsiteInText(rawText: string): AlicizationKnownWebsiteResolution | null {
  const exactMatch = resolveAlicizationKnownWebsiteBySite(rawText)
  if (exactMatch)
    return exactMatch

  const normalizedText = normalizeKnownWebsiteToken(rawText)
  if (!normalizedText)
    return null

  let bestMatch: AlicizationKnownWebsiteResolution | null = null
  let bestAliasLength = 0

  for (const entry of alicizationKnownWebsiteCatalog) {
    const candidates = [entry.site, ...entry.aliases]
    for (const candidate of candidates) {
      const normalizedCandidate = normalizeKnownWebsiteToken(candidate)
      if (!normalizedCandidate || !normalizedText.includes(normalizedCandidate))
        continue
      if (normalizedCandidate.length <= bestAliasLength)
        continue
      bestAliasLength = normalizedCandidate.length
      bestMatch = {
        site: entry.site,
        url: entry.url,
        label: entry.label,
        matchedAlias: candidate,
      }
    }
  }

  return bestMatch
}

function normalizeMaybeUrl(raw: string) {
  const normalized = raw.trim().replace(/[).,!?！？，。]+$/u, '')
  if (!normalized)
    return ''
  return /^www\./iu.test(normalized)
    ? `https://${normalized}`
    : normalized
}

function extractLocalAutomationUrl(normalized: string) {
  const matched = normalized.match(localAutomationUrlPattern)?.[0] ?? ''
  return normalizeMaybeUrl(matched)
}

function extractLocalAutomationSelector(normalized: string) {
  const matched = normalized.match(localAutomationSelectorPattern)
  return matched?.[1] ?? matched?.[2] ?? ''
}

function extractLocalAutomationClickTarget(normalized: string) {
  const matched = normalized.match(localAutomationBrowserClickTargetPattern)?.[1] ?? ''
  return matched.trim().replace(/[“”"'`【】「」()[\]]/gu, '')
}

function extractLocalAutomationApplicationCandidate(normalized: string) {
  const matched = normalized.match(localAutomationDesktopOpenPattern)
  const candidate = typeof matched?.[1] === 'string'
    ? matched[1].trim().replace(/[，。！？,.;:]+$/u, '')
    : ''
  if (!candidate)
    return ''
  if (localAutomationUrlPattern.test(candidate))
    return ''
  if (localAutomationSoftwareStopwordPattern.test(candidate))
    return ''
  return candidate
}

function extractLocalAutomationWaitApplicationCandidate(normalized: string) {
  const candidate = sanitizeText(
    normalized
      .replace(/^(?:请你|请|麻烦|帮我|帮忙|拜托)/u, '')
      .replace(/^(?:等待|等一下|等会|wait)(?:一下)?/iu, '')
      .replace(/^(?:软件|应用|app(?:lication)?|程序)\s*/iu, '')
      .replace(/(?:打开|启动|出现|显示|到前台|切到前台|前台|就绪|ready|完成|稳定).*$/iu, '')
      .replace(/[，。！？,.;:]+$/u, ''),
  )
  if (!candidate)
    return ''
  if (localAutomationUrlPattern.test(candidate))
    return ''
  if (localAutomationSoftwareStopwordPattern.test(candidate))
    return ''
  if (/^(?:当前|这个|那个|这里|网页|页面|浏览器)$/u.test(candidate))
    return ''
  return candidate
}

function inferLocalAutomationBrowserPreference(normalized: string) {
  if (/safari/iu.test(normalized))
    return 'safari' as const
  if (/chrome|谷歌浏览器|google chrome/iu.test(normalized))
    return 'chrome' as const
  return 'default' as const
}

function inferLocalAutomationSearchEngine(normalized: string) {
  if (/百度/u.test(normalized))
    return 'baidu' as const
  if (/\bbing\b/iu.test(normalized))
    return 'bing' as const
  if (/duckduckgo|duck\s+duck\s+go/iu.test(normalized))
    return 'duckduckgo' as const
  return 'google' as const
}

function hasLocalAutomationBrowserWorkflowContinuationIntent(normalized: string) {
  return localAutomationBrowserContinuationPattern.test(normalized)
}

function hasLocalAutomationDesktopWorkflowContinuationIntent(normalized: string) {
  return localAutomationBrowserContinuationPattern.test(normalized)
}

function hasLocalAutomationBrowserNextStepIntent(normalized: string) {
  const hasBrowserSurface
    = /当前网页|当前页面|这个网页|这个页面|网页|页面|浏览器|current\s+(?:page|browser)|page|browser/iu.test(normalized)
  const hasNextStepCue
    = /下一步|该|点什么|点哪里|做什么|what should|next step/iu.test(normalized)
  const hasJudgementCue = /帮我判断|判断一下|看看|看下|查看/iu.test(normalized)

  return (hasBrowserSurface && hasNextStepCue)
    || (hasJudgementCue && hasBrowserSurface && hasNextStepCue)
    || (/what should/iu.test(normalized) && /click/iu.test(normalized) && hasBrowserSurface)
}

function hasLocalAutomationBrowserTypeIntent(normalized: string) {
  const hasBrowserSurface = /当前网页|当前页面|这个网页|这个页面|网页|页面/iu.test(normalized)
  const hasTypingCue = /输入|键入|填写|type|fill|paste/iu.test(normalized)
  const hasFieldCue = /搜索框|输入框|文本框|邮箱输入框|表单/iu.test(normalized)

  return (hasBrowserSurface && hasTypingCue)
    || (hasTypingCue && hasBrowserSurface)
    || (hasFieldCue && hasTypingCue)
}

function hasLocalAutomationBrowserWaitIntent(normalized: string) {
  const hasWaitCue = /等待|等一下|等会|wait/iu.test(normalized)
  const hasBrowserSurface = /当前网页|当前页面|这个网页|这个页面|网页|页面|浏览器/iu.test(normalized)
  const hasReadyCue = /加载完成|加载好|加载完|ready|complete|就绪|出现|显示/iu.test(normalized)

  return hasWaitCue && hasBrowserSurface && hasReadyCue
}

function stripLocalAutomationBrowserWorkflowContinuationTail(normalized: string) {
  return sanitizeText(
    normalized
      .replace(/(?:然后|并且|并|再)?(?:继续|接着|接下来|续上|接上).*$/u, '')
      .replace(/(?:then\s+)?(?:continue|resume|carry\s+on|keep\s+going).*$/iu, '')
      .trim(),
    220,
  )
}

function inferLocalAutomationBrowserWorkflowContinuationOverrides(input: {
  normalized: string
  expectedPhase?: 'search-results' | 'social-feed'
}) {
  if (!hasLocalAutomationBrowserWorkflowContinuationIntent(input.normalized))
    return {}

  return {
    expectedPhase: input.expectedPhase,
    reinspectAfterAction: true,
    autoContinueSuggestedActions: true,
    maxAutoContinueSteps: 2,
    inspectionQuestion: sanitizeText(input.normalized, 220) || undefined,
  } satisfies Record<string, unknown>
}

function buildLocalAutomationBrowserOpenToolInput(input: {
  normalized: string
  knownWebsite: AlicizationKnownWebsiteResolution | null
  url: string
}) {
  return {
    browser: inferLocalAutomationBrowserPreference(input.normalized),
    site: input.knownWebsite?.site,
    url: input.url || input.knownWebsite?.url || 'about:blank',
    ...inferLocalAutomationBrowserWorkflowContinuationOverrides({
      normalized: input.normalized,
      expectedPhase: input.knownWebsite?.site === 'weibo' ? 'social-feed' : undefined,
    }),
  } satisfies Record<string, unknown>
}

function buildLocalAutomationBrowserSearchToolInput(normalized: string) {
  const query = sanitizeText(
    stripLocalAutomationBrowserWorkflowContinuationTail(normalized)
      .replace(/^(?:请你|请|麻烦|帮我|帮忙|拜托)/u, '')
      .replace(/百度一下|百度|谷歌一下|谷歌|google|bing|duckduckgo|duck\s+duck\s+go|web\s+search|搜索一下|搜索|搜一下|搜一搜|搜个|搜|查一下网页|查一下网上|上网搜/iu, '')
      .replace(/^(?:在|用)?(?:浏览器|browser)?/iu, '')
      .trim(),
    220,
  ) || sanitizeText(normalized, 220) || 'current topic'

  return {
    browser: inferLocalAutomationBrowserPreference(normalized),
    searchEngine: inferLocalAutomationSearchEngine(normalized),
    query,
    ...inferLocalAutomationBrowserWorkflowContinuationOverrides({
      normalized,
      expectedPhase: 'search-results',
    }),
  } satisfies Record<string, unknown>
}

function buildLocalAutomationBrowserReadToolInput(input: {
  normalized: string
  knownWebsite: AlicizationKnownWebsiteResolution | null
}) {
  const continuationIntent = hasLocalAutomationBrowserWorkflowContinuationIntent(input.normalized)
  const interactableIntent = /按钮|链接|元素|可点击|交互|输入框|表单|下一步|该点哪里|该点什么|点哪里|点什么|what should .*click|next step/iu.test(input.normalized)
    || Boolean(input.knownWebsite && continuationIntent)
  return {
    browser: inferLocalAutomationBrowserPreference(input.normalized),
    format: /\bhtml\b|源码/u.test(input.normalized)
      ? 'html'
      : interactableIntent
        ? 'interactables'
        : 'text',
  } satisfies Record<string, unknown>
}

function buildLocalAutomationDesktopInspectToolInput(normalized: string) {
  const nextStepIntent = localAutomationDesktopNextStepPattern.test(normalized)
  const continuationIntent = hasLocalAutomationDesktopWorkflowContinuationIntent(normalized)
  const uploadIntent = localAutomationDesktopUploadPattern.test(normalized)

  if (!nextStepIntent && (!continuationIntent || !uploadIntent))
    return undefined

  const forceRefresh = /重新|再看|重看|看清|看准|自己看|别猜|不要猜|again|recheck|look again|check again|inspect again/iu.test(normalized)

  return {
    question: sanitizeText(normalized, 220) || undefined,
    forceRefresh,
    maxSuggestedActions: nextStepIntent || uploadIntent ? 5 : 3,
    ...(continuationIntent
      ? {
          autoContinueSuggestedActions: true,
          maxAutoContinueSteps: 2,
        }
      : {}),
  } satisfies Record<string, unknown>
}

function buildLocalAutomationToolInputOverrides(input: {
  normalized: string
  requiredToolName: AlicizationExecutorToolName
  knownWebsite: AlicizationKnownWebsiteResolution | null
  url: string
}) {
  const continuationIntent = hasLocalAutomationBrowserWorkflowContinuationIntent(input.normalized)

  if (input.requiredToolName === 'browser_open_url') {
    if (!continuationIntent)
      return undefined
    return {
      browser_open_url: buildLocalAutomationBrowserOpenToolInput({
        normalized: input.normalized,
        knownWebsite: input.knownWebsite,
        url: input.url,
      }),
    } satisfies AlicizationExecutionToolInputOverrides
  }

  if (input.requiredToolName === 'browser_search_web') {
    if (!continuationIntent)
      return undefined
    return {
      browser_search_web: buildLocalAutomationBrowserSearchToolInput(input.normalized),
    } satisfies AlicizationExecutionToolInputOverrides
  }

  if (input.requiredToolName === 'browser_read_page') {
    const toolInput = buildLocalAutomationBrowserReadToolInput({
      normalized: input.normalized,
      knownWebsite: input.knownWebsite,
    })
    if (toolInput.format === 'text' && toolInput.browser === 'default')
      return undefined
    return {
      browser_read_page: toolInput,
    } satisfies AlicizationExecutionToolInputOverrides
  }

  if (input.requiredToolName === 'desktop_inspect_scene') {
    const toolInput = buildLocalAutomationDesktopInspectToolInput(input.normalized)
    if (!toolInput)
      return undefined
    return {
      desktop_inspect_scene: toolInput,
    } satisfies AlicizationExecutionToolInputOverrides
  }

  return undefined
}

function resolveLocalAutomationRoutingIntent(normalized: string) {
  if (localAutomationCapabilityLikeQuestionPattern.test(normalized) && !executionRequestFramePattern.test(normalized))
    return null

  const url = extractLocalAutomationUrl(normalized)
  const selector = extractLocalAutomationSelector(normalized)
  const clickTarget = extractLocalAutomationClickTarget(normalized)
  const applicationCandidate = extractLocalAutomationApplicationCandidate(normalized)
  const waitApplicationCandidate = extractLocalAutomationWaitApplicationCandidate(normalized)
  const knownWebsite = resolveAlicizationKnownWebsiteInText(applicationCandidate || normalized)
  const navigationIntent = localAutomationNavigationIntentPattern.test(normalized)
  const browserOpenIntent = localAutomationBrowserOpenPattern.test(normalized)
  const browserSearchIntent = localAutomationBrowserSearchPattern.test(normalized)
  const browserWorkflowContinuationIntent = hasLocalAutomationBrowserWorkflowContinuationIntent(normalized)
  const browserReadIntent = localAutomationBrowserReadPattern.test(normalized)
    || hasLocalAutomationBrowserNextStepIntent(normalized)
    || Boolean(knownWebsite && localAutomationDesktopNextStepPattern.test(normalized))
    || Boolean(
      knownWebsite
      && browserWorkflowContinuationIntent
      && !browserSearchIntent
      && !navigationIntent,
    )
  const browserClickIntent = localAutomationBrowserClickPattern.test(normalized)
  const browserTypeIntent = hasLocalAutomationBrowserTypeIntent(normalized)
  const browserNavigateIntent = localAutomationBrowserNavigatePattern.test(normalized)
  const browserScrollIntent = localAutomationBrowserScrollPattern.test(normalized)
  const browserWaitIntent = hasLocalAutomationBrowserWaitIntent(normalized)
  const desktopWaitIntent = localAutomationDesktopWaitPattern.test(normalized)
  const desktopListIntent = localAutomationDesktopListPattern.test(normalized)
  const desktopClickIntent = localAutomationDesktopClickPattern.test(normalized)
  const desktopTypeIntent = localAutomationDesktopTypePattern.test(normalized)
  const desktopShortcutIntent = localAutomationDesktopShortcutPattern.test(normalized)
  const desktopContinuationIntent = hasLocalAutomationDesktopWorkflowContinuationIntent(normalized)
    && localAutomationDesktopUploadPattern.test(normalized)
  const desktopInspectIntent = localAutomationDesktopInspectPattern.test(normalized)
    || localAutomationDesktopNextStepPattern.test(normalized)
    || desktopContinuationIntent

  if (url && (browserOpenIntent || localAutomationBrowserNamePattern.test(normalized))) {
    return {
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_open_url'],
      reasonCodes: ['local-browser-open-url', 'action-verb'],
      toolInputOverrides: buildLocalAutomationToolInputOverrides({
        normalized,
        requiredToolName: 'browser_open_url',
        knownWebsite: null,
        url,
      }),
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (browserReadIntent) {
    return {
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_read_page'],
      reasonCodes: ['local-browser-read-page', 'action-verb'],
      toolInputOverrides: buildLocalAutomationToolInputOverrides({
        normalized,
        requiredToolName: 'browser_read_page',
        knownWebsite,
        url,
      }),
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (browserTypeIntent) {
    return {
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_type_text'],
      reasonCodes: ['local-browser-type-text', 'action-verb'],
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (browserNavigateIntent) {
    return {
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_navigate'],
      reasonCodes: ['local-browser-navigate', 'action-verb'],
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (browserScrollIntent) {
    return {
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_scroll'],
      reasonCodes: ['local-browser-scroll', 'action-verb'],
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (browserWaitIntent) {
    return {
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_wait'],
      reasonCodes: ['local-browser-wait', 'action-verb'],
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (desktopWaitIntent && waitApplicationCandidate) {
    return {
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_wait'],
      reasonCodes: ['local-desktop-wait', 'action-verb'],
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (desktopListIntent) {
    return {
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_list_interactables'],
      reasonCodes: ['local-desktop-list-interactables', 'action-verb'],
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (desktopClickIntent) {
    return {
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_click_element'],
      reasonCodes: ['local-desktop-click-element', 'action-verb'],
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (desktopTypeIntent) {
    return {
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_type_text'],
      reasonCodes: ['local-desktop-type-text', 'action-verb'],
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (desktopShortcutIntent) {
    return {
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_press_keys'],
      reasonCodes: ['local-desktop-press-keys', 'action-verb'],
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (browserClickIntent && (selector || clickTarget || executionBrowserArtifactPattern.test(normalized))) {
    return {
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_click_element'],
      reasonCodes: ['local-browser-click-element', 'action-verb'],
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (browserSearchIntent) {
    return {
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_search_web'],
      reasonCodes: ['local-browser-search-web', 'action-verb'],
      toolInputOverrides: buildLocalAutomationToolInputOverrides({
        normalized,
        requiredToolName: 'browser_search_web',
        knownWebsite,
        url,
      }),
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (knownWebsite && navigationIntent) {
    return {
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_open_url'],
      reasonCodes: ['local-browser-open-known-site', 'action-verb'],
      toolInputOverrides: buildLocalAutomationToolInputOverrides({
        normalized,
        requiredToolName: 'browser_open_url',
        knownWebsite,
        url,
      }),
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (browserOpenIntent) {
    return {
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_open_url'],
      reasonCodes: ['local-browser-open-url', 'action-verb'],
      toolInputOverrides: buildLocalAutomationToolInputOverrides({
        normalized,
        requiredToolName: 'browser_open_url',
        knownWebsite,
        url,
      }),
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (desktopInspectIntent) {
    return {
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_inspect_scene'],
      reasonCodes: ['local-desktop-inspect-scene', 'action-verb'],
      toolInputOverrides: buildLocalAutomationToolInputOverrides({
        normalized,
        requiredToolName: 'desktop_inspect_scene',
        knownWebsite,
        url,
      }),
    } satisfies AlicizationExecutionRoutingIntent
  }

  if (applicationCandidate) {
    return {
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_open_application'],
      reasonCodes: ['local-desktop-open-application', 'action-verb'],
    } satisfies AlicizationExecutionRoutingIntent
  }

  return null
}

function resolveExplicitLocalVisualExecutorRoutingIntent(normalized: string): AlicizationExecutionRoutingIntent | null {
  const bypassesOpenClaw = explicitLocalVisualOpenClawBypassPattern.test(normalized)
  const namesLocalVisualExecutor = explicitLocalVisualExecutorPattern.test(normalized)

  if (!bypassesOpenClaw && !namesLocalVisualExecutor)
    return null

  const requestedChannel: AlicizationExecutionRoutingChannel = explicitLocalVisualBrowserCuePattern.test(normalized)
    ? 'browser'
    : explicitLocalVisualDesktopCuePattern.test(normalized)
      ? 'desktop'
      : explicitLocalVisualSoftwareCuePattern.test(normalized)
        ? 'software'
        : executionBrowserArtifactPattern.test(normalized)
          ? 'browser'
          : executionSoftwareArtifactPattern.test(normalized)
            ? 'desktop'
            : 'desktop'

  return {
    requestedChannels: [requestedChannel],
    requiredToolNames: ['executor_run_local_visual'],
    reasonCodes: ['local-visual-explicit'],
  }
}

function collectChannelMentionsFromNormalizedText(normalized: string) {
  const channels: AlicizationExecutionCapabilityChannel[] = []
  for (const channel of alicizationExecutionCapabilityChannels) {
    if (executionCapabilityAliasPatterns[channel].some(pattern => pattern.test(normalized)))
      channels.push(channel)
  }
  return channels
}

export function collectAlicizationExecutionChannelMentions(message: string) {
  const normalized = normalizeExecutionIntentText(message)
  if (!normalized)
    return [] as AlicizationExecutionCapabilityChannel[]
  return collectChannelMentionsFromNormalizedText(normalized)
}

export function analyzeAlicizationExecutionSemanticSignals(message: string): AlicizationExecutionSemanticSignals {
  const normalized = normalizeExecutionIntentText(message)
  if (!normalized) {
    return {
      normalizedText: '',
      mentionedChannels: [],
      mentionedDispatchChannels: [],
      hasCapabilityQuestion: false,
      hasQuestionMarker: false,
      hasRequestFrame: false,
      hasCommandLiteral: false,
      hasCommandToken: false,
      hasShellLikeStructure: false,
      hasFilesystemPathReference: false,
      hasToolReference: false,
      hasCodeArtifact: false,
      hasBrowserArtifact: false,
      hasSoftwareArtifact: false,
      hasExecutionSignal: false,
      executionSignalScore: 0,
    }
  }

  const mentionedChannels = collectChannelMentionsFromNormalizedText(normalized)
  const mentionedDispatchChannels = mentionedChannels
    .filter((channel): channel is AlicizationExecutionDispatchChannel =>
      channel === 'cli' || channel === 'codex' || channel === 'claude-code' || channel === 'openclaw')
  const hasQuestionMarker = executionQuestionMarkerPattern.test(normalized)
  const hasRequestFrame = executionRequestFramePattern.test(normalized)
  const hasCommandLiteral = executionCommandLiteralPattern.test(normalized)
  const hasCommandToken = executionCommandTokenPattern.test(normalized)
  const hasShellLikeStructure = executionShellPromptPattern.test(normalized) || executionShellOperatorPattern.test(normalized)
  const hasFilesystemPathReference = executionFilesystemPathPattern.test(normalized)
  const hasToolReference = executionToolReferencePattern.test(normalized)
  const hasCodeArtifact = executionCodeArtifactPattern.test(normalized) || hasCommandLiteral || hasFilesystemPathReference
  const hasBrowserArtifact = executionBrowserArtifactPattern.test(normalized)
  const hasSoftwareArtifact = executionSoftwareArtifactPattern.test(normalized)
  const hasCapabilityQuestion = mentionedChannels.length > 0
    && hasQuestionMarker
    && executionCapabilityQuestionPattern.test(normalized)

  let executionSignalScore = 0
  if (mentionedDispatchChannels.length > 0)
    executionSignalScore += 0.45
  if (hasCommandLiteral)
    executionSignalScore += 0.32
  if (hasCommandToken)
    executionSignalScore += 0.3
  if (hasShellLikeStructure)
    executionSignalScore += 0.22
  if (hasFilesystemPathReference)
    executionSignalScore += 0.12
  if (hasToolReference)
    executionSignalScore += 0.18
  if (hasRequestFrame)
    executionSignalScore += 0.2
  if (
    mentionedDispatchChannels.length > 0
    && !hasRequestFrame
    && !hasCommandLiteral
    && !hasCommandToken
    && !hasShellLikeStructure
    && !hasFilesystemPathReference
    && !hasToolReference
  ) {
    executionSignalScore -= 0.2
  }
  if (hasQuestionMarker && !hasRequestFrame)
    executionSignalScore -= 0.08
  if (hasCapabilityQuestion)
    executionSignalScore -= 0.65

  const clampedScore = clamp01(executionSignalScore)
  const hasImplicitBareCommandSignal = mentionedDispatchChannels.length === 0
    && !hasRequestFrame
    && !hasToolReference
    && (hasCommandLiteral || hasCommandToken || hasShellLikeStructure)
  const hasExecutionSignal = (
    clampedScore >= 0.45
    || (
      mentionedDispatchChannels.length > 0
      && hasRequestFrame
      && !hasCapabilityQuestion
    )
  ) && !hasImplicitBareCommandSignal

  return {
    normalizedText: normalized,
    mentionedChannels,
    mentionedDispatchChannels,
    hasCapabilityQuestion,
    hasQuestionMarker,
    hasRequestFrame,
    hasCommandLiteral,
    hasCommandToken,
    hasShellLikeStructure,
    hasFilesystemPathReference,
    hasToolReference,
    hasCodeArtifact,
    hasBrowserArtifact,
    hasSoftwareArtifact,
    hasExecutionSignal,
    executionSignalScore: clampedScore,
  }
}

export function hasExplicitAlicizationExecutionDemand(semanticSignals: AlicizationExecutionSemanticSignals) {
  if (!semanticSignals.hasExecutionSignal || semanticSignals.hasCapabilityQuestion)
    return false

  return semanticSignals.hasRequestFrame
    || semanticSignals.mentionedDispatchChannels.length > 0
    || semanticSignals.hasCommandLiteral
    || semanticSignals.hasCommandToken
    || semanticSignals.hasShellLikeStructure
    || semanticSignals.hasFilesystemPathReference
    || semanticSignals.hasToolReference
}

export function analyzeAlicizationExecutionTurnAuthority(message: string): AlicizationExecutionTurnAuthority {
  const semanticSignals = analyzeAlicizationExecutionSemanticSignals(message)
  const explicitExecutionDemand = hasExplicitAlicizationExecutionDemand(semanticSignals)
  const fallbackImperative = !explicitExecutionDemand
    && !semanticSignals.hasExecutionSignal
    && !semanticSignals.hasCapabilityQuestion
    && !semanticSignals.hasQuestionMarker
    && executionFallbackImperativePattern.test(message)
  const executionBound = explicitExecutionDemand || fallbackImperative

  return {
    semanticSignals,
    explicitExecutionDemand,
    fallbackImperative,
    executionBound,
    reasonCodes: unique([
      executionBound ? 'execution-bound-turn' : '',
      explicitExecutionDemand ? 'explicit-execution-demand' : '',
      fallbackImperative ? 'fallback-imperative-request' : '',
      semanticSignals.hasExecutionSignal ? 'semantic-execution-signal' : '',
      semanticSignals.hasRequestFrame ? 'request-frame' : '',
      semanticSignals.hasCommandLiteral ? 'command-literal' : '',
      semanticSignals.hasCommandToken ? 'command-token' : '',
      semanticSignals.hasShellLikeStructure ? 'shell-structure' : '',
      semanticSignals.hasFilesystemPathReference ? 'filesystem-reference' : '',
      semanticSignals.hasToolReference ? 'tool-reference' : '',
      ...semanticSignals.mentionedDispatchChannels.map(channel => `mentioned-dispatch:${channel}`),
    ]),
  }
}

export function detectAlicizationExecutionCapabilityInquiry(message: string): AlicizationExecutionCapabilityInquiry {
  const semanticSignals = analyzeAlicizationExecutionSemanticSignals(message)
  const hasActionVerb = semanticSignals.hasExecutionSignal
  const hasCommandLiteral = semanticSignals.hasCommandLiteral
  const capabilityQuestion = semanticSignals.hasCapabilityQuestion

  return {
    active: capabilityQuestion,
    capabilityQuestion,
    mentionedChannels: semanticSignals.mentionedChannels,
    hasActionVerb,
    hasCommandLiteral,
  }
}

export function detectAlicizationExecutionRoutingIntent(input: {
  message: string
  capabilityInquiry?: AlicizationExecutionCapabilityInquiry
}): AlicizationExecutionRoutingIntent | null {
  const executionTurnAuthority = analyzeAlicizationExecutionTurnAuthority(input.message)
  const semanticSignals = executionTurnAuthority.semanticSignals
  if (!semanticSignals.normalizedText)
    return null

  const capabilityInquiry = input.capabilityInquiry ?? detectAlicizationExecutionCapabilityInquiry(input.message)
  if (capabilityInquiry.capabilityQuestion)
    return null

  const explicitLocalVisualRoutingIntent = resolveExplicitLocalVisualExecutorRoutingIntent(semanticSignals.normalizedText)
  if (explicitLocalVisualRoutingIntent) {
    return {
      requestedChannels: explicitLocalVisualRoutingIntent.requestedChannels,
      requiredToolNames: explicitLocalVisualRoutingIntent.requiredToolNames,
      reasonCodes: unique([
        ...executionTurnAuthority.reasonCodes.filter(Boolean),
        semanticSignals.mentionedDispatchChannels.length > 0 ? 'channel-mentioned' : '',
        semanticSignals.hasRequestFrame ? 'request-frame' : '',
        semanticSignals.hasExecutionSignal || executionTurnAuthority.fallbackImperative ? 'action-verb' : '',
        ...explicitLocalVisualRoutingIntent.reasonCodes,
      ].filter(Boolean)),
    }
  }

  const localAutomationRoutingIntent = semanticSignals.mentionedDispatchChannels.length === 0
    ? resolveLocalAutomationRoutingIntent(semanticSignals.normalizedText)
    : null
  if (localAutomationRoutingIntent) {
    return {
      requestedChannels: localAutomationRoutingIntent.requestedChannels,
      requiredToolNames: localAutomationRoutingIntent.requiredToolNames,
      reasonCodes: unique([
        ...executionTurnAuthority.reasonCodes,
        ...localAutomationRoutingIntent.reasonCodes,
      ]),
      ...(localAutomationRoutingIntent.toolInputOverrides
        ? { toolInputOverrides: localAutomationRoutingIntent.toolInputOverrides }
        : {}),
    }
  }

  if (!executionTurnAuthority.executionBound)
    return null

  const mentionedChannels = semanticSignals.mentionedDispatchChannels

  const reasonCodes: string[] = [...executionTurnAuthority.reasonCodes]
  if (mentionedChannels.length > 0)
    reasonCodes.push('channel-mentioned')
  if (semanticSignals.hasCommandLiteral)
    reasonCodes.push('command-literal')
  if (semanticSignals.hasCommandToken)
    reasonCodes.push('command-token')
  if (semanticSignals.hasShellLikeStructure)
    reasonCodes.push('shell-structure')
  if (semanticSignals.hasFilesystemPathReference)
    reasonCodes.push('filesystem-reference')
  if (semanticSignals.hasToolReference)
    reasonCodes.push('tool-reference')
  if (semanticSignals.hasRequestFrame)
    reasonCodes.push('request-frame')
  if (semanticSignals.hasExecutionSignal)
    reasonCodes.push('semantic-execution-signal')
  if (semanticSignals.hasExecutionSignal || executionTurnAuthority.fallbackImperative)
    reasonCodes.push('action-verb')

  const requestedChannels: AlicizationExecutionDispatchChannel[] = mentionedChannels.length > 0
    ? mentionedChannels
    : (semanticSignals.hasCommandLiteral || semanticSignals.hasCommandToken || semanticSignals.hasShellLikeStructure || semanticSignals.hasToolReference)
        ? ['cli']
        : []

  if (requestedChannels.length === 0)
    return null
  if (mentionedChannels.length === 0 && (semanticSignals.hasCommandLiteral || semanticSignals.hasCommandToken || semanticSignals.hasShellLikeStructure || semanticSignals.hasToolReference))
    reasonCodes.push('default-cli-from-command-structure')

  return {
    requestedChannels: unique(requestedChannels),
    requiredToolNames: unique(
      requestedChannels
        .map(channel => executionRoutingToolMap[channel])
        .filter((name): name is AlicizationExecutorToolName => Boolean(name)),
    ),
    reasonCodes: unique(reasonCodes),
  }
}
