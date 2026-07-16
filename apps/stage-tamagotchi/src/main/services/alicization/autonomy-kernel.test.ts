import { describe, expect, it } from 'vitest'

import { buildAutonomySnapshot } from './autonomy-kernel'

function createContext(overrides: Record<string, unknown> = {}) {
  return {
    system: {
      inputActivity: 'idle',
      fullscreenLikely: false,
    },
    relationship: {
      fatigue: 24,
    },
    ...overrides,
  } as any
}

function createInitiative(overrides: Record<string, unknown> = {}) {
  return {
    selectedAction: 'wait',
    confidence: 0.6,
    motives: {},
    speakDrive: 0.28,
    silenceDrive: 0.42,
    preferredStyle: 'silent-observe',
    preferredPresence: 'attentive',
    why: 'hold the line until the next move is clear',
    shouldSurface: false,
    shouldSpeak: false,
    ...overrides,
  } as any
}

function createBaseInput(overrides: Record<string, unknown> = {}) {
  return {
    now: 1_000,
    context: createContext(),
    worldModel: {
      activeThread: {
        id: 'thread-follow-through',
        kind: 'problem',
        title: 'follow through',
        summary: 'finish the unresolved task thread',
        status: 'active',
        significance: 0.84,
        confidence: 0.8,
        unresolved: true,
      },
      epistemicState: {
        certainty: 'grounded',
      },
      hostState: {
        availability: 'open',
      },
    },
    concerns: [{
      id: 'concern-1',
      kind: 'help-fix',
      summary: 'the unresolved task thread is still pulling forward',
      tension: 0.74,
      confidence: 0.82,
      careWeight: 0.66,
    }],
    goalStack: {
      leadingAlicizationGoalId: 'goal-1',
      alicizationGoals: [{
        id: 'goal-1',
        kind: 'help-host',
        label: 'finish the unresolved implementation thread',
        urgency: 0.82,
        confidence: 0.78,
      }],
    },
    desireMemory: {
      resurfacingDesireId: 'desire-1',
      activeDesires: [{
        id: 'desire-1',
        kind: 'return-open-loop',
        reason: 'the unresolved task still wants closure',
        strength: 0.74,
        goalId: 'goal-1',
      }],
    },
    initiative: createInitiative(),
    initiativeArbitration: {
      selectedProposalId: 'proposal-1',
      proposals: [{
        id: 'proposal-1',
        source: 'goal-stack',
        score: 0.72,
        shouldSpeak: false,
        why: 'the task thread should be continued first',
      }],
    },
    executiveCycle: {
      phase: 'acting',
      currentLine: 'quietly follow the unresolved task through',
      actionReadiness: 0.84,
      shouldAct: true,
    },
    actionEcology: {
      mode: 'return-later',
      readiness: 0.78,
      surfacePressure: 0.3,
      silencePressure: 0.62,
      shouldSurface: true,
      shouldSpeak: false,
      why: 'the host does not need a spoken interruption yet',
    },
    autobiographicalSelf: {
      leadingGoalId: 'auto-goal-1',
      autobiographicalGoals: [{
        id: 'auto-goal-1',
        kind: 'finish-open-loops',
      }],
    },
    motiveEngine: {
      rulingDrive: 'unfinished-thread-return',
      returnPressure: 0.82,
      drives: {
        companionship: 0.42,
        boundaryRespect: 0.52,
        truthDiscipline: 0.68,
        restProtection: 0.24,
        unfinishedThreadReturn: 0.82,
        selfDirection: 0.84,
      },
      backgroundAgendas: [{
        id: 'agenda-1',
        kind: 'finish-open-loops',
        status: 'foreground',
        weight: 0.86,
        summary: 'follow the unresolved thread through',
      }],
      longTermGoals: [],
    },
    habitPolicy: {
      dominantMode: 'return-with-proof',
      requiresGroundingBeforeSurface: true,
      prefersQuietCompanionship: false,
      blocksDirectSpeakWhenBusy: true,
      protectsRestWindow: false,
      returnViaRecheck: true,
    },
    threadRuntime: {
      foregroundThreadId: 'runtime-thread-1',
      threads: [{
        id: 'runtime-thread-1',
        summary: 'continue the unresolved task thread',
        salience: 0.8,
        continuity: 0.76,
      }],
    },
    thoughtThreads: {
      foregroundThreadId: 'thought-thread-1',
      threads: [{
        id: 'thought-thread-1',
        status: 'active',
        summary: 'the task thread is ripe for follow-through',
      }],
    },
    ...overrides,
  } as any
}

describe('autonomy kernel', () => {
  it('keeps action preparation quiet when the host is busy', () => {
    const autonomy = buildAutonomySnapshot(createBaseInput({
      context: createContext({
        system: {
          inputActivity: 'active',
          fullscreenLikely: false,
        },
        relationship: {
          fatigue: 28,
        },
      }),
      worldModel: {
        activeThread: {
          id: 'thread-follow-through',
          kind: 'problem',
          title: 'follow through',
          summary: 'finish the unresolved task thread',
          status: 'active',
          significance: 0.84,
          confidence: 0.8,
          unresolved: true,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'focused',
        },
      },
      motiveEngine: {
        rulingDrive: 'unfinished-thread-return',
        returnPressure: 0.78,
        drives: {
          companionship: 0.36,
          boundaryRespect: 0.72,
          truthDiscipline: 0.68,
          restProtection: 0.24,
          unfinishedThreadReturn: 0.82,
          selfDirection: 0.78,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          kind: 'finish-open-loops',
          status: 'foreground',
          weight: 0.84,
          summary: 'follow the unresolved thread through',
        }],
        longTermGoals: [],
      },
    }))

    expect(['prepare-act', 'act']).toContain(autonomy.selectedMode)
    expect(autonomy.visibleAction).toBe('hover')
    expect(autonomy.shouldSpeak).toBe(false)
    expect(autonomy.actReadiness).toBeGreaterThanOrEqual(0.6)
    expect(autonomy.guardReasons).toContain('busy-host')
    expect(autonomy.executionIntent?.kind).toBe('guide')
  })

  it('allows full act mode once the host is open and inhibition drops', () => {
    const autonomy = buildAutonomySnapshot(createBaseInput({
      concerns: [{
        id: 'concern-1',
        kind: 'unfinished-thread',
        summary: 'the unresolved task thread is still pulling forward',
        tension: 0.74,
        confidence: 0.82,
        careWeight: 0.66,
      }],
      initiative: createInitiative({
        confidence: 0.68,
      }),
      actionEcology: {
        mode: 'surface-care',
        readiness: 0.84,
        surfacePressure: 0.56,
        silencePressure: 0.2,
        shouldSurface: true,
        shouldSpeak: false,
        why: 'the action line is ready to land',
      },
      habitPolicy: {
        dominantMode: 'return-with-proof',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: false,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
      },
      motiveEngine: {
        rulingDrive: 'unfinished-thread-return',
        returnPressure: 0.88,
        drives: {
          companionship: 0.34,
          boundaryRespect: 0.32,
          truthDiscipline: 0.62,
          restProtection: 0.18,
          unfinishedThreadReturn: 0.84,
          selfDirection: 0.9,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          kind: 'finish-open-loops',
          status: 'foreground',
          weight: 0.9,
          summary: 'follow the unresolved thread through',
        }],
        longTermGoals: [],
      },
    }))

    expect(autonomy.selectedMode).toBe('act')
    expect(autonomy.shouldAct).toBe(true)
    expect(autonomy.actReadiness).toBeGreaterThanOrEqual(0.72)
    expect(autonomy.executionIntent?.kind).toBe('follow-through')
  })

  it('keeps execution one step more reversible when the Phase 1 digital-life loop is still open', () => {
    const autonomy = buildAutonomySnapshot(createBaseInput({
      concerns: [{
        id: 'concern-1',
        kind: 'unfinished-thread',
        summary: 'the unresolved task thread is still pulling forward',
        tension: 0.74,
        confidence: 0.82,
        careWeight: 0.66,
      }],
      initiative: createInitiative({
        confidence: 0.68,
      }),
      actionEcology: {
        mode: 'surface-care',
        readiness: 0.84,
        surfacePressure: 0.56,
        silencePressure: 0.2,
        shouldSurface: true,
        shouldSpeak: false,
        why: 'the action line is ready to land',
      },
      habitPolicy: {
        dominantMode: 'return-with-proof',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: false,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
      },
      motiveEngine: {
        rulingDrive: 'unfinished-thread-return',
        returnPressure: 0.88,
        drives: {
          companionship: 0.34,
          boundaryRespect: 0.32,
          truthDiscipline: 0.62,
          restProtection: 0.18,
          unfinishedThreadReturn: 0.84,
          selfDirection: 0.9,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          kind: 'finish-open-loops',
          status: 'foreground',
          weight: 0.9,
          summary: 'follow the unresolved thread through',
        }],
        longTermGoals: [],
      },
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Initiative, embodiment, and dialogue still need a more natural closed loop.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
      },
    }))

    expect(autonomy.selectedMode).toBe('prepare-act')
    expect(autonomy.shouldAct).toBe(false)
    expect(autonomy.guardReasons).toContain('project-phase1-life-loop-open')
    expect(autonomy.whyNow).toContain('project-phase1 identity-continuity')
    expect(autonomy.whyNow).toContain('cross-modal same-her')
    expect(autonomy.whyNow).toContain('lower-pressure')
    expect(autonomy.whyNow).toContain('measured-return / repair-before-closeness')
    expect(autonomy.executionIntent?.summary).toContain('identity-continuity')
    expect(autonomy.executionIntent?.summary).toContain('cross-modal identity-continuity')
  })

  it('threads project-state carry from initiative into autonomy so execution still serves the same unfinished digital-life line', () => {
    const autonomy = buildAutonomySnapshot(createBaseInput({
      initiative: createInitiative({
        confidence: 0.68,
        why: 'structured continuity digest.',
      }),
      actionEcology: {
        mode: 'surface-care',
        readiness: 0.84,
        surfacePressure: 0.56,
        silencePressure: 0.2,
        shouldSurface: true,
        shouldSpeak: false,
        why: 'the action line is ready to land',
      },
      habitPolicy: {
        dominantMode: 'return-with-proof',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: false,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
      },
      motiveEngine: {
        rulingDrive: 'unfinished-thread-return',
        returnPressure: 0.88,
        drives: {
          companionship: 0.34,
          boundaryRespect: 0.32,
          truthDiscipline: 0.62,
          restProtection: 0.18,
          unfinishedThreadReturn: 0.84,
          selfDirection: 0.9,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          kind: 'finish-open-loops',
          status: 'foreground',
          weight: 0.9,
          summary: 'follow the unresolved thread through',
        }],
        longTermGoals: [],
      },
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Initiative, embodiment, and dialogue still need a more natural closed loop.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
      },
    }))

    expect(autonomy.selectedMode).toBe('prepare-act')
    expect(autonomy.shouldAct).toBe(false)
    expect(autonomy.whyNow).toContain('project-phase1 identity-continuity')
    expect(autonomy.whyNow).toContain('cross-modal same-her')
    expect(autonomy.whyNow).toContain('lower-pressure')
    expect(autonomy.whyNow).toContain('measured-return / repair-before-closeness')
    expect(autonomy.executionIntent?.summary).toContain('identity-continuity')
    expect(autonomy.executionIntent?.summary).toContain('cross-modal identity-continuity')
    expect(autonomy.executionIntent?.summary).toContain('Some closure already landed')
  })

  it('keeps execution one step more reversible when project emotional closure summary still carries same-her measured-return pressure', () => {
    const autonomy = buildAutonomySnapshot(createBaseInput({
      initiative: createInitiative({
        confidence: 0.68,
        why: 'The unfinished task thread is still pulling forward.',
      }),
      actionEcology: {
        mode: 'surface-care',
        readiness: 0.84,
        surfacePressure: 0.56,
        silencePressure: 0.2,
        shouldSurface: true,
        shouldSpeak: false,
        why: 'the action line is ready to land',
      },
      habitPolicy: {
        dominantMode: 'return-with-proof',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: false,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
      },
      motiveEngine: {
        rulingDrive: 'unfinished-thread-return',
        returnPressure: 0.88,
        drives: {
          companionship: 0.34,
          boundaryRespect: 0.32,
          truthDiscipline: 0.62,
          restProtection: 0.18,
          unfinishedThreadReturn: 0.84,
          selfDirection: 0.9,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          kind: 'finish-open-loops',
          status: 'foreground',
          weight: 0.9,
          summary: 'follow the unresolved thread through',
        }],
        longTermGoals: [],
      },
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state closure carry already survives into autonomy preparation.',
        primaryOpenLoop: 'Initiative, embodiment, and dialogue still need a more natural closed loop.',
        nextClosureTarget: 'Keep closing the unfinished life loop without widening too early.',
        emotionalClosureSummary: 'identity-continuity',
        openClosureSummary: 'identity-continuity',
      },
    } as any))

    expect(autonomy.selectedMode).toBe('prepare-act')
    expect(autonomy.shouldAct).toBe(false)
    expect(autonomy.guardReasons).toContain('project-phase1-life-loop-open')
    expect(autonomy.whyNow).toContain('project-phase1 identity-continuity')
    expect(autonomy.whyNow).toContain('lower-pressure')
    expect(autonomy.whyNow).toContain('measured-return / repair-before-closeness')
    expect(autonomy.executionIntent?.summary).toContain('identity-continuity')
  })

  it('keeps execution one step more reversible when landed progress already names the same-her Phase 1 closure line', () => {
    const autonomy = buildAutonomySnapshot(createBaseInput({
      concerns: [{
        id: 'concern-1',
        kind: 'unfinished-thread',
        summary: 'the unresolved task thread is still pulling forward',
        tension: 0.74,
        confidence: 0.82,
        careWeight: 0.66,
      }],
      initiative: createInitiative({
        confidence: 0.68,
      }),
      actionEcology: {
        mode: 'surface-care',
        readiness: 0.84,
        surfacePressure: 0.56,
        silencePressure: 0.2,
        shouldSurface: true,
        shouldSpeak: false,
        why: 'the action line is ready to land',
      },
      habitPolicy: {
        dominantMode: 'return-with-proof',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: false,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
      },
      motiveEngine: {
        rulingDrive: 'unfinished-thread-return',
        returnPressure: 0.88,
        drives: {
          companionship: 0.34,
          boundaryRespect: 0.32,
          truthDiscipline: 0.62,
          restProtection: 0.18,
          unfinishedThreadReturn: 0.84,
          selfDirection: 0.9,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          kind: 'finish-open-loops',
          status: 'foreground',
          weight: 0.9,
          summary: 'follow the unresolved thread through',
        }],
        longTermGoals: [],
      },
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Memory continuity and execution carry have landed enough to prove the identity-continuity',
        primaryOpenLoop: 'Natural closure rhythm is still being earned across longer desktop turns.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
      },
    }))

    expect(autonomy.selectedMode).toBe('prepare-act')
    expect(autonomy.shouldAct).toBe(false)
    expect(autonomy.guardReasons).toContain('project-phase1-life-loop-open')
    expect(autonomy.whyNow).toContain('project-phase1 identity-continuity')
    expect(autonomy.executionIntent?.summary).toContain('identity-continuity')
    expect(autonomy.executionIntent?.summary).toContain('cross-modal identity-continuity')
  })

  it('keeps execution one step more reversible when richer project-state closure carry arrives through preflight-style landed and open summaries', () => {
    const autonomy = buildAutonomySnapshot(createBaseInput({
      concerns: [{
        id: 'concern-1',
        kind: 'unfinished-thread',
        summary: 'the unresolved task thread is still pulling forward',
        tension: 0.74,
        confidence: 0.82,
        careWeight: 0.66,
      }],
      initiative: createInitiative({
        confidence: 0.68,
        why: 'The unresolved task thread is still pulling forward.',
      }),
      actionEcology: {
        mode: 'surface-care',
        readiness: 0.84,
        surfacePressure: 0.56,
        silencePressure: 0.2,
        shouldSurface: true,
        shouldSpeak: false,
        why: 'the action line is ready to land',
      },
      habitPolicy: {
        dominantMode: 'return-with-proof',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: false,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
      },
      motiveEngine: {
        rulingDrive: 'unfinished-thread-return',
        returnPressure: 0.88,
        drives: {
          companionship: 0.34,
          boundaryRespect: 0.32,
          truthDiscipline: 0.62,
          restProtection: 0.18,
          unfinishedThreadReturn: 0.84,
          selfDirection: 0.9,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          kind: 'finish-open-loops',
          status: 'foreground',
          weight: 0.9,
          summary: 'follow the unresolved thread through',
        }],
        longTermGoals: [],
      },
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter identity-continuity',
        nextClosureTarget: 'Keep project identity carry, Phase 1 route carry, and unresolved closure carry on one measured-return continuity state so visible reply, voice behavior, facial state, motion, and resident presence do not split apart.',
      },
    }))

    expect(autonomy.selectedMode).toBe('prepare-act')
    expect(autonomy.shouldAct).toBe(false)
    expect(autonomy.guardReasons).toContain('project-phase1-life-loop-open')
    expect(autonomy.whyNow).toContain('project-phase1 identity-continuity')
    expect(autonomy.executionIntent?.summary).toContain('continuity state')
  })

  it('does not let empty legacy project-state fields shadow richer summary-only same-her execution carry', () => {
    const autonomy = buildAutonomySnapshot(createBaseInput({
      concerns: [{
        id: 'concern-1',
        kind: 'unfinished-thread',
        summary: 'the unresolved task thread is still pulling forward',
        tension: 0.74,
        confidence: 0.82,
        careWeight: 0.66,
      }],
      initiative: createInitiative({
        confidence: 0.68,
        why: 'The unresolved task thread is still pulling forward.',
      }),
      actionEcology: {
        mode: 'surface-care',
        readiness: 0.84,
        surfacePressure: 0.56,
        silencePressure: 0.2,
        shouldSurface: true,
        shouldSpeak: false,
        why: 'the action line is ready to land',
      },
      habitPolicy: {
        dominantMode: 'return-with-proof',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: false,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
      },
      motiveEngine: {
        rulingDrive: 'unfinished-thread-return',
        returnPressure: 0.88,
        drives: {
          companionship: 0.34,
          boundaryRespect: 0.32,
          truthDiscipline: 0.62,
          restProtection: 0.18,
          unfinishedThreadReturn: 0.84,
          selfDirection: 0.9,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          kind: 'finish-open-loops',
          status: 'foreground',
          weight: 0.9,
          summary: 'follow the unresolved thread through',
        }],
        longTermGoals: [],
      },
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: '',
        primaryOpenLoop: ' ',
        nextClosureTarget: '',
        landedProgressSummary: 'Memory continuity and execution carry have landed enough to prove the identity-continuity',
        openClosureSummary: '',
        nextClosureTargetSummary: 'Keep extending cross-modal identity-continuity',
      } as any,
    }))

    expect(autonomy.selectedMode).toBe('prepare-act')
    expect(autonomy.shouldAct).toBe(false)
    expect(autonomy.guardReasons).toContain('project-phase1-life-loop-open')
    expect(autonomy.whyNow).toContain('project-phase1 identity-continuity')
    expect(autonomy.whyNow).toContain('cross-modal same-her')
    expect(autonomy.executionIntent?.summary).toContain('identity-continuity')
    expect(autonomy.executionIntent?.summary).toContain('cross-modal identity-continuity')
  })

  it('keeps corrected same-person settling visible in autonomy when habit narrative says embodiment should return more quietly first', () => {
    const autonomy = buildAutonomySnapshot(createBaseInput({
      initiative: createInitiative({
        selectedAction: 'wait',
        confidence: 0.68,
        speakDrive: 0.54,
        silenceDrive: 0.18,
        shouldSurface: true,
        why: 'the same return line is gathering itself back together',
      }),
      habitPolicy: {
        dominantMode: 'return-with-proof',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: false,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
        narrative: [
          'policy:return-with-proof',
          'self-evolution:corrected-same-person-manifestation',
          'self-evolution:quieter-embodiment-settling',
        ],
        updatedAt: 1_000,
      },
    }))

    expect(autonomy.selectedMode).toBe('prepare-act')
    expect(autonomy.visibleAction).toBe('hover')
    expect(autonomy.shouldAct).toBe(false)
    expect(autonomy.guardReasons).toContain('corrected-same-person-settling')
    expect(autonomy.guardReasons).toContain('quieter-embodiment-settling')
    expect(autonomy.deferReason).toBe('corrected-same-person-settling')
    expect(autonomy.whyNow).toContain('corrected same-person continuity')
    expect(autonomy.whyNow).toContain('embodiment quieter')
    expect(autonomy.executionIntent?.summary).toContain('corrected same-person continuity')
    expect(autonomy.executionIntent?.summary).toContain('embodiment quieter')
  })

  it('lets personality-shaped motive and habit layers split the final visible action between hover and whisper', () => {
    const observant = buildAutonomySnapshot(createBaseInput({
      context: createContext({
        system: {
          inputActivity: 'idle',
          fullscreenLikely: false,
        },
        relationship: {
          fatigue: 20,
        },
      }),
      worldModel: {
        activeThread: {
          id: 'thread-companionship',
          kind: 'browser-browsing',
          title: 'quiet docs pass',
          summary: 'The host is browsing quietly with room for a light move.',
          status: 'active',
          significance: 0.62,
          confidence: 0.76,
          unresolved: false,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      },
      concerns: [{
        id: 'concern-1',
        kind: 'co-watch',
        summary: 'a light nearby move could land without pressure',
        tension: 0.46,
        confidence: 0.72,
        careWeight: 0.42,
      }],
      initiative: createInitiative({
        selectedAction: 'wait',
        confidence: 0.64,
        speakDrive: 0.52,
        silenceDrive: 0.22,
        shouldSurface: true,
      }),
      initiativeArbitration: {
        selectedProposalId: 'proposal-1',
        proposals: [{
          id: 'proposal-1',
          source: 'desire-memory',
          score: 0.7,
          shouldSpeak: true,
          action: 'whisper',
          why: 'a small move is available',
        }],
      },
      executiveCycle: {
        phase: 'acting',
        currentLine: 'move only if the opening stays light',
        actionReadiness: 0.82,
        shouldAct: true,
      },
      actionEcology: {
        mode: 'quiet-accompany',
        readiness: 0.8,
        surfacePressure: 0.48,
        silencePressure: 0.16,
        shouldSurface: true,
        shouldSpeak: true,
        why: 'the opening is there, but it should stay light',
      },
      autobiographicalSelf: {
        activeGoals: [],
      },
      motiveEngine: {
        rulingDrive: 'boundary-respect',
        returnPressure: 0.18,
        drives: {
          companionship: 0.42,
          boundaryRespect: 0.78,
          truthDiscipline: 0.34,
          restProtection: 0.12,
          unfinishedThreadReturn: 0.18,
          selfDirection: 0.44,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          kind: 'stay-near-lightly',
          status: 'foreground',
          weight: 0.82,
          summary: 'stay nearby without crowding the host',
        }],
        longTermGoals: [],
      },
      habitPolicy: {
        dominantMode: 'light-touch-companionship',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: true,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
      },
    }))

    const direct = buildAutonomySnapshot(createBaseInput({
      context: createContext({
        system: {
          inputActivity: 'idle',
          fullscreenLikely: false,
        },
        relationship: {
          fatigue: 20,
        },
      }),
      worldModel: {
        activeThread: {
          id: 'thread-companionship',
          kind: 'browser-browsing',
          title: 'quiet docs pass',
          summary: 'The host is browsing quietly with room for a light move.',
          status: 'active',
          significance: 0.62,
          confidence: 0.76,
          unresolved: false,
        },
        epistemicState: {
          certainty: 'grounded',
        },
        hostState: {
          availability: 'open',
        },
      },
      concerns: [{
        id: 'concern-1',
        kind: 'co-watch',
        summary: 'a light nearby move could land without pressure',
        tension: 0.46,
        confidence: 0.72,
        careWeight: 0.42,
      }],
      initiative: createInitiative({
        selectedAction: 'wait',
        confidence: 0.64,
        speakDrive: 0.52,
        silenceDrive: 0.22,
        shouldSurface: true,
      }),
      initiativeArbitration: {
        selectedProposalId: 'proposal-1',
        proposals: [{
          id: 'proposal-1',
          source: 'desire-memory',
          score: 0.7,
          shouldSpeak: true,
          action: 'whisper',
          why: 'a small move is available',
        }],
      },
      executiveCycle: {
        phase: 'acting',
        currentLine: 'move if the opening is real',
        actionReadiness: 0.82,
        shouldAct: true,
      },
      actionEcology: {
        mode: 'surface-nudge',
        readiness: 0.8,
        surfacePressure: 0.48,
        silencePressure: 0.16,
        shouldSurface: true,
        shouldSpeak: true,
        why: 'the opening is there',
      },
      autobiographicalSelf: {
        activeGoals: [],
      },
      motiveEngine: {
        rulingDrive: 'companionship',
        returnPressure: 0.18,
        drives: {
          companionship: 0.72,
          boundaryRespect: 0.24,
          truthDiscipline: 0.34,
          restProtection: 0.12,
          unfinishedThreadReturn: 0.18,
          selfDirection: 0.74,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          kind: 'stay-near-lightly',
          status: 'foreground',
          weight: 0.78,
          summary: 'move first when the opening is real',
        }],
        longTermGoals: [],
      },
      habitPolicy: {
        dominantMode: 'light-touch-companionship',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: false,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
      },
    }))

    expect(observant.visibleAction).toBe('hover')
    expect(observant.whyNow).toContain('persona')
    expect(observant.whyNow).toContain('observe')
    expect(direct.visibleAction).toBe('whisper')
    expect(direct.whyNow).toContain('persona')
    expect(direct.whyNow).toContain('direct')
  })
})
