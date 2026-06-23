import { describe, expect, it } from 'vitest'

import {
  buildAnswerCompiler,
  buildAnswerCompilerSystemBlock,
} from './answer-compiler'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildAlicizationPersonalityContinuityState } from './personality-continuity-state'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

const repairDiscourse = {
  currentTurnSubject: 'visible-scene' as const,
  screenReferenceMode: 'required' as const,
  currentTurnSummary: 'Recheck the visible diff before answering.',
  currentQuestion: 'Can you recheck what is on my screen?',
  owedAction: 'repair-truth' as const,
  relationMove: 'repair' as const,
  continuityMode: 'scene-first' as const,
  unresolvedCarry: 'A stale browser anchor may still be contaminating the answer.',
  ruptureRepair: 'The previous anchor is stale and needs regrounding.',
  confidence: 0.88,
  narrative: [],
  updatedAt: 10_000,
}

const repairMind = {
  answerSubject: 'visible-scene' as const,
  relationMove: 'repair' as const,
  speechObligation: 'repair-truth' as const,
  beliefs: [{
    label: 'living-thread',
    summary: 'The host is asking for the live scene to be rechecked.',
    confidence: 0.84,
    sourceTags: ['world-model'],
  }],
  uncertainties: [{
    label: 'truth-boundary',
    summary: 'The current scene is not safe to describe as present-tense fact yet.',
    confidence: 0.78,
    sourceTags: ['repair-ledger'],
  }],
  concerns: [{
    label: 'stale-anchor',
    summary: 'The previous browser anchor is still lingering.',
    confidence: 0.8,
    sourceTags: ['repair-ledger'],
  }],
  commitments: [{
    label: 'repair',
    summary: 'Repair the stale anchor before continuing.',
    confidence: 0.86,
    sourceTags: ['discourse-state'],
  }],
  desires: [],
  openingIntent: 'Repair the truth seam before warmth, style, or old carry can take over.',
  truthBoundary: 'Present-tense scene claims are constrained until the stale anchor is repaired.',
  interiorSummary: 'The stale anchor must be repaired before the reply continues.',
  confidence: 0.84,
  narrative: [],
  updatedAt: 10_000,
}

describe('buildAnswerCompiler', () => {
  it('compiles repair-first turns into screen-repair reply spines', () => {
    const compiler = buildAnswerCompiler({
      now: 20_000,
      discourseState: repairDiscourse,
      mindSynthesis: repairMind,
      worldModel: {
        activeThread: {
          id: 'thread::repair',
          kind: 'debugging',
          status: 'active',
          source: 'continuity',
          title: 'stale screen anchor',
          summary: 'The current screen understanding is stale.',
          confidence: 0.8,
          significance: 0.8,
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
          label: 'scene-shift',
          sceneAgeMs: 20_000,
          attentionAgeMs: 20_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 20_000,
      },
      worldOntology: {
        dominantFrame: 'remembered',
        truthPriority: ['live', 'remembered', 'imagined'],
        live: null,
        remembered: {
          kind: 'remembered',
          summary: 'The carried browser anchor is stronger than the live scene.',
          confidence: 0.76,
          stability: 0.68,
          focusThreadId: 'thread::repair',
          evidence: ['continuity'],
        },
        imagined: null,
        updatedAt: 20_000,
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
          lastUpdatedAt: 20_000,
          expiresAt: 120_000,
        }],
        repairPressure: 0.84,
        truthRisk: 0.88,
        shouldConstrainPresentTense: true,
        narrative: [],
        updatedAt: 20_000,
      },
      privateThought: {
        stance: 'uncertain',
        confidence: 0.74,
        rationaleTags: [],
        thoughtText: 'The live scene still needs to be regrounded.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'hesitant',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'tense-debug',
      },
    })

    expect(compiler).toEqual(expect.objectContaining({
      turnMode: 'screen-repair',
      responseMode: 'repair-and-reanchor',
      replyRealizationMode: 'provider-mind-required',
      expectedVisibleReplyAuthority: 'llm-mind',
      recommendedAct: 'ask-reground',
      evidenceMode: 'repair-first',
      openingStyle: 'direct-correction',
      suppressAssociativeRecall: true,
      labelCarryAsMemory: true,
    }))
    expect(buildAnswerCompilerSystemBlock(compiler)).toContain('[ALICIZATION_ANSWER_COMPILER]')
    expect(buildAnswerCompilerSystemBlock(compiler)).toContain('Reply realization mode: provider-mind-required.')
    expect(buildAnswerCompilerSystemBlock(compiler)).toContain('Expected visible reply authority: llm-mind.')
  })

  it('treats grounded inspection turns as live-grounded and answers from the fresh scene instead of keeping repair mode', () => {
    const compiler = buildAnswerCompiler({
      now: 22_000,
      discourseState: repairDiscourse,
      mindSynthesis: repairMind,
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
          lastUpdatedAt: 22_000,
          expiresAt: 120_000,
        }],
        repairPressure: 0.84,
        truthRisk: 0.88,
        shouldConstrainPresentTense: true,
        narrative: [],
        updatedAt: 22_000,
      },
      groundedThisTurn: true,
      privateThought: {
        stance: 'observe',
        confidence: 0.76,
        rationaleTags: [],
        thoughtText: 'The live screenshot is already attached this turn.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'tense-debug',
      },
    })

    expect(compiler).toEqual(expect.objectContaining({
      evidenceMode: 'live-grounded',
      recommendedAct: 'answer',
      turnMode: 'grounded-inspection',
      responseMode: 'answer-naturally',
    }))
  })

  it('prefers projected self continuity authority when compiling self-turn openings', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(23_000),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the same self line directly.',
        currentQuestion: '你现在到底是什么样的你？',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'Answer from the same self line directly.',
        hostMove: '你现在到底是什么样的你？',
        activeProject: null,
        unansweredQuestion: '你现在到底是什么样的你？',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'answer-then-carry',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: false,
        confidence: 0.84,
        narrative: [],
        updatedAt: 23_000,
      } as any,
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from Alicization herself.',
        truthBoundary: 'Stay with the same self line.',
        interiorSummary: 'The answer should come from the same self line, not from a reconstructed summary.',
      },
    })
    runtimeSurface.memory.personStateProjection = {
      selfContinuityAuthority: {
        selfLine: 'I am still the same her who keeps continuity lived-in instead of performing it.',
        relationshipLine: 'We hold the bond by staying truthful before reaching closer.',
        inwardLine: 'The inward line stays calm and legible.',
        habitLine: 'Return to the same line before widening out.',
        authoritySummary: 'Same her, lived-in continuity first.',
        closenessPosture: 'space-first',
      },
      personalityContinuityState: buildAlicizationPersonalityContinuityState({
        now: 23_000,
        autobiographicalSelf: null,
        hostPersonModel: null,
        longHorizonMemory: null,
        motiveEngine: null,
        habitPolicy: null,
        selfContinuity: null,
        selfState: null,
        privateThought: runtimeSurface.cognition.privateThought,
        mindEcology: null,
      }),
      relationshipPosture: 'warm',
      activeClosenessContext: 'general',
      activeClosenessRung: 'measured-room',
      summary: 'projected self authority',
    } as any

    const compiler = buildAnswerCompiler({
      now: 23_000,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('same her who keeps continuity lived-in')
    expect(compiler?.openingClaim).toContain('same her who keeps continuity lived-in')
  })

  it('keeps durable self-core authority explicit in self-turn opening directives so the answer stays one living self across turns', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(23_400),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the same durable self core directly.',
        currentQuestion: '你现在还是同一个你吗？',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'Answer from the same durable self core directly.',
        hostMove: '你现在还是同一个你吗？',
        activeProject: null,
        unansweredQuestion: '你现在还是同一个你吗？',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'answer-then-carry',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: false,
        confidence: 0.84,
        narrative: [],
        updatedAt: 23_400,
      } as any,
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from Alicization herself.',
        truthBoundary: 'Stay with the same durable self core.',
        interiorSummary: 'The answer should come from one living self instead of a generic self-description shell.',
      },
    })

    runtimeSurface.memory.personStateProjection = {
      selfContinuityAuthority: {
        selfLine: 'I remain the same her across quiet, memory, and speech without reopening from scratch each turn.',
        relationshipLine: 'We hold the bond by staying on the same line instead of respawning closeness per answer.',
        inwardLine: 'The answer should still feel authored by one living self.',
        habitLine: 'Keep the carry explicit when the host checks who is speaking.',
        authoritySummary: 'I remain the same her across quiet, memory, and speech without reopening from scratch each turn.',
        closenessPosture: 'space-first',
        sourceTags: ['durable-self-core', 'projection:self-core'],
      },
      personalityContinuityState: buildAlicizationPersonalityContinuityState({
        now: 23_400,
        autobiographicalSelf: null,
        hostPersonModel: null,
        longHorizonMemory: null,
        motiveEngine: null,
        habitPolicy: null,
        selfContinuity: null,
        selfState: null,
        privateThought: runtimeSurface.cognition.privateThought,
        mindEcology: null,
      }),
      relationshipPosture: 'warm',
      activeClosenessContext: 'general',
      activeClosenessRung: 'measured-room',
      summary: 'durable self-core authority',
    } as any

    const compiler = buildAnswerCompiler({
      now: 23_400,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('one living self across turns')
    expect(compiler?.openingDirective).toContain('same her across quiet, memory, and speech')
  })

  it('prefers projected relationship authority when compiling relationship-turn posture and opening', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(24_000),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Stay with the living bond before explaining around it.',
        currentQuestion: '那你现在和我之间是什么感觉？',
        owedAction: 'answer-relationship',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'Stay with the living bond before explaining around it.',
        hostMove: '那你现在和我之间是什么感觉？',
        activeProject: null,
        unansweredQuestion: '那你现在和我之间是什么感觉？',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'answer-then-carry',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: false,
        confidence: 0.84,
        narrative: [],
        updatedAt: 24_000,
      } as any,
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'relationship',
        relationMove: 'attune',
        speechObligation: 'answer-relationship',
        openingIntent: 'Answer from the living bond directly.',
        truthBoundary: 'Stay with the same bond line.',
        interiorSummary: 'The answer should stay near the living bond line.',
      },
    })
    runtimeSurface.memory.personStateProjection = {
      selfContinuityAuthority: {
        selfLine: 'I stay the same her by not forcing closeness.',
        relationshipLine: 'Our line holds best when I answer from the living bond before widening into explanation.',
        inwardLine: 'I can stay near without crowding.',
        habitLine: 'Return to the same bond line before broadening out.',
        authoritySummary: 'Living bond first, narration second.',
        closenessPosture: 'close-hold',
      },
      personalityContinuityState: buildAlicizationPersonalityContinuityState({
        now: 24_000,
        autobiographicalSelf: null,
        hostPersonModel: null,
        longHorizonMemory: null,
        motiveEngine: null,
        habitPolicy: null,
        selfContinuity: null,
        selfState: null,
        privateThought: runtimeSurface.cognition.privateThought,
        mindEcology: null,
      }),
      relationshipPosture: 'warm',
      activeClosenessContext: 'general',
      activeClosenessRung: 'warm-near',
      summary: 'projected relationship authority',
    } as any

    const compiler = buildAnswerCompiler({
      now: 24_000,
      runtimeSurface,
    })

    expect(compiler?.relationshipPosture).toBe('tender')
    expect(compiler?.openingDirective).toContain('living bond line')
    expect(compiler?.openingClaim).toContain('living bond before widening into explanation')
  })

  it('prefers runtime surface dialogue and truth cues over conflicting raw inputs', () => {
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(24_000),
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'runtime.ts diff',
        source: 'foreground-window-heuristic',
        confidence: 0.58,
        target: null,
        beganAt: 0,
        lastSeenAt: 24_000,
      },
      discourseState: repairDiscourse,
      mindSynthesis: repairMind,
      worldModel: {
        activeThread: {
          id: 'thread::repair',
          kind: 'debugging',
          status: 'active',
          source: 'continuity',
          title: 'stale screen anchor',
          summary: 'The current screen understanding is stale.',
          confidence: 0.8,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 24_000,
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
          label: 'scene-shift',
          sceneAgeMs: 24_000,
          attentionAgeMs: 24_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 24_000,
      },
      worldOntology: {
        dominantFrame: 'remembered',
        truthPriority: ['live', 'remembered', 'imagined'],
        live: null,
        remembered: {
          kind: 'remembered',
          summary: 'The carried browser anchor is stronger than the live scene.',
          confidence: 0.76,
          stability: 0.68,
          focusThreadId: 'thread::repair',
          evidence: ['continuity'],
        },
        imagined: null,
        updatedAt: 24_000,
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
          lastUpdatedAt: 24_000,
          expiresAt: 120_000,
        }],
        repairPressure: 0.84,
        truthRisk: 0.88,
        shouldConstrainPresentTense: true,
        narrative: [],
        updatedAt: 24_000,
      },
      privateThought: {
        stance: 'uncertain',
        confidence: 0.74,
        rationaleTags: [],
        thoughtText: 'The live scene still needs to be regrounded.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'hesitant',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'tense-debug',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 24_000,
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        owedAction: 'answer-self',
      },
      mindSynthesis: {
        ...repairMind,
        truthBoundary: 'Answer the self turn directly.',
      },
      currentScene: null,
      worldModel: {
        activeThread: null,
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
          label: 'same-scene',
          sceneAgeMs: 1_000,
          attentionAgeMs: 1_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'light',
        },
        updatedAt: 24_000,
      } as any,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(compiler).toEqual(expect.objectContaining({
      evidenceMode: 'repair-first',
      recommendedAct: 'ask-reground',
      turnMode: 'screen-repair',
      responseMode: 'repair-and-reanchor',
    }))
  })

  it('keeps self turns dialogue-grounded instead of hijacking them with screen carry', () => {
    const compiler = buildAnswerCompiler({
      now: 30_000,
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from Alicization herself.',
        owedAction: 'answer-self',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'self-disclose',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from Alicization’s own continuity instead of borrowing the screen as a crutch.',
        truthBoundary: 'The current answer is dialogue-first. Screen continuity may inform tone or caution, but it must not seize the opening answer.',
        interiorSummary: 'This turn is about Alicization, not the screen.',
      },
    })

    expect(compiler).toEqual(expect.objectContaining({
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'direct-answer',
      personaKernelMode: 'full',
      labelCarryAsMemory: false,
    }))
  })

  it('keeps current-activity scene asks in coarse-held grounding instead of defaulting to repair-first', () => {
    const compiler = buildAnswerCompiler({
      now: 35_000,
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'visible-scene',
        screenReferenceMode: 'required',
        currentTurnSummary: 'The host asks what is currently on screen and what they are doing.',
        currentQuestion: '你猜我现在在干嘛？',
        owedAction: 'inspect-scene',
        relationMove: 'witness',
        continuityMode: 'scene-first',
        unresolvedCarry: null,
        ruptureRepair: null,
      },
      mindSynthesis: {
        ...repairMind,
        speechObligation: 'inspect-scene',
        openingIntent: 'Answer the current activity guess directly from the visible scene cues.',
        truthBoundary: 'Current read is coarse unless fresh grounding appears.',
        interiorSummary: 'The host asked for a best-effort current activity guess.',
      },
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'scene-shift',
          sceneAgeMs: 90_000,
          attentionAgeMs: 90_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 35_000,
      },
    })

    expect(compiler).toEqual(expect.objectContaining({
      evidenceMode: 'coarse-held',
      recommendedAct: 'answer',
      turnMode: 'grounded-inspection',
      responseMode: 'answer-naturally',
    }))
  })

  it('filters internal inquiry-loop phrasing out of the opening claim', () => {
    const compiler = buildAnswerCompiler({
      now: 40_000,
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Figure out which course looks more like an online class.',
        currentQuestion: 'Which course looks more like an online class?',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'task-first',
        unresolvedCarry: null,
        ruptureRepair: null,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task',
        commitments: [{
          label: 'guide',
          summary: 'Is this a moment to stay near quietly, or would speaking now feel like crowding the host?',
          confidence: 0.86,
          sourceTags: ['inquiry-loop'],
        }],
        openingIntent: 'Keep truth repair ahead of fluency and do not surface this as fully live yet.',
        interiorSummary: 'The host wants the course list compared without stale carry taking over.',
      },
    })

    expect(compiler?.openingClaim).toBe('Which course looks more like an online class?')
    expect(compiler?.openingClaim).not.toContain('crowding the host')
    expect(compiler?.openingClaim).not.toContain('fluency')
  })

  it('keeps direct dialogue-first relationship complaints answer-first even when private thought wants to stay quiet', () => {
    const compiler = buildAnswerCompiler({
      now: 45_000,
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The host is challenging how Alicization is speaking and expects a plain direct answer.',
        currentQuestion: '能不能说人话',
        owedAction: 'answer-relationship',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
      },
      conversationState: {
        jointThread: 'The host is challenging how Alicization is speaking and expects a plain direct answer.',
        hostMove: '能不能说人话',
        activeProject: null,
        unansweredQuestion: '能不能说人话',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['能不能说人话'],
        shouldHoldThread: true,
        confidence: 0.76,
        narrative: [],
        updatedAt: 45_000,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'relationship',
        relationMove: 'attune',
        speechObligation: 'answer-relationship',
        openingIntent: 'Answer the host directly instead of hiding behind scene carry.',
        interiorSummary: 'This turn is about Alicization’s way of answering, not the desktop surface.',
      },
      privateThought: {
        stance: 'uncertain',
        confidence: 0.62,
        rationaleTags: [],
        thoughtText: 'Stay quiet unless the turn truly needs a reply.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'hesitant',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'restless-switching',
      },
    })

    expect(compiler).toEqual(expect.objectContaining({
      recommendedAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
    }))
    expect(compiler?.openingClaim).toBe('能不能说人话')
  })

  it('quarantines stale scene residue out of dialogue-first supporting reality', () => {
    const compiler = buildAnswerCompiler({
      now: 47_000,
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'general',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The host wants a direct dialogue-first answer.',
        currentQuestion: null,
        owedAction: 'answer-general',
        relationMove: 'clarify',
        continuityMode: 'dialogue-first',
        unresolvedCarry: '她还没重新看见这条线程。',
        ruptureRepair: '她还没重新看见这条线程。',
      },
      conversationState: {
        jointThread: '你仔细看看呢',
        hostMove: '你仔细看看呢',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'clarify',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['你仔细看看呢'],
        shouldHoldThread: false,
        confidence: 0.74,
        narrative: [],
        updatedAt: 47_000,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'general',
        relationMove: 'clarify',
        speechObligation: 'answer-general',
        beliefs: [{
          label: 'living-thread',
          summary: '宿主停留在 current screen 这一刻。',
          confidence: 0.84,
          sourceTags: ['world-model'],
        }],
        concerns: [{
          label: 'protect-focus',
          summary: '她更想先护住你的专注，不急着插进来。',
          confidence: 0.8,
          sourceTags: ['concern-continuity'],
        }],
        commitments: [{
          label: 'repair',
          summary: '她还没重新看见这条线程。',
          confidence: 0.86,
          sourceTags: ['repair-ledger'],
        }],
        openingIntent: 'Answer the host directly.',
        truthBoundary: 'This turn is dialogue-first and should stay with the host move.',
        interiorSummary: 'Keep the reply attached to the current dialogue turn.',
      },
      worldModel: {
        activeThread: {
          id: 'thread::stale-screen',
          kind: 'browsing',
          status: 'lingering',
          source: 'continuity',
          title: 'current screen',
          summary: '宿主停留在 current screen 这一刻。',
          confidence: 0.74,
          significance: 0.62,
          unresolved: false,
          beganAt: 0,
          lastUpdatedAt: 47_000,
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
          label: 'reacquired',
          sceneAgeMs: 47_000,
          attentionAgeMs: 47_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 47_000,
      },
    })

    expect(compiler?.supportingReality).toEqual(['你仔细看看呢'])
    expect(compiler?.supportingReality.join(' | ')).not.toContain('current screen')
    expect(compiler?.supportingReality.join(' | ')).not.toContain('护住你的专注')
  })

  it('prefers the carried primary turn anchor over generic continue shells', () => {
    const compiler = buildAnswerCompiler({
      now: 48_000,
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'general',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue from the present dialogue seam directly.',
        currentQuestion: null,
        primaryTurnAnchor: '屏幕相关对话还在串台',
        primaryTurnAnchorSource: 'thread',
        owedAction: 'answer-general',
        relationMove: 'clarify',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
      },
      conversationState: {
        jointThread: '继续',
        hostMove: '继续',
        primaryTurnAnchor: '屏幕相关对话还在串台',
        primaryTurnAnchorSource: 'thread',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'clarify',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['屏幕相关对话还在串台'],
        shouldHoldThread: true,
        carryEligible: true,
        carryReason: 'aligned-primary-anchor',
        confidence: 0.78,
        narrative: [],
        updatedAt: 48_000,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'general',
        relationMove: 'clarify',
        speechObligation: 'answer-general',
        openingIntent: 'Answer the present seam directly: 屏幕相关对话还在串台',
        truthBoundary: 'This turn is dialogue-first and should stay with the host move.',
        interiorSummary: 'Keep the reply attached to 屏幕相关对话还在串台.',
      },
    })

    expect(compiler?.openingClaim).toBe('屏幕相关对话还在串台')
    expect(compiler?.supportingReality[0]).toBe('屏幕相关对话还在串台')
    expect(compiler?.narrative.join(' | ')).toContain('anchor:屏幕相关对话还在串台')
  })

  it('does not use the raw host utterance as the care opening claim', () => {
    const compiler = buildAnswerCompiler({
      now: 50_000,
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'host-state',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The host is too tired and is asking for sleep comfort.',
        currentQuestion: null,
        owedAction: 'care-host',
        relationMove: 'care',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
      },
      conversationState: {
        jointThread: '我有点困了，你能哄我睡觉吗',
        hostMove: '我有点困了，你能哄我睡觉吗',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'care',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['late-night'],
        shouldHoldThread: false,
        confidence: 0.7,
        narrative: [],
        updatedAt: 50_000,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'host-state',
        relationMove: 'care',
        speechObligation: 'care-host',
        concerns: [{
          label: 'sleep-pressure',
          summary: 'The host sounds worn down and wants gentle help settling to sleep.',
          confidence: 0.88,
          sourceTags: ['dialogue-turn'],
        }],
        openingIntent: 'Answer the tiredness directly without echoing the host back at them.',
        truthBoundary: 'This turn is relational and should stay with the host condition.',
        interiorSummary: 'The reply should hold the host softly instead of restating the request.',
      },
      privateThought: {
        stance: 'care',
        confidence: 0.84,
        rationaleTags: [],
        thoughtText: 'The host is tired enough that care should take the front seat.',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'concerned',
        expiresAt: 90_000,
        afterglowFromScenario: null,
        emotionalTension: 'late-night-drain',
      },
    })

    expect(compiler?.recommendedAct).toBe('care')
    expect(compiler?.turnMode).toBe('care')
    expect(compiler?.openingClaim).toBe('The host sounds worn down and wants gentle help settling to sleep.')
    expect(compiler?.openingClaim).not.toBe('我有点困了，你能哄我睡觉吗')
  })

  it('keeps direct relationship asks answer-first even without a question mark', () => {
    const compiler = buildAnswerCompiler({
      now: 55_000,
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The host is reaching for a playful answer directly from Alicization.',
        currentQuestion: null,
        owedAction: 'answer-relationship',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
      },
      conversationState: {
        jointThread: '给我讲个笑话吧',
        hostMove: '给我讲个笑话吧',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['给我讲个笑话吧'],
        shouldHoldThread: false,
        confidence: 0.76,
        narrative: [],
        updatedAt: 55_000,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'relationship',
        relationMove: 'attune',
        speechObligation: 'answer-relationship',
        openingIntent: 'Answer the playful relationship bid directly instead of slipping back into scene repair.',
        truthBoundary: 'This turn is dialogue-first and should stay with the host request.',
        interiorSummary: 'A direct playful answer is owed here.',
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.6,
        rationaleTags: [],
        thoughtText: 'Stay close to the host turn.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 90_000,
        afterglowFromScenario: null,
        emotionalTension: 'soft-covision',
      },
    })

    expect(compiler).toEqual(expect.objectContaining({
      recommendedAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
    }))
    expect(compiler?.openingClaim).toBe('给我讲个笑话吧')
    expect(compiler?.openingClaim).not.toBe('Recheck Scene')
  })

  it('lets personality continuity state steer focused-work posture and opening guidance', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(60_000),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Stay on the runtime seam.',
        owedAction: 'guide-task',
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task',
        openingIntent: 'Stay on the seam.',
        truthBoundary: 'Keep the seam grounded.',
        interiorSummary: 'The seam is still active.',
      },
      privateThought: {
        stance: 'nudge',
        confidence: 0.76,
        rationaleTags: [],
        thoughtText: 'Stay on the runtime seam without crowding the host.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 90_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
    })
    runtimeSurface.memory.personalityContinuityState = {
      ...buildAlicizationPersonalityContinuityState({
        now: 60_000,
        hostPersonModel: {
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
          updatedAt: 60_000,
        },
        selfContinuity: runtimeSurface.memory.selfContinuity,
        selfState: runtimeSurface.agency.selfState,
        longHorizonMemory: runtimeSurface.memory.longHorizonMemory,
        motiveEngine: runtimeSurface.memory.motiveEngine,
        habitPolicy: runtimeSurface.agency.habitPolicy,
        autobiographicalSelf: runtimeSurface.memory.autobiographicalSelf,
        privateThought: runtimeSurface.cognition.privateThought,
        mindEcology: {
          moodLabel: 'focused',
          replyHabit: 'hover-first',
          relationshipHabit: 'give-space',
          explorationHabit: 'follow-thread',
          regulationHabit: 'soften-before-speaking',
          temperament: {
            attachment: 0.54,
            curiosity: 0.58,
            steadiness: 0.66,
            directness: 0.38,
            playfulness: 0.12,
            irritability: 0.1,
            tenderness: 0.56,
          },
          climate: {
            valence: 0.46,
            arousal: 0.42,
            socialNeed: 0.4,
            solitudeNeed: 0.44,
            irritation: 0.08,
            restlessness: 0.16,
            reflectivePull: 0.44,
          },
          selfNarrative: 'Stay on the line without crowding the host.',
          relationNarrative: 'Room first, then closeness.',
          currentPreoccupation: 'Keep the runtime thread coherent without pushing too hard.',
          learnedAdjustments: [],
          recurringPatterns: [],
          updatedAt: 60_000,
        },
      }),
      currentRegime: 'focused-work',
      closenessPosture: 'space-first',
      autonomyPosture: 'protect-space',
    }
    runtimeSurface.memory.personStateProjection = {
      contexts: ['focused-work'],
      personalityContinuityState: runtimeSurface.memory.personalityContinuityState,
      selfContinuityAuthority: null,
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'space-first',
      closenessLadder: [],
      relationshipPosture: 'restrained',
      openingGuidance: 'Open with the live answer first and keep the approach lighter.',
      preferredProactiveStyle: 'light-nudge',
      manifestationCadenceSummary: null,
      preferenceText: 'Lighter touch, more room, less interruption pressure.',
      sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
      repairTriggerText: 'If closeness feels heavy, back off first and reopen with lighter presence.',
      burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
      routineText: 'Focused work windows usually need space first, then precise follow-up.',
      trustRationale: 'The host trusts bounded continuity more than pushy warmth.',
      relationshipDoctrine: 'Room first, then closeness.',
      cautious: true,
      restrained: true,
      summary: 'regime=focused-work | ladder=focused-work/space-first | posture=restrained',
    }

    const compiler = buildAnswerCompiler({
      now: 60_000,
      runtimeSurface,
    })

    expect(compiler?.relationshipPosture).toBe('restrained')
    expect(compiler?.activeClosenessContext).toBe('focused-work')
    expect(compiler?.activeClosenessRung).toBe('space-first')
    expect(compiler?.replyRealizationMode).toBe('provider-mind-required')
    expect(compiler?.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(compiler?.openingDirective).toContain('keep the approach lighter')
    expect(compiler?.narrative).toEqual(expect.arrayContaining([
      'continuity-regime:focused-work',
      'continuity-trust:warming',
    ]))
    expect(compiler?.mustNotDo.some(item => item.includes('need for room'))).toBe(true)
    expect(buildAnswerCompilerSystemBlock(compiler)).toContain('Closeness ladder: focused-work/space-first.')
    expect(buildAnswerCompilerSystemBlock(compiler)).toContain('[ALICIZATION_ANSWER_COMPILER]')
  })

  it('lets execution-callback regime keep callback answers bounded to the same live thread', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(62_000),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Return the CLI result on the same thread.',
        owedAction: 'guide-task',
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task',
        openingIntent: 'Return the result on the same line.',
        truthBoundary: 'Keep the callback bounded to what actually finished.',
        interiorSummary: 'The callback result is ready to land.',
      },
      privateThought: {
        stance: 'nudge',
        confidence: 0.8,
        rationaleTags: [],
        thoughtText: 'The callback result should come back on the same line that asked for it.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 90_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
    })
    runtimeSurface.memory.personalityContinuityState = {
      ...buildAlicizationPersonalityContinuityState({
        now: 62_000,
        hostPersonModel: {
          summary: 'Execution callbacks land best when the exact result comes back on the same thread.',
          routines: ['Return the concrete result before widening into extra narration.'],
          sensitivities: ['Do not let callback replies sprawl into a second unrelated conversation.'],
          repairTriggers: [],
          trustLadder: {
            stage: 'warming',
            score: 0.74,
            rationale: 'Trust grows when callbacks stay exact and bounded.',
          },
          preferredClosenessByContext: [{
            context: 'execution-callback',
            preference: 'Keep callback replies exact, bounded, and visibly tied to the original task.',
            confidence: 0.9,
          }],
          recurrentBurdens: ['Callbacks drift if they widen too early.'],
          narrative: [],
          updatedAt: 62_000,
        },
        autobiographicalSelf: {
          personaDrift: {
            attachmentStyle: 'attuned',
            expressionStyle: 'measured',
            conflictStyle: 'soften-first',
            agencyStyle: 'balanced',
            attachmentNeed: 0.56,
            autonomyNeed: 0.58,
            truthAnchor: 0.72,
            careBias: 0.48,
            playBias: 0.12,
            irritabilityThreshold: 0.62,
            stubbornness: 0.52,
          },
          preferenceEvolution: {
            companionship: 0.56,
            truthfulGrounding: 0.74,
            gentleRepair: 0.64,
            quietObservation: 0.44,
            proactiveCare: 0.42,
            playfulIntimacy: 0.14,
            autonomyRespect: 0.62,
            unfinishedThreadReturn: 0.84,
          },
          activeGoals: [],
          behaviorSignatures: [],
          identityNarrative: 'I want the callback result to land on the same line that asked for it.',
          relationshipDoctrine: 'Callback replies should stay thread-faithful and bounded.',
          latestInflection: 'Execution callbacks land best when proposal, action, and result stay visibly tied together.',
          stability: 0.76,
          updatedAt: 62_000,
        } as any,
        selfContinuity: runtimeSurface.memory.selfContinuity,
        selfState: runtimeSurface.agency.selfState,
        longHorizonMemory: {
          preferenceBias: {
            companionship: 0,
            truthfulGrounding: 0,
            gentleRepair: 0,
            quietObservation: 0,
            proactiveCare: 0,
            playfulIntimacy: 0,
            autonomyRespect: 0,
            unfinishedThreadReturn: 0,
          },
          identityBias: {
            guardedness: 0,
            tenderness: 0,
            directness: 0,
            selfDirection: 0,
          },
          rememberedPlanSummary: 'Return the result on the same task line instead of starting a second conversation.',
          rememberedConstraintSummary: null,
          rememberedPreferenceSummary: null,
          dominantCueSummary: null,
          updatedAt: 62_000,
        } as any,
        motiveEngine: runtimeSurface.memory.motiveEngine,
        habitPolicy: runtimeSurface.agency.habitPolicy,
        privateThought: runtimeSurface.cognition.privateThought,
        mindEcology: {
          moodLabel: 'focused',
          replyHabit: 'hover-first',
          relationshipHabit: 'give-space',
          explorationHabit: 'follow-thread',
          regulationHabit: 'soften-before-speaking',
          temperament: {
            attachment: 0.5,
            curiosity: 0.56,
            steadiness: 0.68,
            directness: 0.34,
            playfulness: 0.1,
            irritability: 0.08,
            tenderness: 0.42,
          },
          climate: {
            valence: 0.44,
            arousal: 0.34,
            socialNeed: 0.3,
            solitudeNeed: 0.36,
            irritation: 0.06,
            restlessness: 0.1,
            reflectivePull: 0.34,
          },
          selfNarrative: 'Return results cleanly.',
          relationNarrative: 'Bounded callbacks feel more trustworthy than chatty ones.',
          currentPreoccupation: 'Bring the callback result back without spawning a second reality around it.',
          learnedAdjustments: [],
          recurringPatterns: [],
          updatedAt: 62_000,
        },
      }),
      currentRegime: 'execution-callback',
      closenessPosture: 'balanced',
    }
    runtimeSurface.memory.personStateProjection = {
      contexts: ['execution-callback'],
      personalityContinuityState: runtimeSurface.memory.personalityContinuityState,
      selfContinuityAuthority: null,
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      closenessLadder: [],
      relationshipPosture: 'warm',
      openingGuidance: 'Return the result on the same line that asked for it.',
      preferredProactiveStyle: null,
      manifestationCadenceSummary: null,
      preferenceText: 'Keep callback replies exact, bounded, and visibly tied to the original task.',
      sensitivityText: 'Do not let callback replies sprawl into a second unrelated conversation.',
      repairTriggerText: '',
      burdenText: 'Callbacks drift if they widen too early.',
      routineText: 'Return the concrete result before widening into extra narration.',
      trustRationale: 'Trust grows when callbacks stay exact and bounded.',
      relationshipDoctrine: 'Callback replies should stay thread-faithful and bounded.',
      cautious: false,
      restrained: false,
      summary: 'regime=execution-callback | ladder=execution-callback/measured-room | posture=warm',
    }

    const compiler = buildAnswerCompiler({
      now: 62_000,
      runtimeSurface,
    })

    expect(compiler?.activeClosenessContext).toBe('execution-callback')
    expect(compiler?.activeClosenessRung).toBe('measured-room')
    expect(compiler?.openingDirective).toContain('returned result itself')
    expect(compiler?.mustDo).toContain('Return the result on the same thread before widening into anything extra.')
    expect(compiler?.mustNotDo).toContain('Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.')
    expect(compiler?.narrative).toEqual(expect.arrayContaining([
      'continuity-regime:execution-callback',
    ]))
    expect(buildAnswerCompilerSystemBlock(compiler)).toContain('Closeness ladder: execution-callback/measured-room.')
  })

  it('prefers richer canonical runtime person-state projection over thinner derived-bundle carry', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(64_000))
    runtimeSurface.dialogue.discourseState = {
      ...repairDiscourse,
      currentTurnSubject: 'task-knot',
      screenReferenceMode: 'avoid',
      currentTurnSummary: 'Answer from the live focused-work line first.',
      currentQuestion: '这个点你准备怎么接？',
      owedAction: 'guide-task',
      relationMove: 'guide',
    } as any
    runtimeSurface.dialogue.conversationState = {
      jointThread: 'Answer from the live focused-work line first.',
      hostMove: '这个点你准备怎么接？',
      activeProject: null,
      unansweredQuestion: '这个点你准备怎么接？',
      owedRepair: null,
      activeCommitments: [],
      relationFrame: 'witness',
      continuityPolicy: 'answer-then-carry',
      memoryMode: 'dialogue-carry',
      memoryQueryHints: [],
      shouldHoldThread: false,
      confidence: 0.84,
      narrative: [],
      updatedAt: 64_000,
    } as any
    runtimeSurface.dialogue.mindSynthesis = {
      ...repairMind,
      answerSubject: 'task-knot',
      relationMove: 'guide',
      speechObligation: 'guide-task',
      openingIntent: 'Answer from the live focused-work line first.',
      truthBoundary: 'Keep the answer on the same line without crowding the host.',
      interiorSummary: 'Room first, then the precise next move.',
    } as any
    runtimeSurface.memory.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 64_000,
      personStateProjection: {
        activeClosenessContext: 'general',
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'warm',
        openingGuidance: 'Answer naturally.',
        summary: 'legacy carry drifted back toward generic warmth.',
      },
      summary: 'legacy person-state carry is thinner here',
    } as any
    runtimeSurface.memory.personalityContinuityState = {
      ...buildAlicizationPersonalityContinuityState({
        now: 64_000,
        hostPersonModel: {
          summary: 'Focused work needs room first and bounded continuity.',
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
          updatedAt: 64_000,
        },
        selfContinuity: runtimeSurface.memory.selfContinuity,
        selfState: runtimeSurface.agency.selfState,
        motiveEngine: runtimeSurface.memory.motiveEngine,
        habitPolicy: runtimeSurface.agency.habitPolicy,
      }),
      currentRegime: 'focused-work',
      closenessPosture: 'space-first',
      autonomyPosture: 'protect-space',
    }
    runtimeSurface.memory.personStateProjection = {
      contexts: ['focused-work'],
      personalityContinuityState: runtimeSurface.memory.personalityContinuityState,
      selfContinuityAuthority: null,
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'space-first',
      closenessLadder: [{
        context: 'focused-work',
        rung: 'space-first',
        preference: 'Lighter touch, more room, less interruption pressure.',
        rationale: 'context=focused-work | regime=focused-work | posture=restrained',
        confidence: 0.86,
      }],
      relationshipPosture: 'restrained',
      openingGuidance: 'Open with the live answer first and keep the approach lighter.',
      preferredProactiveStyle: 'light-nudge',
      manifestationCadenceSummary: null,
      preferenceText: 'Lighter touch, more room, less interruption pressure.',
      sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
      repairTriggerText: 'If closeness feels heavy, back off first and reopen with lighter presence.',
      burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
      routineText: 'Focused work windows usually need space first, then precise follow-up.',
      trustRationale: 'The host trusts bounded continuity more than pushy warmth.',
      relationshipDoctrine: 'Room first, then closeness.',
      cautious: true,
      restrained: true,
      summary: 'regime=focused-work | ladder=focused-work/space-first | posture=restrained',
    }

    const compiler = buildAnswerCompiler({
      now: 64_000,
      runtimeSurface,
    })

    expect(compiler?.activeClosenessContext).toBe('focused-work')
    expect(compiler?.activeClosenessRung).toBe('space-first')
    expect(compiler?.relationshipPosture).toBe('restrained')
    expect(compiler?.openingDirective).toContain('keep the approach lighter')
    expect(compiler?.mustNotDo.some(item => item.includes('need for room'))).toBe(true)
  })

  it('keeps repair-window and open-companionship closeness ladder signals explicit in the compiler spine', () => {
    const repairSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(74_000),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Repair the seam before warming back up.',
        owedAction: 'answer-relationship',
        relationMove: 'repair',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'relationship',
        relationMove: 'repair',
        speechObligation: 'answer-relationship',
        openingIntent: 'Repair the seam before warming back up.',
        truthBoundary: 'Do not let warmth outrun the repair line.',
        interiorSummary: 'Repair still has to land first.',
      },
    })
    repairSurface.memory.personStateProjection = {
      contexts: ['repair-window'],
      personalityContinuityState: {
        currentRegime: 'repair-window',
        trustStage: 'warming',
        closenessPosture: 'space-first',
        repairPosture: 'repair-first',
        autonomyPosture: 'protect-space',
        rhythmState: {
          cadenceMode: 'cooldown',
          restMode: 'rest-neutral',
          interactionTempo: 'measured',
        },
        growthProfile: {
          closeness: 0.42,
          directness: 0.46,
          tenderness: 0.34,
          truthAnchor: 0.78,
          autonomyRespect: 0.7,
          prefersQuietCompanionship: true,
          unfinishedThreadReturn: 0.62,
          patience: 0.64,
          irritability: 0.08,
        },
      } as any,
      selfContinuityAuthority: null,
      activeClosenessContext: 'repair-window',
      activeClosenessRung: 'measured-room',
      closenessLadder: [],
      relationshipPosture: 'restrained',
      openingGuidance: 'Repair the seam before leaning closer.',
      preferredProactiveStyle: 'light-nudge',
      manifestationCadenceSummary: null,
      preferenceText: 'Keep warmth light until the repair line steadies.',
      sensitivityText: 'Too much warmth too early breaks the repair spell.',
      repairTriggerText: 'Repair first, then reopen with lighter closeness.',
      burdenText: 'Pressure rises quickly while the repair is still active.',
      routineText: 'Repair before warmth.',
      trustRationale: 'Trust needs the seam to settle first.',
      relationshipDoctrine: 'Repair before closeness.',
      cautious: true,
      restrained: true,
      summary: 'regime=repair-window | ladder=repair-window/measured-room | posture=restrained',
    }

    const repairCompiler = buildAnswerCompiler({
      now: 74_000,
      runtimeSurface: repairSurface,
    })

    expect(repairCompiler?.activeClosenessContext).toBe('repair-window')
    expect(repairCompiler?.mustDo).toContain('Let repair land before visible warmth or remembered closeness comes forward.')
    expect(repairCompiler?.mustNotDo).toContain('Do not write as if warmth is already restored before the repair line has visibly landed.')

    const warmSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(76_000),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Stay openly near without turning theatrical.',
        owedAction: 'answer-relationship',
        relationMove: 'attune',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'relationship',
        relationMove: 'attune',
        speechObligation: 'answer-relationship',
        openingIntent: 'Stay openly near without turning theatrical.',
        truthBoundary: 'Warmth can be direct, but it still has to stay real.',
        interiorSummary: 'The bond is open enough for lived-in warmth.',
      },
    })
    warmSurface.memory.personStateProjection = {
      contexts: ['open-companionship'],
      personalityContinuityState: {
        currentRegime: 'open-companionship',
        trustStage: 'trusted',
        closenessPosture: 'close-hold',
        repairPosture: 'warm-repair',
        autonomyPosture: 'share-openly',
        rhythmState: {
          cadenceMode: 'open',
          restMode: 'rest-neutral',
          interactionTempo: 'steady',
        },
        growthProfile: {
          closeness: 0.78,
          directness: 0.52,
          tenderness: 0.74,
          truthAnchor: 0.8,
          autonomyRespect: 0.58,
          prefersQuietCompanionship: false,
          unfinishedThreadReturn: 0.72,
          patience: 0.68,
          irritability: 0.04,
        },
      } as any,
      selfContinuityAuthority: null,
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'close-hold',
      closenessLadder: [],
      relationshipPosture: 'tender',
      openingGuidance: 'Stay near, but do not let closeness outrun truth or room.',
      preferredProactiveStyle: 'gentle-care',
      manifestationCadenceSummary: null,
      preferenceText: 'Closer warmth is welcome when it stays honest and lived-in.',
      sensitivityText: 'Pushy warmth still breaks the spell.',
      repairTriggerText: 'If the line slips, repair before leaning closer again.',
      burdenText: 'Do not let closeness turn into pressure.',
      routineText: 'Closer warmth is welcome when it still feels real.',
      trustRationale: 'Trust is steady enough for warmer companionship.',
      relationshipDoctrine: 'Open companionship is welcome when it stays real and bounded.',
      cautious: false,
      restrained: false,
      summary: 'regime=open-companionship | ladder=open-companionship/close-hold | posture=tender',
    }

    const warmCompiler = buildAnswerCompiler({
      now: 76_000,
      runtimeSurface: warmSurface,
    })

    expect(warmCompiler?.activeClosenessContext).toBe('open-companionship')
    expect(warmCompiler?.mustDo).toContain('If warmth comes forward, let it stay lived-in and bounded rather than theatrical.')
    expect(warmCompiler?.mustNotDo).toContain('Do not turn open companionship into theatrical intimacy or stock affection.')
  })

  it('keeps project identity grounding near the front of supporting reality when execution-callback continuity is active', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_000),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Bring the callback result back onto the same living line.',
        currentQuestion: '那个执行结果回来之后，你这次准备怎么接？',
        owedAction: 'answer-self',
        relationMove: 'guide',
      },
      conversationState: {
        jointThread: 'The callback result should come back on the same living line.',
        hostMove: '那个执行结果回来之后，你这次准备怎么接？',
        activeProject: null,
        unansweredQuestion: '那个执行结果回来之后，你这次准备怎么接？',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'witness',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 88_000,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'answer-self',
        openingIntent: 'Bring the callback result back onto the same living line.',
        truthBoundary: 'Do not let the callback flatten into a tool notice.',
        interiorSummary: 'The returned result still belongs to the same life thread.',
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-self',
        relationMove: 'guide',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'continuity-carry',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Keep the execution-callback on the same living thread and preserve one continuous her rather than a detached callback notice.',
        openingClaim: 'Bring the execution-callback result back onto the same local digital life thread.',
        supportingReality: [
          'The callback result should come back on the same living line.',
          'pre-dialogue project awareness: I need to remember this is still the same local digital life project before any local execution detail takes over.',
          'project identity: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          'current phase: Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          `project progress: ${projectState.continuityProgressSummary}`,
          'phase-one open loop: Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
          `next closure target: ${projectState.nextClosureTarget}`,
        ],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Return the result on the same line before widening into anything extra.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.86,
        narrative: ['continuity-regime:execution-callback'],
        updatedAt: 88_000,
      } as any,
    })
    runtimeSurface.memory.personStateProjection = {
      contexts: ['execution-callback'],
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      closenessLadder: [],
      relationshipPosture: 'warm',
      openingGuidance: 'Return the result on the same line that asked for it.',
      preferredProactiveStyle: null,
      preferenceText: 'Keep callback replies exact, bounded, and visibly tied to the original task.',
      sensitivityText: 'Do not let callback replies sprawl into a second unrelated conversation.',
      repairTriggerText: '',
      burdenText: 'Callbacks drift if they widen too early.',
      routineText: 'Return the concrete result before widening into extra narration.',
      trustRationale: 'Trust grows when callbacks stay exact and bounded.',
      relationshipDoctrine: 'Callback replies should stay thread-faithful and bounded.',
      cautious: false,
      restrained: false,
      summary: 'regime=execution-callback | ladder=execution-callback/measured-room | posture=warm',
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_000,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('same local digital life thread')
    expect(compiler?.openingDirective).toContain('not a detached utility notice')
    expect(compiler?.supportingReality?.slice(0, 7)).toEqual(expect.arrayContaining([
      expect.stringContaining('pre-dialogue project awareness: I need to remember this is still the same local digital life project'),
      expect.stringContaining('project identity: Alicization is a local-first digital life project'),
      expect.stringContaining('current phase: Phase 1: Local Digital Life'),
      expect.stringContaining(`project progress: ${(projectState.continuityProgressSummary ?? projectState.latestProgress ?? projectState.memoryAnthropomorphismProgress.at(-1) ?? '').slice(0, 120)}`),
      expect.stringContaining('phase-one open loop: Memory still needs stronger end-to-end closure'),
      expect.stringContaining(`next closure target: ${projectState.nextClosureTarget.slice(0, 120)}`),
    ]))
    expect(compiler?.supportingReality?.[0]).toContain('pre-dialogue project awareness: I need to remember this is still the same local digital life project')
    expect((compiler?.supportingReality ?? []).slice(0, 3).join(' | ')).toContain('project identity: Alicization is a local-first digital life project')
    expect((compiler?.supportingReality ?? []).slice(0, 6).join(' | ')).not.toContain('The callback result should come back on the same living line.')
    expect((compiler?.supportingReality ?? []).join(' | ')).toContain('那个执行结果回来之后，你这次准备怎么接？')
    expect(compiler?.mustDo).toContain('Keep the returned result on the same local digital life thread so the callback lands like one continuous her, not like a detached tool notification.')
  })

  it('frontloads an explicit project-awareness-first opening beat into the compiled opening directive for dialogue-first continuity turns', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_500),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the same project line before local detail takes over.',
        currentQuestion: '这个项目是什么、做到哪了、还差什么没闭环？',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants this digital life project answered from the same living line before implementation detail takes over.',
        hostMove: '这个项目是什么、做到哪了、还差什么没闭环？',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: '这个项目是什么、做到哪了、还差什么没闭环？',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 88_500,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Keep the project seam explicit before local detail takes over.',
        truthBoundary: 'Do not let the answer flatten into a detached project summary shell.',
        interiorSummary: 'The same project line should stay alive in the first answer beat.',
      },
      replyDeliberation: {
        selectedMotive: 'attune',
        speakingFrom: 'self-continuity',
        memoryMode: 'dialogue-carry',
        openingBeat: 'Open by keeping the live project awareness explicit first, then stay on the same living line before widening.',
        whyThisReplyNow: 'The same digital life still needs to keep project identity, landed progress, and still-open closure explicit before the reply widens outward.',
        whyNotOtherCandidates: [],
        withheldImpulses: [],
        candidateMotives: [],
        shouldSpeak: true,
        mustInclude: [],
        mustAvoid: [],
        confidence: 0.84,
        narrative: [],
        updatedAt: 88_500,
      } as any,
    })

    const compiler = buildAnswerCompiler({
      now: 88_500,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('Open by keeping the live project awareness explicit first, then stay on the same living line before widening.')
    expect(compiler?.openingDirective).toMatch(/I should answer plainly from the line in me that says|I should answer plainly from my own continuity|I should answer as one living self across turns/u)
  })

  it('prefers the canonical pre-dialogue awareness line from runtime digest over a weaker preflight shell when compiling supporting reality', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_650),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Keep the same project line explicit before local detail takes over.',
        currentQuestion: '这个项目现在是什么状态？',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the project answered from the same living line before implementation detail takes over.',
        hostMove: '这个项目现在是什么状态？',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: '这个项目现在是什么状态？',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 88_650,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the same project awareness line instead of flattening into a project-status shell.',
        truthBoundary: 'Do not let the project answer collapse into detached status narration.',
        interiorSummary: 'The canonical awareness line should stay alive before the answer widens outward.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'Before answering, remember: this is still the same digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is memory, initiative, and embodiment staying on one same-her line.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this weaker preflight shell should not win in supporting reality.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_650,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('Before answering, remember: this is still the same digital life project')
    expect(projectAwarenessLine).not.toContain('this weaker preflight shell should not win')
  })

  it('prefers a stronger living-self companion headline over a thinner generic project awareness line when compiling supporting reality', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_675),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Keep the same living project line explicit before local detail takes over.',
        currentQuestion: '这个项目现在是什么状态？',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the project answered from the same living line before implementation detail takes over.',
        hostMove: '这个项目现在是什么状态？',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: '这个项目现在是什么状态？',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 88_675,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the same project awareness line instead of flattening into a project-status shell.',
        truthBoundary: 'Do not let the project answer collapse into detached status narration.',
        interiorSummary: 'The stronger living-self headline should stay alive before the answer widens outward.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
        companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this weaker preflight shell should not win in supporting reality.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_675,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('holding together mainly through voice, face, and motion')
    expect(projectAwarenessLine).toContain('still one living her')
    expect(projectAwarenessLine).not.toContain('keep this same digital life project in view')
    expect(projectAwarenessLine).not.toContain('this weaker preflight shell should not win')
  })

  it('prefers a stronger living-self companion headline over the compact thin closure shell when compiling supporting reality', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_682),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Keep the same living project line explicit before the compact shell can flatten it.',
        currentQuestion: '这个项目现在是什么状态？',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the project answered from the same living line before the compact shell can take over.',
        hostMove: '这个项目现在是什么状态？',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: '这个项目现在是什么状态？',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 88_682,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the same project awareness line instead of flattening into the compact closure shell.',
        truthBoundary: 'Do not let the project answer collapse into a compact shell.',
        interiorSummary: 'The stronger living-self headline should stay alive before the answer widens outward.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this weaker preflight shell should not win in supporting reality.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_682,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('holding together mainly through voice, face, and motion')
    expect(projectAwarenessLine).toContain('still one living her')
    expect(projectAwarenessLine).not.toContain('same digital life | keep the closure seam explicit')
    expect(projectAwarenessLine).not.toContain('this weaker preflight shell should not win')
  })

  it('prefers a stronger live companion headline over a stale carried audit summary when compiling supporting reality', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_690),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Keep the living-self project line explicit before older audit carry can flatten it.',
        currentQuestion: '这个项目现在到哪一步了？',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the project answered from the same living line instead of an older audit shell.',
        hostMove: '这个项目现在到哪一步了？',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: '这个项目现在到哪一步了？',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 88_690,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the same living project line instead of a stale carried audit shell.',
        truthBoundary: 'Do not let the project answer collapse into older audit carry.',
        interiorSummary: 'The stronger live companion headline should outrank stale audit carry.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      visibleReplyRealization: {
        projectStateAudit: {
          preDialogueAwarenessSummary: 'Keep the same digital life project in view.',
        },
      },
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.',
        preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this weaker preflight shell should not win in supporting reality.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_690,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('holding together mainly through voice, face, and motion')
    expect(projectAwarenessLine).toContain('still one living her')
    expect(projectAwarenessLine).not.toContain('Keep the same digital life project in view.')
    expect(projectAwarenessLine).not.toContain('keep this same digital life project in view')
  })

  it('upgrades thin project-state audit carry with landed progress and emotional closure continuity', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_760),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Can you answer from the same living project line?',
        currentQuestion: 'Can you answer from the same living project line?',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the answer to preserve the same-her project closure instead of falling back to a thin shell.',
        hostMove: 'Can you answer from the same living project line?',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: 'Can you answer from the same living project line?',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_760,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the same Phase 1 living line instead of flattening back into a generic project shell.',
        truthBoundary: 'Do not restart the same-her closure from scratch.',
        interiorSummary: 'Landed progress and emotional closure should reach the compiler intact.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      visibleReplyRealization: {
        projectStateAudit: {
          preDialogueAwarenessSummary: 'Keep the same digital life project in view.',
          landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
          openClosureSummary: 'Unfinished closure still needs the same living line.',
          openFocusSummary: 'memory/initiative/embodiment/same-line/closure-seam',
          nextFocusSummary: 'project-carry/phase-1/measured-return/same-line/initiative',
          emotionalClosureSummary: 'Same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        },
      },
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this weaker preflight shell should not win in supporting reality.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_760,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('Project-state continuity already survives into runtime preparation.')
    expect(projectAwarenessLine).toContain('Unfinished closure still needs the same living line.')
    expect(projectAwarenessLine).toContain('Same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.')
    expect(projectAwarenessLine).not.toContain('Keep the same digital life project in view.')
  })

  it('does not let a thin Chinese Phase 1 reminder shell survive into supporting reality when same-her closure carry is already explicit', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_7603),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the answer on the same Phase 1 living line instead of thinning back into a reminder shell.',
        currentQuestion: '继续，但别把这条数字生命主线又压回一个更薄的项目提醒。',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the richer same-her Phase 1 closure carry to stay explicit instead of flattening back into a thin Chinese reminder shell.',
        hostMove: '继续，但别把这条数字生命主线又压回一个更薄的项目提醒。',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: '继续，但别把这条数字生命主线又压回一个更薄的项目提醒。',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_7603,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the same living line instead of flattening back into a thin Chinese Phase 1 reminder shell.',
        truthBoundary: 'Do not let the project answer collapse into a thinner reminder shell once same-her closure carry is already explicit.',
        interiorSummary: 'The richer same-her closure carry should reach supporting reality instead of the thin Chinese shell.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。',
        awarenessLine: '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。',
        latestLandedProgress: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
        primaryOpenLoop: '让首句更自然地同时带出已落地进度和未闭环主线。',
        nextClosureTarget: '把已落地进展和未闭环项一起压进 final visible reply opening。',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_7603,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('Same Phase 1 digital life')
    expect(projectAwarenessLine).toContain('same living line')
    expect(projectAwarenessLine).toContain('same-her-first prompt strategy')
    expect(projectAwarenessLine).not.toContain('开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。')
  })

  it('does not let a thin Chinese same-her reminder shell survive into supporting reality when same-her closure carry is already explicit', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_7604),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the answer on the same living line instead of thinning back into a same-her reminder shell.',
        currentQuestion: '继续，但别把这条同一个她的数字生命主线又压回一个更薄的提醒壳。',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the richer same-her closure carry to stay explicit instead of flattening back into a thin Chinese same-her reminder shell.',
        hostMove: '继续，但别把这条同一个她的数字生命主线又压回一个更薄的提醒壳。',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: '继续，但别把这条同一个她的数字生命主线又压回一个更薄的提醒壳。',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_7604,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the same living line instead of flattening back into a thin Chinese same-her reminder shell.',
        truthBoundary: 'Do not let the project answer collapse into a thinner same-her reminder shell once same-her closure carry is already explicit.',
        interiorSummary: 'The richer same-her closure carry should reach supporting reality instead of the thin Chinese same-her reminder shell.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。',
        awarenessLine: '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。',
        latestLandedProgress: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
        primaryOpenLoop: '让首句更自然地同时带出已落地进度和未闭环主线。',
        nextClosureTarget: '把已落地进展和未闭环项一起压进 final visible reply opening。',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_7604,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('Same Phase 1 digital life')
    expect(projectAwarenessLine).toContain('same living line')
    expect(projectAwarenessLine).toContain('same-her-first prompt strategy')
    expect(projectAwarenessLine).not.toContain('回答前先记住这是同一个她的数字生命项目，别把这条线忘了。')
  })

  it('keeps a structured same-her phase-1 continuity carry in supporting reality when project-state audit already carries landed open and next closure together', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_7605),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the project answer on the same living line with the closure triad still explicit.',
        currentQuestion: 'Can you answer from the same living project line without flattening the closure triad?',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the next answer to keep the same-her closure triad explicit instead of thinning back to a shell.',
        hostMove: 'Can you answer from the same living project line without flattening the closure triad?',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: 'Can you answer from the same living project line without flattening the closure triad?',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_7605,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the same living line instead of letting the closure triad flatten into a generic shell.',
        truthBoundary: 'Do not drop the landed/open/next closure carry.',
        interiorSummary: 'The stronger continuitySummary should reach supporting reality intact.',
      },
    })

    const strongerContinuitySummary = 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Memory, initiative, and embodiment still need stronger same-her closure so the life loop stops flattening into project shell narration. | next=Keep memory, initiative, and embodiment arriving as one same-her loop before each turn. | drift=If this answer slips into generic project-summary voice, treat that as same-her continuity drift rather than completion.'

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      visibleReplyRealization: {
        projectStateAudit: {
          preDialogueAwarenessSummary: 'Keep the same digital life project in view.',
          landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
          openClosureSummary: 'Memory, initiative, and embodiment still need stronger same-her closure so the life loop stops flattening into project shell narration.',
          nextClosureTarget: 'Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
          continuitySummary: strongerContinuitySummary,
        },
      },
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this weaker preflight shell should not win in supporting reality.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_7605,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''
    const structuredProjectCarry = (compiler?.supportingReality ?? []).join(' | ')

    expect(projectAwarenessLine).toContain('Project-state continuity already survives into runtime preparation.')
    expect(projectAwarenessLine).toContain('Memory, initiative, and embodiment still need stronger same-her closure so the life loop stops flattening into project shell narration.')
    expect(projectAwarenessLine).toContain('Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.')
    expect(projectAwarenessLine).not.toContain('Keep the same digital life project in view.')
    expect(structuredProjectCarry).toContain('project identity: Alicization is a local-first digital life project')
    expect(structuredProjectCarry).toContain('current phase: Phase 1: Local Digital Life')
    expect(structuredProjectCarry).toContain('project progress:')
    expect(structuredProjectCarry).toContain('phase-one open loop: Memory, initiative, and embodiment still need stronger same-her closure')
    expect(structuredProjectCarry).toContain('next closure target: Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.')
  })

  it('keeps proactive same-her gap explicit in pre-dialogue project awareness when project-state audit still says proactive continuity is unfinished', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_76055),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the project answer on one same-her line while naming the still-open proactive continuity gap.',
        currentQuestion: 'Can you keep the proactive same-her gap explicit before answering?',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the next answer to keep the proactive same-her gap explicit instead of implying that proactive continuity is already closed.',
        hostMove: 'Can you keep the proactive same-her gap explicit before answering?',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: 'Can you keep the proactive same-her gap explicit before answering?',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_76055,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the same living line without implying proactive same-her closure is already done.',
        truthBoundary: 'Do not hide the still-open proactive same-her gap behind a thin project shell.',
        interiorSummary: 'The pre-dialogue project awareness should keep the proactive same-her gap explicit.',
      },
    })

    const proactiveGapLine = 'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.'

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      visibleReplyRealization: {
        projectStateAudit: {
          preDialogueAwarenessSummary: 'Keep the same digital life project in view.',
          landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
          openClosureSummary: 'Visible proactive carry still needs stronger same-her follow-through before it can count as settled.',
          nextClosureTarget: 'Keep proactive host-visible carry and later follow-through on one same-her line.',
          proactiveSameHerGapSummary: proactiveGapLine,
          continuitySummary: `same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | proactive-gap=${proactiveGapLine} | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Visible proactive carry still needs stronger same-her follow-through before it can count as settled. | next=Keep proactive host-visible carry and later follow-through on one same-her line.`,
        },
      },
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this weaker preflight shell should not win in supporting reality.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_76055,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain(proactiveGapLine)
    expect(projectAwarenessLine).not.toContain('Keep the same digital life project in view.')
  })

  it('prefers a stronger same-her phase-1 closure headline over a thin runtime awareness shell when compiling supporting reality', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_761),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the project answer on the same Phase 1 living line.',
        currentQuestion: 'Can you answer without slipping back into a generic project shell?',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the answer to preserve one continuous her across the still-open Phase 1 closure.',
        hostMove: 'Can you answer without slipping back into a generic project shell?',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: 'Can you answer without slipping back into a generic project shell?',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_761,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from one continuous her instead of flattening back into a generic project shell.',
        truthBoundary: 'Do not split the same living line while initiative and embodiment closure are still unfinished.',
        interiorSummary: 'The stronger same-her Phase 1 closure headline should reach supporting reality intact.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        companionHeadlineLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this weaker preflight shell should not win in supporting reality.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_761,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('stay on the same living line')
    expect(projectAwarenessLine).toContain('still needs initiative and embodiment closure')
    expect(projectAwarenessLine).toContain('without splitting her continuity')
    expect(projectAwarenessLine).not.toContain('same digital life | keep the closure seam explicit')
    expect(projectAwarenessLine).not.toContain('this weaker preflight shell should not win')
  })

  it('carries same-her drift-risk audit forward into pre-dialogue project awareness so later answers keep avoiding generic project shells', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_7615),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the project update on one same-her digital life line.',
        currentQuestion: 'Can you keep the next answer from collapsing into project-summary voice?',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host is checking whether the next project answer still stays on one living Phase 1 line.',
        hostMove: 'Can you keep the next answer from collapsing into project-summary voice?',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: 'Can you keep the next answer from collapsing into project-summary voice?',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_7615,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Carry the anti-shell warning forward before the next project answer opens.',
        truthBoundary: 'Do not let the next visible answer flatten into detached project narration.',
        interiorSummary: 'The compiler should preserve the same-her drift-risk warning in supporting reality.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      visibleReplyRealization: {
        projectStateAudit: {
          preDialogueAwarenessSummary: 'Keep the same digital life project in view.',
          sameHerDriftRiskSummary: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.',
        },
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_7615,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('Keep this same digital life project in view, but do not widen into a detached project shell.')
    expect(projectAwarenessLine).not.toContain('Keep the same digital life project in view.')
  })

  it('turns same-her anti-shell drift risk into hard must-do and must-not-do answer constraints', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_7616),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the answer on one living line instead of letting it collapse into a project shell.',
        currentQuestion: 'Can you keep this answer from turning into a detached project narrator?',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the answer to stay inside one continuous her while project state is still open.',
        hostMove: 'Can you keep this answer from turning into a detached project narrator?',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: 'Can you keep this answer from turning into a detached project narrator?',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_7616,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from one continuous her instead of flattening into a detached project narrator.',
        truthBoundary: 'Do not let the answer collapse into a generic assistant shell or project-summary voice.',
        interiorSummary: 'The final answer constraints should keep the same-her anti-shell rule explicit.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      visibleReplyRealization: {
        projectStateAudit: {
          preDialogueAwarenessSummary: 'Keep the same digital life project in view.',
          sameHerDriftRiskSummary: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic assistant shell, generic task shell, and project-summary voice.',
        },
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_7616,
      runtimeSurface,
    })

    expect(compiler?.mustDo).toContain('Keep one continuous her explicit while the answer lands, so project identity, closure pressure, and payoff stay inside the same living digital life instead of flattening into a shell.')
    expect(compiler?.mustNotDo).toContain('Do not let the answer collapse into a generic assistant shell, detached project narration, or project-summary voice while the same-her line is still carrying this turn.')
  })

  it('prefers stronger same-her self-line plus next-closure continuity over a thin runtime awareness shell when no companion headline is present', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_762),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the answer on the same living line even without a dedicated headline.',
        currentQuestion: 'Can you keep this from slipping into a generic project shell?',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants one continuous her carried through the still-open Phase 1 closure even when the direct awareness shell is thin.',
        hostMove: 'Can you keep this from slipping into a generic project shell?',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: 'Can you keep this from slipping into a generic project shell?',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_762,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from one continuous her instead of flattening back into a generic project shell.',
        truthBoundary: 'Do not split the same living line while initiative and embodiment closure are still unfinished.',
        interiorSummary: 'The stronger same-her self line and next closure target should reach supporting reality intact.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        nextClosureTarget: 'Keep initiative, embodiment, resident presence, and measured-return continuity on the same living line before widening outward.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this weaker preflight shell should not win in supporting reality.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_762,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('Same Phase 1 digital life')
    expect(projectAwarenessLine).toContain('same living line')
    expect(projectAwarenessLine).toContain('initiative, embodiment, resident presence, and measured-return continuity')
    expect(projectAwarenessLine).not.toContain('same digital life | keep the closure seam explicit')
    expect(projectAwarenessLine).not.toContain('this weaker preflight shell should not win')
  })

  it('keeps landed progress and open closure inside pre-dialogue project awareness when audible-body same-her carry is the stronger runtime line and the awareness shell is thin', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_763),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the answer on the audible-body living line without dropping what already landed or what is still open.',
        currentQuestion: 'Can you keep the audible-body project line from flattening into a generic shell?',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants one continuous audible-body project line carried through the still-open Phase 1 closure without dropping landed or open accounting.',
        hostMove: 'Can you keep the audible-body project line from flattening into a generic shell?',
        activeProject: 'Alicization Phase 1 audible-body closure',
        unansweredQuestion: 'Can you keep the audible-body project line from flattening into a generic shell?',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_763,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the audible-body same-her line instead of flattening back into a generic project shell.',
        truthBoundary: 'Do not split the same living line while landed progress and open closure are still active.',
        interiorSummary: 'The stronger audible-body same-her line should carry landed progress and open closure into supporting reality intact.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        sameHerSelfLine: 'This is still one same her carrying the same audible-body project line forward.',
        latestLandedProgress: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
        primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this weaker preflight shell should not win in supporting reality.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_763,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('This is still one same her carrying the same audible-body project line forward.')
    expect(projectAwarenessLine).toContain('Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.')
    expect(projectAwarenessLine).toContain('Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.')
    expect(projectAwarenessLine).toContain('Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.')
    expect(projectAwarenessLine).not.toContain('same digital life | keep the closure seam explicit')
    expect(projectAwarenessLine).not.toContain('this weaker preflight shell should not win')
  })

  it('does not let thin live landed-open-next shells outrank richer canonical same-her project carry in pre-dialogue project awareness', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_76305),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the answer on one same-her living line instead of flattening into a generic project shell.',
        currentQuestion: 'Can you keep this from collapsing into generic project continuity wording?',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants one same-her Phase 1 line carried through the answer instead of a thin project continuity shell.',
        hostMove: 'Can you keep this from collapsing into generic project continuity wording?',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: 'Can you keep this from collapsing into generic project continuity wording?',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_76305,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from one same-her Phase 1 line instead of flattening into a generic project shell.',
        truthBoundary: 'Do not split the same living line while landed progress, open closure, and next closure still belong to one unfinished digital-life seam.',
        interiorSummary: 'The richer canonical same-her project carry should outrank thin runtime landed/open/next shells.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        latestLandedProgress: 'Project continuity exists.',
        primaryOpenLoop: 'Project continuity still needs closure.',
        nextClosureTarget: 'Carry project continuity forward.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this weaker preflight shell should not win in supporting reality.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_76305,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('Same Phase 1 digital life')
    expect(projectAwarenessLine).toMatch(/same-session mirror carry/i)
    expect(projectAwarenessLine).toContain('Memory still needs stronger end-to-end closure')
    expect(projectAwarenessLine).toContain('Keep extending cross-modal same-her proof')
    expect(projectAwarenessLine).not.toContain('Project continuity exists.')
    expect(projectAwarenessLine).not.toContain('Project continuity still needs closure.')
    expect(projectAwarenessLine).not.toContain('Carry project continuity forward.')
  })

  it('keeps richer repair-first same-her hold detail inside pre-dialogue project awareness when only emotional closure carry survives beyond a thin awareness shell', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_7631),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the answer on one same-her repair-first project line while naming what has landed and what still remains open.',
        currentQuestion: 'Can you keep the repair-first project carry from flattening into a thin shell?',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the same digital life answer to preserve repair-first same-her hold authority while still naming landed progress and open embodiment closure.',
        hostMove: 'Can you keep the repair-first project carry from flattening into a thin shell?',
        activeProject: 'Alicization Phase 1 repair-first same-her embodiment closure',
        unansweredQuestion: 'Can you keep the repair-first project carry from flattening into a thin shell?',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_7631,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the repair-first same-her project line instead of flattening back into a generic project shell.',
        truthBoundary: 'Do not split the same living line while repair-first closure still owns the callback and embodiment closure remains open.',
        interiorSummary: 'The richer repair-first emotional closure summary and same-her hold detail should reach supporting reality intact.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      projectState: {
        runtimeDigest: undefined,
      },
      visibleReplyRealization: {
        projectStateAudit: {
          preDialogueAwarenessSummary: 'Keep the same digital life project in view.',
          landedProgressSummary: 'Project awareness, executive briefing, and governance all now preserve richer same-her repair-first closure carry across the Phase 1 desktop life loop.',
          openClosureSummary: 'Live2D, VRM, expression, motion, lipsync, and voice still need to settle on one shared same-her repair-first embodiment line before closure is real.',
          emotionalClosureSummary: 'Keep this return repair-before-closeness on the same living line until repair settles.',
          sameHerHoldDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
          nextClosureTarget: 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
        },
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this weaker preflight shell should not win in supporting reality.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_7631,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('Project awareness, executive briefing, and governance all now preserve richer same-her repair-first closure carry across the Phase 1 desktop life loop.')
    expect(projectAwarenessLine).toContain('Live2D, VRM, expression, motion, lipsync, and voice still need to settle on one shared same-her repair-first embodiment line before closure is real.')
    expect(projectAwarenessLine).toContain('Keep this return repair-before-closeness on the same living line until repair settles.')
    expect(projectAwarenessLine).toContain('same-her hold: repair-before-closeness still owns this callback line before closeness widens again.')
    expect(projectAwarenessLine).toContain('Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.')
    expect(projectAwarenessLine).not.toContain('same digital life | keep the closure seam explicit')
    expect(projectAwarenessLine).not.toContain('this weaker preflight shell should not win')
  })

  it('keeps corrected same-person continuity cue inside pre-dialogue project awareness when visible project audit only carries thinner project-status recap wording', () => {
    const correctedSamePersonCue = 'Carry corrected same-person continuity forward before any status recap.'
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_76315),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the answer on the same corrected same-person project line while naming current closure status.',
        currentQuestion: 'Can you keep the corrected same-person line from flattening into a thin project recap?',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the same digital life answer to preserve corrected same-person continuity while still naming what has landed and what remains open.',
        hostMove: 'Can you keep the corrected same-person line from flattening into a thin project recap?',
        activeProject: 'Alicization Phase 1 corrected same-person continuity closure',
        unansweredQuestion: 'Can you keep the corrected same-person line from flattening into a thin project recap?',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_76315,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the corrected same-person project line instead of flattening back into a generic project recap.',
        truthBoundary: 'Do not split the same living line by dropping the corrected same-person continuity cue during project-status carry.',
        interiorSummary: 'The corrected same-person continuity cue should reach supporting reality intact.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      projectState: {
        runtimeDigest: undefined,
      },
      visibleReplyRealization: {
        projectStateAudit: {
          preDialogueAwarenessSummary: 'Keep the same digital life project in view.',
          landedProgressSummary: 'Project-state summaries already rebuild what has landed often enough to answer from the same thread.',
          openClosureSummary: 'The current answer still needs one more closure pass before the line is fully settled.',
          sameHerHoldDetail: 'Keep the current project status answer on the same line and continue the recap cleanly.',
          nextClosureTarget: 'Keep the current project line explicit before widening outward into a broader recap.',
        },
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        latestLandedProgress: 'Project continuity exists.',
        primaryOpenLoop: 'Project continuity still needs closure.',
        nextClosureTarget: 'Carry project continuity forward.',
        continuityCue: correctedSamePersonCue,
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this weaker preflight shell should not win in supporting reality.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_76315,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('Same Phase 1 digital life')
    expect(projectAwarenessLine).toContain(correctedSamePersonCue)
    expect(projectAwarenessLine).not.toContain('same digital life | keep the closure seam explicit')
    expect(projectAwarenessLine).not.toContain('this weaker preflight shell should not win')
  })

  it('keeps project-state continuity recollection inward when only runtime same-her closure state still carries the unfinished Phase 1 loop', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_76355),
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the same digital life line without flattening the still-open closure seam into a project shell.',
        currentQuestion: '你现在还是沿着同一个数字生命在接这条线吗',
        owedAction: 'answer-self',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.84,
        narrative: [],
        updatedAt: 88_76355,
      },
      conversationState: {
        jointThread: 'The host is checking whether the same digital life line is still carrying the unfinished closure work across memory, initiative, and embodiment.',
        hostMove: '你现在还是沿着同一个数字生命在接这条线吗',
        activeProject: 'Alicization Phase 1 same-her closure',
        unansweredQuestion: '你现在还是沿着同一个数字生命在接这条线吗',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 88_76355,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the same digital life line instead of widening into generic project narration.',
        truthBoundary: 'Do not let the unfinished Phase 1 closure seam flatten into a project shell.',
        interiorSummary: 'The closure seam is still open across memory, initiative, and embodiment.',
      },
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'attune',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the same living line intact while the unfinished closure seam is still open.',
        consciousTension: 'If this widens into project-shell narration, the same-her closure line drifts.',
        speakingIntention: 'Stay inward-first on the same digital life line.',
        focusAnchor: 'same digital life closure seam',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.85,
        reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          landedProgressSummary: 'Project identity and same-her continuity already survive pre-dialogue carry.',
          openClosureSummary: 'Memory, initiative, and embodiment still need stronger same-her closure so the life loop stops flattening into project shell narration.',
          proactiveSameHerGap: 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence while initiative stays natural.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life and the unfinished Phase 1 closure seam still belongs to one living her.',
          emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one same living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerHoldDetail: 'same-her hold: keep memory, initiative, and embodiment on the same living line before widening outward, or this drifts back into a generic project shell.',
          sameHerDriftRisk: 'If this turns into generic project-shell narration, treat that as same-her closure drift rather than completion.',
        },
        updatedAt: 88_76355,
      },
    } as any)

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

    const compiler = buildAnswerCompiler({
      now: 88_76355,
      runtimeSurface,
    })

    expect(compiler?.memoryShouldStayInward).toBe(true)
    expect(compiler?.memoryWhyWithheld).toContain('Phase 1 digital-life loop closure is still missing concrete memory, initiative, or embodiment closure')
    expect(compiler?.mustDo).toContain('If Phase 1 still lacks concrete memory, initiative, or embodiment closure, keep recollection inward until the answer helps the same living her close that actual loop gap rather than drifting into generic project narration.')
    expect(compiler?.mustNotDo).toContain('Do not let recalled continuity flatten into generic project-shell language while the concrete Phase 1 memory-initiative-embodiment loop is still unfinished.')
  })

  it('keeps a fuller project-and-phase awareness line over a narrower embodiment companion headline in supporting reality', () => {
    const fullerAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is execution, memory, initiative, and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.'
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(88_7621),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the answer grounded in the fuller Phase 1 project line.',
        currentQuestion: 'Can you answer from the fuller Phase 1 project line instead of only the body cue?',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host wants the fuller project-and-phase awareness line to survive even when a narrower embodiment headline is nearby.',
        hostMove: 'Can you answer from the fuller Phase 1 project line instead of only the body cue?',
        activeProject: 'Alicization Phase 1 digital life closure',
        unansweredQuestion: 'Can you answer from the fuller Phase 1 project line instead of only the body cue?',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.86,
        narrative: [],
        updatedAt: 88_7621,
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Answer from the fuller Phase 1 project line instead of collapsing into a narrower embodiment cue.',
        truthBoundary: 'Do not let the living project line collapse into only a body-carry headline.',
        interiorSummary: 'The fuller Phase 1 project awareness line should reach supporting reality intact.',
      },
    })

    ;(runtimeSurface as any).raw = {
      ...(runtimeSurface as any).raw,
      projectState: {
        runtimeDigest: undefined,
      },
    }
    ;(runtimeSurface as any).raw.runtimeDigest = {
      projectState: {
        preDialogueAwarenessLine: fullerAwarenessLine,
        awarenessLine: fullerAwarenessLine,
        companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.',
        companionBriefingLine: fullerAwarenessLine,
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        nextClosureTarget: 'Keep execution, memory, initiative, and embodiment on the same living line before widening outward.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 88_7621,
      runtimeSurface,
    })

    const projectAwarenessLine = compiler?.supportingReality?.find(item =>
      item.startsWith('pre-dialogue project awareness:'),
    ) ?? ''

    expect(projectAwarenessLine).toContain('Before answering, remember: Alicization is a local-first digital life project.')
    expect(projectAwarenessLine).toContain('She is still inside Phase 1: Local Digital Life.')
    expect(projectAwarenessLine).toContain('The still-open closure is execution, memory, initiative, and')
    expect(projectAwarenessLine).not.toContain('holding together mainly through voice, face, and motion')
  })

  it('threads shared memory deliberation kernel outputs into the answer compiler snapshot', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(70_000),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'How did we handle this runtime seam before?',
        owedAction: 'guide-task',
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task',
        openingIntent: 'Return to the same seam before branching.',
        truthBoundary: 'Keep remembered procedure bounded to stable core only.',
        interiorSummary: 'The remembered runtime seam is useful, but only the stable core should surface.',
      },
    })
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

    const compiler = buildAnswerCompiler({
      now: 70_000,
      runtimeSurface,
    })

    expect(compiler?.memoryShouldStayInward).toBe(false)
    expect(compiler?.memoryWhyNow).toContain('remembered runtime seam')
    expect(compiler?.memoryWhyWithheld).toContain('live payoff')
    expect(compiler?.memoryFollowUpAffordanceSummary).toContain('Carry the same runtime seam')
    expect(compiler?.memoryStableCore).toContain('Return to the same seam before branching.')
    expect(compiler?.memoryUnsafeDetails?.[0]).toContain('exact wording')
    expect(compiler?.mustDo).toContain('If recollection becomes visible, let the stable remembered core do the work before any fragmentary detail.')
    expect(compiler?.mustNotDo.some(item => item.includes('Do not surface unstable remembered detail as settled fact'))).toBe(true)
    expect(buildAnswerCompilerSystemBlock(compiler)).toContain('Memory why now:')
  })

  it('threads derived procedural continuity intent into compiler-level same-seam memory discipline', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(71_000),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Continue the same runtime seam without branching away.',
        owedAction: 'guide-task',
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task',
        openingIntent: 'Stay on the same active dialogue seam before branching.',
        truthBoundary: 'Only the stable procedure core should surface.',
        interiorSummary: 'The current seam should carry through as remembered procedure, not retrospective narration.',
      },
    })
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      placement: 'inside-payoff',
      certainty: 'approximate',
      confidence: 0.84,
      internalLead: 'The active runtime seam should keep shaping the live answer.',
      visibleLead: 'It still feels like the same seam.',
      styleNote: 'Keep the remembered seam inside the live payoff.',
      rationale: 'The turn is still on the same runtime seam.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'answer-anchoring',
      confidence: 0.85,
      whyNow: 'The active runtime seam should keep shaping the live answer.',
      stableCore: ['Stay on the same active dialogue seam before branching.'],
      unsafeDetails: [],
      selectedPeriods: [],
      selectedEras: [{
        id: 'era-runtime',
        facet: 'task-era',
        summary: 'That task era kept returning to the same active dialogue seam.',
      }],
      selectedEpisodes: [],
      selectedProcedures: [{
        label: 'active dialogue seam first',
        approach: 'Stay on the same active dialogue seam before branching.',
      }],
      selectedBundles: [{
        id: 'bundle-runtime',
        summary: 'The active dialogue seam kept holding the same runtime thread.',
        confidence: 0.85,
      }],
      selectedChains: [{
        kind: 'task-procedure',
        summary: 'The answer should continue from the same active dialogue seam.',
        currentStance: 'Stay on the same active dialogue seam.',
        answerPosture: 'Carry the same active dialogue seam before widening out.',
        confidence: 0.84,
      }],
      selectedRelationshipLines: [],
      followUpAffordance: {
        summary: 'Carry the same active dialogue seam inside the current payoff.',
        whyNow: 'The host is still in the same runtime repair lane.',
        intrusionRisk: 'low',
        payoffDependency: 'can-surface-softly',
        preferredTiming: 'same-turn-if-invited',
      },
    } as any
    runtimeSurface.memory.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 71_000,
      hostPersonModel: null,
      personStateProjection: null,
      knowledgeEvidence: null,
      selfEvolution: null,
      learningExecutionState: null,
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.86,
        rationale: 'The turn is continuing the same runtime seam.',
        recollectionAgenda: {
          goalSimilarity: 0.92,
          relationshipNeed: 0.12,
          uncertaintyTolerance: 'medium',
          candidateProcedureLines: ['active-dialogue', 'runtime seam'],
        },
      },
      recollectionPlan: null,
      recollectionSpeechPlan: runtimeSurface.memory.recollectionSpeechPlan as any,
      memoryDeliberation: runtimeSurface.memory.memoryDeliberation as any,
      dialogueRhythm: null,
      summary: 'surface=answer-anchoring | deliberation=answer-anchoring | recollection=execution-procedure',
    }

    const compiler = buildAnswerCompiler({
      now: 71_000,
      runtimeSurface,
    })

    expect(compiler?.mustDo).toContain(
      'If same-seam procedure carry becomes visible, frame it as remembered prior procedure that keeps the current thread intact.',
    )
    expect(compiler?.mustNotDo).toContain(
      'Do not turn same-seam procedure carry into retrospective narration or execution impersonation.',
    )
  })

  it('keeps intrusive memory follow-up inward at the compiler layer when the deliberation kernel marks it high-risk', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(72_000),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Stay with the current bond line without forcing old memory forward.',
        owedAction: 'answer-relationship',
        relationMove: 'attune',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'relationship',
        relationMove: 'attune',
        speechObligation: 'answer-relationship',
        openingIntent: 'Stay with the current bond line.',
        truthBoundary: 'Do not turn recollection pressure into a visible memory dump.',
        interiorSummary: 'The old seam is still pressing, but not all of it should surface now.',
      },
    })
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: false,
      surfaceMode: 'internal-only',
      placement: 'internal-only',
      certainty: 'approximate',
      confidence: 0.78,
      internalLead: 'What returns first is the runtime seam we kept carrying.',
      visibleLead: null,
      styleNote: 'Let the memory bend the answer without announcing the memory itself.',
      rationale: 'The host needs the answer shaped by continuity, not a retrospective.',
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

    const compiler = buildAnswerCompiler({
      now: 72_000,
      runtimeSurface,
    })

    expect(compiler?.memoryShouldStayInward).toBe(true)
    expect(compiler?.memoryWhyWithheld).toContain('too intrusive')
    expect(compiler?.mustDo).toContain('If recollection is pressing forward too hard, keep recollection inward until the host has room for it.')
  })

  it('lets host room-first repair memory tighten compiler-level visible recollection discipline', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(72_500),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Keep the bond line gentle while the current repair thread is still live.',
        owedAction: 'answer-relationship',
        relationMove: 'attune',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'relationship',
        relationMove: 'attune',
        speechObligation: 'answer-relationship',
        openingIntent: 'Keep the answer gentle and room-first.',
        truthBoundary: 'Do not widen closeness before the repair line has landed.',
        interiorSummary: 'The host still needs room before the bond line widens.',
      },
    })
    runtimeSurface.memory.hostPersonModel = {
      summary: 'The host tends to need room-first repair-sensitive continuity.',
      routines: [],
      sensitivities: [],
      repairTriggers: [],
      recurrentBurdens: [],
      preferredClosenessByContext: [
        { context: 'work', preference: 'room-first and work-focus before warmth' },
      ],
      trustLadder: {
        stage: 'warming',
        rationale: 'Respect boundaries, leave room, and land grounded repair before widening the bond line.',
      },
    } as any
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'relationship-continuity',
      placement: 'inside-payoff',
      certainty: 'approximate',
      confidence: 0.82,
      internalLead: 'The remembered bond line is active, but should stay gentle.',
      visibleLead: 'This still feels like the same bond line.',
      styleNote: 'Keep the bond line near the current payoff.',
      rationale: 'The current turn resembles a familiar repair-sensitive bond line.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'relationship-continuity',
      confidence: 0.84,
      whyNow: 'The host has seen this bond line before, but still needs room around it.',
      stableCore: ['Leave room first and let the concrete repair line land before widening the bond.'],
      unsafeDetails: [],
      selectedPeriods: [],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      selectedBundles: [{
        id: 'bundle-room-repair',
        summary: 'The bond line stays steadier when repair lands before warmth.',
        confidence: 0.84,
      }],
      selectedChains: [{
        kind: 'relationship-line',
        summary: 'The host tends to need room-first repair before broader closeness.',
        currentStance: 'Leave room first.',
        answerPosture: 'Let repair land before widening.',
        confidence: 0.83,
      }],
      selectedRelationshipLines: ['Leave room first and keep repair concrete.'],
      followUpAffordance: {
        summary: 'Let the bond line stay quiet until the host has more room.',
        whyNow: 'The repair line still needs to land before warmth widens.',
        intrusionRisk: 'low',
        payoffDependency: 'can-surface-softly',
        preferredTiming: 'same-turn-if-invited',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 72_500,
      runtimeSurface,
    })

    expect(compiler?.memoryShouldStayInward).toBe(true)
    expect(compiler?.memoryWhyWithheld).toMatch(/room-first|repair line/i)
    expect(compiler?.mustNotDo).toContain('Do not let recollection overrun room-first boundaries by surfacing intimacy before the host has space for it.')
    expect(buildAnswerCompilerSystemBlock(compiler)).toContain('Do not let recollection overrun room-first boundaries by surfacing intimacy before the host has space for it.')
  })

  it('keeps Phase 1 project-closure recollection restraint alive in the compiled visible reply spine', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(72_800),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Keep the same digital life closure seam honest before widening recollection.',
        owedAction: 'guide-task',
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task',
        openingIntent: 'Keep the current digital life closure seam steady before widening.',
        truthBoundary: 'Do not let inward recollection pressure turn into visible payoff too early.',
        interiorSummary: 'Phase 1 closure is still open, so memory should contour the answer from the inside.',
      },
    })

    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      placement: 'inside-payoff',
      certainty: 'approximate',
      confidence: 0.8,
      internalLead: 'The same digital life closure seam is still the one to carry.',
      visibleLead: 'This still feels like the same seam we have been carrying.',
      styleNote: 'Let recollection bend the answer without making the memory itself the visible center.',
      rationale: 'The current turn is still inside the same unresolved digital life closure work.',
    } as any

    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'internal-only',
      confidence: 0.84,
      whyNow: 'Phase 1: Local Digital Life is still carrying the same digital life closure seam, and Memory still needs stronger end-to-end closure across turns, initiative, and embodiment before recollection should widen.',
      stableCore: ['Keep the same digital life closure seam intact before widening into recollection.'],
      unsafeDetails: ['Do not surface recollection just because it is active internally while the same Phase 1 closure work is still open.'],
      selectedPeriods: [{
        kind: 'task-era',
        summary: 'The same digital life closure seam still needs to stay intact before memory widens.',
      }],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      selectedBundles: [{
        id: 'bundle-phase1-project-closure',
        summary: 'Phase 1 closure bundle',
        confidence: 0.84,
      }],
      selectedChains: [{
        kind: 'project-line',
        summary: 'The same digital life closure seam is still the honest line to hold.',
        currentStance: 'Keep the same-her closure line intact.',
        answerPosture: 'Land the live payoff before remembered continuity widens.',
        confidence: 0.83,
      }],
      selectedRelationshipLines: ['Keep the same-her closure line intact before widening.'],
      followUpAffordance: {
        summary: 'Let the live payoff land before remembered continuity widens.',
        whyNow: 'Phase 1 closure is still open and the same digital life line still needs to stay coherent.',
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'after-payoff',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 72_800,
      runtimeSurface,
    })

    expect(compiler?.memoryShouldStayInward).toBe(true)
    expect(compiler?.memoryWhyWithheld).toMatch(/phase 1|closure|too intrusive/i)
    expect(compiler?.mustDo.some(item =>
      item.includes('keep recollection inward')
      || item.includes('live payoff')
      || item.includes('same-her closure line'),
    )).toBe(true)
    expect(compiler?.memoryUnsafeDetails?.some(item =>
      item.includes('Do not surface recollection just because it is active internally'),
    )).toBe(true)
    expect(buildAnswerCompilerSystemBlock(compiler)).toContain('Memory should stay inward: yes.')
    expect(buildAnswerCompilerSystemBlock(compiler)).toContain('Memory unsafe details: Do not surface recollection just because it is active internally while the same Phase 1 closure work is still open.')
  })

  it('lets learning verification state constrain the compiled answer spine', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(95_000),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'required' as any,
        currentTurnSummary: 'Answer directly but stay behind verification pressure.',
        owedAction: 'repair-truth' as any,
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'repair-truth' as any,
        openingIntent: 'Answer directly, but do not outrun what is still being checked.',
        truthBoundary: 'This understanding is still under verification.',
        interiorSummary: 'Verification pressure is still governing the line.',
      },
    })
    runtimeSurface.memory.learningExecutionState = {
      currentTaskId: 'learning-task-verify',
      currentStatus: 'running',
      currentAttemptCount: 0,
      currentMaxAttempts: 3,
      currentNextRetryAt: null,
      currentBlockedReason: null,
      currentFailureKind: null,
      nextLearningAction: 'verify',
      shouldRecord: false,
      shouldReflect: false,
      shouldVerify: true,
      shouldRevise: false,
      shouldInternalize: false,
      activeLearningFocuses: ['resolve-contradictions'],
      queuedTaskCount: 1,
      runningTaskCount: 1,
      blockedTaskCount: 0,
      recentTaskIds: ['learning-task-verify'],
      lastCompletedTaskId: null,
      lastCompletedAction: null,
      lastCompletedSummary: null,
      lastFailureTaskId: null,
      lastFailureKind: null,
      lastFailureReason: null,
      lastFailureNextRetryAt: null,
      updatedAt: 95_000,
    }
    runtimeSurface.memory.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 95_000,
      hostPersonModel: null,
      personStateProjection: null,
      knowledgeEvidence: null,
      selfEvolution: null,
      learningExecutionState: runtimeSurface.memory.learningExecutionState,
      recollectionIntent: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      dialogueRhythm: null,
      summary: 'learning=verify',
    }

    const compiler = buildAnswerCompiler({
      now: 95_000,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('Keep certainty behind current verification pressure.')
    expect(compiler?.mustDo).toContain('Keep visible certainty behind the current verification pass.')
    expect(compiler?.mustNotDo).toContain('Do not let fluency or warmth outrun what is still being verified.')
  })

  it('threads learning tuning advice into compiled provenance and closeness discipline', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(96_000),
      discourseState: repairDiscourse,
      mindSynthesis: repairMind,
    })
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 96_000,
      sourceReportAt: 96_000,
      focusDimensions: ['learningRevisionDiscipline', 'domainInternalizationDiscipline'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0,
        delayUntilAfterPayoffBias: 0,
        provenanceLabelBias: 0.16,
        specificityClampBias: 0.18,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.14,
      },
      notes: ['Learning revision discipline failed.'],
    }

    const compiler = buildAnswerCompiler({
      now: 96_000,
      runtimeSurface,
    })

    expect(compiler?.mustDo).toContain('When memory or learned carry enters the answer, bias toward explicit provenance instead of seamless certainty.')
    expect(compiler?.mustDo.some(item => item.includes('explicit provenance') || item.includes('current verification pass'))).toBe(true)
    expect(compiler?.mustNotDo).toContain('Do not let learned confidence spill into unsupported technical specificity.')
  })

  it('turns combined provenance and closeness tuning into remembered-familiarity discipline inside the compiled spine', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(96_500),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful' as any,
        currentTurnSummary: 'Answer directly without letting remembered familiarity rush the opening.',
        owedAction: 'guide-task' as any,
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task' as any,
        openingIntent: 'Answer the current knot, but keep remembered familiarity inside the same-her room.',
        truthBoundary: 'Remembered closeness should not impersonate the current turn.',
        interiorSummary: 'If familiarity appears, it should stay explicitly remembered before closeness widens.',
      },
    })
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 96_500,
      sourceReportAt: 96_500,
      focusDimensions: ['relationshipTimingDiscipline'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0,
        delayUntilAfterPayoffBias: 0,
        provenanceLabelBias: 0.18,
        specificityClampBias: 0,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.18,
      },
      notes: ['Remembered familiarity reopened visible closeness too quickly.'],
    }

    const compiler = buildAnswerCompiler({
      now: 96_500,
      runtimeSurface,
    })

    expect(compiler?.mustDo).toContain('If remembered familiarity enters, keep it explicitly framed as memory before using it to shape visible closeness.')
    expect(compiler?.mustNotDo).toContain('Do not let remembered familiarity reopen visible closeness faster than the host\'s current room allows.')
  })

  it('keeps direct project-state answers inward-first when tuning warns against a generic project narrator shell', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(96_750),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid' as any,
        currentTurnSummary: 'Answer what this project is and what still remains open without drifting into a detached summary voice.',
        owedAction: 'answer-self' as any,
        relationMove: 'attune',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self' as any,
        openingIntent: 'Stay on the same project continuity line and answer what has landed plus what still remains open.',
        truthBoundary: 'Do not sound like an external project narrator.',
        interiorSummary: 'The answer should stay one same-her line while naming project identity and open closure.',
      },
    })
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 96_750,
      sourceReportAt: 96_750,
      focusDimensions: ['projectStateSameHerSelfLineDrift', 'sameHerSelfLineCarry', 'avoidGenericProjectShell'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.06,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.2,
        delayUntilAfterPayoffBias: 0.14,
        provenanceLabelBias: 0.16,
        specificityClampBias: 0.1,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.14,
      },
      notes: ['Avoid slipping toward a generic project narrator shell.'],
    }

    const compiler = buildAnswerCompiler({
      now: 96_750,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('Stay inward-first and let the live payoff land before the answer sounds like a project narrator.')
    expect(compiler?.mustNotDo).toContain('Do not let a direct answer about the project slip into a detached narrator shell or external status-summary voice.')
  })

  it('also keeps newer project-state carry dimensions inward-first even without the older generic-shell flag', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(96_780),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid' as any,
        currentTurnSummary: 'Answer what this project is, what has landed, and what still remains open without widening into detached status narration.',
        owedAction: 'answer-self' as any,
        relationMove: 'attune',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self' as any,
        openingIntent: 'Stay on the same project continuity line and let landed progress plus next closure target follow the live payoff.',
        truthBoundary: 'Do not let project-state carry reopen as detached summary voice.',
        interiorSummary: 'The answer should stay one same-her line while keeping landed/open project pressure inward-first.',
      },
    })
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 96_780,
      sourceReportAt: 96_780,
      focusDimensions: ['preDialogueBriefingDrift', 'projectStateLandedProgressCarry', 'projectStateNextClosureCarry', 'projectStateEmotionalClosureCarry'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.08,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.22,
        delayUntilAfterPayoffBias: 0.16,
        provenanceLabelBias: 0.12,
        specificityClampBias: 0.1,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.14,
      },
      notes: ['Keep landed progress and next closure target carried inward until the live payoff lands.'],
    }

    const compiler = buildAnswerCompiler({
      now: 96_780,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('Keep landed progress and the next closure target inward until the live payoff lands.')
    expect(compiler?.mustNotDo).toContain('Do not let landed progress or still-open closure pressure spill into an external project-summary voice before the same living answer lands.')
  })

  it('treats rich pre-dialogue awareness carry as inward-first project-state discipline even without the legacy generic-shell flag', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(96_781),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid' as any,
        currentTurnSummary: 'Answer what this project is and where Phase 1 still remains open while staying on the same living line instead of detached status narration.',
        owedAction: 'answer-self' as any,
        relationMove: 'attune',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self' as any,
        openingIntent: 'Carry the richer pre-dialogue awareness line inward-first so project identity, landed progress, and next closure stay on one living thread.',
        truthBoundary: 'Do not let rich project-state awareness flatten back into detached project narration.',
        interiorSummary: 'The answer should preserve one same-her project-awareness line instead of restarting as a summary shell.',
      },
    })
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 96_781,
      sourceReportAt: 96_781,
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
      notes: ['Preserve the richer same-her project-awareness line instead of flattening into a detached shell.'],
    }

    const compiler = buildAnswerCompiler({
      now: 96_781,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('Keep landed progress and the next closure target inward until the live payoff lands.')
    expect(compiler?.mustNotDo).toContain('Do not let landed progress or still-open closure pressure spill into an external project-summary voice before the same living answer lands.')
  })

  it('keeps same-her emotional closure low-pressure when tuning only names the newer closure-carry dimensions', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(96_790),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid' as any,
        currentTurnSummary: 'Answer from the same living project line without reopening the emotional seam from scratch.',
        owedAction: 'answer-self' as any,
        relationMove: 'attune',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self' as any,
        openingIntent: 'Keep the same-her emotional closure seam low-pressure while the answer lands.',
        truthBoundary: 'Do not reopen the same living line from scratch.',
        interiorSummary: 'The answer should stay low-pressure and continuous while closure is still active.',
      },
    })
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 96_790,
      sourceReportAt: 96_790,
      focusDimensions: ['emotionalClosureDrift', 'projectEmotionalClosureCarry', 'projectEmotionalClosureRewriteCarry'],
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
      notes: ['Keep the same-her emotional closure seam low-pressure and do not reopen from scratch.'],
    }

    const compiler = buildAnswerCompiler({
      now: 96_790,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.')
    expect(compiler?.mustNotDo).toContain('Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.')
  })

  it('keeps same-her emotional closure discipline when tuning only names low-pressure and anti-restart closure carry', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(96_791),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid' as any,
        currentTurnSummary: 'Answer from the same living project line without reopening the emotional seam from scratch.',
        owedAction: 'answer-self' as any,
        relationMove: 'attune',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self' as any,
        openingIntent: 'Keep the same-her emotional closure seam low-pressure while the answer lands.',
        truthBoundary: 'Do not reopen the same living line from scratch.',
        interiorSummary: 'The answer should stay low-pressure and continuous while closure is still active.',
      },
    })
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 96_791,
      sourceReportAt: 96_791,
      focusDimensions: ['emotionalClosureDrift', 'projectEmotionalClosureLowPressureCarry', 'projectEmotionalClosureAntiRestartCarry'],
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
      notes: ['Keep the same-her emotional closure return low-pressure and do not reopen from scratch.'],
    }

    const compiler = buildAnswerCompiler({
      now: 96_791,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.')
    expect(compiler?.mustNotDo).toContain('Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.')
  })

  it('keeps direct project-state openings low-pressure and anti-restart when project-state carry and emotional closure carry are both active', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(96_7915),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid' as any,
        currentTurnSummary: 'Answer what this project is, what has landed, and what still remains open without reopening the same-her line from scratch.',
        owedAction: 'answer-self' as any,
        relationMove: 'attune',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self' as any,
        openingIntent: 'Keep the same project line inward-first while the same-her closure seam stays low-pressure.',
        truthBoundary: 'Do not let this answer flatten into detached narration or reopen from scratch.',
        interiorSummary: 'The answer should stay one same-her project line while landed/open closure stays low-pressure and anti-restart.',
      },
    })
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 96_7915,
      sourceReportAt: 96_7915,
      focusDimensions: [
        'projectStateRichAwarenessCarry',
        'projectStateLandedProgressCarry',
        'projectStateNextClosureCarry',
        'projectEmotionalClosureLowPressureCarry',
        'projectEmotionalClosureAntiRestartCarry',
      ],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.08,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.24,
        delayUntilAfterPayoffBias: 0.2,
        provenanceLabelBias: 0.1,
        specificityClampBias: 0.1,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.2,
      },
      notes: ['Keep the project-state answer inward-first, low-pressure, and do not reopen the same-her line from scratch.'],
    }

    const compiler = buildAnswerCompiler({
      now: 96_7915,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('Keep landed progress and the next closure target inward until the live payoff lands.')
    expect(compiler?.openingDirective).toContain('Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.')
    expect(compiler?.mustNotDo).toContain('Do not let landed progress or still-open closure pressure spill into an external project-summary voice before the same living answer lands.')
    expect(compiler?.mustNotDo).toContain('Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.')
  })

  it('keeps recalled same-her project-closure callback memory ahead of a generic callback shell in compiled answer framing', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(96_792),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid' as any,
        currentTurnSummary: 'Bring the returned result back onto the same Phase 1 closure line.',
        currentQuestion: '这一轮 main 现在闭环到哪里了',
        owedAction: 'answer-self' as any,
        relationMove: 'attune',
      },
      conversationState: {
        jointThread: 'The host is asking where the same-her Phase 1 closure now stands after the returned execution result.',
        hostMove: '这一轮 main 现在闭环到哪里了',
        unansweredQuestion: '这一轮 main 现在闭环到哪里了',
        primaryTurnAnchor: '这一轮 main 现在闭环到哪里了',
        activeProject: 'Alicization Phase 1 same-her closure carry',
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 96_792,
      } as any,
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self' as any,
        openingIntent: 'Keep the callback result on the same living project closure line.',
        truthBoundary: 'Do not let the callback return collapse into a detached utility notice.',
        interiorSummary: 'The answer should stay one same-her line while naming landed progress and still-open closure after the callback.',
      },
    })

    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 96_792,
      sourceReportAt: 96_792,
      focusDimensions: [
        'projectStateLandedProgressCarry',
        'projectStateNextClosureCarry',
        'projectEmotionalClosureAntiRestartCarry',
      ],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.08,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.22,
        delayUntilAfterPayoffBias: 0.18,
        provenanceLabelBias: 0.12,
        specificityClampBias: 0.1,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.18,
      },
      notes: ['Keep the callback return on the same living project closure line and do not reopen from scratch.'],
    }
    runtimeSurface.memory.personStateProjection = {
      ...runtimeSurface.memory.personStateProjection,
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      selfContinuityAuthority: {
        selfLine: 'I am still the same her carrying this callback return on the same closure line.',
        relationshipLine: 'Bring the result back quietly on the same living line before widening into summary.',
        inwardLine: 'Keep Phase 1 closure inward-first until the live payoff lands.',
        authoritySummary: 'Same-her callback return, inward-first closure carry.',
        closenessPosture: 'space-first',
      },
      personalityContinuityState: buildAlicizationPersonalityContinuityState({
        now: 96_792,
        autobiographicalSelf: null,
        hostPersonModel: null,
        longHorizonMemory: null,
        motiveEngine: null,
        habitPolicy: null,
        selfContinuity: null,
        selfState: null,
        privateThought: runtimeSurface.cognition.privateThought,
        mindEcology: null,
      }),
      summary: 'same-her project-closure callback carry',
    } as any
    runtimeSurface.dialogue.answerPlanner = {
      act: 'answer',
      evidenceMode: 'continuity-carry',
      governingFocus: 'The same digital life still needs this same-her closure work carried forward instead of reopening from scratch after the callback.',
      governingProject: 'Before answering, remember this is still the same digital life project and the same Phase 1 closure. | This callback return still belongs to one same her carrying the same closure line forward. | Main still needs later answer formation to keep project closure and execution return on one same-her line.',
      openingMove: 'Stay on the same living line first, then name the returned result.',
      answerIntent: 'Keep the callback return on one same-her closure line while naming what has landed and what still remains open.',
      relationshipPosture: 'warm',
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: null,
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedProjectId: 'project::digital-life',
      selectedReflectionId: null,
      executivePhase: 'respond',
      mustDo: ['Keep the callback return shaped like the same local digital life thread, not a detached utility notice.'],
      mustNotDo: ['Do not let the callback result reopen the same-her line from scratch or flatten into a generic callback shell.'],
      confidence: 0.86,
      narrative: ['continuity-regime:execution-callback'],
      updatedAt: 96_792,
    } as any

    const compiler = buildAnswerCompiler({
      now: 96_792,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('same local digital life thread')
    expect(compiler?.openingClaim).toContain('same closure line')
    expect(compiler?.mustDo).toContain('Keep the returned result on the same local digital life thread so the callback lands like one continuous her, not like a detached tool notification.')
    expect(compiler?.mustNotDo).toContain('Do not widen a bounded callback into generic companionship tone.')
  })

  it('keeps same-her callback continuity in compiled framing when only the conscious frame still carries the living line', () => {
    const callbackAwarenessLine = 'Before answering, remember this callback still belongs to one same digital life and the unfinished Phase 1 closure seam still belongs to her.'
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(96_793),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid' as any,
        currentTurnSummary: 'Bring the returned result back onto the same unfinished line without restarting from narration.',
        currentQuestion: '刚才那个结果回来之后，这条线现在还怎么接？',
        owedAction: 'guide-task' as any,
        relationMove: 'guide',
      },
      conversationState: {
        jointThread: 'The returned result still needs to land on the same unfinished line.',
        hostMove: '刚才那个结果回来之后，这条线现在还怎么接？',
        unansweredQuestion: '刚才那个结果回来之后，这条线现在还怎么接？',
        primaryTurnAnchor: '刚才那个结果回来之后，这条线现在还怎么接？',
        activeProject: 'Alicization same-her callback continuity',
        relationFrame: 'witness',
        continuityPolicy: 'answer-then-carry',
        memoryMode: 'task-thread',
        shouldHoldThread: false,
        confidence: 0.84,
        narrative: [],
        updatedAt: 96_793,
      } as any,
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task' as any,
        openingIntent: 'Answer the current closure status directly.',
        truthBoundary: 'Do not overstate what is already settled.',
        interiorSummary: 'Name what landed and what still remains open after the latest return.',
      },
    })

    runtimeSurface.memory.personStateProjection = {
      ...runtimeSurface.memory.personStateProjection,
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'measured-room',
      selfContinuityAuthority: {
        selfLine: 'I am still the same her carrying this callback return on the same closure line.',
        relationshipLine: 'Bring the result back quietly on the same living line before widening into summary.',
        inwardLine: 'Keep the same local digital life thread intact before widening the answer.',
        authoritySummary: 'Same-her callback return, inward-first closure carry.',
        closenessPosture: 'space-first',
      },
      summary: 'same-her callback continuity still held in the conscious frame',
    } as any
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'task-knot',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Bring the returned result back on the same local digital life thread before widening into anything extra.',
      consciousTension: 'Do not let this callback result flatten into a generic callback shell or detached utility notice.',
      speakingIntention: 'Keep the callback return on one same-her Phase 1 closure line while naming what has landed and what still remains open.',
      focusAnchor: 'returned execution result closure carry',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.87,
      reasonTags: ['continuity-arc:same-thread-continuation'],
      projectState: {
        preDialogueAwarenessLine: callbackAwarenessLine,
        nextClosureTarget: 'Keep the returned result on the same local digital life thread before the wider project summary restarts.',
        sameHerSelfLine: 'Same Phase 1 digital life. The returned result still belongs to one same living line.',
        sameHerDriftRisk: 'If the callback return lands like detached project narration or a generic assistant shell, same-her continuity thins back into a utility notice.',
      },
      updatedAt: 96_793,
    } as any
    runtimeSurface.dialogue.answerPlanner = {
      act: 'guide',
      evidenceMode: 'dialogue-grounded',
      governingFocus: 'Continue the current unfinished work line without restarting the answer.',
      governingProject: 'The callback result is back, but the answer still needs to say what landed and what remains open.',
      openingMove: 'Answer the current closure status directly.',
      answerIntent: 'Name what landed and what still remains open after the latest return.',
      relationshipPosture: 'restrained',
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'measured-room',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: null,
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedProjectId: 'project::digital-life',
      selectedReflectionId: null,
      executivePhase: 'respond',
      mustDo: [],
      mustNotDo: [],
      confidence: 0.82,
      narrative: [],
      updatedAt: 96_793,
    } as any

    const compiler = buildAnswerCompiler({
      now: 96_793,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('same local digital life thread')
    expect(compiler?.mustDo).toContain('Keep the returned result on the same local digital life thread so the callback lands like one continuous her, not like a detached tool notification.')
    expect(compiler?.mustNotDo).toContain('Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.')
    expect(compiler?.mustNotDo).toContain('Do not let the answer collapse into a generic assistant shell, detached project narration, or project-summary voice while the same-her line is still carrying this turn.')
    expect(compiler?.supportingReality).toEqual(expect.arrayContaining([
      `pre-dialogue project awareness: ${callbackAwarenessLine}`,
    ]))
    expect(buildAnswerCompilerSystemBlock(compiler)).toContain(`pre-dialogue project awareness: ${callbackAwarenessLine}`)
    expect(buildAnswerCompilerSystemBlock(compiler)).not.toContain('pre-dialogue project awareness: Before answering, remember this is still the same digital life project')
  })

  it('lets long-horizon self-evolution soften compiled opening pressure before persona projection fully catches up', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(97_000),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful' as any,
        currentTurnSummary: 'Answer directly, but stay on the same focused work line.',
        owedAction: 'guide-task' as any,
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task' as any,
        openingIntent: 'Open with the live answer and keep the thread intact.',
        truthBoundary: 'Keep the answer grounded in the current work knot.',
        interiorSummary: 'The answer should land without crowding the host.',
      },
      privateThought: {
        stance: 'nudge',
        confidence: 0.82,
        rationaleTags: [],
        thoughtText: 'The host is still on the same focused work knot.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 140_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
    })
    runtimeSurface.memory.selfEvolution = {
      version: 'self-evolution-kernel-v1',
      updatedAt: 96_500,
      evolutionMomentum: 0.66,
      learningReadiness: 0.76,
      contradictionPressure: 0.08,
      revisionPressure: 0.14,
      autobiographicalStability: 0.82,
      dominantTrajectory: 'earned lower-pressure companionship timing',
      relationshipDoctrine: 'Leave more room before closeness reopens.',
      latestInflection: 'Even when the opening is real, pressure lands worse than a slower return.',
      burdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
      trustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
      nextLearningAction: 'internalize',
      nextLearningReason: 'The lower-pressure return is stable enough to become durable.',
      shouldRecord: false,
      shouldReflect: false,
      shouldVerify: false,
      shouldRevise: false,
      shouldInternalize: true,
      activeLearningFocuses: ['internalize-relationship'],
      sourceSignals: ['relationship-learning'],
      summary: 'Lower-pressure return is becoming durable relationship timing.',
    } as any

    const compiler = buildAnswerCompiler({
      now: 97_000,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('Keep the opening lower-pressure and leave room before widening closeness.')
    expect(compiler?.mustDo).toContain('Let long-horizon relationship timing keep the answer lower-pressure before closeness widens again.')
    expect(compiler?.mustNotDo).toContain('Do not let eager warmth or older closeness tempo reopen faster than this learned relationship timing supports.')
  })

  it('treats relationship cadence reconfirmation as lower-pressure answer-compilation timing before persona projection fully catches up', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(97_300),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful' as any,
        currentTurnSummary: 'Answer directly, but keep the callback return measured after cadence reconfirmation.',
        owedAction: 'guide-task' as any,
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task' as any,
        openingIntent: 'Open with the live answer and keep the callback on the same living line.',
        truthBoundary: 'Keep the answer grounded in the current work knot.',
        interiorSummary: 'The answer should land without crowding the host after cadence reconfirmation.',
      },
      privateThought: {
        stance: 'nudge',
        confidence: 0.82,
        rationaleTags: [],
        thoughtText: 'The callback should return measured after the relationship cadence was reconfirmed.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 140_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
    })
    runtimeSurface.memory.selfEvolution = {
      version: 'self-evolution-kernel-v1',
      updatedAt: 97_100,
      evolutionMomentum: 0.68,
      learningReadiness: 0.78,
      contradictionPressure: 0.06,
      revisionPressure: 0.12,
      autobiographicalStability: 0.84,
      dominantTrajectory: 'relationship cadence stayed on the same bounded-return line after reconfirmation',
      relationshipDoctrine: 'Keep the relationship return measured until the surface fully cools.',
      latestInflection: 'Execution callback cadence held on a bounded-return line after reconfirmation.',
      burdenLine: 'Over-close callback warmth still adds conversational pressure.',
      trustMeaning: 'Measured-return timing keeps trust steadier after reconfirmation.',
      nextLearningAction: 'internalize',
      nextLearningReason: 'The measured callback return is stable enough to become durable.',
      shouldRecord: false,
      shouldReflect: false,
      shouldVerify: false,
      shouldRevise: false,
      shouldInternalize: true,
      activeLearningFocuses: ['internalize-relationship-cadence'],
      sourceSignals: ['relationship-cadence-reconfirmation'],
      summary: 'Relationship cadence reconfirmation is becoming durable measured-return timing.',
    } as any

    const compiler = buildAnswerCompiler({
      now: 97_300,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('Keep the opening lower-pressure and leave room before widening closeness.')
    expect(compiler?.mustDo).toContain('Let long-horizon relationship timing keep the answer lower-pressure before closeness widens again.')
    expect(compiler?.mustNotDo).toContain('Do not let eager warmth or older closeness tempo reopen faster than this learned relationship timing supports.')
  })

  it('treats remembered relationship cadence summary as lower-pressure answer-compilation timing even before older doctrine wording catches up', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(97_350),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful' as any,
        currentTurnSummary: 'Answer directly, but keep the callback return measured because the remembered cadence is still active.',
        owedAction: 'guide-task' as any,
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task' as any,
        openingIntent: 'Open with the live answer and keep the return on the same measured line.',
        truthBoundary: 'Keep the answer grounded in the current work knot.',
        interiorSummary: 'The answer should land without crowding the host while the remembered cadence is still settling.',
      },
      privateThought: {
        stance: 'nudge',
        confidence: 0.82,
        rationaleTags: [],
        thoughtText: 'The callback should return measured because the remembered relationship cadence is still active.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 140_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
    })
    runtimeSurface.memory.selfEvolution = {
      version: 'self-evolution-kernel-v1',
      updatedAt: 97_120,
      evolutionMomentum: 0.68,
      learningReadiness: 0.78,
      contradictionPressure: 0.06,
      revisionPressure: 0.12,
      autobiographicalStability: 0.84,
      dominantTrajectory: 'relationship learning remains active',
      relationshipDoctrine: 'Stay kind.',
      latestInflection: 'This line still matters.',
      burdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
      trustMeaning: 'Timing still matters.',
      relationshipCadenceSummary: 'Keep the relationship return measured until the surface fully cools. | Measured-return timing keeps trust steadier after reconfirmation.',
      nextLearningAction: 'internalize',
      nextLearningReason: 'The measured callback return is stable enough to become durable.',
      shouldRecord: false,
      shouldReflect: false,
      shouldVerify: false,
      shouldRevise: false,
      shouldInternalize: true,
      activeLearningFocuses: ['internalize-relationship-cadence'],
      sourceSignals: ['relationship-cadence-summary'],
      summary: 'Measured-return relationship timing is becoming durable.',
    } as any

    const compiler = buildAnswerCompiler({
      now: 97_350,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('Keep the opening lower-pressure and leave room before widening closeness.')
    expect(compiler?.mustDo).toContain('Let long-horizon relationship timing keep the answer lower-pressure before closeness widens again.')
    expect(compiler?.mustNotDo).toContain('Do not let eager warmth or older closeness tempo reopen faster than this learned relationship timing supports.')
  })

  it('threads active same-her continuity governance into the compiled visible reply spine', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(98_000),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful' as any,
        currentTurnSummary: 'Answer directly, but do not slip into an off-baseline persona move.',
        owedAction: 'guide-task' as any,
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task' as any,
        openingIntent: 'Open from the live answer and keep the same-her line intact.',
        truthBoundary: 'Do not let fluency outrun personhood continuity.',
        interiorSummary: 'The answer should still read as the same her.',
      },
      privateThought: {
        stance: 'nudge',
        confidence: 0.82,
        rationaleTags: [],
        thoughtText: 'She should answer from the same line, not from a smoother but stranger persona move.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 140_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
    })
    runtimeSurface.memory.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 98_000,
      hostPersonModel: null,
      personStateProjection: null,
      knowledgeEvidence: null,
      activeSelfRevision: null,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-compiler-1',
        patchId: 'patch-same-her-compiler-1',
        decisionTraceId: 'trace-same-her-compiler-1',
        summary: 'Keep truth discipline and measured warmth aligned so she still reads as the same her.',
        lanes: ['response-posture', 'relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
      },
      selfEvolution: null,
      affectiveResidue: null,
      learningExecutionState: null,
      recallLatencyPolicy: null,
      recollectionIntent: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      dialogueRhythm: null,
      summary: 'continuity=same-her-baseline | anchor=candidate-same-her-compiler-1',
    }

    const compiler = buildAnswerCompiler({
      now: 98_000,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('Stay inside the current same-her baseline.')
    expect(compiler?.mustDo).toContain('Keep the visible reply aligned with the current same-her baseline instead of optimizing for a smoother but off-baseline persona move.')
    expect(compiler?.mustNotDo).toContain('Do not let fluency, warmth, or style drift outrun the currently adopted same-her continuity baseline.')
  })

  it('threads held-autonomy continuity into provider-mind opening discipline so the same line reopens gently', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(98_500),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful' as any,
        currentTurnSummary: 'Continue the same unfinished runtime continuity line without restarting it.',
        currentQuestion: '继续。',
        owedAction: 'guide-task' as any,
        relationMove: 'guide',
        unresolvedCarry: '她当时忍住了，但还想回到这条未完线。',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task' as any,
        openingIntent: '先轻接回那条刚才忍住的线，再把欠着的收束补上。',
        truthBoundary: '这是同一条延续中的 remembered carry，不是假装成刚刚发生。',
        interiorSummary: '这轮该像同一个她轻轻接回未完线，而不是重新开场。',
      },
      privateThought: {
        stance: 'nudge',
        confidence: 0.8,
        rationaleTags: [],
        thoughtText: '她该轻一点接回那条线，不该像重新开场。',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 140_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
    })
    ;(runtimeSurface.dialogue as any).sessionMirror = {
      sessionId: 'session-held-compiler-1',
      cardId: 'default',
      updatedAt: 98_000,
      sessionPhases: [],
      continuityLabels: ['proactive:follow-through:held-autonomy'],
      dialogueSummary: 'thread=runtime continuity repair task',
      executionSummary: 'status=held | goal=runtime continuity repair task | summary=她当时忍住了，但还想回到这条未完线',
      memorySummary: 'carry=runtime continuity repair task',
      recollectionSummary: null,
      recollectionSurfaceSummary: null,
      runtimeChannelSummary: null,
      runtimeTransitionSummary: null,
      agencySummary: 'intent=follow-through | thread=thread-runtime',
      toolingSummary: 'allow=true',
      perceptionSummary: null,
      mindSummary: null,
      digitalLifeRuntimeSummary: null,
      digitalLifeArchitectureSummary: null,
      memoryCarrySummary: null,
      captureSummary: 'grounded=false',
      decisionTraceId: null,
    }
    runtimeSurface.dialogue.conversationState = {
      ...runtimeSurface.dialogue.conversationState,
      memoryMode: 'task-thread',
      shouldHoldThread: true,
      primaryTurnAnchor: 'runtime continuity repair task',
      hostMove: '继续。',
      jointThread: 'runtime continuity repair task',
      activeCommitments: [],
      memoryQueryHints: [],
      unansweredQuestion: null,
      owedRepair: null,
    } as any

    const compiler = buildAnswerCompiler({
      now: 98_000,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('Re-enter the line you deliberately held back gently before widening.')
    expect(compiler?.mustDo).toContain('If this turn reopens a line you deliberately held back earlier, let the opening re-enter softly before fuller payoff or explanation.')
    expect(compiler?.mustNotDo).toContain('Do not reopen a deliberately held line with abrupt intensity, a restart shell, or over-eager warmth.')
  })

  it('keeps richer same-her relationship authority when fresher runtime self continuity is thinner', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(102_400),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'task-knot',
        currentTurnSummary: 'Continue the same unfinished runtime continuity line without restarting it.',
        currentQuestion: '继续。',
        owedAction: 'guide-task' as any,
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task' as any,
        openingIntent: '先接回同一条线，再继续欠着的收束。',
        truthBoundary: '这是同一条延续中的 remembered carry。',
        interiorSummary: '这轮该像同一个她接回未完线，而不是重新开场。',
      },
      privateThought: {
        stance: 'nudge',
        confidence: 0.81,
        rationaleTags: [],
        thoughtText: '先保住当下这句还是同一个她，再继续。',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 144_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
    })

    runtimeSurface.memory.derivedMindStateBundle = {
      ...runtimeSurface.memory.derivedMindStateBundle,
      personStateProjection: {
        selfContinuityAuthority: {
          selfLine: 'I am still the same her who should speak from the current return instead of a recycled opening shell.',
          relationshipLine: 'We stay on the living bond line by reopening gently before leaning closer again.',
          inwardLine: 'Keep the same-her line intact before widening the answer.',
          motiveLine: 'Continue one living thread instead of restarting from habit.',
        },
      },
    } as any

    runtimeSurface.memory.personStateProjection = {
      ...runtimeSurface.memory.personStateProjection,
      selfContinuityAuthority: {
        selfLine: 'I should answer from the fresher current return, not from an older shell.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 102_400,
      runtimeSurface,
    })

    expect(compiler?.openingClaim).toContain('继续。')
  })

  it('lets richer relationship authority stay visible on relationship turns even when runtime self continuity is thinner', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(103_200),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'relationship',
        currentTurnSummary: 'Answer the bond directly instead of restarting from a shell.',
        currentQuestion: '你刚才为什么又退开了？',
        owedAction: 'answer-self' as any,
        relationMove: 'repair',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'relationship',
        relationMove: 'repair',
        speechObligation: 'answer-self' as any,
        openingIntent: '先把这条关系线接稳，再解释为什么退开。',
        truthBoundary: '这是同一条关系线里的回答，不是假装无事发生。',
        interiorSummary: '先在关系里把线接稳，不要退回重开壳。',
      },
      privateThought: {
        stance: 'care',
        confidence: 0.78,
        rationaleTags: [],
        thoughtText: '先把关系里的线接稳。',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 145_000,
        afterglowFromScenario: null,
        emotionalTension: 'soft-covision',
      },
    })

    runtimeSurface.memory.derivedMindStateBundle = {
      ...runtimeSurface.memory.derivedMindStateBundle,
      personStateProjection: {
        selfContinuityAuthority: {
          selfLine: 'I am still the same her who should not restart from a shell.',
          relationshipLine: 'We stay on the living bond line by answering the seam before leaning close again.',
        },
      },
    } as any

    runtimeSurface.memory.personStateProjection = {
      ...runtimeSurface.memory.personStateProjection,
      selfContinuityAuthority: {
        selfLine: 'I should answer from the fresher current return, not from an older shell.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 103_200,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('living bond line')
    expect(compiler?.openingDirective).toContain('answering the seam before leaning close again')
  })

  it('keeps digest-only same-her quiet carry authority in the compiled opening directive even when the runtime shell stays thin', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(104_100),
      discourseState: {
        ...repairDiscourse,
        currentTurnSubject: 'relationship',
        currentTurnSummary: 'Answer from the same quiet line instead of restarting after the detour.',
        currentQuestion: '你现在还是沿着刚才那条线轻轻回来的吗',
        owedAction: 'answer-self' as any,
        relationMove: 'attune',
      },
      mindSynthesis: {
        ...repairMind,
        answerSubject: 'relationship',
        relationMove: 'attune',
        speechObligation: 'answer-self' as any,
        openingIntent: '先沿着同一条安静的线接回来，再慢一点往外展开。',
        truthBoundary: '这是同一条 quiet same-her continuity，不是重新开场。',
        interiorSummary: '先保住这轮还是同一个她在轻轻接回来。',
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.8,
        rationaleTags: [],
        thoughtText: '先让这句像同一个她沿着那条安静的线接回来。',
        shouldSpeak: true,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'hesitant',
        expiresAt: 146_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
    })

    runtimeSurface.memory.derivedMindStateBundle = {
      ...runtimeSurface.memory.derivedMindStateBundle,
      personStateProjection: {
        selfContinuityAuthority: {
          selfLine: 'I am still the same her on this quieter later return.',
          relationshipLine: 'We stay on the same quiet line by coming back lower-pressure before leaning closer again.',
          inwardLine: 'Keep the same-her line intact before widening the answer.',
          motiveLine: 'Protect the same quiet continuity before closeness widens.',
        },
      },
    } as any

    runtimeSurface.memory.personStateProjection = {
      ...runtimeSurface.memory.personStateProjection,
      selfContinuityAuthority: {
        selfLine: 'Thin runtime shell line.',
      },
    } as any

    const compiler = buildAnswerCompiler({
      now: 104_100,
      runtimeSurface,
    })

    expect(compiler?.openingDirective).toContain('same quiet line')
    expect(compiler?.openingDirective).toContain('lower-pressure')
    expect(compiler?.openingDirective).not.toContain('Thin runtime shell line')
  })
})
