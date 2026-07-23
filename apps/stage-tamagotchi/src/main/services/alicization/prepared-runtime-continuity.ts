import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

import {
  containsAlicizationFixedTemplateResidue,
} from '@proj-alicization/stage-shared'

import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import { resolveAlicizationProjectStateSnapshot } from './project-state-brief'
import { resolvePreferredRuntimeSurface } from './runtime-surface-continuity-selection'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'

const legacyProjectGovernancePattern
  = /project[-_ ]state|project[-_ ]governance|opening_policy|relationship_cadence|continuity_(?:anchor|hold|cue|timing|cadence)|same[-_ ]her|same living line|one continuous her|runtime_personhood|redacted_internal/iu

function authorityContainsLegacyProjectGovernance(authority: unknown) {
  if (!authority)
    return false

  const serialized = JSON.stringify(authority)
  return legacyProjectGovernancePattern.test(serialized)
    || containsAlicizationFixedTemplateResidue(serialized)
}

function countAuthorityStructureFields(authority: {
  selfLine?: unknown
  relationshipLine?: unknown
  motiveLine?: unknown
  habitLine?: unknown
  inwardLine?: unknown
  authoritySummary?: unknown
} | null | undefined) {
  if (!authority)
    return 0

  return [
    authority.selfLine,
    authority.relationshipLine,
    authority.motiveLine,
    authority.habitLine,
    authority.inwardLine,
    authority.authoritySummary,
  ].filter(value => typeof value === 'string' && value.trim().length > 0).length
}

function scoreAuthoritySignals(
  authority: {
    selfLine?: unknown
    relationshipLine?: unknown
    inwardLine?: unknown
    authoritySummary?: unknown
  } | null | undefined,
  pattern: RegExp,
) {
  if (!authority)
    return 0

  return [
    authority.selfLine,
    authority.relationshipLine,
    authority.inwardLine,
    authority.authoritySummary,
  ].reduce<number>((score, line) => score + (typeof line === 'string' && pattern.test(line) ? 1 : 0), 0)
}

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

  const cleanBundleProjection = authorityContainsLegacyProjectGovernance(bundleProjection?.selfContinuityAuthority)
    ? null
    : bundleProjection
  const cleanRuntimeProjection = authorityContainsLegacyProjectGovernance(runtimeProjection?.selfContinuityAuthority)
    ? null
    : runtimeProjection
  const cleanRuntimeSurfaceAuthority = authorityContainsLegacyProjectGovernance(runtimeSurfaceAuthority)
    ? null
    : runtimeSurfaceAuthority

  const bundleAuthority = cleanBundleProjection?.selfContinuityAuthority ?? null
  const runtimeAuthority = cleanRuntimeProjection?.selfContinuityAuthority ?? null
  const mergedAuthority = mergePreferredSelfContinuityAuthority<Partial<AlicizationSelfContinuityAuthority>>({
    bundleAuthority,
    runtimeAuthority,
  })
  const projectedAuthority = resolvePreferredSelfContinuityAuthority<Partial<AlicizationSelfContinuityAuthority>>({
    bundleAuthority,
    runtimeAuthority,
  })
  const selectedAuthority = mergedAuthority ?? projectedAuthority

  if (
    cleanRuntimeSurfaceAuthority
    && countAuthorityStructureFields(cleanRuntimeSurfaceAuthority) >= countAuthorityStructureFields(runtimeAuthority)
    && countAuthorityStructureFields(cleanRuntimeSurfaceAuthority) >= countAuthorityStructureFields(selectedAuthority)
    && (
      scoreAuthoritySignals(cleanRuntimeSurfaceAuthority, /self-continuity|same self|one self/iu)
      > scoreAuthoritySignals(selectedAuthority, /self-continuity|same self|one self/iu)
      || scoreAuthoritySignals(cleanRuntimeSurfaceAuthority, /body|voice|lipsync|embod/iu)
      > scoreAuthoritySignals(selectedAuthority, /body|voice|lipsync|embod/iu)
    )
  ) {
    return fillAuthoritySummaryIfMissing(cleanRuntimeSurfaceAuthority)
  }

  return fillAuthoritySummaryIfMissing(
    selectedAuthority ?? cleanRuntimeSurfaceAuthority,
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
