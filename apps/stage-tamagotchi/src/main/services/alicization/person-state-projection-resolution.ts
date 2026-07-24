import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

function hasText(raw: unknown) {
  return typeof raw === 'string' && raw.trim().length > 0
}

function countProjectionStructureSignals(
  projection: Partial<AlicizationPersonStateProjection> | null | undefined,
) {
  if (!projection)
    return 0

  let score = 0
  if (projection.personalityContinuityState)
    score += 2
  if (projection.selfContinuityAuthority)
    score += 2
  if (Array.isArray(projection.closenessLadder) && projection.closenessLadder.length > 0)
    score += 2
  if (Array.isArray(projection.contexts) && projection.contexts.length > 0)
    score += 1
  return score
}

function countProjectionContinuitySignals(
  projection: Partial<AlicizationPersonStateProjection> | null | undefined,
) {
  if (!projection)
    return 0

  let score = 0
  if (projection.activeClosenessContext === 'general')
    score += 1
  else if (hasText(projection.activeClosenessContext))
    score += 3

  if (projection.activeClosenessRung === 'nearby-soft')
    score += 1
  else if (hasText(projection.activeClosenessRung))
    score += 2

  if (projection.relationshipPosture)
    score += 1
  if (projection.relationshipPosture === 'restrained' || projection.relationshipPosture === 'tender')
    score += 1
  if (projection.restrained)
    score += 1
  if (projection.cautious)
    score += 1
  if (projection.personalityContinuityState?.currentRegime)
    score += 1
  if (projection.personalityContinuityState?.repairPosture === 'repair-first')
    score += 1
  if (projection.personalityContinuityState?.autonomyPosture === 'protect-space')
    score += 1

  return score
}

function countAuthorityStructureSignals(
  authority: Partial<AlicizationSelfContinuityAuthority> | null | undefined,
) {
  if (!authority)
    return 0

  return hasText(authority.closenessPosture) ? 1 : 0
}

function countAuthorityContinuitySignals(
  authority: Partial<AlicizationSelfContinuityAuthority> | null | undefined,
) {
  if (!authority)
    return 0

  return Array.isArray(authority.sourceTags)
    ? Math.min(2, authority.sourceTags.filter(hasText).length)
    : 0
}

function mergeAuthoritySourceTags(...tagLists: Array<readonly string[] | null | undefined>) {
  const mergedTags: string[] = []

  for (const tagList of tagLists) {
    if (!Array.isArray(tagList))
      continue

    for (const rawTag of tagList) {
      if (!hasText(rawTag))
        continue
      const tag = rawTag.trim()
      if (
        tag.startsWith('project-state-')
        || tag.includes('project-carry')
      ) {
        continue
      }
      if (!mergedTags.includes(tag))
        mergedTags.push(tag)
    }
  }

  return mergedTags.length > 0 ? mergedTags : undefined
}

function sanitizeAuthorityProvenance<T extends Partial<AlicizationSelfContinuityAuthority>>(
  authority: T | null,
) {
  if (!authority)
    return authority

  const sourceTags = mergeAuthoritySourceTags(authority.sourceTags) ?? []
  const originalTags = Array.isArray(authority.sourceTags) ? authority.sourceTags : []
  if (
    sourceTags.length === originalTags.length
    && sourceTags.every((tag, index) => tag === originalTags[index])
  ) {
    return authority
  }

  return {
    ...authority,
    sourceTags,
  } as T
}

export function resolvePreferredPersonStateProjection<T extends Partial<AlicizationPersonStateProjection>>(input: {
  bundleProjection?: T | null
  runtimeProjection?: T | null
}) {
  const bundleProjection = input.bundleProjection ?? null
  const runtimeProjection = input.runtimeProjection ?? null

  if (!bundleProjection)
    return runtimeProjection
  if (!runtimeProjection)
    return bundleProjection

  const bundleStructureScore = countProjectionStructureSignals(bundleProjection)
  const runtimeStructureScore = countProjectionStructureSignals(runtimeProjection)
  const bundleContinuityScore = countProjectionContinuitySignals(bundleProjection)
  const runtimeContinuityScore = countProjectionContinuitySignals(runtimeProjection)

  if (
    runtimeStructureScore >= bundleStructureScore + 3
    && runtimeContinuityScore >= bundleContinuityScore
  ) {
    return runtimeProjection
  }

  if (
    runtimeContinuityScore >= bundleContinuityScore + 2
    && runtimeStructureScore >= bundleStructureScore
  ) {
    return runtimeProjection
  }

  if (
    runtimeStructureScore > bundleStructureScore
    && runtimeContinuityScore > bundleContinuityScore
    && runtimeProjection.activeClosenessContext !== bundleProjection.activeClosenessContext
  ) {
    return runtimeProjection
  }

  return bundleProjection
}

export function resolvePreferredSelfContinuityAuthority<T extends Partial<AlicizationSelfContinuityAuthority>>(input: {
  bundleAuthority?: T | null
  runtimeAuthority?: T | null
}) {
  const bundleAuthority = sanitizeAuthorityProvenance(input.bundleAuthority ?? null)
  const runtimeAuthority = sanitizeAuthorityProvenance(input.runtimeAuthority ?? null)

  if (!bundleAuthority)
    return runtimeAuthority
  if (!runtimeAuthority)
    return bundleAuthority

  const bundleStructureScore = countAuthorityStructureSignals(bundleAuthority)
  const runtimeStructureScore = countAuthorityStructureSignals(runtimeAuthority)
  const bundleContinuityScore = countAuthorityContinuitySignals(bundleAuthority)
  const runtimeContinuityScore = countAuthorityContinuitySignals(runtimeAuthority)

  if (
    runtimeStructureScore >= bundleStructureScore + 2
    && runtimeContinuityScore >= bundleContinuityScore
  ) {
    return runtimeAuthority
  }

  if (
    bundleStructureScore >= runtimeStructureScore + 2
    && bundleContinuityScore >= runtimeContinuityScore
  ) {
    return bundleAuthority
  }

  if (runtimeContinuityScore > bundleContinuityScore && runtimeStructureScore >= bundleStructureScore)
    return runtimeAuthority
  if (bundleContinuityScore > runtimeContinuityScore && bundleStructureScore >= runtimeStructureScore)
    return bundleAuthority
  if (runtimeStructureScore > bundleStructureScore)
    return runtimeAuthority

  return bundleAuthority
}

export function mergePreferredSelfContinuityAuthority<T extends Partial<AlicizationSelfContinuityAuthority>>(input: {
  bundleAuthority?: T | null
  runtimeAuthority?: T | null
}) {
  const bundleAuthority = sanitizeAuthorityProvenance(input.bundleAuthority ?? null)
  const runtimeAuthority = sanitizeAuthorityProvenance(input.runtimeAuthority ?? null)
  const preferredAuthority = resolvePreferredSelfContinuityAuthority({
    bundleAuthority,
    runtimeAuthority,
  })

  if (!bundleAuthority || !runtimeAuthority)
    return preferredAuthority

  const preferredIsRuntime = preferredAuthority === runtimeAuthority
  const preferRuntimeSelfLine = hasText(runtimeAuthority.selfLine) && (
    preferredIsRuntime
    || !hasText(bundleAuthority.selfLine)
  )
  const preferRuntimeRelationshipLine = hasText(runtimeAuthority.relationshipLine) && (
    preferredIsRuntime
    || !hasText(bundleAuthority.relationshipLine)
  )
  const preferRuntimeInwardLine = hasText(runtimeAuthority.inwardLine) && (
    preferredIsRuntime
    || !hasText(bundleAuthority.inwardLine)
  )
  const preferRuntimeAuthoritySummary = hasText(runtimeAuthority.authoritySummary) && (
    preferredIsRuntime
    || !hasText(bundleAuthority.authoritySummary)
  )

  const mergedAuthority = {
    ...preferredAuthority,
    selfLine: preferRuntimeSelfLine
      ? runtimeAuthority.selfLine
      ?? bundleAuthority.selfLine
      ?? preferredAuthority?.selfLine
      : bundleAuthority.selfLine
        ?? runtimeAuthority.selfLine
        ?? preferredAuthority?.selfLine,
    relationshipLine: preferRuntimeRelationshipLine
      ? runtimeAuthority.relationshipLine
      ?? bundleAuthority.relationshipLine
      ?? preferredAuthority?.relationshipLine
      : preferredIsRuntime
        ? runtimeAuthority.relationshipLine
        ?? bundleAuthority.relationshipLine
        ?? preferredAuthority?.relationshipLine
        : bundleAuthority.relationshipLine
          ?? runtimeAuthority.relationshipLine
          ?? preferredAuthority?.relationshipLine,
    inwardLine: preferRuntimeInwardLine
      ? runtimeAuthority.inwardLine
      ?? bundleAuthority.inwardLine
      ?? preferredAuthority?.inwardLine
      : preferredIsRuntime
        ? runtimeAuthority.inwardLine
        ?? bundleAuthority.inwardLine
        ?? preferredAuthority?.inwardLine
        : bundleAuthority.inwardLine
          ?? runtimeAuthority.inwardLine
          ?? preferredAuthority?.inwardLine,
    motiveLine: preferredIsRuntime
      ? runtimeAuthority.motiveLine
      ?? bundleAuthority.motiveLine
      ?? preferredAuthority?.motiveLine
      : bundleAuthority.motiveLine
        ?? runtimeAuthority.motiveLine
        ?? preferredAuthority?.motiveLine,
    habitLine: preferredIsRuntime
      ? runtimeAuthority.habitLine
      ?? bundleAuthority.habitLine
      ?? preferredAuthority?.habitLine
      : bundleAuthority.habitLine
        ?? runtimeAuthority.habitLine
        ?? preferredAuthority?.habitLine,
    authoritySummary: preferRuntimeAuthoritySummary
      ? runtimeAuthority.authoritySummary
      ?? bundleAuthority.authoritySummary
      ?? preferredAuthority?.authoritySummary
      : preferredIsRuntime
        ? runtimeAuthority.authoritySummary
        ?? bundleAuthority.authoritySummary
        ?? preferredAuthority?.authoritySummary
        : bundleAuthority.authoritySummary
          ?? runtimeAuthority.authoritySummary
          ?? preferredAuthority?.authoritySummary,
    sourceTags: preferredIsRuntime
      ? mergeAuthoritySourceTags(
          runtimeAuthority.sourceTags,
          bundleAuthority.sourceTags,
          preferredAuthority?.sourceTags,
        )
      : mergeAuthoritySourceTags(
          bundleAuthority.sourceTags,
          runtimeAuthority.sourceTags,
          preferredAuthority?.sourceTags,
        ),
  } as T

  if (
    preferredAuthority === bundleAuthority
    && mergedAuthority.selfLine === bundleAuthority.selfLine
    && mergedAuthority.relationshipLine === bundleAuthority.relationshipLine
    && mergedAuthority.inwardLine === bundleAuthority.inwardLine
    && mergedAuthority.motiveLine === bundleAuthority.motiveLine
    && mergedAuthority.habitLine === bundleAuthority.habitLine
    && mergedAuthority.authoritySummary === bundleAuthority.authoritySummary
    && mergedAuthority.sourceTags === bundleAuthority.sourceTags
  ) {
    return bundleAuthority
  }

  if (
    preferredAuthority === runtimeAuthority
    && mergedAuthority.selfLine === runtimeAuthority.selfLine
    && mergedAuthority.relationshipLine === runtimeAuthority.relationshipLine
    && mergedAuthority.inwardLine === runtimeAuthority.inwardLine
    && mergedAuthority.motiveLine === runtimeAuthority.motiveLine
    && mergedAuthority.habitLine === runtimeAuthority.habitLine
    && mergedAuthority.authoritySummary === runtimeAuthority.authoritySummary
    && mergedAuthority.sourceTags === runtimeAuthority.sourceTags
  ) {
    return runtimeAuthority
  }

  return mergedAuthority
}
