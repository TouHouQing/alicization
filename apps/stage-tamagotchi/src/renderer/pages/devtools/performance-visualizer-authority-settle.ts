export interface PerformanceVisualizerAuthoritySettleShape {
  settle?: {
    live2dFacialReleaseMs?: {
      planned: number | null
      consumed: number | null
    }
    live2dMotionFollowThroughMs?: {
      planned: number | null
      consumed: number | null
    }
    vrmActionFadeMs?: {
      planned: number | null
      consumed: number | null
    }
    vrmExpressionBlendMs?: {
      planned: number | null
      consumed: number | null
    }
  } | null
}

function formatNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? String(value) : 'n/a'
}

export function buildAuthoritySettleLines(input: PerformanceVisualizerAuthoritySettleShape | null | undefined) {
  const settle = input?.settle
  if (!settle)
    return []

  const lines: string[] = []

  if (settle.live2dFacialReleaseMs) {
    lines.push(`live2dFacialReleaseMs: ${formatNumber(settle.live2dFacialReleaseMs.planned)} -> ${formatNumber(settle.live2dFacialReleaseMs.consumed)}`)
  }
  if (settle.live2dMotionFollowThroughMs) {
    lines.push(`live2dMotionFollowThroughMs: ${formatNumber(settle.live2dMotionFollowThroughMs.planned)} -> ${formatNumber(settle.live2dMotionFollowThroughMs.consumed)}`)
  }
  if (settle.vrmActionFadeMs) {
    lines.push(`vrmActionFadeMs: ${formatNumber(settle.vrmActionFadeMs.planned)} -> ${formatNumber(settle.vrmActionFadeMs.consumed)}`)
  }
  if (settle.vrmExpressionBlendMs) {
    lines.push(`vrmExpressionBlendMs: ${formatNumber(settle.vrmExpressionBlendMs.planned)} -> ${formatNumber(settle.vrmExpressionBlendMs.consumed)}`)
  }

  return lines
}
