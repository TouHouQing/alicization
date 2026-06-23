import { describe, expect, it } from 'vitest'

import { resolvePerformanceVisualizerEvidenceLineScrollTargetId } from './performance-visualizer-evidence-scroll-target'

describe('performance visualizer evidence scroll target', () => {
  it('returns a concrete body-held runtime evidence target for the body-only continuity phase line', () => {
    expect(resolvePerformanceVisualizerEvidenceLineScrollTargetId({
      panelId: 'runtime-continuity-projection',
      line: 'bodyContinuityPhase: body-only-hold',
    })).toBe('self-evolution-evidence:runtime-continuity-body-only-hold')
  })

  it('returns a concrete body-led renderer rejoin runtime evidence target for the body-carried continuity phase line', () => {
    expect(resolvePerformanceVisualizerEvidenceLineScrollTargetId({
      panelId: 'runtime-continuity-projection',
      line: 'bodyContinuityPhase: body-carried-to-renderer-rejoin',
    })).toBe('self-evolution-evidence:runtime-continuity-body-carried-to-renderer-rejoin')
  })

  it('returns a concrete cross-modal-lock runtime evidence target for the full lock continuity phase line', () => {
    expect(resolvePerformanceVisualizerEvidenceLineScrollTargetId({
      panelId: 'runtime-continuity-projection',
      line: 'bodyContinuityPhase: full-cross-modal-lock',
    })).toBe('self-evolution-evidence:runtime-continuity-full-cross-modal-lock')
  })

  it('returns a concrete renderer-rejoin-without-body runtime evidence target for the body-loss continuity phase line', () => {
    expect(resolvePerformanceVisualizerEvidenceLineScrollTargetId({
      panelId: 'runtime-continuity-projection',
      line: 'bodyContinuityPhase: renderer-rejoin-without-body',
    })).toBe('self-evolution-evidence:runtime-continuity-renderer-rejoin-without-body')
  })

  it('stays null for unrelated runtime continuity lines', () => {
    expect(resolvePerformanceVisualizerEvidenceLineScrollTargetId({
      panelId: 'runtime-continuity-projection',
      line: 'continuityAuthoritySummary: 身体线仍在独自托住同一段 living segment，当前还不能把 Live2D 显形权威的回接视为已经成立',
    })).toBeNull()
  })

  it('stays null for unrelated evidence panels', () => {
    expect(resolvePerformanceVisualizerEvidenceLineScrollTargetId({
      panelId: 'renderer-authority-projection',
      line: 'bodyContinuityPhase: body-only-hold',
    })).toBeNull()
  })
})
