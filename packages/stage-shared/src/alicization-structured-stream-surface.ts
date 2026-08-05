const structuredEnvelopeKeyPattern = /\\?"format\\?"\s*:\s*\\?"(?:mind-turn-v1|epoch1-v1|fallback-v1|subconscious-[a-z-]+-v1)\\?"|\\?"(?:thought|performance|memoryUsage|governance|embodiment|speechTimeline|embodimentScript|digitalLife|digitalLifeSpine|runtimeDigest|decisionTraceId)\\?"\s*:/iu

function normalizeStructuredSurfaceText(raw: string) {
  return raw.trimStart()
}

function startsWithStructuredEnvelopePrefix(text: string) {
  return text.startsWith('{')
    || text.startsWith('"{')
    || text.startsWith('\'{')
    || /^```(?:json)?/iu.test(text)
}

export function looksLikeAlicizationStructuredPayloadText(text: string) {
  const normalized = normalizeStructuredSurfaceText(text)
  if (!normalized)
    return false

  if (!startsWithStructuredEnvelopePrefix(normalized))
    return false

  return structuredEnvelopeKeyPattern.test(normalized)
}

export function shouldBufferAlicizationStructuredSpeechPrelude(text: string) {
  const normalized = normalizeStructuredSurfaceText(text)
  if (!normalized)
    return false

  if (!startsWithStructuredEnvelopePrefix(normalized))
    return false

  // NOTICE: Once assistant output starts with a JSON/fenced-object prefix in
  // Alicization chat, letting any of it enter the visible bubble is worse than
  // waiting for the final normalized reply. The visible surface is always
  // human-facing dialogue; structured envelopes belong to transport only.
  return structuredEnvelopeKeyPattern.test(normalized)
}
