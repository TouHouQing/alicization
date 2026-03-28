import type { DesktopCapturerSource } from 'electron'

import { isWeakAlicizationScreenSurfaceCue, isWeakAlicizationScreenSurfaceTarget } from '@proj-alicization/stage-shared'

export type AlicizationScreenSemanticWorkloadKind = 'coding' | 'media' | 'browser' | 'terminal' | 'game' | 'chat' | 'document' | 'unknown'
export type AlicizationScreenSemanticContentKind = 'error' | 'diff' | 'doc' | 'video' | 'music' | 'chat' | 'gameplay' | 'unknown'
export type AlicizationScreenSemanticFocusSource = 'attention-anchor' | 'recent-observation' | 'foreground-window' | 'hint-terms' | 'capture-source'

export interface AlicizationScreenSemanticFocusTarget {
  appName?: string
  processName?: string
  title?: string
  source: AlicizationScreenSemanticFocusSource
  confidence: number
}

export interface AlicizationScreenSemanticCaptureCandidate {
  source: DesktopCapturerSource
  strategy: AlicizationScreenSemanticSummary['source']['strategy']
  focusTarget: AlicizationScreenSemanticFocusTarget | null
}

export interface AlicizationScreenSemanticSummary {
  workload: {
    kind: AlicizationScreenSemanticWorkloadKind
    confidence: number
    matchedLabels: string[]
  }
  content: {
    kind: AlicizationScreenSemanticContentKind
    confidence: number
    matchedLabels: string[]
    summary?: string
  }
  analyzedAt: number
  source: {
    id: string
    name: string
    strategy: 'window-title' | 'app-name' | 'process-name' | 'screen-fallback'
  }
}

function normalizeText(value: unknown) {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : ''
}

function normalizeTargetText(value: unknown) {
  return typeof value === 'string'
    ? value.trim().slice(0, 240)
    : ''
}

function normalizeSummary(value: unknown) {
  return typeof value === 'string'
    ? value.trim().slice(0, 120)
    : ''
}

const codingSourcePattern = /\b(?:visual studio code|vscode|cursor|windsurf|xcode|jetbrains|intellij|idea|pycharm|webstorm|goland|datagrip|clion|rubymine|fleet|zed|terminal|iterm|warp|ghostty|alacritty|docker|github desktop|gitkraken|fork)\b/i
const codingContentPattern = /\b(?:error|exception|traceback|stack trace|diff|pull request|test failed|failing test|build failed|typescript|javascript|eslint|pnpm|npm|bun|cargo|docker)\b/i
const mediaSourcePattern = /\b(?:qqmusic|qq music|spotify|apple music|music|youtube music|youtube|bilibili|netflix|vlc|iina|podcast|netease|cloud music)\b|qq音乐|网易云/i
const permissionModalPattern = /\b(?:screen(?:\s*&\s*system audio)?\s+recording|system audio recording|grant access|permission|picker|window picker)\b/i
const chatSourcePattern = /\b(?:wechat|weixin|discord|telegram|slack|qq|messages|message|whatsapp|teams|zoom)\b/i

function clampConfidence(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed))
    return 0
  return Math.max(0, Math.min(1, Number(parsed.toFixed(2))))
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9\u4E00-\u9FFF]+/i)
    .map(token => token.trim())
    .filter(Boolean)
}

function overlapScore(left: string, right: string) {
  if (!left || !right)
    return 0
  if (left === right)
    return 120
  if (left.includes(right) || right.includes(left))
    return 90

  const leftTokens = new Set(tokenize(left))
  const rightTokens = tokenize(right)
  let score = 0
  for (const token of rightTokens) {
    if (leftTokens.has(token))
      score += token.length >= 4 ? 24 : 12
  }
  return score
}

function dedupeLabels(values: unknown) {
  if (!Array.isArray(values))
    return []
  return [...new Set(values
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean))]
}

function matchesPattern(value: string, pattern: RegExp) {
  return value ? pattern.test(value) : false
}

function buildTargetText(target: { appName?: string, processName?: string, title?: string } | null | undefined) {
  return [
    target?.appName ?? '',
    target?.processName ?? '',
    target?.title ?? '',
  ].filter(Boolean).join(' ')
}

function scoreTargetOverlap(
  sourceName: string,
  target: { appName?: string, processName?: string, title?: string } | null | undefined,
) {
  if (!sourceName || !target)
    return 0
  return Math.max(
    overlapScore(sourceName, normalizeText(target.title)),
    overlapScore(sourceName, normalizeText(target.appName)),
    overlapScore(sourceName, normalizeText(target.processName)),
  )
}

function scoreTargetPairOverlap(
  left: { appName?: string, processName?: string, title?: string } | null | undefined,
  right: { appName?: string, processName?: string, title?: string } | null | undefined,
) {
  const leftText = normalizeText(buildTargetText(left))
  const rightText = normalizeText(buildTargetText(right))
  if (!leftText || !rightText)
    return 0
  return overlapScore(leftText, rightText)
}

function alignsWithLiveFocus(input: {
  target: { appName?: string, processName?: string, title?: string } | null | undefined
  focusTarget: { appName?: string, processName?: string, title?: string } | null | undefined
  foregroundTarget: { appName?: string, processName?: string, title?: string } | null | undefined
}) {
  if (!input.focusTarget && !input.foregroundTarget)
    return true
  return Math.max(
    scoreTargetPairOverlap(input.target, input.focusTarget),
    scoreTargetPairOverlap(input.target, input.foregroundTarget),
  ) >= 48
}

function isAvoidedTarget(
  target: { appName?: string, processName?: string, title?: string } | null | undefined,
  avoidSourcePattern?: RegExp,
) {
  if (!avoidSourcePattern)
    return false
  return avoidSourcePattern.test(buildTargetText(target))
}

function isPermissionGrantTarget(
  target: { appName?: string, processName?: string, title?: string } | null | undefined,
) {
  return permissionModalPattern.test(buildTargetText(target))
}

function isWeakFocusTarget(
  target: { appName?: string, processName?: string, title?: string } | null | undefined,
) {
  return isWeakAlicizationScreenSurfaceTarget({
    appName: target?.appName ?? undefined,
    processName: target?.processName ?? undefined,
    title: target?.title ?? undefined,
  })
}

function normalizeRawTarget(target: {
  appName?: string
  processName?: string
  title?: string
} | null | undefined) {
  const appName = normalizeTargetText(target?.appName)
  const processName = normalizeTargetText(target?.processName)
  const title = normalizeTargetText(target?.title)
  if (!appName && !processName && !title)
    return null
  return {
    appName: appName || undefined,
    processName: processName || undefined,
    title: title || undefined,
  }
}

function buildFocusTarget(input: {
  target?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  source: AlicizationScreenSemanticFocusSource
  confidence: number
}) {
  const normalized = normalizeRawTarget(input.target)
  if (!normalized)
    return null
  return {
    ...normalized,
    source: input.source,
    confidence: clampConfidence(input.confidence),
  } satisfies AlicizationScreenSemanticFocusTarget
}

function buildHintTermsFocusTarget(hintTerms: string[]) {
  if (hintTerms.length === 0)
    return null

  const normalizedTerms = hintTerms.map(normalizeText)
  const titleTerms: string[] = []
  let appName = ''
  if (normalizedTerms.some(term => ['visual studio code', 'vscode', 'code'].includes(term)))
    appName = 'Visual Studio Code'
  else if (normalizedTerms.includes('cursor'))
    appName = 'Cursor'
  else if (normalizedTerms.includes('windsurf'))
    appName = 'Windsurf'
  else if (normalizedTerms.includes('xcode'))
    appName = 'Xcode'
  else if (normalizedTerms.some(term => ['terminal', 'iterm', 'warp', 'wezterm'].includes(term)))
    appName = 'Terminal'
  else if (normalizedTerms.some(term => ['docker', 'docker desktop'].includes(term)))
    appName = 'Docker'
  else if (normalizedTerms.some(term => ['github desktop', 'gitkraken', 'fork', 'sourcetree', 'tower'].includes(term)))
    appName = 'Git Tool'

  if (normalizedTerms.includes('diff'))
    titleTerms.push('diff')
  if (normalizedTerms.includes('error') || normalizedTerms.includes('exception') || normalizedTerms.includes('traceback'))
    titleTerms.push('error')
  if (normalizedTerms.includes('test failed'))
    titleTerms.push('test failed')
  if (normalizedTerms.includes('console') || normalizedTerms.includes('log'))
    titleTerms.push('console')

  return buildFocusTarget({
    target: {
      appName: appName || undefined,
      title: titleTerms.length > 0 ? titleTerms.join(' / ') : undefined,
    },
    source: 'hint-terms',
    confidence: appName || titleTerms.length > 0 ? 0.62 : 0,
  })
}

function pickFocusTarget(input: {
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
  }
  attentionAnchor?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  recentObservations?: Array<{
    appName?: string
    processName?: string
    title?: string
  }>
  hintTerms?: string[]
  avoidSourcePattern?: RegExp
}) {
  const attentionAnchor = normalizeRawTarget(input.attentionAnchor)
  if (
    attentionAnchor
    && !isWeakFocusTarget(attentionAnchor)
    && !isAvoidedTarget(attentionAnchor, input.avoidSourcePattern)
    && !isPermissionGrantTarget(attentionAnchor)
  ) {
    return buildFocusTarget({
      target: attentionAnchor,
      source: 'attention-anchor',
      confidence: 0.94,
    })
  }

  const recentObservation = Array.isArray(input.recentObservations)
    ? [...input.recentObservations]
        .reverse()
        .map(normalizeRawTarget)
        .find(target => Boolean(target) && !isWeakFocusTarget(target) && !isAvoidedTarget(target, input.avoidSourcePattern) && !isPermissionGrantTarget(target))
    : null
  if (recentObservation) {
    return buildFocusTarget({
      target: recentObservation,
      source: 'recent-observation',
      confidence: 0.82,
    })
  }

  const foregroundWindow = normalizeRawTarget(input.foregroundWindow)
  if (
    foregroundWindow
    && !isWeakFocusTarget(foregroundWindow)
    && !isAvoidedTarget(foregroundWindow, input.avoidSourcePattern)
    && !isPermissionGrantTarget(foregroundWindow)
  ) {
    return buildFocusTarget({
      target: foregroundWindow,
      source: 'foreground-window',
      confidence: 0.74,
    })
  }

  return buildHintTermsFocusTarget(Array.isArray(input.hintTerms) ? input.hintTerms : [])
}

export function rankScreenSemanticCaptureCandidates(input: {
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
  }
  attentionAnchor?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  recentObservations?: Array<{
    appName?: string
    processName?: string
    title?: string
  }>
  hintTerms?: string[]
  avoidSourcePattern?: RegExp
  sources: DesktopCapturerSource[]
}): AlicizationScreenSemanticCaptureCandidate[] {
  const focusTarget = pickFocusTarget({
    foregroundWindow: input.foregroundWindow,
    attentionAnchor: input.attentionAnchor,
    recentObservations: input.recentObservations,
    hintTerms: input.hintTerms,
    avoidSourcePattern: input.avoidSourcePattern,
  })
  const foregroundTarget = normalizeRawTarget(input.foregroundWindow)
  const title = normalizeText(input.foregroundWindow?.title)
  const appName = normalizeText(input.foregroundWindow?.appName)
  const processName = normalizeText(input.foregroundWindow?.processName)
  const attentionAnchor = {
    title: normalizeText(input.attentionAnchor?.title),
    appName: normalizeText(input.attentionAnchor?.appName),
    processName: normalizeText(input.attentionAnchor?.processName),
  }
  const recentObservations = Array.isArray(input.recentObservations)
    ? input.recentObservations.slice(-3).map(item => ({
        title: normalizeText(item?.title),
        appName: normalizeText(item?.appName),
        processName: normalizeText(item?.processName),
      }))
    : []
  const hintTerms = Array.isArray(input.hintTerms)
    ? [...new Set(input.hintTerms.map(normalizeText).filter(Boolean))]
    : []
  const windowSourceCount = input.sources.reduce((count, source) => count + (normalizeText(source.id).startsWith('window:') ? 1 : 0), 0)
  const focusLockText = normalizeText(buildTargetText(focusTarget))
  const captureIntentText = [
    title,
    appName,
    processName,
    attentionAnchor.title,
    attentionAnchor.appName,
    attentionAnchor.processName,
    ...recentObservations.flatMap(observation => [observation.title, observation.appName, observation.processName]),
    ...hintTerms,
    focusLockText,
  ].filter(Boolean).join('\n')
  const preferCodingCandidate = matchesPattern(captureIntentText, codingSourcePattern) || matchesPattern(captureIntentText, codingContentPattern)
  const preferMediaCandidate = matchesPattern(captureIntentText, mediaSourcePattern)
  const weakFocusTarget = isWeakFocusTarget(focusTarget)
  const externalFocusLocked = Boolean(focusTarget && !weakFocusTarget && !isAvoidedTarget(focusTarget, input.avoidSourcePattern))
  const ranked: Array<AlicizationScreenSemanticCaptureCandidate & { score: number }> = []

  for (const source of input.sources) {
    const sourceName = normalizeText(source.name)
    const sourceId = normalizeText(source.id)
    const isWindowSource = sourceId.startsWith('window:')
    const isScreenSource = sourceId.startsWith('screen:')
    const isAvoidedSelfWindow = isWindowSource && Boolean(input.avoidSourcePattern?.test(source.name))

    if (externalFocusLocked && isAvoidedSelfWindow)
      continue

    let score = 0
    let strategy: AlicizationScreenSemanticSummary['source']['strategy'] = 'screen-fallback'

    if (isWindowSource) {
      const titleScore = overlapScore(sourceName, title)
      const appScore = overlapScore(sourceName, appName)
      const processScore = overlapScore(sourceName, processName)
      const maxFieldScore = Math.max(titleScore, appScore, processScore)
      const liveFocusScore = Math.max(
        scoreTargetOverlap(sourceName, focusTarget),
        scoreTargetOverlap(sourceName, foregroundTarget),
      )
      const anchorScore = Math.max(
        overlapScore(sourceName, attentionAnchor.title),
        overlapScore(sourceName, attentionAnchor.appName),
        overlapScore(sourceName, attentionAnchor.processName),
      )
      const recentScore = recentObservations.reduce((total, observation, index) => {
        if (
          externalFocusLocked
          && !alignsWithLiveFocus({
            target: observation,
            focusTarget,
            foregroundTarget,
          })
        ) {
          return total
        }
        const weight = Math.max(1, 3 - index)
        return total + weight * Math.max(
          overlapScore(sourceName, observation.title),
          overlapScore(sourceName, observation.appName),
          overlapScore(sourceName, observation.processName),
        )
      }, 0)
      const hintScore = hintTerms.reduce((total, term) => total + overlapScore(sourceName, term), 0)
      score = maxFieldScore
      score += Math.round(liveFocusScore * (externalFocusLocked ? 2.2 : 1.6))
      score += Math.round(anchorScore * (externalFocusLocked ? 0.35 : 0.7))
      score += Math.round(recentScore * (externalFocusLocked ? 0.08 : 0.2))
      score += Math.round(hintScore * (externalFocusLocked ? 0.22 : 0.55))
      strategy = titleScore >= appScore && titleScore >= processScore
        ? 'window-title'
        : appScore >= processScore
          ? 'app-name'
          : 'process-name'
      if (liveFocusScore >= 90)
        score += 180
      else if (liveFocusScore >= 48)
        score += 120
      if (externalFocusLocked && liveFocusScore < 24 && anchorScore < 24)
        score -= focusTarget?.source === 'attention-anchor' || focusTarget?.source === 'foreground-window' ? 220 : 140
      const hasAlignmentEvidence = maxFieldScore >= 24
        || liveFocusScore >= 24
        || anchorScore >= 24
        || hintScore >= 24
        || recentScore >= 24
      if (hasAlignmentEvidence)
        score += 80
      else
        score += 12
      if (isWeakAlicizationScreenSurfaceCue(source.name))
        score -= 42
    }
    else if (isScreenSource) {
      score = title || appName || processName || attentionAnchor.title || attentionAnchor.appName || attentionAnchor.processName ? 10 : 20
      if (externalFocusLocked)
        score += 120
      if (weakFocusTarget)
        score -= 120
      if (windowSourceCount > 0)
        score -= 30
      if (isWeakAlicizationScreenSurfaceCue(source.name))
        score -= 24
      strategy = 'screen-fallback'
    }

    if (preferCodingCandidate) {
      if (matchesPattern(sourceName, codingSourcePattern) || matchesPattern(sourceName, codingContentPattern))
        score += 180
      if (matchesPattern(sourceName, chatSourcePattern))
        score -= 140
      if (isScreenSource)
        score -= 40
    }
    else if (preferMediaCandidate) {
      if (matchesPattern(sourceName, mediaSourcePattern))
        score += 140
      if (matchesPattern(sourceName, chatSourcePattern))
        score -= 120
    }

    if (matchesPattern(sourceName, permissionModalPattern))
      score -= preferCodingCandidate ? 260 : 160

    if (input.avoidSourcePattern?.test(source.name))
      score -= 160

    if (score > -160) {
      ranked.push({
        source,
        strategy,
        focusTarget,
        score,
      })
    }
  }

  const sorted = ranked
    .sort((left, right) => right.score - left.score)
  const top = sorted[0]
  if (
    top
    && normalizeText(top.source.id).startsWith('screen:')
    && isWeakAlicizationScreenSurfaceCue(top.source.name)
  ) {
    const fallbackWindow = sorted.find(candidate =>
      normalizeText(candidate.source.id).startsWith('window:')
      && !matchesPattern(normalizeText(candidate.source.name), permissionModalPattern),
    )
    if (fallbackWindow && fallbackWindow.score >= top.score - 72) {
      return [
        fallbackWindow,
        ...sorted.filter(candidate => candidate !== fallbackWindow),
      ].map(({ score: _score, ...candidate }) => candidate)
    }
  }

  return sorted.map(({ score: _score, ...candidate }) => candidate)
}

export function pickScreenSemanticCaptureCandidate(input: {
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
  }
  attentionAnchor?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  recentObservations?: Array<{
    appName?: string
    processName?: string
    title?: string
  }>
  hintTerms?: string[]
  avoidSourcePattern?: RegExp
  sources: DesktopCapturerSource[]
}): AlicizationScreenSemanticCaptureCandidate | null {
  return rankScreenSemanticCaptureCandidates(input)[0] ?? null
}

export function parseScreenSemanticSummary(input: {
  raw: string
  analyzedAt: number
  source: AlicizationScreenSemanticSummary['source']
}) {
  const text = input.raw.trim()
  if (!text.startsWith('{') || !text.endsWith('}'))
    return null

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text) as Record<string, unknown>
  }
  catch {
    return null
  }

  const workloadKind = normalizeText(parsed.workload)
  const contentKind = normalizeText(parsed.content)
  const validWorkloadKinds = ['coding', 'media', 'browser', 'terminal', 'game', 'chat', 'document', 'unknown']
  const validContentKinds = ['error', 'diff', 'doc', 'video', 'music', 'chat', 'gameplay', 'unknown']
  if (!validWorkloadKinds.includes(workloadKind) || !validContentKinds.includes(contentKind))
    return null

  const confidence = clampConfidence(parsed.confidence)
  const matchedLabels = dedupeLabels(parsed.matchedLabels)
  const summary = normalizeSummary(parsed.summary)

  return {
    workload: {
      kind: workloadKind as AlicizationScreenSemanticSummary['workload']['kind'],
      confidence,
      matchedLabels,
    },
    content: {
      kind: contentKind as AlicizationScreenSemanticSummary['content']['kind'],
      confidence,
      matchedLabels,
      summary: summary || undefined,
    },
    analyzedAt: Math.max(0, Math.floor(input.analyzedAt)),
    source: input.source,
  } satisfies AlicizationScreenSemanticSummary
}
