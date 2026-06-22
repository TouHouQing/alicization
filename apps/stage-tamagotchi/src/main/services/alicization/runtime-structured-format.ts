import type {
  AlicizationDialogueRespondedPayload,
  AlicizationDialogueStructuredFormat,
} from '../../../shared/eventa'

const autonomousDialogueStructuredFormatByKind = {
  'subconscious-proactive': 'subconscious-proactive-v1',
  'subconscious-proactive-llm': 'subconscious-proactive-llm-v1',
  'subconscious-reminder': 'subconscious-reminder-v1',
} as const satisfies Record<
  'subconscious-proactive' | 'subconscious-proactive-llm' | 'subconscious-reminder',
  AlicizationDialogueStructuredFormat
>

const autonomousDialogueTurnIdPrefixByKind = {
  'execution-callback': 'execution-callback:',
  'reminder': 'reminder:',
  'subconscious': 'subconscious:',
} as const

export const autonomousDialogueStructuredFormats = [
  autonomousDialogueStructuredFormatByKind['subconscious-proactive'],
  autonomousDialogueStructuredFormatByKind['subconscious-proactive-llm'],
  autonomousDialogueStructuredFormatByKind['subconscious-reminder'],
] as const satisfies readonly AlicizationDialogueStructuredFormat[]

export const autonomousDialogueTurnIdPrefixes = [
  autonomousDialogueTurnIdPrefixByKind['execution-callback'],
  autonomousDialogueTurnIdPrefixByKind.reminder,
  autonomousDialogueTurnIdPrefixByKind.subconscious,
] as const

export const autonomousDialogueOrigins = [
  'subconscious-proactive',
] as const satisfies readonly AlicizationDialogueRespondedPayload['origin'][]

export type AlicizationAutonomousDialogueStructuredFormatKind
  = keyof typeof autonomousDialogueStructuredFormatByKind

export type AlicizationAutonomousDialogueTurnKind
  = keyof typeof autonomousDialogueTurnIdPrefixByKind

export type AlicizationAutonomousDialogueOriginKind = 'proactive'

export interface AlicizationAutonomousDialogueFamilyClassification {
  isAutonomous: boolean
  matchedBy: Array<'turn-id-prefix' | 'structured-format' | 'origin'>
  canonicalOrigin: typeof autonomousDialogueOrigins[number] | null
}

export const normalDialogueStructuredFormats = [
  ...autonomousDialogueStructuredFormats,
  'mind-turn-v1',
] as const satisfies AlicizationDialogueStructuredFormat[]

export const legacyDialogueStructuredFormats = [
  'epoch1-v1',
  'fallback-v1',
] as const satisfies AlicizationDialogueStructuredFormat[]

export const supportedDialogueStructuredFormats = [
  ...normalDialogueStructuredFormats,
  ...legacyDialogueStructuredFormats,
] as const satisfies AlicizationDialogueStructuredFormat[]

export type AlicizationStructuredFormatLane = 'normal' | 'legacy-input' | 'infra-fallback'

export interface AlicizationStructuredFormatResolution {
  format: AlicizationDialogueStructuredFormat | undefined
  lane: AlicizationStructuredFormatLane | null
  rawFormat: string
  legacyInputFormat: 'epoch1-v1' | 'fallback-v1' | null
}

export function normalizeDialogueStructuredFormat(raw: unknown, fallback?: AlicizationDialogueStructuredFormat) {
  const candidate = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  const normalized = supportedDialogueStructuredFormats.find(format => format === candidate)
  return normalized ?? fallback
}

export function isAlicizationAutonomousDialogueStructuredFormat(raw: unknown) {
  const normalized = normalizeDialogueStructuredFormat(raw)
  return Boolean(
    normalized
    && (autonomousDialogueStructuredFormats as readonly AlicizationDialogueStructuredFormat[]).includes(normalized),
  )
}

export function resolveAlicizationAutonomousDialogueStructuredFormat(
  kind: AlicizationAutonomousDialogueStructuredFormatKind,
) {
  return autonomousDialogueStructuredFormatByKind[kind]
}

export function hasAlicizationAutonomousDialogueTurnIdPrefix(raw: unknown) {
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return autonomousDialogueTurnIdPrefixes.some(prefix => normalized.startsWith(prefix))
}

export function buildAlicizationAutonomousDialogueTurnId(input: {
  kind: AlicizationAutonomousDialogueTurnKind
  segments: readonly (string | number)[]
}) {
  const prefix = autonomousDialogueTurnIdPrefixByKind[input.kind]
  const serializedSegments = input.segments.map(segment => String(segment)).join(':')

  return serializedSegments
    ? `${prefix}${serializedSegments}`
    : prefix.slice(0, Math.max(prefix.length - 1, 0))
}

export function isAlicizationAutonomousDialogueOrigin(
  raw: unknown,
): raw is typeof autonomousDialogueOrigins[number] {
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return (autonomousDialogueOrigins as readonly string[]).includes(normalized)
}

export function resolveAlicizationAutonomousDialogueOrigin(
  kind: AlicizationAutonomousDialogueOriginKind,
): typeof autonomousDialogueOrigins[number] {
  if (kind === 'proactive')
    return 'subconscious-proactive'

  return autonomousDialogueOrigins[0]
}

export function resolveAlicizationAutonomousDialogueFamilyClassification(input: {
  turnId?: unknown
  rawFormat?: unknown
  origin?: unknown
}): AlicizationAutonomousDialogueFamilyClassification {
  const matchedBy: AlicizationAutonomousDialogueFamilyClassification['matchedBy'] = []

  if (hasAlicizationAutonomousDialogueTurnIdPrefix(input.turnId))
    matchedBy.push('turn-id-prefix')
  if (isAlicizationAutonomousDialogueStructuredFormat(input.rawFormat))
    matchedBy.push('structured-format')
  if (isAlicizationAutonomousDialogueOrigin(input.origin))
    matchedBy.push('origin')

  return {
    isAutonomous: matchedBy.length > 0,
    matchedBy,
    canonicalOrigin: matchedBy.length > 0
      ? resolveAlicizationAutonomousDialogueOrigin('proactive')
      : null,
  }
}

export function isAlicizationAutonomousDialogueFamily(input: {
  turnId?: unknown
  rawFormat?: unknown
  origin?: unknown
}) {
  return resolveAlicizationAutonomousDialogueFamilyClassification(input).isAutonomous
}

export function resolveAlicizationStructuredFormatLane(
  format: AlicizationDialogueStructuredFormat | undefined,
): AlicizationStructuredFormatLane | null {
  if (!format)
    return null
  if (format === 'fallback-v1')
    return 'infra-fallback'
  if (format === 'epoch1-v1')
    return 'legacy-input'
  return 'normal'
}

export function resolveAlicizationRuntimeMindTurnStructuredFormat(input: {
  rawFormat: unknown
  contractFailed?: boolean
  hasGovernance?: boolean
  origin?: string | null
}): AlicizationStructuredFormatResolution {
  const normalized = normalizeDialogueStructuredFormat(
    input.rawFormat,
    input.contractFailed ? 'fallback-v1' : undefined,
  )
  const legacyInputFormat = normalized === 'epoch1-v1' || normalized === 'fallback-v1'
    ? normalized
    : null
  const normalizedOrigin = typeof input.origin === 'string'
    ? input.origin.trim().toLowerCase()
    : ''

  if (normalized === 'epoch1-v1' && input.hasGovernance && !isAlicizationAutonomousDialogueOrigin(normalizedOrigin)) {
    return {
      format: 'mind-turn-v1',
      lane: 'legacy-input',
      rawFormat: typeof input.rawFormat === 'string' ? input.rawFormat.trim().toLowerCase() : '',
      legacyInputFormat: 'epoch1-v1',
    }
  }

  return {
    format: normalized,
    lane: resolveAlicizationStructuredFormatLane(normalized),
    rawFormat: typeof input.rawFormat === 'string' ? input.rawFormat.trim().toLowerCase() : '',
    legacyInputFormat,
  }
}
