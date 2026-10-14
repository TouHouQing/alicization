export function lifeCompletionPeriod(at: number | null | undefined, interval: { beganAt: number, endedAt: number } | null) {
  if (typeof at !== 'number' || !Number.isFinite(at))
    return 'unobserved'
  if (!interval)
    return 'no-requested-interval'
  if (at < interval.beganAt)
    return 'before-requested-interval'
  return at < interval.endedAt ? 'during-requested-interval' : 'after-requested-interval'
}
