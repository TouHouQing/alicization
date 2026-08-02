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
          summary: 'The current relationship evidence remains stable.',
          selfContinuityAuthority: {
            authoritySummary: 'Evidence-backed identity summary.',
            inwardLine: 'Evidence-backed inward summary.',
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
        summary: 'The current relationship evidence remains stable.',
        selfContinuityAuthority: expect.objectContaining({
          authoritySummary: 'Evidence-backed identity summary.',
          inwardLine: 'Evidence-backed inward summary.',
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
              id: 'reflection::continuity-repair',
              summary: 'The continuity repair line is still the meaningful memory carry.',
              expectation: 'The steadier repair line should stay active until a newer meaningful reflection replaces it.',
              observedOutcome: 'The continuity state still needs a measured return.',
              outcome: 'missed',
              revision: 'Keep the continuity repair line active instead of reopening from temporary noise.',
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

    expect(digest?.reflectionSummary).toBe('The continuity repair line is still the meaningful memory carry.')
    expect(digest?.reflectionSummary).not.toContain('temporary anxious wobble')
    expect(digest?.reflectionPressure).toBe(0.22)
  })

  it('does not expose legacy reply suppression flags in the memory digest', () => {
    const digest = buildAlicizationDigitalLifeMemoryDigest({
      version: 'digital-life-runtime-surface-v1',
      memory: {
        workingMemoryEpisodes: [],
        concerns: [],
        recallGovernor: {
          mode: 'relationship',
          carryAsMemory: false,
          recollectionIntent: {
            mode: 'relationship-history',
            temporalFocus: 'cross-session',
            rationale: 'relationship-memory',
            confidence: 0.8,
          },
        },
      },
    } as any)

    expect(digest?.recollectionSurfaceSummary).toBe('carry=none')
    expect(JSON.stringify(digest)).not.toContain('fragments=off')
    expect(JSON.stringify(digest)).not.toContain('active-thoughts=off')
  })

  it('does not project retired reply-shaping fields into the memory digest', () => {
    const digest = buildAlicizationDigitalLifeMemoryDigest({
      version: 'digital-life-runtime-surface-v1',
      memory: {
        workingMemoryEpisodes: [],
        concerns: [],
        selfEvolution: {
          version: 'self-evolution-kernel-v1',
          relationshipDoctrine: 'Evidence-backed relationship meaning.',
          relationshipCadenceSummary: 'legacy cadence prose',
          latestInflection: 'A reviewed relationship outcome.',
          burdenLine: null,
          trustMeaning: 'Trust is supported by reviewed outcomes.',
          summary: 'Reviewed self-evolution evidence.',
        },
        personStateProjection: {
          summary: 'Reviewed person-state evidence.',
          openingGuidance: 'legacy opening prose',
          activeClosenessContext: 'trusted',
          activeClosenessRung: 'steady',
          relationshipPosture: 'warm',
          preferredProactiveStyle: 'gentle-check-in',
        },
      },
    } as any)

    expect(digest?.selfEvolution).not.toHaveProperty('relationshipCadenceSummary')
    expect(digest?.personStateProjection).not.toHaveProperty('openingGuidance')
    expect(digest?.personStateProjection).not.toHaveProperty('manifestationCadenceSummary')
  })
})
