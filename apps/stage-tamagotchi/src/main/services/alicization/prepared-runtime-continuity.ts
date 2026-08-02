import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import { resolvePreferredRuntimeSurface } from './runtime-surface-continuity-selection'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'

function fillAuthoritySummaryIfMissing<T extends Partial<AlicizationSelfContinuityAuthority>>(
  authority: T | null | undefined,
): T | null | undefined {
  if (!authority)
    return authority

  const existing = typeof authority.authoritySummary === 'string'
    ? authority.authoritySummary.trim()
    : ''
  if (existing)
    return authority

  const summary = [
    authority.selfLine,
    authority.relationshipLine,
    authority.inwardLine,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' | ')
    .trim()

  return summary
    ? { ...authority, authoritySummary: summary } as T
    : authority
}

function normalizePreparedSelfContinuityAuthority(
  raw: unknown,
): Partial<AlicizationSelfContinuityAuthority> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const authority = raw as Record<string, unknown>
  const readText = (value: unknown) => typeof value === 'string' ? value : undefined

  return {
    selfLine: readText(authority.selfLine),
    relationshipLine: readText(authority.relationshipLine),
    motiveLine: readText(authority.motiveLine),
    habitLine: readText(authority.habitLine),
    inwardLine: readText(authority.inwardLine),
    authoritySummary: readText(authority.authoritySummary),
    sourceTags: Array.isArray(authority.sourceTags)
      ? authority.sourceTags.filter((tag): tag is string => typeof tag === 'string')
      : undefined,
  }
}

export function deriveRuntimeProjectionRelationshipCarry(_projection: unknown) {
  return null
}

export function resolvePreferredPreparedRuntimeSurface(
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface'] | null | undefined,
) {
  return resolvePreferredRuntimeSurface({
    spineRuntimeSurface: runtimeSurface?.digitalLifeSpine?.runtimeSurface ?? null,
    preparedRuntimeSurface: runtimeSurface?.digitalLifeRuntimeSurface ?? null,
  })
}

export function resolvePreparedRuntimeSelfContinuityAuthority(
  prepared?: AlicizationPreparedMainChatExecutionResult | null,
): Partial<AlicizationSelfContinuityAuthority> | null | undefined {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const bundleProjection
    = (surface?.raw?.personStateProjection ?? null) as Partial<AlicizationPersonStateProjection> | null
  const runtimeProjection = surface?.memory?.personStateProjection ?? null
  const runtimeSurfaceAuthority = (surface?.memory
    && surface?.agency
    && surface?.cognition
    ? buildSelfContinuityAuthorityFromRuntimeSurface(surface)
    : null) as Partial<AlicizationSelfContinuityAuthority> | null

  if (runtimeSurfaceAuthority)
    return fillAuthoritySummaryIfMissing(runtimeSurfaceAuthority)

  const bundleAuthority = normalizePreparedSelfContinuityAuthority(
    bundleProjection?.selfContinuityAuthority,
  )
  const runtimeAuthority = normalizePreparedSelfContinuityAuthority(
    runtimeProjection?.selfContinuityAuthority,
  )
  const mergedAuthority = mergePreferredSelfContinuityAuthority<Partial<AlicizationSelfContinuityAuthority>>({
    bundleAuthority,
    runtimeAuthority,
  })
  const projectedAuthority = resolvePreferredSelfContinuityAuthority<Partial<AlicizationSelfContinuityAuthority>>({
    bundleAuthority,
    runtimeAuthority,
  })
  const selectedAuthority = mergedAuthority ?? projectedAuthority

  return fillAuthoritySummaryIfMissing(
    selectedAuthority,
  )
}
