import type {
  PerformanceVisualizerSelfEvolutionTriageCard,
} from './performance-visualizer-self-evolution-triage-view'

export type SelfEvolutionTraceSectionId
  = | 'trace-consumption'
    | 'trace-details'
    | 'trace-timeline'
    | 'selected-trace-event'

export function buildSelfEvolutionTriageTraceTargets(
  triageCards: PerformanceVisualizerSelfEvolutionTriageCard[],
) {
  const targets: Partial<Record<PerformanceVisualizerSelfEvolutionTriageCard['id'], SelfEvolutionTraceSectionId[]>> = {}

  for (const card of triageCards) {
    if (card.id === 'repair-owner') {
      if (card.detail === 'evolution') {
        targets[card.id] = [
          'trace-consumption',
          'trace-details',
        ]
      }
      else if (card.detail === 'renderer authority') {
        targets[card.id] = [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ]
      }
      else if (card.detail === 'same-her continuity governance') {
        targets[card.id] = [
          'trace-consumption',
          'trace-details',
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
        targets[card.id] = [
          'trace-consumption',
          'trace-details',
        ]
      }
    }

    if (card.id === 'repair-path') {
      if (card.detail.startsWith('persona drift ')) {
        targets[card.id] = [
          'trace-consumption',
          'trace-details',
        ]
      }
      else if (card.detail.startsWith('renderer drift ')) {
        targets[card.id] = [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ]
      }
      else if (card.detail.startsWith('continuity governance ')) {
        targets[card.id] = [
          'trace-consumption',
          'trace-details',
        ]
      }
    }
  }

  return targets
}
