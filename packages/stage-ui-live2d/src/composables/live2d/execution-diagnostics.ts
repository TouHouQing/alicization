import type {
  StageEmbodimentPerformanceState,
} from '@proj-alicization/stage-shared'

import type { Live2DResolvedExpressionSelection } from './expression-runtime'

export interface Live2DExecutionDiagnosticsSnapshot {
  activeExpression: {
    name: string | null
    reason: Live2DResolvedExpressionSelection['reason'] | null
    score: number | null
    segmentId: string | null
  } | null
  activeMotion: {
    group: string | null
    index: number | null
    segmentId: string | null
  } | null
  cue: {
    emotion: string | null
    facialCue: string | null
    preferredExpressionAliases: string[]
    live2dFacialReleaseMs: number | null
    live2dMotionFollowThroughMs: number | null
  } | null
}

function normalizeText(value: string | null | undefined) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim()
  return normalized || null
}

function normalizeOptionalIndex(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return null

  return Math.max(0, Math.floor(Number(value)))
}

function normalizeOptionalScore(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return null

  return Number(value)
}

function normalizeAliasList(values: string[] | null | undefined) {
  return (values ?? [])
    .map(value => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean)
}

function resolveExecutionSegmentId(performanceState: StageEmbodimentPerformanceState | null | undefined) {
  return normalizeText(
    performanceState?.activeSegment?.segmentId
    ?? performanceState?.driverAuthority?.segmentId
    ?? performanceState?.activeCue?.id
    ?? null,
  )
}

export function createIdleLive2DExecutionDiagnosticsSnapshot(): Live2DExecutionDiagnosticsSnapshot {
  return {
    activeExpression: null,
    activeMotion: null,
    cue: null,
  }
}

export function buildLive2DExecutionDiagnosticsSnapshot(input: {
  currentMotion?: { group?: string | null, index?: number | null } | null
  performanceState?: StageEmbodimentPerformanceState | null
  preferredExpressionAliases?: string[] | null
  selection?: Live2DResolvedExpressionSelection | null
}) {
  const facialCue = normalizeText(
    input.performanceState?.activeFacialCue
    ?? input.performanceState?.performance.facialCue
    ?? null,
  )
  const emotion = normalizeText(
    input.performanceState?.activeCue?.emotion
    ?? input.performanceState?.performance.baseEmotion
    ?? null,
  )
  const rendererSettle = input.performanceState?.activeCue?.rendererSettle
  const motionGroup = normalizeText(input.currentMotion?.group)
  const motionIndex = normalizeOptionalIndex(input.currentMotion?.index)
  const segmentId = resolveExecutionSegmentId(input.performanceState)

  return {
    activeExpression: input.selection
      ? {
          name: normalizeText(input.selection.name),
          reason: input.selection.reason,
          score: normalizeOptionalScore(input.selection.score),
          segmentId,
        }
      : null,
    activeMotion: motionGroup || motionIndex != null
      ? {
          group: motionGroup,
          index: motionIndex,
          segmentId,
        }
      : null,
    cue: emotion
      || facialCue
      || rendererSettle
      || normalizeAliasList(input.preferredExpressionAliases).length > 0
      ? {
          emotion,
          facialCue,
          preferredExpressionAliases: normalizeAliasList(input.preferredExpressionAliases),
          live2dFacialReleaseMs: Number.isFinite(rendererSettle?.live2dFacialReleaseMs)
            ? Number(rendererSettle?.live2dFacialReleaseMs)
            : null,
          live2dMotionFollowThroughMs: Number.isFinite(rendererSettle?.live2dMotionFollowThroughMs)
            ? Number(rendererSettle?.live2dMotionFollowThroughMs)
            : null,
        }
      : null,
  } satisfies Live2DExecutionDiagnosticsSnapshot
}
