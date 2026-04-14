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
export type AlicizationExecutorToolName = 'executor_run_cli' | 'executor_run_codex' | 'executor_run_claude_code' | 'executor_run_openclaw'

export interface AlicizationExecutionCapabilityInquiry {
  active: boolean
  capabilityQuestion: boolean
  mentionedChannels: AlicizationExecutionCapabilityChannel[]
  hasActionVerb: boolean
  hasCommandLiteral: boolean
}

export interface AlicizationExecutionRoutingIntent {
  requestedChannels: AlicizationExecutionDispatchChannel[]
  requiredToolNames: AlicizationExecutorToolName[]
  reasonCodes: string[]
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
const executionRequestFramePattern = /请|麻烦|拜托|帮我|帮忙|请你|希望你|我想让你|please|help\s+me|can\s+you|could\s+you|would\s+you|i\s+need\s+you|(?:^|\n)\s*use\s+/iu
const executionShellPromptPattern = /(^|\n)\s*[$>#]\s*[^\s`]+/u
const executionShellOperatorPattern = /&&|\|\||[|><]{1,2}|(?:^|\s)-{1,2}[a-z0-9-]+(?:\s|$)/iu
const executionFilesystemPathPattern = /(?:^|[\s`'"])(?:~\/|\.{1,2}\/|\/[^\s"'`]+|[A-Za-z]:\\[^\s"'`]+|[^\s"'`]+\.(?:ts|tsx|js|jsx|vue|json|md|yaml|yml|toml|py|go|rs|java|kt|swift|sh|c|cpp|h))(?:$|[\s`'"])/u
const executionToolReferencePattern = /\b(?:executor_run_[a-z_]+|filesystem_[a-z_]+|mcp_[a-z_]+)\b/iu
const executionCodeArtifactPattern = /```|(?:^|[\s`'"])[\w./-]+\.(?:ts|tsx|js|jsx|vue|json|md|yaml|yml|toml|py|go|rs|java|kt|swift|sh|c|cpp|h)(?:$|[\s`'"])/iu
const executionBrowserArtifactPattern = /https?:\/\/|www\.|(?:\bdom\b|\bhtml\b|\bcss\b|\burl\b|\btab\b)|浏览器|网页|页面|网址|标签页/u
const executionSoftwareArtifactPattern = /\bapp(?:lication)?\b|\bwindow\b|\bdesktop\b|软件|窗口|桌面/u
const executionFallbackImperativePattern = /(?:用|使用).*(?:cli|codex|claude[\s-]?code|openclaw)|(?:帮我|请|麻烦).*(?:执行|运行|查|列出|修改|修复|重构|run|execute|list|show|fix|refactor)/iu

const executionRoutingToolMap: Record<AlicizationExecutionDispatchChannel, AlicizationExecutorToolName> = {
  'cli': 'executor_run_cli',
  'codex': 'executor_run_codex',
  'claude-code': 'executor_run_claude_code',
  'openclaw': 'executor_run_openclaw',
}

function normalizeExecutionIntentText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim()
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(3))))
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
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
