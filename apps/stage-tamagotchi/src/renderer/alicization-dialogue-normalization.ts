import type { AlicizationDialogueStructuredFormat, AlicizationProactiveMetadata } from '../shared/eventa'

const supportedStructuredFormats = [
  'subconscious-proactive-v1',
  'subconscious-proactive-llm-v1',
  'subconscious-reminder-v1',
  'epoch1-v1',
  'fallback-v1',
] as const satisfies AlicizationDialogueStructuredFormat[]

export function normalizeStructuredFormat(raw: unknown): AlicizationDialogueStructuredFormat {
  const candidate = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return supportedStructuredFormats.find(format => format === candidate) ?? 'fallback-v1'
}

export function normalizeProactiveMetadata(raw: unknown): AlicizationProactiveMetadata | undefined {
  const candidate = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  if (!candidate)
    return undefined

  const scenario = typeof candidate.scenario === 'string'
    && ['coding', 'media', 'late-night-care', 'general'].includes(candidate.scenario)
    ? candidate.scenario as AlicizationProactiveMetadata['scenario']
    : null
  const style = typeof candidate.style === 'string'
    && ['silent-observe', 'light-nudge', 'gentle-care', 'firm-warning'].includes(candidate.style)
    ? candidate.style as AlicizationProactiveMetadata['style']
    : null
  const urgency = typeof candidate.urgency === 'string'
    && ['low', 'medium', 'high'].includes(candidate.urgency)
    ? candidate.urgency as AlicizationProactiveMetadata['urgency']
    : null
  if (!scenario || !style || !urgency)
    return undefined

  const confidence = Number(candidate.confidence)
  const cooldownMs = Number(candidate.cooldownMs)
  const feedbackWindowMs = Number(candidate.feedbackWindowMs)
  const policyVersion = typeof candidate.policyVersion === 'string' ? candidate.policyVersion.trim() : ''
  if (!Number.isFinite(confidence) || !Number.isFinite(cooldownMs) || !Number.isFinite(feedbackWindowMs) || !policyVersion)
    return undefined

  const reasonCodes = Array.isArray(candidate.reasonCodes)
    ? candidate.reasonCodes.filter((reasonCode): reasonCode is AlicizationProactiveMetadata['reasonCodes'][number] => typeof reasonCode === 'string')
    : []

  return {
    shouldInterrupt: candidate.shouldInterrupt === true,
    confidence,
    reasonCodes,
    urgency,
    style,
    cooldownMs,
    scenario,
    policyVersion,
    feedbackWindowMs,
  }
}
