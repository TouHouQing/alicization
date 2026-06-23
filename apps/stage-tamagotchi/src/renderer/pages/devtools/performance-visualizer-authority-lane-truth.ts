import type { PerformanceVisualizerAuthorityMatchFlags } from './performance-visualizer-authority-mismatch-filter'
import type { PerformanceVisualizerAuthorityDriver } from './performance-visualizer-driver-authority'

import {
  buildAuthorityMismatchReasonSummary,
  buildAuthorityMismatchSummary,

} from './performance-visualizer-authority-mismatch-filter'
import { resolveDriverMatchFlagFromAuthoritySummary } from './performance-visualizer-driver-authority'

export interface PerformanceVisualizerAuthorityLaneTruthInput {
  matchSummary?: string | null
  matchedDrivers?: Array<PerformanceVisualizerAuthorityDriver> | null
  authorityMismatchSummary?: string | null
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
  fallbackDriverMatched?: ((driver: PerformanceVisualizerAuthorityDriver) => boolean | null) | null
  matchedSources?: string[] | null
  driverExecutionSummary?: string | null
  finalSurfacePolicy?: string | null
  authorityMismatchReasonSummary?: string | null
  authorityMismatchDisplay?: string | null
}

function resolveAuthorityLaneFlag(
  input: PerformanceVisualizerAuthorityLaneTruthInput,
  driver: PerformanceVisualizerAuthorityDriver,
) {
  const directFlag = resolveDriverMatchFlagFromAuthoritySummary({
    matchSummary: input.matchSummary,
    matchedDrivers: input.matchedDrivers,
    authorityMismatchSummary: input.authorityMismatchSummary,
    driver,
  })

  if (directFlag != null)
    return directFlag

  const explicitFlag = driver === 'body'
    ? input.bodySegmentMatched
    : driver === 'face'
      ? input.faceSegmentMatched
      : driver === 'motion'
        ? input.motionSegmentMatched
        : driver === 'lipsync'
          ? input.lipsyncSegmentMatched
          : input.voiceSegmentMatched
  if (explicitFlag != null)
    return explicitFlag

  return input.fallbackDriverMatched?.(driver) ?? null
}

export function resolveAuthorityLaneTruth(
  input: PerformanceVisualizerAuthorityLaneTruthInput,
) {
  const authority: PerformanceVisualizerAuthorityMatchFlags = {
    bodySegmentMatched: resolveAuthorityLaneFlag(input, 'body'),
    faceSegmentMatched: resolveAuthorityLaneFlag(input, 'face'),
    motionSegmentMatched: resolveAuthorityLaneFlag(input, 'motion'),
    lipsyncSegmentMatched: resolveAuthorityLaneFlag(input, 'lipsync'),
    voiceSegmentMatched: resolveAuthorityLaneFlag(input, 'voice'),
  }

  const authorityMismatchSummary = input.authorityMismatchSummary
    ?? buildAuthorityMismatchSummary(authority)
  const authorityMismatchReasonSummary = input.authorityMismatchReasonSummary
    ?? buildAuthorityMismatchReasonSummary({
      authority,
      matchedSources: input.matchedSources,
      driverExecutionSummary: input.driverExecutionSummary,
      finalSurfacePolicy: input.finalSurfacePolicy,
    })
  const authorityMismatchDisplay = input.authorityMismatchDisplay
    ?? authorityMismatchReasonSummary
    ?? authorityMismatchSummary

  return {
    authority,
    authorityMismatchSummary,
    authorityMismatchReasonSummary,
    authorityMismatchDisplay,
  }
}
