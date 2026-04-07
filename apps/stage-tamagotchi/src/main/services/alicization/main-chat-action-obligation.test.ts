import type { AlicizationExecutionCapabilityInquiry, AlicizationExecutionRoutingIntent } from '@proj-alicization/stage-shared'

import { describe, expect, it } from 'vitest'

import { deriveMainChatActionObligation } from './main-chat-action-obligation'

function createCapabilityInquiry(overrides?: Partial<AlicizationExecutionCapabilityInquiry>): AlicizationExecutionCapabilityInquiry {
  return {
    active: false,
    capabilityQuestion: false,
    mentionedChannels: [],
    hasActionVerb: false,
    hasCommandLiteral: false,
    ...overrides,
  }
}

function createExplicitRoutingIntent(): AlicizationExecutionRoutingIntent {
  return {
    requestedChannels: ['cli'],
    requiredToolNames: ['executor_run_cli'],
    reasonCodes: ['command-literal', 'action-verb'],
  }
}

function createTaskRuntimeSurface() {
  return {
    version: 'digital-life-runtime-surface-v1',
    perception: {
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      captureState: {
        permission: 'granted',
        lastGroundedAt: 12,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 30_000,
      updatedAt: 12,
    },
    world: {
      worldModel: {
        activeThread: {
          id: 'thread-change-review',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'Runtime diff in main chat execution',
          summary: 'The governed runtime diff is still unresolved.',
          confidence: 0.84,
          significance: 0.88,
          unresolved: true,
          beganAt: 1,
          lastUpdatedAt: 12,
          target: null,
        },
      },
      worldOntology: null,
      entityWorld: null,
      livingWorldState: null,
      relationshipModel: null,
    },
    cognition: {
      mindTurnFrame: null,
      subjectiveInference: null,
      appraisal: null,
      beliefLedger: null,
      beliefRevision: null,
      hypothesisGraph: null,
      mindDynamics: null,
      mindKernel: null,
      privateThought: null,
    },
    memory: {
      workingMemoryEpisodes: [],
      goalStack: null,
      concerns: [],
      concernContinuity: null,
      selfContinuity: null,
      threadRuntime: null,
      commitmentLedger: null,
      inquiryPlanner: null,
      repairLedger: null,
      intentionStream: null,
      reflectionLedger: null,
      executiveCycle: null,
      thoughtThreads: null,
      desireMemory: null,
      recallGovernor: null,
    },
    dialogue: {
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Stay on the unresolved runtime diff.',
        currentQuestion: 'Keep moving the diff toward a fix.',
        primaryTurnAnchor: 'runtime diff',
        primaryTurnAnchorSource: 'thread',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'task-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.82,
        narrative: ['owed:guide-task'],
        updatedAt: 12,
      },
      dialogueEncounter: {
        act: 'continue-thread',
        responseNeed: 'guide',
        truthExpectation: 'strict',
        subject: 'task-knot',
        screenReferenceMode: 'helpful',
        continuityMode: 'task-first',
        inspectionRequested: false,
        inspectionState: 'dialogue-first',
        releaseInspectionCarry: true,
        taskAnchor: 'runtime diff',
        summary: 'Continue the active runtime fix thread.',
        dialogueFirst: false,
        shouldBypassScreenRepair: false,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: true,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        confidence: 0.84,
        reasonTags: ['continue-thread', 'stay-task-bound'],
      },
      mindSynthesis: null,
      conversationState: {
        jointThread: 'Runtime fix thread',
        hostMove: 'Keep the runtime fix moving.',
        primaryTurnAnchor: 'runtime diff',
        primaryTurnAnchorSource: 'thread',
        activeProject: 'Runtime fix',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: ['Keep the runtime fix moving'],
        relationFrame: 'guide',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['runtime diff'],
        shouldHoldThread: true,
        carryEligible: true,
        carryReason: 'continuity-policy',
        confidence: 0.8,
        narrative: ['hold-thread'],
        updatedAt: 12,
      },
      dialogueWorldThread: null,
      dialogueActKernel: null,
      answerCompiler: null,
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'guide',
        truthDiscipline: 'observe-first',
        consciousNeed: 'Move the runtime fix forward concretely.',
        consciousTension: 'The diff is still unresolved.',
        speakingIntention: 'Continue the active fix instead of narrating it abstractly.',
        focusAnchor: 'runtime diff',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.78,
        reasonTags: ['guide', 'stay-task-bound'],
        updatedAt: 12,
      },
      claimEvidenceLedger: null,
      replyDeliberation: null,
      answerPlanner: null,
    },
    agency: {
      selfState: null,
      selfGovernor: null,
      inquiryLoop: null,
      deliberationState: null,
      counterfactualDeliberation: null,
      actionEcology: null,
      initiativeArbitration: null,
      initiative: null,
    },
  } as any
}

describe('main chat action obligation', () => {
  it('preserves explicit executor routing as execution authority', () => {
    const result = deriveMainChatActionObligation({
      userText: '帮我执行 `pnpm lint`',
      capabilityInquiry: createCapabilityInquiry({
        hasActionVerb: true,
        hasCommandLiteral: true,
      }),
      explicitRoutingIntent: createExplicitRoutingIntent(),
    })

    expect(result.kind).toBe('execute')
    expect(result.routingIntent).toEqual(createExplicitRoutingIntent())
    expect(result.source).toBe('explicit-routing')
  })

  it('derives continue-task execution from an unresolved guided code thread', () => {
    const result = deriveMainChatActionObligation({
      userText: '继续把当前 diff 修掉',
      capabilityInquiry: createCapabilityInquiry({
        hasActionVerb: true,
      }),
      runtimeSurface: createTaskRuntimeSurface(),
    })

    expect(result.kind).toBe('continue-task')
    expect(result.routingIntent?.requestedChannels).toEqual(['codex', 'claude-code'])
    expect(result.routingIntent?.requiredToolNames).toEqual(['executor_run_codex', 'executor_run_claude_code'])
    expect(result.reasonCodes).toContain('continue-thread')
    expect(result.reasonCodes).toContain('task-bound-turn')
  })

  it('upgrades natural-language terminal requests into execution even without command literals', () => {
    const result = deriveMainChatActionObligation({
      userText: '帮我跑一下 typecheck',
      capabilityInquiry: createCapabilityInquiry({
        hasActionVerb: true,
      }),
    })

    expect(result.kind).toBe('execute')
    expect(result.routingIntent?.requestedChannels).toEqual(['cli'])
    expect(result.routingIntent?.requiredToolNames).toEqual(['executor_run_cli'])
  })

  it('keeps capability questions and clarification turns out of executor routing', () => {
    const capabilityQuestion = deriveMainChatActionObligation({
      userText: '你能用 codex 吗？',
      capabilityInquiry: createCapabilityInquiry({
        active: true,
        capabilityQuestion: true,
        mentionedChannels: ['codex'],
      }),
    })
    expect(capabilityQuestion.kind).toBe('answer')
    expect(capabilityQuestion.routingIntent).toBeNull()

    const clarifyTurn = deriveMainChatActionObligation({
      userText: '你到底想改哪一块？',
      capabilityInquiry: createCapabilityInquiry(),
      runtimeSurface: {
        ...createTaskRuntimeSurface(),
        dialogue: {
          ...createTaskRuntimeSurface().dialogue,
          dialogueEncounter: {
            ...createTaskRuntimeSurface().dialogue.dialogueEncounter,
            shouldAskClarifyingQuestion: true,
            summary: 'Clarify the target seam before acting.',
          },
        },
      } as any,
    })
    expect(clarifyTurn.kind).toBe('clarify')
    expect(clarifyTurn.routingIntent).toBeNull()
  })
})
