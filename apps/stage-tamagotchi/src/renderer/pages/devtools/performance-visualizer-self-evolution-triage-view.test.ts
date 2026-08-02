import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionTriageView } from './performance-visualizer-self-evolution-triage-view'

describe('performance visualizer self evolution triage view', () => {
  it('maps only explicit triage entries and preserves structured renderer fields', () => {
    const view = buildSelfEvolutionTriageView([
      {
        key: 'status',
        label: 'Status',
        value: 'open',
        technicalValue: 'open',
      },
      {
        key: 'repair-owner',
        label: 'Owner',
        value: 'body',
        technicalValue: 'opaque diagnostic display',
        layer: 'continuity',
        detail: 'selected owner',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        survivingVisibleLane: 'face+lipsync+voice-only',
      },
      {
        key: 'repair-path',
        label: 'Path',
        value: 'evidence:runtime-continuity-projection',
        technicalValue: 'evidence:runtime-continuity-projection',
        layer: 'continuity',
        detail: 'selected evidence path',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        survivingVisibleLane: 'face+lipsync+voice-only',
      },
    ] as any)

    expect(view.overviewLines).toEqual(['status: open'])
    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: 'Owner',
        layer: 'continuity',
        detail: 'selected owner',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        survivingVisibleLane: 'face+lipsync+voice-only',
      },
      {
        id: 'repair-path',
        label: 'Path',
        layer: 'continuity',
        detail: 'selected evidence path',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        survivingVisibleLane: 'face+lipsync+voice-only',
      },
    ])
  })

  it('does not synthesize triage cards from unrelated summary entries', () => {
    const view = buildSelfEvolutionTriageView([
      {
        key: 'continuity',
        label: 'Continuity',
        value: 'runtime-thread-1',
        technicalValue: 'runtime-thread-1',
      },
    ])

    expect(view.overviewLines).toEqual(['continuity: runtime-thread-1'])
    expect(view.triageCards).toEqual([])
  })
})
