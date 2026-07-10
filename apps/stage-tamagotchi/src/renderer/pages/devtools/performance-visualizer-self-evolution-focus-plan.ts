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

function formatRendererRejoinSurfaceName(
  surfaceKey: PerformanceVisualizerSelfEvolutionTriageCard['rendererRejoinSurfaceKey'],
) {
  if (surfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D'
  if (surfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM'
  if (surfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech'
  return null
}

function buildBodyContinuityGovernanceNote(params: {
  bodyContinuityPhase: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey: PerformanceVisualizerSelfEvolutionTriageCard['rendererRejoinSurfaceKey']
  survivingVisibleLane?: PerformanceVisualizerSelfEvolutionTriageCard['survivingVisibleLane']
}) {
  const rendererSurface = formatRendererRejoinSurfaceName(params.rendererRejoinSurfaceKey)

  if (params.bodyContinuityPhase === 'body-only-hold') {
    return '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 identity-continuity 生命线本身没有断。'
  }

  if (params.bodyContinuityPhase === 'body-carried-to-renderer-rejoin') {
    return rendererSurface
      ? `身体连续性已经明确进入身体承接态 -> 显形补回态，${rendererSurface} 显形权威仍在沿同一条连续身体线补回。`
      : '身体连续性已经明确进入身体承接态 -> 显形补回态，显形权威仍在沿同一条连续身体线补回。'
  }

  if (params.bodyContinuityPhase === 'full-cross-modal-lock') {
    return rendererSurface
      ? `身体连续性已经明确处于跨模态重锁态，${rendererSurface} 显形权威仍与身体线共同锁在同一段 living segment 上。`
      : '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上。'
  }

  if (params.bodyContinuityPhase === 'renderer-rejoin-without-body') {
    if (params.survivingVisibleLane === 'face+lipsync+voice-only') {
      return '当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线。'
    }
    if (params.survivingVisibleLane === 'motion+lipsync+voice-only') {
      return '当前仅剩动作、口型、声音维持同一段连续性，可见 identity-continuity continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线。'
    }
    if (params.survivingVisibleLane === 'face+lipsync-only') {
      return '当前只有 face 和 lipsync 这条 identity-continuity 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线。'
    }
    if (params.survivingVisibleLane === 'motion+lipsync-only') {
      return '当前只有 motion 和 lipsync 这条 identity-continuity 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线。'
    }
    return rendererSurface
      ? `显形回接失身态已经被完整记录：${rendererSurface} 显形权威已经回接，但身体线没有继续托住同一段 living segment。`
      : '显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment。'
  }

  return null
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

  if (
    selectedCard.detail.includes('body-only hold')
    || selectedCard.detail.includes('body-only-hold')
    || selectedCard.detail.includes('独自托住同一段 living segment')
  ) {
    return 'body-only-hold'
  }

  if (
    selectedCard.detail.includes('full-cross-modal-lock')
    || selectedCard.detail.includes('same-segment lock')
    || selectedCard.detail.includes('共同锁回同一段 living segment')
  ) {
    return 'full-cross-modal-lock'
  }

  if (
    selectedCard.detail.includes('renderer-rejoin-without-body')
    || selectedCard.detail.includes('without body carry')
    || selectedCard.detail.includes('身体线没有继续托住同一段 living segment')
  ) {
    return 'renderer-rejoin-without-body'
  }

  return selectedCard.detail.includes('body-led-same-segment-carry')
    || selectedCard.detail.includes('body authority carry')
    || selectedCard.detail.includes('renderer rejoin')
    || selectedCard.detail.includes('显形补回')
    ? 'body-carried-to-renderer-rejoin'
    : null
}

function resolveRendererRejoinSurfaceKey(
  selectedCard: PerformanceVisualizerSelfEvolutionTriageCard,
) {
  if (selectedCard.rendererRejoinSurfaceKey)
    return selectedCard.rendererRejoinSurfaceKey
  if (selectedCard.detail.includes('Live2D') || selectedCard.detail.includes('live2d'))
    return 'authority:renderer-rejoin:live2d'
  if (selectedCard.detail.includes('VRM') || selectedCard.detail.includes('vrm'))
    return 'authority:renderer-rejoin:vrm'
  if (selectedCard.detail.includes('speech'))
    return 'authority:renderer-rejoin:speech'
  return null
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
  const bodyContinuityGovernanceNote = buildBodyContinuityGovernanceNote({
    bodyContinuityPhase,
    rendererRejoinSurfaceKey,
    survivingVisibleLane: selectedCard.survivingVisibleLane,
  })

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
    ...(bodyContinuityGovernanceNote
      ? { bodyContinuityGovernanceNote }
      : {}),
    explanation: buildFocusExplanation(
      resolvedSelectedCardId,
      highlightedEvidencePanelIds,
      highlightedTraceSectionIds,
      recommendedTraceEventId,
    ),
  }
}
