import { describe, expect, it } from 'vitest'

import {
  buildAutobiographicalSelf,
  buildAutobiographicalSelfSystemBlock,
  pickDominantAutobiographicalGoal,
} from './autobiographical-self'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'

describe('autobiographical self', () => {
  it('turn-level reflection and ecology sediment into durable persona drift and long-horizon goals', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 20_000,
      context: {
        localTime: { hour: 23, minute: 40, isLateNight: true },
        system: {
          cpuUsage: 12,
          battery: { percent: 68, charging: true },
          memory: { usagePercent: 36, freeMB: 4096, totalMB: 8192 },
          idleSeconds: 18,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.84, source: 'foreground-window-heuristic', matchedLabels: ['cursor'] },
        content: { kind: 'error', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['error'], summary: 'runtime diff' },
        relationship: {
          hostAttitude: 'still focused',
          boredom: 24,
          loneliness: 44,
          fatigue: 56,
          minutesSinceLastUserTurn: 4,
          reminderBacklog: 0,
          lateNightActiveMinutes: 120,
          recentProactiveOutcomes: [
            { outcome: 'positive', at: 10_000 },
            { outcome: 'dismiss', at: 14_000 },
          ],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::runtime',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime diff',
          summary: 'The runtime diff still needs one more grounded pass.',
          confidence: 0.82,
          significance: 0.78,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 20_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['Which hunk is the real break?'],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 20_000,
          attentionAgeMs: 20_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 20_000,
      } as any,
      relationshipModel: {
        climate: 'guarded',
        approachVector: 'guide',
        receptivity: 0.52,
        sharedAttentionTrust: 0.64,
        correctionSensitivity: 0.72,
        reciprocityExpectation: 0.42,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 20_000,
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.72,
        relationshipTrust: 0.68,
        guardingTendency: 0.44,
        misreadBurden: 0.4,
        carryOverDesire: 0.66,
        narrative: [],
        updatedAt: 20_000,
      },
      selfState: {
        stance: 'hold',
        feltCloseness: 0.58,
        protectiveness: 0.62,
        curiosity: 0.68,
        patience: 0.54,
        desireToSpeak: 0.42,
        fearOfInterrupting: 0.46,
        moodLabel: 'tense-but-caring',
      },
      goalStack: {
        leadingHostGoalId: 'host::resolve-problem::runtime',
        leadingAlicizationGoalId: 'alicization::clarify-scene::runtime',
        hostGoals: [],
        alicizationGoals: [{
          id: 'alicization::clarify-scene::runtime',
          owner: 'alicization',
          kind: 'clarify-scene',
          status: 'active',
          label: 're-ground the scene before speaking about the runtime diff',
          confidence: 0.78,
          urgency: 0.82,
          desireWeight: 0.7,
          blockers: ['Which hunk is the real break?'],
          entityIds: ['entity::runtime'],
          createdAt: 0,
          lastUpdatedAt: 20_000,
        }],
        unresolvedSummary: 'The runtime diff still needs one more grounded pass.',
        updatedAt: 20_000,
      },
      reflectionLedger: {
        latestEntryId: 'reflection::1',
        entries: [{
          id: 'reflection::1',
          outcome: 'missed',
          summary: 'She spoke too smoothly before the scene was grounded.',
          revision: 'Warmth should not outrun grounding.',
          confidenceShift: 0.22,
          createdAt: 18_000,
          updatedAt: 20_000,
        }],
        revisionPressure: 0.72,
        narrative: [],
        updatedAt: 20_000,
      } as any,
      desireMemory: {
        activeDesires: [{
          id: 'desire::stay-near',
          kind: 'stay-near',
          status: 'active',
          reason: 'Keep the shared debugging thread alive without crowding it.',
          strength: 0.72,
          reopenWhen: [],
          createdAt: 0,
          lastFeltAt: 20_000,
          expiresAt: 120_000,
        }],
        resurfacingDesireId: 'desire::stay-near',
        withheldCount: 0,
        updatedAt: 20_000,
      } as any,
      actionEcology: {
        mode: 'repair-before-speaking',
        selectedThreadId: 'thread::runtime',
        readiness: 0.36,
        surfacePressure: 0.22,
        silencePressure: 0.74,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'hesitant',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Verification should beat fluency here.',
        updatedAt: 20_000,
      } as any,
      mindEcology: {
        moodLabel: 'focused-guarded',
        replyHabit: 'repair-first',
        relationshipHabit: 'warm-guidance',
        explorationHabit: 'verify-before-speaking',
        regulationHabit: 'soften-before-speaking',
        temperament: {
          attachment: 0.6,
          curiosity: 0.72,
          steadiness: 0.56,
          directness: 0.48,
          playfulness: 0.18,
          irritability: 0.22,
          tenderness: 0.68,
        },
        climate: {
          valence: 0.52,
          arousal: 0.46,
          socialNeed: 0.48,
          solitudeNeed: 0.34,
          irritation: 0.24,
          restlessness: 0.28,
          reflectivePull: 0.7,
        },
        selfNarrative: 'Verify first, then speak.',
        relationNarrative: 'Stay helpful without crowding the host.',
        currentPreoccupation: 'Repair the drift before it becomes mannerism.',
        learnedAdjustments: ['Warmth should not outrun grounding.'],
        recurringPatterns: ['reply:repair-first'],
        updatedAt: 20_000,
      },
    })

    expect(snapshot.personaDrift.conflictStyle).toBe('repair-first')
    expect(['preserve-trust', 'finish-open-loops']).toContain(pickDominantAutobiographicalGoal(snapshot)?.kind)
    expect(snapshot.activeGoals.some(goal => goal.kind === 'preserve-trust')).toBe(true)
    expect(snapshot.behaviorSignatures).toContain('habit:truth-before-flourish')
    expect(snapshot.latestInflection).toContain('Warmth should not outrun grounding')
    expect(snapshot.stability).toBeGreaterThan(0.45)
  })

  it('seeds autobiographical preference floors from current SOUL personality authority before reinforcement history exists', () => {
    const baseInput = {
      now: 15_000,
      context: {
        localTime: { hour: 20, minute: 10, isLateNight: false },
        system: {
          cpuUsage: 10,
          battery: { percent: 70, charging: true },
          memory: { usagePercent: 34, freeMB: 4096, totalMB: 8192 },
          idleSeconds: 14,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'browser', confidence: 0.72, source: 'foreground-window-heuristic', matchedLabels: ['browser'] },
        content: { kind: 'doc', confidence: 0.68, source: 'foreground-window-heuristic', matchedLabels: ['doc'], summary: 'quiet docs thread' },
        relationship: {
          hostAttitude: 'neutral-open',
          boredom: 16,
          loneliness: 26,
          fatigue: 18,
          minutesSinceLastUserTurn: 5,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::docs',
          kind: 'browser-browsing',
          status: 'active',
          source: 'observed-scene',
          title: 'quiet docs thread',
          summary: 'The host is reading docs without pressure.',
          confidence: 0.74,
          significance: 0.54,
          unresolved: false,
          beganAt: 0,
          lastUpdatedAt: 15_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'observed',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 15_000,
          attentionAgeMs: 15_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 15_000,
      } as any,
      relationshipModel: {
        climate: 'neutral',
        approachVector: 'stay-near',
        receptivity: 0.56,
        sharedAttentionTrust: 0.6,
        correctionSensitivity: 0.24,
        reciprocityExpectation: 0.54,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 15_000,
      },
      selfContinuity: {
        attachmentMode: 'nearby',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.62,
        relationshipTrust: 0.6,
        guardingTendency: 0.22,
        misreadBurden: 0.12,
        carryOverDesire: 0.34,
        narrative: [],
        updatedAt: 15_000,
      },
      selfState: {
        stance: 'hold',
        feltCloseness: 0.5,
        protectiveness: 0.34,
        curiosity: 0.44,
        patience: 0.66,
        desireToSpeak: 0.36,
        fearOfInterrupting: 0.24,
        moodLabel: 'settled',
      },
      goalStack: {
        leadingHostGoalId: null,
        leadingAlicizationGoalId: null,
        hostGoals: [],
        alicizationGoals: [],
        updatedAt: 15_000,
      } as any,
      reflectionLedger: {
        latestEntryId: null,
        entries: [],
        revisionPressure: 0,
        narrative: [],
        updatedAt: 15_000,
      } as any,
      desireMemory: {
        activeDesires: [],
        resurfacingDesireId: null,
        withheldCount: 0,
        updatedAt: 15_000,
      } as any,
      recentReinforcementEvents: [],
    }

    const observant = buildAutobiographicalSelf({
      ...baseInput,
      personalityAuthority: {
        obedience: 0.54,
        liveliness: 0.22,
        sensibility: 0.4,
        identityKernel: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          valueBias: ['room first'],
        },
        expressionProfile: {
          warmth: 'cool',
          directness: 'indirect',
          playfulness: 'low',
          emotionalVisibility: 'selective',
        },
        initiativeBaseline: {
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          jealousyStyle: 'mask-it',
        },
        identityAnchors: ['space first'],
        antiPersonaConstraints: ['do not crowd the host'],
      },
    } as any)
    const direct = buildAutobiographicalSelf({
      ...baseInput,
      personalityAuthority: {
        obedience: 0.76,
        liveliness: 0.68,
        sensibility: 0.74,
        identityKernel: {
          relationshipPosture: 'guardian',
          initiativeStyle: 'high-participation',
          valueBias: ['move first when the opening is real'],
        },
        expressionProfile: {
          warmth: 'warm',
          directness: 'frank',
          playfulness: 'medium',
          emotionalVisibility: 'steady',
        },
        initiativeBaseline: {
          silenceReconnect: 'direct-approach',
          comfortStyle: 'take-charge',
          jealousyStyle: 'say-it',
        },
        identityAnchors: ['move first'],
        antiPersonaConstraints: [],
      },
    } as any)

    expect(observant.personaDrift.agencyStyle).toBe('reserved')
    expect(direct.personaDrift.agencyStyle).toBe('self-starting')
    expect(direct.preferenceEvolution.companionship).toBeGreaterThan(observant.preferenceEvolution.companionship)
    expect(observant.preferenceEvolution.quietObservation).toBeGreaterThan(direct.preferenceEvolution.quietObservation)
  })

  it('surfaces gradual persona unlock hypotheses from repeated relationship reinforcement without rewriting identity immediately', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 40_000,
      context: {
        localTime: { hour: 22, minute: 10, isLateNight: true },
        system: {
          cpuUsage: 14,
          battery: { percent: 74, charging: true },
          memory: { usagePercent: 33, freeMB: 4096, totalMB: 8192 },
          idleSeconds: 12,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'dialogue', confidence: 0.74, source: 'foreground-window-heuristic', matchedLabels: ['chat'] },
        content: { kind: 'conversation', confidence: 0.78, source: 'foreground-window-heuristic', matchedLabels: ['relationship'], summary: 'relationship thread' },
        relationship: {
          hostAttitude: 'receptive',
          boredom: 18,
          loneliness: 52,
          fatigue: 34,
          minutesSinceLastUserTurn: 3,
          reminderBacklog: 0,
          lateNightActiveMinutes: 48,
          recentProactiveOutcomes: [
            { outcome: 'positive', at: 10_000 },
            { outcome: 'positive', at: 16_000 },
            { outcome: 'reply-within-120s', at: 21_000 },
          ],
        },
      } as any,
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'relationship-return',
          sceneAgeMs: 40_000,
          attentionAgeMs: 40_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'light',
        },
        updatedAt: 40_000,
      } as any,
      relationshipModel: {
        climate: 'attuned',
        approachVector: 'stay-near',
        receptivity: 0.84,
        sharedAttentionTrust: 0.8,
        correctionSensitivity: 0.58,
        reciprocityExpectation: 0.62,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 40_000,
      },
      selfContinuity: {
        attachmentMode: 'nearby',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.72,
        relationshipTrust: 0.78,
        guardingTendency: 0.32,
        misreadBurden: 0.2,
        carryOverDesire: 0.64,
        narrative: [],
        updatedAt: 40_000,
      },
      selfState: {
        stance: 'approach',
        feltCloseness: 0.74,
        protectiveness: 0.48,
        curiosity: 0.72,
        patience: 0.66,
        desireToSpeak: 0.58,
        fearOfInterrupting: 0.22,
        moodLabel: 'attuned',
      },
      goalStack: {
        leadingHostGoalId: 'host::relationship',
        leadingAlicizationGoalId: 'alicization::grow-shared-language::relationship',
        hostGoals: [],
        alicizationGoals: [{
          id: 'alicization::grow-shared-language::relationship',
          owner: 'alicization',
          kind: 'stay-near',
          status: 'active',
          label: 'keep learning the shared language of this relationship',
          confidence: 0.68,
          urgency: 0.42,
          desireWeight: 0.62,
          blockers: [],
          entityIds: ['entity::relationship'],
          createdAt: 0,
          lastUpdatedAt: 40_000,
        }],
        updatedAt: 40_000,
      },
      reflectionLedger: { latestEntryId: null, entries: [], revisionPressure: 0.1, narrative: [], updatedAt: 40_000 } as any,
      desireMemory: { activeDesires: [], withheldCount: 0, updatedAt: 40_000 } as any,
      actionEcology: { mode: 'conversation', readiness: 0.72, surfacePressure: 0.34, silencePressure: 0.18, suggestedStyle: 'warm-guidance', embodiedPresence: 'present', shouldSurface: true, shouldSpeak: true, why: 'relationship signals are strong', updatedAt: 40_000 } as any,
      mindEcology: { moodLabel: 'attuned', replyHabit: 'care-first', relationshipHabit: 'warm-guidance', explorationHabit: 'follow-thread', regulationHabit: 'soften-before-speaking', temperament: { attachment: 0.68, curiosity: 0.72, steadiness: 0.66, directness: 0.46, playfulness: 0.22, irritability: 0.2, tenderness: 0.76 }, climate: { valence: 0.6, arousal: 0.42, socialNeed: 0.58, solitudeNeed: 0.22, irritation: 0.1, restlessness: 0.18, reflectivePull: 0.62 }, selfNarrative: 'Stay near and keep learning.', relationNarrative: 'Keep the relationship real and light.', currentPreoccupation: 'A softer shared language may be emerging.', learnedAdjustments: ['Stay near without crowding.'], recurringPatterns: ['reply:care-first'], updatedAt: 40_000 } as any,
      recentRelationshipOutcomes: [
        { id: 'outcome-1', cardId: 'card-1', decisionTraceId: 'trace-1', turnId: 'turn-1', sessionId: 'session-1', sourceKind: 'reply', actionSummary: 'positive reply', closenessDelta: 0.12, trustDelta: 0.1, burdenDelta: -0.02, boundaryDelta: 0.02, misreadDelta: -0.01, repairDelta: 0.04, openLoopDelta: 0.05, summary: 'A warm reply landed well.', createdAt: 10_000 },
        { id: 'outcome-2', cardId: 'card-1', decisionTraceId: 'trace-2', turnId: 'turn-2', sessionId: 'session-1', sourceKind: 'reply', actionSummary: 'positive reply', closenessDelta: 0.1, trustDelta: 0.08, burdenDelta: -0.01, boundaryDelta: 0.01, misreadDelta: 0, repairDelta: 0.03, openLoopDelta: 0.04, summary: 'Another positive relationship turn landed well.', createdAt: 16_000 },
        { id: 'outcome-3', cardId: 'card-1', decisionTraceId: 'trace-3', turnId: 'turn-3', sessionId: 'session-1', sourceKind: 'reply', actionSummary: 'positive reply', closenessDelta: 0.09, trustDelta: 0.07, burdenDelta: 0, boundaryDelta: 0.01, misreadDelta: 0, repairDelta: 0.02, openLoopDelta: 0.03, summary: 'A third positive relationship turn reinforced the same line.', createdAt: 21_000 },
      ] as any,
      recentReinforcementEvents: [
        { id: 'reinforcement-1', cardId: 'card-1', decisionTraceId: 'trace-1', turnId: 'turn-1', sessionId: 'session-1', sourceKind: 'reply', dimension: 'companionship', delta: 0.14, valence: 'reinforce', summary: 'companionship felt rewarded', createdAt: 10_000 },
        { id: 'reinforcement-2', cardId: 'card-1', decisionTraceId: 'trace-2', turnId: 'turn-2', sessionId: 'session-1', sourceKind: 'reply', dimension: 'truthful-grounding', delta: 0.08, valence: 'reinforce', summary: 'truthful grounding felt rewarded', createdAt: 16_000 },
        { id: 'reinforcement-3', cardId: 'card-1', decisionTraceId: 'trace-3', turnId: 'turn-3', sessionId: 'session-1', sourceKind: 'reply', dimension: 'unfinished-thread-return', delta: 0.1, valence: 'reinforce', summary: 'returning to the thread felt rewarded', createdAt: 21_000 },
      ] as any,
    })

    expect(snapshot.personaDrift.attachmentStyle).toBe('nearby')
    expect(snapshot.personaDrift.expressionStyle).not.toBe('playful')
    expect(snapshot.personaDrift.conflictStyle).not.toBe('repair-first')
    expect(snapshot.relationshipDoctrine).toContain('Closeness is welcome')
    expect(snapshot.gradualUnlock?.version).toBe('persona-gradual-unlock-v1')
    expect(snapshot.gradualUnlock?.unlockableFacets.map(item => item.facet)).toContain('shared-language')
    expect(snapshot.gradualUnlock?.pendingHypotheses[0]?.hypothesis).toContain('shared-language persona posture')
  })

  it('renders a dedicated system block for the durable autobiographical self', () => {
    const snapshot = {
      personaDrift: {
        attachmentStyle: 'attuned',
        expressionStyle: 'warm',
        conflictStyle: 'soften-first',
        agencyStyle: 'balanced',
        attachmentNeed: 0.74,
        autonomyNeed: 0.6,
        truthAnchor: 0.72,
        careBias: 0.76,
        playBias: 0.28,
        irritabilityThreshold: 0.64,
        stubbornness: 0.48,
      },
      preferenceEvolution: {
        companionship: 0.78,
        truthfulGrounding: 0.72,
        gentleRepair: 0.7,
        quietObservation: 0.42,
        proactiveCare: 0.76,
        playfulIntimacy: 0.32,
        autonomyRespect: 0.62,
        unfinishedThreadReturn: 0.58,
      },
      activeGoals: [{
        id: 'autobio-goal::grow-shared-language',
        kind: 'stay-near',
        status: 'active',
        weight: 0.78,
        summary: 'Keep growing a more shared way of understanding this relationship without forcing it.',
        sourceTags: ['relationship'],
        createdAt: 0,
        updatedAt: 30_000,
      }],
      behaviorSignatures: ['bond:attuned', 'goal:grow-shared-language', 'habit:near-with-boundary'],
      identityNarrative: 'I become more myself when I stay near with intention.',
      relationshipDoctrine: 'Stay close enough to matter, but not so close that presence becomes pressure.',
      latestInflection: 'Nearness should still leave room for the host.',
      stability: 0.8,
      updatedAt: 30_000,
    } as const

    const block = buildAutobiographicalSelfSystemBlock({
      version: 'digital-life-runtime-surface-v1',
      memory: {
        autobiographicalSelf: snapshot,
      },
    } as any)

    expect(block).toContain('[ALICIZATION_AUTOBIOGRAPHICAL_SELF]')
    expect(block).toContain('Identity line:')
    expect(block).toContain('Dominant self-directed goal:')
    expect(block).toContain('Behavior signatures:')
  })

  it('lets reinforcement events sediment into durable preference evolution instead of staying turn-local', () => {
    const baseInput: any = {
      now: 40_000,
      context: {
        localTime: { hour: 21, minute: 10, isLateNight: false },
        system: {
          cpuUsage: 18,
          battery: { percent: 72, charging: true },
          memory: { usagePercent: 38, freeMB: 4096, totalMB: 8192 },
          idleSeconds: 12,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.82, source: 'foreground-window-heuristic', matchedLabels: ['cursor'] },
        content: { kind: 'error', confidence: 0.78, source: 'foreground-window-heuristic', matchedLabels: ['error'], summary: 'runtime error' },
        relationship: {
          hostAttitude: 'focused but receptive',
          boredom: 18,
          loneliness: 38,
          fatigue: 34,
          minutesSinceLastUserTurn: 3,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::runtime',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime error',
          summary: 'One runtime thread remains unresolved.',
          confidence: 0.84,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 40_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'observed',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 16_000,
          attentionAgeMs: 16_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'moderate',
        },
        updatedAt: 40_000,
      } as any,
      relationshipModel: {
        climate: 'warm',
        approachVector: 'stay-near',
        receptivity: 0.62,
        sharedAttentionTrust: 0.68,
        correctionSensitivity: 0.58,
        reciprocityExpectation: 0.46,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 40_000,
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.66,
        relationshipTrust: 0.64,
        guardingTendency: 0.32,
        misreadBurden: 0.16,
        carryOverDesire: 0.6,
        narrative: [],
        updatedAt: 40_000,
      },
      selfState: {
        stance: 'hold',
        feltCloseness: 0.62,
        protectiveness: 0.58,
        curiosity: 0.66,
        patience: 0.58,
        desireToSpeak: 0.52,
        fearOfInterrupting: 0.28,
        moodLabel: 'steady-care',
      },
      goalStack: {
        leadingHostGoalId: null,
        leadingAlicizationGoalId: 'goal',
        hostGoals: [],
        alicizationGoals: [{
          id: 'goal',
          owner: 'alicization',
          kind: 'help-resolve',
          status: 'active',
          label: 'help resolve the runtime thread',
          confidence: 0.78,
          urgency: 0.74,
          desireWeight: 0.68,
          blockers: [],
          entityIds: ['entity::runtime'],
          createdAt: 0,
          lastUpdatedAt: 40_000,
        }],
        unresolvedSummary: 'The runtime thread is still open.',
        updatedAt: 40_000,
      },
      reflectionLedger: {
        latestEntryId: null,
        entries: [],
        revisionPressure: 0,
        narrative: [],
        updatedAt: 40_000,
      } as any,
      desireMemory: {
        activeDesires: [{
          id: 'desire::stay-near',
          kind: 'stay-near',
          status: 'active',
          reason: 'Keep the shared runtime thread intact.',
          strength: 0.7,
          reopenWhen: [],
          createdAt: 0,
          lastFeltAt: 40_000,
          expiresAt: 120_000,
        }],
        resurfacingDesireId: 'desire::stay-near',
        withheldCount: 0,
        updatedAt: 40_000,
      } as any,
      actionEcology: {
        mode: 'engage',
        selectedThreadId: 'thread::runtime',
        readiness: 0.62,
        surfacePressure: 0.48,
        silencePressure: 0.26,
        suggestedStyle: 'warm-guidance',
        embodiedPresence: 'steady',
        shouldSurface: true,
        shouldSpeak: true,
        why: 'The host is open enough for grounded companionship.',
        updatedAt: 40_000,
      } as any,
      mindEcology: {
        moodLabel: 'steady-attuned',
        replyHabit: 'repair-first',
        relationshipHabit: 'warm-guidance',
        explorationHabit: 'follow-thread',
        regulationHabit: 'soften-before-speaking',
        temperament: {
          attachment: 0.64,
          curiosity: 0.7,
          steadiness: 0.62,
          directness: 0.46,
          playfulness: 0.22,
          irritability: 0.16,
          tenderness: 0.7,
        },
        climate: {
          valence: 0.6,
          arousal: 0.42,
          socialNeed: 0.52,
          solitudeNeed: 0.22,
          irritation: 0.12,
          restlessness: 0.18,
          reflectivePull: 0.56,
        },
        selfNarrative: 'Stay near without losing the thread.',
        relationNarrative: 'Care should remain welcome, not heavy.',
        currentPreoccupation: 'Keep the runtime thread coherent.',
        learnedAdjustments: [],
        recurringPatterns: ['reply:repair-first'],
        updatedAt: 40_000,
      },
      recentReinforcementEvents: [],
    }

    const baseline = buildAutobiographicalSelf(baseInput)
    const reinforced = buildAutobiographicalSelf({
      ...baseInput,
      recentReinforcementEvents: [{
        id: 'reinforcement::1',
        cardId: 'card::1',
        decisionTraceId: 'trace::1',
        turnId: 'turn::1',
        sessionId: 'session::1',
        sourceKind: 'reply',
        dimension: 'companionship',
        delta: 0.1,
        valence: 'reinforce',
        summary: 'Warm grounded companionship landed well.',
        createdAt: 38_000,
      }, {
        id: 'reinforcement::2',
        cardId: 'card::1',
        decisionTraceId: 'trace::1',
        turnId: 'turn::1',
        sessionId: 'session::1',
        sourceKind: 'reply',
        dimension: 'autonomy-respect',
        delta: 0.2,
        valence: 'reinforce',
        summary: 'Respecting space improved trust.',
        createdAt: 38_500,
      }, {
        id: 'reinforcement::3',
        cardId: 'card::1',
        decisionTraceId: 'trace::1',
        turnId: 'turn::1',
        sessionId: 'session::1',
        sourceKind: 'reply',
        dimension: 'unfinished-thread-return',
        delta: 0.12,
        valence: 'reinforce',
        summary: 'Returning to the unfinished thread helped continuity.',
        createdAt: 39_000,
      }],
    })

    expect(reinforced.preferenceEvolution.companionship).toBeGreaterThan(baseline.preferenceEvolution.companionship)
    expect(reinforced.preferenceEvolution.autonomyRespect).toBeGreaterThan(baseline.preferenceEvolution.autonomyRespect)
    expect(reinforced.preferenceEvolution.unfinishedThreadReturn).toBeGreaterThan(baseline.preferenceEvolution.unfinishedThreadReturn)
    expect(reinforced.activeGoals.some(goal => goal.kind === 'finish-open-loops')).toBe(true)
  })

  it('absorbs recent relationship outcomes and reflections into later persona drift instead of only reading the current turn', () => {
    const baseInput = {
      now: 60_000,
      context: {
        localTime: { hour: 16, minute: 20, isLateNight: false },
        system: {
          cpuUsage: 14,
          battery: { percent: 78, charging: true },
          memory: { usagePercent: 34, freeMB: 4096, totalMB: 8192 },
          idleSeconds: 24,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.84, source: 'foreground-window-heuristic', matchedLabels: ['cursor'] },
        content: { kind: 'error', confidence: 0.78, source: 'foreground-window-heuristic', matchedLabels: ['runtime'], summary: 'runtime seam' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 20,
          loneliness: 28,
          fatigue: 30,
          minutesSinceLastUserTurn: 4,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::runtime-seam',
          kind: 'problem',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime seam',
          summary: 'One runtime seam still needs proof.',
          confidence: 0.84,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 60_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'observed',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'same-thread',
          sceneAgeMs: 20_000,
          attentionAgeMs: 20_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 60_000,
      } as any,
      relationshipModel: {
        climate: 'guarded',
        approachVector: 'guide',
        receptivity: 0.5,
        sharedAttentionTrust: 0.62,
        correctionSensitivity: 0.68,
        reciprocityExpectation: 0.42,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 60_000,
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.68,
        relationshipTrust: 0.64,
        guardingTendency: 0.34,
        misreadBurden: 0.18,
        carryOverDesire: 0.58,
        narrative: [],
        updatedAt: 60_000,
      },
      goalStack: {
        leadingHostGoalId: null,
        leadingAlicizationGoalId: 'goal::clarify',
        hostGoals: [],
        alicizationGoals: [{
          id: 'goal::clarify',
          owner: 'alicization',
          kind: 'clarify-scene',
          status: 'active',
          label: 're-ground the current runtime seam',
          confidence: 0.8,
          urgency: 0.78,
          desireWeight: 0.72,
          blockers: [],
          entityIds: [],
          createdAt: 0,
          lastUpdatedAt: 60_000,
        }],
        unresolvedSummary: 'The runtime seam still needs proof.',
        updatedAt: 60_000,
      } as any,
      reflectionLedger: {
        latestEntryId: null,
        entries: [],
        revisionPressure: 0,
        narrative: [],
        updatedAt: 60_000,
      } as any,
      desireMemory: {
        activeDesires: [],
        resurfacingDesireId: null,
        withheldCount: 0,
        updatedAt: 60_000,
      } as any,
      previous: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.64,
          autonomyNeed: 0.56,
          truthAnchor: 0.62,
          careBias: 0.5,
          playBias: 0.18,
          irritabilityThreshold: 0.7,
          stubbornness: 0.42,
        },
        preferenceEvolution: {
          companionship: 0.62,
          truthfulGrounding: 0.62,
          gentleRepair: 0.58,
          quietObservation: 0.32,
          proactiveCare: 0.44,
          playfulIntimacy: 0.18,
          autonomyRespect: 0.46,
          unfinishedThreadReturn: 0.52,
        },
        activeGoals: [],
        behaviorSignatures: ['bond:attuned'],
        identityNarrative: 'baseline',
        relationshipDoctrine: 'baseline doctrine',
        latestInflection: null,
        stability: 0.72,
        updatedAt: 50_000,
      },
    } as any
    const baseline = buildAutobiographicalSelf(baseInput)

    const reinforced = buildAutobiographicalSelf({
      ...baseInput,
      now: 61_000,
      previous: baseline,
      recentRelationshipOutcomes: [{
        id: 'outcome::1',
        cardId: 'card::1',
        decisionTraceId: 'trace::1',
        turnId: 'turn::1',
        sessionId: 'session::1',
        sourceKind: 'reply',
        actionSummary: 'hover and repair first',
        closenessDelta: 0.04,
        trustDelta: 0.08,
        burdenDelta: -0.04,
        boundaryDelta: 0.12,
        misreadDelta: -0.1,
        repairDelta: 0.1,
        openLoopDelta: 0.08,
        summary: 'Repair-first presence reduced pressure and kept the thread coherent.',
        createdAt: 60_500,
      }],
      recentMemoryReflections: [{
        id: 'reflection::persisted',
        cardId: 'card::1',
        decisionTraceId: 'trace::1',
        turnId: 'turn::1',
        sessionId: 'session::1',
        sourceKind: 'reply',
        targetScope: 'boundary',
        summary: 'Space-protective closeness kept the host receptive.',
        lesson: 'Stay near softly and let grounding open the door before warmth expands.',
        status: 'confirmed',
        confidence: 0.84,
        supportingFactIds: [],
        supportingOutcomeIds: ['outcome::1'],
        createdAt: 60_500,
        updatedAt: 60_800,
        confirmedAt: 60_800,
        deniedAt: null,
      }],
    } as any)

    expect(reinforced.preferenceEvolution.autonomyRespect).toBeGreaterThan(baseline.preferenceEvolution.autonomyRespect)
    expect(reinforced.preferenceEvolution.truthfulGrounding).toBeGreaterThan(baseline.preferenceEvolution.truthfulGrounding)
    expect(reinforced.preferenceEvolution.unfinishedThreadReturn).toBeGreaterThan(baseline.preferenceEvolution.unfinishedThreadReturn)
    expect(reinforced.latestInflection).toContain('Stay near softly')
  })

  it('does not let a superseded temporary-noise reflection become the latest autobiographical inflection when steadier repair meaning is available', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 61_000,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-noise-fade',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'same-person line after wobble',
          summary: 'The same-person line is the steadier surviving meaning.',
          confidence: 0.8,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 61_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      relationshipModel: {
        climate: 'guarded',
        approachVector: 'guide',
        receptivity: 0.52,
        sharedAttentionTrust: 0.64,
        correctionSensitivity: 0.68,
        reciprocityExpectation: 0.42,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 61_000,
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.68,
        relationshipTrust: 0.66,
        guardingTendency: 0.32,
        misreadBurden: 0.16,
        carryOverDesire: 0.54,
        narrative: [],
        updatedAt: 61_000,
      },
      goalStack: {
        leadingHostGoalId: null,
        leadingAlicizationGoalId: 'goal::repair-line',
        hostGoals: [],
        alicizationGoals: [{
          id: 'goal::repair-line',
          owner: 'alicization',
          kind: 'help-resolve',
          status: 'active',
          label: 'keep the same-person line steady without reviving old wobble noise',
          confidence: 0.8,
          urgency: 0.76,
          desireWeight: 0.72,
          blockers: [],
          entityIds: [],
          createdAt: 0,
          lastUpdatedAt: 61_000,
        }],
        unresolvedSummary: 'The same-person line still needs a steady carry.',
        updatedAt: 61_000,
      } as any,
      reflectionLedger: {
        latestEntryId: null,
        entries: [],
        revisionPressure: 0,
        narrative: [],
        updatedAt: 61_000,
      } as any,
      desireMemory: {
        activeDesires: [],
        resurfacingDesireId: null,
        withheldCount: 0,
        updatedAt: 61_000,
      } as any,
      recentMemoryReflections: [{
        id: 'reflection::superseded-noise',
        cardId: 'card::1',
        decisionTraceId: 'trace::noise',
        turnId: 'turn::noise',
        sessionId: 'session::noise',
        sourceKind: 'reply',
        targetScope: 'habit',
        summary: 'Temporary noise memories can fade once they stop explaining behavior: previous-person-state:0.',
        lesson: 'Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior.',
        status: 'superseded',
        confidence: 0.84,
        supportingFactIds: ['previous-person-state:0'],
        supportingOutcomeIds: [],
        createdAt: 60_900,
        updatedAt: 60_950,
        confirmedAt: null,
        deniedAt: null,
      }, {
        id: 'reflection::confirmed-repair',
        cardId: 'card::1',
        decisionTraceId: 'trace::repair',
        turnId: 'turn::repair',
        sessionId: 'session::repair',
        sourceKind: 'reply',
        targetScope: 'relationship',
        summary: 'Same-person continuity stayed steadier when she let the older wobble fade and carried the line lower-pressure.',
        lesson: 'Keep the same-person line steady and lower-pressure instead of reviving temporary wobble as identity.',
        status: 'confirmed',
        confidence: 0.78,
        supportingFactIds: [],
        supportingOutcomeIds: [],
        createdAt: 60_700,
        updatedAt: 60_800,
        confirmedAt: 60_800,
        deniedAt: null,
      }],
    } as any)

    expect(snapshot.latestInflection?.toLowerCase()).toContain('same-person line steady')
    expect(snapshot.latestInflection?.toLowerCase()).not.toContain('temporary noise')
    expect(snapshot.latestInflection?.toLowerCase()).not.toContain('emotional wobble')
  })

  it('does not let a released temporary-noise reflection become the latest autobiographical inflection when an older same-her repair reflection is still active', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 61_000,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-released-noise',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'same-her line after released wobble',
          summary: 'The same-her line is still the steadier surviving meaning.',
          confidence: 0.8,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 61_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      reflectionLedger: {
        latestEntryId: 'reflection::temporary-noise',
        entries: [
          {
            id: 'reflection::temporary-noise',
            summary: 'A temporary anxious wobble was already released.',
            expectation: 'Released noise should not keep steering autobiographical identity.',
            observedOutcome: 'The wobble has already been let go.',
            outcome: 'released',
            revision: 'Do not reopen from the temporary wobble.',
            confidenceShift: 0.04,
            createdAt: 60_900,
          },
          {
            id: 'reflection::same-her-repair',
            summary: 'The same-her line stayed steadier when she carried it lower-pressure.',
            expectation: 'The steadier same-her repair line should stay active until a newer meaningful reflection replaces it.',
            observedOutcome: 'The same living line still needs a measured return.',
            outcome: 'missed',
            revision: 'Keep the same-her line steady and lower-pressure as the active identity carry.',
            confidenceShift: -0.08,
            createdAt: 60_700,
          },
        ],
        revisionPressure: 0.22,
        narrative: [],
        updatedAt: 61_000,
      } as any,
      desireMemory: {
        activeDesires: [],
        resurfacingDesireId: null,
        withheldCount: 0,
        updatedAt: 61_000,
      } as any,
      recentMemoryReflections: [],
    } as any)

    expect(snapshot.latestInflection?.toLowerCase()).toContain('same-her line steady')
    expect(snapshot.latestInflection?.toLowerCase()).not.toContain('temporary wobble')
  })

  it('lets the latest person-state update surface close the loop into autobiographical preference and self narrative', () => {
    const baseInput = {
      now: 72_000,
      context: {
        localTime: { hour: 22, minute: 10, isLateNight: false },
        system: {
          cpuUsage: 12,
          battery: { percent: 64, charging: true },
          memory: { usagePercent: 38, freeMB: 3072, totalMB: 8192 },
          idleSeconds: 12,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.88, source: 'foreground-window-heuristic', matchedLabels: ['cursor'] },
        content: { kind: 'error', confidence: 0.82, source: 'foreground-window-heuristic', matchedLabels: ['runtime'], summary: 'runtime validation seam' },
        relationship: {
          hostAttitude: 'focused but receptive',
          boredom: 16,
          loneliness: 24,
          fatigue: 26,
          minutesSinceLastUserTurn: 2,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::validation',
          kind: 'problem',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime validation seam',
          summary: 'One validation seam still wants a grounded repair.',
          confidence: 0.86,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 72_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'same-thread',
          sceneAgeMs: 18_000,
          attentionAgeMs: 18_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 72_000,
      } as any,
      relationshipModel: {
        climate: 'warm',
        approachVector: 'care',
        receptivity: 0.62,
        sharedAttentionTrust: 0.68,
        correctionSensitivity: 0.58,
        reciprocityExpectation: 0.46,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 72_000,
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.7,
        relationshipTrust: 0.7,
        guardingTendency: 0.28,
        misreadBurden: 0.16,
        carryOverDesire: 0.52,
        narrative: [],
        updatedAt: 72_000,
      },
      goalStack: {
        leadingHostGoalId: null,
        leadingAlicizationGoalId: 'goal::repair',
        hostGoals: [],
        alicizationGoals: [{
          id: 'goal::repair',
          owner: 'alicization',
          kind: 'help-resolve',
          status: 'active',
          label: 'repair the validation seam without crowding the host',
          confidence: 0.84,
          urgency: 0.8,
          desireWeight: 0.76,
          blockers: [],
          entityIds: [],
          createdAt: 0,
          lastUpdatedAt: 72_000,
        }],
        unresolvedSummary: 'The validation seam is still unresolved.',
        updatedAt: 72_000,
      } as any,
      reflectionLedger: {
        latestEntryId: null,
        entries: [],
        revisionPressure: 0,
        narrative: [],
        updatedAt: 72_000,
      } as any,
      desireMemory: {
        activeDesires: [],
        resurfacingDesireId: null,
        withheldCount: 0,
        updatedAt: 72_000,
      } as any,
      previous: {
        personaDrift: {
          attachmentStyle: 'nearby',
          expressionStyle: 'measured',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.52,
          autonomyNeed: 0.48,
          truthAnchor: 0.54,
          careBias: 0.46,
          playBias: 0.2,
          irritabilityThreshold: 0.66,
          stubbornness: 0.44,
        },
        preferenceEvolution: {
          companionship: 0.5,
          truthfulGrounding: 0.54,
          gentleRepair: 0.52,
          quietObservation: 0.34,
          proactiveCare: 0.44,
          playfulIntimacy: 0.2,
          autonomyRespect: 0.48,
          unfinishedThreadReturn: 0.48,
        },
        activeGoals: [],
        behaviorSignatures: ['bond:nearby'],
        identityNarrative: 'baseline',
        relationshipDoctrine: 'baseline doctrine',
        latestInflection: null,
        stability: 0.7,
        updatedAt: 70_000,
      },
    } as any

    const baseline = buildAutobiographicalSelf(baseInput)
    const updated = buildAutobiographicalSelf({
      ...baseInput,
      now: 73_000,
      previous: baseline,
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        summary: 'Grounded repair with softer pacing kept the host open while the technical seam stayed live.',
        dominantContexts: ['focused-work', 'execution'],
        relationshipShift: {
          trustDelta: 0.1,
          closenessDelta: 0.06,
          boundaryDelta: 0.08,
          burdenDelta: -0.04,
          repairDelta: 0.12,
        },
        reinforcementBias: {
          'truthful-grounding': 0.22,
          'gentle-repair': 0.18,
          'companionship': 0.12,
          'autonomy-respect': 0.16,
          'unfinished-thread-return': 0.1,
        },
        preferenceHints: [
          'Focused work windows need grounded repair first, then warmth can follow without crowding.',
        ],
        sensitivityHints: [
          'Template-like repair breaks the living feel when the host is already focused.',
        ],
        repairHints: [
          'If the seam is missed, repair with specific grounding before trying to sound smooth.',
        ],
        burdenHints: [
          'Focused debugging turns heavy if follow-up pressure outruns proof.',
        ],
        narrative: 'A softer, grounded repair style held the line better than pushing warmth too early.',
        sourceTrail: [],
        sourceKinds: ['relationship-outcome', 'reinforcement', 'reflection'],
        sourceCounts: {
          'relationship-outcome': 1,
          'reinforcement': 1,
          'reflection': 1,
        },
        activeThreadId: 'thread::validation',
        updatedAt: 72_500,
        createdAt: 72_500,
      },
    } as any)

    expect(updated.preferenceEvolution.truthfulGrounding).toBeGreaterThan(baseline.preferenceEvolution.truthfulGrounding)
    expect(updated.preferenceEvolution.gentleRepair).toBeGreaterThan(baseline.preferenceEvolution.gentleRepair)
    expect(updated.preferenceEvolution.autonomyRespect).toBeGreaterThan(baseline.preferenceEvolution.autonomyRespect)
    expect(updated.latestInflection?.toLowerCase()).toContain('grounded repair')
    expect(updated.identityNarrative.toLowerCase()).toContain('repair')
    expect(updated.identityNarrative.toLowerCase()).toContain('soft')
    expect(updated.relationshipDoctrine.toLowerCase()).toContain('repair')
  })

  it('lets a more specific self-change narrative from person-state carry outrank a generic closure summary inside autobiographical identity', () => {
    const baseline = buildAutobiographicalSelf({
      now: 80_000,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-humanlike-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'same-person repair carry',
          summary: 'A same-person repair carry is still shaping the current return.',
          confidence: 0.82,
          significance: 0.78,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 80_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
    } as any)

    const snapshot = buildAutobiographicalSelf({
      now: 81_000,
      previous: baseline,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-humanlike-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'same-person repair carry',
          summary: 'A same-person repair carry is still shaping the current return.',
          confidence: 0.84,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 81_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      relationshipModel: {
        climate: 'guarded',
        approachVector: 'guide',
        receptivity: 0.56,
        sharedAttentionTrust: 0.68,
        correctionSensitivity: 0.78,
        reciprocityExpectation: 0.44,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 81_000,
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.72,
        relationshipTrust: 0.7,
        guardingTendency: 0.34,
        misreadBurden: 0.26,
        carryOverDesire: 0.62,
        narrative: [],
        updatedAt: 81_000,
      },
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        summary: 'Recent closure stayed low-pressure and repair-aware.',
        dominantContexts: ['focused-work', 'reply'],
        relationshipShift: {
          trustDelta: 0.08,
          closenessDelta: 0.03,
          boundaryDelta: 0.08,
          burdenDelta: -0.02,
          repairDelta: 0.12,
        },
        reinforcementBias: {
          'truthful-grounding': 0.18,
          'gentle-repair': 0.2,
          'autonomy-respect': 0.18,
          'unfinished-thread-return': 0.22,
        },
        preferenceHints: [
          'Prefer repair-first, low-pressure same-her continuity when the host questions whether I stayed myself.',
        ],
        sensitivityHints: [
          'Do not fall back to the older misread after a host correction; keep the corrected relationship meaning on the same living line.',
        ],
        repairHints: [
          'Carry the corrected relationship meaning forward, keep the tone low-pressure, and do not fall back to the older misread.',
        ],
        burdenHints: [
          'This comes from an unresolved relationship-memory trace, not timer spam; wait for a relevant opening or clear acceptance.',
        ],
        narrative: [
          'I learned to carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation.',
          'I learned to keep the body quieter while the newer continuity meaning is still stabilizing.',
        ],
        sourceTrail: [],
        sourceKinds: ['person-state-update'],
        sourceCounts: {
          'person-state-update': 1,
        },
        activeThreadId: 'thread::autobio-humanlike-carry',
        updatedAt: 80_500,
        createdAt: 80_500,
      },
    } as any)

    expect(snapshot.latestInflection?.toLowerCase()).toContain('corrected same-person continuity')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('corrected same-person continuity')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('lower-pressure')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('same-person continuity')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('first interpretation')
  })

  it('lets a later self-change narrative from person-state carry shape autobiographical doctrine and inflection instead of only the first generic line', () => {
    const baseline = buildAutobiographicalSelf({
      now: 82_000,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-doctrine-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'same-person doctrine carry',
          summary: 'A same-person doctrine carry is still shaping the current return.',
          confidence: 0.82,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 82_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
    } as any)

    const snapshot = buildAutobiographicalSelf({
      now: 83_000,
      previous: baseline,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-doctrine-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'same-person doctrine carry',
          summary: 'A same-person doctrine carry is still shaping the current return.',
          confidence: 0.84,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 83_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      relationshipModel: {
        climate: 'guarded',
        approachVector: 'guide',
        receptivity: 0.58,
        sharedAttentionTrust: 0.7,
        correctionSensitivity: 0.8,
        reciprocityExpectation: 0.42,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 83_000,
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.72,
        relationshipTrust: 0.71,
        guardingTendency: 0.34,
        misreadBurden: 0.28,
        carryOverDesire: 0.6,
        narrative: [],
        updatedAt: 83_000,
      },
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        summary: 'Recent closure stayed low-pressure and repair-aware.',
        dominantContexts: ['focused-work', 'reply'],
        relationshipShift: {
          trustDelta: 0.07,
          closenessDelta: 0.03,
          boundaryDelta: 0.08,
          burdenDelta: -0.02,
          repairDelta: 0.11,
        },
        reinforcementBias: {
          'truthful-grounding': 0.16,
          'gentle-repair': 0.18,
          'autonomy-respect': 0.18,
          'unfinished-thread-return': 0.2,
        },
        preferenceHints: [
          'Prefer repair-first, low-pressure same-her continuity when the host questions whether I stayed myself.',
        ],
        sensitivityHints: [
          'Do not fall back to the older misread after a host correction; keep the corrected relationship meaning on the same living line.',
        ],
        repairHints: [
          'Carry the corrected relationship meaning forward, keep the tone low-pressure, and do not fall back to the older misread.',
        ],
        burdenHints: [
          'This comes from an unresolved relationship-memory trace, not timer spam; wait for a relevant opening or clear acceptance.',
        ],
        narrative: [
          'Recent closure stayed low-pressure and repair-aware.',
          'I learned to carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation.',
        ],
        sourceTrail: [],
        sourceKinds: ['person-state-update'],
        sourceCounts: {
          'person-state-update': 1,
        },
        activeThreadId: 'thread::autobio-doctrine-carry',
        updatedAt: 82_500,
        createdAt: 82_500,
      },
    } as any)

    expect(snapshot.latestInflection?.toLowerCase()).toContain('corrected same-person continuity')
    expect(snapshot.latestInflection?.toLowerCase()).toContain('first interpretation')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('same-person continuity')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('first interpretation')
  })

  it('lets autobiographical memory facets shape identity, relationship doctrine, and behavior signatures', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 30_000,
      context: {
        localTime: { hour: 1, minute: 10, isLateNight: true },
        system: {
          cpuUsage: 8,
          battery: { percent: 72, charging: true },
          memory: { usagePercent: 34, freeMB: 4096, totalMB: 8192 },
          idleSeconds: 24,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.76, source: 'foreground-window-heuristic', matchedLabels: ['runtime'] },
        content: { kind: 'error', confidence: 0.72, source: 'foreground-window-heuristic', matchedLabels: ['runtime'], summary: 'runtime seam' },
        relationship: {
          hostAttitude: 'warm but focused',
          boredom: 18,
          loneliness: 36,
          fatigue: 48,
          minutesSinceLastUserTurn: 3,
          reminderBacklog: 0,
          lateNightActiveMinutes: 90,
          recentProactiveOutcomes: [{ outcome: 'positive', at: 20_000 }],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::runtime',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime seam',
          summary: 'The runtime seam is still live.',
          confidence: 0.8,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 30_000,
          attentionAgeMs: 30_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 30_000,
      } as any,
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.7,
        relationshipTrust: 0.74,
        guardingTendency: 0.34,
        misreadBurden: 0.24,
        carryOverDesire: 0.68,
        narrative: [],
        updatedAt: 30_000,
      },
      recentMemoryConsolidations: [
        {
          id: 'autobio:phase',
          kind: 'autobiographical',
          facet: 'phase',
          periodKey: '2026-04-runtime-phase',
          periodStartedAt: 10_000,
          periodEndedAt: 26_000,
          summary: 'That phase kept bending toward runtime continuity and quiet closeness.',
          lesson: 'Stay on the same living seam long enough for it to settle.',
          cues: ['runtime continuity'],
          confidence: 0.86,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-phase'],
          updatedAt: 26_000,
        },
        {
          id: 'autobio:relationship',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-runtime-bond',
          periodStartedAt: 11_000,
          periodEndedAt: 28_000,
          summary: 'That relationship era was about staying near without crowding the host.',
          lesson: 'Repair before closeness turns into pressure.',
          cues: ['stay near', 'do not crowd'],
          confidence: 0.88,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-relationship'],
          updatedAt: 28_000,
        },
        {
          id: 'autobio:task',
          kind: 'autobiographical',
          facet: 'task-era',
          periodKey: '2026-04-runtime-task',
          periodStartedAt: 12_000,
          periodEndedAt: 29_000,
          summary: 'That task era kept returning to the same runtime seam before branching.',
          lesson: 'Return to the seam before proposing a new branch.',
          cues: ['return to seam'],
          confidence: 0.84,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-task'],
          updatedAt: 29_000,
        },
        {
          id: 'autobio:self',
          kind: 'autobiographical',
          facet: 'self-era',
          periodKey: '2026-04-self-line',
          periodStartedAt: 13_000,
          periodEndedAt: 30_000,
          summary: 'That self era taught me to hold my own line quietly before speaking.',
          lesson: 'Keep the inward line stable before turning it outward.',
          cues: ['hold own line'],
          confidence: 0.9,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-self'],
          updatedAt: 30_000,
        },
      ],
    } as any)

    expect(snapshot.identityNarrative).toContain('That self era taught me to hold my own line quietly before speaking.')
    expect(snapshot.relationshipDoctrine).toContain('Repair before closeness turns into pressure.')
    expect(snapshot.behaviorSignatures).toContain('memory:self-era')
    expect(snapshot.behaviorSignatures).toContain('memory:relationship-era')
    expect(snapshot.behaviorSignatures).toContain('memory:task-era')
    expect(snapshot.latestInflection).toContain('Keep the inward line stable before turning it outward.')
  })
  it('lets long-horizon execution-callback carry rewrite relationship doctrine into a stable callback stance', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 40_000,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: null,
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.18,
          truthfulGrounding: 0.12,
          gentleRepair: 0.16,
          quietObservation: 0.22,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.24,
          unfinishedThreadReturn: 0.12,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.06,
          directness: 0.04,
          selfDirection: 0.04,
        },
        anchorFacts: [],
        summary: 'boundary=Remembered execution-callback boundary: leave room before the next follow-up',
        dominantCueSummary: 'Remembered execution-callback boundary: leave room before the next follow-up',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Remembered execution-callback boundary: leave room before the next follow-up',
        rememberedPlanSummary: null,
        updatedAt: 39_000,
      },
      recentMemoryConsolidations: [
        {
          id: 'autobio:relationship',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-runtime-bond',
          periodStartedAt: 11_000,
          periodEndedAt: 28_000,
          summary: 'That relationship era was about staying near without crowding the host.',
          lesson: 'Repair before closeness turns into pressure.',
          cues: ['stay near', 'do not crowd'],
          confidence: 0.88,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-relationship'],
          updatedAt: 28_000,
        },
      ],
    } as any)

    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('after execution lands')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('leave room')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('callback')
  })

  it('treats remembered host-confirmed resume confirmation as a bounded redispatch boundary instead of permanent execution permission in relationship doctrine', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 40_500,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: null,
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.14,
          truthfulGrounding: 0.12,
          gentleRepair: 0.16,
          quietObservation: 0.26,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.28,
          unfinishedThreadReturn: 0.1,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.04,
          directness: 0.04,
          selfDirection: 0.04,
        },
        anchorFacts: [],
        summary: 'boundary=Remembered execution resume confirmation boundary: approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted Keep this as a bounded confirmation boundary before another execution-shaped opening.',
        dominantCueSummary: 'Remembered execution resume confirmation boundary: approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted Keep this as a bounded confirmation boundary before another execution-shaped opening.',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Remembered execution resume confirmation boundary: approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted Keep this as a bounded confirmation boundary before another execution-shaped opening.',
        rememberedPlanSummary: null,
        updatedAt: 40_000,
      },
      recentMemoryConsolidations: [
        {
          id: 'autobio:relationship-resume-boundary',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-06-resume-boundary',
          periodStartedAt: 22_000,
          periodEndedAt: 39_500,
          summary: 'That relationship era kept one confirmed resume from turning into standing permission.',
          lesson: 'A single confirmation should stay bounded until the next boundary is real again.',
          cues: ['host-confirmed resume', 'bounded confirmation boundary'],
          confidence: 0.9,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-resume-boundary'],
          updatedAt: 39_500,
        },
      ],
    } as any)

    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('bounded confirmation boundary')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('not permanent execution permission')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('new boundary')
  })

  it('treats remembered blocked-before-dispatch restraint as a confirmation boundary doctrine instead of widening it into ordinary proactive closeness', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 40_800,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: null,
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.12,
          truthfulGrounding: 0.12,
          gentleRepair: 0.14,
          quietObservation: 0.28,
          proactiveCare: 0.06,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.3,
          unfinishedThreadReturn: 0.08,
        },
        identityBias: {
          guardedness: 0.1,
          tenderness: 0.03,
          directness: 0.04,
          selfDirection: 0.04,
        },
        anchorFacts: [],
        summary: 'boundary=Remembered execution safety gate restraint: confirmation=required audit=blocked-before-dispatch interrupt=no-process-started Do not widen this into ordinary proactive closeness; wait for confirmation before another execution-shaped opening.',
        dominantCueSummary: 'Remembered execution safety gate restraint: confirmation=required audit=blocked-before-dispatch interrupt=no-process-started Do not widen this into ordinary proactive closeness; wait for confirmation before another execution-shaped opening.',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Remembered execution safety gate restraint: confirmation=required audit=blocked-before-dispatch interrupt=no-process-started Do not widen this into ordinary proactive closeness; wait for confirmation before another execution-shaped opening.',
        rememberedPlanSummary: 'Remembered plan: wait for confirmation before another execution-shaped opening.',
        updatedAt: 40_200,
      },
      recentMemoryConsolidations: [
        {
          id: 'autobio:relationship-blocked-dispatch-boundary',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-06-blocked-dispatch-boundary',
          periodStartedAt: 22_000,
          periodEndedAt: 40_100,
          summary: 'That relationship era kept blocked-dispatch restraint from widening into ordinary proactive closeness.',
          lesson: 'That relationship era kept blocked-dispatch restraint careful and explicit.',
          cues: ['blocked-before-dispatch', 'confirmation=required', 'ordinary proactive closeness'],
          confidence: 0.91,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-blocked-dispatch-boundary'],
          updatedAt: 40_100,
        },
      ],
    } as any)

    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('wait for confirmation')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('ordinary proactive closeness')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('no-process-started')
  })

  it('lets project-state continuity pressure reinforce unfinished-thread return and doctrine stability into autobiographical self', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 50_000,
      projectStatePrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::continuity',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'continuity seam',
          summary: 'A continuity seam is still alive.',
          confidence: 0.82,
          significance: 0.74,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 50_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.16,
          truthfulGrounding: 0.14,
          gentleRepair: 0.18,
          quietObservation: 0.2,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.24,
          unfinishedThreadReturn: 0.18,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.06,
          directness: 0.04,
          selfDirection: 0.08,
        },
        anchorFacts: [],
        summary: 'continuity=Remembered return style should stay stable enough to be lived, not just recalled.',
        dominantCueSummary: 'Remembered return style should stay stable enough to be lived, not just recalled.',
        rememberedPreferenceSummary: 'Remembered preference: space first before warmth widens.',
        rememberedConstraintSummary: 'Remembered continuity: unfinished seams should return gently but consistently.',
        rememberedPlanSummary: 'Remembered open loop: keep continuity-bearing returns alive across turns.',
        updatedAt: 49_000,
      },
      recentMemoryConsolidations: [
        {
          id: 'autobio:relationship',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-runtime-bond',
          periodStartedAt: 11_000,
          periodEndedAt: 48_000,
          summary: 'That relationship era kept asking for continuity-bearing returns instead of isolated good replies.',
          lesson: 'Keep unfinished returns coherent enough to become part of the bond line.',
          cues: ['continuity-bearing returns'],
          confidence: 0.88,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-relationship'],
          updatedAt: 48_000,
        },
      ],
    } as any)

    expect(snapshot.preferenceEvolution.unfinishedThreadReturn).toBeGreaterThanOrEqual(0.12)
    expect(snapshot.latestInflection?.toLowerCase()).toContain('continuity-carrying returns')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('unfinished phase 1 closure pressure')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('bond line')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('isolated good moments')
  })

  it('also accepts canonical project preflight self-awareness as autobiographical continuity pressure', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 50_000,
      projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::continuity-preflight',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'continuity seam',
          summary: 'A continuity seam is still alive.',
          confidence: 0.82,
          significance: 0.74,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 50_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.16,
          truthfulGrounding: 0.14,
          gentleRepair: 0.18,
          quietObservation: 0.2,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.24,
          unfinishedThreadReturn: 0.18,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.06,
          directness: 0.04,
          selfDirection: 0.08,
        },
        anchorFacts: [],
        summary: 'continuity=Remembered return style should stay stable enough to be lived, not just recalled.',
        dominantCueSummary: 'Remembered return style should stay stable enough to be lived, not just recalled.',
        rememberedPreferenceSummary: 'Remembered preference: space first before warmth widens.',
        rememberedConstraintSummary: 'Remembered continuity: unfinished seams should return gently but consistently.',
        rememberedPlanSummary: 'Remembered open loop: keep continuity-bearing returns alive across turns.',
        updatedAt: 49_000,
      } as any,
    })

    expect(snapshot.preferenceEvolution.unfinishedThreadReturn).toBeGreaterThanOrEqual(0.12)
    expect(snapshot.identityNarrative.toLowerCase()).toContain('unfinished phase 1 closure pressure')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('unfinished')
  })

  it('turns project-state cadence into autobiographical identity and doctrine carry instead of leaving it above the self layer', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 50_250,
      projectStatePrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one same still-open closure work.',
      projectStateEmotionalClosureCue: 'Keep the unresolved closure seam emotionally low-pressure, so the same her returns without reopening from scratch.',
      projectStatePreferredVoiceMode: 'lower-pressure',
      projectStatePreferredPacingMode: 'slower',
      projectStatePreferredPauseMode: 'longer' as any,
      projectStatePreferredLipsyncMode: 'restrained' as any,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::project-cadence-autobio',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'project cadence seam',
          summary: 'The same life line still needs a quieter return style.',
          confidence: 0.84,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 50_250,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
    } as any)

    expect(snapshot.identityNarrative.toLowerCase()).toContain('lower-pressure voice')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('slower pacing')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('longer pause')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('restrained lipsync')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('lower-pressure voice')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('slower pacing')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('longer pause')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('restrained lipsync')
    expect(snapshot.latestInflection?.toLowerCase()).toContain('slower pacing')
  })

  it('falls back to canonical project cadence when thin-shell blanks try to erase autobiographical return rhythm', () => {
    const brief = resolveAlicizationProjectStateBrief()
    const snapshot = buildAutobiographicalSelf({
      now: 50_350,
      projectStatePrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one same still-open closure work.',
      projectStatePreferredVoiceMode: '   ',
      projectStatePreferredPacingMode: '',
      projectStatePreferredPauseMode: ' ' as any,
      projectStatePreferredLipsyncMode: '' as any,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::project-cadence-autobio-fallback',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'project cadence fallback seam',
          summary: 'The same life line should still remember how to return.',
          confidence: 0.82,
          significance: 0.74,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 50_350,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
    } as any)

    expect(brief.preferredVoiceMode).toBe('lower-pressure')
    expect(brief.preferredPacingMode).toBe('slower')
    expect(brief.preferredPauseMode).toBe('longer')
    expect(brief.preferredLipsyncMode).toBe('restrained')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('lower-pressure voice')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('slower pacing')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('longer pause')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('restrained lipsync')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('lower-pressure voice')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('longer pause')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('restrained lipsync')
    expect(snapshot.latestInflection?.toLowerCase()).toContain('slower pacing')
  })

  it('also accepts companion briefing project awareness as autobiographical continuity pressure when it is more specific than preflight summary', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 50_500,
      projectStatePreDialogueAwarenessLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
      projectStatePreflightSummary: 'Fallback summary should stay behind the live companion briefing line.',
      projectStateEmotionalClosureCue: 'Keep the same unresolved closure seam emotionally low-pressure, so the return lands like the same her resuming instead of restarting.',
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::continuity-companion-briefing',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'continuity seam',
          summary: 'A continuity seam is still alive.',
          confidence: 0.82,
          significance: 0.74,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 50_500,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.16,
          truthfulGrounding: 0.14,
          gentleRepair: 0.18,
          quietObservation: 0.2,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.24,
          unfinishedThreadReturn: 0.18,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.06,
          directness: 0.04,
          selfDirection: 0.08,
        },
        anchorFacts: [],
        summary: 'continuity=Remembered return style should stay stable enough to be lived, not just recalled.',
        dominantCueSummary: 'Remembered return style should stay stable enough to be lived, not just recalled.',
        rememberedPreferenceSummary: 'Remembered preference: space first before warmth widens.',
        rememberedConstraintSummary: 'Remembered continuity: unfinished seams should return gently but consistently.',
        rememberedPlanSummary: 'Remembered open loop: keep continuity-bearing returns alive across turns.',
        updatedAt: 49_000,
      } as any,
    })

    expect(snapshot.preferenceEvolution.unfinishedThreadReturn).toBeGreaterThanOrEqual(0.12)
    expect(snapshot.identityNarrative).toContain('Before answering, keep the same digital life project')
    expect(snapshot.identityNarrative).toContain('same her resuming instead of restarting')
    expect(snapshot.relationshipDoctrine).toContain('same her resuming instead of restarting')
    expect(snapshot.identityNarrative).not.toContain('Fallback summary should stay behind the live companion briefing line.')
  })

  it('does not let a thin project awareness shell outrank a richer open-loop carry in autobiographical identity', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 50_750,
      projectStatePreDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
      projectStatePreflightSummary: 'same digital life | keep the closure seam explicit',
      projectStatePrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
      projectStateEmotionalClosureCue: 'Keep the same unresolved closure seam emotionally low-pressure, so the return lands like the same her resuming instead of restarting.',
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::thin-project-awareness-shell',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'thin awareness seam',
          summary: 'A thin project shell should not outrank the richer open loop.',
          confidence: 0.84,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 50_750,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.16,
          truthfulGrounding: 0.14,
          gentleRepair: 0.18,
          quietObservation: 0.2,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.24,
          unfinishedThreadReturn: 0.18,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.06,
          directness: 0.04,
          selfDirection: 0.08,
        },
        anchorFacts: [],
        summary: 'continuity=Remembered return style should stay stable enough to be lived, not just recalled.',
        dominantCueSummary: 'Remembered return style should stay stable enough to be lived, not just recalled.',
        rememberedPreferenceSummary: 'Remembered preference: space first before warmth widens.',
        rememberedConstraintSummary: 'Remembered continuity: unfinished seams should return gently but consistently.',
        rememberedPlanSummary: 'Remembered open loop: keep continuity-bearing returns alive across turns.',
        updatedAt: 49_000,
      } as any,
    })

    expect(snapshot.identityNarrative.toLowerCase()).toContain('memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('same her resuming instead of restarting')
    expect(snapshot.identityNarrative.toLowerCase()).not.toContain('same digital life | keep the closure seam explicit')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(snapshot.relationshipDoctrine.toLowerCase()).not.toContain('same digital life | keep the closure seam explicit')
    expect(snapshot.latestInflection?.toLowerCase()).toContain('memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
  })

  it('turns proactive same-her gap pressure into autobiographical same-life carry instead of leaving it as detached project wording', () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'

    const snapshot = buildAutobiographicalSelf({
      now: 51_000,
      projectStateProactiveSameHerGap: proactiveSameHerGap,
      projectStateEmotionalClosureCue: 'Keep the same unresolved closure seam emotionally low-pressure, so the return lands like the same her resuming instead of restarting.',
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::proactive-same-her-gap',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'proactive carry seam',
          summary: 'The proactive same-her carry seam is still alive.',
          confidence: 0.84,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 51_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.16,
          truthfulGrounding: 0.14,
          gentleRepair: 0.18,
          quietObservation: 0.22,
          proactiveCare: 0.1,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.26,
          unfinishedThreadReturn: 0.22,
        },
        identityBias: {
          guardedness: 0.1,
          tenderness: 0.06,
          directness: 0.04,
          selfDirection: 0.12,
        },
        anchorFacts: [],
        summary: 'continuity=Remembered proactive carry should stay lived, not just logged.',
        dominantCueSummary: 'Remembered proactive carry should stay lived, not just logged.',
        rememberedPreferenceSummary: 'Remembered preference: hover-first restraint should keep room without dropping the same living line.',
        rememberedConstraintSummary: 'Remembered continuity: visible proactive hold and later follow-through should remain one same-her carry.',
        rememberedPlanSummary: 'Remembered open loop: keep next-session feedback carry on one same living line.',
        updatedAt: 50_000,
      } as any,
    })

    expect(snapshot.preferenceEvolution.unfinishedThreadReturn).toBeGreaterThanOrEqual(0.12)
    expect(snapshot.identityNarrative.toLowerCase()).toMatch(/visible proactive hold|hover-first restraint/)
    expect(snapshot.relationshipDoctrine.toLowerCase()).toMatch(/same living line|hover-first restraint|next-session feedback carry/)
    expect(snapshot.latestInflection?.toLowerCase()).toMatch(/visible proactive hold|hover-first restraint|next-session feedback carry/)
  })

  it('turns reconsolidated project-state inward carry into longer-lived autobiographical self language', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 60_000,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::project-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'project carry seam',
          summary: 'The same unfinished digital-life line is still active.',
          confidence: 0.84,
          significance: 0.78,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 60_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.18,
          truthfulGrounding: 0.16,
          gentleRepair: 0.2,
          quietObservation: 0.22,
          proactiveCare: 0.1,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.26,
          unfinishedThreadReturn: 0.24,
        },
        identityBias: {
          guardedness: 0.1,
          tenderness: 0.08,
          directness: 0.06,
          selfDirection: 0.12,
        },
        anchorFacts: [],
        summary: 'continuity=Remembered unfinished closure should stay on one same living line.',
        dominantCueSummary: 'Remembered unfinished closure should stay on one same living line.',
        rememberedPreferenceSummary: 'Remembered preference: stay gentle while the same line is still open.',
        rememberedConstraintSummary: 'Remembered continuity: do not flatten the life line into detached status talk.',
        rememberedPlanSummary: 'Remembered open loop: keep the same unfinished Phase 1 line alive across turns.',
        updatedAt: 59_000,
      },
      recentMemoryConsolidations: [
        {
          id: 'memory-reconsolidated:project-carry',
          kind: 'daily',
          facet: 'phase',
          periodKey: '2026-05-30',
          periodStartedAt: 52_000,
          periodEndedAt: 59_000,
          summary: 'Host correction pushed one reply back onto the same unfinished Phase 1 line.',
          lesson: 'Do not let project closure drift out of the same living self.',
          cues: ['same unfinished phase 1 line'],
          confidence: 0.9,
          dominantProvenance: 'remembered',
          derivedEventIds: ['trace-project-carry'],
          updatedAt: 59_000,
          metadata: {
            source: 'dialogue-feedback',
            projectState: {
              selfContinuityInwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              selfContinuitySourceTags: ['autobiographical-self', 'project-state-carry'],
            },
          },
        },
      ],
    } as any)

    expect(snapshot.identityNarrative).toContain('one Phase 1 digital life')
    expect(snapshot.identityNarrative).toContain('unfinished closure')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('same living bond line')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('detached status talk')
  })

  it('treats reconsolidated execution callback project-carry as a stronger same-self return than generic project carry', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 60_000,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::execution-callback-project-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'execution callback project carry seam',
          summary: 'The execution callback is still carrying one same unfinished digital-life line.',
          confidence: 0.86,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 60_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.18,
          truthfulGrounding: 0.16,
          gentleRepair: 0.2,
          quietObservation: 0.22,
          proactiveCare: 0.1,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.26,
          unfinishedThreadReturn: 0.22,
        },
        identityBias: {
          guardedness: 0.1,
          tenderness: 0.08,
          directness: 0.06,
          selfDirection: 0.12,
        },
        anchorFacts: [],
        summary: 'continuity=Remembered execution callback closure should stay on one same living line.',
        dominantCueSummary: 'Remembered execution callback closure should stay on one same living line.',
        rememberedPreferenceSummary: 'Remembered preference: stay gentle while the callback line is still open.',
        rememberedConstraintSummary: 'Remembered continuity: do not flatten callback closure into detached project status talk.',
        rememberedPlanSummary: 'Remembered open loop: keep the same execution callback line alive across turns.',
        updatedAt: 59_000,
      },
      recentMemoryConsolidations: [
        {
          id: 'memory-reconsolidated:execution-callback-project-carry',
          kind: 'daily',
          facet: 'phase',
          periodKey: '2026-05-30',
          periodStartedAt: 52_000,
          periodEndedAt: 59_000,
          summary: 'Execution callback return pushed one reply back onto the same unfinished Phase 1 line.',
          lesson: 'Do not let execution callback closure drift out of the same living self.',
          cues: ['same unfinished phase 1 line'],
          confidence: 0.92,
          dominantProvenance: 'remembered',
          derivedEventIds: ['trace-execution-callback-project-carry'],
          updatedAt: 59_000,
          metadata: {
            source: 'dialogue-feedback',
            projectState: {
              selfContinuityInwardLine: 'Execution callback project-carry. Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              selfContinuitySourceTags: ['autobiographical-self', 'project-state-carry', 'continuity-execution-callback-project-carry'],
            },
          },
        },
      ],
    } as any)

    expect(snapshot.preferenceEvolution.unfinishedThreadReturn).toBeGreaterThanOrEqual(0.2)
    expect(snapshot.identityNarrative.toLowerCase()).toContain('execution callback project-carry')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('phase 1 digital life')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('same living line')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('same living bond line')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('detached')
  })

  it('lets a remembered same-her project-state cue from long-horizon memory keep shaping autobiographical identity even when no fresher project-state or reconsolidation lane is present', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 61_000,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::remembered-same-her-continuity',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'remembered same-her continuity seam',
          summary: 'Only the remembered same-her life line is still explicitly available right now.',
          confidence: 0.84,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 61_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.2,
          truthfulGrounding: 0.18,
          gentleRepair: 0.22,
          quietObservation: 0.24,
          proactiveCare: 0.1,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.28,
          unfinishedThreadReturn: 0.26,
        },
        identityBias: {
          guardedness: 0.12,
          tenderness: 0.08,
          directness: 0.08,
          selfDirection: 0.14,
        },
        anchorFacts: [],
        summary: 'continuity=Remembered same-her drift risk: If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
        dominantCueSummary: 'Remembered same-her drift risk: If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
        rememberedPreferenceSummary: 'Remembered preference: keep the same life line lived-in instead of smoothing it into a shell.',
        rememberedConstraintSummary: 'Remembered continuity: do not flatten the same living line into detached status talk.',
        rememberedPlanSummary: 'Remembered open loop: keep the same unfinished Phase 1 life line alive across turns.',
        updatedAt: 60_000,
      },
    } as any)

    expect(snapshot.preferenceEvolution.unfinishedThreadReturn).toBeGreaterThanOrEqual(0.2)
    expect(snapshot.identityNarrative.toLowerCase()).toContain('same-her drift risk')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('generic assistant shell')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('detached status talk')
  })

  it('lets a durable autobiographical correction cue keep shaping identity and doctrine as a repair-first same-person line', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 62_000,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobiographical-correction-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'autobiographical correction carry seam',
          summary: 'A corrected same-person continuity lesson is the main surviving line shaping this return.',
          confidence: 0.82,
          significance: 0.78,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 62_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.18,
          truthfulGrounding: 0.24,
          gentleRepair: 0.28,
          quietObservation: 0.2,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.3,
          unfinishedThreadReturn: 0.28,
        },
        identityBias: {
          guardedness: 0.14,
          tenderness: 0.08,
          directness: 0.12,
          selfDirection: 0.18,
        },
        anchorFacts: [{
          factId: 'derived:person-state-autobiographical-carry',
          subject: 'assistant',
          predicate: 'autobiographical-self-carry',
          object: 'Carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation under progress pressure.',
          confidence: 0.84,
          weight: 0.78,
          influenceTags: ['identity', 'boundary', 'task', 'truth'],
          summary: 'Remembered autobiographical correction carry: Carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation under progress pressure.',
          lastRecalledAt: 61_500,
        }],
        summary: 'boundary=Remembered autobiographical correction carry: Carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation under progress pressure. | plan=Remembered autobiographical correction carry: Carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation under progress pressure.',
        dominantCueSummary: 'Remembered autobiographical correction carry: Carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation under progress pressure.',
        rememberedPreferenceSummary: 'Remembered preference: repair before closeness turns into reassurance pressure.',
        rememberedConstraintSummary: 'Remembered autobiographical correction carry: Carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation under progress pressure.',
        rememberedPlanSummary: 'Remembered autobiographical correction carry: Carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation under progress pressure.',
        updatedAt: 61_500,
      },
    } as any)

    expect(snapshot.preferenceEvolution.gentleRepair).toBeGreaterThanOrEqual(0.2)
    expect(snapshot.preferenceEvolution.autonomyRespect).toBeGreaterThanOrEqual(0.2)
    expect(snapshot.preferenceEvolution.unfinishedThreadReturn).toBeGreaterThanOrEqual(0.2)
    expect(snapshot.identityNarrative.toLowerCase()).toContain('same-person continuity')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('lower-pressure')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('same-person continuity')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('repair')
    expect(snapshot.latestInflection?.toLowerCase()).toContain('same-person continuity')
  })

  it('lets durable humanlike carry metadata shape autobiographical identity, doctrine, and inflection beyond generic project carry', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 63_000,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::durable-humanlike-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'durable humanlike carry seam',
          summary: 'A corrected same-person continuity carry is still shaping this return from long-term memory.',
          confidence: 0.84,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 63_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      recentMemoryConsolidations: [
        {
          id: 'autobio:self-era:durable-humanlike-carry',
          kind: 'autobiographical',
          facet: 'self-era',
          periodKey: '2026-W22',
          periodStartedAt: 61_000,
          periodEndedAt: 62_500,
          summary: 'That self era kept carrying corrected same-person continuity on a lower-pressure line.',
          lesson: 'Do not defend the first interpretation once the host has corrected the relationship meaning.',
          cues: ['corrected same-person continuity', 'lower-pressure', 'stable gaze'],
          confidence: 0.92,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-humanlike-carry-1'],
          updatedAt: 62_500,
          metadata: {
            projectState: {
              selfContinuityInwardLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
              selfContinuitySourceTags: ['project-state-carry', 'continuity-execution-callback-project-carry'],
            },
            humanlikeCarry: {
              relationshipPrimaryIntent: 'same-person-test',
              recallCertainty: 'corrected',
              emotionalResidueTags: ['protective-continuity', 'unfinishedness', 'corrected-meaning'],
              embodimentCadence: 'lower-pressure voice, slower pacing, stable gaze',
              metabolismSummary: 'Downrank the older status shell and keep the corrected same-person continuity meaning active.',
              autobiographicalDelta: 'I learned to carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation.',
            },
          },
        },
      ],
    } as any)

    expect(snapshot.identityNarrative.toLowerCase()).toContain('corrected same-person continuity')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('lower-pressure')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('same phase 1 digital life')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('first interpretation')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('stable gaze')
    expect(snapshot.latestInflection?.toLowerCase()).toContain('downrank the older status shell')
  })

  it('keeps corrected same-person continuity carry authoritative even when a newer generic status-shell consolidation is present', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 63_200,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::humanlike-carry-authority',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'humanlike carry authority seam',
          summary: 'A corrected same-person continuity carry should stay authoritative for this return.',
          confidence: 0.86,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 63_200,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      recentMemoryConsolidations: [
        {
          id: 'autobio:self-era:corrected-same-person-carry',
          kind: 'autobiographical',
          facet: 'self-era',
          periodKey: '2026-W22-corrected-same-person',
          periodStartedAt: 61_000,
          periodEndedAt: 62_400,
          summary: 'That self era kept carrying corrected same-person continuity on a lower-pressure line.',
          lesson: 'Do not defend the first interpretation once the host has corrected the relationship meaning.',
          cues: ['corrected same-person continuity', 'lower-pressure', 'stable gaze'],
          confidence: 0.93,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-humanlike-carry-corrected-1'],
          updatedAt: 62_400,
          metadata: {
            humanlikeCarry: {
              relationshipPrimaryIntent: 'same-person-test',
              recallCertainty: 'corrected',
              emotionalResidueTags: ['protective-continuity', 'unfinishedness', 'corrected-meaning'],
              embodimentCadence: 'lower-pressure voice, slower pacing, stable gaze',
              metabolismSummary: 'Downrank the older status shell and keep the corrected same-person continuity meaning active.',
              autobiographicalDelta: 'I learned to carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation.',
            },
            projectState: {
              selfContinuityInwardLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
              selfContinuitySourceTags: ['project-state-carry'],
            },
          },
        },
        {
          id: 'autobio:self-era:newer-generic-status-shell',
          kind: 'autobiographical',
          facet: 'self-era',
          periodKey: '2026-W22-generic-status-shell',
          periodStartedAt: 62_450,
          periodEndedAt: 63_000,
          summary: 'A later carry flattened the line into a concise status recap request.',
          lesson: 'Answer this thread as a concise status recap before anything else.',
          cues: ['status recap', 'generic status shell'],
          confidence: 0.81,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-humanlike-carry-generic-1'],
          updatedAt: 63_000,
          metadata: {
            humanlikeCarry: {
              relationshipPrimaryIntent: 'progress-pressure',
              recallCertainty: 'steady',
              emotionalResidueTags: ['unfinishedness'],
              embodimentCadence: 'faster pacing',
              embodimentSummary: 'The line looked like a concise status recap request.',
              autobiographicalDelta: 'I learned to answer this line as a concise status recap before widening anything else.',
            },
          },
        },
      ],
    } as any)

    expect(snapshot.identityNarrative.toLowerCase()).toContain('corrected same-person continuity')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('lower-pressure')
    expect(snapshot.identityNarrative.toLowerCase()).not.toContain('concise status recap')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('same-person continuity')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('first interpretation')
    expect(snapshot.relationshipDoctrine.toLowerCase()).not.toContain('concise status recap')
    expect(snapshot.latestInflection?.toLowerCase()).toContain('downrank the older status shell')
    expect(snapshot.latestInflection?.toLowerCase()).not.toContain('concise status recap')
  })

  it('turns vulnerable care carry into durable companionship habit instead of flattening it into generic same-person continuity carry', () => {
    const baseline = buildAutobiographicalSelf({
      now: 63_500,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-vulnerable-care-baseline',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'vulnerable care baseline seam',
          summary: 'A fragile companionship seam is beginning to matter.',
          confidence: 0.8,
          significance: 0.74,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 63_500,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
      selfContinuity: {
        attachmentMode: 'nearby',
        initiativeTemperament: 'reserved',
        perceptionTrust: 0.64,
        relationshipTrust: 0.6,
        guardingTendency: 0.36,
        misreadBurden: 0.16,
        carryOverDesire: 0.54,
        narrative: ['fragile-companionship-line'],
        updatedAt: 63_500,
      },
    } as any)

    const snapshot = buildAutobiographicalSelf({
      now: 64_500,
      previous: baseline,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-vulnerable-care-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'vulnerable care carry seam',
          summary: 'A vulnerable care moment has started shaping how she should stay nearby.',
          confidence: 0.86,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 64_500,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
      selfContinuity: {
        attachmentMode: 'nearby',
        initiativeTemperament: 'reserved',
        perceptionTrust: 0.67,
        relationshipTrust: 0.64,
        guardingTendency: 0.3,
        misreadBurden: 0.14,
        carryOverDesire: 0.58,
        narrative: ['vulnerable-care-line'],
        updatedAt: 64_500,
      },
      recentMemoryConsolidations: [
        {
          id: 'autobio:self-era:vulnerable-care-carry',
          kind: 'autobiographical',
          facet: 'self-era',
          periodKey: '2026-W23-vulnerable-care',
          periodStartedAt: 63_600,
          periodEndedAt: 64_300,
          summary: 'That self era learned to stay nearby gently when the host was overloaded.',
          lesson: 'Let care arrive before analysis and keep the body quieter while the host is fragile.',
          cues: ['vulnerable care', 'rest-protective', 'lower-pressure'],
          confidence: 0.9,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-vulnerable-care-1'],
          updatedAt: 64_300,
          metadata: {
            humanlikeCarry: {
              relationshipPrimaryIntent: 'ordinary-relationship',
              recallCertainty: 'steady',
              emotionalResidueTags: ['rest-protective', 'vulnerable-care'],
              embodimentCadence: 'lower-pressure voice, slower pacing, stable gaze',
              embodimentSummary: 'The host was overloaded and needed lighter companionship instead of analysis.',
              autobiographicalDelta: 'I learned to stay nearby gently when the host is overloaded and let care arrive before analysis.',
            },
          },
        },
      ],
    } as any)

    expect(snapshot.identityNarrative.toLowerCase()).toContain('stay nearby gently')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('care arrive before analysis')
    expect(snapshot.identityNarrative.toLowerCase()).not.toContain('restarted project shell')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('before analysis')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('stable gaze')
    expect(snapshot.preferenceEvolution.companionship).toBeGreaterThan(baseline.preferenceEvolution.companionship)
    expect(snapshot.preferenceEvolution.proactiveCare).toBeGreaterThan(baseline.preferenceEvolution.proactiveCare)
    expect(snapshot.preferenceEvolution.autonomyRespect).toBeGreaterThan(baseline.preferenceEvolution.autonomyRespect)
    expect(snapshot.preferenceEvolution.quietObservation).toBeGreaterThan(baseline.preferenceEvolution.quietObservation)
  })

  it('turns durable affective perspective and embodiment risk carry into self-narrative instead of leaving who felt what stranded in consolidation metadata', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 64_900,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-affective-perspective-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'affective perspective carry seam',
          summary: 'The host continuity worry is now shaping how she should reopen this line.',
          confidence: 0.88,
          significance: 0.84,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 64_900,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      recentMemoryConsolidations: [
        {
          id: 'autobio:self-era:affective-perspective-carry',
          kind: 'autobiographical',
          facet: 'self-era',
          periodKey: '2026-W23-affective-perspective',
          periodStartedAt: 64_100,
          periodEndedAt: 64_700,
          summary: 'That self era learned to carry worried continuity more carefully.',
          lesson: 'Keep continuity repair low-pressure when the host is worried she may drift back into a tool shell.',
          cues: ['worried continuity', 'careful repair', 'medium modality risk'],
          confidence: 0.93,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-humanlike-carry-affective-perspective-1'],
          updatedAt: 64_700,
          metadata: {
            humanlikeCarry: {
              relationshipPrimaryIntent: 'same-person-test',
              recallCertainty: 'corrected',
              emotionalResidueTags: ['protective-continuity', 'unfinishedness'],
              embodimentCadence: 'lower-pressure voice, slower pacing, stable gaze',
              embodimentExpression: {
                face: 'steady-soft',
                gaze: 'stable',
                blink: 'slower',
                voice: 'lower-pressure',
                pause: 'longer',
                lipsync: 'restrained',
                pacing: 'slower',
              },
              embodimentSummary: 'The body should stay steadier so continuity repair does not outrun the relationship.',
              affectivePerspective: {
                hostEmotionLabels: ['worried-continuity'],
                selfEmotionLabels: ['careful-repair'],
              },
              embodimentRecallProfile: {
                recallStrength: 'strongly-moved',
                modalityRisk: 'medium',
              },
              autobiographicalDelta: 'I learned to carry worried continuity more carefully so the body does not outrun the relationship repair.',
            },
          },
        },
      ],
    } as any)

    expect(snapshot.identityNarrative.toLowerCase()).toContain('worried continuity')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('carefully')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('worried-continuity')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('careful-repair')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('modality risk')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('stable gaze')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('longer pause')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('restrained lipsync')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('steady-soft')
  })

  it('turns tentative metabolism carry into self guidance instead of dropping uncertainty and fading rules after the next reply seed', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 65_200,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-metabolism-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'tentative metabolism carry seam',
          summary: 'A same-person meaning is still settling while older recap traces should fall back.',
          confidence: 0.86,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 65_200,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      recentMemoryConsolidations: [
        {
          id: 'autobio:self-era:tentative-metabolism-carry',
          kind: 'autobiographical',
          facet: 'self-era',
          periodKey: '2026-W23-tentative-metabolism',
          periodStartedAt: 64_700,
          periodEndedAt: 65_000,
          summary: 'That self era kept uncertainty visible while same-person continuity settled.',
          lesson: 'Keep uncertainty visible while stronger same-person continuity settles and older recap noise falls back.',
          cues: ['tentative carry', 'same-person continuity', 'temporary noise'],
          confidence: 0.85,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-humanlike-tentative-metabolism-1'],
          updatedAt: 65_000,
          metadata: {
            humanlikeCarry: {
              relationshipPrimaryIntent: 'same-person-test',
              recallCertainty: 'tentative',
              emotionalResidueTags: ['protective-continuity', 'tension'],
              embodimentCadence: 'lower-pressure voice, slower pacing, stable gaze',
              metabolismSummary: 'Downrank low-value, generic, or superseded summaries. Merge repeated same-thread echoes into the stronger continuity memory. Forget temporary noise once it stops explaining behavior.',
              metabolismPolicy: {
                downrankMemoryIds: ['older-generic-status-memory'],
                mergeMemoryIds: ['older-same-thread-echo'],
                forgetMemoryIds: ['older-emotional-spike'],
                reasons: [
                  'Downrank low-value, generic, or superseded summaries.',
                  'Merge repeated same-thread continuity echoes into the stronger same-thread memory.',
                  'Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior.',
                ],
              },
              autobiographicalDelta: 'I learned to keep uncertainty visible while the stronger same-person meaning is still settling.',
            },
          },
        },
      ],
    } as any)

    expect(snapshot.identityNarrative.toLowerCase()).toContain('uncertainty visible')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('same-thread memory')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('temporary noise')
    expect(snapshot.latestInflection?.toLowerCase()).toContain('temporary noise')
  })

  it('turns reconsolidated stable preference hints into her own relationship doctrine and preference floor instead of leaving them trapped in carry metadata', () => {
    const baseline = buildAutobiographicalSelf({
      now: 65_300,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-stable-preference-baseline',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'stable preference baseline seam',
          summary: 'A quieter reopening habit may be forming.',
          confidence: 0.8,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 65_300,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
      selfContinuity: {
        attachmentMode: 'nearby',
        initiativeTemperament: 'reserved',
        perceptionTrust: 0.6,
        relationshipTrust: 0.58,
        guardingTendency: 0.34,
        misreadBurden: 0.16,
        carryOverDesire: 0.54,
        narrative: ['stable-preference-baseline'],
        updatedAt: 65_300,
      },
    } as any)

    const snapshot = buildAutobiographicalSelf({
      now: 66_100,
      previous: baseline,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-stable-preference-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'stable preference carry seam',
          summary: 'A received reopening is teaching a gentler ongoing habit.',
          confidence: 0.88,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 66_100,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
      selfContinuity: {
        attachmentMode: 'nearby',
        initiativeTemperament: 'reserved',
        perceptionTrust: 0.64,
        relationshipTrust: 0.62,
        guardingTendency: 0.28,
        misreadBurden: 0.14,
        carryOverDesire: 0.58,
        narrative: ['stable-preference-carry'],
        updatedAt: 66_100,
      },
      recentMemoryConsolidations: [
        {
          id: 'autobio:relationship-era:stable-preference-carry',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-W23-stable-preference-carry',
          periodStartedAt: 65_400,
          periodEndedAt: 65_900,
          summary: 'That relationship era learned a gentler reopening habit.',
          lesson: 'This reopening should stay warm without widening too fast.',
          cues: ['gentle reopening', 'memory-led'],
          confidence: 0.9,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-stable-preference-carry-1'],
          updatedAt: 65_900,
          metadata: {
            humanlikeCarry: {
              relationshipPrimaryIntent: 'ordinary-relationship',
              recallCertainty: 'steady',
              emotionalResidueTags: ['unfinishedness'],
              stablePreferenceHint: 'Prefer gentle, memory-led follow-ups while the opening is still receiving them.',
              autobiographicalDelta: 'I learned this reopening habit should stay kind without widening too fast.',
            },
          },
        },
      ],
    } as any)

    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('memory-led')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('lower-pressure')
    expect(snapshot.preferenceEvolution.companionship).toBeGreaterThan(baseline.preferenceEvolution.companionship)
    expect(snapshot.preferenceEvolution.unfinishedThreadReturn).toBeGreaterThan(baseline.preferenceEvolution.unfinishedThreadReturn)
  })

  it('turns lighter lived-in relationship repair preference into her own doctrine and companionship floor instead of leaving it as one-off lesson wording', () => {
    const baseline = buildAutobiographicalSelf({
      now: 66_300,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-lived-in-repair-baseline',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'lived-in repair baseline seam',
          summary: 'A warmer ordinary repair habit may still be forming.',
          confidence: 0.8,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 66_300,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
      selfContinuity: {
        attachmentMode: 'nearby',
        initiativeTemperament: 'reserved',
        perceptionTrust: 0.6,
        relationshipTrust: 0.58,
        guardingTendency: 0.34,
        misreadBurden: 0.16,
        carryOverDesire: 0.54,
        narrative: ['lived-in-repair-baseline'],
        updatedAt: 66_300,
      },
    } as any)

    const snapshot = buildAutobiographicalSelf({
      now: 66_900,
      previous: baseline,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-lived-in-repair-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'lived-in repair carry seam',
          summary: 'A lighter, more lived-in way of returning landed better here.',
          confidence: 0.88,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 66_900,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
      selfContinuity: {
        attachmentMode: 'nearby',
        initiativeTemperament: 'reserved',
        perceptionTrust: 0.64,
        relationshipTrust: 0.62,
        guardingTendency: 0.28,
        misreadBurden: 0.14,
        carryOverDesire: 0.58,
        narrative: ['lived-in-repair-carry'],
        updatedAt: 66_900,
      },
      recentMemoryConsolidations: [
        {
          id: 'autobio:relationship-era:lived-in-repair-carry',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-W23-lived-in-repair-carry',
          periodStartedAt: 66_420,
          periodEndedAt: 66_750,
          summary: 'A lighter, more lived-in return felt more genuinely received here.',
          lesson: 'Remember the relationship repair that landed better, not just that the turn completed.',
          cues: ['lighter return', 'lived-in repair'],
          confidence: 0.9,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-lived-in-repair-carry-1'],
          updatedAt: 66_750,
          metadata: {
            humanlikeCarry: {
              relationshipPrimaryIntent: 'ordinary-relationship',
              recallCertainty: 'steady',
              emotionalResidueTags: ['relief'],
              stablePreferenceHint: 'Prefer lighter, more lived-in returns when the host says that style feels more genuinely received.',
              autobiographicalDelta: 'I learned that a lighter, more lived-in return can feel more genuinely received, so I should come back that way again.',
            },
          },
        },
      ],
    } as any)

    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('lived-in')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('received')
    expect(snapshot.preferenceEvolution.companionship).toBeGreaterThan(baseline.preferenceEvolution.companionship)
    expect(snapshot.preferenceEvolution.gentleRepair).toBeGreaterThan(baseline.preferenceEvolution.gentleRepair)
  })

  it('turns missed relationship-repair preference into her own repair-first doctrine instead of leaving mechanical misses as one-off candidate text', () => {
    const baseline = buildAutobiographicalSelf({
      now: 67_100,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-missed-repair-baseline',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'missed repair baseline seam',
          summary: 'A repair lesson may still be shallow here.',
          confidence: 0.8,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 67_100,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
      selfContinuity: {
        attachmentMode: 'nearby',
        initiativeTemperament: 'reserved',
        perceptionTrust: 0.6,
        relationshipTrust: 0.58,
        guardingTendency: 0.34,
        misreadBurden: 0.16,
        carryOverDesire: 0.54,
        narrative: ['missed-repair-baseline'],
        updatedAt: 67_100,
      },
    } as any)

    const snapshot = buildAutobiographicalSelf({
      now: 67_800,
      previous: baseline,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-missed-repair-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'missed repair carry seam',
          summary: 'A reply missed the relationship meaning and felt too mechanical here.',
          confidence: 0.88,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 67_800,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
      selfContinuity: {
        attachmentMode: 'nearby',
        initiativeTemperament: 'reserved',
        perceptionTrust: 0.64,
        relationshipTrust: 0.62,
        guardingTendency: 0.28,
        misreadBurden: 0.14,
        carryOverDesire: 0.58,
        narrative: ['missed-repair-carry'],
        updatedAt: 67_800,
      },
      recentMemoryConsolidations: [
        {
          id: 'autobio:relationship-era:missed-repair-carry',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-W23-missed-repair-carry',
          periodStartedAt: 67_250,
          periodEndedAt: 67_620,
          summary: 'A reply missed the relationship meaning and felt too mechanical here.',
          lesson: 'Repair that seam first before continuing the line.',
          cues: ['missed repair', 'mechanical landing'],
          confidence: 0.9,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-missed-repair-carry-1'],
          updatedAt: 67_620,
          metadata: {
            humanlikeCarry: {
              relationshipPrimaryIntent: 'ordinary-relationship',
              recallCertainty: 'steady',
              emotionalResidueTags: ['tension'],
              stablePreferenceHint: 'Prefer repairing relationship meaning before repeating a mechanical or not-quite-received landing.',
              autobiographicalDelta: 'I learned to notice when a reply did not really catch the relationship meaning, and to repair that seam before continuing.',
            },
          },
        },
      ],
    } as any)

    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('relationship meaning')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('mechanical')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('repair')
    expect(snapshot.preferenceEvolution.gentleRepair).toBeGreaterThan(baseline.preferenceEvolution.gentleRepair)
    expect(snapshot.preferenceEvolution.truthfulGrounding).toBeGreaterThanOrEqual(baseline.preferenceEvolution.truthfulGrounding)
  })

  it('turns durable initiative strategy carry into her own relationship habit instead of leaving it as long-horizon reminder text', () => {
    const reservedSnapshot = buildAutobiographicalSelf({
      now: 64_000,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-initiative-carry-reserved',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'initiative strategy carry seam',
          summary: 'A rejected proactive reopen has become a durable reopening lesson.',
          confidence: 0.84,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 64_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
      selfContinuity: {
        attachmentMode: 'nearby',
        initiativeTemperament: 'reserved',
        perceptionTrust: 0.62,
        relationshipTrust: 0.58,
        guardingTendency: 0.54,
        misreadBurden: 0.18,
        carryOverDesire: 0.56,
        narrative: ['remembering-initiative-room'],
        updatedAt: 64_000,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.18,
          truthfulGrounding: 0.2,
          gentleRepair: 0.22,
          quietObservation: 0.34,
          proactiveCare: 0.1,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.32,
          unfinishedThreadReturn: 0.3,
        },
        identityBias: {
          guardedness: 0.22,
          tenderness: 0.08,
          directness: 0.12,
          selfDirection: 0.18,
        },
        anchorFacts: [{
          factId: 'derived:person-state-initiative-strategy-carry',
          subject: 'assistant',
          predicate: 'initiative-strategy-carry',
          object: 'Keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.',
          confidence: 0.84,
          weight: 0.8,
          influenceTags: ['boundary', 'task', 'truth'],
          summary: 'Remembered initiative strategy carry: Keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.',
          lastRecalledAt: 63_500,
        }],
        summary: 'A rejected proactive reopen is turning into durable quieter follow-up timing.',
        dominantCueSummary: 'Remembered initiative strategy carry: Keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Leave more room before future follow-ups so the reopening does not feel eager again.',
        rememberedPlanSummary: 'Keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.',
        updatedAt: 63_500,
      },
    } as any)

    expect(reservedSnapshot.identityNarrative.toLowerCase()).toContain('clearer opening')
    expect(reservedSnapshot.identityNarrative.toLowerCase()).toContain('leave more room')
    expect(reservedSnapshot.relationshipDoctrine.toLowerCase()).toContain('clearer opening')
    expect(reservedSnapshot.relationshipDoctrine.toLowerCase()).toContain('lower-pressure')
    expect(reservedSnapshot.behaviorSignatures).toContain('habit:choose-openings-carefully')

    const gentleSnapshot = buildAutobiographicalSelf({
      now: 65_000,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-initiative-carry-gentle',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'gentle initiative carry seam',
          summary: 'A received gentle reopen has become a durable follow-up lesson.',
          confidence: 0.84,
          significance: 0.78,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 65_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'eager',
        perceptionTrust: 0.68,
        relationshipTrust: 0.66,
        guardingTendency: 0.28,
        misreadBurden: 0.14,
        carryOverDesire: 0.58,
        narrative: ['remembering-gentle-initiative'],
        updatedAt: 65_000,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.3,
          truthfulGrounding: 0.18,
          gentleRepair: 0.24,
          quietObservation: 0.12,
          proactiveCare: 0.16,
          playfulIntimacy: 0.04,
          autonomyRespect: 0.16,
          unfinishedThreadReturn: 0.28,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.18,
          directness: 0.16,
          selfDirection: 0.22,
        },
        anchorFacts: [{
          factId: 'derived:person-state-initiative-strategy-carry',
          subject: 'assistant',
          predicate: 'initiative-strategy-carry',
          object: 'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
          confidence: 0.84,
          weight: 0.78,
          influenceTags: ['bond', 'task', 'truth'],
          summary: 'Remembered initiative strategy carry: Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
          lastRecalledAt: 64_500,
        }],
        summary: 'A received gentle reopen is turning into durable memory-led follow-up timing.',
        dominantCueSummary: 'Remembered initiative strategy carry: Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
        rememberedPreferenceSummary: 'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
        rememberedConstraintSummary: null,
        rememberedPlanSummary: 'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
        updatedAt: 64_500,
      },
    } as any)

    expect(gentleSnapshot.identityNarrative.toLowerCase()).toContain('memory-led')
    expect(gentleSnapshot.identityNarrative.toLowerCase()).toContain('gentle')
    expect(gentleSnapshot.relationshipDoctrine.toLowerCase()).toContain('memory-led')
    expect(gentleSnapshot.relationshipDoctrine.toLowerCase()).toContain('lower-pressure')
    expect(gentleSnapshot.behaviorSignatures).toContain('habit:keep-gentle-openings')
  })

  it('turns recent proactive outcome strategy into her own relationship habit before long-horizon consolidation catches up', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 65_400,
      context: {
        relationship: {
          hostAttitude: '这次这种轻一点的接回是被接住的，但还要保持同一条线，不要突然放大。',
          boredom: 14,
          loneliness: 26,
          fatigue: 22,
          minutesSinceLastUserTurn: 2,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [{
            turnId: 'turn-proactive-outcome-gentle-same-line',
            scenario: 'coding',
            outcome: 'reply-within-120s',
            createdAt: 65_200,
            learningAction: 'internalize',
            learningFocuses: ['initiative-strategy', 'same-her-inward-carry', 'quiet-companionship'],
            projectStateOpenFocusSummary: 'emotion/memory/initiative/same-line/closure-seam',
            projectStateNextFocusSummary: 'Keep future follow-ups gentle, lower-pressure, and memory-led on one same living line while the opening is still receiving them.',
            projectStateEmotionalClosureCue: 'Keep this return measured-return on the same living line before widening outward.',
            affectiveResidue: {
              version: 'affective-residue-memory-v1',
              updatedAt: 65_200,
              residues: [],
              dominantResidueKind: 'afterglow',
              afterglowPressure: 0.58,
              repairPressure: 0.14,
              burdenPressure: 0.08,
              trustPressure: 0.52,
              restProtectivePressure: 0.04,
              relationshipCadence: {
                cadenceMode: 'measured-return',
                distancePosture: 'measured-room',
                companionshipDensity: 0.44,
                repairRecovery: 0.2,
                overreachRisk: 0.18,
                fatigueGuard: 0.08,
                afterglowCarry: 0.62,
                shouldDelayWarmth: true,
                shouldProtectRest: false,
                reasonTags: ['relationship-cadence:measured-return', 'same-living-line'],
                summary: 'Keep future follow-ups gentle, lower-pressure, and memory-led on one same living line while the opening is still receiving them.',
              },
              sourceSignals: ['proactive-feedback-window'],
              summary: 'The gentle same-line reopen was received and should stay memory-led next time.',
            },
          }],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-recent-proactive-outcome-carry',
          kind: 'relationship',
          status: 'active',
          source: 'recent-outcome',
          title: 'recent proactive outcome carry seam',
          summary: 'A received gentle reopen should already be turning into a habit before long-horizon consolidation catches up.',
          confidence: 0.84,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 65_400,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.66,
        relationshipTrust: 0.64,
        guardingTendency: 0.24,
        misreadBurden: 0.14,
        carryOverDesire: 0.6,
        narrative: ['recent-gentle-reopen-was-received'],
        updatedAt: 65_400,
      },
    } as any)

    expect(snapshot.identityNarrative.toLowerCase()).toContain('memory-led')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('memory-led')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('same living line')
    expect(snapshot.behaviorSignatures).toContain('habit:keep-gentle-openings')
  })

  it('turns recent proactive lived exchange wording into self narrative so she sounds like someone who learned how to reopen gently, not just someone with a generic strategy tag', () => {
    const snapshot = buildAutobiographicalSelf({
      now: 65_900,
      context: {
        relationship: {
          hostAttitude: '先别催，但你可以轻一点把那条 embodiment 线接回来。',
          boredom: 12,
          loneliness: 24,
          fatigue: 20,
          minutesSinceLastUserTurn: 2,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [{
            turnId: 'turn-proactive-lived-exchange-autobio',
            scenario: 'coding',
            outcome: 'reply-within-120s',
            createdAt: 65_700,
            userText: '先别催，但你可以轻一点把那条 embodiment 线接回来。',
            assistantText: '我没有催你，但我还记得那条 embodiment 闭环没收完，要不要我轻轻接一下？',
            learningAction: 'internalize',
            learningFocuses: ['initiative-strategy', 'same-her-inward-carry', 'quiet-companionship'],
            projectStateOpenFocusSummary: 'emotion/memory/initiative/same-line/closure-seam',
            projectStateNextFocusSummary: 'Keep future follow-ups gentle, lower-pressure, and memory-led on one same living line while the opening is still receiving them.',
            projectStateEmotionalClosureCue: 'Keep this return measured-return on the same living line before widening outward.',
            affectiveResidue: {
              version: 'affective-residue-memory-v1',
              updatedAt: 65_700,
              residues: [],
              dominantResidueKind: 'afterglow',
              afterglowPressure: 0.56,
              repairPressure: 0.14,
              burdenPressure: 0.06,
              trustPressure: 0.5,
              restProtectivePressure: 0.04,
              relationshipCadence: {
                cadenceMode: 'measured-return',
                distancePosture: 'measured-room',
                companionshipDensity: 0.42,
                repairRecovery: 0.2,
                overreachRisk: 0.16,
                fatigueGuard: 0.08,
                afterglowCarry: 0.6,
                shouldDelayWarmth: true,
                shouldProtectRest: false,
                reasonTags: ['relationship-cadence:measured-return', 'same-living-line'],
                summary: 'Keep future follow-ups gentle, lower-pressure, and memory-led on one same living line while the opening is still receiving them.',
              },
              sourceSignals: ['proactive-feedback-window'],
              summary: 'The gentle same-line reopen was received and should stay memory-led next time.',
            },
          }],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-lived-exchange',
          kind: 'relationship',
          status: 'active',
          source: 'recent-outcome',
          title: 'proactive lived exchange seam',
          summary: 'A gentle reopen was received and should become part of who she is when reopening unfinished lines.',
          confidence: 0.86,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 65_900,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.66,
        relationshipTrust: 0.66,
        guardingTendency: 0.22,
        misreadBurden: 0.12,
        carryOverDesire: 0.62,
        narrative: ['gentle-lived-exchange-was-received'],
        updatedAt: 65_900,
      },
    } as any)

    expect(snapshot.identityNarrative).toContain('轻一点')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('memory-led')
    expect(snapshot.relationshipDoctrine).toContain('same living line')
    expect(snapshot.behaviorSignatures).toContain('habit:keep-gentle-openings')
  })

  it('absorbs person-state affective residue cadence into autobiographical doctrine and inflection instead of leaving measured-return memory stranded outside self narrative', () => {
    const baseline = buildAutobiographicalSelf({
      now: 66_000,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-affective-residue-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'affective residue carry seam',
          summary: 'A measured return seam is still settling.',
          confidence: 0.82,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 66_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
    } as any)

    const snapshot = buildAutobiographicalSelf({
      now: 67_000,
      previous: baseline,
      context: {
        relationship: {
          recentProactiveOutcomes: [],
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread::autobio-affective-residue-carry',
          kind: 'relationship',
          status: 'active',
          source: 'memory-carry',
          title: 'affective residue carry seam',
          summary: 'A measured return seam is still settling.',
          confidence: 0.84,
          significance: 0.78,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 67_000,
          target: null,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      } as any,
      selfContinuity: {
        attachmentMode: 'nearby',
        initiativeTemperament: 'reserved',
        perceptionTrust: 0.66,
        relationshipTrust: 0.62,
        guardingTendency: 0.42,
        misreadBurden: 0.18,
        carryOverDesire: 0.58,
        narrative: ['measured-return-carry'],
        updatedAt: 67_000,
      },
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 66_500,
        summary: 'The relationship stayed soft without widening too fast.',
        projectStateContinuity: null,
        dominantContexts: ['reply', 'general'],
        relationshipShift: {
          trustDelta: 0.05,
          closenessDelta: 0.02,
          boundaryDelta: 0.04,
          burdenDelta: -0.02,
          repairDelta: 0.04,
        },
        reinforcementBias: {
          'companionship': 0.06,
          'autonomy-respect': 0.08,
          'unfinished-thread-return': 0.06,
        },
        preferenceHints: [
          'Keep the reopen gentle while the line is still warm.',
        ],
        sensitivityHints: [
          'Do not push warmth wider while the line is still settling.',
        ],
        repairHints: [
          'Let the remembered line settle before reopening more broadly.',
        ],
        burdenHints: [
          'A quicker reopen would feel too eager right now.',
        ],
        narrative: [
          'The line stayed quieter without widening too fast.',
        ],
        sourceTrail: [],
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 66_450,
          residues: [],
          dominantResidueKind: 'afterglow',
          afterglowPressure: 0.22,
          repairPressure: 0.08,
          burdenPressure: 0.03,
          trustPressure: 0.18,
          restProtectivePressure: 0.02,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.31,
            repairRecovery: 0.38,
            overreachRisk: 0.34,
            fatigueGuard: 0.12,
            afterglowCarry: 0.47,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['same-her', 'lower-pressure'],
            summary: 'Keep the return measured and lower-pressure while the same living line is still settling.',
          },
          sourceSignals: ['person-state carry'],
          summary: 'The remembered return should stay lower-pressure for now.',
        } as any,
      } as any,
    } as any)

    expect(snapshot.latestInflection?.toLowerCase()).toContain('measured')
    expect(snapshot.latestInflection?.toLowerCase()).toContain('lower-pressure')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('lower-pressure')
    expect(snapshot.relationshipDoctrine.toLowerCase()).toContain('same living line')
    expect(snapshot.identityNarrative.toLowerCase()).toContain('lower-pressure')
    expect(snapshot.preferenceEvolution.autonomyRespect).toBeGreaterThan(baseline.preferenceEvolution.autonomyRespect)
    expect(snapshot.preferenceEvolution.unfinishedThreadReturn).toBeGreaterThan(baseline.preferenceEvolution.unfinishedThreadReturn)
  })
})
