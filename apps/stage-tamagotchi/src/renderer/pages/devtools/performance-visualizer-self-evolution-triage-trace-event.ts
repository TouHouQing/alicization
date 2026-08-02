import type {
  PerformanceVisualizerSelfEvolutionTriageCard,
} from './performance-visualizer-self-evolution-triage-view'

interface SelfEvolutionTraceEventCandidate {
  id: string
  kind: string
  summary?: string | null
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

  if (triageCard.layer === 'persona') {
    return traceEvents.find(event => event.kind === 'takeover-audit')?.id
      ?? traceEvents.find(event => event.kind === 'governance-normalized')?.id
      ?? null
  }

  if (triageCard.layer === 'renderer') {
    return traceEvents.find(event => event.kind === 'person-state-updated')?.id
      ?? traceEvents.find(event => event.kind === 'presence-pulse-dispatched')?.id
      ?? null
  }

  if (isStructuredBodyContinuityRendererRejoin(triageCard)) {
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
