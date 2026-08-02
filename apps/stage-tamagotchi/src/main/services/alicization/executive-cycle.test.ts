import { describe, expect, it } from 'vitest'

import { buildExecutiveCycle } from './executive-cycle'

describe('buildExecutiveCycle', () => {
  it('does not invent an inner narrative when no runtime fact supplies one', () => {
    const cycle = buildExecutiveCycle({
      now: 1_000,
    })

    expect(cycle.currentLine).toBe('')
    expect(cycle.narrative).not.toContain('Hold the living seam until the next move earns itself.')
  })

  it('enters reflecting when a fresh negative reflection is still active', () => {
    const cycle = buildExecutiveCycle({
      now: 20_000,
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
          lastUpdatedAt: 20_000,
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
          staleRisks: [],
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
        updatedAt: 20_000,
      },
      repairLedger: {
        governingRepairId: 'repair::stale',
        entries: [{
          id: 'repair::stale',
          kind: 'stale-scene-anchor',
          status: 'open',
          summary: 'Old scene residue is still overriding the live seam.',
          rationale: 'Continuity is outrunning grounding.',
          urgency: 0.86,
          confidence: 0.8,
          createdAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 120_000,
        }],
        repairPressure: 0.84,
        truthRisk: 0.88,
        shouldConstrainPresentTense: true,
        narrative: [],
        updatedAt: 20_000,
      },
      intentionStream: {
        dominantProjectId: 'project::repair',
        projects: [{
          id: 'project::repair',
          kind: 'repair-truth',
          status: 'active',
          title: 'repair',
          summary: 'Repair the stale scene anchor.',
          tension: 0.82,
          confidence: 0.8,
          continuityWeight: 0.74,
          speakAffinity: 0.06,
          sourceTags: ['repair-ledger'],
          formedAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 120_000,
        }],
        carryPressure: 0.74,
        surfaceBias: 0.06,
        narrative: [],
        updatedAt: 20_000,
      },
      reflectionLedger: {
        latestEntryId: 'reflection::missed',
        entries: [{
          id: 'reflection::missed',
          targetProjectId: 'project::repair',
          summary: 'Stale anchor repair still missed.',
          expectation: 'Repair should reduce truth risk.',
          observedOutcome: 'Truth risk is still high.',
          outcome: 'missed',
          revision: 'Keep truth repair ahead of fluency.',
          confidenceShift: -0.1,
          createdAt: 19_000,
        }],
        revisionPressure: 0.22,
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(cycle.phase).toBe('reflecting')
    expect(cycle.shouldReflect).toBe(true)
    expect(cycle.shouldAct).toBe(false)
  })

  it('does not let a released temporary-noise reflection suppress a still-active reflecting phase', () => {
    const cycle = buildExecutiveCycle({
      now: 20_000,
      worldModel: {
        activeThread: {
          id: 'thread::carry',
          kind: 'change-review',
          status: 'lingering',
          source: 'continuity',
          title: 'continuity repair carry',
          summary: 'The continuity repair line is still carrying forward.',
          confidence: 0.62,
          significance: 0.7,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 20_000,
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
          staleRisks: [],
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
        updatedAt: 20_000,
      },
      reflectionLedger: {
        latestEntryId: 'reflection::temporary-noise',
        entries: [
          {
            id: 'reflection::temporary-noise',
            summary: 'A temporary anxious wobble was already released.',
            expectation: 'Released noise should not keep steering the executive cycle.',
            observedOutcome: 'The wobble has already been let go.',
            outcome: 'released',
            revision: 'Do not reopen from the temporary wobble.',
            confidenceShift: 0.04,
            createdAt: 19_500,
          },
          {
            id: 'reflection::missed',
            targetProjectId: 'project::repair',
            summary: 'The unresolved repair still needs another pass.',
            expectation: 'Repair should reduce truth risk.',
            observedOutcome: 'Truth risk is still high.',
            outcome: 'missed',
            revision: 'Keep the continuity repair line active before fluency.',
            confidenceShift: -0.1,
            createdAt: 19_000,
          },
        ],
        revisionPressure: 0.22,
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(cycle.phase).toBe('reflecting')
    expect(cycle.shouldReflect).toBe(true)
    expect(cycle.activeReflectionId).toBe('reflection::missed')
    expect(cycle.currentLine).toContain('continuity repair line active')
    expect(cycle.currentLine).not.toContain('temporary wobble')
  })

  it('enters acting when a grounded project is ready to surface', () => {
    const cycle = buildExecutiveCycle({
      now: 30_000,
      worldModel: {
        activeThread: {
          id: 'thread::live',
          kind: 'debugging',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts',
          summary: 'The current runtime knot is grounded and actionable.',
          confidence: 0.9,
          significance: 0.84,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
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
          label: 'staying-with-thread',
          sceneAgeMs: 10_000,
          attentionAgeMs: 10_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'moderate',
        },
        updatedAt: 30_000,
      },
      repairLedger: {
        governingRepairId: null,
        entries: [],
        repairPressure: 0.1,
        truthRisk: 0.08,
        shouldConstrainPresentTense: false,
        narrative: [],
        updatedAt: 30_000,
      },
      intentionStream: {
        dominantProjectId: 'project::hold',
        projects: [{
          id: 'project::hold',
          kind: 'hold-knot',
          status: 'active',
          title: 'hold',
          summary: 'Keep the grounded debug knot in hand and surface it naturally.',
          tension: 0.76,
          confidence: 0.84,
          continuityWeight: 0.72,
          speakAffinity: 0.74,
          sourceTags: ['concern-continuity'],
          targetThreadId: 'thread::live',
          formedAt: 0,
          lastUpdatedAt: 30_000,
          expiresAt: 120_000,
        }],
        carryPressure: 0.72,
        surfaceBias: 0.74,
        narrative: [],
        updatedAt: 30_000,
      },
      reflectionLedger: {
        latestEntryId: null,
        entries: [],
        revisionPressure: 0,
        narrative: [],
        updatedAt: 30_000,
      },
    })

    expect(cycle.phase).toBe('acting')
    expect(cycle.shouldAct).toBe(true)
    expect(cycle.actionReadiness).toBeGreaterThan(0.6)
  })
})
