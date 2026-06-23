import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
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

  it('returns empty when a newer released temporary-noise reflection does not actually replace the current meaningful reflection', () => {
    const fragment = buildReflectionLedgerFragment({
      previousLedger: {
        latestEntryId: 'reflection::same-her-repair',
        entries: [{
          id: 'reflection::same-her-repair',
          summary: 'The same-her repair line is still the meaningful reflection carry.',
          expectation: 'The steadier repair line should stay active until a newer meaningful reflection replaces it.',
          observedOutcome: 'The same living line still needs a measured return.',
          outcome: 'missed',
          revision: 'Keep the same-her repair line active instead of reopening from temporary noise.',
          confidenceShift: -0.08,
          createdAt: 10_000,
        }],
        revisionPressure: 0.22,
        narrative: [],
        updatedAt: 10_000,
      },
      nextLedger: {
        latestEntryId: 'reflection::temporary-noise',
        entries: [
          {
            id: 'reflection::temporary-noise',
            summary: 'A temporary anxious wobble was already released.',
            expectation: 'Released noise should not keep steering subconscious reflection carry.',
            observedOutcome: 'The wobble has already been let go.',
            outcome: 'released',
            revision: 'Do not reopen from the temporary wobble.',
            confidenceShift: 0.04,
            createdAt: 10_100,
          },
          {
            id: 'reflection::same-her-repair',
            summary: 'The same-her repair line is still the meaningful reflection carry.',
            expectation: 'The steadier repair line should stay active until a newer meaningful reflection replaces it.',
            observedOutcome: 'The same living line still needs a measured return.',
            outcome: 'missed',
            revision: 'Keep the same-her repair line active instead of reopening from temporary noise.',
            confidenceShift: -0.08,
            createdAt: 10_000,
          },
        ],
        revisionPressure: 0.22,
        narrative: [],
        updatedAt: 10_100,
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

  it('reads reflection ledgers from runtime surfaces', () => {
    const previousState = {
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      privateThought: null,
      captureState: {
        permission: 'unknown',
        lastGroundedAt: null,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 10_000,
      updatedAt: 10_000,
      reflectionLedger: {
        latestEntryId: 'reflection::runtime::1',
        entries: [{
          id: 'reflection::runtime::1',
          summary: 'The prior runtime surface was still carrying stale repair pressure.',
          expectation: 'Repair pressure should ease once regrounded.',
          observedOutcome: 'Still stale.',
          outcome: 'stalled',
          revision: 'Keep the repair thread alive.',
          confidenceShift: -0.04,
          createdAt: 10_000,
        }],
        revisionPressure: 0.2,
        narrative: [],
        updatedAt: 10_000,
      },
    }
    const nextState = {
      ...previousState,
      updatedAt: 20_000,
      reflectionLedger: {
        latestEntryId: 'reflection::runtime::2',
        entries: [{
          id: 'reflection::runtime::2',
          targetProjectId: 'project::runtime-surface',
          targetAnswerAct: 'guide',
          targetThreadId: 'thread::runtime-surface',
          summary: 'The runtime surface now carries the fresher governed line.',
          expectation: 'Surface-based ledgers should stay replayable.',
          observedOutcome: 'Read-side modules now agree on one runtime surface.',
          outcome: 'corrected',
          revision: 'Read reflection state from the digital-life surface, not raw field soup.',
          confidenceShift: 0.12,
          createdAt: 20_000,
        }],
        revisionPressure: 0.08,
        narrative: [],
        updatedAt: 20_000,
      },
    }

    const fragment = buildReflectionLedgerFragment({
      previousRuntimeSurface: buildAlicizationDigitalLifeRuntimeSurface(previousState as any),
      nextRuntimeSurface: buildAlicizationDigitalLifeRuntimeSurface(nextState as any),
    })

    expect(fragment).toContain('reflection_outcome:corrected')
    expect(fragment).toContain('reflection_project:project::runtime-surface')
    expect(fragment).toContain('reflection_act:guide')
    expect(fragment).toContain('reflection_confidence_shift:0.12')
    expect(fragment).toContain('reflection_pressure:0.08')
    expect(fragment).toContain('revision:Read reflection state from the digital-life surface, not raw field soup.')
  })
})
