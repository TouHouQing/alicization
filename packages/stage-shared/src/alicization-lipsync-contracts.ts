export type AlicizationEmbodimentLipSyncMode
  = 'energy-only'
    | 'energy-phoneme-hybrid'

export type AlicizationEmbodimentViseme = 'A' | 'E' | 'I' | 'O' | 'U' | 'closed'
export type AlicizationEmbodimentLipSyncVisemeSource
  = 'prosody-authority'
    | 'timeline-projection'
    | 'digital-life-projection'
    | 'cue-bridge'

export interface AlicizationEmbodimentLipSyncVisemeHint {
  segmentId: string
  viseme: AlicizationEmbodimentViseme
  weight: number
  source: AlicizationEmbodimentLipSyncVisemeSource
  confidence: number
}

export interface AlicizationEmbodimentLipSyncPlan {
  mode: AlicizationEmbodimentLipSyncMode
  visemeHints?: AlicizationEmbodimentLipSyncVisemeHint[]
}

const EMBODIMENT_SEGMENT_ID_MAX_CHARS = 512

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

function normalizeRequiredUnit(raw: unknown): number | null {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return null
  return Math.max(0, Math.min(1, value))
}

function normalizeLipSyncMode(raw: unknown): AlicizationEmbodimentLipSyncMode {
  return raw === 'energy-phoneme-hybrid'
    ? raw
    : 'energy-only'
}

function normalizeViseme(raw: unknown): AlicizationEmbodimentViseme | null {
  return raw === 'A'
    || raw === 'E'
    || raw === 'I'
    || raw === 'O'
    || raw === 'U'
    || raw === 'closed'
    ? raw
    : null
}

function normalizeVisemeSource(raw: unknown): AlicizationEmbodimentLipSyncVisemeSource | null {
  return raw === 'prosody-authority'
    || raw === 'timeline-projection'
    || raw === 'digital-life-projection'
    || raw === 'cue-bridge'
    ? raw
    : null
}

function normalizeVisemeHint(raw: unknown): AlicizationEmbodimentLipSyncVisemeHint | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const segmentId = normalizeText(candidate.segmentId, EMBODIMENT_SEGMENT_ID_MAX_CHARS)
  const viseme = normalizeViseme(candidate.viseme)
  const source = normalizeVisemeSource(candidate.source)
  const confidence = normalizeRequiredUnit(candidate.confidence)
  if (!segmentId || !viseme || !source || confidence === null)
    return null

  return {
    segmentId,
    viseme,
    weight: normalizeUnit(candidate.weight),
    source,
    confidence,
  }
}

export function normalizeAlicizationEmbodimentLipSyncPlan(raw: unknown): AlicizationEmbodimentLipSyncPlan | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  if (candidate.mode !== 'energy-only' && candidate.mode !== 'energy-phoneme-hybrid')
    return null

  const visemeHints = Array.isArray(candidate.visemeHints)
    ? candidate.visemeHints
        .map(normalizeVisemeHint)
        .filter((hint): hint is AlicizationEmbodimentLipSyncVisemeHint => Boolean(hint))
    : []
  if (Array.isArray(candidate.visemeHints) && visemeHints.length !== candidate.visemeHints.length)
    return null

  return {
    mode: normalizeLipSyncMode(candidate.mode),
    visemeHints: visemeHints.length > 0 ? visemeHints : undefined,
  }
}
