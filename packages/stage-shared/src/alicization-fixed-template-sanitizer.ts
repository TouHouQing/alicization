export const alicizationFixedTemplateReplacement
  = ''

function normalizeFixedTemplateText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

function isSerializedStructuredPayload(text: string) {
  if (!text.startsWith('{') && !text.startsWith('['))
    return false

  try {
    const parsed = JSON.parse(text)
    return parsed !== null && typeof parsed === 'object'
  }
  catch {
    return false
  }
}

function looksLikeStructuredInternalFactText(text: string) {
  if (isSerializedStructuredPayload(text))
    return false
  if (/=\s*[\p{L}_][\p{L}\p{N}_-]*\s*=/iu.test(text))
    return false

  const segments = text
    .split(/\s*[;|]\s*/u)
    .map(segment => segment.trim())
    .filter(Boolean)
  return segments.length > 0 && segments.every(segment =>
    /^[\p{L}_][\p{L}\p{N}_-]*\s*=\s*[\p{L}\p{N}_./:+-]+$/u.test(segment),
  )
}

export function containsAlicizationFixedTemplateResidue(raw: unknown) {
  if (typeof raw === 'string' && isSerializedStructuredPayload(raw.trim()))
    return false
  const normalized = normalizeFixedTemplateText(raw, 2400)
  return Boolean(normalized) && looksLikeStructuredInternalFactText(normalized)
}

export function sanitizeAlicizationProviderFacingText(
  raw: unknown,
  maxChars = 360,
  replacement = '',
) {
  const serializedPayload = typeof raw === 'string' && isSerializedStructuredPayload(raw.trim())
  const normalized = normalizeFixedTemplateText(raw, maxChars)
  if (!normalized)
    return ''
  return !serializedPayload && looksLikeStructuredInternalFactText(normalized)
    ? replacement
    : normalized
}

export function sanitizeAlicizationMemoryEvidenceText(
  raw: unknown,
  maxChars = 360,
) {
  const serializedPayload = typeof raw === 'string' && isSerializedStructuredPayload(raw.trim())
  const normalized = normalizeFixedTemplateText(raw, 2400)
  if (!normalized)
    return ''

  return !serializedPayload && looksLikeStructuredInternalFactText(normalized)
    ? ''
    : normalized.slice(0, Math.max(0, maxChars)).trim()
}

export function sanitizeAlicizationStructuredInternalText(
  raw: unknown,
  maxChars = 360,
  replacement = alicizationFixedTemplateReplacement,
) {
  const serializedPayload = typeof raw === 'string' && isSerializedStructuredPayload(raw.trim())
  const normalized = normalizeFixedTemplateText(raw, maxChars)
  if (!normalized)
    return ''

  return !serializedPayload && looksLikeStructuredInternalFactText(normalized)
    ? replacement
    : normalized
}
