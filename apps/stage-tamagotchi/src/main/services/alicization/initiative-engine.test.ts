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
    narrative: ['The current scene calls for a grounded answer.'],
    updatedAt: 10_000,
    ...overrides,
  }
}

function createInitiativeInput(why: string) {
  const context = {
    localTime: { hour: 16, minute: 0, isLateNight: false },
    system: {
      cpuUsage: 18,
      battery: { percent: 76, charging: true },
      memory: { usagePercent: 34, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 120,
      inputActivity: 'active' as const,
      fullscreenLikely: false,
      foregroundWindow: undefined,
      degradedSignals: [],
    },
    workload: { kind: 'coding' as const, confidence: 0.84, source: 'foreground-window-heuristic' as const, matchedLabels: ['editor'] },
    content: { kind: 'doc' as const, confidence: 0.7, source: 'foreground-window-heuristic' as const, matchedLabels: ['notes'] },
    relationship: {
      hostAttitude: 'The host is working on the current error.',
      boredom: 24,
      loneliness: 36,
      fatigue: 22,
      minutesSinceLastUserTurn: 10,
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
      contentKind: 'doc',
      scenario: 'coding',
      summary: 'The current editor contains the live error under discussion.',
      source: 'screen-semantic-summary',
      confidence: 0.8,
      beganAt: 0,
      lastSeenAt: 10_000,
    },
    attention: null,
    recentTransition: null,
    durabilityPulse: null,
    previousModel: null,
    workingMemoryEpisodes: [],
  })

  return {
    context,
    watchMode: 'symbiotic-vision' as const,
    worldModel,
    appraisal: {
      inferredHostGoal: 'resolve-problem',
      confidence: 0.78,
      surprise: 0.08,
      carePressure: 0.18,
      interruptionCost: 0.12,
      desireToSpeak: 0.82,
      relationshipNeed: 'guidance',
      notes: [],
    },
    concerns: [],
    selfState: {
      stance: 'approach' as const,
      feltCloseness: 0.58,
      protectiveness: 0.34,
      curiosity: 0.72,
      patience: 0.64,
      desireToSpeak: 0.82,
      fearOfInterrupting: 0.18,
    },
    mindDynamics: createMindDynamics(),
    initiativeArbitration: {
      selectedProposalId: 'proposal::current',
      dominantConflict: 'none',
      proposals: [{
        id: 'proposal::current',
        source: 'counterfactual',
        truthFrame: 'live',
        action: 'speak',
        style: 'light-nudge',
        embodiedPresence: 'attentive',
        truthCost: 0.04,
        interruptionCost: 0.08,
        relationshipCost: 0.04,
        continuityGain: 0.1,
        preferenceGain: 0,
        confidence: 0.84,
        score: 0.88,
        shouldSpeak: true,
        shouldSurface: true,
        why,
      }],
      updatedAt: 10_000,
    },
  } as any
}

function createLongHorizonMemory(overrides: Record<string, unknown> = {}) {
  return {
    preferenceBias: {
      companionship: 0.2,
      truthfulGrounding: 0.2,
      gentleRepair: 0.2,
      quietObservation: 0.2,
      proactiveCare: 0.2,
      playfulIntimacy: 0.2,
      autonomyRespect: 0.2,
      unfinishedThreadReturn: 0.2,
    },
    identityBias: {
      guardedness: 0.2,
      tenderness: 0.2,
      directness: 0.2,
      selfDirection: 0.2,
    },
    anchorFacts: [],
    summary: 'A remembered scene remains available for semantic recall.',
    dominantCueSummary: 'The user preferred a concise explanation.',
    rememberedPreferenceSummary: null,
    rememberedConstraintSummary: null,
    rememberedPlanSummary: null,
    updatedAt: 10_000,
    ...overrides,
  }
}

describe('buildInitiativeSnapshot', () => {
  it('keeps a transparent Provider failure as the initiative reason', () => {
    const initiative = buildInitiativeSnapshot(createInitiativeInput(
      'Embedding provider failed with HTTP 400: invalid parameter.',
    ))

    expect(initiative.why).toBe('Embedding provider failed with HTTP 400: invalid parameter.')
  })

  it('keeps a live event sentence authored by the active proposal', () => {
    const initiative = buildInitiativeSnapshot(createInitiativeInput(
      'The editor reports TS2322 in runtime.ts after the latest edit.',
    ))

    expect(initiative.why).toBe('The editor reports TS2322 in runtime.ts after the latest edit.')
    expect(initiative.selectedProposalId).toBe('proposal::current')
    expect(initiative.selectedAction).toBe('speak')
    expect(initiative.shouldSpeak).toBe(true)
  })

  it('does not infer initiative policy from free-form long-term memory prose', () => {
    const input = createInitiativeInput('The current error has enough evidence for a direct answer.')
    input.longHorizonMemory = createLongHorizonMemory({
      summary: 'This is narrative memory content without a typed initiative decision.',
      dominantCueSummary: 'The remembered event should remain context, not policy.',
    })

    const initiative = buildInitiativeSnapshot(input)

    expect(initiative.continuityRestraint).toBeNull()
    expect(initiative.selectedAction).toBe('speak')
    expect(initiative.shouldSpeak).toBe(true)
  })

  it('uses numeric long-term preference state without copying memory prose into why', () => {
    const input = createInitiativeInput('The current error has enough evidence for a direct answer.')
    input.longHorizonMemory = createLongHorizonMemory({
      preferenceBias: {
        companionship: 0.4,
        truthfulGrounding: 0.7,
        gentleRepair: 0.5,
        quietObservation: 0.88,
        proactiveCare: 0.4,
        playfulIntimacy: 0.2,
        autonomyRespect: 0.9,
        unfinishedThreadReturn: 0.5,
      },
      summary: 'A remembered scene remains available for semantic recall.',
    })

    const initiative = buildInitiativeSnapshot(input)

    expect(initiative.continuityRestraint).toBe('lower-pressure')
    expect(initiative.selectedAction).toBe('hover')
    expect(initiative.shouldSpeak).toBe(false)
    expect(initiative.why).toBe('The current error has enough evidence for a direct answer.')
  })

  it('uses the emotional kernel enum as the initiative restraint authority', () => {
    const input = createInitiativeInput('The current scene is understood.')
    input.emotionalKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'observe',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'measured-return',
      valence: 0.4,
      arousal: 0.24,
      guardedness: 0.3,
      closenessDrive: 0.44,
      repairNeed: 0.2,
      initiativePressure: 0.18,
      reasonTags: [],
      why: '',
    }

    const initiative = buildInitiativeSnapshot(input)

    expect(initiative.continuityRestraint).toBe('measured-return')
    expect(initiative.selectedAction).toBe('hover')
    expect(initiative.preferredStyle).toBe('silent-observe')
    expect(initiative.shouldSpeak).toBe(false)
  })

  it('uses typed affective cadence instead of matching cadence prose', () => {
    const input = createInitiativeInput('The current scene is understood.')
    input.affectiveResidue = {
      version: 'affective-residue-memory-v1',
      updatedAt: 10_000,
      residues: [],
      dominantResidueKind: 'afterglow',
      afterglowPressure: 0.5,
      repairPressure: 0.1,
      burdenPressure: 0.1,
      trustPressure: 0.4,
      restProtectivePressure: 0.1,
      relationshipCadence: {
        cadenceMode: 'measured-return',
        distancePosture: 'measured-room',
        companionshipDensity: 0.4,
        repairRecovery: 0.2,
        overreachRisk: 0.6,
        fatigueGuard: 0.2,
        afterglowCarry: 0.5,
        shouldDelayWarmth: true,
        shouldProtectRest: false,
        reasonTags: [],
        summary: 'Free-form cadence description.',
      },
      sourceSignals: [],
      summary: 'Free-form residue description.',
    }

    const initiative = buildInitiativeSnapshot(input)

    expect(initiative.continuityRestraint).toBe('measured-return')
    expect(initiative.selectedAction).toBe('hover')
    expect(initiative.shouldSpeak).toBe(false)
  })

  it('uses explicit late-night tension as rest protection', () => {
    const input = createInitiativeInput('The current scene is understood.')
    input.privateThought = {
      stance: 'observe',
      confidence: 0.78,
      rationaleTags: [],
      thoughtText: 'The user looks tired.',
      shouldSpeak: false,
      suggestedStyle: 'silent-observe',
      embodiedPresence: 'concerned',
      expiresAt: 60_000,
      afterglowFromScenario: null,
      emotionalTension: 'late-night-drain',
    }

    const initiative = buildInitiativeSnapshot(input)

    expect(initiative.continuityRestraint).toBe('rest-protective')
    expect(initiative.selectedAction).toBe('hover')
    expect(initiative.preferredPresence).toBe('concerned')
    expect(initiative.shouldSpeak).toBe(false)
  })
})
