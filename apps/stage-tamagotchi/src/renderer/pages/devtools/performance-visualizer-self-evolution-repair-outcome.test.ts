import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairOutcome } from './performance-visualizer-self-evolution-repair-outcome'

function closure(overrides: Record<string, unknown> = {}) {
  return {
    isClosed: false,
    sessionCovered: false,
    hasFreshValidationSnapshot: false,
    samePatternStillPresent: true,
    prosodyAuthorityRelevant: false,
    prosodyAuthorityValidated: null,
    summaryLines: [],
    bodyContinuityPhase: null,
    rendererRejoinSurfaceKey: null,
    survivingVisibleLane: null,
    ...overrides,
  }
}

describe('performance visualizer self evolution repair outcome', () => {
  it('returns null without both closure snapshots', () => {
    expect(buildSelfEvolutionRepairOutcome({
      repairClosureBefore: null,
      repairClosureAfter: null,
    })).toBeNull()
  })

  it('reports improved and unresolved signals while closure remains open', () => {
    expect(buildSelfEvolutionRepairOutcome({
      repairClosureBefore: closure(),
      repairClosureAfter: closure({
        sessionCovered: true,
      }),
    })).toEqual({
      closureChanged: false,
      improvedSignals: ['repair-checklist-covered'],
      unresolvedSignals: [
        'validation-snapshot-missing',
        'recurring-pattern-present',
      ],
      summaryLine: 'repairClosure: open; evidence changed',
      detailLine: 'improved=repair-checklist-covered; unresolved=validation-snapshot-missing,recurring-pattern-present; bodyContinuityPhase=n/a; rendererRejoinSurfaceKey=n/a; survivingVisibleLane=n/a',
    })
  })

  it('reports explicit structured state when closure changes to closed', () => {
    const result = buildSelfEvolutionRepairOutcome({
      repairClosureBefore: closure(),
      repairClosureAfter: closure({
        isClosed: true,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        survivingVisibleLane: 'face+lipsync+voice-only',
      }),
    })

    expect(result?.summaryLine).toBe('repairClosure: open -> closed')
    expect(result?.detailLine).toContain('bodyContinuityPhase=renderer-rejoin-without-body')
    expect(result?.detailLine).toContain('rendererRejoinSurfaceKey=authority:renderer-rejoin:speech')
    expect(result?.unresolvedSignals).toEqual([])
  })
})
