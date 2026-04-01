import type { AlicizationTurnAnchorSource } from '../../../shared/eventa'

import { measureDialogueFocusAlignment } from './dialogue-focus-alignment'
import { sanitizeDialogueAnchorText } from './dialogue-surface-text'

export interface AlicizationTurnAnchorCandidate {
  source: AlicizationTurnAnchorSource
  text?: unknown
}

export interface AlicizationResolvedTurnAnchor {
  text: string | null
  source: AlicizationTurnAnchorSource | null
}

export function resolvePrimaryTurnAnchor(
  candidates: AlicizationTurnAnchorCandidate[],
  maxChars = 180,
): AlicizationResolvedTurnAnchor {
  for (const candidate of candidates) {
    const normalized = sanitizeDialogueAnchorText(candidate.text, maxChars)
    if (!normalized)
      continue
    return {
      text: normalized,
      source: candidate.source,
    }
  }

  return {
    text: null,
    source: null,
  }
}

export function turnAnchorAligns(input: {
  anchor?: string | null
  context: Array<string | null | undefined>
  threshold?: number
}) {
  const anchor = sanitizeDialogueAnchorText(input.anchor, 180)
  const context = input.context
    .map(value => sanitizeDialogueAnchorText(value, 180))
    .filter(Boolean)

  if (!anchor || context.length === 0)
    return false

  return measureDialogueFocusAlignment({
    message: anchor,
    contextPhrases: context,
  }).overlapRatio >= (input.threshold ?? 0.18)
}
