export function normalizeMemoryPlanningId(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, 120)
}

export function buildUniqueMemoryPlanningOwnerIdIndex<T>(
  items: T[],
  getId: (item: T) => string | null | undefined,
) {
  const rawIdByNormalizedId = new Map<string, string | null>()
  for (const item of items) {
    const rawId = getId(item)
    const normalizedId = normalizeMemoryPlanningId(rawId)
    if (!rawId || !normalizedId)
      continue

    if (rawIdByNormalizedId.has(normalizedId))
      rawIdByNormalizedId.set(normalizedId, null)
    else
      rawIdByNormalizedId.set(normalizedId, rawId)
  }

  return new Map(
    [...rawIdByNormalizedId.entries()]
      .filter((entry): entry is [string, string] => entry[1] !== null),
  )
}

export function resolveMemoryPlanningOwnerIds(
  values: Array<string | null | undefined>,
  ownerIdByNormalizedId: ReadonlyMap<string, string>,
  maxItems = 6,
) {
  const resolved: string[] = []
  for (const value of values) {
    const ownerId = ownerIdByNormalizedId.get(normalizeMemoryPlanningId(value))
    if (!ownerId || resolved.includes(ownerId))
      continue
    resolved.push(ownerId)
    if (resolved.length >= maxItems)
      break
  }
  return resolved
}
