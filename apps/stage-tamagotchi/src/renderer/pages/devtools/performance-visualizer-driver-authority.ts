import type { StageEmbodimentPerformanceMatchedDriver } from '@proj-alicization/stage-shared'

export type PerformanceVisualizerAuthorityDriver = StageEmbodimentPerformanceMatchedDriver

export interface PerformanceVisualizerDriverAuthorityBinding {
  rendererTarget: 'live2d' | 'vrm' | null
  matchedDrivers: PerformanceVisualizerAuthorityDriver[]
  matchedSources: string[]
  faceSegmentMatched: boolean | null
  motionSegmentMatched: boolean | null
  lipsyncSegmentMatched: boolean | null
}

function formatMatchFlag(value: boolean | null | undefined) {
  if (value == null)
    return 'n/a'
  return value ? 'yes' : 'no'
}

function normalizeUniqueSources(values: string[]) {
  return values.filter((value, index, items) => items.indexOf(value) === index)
}

export function formatDriverAuthorityMatchSummary(
  authority: Pick<
    PerformanceVisualizerDriverAuthorityBinding,
    'faceSegmentMatched' | 'motionSegmentMatched' | 'lipsyncSegmentMatched'
  > | null | undefined,
) {
  if (!authority)
    return null

  return `face:${formatMatchFlag(authority.faceSegmentMatched)} motion:${formatMatchFlag(authority.motionSegmentMatched)} lipsync:${formatMatchFlag(authority.lipsyncSegmentMatched)}`
}

export function formatDriverAuthorityBindingSummary(
  authority: Pick<
    PerformanceVisualizerDriverAuthorityBinding,
    'rendererTarget' | 'matchedDrivers' | 'matchedSources' | 'faceSegmentMatched' | 'motionSegmentMatched' | 'lipsyncSegmentMatched'
  > | null | undefined,
) {
  if (!authority)
    return null

  const matchSummary = formatDriverAuthorityMatchSummary(authority)
  const matchedSources = normalizeUniqueSources(authority.matchedSources)
  return `target=${authority.rendererTarget ?? 'n/a'} | drivers=${authority.matchedDrivers.join(', ') || 'n/a'} | sources=${matchedSources.join(', ') || 'n/a'} | matches=${matchSummary ?? 'n/a'}`
}

function resolveTextEqualityAlignment(left: string | null, right: string | null) {
  if (!left && !right)
    return null
  if (!left || !right)
    return false

  return left.toLowerCase() === right.toLowerCase()
}

export function resolveDriverAuthorityAlignment(
  matched: boolean | null | undefined,
  cueId: string | null,
  segmentId: string | null,
) {
  if (typeof matched === 'boolean')
    return matched

  return resolveTextEqualityAlignment(cueId, segmentId)
}
