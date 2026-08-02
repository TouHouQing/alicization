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
      kind: 'unfinished-thread',
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
    initiative: {
      selectedAction: 'wait',
      confidence: 0.68,
      motives: {},
      speakDrive: 0.28,
      silenceDrive: 0.42,
      preferredStyle: 'silent-observe',
      preferredPresence: 'attentive',
      why: 'hold the line until the next move is clear',
      shouldSurface: false,
      shouldSpeak: false,
    },
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
      mode: 'surface-care',
      readiness: 0.84,
      surfacePressure: 0.56,
      silencePressure: 0.2,
      shouldSurface: true,
      shouldSpeak: false,
      why: 'the action line is ready to land',
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
    habitPolicy: {
      dominantMode: 'return-with-proof',
      requiresGroundingBeforeSurface: false,
      prefersQuietCompanionship: false,
      blocksDirectSpeakWhenBusy: false,
      protectsRestWindow: false,
      returnViaRecheck: false,
      narrative: [],
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
        ...createBaseInput().worldModel,
        hostState: {
          availability: 'focused',
        },
      },
      habitPolicy: {
        ...createBaseInput().habitPolicy,
        blocksDirectSpeakWhenBusy: true,
      },
    }))

    expect(['prepare-act', 'act']).toContain(autonomy.selectedMode)
    expect(autonomy.visibleAction).toBe('hover')
    expect(autonomy.shouldSpeak).toBe(false)
    expect(autonomy.guardReasons).toContain('busy-host')
  })

  it('allows full act mode once the host is open and inhibition drops', () => {
    const autonomy = buildAutonomySnapshot(createBaseInput())

    expect(autonomy.selectedMode).toBe('act')
    expect(autonomy.shouldAct).toBe(true)
    expect(autonomy.actReadiness).toBeGreaterThanOrEqual(0.72)
    expect(autonomy.executionIntent?.kind).toBe('follow-through')
  })

  it('does not fabricate natural-language execution intent when no real source is present', () => {
    const autonomy = buildAutonomySnapshot(createBaseInput({
      worldModel: {
        activeThread: null,
        epistemicState: {
          certainty: 'uncertain',
        },
        hostState: {
          availability: 'open',
        },
      },
      concerns: [],
      goalStack: {
        leadingAlicizationGoalId: null,
        alicizationGoals: [],
      },
      desireMemory: {
        resurfacingDesireId: null,
        activeDesires: [],
      },
      initiative: {
        selectedAction: 'wait',
        confidence: 0.22,
        motives: {},
        speakDrive: 0.1,
        silenceDrive: 0.7,
        preferredStyle: 'silent-observe',
        preferredPresence: 'idle',
        why: '',
        shouldSurface: false,
        shouldSpeak: false,
      },
      initiativeArbitration: {
        selectedProposalId: null,
        proposals: [],
      },
      executiveCycle: {
        phase: 'idle',
        currentLine: '',
        actionReadiness: 0.1,
        shouldAct: false,
      },
      actionEcology: {
        mode: 'hold',
        readiness: 0.1,
        surfacePressure: 0.1,
        silencePressure: 0.7,
        shouldSurface: false,
        shouldSpeak: false,
        why: '',
      },
      autobiographicalSelf: {
        leadingGoalId: null,
        autobiographicalGoals: [],
      },
      motiveEngine: {
        rulingDrive: null,
        returnPressure: 0.1,
        drives: {},
        backgroundAgendas: [],
        longTermGoals: [],
      },
      threadRuntime: {
        foregroundThreadId: null,
        threads: [],
      },
      thoughtThreads: {
        foregroundThreadId: null,
        threads: [],
      },
    }))

    expect(autonomy.whyNow).toBe('why:unattributed')
    expect(autonomy.executionIntent?.summary).toBe('execution-intent:unattributed')
  })
})
