/** A displayed grapheme owns its mouth clock. This is presentation, never PCM energy. */
export interface StageTextPresentation {
  grapheme: string
  phoneme: string
  script: 'pinyin' | 'latin' | 'other' | 'silent'
  offset: number
  durationMs: number
  endsPhrase?: boolean
}

export interface StageTextArticulationFrame extends StageTextPresentation {
  turnId: string
  startedAt: number
  clock?: 'audio'
  audioElapsedMs?: number
}

export interface StageTextMouthShape {
  open: number
  form: number
  round: number
  spread: number
  closed: number
  vowel: string
}

const closed: StageTextMouthShape = { open: 0, form: 0, round: 0, spread: 0, closed: 1, vowel: 'closed' }
const vowels: Record<string, StageTextMouthShape> = {
  a: { open: 0.85, form: 0.12, round: 0, spread: 0.25, closed: 0, vowel: 'A' },
  e: { open: 0.36, form: 0.35, round: 0.08, spread: 0.5, closed: 0, vowel: 'E' },
  i: { open: 0.2, form: 0.8, round: 0, spread: 0.9, closed: 0, vowel: 'I' },
  o: { open: 0.56, form: -0.65, round: 0.85, spread: 0, closed: 0, vowel: 'O' },
  u: { open: 0.24, form: -0.9, round: 1, spread: 0, closed: 0, vowel: 'U' },
  ü: { open: 0.18, form: -0.72, round: 0.88, spread: 0.12, closed: 0, vowel: 'U' },
}

export function resolveStageTextMouthShape(frame: StageTextArticulationFrame, now: number): StageTextMouthShape {
  const elapsed = frame.clock === 'audio' ? frame.audioElapsedMs ?? 0 : now - frame.startedAt
  if (frame.script === 'silent' || !Number.isFinite(elapsed) || !Number.isFinite(frame.durationMs) || frame.durationMs <= 0 || elapsed < 0 || elapsed >= frame.durationMs)
    return closed
  const progress = elapsed / frame.durationMs
  const phoneme = frame.phoneme.toLowerCase().replace(/v/g, 'ü')
  // Mandarin b/p/m require a real closure before the vowel; f touches the lip.
  if (/^[bpm]/.test(phoneme) && progress < 0.24)
    return closed
  if (phoneme.startsWith('f') && progress < 0.22)
    return { ...closed, open: 0.09, form: 0.2, closed: 0.65, vowel: 'F' }
  const finals = [...phoneme.replace(/^(?:zh|ch|sh|[bp-tj-nfdghxzcyw])/, '')].filter(char => vowels[char])
  // y/w spellings encode semivowels, including Mandarin yu/jü/qü/xü.
  if (frame.script === 'pinyin' && /^[yjqx]u/.test(phoneme))
    finals[0] = 'ü'
  const apical = frame.script === 'pinyin' && /^(?:zh|ch|sh|[rzcs])i$/.test(phoneme)
  if (apical)
    finals.length = 0
  const fallback = apical ? { ...vowels.e!, open: 0.22, form: 0.25, spread: 0.3 } : vowels.e!
  // Glide through compound finals instead of snapping between their vowels.
  const position = Math.min(1, Math.max(0, (progress - 0.24) / 0.6)) * Math.max(0, finals.length - 1)
  const index = Math.floor(position)
  const from = vowels[finals[index] ?? ''] ?? fallback
  const to = vowels[finals[Math.min(index + 1, finals.length - 1)] ?? ''] ?? from
  const weight = position - index
  const shape = { ...from, vowel: weight < 0.5 ? from.vowel : to.vowel }
  for (const key of ['open', 'form', 'round', 'spread', 'closed'] as const)
    shape[key] = from[key] + (to[key] - from[key]) * weight
  // Connected syllables keep their aperture; only phrase boundaries release.
  // A deadline still closes stale input, independently of renderer frame rate.
  const release = frame.endsPhrase === false ? 1 : Math.min(1, Math.max(0, (1 - progress) / 0.2))
  return { ...shape, open: shape.open * release }
}
