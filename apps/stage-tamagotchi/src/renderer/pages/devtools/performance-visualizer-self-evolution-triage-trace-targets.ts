import type {
  PerformanceVisualizerSelfEvolutionTriageCard,
} from './performance-visualizer-self-evolution-triage-view'

export type SelfEvolutionTraceSectionId
  = | 'trace-consumption'
    | 'trace-details'
    | 'trace-timeline'
    | 'selected-trace-event'

function isBodyContinuityRendererRejoin(detail: string) {
  return detail.includes('body-led-same-segment-carry')
    || detail.includes('body authority carry')
    || detail.includes('renderer rejoin')
    || detail.includes('显形补回')
}

function isBodyContinuityWorkflow(card: PerformanceVisualizerSelfEvolutionTriageCard) {
  return card.bodyContinuityPhase === 'body-only-hold'
    || card.bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || card.bodyContinuityPhase === 'full-cross-modal-lock'
    || card.bodyContinuityPhase === 'renderer-rejoin-without-body'
    || isBodyContinuityRendererRejoin(card.detail)
}

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
      else if (card.detail === 'body continuity governance') {
        targets[card.id] = [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ]
      }
      else if (card.detail === 'project-state continuity governance') {
        targets[card.id] = [
          'trace-consumption',
          'trace-details',
          'selected-trace-event',
        ]
      }
      else if (card.detail === 'relationship cadence governance') {
        targets[card.id] = [
          'trace-consumption',
          'trace-details',
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
        targets[card.id] = card.detail.includes('companionship transition summary')
          ? [
              'trace-consumption',
              'trace-details',
              'selected-trace-event',
            ]
          : isBodyContinuityWorkflow(card)
            ? [
                'trace-consumption',
                'trace-timeline',
                'selected-trace-event',
              ]
            : (
                card.detail.includes('project-state carry')
                || card.detail.includes('Project identity carry')
              )
                ? [
                    'trace-consumption',
                    'trace-details',
                    'selected-trace-event',
                  ]
                : [
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
        targets[card.id] = card.detail.includes('companionship-')
          ? [
              'trace-consumption',
              'trace-details',
              'selected-trace-event',
            ]
          : isBodyContinuityWorkflow(card)
            ? [
                'trace-consumption',
                'trace-timeline',
                'selected-trace-event',
              ]
            : card.detail.includes('project-state-continuity-drift')
              ? [
                  'trace-consumption',
                  'trace-details',
                  'selected-trace-event',
                ]
              : [
                  'trace-consumption',
                  'trace-details',
                ]
      }
    }
  }

  return targets
}
