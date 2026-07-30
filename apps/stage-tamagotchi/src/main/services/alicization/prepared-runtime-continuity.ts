import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import { resolveAlicizationProjectStateSnapshot } from './project-state-brief'
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

/**
 * Project-state is retained only for diagnostics and migration compatibility.
 * It must not be promoted into prepared dialogue continuity.
 */
export function resolvePreparedRuntimeProjectState(
  _prepared?: AlicizationPreparedMainChatExecutionResult | null,
) {
  return null
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

  const bundleAuthority = bundleProjection?.selfContinuityAuthority ?? null
  const runtimeAuthority = runtimeProjection?.selfContinuityAuthority ?? null
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

export function resolvePreparedRuntimeProjectStateSnapshot(
  _prepared?: AlicizationPreparedMainChatExecutionResult | null,
) {
  return resolveAlicizationProjectStateSnapshot()
}

export function resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(
  _prepared?: AlicizationPreparedMainChatExecutionResult | null,
) {
  return null
}
