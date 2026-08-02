import type { SelfEvolutionEvidencePanel } from './performance-visualizer-self-evolution-evidence'
import type {
  PerformanceVisualizerSelfEvolutionTriageCard,
} from './performance-visualizer-self-evolution-triage-view'

export type SelfEvolutionEvidencePanelId = SelfEvolutionEvidencePanel['id']

function isBodyContinuityWorkflow(card: PerformanceVisualizerSelfEvolutionTriageCard) {
  return card.bodyContinuityPhase === 'body-only-hold'
    || card.bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || card.bodyContinuityPhase === 'full-cross-modal-lock'
    || card.bodyContinuityPhase === 'renderer-rejoin-without-body'
    || card.rendererRejoinSurfaceKey != null
    || card.survivingVisibleLane != null
}

export function buildSelfEvolutionTriageTargets(
  triageCards: PerformanceVisualizerSelfEvolutionTriageCard[],
) {
  const targets: Partial<Record<PerformanceVisualizerSelfEvolutionTriageCard['id'], SelfEvolutionEvidencePanelId[]>> = {}

  for (const card of triageCards) {
    if (card.id === 'repair-owner') {
      if (isBodyContinuityWorkflow(card)) {
        targets[card.id] = [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]
      }
      else if (card.layer === 'persona') {
        targets[card.id] = [
          'persona-bias-provenance',
          'proactive-action-chain',
          'proactive-manifestation-chain',
          'runtime-continuity-projection',
        ]
      }
      else if (card.layer === 'renderer') {
        targets[card.id] = [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]
      }
    }

    if (card.id === 'first-check') {
      if (card.layer === 'persona') {
        targets[card.id] = [
          'persona-bias-provenance',
          'proactive-action-chain',
          'proactive-manifestation-chain',
        ]
      }
      else if (card.layer === 'renderer') {
        targets[card.id] = [
          'renderer-authority-projection',
        ]
      }
      else if (card.layer === 'continuity') {
        targets[card.id] = isBodyContinuityWorkflow(card)
          ? [
              'renderer-authority-projection',
              'runtime-continuity-projection',
            ]
          : [
              'candidate-trajectory-summary',
              'proactive-decision-consumption-summary',
            ]
      }
    }

    if (card.id === 'repair-path') {
      if (isBodyContinuityWorkflow(card)) {
        targets[card.id] = [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]
      }
      else if (card.layer === 'persona') {
        targets[card.id] = [
          'proactive-action-chain',
          'runtime-continuity-projection',
        ]
      }
      else if (card.layer === 'renderer') {
        targets[card.id] = [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]
      }
      else if (card.layer === 'continuity') {
        targets[card.id] = [
          'candidate-trajectory-summary',
          'proactive-decision-consumption-summary',
        ]
      }
    }
  }

  return targets
}
