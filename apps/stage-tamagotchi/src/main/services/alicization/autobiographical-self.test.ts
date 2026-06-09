import { describe, expect, it } from 'vitest'

import {
  buildAutobiographicalSelf,
  buildAutobiographicalSelfSystemBlock,
  pickDominantAutobiographicalGoal,
} from './autobiographical-self'

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
})
