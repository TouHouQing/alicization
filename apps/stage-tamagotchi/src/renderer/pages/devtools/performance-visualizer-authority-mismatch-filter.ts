import type { StageEmbodimentPerformanceMatchedDriver } from '@proj-alicization/stage-shared'

export type PerformanceVisualizerAuthorityMismatchFilter
  = 'face-mismatch'
    | 'motion-mismatch'
    | 'lipsync-mismatch'

export interface PerformanceVisualizerAuthorityMismatchFilterInput {
  authorityDriftLanes?: string[]
  authoritySegmentMatched?: boolean | null
  authorityMatchedDrivers?: StageEmbodimentPerformanceMatchedDriver[]
}

export interface PerformanceVisualizerAuthorityMatchFlags {
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
}

export interface PerformanceVisualizerAuthorityMismatchReasonInput {
  authority: PerformanceVisualizerAuthorityMatchFlags | null | undefined
  matchedSources?: string[] | null
  driverExecutionSummary?: string | null
  finalSurfacePolicy?: string | null
}

const mismatchLabelMap: Record<PerformanceVisualizerAuthorityMismatchFilter, string> = {
  'face-mismatch': '表情',
  'motion-mismatch': '动作',
  'lipsync-mismatch': '口型',
}

function normalizeList(values: Array<string | null | undefined>) {
  return values
    .map(value => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean)
}

export function buildAuthorityMismatchSummary(
  authority: PerformanceVisualizerAuthorityMatchFlags | null | undefined,
) {
  if (!authority)
    return null

  const mismatches: PerformanceVisualizerAuthorityMismatchFilter[] = []
  if (authority.faceSegmentMatched === false)
    mismatches.push('face-mismatch')
  if (authority.motionSegmentMatched === false)
    mismatches.push('motion-mismatch')
  if (authority.lipsyncSegmentMatched === false)
    mismatches.push('lipsync-mismatch')

  return mismatches.length > 0 ? mismatches.join(', ') : null
}

export function buildAuthorityMismatchReasonSummary(
  input: PerformanceVisualizerAuthorityMismatchReasonInput,
) {
  const mismatchSummary = buildAuthorityMismatchSummary(input.authority)
  if (!mismatchSummary)
    return null

  const mismatchKinds = mismatchSummary
    .split(', ')
    .map(kind => kind.trim() as PerformanceVisualizerAuthorityMismatchFilter)
    .filter(kind => kind in mismatchLabelMap)
  const mismatchLabels = mismatchKinds
    .map(kind => mismatchLabelMap[kind])

  const sources = normalizeList(input.matchedSources ?? [])
  const executionKinds: PerformanceVisualizerAuthorityMismatchFilter[] = []
  const driverExecutionSummary = input.driverExecutionSummary?.trim() ?? ''
  if (driverExecutionSummary.includes('face='))
    executionKinds.push('face-mismatch')
  if (driverExecutionSummary.includes('motion='))
    executionKinds.push('motion-mismatch')
  if (driverExecutionSummary.includes('lipsync='))
    executionKinds.push('lipsync-mismatch')

  const execution = executionKinds.length > 0
    ? executionKinds.map(kind => mismatchLabelMap[kind]).join('、')
    : '无执行'
  const sourceText = sources.length > 0 ? sources.join('、') : '无来源'
  const mismatchText = mismatchLabels.length > 0 ? mismatchLabels.join('、') : '未知'
  const policyText = input.finalSurfacePolicy?.trim()

  return `${mismatchText} authority 漂移，当前绑定来源是 ${sourceText}，实际执行落点是${execution}${policyText ? `；当前表面策略是 ${policyText}` : ''}。`
}

export function matchesAuthorityMismatchFilter(
  input: PerformanceVisualizerAuthorityMismatchFilterInput,
  filter: PerformanceVisualizerAuthorityMismatchFilter,
) {
  const authorityDriftLanes = input.authorityDriftLanes ?? []
  const authoritySegmentMatched = input.authoritySegmentMatched ?? false
  const authorityMatchedDrivers = input.authorityMatchedDrivers ?? []
  if (!authoritySegmentMatched)
    return false

  const isSingleMissingDriverFallback = authorityMatchedDrivers.length === 2

  if (filter === 'face-mismatch') {
    if (authorityDriftLanes.length > 0) {
      if (!authorityDriftLanes.includes('face'))
        return false
    }
    else if (!isSingleMissingDriverFallback || authorityMatchedDrivers.includes('face')) {
      return false
    }

    return !authorityMatchedDrivers.includes('face')
  }

  if (filter === 'motion-mismatch') {
    if (authorityDriftLanes.length > 0) {
      if (!authorityDriftLanes.includes('motion') && !authorityDriftLanes.includes('action'))
        return false
    }
    else if (!isSingleMissingDriverFallback || authorityMatchedDrivers.includes('motion')) {
      return false
    }

    return !authorityMatchedDrivers.includes('motion')
  }

  if (authorityDriftLanes.length > 0) {
    if (!authorityDriftLanes.includes('lipsync'))
      return false
  }
  else if (!isSingleMissingDriverFallback || authorityMatchedDrivers.includes('lipsync')) {
    return false
  }

  return !authorityMatchedDrivers.includes('lipsync')
}
