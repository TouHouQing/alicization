import type {
  PerformanceVisualizerSelfEvolutionTriageCard,
} from './performance-visualizer-self-evolution-triage-view'
import type { SelfEvolutionEvidencePanel } from './performance-visualizer-self-evolution-evidence'

export type SelfEvolutionEvidencePanelId = SelfEvolutionEvidencePanel['id']

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
        targets[card.id] = [
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
        targets[card.id] = [
          'candidate-trajectory-summary',
          'proactive-decision-consumption-summary',
          'identity-drift-governance-summary',
        ]
      }
    }
  }

  return targets
}
