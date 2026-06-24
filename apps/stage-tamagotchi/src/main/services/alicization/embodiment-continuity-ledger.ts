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

export interface AlicizationEmbodimentContinuityLaneSnapshot {
  status: AlicizationEmbodimentContinuityLaneStatus
  summary: string | null
}

export interface AlicizationEmbodimentContinuityLaneEvidence {
  available?: boolean | null
  sameHerCarry?: boolean | null
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
  selfRevisionCandidate: {
    shouldPropose: boolean
    domain: 'dialogue-style'
    reasonCodes: string[]
    summary: string | null
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

function plusList(values: string[]) {
  return values.length > 0 ? values.join('+') : 'none'
}

function hasLaneBeenMissing(status: AlicizationEmbodimentContinuityLaneStatus | null | undefined) {
  return status === 'dropped' || status === 'pending-rejoin' || status === 'silent'
}

function resolveLaneStatus(input: {
  previous: AlicizationEmbodimentContinuityLaneSnapshot | null
  current: AlicizationEmbodimentContinuityLaneEvidence | null
}): AlicizationEmbodimentContinuityLaneStatus {
  if (!input.current)
    return 'silent'
  if (input.current.available === false)
    return 'dropped'
  if (input.current.sameHerCarry === true && hasLaneBeenMissing(input.previous?.status))
    return 'rejoined'
  if (input.current.sameHerCarry === true)
    return 'carrying-same-her'
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

function buildReasonCodes(input: {
  droppedLanes: AlicizationEmbodimentContinuityLane[]
  pendingRejoinLanes: AlicizationEmbodimentContinuityLane[]
  rejoinedLanes: AlicizationEmbodimentContinuityLane[]
  sourceTags?: string[] | null
  projectStateContinuity?: {
    sameHerSelfLine?: string | null
    sameHerDriftRisk?: string | null
    sameHerHoldDetail?: string | null
  } | null
}) {
  return uniqueList([
    ...input.droppedLanes.map(lane => `embodiment-lane-dropped:${lane}`),
    ...input.pendingRejoinLanes.map(lane => `embodiment-pending-rejoin:${lane}`),
    ...input.rejoinedLanes.map(lane => `embodiment-lane-rejoined:${lane}`),
    sanitizeText(input.projectStateContinuity?.sameHerSelfLine, 180) ? 'same-her-self-line-active' : null,
    sanitizeText(input.projectStateContinuity?.sameHerDriftRisk, 180) ? 'same-her-drift-risk-active' : null,
    sanitizeText(input.projectStateContinuity?.sameHerHoldDetail, 180) ? 'same-her-hold-detail-active' : null,
    input.sourceTags?.includes('same-her-causality-repair-pressure') ? 'same-her-causality-repair-pressure' : null,
  ], 18)
}

export function buildAlicizationEmbodimentContinuityLedger(input: {
  createdAt: number
  turnId?: string | null
  sourceTags?: string[] | null
  previous?: Partial<Record<AlicizationEmbodimentContinuityLane, AlicizationEmbodimentContinuityLaneSnapshot>> | null
  current?: Partial<Record<AlicizationEmbodimentContinuityLane, AlicizationEmbodimentContinuityLaneEvidence>> | null
  projectStateContinuity?: {
    sameHerSelfLine?: string | null
    sameHerDriftRisk?: string | null
    sameHerHoldDetail?: string | null
  } | null
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
  const carryingLanes = EMBODIMENT_CONTINUITY_LANES.filter(lane => lanes[lane].status === 'carrying-same-her')
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
  const reasonCodes = buildReasonCodes({
    droppedLanes,
    pendingRejoinLanes,
    rejoinedLanes,
    sourceTags,
    projectStateContinuity: input.projectStateContinuity,
  })
  const shouldProposeSelfRevision = droppedLanes.length > 0 || pendingRejoinLanes.length > 0
  const traceSummary = [
    `phase=${continuityPhase}`,
    `carrying=${carryingLanes.join(',') || 'none'}`,
    `dropped=${droppedLanes.join(',') || 'none'}`,
    `pending_rejoin=${pendingRejoinLanes.join(',') || 'none'}`,
    `rejoined=${rejoinedLanes.join(',') || 'none'}`,
    sourceTags.length > 0 ? `source=${sourceTags.join(',')}` : '',
  ].filter(Boolean).join(' | ')
  const replayLine = continuityPhase === 'fully-rejoined'
    ? `${plusList(rejoinedLanes)} rejoined the same-her embodiment line; carrying lanes stayed ${plusList(carryingLanes)}.`
    : `${plusList(carryingLanes)} carried same-her while ${plusList(droppedLanes)} dropped and ${plusList(pendingRejoinLanes.filter(lane => !droppedLanes.includes(lane)))} waited to rejoin.`

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
        ? `Embodiment lanes rejoined after prior drift: ${plusList(rejoinedLanes)}.`
        : memoryWritebackLane === 'cross-modal-continuity'
          ? `Embodiment continuity is partial: carrying=${plusList(carryingLanes)} dropped=${plusList(droppedLanes)} pending=${plusList(pendingRejoinLanes)}.`
          : '',
    },
    selfRevisionCandidate: {
      shouldPropose: shouldProposeSelfRevision,
      domain: 'dialogue-style',
      reasonCodes,
      summary: shouldProposeSelfRevision
        ? `Embodiment continuity needs repair before expression can feel like one lifeform: ${traceSummary}.`
        : null,
    },
    traceSummary,
    replayLine,
    sourceTags,
  }
}
