export const alicizationFixedTemplateReplacement
  = ''

export interface AlicizationFixedTemplateSanitizerContext {
  role?: string | null
  source?: string | null
  origin?: string | null
  provenance?: string | null
  schemaType?: string | null
  visibility?: string | null
}

function normalizeFixedTemplateText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

function normalizeStructuredFactCandidate(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().slice(0, Math.max(0, maxChars)).trim()
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

function normalizeContextSignal(raw: unknown) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

function hasInternalStructuredProvenance(context?: AlicizationFixedTemplateSanitizerContext | null) {
  if (!context)
    return false

  const signals = [
    context.role,
    context.source,
    context.origin,
    context.provenance,
    context.schemaType,
    context.visibility,
  ].map(normalizeContextSignal)

  return signals.includes('internal-structured-fact')
}

function looksLikeStructuredInternalFactText(text: string) {
  if (isSerializedStructuredPayload(text))
    return false

  const segments = text
    .split(/\s*(?:[;|]|\r?\n)+\s*/u)
    .map(segment => segment.trim())
    .filter(Boolean)
  return segments.length > 0 && segments.every(segment =>
    /^[\p{L}_][\p{L}\p{N}_.-]*\s*=\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s;|=]+)$/u.test(segment),
  )
}

export function containsAlicizationFixedTemplateResidue(
  raw: unknown,
  context?: AlicizationFixedTemplateSanitizerContext | null,
) {
  if (!hasInternalStructuredProvenance(context))
    return false
  if (typeof raw === 'string' && isSerializedStructuredPayload(raw.trim()))
    return false
  const normalized = normalizeStructuredFactCandidate(raw, 2400)
  return Boolean(normalized) && looksLikeStructuredInternalFactText(normalized)
}

export function sanitizeAlicizationProviderFacingText(
  raw: unknown,
  maxChars = 360,
  replacement = '',
  context?: AlicizationFixedTemplateSanitizerContext | null,
) {
  const serializedPayload = typeof raw === 'string' && isSerializedStructuredPayload(raw.trim())
  const normalized = normalizeFixedTemplateText(raw, maxChars)
  if (!normalized)
    return ''
  return !serializedPayload && containsAlicizationFixedTemplateResidue(raw, context)
    ? replacement
    : normalized
}

export function sanitizeAlicizationMemoryEvidenceText(
  raw: unknown,
  maxChars = 360,
  context?: AlicizationFixedTemplateSanitizerContext | null,
) {
  const serializedPayload = typeof raw === 'string' && isSerializedStructuredPayload(raw.trim())
  const normalized = normalizeFixedTemplateText(raw, 2400)
  if (!normalized)
    return ''

  return !serializedPayload && containsAlicizationFixedTemplateResidue(raw, context)
    ? ''
    : normalized.slice(0, Math.max(0, maxChars)).trim()
}

export function sanitizeAlicizationStructuredInternalText(
  raw: unknown,
  maxChars = 360,
  replacement = alicizationFixedTemplateReplacement,
  context?: AlicizationFixedTemplateSanitizerContext | null,
) {
  const serializedPayload = typeof raw === 'string' && isSerializedStructuredPayload(raw.trim())
  const normalized = normalizeFixedTemplateText(raw, maxChars)
  if (!normalized)
    return ''

  return !serializedPayload && containsAlicizationFixedTemplateResidue(raw, context)
    ? replacement
    : normalized
}
