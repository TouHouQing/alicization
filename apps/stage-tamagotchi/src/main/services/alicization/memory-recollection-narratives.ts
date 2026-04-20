import type { OrganicMemoryPromptContext } from './runtime-soul'

type AlicizationMemoryRecollectionIntentSnapshot = NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
type AlicizationMemoryRecollectionWindow = NonNullable<OrganicMemoryPromptContext['recollectedWindows']>[number]

export interface AlicizationMemoryRecollectionNarrative {
  mode: 'conversation-history' | 'autobiographical-history' | 'relationship-history' | 'execution-procedure' | 'experience-pattern'
  certainty: 'firm' | 'approximate' | 'fragmentary'
  opening: string
  supportCues: string[]
  confidence: number
}

type AlicizationNarrativeMode = AlicizationMemoryRecollectionNarrative['mode']

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 5) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function certaintyFromWindow(window: AlicizationMemoryRecollectionWindow): AlicizationMemoryRecollectionNarrative['certainty'] {
  if (window.dominantProvenance === 'reconstructed' || window.confidence < 0.5)
    return 'fragmentary'
  if (window.dominantProvenance === 'inferred' || window.confidence < 0.72)
    return 'approximate'
  return 'firm'
}

function buildOpening(intent: AlicizationMemoryRecollectionIntentSnapshot, window: AlicizationMemoryRecollectionWindow) {
  const summary = sanitizeText(window.summary || window.label, 180)
  if (intent.mode === 'relationship-history')
    return `What comes back first in our bond history is ${summary}.`
  if (intent.mode === 'autobiographical-history')
    return `What comes back first in my own continuity is ${summary}.`
  if (intent.mode === 'conversation-history')
    return `What I first remember us circling around is ${summary}.`
  if (intent.mode === 'execution-procedure')
    return `The way I remember handling this kind of thing is ${summary}.`
  return `The experience pattern that comes back first is ${summary}.`
}

export function buildMemoryRecollectionNarratives(input: {
  intent: AlicizationMemoryRecollectionIntentSnapshot | null | undefined
  recollectedWindows?: OrganicMemoryPromptContext['recollectedWindows']
}): AlicizationMemoryRecollectionNarrative[] {
  const intent = input.intent ?? null
  const windows = input.recollectedWindows ?? []
  if (!intent || intent.mode === 'none' || windows.length === 0)
    return []

  return windows
    .map((window) => ({
      mode: intent.mode as AlicizationNarrativeMode,
      certainty: certaintyFromWindow(window),
      opening: buildOpening(intent, window),
      supportCues: uniqueList(window.cues, 4),
      confidence: clamp01((window.confidence * 0.72) + (intent.confidence * 0.28)),
    }) satisfies AlicizationMemoryRecollectionNarrative)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 3)
}
