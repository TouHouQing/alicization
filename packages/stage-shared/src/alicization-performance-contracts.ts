export const alicizationEmotionWhitelist = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'concerned',
  'tired',
  'apologetic',
  'surprised',
  'thinking',
] as const

export type AlicizationEmotion = typeof alicizationEmotionWhitelist[number]

export type AlicizationPerformanceDelivery
  = | 'calm'
    | 'gentle'
    | 'firm'
    | 'energetic'
    | 'hesitant'
    | 'teasing'

export type AlicizationPerformanceResidentMode
  = | 'dialogue'
    | 'quiet-companionship'
    | 'quiet-accompaniment'
    | 'measured-return'
    | 'repair-before-closeness'
    | 'same-thread-continuation'
    | 'idle-recovering'

export interface AlicizationDialoguePerformancePayload {
  baseEmotion: AlicizationEmotion
  emotion: AlicizationEmotion
  facialCue?: string | null
  actionCue?: string | null
  delivery: AlicizationPerformanceDelivery
  emphasis: 0 | 1 | 2
  residentMode?: AlicizationPerformanceResidentMode | null
  face?: {
    residentMode?: AlicizationPerformanceResidentMode | null
  } | null
  action?: {
    residentMode?: AlicizationPerformanceResidentMode | null
  } | null
}

export interface CharacterFacialCapability {
  key: string
  label: string
  description: string
  source: 'preset' | 'custom'
  affectsMouth: boolean
}

export interface CharacterActionCapability {
  key: string
  label: string
  description: string
  source: 'builtin' | 'external-vrma' | 'live2d-motion'
}

export interface CharacterPerformanceEmbodimentEmotionHint {
  preferredExpressionAliases?: readonly string[]
  preferredMotionAliases?: readonly string[]
  preferredFacialCues?: readonly string[]
  preferredActionCues?: readonly string[]
}

export type CharacterPerformanceEmbodimentHints = Partial<Record<AlicizationEmotion, CharacterPerformanceEmbodimentEmotionHint>>

export interface CharacterPerformanceCapabilitiesManifest {
  renderer: 'live2d' | 'vrm'
  supportedBaseEmotions: AlicizationEmotion[]
  supportedFacialCues: CharacterFacialCapability[]
  supportedActions: CharacterActionCapability[]
  supportsLookAt: boolean
  supportsVisemeLipSync: boolean
  supportsMicroDynamics: boolean
  embodimentHints?: CharacterPerformanceEmbodimentHints | null
}

export interface AlicizationPerformanceManifestClampResult {
  performance: AlicizationDialoguePerformancePayload
  downgradedBaseEmotion?: AlicizationEmotion
  droppedFacialCue?: string
  droppedActionCue?: string
}

const alicizationPerformanceDeliveryWhitelist = [
  'calm',
  'gentle',
  'firm',
  'energetic',
  'hesitant',
  'teasing',
] as const

function normalizePerformanceCue(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  return normalized ? normalized.slice(0, 80) : null
}

function normalizePerformanceEmphasis(raw: unknown): 0 | 1 | 2 {
  const parsed = typeof raw === 'number'
    ? raw
    : typeof raw === 'string'
      ? Number.parseInt(raw, 10)
      : Number.NaN

  if (!Number.isFinite(parsed))
    return 0
  if (parsed <= 0)
    return 0
  if (parsed >= 2)
    return 2
  return 1
}

function normalizePerformanceResidentMode(raw: unknown): AlicizationPerformanceResidentMode | null {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  if (
    normalized === 'dialogue'
    || normalized === 'quiet-companionship'
    || normalized === 'quiet-accompaniment'
    || normalized === 'measured-return'
    || normalized === 'repair-before-closeness'
    || normalized === 'same-thread-continuation'
    || normalized === 'idle-recovering'
  ) {
    return normalized
  }

  return null
}

function normalizeHintAlias(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim().slice(0, 80)
}

function normalizeHintAliasList(raw: unknown) {
  if (!Array.isArray(raw))
    return []

  const aliases = raw
    .map(alias => normalizeHintAlias(alias))
    .filter(Boolean)

  return [...new Set(aliases)]
}

function sanitizePerformanceFacialCapability(raw: unknown): CharacterFacialCapability | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const key = normalizePerformanceCue(candidate.key)
  const label = normalizePerformanceCue(candidate.label)
  const description = normalizePerformanceCue(candidate.description)
  const source = candidate.source === 'preset' || candidate.source === 'custom'
    ? candidate.source
    : null
  if (!key || !label || !description || !source)
    return null

  return {
    key,
    label,
    description,
    source,
    affectsMouth: candidate.affectsMouth === true,
  }
}

function sanitizePerformanceActionCapability(raw: unknown): CharacterActionCapability | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const key = normalizePerformanceCue(candidate.key)
  const label = normalizePerformanceCue(candidate.label)
  const description = normalizePerformanceCue(candidate.description)
  const source = candidate.source === 'builtin'
    || candidate.source === 'external-vrma'
    || candidate.source === 'live2d-motion'
    ? candidate.source
    : null
  if (!key || !label || !description || !source)
    return null

  return {
    key,
    label,
    description,
    source,
  }
}

export function normalizeAlicizationEmotion(raw: unknown): { emotion: AlicizationEmotion, rawEmotion?: string, downgraded: boolean } {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (value === 'processing' || value === 'think') {
    return {
      emotion: 'thinking',
      rawEmotion: value,
      downgraded: true,
    }
  }

  if ((alicizationEmotionWhitelist as readonly string[]).includes(value)) {
    return {
      emotion: value as AlicizationEmotion,
      downgraded: false,
    }
  }

  return {
    emotion: 'neutral',
    rawEmotion: value || undefined,
    downgraded: Boolean(value),
  }
}

export function normalizeAlicizationPerformanceDelivery(raw: unknown): AlicizationPerformanceDelivery {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if ((alicizationPerformanceDeliveryWhitelist as readonly string[]).includes(value))
    return value as AlicizationPerformanceDelivery
  return 'calm'
}

export function normalizeAlicizationPerformancePayload(
  raw: unknown,
  fallbackEmotion: AlicizationEmotion = 'neutral',
): AlicizationDialoguePerformancePayload {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
  const normalizedEmotion = normalizeAlicizationEmotion(candidate.baseEmotion ?? candidate.emotion ?? fallbackEmotion)

  return {
    baseEmotion: normalizedEmotion.emotion,
    emotion: normalizedEmotion.emotion,
    facialCue: normalizePerformanceCue(candidate.facialCue),
    actionCue: normalizePerformanceCue(candidate.actionCue),
    delivery: normalizeAlicizationPerformanceDelivery(candidate.delivery),
    emphasis: normalizePerformanceEmphasis(candidate.emphasis),
    residentMode: normalizePerformanceResidentMode(candidate.residentMode),
    face: candidate.face && typeof candidate.face === 'object' && !Array.isArray(candidate.face)
      ? {
          residentMode: normalizePerformanceResidentMode((candidate.face as Record<string, unknown>).residentMode),
        }
      : null,
    action: candidate.action && typeof candidate.action === 'object' && !Array.isArray(candidate.action)
      ? {
          residentMode: normalizePerformanceResidentMode((candidate.action as Record<string, unknown>).residentMode),
        }
      : null,
  }
}

export function sanitizeCharacterPerformanceEmbodimentHints(raw: unknown): CharacterPerformanceEmbodimentHints | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const next: CharacterPerformanceEmbodimentHints = {}

  for (const emotion of alicizationEmotionWhitelist) {
    const hintRaw = candidate[emotion]
    if (!hintRaw || typeof hintRaw !== 'object' || Array.isArray(hintRaw))
      continue

    const hintCandidate = hintRaw as Record<string, unknown>
    const preferredExpressionAliases = normalizeHintAliasList(hintCandidate.preferredExpressionAliases)
    const preferredMotionAliases = normalizeHintAliasList(hintCandidate.preferredMotionAliases)
    const preferredFacialCues = normalizeHintAliasList(hintCandidate.preferredFacialCues)
    const preferredActionCues = normalizeHintAliasList(hintCandidate.preferredActionCues)
    if (
      preferredExpressionAliases.length === 0
      && preferredMotionAliases.length === 0
      && preferredFacialCues.length === 0
      && preferredActionCues.length === 0
    ) {
      continue
    }

    next[emotion] = {
      preferredExpressionAliases: preferredExpressionAliases.length > 0 ? preferredExpressionAliases : undefined,
      preferredMotionAliases: preferredMotionAliases.length > 0 ? preferredMotionAliases : undefined,
      preferredFacialCues: preferredFacialCues.length > 0 ? preferredFacialCues : undefined,
      preferredActionCues: preferredActionCues.length > 0 ? preferredActionCues : undefined,
    }
  }

  return Object.keys(next).length > 0 ? next : null
}

export function sanitizeCharacterPerformanceManifest(raw: unknown): CharacterPerformanceCapabilitiesManifest | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const renderer = candidate.renderer === 'vrm' ? 'vrm' : candidate.renderer === 'live2d' ? 'live2d' : null
  if (!renderer)
    return null

  const supportedBaseEmotions = Array.isArray(candidate.supportedBaseEmotions)
    ? candidate.supportedBaseEmotions
        .map(value => normalizeAlicizationEmotion(value).emotion)
        .filter((value, index, current) => current.indexOf(value) === index)
    : []

  const supportedFacialCues = Array.isArray(candidate.supportedFacialCues)
    ? candidate.supportedFacialCues
        .map(item => sanitizePerformanceFacialCapability(item))
        .filter((item): item is CharacterFacialCapability => Boolean(item))
    : []

  const supportedActions = Array.isArray(candidate.supportedActions)
    ? candidate.supportedActions
        .map(item => sanitizePerformanceActionCapability(item))
        .filter((item): item is CharacterActionCapability => Boolean(item))
    : []

  return {
    renderer,
    supportedBaseEmotions,
    supportedFacialCues,
    supportedActions,
    supportsLookAt: candidate.supportsLookAt === true,
    supportsVisemeLipSync: candidate.supportsVisemeLipSync === true,
    supportsMicroDynamics: candidate.supportsMicroDynamics === true,
    embodimentHints: sanitizeCharacterPerformanceEmbodimentHints(candidate.embodimentHints),
  }
}

function resolveManifestFallbackEmotion(
  manifest: CharacterPerformanceCapabilitiesManifest,
  fallbackEmotion: AlicizationEmotion,
) {
  if (manifest.supportedBaseEmotions.includes(fallbackEmotion))
    return fallbackEmotion
  if (manifest.supportedBaseEmotions.includes('neutral'))
    return 'neutral'
  return manifest.supportedBaseEmotions[0] ?? 'neutral'
}

export function clampAlicizationPerformancePayloadToManifest(
  payload: AlicizationDialoguePerformancePayload,
  manifest?: CharacterPerformanceCapabilitiesManifest | null,
  fallbackEmotion: AlicizationEmotion = 'neutral',
): AlicizationPerformanceManifestClampResult {
  const normalized = normalizeAlicizationPerformancePayload(payload, fallbackEmotion)
  if (!manifest) {
    return {
      performance: normalized,
    }
  }

  const facialCueKeys = new Set(manifest.supportedFacialCues.map(item => item.key))
  const actionCueKeys = new Set(manifest.supportedActions.map(item => item.key))
  const resolvedFallbackEmotion = resolveManifestFallbackEmotion(manifest, fallbackEmotion)
  const nextBaseEmotion = manifest.supportedBaseEmotions.includes(normalized.baseEmotion)
    ? normalized.baseEmotion
    : resolvedFallbackEmotion
  const nextFacialCue = normalized.facialCue && facialCueKeys.has(normalized.facialCue)
    ? normalized.facialCue
    : null
  const nextActionCue = normalized.actionCue && actionCueKeys.has(normalized.actionCue)
    ? normalized.actionCue
    : null

  return {
    performance: {
      ...normalized,
      baseEmotion: nextBaseEmotion,
      emotion: nextBaseEmotion,
      facialCue: nextFacialCue,
      actionCue: nextActionCue,
    },
    downgradedBaseEmotion: nextBaseEmotion !== normalized.baseEmotion
      ? normalized.baseEmotion
      : undefined,
    droppedFacialCue: normalized.facialCue && nextFacialCue === null
      ? normalized.facialCue
      : undefined,
    droppedActionCue: normalized.actionCue && nextActionCue === null
      ? normalized.actionCue
      : undefined,
  }
}
