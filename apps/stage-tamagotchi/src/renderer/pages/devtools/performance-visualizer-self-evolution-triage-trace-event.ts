import type {
  PerformanceVisualizerSelfEvolutionTriageCard,
} from './performance-visualizer-self-evolution-triage-view'

interface SelfEvolutionTraceEventCandidate {
  id: string
  kind: string
  summary?: string | null
}

function isBodyContinuityRendererRejoin(detail: string) {
  return detail.includes('body-led-same-segment-carry')
    || detail.includes('body authority carry')
    || detail.includes('renderer rejoin')
    || detail.includes('显形补回')
}

function isStructuredBodyContinuityRendererRejoin(
  triageCard: PerformanceVisualizerSelfEvolutionTriageCard,
) {
  return triageCard.bodyContinuityPhase === 'body-only-hold'
    || triageCard.bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || triageCard.bodyContinuityPhase === 'full-cross-modal-lock'
    || triageCard.bodyContinuityPhase === 'renderer-rejoin-without-body'
    || triageCard.rendererRejoinSurfaceKey != null
}

export function recommendSelfEvolutionTraceEventId(
  triageCard: PerformanceVisualizerSelfEvolutionTriageCard | null | undefined,
  traceEvents: SelfEvolutionTraceEventCandidate[],
) {
  if (!triageCard || traceEvents.length === 0)
    return null

  if (triageCard.detail.startsWith('persona drift ') || triageCard.detail === 'evolution') {
    return traceEvents.find(event => event.kind === 'takeover-audit')?.id
      ?? traceEvents.find(event => event.kind === 'governance-normalized')?.id
      ?? null
  }

  if (triageCard.detail.startsWith('renderer drift ') || triageCard.detail === 'renderer authority') {
    return traceEvents.find(event => event.kind === 'person-state-updated')?.id
      ?? traceEvents.find(event => event.kind === 'presence-pulse-dispatched')?.id
      ?? null
  }

  if (triageCard.detail.startsWith('continuity governance ') || triageCard.detail === 'identity-continuity continuity governance') {
    return traceEvents.find(event => event.kind === 'takeover-audit')?.id
      ?? traceEvents.find(event => event.kind === 'governance-normalized')?.id
      ?? null
  }

  if (triageCard.detail === 'relationship cadence governance') {
    return traceEvents.find(event => event.kind === 'takeover-audit')?.id
      ?? traceEvents.find(event => event.kind === 'governance-normalized')?.id
      ?? null
  }

  if (
    triageCard.detail === 'body continuity governance'
    || isBodyContinuityRendererRejoin(triageCard.detail)
    || isStructuredBodyContinuityRendererRejoin(triageCard)
  ) {
    return traceEvents.find(event => event.kind === 'takeover-audit')?.id
      ?? traceEvents.find(event => event.kind === 'governance-normalized')?.id
      ?? traceEvents.find(event => event.kind === 'person-state-updated')?.id
      ?? traceEvents.find(event => event.kind === 'presence-pulse-dispatched')?.id
      ?? null
  }

  if (triageCard.layer === 'continuity') {
    return traceEvents.find(event => event.kind === 'takeover-audit')?.id
      ?? traceEvents.find(event => event.kind === 'governance-normalized')?.id
      ?? null
  }

  return null
}
