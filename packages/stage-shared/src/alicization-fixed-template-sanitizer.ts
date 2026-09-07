export const alicizationFixedTemplateReplacement
  = ''

export interface AlicizationFixedTemplateSanitizerContext {
  role?: string | null
  source?: string | null
  origin?: string | null
  provenance?: string | null
  schemaType?: string | null
  visibility?: string | null
  fragmentPolicy?: 'strip' | 'drop-only'
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

function shouldDropOnlyInternalFragments(context?: AlicizationFixedTemplateSanitizerContext | null) {
  return context?.fragmentPolicy === 'drop-only'
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

function looksLikeInternalCueText(text: string) {
  const normalized = text
    .trim()
    .replace(/[。.!！]+$/u, '')
    .replace(/\s+/gu, ' ')
    .toLowerCase()

  if (!normalized)
    return false

  if (/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/u.test(normalized)) {
    return /digest|cue|policy|governance|canonical|prompt|visibility|project|runtime|state|cadence|opening/u
      .test(normalized)
  }

  return [
    'structured continuity digest',
    'project state brief',
    'runtime mind state',
    'canonical reply',
  ].includes(normalized)
}

const internalCueFragmentPatterns = [
  /autobiographical\s+phase/giu,
  /emotion\s*:[\p{L}\p{N}_-]+/gu,
  /recollection(?::[\p{L}\p{N}_-]+){1,4}/gu,
  /cleaned:working-memory-long-term(?::[^\s;|,，。！？]*)?/giu,
  /(?:opening_policy|relationship_cadence)\s*[:=]\s*[^\s;|,，。！？]+/giu,
  /visibility\s*=\s*redacted_internal/giu,
  /(?:pre_turn_context_digest|structured-state|project-state-brief|runtime-mind-state)/giu,
  /(?:answer_evidence|recall_mode|kernel_[\p{L}\p{N}_-]+)\s*[:=]\s*[^\s;|,，。！？]+/giu,
]

function hasStrongInternalCueFragment(text: string) {
  return internalCueFragmentPatterns.some((pattern) => {
    pattern.lastIndex = 0
    return pattern.test(text)
  })
}

function hasInternalCueFragment(text: string) {
  const normalized = text.trim().replace(/\s+/gu, ' ')
  return hasStrongInternalCueFragment(text) || normalized === '共同经历'
}

function stripInternalCueFragments(text: string) {
  let stripped = text
  for (const pattern of internalCueFragmentPatterns) {
    pattern.lastIndex = 0
    stripped = stripped.replace(pattern, ' ')
  }
  if (hasStrongInternalCueFragment(text) || stripped.trim() === '共同经历')
    stripped = stripped.replace(/共同经历/gu, ' ')

  return stripped
    .replace(/\s*[,，;；|:：]\s*/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
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
  return Boolean(normalized) && (
    looksLikeStructuredInternalFactText(normalized)
    || looksLikeInternalCueText(normalized)
    || hasInternalCueFragment(normalized)
  )
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
  if (serializedPayload || !hasInternalStructuredProvenance(context))
    return normalized
  if (!containsAlicizationFixedTemplateResidue(raw, context))
    return normalized
  if (
    looksLikeStructuredInternalFactText(normalizeStructuredFactCandidate(raw, 2400))
    || looksLikeInternalCueText(normalized)
  ) {
    return replacement
  }
  if (shouldDropOnlyInternalFragments(context))
    return normalized

  const stripped = stripInternalCueFragments(normalized)
  return !stripped
    || looksLikeStructuredInternalFactText(stripped)
    || looksLikeInternalCueText(stripped)
    ? replacement
    : stripped
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

  if (serializedPayload || !hasInternalStructuredProvenance(context))
    return normalized.slice(0, Math.max(0, maxChars)).trim()
  if (!containsAlicizationFixedTemplateResidue(raw, context))
    return normalized.slice(0, Math.max(0, maxChars)).trim()
  if (
    looksLikeStructuredInternalFactText(normalizeStructuredFactCandidate(raw, 2400))
    || looksLikeInternalCueText(normalized)
  ) {
    return ''
  }
  if (shouldDropOnlyInternalFragments(context))
    return normalized.slice(0, Math.max(0, maxChars)).trim()

  const stripped = stripInternalCueFragments(normalized)
  return !stripped
    || looksLikeStructuredInternalFactText(stripped)
    || looksLikeInternalCueText(stripped)
    ? ''
    : stripped.slice(0, Math.max(0, maxChars)).trim()
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

  if (serializedPayload || !hasInternalStructuredProvenance(context))
    return normalized
  if (!containsAlicizationFixedTemplateResidue(raw, context))
    return normalized
  if (
    looksLikeStructuredInternalFactText(normalizeStructuredFactCandidate(raw, 2400))
    || looksLikeInternalCueText(normalized)
  ) {
    return replacement
  }
  if (shouldDropOnlyInternalFragments(context))
    return normalized

  const stripped = stripInternalCueFragments(normalized)
  return !stripped
    || looksLikeStructuredInternalFactText(stripped)
    || looksLikeInternalCueText(stripped)
    ? replacement
    : stripped
}
