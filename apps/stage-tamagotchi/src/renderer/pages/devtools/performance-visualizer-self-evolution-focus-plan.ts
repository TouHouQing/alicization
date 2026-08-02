import type {
  PerformanceVisualizerSelfEvolutionTriageCard,
} from './performance-visualizer-self-evolution-triage-view'

import { buildSelfEvolutionTriageTargets } from './performance-visualizer-self-evolution-triage-targets'
import { recommendSelfEvolutionTraceEventId } from './performance-visualizer-self-evolution-triage-trace-event'
import { buildSelfEvolutionTriageTraceTargets } from './performance-visualizer-self-evolution-triage-trace-targets'

interface SelfEvolutionTraceEventCandidate {
  id: string
  kind: string
  summary?: string | null
}

function resolveBodyContinuityPhase(
  selectedCard: PerformanceVisualizerSelfEvolutionTriageCard,
) {
  if (
    selectedCard.bodyContinuityPhase === 'body-only-hold'
    || selectedCard.bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || selectedCard.bodyContinuityPhase === 'full-cross-modal-lock'
    || selectedCard.bodyContinuityPhase === 'renderer-rejoin-without-body'
  ) {
    return selectedCard.bodyContinuityPhase
  }

  return null
}

function resolveRendererRejoinSurfaceKey(
  selectedCard: PerformanceVisualizerSelfEvolutionTriageCard,
) {
  return selectedCard.rendererRejoinSurfaceKey ?? null
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
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
    }
  }

  const evidenceTargets = buildSelfEvolutionTriageTargets(triageCards)
  const traceTargets = buildSelfEvolutionTriageTraceTargets(triageCards)
  const resolvedSelectedCardId = selectedCard.id
  const highlightedEvidencePanelIds = evidenceTargets[resolvedSelectedCardId] ?? []
  const highlightedTraceSectionIds = traceTargets[resolvedSelectedCardId] ?? []
  const recommendedTraceEventId = recommendSelfEvolutionTraceEventId(selectedCard, traceEvents)
  const bodyContinuityPhase = resolveBodyContinuityPhase(selectedCard)
  const rendererRejoinSurfaceKey = resolveRendererRejoinSurfaceKey(selectedCard)

  return {
    selectedCardId: resolvedSelectedCardId,
    highlightedEvidencePanelIds,
    highlightedTraceSectionIds,
    recommendedTraceEventId,
    bodyContinuityPhase,
    rendererRejoinSurfaceKey,
    ...(selectedCard.survivingVisibleLane
      ? { survivingVisibleLane: selectedCard.survivingVisibleLane }
      : {}),
    explanation: buildFocusExplanation(
      resolvedSelectedCardId,
      highlightedEvidencePanelIds,
      highlightedTraceSectionIds,
      recommendedTraceEventId,
    ),
  }
}
