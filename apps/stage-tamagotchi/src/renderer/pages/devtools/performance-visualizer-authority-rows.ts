import type {
  PerformanceVisualizerAuthoritySegmentRow,
  PerformanceVisualizerAuthoritySummaryEntry,
} from './performance-visualizer-authority-summary'

import { buildAuthoritySettleLines } from './performance-visualizer-authority-settle'

export interface PerformanceVisualizerAuthorityDisplayDetailRow {
  surface: string
  lane: string
  planned: string
  consumed: string
  source: string
  confidence: string
  settle?: PerformanceVisualizerAuthoritySummaryEntry['settle']
  aligned: boolean | null
  settleLines: string[]
}

export interface PerformanceVisualizerAuthorityDisplayRow {
  cueId: string
  cueText: string | null
  surfaces: string
  lanes: string
  driftStatus: PerformanceVisualizerAuthoritySegmentRow['driftStatus']
  aligned: boolean | null
  detailRows: PerformanceVisualizerAuthorityDisplayDetailRow[]
}

function formatConfidence(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(2)
    : 'n/a'
}

function buildDetailRow(entry: PerformanceVisualizerAuthoritySummaryEntry): PerformanceVisualizerAuthorityDisplayDetailRow {
  return {
    surface: entry.surface,
    lane: entry.lane,
    planned: entry.planned,
    consumed: entry.consumed,
    source: entry.source ?? 'n/a',
    confidence: formatConfidence(entry.confidence),
    settle: entry.settle,
    aligned: entry.aligned,
    settleLines: buildAuthoritySettleLines(entry),
  }
}

export function buildAuthorityDisplayRows(
  rows: PerformanceVisualizerAuthoritySegmentRow[],
): PerformanceVisualizerAuthorityDisplayRow[] {
  return rows.map(row => ({
    cueId: row.cueId,
    cueText: row.cueText,
    surfaces: row.surfaces.join(', '),
    lanes: row.lanes.join(', '),
    driftStatus: row.driftStatus,
    aligned: row.aligned,
    detailRows: row.entries.map(buildDetailRow),
  }))
}
