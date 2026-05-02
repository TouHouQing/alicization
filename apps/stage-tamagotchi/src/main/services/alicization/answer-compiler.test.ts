import { describe, expect, it } from 'vitest'

import {
  buildAnswerCompiler,
  buildAnswerCompilerSystemBlock,
} from './answer-compiler'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildAlicizationPersonalityContinuityState } from './personality-continuity-state'
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
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'space-first',
      closenessLadder: [],
      relationshipPosture: 'restrained',
      openingGuidance: 'Open with the live answer first and keep the approach lighter.',
      preferredProactiveStyle: 'light-nudge',
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
    }

    const compiler = buildAnswerCompiler({
      now: 62_000,
      runtimeSurface,
    })

    expect(compiler?.activeClosenessContext).toBe('execution-callback')
    expect(compiler?.activeClosenessRung).toBe('measured-room')
    expect(compiler?.openingDirective).toContain('returned result itself')
    expect(compiler?.mustDo).toContain('Return the result on the same thread before widening into anything extra.')
    expect(compiler?.mustNotDo).toContain('Do not widen a bounded callback into generic companionship tone.')
    expect(compiler?.narrative).toEqual(expect.arrayContaining([
      'continuity-regime:execution-callback',
    ]))
    expect(buildAnswerCompilerSystemBlock(compiler)).toContain('Closeness ladder: execution-callback/measured-room.')
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
      activeClosenessContext: 'repair-window',
      activeClosenessRung: 'measured-room',
      closenessLadder: [],
      relationshipPosture: 'restrained',
      openingGuidance: 'Repair the seam before leaning closer.',
      preferredProactiveStyle: 'light-nudge',
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
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'close-hold',
      closenessLadder: [],
      relationshipPosture: 'tender',
      openingGuidance: 'Stay near, but do not let closeness outrun truth or room.',
      preferredProactiveStyle: 'gentle-care',
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
})
