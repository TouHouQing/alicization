import type { AlicizationDialoguePerformancePayload, StageTextArticulationFrame } from '@proj-alicization/stage-shared'

import type { PresentedChatTextUnit } from '../../stores/chat/text-presentation'

/** A queued cross-window glyph keeps its source clock; expired lips stay quiet. */
export function resolvePresentedTextArticulation(unit: PresentedChatTextUnit, turnId: string, now: number): StageTextArticulationFrame | null {
  if (!Number.isSafeInteger(unit.presentedAt) || unit.presentedAt <= 0 || !Number.isFinite(unit.durationMs) || unit.durationMs <= 0 || unit.durationMs > 1000)
    return null
  const startedAt = Math.min(unit.presentedAt, now)
  if (now >= startedAt + unit.durationMs)
    return null
  return { ...unit, turnId, startedAt }
}

// Text delivery has semantic expression, but no acoustic clock. A sentence or
// stream chunk cannot authorize another performance of the same gesture.
export function createStageTextDialogueDelivery() {
  let turnId: string | null = null
  let finished = false
  let signature = ''
  let actionPerformed = false

  function begin(id: string) {
    turnId = id
    finished = false
    signature = ''
    actionPerformed = false
  }

  function present(performance: AlicizationDialoguePerformancePayload, options?: { allowAction?: boolean }) {
    if (!turnId || finished)
      return null
    const nextSignature = JSON.stringify([
      performance.baseEmotion,
      performance.facialCue ?? null,
      performance.actionCue ?? null,
      performance.delivery,
      performance.emphasis,
      performance.residentMode ?? null,
      options?.allowAction !== false,
    ])
    if (signature === nextSignature)
      return null
    signature = nextSignature
    const action = performance.actionCue?.trim() || ''
    // Streaming text can deliver an entire paragraph in one burst. It has no
    // spoken timing that could justify performing every clause's gesture.
    const issueAction = Boolean(action) && !actionPerformed && options?.allowAction !== false
    if (issueAction)
      actionPerformed = true
    return { turnId, issueAction }
  }

  function finish(id?: string | null) {
    if (!turnId || finished || (id && id !== turnId))
      return false
    finished = true
    return true
  }

  function owns(id?: string | null) {
    return Boolean(turnId && id && (id === turnId || id.startsWith(`${turnId}:`) || id.startsWith(`${turnId}|`)))
  }

  function clear() {
    turnId = null
    finished = false
    signature = ''
    actionPerformed = false
  }

  return {
    begin,
    clear,
    finish,
    owns,
    present,
    get active() { return turnId !== null && !finished },
    get hasTurn() { return turnId !== null },
    get hasPresentation() { return signature !== '' },
  }
}
