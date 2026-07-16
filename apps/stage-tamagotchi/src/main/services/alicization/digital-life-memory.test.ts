import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeMemoryDigest } from './digital-life-memory'

describe('digital life memory', () => {
  it('keeps sparse memory carries digestible when thought-thread and reflection ledgers lose array scaffolding', () => {
    const digest = buildAlicizationDigitalLifeMemoryDigest({
      version: 'digital-life-runtime-surface-v1',
      memory: {
        workingMemoryEpisodes: [],
        concerns: [],
        goalStack: {
          leadingAlicizationGoalId: 'goal-missing-array',
        },
        thoughtThreads: {
          foregroundThreadId: 'thread-missing-array',
        },
        reflectionLedger: {
          latestEntryId: 'reflection-missing-array',
          revisionPressure: 0.42,
        },
        personStateProjection: {
          summary: 'project_continuity=the continuity state still needs to stay continuous inward',
          selfContinuityAuthority: {
            authoritySummary: 'structured continuity digest.',
            inwardLine: 'structured continuity digest.',
          },
        },
      },
      cognition: {
        beliefLedger: {
          focusBeliefId: 'belief-missing-array',
        },
      },
    } as any)

    expect(digest).toEqual(expect.objectContaining({
      thoughtThreadSummary: null,
      reflectionSummary: null,
      reflectionPressure: 0.42,
      focusBeliefStatement: null,
      leadingGoalSummary: null,
      personStateProjection: expect.objectContaining({
        summary: expect.stringContaining('continuity state'),
        selfContinuityAuthority: expect.objectContaining({
          authoritySummary: expect.stringContaining('legacy phase-one template'),
          inwardLine: expect.stringContaining('continuity state'),
        }),
      }),
    }))
  })

  it('does not let a released temporary-noise reflection become the digest reflection summary', () => {
    const digest = buildAlicizationDigitalLifeMemoryDigest({
      version: 'digital-life-runtime-surface-v1',
      memory: {
        workingMemoryEpisodes: [],
        concerns: [],
        reflectionLedger: {
          latestEntryId: 'reflection::temporary-noise',
          entries: [
            {
              id: 'reflection::temporary-noise',
              summary: 'A temporary anxious wobble was already released.',
              expectation: 'Released noise should not keep steering memory digest.',
              observedOutcome: 'The wobble has already been let go.',
              outcome: 'released',
              revision: 'Do not reopen from the temporary wobble.',
              confidenceShift: 0.04,
              createdAt: 10_100,
            },
            {
              id: 'reflection::same-her-repair',
              summary: 'The same-her repair line is still the meaningful memory carry.',
              expectation: 'The steadier repair line should stay active until a newer meaningful reflection replaces it.',
              observedOutcome: 'The continuity state still needs a measured return.',
              outcome: 'missed',
              revision: 'Keep the same-her repair line active instead of reopening from temporary noise.',
              confidenceShift: -0.08,
              createdAt: 10_000,
            },
          ],
          revisionPressure: 0.22,
          narrative: [],
          updatedAt: 10_200,
        },
      },
    } as any)

    expect(digest?.reflectionSummary).toBe('The same-her repair line is still the meaningful memory carry.')
    expect(digest?.reflectionSummary).not.toContain('temporary anxious wobble')
    expect(digest?.reflectionPressure).toBe(0.22)
  })
})
