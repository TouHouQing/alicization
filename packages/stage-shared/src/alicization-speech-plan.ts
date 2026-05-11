export type AlicizationEmbodimentSpeechInterruptPolicy = 'hard-stop' | 'soft-settle'

export interface AlicizationEmbodimentSpeechSegment {
  id: string
  index: number
  text: string
  interruptPolicy: AlicizationEmbodimentSpeechInterruptPolicy
  preRollMs: number
  settleMs: number
}

export interface AlicizationEmbodimentSpeechPlan {
  segments: AlicizationEmbodimentSpeechSegment[]
  interruptPolicy: AlicizationEmbodimentSpeechInterruptPolicy
  preRollMs: number
  settleMs: number
}

function normalizeText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeNonNegativeInteger(raw: unknown, fallback = 0) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return fallback
  return Math.max(0, Math.floor(value))
}

function normalizeInterruptPolicy(raw: unknown): AlicizationEmbodimentSpeechInterruptPolicy {
  return raw === 'soft-settle' ? 'soft-settle' : 'hard-stop'
}

function normalizeSpeechSegment(raw: unknown, fallbackIndex: number): AlicizationEmbodimentSpeechSegment | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const id = normalizeText(candidate.id, 120)
  const text = normalizeText(candidate.text, 600)
  if (!id || !text)
    return null

  return {
    id,
    index: normalizeNonNegativeInteger(candidate.index, fallbackIndex),
    text,
    interruptPolicy: normalizeInterruptPolicy(candidate.interruptPolicy),
    preRollMs: normalizeNonNegativeInteger(candidate.preRollMs),
    settleMs: normalizeNonNegativeInteger(candidate.settleMs, 160),
  }
}

export function normalizeAlicizationEmbodimentSpeechPlan(raw: unknown): AlicizationEmbodimentSpeechPlan | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  if (!Array.isArray(candidate.segments))
    return null

  const segments = candidate.segments
    .map((segment, index) => normalizeSpeechSegment(segment, index))
    .filter((segment): segment is AlicizationEmbodimentSpeechSegment => Boolean(segment))
  if (segments.length !== candidate.segments.length)
    return null

  return {
    segments,
    interruptPolicy: normalizeInterruptPolicy(candidate.interruptPolicy),
    preRollMs: normalizeNonNegativeInteger(candidate.preRollMs),
    settleMs: normalizeNonNegativeInteger(candidate.settleMs, 160),
  }
}
