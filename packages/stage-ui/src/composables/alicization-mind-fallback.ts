import type { AlicizationEmotion, AlicizationMindTurnGovernance } from '../stores/alicization-bridge'

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function pick<T>(...values: Array<T | null | undefined | ''>) {
  for (const value of values) {
    if (value)
      return value
  }
  return null
}

function uniqueSentences(sentences: string[], maxSentences: number) {
  const output: string[] = []
  for (const sentence of sentences) {
    const normalized = sanitizeText(sentence, 220)
    if (!normalized || output.includes(normalized))
      continue
    output.push(normalized)
    if (output.length >= maxSentences)
      break
  }
  return output
}

function resolveEmotion(governance: AlicizationMindTurnGovernance): AlicizationEmotion {
  if (governance.repairState !== 'none')
    return governance.repairState === 'stale-anchor' ? 'apologetic' : 'thinking'
  if (governance.answerAct === 'care' || governance.turnMode === 'care')
    return 'concerned'
  if (governance.answerAct === 'guide' || governance.turnMode === 'guide-current-knot')
    return 'thinking'
  if (governance.turnMode === 'grounded-inspection')
    return 'thinking'
  return governance.relationshipPosture === 'tender' ? 'concerned' : 'neutral'
}

function resolveObligation(governance: AlicizationMindTurnGovernance) {
  switch (governance.answerAct) {
    case 'guide':
      return 'guide'
    case 'care':
      return 'care'
    case 'correct-stale-anchor':
    case 'ask-reground':
      return 'repair'
    case 'defer':
      return 'accompany'
    default:
      break
  }

  switch (governance.turnMode) {
    case 'guide-current-knot':
      return 'guide'
    case 'care':
      return 'care'
    case 'accompany':
      return 'accompany'
    case 'screen-repair':
      return 'repair'
    default:
      return 'answer'
  }
}

function resolveTruth(governance: AlicizationMindTurnGovernance) {
  switch (governance.truthState) {
    case 'live-grounded':
      return 'grounded'
    case 'live-observed':
      return 'coarse'
    case 'remembered':
      return 'memory'
    default:
      return 'uncertain'
  }
}

function resolveTone(governance: AlicizationMindTurnGovernance) {
  switch (governance.relationshipPosture) {
    case 'restrained':
      return 'restrained'
    case 'tender':
      return 'tender'
    default:
      return governance.turnMode === 'guide-current-knot' || governance.repairState !== 'none'
        ? 'direct'
        : 'warm'
  }
}

function resolveAnchor(governance: AlicizationMindTurnGovernance, userText?: string) {
  return sanitizeText(
    pick(
      governance.focusAnchor,
      governance.liveSurface,
      governance.answerIntent,
      governance.carriedThread,
      userText,
    ),
    120,
  )
}

export interface AlicizationMindFallbackSurface {
  thought: string
  emotion: AlicizationEmotion
  reply: string
}

export function buildMindGovernedFallbackSurface(input: {
  governance?: AlicizationMindTurnGovernance | null
  userText?: string
  translate: (path: string, params?: Record<string, unknown>) => string
}): AlicizationMindFallbackSurface | null {
  const governance = input.governance
  if (!governance)
    return null

  const anchor = resolveAnchor(governance, input.userText)
  if (!anchor && governance.repairState === 'none' && !sanitizeText(governance.answerIntent))
    return null

  const t = input.translate
  const sentences: string[] = []

  if (governance.repairState === 'stale-anchor') {
    sentences.push(t('mind-fallback.repair-stale-anchor'))
  }
  else if (governance.repairState === 'need-reground') {
    sentences.push(t('mind-fallback.repair-need-reground'))
  }
  else if (governance.turnMode === 'guide-current-knot') {
    sentences.push(t('mind-fallback.guide-opening', {
      focus: anchor || t('mind-fallback.focus-default'),
    }))
  }
  else if (governance.turnMode === 'care') {
    sentences.push(t('mind-fallback.care-opening', {
      focus: anchor || t('mind-fallback.focus-default'),
    }))
  }
  else if (governance.turnMode === 'accompany') {
    sentences.push(t('mind-fallback.accompany-opening', {
      focus: anchor || t('mind-fallback.focus-default'),
    }))
  }
  else if (governance.turnMode === 'grounded-inspection') {
    sentences.push(t('mind-fallback.observation-opening', {
      focus: anchor || t('mind-fallback.focus-default'),
    }))
  }
  else {
    sentences.push(t('mind-fallback.answer-opening', {
      focus: anchor || t('mind-fallback.focus-default'),
    }))
  }

  if (governance.labelCarryAsMemory && governance.carriedThread) {
    sentences.push(t('mind-fallback.carry-memory', {
      carry: governance.carriedThread,
    }))
  }

  if (governance.shouldAskForGrounding) {
    sentences.push(t('mind-fallback.reground-note'))
  }

  const intent = sanitizeText(governance.answerIntent, 160)
  if (intent && intent !== anchor)
    sentences.push(intent)

  const maxSentences = Math.max(1, Math.min(3, governance.maxSentences || 2))
  const finalSentences = uniqueSentences(sentences, maxSentences)
  if (finalSentences.length === 0)
    return null

  const focus = anchor
    ? anchor.toLowerCase().replace(/\s+/g, '-').slice(0, 48)
    : 'current-user-turn'
  const move = sanitizeText(
    pick(governance.openingMove, governance.answerIntent, governance.focusAnchor, governance.liveSurface),
    64,
  ).toLowerCase().replace(/\s+/g, '-')
  || 'stabilize-and-answer'

  return {
    thought: [
      `obligation=${resolveObligation(governance)}`,
      `truth=${resolveTruth(governance)}`,
      `focus=${focus}`,
      `move=${move}`,
      `tone=${resolveTone(governance)}`,
    ].join('; '),
    emotion: resolveEmotion(governance),
    reply: finalSentences.join(' '),
  }
}
