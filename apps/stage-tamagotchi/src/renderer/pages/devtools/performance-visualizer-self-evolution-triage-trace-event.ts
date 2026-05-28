import type {
  PerformanceVisualizerSelfEvolutionTriageCard,
} from './performance-visualizer-self-evolution-triage-view'

interface SelfEvolutionTraceEventCandidate {
  id: string
  kind: string
  summary?: string | null
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

  if (triageCard.detail.startsWith('continuity governance ') || triageCard.detail === 'same-her continuity governance') {
    return traceEvents.find(event => event.kind === 'takeover-audit')?.id
      ?? traceEvents.find(event => event.kind === 'governance-normalized')?.id
      ?? null
  }

  if (triageCard.layer === 'continuity') {
    return traceEvents.find(event => event.kind === 'takeover-audit')?.id
      ?? traceEvents.find(event => event.kind === 'governance-normalized')?.id
      ?? null
  }

  return null
}
