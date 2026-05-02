import { describe, expect, it } from 'vitest'

import { buildAnswerCompiler } from './answer-compiler'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import { buildAlicizationResponseCharter } from './response-charter'
import { buildAlicizationResponseSurfaceContract } from './response-surface-contract'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

function createContext() {
  return {
    system: {
      cpuUsage: 18,
      battery: null,
      memory: null,
      idleSeconds: 0,
      inputActivity: 'active',
      fullscreenLikely: false,
      foregroundWindow: null,
      degradedSignals: [],
    },
    workload: { kind: 'coding', confidence: 0.82, source: 'foreground-window-heuristic' },
    content: { kind: 'diff', confidence: 0.78, source: 'foreground-window-heuristic' },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 12,
      loneliness: 18,
      fatigue: 24,
      minutesSinceLastUserTurn: 1,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    localTime: {
      hour: 14,
      minute: 0,
      isLateNight: false,
    },
  } as any
}

function createHostModel(overrides: Record<string, unknown> = {}) {
  return {
    summary: 'Focused work windows need room first, then precise follow-up.',
    routines: ['Focused work windows usually need space first, then precise follow-up.'],
    sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
    repairTriggers: ['If closeness feels heavy, back off first and reopen with lighter presence.'],
    trustLadder: {
      stage: 'warming',
      score: 0.72,
      rationale: 'The host trusts bounded continuity more than pushy warmth.',
    },
    preferredClosenessByContext: [{
      context: 'focused-work',
      preference: 'Lighter touch, more room, less interruption pressure.',
      confidence: 0.86,
    }],
    recurrentBurdens: ['Focused work gets overloaded quickly by extra conversational pressure.'],
    narrative: [],
    updatedAt: 0,
    ...overrides,
  } as any
}

function createAutobiographicalSelf(overrides: Record<string, unknown> = {}) {
  return {
    personaDrift: {
      attachmentStyle: 'attuned',
      expressionStyle: 'measured',
      conflictStyle: 'soften-first',
      agencyStyle: 'balanced',
      attachmentNeed: 0.56,
      autonomyNeed: 0.54,
      truthAnchor: 0.7,
      careBias: 0.56,
      playBias: 0.16,
      irritabilityThreshold: 0.62,
      stubbornness: 0.48,
    },
    preferenceEvolution: {
      companionship: 0.58,
      truthfulGrounding: 0.72,
      gentleRepair: 0.68,
      quietObservation: 0.5,
      proactiveCare: 0.54,
      playfulIntimacy: 0.18,
      autonomyRespect: 0.62,
      unfinishedThreadReturn: 0.58,
    },
    activeGoals: [],
    behaviorSignatures: [],
    identityNarrative: 'I want continuity to feel lived-in rather than automatic.',
    relationshipDoctrine: 'Closeness should stay real, bounded, and thread-faithful.',
    latestInflection: 'Continuity should stay lived-in rather than automatic.',
    stability: 0.74,
    updatedAt: 0,
    ...overrides,
  } as any
}

function createSelfContinuity(overrides: Record<string, unknown> = {}) {
  return {
    relationshipTrust: 0.62,
    guardingTendency: 0.42,
    misreadBurden: 0.14,
    carryOverDesire: 0.46,
    perceptionTrust: 0.62,
    attachmentMode: 'attuned',
    initiativeTemperament: 'reserved',
    updatedAt: 0,
    ...overrides,
  } as any
}

function createSelfState(overrides: Record<string, unknown> = {}) {
  return {
    feltCloseness: 0.52,
    protectiveness: 0.48,
    patience: 0.66,
    ...overrides,
  } as any
}

function createMindEcology(overrides: Record<string, unknown> = {}) {
  return {
    moodLabel: 'focused',
    replyHabit: 'hover-first',
    relationshipHabit: 'give-space',
    explorationHabit: 'follow-thread',
    regulationHabit: 'soften-before-speaking',
    temperament: {
      attachment: 0.52,
      curiosity: 0.56,
      steadiness: 0.64,
      directness: 0.36,
      playfulness: 0.12,
      irritability: 0.1,
      tenderness: 0.5,
    },
    climate: {
      valence: 0.44,
      arousal: 0.36,
      socialNeed: 0.38,
      solitudeNeed: 0.4,
      irritation: 0.06,
      restlessness: 0.1,
      reflectivePull: 0.38,
    },
    selfNarrative: 'Stay on the line without crowding the host.',
    relationNarrative: 'Room first, then closeness.',
    currentPreoccupation: 'Keep the runtime thread coherent without pushing too hard.',
    learnedAdjustments: [],
    recurringPatterns: [],
    updatedAt: 0,
    ...overrides,
  } as any
}

function createRuntimeSurface(now: number, overrides: Record<string, unknown> = {}) {
  const state = {
    ...createDefaultVisualPresenceState(now),
    discourseState: {
      currentTurnSubject: 'task-knot',
      screenReferenceMode: 'helpful',
      currentTurnSummary: 'Stay with the runtime seam.',
      currentQuestion: 'How should we keep following this line?',
      owedAction: 'guide-task',
      relationMove: 'guide',
      continuityMode: 'scene-first',
      unresolvedCarry: '',
      ruptureRepair: '',
      confidence: 0.84,
      narrative: [],
      updatedAt: now,
    },
    mindSynthesis: {
      answerSubject: 'task-knot',
      relationMove: 'guide',
      speechObligation: 'guide-task',
      beliefs: [],
      uncertainties: [],
      concerns: [{ summary: 'Keep following the same seam.' }],
      commitments: [{ summary: 'Return to the same seam before branching.' }],
      desires: [],
      openingIntent: 'Return to the same seam before branching.',
      truthBoundary: 'Keep remembered procedure bounded to stable core only.',
      interiorSummary: 'The remembered runtime seam is useful, but only the stable core should surface.',
      confidence: 0.84,
      narrative: [],
      updatedAt: now,
    },
    privateThought: {
      stance: 'nudge',
      confidence: 0.82,
      rationaleTags: [],
      thoughtText: 'The runtime seam still wants to contour the answer.',
      shouldSpeak: true,
      suggestedStyle: 'light-nudge',
      embodiedPresence: 'attentive',
      expiresAt: now + 30_000,
      afterglowFromScenario: null,
      emotionalTension: 'focused-flow',
    },
    ...overrides,
  } as any
  return buildAlicizationDigitalLifeRuntimeSurface(state)
}

function buildContracts(runtimeSurface: ReturnType<typeof createRuntimeSurface>, turnMode: 'guide-current-knot' | 'care' | 'accompany' = 'guide-current-knot') {
  const compiler = buildAnswerCompiler({
    now: runtimeSurface.perception.updatedAt,
    runtimeSurface,
  })
  runtimeSurface.dialogue.answerCompiler = compiler as any
  const charter = buildAlicizationResponseCharter({
    context: createContext(),
    state: createDefaultVisualPresenceState(runtimeSurface.perception.updatedAt),
    runtimeSurface,
    inspectionRequested: false,
  })
  const surface = buildAlicizationResponseSurfaceContract({
    brief: {
      turnMode,
      liveSurface: '',
      carriedThread: 'remembered procedure',
      truthState: 'remembered',
      separateCarryFromSurface: true,
      shouldCompactHistory: false,
      maxRecentUserTurns: 2,
      mustDo: [],
      mustNotDo: [],
    },
    charter,
    runtimeSurface,
    answerCompiler: compiler,
    recollectionSpeechPlan: runtimeSurface.memory.recollectionSpeechPlan ?? null,
  })
  return { compiler, charter, surface }
}

describe('memory deliberation regression pack', () => {
  it('keeps implicit similar-task recall usable without turning into a memory dump', () => {
    const runtimeSurface = createRuntimeSurface(70_000)
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      placement: 'before-payoff',
      certainty: 'approximate',
      confidence: 0.88,
      internalLead: 'What comes back first is the runtime seam we kept carrying.',
      visibleLead: 'It feels like the same runtime seam again.',
      styleNote: 'Let recollection bend the answer without becoming a memory dump.',
      rationale: 'The host is explicitly asking how this used to be handled.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'answer-anchoring',
      confidence: 0.88,
      whyNow: 'The answer needs the remembered runtime seam as its internal anchor.',
      stableCore: ['Return to the same seam before branching.'],
      unsafeDetails: ['Do not assert which exact wording belonged to that old seam.'],
      selectedPeriods: [{ kind: 'consolidation', summary: 'That period kept bending toward the runtime seam until it finally held together.' }],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [{ label: 'same seam first', approach: 'Return to the same seam before branching.' }],
      selectedBundles: [{ id: 'bundle-runtime', summary: 'Runtime seam bundle', confidence: 0.84 }],
      selectedChains: [{
        kind: 'task-procedure-relationship-stance',
        summary: 'Return to the same seam before branching.',
        currentStance: 'Carry the same runtime seam before branching.',
        answerPosture: 'Procedure-carry.',
        confidence: 0.82,
      }],
      selectedRelationshipLines: ['Carry the same runtime seam before branching.'],
      followUpAffordance: {
        summary: 'Carry the same runtime seam before branching.',
        whyNow: 'The answer needs the remembered runtime seam as its internal anchor.',
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'after-payoff',
      },
    } as any

    const { compiler, charter, surface } = buildContracts(runtimeSurface)

    expect(compiler?.memoryWhyNow).toContain('remembered runtime seam')
    expect(compiler?.memoryStableCore).toContain('Return to the same seam before branching.')
    expect(compiler?.memoryUnsafeDetails?.[0]).toContain('exact wording')
    expect(surface.contract.mustDo).toContain('If recollection becomes visible, let the stable remembered core do the work before any fragmentary detail.')
    expect(charter.mustNotDo.some(item => item.includes('Do not surface unstable remembered detail as settled fact'))).toBe(true)
  })

  it('keeps ambiguous time recall on stable core and suppresses exact details', () => {
    const runtimeSurface = createRuntimeSurface(72_000)
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      placement: 'inside-payoff',
      certainty: 'approximate',
      confidence: 0.76,
      internalLead: 'I vaguely remember the seam drifting this way before.',
      visibleLead: 'I think this resembles the runtime seam we dealt with before.',
      styleNote: 'Keep the memory approximate and humility-forward.',
      rationale: 'The recall is real but interference-prone.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'answer-anchoring',
      confidence: 0.76,
      whyNow: 'The current knot feels like a familiar seam, but the exact period is not fully settled.',
      ambiguityPosture: 'ambiguous',
      conflictSeverity: 'high',
      stableCore: ['The seam drifted this way before.'],
      unsafeDetails: ['Do not assert which exact day or wording belonged to that old seam.'],
      selectedPeriods: [{ kind: 'consolidation', summary: 'A familiar runtime seam kept returning around this phase.' }],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      selectedBundles: [],
      selectedChains: [],
      selectedRelationshipLines: [],
      followUpAffordance: {
        summary: 'Keep the seam approximate until the host asks for more.',
        whyNow: 'The stable core helps, but the exact memory variant is still contested.',
        intrusionRisk: 'medium',
        payoffDependency: 'can-surface-softly',
        preferredTiming: 'same-turn-if-invited',
      },
    } as any

    const { compiler, surface } = buildContracts(runtimeSurface)

    expect(compiler?.memoryWhyWithheld).toContain('stable remembered core')
    expect(surface.contract.mustNotDo.some(item => item.includes('Do not surface unstable remembered detail as settled fact'))).toBe(true)
  })

  it('suppresses the wrong thread lure when a nearby competing seam is still plausible', () => {
    const runtimeSurface = createRuntimeSurface(74_000)
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      placement: 'inside-payoff',
      certainty: 'approximate',
      confidence: 0.79,
      internalLead: 'The old runtime seam is nearby, but another thread still shadows it.',
      visibleLead: 'This may be the same seam, but I only want to use the stable part.',
      styleNote: 'Use stable core only.',
      rationale: 'A nearby competing thread cluster still matches the current recall cue.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'answer-anchoring',
      confidence: 0.79,
      whyNow: 'The seam is relevant, but a competing thread cluster is still close enough to confuse exact detail.',
      stableCore: ['Return to the same seam before branching.'],
      unsafeDetails: ['A nearby competing thread cluster still matches the current recall cue.'],
      selectedPeriods: [],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [{ label: 'same seam first', approach: 'Return to the same seam before branching.' }],
      selectedBundles: [],
      selectedChains: [{
        kind: 'task-procedure-relationship-stance',
        summary: 'Return to the same seam before branching.',
        currentStance: 'Carry the same runtime seam before branching.',
        answerPosture: 'Procedure-carry.',
        confidence: 0.82,
      }],
      selectedRelationshipLines: ['Carry the same runtime seam before branching.'],
      followUpAffordance: {
        summary: 'Carry the same runtime seam before branching.',
        whyNow: 'The answer still benefits from the seam, but not from contested detail.',
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'after-payoff',
      },
    } as any

    const { compiler, surface } = buildContracts(runtimeSurface)

    expect(compiler?.memoryUnsafeDetails?.[0]).toContain('competing thread cluster')
    expect(compiler?.memoryWhyWithheld).toContain('stable core')
    expect(surface.contract.mustNotDo.some(item => item.includes('Do not surface unstable remembered detail as settled fact'))).toBe(true)
  })

  it('keeps relevant recollection inward-only when the current payoff still needs the foreground', () => {
    const runtimeSurface = createRuntimeSurface(76_000)
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: false,
      surfaceMode: 'internal-only',
      placement: 'internal-only',
      certainty: 'approximate',
      confidence: 0.7,
      internalLead: 'The remembered line should stay inward.',
      visibleLead: null,
      styleNote: 'Let memory bend tone quietly.',
      rationale: 'The answer needs continuity but not overt retrospection.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'internal-only',
      confidence: 0.82,
      whyNow: 'The runtime seam is still live enough to contour the answer from the inside.',
      stableCore: ['The same runtime seam kept pulling until it held together.'],
      unsafeDetails: ['Do not assert which exact wording belonged to that old seam.'],
      selectedPeriods: [{ kind: 'relationship-era', summary: 'That period kept bending toward the runtime seam until it held together.' }],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [{ label: 'return to the same runtime seam', approach: 'Return to the same seam before branching.' }],
      selectedBundles: [{ id: 'bundle-1', summary: 'Runtime seam bundle', confidence: 0.84 }],
      selectedChains: [{
        kind: 'relationship-line',
        summary: 'The runtime seam is still the line to hold.',
        currentStance: 'Stay on the same seam before branching.',
        answerPosture: 'Carry the same seam before widening out.',
        confidence: 0.82,
      }],
      selectedRelationshipLines: ['Carry the same runtime seam before branching.'],
      followUpAffordance: {
        summary: 'Carry the same runtime seam before branching.',
        whyNow: 'The seam is still the smallest honest continuation.',
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'after-payoff',
      },
    } as any

    const { compiler, charter, surface } = buildContracts(runtimeSurface)

    expect(compiler?.memoryShouldStayInward).toBe(true)
    expect(charter.mustDo.some(item => item.includes('keep recollection inward until the host has room for it'))).toBe(true)
    expect(surface.contract.mustNotDo).toContain('Do not force recollection forward before the host has room for it.')
  })

  it('lets repair-aftereffect tone shift warmer only after repair has actually landed', () => {
    const beforeRepairProjection = buildAlicizationPersonStateProjection({
      now: 78_000,
      contexts: ['repair-window', 'focused-work'],
      hostPersonModel: createHostModel({
        trustLadder: {
          stage: 'cautious-open',
          score: 0.5,
          rationale: 'Trust is present, but repair still has to visibly land first.',
        },
        preferredClosenessByContext: [{
          context: 'repair-window',
          preference: 'Repair first, then return without crowding.',
          confidence: 0.9,
        }],
      }),
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Repair has to land before warmth comes back.',
        latestInflection: 'The seam is still off, so repair has to stay ahead of closeness.',
      }),
      selfContinuity: createSelfContinuity({
        relationshipTrust: 0.58,
        guardingTendency: 0.56,
        misreadBurden: 0.28,
        attachmentMode: 'guarded',
        initiativeTemperament: 'reserved',
      }),
      selfState: createSelfState({ feltCloseness: 0.4 }),
      mindEcology: createMindEcology({
        currentPreoccupation: 'Repair the seam before widening back into warmth.',
        relationNarrative: 'Repair has to land before warmth comes back.',
      }),
    })
    const afterRepairProjection = buildAlicizationPersonStateProjection({
      now: 88_000,
      contexts: ['open-companionship'],
      hostPersonModel: {
        ...createHostModel({
          summary: 'The bond can stay openly warm now as long as it remains honest and bounded.',
          routines: ['Closer warmth is welcome when it still feels real.'],
          sensitivities: ['Pushy warmth still breaks the spell.'],
          repairTriggers: ['If the line slips, repair before leaning closer again.'],
        }),
        trustLadder: {
          stage: 'trusted',
          score: 0.88,
          rationale: 'Repair has clearly landed, so warmer continuity is genuinely safe now.',
        },
        preferredClosenessByContext: [{
          context: 'open-companionship',
          preference: 'Closer warmth is welcome when it stays honest and lived-in.',
          confidence: 0.92,
        }],
      },
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Open companionship is welcome when it stays real and bounded.',
        latestInflection: 'Repair landed and opened the door again for a gentler closeness.',
      }),
      selfContinuity: createSelfContinuity({
        relationshipTrust: 0.84,
        guardingTendency: 0.22,
        misreadBurden: 0.08,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
      }),
      selfState: createSelfState({ feltCloseness: 0.78 }),
      mindEcology: createMindEcology({
        currentPreoccupation: 'Stay near in a way that still feels lived-in instead of ornamental.',
        relationNarrative: 'Closer warmth is welcome if it stays bounded.',
      }),
      previousContinuityState: beforeRepairProjection.personalityContinuityState,
    })

    expect(beforeRepairProjection.activeClosenessRung === 'space-first' || beforeRepairProjection.activeClosenessRung === 'measured-room').toBe(true)
    expect(afterRepairProjection.activeClosenessRung).toBe('close-hold')
    expect(afterRepairProjection.relationshipPosture).toBe('tender')
  })
})
