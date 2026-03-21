import type {
  AlicizationProactiveScenario,
  AlicizationSubconsciousNeedsState,
  AlicizationSystemProbeSample,
} from '../../../shared/eventa'
import type { AlicizationRecentProactiveOutcome } from './proactive-feedback'
import type { AlicizationScreenSemanticSummary } from './proactive-screen-semantic'

export type AlicizationWorkloadKind = 'coding' | 'media' | 'browser' | 'terminal' | 'game' | 'chat' | 'document' | 'unknown'
export type AlicizationContentKind = 'error' | 'diff' | 'doc' | 'video' | 'music' | 'chat' | 'gameplay' | 'unknown'
export type AlicizationLayeredContextSource = 'foreground-window-heuristic' | 'screen-semantic-summary'

interface ForegroundMatcher<TKind extends string> {
  kind: TKind
  labels: string[]
  exact?: string[]
  pattern?: RegExp
}

export interface AlicizationProactiveLayeredContext {
  localTime: {
    hour: number
    minute: number
    isLateNight: boolean
  }
  system: {
    cpuUsage: number
    battery: {
      percent: number | null
      charging: boolean | null
    }
    memory: {
      usagePercent: number
      freeMB: number
      totalMB: number
    }
    idleSeconds: number | null
    inputActivity: 'active' | 'idle' | 'unknown'
    fullscreenLikely: boolean
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    degradedSignals: string[]
  }
  workload: {
    kind: AlicizationWorkloadKind
    confidence: number
    source: AlicizationLayeredContextSource
    matchedLabels: string[]
  }
  content: {
    kind: AlicizationContentKind
    confidence: number
    source: AlicizationLayeredContextSource
    matchedLabels: string[]
    summary?: string
  }
  relationship: {
    hostAttitude: string
    boredom: number
    loneliness: number
    fatigue: number
    minutesSinceLastUserTurn: number
    reminderBacklog: number
    lateNightActiveMinutes: number
    recentProactiveOutcomes: AlicizationRecentProactiveOutcome[]
  }
}

const workloadMatchers: ForegroundMatcher<AlicizationWorkloadKind>[] = [
  {
    kind: 'coding',
    labels: ['vscode', 'cursor', 'windsurf', 'jetbrains', 'git-tool'],
    exact: [
      'code',
      'code - insiders',
      'cursor',
      'windsurf',
      'zed',
      'xcode',
      'fleet',
      'nova',
      'github desktop',
      'gitkraken',
      'fork',
      'sourcetree',
      'tower',
      'smartgit',
    ],
    pattern: /\b(?:visual studio code|vscode|cursor|windsurf|zed|xcode|fleet|nova|sublime text|textmate|bbedit|webstorm|intellij(?: idea)?|idea|phpstorm|goland|pycharm|rubymine|clion|rider|dataspell|rustrover|android studio|github desktop|gitkraken|fork|sourcetree|tower|smartgit)\b/i,
  },
  {
    kind: 'terminal',
    labels: ['terminal', 'iterm', 'warp', 'docker'],
    exact: ['terminal', 'iterm', 'iterm2', 'warp', 'wezterm', 'alacritty', 'kitty', 'hyper', 'tmux', 'docker', 'docker desktop'],
    pattern: /\b(?:terminal|iterm2?|warp|wezterm|alacritty|kitty|hyper|tmux|docker(?: desktop)?|lazygit)\b/i,
  },
  { kind: 'media', labels: ['spotify', 'youtube', 'music'], pattern: /\b(?:spotify|music|youtube music|youtube|bilibili|netflix|vlc|iina|podcast)\b/i },
  { kind: 'game', labels: ['steam', 'game'], pattern: /\b(?:steam|epic games|riot client|elden ring|counter-strike|dota|league of legends|minecraft|valorant|game)\b/i },
  { kind: 'chat', labels: ['discord', 'slack', 'telegram'], pattern: /\b(?:discord|slack|telegram|wechat|whatsapp|messages|chatgpt|claude)\b/i },
  { kind: 'document', labels: ['notion', 'docs', 'readme'], pattern: /\b(?:notion|obsidian|pages|word|preview|acrobat|pdf|docs|documentation|readme|confluence)\b/i },
  { kind: 'browser', labels: ['browser'], pattern: /\b(?:arc|chrome|firefox|safari|edge|brave)\b/i },
]

const contentMatchers: ForegroundMatcher<AlicizationContentKind>[] = [
  { kind: 'error', labels: ['error'], pattern: /\b(?:error|exception|traceback|stack trace|panic|test failed|failed|undefined is not|cannot find|ts\d{3,5}|enoent)\b/i },
  { kind: 'diff', labels: ['diff'], pattern: /\b(?:diff|pull request|compare|changes|commit|merge conflict)\b/i },
  { kind: 'video', labels: ['video'], pattern: /\b(?:youtube|bilibili|netflix|vlc|iina|video|watching)\b/i },
  { kind: 'music', labels: ['music'], pattern: /\b(?:spotify|music|playlist|album|track|song)\b/i },
  { kind: 'chat', labels: ['chat'], pattern: /\b(?:discord|slack|telegram|wechat|chat)\b/i },
  { kind: 'doc', labels: ['doc'], pattern: /\b(?:docs|documentation|readme|notion|confluence|wiki|mdn)\b/i },
  { kind: 'gameplay', labels: ['gameplay'], pattern: /\b(?:elden ring|counter-strike|dota|league of legends|minecraft|valorant|game)\b/i },
]

function clampPercent(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(100, value))
}

function normalizeForegroundWindow(windowLike: AlicizationSystemProbeSample['foregroundWindow']) {
  if (!windowLike)
    return undefined
  const appName = typeof windowLike.appName === 'string' ? windowLike.appName.trim() : ''
  const processName = typeof windowLike.processName === 'string' ? windowLike.processName.trim() : ''
  const title = typeof windowLike.title === 'string' ? windowLike.title.trim() : ''
  if (!appName && !processName && !title)
    return undefined
  return {
    appName: appName || undefined,
    processName: processName || undefined,
    title: title || undefined,
  }
}

function dedupeStringArray(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function normalizeMatcherText(value: unknown) {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : ''
}

function readForegroundWindowHaystack(windowLike: AlicizationSystemProbeSample['foregroundWindow']) {
  return [
    windowLike?.appName ?? '',
    windowLike?.processName ?? '',
    windowLike?.title ?? '',
  ].join(' | ')
}

function classifyFromForegroundWindow<TKind extends string>(
  windowLike: AlicizationSystemProbeSample['foregroundWindow'],
  matchers: ForegroundMatcher<TKind>[],
  fallbackKind: TKind,
) {
  const haystack = readForegroundWindowHaystack(windowLike)
  const exactHaystacks = [
    normalizeMatcherText(windowLike?.appName),
    normalizeMatcherText(windowLike?.processName),
    normalizeMatcherText(windowLike?.title),
  ]

  for (const matcher of matchers) {
    if (matcher.exact?.some(exact => exactHaystacks.includes(normalizeMatcherText(exact)))) {
      return {
        kind: matcher.kind,
        confidence: 0.9,
        matchedLabels: matcher.labels,
      }
    }

    if (!matcher.pattern?.test(haystack))
      continue
    return {
      kind: matcher.kind,
      confidence: 0.78,
      matchedLabels: matcher.labels,
    }
  }

  return {
    kind: fallbackKind,
    confidence: 0.12,
    matchedLabels: [] as string[],
  }
}

export function inferForegroundWorkloadFromWindow(windowLike: AlicizationSystemProbeSample['foregroundWindow']) {
  return classifyFromForegroundWindow(windowLike, workloadMatchers, 'unknown').kind
}

export function isLateNightWindow(date: Date) {
  const hour = date.getHours()
  const minute = date.getMinutes()
  const totalMinutes = hour * 60 + minute
  return totalMinutes >= 23 * 60 + 30 || totalMinutes <= 5 * 60
}

export function inferScenarioFromContext(input: {
  workload: AlicizationWorkloadKind
  content: AlicizationContentKind
  lateNight: boolean
  lateNightActiveMinutes: number
  fatigue: number
}): AlicizationProactiveScenario {
  if (
    input.lateNight
    && (input.lateNightActiveMinutes >= 90 || input.fatigue >= 55)
    && (input.workload === 'game' || input.workload === 'media')
  ) {
    return 'late-night-care'
  }
  if (input.workload === 'coding' || input.workload === 'terminal' || input.content === 'error' || input.content === 'diff')
    return 'coding'
  if (input.workload === 'media' || input.content === 'video' || input.content === 'music')
    return 'media'
  return 'general'
}

export function buildProactiveLayeredContext(input: {
  now: number
  probeSample: AlicizationSystemProbeSample | null | undefined
  interruptionContext: {
    idleSeconds: number | null
    inputActivity: 'active' | 'idle' | 'unknown'
    fullscreenLikely: boolean
    foregroundWindow?: AlicizationSystemProbeSample['foregroundWindow']
    degraded: string[]
  }
  subconsciousState: Pick<AlicizationSubconsciousNeedsState, 'boredom' | 'loneliness' | 'fatigue' | 'lastInteractionAt'>
  hostAttitude: string
  reminderBacklog: number
  lateNightActiveMinutes: number
  recentProactiveOutcomes: AlicizationRecentProactiveOutcome[]
  screenSemanticSummary?: AlicizationScreenSemanticSummary | null
}) {
  const timestamp = new Date(input.now)
  const foregroundWindow = normalizeForegroundWindow(
    input.interruptionContext.foregroundWindow ?? input.probeSample?.foregroundWindow,
  )
  const workload = classifyFromForegroundWindow(foregroundWindow, workloadMatchers, 'unknown')
  const content = classifyFromForegroundWindow(foregroundWindow, contentMatchers, 'unknown')
  const semanticWorkload = input.screenSemanticSummary?.workload
  const semanticContent = input.screenSemanticSummary?.content

  return {
    localTime: {
      hour: timestamp.getHours(),
      minute: timestamp.getMinutes(),
      isLateNight: isLateNightWindow(timestamp),
    },
    system: {
      cpuUsage: clampPercent(Number(input.probeSample?.cpu?.usagePercent ?? 0)),
      battery: {
        percent: typeof input.probeSample?.battery?.percent === 'number'
          ? clampPercent(input.probeSample.battery.percent)
          : null,
        charging: typeof input.probeSample?.battery?.charging === 'boolean'
          ? input.probeSample.battery.charging
          : null,
      },
      memory: {
        usagePercent: clampPercent(Number(input.probeSample?.memory?.usagePercent ?? 0)),
        freeMB: Number.isFinite(Number(input.probeSample?.memory?.freeMB)) ? Number(input.probeSample?.memory?.freeMB) : 0,
        totalMB: Number.isFinite(Number(input.probeSample?.memory?.totalMB)) ? Number(input.probeSample?.memory?.totalMB) : 0,
      },
      idleSeconds: input.interruptionContext.idleSeconds,
      inputActivity: input.interruptionContext.inputActivity,
      fullscreenLikely: input.interruptionContext.fullscreenLikely,
      foregroundWindow,
      degradedSignals: dedupeStringArray([
        ...(input.probeSample?.degraded ?? []),
        ...input.interruptionContext.degraded,
      ]),
    },
    workload: {
      kind: semanticWorkload?.kind && semanticWorkload.kind !== 'unknown'
        ? semanticWorkload.kind
        : workload.kind,
      confidence: semanticWorkload?.kind && semanticWorkload.kind !== 'unknown'
        ? semanticWorkload.confidence
        : workload.confidence,
      source: semanticWorkload?.kind && semanticWorkload.kind !== 'unknown'
        ? 'screen-semantic-summary'
        : 'foreground-window-heuristic',
      matchedLabels: dedupeStringArray([
        ...(semanticWorkload?.matchedLabels ?? []),
        ...workload.matchedLabels,
      ]),
    },
    content: {
      kind: semanticContent?.kind && semanticContent.kind !== 'unknown'
        ? semanticContent.kind
        : content.kind,
      confidence: semanticContent?.kind && semanticContent.kind !== 'unknown'
        ? semanticContent.confidence
        : content.confidence,
      source: semanticContent?.kind && semanticContent.kind !== 'unknown'
        ? 'screen-semantic-summary'
        : 'foreground-window-heuristic',
      matchedLabels: dedupeStringArray([
        ...(semanticContent?.matchedLabels ?? []),
        ...content.matchedLabels,
      ]),
      summary: semanticContent?.summary,
    },
    relationship: {
      hostAttitude: input.hostAttitude.trim(),
      boredom: clampPercent(input.subconsciousState.boredom),
      loneliness: clampPercent(input.subconsciousState.loneliness),
      fatigue: clampPercent(input.subconsciousState.fatigue),
      minutesSinceLastUserTurn: Math.max(0, (input.now - input.subconsciousState.lastInteractionAt) / 60_000),
      reminderBacklog: Math.max(0, Math.floor(input.reminderBacklog)),
      lateNightActiveMinutes: Math.max(0, Number(input.lateNightActiveMinutes.toFixed(2))),
      recentProactiveOutcomes: input.recentProactiveOutcomes.slice(-6),
    },
  } satisfies AlicizationProactiveLayeredContext
}
