import { describe, expect, it } from 'vitest'

import {
  deriveRuntimeProjectionRelationshipCarry,
  resolvePreparedRuntimeSelfContinuityAuthority,
} from './prepared-runtime-continuity'

describe('prepared-runtime-continuity', () => {
  it('does not turn projection metadata into a prepared reply line', () => {
    const carry = deriveRuntimeProjectionRelationshipCarry({
      summary: 'projection metadata',
    })

    expect(carry).toBeNull()
  })

  it('preserves natural self-continuity language without keyword filtering', () => {
    const selfLine = 'I remember the project state discussion as part of my own lived history.'
    const relationshipLine = 'We can return to the same thread without pretending it is a scripted rule.'
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          perception: { updatedAt: 50, watchMode: 'ambient' },
          raw: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine,
                relationshipLine,
                inwardLine: 'Keep the remembered details available for this turn.',
                authoritySummary: `${selfLine} | ${relationshipLine}`,
                sourceTags: ['memory-owned'],
              },
            },
          },
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine,
                relationshipLine,
                inwardLine: 'Keep the remembered details available for this turn.',
                authoritySummary: `${selfLine} | ${relationshipLine}`,
                sourceTags: ['memory-owned'],
              },
            },
          },
          agency: { habitPolicy: null },
          cognition: { privateThought: null },
          dialogue: { answerPlanner: null, conversationState: null, currentConsciousFrame: null },
          world: { worldModel: null },
        },
      },
    } as any)

    expect(authority?.selfLine).toBe(selfLine)
    expect(authority?.relationshipLine).toBe(relationshipLine)
  })

  it('prefers memory-owned continuity authority over a persisted projection', () => {
    const autobiographicalIdentity = 'I remember how our trust grew and answer from that lived history.'
    const rememberedPlan = 'Return to the unfinished test after the next quiet break.'
    const persistedProjectionLine = 'Persisted projection should not outrank memory-owned continuity.'
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          perception: { updatedAt: 50, watchMode: 'ambient' },
          memory: {
            autobiographicalSelf: {
              identityNarrative: autobiographicalIdentity,
              activeGoals: [],
            },
            longHorizonMemory: {
              preferenceBias: {
                companionship: 0.72,
                truthfulGrounding: 0.82,
                gentleRepair: 0.68,
                quietObservation: 0.54,
                proactiveCare: 0.62,
                playfulIntimacy: 0.16,
                autonomyRespect: 0.76,
                unfinishedThreadReturn: 0.7,
              },
              identityBias: {
                guardedness: 0.24,
                tenderness: 0.62,
                directness: 0.72,
                selfDirection: 0.7,
              },
              rememberedPlanSummary: rememberedPlan,
              rememberedConstraintSummary: 'Do not interrupt focused work without a concrete reason.',
              anchorFacts: [],
              summary: '',
              updatedAt: 50,
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: persistedProjectionLine,
                relationshipLine: `${persistedProjectionLine} relationship`,
                motiveLine: `${persistedProjectionLine} motive`,
                habitLine: `${persistedProjectionLine} habit`,
                inwardLine: `${persistedProjectionLine} inward`,
                authoritySummary: `${persistedProjectionLine} summary`,
                sourceTags: ['persisted-projection'],
              },
            },
          },
          agency: { habitPolicy: null },
          cognition: { privateThought: null },
          dialogue: { answerPlanner: null, conversationState: null, currentConsciousFrame: null },
          world: { worldModel: null },
        },
      },
    } as any)
    const serializedAuthority = JSON.stringify(authority)

    expect(authority?.selfLine).toBe(autobiographicalIdentity)
    expect(authority?.inwardLine).toContain(rememberedPlan)
    expect(authority?.sourceTags).toEqual(expect.arrayContaining([
      'autobiographical-self',
      'long-horizon-plan',
      'long-horizon-constraint',
    ]))
    expect(authority?.sourceTags).not.toContain('persisted-projection')
    expect(serializedAuthority).not.toContain(persistedProjectionLine)
  })

  it('prefers preference-owned continuity authority over a persisted projection', () => {
    const rememberedPreference = 'The host prefers direct answers while focused.'
    const dominantCue = 'Keep the response concise and grounded in the current task.'
    const persistedProjectionLine = 'Persisted projection should not outrank remembered preference.'
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          perception: { updatedAt: 50, watchMode: 'ambient' },
          memory: {
            longHorizonMemory: {
              preferenceBias: {
                companionship: 0.72,
                truthfulGrounding: 0.82,
                gentleRepair: 0.68,
                quietObservation: 0.54,
                proactiveCare: 0.62,
                playfulIntimacy: 0.16,
                autonomyRespect: 0.76,
                unfinishedThreadReturn: 0.7,
              },
              identityBias: {
                guardedness: 0.24,
                tenderness: 0.62,
                directness: 0.72,
                selfDirection: 0.7,
              },
              rememberedPreferenceSummary: rememberedPreference,
              dominantCueSummary: dominantCue,
              anchorFacts: [],
              summary: '',
              updatedAt: 50,
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: persistedProjectionLine,
                relationshipLine: `${persistedProjectionLine} relationship`,
                motiveLine: `${persistedProjectionLine} motive`,
                habitLine: `${persistedProjectionLine} habit`,
                inwardLine: `${persistedProjectionLine} inward`,
                authoritySummary: `${persistedProjectionLine} summary`,
                sourceTags: ['persisted-projection'],
              },
            },
          },
          agency: { habitPolicy: null },
          cognition: { privateThought: null },
          dialogue: { answerPlanner: null, conversationState: null, currentConsciousFrame: null },
          world: { worldModel: null },
        },
      },
    } as any)
    const serializedAuthority = JSON.stringify(authority)

    expect(authority?.selfLine).toBe(rememberedPreference)
    expect(authority?.inwardLine).toContain(dominantCue)
    expect(authority?.sourceTags).not.toContain('persisted-projection')
    expect(serializedAuthority).not.toContain(persistedProjectionLine)
  })

  it('prefers current memory owners over bundled and projection mirrors', () => {
    const cleanRuntimeSelfLine = 'The live runtime remembers the current self without reopening an older project shell.'
    const cleanRuntimeRelationshipLine = 'The live runtime keeps this return measured and specific to the current thread.'
    const bundledProjectionLine = 'Bundled projection should not outrank live runtime memory.'
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          perception: { updatedAt: 50, watchMode: 'ambient' },
          raw: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: bundledProjectionLine,
                relationshipLine: `${bundledProjectionLine} relationship`,
                motiveLine: `${bundledProjectionLine} motive`,
                habitLine: `${bundledProjectionLine} habit`,
                inwardLine: `${bundledProjectionLine} inward`,
                authoritySummary: `${bundledProjectionLine} summary`,
                sourceTags: ['bundled-projection'],
              },
            },
          },
          memory: {
            autobiographicalSelf: {
              identityNarrative: 'The current self is grounded in lived memory.',
              activeGoals: [],
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: cleanRuntimeSelfLine,
                relationshipLine: cleanRuntimeRelationshipLine,
                inwardLine: 'live_runtime_inward=stay_with_the_current_memory',
                authoritySummary: `${cleanRuntimeSelfLine} | ${cleanRuntimeRelationshipLine}`,
                sourceTags: ['live-runtime-memory-authority'],
              },
            },
          },
          agency: { habitPolicy: null },
          cognition: { privateThought: null },
          dialogue: { answerPlanner: null, conversationState: null, currentConsciousFrame: null },
          world: { worldModel: null },
        },
      },
    } as any)
    const serializedAuthority = JSON.stringify(authority)

    expect(authority?.selfLine).toBe('The current self is grounded in lived memory.')
    expect(authority?.sourceTags).toContain('autobiographical-self')
    expect(serializedAuthority).not.toContain(cleanRuntimeSelfLine)
    expect(serializedAuthority).not.toContain(cleanRuntimeRelationshipLine)
    expect(authority?.sourceTags).not.toContain('bundled-projection')
    expect(serializedAuthority).not.toContain(bundledProjectionLine)
  })

  it('fills missing authority summary from structured self and inward lines', () => {
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          perception: { updatedAt: 50, watchMode: 'ambient' },
          raw: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'self_continuity=current_runtime',
                inwardLine: 'inward_line=callback_review',
                authoritySummary: null,
                sourceTags: ['runtime-structured'],
              },
            },
          },
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'self_continuity=current_runtime',
                inwardLine: 'inward_line=callback_review',
                authoritySummary: null,
                sourceTags: ['runtime-structured'],
              },
            },
          },
          agency: { habitPolicy: null },
          cognition: { privateThought: null },
          dialogue: { answerPlanner: null, conversationState: null, currentConsciousFrame: null },
          world: { worldModel: null },
        },
      },
    } as any)

    expect(authority?.authoritySummary).toContain('self_continuity=current_runtime')
    expect(authority?.authoritySummary).toContain('inward_line=callback_review')
  })
})
