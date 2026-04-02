import { describe, expect, it } from 'vitest'

import { buildReflectionLedgerFragment } from './reflection-memory'

describe('buildReflectionLedgerFragment', () => {
  it('writes a searchable fragment when latest reflection changes', () => {
    const fragment = buildReflectionLedgerFragment({
      previousLedger: {
        latestEntryId: 'reflection::1',
        entries: [{
          id: 'reflection::1',
          targetProjectId: 'project::repair',
          targetAnswerAct: 'ask-reground',
          targetRepairId: 'repair::stale',
          targetThreadId: 'thread::carry',
          summary: 'Repair pressure is still governing the scene.',
          expectation: 'Repair first.',
          observedOutcome: 'Still stale.',
          outcome: 'stalled',
          revision: 'Keep truth repair ahead of fluency.',
          confidenceShift: -0.06,
          createdAt: 10_000,
        }],
        revisionPressure: 0.16,
        narrative: [],
        updatedAt: 10_000,
      },
      nextLedger: {
        latestEntryId: 'reflection::2',
        entries: [{
          id: 'reflection::2',
          targetProjectId: 'project::repair',
          targetAnswerAct: 'correct-stale-anchor',
          targetRepairId: 'repair::stale',
          targetThreadId: 'thread::live',
          summary: 'The scene was regrounded after repair pressure.',
          expectation: 'Reground should stabilize the reply.',
          observedOutcome: 'World became live-grounded again.',
          outcome: 'corrected',
          revision: 'Let the current grounded scene outrank carried anchor now.',
          confidenceShift: 0.08,
          createdAt: 20_000,
        }],
        revisionPressure: 0.1,
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(fragment).toContain('reflection_outcome:corrected')
    expect(fragment).toContain('reflection_act:correct-stale-anchor')
    expect(fragment).toContain('reflection_confidence_shift:0.08')
    expect(fragment).toContain('reflection_pressure:0.10')
    expect(fragment).toContain('summary:The scene was regrounded after repair pressure.')
    expect(fragment).toContain('revision:Let the current grounded scene outrank carried anchor now.')
  })

  it('returns empty when latest reflection id did not change', () => {
    const fragment = buildReflectionLedgerFragment({
      previousLedger: {
        latestEntryId: 'reflection::stable',
        entries: [{
          id: 'reflection::stable',
          summary: 'The knot no longer needs to be carried.',
          expectation: 'Release the old knot.',
          observedOutcome: 'Moved to a fresher thread.',
          outcome: 'released',
          revision: 'Release old knot and bind to fresher thread.',
          confidenceShift: 0.05,
          createdAt: 10_000,
        }],
        revisionPressure: 0,
        narrative: [],
        updatedAt: 10_000,
      },
      nextLedger: {
        latestEntryId: 'reflection::stable',
        entries: [{
          id: 'reflection::stable',
          summary: 'The knot no longer needs to be carried.',
          expectation: 'Release the old knot.',
          observedOutcome: 'Moved to a fresher thread.',
          outcome: 'released',
          revision: 'Release old knot and bind to fresher thread.',
          confidenceShift: 0.05,
          createdAt: 10_000,
        }],
        revisionPressure: 0,
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(fragment).toBe('')
  })

  it('returns empty when latest reflection has no meaningful summary or revision', () => {
    const fragment = buildReflectionLedgerFragment({
      previousLedger: null,
      nextLedger: {
        latestEntryId: 'reflection::empty',
        entries: [{
          id: 'reflection::empty',
          summary: '  ',
          expectation: 'n/a',
          observedOutcome: 'n/a',
          outcome: 'unknown',
          revision: '\n',
          confidenceShift: 0,
          createdAt: 30_000,
        }],
        revisionPressure: 0,
        narrative: [],
        updatedAt: 30_000,
      },
    })

    expect(fragment).toBe('')
  })
})
