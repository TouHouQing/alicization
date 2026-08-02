import type { PerformanceVisualizerSelfEvolutionTriageCard } from './performance-visualizer-self-evolution-triage-view'

export function resolveDefaultSelfEvolutionFocusCardId(
  triageCards: PerformanceVisualizerSelfEvolutionTriageCard[],
) {
  return triageCards.find(card => card.id === 'repair-path')?.id
    ?? triageCards.find(card => card.id === 'first-check')?.id
    ?? triageCards.find(card => card.id === 'repair-owner')?.id
    ?? null
}
