import { describe, expect, it } from 'vitest'

import {
  buildSelfContinuityAuthority,
} from './self-continuity-authority'

function createLongHorizonMemory(overrides: Record<string, unknown> = {}) {
  return {
    preferenceBias: {
      companionship: 0.6,
      truthfulGrounding: 0.7,
      gentleRepair: 0.6,
      quietObservation: 0.5,
      proactiveCare: 0.5,
      playfulIntimacy: 0.2,
      autonomyRespect: 0.7,
      unfinishedThreadReturn: 0.6,
    },
    identityBias: {
      guardedness: 0.2,
      tenderness: 0.6,
      directness: 0.6,
      selfDirection: 0.6,
    },
    anchorFacts: [],
    summary: '',
    dominantCueSummary: 'The user prefers concise explanations while coding.',
    rememberedPreferenceSummary: 'Keep technical explanations concise.',
    rememberedConstraintSummary: 'Do not interrupt focused work without a concrete reason.',
    rememberedPlanSummary: 'Return to the failing test after the next break.',
    updatedAt: 10_000,
    ...overrides,
  }
}

describe('self continuity authority', () => {
  it('assembles authority from the real self, relationship, motive, and inward owners', () => {
    const authority = buildSelfContinuityAuthority({
      autobiographicalSelf: {
        identityNarrative: 'I value honest, grounded answers.',
        relationshipDoctrine: 'Respect the user pace while staying attentive.',
        latestInflection: 'Admitting uncertainty improved trust.',
        activeGoals: [{
          id: 'goal-1',
          kind: 'preserve-trust',
          status: 'active',
          weight: 0.8,
          summary: 'Keep trust aligned with evidence.',
          sourceTags: ['reflection'],
          createdAt: 0,
          updatedAt: 1,
        }],
        behaviorSignatures: [],
        stability: 0.8,
        updatedAt: 1,
      } as any,
      longHorizonMemory: createLongHorizonMemory() as any,
      motiveEngine: {
        rulingDrive: 'truth-discipline',
        returnPressure: 0.6,
        drives: {
          companionship: 0.5,
          boundaryRespect: 0.6,
          truthDiscipline: 0.8,
          restProtection: 0.3,
          unfinishedThreadReturn: 0.6,
          selfDirection: 0.6,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          kind: 'preserve-trust',
          status: 'foreground',
          weight: 0.8,
          summary: 'Explain what the evidence supports.',
          sourceTags: [],
          targetGoalKind: 'clarify-scene',
          createdAt: 0,
          updatedAt: 1,
        }],
        longTermGoals: [],
        narrative: [],
        updatedAt: 1,
      } as any,
      habitPolicy: {
        dominantMode: 'repair-before-fluency',
        requiresGroundingBeforeSurface: true,
        prefersQuietCompanionship: false,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
        suggestedStyleCap: 'light-nudge',
        suggestedPresenceCap: 'attentive',
        narrative: ['Check the current evidence before making the next claim.'],
        updatedAt: 1,
      } as any,
      privateThought: {
        stance: 'accompany',
        thoughtText: 'The useful next step is to inspect the failing branch.',
      } as any,
      mindEcology: {
        moodLabel: 'focused',
        relationshipHabit: 'warm-guidance',
        selfNarrative: 'I am focused on the evidence in front of us.',
        relationNarrative: 'The user wants a direct technical partner.',
        currentPreoccupation: 'Find the exact cause of the failure.',
      } as any,
    })

    expect(authority?.selfLine).toBe('I value honest, grounded answers.')
    expect(authority?.relationshipLine).toBe('Respect the user pace while staying attentive.')
    expect(authority?.motiveLine).toBe('Explain what the evidence supports.')
    expect(authority?.habitLine).toBeNull()
    expect(authority?.authoritySummary).not.toContain('Check the current evidence before making the next claim.')
    expect(authority?.inwardLine).toContain('The useful next step is to inspect the failing branch.')
    expect(authority?.sourceTags).toEqual(expect.arrayContaining([
      'autobiographical-self',
      'long-horizon-plan',
      'long-horizon-constraint',
      'motive:truth-discipline',
      'habit:repair-before-fluency',
    ]))
  })

  it('does not manufacture self authority from habit policy alone', () => {
    const authority = buildSelfContinuityAuthority({
      habitPolicy: {
        dominantMode: 'protect-rest-window',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: true,
        blocksDirectSpeakWhenBusy: true,
        protectsRestWindow: true,
        returnViaRecheck: true,
        suggestedStyleCap: 'silent-observe',
        suggestedPresenceCap: 'glance',
        narrative: [
          'habit_pressure=protect_rest_window; exchange_expansion=defer',
          'Current habit gate leans protect-rest-window.',
        ],
        updatedAt: 1,
      } as any,
    })

    expect(authority).toBeNull()
  })

  it('does not manufacture self authority from long-term memory alone', () => {
    const authority = buildSelfContinuityAuthority({
      longHorizonMemory: createLongHorizonMemory({
        summary: 'A remembered event remains available for recall.',
        dominantCueSummary: 'A free-form memory sentence.',
      }) as any,
    })

    expect(authority).toBeNull()
  })

  it('uses the latest non-released reflection as inward evidence', () => {
    const authority = buildSelfContinuityAuthority({
      autobiographicalSelf: {
        identityNarrative: 'I prefer evidence over confidence theater.',
        relationshipDoctrine: 'Be direct when the cause is known.',
        activeGoals: [],
        behaviorSignatures: [],
        stability: 0.8,
        updatedAt: 1,
      } as any,
      reflectionLedger: {
        latestEntryId: 'released',
        entries: [
          {
            id: 'released',
            summary: 'A temporary interpretation was released.',
            expectation: '',
            observedOutcome: '',
            outcome: 'released',
            revision: 'Ignore this released revision.',
            confidenceShift: 0,
            createdAt: 2,
          },
          {
            id: 'active',
            summary: 'The previous answer skipped evidence.',
            expectation: '',
            observedOutcome: '',
            outcome: 'missed',
            revision: 'State the evidence before the conclusion.',
            confidenceShift: -0.1,
            createdAt: 1,
          },
        ],
        revisionPressure: 0.3,
        narrative: [],
        updatedAt: 2,
      } as any,
    })

    expect(authority?.inwardLine).toContain('State the evidence before the conclusion.')
    expect(authority?.inwardLine).not.toContain('Ignore this released revision.')
  })

  it('keeps long-term memory subordinate to an existing self owner', () => {
    const authority = buildSelfContinuityAuthority({
      autobiographicalSelf: {
        identityNarrative: 'I answer from the evidence I actually have.',
        relationshipDoctrine: 'Respect the user focus.',
        activeGoals: [],
        behaviorSignatures: [],
        stability: 0.8,
        updatedAt: 1,
      } as any,
      longHorizonMemory: createLongHorizonMemory() as any,
    })

    expect(authority?.selfLine).toBe('I answer from the evidence I actually have.')
    expect(authority?.inwardLine).toContain('The user prefers concise explanations while coding.')
    expect(authority?.authoritySummary).toContain('I answer from the evidence I actually have.')
  })
})
