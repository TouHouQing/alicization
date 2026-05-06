export interface AlicizationResponseSurfaceRules {
  mustDo: string[]
  mustNotDo: string[]
}

export function pushUniqueAlicizationResponseSurfaceRule(target: string[], value: string) {
  const normalized = value.trim()
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

export function appendAlicizationResponseSurfaceRules(
  target: AlicizationResponseSurfaceRules,
  source: AlicizationResponseSurfaceRules,
) {
  for (const item of source.mustDo)
    pushUniqueAlicizationResponseSurfaceRule(target.mustDo, item)
  for (const item of source.mustNotDo)
    pushUniqueAlicizationResponseSurfaceRule(target.mustNotDo, item)
}
