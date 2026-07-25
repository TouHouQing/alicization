import type { StageQuickReplyClosureDiagnosticEntry } from './stage-quick-reply-closure'

import { normalizeStageClosureVisibleText } from './stage-closure-visible-text'

function resolveFirstVisibleClosureLine(
  candidates: Array<string | null | undefined>,
) {
  for (const candidate of candidates) {
    const visibleLine = normalizeStageClosureVisibleText(candidate)
    if (visibleLine)
      return visibleLine
  }

  return null
}

export function resolveStageDialoguePanelClosureLine(
  closureCue: StageQuickReplyClosureDiagnosticEntry | null | undefined,
  options?: {
    fallbackAwarenessLine?: string | null
    fallbackAwarenessCandidates?: Array<string | null | undefined>
  },
) {
  if (closureCue) {
    const explicitClosureLine = resolveFirstVisibleClosureLine([
      closureCue.headline,
      closureCue.briefingHeadline,
      closureCue.nextClosureLine,
    ])

    if (explicitClosureLine)
      return explicitClosureLine
  }

  return resolveFirstVisibleClosureLine([
    options?.fallbackAwarenessLine,
    ...(options?.fallbackAwarenessCandidates ?? []),
  ])
}
