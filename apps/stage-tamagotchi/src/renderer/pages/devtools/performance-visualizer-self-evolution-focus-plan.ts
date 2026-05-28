import type {
  PerformanceVisualizerSelfEvolutionTriageCard,
} from './performance-visualizer-self-evolution-triage-view'

import { buildSelfEvolutionTriageTargets } from './performance-visualizer-self-evolution-triage-targets'
import { buildSelfEvolutionTriageTraceTargets } from './performance-visualizer-self-evolution-triage-trace-targets'
import { recommendSelfEvolutionTraceEventId } from './performance-visualizer-self-evolution-triage-trace-event'

interface SelfEvolutionTraceEventCandidate {
  id: string
  kind: string
  summary?: string | null
}

function buildFocusExplanation(
  selectedCardId: PerformanceVisualizerSelfEvolutionTriageCard['id'],
  highlightedEvidencePanelIds: string[],
  highlightedTraceSectionIds: string[],
  recommendedTraceEventId: string | null,
) {
  const evidenceChain = highlightedEvidencePanelIds.join(' -> ')
  const traceChain = highlightedTraceSectionIds.join(' -> ')
  const eventSuffix = recommendedTraceEventId
    ? ` and event ${recommendedTraceEventId}.`
    : '.'
  return `Focused ${selectedCardId} because it points to ${evidenceChain}, then narrows into ${traceChain}${eventSuffix}`
}

export function buildSelfEvolutionFocusPlan(
  triageCards: PerformanceVisualizerSelfEvolutionTriageCard[],
  selectedCardId: PerformanceVisualizerSelfEvolutionTriageCard['id'] | null,
  traceEvents: SelfEvolutionTraceEventCandidate[],
) {
  const selectedCard = selectedCardId
    ? triageCards.find(card => card.id === selectedCardId) ?? null
    : null

  if (!selectedCard) {
    return {
      selectedCardId: null,
      highlightedEvidencePanelIds: [],
      highlightedTraceSectionIds: [],
      recommendedTraceEventId: null,
      explanation: null,
    }
  }

  const evidenceTargets = buildSelfEvolutionTriageTargets(triageCards)
  const traceTargets = buildSelfEvolutionTriageTraceTargets(triageCards)
  const highlightedEvidencePanelIds = evidenceTargets[selectedCardId] ?? []
  const highlightedTraceSectionIds = traceTargets[selectedCardId] ?? []
  const recommendedTraceEventId = recommendSelfEvolutionTraceEventId(selectedCard, traceEvents)

  return {
    selectedCardId,
    highlightedEvidencePanelIds,
    highlightedTraceSectionIds,
    recommendedTraceEventId,
    explanation: buildFocusExplanation(
      selectedCardId,
      highlightedEvidencePanelIds,
      highlightedTraceSectionIds,
      recommendedTraceEventId,
    ),
  }
}
