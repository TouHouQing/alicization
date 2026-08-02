import type {
  AlicizationEmbodimentContinuityLedgerSnapshot,
  AlicizationEmbodimentContinuityLane as SharedAlicizationEmbodimentContinuityLane,
  AlicizationEmbodimentContinuityLaneStatus as SharedAlicizationEmbodimentContinuityLaneStatus,
} from '../../../shared/eventa'

export type AlicizationEmbodimentContinuityLane = SharedAlicizationEmbodimentContinuityLane

const EMBODIMENT_CONTINUITY_LANES: AlicizationEmbodimentContinuityLane[] = [
  'body',
  'voice',
  'face',
  'motion',
  'lipsync',
]

export type AlicizationEmbodimentContinuityLaneStatus = SharedAlicizationEmbodimentContinuityLaneStatus

const CARRYING_CONTINUITY_STATUS = 'carrying-continuity' as AlicizationEmbodimentContinuityLaneStatus

export interface AlicizationEmbodimentContinuityLaneSnapshot {
  status: AlicizationEmbodimentContinuityLaneStatus
  summary: string | null
}

export interface AlicizationEmbodimentContinuityLaneEvidence {
  available?: boolean | null
  continuityCarry?: boolean | null
  summary?: string | null
}

export interface AlicizationEmbodimentContinuityLedger extends AlicizationEmbodimentContinuityLedgerSnapshot {
  version: 'embodiment-continuity-ledger-v1'
  createdAt: number
  turnId: string | null
  lanes: Record<AlicizationEmbodimentContinuityLane, AlicizationEmbodimentContinuityLaneSnapshot>
  droppedLanes: AlicizationEmbodimentContinuityLane[]
  carryingLanes: AlicizationEmbodimentContinuityLane[]
  rejoinedLanes: AlicizationEmbodimentContinuityLane[]
  pendingRejoinLanes: AlicizationEmbodimentContinuityLane[]
  continuityPhase: 'fragmented' | 'partial-carry' | 'rejoining' | 'fully-rejoined' | 'quiet'
  memoryWriteback: {
    shouldWrite: boolean
    lane: 'none' | 'cross-modal-continuity' | 'rejoin'
    reason: string
  }
  traceSummary: string
  replayLine: string
  sourceTags: string[]
}

function sanitizeText(raw: unknown, maxChars = 260) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList<T extends string>(values: Array<T | null | undefined>, maxItems = 16) {
  const result: T[] = []
  for (const value of values) {
    if (!value)
      continue
    if (result.includes(value))
      continue
    result.push(value)
    if (result.length >= maxItems)
      break
  }
  return result
}

function hasLaneBeenMissing(status: AlicizationEmbodimentContinuityLaneStatus | null | undefined) {
  return status === 'dropped' || status === 'pending-rejoin'
}

function resolveLaneStatus(input: {
  previous: AlicizationEmbodimentContinuityLaneSnapshot | null
  current: AlicizationEmbodimentContinuityLaneEvidence | null
}): AlicizationEmbodimentContinuityLaneStatus {
  if (!input.current)
    return 'silent'
  if (input.current.available === false)
    return 'dropped'
  if (input.current.continuityCarry === true && hasLaneBeenMissing(input.previous?.status))
    return 'rejoined'
  if (input.current.continuityCarry === true)
    return CARRYING_CONTINUITY_STATUS
  if (input.current.available === true)
    return 'pending-rejoin'
  return 'silent'
}

function resolveContinuityPhase(input: {
  carryingLanes: AlicizationEmbodimentContinuityLane[]
  droppedLanes: AlicizationEmbodimentContinuityLane[]
  rejoinedLanes: AlicizationEmbodimentContinuityLane[]
  pendingRejoinLanes: AlicizationEmbodimentContinuityLane[]
}): AlicizationEmbodimentContinuityLedger['continuityPhase'] {
  if (
    input.rejoinedLanes.length > 0
    && input.droppedLanes.length === 0
    && input.pendingRejoinLanes.length === 0
    && input.carryingLanes.length + input.rejoinedLanes.length === EMBODIMENT_CONTINUITY_LANES.length
  ) {
    return 'fully-rejoined'
  }
  if (input.rejoinedLanes.length > 0)
    return 'rejoining'
  if (input.droppedLanes.length > 0 && input.carryingLanes.length > 0)
    return 'partial-carry'
  if (input.pendingRejoinLanes.length > 0 && input.carryingLanes.length > 0)
    return 'partial-carry'
  if (input.droppedLanes.length > 0 || input.pendingRejoinLanes.length > 0)
    return 'fragmented'
  return 'quiet'
}

export function buildAlicizationEmbodimentContinuityLedger(input: {
  createdAt: number
  turnId?: string | null
  sourceTags?: string[] | null
  previous?: Partial<Record<AlicizationEmbodimentContinuityLane, AlicizationEmbodimentContinuityLaneSnapshot>> | null
  current?: Partial<Record<AlicizationEmbodimentContinuityLane, AlicizationEmbodimentContinuityLaneEvidence>> | null
}): AlicizationEmbodimentContinuityLedger {
  const sourceTags = uniqueList((input.sourceTags ?? [])
    .map(tag => sanitizeText(tag, 64))
    .filter(Boolean), 12)
  const lanes = EMBODIMENT_CONTINUITY_LANES.reduce((result, lane) => {
    const previous = input.previous?.[lane] ?? null
    const current = input.current?.[lane] ?? null
    const status = resolveLaneStatus({
      previous,
      current,
    })
    result[lane] = {
      status,
      summary: sanitizeText(current?.summary ?? previous?.summary ?? '', 240) || null,
    }
    return result
  }, {} as Record<AlicizationEmbodimentContinuityLane, AlicizationEmbodimentContinuityLaneSnapshot>)
  const carryingLanes = EMBODIMENT_CONTINUITY_LANES.filter(lane => lanes[lane].status === CARRYING_CONTINUITY_STATUS)
  const droppedLanes = EMBODIMENT_CONTINUITY_LANES.filter(lane => lanes[lane].status === 'dropped')
  const rejoinedLanes = EMBODIMENT_CONTINUITY_LANES.filter(lane => lanes[lane].status === 'rejoined')
  const pendingRejoinLanes = EMBODIMENT_CONTINUITY_LANES.filter(lane => lanes[lane].status === 'pending-rejoin' || lanes[lane].status === 'dropped')
  const continuityPhase = resolveContinuityPhase({
    carryingLanes,
    droppedLanes,
    rejoinedLanes,
    pendingRejoinLanes,
  })
  const memoryWritebackLane = rejoinedLanes.length > 0 && droppedLanes.length === 0 && pendingRejoinLanes.length === 0
    ? 'rejoin'
    : droppedLanes.length > 0 || pendingRejoinLanes.length > 0
      ? 'cross-modal-continuity'
      : 'none'
  const traceSummary = [
    `phase=${continuityPhase}`,
    `carrying=${carryingLanes.join(',') || 'none'}`,
    `dropped=${droppedLanes.join(',') || 'none'}`,
    `missing_lanes=${pendingRejoinLanes.join(',') || 'none'}`,
    `rejoined=${rejoinedLanes.join(',') || 'none'}`,
    sourceTags.length > 0 ? `source=${sourceTags.join(',')}` : '',
  ].filter(Boolean).join(' | ')
  const replayLine = traceSummary

  return {
    version: 'embodiment-continuity-ledger-v1',
    createdAt: input.createdAt,
    turnId: input.turnId ?? null,
    lanes,
    droppedLanes,
    carryingLanes,
    rejoinedLanes,
    pendingRejoinLanes,
    continuityPhase,
    memoryWriteback: {
      shouldWrite: memoryWritebackLane !== 'none',
      lane: memoryWritebackLane,
      reason: memoryWritebackLane === 'rejoin'
        ? 'embodiment-memory:rejoin'
        : memoryWritebackLane === 'cross-modal-continuity'
          ? 'embodiment-memory:partial'
          : 'embodiment-memory:none',
    },
    traceSummary,
    replayLine,
    sourceTags,
  }
}
