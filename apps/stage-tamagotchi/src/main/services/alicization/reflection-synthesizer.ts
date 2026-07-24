import type {
  AlicizationMemoryReflectionInput,
  AlicizationPersonaReinforcementEventRecord,
  AlicizationRelationshipOutcomeRecord,
} from '../../../shared/eventa'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function summarizeDominantReinforcement(events: AlicizationPersonaReinforcementEventRecord[]) {
  const dominant = events
    .slice()
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))[0]
  if (!dominant)
    return ''
  return sanitizeText(dominant.summary, 180)
}

export function synthesizeReflectionFromRelationshipOutcome(input: {
  outcome: AlicizationRelationshipOutcomeRecord
  reinforcementEvents?: AlicizationPersonaReinforcementEventRecord[] | null
}): AlicizationMemoryReflectionInput | null {
  const reinforcementSummary = summarizeDominantReinforcement(input.reinforcementEvents ?? [])
  const outcome = input.outcome

  if (outcome.boundaryDelta <= -0.05 || outcome.burdenDelta >= 0.05) {
    return {
      cardId: outcome.cardId,
      decisionTraceId: outcome.decisionTraceId,
      turnId: outcome.turnId,
      sessionId: outcome.sessionId,
      sourceKind: outcome.sourceKind,
      targetScope: 'boundary',
      summary: sanitizeText(outcome.summary || outcome.actionSummary, 180),
      lesson: sanitizeText(
        reinforcementSummary || outcome.actionSummary || outcome.summary,
        220,
      ),
      status: 'pending',
      confidence: clamp01(0.72 + Math.max(0, outcome.boundaryDelta * -0.4) + Math.max(0, outcome.burdenDelta * 0.2)),
      supportingOutcomeIds: outcome.id ? [outcome.id] : [],
    }
  }

  if (outcome.repairDelta >= 0.05 || outcome.misreadDelta <= -0.05) {
    return {
      cardId: outcome.cardId,
      decisionTraceId: outcome.decisionTraceId,
      turnId: outcome.turnId,
      sessionId: outcome.sessionId,
      sourceKind: outcome.sourceKind,
      targetScope: 'truth',
      summary: sanitizeText(outcome.summary || outcome.actionSummary, 180),
      lesson: sanitizeText(
        reinforcementSummary || outcome.actionSummary || outcome.summary,
        220,
      ),
      status: 'pending',
      confidence: clamp01(0.74 + outcome.repairDelta * 0.3 + Math.max(0, outcome.misreadDelta * -0.2)),
      supportingOutcomeIds: outcome.id ? [outcome.id] : [],
    }
  }

  if (outcome.closenessDelta >= 0.05 || outcome.trustDelta >= 0.05) {
    return {
      cardId: outcome.cardId,
      decisionTraceId: outcome.decisionTraceId,
      turnId: outcome.turnId,
      sessionId: outcome.sessionId,
      sourceKind: outcome.sourceKind,
      targetScope: 'relationship',
      summary: sanitizeText(outcome.summary || outcome.actionSummary, 180),
      lesson: sanitizeText(
        reinforcementSummary || outcome.actionSummary || outcome.summary,
        220,
      ),
      status: 'pending',
      confidence: clamp01(0.7 + outcome.closenessDelta * 0.24 + outcome.trustDelta * 0.24),
      supportingOutcomeIds: outcome.id ? [outcome.id] : [],
    }
  }

  if (outcome.openLoopDelta >= 0.05) {
    return {
      cardId: outcome.cardId,
      decisionTraceId: outcome.decisionTraceId,
      turnId: outcome.turnId,
      sessionId: outcome.sessionId,
      sourceKind: outcome.sourceKind,
      targetScope: 'task',
      summary: sanitizeText(outcome.summary || outcome.actionSummary, 180),
      lesson: sanitizeText(
        reinforcementSummary || outcome.actionSummary || outcome.summary,
        220,
      ),
      status: 'pending',
      confidence: clamp01(0.68 + outcome.openLoopDelta * 0.28),
      supportingOutcomeIds: outcome.id ? [outcome.id] : [],
    }
  }

  return null
}
