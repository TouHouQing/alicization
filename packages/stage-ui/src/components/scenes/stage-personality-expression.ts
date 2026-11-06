import type { AlicizationDialoguePerformancePayload, AlicizationVisualPresenceStateSnapshot } from '../../stores/alicization-bridge'

/** Personality changes delivery restraint, while emotion, motion and mouth keep their owners. */
export function applyStagePersonalityExpression(performance: AlicizationDialoguePerformancePayload, personality?: AlicizationVisualPresenceStateSnapshot['personalityExpression']): AlicizationDialoguePerformancePayload {
  if (!personality || !Number.isFinite(personality.expression) || !Number.isFinite(personality.warmth))
    return performance
  const restrained = personality.expression < -0.02
  const gentle = personality.warmth > 0.02 && ['neutral', 'happy', 'relaxed'].includes(performance.baseEmotion)
  return { ...performance, emphasis: restrained ? Math.min(performance.emphasis, 1) as AlicizationDialoguePerformancePayload['emphasis'] : performance.emphasis, delivery: gentle && performance.delivery === 'calm' ? 'gentle' : performance.delivery }
}
