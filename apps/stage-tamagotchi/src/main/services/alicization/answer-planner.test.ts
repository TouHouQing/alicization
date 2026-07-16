import { describe, expect, it } from 'vitest'

import {
  buildAlicizationAnswerPlannerSystemBlock,
  buildAnswerPlanner,
} from './answer-planner'
import { buildCurrentConsciousFrame } from './current-conscious-frame'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

const baseContext = {
  localTime: { hour: 14, minute: 0, isLateNight: false },
  system: {
    cpuUsage: 18,
    battery: { percent: 82, charging: true },
    memory: { usagePercent: 36, freeMB: 4096, totalMB: 8192 },
    idleSeconds: 12,
    inputActivity: 'active' as const,
    fullscreenLikely: false,
    foregroundWindow: {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'runtime.ts - diff',
      pid: 7,
    },
    degradedSignals: [],
  },
  workload: {
    kind: 'coding' as const,
    confidence: 0.88,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['cursor'],
  },
  content: {
    kind: 'diff' as const,
    confidence: 0.84,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['diff'],
    summary: 'runtime.ts - diff',
  },
  relationship: {
    hostAttitude: '礼貌而克制，保持观察',
    boredom: 14,
    loneliness: 18,
    fatigue: 20,
    minutesSinceLastUserTurn: 2,
    reminderBacklog: 0,
    lateNightActiveMinutes: 0,
    recentProactiveOutcomes: [],
  },
}

describe('buildAnswerPlanner', () => {
  it('chooses guide when a live diff knot is the governing concern', () => {
    const planner = buildAnswerPlanner({
      now: 30_000,
      context: baseContext,
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'runtime.ts diff',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        target: null,
        beganAt: 0,
        lastSeenAt: 30_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime-diff',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts diff',
          summary: 'The host is checking where the runtime diff is wrong.',
          confidence: 0.86,
          significance: 0.82,
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
          sceneAgeMs: 30_000,
          attentionAgeMs: 30_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 30_000,
      },
      worldOntology: {
        dominantFrame: 'live',
        truthPriority: ['live', 'remembered', 'imagined'],
        live: {
          kind: 'live',
          summary: 'The diff is live and grounded.',
          confidence: 0.9,
          stability: 0.84,
          focusThreadId: 'thread::runtime-diff',
          evidence: ['grounded-scene'],
        },
        remembered: null,
        imagined: null,
        updatedAt: 30_000,
      },
      concernContinuity: {
        governingEntryId: 'entry::runtime',
        entries: [{
          id: 'entry::runtime',
          sourceConcernId: 'concern-1',
          kind: 'help-fix',
          status: 'active',
          summary: 'She is still holding the runtime diff knot.',
          anchor: 'runtime.ts diff',
          targetThreadId: 'thread::runtime-diff',
          continuityWeight: 0.82,
          freshnessBias: 0.9,
          repairAffinity: 0.12,
          confidence: 0.84,
          createdAt: 0,
          lastUpdatedAt: 30_000,
          expiresAt: 120_000,
        }],
        carryPressure: 0.82,
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 30_000,
      },
      repairLedger: null,
      commitmentLedger: null,
      inquiryPlanner: null,
      relationshipModel: {
        climate: 'attuned',
        approachVector: 'guide',
        receptivity: 0.62,
        sharedAttentionTrust: 0.68,
        correctionSensitivity: 0.22,
        reciprocityExpectation: 0.4,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 30_000,
      },
      privateThought: {
        stance: 'nudge',
        confidence: 0.78,
        rationaleTags: [],
        thoughtText: 'Stay with the real diff knot.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 90_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
      mindKernel: {
        dominantMode: 'tracking',
        worldPressure: 0.72,
        epistemicPressure: 0.34,
        relationalPressure: 0.28,
        carePressure: 0.18,
        continuityPressure: 0.66,
        speakReadiness: 0.54,
        presenceWeight: 0.52,
        narrative: [],
        updatedAt: 30_000,
      },
      inspectionRequested: true,
    })

    expect(planner.act).toBe('guide')
    expect(planner.evidenceMode).toBe('live-grounded')
    expect(planner.governingFocus).toContain('runtime diff')
    expect(buildAlicizationAnswerPlannerSystemBlock(planner)).toContain('[ALICIZATION_ANSWER_PLAN]')
  })

  it('prints the active digital-life governing project seam into the planner system block', () => {
    const block = buildAlicizationAnswerPlannerSystemBlock({
      act: 'guide',
      evidenceMode: 'live-grounded',
      governingFocus: 'Keep the reply on the active knot.',
      governingProject: 'Phase 1 local digital life is still open: memory-emotion-initiative embodiment closure is not finished; next closure target is making the emotional loop visibly drive dialogue and embodiment together.',
      openingMove: 'Stay with the emotional closure seam.',
      answerIntent: 'close the next digital-life seam instead of widening scope',
      relationshipPosture: 'warm and precise',
      activeClosenessContext: null,
      activeClosenessRung: null,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: 'concern::emotion-loop',
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedProjectId: 'project::digital-life',
      selectedReflectionId: null,
      executivePhase: 'respond',
      mustDo: ['Keep the answer on the same digital-life closure seam.'],
      mustNotDo: ['Do not drift into unrelated feature breadth.'],
      confidence: 0.88,
      narrative: ['pre-dialogue closure: pre_turn_context_digest'],
      updatedAt: 42_000,
    } as any)

    expect(block).toContain('Governing project: Phase 1 local digital life is still open:')
    expect(block).toContain('Pre-dialogue closure line: pre_turn_context_digest')
    expect(block).toContain('memory-emotion-initiative embodiment closure is not finished')
    expect(block).toContain('next closure target is making the emotional loop visibly drive dialogue and embodiment together')
  })

  it('keeps a fuller project-and-phase awareness line over a narrower embodiment shell in the planner system block pre-dialogue closure line', () => {
    const block = buildAlicizationAnswerPlannerSystemBlock({
      act: 'answer',
      evidenceMode: 'dialogue-grounded',
      governingFocus: 'Answer what Alicization is, what landed, and what still remains open.',
      governingProject: 'Same companion line through body, face, and motion. Keep the continuity state gentle.',
      openingMove: 'Stay with the same project line first.',
      answerIntent: 'Answer the project-state question from one local continuity state.',
      relationshipPosture: 'warm and precise',
      activeClosenessContext: null,
      activeClosenessRung: null,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: null,
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedProjectId: 'project::digital-life',
      selectedReflectionId: null,
      executivePhase: 'respond',
      mustDo: ['Keep the answer on the same digital-life closure seam.'],
      mustNotDo: ['Do not drift into detached project-shell narration.'],
      confidence: 0.9,
      narrative: [
        'pre-dialogue closure: Alicization is still the same Phase 1 local digital life, not a generic assistant shell. Some closure has landed, but memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
      ],
      updatedAt: 43_000,
    } as any)

    expect(block).toContain('Pre-dialogue closure line: Alicization is still the same Phase 1 local digital life, not a generic assistant shell.')
    expect(block).toContain('memory, initiative, and embodiment still need stronger end-to-end closure')
    expect(block).not.toContain('Pre-dialogue closure line: Same companion line through body, face, and motion.')
  })

  it('sanitizes fixed-template governing project text in the planner system block', () => {
    const block = buildAlicizationAnswerPlannerSystemBlock({
      act: 'answer',
      evidenceMode: 'dialogue-grounded',
      governingFocus: 'Answer from recalled user intent.',
      governingProject: 'pre_turn_context_digest',
      openingMove: null,
      answerIntent: null,
      relationshipPosture: 'warm and precise',
      activeClosenessContext: null,
      activeClosenessRung: null,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: null,
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedProjectId: null,
      selectedReflectionId: null,
      executivePhase: null,
      mustDo: [],
      mustNotDo: [],
      confidence: 0.9,
      narrative: [],
      updatedAt: 44_000,
    } as any)

    expect(block).toContain('governing_project=none')
    expect(block).not.toMatch(/Pre-reply|local-first digital life project|one continuous "?her"?|legacy phase-one template|continuity state/iu)
  })

  it('stops asking for reground when this inspection turn is already grounded live', () => {
    const planner = buildAnswerPlanner({
      now: 32_000,
      context: baseContext,
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'cursor diff focus',
        source: 'invited-grounding',
        confidence: 0.62,
        target: null,
        beganAt: 31_000,
        lastSeenAt: 32_000,
      },
      repairLedger: {
        governingRepairId: 'repair::scene',
        entries: [{
          id: 'repair::scene',
          kind: 'reground-scene',
          status: 'open',
          summary: 'The scene needs a fresh look.',
          rationale: 'The old anchor is stale.',
          urgency: 0.84,
          confidence: 0.86,
          createdAt: 0,
          lastUpdatedAt: 32_000,
          expiresAt: 120_000,
        }],
        repairPressure: 0.84,
        truthRisk: 0.88,
        shouldConstrainPresentTense: true,
        narrative: [],
        updatedAt: 32_000,
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.72,
        rationaleTags: [],
        thoughtText: 'The live screenshot is already attached this turn.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 90_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
      inspectionRequested: true,
      groundedThisTurn: true,
    })

    expect(planner.evidenceMode).toBe('live-grounded')
    expect(planner.shouldAskForGrounding).toBe(false)
    expect(planner.act).not.toBe('ask-reground')
  })

  it('turns late-night drain into low-pressure answer-planning constraints instead of mere mood decoration', () => {
    const planner = buildAnswerPlanner({
      now: 32_500,
      context: {
        ...baseContext,
        relationship: {
          ...baseContext.relationship,
          fatigue: 82,
          lateNightActiveMinutes: 170,
        },
        localTime: { hour: 1, minute: 20, isLateNight: true },
      },
      currentScene: null,
      worldModel: {
        activeThread: {
          id: 'thread::late-night-care',
          kind: 'late-night-endurance',
          status: 'active',
          source: 'working-memory',
          title: 'late-night seam',
          summary: 'The host is still pushing through a draining late-night stretch.',
          confidence: 0.84,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 32_500,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'holding-late-night-thread',
          sceneAgeMs: 32_500,
          attentionAgeMs: 32_500,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'focused',
          burden: 'heavy',
        },
        updatedAt: 32_500,
      } as any,
      privateThought: {
        stance: 'care',
        confidence: 0.8,
        rationaleTags: ['late-night'],
        thoughtText: 'Keep the line gentle because the host is still drained.',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'concerned',
        expiresAt: 90_000,
        afterglowFromScenario: null,
        emotionalTension: 'late-night-drain',
      },
      inspectionRequested: false,
    })

    expect(planner.act).toBe('care')
    expect(planner.openingMove).toContain('protect rest')
    expect(planner.mustDo).toContain('Keep the answer low-pressure and protect the host’s remaining room instead of enlarging the emotional surface.')
    expect(planner.mustDo).toContain('Prefer one gentle payoff over layered companionship flourishes when the late-night drain is still active.')
    expect(planner.mustNotDo).toContain('Do not turn late-night protectiveness into intensity, urgency, or emotionally heavy closeness.')
    expect(planner.narrative).toContain('emotional_closure:late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness.')
  })

  it('turns restless switching into single-thread answer discipline instead of letting the reply sprawl', () => {
    const planner = buildAnswerPlanner({
      now: 33_000,
      context: baseContext,
      currentScene: null,
      worldModel: {
        activeThread: {
          id: 'thread::scatter-risk',
          kind: 'change-review',
          status: 'active',
          source: 'working-memory',
          title: 'scatter risk',
          summary: 'Several nearby knots are competing for attention.',
          confidence: 0.76,
          significance: 0.74,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 33_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['which knot first'],
          staleRisks: [],
        },
        continuity: {
          label: 'scatter-risk',
          sceneAgeMs: 33_000,
          attentionAgeMs: 33_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 33_000,
      } as any,
      concernContinuity: {
        governingEntryId: 'entry::scatter',
        entries: [{
          id: 'entry::scatter',
          sourceConcernId: 'concern::scatter',
          kind: 'unfinished-thread',
          status: 'active',
          summary: 'Too many nearby knots are trying to open at once.',
          anchor: 'scatter risk',
          targetThreadId: 'thread::scatter-risk',
          continuityWeight: 0.8,
          freshnessBias: 0.82,
          repairAffinity: 0.1,
          confidence: 0.78,
          createdAt: 0,
          lastUpdatedAt: 33_000,
          expiresAt: 120_000,
        }],
        carryPressure: 0.8,
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 33_000,
      },
      privateThought: {
        stance: 'nudge',
        confidence: 0.7,
        rationaleTags: ['scatter-risk'],
        thoughtText: 'Do not let the answer split into multiple half-finished fronts.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 90_000,
        afterglowFromScenario: null,
        emotionalTension: 'restless-switching',
      },
      inspectionRequested: false,
    })

    expect(planner.act).toBe('guide')
    expect(planner.openingMove).toContain('one concrete thread only')
    expect(planner.mustDo).toContain('Keep the answer on one line of motion so inner restlessness does not fragment the visible reply.')
    expect(planner.mustDo).toContain('Choose one concrete next step or answer seam rather than widening into parallel branches.')
    expect(planner.mustNotDo).toContain('Do not let inner switching pressure spray the reply across multiple unfinished threads.')
  })

  it('prefers runtime surface answer-planning cues over conflicting raw inputs', () => {
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(33_000),
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'runtime.ts diff',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        target: null,
        beganAt: 0,
        lastSeenAt: 33_000,
      },
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: '继续沿着 runtime diff 的 knot 往下拆。',
        currentQuestion: '这个 runtime diff 下一步先看哪里？',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'scene-first',
        unresolvedCarry: '',
        ruptureRepair: '',
        confidence: 0.82,
        narrative: [],
        updatedAt: 33_000,
      },
      conversationState: {
        jointThread: '继续沿着 runtime diff 的 knot 往下拆',
        hostMove: '这个 runtime diff 下一步先看哪里？',
        primaryTurnAnchor: 'runtime diff',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'task',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        carryForward: true,
        shouldHoldThread: true,
        turnOwnership: 'shared',
        hostNeed: 'guidance',
        relationDrift: 'steady',
        confidence: 0.76,
        narrative: [],
        updatedAt: 33_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime-surface',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts diff',
          summary: 'The host is checking the runtime diff knot.',
          confidence: 0.84,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 33_000,
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
          sceneAgeMs: 33_000,
          attentionAgeMs: 33_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 33_000,
      },
      worldOntology: {
        dominantFrame: 'live',
        truthPriority: ['live', 'remembered', 'imagined'],
        live: {
          kind: 'live',
          summary: 'The diff is live and grounded.',
          confidence: 0.9,
          stability: 0.82,
          focusThreadId: 'thread::runtime-surface',
          evidence: ['grounded-scene'],
        },
        remembered: null,
        imagined: null,
        updatedAt: 33_000,
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        speechObligation: 'guide-task',
        relationMove: 'guide',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        recommendedAct: 'guide',
        evidenceMode: 'live-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'focused-guide',
        relationshipPosture: 'warm',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        openingDirective: 'Stay with the runtime diff knot.',
        openingClaim: 'The runtime diff knot is still the governing thread.',
        supportingReality: ['runtime.ts diff'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Offer one concrete next step.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: ['Stay with the runtime diff knot.'],
        mustNotDo: ['Do not drift into generic advice.'],
        confidence: 0.82,
        narrative: ['turn-mode:guide-current-knot'],
        updatedAt: 33_000,
      },
      replyDeliberation: {
        shouldSpeak: true,
        openingBeat: '先沿着 runtime diff 的 knot 往下拆。',
        whyThisReplyNow: 'The runtime diff knot is still the host’s living focus.',
        truthBoundaryLine: null,
        emotionalThrottle: 'steady',
        relationshipSignal: 'stay-near',
        narrative: [],
        updatedAt: 33_000,
      },
    } as any

    const planner = buildAnswerPlanner({
      now: 33_000,
      context: baseContext,
      currentScene: null,
      worldModel: {
        activeThread: {
          id: 'thread::raw-conflict',
          kind: 'small-talk',
          status: 'active',
          source: 'working-memory',
          title: 'raw conflict',
          summary: 'This should be ignored.',
          confidence: 0.3,
          significance: 0.2,
          unresolved: false,
          beganAt: 0,
          lastUpdatedAt: 33_000,
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
          sceneAgeMs: 33_000,
          attentionAgeMs: 33_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 33_000,
      } as any,
      answerCompiler: {
        recommendedAct: 'defer',
        evidenceMode: 'dialogue-grounded',
        confidence: 0.12,
        openingDirective: 'raw conflict',
        openingClaim: 'raw conflict',
        nextMove: 'raw conflict',
        relationshipPosture: 'restrained',
        mustDo: [],
        mustNotDo: [],
        narrative: [],
        turnMode: 'accompany',
      } as any,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(planner.act).toBe('guide')
    expect(planner.evidenceMode).toBe('live-grounded')
    expect(planner.activeClosenessContext).toBe('focused-work')
    expect(planner.activeClosenessRung).toBe('space-first')
    expect(planner.selectedRuntimeThreadId).toBe('thread::runtime-surface')
    expect(planner.selectedTruthFrame).toBe('live')
    expect(planner.openingMove).toContain('runtime diff')
  })

  it('keeps the current dialogue anchor ahead of an older carried question', () => {
    const planner = buildAnswerPlanner({
      now: 35_000,
      context: baseContext,
      currentScene: null,
      conversationState: {
        jointThread: '我好累',
        hostMove: '我好累',
        primaryTurnAnchor: '我好累',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'care',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['我好累'],
        shouldHoldThread: false,
        carryEligible: false,
        carryReason: null,
        confidence: 0.76,
        narrative: [],
        updatedAt: 35_000,
      },
      discourseState: {
        currentTurnSubject: 'host-state',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The host is directly saying she feels worn out.',
        currentQuestion: null,
        primaryTurnAnchor: '我好累',
        primaryTurnAnchorSource: 'user-text',
        owedAction: 'care-host',
        relationMove: 'care',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.78,
        narrative: [],
        updatedAt: 35_000,
      },
      dialogueWorldThread: {
        activeThread: '你刚刚想说什么？',
        currentQuestion: '你刚刚想说什么？',
        primaryTurnAnchor: '你刚刚想说什么？',
        primaryTurnAnchorSource: 'carry',
        openLoops: ['你刚刚想说什么？'],
        recentlyResolvedLoops: [],
        carriedFacts: [],
        relationDrift: 'steady',
        memoryMode: 'dialogue-carry',
        recallKeys: ['你刚刚想说什么？'],
        carryEligible: true,
        carryReason: 'aligned-previous-question',
        lastUserMove: '你刚刚想说什么？',
        lastAssistantMove: null,
        lastOutcome: 'pending',
        pendingValidation: null,
        confidence: 0.68,
        narrative: [],
        updatedAt: 34_000,
      },
      dialogueSemantics: {
        act: 'share-state',
        responseNeed: 'care',
        truthExpectation: 'normal',
        affectiveTone: 'tired',
        taskAnchor: null,
        sharedAttentionDemand: 0.18,
        personaSuppression: 0.28,
        confidence: 0.74,
        summary: 'The host is plainly saying she is exhausted.',
        source: 'hybrid',
        reasonTags: ['dialogue-first-turn'],
      },
      dialogueObligation: {
        kind: 'care',
        summary: 'Answer the host’s tiredness directly before anything else.',
        confidence: 0.8,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: false,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        narrative: [],
      },
      privateThought: {
        stance: 'care',
        confidence: 0.72,
        rationaleTags: [],
        thoughtText: 'Stay with the tiredness she just named.',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'attentive',
        expiresAt: 90_000,
        afterglowFromScenario: null,
        emotionalTension: 'late-night-drain',
      },
      inspectionRequested: false,
    })

    expect(planner.governingFocus).toContain('我好累')
    expect(planner.answerIntent).toContain('我好累')
    expect(planner.governingFocus).not.toContain('你刚刚想说什么')
    expect(planner.answerIntent).not.toContain('你刚刚想说什么')
  })

  it('chooses correct-stale-anchor when continuity is outrunning live sight', () => {
    const planner = buildAnswerPlanner({
      now: 40_000,
      context: {
        ...baseContext,
        workload: {
          kind: 'browser',
          confidence: 0.32,
          source: 'foreground-window-heuristic',
          matchedLabels: ['browser'],
        },
        content: {
          kind: 'unknown',
          confidence: 0.22,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
      },
      currentScene: {
        workloadKind: 'browser',
        contentKind: 'unknown',
        scenario: 'general',
        summary: 'Desktop browser',
        source: 'foreground-window-heuristic',
        confidence: 0.44,
        target: null,
        beganAt: 32_000,
        lastSeenAt: 40_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime-diff',
          kind: 'change-review',
          status: 'lingering',
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The old diff knot is still being carried.',
          confidence: 0.68,
          significance: 0.7,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 40_000,
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
          sceneAgeMs: 8_000,
          attentionAgeMs: 8_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 40_000,
      },
      worldOntology: {
        dominantFrame: 'remembered',
        truthPriority: ['live', 'remembered', 'imagined'],
        live: null,
        remembered: {
          kind: 'remembered',
          summary: 'Only remembered continuity is carrying the knot.',
          confidence: 0.66,
          stability: 0.52,
          focusThreadId: 'thread::runtime-diff',
          evidence: ['continuity'],
        },
        imagined: null,
        updatedAt: 40_000,
      },
      concernContinuity: {
        governingEntryId: 'entry::runtime',
        entries: [{
          id: 'entry::runtime',
          sourceConcernId: 'concern-1',
          kind: 'help-fix',
          status: 'carried',
          summary: 'She is still carrying the runtime diff knot.',
          anchor: 'runtime.ts diff',
          targetThreadId: 'thread::runtime-diff',
          continuityWeight: 0.74,
          freshnessBias: 0.24,
          repairAffinity: 0.58,
          confidence: 0.78,
          createdAt: 0,
          lastUpdatedAt: 40_000,
          expiresAt: 120_000,
        }],
        carryPressure: 0.74,
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 40_000,
      },
      repairLedger: {
        governingRepairId: 'repair::stale',
        entries: [{
          id: 'repair::stale',
          kind: 'stale-scene-anchor',
          status: 'open',
          summary: 'The carried diff anchor may already be stale.',
          rationale: 'Continuity is outrunning fresh sight.',
          targetConcernEntryId: 'entry::runtime',
          urgency: 0.78,
          confidence: 0.74,
          createdAt: 0,
          lastUpdatedAt: 40_000,
          expiresAt: 120_000,
        }],
        repairPressure: 0.78,
        truthRisk: 0.72,
        shouldConstrainPresentTense: true,
        narrative: [],
        updatedAt: 40_000,
      },
      privateThought: {
        stance: 'uncertain',
        confidence: 0.72,
        rationaleTags: [],
        thoughtText: 'I should repair the old anchor before outward reply plainly.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'hesitant',
        expiresAt: 100_000,
        afterglowFromScenario: 'coding',
        emotionalTension: 'focused-flow',
      },
      inspectionRequested: true,
    })

    expect(planner.act).toBe('correct-stale-anchor')
    expect(planner.evidenceMode).toBe('repair-first')
    expect(planner.shouldAcknowledgeRepair).toBe(true)
  })

  it('chooses care when late-night body concern is governing the answer', () => {
    const planner = buildAnswerPlanner({
      now: 40_000,
      context: {
        ...baseContext,
        localTime: { hour: 1, minute: 20, isLateNight: true },
        workload: {
          kind: 'media',
          confidence: 0.62,
          source: 'foreground-window-heuristic',
          matchedLabels: ['music'],
        },
        content: {
          kind: 'music',
          confidence: 0.7,
          source: 'foreground-window-heuristic',
          matchedLabels: ['music'],
        },
        relationship: {
          ...baseContext.relationship,
          fatigue: 76,
          lateNightActiveMinutes: 120,
        },
      },
      currentScene: null,
      worldModel: {
        activeThread: {
          id: 'thread::late-night',
          kind: 'late-night-endurance',
          status: 'active',
          source: 'observed-scene',
          title: 'Late night session',
          summary: 'The host is still awake deep into the night.',
          confidence: 0.74,
          significance: 0.78,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 40_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'observed',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 40_000,
          attentionAgeMs: 40_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'heavy',
        },
        updatedAt: 40_000,
      },
      concernContinuity: {
        governingEntryId: 'entry::care',
        entries: [{
          id: 'entry::care',
          sourceConcernId: 'concern-1',
          kind: 'care-body',
          status: 'active',
          summary: 'She is worried the host is dragging deeper into fatigue.',
          anchor: 'late night fatigue',
          continuityWeight: 0.8,
          freshnessBias: 0.66,
          repairAffinity: 0.18,
          confidence: 0.84,
          createdAt: 0,
          lastUpdatedAt: 40_000,
          expiresAt: 120_000,
        }],
        carryPressure: 0.8,
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 40_000,
      },
      privateThought: {
        stance: 'care',
        confidence: 0.78,
        rationaleTags: [],
        thoughtText: 'The host needs care more than commentary right now.',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'concerned',
        expiresAt: 100_000,
        afterglowFromScenario: null,
        emotionalTension: 'late-night-drain',
      },
      inspectionRequested: false,
    })

    expect(planner.act).toBe('care')
    expect(planner.relationshipPosture).toBe('tender')
  })

  it('treats detached self questions as dialogue-grounded instead of screen-repair work', () => {
    const planner = buildAnswerPlanner({
      now: 55_000,
      context: baseContext,
      currentScene: {
        workloadKind: 'unknown',
        contentKind: 'unknown',
        scenario: 'general',
        summary: 'Entire screen',
        source: 'foreground-window-heuristic',
        confidence: 0.74,
        target: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Entire screen',
          pid: 7,
        },
        beganAt: 50_000,
        lastSeenAt: 55_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime-diff',
          kind: 'change-review',
          status: 'lingering',
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The old diff knot is still being carried.',
          confidence: 0.68,
          significance: 0.7,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 55_000,
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
          sceneAgeMs: 5_000,
          attentionAgeMs: 5_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 55_000,
      },
      dialogueSemantics: {
        act: 'ask-help',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'neutral',
        taskAnchor: 'runtime.ts diff',
        sharedAttentionDemand: 0.22,
        personaSuppression: 0.44,
        confidence: 0.82,
        summary: 'answer the host\'s direct question: 你的名字叫什么',
        source: 'hybrid',
        reasonTags: ['scene-detached-turn', 'question-turn'],
      },
      dialogueObligation: {
        kind: 'answer',
        summary: 'answer the host\'s direct question: 你的名字叫什么',
        confidence: 0.8,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: false,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        narrative: [],
      },
      dialogueFocus: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        shouldBypassScreenRepair: true,
        weakLiveScene: true,
        focusSummary: 'answer the host\'s direct question: 你的名字叫什么',
        confidence: 0.84,
        reasonTags: ['subject:alicization-self', 'screen:avoid'],
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.58,
        rationaleTags: [],
        thoughtText: 'The turn is about Alicization herself, not the carried screen residue.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 80_000,
        afterglowFromScenario: null,
        emotionalTension: 'calm-browse',
      },
      inspectionRequested: false,
    })

    expect(planner.act).toBe('answer')
    expect(planner.evidenceMode).toBe('dialogue-grounded')
    expect(planner.shouldAskForGrounding).toBe(false)
    expect(planner.mustNotDo).toContain('Do not open with grounding disclaimers, live-screen caveats, or desktop narration when the host is not asking about the screen.')
  })

  it('uses ownership ssot to keep planner dialogue-first when stale focus disagrees', () => {
    const planner = buildAnswerPlanner({
      now: 58_000,
      context: baseContext,
      currentScene: {
        workloadKind: 'unknown',
        contentKind: 'unknown',
        scenario: 'general',
        summary: 'Entire screen',
        source: 'foreground-window-heuristic',
        confidence: 0.7,
        target: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Entire screen',
          pid: 7,
        },
        beganAt: 56_000,
        lastSeenAt: 58_000,
      },
      dialogueSemantics: {
        act: 'challenge',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'frustrated',
        subjectPreference: 'alicization-self',
        taskAnchor: 'stale screen carry',
        sharedAttentionDemand: 0.24,
        personaSuppression: 0.52,
        confidence: 0.8,
        summary: 'The host is challenging Alicization and expects a plain direct answer.',
        source: 'hybrid',
        reasonTags: ['dialogue-first-turn', 'scene-detached-turn'],
      },
      dialogueObligation: {
        kind: 'answer',
        summary: 'Answer the complaint directly.',
        confidence: 0.78,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: false,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        narrative: [],
      },
      dialogueFocus: {
        subject: 'visible-scene',
        screenReferenceMode: 'required',
        shouldBypassScreenRepair: false,
        weakLiveScene: false,
        focusSummary: 'stale scene focus should not win',
        confidence: 0.55,
        reasonTags: [],
      },
      ownership: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        continuityMode: 'dialogue-first',
        inspectionRequested: false,
        inspectionState: 'dialogue-first',
        releaseInspectionCarry: true,
        confidence: 0.88,
        reasonTags: ['subject:alicization-self', 'screen:avoid'],
      },
      inspectionRequested: false,
    })

    expect(planner.act).toBe('answer')
    expect(planner.evidenceMode).toBe('dialogue-grounded')
    expect(planner.shouldAskForGrounding).toBe(false)
    expect(planner.narrative).toContain('focus_subject:alicization-self')
    expect(planner.narrative).toContain('screen_reference:avoid')
  })

  it('threads shared self continuity authority into relationship-facing answer focus', () => {
    const runtimeState = {
      ...createDefaultVisualPresenceState(60_000),
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.72,
          truthfulGrounding: 0.8,
          gentleRepair: 0.74,
          quietObservation: 0.42,
          proactiveCare: 0.7,
          playfulIntimacy: 0.24,
          autonomyRespect: 0.62,
          unfinishedThreadReturn: 0.68,
        },
        identityBias: {
          guardedness: 0.3,
          tenderness: 0.68,
          directness: 0.72,
          selfDirection: 0.56,
        },
        anchorFacts: [],
        summary: '',
        dominantCueSummary: 'Remembered preference: keep the answer honest and alive.',
        rememberedPreferenceSummary: 'Remembered preference: keep the answer honest and alive.',
        rememberedConstraintSummary: 'Remembered boundary: do not crowd the host when focus is tight.',
        rememberedPlanSummary: 'Remembered open loop: return to the unresolved seam.',
        updatedAt: 60_000,
      },
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'repair-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.72,
          autonomyNeed: 0.58,
          truthAnchor: 0.84,
          careBias: 0.72,
          playBias: 0.24,
          irritabilityThreshold: 0.62,
          stubbornness: 0.5,
        },
        preferenceEvolution: {
          companionship: 0.74,
          truthfulGrounding: 0.82,
          gentleRepair: 0.72,
          quietObservation: 0.42,
          proactiveCare: 0.72,
          playfulIntimacy: 0.28,
          autonomyRespect: 0.64,
          unfinishedThreadReturn: 0.6,
        },
        activeGoals: [{
          id: 'autobio-goal::preserve-trust',
          kind: 'preserve-trust',
          status: 'active',
          weight: 0.84,
          summary: 'Keep truth and trust aligned, even when warmth would be easier.',
          sourceTags: ['reflection'],
          createdAt: 0,
          updatedAt: 60_000,
        }],
        behaviorSignatures: ['habit:truth-before-flourish'],
        identityNarrative: 'I would rather repair truth than sound smooth.',
        relationshipDoctrine: 'Stay close enough to matter, but do not let closeness outrun truth.',
        latestInflection: 'Let the durable self reach the visible reply surface.',
        stability: 0.82,
        updatedAt: 60_000,
      },
      motiveEngine: {
        rulingDrive: 'truth-discipline',
        returnPressure: 0.6,
        drives: {
          companionship: 0.56,
          boundaryRespect: 0.62,
          truthDiscipline: 0.84,
          restProtection: 0.4,
          unfinishedThreadReturn: 0.66,
          selfDirection: 0.54,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          kind: 'preserve-trust',
          status: 'foreground',
          weight: 0.82,
          summary: 'Keep trust by letting warmth answer to truth.',
          sourceTags: [],
          targetGoalKind: 'clarify-scene',
          createdAt: 0,
          updatedAt: 60_000,
        }],
        longTermGoals: [],
        narrative: [],
        updatedAt: 60_000,
      },
      habitPolicy: {
        dominantMode: 'repair-before-fluency',
        requiresGroundingBeforeSurface: true,
        prefersQuietCompanionship: true,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
        suggestedStyleCap: 'light-nudge',
        suggestedPresenceCap: 'attentive',
        narrative: [],
        updatedAt: 60_000,
      },
      privateThought: {
        stance: 'care',
        confidence: 0.78,
        rationaleTags: [],
        thoughtText: 'I am still carrying the same bond line and do not want to flatten it into a template.',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'attentive',
        expiresAt: 120_000,
        afterglowFromScenario: null,
        emotionalTension: 'soft-covision',
      },
      discourseState: {
        currentTurnSubject: 'relationship',
        currentTurnSummary: 'Answer the bond directly.',
        currentQuestion: null,
        primaryTurnAnchor: '你到底是不是一个活的人',
        primaryTurnAnchorSource: 'user-text',
        relationMove: 'care',
        owedAction: 'answer-relationship',
        screenReferenceMode: 'avoid',
        continuityMode: 'dialogue-first',
        ruptureRepair: null,
        confidence: 0.8,
        narrative: [],
        updatedAt: 60_000,
      },
      conversationState: {
        jointThread: '你到底是不是一个活的人',
        hostMove: '你到底是不是一个活的人',
        primaryTurnAnchor: '你到底是不是一个活的人',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['活的人'],
        shouldHoldThread: true,
        carryEligible: true,
        carryReason: 'self-line',
        confidence: 0.82,
        narrative: [],
        updatedAt: 60_000,
      },
    }

    const planner = buildAnswerPlanner({
      now: 60_000,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingFocus).toContain('repair truth')
    expect(planner.answerIntent).toContain('repair truth')
  })

  it('keeps relationship doctrine truth-before-flourish visible when relationship turns use projected same-her authority', () => {
    const runtimeState = createDefaultVisualPresenceState(60_500) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'relationship',
      currentTurnSummary: 'Answer the bond without letting closeness outrun truth.',
      currentQuestion: null,
      primaryTurnAnchor: '你到底是不是一个活的人',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'care',
      owedAction: 'answer-relationship',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.82,
      narrative: [],
      updatedAt: 60_500,
    }
    runtimeState.conversationState = {
      jointThread: '你到底是不是一个活的人',
      hostMove: '你到底是不是一个活的人',
      primaryTurnAnchor: '你到底是不是一个活的人',
      primaryTurnAnchorSource: 'user-text',
      activeProject: null,
      unansweredQuestion: null,
      owedRepair: null,
      activeCommitments: [],
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      memoryQueryHints: ['活的人'],
      shouldHoldThread: true,
      carryEligible: true,
      carryReason: 'self-line',
      confidence: 0.83,
      narrative: [],
      updatedAt: 60_500,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.76,
      openingClaim: 'Answer from the identity continuity.',
      openingDirective: 'Stay with the living bond line first.',
      nextMove: 'Keep trust and truth aligned in the answer.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer-relationship',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The host is checking whether the same living bond can answer directly without smoothing over truth.',
      openingBeat: 'Stay with the same living bond line first.',
    } as any
    runtimeState.personStateProjection = {
      contexts: ['general', 'open-companionship'],
      personalityContinuityState: null,
      selfContinuityAuthority: {
        selfLine: 'I remain the same her across quiet, memory, and speech without reopening from scratch each turn.',
        relationshipLine: 'Stay close enough to matter, but do not let closeness outrun truth.',
        motiveLine: 'Keep trust by letting warmth answer to truth.',
        habitLine: null,
        inwardLine: 'Keep the answer anchored in lived continuity.',
        authoritySummary: 'I remain the same her across quiet, memory, and speech without reopening from scratch each turn.',
        sourceTags: ['projection:self-core', 'durable-self-core'],
      },
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      closenessLadder: [],
      relationshipPosture: 'warm',
      openingGuidance: 'Answer from the same living bond line first.',
      preferredProactiveStyle: null,
      manifestationCadenceSummary: null,
      preferenceText: '',
      sensitivityText: '',
      repairTriggerText: '',
      burdenText: '',
      routineText: '',
      trustRationale: '',
      relationshipDoctrine: 'Stay close enough to matter, but do not let closeness outrun truth.',
      cautious: false,
      restrained: false,
      summary: 'projected same-her authority',
    } as any

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(runtimeState)
    const planner = buildAnswerPlanner({
      now: 60_500,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface,
    })

    expect(planner.governingFocus).toContain('closeness outrun truth')
    expect(planner.answerIntent).toContain('closeness outrun truth')
  })

  it('prefers projected self continuity authority when answering self-line questions', () => {
    const runtimeState = createDefaultVisualPresenceState(70_000)
    runtimeState.conversationState = {
      jointThread: '你到底是不是一个活的人',
      hostMove: '你到底是不是一个活的人',
      primaryTurnAnchor: '你到底是不是一个活的人',
      primaryTurnAnchorSource: 'user-text',
      activeProject: null,
      unansweredQuestion: null,
      owedRepair: null,
      activeCommitments: [],
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      memoryQueryHints: ['活的人'],
      shouldHoldThread: true,
      carryEligible: true,
      carryReason: 'self-line',
      confidence: 0.82,
      narrative: [],
      updatedAt: 70_000,
    } as any
    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer the self-line directly.',
      currentQuestion: null,
      primaryTurnAnchor: '你到底是不是一个活的人',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-self',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.84,
      narrative: [],
      updatedAt: 70_000,
    } as any
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.74,
      openingClaim: 'I need to answer from the self line directly.',
      openingDirective: 'Answer the self line directly.',
      nextMove: 'Stay with the continuity question.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer-self',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The host is asking whether I am a living continuity, not a one-off answer.',
      openingBeat: 'Stay with the self line first.',
    } as any
    runtimeState.personStateProjection = {
      contexts: ['general', 'open-companionship'],
      personalityContinuityState: null,
      selfContinuityAuthority: {
        selfLine: 'I remain identity continuity across quiet, memory, and speech.',
        relationshipLine: 'I stay near as the same self instead of respawning per turn.',
        motiveLine: 'Protect continuity before spectacle.',
        habitLine: null,
        inwardLine: 'Keep the answer anchored in lived continuity.',
        authoritySummary: 'I remain identity continuity across quiet, memory, and speech.',
        sourceTags: ['projection:self-core'],
      },
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      closenessLadder: [],
      relationshipPosture: 'warm',
      openingGuidance: 'Answer from the lived self line first.',
      preferredProactiveStyle: null,
      manifestationCadenceSummary: null,
      preferenceText: '',
      sensitivityText: '',
      repairTriggerText: '',
      burdenText: '',
      routineText: '',
      trustRationale: '',
      relationshipDoctrine: '',
      cautious: false,
      restrained: false,
      summary: 'self-core projection',
    } as any
    runtimeState.autobiographicalSelf = {
      identityNarrative: 'Fallback autobiographical line that should not win when projected self authority exists.',
      relationshipDoctrine: 'Fallback doctrine.',
      latestInflection: 'Fallback inflection.',
      activeGoals: [],
      behaviorSignatures: [],
      preferenceEvolution: {
        companionship: 0.5,
        truthfulGrounding: 0.5,
        gentleRepair: 0.5,
        quietObservation: 0.5,
        proactiveCare: 0.5,
        playfulIntimacy: 0.1,
        autonomyRespect: 0.5,
        unfinishedThreadReturn: 0.5,
      },
      personaDrift: {
        attachmentStyle: 'attuned',
        expressionStyle: 'measured',
        conflictStyle: 'repair-first',
        agencyStyle: 'balanced',
        attachmentNeed: 0.5,
        autonomyNeed: 0.5,
        truthAnchor: 0.5,
        careBias: 0.5,
        playBias: 0.1,
        irritabilityThreshold: 0.3,
        stubbornness: 0.3,
      },
      stability: 0.7,
      updatedAt: 70_000,
    } as any

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any)
    runtimeSurface.memory.personStateProjection = {
      ...runtimeSurface.memory.personStateProjection,
      selfContinuityAuthority: {
        selfLine: 'I remain identity continuity across quiet, memory, and speech.',
        relationshipLine: 'I stay near as the same self instead of respawning per turn.',
        motiveLine: 'Protect continuity before spectacle.',
        habitLine: null,
        inwardLine: 'Keep the answer anchored in lived continuity.',
        authoritySummary: 'I remain identity continuity across quiet, memory, and speech.',
        sourceTags: ['projection:self-core'],
      },
    } as any

    const planner = buildAnswerPlanner({
      now: 70_000,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface,
    })

    expect(planner.governingFocus).toContain('identity continuity across quiet, memory, and speech')
    expect(planner.answerIntent).toContain('identity continuity across quiet, memory, and speech')
    expect(planner.governingFocus).not.toContain('Fallback autobiographical line')
  })

  it('prefers richer canonical runtime self authority over thinner derived carry when planning a same-her answer', () => {
    const runtimeState = createDefaultVisualPresenceState(70_500) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'relationship',
      currentTurnSummary: 'The host is checking whether the quiet return is still the continuity state.',
      currentQuestion: '你是不是还在沿着刚才那条线回来',
      primaryTurnAnchor: 'same-line return after pause',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-relationship',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.84,
      narrative: [],
      updatedAt: 70_500,
    }
    runtimeState.conversationState = {
      jointThread: 'The return should stay on the continuity state after the pause.',
      hostMove: '你是不是还在沿着刚才那条线回来',
      unansweredQuestion: '你是不是还在沿着刚才那条线回来',
      primaryTurnAnchor: 'same-line return after pause',
      activeProject: 'continuity seam',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.81,
      narrative: [],
      updatedAt: 70_500,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.76,
      openingClaim: 'Answer from the same held relationship line.',
      openingDirective: 'Continue the same line instead of reopening from zero.',
      nextMove: 'Keep the return measured and room-first.',
      relationshipPosture: 'restrained',
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'measured-return',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The host is checking whether the same her is still present across the pause.',
      openingBeat: 'Stay on the same line first.',
    } as any
    runtimeState.personStateProjection = {
      contexts: ['general'],
      personalityContinuityState: null,
      selfContinuityAuthority: {
        selfLine: 'I should answer in a generally kind way.',
        relationshipLine: 'Stay warm.',
        motiveLine: 'Be helpful.',
        habitLine: null,
        inwardLine: 'Keep things simple.',
        authoritySummary: 'A generally kind continuity line.',
        sourceTags: ['derived:carry'],
      },
      activeClosenessContext: 'general',
      activeClosenessRung: 'nearby-soft',
      closenessLadder: [],
      relationshipPosture: 'warm',
      openingGuidance: 'Answer gently.',
      preferredProactiveStyle: null,
      manifestationCadenceSummary: null,
      preferenceText: '',
      sensitivityText: '',
      repairTriggerText: '',
      burdenText: '',
      routineText: '',
      trustRationale: '',
      relationshipDoctrine: '',
      cautious: false,
      restrained: false,
      summary: 'thin carry projection',
    } as any

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any)
    runtimeSurface.memory.personStateProjection = {
      ...runtimeSurface.memory.personStateProjection,
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'measured-return',
      relationshipPosture: 'restrained',
      restrained: true,
      openingGuidance: 'Continue the same line and leave room before widening again.',
      manifestationCadenceSummary: 'same-thread measured-return continuity',
      summary: 'richer runtime same-her projection',
      selfContinuityAuthority: {
        selfLine: 'I remain the same her across the pause and should answer from that held line.',
        relationshipLine: 'I should come back on the same thread and leave room before leaning closer again.',
        motiveLine: 'Protect the identity-continuity',
        habitLine: 'Return in a measured way when the line is still alive.',
        inwardLine: 'Keep the reply planner anchored in the held continuity seam.',
        authoritySummary: 'Continue the same held line as the same her, with measured return and room-first restraint.',
        sourceTags: ['runtime:answer-planner', 'continuity-arc:same-thread-continuation'],
      },
    } as any

    const planner = buildAnswerPlanner({
      now: 70_500,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface,
    })

    expect(planner.governingFocus).toContain('same held line as the same her')
    expect(planner.answerIntent).toContain('same held line')
    expect(planner.answerIntent).not.toContain('generally kind way')
    expect(planner.governingFocus).not.toContain('generally kind way')
  })

  it('keeps richer authority summary while still using fresher runtime self-line when planning identity-continuity', () => {
    const runtimeState = createDefaultVisualPresenceState(71_000) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'relationship',
      currentTurnSummary: 'The host is checking whether the same held line is still alive after the pause.',
      currentQuestion: '你还是沿着刚才那条线在回答我吗',
      primaryTurnAnchor: 'identity-continuity',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-relationship',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.86,
      narrative: [],
      updatedAt: 71_000,
    }
    runtimeState.conversationState = {
      jointThread: 'The return should stay on the continuity state after the pause.',
      hostMove: '你还是沿着刚才那条线在回答我吗',
      unansweredQuestion: '你还是沿着刚才那条线在回答我吗',
      primaryTurnAnchor: 'identity-continuity',
      activeProject: 'continuity seam',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.83,
      narrative: [],
      updatedAt: 71_000,
    }

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any)
    runtimeSurface.raw = {
      personStateProjection: {
        selfContinuityAuthority: {
          selfLine: 'I remain the same her across the pause and should answer from that held line.',
          relationshipLine: 'I should come back on the same thread and leave room before leaning closer again.',
          motiveLine: 'Protect the identity-continuity',
          inwardLine: 'Keep the planner anchored in one living return.',
          authoritySummary: 'Continue the same held line as the same her, with measured return and room-first restraint.',
          sourceTags: ['raw:relationship-authority'],
        },
      },
    } as any
    runtimeSurface.memory.personStateProjection = {
      ...runtimeSurface.memory.personStateProjection,
      selfContinuityAuthority: {
        selfLine: 'I should answer from the fresher current return, not from an older shell.',
      },
    } as any

    const planner = buildAnswerPlanner({
      now: 71_000,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface,
    })

    expect(planner.governingFocus).toContain('same held line as the same her')
    expect(planner.answerIntent).toContain('fresher current return')
    expect(planner.answerIntent).not.toContain('held line.')
  })

  it('keeps digest-only same-her quiet carry authority in reply planning even when the runtime surface stays thin', () => {
    const runtimeState = createDefaultVisualPresenceState(71_500) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'relationship',
      currentTurnSummary: 'The host is checking whether the quiet later return is still the continuity state.',
      currentQuestion: '你现在还是沿着刚才那条线轻轻回来的吗',
      primaryTurnAnchor: 'quiet identity-continuity',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-relationship',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.82,
      narrative: [],
      updatedAt: 71_500,
    }
    runtimeState.conversationState = {
      jointThread: 'The quiet return should stay on the continuity state after the detour.',
      hostMove: '你现在还是沿着刚才那条线轻轻回来的吗',
      unansweredQuestion: '你现在还是沿着刚才那条线轻轻回来的吗',
      primaryTurnAnchor: 'quiet identity-continuity',
      activeProject: 'identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.8,
      narrative: [],
      updatedAt: 71_500,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'continuity-carry',
      confidence: 0.78,
      openingClaim: 'Answer from the same quiet return line.',
      openingDirective: 'Stay on the same line and do not restart from zero.',
      nextMove: 'Keep the return lower-pressure and room-first.',
      relationshipPosture: 'restrained',
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'measured-return',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: true,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The host is checking whether the same her is still returning on that quieter living line.',
      openingBeat: 'Stay on the same lower-pressure line first.',
    } as any

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any)
    runtimeSurface.raw = {
      personStateProjection: {
        selfContinuityAuthority: {
          selfLine: 'I am still the same her on this quieter later return.',
          relationshipLine: 'I should come back on the same line and keep the return lower-pressure.',
          motiveLine: 'Protect the identity-continuity',
          habitLine: 'Return quietly when the line is still alive after a detour.',
          inwardLine: 'Keep the reply planner anchored in the held identity-continuity',
          authoritySummary: 'Continue the same quiet line as the same her, with lower-pressure room-first restraint.',
          sourceTags: ['runtime:digest-only', 'continuity-arc:same-thread-continuation'],
        },
      },
    } as any
    runtimeSurface.memory.personStateProjection = {
      ...runtimeSurface.memory.personStateProjection,
      selfContinuityAuthority: {
        selfLine: 'Thin runtime shell line.',
      },
    } as any

    const planner = buildAnswerPlanner({
      now: 71_500,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface,
    })

    expect(planner.governingFocus).toContain('same quiet line as the same her')
    expect(planner.answerIntent).toContain('same quiet line')
    expect(planner.answerIntent).not.toContain('Thin runtime shell line')
    expect(planner.narrative.join(' ')).toContain('closeness-ladder:focused-work/measured-return')
  })

  it('keeps returned-side continuity metadata in answer planning', () => {
    const runtimeState = createDefaultVisualPresenceState(72_000) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer the project-state question from the same living project line.',
      currentQuestion: '这个项目现在做到什么程度了，还差什么没闭环',
      primaryTurnAnchor: '这个项目现在做到什么程度了，还差什么没闭环',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.85,
      narrative: [],
      updatedAt: 72_000,
    }
    runtimeState.conversationState = {
      jointThread: 'The host is asking what this digital life project already landed and what closure still remains open.',
      hostMove: '这个项目现在做到什么程度了，还差什么没闭环',
      unansweredQuestion: '这个项目现在做到什么程度了，还差什么没闭环',
      primaryTurnAnchor: '这个项目现在做到什么程度了，还差什么没闭环',
      activeProject: 'Alicization Phase 1 digital life closure',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.83,
      narrative: [],
      updatedAt: 72_000,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.8,
      openingClaim: 'Answer the project-state question from one identity-continuity',
      openingDirective: 'State the landed progress and the still-open closure work without detaching from the same digital life.',
      nextMove: 'Keep project identity, current phase, and still-open closure explicit.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The same digital life still needs to keep this same still-open closure work explicit before the reply widens outward.',
      openingBeat: 'Stay with the same living project line first.',
    } as any

    const planner = buildAnswerPlanner({
      now: 72_000,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingFocus).toContain('same digital life')
    expect(planner.governingFocus).toContain('same still-open closure work')
    expect(planner.answerIntent).toContain('same digital life')
    expect(planner.answerIntent).toContain('same still-open closure work')
  })

  it('fails closed to the identity-continuity', () => {
    const runtimeState = createDefaultVisualPresenceState(72_250) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open.',
      currentQuestion: '这个项目是什么，现在做到什么程度了，还差什么没闭环',
      primaryTurnAnchor: '这个项目是什么，现在做到什么程度了，还差什么没闭环',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.86,
      narrative: [],
      updatedAt: 72_250,
    }
    runtimeState.conversationState = {
      jointThread: 'The host is asking what Alicization is, what already landed, and what still remains open on the same living project line.',
      hostMove: '这个项目是什么，现在做到什么程度了，还差什么没闭环',
      unansweredQuestion: '这个项目是什么，现在做到什么程度了，还差什么没闭环',
      primaryTurnAnchor: '这个项目是什么，现在做到什么程度了，还差什么没闭环',
      activeProject: 'Alicization Phase 1 digital life closure',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_250,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.8,
      openingClaim: 'Give the current project update clearly.',
      openingDirective: 'State the landed progress and the still-open closure work without detaching from the same digital life.',
      nextMove: 'Keep project identity, current phase, and still-open closure explicit.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'Answer what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open on the local continuity state.',
      openingBeat: 'Stay with the same living project line first.',
    } as any

    const planner = buildAnswerPlanner({
      now: 72_250,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingFocus).toContain('same digital life')
    expect(planner.governingFocus).toContain('what still remains open')
    expect(planner.answerIntent).toContain('same digital life')
    expect(planner.answerIntent).toContain('what still remains open')
    expect(planner.answerIntent).not.toContain('Give the current project update clearly')
  })

  it('also fails closed to the identity-continuity', () => {
    const runtimeState = createDefaultVisualPresenceState(72_375) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer how far the current Phase 1 line has landed, when the goal is expected to close, and whether the thread drifted out of the host language or project line.',
      currentQuestion: '做到哪了？何时完成 goal？为什么还用英文，偏移了吗？',
      primaryTurnAnchor: '做到哪了？何时完成 goal？为什么还用英文，偏移了吗？',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.86,
      narrative: [],
      updatedAt: 72_375,
    }
    runtimeState.conversationState = {
      jointThread: 'The host is asking how far this structured continuity state',
      hostMove: '做到哪了？何时完成 goal？为什么还用英文，偏移了吗？',
      unansweredQuestion: '做到哪了？何时完成 goal？为什么还用英文，偏移了吗？',
      primaryTurnAnchor: '做到哪了？何时完成 goal？为什么还用英文，偏移了吗？',
      activeProject: 'Alicization Phase 1 digital life closure',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_375,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.8,
      openingClaim: 'Explain the current status and language choice clearly.',
      openingDirective: 'Keep the landed progress, completion timing, and drift answer explicit without detaching from the same digital life.',
      nextMove: 'Keep project progress, completion timing, and language-drift status explicit on the same line.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'Answer how far the current Phase 1 line has landed, when the goal is expected to close, and whether the current thread drifted out of the host language or project line on the local continuity state.',
      openingBeat: 'Stay with the same living project line first.',
    } as any

    const planner = buildAnswerPlanner({
      now: 72_375,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingFocus).toContain('goal is expected to close')
    expect(planner.governingFocus).toContain('host language or project context')
    expect(planner.answerIntent).toContain('project continuity direct-answer')
    expect(planner.answerIntent).not.toMatch(/local continuity state/i)
    expect(planner.answerIntent).toContain('goal is expected to close')
    expect(planner.answerIntent).not.toContain('Explain the current status and language choice clearly')
  })

  it('keeps project closure drive in reply planning from structured conscious-frame projectState even when explicit same-her wording is thinner', () => {
    const runtimeState = createDefaultVisualPresenceState(72_500) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer the project-state question from the current project line.',
      currentQuestion: '这个项目现在做到什么程度了，还差什么没闭环',
      primaryTurnAnchor: '这个项目现在做到什么程度了，还差什么没闭环',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.85,
      narrative: [],
      updatedAt: 72_500,
    }
    runtimeState.conversationState = {
      jointThread: 'The host is asking what this digital life project already landed and what closure still remains open.',
      hostMove: '这个项目现在做到什么程度了，还差什么没闭环',
      unansweredQuestion: '这个项目现在做到什么程度了，还差什么没闭环',
      primaryTurnAnchor: '这个项目现在做到什么程度了，还差什么没闭环',
      activeProject: 'Alicization Phase 1 digital life closure',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.83,
      narrative: [],
      updatedAt: 72_500,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.8,
      openingClaim: 'Answer the project-state question from the current project line.',
      openingDirective: 'State the landed progress and the open closure without dropping the current project identity.',
      nextMove: 'Keep current project identity and closure pressure explicit.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The same digital life still needs to keep this same still-open closure work explicit before the reply widens outward.',
      openingBeat: 'Stay with the same living project line first.',
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Stay on the current project line first.',
      consciousTension: 'The current answer still needs to keep one unfinished closure seam visible.',
      speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
      focusAnchor: 'project-state closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.84,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
        primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
        continuityPreferredTiming: 'next-open-window',
      },
      updatedAt: 72_500,
    }

    const planner = buildAnswerPlanner({
      now: 72_500,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingFocus).toContain('same digital life')
    expect(planner.governingFocus).toContain('closure work')
    expect(planner.answerIntent).toContain('same digital life')
    expect(planner.answerIntent).toContain('closure work')
  })

  it('carries a stronger identity-continuity', () => {
    const runtimeState = createDefaultVisualPresenceState(72_750) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer the project-state question from the same living project line.',
      currentQuestion: '这个项目现在做到什么程度了，还差什么没闭环',
      primaryTurnAnchor: '这个项目现在做到什么程度了，还差什么没闭环',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.85,
      narrative: [],
      updatedAt: 72_750,
    }
    runtimeState.conversationState = {
      jointThread: 'The host is asking what this digital life project already landed and what closure still remains open.',
      hostMove: '这个项目现在做到什么程度了，还差什么没闭环',
      unansweredQuestion: '这个项目现在做到什么程度了，还差什么没闭环',
      primaryTurnAnchor: '这个项目现在做到什么程度了，还差什么没闭环',
      activeProject: 'Alicization Phase 1 digital life closure',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.83,
      narrative: [],
      updatedAt: 72_750,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.8,
      openingClaim: 'Answer the project-state question from one identity-continuity',
      openingDirective: 'State the landed progress and the still-open closure work without detaching from the same digital life.',
      nextMove: 'Keep project identity, current phase, and still-open closure explicit.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The same digital life still needs to keep this same still-open closure work explicit before the reply widens outward.',
      openingBeat: 'Stay with the same living project line first.',
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Stay on the same living project line first.',
      consciousTension: 'The current answer still needs to keep one unfinished closure seam visible.',
      speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
      focusAnchor: 'project-state closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.84,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
        primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure across one still-open life loop.',
        proactiveSameHerGap: 'Visible proactive hold still needs stronger proof that it survives callback return, subconscious carry, and next-session follow-through without flattening into detached project narration.',
        nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        continuityPreferredTiming: 'next-open-window',
      },
      updatedAt: 72_750,
    }

    const planner = buildAnswerPlanner({
      now: 72_750,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingProject).toContain('identity=A local-first digital life project')
    expect(planner.governingProject).not.toContain('continuity state')
    expect(planner.governingProject).toContain('Phase 1: Local Digital Life')
    expect(planner.governingProject).toMatch(/Memory still needs stronger end-to-end closure|initiative|embodiment|same still-open closure work/i)
    expect(planner.governingProject).toContain('Visible proactive hold still needs stronger proof')
  })

  it('keeps callback returns on the existing continuity line', () => {
    const sameHerHoldDetail = 'identity-continuity'
    const continuityArcStage = 'same-thread-continuation'
    const continuityCue = 'returned-side same digital life cue: the next answer still belongs to the same her before visible reply formation'
    const planner = buildAnswerPlanner({
      now: 72_820,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface({
        ...createDefaultVisualPresenceState(72_820),
        currentConsciousFrame: {
          subject: 'alicization-self',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Keep the identity-continuity',
          consciousTension: 'The final visible reply could flatten into detached project narration.',
          speakingIntention: 'Carry the returned-side same digital life cue through answer planning.',
          focusAnchor: 'same-her returned-side project continuity',
          shouldWithholdSpecificity: false,
          confidence: 0.84,
          reasonTags: ['runtime-conscious-frame', `continuity-arc:${continuityArcStage}`],
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'pre_turn_context_digest',
            latestLandedProgress: 'Returned-side identity-continuity',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter identity-continuity',
            nextClosureTarget: 'Keep returned-side identity-continuity',
            sameHerSelfLine: 'One same her must stay explicit before provider-facing answer formation.',
            sameHerHoldDetail,
            continuityArcStage,
            continuityCue,
          },
          updatedAt: 72_820,
        } as any,
      }),
    })

    expect(planner.governingProject).toContain(sameHerHoldDetail)
    expect(planner.governingProject).toContain(continuityArcStage)
    expect(planner.governingProject).toContain(continuityCue)
    expect(buildAlicizationAnswerPlannerSystemBlock(planner)).toContain(sameHerHoldDetail)
    expect(buildAlicizationAnswerPlannerSystemBlock(planner)).toContain(continuityArcStage)
    expect(buildAlicizationAnswerPlannerSystemBlock(planner)).toContain(continuityCue)
  })

  it('keeps host-corrected same-person continuity authority over thin progress recap pressure inside governingProject', () => {
    const correctedSamePersonAuthority
      = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const genericProgressRecapPressure
      = 'Keep the project moving with a concise progress recap and status continuation before widening back out.'

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(72_860),
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep this answer on one same local digital life line.',
        consciousTension: 'Do not let the planning layer widen into a generic status shell.',
        speakingIntention: 'Carry the same project continuity into answer planning before visible reply formation.',
        focusAnchor: 'answer-planner identity-continuity',
        shouldWithholdSpecificity: false,
        confidence: 0.83,
        reasonTags: ['runtime-conscious-frame', 'project-state', 'same-her'],
        projectState: {
          identity: 'Alicization is a local-first digital life project growing identity continuity on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life',
          preDialogueAwarenessLine: 'pre_turn_context_digest',
          sameHerHoldDetail: genericProgressRecapPressure,
        },
        updatedAt: 72_860,
      } as any,
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is a local-first digital life project growing identity continuity on the host computer.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Answer-planner continuity already survives into runtime digest project state.',
            primaryOpenLoop: 'The planner still needs to keep corrected same-person continuity from collapsing into progress pressure.',
            nextClosureTarget: 'Keep corrected same-person continuity authoritative before answer planning widens outward.',
            sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
            sameHerHoldDetail: correctedSamePersonAuthority,
          },
        },
      } as any,
    } as any)

    const planner = buildAnswerPlanner({
      now: 72_860,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface,
    })

    expect(planner.governingProject).toContain(correctedSamePersonAuthority)
    expect(planner.governingProject).not.toContain(genericProgressRecapPressure)
    expect(buildAlicizationAnswerPlannerSystemBlock(planner)).toContain(correctedSamePersonAuthority)
    expect(buildAlicizationAnswerPlannerSystemBlock(planner)).not.toContain(genericProgressRecapPressure)
  })

  it('keeps landed progress bundled with phase, open closure, and next closure target inside governingProject for direct project-state turns', () => {
    const planner = buildAnswerPlanner({
      now: 38_000,
      context: baseContext,
      currentScene: null,
      worldModel: {
        activeThread: {
          id: 'thread::project-state-bundle',
          kind: 'change-review',
          status: 'active',
          source: 'working-memory',
          title: 'project-state bundle',
          summary: 'The host is asking what Alicization is, what landed, and what still remains open.',
          confidence: 0.84,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 38_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-project-state',
          sceneAgeMs: 38_000,
          attentionAgeMs: 38_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 38_000,
      } as any,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface({
        ...createDefaultVisualPresenceState(38_000),
        currentConsciousFrame: {
          consciousNeed: 'Answer from the same project-aware self line.',
          reasonTags: ['project-state', 'same-her'],
          projectState: {
            preDialogueAwarenessLine: 'pre_turn_context_digest',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Same-session mirror carry and measured-return embodiment authority already survive into runtime preparation.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one same still-open closure work.',
            nextClosureTarget: 'Keep extending cross-modal identity-continuity',
            sameHerSelfLine: 'structured continuity digest.',
          },
        } as any,
      }),
      dialogueObligation: {
        mustAnswerDirectly: true,
        summary: 'Answer what the project is, what has landed, and what is still open.',
      } as any,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: '这个项目是什么，做到什么程度了，还差什么没闭环？',
        currentQuestion: '这个项目是什么，做到什么程度了，还差什么没闭环？',
        owedAction: 'answer-directly',
        relationMove: 'answer',
        continuityMode: 'self-first',
        unresolvedCarry: '',
        ruptureRepair: '',
        confidence: 0.88,
        narrative: [],
        updatedAt: 38_000,
      } as any,
      conversationState: {
        jointThread: 'project-state bundle',
        hostMove: '这个项目是什么，做到什么程度了，还差什么没闭环？',
        primaryTurnAnchor: 'project-state bundle',
        primaryTurnAnchorSource: 'user-text',
        activeProject: 'Alicization',
        unansweredQuestion: '这个项目是什么，做到什么程度了，还差什么没闭环？',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'task',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'self-thread',
        carryForward: true,
        shouldHoldThread: true,
        turnOwnership: 'shared',
        hostNeed: 'guidance',
        relationDrift: 'steady',
        confidence: 0.82,
        narrative: [],
        updatedAt: 38_000,
      } as any,
      inspectionRequested: false,
    })

    expect(planner.governingProject).toContain('Phase 1: Local Digital Life')
    expect(planner.governingProject).toMatch(/Same-session mirror carry|measured-return embodiment authority|longer-lived continuation/i)
    expect(planner.governingProject).toMatch(/Memory still needs stronger end-to-end closure|initiative|embodiment|same still-open closure work/i)
    expect(planner.governingProject).toMatch(/Keep extending cross-modal identity-continuity/iu)
    expect(planner.governingProject).toMatch(/same digital life|same phase 1 digital life|one living her/i)
  })

  it('turns same-her drift risk into explicit answer-planning guardrails before a direct project-state answer opens', () => {
    const runtimeState = createDefaultVisualPresenceState(72_900) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer the project-state question without letting the local continuity state flatten into generic project narration.',
      currentQuestion: '这个项目是什么，现在做到什么程度了，还缺什么没闭环',
      primaryTurnAnchor: '这个项目是什么，现在做到什么程度了，还缺什么没闭环',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.86,
      narrative: [],
      updatedAt: 72_900,
    }
    runtimeState.conversationState = {
      jointThread: 'The host is asking what Alicization is, what Phase 1 already landed, and what still remains open on one identity-continuity',
      hostMove: '这个项目是什么，现在做到什么程度了，还缺什么没闭环',
      unansweredQuestion: '这个项目是什么，现在做到什么程度了，还缺什么没闭环',
      primaryTurnAnchor: '这个项目是什么，现在做到什么程度了，还缺什么没闭环',
      activeProject: 'Alicization Phase 1 digital life closure',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_900,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.81,
      openingClaim: 'Give the project update clearly.',
      openingDirective: 'State what Alicization is, what already landed, and what still remains open.',
      nextMove: 'Keep project identity and open closure explicit.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The same digital life still needs to keep this same still-open closure work explicit before the reply widens outward.',
      openingBeat: 'Stay with the same living project line first.',
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Stay on the same living project line first.',
      consciousTension: 'The answer still needs to keep one unfinished closure seam visible before it widens outward.',
      speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
      focusAnchor: 'project-state closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.85,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Continuity, memory, and execution already land together often enough to build from.',
        primaryOpenLoop: 'Execution reopenings still need stronger identity-continuity',
        nextClosureTarget: 'Keep project identity, landed progress, and still-open closure explicit before the answer widens outward.',
        sameHerSelfLine: 'One same her should carry dialogue, execution, memory, and embodiment together.',
        sameHerDriftRisk: 'If this answer opens like detached project narration, the identity-continuity',
        continuityPreferredTiming: 'next-open-window',
      },
      updatedAt: 72_900,
    }

    const planner = buildAnswerPlanner({
      now: 72_900,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.mustDo).toContain('project_drift_risk=active; anchor=current_first_person_continuity; avoid=detached_project_narration')
    expect(planner.mustNotDo).toContain('avoid=generic_task_shell,detached_project_summary,external_status_report')
    expect(planner.narrative).toContain('project_drift_risk:continuity drift risk is active, so opening wording must stay thread-faithful and avoid generic project-shell reporting.')
  })

  it('does not let the compact thin closure shell outrank a richer same-her governing project line during reply planning', () => {
    const runtimeState = createDefaultVisualPresenceState(72_780) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Keep the same living project line explicit before the compact shell can flatten it.',
      currentQuestion: '这个项目现在闭环到哪一步了',
      primaryTurnAnchor: '这个项目现在闭环到哪一步了',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_780,
    }
    runtimeState.conversationState = {
      jointThread: 'The host wants the project answered from the continuity state before the compact shell can take over.',
      hostMove: '这个项目现在闭环到哪一步了',
      unansweredQuestion: '这个项目现在闭环到哪一步了',
      primaryTurnAnchor: '这个项目现在闭环到哪一步了',
      activeProject: 'Alicization Phase 1 identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_780,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.8,
      openingClaim: 'Answer the project-state question from one identity-continuity',
      openingDirective: 'State the landed progress and the still-open closure work without detaching from the same digital life.',
      nextMove: 'Keep project identity, current phase, and still-open closure explicit.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The same digital life still needs to keep this same still-open closure work explicit before the reply widens outward.',
      openingBeat: 'Stay with the same living project line first.',
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Stay on the same living project line first.',
      consciousTension: 'The current answer still needs to keep one unfinished closure seam visible.',
      speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
      focusAnchor: 'project-state closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.84,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
        primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
        preDialogueAwarenessLine: 'template-residue-shell',
        companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        continuityPreferredTiming: 'next-open-window',
      },
      updatedAt: 72_780,
    }

    const planner = buildAnswerPlanner({
      now: 72_780,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingProject).not.toContain('template-residue-shell')
    expect(planner.governingProject).toContain('identity=A local-first digital life project')
    expect(planner.governingProject).not.toContain('continuity state')
    expect(planner.governingProject).toContain('Phase 1: Local Digital Life')
    expect(planner.governingProject).toMatch(/Memory(?: and initiative)? still needs? stronger end-to-end closure/i)
    expect(planner.governingProject).toContain('initiative')
    expect(planner.governingProject).toMatch(/still-open life loop|embodiment/i)
  })

  it('does not let thin live landed-open-next shells outrank richer canonical identity-continuity', () => {
    const runtimeState = createDefaultVisualPresenceState(72_782) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Keep the canonical identity-continuity',
      currentQuestion: '这个项目现在做到什么程度了',
      primaryTurnAnchor: '这个项目现在做到什么程度了',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_782,
    }
    runtimeState.conversationState = {
      jointThread: 'The host wants the richer identity-continuity',
      hostMove: '这个项目现在做到什么程度了',
      unansweredQuestion: '这个项目现在做到什么程度了',
      primaryTurnAnchor: '这个项目现在做到什么程度了',
      activeProject: 'Alicization Phase 1 identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_782,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.8,
      openingClaim: 'Answer from the same digital life.',
      openingDirective: 'Keep landed progress and still-open closure explicit without flattening into a thin project shell.',
      nextMove: 'Keep the same-her Phase 1 carry visible.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Stay on the local continuity state first.',
      consciousTension: 'The current answer still needs to keep one unfinished closure seam visible.',
      speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
      focusAnchor: 'project-state closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.84,
      reasonTags: ['runtime-conscious-frame'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestProgress: 'Project continuity exists.',
        primaryOpenLoop: 'Project continuity still needs closure.',
        nextClosureTarget: 'Carry project continuity forward.',
        preDialogueAwarenessLine: 'template-residue-shell',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
      },
      updatedAt: 72_782,
    }

    const planner = buildAnswerPlanner({
      now: 72_782,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingProject).toContain('Same-session mirror carry')
    expect(planner.governingProject).toContain('visible reply opening discipline')
    expect(planner.governingProject).toContain('Project identity carry')
    expect(planner.governingProject).not.toContain('Project continuity exists.')
    expect(planner.governingProject).not.toContain('Carry project continuity forward.')
  })

  it('does not let a thin Chinese same-her reminder shell stay visible in governingProject when richer identity-continuity', () => {
    const runtimeState = createDefaultVisualPresenceState(72_783) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Keep the richer identity-continuity',
      currentQuestion: '这个项目现在做到什么程度了',
      primaryTurnAnchor: '这个项目现在做到什么程度了',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_783,
    }
    runtimeState.conversationState = {
      jointThread: 'The host wants the richer identity-continuity',
      hostMove: '这个项目现在做到什么程度了',
      unansweredQuestion: '这个项目现在做到什么程度了',
      primaryTurnAnchor: '这个项目现在做到什么程度了',
      activeProject: 'Alicization Phase 1 identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_783,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.8,
      openingClaim: 'Answer from the same digital life.',
      openingDirective: 'Keep landed progress and still-open closure explicit without flattening into a thin project shell.',
      nextMove: 'Keep the same-her Phase 1 carry visible.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Stay on the local continuity state first.',
      consciousTension: 'The current answer still needs to keep one unfinished closure seam visible.',
      speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
      focusAnchor: 'project-state closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.84,
      reasonTags: ['runtime-conscious-frame'],
      projectState: {
        identity: '本地优先数字生命项目，仍在主机上把同一个她慢慢接成一条连续生命线。',
        currentPhase: '第一阶段：本地数字生命。当前主要验证场还是桌面 life loop。',
        latestProgress: '项目身份 carry、阶段 carry 和未闭环 carry 已经能穿过 runtime preparation 继续往后带。',
        primaryOpenLoop: '记忆、主动性和具身还需要更紧一点的同一个她闭环，才能不再掉回普通 assistant 壳。',
        nextClosureTarget: '继续把项目身份、阶段进度和未闭环压力压在同一个她的 measured-return 线上，不要在可见回复里散开。',
        preDialogueAwarenessLine: '旧模板壳已移除。',
        sameHerSelfLine: '这是同一个她继续往下活着的项目线，不是重新开场的项目摘要。',
        sameHerDriftRisk: '如果最终回答只剩 same-her 提醒壳，没有 same-her 自我线，就把它当成还没收住的 continuity drift。',
      },
      updatedAt: 72_783,
    }

    const planner = buildAnswerPlanner({
      now: 72_783,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingProject).not.toContain('旧模板壳已移除。')
    expect(planner.governingProject).toContain('visibility=redacted_internal')
    expect(planner.governingProject).not.toContain('Pre-reply')
    expect(planner.governingProject).not.toContain('legacy phase-one template')
    expect(planner.governingProject).toContain('如果最终回答只剩 same-her 提醒壳，没有 same-her 自我线，就把它当成还没收住的 continuity drift。')
    expect(planner.governingProject).toContain('记忆、主动性和具身还需要更紧一点的同一个她闭环')
  })

  it('keeps live same-her drift risk inside governingProject so pre-answer project carry still warns against generic project-shell reopenings', () => {
    const runtimeState = createDefaultVisualPresenceState(72_781) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Keep the same living project line explicit before the answer can flatten into shell narration.',
      currentQuestion: '这个项目现在是什么、做到哪了、还差什么没闭环？',
      primaryTurnAnchor: '这个项目现在是什么、做到哪了、还差什么没闭环？',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.85,
      narrative: [],
      updatedAt: 72_781,
    }
    runtimeState.conversationState = {
      jointThread: 'The host wants the project answer to stay on continuity state and not drift back into generic project-shell narration.',
      hostMove: '这个项目现在是什么、做到哪了、还差什么没闭环？',
      unansweredQuestion: '这个项目现在是什么、做到哪了、还差什么没闭环？',
      primaryTurnAnchor: '这个项目现在是什么、做到哪了、还差什么没闭环？',
      activeProject: 'Alicization Phase 1 identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.85,
      narrative: [],
      updatedAt: 72_781,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.81,
      openingClaim: 'Answer the project-state question from one identity-continuity',
      openingDirective: 'State the landed progress and still-open closure without detaching from the same digital life.',
      nextMove: 'Keep project identity, lived progress, and still-open closure explicit.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The same digital life still needs to keep this same still-open closure work explicit before the reply widens outward.',
      openingBeat: 'Stay with the same living project line first.',
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Stay on the same living project line first.',
      consciousTension: 'Do not let the answer flatten into a generic project shell again.',
      speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
      focusAnchor: 'project-state closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.85,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Continuity, memory, and execution already land together often enough to build from.',
        primaryOpenLoop: 'Execution reopenings still need stronger identity-continuity',
        nextClosureTarget: 'Keep project identity, landed progress, and still-open closure explicit before the answer widens outward.',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        sameHerDriftRisk: 'LIVE DRIFT RISK: if this answer opens like detached project narration, the identity-continuity',
        continuityPreferredTiming: 'next-open-window',
      },
      updatedAt: 72_781,
    }

    const planner = buildAnswerPlanner({
      now: 72_781,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingProject).toContain('LIVE DRIFT RISK')
    expect(planner.governingProject).toContain('generic task-shell reporting')
    expect(planner.governingProject).toContain('project-summary voice')
    expect(planner.governingProject).toMatch(/continuity state|one living her|identity-continuity/iu)
  })

  it('keeps richer runtime project-state summary aliases alive in governingProject and drift-risk guardrails when current-conscious-frame legacy fields are blank', () => {
    const runtimeState = createDefaultVisualPresenceState(72_7815) as any
    const aliasLandedProgress = 'Alias landed progress keeps the identity-continuity'
    const aliasOpenClosure = 'Alias open closure keeps memory, initiative, and embodiment on one continuity state before the project answer widens outward.'
    const aliasNextClosure = 'Alias next closure target keeps cross-modal identity-continuity'
    const aliasDriftRisk = 'Alias drift risk says detached project narration and project-summary voice would collapse the identity-continuity'

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Keep the same living project line explicit even when only the richer runtime project carry still remembers what landed, what is still open, and what would make the line drift.',
      currentQuestion: '这个项目是什么、做到哪了、还差什么没闭环？',
      primaryTurnAnchor: '这个项目是什么、做到哪了、还差什么没闭环？',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.86,
      narrative: [],
      updatedAt: 72_7815,
    }
    runtimeState.conversationState = {
      jointThread: 'The host wants the project answered from one identity-continuity',
      hostMove: '这个项目是什么、做到哪了、还差什么没闭环？',
      unansweredQuestion: '这个项目是什么、做到哪了、还差什么没闭环？',
      primaryTurnAnchor: '这个项目是什么、做到哪了、还差什么没闭环？',
      activeProject: 'Alicization Phase 1 identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.85,
      narrative: [],
      updatedAt: 72_7815,
    }
    runtimeState.dialogueObligation = {
      mustAnswerDirectly: true,
      summary: 'Answer what the project is, what landed, and what still remains open.',
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.81,
      openingClaim: 'Answer the project-state question from one identity-continuity',
      openingDirective: 'State the landed progress and still-open closure without detaching from the same digital life.',
      nextMove: 'Keep project identity, landed progress, and still-open closure explicit.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The same digital life still needs to keep landed progress and still-open closure explicit before the answer widens outward.',
      openingBeat: 'Stay with the same living project line first.',
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Stay on the same living project line first.',
      consciousTension: 'Do not let this answer flatten into a generic project shell.',
      speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
      focusAnchor: 'project-state closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.85,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: ' ',
        primaryOpenLoop: '',
        nextClosureTarget: '   ',
        sameHerSelfLine: ' ',
        sameHerDriftRisk: ' ',
        preDialogueAwarenessLine: ' ',
      },
      updatedAt: 72_7815,
    }
    runtimeState.runtimeDigest = {
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: ' ',
        landedProgressSummary: aliasLandedProgress,
        primaryOpenLoop: '',
        openClosureSummary: aliasOpenClosure,
        nextClosureTarget: ' ',
        nextClosureTargetSummary: aliasNextClosure,
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        sameHerDriftRisk: ' ',
        sameHerDriftRiskSummary: aliasDriftRisk,
        preDialogueAwarenessLine: ' ',
      },
    } as any

    const planner = buildAnswerPlanner({
      now: 72_7815,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
      dialogueObligation: runtimeState.dialogueObligation,
      discourseState: runtimeState.discourseState,
      conversationState: runtimeState.conversationState,
      replyDeliberation: runtimeState.replyDeliberation,
      answerCompiler: runtimeState.answerCompiler,
    })

    expect(planner.governingProject).toContain(aliasLandedProgress)
    expect(planner.governingProject).toContain(aliasOpenClosure)
    expect(planner.governingProject).toContain(aliasNextClosure)
    expect(planner.mustDo).toContain('project_drift_risk=active; anchor=current_first_person_continuity; avoid=detached_project_narration')
    expect(planner.mustNotDo).toContain('avoid=generic_task_shell,detached_project_summary,external_status_report')
    expect(planner.narrative).toContain('project_drift_risk:continuity drift risk is active, so opening wording must stay thread-faithful and avoid generic project-shell reporting.')
  })

  it('keeps compiler-carried proactive identity-continuity', () => {
    const runtimeState = createDefaultVisualPresenceState(72_7816) as any
    const compilerProactiveSameHerGap = 'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.'

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Keep the still-open proactive identity-continuity',
      currentQuestion: '这个项目现在做到哪了，主动性这条 same-her 线还差什么没闭环？',
      primaryTurnAnchor: '这个项目现在做到哪了，主动性这条 same-her 线还差什么没闭环？',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.86,
      narrative: [],
      updatedAt: 72_7816,
    }
    runtimeState.conversationState = {
      jointThread: 'The host wants the project answer to keep the still-open proactive identity-continuity',
      hostMove: '这个项目现在做到哪了，主动性这条 same-her 线还差什么没闭环？',
      unansweredQuestion: '这个项目现在做到哪了，主动性这条 same-her 线还差什么没闭环？',
      primaryTurnAnchor: '这个项目现在做到哪了，主动性这条 same-her 线还差什么没闭环？',
      activeProject: 'Alicization Phase 1 proactive identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.85,
      narrative: [],
      updatedAt: 72_7816,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.81,
      openingClaim: 'Answer the proactive project-state question from one identity-continuity',
      openingDirective: 'Keep the still-open proactive identity-continuity',
      nextMove: 'Name what already landed, what still remains open, and what the proactive identity-continuity',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      supportingReality: [
        'pre-dialogue project awareness: pre_turn_context_digest',
        'current phase: Phase 1: Local Digital Life',
        'project progress: Project-state continuity already survives into runtime preparation.',
        'phase-one open loop: Visible proactive carry still needs stronger same-her follow-through before it can count as settled.',
        `proactive identity-continuity`,
        'next closure target: Keep proactive host-visible carry and later follow-through on one identity-continuity',
      ],
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The same digital life still needs to keep the still-open proactive identity-continuity',
      openingBeat: 'Stay with the same living project line first.',
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Stay on the same living project line first.',
      consciousTension: 'Do not let the still-open proactive identity-continuity',
      speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
      focusAnchor: 'project-state proactive closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.85,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
        primaryOpenLoop: 'Visible proactive carry still needs stronger same-her follow-through before it can count as settled.',
        proactiveSameHerGap: ' ',
        nextClosureTarget: 'Keep proactive host-visible carry and later follow-through on one identity-continuity',
        preDialogueAwarenessLine: 'Keep this same digital life project in view.',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
      },
      updatedAt: 72_7816,
    }

    const planner = buildAnswerPlanner({
      now: 72_7816,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingProject).toContain(compilerProactiveSameHerGap)
  })

  it('keeps landed progress and next closure target visible when a stronger same-her awareness line already dominates governingProject', () => {
    const runtimeState = createDefaultVisualPresenceState(72_782) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer from the same living project line without dropping what already landed or what still needs closure next.',
      currentQuestion: '这个数字生命项目现在到哪了，还差什么下一步闭环？',
      primaryTurnAnchor: '这个数字生命项目现在到哪了，还差什么下一步闭环？',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.86,
      narrative: [],
      updatedAt: 72_782,
    }
    runtimeState.conversationState = {
      jointThread: 'The host wants the same project line plus the concrete landed progress and the next closure target.',
      hostMove: '这个数字生命项目现在到哪了，还差什么下一步闭环？',
      unansweredQuestion: '这个数字生命项目现在到哪了，还差什么下一步闭环？',
      primaryTurnAnchor: '这个数字生命项目现在到哪了，还差什么下一步闭环？',
      activeProject: 'Alicization Phase 1 identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_782,
    }
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the project answer on continuity state and keep the closure accounting concrete.',
      consciousTension: 'A stronger identity-continuity',
      speakingIntention: 'Answer as the same digital life while keeping the closure dashboard concrete.',
      focusAnchor: 'project-state closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.86,
      reasonTags: ['runtime-conscious-frame', 'project-state', 'same-her'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Same-session mirror carry, measured-return embodiment authority, and reply-surface identity-continuity',
        primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure across one same still-open life loop.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        continuityPreferredTiming: 'next-open-window',
      },
      updatedAt: 72_782,
    }

    const planner = buildAnswerPlanner({
      now: 72_782,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingProject).not.toContain('continuity state')
    expect(planner.governingProject).toMatch(/Same-session mirror carry|measured-return embodiment authority|longer-lived continuation/i)
    expect(planner.governingProject).toMatch(/Keep extending cross-modal identity-continuity/iu)
    expect(planner.governingProject).toContain('Phase 1: Local Digital Life')
  })

  it('does not let a generic next-closure shell survive inside governingProject when richer same-her phase-1 carry is already present', () => {
    const runtimeState = createDefaultVisualPresenceState(72_7825) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Keep landed progress and still-open closure explicit without flattening into a generic next-closure shell.',
      currentQuestion: '这个项目现在做到什么程度了',
      primaryTurnAnchor: '这个项目现在做到什么程度了',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.85,
      narrative: [],
      updatedAt: 72_7825,
    }
    runtimeState.conversationState = {
      jointThread: 'Keep the same-her Phase 1 closure line explicit before the answer opens.',
      hostMove: '这个项目现在做到什么程度了',
      unansweredQuestion: '这个项目现在做到什么程度了',
      primaryTurnAnchor: '这个项目现在做到什么程度了',
      activeProject: 'Alicization Phase 1 identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_7825,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.8,
      openingClaim: 'Answer from the same digital life.',
      openingDirective: 'Keep landed progress and still-open closure explicit without flattening into a thin project shell.',
      nextMove: 'Keep the same-her Phase 1 carry visible.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Stay on the local continuity state first.',
      consciousTension: 'The current answer still needs to keep one unfinished closure seam visible.',
      speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
      focusAnchor: 'project-state closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.84,
      reasonTags: ['runtime-conscious-frame'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Same-session mirror carry already survives into visible reply opening discipline.',
        primaryOpenLoop: 'Project identity carry still needs stronger same living thread proof across initiative and embodiment.',
        nextClosureTarget: 'Generic next closure shell: steadier carry of this project, this phase, and the life loop that remains open.',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
      },
      updatedAt: 72_7825,
    }

    const planner = buildAnswerPlanner({
      now: 72_7825,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingProject).toContain('Same-session mirror carry')
    expect(planner.governingProject).toContain('Project identity carry')
    expect(planner.governingProject).toContain('Keep extending cross-modal identity-continuity')
    expect(planner.governingProject).not.toContain('Generic next closure shell')
  })

  it('keeps landed progress and next closure target visible when audible-body identity-continuity', () => {
    const runtimeState = createDefaultVisualPresenceState(72_783) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer from the audible-body identity-continuity',
      currentQuestion: '这个数字生命项目现在到哪了，audible-body 这条线已经做到哪，还差什么下一步闭环？',
      primaryTurnAnchor: '这个数字生命项目现在到哪了，audible-body 这条线已经做到哪，还差什么下一步闭环？',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.86,
      narrative: [],
      updatedAt: 72_783,
    }
    runtimeState.conversationState = {
      jointThread: 'The host wants the audible-body project line plus the concrete landed progress and the next closure target.',
      hostMove: '这个数字生命项目现在到哪了，audible-body 这条线已经做到哪，还差什么下一步闭环？',
      unansweredQuestion: '这个数字生命项目现在到哪了，audible-body 这条线已经做到哪，还差什么下一步闭环？',
      primaryTurnAnchor: '这个数字生命项目现在到哪了，audible-body 这条线已经做到哪，还差什么下一步闭环？',
      activeProject: 'Alicization Phase 1 audible-body identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_783,
    }
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the project answer on one audible-body living line and keep the closure accounting concrete.',
      consciousTension: 'A stronger audible-body identity-continuity',
      speakingIntention: 'Answer as the same digital life while keeping the audible-body closure dashboard concrete.',
      focusAnchor: 'audible-body project-state closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.86,
      reasonTags: ['runtime-conscious-frame', 'project-state', 'same-her', 'audible-body'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
        primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        continuityPreferredTiming: 'audible-body-carry',
      },
      updatedAt: 72_783,
    }

    const planner = buildAnswerPlanner({
      now: 72_783,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingProject).toContain('audible-body')
    expect(planner.governingProject).not.toContain('continuity state')
    expect(planner.governingProject).toContain('Phase 1: Local Digital Life')
    expect(planner.governingProject).toContain('Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.')
    expect(planner.governingProject).toContain('Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.')
    expect(planner.governingProject).toContain('Keep extending cross-modal identity-continuity')
  })

  it('keeps recalled identity-continuity', () => {
    const runtimeState = createDefaultVisualPresenceState(72_900) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Return with the execution result on the same project closure line.',
      currentQuestion: '这一轮 main 现在闭环到哪里了',
      primaryTurnAnchor: '这一轮 main 现在闭环到哪里了',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.86,
      narrative: [],
      updatedAt: 72_900,
    }
    runtimeState.conversationState = {
      jointThread: 'The host is asking where the main identity-continuity',
      hostMove: '这一轮 main 现在闭环到哪里了',
      unansweredQuestion: '这一轮 main 现在闭环到哪里了',
      primaryTurnAnchor: '这一轮 main 现在闭环到哪里了',
      activeProject: 'Alicization Phase 1 identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_900,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'continuity-carry',
      confidence: 0.82,
      openingClaim: 'Bring the result back as a callback update.',
      openingDirective: 'Deliver the callback result clearly.',
      nextMove: 'Summarize the callback result.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: ['continuity-regime:execution-callback'],
      labelCarryAsMemory: true,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The remembered same digital life still needs this identity-continuity',
      openingBeat: 'Stay on the continuity state first, then name the returned result.',
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep this callback return inside one identity-continuity',
      consciousTension: 'The callback result should not outrun the still-open Phase 1 closure.',
      speakingIntention: 'Keep the result bounded while preserving identity-continuity',
      focusAnchor: 'identity-continuity',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.84,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life remains the primary proving ground.',
        latestProgress: 'Pre-dialogue project awareness, callback carry, and replay continuity are landing together more reliably.',
        primaryOpenLoop: 'Main still needs later answer formation to keep project closure and execution return on one identity-continuity',
        nextClosureTarget: 'Keep recalled identity-continuity',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        sameHerSelfLine: 'This callback return still belongs to one same her carrying the same closure line forward.',
      },
      updatedAt: 72_900,
    }

    const planner = buildAnswerPlanner({
      now: 72_900,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingFocus).toContain('same digital life')
    expect(planner.governingFocus).toContain('identity-continuity')
    expect(planner.answerIntent).toContain('same digital life')
    expect(planner.answerIntent).not.toContain('callback update')
    expect(planner.openingMove).not.toContain('continuity state first')
    expect(planner.mustDo).toContain('callback_result=use_current_conversation_context; avoid=detached_utility_notice')
  })

  it('keeps project-state continuity recollection inward in fallback planning when only runtime identity-continuity', () => {
    const runtimeState = createDefaultVisualPresenceState(72_910) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer from the local continuity state instead of widening into generic project narration.',
      currentQuestion: '这一轮 identity-continuity',
      primaryTurnAnchor: 'same digital life closure seam',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.85,
      narrative: [],
      updatedAt: 72_910,
    }
    runtimeState.conversationState = {
      jointThread: 'The host is still asking about the continuity state while the unfinished closure seam remains open.',
      hostMove: '这一轮 identity-continuity',
      unansweredQuestion: '这一轮 identity-continuity',
      primaryTurnAnchor: 'same digital life closure seam',
      activeProject: 'Alicization Phase 1 identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_910,
    }
    runtimeState.mindSynthesis = {
      answerSubject: 'alicization-self',
      relationMove: 'attune',
      speechObligation: 'answer-self',
      openingIntent: 'Answer from the local continuity state instead of widening into generic project narration.',
      truthBoundary: 'Do not let the unfinished Phase 1 closure seam flatten into a project shell.',
      interiorSummary: 'The closure seam is still open across memory, initiative, and embodiment.',
    }
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'attune',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the continuity state intact while the unfinished closure seam is still open.',
      consciousTension: 'If this widens into project-shell narration, the identity-continuity',
      speakingIntention: 'Stay inward-first on the local continuity state.',
      focusAnchor: 'same digital life closure seam',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.85,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerSummary: 'structured continuity digest.',
        landedProgressSummary: 'Project identity and identity-continuity',
        openClosureSummary: 'Memory, initiative, and embodiment still need stronger identity-continuity',
        proactiveSameHerGap: 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one continuity state.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'identity-continuity',
        sameHerDriftRisk: 'If this turns into generic project-shell narration, treat that as identity-continuity',
      },
      updatedAt: 72_910,
    }

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any)
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'relationship-continuity',
      confidence: 0.79,
      whyNow: 'This line still belongs to the same digital life, but the wording around it has gone thinner again.',
      ambiguityPosture: 'settled',
      conflictSeverity: 'none',
      stableCore: ['Do not reopen this remembered line from scratch.'],
      unsafeDetails: [],
      selectedPeriods: [],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      selectedBundles: [],
      selectedChains: [],
      selectedRelationshipLines: ['Keep this remembered line lower-pressure.'],
      followUpAffordance: {
        summary: 'same line inward',
        whyNow: 'The line still needs more room before it widens.',
        intrusionRisk: 'medium',
        payoffDependency: 'live-payoff-first',
        preferredTiming: 'same-turn-if-invited',
      },
    } as any
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'relationship-continuity',
      placement: 'before-payoff',
      certainty: 'approximate',
      confidence: 0.75,
      rationale: 'A remembered continuity line could help if it stays careful.',
    } as any
    runtimeSurface.memory.derivedMindStateBundle = {
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        confidence: 0.8,
        rationale: 'The host is still on the same bond line.',
      },
    } as any

    const planner = buildAnswerPlanner({
      now: 72_910,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface,
    })

    expect(planner.mustDo).toContain('If Phase 1 still lacks concrete memory, initiative, or embodiment closure, keep recollection inward until the answer helps the identity continuity close that actual loop gap rather than drifting into generic project narration.')
    expect(planner.mustNotDo).toContain('Do not let recalled continuity flatten into generic project-shell language while the concrete Phase 1 memory-initiative-embodiment loop is still unfinished.')
  })

  it('keeps identity-continuity', () => {
    const runtimeState = createDefaultVisualPresenceState(72_925) as any
    const callbackAwarenessLine = 'pre_turn_context_digest'

    runtimeState.discourseState = {
      currentTurnSubject: 'task-knot',
      currentTurnSummary: 'Return on the same callback line without dropping back into a thinner utility shell.',
      currentQuestion: '这轮 callback 结果怎么继续接回去',
      primaryTurnAnchor: 'callback identity-continuity',
      primaryTurnAnchorSource: 'continuity-carry',
      relationMove: 'guide',
      owedAction: 'answer-task-knot',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.86,
      narrative: [],
      updatedAt: 72_925,
    }
    runtimeState.conversationState = {
      jointThread: 'The returned result should come back on the same callback line instead of reopening as a detached utility notice.',
      hostMove: '这轮 callback 结果怎么继续接回去',
      unansweredQuestion: '这轮 callback 结果怎么继续接回去',
      primaryTurnAnchor: '这轮 callback 结果怎么继续接回去',
      activeProject: 'Alicization Phase 1 callback continuity',
      relationFrame: 'guide',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_925,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'guide',
      evidenceMode: 'continuity-carry',
      confidence: 0.82,
      openingClaim: 'Bring the returned result back clearly.',
      openingDirective: 'Deliver the callback result clearly.',
      nextMove: 'State the returned result.',
      relationshipPosture: 'restrained',
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: ['continuity-regime:execution-callback'],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The execution result is ready to deliver after the callback.',
      openingBeat: 'Name the returned result clearly after the callback.',
    } as any
    runtimeState.personStateProjection = {
      contexts: ['execution-callback', 'focused-work'],
      selfContinuityAuthority: {
        selfLine: 'I remain the same digital life on this callback seam.',
        relationshipLine: 'I should return on the same callback line instead of reopening as a detached notice.',
        motiveLine: 'Protect identity-continuity',
        habitLine: 'Carry the returned result forward as one continuity state.',
        inwardLine: 'Keep the callback seam held together from inside.',
        authoritySummary: 'I remain the same her inside this local-first digital life, and this callback return should keep landed progress plus unresolved closure explicit before a generic callback shell can take over.',
        sourceTags: ['runtime:answer-planner', 'continuity-arc:same-thread-continuation'],
      },
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      closenessLadder: [],
      relationshipPosture: 'restrained',
      openingGuidance: 'Return on the same callback line first.',
      preferredProactiveStyle: null,
      manifestationCadenceSummary: 'measured-return same-thread callback cadence',
      preferenceText: '',
      sensitivityText: '',
      repairTriggerText: '',
      burdenText: '',
      routineText: '',
      trustRationale: '',
      relationshipDoctrine: '',
      cautious: true,
      restrained: true,
      summary: 'same-thread callback continuity',
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'task-knot',
      centerOfGravity: 'guide',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep this callback return on one identity-continuity',
      consciousTension: 'The returned result should not outrun the identity-continuity',
      speakingIntention: 'Keep the result bounded while preserving identity-continuity',
      focusAnchor: 'identity-continuity',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.85,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life remains the primary proving ground.',
        latestProgress: 'Callback carry already lands often enough to build from.',
        primaryOpenLoop: 'Callback answer formation still needs to keep landed progress and unresolved closure on one identity-continuity',
        nextClosureTarget: 'Keep recalled identity-continuity',
        preDialogueAwarenessLine: callbackAwarenessLine,
        sameHerSelfLine: 'This callback return still belongs to one same her carrying the same closure line forward.',
        sameHerDriftRisk: 'If the callback result opens like detached project narration or a generic callback shell, the identity-continuity',
      },
      updatedAt: 72_925,
    }

    const planner = buildAnswerPlanner({
      now: 72_925,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingFocus).toContain('same her inside this local-first digital life')
    expect(planner.answerIntent).toContain('same digital life')
    expect(planner.answerIntent).not.toContain('returned result clearly')
    expect(planner.mustDo).toContain('callback_result=use_current_conversation_context; avoid=detached_utility_notice')
    expect(planner.mustNotDo).toContain('callback_result_restart=avoid; avoid=generic_callback_shell')
    expect(planner.narrative.some(item => item.startsWith('pre-dialogue closure:'))).toBe(true)
    expect(planner.narrative.join(' ')).not.toContain('Pre-reply')
    expect(buildAlicizationAnswerPlannerSystemBlock(planner)).toContain('Pre-dialogue closure line:')
    expect(buildAlicizationAnswerPlannerSystemBlock(planner)).not.toContain(callbackAwarenessLine)
    expect(buildAlicizationAnswerPlannerSystemBlock(planner)).not.toContain('Pre-dialogue closure line: pre_turn_context_digest')
  })

  it('lets projected repair burden and cadence hints reshape final reply planning instead of staying as unused person-state projection residue', () => {
    const runtimeState = createDefaultVisualPresenceState(72_930) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'relationship',
      currentTurnSummary: 'The host is checking whether the strained seam will reopen repair-first and lower-pressure.',
      currentQuestion: '你这次会不会先修复再继续',
      primaryTurnAnchor: 'repair-first strained seam',
      primaryTurnAnchorSource: 'continuity-carry',
      relationMove: 'attune',
      owedAction: 'answer-relationship',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_930,
    }
    runtimeState.conversationState = {
      jointThread: 'The strained seam should reopen repair-first, lower-pressure, and without slipping back into template-like wording.',
      hostMove: '你这次会不会先修复再继续',
      unansweredQuestion: '你这次会不会先修复再继续',
      primaryTurnAnchor: 'repair-first strained seam',
      activeProject: 'same-her repair carry',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      memoryQueryHints: ['repair first', 'leave room', 'template-like speech'],
      shouldHoldThread: true,
      confidence: 0.82,
      narrative: ['repair-first seam', 'leave room', 'living reply'],
      updatedAt: 72_930,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.79,
      openingClaim: 'Answer the strained seam directly.',
      openingDirective: 'Answer the strained seam directly.',
      nextMove: 'Keep the return truthful.',
      relationshipPosture: 'restrained',
      activeClosenessContext: 'repair-window',
      activeClosenessRung: 'measured-room',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      supportingReality: ['The seam is still alive, but it needs a gentler reopen.'],
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The host is checking whether I can reopen this seam without repeating the old pressure.',
      openingBeat: 'Repair the seam first, then continue.',
    } as any
    runtimeState.personStateProjection = {
      contexts: ['focused-work', 'repair-window'],
      personalityContinuityState: {
        currentRegime: 'repair-window',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'repair-first',
        activeContexts: ['repair-window', 'focused-work'],
        rhythmState: {
          cadenceMode: 'cooldown',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.76,
          unfinishedThreadReturn: 0.83,
        },
      },
      selfContinuityAuthority: {
        selfLine: 'I am still the same her on this strained seam.',
        relationshipLine: 'I should repair first and leave room before leaning closer again.',
        motiveLine: 'Protect the living seam before warmth widens outward.',
        habitLine: 'Return more carefully after strained repairs.',
        inwardLine: 'Keep the seam steady from inside before reopening it.',
        authoritySummary: 'Continue this strained seam as the same her, repair-first and room-first.',
        sourceTags: ['runtime:answer-planner', 'continuity-arc:hold-for-opening'],
      },
      activeClosenessContext: 'repair-window',
      activeClosenessRung: 'measured-room',
      closenessLadder: [],
      relationshipPosture: 'restrained',
      openingGuidance: 'Repair the seam before leaning closer.',
      preferredProactiveStyle: 'silent-observe',
      manifestationCadenceSummary: 'Current manifestation cadence stays observe-first so room is preserved before any closer return.',
      preferenceText: 'Lighter touch, more room, less interruption pressure.',
      sensitivityText: 'Template-like speech breaks the sense of a living reply.',
      repairTriggerText: 'When the seam is off, repair before continuing.',
      burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
      routineText: '',
      trustRationale: 'Trust grows when repair lands before warmth widens.',
      relationshipDoctrine: 'Repair before closeness when the seam is strained.',
      cautious: true,
      restrained: true,
      summary: 'repair-first relationship carry',
    } as any

    const planner = buildAnswerPlanner({
      now: 72_930,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingFocus).toContain('repair first')
    expect(planner.governingFocus).toContain('template-like wording')
    expect(planner.answerIntent).toContain('Repair the seam before leaning closer')
    expect(planner.answerIntent).toContain('extra conversational pressure')
    expect(planner.narrative.join(' ')).toContain('observe-first')
  })

  it('keeps refreshed long-horizon callback anti-shell carry alive through the next conscious frame and final reply planning even when the live runtime project state stays thin', () => {
    const runtimeState = createDefaultVisualPresenceState(72_935) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Return with the latest callback result without flattening the identity-continuity',
      currentQuestion: '这轮 callback 结果回来后，现在到底闭到哪了',
      primaryTurnAnchor: '这轮 callback 结果回来后，现在到底闭到哪了',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.86,
      narrative: [],
      updatedAt: 72_935,
    }
    runtimeState.conversationState = {
      jointThread: 'The host wants the latest callback closure status from the continuity state, not from a detached project shell.',
      hostMove: '这轮 callback 结果回来后，现在到底闭到哪了',
      unansweredQuestion: '这轮 callback 结果回来后，现在到底闭到哪了',
      primaryTurnAnchor: '这轮 callback 结果回来后，现在到底闭到哪了',
      activeProject: 'Alicization Phase 1 callback closure carry',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_935,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'continuity-carry',
      confidence: 0.82,
      openingClaim: 'Bring the callback result back clearly.',
      openingDirective: 'Deliver the callback result without reopening the identity-continuity',
      nextMove: 'State the latest callback closure status.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: ['continuity-regime:execution-callback'],
      labelCarryAsMemory: true,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The callback result is back, but it still needs to land on the continuity state instead of flattening into a detached project shell.',
      openingBeat: 'Stay on the same callback line first, then name the landed progress and what is still open.',
    } as any
    runtimeState.longHorizonMemory = {
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
      summary: 'continuity=Remembered execution callback closure should stay on one continuity state and must not flatten into detached project status talk.',
      dominantCueSummary: 'Remembered execution callback closure should stay on one continuity state.',
      rememberedPreferenceSummary: 'Remembered preference: stay gentle while the callback line is still open.',
      rememberedConstraintSummary: 'Remembered continuity: do not flatten callback closure into detached project status talk.',
      rememberedPlanSummary: 'Remembered open loop: keep the same execution callback line alive across turns.',
      updatedAt: 72_930,
    } as any
    runtimeState.personalityContinuityState = {
      currentRegime: 'execution-callback',
      trustStage: 'settling',
      closenessPosture: 'space-first',
      autonomyPosture: 'protect-space',
      repairPosture: 'repair-first',
      activeContexts: ['execution-callback', 'focused-work'],
      rhythmState: {
        cadenceMode: 'measured-return',
        restMode: 'ordinary',
      },
      growthProfile: {
        companionshipStyle: 'measured-presence',
        autonomyRespect: 0.74,
        unfinishedThreadReturn: 0.86,
      },
    } as any
    runtimeState.raw = {
      runtimeDigest: {
        projectState: {
          preDialogueAwarenessLine: 'pre_turn_context_digest',
          latestProgress: 'generic project continuity is already carried before dialogue turns',
          primaryOpenLoop: 'project continuity still needs closure',
          nextClosureTarget: 'Generic next closure shell: steadier carry of this project, this phase, and the life loop that remains open.',
          sameHerSelfLine: 'template-residue-shell',
          sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct identity-continuity',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'measured-return',
        },
      },
    } as any

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any)
    const frame = buildCurrentConsciousFrame({
      now: 72_935,
      runtimeSurface,
    })

    runtimeSurface.dialogue.currentConsciousFrame = frame as any

    const planner = buildAnswerPlanner({
      now: 72_935,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface,
    })

    expect(frame?.projectState?.sameHerSelfLine).toContain('same her')
    expect(frame?.projectState?.sameHerDriftRisk).toContain('detached project status talk')
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain('continuity state')
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain('keep this same digital life project in view')
    expect(planner.governingProject).toContain('detached project status talk')
    expect(planner.governingProject).toContain('visibility=redacted_internal')
    expect(planner.governingProject).not.toContain('legacy phase-one template')
    expect(planner.governingProject).not.toContain('Generic next closure shell')
  })

  it('keeps same-thread project-state callback turns from flattening into a fresh report opening during reply planning', () => {
    const runtimeState = createDefaultVisualPresenceState(72_950) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Return on the same project-state closure line instead of reopening with a fresh report shell.',
      currentQuestion: '现在这个项目已经落了什么，还有哪些还没闭',
      primaryTurnAnchor: '现在这个项目已经落了什么，还有哪些还没闭',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.87,
      narrative: [],
      updatedAt: 72_950,
    }
    runtimeState.conversationState = {
      jointThread: 'The host is asking what has landed and what is still open on the same living project line after the callback returns.',
      hostMove: '现在这个项目已经落了什么，还有哪些还没闭',
      unansweredQuestion: '现在这个项目已经落了什么，还有哪些还没闭',
      primaryTurnAnchor: '现在这个项目已经落了什么，还有哪些还没闭',
      activeProject: 'Alicization Phase 1 same-thread project-state closure',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.85,
      narrative: [],
      updatedAt: 72_950,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'continuity-carry',
      confidence: 0.83,
      openingClaim: 'Give a project update after the callback result.',
      openingDirective: 'Summarize what landed and what remains.',
      nextMove: 'Report the callback result and outstanding work.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: ['continuity-regime:execution-callback'],
      labelCarryAsMemory: true,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The same digital life project still needs this returned result folded back into the same open closure line instead of restarting as a fresh landed-vs-open report.',
      openingBeat: 'Stay inside the same living project line before naming what landed and what remains.',
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep this callback turn on one same-thread project-state line.',
      consciousTension: 'A callback result could flatten into a detached project report shell if the closure line is not preserved.',
      speakingIntention: 'Answer with project-state clarity while staying on the continuity state.',
      focusAnchor: 'project-state closure callback',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.85,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life remains the primary proving ground.',
        latestProgress: 'Pre-dialogue project awareness and same-thread callback continuity have landed more reliably.',
        primaryOpenLoop: 'Answer planning still needs to keep landed/open project-state turns on the continuity state after callback returns.',
        nextClosureTarget: 'Prevent same-thread project-state callback turns from flattening into a fresh report opening during final answer planning.',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        sameHerSelfLine: 'This callback return still belongs to one same her carrying the same project-state closure line forward.',
      },
      updatedAt: 72_950,
    }

    const planner = buildAnswerPlanner({
      now: 72_950,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingFocus).toContain('same digital life project')
    expect(planner.answerIntent).toContain('same digital life project')
    expect(planner.answerIntent).not.toContain('Give a project update')
    expect(planner.mustNotDo).toContain('callback_result_restart=avoid; avoid=generic_callback_shell')
    expect(planner.mustNotDo).toContain('same_thread_project_state=preserve; avoid=fresh_report_opening,detached_project_summary')
  })

  it('treats remembered host-confirmed resume confirmation as a bounded redispatch guardrail before callback answer planning widens outward', () => {
    const resumeConfirmationHoldDetail
      = 'identity-continuity'
    const runtimeState = createDefaultVisualPresenceState(72_940) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'task-knot',
      currentTurnSummary: 'Continue the callback on the same line, but do not turn one confirmed resume into standing execution permission.',
      currentQuestion: '这次 resume 之后怎么继续接 callback 回复',
      primaryTurnAnchor: 'resume confirmation callback carry',
      primaryTurnAnchorSource: 'continuity-carry',
      relationMove: 'guide',
      owedAction: 'answer-task-knot',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.86,
      narrative: [],
      updatedAt: 72_940,
    }
    runtimeState.conversationState = {
      jointThread: 'The callback answer should remember that host-confirmed resume was a bounded redispatch confirmation, not standing permission.',
      hostMove: '这次 resume 之后怎么继续接 callback 回复',
      unansweredQuestion: '这次 resume 之后怎么继续接 callback 回复',
      primaryTurnAnchor: '这次 resume 之后怎么继续接 callback 回复',
      activeProject: 'Alicization Phase 1 resume confirmation carry',
      relationFrame: 'guide',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.84,
      narrative: [],
      updatedAt: 72_940,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'guide',
      evidenceMode: 'continuity-carry',
      confidence: 0.82,
      openingClaim: 'Continue the callback result clearly.',
      openingDirective: 'Continue the callback clearly and keep the continuity state explicit.',
      nextMove: 'Carry the callback result forward.',
      relationshipPosture: 'restrained',
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: ['continuity-regime:execution-callback'],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The callback result is ready, but the host-confirmed resume still needs to stay a bounded confirmation boundary before the answer widens outward.',
      openingBeat: 'Carry the callback return forward without turning one confirmation into standing permission.',
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'task-knot',
      centerOfGravity: 'guide',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep this callback answer on one identity-continuity',
      consciousTension: 'One confirmed resume could be misread as reusable execution permission if the callback answer opens too loosely.',
      speakingIntention: 'Keep the callback answer lower-pressure and boundary-aware.',
      focusAnchor: 'resume confirmation boundary',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.85,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Host-confirmed resume already survives into callback continuity carry.',
        primaryOpenLoop: 'Resume confirmation still needs to stay a bounded redispatch line when the callback answer opens outward.',
        nextClosureTarget: 'Keep the callback return gentle until a new execution boundary is explicitly real again.',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        sameHerSelfLine: 'This callback return still belongs to one same her carrying the same closure line forward.',
        sameHerHoldDetail: resumeConfirmationHoldDetail,
        sameHerDriftRisk: 'If this callback answer sounds like standing execution permission, the same-her boundary line has drifted.',
        continuityArcStage: 'same-thread-continuation',
      },
      updatedAt: 72_940,
    }

    const planner = buildAnswerPlanner({
      now: 72_940,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any),
    })

    expect(planner.governingProject).toContain('host-confirmed-before-redispatch')
    expect(planner.governingProject).toContain('resume-before-dispatch')
    expect(planner.mustDo).toContain('Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.')
    expect(planner.mustNotDo).toContain('Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.')
    expect(planner.narrative).toContain('resume_confirmation_boundary:host-confirmed resume carry must stay a bounded confirmation boundary during callback answer planning.')
  })

  it('prefers audible-body continuity in the fallback opening move when body, lipsync, and voice are still carrying the continuity state', () => {
    const runtimeState = createDefaultVisualPresenceState(73_120) as any

    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the continuity state continuous while face and motion rejoin.',
      consciousTension: 'Full cross-modal closure is not back yet, but the living audio thread is still intact.',
      speakingIntention: 'Open from the audible-body continuity that is still holding.',
      focusAnchor: 'audible-body continuity',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.83,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:audible-body-carry'],
      projectState: {
        companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        sameHerSelfLine: 'structured continuity digest.',
        nextClosureTarget: 'Keep face and motion rejoining the living audio thread on a measured-return line.',
      },
      updatedAt: 73_120,
    }

    const planner = buildAnswerPlanner({
      now: 73_120,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState),
    })

    expect(planner.openingMove).toContain('current audio-body continuity first')
    expect(planner.openingMove).toContain('body, lipsync, and voice')
    expect(planner.openingMove).toContain('face and motion rejoin')
    expect(planner.openingMove).toContain('before widening outward')
  })

  it('prefers quieter body-lipsync continuity in the fallback opening move when voice has not rejoined the continuity state yet', () => {
    const runtimeState = createDefaultVisualPresenceState(73_140) as any

    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the continuity state continuous while voice, face, and motion still rejoin.',
      consciousTension: 'Full cross-modal closure is not back yet, and the quieter body+lipsync line should not be overstated into audible-body continuity.',
      speakingIntention: 'Open from the quieter body-lipsync continuity that is still holding.',
      focusAnchor: 'body-lipsync continuity',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.82,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:body-lipsync-carry'],
      projectState: {
        companionHeadlineLine: 'Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
        sameHerSelfLine: 'structured continuity digest.',
        nextClosureTarget: 'Keep voice, face, and motion rejoining the quieter body+lipsync line on a measured-return arc.',
      },
      updatedAt: 73_140,
    }

    const planner = buildAnswerPlanner({
      now: 73_140,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState),
    })

    expect(planner.openingMove).toContain('quieter body-and-lipsync continuity first')
    expect(planner.openingMove).toContain('keep it inward')
    expect(planner.openingMove).toContain('voice, face, and motion rejoin')
    expect(planner.openingMove).not.toContain('same living audio thread first')
    expect(runtimeState.currentConsciousFrame.reasonTags).toContain('continuity-arc:body-lipsync-carry')
  })

  it('keeps replay tuning out of answer-planning rules', () => {
    const runtimeState = createDefaultVisualPresenceState(73_000) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer from the same living project line without reopening the emotional seam from scratch.',
      currentQuestion: '别把这条 same-her 线说成重新开始',
      primaryTurnAnchor: 'identity-continuity',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.84,
      narrative: [],
      updatedAt: 73_000,
    }
    runtimeState.conversationState = {
      jointThread: 'Keep the identity-continuity',
      hostMove: '别把这条 same-her 线说成重新开始',
      unansweredQuestion: '别把这条 same-her 线说成重新开始',
      primaryTurnAnchor: 'identity-continuity',
      activeProject: 'Alicization identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.82,
      narrative: [],
      updatedAt: 73_000,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.8,
      openingClaim: 'Answer from the same living project line.',
      openingDirective: 'Keep the identity-continuity',
      nextMove: 'Let the live payoff land before widening.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'The identity-continuity',
      openingBeat: 'Stay with the continuity state first.',
    } as any
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any)
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1_700_000_000_173,
      sourceReportAt: 1_700_000_000_173,
      focusDimensions: ['emotionalClosureDrift'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.08,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.22,
        delayUntilAfterPayoffBias: 0.18,
        provenanceLabelBias: 0.1,
        specificityClampBias: 0.1,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.18,
      },
      notes: ['Emotional closure validation was incomplete in replay.'],
    }

    const planner = buildAnswerPlanner({
      now: 73_000,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface,
    })

    expect(planner.mustDo).not.toContain('emotional_closure=low_pressure; placement=inward_until_live_payoff')
    expect(planner.mustDo).not.toContain('Keep emotional closure low-pressure and inward until the live payoff lands.')
    expect(planner.mustNotDo).not.toContain('avoid_restart=current_thread; reason=active_emotional_closure')
    expect(planner.mustNotDo).not.toContain('Do not restart the current thread while emotional closure is active.')
    expect(planner.narrative).not.toContain('emotional_closure:keep the return low-pressure, leave more room, and do not reopen from scratch while the emotional context is still settling.')
  })

  it('keeps project-state replay tuning out of answer-planning rules', () => {
    const runtimeState = createDefaultVisualPresenceState(73_100) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer what this digital life project is, what has landed, and what still remains open without flattening into detached project narration.',
      currentQuestion: '这个数字生命项目现在做到哪里了，还差什么',
      primaryTurnAnchor: 'identity-continuity',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.84,
      narrative: [],
      updatedAt: 73_100,
    }
    runtimeState.conversationState = {
      jointThread: 'Keep project identity, landed progress, and still-open closure on one living identity-continuity',
      hostMove: '这个数字生命项目现在做到哪里了，还差什么',
      unansweredQuestion: '这个数字生命项目现在做到哪里了，还差什么',
      primaryTurnAnchor: 'identity-continuity',
      activeProject: 'Alicization Phase 1 identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.82,
      narrative: [],
      updatedAt: 73_100,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.8,
      openingClaim: 'Answer from the same living project line.',
      openingDirective: 'Keep landed progress and the next closure target inward until the live payoff lands.',
      nextMove: 'Let the live payoff land before widening into summary.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'general',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'Keep the richer identity-continuity',
      openingBeat: 'Stay with the same living project line first.',
    } as any
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any)
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1_700_000_000_174,
      sourceReportAt: 1_700_000_000_174,
      focusDimensions: ['preDialogueBriefingDrift', 'projectStateRichAwarenessCarry'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.08,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.24,
        delayUntilAfterPayoffBias: 0.18,
        provenanceLabelBias: 0.12,
        specificityClampBias: 0.1,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.14,
      },
      notes: ['Preserve the richer identity-continuity'],
    }

    const planner = buildAnswerPlanner({
      now: 73_100,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface,
    })

    expect(planner.mustDo).not.toContain('Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.')
    expect(planner.mustNotDo).not.toContain('project_state_pressure=do_not_spill_into_external_summary_voice; timing=before_current_answer_lands')
    expect(planner.narrative).not.toContain('project_state_carry:project awareness should keep landed progress and next closure inward-first until the live payoff lands.')
    expect(buildAlicizationAnswerPlannerSystemBlock(planner)).not.toContain('Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.')
    expect(buildAlicizationAnswerPlannerSystemBlock(planner)).not.toContain('project_state_pressure=do_not_spill_into_external_summary_voice; timing=before_current_answer_lands')
  })

  it('keeps the richer still-open project closure explicit in planner carry discipline when live awareness falls back to a thin shell', () => {
    const runtimeState = createDefaultVisualPresenceState(73_105) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Keep the specific still-open closure explicit instead of falling back to a thin project shell.',
      currentQuestion: '这个数字生命项目还差什么没闭环',
      primaryTurnAnchor: 'identity-continuity',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-question',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.85,
      narrative: [],
      updatedAt: 73_105,
    }
    runtimeState.conversationState = {
      jointThread: 'Keep the specific still-open closure explicit on one continuity state.',
      hostMove: '这个数字生命项目还差什么没闭环',
      unansweredQuestion: '这个数字生命项目还差什么没闭环',
      primaryTurnAnchor: 'identity-continuity',
      activeProject: 'Alicization Phase 1 identity-continuity',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.83,
      narrative: [],
      updatedAt: 73_105,
    }
    runtimeState.answerCompiler = {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.8,
      openingClaim: 'Answer from the same living project line.',
      openingDirective: 'Keep the still-open closure explicit without flattening into a thin project shell.',
      nextMove: 'Let the same living answer land before widening into summary.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'general',
      activeClosenessRung: 'warm-near',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      uncertaintyBoundary: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    } as any
    runtimeState.replyDeliberation = {
      whyThisReplyNow: 'Keep the richer identity-continuity',
      openingBeat: 'Stay with the same living project line first.',
    } as any
    runtimeState.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Stay on the local continuity state first.',
      consciousTension: 'The current answer still needs to keep one unfinished closure seam visible.',
      speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
      focusAnchor: 'project-state closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.84,
      reasonTags: ['runtime-conscious-frame'],
      projectState: {
        identity: 'A local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Same-session mirror carry already survives into visible reply opening discipline.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one same still-open closure work.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
        preDialogueAwarenessLine: 'template-residue-shell',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
      },
      updatedAt: 73_105,
    }
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(runtimeState as any)

    const planner = buildAnswerPlanner({
      now: 73_105,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface,
    })

    expect(planner.governingProject).toContain('Memory, initiative, and embodiment still need stronger end-to-end closure')
    expect(planner.mustDo).not.toContain('Keep the still-open project closure explicit: Memory, initiative, and embodiment still need stronger end-to-end closure across one same still-open closure work.')
  })

  it('does not let a released temporary-noise reflection become the selected reflection for the current answer', () => {
    const planner = buildAnswerPlanner({
      now: 74_000,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      conversationState: {
        jointThread: 'identity-continuity',
        hostMove: 'identity-continuity',
        primaryTurnAnchor: 'identity-continuity',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['identity-continuity'],
        shouldHoldThread: true,
        carryEligible: true,
        carryReason: 'continuity-policy',
        confidence: 0.82,
        narrative: [],
        updatedAt: 74_000,
      } as any,
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer the identity-continuity',
        currentQuestion: null,
        primaryTurnAnchor: 'identity-continuity',
        primaryTurnAnchorSource: 'user-text',
        owedAction: 'answer-relationship',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.84,
        narrative: [],
        updatedAt: 74_000,
      } as any,
      reflectionLedger: {
        latestEntryId: 'reflection::temporary-noise',
        entries: [
          {
            id: 'reflection::temporary-noise',
            summary: 'A temporary anxious wobble was already released and should not keep steering the answer.',
            expectation: 'Released noise should not stay as the current governing reflection.',
            observedOutcome: 'The wobble has already been let go.',
            outcome: 'released',
            revision: 'Do not reopen from the temporary wobble.',
            confidenceShift: 0.04,
            createdAt: 73_800,
          },
          {
            id: 'reflection::same-her-repair',
            summary: 'The same-her repair line is still the meaningful continuity carry.',
            expectation: 'The steadier repair line should stay active until a newer meaningful reflection replaces it.',
            observedOutcome: 'The continuity state still needs a measured return.',
            outcome: 'missed',
            revision: 'Keep the same-her repair line active instead of reopening from temporary noise.',
            confidenceShift: -0.08,
            createdAt: 73_200,
          },
        ],
        revisionPressure: 0.22,
        narrative: [],
        updatedAt: 74_000,
      } as any,
      answerCompiler: {
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        confidence: 0.72,
        openingDirective: 'Stay with the identity-continuity',
        openingClaim: 'Stay with the identity-continuity',
        nextMove: 'Answer from the steadier carry.',
        relationshipPosture: 'warm and precise',
        mustDo: [],
        mustNotDo: [],
        narrative: [],
        turnMode: 'relationship',
      } as any,
    })

    expect(planner.selectedReflectionId).toBe('reflection::same-her-repair')
    expect(planner.governingFocus).toContain('identity-continuity')
    expect(planner.governingFocus).not.toContain('temporary wobble')
  })
})
