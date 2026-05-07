import type { AlicizationDialogueStructuredFormat } from '../../../shared/eventa'

export const normalDialogueStructuredFormats = [
  'subconscious-proactive-v1',
  'subconscious-proactive-llm-v1',
  'subconscious-reminder-v1',
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

  if (normalized === 'epoch1-v1' && input.hasGovernance && input.origin !== 'subconscious-proactive') {
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
