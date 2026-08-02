import type { AlicizationDialogueAnswerSubject } from '../../../shared/eventa'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

const weakDialogueAnchorPattern = /^(?:unknown|general unknown|none|null|n\/a)$/iu
const weakTraceAnchorPattern = /(?:^|[\s(,.:;-])(?:general unknown|entire screen)(?:$|[\s),.:;-])|\s\|\s(?:general unknown|entire screen)/iu

export function isInternalDialogueSurfaceText(raw: unknown) {
  const normalized = sanitizeText(raw, 240)
  if (!normalized)
    return false
  return weakDialogueAnchorPattern.test(normalized)
    || weakTraceAnchorPattern.test(normalized)
}

export function sanitizeDialogueSurfaceText(raw: unknown, maxChars = 220) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return ''
  if (isInternalDialogueSurfaceText(normalized) || containsAlicizationFixedTemplateResidue(normalized, {
    origin: 'internal-structured-fact',
  })) {
    return ''
  }
  return normalized
}

export function sanitizeDialogueSemanticAnchorText(raw: unknown, maxChars = 180) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return ''
  if (
    isInternalDialogueSurfaceText(normalized)
    || containsAlicizationFixedTemplateResidue(normalized, {
      origin: 'internal-structured-fact',
    })
  ) {
    return ''
  }
  return normalized
}

export function sanitizeDialogueAnchorText(raw: unknown, maxChars = 180) {
  return sanitizeDialogueSemanticAnchorText(raw, maxChars)
}

export function pickDialogueSurfaceText(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueSurfaceText(value)
    if (normalized)
      return normalized
  }
  return ''
}

export function isDialogueFirstSubject(subject?: AlicizationDialogueAnswerSubject | null) {
  return subject === 'alicization-self'
    || subject === 'relationship'
    || subject === 'host-state'
    || subject === 'general'
}

export function isSceneThreadSubject(subject?: AlicizationDialogueAnswerSubject | null) {
  return subject === 'visible-scene' || subject === 'task-knot'
}
