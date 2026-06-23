import type { SelfEvolutionEvidencePanel } from './performance-visualizer-self-evolution-evidence'
import type {
  PerformanceVisualizerSelfEvolutionTriageCard,
} from './performance-visualizer-self-evolution-triage-view'

export type SelfEvolutionEvidencePanelId = SelfEvolutionEvidencePanel['id']

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

export function buildSelfEvolutionTriageTargets(
  triageCards: PerformanceVisualizerSelfEvolutionTriageCard[],
) {
  const targets: Partial<Record<PerformanceVisualizerSelfEvolutionTriageCard['id'], SelfEvolutionEvidencePanelId[]>> = {}

  for (const card of triageCards) {
    if (card.id === 'repair-owner') {
      if (card.detail === 'evolution') {
        targets[card.id] = [
          'persona-bias-provenance',
          'proactive-manifestation-chain',
          'private-thought-governance-chain',
          'runtime-continuity-projection',
        ]
      }
      else if (card.detail === 'renderer authority') {
        targets[card.id] = [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]
      }
      else if (card.detail === 'same-her continuity governance') {
        targets[card.id] = [
          'candidate-trajectory-summary',
          'proactive-decision-consumption-summary',
          'identity-drift-governance-summary',
        ]
      }
      else if (card.detail === 'body continuity governance') {
        targets[card.id] = [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]
      }
      else if (card.detail === 'project-state continuity governance') {
        targets[card.id] = [
          'candidate-trajectory-summary',
          'proactive-decision-consumption-summary',
          'identity-drift-governance-summary',
        ]
      }
      else if (card.detail === 'relationship cadence governance') {
        targets[card.id] = [
          'companionship-transition-summary',
          'resident-performance-projection',
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]
      }
    }

    if (card.id === 'first-check') {
      if (card.layer === 'persona') {
        targets[card.id] = [
          'persona-bias-provenance',
          'proactive-manifestation-chain',
          'private-thought-governance-chain',
        ]
      }
      else if (card.layer === 'renderer') {
        targets[card.id] = [
          'renderer-authority-projection',
        ]
      }
      else if (card.layer === 'continuity') {
        targets[card.id] = card.detail.includes('companionship transition summary')
          ? [
              'companionship-transition-summary',
              'resident-performance-projection',
              'renderer-authority-projection',
              'runtime-continuity-projection',
            ]
          : isBodyContinuityWorkflow(card)
            ? [
                'renderer-authority-projection',
                'runtime-continuity-projection',
              ]
            : card.detail.includes('project-state carry')
              ? [
                  'candidate-trajectory-summary',
                  'proactive-decision-consumption-summary',
                  'identity-drift-governance-summary',
                ]
              : [
                  'candidate-trajectory-summary',
                  'proactive-decision-consumption-summary',
                  'identity-drift-governance-summary',
                ]
      }
    }

    if (card.id === 'repair-path') {
      if (card.detail.startsWith('persona drift ')) {
        targets[card.id] = [
          'private-thought-governance-chain',
          'runtime-continuity-projection',
        ]
      }
      else if (card.detail.startsWith('renderer drift ')) {
        targets[card.id] = [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]
      }
      else if (card.detail.startsWith('continuity governance ')) {
        targets[card.id] = card.detail.includes('companionship-')
          ? [
              'companionship-transition-summary',
              'resident-performance-projection',
              'renderer-authority-projection',
              'runtime-continuity-projection',
            ]
          : isBodyContinuityWorkflow(card)
            ? [
                'renderer-authority-projection',
                'runtime-continuity-projection',
              ]
            : card.detail.includes('project-state-continuity-drift')
              ? [
                  'candidate-trajectory-summary',
                  'proactive-decision-consumption-summary',
                  'identity-drift-governance-summary',
                ]
              : [
                  'candidate-trajectory-summary',
                  'proactive-decision-consumption-summary',
                  'identity-drift-governance-summary',
                ]
      }
    }
  }

  return targets
}
