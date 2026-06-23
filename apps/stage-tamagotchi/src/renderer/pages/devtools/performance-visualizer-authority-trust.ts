import type {
  PerformanceVisualizerAuthorityDriver,
  PerformanceVisualizerRendererTarget,
} from './performance-visualizer-driver-authority'

function formatAuthorityRendererTargetLabel(
  rendererTarget: PerformanceVisualizerRendererTarget,
) {
  if (rendererTarget === 'vrm')
    return 'VRM'
  if (rendererTarget === 'live2d')
    return 'Live2D'
  if (rendererTarget === 'speech')
    return 'speech'
  return '当前渲染体'
}

function formatCadenceGuidance(input: {
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
}) {
  const blink = input.preferredBlinkCadence?.trim() ?? ''
  const gaze = input.preferredGazeMode?.trim() ?? ''
  if (!blink && !gaze)
    return null

  const cadenceParts = [
    blink ? `${blink} blink` : null,
    gaze ? `${gaze} gaze` : null,
  ].filter((value): value is string => Boolean(value))

  if (cadenceParts.length === 0)
    return null

  return cadenceParts.join(' / ')
}

function extractStructuredSegmentId(summary: string | null | undefined) {
  if (typeof summary !== 'string')
    return null

  const match = summary.match(/(?:^|\|\s*)segment=([^|]+)/u)
  return match?.[1]?.trim() ?? null
}

function summaryCarriesVoiceLane(summary: string | null | undefined) {
  if (typeof summary !== 'string')
    return false

  const lane = summary.match(/(?:^|\|\s*)lane=([^|]+)/u)?.[1]?.trim() ?? null
  if (!lane)
    return false

  return lane.replace(/-only$/u, '').split('+').includes('voice')
}

function resolveAuthorityVoiceContinuityState(input: {
  prosodyAuthoritySummary: string | null
  settleAuthoritySummary?: string | null
  authoritySegmentId: string | null
  voiceSegmentMatched?: boolean | null
}) {
  if (typeof input.voiceSegmentMatched === 'boolean')
    return input.voiceSegmentMatched

  const settleSegmentId = extractStructuredSegmentId(input.settleAuthoritySummary)
  if (
    summaryCarriesVoiceLane(input.settleAuthoritySummary)
    && (!input.authoritySegmentId || !settleSegmentId || settleSegmentId === input.authoritySegmentId)
  ) {
    return true
  }

  const prosodySegmentId = extractStructuredSegmentId(input.prosodyAuthoritySummary)
  if (
    input.prosodyAuthoritySummary
    && input.authoritySegmentId
    && input.prosodyAuthoritySummary.includes('provenance=authority-bound')
    && prosodySegmentId === input.authoritySegmentId
  ) {
    return true
  }

  return null
}

export function deriveAuthorityTrustSummary(input: {
  prosodyAuthoritySummary: string | null
  settleAuthoritySummary?: string | null
  authoritySegmentId: string | null
  authorityRendererTarget: PerformanceVisualizerRendererTarget
  authorityMatchedDrivers: PerformanceVisualizerAuthorityDriver[]
  bodySegmentMatched?: boolean | null
  faceSegmentMatched: boolean | null
  motionSegmentMatched: boolean | null
  lipsyncSegmentMatched: boolean | null
  voiceSegmentMatched?: boolean | null
  residentMode?: string | null
  actionWindow?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
}) {
  const settleAuthoritySummary = typeof input.settleAuthoritySummary === 'string'
    ? input.settleAuthoritySummary.trim()
    : null
  const hasAudibleBodyPartialRejoin = Boolean(
    settleAuthoritySummary?.includes('lane=body+lipsync+voice-only')
    && settleAuthoritySummary?.includes('pending-rejoin=face+motion'),
  )
  const voiceContinuityState = resolveAuthorityVoiceContinuityState({
    prosodyAuthoritySummary: input.prosodyAuthoritySummary,
    settleAuthoritySummary,
    authoritySegmentId: input.authoritySegmentId,
    voiceSegmentMatched: input.voiceSegmentMatched ?? null,
  })
  const thinAffectiveReason = settleAuthoritySummary?.match(/(?:^|\|\s*)reason=([^|]+)$/u)?.[1]?.trim() ?? null
  const cadenceGuidance = formatCadenceGuidance({
    preferredBlinkCadence: input.preferredBlinkCadence,
    preferredGazeMode: input.preferredGazeMode,
  })

  if (thinAffectiveReason && input.authorityRendererTarget) {
    return `${formatAuthorityRendererTargetLabel(input.authorityRendererTarget)} 这段 authority 仍带着“${thinAffectiveReason}”这一层关系余温，所以外层观察不该把她压回纯技术 settle。${cadenceGuidance ? ` 当前还要守住 ${cadenceGuidance} 的关系节奏。` : ''}`
  }

  if (
    input.authoritySegmentId
    && input.residentMode === 'repair-before-closeness'
    && input.preferredBlinkCadence === 'quiet'
    && input.preferredGazeMode === 'soften'
  ) {
    return `${formatAuthorityRendererTargetLabel(input.authorityRendererTarget)} 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。`
  }

  if (
    input.authoritySegmentId
    && input.residentMode === 'measured-return'
    && input.actionWindow === 'same-turn-if-invited'
    && input.authorityRendererTarget
    && input.faceSegmentMatched === true
    && input.motionSegmentMatched === true
    && input.lipsyncSegmentMatched === true
    && input.authorityMatchedDrivers.includes('face')
    && input.authorityMatchedDrivers.includes('motion')
    && input.authorityMatchedDrivers.includes('lipsync')
  ) {
    return `${formatAuthorityRendererTargetLabel(input.authorityRendererTarget)} 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。`
  }

  if (
    input.authoritySegmentId
    && input.bodySegmentMatched === true
    && input.authorityMatchedDrivers.includes('body')
    && (input.faceSegmentMatched !== true
      || input.motionSegmentMatched !== true
      || input.lipsyncSegmentMatched !== true
      || !input.authorityMatchedDrivers.includes('face')
      || !input.authorityMatchedDrivers.includes('motion')
      || !input.authorityMatchedDrivers.includes('lipsync'))
  ) {
    if (hasAudibleBodyPartialRejoin) {
      return `${formatAuthorityRendererTargetLabel(input.authorityRendererTarget)} 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，表情和动作还在重连这条身体线。${cadenceGuidance ? ` 当前身体还在按 ${cadenceGuidance} 的节奏把这一条线稳住。` : ''}`
    }

    if (
      input.lipsyncSegmentMatched === true
      && input.authorityMatchedDrivers.includes('lipsync')
      && voiceContinuityState === true
    ) {
      return `${formatAuthorityRendererTargetLabel(input.authorityRendererTarget)} 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。${cadenceGuidance ? ` 当前身体还在按 ${cadenceGuidance} 的节奏把这一条线稳住。` : ''}`
    }

    if (voiceContinuityState === true) {
      return `${formatAuthorityRendererTargetLabel(input.authorityRendererTarget)} 这段 authority 现在主要由身体和声音继续托住，同一段 living segment 还在，只是表情、动作和口型暂时没有一起跟上。${cadenceGuidance ? ` 当前身体还在按 ${cadenceGuidance} 的节奏把这一条线稳住。` : ''}`
    }

    return `${formatAuthorityRendererTargetLabel(input.authorityRendererTarget)} 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。${cadenceGuidance ? ` 当前身体还在按 ${cadenceGuidance} 的节奏把这一条线稳住。` : ''}`
  }

  if (
    input.authoritySegmentId
    && input.lipsyncSegmentMatched === true
    && input.authorityMatchedDrivers.includes('lipsync')
    && input.faceSegmentMatched !== true
    && input.motionSegmentMatched !== true
  ) {
    if (voiceContinuityState === true) {
      return `${formatAuthorityRendererTargetLabel(input.authorityRendererTarget)} 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。${cadenceGuidance ? ` 当前口型还在按 ${cadenceGuidance} 的节奏把这一条线稳住。` : ''}`
    }

    if (voiceContinuityState === false) {
      return `${formatAuthorityRendererTargetLabel(input.authorityRendererTarget)} 这段 authority 现在主要由口型继续托住，同一段 living segment 还在，只是声音、表情和动作暂时没有一起跟上。${cadenceGuidance ? ` 当前口型还在按 ${cadenceGuidance} 的节奏把这一条线稳住。` : ''}`
    }

    return `${formatAuthorityRendererTargetLabel(input.authorityRendererTarget)} 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。${cadenceGuidance ? ` 当前口型还在按 ${cadenceGuidance} 的节奏把这一条线稳住。` : ''}`
  }

  if (
    input.authoritySegmentId
    && input.authorityRendererTarget
    && input.faceSegmentMatched === true
    && input.motionSegmentMatched === true
    && input.lipsyncSegmentMatched === true
    && input.authorityMatchedDrivers.includes('face')
    && input.authorityMatchedDrivers.includes('motion')
    && input.authorityMatchedDrivers.includes('lipsync')
  ) {
    return `${formatAuthorityRendererTargetLabel(input.authorityRendererTarget)} 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。`
  }

  if (
    input.prosodyAuthoritySummary
    && input.authoritySegmentId
    && input.prosodyAuthoritySummary.includes('provenance=authority-bound')
    && input.prosodyAuthoritySummary.includes(`segment=${input.authoritySegmentId}`)
  ) {
    return '韵律权威链已重新绑定到当前片段，可直接进入长期基线。'
  }

  return null
}
