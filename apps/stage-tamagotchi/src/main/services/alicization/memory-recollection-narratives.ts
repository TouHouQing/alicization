import type { OrganicMemoryPromptContext } from './runtime-soul'

type AlicizationMemoryRecollectionIntentSnapshot = NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
type AlicizationMemoryRecollectionWindow = NonNullable<OrganicMemoryPromptContext['recollectedWindows']>[number]

export interface AlicizationMemoryRecollectionNarrative {
  mode: 'conversation-history' | 'autobiographical-history' | 'relationship-history' | 'execution-procedure' | 'experience-pattern'
  certainty: 'firm' | 'approximate' | 'fragmentary'
  recallCenter: string
  recallPressure: 'low' | 'medium' | 'high'
  evidenceCues: string[]
  provenancePosture: 'lived' | 'reconstructed' | 'inferred-or-dreamt'
  speakerInstruction: string
  /**
   * @deprecated Compatibility only. Do not treat as visible wording.
   */
  opening: string
  /**
   * @deprecated Use evidenceCues.
   */
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

function recallPressureFromWindow(input: {
  intent: AlicizationMemoryRecollectionIntentSnapshot
  window: AlicizationMemoryRecollectionWindow
}): AlicizationMemoryRecollectionNarrative['recallPressure'] {
  const confidence = clamp01((input.window.confidence * 0.72) + (input.intent.confidence * 0.28))
  if (confidence >= 0.78 && input.window.dominantProvenance !== 'reconstructed')
    return 'high'
  if (confidence >= 0.58)
    return 'medium'
  return 'low'
}

function provenancePostureFromWindow(window: AlicizationMemoryRecollectionWindow): AlicizationMemoryRecollectionNarrative['provenancePosture'] {
  if (window.dominantProvenance === 'observed' || window.dominantProvenance === 'remembered')
    return 'lived'
  if (window.dominantProvenance === 'reconstructed')
    return 'reconstructed'
  return 'inferred-or-dreamt'
}

function speakerInstructionForMode(mode: AlicizationMemoryRecollectionIntentSnapshot['mode']) {
  if (mode === 'relationship-history')
    return 'Let the relationship era shape stance only after the current answer has room for it.'
  if (mode === 'autobiographical-history')
    return 'Let self-continuity shape the answer without reciting a fixed memory opener.'
  if (mode === 'conversation-history')
    return 'Use the remembered conversation as context, not as a copied opening line.'
  if (mode === 'execution-procedure')
    return 'Use the remembered procedure to guide the payoff, not to announce a memory template.'
  return 'Use the experience pattern as inward context and let the LLM author the visible wording.'
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
    .map((window) => {
      const recallCenter = sanitizeText(window.summary || window.label, 180)
      const evidenceCues = uniqueList(window.cues, 4)
      return {
        mode: intent.mode as AlicizationNarrativeMode,
        certainty: certaintyFromWindow(window),
        recallCenter,
        recallPressure: recallPressureFromWindow({ intent, window }),
        evidenceCues,
        provenancePosture: provenancePostureFromWindow(window),
        speakerInstruction: speakerInstructionForMode(intent.mode),
        opening: recallCenter,
        supportCues: evidenceCues,
        confidence: clamp01((window.confidence * 0.72) + (intent.confidence * 0.28)),
      } satisfies AlicizationMemoryRecollectionNarrative
    })
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 3)
}
