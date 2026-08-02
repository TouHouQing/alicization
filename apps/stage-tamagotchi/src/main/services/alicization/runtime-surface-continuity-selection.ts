export interface RuntimeSurfaceContinuityEvidenceShape {
  perception?: {
    updatedAt?: number | null
  } | null
  dialogue?: {
    currentConsciousFrame?: {
      reasonTags?: readonly string[] | null
    } | null
  } | null
  memory?: {
    affectiveResidue?: unknown
    derivedMindStateBundle?: {
      affectiveResidue?: unknown
    } | null
    personStateProjection?: {
      selfContinuityAuthority?: {
        authoritySummary?: string | null
        inwardLine?: string | null
        sourceTags?: readonly string[] | null
      } | null
    } | null
  } | null
}

function hasNonEmptyText(values: readonly string[] | null | undefined) {
  return Array.isArray(values)
    && values.some(value => typeof value === 'string' && value.trim().length > 0)
}

export function resolveRuntimeSurfaceContinuityEvidenceScore(
  surface: RuntimeSurfaceContinuityEvidenceShape | null | undefined,
) {
  if (!surface)
    return 0

  const currentConsciousFrame = surface.dialogue?.currentConsciousFrame ?? null
  const selfContinuityAuthority
    = surface.memory?.personStateProjection?.selfContinuityAuthority ?? null

  let score = 0
  if (hasNonEmptyText(currentConsciousFrame?.reasonTags))
    score += 2
  if (surface.memory?.affectiveResidue || surface.memory?.derivedMindStateBundle?.affectiveResidue)
    score += 2
  if (hasNonEmptyText(selfContinuityAuthority?.sourceTags))
    score += 2

  return score
}

export function resolvePreferredRuntimeSurface<T extends RuntimeSurfaceContinuityEvidenceShape>(input: {
  spineRuntimeSurface: T | null | undefined
  preparedRuntimeSurface: T | null | undefined
  extraEvidenceScore?: (surface: T | null | undefined) => number
}) {
  const spineRuntimeSurface = input.spineRuntimeSurface ?? null
  const preparedRuntimeSurface = input.preparedRuntimeSurface ?? null
  if (!preparedRuntimeSurface)
    return spineRuntimeSurface
  if (!spineRuntimeSurface)
    return preparedRuntimeSurface

  const extraEvidenceScore = input.extraEvidenceScore ?? (() => 0)
  const spineUpdatedAt = Number(spineRuntimeSurface.perception?.updatedAt ?? 0)
  const preparedUpdatedAt = Number(preparedRuntimeSurface.perception?.updatedAt ?? 0)
  const spineContinuityEvidenceScore
    = resolveRuntimeSurfaceContinuityEvidenceScore(spineRuntimeSurface) + extraEvidenceScore(spineRuntimeSurface)
  const preparedContinuityEvidenceScore
    = resolveRuntimeSurfaceContinuityEvidenceScore(preparedRuntimeSurface) + extraEvidenceScore(preparedRuntimeSurface)
  const continuityEvidenceGap = spineContinuityEvidenceScore - preparedContinuityEvidenceScore

  if (preparedUpdatedAt > spineUpdatedAt) {
    if (continuityEvidenceGap >= 3)
      return spineRuntimeSurface
    return preparedRuntimeSurface
  }
  if (preparedUpdatedAt < spineUpdatedAt) {
    if (preparedContinuityEvidenceScore > spineContinuityEvidenceScore)
      return preparedRuntimeSurface
    return spineRuntimeSurface
  }

  return preparedContinuityEvidenceScore > spineContinuityEvidenceScore
    ? preparedRuntimeSurface
    : spineRuntimeSurface
}
