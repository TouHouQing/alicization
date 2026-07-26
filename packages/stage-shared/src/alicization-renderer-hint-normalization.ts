export function normalizeAlicizationRendererHintToken(value: string | null | undefined) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/-/g, '_')
    : null
}

export function normalizeAlicizationSettleLoopToken(value: string | null | undefined) {
  if (typeof value !== 'string')
    return null

  const trimmed = value.trim()
  if (!trimmed)
    return null

  const normalized = normalizeAlicizationRendererHintToken(trimmed)
  if (
    normalized === 'settle_idle'
    || normalized === 'settleidle'
    || normalized === 'idle_settle'
    || normalized === 'idlesettle'
  ) {
    return 'idle_settle'
  }

  return trimmed
}

export function normalizeAlicizationRendererHintTokens(
  values: readonly string[] | string[] | null | undefined,
) {
  const normalized = (values ?? [])
    .map(value => normalizeAlicizationRendererHintToken(value))
    .filter((value): value is string => Boolean(value))

  return Array.from(new Set(normalized))
}
