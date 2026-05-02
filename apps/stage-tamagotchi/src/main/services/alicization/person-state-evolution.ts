import type {
  AlicizationPersonStateEvolutionEntryInput,
  AlicizationPersonStateEvolutionShift,
  AlicizationPersonStateUpdateRecord,
  AlicizationPersonStateUpdateSurface,
} from '../../../shared/eventa'

import type { AlicizationOutcomeClosureResult } from './outcome-reinforcement'

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

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 180)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
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

function summarizeDoctrineShift(input: {
  previous: AlicizationPersonStateUpdateSurface | null
  next: AlicizationPersonStateUpdateSurface
}) {
  const nextRepair = input.next.repairHints[0] ?? ''
  const previousRepair = input.previous?.repairHints[0] ?? ''
  const nextPreference = input.next.preferenceHints[0] ?? ''
  const previousPreference = input.previous?.preferenceHints[0] ?? ''
  if (!nextRepair && !nextPreference)
    return null
  if (nextRepair !== previousRepair)
    return `The repair doctrine shifted toward: ${nextRepair || nextPreference}.`
  if (nextPreference !== previousPreference)
    return `The closeness doctrine shifted toward: ${nextPreference}.`
  return null
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
    relationshipShift.trustDelta >= previousShift.trustDelta
      ? 'Recent outcomes made trust easier to grant in this line.'
      : 'Recent outcomes made trust more fragile in this line.',
  )
  pushShift(
    shifts,
    'closeness-shift',
    relationshipShift.closenessDelta - previousShift.closenessDelta,
    relationshipShift.closenessDelta >= previousShift.closenessDelta
      ? 'Recent outcomes allowed a closer stance.'
      : 'Recent outcomes asked for more distance before closeness.',
  )
  pushShift(
    shifts,
    'repair-posture-shift',
    relationshipShift.repairDelta - previousShift.repairDelta,
    relationshipShift.repairDelta >= previousShift.repairDelta
      ? 'Repair pressure moved closer to the front of the response posture.'
      : 'Repair pressure eased, so the line can stay less repair-led.',
  )
  pushShift(
    shifts,
    'burden-shift',
    relationshipShift.burdenDelta - previousShift.burdenDelta,
    relationshipShift.burdenDelta >= previousShift.burdenDelta
      ? 'Burden rose, so extra pressure needs more restraint now.'
      : 'Burden eased, so the line can breathe a bit more now.',
  )
  pushShift(
    shifts,
    'autonomy-shift',
    (record.reinforcementBias['autonomy-respect'] ?? 0) - (previous?.reinforcementBias['autonomy-respect'] ?? 0),
    (record.reinforcementBias['autonomy-respect'] ?? 0) >= (previous?.reinforcementBias['autonomy-respect'] ?? 0)
      ? 'Autonomy respect grew, so space and timing matter more explicitly now.'
      : 'Autonomy pressure softened, so the line can lean in a bit more easily.',
  )
  pushShift(
    shifts,
    'execution-trust-shift',
    (record.reinforcementBias['truthful-grounding'] ?? 0) - (previous?.reinforcementBias['truthful-grounding'] ?? 0),
    (record.reinforcementBias['truthful-grounding'] ?? 0) >= (previous?.reinforcementBias['truthful-grounding'] ?? 0)
      ? 'Execution trust now depends more on grounded, thread-faithful delivery.'
      : 'Execution trust is carrying less extra grounding pressure than before.',
  )
  pushShift(
    shifts,
    'relationship-doctrine-shift',
    summarizeDoctrineShift({ previous, next }) ? 0.08 : 0,
    summarizeDoctrineShift({ previous, next }),
    0.01,
  )

  if (shifts.length === 0)
    return null

  const doctrine = uniqueList([
    next.repairHints[0],
    next.preferenceHints[0],
    next.sensitivityHints[0],
  ], 3).join(' ')
  const burdenLine = next.burdenHints[0] ?? null
  const trustMeaning = next.narrative.find(line => /trust|repair|space|closeness|room|pressure|边界|信任|修复|空间/u.test(line)) ?? next.summary
  const dominantRung = next.preferenceHints[0]?.toLowerCase().includes('lighter touch')
    ? 'space-first'
    : next.preferenceHints[0]?.toLowerCase().includes('warmer directness')
      ? 'warm-near'
      : null

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
    summary: sanitizeText(record.summary, 220),
    contexts: record.dominantContexts,
    relationshipDoctrine: doctrine || null,
    burdenLine,
    trustMeaning: sanitizeText(trustMeaning, 180) || null,
    dominantRung,
    sourceTrail: record.sourceTrail,
    shifts,
    createdAt: record.createdAt,
  }
}
