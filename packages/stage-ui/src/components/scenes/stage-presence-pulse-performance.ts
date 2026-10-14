import type {
  AlicizationDialoguePerformancePayload,
  AlicizationPresencePulsePayload,
} from '../../stores/alicization-bridge'

export function resolveStagePresencePulsePerformance(
  payload: AlicizationPresencePulsePayload,
  baseline?: AlicizationDialoguePerformancePayload['baseEmotion'],
): AlicizationDialoguePerformancePayload {
  if (payload.activity) {
    const phase = payload.activity.phase
    if (payload.activity.kind === 'daily-life') {
      const resting = payload.activity.behavior === 'rest'
      const emotion = baseline && ['sad', 'angry', 'concerned'].includes(baseline) ? baseline : resting && phase === 'working' ? 'tired' : 'neutral'
      return { baseEmotion: emotion, emotion, actionCue: phase === 'working' ? resting ? 'rest_settle' : 'stretch' : 'idle_settle', facialCue: resting ? 'relaxed' : null, delivery: 'gentle', emphasis: 0 }
    }
    const negativeBaseline = baseline && ['sad', 'angry', 'tired', 'concerned'].includes(baseline)
    const emotion = baseline ?? (phase === 'working' || phase === 'verifying' ? 'thinking' : 'neutral')
    const actionCue = phase === 'orienting'
      ? 'observe_focus'
      : phase === 'working'
        ? 'steady_focus'
        : phase === 'verifying'
          ? 'tilt_head'
          : phase === 'blocked' || phase === 'failed'
            ? 'comfort_sway'
            : phase === 'finished'
              ? (emotion === 'happy' && !negativeBaseline ? 'celebrate_small' : 'nod')
              : 'idle_settle'
    return { baseEmotion: emotion, emotion, actionCue, facialCue: phase === 'working' || phase === 'verifying' ? 'focus' : negativeBaseline ? null : 'soft-gaze', delivery: 'calm', emphasis: 0 }
  }
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
