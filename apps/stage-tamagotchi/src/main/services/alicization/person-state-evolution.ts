import type {
  AlicizationPersonStateEvolutionEntryInput,
  AlicizationPersonStateEvolutionShift,
  AlicizationPersonStateUpdateRecord,
  AlicizationPersonStateUpdateSurface,
} from '../../../shared/eventa'
import type { AlicizationOutcomeClosureResult } from './outcome-reinforcement'

import {
  collectAlicizationPersonStateClosureEvidenceIds,
  isAlicizationPersonStateEvidenceId,
} from './person-state-update-surface'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function clampDelta(value: number, maxAbs = 1) {
  if (!Number.isFinite(value))
    return 0
  return Number(Math.max(-maxAbs, Math.min(maxAbs, value)).toFixed(3))
}

function pushShift(
  shifts: AlicizationPersonStateEvolutionShift[],
  kind: AlicizationPersonStateEvolutionShift['kind'],
  delta: number,
  rationale: string | null | undefined,
  threshold = 0.02,
) {
  const normalizedDelta = clampDelta(delta, 1)
  const normalizedRationale = sanitizeText(rationale, 220)
  if (Math.abs(normalizedDelta) < threshold || !normalizedRationale)
    return
  shifts.push({
    kind,
    delta: normalizedDelta,
    rationale: normalizedRationale,
  })
}

export function buildAlicizationPersonStateEvolutionEntry(input: {
  closure: AlicizationOutcomeClosureResult
  previous: AlicizationPersonStateUpdateSurface | null
  next: AlicizationPersonStateUpdateSurface
  record: AlicizationPersonStateUpdateRecord
}): AlicizationPersonStateEvolutionEntryInput | null {
  const previous = input.previous
  const next = input.next
  const record = input.record
  const evidenceId = sanitizeText(record.summary, 220)
  const knownEvidenceIds = new Set([
    ...collectAlicizationPersonStateClosureEvidenceIds(input.closure, next.updatedAt),
    ...record.sourceTrail.map(entry => entry.summary),
  ])
  if (
    !isAlicizationPersonStateEvidenceId(evidenceId)
    || evidenceId !== next.summary
    || !knownEvidenceIds.has(evidenceId)
  ) {
    return null
  }
  const shifts: AlicizationPersonStateEvolutionShift[] = []
  const relationshipShift = next.relationshipShift
  const previousShift = previous?.relationshipShift ?? {
    trustDelta: 0,
    closenessDelta: 0,
    burdenDelta: 0,
    boundaryDelta: 0,
    repairDelta: 0,
  }

  pushShift(
    shifts,
    'trust-shift',
    relationshipShift.trustDelta - previousShift.trustDelta,
    evidenceId,
  )
  pushShift(
    shifts,
    'closeness-shift',
    relationshipShift.closenessDelta - previousShift.closenessDelta,
    evidenceId,
  )
  pushShift(
    shifts,
    'repair-posture-shift',
    relationshipShift.repairDelta - previousShift.repairDelta,
    evidenceId,
  )
  pushShift(
    shifts,
    'burden-shift',
    relationshipShift.burdenDelta - previousShift.burdenDelta,
    evidenceId,
  )
  pushShift(
    shifts,
    'autonomy-shift',
    (record.reinforcementBias['autonomy-respect'] ?? 0) - (previous?.reinforcementBias['autonomy-respect'] ?? 0),
    evidenceId,
  )
  pushShift(
    shifts,
    'execution-trust-shift',
    (record.reinforcementBias['truthful-grounding'] ?? 0) - (previous?.reinforcementBias['truthful-grounding'] ?? 0),
    evidenceId,
  )

  if (shifts.length === 0)
    return null

  return {
    cardId: input.closure.relationshipOutcomes[0]?.cardId
      ?? input.closure.reinforcementEvents[0]?.cardId
      ?? input.closure.episodicEvents[0]?.cardId
      ?? 'default',
    decisionTraceId: record.decisionTraceId,
    turnId: record.turnId,
    sessionId: record.sessionId,
    activeThreadId: record.activeThreadId,
    sourceKind: 'person-state-update',
    summary: evidenceId,
    contexts: record.dominantContexts,
    relationshipDoctrine: null,
    burdenLine: null,
    trustMeaning: null,
    dominantRung: null,
    sourceTrail: record.sourceTrail,
    shifts,
    createdAt: record.createdAt,
  }
}
