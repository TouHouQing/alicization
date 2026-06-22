import type { AlicizationEmbodimentScriptV1 } from '@proj-alicization/stage-shared'

function resolveLive2DDriverSegment(
  script: AlicizationEmbodimentScriptV1,
  segmentId: string | null | undefined,
) {
  const normalizedSegmentId = segmentId?.trim()
  if (!normalizedSegmentId)
    return script.speechPlan.segments[0] ?? null

  return script.speechPlan.segments.find(segment => segment.id === normalizedSegmentId)
    ?? script.speechPlan.segments[0]
    ?? null
}

export function resolveLive2DDriverResidentMode(
  script: AlicizationEmbodimentScriptV1,
  segmentId: string | null | undefined,
): AlicizationEmbodimentScriptV1['state']['residentMode'] {
  const segmentResidentMode = resolveLive2DDriverSegment(script, segmentId)?.rendererHints?.residentMode ?? null
  if (segmentResidentMode === 'measured-return' || segmentResidentMode === 'repair-before-closeness')
    return segmentResidentMode

  return script.state.residentMode
}

export function resolveLive2DDriverRendererHints(
  script: AlicizationEmbodimentScriptV1,
  segmentId: string | null | undefined,
) {
  return resolveLive2DDriverSegment(script, segmentId)?.rendererHints ?? null
}
