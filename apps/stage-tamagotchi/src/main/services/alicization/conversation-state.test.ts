import { describe, expect, it } from 'vitest'

import {
  buildConversationState,
  buildConversationStateSystemBlock,
} from './conversation-state'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('buildConversationState', () => {
  it('uses dialogue carry as the default memory mode for an ordinary turn', () => {
    const state = buildConversationState({
      now: 5_000,
      userText: '我们继续聊刚才的话题',
      discourseState: {
        currentTurnSubject: 'general',
        screenReferenceMode: 'helpful',
        currentTurnSummary: '继续当前对话。',
        currentQuestion: '刚才说到哪里了？',
        owedAction: 'answer-general',
        relationMove: 'clarify',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.8,
        narrative: [],
        updatedAt: 5_000,
      },
    } as any)

    expect(state?.memoryMode).toBe('dialogue-carry')
  })

  it('does not invent a conversational thread when no grounded or remembered text exists', () => {
    const state = buildConversationState({
      now: 5_000,
      discourseState: {
        currentTurnSubject: 'general',
        screenReferenceMode: 'avoid',
        currentTurnSummary: '',
        currentQuestion: null,
        owedAction: null,
        relationMove: 'neutral',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.4,
        narrative: [],
        updatedAt: 5_000,
      },
    } as any)

    expect(state?.jointThread).toBe('')
    expect(state?.hostMove).toBe('')
    expect(state?.memoryQueryHints).toEqual([])
  })

  it('holds an unresolved coding thread as task memory instead of associative drift', () => {
    const state = buildConversationState({
      now: 20_000,
      userText: '你看看这个 diff 哪里不对',
      dialogueSemantics: {
        act: 'ask-help',
        responseNeed: 'guide',
        truthExpectation: 'strict',
        affectiveTone: 'neutral',
        taskAnchor: 'ProjectAtlas diff',
        sharedAttentionDemand: 0.84,
        personaSuppression: 0.72,
        confidence: 0.82,
        summary: 'The host wants help on the current diff.',
        source: 'hybrid',
        reasonTags: ['coding-question'],
      },
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Stay with the current diff and explain the knot.',
        currentQuestion: 'What is wrong with this diff?',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'task-first',
        unresolvedCarry: 'A failing diff is still open.',
        ruptureRepair: null,
        confidence: 0.86,
        narrative: [],
        updatedAt: 10_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::diff',
          kind: 'change-review',
          status: 'active',
          source: 'continuity',
          title: 'ProjectAtlas diff',
          summary: 'A risky diff may have broken the test path.',
          confidence: 0.84,
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
      commitmentLedger: {
        governingCommitmentId: 'commitment::diff',
        commitments: [{
          id: 'commitment::diff',
          kind: 'follow-through',
          source: 'continuity',
          title: 'Explain the current diff',
          summary: 'Stay inside the current diff until the risky seam is explained.',
          status: 'active',
          priority: 0.82,
          confidence: 0.8,
          createdAt: 0,
          lastRenewedAt: 20_000,
          patienceUntil: 120_000,
          expiresAt: 240_000,
        }],
        carryPressure: 0.78,
        narrative: [],
        updatedAt: 20_000,
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.72,
        rationaleTags: ['diff'],
        thoughtText: 'The current diff still feels risky.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'tense-debug',
      },
    })

    expect(state).toEqual(expect.objectContaining({
      memoryMode: 'task-thread',
      continuityPolicy: 'stay-on-thread',
      shouldHoldThread: true,
    }))
    expect(state?.memoryQueryHints.join(' | ')).toContain('ProjectAtlas')
    expect(buildConversationStateSystemBlock(state)).toBe('')
  })

  it('keeps self turns dialogue-first and carries the unanswered personal question', () => {
    const previous = buildConversationState({
      now: 10_000,
      userText: '你刚刚是不是有点生气',
      dialogueSemantics: {
        act: 'social-bid',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'warm',
        taskAnchor: null,
        sharedAttentionDemand: 0.22,
        personaSuppression: 0.18,
        confidence: 0.64,
        summary: 'The host is asking about Alicization herself.',
        source: 'hybrid',
        reasonTags: ['detached-question'],
      },
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from Alicization herself.',
        currentQuestion: 'Were you upset just now?',
        owedAction: 'answer-self',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.7,
        narrative: [],
        updatedAt: 10_000,
      },
      privateThought: {
        stance: 'accompany',
        confidence: 0.56,
        rationaleTags: [],
        thoughtText: 'Stay near the host and answer plainly.',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'glance',
        expiresAt: 40_000,
        afterglowFromScenario: null,
        emotionalTension: 'soft-covision',
      },
    })

    const next = buildConversationState({
      now: 20_000,
      userText: '我是说你刚才那句',
      dialogueSemantics: {
        act: 'continue-thread',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'warm',
        taskAnchor: null,
        sharedAttentionDemand: 0.28,
        personaSuppression: 0.18,
        confidence: 0.68,
        summary: 'The host is continuing the same personal thread.',
        source: 'hybrid',
        reasonTags: ['continue-thread'],
      },
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Keep answering from Alicization’s own continuity.',
        currentQuestion: null,
        owedAction: 'answer-self',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.74,
        narrative: [],
        updatedAt: 20_000,
      },
      previous,
    })

    expect(next).toEqual(expect.objectContaining({
      memoryMode: 'dialogue-carry',
      continuityPolicy: 'dialogue-before-scene',
      unansweredQuestion: 'Were you upset just now?',
    }))
  })

  it('cuts stale repair carry when the new turn is about Alicization herself', () => {
    const state = buildConversationState({
      now: 30_000,
      userText: '你怎么跟个人机一样，一点都不智能',
      dialogueSemantics: {
        act: 'challenge',
        responseNeed: 'repair',
        truthExpectation: 'normal',
        affectiveTone: 'frustrated',
        taskAnchor: 'general unknown',
        sharedAttentionDemand: 0.31,
        personaSuppression: 0.25,
        confidence: 0.73,
        summary: 'The host is criticizing Alicization’s intelligence and responsiveness.',
        source: 'hybrid',
        reasonTags: ['direct-complaint'],
      },
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer the criticism directly from Alicization’s own continuity.',
        currentQuestion: null,
        owedAction: 'answer-self',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: '她还没重新看见这条线程，只是在沿着刚才的连续性跟着它。',
        confidence: 0.74,
        narrative: [],
        updatedAt: 30_000,
      },
      repairLedger: {
        governingRepairId: 'repair::stale',
        entries: [{
          id: 'repair::stale',
          kind: 'reground-scene',
          status: 'open',
          summary: '她还没重新看见这条线程，只是在沿着刚才的连续性跟着它。',
          rationale: 'stale anchor',
          urgency: 0.86,
          confidence: 0.9,
          createdAt: 0,
          lastUpdatedAt: 30_000,
          expiresAt: 90_000,
        }],
        repairPressure: 0.86,
        truthRisk: 0.88,
        shouldConstrainPresentTense: true,
        narrative: [],
        updatedAt: 30_000,
      },
      previous: {
        jointThread: 'Which course looks more like an online class?',
        hostMove: 'Which course looks more like an online class?',
        activeProject: 'general unknown',
        unansweredQuestion: 'Which course looks more like an online class?',
        owedRepair: '她还没重新看见这条线程，只是在沿着刚才的连续性跟着它。',
        activeCommitments: ['Repair Misread', 'general unknown'],
        relationFrame: 'repair',
        continuityPolicy: 'scene-before-memory',
        memoryMode: 'scene-anchored',
        memoryQueryHints: ['general unknown'],
        shouldHoldThread: true,
        confidence: 0.72,
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(state?.hostMove).toBe('你怎么跟个人机一样，一点都不智能')
    expect(state?.owedRepair).toBeNull()
    expect(state?.memoryMode).toBe('dialogue-carry')
    expect(state?.activeCommitments).not.toContain('Repair Misread')
    expect(state?.activeCommitments).not.toContain('general unknown')
  })

  it('does not inherit stale screen projects into dialogue-first compliments', () => {
    const state = buildConversationState({
      now: 40_000,
      userText: '你真可爱',
      dialogueSemantics: {
        act: 'social-bid',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'warm',
        taskAnchor: null,
        sharedAttentionDemand: 0.12,
        personaSuppression: 0.08,
        confidence: 0.66,
        summary: 'The host is making a relational bid to Alicization.',
        source: 'hybrid',
        reasonTags: ['relational-bid'],
      },
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer the host directly instead of carrying the old scene.',
        currentQuestion: null,
        owedAction: 'answer-relationship',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.72,
        narrative: [],
        updatedAt: 40_000,
      },
      previous: {
        jointThread: 'What is wrong with this diff?',
        hostMove: 'Tell me what is wrong with the current diff.',
        activeProject: 'Java interview questions and answers webpage',
        unansweredQuestion: 'What is wrong with this diff?',
        owedRepair: null,
        activeCommitments: ['Explain the current diff first.'],
        relationFrame: 'guide',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['Java interview questions and answers webpage'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 30_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::browser',
          kind: 'browsing',
          status: 'active',
          source: 'continuity',
          title: 'Java interview questions and answers webpage',
          summary: 'A browser page is still hanging in old scene carry.',
          confidence: 0.9,
          significance: 0.7,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
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
          staleRisks: ['The old browser scene may no longer match the present turn.'],
        },
        continuity: {
          label: 'scene-shift',
          sceneAgeMs: 600_000,
          attentionAgeMs: 600_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 40_000,
      },
    })

    expect(state?.jointThread).toBe('你真可爱')
    expect(state?.activeProject).toBeNull()
    expect(state?.unansweredQuestion).toBeNull()
    expect(state?.memoryMode).toBe('dialogue-carry')
    expect(state?.memoryQueryHints.join(' | ')).not.toContain('Java interview questions')
  })

  it('prefers runtimeSurface dialogue and memory state over conflicting raw carry inputs', () => {
    const runtimeBackedState = createDefaultVisualPresenceState(50_000)
    runtimeBackedState.dialogueEncounter = {
      summary: 'The runtime branch is still the live seam.',
      dialogueFirst: false,
    } as any
    runtimeBackedState.discourseState = {
      currentTurnSubject: 'task-knot',
      screenReferenceMode: 'helpful',
      currentTurnSummary: 'Stay on the runtime branch.',
      currentQuestion: 'Which runtime branch is failing?',
      owedAction: 'guide-task',
      relationMove: 'guide',
      continuityMode: 'task-first',
      unresolvedCarry: 'The runtime branch is still unresolved.',
      ruptureRepair: null,
      confidence: 0.88,
      narrative: [],
      updatedAt: 50_000,
    } as any
    runtimeBackedState.worldModel = {
      activeThread: {
        id: 'thread::runtime',
        kind: 'debugging',
        status: 'active',
        source: 'grounded-scene',
        title: 'Runtime diff',
        summary: 'The runtime branch is still unresolved.',
        confidence: 0.9,
        significance: 0.82,
        unresolved: true,
        beganAt: 0,
        lastUpdatedAt: 50_000,
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
      updatedAt: 50_000,
    } as any
    runtimeBackedState.commitmentLedger = {
      governingCommitmentId: 'commitment::runtime',
      commitments: [{
        id: 'commitment::runtime',
        kind: 'follow-through',
        source: 'continuity',
        title: 'Runtime diff',
        summary: 'Stay on the runtime branch.',
        status: 'active',
        priority: 0.82,
        confidence: 0.84,
        createdAt: 0,
        lastRenewedAt: 50_000,
        patienceUntil: 120_000,
        expiresAt: 240_000,
      }],
      carryPressure: 0.78,
      narrative: [],
      updatedAt: 50_000,
    } as any

    const state = buildConversationState({
      now: 50_000,
      userText: '继续看 runtime branch',
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'raw conflict',
        currentQuestion: null,
        owedAction: 'answer-self',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.22,
        narrative: [],
        updatedAt: 50_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::raw',
          kind: 'unknown',
          status: 'active',
          source: 'continuity',
          title: 'raw conflict',
          summary: 'raw conflict',
          confidence: 0.22,
          significance: 0.22,
          unresolved: false,
          beganAt: 0,
          lastUpdatedAt: 50_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'scene-shift',
          sceneAgeMs: 50_000,
          attentionAgeMs: 50_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 50_000,
      },
      commitmentLedger: {
        governingCommitmentId: 'commitment::raw',
        commitments: [{
          id: 'commitment::raw',
          kind: 'follow-through',
          source: 'continuity',
          title: 'raw conflict',
          summary: 'raw conflict',
          status: 'active',
          priority: 0.2,
          confidence: 0.2,
          createdAt: 0,
          lastRenewedAt: 50_000,
          patienceUntil: 60_000,
          expiresAt: 90_000,
        }],
        carryPressure: 0.2,
        narrative: [],
        updatedAt: 50_000,
      },
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(state).toEqual(expect.objectContaining({
      memoryMode: 'task-thread',
      continuityPolicy: 'stay-on-thread',
      activeProject: 'Runtime diff',
      shouldHoldThread: true,
    }))
    expect(state?.activeCommitments).toContain('Stay on the runtime branch.')
  })

  it('does not let a released temporary-noise reflection become the carried owedRepair for a task thread', () => {
    const state = buildConversationState({
      now: 45_000,
      userText: '你先看这条 runtime 线到底是不是还在同一条 closure 上',
      dialogueSemantics: {
        act: 'ask-help',
        responseNeed: 'guide',
        truthExpectation: 'strict',
        affectiveTone: 'neutral',
        taskAnchor: 'runtime identity-continuity',
        sharedAttentionDemand: 0.82,
        personaSuppression: 0.68,
        confidence: 0.84,
        summary: 'The host wants help checking whether the runtime closure seam is still on the continuity state.',
        source: 'hybrid',
        reasonTags: ['coding-question'],
      },
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Stay on the runtime closure seam and carry only the meaningful repair line.',
        currentQuestion: null,
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'task-first',
        unresolvedCarry: 'The runtime identity-continuity',
        ruptureRepair: null,
        confidence: 0.86,
        narrative: [],
        updatedAt: 45_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime-same-her',
          kind: 'debugging',
          status: 'active',
          source: 'continuity',
          title: 'runtime identity-continuity',
          summary: 'The runtime identity-continuity',
          confidence: 0.84,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 45_000,
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
        updatedAt: 45_000,
      } as any,
      reflectionLedger: {
        latestEntryId: 'reflection::temporary-noise',
        entries: [
          {
            id: 'reflection::temporary-noise',
            summary: 'A temporary anxious wobble was already released and should not be carried as repair.',
            expectation: 'Released noise should not become the current owed repair.',
            observedOutcome: 'The wobble has already been let go.',
            outcome: 'released',
            revision: 'Do not reopen from the temporary wobble.',
            confidenceShift: 0.04,
            createdAt: 44_800,
          },
          {
            id: 'reflection::same-her-repair',
            summary: 'The same-her repair line is still the meaningful continuity carry.',
            expectation: 'The steadier repair line should stay active for the current thread.',
            observedOutcome: 'The continuity state still needs a measured return.',
            outcome: 'missed',
            revision: 'Keep the same-her repair line active instead of reopening from temporary noise.',
            confidenceShift: -0.08,
            createdAt: 44_200,
          },
        ],
        revisionPressure: 0.22,
        narrative: [],
        updatedAt: 45_000,
      } as any,
      privateThought: {
        stance: 'observe',
        confidence: 0.72,
        rationaleTags: ['runtime'],
        thoughtText: 'Stay with the runtime closure seam.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 90_000,
        afterglowFromScenario: null,
        emotionalTension: 'tense-debug',
      },
    })

    expect(state?.owedRepair).toBeNull()
    expect(state?.memoryQueryHints.join(' | ')).not.toContain('same-her repair line')
    expect(state?.memoryQueryHints.join(' | ')).not.toContain('Do not reopen from the temporary wobble')
  })
})
