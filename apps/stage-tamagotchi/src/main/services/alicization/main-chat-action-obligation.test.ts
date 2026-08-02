import type { AlicizationExecutionCapabilityInquiry, AlicizationExecutionRoutingIntent } from '@proj-alicization/stage-shared'

import { describe, expect, it } from 'vitest'

import {
  deriveMainChatActionObligation,
} from './main-chat-action-obligation'

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

function createDialogueFirstRuntimeSurface() {
  const base = createTaskRuntimeSurface()
  return {
    ...base,
    dialogue: {
      ...base.dialogue,
      discourseState: {
        ...base.dialogue.discourseState,
        screenReferenceMode: 'avoid',
      },
      dialogueEncounter: {
        ...base.dialogue.dialogueEncounter,
        act: 'answer',
        subject: 'relationship',
        screenReferenceMode: 'avoid',
        dialogueFirst: true,
        mustStayTaskBound: false,
      },
      conversationState: {
        ...base.dialogue.conversationState,
        shouldHoldThread: false,
      },
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
    expect(result.summary).toBe('帮我执行 `pnpm lint`')
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

  it('does not let legacy memory-template wording override an unresolved task continuation', () => {
    const result = deriveMainChatActionObligation({
      userText: '继续 continuity Phase 1 记忆闭环，让身体和声音接住。',
      capabilityInquiry: createCapabilityInquiry(),
      runtimeSurface: createTaskRuntimeSurface(),
    })

    expect(result.kind).toBe('continue-task')
    expect(result.routingIntent?.requestedChannels).toEqual(['codex', 'claude-code'])
    expect(result.reasonCodes).toContain('continue-thread')
  })

  it('keeps plain greeting turns out of execution routing even when an unresolved thread is held', () => {
    const result = deriveMainChatActionObligation({
      userText: '你好',
      capabilityInquiry: createCapabilityInquiry(),
      runtimeSurface: createTaskRuntimeSurface(),
    })

    expect(result.kind).toBe('answer')
    expect(result.routingIntent).toBeNull()
    expect(result.summary).toBe('你好')
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

  it('routes continuation-style visual web work into governed local visual execution before desktop fallback', () => {
    const runtimeSurface = createTaskRuntimeSurface()
    runtimeSurface.world.worldModel.activeThread = {
      id: 'thread-visible-scene',
      kind: 'research',
      status: 'active',
      source: 'grounded-scene',
      title: 'Current browser task',
      summary: 'The current browser flow still needs the next grounded step.',
      confidence: 0.72,
      significance: 0.66,
      unresolved: true,
      beganAt: 1,
      lastUpdatedAt: 12,
      target: null,
    }
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      owedAction: 'answer-general',
      screenReferenceMode: 'helpful',
    }
    runtimeSurface.dialogue.dialogueEncounter = {
      ...runtimeSurface.dialogue.dialogueEncounter,
      act: 'continue-thread',
      subject: 'visible-scene',
      screenReferenceMode: 'helpful',
      dialogueFirst: false,
      inspectionRequested: false,
      mustStayTaskBound: true,
      summary: 'Inspect the current visible web scene first.',
    }
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      centerOfGravity: 'observe',
      speakingIntention: 'Inspect the current visible web scene first.',
    }

    const result = deriveMainChatActionObligation({
      userText: '继续处理当前网页流程',
      capabilityInquiry: createCapabilityInquiry(),
      runtimeSurface,
    })

    expect(result.kind).toBe('continue-task')
    expect(result.routingIntent?.requestedChannels).toEqual(['browser'])
    expect(result.routingIntent?.requiredToolNames).toEqual(['executor_run_local_visual'])
  })

  it('routes browser continuation from current visible web context into governed local visual execution even when the user does not restate webpage keywords', () => {
    const runtimeSurface = createTaskRuntimeSurface()
    runtimeSurface.world.worldModel.activeThread = {
      id: 'thread-weibo-compose',
      kind: 'research',
      status: 'active',
      source: 'grounded-scene',
      title: 'Current browser weibo compose task',
      summary: 'The current weibo browser flow still needs the next grounded step.',
      confidence: 0.78,
      significance: 0.72,
      unresolved: true,
      beganAt: 1,
      lastUpdatedAt: 12,
      target: null,
    }
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      owedAction: 'answer-general',
      screenReferenceMode: 'helpful',
    }
    runtimeSurface.dialogue.dialogueEncounter = {
      ...runtimeSurface.dialogue.dialogueEncounter,
      act: 'continue-thread',
      subject: 'visible-scene',
      screenReferenceMode: 'helpful',
      dialogueFirst: false,
      inspectionRequested: false,
      mustStayTaskBound: true,
      taskAnchor: 'weibo compose browser flow',
      summary: 'Continue the current visible weibo browser flow.',
    }
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      centerOfGravity: 'observe',
      speakingIntention: 'Continue the current visible weibo browser flow.',
    }

    const result = deriveMainChatActionObligation({
      userText: '帮我继续发微博',
      capabilityInquiry: createCapabilityInquiry({
        hasActionVerb: true,
      }),
      runtimeSurface,
    })

    expect(result.kind).toBe('continue-task')
    expect(result.routingIntent?.requestedChannels).toEqual(['browser'])
    expect(result.routingIntent?.requiredToolNames).toEqual(['executor_run_local_visual'])
  })

  it('upgrades explicit browser grounding into governed local visual continuation when the active browser thread is unresolved', () => {
    const runtimeSurface = createTaskRuntimeSurface()
    runtimeSurface.world.worldModel.activeThread = {
      id: 'thread-weibo-compose',
      kind: 'research',
      status: 'active',
      source: 'grounded-scene',
      title: 'Current browser weibo compose task',
      summary: 'The current weibo browser flow still needs the next grounded step.',
      confidence: 0.78,
      significance: 0.72,
      unresolved: true,
      beganAt: 1,
      lastUpdatedAt: 12,
      target: null,
    }
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      owedAction: 'answer-general',
      screenReferenceMode: 'helpful',
    }
    runtimeSurface.dialogue.dialogueEncounter = {
      ...runtimeSurface.dialogue.dialogueEncounter,
      act: 'continue-thread',
      subject: 'visible-scene',
      screenReferenceMode: 'helpful',
      dialogueFirst: false,
      inspectionRequested: false,
      mustStayTaskBound: true,
      taskAnchor: 'weibo compose browser flow',
      summary: 'Continue the governed browser task thread instead of re-grounding from scratch.',
    }
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      centerOfGravity: 'observe',
      speakingIntention: 'Continue the governed browser task thread instead of re-grounding from scratch.',
    }

    const result = deriveMainChatActionObligation({
      userText: '帮我继续发微博',
      capabilityInquiry: createCapabilityInquiry({
        hasActionVerb: true,
      }),
      runtimeSurface,
      explicitRoutingIntent: {
        requestedChannels: ['browser'],
        requiredToolNames: ['browser_read_page'],
        reasonCodes: ['local-browser-read-page', 'action-verb'],
      },
    })

    expect(result.kind).toBe('continue-task')
    expect(result.routingIntent?.requestedChannels).toEqual(['browser'])
    expect(result.routingIntent?.requiredToolNames).toEqual(['executor_run_local_visual'])
    expect(result.reasonCodes).toEqual(expect.arrayContaining([
      'continue-thread',
      'explicit-routing-intent',
      'local-browser-read-page',
    ]))
  })

  it('routes desktop continuation from current visible gui context into governed local visual execution even when the user does not restate screen keywords', () => {
    const runtimeSurface = createTaskRuntimeSurface()
    runtimeSurface.world.worldModel.activeThread = {
      id: 'thread-upload-dialog',
      kind: 'research',
      status: 'active',
      source: 'grounded-scene',
      title: 'Current upload dialog desktop task',
      summary: 'The current desktop upload flow still needs the next grounded step.',
      confidence: 0.76,
      significance: 0.7,
      unresolved: true,
      beganAt: 1,
      lastUpdatedAt: 12,
      target: null,
    }
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      owedAction: 'answer-general',
      screenReferenceMode: 'helpful',
    }
    runtimeSurface.dialogue.dialogueEncounter = {
      ...runtimeSurface.dialogue.dialogueEncounter,
      act: 'continue-thread',
      subject: 'visible-scene',
      screenReferenceMode: 'helpful',
      dialogueFirst: false,
      inspectionRequested: false,
      mustStayTaskBound: true,
      taskAnchor: 'upload dialog desktop flow',
      summary: 'Continue the current visible desktop upload flow.',
    }
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      centerOfGravity: 'observe',
      speakingIntention: 'Continue the current visible desktop upload flow.',
    }

    const result = deriveMainChatActionObligation({
      userText: '帮我继续上传',
      capabilityInquiry: createCapabilityInquiry({
        hasActionVerb: true,
      }),
      runtimeSurface,
    })

    expect(result.kind).toBe('continue-task')
    expect(result.routingIntent?.requestedChannels).toEqual(['desktop'])
    expect(result.routingIntent?.requiredToolNames).toEqual(['executor_run_local_visual'])
  })

  it('upgrades explicit desktop grounding into governed local visual continuation when the active desktop thread is unresolved', () => {
    const runtimeSurface = createTaskRuntimeSurface()
    runtimeSurface.world.worldModel.activeThread = {
      id: 'thread-upload-dialog',
      kind: 'research',
      status: 'active',
      source: 'grounded-scene',
      title: 'Current upload dialog desktop task',
      summary: 'The current desktop upload flow still needs the next grounded step.',
      confidence: 0.76,
      significance: 0.7,
      unresolved: true,
      beganAt: 1,
      lastUpdatedAt: 12,
      target: null,
    }
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      owedAction: 'answer-general',
      screenReferenceMode: 'helpful',
    }
    runtimeSurface.dialogue.dialogueEncounter = {
      ...runtimeSurface.dialogue.dialogueEncounter,
      act: 'continue-thread',
      subject: 'visible-scene',
      screenReferenceMode: 'helpful',
      dialogueFirst: false,
      inspectionRequested: false,
      mustStayTaskBound: true,
      taskAnchor: 'upload dialog desktop flow',
      summary: 'Continue the governed desktop upload task thread instead of re-grounding from scratch.',
    }
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      centerOfGravity: 'observe',
      speakingIntention: 'Continue the governed desktop upload task thread instead of re-grounding from scratch.',
    }

    const result = deriveMainChatActionObligation({
      userText: '帮我继续上传',
      capabilityInquiry: createCapabilityInquiry({
        hasActionVerb: true,
      }),
      runtimeSurface,
      explicitRoutingIntent: {
        requestedChannels: ['desktop'],
        requiredToolNames: ['desktop_inspect_scene'],
        reasonCodes: ['local-desktop-inspect-scene', 'action-verb'],
      },
    })

    expect(result.kind).toBe('continue-task')
    expect(result.routingIntent?.requestedChannels).toEqual(['desktop'])
    expect(result.routingIntent?.requiredToolNames).toEqual(['executor_run_local_visual'])
    expect(result.reasonCodes).toEqual(expect.arrayContaining([
      'continue-thread',
      'explicit-routing-intent',
      'local-desktop-inspect-scene',
    ]))
  })

  it('keeps continuation-style visible screen gui work on governed local visual execution', () => {
    const runtimeSurface = createTaskRuntimeSurface()
    runtimeSurface.world.worldModel.activeThread = {
      id: 'thread-screen-scene',
      kind: 'research',
      status: 'active',
      source: 'grounded-scene',
      title: 'Current desktop window task',
      summary: 'The current window still needs the next grounded GUI step.',
      confidence: 0.74,
      significance: 0.68,
      unresolved: true,
      beganAt: 1,
      lastUpdatedAt: 12,
      target: null,
    }
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      owedAction: 'answer-general',
      screenReferenceMode: 'helpful',
    }
    runtimeSurface.dialogue.dialogueEncounter = {
      ...runtimeSurface.dialogue.dialogueEncounter,
      act: 'continue-thread',
      subject: 'visible-scene',
      screenReferenceMode: 'helpful',
      dialogueFirst: false,
      inspectionRequested: false,
      mustStayTaskBound: true,
      summary: 'Inspect the current visible desktop scene first.',
    }
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      centerOfGravity: 'observe',
      speakingIntention: 'Inspect the current visible desktop scene first.',
    }

    const result = deriveMainChatActionObligation({
      userText: '继续看看当前窗口下一步该点什么',
      capabilityInquiry: createCapabilityInquiry(),
      runtimeSurface,
    })

    expect(result.kind).toBe('continue-task')
    expect(result.routingIntent?.requestedChannels).toEqual(['desktop'])
    expect(result.routingIntent?.requiredToolNames).toEqual(['executor_run_local_visual'])
  })

  it('keeps explicit CLI execution routing active even in dialogue-first mode', () => {
    const result = deriveMainChatActionObligation({
      userText: '用cli帮我查一下桌面有什么文件',
      capabilityInquiry: createCapabilityInquiry(),
      runtimeSurface: createDialogueFirstRuntimeSurface(),
    })

    expect(result.kind).toBe('execute')
    expect(result.routingIntent?.requestedChannels).toEqual(['cli'])
    expect(result.routingIntent?.requiredToolNames).toEqual(['executor_run_cli'])
    expect(result.reasonCodes).toEqual(expect.arrayContaining(['dialogue-first-explicit-execution-demand']))
  })

  it('does not infer execution for dialogue-first small-talk turns', () => {
    const result = deriveMainChatActionObligation({
      userText: '你在吗',
      capabilityInquiry: createCapabilityInquiry(),
      runtimeSurface: createDialogueFirstRuntimeSurface(),
    })

    expect(result.kind).toBe('answer')
    expect(result.routingIntent).toBeNull()
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
            summary: 'Clarify the target seam before action.',
          },
        },
      } as any,
    })
    expect(clarifyTurn.kind).toBe('clarify')
    expect(clarifyTurn.routingIntent).toBeNull()
  })

  it('keeps the current user turn authoritative over stale internal project summaries', () => {
    const runtimeSurface = createDialogueFirstRuntimeSurface()
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Give a simple project update.',
      currentQuestion: '这个数字生命项目现在做到哪里了，还差什么',
      owedAction: 'answer-general',
      relationMove: 'self-disclose',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      confidence: 0.86,
      updatedAt: 18,
    }
    runtimeSurface.dialogue.dialogueEncounter = {
      ...runtimeSurface.dialogue.dialogueEncounter,
      act: 'answer',
      subject: 'alicization-self',
      screenReferenceMode: 'avoid',
      dialogueFirst: true,
      mustStayTaskBound: false,
      summary: 'Give a simple project update.',
      confidence: 0.84,
    }
    runtimeSurface.dialogue.conversationState = {
      ...runtimeSurface.dialogue.conversationState,
      jointThread: 'An older internal project summary is still present.',
      hostMove: '这个数字生命项目现在做到哪里了，还差什么',
      unansweredQuestion: '这个数字生命项目现在做到哪里了，还差什么',
      relationFrame: 'self-disclose',
      continuityPolicy: 'dialogue-before-scene',
      shouldHoldThread: true,
      confidence: 0.84,
      updatedAt: 18,
    }
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Answer the current question.',
      consciousTension: 'The internal project summary may be stale.',
      speakingIntention: 'Use current evidence when answering.',
      focusAnchor: 'current-question',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.88,
      reasonTags: ['direct-answer'],
      updatedAt: 18,
    }

    const result = deriveMainChatActionObligation({
      userText: '这个数字生命项目现在做到哪里了，还差什么',
      capabilityInquiry: createCapabilityInquiry(),
      runtimeSurface,
    })

    expect(result.kind).toBe('answer')
    expect(result.routingIntent).toBeNull()
    expect(result.summary).toBe('这个数字生命项目现在做到哪里了，还差什么')
    expect(result.summary).not.toBe('Give a simple project update.')
  })

  it('treats short affirmative replies as consent for the latest pending execution proposal', () => {
    const result = deriveMainChatActionObligation({
      userText: '可以，做吧',
      capabilityInquiry: createCapabilityInquiry(),
      pendingAffirmationThread: {
        threadId: 'thread-proposal-1',
        goal: 'Proactively patch the current unresolved Alicization line',
        summary: 'Execution is waiting for affirmation before codex can act on the current unresolved line.',
        selectedChannel: null,
        proposedChannel: 'codex',
        affirmationReasonCodes: ['proactive-side-effects-require-explicit-consent'],
      },
    })

    expect(result.kind).toBe('continue-task')
    expect(result.source).toBe('pending-affirmation')
    expect(result.resumePendingThreadId).toBe('thread-proposal-1')
    expect(result.resumePendingThreadChannel).toBe('codex')
    expect(result.routingIntent?.requestedChannels).toEqual(['codex'])
    expect(result.routingIntent?.requiredToolNames).toEqual(['executor_run_codex'])
    expect(result.reasonCodes).toContain('affirmed-pending-execution-proposal')
  })

  it('treats short affirmative replies as consent for the latest pending local visual execution proposal', () => {
    const result = deriveMainChatActionObligation({
      userText: '可以，做吧',
      capabilityInquiry: createCapabilityInquiry(),
      pendingAffirmationThread: {
        threadId: 'thread-local-visual-proposal-1',
        goal: 'Dismiss the current blocking desktop popup through the governed local visual executor',
        summary: 'Execution is waiting for affirmation before the local visual executor can continue the current desktop thread.',
        selectedChannel: 'desktop',
        proposedChannel: 'desktop',
        affirmationReasonCodes: ['visual-side-effects-require-explicit-consent'],
      },
    })

    expect(result.kind).toBe('continue-task')
    expect(result.source).toBe('pending-affirmation')
    expect(result.resumePendingThreadId).toBe('thread-local-visual-proposal-1')
    expect(result.resumePendingThreadChannel).toBe('desktop')
    expect(result.routingIntent?.requestedChannels).toEqual(['desktop'])
    expect(result.routingIntent?.requiredToolNames).toEqual(['executor_run_local_visual'])
    expect(result.reasonCodes).toContain('affirmed-pending-execution-proposal')
  })

  it('keeps concrete continuation facts from the active dialogue thread', () => {
    const runtimeSurface = createTaskRuntimeSurface()
    runtimeSurface.dialogue.dialogueEncounter = {
      ...runtimeSurface.dialogue.dialogueEncounter,
      act: 'continue-thread',
      summary: 'Continue the current task thread.',
      confidence: 0.82,
    }
    runtimeSurface.dialogue.conversationState = {
      ...runtimeSurface.dialogue.conversationState,
      jointThread: 'Continue the same callback line.',
      continuityPolicy: 'stay-on-thread',
      shouldHoldThread: true,
      confidence: 0.84,
      updatedAt: 24,
    }
    runtimeSurface.world.worldModel.activeThread = {
      ...runtimeSurface.world.worldModel.activeThread,
      unresolved: true,
      kind: 'recovery',
      summary: 'The same callback closure line is still unresolved.',
      confidence: 0.8,
    } as any
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      centerOfGravity: 'guide',
      speakingIntention: 'Continue the same callback line without restarting it as a detached report.',
      confidence: 0.88,
      updatedAt: 24,
    } as any

    const result = deriveMainChatActionObligation({
      userText: '继续，接着刚才那条线做',
      capabilityInquiry: createCapabilityInquiry(),
      runtimeSurface: runtimeSurface as any,
    })

    expect(result.kind).toBe('continue-task')
    expect(result.summary).toBe('Continue the same callback line without restarting it as a detached report.')
    expect(result.summary).not.toContain('Continue the current task thread.')
    expect(result.reasonCodes).toContain('continue-thread')
    expect(result.reasonCodes).toContain('continuation-cue')
  })

  it('keeps the current speaking intention as the continuation summary', () => {
    const runtimeSurface = createTaskRuntimeSurface()
    runtimeSurface.dialogue.dialogueEncounter = {
      ...runtimeSurface.dialogue.dialogueEncounter,
      act: 'continue-thread',
      summary: 'Continue the current task thread.',
      confidence: 0.82,
    }
    runtimeSurface.dialogue.conversationState = {
      ...runtimeSurface.dialogue.conversationState,
      jointThread: 'Continue the same project line.',
      continuityPolicy: 'stay-on-thread',
      shouldHoldThread: true,
      confidence: 0.84,
      updatedAt: 24,
    }
    runtimeSurface.world.worldModel.activeThread = {
      ...runtimeSurface.world.worldModel.activeThread,
      unresolved: true,
      kind: 'recovery',
      summary: 'The same project closure line is still unresolved.',
      confidence: 0.8,
    } as any
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      centerOfGravity: 'guide',
      speakingIntention: 'Continue the same project line without flattening into a detached shell.',
      confidence: 0.88,
      updatedAt: 24,
    } as any

    const result = deriveMainChatActionObligation({
      userText: '继续，沿着刚才这个项目线接着做',
      capabilityInquiry: createCapabilityInquiry(),
      runtimeSurface: runtimeSurface as any,
    })

    expect(result.kind).toBe('continue-task')
    expect(result.summary).toBe('Continue the same project line without flattening into a detached shell.')
  })
})
