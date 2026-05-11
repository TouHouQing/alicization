export type AlicizationEmbodimentLipSyncMode
  = 'energy-only'
    | 'energy-phoneme-hybrid'

export type AlicizationEmbodimentViseme = 'A' | 'E' | 'I' | 'O' | 'U' | 'closed'

export interface AlicizationEmbodimentLipSyncVisemeHint {
  segmentId: string
  viseme: AlicizationEmbodimentViseme
  weight: number
}

export interface AlicizationEmbodimentLipSyncPlan {
  mode: AlicizationEmbodimentLipSyncMode
  visemeHints?: AlicizationEmbodimentLipSyncVisemeHint[]
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

function normalizeVisemeHint(raw: unknown): AlicizationEmbodimentLipSyncVisemeHint | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const segmentId = normalizeText(candidate.segmentId, 120)
  const viseme = normalizeViseme(candidate.viseme)
  if (!segmentId || !viseme)
    return null

  return {
    segmentId,
    viseme,
    weight: normalizeUnit(candidate.weight),
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
