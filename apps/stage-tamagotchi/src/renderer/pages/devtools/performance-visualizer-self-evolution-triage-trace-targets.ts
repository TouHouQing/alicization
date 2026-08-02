import type {
  PerformanceVisualizerSelfEvolutionTriageCard,
} from './performance-visualizer-self-evolution-triage-view'

export type SelfEvolutionTraceSectionId
  = | 'trace-consumption'
    | 'trace-details'
    | 'trace-timeline'
    | 'selected-trace-event'

function isBodyContinuityWorkflow(card: PerformanceVisualizerSelfEvolutionTriageCard) {
  return card.bodyContinuityPhase === 'body-only-hold'
    || card.bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || card.bodyContinuityPhase === 'full-cross-modal-lock'
    || card.bodyContinuityPhase === 'renderer-rejoin-without-body'
    || card.rendererRejoinSurfaceKey != null
    || card.survivingVisibleLane != null
}

export function buildSelfEvolutionTriageTraceTargets(
  triageCards: PerformanceVisualizerSelfEvolutionTriageCard[],
) {
  const targets: Partial<Record<PerformanceVisualizerSelfEvolutionTriageCard['id'], SelfEvolutionTraceSectionId[]>> = {}

  for (const card of triageCards) {
    if (card.id === 'repair-owner') {
      if (isBodyContinuityWorkflow(card)) {
        targets[card.id] = [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ]
      }
      else if (card.layer === 'persona') {
        targets[card.id] = [
          'trace-consumption',
          'trace-details',
        ]
      }
      else if (card.layer === 'renderer') {
        targets[card.id] = [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ]
      }
    }

    if (card.id === 'first-check') {
      if (card.layer === 'persona') {
        targets[card.id] = [
          'trace-details',
        ]
      }
      else if (card.layer === 'renderer') {
        targets[card.id] = [
          'trace-timeline',
          'selected-trace-event',
        ]
      }
      else if (card.layer === 'continuity') {
        targets[card.id] = isBodyContinuityWorkflow(card)
          ? [
              'trace-consumption',
              'trace-timeline',
              'selected-trace-event',
            ]
          : [
              'trace-consumption',
              'trace-details',
            ]
      }
    }

    if (card.id === 'repair-path') {
      if (isBodyContinuityWorkflow(card)) {
        targets[card.id] = [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ]
      }
      else if (card.layer === 'persona') {
        targets[card.id] = [
          'trace-consumption',
          'trace-details',
        ]
      }
      else if (card.layer === 'renderer') {
        targets[card.id] = [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ]
      }
      else if (card.layer === 'continuity') {
        targets[card.id] = [
          'trace-consumption',
          'trace-details',
        ]
      }
    }
  }

  return targets
}
