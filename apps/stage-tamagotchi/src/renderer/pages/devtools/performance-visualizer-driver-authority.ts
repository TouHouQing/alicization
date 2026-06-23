export type PerformanceVisualizerAuthorityDriver = 'body' | 'face' | 'motion' | 'lipsync' | 'voice'
export type PerformanceVisualizerRendererTarget = 'live2d' | 'vrm' | 'speech' | null

export interface PerformanceVisualizerDriverAuthorityBinding {
  rendererTarget: PerformanceVisualizerRendererTarget
  matchedDrivers: PerformanceVisualizerAuthorityDriver[]
  matchedSources: string[]
  bodySegmentMatched?: boolean | null
  faceSegmentMatched: boolean | null
  motionSegmentMatched: boolean | null
  lipsyncSegmentMatched: boolean | null
  voiceSegmentMatched?: boolean | null
}

function formatMatchFlag(value: boolean | null | undefined) {
  if (value == null)
    return 'n/a'
  return value ? 'yes' : 'no'
}

export function resolveDriverMatchFlagFromSummary(
  summary: string | null | undefined,
  driver: PerformanceVisualizerAuthorityDriver,
) {
  if (typeof summary !== 'string' || !summary.trim())
    return null

  const match = summary.match(new RegExp(`${driver}:(yes|no)(?:\\b|$)`))
  if (!match)
    return null

  return match[1] === 'yes'
}

export function resolveDriverMatchFlagFromAuthoritySummary(input: {
  matchSummary?: string | null
  matchedDrivers?: Array<PerformanceVisualizerAuthorityDriver> | null
  authorityMismatchSummary?: string | null
  driver: PerformanceVisualizerAuthorityDriver
}) {
  const summaryFlag = resolveDriverMatchFlagFromSummary(input.matchSummary, input.driver)
  if (summaryFlag != null)
    return summaryFlag

  const matchedDrivers = input.matchedDrivers ?? []
  if (matchedDrivers.includes(input.driver))
    return true

  const mismatchSummary = typeof input.authorityMismatchSummary === 'string'
    ? input.authorityMismatchSummary
    : null
  if (mismatchSummary?.includes(`${input.driver}-mismatch`))
    return false

  return null
}

function normalizeUniqueSources(values: string[]) {
  return values.filter((value, index, items) => items.indexOf(value) === index)
}

function resolveDriverAuthorityLaneSummary(
  authority: Pick<
    PerformanceVisualizerDriverAuthorityBinding,
    'bodySegmentMatched' | 'faceSegmentMatched' | 'motionSegmentMatched' | 'lipsyncSegmentMatched' | 'voiceSegmentMatched'
  > | null | undefined,
) {
  if (!authority)
    return null

  const knownLanePairs = [
    authority.bodySegmentMatched != null ? ['body', authority.bodySegmentMatched] as const : null,
    authority.faceSegmentMatched != null ? ['face', authority.faceSegmentMatched] as const : null,
    authority.motionSegmentMatched != null ? ['motion', authority.motionSegmentMatched] as const : null,
    authority.lipsyncSegmentMatched != null ? ['lipsync', authority.lipsyncSegmentMatched] as const : null,
    authority.voiceSegmentMatched != null ? ['voice', authority.voiceSegmentMatched] as const : null,
  ].filter((value): value is readonly [PerformanceVisualizerAuthorityDriver, boolean] => value != null)
  const survivingLanes = knownLanePairs
    .filter(([, matched]) => matched)
    .map(([lane]) => lane)

  if (knownLanePairs.length === 0 || survivingLanes.length === 0 || survivingLanes.length === knownLanePairs.length)
    return null

  return `lane=${survivingLanes.join('+')}-only`
}

export function formatDriverAuthorityMatchSummary(
  authority: Pick<
    PerformanceVisualizerDriverAuthorityBinding,
    'bodySegmentMatched' | 'faceSegmentMatched' | 'motionSegmentMatched' | 'lipsyncSegmentMatched' | 'voiceSegmentMatched'
  > | null | undefined,
) {
  if (!authority)
    return null

  const parts = [
    authority.bodySegmentMatched != null ? `body:${formatMatchFlag(authority.bodySegmentMatched)}` : null,
    `face:${formatMatchFlag(authority.faceSegmentMatched)}`,
    `motion:${formatMatchFlag(authority.motionSegmentMatched)}`,
    `lipsync:${formatMatchFlag(authority.lipsyncSegmentMatched)}`,
    authority.voiceSegmentMatched != null ? `voice:${formatMatchFlag(authority.voiceSegmentMatched)}` : null,
  ].filter((part): part is string => Boolean(part))

  return parts.join(' ')
}

export function formatDriverAuthorityBindingSummary(
  authority: Pick<
    PerformanceVisualizerDriverAuthorityBinding,
    'rendererTarget' | 'matchedDrivers' | 'matchedSources' | 'bodySegmentMatched' | 'faceSegmentMatched' | 'motionSegmentMatched' | 'lipsyncSegmentMatched' | 'voiceSegmentMatched'
  > | null | undefined,
) {
  if (!authority)
    return null

  const matchSummary = formatDriverAuthorityMatchSummary(authority)
  const matchedSources = normalizeUniqueSources(authority.matchedSources)
  const laneSummary = resolveDriverAuthorityLaneSummary(authority)
  return [
    `target=${authority.rendererTarget ?? 'n/a'} | drivers=${authority.matchedDrivers.join(', ') || 'n/a'} | sources=${matchedSources.join(', ') || 'n/a'} | matches=${matchSummary ?? 'n/a'}`,
    laneSummary,
  ].filter((value): value is string => Boolean(value)).join(' | ')
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
