import type { StageEmbodimentPerformanceCueSource } from '@proj-alicization/stage-shared'

function clampRange(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(max, Math.max(min, value))
}

function clampUnit(value: number | null | undefined, fallback: number | null = null) {
  if (!Number.isFinite(value as number))
    return fallback

  return Math.min(1, Math.max(0, Number(value)))
}

export function resolveVrmActionFadeDurationSeconds(input: {
  actionCueSource: StageEmbodimentPerformanceCueSource | null | undefined
  actionIntensity: number | null | undefined
  fadeDurationSeconds: number
}) {
  const baseFade = clampRange(input.fadeDurationSeconds, 0.08, 1.2, 0.18)
  const actionIntensity = clampUnit(input.actionIntensity)
  if (actionIntensity == null)
    return baseFade

  const sourceFloor = input.actionCueSource === 'resident'
    ? 0.92
    : input.actionCueSource === 'preview'
      ? 0.82
      : input.actionCueSource === 'segment'
        ? 0.7
        : 1
  const intensityScale = 1 - actionIntensity * 0.38
  return clampRange(baseFade * sourceFloor * intensityScale, 0.08, 1.2, baseFade)
}
