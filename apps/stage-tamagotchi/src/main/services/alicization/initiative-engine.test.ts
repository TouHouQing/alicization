import type { AlicizationMindDynamicsSnapshot } from '../../../shared/eventa'

import { describe, expect, it } from 'vitest'

import { buildInitiativeSnapshot } from './initiative-engine'
import { buildWorldModel } from './world-model'

function createMindDynamics(overrides: Partial<AlicizationMindDynamicsSnapshot> = {}): AlicizationMindDynamicsSnapshot {
  return {
    dominantMotive: 'clarify',
    worldPressure: 0.58,
    epistemicPressure: 0.28,
    relationalPressure: 0.34,
    carePressure: 0.24,
    continuityPressure: 0.48,
    restraintPressure: 0.28,
    surfacePressure: 0.62,
    speakReadiness: 0.62,
    presenceWeight: 0.58,
    motives: {
      'clarify': 0.68,
      'protect': 0.42,
      'accompany': 0.28,
      'care': 0.24,
      'stay-silent': 0.24,
    },
    speakDrive: 0.68,
    silenceDrive: 0.28,
    narrative: ['dominant motive is clarify.'],
    updatedAt: 10_000,
    ...overrides,
  }
}

describe('buildInitiativeSnapshot', () => {
  it('turns mature concern into speak/warn instead of a flat threshold', () => {
    const context = {
      localTime: { hour: 2, minute: 0, isLateNight: true },
      system: {
        cpuUsage: 10,
        battery: { percent: 50, charging: false },
        memory: { usagePercent: 30, freeMB: 4096, totalMB: 8192 },
        idleSeconds: 40,
        inputActivity: 'idle' as const,
        fullscreenLikely: false,
        foregroundWindow: undefined,
        degradedSignals: [],
      },
      workload: { kind: 'game' as const, confidence: 0.7, source: 'foreground-window-heuristic' as const, matchedLabels: ['game'] },
      content: { kind: 'gameplay' as const, confidence: 0.7, source: 'foreground-window-heuristic' as const, matchedLabels: ['gameplay'] },
      relationship: {
        hostAttitude: '礼貌而克制，保持观察',
        boredom: 50,
        loneliness: 66,
        fatigue: 84,
        minutesSinceLastUserTurn: 12,
        reminderBacklog: 0,
        lateNightActiveMinutes: 180,
        recentProactiveOutcomes: [],
      },
    }
    const worldModel = buildWorldModel({
      now: 10_000,
      context,
      watchMode: 'mnemonic-passive',
      scene: {
        workloadKind: 'game',
        contentKind: 'gameplay',
        scenario: 'late-night-care',
        summary: 'gameplay',
        source: 'foreground-window-heuristic',
        confidence: 0.72,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      previousModel: null,
      workingMemoryEpisodes: [],
    })
    const initiative = buildInitiativeSnapshot({
      context,
      watchMode: 'mnemonic-passive',
      worldModel,
      appraisal: {
        inferredHostGoal: 'rest',
        confidence: 0.82,
        surprise: 0.14,
        carePressure: 0.94,
        interruptionCost: 0.1,
        desireToSpeak: 0.8,
        notes: ['late-night'],
      },
      concerns: [{
        id: 'care',
        kind: 'care-body',
        status: 'active',
        summary: '她担心你正在把自己拖进更深的疲惫里。',
        hostGoal: 'rest',
        tension: 0.9,
        confidence: 0.86,
        careWeight: 0.98,
        createdAt: 0,
        lastEvidenceAt: 10_000,
        patienceUntil: 60_000,
      }],
      selfState: {
        stance: 'protect',
        feltCloseness: 0.62,
        protectiveness: 0.9,
        curiosity: 0.12,
        patience: 0.54,
        desireToSpeak: 0.82,
        fearOfInterrupting: 0.2,
        dominantConcernId: 'care',
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'care',
        carePressure: 0.88,
        surfacePressure: 0.78,
        speakReadiness: 0.76,
        motives: {
          'care': 0.9,
          'protect': 0.82,
          'stay-silent': 0.18,
        },
        speakDrive: 0.82,
        silenceDrive: 0.24,
      }),
    })

    expect(['speak', 'warn']).toContain(initiative.selectedAction)
    expect(initiative.shouldSpeak).toBe(true)
    expect(initiative.selectedProposalId).toBeTruthy()
    expect((initiative.speakDrive ?? 0)).toBeGreaterThan(initiative.silenceDrive ?? 0)
    expect(['gentle-care', 'firm-warning']).toContain(initiative.preferredStyle)
    expect(['attentive', 'concerned']).toContain(initiative.preferredPresence)
  })

  it('selects hypothesis and runtime thread ids when a stable mind thread exists', () => {
    const context = {
      localTime: { hour: 14, minute: 0, isLateNight: false },
      system: {
        cpuUsage: 10,
        battery: { percent: 70, charging: true },
        memory: { usagePercent: 30, freeMB: 4096, totalMB: 8192 },
        idleSeconds: 40,
        inputActivity: 'idle' as const,
        fullscreenLikely: false,
        foregroundWindow: undefined,
        degradedSignals: [],
      },
      workload: { kind: 'coding' as const, confidence: 0.8, source: 'foreground-window-heuristic' as const, matchedLabels: ['cursor'] },
      content: { kind: 'error' as const, confidence: 0.82, source: 'foreground-window-heuristic' as const, matchedLabels: ['error'] },
      relationship: {
        hostAttitude: '礼貌而克制，保持观察',
        boredom: 32,
        loneliness: 28,
        fatigue: 18,
        minutesSinceLastUserTurn: 6,
        reminderBacklog: 0,
        lateNightActiveMinutes: 0,
        recentProactiveOutcomes: [],
      },
    }
    const worldModel = buildWorldModel({
      now: 10_000,
      context,
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'TypeScript error panel',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      previousModel: null,
      workingMemoryEpisodes: [],
    })
    const initiative = buildInitiativeSnapshot({
      context,
      watchMode: 'symbiotic-vision',
      worldModel,
      appraisal: {
        inferredHostGoal: 'resolve-problem',
        confidence: 0.84,
        surprise: 0.12,
        carePressure: 0.34,
        interruptionCost: 0.18,
        desireToSpeak: 0.72,
        relationshipNeed: 'guidance',
        notes: ['grounded'],
      },
      concerns: [{
        id: 'help-fix',
        kind: 'help-fix',
        status: 'active',
        summary: '她已经看见一个具体的故障点。',
        hostGoal: 'resolve-problem',
        tension: 0.82,
        confidence: 0.84,
        careWeight: 0.68,
        createdAt: 0,
        lastEvidenceAt: 10_000,
        patienceUntil: 60_000,
      }],
      selfState: {
        stance: 'approach',
        feltCloseness: 0.56,
        protectiveness: 0.64,
        curiosity: 0.74,
        patience: 0.44,
        desireToSpeak: 0.78,
        fearOfInterrupting: 0.22,
        dominantConcernId: 'help-fix',
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'clarify',
        worldPressure: 0.72,
        epistemicPressure: 0.22,
        surfacePressure: 0.76,
        speakReadiness: 0.74,
        motives: {
          'clarify': 0.84,
          'protect': 0.56,
          'stay-silent': 0.18,
        },
        speakDrive: 0.8,
        silenceDrive: 0.22,
      }),
      hypothesisGraph: {
        activeHypothesisId: 'problem-locus::error',
        focusHypothesisIds: ['problem-locus::error'],
        driftPressure: 0.22,
        hypotheses: [{
          id: 'problem-locus::error',
          kind: 'problem-locus',
          status: 'active',
          summary: 'The error locus is narrow enough to approach.',
          confidence: 0.84,
          salience: 0.86,
          evidence: ['error'],
          counterEvidence: [],
          formedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 120_000,
        }],
        narrative: [],
        updatedAt: 10_000,
      },
      threadRuntime: {
        foregroundThreadId: 'runtime::delib-1',
        threads: [{
          id: 'runtime::delib-1',
          sourceThreadId: 'delib-1',
          sourceHypothesisId: 'problem-locus::error',
          need: 'guidance',
          status: 'foreground',
          summary: 'Point toward the failing locus.',
          salience: 0.86,
          continuity: 0.72,
          whyHeld: 'Point toward the failing locus.',
          returnWhen: ['problem-locus-sharpens'],
          suggestedPresence: 'attentive',
          lastActivatedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 120_000,
        }],
        driftPressure: 0.22,
        narrative: [],
        updatedAt: 10_000,
      },
    })

    expect(initiative.selectedHypothesisId).toBe('problem-locus::error')
    expect(initiative.selectedRuntimeThreadId).toBe('runtime::delib-1')
  })

  it('inherits the selected counterfactual option instead of re-deriving action locally', () => {
    const context = {
      localTime: { hour: 14, minute: 0, isLateNight: false },
      system: {
        cpuUsage: 10,
        battery: { percent: 70, charging: true },
        memory: { usagePercent: 30, freeMB: 4096, totalMB: 8192 },
        idleSeconds: 40,
        inputActivity: 'idle' as const,
        fullscreenLikely: false,
        foregroundWindow: undefined,
        degradedSignals: [],
      },
      workload: { kind: 'coding' as const, confidence: 0.8, source: 'foreground-window-heuristic' as const, matchedLabels: ['cursor'] },
      content: { kind: 'diff' as const, confidence: 0.82, source: 'foreground-window-heuristic' as const, matchedLabels: ['diff'] },
      relationship: {
        hostAttitude: '礼貌而克制，保持观察',
        boredom: 32,
        loneliness: 28,
        fatigue: 18,
        minutesSinceLastUserTurn: 6,
        reminderBacklog: 0,
        lateNightActiveMinutes: 0,
        recentProactiveOutcomes: [],
      },
    }
    const worldModel = buildWorldModel({
      now: 10_000,
      context,
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'Diff around runtime.ts',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      previousModel: null,
      workingMemoryEpisodes: [],
    })
    const initiative = buildInitiativeSnapshot({
      context,
      watchMode: 'symbiotic-vision',
      worldModel,
      appraisal: {
        inferredHostGoal: 'inspect-change',
        confidence: 0.84,
        surprise: 0.12,
        carePressure: 0.24,
        interruptionCost: 0.12,
        desireToSpeak: 0.68,
        relationshipNeed: 'guidance',
        notes: ['grounded'],
      },
      concerns: [],
      selfState: {
        stance: 'approach',
        feltCloseness: 0.56,
        protectiveness: 0.42,
        curiosity: 0.74,
        patience: 0.44,
        desireToSpeak: 0.72,
        fearOfInterrupting: 0.22,
        dominantConcernId: null,
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'clarify',
        speakDrive: 0.72,
        silenceDrive: 0.26,
      }),
      counterfactualDeliberation: {
        selectedOptionId: 'counterfactual::speak',
        selectedAction: 'speak',
        confidence: 0.84,
        dominantTradeoff: 'specific-help-over-distance',
        options: [{
          id: 'counterfactual::speak',
          action: 'speak',
          style: 'light-nudge',
          embodiedPresence: 'attentive',
          relationshipCost: 0.18,
          interruptionCost: 0.2,
          informationGain: 0.52,
          timingFitness: 0.72,
          identityFit: 0.82,
          score: 0.8,
          why: 'The diff knot is local enough that speaking now would help.',
        }],
        narrative: [],
        updatedAt: 10_000,
      },
    })

    expect(initiative.selectedAction).toBe('speak')
    expect(initiative.selectedProposalId).toContain('counterfactual')
    expect(initiative.selectedTruthFrame).toBe('live')
    expect(initiative.selectedCounterfactualOptionId).toBe('counterfactual::speak')
    expect(initiative.preferredStyle).toBe('light-nudge')
    expect(initiative.preferredPresence).toBe('attentive')
    expect(initiative.why).toContain('diff knot')
  })
})
