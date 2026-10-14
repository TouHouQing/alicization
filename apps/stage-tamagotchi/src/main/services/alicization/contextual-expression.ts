import type { AlicizationDialoguePerformancePayload, AlicizationInteractionIntent } from '@proj-alicization/stage-shared'

/** Intention narrows the expression; it cannot replace the current emotion. */
export function contextualExpression(performance: AlicizationDialoguePerformancePayload | null, intent: AlicizationInteractionIntent | null) {
  if (!performance || !intent || ['sad', 'angry', 'tired', 'concerned', 'apologetic'].includes(performance.baseEmotion))
    return performance
  const actionCue = intent.purpose === 'greet' ? 'gentle_wave' : intent.purpose === 'celebrate' && performance.baseEmotion === 'happy' ? 'celebrate_small' : intent.purpose === 'play' ? 'tilt_head' : null
  return actionCue ? { ...performance, actionCue, emphasis: intent.purpose === 'celebrate' ? performance.emphasis : 0 as const } : performance
}
