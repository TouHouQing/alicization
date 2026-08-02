import type { AlicizationSystemProbeSample } from '../../../shared/eventa'
import type { AlicizationPerceptionSceneResidue, AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationProactivePerceptionSignals } from './proactive-policy'
import type { AlicizationScreenSemanticSummary } from './proactive-screen-semantic'

import { isWeakAlicizationScreenSurfaceTarget } from '@proj-alicization/stage-shared'

import {
  extractInspectionHintTerms,
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
  isSelfPerceptionTarget,
} from './attention-anchor'
import { inferForegroundWorkloadFromWindow } from './proactive-layered-context'
import { sanitizeBriefText } from './runtime-realtime'
import { sanitizeText } from './runtime-soul'

export function describePerceptionTarget(target?: {
  appName?: string
  processName?: string
  title?: string
} | null) {
  if (!target)
    return 'none'
  return [
    sanitizeBriefText(target.appName ?? '', 48),
    sanitizeBriefText(target.processName ?? '', 48),
    sanitizeBriefText(target.title ?? '', 96),
  ].filter(Boolean).join(' | ') || 'none'
}

export function formatObservationAge(now: number, observedAt: number) {
  const deltaSeconds = Math.max(0, Math.round((now - observedAt) / 1_000))
  if (deltaSeconds < 90)
    return `${deltaSeconds}s ago`
  return `${Math.round(deltaSeconds / 60)}m ago`
}

export function isGenericScreenInspectionRequest(userText: string) {
  const normalized = userText.trim()
  if (!normalized)
    return false

  const mentionsScreen = /屏幕|桌面|工作区|workspace|desktop|界面|画面|screen|display/i.test(normalized)
  const mentionsSpecificTask = /代码|diff|改动|报错|错误|exception|traceback|terminal|终端|cursor|vs\s*code|xcode|jetbrains|chrome|safari|firefox|edge|tab|标签页|url|网址|控制台|console|日志|log/i.test(normalized)
  return mentionsScreen && !mentionsSpecificTask
}

export function isWeakGenericBrowserPerceptionTarget(target?: {
  appName?: string
  processName?: string
  title?: string
} | null) {
  return isWeakAlicizationScreenSurfaceTarget({
    appName: target?.appName ?? undefined,
    processName: target?.processName ?? undefined,
    title: target?.title ?? undefined,
  })
}

export function isWeakGenericBrowserFocusTarget(input: {
  focusTarget?: {
    appName?: string
    processName?: string
    title?: string
    source?: string
  } | null
  captureStrategy?: AlicizationPerceptionSceneResidue['captureStrategy']
  userText?: string
}) {
  return Boolean(
    isWeakGenericBrowserPerceptionTarget(input.focusTarget)
    && input.captureStrategy === 'screen-fallback'
    && isGenericScreenInspectionRequest(input.userText ?? ''),
  )
}

function shouldIgnoreSceneResidue(
  residue: AlicizationPerceptionSceneResidue | null | undefined,
) {
  if (!residue)
    return true

  return Boolean(
    residue.captureStrategy === 'screen-fallback'
    && residue.contentKind === 'unknown'
    && isWeakGenericBrowserPerceptionTarget(residue.focusTarget),
  )
}

export function getUsablePerceptionSceneResidue(input: {
  state: AlicizationPerceptionState
  now: number
  maxAgeMs?: number
}) {
  const residue = getActivePerceptionSceneResidue(input.state, input.now, input.maxAgeMs)
  return shouldIgnoreSceneResidue(residue) ? null : residue
}

export function shouldSuppressWeakGenericBrowserInspectionAnchor(input: {
  now: number
  userText: string
  state: AlicizationPerceptionState
  currentForeground?: {
    appName?: string
    processName?: string
    title?: string
  }
  groundingUnavailableReason?: string
}) {
  const activeAnchor = getActiveAttentionAnchor(input.state, input.now)
  if (!isWeakGenericBrowserPerceptionTarget(activeAnchor))
    return false

  if (isGenericScreenInspectionRequest(input.userText))
    return true

  const hintTerms = extractInspectionHintTerms(input.userText)
  if (hasCodingInspectionIntent(hintTerms))
    return true

  if (input.groundingUnavailableReason && input.groundingUnavailableReason !== 'user-already-attached-image')
    return true

  if (input.currentForeground && !isSelfPerceptionTarget(input.currentForeground) && !isWeakGenericBrowserPerceptionTarget(input.currentForeground))
    return true

  return false
}

export function purgeWeakGenericBrowserInspectionState(input: {
  now: number
  state: AlicizationPerceptionState
}) {
  const shouldDropAnchor = isWeakGenericBrowserPerceptionTarget(input.state.attentionAnchor)
  const shouldDropLastForeground = isWeakGenericBrowserPerceptionTarget(input.state.lastNonSelfForegroundTarget)
  const nextRecentObservations = input.state.recentObservations.filter(observation => !isWeakGenericBrowserPerceptionTarget(observation))
  const nextSceneResidue = shouldIgnoreSceneResidue(input.state.recentSceneResidue)
    ? null
    : input.state.recentSceneResidue

  if (
    !shouldDropAnchor
    && !shouldDropLastForeground
    && nextRecentObservations.length === input.state.recentObservations.length
    && nextSceneResidue === input.state.recentSceneResidue
  ) {
    return input.state
  }

  return {
    ...input.state,
    attentionAnchor: shouldDropAnchor ? null : input.state.attentionAnchor,
    lastNonSelfForegroundTarget: shouldDropLastForeground ? null : input.state.lastNonSelfForegroundTarget,
    recentObservations: nextRecentObservations,
    recentSceneResidue: nextSceneResidue,
    updatedAt: input.now,
  } satisfies AlicizationPerceptionState
}

function inferInspectionContentKind(input: {
  userText?: string
  focusTarget?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  captureSourceName?: string
}): AlicizationPerceptionSceneResidue['contentKind'] {
  const haystack = [
    input.userText ?? '',
    input.focusTarget?.appName ?? '',
    input.focusTarget?.processName ?? '',
    input.focusTarget?.title ?? '',
    input.captureSourceName ?? '',
  ].join(' ')
  if (/\b(?:error|exception|traceback|stack trace|test failed|panic|ts\d{3,5})\b|报错|错误|异常/i.test(haystack))
    return 'error'
  if (/\b(?:diff|pull request|compare|changes|commit|merge conflict)\b|改动|变更|对比/i.test(haystack))
    return 'diff'
  if (/\b(?:youtube|bilibili|netflix|vlc|iina|video|watching)\b|视频|播放/i.test(haystack))
    return 'video'
  if (/\b(?:qqmusic|qq music|spotify|apple music|music|playlist|album|track|song|lyrics|netease|cloud music)\b|qq音乐|网易云|音乐|歌曲|歌名|歌词|专辑/i.test(haystack))
    return 'music'
  if (/\b(?:discord|slack|telegram|wechat|chat)\b|聊天|对话/i.test(haystack))
    return 'chat'
  if (/\b(?:docs|documentation|readme|notion|confluence|wiki|mdn)\b|文档|说明/i.test(haystack))
    return 'doc'
  if (/\b(?:steam|game|elden ring|counter-strike|dota|league of legends|minecraft|valorant)\b|游戏/i.test(haystack))
    return 'gameplay'
  return 'unknown'
}

export function shouldUsePerceptionResidueAsLiveSceneSummary(input: {
  residue: AlicizationPerceptionSceneResidue | null
  currentForeground?: {
    appName?: string
    processName?: string
    title?: string
    pid?: number | null
  }
  inspectionRequested: boolean
  groundedThisTurn: boolean
}) {
  if (!input.residue?.summary)
    return false
  if (input.groundedThisTurn)
    return true

  const liveTarget = normalizeForegroundDecisionTarget(input.currentForeground)
  const residueTarget = normalizeForegroundDecisionTarget(input.residue.focusTarget)
  if (!liveTarget)
    return true
  if (!residueTarget)
    return !isSelfPerceptionTarget(liveTarget)
  if (scoreForegroundDecisionOverlap(liveTarget, residueTarget) >= 72)
    return true
  if (isSelfPerceptionTarget(liveTarget) && !isSelfPerceptionTarget(residueTarget))
    return false
  if (input.inspectionRequested && isSelfPerceptionTarget(liveTarget))
    return false
  return !isSelfPerceptionTarget(liveTarget)
}

export function resolveInspectionGroundingContinuity(input: {
  now: number
  auditAction: string
  auditReason?: string
  residue: AlicizationPerceptionSceneResidue | null
  currentForeground?: {
    appName?: string
    processName?: string
    title?: string
    pid?: number | null
  }
  useResidueAsLiveSceneSummary: boolean
}) {
  if (input.auditAction === 'inspection-grounded') {
    return {
      groundedThisTurn: true,
      source: 'live-grounded' as const,
      overlapScore: 120,
    }
  }
  if (!input.useResidueAsLiveSceneSummary || !input.residue) {
    return {
      groundedThisTurn: false,
      source: 'none' as const,
      overlapScore: 0,
    }
  }
  if (input.auditReason === 'screen-capture-permission-denied') {
    return {
      groundedThisTurn: false,
      source: 'none' as const,
      overlapScore: 0,
    }
  }
  if (!['screen-semantic-summary', 'invited-inspection'].includes(input.residue.source)) {
    return {
      groundedThisTurn: false,
      source: 'none' as const,
      overlapScore: 0,
    }
  }
  if (input.now - input.residue.observedAt > 2 * 60_000 || input.residue.confidence < 0.56) {
    return {
      groundedThisTurn: false,
      source: 'none' as const,
      overlapScore: 0,
    }
  }

  const residueTarget = normalizeForegroundDecisionTarget(input.residue.focusTarget)
  const liveTarget = normalizeForegroundDecisionTarget(input.currentForeground)
  if (!residueTarget || !liveTarget) {
    return {
      groundedThisTurn: false,
      source: 'none' as const,
      overlapScore: 0,
    }
  }
  if (isSelfPerceptionTarget(liveTarget) && !isSelfPerceptionTarget(residueTarget)) {
    return {
      groundedThisTurn: false,
      source: 'none' as const,
      overlapScore: 0,
    }
  }
  const overlap = scoreForegroundDecisionOverlap(liveTarget, residueTarget)
  if (overlap < 72) {
    return {
      groundedThisTurn: false,
      source: 'none' as const,
      overlapScore: overlap,
    }
  }
  return {
    groundedThisTurn: true,
    source: 'residue-carry' as const,
    overlapScore: overlap,
  }
}

export function buildInspectionSceneResidue(input: {
  now: number
  userText: string
  focusTarget?: {
    appName?: string
    processName?: string
    title?: string
    source?: AlicizationPerceptionSceneResidue['focusSource']
    confidence?: number
  } | null
  captureSourceName: string
  captureStrategy: AlicizationPerceptionSceneResidue['captureStrategy']
}): AlicizationPerceptionSceneResidue | null {
  if (!input.focusTarget || isWeakAlicizationScreenSurfaceTarget(input.focusTarget))
    return null

  const workloadKind = inferForegroundWorkloadFromWindow(input.focusTarget)
  const contentKind = inferInspectionContentKind({
    userText: input.userText,
    focusTarget: input.focusTarget,
    captureSourceName: input.captureSourceName,
  })
  const summary = contentKind === 'unknown'
    ? ''
    : [
        workloadKind === 'unknown' ? '' : workloadKind,
        contentKind,
        'focus',
      ].filter(Boolean).join(' ')

  return {
    observedAt: input.now,
    source: 'invited-inspection',
    workloadKind,
    contentKind,
    summary: summary || undefined,
    confidence: Math.max(0.52, Math.min(0.92, Number(input.focusTarget.confidence ?? 0.7))),
    focusTarget: {
      appName: input.focusTarget.appName,
      processName: input.focusTarget.processName,
      title: input.focusTarget.title,
    },
    focusSource: input.focusTarget.source,
    captureSourceName: sanitizeBriefText(input.captureSourceName, 120) || undefined,
    captureStrategy: input.captureStrategy,
  }
}

export function buildScreenSemanticSummaryFromResidue(
  residue: AlicizationPerceptionSceneResidue,
): AlicizationScreenSemanticSummary {
  const sourceName = residue.captureSourceName
    || describePerceptionTarget(residue.focusTarget)
    || 'recent invited inspection'
  return {
    workload: {
      kind: residue.workloadKind,
      confidence: residue.confidence,
      matchedLabels: residue.focusSource ? [residue.focusSource] : [],
    },
    content: {
      kind: residue.contentKind,
      confidence: residue.confidence,
      matchedLabels: residue.focusSource ? [residue.focusSource] : [],
      summary: residue.summary,
    },
    analyzedAt: residue.observedAt,
    source: {
      id: `scene-residue:${residue.source}`,
      name: sourceName,
      strategy: residue.captureStrategy ?? 'screen-fallback',
    },
  }
}

export function isResidueBackedScreenSemanticSummary(
  summary: AlicizationScreenSemanticSummary | null | undefined,
) {
  return Boolean(summary?.source.id.startsWith('scene-residue:'))
}

function describeSceneResidue(now: number, residue: AlicizationPerceptionSceneResidue | null | undefined) {
  if (!residue)
    return ''
  return [
    `${formatObservationAge(now, residue.observedAt)}`,
    `source=${residue.source}`,
    residue.focusTarget ? `focus=${describePerceptionTarget(residue.focusTarget)}` : '',
    residue.workloadKind !== 'unknown' ? `workload=${residue.workloadKind}` : '',
    residue.contentKind !== 'unknown' ? `content=${residue.contentKind}` : '',
    residue.summary ? `summary=${sanitizeBriefText(residue.summary, 80)}` : '',
  ].filter(Boolean).join(' | ')
}

export function buildPerceptionContinuityLines(input: {
  now: number
  state: AlicizationPerceptionState
  maxItems?: number
  suppressWeakGenericBrowserAnchor?: boolean
}) {
  const rawAnchor = getActiveAttentionAnchor(input.state, input.now)
  const suppressWeakGenericBrowserAnchor = Boolean(
    input.suppressWeakGenericBrowserAnchor
    && isWeakGenericBrowserPerceptionTarget(rawAnchor),
  )
  const anchor = suppressWeakGenericBrowserAnchor ? null : rawAnchor
  const lines = [
    suppressWeakGenericBrowserAnchor
      ? 'attention_anchor=suppressed:weak-generic-browser'
      : `attention_anchor=${describePerceptionTarget(anchor)}`,
    `invited_inspection_active=${input.state.invitedInspection && input.state.invitedInspection.activeUntil > input.now ? 'true' : 'false'}`,
  ]
  const recentObservations = input.state.recentObservations
    .filter(observation => !input.suppressWeakGenericBrowserAnchor || !isWeakGenericBrowserPerceptionTarget(observation))
    .slice(-(input.maxItems ?? 3))
  if (recentObservations.length > 0) {
    lines.push(
      ...recentObservations.map((observation, index) => `recent_observation_${index + 1}=${formatObservationAge(input.now, observation.observedAt)} | ${describePerceptionTarget(observation)} | workload=${observation.workloadKind}`),
    )
  }
  const sceneResidue = getUsablePerceptionSceneResidue({
    state: input.state,
    now: input.now,
  })
  if (sceneResidue) {
    lines.push(
      `scene_residue=${describeSceneResidue(input.now, sceneResidue)}`,
    )
  }
  return lines
}

export function buildProactivePerceptionSignals(input: {
  now: number
  state: AlicizationPerceptionState
  currentForeground?: {
    appName?: string
    processName?: string
    title?: string
  }
}): AlicizationProactivePerceptionSignals {
  const attentionAnchor = getActiveAttentionAnchor(input.state, input.now)
  const currentForegroundIsSelf = input.currentForeground
    ? isSelfPerceptionTarget(input.currentForeground)
    : false
  const recentObservationCount = input.state.recentObservations
    .filter(observation => input.now - observation.observedAt <= 10 * 60_000)
    .length

  return {
    activeAttentionAnchor: Boolean(attentionAnchor),
    attentionAnchorAgeMs: attentionAnchor
      ? Math.max(0, input.now - attentionAnchor.lastObservedAt)
      : null,
    attentionAnchorConfidence: attentionAnchor?.confidence ?? 0,
    attentionAnchorWorkloadKind: attentionAnchor?.workloadKind ?? 'unknown',
    attentionAnchorCanOverrideScenario: Boolean(attentionAnchor && currentForegroundIsSelf),
    recentObservationCount,
    invitedInspectionActive: Boolean(input.state.invitedInspection && input.state.invitedInspection.activeUntil > input.now),
  }
}

function normalizeForegroundDecisionTarget(
  target: AlicizationSystemProbeSample['foregroundWindow'] | {
    appName?: string
    processName?: string
    title?: string
    pid?: number | null
  } | null | undefined,
) {
  const appName = sanitizeText(target?.appName)
  const processName = sanitizeText(target?.processName)
  const title = sanitizeText(target?.title)
  const pid = Number.isFinite(Number(target?.pid)) ? Math.max(1, Math.floor(Number(target?.pid))) : null
  if (!appName && !processName && !title && pid === null)
    return undefined
  return {
    appName: appName || undefined,
    processName: processName || undefined,
    title: title || undefined,
    pid,
  }
}

function buildForegroundDecisionText(
  target: ReturnType<typeof normalizeForegroundDecisionTarget>,
) {
  if (!target)
    return ''
  return [target.appName, target.processName, target.title].filter(Boolean).join(' ')
}

function tokenizeForegroundDecisionText(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9\u4E00-\u9FFF]+/i)
    .map(token => token.trim())
    .filter(Boolean)
}

function scoreForegroundDecisionOverlap(
  left: ReturnType<typeof normalizeForegroundDecisionTarget>,
  right: ReturnType<typeof normalizeForegroundDecisionTarget>,
) {
  const leftText = buildForegroundDecisionText(left).toLowerCase()
  const rightText = buildForegroundDecisionText(right).toLowerCase()
  if (!leftText || !rightText)
    return 0
  if (leftText === rightText)
    return 120
  if (leftText.includes(rightText) || rightText.includes(leftText))
    return 86

  const leftTokens = new Set(tokenizeForegroundDecisionText(leftText))
  const rightTokens = tokenizeForegroundDecisionText(rightText)
  let score = 0
  for (const token of rightTokens) {
    if (!leftTokens.has(token))
      continue
    score += token.length >= 5 ? 24 : 12
  }
  return score
}

function getForegroundDecisionSpecificity(
  target: ReturnType<typeof normalizeForegroundDecisionTarget>,
) {
  if (!target)
    return 0
  switch (inferForegroundWorkloadFromWindow(target)) {
    case 'coding':
    case 'terminal':
      return 120
    case 'game':
    case 'media':
      return 104
    case 'document':
    case 'chat':
      return 84
    case 'browser':
      return 42
    default:
      return 16
  }
}

function hasCodingInspectionIntent(hintTerms: string[]) {
  return hintTerms.some(term => /\b(?:code|vscode|visual studio code|cursor|windsurf|xcode|jetbrains|terminal|iterm|warp|docker|diff|error|exception|traceback|test failed|compare|changes)\b/i.test(term))
}

function mergeForegroundDecisionTarget(
  primary: ReturnType<typeof normalizeForegroundDecisionTarget>,
  secondary: ReturnType<typeof normalizeForegroundDecisionTarget>,
) {
  if (!primary)
    return secondary ?? undefined
  if (!secondary)
    return primary
  return {
    appName: primary.appName ?? secondary.appName,
    processName: primary.processName ?? secondary.processName,
    title: primary.title ?? secondary.title,
    pid: primary.pid ?? secondary.pid ?? null,
  }
}

export function resolveForegroundDecisionTarget(input: {
  snapshotForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
  probedForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
  attentionAnchor?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  hintTerms?: string[]
  allowAttentionAnchorFallback?: boolean
}) {
  const snapshot = normalizeForegroundDecisionTarget(input.snapshotForeground)
  const probe = normalizeForegroundDecisionTarget(input.probedForeground)
  const anchor = normalizeForegroundDecisionTarget(input.attentionAnchor)
  const snapshotWeak = isWeakGenericBrowserPerceptionTarget(snapshot)
  const probeWeak = isWeakGenericBrowserPerceptionTarget(probe)
  const anchorWeak = isWeakGenericBrowserPerceptionTarget(anchor)
  const usableSnapshot = snapshotWeak ? undefined : snapshot
  const usableProbe = probeWeak ? undefined : probe
  const usableAnchor = anchorWeak ? undefined : anchor
  const hintTerms = Array.isArray(input.hintTerms) ? input.hintTerms.filter(Boolean) : []
  const codingInspectionIntent = hasCodingInspectionIntent(hintTerms)

  if (usableSnapshot && usableProbe && scoreForegroundDecisionOverlap(usableSnapshot, usableProbe) >= 96)
    return mergeForegroundDecisionTarget(usableSnapshot, usableProbe)

  const snapshotSpecificity = getForegroundDecisionSpecificity(usableSnapshot)
  const probeSpecificity = getForegroundDecisionSpecificity(usableProbe)
  const anchorSpecificity = getForegroundDecisionSpecificity(usableAnchor)
  const snapshotAnchorScore = scoreForegroundDecisionOverlap(usableSnapshot, usableAnchor)
  const probeAnchorScore = scoreForegroundDecisionOverlap(usableProbe, usableAnchor)

  if (
    input.allowAttentionAnchorFallback
    && usableAnchor
    && anchorSpecificity >= 84
    && Math.max(snapshotAnchorScore, probeAnchorScore) < 24
    && (
      codingInspectionIntent
      || isSelfPerceptionTarget(usableSnapshot)
      || isSelfPerceptionTarget(usableProbe)
      || probeSpecificity <= 42
    )
  ) {
    return usableAnchor
  }

  if (usableSnapshot && isSelfPerceptionTarget(usableSnapshot) && usableProbe && !isSelfPerceptionTarget(usableProbe))
    return usableProbe
  if (usableProbe && isSelfPerceptionTarget(usableProbe) && usableSnapshot && !isSelfPerceptionTarget(usableSnapshot))
    return usableSnapshot

  if (usableAnchor && usableSnapshot && snapshotAnchorScore >= probeAnchorScore + 24)
    return mergeForegroundDecisionTarget(usableSnapshot, usableProbe && scoreForegroundDecisionOverlap(usableSnapshot, usableProbe) >= 48 ? usableProbe : undefined)
  if (usableAnchor && usableProbe && probeAnchorScore >= snapshotAnchorScore + 24)
    return usableProbe

  if (usableSnapshot && usableProbe) {
    if (snapshotSpecificity >= probeSpecificity + 32 && probeSpecificity <= 42)
      return usableSnapshot
    if (probeSpecificity >= snapshotSpecificity + 32 && snapshotSpecificity <= 42)
      return usableProbe
    if (codingInspectionIntent && snapshotSpecificity >= 84 && probeSpecificity <= 42)
      return usableSnapshot
  }

  return usableSnapshot ?? usableProbe ?? (input.allowAttentionAnchorFallback ? usableAnchor ?? undefined : undefined)
}
