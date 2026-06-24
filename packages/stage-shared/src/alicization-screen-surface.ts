function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeComparisonText(raw: unknown) {
  return sanitizeText(raw, 240).normalize('NFKC').toLowerCase()
}

const internalScreenNarrationPattern = /living seam|current knot|carried continuity|truth seam|epistemic|governing|foreground thread|residue|afterglow|repair ahead of fluency|which belief is stale memory|still reflects the current world|where exactly is the real knot|present-tense scene claims are constrained|stale anchor or ungrounded seam|window-level cues only explain surface context|窗口级线索只能说明表层上下文|宿主(?:正在审视|还在沿着|刚从|现在更像是在浏览|正?把当前注意力放在|停留在|正?把注意力压在)|她(?:还没重新看见|还想再确认一次|把这一刻读成|更想先护住|像是在沿着|像是在衡量)|真正卡住的是哪一处|误把路过窗口当作问题核心/iu
const shellOnlyCuePattern = /^(?:screen(?:\s*\d+)?|display(?:\s*\d+)?|entire screen|desktop|workspace|window(?:\s*\d+)?|current screen|current view|当前屏幕|当前画面|unknown|none|null|n\/a)$/iu
const vagueAppCuePattern = /^(?:code|browser|terminal|player|music|video|chat|document|editor|ide|app|application)$/iu
const genericFallbackCueSet = new Set([
  'current screen',
  'coding workspace',
  'terminal session',
  'browser page',
  'media view',
  'chat window',
  'document view',
  'game window',
  'error view',
  'diff view',
  'video playback',
  'music playback',
])
const weakSemanticTokenSet = new Set([
  'screen',
  'display',
  'desktop',
  'workspace',
  'window',
  'entire',
  'code',
  'vscode',
  'cursor',
  'idea',
  'intellij',
  'browser',
  'chrome',
  'terminal',
  'iterm',
  'warp',
  'chat',
  'app',
  'application',
])

function splitCuePieces(raw: unknown) {
  const normalized = sanitizeText(raw, 240)
  if (!normalized)
    return []

  return normalized
    .split(/\s+\|\s+|\n+/u)
    .map(piece => sanitizeText(piece, 180))
    .filter(Boolean)
}

function extractSemanticTokens(raw: string) {
  return (raw.match(/[\p{Letter}\p{Number}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) ?? [])
    .filter(token => [...token].length >= 2)
}

function countSemanticTokens(raw: string) {
  return extractSemanticTokens(raw).length
}

function cueLooksInternal(raw: string) {
  return internalScreenNarrationPattern.test(raw)
}

export function isWeakAlicizationScreenSurfaceCue(raw: unknown) {
  const normalized = sanitizeText(raw, 180)
  if (!normalized)
    return true
  const normalizedLower = normalizeComparisonText(normalized)
  if (cueLooksInternal(normalized))
    return true
  if (shellOnlyCuePattern.test(normalized))
    return true
  if (genericFallbackCueSet.has(normalizedLower))
    return true
  const semanticTokens = extractSemanticTokens(normalizedLower)
  if (semanticTokens.length > 0) {
    const meaningfulTokens = semanticTokens.filter(token => !weakSemanticTokenSet.has(token) && !/^\d+$/.test(token))
    const mentionsShellScreen = /\b(?:screen|display|desktop|workspace|window)\b/u.test(normalizedLower)
    if (mentionsShellScreen && meaningfulTokens.length === 0)
      return true
  }
  return false
}

function isVagueAppCue(raw: string) {
  return vagueAppCuePattern.test(raw)
}

function normalizeCueCandidate(raw: unknown) {
  const normalized = sanitizeText(raw, 180)
  if (!normalized || cueLooksInternal(normalized))
    return ''
  return normalized
}

function similarity(left: string, right: string) {
  const normalizedLeft = normalizeComparisonText(left)
  const normalizedRight = normalizeComparisonText(right)
  if (!normalizedLeft || !normalizedRight)
    return 0
  if (normalizedLeft === normalizedRight)
    return 1
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
    return 0.84

  const leftTokens = new Set(extractSemanticTokens(normalizedLeft))
  const rightTokens = extractSemanticTokens(normalizedRight)
  if (leftTokens.size === 0 || rightTokens.length === 0)
    return 0

  const overlap = rightTokens.filter(token => leftTokens.has(token)).length
  return overlap / Math.max(leftTokens.size, rightTokens.length)
}

function countNovelCueTokens(raw: string, anchors: Array<string | undefined>) {
  const anchorTokens = new Set(
    anchors
      .filter(Boolean)
      .flatMap(anchor => extractSemanticTokens(String(anchor))),
  )
  if (anchorTokens.size === 0)
    return 0

  return extractSemanticTokens(raw).filter(token => !anchorTokens.has(token)).length
}

function buildFallbackDescriptor(input: {
  scenario?: string | null
  workloadKind?: string | null
  contentKind?: string | null
}) {
  if (input.contentKind === 'error')
    return 'error view'
  if (input.contentKind === 'diff')
    return 'diff view'
  if (input.contentKind === 'doc')
    return 'document view'
  if (input.contentKind === 'video')
    return 'video playback'
  if (input.contentKind === 'music')
    return 'music playback'
  if (input.contentKind === 'chat')
    return 'chat view'
  if (input.contentKind === 'gameplay')
    return 'gameplay view'
  if (input.workloadKind === 'coding' || input.scenario === 'coding')
    return 'coding workspace'
  if (input.workloadKind === 'terminal')
    return 'terminal session'
  if (input.workloadKind === 'browser')
    return 'browser page'
  if (input.workloadKind === 'media' || input.scenario === 'media')
    return 'media view'
  if (input.workloadKind === 'chat')
    return 'chat window'
  if (input.workloadKind === 'document')
    return 'document view'
  if (input.workloadKind === 'game')
    return 'game window'
  return 'current screen'
}

type AlicizationScreenSurfaceCueSource
  = | 'raw'
    | 'target-title'
    | 'target-app'
    | 'target-process'
    | 'target-app-title'
    | 'target-process-title'

interface AlicizationScreenSurfaceCueCandidate {
  text: string
  source: AlicizationScreenSurfaceCueSource
  order: number
}

function scoreCue(candidate: AlicizationScreenSurfaceCueCandidate, input: {
  targetTitle?: string
  appName?: string
  processName?: string
}) {
  const text = candidate.text
  let score = 0
  if (isWeakAlicizationScreenSurfaceCue(text))
    score -= 6
  if (isVagueAppCue(text))
    score -= 2

  const tokenCount = countSemanticTokens(text)
  score += Math.min(4, tokenCount)
  const novelTokenCount = countNovelCueTokens(text, [
    input.targetTitle,
    input.appName,
    input.processName,
  ])

  if (text.length >= 12)
    score += 1
  if (/\d/.test(text))
    score += 0.3
  if (/[A-Z]/.test(text) || /\p{Script=Han}/u.test(text))
    score += 0.5

  if (input.targetTitle && similarity(text, input.targetTitle) >= 0.72)
    score += 1.2
  if (input.appName && similarity(text, input.appName) >= 0.72)
    score += 0.6
  if (input.processName && similarity(text, input.processName) >= 0.72)
    score += 0.3

  if (candidate.source === 'raw') {
    score += 0.9
    if (novelTokenCount >= 2)
      score += Math.min(2.4, novelTokenCount * 0.6)
  }

  if (candidate.source === 'target-title')
    score -= 0.15
  if (candidate.source === 'target-app' || candidate.source === 'target-process')
    score -= 0.45
  if (candidate.source === 'target-app-title' || candidate.source === 'target-process-title') {
    score -= 1.5
    if (novelTokenCount === 0)
      score -= 0.9
  }

  return score
}

export interface AlicizationScreenSurfaceTargetLike {
  appName?: string | null
  processName?: string | null
  title?: string | null
}

const weakBrowserTargetPattern = /\b(?:google chrome|chrome|arc|safari|firefox|edge|brave|browser)\b/i

export function isWeakAlicizationScreenSurfaceTarget(target: AlicizationScreenSurfaceTargetLike | null | undefined) {
  const appName = normalizeCueCandidate(target?.appName)
  const processName = normalizeCueCandidate(target?.processName)
  const title = normalizeCueCandidate(target?.title)
  if (!appName && !processName && !title)
    return true

  const appProcessText = [appName, processName].filter(Boolean).join(' ')
  const appProcessWeak = appProcessText ? isWeakAlicizationScreenSurfaceCue(appProcessText) : false
  const browserWithoutTitle = !title && weakBrowserTargetPattern.test(appProcessText)
  if (browserWithoutTitle)
    return true

  if (!title)
    return false

  const titleWeak = isWeakAlicizationScreenSurfaceCue(title)
  if (!titleWeak)
    return false

  const appProcessTokens = extractSemanticTokens(normalizeComparisonText(appProcessText))
  const appProcessAllWeakTokens = appProcessTokens.length > 0
    && appProcessTokens.every(token => weakSemanticTokenSet.has(token) || /^\d+$/.test(token))

  return appProcessWeak || appProcessAllWeakTokens || Boolean(!appProcessText)
}

export interface AlicizationScreenSurfaceCueInput {
  rawCues?: Array<unknown>
  target?: AlicizationScreenSurfaceTargetLike | null
  scenario?: string | null
  workloadKind?: string | null
  contentKind?: string | null
}

export function buildAlicizationScreenSurfaceCue(input: AlicizationScreenSurfaceCueInput) {
  const title = normalizeCueCandidate(input.target?.title)
  const appName = normalizeCueCandidate(input.target?.appName)
  const processName = normalizeCueCandidate(input.target?.processName)
  const rawCandidates = (input.rawCues ?? [])
    .flatMap(splitCuePieces)
    .map(normalizeCueCandidate)
    .map(text => sanitizeText(text, 180))
    .filter(Boolean)
    .map((text): AlicizationScreenSurfaceCueCandidate => ({
      text,
      source: 'raw',
      order: 0,
    }))
  const candidates = [
    ...rawCandidates,
    title ? { text: title, source: 'target-title', order: 1 } satisfies AlicizationScreenSurfaceCueCandidate : null,
    appName ? { text: appName, source: 'target-app', order: 2 } satisfies AlicizationScreenSurfaceCueCandidate : null,
    processName ? { text: processName, source: 'target-process', order: 3 } satisfies AlicizationScreenSurfaceCueCandidate : null,
    appName && title && similarity(appName, title) < 0.72
      ? { text: `${appName} · ${title}`, source: 'target-app-title', order: 4 } satisfies AlicizationScreenSurfaceCueCandidate
      : null,
    processName && title && similarity(processName, title) < 0.72
      ? { text: `${processName} · ${title}`, source: 'target-process-title', order: 5 } satisfies AlicizationScreenSurfaceCueCandidate
      : null,
  ]
    .filter((value): value is AlicizationScreenSurfaceCueCandidate => Boolean(value))
    .reduce<AlicizationScreenSurfaceCueCandidate[]>((acc, candidate) => {
      if (!acc.some(existing => existing.text === candidate.text))
        acc.push(candidate)
      return acc
    }, [])

  const ranked = candidates
    .map((candidate, index) => ({
      ...candidate,
      score: scoreCue(candidate, {
        targetTitle: title || undefined,
        appName: appName || undefined,
        processName: processName || undefined,
      }) + Math.max(0, 0.7 - index * 0.05) - candidate.order * 0.03,
      index,
    }))
    .sort((left, right) => (right.score - left.score) || (left.index - right.index))

  const best = ranked.find(candidate => candidate.score >= 1.5)
  if (best)
    return best.text

  const informativeApp = [appName, processName].find(candidate => candidate && !isVagueAppCue(candidate) && !isWeakAlicizationScreenSurfaceCue(candidate)) || ''
  const informativeTitle = !isWeakAlicizationScreenSurfaceCue(title) ? title : ''
  if (informativeApp && informativeTitle && similarity(informativeApp, informativeTitle) < 0.72)
    return `${informativeApp} · ${informativeTitle}`
  if (informativeTitle)
    return informativeTitle
  if (informativeApp)
    return informativeApp

  return buildFallbackDescriptor({
    scenario: input.scenario ?? null,
    workloadKind: input.workloadKind ?? null,
    contentKind: input.contentKind ?? null,
  })
}
