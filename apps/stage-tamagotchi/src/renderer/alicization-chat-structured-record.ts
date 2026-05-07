import { normalizeAlicizationDigitalLifeSpineDigest } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { normalizeProactiveMetadata, normalizeStructuredFormat } from './alicization-dialogue-normalization'

export function normalizeChatStructuredRecord(raw: unknown, fallbackReply: string) {
  const structured = raw && typeof raw === 'object'
    ? raw as Record<string, unknown>
    : {}
  const normalizedFormat = normalizeStructuredFormat(structured.format)

  return {
    ...structured,
    thought: typeof structured.thought === 'string' ? structured.thought.trim() : '',
    emotion: typeof structured.emotion === 'string' ? structured.emotion.trim() : 'neutral',
    reply: typeof structured.reply === 'string' && structured.reply.trim()
      ? structured.reply.trim()
      : fallbackReply,
    format: normalizedFormat ?? 'mind-turn-v1',
    legacyFormat: normalizedFormat === 'epoch1-v1' || normalizedFormat === 'fallback-v1'
      ? normalizedFormat
      : undefined,
    malformedFormat: normalizedFormat ? undefined : String(structured.format ?? '').trim() || undefined,
    proactive: normalizeProactiveMetadata(structured.proactive),
    digitalLifeSpine: normalizeAlicizationDigitalLifeSpineDigest(structured.digitalLifeSpine),
  }
}

export function resolveVisibleReasoning(
  structured: ReturnType<typeof normalizeChatStructuredRecord>,
  origin: 'subconscious-proactive' | 'user-turn',
) {
  if (origin === 'subconscious-proactive')
    return ''
  if (structured.format.startsWith('subconscious-'))
    return ''
  return structured.thought
}
