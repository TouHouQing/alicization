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
const executionActionRequestPattern = /运行|执行|帮我(?:跑|执行|处理|完成)|调用|操作|启动|关闭|关掉|点掉|点击|打开|拖动|滚动|输入|查看|看下|看看|run|execute|fix|patch|investigate|edit|modify|dispatch|start|launch|click|close|open|inspect/iu
const executionCommandLiteralPattern = /`[^`\n]+`|(?:^|\s)(?:pnpm|npm|yarn|bun|git|ls|cat|rg|grep|python|node|tsx|tsc|vitest|eslint|prettier)\b/iu

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

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

export function collectAlicizationExecutionChannelMentions(message: string) {
  const normalized = normalizeExecutionIntentText(message)
  if (!normalized)
    return [] as AlicizationExecutionCapabilityChannel[]

  const channels: AlicizationExecutionCapabilityChannel[] = []
  for (const channel of alicizationExecutionCapabilityChannels) {
    if (executionCapabilityAliasPatterns[channel].some(pattern => pattern.test(normalized)))
      channels.push(channel)
  }
  return channels
}

export function detectAlicizationExecutionCapabilityInquiry(message: string): AlicizationExecutionCapabilityInquiry {
  const normalized = normalizeExecutionIntentText(message)
  if (!normalized) {
    return {
      active: false,
      capabilityQuestion: false,
      mentionedChannels: [],
      hasActionVerb: false,
      hasCommandLiteral: false,
    }
  }

  const mentionedChannels = collectAlicizationExecutionChannelMentions(normalized)
  const hasActionVerb = executionActionRequestPattern.test(normalized)
  const hasCommandLiteral = executionCommandLiteralPattern.test(normalized)
  const capabilityQuestion = mentionedChannels.length > 0 && executionCapabilityQuestionPattern.test(normalized)

  return {
    active: capabilityQuestion,
    capabilityQuestion,
    mentionedChannels,
    hasActionVerb,
    hasCommandLiteral,
  }
}

export function detectAlicizationExecutionRoutingIntent(input: {
  message: string
  capabilityInquiry?: AlicizationExecutionCapabilityInquiry
}): AlicizationExecutionRoutingIntent | null {
  const normalized = normalizeExecutionIntentText(input.message)
  if (!normalized)
    return null

  const capabilityInquiry = input.capabilityInquiry ?? detectAlicizationExecutionCapabilityInquiry(normalized)
  if (capabilityInquiry.capabilityQuestion)
    return null
  if (!capabilityInquiry.hasActionVerb)
    return null

  const mentionedChannels = capabilityInquiry.mentionedChannels
    .filter((channel): channel is AlicizationExecutionDispatchChannel =>
      channel === 'cli' || channel === 'codex' || channel === 'claude-code' || channel === 'openclaw')

  const reasonCodes: string[] = []
  if (mentionedChannels.length > 0)
    reasonCodes.push('channel-mentioned')
  if (capabilityInquiry.hasCommandLiteral)
    reasonCodes.push('command-literal')
  if (capabilityInquiry.hasActionVerb)
    reasonCodes.push('action-verb')

  const requestedChannels: AlicizationExecutionDispatchChannel[] = mentionedChannels.length > 0
    ? mentionedChannels
    : capabilityInquiry.hasCommandLiteral
      ? ['cli']
      : []

  if (requestedChannels.length === 0)
    return null
  if (mentionedChannels.length === 0 && capabilityInquiry.hasCommandLiteral)
    reasonCodes.push('default-cli-from-command-literal')

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
