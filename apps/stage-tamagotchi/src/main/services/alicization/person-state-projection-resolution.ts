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
  if (hasText(projection.manifestationCadenceSummary))
    score += 1
  if (hasText(projection.summary))
    score += 1

  const descriptiveFields = [
    projection.preferenceText,
    projection.sensitivityText,
    projection.repairTriggerText,
    projection.burdenText,
    projection.routineText,
    projection.trustRationale,
    projection.relationshipDoctrine,
  ]
  score += Math.min(3, descriptiveFields.filter(hasText).length)
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

  const continuityText = [
    projection.openingGuidance,
    projection.relationshipDoctrine,
    projection.manifestationCadenceSummary,
    projection.trustRationale,
    projection.summary,
  ]
    .filter(hasText)
    .join(' ')
    .toLowerCase()

  if (
    /same-her|same thread|same line|room first|leave room|lower-pressure|measured-return|repair before closeness|repair first|thread-faithful|bounded|rest-protective|protect rest|quiet[- ]companionship|line inward|stay inward/u.test(continuityText)
  ) {
    score += 2
  }

  return score
}

function countAuthorityStructureSignals(
  authority: Partial<AlicizationSelfContinuityAuthority> | null | undefined,
) {
  if (!authority)
    return 0

  let score = 0
  if (hasText(authority.selfLine))
    score += 1
  if (hasText(authority.relationshipLine))
    score += 1
  if (hasText(authority.motiveLine))
    score += 1
  if (hasText(authority.habitLine))
    score += 1
  if (hasText(authority.inwardLine))
    score += 1
  if (hasText(authority.authoritySummary))
    score += 1
  if (Array.isArray(authority.sourceTags) && authority.sourceTags.length > 0)
    score += 1
  return score
}

function countAuthorityContinuitySignals(
  authority: Partial<AlicizationSelfContinuityAuthority> | null | undefined,
) {
  if (!authority)
    return 0

  const continuityText = [
    authority.selfLine,
    authority.relationshipLine,
    authority.motiveLine,
    authority.habitLine,
    authority.inwardLine,
    authority.authoritySummary,
  ]
    .filter(hasText)
    .join(' ')
    .toLowerCase()

  let score = 0
  if (
    /same-her|same thread|same line|room first|leave room|lower-pressure|measured-return|repair before closeness|repair first|thread-faithful|bounded|rest-protective|protect rest|quiet[- ]companionship|line inward|stay inward/u.test(continuityText)
  ) {
    score += 2
  }
  if (Array.isArray(authority.sourceTags) && authority.sourceTags.some(tag => hasText(tag) && tag.trim().toLowerCase() === 'durable-self-core'))
    score += 2
  if (Array.isArray(authority.sourceTags) && authority.sourceTags.some(tag => hasText(tag)))
    score += 1
  return score
}

function hasImmediateSelfReturnSignal(raw: unknown) {
  if (!hasText(raw))
    return false
  return /current return|current turn|this turn|right now|fresher current|当前这句|现在这句|这一句|这一轮|这轮|眼下/u.test(String(raw).toLowerCase())
}

export function hasNeutralRelationshipSignal(raw: unknown) {
  if (!hasText(raw))
    return false
  return /relationship line is neutral|I can be warm|stay usefully oriented toward the host'?s knot/u.test(String(raw))
}

export function hasContinuityRestraintRelationshipSignal(raw: unknown) {
  if (!hasText(raw))
    return false
  return /repair-before-closeness|repair before closeness|repair-first|lower-pressure|leave room|measured-return|same line|same thread|same living line|same phase 1 digital life|same her|same-her|one living her|one continuous her|without splitting her continuity|bounded-return|before closeness widens|before leaning closer|rest-protective|protect rest|quiet[- ]companionship|line inward|stay inward|initiative|embodiment|resident presence/u.test(String(raw).toLowerCase())
}

function hasProjectStateClosureSignal(raw: unknown) {
  if (!hasText(raw))
    return false
  return /same phase 1 digital life|same living line|one continuous her|continuous her|keep the same living line inward for now|leave room before widening outward again|same-her closure seam|rest-protective|protect rest|quiet[- ]companionship|line inward|stay inward/u.test(String(raw).toLowerCase())
}

function hasRememberedSeamMoreRoomSignal(raw: unknown) {
  if (!hasText(raw))
    return false
  return /remembered seam|same remembered relationship seam|same remembered seam|同一条线|留白/u.test(String(raw).toLowerCase())
    && /reopened too eagerly|too eagerly before|more room this time|keep more room this time|slower this time|不要重开得太快|上次太急|这次更要留白/u.test(String(raw).toLowerCase())
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
      if (!mergedTags.includes(tag))
        mergedTags.push(tag)
    }
  }

  return mergedTags.length > 0 ? mergedTags : undefined
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
  const bundleHasRememberedSeamMoreRoomOpeningGuidance = hasRememberedSeamMoreRoomSignal(bundleProjection.openingGuidance)
  const runtimeHasRememberedSeamMoreRoomOpeningGuidance = hasRememberedSeamMoreRoomSignal(runtimeProjection.openingGuidance)

  if (bundleHasRememberedSeamMoreRoomOpeningGuidance && !runtimeHasRememberedSeamMoreRoomOpeningGuidance)
    return bundleProjection

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
  const bundleAuthority = input.bundleAuthority ?? null
  const runtimeAuthority = input.runtimeAuthority ?? null

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
  const bundleAuthority = input.bundleAuthority ?? null
  const runtimeAuthority = input.runtimeAuthority ?? null
  const preferredAuthority = resolvePreferredSelfContinuityAuthority(input)

  if (!bundleAuthority || !runtimeAuthority)
    return preferredAuthority

  const runtimeLooksLikeThinCurrentCarry = hasText(runtimeAuthority.selfLine)
    && !hasText(runtimeAuthority.relationshipLine)
    && !hasText(runtimeAuthority.authoritySummary)
  const preferredIsRuntime = preferredAuthority === runtimeAuthority
  const runtimeIsCanonicalCompleteAuthority = preferredIsRuntime
    && hasText(runtimeAuthority.selfLine)
    && hasText(runtimeAuthority.relationshipLine)
    && hasText(runtimeAuthority.authoritySummary)
    && (!hasText(bundleAuthority.authoritySummary)
      || countAuthorityStructureSignals(runtimeAuthority) >= countAuthorityStructureSignals(bundleAuthority))
  if (runtimeIsCanonicalCompleteAuthority)
    return runtimeAuthority
  const preferRuntimeSelfLine = hasText(runtimeAuthority.selfLine) && (
    preferredIsRuntime
    || !hasText(bundleAuthority.selfLine)
    || runtimeLooksLikeThinCurrentCarry
    || (hasImmediateSelfReturnSignal(runtimeAuthority.selfLine) && !hasImmediateSelfReturnSignal(bundleAuthority.selfLine))
  )
  const preferRuntimeRelationshipLine = hasText(runtimeAuthority.relationshipLine) && (
    preferredIsRuntime
    || !hasText(bundleAuthority.relationshipLine)
    || (
      hasContinuityRestraintRelationshipSignal(runtimeAuthority.relationshipLine)
      && hasNeutralRelationshipSignal(bundleAuthority.relationshipLine)
    )
    || (
      hasContinuityRestraintRelationshipSignal(runtimeAuthority.relationshipLine)
      && !hasContinuityRestraintRelationshipSignal(bundleAuthority.relationshipLine)
    )
  )
  const preferRuntimeInwardLine = hasText(runtimeAuthority.inwardLine) && (
    preferredIsRuntime
    || !hasText(bundleAuthority.inwardLine)
    || (
      hasProjectStateClosureSignal(runtimeAuthority.inwardLine)
      && !hasProjectStateClosureSignal(bundleAuthority.inwardLine)
    )
  )
  const preferRuntimeAuthoritySummary = hasText(runtimeAuthority.authoritySummary) && (
    preferredIsRuntime
    || !hasText(bundleAuthority.authoritySummary)
    || (
      hasProjectStateClosureSignal(runtimeAuthority.authoritySummary)
      && !hasProjectStateClosureSignal(bundleAuthority.authoritySummary)
    )
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
