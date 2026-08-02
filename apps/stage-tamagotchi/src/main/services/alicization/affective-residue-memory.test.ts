import { describe, expect, it } from 'vitest'

import { buildAlicizationAffectiveResidueMemory } from './affective-residue-memory'

describe('affective residue memory', () => {
  it('turns relationship outcomes and continuity signals into residue/cadence memory without visible wording templates', () => {
    const residue = buildAlicizationAffectiveResidueMemory({
      now: 1_700_000_000_000,
      recentRelationshipOutcomes: [{
        id: 'relationship-outcome-1',
        cardId: 'default',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        outcomeKind: 'repair',
        closenessDelta: 0.12,
        trustDelta: 0.22,
        burdenDelta: 0.64,
        repairDelta: 0.7,
        misreadDelta: -0.24,
        boundaryDelta: -0.18,
        openLoopDelta: 0.1,
        summary: 'Repair landed, but the host was tired and needed less pressure.',
        sourceSignals: ['repair before closeness', 'host tired'],
        createdAt: 1_700_000_000_000,
      } as any],
      recentMemoryReflections: [{
        id: 'reflection-1',
        cardId: 'default',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        targetScope: 'relationship',
        sourceKind: 'relationship-outcome',
        status: 'confirmed',
        summary: 'Repair should stay low-pressure because burden is active.',
        lesson: 'Protect rest before reopening warmth.',
        sourceSignals: ['burden', 'repair'],
        confidence: 0.86,
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_000_000,
      } as any],
      personStateEvolutionSummary: {
        latestDoctrine: 'Repair before closeness returns.',
        latestBurdenLine: 'The host is easier to crowd right now.',
        latestTrustMeaning: 'Trust rises when pressure stays low.',
        repairShift: 0.74,
        burdenShift: 0.66,
        trustShift: 0.36,
        recentSummaries: ['Repair is still active and warmth must wait.'],
      } as any,
      personalityContinuityState: {
        currentRegime: 'late-night-care',
        repairPosture: 'repair-first',
        energyProfile: 'rest-sensitive',
        autonomyPosture: 'protect-space',
        trustStage: 'warming',
        closenessPosture: 'measured-room',
        rhythmState: {
          cadenceMode: 'cooldown',
          restMode: 'rest-protective',
          moodLabel: 'afterglow',
          memoryResonance: 0.42,
          summary: 'cooldown with rest protection',
          rationale: ['Protect rest before warmth.'],
        },
      } as any,
      hostPersonModel: {
        summary: 'The host trusts low-pressure repair.',
        routines: [],
        sensitivities: [],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'Trust rises when pressure stays low.',
        },
        preferredClosenessByContext: [],
        recurrentBurdens: ['The host is easier to crowd right now.'],
        narrative: [],
        updatedAt: 1_700_000_000_000,
      },
    })

    expect(residue.version).toBe('affective-residue-memory-v1')
    expect(residue.residues.map(item => item.kind)).toEqual(expect.arrayContaining([
      'repair',
      'burden',
      'rest-protective',
      'trust',
    ]))
    expect(residue.relationshipCadence.cadenceMode).toBe('cooldown')
    expect(residue.relationshipCadence.shouldProtectRest).toBe(true)
    expect(residue.relationshipCadence.shouldDelayWarmth).toBe(true)
    expect(residue.summary).not.toMatch(/我会一直在|慢慢来|先抱抱/u)
  })

  it('does not infer relationship cadence from strategy wording in free text', () => {
    const residue = buildAlicizationAffectiveResidueMemory({
      now: 1_700_000_100_000,
      recentRelationshipOutcomes: [{
        id: 'relationship-outcome-proactive-dismissed-1',
        cardId: 'default',
        decisionTraceId: 'trace-proactive-dismissed-1',
        turnId: 'turn-proactive-dismissed-1',
        sessionId: 'session-proactive-dismissed-1',
        outcomeKind: 'boundary',
        closenessDelta: 0,
        trustDelta: 0,
        burdenDelta: 0,
        repairDelta: 0,
        misreadDelta: 0,
        boundaryDelta: 0,
        openLoopDelta: 0,
        summary: 'A proactive coding approach was actively rejected and likely crossed a boundary, so future follow-ups should give more space, stay lower-pressure, less eager, and wait for a clearer opening before reopening this line.',
        sourceSignals: ['lower-pressure', 'clearer opening', 'less eager'],
        createdAt: 1_700_000_100_000,
      } as any],
      recentMemoryReflections: [{
        id: 'reflection-proactive-dismissed-1',
        cardId: 'default',
        decisionTraceId: 'trace-proactive-dismissed-1',
        turnId: 'turn-proactive-dismissed-1',
        targetScope: 'boundary',
        sourceKind: 'relationship-outcome',
        status: 'confirmed',
        summary: 'Dismissed proactive cues mean future follow-up timing should give more space, go lower-pressure, and wait for a clearer opening.',
        lesson: 'Keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.',
        sourceSignals: ['initiative strategy', 'clearer opening'],
        confidence: 0.9,
        createdAt: 1_700_000_100_000,
        updatedAt: 1_700_000_100_000,
      } as any],
      personStateEvolutionSummary: {
        latestDoctrine: 'Keep future follow-ups lower-pressure, less eager, and wait for a clearer opening.',
        latestBurdenLine: null,
        latestTrustMeaning: null,
        repairShift: 0,
        burdenShift: 0,
        trustShift: 0,
        recentSummaries: ['The reopening rhythm should cool down and reopen more carefully next time.'],
      } as any,
    })

    expect(residue.relationshipCadence.cadenceMode).toBe('ready-return')
    expect(residue.relationshipCadence.shouldDelayWarmth).toBe(false)
    expect(residue.relationshipCadence.reasonTags).not.toContain('initiative-cautious-carry')
    expect(residue.relationshipCadence.reasonTags).not.toContain('initiative-memory-led-carry')
  })
})
