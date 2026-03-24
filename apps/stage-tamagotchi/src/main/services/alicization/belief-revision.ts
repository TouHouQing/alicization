import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 48) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, maxChars)
}

// This layer turns short-lived beliefs into an explicit revision posture:
// how stable Alicization thinks the world is, and how much she should prefer
// re-grounding over confident interpretation.
export function buildBeliefRevision(input: {
  now: number
  worldModel: AlicizationWorldModelSnapshot
  beliefLedger: AlicizationBeliefLedgerSnapshot
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  previous?: AlicizationBeliefRevisionSnapshot | null
}): AlicizationBeliefRevisionSnapshot {
  const previous = input.previous
  const dominantBelief = input.beliefLedger.beliefs.find(belief => belief.id === input.beliefLedger.focusBeliefId)
    ?? input.beliefLedger.beliefs[0]
    ?? null
  const contradictedCount = input.beliefLedger.beliefs.filter(belief => belief.status === 'contradicted').length
  const tentativeCount = input.beliefLedger.beliefs.filter(belief => belief.status === 'tentative').length

  const contradictionPressure = clamp01(
    contradictedCount * 0.22
    + input.beliefLedger.unresolvedContradictions.length * 0.18
    + (input.worldModel.epistemicState.certainty === 'lingering' ? 0.14 : 0)
    + (input.worldModel.epistemicState.certainty === 'uncertain' ? 0.22 : 0),
  )
  const groundingNeed = clamp01(
    (input.worldModel.epistemicState.certainty === 'grounded'
      ? 0.16
      : input.worldModel.epistemicState.certainty === 'observed'
        ? 0.4
        : input.worldModel.epistemicState.certainty === 'lingering'
          ? 0.74
          : 0.9)
        + (dominantBelief?.status === 'tentative' ? 0.12 : 0)
        + (dominantBelief?.source === 'memory' ? 0.08 : 0)
        + tentativeCount * 0.04
        + Math.min(input.worldModel.epistemicState.staleRisks.length, 3) * 0.05,
  )
  const hostCorrectionWeight = clamp01(
    (input.relationshipModel?.correctionSensitivity ?? previous?.hostCorrectionWeight ?? 0.34) * 0.72
    + (input.relationshipModel?.climate === 'guarded' ? 0.16 : 0.04)
    + contradictionPressure * 0.16,
  )
  const revisionPressure = clamp01(
    contradictionPressure * 0.36
    + groundingNeed * 0.38
    + hostCorrectionWeight * 0.18
    + (dominantBelief?.status === 'tentative' ? 0.08 : 0)
    + (dominantBelief?.status === 'contradicted' ? 0.12 : 0),
  )

  const stability = contradictionPressure >= 0.48 || dominantBelief?.status === 'contradicted'
    ? 'fractured'
    : input.worldModel.epistemicState.certainty === 'grounded' && dominantBelief?.status === 'held' && revisionPressure < 0.48
      ? 'stable'
      : 'fluid'

  const narrative = [
    stability === 'stable' ? 'world-model-settled' : '',
    stability === 'fluid' ? 'beliefs-still-shifting' : '',
    stability === 'fractured' ? 'beliefs-require-revision' : '',
    groundingNeed >= 0.68 ? 'fresh-grounding-needed' : '',
    contradictionPressure >= 0.42 ? 'contradictions-pressing' : '',
    hostCorrectionWeight >= 0.56 ? 'misread-cost-high' : '',
  ]
    .map(item => sanitizeText(item))
    .filter(Boolean)
    .slice(0, 6)

  return {
    dominantBeliefId: dominantBelief?.id ?? null,
    stability,
    revisionPressure,
    groundingNeed,
    contradictionPressure,
    hostCorrectionWeight,
    narrative,
    updatedAt: input.now,
  }
}
