import type {
  AlicizationDialoguePerformancePayload,
  AlicizationPresencePulsePayload,
} from '../../stores/alicization-bridge'

export function resolveStagePresencePulsePerformance(
  payload: AlicizationPresencePulsePayload,
): AlicizationDialoguePerformancePayload {
  const quietAccompanying = payload.currentBodyState === 'accompanying'
    && payload.continuityMode === 'quiet-accompaniment'
    && Number(payload.quietLineMs ?? 0) >= 120_000
  const protectiveWatch = payload.currentBodyState === 'recovering'
    && payload.continuityMode === 'protective-watch'

  if (protectiveWatch) {
    const emotion = payload.emotionalTension === 'late-night-drain' ? 'tired' : 'concerned'
    return {
      baseEmotion: emotion,
      emotion,
      facialCue: 'soft-gaze',
      actionCue: 'comfort_sway',
      delivery: 'gentle',
      emphasis: 1,
    }
  }

  if (quietAccompanying) {
    return {
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }
  }

  const lowerPressureTiming = (payload.reasonTags ?? []).includes('timing:lower-pressure-opening')

  const emotion = (() => {
    if (payload.embodiedPresence === 'concerned')
      return payload.emotionalTension === 'late-night-drain' ? 'tired' : 'concerned'
    if (payload.embodiedPresence === 'hesitant')
      return 'thinking'
    if (payload.embodiedPresence === 'attentive')
      return payload.watchMode === 'symbiotic-vision' ? 'thinking' : 'neutral'
    return 'neutral'
  })()
  const delivery = payload.embodiedPresence === 'hesitant'
    ? 'hesitant'
    : payload.embodiedPresence === 'concerned'
      ? 'gentle'
      : lowerPressureTiming && payload.embodiedPresence === 'attentive'
        ? 'gentle'
      : 'calm'
  const emphasis = payload.embodiedPresence === 'concerned'
    ? 1
    : lowerPressureTiming && payload.embodiedPresence === 'attentive'
      ? 0
    : payload.embodiedPresence === 'attentive'
      ? 1
      : 0

  return {
    baseEmotion: emotion,
    emotion,
    facialCue: null,
    actionCue: null,
    delivery,
    emphasis,
  }
}
