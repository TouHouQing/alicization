const cjkSequencePattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/u
const alphaNumericPattern = /^[\p{Letter}\p{Number}_-]+$/u

const segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('und', { granularity: 'word' })
  : null

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function normalizeSemanticText(value: unknown) {
  return typeof value === 'string'
    ? value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
    : ''
}

function pushSemanticToken(target: Set<string>, rawToken: string) {
  const token = normalizeSemanticText(rawToken)
  if (!token)
    return

  if (cjkSequencePattern.test(token)) {
    // NOTICE: Once the runtime has already segmented CJK text into words,
    // exploding it into adjacent bigrams creates noisy overlaps between
    // unrelated Chinese/Japanese dialogue turns and older scene summaries.
    if ([...token].length >= 2)
      target.add(token)
    return
  }

  if (alphaNumericPattern.test(token) && token.length >= 2)
    target.add(token)
}

export function extractDialogueSemanticTerms(text: string) {
  const normalized = normalizeSemanticText(text)
  if (!normalized)
    return []

  const tokens = new Set<string>()
  if (segmenter) {
    for (const part of segmenter.segment(normalized)) {
      const segment = normalizeSemanticText(part.segment)
      if (!segment)
        continue
      if (!part.isWordLike && !cjkSequencePattern.test(segment))
        continue
      pushSemanticToken(tokens, segment)
    }
  }
  else {
    for (const match of normalized.matchAll(/[\p{Letter}\p{Number}_-]+/gu))
      pushSemanticToken(tokens, match[0] ?? '')
  }

  return [...tokens]
}

export function measureDialogueFocusAlignment(input: {
  message: string
  contextPhrases?: string[]
}) {
  const messageTerms = extractDialogueSemanticTerms(input.message)
  const contextTerms = new Set<string>()
  for (const phrase of input.contextPhrases ?? []) {
    for (const term of extractDialogueSemanticTerms(phrase))
      contextTerms.add(term)
  }

  const overlapTerms = messageTerms.filter(term => contextTerms.has(term))
  const overlapDenominator = Math.max(1, Math.min(4, messageTerms.length))
  return {
    messageTerms,
    overlapTerms,
    overlapRatio: clamp01(overlapTerms.length / overlapDenominator),
  }
}
