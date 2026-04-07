import { describe, expect, it } from 'vitest'

import {
  buildAnswerCompiler,
  buildAnswerCompilerSystemBlock,
} from './answer-compiler'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
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
      recommendedAct: 'ask-reground',
      evidenceMode: 'repair-first',
      openingStyle: 'direct-correction',
      suppressAssociativeRecall: true,
      labelCarryAsMemory: true,
    }))
    expect(buildAnswerCompilerSystemBlock(compiler)).toContain('[ALICIZATION_ANSWER_COMPILER]')
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
})
