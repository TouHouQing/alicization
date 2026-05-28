import type {
  StageEmbodimentPerformanceState,
} from '@proj-alicization/stage-shared'

export interface VrmExecutionDiagnosticsSnapshot {
  activeEmotion: {
    name: string | null
    resolvedExpressionNames: string[]
    segmentId: string | null
  } | null
  activeFacialCue: {
    name: string | null
    affectsMouth: boolean | null
    segmentId: string | null
  } | null
  cue: {
    emotion: string | null
    facialCue: string | null
    preferredExpressionAliases: string[]
    vrmExpressionBlendMs: number | null
  } | null
}

function normalizeText(value: string | null | undefined) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim()
  return normalized || null
}

function normalizeAliasList(values: readonly string[] | string[] | null | undefined) {
  return (values ?? [])
    .map(value => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean)
}

function normalizeResolvedExpressionNames(values: readonly string[] | string[] | null | undefined) {
  return [...new Set(normalizeAliasList(values).map(value => value.toLowerCase()))]
}

function resolveExecutionSegmentId(performanceState: StageEmbodimentPerformanceState | null | undefined) {
  return normalizeText(
    performanceState?.activeSegment?.segmentId
    ?? performanceState?.driverAuthority?.segmentId
    ?? performanceState?.activeCue?.id
    ?? null,
  )
}

export function createIdleVrmExecutionDiagnosticsSnapshot(): VrmExecutionDiagnosticsSnapshot {
  return {
    activeEmotion: null,
    activeFacialCue: null,
    cue: null,
  }
}

export function buildVrmExecutionDiagnosticsSnapshot(input: {
  currentEmotion?: string | null
  currentEmotionResolvedExpressionNames?: string[] | null
  currentFacialCue?: string | null
  currentFacialCueAffectsMouth?: boolean | null
  performanceState?: StageEmbodimentPerformanceState | null
}) {
  const performanceState = input.performanceState
  const emotion = normalizeText(
    performanceState?.activeCue?.emotion
    ?? performanceState?.performance.baseEmotion
    ?? null,
  )
  const facialCue = normalizeText(
    performanceState?.activeFacialCue
    ?? performanceState?.performance.facialCue
    ?? null,
  )
  const segmentId = resolveExecutionSegmentId(performanceState)
  const rendererSettle = performanceState?.activeCue?.rendererSettle
  const currentEmotion = normalizeText(input.currentEmotion)
  const currentEmotionResolvedExpressionNames = normalizeResolvedExpressionNames(input.currentEmotionResolvedExpressionNames)
  const currentFacialCue = normalizeText(input.currentFacialCue)

  return {
    activeEmotion: currentEmotion || currentEmotionResolvedExpressionNames.length > 0
      ? {
          name: currentEmotion,
          resolvedExpressionNames: currentEmotionResolvedExpressionNames,
          segmentId,
        }
      : null,
    activeFacialCue: currentFacialCue || typeof input.currentFacialCueAffectsMouth === 'boolean'
      ? {
          name: currentFacialCue,
          affectsMouth: typeof input.currentFacialCueAffectsMouth === 'boolean'
            ? input.currentFacialCueAffectsMouth
            : null,
          segmentId,
        }
      : null,
    cue: emotion
      || facialCue
      || rendererSettle
      || normalizeAliasList(performanceState?.activeCue?.rendererHints?.preferredExpressionAliases).length > 0
      ? {
          emotion,
          facialCue,
          preferredExpressionAliases: normalizeAliasList(performanceState?.activeCue?.rendererHints?.preferredExpressionAliases),
          vrmExpressionBlendMs: Number.isFinite(rendererSettle?.vrmExpressionBlendMs)
            ? Number(rendererSettle?.vrmExpressionBlendMs)
            : null,
        }
      : null,
  } satisfies VrmExecutionDiagnosticsSnapshot
}
