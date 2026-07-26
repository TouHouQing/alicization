import { containsAlicizationFixedTemplateResidue } from './alicization-fixed-template-sanitizer'

const PROJECT_AWARENESS_RETURN_MAX_CHARS = 3200

const INTERNAL_PROJECT_AWARENESS_FACT_PATTERN
  = /(?:^|[\s|;])(?:authority|bodycontinuityphase|continuity|continuity_anchor|embodiment_lanes|evidence|landed|lane|missing_lanes|next|open|pending_lanes|pending-rejoin|project_state_review|remaining-open|signature|source|status|summary)\s*=/iu

const LEGACY_PROJECT_AWARENESS_CUE_PATTERN
  = /\b(?:identity[-_]continuity|local[_ -]desktop[_ -]life[_ -]loop|measured[-_]return|opening[_ -]policy|phase\s*1|project[_ -]state(?:\s+(?:awareness|brief|continuity|cue|summary)|\s*:)|redacted[_ -]internal|relationship[_ -]cadence|repair[-_]before[-_]closeness|rest[-_]protective|same[-_]her|still[-_]voiced)\b|(?:same-segment\s+)?(?:body|face|motion|lipsync|voice)(?:\+(?:body|face|motion|lipsync|voice))*\s+recovery@|\bBefore (?:answering|acting|speaking)\b|回答前先记住|开口前先记住|先记住这是同一个(?:她| her)|别把这条线(?:忘了|弄丢)|keep (?:(?:this|the) )?same digital life project in view|same digital life \|\s*keep(?: the)?(?: desktop)? closure(?: seam| line)? explicit/iu

function sanitizeProjectAwarenessText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function containsProjectAwarenessFixedTemplateResidue(raw: unknown) {
  const normalized = sanitizeProjectAwarenessText(raw, PROJECT_AWARENESS_RETURN_MAX_CHARS)
  return Boolean(normalized) && (
    containsAlicizationFixedTemplateResidue(normalized)
    || INTERNAL_PROJECT_AWARENESS_FACT_PATTERN.test(normalized)
    || LEGACY_PROJECT_AWARENESS_CUE_PATTERN.test(normalized)
  )
}

export function isAlicizationThinSamePhaseCarryLine(text: unknown) {
  return containsProjectAwarenessFixedTemplateResidue(text)
}

export function scoreAlicizationProjectAwarenessLine(value: string | null | undefined) {
  const normalized = sanitizeProjectAwarenessText(value, PROJECT_AWARENESS_RETURN_MAX_CHARS)
  if (!normalized)
    return 0
  if (containsProjectAwarenessFixedTemplateResidue(normalized))
    return -8

  const wordCount = normalized.split(/\s+/u).filter(Boolean).length
  if (normalized.length >= 160 || wordCount >= 24)
    return 3
  if (normalized.length >= 96 || wordCount >= 14)
    return 2
  return 1
}

export function isAlicizationThinProjectAwarenessLine(value: string | null | undefined) {
  const normalized = sanitizeProjectAwarenessText(value, PROJECT_AWARENESS_RETURN_MAX_CHARS)
  return !normalized || containsProjectAwarenessFixedTemplateResidue(normalized)
}

export function resolveAlicizationProjectPreDialogueAwarenessLine(input?: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return null

  const candidate = input as Record<string, unknown>
  const projectStates = [candidate.runtimeProjectState, candidate.fallbackProjectState]
  for (const projectState of projectStates) {
    if (!projectState || typeof projectState !== 'object' || Array.isArray(projectState))
      continue

    const awarenessLine = sanitizeProjectAwarenessText(
      (projectState as Record<string, unknown>).awarenessLine,
      PROJECT_AWARENESS_RETURN_MAX_CHARS,
    )
    if (!awarenessLine || containsProjectAwarenessFixedTemplateResidue(awarenessLine))
      continue

    return awarenessLine
  }

  return null
}
