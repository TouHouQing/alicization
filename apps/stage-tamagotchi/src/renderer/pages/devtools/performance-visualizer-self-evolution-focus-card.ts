import type { PerformanceVisualizerSelfEvolutionTriageCard } from './performance-visualizer-self-evolution-triage-view'

export function resolveDefaultSelfEvolutionFocusCardId(
  triageCards: PerformanceVisualizerSelfEvolutionTriageCard[],
) {
  const continuityFirstCheck = triageCards.find(card =>
    card.id === 'first-check'
    && card.layer === 'continuity'
    && (
      card.detail.includes('project-state carry')
      || card.detail.includes('Project identity carry')
    ),
  )?.id
  if (continuityFirstCheck)
    return continuityFirstCheck

  return triageCards.find(card => card.id === 'repair-path')?.id
    ?? triageCards.find(card => card.id === 'first-check')?.id
    ?? triageCards.find(card => card.id === 'repair-owner')?.id
    ?? null
}
