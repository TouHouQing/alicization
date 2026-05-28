export type AlicizationSpeechProsodyIntentLanguage = 'zh-CN' | 'zh-HK' | 'zh-TW'
export type AlicizationSpeechProsodyPauseClass
  = 'none'
    | 'comma'
    | 'enumeration'
    | 'full-stop'
    | 'ellipsis'
    | 'question'
    | 'exclaim'
export type AlicizationSpeechProsodyPhraseBoundary = 'none' | 'soft' | 'hard'
export type AlicizationSpeechProsodyContour = 'flat' | 'rising' | 'falling' | 'dip-rise'

export interface AlicizationSpeechProsodyIntent {
  language: AlicizationSpeechProsodyIntentLanguage
  pauseClass: AlicizationSpeechProsodyPauseClass
  phraseBoundary: AlicizationSpeechProsodyPhraseBoundary
  contour: AlicizationSpeechProsodyContour
  emphasisWord: string | null
  emphasisStrength: number
  tempoShift: number
}

function normalizeText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeUnit(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function normalizeSignedUnit(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return 0
  return Math.max(-1, Math.min(1, value))
}

function normalizeLanguage(raw: unknown): AlicizationSpeechProsodyIntentLanguage {
  return raw === 'zh-HK' || raw === 'zh-TW' || raw === 'zh-CN'
    ? raw
    : null as never
}

function normalizePauseClass(raw: unknown): AlicizationSpeechProsodyPauseClass {
  return raw === 'comma'
    || raw === 'enumeration'
    || raw === 'full-stop'
    || raw === 'ellipsis'
    || raw === 'question'
    || raw === 'exclaim'
    || raw === 'none'
    ? raw
    : null as never
}

function normalizePhraseBoundary(raw: unknown): AlicizationSpeechProsodyPhraseBoundary {
  return raw === 'soft' || raw === 'hard' || raw === 'none'
    ? raw
    : null as never
}

function normalizeContour(raw: unknown): AlicizationSpeechProsodyContour {
  return raw === 'rising' || raw === 'falling' || raw === 'dip-rise' || raw === 'flat'
    ? raw
    : null as never
}

export function normalizeAlicizationSpeechProsodyIntent(raw: unknown): AlicizationSpeechProsodyIntent | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const language = normalizeLanguage(candidate.language)
  const pauseClass = normalizePauseClass(candidate.pauseClass)
  const phraseBoundary = normalizePhraseBoundary(candidate.phraseBoundary)
  const contour = normalizeContour(candidate.contour)
  const emphasisWord = normalizeText(candidate.emphasisWord, 120) || null
  if (!language || !pauseClass || !phraseBoundary || !contour)
    return null

  return {
    language,
    pauseClass,
    phraseBoundary,
    contour,
    emphasisWord,
    emphasisStrength: normalizeUnit(candidate.emphasisStrength),
    tempoShift: normalizeSignedUnit(candidate.tempoShift),
  }
}
