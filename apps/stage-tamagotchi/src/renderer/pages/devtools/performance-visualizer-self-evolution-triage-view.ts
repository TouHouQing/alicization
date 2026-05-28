import type { PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry } from './performance-visualizer-self-evolution-diagnostic-summary'

import { buildSelfEvolutionDiagnosticSummaryLines } from './performance-visualizer-self-evolution-diagnostic-summary'

export interface PerformanceVisualizerSelfEvolutionTriageCard {
  id: 'repair-owner' | 'first-check' | 'repair-path'
  label: string
  layer: string | null
  detail: string
}

export interface PerformanceVisualizerSelfEvolutionTriageView {
  overviewLines: string[]
  triageCards: PerformanceVisualizerSelfEvolutionTriageCard[]
}

function splitLayerDetail(value: string) {
  const separatorIndex = value.indexOf(' | ')
  if (separatorIndex < 0) {
    return {
      layer: null,
      detail: value,
    }
  }

  return {
    layer: value.slice(0, separatorIndex).trim() || null,
    detail: value.slice(separatorIndex + 3).trim(),
  }
}

export function buildSelfEvolutionTriageView(
  entries: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry[],
): PerformanceVisualizerSelfEvolutionTriageView {
  const triageCards = entries
    .filter(entry => (
      entry.key === 'repair-owner'
      || entry.key === 'first-check'
      || entry.key === 'repair-path'
    ))
    .map((entry) => {
      const rawValue = entry.technicalValue ?? entry.value
      const parts = splitLayerDetail(rawValue)
      return {
        id: entry.key,
        label: entry.label,
        layer: entry.key === 'repair-path' ? null : parts.layer,
        detail: entry.key === 'repair-path' ? rawValue : parts.detail,
      }
    })

  const continuityEntry = entries.find(entry => (
    entry.key === 'continuity'
    && (entry.technicalValue ?? entry.value).includes('remembered-familiarity-memory-first')
  ))

  if (continuityEntry && triageCards.length === 0) {
    triageCards.push(
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'same-her continuity governance',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'candidate trajectory -> remembered familiarity restraint -> identity drift governance',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance remembered-familiarity-memory-first -> candidate trajectory same-her room -> identity boundary bounded-growth',
      },
    )
  }

  const overviewEntries = entries.filter(entry => (
    entry.key !== 'repair-owner'
    && entry.key !== 'first-check'
    && entry.key !== 'repair-path'
  ))

  return {
    overviewLines: buildSelfEvolutionDiagnosticSummaryLines(overviewEntries),
    triageCards,
  }
}
