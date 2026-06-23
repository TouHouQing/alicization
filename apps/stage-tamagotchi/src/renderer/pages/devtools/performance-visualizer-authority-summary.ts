type AuthoritySurface = 'live2d' | 'vrm'
type AuthorityLane = 'expression' | 'motion' | 'face' | 'action' | 'lipsync' | 'settle'

export interface PerformanceVisualizerAuthoritySummaryEntry {
  surface: AuthoritySurface
  lane: AuthorityLane
  cueId: string
  planned: string
  consumed: string
  source: string | null
  confidence?: number | null
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
  }
  aligned: boolean | null
}

export interface PerformanceVisualizerAuthoritySegmentRow {
  cueId: string
  cueText: string | null
  surfaces: AuthoritySurface[]
  lanes: AuthorityLane[]
  aligned: boolean | null
  driftStatus: 'all-aligned' | 'partial-drift' | 'hard-drift' | 'unknown'
  entries: PerformanceVisualizerAuthoritySummaryEntry[]
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function normalizeNumber(value: unknown) {
  return Number.isFinite(value)
    ? Number(value)
    : null
}

function firstAlias(values: unknown) {
  return Array.isArray(values)
    ? values
      .map(item => normalizeText(item))
      .find(Boolean) ?? null
    : null
}

function pushEntry(
  entries: PerformanceVisualizerAuthoritySummaryEntry[],
  input: {
    surface: AuthoritySurface
    lane: AuthorityLane
    cueId: unknown
    planned: unknown
    consumed: unknown
    source?: unknown
    confidence?: unknown
    settle?: PerformanceVisualizerAuthoritySummaryEntry['settle']
    aligned?: boolean | null
  },
) {
  const cueId = normalizeText(input.cueId)
  const planned = normalizeText(input.planned)
  const consumed = normalizeText(input.consumed)

  if (!cueId || !planned || !consumed)
    return

  entries.push({
    surface: input.surface,
    lane: input.lane,
    cueId,
    planned,
    consumed,
    source: normalizeText(input.source),
    ...(normalizeNumber(input.confidence) != null
      ? { confidence: normalizeNumber(input.confidence) }
      : {}),
    ...(input.settle ? { settle: input.settle } : {}),
    aligned: input.aligned ?? null,
  })
}

export function buildAuthoritySummaryEntries(input: {
  live2d?: {
    cueId?: string
    cueText?: string | null
    plannedExpressionAliases?: string[]
    consumedExpressionName?: string | null
    expressionAligned?: boolean | null
    plannedMotionAliases?: string[]
    consumedMotionGroup?: string | null
    motionAligned?: boolean | null
    plannedFaceCue?: string | null
    consumedFaceCue?: string | null
    faceSource?: string | null
    faceSegmentAligned?: boolean | null
    plannedMotionCue?: string | null
    consumedMotionCue?: string | null
    motionSource?: string | null
    motionSegmentAligned?: boolean | null
    consumedLipsyncCue?: string | null
    lipsyncSource?: string | null
    lipsyncConfidence?: number | null
    lipsyncSegmentAligned?: boolean | null
    plannedSettleCue?: string | null
    consumedSettleCue?: string | null
    plannedLive2dFacialReleaseMs?: number | null
    consumedLive2dFacialReleaseMs?: number | null
    plannedLive2dMotionFollowThroughMs?: number | null
    consumedLive2dMotionFollowThroughMs?: number | null
    settleAligned?: boolean | null
  } | null
  vrm?: {
    cueId?: string
    cueText?: string | null
    plannedExpressionAliases?: string[]
    consumedExpressionAliases?: string[]
    expressionAligned?: boolean | null
    plannedMotionAliases?: string[]
    consumedMotionAliases?: string[]
    motionAligned?: boolean | null
    plannedFaceCue?: string | null
    consumedFaceCue?: string | null
    faceSource?: string | null
    faceSegmentAligned?: boolean | null
    plannedActionCue?: string | null
    consumedActionCue?: string | null
    motionSource?: string | null
    motionSegmentAligned?: boolean | null
    consumedLipsyncCue?: string | null
    lipsyncSource?: string | null
    lipsyncConfidence?: number | null
    lipsyncSegmentAligned?: boolean | null
    plannedSettleCue?: string | null
    consumedSettleCue?: string | null
    plannedVrmActionFadeMs?: number | null
    consumedVrmActionFadeMs?: number | null
    plannedVrmExpressionBlendMs?: number | null
    consumedVrmExpressionBlendMs?: number | null
    settleAligned?: boolean | null
  } | null
}): PerformanceVisualizerAuthoritySummaryEntry[] {
  const entries: PerformanceVisualizerAuthoritySummaryEntry[] = []

  if (input.live2d) {
    pushEntry(entries, {
      surface: 'live2d',
      lane: 'expression',
      cueId: input.live2d.cueId,
      planned: firstAlias(input.live2d.plannedExpressionAliases),
      consumed: input.live2d.consumedExpressionName,
      aligned: input.live2d.expressionAligned,
    })
    pushEntry(entries, {
      surface: 'live2d',
      lane: 'motion',
      cueId: input.live2d.cueId,
      planned: input.live2d.plannedMotionCue ?? firstAlias(input.live2d.plannedMotionAliases),
      consumed: input.live2d.consumedMotionCue ?? input.live2d.consumedMotionGroup,
      source: input.live2d.motionSource,
      aligned: input.live2d.motionAligned ?? input.live2d.motionSegmentAligned,
    })
    pushEntry(entries, {
      surface: 'live2d',
      lane: 'face',
      cueId: input.live2d.cueId,
      planned: input.live2d.plannedFaceCue,
      consumed: input.live2d.consumedFaceCue,
      source: input.live2d.faceSource,
      aligned: input.live2d.faceSegmentAligned,
    })
    pushEntry(entries, {
      surface: 'live2d',
      lane: 'lipsync',
      cueId: input.live2d.cueId,
      planned: input.live2d.consumedLipsyncCue,
      consumed: input.live2d.consumedLipsyncCue,
      source: input.live2d.lipsyncSource,
      confidence: input.live2d.lipsyncConfidence,
      aligned: input.live2d.lipsyncSegmentAligned,
    })
    pushEntry(entries, {
      surface: 'live2d',
      lane: 'settle',
      cueId: input.live2d.cueId,
      planned: 'settle',
      consumed: 'settle',
      settle: {
        live2dFacialReleaseMs: {
          planned: normalizeNumber(input.live2d.plannedLive2dFacialReleaseMs),
          consumed: normalizeNumber(input.live2d.consumedLive2dFacialReleaseMs),
        },
        live2dMotionFollowThroughMs: {
          planned: normalizeNumber(input.live2d.plannedLive2dMotionFollowThroughMs),
          consumed: normalizeNumber(input.live2d.consumedLive2dMotionFollowThroughMs),
        },
      },
      aligned: input.live2d.settleAligned,
    })
  }

  if (input.vrm) {
    pushEntry(entries, {
      surface: 'vrm',
      lane: 'expression',
      cueId: input.vrm.cueId,
      planned: firstAlias(input.vrm.plannedExpressionAliases),
      consumed: firstAlias(input.vrm.consumedExpressionAliases),
      aligned: input.vrm.expressionAligned,
    })
    pushEntry(entries, {
      surface: 'vrm',
      lane: 'action',
      cueId: input.vrm.cueId,
      planned: input.vrm.plannedActionCue,
      consumed: input.vrm.consumedActionCue,
      source: input.vrm.motionSource,
      aligned: input.vrm.motionSegmentAligned,
    })
    pushEntry(entries, {
      surface: 'vrm',
      lane: 'face',
      cueId: input.vrm.cueId,
      planned: input.vrm.plannedFaceCue,
      consumed: input.vrm.consumedFaceCue,
      source: input.vrm.faceSource,
      aligned: input.vrm.faceSegmentAligned,
    })
    pushEntry(entries, {
      surface: 'vrm',
      lane: 'lipsync',
      cueId: input.vrm.cueId,
      planned: input.vrm.consumedLipsyncCue,
      consumed: input.vrm.consumedLipsyncCue,
      source: input.vrm.lipsyncSource,
      confidence: input.vrm.lipsyncConfidence,
      aligned: input.vrm.lipsyncSegmentAligned,
    })
    pushEntry(entries, {
      surface: 'vrm',
      lane: 'settle',
      cueId: input.vrm.cueId,
      planned: 'settle',
      consumed: 'settle',
      settle: {
        vrmActionFadeMs: {
          planned: normalizeNumber(input.vrm.plannedVrmActionFadeMs),
          consumed: normalizeNumber(input.vrm.consumedVrmActionFadeMs),
        },
        vrmExpressionBlendMs: {
          planned: normalizeNumber(input.vrm.plannedVrmExpressionBlendMs),
          consumed: normalizeNumber(input.vrm.consumedVrmExpressionBlendMs),
        },
      },
      aligned: input.vrm.settleAligned,
    })
  }

  return entries
}

const driftStatusPriority: Record<PerformanceVisualizerAuthoritySegmentRow['driftStatus'], number> = {
  'hard-drift': 0,
  'partial-drift': 1,
  'unknown': 2,
  'all-aligned': 3,
}

export function sortAuthoritySegmentRows(
  rows: PerformanceVisualizerAuthoritySegmentRow[],
): PerformanceVisualizerAuthoritySegmentRow[] {
  return [...rows].sort((left, right) => {
    const priorityDelta = driftStatusPriority[left.driftStatus] - driftStatusPriority[right.driftStatus]
    if (priorityDelta !== 0)
      return priorityDelta

    const cueTextLeft = normalizeText(left.cueText) ?? ''
    const cueTextRight = normalizeText(right.cueText) ?? ''
    if (cueTextLeft !== cueTextRight)
      return cueTextLeft.localeCompare(cueTextRight)

    return left.cueId.localeCompare(right.cueId)
  })
}

export function filterAuthoritySegmentRows(
  rows: PerformanceVisualizerAuthoritySegmentRow[],
  options?: {
    onlyDrift?: boolean
  },
): PerformanceVisualizerAuthoritySegmentRow[] {
  if (!options?.onlyDrift)
    return [...rows]

  return rows.filter(row => row.driftStatus === 'hard-drift' || row.driftStatus === 'partial-drift')
}

export function buildAuthoritySegmentRows(
  entries: PerformanceVisualizerAuthoritySummaryEntry[],
  cueTextById?: Record<string, string | null | undefined>,
): PerformanceVisualizerAuthoritySegmentRow[] {
  const rows = new Map<string, PerformanceVisualizerAuthoritySegmentRow>()

  function resolveAlignedState(rowEntries: PerformanceVisualizerAuthoritySummaryEntry[]) {
    return rowEntries.every(item => item.aligned === true)
      ? true
      : rowEntries.some(item => item.aligned === false)
        ? false
        : null
  }

  function resolveDriftStatus(aligned: boolean | null, rowEntries: PerformanceVisualizerAuthoritySummaryEntry[]) {
    if (aligned === true)
      return 'all-aligned' as const
    if (aligned === false) {
      return rowEntries.some(item => item.aligned === true)
        ? 'partial-drift' as const
        : 'hard-drift' as const
    }
    return 'unknown' as const
  }

  entries.forEach((entry) => {
    const existing = rows.get(entry.cueId)
    if (existing) {
      existing.entries.push(entry)
      if (!existing.surfaces.includes(entry.surface))
        existing.surfaces.push(entry.surface)
      if (!existing.lanes.includes(entry.lane))
        existing.lanes.push(entry.lane)
      existing.aligned = resolveAlignedState(existing.entries)
      existing.driftStatus = resolveDriftStatus(existing.aligned, existing.entries)
      return
    }

    const entriesForRow = [entry]
    const aligned = resolveAlignedState(entriesForRow)

    rows.set(entry.cueId, {
      cueId: entry.cueId,
      cueText: normalizeText(cueTextById?.[entry.cueId]) ?? null,
      surfaces: [entry.surface],
      lanes: [entry.lane],
      aligned,
      driftStatus: resolveDriftStatus(aligned, entriesForRow),
      entries: entriesForRow,
    })
  })

  return [...rows.values()]
}
