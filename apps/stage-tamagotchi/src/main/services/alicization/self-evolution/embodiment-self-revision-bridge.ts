import type { AlicizationEmbodimentContinuityLedger } from '../embodiment-continuity-ledger'
import type { AlicizationSelfRevisionStatePatch, AlicizationSelfRevisionStatePatchLane } from './state-revision-bus'

function sanitizeText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 16) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 160)
    if (!normalized)
      continue
    if (result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

export function buildAlicizationEmbodimentSelfRevisionStatePatch(input: {
  ledger: AlicizationEmbodimentContinuityLedger | null | undefined
  decisionTraceId?: string | null
  projectStateContinuity?: {
    sameHerSelfLine?: string | null
    sameHerDriftRisk?: string | null
    sameHerHoldDetail?: string | null
  } | null
}): AlicizationSelfRevisionStatePatch | null {
  const ledger = input.ledger ?? null
  if (!ledger?.selfRevisionCandidate.shouldPropose)
    return null

  const carryingLanes = ledger.carryingLanes
  const droppedLanes = ledger.droppedLanes
  const pendingRejoinLanes = ledger.pendingRejoinLanes
  const rejoinedLanes = ledger.rejoinedLanes
  const patchId = `embodiment-continuity:${ledger.turnId ?? 'turn-unknown'}:${Math.max(0, Math.floor(ledger.createdAt))}:state-patch`
  const sourceEventId = patchId.replace(/:state-patch$/, '')
  const lanes = uniqueList([
    'memory-policy',
    'response-posture',
    ledger.memoryWriteback.shouldWrite ? 'relationship-posture' : null,
    carryingLanes.length > 0 || droppedLanes.length > 0 || pendingRejoinLanes.length > 0 ? 'proactive-policy' : null,
  ], 8) as AlicizationSelfRevisionStatePatchLane[]
  const reasonCodes = uniqueList([
    `embodiment-phase:${ledger.continuityPhase}`,
    `embodiment-memory:${ledger.memoryWriteback.lane}`,
    ...carryingLanes.map(lane => `embodiment-carry:${lane}`),
    ...droppedLanes.map(lane => `embodiment-lane-dropped:${lane}`),
    ...pendingRejoinLanes.map(lane => `embodiment-partial:${lane}`),
    ...rejoinedLanes.map(lane => `embodiment-lane-rejoined:${lane}`),
    sanitizeText(input.projectStateContinuity?.sameHerSelfLine, 180) ? 'same-her-self-line-active' : null,
    sanitizeText(input.projectStateContinuity?.sameHerDriftRisk, 180) ? 'same-her-anti-shell-guard-active' : null,
    sanitizeText(input.projectStateContinuity?.sameHerHoldDetail, 180) ? 'same-her-hold-detail-active' : null,
  ], 18)
  const continuityPressure = Math.max(
    0,
    Math.min(1, Number(
      (
        droppedLanes.length * 0.24
        + pendingRejoinLanes.length * 0.12
        + (ledger.memoryWriteback.shouldWrite ? 0.12 : 0)
        + (sanitizeText(input.projectStateContinuity?.sameHerSelfLine, 180) ? 0.16 : 0)
        + (sanitizeText(input.projectStateContinuity?.sameHerDriftRisk, 180) ? 0.18 : 0)
        + (sanitizeText(input.projectStateContinuity?.sameHerHoldDetail, 180) ? 0.08 : 0)
      ).toFixed(2),
    )),
  )
  const summary = sanitizeText(
    `${ledger.continuityPhase} embodiment continuity with ${carryingLanes.join('+') || 'no'} carrying continuity and ${droppedLanes.join('+') || 'no'} dropped.`,
    320,
  )

  return {
    version: 'self-revision-state-patch-v1',
    id: patchId,
    sourceEventId,
    sourceTurnId: sanitizeText(ledger.turnId, 120) || null,
    decisionTraceId: sanitizeText(input.decisionTraceId, 120) || null,
    domain: 'dialogue-style',
    action: 'hold',
    resultStatus: 'completed',
    lanes,
    memoryPolicy: {
      strictnessBias: Math.min(1, Math.max(0, Number((0.18 + droppedLanes.length * 0.08).toFixed(2)))),
      wrongThreadSuppressionBias: Math.min(1, Math.max(0, Number((0.12 + (droppedLanes.length > 0 ? 0.12 : 0)).toFixed(2)))),
      provenanceLabelBias: Math.min(1, Math.max(0, Number((0.14 + (ledger.memoryWriteback.shouldWrite ? 0.08 : 0)).toFixed(2)))),
      recallExpansionBias: Math.min(1, Math.max(0, Number((ledger.memoryWriteback.shouldWrite ? 0.14 : 0.04).toFixed(2)))),
      shouldQuarantineUnsupportedCarry: droppedLanes.length > 0 && pendingRejoinLanes.length > 0,
    },
    relationshipPosture: {
      repairWindowBias: Math.min(1, Math.max(0, Number((0.18 + droppedLanes.length * 0.14).toFixed(2)))),
      closenessCapBias: Math.min(1, Math.max(0, Number((0.12 + droppedLanes.length * 0.12).toFixed(2)))),
      warmthReleaseBias: Math.min(1, Math.max(0, Number((droppedLanes.length > 0 ? 0.04 : 0.1).toFixed(2)))),
    },
    responsePosture: {
      secondPassRequiredBias: Math.min(1, Math.max(0, Number((0.14 + pendingRejoinLanes.length * 0.06).toFixed(2)))),
      hypothesisLabelBias: Math.min(1, Math.max(0, Number((0.12 + droppedLanes.length * 0.06).toFixed(2)))),
      specificityClampBias: Math.min(1, Math.max(0, Number((0.12 + (ledger.memoryWriteback.shouldWrite ? 0.06 : 0)).toFixed(2)))),
      templateShellSuppressionBias: Math.min(1, Math.max(0, Number((0.26 + continuityPressure * 0.42).toFixed(2)))),
    },
    proactivePolicy: {
      restraintBias: Math.min(1, Math.max(0, Number((0.22 + pendingRejoinLanes.length * 0.1).toFixed(2)))),
      learningProposalBias: Math.min(1, Math.max(0, Number((ledger.memoryWriteback.shouldWrite ? 0.12 : 0.06).toFixed(2)))),
      actuationCooldownBias: Math.min(1, Math.max(0, Number((0.18 + droppedLanes.length * 0.1).toFixed(2)))),
    },
    validation: {
      requiresRollbackCheck: false,
      requiresRevalidation: false,
      rollbackPlan: [],
    },
    projectStateContinuity: continuityPressure > 0
      ? {
          sameHerSelfLine: sanitizeText(input.projectStateContinuity?.sameHerSelfLine, 220) || null,
          sameHerDriftRisk: sanitizeText(input.projectStateContinuity?.sameHerDriftRisk, 240) || null,
          proactiveSameHerGap: null,
          emotionalClosureCue: null,
          sameHerHoldDetail: sanitizeText(input.projectStateContinuity?.sameHerHoldDetail, 240) || null,
          continuityGuard: sanitizeText(ledger.memoryWriteback.reason, 320) || null,
          continuityPressure,
        }
      : null,
    reasonCodes,
    summary,
  }
}
