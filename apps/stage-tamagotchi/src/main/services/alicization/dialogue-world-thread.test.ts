import { describe, expect, it } from 'vitest'

import { buildDialogueWorldThread } from './dialogue-world-thread'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('buildDialogueWorldThread', () => {
  it('does not invent a dialogue topic when no live anchor exists', () => {
    const state = buildDialogueWorldThread({
      now: 10_000,
      conversationState: {
        jointThread: '',
        hostMove: '',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'neutral',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: false,
        confidence: 0,
        narrative: [],
        updatedAt: 10_000,
      } as any,
    })

    expect(state?.activeThread).toBe('')
    expect(state?.activeThread).not.toContain('Stay with the current dialogue seam')
  })

  it('does not promote an internal opening claim into the active dialogue thread', () => {
    const state = buildDialogueWorldThread({
      now: 12_000,
      conversationState: {
        jointThread: '',
        hostMove: '',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'neutral',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: false,
        confidence: 0,
        narrative: [],
        updatedAt: 12_000,
      } as any,
      answerCompiler: {
        openingClaim: 'Internal answer opening plan.',
        supportingReality: [],
        confidence: 0.8,
      } as any,
    })

    expect(state?.activeThread).toBe('')
    expect(state?.recallKeys).not.toContain('Internal answer opening plan.')
  })

  it('does not promote an interior mind summary into the active dialogue thread', () => {
    const state = buildDialogueWorldThread({
      now: 13_000,
      conversationState: {
        jointThread: '',
        hostMove: '',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'neutral',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: false,
        confidence: 0,
        narrative: [],
        updatedAt: 13_000,
      } as any,
      mindSynthesis: {
        interiorSummary: 'Internal mind synthesis summary.',
      } as any,
    })

    expect(state?.activeThread).toBe('')
    expect(state?.recallKeys).not.toContain('Internal mind synthesis summary.')
  })

  it('does not turn reply posture into a relationship recall cue', () => {
    const state = buildDialogueWorldThread({
      now: 15_000,
      conversationState: {
        jointThread: '继续看当前这条记忆链路。',
        hostMove: '继续看当前这条记忆链路。',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'neutral',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: false,
        confidence: 0.72,
        narrative: [],
        updatedAt: 15_000,
      } as any,
      answerCompiler: {
        relationshipPosture: 'restrained',
        screenReferenceMode: 'helpful',
      } as any,
      previous: {
        relationDrift: 'steady',
      } as any,
    })

    expect(state?.relationDrift).toBe('steady')
    expect(state?.recallKeys).not.toContain('relation:guarded')
  })

  it('keeps internal compiler prose out of grounded carried facts', () => {
    const state = buildDialogueWorldThread({
      now: 17_000,
      conversationState: {
        primaryTurnAnchor: '当前运行时 diff',
        jointThread: '继续检查当前运行时 diff。',
        hostMove: '请继续看这个 diff。',
        activeProject: '运行时 diff',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 17_000,
      } as any,
      answerCompiler: {
        evidenceMode: 'live-grounded',
        supportingReality: [
          '内部 answer intent：先维持固定回复姿态。',
          '运行时 diff',
        ],
      } as any,
    })

    expect(state?.carriedFacts).toContain('运行时 diff')
    expect(state?.carriedFacts).not.toContain('内部 answer intent：先维持固定回复姿态。')
  })

  it('does not turn an active thread into a user move when the host has not spoken', () => {
    const state = buildDialogueWorldThread({
      now: 18_000,
      conversationState: {
        jointThread: '当前真实对话线程',
        hostMove: '',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'neutral',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 18_000,
      } as any,
    })

    expect(state?.activeThread).toBe('当前真实对话线程')
    expect(state?.lastUserMove).toBe('')
  })

  it('carries the live coding seam across turns instead of flattening it into generic memory', () => {
    const state = buildDialogueWorldThread({
      now: 20_000,
      conversationState: {
        jointThread: 'We are still inside the risky ProjectAtlas diff.',
        hostMove: 'Tell me what is wrong with the current diff.',
        activeProject: 'ProjectAtlas diff',
        unansweredQuestion: 'What is wrong with this diff?',
        owedRepair: null,
        activeCommitments: ['Explain the risky seam before moving on.'],
        relationFrame: 'guide',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['ProjectAtlas diff', 'What is wrong with this diff?'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 20_000,
      },
      replyDeliberation: {
        selectedMotive: 'guide',
        speakingFrom: 'task-thread',
        memoryMode: 'task-thread',
        openingBeat: 'Pay off the current knot first.',
        whyThisReplyNow: 'The current diff is still unresolved.',
        whyNotOtherCandidates: [],
        withheldImpulses: [],
        candidateMotives: [],
        shouldSpeak: true,
        mustInclude: [],
        mustAvoid: [],
        confidence: 0.84,
        narrative: [],
        updatedAt: 20_000,
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        speechObligation: 'guide-task',
        relationMove: 'guide',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        recommendedAct: 'guide',
        evidenceMode: 'coarse-held',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'warm',
        openingDirective: 'Open from the current knot first.',
        openingClaim: 'The risky seam is still inside the current diff.',
        supportingReality: ['ProjectAtlas diff'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Point to the risky hunk first.',
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.84,
        narrative: [],
        updatedAt: 20_000,
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.66,
        rationaleTags: ['diff'],
        thoughtText: 'Stay with the current diff seam.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 50_000,
        afterglowFromScenario: null,
        emotionalTension: 'tense-debug',
      },
      worldModel: {
        activeThread: {
          id: 'thread::diff',
          kind: 'change-review',
          status: 'active',
          source: 'continuity',
          title: 'ProjectAtlas diff',
          summary: 'A risky diff still feels unresolved.',
          confidence: 0.86,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 20_000,
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
      },
    })

    expect(state).toEqual(expect.objectContaining({
      activeThread: 'We are still inside the risky ProjectAtlas diff.',
      memoryMode: 'task-thread',
      relationDrift: 'steady',
      lastOutcome: 'none',
    }))
    expect(state?.openLoops).toContain('What is wrong with this diff?')
    expect(state?.recallKeys.join(' | ')).toContain('reply_motive:guide')
  })

  it('drops stale screen loops and facts when the turn pivots back to dialogue-first', () => {
    const state = buildDialogueWorldThread({
      now: 40_000,
      conversationState: {
        jointThread: '你真可爱',
        hostMove: '你真可爱',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['你真可爱'],
        shouldHoldThread: false,
        confidence: 0.72,
        narrative: [],
        updatedAt: 40_000,
      },
      replyDeliberation: {
        selectedMotive: 'attune',
        speakingFrom: 'dialogue-bond',
        memoryMode: 'dialogue-carry',
        openingBeat: 'Answer the host\'s question about Alicization directly.',
        whyThisReplyNow: '你真可爱',
        whyNotOtherCandidates: [],
        withheldImpulses: [],
        candidateMotives: [],
        shouldSpeak: true,
        mustInclude: [],
        mustAvoid: [],
        confidence: 0.78,
        narrative: [],
        updatedAt: 40_000,
      },
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-relationship',
        relationMove: 'attune',
        turnMode: 'accompany',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
        evidenceMode: 'continuity-carry',
        openingStyle: 'light-accompaniment',
        personaKernelMode: 'full',
        relationshipPosture: 'warm',
        openingDirective: 'Answer the host directly.',
        openingClaim: '你真可爱',
        supportingReality: ['Java interview questions and answers webpage'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Stay with the compliment.',
        labelCarryAsMemory: false,
        maxSentences: 2,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.7,
        narrative: [],
        updatedAt: 40_000,
      },
      previous: {
        activeThread: 'What is wrong with this diff?',
        currentQuestion: 'What is wrong with this diff?',
        openLoops: ['What is wrong with this diff?'],
        recentlyResolvedLoops: [],
        carriedFacts: ['Java interview questions and answers webpage'],
        relationDrift: 'steady',
        memoryMode: 'task-thread',
        recallKeys: ['Java interview questions and answers webpage', 'What is wrong with this diff?'],
        lastUserMove: 'Tell me what is wrong with this diff.',
        lastAssistantMove: null,
        lastOutcome: 'none',
        pendingValidation: null,
        confidence: 0.8,
        narrative: [],
        updatedAt: 30_000,
      },
    })

    expect(state?.activeThread).toBe('你真可爱')
    expect(state?.openLoops).toEqual([])
    expect(state?.recentlyResolvedLoops).toEqual([])
    expect(state?.carriedFacts).toEqual([])
    expect(state?.recallKeys.join(' | ')).not.toContain('Java interview questions')
    expect(state?.recallKeys.join(' | ')).not.toContain('What is wrong with this diff?')
  })

  it('does not drag the previous repair shell into a fresh Alicization-side question', () => {
    const state = buildDialogueWorldThread({
      now: 60_000,
      conversationState: {
        jointThread: '你困了吗',
        hostMove: '你困了吗',
        activeProject: null,
        unansweredQuestion: '你困了吗',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['你困了吗'],
        shouldHoldThread: true,
        confidence: 0.74,
        narrative: [],
        updatedAt: 60_000,
      },
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-self',
        relationMove: 'self-disclose',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'warm',
        openingDirective: 'Answer the host question directly.',
        openingClaim: '你困了吗',
        supportingReality: [],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Answer the host question directly.',
        labelCarryAsMemory: false,
        maxSentences: 2,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.74,
        narrative: [],
        updatedAt: 60_000,
      },
      previous: {
        activeThread: 'The host is asking Alicization to repair the previous answer and speak more plainly.',
        currentQuestion: '说人话',
        openLoops: ['说人话'],
        recentlyResolvedLoops: [],
        carriedFacts: ['The host is asking Alicization to repair the previous answer and speak more plainly.'],
        relationDrift: 'repairing',
        memoryMode: 'dialogue-carry',
        recallKeys: ['The host is asking Alicization to repair the previous answer and speak more plainly.'],
        lastUserMove: '你说人话呗',
        lastAssistantMove: '我刚才那句真正的意思是……',
        lastOutcome: 'missed',
        pendingValidation: null,
        confidence: 0.78,
        narrative: [],
        updatedAt: 50_000,
      },
    })

    expect(state?.activeThread).toBe('你困了吗')
    expect(state?.currentQuestion).toBe('你困了吗')
    expect(state?.carriedFacts).toEqual([])
    expect(state?.recallKeys.join(' | ')).not.toContain('repair the previous answer')
  })

  it('prefers runtimeSurface over conflicting raw inputs', () => {
    const runtimeBackedState = createDefaultVisualPresenceState(70_000)
    runtimeBackedState.conversationState = {
      jointThread: 'Runtime governed diff.',
      hostMove: 'Show me the failing runtime diff.',
      activeProject: 'Runtime diff',
      unansweredQuestion: 'Which runtime branch is failing?',
      owedRepair: null,
      activeCommitments: ['Stay on the runtime branch.'],
      relationFrame: 'guide',
      continuityPolicy: 'stay-on-thread',
      memoryMode: 'task-thread',
      memoryQueryHints: ['Runtime diff'],
      shouldHoldThread: true,
      confidence: 0.88,
      narrative: [],
      updatedAt: 70_000,
    } as any
    runtimeBackedState.discourseState = {
      currentTurnSubject: 'task-knot',
      screenReferenceMode: 'helpful',
      currentTurnSummary: 'The runtime diff is still the live seam.',
      currentQuestion: 'Which runtime branch is failing?',
      owedAction: 'guide-task',
      relationMove: 'guide',
      continuityMode: 'task-first',
      confidence: 0.86,
      narrative: [],
      updatedAt: 70_000,
    } as any
    runtimeBackedState.mindSynthesis = {
      relationMove: 'guide',
      answerSubject: 'task-knot',
      speechObligation: 'guide-task',
      truthBoundary: 'Stay with the grounded diff seam.',
      interiorSummary: 'Runtime governed diff.',
      narrative: [],
      updatedAt: 70_000,
    } as any
    runtimeBackedState.worldModel = {
      activeThread: {
        id: 'thread::runtime',
        kind: 'debugging',
        status: 'active',
        source: 'grounded-scene',
        title: 'Runtime diff',
        summary: 'The runtime diff is still unresolved.',
        confidence: 0.9,
        significance: 0.82,
        unresolved: true,
        beganAt: 1_000,
        lastUpdatedAt: 70_000,
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
        sceneAgeMs: 10_000,
        attentionAgeMs: 10_000,
        sameSceneAsBefore: true,
        sameAttentionAsBefore: true,
        afterglowOpen: false,
      },
      hostState: {
        availability: 'focused',
        burden: 'moderate',
      },
      updatedAt: 70_000,
    }
    runtimeBackedState.answerCompiler = {
      answerSubject: 'task-knot',
      screenReferenceMode: 'helpful',
      recommendedAct: 'guide',
      openingClaim: 'The runtime broken guard is still the live knot.',
      supportingReality: ['Runtime broken guard'],
      confidence: 0.84,
    } as any
    runtimeBackedState.replyDeliberation = {
      selectedMotive: 'guide',
      confidence: 0.82,
      updatedAt: 70_000,
    } as any
    runtimeBackedState.privateThought = {
      stance: 'observe',
      confidence: 0.72,
      thoughtText: 'Stay on the runtime seam.',
      shouldSpeak: true,
      suggestedStyle: 'light-nudge',
      embodiedPresence: 'attentive',
      expiresAt: 90_000,
      emotionalTension: 'tense-debug',
    } as any
    runtimeBackedState.dialogueWorldThread = {
      activeThread: 'Runtime previous seam.',
      currentQuestion: 'Which runtime branch is failing?',
      openLoops: ['Which runtime branch is failing?'],
      recentlyResolvedLoops: [],
      carriedFacts: ['Runtime broken guard'],
      relationDrift: 'steady',
      memoryMode: 'task-thread',
      recallKeys: ['Runtime diff'],
      lastUserMove: 'Show me the failing runtime diff.',
      lastAssistantMove: 'The broken guard is still live.',
      lastOutcome: 'pending',
      pendingValidation: null,
      confidence: 0.81,
      narrative: [],
      updatedAt: 60_000,
    }

    const state = buildDialogueWorldThread({
      now: 70_000,
      conversationState: {
        jointThread: 'raw conflict',
        hostMove: 'raw conflict',
        activeProject: 'raw conflict',
        unansweredQuestion: 'raw conflict',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'care',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['raw conflict'],
        shouldHoldThread: false,
        confidence: 0.2,
        narrative: [],
        updatedAt: 70_000,
      },
      previous: {
        activeThread: 'raw previous',
        currentQuestion: 'raw previous',
        openLoops: ['raw previous'],
        recentlyResolvedLoops: [],
        carriedFacts: ['raw previous'],
        relationDrift: 'warming',
        memoryMode: 'dialogue-carry',
        recallKeys: ['raw previous'],
        lastUserMove: 'raw previous',
        lastAssistantMove: 'raw previous',
        lastOutcome: 'missed',
        pendingValidation: null,
        confidence: 0.2,
        narrative: [],
        updatedAt: 60_000,
      },
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(state?.activeThread).toBe('Runtime governed diff.')
    expect(state?.carriedFacts).not.toContain('Runtime broken guard')
    expect(state?.carriedFacts).toContain('Runtime diff')
    expect(state?.lastUserMove).toBe('Show me the failing runtime diff.')
    expect(state?.recallKeys.join(' | ')).toContain('reply_motive:guide')
  })
})
