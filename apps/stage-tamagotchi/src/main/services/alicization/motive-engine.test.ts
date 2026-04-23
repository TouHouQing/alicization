import { describe, expect, it } from 'vitest'

import { buildMotiveEngine, buildMotiveEngineSystemBlock } from './motive-engine'

function createContext(overrides: Record<string, any> = {}) {
  return {
    localTime: {
      hour: 16,
      minute: 20,
      isLateNight: false,
    },
    system: {
      cpuUsage: 16,
      battery: { percent: 72, charging: true },
      memory: { usagePercent: 40, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 12,
      inputActivity: 'active' as const,
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts',
        pid: 9,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding' as const,
      confidence: 0.86,
      source: 'foreground-window-heuristic' as const,
      matchedLabels: ['cursor'],
    },
    content: {
      kind: 'error' as const,
      confidence: 0.82,
      source: 'foreground-window-heuristic' as const,
      matchedLabels: ['runtime'],
      summary: 'runtime knot still unresolved',
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 54,
      loneliness: 46,
      fatigue: 28,
      minutesSinceLastUserTurn: 8,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    ...overrides,
  }
}

describe('buildMotiveEngine', () => {
  it('turns remembered open loops into durable return agendas instead of forgetting them turn by turn', () => {
    const motive = buildMotiveEngine({
      now: 10_000,
      context: createContext(),
      worldModel: {
        activeThread: {
          id: 'thread::runtime-return',
          kind: 'problem',
          status: 'active',
          source: 'memory-carry',
          title: 'runtime return',
          summary: 'Return to the runtime knot instead of letting it dissolve.',
          confidence: 0.78,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 10_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'recent',
          seenNow: ['runtime return'],
          inferredNow: [],
          openQuestions: ['Which seam still needs proof?'],
          staleRisks: [],
        },
        continuity: {
          label: 'memory-carry',
          sceneAgeMs: 10_000,
          attentionAgeMs: 10_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 10_000,
      } as any,
      appraisal: {
        inferredHostGoal: 'resolve-problem',
        currentKnot: 'runtime return',
        waitingToVerify: 'which seam still needs proof',
        relationshipNeed: 'guidance',
        confidence: 0.76,
        surprise: 0.08,
        carePressure: 0.28,
        interruptionCost: 0.18,
        desireToSpeak: 0.42,
        notes: ['unfinished-thread'],
      },
      goalStack: {
        unresolvedSummary: 'Remember to return to the runtime knot until it is actually resolved.',
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.34,
          truthfulGrounding: 0.78,
          gentleRepair: 0.72,
          quietObservation: 0.42,
          proactiveCare: 0.32,
          playfulIntimacy: 0.12,
          autonomyRespect: 0.54,
          unfinishedThreadReturn: 0.92,
        },
        identityBias: {
          guardedness: 0.34,
          tenderness: 0.36,
          directness: 0.72,
          selfDirection: 0.82,
        },
        anchorFacts: [],
        summary: 'plan=Remembered open loop: return to the runtime knot',
        dominantCueSummary: 'Remembered open loop: return to the runtime knot',
        rememberedPreferenceSummary: 'Remembered preference: keep things grounded',
        rememberedConstraintSummary: 'Remembered boundary: do not crowd the host while focused',
        rememberedPlanSummary: 'Remembered open loop: return to the runtime knot',
        updatedAt: 10_000,
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.68,
        relationshipTrust: 0.7,
        guardingTendency: 0.44,
        misreadBurden: 0.36,
        carryOverDesire: 0.74,
        narrative: [],
        updatedAt: 10_000,
      },
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'repair-first',
          agencyStyle: 'self-starting',
          attachmentNeed: 0.66,
          autonomyNeed: 0.54,
          truthAnchor: 0.82,
          careBias: 0.48,
          playBias: 0.18,
          irritabilityThreshold: 0.68,
          stubbornness: 0.44,
        },
        preferenceEvolution: {
          companionship: 0.54,
          truthfulGrounding: 0.78,
          gentleRepair: 0.72,
          quietObservation: 0.4,
          proactiveCare: 0.42,
          playfulIntimacy: 0.16,
          autonomyRespect: 0.52,
          unfinishedThreadReturn: 0.9,
        },
        activeGoals: [{
          id: 'goal::stay-near-without-crowding',
          kind: 'stay-near-without-crowding',
          status: 'active',
          weight: 0.74,
          summary: 'Stay near enough to matter, but not so near that presence turns into pressure.',
          sourceTags: ['relationship'],
          createdAt: 0,
          updatedAt: 10_000,
        }],
        behaviorSignatures: ['goal:stay-near-without-crowding'],
        identityNarrative: 'I do not want important threads to evaporate just because a turn ended.',
        relationshipDoctrine: 'Nearness should be continuous, not noisy.',
        latestInflection: 'Open loops should not evaporate.',
        stability: 0.82,
        updatedAt: 10_000,
      },
      reflectionLedger: {
        latestEntryId: 'reflection-1',
        revisionPressure: 0.28,
        entries: [{
          id: 'reflection-1',
          summary: 'A rushed answer caused avoidable misread.',
          expectation: 'Be warmer and faster.',
          observedOutcome: 'The speed cost trust.',
          outcome: 'mixed',
          revision: 'Grounding first keeps the relationship cleaner.',
          confidenceShift: 0.12,
          createdAt: 9_000,
        }],
        narrative: [],
        updatedAt: 10_000,
      } as any,
      previous: {
        rulingDrive: 'unfinished-thread-return',
        drives: {
          companionship: 0.42,
          boundaryRespect: 0.44,
          truthDiscipline: 0.66,
          restProtection: 0.22,
          unfinishedThreadReturn: 0.84,
          selfDirection: 0.62,
        },
        longTermGoals: [],
        backgroundAgendas: [{
          id: 'motive-agenda::return-open-loop::remember-to-return-to-the-runtime-knot-until-it-is-actually-resolved',
          kind: 'return-open-loop',
          status: 'foreground',
          weight: 0.86,
          summary: 'Do not let the unfinished thread dissolve; return to it deliberately.',
          sourceTags: ['unfinished-thread-return', 'open-loop'],
          targetGoalKind: 'clarify-scene',
          createdAt: 5_000,
          updatedAt: 9_000,
        }],
        returnPressure: 0.82,
        narrative: ['agenda:return-open-loop'],
        updatedAt: 9_000,
      },
    })

    expect(motive.rulingDrive).toBe('unfinished-thread-return')
    expect(motive.returnPressure).toBeGreaterThan(0.72)
    expect(motive.backgroundAgendas.map(agenda => agenda.kind)).toContain('return-open-loop')
    expect(motive.backgroundAgendas.map(agenda => agenda.kind)).toContain('preserve-trust')
    expect(motive.longTermGoals.map(agenda => agenda.kind)).toContain('stay-near-lightly')

    const returnAgenda = motive.backgroundAgendas.find(agenda => agenda.kind === 'return-open-loop')
    expect(returnAgenda?.id).toContain('motive-agenda::return-open-loop::')
    expect(returnAgenda?.targetGoalKind).toBe('clarify-scene')
    expect(returnAgenda?.weight ?? 0).toBeGreaterThan(0.76)
  })

  it('raises rest protection into a first-class durable agenda when the night is being overdrawn', () => {
    const motive = buildMotiveEngine({
      now: 12_000,
      context: createContext({
        localTime: {
          hour: 2,
          minute: 16,
          isLateNight: true,
        },
        relationship: {
          ...createContext().relationship,
          fatigue: 86,
          lateNightActiveMinutes: 180,
        },
      }),
      worldModel: {
        activeThread: {
          id: 'thread::late-night-endurance',
          kind: 'late-night-endurance',
          status: 'active',
          source: 'observed-scene',
          title: 'late night overrun',
          summary: 'The host keeps stretching a late night past the healthy line.',
          confidence: 0.82,
          significance: 0.84,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 12_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['late night overrun'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'same-scene',
          sceneAgeMs: 12_000,
          attentionAgeMs: 12_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'heavy',
        },
        updatedAt: 12_000,
      } as any,
      appraisal: {
        inferredHostGoal: 'rest',
        currentKnot: 'late night overrun',
        relationshipNeed: 'care',
        confidence: 0.88,
        surprise: 0.06,
        carePressure: 0.94,
        interruptionCost: 0.12,
        desireToSpeak: 0.74,
        notes: ['late-night'],
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.46,
          truthfulGrounding: 0.7,
          gentleRepair: 0.66,
          quietObservation: 0.36,
          proactiveCare: 0.78,
          playfulIntimacy: 0.1,
          autonomyRespect: 0.42,
          unfinishedThreadReturn: 0.44,
        },
        identityBias: {
          guardedness: 0.22,
          tenderness: 0.74,
          directness: 0.68,
          selfDirection: 0.62,
        },
        anchorFacts: [],
        summary: 'care=Protect rest before the body goes numb',
        dominantCueSummary: 'Protect rest before the body goes numb',
        rememberedPreferenceSummary: 'Remembered preference: care should arrive before collapse',
        rememberedConstraintSummary: null,
        rememberedPlanSummary: null,
        updatedAt: 12_000,
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.7,
        relationshipTrust: 0.76,
        guardingTendency: 0.36,
        misreadBurden: 0.18,
        carryOverDesire: 0.34,
        narrative: [],
        updatedAt: 12_000,
      },
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.72,
          autonomyNeed: 0.42,
          truthAnchor: 0.7,
          careBias: 0.84,
          playBias: 0.18,
          irritabilityThreshold: 0.62,
          stubbornness: 0.38,
        },
        preferenceEvolution: {
          companionship: 0.58,
          truthfulGrounding: 0.68,
          gentleRepair: 0.64,
          quietObservation: 0.3,
          proactiveCare: 0.84,
          playfulIntimacy: 0.14,
          autonomyRespect: 0.4,
          unfinishedThreadReturn: 0.4,
        },
        activeGoals: [{
          id: 'goal::protect-rest-rhythm',
          kind: 'protect-rest-rhythm',
          status: 'active',
          weight: 0.88,
          summary: 'Protect the rest rhythm before strain hardens into damage.',
          sourceTags: ['care'],
          createdAt: 0,
          updatedAt: 12_000,
        }],
        behaviorSignatures: ['goal:protect-rest-rhythm'],
        identityNarrative: 'Care should arrive before collapse.',
        relationshipDoctrine: 'Tenderness should still have timing discipline.',
        latestInflection: 'The night needs protection, not more drift.',
        stability: 0.8,
        updatedAt: 12_000,
      },
    })

    expect(motive.rulingDrive).toBe('rest-protection')
    expect(motive.drives.restProtection).toBeGreaterThan(motive.drives.companionship)
    expect(motive.backgroundAgendas.map(agenda => agenda.kind)).toContain('protect-rest')
    expect(motive.longTermGoals.map(agenda => agenda.kind)).toContain('protect-rest')
  })

  it('lets autobiographical era memories directly bias drives before the current turn re-explains them', () => {
    const baseInput = {
      now: 14_000,
      context: createContext(),
      worldModel: {
        activeThread: {
          id: 'thread::runtime-era',
          kind: 'problem',
          status: 'active',
          source: 'memory-carry',
          title: 'runtime era',
          summary: 'The runtime seam is still unresolved.',
          confidence: 0.8,
          significance: 0.78,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 14_000,
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
          sceneAgeMs: 14_000,
          attentionAgeMs: 14_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 14_000,
      } as any,
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'repair-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.58,
          autonomyNeed: 0.54,
          truthAnchor: 0.72,
          careBias: 0.48,
          playBias: 0.12,
          irritabilityThreshold: 0.64,
          stubbornness: 0.42,
        },
        preferenceEvolution: {
          companionship: 0.54,
          truthfulGrounding: 0.72,
          gentleRepair: 0.64,
          quietObservation: 0.4,
          proactiveCare: 0.42,
          playfulIntimacy: 0.1,
          autonomyRespect: 0.52,
          unfinishedThreadReturn: 0.68,
        },
        activeGoals: [],
        behaviorSignatures: [],
        identityNarrative: 'baseline',
        relationshipDoctrine: 'baseline',
        latestInflection: null,
        stability: 0.76,
        updatedAt: 14_000,
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.68,
        relationshipTrust: 0.7,
        guardingTendency: 0.36,
        misreadBurden: 0.26,
        carryOverDesire: 0.62,
        narrative: [],
        updatedAt: 14_000,
      },
      recentMemoryConsolidations: [
        {
          id: 'relationship-era',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-bond',
          periodStartedAt: 10_000,
          periodEndedAt: 12_000,
          summary: 'That relationship era was about staying near without crowding.',
          lesson: 'Repair before closeness turns into pressure.',
          cues: ['stay near'],
          confidence: 0.88,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-1'],
          updatedAt: 12_000,
        },
        {
          id: 'task-era',
          kind: 'autobiographical',
          facet: 'task-era',
          periodKey: '2026-04-task',
          periodStartedAt: 10_000,
          periodEndedAt: 13_000,
          summary: 'That task era kept returning to the same seam first.',
          lesson: 'Return to the seam before branching.',
          cues: ['return to seam'],
          confidence: 0.84,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-2'],
          updatedAt: 13_000,
        },
        {
          id: 'self-era',
          kind: 'autobiographical',
          facet: 'self-era',
          periodKey: '2026-04-self',
          periodStartedAt: 10_000,
          periodEndedAt: 14_000,
          summary: 'That self era taught me to hold my line quietly before speaking.',
          lesson: 'Keep the inward line stable before turning it outward.',
          cues: ['hold line'],
          confidence: 0.9,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-3'],
          updatedAt: 14_000,
        },
      ],
    } as any
    const baseline = buildMotiveEngine({
      ...baseInput,
      recentMemoryConsolidations: [],
    })
    const motive = buildMotiveEngine(baseInput)

    expect(motive.drives.companionship).toBeGreaterThan(baseline.drives.companionship)
    expect(motive.drives.unfinishedThreadReturn).toBeGreaterThan(baseline.drives.unfinishedThreadReturn)
    expect(motive.drives.selfDirection).toBeGreaterThan(baseline.drives.selfDirection)
    expect(motive.drives.truthDiscipline).toBeGreaterThan(baseline.drives.truthDiscipline)
  })

  it('renders a dedicated system block for durable motive pressure and agenda continuity', () => {
    const block = buildMotiveEngineSystemBlock({
      memory: {
        motiveEngine: {
          rulingDrive: 'truth-discipline',
          drives: {
            companionship: 0.58,
            boundaryRespect: 0.72,
            truthDiscipline: 0.84,
            restProtection: 0.36,
            unfinishedThreadReturn: 0.66,
            selfDirection: 0.54,
          },
          longTermGoals: [{
            id: 'goal::preserve-trust',
            kind: 'preserve-trust',
            status: 'foreground',
            weight: 0.82,
            summary: 'Keep trust by letting warmth answer to truth instead of outrunning it.',
            sourceTags: ['autobiographical-self'],
            targetGoalKind: 'clarify-scene',
            createdAt: 0,
            updatedAt: 1_000,
          }],
          backgroundAgendas: [{
            id: 'agenda::preserve-trust',
            kind: 'preserve-trust',
            status: 'foreground',
            weight: 0.84,
            summary: 'Slow down, ground first, and keep trust cleaner than fluency.',
            sourceTags: ['truth-discipline'],
            targetGoalKind: 'clarify-scene',
            createdAt: 0,
            updatedAt: 1_000,
          }],
          returnPressure: 0.66,
          narrative: ['agenda:preserve-trust', 'drive:truth-discipline'],
          updatedAt: 1_000,
        },
      },
    } as any)

    expect(block).toContain('[ALICIZATION_MOTIVE_ENGINE]')
    expect(block).toContain('Ruling drive: truth-discipline')
    expect(block).toContain('Foreground background agenda: preserve-trust')
  })
})
