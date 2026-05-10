import type {
  AlicizationPersonaReinforcementEventRecord,
  AlicizationRelationshipOutcomeRecord,
} from '../../../shared/eventa'

export type AlicizationPersonaGradualUnlockFacetKind
  = 'shared-language'
    | 'truth-before-flourish'
    | 'near-with-boundary'
    | 'unfinished-thread-return'

export interface AlicizationPersonaGradualUnlockFacetSnapshot {
  facet: AlicizationPersonaGradualUnlockFacetKind
  confidence: number
  reason: string
}

export interface AlicizationPersonaGradualUnlockHypothesisSnapshot {
  facet: AlicizationPersonaGradualUnlockFacetKind
  hypothesis: string
  confidence: number
  supportingSignals: string[]
}

export interface AlicizationPersonaGradualUnlockSnapshot {
  version: 'persona-gradual-unlock-v1'
  unlockableFacets: AlicizationPersonaGradualUnlockFacetSnapshot[]
  pendingHypotheses: AlicizationPersonaGradualUnlockHypothesisSnapshot[]
  summary: string
}

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

function uniqueList(values: string[], maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 160)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function summarizeRelationshipOutcomes(outcomes: AlicizationRelationshipOutcomeRecord[]) {
  return outcomes.reduce((summary, outcome) => {
    const positiveTurn = outcome.closenessDelta > 0 || outcome.trustDelta > 0 || outcome.repairDelta > 0
    summary.positiveTurnCount += positiveTurn ? 1 : 0
    summary.closenessSupport += Math.max(0, outcome.closenessDelta)
    summary.trustSupport += Math.max(0, outcome.trustDelta)
    summary.boundarySupport += Math.max(0, outcome.boundaryDelta)
    summary.openLoopSupport += Math.max(0, outcome.openLoopDelta)
    summary.repairSupport += Math.max(0, outcome.repairDelta)
    summary.misreadRepairSupport += Math.max(0, -outcome.misreadDelta)
    return summary
  }, {
    positiveTurnCount: 0,
    closenessSupport: 0,
    trustSupport: 0,
    boundarySupport: 0,
    openLoopSupport: 0,
    repairSupport: 0,
    misreadRepairSupport: 0,
  })
}

function summarizeReinforcementEvents(events: AlicizationPersonaReinforcementEventRecord[]) {
  return events.reduce((summary, event) => {
    const signedDelta = event.valence === 'suppress'
      ? -Math.abs(event.delta)
      : Math.abs(event.delta)
    summary[event.dimension] += signedDelta
    return summary
  }, {
    companionship: 0,
    truthfulGrounding: 0,
    gentleRepair: 0,
    autonomyRespect: 0,
    unfinishedThreadReturn: 0,
    temperGuardedness: 0,
    temperDirectness: 0,
  })
}

export function buildPersonaGradualUnlock(input: {
  recentRelationshipOutcomes?: AlicizationRelationshipOutcomeRecord[] | null
  recentReinforcementEvents?: AlicizationPersonaReinforcementEventRecord[] | null
}): AlicizationPersonaGradualUnlockSnapshot | null {
  const outcomes = input.recentRelationshipOutcomes ?? []
  const reinforcementEvents = input.recentReinforcementEvents ?? []
  if (outcomes.length === 0 && reinforcementEvents.length === 0)
    return null

  const outcomeSummary = summarizeRelationshipOutcomes(outcomes)
  const reinforcementSummary = summarizeReinforcementEvents(reinforcementEvents)
  const repeatedRelationshipSignals = outcomeSummary.positiveTurnCount >= 2
    || outcomeSummary.trustSupport + outcomeSummary.closenessSupport >= 0.2
  const facets: AlicizationPersonaGradualUnlockFacetSnapshot[] = []

  if (repeatedRelationshipSignals) {
    const sharedLanguageConfidence = clamp01(
      0.28
      + outcomeSummary.positiveTurnCount * 0.12
      + outcomeSummary.trustSupport * 1.4
      + outcomeSummary.closenessSupport * 1.2
      + reinforcementSummary.companionship * 1.1,
    )
    facets.push({
      facet: 'shared-language',
      confidence: sharedLanguageConfidence,
      reason: 'Repeated receptive relationship turns are starting to support a more shared language posture.',
    })
  }

  if (
    outcomeSummary.repairSupport + outcomeSummary.misreadRepairSupport >= 0.08
    || reinforcementSummary.truthfulGrounding + reinforcementSummary.gentleRepair >= 0.08
  ) {
    const truthConfidence = clamp01(
      0.22
      + outcomeSummary.repairSupport * 1.2
      + outcomeSummary.misreadRepairSupport * 0.9
      + reinforcementSummary.truthfulGrounding * 1.1
      + reinforcementSummary.gentleRepair * 1.05,
    )
    facets.push({
      facet: 'truth-before-flourish',
      confidence: truthConfidence,
      reason: 'Repair and grounding signals suggest hypothesis-label discipline should stay ahead of flourish.',
    })
  }

  if (
    outcomeSummary.boundarySupport > 0
    || reinforcementSummary.autonomyRespect > 0
  ) {
    const boundaryConfidence = clamp01(
      0.2
      + outcomeSummary.boundarySupport * 1.3
      + reinforcementSummary.autonomyRespect * 1.15
      - reinforcementSummary.temperGuardedness * 0.15,
    )
    facets.push({
      facet: 'near-with-boundary',
      confidence: boundaryConfidence,
      reason: 'Boundary-respecting turns can unlock a closer-but-not-crowding relationship hypothesis.',
    })
  }

  if (
    outcomeSummary.openLoopSupport > 0
    || reinforcementSummary.unfinishedThreadReturn > 0
  ) {
    const returnConfidence = clamp01(
      0.24
      + outcomeSummary.openLoopSupport * 1.2
      + reinforcementSummary.unfinishedThreadReturn * 1.15,
    )
    facets.push({
      facet: 'unfinished-thread-return',
      confidence: returnConfidence,
      reason: 'Open-loop support and return reinforcement suggest a durable return-to-thread hypothesis.',
    })
  }

  const unlockableFacets = facets
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4)

  if (unlockableFacets.length === 0)
    return null

  const pendingHypotheses = unlockableFacets.map((facet) => {
    const hypothesis = facet.facet === 'shared-language'
      ? 'Hypothesis: repeated relationship reinforcement may be opening a more shared-language persona posture.'
      : facet.facet === 'truth-before-flourish'
        ? 'Hypothesis: truth discipline and repair should stay ahead of flourish while this relationship settles.'
        : facet.facet === 'near-with-boundary'
          ? 'Hypothesis: closeness can grow if it keeps room and does not become pressure.'
          : 'Hypothesis: unfinished threads may want a more reliable return path before they are considered settled.'
    return {
      facet: facet.facet,
      hypothesis,
      confidence: facet.confidence,
      supportingSignals: uniqueList([
        facet.reason,
        repeatedRelationshipSignals ? 'repeated relationship signals' : '',
        outcomeSummary.positiveTurnCount > 0 ? `positive relationship turns: ${outcomeSummary.positiveTurnCount}` : '',
        reinforcementSummary.companionship > 0 ? 'companionship reinforcement' : '',
        reinforcementSummary.truthfulGrounding > 0 ? 'truthful-grounding reinforcement' : '',
        reinforcementSummary.autonomyRespect > 0 ? 'autonomy-respect reinforcement' : '',
        reinforcementSummary.unfinishedThreadReturn > 0 ? 'unfinished-thread-return reinforcement' : '',
      ]),
    } satisfies AlicizationPersonaGradualUnlockHypothesisSnapshot
  })

  return {
    version: 'persona-gradual-unlock-v1',
    unlockableFacets,
    pendingHypotheses,
    summary: uniqueList([
      unlockableFacets.map(item => item.facet).join(', '),
      pendingHypotheses[0]?.hypothesis,
    ], 2).join(' | '),
  }
}
