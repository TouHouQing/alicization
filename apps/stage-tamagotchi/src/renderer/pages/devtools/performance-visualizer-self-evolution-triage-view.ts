import type { PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry } from './performance-visualizer-self-evolution-diagnostic-summary'

import { buildSelfEvolutionDiagnosticSummaryLines } from './performance-visualizer-self-evolution-diagnostic-summary'

export interface PerformanceVisualizerSelfEvolutionTriageCard {
  id: 'repair-owner' | 'first-check' | 'repair-path'
  label: string
  layer: string | null
  detail: string
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
}

export interface PerformanceVisualizerSelfEvolutionTriageView {
  overviewLines: string[]
  triageCards: PerformanceVisualizerSelfEvolutionTriageCard[]
}

type PerformanceVisualizerSelfEvolutionTriageSummaryEntry
  = PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry & {
    key: PerformanceVisualizerSelfEvolutionTriageCard['id']
  }

function isSelfEvolutionTriageSummaryEntry(
  entry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry,
): entry is PerformanceVisualizerSelfEvolutionTriageSummaryEntry {
  return entry.key === 'repair-owner'
    || entry.key === 'first-check'
    || entry.key === 'repair-path'
}

export function buildSelfEvolutionTriageView(
  entries: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry[],
): PerformanceVisualizerSelfEvolutionTriageView {
  const overviewEntries = entries.filter(entry => !isSelfEvolutionTriageSummaryEntry(entry))
  const triageCards = entries
    .filter(isSelfEvolutionTriageSummaryEntry)
    .map((entry): PerformanceVisualizerSelfEvolutionTriageCard => {
      return {
        id: entry.key,
        label: entry.label,
        layer: entry.layer ?? null,
        detail: entry.detail ?? entry.technicalValue ?? entry.value,
        bodyContinuityPhase: entry.bodyContinuityPhase ?? null,
        rendererRejoinSurfaceKey: entry.rendererRejoinSurfaceKey ?? null,
        survivingVisibleLane: entry.survivingVisibleLane ?? null,
      }
    })

  return {
    overviewLines: buildSelfEvolutionDiagnosticSummaryLines(overviewEntries),
    triageCards,
  }
}
