import { describe, expect, it } from 'vitest'

import { buildReflectionLedger } from './reflection-ledger'

describe('buildReflectionLedger', () => {
  it('records a helped reflection when regrounding succeeds', () => {
    const ledger = buildReflectionLedger({
      now: 40_000,
      worldModel: {
        activeThread: {
          id: 'thread::live',
          kind: 'debugging',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts',
          summary: 'The live runtime error is finally grounded.',
          confidence: 0.88,
          significance: 0.84,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 40_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'reacquired',
          sceneAgeMs: 2_000,
          attentionAgeMs: 2_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 40_000,
      },
      repairLedger: {
        governingRepairId: null,
        entries: [],
        repairPressure: 0.12,
        truthRisk: 0.08,
        shouldConstrainPresentTense: false,
        narrative: [],
        updatedAt: 40_000,
      },
      intentionStream: {
        dominantProjectId: 'project::repair',
        projects: [{
          id: 'project::repair',
          kind: 'repair-truth',
          status: 'active',
          title: 'repair',
          summary: 'Repair the stale scene before outward reply.',
          tension: 0.8,
          confidence: 0.82,
          continuityWeight: 0.74,
          speakAffinity: 0.06,
          sourceTags: ['repair-ledger'],
          formedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 60_000,
        }],
        carryPressure: 0.74,
        surfaceBias: 0.06,
        narrative: [],
        updatedAt: 10_000,
      },
      previousIntentionStream: {
        dominantProjectId: 'project::repair',
        projects: [{
          id: 'project::repair',
          kind: 'repair-truth',
          status: 'active',
          title: 'repair',
          summary: 'Repair the stale scene before outward reply.',
          tension: 0.8,
          confidence: 0.82,
          continuityWeight: 0.74,
          speakAffinity: 0.06,
          sourceTags: ['repair-ledger'],
          formedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 60_000,
        }],
        carryPressure: 0.74,
        surfaceBias: 0.06,
        narrative: [],
        updatedAt: 10_000,
      },
      previousAnswerPlanner: {
        act: 'ask-reground',
        evidenceMode: 'repair-first',
        confidence: 0.74,
        governingFocus: 'Repair the stale scene before outward reply.',
        openingMove: 'Reground first.',
        answerIntent: 'Keep truth ahead of fluency.',
        relationshipPosture: 'restrained',
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        mustDo: [],
        mustNotDo: [],
        narrative: [],
        updatedAt: 10_000,
      },
    })

    expect(ledger.latestEntryId).toBeTruthy()
    expect(ledger.entries[0]?.outcome).toBe('helped')
    expect(ledger.entries[0]?.revision).toBe('The live runtime error is finally grounded.')
  })

  it('records a missed reflection when stale-anchor repair still failed to land', () => {
    const ledger = buildReflectionLedger({
      now: 50_000,
      worldModel: {
        activeThread: {
          id: 'thread::carry',
          kind: 'change-review',
          status: 'lingering',
          source: 'continuity',
          title: 'old diff',
          summary: 'The old diff residue is still carrying forward.',
          confidence: 0.62,
          significance: 0.7,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 50_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: ['Stale diff anchor still active'],
        },
        continuity: {
          label: 'afterglow',
          sceneAgeMs: 4_000,
          attentionAgeMs: 4_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'moderate',
        },
        updatedAt: 50_000,
      },
      repairLedger: {
        governingRepairId: 'repair::stale',
        entries: [{
          id: 'repair::stale',
          kind: 'stale-scene-anchor',
          status: 'open',
          summary: 'Old scene residue is still overriding the live seam.',
          rationale: 'Continuity is still outrunning live sight.',
          urgency: 0.86,
          confidence: 0.82,
          createdAt: 10_000,
          lastUpdatedAt: 50_000,
          expiresAt: 120_000,
        }],
        repairPressure: 0.84,
        truthRisk: 0.88,
        shouldConstrainPresentTense: true,
        narrative: [],
        updatedAt: 50_000,
      },
      previousIntentionStream: {
        dominantProjectId: 'project::repair',
        projects: [{
          id: 'project::repair',
          kind: 'repair-truth',
          status: 'active',
          title: 'repair',
          summary: 'Correct the stale scene anchor.',
          tension: 0.82,
          confidence: 0.82,
          continuityWeight: 0.76,
          speakAffinity: 0.06,
          sourceTags: ['repair-ledger'],
          formedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 70_000,
        }],
        carryPressure: 0.76,
        surfaceBias: 0.06,
        narrative: [],
        updatedAt: 10_000,
      },
      previousAnswerPlanner: {
        act: 'correct-stale-anchor',
        evidenceMode: 'continuity-carry',
        confidence: 0.7,
        governingFocus: 'Correct the stale scene anchor.',
        openingMove: 'Correct the stale anchor.',
        answerIntent: 'Repair stale continuity.',
        relationshipPosture: 'restrained',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: true,
        mustDo: [],
        mustNotDo: [],
        narrative: [],
        updatedAt: 10_000,
      },
    })

    expect(ledger.entries[0]?.outcome).toBe('missed')
    expect(ledger.entries[0]?.revision).toBe('Old scene residue is still overriding the live seam.')
    expect(ledger.revisionPressure).toBeGreaterThan(0)
  })

  it('keeps persisted reflections alive so revision pressure survives beyond a single turn', () => {
    const ledger = buildReflectionLedger({
      now: 60_000,
      persistedEntries: [{
        id: 'reflection::persisted',
        summary: 'A prior approach crowded the host while the window was closed.',
        expectation: 'Space should come before closeness in closed windows.',
        observedOutcome: 'Pressure rose faster than trust.',
        outcome: 'missed',
        revision: 'Remember the boundary lesson even when the current turn has not produced a new reflection yet.',
        confidenceShift: 0.18,
        createdAt: 56_000,
      }],
      previous: null,
    })

    expect(ledger.latestEntryId).toBe('reflection::persisted')
    expect(ledger.entries[0]?.revision).toContain('boundary lesson')
    expect(ledger.revisionPressure).toBeGreaterThan(0.2)
  })

  it('does not let a newer released reflection outrank an older still-active persisted reflection', () => {
    const ledger = buildReflectionLedger({
      now: 90_000,
      persistedEntries: [
        {
          id: 'reflection::temporary-noise',
          summary: 'A temporary anxious wobble was already released instead of staying as the governing line.',
          expectation: 'Released noise should not keep steering the next answer.',
          observedOutcome: 'The wobble has already been narratively let go.',
          outcome: 'released',
          revision: 'Do not keep the temporary-noise reading as the active memory line now.',
          confidenceShift: 0.04,
          createdAt: 88_000,
        },
        {
          id: 'reflection::same-her-repair',
          summary: 'The steadier same-her repair line is still the meaningful carry for this thread.',
          expectation: 'Relationship repair should stay active until a newer meaningful reflection replaces it.',
          observedOutcome: 'The digital-life continuity line is still the living repair thread.',
          outcome: 'missed',
          revision: 'Keep the same-her repair lesson active instead of letting released noise become the latest carry.',
          confidenceShift: -0.08,
          createdAt: 84_000,
        },
      ],
      previous: null,
    })

    expect(ledger.latestEntryId).toBe('reflection::same-her-repair')
    expect(ledger.entries.find(entry => entry.id === 'reflection::temporary-noise')?.outcome).toBe('released')
    expect(ledger.entries.find(entry => entry.id === ledger.latestEntryId)?.revision).toContain('same-her repair lesson')
  })
})
