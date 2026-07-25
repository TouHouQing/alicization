import type {
  StageQuickReplyPreDialogueClosureSnapshot,
} from './stage-quick-reply-closure'

import { normalizeStageClosureVisibleText } from './stage-closure-visible-text'

export function resolveStageQuickReplyClosureSummary(
  snapshot: StageQuickReplyPreDialogueClosureSnapshot | null | undefined,
  options?: {
    fallbackAwarenessLine?: string | null
    fallbackAwarenessCandidates?: Array<string | null | undefined>
  },
) {
  if (!snapshot)
    return null

  const candidates = [
    snapshot.companionBriefingLine,
    snapshot.summaryLine,
    options?.fallbackAwarenessLine,
    ...(options?.fallbackAwarenessCandidates ?? []),
  ]

  for (const candidate of candidates) {
    const visibleLine = normalizeStageClosureVisibleText(candidate)
    if (visibleLine)
      return visibleLine
  }

  return null
}
