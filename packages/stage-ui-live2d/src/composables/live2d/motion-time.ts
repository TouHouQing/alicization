export function normalizeMotionDeltaSeconds(rawDelta: number) {
  if (!Number.isFinite(rawDelta) || rawDelta <= 0)
    return 0

  if (rawDelta > 5)
    return Math.min(0.25, rawDelta / 1000)

  return Math.min(0.25, rawDelta)
}
